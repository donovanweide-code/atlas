# Sportpaleis Workspace 008 - Praktijktest & Pilot Preparation Review

Baseline: `SPW-007B-20260807`  
Reviewdatum: 7 augustus 2026  
Scope: gecontroleerde lokale praktijktestvoorbereiding, geen pilotproductie

## Uitkomst

De huidige Workspace is veilig genoeg om een gecontroleerde medewerkerspraktijktest met fictieve orders uit te voeren. Hij is nog niet gereed voor volledige pilotproductie. De rolgrenzen, servervalidatie, orderzoeking, productie-instructies, foliebatches, audit en hardwareblokkades zijn sterk genoeg om echte medewerkerfrictie te onderzoeken zonder externe systemen te activeren.

De belangrijkste open punten zijn geen kleine technische fouten maar keuzes in invoer- en procesontwerp. Daarom zijn ze in deze fase niet stilzwijgend aangepast.

## Wat is onderzocht

- Winkelmedewerker: nieuwe en bestaande klantcontext, verplichte contactvelden, fout e-mailadres, meerdere artikelen, gegroepeerde aantallen, varianten, afwijkende bedrukking, initialen/tussenvoegsel, notitie, prioriteit, zoeken en wijzigingsgrens.
- Patrick: werkvoorraad, kleurgebonden batches, selectie en `Alles in filter`, atomaire voortgang, holds, aandacht, productie-instructies, maatvoering en rolgrens.
- Kevin: rollen, artikelen, verenigingscontext, productieprofielen, communicatie-instellingen, folie/rollen en persoonlijke weergave.
- Fysieke foundation: statussen, eenvoudige barcode-identiteit, eventhistorie, communicatiestatus en afhalen.
- Responsiviteit: desktop 1440 x 1000, tablet 768 x 1024 en mobiel 390 x 844.

## Wat al goed genoeg is

- Winkel, Productie en Beheer zijn zichtbaar en server-side gescheiden.
- Naam, e-mail en telefoon zijn voor nieuw aangemaakte klantorders verplicht; e-mail wordt browser- en server-side gevalideerd.
- De Nederlandse browsermelding voor `test@` is concreet en zichtbaar.
- Zoeken werkt op klant, ordernummer, telefoon, e-mail, vereniging en artikel/SKU.
- Een winkelmedewerker kan een order in status Order wijzigen en wordt vanaf Controle vergrendeld.
- Aantallen kunnen gegroepeerd blijven en de datafoundation ondersteunt meerdere varianten.
- Prioriteit is een rustige uitzondering met aanvrager, afstemming, reden, toelichting en vastleggingstijd.
- Productie ziet kleur, orderherkomst, aandacht, maat/bedrukking en - voor volledig gemodelleerde items - een profielinstructie met cm, positie en rotatie.
- Selectie en bulkvoortgang zijn atomair; een volledige kleurhold blokkeert de groep.
- Barcode bevat alleen een eenvoudige sleutel naar de order. Barcode en hardwarevalidatie staan uit.
- Communicatiestatus ondersteunt `NOT_SENT`, `SENT`, `DELIVERED`, `BOUNCED` en `FAILED`; bounce kan Attention `E-mail niet bezorgd - klant bellen` maken zonder mail te versturen.
- Afhalen is een afzonderlijke, geaudite gebeurtenis na Gereed.
- Persoonlijke weergave kan optionele onderdelen aanpassen, terwijl klant, status en kleurbatches vast blijven.
- De artikelselectie-scrollfix werkt zonder terugkeer naar de paginatop en herstelt focus op het gekozen artikel.

## Gevonden bugs en data-afwijkingen

De orderzoeking zette niet-matchende rijen correct op het HTML-attribuut `hidden`, maar de expliciete grid-CSS bleef ze visueel tekenen. Dit is geïsoleerd hersteld met de standaardgarantie `[hidden] { display: none !important; }` en voorzien van regressiedekking. De resultaatmeter volgt nu eveneens het zichtbare aantal (`1 order`/`n orders`). Zoekindex, filtering en orderlogica zijn niet gewijzigd.

