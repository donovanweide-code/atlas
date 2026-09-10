# Practical number/input hotfix — reconciliation

> Historical read-only reconciliation. The blocker below was explicitly resolved by Donovan's subsequent spacing-authority correction: SVG/glyph sources without native metrics retain 18 mm as FALLBACK_SPACING_AUTHORITY. See PRACTICAL-NUMBER-HOTFIX.md for the resumed implementation and gates.

Status: BLOCKED — reliable composition authority is missing for existing non-font hockey number sources; preserving their current executable output conflicts with removing generic spacing without inventing typography.

## LIVE authority

Observed 2026-09-10T20:41:41Z: `/srv/wbd/releases/SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860`, commit `c03d8604cb1ce232c73a34f8996d0ad193f17024`. `wbd-workspace.service` active; entrypoint `/srv/wbd/current/website/scripts/workspace-runtime.mjs`, Node 22.23.2.

Isolated branch `codex/spw-practical-number-input-20260910` starts at this exact commit. Five relevant runtime modules match local source SHA-256 after converting Windows checkout CRLF to Git/LIVE LF. Hashes and measured output are in `live-reconcile.json`. No executable code was edited, no production state mutated, no release built or deployed.

## Actual codepaths

- `production-assets.mjs:10–16`: generic 18 mm constant and source-key-specific Pioneers 5 mm resolver. `productionAssetPiece` and `productionAssetPieces` both use it.
- `sportpaleis-pilot-foundation.mjs:8788`: managed-font numbers are split into individual digit pieces, then regrouped with 18 mm (`8820`). Existing full-text font composition must instead remain authoritative, while retaining production/group provenance.
- `direct-print/semantic-groups.ts:38–59`: regrouping positions normalized digit contours at a uniform physical gap. Removing metadata alone would activate another fixed fallback (6.4 mm), not native spacing.
- `verified-production-number-sources.mjs:219`: generated number assets receive generic 18 mm metadata; it is not independent source-specific authority. Glyph records contain candidate ID, hash, width, height and contours only.
- `sportpaleis-pilot-foundation.mjs:5876`: promoted SVG number sets also receive generic 18 mm metadata.
- Standard initial identifier input already uses `[A-Za-z0-9]{0,5}` in `sportpaleis-workspace.ts:597`. Backend personalization preserves `initials` and limits its length to five; production uses INITIALS in that context. No letters-only correction identified in this standard path. AA/JS/14 have not been end-to-end smoke-tested.
- Pioneers profile currently describes name height 20 mm/max width 90 mm. `managed-font-production.mjs` uses height-led geometry and records width as legacy requested width. Exact front-name width 90 mm is therefore not proven; it requires a scoped width rule and tests, not a generic font-sizing change.

## Read-only LIVE artifact measurements

`practical-number-reconcile.mjs` was piped to Node over SSH and imported the current release's source modules. Synthetic contours were computed in memory, without calling an order service or reading/writing customer records. An initial attempt failed because a frontend TypeScript source is intentionally absent from the runtime artifact; the corrected probe excludes that file and completed successfully.

| Source | Values | Contour gaps | Height | Mirroring |
|---|---|---|---|---|
| hockey-rug-200 | 11, 14, 44 | 18 mm each | 200 mm | true |
| hockey-short-75 | 11, 14, 44 | 18 mm each | 75 mm | true |
| pioneers-rug-senior-200 | 11, 14, 44 | exactly 5 mm each | 200 mm | true |

The inventory also contains the separate `pioneers-short-80` source, which gives 18 mm; this does not establish that current Pioneers orders select it. Do not broaden the 5 mm exception by club name: preserve authoritative source binding.

## Blocking decision and remaining gates

The inspected original/generated hockey sources and targeted tests provide no source-natural advance, side-bearing, kerning or proven reference-composition metadata. Their present 18 mm comes from the withdrawn global default. Glyph-sheet coordinates are not evidence for arbitrary digit-pair composition. No value was inferred from them.

Failing closed for these sources is the correct typography fallback, but it would prevent previously executable hockey multi-digit output. Consequently the requested existing-production regression gate cannot be green without a reliable source-specific composition rule/reference. This needs source authority, not a central release, storage migration or new typography engine.

Native font combinations, DCG 14/44/18, back/short/chest equivalence, exact front-name 90 mm, alphanumeric semantic/safety tests, reversible shirt copies, Waterwijk source/sizing, production-critical regressions and performance remain unexecuted. They are not claimed as PASS. No hotfix commit, release ID, artifact hash or post-deploy LIVE smoke exists. Previous LIVE remains the current release; no rollback was necessary. The old spacing and unproven exact front-name width remain live.
