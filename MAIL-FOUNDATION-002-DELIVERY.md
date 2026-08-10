# WBD Mail Foundation 002 - Delivery

Datum: 8 augustus 2026  
Build/release: `MAIL-FOUNDATION-002-20260808`  
Scope: We Build And Design + Sport 2000 Sportpaleis B.V.  
Transportstatus: CaptureTransport actief; echte SMTP technisch uitgeschakeld

## Resultaat

Er is één generieke server-side Mail Foundation gebouwd. WBD en Sportpaleis gebruiken dezelfde renderer, transportinterface, historie, auditvelden, idempotencystrategie, foutstatussen en observability-events. Organisatiespecifieke order- en factuurlogica zit uitsluitend in adapters boven de generieke engine.

De lokale reviewflows werken end-to-end:

- Sportpaleis: ordercontext -> template -> server-side rolcontrole -> preview -> Capture Send -> communicatiehistorie;
- WBD: definitieve factuurbron -> ontvanger -> bestaande definitieve PDF -> preview -> Capture Send -> mailhistorie;
- CaptureTransport schrijft alleen lokaal en heeft geen netwerkpad;
- de toekomstige SMTP-adapter bestaat als contract en geeft altijd `SMTP_SEND_DISABLED`;
- er is geen externe mail, DNS-wijziging, productie-deploy of betaalde dienst uitgevoerd.

## Architectuur

```text
Workspace request
  -> organization adapter (Sportpaleis order / WBD final invoice)
  -> authenticated actor or local WBD owner boundary
  -> generic server-side permission matrix
  -> declarative versioned template + allowlisted context
  -> safe renderer (HTML escaping + header checks)
  -> server-controlled attachment validation
  -> idempotency reservation (SENDING persisted first)
  -> CaptureTransport
  -> terminal result
  -> generic communication history
  -> Atlas-compatible observability event
```

Belangrijkste componenten:

- `website/scripts/mail-foundation.mjs`: generieke engine, renderer, stores, transports, organisaties, permissions, failures en events;
- `website/scripts/sportpaleis-pilot-foundation.mjs`: orderadapter boven bestaande sessies, CSRF, rollen en order-source-of-truth;
- `website/scripts/wbd-invoice-development-api.mjs`: definitieve-factuuradapter en server-controlled PDF-resolver;
- `website/src/sportpaleis-workspace.ts`: compacte ordergebonden preview/capture/history-interface;
- `website/src/wbd-invoices.ts`: definitieve factuurmail, PDF-metadata, preview/capture/history;
- `website/tests/mail-foundation-002.test.mjs`: functionele, failure- en securitytests.

## MailRequest en datastore

Een voorbereide request bevat minimaal:

- `organizationId`;
- `contextType` en `contextId`;
- `templateKey`;
- exact één server-side bepaalde ontvanger;
- allowlisted templatecontext;
- uitsluitend server-side aangeleverde attachments;
- bij een captureactie een idempotency key.

De lokale JSON-store bewaart:

- schemaVersion;
- attempts;
- idempotency-reserveringen;
- Atlas-compatible events.

De persisted attempt bevat organisatie, context, veilige afzender/ontvanger, template key/version, initiator, timestamps, transport, status, veilige transportuitkomst, message/reference ID, idempotency key en bijlagemetadata. Bijlagebytes, paden en secrets worden niet in history of events opgeslagen.

Lokale runtimebestanden staan onder `website/data/mail-foundation/` en zijn via `.gitignore` uitgesloten. Capturebestanden bevatten gerenderde mail en veilige bijlagemetadata, maar geen bijlagebytes, credentials of secrets.

## Transports

### CaptureTransport

Operationeel voor development/test:

- `from`, `to`, optionele `replyTo`, subject, HTML, plain text, attachments en message ID;
- lokaal previewbaar JSON-capturebestand;
- simulated success, failure, timeout en `UNKNOWN_PARTIAL_SEND`;
- `externalNetworkEnabled = false`;
- resultaat vermeldt expliciet dat geen internetmail is verstuurd.

### SMTP-contract

`DisabledSmtpTransport` legt host, port, TLS-status, username-status, secret-status, timeoutconcept en publieke configuratiesamenvatting vast. De adapter importeert geen socket- of SMTP-library en `send()` faalt altijd met `SMTP_SEND_DISABLED`.

`REAL SMTP SEND = DISABLED` kan in deze build niet met alleen een environmentvariabele worden omzeild. Een latere gecontroleerde SMTP-validatie vereist expliciete code, review, secrets provisioning en een nieuwe menselijke GO.

## Organisaties

### We Build And Design

- organization ID: `we-build-and-design`;
- sender name: We Build And Design;
- sender address: `info@webuildanddesign.nl` als gedocumenteerde identiteit, nog niet SMTP-gevalideerd;
- template: `WBD_INVOICE_FINAL`, version 1;
- transport: CaptureTransport;
- toekomstige SMTP-config: TransIP-partial, credentials niet geprovisioneerd;
- permission: lokale WBD owner-adapter.

