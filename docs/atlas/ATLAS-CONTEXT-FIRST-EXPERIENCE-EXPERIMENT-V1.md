# Atlas Context-First Experience Experiment V1

## Besluit

**GO — voor de Context-First hypothese als lokale ontwerp- en Runtime-kandidaat.**

Dit is geen productie-GO, geen connector-GO en geen besluit om de bestaande Experience te vervangen. De proef toont voor één controleerbare organisatie aan dat Atlas binnen twee verplichte contextvragen een klein, eerlijk en herleidbaar organisatiebeeld kan vormen en daaruit een aantoonbaar specifiekere eerste onderzoeksvraag kan afleiden.

De productie-Experience, publieke website, PHP API, database, opslagmodel en geratificeerde Foundations zijn niet gewijzigd.

## 1. Oorzaakanalyse van de blinde start

### Waarneming

De huidige Route A start met:

> Welke werksituatie van vandaag bleef bij je hangen?

In de bijbehorende initiële Runtime State zijn nog geen Reality Contacts, betekenissen of hypotheses aanwezig. De vraag is constitutioneel veilig en open, maar kan inhoudelijk nog niet reageren op de organisatie van de deelnemer.

### Werkelijke oorzaak

De blinde start ontstaat vóór de Cognitive Processor inhoudelijk kan differentiëren:

1. Atlas kent de organisatie-identiteit nog niet.
2. Atlas heeft geen controleerbare publieke Reality Contact.
3. De eerste Runtime Decision kan daardoor alleen een algemene uitnodiging zijn.
4. De deelnemer moet zelf vertalen welk deel van diens werkelijkheid relevant is.
5. Atlas wordt pas zichtbaar nadat de deelnemer al contextwerk heeft verricht.

Dit bewijst geen breuk in de Foundation of Runtime Architecture. Het experiment voegt vóór de bestaande initiële Runtime-beweging een begrensde contextlaag toe en laat de canonieke Runtime zelf ongemoeid.

### Uitgesloten verklaringen

- **Styling:** dezelfde algemene vraag blijft algemeen als zij anders wordt vormgegeven.
- **Microcopy:** een organisatie benoemen in een vaste vraag is nog geen contextafleiding.
- **Meer vragen:** extra intakevelden vergroten de vertaallast en lossen de ontbrekende Reality Contact niet op.
- **Een verborgen live crawl:** een onbetrouwbare of niet-herleidbare fetch zou slechts de indruk van context wekken.

## 2. Minimaal Context-First ontwerp

De kandidaat gebruikt maximaal twee verplichte contextmomenten:

1. **Voor welke organisatie kijken we vandaag?**
2. **Welke website hoort bij deze organisatie?**

De deelnemer kan expliciet aangeven dat er geen website is. Een organisatie waar iemand graag van leert en de reden daarvoor staan in één ingeklapte, optionele contextsectie. Die invoer geldt uitsluitend als contrastsignaal van de deelnemer, nooit als bewijs over de eigen organisatie.

Na de tweede contextvraag geeft Atlas direct één compact beeld terug met vier gescheiden lagen:

- door de deelnemer gegeven;
- rechtstreeks publiek zichtbaar;
- voorlopige interpretatie;
- nog onbekend.

Daarna toont Atlas één eerste onderscheid en één onderzoeksvraag die uit precies twee publieke broncontacten en één open onbekende ontstaat.

### Waarom dit geen intakeformulier is

- De vragen verschijnen één voor één.
- Er zijn slechts twee verplichte antwoorden.
- Atlas legt kort uit waarom de bron nodig is.
- De optionele vergelijking is standaard gesloten.
- De invoer leidt onmiddellijk tot een zichtbare inhoudelijke beweging.
- De deelnemer kan het eerste beeld corrigeren of voor vandaag stoppen.

## 3. Werkende lokale kandidaat

De kandidaat heeft een eigen entrypoint, buildconfiguratie en outputmap:

- `website/context-first-experiment.html`
- `website/vite.context-first.config.ts`
- `website/src/context-first-experiment-main.ts`
- `website/src/atlas-context-first-experiment.ts`
- `website/src/styles/context-first-experiment.css`
- `website/dist-context-first/`

Lokale commando's:

```text
npm run dev:context-first
npm run build:context-first
```

De kandidaat importeert het bestaande `createInitialRuntime` en bewaart het resulterende veld als `baseField`. De contextlaag is een lokale experimentadapter; zij verandert `atlas-runtime.ts` niet en introduceert geen nieuw productie-opslagmodel.

## 4. Publieke bron en reproduceerbaarheid

### Onderzochte methode

