# Atlas Connector Framework 001 — beslissende architectuurreview

**Datum:** 29 juli 2026  
**Besluit:** GO  
**Reviewuitkomst vóór correcties:** GO MET KLEINE AANPASSINGEN  
**Scope:** contract, provenance, synchronisatiegrenzen en health  
**Niet uitgevoerd:** nieuwe connector, GA4-configuratie, Workspace-UI of publicatie

## Executive summary

Het eerste contract bevatte een bruikbare generieke kern, maar noemde een
genormaliseerde bronwijziging te vroeg een Atlas-observatie. Daarnaast waren
schema- en translatorversies, brondekking en een lopende synchronisatierun
niet expliciet genoeg.

Deze vier kleine, generieke correcties zijn uitgevoerd en getest. Het
definitieve contract kent nu de volgende vaste lagen:

1. **Connector** — autorisatie en ruwe bronophaling.
2. **Normalizer** — bronformaat naar een stabiel genormaliseerd bronrecord.
3. **Record Change** — aantoonbare wijziging in de bronstaat.
4. **Translator** — recordwijziging naar een kandidaat voor een
   Atlas-observatie.
5. **Observation** — herleidbare, nog niet geïnterpreteerde constatering.
6. **Interpretation** — betekenis, onzekerheid en mogelijke vervolgstap;
   nadrukkelijk buiten de connector.

Daarmee is Framework 001 voldoende brononafhankelijk om als basis te dienen.
Het bewijst nog niet dat iedere toekomstige bron zonder uitbreiding past.
Vooral incrementele, overlappende en voorlopige data moeten door een tweede
echte connector worden bewezen.

## Bevestigde sterke punten

- Connectoridentiteit en bronstaat zijn logisch geïsoleerd met
  `contextId + connectorId`.
- Autorisatie wordt vóór bron-I/O beoordeeld en secrets maken geen deel uit
  van contract of staat.
- Laatste succesvolle synchronisatie en inhoudelijke bronactualiteit blijven
  afzonderlijke begrippen.
- Een mislukte refresh verwijdert geen laatst bekende geldige bronstaat.
- Retry en backoff zijn brononafhankelijk en begrensd.
- Recordvolgorde beïnvloedt de uitkomst niet.
- Deterministische hashes voorkomen duplicatie.
- De health-status gebruikt één generiek model en kan centraal over veel
  connectoren worden samengevat.

## Beslissende beantwoording

### 1. Scheiding van verantwoordelijkheden

**Na correctie: voldoende scherp.**

- De Connector haalt ruwe records op en rapporteert dekking.
- De Normalizer valideert en vormt een stabiel bronschema.
- De sync-engine vergelijkt bronstaat en produceert Record Changes.
- De Translator maakt daar Atlas Observation Candidates van.
- Interpretation blijft een afzonderlijke Atlas-laag.

De sitemapadapter bevat alleen XML-extractie. URL-validatie, toegestane
origins, tijdnormalisatie en het genormaliseerde paginaschema zitten in de
Normalizer.

### 2. Is een genormaliseerd record al een Atlas-observatie?

**Nee.**

Een genormaliseerd record is broninformatie. Ook `new`, `changed` of
`removed` is eerst een Record Change. Pas een expliciet geversioneerde
Translator mag hiervan een Atlas Observation Candidate maken. Menselijke of
Atlas-interpretatie volgt daarna en is geen connectorverantwoordelijkheid.

### 3. Generiek versus door sitemap beïnvloed

Werkelijk generiek zijn:

- identiteit, context, autorisatiestatus;
- sync-run, checkpoint, retry en health;
- raw reference, raw hash en normalized hash;
- provenance en versievelden;
- complete/full, partial, incremental en time-window dekking;
- new/changed/removed als recordwijzigingen;
- centrale foutcategorieën en health-samenvatting.

Door de sitemap beïnvloed waren:

- de aanname dat iedere sync een volledige snapshot is;
- de aanname dat afwezigheid altijd verwijdering betekent;
- het direct promoveren van een recorddiff tot observatie.

Die aannames zijn uit het generieke contract verwijderd. De huidige
snapshot-engine accepteert alleen aantoonbaar complete full snapshots.

### 4. Volledige herleidbaarheid

**Ja, binnen de huidige bewijsgrens.**

Een Record Change bevat connector, context, sync-run, bronlocator, raw hash,
normalizer-ID, normalizerversie en genormaliseerde schemaversie. Een
Observation Candidate voegt translator-ID, translatorversie en
observatieschemaversie toe.

De volledige ruwe payload wordt niet centraal bewaard; `rawReference` en
`rawContentHash` bewijzen herkomst en identiteit. Een bron die reconstructie
van het originele record vereist, moet in haar adapter een duurzame
`rawReference` leveren of een expliciete raw-store toevoegen. Dat is een
bronbeleid, geen impliciete claim van Framework 001.

### 5. Synchronisatietijd, actualiteit en voorlopigheid

**Synchronisatietijd en bronactualiteit zijn voldoende gescheiden.**

