const FIELD_DIMENSIONS = Object.freeze({
  initials: "initialsShirt",
  name: "nameHeight",
  backNumber: "backNumberSenior",
  chestNumber: "chestNumber",
  shortsNumber: "shortsNumber",
});

const PRODUCT_TYPE_FIELDS = Object.freeze({
  UPPER_GARMENT: Object.freeze(["initials", "name", "backNumber", "chestNumber"]),
  LOWER_GARMENT: Object.freeze(["initials", "name", "shortsNumber"]),
  SPORTS_BAG: Object.freeze(["initials", "name"]),
  BACKPACK: Object.freeze(["initials", "name"]),
  OTHER: Object.freeze([]),
});

const profileSlug = (value) => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

/**
 * Commercial webshop options are evidence, but never the complete production
 * capability model. A field is usable when the exact article surface permits
 * it and association Product Truth contains both a physical dimension and a
 * matching canonical production profile. Existing explicit article fields are
 * preserved because they can carry authoritative migrated Product Truth; a
 * separate article/product-surface conflict boundary validates new mutations.
 */
export function canonicalArticlePersonalizationFields({ article, association, productionProfiles, productType }) {
  const possible = PRODUCT_TYPE_FIELDS[productType] ?? [];
  const fields = new Set(article?.supports ?? Object.keys(article?.personalizationPolicy?.fields ?? {}));
  const associationSlug = profileSlug(association?.name ?? article?.association);
  const articleProfile = productionProfiles?.find((profile) => profile.id === article?.profileId);
  for (const field of possible) {
    const dimension = Number(association?.dimensionsCm?.[FIELD_DIMENSIONS[field]]);
    const profileId = `profile-source-${associationSlug}-${field}`;
    const hasProfile = productionProfiles?.some((profile) => profile.id === profileId && profile.supports?.includes(field));
    const articleProfileAllows = articleProfile?.supports?.includes(field) === true;
    if (dimension > 0 && hasProfile && articleProfileAllows) fields.add(field);
  }
  return [...fields];
}

