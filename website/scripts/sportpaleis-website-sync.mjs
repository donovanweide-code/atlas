import { createHash, randomBytes } from "node:crypto";

export const SPORTPALEIS_WEBSITE_SYNC_SOURCE = Object.freeze({
  storefrontUrl: "https://www.sportpaleis.nl/verenigingen/",
  sitemapUrl: "https://www.sportpaleis.nl/sitemap/categories.xml?culture=nl-NL",
  associationPath: "/verenigingen/",
  cadence: "NIGHTLY_03_00_EUROPE_AMSTERDAM",
});

export function createSportpaleisWebsiteSyncState() {
  return {
    enabled: false,
    mode: "SAFE_AUTO_PROJECT",
    cadence: SPORTPALEIS_WEBSITE_SYNC_SOURCE.cadence,
    source: { ...SPORTPALEIS_WEBSITE_SYNC_SOURCE },
    status: "NOT_RUN",
    lastAttemptAt: null,
    lastSuccessfulSyncAt: null,
    nextRunAt: null,
    sourceFingerprint: null,
    sourceFingerprintIndex: {},
    sourceScopeIndex: {},
    sourceRelevanceIndex: {},
    reviewDecisions: {},
    reconciliationHistory: [],
    counts: { raw: 0, live: 0, productionRelevant: 0, autoNoop: 0, associations: 0, articles: 0, new: 0, changed: 0, attention: 0 },
    changes: [],
    lastError: null,
  };
}

const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const normalized = (value) => String(value ?? "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/gu, "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function absoluteUrl(value, baseUrl) {
  return new URL(decodeHtml(value), baseUrl).toString();
}

export function parseSportpaleisAssociationSitemap(xml) {
  const entries = [...String(xml ?? "").matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/gu)]
    .map(([, loc, lastModified = null]) => ({ url: decodeHtml(loc), lastModified }))
    .filter(({ url }) => {
      const parsed = new URL(url);
      return parsed.hostname === "www.sportpaleis.nl"
        && parsed.pathname.startsWith(SPORTPALEIS_WEBSITE_SYNC_SOURCE.associationPath)
        && parsed.pathname !== SPORTPALEIS_WEBSITE_SYNC_SOURCE.associationPath;
    });
  if (!entries.length) throw Object.assign(new Error("De Sportpaleis-sitemap bevat geen betrouwbare verenigingspagina's."), { code: "WEBSITE_SYNC_SOURCE_EMPTY" });
  return entries.sort((left, right) => left.url.localeCompare(right.url));
}

export function parseSportpaleisLiveAssociationDirectory(html, sourceUrl = SPORTPALEIS_WEBSITE_SYNC_SOURCE.storefrontUrl) {
  const body = String(html ?? "");
  const start = body.search(/<h2[^>]*>\s*Voetbalverenigingen\s*<\/h2>/iu);
  const end = body.search(/<h2[^>]*>\s*Complete Clubondersteuning\s*<\/h2>/iu);
  if (start < 0 || end <= start) throw Object.assign(new Error("De publieke verenigingenlijst mist de verwachte redactionele grens."), { code: "WEBSITE_SYNC_LIVE_DIRECTORY_MISSING" });
  const section = body.slice(start, end);
  const entries = [...section.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/giu)].map(([, href, label]) => ({
    url: absoluteUrl(href, sourceUrl),
    name: decodeHtml(label.replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim(),
  })).filter(({ url, name }) => {
    const parsed = new URL(url);
    return parsed.hostname === "www.sportpaleis.nl" && parsed.pathname.startsWith(SPORTPALEIS_WEBSITE_SYNC_SOURCE.associationPath) && parsed.pathname !== SPORTPALEIS_WEBSITE_SYNC_SOURCE.associationPath && Boolean(name);
  });
  const unique = [...new Map(entries.map((entry) => [new URL(entry.url).pathname.replace(/\/+$/u, "/"), entry])).values()];
  if (!unique.length) throw Object.assign(new Error("De publieke verenigingenlijst bevat geen betrouwbare clubstores."), { code: "WEBSITE_SYNC_LIVE_DIRECTORY_EMPTY" });
  return unique.sort((left, right) => left.url.localeCompare(right.url));
}