Een live website tijdens ieder gesprek ophalen is voor deze lokale proef niet betrouwbaar genoeg:

- netwerktoegang kan ontbreken of toestemming vereisen;
- een site kan wijzigen tussen beoordeling en herhaling;
- een mislukte fetch mag nooit als gelezen bron worden gepresenteerd.

Daarom gebruikt de kandidaat één expliciet lokaal snapshot van de daadwerkelijk opgehaalde publieke WBD-site. Het broncontract staat in:

`website/context-first-sources/webuildanddesign.nl.snapshot.json`

### Bronbewijs

| Eigenschap | Waarde |
| --- | --- |
| Canonieke bron | `https://webuildanddesign.nl/` |
| Vastgelegd | `2026-08-04T04:15:13.8506430+02:00` |
| Homepage bytes | `2571` |
| Homepage SHA-256 | `9E76676D983EE725892716644881EE16578C02C3CB3C2C0C886C7525616FF937` |
| Publieke bundle | `/assets/index-BqT0vFtt.js` |
| Bundle bytes | `82156` |
| Bundle SHA-256 | `B635124C28AB13FC9A8CFC6677572E9E8560ADDC35113961518989490CE94720` |

Gebruikte publieke observaties:

- de homepage opent met begrijpen als vertrekpunt;
- WBD zegt eerst te onderzoeken hoe een organisatie werkt en waar mensen vastlopen;
- de zichtbare uitnodiging is “Vertel wat er speelt”;
- de oplossingsvorm blijft open tot de praktijk voldoende is begrepen.

Voor een andere URL toont de kandidaat expliciet dat geen lokaal snapshot beschikbaar is. Hij vormt dan geen publieke observatie. Zonder website vormt hij evenmin een schijnbeeld.

## 5. Afgeleide eerste vraag

De kandidaat verbindt:

1. publieke observatie: WBD belooft eerst te begrijpen hoe een organisatie werkt;
2. publieke observatie: de zichtbare eerste stap vraagt mensen te vertellen wat er speelt;
3. onbekende: hoe die vrije beschrijving een eerste gedeeld organisatiebeeld wordt.

Daaruit ontstaat:

> Jullie website belooft eerst te begrijpen hoe een organisatie werkt. De zichtbare eerste stap vraagt mensen om te vertellen wat er speelt. Waar moet een ondernemer bij We Build And Design op dat moment nog zelf vertalen wat er in de organisatie gebeurt?

De vraag is niet uit een vaste categorie gekozen. Als de organisatie-identiteit of broncontacten ontbreken, kan deze vraag niet geldig worden gevormd.

## 6. Route A / Route B vergelijking

De vergelijking gebruikte in beide routes dezelfde deelnemer en dezelfde voorbeeldorganisatie: We Build And Design.

| Toets | Route A — algemene opening | Route B — Context-First |
| --- | --- | --- |
| Atlas eerder aanwezig | Nee; Atlas vraagt vóór enig organisatiebeeld | Ja; Atlas brengt na twee korte contacten zelf een voorzichtig onderscheid in |
| Vertaallast deelnemer | Hoog; deelnemer kiest zelf een relevante werksituatie | Lager; vraag richt zich op één zichtbaar spanningsveld in de eigen organisatiecontext |
| Specificiteit | Uitwisselbaar tussen organisaties | Noemt organisatie, publieke belofte, zichtbare ingang en precieze onbekende |
| Epistemische eerlijkheid | Veilig, maar nog zonder bron | Iedere laag draagt bronstatus; interne werking blijft expliciet onbekend |
| Nieuwsgierigheid | Open uitnodiging zonder zichtbare reden | Atlas laat zien waarom juist deze vraag nu interessant is |
| Formuliergevoel | Eén open antwoordveld | Twee opeenvolgende contextmomenten; risico blijft aanwezig maar wordt door directe inhoudelijke teruggave begrensd |

### A/B-conclusie

Route B voelt aantoonbaar minder generiek omdat de eerste inhoudelijke vraag niet kan worden hergebruikt zonder de WBD-broncontacten. Atlas neemt bovendien een deel van het eerste vertaalwerk over, zonder interne feiten te verzinnen. De proef is daardoor meer dan een mooier formulier.

## 7. Runtime State en Journal

De lokale `ContextFirstRuntimeState` bewaart:

- het ongewijzigde canonieke `baseField`;
- organisatie-identiteit als `participant-input`;
- website als `participant-input`;
- optionele referentie en reden als `participant-input`;
- publieke feiten als `public-observation`, met URL, snapshot-id, excerpt en tijdstip;
- eerste interpretatie als `provisional-inference` met confidence `glimpse`;
- ontbrekende interne werkelijkheid als `unknown`;
- de afgeleide Runtime Decision met gebruikte broncontacten en reden.

