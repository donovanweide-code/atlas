# Living Experience Flow Recomposition V1

**Status:** lokale candidate — GO voor inhoudelijke review  
**Experience-versie:** `5.0-flow-recomposition-v1`  
**Productiestatus:** niet gepubliceerd; productie blijft ongewijzigd op 4.0  
**Datum:** 3 augustus 2026

## Uitkomst

De Experience is gerecomposeerd van een opeenvolging van ontvangst-, uitleg- en
samenvattingsschermen naar één sneller onderzoeksgesprek. Een nieuwe deelnemer
krijgt na het eerste antwoord direct een inhoudelijk gekozen vervolgvraag. Na
het tweede antwoord legt Atlas twee mogelijke verklaringen voor. De deelnemer
kan die herkennen, nuanceren of corrigeren en opent daarna alleen vrijwillig
nieuwe onderzoekssporen.

De implementatie gebruikt geen AI, externe dienst, nieuwe dependency of nieuwe
databasekolom. De keuze van een vervolgvraag en mogelijke observatie is een
transparante, deterministische selectie op basis van woorden die de deelnemer
zelf gebruikte.

## Leidende acceptatieprincipes

1. **Nieuwsgierigheid boven voltooiing.** Na een kleine observatie verschijnt
   geen verplichte volgende stap, maar een compacte keuze uit relevante
   richtingen.
2. **Atlas eerder zichtbaar.** `Atlas vraagt door` verschijnt na het eerste
   antwoord; `Atlas denkt mee` na het tweede.
3. **Iedere stap voegt iets toe.** Het vorige antwoord wordt niet direct
   geciteerd. Bronwoorden staan alleen onder de optionele uitleg
   `Waarom Atlas dit opviel`.
4. **Tempo.** De aparte luister- en samenvattingsschermen zijn voor 5.0 uit het
   primaire pad verwijderd.
5. **Vrijwillige lengte.** Na de eerste verdieping ontvouwen aanvullende
   sporen voor klant, collega, informatie, beginpunt en alternatieve verklaring.
6. **Geen zwaar scherm.** Vragen zijn één zin; uitleg is maximaal enkele korte
   regels. Een bewaard antwoord verdwijnt achter `Mijn antwoord aanpassen`.
7. **Waarde binnen minuten.** Na twee antwoorden verschijnt een voorzichtige
   tweerichtingsobservatie, zonder conclusie of diagnose.
8. **Gesprek beschermen.** Browser-terug opent tijdens een actief 5.0-gesprek
   eerst een rustige vertrekkeuze. Ingestuurde antwoorden en lokale concepten
   blijven bewaard.

## Nieuwe gespreksritmiek

```text
concreet moment
→ door Atlas gekozen vervolgvraag
→ mogelijke Atlas-observatie met twee verklaringen
→ herkennen / nuanceren / corrigeren
→ vrijwillig onderzoeksspoor
→ nieuw klein onderscheid
→ opnieuw zelf kiezen
→ vrijwillig stoppen of één gedachte bewaren
```

Voorbeelden van deterministisch gekozen vervolgvragen:

- informatie of systemen: waar stond de benodigde informatie;
- overdracht of wachten: wie moest wachten, opnieuw beginnen of uitleggen;
- klant of leverancier: wat merkte diegene als eerste;
- planning: wat gebeurde vlak voordat de planning verschoof;
- zonder duidelijk signaal: wat gebeurde direct vóór het moment.

Atlas formuleert observaties altijd als `Zou het kunnen…?`, biedt een tweede
verklaring en laat de deelnemer bepalen wat dichtbij komt.

## Compatibiliteit en opslag

- Nieuwe sessies gebruiken `5.0-flow-recomposition-v1`.
- Bestaande `4.0-living-research-loop-v1`-sessies behouden hun twee-stapsflow.
- Bestaande `3.0-conversation-insight-v1`-sessies behouden hun vier momenten.
- De bestaande antwoorden, herkenning, reflections, gebeurtenissen en centrale
  sessieopslag blijven leidend.
