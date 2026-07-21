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

Na deze tekstuele verfijning slaagden alle acht tests, de TypeScript- en Vite-productiebuild en `git diff --check`. De daarna goedgekeurde laatste responsieve correctie liet de Understanding-layout eerder naar één kolom schakelen en is binnen de definitieve Sprint 001C-commit afgerond.

## Sprint 001D — De magie zichtbaar maken

- **Datum:** 2026-07-21
- **Status:** Implementatie gereed; visuele gebruikersreview nog vereist.
- **Besluit door:** Donovan.

### Analyse

De publieke Experience droeg de Atlas-houding al sterk: rust, begrip vóór realisatie en de ondernemer als hoofdpersoon. Tegelijkertijd verborg zij bijna dat We Build And Design websites realiseert, legde zij de methode vaker uit dan zij die bewees en eindigde de route naar contact zonder een bevestigd kanaal dat in de repository verantwoord kon worden toegevoegd.

De Workspace bevatte de juiste kennis, maar koos zonder dagfocus automatisch AquaFlask terwijl die case terecht op nieuw bewijs wacht. Case 0001 bezat rijke repositorycontext, maar opende als technisch Understanding-overzicht in plaats van als actueel redactioneel oordeel.

### Nieuwe inzichten

- Selecteren is verantwoordelijkheid: zodra Atlas bepaalt wat Donovan ziet, is interfacevolgorde geen neutrale vormgeving meer.
- Een volgende stap is pas geleverd wanneer de ontvanger haar zonder aanvullende vertaalslag kan gebruiken.
- Atlas moet ook semantisch onzichtbaar blijven; publieke alternatieve teksten noemen geen intern Atlas Studio-concept.
- Een nieuwe positionering hoeft de bestaande ingang niet te vervangen. De website is de publieke deur; Atlas is de manier waarop WBD achter die deur begrijpt.
- Consistentie is niet hetzelfde als volledigheid. Een rustige route kan nog steeds bewijs, mensen of handelingsperspectief missen.

### Bevestigde aannames

- De website is de natuurlijke eerste ingang voor We Build And Design.
- De bestaande Presence draagt rust, vertrouwen en zorgvuldigheid en hoeft niet te worden vervangen.
- Case 0001 is de juiste levende case om redactioneel oordeel handmatig te bewijzen.
- Onvoldoende publiek bewijs moet als open ruimte worden behandeld, niet met fictieve cases, resultaten, cijfers of testimonials worden gevuld.

### Ontkrachte aannames

- Een samenhangende visuele reis is niet automatisch een complete ondernemersreis.
- Een Kompas bovenaan de Workspace kiest niet vanzelf de juiste prioriteit.
- Meer opgeslagen Understanding levert niet automatisch een betekenisvollere interface op.
- Het herhalen van de methode over meerdere routes maakt haar niet vanzelf geloofwaardiger.

### Implementatie

- De publieke hero benoemt websites expliciet als concrete ingang en laat de volgende stap semantisch aansluiten op de Understanding-route.
- Het digitale fundament wordt als samenhang achter de website gepositioneerd, zonder Atlas publiek te maken.
- De Diensten-route begint bij de website en verbindt strategie, ontwerp en technologie als één richting.
- De Projecten-route bevat een rustige, bewijs-klare structuur die expliciet leeg blijft totdat werk, context en uitkomst bevestigd zijn.
- Publieke alt-teksten noemen niet langer het interne begrip `Atlas Studio`.
- Het bestaande `/contact`-gedrag blijft ongewijzigd; er zijn geen contactgegevens, formulieren, agenda's of boekingslinks verzonnen of toegevoegd.
- Het Workspace-Kompas kiest zonder bevestigde dagfocus of concrete AquaFlask-stap de eerste publieke minuut van We Build And Design.
- Case 0001 opent met huidige werkelijkheid, Atlas' begrip, de zestig-seconden-toets, Horizon, Bewuste Stilte en herleidbare bronnen. Technisch Understanding blijft beschikbaar als tweede laag.

### Open vragen

- Welk bevestigd publiek werk kan als eerste werkelijk bewijs worden gedeeld?
- Via welk reeds bestaand, bevestigd kanaal kan de publieke contactroute later werkelijk worden voltooid?
- Begrijpt een echte ervaren ondernemer binnen zestig seconden dat de website de concrete ingang is en WBD eerst het bedrijf erachter probeert te begrijpen?
- Welke mensen en welk vakmanschap mogen op termijn publiek zichtbaar worden zonder de ondernemer als hoofdpersoon te verdringen?

