import { createHash, randomBytes } from "node:crypto";

export const SPORTPALEIS_WEBSITE_SYNC_SOURCE = Object.freeze({
  sitemapUrl: "https://www.sportpaleis.nl/sitemap/categories.xml?culture=nl-NL",
  associationPath: "/verenigingen/",
  cadence: "NIGHTLY_03_00_EUROPE_AMSTERDAM",
});

export function createSportpaleisWebsiteSyncState() {
  return {
    enabled: false,
    mode: "STAGE_ONLY",
    cadence: SPORTPALEIS_WEBSITE_SYNC_SOURCE.cadence,
    source: { ...SPORTPALEIS_WEBSITE_SYNC_SOURCE },
    status: "NOT_RUN",
    lastAttemptAt: null,
    lastSuccessfulSyncAt: null,
    nextRunAt: null,
    sourceFingerprint: null,
    sourceFingerprintIndex: {},
    counts: { associations: 0, articles: 0, new: 0, changed: 0, attention: 0 },
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

async function fetchText(fetcher, url) {
  const response = await fetcher(url, {
    headers: { accept: "text/html,application/xml;q=0.9", "user-agent": "WBD-Sportpaleis-Sync/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
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
    async snapshot(now = new Date()) {
      const sitemap = await fetchText(fetcher, SPORTPALEIS_WEBSITE_SYNC_SOURCE.sitemapUrl);
      const entries = parseSportpaleisAssociationSitemap(sitemap);
      const associations = await mapConcurrent(entries, 3, async (entry) => {
        const articles = new Map();
        let associationName = "";
        let declaredCount = 0;
        for (let page = 1; page <= 30; page += 1) {
          const pageUrl = page === 1 ? entry.url : `${entry.url}${entry.url.includes("?") ? "&" : "?"}p=${page}`;
          const parsed = parseSportpaleisAssociationPage(await fetchText(fetcher, pageUrl), entry.url);
          associationName ||= parsed.associationName;
          declaredCount = Math.max(declaredCount, parsed.declaredCount);
          const before = articles.size;
          for (const article of parsed.articles) articles.set(article.sourceIdentifier, article);
          if (articles.size >= declaredCount || parsed.articles.length < 24) break;
          if (articles.size === before) throw Object.assign(new Error(`Paginatie voor ${entry.url} levert geen nieuwe artikelen.`), { code: "WEBSITE_SYNC_PAGINATION_STALLED" });
        }
        if (declaredCount > 0 && articles.size !== declaredCount) throw Object.assign(new Error(`Verenigingspagina ${entry.url} meldt ${declaredCount} artikelen, maar ${articles.size} zijn volledig gelezen.`), { code: "WEBSITE_SYNC_INCOMPLETE" });
        const result = { sourceIdentifier: entry.url, name: associationName, url: entry.url, lastModified: entry.lastModified, articles: [...articles.values()].sort((left, right) => left.sourceIdentifier.localeCompare(right.sourceIdentifier)) };
        return { ...result, fingerprint: sha256(JSON.stringify(result)) };
      });
      const snapshot = { source: SPORTPALEIS_WEBSITE_SYNC_SOURCE.sitemapUrl, detectedAt: now.toISOString(), associations };
      return { ...snapshot, fingerprint: sha256(JSON.stringify(snapshot.associations)) };
    },
  };
}

function currentArticleSourceId(article) {
  const articleNumber = String(article.articleNumber ?? "").trim();
  if (articleNumber) return articleNumber;
  return String(article.id ?? "").match(/^sp-live-(.+)$/u)?.[1] ?? null;
}

export function compareSportpaleisWebsiteSnapshot(state, snapshot) {
  const previousIndex = state.websiteSync?.sourceFingerprintIndex ?? {};
  const currentArticles = new Map((state.articles ?? []).map((article) => [currentArticleSourceId(article), article]).filter(([id]) => id));
  const currentAssociations = new Map((state.associations ?? []).map((association) => [normalized(association.name), association]));
  const nextIndex = {};
  const changes = [];

  for (const association of snapshot.associations) {
    const associationKey = `association:${association.sourceIdentifier}`;
    nextIndex[associationKey] = association.fingerprint;
    if (!currentAssociations.has(normalized(association.name))) changes.push({
      id: `sync-change-${sha256(associationKey).slice(0, 16)}`,
      kind: "NEW_ASSOCIATION", sourceIdentifier: association.sourceIdentifier,
      label: association.name, status: "PENDING_REVIEW",
      explanation: "Nieuwe vereniging op de website. Workspace heeft niets automatisch overschreven.",
      nextBestAction: "Controleer de vereniging",
    });
    for (const article of association.articles) {
      const key = `article:${article.sourceIdentifier}`;
      nextIndex[key] = article.fingerprint;
      const current = currentArticles.get(article.sourceIdentifier);
      if (!current) changes.push({
        id: `sync-change-${sha256(key).slice(0, 16)}`,
        kind: "NEW_ARTICLE", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        explanation: "Nieuw artikel op de website. Productie-instellingen zijn nog niet gekoppeld.",
        nextBestAction: "Controleer het artikel",
      });
      else if (previousIndex[key] && previousIndex[key] !== article.fingerprint) changes.push({
        id: `sync-change-${sha256(`${key}:${article.fingerprint}`).slice(0, 16)}`,
        kind: "SOURCE_ARTICLE_CHANGED", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        explanation: "Het websiteartikel is gewijzigd. Lokale productie-instellingen blijven behouden.",
        nextBestAction: "Bekijk de wijziging",
      });
      else if (current.name !== article.name || current.catalogProvenance?.url !== article.url) changes.push({
        id: `sync-change-${sha256(`${key}:workspace-difference`).slice(0, 16)}`,
        kind: "WORKSPACE_SOURCE_DIFFERENCE", sourceIdentifier: article.sourceIdentifier,
        label: article.name, association: association.name, status: "PENDING_REVIEW",
        explanation: "Website en Workspace tonen verschillende catalogusgegevens. Productie-instellingen blijven behouden.",
        nextBestAction: "Vergelijk de brongegevens",
      });
    }
  }

  for (const key of Object.keys(previousIndex)) if (!nextIndex[key]) changes.push({
    id: `sync-change-${sha256(`${key}:missing`).slice(0, 16)}`,
    kind: "MISSING_FROM_SOURCE", sourceIdentifier: key.split(":").slice(1).join(":"),
    label: "Niet meer gevonden op de website", status: "PENDING_REVIEW",
    explanation: "De eerdere bronvermelding ontbreekt. Workspace verwijdert niets automatisch.",
    nextBestAction: "Controleer de bron",
  });
  return { changes: changes.slice(0, 500), nextIndex };
}

function nextNightlyRun(now) {
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  next.setUTCHours(1, 0, 0, 0);
  return next.toISOString();
}

export function stageSportpaleisWebsiteSync(state, snapshot, { actorId = "system:website-sync", trigger = "manual", now = new Date(), enabled = state.websiteSync?.enabled === true } = {}) {
  const { changes, nextIndex } = compareSportpaleisWebsiteSnapshot(state, snapshot);
  const newCount = changes.filter(({ kind }) => kind === "NEW_ASSOCIATION" || kind === "NEW_ARTICLE").length;
  const changedCount = changes.filter(({ kind }) => kind === "SOURCE_ARTICLE_CHANGED" || kind === "WORKSPACE_SOURCE_DIFFERENCE").length;
  const articleCount = snapshot.associations.reduce((sum, association) => sum + association.articles.length, 0);
  state.websiteSync = {
    ...(state.websiteSync ?? createSportpaleisWebsiteSyncState()),
    enabled,
    mode: "STAGE_ONLY",
    status: changes.length ? "ATTENTION" : "OK",
    lastAttemptAt: now.toISOString(),
    lastSuccessfulSyncAt: now.toISOString(),
    nextRunAt: enabled ? nextNightlyRun(now) : null,
    sourceFingerprint: snapshot.fingerprint,
    sourceFingerprintIndex: nextIndex,
    counts: { associations: snapshot.associations.length, articles: articleCount, new: newCount, changed: changedCount, attention: changes.length },
    changes,
    lastError: null,
  };
  state.audit.unshift({
    id: `audit-website-sync-${randomBytes(8).toString("hex")}`,
    at: now.toISOString(), userId: actorId, action: "Website gecontroleerd",
    subject: "Verenigingen en artikelen",
    details: { trigger, mode: "STAGE_ONLY", associations: snapshot.associations.length, articles: articleCount, attention: changes.length },
  });
  return state.websiteSync;
}

export function failSportpaleisWebsiteSync(state, error, { actorId = "system:website-sync", now = new Date() } = {}) {
  const current = state.websiteSync ?? createSportpaleisWebsiteSyncState();
  state.websiteSync = {
    ...current,
    status: "ERROR",
    lastAttemptAt: now.toISOString(),
    lastError: { code: String(error?.code ?? "WEBSITE_SYNC_FAILED"), message: "De websitecontrole kon niet volledig worden uitgevoerd. Bestaande Workspace-data is niet gewijzigd." },
  };
  state.audit.unshift({ id: `audit-website-sync-${randomBytes(8).toString("hex")}`, at: now.toISOString(), userId: actorId, action: "Websitecontrole mislukt", subject: "Verenigingen en artikelen", details: { code: state.websiteSync.lastError.code } });
  return state.websiteSync;
}

export function publicSportpaleisWebsiteSync(state) {
  const { sourceFingerprintIndex: _sourceFingerprintIndex, ...summary } = state.websiteSync ?? createSportpaleisWebsiteSyncState();
  return structuredClone(summary);
}
