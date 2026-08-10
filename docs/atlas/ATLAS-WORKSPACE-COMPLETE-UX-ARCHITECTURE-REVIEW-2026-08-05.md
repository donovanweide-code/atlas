# Complete UX-, architectuur- en inhoudsreview — Workspace + Atlas

**Datum:** 5 augustus 2026  
**Status:** review en voorstel; geen implementatie  
**Centrale toets:** helpt dit de ondernemer beter begrijpen waar hij vandaag
aandacht aan moet geven?

## Samenvattend oordeel

De WBD Workspace is op dit moment de sterkste dagelijkse omgeving. De hero is
compact genoeg, de inhoud begint snel en de interface voelt als een werkplek.
Atlas bevat veel van de juiste inhoudelijke bouwstenen, maar vertegenwoordigt de
methode nog niet helder genoeg in zijn zichtbare volgorde. De opening gedraagt
zich als een zelfstandige marketingpagina, `Waarnemen` vermengt capture,
instrumentatie en beoordeling, en de technische fundamenten bestaan wel in de
repository maar hebben geen rustige ingang in Atlas.

De Experience heeft niet één duidelijke actuele voordeur. Er bestaan naast
elkaar een persoonlijke tokenroute, een algemene organische route, First Visit
V2 en een afzonderlijke Context-First kandidaat. De melding “We kunnen deze
uitnodiging niet openen” is technisch correct voor `/e/` zonder token, maar
inhoudelijk verkeerd als iemand daar de huidige Experience verwacht te vinden.

De aanbevolen richting is geen herontwerp. Het is een architecturale
normalisatie:

1. één menselijke Experience-ingang kiezen;
2. observatiecapture en menselijke beoordeling uit elkaar trekken;
3. Atlas dezelfde rustige shell-opbouw geven als de Workspace;
4. de Atlas-methode zichtbaar maken als werkelijkheid → observatie → beoordeling
   → betekenis → kennis;
5. technische onderbouwing als stille, read-only index toevoegen;
6. beheerhandelingen alleen tonen wanneer de ondernemer ze bewust start.

## Prioriteiten

- **P0 — blokkerend:** verhindert normale toegang of maakt de gekozen
  architectuur voor de gebruiker onbegrijpelijk.
- **P1 — eerstvolgende ontwerpbeslissing:** wezenlijk voor dagelijkse
  bruikbaarheid of methodische samenhang.
- **P2 — gerichte verfijning:** belangrijk, maar kan na de hoofdstructuur.
- **P3 — later:** waardevol zodra echt gebruik de noodzaak bevestigt.

---

## 1. WBD Workspace als referentie

### Huidige situatie

De Workspace opent met één paginatitel, één actieve werkstroom en vier rustige
ingangen. Op desktop is de actieve hero ongeveer **416 px hoog binnen een
viewport van 900 px**. De eerste vervolginhoud begint daardoor in dezelfde
viewport. De huidige status, afgeronde fase en eerstvolgende grens zijn samen
leesbaar.

### Analyse

Dit is de juiste verhouding voor dagelijks gebruik. De hero is geen decoratieve
intro, maar een beslisvlak. De crème Ontwikkelmonitor geeft betekenisvolle
aandacht zonder de hele pagina licht of luid te maken.

### Risico

De vlakke lijst met acht genummerde navigatie-items maakt de Workspace na groei
steeds meer een softwaremenu. De inhoud is volwassen, maar de navigatie vertelt
nog niet waarom een onderdeel vandaag relevant is.

### Aanbeveling

Behoud herohoogte, typografische verhouding en inhoudsvolgorde als referentie
voor Atlas. Verrijk de navigatie semantisch en visueel, maar verander de huidige
werkstructuur niet voordat de navigatierichting is goedgekeurd.

### Prioriteit

**P1** voor navigatie; **behouden** voor hero en algemene design language.

---

## 2. Workspace Navigation Experience — afzonderlijk voorstel

### Huidige situatie

De Workspace-navigatie is functioneel, consistent en rustig. Zij bestaat uit
nummer, label, actieve crème staat en een Workspace-selector. Er zijn nog geen
actieve aandachtindicatoren. De code is wel voorbereid op een optioneel
menselijk `attentionLabel`.

### Analyse

