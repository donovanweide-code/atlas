# Domain cutover proven; central release blocked

## Frozen authorities

| Component | Authority | Status |
| --- | --- | --- |
| Domain cutover | codex/spw-domain-authority-cutover-20260909; 5f52639872174d3dd12848242430f53dee848279; tag SPW-DOMAIN-AUTHORITY-CUTOVER-20260909 | DOMAIN_AUTHORITY_CUTOVER_PROVEN on an actual LIVE copy; not applied to LIVE |
| Compatible recovery successor | codex/spw-domain-recovery-20260909; 573fab416d16a1689ef0ea54dffa9d372b9fd21a; SPW-RECOVERY-DOMAIN-AUTHORITY-20260909 | Storage recovery/roll-forward proven, including a completed work item and completion event |
| Central successor | codex/spw-central-domain-release-20260909; executable tag SPW-CENTRAL-DOMAIN-PLANNING-20260909-R3; 0d1e4a8b2dad4305b12e58df31826961e0d8c75e | BLOCKED at mandatory release gates |
| Current LIVE | SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860; c03d8604cb1ce232c73a34f8996d0ad193f17024 | Unchanged; service active |

Original Planning c6e0dd31, recovery 7313492, central f5ff4c3 and all separate component worktrees remain untouched. This document is evidence after the executable R3 tag; it changes no artifact bytes.

Recovery archive: 24,805,767 bytes; SHA256 `107d072e8d15555ded1ba1fc77e3f21d6ebf10471a713fe5d0a418882271c34a`.
R3 archive: 24,851,175 bytes; SHA256 `50a420074a7bed01f604c9db24951dfb21d1231105fe55937b40d78500a727e0`.
Isolated restore backup: `wbd-mariadb-20260909T083029Z.sql.enc`; SHA256 `360be0bff709b02f573a198876276ead8a3ecf7dd6ebc81b9468d0f699c76775`.

## Explicit conflict decisions

| Records | Count | Reviewed resolution |
| --- | ---: | --- |
| SP-2026-0133 | 1 | Preserve DOMAIN revision 4, deleted 2026-09-07T11:27:02.167Z. Deletion event and audit agree; all older history retained. No resurrection or new deletion. |
| Articles | 3 | Existing C03D860 article truth projects the reviewed Waterwijk Spain profile bindings. |
| Production profiles | 7 | Existing full C03D860 validator reproduces exact reviewed target hashes; Waterwijk Senior 220 / Junior 200 and correct font/source bindings preserved. |
| Production elements | 6 | Same proven validator reproduces target hashes; standard spacing 18 mm, authoritative Pioneers Senior source 5 mm. |
| Website-sync signals | 2 | Latest verified source observations, while preserving domain-only unresolved signals and all current domain review decisions. |
| Source fingerprints | 4 | Reviewed 9 September source fingerprint, bounded by revision/time/hash. |
| Source relevance | 1 | Updated source identity; relevance remains RELEVANT. |
| Developer review grant | 1 | Preserve DOMAIN revocation and ended session; no reactivation. |

Total: 25 resolved conflicts. Exact IDs, previous/target hashes and proof are in the cutover config and SPORTPALEIS-DOMAIN-AUTHORITY-CUTOVER-20260909.md. Six expired legacy-only sessions were not imported. Needed source indexes/reconciliation and two original sync audit events are retained; no unnecessary order archive duplication.

## Writer, concurrency and recovery proof

The candidate's scheduled website-sync uses the existing domain store instead of the legacy constructor. This job synchronizes catalog/source observations; it is not an order importer. Proof separately covers actual domain sync writes, normal Workspace order creation into DOMAIN, concurrent sync/order/read operations, one visible retryable conflict and idempotent retry without duplicate order. No second writer was built.

DOMAIN_READS backfill verifies the explicit cutover receipt and legacy reference revision/hash. Missing approval, revision drift or reference conflict fails closed. Legacy cannot overwrite newer domain records. The cutover commit also locks and verifies the legacy reference before any domain write. Normal requests do not scan legacy.

146 orders, 84 jobs and 64 proposals were preserved byte-semantically by canonical hashes. Restart and forward/recovery preference writes preserve operational and security hashes. A separate artifact test on the isolated fixture database completed its task through the existing personal service login, then proved recovery 573fab4 -> R3 preserves one work item and one completion event. No Planning collection reset, session resurrection, order deletion, source replacement or LIVE migration occurred.

## Verification

