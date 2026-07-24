# Sprint 002 — Eerste Business Profile-slice

## Werkstatus

⏸️ Geparkeerd — operationele browservalidatie ontbreekt; geen GO.

## Verantwoordelijkheid

Business Profile.

## Doel

Atlas kan voor één bestaande case het minimale bedrijfsbegrip handmatig en herleidbaar vastleggen dat nodig is om latere technische signalen binnen de werkelijkheid van de onderneming te begrijpen.

## Actieve case

Case 0002 — AquaFlask.

## Scope

Het Business Profile bevat uitsluitend:

- bedrijfscontext;
- doelgroep;
- ambitie;
- belangrijkste bedrijfsproces;
- huidige digitale werkelijkheid;
- bron van deze kennis;
- onzekerheden;
- datum van bevestiging.

De inhoud wordt door een mens ingevoerd en bevestigd. Atlas genereert of completeert geen klantkennis. Een bewuste keuze voor **Nog onbekend** wordt als zodanig bewaard; Atlas dwingt geen verzonnen antwoord af.

## Zichtbare uitkomst

Binnen het bestaande AquaFlask-profiel kan Donovan:

1. zien dat bedrijfsbegrip nog niet bevestigd is;
2. in een begeleide route één betekenisvolle vraag tegelijk beantwoorden;
3. per inhoudelijke vraag bewust aangeven dat kennis nog onbekend is;
4. het volledige beeld samen bekijken voordat het wordt bevestigd;
5. het bevestigde bedrijfsbegrip als rustig leesbaar geheel terugzien;
6. beschadigde of onvolledige lokale data veilig laten afwijzen.

## Bewust niet gebouwd

- Geen Business Profile voor een tweede case.
- Geen extra profielvelden.
- Geen CRM-, marketing-, sales- of klantkaartmodel.
- Geen Technical Profile.
- Geen Presence, snapshots of Monitoring.
- Geen Intelligence, Compass- of World-uitbreiding.
- Geen automatische inhoud, analyse of aanbeveling.
- Geen database, synchronisatie, account of nieuwe infrastructuur.
- Geen koppeling of automatische migratie naar Understanding.

## UX-herziening na validatie

De eerste invoeropzet toonde acht verplichte velden tegelijk en voelde daardoor als administratie. De gebruikerservaring is binnen dezelfde scope herzien:

- Atlas stelt één betekenisvolle vraag tegelijk.
- Iedere vraag legt uit waarom de informatie nodig is.
- Donovan kan per inhoudelijke vraag bewust **Nog onbekend** kiezen.
- Atlas toont het complete begrip eerst als leesbaar geheel voordat het wordt bevestigd.
- Na bevestiging blijft de leesweergave belangrijker dan de invoer.

Datamodel, acht inhoudsvelden, validatie en lokale opslag zijn niet gewijzigd. De herziening voegt geen nieuwe Atlas-verantwoordelijkheid toe.

## Opslag en grens

Het profiel gebruikt, in lijn met D-003, een eigen versiegebonden `localStorage`-sleutel voor AquaFlask. De opgeslagen profielwaarde bevat exact de acht inhoudsvelden. Lege, onvolledige, te lange of structureel afwijkende waarden gelden niet als bevestigd bedrijfsbegrip en worden niet opgeslagen.

De opslag blijft apparaatgebonden en heeft geen back-up. Gebruik geen vertrouwelijke gegevens.

## Acceptatiecriteria

- Het model accepteert uitsluitend de acht afgesproken gegevens.
- Alle acht gegevens zijn nodig voordat het profiel als bevestigd wordt opgeslagen.
- Bron, onzekerheden en bevestigingsdatum blijven zichtbaar naast de bedrijfscontext.
- Een leeg profiel wordt niet door bestaande technische kennis of aannames aangevuld.
- De bestaande AquaFlask-case, Understanding, Workspace en publieke Experience blijven functioneel ongewijzigd buiten deze slice.
- Gerichte domeintests en de productiebuild slagen.
- De zichtbare ervaring is bruikbaar op desktop en mobiel.

## Verificatiestatus

- `npm install`: geslaagd op de hoofd-pc.
- Volledige `npm test`: geslaagd; alle 12 tests slagen, inclusief vier Business Profile-tests.
- TypeScript- en Vite-productiebuild via `npm run build`: geslaagd.
- Visuele desktopcontrole: nog te controleren.
- Visuele mobiele controle: nog te controleren.
- `git diff --check`, veldtelling en CSS-structuurcontrole: geslaagd.
- Repositorystatus: gecontroleerd; de Business Profile-slice staat lokaal en is niet gecommit.

De lokale productiebuild was beschikbaar voor browservalidatie, maar de ingebouwde browser kon vanuit zijn beveiligde foutpagina niet terug naar localhost navigeren. Deze blokkade is niet omzeild. Zolang de desktop- en mobiele browserroutes niet werkelijk zijn doorlopen, blijft Sprint 002 ⏸️ Geparkeerd.
