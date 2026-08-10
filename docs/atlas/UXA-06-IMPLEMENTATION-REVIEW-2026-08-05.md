# UXA-06 — Atlas rustige dagelijkse shell Implementation Review

Datum: 5 augustus 2026  
Status: complete reviewkandidaat, kandidaat voor GO

## 1. Readiness Check en uitgevoerde scope

- **Doel:** Atlas vanaf de eerste pixel laten functioneren als dagelijkse Workspace, met één actuele conclusie, één primair Focus-vlak, ondersteunende Stilte en directe doorgang naar Werkelijkheid.
- **Uitgevoerd:** de bestaande Atlas-opening is binnen de gedeelde Workspace-shell geplaatst, inhoudelijk gereduceerd en responsief verdicht. Focus, Stilte, actieve werkstroom en kompas zijn opnieuw geordend zonder gegevens of betekenis te wijzigen.
- **Buiten scope gehouden:** Fundament-inhoud, navigatiepolish en iconografie, nieuwe functionaliteit, routes, modellen, reviewworkflow, Experience, WBD-functionaliteit, meldingen, AI, connectors, authenticatie en infrastructuur.
- **Omvang:** M.
- **Creditbewust hergebruik:** bestaande shell, sidebar, Atlas-dagdata, Focus, Stilte, kompas, Werkelijkheid, design tokens en responsive patronen.

## 2. Gewijzigde bestanden

| Bestand | UXA-06-wijziging |
| --- | --- |
| `website/src/atlas-workspace.ts` | compacte dagelijkse opening binnen de bestaande Workspace-shell; presentatiehiërarchie van dagcontext, actieve werkstroom, Focus, Stilte en kompas |
| `website/src/styles/atlas-workspace.css` | gerichte UXA-06-overrides voor desktop, tablet en mobiel; geen brede refactor |
| `website/tests/atlas-daily-shell.test.mjs` | gerichte regressiegrenzen voor shell, inhoudsreductie, Focus/Stilte, kompas, responsive gedrag en UXA-05-IA |
| `docs/atlas/screenshots/uxa-06/` | voor/na-, responsive- en WBD-referentiebeelden |
| `docs/atlas/UXA-06-IMPLEMENTATION-REVIEW-2026-08-05.md` | deze implementatiereview |

## 3. Hergebruikte shell- en presentatiecomponenten

- `workspace-shell`, `workspace-main` en `renderWorkspaceSidebar()` vormen nu ook vanaf de eerste Atlas-pixel de enige shell;
- de UXA-05-navigatieconfiguratie en bestaande `aria-current`-synchronisatie zijn ongewijzigd hergebruikt;
- `atlasDailyBrief` blijft de enige gegevensbron voor actieve werkstroom, Focus, reden, stap en Stilte;
- de bestaande `compass()`-presentatie is verkleind, niet vervangen;
- bestaande crème-, donkergroen-, goud-, typografie-, focus- en reduced-motionpatronen blijven leidend;
- Werkelijkheid sluit direct aan op de opening; er is geen tweede aankomstkop of extra schermlaag meer.

Er is geen tweede shell, nieuw designsysteem, nieuwe kaartdata of dubbele Focus-/Stiltewaarheid gebouwd.

## 4. Hoogte van de Atlas-opening

De oude waarden zijn de vastgelegde UX-reviewmetingen. De nieuwe waarden zijn in de lokale browser gemeten op het gerenderde `.daily-opening`-element.

| Formaat | Oud | Nieuw | Uitkomst |
| --- | ---: | ---: | --- |
| Desktop 1440 × 900 | circa 932 px | 503 px | 429 px lager; Werkelijkheid begint op 540 px |
| Mobiel referentiemeting | circa 1.137 px | 884 px op 430 × 932 | 253 px lager; volledige dagstart blijft vrijwel één mobiele viewport |
| Mobiel 390 × 844 | circa 1.137 px referentie | 852 px | 285 px lager; geen documentbrede horizontale overflow |

Op desktop zijn Focus en Stilte beide 363 px hoog. Daarmee vallen dagcontext, conclusie, Focus, Stilte én het begin van Werkelijkheid ruim in de eerste viewport. Op mobiel volgt Stilte onder Focus, waardoor de betekenis behouden blijft zonder Focus visueel te beconcurreren.

## 5. Nieuwe inhoudelijke hiërarchie

De opening volgt nu exact deze lees- en beslisvolgorde:

1. dagcontext en persoonlijke begroeting;
2. actieve werkstroom en status;
3. **Focus:** wat vandaag aandacht verdient;
4. bestaande samenvatting: waarom dit aandacht verdient;
5. bestaande eerstvolgende betekenisvolle stap als huidige grens;
6. bestaande actie en optionele onderbouwing;
7. **Stilte:** wat bewust niet actief wordt gemaakt;
8. Werkelijkheid.

De oude campagneachtige projecttitel, subtitel, algemene samenvatting, bewijsmeta, terugkeertrigger en tweede overgangskop zijn uit de zichtbare opening verwijderd. De onderliggende gegevens zijn niet gemuteerd; alleen concurrerende presentatie is afgebouwd.

## 6. Ordening van Focus en Stilte

Focus is het enige primaire dagelijkse vlak en bevat één `h1`. Het crèmevlak draagt de actuele conclusie, reden, betekenisvolle stap en één bestaande actie. Er zijn geen KPI's, badges of extra dashboardkaarten toegevoegd.

Stilte is op desktop een smallere, donkere ondersteunende kolom. Op mobiel volgt Stilte lineair na Focus. De bestaande Stilte-items en hun uitleg blijven volledig beschikbaar; Stilte betekent nog steeds een inhoudelijk besluit om iets niet naar voren te halen.

De huidige lange Focus en drie inhoudelijke Stilte-items zijn op beide mobiele breedtes gecontroleerd. De presentatie gebruikt natuurlijke hoogte en geen vaste mobiele minimumhoogte; daardoor blijven korte Focus en lege of minimale Stilte structureel compact zonder een leeg hero-oppervlak te reserveren.

## 7. Kompas

Het bestaande Atlas-kompas staat nu als klein richtingsteken rechtsboven in Focus:

- desktop: 4,5 rem;
- tablet: 3,75 rem;
- mobiel: 3,25 rem;
- smal mobiel: 2,85 rem.

Het grote kompasdecor en de afzonderlijke kompaszone zijn verwijderd. Het kompas ondersteunt richting, maar bepaalt niet langer de hoogte of leeshiërarchie.

## 8. Relatie met de WBD Workspace

Atlas gebruikt nu dezelfde dagelijkse ontwerpdiscipline als het WBD-overzicht: één shell, een compacte kop, één hoofdboodschap en relevante inhoud zonder tweede aankomstmoment. De WBD Workspace is uitsluitend als benchmark gebruikt en functioneel niet gewijzigd.

Het karakterverschil blijft zichtbaar:

- WBD blijft zakelijk, organisatorisch en operationeel;
- Atlas blijft persoonlijk, begeleidend en reflectief;
- Atlas gebruikt één doelgericht crème Focus-oppervlak, een donker Stilte-vlak en een klein gouden richtingsteken;
- beide blijven onderdeel van dezelfde warme, rustige ontwerpfamilie zonder tech-dashboarduitstraling.

## 9. Behoud van UXA-05

De goedgekeurde structuur is intact:

`Vandaag → Werkelijkheid → Horizon → Werkruimte → Fundament (secundair)`

- geen route, hash of navigatielabel is in UXA-06 gewijzigd;
- Observaties · nog beoordelen blijft onder Werkelijkheid;
- Fundament blijft secundair en inhoudelijk leeg;
- bestaande observatie-, Understanding- en Knowledge-modellen zijn niet gewijzigd;
- Werkelijkheid en de menselijke observatiereview blijven direct bereikbaar.

De gerichte test legt deze navigatiestructuur opnieuw exact vast, zodat presentatiepolish de UXA-05-architectuur niet stil kan veranderen.

## 10. Desktop-, tablet- en mobiele controle

| Viewport | Resultaat |
| --- | --- |
| Desktop 1440 × 900 | PASS — opening 503 px; Werkelijkheid start op 540 px; Focus/Stilte 363 px; één `h1`; geen horizontale overflow |
| Tablet 768 × 1024 | PASS — opening 479 px binnen de responsive shell; Werkelijkheid start op 702 px; Focus en Stilte blijven gelijkwaardig uitgelijnd maar duidelijk ongelijk in gewicht |
| Mobiel 430 × 932 | PASS — opening 884 px; volgorde Focus → Stilte → Werkelijkheid; geen documentbrede horizontale overflow |
| Mobiel 390 × 844 | PASS — opening 852 px; kleinere kop en kompas; geen documentbrede horizontale overflow |

