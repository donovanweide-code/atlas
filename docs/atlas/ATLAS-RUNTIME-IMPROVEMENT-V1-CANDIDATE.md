# Atlas Runtime Improvement V1 — Candidate Report

## Status

**Lokale Runtime Improvement Candidate: GO voor Donovans beoordeling.**

**Productiestatus: ongewijzigd.** Deze kandidaat is niet gepubliceerd en voert
geen productie-uitrol uit.

De Foundation, Continuous Inquiry Loop, Cognitive Engine, Runtime Architecture,
database en serveropslag zijn niet gewijzigd. Er is geen Foundation Conflict
Candidate ontstaan.

## Root Cause Analysis

De volledige analyse is vóór iedere bronwijziging uitgevoerd en vastgelegd in
`ATLAS-RUNTIME-IMPROVEMENT-V1-RCA.md`.

### P1 — invoer

Drie reproduceerbare Experience-integratiefouten verklaarden het verdwijnen:

1. een hersteld lokaal concept werd bij render overschreven door een checkpoint
   met alleen sessiemetadata;
2. een gecommitteerd antwoord stond correct in Runtime State, Journal en
   `originQuote`, maar de render sloot het nieuwste Reality Contact expliciet
   uit;
3. `Ik weet het nog niet` kon een reeds ingevuld concept negeren, een generieke
   non-respons committen en daarna de enige lokale kopie wissen.

API, Runtime State, Journal, Constitutional Gate en centrale opslag zijn als
primaire oorzaak uitgesloten: verzonden woorden stonden daar exact en
ongewijzigd opgeslagen; onverzonden woorden bereikten die lagen nog niet.

### Cognitieve herhaling

De Cognitive Processor detecteerde `no-meaningful-change` en verhoogde
`consecutiveNoChange`, maar las de teller nergens terug. De vroege
Runtime Decision-branch produceerde na iedere non-respons exact dezelfde
`concretize`-vraag. Tegelijk werd de onbeantwoorde onbekende ten onrechte als
`resolved` gemarkeerd.

Runtime State en Journal bewaarden het gedrag correct, de Gate voorkwam een
verzonnen inzicht en de browser toonde alleen de upstream Decision. De primaire
oorzaak lag dus in de Cognitive Processor en diens Runtime Decision-vorming.

## Exacte correcties

### Bescherming van deelnemerswoorden

- Een metadata-refresh voegt nu samen met een bestaand checkpoint uit dezelfde
  uitnodiging en sessie. Een bestaand `draftStepId` en `draft` blijven daardoor
  behouden.
- `Mijn eerdere woorden` toont alle gecommitteerde Reality Contacts, inclusief
  het nieuwste antwoord.
- `Ik weet het nog niet` kan niet meer worden uitgevoerd terwijl de textarea
  woorden bevat. De invoer blijft staan, krijgt focus en de deelnemer kiest
  daarna zelf tussen verzenden of bewust leegmaken.
- De centrale API, Runtime en serveropslag zijn hiervoor niet gewijzigd.

### Cognitive Processor

TypeScript-processor en PHP-runtime-mirror voeren identiek dezelfde minimale
toestandsovergangen uit:

1. Een non-respons parkeert de lopende onbekende; zij wordt niet langer als
   opgelost geregistreerd.
2. Na de eerste opbrengstloze toets verschuift aandacht van de bestaande vraag
   naar een andere waarnemingspositie (`attention-shift` / `perspective`).
3. Na de tweede opeenvolgende no-change wordt de actieve hypothese `parked` en
   haar confidence `weakened`. Atlas stopt met drukken op die gedachte en opent
   een door de deelnemer te kiezen ander moment (`hypothesis-parking` /
   `free-telling`).
4. Na nog een no-change stelt Atlas niet automatisch opnieuw een vraag. De
   Decision wordt `silence`; de textarea en vrijwillige stop blijven beschikbaar,
   zodat de deelnemer zelf nieuwe grond kan inbrengen.
5. Een inhoudelijk nieuwe bijdrage na die open ruimte zet
   `consecutiveNoChange` terug op nul en heropent aantoonbaar onderzoek.
6. Een expliciet gecorrigeerde hypothese wordt eerst `contested` en `weakened`.
   Een tweede expliciete weerlegging binnen dezelfde voorwaarden maakt haar
   `abandoned` met doodsoorzaak `refuted-same-conditions`.
7. Parkering en loslating staan met het gewijzigde hypothesis-id in het Journal;
   de kwalitatieve confidence blijft gelijk aan de werkelijk gewijzigde
   hypothese.

Er is geen nieuw type, schema, tabel, opslagcontract, beweging of cognitief
principe toegevoegd. Alleen reeds bestaande toestanden en geratificeerde
bewegingen zijn uitvoerbaar gemaakt.

## Technische validatie

### Automatische tests

`npm test`

