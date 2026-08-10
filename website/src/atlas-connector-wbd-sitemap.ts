import {
  ConnectorSourceError,
  sha256,
  type ConnectorAdapter,
  type ConnectorDefinition,
  type ConnectorNormalizer,
  type NormalizedSourceRecord,
  type RawConnectorRecord,
} from "./atlas-connectors.ts";

const maximumSitemapBytes = 1_000_000;
const maximumSitemapRecords = 500;

export interface WbdSitemapConnectorOptions {
  sourceUrl?: string;
  contextId?: string;
  connectorId?: string;
  allowedRecordOrigins?: string[];
  fetcher?: typeof fetch;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function elementValue(xml: string, element: string): string | undefined {
  const match = xml.match(new RegExp(`<${element}>([\\s\\S]*?)</${element}>`, "i"));
  return match?.[1] ? decodeXml(match[1].trim()) : undefined;
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password) {
    throw new ConnectorSourceError({
      category: "invalid_source_data",
      code: "SOURCE_URL_CONTAINS_CREDENTIALS",
      message: "A sitemap record URL may not contain credentials.",
      retryable: false,
    });
  }
  url.hash = "";
  return url.toString();
}

function parseSitemap(
  xml: string,
  sourceUrl: string,
): RawConnectorRecord[] {
  if (!/<urlset[\s>]/i.test(xml)) {
    throw new ConnectorSourceError({
      category: "invalid_source_data",
      code: "INVALID_SITEMAP",
      message: "The source did not return a sitemap urlset.",
      retryable: false,
    });
  }

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
  if (entries.length > maximumSitemapRecords) {
    throw new ConnectorSourceError({
      category: "invalid_source_data",
      code: "SOURCE_LIMIT_EXCEEDED",
      message: `The sitemap contains more than ${maximumSitemapRecords} records.`,
      retryable: false,
    });
  }

  return entries.map((entry) => {
    const location = elementValue(entry[1] ?? "", "loc");
    if (!location) {
      throw new ConnectorSourceError({
        category: "invalid_source_data",
        code: "INVALID_SITEMAP_RECORD",
        message: "A sitemap record is missing its loc value.",
        retryable: false,
      });
    }
    const lastModified = elementValue(entry[1] ?? "", "lastmod");

    return {
      sourceRecordId: location,
      rawReference: {
        source: sourceUrl,
        locator: location,
      },
      rawPayload: {
        location,
        lastModified: lastModified ?? null,
      },
    };
  });
}

function retryAfterMilliseconds(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return undefined;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(retryAfter);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function sourceErrorFromResponse(response: Response): ConnectorSourceError {
  const retryable = response.status === 429
    || response.status === 500
    || response.status === 502
    || response.status === 503
    || response.status === 504;
  return new ConnectorSourceError({
    category: response.status === 429 ? "rate_limit" : "source_unavailable",
    code: `HTTP_${response.status}`,
    message: `The sitemap source returned HTTP ${response.status}.`,
    retryable,
    retryAfterMs: retryAfterMilliseconds(response),
  });
}

function latestSourceTimestamp(records: NormalizedSourceRecord[]): string | undefined {
  const timestamps = records
    .map((record) => record.sourceUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));
  return timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : undefined;
}

