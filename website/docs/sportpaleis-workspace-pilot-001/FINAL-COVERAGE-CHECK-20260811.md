# Sportpaleis Workspace — Final Coverage Check

Build/release: `SPW-PRE-PILOT-MASTER-CORRECTION-20260811`  
Datum: 11 augustus 2026  
Scope: uitsluitend lokale coverage/correction-pass; geen live-, DNS-, TransIP-, mail- of hardwarewijziging.

## Coverage-matrix

| Requirement | Status | Bewijs | Eventuele wijziging |
|---|---|---|---|
| 1. Canonieke snelle kassabedrukking | PASS | Bron- en regressiecontract bevestigen `Klant → Vereniging → Artikelen → Bedrukking → Controleren`; browser toont dezelfde flow. | Geen. |
| 2. Artikelen — directe `+` | PASS | Artikelkaart voegt direct aantal 1 toe; daarna zijn min/aantal/plus beschikbaar. | Geen. |
| 3. Vereenvoudigde bedrukking | PASS | Initialen zijn letterlijk, max. 5 tekens en zonder naamontleding. Junior/Senior-keuze is compact in de primaire invoer. | Geen. |
| 4. Contextuele bedrukking | PASS | Vereniging, artikelpolicy en artikelgroep bepalen zichtbare velden; Waterwijk-mutual-exclusion blijft artikelgebonden. | Geen. |
| 5. Artikelgroepen / dezelfde bedrukking | PARTIAL | Artikelen worden op productieprofiel gegroepeerd met representatieve context en thumbnails, maar ieder concreet artikel blijft nog een afzonderlijke kaart/keuze. | Niet verder samengevoegd: bepalen wanneer SKU-verschil werkelijk invoer- en productie-equivalent is vereist menselijke productbeslissing. |
| 6. Teamorder productiegedreven | PASS | Teamorder vraagt primair soort, productieprofiel en vrije regels. Parser dekt `1 t/m 9`, `34`, `nummer 3 twee keer`, `DW x 2`, reeksen, uitzonderingen en aantallen; geen 1–18-beperking. | Catalogus-eerst UI vervangen door productie-eerst invoer met begrensde parser en veilige handmatige provenance. |
| 7. Vereniging/artikel intake & DATA_GAP | PASS | Admin kan een vereniging toevoegen en een artikel aan een bestaand profiel koppelen. Nieuwe technische waarden worden niet verzonnen; artikel start verborgen met DATA_GAP, revisie en audit. | Veilige create-API’s en beheerformulieren toegevoegd. Er is geen nachtelijke sync in deze scope. |
| 8. Productieregels per juiste rol | PASS | Operator beheert begrensde productieprofielen en productie-elementen/varianten; winkelrol is server-side verboden; algemeen artikel-/verenigingsbeheer blijft admin-only. | Geen. |
| 9. Productie-elementen + min/max | PASS | Voorraad, open vraag, vrije voorraad, minimum, doel, tekort en menselijk aanvulvoorstel zijn geïmplementeerd en getest; onbekend blijft DATA_GAP. | Geen. |
| 10. Order achteraf corrigeren | PARTIAL | Actor/tijd, oud/nieuw, reden en productie-impact worden nu in eventhistorie en audit vastgelegd. Contact/bezorgwijze werkt voor Workspace-orders; XPRT-bezorgwijze wordt geweigerd met autoriteitsmelding. Inhoudscorrectie blijft na Controle vergrendeld en Teamorder heeft nog geen afzonderlijke amendment-flow voor later toegevoegde bedrukking. | Historische diff, productie-impact, delivery-correctie en rolgerichte correctie-UI toegevoegd. |
| 11. Ophalen/uitleveren/betaling | PASS | `PAID`, `PICKED_UP`, `DELIVERED` en `PRINTED` zijn afzonderlijke feiten met actor en tijd. | Geen. |
| 12. Rolgerichte Home/werkcontext | PASS | Serverrol en configureerbare werkcontext/default-context zijn gescheiden; Home is contextgericht en niet persoons-hardcoded. | Geen. |
| 13. Gebruikerswissel | PASS | Snelle wissel, gedeelde-device Quick PIN, rate limit en aparte verkooptoerekening zijn getest. Admin/support behouden sterkere authenticatie. | Geen. |
| 14. Feedback vanaf dag 1 | PASS | Tekst, maximaal drie afbeeldingen, user, rol, tijd, pagina/module, release, order en vereniging worden bewaard. Operationele blokkade is een eigen categorie. | `userRole`, `associationContext` en `Operationele blokkade` toegevoegd. |
| 15. Bestaande mailtemplates | PASS | Ontvangst-/productie-/gereedtemplateconfiguratie en capture-only mailgrens blijven intact; regressies groen. | Geen Mail Foundation gebouwd. |
| 16. Webshop/mailbatch | PARTIAL | Mailbatch is centrale bronrijke context met `WEBSHOP_XPRT`/`TEAM_MAIL`, provenance, records en transactionele autoriteit; niet Bedrukking-only. | Echte ACA-exportacceptatie blijft BLOCKED totdat een menselijke echte-exportreview plaatsvindt. |
| 17. Productie is multi-source | PASS | Eén order-/productiemodel ondersteunt STORE, WEBSHOP_XPRT, TEAM_MAIL, INVOICE en MANUAL; geen bron-specifieke tweede engine. | Geen. |
| 18. Typografie/mobile polish | PASS | Lokale browsercontrole op 1280×720 en 390×844: samenhangende shell, compacte cards, leesbare teamregels, geen horizontale overflow en geen consolefouten. | Productieregel-grid op desktop/mobiel gericht uitgelijnd; geen redesign. |
| 19. Centrale zoekfunctie | PASS | Alles zoekt over order, klant, telefoon/e-mail, vereniging, bron en artikelen; vereniging- en productie-elementrecords zijn toegevoegd waar aanwezig. | Centrale resultaatset uitgebreid met verenigingen en productie-elementen. |
| 20. Niet bouwen | PASS | Geen Mail Foundation, Klantenservice, ACA API, Outlook-vervanger, webshopplatform, ERP, nieuwe plotarchitectuur, fysieke plot, deploy, DNS, TransIP of externe mail gebouwd/gewijzigd. | Geen. |
| 21. WinPlot freeze | PASS | Alle 16 hashes van de vier READY-cases zijn vóór/na identiek. Generator is niet uitgevoerd. | Geen artefact gewijzigd. |
| 22. Validatie | PASS | 484/484 tests groen; publieke build groen; Workspace-build groen; gerichte role/permission-tests groen; desktop/mobile en console groen. | Vier nieuwe coverage-tests toegevoegd. |
| 23. Oplevering | PASS | Dit rapport bevat status, bewijs, wijzigingen, tests, blockers, WinPlot-freeze en acceptance-verdict. | Geen. |

