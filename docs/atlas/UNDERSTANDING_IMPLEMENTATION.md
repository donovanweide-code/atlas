# Understanding — implementation note

> **Status 2026-07-21:** onafgerond werk, te reviewen buiten Sprint 001C. De eerdere aanname dat AquaFlask inhoudelijk leeg was, is door repository- en incidentcontext achterhaald. Sprint 001C bouwt eerst het zichtbare AquaFlask-bedrijfsprofiel en breidt deze architectuur niet verder uit.

## Doel

Deze verticale slice maakt **Understanding** herkenbaar als één methodestap binnen de bestaande publieke Experience, Workspace, cases, het Logboek en Atlas Lab.

De slice volgt de canonieke volgorde:

`Case → Understanding → werkelijke vraag → journey → inzicht → betekenisvolle volgende stap → mogelijke oplossing`

Zij levert geen automatische conclusie en genereert geen klantinhoud. AquaFlask heeft inmiddels bevestigde incident- en omgevingskennis; die wordt in Sprint 001C zichtbaar gemaakt in het bedrijfsprofiel en nog niet automatisch naar dit onafgeronde model gemigreerd.

## Huidige relevante architectuur

- `src/main.ts` kiest zonder routerframework tussen de publieke homepage, `/atlas`, `/atlas-lab` en de publieke vervolgroutes.
- `src/atlas-scenes.ts` configureert de gedeelde World Engine-scenes; `src/styles/atlas-expedition.css` vertaalt deze naar de publieke Experience.
- `src/atlas-workspace.ts` rendert de interne Workspace en beheert focus, cases, ideeën en logboekinteractie.
- `src/atlas-workspace-data.ts` valideert en bewaart lokale data per versiesleutel in `localStorage`.
- `src/atlas-lab.ts` is een zelfstandige interne onderzoeksruimte die geen publieke scene-motion aanstuurt.
- `clients/0001-we-build-and-design/CASE.md` en `clients/0002-aquaflask/CASE.md` bewaren de herleidbare casecontext in de repository.

## Wat al bestaat en wordt hergebruikt

- Case-identiteiten `0001` en `0002`.
- Veilige, lokale en versiegebonden opslag met foutterugkoppeling.
- De bestaande AquaFlask-caseweergave en het verbod op vertrouwelijke gegevens.
- Het Atlas Logboek als plek voor betekenisvolle veranderingen.
- Route 02 als publieke manifestatie van begrijpen vóór bouwen.
- De bestaande Presence: architectuur, cinematografische rust, gouden route, lichtreis en grote typografie.
- Atlas Lab als plaats voor observatie en voorstellen, niet voor autonome beslissingen.

## Inconsistenties

- De Workspace bewaart casevelden en logboekregels, maar nog geen gedeelde, traceerbare lijn tussen bron, observatie, vraag, inzicht en volgende stap.
- Een bestaand logboekitem is losse tekst zonder verwijzing naar de informatie die het rechtvaardigt.
- De oorspronkelijke slice behandelde AquaFlask ten onrechte als inhoudelijk leeg. Sprint 001C corrigeert dat op basis van het incidentdossier, zonder de Understanding-architectuur verder uit te breiden.
- Route 02 zegt dat WBD eerst begrijpt, maar laat nog beperkt ervaren waarom een eerste antwoord wordt uitgesteld.
- Atlas Lab toont visuele principes, maar nog niet hoe ontbrekend bewijs, open vragen en menselijke bevestiging worden bewaakt.

## Gedeeld domeinmodel

De eerste slice gebruikt één `UnderstandingStore` met:

- `UnderstandingItem`: bron, observatie, bewijs, vraag, aanname, spanning, patroon, onbekende, inzicht, mogelijke werkelijke vraag of betekenisvolle volgende stap;
- `UnderstandingRelationship`: een menselijke relatie zoals afgeleid van, ondersteunt, bevraagt, onthult, rechtvaardigt of vervangt;
- `UnderstandingRevision`: bewaart eerdere tekst, classificatie en status wanneer interpretatie verandert;
- herkomstvelden: case, auteur, tijdstip, bronlabel en interne/publieke zichtbaarheid;
- onzekerheid via de statussen waargenomen, onzeker, bewijs nodig, in ontwikkeling, bevestigd en vervangen;
- expliciete menselijke bevestiging op iedere relatie.