export function createWbdSitemapConnector(
  options: WbdSitemapConnectorOptions = {},
): {
  definition: ConnectorDefinition;
  adapter: ConnectorAdapter;
  normalizer: ConnectorNormalizer;
} {
  const sourceUrl = options.sourceUrl
    ?? "https://preview.webuildanddesign.nl/sitemap.xml";
  const contextId = options.contextId ?? "organization:wbd";
  const connectorId = options.connectorId ?? "wbd-preview-sitemap";
  const fetcher = options.fetcher ?? fetch;
  const approvedOrigins = new Set(
    options.allowedRecordOrigins ?? ["https://webuildanddesign.nl"],
  );
  const parsedSourceUrl = new URL(sourceUrl);
  if (parsedSourceUrl.protocol !== "https:") {
    throw new Error("The sitemap connector requires an HTTPS source.");
  }

  return {
    definition: {
      version: 1,
      connectorId,
      connectorType: "sitemap",
      contextId,
      displayName: "WBD preview-sitemap",
      authorizationMode: "none",
      syncStrategy: "snapshot_diff",
      syncFrequency: {
        mode: "daily",
        interval: 1,
        timeZone: "Europe/Amsterdam",
      },
      freshnessThresholdHours: 36,
      retryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 500,
        maximumDelayMs: 5_000,
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
          response = await fetcher(sourceUrl, {
            method: "GET",
            headers: {
              accept: "application/xml,text/xml;q=0.9",
            },
            redirect: "error",
            signal,
          });
        } catch (error) {
          throw new ConnectorSourceError({
            category: "source_unavailable",
            code: "NETWORK_ERROR",
            message: error instanceof Error
              ? error.message
              : "The sitemap source could not be reached.",
            retryable: true,
          });
        }
        if (!response.ok) throw sourceErrorFromResponse(response);
        const contentLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(contentLength) && contentLength > maximumSitemapBytes) {
          throw new ConnectorSourceError({
            category: "invalid_source_data",
            code: "SOURCE_LIMIT_EXCEEDED",
            message: `The sitemap exceeds ${maximumSitemapBytes} bytes.`,
            retryable: false,
          });
        }
        const body = await response.text();
        if (new TextEncoder().encode(body).byteLength > maximumSitemapBytes) {
          throw new ConnectorSourceError({
            category: "invalid_source_data",
            code: "SOURCE_LIMIT_EXCEEDED",
            message: `The sitemap exceeds ${maximumSitemapBytes} bytes.`,
            retryable: false,
          });
        }
        const records = parseSitemap(body, sourceUrl);
        const bodyHash = await sha256(body);
        const lastModified = response.headers.get("last-modified") ?? undefined;
        const sourceObservedAt = lastModified && !Number.isNaN(Date.parse(lastModified))
            ? new Date(lastModified).toISOString()
            : undefined;
        return {
          sourceObservedAt,
          nextCheckpoint: response.headers.get("etag") ?? `sha256:${bodyHash}`,
          rawReference: {
            source: sourceUrl,
            locator: sourceUrl,
          },
          coverage: {
            mode: "full_snapshot",
            completeness: "complete",
          },
          records,
          diagnostics: {
            responseStatus: response.status,
            contentHash: bodyHash,
            contentType: response.headers.get("content-type") ?? "unknown",
          },
        };
      },
    },
    normalizer: {
      descriptor: {
        normalizerId: "wbd-sitemap-urlset",
        normalizerVersion: "1.0.0",
        outputSchemaVersion: "wbd-sitemap-page@1",
      },
      async normalize(batch) {
        const records: NormalizedSourceRecord[] = [];
        for (const record of batch.records) {
          const rawPayload = record.rawPayload;
          if (
            !rawPayload
            || typeof rawPayload !== "object"
            || Array.isArray(rawPayload)
            || typeof rawPayload.location !== "string"
          ) {
            throw new ConnectorSourceError({
              category: "invalid_source_data",
              code: "INVALID_SITEMAP_RECORD",
              message: "A sitemap record has no usable location.",
              retryable: false,
            });
          }
          const normalizedLocation = normalizeUrl(rawPayload.location);
          const locationUrl = new URL(normalizedLocation);
          if (!approvedOrigins.has(locationUrl.origin)) {
            throw new ConnectorSourceError({
              category: "invalid_source_data",
              code: "UNEXPECTED_RECORD_ORIGIN",
              message: `The sitemap contains an unapproved origin: ${locationUrl.origin}.`,
              retryable: false,
            });
          }
          const lastModified = typeof rawPayload.lastModified === "string"
            ? rawPayload.lastModified
            : undefined;
          if (lastModified && Number.isNaN(Date.parse(lastModified))) {
            throw new ConnectorSourceError({
              category: "invalid_source_data",
              code: "INVALID_SOURCE_TIMESTAMP",
              message: `The sitemap contains an invalid lastmod for ${normalizedLocation}.`,
              retryable: false,
            });
          }
          const normalizedTimestamp = lastModified
            ? new Date(lastModified).toISOString()
            : undefined;
          records.push({
            sourceRecordId: normalizedLocation,
            sourceRecordVersion: record.sourceRecordVersion,
            sourceUpdatedAt: normalizedTimestamp,
            rawReference: {
              ...record.rawReference,
              locator: normalizedLocation,
            },
            rawContentHash: await sha256(JSON.stringify(record.rawPayload)),
            normalizedPayload: {
              url: normalizedLocation,
              lastModified: normalizedTimestamp ?? null,
            },
            normalization: this.descriptor,
          });
        }
        return {
          ...batch,
          sourceObservedAt: latestSourceTimestamp(records)
            ?? batch.sourceObservedAt,
          records,
        };
      },
    },
  };
}
