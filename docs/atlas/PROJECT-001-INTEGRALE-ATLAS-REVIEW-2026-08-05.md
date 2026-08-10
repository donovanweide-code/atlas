# Project 001 — Integrale Atlas Review

**Reviewdatum:** 5 augustus 2026  
**Scope:** actuele implementatie van UXA-03 t/m UXA-06, in samenhang met Experience en WBD Workspace  
**Besluit:** **NO-GO voor afsluiting van Project 001 in de huidige staat**  
**Karakter:** uitsluitend kwaliteitsreview; geen code, ontwerp, functionaliteit, commit, merge, push of publicatie

## 1. Eindoordeel

Atlas voelt nu als een rustige dagelijkse Workspace waarin werkelijkheid, menselijke beoordeling, begrip en bevestigde kennis herkenbaar van elkaar zijn gescheiden. De opening is compact genoeg, Focus en Stilte sturen aandacht zonder dashboardgedrag, en de gedeelde ontwerpfilosofie met WBD is overtuigend zichtbaar zonder dat Atlas zijn eigen identiteit verliest.

De centrale vraag — *“Voelt Atlas nu als de werkplek waar iedere dag betekenis ontstaat?”* — wordt daarom inhoudelijk met **ja** beantwoord.

Project 001 kan desondanks nog niet verantwoord worden afgesloten. Drie afgebakende A-punten moeten vóór livegang en vóór het definitieve afsluitbesluit zijn opgelost en opnieuw gecontroleerd:

1. De browseridentiteit is niet productiewaardig: de publieke shell verwijst nog naar het paarse Vite-favicon en de Experience bevat geen eigen favicon-koppeling.
2. Twee Understanding-tekstvelden die later in de bestaande flow zichtbaar worden, hebben geen programmatisch toegankelijke naam.
3. De actuele productie-Experience wijkt af van de goedgekeurde lokale implementatie: productie toont nog de eerdere opening en houdt `/e/` als canonical, terwijl de actuele implementatie First Visit V2 achter `/ervaar` gebruikt.

Dit NO-GO is dus geen afwijzing van UXA-03 t/m UXA-06. De Atlas-architectuur en dagelijkse shell zijn inhoudelijk geslaagd. Het is een kwaliteitsgrens voor een beheerste afsluiting en livegang.

## 2. Gebruikte onderbouwing

- Actuele lokale implementatie en bestaand Experience-deploypakket.
- `UXA-03 Implementation Review` — observatie-eigenaarschap, levenscyclus en bronmodel.
- `UXA-04 Implementation Review` — menselijke observatiereview.
- `UXA-05 Implementation Review` — Atlas Information Architecture.
- `UXA-06 Implementation Review` — rustige dagelijkse shell en compacte opening.
- Actuele browsercontrole op desktop, tablet, 430×932 en 390×844.
- Actuele productiecontrole van `https://experience.webuildanddesign.nl/ervaar`.
- Volledige bestaande testset: 239 tests, 239 geslaagd.

De eerder goedgekeurde implementatiereviews zijn gebruikt als bewijs voor toestanden die in de actuele lege reviewwachtrij niet zonder datamutatie konden worden opgeroepen. Er is conform opdracht geen observatie of testsessie aangemaakt.

## 3. Controlelocaties

### Atlas