Het Journal bevat vier opeenvolgende, herleidbare bewegingen:

| Revisie | Event | Bronstatus | Functie |
| --- | --- | --- | --- |
| 1 | `participant-context` | `participant-input` | Legt organisatie, site en eventueel contrast vast |
| 2 | `public-grounding` | `public-observation` | Voegt alleen gesnapshote publieke feiten toe |
| 3 | `provisional-interpretation` | `provisional-inference` | Vormt een voorzichtig beeld en opent het onbekende |
| 4 | `runtime-decision` | `unknown` | Verbindt broncontacten aan de eerste onderzoeksvraag |

De publieke site blijft een Reality Contact en wordt nergens gepromoveerd tot volledige of interne waarheid.

## 8. Browseracceptatie

Acceptatie is uitgevoerd tegen de productiegebouwde lokale kandidaat op `127.0.0.1`.

### Desktop

- Route A opent met de bestaande algemene Runtime-vraag.
- Route B accepteert organisatie en website.
- Optioneel contrast blijft optioneel en wordt als deelnemersignaal getoond.
- Feit, deelnemerinput, inferentie en onbekende zijn visueel gescheiden.
- De eerste vraag noemt en gebruikt de WBD-context.
- Bronbewijs opent en toont URL, tijdstip en beide hashes.
- Runtime State en Journal openen en tonen alle vier bronstatussen plus vier Journal-events.
- Een niet-ondersteunde website toont een expliciete bronbegrenzing.
- “Er is geen website” toont een eerlijke niet-weten-uitkomst.
- Browserconsole: 0 errors, 0 warnings.

### Mobiel

De browserkandidaat is functioneel doorlopen in een begrensde container van `390px` breed:

- organisatie-invoer krijgt werkelijke focus;
- website-invoer krijgt werkelijke focus;
- na de overgang staat scrollpositie op `0`;
- appbreedte is `390px`;
- geen horizontale app-overflow;
- geen horizontale document-overflow;
- bronlagen vallen terug naar één kolom;
- de afgeleide vraag en het antwoordveld blijven volledig bruikbaar;
- browserconsole: 0 errors, 0 warnings.

## 9. Screenshots

- `output/context-first-experiment-v1/route-a-desktop.png`
- `output/context-first-experiment-v1/route-b-desktop.png`
- `output/context-first-experiment-v1/route-a-mobile.png`
- `output/context-first-experiment-v1/route-b-mobile.png`
- `output/context-first-experiment-v1/route-b-mobile-question.png`
- `output/context-first-experiment-v1/source-proof-desktop.png`
- `output/context-first-experiment-v1/runtime-state-journal-desktop.png`

## 10. Technische validatie

| Controle | Resultaat |
| --- | --- |
| Volledige testset | 188/188 geslaagd |
| Context-First tests | 8/8 geslaagd |
| TypeScript | geslaagd |
| Publieke build | geslaagd; public-only verifier controleerde 29 bestanden en 9 tekstbestanden |
| Experience-build | geslaagd; bestaand afgeschermd pakket voorbereid |
| Context-First build | geslaagd; aparte `dist-context-first` output |

De publieke JavaScript-bundle bleef `index-BqT0vFtt.js`, gelijk aan de bundle waarop het bronbewijs is gebaseerd. De Context-First build gebruikt eigen `context-first-*` assets en wordt niet door het bestaande Experience-deployscript gepubliceerd.

## 11. Scopecontrole

Niet gewijzigd door dit experiment:

- geratificeerde Foundation-documenten;
- `atlas-runtime.ts`;
- bestaande Experience-entrypoint en flow;
- PHP API;
- database en migraties;
- sessieopslag;
- Observatory;
- publieke websitecode;
- productieconfiguratie en deployment.

Er is geen externe dependency toegevoegd.

## 12. Eindverdict en begrenzing

### GO

De hypothese is voor de WBD-casus bewezen: een klein brongebonden organisatiebeeld vóór de eerste inhoudelijke vraag maakt Atlas eerder zichtbaar, verlaagt de vertaallast en levert een duidelijk specifiekere en eerlijk herleidbare eerste vraag op.

### Begrenzing van dit GO

De proef bewijst nog niet dat willekeurige websites veilig en consistent kunnen worden gelezen. Er is bewust maar één expliciete lokale bronadapter. Een volgende werkstroom mag pas na Donovans A/B-praktijkvergelijking bepalen of en hoe bronverwerving breder wordt ontworpen. Tot die tijd blijft dit een lokale kandidaat en wordt niets gepubliceerd.
