import {
  ConnectorSourceError,
  sha256,
  translateConnectorChanges,
  type AtlasObservationCandidate,
  type ConnectorDefinition,
  type ConnectorNormalizer,
  type ConnectorRecordChange,
  type ConnectorState,
  type ConnectorTranslator,
  type ConnectorAdapter,
  type JsonObject,
  type NormalizedSourceRecord,
} from "./atlas-connectors.ts";

const maximumHomepageBytes = 300_000;
const maximumMetadataLength = 1_000;
const homepageRequestTimeoutMs = 10_000;

export const WBD_HOMEPAGE_SOURCE_URL = "https://webuildanddesign.nl/";
export const WBD_HOMEPAGE_CONTEXT_ID = "organization:wbd";
export const WBD_HOMEPAGE_CONNECTOR_ID = "wbd-homepage-metadata";
export const WBD_HOMEPAGE_SCHEMA_VERSION = "wbd-homepage-metadata@1";
export const WBD_HOMEPAGE_OBSERVATION_SCHEMA_VERSION = "atlas-wbd-homepage-observation@1";

export type WbdHomepageMetadataField =
  | "title"
  | "description"
  | "openGraphTitle"
  | "openGraphDescription"
  | "canonicalUrl";

export interface WbdHomepageMetadata {
  title: string;
  description: string;
  openGraphTitle: string;
  openGraphDescription: string;
  canonicalUrl: string;
}

export interface WbdHomepageConnectorOptions {
  sourceUrl?: string;
  contextId?: string;
  connectorId?: string;
  fetcher?: typeof fetch;
  allowedSourceOrigins?: readonly string[];
  allowInsecureLocalhost?: boolean;
}

export interface WbdHomepageChangedField {
  key: WbdHomepageMetadataField;
  label: string;
  previous: string;
  current: string;
}

export interface WbdHomepageWorkspaceObservation {
  id: string;
  title: "Website gewijzigd";
  summary: string;
  mode: "live" | "demonstration";
  sourceUrl: string;
  observedAt: string;
  changedFields: readonly WbdHomepageChangedField[];
  previousSnapshotHash: string;
  currentSnapshotHash: string;
  previousChangeId: string;
  currentChangeId: string;
  evidenceStatus: "source_reported";
  interpretationStatus: "uninterpreted";
  provenance: AtlasObservationCandidate["provenance"];
}

export interface WbdHomepageObservationFeed {
  version: 1;
  sourceUrl: string;
  mode: "live" | "demonstration";
  observations: readonly WbdHomepageWorkspaceObservation[];
  metrics: {
    checks: number;
    meaningfulChanges: number;
    attentionItems: number;
    duplicateNoiseItems: number;
    technicalFailures: number;
    technicalFailuresEscalatedToAttention: 0;
  };
}

const fieldLabels: Record<WbdHomepageMetadataField, string> = {
  title: "Paginatitel",
  description: "Beschrijving",
  openGraphTitle: "Titel bij delen",
  openGraphDescription: "Beschrijving bij delen",
  canonicalUrl: "Canonieke URL",
};

const metadataFields = Object.keys(fieldLabels) as WbdHomepageMetadataField[];

function sourceError(code: string, message: string, retryable = false): ConnectorSourceError {
  return new ConnectorSourceError({
    category: retryable ? "source_unavailable" : "invalid_source_data",
    code,
    message,
    retryable,
  });
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[normalized] ?? match;
  });
}

function normalizeMetadataText(value: string, label: string): string {
  const normalized = decodeHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) throw sourceError("MISSING_HOMEPAGE_METADATA", `${label} is empty.`);
  if (normalized.length > maximumMetadataLength) {
    throw sourceError("HOMEPAGE_METADATA_LIMIT_EXCEEDED", `${label} exceeds the metadata limit.`);
  }
  return normalized;
}

function attributes(tag: string): Map<string, string> {
  const result = new Map<string, string>();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (name && value !== undefined) result.set(name, decodeHtml(value));
  }
  return result;
}

