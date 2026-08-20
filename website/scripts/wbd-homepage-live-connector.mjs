import { createHash, randomUUID } from "node:crypto";

export const WBD_HOMEPAGE_CONNECTOR_ID = "wbd-homepage-metadata";
export const WBD_HOMEPAGE_SOURCE_URL = "https://webuildanddesign.nl/";
const MAXIMUM_BYTES = 512 * 1024;
const METADATA_FIELDS = ["title", "description", "openGraphTitle", "openGraphDescription", "canonicalUrl"];
const FIELD_LABELS = { title: "Paginatitel", description: "Zoekbeschrijving", openGraphTitle: "Titel bij delen", openGraphDescription: "Beschrijving bij delen", canonicalUrl: "Canonieke URL" };

const hash = (value) => createHash("sha256").update(value).digest("hex");
const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function decodeHtml(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith("#")) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    return named[normalized] ?? match;
  });
}

function normalizeText(value, label) {
  const normalized = decodeHtml(value).replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  if (!normalized || normalized.length > 2_000) throw Object.assign(new Error(`${label} ontbreekt of is te lang.`), { code: "INVALID_SOURCE_DATA", retryable: false });
  return normalized;
}

function attributes(tag) {
  const result = new Map();
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu)) result.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? ""));
  return result;
}

function exactlyOne(values, label) {
  if (values.length !== 1) throw Object.assign(new Error(`Verwacht exact één ${label}; ontvangen: ${values.length}.`), { code: "AMBIGUOUS_SOURCE_DATA", retryable: false });
  return normalizeText(values[0], label);
}

export function parseWbdHomepageMetadata(html, allowedCanonicalOrigins = ["https://webuildanddesign.nl"]) {
  const heads = [...String(html).matchAll(/<head\b[^>]*>([\s\S]*?)<\/head>/giu)];
  if (heads.length !== 1) throw Object.assign(new Error("Homepage bevat niet exact één head-element."), { code: "INVALID_SOURCE_DATA", retryable: false });
  const head = heads[0][1];
  const meta = (attribute, expected) => exactlyOne([...head.matchAll(/<meta\b[^>]*>/giu)].map((match) => attributes(match[0])).filter((item) => item.get(attribute)?.toLowerCase() === expected).map((item) => item.get("content") ?? ""), `${attribute}=${expected}`);
  const canonicalRaw = exactlyOne([...head.matchAll(/<link\b[^>]*>/giu)].map((match) => attributes(match[0])).filter((item) => item.get("rel")?.toLowerCase().split(/\s+/u).includes("canonical")).map((item) => item.get("href") ?? ""), "canonical link");
  const canonical = new URL(canonicalRaw);
  canonical.hash = "";
  if (canonical.protocol !== "https:" || !allowedCanonicalOrigins.includes(canonical.origin)) throw Object.assign(new Error("Canonieke bronorigin is niet toegestaan."), { code: "UNEXPECTED_CANONICAL_ORIGIN", retryable: false });
  return {
    title: exactlyOne([...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/giu)].map((match) => match[1]), "document title"),
    description: meta("name", "description"), openGraphTitle: meta("property", "og:title"), openGraphDescription: meta("property", "og:description"), canonicalUrl: canonical.toString(),
  };
}

function sourceUrl(value, allowInsecureLocalhost) {
  const parsed = new URL(value);
  parsed.hash = "";
  const local = new Set(["127.0.0.1", "localhost"]).has(parsed.hostname);
  if (parsed.username || parsed.password || (parsed.protocol !== "https:" && !(allowInsecureLocalhost && local && parsed.protocol === "http:"))) throw new Error("Homepage-connector vereist HTTPS zonder credentials.");
  return parsed;
}

function changedFields(previous, current) {
  if (!previous) return [];
  return METADATA_FIELDS.flatMap((key) => previous[key] === current[key] ? [] : [{ key, label: FIELD_LABELS[key], previous: previous[key], current: current[key] }]);
}

function legacyPrevious(previous) {
  if (!previous) return null;
  if (previous.normalized && previous.normalizedHash) return previous;
  const record = previous.records?.[0];
  if (!record?.normalizedPayload) return null;
  return {
    normalized: record.normalizedPayload,
    normalizedHash: record.normalizedContentHash ?? hash(stableJson(record.normalizedPayload)),
    rawHash: record.rawContentHash,
    fetchedAt: record.lastSeenAt ?? previous.lastSyncSucceededAt,
    observedAt: previous.sourceFreshness?.sourceObservedAt ?? record.lastSeenAt ?? previous.lastSyncSucceededAt,
    lastSuccessfulAt: previous.lastSyncSucceededAt,
    status: "SUCCEEDED",
  };
}

function retryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchAttempt(fetcher, url, signal) {
  const response = await fetcher(url, { method: "GET", headers: { Accept: "text/html" }, redirect: "error", signal });
  if (response.redirected) throw Object.assign(new Error("Bron stuurde een onverwachte redirect."), { code: "UNEXPECTED_REDIRECT", retryable: false });
  if (!response.ok) throw Object.assign(new Error(`Bron gaf HTTP ${response.status}.`), { code: `HTTP_${response.status}`, retryable: retryableStatus(response.status) });
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^text\/html(?:;|$)/iu.test(contentType)) throw Object.assign(new Error("Bron gaf geen HTML."), { code: "UNEXPECTED_CONTENT_TYPE", retryable: false });
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAXIMUM_BYTES) throw Object.assign(new Error("Bronresponse is te groot."), { code: "SOURCE_LIMIT_EXCEEDED", retryable: false });
  const html = await response.text();
  if (Buffer.byteLength(html) > MAXIMUM_BYTES) throw Object.assign(new Error("Bronresponse is te groot."), { code: "SOURCE_LIMIT_EXCEEDED", retryable: false });
  return { response, html };
}