export function parseSportpaleisProductionRelevance(html) {
  const body = String(html ?? "");
  if (!/<(?:main|form|div)\b/iu.test(body)) return { status: "AMBIGUOUS", fields: [], evidence: "PRODUCT_PAGE_STRUCTURE_MISSING" };
  const fields = [...body.matchAll(/<div[^>]*class="[^"]*row\s+type-description[^"]*"[\s\S]*?<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/giu)]
    .map(([, value]) => decodeHtml(value.replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim())
    .filter((value) => /^(?:rugnummer|shortnummer|initialen|naam(?:\s*\(rug\))?)\b/iu.test(value));
  return fields.length
    ? { status: "RELEVANT", fields: [...new Set(fields)], evidence: "PUBLIC_PERSONALIZATION_FIELDS" }
    : { status: "NOT_RELEVANT", fields: [], evidence: "NO_PUBLIC_PERSONALIZATION_FIELDS" };
}

function textAfterDefinition(html, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = String(html ?? "").match(new RegExp(`<dt>\\s*${escaped}:?\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`, "iu"));
  return match ? decodeHtml(match[1].replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim() : null;
}

export function parseSportpaleisProductMetadata(html) {
  const body = String(html ?? "");
  const layerMatch = body.match(/data-layer-product-detail='([^']+)'/iu);
  let product = {};
  try { product = layerMatch ? JSON.parse(decodeHtml(layerMatch[1]))?.ecommerce?.detail?.products?.[0] ?? {} : {}; } catch { product = {}; }
  const articleNumber = textAfterDefinition(body, "Artikelnummer") ?? (String(product.itemgroupid ?? "").replace(/-[^-]+$/u, "") || null);
  const supplierArticleNumber = textAfterDefinition(body, "Artikelnummer leverancier");
  const availableSizes = [...new Set([...body.matchAll(/<a[^>]*class="[^"]*sizeBox[^"]*"[^>]*>([\s\S]*?)<\/a>/giu)].map(([, value]) => decodeHtml(value.replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim()).filter(Boolean))];
  const commercialPrintOptions = [];
  for (const match of body.matchAll(/<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>[\s\S]{0,2200}?data-price="([0-9]+(?:\.[0-9]+)?)"/giu)) {
    const sourceLabel = decodeHtml(match[1].replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
    if (!/^(?:rugnummer|shortnummer|initialen|naam(?:\s*\(rug\))?)\b/iu.test(sourceLabel)) continue;
    commercialPrintOptions.push({ sourceLabel, priceEur: Number(match[2]) });
  }
  const listedPrice = Number(product.price);
  const discount = Number(product.discount ?? 0);
  return {
    articleNumber,
    supplierArticleNumber,
    availableSizes,
    colorLabel: String(product.variant ?? "").trim() || null,
    articleUnitPriceEur: Number.isFinite(listedPrice) ? Math.max(0, listedPrice - (Number.isFinite(discount) ? discount : 0)) : null,
    commercialPrintOptions,
  };
}

/**
 * Reads the ordered product gallery that already ships with the official
 * Sportpaleis product page. The source convention is front-first/back-last;
 * intermediate entries remain alternatives because the storefront may expose
 * both square and cropped variants. All entries belong to the same selected
 * product/color context, so no cross-model or cross-color lookup is allowed.
 */
export function parseSportpaleisProductMedia(html, sourceUrl) {
  const body = String(html ?? "");
  const gallery = body.match(/<div\s+id="mainImage"(?:\s[^>]*)?>[\s\S]*?(?=<div\s+id="thumbnails"(?:\s[^>]*)?>)/iu)?.[0] ?? "";
  const sourceContextMatch = body.match(/data-refresher-object='(\{"productId":[^']+\})'/iu);
  let sourceContext = {};
  try { sourceContext = sourceContextMatch ? JSON.parse(decodeHtml(sourceContextMatch[1])) : {}; } catch { sourceContext = {}; }
  const productLayerMatch = body.match(/data-layer-product-detail='([^']+)'/iu);
  let colorLabel = null;
  try { colorLabel = productLayerMatch ? JSON.parse(decodeHtml(productLayerMatch[1]))?.ecommerce?.detail?.products?.[0]?.variant ?? null : null; } catch { colorLabel = null; }
  const entries = [];
  for (const match of gallery.matchAll(/data-image-details='([^']+)'/giu)) {
    let details;
    try { details = JSON.parse(decodeHtml(match[1])); } catch { continue; }
    const candidate = details?.resolution?.low?.url ?? details?.resolution?.high?.url;
    if (!candidate) continue;
    const url = absoluteUrl(candidate, sourceUrl);
    const parsed = new URL(url);
    if (parsed.hostname !== "www.sportpaleis.nl" || !parsed.pathname.startsWith("/img/")) continue;
    entries.push({ sourceIndex: Number(details.index ?? entries.length), sourceUrl: url });
  }
  const ordered = [...new Map(entries.sort((left, right) => left.sourceIndex - right.sourceIndex).map((entry) => [entry.sourceUrl, entry])).values()];
  return ordered.map((entry, index) => ({
    kind: index === 0 ? "FRONT" : index === ordered.length - 1 ? "BACK" : "ALTERNATIVE",
    sourceUrl: entry.sourceUrl,
    sourceIndex: entry.sourceIndex,
    sourceProductId: sourceContext.productId == null ? null : String(sourceContext.productId),
    sourceColorId: sourceContext.colorId == null ? null : String(sourceContext.colorId),
    colorLabel: colorLabel == null ? null : String(colorLabel),
    authority: "SPORTPALEIS_LIVE_PRODUCT_GALLERY",
    classification: "SOURCE_GALLERY_ORDER_V1",
  }));
}

