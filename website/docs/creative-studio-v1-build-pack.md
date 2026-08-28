# Sportpaleis Creative Studio V1 — build and evidence pack

## Scope and baseline

- Isolated branch: `codex/spw-creative-studio-foundation-20260828`
- Proven parent: `3cd3e9574e76adbe76af2efaf78432b104a0cfb1`
- No deployment, production mutation, external publication, mail send, PlotJob or production-profile change.
- Existing Visual Studio composition, catalog snapshots, Library source/version hashes, optimistic revisions, autosave and Human Review gate were reused.
- Existing Teamwear, Teamkit, Production Assets, production profiles and physical dimensions remain canonical and unchanged.

## Capability status

| Capability | Status | Evidence / boundary |
|---|---|---|
| Intent-first campaign start | PROVEN | Three employee intents; no blank canvas or mandatory prompt. |
| Meaningful creative directions | PROVEN | Editorial impact, Performance energy, Product precision and Club pride. |
| Canonical product and Library truth | PROVEN | Immutable article and asset source hashes remain part of every composition hash. |
| Homepage, social, story and mail | PROVEN | Each channel gets its own crop, focal scale, safe inset, copy anchor and render hash. |
| Teamwear proof | PROVEN / CONSTRAINED | Same source truth; no width/height/rotation/skew controls and no production-profile mutation. |
| Autosave and revisions | PROVEN | Existing optimistic revision contract retained; browser persistence tested. |
| Human Review | PROVEN | Review is explicit; publishing is absent. |
| Raster preflight | PROVEN | MIME/size/dimensions, source class, official-vector preference and honest refusal. |
| Self-hosted raster→SVG | PROVEN CANDIDATE | Real SVG paths from VTracer WASM; source and derivative hashes retained. |
| Side-by-side vector comparison | PROVEN CANDIDATE | Original and derivative use private authenticated routes. |
| Automatic promotion to canonical Library source | PARKED | Deliberately absent; Human Review must precede any later promotion design. |
| External Vectorizer.AI fallback | PARKED / CONNECT LATER | No credential or outbound transfer added. |
| Adobe workflow | QUALITY BENCHMARK ONLY | No Adobe integration built. |
| Free Teamwear resizing/distortion | REJECTED | Conflicts with existing production truth. |

## Vector engine benchmark

### Decision

`@visioncortex/vtracer` `1.0.0-alpha.3` is the active candidate because it is self-hosted, CPU/WASM based, requires no native service, has zero per-image external cost and is licensed `MIT OR Apache-2.0`. Its output is treated as a proposal, never as production truth.

Vectorizer.AI remains an optional commercial comparison/fallback. Its official API supports programmatic vectorization and test mode, but production calls are credit based and would transmit customer artwork to an external processor. No connector or credential was added. Sources: [API documentation](https://vectorizer.ai/api/documentation), [pricing](https://vectorizer.ai/pricing), [privacy policy](https://vectorizer.ai/policies/privacy).

Adobe Illustrator Image Trace remains the human quality benchmark for difficult artwork, especially gradients, transparency, shapes and grouping. No automated integration is justified in V1. Source: [Adobe Image Trace options](https://helpx.adobe.com/illustrator/desktop/manage-objects/traces-mockups-symbols/image-trace-panel-options.html).

VTracer source and licensing evidence: [official repository](https://github.com/visioncortex/vtracer), [official README](https://github.com/visioncortex/vtracer/blob/master/README.md?plain=1).

### Local benchmark result

- 12 representative generated, tenant-neutral fixtures.
- 8 produced real SVG candidates.
- 4 correctly held or rejected: text-heavy wordmark, scanned artwork, photography, and a raster for which an official vector was declared available.
- Candidate latency on the local CPU fixture set: 1–59 ms.
- Output complexity: 1–16 SVG paths in this bounded fixture set.
- Bad JPEG and multicolor sources remain Human Review and carry explicit color/detail warnings.
- Photos are rejected as logo-vector candidates.
- Text-heavy logos prefer official sources and fail closed.

The benchmark is a route-selection proof, not a claim that these fixtures establish universal logo fidelity. Visual equality and production suitability remain human decisions.

## Safety and provenance

- Original raster bytes and SHA-256 are retained in isolated candidate state.
- Derived SVG, SHA-256, geometry hash, engine version/options, latency and warnings are retained separately.
- Bootstrap responses strip raster bytes and SVG bodies; authenticated private endpoints serve review media.
- Duplicate source hashes reuse one draft.
- Candidate state is `HUMAN_REVIEW_REQUIRED` and records `canonicalPromotionPerformed: false`.
- Official vector availability stops automatic tracing.
- Photography and complex/text-sensitive inputs fail closed.
- No source is overwritten.
- No customer data leaves Workspace through this implementation.

## Experience evidence

- `docs/evidence/creative-studio-v1/creative-studio-desktop-1440-final.png`
- `docs/evidence/creative-studio-v1/creative-studio-mobile-390.png`
- `docs/evidence/creative-studio-v1/creative-studio-mobile-390-controls.png`
- `docs/evidence/creative-studio-v1/creative-studio-mobile-390-performance-final.png`
- `docs/evidence/creative-studio-v1/creative-studio-mobile-320-final.png`
- `docs/evidence/creative-studio-v1/creative-vector-mobile-390-final.png`

Browser review uses the local isolated runtime only. Desktop 1440×900, 390×844 and 320×700 showed no horizontal page overflow. Direction selection persisted after autosave and reload. Browser console contained no warnings/errors during the reviewed path.

## Known limitations / NO-GOs

- Output is not claimed production-ready without human source comparison.
- Text/wordmark vectorization is deliberately withheld because character shape and kerning risk is material.
- Complex photographic or scanned imagery is not converted to a logo SVG.
- No external publishing, media provider, AI image generation or Adobe/Vectorizer.AI connector exists.
- No layer editor, Photoshop clone, Illustrator clone or unrestricted canvas exists.
- Creative Studio does not change Teamwear physical dimensions or production profiles.
- Browser automation could not select a local fixture file through the connected external-browser file chooser; the exact upload/service/persistence path is nevertheless covered end-to-end by the isolated API regression test.

Maximum lifecycle status: `CANDIDATE_VISUAL_REVIEW_READY`.
