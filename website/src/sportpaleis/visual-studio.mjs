import { createHash } from "node:crypto";

export const VISUAL_STUDIO_CHANNELS = Object.freeze([
  Object.freeze({ channel: "HOMEPAGE", widthPx: 1600, heightPx: 900 }),
  Object.freeze({ channel: "SOCIAL_SQUARE", widthPx: 1200, heightPx: 1200 }),
  Object.freeze({ channel: "STORY", widthPx: 1080, heightPx: 1920 }),
  Object.freeze({ channel: "MAIL_HERO", widthPx: 1200, heightPx: 600 }),
  Object.freeze({ channel: "TEAMWEAR_PROOF", widthPx: 1200, heightPx: 1200 }),
]);

export const VISUAL_STUDIO_DIRECTIONS = Object.freeze([
  Object.freeze({ id: "EDITORIAL_IMPACT", label: "Editorial impact", promise: "Veel rust, sterke typografie en één heldere blikvanger.", palette: "LIGHT", composition: "ASYMMETRIC" }),
  Object.freeze({ id: "PERFORMANCE_ENERGY", label: "Performance energy", promise: "Tempo, contrast en beweging zonder het product te vervormen.", palette: "DARK", composition: "DIAGONAL" }),
  Object.freeze({ id: "PRODUCT_PRECISION", label: "Product precision", promise: "Materiaal en pasvorm staan overtuigend en precies centraal.", palette: "NEUTRAL", composition: "CENTERED" }),
  Object.freeze({ id: "CLUB_PRIDE", label: "Club pride", promise: "Clubidentiteit en teamgevoel krijgen een herkenbare hoofdrol.", palette: "CLUB", composition: "BADGE_LED" }),
]);

const DIRECTION_IDS = new Set(VISUAL_STUDIO_DIRECTIONS.map(({ id }) => id));

const CHANNEL_ART_DIRECTION = Object.freeze({
  HOMEPAGE: Object.freeze({ crop: "WIDE_EDITORIAL", copyAnchor: "LEFT_BOTTOM", productScaleFactor: 1, safeInsetPercent: 8, emphasis: "CAMPAIGN" }),
  SOCIAL_SQUARE: Object.freeze({ crop: "SQUARE_FOCAL", copyAnchor: "LEFT_BOTTOM", productScaleFactor: 0.9, safeInsetPercent: 9, emphasis: "PRODUCT" }),
  STORY: Object.freeze({ crop: "PORTRAIT_FULL", copyAnchor: "LEFT_TOP", productScaleFactor: 0.82, safeInsetPercent: 10, emphasis: "MOMENT" }),
  MAIL_HERO: Object.freeze({ crop: "SHALLOW_WIDE", copyAnchor: "LEFT_CENTER", productScaleFactor: 0.78, safeInsetPercent: 10, emphasis: "MESSAGE" }),
  TEAMWEAR_PROOF: Object.freeze({ crop: "SQUARE_PROOF", copyAnchor: "LEFT_BOTTOM", productScaleFactor: 0.88, safeInsetPercent: 12, emphasis: "SOURCE_TRUTH" }),
});

