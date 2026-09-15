# Sportpaleis legacy/domain source reconciliation

Classification: **C — actual data mismatch**, confirmed against an exact historical backup. This supersedes the provisional B label in the first exploratory three-way output: that output also revealed truth differences, subsequently investigated field by field.

## Proven root cause and authority

The normal runtime uses `SportpaleisDomainMariaDbStore`. The scheduled website catalog job still instantiated `SportpaleisMariaDbStore`, updating the old monolithic source after cutover. Its initialization/validation also applied existing Product Truth normalizations to that old copy. Six scheduled writes explain revisions 9656–9661: 8, 9, 10, 11, 13 and 14 September. The 12 September run was a no-op. The source audit IDs and exact field deltas are in the associated evidence.

Historical encrypted backup `wbd-mariadb-20260908T003300Z.sql.enc` restores revision 9655. Its canonical hash `ae778c6082971ef273a8a477c48ae809d2f3d956bf82ebe8ae591f985f22fce6` matches both hashes of the existing MATCH receipt, compared at 2026-09-07T03:35:01.458Z.

Legacy 9661 hash: `fad38861608a507e5f75a1cb62f6f01d8599ac8173867e63ec38cc9dd8d0e401`. Domain 9797 hash: `f52ebc649cdeb4aa764bf209148dd930f9c3d1190ce49dbbd448aa8d2d1593a8`.

| Record set | Source 9655 | Legacy 9661 | Domain 9797 |
| --- | ---: | ---: | ---: |
| Orders | 111 | 111 | 150 |
| Production jobs | 65 | 65 | 86 |
| Production proposals | 52 | 52 | 66 |
| Audit records | 8890 | 8896 | 9121 |
| Articles | 192 | 192 | 192 |
| Production profiles | 126 | 126 | 126 |

9661 is not authoritative for orders, production history, sessions, idempotency, mailbox state or manual review decisions. Those have advanced in the domain store. Blindly backfilling it would regress or lose those changes.

The baseline-to-legacy truth delta is exactly reproduced by the existing `validateSportpaleisPilotState` normalization: 3 article bindings (137294, 137295, 134826), 7 Waterwijk profiles, and 6 production-element number-composition records (56 leaf fields). Examples include authoritative Waterwijk Senior 220 mm instead of 200 mm, existing Spain font bindings and configured number spacing. No rule has been invented. After accounting for that normalization, the only remaining source differences are revision, six unchanged scheduled-sync audit records and websiteSync metadata.

Whole-state validation also changes derived fields on newer domain orders. The repair deliberately does **not** persist those order projections: only the proven library truth fields and sync/audit delta are admitted. Historical orders and production snapshots remain byte-for-byte canonically equal.

## Guarded maintenance procedure

1. Verify an encrypted backup and its checksum; restore the baseline into an isolated database, verify its hash against the immutable historical receipt.
2. Plan using current legacy/domain hashes. Reject unknown legacy deltas, changed audit records, record identity changes, manual truth conflicts, conflicting sync fields and unproven writers. Preserve operator review decisions and recompute their derived pending-list counts.
3. Apply only the plan's allowed library/sync changes through the existing incremental domain-store mutation/CAS transaction. Import missing audit IDs once and record a hash-bound maintenance event. Preserve all order, job, proposal, session, mailbox and idempotency hashes.
4. With application writes stopped under the existing deployment lock, use the existing offline rollback materializer to encode the authoritative domain snapshot. Its optional source-reconciliation mode validates the committed audit event, historical receipt, prior source hash/revision and current domain hash/revision. It atomically writes the compatibility snapshot, appends a new MATCH receipt and advances the migration-source pointer. The old receipt remains intact. It never imports a full legacy state into domains.
5. Confirm hash equality, `ALREADY_BACKFILLED`, repeat safety and restart. Deploy the fixed website job using the domain store so the old writer cannot recreate drift.

No direct manual database update is part of this procedure. Checkpoint changes are conditional transactional writes in the existing audited materializer, after verified semantic reconciliation. The runtime read and backfill guards remain unchanged.

## Isolated proof

The latest production backup initially fails with DOMAIN_BACKFILL_SOURCE_DRIFT. Applying the repair to that isolated restore moves domain revision 9793 to 9794, preserves all 150 orders and 86 jobs, imports its five missing sync audits, and reconciles 56 truth fields. Repeat apply is a no-op. A false source hash is rejected before compatibility/checkpoint mutation. Correct sealing yields equal source/domain hashes, ALREADY_BACKFILLED and a matching fresh store after restart.

Eight new regression tests cover the planner, preserved data and review choices, baseline mismatch, unexpected legacy order, rewritten audit, truth conflict, concurrent domain/sync edits, and the scheduled writer's authoritative store. Full release/test/assurance outcome is recorded separately after execution.

## Release execution outcome — 15 September

The relevant reconciliation, PDF/mail, Product Truth, delete/idempotency and 30-order suites passed 151/151. The 30-order fixture retained 39 production lines and WIT/ZWART/BLAUW. The separate concurrency run passed. Quiet browser orderdetail p50 was 307.9 ms, p95 342 ms; parse 855 ms; persistent PDF/text/full-order archive copies remained 0/0/0. Workspace build passed.

Artifact-bound server assurance on the repaired isolated restore did **not** pass. `createProductionJob` correctly rejected the next physical step with `PRODUCTION_PHYSICAL_STEP_CONFLICT`. Applying the runtime's exact operational-group predicate identifies existing `PLOT-2026-0098` (`production-job-eae1a8ce0b7197a55157`), order `SP-2026-0172`, proposal `production-proposal-e9e03cb9d55014a85147`, group `production-group-1ad392291b18d48d18f5`, WIT, status `AWAITING_HUMAN_CHECK`. Other historical awaiting jobs do not meet that operational predicate. The assurance preserves existing order/job/proposal hashes, so silently rejecting or completing that existing job to pass the gate would invalidate its evidence. No physical completion or change to the production guard was performed.

The Owner assurance also exposed a release packaging defect: `wbd-owner-domain-mariadb-store.mjs` was absent because explicit assurance scripts were copied without traversing their imports. Mandatory Sportpaleis/Owner assurance and Owner maintenance entrypoints now use the existing dependency graph collector. No assurance threshold or product behavior changed. Packaging/provenance/persistence tests passed 25/25, including the new regression for transitive assurance dependencies.

The full server gate remains blocked; LIVE reconciliation, deployment, LIVE smoke and customer-mail audit have not been performed. The tested reconciliation itself remains an isolated-restore PASS, not a claim of LIVE resolution. A production-shaped restore with the physical step legitimately released is required to rerun the unchanged server assurance. Do not change a real order's status based solely on this release test.