- Er is geen migratie uitgevoerd.
- Het Observatory herkent en toont 5.0, inclusief antwoorden, herkenning,
  vrijwillige verdiepingen en feedback.

## Browseracceptatie

Uitgevoerd tegen de lokale productiebuild op `127.0.0.1`; geen productiehost is
benaderd of gewijzigd.

Doorlopen en bevestigd:

- nieuwe organische deelnemer aangemaakt;
- eerste moment over verspreide offerte-informatie ingevoerd;
- Atlas koos direct de informatievraag;
- browser-terug op de tweede vraag behield het gesprek en toonde een expliciete
  keuze om te blijven of te vertrekken;
- tweede antwoord leidde direct tot een voorzichtige observatie met twee
  mogelijke verklaringen;
- herkenning gekozen;
- informatiespoor en klantspoor vrijwillig onderzocht;
- ieder bewaard spoor gaf een nieuw klein onderscheid en opende aanvullende
  richtingen;
- refresh uitgevoerd en dezelfde centrale sessie hervat;
- feedback ingediend en in het Observatory teruggelezen;
- deelnemer stopte zelf; het 5.0-stopmoment bleef kort en terugkeergericht;
- Observatory toonde versie 5.0, de volledige tijdlijn en beide reflections;
- geen browserconsolewaarschuwingen of -fouten in Experience en Observatory.

Mobiele controle op `390 × 844`:

- geen horizontale overflow (`scrollWidth === clientWidth`);
- alle zichtbare acties minimaal 44 px hoog;
- actieve textarea bleef binnen de viewport;
- koppen, vragen, observatie en directionele acties bleven leesbaar;
- mobiele viewport-screenshot gebruikt omdat de full-page stitching van de
  testbrowser zelf een foutieve rechtercrop gaf terwijl DOM-maten en de gewone
  viewport-screenshot correct waren.

## Technische verificatie

- TypeScript: geslaagd (`tsc --noEmit`).
- Tests: **165/165 geslaagd**.
- Experience-build: geslaagd.
  - `experience-bph5R6h4.js`
  - `experience-DNJAGAEK.css`
- Publieke build: geslaagd en public-only verificatie geslaagd.
- Publieke website, Atlas Workspace en Sportpaleis-functionaliteit zijn niet
  gewijzigd door deze werkstroom.

## Bewijs

- `output/living-experience-flow-recomposition-v1/desktop-first-question.png`
- `output/living-experience-flow-recomposition-v1/desktop-atlas-observation.png`
- `output/living-experience-flow-recomposition-v1/mobile-atlas-observation.png`
- `output/living-experience-flow-recomposition-v1/mobile-depth-viewport.png`
- `output/living-experience-flow-recomposition-v1/mobile-stop.png`
- `output/living-experience-flow-recomposition-v1/browser-state.json`

## Bewuste grens

De candidate bewijst een langere vrijwillige Experience binnen de bestaande zes
opslagonderwerpen. Een onderwerp kan opnieuw worden aangescherpt, maar krijgt in
de huidige opslag één actuele response. Een werkelijk onbeperkte terugkerende
onderzoekslus binnen hetzelfde onderwerp vraagt later een apart ontworpen
conversation-turnmodel. Dat is niet stilzwijgend toegevoegd en vormt geen reden
om deze lokale Flow Recomposition-candidate te publiceren.

## Eindoordeel

De lokale candidate voldoet functioneel aan de acht leidende principes en is
gereed voor een echte inhoudelijke praktijkreview door Donovan. De succesmaat
blijft menselijk: wil de deelnemer uit zichzelf nog één vraag beantwoorden en
kan diegene binnen enkele minuten zeggen: *hier had ik nog niet zo naar
gekeken?* Productieactivatie volgt alleen na een afzonderlijke expliciete GO.
