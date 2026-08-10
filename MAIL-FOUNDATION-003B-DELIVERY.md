# WBD Mail Foundation 003B - Controlled SMTP Validation

Datum: 9 augustus 2026  
Release: `MAIL-FOUNDATION-003B-20260809`  
Scope: WBD transactionele e-mail, maximaal een algemene testmail en een factuurtestmail  
Status: afgerond en bevroren; beide inboxleveringen en de leesbare factuur-PDF zijn door de eigenaar bevestigd

## Uitkomst

De bestaande Mail Foundation is end-to-end door TransIP SMTP gevalideerd. Er is geen tweede mailengine gebouwd en er is geen maildesign aangepast.

Bewezen keten:

```text
WBD Workspace
  -> server-side sender policy
  -> controlled SMTP gate
  -> exact een allowlisted eigen testadres
  -> afzonderlijke mailboxauthenticatie
  -> smtp.transip.email:465 via TLS
  -> SMTP acceptance
  -> durable history/audit
  -> observability events
```

Er zijn exact twee echte mails door SMTP geaccepteerd:

1. algemene technische test vanuit `info@webuildanddesign.nl`;
2. fictieve definitieve factuurtest vanuit `facturen@webuildanddesign.nl`, met server-controlled PDF.

De twee duplicate-requests gaven uitsluitend de bestaande attempt terug met `duplicate: true`. Ze veroorzaakten geen extra SMTP-overdracht.

## Mailbox- en senderbewijs

### WBD_GENERAL

- mailbox: `info@webuildanddesign.nl`;
- username: volledig mailboxadres;
- TLS: pass;
- SMTP authentication: pass;
- MAIL FROM sender policy: pass;
- vaste template: `WBD_GENERAL_SMTP_TEST` v1;
- browserinput voor een vrije From-header: genegeerd en server-side vervangen;
- niet-allowlisted recipient: hard geblokkeerd door de SMTP-adapter.

### WBD_INVOICE

- mailbox: `facturen@webuildanddesign.nl`;
- afzonderlijke mailboxcredentials;
- TLS: pass;
- SMTP authentication: pass;
- MAIL FROM sender policy: pass;
- vaste template: `WBD_INVOICE_FINAL` v1;
- alleen definitieve, vergrendelde factuurbron is verzendbaar;
- conceptfacturen blijven door de bestaande factuuradapter geblokkeerd.

De credentials bestonden uitsluitend in het procesgeheugen van de interactieve controlled reviewserver. Ze zijn niet vastgelegd in Git, lokale state, API-output, history, screenshots of deze documentatie.

## Algemene testmail

- FROM: `We Build And Design <info@webuildanddesign.nl>`;
- policy: `WBD_GENERAL`;
- recipient: exact een server-side allowlisted eigen testadres;
- onderwerp: `WBD Workspace - gecontroleerde mailtest`;
- bijlagen: geen;
- attempted/completed: 9 augustus 2026 om 11:43:24 UTC;
- initiated by: `wbd-controlled-smtp-owner`;
- attempt ID: `9313b68c-5e25-4d4f-a101-4a086df7fe16`;
- message ID: `mail-8d6fb1af-863a-4ddb-81b6-d756dfc8834d`;
- providerreferentie: `4hHwxm2883z3R3p00`;
- status: `SMTP_ACCEPTED`;
- inbox delivery: `CONFIRMED` door de eigenaar op 9 augustus 2026 (ontvangen om 13:43 lokale tijd).

## Factuurtestmail

- bron: fictieve definitieve factuur `TEST-003`;
- klantdata: geen;
- FROM: `We Build And Design Facturen <facturen@webuildanddesign.nl>`;
- policy: `WBD_INVOICE`;
- recipient: hetzelfde allowlisted eigen testadres;
- onderwerp: `Factuur TEST-003 - Controlled SMTP activation`;
- attempted/completed: 9 augustus 2026 om 11:44:13 UTC;
- initiated by: `wbd-local-owner`;
- attempt ID: `465ff3ea-b9eb-4d8b-af27-ebfe7e9bca1b`;
- message ID: `mail-78007b2d-a749-439f-ad8b-5358da728be2`;
- providerreferentie: `4hHwyj1gNRz3R3nyh`;
- status: `SMTP_ACCEPTED`;
- inbox delivery: `CONFIRMED` door de eigenaar op 9 augustus 2026;
- PDF-bijlage: `CONFIRMED` geopend en leesbaar.