export async function fetchWbdHomepageSnapshot({
  previousState = null,
  fetcher = fetch,
  source = WBD_HOMEPAGE_SOURCE_URL,
  organizationId = "we-build-and-design",
  connectorId = WBD_HOMEPAGE_CONNECTOR_ID,
  allowInsecureLocalhost = false,
  now = () => new Date(),
  sleeper = sleep,
} = {}) {
  const parsed = sourceUrl(source, allowInsecureLocalhost);
  const previous = legacyPrevious(previousState);
  const startedAt = now().toISOString();
  let attemptCount = 0;
  try {
    let fetched;
    while (!fetched) {
      attemptCount += 1;
      try {
        fetched = await fetchAttempt(fetcher, parsed.toString(), AbortSignal.timeout(10_000));
      } catch (cause) {
        const retryable = cause?.retryable !== false;
        if (!retryable || attemptCount >= 3) throw cause;
        await sleeper(Math.min(250 * (2 ** (attemptCount - 1)), 2_000));
      }
    }
    const fetchedAt = now().toISOString();
    const normalized = parseWbdHomepageMetadata(fetched.html, [...new Set([parsed.origin, "https://webuildanddesign.nl"])]);
    const normalizedHash = hash(stableJson(normalized));
    const rawHash = hash(fetched.html);
    const lastModified = fetched.response.headers.get("last-modified");
    const observedAt = lastModified && Number.isFinite(Date.parse(lastModified)) ? new Date(lastModified).toISOString() : fetchedAt;
    return {
      schemaVersion: 1, connectorId, connectorType: "webpage-metadata", organizationId, sourceUrl: parsed.toString(), sourceIdentity: parsed.toString(),
      authorizationMode: "NONE", authorizationStatus: "NOT_REQUIRED", enabled: true, status: "SUCCEEDED", health: "HEALTHY", freshness: "LIVE",
      fetchedAt, observedAt, lastAttemptAt: startedAt, lastSuccessfulAt: fetchedAt, consecutiveFailures: 0, attemptCount,
      rawHash, normalizedHash, normalized, changedFields: previous && previous.normalizedHash !== normalizedHash ? changedFields(previous.normalized, normalized) : [],
      previousNormalizedHash: previous?.normalizedHash ?? null,
      previousEvidenceId: previous?.normalizedHash ? `evidence-${connectorId}-${previous.normalizedHash.slice(0, 24)}` : null,
      provenance: { connectorId, connectorType: "webpage-metadata", syncRunId: `${connectorId}:${startedAt}:${randomUUID()}`, source: parsed.toString(), normalizerId: "wbd-homepage-head-metadata", normalizerVersion: "2.0.0", normalizedSchemaVersion: "wbd-homepage-metadata-v1", fetchedVia: "SERVER_SIDE_HTTPS" },
      history: [...(previousState?.history ?? []), { status: "SUCCEEDED", startedAt, completedAt: fetchedAt, attemptCount, normalizedHash }].slice(-100),
      error: null,
    };
  } catch (cause) {
    const completedAt = now().toISOString();
    return {
      ...(previous ?? {}), schemaVersion: 1, connectorId, connectorType: "webpage-metadata", organizationId, sourceUrl: parsed.toString(), sourceIdentity: parsed.toString(),
      authorizationMode: "NONE", authorizationStatus: "NOT_REQUIRED", enabled: true, status: "FAILED", health: previous ? "DEGRADED" : "FAILED", freshness: previous ? "STALE" : "UNAVAILABLE",
      lastAttemptAt: startedAt, lastSuccessfulAt: previous?.lastSuccessfulAt ?? null, consecutiveFailures: (previousState?.consecutiveFailures ?? 0) + 1, attemptCount,
      changedFields: [], error: { code: String(cause?.code ?? "SOURCE_UNAVAILABLE"), category: cause?.retryable === false ? "INVALID_SOURCE_DATA" : "SOURCE_UNAVAILABLE", retryable: cause?.retryable !== false, occurredAt: completedAt, message: "De publieke bron kon niet veilig worden ververst." },
      history: [...(previousState?.history ?? []), { status: "FAILED", startedAt, completedAt, attemptCount, errorCode: String(cause?.code ?? "SOURCE_UNAVAILABLE") }].slice(-100),
    };
  }
}

export class WbdHomepageConnectorScheduler {
  constructor({ readPrevious, persistSnapshot, intervalMs = 15 * 60 * 1_000, connectorOptions = {}, onEvent = () => {} }) {
    this.readPrevious = readPrevious;
    this.persistSnapshot = persistSnapshot;
    this.intervalMs = intervalMs;
    this.connectorOptions = connectorOptions;
    this.onEvent = onEvent;
    this.timer = null;
    this.active = null;
  }

  async refresh() {
    if (this.active) return this.active;
    this.active = (async () => {
      const snapshot = await fetchWbdHomepageSnapshot({ ...this.connectorOptions, previousState: await this.readPrevious() });
      await this.persistSnapshot(snapshot);
      this.onEvent({ event: snapshot.status === "SUCCEEDED" ? "atlas-connector-refresh-succeeded" : "atlas-connector-refresh-failed", connectorId: snapshot.connectorId, status: snapshot.status, failureCount: snapshot.consecutiveFailures, lastSuccessfulAt: snapshot.lastSuccessfulAt });
      return snapshot;
    })().finally(() => { this.active = null; });
    return this.active;
  }

  start() {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
