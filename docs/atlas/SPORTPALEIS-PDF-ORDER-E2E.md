# PDF → canonical order → Bedrukken

## Knowledge before build

Base: ae68eb6 (including 855071b image parity and request-scoped order detail parsing).
Reuse the isolated PDF worker, positioned batch projection and its print-only evidence boundary.
Normalize catalog bindings using the same article/color/placement checks as the batch adapter.
Create orders through `createWorkspaceOrderRecord`, the transactional core of `SportpaleisPilotService.createOrder`.
Use normal authentication, CSRF, FileStore transaction, order detail projection and production validation.
The older `acceptWebshopMatch` is not reused as transport: it depends on durable imported sources and links its order in a separate transaction.

Acceptance must be atomic, source-bound and independent of actor identity. A complete webshop order is accepted or blocked; selecting a subset cannot bypass a blocked line. Store only normal order data and minimal source fingerprint/page/item references. Preview does not persist orders or source bodies.

Names already retain internal spaces in canonical validation and normalization. Tests must prove this through output, not merely inspect the input.

Later verified production changes exist on 76a7aaf (based on c03d860). This candidate must not overwrite that newer release. Reuse necessary proven truth changes if a canary reveals a blocker; release integration must preserve the newer production baseline.

## Applied boundary

`POST /api/sportpaleis/v1/webshop-intakes/pdf-order` authenticates through the normal session/CSRF/role boundary. An operator uploads the existing PDF and identifies the webshop reference. Preview reconstructs the complete source once, maps every printed item and invokes the canonical order core on disposable state. It returns the normal order projection and a review hash. Accept reconstructs server-side, checks that hash against the current normalized input and Product Truth, and invokes the same core inside the existing store transaction. The final production validator and minimal source receipt are part of that transaction.

The identity is independent of the actor. Concurrent service/store instances use the existing file lock or the runtime store's transaction. A second request adopts the existing normal order. A different source or different effective correction for an existing webshop reference is a visible conflict. Renaming identical PDF bytes does not create another order. No request can submit a subset of reconstructed articles to bypass a blocked printed line.

`normalizeWebshopPrintItem` is extracted from the existing dry-run adapter and used by both paths. No copied font, placement, sizing or color engine was introduced. Optional source-item corrections are validated, included in the review hash and recorded as differences; they do not change Product Truth. This endpoint accepts an operator-uploaded PDF. It does not claim mailbox authority or activate a connector. Existing batch SQLite overrides and dry-run receipts are unchanged; they are not automatically imported by the new upload endpoint.

The normal Webshop page now provides preview → accept → ordinary order detail. Normal Bedrukken/order editing and Productie remain the next steps. Temporary upload/preview state belongs to the current browser principal and is discarded on logout or user change; late responses cannot restore another user's preview.

Blocking fixes:
- Customer email/phone extraction uses existing positioned columns before the linear fallback, avoiding adjacent address columns.
- The normal name input no longer trims a trailing space on each keystroke. Canonical save still trims outer whitespace. Meaningful internal spaces remain through persistence and font composition.
- The isolated PDF worker waits for its IPC result to flush before disconnect. Concurrent real full-source parses exposed truncated responses before this fix.

## Existing production dependencies reused

The executable production changes from `0e02b3c..76a7aaf` are preserved verbatim in the foundation, article truth, managed-font production, number sources, semantic groups/types, production assets, Workspace data and open-color UI, together with their updated tests. They include the already-proven article-specific number source/output multiplicity, native font number spacing and Pioneers name width. No reconciliation script, LIVE data repair, Teamwear surface, supplier connector or mail release code was copied or executed.

## Proven canary

`1-012653-order.pdf` (138 pages), SHA256 `411f0dab404eae3d0a394b2076639a378bd81e3bb55430ae78675d795f84b7d2`.

Page 122 → webshop `2635358683`, 26-08-2026 → canonical `SP-2026-0106` in isolated persistent review storage:

| Article | Size | Quantity | Personalization | Canonical production |
| --- | --- | ---: | --- | --- |
| 116597, FC Almere Wedstrijdshirt | XL | 1 | backNumber 88, SENIOR | existing exact managed-font source; VALID |
| 141521, FC Almere short | L | 1 | shortsNumber 88 | existing exact managed-font source; VALID |

Three unprinted context items stay outside the normal production order. The existing full orderdetail still shows all five items and its same three images/two placeholders. All source-item IDs, canonical input hash, normal item IDs, production-line IDs and exact font identities are in `SPORTPALEIS-PDF-ORDER-E2E-PROOF.json`.

