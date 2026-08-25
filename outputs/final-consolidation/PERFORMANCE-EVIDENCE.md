# Sportpaleis Final Consolidation performance evidence

Candidate measurement uses the actual Workspace renderer through the Vite SSR transform, a production-shaped state with 2,000 historical orders and 2,000 historical PlotJobs, and the existing 23-piece production acceptance fixture. Measurements are local process timings intended to isolate datastore/server/payload/client work; they are not invented browser-network timings.

## Structural before → after

| Layer | Before | After | Result |
|---|---:|---:|---|
| Daily bootstrap orders | 2,010 unbounded | 120 recent completed + all active | bounded |
| Daily bootstrap PlotJobs | 2,004 unbounded | 24 recent + all active | bounded |
| Default history page | complete list | 40, maximum 80 | bounded/cursor-based |
| Modeled serialized bootstrap | 9,449,602 bytes | 1,248,369 bytes | 86.8% smaller |
| Full order history access | eager in every page | server-side search/cursor/detail on demand | preserved |
| Full PlotJob/reprint access | eager in every page | server-side search/cursor/detail on demand | preserved |

## Isolated candidate timings

| Stage | Measurement |
|---|---:|
| Production-shaped datastore fixture read | 237.085 ms |
| Server bootstrap computation | 293.857 ms |
| JSON serialization | 4.795 ms |
| Client search index/query | 3.461 ms |

No synthetic network timing is claimed because this run has no controllable browser instance. Payload size is measured directly, and pure client rendering is measured independently below.

## Primary flow render medians

| Flow | Candidate median |
|---|---:|
| Vandaag | 0.514 ms |
| Orders | 0.121 ms |
| Webshop | 0.029 ms |
| Zoeken | 8.001 ms |
| Productie / Wachtrij | 0.484 ms |
| Bibliotheek | 0.102 ms |
| Beheer / Guided Setup | 0.278 ms |
| Historie | 1.120 ms |
| Teamwear start | 0.094 ms |
| Teamwear Collectie | 2.913 ms |
| Teamwear Studio | 6.167 ms |
| Voorstel | 0.304 ms |

## Production proposal 23 pieces

| Measurement | Before | Proven optimized baseline | Latest full-suite measurement |
|---|---:|---:|---:|
| Total proposal response | 3,792.1 ms | 2,393.1 ms | 2,281.3 ms |
| Server snapshot computation | — | — | 1,858.7 ms |
| Nesting stage | — | — | 1,767.8 ms |

The latest measurement remains 39.8% faster than the original practice baseline. Geometry, quantities, dimensions, mirror, rotations, placements and SVG output remain identical for equal input. Deterministic artifact SHA-256 remains `8D3FF8E481166E1A834C41DAD93ADE8DC6ED7781DD013EE9614920AD7B711EF8`; repeated request/idempotency regression is PASS.

## Acceptance

- Daily active working set is bounded independently of history growth: PASS.
- Orders and PlotJobs remain searchable and page-based: PASS.
- History detail, audit and exact reprint remain available on demand: PASS.
- Teamwear catalog and Studio are measured explicitly: PASS.
- 23-piece production output equivalence and duplicate-request protection: PASS.
- Primary-flow performance regression gate: PASS.