De publieke Experience gebruikt alleen de methodische taal van dit model. Interne case-inhoud wordt nooit publiek gerenderd.

## Voorgestelde gebruikersflow

1. Open Understanding vanuit een bestaande case.
2. Leg een bron, observatie, bewijs, vraag, aanname, spanning of onbekende vast.
3. Benoem herkomst en onzekerheid en verbind het item desgewenst aan bestaand materiaal.
4. Zoek, filter, herclassificeer of verfijn een item; iedere inhoudelijke wijziging bewaart een revisie.
5. Vorm handmatig een inzicht uit één of meer geselecteerde items.
6. Formuleer handmatig een mogelijke werkelijke vraag of betekenisvolle volgende stap en verbind die aan het inzicht.
7. Toon de volledige herkomstlijn in Understanding en leg betekenisvolle nieuwe inzichten en vervolgstappen met referenties vast in het Logboek.
8. Laat Atlas Lab uitsluitend open vragen, ontbrekend bewijs, expliciete spanningen en mogelijke relaties als te bevestigen voorstel tonen.

## Kleinste zinvolle verticale slice

Eén gebruiker kan binnen Case 0001 of Case 0002:

1. een herleidbare observatie vastleggen;
2. er een vraag aan verbinden;
3. uit geselecteerde informatie een inzicht formuleren;
4. vanuit dat inzicht een betekenisvolle volgende stap formuleren;
5. de herkomst en revisiegeschiedenis terugzien;
6. dezelfde methodestap herkennen in publieke Route 02 en in de ondersteunende Lab-studie.

Case 0001 krijgt alleen een kleine set verifieerbare repositoryfeiten als demonstratie. Case 0002 krijgt uitsluitend een lege, uitnodigende structuur.

## Geraakte bestanden

- `docs/atlas/UNDERSTANDING_IMPLEMENTATION.md`
- `clients/0001-we-build-and-design/CASE.md`
- `clients/0002-aquaflask/CASE.md`
- `website/src/atlas-understanding.ts`
- `website/src/atlas-workspace-data.ts`
- `website/src/atlas-workspace.ts`
- `website/src/atlas-lab.ts`
- `website/src/main.ts`
- de bestaande stylesheets voor Workspace, Lab en World Engine
- `website/package.json`
- gerichte domeintests onder `website/tests/`

## Risico's

- `localStorage` blijft apparaatgebonden en heeft geen back-up.
- De hoeveelheid mogelijke classificaties kan alsnog als systeemtaal voelen; labels en zichtbaarheid moeten daarom sober blijven.
- Automatisch gesuggereerde relaties kunnen als waarheid worden gelezen; alle Lab-resultaten blijven expliciet voorstellen.
- De huidige CSS-cascade is omvangrijk. De slice voegt alleen lokale stijlen toe en start geen grootschalige refactor.
- De incidentkennis is voldoende voor een eerste bedrijfsprofiel, maar merkidentiteit, doelgroep en exacte incidentcontext blijven onbekend.

## Open vragen

- Welke bronvormen ontstaan in echte gesprekken: notities, citaten, documenten, e-mail of observaties?
- Wanneer noemt Donovan iets een inzicht in plaats van een patroon in ontwikkeling?
- Welke revisies moeten zichtbaar blijven in de dagelijkse interface en welke alleen technisch herleidbaar?
- Is lokale export nodig, en zo ja: welk aantoonbaar verliesrisico rechtvaardigt dit?
- Welke onderdelen van Understanding mogen ooit met een klant worden gedeeld?

## Gerealiseerde verticale flow

1. De gebruiker opent een bestaande case en kiest **Open Understanding**.
2. In de rustige luisterruimte legt de gebruiker een bron, waarneming, bewijs, vraag, aanname, spanning, patroon of onbekende vast, inclusief herkomst, status en onzekerheid.
3. Een nieuw of bestaand item kan expliciet aan ander casemateriaal worden gerelateerd. Iedere opgeslagen relatie is gemarkeerd als menselijk bevestigd.
4. Zoeken en filters brengen materiaal terug; **Verfijn** herclassificeert of wijzigt een item en bewaart de eerdere betekenis als revisie.
5. De gebruiker selecteert één of meer items en formuleert zelf een inzicht. Atlas bewaart de bronrelaties en toont de herkomstlijn.
6. Alleen vanuit een inzicht kan een betekenisvolle volgende stap worden gemaakt. Het Logboek neemt inzicht of stap op met verwijzingen naar de volledige herkomst.
7. Atlas Lab signaleert bestaande open vragen en ontbrekend bewijs zonder terug te schrijven. Een beoordelingslink opent het betreffende item in de Workspace, waar een mens het kan bevestigen, aanpassen of vervangen.
8. De publieke Route 02 stelt het eerste antwoord uit, stelt een betere vraag en beweegt pas daarna naar het digitale fundament.