| Controlelocatie | Canonieke route | Toegang | Status |
|---|---|---|---|
| Atlas opening | `/atlas` | Intern | Actueel |
| Vandaag | `/atlas#overzicht` | Intern | Actueel |
| Werkelijkheid | `/atlas#werkelijkheid` | Intern | Actueel |
| Observaties · nog beoordelen | `/atlas#observatie-review` | Intern | Actueel |
| Observatiedetail | Dialoog vanuit `#observatie-review` | Intern | Actueel; geen zelfstandige route |
| Praktijkbronnen | `/atlas#praktijkdossiers` | Intern | Actueel |
| Waarnemen | `/atlas#waarnemen` | Intern | Actueel; onderdeel van Werkelijkheid |
| Horizon | `/atlas#daily-horizon` | Intern | Actueel |
| Werkruimte | `/atlas#werkruimte` | Intern | Actueel |
| Cases | `/atlas#cases` | Intern | Actueel |
| Understanding | `/atlas#understanding` | Intern | Actueel |
| Kennisvoorstellen | `/workspace/wbd/kennisvoorstellen` | Intern | Bewust één WBD-waarheid |
| Ideeën | `/atlas#ideeen` | Intern | Actueel |
| Logboek | `/atlas#logboek` | Intern | Actueel |
| Fundament | `/atlas/fundament` | Intern | Secundaire, bewust lege plaats |
| Atlas Lab | `/atlas-lab` | Reviewroute | Alleen intern onderzoek/review |

De in de opdracht gebruikte labels `/atlas#vandaag`, `#observaties`, `#praktijkbronnen`, `#horizon` en `#kennisvoorstellen` zijn geen bestaande targets. Voor deze review zijn de canonieke routes hierboven gebruikt. De niet-canonieke hashes activeren geen bijbehorende sectie.

### Experience

| Controlelocatie | Route | Toegang | Status |
|---|---|---|---|
| Menselijke hoofdingang | `/ervaar` | Publiek | Canoniek in actuele implementatie |
| Geldige persoonlijke sessie | `/e/#token=<geldige-testtoken>` | Publiek, persoonlijk | Compatibiliteitsroute; token niet in reviewdocument opnemen |
| Ongeldige persoonlijke sessie | `/e/#ongeldige-testtoken` | Publiek | Rustige fouttoestand |
| Ontbrekende token | `/e/` | Publiek | Verwijst in actuele implementatie naar `/ervaar` |
| Privacy | `/privacy` | Publiek | Actueel |
| Observatory | `/observatory` | Intern, beschermd | Onderzoek, menselijke review en historie |

De productiehost toont op 5 augustus 2026 nog niet dezelfde Experience als het actuele lokale deploypakket. Dit is als A-punt opgenomen.

### WBD Workspace

| Controlelocatie | Route | Toegang | Status |
|---|---|---|---|
| Hoofdoverzicht | `/workspace/wbd/overzicht` | Intern | Actueel |
| Organisaties | `/workspace/wbd/organisaties` | Intern | Actueel |
| Projecten | `/workspace/wbd/projecten` | Intern | Actueel |
| Ontwikkelpartners | `/workspace/wbd/ontwikkelpartners` | Intern | Actueel |
| Ontwikkelmonitor | `/workspace/wbd/ontwikkeling/monitor` | Intern | Actueel |
| Business Foundation | `/workspace/wbd/business-foundation` | Intern | Actueel |
| Infrastructuur | `/workspace/wbd/infrastructuur` | Intern | Actueel |
| Kennisvoorstellen | `/workspace/wbd/kennisvoorstellen` | Intern | Actueel; centrale kennisreview |

### Toegangsclassificatie

- **Publiek:** `/ervaar`, `/e/#token=…`, `/e/`, `/privacy` en de publieke website.
- **Intern:** alle `/atlas`- en `/workspace/wbd`-routes en `/observatory`.
- **Alleen review/onderzoek:** `/atlas-lab` en de beschermde Observatory-omgeving.
- **Secundair intern:** `/atlas/fundament`; bereikbaar maar bewust niet dominant.

## 4. Screenshotregister

Alle actuele reviewbeelden staan in `docs/atlas/screenshots/project-001-integral-review/`.