export function parseSportpaleisAssociationPage(html, sourceUrl) {
  const body = String(html ?? "");
  const declaredCount = Number(body.match(/<span class="count">\s*([0-9]+)\s*<\/span>\s*Producten/iu)?.[1] ?? 0);
  const articles = [];
  const pattern = /<div class="item"\s+data-product-id="([0-9]+)"[\s\S]*?data-layer-product='([^']+)'[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/gu;
  for (const match of body.matchAll(pattern)) {
    let layer;
    try { layer = JSON.parse(decodeHtml(match[2])); }
    catch { throw Object.assign(new Error("Een artikel op de verenigingspagina heeft ongeldige gestructureerde brondata."), { code: "WEBSITE_SYNC_PRODUCT_INVALID" }); }
    const sourceIdentifier = String(layer.itemgroupid ?? "").trim().replace(/-[^-]+$/u, "");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(sourceIdentifier)) throw Object.assign(new Error("Een artikel mist een stabiele bronidentifier."), { code: "WEBSITE_SYNC_PRODUCT_ID_MISSING" });
    const article = {
      sourceIdentifier,
      websiteProductId: match[1],
      name: decodeHtml(layer.name || match[4]).trim(),
      associationName: decodeHtml(layer.category ?? "").trim(),
      brand: decodeHtml(layer.brand ?? "").trim() || null,
      priceEur: Number.isFinite(Number(layer.price)) ? Number(layer.price) : null,
      url: absoluteUrl(match[3], sourceUrl),
      imageUrl: absoluteUrl(match[5], sourceUrl),
    };
    article.fingerprint = sha256(JSON.stringify(article));
    if (!articles.some(({ sourceIdentifier }) => sourceIdentifier === article.sourceIdentifier)) articles.push(article);
  }
  if (!articles.length) throw Object.assign(new Error("De verenigingspagina bevat geen betrouwbaar herkenbare artikelen."), { code: "WEBSITE_SYNC_PRODUCTS_EMPTY" });
  const associationName = articles.map(({ associationName }) => associationName).find(Boolean)
    ?? decodeHtml(body.match(/<h1[^>]*>([^<]+)<\/h1>/iu)?.[1] ?? "").trim();
  if (!associationName) throw Object.assign(new Error("De verenigingsnaam ontbreekt in de gestructureerde bron."), { code: "WEBSITE_SYNC_ASSOCIATION_NAME_MISSING" });
  return { associationName, declaredCount, articles };
}

async function fetchText(fetcher, url, { allowNotFound = false } = {}) {
  const response = await fetcher(url, {
    headers: { accept: "text/html,application/xml;q=0.9", "user-agent": "WBD-Sportpaleis-Sync/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) throw Object.assign(new Error(`Sportpaleis-bron gaf HTTP ${response.status}.`), { code: "WEBSITE_SYNC_SOURCE_UNAVAILABLE" });
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > 2_500_000) throw Object.assign(new Error("Sportpaleis-bronantwoord is onverwacht groot."), { code: "WEBSITE_SYNC_SOURCE_TOO_LARGE" });
  return text;
}

async function mapConcurrent(items, concurrency, mapper) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index], index);
    }
  }));
  return output;
}