De nummers geven volgorde, maar geen betekenis. Alle acht onderdelen hebben
visueel vrijwel hetzelfde gewicht. Daardoor voelt de navigatie eerder als een
index dan als een rustig kompas. De actieve Workspace-selector is begrijpelijk,
maar merk en selector herhalen vlak na elkaar dezelfde identiteit.

### Risico

Meer iconen, badges, activiteit en tellingen tegelijk zouden snel een klassiek
dashboard opleveren. Dat zou precies de aandacht versnipperen die Atlas hoort te
redigeren.

### Aanbevolen navigatiegrammatica

Gebruik per item maximaal vier lagen:

1. een eigen WBD-lijnicoon van 16–18 px;
2. het menselijke label;
3. alleen indien nodig één stille aandachtsmarkering;
4. een duidelijk actief vlak.

De navigatie gebruikt geen generieke icon library. Ontwerp één kleine familie
met dezelfde geometrie, lijnsterkte en afgeronde uiteinden als het officiële
`W / BD`-merk en het Atlas-kompas.

| Onderdeel | Voorgestelde beeldtaal |
| --- | --- |
| Overzicht / Vandaag | horizonlijn met één gekozen punt |
| Organisaties | twee verbonden cirkels of kaders |
| Projecten | begrensd pad met begin en einde |
| Ontwikkelpartners | twee lijnen die één richting delen |
| Ontwikkeling | oplopende lagen, geen groeigrafiek |
| Business Foundation | rustig grondvlak of ledger-raster |
| Infrastructuur | dragende basis met verbinding |
| Kennis | open kader met herleidbare bronlijn |

### Aandacht, activiteit en status

Gebruik geen rode bollen, ongelezenlogica of losse notificatietellers.

- **Verdient menselijke beoordeling:** kleine ongevulde gouden stip met de
  toegankelijke tekst “Verdient aandacht”.
- **Actief werk:** korte gouden lijn naast het icoon; geen pulserende animatie.
- **Recent bevestigd:** gedempte groentint of klein checkteken, alleen wanneer
  die status besliswaarde heeft.
- **Bewust stil / Horizon:** geen badge; hoogstens een zachtere labelkleur.
- **Aantal:** alleen als het aantal zelf een keuze ondersteunt, bijvoorbeeld
  “2 te beoordelen”; nooit als los getal in een bol.

Maximaal één item per navigatiegroep mag de primaire aandachtsmarkering dragen.
Een indicator verwijst altijd naar een zichtbare onderbouwing op de doelpagina.

### Actieve staat, hover en spacing

- Behoud crème voor de actieve pagina.
- Laat het lijnicoon in de actieve staat donker worden en de gekozen richting
  met een korte goudlijn zien.
- Hover gebruikt alleen een zachte crème-wash en 160–180 ms overgang; geen
  schaal- of springeffect.
- Vergroot de verticale tussenruimte tussen inhoudelijke groepen, niet tussen
  ieder los item.
- Op mobiel blijven iconen en labels zichtbaar; aandachtsuitleg wordt pas op de
  doelpagina getoond.

### Workspace-selector

Maak merk en selector één rustige contextzone. Het officiële WBD-logo blijft
vast. Daaronder of ernaast staat compact “Actieve Workspace”. Bij openen toont
de selector Atlas, WBD en Experience met één beschrijvende regel en een stille
markering bij de huidige omgeving. Geen tweede logo-uitvoering en geen
productkaartjes.

### Voorgestelde groepering

De huidige routes kunnen blijven bestaan, maar visueel in drie domeinen worden
geordend:

- **Relaties:** Organisaties, Ontwikkelpartners;
- **Werk:** Projecten, Ontwikkeling;
- **Bedrijf:** Business Foundation, Infrastructuur;
- **Kennis:** Kennisvoorstellen als rustige afsluitende route.

`Overzicht` blijft afzonderlijk bovenaan. De groepslabels zijn klein en
ondersteunend; zij mogen de navigatie niet langer maken dan nodig.

### Prioriteit

**P1.** Eerst als visueel en inhoudelijk prototype beoordelen; daarna pas de
bestaande shell aanpassen.

---

## 3. Atlas-hero

### Huidige situatie

