# Atlas Runtime Improvement V1 — Root Cause Analysis

## Status

**RCA afgerond — wijzigingspoort geopend voor twee minimale correcties.**

Deze analyse is uitgevoerd op de ongewijzigde lokaal gevalideerde Runtime
Implementation V1-kandidaat. Er is tijdens de analyse geen broncode gewijzigd en
er is niets naar productie gepubliceerd.

## Praktijkbevindingen

1. Een ingevuld antwoord verdween en het tekstveld werd leeg.
2. Atlas bleef na herhaald `Ik weet het nog niet` vrijwel dezelfde
   onderzoeksvraag stellen en veranderde niet zichtbaar van richting.

De eerste bevinding heeft twee technisch verschillende, beide reproduceerbare
verschijningsvormen. Die worden hieronder afzonderlijk behandeld.

## Onderzoeksmethode

De analyse combineert:

- statische ketenanalyse van textarea, lokale checkpoint, Experience-integratie,
  API, Runtime State, Cognitive Journal, Runtime Decision en render;
- directe deterministische uitvoering van de ongewijzigde Cognitive Processor;
- browserreproductie tegen de lokale Experience-server met Runtime 6.0;
- inspectie van de servertoestand na iedere reproductie;
- vergelijking met de geratificeerde Continuous Inquiry Loop, Cognitive Engine
  en Runtime Architecture.

## RCA 1 — gebruikersinvoer

### Reproductie A: een nog niet verzonden concept

1. Start een nieuwe Runtime 6.0-sessie.
2. Typ zonder te verzenden:
   `Deze volledige zin mag bij refresh en hervatten nooit verdwijnen.`
3. Refresh, hervat en controleer de textarea: het concept staat er nog.
4. Refresh en hervat nogmaals: de textarea is leeg.
5. Inspecteer de servertoestand.

Resultaat:

- de eerste hervatting leest het lokale checkpoint correct;
- de render schrijft direct daarna hetzelfde checkpoint opnieuw zonder
  `draftStepId` en `draft`;
- de tweede hervatting kan daardoor niets meer herstellen;
- Runtime revision blijft `0`;
- Runtime State bevat geen Reality Contact;
- Cognitive Journal bevat geen transactie.

**Bewezen primaire oorzaak:** `refresh(state)` in de Experience-integratie
overschrijft na iedere render het volledige lokale checkpoint met alleen
sessiemetadata. Het herstelde concept wordt daardoor na één render uit de enige
opslaglaag verwijderd.

### Reproductie B: een succesvol verzonden antwoord

1. Verstuur:
   `Tijdens de planning zocht ik opnieuw naar dezelfde klantafspraak in drie
   verschillende plekken.`
2. Controleer de volgende beurt: de textarea is leeg en `Mijn eerdere woorden`
   meldt dat dit het eerste moment is.
3. Inspecteer de servertoestand.

Resultaat:

- Runtime revision is `1`;
- het volledige antwoord staat exact in het nieuwste Reality Contact;
- Cognitive Journal bevat de transactie;
- Runtime Decision bevat exact dezelfde tekst als `originQuote`;
- de render neemt `realityContacts.slice(0, -1)` en verbergt dus juist het
  nieuwste contact;
- `originQuote` wordt nergens zichtbaar gemaakt.

**Bewezen primaire oorzaak:** de Experience-render verbergt de zojuist
gecommitteerde woorden. De invoer is in deze variant niet uit API, Runtime State
of Journal verdwenen, maar wordt voor de deelnemer onzichtbaar gemaakt terwijl
het nieuwe tekstveld leeg hoort te zijn voor de volgende beurt.

### Reproductie C: ingevulde woorden gevolgd door `Ik weet het nog niet`

1. Vul in de Runtime-textarea in:
   `Dit uitgeschreven concept mag niet stil verdwijnen wanneer ik de
   onbekend-knop raak.`
2. Klik, zonder eerst te verzenden, op `Ik weet het nog niet`.
3. Inspecteer browser, checkpoint en servertoestand.

Resultaat:

- de handler negeert de niet-lege textarea en verstuurt uitsluitend
  `Weet ik nog niet.`;
- na succes wordt het volledige checkpoint gewist;
- de volgende render toont een leeg invoerveld;
- Runtime State en Journal bevatten alleen `Weet ik nog niet.`;
- de uitgeschreven woorden komen in geen enkele herstelbare laag voor.