function exactlyOne(values: readonly string[], label: string): string {
  if (values.length !== 1) {
    throw sourceError(
      "AMBIGUOUS_HOMEPAGE_METADATA",
      `Expected exactly one ${label}, received ${values.length}.`,
    );
  }
  return normalizeMetadataText(values[0] ?? "", label);
}

function metaContent(head: string, attribute: "name" | "property", expected: string): string {
  const matches = [...head.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((item) => item.get(attribute)?.toLowerCase() === expected)
    .map((item) => item.get("content") ?? "");
  return exactlyOne(matches, `meta ${attribute}=${expected}`);
}

function canonicalContent(head: string): string {
  const matches = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((item) => item.get("rel")?.toLowerCase().split(/\s+/).includes("canonical"))
    .map((item) => item.get("href") ?? "");
  return exactlyOne(matches, "canonical link");
}

function normalizeSourceUrl(value: string, allowInsecureLocalhost: boolean): URL {
  const url = new URL(value);
  url.hash = "";
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(allowInsecureLocalhost && local && url.protocol === "http:")) {
    throw new Error("The homepage connector requires HTTPS, except for an explicit localhost demonstration.");
  }
  if (url.username || url.password) throw new Error("The homepage source URL may not contain credentials.");
  return url;
}

export function parseWbdHomepageMetadata(
  html: string,
  allowedCanonicalOrigins: readonly string[] = ["https://webuildanddesign.nl"],
): WbdHomepageMetadata {
  const headMatches = [...html.matchAll(/<head\b[^>]*>([\s\S]*?)<\/head>/gi)];
  if (headMatches.length !== 1) {
    throw sourceError("INVALID_HOMEPAGE_HTML", "The homepage response needs exactly one head element.");
  }
  const head = headMatches[0]?.[1] ?? "";
  const title = exactlyOne(
    [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => match[1] ?? ""),
    "document title",
  );
  const canonicalUrl = new URL(canonicalContent(head));
  canonicalUrl.hash = "";
  if (canonicalUrl.protocol !== "https:" || !allowedCanonicalOrigins.includes(canonicalUrl.origin)) {
    throw sourceError("UNEXPECTED_CANONICAL_ORIGIN", "The canonical URL has an unapproved origin.");
  }

  return {
    title,
    description: metaContent(head, "name", "description"),
    openGraphTitle: metaContent(head, "property", "og:title"),
    openGraphDescription: metaContent(head, "property", "og:description"),
    canonicalUrl: canonicalUrl.toString(),
  };
}

