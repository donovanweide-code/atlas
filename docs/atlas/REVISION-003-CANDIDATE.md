# Revision 003 — Workspace-oriëntatie

## Werkstatus

Candidate — geen GO, geen releasevoorbereiding en geen livegang.

## Doel

De Workspace geeft binnen de eerste laag antwoord op:

1. Waar staan we?
2. Waarom staan we hier?
3. Wat vraagt vandaag aandacht?

De ondernemer hoeft de betekenis niet meer uit losse Workspace-onderdelen te reconstrueren.

## Belangrijkste wijzigingen

- `Vandaag in Atlas` benoemt We Build And Design als hoofdcase en maakt zichtbaar dat het actuele beeld opnieuw bevestigd moet worden.
- `Waarom staan we hier?` toont drie bestaande, betekenisvolle gebeurtenissen met datum, herkomst en betekenis.
- `Vandaag aandacht` verbindt de bestaande dagfocus met één eerstvolgende betekenisvolle stap.
- `Actieve case` toont alleen de aantoonbaar actieve hoofdcase, inclusief menselijke status, laatste betekenisvolle gebeurtenis, volgende stap en de ontbrekende bevestigingsdatum.
- AquaFlask staat rustig als wachtend vermeld: een concrete herhaling is nodig voordat wijzigingen opnieuw aandacht verdienen.
- De bestaande Workspace-onderdelen blijven als verdieping behouden.

## Bewust niet gewijzigd

- Geen volledige redesign.
- Geen nieuwe case, opslaglaag, database of synchronisatie.
- Geen fictieve status voor Bij Cees; deze case komt niet voor in de beschikbare repositorybronnen.
- Geen automatische conclusie uit lokale browserdata.
- Geen uitbreiding van Business Profile, Understanding of AquaFlask.
- Geen release- of publicatiewerk.

## Bron- en betrouwbaarheidsgrens

De redactionele bovenlaag gebruikt uitsluitend de beschikbare casebestanden, het Atlas Logboek en sprintdocumentatie. De repository bevat geen recente menselijke bevestigingsdatum voor het actuele beeld van We Build And Design. Atlas toont dat ontbreken expliciet in plaats van een datum of status te bedenken.

Lokale dagfocus kan de getoonde eerstvolgende stap verfijnen. Deze data blijft volgens D-003 aan één browser gekoppeld en is geen gedeelde waarheid.

## Verificatie

- Alle 12 bestaande tests slagen.
- TypeScript- en Vite-productiebuild slagen.
- `git diff --check` slaagt.
- Browsercontrole is niet afgerond: de ingebouwde browser blokkeerde de lokale candidate vanuit een beveiligde localhost-foutstatus.

## Specifieke reviewpunten

Toets de candidate als ondernemer:

1. Begrijp ik binnen tien seconden waar Atlas nu staat?
2. Zie ik direct waarom Atlas dat concludeert?
3. Weet ik wat vandaag aandacht vraagt?
4. Mis ik Bij Cees terecht omdat Atlas daarvoor geen bron heeft, of ontbreekt er repositorykennis?
5. Voelt de getoonde geschiedenis als een betekenisvolle hoofdlijn?
6. Begrijpt een ondernemer zonder Atlas-kennis dit ook?

## Centrale toets

Heeft Atlas al nagedacht voordat de ondernemer hoeft na te denken?
