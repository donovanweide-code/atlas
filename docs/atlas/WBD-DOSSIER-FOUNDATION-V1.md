# WBD Dossier Foundation v1

## Doel en grens

Deze kleine dossierproef hoort uitsluitend bij de interne We Build And Design Workspace. De route `/workspace/wbd/organisaties` toont vier lokale organisaties. Ieder dossier op `/workspace/wbd/organisaties/:organizationId` bundelt het organisatieoverzicht, documenten, handmatige contactnotities en één chronologische tijdlijn.

De bestaande Atlas Workspace, de Sportpaleis-functionaliteit en de publieke website zijn niet onderdeel van deze implementatie. De interne WBD-code blijft via `internal-main.ts` alleen aan lokale interne ontwikkelroutes gekoppeld en komt niet in de publieke productie-entrypoint terecht.

## Datamodel

- `organizations`: unieke id, naam, type, omschrijving, aanmaakdatum en datum laatst gewijzigd.
- `documents`: unieke id, organisatie-id, titel, optionele omschrijving, documenttype, datum toegevoegd, oorspronkelijke bestandsnaam, bestandsgrootte, MIME-type en het lokale `Blob`-bestand.
- `contactNotes`: unieke id, organisatie-id, type, titel, inhoud, datum/tijd, optionele vrije-tekstcontactpersoon en datum aangemaakt.
- `timelineEvents`: unieke id, organisatie-id, gebeurtenistype, datum/tijd, korte beschrijving, bron `handmatig` en waar relevant een document- of contactnotitie-id.

Documenten en contactnotities schrijven elk een aparte tijdlijngebeurtenis. Bij verwijderen verdwijnt het document pas na expliciete bevestiging; de gebeurtenis `document_removed` blijft bestaan. Tijdlijngebeurtenissen worden nieuwste bovenaan gesorteerd.

## Lokale opslagmethode

V1 gebruikt één browser-native IndexedDB-database: `atlas-wbd-dossier-v1`. De vier object stores heten `organizations`, `documents`, `contactNotes` en `timelineEvents`. Bij het eerste gebruik worden We Build And Design, Sportpaleis, Bij Cees en AquaFlask als lokale startgegevens toegevoegd. Bestanden worden als `Blob` opgeslagen en bij het tonen van een dossier via een tijdelijke object-URL geopend of gedownload.

Deze keuze heeft geen backend, externe database of nieuwe dependency nodig en kan zowel metadata als een echt geselecteerd bestand na een paginaverversing bewaren.

## Exacte beperkingen

- De gegevens bestaan alleen in de IndexedDB-opslag van de gebruikte browser en het gebruikte lokale origin (bijvoorbeeld `http://127.0.0.1:5173`).
- Een andere browser, ander profiel, ander apparaat, andere poort of ander protocol ziet deze gegevens niet.
- Browsergegevens wissen of de siteopslag verwijderen wist ook alle dossiers en bestanden. Er is geen back-up, export of herstelmogelijkheid.
- Beschikbare opslagruimte en eventuele verwijdering onder opslagdruk worden door de browser bepaald. Deze proef is daarom niet bedoeld voor grote of bedrijfskritische documenten.
- Er is geen synchronisatie, gelijktijdige bewerking, versiebeheer, malwarecontrole, toegangscontrole of versleuteling bovenop wat browser en apparaat al bieden.

## Later aansluiten van een echte backend

De interface gebruikt `WbdDossierRepository`. Een latere backend kan dezelfde methoden implementeren voor organisaties ophalen, één dossier ophalen, documenten toevoegen/verwijderen en contactnotities toevoegen. De UI hoeft dan niet opnieuw te worden ontworpen; alleen de repository-implementatie en de bestands-URL-afhandeling worden vervangen door API- en object-storagecalls. Servertransacties moeten documentmetadata, bestand en tijdlijngebeurtenis atomair behandelen.

## Bewust buiten scope

Niet gebouwd: Communication Connector, inbox, IMAP/SMTP, agenda, AI, automatische classificatie, projecten, orders, Sportpaleis-bedrukkingsworkflow, cloudsync, accounts, rechten, multi-tenancy, globale zoekfunctie, domeinherkenning en een brede Workspace-redesignronde.