| Nr. | Bestand | Opmerking |
|---|---|---|
| 01 | `01-atlas-desktop-opening-1440x900.jpg` | Desktop opening |
| 02 | `02-atlas-first-viewport-1440x900.jpg` | Eerste viewport |
| 03 | `03-atlas-werkelijkheid-1440x900.jpg` | Werkelijkheid |
| 04 | `04-atlas-observaties-empty-1440x900.jpg` | Actuele lege reviewwachtrij |
| 05 | `05-atlas-observatiedetail-prior-uxa04-evidence.jpg` | Eerder gevalideerd UXA-04-bewijs; niet als actuele toestand gepresenteerd |
| 06 | `06-atlas-praktijkbronnen-1440x900.jpg` | Praktijkbronnen |
| 07 | `07-atlas-horizon-1440x900.jpg` | Horizon |
| 08 | `08-atlas-werkruimte-1440x900.jpg` | Werkruimte |
| 09 | `09-atlas-cases-1440x900.jpg` | Cases |
| 10 | `10-atlas-understanding-1440x900.jpg` | Understanding |
| 11 | `11-atlas-ideeen-1440x900.jpg` | Ideeën |
| 12 | `12-atlas-logboek-1440x900.jpg` | Logboek |
| 13 | `13-atlas-fundament-1440x900.jpg` | Fundament |
| 14 | `14-atlas-volledige-pagina-1440.jpg` | Volledige Atlas-pagina |
| 15 | `15-atlas-tablet-768x1024.jpg` | Tablet |
| 16 | `16-atlas-mobile-430x932.jpg` | Mobiel 430×932 |
| 17 | `17-atlas-mobile-390x844.jpg` | Mobiel 390×844 |
| 18 | `18-wbd-workspace-overzicht-1440x900.jpg` | WBD overzicht |
| 19 | `19-wbd-desktop-volledige-pagina-1440.jpg` | WBD volledige desktoppagina |
| 20 | `20-wbd-mobile-430x932.jpg` | WBD mobiel |
| 21 | `21-experience-ervaar-desktop-1440x900.jpg` | Actuele lokale `/ervaar` |
| 22 | `22-experience-ervaar-mobile-430x932.jpg` | Actuele lokale `/ervaar` mobiel |
| 23 | `23-experience-privacy-1440x900.jpg` | Privacy |
| 24 | `24-experience-observatory-protected-1440x900.jpg` | Beschermde Observatory-ingang |
| 25 | `25-atlas-vs-wbd-opening.jpg` | Actuele opening naast elkaar |
| 26 | `26-atlas-before-uxa06.jpg` | Historische vergelijking vóór UXA-06 |
| 27 | `27-atlas-after-uxa06.jpg` | Actuele situatie na UXA-06 |
| 28 | `28-live-experience-deployment-drift-2026-08-05.jpg` | Actuele productie-Experience ter onderbouwing van deploymentverschil |

Omdat de actuele observatiewachtrij leeg is, kon screenshot 05 niet opnieuw worden gemaakt zonder data te creëren of te wijzigen. Het beeld is daarom bewust gemarkeerd als eerder UXA-04-bewijs. De actuele lege toestand zelf is wel opnieuw vastgelegd en gecontroleerd.

## 5. Integrale beoordeling

### 5.1 Algemene indruk

**Huidige situatie**  
Atlas opent in dezelfde rustige Workspace-familie als WBD, maar met een lichtere, meer contemplatieve aandachtshiërarchie. De interface gebruikt geen dashboards, grafiekblokken, AI-prompts of notificatiepatronen.

**Beoordeling**  
Sterk. Atlas voelt als werkplek en niet als productdemo. Het systeem nodigt uit tot kijken, kiezen en betekenis geven.

**Positief**

- Warme crème, donkergroen en goud ondersteunen rust en menselijke aandacht.
- De opening, Werkelijkheid, Horizon en Werkruimte vormen één doorlopende werkdag.
- Geen tweede landing of losse hero na de opening.
- Geen dashboard- of AI-productgevoel.

**Verbeterpunten**  
Geen inhoudelijk blokkerend Atlas-punt.

**Prioriteit:** —  
**Advies:** behouden.

### 5.2 Opening: Focus, Stilte en kompas

**Huidige situatie**  
De desktopopening is ongeveer één compacte viewportlaag. Focus draagt de actuele hoofdconclusie; Stilte begrenst bewust wat niet hoeft. Werkelijkheid begint al in de eerste viewport. Op mobiel blijft Focus dominant en verschijnt Stilte direct aansluitend.