De Atlas-opening staat vóór de normale Workspace-shell. Zij bevat een eigen
Atlas-lock-up, datum, begroeting, zeer grote titel, subtitel, toelichting,
kompas, Focus en Stilte. Op desktop is de opening ongeveer **932 px hoog bij een
viewport van 900 px**. De volledige Atlas-shell en “Werkelijkheid” beginnen dus
pas na de eerste viewport. Op mobiel is de opening ongeveer **1137 px hoog bij
844 px viewporthoogte**.

### Analyse

De inhoud is inhoudelijk juist, maar de compositie creëert twee aankomstmomenten:
eerst een merkervaring, daarna pas de werkplek. De grote titel communiceert
projectstatus als campagneboodschap. Het kompas en de grote lege ruimte versterken
dat effect. Atlas voelt daardoor minder direct aan het werk dan WBD.

### Risico

De ondernemer ziet vroeg wel veel betekenis, maar nog niet de doorgaande
werkelijkheid, reviewbehoefte of andere werkcontext. Atlas lijkt zichzelf te
presenteren in plaats van al te hebben nagedacht.

### Aanbeveling

Plaats Atlas vanaf de eerste pixel in dezelfde shellstructuur als WBD. Gebruik
een compacte paginakop met datum en één conclusie, gevolgd door één Focus-vlak
en één rustige Stilte-kolom. Richtwaarde desktop:

- paginakop circa 150–190 px;
- Focus/Stilte samen circa 360–430 px;
- begin van Werkelijkheid binnen de eerste 850–900 px.

Verklein de titel tot de schaal van de WBD-werkstroomhero. Behoud het kompas als
klein richtingsteken in Focus of in de zijbalk, niet als groot achtergrondmotief.
Op mobiel staat eerst conclusie → reden → betekenisvolle stap; Stilte volgt
daarna of wordt een disclosure.

### Prioriteit

**P1.** Hoge zichtbare impact, maar uitvoeren na akkoord op de Atlas-IA.

---

## 4. Waarnemen en de observatieketen

### Huidige situatie

Er bestaan momenteel drie verschillende observatieconcepten:

1. **Atlas Waarnemen:** vanuit Atlas activeert Donovan lokaal een sprint voor
   Case 0001. Op enkele publieke WBD-routes verschijnt vervolgens een
   capturepaneel “Wat zie of ervaar je?”.
2. **Atlas Observaties:** vastgelegde items staan in `#waarnemen` als
   `unreviewed`, met pagina, ervaringsgrens, case, sprint en viewport.
3. **Experience Observatory:** een afgeschermde onderzoeksomgeving met
   Experience-statistieken, persoonlijke uitnodigingen en menselijke
   observaties per deelnemersrecord.

De Atlas-capture is hard gekoppeld aan Case 0001, één bevestigde sprint en vijf
publieke WBD-grenzen. De waarnemingen worden ook als reviewitems samengesteld,
maar de huidige reviewsectie `#werkbeeld` is verborgen. In de zichtbare
Waarnemen-sectie bestaat geen handeling waarmee Donovan een observatie bevestigt,
verwerpt, aan een case koppelt of naar betekenis laat doorstromen.

### Analyse

Dit is meer dan een notitieveld: context en herkomst worden goed bewaard en de
betekenis blijft bewust open. Dat deel klopt met Atlas. Wat ontbreekt is de
centrale menselijke beoordelingsstap. De interface benadrukt nu het activeren en
bewaren, terwijl de methode juist waarde krijgt door het latere oordeel.

De naam `Waarnemen` past bij de handeling op de plek waar iets gebeurt. In Atlas
zelf is `Observaties` of `Nog beoordelen` beter, omdat Atlas daar niet opnieuw
waarneemt maar ontvangen werkelijkheid ordent.

### Risico

- capture kan worden verward met een algemeen notitieblok;
- lokale browseropslag en hard-coded context kunnen ten onrechte als algemene
  Atlas-architectuur worden gezien;
- observaties blijven onbeoordeeld ophopen;
- `Understanding` bevat daarnaast handmatig toegevoegde waarnemingen, waardoor
  twee waarheidsroutes naast elkaar ontstaan;
- de Experience kan onterecht als toegangspoort tot Waarnemen worden beschouwd.

### Aanbevolen eigenaarschap