export function createSportpaleisWebsiteSource({ fetcher = globalThis.fetch } = {}) {
  if (typeof fetcher !== "function") throw new Error("Een fetch-implementatie is vereist.");
  return {
    async snapshot(now = new Date(), { knownProductionArticleIds = new Set(), relevanceIndex = {} } = {}) {
      const [sitemap, directoryHtml] = await Promise.all([
        fetchText(fetcher, SPORTPALEIS_WEBSITE_SYNC_SOURCE.sitemapUrl),
        fetchText(fetcher, SPORTPALEIS_WEBSITE_SYNC_SOURCE.storefrontUrl),
      ]);
      const sitemapEntries = parseSportpaleisAssociationSitemap(sitemap);
      const sitemapByPath = new Map(sitemapEntries.map((entry) => [new URL(entry.url).pathname.replace(/\/+$/u, "/"), entry]));
      const entries = parseSportpaleisLiveAssociationDirectory(directoryHtml).map((entry) => ({ ...entry, lastModified: sitemapByPath.get(new URL(entry.url).pathname.replace(/\/+$/u, "/"))?.lastModified ?? null }));
      const rawArticleCandidates = Number(directoryHtml.match(/<span class="count">\s*([0-9]+)\s*<\/span>\s*Producten/iu)?.[1] ?? 0);
      const associationCandidates = await mapConcurrent(entries, 3, async (entry) => {
        const firstPage = await fetchText(fetcher, entry.url, { allowNotFound: true });
        if (firstPage === null) return null;
        const articles = new Map();
        let associationName = "";
        let declaredCount = 0;
        for (let page = 1; page <= 30; page += 1) {
          const pageUrl = page === 1 ? entry.url : `${entry.url}${entry.url.includes("?") ? "&" : "?"}p=${page}`;
          let parsed;
          try { parsed = parseSportpaleisAssociationPage(page === 1 ? firstPage : await fetchText(fetcher, pageUrl), entry.url); }
          catch (error) {
            if (page === 1 && error?.code === "WEBSITE_SYNC_PRODUCTS_EMPTY") return null;
            Object.defineProperty(error, "sourceUrl", { configurable: true, value: pageUrl });
            throw error;
          }
          associationName ||= parsed.associationName;
          declaredCount = Math.max(declaredCount, parsed.declaredCount);
          const before = articles.size;
          for (const article of parsed.articles) articles.set(article.sourceIdentifier, article);
          if (articles.size >= declaredCount || parsed.articles.length < 24) break;
          if (articles.size === before) throw Object.assign(new Error(`Paginatie voor ${entry.url} levert geen nieuwe artikelen.`), { code: "WEBSITE_SYNC_PAGINATION_STALLED" });
        }
        if (declaredCount > 0 && articles.size !== declaredCount) throw Object.assign(new Error(`Verenigingspagina ${entry.url} meldt ${declaredCount} artikelen, maar ${articles.size} zijn volledig gelezen.`), { code: "WEBSITE_SYNC_INCOMPLETE" });
        const classified = await mapConcurrent([...articles.values()], 4, async (article) => {
          const cached = relevanceIndex[article.sourceIdentifier];
          const productPage = await fetchText(fetcher, article.url);
          const observedRelevance = parseSportpaleisProductionRelevance(productPage);
          const productionRelevance = observedRelevance.status === "AMBIGUOUS" && knownProductionArticleIds.has(article.sourceIdentifier)
            ? { status: "RELEVANT", fields: [], evidence: "WORKSPACE_PRODUCTION_CONFIGURATION" }
            : cached?.fingerprint === article.fingerprint && observedRelevance.status === "AMBIGUOUS"
              ? cached.productionRelevance
              : observedRelevance;
          const enriched = { ...article, storefrontStatus: "LIVE", productionRelevance, productMetadata: parseSportpaleisProductMetadata(productPage), catalogMedia: parseSportpaleisProductMedia(productPage, article.url) };
          const { fingerprint: _listingFingerprint, ...fingerprintBody } = enriched;
          return { ...enriched, fingerprint: sha256(JSON.stringify(fingerprintBody)) };
        });
        const result = { sourceIdentifier: entry.url, name: associationName, url: entry.url, lastModified: entry.lastModified, storefrontStatus: "LIVE", articles: classified.sort((left, right) => left.sourceIdentifier.localeCompare(right.sourceIdentifier)) };
        return { ...result, fingerprint: sha256(JSON.stringify(result)) };
      });
      const associations = associationCandidates.filter(Boolean);
      const snapshot = { source: SPORTPALEIS_WEBSITE_SYNC_SOURCE.storefrontUrl, detectedAt: now.toISOString(), rawArticleCandidates, notLiveAssociationCandidates: entries.length - associations.length, associations };
      return { ...snapshot, fingerprint: sha256(JSON.stringify(snapshot.associations)) };
    },
  };
}

function currentArticleSourceId(article) {
  const articleNumber = String(article.articleNumber ?? "").trim();
  if (articleNumber) return articleNumber;
  return String(article.id ?? "").match(/^sp-live-(.+)$/u)?.[1] ?? null;
}