**Beoordeling**  
Geslaagd. De hero is niet meer te groot en Atlas heeft het rustige ritme van de WBD Workspace zonder die opening te kopiëren.

**Positief**

- Heldere hiërarchie tussen datum, actieve werkstroom, Focus en Stilte.
- Kompasgedrag is aanwezig zonder een extra dashboardlaag.
- De eerste betekenisvolle stap is direct zichtbaar.
- Vergelijking vóór/na UXA-06 toont een duidelijke vermindering van dominantie.

**Verbeterpunten**  
Geen.

**Prioriteit:** —  
**Advies:** geen verdere hero-aanpassing vóór deze review gezamenlijk is besproken.

### 5.3 Werkelijkheid, observaties en praktijkbronnen

**Huidige situatie**  
Werkelijkheid bevat het actuele projectbeeld, de menselijke observatiereview, praktijkbronnen en Waarnemen. De actuele wachtrij is leeg en toont een rustige lege toestand. Het eerder gevalideerde detail ondersteunt de vijf bestaande menselijke uitkomsten met bron, context, eigenaar en motivering.

**Beoordeling**  
Sterk en methodisch zuiver.

**Positief**

- Observatie blijft aantoonbaar iets anders dan Understanding of Knowledge.
- Menselijke beoordeling is expliciet en verplicht.
- Bron, context, tijdstip, eigenaar en geschiedenis blijven herleidbaar.
- Waarnemen staat correct binnen Werkelijkheid en niet als primaire Experience-route.
- Praktijkbestanden zijn architectonisch aan bron/observatie gekoppeld en niet als losse uploads gepositioneerd.

**Verbeterpunten**

- Enkele compacte routekaarten korten lange ondersteunende labels visueel af. De betekenis blijft begrijpelijk, maar de typografische afronding kan rustiger.

**Prioriteit:** B  
**Advies:** na livegang uitsluitend als kleine copy-/spacingpolish beoordelen; geen structuurwijziging.

### 5.4 Horizon

**Huidige situatie**  
Horizon bewaart ontwikkelingen zonder ze naar voren te halen. Ieder item kan zijn plaatsing verklaren.

**Beoordeling**  
Goed. Horizon voelt als bewuste parkeerlaag, niet als backlog of roadmapdashboard.

**Positief**

- Heldere grens tussen dagelijkse aandacht en toekomstige mogelijkheid.
- Menselijke toelichting blijft beschikbaar.
- Visueel rustig ondanks meerdere items.

**Verbeterpunten**  
Geen voor livegang.

**Prioriteit:** —  
**Advies:** behouden.

### 5.5 Werkruimte: Cases, Understanding, kennis, Ideeën en Logboek

**Huidige situatie**  
Werkruimte groepeert bestaande werkobjecten. Cases tonen actuele status en onzekerheid. Understanding begrenst conclusies en verwijst naar onderbouwing. Kennisvoorstellen blijven bewust in WBD. Ideeën en Logboek ondersteunen bewaren zonder direct bouwen.

**Beoordeling**  
Inhoudelijk sterk; geen tweede waarheid.

**Positief**

- Case 0001 toont eerlijk dat herbevestiging nodig is en geeft voorlopig geen richting.
- Understanding zegt expliciet “Vorm nog geen conclusie”.
- Kennisreview heeft één eigenaar en één route in WBD.
- Ideeën en Logboek zijn ondersteunend, niet dominant.

**Verbeterpunten**

- Twee verborgen Understanding-vervolgformulieren bevatten een `textarea` zonder `label`, `aria-label` of `aria-labelledby`. Zodra de bestaande flow deze formulieren toont, heeft het veld voor hulptechnologie geen toegankelijke naam.
- De linktekst naar Kennisvoorstellen wordt in een compacte routekaart visueel afgekort.

