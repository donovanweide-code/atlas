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
 * always preserved.
 */
export function canonicalArticlePersonalizationFields({ article, association, productionProfiles, productType }) {
  const fields = new Set(article?.supports ?? Object.keys(article?.personalizationPolicy?.fields ?? {}));
  const possible = PRODUCT_TYPE_FIELDS[productType] ?? [];
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

/**
 * Association context ranks sources; it never makes a production-ready source
 * disappear from Vrije opdruk. Teamwear can still request strict context by
 * passing includeAll=false.
 */
export function projectProductionReadyVisualAssets(elements, contextLabel = "", { includeAll = true } = {}) {
  const normalizedContext = String(contextLabel).toLocaleLowerCase("nl-NL");
  return (elements ?? []).filter(({ lifecycleStatus, productionMethod, sourceId, ownerType, contexts, applications }) => {
    if (lifecycleStatus !== "PRODUCTION_READY" || productionMethod !== "SELF_PRODUCED" || !sourceId) return false;
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
  if (!asset || asset.lifecycleStatus !== "PRODUCTION_READY" || asset.productionMethod !== "SELF_PRODUCED" || !asset.sourceId) {
    return { allowed: false, code: "PRODUCTION_ASSET_NOT_READY", reason: "De productiebron is niet exact productierijp en brongebonden." };
  }
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