### Bewuste Stilte

- Geen nieuw contactkanaal, formulier, e-mailadres, telefoonnummer, WhatsApp-link of boekingssysteem.
- Geen fictieve case, testimonial, resultaat, cijfer of afgeleide claim.
- Geen automatische redactionele intelligentie; twee cases leveren daarvoor nog onvoldoende geschiedenis.
- Geen brede responsive redesign, dienstenherpositionering, prijsstructuur, analytics-implementatie of schaalarchitectuur.

### Aanbevelingen

Gebruik de zestig-seconden-toets eerst met echte ondernemers voordat bredere copy, navigatie of bewijsstructuren worden uitgebreid. Voeg het eerste publieke bewijs pas toe wanneer uitgangssituatie, belangrijkste keuze, werkelijk resultaat en toestemming samen beschikbaar zijn.

### Volgende sprint

Begin niet met meer interface. Begin met één bevestigde publieke bron: een werkelijk WBD-project of een werkelijk contactkanaal. Kies daarna de kleinste toevoeging die de huidige route aantoonbaar beslisbaarder maakt zonder de bestaande Presence te verliezen.

### Beste volgende vraag

> Welk eerste bevestigde bewijsstuk laat een ondernemer ervaren dat We Build And Design al heeft gekeken, zonder meer uit te leggen dan verantwoord is?

### Verificatie

- Domein- en redactietests: 11 van 11 geslaagd.
- TypeScript- en Vite-productiebuild: geslaagd.
- `git diff --check`: geslaagd.
- Lokale browserverificatie: nog niet verantwoord afgerond; de browserbeveiliging weigerde lokale navigatie en is niet omzeild.

### Methodische aanscherping — Waarnemen vóór Review

Tijdens het onderzoek naar een mogelijke feedbackmodule werd zichtbaar dat `Review Mode` methodisch te laat begon. Review veronderstelt al een menselijke beoordeling: iets wordt goedgekeurd, afgewezen, geprioriteerd of als probleem benoemd. Atlas hoort vóór die betekenisvorming eerst ruimte te maken voor wat iemand werkelijk ziet of ervaart.

Daarom heet de eerste laag voortaan `Waarnemen`. Donovan legt een waarneming vast terwijl de ervaring nog aanwezig is. Atlas herkent de pagina, het betekenisvolle onderdeel, de case, sprint en technische context; Donovan bevestigt die context. De waarneming blijft daarna expliciet `Nog niet beoordeeld`.

Deze ontdekking scherpt de Atlas-methode aan omdat zij een ontbrekende stap zichtbaar maakt tussen Werkelijkheid en Understanding. Een waarneming is geen waarheid, conclusie, probleem of taak. Ook een positieve ervaring is geldig. Pas menselijke beoordeling bepaalt of de waarneming betekenis heeft, bewust open blijft, wordt verworpen of na bevestiging naar Understanding mag worden gebracht.

De vastgelegde volgorde is:

**Werkelijkheid → Waarnemen → Waarneming → Atlas herkent de context → Donovan bevestigt de context → Nog niet beoordeeld → Menselijke beoordeling → Eventueel Understanding → Inzicht → Volgende stap**

Er is in deze methodische stap geen Waarnemen-interface, Review Mode, opslagmodel of andere functionaliteit gebouwd. De methode wordt eerst beoordeeld voordat implementatie start.

## Sprint 001E — Maak de groei van Atlas zichtbaar

- **Datum:** 2026-07-21
- **Status:** Gebouwd en technisch geverifieerd.
- **Case:** 0001 · We Build And Design.

### Doel

Waarnemen zichtbaar en werkend maken als de kleinste volledige keten tussen een ervaring in de publieke We Build And Design Experience en een contextgebonden, nog niet beoordeelde waarneming in de Atlas Workspace.

### Uitgangssituatie

De methode `Waarnemen vóór Review` was in Foundation en D-008 vastgelegd, maar nog niet ervaarbaar. Donovan moest buiten Atlas screenshots maken, uploaden en context opnieuw uitleggen. De bestaande Workspace kende bovendien geen afgescheiden plek voor vastgelegde werkelijkheid die nog geen Understanding, oordeel of taak was.