The ordinary Workspace detail says “Klaar om te produceren”. In the existing Productie view, “Bekijk wat meegaat” shows this order selected in WIT, with two `88 × 1` applications. The nonpersistent existing production builder produces 12 closed contours. It does not create a production job, reserve an output file or start hardware.

Separate disposable, real-source name cases prove DE VRIES (Pioneers article 138505) and VAN DER MEER (Huizen article 131247) through correction → preview → normal persisted order → normal detail → font contours. The ordinary Bedrukken name field accepts sequential typing of both names. The known missing Huizen name-price remains an existing commercial restriction in that global edit field; no price is invented to bypass it. The canary's number prices are present.

## Validation and performance

104/104 Node test results: 92 targeted existing production/parser/worker/batch tests, 11 E2E results including browser and independent service/store acceptance, and one real-source HTTP batch suite. Separate existing browser diagnosis and 10-read/5-interactive concurrency scripts PASS. Workspace TypeScript/build verification PASS.

| Measurement | p50 / value | p95 |
| --- | ---: | ---: |
| Existing cold order detail, five real orders, browser | 308.9 ms | 328.3 ms |
| Historical controlled baseline before ae68eb6 | 710.9 ms | 717 ms |
| ae68eb6 previous result | 376.5 ms | 426.7 ms |
| Complete batch usable, separate HTTP test | 946.9 ms | — |
| PDF text extraction / structured extraction | 709.7 / 72.0 ms | — |
| Ten concurrent cold batch loads | 884.2 ms | 886.5 ms |
| Concurrent reads, 100 responses | 10.9 ms | 24.7 ms |
| Ten concurrent detail requests | 320.3 ms | 329.9 ms |
| Five browser searches | 1 ms | 2 ms |
| Five browser selections | 1.6 ms | 1.7 ms |
| Five browser edits | 111.4 ms | 116.9 ms |

Cold detail still shares one parse. Batch-wide optimistic revision fencing intentionally gives `200 + 409` for conflicting edits/exclude/restore; an explicit refresh/retry is required. One handoff receipt survives concurrent retry. The new canonical accept also commits one order across two independent service/store instances. There is no new module-global mutable business state and no per-item PDF parsing.

New full-source canonical preview/accept are approximately 1–2 seconds locally, including reconstruction, normal validation and (for accept) durable order write. These are different operations from cached/order-scoped detail. No performance threshold was relaxed. The earlier 3.3 s remains unreproduced; it is not used as a comparison.

Permanent copies: full PDF **0**, full extracted text **0**, full source order archive **0**. Normal accepted printed orders and minimal provenance are intentionally durable. Original source bytes remain unchanged. Product Truth collections remain unchanged by acceptance/correction.

## Review and release disposition

Local review: `http://127.0.0.1:4188/webshop`; ordinary canary detail: `/orders/SP-2026-0106`; normal production work: `/productie`.
Local synthetic login: `patrick@sportpaleis.nl` / `Local-Canary-Only-2026!`. This password is only for the isolated review store, not LIVE.

Start after `npm run build:workspace` in website:
`node website/scripts/webshop-order-review-server.mjs .codex-tmp/pdf-order-e2e-final 4188`.
The server binds only 127.0.0.1 and blocks production-output and communication POST routes. It uses the normal built Workspace and canonical service, not a static mock.

**PDF → ORDER: PASS in isolated candidate. PDF → BEDRUKKEN: PASS in isolated candidate. LIVE: NO.**

The release artifact is an integration candidate, not a ready-to-activate full runtime. The inspected central release evidence at `2dcdab0` explicitly records unresolved releasebroker/owner-assurance/performance gates and deferred Webshop activation; it is historical evidence, not a claim about today's LIVE state. This branch does not establish the current LIVE storage/runtime baseline. No remote deployment, migration or LIVE order was attempted.

Exact remaining LIVE work: inspect/freeze the actual current runtime commit and storage authority; integrate this capability while retaining all later production/auth/mail changes; create the normal remote-tagged immutable runtime artifact; pass the mandatory releasebroker, production-shaped and owner assurance plus rollback gates; then controlled activation and one authenticated LIVE source-bound canary/smoke without physical output. Do not deploy this older whole branch or bypass those gates. The local release manifest identifies the exact commit, patch and hashes for that integration.