| Laag | Verantwoordelijkheid |
| --- | --- |
| Website, Workspace of Experience | contextueel waarnemen en broninformatie bewaren |
| Atlas · Werkelijkheid | alle onbeoordeelde observaties als één reviewwachtrij tonen |
| Menselijke beoordeling | bevestigen, begrenzen, verwerpen, relateren of als vraag herformuleren |
| Atlas · Understanding | betekenis en relaties opbouwen met behoud van herkomst |
| Knowledge Repository | alleen bevestigde, herbruikbare kennis opnemen |

De Experience is dus **niet** de verplichte route naar Waarnemen. Experience is
een deelnemergerichte ontmoeting. Wat daaruit met toestemming en menselijke
beoordeling wordt geleerd, kan later als observatiebron in Atlas verschijnen.

### Voorgestelde zichtbare keten

`Werkelijkheid → Observatie → Menselijke beoordeling → Betekenis → Kennis`

Een observatie krijgt na beoordeling één van deze uitkomsten:

- bevestigd als relevante werkelijkheid;
- gekoppeld aan bestaande case of oriëntatie;
- teruggebracht tot een open vraag;
- geparkeerd met terugkeertrigger;
- afgewezen als onvoldoende herleidbaar.

Geen enkele uitkomst wordt automatisch kennis. Herkomst en eerdere status
blijven behouden.

### Positie

Plaats `Observaties · nog beoordelen` direct onder Werkelijkheid of als eerste
onderdeel van de Werkruimte. Laat de capture-instelling verdwijnen uit de
primaire Atlas-leesroute; die hoort later bij een rustige interne instelling of
wordt contextueel vanuit het oppervlak gestart.

### Prioriteit

**P1 architectuur**, vóór visuele uitbreiding van Waarnemen.

---

## 5. Bestaat de observatiepagina nog?

### Huidige situatie

Ja, maar niet als één eenduidige pagina:

- `/atlas#waarnemen` is de lokale Atlas-sectie voor activering en
  waarnemingen;
- het publieke capturepaneel wordt alleen getoond nadat Waarnemen is geactiveerd;
- `/observatory` is de afgeschermde Experience-onderzoeksomgeving;
- menselijke observaties in Observatory verschijnen pas binnen een specifiek
  Experience-detail.

### Analyse

Waarschijnlijk worden twee eerder ontworpen ideeën door elkaar herinnerd: de
Atlas-capture en het Experience Observatory. Beide bestaan, maar geen van beide
is een centrale methodische observatiereview.

### Risico

Een extra “Observatiepagina” terugbrengen zonder eigenaarschap te bepalen zou een
derde of vierde opslag- en betekenisroute maken.

### Aanbeveling

Breng niet het oude scherm als zelfstandige hoofdpagina terug. Ontwerp later één
Atlas-reviewwachtrij `Observaties`, gevoed door verschillende oppervlakken. Houd
Experience Observatory afgeschermd voor kwaliteitsonderzoek en historische
Experience-records.

### Prioriteit

**P1**, gekoppeld aan de beslissing uit hoofdstuk 4.

---

## 6. Atlas-informatiearchitectuur

### Huidige situatie

De primaire navigatie bevat Vandaag, Werkelijkheid, Horizon en Werkruimte. De
lange Werkruimte bevat daaronder Praktijkdossiers, Waarnemen, Cases,
Understanding, Ideeën en Logboek. De repository bevat daarnaast uitgebreide
Foundation-, Runtime-, Engine-, connector-, governance-, validatie- en
reviewdocumentatie die nergens vanuit Atlas bereikbaar is.

### Analyse

De vier primaire labels zijn rustig en grotendeels juist. Het probleem zit niet
in te weinig hoofdnavigatie, maar in de ongedifferentieerde diepte van
Werkruimte. Methodische werkobjecten, capture-instrumentatie en technische
fundamenten staan conceptueel te dicht bij elkaar.

### Risico

- Atlas laat wel veel gereedschap zien, maar niet de samenhang van zijn methode;
- technische waarheid blijft alleen vindbaar voor iemand die de repository al
  kent;
- een extra lijst hoofdnavigatie-items zou de rust juist verminderen.

### Aanbevolen IA