function responseTimestamp(response: Response): string | undefined {
  const value = response.headers.get("last-modified");
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function retryableResponse(response: Response): boolean {
  return response.status === 429 || response.status === 500 || response.status === 502
    || response.status === 503 || response.status === 504;
}

export function createWbdHomepageConnector(
  options: WbdHomepageConnectorOptions = {},
): {
  definition: ConnectorDefinition;
  adapter: ConnectorAdapter;
  normalizer: ConnectorNormalizer;
} {
  const allowInsecureLocalhost = options.allowInsecureLocalhost === true;
  const parsedSourceUrl = normalizeSourceUrl(
    options.sourceUrl ?? WBD_HOMEPAGE_SOURCE_URL,
    allowInsecureLocalhost,
  );
  const sourceUrl = parsedSourceUrl.toString();
  const contextId = options.contextId ?? WBD_HOMEPAGE_CONTEXT_ID;
  const connectorId = options.connectorId ?? WBD_HOMEPAGE_CONNECTOR_ID;
  const fetcher = options.fetcher ?? fetch;
  const allowedSourceOrigins = options.allowedSourceOrigins
    ?? [...new Set([parsedSourceUrl.origin, "https://webuildanddesign.nl"])];

  if (!allowedSourceOrigins.includes(parsedSourceUrl.origin)) {
    throw new Error("The homepage source origin is not approved.");
  }

  return {
    definition: {
      version: 1,
      connectorId,
      connectorType: "webpage-metadata",
      contextId,
      displayName: "WBD homepage metadata",
      authorizationMode: "none",
      syncStrategy: "snapshot_diff",
      syncFrequency: { mode: "manual", interval: 1, timeZone: "Europe/Amsterdam" },
      freshnessThresholdHours: 36,
      retryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 250,
        maximumDelayMs: 2_000,
        multiplier: 2,
      },
    },
    adapter: {
      async getAuthorizationStatus() {
        return "not_required";
      },
      async fetchRaw({ signal }) {
        let response: Response;
        try {
          const requestSignal = signal
            ? AbortSignal.any([signal, AbortSignal.timeout(homepageRequestTimeoutMs)])
            : AbortSignal.timeout(homepageRequestTimeoutMs);
          response = await fetcher(sourceUrl, {
            method: "GET",
            headers: { accept: "text/html" },
            redirect: "error",
            signal: requestSignal,
          });
        } catch (error) {
          throw sourceError(
            "NETWORK_ERROR",
            error instanceof Error ? error.message : "The homepage could not be reached.",
            true,
          );
        }
        if (response.redirected) throw sourceError("UNEXPECTED_REDIRECT", "The homepage response redirected.");
        if (!response.ok) {
          throw sourceError(
            `HTTP_${response.status}`,
            `The homepage returned HTTP ${response.status}.`,
            retryableResponse(response),
          );
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!/^text\/html(?:;|$)/i.test(contentType)) {
          throw sourceError("UNEXPECTED_CONTENT_TYPE", "The homepage did not return HTML.");
        }
        const contentLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(contentLength) && contentLength > maximumHomepageBytes) {
          throw sourceError("SOURCE_LIMIT_EXCEEDED", "The homepage response is too large.");
        }
        const html = await response.text();
        if (new TextEncoder().encode(html).byteLength > maximumHomepageBytes) {
          throw sourceError("SOURCE_LIMIT_EXCEEDED", "The homepage response is too large.");
        }
        const rawContentHash = await sha256(html);
        const sourceUpdatedAt = responseTimestamp(response);
        return {
          sourceObservedAt: sourceUpdatedAt,
          nextCheckpoint: response.headers.get("etag") ?? `sha256:${rawContentHash}`,
          rawReference: { source: sourceUrl, locator: sourceUrl },
          coverage: { mode: "full_snapshot", completeness: "complete" },
          records: [{
            sourceRecordId: sourceUrl,
            sourceRecordVersion: response.headers.get("etag") ?? `sha256:${rawContentHash}`,
            sourceUpdatedAt,
            rawReference: { source: sourceUrl, locator: sourceUrl },
            rawPayload: { html },
          }],
          diagnostics: {
            responseStatus: response.status,
            contentType,
            contentHash: rawContentHash,
          },
        };
      },
    },
    normalizer: {
      descriptor: {
        normalizerId: "wbd-homepage-head-metadata",
        normalizerVersion: "1.0.0",
        outputSchemaVersion: WBD_HOMEPAGE_SCHEMA_VERSION,
      },
      async normalize(batch) {
        const records: NormalizedSourceRecord[] = [];
        for (const record of batch.records) {
          const rawPayload = record.rawPayload;
          if (
            !rawPayload
            || typeof rawPayload !== "object"
            || Array.isArray(rawPayload)
            || typeof rawPayload.html !== "string"
          ) {
            throw sourceError("INVALID_HOMEPAGE_RECORD", "The homepage record has no HTML payload.");
          }
          const metadata = parseWbdHomepageMetadata(rawPayload.html, allowedSourceOrigins);
          const normalizedPayload: JsonObject = { ...metadata };
          records.push({
            sourceRecordId: record.sourceRecordId,
            sourceRecordVersion: record.sourceRecordVersion,
            sourceUpdatedAt: record.sourceUpdatedAt,
            rawReference: { ...record.rawReference },
            rawContentHash: await sha256(rawPayload.html),
            normalizedPayload,
            normalization: this.descriptor,
          });
        }
        if (records.length !== 1) {
          throw sourceError("INVALID_HOMEPAGE_RECORD_COUNT", "The homepage source must produce exactly one record.");
        }
        return { ...batch, records };
      },
    },
  };
}

