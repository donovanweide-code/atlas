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