Wel zijn twee inconsistenties in de huidige demo-/seeddata aantoonbaar:

1. Enkele bestaande demo-orders missen e-mail en telefoon, terwijl ze wel naar productie kunnen. Nieuwe orders blokkeren dit correct, maar een datamigratie of pilot-startvalidatie is nodig.
2. Niet ieder oud seed-item heeft een `productionProfileId`; daardoor verschijnt de productie-instructie niet bij alle bestaande demo-orders. Nieuw volledig gemodelleerd ordermateriaal toont de instructie wel.

## UX-frictie

1. **Nieuwe order begint niet leeg.** De reviewdemo start met 27 voorgevulde invoervelden en 3 geselecteerde artikelen. Dat is geschikt voor een visuele demo, maar riskant voor een praktijktest of pilotinvoer.
2. **De invoer is verticaal lang.** Gemeten paginalengte: circa 2474 px desktop, 3423 px tablet en 4269 px mobiel. Er is geen horizontale overflow, maar een medewerker moet veel context vasthouden tijdens scrollen.
3. **Bestaande klant is alleen orderzoeking.** Er is geen eenvoudige hergebruikactie waarmee contactgegevens vanuit een gevonden order naar een nieuwe order worden overgenomen.
4. **Standaardbedrukking toont altijd vier generieke velden.** Initialen, naam, rugnummer en shortnummer staan tegelijk in beeld, ook wanneer het geselecteerde artikel maar één optie toestaat.
5. **Afwijkende itemvelden zijn ook generiek.** Ieder item toont alle vier bedrukvelden zodra Afwijkende bedrukking wordt gekozen.
6. **Variantregels zijn functioneel te beperkt.** Een variantregel bevat maat, aantal en rugnummer, maar geen eigen initialen, naam of shortnummer. Het voorbeeld met drie shorts en verschillende bedrukking kan daardoor niet ondubbelzinnig in één gegroepeerde regel worden vastgelegd.
7. **Tussenvoegseldata bestaat, invoerbesluit nog niet.** Voornaam, tussenvoegsel en achternaam kunnen semantisch worden opgeslagen, maar de zichtbare directe invoer `Initialen` kan hiermee concurreren. De medewerker kan nog twijfelen welke bron leidend is.
8. **Order aanpassen is smaller dan verwacht.** De winkel-UI laat vóór productie contactgegevens wijzigen, maar geen artikel-, maat- of bedrukcorrectie.
9. **Beloofdatum blijft zichtbaar in historische demo-orders.** Nieuwe gewone orders hebben geen beloofdatum, maar `Gereed op` is standaard een zichtbare persoonlijke kolom en oude demo-orders bevatten vaste datums.

## Procesrisico's

1. **Artikelbeleid is niet door Kevin beheerbaar in de UI.** Het servermodel kent per artikel `none`, `required`, `optional`, `mutually-exclusive` en `combination`, maar Artikelbeheer biedt alleen vereniging/context, productieprofiel en actiefstatus. Toegestane bedrukopties zijn dus nog broncode-/seedconfiguratie.
2. **UI en serverbeleid lopen uiteen.** De server weigert ongeldige personalisatie, maar de medewerker ziet vooraf niet alleen de toegestane velden. Fouten komen daardoor te laat in de flow.
3. **Alles in filter is veilig maar niet vanzelfsprekend.** Patrick kan alle zichtbare orders over gemengde statussen, foliekleuren en holds selecteren. De atomaire serveractie voorkomt gedeeltelijke voortgang, maar zonder status-/kleurfilter is de verwachte uitkomst moeilijk te voorspellen.
4. **De fysieke statusflow is nog gecomprimeerd.** `ORDER -> CONTROL -> PRINT -> DONE` plus communicatie en pickup is uitbreidbaar, maar label beschikbaar, bij productie, klant geïnformeerd en afgehandeld zijn nog geen afzonderlijke operationele momenten.
5. **Tijdmeting is mogelijk maar nog niet gegarandeerd compleet.** Eventhistorie registreert creatie, statusovergangen, communicatie en afhalen. Doorlooptijd-, productietijd-, wachttijd- en afhaaltijdrapportage vereist vaste definities en volledige events voordat hierop gestuurd wordt.
6. **WBD-facturen zijn niet aanwezig.** Dit is correct zolang geen WBD-facturatiecapability is aangesloten; de Workspace mag dit niet simuleren.