function metadataFromPayload(payload: JsonObject | null, changeId: string): WbdHomepageMetadata {
  if (!payload) throw sourceError("MISSING_CHANGE_PAYLOAD", `Change ${changeId} has no metadata payload.`);
  const values = Object.fromEntries(metadataFields.map((field) => [field, payload[field]]));
  if (metadataFields.some((field) => typeof values[field] !== "string" || !values[field])) {
    throw sourceError("INVALID_CHANGE_PAYLOAD", `Change ${changeId} has incomplete metadata.`);
  }
  return values as unknown as WbdHomepageMetadata;
}

function changedMetadata(
  previous: WbdHomepageMetadata,
  current: WbdHomepageMetadata,
): WbdHomepageChangedField[] {
  return metadataFields.flatMap((key): WbdHomepageChangedField[] => (
    previous[key] === current[key]
      ? []
      : [{ key, label: fieldLabels[key], previous: previous[key], current: current[key] }]
  ));
}

export function createWbdHomepageObservationTranslator(
  history: readonly ConnectorRecordChange[],
): ConnectorTranslator {
  const changesById = new Map(history.map((change) => [change.changeId, change]));
  return {
    descriptor: {
      translatorId: "wbd-homepage-metadata-change",
      translatorVersion: "1.0.0",
      inputSchemaVersion: WBD_HOMEPAGE_SCHEMA_VERSION,
      outputSchemaVersion: WBD_HOMEPAGE_OBSERVATION_SCHEMA_VERSION,
    },
    async translate(change) {
      if (change.changeType !== "changed") return [];
      const previous = change.previousChangeId
        ? changesById.get(change.previousChangeId)
        : undefined;
      if (!previous) {
        throw sourceError("MISSING_PREVIOUS_CHANGE", `Change ${change.changeId} has no previous state.`);
      }
      const previousMetadata = metadataFromPayload(previous.normalizedPayload, previous.changeId);
      const currentMetadata = metadataFromPayload(change.normalizedPayload, change.changeId);
      const fields = changedMetadata(previousMetadata, currentMetadata);
      if (fields.length === 0) return [];
      return [{
        observationType: "wbd-homepage-metadata-changed",
        statement: "De publieke WBD-homepage heeft gewijzigde positioneringsmetadata.",
        evidenceStatus: "source_reported",
        payload: {
          sourceUrl: change.rawReference.locator,
          observedAt: change.synchronizedAt,
          previousChangeId: previous.changeId,
          currentChangeId: change.changeId,
          previousSnapshotHash: previous.normalizedContentHash,
          currentSnapshotHash: change.normalizedContentHash,
          changedFields: fields.map((field) => ({ ...field })),
          previous: { ...previousMetadata },
          current: { ...currentMetadata },
        },
      }];
    },
  };
}

function isLiveSource(sourceUrl: string): boolean {
  try {
    return new URL(sourceUrl).origin === "https://webuildanddesign.nl";
  } catch {
    return false;
  }
}