Bijlagebewijs:

- filename: `wbd-factuur-mail-foundation-003-review.pdf`;
- MIME: `application/pdf`;
- grootte: 108343 bytes;
- SHA-256: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`;
- bron: server-controlled resolver uit de bestaande definitieve factuurflow;
- bytes/pad niet opgenomen in history of observability.

Na de test is het persoonlijke recipientadres opnieuw uit de repositoryfixture verwijderd en teruggezet naar `donovan@example.test`. De SMTP-history blijft lokaal in de reeds genegeerde development-state bewaard.

## Idempotency

Algemene test:

- tweede request gebruikte dezelfde key `mail-foundation-003-general-real-v1`;
- dezelfde attempt-ID, message-ID en providerreferentie kwamen terug;
- `duplicate: true`;
- geen tweede SMTP-send.

Factuurtest:

- tweede request gebruikte dezelfde key `mail-foundation-003-invoice-real-v1`;
- dezelfde attempt-ID, message-ID en providerreferentie kwamen terug;
- `duplicate: true`;
- geen tweede SMTP-send.

`DUPLICATE SEND PREVENTION: PASS`

## History, audit en observability

De generieke state bevat voor beide echte tests:

- organisatie;
- contexttype en context-ID;
- server-side sender en sender policy;
- allowlisted recipient;
- template en versie;
- actor/initiator;
- created, attempted en completed timestamp;
- transport;
- status;
- veilige transportuitkomst;
- message- en providerreferentie;
- idempotency key;
- PDF-metadata waar van toepassing;
- `attentionRequired: false`;
- `automaticRetryAllowed: false`.

Bijbehorende events zijn aangetroffen:

- `MAIL_RENDERED`;
- `MAIL_SEND_ATTEMPTED`;
- `MAIL_SEND_SUCCEEDED`.

De Workspace-history toont `WBD_INVOICE_FINAL - SMTP_ACCEPTED` met timestamp, initiator en veilige uitleg. SMTP acceptance wordt nergens als inbox delivery voorgesteld.

## Failure safety en regressie

Automatisch getest:

- invalid recipient;
- recipient/header injection;
- exact een recipient en geen bulk;
- non-allowlisted recipient;
- vrije/ongeautoriseerde sender genegeerd of geweigerd;
- missing credentials;
- permission denial;
- cross-organization send;
- duplicate request;
- simulated timeout;
- `UNKNOWN_PARTIAL_SEND` zonder automatische retry;
- attachment path traversal en MIME spoofing;
- secret/log leakage;
- CaptureTransport-isolatie;
- closed controlled/production gates;
- general-before-invoice sequence;
- maximaal een controlled test per type;
- middleware routing voor de controlled validationendpoint.

Testresultaten:

- Mail Foundation 003/003B: 10/10 tests pass;
- volledige repository: 378/378 tests pass;
- publieke build: pass;
- Workspace-build: pass;
- `git diff --check`: pass.

## Reviewbewijs

- screenshots: `output/mail-foundation-003-review/`;
- primaire technische review: `output/pdf/MAIL-FOUNDATION-003B-TECHNICAL-REVIEW.pdf`;
- PDF: vier pagina's, opnieuw gerenderd en visueel gecontroleerd zonder clipping of overlap.

## Externe grenzen

- DNS-mutaties: geen;
- SPF/DKIM/DMARC-mutaties: geen;
- mailboxwijzigingen: geen;
- paid services: geen;
- production deployment: geen;
- Sportpaleis SMTP: niet geprobeerd;
- VDX: niet benaderd.

## Freeze

De technische Mail Foundation is na menselijke inboxbevestiging bevroren op:

`WBD MAIL FOUNDATION 003B - CONTROLLED SMTP VALIDATED`

De production decision blijft een aparte beslissing. De huidige interactieve controlled runtime en procescredentials zijn geen productiecredentialvoorziening en geen productie-deployment.

`MAIL VISUAL/CONTENT POLISH: PENDING_REVIEW`

Visuele/contentfeedback valt uitsluitend onder een latere WBD Review & Approval-ronde.

## Human action remaining

- het lokale controlled PowerShellvenster sluiten zodat de procesgebonden credentials verdwijnen.
