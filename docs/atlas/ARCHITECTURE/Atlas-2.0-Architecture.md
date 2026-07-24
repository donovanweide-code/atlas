# Atlas 2.0 Architecture

> Status: architectuurvoorstel — nog geen besluit tot implementatie
> Canonieke basis: [`../../../Foundation.md`](../../../Foundation.md)
> Doel: duurzame richting geven aan toekomstige Atlas-besluiten zonder de Foundation, methode of sprintscope zelfstandig uit te breiden

## 1. Positie van dit document

Dit document beschrijft een mogelijke volgende generatie van Atlas. Het is geen tweede Foundation, geen productdefinitie en geen verzameling features.

De Foundation blijft volledig leidend. Bij conflict vervalt de uitspraak in dit document. Iedere implementatie uit deze architectuur vereist bovendien een afzonderlijk besluit, een begrensd sprintdoel en een zichtbare menselijke uitkomst.

Atlas 2.0 bouwt voort op één vaste beweging:

**Begrijpen → Betekenis → Richting → pas daarna bouwen**

De architectuur moet Atlas in staat stellen meer context te dragen zonder meer aandacht te vragen. Zij organiseert kennis, bewijs, betekenis en verantwoordelijkheid achter de schermen, zodat de interface rustig en redactioneel kan blijven.

## 2. Architectuurstelling

Atlas 2.0 is een apparaat-onafhankelijke werkplek waarin We Build And Design zijn wereld begrijpt, relaties begeleidt, betekenisvolle veranderingen herkent en richting geeft.

Atlas is binnen die architectuur de wereld waarin We Build And Design als gids werkt. We Build And Design is daarom niet slechts Case 0001:

- de missie, methode, principes en creatieve taal;
- de praktijk waarin klantrelaties bestaan;
- de plaats waar beslissingen en lessen samenkomen;
- de context waarin Atlas over cases heen zorgvuldig kan leren.

Iedere klantcase leeft binnen deze wereld, maar behoudt haar eigen context, bronnen, onzekerheden, toestemming en grenzen. Wereldkennis mag een case helpen bevragen, maar mag nooit onbewezen klantwaarheid worden.

De voordeur van Atlas is daarom geen dashboard. Zij is een redactioneel wereldbeeld dat antwoord geeft op één vraag:

> Waar kan Donovan vandaag het meeste betekenisvolle verschil maken?

## 3. Aansluiting op de Foundation

### Eerst de ondernemer

Een case begint bij het bedrijf, de mensen, de klanten, de ambitie en de actuele beweging. Techniek wordt pas betekenisvol binnen die bedrijfscontext.

### De kleinste betekenisvolle stap

Atlas mag een grote horizon bewaren, maar toont en realiseert alleen wat vandaag verdiend is. Geen architectuurlaag rechtvaardigt op zichzelf implementatie.

### Technologie als gereedschap

Monitoring, snapshots, vergelijkingen en patroonherkenning ondersteunen begrip. Zij nemen geen beslissing over, voeren geen wijziging uit en presenteren geen automatische interpretatie als waarheid.

### Complexiteit achter de schermen

De interne kennisstructuur mag rijk zijn. De interface toont per apparaat en situatie alleen de kleinste betekenisvolle hoeveelheid informatie. Minder schermruimte verandert de selectie, niet de onderliggende kennis.

### Herleidbaarheid en menselijke bevestiging

Feit, waarneming, interpretatie, onzekerheid, advies, beslissing en resultaat blijven van elkaar onderscheiden. Ieder oordeel kan worden teruggeleid naar bronnen en eerdere momenten. Donovan beslist.

### Leren uit echte cases

Atlas leert pas over de wereld wanneer meerdere herleidbare cases een patroon ondersteunen. Een overeenkomst is eerst een observatie, geen universele regel.

## 4. Huidige architectuur

De huidige uitvoering bestaat uit vier samenhangende lagen.

### 4.1 Canonieke en operationele documentatie

- `Foundation.md` is de enige bron van waarheid.
- `docs/atlas` vertaalt de Foundation naar workflow, beslissingen, logboek en sprintgeschiedenis.
- `clients` bewaart klantgebonden context.
- De ontwerpdocumentatie bewaart de publieke Atlas-wereld en World Engine.