**Bewezen primaire oorzaak:** de Experience-actie voor niet-weten laat een
destructieve tweede actie toe terwijl een lokaal concept bestaat. De
deelnemerswoorden worden niet bevestigd, niet verzonden en na de succesvolle
non-respons wel uit de enige lokale herstelcache verwijderd.

### Componentuitsluiting voor invoerverlies

| Component | Bevinding | Primair? |
| --- | --- | --- |
| Browser/input-event | Legt iedere wijziging als lokaal concept vast. | Nee |
| Lokale checkpoint-integratie | Vernietigt het herstelde concept bij de eerstvolgende render. | **Ja, conceptverlies** |
| API | Ontvangt geen onverzonden concept; bewaart het verzonden antwoord wel. | Nee |
| Runtime | Commit en revision zijn correct voor verzonden invoer. | Nee |
| Runtime State | Bevat de verzonden woorden exact. | Nee |
| Cognitive Journal | Bevat de verzonden transactie en woorden. | Nee |
| Constitutional Gate | Accepteert de geldige bijdrage; raakt browserconcepten niet. | Nee |
| Runtime Decision | Draagt `originQuote` correct over. | Nee |
| Experience-render | Sluit het nieuwste contact expliciet uit en toont `originQuote` niet. | **Ja, zichtbaar verdwijnen na submit** |

### Conclusie invoer

De praktijkbevinding is geen enkelvoudige Runtime-bug. Zij bestaat uit drie
Experience-integratiefouten:

1. een hersteld, onverzonden concept wordt door een metadata-save gewist;
2. een wel opgeslagen antwoord wordt in de volgende beurt expliciet verborgen.
3. de actie `Ik weet het nog niet` kan een reeds ingevuld concept stil vervangen
   en daarna verwijderen.

De kleinste geldige oplossing bevindt zich daarom uitsluitend in de lokale
checkpoint- en renderintegratie. Er is geen wijziging aan Runtime, API,
serveropslag of opslagmodel nodig.

## RCA 2 — cognitieve herhaling

### Directe processorreproductie

Uitgangssituatie: één concrete bijdrage vormt een actieve, plausibele hypothese.
Daarna wordt driemaal exact `Weet ik nog niet.` aangeboden.

Waargenomen na de drie beurten:

| Signaal | Beurt 1 | Beurt 2 | Beurt 3 |
| --- | --- | --- | --- |
| `lastChangeType` | `no-meaningful-change` | `no-meaningful-change` | `no-meaningful-change` |
| `consecutiveNoChange` | `1` | `2` | `3` |
| Gate | `no-change` | `no-change` | `no-change` |
| Decision movement | `concretize` | `concretize` | `concretize` |
| Hypothesis status | `active` | `active` | `active` |
| Confidence | `plausible` | `plausible` | `plausible` |
| Vraag | identiek | identiek | identiek |

Aanvullend werd de open onbekende waarop de eerste non-respons betrekking had
toch als `resolved` gemarkeerd. De bijdrage leverde dus geen grond op, maar de
processor behandelde de onderliggende vraag administratief als beantwoord.

### Browserreproductie

In een nieuwe Runtime 6.0-sessie werd eerst concrete grond opgebouwd. Na drie
keer `Ik weet het nog niet` toonde de browser driemaal dezelfde titel en vraag.
De servertoestand bevestigde tegelijk:

- revision `5`;
- `consecutiveNoChange: 3`;
- drie opeenvolgende Journal-records met `gateStatus: no-change`;
- actieve hypothese bleef `active` en `plausible`;
- geen tegenbewijs;
- decision movement bleef `concretize`.

De browserweergave is daarmee een getrouwe manifestatie van de reeds upstream
herhaalde Runtime Decision.

### Verklaring uit de implementatie

De processor berekent en bewaart `consecutiveNoChange`, maar leest die waarde
nergens terug. In `decisionFor` heeft `no-meaningful-change` een vaste vroege
branch die ongeacht geschiedenis altijd dezelfde `concretize`-beslissing en
vraag teruggeeft. Tegelijk wordt vóór die beoordeling de lopende onbekende als
opgelost gemarkeerd. De hypothese, aandacht en onderzoeksenergie veranderen
niet.

### Componentuitsluiting voor cognitieve herhaling

