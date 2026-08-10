# Experience Conversation & Insight V1

Status: **GO — implementatie en lokale browseracceptatie geslaagd**  
Datum: 3 augustus 2026  
Versie: `3.0-conversation-insight-v1`

## Doel en grens

Deze versie verbetert uitsluitend het gesprek binnen de bestaande Experience.
Er is geen redesign, AI, chatbot, intakeformulier, websitewijziging, e-mailflow,
connector of Workspace-functionaliteit toegevoegd. De organische ingang,
persoonlijke uitnodigingen, centrale sessies, Observatory, privacygrens en
public-only build blijven de bestaande technische basis gebruiken.

## Inhoudelijke keuze

De vier losse reflectiemomenten zijn één herkenbare onderzoeksketen geworden:

```text
Gebeurtenis
    ↓
Mogelijke oorzaak
    ↓
Intern gevolg
    ↓
Externe impact
```

De ondernemer hoeft geen procesanalyse te kunnen maken. Iedere vraag bevat één
korte uitleg en één afzonderlijk geformuleerde geheugensteun. Voorbeelden zoals
e-mail, Excel, papier, meerdere systemen, wachten, overdrachten, collega’s,
klanten en leveranciers helpen iemand herinneren; de tekst zegt nergens dat één
van die voorbeelden het juiste antwoord is.

## Aangepaste vragen en teksten

### 1. Gebeurtenis

**Vraag:** “Welke werksituatie van vandaag bleef bij je hangen?”  
**Hulp:** beschrijf alleen wat er gebeurde; het belang hoeft nog niet duidelijk
te zijn.  
**Geheugensteun:** overdracht, planning, klantvraag, e-mail, Excel, papier of
informatie zoeken in meerdere systemen.

### 2. Mogelijke oorzaak

**Vraag:** “Wat maakte dat deze situatie zo verliep?”  
**Hulp:** een vermoeden is genoeg; dit is nog geen conclusie.  
**Geheugensteun:** wachten, onduidelijke afspraken, informatie op meerdere
plekken, een overdracht, leverancier of afhankelijkheid van een collega.

### 3. Intern gevolg

**Vraag:** “Wie binnen je organisatie merkte hier iets van, en waaraan?”  
**Hulp:** dat kan de deelnemer, een collega, team of andere afdeling zijn.  
**Geheugensteun:** opnieuw werk doen, wachten, afstemmen, een planning aanpassen
of informatie opnieuw zoeken.

### 4. Externe impact

**Vraag:** “Wie buiten je organisatie kon hier iets van merken, en wat dan?”  
**Hulp:** een klant, leverancier of partner; “niemand” is ook een geldig
antwoord.  
**Geheugensteun:** langer wachten, informatie opnieuw geven, onduidelijkheid of
later antwoord krijgen.

De luistermomenten benoemen steeds waarom de volgende vraag volgt. Daardoor
voelt de overgang niet als een formulierstap, maar als een gesprek dat de keten
rustig verder onderzoekt.

## Eerste inzicht zonder AI

Het eerste inzicht is volledig deterministisch en gebruikt alleen de vaste
positie en letterlijke inhoud van eerdere antwoorden. Er is geen classificatie,
taalmodel, externe API of verborgen conclusie.

Een inzicht verschijnt alleen wanneer minimaal aanwezig zijn:

- een concreet antwoord op de gebeurtenis;
- een concreet antwoord op wat mogelijk meespeelde;
- een concreet intern gevolg of een concrete externe impact.

“Weet ik nog niet”, “geen idee”, onbekend en zeer korte antwoorden gelden niet
als voldoende bewijs. Bij voldoende bewijs luidt het voorzichtige eerste spoor:

> Eén werksituatie lijkt verder door te werken dan het eerste moment.

De uitleg zegt expliciet dat dit nog geen conclusie is. De deelnemer kan de
letterlijke uitspraken openen die aanleiding gaven en antwoordt daarna op:

> Herken je dit?

met `Ja`, `Gedeeltelijk` of `Nog niet`.

Bij onvoldoende bewijs verschijnt juist:

> We zien nog niet genoeg voor een eerlijk eerste inzicht.