## Gewijzigde bestanden in deze pass

- `scripts/sportpaleis-pilot-foundation.mjs`
- `src/sportpaleis-workspace.ts`
- `src/sportpaleis/pilot-api.ts`
- `src/sportpaleis/workspace-data.ts`
- `src/sportpaleis/team-production-lines.ts`
- `src/styles/sportpaleis-workspace.css`
- `tests/sportpaleis-final-coverage-20260811.test.mjs`
- dit rapport

## Validatie

- `npm.cmd test`: 484 tests, 484 PASS, 0 FAIL.
- `npm.cmd run build`: PASS; public-only build geverifieerd.
- `npm.cmd run build:workspace`: PASS; Workspace-only build geverifieerd.
- Gerichte final-coverage + pre-pilot suite: 16/16 PASS.
- Browser desktop: 1280 px breed, geen console warning/error, geen horizontale overflow.
- Browser mobiel: 390×844, documentbreedte 375 binnen viewport 390, geen console warning/error.
- Lokale tijdelijke browserdata is na controle verwijderd.

## Bekende blockers en beslispunten

1. Artikelgroep-UX is functioneel gegroepeerd, maar nog niet gereduceerd tot één primaire menselijke keuze voor alle productie-equivalente SKU’s. Dit vereist een productbesluit over welke catalogusverschillen veilig irrelevant zijn.
2. Later toegevoegde bedrukinhoud na de Controle-fase en een afzonderlijke Teamorder-amendment-flow zijn nog niet beschikbaar. De huidige vergrendeling voorkomt stil overschrijven van lopende productie.
3. Echte ACA XPRT-exportacceptatie blijft BLOCKED op een door een mens aangeleverd en beoordeeld werkelijk exportbestand.
4. Fysieke WinPlot/Human Acceptance blijft buiten deze pass en loopt parallel.

## WinPlot READY-freeze

De SHA-256-hashes van `cutjob`, `dmpl`, `preview` en `roundtrip` voor cases 01–04 zijn exact gelijk aan de vooraf vastgelegde baseline. Er is geen fout gevonden en geen READY-artefact gewijzigd.

## LOCAL HUMAN ACCEPTANCE

**CONDITIONAL GO** voor lokale menselijke pre-pilotacceptatie.

Voorwaarde: behandel de twee PARTIAL-punten hierboven als expliciete pilotgrenzen en voer geen productie/live-activatie uit voordat de reeds lopende WinPlot Human Acceptance en de echte ACA-exportacceptatie afzonderlijk zijn afgerond.