`lastSyncSucceededAt` zegt wanneer Atlas succesvol las.
`sourceObservedAt` zegt hoe actueel de bron aantoonbaar is.
`coverage` zegt of de ontvangen set volledig, gedeeltelijk, incrementeel of
venstergebonden is.

Voorlopige versus definitieve bronrecords kunnen via
`sourceRecordVersion`, genormaliseerd schema en payload worden uitgedrukt,
maar semantiek en consolidatie daarvan zijn nog niet door een echte bron
bewezen.

### 6. Nieuw, gewijzigd, verdwenen en tijdelijk niet waargenomen

**Veilig voor complete snapshots.**

Alleen afwezigheid in een `full_snapshot + complete` mag als `removed`
worden verwerkt. Een gedeeltelijke snapshot wordt geweigerd en behoudt de
laatst geldige staat. Tijdelijk niet waargenomen is daardoor nooit
stilzwijgend een verwijdering.

Incrementele en venstergebaseerde consolidatie is bewust nog niet
geïmplementeerd.

### 7. Idempotentie

Bevestigd voor:

- herhaalde complete snapshots;
- records in andere volgorde;
- herhaalde vertaling met dezelfde translatorversie;
- nieuwe translatorversie met een nieuwe deterministische observation-ID;
- mislukte refresh met behoud van de laatst succesvolle staat.

Een run wordt vóór bron-I/O als `activeRun` vastgelegd. Een achtergebleven run
wordt bij een volgende start als onderbroken in de historie opgenomen.

Nog te bewijzen:

- hervatten vanuit een echte broncursor;
- overlappende historische vensters;
- bronrecords met revisie- of provisional/final-semantiek.

### 8. Betekenis van `contextId`

`contextId` is correct begrensd als logische opslag- en
herleidbaarheidsisolatie. Het is **geen bewijs van multi-tenant beveiliging**.

Framework 001 bewijst niet:

- authenticatie of autorisatie per gebruiker;
- cryptografische tenantscheiding;
- row-level security;
- gescheiden secret stores;
- bescherming tegen een kwaadwillende runtime.

### 9. Centrale health voor veel connectoren

**Ja, als samenvattingscontract.**

De vaste velden `healthStatus`, `sourceFreshness`, `authorizationStatus`,
`activeRun`, `lastSyncSucceededAt` en de generieke `errorStatus.category`
kunnen centraal worden geaggregeerd zonder connector-specifieke UI. De
toegevoegde `summarizeConnectorHealth` bewijst deze uniforme samenvatting.

Bron-specifieke diagnostiek blijft optioneel bewijs en mag het centrale
health-contract niet veranderen.

### 10. Minimaal noodzakelijke wijzigingen

Uitgevoerd:

1. expliciete Connector/Normalizer/Record Change/Translator/Observation-lagen;
2. normalizer-, translator- en schemaversies in provenance en identiteit;
3. expliciete coverage met een fail-closed grens voor onvolledige snapshots;
4. persistente `activeRun` en unieke run-ID;
5. generieke foutcategorieën en fleet-healthsamenvatting;
6. nieuwe v2 runtime-opslaggrens voor de gewijzigde staatstructuur.

Er is geen bredere herbouw uitgevoerd.

## Bronafhankelijke aannames die niet in de kern mogen terugkeren

- Afwezigheid betekent verwijdering.
- Een checkpoint betekent volledigheid.
- `sourceUpdatedAt` betekent definitieve data.
- Eén record levert precies één Atlas-observatie.
- Een normalizerwijziging mag bestaande identiteit stilzwijgend overschrijven.
- Een connectorstatus mag bron-specifieke foutcodes nodig hebben om centraal
  begrijpelijk te zijn.
- `contextId` is een beveiligingsgrens.

## Wat een volgende echte connector moet bewijzen

Een volgende connector moet niet vooral een nieuwe leverancier toevoegen,
maar minimaal één nog onbewezen contractvorm:

- incrementele cursor of overlappend tijdvenster;
- voorlopige data die later definitief of gewijzigd wordt;
- bronautorisatie met externe rechten;
- quota/rate-limitgedrag;
- duurzame reconstructie van het originele bronrecord;
- gedeeltelijke mislukking binnen één run.

GA4 kan meerdere van deze grenzen bewijzen, maar pas nadat property,
read-only autorisatie en veilige runtime expliciet beschikbaar zijn.

## Kleinste betekenisvolle vervolgstap

Geen nieuwe generieke abstrahering.

Kies één echte, read-only bron met een aantoonbaar praktijkdoel én een
incrementeel of overlappend datamodel. Maak vóór implementatie een korte
contractmapping op bovenstaande lagen. Pas het framework alleen aan wanneer
die echte bron een bewezen lacune laat zien.

## Verificatie

- 79/79 repositorytests geslaagd;
- productiebuild geslaagd;
- publieke buildgrens geslaagd;
- regressies toegevoegd voor recordvolgorde, incomplete snapshots,
  afgebroken runs, translatorversies en centrale health;
- geen Workspace-, preview- of productiewijziging uitgevoerd.