function workspaceObservation(candidate: AtlasObservationCandidate): WbdHomepageWorkspaceObservation {
  const payload = candidate.payload;
  if (!payload || typeof payload.sourceUrl !== "string" || typeof payload.observedAt !== "string") {
    throw sourceError("INVALID_OBSERVATION_PAYLOAD", "The observation candidate has no source context.");
  }
  const changedFields = payload.changedFields;
  if (!Array.isArray(changedFields)) {
    throw sourceError("INVALID_OBSERVATION_PAYLOAD", "The observation candidate has no changed fields.");
  }
  const parsedFields = changedFields.map((field): WbdHomepageChangedField => {
    if (
      !field
      || typeof field !== "object"
      || Array.isArray(field)
      || typeof field.key !== "string"
      || !metadataFields.includes(field.key as WbdHomepageMetadataField)
      || typeof field.label !== "string"
      || typeof field.previous !== "string"
      || typeof field.current !== "string"
    ) {
      throw sourceError("INVALID_OBSERVATION_PAYLOAD", "The observation contains an invalid changed field.");
    }
    return {
      key: field.key as WbdHomepageMetadataField,
      label: field.label,
      previous: field.previous,
      current: field.current,
    };
  });
  for (const key of [
    "previousSnapshotHash",
    "currentSnapshotHash",
    "previousChangeId",
    "currentChangeId",
  ] as const) {
    if (typeof payload[key] !== "string" || !payload[key]) {
      throw sourceError("INVALID_OBSERVATION_PAYLOAD", `The observation is missing ${key}.`);
    }
  }
  const mode = isLiveSource(payload.sourceUrl) ? "live" : "demonstration";
  return {
    id: candidate.observationId,
    title: "Website gewijzigd",
    summary: mode === "live"
      ? `Atlas zag ${parsedFields.length} inhoudelijke wijziging${parsedFields.length === 1 ? "" : "en"} in de publieke homepage-metadata.`
      : `Gecontroleerde demonstratie met ${parsedFields.length} inhoudelijke metadatawijziging${parsedFields.length === 1 ? "" : "en"}.`,
    mode,
    sourceUrl: payload.sourceUrl,
    observedAt: payload.observedAt,
    changedFields: parsedFields,
    previousSnapshotHash: payload.previousSnapshotHash as string,
    currentSnapshotHash: payload.currentSnapshotHash as string,
    previousChangeId: payload.previousChangeId as string,
    currentChangeId: payload.currentChangeId as string,
    evidenceStatus: candidate.evidenceStatus,
    interpretationStatus: candidate.interpretationStatus,
    provenance: { ...candidate.provenance },
  };
}

export function emptyWbdHomepageObservationFeed(
  sourceUrl = WBD_HOMEPAGE_SOURCE_URL,
): WbdHomepageObservationFeed {
  return {
    version: 1,
    sourceUrl,
    mode: isLiveSource(sourceUrl) ? "live" : "demonstration",
    observations: [],
    metrics: {
      checks: 0,
      meaningfulChanges: 0,
      attentionItems: 0,
      duplicateNoiseItems: 0,
      technicalFailures: 0,
      technicalFailuresEscalatedToAttention: 0,
    },
  };
}

export async function projectWbdHomepageObservationFeed(
  state: ConnectorState | null,
  sourceUrl = WBD_HOMEPAGE_SOURCE_URL,
): Promise<WbdHomepageObservationFeed> {
  if (!state) return emptyWbdHomepageObservationFeed(sourceUrl);
  if (state.contextId !== WBD_HOMEPAGE_CONTEXT_ID && !state.contextId.endsWith(":wbd-demo")) {
    throw new Error("The homepage observation state belongs to another context.");
  }
  const changed = state.recordChanges.filter((change) => change.changeType === "changed");
  const translator = createWbdHomepageObservationTranslator(state.recordChanges);
  const candidates = (await Promise.all(changed.map((change) => (
    translateConnectorChanges(translator, [change], change.synchronizedAt)
  )))).flat();
  const uniqueCandidates = new Map(candidates.map((candidate) => [candidate.observationId, candidate]));
  const observations = [...uniqueCandidates.values()]
    .map(workspaceObservation)
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  const resolvedSourceUrl = state.records[0]?.rawReference.locator
    ?? state.recordChanges.at(-1)?.rawReference.locator
    ?? sourceUrl;

  return {
    version: 1,
    sourceUrl: resolvedSourceUrl,
    mode: isLiveSource(resolvedSourceUrl) ? "live" : "demonstration",
    observations,
    metrics: {
      checks: state.syncHistory.length,
      meaningfulChanges: changed.length,
      attentionItems: observations.length,
      duplicateNoiseItems: candidates.length - uniqueCandidates.size,
      technicalFailures: state.syncHistory.filter((run) => run.status === "failed").length,
      technicalFailuresEscalatedToAttention: 0,
    },
  };
}