### 4.2 Publieke Experience

De Vite- en TypeScript-app rendert de homepage, publieke vervolgroutes en tien configuratiegestuurde scènes. De World Engine gebruikt echte landschappen, één gouden route, betekenisvolle waypoints en één verdiend Compass Moment.

### 4.3 Interne Workspace

`/atlas` brengt dagfocus, cases, ideeën, logboek, AquaFlask en Understanding samen. De Workspace is lokaal, versiegebonden en gevalideerd, maar opslag blijft gekoppeld aan één browser.

### 4.4 Understanding

Het gedeelde Understanding-model bewaart betekenisdragers, expliciete relaties, onzekerheid, revisies en herkomst. Atlas Lab leest dit model zonder autonome terugschrijving.

Deze huidige architectuur bewijst dat Atlas als rustige begeleiding kan werken. Zij bewijst nog niet dat duurzame opslag, monitoring, snapshots, wereldwijde Intelligence of automatische redactie nodig of verantwoord zijn.

## 5. De doelarchitectuur

Atlas 2.0 bestaat conceptueel uit zeven verantwoordelijkheidslagen. Dit zijn grenzen van betekenis en verantwoordelijkheid, geen verplichte technische services.

```text
Atlas World
  └─ Cases
      ├─ Business Profile
      ├─ Technical Profile
      ├─ Understanding
      ├─ Presence
      │   └─ Meaningful Snapshots
      └─ Decisions, actions and outcomes

Across the World
  ├─ Compass
  ├─ Safety
  ├─ Intelligence
  └─ Editorial interface
```

### 5.1 Atlas World

De World-laag bewaart:

- Foundation en methode;
- actieve relaties en hun actuele betekenis;
- wereldbrede focus en horizon;
- beslissingen en herbruikbare lessen;
- bevestigde patronen over cases heen;
- de gezondheid van Atlas als werkwijze.

De wereldweergave toont geen ranglijst van klanten en geen verzameling statistiektegels. Zij maakt relaties ruimtelijk en redactioneel begrijpelijk:

- welke relatie nu aandacht verdient;
- waarom dat zo is;
- welke onzekerheid een beslissing kan veranderen;
- welke volgende stap het meest betekenisvol is;
- wat bewust aan de Horizon blijft.

### 5.2 Case

Een Case is een begrensde relatiecontext binnen de Atlas World. Iedere case heeft:

- een identiteit en eigenaar;
- een doel en gewenste verandering;
- bronnen en geldigheidscontext;
- Business Profile;
- Technical Profile;
- Understanding;
- Presence vanaf een expliciete startdatum;
- beslissingen, acties, resultaten en lessen;
- toegangs- en vertrouwelijkheidsgrenzen.

Een case is geen CRM-record. Zij is het levende, herleidbare begrip van een onderneming en de route waarop WBD haar begeleidt.

### 5.3 Business Profile

Het Business Profile beschrijft de bedrijfswerkelijkheid die nodig is om technische signalen te kunnen begrijpen.

Mogelijke onderwerpen zijn:

- branche;
- doelgroep;
- verdienmodel;
- regio;
- doelen;
- KPI's;
- bijzonderheden;
- seizoensinvloeden.

Deze onderwerpen zijn geen verplicht formulier. Alleen informatie die een beslissing kan beïnvloeden wordt vastgelegd. Ieder gegeven bewaart minimaal:

- waarde of beschrijving;
- bron;
- status: bevestigd, onzeker of onbekend;
- geldigheidsmoment of -periode;
- eigenaar van bevestiging;
- relevantie voor de actuele case.

Het Business Profile bepaalt niet automatisch wat succes is. KPI's krijgen pas betekenis wanneer de ondernemer het doel en de context bevestigt.

### 5.4 Technical Profile

Het Technical Profile beschrijft het digitale fundament binnen de bedrijfscontext.

Mogelijke onderwerpen zijn:

- hosting en domeinen;
- CMS, waaronder WordPress;
- commerce, waaronder WooCommerce;
- plugins, themes en maatwerk;
- CDN en beveiligingslagen, waaronder Cloudflare;
- Search Console en Analytics;
- back-ups en herstel;
- staging en deployment;
- monitoring en bekende afhankelijkheden.

Het Technical Profile is geen infrastructuurdashboard en geen automatisch volledige inventaris. Het legt vast wat nodig is om risico, verandering en handelingsruimte te begrijpen.

Technische feiten zonder bedrijfsbetekenis blijven achtergrondkennis. Een pluginversie verdient bijvoorbeeld pas voorgrond wanneer zij een actueel risico, een relevante verandering of een toekomstige keuze beïnvloedt.

### 5.5 Understanding

Understanding blijft de betekenislaag tussen profielen, bronnen, snapshots en richting.

Zij bewaart de herleidbare beweging:

**bron → waarneming → betere vraag → mogelijk patroon → inzicht → werkelijke vraag → betekenisvolle volgende stap**

Business en Technical Profiles leveren context. Snapshots leveren momentgebonden waarnemingen. Understanding verbindt die informatie zonder feiten en interpretaties te vermengen.

### 5.6 Presence

Presence is het actuele, betekenisvolle beeld van een case vanaf een expliciet bevestigde monitoring-startdatum.

Presence beantwoordt:

- Wat is de huidige situatie?
- Wat is aantoonbaar veranderd?
- Welke onzekerheid is relevant?
- Welke kans of welk risico ontstaat hierdoor?
- Wat verdient nu aandacht?
- Wat is de kleinste betekenisvolle volgende stap?

Presence is geen tijdlijn van alles wat gebeurde. Het is een redactionele laag over betekenisvolle momenten.

Voor de monitoring-startdatum doet Atlas geen impliciete claims over continuïteit. Oudere bronnen kunnen historische context bieden, maar gelden niet als door Atlas gemonitorde Presence.

### 5.7 Compass

Het Kompas is de redactionele voordeur van World en Case. Het toont geen score en geen schijnobjectieve prioriteit.

Een Kompas-oordeel bevat minimaal:

- de relatie of context die aandacht verdient;
- de betekenisvolle verandering of onzekerheid;
- het bewijs waarop het oordeel rust;
- waarom dit nu relevant is;
- de voorgestelde volgende stap;
- wat bewust niet wordt gedaan;
- de menselijke beslissing die nodig is.

Het Kompas mag ook Stilte adviseren wanneer geen verandering of bewijs een handeling rechtvaardigt.

## 6. Snapshot Engine

### 6.1 Doel

De Snapshot Engine bewaart betekenisvolle momentopnames en vergelijkt nieuwe momenten met relevante eerdere momenten.

Een snapshot is geen logregel, auditrecord of volledige kopie van alle beschikbare data. Het is een herleidbare observatie van een toestand die mogelijk betekenis heeft voor de case.

### 6.2 Snapshotstructuur

Een snapshot bevat conceptueel:

- case en onderwerp;
- waarnemingsmoment;
- bronmoment en ophaalmethode;
- geldigheidsbereik;
- geselecteerde feiten of toestandskenmerken;
- ontbrekende of onbetrouwbare gegevens;
- reden waarom dit moment is vastgelegd;
- vergelijking met een geschikte referentiesnapshot;
- voorgestelde betekenis;
- menselijke beoordeling;
- eventuele relatie met een beslissing, actie of resultaat.

Ruwe brondata en de betekenisvolle snapshot blijven onderscheiden. Daardoor kan een interpretatie worden herzien zonder de oorspronkelijke waarneming te herschrijven.

### 6.3 Vergelijken

De Engine vergelijkt niet automatisch alleen met “de vorige” snapshot. De relevante referentie kan zijn:

- het vorige geldige moment;
- een bevestigde baseline;
- dezelfde seizoensperiode;
- het moment vóór een bekende wijziging;
- een door Donovan gekozen referentie.

Een verschil doorloopt vier stappen:

1. **Detectie:** welke waarde of toestand verschilt?
2. **Context:** is de vergelijking geldig en compleet?
3. **Interpretatie:** welke mogelijke betekenis heeft het verschil?
4. **Bevestiging:** verdient dit aandacht, een vraag, een nieuw snapshotritme of Stilte?