## Wat in 008 is gewijzigd

- De zichtbaarheid van gefilterde orderrijen is gecorrigeerd; niet-matchende rijen verdwijnen nu daadwerkelijk.
- Geen orderlogica, rechten, statussen of hardwareflags gewijzigd.
- Een niet-technische praktijktestkaart met 10 winkel-, 4 productie- en 4 beheercases toegevoegd.
- Actuele screenshots en deze reviewbundel toegevoegd.

## Bewust niet gewijzigd

- Geen formulier of varianten-UX herontworpen.
- Geen klantregister, statusuitbreiding of filterlogica gebouwd.
- Geen artikelbeleidbeheer toegevoegd.
- Geen mail-, bounce-, WhatsApp-, Zebra-, scanner-, WinPlot-, Summa-, Direct Print-, LIV- of ERP-integratie geactiveerd.
- Geen WBD-facturatiefunctionaliteit verzonnen.
- Geen productieomgeving of DNS gewijzigd.

## Aanbevelingen vóór de praktijktest

1. Gebruik een lokale kopie met fictieve data en een expliciete resetmogelijkheid.
2. Beslis of de praktijktest bewust de voorgevulde demo-order moet beoordelen of met een lege order moet starten; meng deze doelen niet.
3. Laat medewerkers de generieke bedrukvelden en variantregels zelf tegen de testcases aanlopen. Noteer waar zij een gok doen.
4. Laat Patrick vóór iedere bulkactie hardop benoemen welke orders en statussen hij verwacht te verplaatsen.
5. Gebruik alleen nieuwe, contact-complete testorders voor de ketentest; behandel incomplete seedorders als testdata-afwijking.
6. Houd hardware, communicatie en productie-send uit zoals nu afgedwongen.

## Pas zinvol na medewerkersfeedback

- Definitieve keuze voor leeg startformulier en eventuele klant-hergebruikactie.
- Policy-driven bedrukvelden per artikel en een compact variantmodel voor alle toegestane bedruktypen.
- Definitieve invoer voor hoofdinitialen en tussenvoegsel, met typografie uitsluitend vanuit het productieprofiel.
- Status-/kleur-/holdfilters en semantiek van `Alles in filter`.
- Eventuele verkorting of opsplitsing van de mobiele orderflow.
- Uitbreiding van de fysieke statuslijn en tijdsrapportages.

## Readiness

```text
CURRENT BASELINE PRESERVED: YES
PRACTICE TEST READY: YES
EMPLOYEE LIGHT WORKFLOW READY: NO
PRODUCTION WORKFLOW READY: YES
ADMIN WORKFLOW READY: YES
BARCODE FOUNDATION READY FOR LATER HARDWARE TEST: YES
EXTERNAL COMMUNICATION ACTIVATED: NO
DIRECT PRINT HARDWARE ACTIVATED: NO
PRODUCTION DEPLOYMENT: NO
```

## GO / NO-GO

**GO voor een gecontroleerde medewerkerspraktijktest met fictieve orders, observator en alle externe/hardwarefuncties uit.**

Dit is uitdrukkelijk geen GO voor pilotproductie. De medewerkerflow is nog niet pilotgereed omdat artikelgestuurde bedrukvelden, volwaardige varianten, een lege startstaat en correctie van artikel/bedrukking vóór productie eerst op basis van medewerkersfeedback moeten worden besloten.