```text
Atlas
├─ Vandaag
│  ├─ Focus
│  └─ Stilte
├─ Werkelijkheid
│  ├─ Bevestigde werkelijkheid
│  ├─ Observaties · nog beoordelen
│  └─ Praktijkbronnen / Oriëntaties
├─ Horizon
├─ Werkruimte
│  ├─ Cases
│  ├─ Understanding
│  ├─ Kennisvoorstellen
│  ├─ Ideeën
│  └─ Logboek
└─ Fundament · secundaire route
   ├─ Architectuur
   ├─ Componenten en repositories
   ├─ Codex-projecten
   ├─ Technische keuzes
   ├─ Implementatiestatus
   └─ Validaties en GO-reviews
```

`Fundament` wordt een afzonderlijke route, bijvoorbeeld `/atlas/fundament`, en
staat secundair onderaan de Atlas-navigatie. Het is geen homepageblok.

### Prioriteit

**P1** voor de architectuur; **P2** voor de uiteindelijke route-uitwerking.

---

## 7. Technische onderbouwing — voorstel Fundament

### Huidige situatie

De technische onderbouwing bestaat al uitgebreid. Er zijn onder meer een
Cognitive Engine, Runtime Architecture, Runtime Implementation, Foundation
Validation, connectorfundering, Decisions, Workspace-reviews en
productiedeploymentdocumenten. De interface toont deze bronnen niet.

### Analyse

Atlas hoeft zichzelf niet prominent uit te leggen, maar moet zijn gezag wel
herleidbaar maken. Een ondernemer heeft vooral de conclusie nodig; een bouwer of
reviewer moet kunnen zien waarop die conclusie technisch rust.

### Risico

Een nieuwe inhoudelijke kopie in de UI kan snel afwijken van de repository. Een
grote “Engine”-sectie op de homepage zou bovendien de techniek vóór de methode
plaatsen.

### Aanbeveling

Maak `Fundament` een read-only register, geen tweede documentatiesysteem. Ieder
item toont:

- naam en korte menselijke betekenis;
- canonieke bron of repositorypad;
- status: concept, candidate, confirmed, implemented, live of superseded;
- laatste validatie en verantwoordelijke review;
- gerelateerde Codex-projecten en GO-besluiten;
- bekende grens of eerstvolgende toets.

Aanbevolen secties:

1. **Architectuur:** cognitieve en runtime-architectuur;
2. **Componenten:** Connector Framework, Translator Pipeline, Reasoning,
   Constitution, Governance en Knowledge Repository;
3. **Projectregister:** Codex-project, scope, branch/release en status;
4. **Besluiten:** technische keuzes en beslisprincipes;
5. **Realisatie:** wat alleen beschreven, geïmplementeerd, gevalideerd of live is;
6. **Validaties:** tests, practice reviews, GO-reviews en deployments.

De UI indexeert alleen gezaghebbende bronnen. Zij bewerkt of dupliceert ze niet.

### Prioriteit

**P1** als ontwerpbeslissing; **P2** voor realisatie na de dagelijkse Atlas-route.

---

## 8. Experience-toegang en verouderde schermen

### Huidige situatie

Er zijn momenteel meerdere werkende of bewust behouden ingangen:

| Route/scherm | Huidige functie | Oordeel |
| --- | --- | --- |
| `/e/#token=…` | persoonlijke tokenuitwisseling en bestaande sessies | technisch actief; niet langer geschikte centrale ingang |
| `/e/` zonder token | toont “We kunnen deze uitnodiging niet openen” | verouderde publieke verwachting; blokkeert review |
| `/ervaar` | algemene organische ingang met naam en optioneel functie/bedrijf | actief en zonder uitnodiging, maar inhoudelijk ouder dan First Visit V2 |
| `/first-visit-v2.html` | context-first start via branche, organisatie en optionele website | meest recente volledige richting; live kandidaat |
| `/observatory` | intern Experience-beheer, statistieken, uitnodigingen en observaties | operationeel maar uitnodigingsbeheer is conceptueel legacy |
| Context-First experiment | afzonderlijke praktijkkandidaat zonder Runtime-integratie | onderzoeksartefact, geen blijvende voordeur |

First Visit V2 maakt bij de overgang technisch nog steeds een token aan en stuurt
door naar `/e/#token=…`. Dat token is een veilige sessiebridge, niet per se een
zichtbare persoonlijke uitnodiging. De UI en privacyteksten behandelen
persoonlijke uitnodiging echter nog vaak als het dominante model.

### Wordt de uitnodigingsflow nog aangemaakt?

