# Sportpaleis Review Mode Foundation V1 — Control Plane handoff

## Scope

Review Mode is an administrator-only render and interaction boundary inside the existing Sportpaleis Workspace. It does not approve or deploy a release. The first candidate projects the prepared Library + existing Teamkit integration and uses disposable browser-session state.

## Production anchor and source

- Observed active release and immutable source parent: tag `WBD-MAIL-WEB-PUSH-COUNTER-CONTRACT-R2-20260826`, commit `766d9a614bd2ff56704a91e4b0204e03dd5479c6`.
- This parent already contains the R2 mobile-navigation baseline and the active Mail/Web Push counter contract; both remain acceptance and stale-state gates for controlled activation.
- The Review Mode behavior is the unchanged forward-port of candidate commit `1d0bae1208e1fedd9dd935faa93743b6044e77ce`.
- No production deployment or mutation occurred during preparation.

## Authorization

`SPORTPALEIS_REVIEW_PRINCIPAL_IDS` is an optional, non-secret comma-separated allowlist of canonical IDs. Empty or invalid configuration fails closed. Authorization additionally requires an active customer seat, administrator role and the existing Teamwear exposure. Donovan's canonical ID was verified read-only against the existing identity foundation and must be supplied to the Control Plane through runtime configuration; display name or e-mail are not authorization keys.

## Side-effect classification

| Candidate capability | Classification |
| --- | --- |
| Library projection | `READ_SAFE` |
| Teamkit review draft | `CANDIDATE_STATE_ONLY` |
| Proof/customer approval | `SIMULATED` |
| Uploads | `DISABLED` |
| Orders, production, mail, external APIs | `FORBIDDEN` |

All non-GET routes below `/api/sportpaleis/v1/reviews` fail with `REVIEW_SIDE_EFFECT_FORBIDDEN`. The candidate client has no production API or network authority and persists only to disposable `sessionStorage`.

## Failure and rollback

The candidate bundle is lazy-loaded only after exact authorization and route selection. Load failure renders “Candidate tijdelijk niet beschikbaar”; LIVE remains available. Rollback is code/config only: remove the allowlist or revert this release. No schema migration or data rollback is required.

## Control Plane gates

1. Verify active release still equals the observed Mail/Web Push counter + R2 anchor (stale-state guard).
2. Verify the immutable artifact declares that exact active commit as its base freeze.
3. Configure only the verified canonical Donovan principal.
4. Run authorization, side-effect, tenant-isolation, desktop, 390px and 320px checks.
5. Produce a release summary and wait for the required Human GO. Do not manually deploy.
