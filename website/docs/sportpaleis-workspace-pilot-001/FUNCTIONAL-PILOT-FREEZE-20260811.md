# Sportpaleis Workspace — Functional Pilot Freeze

Datum: 11 augustus 2026  
Build-ID: `SPW-FUNCTIONAL-PILOT-FREEZE-001-20260811`  
Schema: `12`  
Oordeel: `PARTIAL` voor fysieke productieacceptatie; functionele lokale build `PASS`.

## Opgeleverd

- De prominente universele ingang **Nieuwe order** is vervangen door de werkcontexten **Verenigingsbedrukking** en **Vrije bedrukking**. Order blijft één intern model.
- Vrije bedrukking ondersteunt tekst, initialen, nummers, aantallen, mm-afmetingen en een beheerde fontbron. De individuele en gezamenlijke preview reageren direct.
- Winkel heeft geen logo-invoer of fontbeheer. Team/Productie heeft het uitgebreide generieke productieregelmodel met fonts, profielen, logo-/beeldmerkbronnen, reeksen en vrije maten.
- Fontbronnen worden technisch gevalideerd, gehasht en versiegebonden bewaard. Preview, order en PlotJob verwijzen naar dezelfde bron-ID, versie en SHA-256; er is geen systeemfontfallback.
- Logo-/beeldmerkbronnen houden visuele bron, vectorbron, gevalideerde snijcontour en fysiek bewezen contour afzonderlijk. Raster wordt niet stil gevectoriseerd en de beeldverhouding is server-side vergrendeld.
- Human GO maakt een immutable PlotJob-manifest met bronversies, productie­regels, nesting, oriëntatie, operator en tijd. Opnieuw plotten maakt een nieuwe auditable uitvoering vanuit de oorspronkelijke snapshot.
- Nesting rangschikt deterministische kandidaten eerst op minimale veilige rollengte en daarna op gebruikte breedte. Schaal blijft 1:1.
- Golden Physical Case 001 en Golden Physical Batch 001 zijn niet gewijzigd.
- De echte Liberation Sans-bron en licentie worden als Workspace-assets meegebundeld.

## Bewijsstatus

| Onderdeel | Status | Grens |
|---|---|---|
| Functionele consolidatie en rollen | PASS | Server- en browsercontrole uitgevoerd. |
| Desktop en mobiel 390 × 844 | PASS | Geen horizontale overflow; primaire velden/acties minimaal 44 px; fontpreview geladen. |
| Fontbron, preview en immutable provenance | PASS | Exacte bron-ID, versie en hash getest; geen fallback. |
| Logo-lagen en permissions | PASS | Winkel geblokkeerd; bewijsverhoging vereist admin + Human Acceptance. |
| PlotJob/history/replot compatibility | PASS | Immutable snapshot en nieuwe replot execution getest. |
| Golden fysieke geometrie | PASS — bestaand bewijs | Golden records byte-/objectmatig ongewijzigd in regressietest. |
| Automatisch vooraf spiegelen | PARTIAL | Blijft uit totdat de afzonderlijke A/B Human Acceptance expliciet als PASS is geregistreerd. |
| Nieuwe font-/logo-contouren fysiek produceren | PARTIAL | Technische fontvalidatie of vectoraanwezigheid is geen cut-proof. Illustrator/WinPlot/fysieke Human Acceptance blijft vereist. |
| Direct-to-Summa / hardware-send | Buiten scope | Niet gebouwd en hard uitgeschakeld. |

## Validatie

- Volledige regressiesuite: `497/497 PASS`.
- Gerichte freeze-suite: `8/8 PASS`.
- TypeScript + Workspace-build: `PASS`.
- Workspace-packagecontrole: `13 bestanden`, inclusief fontbron en licentie.
- `node --check` voor de pilotfoundation: `PASS`.
- `git diff --check`: `PASS` (alleen bestaande Windows-regelafbrekingswaarschuwingen).
- Browser: Winkel, Operator/Productie en Admin gecontroleerd; directe preview, fontladen, contextrechten en mobiele 390 px-layout `PASS`.

## Resterende menselijke gates

1. Registreer de uitkomst van de reeds afgesproken pre-mirror A/B-test. Alleen bij expliciete Human PASS mag vooraf spiegelen de standaard worden.
2. Behandel ieder nieuw font, logo, profiel en contour afzonderlijk volgens `CONFIGURED → GEOMETRY_VALIDATED → WINPLOT_VALIDATED → PHYSICALLY_VALIDATED`.
3. Voer vóór iedere fysieke output de bestaande menselijke controle uit. Workspace stuurt niets automatisch naar Illustrator, WinPlot of Summa.

## Freeze

`FUNCTIONAL PILOT FREEZE` is actief. Tot de pilot worden geen nieuwe functies toegevoegd. Alleen aantoonbare blockers, regressies of veiligheidsproblemen mogen worden gecorrigeerd. Er is niets live gedeployed en er is geen hardware-, DNS-, TransIP-, mail- of ACA-actie uitgevoerd.