De goedgekeurde maar nog niet gecommitte Sprint 001D-verfijningen stonden in dezelfde werkboom. Sprint 001E bouwt daarop voort zonder die wijzigingen te overschrijven of buiten hun goedgekeurde scope uit te breiden.

### Implementatiekeuzes

- De Workspace toont Waarnemen direct onder het Kompas en als vaste navigatiestap. Het Kompas verwijst in één rustige regel naar beschikbaarheid, actieve context en het aantal waarnemingen.
- Donovan activeert de keten lokaal voor de vaste Case 0001 en bevestigt expliciet de sprint; `001E` is alleen de voorgestelde beginwaarde.
- Alleen bij een geldige lokale activering wordt de publieke Waarnemen-module dynamisch geladen.
- De publieke knop blijft klein en vast staan, veroorzaakt geen layoutverschuiving en opent een compacte niet-modale invoerlaag.
- Atlas toont pagina, voorgestelde ervaringsgrens, case, sprint, viewport en moment vóór opslag. Alleen de ervaringsgrens kan in deze eerste versie worden gecorrigeerd.
- Vijf betekenisvolle grenzen gebruiken stabiele `data-atlas-observation`-ID's en eigen ankers; bestaande scene-ID's en willekeurige DOM-selectors bepalen geen betekenis.
- De opgeslagen waarneming bewaart labels naast ID's en heropent de oorspronkelijke route bij de bevestigde ervaringsgrens.
- De Workspace toont tekst, status, moment en volledige context zonder backlogtaal, classificatie of vervolgactie.

### Methodische grenzen

Het Waarnemen-domein importeert niets uit Understanding, Focus, Ideeën of Logboek en schrijft daar niet naar. Iedere opgeslagen waarneming blijft `Nog niet beoordeeld`. Atlas herkent context; Donovan bevestigt uitsluitend die context. Er ontstaat geen automatische waarheid, betekenis, diagnose, oplossing of sprintwijziging.

### Toegankelijkheid en ervaring

- De publieke invoer opent met focus in het tekstveld.
- `Escape` sluit de laag en geeft focus terug aan `Waarnemen`.
- Alle knoppen, het tekstveld en de contextcorrectie hebben zichtbare toetsenbordfocus.
- De laag past op 390 × 844 pixels en veroorzaakt geen horizontale overflow.
- Reduced motion wordt gerespecteerd.
- Zonder lokale activering bestaat geen publieke Waarnemen-interface.

### Tests en verificatie

- Domeintests bewaken lege invoer, activering, beëindiging, herladen, beschadigde opslag, opslag, contextcorrectie, vaste status en canonieke heropenroute.
- Volledige testset: 17 van 17 geslaagd.
- TypeScript-controle en Vite-productiebuild: geslaagd.
- Browserverificatie op 1280 × 720 en 390 × 844: geslaagd.
- Publieke toestand zonder activering: geen Waarnemen-root aanwezig.
- Toetsenbordopening en `Escape` met focusterugkeer: geslaagd.
- De drie homepagegrenzen, de Projecten-grens en Contact-grens zijn aan de bedoelde bestaande delen gekoppeld.
- Een contextgecorrigeerde waarneming is lokaal bewaard, na navigatie in de Workspace teruggevonden en via `/#digitaal-fundament` heropend.

### Nieuwe inzichten

- Context is pas bruikbaar wanneer zij niet alleen wordt herkend, maar ook een duurzame terugweg naar het ervaringsmoment bevat.
- Lokale activering is niet alleen een technische privacygrens; zij voorkomt dat intern gereedschap deel wordt van de publieke propositie.
- Zichtbare groei hoeft geen nieuw hoofdpaneel te worden. Eén nieuwe handelingsmogelijkheid en een rustige terugkomst in de bestaande volgorde zijn voldoende om Atlas anders te ervaren.

### Bevestigde aannames

- Een kleine vaste knop is rustiger en sneller dan een aparte modus.
- Pagina, semantische grens, case, sprint, viewport en tijd nemen de aanvullende contextuitleg voor deze verticale keten weg.
- Positieve en kritische ervaringen passen in hetzelfde vrije veld zonder sentimentlabel.
- Een afzonderlijke lokale store houdt Waarnemen aantoonbaar los van bestaande betekenis- en uitvoeringsdomeinen.