### Sport 2000 Sportpaleis B.V.

- organization ID: `sportpaleis`;
- capture-afzender: `capture@sportpaleis.invalid`;
- sender address status: `NOT_PROVISIONED`;
- SMTP host: `UNKNOWN`;
- SMTP port: `UNKNOWN`;
- SMTP username: `NOT_PROVISIONED`;
- SMTP secret: `NOT_PROVISIONED`;
- transport: CaptureTransport;
- VDX-provideronderzoek: buiten scope van deze run.

## Templates

De engine accepteert alleen declaratieve templates zonder uitvoerbare templatecode. Iedere template heeft organization, key, version, subject, HTML, plain text en `allowedVariables`.

Veiligheidsregels:

- alle contextwaarden in HTML worden escaped;
- onbekende of ontbrekende variabelen falen gesloten;
- CR/LF in headers wordt geblokkeerd;
- `script` en `javascript:` in de vaste HTML-template zijn verboden;
- de browser kan templatecode, afzender of ontvanger niet vrij overschrijven.

Sportpaleis templates:

- `ORDER_RECEIVED` v1: klantnaam, ordernummer, artikelen, aantallen, bedrukking, vereniging, circa drie werkdagen zonder levergarantie en een later gereedbericht;
- `ORDER_READY` v1: gereed/afhalen, orderreferentie en wasadvies (binnenstebuiten, kledinginstructies volgen, niet in droger, sterke warmte kan bedrukking beschadigen/verzwakken);
- `ORDER_QUESTION` v1: handmatige vraag of probleem, nooit automatisch verstuurd.

WBD template:

- `WBD_INVOICE_FINAL` v1: klant, factuurnummer, project, totaal en bestaande definitieve factuur-PDF.

## Permissions

Sportpaleis server-side matrix:

| Rol | ORDER_RECEIVED | ORDER_READY | ORDER_QUESTION | History |
|---|---:|---:|---:|---:|
| Winkelmedewerker | ja | nee | ja | ja |
| Patrick/Productie | nee | ja | ja | ja |
| Kevin/Admin | ja | ja | ja | ja |

De bestaande Sportpaleis-sessie, CSRF-token en serverrol blijven leidend. SMTP-configuratie wordt niet aan gewone gebruikers geleverd.

WBD gebruikt in deze lokale Foundation de bestaande development-only factuur-API. Mailroutes zijn beperkt tot loopback, vereisen een custom capture-confirmation header en gebruiken de lokale owner-actor. Dit is voldoende voor lokale capturevalidatie, maar geen productie-auth/RBAC. Een productie-SMTP-route blijft daarom geblokkeerd totdat de WBD Workspace een geauthenticeerde server-side ownercontext heeft.

## WBD invoice en attachments

Er is geen tweede factuursysteem gebouwd. De adapter gebruikt uitsluitend de bestaande `sent`/final source-of-truth:

- `document_status = final`;
- `workspace.status = sent`;
- `workspace.locked = true`;
- bestaande definitieve PDF via de huidige generator en opslagroute.

Een conceptfactuur heeft geen mailendpoint en `assertFinalInvoiceMailEligible()` weigert iedere niet-definitieve of niet-vergrendelde bron.

Attachmentregels:

- bytes worden alleen server-side uit de definitieve PDF-route betrokken;
- de browser kan geen pad aanleveren;
- `path.basename` en veilige bestandsnaamnormalisatie;
- alleen `application/pdf`;
- magic bytes moeten met `%PDF-` beginnen;
- maximaal 10 MB per bijlage en 15 MB totaal;
- history/audit bevat alleen filename, MIME, size en SHA-256;
- path traversal en MIME-spoofing worden getest en geblokkeerd.

De bestaande definitieve factuur F00248 bevat nog geen klant-e-mailadres in de bron en blijft daarom veilig geblokkeerd voor mailvoorbereiding. Nieuwe facturen hebben een expliciet `E-mailadres factuur`-veld. De visuele test gebruikte uitsluitend een synthetische lokale `example.invalid`-reviewfactuur.

## History, idempotency en failure model

Een captureactie reserveert de idempotency key en persist eerst status `SENDING`. Daarna volgt de transportaanroep en een terminale status.

- dezelfde actor + organisatie + idempotency key + payload levert dezelfde attempt terug;
- dezelfde key met een andere payload geeft `DUPLICATE_SEND_REQUEST`;
- dubbele klik maakt geen tweede capture;
- `UNKNOWN_PARTIAL_SEND` zet `attentionRequired = true`;
- automatische retry is voor iedere terminale sendpoging uitgeschakeld;
- confirmed not sent, captured en unknown outcome blijven onderscheidbaar.

