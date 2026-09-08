# Central sequential release inventory

## Authority

Central write authority: `codex/spw-central-integration-20260908`, worktree `C:/Users/donov/Documents/Atlas/_worktrees/spw-central-integration-20260908`.
Starting commit: `c03d8604cb1ce232c73a34f8996d0ad193f17024`.
Source candidates and original dirty worktrees are not write targets. No deployment has been performed by this run.

| Component | Source authority / worktree | State and evidence | Integration decision |
|---|---|---|---|
| Planning | `codex/shared-planning-v1-development-snapshot-20260908`, `c6e0dd31a3fd0d7330f7afed0821a0f820302004`; `_worktrees/shared-planning-v1-development-snapshot-20260908` | Clean immutable development snapshot, parent c03d860. NOT YET PROVEN. Original `_worktrees/workspace-shared-planning-v1-20260908` remains dirty on c03d860. Seven prior domain tests and a build are not runtime acceptance. No running external review artifact located. | Fixed reconciliation source only; separate file storage must be reconciled with transactional authorization/persistence. |
| Capability foundation | Central worktree above | No pre-existing clean foundation authority found. New standalone engine/catalog/tests in central worktree. Not runtime integrated. | Complete and freeze before Planning reconciliation. |
| Auth/session | `codex/spw-single-session-policy-20260908`, c03d860; `_worktrees/spw-single-session-policy-20260908` | Dirty four shared files plus new session-policy/session-methods modules. No test proof. Older single-session exception conflicts with corrected product policy. | PAUSED until Planning + capabilities proven; do not import old policy wholesale. |
| Webshop intake | `codex/spw-mail-pdf-isolated-20260908`, `ae68eb679b534ff3e55076169020828cccbbeb62`; `C:/Users/donov/.codex/worktrees/f2c1/Atlas` | Tracked source clean; untracked checkpoint document. Source commits 82e7a08, a91aa41, 855071b, ae68eb6. Existing evidence: 28 targeted tests, real 138-page PDF, selected-page detail parsing, 10 read/5 interactive sessions. HTTP review is local isolated server. PlotJob receipt proof is not actual central production handoff. | Not yet release-ready: central authentication and real handoff must be proven. |
| Production / current LIVE | `codex/spw-composition-colors-live-20260908`, c03d860; `_worktrees/spw-composition-colors-live-20260908` | Clean. LIVE manifest read over SSH: `SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860`. Runtime `wbd-workspace.service`, Node 22.23.2, `/srv/wbd/current/website/scripts/workspace-runtime.mjs`. | Start authority; never overwrite newer LIVE corrections with older candidate content. |
| Teamwear Batch 1+2 | `codex/spw-teamwear-next-batch2-20260908`, `234b15e12bbe031fa0078cf3c96f828933f463ca`; `C:/Users/donov/.codex/worktrees/22c9/Atlas/.codex-tmp/teamwear-batch1` | Clean combined candidate. Reported 60 targeted tests require rerun before release. External review service `wbd-teamwear-next-batch2-review.service`, artifact `SPW-TEAMWEAR-NEXT-BATCH2-COMBINED-REVIEW-R3-234b15e`, preview.webuildanddesign.nl. Existing candidate untouched. | Default OFF; defer unless independent dark deployment and rollback are proven. |
| Mail/connectors | Mail/PDF source above; current LIVE capture-only authority remains c03d860 | Existing checkpoint identifies missing fresh authorization immediately before send, unknown SMTP-acceptance reconciliation, unproven restart duplicate reservation and sender classification. No release proof. | DEFERRED_FROM_RELEASE for new sending/connectors. Planning has no dependency on sending. |

## Overlap and dependency risks

Planning and paused auth both touch:

- `website/scripts/sportpaleis-pilot-foundation.mjs`
- `website/scripts/workspace-runtime.mjs`
- `website/src/sportpaleis-workspace.ts`
- `website/src/sportpaleis/pilot-api.ts`

Teamwear also changes these shared surfaces and runtime configuration. Both Teamwear and intake branch from merge-base `0e02b3cea7b5aac71449d76ee57a5bccebb841b7`. A whole-tree copy against current LIVE would undo later production commits. Only component-specific reviewed changes may be reconciled.

Planning snapshot has a separate file-backed work-item store. Session/capability checks outside that file transaction do not establish an atomic revoked-session write boundary. Production is MariaDB-only; no new file fallback is permitted.

Legacy role checks remain spread across the current runtime. A standalone permissionengine alone cannot be presented as backend enforcement or dynamic rights completion.

## Fresh central baseline tests

Executed on c03d860 plus independent unreferenced permission modules:

- Six production suites: **35 PASS, 0 FAIL**, including article truth, number orientation, color continuity, operator color choices, Today production practice.
- Standalone permissionengine: **13 PASS, 0 FAIL**. Includes presets, overrides, tenant isolation, private/shared scope, expiration, version conflicts, audit, non-escalating owner operations, read-only preview and fail-closed legacy mapping.
- Permission compilation, 2,000 local samples: p50 **0.0071 ms**, p95 **0.0169 ms**. This is engine-only, not authenticated HTTP latency.

These are not combined release acceptance. Browser/mobile, durable config, API denial, revoked-session concurrency, full intake handoff and LIVE smoke remain unproven.

## Release gate

No combined candidate, release artifact/hash or deployment yet. Previous LIVE manifest base freeze is `SPW-COMPOSITION-COLORS-HOTFIX-20260908-23C9F98`, commit `23c9f9802f19a4a4ecd009c0366098fbc95a45c3`; the actual rollback for a future deployment must preserve the current c03d860 artifact and be verified immediately before switching.

No claim of REVIEW_READY or LIVE_PROVEN is made by this inventory.