Een verschil is niet automatisch betekenisvol. Geen verschil kan evenmin automatisch als gezond worden beschouwd.

### 6.4 Snapshottypen

Snapshottypen ontstaan uit echte cases en worden niet vooraf onbeperkt ontworpen. Voorbeelden kunnen later zijn:

- bedrijfsdoel of KPI-context;
- technisch fundament;
- performance of vindbaarheid;
- commerce en conversie;
- veiligheid en herstelbaarheid;
- content of klantreis;
- incident of wijziging.

Ieder type moet aantonen welke ondernemersbeslissing het beter maakt.

### 6.5 Revisie

Wanneer Atlas een snapshot anders gaat begrijpen, bewaart het:

- het eerdere oordeel;
- waarom dat toen redelijk was;
- nieuwe informatie;
- het herziene oordeel;
- gevolgen voor Presence en de volgende stap.

Historie wordt niet overschreven om Atlas foutloos te laten lijken.

## 7. Adaptieve Monitoring

Monitoring is een afspraak per case en onderwerp, geen universeel schema.

Atlas mag een ritme voorstellen, bijvoorbeeld dagelijks, wekelijks, maandelijks of gebeurtenisgestuurd. Het voorstel is gebaseerd op:

- veranderingssnelheid;
- bedrijfsimpact;
- seizoensinvloed;
- risico en herstelbaarheid;
- betrouwbaarheid van de bron;
- kosten en aandacht;
- eerdere betekenisvolle veranderingen;
- actuele doelen van de ondernemer.

Donovan of de ondernemer bevestigt het ritme. Atlas voert geen uitbreiding van monitoring stilzwijgend door.

Ieder monitoringvoorstel vermeldt:

- waarom dit onderwerp monitoring verdient;
- waarom dit ritme passend lijkt;
- welke beslissing de uitkomst kan ondersteunen;
- wanneer het ritme opnieuw wordt beoordeeld;
- welk signaal een tijdelijk hoger of lager ritme rechtvaardigt.

Monitoring mag vertragen of stoppen wanneer opeenvolgende snapshots geen betekenisvolle waarde leveren. Meer meten is geen vorm van beter begrijpen.

## 8. Veilig bouwen

Safety is een beslisgrens vóór uitvoering, niet een losse controle achteraf.

Voor een voorgestelde wijziging brengt Atlas minimaal in beeld:

- gewenste verandering;
- betrokken systemen en afhankelijkheden;
- bekend en onzeker risico;
- actuele back-upstatus;
- bruikbaarheid en recentheid van de back-up;
- aanwezigheid en representativiteit van staging;
- test- en acceptatieroute;
- herstelmogelijkheid en verantwoordelijke;
- menselijke goedkeuring;
- waarnemingsplan na uitvoering.

Atlas kan vervolgens adviseren:

- doorgaan;
- eerst bewijs verzamelen;
- eerst een back-up of stagingroute herstellen;
- de wijziging verkleinen;
- uitstellen;
- niet uitvoeren.

Atlas voert in deze architectuur geen risicovolle klantwijziging autonoom uit. Iedere toekomstige uitvoeringsmogelijkheid vereist een afzonderlijk bevoegdheidsmodel, expliciete toestemming, logging, herstelbaarheid en een nieuwe Foundation-toets.

## 9. Intelligence

Intelligence is het vermogen van Atlas om over de volledige World heen onderbouwde overeenkomsten en verschillen te herkennen.

Mogelijke kennis omvat:

- terugkerende branchevragen;
- veelvoorkomende technische risico's;
- seizoenspatronen;
- terugkerende kansen;
- effecten van eerdere beslissingen;
- signalen dat een aanpak in een bepaalde context wel of niet werkte.

### 9.1 Bewijsladder

Wereldkennis groeit gecontroleerd:

1. signaal binnen één case;
2. herhaalde waarneming binnen die case;
3. mogelijke overeenkomst tussen cases;
4. patroon in ontwikkeling;
5. bevestigd herbruikbaar inzicht;
6. voorstel voor toepassing in een nieuwe case;
7. menselijke bevestiging binnen die nieuwe context.

