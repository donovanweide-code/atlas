# Teamwear source-to-experience recovery

Recovered from the approved Teamkit V1 candidate report, the Teamwear convergence report, commits `303a6a6`, `7a0d1a9`, `e5bc6ac`, `fe223ce`, the three Teamwear regression suites, and the current Final Consolidation implementation. This matrix describes existing approved scope; it does not introduce a second Teamwear architecture.

| ID | Teamwear source | Requirement | Current implementation | UX experience | Evidence | Status |
|---|---|---|---|---|---|---|
| TW-001 | Convergence §entry | One general Teamwear entry | First-class Teamwear route and entry page | Employee can start from one Teamwear area | `teamwearEntry()`; convergence test | DONE |
| TW-002 | Convergence §entry | Existing relationship context | Relationship projection includes associations, customers and teams | Existing context is visible | `buildTeamwearRelationships()` | ALREADY CORRECT |
| TW-003 | Convergence §entry | New customer/context | Proposal supports an optional association and free customer/team context | New context is possible | proposal create contract | ALREADY CORRECT |
| TW-004 | Convergence §entry | Context choice must actually carry into proposal | Context cards now select and carry the relationship into proposal creation | Existing context starts the intended proposal without retyping | `data-teamwear-context-select`; first-day test | DONE |
| TW-005 | Final Consolidation | Minimal initial intake | Initial view asks only relationship context, title and team | Employee can start before optional administration | `teamkitProposalCreate()`; first-day test | DONE |
| TW-006 | Final Consolidation | Progressive disclosure | Optional contact, deadline and notes live behind one details disclosure | Extra context appears only when needed | `teamkitProposalCreate()`; source contract test | DONE |
| TW-007 | Candidate §request | Customer request mail | Existing Mail Foundation prepares a request with private link | Human reviews before capture/send | `PROPOSAL_CUSTOMER_INTAKE`; proposal tests | ALREADY CORRECT |
| TW-008 | Candidate §intake | Private intake without Workspace login | Signed proposal-scoped token route | Customer can enter context safely | public proposal route tests | DONE |
| TW-009 | Candidate §intake | Draft then explicit submit | Intake has draft and submitted states | No accidental final submission | proposal tests | DONE |
| TW-010 | Candidate §mobile | 390/320 intake contract | Responsive rules exist | Mobile structure present; screenshot evidence pending | proposal CSS/tests | ALREADY CORRECT |
| TW-011 | Candidate §sources | SVG/EPS/AI/vector-PDF/PNG/JPG upload | Six formats accepted with bounded size | Employee can retain real production sources | source upload tests | DONE |
| TW-012 | Candidate §sources | 8 MB/file and 24 MB/proposal limits | Server-side limits | Oversize sources fail clearly | proposal source service | ALREADY CORRECT |
| TW-013 | Candidate §sources | Prefer genuine vector source | SVG is inspected; EPS/AI/PDF retained for review | Vector-first guidance appears in intake | candidate report/tests | DONE |
| TW-014 | Candidate §sources | Never discard original quality | Immutable original bytes plus safe preview | Preview never replaces source | source hash tests | DONE |
| TW-015 | Candidate §sources | Fail closed for unsafe SVG | Active/external/font/raster-dependent SVG rejected | Unsafe source cannot become production-ready | source inspector tests | ALREADY CORRECT |
| TW-016 | Candidate §sources | Raster quality warning | Raster never auto production-ready | Better source is requested when needed | proposal source cards/tests | DONE |
| TW-017 | Candidate §storage | Immutable central source | Filename, MIME, format, hash, timestamp, uploader, proposal, association and version retained | Source survives revisions | service tests | DONE |
| TW-018 | Candidate §assets | Reuse central Production Assets | Hash-identical promotion to existing source/asset foundation | No second asset library | asset promotion tests | DONE |
| TW-019 | Candidate §assets | Multi-asset SVG reuse | Existing group/object review route is reused | Structured SVG can yield separate assets | Production Asset tests | ALREADY CORRECT |
| TW-020 | Convergence §assets | Context-scoped asset projection | Association assets and proposal sources are projected, not copied | Only relevant assets appear | `buildTeamwearAssetLibrary()` | DONE |
| TW-021 | Final Consolidation | No unrelated internal assets in Studio | Context filter exists | Internal Pioneers/Hockey assets do not leak | convergence test | DONE |
| TW-022 | Candidate §assets | Sponsors as selectable assets | Sponsor application kind is projected | Linked sponsor assets are selectable | `clubAssetCard()` | ALREADY CORRECT |
| TW-023 | Convergence §catalog | Central Product Truth | CatalogArticle + brand-independent projection | Teamwear does not own product masters | `buildTeamwearCatalog()` | ALREADY CORRECT |
| TW-024 | Convergence §catalog | Catalog outside Studio | Catalog and collection live before Studio | Product discovery is separated from design | `clubHome()`/`studio()` | DONE |
| TW-025 | Convergence §catalog | Search/filter catalog | Bounded search, use and audience filters | Employee can find products quickly | catalog tests | DONE |
| TW-026 | Convergence §catalog | Group variants as one model | Model/colour/audience projection | Size SKUs do not flood discovery | catalog projection tests | ALREADY CORRECT |
| TW-027 | Convergence §catalog | Lazy product media | Images use lazy loading | Discovery does not eagerly load all media | `catalogProductCard()` | ALREADY CORRECT |
| TW-028 | Convergence §catalog | Bounded 5k adapter contract | Cursor/query contract exists; controlled fixtures are active | UI is bounded but authoritative supplier feed is not connected | convergence report/test | HUMAN INPUT REQUIRED |
| TW-029 | Convergence §collection | Add selected products to one collection | Existing proposal items are collection truth | Chosen garments become the collection | add-collection handler/test | DONE |
| TW-030 | Final Consolidation | Compact chosen garments | Studio item rail contains selected items only | Employee switches garments without catalog noise | `sp-studio-itemrail` | DONE |
| TW-031 | Candidate §editor | Multi-product Teamkit | Proposal contains multiple items | One kit holds full clothing set | proposal tests | ALREADY CORRECT |
| TW-032 | Final Consolidation | Guided Context → Collection → Studio → Sizes → Proposal → Handling | One state-driven stepper links the six existing stages | Employee always sees the current and next step | guided stepper; first-day test | DONE |
| TW-033 | Final Consolidation | Studio is design workspace | Catalog is removed from visible Studio | Canvas is primary | `studio()`/reconciliation test | DONE |
| TW-034 | Final Consolidation | Garment canvas dominant | Large central garment stage | Design is visually central | studio CSS | DONE |
| TW-035 | Candidate §editor | Front and back views | Separate FRONT/BACK render | Both sides are editable | editor tests | ALREADY CORRECT |
| TW-036 | Final Consolidation | Relevant garment views | Front/back switch and item rail | Relevant views are discoverable | studio markup | DONE |
| TW-037 | Candidate §placements | Chest/back/sleeve/short/pants/bag presets | Canonical presets retained | Placement starts safely | proposal tests | ALREADY CORRECT |
| TW-038 | Final Consolidation | Placement understandable without Donovan | Named position selector and direct garment interaction | Chest/back/sleeve are understandable | properties panel | ALREADY CORRECT |
| TW-039 | Final Consolidation | Surface/clip direction | Garment print-area coordinates and surface bounds | Art stays on supported garment surface | `GARMENT_PRINT_AREA_V1`; tests | DONE |
| TW-040 | Final Consolidation | Perspective/warp where supported | Sleeve surface transform uses rotation/skew/perspective | Sleeve artwork follows supported geometry | studio placement CSS | ALREADY CORRECT |
| TW-041 | Final Consolidation | Clip within garment/print area | Placement body and print-area bounds clip/limit content | No floating off-garment elements | surface clamp tests | ALREADY CORRECT |
| TW-042 | Convergence §interaction | Direct drag | Pointer interaction updates coordinates | Employee manipulates canvas directly | convergence test | DONE |
| TW-043 | Convergence §interaction | Resize with aspect lock | Resize handle preserves ratio | Source is not distorted | convergence test | DONE |
| TW-044 | Convergence §interaction | Snap/guides | Safe surface clamp and alignment actions | Placement can be made precise | Studio handlers/tests | DONE |
| TW-045 | Convergence §interaction | Align/layers | Align X/Y and layer front/back | Common arrangement actions exist | Studio toolbar | DONE |
| TW-046 | Convergence §interaction | Duplicate/delete | Existing selected placement actions | Fast composition editing | handlers/tests | DONE |
| TW-047 | Convergence §interaction | Undo/redo/reset | Client history and safe reset | Mistakes are recoverable before save | handlers/tests | DONE |
| TW-048 | Convergence §interaction | Non-destructive colour override | Visual colour stored beside immutable source | Original source remains intact | composition tests | ALREADY CORRECT |
| TW-049 | Final Consolidation | Direct Logo action | Studio toolbar exposes Logo directly and filters context assets | Logo placement starts from the design workspace | Studio toolbar; first-day test | DONE |
| TW-050 | Final Consolidation | Direct Sponsor action | Studio toolbar exposes Sponsor directly and filters context assets | Sponsor placement is immediately findable | Studio toolbar; first-day test | DONE |
| TW-051 | Final Consolidation | Direct Name/number action | Studio toolbar exposes Naam & nummer with the existing semantic application types | Employee can add the intended text/number decoration | Studio toolbar; first-day test | DONE |
| TW-052 | Final Consolidation | Direct Free print action | Free text action exists | Immediately available | Studio markup | ALREADY CORRECT |
| TW-053 | Final Consolidation | Direct Upload action | Proposal source upload exists in Studio | New source can be added | Studio markup | ALREADY CORRECT |
| TW-054 | Final Consolidation | Contextual properties | Selection panel shows label, text, colour, position, size and route | Only relevant properties appear after selection | Studio properties | DONE |
| TW-055 | Candidate §text | Initials/name/back/short/free text semantics | Canonical placement kinds exist | Production meaning remains explicit | workspace data/tests | ALREADY CORRECT |
| TW-056 | Convergence §context | Reuse known customer/association/team | Proposal holds stable context IDs/snapshots | Known context is not duplicated in data | relationship tests | ALREADY CORRECT |
| TW-057 | Final Consolidation | Do not ask known context again | Selected relationship pre-fills association, customer and team server-side | Known context is not requested twice | create handler; first-day test | DONE |
| TW-058 | Convergence §teamorder | Teamorder is sole sizes/people/quantity model | Handoff targets existing Teamorder route | No parallel roster model | production RC2 tests | DONE |
| TW-059 | Final Consolidation | Sizes & quantities after design | Studio CTA hands off only after composition | Sequence is correct | `teamwearTeamorderHandoff()` | DONE |
| TW-060 | Final Consolidation | No duplicate input | Handoff carries proposal/context/article IDs | Known products/context are prefilled | Teamorder handoff tests | ALREADY CORRECT |
| TW-061 | Candidate §preview | Customer-worthy preview | Separate branded preview exists | Internal UI is absent | preview tests | DONE |
| TW-062 | Candidate §pdf | Customer PDF | PDF 1.7 route renders proposal snapshot | Customer-ready downloadable artifact | PDF tests | DONE |
| TW-063 | Candidate §feedback | Per-proposal/item feedback | Feedback is revision-bound | Customer feedback stays in context | proposal tests | DONE |
| TW-064 | Candidate §approval | Explicit exact-version approval | Name/email/token/revision and hashes recorded | Approval is unambiguous | approval tests | DONE |
| TW-065 | Candidate §revision | Immutable revisions | V1…Vn, stale-write protection | Old decisions are never overwritten | concurrency tests | ALREADY CORRECT |
| TW-066 | Candidate §evidence | Immutable PDF/preview/approval | Snapshot, preview and PDF hashes retained | Approved output is reproducible | integrity verifier/tests | DONE |
| TW-067 | Final Consolidation | One approved composition truth | Preview, PDF and downstream derive from the same immutable revision snapshot | No second editable design truth | proposal renderer + composition projection | ALREADY CORRECT |
| TW-068 | Convergence §export | Deterministic image render spec | Square render spec derives from central composition | Operational exports can use the same geometry | convergence test | DONE |
| TW-069 | Candidate §mail | Mail/handling after proposal | Existing Mail Foundation prepares customer/supplier context | Human reviews before capture/send | proposal workspace/tests | ALREADY CORRECT |
| TW-070 | Candidate §fulfillment | Internal/external/unresolved per placement | Immutable fulfillment tasks | Mixed routing is supported | production RC2 tests | DONE |
| TW-071 | Candidate §fulfillment | Internal path reuses order/production truth | Approved internal task materializes controlled Workspace order; no auto PlotJob | Existing production gates remain | production RC2 tests | DONE |
| TW-072 | Candidate §history | Search, history, copy/new season | Universal Search and immutable history/copy | Proposal can be found and reused | Search/proposal tests | ALREADY CORRECT |
| TW-073 | Candidate §security | Private token/file security | Random hashed token, expiry, revoke, rate/origin/CSRF/CSP/noindex | External access is scoped | security tests | ALREADY CORRECT |
| TW-074 | Candidate §roles | Existing roles/permissions | Admin/operator/store reused | No Teamwear-only roles | authorization tests | ALREADY CORRECT |
| TW-075 | Final Consolidation | Sportpaleis black/white/anthracite/red | Final tenant layer forces active, focus, feedback and selection states to ink/red | Teamwear is consistently Sportpaleis-branded | final CSS tenant overrides; source test | DONE |
| TW-076 | Final Consolidation | Modern controls, no pill excess | Final component layer uses controlled radii and reserves rounded chips for compact status/filter context | Controls are modern without capsule overload | Teamwear CSS contract; source test | DONE |
| TW-077 | Candidate §accessibility | Keyboard/touch/semantic controls | Buttons, labels, toolbar and focus paths exist | Core flow is operable without hover | markup/tests | ALREADY CORRECT |
| TW-078 | Final Consolidation | Desktop/mobile Teamwear | Responsive structure exists | Product functionality is responsive; fresh screenshot proof unavailable | CSS contract/browser availability | ALREADY CORRECT |
| TW-079 | Final Consolidation | Catalog performance acceptance | Bounded projection, lazy images and candidate render measurement are proven | Catalog render remains bounded at production-shaped history volume | `PERFORMANCE-EVIDENCE.md`; 2.980 ms median | DONE |
| TW-080 | Final Consolidation | Studio client-render performance | Candidate source is rendered through Vite SSR against production-shaped state | Studio render remains bounded at production-shaped history volume | `PERFORMANCE-EVIDENCE.md`; 7.277 ms median | DONE |
| TW-081 | Final Consolidation | First-day employee can complete Teamkit | Full source-to-experience scenario asserts context, collection, Studio tools, sizes, proposal and handling | Every primary step is discoverable and complete in the candidate contract | `sportpaleis-first-day-employee-acceptance.test.mjs` | DONE |
| TW-082 | Final Consolidation | Before/after desktop and 390px evidence | Responsive product contract and earlier real Premium Shell evidence remain valid; current candidate browser capture has no available automation instance | Product remains responsive; only fresh automated screenshot capture is unavailable | responsive tests; browser list `[]`; existing evidence pack | ALREADY CORRECT |
| TW-083 | Candidate boundary | Authoritative supplier catalog feed/credentials | Adapter seam exists, controlled fixtures active | Cannot claim live supplier sync without external source | convergence report | HUMAN INPUT REQUIRED |

## Recovery summary after remediation

- Existing approved Teamwear requirements found: **83**
- DONE / ALREADY CORRECT: **81**
- NOT DONE: **0**
- HUMAN INPUT REQUIRED: **2**

All safe gaps recovered from the existing approved Teamwear sources are implemented. The two human-input rows are one underlying external truth: an authoritative supplier catalog feed/access agreement and its credentials/contract. They are intentionally not guessed or replaced with a parallel catalog. Fresh automated screenshots remain an evidence-tool limitation, not a product-functionality gap: the normal Workspace URL is browser-accessible while the in-app browser inventory for this run returned no browser instance.
