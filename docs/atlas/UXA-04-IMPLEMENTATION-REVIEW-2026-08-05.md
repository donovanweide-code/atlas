# UXA-04 — Implementation Review

Datum: 5 augustus 2026  
Status: kandidaat voor GO

## 1. Readiness Check en werkelijk uitgevoerde scope

- **Doel:** uitsluitend UXA-04 afronden: de bestaande menselijke observatiebeoordeling zichtbaar en bruikbaar maken binnen Atlas Werkelijkheid.
- **Uitgevoerd:** een rustige wachtrij voor `unreviewed` observaties, observatiedetail, vijf bestaande menselijke uitkomsten, verplichte beoordelingscontext, expliciete bevestiging en rustige lege, voltooide, onduidelijke en fouttoestanden.
- **Buiten scope gehouden:** UXA-05 t/m UXA-09, Atlas-navigatie en hero, nieuwe capturekanalen, uploads, AI, notificaties, connectors, Experience, authenticatie en infrastructuur.
- **Omvang:** M.
- **Hergebruik:** het canonieke UXA-03-observatiemodel, de bestaande lokale opslag, statussen, geschiedenis, Atlas-shell, Cases en design tokens.

De workflow ondersteunt zichtbaar dezelfde methode:

`Werkelijkheid → Observatie → Menselijke beoordeling → Betekenis → Kennis`

UXA-04 stopt bewust bij menselijke beoordeling. Betekenis, Understanding en Knowledge blijven afzonderlijke, expliciete stappen.

## 2. Gewijzigde bestanden

| Bestand | Wijziging |
| --- | --- |
| `website/src/atlas-observation-review.ts` | menselijke labels, wachtrijselectie en validatie van de bestaande UXA-03-uitkomsten |
| `website/src/atlas-workspace.ts` | zichtbare wachtrij, detaildialoog, reviewformulier, toestanden en koppeling aan het canonieke model |
| `website/src/styles/atlas-workspace.css` | rustige bestaande-tokenstyling, focus, tikhoogte en responsieve detail- en reviewopbouw |
| `website/tests/atlas-observation-review.test.mjs` | gerichte scope-, validatie-, toegankelijkheids- en anti-automatiseringstests |
| `docs/atlas/screenshots/uxa-04/` | desktop- en mobiele validatiebeelden |
| `docs/atlas/UXA-04-IMPLEMENTATION-REVIEW-2026-08-05.md` | deze implementatiereview |

## 3. Hergebruikte modellen en componenten

Er is geen tweede observatiemodel en geen nieuwe opslaglaag gebouwd.

- `Observation`, `ObservationStore`, `ObservationReviewDecision`, bron, context, eigenaarschap, relaties, ondersteunende bronreferenties en historie komen rechtstreeks uit `atlas-observations.ts`.
- `reviewObservation` blijft de enige muterende reviewpoort.
- De bestaande Cases leveren uitsluitend geldige selecteerbare doelen voor `linked`.
- De bestaande Atlas Workspace-shell, typografie, crème-, groen-, goud- en focustokens blijven leidend.
- De bestaande verborgen, bredere werkbeeldlogica is niet uitgebreid of als tweede reviewwaarheid gebruikt.

## 4. Opbouw van de observatiewachtrij

De sectie staat voorlopig direct bij Atlas Werkelijkheid en kan in UXA-05 zonder inhoudelijke herbouw onder `Atlas → Werkelijkheid → Observaties · nog beoordelen` worden geplaatst.

De wachtrij:

- bevat uitsluitend observaties met status `unreviewed`;
- toont een korte menselijke titel, status, tijd, bronsoort, herkomst, revieweigenaar, bron en relevante ervaringscontext;
- gebruikt één rustige actie: **Open en beoordeel**;
- bevat geen ongelezenteller, rode badge, activiteitsoverzicht of technische dashboardtaal;
- toont bij nul resultaten: “Er zijn momenteel geen observaties die om jouw beoordeling vragen.”

## 5. Beschikbare menselijke beoordelingsuitkomsten