De Experience legt uit waarom en zegt: “Daarom vullen we niets voor je in.”

## Vrijwillige verdieping

Na herkenning bepaalt de deelnemer zelf of en hoe het gesprek verdergaat:

- Waarom viel dit op?
- Welke uitspraken brachten jullie hierbij?
- Wat kan dit betekenen voor klanten of leveranciers?
- Wat kan dit betekenen voor collega’s?
- Waar zou dit kunnen beginnen?
- Ik wil een ander onderwerp onderzoeken.
- Voor vandaag is dit genoeg.

Iedere vervolgvraag toont eerst de eerdere uitspraak waaruit zij voortkomt. De
klant-/leveranciersvraag komt uit de externe impact, de collega-vraag uit het
interne gevolg en de beginvraag uit de mogelijke oorzaak. De deelnemer kan
meerdere onderwerpen bekijken en bepaalt zelf wanneer het gesprek stopt.

Herkenning, bekeken verdieping en vrijwillig geschreven vervolgwoorden worden
centraal per sessie opgeslagen. Het Observatory toont ze afzonderlijk van de
oorspronkelijke antwoorden en van WBD’s interne observaties.

## Hoe We Build And Design zichtbaar blijft

Na het inzicht staat de werkwijze expliciet maar rustig verwoord:

> We proberen eerst de organisatie en de keten eromheen te begrijpen. Pas
> daarna onderzoeken we welke digitale oplossing werkelijk past.

In de verdieping en afsluiting worden mogelijke oplossingen concreet gehouden:

- website;
- webshop;
- procesverbetering;
- intern systeem;
- maatwerksoftware.

De afsluiting nodigt alleen rustig uit tot contact:

> Heeft deze Experience je aan het denken gezet? Neem gerust contact op. Dan
> kijken we samen naar een oplossing waar je morgen iets aan hebt.

Er is geen verkoopclaim, afspraakdruk of automatische opvolging toegevoegd.

## Language Review

Alle nieuwe teksten zijn getoetst op direct begrip door een ondernemer:

- “mogelijke oorzaak” blijft een vermoeden, geen diagnose;
- “impact” wordt steeds vertaald naar wie iets merkt en waaraan;
- “eerste spoor” vervangt termen als analyse of AI-inzicht;
- “deze vraag komt hier vandaan” maakt een vervolgvraag uitlegbaar;
- “jij bepaalt de diepte” en “voor vandaag is dit genoeg” bewaken autonomie;
- technische woorden zoals sessie, repository, model en classificatie zijn niet
  zichtbaar in het gesprek;
- de WBD-uitleg gebruikt herkenbare oplossingen en houdt websites nadrukkelijk
  in beeld.

## Business Reality Review

**Beoordeling: GO.**

Na de Experience kan een ondernemer in gewone woorden uitleggen:

> We Build And Design probeert eerst te begrijpen wat er in een organisatie
> gebeurt, waardoor dat komt en wie de gevolgen merkt. Daarna ontwerpen en
> bouwen zij de digitale oplossing die het beste past. Dat kan een website,
> webshop, procesverbetering, intern systeem of maatwerksoftware zijn.

Die uitleg staat niet alleen in de afsluiting; de deelnemer heeft de werkwijze
eerst zelf doorlopen.

## Kleine visuele verbeteringen

Zonder de art direction te veranderen zijn alleen deze details toegevoegd:

- zichtbare focus op inzichtkeuzes en verdiepingsonderwerpen;
- minimaal 44-pixelachtige tikgebieden op mobiele keuzes;
- rustige overgang van 260 ms met volledige reduced-motion fallback;
- afzonderlijke leesvlakken voor inzicht, bewijs en herleidbare vervolgvraag;
- éénkoloms verdieping en herkenningskeuzes op mobiel;
- sterkere focusweergave voor het actieve verdiepingsveld.

## Centrale opslag

`experience_sessions` bevat nu de herkenningskeuze en het actieve
verdiepingsonderwerp. `experience_reflections` bewaart per sessie en onderwerp
de vrijwillige vervolgwoorden. De unieke sleutel `(session_id, topic)` voorkomt
dubbele reflecties; foreign keys met cascade houden verwijdering binnen de
bestaande privacygrens.