### Ontkrachte aannames

- Een nieuwe navigatielink alleen maakt de groei niet overal onmiddellijk leesbaar; het Kompas heeft daarom een rustige actuele verwijzing naar Waarnemen.
- Een technisch bestaand anker is niet automatisch een betekenisvolle context. Alleen de vijf expliciet benoemde ervaringsgrenzen worden gebruikt.

### Bewuste Stilte

Geen menselijke Review-workflow, beoordeling, promotie naar Understanding, taken, prioriteiten, eigenaarschap, comments, sentimentanalyse, AI-samenvatting, screenshots, video, willekeurige elementselectie, meerdere cases, database, accounts, cloudsync of externe integraties.

Niet-gemarkeerde publieke routes krijgen nog geen generieke of afgeleide ervaringsgrens. Hun afwezigheid is een bekende grens, geen uitnodiging om betekenis te verzinnen.

### Resterende grenzen

- Alles blijft lokaal in één browser, zonder back-up of synchronisatie.
- De vijf grenzen bewijzen de keten voor Case 0001, niet de schaalbaarheid naar meerdere cases of klantomgevingen.
- De opgeslagen browserverificatie is testdata in de lokale browser en geen methodisch beoordeelde bron.
- Werkelijk dagelijks gebruik moet nog bewijzen dat de normale handeling consequent binnen dertig seconden blijft en de juiste context voor Donovan oplevert.

### Beste volgende vraag

> Welke eerste werkelijk vastgelegde waarneming verandert na menselijke beoordeling aantoonbaar in beter begrip — en welke blijft terecht alleen waarneming?

## Sprint 001F — Van Dashboard naar Collega

- **Datum:** 2026-07-22
- **Status:** Afgerond met GO.
- **Case:** 0001 · We Build And Design.

### Doel

Atlas moet beginnen voordat Donovan begint. Bij het openen van de Workspace selecteert Atlas eerst wat vandaag aandacht verdient, waarom dat zo is en welke ene handeling logisch volgt. De interface voor organiseren en onderzoeken komt pas daarna.

### Gedragsverandering

- De Workspace opent met Atlas' actuele oordeel in plaats van met navigatie of een dashboard.
- `Vandaag` vertaalt de bekende dagfocus, een concrete AquaFlask-stap of de prioriteit van We Build And Design naar één voorbereid beginpunt.
- Dagorganisatie blijft beschikbaar, maar vraagt pas aandacht nadat Donovan er bewust voor kiest.
- Een onafgeronde dagovergang onderbreekt de opening niet meer en verschijnt pas wanneer Donovan zijn dag wil organiseren.
- `Understanding` kiest per case eerst de sterkste verantwoorde betekenis: een herleidbare volgende stap, een inzicht, een open bewijsvraag of bewuste terughoudendheid.
- Filters, materiaal en invoer volgen pas wanneer Donovan de onderbouwing bewust opent.
- Een directe route naar een specifiek Understanding-item opent de onderbouwing wel meteen, zodat bestaand handelingsgedrag intact blijft.

### Grenzen

- De publieke `Eerste Blik` blijft op `Toetsen`; er is geen interactieve analyse gebouwd.
- Automatische analyse, vrije gesprekken, uitgebreide rapporten, AI-functionaliteit en overige automatisering blijven `Horizon`.
- Er zijn geen nieuwe cases, claims, contactkanalen of databronnen toegevoegd.
- Foundation en Decisions zijn niet gewijzigd.

### Verificatie

- Volledige testset: 18 van 18 geslaagd.
- TypeScript-controle en Vite-productiebuild: geslaagd.
- `git diff --check`: geslaagd.
- Live gedragscontrole van `Vandaag` en `Understanding`: geslaagd.
- Het case-afhankelijke Understanding-oordeel, de overgang naar de onderbouwing en de directe itemroute zijn werkend gecontroleerd.
- Conform de reviewafspraak zijn geen nieuwe screenshots gemaakt.

### Resultaat

Sprint 001F heeft Atlas een fundamentele gedraging gegeven:

> Atlas begint voordat Donovan begint.

Atlas selecteert, weegt af en bereidt voor. Donovan kan direct beginnen of bewust een andere keuze maken. Met de verleende GO is deze sprint afgesloten; verdere verfijning of nieuwe functionaliteit valt buiten Sprint 001F.
