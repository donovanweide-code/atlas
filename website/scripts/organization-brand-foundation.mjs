const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FONT_STACK = /^[a-z0-9 ,"'_-]+$/i;
const ORGANIZATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_STATUS = new Set(["approved", "owner_approved", "draft", "retired"]);
const BRAND_STATUS = new Set(["approved", "draft", "retired"]);
const SHA256 = /^[a-f0-9]{64}$/i;
const ASSET_MEDIA_TYPE = new Set(["image/png", "image/svg+xml"]);
const EMAIL = /^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/;
const WEBSITE_HOST = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i;

export class OrganizationBrandError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OrganizationBrandError";
    this.code = code;
  }
}

function requiredText(value, label, maximum = 240) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `${label} ontbreekt of is ongeldig.`);
  }
  return text;
}

function color(value, label) {
  const candidate = requiredText(value, label, 7).toUpperCase();
  if (!HEX_COLOR.test(candidate)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `${label} is geen veilige hexkleur.`);
  return candidate;
}

function fontStack(value, label) {
  const candidate = requiredText(value, label, 180);
  if (!FONT_STACK.test(candidate) || /url\s*\(|expression\s*\(|javascript:/i.test(candidate)) {
    throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `${label} is geen veilige font-stack.`);
  }
  return candidate;
}

function optionalText(value, label, maximum = 240) {
  if (value === null || value === undefined || value === "") return null;
  return requiredText(value, label, maximum);
}

function corporateEmail(value, label) {
  const candidate = requiredText(value, label, 254).toLowerCase();
  if (!EMAIL.test(candidate)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `${label} is geen veilig e-mailadres.`);
  return candidate;
}

function websiteHost(value) {
  const candidate = requiredText(value, "Website", 180).toLowerCase().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!WEBSITE_HOST.test(candidate)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", "Website is geen veilige hostnaam.");
  return candidate;
}

function normalizeCorporateProfile(input) {
  if (!input || typeof input !== "object") return null;
  return Object.freeze({
    legal_name: requiredText(input.legal_name, "Officiële bedrijfsnaam"),
    tagline: optionalText(input.tagline, "Tagline", 180),
    address: optionalText(input.address, "Adres", 180),
    postal_code: optionalText(input.postal_code, "Postcode", 32),
    city: optionalText(input.city, "Plaats", 120),
    phone: optionalText(input.phone, "Telefoonnummer", 64),
    general_email: corporateEmail(input.general_email, "Algemeen e-mailadres"),
    website: websiteHost(input.website),
    registration_number: optionalText(input.registration_number, "Registratienummer", 64),
    vat_number: optionalText(input.vat_number, "Btw-nummer", 64),
    source_references: Object.freeze((input.source_references ?? []).map((entry) => requiredText(entry, "Corporate bron", 240))),
  });
}

function assetReference(value, organizationId) {
  if (value === null || value === undefined || value === "") return null;
  const reference = requiredText(value, "Assetreferentie", 240);
  const cidAllowed = new RegExp(`^cid:brand-${organizationId}-[a-z0-9-]+$`, "i");
  const localAllowed = new RegExp(`^/assets/organizations/${organizationId}/[a-z0-9._/-]+$`, "i");
  if (reference.includes("..") || reference.includes("\\") || (!cidAllowed.test(reference) && !localAllowed.test(reference))) {
    throw new OrganizationBrandError("BRAND_ASSET_UNSAFE", "De brandasset gebruikt geen toegestane server-controlled referentie.");
  }
  return reference;
}

function embeddedAssetSource(value, organizationId) {
  if (value === null || value === undefined || value === "") return null;
  const reference = requiredText(value, "Embedded assetbron", 240);
  const allowed = new RegExp(`^/assets/organizations/${organizationId}/[a-z0-9._/-]+$`, "i");
  if (reference.includes("..") || reference.includes("\\") || !allowed.test(reference)) {
    throw new OrganizationBrandError("BRAND_ASSET_UNSAFE", "De embedded brandasset gebruikt geen toegestane server-controlled bron.");
  }
  return reference;
}

function isActiveAssetStatus(status) {
  return status === "approved" || status === "owner_approved";
}

function normalizeAsset(asset, organizationId, usageType) {
  if (!asset) return null;
  const status = requiredText(asset.status, `Status ${usageType}`, 20).toLowerCase();
  if (!ASSET_STATUS.has(status)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `Status ${usageType} is ongeldig.`);
  const id = requiredText(asset.id, `Asset-ID ${usageType}`, 100).toLowerCase();
  if (!ASSET_ID.test(id)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `Asset-ID ${usageType} is ongeldig.`);
  const reference = assetReference(asset.reference, organizationId);
  const embeddedSource = embeddedAssetSource(asset.embedded_source, organizationId);
  const checksum = asset.sha256 ? requiredText(asset.sha256, `SHA-256 ${usageType}`, 64).toLowerCase() : null;
  if (checksum && !SHA256.test(checksum)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `SHA-256 ${usageType} is ongeldig.`);
  const mediaType = asset.media_type ? requiredText(asset.media_type, `Media type ${usageType}`, 40).toLowerCase() : null;
  if (mediaType && !ASSET_MEDIA_TYPE.has(mediaType)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `Media type ${usageType} is ongeldig.`);
  const approvedBy = asset.approved_by ? requiredText(asset.approved_by, `Approver ${usageType}`, 120) : null;
  const approvedAt = asset.approved_at ? requiredText(asset.approved_at, `Approval date ${usageType}`, 40) : null;
  if (status === "owner_approved" && (!approvedBy || !approvedAt || !checksum)) {
    throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `Owner-approved asset ${usageType} mist approval of hash.`);
  }
  if (reference?.startsWith("cid:") && (!embeddedSource || !checksum || mediaType !== "image/png")) {
    throw new OrganizationBrandError("BRAND_CONFIG_INVALID", `CID-asset ${usageType} mist een gecontroleerde PNG-bron of hash.`);
  }
  return Object.freeze({
    id,
    usage_type: usageType,
    status,
    reference,
    embedded_source: embeddedSource,
    sha256: checksum,
    media_type: mediaType,
    approved_by: approvedBy,
    approved_at: approvedAt,
    source_reference: asset.source_reference ? requiredText(asset.source_reference, `Bron ${usageType}`, 240) : null,
    alt_text: asset.alt_text ? requiredText(asset.alt_text, `Alt-tekst ${usageType}`, 120) : null,
    version: requiredText(asset.version, `Versie ${usageType}`, 80),
  });
}

