# Sportpaleis Teamwear — LIVE versus candidate review

Datum: 2026-09-02  
Candidate branch: `codex/spw-teamwear-live-candidate-review-20260902`  
LIVE basiscommit: `9624dede44b887f9fc7437dd1bae06be8fb99ac1`  
LIVE release: `SPW-LIVE-BEDRUKKEN-PILOT-HOTFIX-BUNDLE-R2.26.21-20260902`

## Besluit

`TEAMWEAR_RELEASE_READY = NO`

De technische candidate is groen, maar de verplichte blinde Human Acceptance door een Sportpaleis-medewerker/eigenaar is nog niet uitgevoerd. Een echte deployment is daarnaast niet toegestaan zonder een afzonderlijke Human GO. Er is niets gedeployed, extern verstuurd of fysiek geproduceerd.

## TEAMWEAR_LIVE_VS_CANDIDATE_MATRIX

| Onderdeel | LIVE nu | Candidate | Beoordeling |
|---|---|---|---|
| Navigatie en toegang | Teamwear staat zichtbaar in de werknavigatie voor de bevoegde principal; pilot-exposure is default-deny en exact-principal | Ongewijzigd | PASS |
| Catalogusidentiteit | 183 actuele Teamwear-artikelen met server-authoritative surface truth; artikel, variant, media en revision blijven gekoppeld | Ongewijzigd | PASS |
| Authoritative media | FRONT/BACK wordt exact per variant gebruikt; ontbrekende gebruikte zijde blokkeert approval | Ongewijzigd | PASS, fail-closed |
| Assetbron en provenance | Directe bron en hergebruikte clubassets blijven immutable en klantcontext-gescopeerd | Ongewijzigd | PASS |
| Plaatsing en fysieke waarheid | Waarde werd correct als 200 mm gebruikt, maar één productiepad kon nog een oudere spreadsheetverwijzing als meetbewijs tonen | Meetbewijs volgt nu dezelfde actuele geconfigureerde profielbron als de 200-mm maat | PASS na correctie |
| Revisions, feedback en akkoord | Feedback blijft bij exact één revision; akkoord is apart en start geen productie | Ongewijzigd | PASS |
| Preview, PDF en bewijs | Preview/PDF blijven aan dezelfde canonical media-identity en revision gebonden | Ongewijzigd | PASS |
| WorkspaceOrder-projectie | Alleen goedgekeurde items projecteren; retry/crash-herstel is idempotent | Ongewijzigd | PASS |
| Cardinaliteit | Herhaalde decorations blijven afzonderlijke regels; duplicate SKU wordt niet willekeurig gekozen | Ongewijzigd | PASS |
| Rollen en tenantgrens | Admin/medewerkergrenzen en tenant/applicatiecontext falen gesloten | Ongewijzigd | PASS |
| Mail | Alleen bewijs/status en preview/capture beoordeeld; geen echte mail verstuurd | Ongewijzigd | PASS binnen scope |
| WeFact | Alleen geclassificeerd; geen integratie of mutatie uitgevoerd | Ongewijzigd | N.v.t. binnen scope |
| Desktop / 390 / 320 | LIVE-route en bestaand voorstel gecontroleerd; geen horizontale overflow; mobiel menu werkt | Ongewijzigde UI | PASS |
| Human Acceptance | Niet uitgevoerd door een onafhankelijke Sportpaleis-medewerker/eigenaar | Nog vereist op finale candidate | PENDING / BLOCKER |

## LIVE_NOW

- De actieve release is gezond en ready: database MariaDB `ok`, datastore revision `1467`, externe versleutelde logische dump plus provider-back-up actief.
- Barcodehardware en hardware-send staan uit; de review heeft niets fysieks gestart.
- De expliciete Teamwear source-first lineage (`ea4ce57` tot en met `cf4a78a`) is ancestor van de actieve LIVE-basiscommit. Er is dus geen losse bewezen Teamwear-foundation die opnieuw moet worden gebouwd of gemerged.
- De LIVE-interface toont Teamwear, vijf bestaande actieve voorstellen en de volledige rustige flow van artikelbron via bedrukking, maten/voorstel en akkoord naar afhandeling.
- Een bestaand voorstel toont artikel `137295`, exact proposal/revision `PV-2026-0006 · V4`, FRONT/BACK, klantreview en PDF-toegang zonder een mutatie uit te voeren.

## CANDIDATE_ONLY

- `resolveBackNumberProductionContext()` kiest nu voor iedere expliciet geconfigureerde SENIOR- of JUNIOR-klasse de fysieke maat én de provenance uit dezelfde production profile truth.
- Voor de aangetroffen casus betekent dit: 200 mm en de actuele Product Truth-bron blijven bij elkaar; de oudere 220-mm spreadsheetregel kan niet meer als bewijs bij de actuele 200-mm uitvoer terechtkomen.
- Drie verouderde regressieverwachtingen zijn in lijn gebracht met de reeds toegelaten exacte Schluber-vectorbron en de actuele 200-mm waarheid.