function canonicalPrintField(label) {
  const value = normalized(label);
  if (value.startsWith("rugnummer")) return "backNumber";
  if (value.startsWith("shortnummer")) return "shortsNumber";
  if (value.startsWith("initialen")) return "initials";
  if (value.startsWith("naam")) return "name";
  return null;
}

function safeAutoProjectionDecision(state, association, article) {
  const associations = (state.associations ?? []).filter((candidate) => normalized(candidate.name) === normalized(association.name) && candidate.active !== false);
  if (associations.length !== 1) return { allowed: false, reason: "De vereniging is niet uniek en actief gekoppeld." };
  const metadata = article.productMetadata ?? {};
  if (String(metadata.articleNumber ?? "") !== String(article.sourceIdentifier) || !metadata.supplierArticleNumber) return { allowed: false, reason: "Artikel- of leveranciersnummer ontbreekt of conflicteert." };
  if (!Array.isArray(metadata.availableSizes) || !metadata.availableSizes.length) return { allowed: false, reason: "De websitebron bevat geen controleerbare maten." };
  if (!Number.isFinite(metadata.articleUnitPriceEur) || metadata.articleUnitPriceEur < 0) return { allowed: false, reason: "De websitebron bevat geen betrouwbare artikelprijs." };
  if (!article.imageUrl || !Array.isArray(article.catalogMedia) || !article.catalogMedia.length) return { allowed: false, reason: "De artikelafbeelding is niet eenduidig aan deze productcontext gebonden." };
  const sourceFields = article.productionRelevance?.fields ?? [];
  const supports = [...new Set(sourceFields.map(canonicalPrintField).filter(Boolean))];
  if (!supports.length || supports.length !== new Set(sourceFields.map(normalized)).size) return { allowed: false, reason: "Een zichtbare bedrukoptie kan niet naar één centrale decoration identity worden vertaald." };
  const candidates = (state.articles ?? []).filter((candidate) => candidate.active !== false
    && normalized(candidate.association) === normalized(association.name)
    && candidate.profileId && candidate.profileId !== "profile-none"
    && supports.every((field) => candidate.supports?.includes(field)));
  const profileIds = [...new Set(candidates.map(({ profileId }) => profileId))];
  if (profileIds.length !== 1) return { allowed: false, reason: "Het productieprofiel is niet eenduidig uit bestaande verenigingswaarheid af te leiden." };
  const templates = candidates.filter(({ profileId }) => profileId === profileIds[0]);
  const template = templates[0];
  const prices = new Map();
  for (const field of supports) {
    const options = (metadata.commercialPrintOptions ?? []).filter((option) => canonicalPrintField(option.sourceLabel) === field && Number.isFinite(option.priceEur) && option.priceEur >= 0);
    if (options.length !== 1) return { allowed: false, reason: "Een zichtbare bedrukoptie mist één eenduidige prijsbinding." };
    prices.set(field, options[0]);
  }
  return { allowed: true, association: associations[0], template, supports, profileId: profileIds[0], prices };
}

