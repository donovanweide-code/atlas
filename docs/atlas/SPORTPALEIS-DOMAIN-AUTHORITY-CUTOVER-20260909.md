# Sportpaleis domain authority cutover

This is an isolated reconciliation candidate based on immutable central f5ff4c3995fa1d6b3e26bc9f2d6d508ad914fa99. LIVE C03D860 remains unchanged until the combined release gates pass. Recovery 7313492 remains frozen; its operational successor must include the domain sync writer before becoming the final rollback target.

## Explicit conflict decisions

| Conflict | Resolution and evidence |
| --- | --- |
| SP-2026-0133 | Preserve DOMAIN revision 4, updatedAt 2026-09-07T11:27:02.167Z, DELETED/restorable=false. Erik's ORDER_DELETED event event-32718147cefa and audit audit-ff436c030c2e5299 corroborate the operation. All five legacy events are identical members of the domain history; domain adds the deletion. No resurrection, new deletion or job modification. |
| Articles 137294, 137295, 134826 | Apply the existing C03D860 validator's Waterwijk profile projection: profile-shirt-home / profile-shorts-home. Explicit article truth requires Spain and overrides generic Schluber. Each resulting complete record hash equals the reviewed target. |
| Seven production profiles | Apply only fields bound in config/sportpaleis-domain-cutover.mjs. Waterwijk Senior 220 mm / Junior 200 mm comes from the explicit 7 September authority; it supersedes the 1 September universal 200 mm value. Spain bindings use the authoritative registry. Keeper and other applicable profiles retain Schluber. |
| Six production elements | The existing full C03D860 validator and verified production source registry independently reproduce the reviewed target hashes. Standard contour distance 18 mm; authoritative Pioneers senior source 5 mm; glyph metadata retained. No geometry or mirrored output changes. |
| Two sync-signal conflicts | Preserve the successful 9 September source observation instead of the older 6 September fingerprints. Updated source labels/fingerprints do not approve Product Truth changes. All domain review decisions remain authoritative. |
| Four source fingerprints | Brouwer Sports, EKVA, VVA/Spartaan and article 140823 use the successful 9 September observation. Source IDs remain stable. |
| One source relevance entry | Article 140823 remains RELEVANT for Initialen; only its newer source fingerprint differs. |
| Developer-reviewgrant f95c4629f61dce63561c | Preserve DOMAIN revocation by Donovan at 2026-09-07T05:35:28.932Z and ended session. Never import the older unrevoked variant. |

The key finding is that domain is the operational store but contained obsolete physical production configuration. Applying the full existing validator to detached domain data in memory proved all 3+7+6 target records byte-content equivalent by canonical hash to the reviewed corrections. This is not a blanket legacy or domain winner.

Only 16 reviewed production records, websiteSync metadata, additive audit events and a cutover receipt may change. Complete orders, jobs, proposals, session state, grants, idempotency, capabilities and Planning data are hash-preserved. Six expired legacy-only sessions are not imported. Two legacy-only sync audit entries and the latest source indices/history are retained. Domain-only pending sync signals are retained until a future actual source comparison; no pending review is silently completed. No extra orders/articles are imported from legacy.

## Storage and writer boundary

The scheduled website-sync entrypoint changes only its hardcoded constructor/import to SportpaleisDomainMariaDbStore. The same sync functions, fingerprints, audit and tenant binding remain. It is catalog sync, not an order importer. New orders still use the existing authenticated Workspace order service.

The explicit cutover planner binds each production record's old and corrected canonical hash, the source snapshot fingerprint, domain revision and complete legacy reference hash. Changes are prepared outside the lock. The existing domain transaction locks and verifies the domain revision; this one-off operation additionally locks and rechecks the legacy row before writing. A mismatched source aborts the complete transaction. A retry is unchanged/idempotent.

After DOMAIN_READS, backfillLegacySource never enters the legacy import branch. It requires a versioned, tenant/revision-bound domain cutover receipt with zero unresolved conflicts and an unchanged reviewed legacy reference. Missing receipt, future legacy drift, regressed domain revision or inconsistent metadata fail closed. Normal requests never scan legacy. SHADOW/bootstrap backfill behavior remains available only before domain cutover.

The operator CLI defaults to plan-only. Apply requires production mode, releasebroker operation, an exact candidate manifest release ID and the expected domain revision/plan hash. It does not expose a public mutation endpoint.

## Real MariaDB evidence

Local validation: 34/34 authority/storage tests and 49/49 capability, session, Planning, printing-context, Product Truth, composition/color and artifact-dependency regressions PASS. The full real-MariaDB scenario below also PASS.

Fresh isolated LIVE clone spw_cutover_test_20260909_r3, initial domain 9768 / legacy 9657. Source: actual LIVE domain tables, not a reconstructed legacy backfill. Evidence root /tmp/spw-domain-cutover-20260909-r3/evidence, local copy website/.codex-tmp/cutover-real-result.json.

- All 146 orders, 84 jobs and 64 proposals preserved by full canonical hash across reconciliation, recovery and roll-forward.
- Exact 16 Product Truth target hashes PASS; deletion and grant revocation retained.
- Deliberately stale legacy-reference transaction rejected; no partial domain writes.
- Retry creates no duplicate cutover, order or source update.
- Recovery 7313492 and forward f5ff4c3 both read the corrected state and perform an isolated preference write; current store restarts and verifies authority afterwards.
- Real public source fingerprint is unchanged by retry. Ten explicitly labelled isolated source revisions exercise actual sync writes; they are test fixtures, not new LIVE observations.
- Two concurrent sync writes: one commits, one returns 409; retry is NO_CHANGES.
- Sync + authenticated Workspace order + bootstrap: three overlapping operations, one safe retryable conflict; exactly one new test order. Existing job/proposal hashes remain unchanged.
- CSRF, capability deny, tenant mismatch and revoked Planning write denied. No write/revision change after denied revoked-session mutation.
- Underlying legacy state hash unchanged throughout. LIVE mutations: zero.

| Measurement | Samples | p50 ms | p95 ms |
| --- | ---: | ---: | ---: |
| Domain read | 20 | 2.43 | 4.85 |
| Domain write | 10 | 16.21 | 37.90 |
| Authenticated bootstrap, candidate | 10 | 356.09 | 458.19 |
| Authenticated bootstrap, f5ff4c3 on same corrected data | 10 | 339.53 | 460.82 |
| Actual sync write, isolated source revisions | 10 | 226.74 | 260.84 |

One-off offline cutover took 11.76 seconds including complete conflict validation and preservation hashing; this is not per-request overhead.

## Dependencies and release limits

Teamwear pilot-control and prelive-cleanup retain their legacy constructors: DEPENDENCY_CANDIDATE, not silently altered or invoked. Teamwear, new Mail/connectors and Webshop Intake remain deferred/gated under their own release gates. No new analytics, Planning UX, contact, supplier or production engine feature is introduced.

The next phase must freeze this candidate, reconcile the minimal writer/admission changes onto recovery 7313492, rebuild the central immutable artifact, rerun artifact-bound production-shaped/owner assurance and the combined deployment gates. Passing this data cutover test alone is not LIVE release approval evidence.