function normalizeBrandConfig(input) {
  if (!input || typeof input !== "object") throw new OrganizationBrandError("BRAND_CONFIG_INVALID", "Organisatiebrandconfiguratie ontbreekt.");
  const organizationId = requiredText(input.organization_id, "Organization ID", 100).toLowerCase();
  if (!ORGANIZATION_ID.test(organizationId)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", "Organization ID is ongeldig.");
  const status = requiredText(input.metadata?.status, "Brandstatus", 20).toLowerCase();
  if (!BRAND_STATUS.has(status)) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", "Brandstatus is ongeldig.");
  const assets = input.assets ?? {};
  return Object.freeze({
    organization_id: organizationId,
    brand: Object.freeze({
      display_name: requiredText(input.brand?.display_name, "Display name"),
      primary_color: color(input.brand?.primary_color, "Primaire kleur"),
      secondary_background_color: color(input.brand?.secondary_background_color, "Achtergrondkleur"),
      accent_color: color(input.brand?.accent_color, "Accentkleur"),
      body_text_color: color(input.brand?.body_text_color, "Bodytekstkleur"),
      heading_font_stack: fontStack(input.brand?.heading_font_stack, "Heading font-stack"),
      body_font_stack: fontStack(input.brand?.body_font_stack, "Body font-stack"),
    }),
    corporate: normalizeCorporateProfile(input.corporate),
    assets: Object.freeze({
      primary_logo: normalizeAsset(assets.primary_logo, organizationId, "primary_logo"),
      email_logo: normalizeAsset(assets.email_logo, organizationId, "email_logo"),
      optional_light_logo: normalizeAsset(assets.optional_light_logo, organizationId, "optional_light_logo"),
      optional_dark_logo: normalizeAsset(assets.optional_dark_logo, organizationId, "optional_dark_logo"),
      favicon_app_icon: normalizeAsset(assets.favicon_app_icon, organizationId, "favicon_app_icon"),
    }),
    metadata: Object.freeze({
      status,
      usage_type: requiredText(input.metadata?.usage_type, "Usage type", 80),
      updated_at: requiredText(input.metadata?.updated_at, "Updated at", 40),
      updated_by: requiredText(input.metadata?.updated_by, "Updated by", 120),
      version: requiredText(input.metadata?.version, "Brandversie", 80),
      authority_references: Object.freeze((input.metadata?.authority_references ?? []).map((entry) => requiredText(entry, "Authority reference", 240))),
    }),
  });
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeActionHref(value) {
  const href = requiredText(value, "Actielink", 500);
  if (/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#][^\s<>]*)?$/i.test(href)) return href;
  if (/^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\s<>]*$/.test(href)) return href;
  throw new OrganizationBrandError("BRAND_ACTION_UNSAFE", "De actielink gebruikt geen toegestane https- of applicatieroute.");
}

export const ORGANIZATION_BRANDS = Object.freeze({
  "sportpaleis": Object.freeze({
    organization_id: "sportpaleis",
    brand: Object.freeze({
      display_name: "SPORT 2000 Sportpaleis",
      primary_color: "#D10019",
      secondary_background_color: "#FFFFFF",
      accent_color: "#000000",
      body_text_color: "#000000",
      heading_font_stack: "Chevin Pro, Arial, Helvetica, sans-serif",
      body_font_stack: "Chevin Pro, Arial, Helvetica, sans-serif",
    }),
    corporate: null,
    assets: Object.freeze({
      primary_logo: Object.freeze({
        id: "sportpaleis-selected-logo-2026",
        usage_type: "primary_logo",
        status: "approved",
        reference: "/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png",
        media_type: "image/png",
        sha256: "70c424dcd371bb7f690946d24b6f3aeeea3f7d0f276928c4707951eb8bdd4bb4",
        approved_by: "Sportpaleis 2026 logo-overzicht authority",
        approved_at: "2026-08-10T00:00:00.000Z",
        source_reference: "Alle Sport2000 Sportpaleis logo's 2026.pdf · gekozen linker rood/zwart-variant",
        alt_text: "SPORT 2000 Sportpaleis",
        version: "SPORTPALEIS-LOGO-MAIL-SAFE-006",
      }),
      email_logo: Object.freeze({
        id: "sportpaleis-email-logo-2026",
        usage_type: "email_logo",
        status: "approved",
        reference: "cid:brand-sportpaleis-email-logo",
        embedded_source: "/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png",
        media_type: "image/png",
        sha256: "70c424dcd371bb7f690946d24b6f3aeeea3f7d0f276928c4707951eb8bdd4bb4",
        approved_by: "Sportpaleis 2026 logo-overzicht authority",
        approved_at: "2026-08-10T00:00:00.000Z",
        source_reference: "Afgeleid zonder redesign uit de reeds gevalideerde geselecteerde linker variant",
        alt_text: "SPORT 2000 Sportpaleis",
        version: "SPORTPALEIS-LOGO-MAIL-SAFE-006",
      }),
      optional_light_logo: null,
      optional_dark_logo: null,
      favicon_app_icon: null,
    }),
    metadata: Object.freeze({
      status: "approved",
      usage_type: "transactional_email",
      updated_at: "2026-08-09T00:00:00.000Z",
      updated_by: "Sportpaleis Capability Build 003 · bestaande design authority",
      version: "SPORTPALEIS-BRAND-FOUNDATION-006",
      authority_references: Object.freeze([
        "NEW2025-CID_Manual_BENE sep 25.pdf",
        "Alle Sport2000 Sportpaleis logo's 2026.pdf",
      ]),
    }),
  }),
  "we-build-and-design": Object.freeze({
    organization_id: "we-build-and-design",
    brand: Object.freeze({
      display_name: "We Build And Design",
      primary_color: "#08161A",
      secondary_background_color: "#F7F4EE",
      accent_color: "#C7A166",
      body_text_color: "#17221F",
      heading_font_stack: 'Georgia, "Times New Roman", serif',
      body_font_stack: "Arial, Helvetica, sans-serif",
    }),
    corporate: Object.freeze({
      legal_name: "We Build And Design",
      tagline: "Onze naam begint met bouwen. Ons werk begint met begrijpen.",
      address: "Gerard Terborchstraat 35",
      postal_code: "1318 LE",
      city: "Almere",
      phone: "06 100 67 964",
      general_email: "info@webuildanddesign.nl",
      website: "webuildanddesign.nl",
      registration_number: "69326126",
      vat_number: "NL190255879B01",
      source_references: Object.freeze([
        "invoices/wbd/data/wbd-invoice-template.json",
        "invoices/wbd/data/sent/mail-foundation-003-review.json",
        "website/src/public-pages.ts contact configuration",
        "invoices/wbd/README.md executed source checks",
      ]),
    }),
    assets: Object.freeze({
      primary_logo: Object.freeze({
        id: "wbd-primary-logo",
        status: "owner_approved",
        reference: "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-master-candidate.svg",
        sha256: "b82bcb75111105cf5017c61ae9661be3ae7cccfdecd77e3f0f723585d99524c5",
        media_type: "image/svg+xml",
        approved_by: "owner / Donovan",
        approved_at: "2026-08-09",
        source_reference: "invoices/wbd/brand.py at e91b80a0eddf1cf495d66587b1c71e0d081ac5da; derived from website W / BD component at ca3d1bd90128ae25c033eae2c9b73d95b0c1d512",
        alt_text: "We Build And Design",
        version: "WBD-LOGO-CANDIDATE-004C1",
      }),
      email_logo: Object.freeze({
        id: "wbd-email-logo",
        status: "owner_approved",
        reference: "cid:brand-we-build-and-design-email-logo",
        embedded_source: "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-mail-safe-light-candidate.png",
        sha256: "342ecff3490157106f4a71161d54407b3f6aad71be48c09e5720bdc183e4d9f4",
        media_type: "image/png",
        approved_by: "owner / Donovan",
        approved_at: "2026-08-09",
        source_reference: "Mail-safe transparent PNG derivative of WBD-LOGO-CANDIDATE-004C1",
        alt_text: "We Build And Design",
        version: "WBD-LOGO-CANDIDATE-004C1-MAIL-SAFE",
      }),
      optional_light_logo: Object.freeze({
        id: "wbd-light-logo",
        status: "owner_approved",
        reference: "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-light-candidate.svg",
        sha256: "1e0f76446e922204b6ac36e01d5abb3daeed1dda43c49e6ef6464100789ad525",
        media_type: "image/svg+xml",
        approved_by: "owner / Donovan",
        approved_at: "2026-08-09",
        source_reference: "Color-only light derivative of WBD-LOGO-CANDIDATE-004C1",
        alt_text: "We Build And Design",
        version: "WBD-LOGO-CANDIDATE-004C1-LIGHT",
      }),
      optional_dark_logo: Object.freeze({
        id: "wbd-dark-raster-logo",
        status: "owner_approved",
        reference: "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-mail-safe-dark-candidate.png",
        sha256: "19fa7ab551dbefbd69f49733c5ccdd6c9aa046dc3d2d1d6e8c7d2d0df8ce6052",
        media_type: "image/png",
        approved_by: "owner / Donovan",
        approved_at: "2026-08-09",
        source_reference: "Color-only dark transparent PNG derivative of WBD-LOGO-CANDIDATE-004C1",
        alt_text: "We Build And Design",
        version: "WBD-LOGO-CANDIDATE-004C1-DARK-PNG",
      }),
      favicon_app_icon: null,
    }),
    metadata: Object.freeze({
      status: "approved",
      usage_type: "transactional_email",
      updated_at: "2026-08-09T19:30:00.000Z",
      updated_by: "owner / Donovan - WBD Mail 004C.2 explicit visual GO",
      version: "WBD-BRAND-FOUNDATION-004C2",
      authority_references: Object.freeze([
        "website/src/styles/variables.css",
        "output/project-001c/screenshots/after/home-desktop.png",
        "output/project-001c/screenshots/after/wbd-workspace-desktop.png",
        "output/pdf/sent/mail-foundation-003-review.pdf",
        "invoices/wbd/data/wbd-invoice-template.json",
        "website/src/public-pages.ts",
        "website/src/styles/public-pages.css",
        "invoices/wbd/brand.py",
        "WBD-LOGO-CANDIDATE-004C1-PROVENANCE.md",
      ]),
    }),
  }),
});

export function createOrganizationBrandRegistry(seed = ORGANIZATION_BRANDS) {
  const entries = Object.entries(seed).map(([key, value]) => {
    const normalized = normalizeBrandConfig(value);
    if (key !== normalized.organization_id) throw new OrganizationBrandError("BRAND_CONFIG_INVALID", "De registry-key wijkt af van organization_id.");
    return [key, normalized];
  });
  const registry = new Map(entries);
  return Object.freeze({
    get(organizationId) {
      const brand = registry.get(String(organizationId ?? ""));
      if (!brand) throw new OrganizationBrandError("BRAND_NOT_FOUND", "Voor deze organisatie is geen brandconfiguratie beschikbaar.");
      return brand;
    },
    has(organizationId) { return registry.has(String(organizationId ?? "")); },
    list() { return [...registry.values()]; },
  });
}

export function publicBrandSummary(config) {
  const normalized = normalizeBrandConfig(config);
  return structuredClone({
    organization_id: normalized.organization_id,
    brand: normalized.brand,
    corporate: normalized.corporate,
    assets: Object.fromEntries(Object.entries(normalized.assets).map(([key, asset]) => [key, asset ? {
      id: asset.id,
      usage_type: asset.usage_type,
      status: asset.status,
      reference: asset.reference,
      alt_text: asset.alt_text,
      version: asset.version,
      sha256: asset.sha256,
      media_type: asset.media_type,
      approved_by: asset.approved_by,
      approved_at: asset.approved_at,
      source_reference: asset.source_reference,
    } : null])),
    metadata: normalized.metadata,
  });
}

export function buildOrganizationMailShell({
  brandConfig,
  preheader,
  eyebrow,
  heading,
  contentHtml,
  facts = [],
  closingHtml,
  attachmentLine = "",
  corporateFooterEmail = null,
  action = null,
}) {
  const config = normalizeBrandConfig(brandConfig);
  const brand = config.organization_id === "sportpaleis" ? { ...config.brand, primary_color: config.brand.accent_color, accent_color: config.brand.primary_color } : config.brand;
  const logoWidth = config.organization_id === "sportpaleis" ? 230 : 180;
  const logo = isActiveAssetStatus(config.assets.email_logo?.status) ? config.assets.email_logo : null;
  const logoHtml = logo?.reference
    ? `<img src="${html(logo.reference)}" width="${logoWidth}" alt="${html(logo.alt_text || brand.display_name)}" style="display:block;width:${logoWidth}px;max-width:100%;height:auto;border:0;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:16px;font-weight:bold;">`
    : `<span style="display:block;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:16px;line-height:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${html(brand.display_name)}</span>`;
  const factsHtml = facts.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid ${brand.accent_color};border-collapse:collapse;background:${brand.secondary_background_color};">${facts.map(({ label, value }) => `<tr><td style="padding:12px 14px;border-bottom:1px solid ${brand.accent_color};color:${brand.body_text_color};font-family:${brand.body_font_stack};font-size:14px;line-height:20px;">${label}</td><td align="right" style="padding:12px 14px;border-bottom:1px solid ${brand.accent_color};color:${brand.body_text_color};font-family:${brand.body_font_stack};font-size:14px;line-height:20px;font-weight:bold;">${value}</td></tr>`).join("")}</table>` : "";
  const actionHtml = action ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;"><tr><td bgcolor="${brand.primary_color}" style="border-radius:3px;"><a href="${html(safeActionHref(action.href))}" style="display:inline-block;padding:13px 18px;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;">${html(action.label)}</a></td></tr></table>` : "";
  const attachmentHtml = attachmentLine ? `<div style="margin-top:18px;color:${brand.body_text_color};font-family:${brand.body_font_stack};font-size:13px;line-height:20px;">${attachmentLine}</div>` : "";
  const corporateFooterHtml = buildOrganizationCorporateFooter({ brandConfig: config, email: corporateFooterEmail });
  const corporateFooterRow = corporateFooterHtml ? `<tr><td class="wbd-corporate-footer-cell" width="100%" style="width:100%;padding:0;background:${brand.primary_color};">${corporateFooterHtml}</td></tr>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no"><style type="text/css">a[x-apple-data-detectors],.wbd-no-autolink a,.wbd-no-autolink a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;border-bottom:0!important;pointer-events:none!important;cursor:text!important}.wbd-intentional-link,.wbd-intentional-link[x-apple-data-detectors]{color:${brand.secondary_background_color}!important;text-decoration:underline!important;pointer-events:auto!important;cursor:pointer!important}</style><title>${html(brand.display_name)}</title></head><body id="body" style="margin:0;padding:0;background:${brand.secondary_background_color};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.secondary_background_color}" style="width:100%;background:${brand.secondary_background_color};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.secondary_background_color}" style="width:100%;max-width:600px;background:${brand.secondary_background_color};border-collapse:collapse;"><tr><td bgcolor="${brand.primary_color}" style="padding:28px 34px 24px;border-bottom:4px solid ${brand.accent_color};background:${brand.primary_color};">${logoHtml}</td></tr><tr><td style="padding:36px 34px 18px;"><div style="margin:0 0 10px;color:${brand.accent_color};font-family:${brand.body_font_stack};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${eyebrow}</div><h1 style="margin:0;color:${brand.body_text_color};font-family:${brand.heading_font_stack};font-size:32px;line-height:40px;font-weight:normal;">${heading}</h1></td></tr><tr><td style="padding:0 34px 20px;color:${brand.body_text_color};font-family:${brand.body_font_stack};font-size:16px;line-height:25px;">${contentHtml}${factsHtml ? `<div style="margin:24px 0;">${factsHtml}</div>` : ""}${actionHtml}<div style="margin-top:30px;">${closingHtml}</div>${attachmentHtml}</td></tr>${corporateFooterRow}</table></td></tr></table></body></html>`;
}

export function buildOrganizationCorporateFooter({ brandConfig, email = null }) {
  const config = normalizeBrandConfig(brandConfig);
  const profile = config.corporate;
  if (!profile) return "";
  const brand = config.brand;
  const selectedEmail = email ? corporateEmail(email, "Footer e-mailadres") : profile.general_email;
  const location = [profile.postal_code, profile.city].filter(Boolean).join(" ");
  const addressLines = [profile.address, location].filter(Boolean).map((line) => `<div class="wbd-no-autolink" style="margin:0;color:${brand.secondary_background_color};text-decoration:none!important;">${html(line)}</div>`).join("");
  const tagline = profile.tagline ? `<div class="wbd-no-autolink" style="max-width:430px;margin:5px 0 0;color:${brand.secondary_background_color};font-family:${brand.heading_font_stack};font-size:13px;line-height:18px;font-style:italic;text-decoration:none!important;">${html(profile.tagline)}</div>` : "";
  const phone = profile.phone ? `<div style="margin:0 0 2px;"><a class="wbd-intentional-link" href="tel:${html(profile.phone.replaceAll(" ", ""))}" style="color:${brand.secondary_background_color}!important;text-decoration:underline!important;">${html(profile.phone)}</a></div>` : "";
  const legal = [profile.registration_number ? `<span class="wbd-no-autolink" style="color:${brand.accent_color};text-decoration:none!important;">KvK ${html(profile.registration_number)}</span>` : "", profile.vat_number ? `<span class="wbd-no-autolink" style="color:${brand.accent_color};text-decoration:none!important;">BTW ${html(profile.vat_number)}</span>` : ""].filter(Boolean).join(" &nbsp;&middot;&nbsp; ");
  const logo = isActiveAssetStatus(config.assets.email_logo?.status) ? config.assets.email_logo : null;
  const corporateIdentity = logo?.reference
    ? `<img src="${html(logo.reference)}" width="158" alt="${html(logo.alt_text || profile.legal_name)}" style="display:block;width:158px;max-width:100%;height:auto;border:0;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:15px;font-weight:bold;">`
    : `<div style="margin:0;color:${brand.secondary_background_color};font-family:${brand.heading_font_stack};font-size:20px;line-height:25px;font-weight:normal;">${html(profile.legal_name)}</div>`;
  return `<table class="wbd-corporate-footer" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${brand.primary_color}" style="width:100%!important;min-width:100%;margin:0;border-top:3px solid ${brand.accent_color};border-collapse:collapse;background:${brand.primary_color};mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td width="100%" bgcolor="${brand.primary_color}" style="width:100%;padding:17px 20px 16px;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:13px;line-height:18px;background:${brand.primary_color};"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;"><tr><td style="padding:0 0 5px;color:${brand.accent_color};font-family:${brand.body_font_stack};font-size:10px;line-height:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Contact</td></tr><tr><td style="padding:0;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};font-size:13px;line-height:18px;">${phone}<div style="margin:0 0 2px;"><a class="wbd-intentional-link" href="mailto:${html(selectedEmail)}" style="color:${brand.secondary_background_color}!important;text-decoration:underline!important;">${html(selectedEmail)}</a></div><div style="margin:0 0 6px;"><a class="wbd-intentional-link" href="https://${html(profile.website)}" style="color:${brand.secondary_background_color}!important;text-decoration:underline!important;">${html(profile.website)}</a></div>${addressLines}</td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:13px;border-top:1px solid ${brand.accent_color};border-collapse:collapse;"><tr><td style="padding:13px 0 0;color:${brand.secondary_background_color};font-family:${brand.body_font_stack};">${corporateIdentity}${tagline}${legal ? `<div class="wbd-no-autolink" style="margin-top:8px;color:${brand.accent_color};font-size:10px;line-height:14px;letter-spacing:.25px;text-decoration:none!important;">${legal}</div>` : ""}</td></tr></table></td></tr></table>`;
}

export function buildOrganizationPlainTextFooter({ brandConfig, email = null }) {
  const config = normalizeBrandConfig(brandConfig);
  const profile = config.corporate;
  if (!profile) return "";
  const selectedEmail = email ? corporateEmail(email, "Footer e-mailadres") : profile.general_email;
  const lines = [
    "---",
    "CONTACT",
    profile.phone,
    selectedEmail,
    profile.website,
    profile.address,
    [profile.postal_code, profile.city].filter(Boolean).join(" "),
    "",
    profile.legal_name.toUpperCase(),
    profile.tagline,
    profile.registration_number ? `KvK ${profile.registration_number}` : null,
    profile.vat_number ? `BTW ${profile.vat_number}` : null,
  ].filter((line) => line !== null && line !== undefined);
  return lines.join("\n");
}
