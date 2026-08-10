# WBD Mail Foundation 003 — Controlled SMTP Activation

Datum: 8 augustus 2026  
Build/release: `MAIL-FOUNDATION-003-20260808`  
Scope: We Build And Design; Sportpaleis blijft capture-only  
Actuele grens: adapter, routing en safety gates gereed; credentials niet geprovisioneerd; geen echte mail verzonden

## Resultaat tot aan de credentialgrens

Mail Foundation 002 is uitgebreid; er is geen tweede mailsysteem gebouwd.

- `WBD_GENERAL` wordt server-side gekoppeld aan `info@webuildanddesign.nl`.
- `WBD_INVOICE` wordt server-side gekoppeld aan `facturen@webuildanddesign.nl`.
- `WBD_INVOICE_FINAL` kiest automatisch `WBD_INVOICE`; de browser kan geen vrije From-header aanleveren.
- De algemene technische test gebruikt de vaste template `WBD_GENERAL_SMTP_TEST` en automatisch `WBD_GENERAL`.
- De standaardmodus blijft `CAPTURE`.
- `CONTROLLED_SMTP_TEST` vereist een exacte environment gate en exact één server-side allowlisted ontvanger.
- Wildcards, meerdere ontvangers, een andere organisatie, een andere afzender en niet-toegestane templates worden geweigerd.
- De factuurtest blijft geblokkeerd totdat de algemene test `SMTP_ACCEPTED` heeft bereikt.
- Per gecontroleerde test is maximaal één algemene en één factuurmail toegestaan; een `UNKNOWN_PARTIAL_SEND` blokkeert iedere automatische retry.
- `PRODUCTION_SMTP` heeft een eigen, standaard gesloten gate.
- Sportpaleis kan de WBD SMTP-adapters niet gebruiken en blijft ongewijzigd capture-only.

## TransIP-bevindingen

### Control-panelbewijs

In Mail Foundation 002 zijn in het TransIP-account drie echte mailboxen en geen forwards/groepen aangetroffen:

- `info@webuildanddesign.nl` — mailbox;
- `facturen@webuildanddesign.nl` — mailbox;
- `analytics@webuildanddesign.nl` — mailbox, buiten deze scope.

Bij de hercontrole voor 003 bevestigde het zichtbare instellingenpaneel opnieuw:

- SMTP-host: `smtp.transip.email`;
- SMTP-poort: `465`;
- IMAP: `imap.transip.email:993`;
- POP3: `pop3.transip.email:995`.

De control-panelsessie verliep voordat het mailboxoverzicht opnieuw kon worden geopend. Er is niets gewijzigd. De mailboxclassificatie hierboven berust daarom op de direct voorafgaande 002-inventarisatie en niet op een gegokte aanname.

### Officiële providerregels

De officiële TransIP-documentatie vermeldt voor uitgaande e-mail:

- SMTP-authenticatie verplicht;
- SSL/implicit TLS;
- host `smtp.transip.email`;
- poort `465`;
- gebruikersnaam is het e-mailadres;
- wachtwoord is het wachtwoord van dat e-mailadres.

Daarom gebruikt de implementatie afzonderlijke credentialproviders voor `info@` en `facturen@`. Een credential van de ene mailbox wordt niet stilzwijgend voor de andere afzender gebruikt.

De gedocumenteerde standaardlimiet voor webhosting/E-mail Only is 200 uitgaande e-mails per dag per e-mailadres. De controlled test staat desondanks maximaal één algemene en één factuurtest toe.

Bronnen:

- https://www.transip.nl/knowledgebase/309-algemene-instellingen-voor-mijn-e-mailadres/
- https://www.transip.nl/knowledgebase/464-geen-e-mail-meer-versturen-ontvangen

### Live TLS-bewijs

Op 8 augustus 2026 is vanaf de lokale ontwikkelruntime uitsluitend een TLS-handshake uitgevoerd naar `smtp.transip.email:465`:

- TCP verbonden: ja;
- TLS: 1.2;
- cipher: AES-128;
- certificaat: `CN=*.transip.email`;
- issuer: Sectigo Public Server Authentication CA DV R36.

Er is tijdens deze controle geen SMTP-authenticatie, MAIL FROM, RCPT TO, DATA of mailverzending uitgevoerd.

## Credentialmodel

De runtime leest uitsluitend tijdens uitvoering:

- `WBD_SMTP_INFO_USERNAME`;
- `WBD_SMTP_INFO_PASSWORD`;
- `WBD_SMTP_INVOICE_USERNAME`;
- `WBD_SMTP_INVOICE_PASSWORD`.

Secrets staan niet in Git, frontendcode, browserstorage, API-responses, screenshots, previews, history, audit of observability-events. `.env.mail.example` bevat uitsluitend namen en `NOT_PROVISIONED`-waarden. Lokale mailstate staat onder de reeds genegeerde map `website/data/mail-foundation/`.

