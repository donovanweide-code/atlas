# Webshop BLAUW authority and release candidate

The previous BLAUW blocker was a verification gap, not a missing Product Truth rule. The earlier audit inspected only `productionProfiles.foilColor` and missed the existing article override. No production rule or parser behavior has been changed in this batch.

## Authority

- Current LIVE: `SPW-PRACTICAL-NUMBER-INPUT-20260910`, commit `76a7aaf72bcf44cb4e01b51e434c410093445565`; domain revision 9797, verified read-only on 2026-09-14.
- Article `sp-live-141598`, SC Buitenboys WEDSTRIJD SHIRT, article revision 7: `foilColorOverride: Blauw`.
- Profile `profile-source-sc-buitenboys-backNumber`; the existing canonical resolver applies the article override before the association/profile fallback.
- Existing ordinary LIVE orders include SP-2026-0167, SP-2026-0153 and SP-2026-0146 with that article, BLAUW and profile. No LIVE orders were created or changed for this inspection.
- The tracked catalog already contains this override, introduced by `6fa4fdd` on 2026-08-28. The historical SC Buitenboys 34 production fixture and consolidation report also preserve BLAUW Rug 34 beside WIT Short/Rug 34.
- Garment color WIT is distinct from BLAUW foil. No PDF color is promoted to production authority.

## Regression

The existing 30-order fixture retains all 36 original rows and adds three authoritative article 141598 rows (39 total), Junior and Senior, with rugnummer 34. The test never updates an article/profile. It asserts the seeded rule, canonical font source, unchanged Product Truth hashes, exact color-group line coverage, no duplicate/cross-color lines, separate completion, pickup, idempotency and delete/reimport.

Multi-color orders use the existing `createProductionJob` continuation for their already-reserved next proposal group. Creating a second proposal for that group is correctly rejected by the canonical flow. The test now follows the operator flow.

## Local checks and release boundary

The 103 relevant regressions and 15 real-PDF/mail canonical E2E tests pass. Workspace build passes. Separate 10-reader/5-interactive concurrency passes with independent selections, edit/exclude conflict detection and one handoff receipt. Cold browser orderdetail: p50 299 ms, p95 302 ms; images preserved. Storage remains duplicate PDF/full text/full order archive = 0/0/0.

LIVE commit 76a7aaf is an ancestor of the candidate. Runtime entrypoint and catalog/config match that baseline; the forward diff is webshop intake plus its tests/review surfaces. LIVE mail polling remains active every two minutes (20:14, 20:16, 20:18 UTC).

The server's existing immutable `inspect` preflight passes. Rollback baseline is the current immutable release above. The current candidate builder requires artifact-bound Sportpaleis production-shaped assurance v4 and WBD Owner assurance v1. The installed deployment helper does not contain those newer gates. Its older behavior must not be used to skip the candidate's required assurance. Final release outcome and artifact hashes are recorded separately after gate execution. No customer-mail audit precedes complete release acceptance.