**Ja.** Observatory bevat nog “Maak een persoonlijke uitnodiging”, de API heeft
create/revoke/delete-operaties en `/e/#token` blijft actief voor bestaande en
nieuwe persoonlijke sessies. Daarnaast gebruikt First Visit V2 intern een token
om de nieuw aangemaakte context aan de Runtime-sessie te koppelen.

### Hoort Experience via de observatie-flow bereikbaar te zijn?

**Nee.** De Experience is een zelfstandige menselijke ingang. Atlas Waarnemen is
interne praktijkcapture. Experience-resultaten kunnen later, met passende
toestemming en menselijke beoordeling, observatiebron worden; zij zijn niet de
toegangspoort.

### Juiste toegang

Kies één blijvende menselijke URL: **`/ervaar`**. Laat die route na goedkeuring
de First Visit V2-ervaring leveren. De bestandsnaam `first-visit-v2.html` is een
versie- en implementatienaam en hoort niet de definitieve gedeelde URL te zijn.

Behandel daarna:

- `/e/#token` als compatibiliteits- en hervatroute voor bestaande sessies;
- `/e/` zonder token als zachte doorverwijzing naar `/ervaar`, niet als
  uitnodigingsfout;
- `/first-visit-v2.html` als tijdelijke kandidaat-alias die later naar
  `/ervaar` verwijst;
- Context-First experiment als intern reviewartefact;
- persoonlijke invite-creatie in Observatory als legacyfunctie: niet centraal,
  uiteindelijk geen standaard nieuwe ingang.

### Teksten die verouderd zijn

De volgende zichtbare categorieën moeten later worden herzien:

- “Persoonlijke uitnodiging” als standaard kicker;
- “dezelfde persoonlijke link” als standaard terugkeerroute;
- “vraag een nieuwe uitnodiging” bij onbeschikbaarheid;
- privacytekst die alleen uitnodiging en interne observatieomgeving noemt;
- Observatory-koppen en acties waarin nieuwe ontmoeting gelijkstaat aan nieuwe
  uitnodiging.

Bewaar persoonlijke formuleringen alleen binnen echte historische tokenflows.

### Risico

Zonder één canonieke voordeur beoordelen gebruikers verschillende generaties en
lijkt een geldige Experience defect. Het schrappen van `/e/#token` zonder
migratie zou daarentegen bestaande sessies en herleidbaarheid breken.

### Prioriteit

**P0:** canonieke route en foutgedrag beslissen.  
**P1:** copy- en Observatory-deprecatieplan.  
**Bewust behouden:** bestaande tokens en sessies zolang compatibiliteit nodig is.

---

## 9. Praktijkdossiers

### Huidige situatie

Atlas toont `Praktijkdossiers` met een bevestigde Oriëntatie en leveringsbewijs.
Het onderliggende model bewaart bron, signaal, mogelijke betekenis,
beoordelingseigenaar, terugkeertrigger en duidelijke grenzen. De WBD Workspace
heeft daarnaast echte organisatiedossiers met documenten en contactgeschiedenis.

### Analyse

Het Atlas-model sluit goed aan op de methode. De naam `Praktijkdossier` suggereert
echter een operationeel klantdossier en concurreert daarmee met WBD. In Atlas is
dit epistemische onderbouwing vóór case-identiteit.

### Risico

Een ondernemer kan hetzelfde onderwerp als WBD-dossier, Atlas-praktijkdossier,
Oriëntatie en Case tegenkomen zonder het verschil in gezag te begrijpen.

### Aanbeveling

- WBD blijft eigenaar van **organisatiedossiers** en dagelijkse geschiedenis.
- Atlas noemt de huidige laag **Praktijkbronnen** of **Oriëntaties**.
- Pas na menselijke toewijzing ontstaat een Atlas Case.
- Plaats praktijkbronnen onder Werkelijkheid, niet als los gereedschap naast
  Waarnemen.

### Prioriteit

**P1** voor naam en positionering; het onderliggende model bewust behouden.

---

## 10. Factuurbeheer

### Huidige situatie

Concepten kunnen worden opgeslagen, heropend, aangepast, als PDF gegenereerd en
expliciet definitief gemaakt. Definitieve facturen worden naar `Verzonden`
verplaatst, inhoudelijk vergrendeld en houden hun PDF. Een foutief leeg concept
is nu zichtbaar, maar de lijst en het conceptscherm bieden geen verwijder- of
archiveeractie. Definitieve facturen hebben terecht evenmin een deletepad.