De bestaande mobiele navigatie blijft horizontaal bereikbaar zonder de documentbreedte te vergroten. Focusactie en disclosure behouden minimaal 44 px tikhoogte.

## 11. Toegankelijkheidscontrole

- één logische `h1` in Focus; daaropvolgende gebieden behouden hun bestaande `h2`-structuur;
- Focus is een benoemd `article`; Stilte is een benoemde `aside`; de opening is een benoemde `section`;
- tekstlabels maken actieve werkstroom, Focus, Stilte en stap betekenisvol zonder alleen kleur of positie;
- bestaande zichtbare focusstijlen voor de Focusactie en disclosure zijn behouden;
- toetsenbordvolgorde volgt de visuele volgorde: shell → Focusactie → onderbouwing → vervolginhoud;
- mobiele interactieve hoogtes zijn minimaal 44 px;
- bestaande reduced-motionregels en `aria-current`-logica blijven actief;
- lichte Focuscopy en donkere Stiltecopy behouden de bestaande contrastrijke ontwerptokens;
- tekst en kaarten gebruiken flexibele maten en natuurlijke hoogte, zodat tekstzoom niet door vaste herohoogtes wordt afgesneden.

## 12. Tests, regressies en builds

| Controle | Resultaat |
| --- | --- |
| Gerichte UXA-06-tests | PASS — 5/5 |
| Gerichte UXA-03/04/05 + shell-regressie | PASS — 24/24 |
| Volledige regressietest | PASS — 239/239 |
| TypeScript | PASS |
| Productiebuild | PASS |
| Public-only-buildgrens | PASS — 29 bestanden, 9 tekstbestanden gecontroleerd |
| Browserconsole | PASS — geen errors of warnings |
| `git diff --check` | PASS — geen whitespacefouten |

Functioneel bevestigd:

- de bestaande actuele Focusinhoud en Stilte-inhoud worden rechtstreeks hergebruikt;
- Werkelijkheid, observatiereview en alle UXA-05-routes blijven bereikbaar;
- Fundament blijft secundair;
- de nieuwe presentatie doet geen gegevens- of modelmutaties.

## 13. Screenshots

- vóór Atlas desktop: `screenshots/uxa-06/uxa-06-atlas-before-desktop-1440x900.jpg`
- na Atlas desktop: `screenshots/uxa-06/uxa-06-atlas-after-desktop-1440x900.jpg`
- eerste viewport desktop: `screenshots/uxa-06/uxa-06-atlas-after-first-viewport-desktop-1440x900.jpg`
- tablet: `screenshots/uxa-06/uxa-06-atlas-after-tablet-768x1024.jpg`
- vóór Atlas mobiel: `screenshots/uxa-06/uxa-06-atlas-before-mobile-430x932.jpg`
- na Atlas mobiel 430 × 932: `screenshots/uxa-06/uxa-06-atlas-after-mobile-430x932.jpg`
- na Atlas mobiel 390 × 844: `screenshots/uxa-06/uxa-06-atlas-after-mobile-390x844.jpg`
- WBD Workspace-referentie: `screenshots/uxa-06/uxa-06-wbd-reference-desktop-1440x900.jpg`

## 14. Bewust niet gebouwd

- UXA-07-Fundamentinhoud of technisch register;
- UXA-08/09-navigatieprototype, iconen of navigatiepolish;
- aandachtstip, teller, badge, notificatiecentrum of realtime activiteit;
- nieuwe Workspace-selector;
- nieuwe Focus-, Stilte- of Werkelijkheidsdata;
- nieuwe observatieactie, reviewuitkomst, status of model;
- dashboard, KPI, extra besliskaart of nieuwe module;
- AI-samenvatting of automatische prioritering;
- onboarding of handleidingfunctionaliteit;
- Experience-wijziging;
- WBD Workspace-herontwerp of functionele WBD-wijziging;
- connector, authenticatie of infrastructuur;
- nieuw logo, alternatieve merkuitvoering of nieuw designsysteem.

Er is niets gecommit, gemerged, gepusht of gepubliceerd. UXA-07 is niet gestart.

## Advies en reviewafspraak

UXA-06 is technisch en visueel gereed als complete reviewkandidaat. Advies: **GO voor UXA-06**.

UXA-06 is niet zelf als GO gemarkeerd. Atlas als geheel krijgt evenmin een zelfstandig eind-GO: conform afspraak volgt nu één integrale Atlas-review over UXA-03 tot en met UXA-06.