| Component | Bevinding | Primair? |
| --- | --- | --- |
| Cognitive Processor | Detecteert no-change, maar gebruikt de opeenvolging niet om aandacht of hypothese te wijzigen. | **Ja** |
| Runtime Decision-vorming | De no-changebranch produceert deterministisch steeds dezelfde beweging. Zij is onderdeel van de processoruitkomst. | **Ja, directe manifestatie** |
| Constitutional Gate | Labelt alle drie transacties correct als `no-change` en verzint geen inzicht. | Nee |
| Runtime State | Bewaart zowel teller als hypothese correct; juist deze toestand bewijst de ontbrekende verwerking. | Nee |
| Cognitive Journal | Registreert alle gebeurtenissen, revisies en Gate-uitkomsten correct. | Nee |
| Experience-integratie | Geeft de reeds identieke Runtime Decisions zonder inhoudelijke wijziging weer. | Nee |
| Browser/API | Browser en API veranderen de beslissing niet; directe processoruitvoering reproduceert hetzelfde gedrag. | Nee |

### Canonieke toets

De aangetroffen fout schendt bestaande, geratificeerde regels en vraagt geen
nieuw principe:

- CI 5, beweging 7: opnieuw beginnen is niet opnieuw hetzelfde doen;
- CI 14.5: na twee bewegingen zonder opbrengst niet automatisch doorvragen, maar
  anders kijken, een ander moment nemen of ruimte laten;
- CI 21.3 en 22: ieder antwoord moet Atlas kunnen veranderen en de volgende
  beweging moet het meeste betekenisvolle onderscheid kunnen maken;
- CE 7.19, 7.22 en 7.29: no-change simuleert geen inzicht; dalende opbrengst kan
  leiden tot parkering en aandachtsverschuiving;
- CE 11.3: niet-herhaling is een verplicht criterium voor een
  nieuwsgierigheidsrichting;
- CE 12.2–12.3: dalende opbrengst en ontbrekend nieuw onderscheid verplaatsen
  aandacht;
- CE 19.2: verbreden wanneer de huidige richting steeds hetzelfde oplevert;
- CE 20.3–20.4: dezelfde vraag is een metacognitief alarm dat gedrag moet
  veranderen;
- CE 24.8, proef D: no-change mag niet automatisch een nieuwe vraag produceren;
- RA 7 en RA-12: een no-changebeslissing mag een beweging dragen, maar alleen als
  expliciete, foundationgedragen uitkomst; andere woorden zonder interne reden
  zijn ongeldig.

### Conclusie cognitie

De primaire fout ligt in de Cognitive Processor en diens Runtime
Decision-vorming. Het model bevat al de noodzakelijke teller, levenscyclusstatus
`parked`, aandachtsbewegingen en Journal-infrastructuur. De kleinste oplossing is
de bestaande no-change-uitkomst historisch bewust maken:

1. een non-respons lost de lopende onbekende niet op;
2. de eerste non-respons bewaart onzekerheid zonder hetzelfde te vragen;
3. herhaalde opbrengstloosheid verplaatst aandacht en parkeert een niet-toetsbare
   richting, zonder afwezig bewijs als weerlegging te presenteren;
4. een nieuwe beslissing gebruikt uitsluitend bestaande, geratificeerde
   bewegingen en de actuele Cognitive Field-toestand.

## Wijzigingspoort

De oorzaken zijn reproduceerbaar, volgen direct uit de huidige implementatie,
verklaren Donovans praktijkbevindingen en blijven bestaan wanneer de uitgesloten
componenten afzonderlijk correct functioneren.

Daarom zijn uitsluitend deze correcties toegestaan:

1. conceptbehoud, bescherming tegen een conflicterende niet-wetenactie en
   zichtbaarheid van gecommitteerde woorden in de Experience-integratie;
2. no-changeverwerking en daarop gebaseerde Runtime Decision-vorming in de
   Cognitive Processor, identiek in TypeScript en de PHP-runtime-mirror;
3. gerichte regressietests voor beide bewezen ketens.

Niet toegestaan binnen deze kandidaat:

- nieuwe Foundation-regels;
- Runtime Architecture-wijzigingen;
- database- of serveropslagwijzigingen;
- algemene Experience-redesigns of copyrondes;
- productie-uitrol.

## Foundation Conflict Candidate

**Niet ontstaan.** De kleinste correcties voeren reeds geratificeerde regels uit;
zij voegen geen constitutioneel principe toe en wijzigen er geen.
