# Sportpaleis PDF worker preparation

Local module handoff only. Not integrated, not deployed, not production-approved. OWNER_ACCEPTANCE: NOT_RUN. Central integration/release owner: task `01a080d3-f5ff-7900-9f00-17a9c08afb6f`.

Development base: `0e02b3cea7b5aac71449d76ee57a5bccebb841b7`. Central task supplied `c03d8604cb1ce232c73a34f8996d0ad193f17024` as its authoritative integration base; this run did not contact LIVE to verify it. Deliver these additions as a standalone commit, not a merge of the older development branch.

## Files and contract

- `website/src/sportpaleis/webshop-pdf-evidence.mjs`: `extractPdfEvidence({bytes, attachmentSha256, source:{tenantId,mailboxId,messageId,attachmentId}, limits?, signal?, filename?, mimeType?})`.
- `website/src/sportpaleis/webshop-pdf-worker-pool.mjs`: internal process admission, deadlines and cleanup. The injected factory is for trusted internal tests only, never caller-controlled input.
- `website/src/sportpaleis/webshop-pdf-worker.mjs`: one-document process, streamed embedded text extraction with page coordinates; no persistence.
- `website/tests/sportpaleis-webshop-pdf-evidence.test.mjs` and its dedicated `fixtures/sportpaleis/webshop-pdf-fault-worker.mjs`.

The caller must authenticate and authorize the source context. This module requires tenantId `sportpaleis`; it does not establish that a supplied mailbox or attachment belongs to the caller. Raw message/provider/folder/UID/recipient evidence remains the responsibility of the future authenticated integration adapter. No mailbox, auth, runtime, shared shell, build-output or existing parser file was modified.

Success returns `EVIDENCE_READY`, with version, copied source, SHA-256, deterministic source-bound extractionId, raw text and positioned items by page. Confidence is `UNASSESSED`, normalization `NONE`, completeness `TEXT_LAYER_ONLY_UNVERIFIED`. This is evidence availability, not a reliable order or complete document extraction verdict. Font names are PDF text-layer references, never inferred production fonts. Error returns `QUARANTINED`, `evidence:null`, a bounded error code and no proposals. Both success and failure have `proposals:[]`. The caller must persist quarantine; this module creates no quarantine files or datastore records.

No document bytes or metadata are sent to a provider, written to disk, logged or inherited through environment credentials. The worker uses the existing pinned pdfjs/canvas dependencies. Hash mismatch, invalid source, wrong MIME/extension and oversize inputs fail before process admission. Input and context are snapshotted before asynchronous work.

## Prospective limits retained

8 MiB/document; 500 pages; 1,000,000 UTF-16 text code units including the separator appended for each item; 100,000 items. Limits may only be lowered by the caller. Two child processes; 100 queued jobs; additional 64 MiB admitted input-buffer cap to avoid queuing 800 MiB of maximum-sized PDFs. Deadline 30 seconds including queue time; heartbeat every 5 seconds, stale after 15 seconds. A slot is released after process `close`, not merely after a result or kill request. Stdout/stderr are discarded. Abort and deadline discard partial results.

Memory: V8 heap setting 256 MiB and cooperative RSS checks against 512 MiB. Native/ArrayBuffer memory is not governed by the V8 heap limit. RSS can overshoot while the worker event loop is blocked; this is NOT a hard RSS cap. Node filesystem permissions narrow ordinary JS reads to the module directory and dependencies and deny ordinary JS writes/spawn by default, but native canvas requires `--allow-addons`. These settings are NOT an OS sandbox or a verified network prohibition. Independent OS process-resource/network controls remain required before handling untrusted production documents.

## Executed local validation

Node v24.18.0; dependencies installed using the existing lockfile without running package install scripts. Command in `website`:

```
node --test tests/sportpaleis-webshop-pdf-evidence.test.mjs tests/sportpaleis-real-webshop-pdf-parser-recovery.test.mjs tests/sportpaleis-production-worker-boundary.test.mjs
```

Result: 20 tests PASS, 0 failures, 0 skips, 0 todos; reported duration 8938.8079 ms. Eleven new tests and nine existing adjacent regressions. This is not the full repository suite.

New coverage: real subprocess extraction from valid synthetic PDF bytes; multiple pages and coordinates; stable replay and renamed filename; isolated source identities; hash/type/tenant/size checks; encrypted/corrupt/text-free/mixed documents; tighter page/text/item limits and actual 501-page rejection; initial RSS guard and process deadline; pre/during abort and caller mutation; process crash, malformed/empty-success worker protocol and blocked event-loop termination; parent responsiveness; two-process/100-queue admission; 64 MiB input admission and recovery; malformed abort handles without leftover timers. Pool capacity tests use an explicit internal process fixture; parser tests use real child processes and real pdfjs. No production HTTP/UI proof is claimed.

The first real-process tests failed because pdfjs could not initialize DOMMatrix with the native addon disabled. Enabling the existing canvas addon resolved those failures; the consequent sandbox limitation is explicit above. Independent static challenger found abort-handle and worker-response validation defects; both were corrected and covered by regressions. Final read-only re-review found no further blocker within local preparation scope. The challenger did not independently rerun the test command.

## Outstanding gates — not waived

OCR, scanned content with a readable header, golden historical PDF execution, per-production-value mappings, Product Truth validation, proposals, corrections/audit, durable dedupe/retry, worker-service restart orchestration, independently enforced RSS/security sandbox, full-suite tests, authenticated HTTP/browser/mobile routes, performance acceptance, original business hashes, real inbound/outbound canary, Sent confirmation, backups/restores and release/deployment are NOT_RUN or unimplemented here. A text-free page fails closed as `PDF_OCR_REQUIRED`; a scan with some text remains explicitly unverified text-layer evidence.

Do not connect this preparation module directly to automatic order creation, or enable it for untrusted production intake until the remaining isolation and end-to-end gates are met. PDF work is not a dependency for the central menu/mail/canary release. The definitive integration schema remains pending from its owner.