export function autoProjectSportpaleisWebsiteArticles(state, snapshot, { actorId = "system:website-sync", now = new Date() } = {}) {
  const projected = [];
  const blocked = [];
  const currentIds = new Set((state.articles ?? []).map(currentArticleSourceId).filter(Boolean));
  for (const association of snapshot.associations ?? []) for (const article of association.articles ?? []) {
    if (currentIds.has(article.sourceIdentifier) || article.productionRelevance?.status !== "RELEVANT") continue;
    const decision = safeAutoProjectionDecision(state, association, article);
    if (!decision.allowed) { blocked.push({ sourceIdentifier: article.sourceIdentifier, reason: decision.reason }); continue; }
    const at = now.toISOString();
    const imageKey = `sp-live-${article.sourceIdentifier}`;
    const commercialPrintOptions = decision.supports.map((field) => {
      const option = decision.prices.get(field);
      return { sourceLabel: option.sourceLabel, canonicalField: field, priceEur: option.priceEur, status: "VALIDATED" };
    });
    const personalizationUnitPricesEur = Object.fromEntries(commercialPrintOptions.map(({ canonicalField, priceEur }) => [canonicalField, priceEur]));
    const projectedArticle = {
      id: imageKey,
      articleNumber: article.sourceIdentifier,
      supplierArticleNumber: article.productMetadata.supplierArticleNumber,
      name: article.name,
      imageKey,
      category: decision.template.category ?? "Live bedrukartikel",
      association: decision.association.name,
      profileId: decision.profileId,
      supports: decision.supports,
      active: true,
      revision: 1,
      displayOrder: Math.max(0, ...(state.articles ?? []).map(({ displayOrder }) => Number(displayOrder ?? 0))) + 1,
      variantLabels: article.productMetadata.colorLabel ? [article.productMetadata.colorLabel] : [],
      availableSizes: [...article.productMetadata.availableSizes],
      commercialPrintOptions,
      priceConfiguration: {
        articleUnitPriceEur: article.productMetadata.articleUnitPriceEur,
        articleUnitPricesBySizeEur: Object.fromEntries(article.productMetadata.availableSizes.map((size) => [size, article.productMetadata.articleUnitPriceEur])),
        personalizationUnitPricesEur,
        sourceLabel: `Sportpaleis.nl live · ${article.url}`,
      },
      catalogProvenance: { authority: "SPORTPALEIS_LIVE", url: article.url, imageUrl: article.imageUrl, checkedAt: at.slice(0, 10) },
      catalogMedia: article.catalogMedia.map((media, index) => ({ ...media, imageKey: index === 0 ? imageKey : `${imageKey}-${media.kind.toLocaleLowerCase("en-US")}-${index}`, checkedAt: at.slice(0, 10) })),
      printRelevance: { status: "CONFIRMED_VISIBLE_PERSONALIZATION", sourceLabel: (article.productionRelevance.fields ?? []).join(", "), checkedAt: at.slice(0, 10) },
      productionDataGaps: structuredClone(decision.template.productionDataGaps ?? []),
      personalizationPolicy: { mode: "optional", fields: Object.fromEntries(decision.supports.map((field) => [field, "optional"])) },
      foilColorOverride: null,
      validation: { status: "VALIDATED", source: `Sportpaleis live storefront · ${article.url}`, name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "VALIDATED", sizes: "VALIDATED", personalization: "VALIDATED" },
      validationHistory: [{ at, userId: actorId, previous: null, next: { articleNumber: article.sourceIdentifier, supplierArticleNumber: article.productMetadata.supplierArticleNumber, association: decision.association.name, profileId: decision.profileId, status: "VALIDATED", active: true }, source: "Sportpaleis live storefront · veilige auto-projectie" }],
      ...(decision.template.teamwearProductTruth ? { teamwearProductTruth: { ...structuredClone(decision.template.teamwearProductTruth), sourceArticleId: imageKey, articleNumber: article.sourceIdentifier, evidenceReference: `${article.url} | ${decision.profileId} | supports:${decision.supports.join(",")}`, reconciledAt: at } } : {}),
    };
    state.articles.push(projectedArticle);
    currentIds.add(article.sourceIdentifier);
    projected.push(projectedArticle);
    state.audit ??= [];
    state.audit.unshift({ id: `audit-website-auto-${randomBytes(8).toString("hex")}`, at, userId: actorId, action: "Websiteartikel veilig automatisch gekoppeld", subject: `${article.sourceIdentifier} · ${article.name}`, details: { association: decision.association.name, profileId: decision.profileId, supports: decision.supports, sourceFingerprint: article.fingerprint, historicalOrdersChanged: false } });
  }
  return { projected, blocked };
}

