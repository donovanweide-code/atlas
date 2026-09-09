# Central integration resumed — 9 September 2026

This supersedes the c03-only rollback blocker in the earlier central report. This checkpoint is not a deployment or LIVE proof.

## Authority inventory

| Component | Source authority / worktree | Decision |
| --- | --- | --- |
| Current LIVE production | c03d8604cb1ce232c73a34f8996d0ad193f17024; spw-composition-colors-live-20260908, clean | Preserve baseline; remotely verified active release SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860 |
| Recovery | 7313492e0d93e0e952469f4409a538781defb66c; codex/spw-compatible-recovery-20260909, clean evidence HEAD c347483 | Immutable rollback target SPW-RECOVERY-PLANNING-STORAGE-20260909; archive SHA256 727ade584c17311898b550607bd6897835610f25ad48f762a2c0ff5dc739509b |
| Planning | c6e0dd31a3fd0d7330f7afed0821a0f820302004 snapshot, clean; reconciled in central 38f0c2a21333a587eeba81abad7a7765070cca9d | Preserve snapshot; use reconciled central implementation |
| Capabilities / session enforcement | central 38f0c2a; codex/spw-central-integration-20260908 | Backend current-policy and session checks under write lock; superseded single-session dirty worktree remains untouched |
| Printing signals | 5a04272d2c322b8322401d197020735260b2fff7; spw-printing-signals-20260909, clean | Central fast-forward after exact diff inspection; confirmed one printing ORDER per count |
| Webshop Intake | ae68eb679b534ff3e55076169020828cccbbeb62; codex/spw-mail-pdf-isolated-20260908, f2c1/Atlas; tracked clean, untracked checkpoint document | DEFERRED: isolated review server / SQLite overrides / dry-run PlotJob receipt are not the authenticated persistent central adapter and actual LIVE handoff |
| Teamwear Batch 1+2 | 234b15e12bbe031fa0078cf3c96f828933f463ca; codex/spw-teamwear-next-batch2-20260908, 22c9/Atlas/.codex-tmp/teamwear-batch1, clean | DEFERRED: preserve separate external review candidate; independent dark rollback not proven; no broad activation or production handoff |
| New Mail/connectors | existing candidate safety dependencies, no admitted new release authority | DEFERRED: no new send activation; revoke-before-send, ambiguous acceptance and restart reservation gates not established |

Shared auth/runtime/frontend files were reconciled in the central authority; no intake, Teamwear or paused auth merge is admitted. One sequential write authority remains the central worktree.

## Confirmed printing semantics

Kassabedrukking and Webshop bedrukking count printing orders, including completed-today. Article/garment and print quantities stay in underlying operational records. No historical reconstruction. Webshop registration remains inactive until the proven Intake adapter and LIVE activation boundary are reconciled. Signal configuration PRIMARY / SECONDARY / HIDDEN is versioned per user/preset, independent of module permissions. A display preference cannot grant data access.

## Fresh local verification

- Broad regression: 120/121 initially; sole failure was an obsolete strict expected state missing additive empty workItems/workItemEvents. Updated expected state and explicitly asserted legacy/composed backfill hash equality. Full MariaDB suite rerun: 23/23 PASS. Therefore all 121 distinct tests have passed on the resulting code.
- Runtime dependency gate exposed the missing printing catalog in the artifact builder admission list. Added only the explicit catalog; strengthened graph check, PASS (122 distinct tests including this check).
- Workspace TypeScript/Vite/build validation PASS, 346 files. Existing large-chunk warning remains; production-shaped timing gates still apply.
- Exact recovery admission rollback test PASS against immutable 7313492 tag. Original recovery worktree clean and runtime source unchanged by its later evidence commit.
- Printing metadata round-trip through recovery storage/permissions PASS; no new collections; recovery permission changes preserve display metadata.
- Fresh Chrome signals/permissions QA PASS at 1440x960, 1280x800, 768x1024, 390x844, 320x844: no overflow, no page errors, dynamic priority update without login, second-user navigation/backend revoke and restore, no historical or nonexistent Webshop counters.
- Fresh Planning browser QA PASS at the same five sizes: task, assignment, appointment, notes, completion by Patrick, persistent overdue, second-device personal login, revoked-session reauthentication and denied browser write; no production/mail mutation. Quick capture p50 705 ms, maximum 1,370 ms. These are local fixture measurements, not LIVE latency.

## Deployment gate still pending

Freeze and build a reproducible artifact, rerun artifact-bound production-shaped/owner assurances against isolated restored MariaDB, stage compatible recovery, validate checksum-bound release contract and fresh backup/restore, then release-engine PREPARE/GO only if all required gates pass. No hand-edited LIVE runtime. User authorized controlled deployment and real rights configuration after gates; no LIVE changes have occurred at this checkpoint.

Initial mapping was read-only planned against current LIVE: Donovan developer, Kevin owner, Patrick operations, Erik production; no unbound active principals. No implicit broadening; latest revision/hash must be replanned immediately before explicit configuration apply. Planning ON for first three, OFF Erik; new Mail, Intake and Teamwear OFF while deferred. Dynamic LIVE proof and real-principal smoke remain pending.
