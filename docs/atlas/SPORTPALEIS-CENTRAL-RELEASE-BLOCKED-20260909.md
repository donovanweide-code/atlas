# Central Sportpaleis release status

**BLOCKED — previous LIVE runtime cannot read the new Planning record collections after activation.**

One sequential integration worktree: `codex/spw-central-integration-20260908`. No subagents, parallel build tracks, merges, cherry-picks, LIVE deployments or LIVE rights changes were performed.

## Hard deployment gate

The reproducible check `website/tests/workspace-rollback-compatibility.integration.mjs` loads the exact previous source at `c03d8604cb1ce232c73a34f8996d0ad193f17024`. It creates/completes a disposable Planning item through the new service and presents its actual record identities to the previous storage contract.

Result: `BLOCKED`, exit 1. The old reader rejects both `workItems` and `workItemEvents` with `PREVIOUS_RUNTIME_UNKNOWN_RECORD_COLLECTION`. Its platform scalar payload can contain the new permission configuration, but its record reader cannot hydrate these new collections. The actual old database reader invokes this same identity validator for every loaded record. Once an item exists, switching the application symlink back to c03d860 is therefore not a safe rollback.

Evidence: `website/.codex-tmp/central-release-gates/rollback-compatibility.json`. Reproduce from `website/` with `WORKSPACE_ROLLBACK_ROOT` pointing at the clean c03d860 worktree and `node --experimental-strip-types tests/workspace-rollback-compatibility.integration.mjs`.

No data was deleted, converted or hidden to make this gate green. No application/database restore was attempted. Before activation, a separate compatible recovery authority must be established and tested; it must preserve both the new records and effective permission/session enforcement. This report does not substitute an unproven recovery artifact or database restore for the required rollback proof.

## Components

| Component | Release status | Authority and result |
|---|---|---|
| Capability Foundation | BLOCKED | Own integration checkpoint `0305d71db1d9c35c45f0e0f379989547c5ffc7f2`; generic engine, presets, overrides, backend boundary, dynamic management UI, audit and explicit tenant rollout plan. Local proof exists; no LIVE activation. |
| Shared Planning V1 | BLOCKED | Reconciled checkpoint `3b3c610c14d6d69f331e226a511b6b7f561804d1`, sourced from immutable `c6e0dd31a3fd0d7330f7afed0821a0f820302004`. Functional/browser tests pass; previous-release storage compatibility fails. |
| Auth/session | BLOCKED | Checkpoint `d8653667be146d3d8832e15789b968e6480f0ab2`; session validity and current permissions rechecked at transaction commit. Existing personal multi-session/device policy retained. Original old single-session WIP untouched. No LIVE auth change. |
| Webshop Bedrukking Intake | DEFERRED | `ae68eb679b534ff3e55076169020828cccbbeb62`. Local review uses its own session/SQLite state and `createBatchPlotJobDryRun`; confirm records a review receipt, not a real central PlotJob handoff. No central authenticated source/storage/handoff proof. No intake code imported or canary activated. |
| Production hotfixes | LIVE_PROVEN — existing release only | c03d860 remains the baseline. Fresh local critical regressions pass. No production math/source/color/mirroring change or new release was applied. |
| Teamwear Next Batch 1+2 | DEFERRED | `234b15e12bbe031fa0078cf3c96f828933f463ca` retains its separate review candidate. Shared runtime/permission edits and independent dark-deployment rollback were not proven for this release. No import, floor activation or production handoff. |
| New Mail/connectors | DEFERRED | Own transport authorization, ambiguous-send recovery and restart/sender-classification gates remain open. Existing networkless capture-only order workflow is preserved and regression-tested. Planning does not depend on new sending. |

## Verification and limits

- Final broad local set: 127 PASS, 0 FAIL. Includes core permissions, migration, Planning, sessions, artifact import graph, critical production truth and existing Mail regressions.
- Three additional focused domain MariaDB adapter tests PASS: durable cross-runtime policy invalidation, prepared Planning write after revoke, and expiry after lock/before commit. These use the repository SQL test double, not a real MariaDB load environment.
- Additional protected-account regression PASS covers owner attempts to reset credentials, disable, demote or reissue a technical account; normal employee account administration remains available. The affected authority suites were rerun: 30 PASS, 0 FAIL, including 29 overlapping prior tests. Total unique automated tests across these sets and the database adapter set: **131 PASS, 0 FAIL**. Separately, the mandatory rollback gate is **BLOCKED**, exit 1. Results are recorded in `website/.codex-tmp-final-authority-tests.log`.
- Built Workspace browser proof at 1440×960, 1280×800, 768×1024, 390×844 and 320×844: capture, note, completion, assignment, appointment, overdue persistence, no overflow and no page errors.
- Browser auth: second Erik device logs in through the actual login form while the first stays valid. Revoked Patrick refresh requires login; subsequent Planning write returns 401.
- Dynamic rights proof is LOCAL: management change → version update → second-user navigation/API changes → restore, with no build or new login.
- Local automated capture: median 431 ms, maximum 1,115 ms. Human typing time is not claimed. Permission compilation (2,000 samples) p50 0.0072 ms, p95 0.0148 ms. These are not authenticated LIVE latency metrics.
- Full real-MariaDB/runtime performance, external reviewcandidate, combined release artifact, deploy-engine prepare/activation and LIVE principal/Planning/config smokes remain NOT RUN. No claims of combined REVIEW_READY or LIVE_PROVEN.

## Proposed first configuration — not applied

Donovan: Developer/Admin. Kevin: Owner/Manager with Orders, Production, Planning and operational management, no Developer. Patrick: Operations with Orders, Production and Planning, no general management/Developer. Erik: Production with Orders/Production, Planning/Mail/management/Developer off. General employee preset: order entry only.

Mail/suppliers, Teamwear Next and Webshop Intake remain gated off in the proposed initial policy because their components are deferred. The management layer supports presets, per-user overrides, reset, explanation, read-only preview and immediate versioned revocation. Initial operator application additionally requires exact revision, policy hash, release ID/commit and audited configuration attribution; it cannot overwrite an existing policy.

The recovery/rollout decision must also cover future user onboarding and component activation explicitly. Existing unknown active identities block initial migration rather than receive inferred privileges.

## Unchanged LIVE and source boundaries

- LIVE ID: `SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860`.
- LIVE commit: `c03d8604cb1ce232c73a34f8996d0ad193f17024`.
- Existing artifact SHA-256: `19887eafaa122a9cf8ed1cfd48e3399d005d25f5e66eadc7194367b0dae6ccb2` (existing release manifest).
- Runtime: `/srv/wbd/current/website/scripts/workspace-runtime.mjs`, `wbd-workspace.service`, active on last read-only probe.
- No new release-ID/artifact/deployment. c03d860 is the previous runtime for a future deployment, but **not yet an admissible rollback target after Planning activation**.
- Immutable Planning snapshot remains clean at c6e0dd31. Original dirty Planning and old auth worktrees remain untouched. The clean current-LIVE source worktree remains unchanged.

The deployment stop follows the requested hard gate. Next required authority is a proven compatible recovery path; after that, complete the remaining real runtime/performance and combined release gates before LIVE activation/configuration.