Geen enkele trede slaat context over. Een bevestigd wereldpatroon blijft een vraag of voorstel wanneer het op een andere klant wordt toegepast.

### 9.2 Grenzen

Intelligence:

- scheidt klantdata en herbruikbare lessen;
- anonimiseert of abstraheert waar mogelijk;
- bewaart bron, geldigheid en onzekerheid;
- toont geen correlatie als oorzaak;
- presenteert frequentie niet automatisch als belang;
- voorkomt dat een grote of luidruchtige case de wereldwaarheid bepaalt;
- kan een eerder patroon afzwakken of intrekken;
- schrijft geen klantwaarheid terug zonder menselijke bevestiging.

Intelligence is pas verdiend wanneer meerdere echte cases voldoende betrouwbare historie opleveren.

## 10. Redactionele interface

De interface is geen spiegel van het datamodel. Zij is een zorgvuldig gekozen venster op de World.

### Desktop

Kan meer samenhang, herkomst en Horizon naast elkaar tonen, zonder alles tegelijk te openen.

### Tablet

Behoudt dezelfde oordelen en navigatielogica, maar ordent context vaker opeenvolgend.

### Mobiel

Toont eerst Kompas, reden, onzekerheid en volgende stap. Bewijs en historie blijven bereikbaar door verdieping.

Op ieder apparaat zijn kennis, beslissingen en rechten identiek. Alleen informatiedichtheid, compositie en volgorde veranderen.

Een apparaat mag nooit een inhoudelijk ander oordeel krijgen. Responsiviteit is redactionele dosering, geen reductie van waarheid.

## 11. Conceptueel informatiemodel

De duurzame kern bestaat uit de volgende begrippen:

| Begrip | Verantwoordelijkheid |
| --- | --- |
| World | WBD-context, relaties, wereldfocus, besluiten en bewezen lessen |
| Case | Begrensde relatiecontext met eigenaar en vertrouwelijkheid |
| Business Profile | Bevestigde, onzekere en onbekende bedrijfscontext |
| Technical Profile | Relevante context van het digitale fundament |
| Source | Herleidbare oorsprong met geldigheid en toegang |
| Understanding Item | Waarneming, vraag, patroon, inzicht of volgende stap |
| Snapshot | Betekenisvolle toestand op een bepaald bronmoment |
| Comparison | Herleidbaar verschil tussen geschikte momenten |
| Presence | Actueel redactioneel casebeeld vanaf monitoring-start |
| Monitoring Agreement | Bevestigd onderwerp, ritme, reden en herbeoordeling |
| Safety Assessment | Risico-, test-, back-up- en herstelcontext vóór wijziging |
| Decision | Menselijke keuze met reden en grenzen |
| Action | Bevestigde uitvoering van een beslissing |
| Outcome | Waargenomen resultaat en resterende onzekerheid |
| World Insight | Over cases heen bewezen, begrensde herbruikbare les |
| Compass Editorial | Actueel oordeel over aandacht, richting en Stilte |

Technische tabellen, API's of services worden pas ontworpen wanneer een verticale slice dit model in de praktijk heeft aangescherpt.

## 12. Verantwoordelijkheden

### Donovan

- bevestigt methode, prioriteit en sprintscope;
- neemt het besluit nadat Atlas heeft gekozen wat aandacht verdient;
- bevestigt monitoring en betekenisvolle interpretaties;
- neemt klant- en uitvoeringsbesluiten;
- accepteert of verwerpt wereldpatronen.

### Atlas

- draagt de World en casecontext;
- bewaakt herkomst, onzekerheid en geldigheid;
- vergelijkt betekenisvolle momenten;
- stelt interpretaties en ritmes voor en bepaalt welke betekenisvolle volgende stap aandacht verdient;
- bewaart Focus, Horizon en Stilte;
- maakt eerdere oordelen herzienbaar;
- leert alleen uit bewezen ervaring.

### Codex en toekomstige technische uitvoerders