Geïmplementeerde/afgedekte fouten:

- `INVALID_RECIPIENT`;
- `TEMPLATE_RENDER_FAILED`;
- `PERMISSION_DENIED`;
- `TRANSPORT_FAILED`;
- `TIMEOUT`;
- `UNKNOWN_PARTIAL_SEND`;
- `DUPLICATE_SEND_REQUEST`;
- aanvullende boundaries: `MASS_SEND_BLOCKED`, `RATE_LIMITED`, `ATTACHMENT_INVALID`, `ATTACHMENT_MIME_MISMATCH`, `ATTACHMENT_TOO_LARGE`, `SECRET_BOUNDARY_VIOLATION`, `SMTP_SEND_DISABLED`.

## Security en secrets

Bewezen boundaries:

- recipient- en header-injection geblokkeerd;
- malformed e-mail geblokkeerd;
- unauthorized en cross-organization toegang geblokkeerd;
- HTML/context escaping;
- arbitrary filesystem path onmogelijk vanuit browser;
- MIME/PDF-controle en groottelimieten;
- idempotency en rate limiting (10 attempts per actor/organisatie per 15 minuten);
- exact één ontvanger; geen bulk/campaign/newsletter;
- CaptureTransport zonder netwerkpad;
- secretpatronen falen gesloten vóór preview/capture/event;
- geen secret in API-response, history, event, capturebestand of screenshot.

Later benodigde WBD secrets:

- `WBD_SMTP_USERNAME` of een secret-reference naar de gekozen mailbox;
- `WBD_SMTP_PASSWORD` uitsluitend in server-side secret storage;
- eventueel een provider-specifieke client certificate/private key alleen wanneer TransIP dit aantoonbaar vereist (nu niet vastgesteld).

Later benodigde Sportpaleis secrets:

- `SPORTPALEIS_SMTP_HOST`;
- `SPORTPALEIS_SMTP_PORT`;
- `SPORTPALEIS_SMTP_USERNAME`;
- `SPORTPALEIS_SMTP_PASSWORD`;
- gevalideerde sender/reply-to-identiteit.

Plaatsing: productie-secretmanager of afgeschermde server runtime environment, nooit frontend, browserstorage, repository, screenshot, audit of fouttekst. Rotatie gebeurt door een nieuwe secretversie te provisionen, de serverreferentie atomair om te zetten, een gecontroleerde single-recipient validatie te doen en de oude secret daarna bij de provider in te trekken.

## Atlas observability

De engine emit generieke events:

- `MAIL_RENDERED`;
- `MAIL_SEND_ATTEMPTED`;
- `MAIL_SEND_SUCCEEDED`;
- `MAIL_SEND_FAILED`;
- `MAIL_SEND_UNKNOWN`;
- `MAIL_PERMISSION_DENIED`.

Events bevatten organisatie, context, template, actor en veilige statusdetails. Geen credentials, mailbody of bijlagebytes. Atlas kan later observeren en Attention voorstellen, maar heeft geen API om credentials/config te wijzigen, mail opnieuw te versturen of infrastructuur te muteren.

## TransIP read-only inventory - WBD

Inventarisatie is uitsluitend lezen uitgevoerd in het bestaande TransIP-controlpanel. Er zijn geen velden gewijzigd en geen save/add/delete-actie uitgevoerd.

Bevestigd:

- domein: `webuildanddesign.nl` bij TransIP met webhosting en e-mailhosting;
- mailpakket: 3 van 10 mailboxslots in gebruik;
- mailboxen: `analytics@webuildanddesign.nl`, `info@webuildanddesign.nl`, `facturen@webuildanddesign.nl`;
- forwards: geen bestaande records zichtbaar;
- mailgroepen: geen bestaande records zichtbaar;
- webmail: `https://transip.email`;
- SMTP: `smtp.transip.email`, port `465`;
- IMAP: `imap.transip.email`, port `993`;
- POP3: `pop3.transip.email`, port `995`;
- MX: `10 mx.transip.email.`;
- SPF: `v=spf1 include:_spf.transip.email ~all`;
- DKIM: drie TransIP CNAME selectors (A, B, C) aanwezig;
- DMARC: `v=DMARC1; p=none;`;
- autoconfig/autodiscover verwijzen naar TransIP-mail;
- nameservers: TransIP;
- DNSSEC: ingeschakeld;
- hosting: TransIP shared hosting, PHP 8.2, SFTP/SSH ingeschakeld, databases beschikbaar;
- SMTP/IMAP credentials zijn niet geopend, gelezen of vastgelegd.

Niet aantoonbaar vastgesteld en daarom `UNKNOWN` of `PARTIAL`:

- specifieke mailbox die als productie-afzender moet worden gebruikt;
- mailboxusername/password en secret lifecycle in TransIP;
- outbound rate/message-size beperkingen;
- of extra SMTP allowlisting nodig is;
- server-side native PHP `mail()`/sendmailbeschikbaarheid;
- succesvolle authenticated SMTP login en envelope/from-policy;
- gecontroleerde deliverability naar een allowlisted testontvanger.

De TransIP-instellingen en de bestaande preflight maken WBD SMTP-configuratie technisch `PARTIAL`: host/port/TLS-richting zijn bekend, maar authenticatie en daadwerkelijke gecontroleerde send zijn bewust niet getest.

## Kosten

- nieuwe betaalde externe dienst: geen;
- SendGrid/Mailgun/Postmark/SES: niet geactiveerd;
- huidige TransIP-mailhosting en drie bestaande mailboxen: aanwezig;
- extra mailbox of upgrade: niet nodig voor deze Foundation; toekomstige providerlimieten/contractkosten zijn `UNKNOWN` totdat de gecontroleerde SMTP-validatie is gepland.

## Tests en build

Specifieke Foundation 002-suite:

- 16 tests geslaagd;
- WBD definitieve factuur capture + echte bestaande PDF-resolver;
- WBD concept geblokkeerd;
- Sportpaleis ORDER_RECEIVED, ORDER_READY en ORDER_QUESTION;
- invalid recipient, permissions, cross-org, duplicate, failure, timeout en unknown outcome;
- header/recipient injection, HTML escaping, attachment traversal/MIME spoofing, secret leakage, mass send en rate limiting;
- CaptureTransport aantoonbaar zonder extern netwerkpad;
- Sportpaleis adapter met echte sessie, CSRF, rollen en ordercontext.

Volledige website-regressiesuite na implementatie: 368 tests geslaagd, 0 gefaald.  
Public build: geslaagd.  
Workspace build: geslaagd.  
Review-PDF: 8 pagina's, A4, gerenderd met Poppler en alle pagina's visueel gecontroleerd.

## Reviewartifacts

- primaire review: `output/pdf/MAIL-FOUNDATION-002-REVIEW.pdf`;
- losse screenshots: `output/mail-foundation-002-review/`;
- lokale capture-output: `website/data/mail-foundation/captures/` (gitignored, geen externe mail).

## Blockers voor echte SMTP

WBD:

1. kies en bevestig de productie-afzendermailbox (`info@` of `facturen@`, geen aanname);
2. provision mailbox SMTP-credential in server-side secret storage;
3. bouw/activeer pas na GO een echte SMTP-transportimplementatie met TLS, timeout en veilige unknown-outcome handling;
4. voeg productie-auth/RBAC voor de WBD owneractie toe;
5. definieer één allowlisted testontvanger en expliciete single-message validatie;
6. valideer envelope/from-policy, providerlimieten, message-size, deliverability en providerreference;
7. laat monitoring/Attention en secret rotation operationeel reviewen;
8. pas daarna live verzending per organisatie afzonderlijk vrijgeven.

Sportpaleis:

1. lever via VDX de bevestigde provider, host, port, TLS, username, sender/reply-to en outboundlimieten;
2. provision een secret buiten Git;
3. valideer commerciële templatecopy met Sportpaleis;
4. voer dezelfde gecontroleerde single-recipient SMTP-validatie uit;
5. geef pas na afzonderlijke GO live verzending vrij.

IMAP/incoming mail, WhatsApp, Direct Print/hardware, DNS-mutaties en productie-deploy blijven buiten deze levering.

## Eindstatus

```text
GENERIC MAIL ENGINE IMPLEMENTED: YES
CAPTURE TRANSPORT IMPLEMENTED: YES
WBD MAIL WORKSPACE INTEGRATED: YES
SPORTPALEIS MAIL WORKSPACE INTEGRATED: YES
WBD INVOICE ATTACHMENT TESTED: YES
SPORTPALEIS ORDER TEMPLATES READY: YES
MAIL HISTORY READY: YES
IDEMPOTENCY READY: YES
UNKNOWN SEND SAFETY READY: YES
SECURITY TESTS PASS: YES
FULL REGRESSION TESTS PASS: YES

WBD TRANSIP MAIL INVENTORY COMPLETE: PARTIAL
WBD SMTP CONFIG IDENTIFIED: PARTIAL
SPORTPALEIS SMTP CONFIG IDENTIFIED: NO - VDX OUT OF SCOPE

REAL SMTP CREDENTIALS PROVISIONED: NO
REAL EXTERNAL MAIL SENT: NO
DNS MUTATIONS: NO
PAID EXTERNAL SERVICES ACTIVATED: NO
PRODUCTION DEPLOYMENT: NO

READY FOR WBD CONTROLLED SMTP VALIDATION: NO
READY FOR SPORTPALEIS CONTROLLED SMTP VALIDATION: NO
```
