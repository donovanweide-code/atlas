# Sprint 001 — Atlas Foundation

## Doel

Donovan kan zijn werkdag beginnen vanuit Atlas: één rustige interne voordeur die focus, cases, ideeën, sprintcontext en betekenisvolle lessen samenbrengt.

## Gebouwd

- Interne Workspace op `/atlas`.
- Dagfocus die lokaal bewaard blijft.
- Overzicht van Case 0001 en Case 0002.
- Ideeën met de statussen Zaadje, Groei en Klaar om te bouwen.
- Lokaal Atlas Logboek.
- Operationele documentatiestructuur en twee case-dossiers.

## Bewust niet gebouwd

- Database, account of synchronisatie.
- Klantportaal.
- WordPress-plugin.
- Eigen AI-chat.
- GitHub- of Search Console-koppeling.
- Automatische momentumdetectie.

Deze onderdelen zijn niet afgewezen. Zij moeten zich eerst in werkelijk gebruik verdienen.

## Review

### 1. Wat is gebouwd?

Een eerste werkbare Atlas Workspace en de documentatie die dagelijks gebruik, cases, beslissingen en lessen met elkaar verbindt.

### 2. Waarom deze keuze?

De Workspace maakt het hoofddoel direct toetsbaar zonder voortijdige infrastructuur. Alles wat wordt bewaard heeft morgen een concrete functie.

### 3. Welke verbeteringen worden voorgesteld?

Observeer één tot twee weken welke onderdelen Donovan werkelijk gebruikt. Verbeter daarna navigatie, invoer of casecontext op basis van frictie, niet op basis van mogelijkheden.

### 4. Wat verdient een volgende sprint?

De AquaFlask-context samen invullen en onderzoeken of een gedeelde, duurzame opslag nodig wordt. Alleen werkelijk gebruik kan dat bevestigen.

### 5. Wat is bewust nog niet verdiend?

Authenticatie, database, klantportaal, integraties, notificaties, AI-functionaliteit en automatische analyses.

### 6. Welke risico’s zijn zichtbaar?

`localStorage` is apparaatgebonden en heeft geen back-up. Een interne route zonder authenticatie mag op een publieke productieomgeving geen vertrouwelijke klantgegevens bevatten.

### 7. Welke kansen zijn zichtbaar?

Het vaste caseformat kan snel duidelijk maken welke context terugkomt en welke lessen werkelijk herbruikbaar zijn. Daarmee kan Atlas organisch groeien uit echte opdrachten.

### 8. Welke verrassing ontstond tijdens het bouwen?

De bestaande Foundation bevatte al vrijwel de volledige grondwet. De grootste winst kwam daarom niet uit méér filosofische documenten, maar uit rustige toegang tot die betekenis tijdens de werkdag.

## Eerstvolgende toets

Open `/atlas` tijdens een echte werkdag. Kan Donovan binnen één minuut zien wat vandaag betekenis heeft en aan het einde één bruikbare les bewaren?

## Afronding — Sprint 001B

De kritische review van Sprint 001A liet zien dat de eerste Workspace nog te veel een visueel werkmodel was. Sprint 001B sluit de vier praktische gaten:

- de dagfocus is bewerkbaar, datumgebonden en begrensd op drie stappen;
- een nieuwe werkdag vraagt bewust om leeg beginnen of onafgeronde stappen overnemen;
- AquaFlask kan vanuit `/atlas` lokaal worden geopend en bijgewerkt;
- We Build And Design is zichtbaar de hoofdcase zonder fictieve voortgang;
- het kompas geeft één transparante aanbeveling op basis van dagfocus en casecontext;
- lokale data wordt gevalideerd en opslagresultaten worden zichtbaar teruggekoppeld.

De Workspace blijft bewust lokaal. Er is geen authenticatie, synchronisatie of back-up. Gebruik daarom geen vertrouwelijke klantgegevens en beschouw werkelijk dagelijks gebruik als de toets voor iedere volgende uitbreiding.

## Correctie en hervatting — Sprint 001C

### Herkende afwijking

De eerste uitvoering van Sprint 001C verschoof ongemerkt van een zichtbaar AquaFlask-bedrijfsprofiel naar een bredere Understanding-architectuur. Die implementatie blijft als onafgerond werk staan voor een aparte review, maar bepaalt niet langer het sprintdoel.

### Les voor Atlas

Een technisch waardevolle verbetering is niet automatisch de afgesproken verbetering. Atlas bewaakt eerst het zichtbare sprintdoel; grotere methodische of architectonische uitbreidingen worden vooraf gerapporteerd en niet stilzwijgend uitgevoerd.