- onderzoeken bronnen en bestaande besluiten;
- realiseren uitsluitend goedgekeurde, begrensde slices;
- testen, documenteren en bewaken herstelbaarheid;
- signaleren inconsistenties en kansen;
- wijzigen Foundation, methode of scope niet zelfstandig.

### Ondernemer

- blijft eigenaar van bedrijf, ambitie en beslissingen;
- bevestigt bedrijfscontext en gewenste verandering;
- bepaalt samen met WBD wat monitoring en handelen mogen betekenen;
- wordt niet gereduceerd tot gemeten gedrag of technisch profiel.

## 13. Wat bewezen is

De repository onderbouwt momenteel:

- één canonieke Foundation werkt als grondwet;
- een rustige Workspace kan een bruikbare voordeur zijn;
- lokale, versiegebonden opslag kan een werkwijze vroeg toetsen;
- een Business Profile-achtige presentatie laat AquaFlask als gekende relatie voelen;
- feiten, interpretaties, risico's, kansen en onbekenden kunnen zichtbaar worden gescheiden;
- Understanding kan herkomst, menselijke relaties en revisies bewaren;
- Atlas Lab kan voorstellen tonen zonder autonome terugschrijving;
- het Kompas werkt beter als richting dan als statistiek;
- publieke Presence kan als één samenhangende wereld worden ontworpen;
- een zichtbare menselijke uitkomst is nodig om een sprint te kunnen beoordelen.

Deze bewijzen rechtvaardigen verdieping van begrip en redactie. Zij bewijzen nog geen behoefte aan een volledig platform.

## 14. Wat Horizon blijft

De volgende onderdelen zijn richtinggevend, maar nog niet verdiend als implementatie:

- duurzame centrale dataopslag;
- accounts, rollen en samenwerking;
- automatische databronkoppelingen;
- generieke snapshotconnectors;
- adaptieve monitoringalgoritmen;
- automatische Compass-prioritering;
- wereldwijde Intelligence;
- autonome patroonherkenning;
- klantportalen;
- notificaties;
- automatische uitvoering van wijzigingen;
- een universele plugin- of integratiearchitectuur.

Ook Business Profile, Technical Profile, Presence en Snapshot Engine zijn pas bewezen wanneer een kleine echte caseflow aantoonbaar betere besluiten oplevert. Hun conceptuele plaats in de architectuur is geen bouwbesluit.

## 15. Logische implementatiefasen

Iedere fase is een zelfstandige, zichtbare verticale slice. De volgende fase start alleen wanneer werkelijk gebruik de noodzaak bevestigt.

### Fase 0 — Besluit en begrenzing

Doel:

- deze architectuur toetsen aan Foundation;
- begrippen en verantwoordelijkheden bevestigen;
- bepalen welke huidige Understanding-code behouden, aangepast of geparkeerd wordt;
- één echte case en één beslisvraag kiezen.

Zichtbare uitkomst:

- een goedgekeurd besluit met expliciete niet-scope.

Geen softwarewijziging is nodig.

### Fase 1 — Eén compleet relatiebeeld

Doel:

- voor één actieve case een minimaal Business Profile en Technical Profile verbinden aan bestaande Understanding;
- uitsluitend informatie vastleggen die een actuele beslissing helpt;
- onbekenden en geldigheid zichtbaar houden.

Zichtbare uitkomst:

- Donovan begrijpt binnen seconden welk bedrijf dit is, welke technische context relevant is en wat nog onbekend blijft.

Niet bouwen:

- generieke profielbouwers;
- automatische imports;
- brede taxonomie.

### Fase 2 — Presence met handmatige snapshots

Doel:

- een expliciete monitoring-startdatum vastleggen;
- enkele betekenisvolle snapshots handmatig bewaren;
- vergelijking, interpretatie en menselijke bevestiging toetsen.

Zichtbare uitkomst:

- Donovan ziet wat werkelijk veranderde en waarom dat wel of geen aandacht verdient.

Niet bouwen:

- continue dataverzameling;
- connectorframework;
- automatische alerts.

### Fase 3 — Compass als redactionele voordeur

Doel:

- World en Case openen met één controleerbaar actueel oordeel;
- Focus, Horizon en Stilte in werkelijk gebruik toetsen;
- aantonen dat Atlas minder kan tonen terwijl het meer context draagt.

Zichtbare uitkomst:

- Donovan weet waar hij vandaag verschil kan maken, waarom en wat hij bewust niet hoeft te doen.

### Fase 4 — Bevestigde monitoringafspraken

Doel:

- voor bewezen snapshotonderwerpen een ritme voorstellen;
- kosten, aandacht, seizoensinvloed en risico meenemen;
- menselijke bevestiging en herbeoordeling vastleggen.

Zichtbare uitkomst:

- monitoring levert aantoonbaar bruikbare momenten op en kan ook bewust vertragen of stoppen.

### Fase 5 — Veilig wijzigingspad

Doel:

- één echte wijziging begeleiden van wens via risico, back-up, staging, test en herstel naar resultaat;
- advies en uitvoering strikt gescheiden houden.

Zichtbare uitkomst:

- de ondernemer en WBD kunnen een wijziging met aantoonbaar meer vertrouwen beslissen en dragen.

### Fase 6 — Eerste World Insight

Doel:

- pas na meerdere geschikte cases één terugkerend patroon herleidbaar onderzoeken;
- contextverschillen, onzekerheid en privacy bewaken;
- het inzicht als voorstel in een nieuwe case toetsen.

Zichtbare uitkomst:

- een volgende klant profiteert aantoonbaar van eerdere ervaring zonder dezelfde oplossing opgedrongen te krijgen.

### Fase 7 — Duurzame infrastructuur waar bewezen

Doel:

- alleen voor bewezen frictie apparaat-onafhankelijke opslag, identiteit, rechten, synchronisatie of connectoren toevoegen;
- migratie, export en herstel vooraf ontwerpen.

Zichtbare uitkomst:

- Atlas blijft dezelfde werkplek op desktop, tablet en mobiel, met behoud van context en verantwoordelijkheid.

De volgorde is niet kalendergebonden. Een fase wordt niet gestart omdat zij bestaat, maar omdat de vorige praktijk een betekenisvolle behoefte heeft bewezen.

## 16. Architectuurtoets voor iedere toekomstige slice

Voordat een onderdeel wordt ontworpen of gebouwd:

1. Welke echte ondernemer en beslissing helpt dit?
2. Welke Foundation-principes begrenzen de oplossing?
3. Welke kennis is bevestigd, onzeker of onbekend?
4. Is dit Business-context, Technical-context, Understanding, Presence, Intelligence of interface?
5. Welke menselijke bevestiging blijft noodzakelijk?
6. Wat is de kleinste betekenisvolle verticale slice?
7. Welke zichtbare uitkomst ervaart Donovan of de ondernemer?
8. Wat blijft bewust buiten scope en aan de Horizon?
9. Hoe blijven bron, oordeel, beslissing en resultaat herleidbaar?
10. Hoe wordt risico beheerst en herstel mogelijk gemaakt?
11. Bespaart of verbetert dit aantoonbaar aandacht, tijd of besluitkwaliteit?
12. Welke herbruikbare les kan na afloop Atlas verrijken?

Wanneer deze vragen niet overtuigend worden beantwoord, wordt niet gebouwd.

## 17. Duurzame grens

Atlas 2.0 wordt niet sterker doordat het alles meet, opslaat, vergelijkt of voorspelt.

Atlas wordt sterker wanneer het:

- de werkelijkheid van een ondernemer zorgvuldig leert kennen;
- techniek binnen die werkelijkheid begrijpt;
- alleen betekenisvolle momenten bewaart;
- verandering van ruis onderscheidt;
- onzekerheid zichtbaar houdt;
- risico vóór uitvoering bespreekbaar maakt;
- uit echte cases leert zonder context te verliezen;
- en op ieder apparaat rustig laat zien wat nu aandacht verdient.

De architectuur is geslaagd wanneer meer kennis leidt tot meer begrip, meer begrip tot scherpere richting en richting alleen tot bouwen wanneer dat vandaag betekenisvolle waarde toevoegt.