- **180 tests geslaagd**
- **0 mislukt**
- nieuwe regressiedekking voor:
  - conceptbehoud bij metadata-refresh;
  - bescherming tegen de conflicterende niet-wetenactie;
  - zichtbaarheid van alle Reality Contacts;
  - `attention-shift` na eerste no-change;
  - `hypothesis-parking` en confidence-verzwakking na tweede no-change;
  - stilte zonder automatische vervolgvraag;
  - traceerbare affected hypothesis in het Journal;
  - loslating na herhaalde expliciete correctie;
  - statische gelijkheid van de TypeScript- en PHP-markers.

### Builds

`npm run build:experience`

- geslaagd;
- TypeScript geslaagd;
- Experience-bundle en afgeschermd deploypakket opnieuw opgebouwd;
- kandidaatasset: `assets/experience-DoXgySJr.js`.

`npm run build`

- geslaagd;
- publieke buildgrens opnieuw geverifieerd;
- 29 publieke bestanden en 9 tekstbestanden gecontroleerd;
- publieke websitecode is niet gewijzigd.

### PHP-controle

De PHP-runtime-mirror is door dezelfde regressietest op de vereiste markers en
beslispaden gecontroleerd en is door de packager opgenomen. In deze lokale
Windows-omgeving is geen PHP CLI aanwezig; daarom is `php -l` hier niet
uitvoerbaar. De bestaande PHP-preflight blijft een verplichte eerste controle
bij een eventuele, afzonderlijk goedgekeurde productie-uitrol.

## Lokale browseracceptatie

Uitgevoerd tegen een nieuwe lokale Runtime 6.0-sessie met de opnieuw gebouwde
Experience-candidate.

### Invoerketen

- concept ingevoerd zonder submit;
- refresh en hervatten: concept aanwezig;
- tweede refresh en hervatten: concept nog steeds exact aanwezig;
- met ingevuld concept op `Ik weet het nog niet` geklikt: submit geblokkeerd,
  focus terug naar textarea, woorden intact;
- concept bewust verzonden: nieuwe textarea leeg voor de volgende beurt;
- `Mijn eerdere woorden` geopend: het zojuist gecommitteerde antwoord exact
  zichtbaar;
- Runtime State en Journal behielden de gecommitteerde woorden.

### Cognitieve keten

- concrete hypothesevormende bijdrage verzonden;
- eerste `Ik weet het nog niet`: eerdere counterexamplevraag verdween en Atlas
  verschoof naar perspectief;
- tweede `Ik weet het nog niet`: hypothese werd `parked` en `weakened`, Atlas
  opende een ander gekozen moment;
- derde `Ik weet het nog niet`: geen nieuwe vraag, wel open invoer en vrijwillige
  stop;
- een inhoudelijk nieuw moment ingebracht: Runtime nam het aan, reset de
  no-change-reeks en opende een nieuw spoor;
- Runtime State: revision, meta, hypothesisstatus en Decision correct;
- Cognitive Journal: `attention-shift`, `hypothesis-parking`, `attention-shift`
  in volgorde en het geparkeerde hypothesis-id traceerbaar.

### Persistentie en browsergedrag

- refresh: actuele Runtime Decision en veldtoestand behouden;
- hervatten: juiste deelnemer en sessie herkend;
- browser-terug: beschermingsdialoog verscheen, gesprek bleef behouden;
- browserconsole: **0 fouten, 0 waarschuwingen**.

De tijdelijke lokale acceptatiesessie, state en lokale server zijn na validatie
verwijderd. Productiedata is niet benaderd of gewijzigd.

## Aansluiting op de geratificeerde canon

De correcties voeren bestaande regels uit:

- CI 5 en 14.5: opnieuw onderzoeken is niet opnieuw hetzelfde vragen; twee
  bewegingen zonder opbrengst vragen om anders kijken of ruimte laten;
- CI 8.7–8.8: een niet-toetsbare gedachte kan worden geparkeerd en een weerlegde
  gedachte moet kunnen sterven;
- CE 7.19, 7.20, 7.22 en 7.29: parkering, loslating, aandachtsverschuiving en
  eerlijke no-change;
- CE 11.3 en 12.2–12.3: niet-herhaling en dalende opbrengst sturen aandacht;
- CE 18 en 19.2: stilte is geldig en herhaling vraagt om verbreding;
- CE 20.3–20.4: een terugkerende vraag is een metacognitief alarm dat gedrag
  moet veranderen;
- CE 24.8, proef D: no-change produceert niet automatisch een nieuwe vraag;
- RA-12: alleen een traceerbare verandering of expliciete no-changebeslissing
  draagt een zichtbare beweging.

## Scopebevestiging

Niet gewijzigd:

- Foundation-documenten;
- Continuous Inquiry Loop;
- Cognitive Engine;
- Runtime Architecture;
- database en migraties;
- serveropslagmodel;
- algemene Experience-opbouw of styling;
- Atlas Workspace;
- Sportpaleis;
- publieke websitefunctionaliteit;
- productie.

## Resterende beoordeling

Technisch en lokaal is deze kandidaat gereed. Het inhoudelijke succescriterium
blijft Donovans praktijkervaring na een afzonderlijk goedgekeurde productie-
uitrol. Deze kandidaat claimt die live praktijkacceptatie nog niet.