export function compareSportpaleisWebsiteSnapshot(state, snapshot) {
  const previousIndex = state.websiteSync?.sourceFingerprintIndex ?? {};
  const currentArticles = new Map((state.articles ?? []).map((article) => [currentArticleSourceId(article), article]).filter(([id]) => id));
  const currentAssociations = new Map((state.associations ?? []).map((association) => [normalized(association.name), association]));
  const nextIndex = {};
  const nextScopeIndex = {};
  const nextRelevanceIndex = {};
  const changes = [];

  for (const association of snapshot.associations) {
    const associationKey = `association:${association.sourceIdentifier}`;
    nextIndex[associationKey] = association.fingerprint;
    nextScopeIndex[associationKey] = "LIVE_STOREFRONT";
    if (!currentAssociations.has(normalized(association.name))) changes.push({
      id: `sync-change-${sha256(associationKey).slice(0, 16)}`,
      kind: "NEW_ASSOCIATION", sourceIdentifier: association.sourceIdentifier,
      sourceFingerprint: association.fingerprint,
      label: association.name, status: "PENDING_REVIEW",
      explanation: "Nieuwe vereniging op de website. Workspace heeft niets automatisch overschreven.",
      nextBestAction: "Controleer de vereniging",
    });
    for (const article of association.articles) {
      const key = `article:${article.sourceIdentifier}`;
      nextIndex[key] = article.fingerprint;
      nextScopeIndex[key] = "LIVE_STOREFRONT";
      nextRelevanceIndex[article.sourceIdentifier] = { fingerprint: article.fingerprint, productionRelevance: article.productionRelevance };
      if (article.productionRelevance?.status === "NOT_RELEVANT") continue;
      if (article.productionRelevance?.status !== "RELEVANT") {
        changes.push({ id: `sync-change-${sha256(`${key}:relevance`).slice(0, 16)}`, kind: "SOURCE_RELEVANCE_AMBIGUOUS", sourceIdentifier: article.sourceIdentifier, label: article.name, association: association.name, status: "PENDING_REVIEW", sourceValue: structuredClone(article), workspaceValue: currentArticles.get(article.sourceIdentifier) ? { name: currentArticles.get(article.sourceIdentifier).name } : null, sourceFingerprint: article.fingerprint, explanation: "Dit live artikel kan niet betrouwbaar als wel of niet bedrukbaar worden geclassificeerd. Workspace heeft niets gewijzigd.", nextBestAction: "Beoordeel de bedrukrelevantie" });
        continue;
      }
      const current = currentArticles.get(article.sourceIdentifier);
      if (!current) changes.push({
        id: `sync-change-${sha256(key).slice(0, 16)}`,
        kind: "NEW_ARTICLE", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        sourceValue: structuredClone(article), workspaceValue: null, sourceFingerprint: article.fingerprint,
        explanation: "Nieuw artikel op de website. Productie-instellingen zijn nog niet gekoppeld.",
        nextBestAction: "Controleer het artikel",
      });
      else if (previousIndex[key] && previousIndex[key] !== article.fingerprint) changes.push({
        id: `sync-change-${sha256(`${key}:${article.fingerprint}`).slice(0, 16)}`,
        kind: "SOURCE_ARTICLE_CHANGED", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        sourceValue: structuredClone(article), workspaceValue: { name: current.name, url: current.catalogProvenance?.url ?? null }, sourceFingerprint: article.fingerprint,
        explanation: "Het websiteartikel is gewijzigd. Lokale productie-instellingen blijven behouden.",
        nextBestAction: "Bekijk de wijziging",
      });
      else if (current.name !== article.name || current.catalogProvenance?.url !== article.url) changes.push({
        id: `sync-change-${sha256(`${key}:workspace-difference`).slice(0, 16)}`,
        kind: "WORKSPACE_SOURCE_DIFFERENCE", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        sourceValue: structuredClone(article), workspaceValue: { name: current.name, url: current.catalogProvenance?.url ?? null }, sourceFingerprint: article.fingerprint,
        explanation: "Website en Workspace tonen verschillende catalogusgegevens. Productie-instellingen blijven behouden.",
        nextBestAction: "Vergelijk de brongegevens",
      });
    }
  }

  for (const key of Object.keys(previousIndex)) if (!nextIndex[key] && state.websiteSync?.sourceScopeIndex?.[key] === "LIVE_STOREFRONT") changes.push({
    id: `sync-change-${sha256(`${key}:missing`).slice(0, 16)}`,
    kind: "MISSING_FROM_SOURCE", sourceIdentifier: key.split(":").slice(1).join(":"),
    sourceFingerprint: null,
    label: "Niet meer gevonden op de website", status: "PENDING_REVIEW",
    explanation: "De eerdere bronvermelding ontbreekt. Workspace verwijdert niets automatisch.",
    nextBestAction: "Controleer de bron",
  });
  const reviewDecisions = state.websiteSync?.reviewDecisions ?? {};
  const unresolved = changes.filter((change) => reviewDecisions[change.id]?.sourceFingerprint !== change.sourceFingerprint);
  return { changes: unresolved.slice(0, 500), nextIndex, nextScopeIndex, nextRelevanceIndex, reconciledLegacyCount: Object.keys(previousIndex).filter((key) => !nextIndex[key] && state.websiteSync?.sourceScopeIndex?.[key] !== "LIVE_STOREFRONT").length };
}

function nextNightlyRun(now) {
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  next.setUTCHours(1, 0, 0, 0);
  return next.toISOString();
}