### Analyse

De vergrendeling van definitieve facturen klopt. Het ontbreken van beheer voor
concepten maakt normale fouten permanent zichtbaar. Eén generieke deletefunctie
voor beide statussen zou onveilig zijn.

### Risico

- vervuilde conceptlijst;
- per ongeluk wissen van financieel bewijs als dezelfde actie later ook voor
  definitieve facturen wordt gebruikt;
- onduidelijk verschil tussen “niet meer tonen”, “ongeldig verklaren” en
  “definitief verwijderen”.

### Aanbevolen veilige levenscyclus

**Concepten**

- actie `Archiveer concept` op kaart en detailscherm;
- expliciete bevestiging met factuurnummer/klant of “onvolledig concept”;
- verplaats JSON en eventuele concept-PDF naar aparte archiefopslag;
- toon een Archief-filter met herstelactie;
- permanente verwijdering alleen vanuit Archief en alleen als er geen
  definitieve afgeleide factuur bestaat.

**Definitieve facturen**

- nooit inhoudelijk verwijderen of terugzetten naar concept;
- eventueel uit de dagelijkse lijst archiveren zonder bron/PDF te wissen;
- een fout later corrigeren via een expliciet correctie- of creditspoor dat naar
  het origineel verwijst;
- status, reden, moment en menselijke bevestiging altijd bewaren.

### Prioriteit

**P1** voor conceptarchief en herstel; **P3** voor een volwaardige
correctie-/creditworkflow wanneer de praktijk die vereist.

---

## 11. Organisatiedossier en lege invoer

### Huidige situatie

Een organisatiedossier toont direct twee volledige formulieren: document
toevoegen en contactmoment vastleggen. In het gecontroleerde Sportpaleis-dossier
waren beide lijsten leeg. De documentinvoer is ongeveer 344 px hoog en de
contactinvoer ongeveer 403 px; zij domineren de eerste inhoud onder het
dossierbeeld voordat er geschiedenis bestaat.

### Analyse

De functies hebben betekenis en werken. Het probleem is niet een loos veld,
maar dat de volledige creatiemodus permanent zichtbaar staat. De pagina voelt
daardoor als invoerscherm in plaats van dossier.

### Risico

- lege functionaliteit vraagt aandacht zonder actuele taak;
- dossierinhoud en geschiedenis krijgen minder gewicht dan administratie;
- een optioneel omschrijvingsveld lijkt nutteloos zolang nog geen bestand is
  gekozen.

### Aanbeveling

Toon in rust alleen:

- `Document toevoegen`;
- `Contactmoment vastleggen`;
- de bestaande geschiedenis of een betekenisvolle lege toestand.

Open het bijbehorende formulier pas na die bewuste actie, inline als disclosure
of in een rustig dialoogvlak. Zodra een bestand is gekozen, worden titel, type en
optionele omschrijving zichtbaar. De toekomstige functie blijft dus behouden,
maar vraagt geen aandacht vóór gebruik.

### Prioriteit

**P2.** Geen functionaliteit verwijderen; alleen intentioneel ontsluiten.

---

## 12. Atlas versus Workspace

### Huidige situatie

WBD ordent dagelijkse bedrijfspraktijk. Atlas toont aandacht, werkelijkheid,
horizon en een uitgebreide werkruimte. De inhoudelijke grens is correct, maar
WBD communiceert zijn rol duidelijker dan Atlas.

### Analyse

Atlas hoeft niet even “af” of even operationeel te voelen als WBD. Atlas moet wel
beter uitleggen waarom iets feit, observatie, betekenis, kennis of stilte is. De
methode hoort niet in extra uitlegtekst te zitten, maar in de volgorde en status
van werkobjecten.

### Risico

Wanneer Atlas vooral een mooie dagstart plus een lange gereedschapslijst is,
wordt het een tweede Workspace in plaats van de redigerende denklaag eronder.

### Aanbeveling

- WBD beantwoordt: **waar werk ik vandaag aan?**
- Atlas beantwoordt: **waarom verdient dit aandacht, wat weten we werkelijk en
  waar stopt ons begrip?**
