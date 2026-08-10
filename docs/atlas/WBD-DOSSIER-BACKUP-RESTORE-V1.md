# WBD Dossier Backup & Restore v1

## Doel en grens

Deze veiligheidslaag maakt één volledige lokale kopie van de interne We Build And Design-organisatiedossiers. De back-up bevat organisaties, documentmetadata, daadwerkelijke documentbytes, contactnotities, tijdlijngebeurtenissen, exportdatum, formaatversie en technische broninformatie.

Dit is geen synchronisatie, cloudback-up of centrale opslag. Atlas Workspace, Sportpaleis-functionaliteit en de publieke website vallen buiten deze implementatie.

## Back-upstructuur

V1 gebruikt één bestand met de extensie `.wbd-backup.json`. De JSON-structuur is:

```text
wbd-workspace-backup
├── manifest
├── organizations[]
├── documents[]
├── contactNotes[]
├── timelineEvents[]
└── files[]
```

`documents[]` bevat alle documentmetadata plus een stabiel `filePath` en een SHA-256-hash. `files[]` bevat per document-id het logische bestandspad, oorspronkelijke naam, MIME-type, grootte, SHA-256-hash en de daadwerkelijke bytes als Base64. De bestandsbytes zijn daardoor onderdeel van hetzelfde downloadbare bestand; dit is geen metadata-only export.

Het manifest bevat:

- `backupFormat`: `wbd-workspace-backup`;
- `schemaVersion`: `1`;
- ISO-exportdatum en -tijd;
- applicatie `We Build And Design Workspace`;
- bron `lokale IndexedDB-opslag`;
- volledigheidsstatus `complete`;
- aantallen organisaties, documenten, contactnotities, tijdlijngebeurtenissen en daadwerkelijke bestanden.

## Waarom JSON en geen ZIP-dependency

Het webplatform biedt geen browser-native ZIP-writer. Voor deze kleine lokale proef is een transparant, versieerbaar JSON-bestand met Base64-bestanden gekozen. Daardoor zijn geen externe dependency, licentie-uitbreiding of nieuwe bundelcomponent nodig en kan dezelfde validatielogica bij export én import worden getest.

Er is bewust geen eigen ZIP-implementatie gebouwd. De keerzijde is ongeveer 33% Base64-overhead en verwerking van het volledige bestand in browsergeheugen. Daarom blijft dit een oplossing voor kleine lokale dossiers.

## Exportproces

1. De repository leest de vier dossierstores uit IndexedDB.
2. Voor ieder document wordt gecontroleerd dat een `Blob` aanwezig is.
3. Blobgrootte en MIME-metadata worden vergeleken.
4. De bestandbytes krijgen een SHA-256-hash.
5. Manifest, datasets en bestanden worden samengebouwd.
6. De volledige gemaakte back-up wordt nogmaals met dezelfde importvalidator gecontroleerd.
7. Alleen na een foutloze controle verschijnt de downloadlink.

Bij een ontbrekend of inconsistent bestand wordt geen ogenschijnlijk volledige back-up gemaakt. V1 biedt bewust geen gedeeltelijke export.

## Importproces

Na selectie van een bestand controleert Atlas vóór iedere opslagwijziging:

- back-upformaat en ondersteunde schemaversie;
- verplichte datasets en manifestvelden;
- manifest-aantallen;
- unieke stabiele identifiers;
- koppelingen met bestaande organisatie-id's;
- één aanwezig bestand per documentrecord;
- overeenkomende naam, MIME-type, grootte en document-id;
- geldige Base64-bytes en SHA-256-hash;
- afwezigheid van ongekoppelde extra bestanden.

Alleen een volledig geldige back-up krijgt een menselijke samenvatting en de acties Samenvoegen, Lokale gegevens vervangen en Annuleren.

## Samenvoegen versus vervangen

### Samenvoegen

- Ontbrekende records worden op hun stabiele id toegevoegd.
- Identieke bestaande records worden overgeslagen.
- Een bestaande id met andere inhoud wordt als conflict gerapporteerd en niet overschreven.
- Documentbytes worden naast metadata byte voor byte vergeleken.
- Toegevoegd, overgeslagen en conflicterend worden per soort en als totaal geregistreerd.

### Lokale gegevens vervangen

- Vereist een tweede expliciete bevestiging.
- Validatie is volledig afgerond voordat IndexedDB wordt gewijzigd.
- Leegmaken en terugschrijven gebeurt in één `readwrite`-transactie.
- Een fout breekt de transactie af; IndexedDB behoudt dan de bestaande lokale gegevens.

## Restore-historie en migratie

IndexedDB-database `atlas-wbd-dossier-v1` is veilig verhoogd van versie 1 naar versie 2. De bestaande vier stores blijven ongewijzigd. Alleen de nieuwe store `restoreHistory` wordt tijdens `upgradeneeded` toegevoegd.

Na een succesvolle restore schrijft dezelfde transactie één algemene historie-entry met restoredatum, back-upexportdatum, importmodus, aantallen en bron `lokale back-up`. De gebeurtenis wordt niet in ieder organisatiedossier gedupliceerd. Bij Vervangen wordt de algemene lokale historie eveneens vervangen en wordt daarna de actuele restore-entry toegevoegd.

## Foutafhandeling

- Ongeldige JSON, onbekende schema's, ontbrekende datasets, beschadigde bytes en ontbrekende bestanden worden vóór restore geweigerd.
- Een mislukte validatie roept de repository niet aan.
- Een mislukte IndexedDB-restore rolt als één transactie terug.
- De interface meldt expliciet dat bestaande lokale gegevens behouden zijn.
- Export weigert elk document waarvan de Blob ontbreekt of niet bij de metadata past.

## Bekende beperkingen

- Het back-upbestand is niet aanvullend versleuteld. Wie het bestand kan lezen, kan de dossierinhoud en documenten lezen.
- Er is geen wachtwoord, cloudopslag, automatische planning, retentiebeleid of herstel uit meerdere versies.
- JSON/Base64 gebruikt meer schijfruimte en browsergeheugen dan een gecomprimeerd archief.
- De praktische maximumgrootte wordt bepaald door beschikbaar browsergeheugen en downloadcapaciteit.
- Back-ups uit een toekomstige onbekende schemaversie worden veilig geweigerd totdat een expliciete migratie bestaat.

## Overgang naar centrale opslag

De UI werkt via `WbdDossierRepository`; back-upgeneratie en -validatie staan daar los van. Een latere centrale backend kan dezelfde dossierdata leveren en server-side object storage gebruiken. Dan wordt deze lokale handmatige kopie vervangen door geauthenticeerde centrale opslag, versiebeheer en gecontroleerde serverback-ups. Automatische synchronisatie of cloudback-up is in v1 niet aanwezig.