export function stageSportpaleisWebsiteSync(state, snapshot, { actorId = "system:website-sync", trigger = "manual", now = new Date(), enabled = state.websiteSync?.enabled === true } = {}) {
  const autoProjection = autoProjectSportpaleisWebsiteArticles(state, snapshot, { actorId, now });
  const { changes, nextIndex, nextScopeIndex, nextRelevanceIndex, reconciledLegacyCount } = compareSportpaleisWebsiteSnapshot(state, snapshot);
  const newCount = changes.filter(({ kind }) => kind === "NEW_ASSOCIATION" || kind === "NEW_ARTICLE").length;
  const changedCount = changes.filter(({ kind }) => kind === "SOURCE_ARTICLE_CHANGED" || kind === "WORKSPACE_SOURCE_DIFFERENCE").length;
  const articleCount = snapshot.associations.reduce((sum, association) => sum + association.articles.length, 0);
  const productionRelevant = snapshot.associations.reduce((sum, association) => sum + association.articles.filter(({ productionRelevance }) => productionRelevance?.status === "RELEVANT").length, 0);
  state.websiteSync = {
    ...(state.websiteSync ?? createSportpaleisWebsiteSyncState()),
    enabled,
    mode: "SAFE_AUTO_PROJECT",
    status: changes.length ? "ATTENTION" : "OK",
    lastAttemptAt: now.toISOString(),
    lastSuccessfulSyncAt: now.toISOString(),
    nextRunAt: enabled ? nextNightlyRun(now) : null,
    sourceFingerprint: snapshot.fingerprint,
    sourceFingerprintIndex: nextIndex,
    sourceScopeIndex: nextScopeIndex,
    sourceRelevanceIndex: nextRelevanceIndex,
    reviewDecisions: state.websiteSync?.reviewDecisions ?? {},
    reconciliationHistory: [{ at: now.toISOString(), actorId, fromAttention: state.websiteSync?.counts?.attention ?? 0, toAttention: changes.length, removedAsLegacyOutOfBoundary: reconciledLegacyCount }, ...(state.websiteSync?.reconciliationHistory ?? [])].slice(0, 20),
    counts: { raw: snapshot.rawArticleCandidates || articleCount, live: articleCount, productionRelevant, autoNoop: Math.max(0, articleCount - productionRelevant), autoProjected: autoProjection.projected.length, associations: snapshot.associations.length, articles: articleCount, new: newCount, changed: changedCount, attention: changes.length },
    changes,
    lastError: null,
  };
  state.audit.unshift({
    id: `audit-website-sync-${randomBytes(8).toString("hex")}`,
    at: now.toISOString(), userId: actorId, action: "Website gecontroleerd",
    subject: "Verenigingen en artikelen",
    details: { trigger, mode: "SAFE_AUTO_PROJECT", associations: snapshot.associations.length, articles: articleCount, autoProjected: autoProjection.projected.length, blockedAutoProjection: autoProjection.blocked.length, attention: changes.length },
  });
  return state.websiteSync;
}

export function failSportpaleisWebsiteSync(state, error, { actorId = "system:website-sync", now = new Date() } = {}) {
  const current = state.websiteSync ?? createSportpaleisWebsiteSyncState();
  const code = String(error?.code ?? "WEBSITE_SYNC_FAILED");
  const sourceContractUnreliable = new Set([
    "WEBSITE_SYNC_LIVE_DIRECTORY_MISSING",
    "WEBSITE_SYNC_LIVE_DIRECTORY_EMPTY",
    "WEBSITE_SYNC_SOURCE_EMPTY",
    "WEBSITE_SYNC_PRODUCTS_EMPTY",
    "WEBSITE_SYNC_PRODUCT_INVALID",
    "WEBSITE_SYNC_PRODUCT_ID_MISSING",
    "WEBSITE_SYNC_INCOMPLETE",
    "WEBSITE_SYNC_PAGINATION_STALLED",
  ]).has(code);
  state.websiteSync = {
    ...current,
    enabled: sourceContractUnreliable ? false : current.enabled,
    status: "ERROR",
    lastAttemptAt: now.toISOString(),
    nextRunAt: sourceContractUnreliable ? null : current.nextRunAt,
    lastError: { code, message: "De websitecontrole kon niet volledig worden uitgevoerd. Bestaande Workspace-data is niet gewijzigd." },
  };
  state.audit.unshift({ id: `audit-website-sync-${randomBytes(8).toString("hex")}`, at: now.toISOString(), userId: actorId, action: "Websitecontrole mislukt", subject: "Verenigingen en artikelen", details: { code: state.websiteSync.lastError.code } });
  return state.websiteSync;
}

export function publicSportpaleisWebsiteSync(state) {
  const { sourceFingerprintIndex: _sourceFingerprintIndex, sourceScopeIndex: _sourceScopeIndex, sourceRelevanceIndex: _sourceRelevanceIndex, reviewDecisions: _reviewDecisions, ...summary } = state.websiteSync ?? createSportpaleisWebsiteSyncState();
  return structuredClone(summary);
}