| Technische status | Menselijke uitkomst | Aanvullende voorwaarde |
| --- | --- | --- |
| `confirmed` | Bevestig als werkelijkheid | blijft nog geen herbruikbare kennis |
| `linked` | Koppel aan een Case | bestaande Case verplicht |
| `question` | Maak er een open vraag van | betekenis blijft bewust open |
| `parked` | Parkeer bewust | concrete terugkeertrigger verplicht |
| `rejected` | Wijs af | historie blijft behouden |

`unreviewed` is de ingangstoestand en geen selecteerbare reviewuitkomst. Alleen een optie selecteren wijzigt niets; pas **Bevestig menselijke beoordeling** bewaart het besluit.

## 6. Motivering, beoordelaar, tijd en historie

Iedere bevestiging gaat door de bestaande UXA-03-poort en vereist:

- een niet-lege menselijke beoordelaar;
- een begrijpelijke motivering;
- een geldige bestaande uitkomst;
- een Case bij `linked`;
- een terugkeertrigger bij `parked`.

Het model voegt precies één historiemoment toe met vorige en nieuwe status, ISO-tijd, actor, motivering en `confirmedByHuman: true`. De oorspronkelijke capture-entry en alle eerdere momenten blijven ongewijzigd zichtbaar. Annuleren, openen en alleen een optie selecteren muteren de observatie niet. Na bevestiging verdwijnt het formulier, waardoor een tweede bevestiging vanuit dezelfde detailtoestand niet mogelijk is; een stale tweede poging wordt bovendien door de `unreviewed`-controle geweigerd.

## 7. Zichtbaarheid van bron en herkomst

Het detail toont:

- oorspronkelijke waarneming;
- bronsoort, herkomst en bronlabel;
- datum en tijd;
- pagina, ervaringsgrens, oorspronkelijke locator en captureviewport;
- revieweigenaar;
- legacy-Case en sprint wanneer die op een bestaande observatie aanwezig zijn;
- bestaande bronreferenties voor screenshots, documenten, PDF's, spreadsheets, foto's en e-mails;
- menselijk bevestigde relaties met laag, doel, motivering, actor en tijd;
- volledige statusgeschiedenis.

Bronreferenties blijven onderdeel van de observatie. Er is geen upload-, preview-, bestandsbeheer- of documentanalysefunctie toegevoegd.

## 8. Understanding creëert geen tweede waarheid

De review-UI maakt geen zelfstandig Understanding-item. Het UXA-03-model blijft leidend: een eventuele latere overgang naar Understanding kan uitsluitend expliciet en herleidbaar via `sourceObservationId` plaatsvinden. De beoordeling bewaart alleen de gekozen observatiestatus en, bij `linked`, de menselijk bevestigde Case-relatie. Daarmee blijft de observatie de enige bronwaarheid.

## 9. Geen automatische kennisvorming

Geen enkele UI-handeling in UXA-04 maakt een Knowledge-entry, kennisvoorstel of publicatie. Ook `confirmed` betekent uitsluitend “menselijk bevestigd als relevante werkelijkheid”. De dialoog benoemt deze grens vóór bevestiging en de voltooide toestand bevestigt dat geen kennis is gevormd.

## 10. Desktop-, tablet- en mobiele controles

| Viewport | Resultaat |
| --- | --- |
| Desktop 1440 × 900 | PASS — wachtrij, detail, alle uitkomsten, annuleren, bevestigen, historie en lege toestand gecontroleerd |
| Tablet 768 × 1024 | PASS — wachtrij en dialoog herschikken rustig; alle bronvelden, uitkomsten en acties blijven bereikbaar |
| Mobiel 430 × 932 | PASS — enkelkoloms detail en formulier, leesbare historie, 44 px-bediening en geen zichtbare horizontale overflow |

Functioneel in de browser gecontroleerd:

- capture verschijnt als `Nog beoordelen`;
- annuleren laat het aantal en de gegevens onveranderd;
- `confirmed`, `parked` en `linked` zijn end-to-end uitgevoerd; de overige toegestane uitkomsten zijn op modelniveau getest;
- Case `0002` wordt na menselijke bevestiging zichtbaar met actor, motivering en tijd;
- de wachtrij wordt na afronding rustig leeg;
- de voltooide dialoog heeft exact twee historiemomenten en geen tweede bevestigingsactie;
- browserconsole: geen fouten.

