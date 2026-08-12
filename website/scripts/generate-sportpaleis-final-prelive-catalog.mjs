import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = path.resolve(process.argv[2] ?? path.join(ROOT, "..", ".codex-tmp", "spw-final-prelive-completion", "live-catalog-audit-20260812.json"));
const GENERATED_CATALOG = path.join(ROOT, "config", "sportpaleis-final-prelive-catalog.generated.mjs");
const GENERATED_LOGOS = path.join(ROOT, "config", "sportpaleis-association-logos.generated.mjs");
const EVIDENCE = path.join(ROOT, "docs", "sportpaleis-workspace-pilot-001", "FINAL-PRELIVE-LIVE-AUDIT-20260812.json");
const IMAGE_DIR = path.join(ROOT, "src", "assets", "images", "sportpaleis", "live-catalog");
const LOGO_DIR = path.join(ROOT, "public", "assets", "organizations", "sportpaleis", "association-logos");

const expectedAssociations = [
  "Almere'81", "Almerer Pioneers", "As,8o", "A.S.C. Waterwijk", "Brouwersports",
  "Buitenhout MHC", "DCG", "EKVA", "FC Almere", "FC Huizen", "HBSA", "MHC Lelystad",
  "Najaden", "SC Buitenboys", "SC Geinburgia", "Sporting Almere", "VVA / Spartaan",
  "Wooter", "Sloeproeien", "Hasselbaink",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function slug(value) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function safeSku(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function canonicalField(product, option) {
  if (/^initialen(?:\s|$)/iu.test(option.label)) return "initials";
  if (/^naam opdruk$/iu.test(option.label)) return "name";
  if (/^rugnummer$/iu.test(option.label)) return "backNumber";
  if (/^shortnummer$/iu.test(option.label)) return "shortsNumber";
  if (/^rug & borst nummer$/iu.test(option.label)) return "backNumber";
  if (/^nummer$/iu.test(option.label)) {
    if (/short/iu.test(product.title)) return "shortsNumber";
    if (/shirt/iu.test(product.title)) return "backNumber";
  }
  if (/^rug \/ borst \/ short nummer$/iu.test(option.label)) {
    if (String(product.productInfo?.Artikelnummer) === "116387") return "shortsNumber";
    if (["116386", "116388"].includes(String(product.productInfo?.Artikelnummer))) return "backNumber";
  }
  return null;
}

function profileId(product, field) {
  const sku = String(product.productInfo?.Artikelnummer ?? "");
  if (product.association === "Almerer Pioneers" && ["116386", "116388"].includes(sku)) return "profile-pioneers-shirt";
  if (product.association === "Almerer Pioneers" && sku === "116387") return "profile-pioneers-shorts";
  if (product.association === "MHC Lelystad" && /wedstrijdshirt uit/iu.test(product.title)) return "profile-mhc-shirt-away";
  if (product.association === "MHC Lelystad" && /wedstrijdshirt thuis/iu.test(product.title)) return "profile-mhc-shirt-home";
  if (!field) return "profile-pending";
  return `profile-source-${slug(product.association)}-${field}`;
}

function commonPrice(variantPrices) {
  const prices = [...new Set(Object.values(variantPrices ?? {}).filter((value) => typeof value === "number"))];
  return prices.length === 1 ? prices[0] : null;
}

function sourceStatus(product, field) {
  return field ? "VALIDATED" : "DATA_GAP";
}

function toArticle(product, index, duplicateSkus) {
  const option = product.fields[0];
  const field = canonicalField(product, option);
  const sku = String(product.productInfo?.Artikelnummer ?? "").trim();
  const supplierArticleNumber = String(product.productInfo?.["Artikelnummer leverancier"] ?? "").trim();
  invariant(sku, `Artikelnummer ontbreekt: ${product.sourceUrl}`);
  invariant(product.image, `Productafbeelding ontbreekt: ${product.sourceUrl}`);
  const identity = duplicateSkus.has(sku) ? `${safeSku(sku)}-${slug(product.association)}` : safeSku(sku);
  const imageKey = `sp-live-${identity}`;
  const rawVariantPrices = Object.entries(product.variantPrices ?? {}).filter(([size]) => size !== "__unit");
  const articleUnitPricesBySizeEur = Object.fromEntries(product.sizes.map(({ label }) => {
    const match = rawVariantPrices.find(([size]) => size.localeCompare(label, "nl", { sensitivity: "base" }) === 0);
    return [label, match?.[1] ?? null];
  }));
  const articleUnitPriceEur = commonPrice(product.variantPrices);
  const personalizationUnitPricesEur = field ? { [field]: option.price } : {};
  const gaps = [
    "Positie en referentieafstand zijn niet artikel-specifiek bevestigd.",
    "Letterprofiel- en contouroutput blijven fail-closed totdat deze combinatie aantoonbaar is gevalideerd.",
    "Rotatie en spiegeling volgen uitsluitend een aantoonbaar gevalideerde productieroute.",
  ];
  if (!field) gaps.unshift(`Zichtbare optie \u201c${option.label}\u201d is printrelevant, maar de exacte Workspace-betekenis is nog HUMAN_CONFIRMATION_REQUIRED.`);
  return {
    id: `sp-live-${identity}`,
    articleNumber: sku,
    supplierArticleNumber,
    name: product.title,
    imageKey,
    category: "Live bedrukartikel",
    association: product.association,
    profileId: profileId(product, field),
    supports: field ? [field] : [],
    active: true,
    revision: 1,
    displayOrder: index + 1,
    variantLabels: [],
    availableSizes: product.sizes.map(({ label }) => label),
    commercialPrintOptions: [{ sourceLabel: option.label, canonicalField: field, priceEur: option.price, status: sourceStatus(product, field) }],
    priceConfiguration: {
      articleUnitPriceEur,
      articleUnitPricesBySizeEur,
      personalizationUnitPricesEur,
      sourceLabel: `Sportpaleis.nl live \u00b7 zichtbare prijs per beschikbare maat en zichtbare bedrukoptie \u00b7 gecontroleerd 2026-08-12 \u00b7 ${product.sourceUrl}`,
    },
    catalogProvenance: {
      authority: "SPORTPALEIS_LIVE",
      url: product.sourceUrl,
      imageUrl: product.image,
      checkedAt: "2026-08-12",
    },
    printRelevance: {
      status: "CONFIRMED_VISIBLE_PERSONALIZATION",
      sourceLabel: option.label,
      checkedAt: "2026-08-12",
    },
    productionDataGaps: gaps,
    personalizationPolicy: { mode: field ? "optional" : "none", fields: field ? { [field]: "optional" } : {} },
    validation: {
      status: "PARTIAL",
      source: `Actuele, werkelijk zichtbare Sportpaleis-productpagina \u00b7 ${product.sourceUrl} \u00b7 gecontroleerd 2026-08-12. Productievalidatie staat los van catalogusvalidatie.`,
      name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "DATA_GAP", sizes: "VALIDATED", personalization: sourceStatus(product, field),
    },
    validationHistory: [],
  };
}

async function download(url, target) {
  const response = await fetch(url, { headers: { "User-Agent": "WBD-Sportpaleis-prelive-source-capture/1.0" } });
  if (!response.ok) throw new Error(`Download ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(bytes.length > 0, `Leeg bronbestand: ${url}`);
  await writeFile(target, bytes);
  return bytes;
}

const inputText = await readFile(INPUT, "utf8");
const audit = JSON.parse(inputText);
invariant(audit.auditId === "SPW-PRELIVE-LIVE-PRINT-AUDIT-20260812", "Onverwachte audit-ID.");
invariant(audit.checkedAt === "2026-08-12", "Onverwachte auditdatum.");
invariant(JSON.stringify(audit.associations.map(({ name }) => name)) === JSON.stringify(expectedAssociations), "De 20 verenigingen of hun volgorde wijken af.");
const allProducts = audit.associations.flatMap(({ products }) => products);
const confirmed = allProducts.filter(({ printRelevance }) => printRelevance === "CONFIRMED_VISIBLE_PERSONALIZATION");
const uncertain = allProducts.filter(({ printRelevance }) => printRelevance === "HUMAN_CONFIRMATION_REQUIRED");
invariant(allProducts.length === 450, `Verwacht 450 zichtbare artikelen, kreeg ${allProducts.length}.`);
invariant(confirmed.length === 183, `Verwacht 183 bevestigde bedrukartikelen, kreeg ${confirmed.length}.`);
invariant(uncertain.length === 267, `Verwacht 267 beslispunten, kreeg ${uncertain.length}.`);
invariant(confirmed.every(({ variantPrices, image, fields }) => image && fields.length && Object.values(variantPrices ?? {}).some((value) => typeof value === "number")), "Bevestigde artikelen missen beeld, bedrukveld of maatprijs.");
const skuCounts = new Map();
for (const product of confirmed) {
  const sku = String(product.productInfo?.Artikelnummer ?? "").trim();
  skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
}
const duplicateSkus = new Set([...skuCounts].filter(([, count]) => count > 1).map(([sku]) => sku));

await Promise.all([mkdir(IMAGE_DIR, { recursive: true }), mkdir(LOGO_DIR, { recursive: true }), mkdir(path.dirname(EVIDENCE), { recursive: true })]);

const articles = [];
for (const association of audit.associations) {
  const associationProducts = association.products.filter(({ printRelevance }) => printRelevance === "CONFIRMED_VISIBLE_PERSONALIZATION");
  for (const [index, product] of associationProducts.entries()) {
    const article = toArticle(product, index, duplicateSkus);
    await download(product.image, path.join(IMAGE_DIR, `${article.imageKey}.webp`));
    articles.push(article);
  }
}
invariant(new Set(articles.map(({ id }) => id)).size === articles.length, "Gegenereerde catalogus bevat dubbele artikel-ID's.");
invariant(articles.every(({ supports }) => supports.length > 0), "Een bevestigd bedrukartikel mist een bruikbaar invoerveld.");

const logos = {};
for (const association of audit.associations) {
  invariant(association.logo?.src?.startsWith("https://www.sportpaleis.nl/img/"), `Ongeldig bronlogo: ${association.name}`);
  const filename = `${slug(association.name)}.png`;
  const bytes = await download(association.logo.src, path.join(LOGO_DIR, filename));
  logos[association.name] = {
    filename,
    mimeType: "image/png",
    dataBase64: bytes.toString("base64"),
    sha256: sha256(bytes),
    updatedAt: "2026-08-12T00:00:00.000Z",
    updatedBy: "system-live-source-audit",
    sourceUrl: association.logo.src,
    checkedAt: "2026-08-12",
    authority: "SPORTPALEIS_LIVE_ASSOCIATION_PAGE",
  };
}

const matrix = audit.associations.map((association) => ({
  association: association.name,
  productCount: association.products.length,
  confirmedPrintArticleCount: association.products.filter(({ printRelevance }) => printRelevance === "CONFIRMED_VISIBLE_PERSONALIZATION").length,
  humanConfirmationRequiredCount: association.products.filter(({ printRelevance }) => printRelevance === "HUMAN_CONFIRMATION_REQUIRED").length,
  status: "LIVE",
  checkedAt: "2026-08-12",
  sourceUrls: [...new Set(association.products.map(({ sourceUrl }) => new URL(sourceUrl).pathname.split("/")[1]).filter(Boolean))],
  logoSourceUrl: association.logo.src,
}));
const uncertainSummary = uncertain.map((product) => ({ association: product.association, articleNumber: product.productInfo?.Artikelnummer ?? null, name: product.title, sourceUrl: product.sourceUrl, status: "HUMAN_CONFIRMATION_REQUIRED" }));

const catalogModule = `// Gegenereerd door scripts/generate-sportpaleis-final-prelive-catalog.mjs. Niet handmatig wijzigen.\nexport const SPORTPALEIS_FINAL_PRELIVE_AUDIT_ID = ${JSON.stringify(audit.auditId)};\nexport const SPORTPALEIS_LIVE_CATALOG_CHECKED_AT = "2026-08-12";\nexport const SPORTPALEIS_LIVE_CATALOG_SOURCE = "https://www.sportpaleis.nl/verenigingen/";\nexport const SPORTPALEIS_LIVE_PILOT_ARTICLES = ${JSON.stringify(articles, null, 2)};\nexport const SPORTPALEIS_LIVE_HUMAN_CONFIRMATION_REQUIRED_ARTICLES = ${JSON.stringify(uncertainSummary, null, 2)};\nexport const SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS = ${JSON.stringify(matrix, null, 2)};\nexport const SPORTPALEIS_LIVE_ADDITIONAL_ARTICLES = [];\nexport const SPORTPALEIS_LIVE_EXCLUDED_ARTICLES = [];\n`;
const logoModule = `// Gegenereerd door scripts/generate-sportpaleis-final-prelive-catalog.mjs. Niet handmatig wijzigen.\nexport const SPORTPALEIS_ASSOCIATION_LOGOS = ${JSON.stringify(logos, null, 2)};\n`;
await Promise.all([
  writeFile(GENERATED_CATALOG, catalogModule),
  writeFile(GENERATED_LOGOS, logoModule),
  writeFile(EVIDENCE, inputText.endsWith("\n") ? inputText : `${inputText}\n`),
]);

console.log(JSON.stringify({
  auditId: audit.auditId,
  auditSha256: sha256(inputText),
  visibleArticles: allProducts.length,
  confirmedPrintArticles: articles.length,
  humanConfirmationRequired: uncertain.length,
  logos: Object.keys(logos).length,
  catalogModule: path.relative(ROOT, GENERATED_CATALOG),
  logoModule: path.relative(ROOT, GENERATED_LOGOS),
  evidence: path.relative(ROOT, EVIDENCE),
}, null, 2));
