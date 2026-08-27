# Sportpaleis Current Candidate Consolidation — 2026-08-27

## Baseline en scope-lock

- LIVE baseline: `SPW-REVIEW-MODE-FOUNDATION-V1-R2-20260826`, commit `3c06f5a59298135b13f48ab569d93d5c7a75975f`.
- Candidate lineage: LIVE Review Mode Foundation plus de reeds bewezen R20 handover-completion (`9930ebf`), zonder oudere baseline terug te zetten.
- In scope: Library/bronnen, bestaande Teamwear/Teamkit, R20 Studio, production/source correctness, Guided Source Setup, gecontroleerde SVG-bron naar vereniging/Teamwear/directe productie, product-decoration separation, selecteerbare onbedrukte garments/tassen, bestaande sync, bewezen mobile/desktop-correcties en bestaande productie-invarianten.
- Review Mode gebruikt de echte Workspace-shell en echte bootstrap-context. Wanneer LIVE nog geen Teamwear-proposal bevat, maakt de client uitsluitend in memory een deterministische reviewcompositie uit bestaande artikel- en productieasset-truth. Formulieren, niet-hashlinks en muterende events worden binnen de Candidate-boundary tegengehouden.

## Bewust uitgesloten / afzonderlijk

- Secure Customer Review & Approval / zelfstandige klant-Studio: separate candidate/later; niet stil geïntegreerd.
- Naam op voorzijde en overige nog niet volledig geïnventariseerde name placements: roadmap, geen huidige handover-blocker.
- SC Buitenboys Spain-bron: `HUMAN SOURCE ACTION REQUIRED` zolang de authoritative bron niet is aangeleverd; geen substitutie of lookalike.
- Production mail E2E: niet opnieuw bewezen en zonder echte klantmail niet uitgevoerd; bestaande capture/fail-closed logica blijft behouden.
- Control Plane V1: frozen en ongewijzigd.

## Human Product Truth

- `NAAMBALK` blijft een composed application: `NAME + RUGNUMBER`.
- Beide componenten behouden afzonderlijk de bestaande bewezen Senior/Junior-profielen en fysieke regels.
- Er is geen nieuwe totale Naambalk-maat en geen Huizen-specifieke 220-mm-regel.

## Practical Reality Coverage

| Onderwerp | Status | Evidence / gevolg |
|---|---|---|
| Kledingmaat niet onnodig verplicht | PRESERVED | Teamwear collection en Studio werken vóór maten/aantallen; maten volgen na goedgekeurde compositie. |
| Clothing size ≠ production class | PRESERVED | Senior/Junior productieclassificatie blijft profieltruth en wordt niet uit een vrij kledingmaatveld afgeleid. |
| Senior/Junior + per-row override | PRESERVED | Bestaande production/profile resolver en gerichte regressies blijven intact. |
| Per-artikel/per-kleur identity | PRESERVED | Decoration identity behoudt article/order-line, type/placement, value, color en profile. |
| SC Buitenboys 34 | PRESERVED | BLAUW Rug 34, WIT Short 34 en WIT Rug 34 blijven afzonderlijke golden fixtures. |
| WIT/ZWART/kleurscheiding | PRESERVED | Open batches en kleurisolatie blijven alleen door fysiek `Bedrukt` sluiten. |
| Intern produceren / fysieke voorraad / extern | PRESERVED | Bestaande fulfillment routes blijven afzonderlijke canonical waarden. |
| VVA/Spartaan fysieke voorraad | PRESERVED | Webshop-only, idempotente voorraadmutatie; geen plotjob voor voorraadlogo. |
| Fonts versus number/glyph sources | IMPROVED | Library toont gecontroleerde Pioneers/Hockey vectorbronnen als productieassets; Spain blijft fail-closed. |
| Immutable reprint | PRESERVED | Nieuwe auditable execution verwijst naar origineel en overschrijft historie niet. |
| Mirror/layout/production sizing | PRESERVED | Canvasgeometrie blijft gescheiden van productie-mm; canonical production profile blijft leidend. |
| SVG → Illustrator → WinPlot → Summa | PRESERVED | Geen wijziging aan outputwriter, PlotJob-boundary of gevalideerde contours. |
| Teamkit multi-logo persistence | PRESERVED | Proposal/revision identity en assetreferences blijven in dezelfde canonical composition. |
| Product front/back truth | IMPROVED | Officieel achteraanzicht wordt gebruikt waar aanwezig; ontbrekend beeld blijft zichtbaar fail-closed. |
| White-background product imagery | PRESERVED | Originele bron blijft intact; transparante/vectorbron heeft voorkeur en kwaliteitsstatus blijft zichtbaar. |
| Tenant isolation | PRESERVED | Review is exact-principal, admin + bestaande pilot exposure, default-deny en Sportpaleis-only. |
| Schaalbare Library | IMPROVED | Candidate projecteert echte productiebronnen, bounded tot de zichtbare resultaten en blijft doorzoekbaar. |

## Validatie

- Workspace production build: PASS.
- Sportpaleis regressie: 454/454 PASS vóór de laatste uitsluitend Review Mode-integratiedelta; gerichte Review Mode/R20-suite wordt na freeze opnieuw gedraaid.
- Monorepo: 931/935; vier bestaande ontbrekende WBD Mail/Web-Push fixtures/artifacts buiten deze Sportpaleis-scope. Parallelle Mail Foundation bleef onaangeraakt.
- Real browser desktop: Candidate-label, LIVE-terugroute, echte Library en echte R20 Teamwear-render PASS; geen horizontale overflow.
- Real browser 390 px: Studio-controls minimaal 44 px, geen horizontale overflow, mobiele shell/hamburger aanwezig.
- Side-effect firewall: `Ontwerp opslaan` toont alleen session-notice; lokale production-shaped datastore SHA-256 bleef voor/na exact gelijk.

Materiële `MISSING` correctness binnen de gelockte candidate-scope: geen. De expliciet genoemde human-source/roadmap-items blijven buiten de candidate-freeze zonder bestaande veilige werking te verzwakken.