Voor de gecontroleerde lokale validatie worden credentials alleen als proces-environment in een eigen PowerShell-sessie gezet. Ze worden niet in chat of documentatie geplaatst en verdwijnen wanneer die sessie wordt gesloten. Voor een latere productieomgeving moet een platformgebonden secret store of afgeschermde deployment-environment worden gebruikt; rotatie bestaat uit het vervangen van de twee mailboxwaarden en het herstarten van de runtime zonder codewijziging.

De interactieve helper `website/scripts/Start-ControlledWbdSmtpReview.ps1` vraagt beide mailboxwachtwoorden gemaskeerd op, houdt ze uitsluitend in het lokale procesgeheugen en start de reviewserver op poort 5193. De helper schrijft geen secrets naar schijf. Na sluiten van dat PowerShell-venster worden de environmentwaarden verwijderd.

## Environment gates

| Modus | Extern netwerk | Voorwaarde |
|---|---:|---|
| `CAPTURE` | nee | veilige default |
| `CONTROLLED_SMTP_TEST` | ja | `WBD_CONTROLLED_SMTP_ENABLED=YES_ONE_ALLOWLISTED_RECIPIENT`, exact één testontvanger en WBD-only |
| `PRODUCTION_SMTP` | ja | aparte expliciete productieflag; niet geactiveerd |

Het lokale validatiecommando is `npm.cmd run mail:smtp:controlled -- <actie>` met acties:

- `status`;
- `preview-general`;
- `verify-general`;
- `verify-invoice`;
- `send-general`.

`verify-general` en `verify-invoice` voeren TLS, SMTP AUTH en een MAIL FROM/RSET sender-check uit, maar geen DATA en dus geen mail. `send-general` is alleen beschikbaar wanneer alle gates, credentials en de allowlist kloppen.

## SMTP-adapter

De generieke `AuthenticatedSmtpTransport` ondersteunt:

- implicit TLS met certificaatvalidatie;
- SMTP AUTH PLAIN of LOGIN op basis van de live EHLO-capabilities, via runtime-providers;
- configureerbare connection- en command/send-timeouts;
- exacte senderpolicy en allowlistvalidatie;
- MIME multipart/alternative;
- server-controlled PDF-bijlagen;
- veilige providerreferentie na SMTP-acceptatie;
- veilige foutcodes zonder SMTP-response of credentials te lekken;
- `UNKNOWN_PARTIAL_SEND` wanneer de verbinding na DATA eindigt;
- geen automatische retry.

CaptureTransport is volledig behouden.

## Workspace

De definitieve WBD-factuur toont na preview:

- Van: `We Build And Design Facturen <facturen@webuildanddesign.nl>`;
- sender policy: `WBD_INVOICE`;
- ontvanger;
- onderwerp;
- actieve transportmodus;
- HTML-preview;
- server-controlled PDF en bestandsgrootte;
- resultaat en communicatiehistorie.

De technische review gebruikt een fictieve lokale factuur `TEST-003` met `donovan@example.test`. Deze fixture bevat geen klantdata en is uitsluitend via CAPTURE getest.

Bewijsbeelden staan in `output/mail-foundation-003-review/`.

## Tests

- Mail Foundation 003: 9/9 tests geslaagd;
- volledige repositorysuite: 377/377 tests geslaagd;
- publieke build: geslaagd;
- Workspace-build: geslaagd.

Gedekt zijn sender routing, exacte allowlist, gesloten gates, aparte credentials, TLS/auth/senderprotocol via een gecontroleerde SMTP-fixture, algemene-voor-factuurvolgorde, maximaal één test per type, idempotency, `UNKNOWN_PARTIAL_SEND`, secret leakage, cross-org blokkade, attachments en CaptureTransport-regressie.

## Werkelijke verzendstatus

- SMTP-authenticatie: nog niet geprobeerd; credentials ontbreken.
- SMTP sender policy: nog niet live gevalideerd; credentials ontbreken.
- algemene echte testmail: niet geprobeerd.
- factuurtestmail: niet geprobeerd.
- inbox delivery: niet van toepassing.
- DNS-mutaties: geen.
- productie-deployment: geen.

## Geparkeerd

`MAIL VISUAL/CONTENT POLISH: PENDING_REVIEW`

Er is geen redesign uitgevoerd. De aparte WBD Review & Approval-ronde volgt pas na technische end-to-endvalidatie.

## Resterende grens

Voor hervatting zijn uitsluitend nodig:

1. opnieuw aanmelden in de reeds geopende TransIP-tab zodat beide mailboxen read-only opnieuw zichtbaar kunnen worden bevestigd;
2. één eigen, niet-klantgebonden testadres voor `WBD_SMTP_TEST_RECIPIENT`;
3. de mailboxcredentials lokaal in één private PowerShell-sessie provisioneren, niet in chat;
4. daarna eerst `verify-general`; alleen bij succes maximaal één algemene echte testmail;
5. alleen na `SMTP_ACCEPTED` maximaal één fictieve factuurtest vanuit `facturen@`.

Tot die grens is geen echte mail verzonden.
