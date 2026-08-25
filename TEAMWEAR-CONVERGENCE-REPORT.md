# Sportpaleis Teamwear convergence — RC2 review slice

Status: local review candidate; production unchanged.

## Implemented review-slice outcome

- General Teamwear entry supports a new collection, an existing relationship context and the unchanged fast Teamorder route.
- Association is optional. A context without an association now receives **zero** existing club articles/assets; it starts from the shared catalog instead of leaking the global article set.
- Existing associations reuse matching catalog articles, association logos and production-ready assets without copying their source records.
- Teamorder remains the sole people/size/quantity/personalisation foundation; Teamwear hands off known proposal and article context.
- Catalog discovery renders bounded results and keeps brand fixtures behind the generic adapter. A production 5K connector still requires a server-side feed/cursor implementation.
- Pricing has one deterministic projection/resolver and immutable proposal snapshots. Persistent policy administration is deliberately not part of this review slice.
- The internal Asset Library and Relationship Context are durable projection seams over existing records, not replacement databases. Full master-data management remains later work.
- Studio supports direct selection, pointer drag, resize with aspect lock, snap guides, alignment, layer order, duplicate/delete, undo/redo, front/back and non-destructive colour overrides.
- Proposal preview, revised landscape PDF, Mail preparation and the existing approval/evidence/production foundations are reused.

## Acceptance state

- Targeted Teamwear/Proposal/Production tests: **10/10 PASS**.
- Workspace build: **PASS**.
- Prior interactive walkthrough proved direct drag, resize, snap, align, layer, duplicate/delete, undo/redo, front/back, colour override, free print, Teamorder handoff and local PDF/Mail next steps.
- The browser binding disappeared immediately after the final context-isolation rebuild. Therefore the final-build screenshot set and final 390/320 interaction pass are **BLOCKED**, not inferred.
- Human review runtime remains available on the local network. No production environment, external mail, PlotJob or production order was touched.

## Evidence-led convergence

- **TEAMORDER OVERLAP FOUND:** YES
- **REUSABLE TEAMORDER CAPABILITIES:** optional association/contact, team context, bulk rows, participants, garment size, quantity, initials, names, back/short numbers, free print, existing production profiles, `WorkspaceOrder`, READY/ATTENTION validation and Human GO.
- **PARALLEL TEAMORDER MODEL:** prohibited. Teamwear collection/studio only hands chosen articles and context to the existing Teamorder route.
- **DUPLICATE MODELS CURRENTLY PRESENT:** proposal items reference catalog articles and intentionally snapshot approved visual/commercial truth; no second product master. Proposal uploads are proposal-scoped evidence and need an internal library projection rather than copied master assets.
- **CENTRAL PRODUCT TRUTH:** `CatalogArticle` plus the brand-independent `SportpaleisCatalogProduct` projection. Brand connectors populate that projection; Teamwear never owns products.
- **CATALOG SCALE CONTRACT:** bounded query result and lazy images. The public Stanno site proves an official 2026 flip/download catalogue and dealer portal, but no public structured feed/API; review fixtures remain behind the adapter seam. A production 5K feed/cursor connector is still required before claiming full 5K operational readiness.
- **CENTRAL ASSET LIBRARY GAP:** PARTIAL. `productionElements` is the production-authoritative master library. Association logos and immutable proposal sources need a deduplicated internal library projection with context-scoped customer visibility.
- **PRICING FOUNDATION GAP:** RESOLVED FOR SLICE. A central deterministic advice-price → base rule → relationship override → effective price resolver and immutable proposal price snapshot now exist; management UI/persistence is later.
- **COLOR OVERRIDE GAP:** RESOLVED FOR SLICE. Suitable vector/text placements receive a non-destructive colour override; original source is preserved.
- **GENERAL CUSTOMER/TEAM CONTEXT GAP:** RESOLVED FOR SLICE. Association/contact fields are optional and a general relationship projection is used.
- **CENTRAL RELATIONSHIP CONTEXT EXISTS:** PARTIAL
- **DUPLICATE CONTACT MODELS:** order and proposal snapshots contain contact fields; associations and asset owners are separate source records. They are evidence snapshots, not relationship masters.
- **TEAMORDER CONTACT CONTEXT REUSABLE:** YES, with optional contact fields and `teamContext`.
- **MAIL RELATIONSHIP SEAM:** proposal mail templates already consume proposal/contact context; recipient validation belongs at send/capture, not Teamwear discovery.
- **SUPPLIER RELATIONSHIP MODEL:** supplier article number exists; supplier organization/contact is not a first-class shared record yet.
- **SPONSOR RELATIONSHIP VS ASSET:** owner type/context exists on assets, but sponsor organization is not first-class. The minimal seam keeps sponsor organization reference separate from immutable asset/version.
- **SEARCH REUSE:** YES. Universal Search already indexes order, article, association, asset, proposal and production records. Teamwear adds searchable shared relationship terms; no Teamwear-only engine.

## Minimal convergence required

1. Add shared, projection-only Teamwear foundation contracts for relationship context, asset-library entries, pricing policies/quotes and Teamorder handoff.
2. Extend catalog projection with supplier, family/set, media, advice price, sync/provenance and bounded filtering; keep fixtures behind adapters.
3. Extend proposal placement/item snapshots only with immutable visual colour and commercial quote data; keep visual coordinates separate from production specifications.
4. Replace the association-first Experience entry with general Teamwear entry/context selection while retaining existing association context as one option.
5. Add Studio direct-manipulation controls: snap/guides, align, layer, duplicate, delete, undo/redo, reset and non-destructive colour for supported objects.
6. Hand selected articles/context to existing Teamorder; do not create a parallel persons/sizes/quantities model.
7. Reuse existing proposal/PDF/Mail/revision/approval and Teamkit→WorkspaceOrder production foundations unchanged.

## Harvest boundary

Generic/reusable candidates: Catalog adapters/projection, pricing policy resolver, relationship projection, asset-library projection, direct-manipulation primitives, proposal/review/PDF/Mail context and revision evidence.

Sportpaleis-specific: Teamwear terminology and steps, garment/print-area presets, production profiles, personalisation rules, TK numbering and Sportpaleis production transitions.
