# Webshop mail/PDF: 30-order software proof and release gate

Status: **BLOCKED — authoritative BLAUW article route missing. No LIVE release.**

The requested full acceptance is not PASS. The isolated software test completes 30/30 orders (36 printed article rows) in WIT and ZWART through normal production and pickup. BLAUW has not been invented or substituted with a custom order. Current LIVE has no blue production profile. Its GEEL profiles belong to HBSA and have no directly linked catalog articles; these are not represented as proven PDF production cases.

## Knowledge and current LIVE reconciliation

- Reused candidate `1f0edff1e0d55d6eada5b47aa9a583f64a647743`, including `ae68eb6` page-scoped detail parsing and the existing image matching.
- Read the existing mailbox router, immutable attachment reader, Divide parser, batch projection and override store, canonical normalization/create-order core, production truth and color/completion tests, normal delete/restore flow and Workspace UI.
- Read-only inspection on 14 September identified active release `SPW-PRACTICAL-NUMBER-INPUT-20260910`, manifest commit `76a7aaf72bcf44cb4e01b51e434c410093445565`, domain revision 9797. The candidate already contains that commit's executable production fixes. Runtime entrypoint has no difference from that LIVE commit; this change does not replace Product Truth or number/placement/composition rules.
- All three inbound IMAP configuration values are present. Their values were not printed. Journal evidence proves successful polls every two minutes, including 19:04–19:18 UTC. They found one existing UNKNOWN message, no new intake. LIVE currently has zero intake sources and matches.
- No LIVE order, production, mailbox classification, customer message, deployment or migration was performed.

## Reused chain and changes

`existing IMAP scheduler → existing mailbox routing → bounded PDF worker → existing batch projection → source/order index → shared normalizeWebshopOrder → createWorkspaceOrderRecord → normal order/Bedrukken → existing production and fulfillment services`

The supported webshop layout now uses the prepared parser inside the existing mail adapter. The adapter persists only its source reference, external reference, page/index identity, review reason and lifecycle status. Order contents are reconstructed when opened. Reading a linked order parses only its known pages. The canonical order, source receipt and intake acceptance are committed in one existing store transaction.

The normal Workspace exposes automatically received batches with found/ready/attention/processed/deleted counts, oldest-first order references, open, delete and restore actions. Preview and explicit order creation open the normal order flow. Individual confirmation is used; there is no new bulk-accept wizard.

Staged deletion is revision-fenced. Accepted orders use existing order tombstones; their linked intake status follows deletion/restoration. Reimport and raw re-upload reject deleted orders. Completed production history remains immutable and cannot be restored through the intake. A concurrent accept returns the same existing order; a concurrent lifecycle change produces a conflict rather than silently overwriting it.

The legacy parser's bare `26…` fallback is retained. Explicit `Bestelnummer:` labels now support other numeric prefixes and do not split on an unrelated `26…` phone/reference. A regression test covers both cases.

## Overrides

The old SQLite override fields are **production-relevant**, not harmless review metadata. They include article/description, size, color, quantity, personalization and profile, plus exclusion. The inspected local review database contains **zero rows**, and no batch-review process was running. There is therefore no stored override migration to perform for this installation.

The isolated canonical review now reads the existing SQLite database read-only, scoped by source hash and order number, and supplies saved overrides automatically. The shared normalizer carries differences into provenance, respects exclusion and rejects unknown keys, mismatched identities, duplicate correction sources and unsupported production authority. An automatic-provider regression proves size/quantity/Junior and exclusion reach canonical preview. Product Truth is unchanged. LIVE does not gain a SQLite store or depend on a PC path. A future non-empty review database must be reconciled before promotion; this audit's zero-row result is not a waiver to ignore later edits.

## Proof

See [machine-readable evidence](SPORTPALEIS-WEBSHOP-MAIL-30-PROOF-20260914.json).

- Real `1-012653-order.pdf`: 138 pages, 9 printed orders, 18 printed rows. Source SHA-256 `411f0dab404eae3d0a394b2076639a378bd81e3bb55430ae78675d795f84b7d2`.
- Real canary `2635358683` reaches local `SP-2026-0106` with 116597/141521 and number 88. This is isolated test state, not a LIVE order identifier claim.
- 30-order fixture: 10 patterns repeated with distinct references, multiple article codes and sizes, Junior/Senior, one/two-digit numbers, names with spaces, initials, chest/short numbers, multiple article rows and multiple clubs. Article truth determines output multiplicity and foil colors. No test catalog rules are changed to obtain a result.
- 30/30 ordinary orders reach production composition, software Print/Plot completion, Gereed, READY_FOR_PICKUP and PICKED_UP. Two color jobs complete. Completing WIT leaves ZWART open; retries do not produce a second execution. No hardware output or customer email is sent.
- Staged deletion, reimport, process reinitialization, explicit restoration, concurrent deletion conflicts, canonical deletion/restoration, deletion after completed production and re-upload rejection are tested.
- Real browser proof: mail batch opens, delete/restore works, preview accepts into normal orderdetail. Existing E2E also proves normal Bedrukken typing preserves `DE VRIES` and `VAN DER MEER`.
- Tests: 103 relevant regression tests + 15 real-source/E2E tests + 1 thirty-order lifecycle test = **119/119**. Separate concurrency and browser performance scripts pass. Workspace build and diff checks pass.

## Performance and storage

| Measurement | Result |
|---|---:|
| 30-order mail/PDF intake, including staging | 838 ms |
| 30 sequential previews + canonical accepts | 49.9 s / 36.1 orders per minute |
| Normal orderdetail, 300 reads over 10 concurrent sessions | p50 1127 ms / p95 1310 ms |
| Quiet PDF orderdetail browser opening | p50 318 ms / p95 332 ms |
| Earlier quiet candidate | p50 309 ms / p95 328 ms |
| Batch browser search | p50 1.7 ms / p95 1.8 ms |
| Batch selection | p50 2.1 ms / p95 2.2 ms |

The ten-session normal-order benchmark uses the isolated JSON FileStore, including authentication/state reads, not the LIVE MariaDB runtime. It must not be presented as a LIVE latency measurement. The batch revision fence intentionally conflicts competing writes; refresh/retry is required. Existing batch tests prove ten read sessions, five independent browser sessions/selections, edit/exclude conflicts and one idempotent handoff. Cold batch parsing occurs once and shared detail parsing once.

New intake persistence: **PDF blobs 0; full extracted PDF text 0; full order archive 0.** Existing Mail's original immutable evidence remains the source authority. The checked-in synthetic test PDF is a fixture, not a production archive. Legacy intake sources are not bulk-migrated; LIVE currently has none.

## Review and remaining gate

Local interactive review: `http://127.0.0.1:4191/webshop`. Test login: `kevin@sportpaleis.nl`, password `Local-Canary-Only-2026!`. This is a separate local store with the real source and no external production/mail transport.

Required next input: the authoritative existing article/club production rule for BLAUW. Neither the local catalog nor current LIVE profiles supply it. Once resolved, retain all cases and extend/re-run the full color acceptance. Then create the normal immutable runtime release with current-base freeze, releasebroker/assurance and rollback gates, followed by authenticated LIVE smoke and the first new-batch canary. The source candidate is not a certified deployable runtime artifact yet.

**Morgenochtend auto-intake: NOT READY for the new capability.** The existing inbound poll is active, but this candidate has not been deployed or operationally released.

**Klantmail status audit: NOT RUN.** The user explicitly placed it after full PDF/production acceptance. No claim is made about current sender authority, Sent-fence, templates, triggers, provider safety or LIVE delivery. Audit those only after the remaining acceptance gate is green.
