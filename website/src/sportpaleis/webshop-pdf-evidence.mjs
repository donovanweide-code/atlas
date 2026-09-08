import { createHash } from "node:crypto";
import { createPdfWorkerPool } from "./webshop-pdf-worker-pool.mjs";

export const PDF_EVIDENCE_VERSION = "SPORTPALEIS_PDF_EVIDENCE_V1";
export const PDF_EVIDENCE_LIMITS = Object.freeze({
  maxBytes: 8 * 1024 * 1024, maxPages: 500, maxTextChars: 1_000_000,
  maxTextItems: 100_000, timeoutMs: 30_000, maxRssBytes: 512 * 1024 * 1024,
});
const pool = createPdfWorkerPool();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const identityKeys = ["tenantId", "mailboxId", "messageId", "attachmentId"];
const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f]/u.test(value);

export function pdfEvidenceWorkerStats() { return pool.stats(); }

// This API binds evidence to supplied context; its caller must authenticate that context.
// It deliberately performs no persistence, order creation, provider calls or OCR guesses.
export async function extractPdfEvidence(input = {}) {
  const quarantine = (code, source = null, attachmentSha256 = null) => ({
    version: PDF_EVIDENCE_VERSION, status: "QUARANTINED", evidence: null, proposals: [],
    quarantine: { code }, source, attachmentSha256,
  });
  if (!input?.source || !identityKeys.every((key) => validId(input.source[key])) || input.source.tenantId !== "sportpaleis") return quarantine("PDF_SOURCE_INVALID");
  const source = Object.fromEntries(identityKeys.map((key) => [key, input.source[key]]));
  const limits = { ...PDF_EVIDENCE_LIMITS };
  if (input.limits !== undefined && (!input.limits || typeof input.limits !== "object" || Array.isArray(input.limits))) return quarantine("PDF_LIMITS_INVALID", source);
  for (const [key, value] of Object.entries(input.limits ?? {})) {
    if (!Object.hasOwn(PDF_EVIDENCE_LIMITS, key) || !Number.isSafeInteger(value) || value < 1 || value > PDF_EVIDENCE_LIMITS[key]) return quarantine("PDF_LIMITS_INVALID", source);
    limits[key] = value;
  }
  if (!(input.bytes instanceof Uint8Array) || input.bytes.buffer instanceof SharedArrayBuffer) return quarantine("PDF_BYTES_INVALID", source);
  if (!input.bytes.byteLength) return quarantine("PDF_EMPTY", source);
  if (input.bytes.byteLength > limits.maxBytes) return quarantine("PDF_SIZE_LIMIT", source);
  // Snapshot before yielding: the caller cannot swap bytes, IDs or limits in flight.
  const bytes = Buffer.from(input.bytes);
  const attachmentSha256 = digest(bytes);
  if (!/^[a-f0-9]{64}$/u.test(input.attachmentSha256 ?? "") || attachmentSha256 !== input.attachmentSha256) return quarantine("PDF_HASH_MISMATCH", source);
  if (input.mimeType !== undefined && input.mimeType !== "application/pdf") return quarantine("PDF_TYPE_INVALID", source, attachmentSha256);
  if (input.filename !== undefined && (typeof input.filename !== "string" || !/\.pdf$/iu.test(input.filename))) return quarantine("PDF_TYPE_INVALID", source, attachmentSha256);
  if (!bytes.subarray(0, 8).toString("ascii").match(/^%PDF-[12]\.\d/u)) return quarantine("PDF_TYPE_INVALID", source, attachmentSha256);
  if (input.signal !== undefined && !(input.signal instanceof AbortSignal)) return quarantine("PDF_SIGNAL_INVALID", source, attachmentSha256);
  const result = await pool.run({ bytes, limits }, { signal: input.signal, timeoutMs: limits.timeoutMs });
  if (!result?.ok) return quarantine(result?.code ?? "PDF_WORKER_ERROR", source, attachmentSha256);
  const extractionId = digest(JSON.stringify([PDF_EVIDENCE_VERSION, ...identityKeys.map((key) => source[key]), attachmentSha256]));
  return {
    version: PDF_EVIDENCE_VERSION, status: "EVIDENCE_READY", source, attachmentSha256,
    evidence: { extractionId, method: "PDF_EMBEDDED_TEXT", normalization: "NONE", confidence: "UNASSESSED",
      completeness: "TEXT_LAYER_ONLY_UNVERIFIED", pageCount: result.evidence.pageCount, pages: result.evidence.pages },
    proposals: [], quarantine: null,
  };
}