Voor AquaFlask is deze flow nog niet gereviewd of gevuld. Het afzonderlijke bedrijfsprofiel toont de reeds bevestigde kennis en is tijdens Sprint 001C de actuele visuele casebron.

## Methodische keuzes

- Eén itemmodel bewaart verschillende betekenisdragers; `kind` maakt herclassificatie mogelijk zonder data tussen tabellen te kopiëren.
- Inzichten vereisen minimaal één bronitem en vervolgstappen vereisen een inzicht.
- Relaties zijn expliciet en menselijk bevestigd; Atlas Lab is read-only en genereert geen klantinhoud.
- Revisies bewaren snapshots voor en na de wijziging, inclusief classificatie, status en onzekerheid.
- De publieke Experience importeert alleen gedeelde methodische taal en nooit interne case-inhoud.
- AquaFlask krijgt geen automatisch bedachte vraag of oplossing. De zichtbare aanbeveling is rechtstreeks gebaseerd op het bestaande incidentonderzoek: wacht op herhaling en leg de context volledig vast.

## Bewuste beperkingen

- Opslag blijft lokaal in één browser; er is nog geen synchronisatie, export, back-up of samenwerking.
- Het model kent een vrij bronlabel, maar nog geen upload, document-ID of immutable bronarchief.
- Atlas Lab groepeert nog niet automatisch en stelt nog geen relaties voor; de eerste slice beperkt zich bewust tot veilige, read-only signalering.
- Een mogelijke werkelijke vraag wordt in dezelfde composer vastgelegd en gerelateerd; er is geen aparte journey-editor.
- De publieke flow is tekstueel en interactioneel verfijnd binnen de bestaande Presence; er is geen nieuwe motionlaag toegevoegd.

## Bewijs per acceptatiecriterium

1. **Eén gedeelde methodestap:** `atlas-understanding.ts` wordt gebruikt door Workspace, Logboek en Lab; de publieke route gebruikt dezelfde methodische kerntekst.
2. **Publiek voelbaar, niet uitgelegd:** Route 02 toont eerste antwoorden, stelt die uit, stelt één betere vraag en leidt naar de volgende betekenisvolle route.
3. **Van bewijs naar helderheid:** de Workspace ondersteunt bron, waarneming, bewijs, vraag, patroon, inzicht, werkelijke vraag en stap in één luisterruimte.
4. **Traceerbaarheid:** relaties plus `getUnderstandingLineage` verbinden items; het Logboek rendert die lijn bij inzichten en vervolgstappen.
5. **Onzekerheid en revisie:** zes statussen, drie onzekerheidsniveaus en bewaarde voor/na-snapshots zijn geïmplementeerd en getest.
6. **AquaFlask zonder fictie:** het bedrijfsprofiel gebruikt uitsluitend bevestigde repository- en incidentkennis; ontbrekende merk- en incidentinformatie blijft expliciet onbekend.
7. **Lab ondersteunt:** Lab leest hetzelfde model, schrijft niets terug, noemt signalen geen conclusies en verwijst voor beoordeling naar de Workspace.
8. **Aansluiting op Foundation:** de bestaande methode en terminologie zijn verdiept; `Foundation.md` maakt de herkomstlijn en menselijke bevestiging canoniek.
9. **Presence behouden:** bestaande routes, scenes, assets, layouts en stylesheets zijn lokaal uitgebreid; geen redesign of design-systemlaag.
10. **Zichtbare toevoegingen hebben een functie:** iedere toevoeging bewaart een onderscheid, maakt een betere vraag mogelijk, toont herkomst of ondersteunt een gerechtvaardigde volgende stap.

## Verificatie

- `npm test`: vijf domeintests geslaagd.
- `npm run build`: TypeScript-controle en Vite-productiebuild geslaagd.