**Prioriteit:** A voor toegankelijke veldnamen; B voor de visuele afkorting.  
**Advies:** toegankelijke namen vóór livegang corrigeren en gericht met toetsenbord/screenreadersemantiek hertesten.

### 5.6 Navigatie

**Huidige situatie**  
De hoofdnavigatie is teruggebracht tot Vandaag, Werkelijkheid, Horizon en Werkruimte; Fundament staat secundair. Actieve canonieke routes worden correct gemarkeerd. WBD gebruikt dezelfde shelllogica met eigen inhoudelijke routes.

**Beoordeling**  
Rustig, logisch en passend bij dagelijks gebruik.

**Positief**

- Geen notificatiebadges of meldingengevoel.
- Semantische voorbereiding voor betekenisvolle aandacht is aanwezig zonder visuele indicatoren te activeren.
- Nummering geeft ritme zonder dashboardiconografie.
- Fundament is zichtbaar maar niet dominant.

**Verbeterpunten**

- De niet-canonieke hashes uit de reviewopdracht bestaan niet als targets. Dit is geen fout in de goedgekeurde IA, maar controlelinks en documentatie moeten de canonieke routes gebruiken.
- Op 390 px en in de WBD mobiele shell loopt de horizontale navigatie bewust door buiten de eerste breedte; het laatste item is gedeeltelijk zichtbaar en vraagt horizontaal scrollen. Functioneel bruikbaar, maar niet volledig vanzelfsprekend.

**Prioriteit:** B  
**Advies:** canonieke links consequent gebruiken; mobiele ontdekbaarheid na livegebruik beoordelen zonder badge- of notificatiepatroon toe te voegen.

### 5.7 Responsive, typografie, spacing en contrast

**Huidige situatie**  
Desktop, tablet, 430×932 en 390×844 zijn visueel gecontroleerd. Alle vastgelegde pagina's bleven binnen de documentbreedte.

**Beoordeling**  
Goed.

**Positief**

- Geen horizontale documentoverflow.
- Focus blijft op mobiel leesbaar en menselijk.
- Kolommen vallen logisch onder elkaar.
- Typografische schaal blijft overtuigend tussen Atlas, WBD en Experience.
- Warme contrastopbouw is visueel consistent; hoofdtekst en acties blijven duidelijk.

**Verbeterpunten**

- Kleine secundaire teksten en goudkleurige labels zitten visueel aan de subtiele kant. Er is in deze review geen volledige WCAG-kleurmeting uitgevoerd; dit blijft een gerichte acceptatiecontrole bij de drie A-correcties.
- Horizontale navigatie vraagt op smalle schermen actieve ontdekking.

**Prioriteit:** B voor aanvullende contrastmeting en mobiele navigatie-evaluatie.  
**Advies:** geen brede visuele herziening; uitsluitend meetbare toegankelijkheidscontrole.

### 5.8 Gedeeld design system en WBD-consistentie

**Huidige situatie**  
Atlas en WBD gebruiken dezelfde shellprincipes, spacingdiscipline, warme kleurwereld en serif/sans-hiërarchie. WBD gebruikt in de Workspace dezelfde officiële W/diagonal/BD-logo-opbouw als de publieke website.

**Beoordeling**  
Sterk, met één browsermerkfout.

**Positief**

- De Workspace-logo-uitvoering is consistent.
- Atlas blijft als A-merk herkenbaar zonder van de familie los te raken.
- De vergelijking van openingen toont verwantschap zonder duplicatie.
- Navigatie is voorbereid op aandacht, niet op notificaties.

**Verbeterpunten**

- `website/index.html` verwijst naar `/favicon.svg`; het aanwezige bestand in `website/public/favicon.svg` is het paarse Vite-standaardbeeld.
- `experience.html` bevat geen `rel="icon"`-koppeling.

**Prioriteit:** A  
**Advies:** vóór livegang overal dezelfde officiële WBD-browseridentiteit gebruiken en op publieke website, Atlas, WBD en Experience controleren.