**Vaste Atlas-regel:** iedere sprint moet zichtbaar zijn. Donovan moet Atlas na iedere sprint anders kunnen ervaren en kunnen voelen dat Atlas een betere collega is geworden.

### Doel Sprint 001C

Wanneer Donovan AquaFlask vanuit de bestaande casekaart opent, ziet hij een rustig bedrijfsprofiel waarin relatiekennis, de actuele productcase, blijvende kennis, risico's, kansen, onbekenden en één betekenisvolle aanbeveling herkenbaar van elkaar zijn onderscheiden.

**Primair acceptatiecriterium:** “Ja… Atlas kent AquaFlask.”

## Formele afsluiting — Sprint 001C

- **Datum:** 2026-07-21
- **Status:** Inhoudelijk afgerond — GO
- **Besluit door:** Donovan
- **Vervolgstatus:** Gesloten; geen nieuwe wijzigingen meer toevoegen aan Sprint 001C.

### Sprintdoel

Sprint 001C moest Donovan na afloop iets aantoonbaar nieuws geven om te bekijken. Wanneer AquaFlask vanuit de bestaande casekaart werd geopend, moest de ervaring zeggen: “Atlas kent deze klant.” Het resultaat mocht niet alleen uit architectuur, modellen of documentatie bestaan en mocht niet als dashboard, CRM-item of technisch dossier voelen.

### Uitgangssituatie

- Sprint 001B bood een bruikbare lokale Workspace met Kompas, dagfocus, cases, ideeën en Logboek.
- AquaFlask kon worden geopend en lokaal bijgewerkt, maar voelde nog niet als een gekende relatie.
- Bestaande repositorykennis over AquaFlask was niet zichtbaar samengebracht.
- Een eerste uitvoering van 001C verschoof naar een bredere Understanding-architectuur en behandelde AquaFlask ten onrechte als leeg.
- Die afwijking is niet weggegooid of automatisch teruggedraaid; zij is als onafgerond werk gemarkeerd voor een aparte review.

### Repository- en klantanalyse

Voor de hervatting zijn Foundation, Sprint 001, Decisions, Logboek, beide cases, de actuele Git-status en de volledige werkdiff gecontroleerd. De genoemde AquaFlask-incidentnotitie en database-export stonden niet in de checkout of Git-geschiedenis. De door Donovan bevestigde onderzoeksuitkomsten zijn daarom herleidbaar vastgelegd in `clients/0002-aquaflask/INCIDENT-2026-07-PRODUCT-CREATION.md`, met de expliciete beperking dat het bronbestand zelf niet in de repository aanwezig is.

Het onderzoek bevestigde binnen de beschikbare snapshot en testcontext:

- WordPress en WooCommerce als bestaande omgeving;
- 190 producten in de databasesnapshot van 18 juli 2026;
- structureel gezonde productdata en gezonde lookup- en mediagegevens binnen die snapshot;
- succesvolle publicatie van een eenvoudig testproduct;
- een niet-reproduceerbare oorspronkelijke fout en dus een open oorzaak;
- een bekende updatehistorie en verhoogd wijzigingsrisico;
- 1.680 mislukte Action Scheduler-acties, grotendeels uit één image-cleanuphook, als onderhoudsruis zonder bewezen oorzakelijk verband met de productmelding.

### Implementatiekeuzes

- De bestaande AquaFlask-casekaart werd volledig klikbaar en opent een rustig bedrijfsprofiel binnen dezelfde Workspace.
- AquaFlask staat in het profiel centraal als relatie; de actuele productcase is zichtbaar gescheiden van blijvende klantkennis.
- Bevestigde kennis, onbekenden, risico's, kansen en één aanbeveling hebben ieder een herkenbare betekenis.
- Risico's zijn vertaald naar menselijke consequenties in plaats van alleen technische aantallen.
- Kansen zijn bewust buiten de actieve productcase geplaatst en nemen de klantvraag niet over.
- De eerstvolgende aanbeveling kiest geen oplossing: wacht op een concrete herhaling en leg dan tijdstip, account of rol, producttype, stappen en volledige foutmelding vast.
- Bestaande lokale werknotities zijn behouden in een rustige inklapbare laag.
- Er is geen nieuwe database, koppeling, authenticatie, synchronisatie, AI-analyse of brede architectuur toegevoegd.

### Visuele, interactie- en toegankelijkheidskeuzes

- Het profiel gebruikt de bestaande Atlas-tokens en Presence, met een warme lichte compositie binnen de donkere Workspace.
- De ervaring gebruikt geen statistiektegels, grafieken, percentages, badgesysteem of tekstafkapping.
- De casekaart werkt met muis en toetsenbord.
- Bij openen gaat de focus naar “Sluit profiel”; na sluiten keert de focus terug naar de casekaart.
- Een gevonden overlap in de desktophero is tijdens review hersteld.
- Een gevonden mobiele horizontale overflow van 17 pixels is hersteld.
- Op 390 × 844 pixels stapelen alle profielonderdelen zonder afgekapte tekst of horizontale pagina-overflow.