Migratie: `experience-server/private/migrations/003-conversation-insight.sql`.

Nieuwe betekenisvolle gebeurtenissen:

- `insight_recognized`;
- `insight_explored`;
- `insight_reflection_saved`;
- `insight_exploration_finished`.

Er is geen klik-, muis-, toetsenbord- of marketingtracking toegevoegd.

## Browseracceptatie

De volledige flow is met de echte lokale API en centrale opslag doorlopen.

### Bewijsrijke flow

- mobiele organische deelnemer met naam, functie en bedrijf aangemaakt;
- vier vragen ingevuld over een klantorder, verspreide informatie, intern gevolg
  en externe klantimpact;
- alle luistermomenten en herleidbare overgangen gecontroleerd;
- samenvatting bevatte de vier letterlijke antwoorden in de juiste keten;
- eerste inzicht verscheen met voorzichtige taal en bewijsuitspraken;
- `Gedeeltelijk` gekozen;
- collega-verdieping toonde exact het eerdere interne antwoord als herkomst;
- een vrijwillige reflectie opgeslagen;
- daarna ook “Waarom viel dit op?” bekeken;
- deelnemer stopte zelf en zag de volledige WBD-uitleg plus rustige contactlink;
- hervatten na refresh werkte;
- geen consolewaarschuwingen of fouten.

### Bewijsarme flow

- tweede, geïsoleerde deelnemer antwoordde viermaal “Weet ik nog niet”;
- na samenvatting verscheen geen inzicht;
- de Experience meldde expliciet dat er onvoldoende bewijs was en vulde niets
  in;
- refresh en mobiel hervatten kwamen terug op dezelfde bewijsarme staat;
- mobiele viewport `390 × 844`, geen horizontale overflow;
- terugkeerkeuzes en privacylink hadden tikgebieden van 42–44 px;
- geen consolewaarschuwingen of fouten.

### Observatory

Het Observatory toonde voor de bewijsrijke deelnemer:

- versie `3.0-conversation-insight-v1`;
- vier afzonderlijke antwoorden;
- het teruggegeven inzicht;
- herkenning `Gedeeltelijk`;
- opgeslagen collega-reflectie;
- bekeken “Waarom”-verdieping;
- afzonderlijke betekenisvolle tijdlijngebeurtenissen.

Tijdens deze controle werd één renderfout gevonden: nieuwe inzichtgebeurtenissen
liepen nog door de oude vraaglabelresolver. De eventlabels zijn naar een
typegerichte afhandeling omgezet en daarna opnieuw in het Observatory
geaccepteerd.

## Tests en builds

- `npm test`: **154/154 geslaagd**.
- TypeScript: **geslaagd**.
- `npm run build:experience`: **geslaagd**.
- `npm run build`: **geslaagd**; public-only grens intact.

## Bewust doorgeschoven naar Experience Polish

Niet in deze inhoudelijke werkstroom opgenomen:

- varianten of A/B-tests van vraagteksten;
- uitgebreidere animatiechoreografie;
- typografische of kleurtechnische redesignbesluiten;
- nieuwe illustraties, iconen of schermcomposities;
- gepersonaliseerde aanbevelingen of AI-interpretatie;
- contactformulier, afspraakplanner of marketingopvolging;
- cross-device accounts of nieuwe uitnodigingslogica;
- publieke website-integratie.

Deze punten vragen afzonderlijke validatie. Conversation & Insight V1 bewijst
eerst dat de inhoudelijke lijn logisch, eerlijk en herkenbaar is.

## Productiegrens

Deze opdracht heeft de Atlas-repository en het afzonderlijke Experience-
buildartefact bijgewerkt. De live productie-DocumentRoot en centrale
productiedatabase zijn niet gewijzigd, omdat deze opdracht geen
productieactivatie autoriseert. Een latere activatie moet migratie 003, een
voorafgaande databaseback-up, versioned DocumentRoot, browseracceptatie en
rollback als afzonderlijke gecontroleerde stap uitvoeren.