### 5.9 Experience en Observatory

**Huidige situatie**  
Het actuele lokale Experience-pakket toont First Visit V2 achter `/ervaar`. `/e/` zonder token verwijst naar `/ervaar`; een ongeldige token blijft in een rustige persoonlijke-toegangsfout; Observatory benoemt zichzelf als afgeschermde interne omgeving voor onderzoek, menselijke review en historische Experiences.

**Beoordeling**  
De lokale implementatie voldoet inhoudelijk aan UXA-01 en UXA-02. De huidige productiehost niet.

**Positief**

- Uitnodiging is niet langer het hoofdconcept.
- `/ervaar` is in de implementatie de menselijke ingang.
- Privacytaal is concreet, rustig en niet-commercieel.
- Observatory is niet als primaire Experience-route gepositioneerd.
- Bestaande tokencompatibiliteit blijft afgebakend.

**Verbeterpunten**

- Op productie toont `/ervaar` nog “Laten we beginnen bij één moment uit je werkdag” in plaats van First Visit V2 “In welke branche werken we vandaag?”.
- De canonical op productie blijft `https://experience.webuildanddesign.nl/e/`.
- De lokale implementatie zet de canonical wel op `/ervaar/` en toont de goedgekeurde flow.

**Prioriteit:** A  
**Advies:** vóór livegang implementatie, deploypakket en productiehost gelijk trekken en daarna `/ervaar`, `/e/`, geldige token, ongeldige token, privacy en Observatory opnieuw op productie valideren. Dit is releaseconsistentie, geen nieuw Experience-concept.

### 5.10 Lege toestanden

**Huidige situatie**  
De observatiereview is leeg en communiceert dit zonder urgentie of foutgevoel. Ideeën en andere rustige lagen laten ruimte wanneer er niets actief is. Fundament is bewust vrijwel leeg.

**Beoordeling**  
Goed voor observaties; Fundament is zichtbaar onaf maar correct binnen de expliciete scopegrens.

**Positief**

- Geen nepdata toegevoegd om activiteit te suggereren.
- Geen badge of rode leegtestatus.
- Lege observatiestaat bevestigt menselijke rust.

**Verbeterpunten**

- Fundament oogt als lege bestemming met veel witruimte. Dit is bewust omdat UXA-07 niet binnen Project 001 valt.

**Prioriteit:** C  
**Advies:** geen inhoud toevoegen binnen deze review.

### 5.11 Toegankelijkheid, console en performance

**Huidige situatie**

- Eén hoofd-H1 per gecontroleerde surface.
- `main`-landmark aanwezig op Atlas, Fundament, WBD, Experience, Privacy en Observatory.
- Geen dubbele ids gevonden.
- Geen afbeeldingen zonder `alt` gevonden.
- Geen horizontale documentoverflow gevonden.
- Browserconsole: 0 errors, 0 warnings in de gecontroleerde routes.
- Volledige testset: 239/239 geslaagd.
- Navigatie en paginaovergangen reageerden lokaal zonder zichtbare blokkade of layoutverspringing.

**Beoordeling**  
Technisch stabiel met één concrete toegankelijkheidsfout.

**Positief**

- Geen functionele regressie in de bestaande testset.
- Geen consolevervuiling.
- Responsive layouts blijven geometrisch stabiel.
- Formulieren gebruiken overwegend echte labels.

**Verbeterpunten**

- De twee later zichtbare Understanding-tekstvelden missen een toegankelijke naam.
- Deze review bevat geen Lighthouse- of volledige WCAG-audit; performancebeoordeling is gebaseerd op actuele lokale navigatie, console, layoutstabiliteit en bestaande regressievalidatie.

**Prioriteit:** A voor veldnamen; B voor een meetbare eindcontrole van contrast en performance.  
**Advies:** houd de acceptatiecontrole klein en gericht; geen nieuw ontwerp.

## 6. Eerder besproken reviewpunten