const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const text = (value, maximum) => String(value ?? "").trim().slice(0, maximum);
const number = (value, minimum, maximum, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

export function visualStudioProductRef(article) {
  const snapshot = {
    articleId: article.id,
    articleRevision: Number(article.revision ?? 1),
    articleNumber: String(article.articleNumber),
    name: String(article.name),
    imageKey: String(article.imageKey),
  };
  return { ...snapshot, sourceHash: hash(snapshot) };
}

export function visualStudioAssetRef(asset, source) {
  if (!asset?.id || !asset.sourceId || !asset.version || !source?.original?.sha256) throw Object.assign(new Error("Alleen een gecontroleerde Bibliotheekbron kan in Visual Studio worden gebruikt."), { statusCode: 409, code: "VISUAL_SOURCE_NOT_READY" });
  return { assetId: asset.id, name: asset.name, sourceId: asset.sourceId, version: asset.version, sourceSha256: source.original.sha256 };
}

function normalizedGeometry(input, assetRefs) {
  const productInput = input?.product ?? {};
  const assetsInput = new Map((input?.assets ?? []).map((entry) => [String(entry.assetId), entry]));
  return {
    product: {
      xPercent: number(productInput.xPercent, 18, 82, 50),
      yPercent: number(productInput.yPercent, 18, 82, 52),
      scale: number(productInput.scale, 0.45, 1.25, 0.82),
    },
    assets: assetRefs.map((asset, index) => {
      const entry = assetsInput.get(asset.assetId) ?? {};
      return {
        assetId: asset.assetId,
        xPercent: number(entry.xPercent, 8, 92, 32 + index * 18),
        yPercent: number(entry.yPercent, 8, 92, 68),
        scale: number(entry.scale, 0.08, 0.55, 0.2),
      };
    }),
  };
}

function truthPayload(composition) {
  return {
    revision: composition.revision,
    concept: composition.concept,
    title: composition.title,
    artDirection: composition.artDirection,
    directionId: composition.directionId,
    productRef: composition.productRef,
    assetRefs: composition.assetRefs,
    geometry: composition.geometry,
  };
}

function directionId(value, concept) {
  if (DIRECTION_IDS.has(value)) return value;
  if (concept === "CLUB_MOMENT") return "CLUB_PRIDE";
  if (concept === "PRODUCT_FOCUS") return "PRODUCT_PRECISION";
  return "EDITORIAL_IMPACT";
}

function channelLayout(channel, direction, geometry) {
  const base = CHANNEL_ART_DIRECTION[channel.channel];
  const directionShift = direction === "PERFORMANCE_ENERGY" ? 5 : direction === "CLUB_PRIDE" ? -3 : 0;
  const portraitShift = channel.channel === "STORY" ? -8 : 0;
  return {
    ...base,
    product: {
      xPercent: Math.min(82, Math.max(18, geometry.product.xPercent + directionShift)),
      yPercent: Math.min(82, Math.max(18, geometry.product.yPercent + portraitShift)),
      scale: Number((geometry.product.scale * base.productScaleFactor).toFixed(3)),
    },
  };
}

export function finalizeVisualStudioComposition(input) {
  const normalized = { ...input, directionId: directionId(input.directionId, input.concept) };
  const compositionHash = hash(truthPayload(normalized));
  const channels = VISUAL_STUDIO_CHANNELS.map((channel) => {
    const layout = channelLayout(channel, normalized.directionId, normalized.geometry);
    return { ...channel, layout, renderHash: hash({ compositionHash, channel, layout }) };
  });
  const withinBounds = input.geometry.product.xPercent >= 18 && input.geometry.product.xPercent <= 82
    && input.geometry.product.yPercent >= 18 && input.geometry.product.yPercent <= 82
    && input.geometry.assets.every(({ xPercent, yPercent }) => xPercent >= 8 && xPercent <= 92 && yPercent >= 8 && yPercent <= 92);
  const warnings = [!input.assetRefs.length ? "Voeg minimaal één gecontroleerde Bibliotheekbron toe." : "", !input.artDirection ? "Leg de art-direction kort vast." : "", !withinBounds ? "Een element valt buiten de veilige compositieruimte." : ""].filter(Boolean);
  return {
    ...normalized,
    channels,
    checks: { canonicalProductLocked: true, canonicalAssetsLocked: true, withinBounds, readyForReview: warnings.length === 0, warnings },
    compositionHash,
  };
}

export function createVisualStudioComposition({ id, now, user, concept, title, artDirection, article, assets, sources }) {
  if (!article) throw Object.assign(new Error("Kies een bestaand Sportpaleis-product."), { statusCode: 400, code: "VISUAL_PRODUCT_REQUIRED" });
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const assetRefs = assets.map((asset) => visualStudioAssetRef(asset, sourceById.get(asset.sourceId)));
  const selectedDirectionId = directionId(undefined, concept);
  const selectedDirection = VISUAL_STUDIO_DIRECTIONS.find(({ id: candidateId }) => candidateId === selectedDirectionId);
  return finalizeVisualStudioComposition({
    id,
    revision: 1,
    status: "DRAFT",
    concept: ["SEASON_START", "PRODUCT_FOCUS", "CLUB_MOMENT"].includes(concept) ? concept : "PRODUCT_FOCUS",
    title: text(title || article.name, 120),
    artDirection: text(artDirection || selectedDirection?.promise, 500),
    directionId: selectedDirectionId,
    productRef: visualStudioProductRef(article),
    assetRefs,
    geometry: normalizedGeometry({}, assetRefs),
    createdAt: now,
    createdBy: { userId: user.id, name: user.name },
    updatedAt: now,
    updatedBy: { userId: user.id, name: user.name },
  });
}

export function updateVisualStudioComposition(existing, input, user, now) {
  if (Number(input.expectedRevision) !== existing.revision) throw Object.assign(new Error("De compositie is intussen gewijzigd. Vernieuw en probeer opnieuw."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: existing.revision });
  const next = {
    ...structuredClone(existing),
    revision: existing.revision + 1,
    status: "DRAFT",
    title: text(input.title ?? existing.title, 120),
    artDirection: text(input.artDirection ?? existing.artDirection, 500),
    directionId: directionId(input.directionId ?? existing.directionId, existing.concept),
    geometry: normalizedGeometry(input.geometry ?? existing.geometry, existing.assetRefs),
    updatedAt: now,
    updatedBy: { userId: user.id, name: user.name },
  };
  return finalizeVisualStudioComposition(next);
}

export function upgradeVisualStudioComposition(existing) {
  return finalizeVisualStudioComposition({ ...existing, directionId: directionId(existing.directionId, existing.concept) });
}

export function submitVisualStudioReview(existing, expectedRevision, user, now) {
  if (Number(expectedRevision) !== existing.revision) throw Object.assign(new Error("De compositie is intussen gewijzigd. Vernieuw en probeer opnieuw."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: existing.revision });
  const checked = finalizeVisualStudioComposition(existing);
  if (!checked.checks.readyForReview) throw Object.assign(new Error(checked.checks.warnings.join(" ")), { statusCode: 409, code: "VISUAL_REVIEW_NOT_READY" });
  return finalizeVisualStudioComposition({ ...checked, revision: existing.revision + 1, status: "READY_FOR_REVIEW", updatedAt: now, updatedBy: { userId: user.id, name: user.name } });
}

export function validateVisualStudioCompositions(compositions) {
  if (!Array.isArray(compositions)) throw new Error("Visual Studio-collectie ontbreekt.");
  if (new Set(compositions.map(({ id }) => id)).size !== compositions.length) throw new Error("Dubbele Visual Studio-compositie.");
  for (const composition of compositions) {
    const finalized = finalizeVisualStudioComposition(composition);
    if (composition.compositionHash !== finalized.compositionHash) throw new Error("Visual Studio-compositie is gewijzigd buiten de geversioneerde waarheid.");
    if (composition.channels?.length !== VISUAL_STUDIO_CHANNELS.length || composition.channels.some((channel, index) => channel.renderHash !== finalized.channels[index].renderHash)) throw new Error("Visual Studio-kanaalvariant wijkt af van de broncompositie.");
  }
  return compositions;
}