const exactGeometryHash = (value) => /^[a-f0-9]{64}$/iu.test(String(value ?? ""));
const REQUIRED_FONT_ADMISSION_STAGES = ["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "HUMAN_CONFIRMED", "AUTHORITATIVE"];
const REQUIRED_VECTOR_ADMISSION_STAGES = ["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "PREVIEWED", "HUMAN_CONFIRMED", "AUTHORITATIVE"];

export function productionFontExecutableDecision(font, application = "FREE_PRINT") {
  if (!font || font.status !== "TECHNICALLY_VALID" || !font.authoritativeIdentity || font.authoritativeIdentity !== font.id || !exactGeometryHash(font.sha256) || !font.provenance) {
    return { allowed: false, code: "PRODUCTION_FONT_NOT_AUTHORITATIVE", reason: "De fontbron mist exacte authoritative identity, hash of provenance." };
  }
  // Release-packaged canonical fonts predate the upload admission ledger. Their
  // immutable registry identity remains the equivalent authority proof.
  if (font.registryProjection === "SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET") {
    return ["OPEN_FONT_SOURCE", "HUMAN_PRODUCT_TRUTH"].includes(font.authority)
      ? { allowed: true, code: "PRODUCTION_FONT_REGISTERED_AUTHORITY", reason: null }
      : { allowed: false, code: "PRODUCTION_FONT_AUTHORITY_INVALID", reason: "De geregistreerde productiefont mist geldige authoritative registry authority." };
  }
  if (!font.admission) return ["OPEN_FONT_SOURCE", "HUMAN_PRODUCT_TRUTH"].includes(font.authority)
    ? { allowed: true, code: "PRODUCTION_FONT_REGISTERED_AUTHORITY", reason: null }
    : { allowed: false, code: "PRODUCTION_FONT_ADMISSION_MISSING", reason: "Een niet-geregistreerde fontupload mist de volledige toelatingsketen." };
  if (font.admission.lifecycle !== "AUTHORITATIVE" || font.admission.sourceType !== "FONT" || REQUIRED_FONT_ADMISSION_STAGES.some((stage) => !font.admission.stages?.includes(stage))) {
    return { allowed: false, code: "PRODUCTION_FONT_ADMISSION_INCOMPLETE", reason: "De fontbron heeft de toelatingsketen niet volledig doorlopen." };
  }
  if (!font.admission.applicationBindings?.includes(application)) {
    return { allowed: false, code: "PRODUCTION_FONT_APPLICATION_MISMATCH", reason: "De fontbron is niet voor deze exacte toepassing bevestigd." };
  }
  if (!exactGeometryHash(font.admission.executabilitySha256) || !font.admission.representativeProofs?.length || font.admission.representativeProofs.some(({ geometrySha256 }) => !exactGeometryHash(geometrySha256))) {
    return { allowed: false, code: "PRODUCTION_FONT_EXECUTABILITY_UNPROVEN", reason: "De fontbron mist deterministisch outlinebewijs." };
  }
  return { allowed: true, code: "PRODUCTION_FONT_EXECUTABLE", reason: null };
}

/**
 * A production profile binds an application to one canonical managed-font
 * identity. Source executability alone never proves that association. This
 * decision is intentionally browser-safe so UI projections and server-side
 * materialization use the same boundary.
 */
export function productionFontAssociationDecision({ fonts = [], profile, application, selectedSourceId = null }) {
  const requiredSourceId = String(profile?.canonicalFontSourceId ?? "").trim();
  if (!requiredSourceId) {
    return { allowed: false, code: "PRODUCTION_FONT_CANONICAL_SOURCE_UNRESOLVED", reason: "Het productieprofiel mist een canonieke fontbronidentity." };
  }
  const matches = fonts.filter(({ id }) => id === requiredSourceId);
  if (matches.length !== 1) {
    return { allowed: false, code: matches.length ? "PRODUCTION_FONT_CANONICAL_SOURCE_CONFLICT" : "PRODUCTION_FONT_CANONICAL_SOURCE_MISSING", reason: "De canonieke fontbron is niet exact één keer beschikbaar." };
  }
  if (selectedSourceId && selectedSourceId !== requiredSourceId) {
    return { allowed: false, code: "PRODUCTION_FONT_ASSOCIATION_SOURCE_MISMATCH", reason: "De gekozen fontbron hoort niet bij dit productieprofiel en deze toepassing." };
  }
  const font = matches[0];
  const executable = productionFontExecutableDecision(font, application);
  if (!executable.allowed) return executable;
  return { allowed: true, code: "PRODUCTION_FONT_ASSOCIATION_VALID", reason: null, font };
}

/**
 * A lifecycle label is not execution proof. This decision is deliberately
 * shared by UI projection and server-side selection so an employee never sees
 * a source as productierijp that the output boundary must reject later.
 */
export function executableProductionAssetDecision(asset) {
  if (!asset || asset.lifecycleStatus !== "PRODUCTION_READY" || asset.productionMethod !== "SELF_PRODUCED" || !asset.sourceId) {
    return { allowed: false, code: "PRODUCTION_ASSET_NOT_READY", reason: "De productiebron is niet exact productierijp en brongebonden." };
  }
  const geometryHash = asset.sourceSelection?.geometryHash;
  if (!exactGeometryHash(geometryHash) || asset.controlledVector?.geometryHash !== geometryHash || !asset.controlledVector?.contours?.length) {
    return { allowed: false, code: "PRODUCTION_ASSET_GEOMETRY_UNPROVEN", reason: "De productiebron mist gecontroleerd geometriebewijs." };
  }
  const dimensionalVariant = (asset.variants ?? []).find(({ widthMm, heightMm }) => Number(widthMm) > 0 && Number(heightMm) > 0);
  const dimensionalPolicy = Number(asset.sizePolicy?.defaultWidthMm) > 0 && Number(asset.sizePolicy?.defaultHeightMm) > 0;
  if (!dimensionalVariant && !dimensionalPolicy) {
    return { allowed: false, code: "PRODUCTION_ASSET_SIZE_UNPROVEN", reason: "De productiebron mist een bewezen fysieke maat." };
  }
  if ((asset.applications ?? []).some(({ kind }) => kind === "NUMBER_SET")) {
    const completeGlyphs = Array.from({ length: 10 }, (_, digit) => String(digit)).every((digit) => {
      const glyph = asset.numberGlyphs?.[digit];
      return exactGeometryHash(glyph?.geometryHash) && glyph?.contours?.length;
    });
    if (!completeGlyphs) return { allowed: false, code: "PRODUCTION_ASSET_GLYPHS_UNPROVEN", reason: "De nummerbron mist één of meer gecontroleerde cijfers." };
  }
  const sourceSha256 = asset.sourceLayers?.vectorSource?.sha256;
  if (!exactGeometryHash(sourceSha256) || asset.sourceLayers?.validatedCutContour?.sha256 !== geometryHash || asset.sourceLayers?.validatedCutContour?.sourceId !== asset.sourceId) {
    return { allowed: false, code: "PRODUCTION_ASSET_SOURCE_PROOF_INVALID", reason: "De vectorbron mist een exacte bron-, contour- en hashbinding." };
  }
  if (asset.admission) {
    if (asset.admission.lifecycle !== "AUTHORITATIVE" || REQUIRED_VECTOR_ADMISSION_STAGES.some((stage) => !asset.admission.stages?.includes(stage)) || asset.admission.sourceSha256 !== sourceSha256 || asset.admission.geometrySha256 !== geometryHash) {
      return { allowed: false, code: "PRODUCTION_ASSET_ADMISSION_INCOMPLETE", reason: "De vector-/artworkbron heeft de toelatingsketen niet volledig doorlopen." };
    }
    const applications = asset.applications ?? [];
    if (applications.some((application) => !asset.admission.applicationBindings?.some((binding) => binding.kind === application.kind && binding.placement === application.placement))) {
      return { allowed: false, code: "PRODUCTION_ASSET_APPLICATION_MISMATCH", reason: "De productieasset is niet voor deze exacte toepassing bevestigd." };
    }
  } else if (!asset.verifiedSourceKey && !asset.registrationId) {
    return { allowed: false, code: "PRODUCTION_ASSET_HUMAN_CONFIRMATION_MISSING", reason: "De bron mist een herleidbare menselijke of historische registratie." };
  }
  return { allowed: true, code: "PRODUCTION_ASSET_EXECUTABLE", reason: null };
}

const numberApplicationFields = (placement) => {
  const value = String(placement ?? "").toLocaleLowerCase("nl-NL");
  return [
    /rug|back/u.test(value) ? "backNumber" : null,
    /borst|chest/u.test(value) ? "chestNumber" : null,
    /short|rok/u.test(value) ? "shortsNumber" : null,
  ].filter(Boolean);
};

/**
 * Existing immutable bytes can only resolve another missing-source task when
 * their already-confirmed association and exact number application match. A
 * source filename, sport family or technically valid geometry never grants a
 * new association/application by itself.
 */
export function productionAssetReuseDecision({ asset, targetAssociationIdentities = [], applicationField }) {
  const executable = executableProductionAssetDecision(asset);
  if (!executable.allowed) return executable;
  const targetIdentities = new Set(targetAssociationIdentities.map(String).filter(Boolean));
  const associationContexts = (asset.contexts ?? []).filter(({ type }) => type === "ASSOCIATION");
  if (!targetIdentities.size || !associationContexts.some((context) => contextIdentityMatches(context, targetIdentities))) {
    return { allowed: false, code: "PRODUCTION_ASSET_REUSE_ASSOCIATION_MISMATCH", reason: "De bestaande bron is niet voor deze exacte vereniging bevestigd." };
  }
  const confirmedFields = new Set((asset.applications ?? []).filter(({ kind }) => kind === "NUMBER_SET").flatMap(({ placement }) => numberApplicationFields(placement)));
  if (!applicationField || !confirmedFields.has(applicationField)) {
    return { allowed: false, code: "PRODUCTION_ASSET_REUSE_APPLICATION_MISMATCH", reason: "De bestaande bron is niet voor deze exacte nummer-toepassing bevestigd." };
  }
  return { allowed: true, code: "PRODUCTION_ASSET_REUSE_EXACT", reason: null };
}

export function productionObjectFitsTrack({ widthMm, heightMm, maximumTrackWidthMm, allowedRotations = [0] }) {
  const width = Number(widthMm);
  const height = Number(heightMm);
  const maximum = Number(maximumTrackWidthMm);
  if (!(width > 0) || !(height > 0) || !(maximum > 0)) return false;
  return [...new Set(allowedRotations.map((rotation) => ((Number(rotation) % 180) + 180) % 180))]
    .some((rotation) => (rotation === 90 ? height : width) <= maximum);
}

/**
 * Association context ranks sources; it never makes a production-ready source
 * disappear from Vrije opdruk. Teamwear can still request strict context by
 * passing includeAll=false.
 */
export function projectProductionReadyVisualAssets(elements, contextLabel = "", { includeAll = true } = {}) {
  const normalizedContext = String(contextLabel).toLocaleLowerCase("nl-NL");
  return (elements ?? []).filter((asset) => {
    const { ownerType, contexts, applications } = asset;
    if (!executableProductionAssetDecision(asset).allowed) return false;
    if (!(applications ?? []).some(({ kind }) => ["LOGO", "SPONSOR", "ARTWORK"].includes(String(kind).toUpperCase()))) return false;
    const associationContexts = (contexts ?? []).filter(({ type }) => type === "ASSOCIATION");
    if (!associationContexts.length) return ownerType !== "ASSOCIATION" || includeAll;
    const matches = Boolean(normalizedContext && associationContexts.some(({ id, label }) => String(id).toLocaleLowerCase("nl-NL") === normalizedContext || String(label).toLocaleLowerCase("nl-NL") === normalizedContext));
    return matches || includeAll;
  });
}

const contextIdentityMatches = (context, identities) => identities.has(String(context.id)) || identities.has(String(context.label));

/**
 * One source-context boundary is shared by order creation and final production
 * validation. Association context is authoritative for normal orders. In a
 * CUSTOM/Vrije-opdruk order an explicitly selected, production-ready visual or
 * number source may cross that association relevance boundary, while ARTICLE
 * and ORDER scopes remain exact physical/provenance boundaries.
 */
export function productionAssetContextDecision({ asset, orderKind, associationIdentities = [], articleIdentities = [], orderId = null }) {
  const executable = executableProductionAssetDecision(asset);
  if (!executable.allowed) return executable;
  const contexts = asset.contexts ?? [];
  const associationScopes = contexts.filter(({ type }) => type === "ASSOCIATION");
  const articleScopes = contexts.filter(({ type }) => type === "ARTICLE");
  const orderScopes = contexts.filter(({ type }) => type === "ORDER");
  if (asset.ownerType === "ASSOCIATION" && !associationScopes.length) {
    return { allowed: false, code: "PRODUCTION_ASSET_CONTEXT_REQUIRED", reason: `${asset.name} mist een gecontroleerde verenigingskoppeling.` };
  }
  const customSourceSelection = orderKind === "CUSTOM";
  if (!customSourceSelection && associationScopes.length && !associationScopes.some((context) => contextIdentityMatches(context, new Set(associationIdentities.map(String))))) {
    return { allowed: false, code: "PRODUCTION_ASSET_CONTEXT_MISMATCH", reason: `${asset.name} hoort niet bij de gekozen vereniging.` };
  }
  if (articleScopes.length && !articleScopes.some((context) => contextIdentityMatches(context, new Set(articleIdentities.map(String))))) {
    return { allowed: false, code: "PRODUCTION_ASSET_ARTICLE_MISMATCH", reason: `${asset.name} hoort niet bij het gekozen artikel.` };
  }
  if (orderScopes.length && !orderScopes.some(({ id, label }) => String(id) === String(orderId) || String(label) === String(orderId))) {
    return { allowed: false, code: "PRODUCTION_ASSET_ORDER_MISMATCH", reason: `${asset.name} hoort niet bij deze order.` };
  }
  return { allowed: true, code: "PRODUCTION_ASSET_CONTEXT_VALID", reason: null };
}

/**
 * Physical decoration lines are the canonical color truth once they exist.
 * Item color is only a fallback for stock-only or historical orders without
 * materialized decoration lines. This prevents synthetic/custom item metadata
 * from creating an extra empty production batch.
 */
export function canonicalOrderFoilColors({ items = [], productionLines = [] }) {
  const lineColors = productionLines.map(({ decorationIdentity, foilColor }) => String(decorationIdentity?.foilColor ?? foilColor ?? "").trim()).filter(Boolean);
  const candidates = lineColors.length ? lineColors : items.map(({ foilColor }) => String(foilColor ?? "").trim()).filter(Boolean);
  return [...new Map(candidates.map((color) => [color.toLocaleLowerCase("nl-NL"), color])).values()];
}

export function canonicalProductionLineFoilColor(order, line) {
  const exact = String(line?.decorationIdentity?.foilColor ?? line?.foilColor ?? "").trim();
  if (exact) return exact;
  const item = (order?.items ?? []).find(({ id }) => id === line?.itemId);
  return String(item?.foilColor ?? "Onbekend").trim() || "Onbekend";
}

export function proportionalProductionAssetSize({ requestedWidthMm, requestedHeightMm, currentWidthMm, currentHeightMm, defaultWidthMm, defaultHeightMm, minWidthMm = 1, maxWidthMm = 1000 }) {
  const ratio = Number(defaultWidthMm) / Number(defaultHeightMm);
  if (!(ratio > 0) || !Number.isFinite(ratio)) throw new Error("Productiebron mist een geldige bronverhouding.");
  let widthMm = Number(currentWidthMm);
  let heightMm = Number(currentHeightMm);
  if (Number(requestedWidthMm) > 0) {
    widthMm = Math.max(Number(minWidthMm), Math.min(Number(maxWidthMm), Number(requestedWidthMm)));
    heightMm = widthMm / ratio;
  } else if (Number(requestedHeightMm) > 0) {
    heightMm = Number(requestedHeightMm);
    widthMm = Math.max(Number(minWidthMm), Math.min(Number(maxWidthMm), heightMm * ratio));
    heightMm = widthMm / ratio;
  }
  return { widthMm: Math.round(widthMm * 1000) / 1000, heightMm: Math.round(heightMm * 1000) / 1000 };
}