| Reviewpunt | Uitkomst |
|---|---|
| Hero niet meer te groot | Voldoet |
| Workspace-gevoel vergelijkbaar met WBD | Voldoet |
| Geen tweede landing | Voldoet |
| Waarnemen correct gepositioneerd | Voldoet, binnen Werkelijkheid |
| Fundament secundair | Voldoet |
| Observaties logisch | Voldoet |
| Understanding geen tweede waarheid | Voldoet |
| Navigatie rustig | Voldoet |
| Geen notificatiegevoel | Voldoet |
| Geen dashboardgevoel | Voldoet |
| Consistente warme ontwerpstijl | Voldoet |
| Geen horizontale overflow | Voldoet op alle gecontroleerde viewports |
| Favicon | Voldoet niet — A |
| WBD-logo overal gelijk | Voldoet in de Workspace; browseridentiteit niet |
| Experience uitsluitend `/ervaar` als primaire ingang | Voldoet lokaal; productie wijkt af — A |
| Observatory correct gepositioneerd | Voldoet |
| Geen legacyteksten meer | Voldoet in actuele implementatie; productie is achtergebleven |
| Responsive gedrag | Voldoet, met B-aandacht voor horizontale mobiele navigatie |
| Betekenisvolle aandacht i.p.v. notificaties | Voldoet; voorbereiding aanwezig, geen badges |
| Rustige lijniconografie als toekomstige richting | Niet geïmplementeerd, correct buiten scope |
| Workspace als dagelijkse werkomgeving | Voldoet |
| Gedeelde ontwerpfilosofie WBD en Atlas | Voldoet |

## 7. Prioriteiten

### A — Moet vóór livegang en vóór afsluiting

1. Officiële favicon/browseridentiteit consistent maken; Vite-favicon verwijderen en Experience voorzien van dezelfde officiële merkidentiteit.
2. De twee Understanding-tekstvelden in de bestaande afgeleide flow een programmatisch toegankelijke naam geven.
3. Het actuele Experience-deploypakket en productie gelijk trekken, met productievalidatie van `/ervaar`, `/e/`, geldige en ongeldige token, privacy, canonical en Observatory.

### B — Kan na livegang

1. Lange labels in compacte Atlas-routekaarten typografisch verfijnen.
2. Mobiele ontdekbaarheid van de horizontale Atlas- en WBD-navigatie op basis van dagelijks gebruik beoordelen.
3. Canonieke hashes consequent in controlelinks en documentatie gebruiken.
4. Gerichte, meetbare contrast- en performancecontrole uitvoeren zonder visuele herbouw.

### C — Toekomstige roadmap

1. Fundament inhoudelijk invullen binnen de reeds bestaande, expliciet latere richting.
2. Rustige lijniconografie en betekenisvolle aandachtindicatoren pas beoordelen wanneer die bestaande roadmapfase aan de orde is; geen notificatiebadges.

Deze C-punten introduceren geen nieuwe richting en zijn geen onderdeel van het afsluitbesluit voor UXA-03 t/m UXA-06.

## 8. Definitief advies

**NO-GO voor afsluiting van Project 001 in de huidige staat.**

Atlas zelf heeft het beoogde integrale kwaliteitsniveau vrijwel bereikt. De methode is duidelijk, de dagelijkse Workspace voelt rustig en menselijk, de opening is beheerst, Werkelijkheid en Werkruimte hangen logisch samen en WBD en Atlas vormen één ontwerpfamilie.

Afsluiting wordt uitsluitend tegengehouden door de drie concrete A-punten: browsermerkidentiteit, de twee toegankelijke veldnamen en de afwijkende Experience-productiedeployment. Na correctie en gerichte hervalidatie van precies deze punten kan het afsluitbesluit opnieuw worden genomen. Er is geen aanleiding voor een nieuw concept, nieuwe functionaliteit, nieuwe informatiearchitectuur of een nieuwe UXA-reeks.

Tot die gezamenlijke bespreking en expliciete vervolgopdracht blijft de implementatie ongewijzigd.