- Cutover: 34/34 authority/storage and 49/49 targeted regressions; actual MariaDB LIVE-copy security/concurrency/recovery test PASS.
- R2 combined regression: 84/84. After bounded R3 repairs: 14 auth/service/dependency tests and 17 projection/Planning/Product Truth tests PASS. Counts overlap and are not summed as independent tests.
- R3 browser QA: Today/signals/rights and Planning flows PASS at 1440x960, 1280x800, 768x1024, 390x844 and 320x844. No overflow or page errors. Dynamic permission/priority change, backend revoke, personal second-device login, revoked refresh/write denial, assignment, notes, completion and overdue all verified. Fixture-only; no LIVE principal smoke claimed.
- R3 artifact production assurance: all five cycles and 2,514 requests executed, zero HTTP/server errors, every named functional/security/storage invariant true. Mandatory overall result remains FAIL due to the limits below.
- R3 recovery/roll-forward artifacts PASS, including nonempty Planning collections. Original source and completed-event/security hashes preserved.
- Owner assurance dependency packaging was repaired; its remaining migration/runtime authority mismatch is explicit below.

## Performance

Focused LIVE-copy cutover measurements (milliseconds):

| Operation | Samples | p50 | p95 |
| --- | ---: | ---: | ---: |
| Domain read | 20 | 2.43 | 4.85 |
| Domain write | 10 | 16.21 | 37.90 |
| Bootstrap | 10 | 356.09 | 458.19 |
| Same-data baseline bootstrap | 10 | 339.53 | 460.82 |
| Actual isolated sync writes | 10 | 226.74 | 260.84 |

R2 exposed whole-datastore cloning inside the temporary-review guard and oversized order execution evidence in bootstrap. R3 reuses the existing bounded review projection and omits only unused execution snapshot/history fields from public bootstrap responses, after computing current production truth. Full detail/internal responses and durable records retain those proofs.

R3 full-load request p50/p95: 22.48 / 62.80 ms; bootstrap 163.74 / 1,310.78 ms. Max bootstrap 1,399.50 ms. All payload bounds pass: overview 1,755,154, orders 1,648,061, production 4,344,243 bytes. Event-loop p95 14.07 ms. These improvements do not override the remaining hard failures.

## Deployment blockers — unchanged gates

1. **Installed shared releasebroker does not admit cutover.** Existing contract validates, but the proposed cutover adapter is rejected as not allowlisted. The privileged runner neither invokes the reviewed cutover CLI nor accepts DOMAIN_AUTHORITY_VERIFIED. Broker SHA256 `7d66e335e92011713ea0b6dceaed71e18995a3e6157e5f976538c48c6cf5452d`; validator SHA256 `019da672139b9ae50b4602e089fd750c9084920235d5ff0396129e8daa47a34d`. A reviewed shared-infrastructure authority must bind plan/revision/hash and quiesce Workspace plus scheduled sync; no fabricated lock flag or manual LIVE SQL bypass was used.
2. **Owner assurance targets a different storage authority from the actual runtime.** Required `sportpaleis-runtime-state` migration version 8 (`008-wbd-owner-domain-state.sql`) is absent in the restored current LIVE schema. The real runtime still constructs WbdOwnerMariaDbStore, while mandatory owner assurance constructs WbdOwnerDomainMariaDbStore. Result: DATABASE_MIGRATION_MISSING. Reconcile the gate with the real owner authority before deciding whether any separate owner migration is needed. No unrequested owner migration or disabling of the mandatory gate was performed.
3. **Two remaining full-load performance bounds fail.** Event-loop max 1,076.68 ms > 1,000 ms (multi-batch rollback; warmup also 1,025.03 ms). The 80 mm production practice takes 15,062.43 ms > 15,000 ms. The 200 mm case is 8,422.63 ms. No thresholds, scenarios or measurements were relaxed, and no repeated runs were used to select a favorable result.

## LIVE and activation

Final read-only verification: C03D860 active, DOMAIN 9768 / DOMAIN_READS, LEGACY 9657, 146 orders / 84 jobs / 64 proposals. No deployment, LIVE cutover, principal login impersonation, permission rollout, dynamic LIVE permission change or LIVE smoke was performed. The scheduled LIVE writer is therefore still the C03D860 writer until a gated release is approved and executed.

| Requested component | Current release disposition |
| --- | --- |
| Capability foundation | BLOCKED for LIVE by central gates; fixture configuration tested |
| Planning | BLOCKED for LIVE by central gates; functional/browser tests passed |
| Auth/session reconciliation | BLOCKED for LIVE by central gates; security tests passed |
| Production hotfixes | Existing C03D860 authority unchanged; regressions preserved |
| Webshop Intake | DEFERRED; no activation or source registration added |
| Teamwear Batch 1+2 | DEFERRED; separate candidate and legacy-constructor dependencies untouched |
| New Mail/connectors | DEFERRED; no sending/connector activation |

Desired Donovan/Kevin/Patrick/Erik permission fixtures remain as documented in the central candidate; no changes were applied to real users. Supplier stock remains out of scope.

Final central status: **BLOCKED — shared releasebroker/owner authority reconciliation and remaining performance bounds.**