## 11. Toegankelijkheidscontrole

- native `<dialog>` met zichtbare kop en `aria-labelledby`;
- semantische statusregio voor wachtrij- en foutterugkoppeling;
- gegroepeerde native radio-inputs met begrijpelijke labels en toelichting;
- expliciete primaire bevestiging en afzonderlijk annuleren/sluiten;
- automatisch focuspunt bij openen en zichtbare `:focus-visible`-ringen;
- bedieningselementen minimaal 2,75 rem / 44 px hoog;
- formulierfouten zonder technische codes;
- responsive enkelkolomsopbouw op mobiel;
- bestaande `prefers-reduced-motion`-grens blijft van kracht;
- bestaande contrast- en design tokens zijn hergebruikt.

De knopbediening, focusverplaatsing naar de dialoog en volledige volgorde zijn via native interactieve elementen beschikbaar. De browservalidatie bevestigde de focus bij het openen; de geautomatiseerde controle borgt focusstyles en semantiek.

## 12. Gerichte tests, regressietests en builds

| Controle | Resultaat |
| --- | --- |
| Gerichte UXA-04-tests | PASS — 8/8 |
| Bestaande UXA-03 Observatie- en Understanding-tests | PASS — 19/19 |
| Volledige regressietest | PASS — 228/228 |
| TypeScript-controle | PASS — onderdeel van productiebuild |
| Productiebuild | PASS |
| Public-only-buildgrens | PASS — onderdeel van productiebuild |
| Browserconsole | PASS — geen fouten |
| `git diff --check` | PASS — geen whitespacefouten |

De gerichte tests dekken de wachtrijfilter, exact vijf uitkomsten, verplichte actor/motivering, Case- en parkeercontext, mutatievrij openen/annuleren, rustige UI-toestanden, toegankelijkheidsgrenzen en het ontbreken van automatische Understanding- of kennisdoorstroming. De bestaande UXA-03-tests dekken alle statusovergangen, legacygegevens, bron/context, historie, ondersteunende bestanden en promotiegates.

## 13. Screenshots

- `screenshots/uxa-04/uxa-04-queue-desktop-1440x900.jpg` — wachtrij met observaties
- `screenshots/uxa-04/uxa-04-observation-detail-desktop-1440x900.jpg` — volledig observatiedetail
- `screenshots/uxa-04/uxa-04-human-review-desktop-1440x900.jpg` — menselijke uitkomst, motivering en expliciete bevestiging
- `screenshots/uxa-04/uxa-04-empty-state-desktop-1440x900.jpg` — rustige lege toestand
- `screenshots/uxa-04/uxa-04-mobile-detail-430x932.jpg` — mobiele detailweergave

Deze beelden zijn functioneel bewijs voor UXA-04. De integrale Atlas-eindreview blijft conform opdracht uitgesteld tot na UXA-06.

## 14. Bewust niet gebouwd

- UXA-05-informatiearchitectuur, nieuwe Atlas-hoofdroutes of navigatiewijzigingen;
- UXA-06-hero of dagelijkse shell;
- UXA-07 Fundament;
- UXA-08/09 navigatie, iconografie of aandachtbadges;
- notificatiecentrum, e-mailmelding, realtime activiteit of automatische prioritering;
- nieuwe capturekanalen of connectors;
- bestandsupload, bestandsbeheer, previews of documentanalyse;
- AI-samenvatting, AI-classificatie of AI-beoordeling;
- automatische Case-, Understanding- of Knowledge-koppelingen;
- kennisvoorstellen, kennispublicatie of een nieuwe kennisengine;
- Experience-, authenticatie- of infrastructuurwijzigingen;
- klantmodules, Workspace-aanbevelingen of medewerkersfeedback.

Er is niets gecommit, gemerged, gepusht of gepubliceerd.

## Advies

UXA-04 is binnen de goedgekeurde scope geïmplementeerd en technisch gereed voor review. Advies: **GO voor UXA-04**.

UXA-04 is niet zelf als GO gemarkeerd en UXA-05 is niet gestart.