- Experience beantwoordt: **wat ervaart deze mens en welke betekenis mag
  voorzichtig worden onderzocht?**
- Fundament beantwoordt: **waarop rust deze methode en implementatie?**

Laat iedere omgeving één van deze vragen primair dragen.

### Prioriteit

**P1**, als toetssteen voor alle vervolgbesluiten.

---

## 13. Wat klopt, wat is verouderd en wat blijft bewust bestaan?

| Onderdeel | Oordeel | Richting |
| --- | --- | --- |
| WBD hero en inhoudsritme | klopt | behouden als referentie |
| Gedeelde design language | klopt | behouden |
| Officieel WBD-logo | klopt | geen alternatieve varianten |
| WBD navigatieshell | klopt functioneel | verrijken met eigen iconografie en betekenisvolle aandacht |
| Atlas Focus, Horizon en Stilte | klopt inhoudelijk | compacter ordenen binnen normale shell |
| Atlas full-viewport opening | verouderd als dagelijkse vorm | vervangen door Workspace-achtige compacte opbouw |
| Contextgebonden observatiecapture | waardevol maar beperkt | behouden als bronmechanisme, niet als hoofdarchitectuur |
| Atlas `Waarnemen`-activering | te instrumenteel | verplaatsen uit primaire leesroute |
| Verborgen reviewlaag | inhoudelijk waardevol, zichtbaar onbruikbaar | terugbrengen als centrale Observaties-wachtrij |
| Praktijkdossiermodel | klopt | hernoemen/positioneren als Praktijkbron of Oriëntatie |
| Cases en Understanding | bewust behouden | laten volgen op menselijke beoordeling |
| `/e/#token` | legacy maar operationeel | compatibiliteit behouden |
| `/e/` zonder token | verouderd als ingang | naar canonieke Experience leiden |
| `/ervaar` | juiste blijvende URL | inhoudelijk laten landen op gekozen First Visit-richting |
| First Visit V2 | meest actuele richting | kandidaat voor canonieke Experience |
| Context-First experiment | onderzoeksartefact | niet als blijvende ingang presenteren |
| Experience Observatory | waardevol intern | observatie/research behouden, invite-creatie uitfaseren als standaard |
| Definitieve factuurvergrendeling | klopt | behouden |
| Conceptbeheer zonder archief | onvolledig | veilig archiveren en herstellen voorstellen |
| Volledig zichtbare dossierformulieren | functioneel maar dominant | pas na bewuste actie tonen |
| Technische Atlas-documentatie | inhoudelijk aanwezig | ontsluiten via read-only Fundament-register |

---

## 14. Aanbevolen beslisvolgorde vóór implementatie

1. **Experience-besluit:** bevestig `/ervaar` als canonieke URL en First Visit V2
   als inhoudelijke richting; bepaal de compatibiliteitsduur van persoonlijke
   tokens.
2. **Observatiebesluit:** bevestig dat capture bij het oppervlak hoort en
   menselijke beoordeling bij Atlas Werkelijkheid.
3. **Atlas-IA:** keur de scheiding Vandaag, Werkelijkheid, Horizon, Werkruimte en
   secundair Fundament goed.
4. **Hero-prototype:** maak daarna één compacte Atlas-compositie naast de huidige
   WBD-reference, zonder functionaliteit te wijzigen.
5. **Navigatieprototype:** beoordeel lijniconen, actieve staat en één
   aandachtindicator op desktop en mobiel.
6. **Beheerpatronen:** ontwerp conceptarchief/herstel en intentioneel geopende
   dossierformulieren.

Pas na deze zes besluiten is gerichte implementatie verantwoord. Tot dat moment
blijven bestaande gegevens, sessies, definitieve facturen en gevalideerde
workflows onaangetast.

## Reviewbewijs

De review is uitgevoerd op de actuele lokale kandidaat en bronarchitectuur.
Belangrijkste visuele referenties:

- `output/project-001c/ux-architecture-review/wbd-overview.png`
- `output/project-001c/ux-architecture-review/atlas-opening.png`
- `output/project-001c/ux-architecture-review/invoice-management.png`
- `output/project-001c/ux-architecture-review/organization-dossier.png`

Er is geen productcode gewijzigd en geen gegevensmutatie, commit, merge, push of
deployment uitgevoerd.