## GAPS_FOUND

1. Eén materiële provenance-mismatch: een productieprojectie kon een actuele 200-mm waarde combineren met een oudere spreadsheetbron voor SENIOR. De fysieke outputwaarde was correct, maar het bewijs was niet uit dezelfde waarheid afgeleid.
2. Drie regressie-asserties beschreven oudere fail-closed situaties die door de inmiddels exact toegelaten Schluber-bron en Product Truth waren achterhaald.
3. Voor 59 BACK-printbare artikelen ontbreekt authoritative BACK-media. De runtime fabriceert niets en blokkeert BACK-approval; FRONT-only approval blijft toegestaan wanneer alleen authoritative FRONT wordt gebruikt.
4. Zes officiële merkbronnen zijn gecontroleerde discovery-references, geen tweede cataloguswaarheid en niet als automatische supplier feed verbonden. Source-first upload en de bekende catalogus blijven de veilige werkroute.

## GAPS_AUTO_CLOSED

- De centrale production-contextresolver gebruikt nu één bron voor maat en meetbewijs.
- Gerichte regressiedekking bewijst 200 mm, actuele provenance, exacte Schluber-bron en dat een voorstel geen PlotJob of fysieke output veroorzaakt.
- De verouderde assertions zijn gecorrigeerd zonder permissies, ordersemantiek, UI-flow of hardwaregrenzen te verbreden.

## OPEN_BLOCKERS

- `HUMAN_ACCEPTANCE = PENDING`: één medewerker/eigenaar die de fix niet heeft gebouwd moet op de finale candidate één representatieve echte Teamwear-casus van intake tot approval-ready doorlopen, op desktop, 390 px en 320 px. Geen echte approval, mail of fysieke uitvoer is nodig.
- `DEPLOYMENT_HUMAN_GO = NOT_PROVIDED`: een deployment vereist een afzonderlijke expliciete Human GO.

## Acceptatiebewijs

| Controle | Resultaat |
|---|---|
| Gerichte Teamwear/security/recovery regressies | 112/112 PASS, 0 fail |
| Candidate build | PASS; 340 bestanden, 27 tekstbestanden geverifieerd |
| LIVE health | HTTP 200; `status=ok`; TTFB 1.055 s |
| LIVE readiness | HTTP 200; `status=ready`; TTFB 0.098 s |
| LIVE Teamwear-route | HTTP 200; TTFB 0.078 s |
| Browser desktop 1536×730 | PASS; geen horizontale overflow; geen console errors/warnings |
| Browser 390×844 | PASS; contentbreedte 375 px = scrollbreedte 375 px |
| Browser 320×700 | PASS; contentbreedte 305 px = scrollbreedte 305 px; geen te brede acties |
| Mobiel menu | PASS; opent en sluit, Teamwear blijft zichtbaar in navigatie |
| LIVE release/database/back-up | PASS via openbare health/readiness en read-only releasecontrole |

## Statusvelden

`PRODUCT_VARIANT_IDENTITY = PASS`  
`AUTHORITATIVE_MEDIA = PASS_FAIL_CLOSED`  
`ASSET_SOURCE_PROVENANCE = PASS`  
`PLACEMENT_PHYSICAL_TRUTH = PASS_AFTER_FIX`  
`REVISION_APPROVAL_EVIDENCE = PASS`  
`PRODUCTION_PROJECTION_IDEMPOTENCY = PASS`  
`PERMISSIONS_TENANT_BOUNDARY = PASS`  
`PERFORMANCE_RECOVERY = PASS`  
`DESKTOP_390_320 = PASS`  
`HUMAN_ACCEPTANCE = PENDING`  
`TEAMWEAR_RELEASE_READY = NO`  
`DEPLOYMENT_EXECUTED = NO`  
`EXTERNAL_COMMUNICATION_EXECUTED = NO`  
`PHYSICAL_OUTPUT_EXECUTED = NO`  
`TEMP_RESOURCES_CLEANED = YES`

## Blinde Human Acceptance-checklist

1. Open Teamwear vanuit de normale werknavigatie op desktop.
2. Start één representatief voorstel met een echte artikelbron; controleer exact artikel/variant en beschikbare FRONT/BACK-media.
3. Voeg bestaande of nieuwe logo-/tekst-/nummerbron toe en controleer herkomst, plaatsing en fysieke maat.
4. Maak een revision en controleer klantpreview, PDF en revisiongebonden feedback.
5. Breng de casus tot approval-ready; bevestig dat akkoord een aparte bewuste actie is en dat er nog geen productie start.
6. Herhaal de kritieke schermen op 390 px en 320 px; controleer menu, knoppen, leesbaarheid en overflow.
7. Leg naam/rol, datum/tijd, proposal-id, revision, schermformaten en PASS/FAIL vast. Bij FAIL: stop en beschrijf exact het blokkerende scherm en de feitelijke afwijking.