### Tests en verificatie

- TypeScript-controle: geslaagd.
- Domein- en profieltests: 8 van 8 geslaagd.
- Vite-productiebuild: geslaagd.
- `git diff --check`: geslaagd.
- Browsercontrole: geen consolefouten.
- Toetsenbordopening, focusoverdracht en focusterugkeer: gecontroleerd.
- Mobiele breedte en tekstafkapping: gecontroleerd.
- Profieltests bewaken de bevestigde feiten, expliciete onbekenden en het ontbreken van een vooraf gekozen oplossing.

### Eindresultaat en GO

De review bevestigt dat de Workspace voor het eerst als begeleiding in plaats van software voelt. Het Kompas opent vanuit Foundation, cases voelen als relaties en AquaFlask wordt herkenbaar behandeld als een bestaande klant met context. Daarmee is het primaire acceptatiecriterium voldoende bereikt.

Sprint 001C heeft een inhoudelijke **GO** gekregen. De sprint is afgesloten; toekomstige inzichten worden niet met terugwerkende kracht als 001C-scope toegevoegd.

### Blijvende lessen

- Iedere sprint bouwt uitsluitend het overeengekomen doel.
- Een technisch sterke verbetering kan nog steeds de verkeerde sprintverbetering zijn.
- Architectuur- of methode-uitbreidingen worden eerst gerapporteerd en voorgelegd.
- Iedere sprint moet zichtbaar zijn: Donovan moet Atlas aantoonbaar anders kunnen ervaren.
- Ontbrekende kennis blijft onbekend; zij wordt nooit aangevuld op basis van aannames.
- Repository, documentatie, cases, onderzoeken en besluiten worden vóór nieuw werk geïnspecteerd.
- Kennis is niet automatisch interface. De volgende volwassenheidsstap is redactioneel oordeel: Focus, Horizon en Stilte.

### Verantwoordelijkheid

- Donovan beslist over methode, scope, prioriteit en acceptatie.
- Atlas begrijpt, bewaart context en betekenis en bepaalt welke volgende betekenisvolle stap aandacht verdient.
- Codex onderzoekt, bouwt, test en documenteert en mag verbeteringen actief signaleren, maar verandert methode of sprintscope niet zonder besluit van Donovan.

### Bewust niet gebouwd

- Geen Design Memory of nieuwe documentatiestructuur.
- Geen automatische zelflerende functies of AI-analyse.
- Geen database- of live WordPress-koppeling.
- Geen uploads, synchronisatie, authenticatie of klantportaal.
- Geen verdere uitbreiding van Understanding, lineage of Atlas Lab binnen de hervatte sprint.
- Geen nieuwe functionaliteit op basis van Focus, Horizon en Stilte; deze zijn uitgangspunten voor toekomstig werk.

### Werkboom bij handoff

De volledige Sprint 001C-implementatie en documentatie staan lokaal in een nog niet gecommitte werkboom. Er is geen commit en geen push uitgevoerd. Bestaande ongetrackte logbestanden en de bestaande `plugins/`-map zijn niet gewijzigd of verwijderd.

### Finale continuïteitsverfijning vóór commit

Deze beperkte afronding heropent Sprint 001C niet. AquaFlask Understanding spreekt niet langer over import, migratie of een onafgeronde structuur, maar benoemt het actuele beeld, de open oorzaak, de herleidbare bronnen en waarom wachten nu de juiste stap is. Dezelfde technische migratietaal is uit de Understanding Study in Atlas Lab verwijderd. Er is geen Understanding-item toegevoegd en geen functionele toestand of opslag gewijzigd.

De blijvende principes voor redactioneel oordeel, herleidbaarheid en herzienbaarheid zijn compact canoniek vastgelegd in `Foundation.md`. De toekomstige uitwerking, schaalrisico's, hoofdcase-observatie en herbeoordelingstrigger staan als Horizonverkenning in `docs/ideas/005-Redactionele-Intelligentie.md`; zij zijn geen Sprint 001C-functionaliteit.

Na deze tekstuele verfijning slagen alle acht tests, de TypeScript- en Vite-productiebuild en `git diff --check`. De desktopweergave is inhoudelijk consistent. De visuele controle toont nog een bestaande responsieve spanning: rond 790 pixels breed raken de Understanding-filters en composer elkaar, omdat de tweekolomsindeling pas onder 720 pixels stapelt. Dit is niet binnen de toegestane tekstuele correctie gewijzigd en blijft vóór commit expliciet te beoordelen.
