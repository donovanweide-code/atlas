# Sportpaleis Mail 005 - VDX Discovery & Controlled Activation

Datum: 2026-08-09  
Status: controlled SMTP-send en inboxdelivery bevestigd; SPF/DKIM/DMARC-headercontrole nog open  
Scope: `bedrukking@sportpaleis.nl` aansluiten op de bestaande generieke Mail Foundation

## Discovery

### Feitelijk vastgesteld

- Providerdocumentatie: VDX.
- VDX SMTP-host: `mail.hostingserver.nl`.
- Veilige SMTP-route: poort `465` met impliciete TLS/SSL.
- Alternatieve door VDX gedocumenteerde route: poort `2525` met STARTTLS.
- SMTP-authenticatie is verplicht en gebruikt de volledige mailboxnaam als gebruikersnaam.
- Live read-only TLS/EHLO op `mail.hostingserver.nl:465`:
  - TLS 1.3;
  - geldig certificaat voor `*.hostingserver.nl`;
  - serverbanner `mail01.hostingserver.nl`;
  - authenticatiemethoden `AUTH PLAIN LOGIN` na TLS.
- Live read-only TLS op `mail.sportpaleis.nl:465`:
  - TLS 1.3;
  - hetzelfde geldige `*.hostingserver.nl`-certificaat;
  - serverbanner op `hostingserver.nl`-infrastructuur.
- Publieke mail-DNS voor `sportpaleis.nl`:
  - MX: `mail.sportpaleis.nl` met prioriteit 10;
  - `mail.sportpaleis.nl` A: `91.142.254.128`;
  - SPF: `v=spf1 mx a include:_spf.divide.nl include:_spf.premiumantispam.nl include:_spf.mijnwefact.nl include:spf.heldenvan.nu ~all`;
  - DMARC: `v=DMARC1;p=quarantine;rua=mailto:dmarc@smtpeter.com`;
  - DKIM: een publieke sleutel bestaat op `default._domainkey.sportpaleis.nl`;
  - authoritative nameservers: Cloudflare.
- VDX publiceert voor shared-hostingmail:
  - 100 uitgaande berichten per uur per e-mailadres;
  - 1000 per uur per domein;
  - 1000 per uur per hostingpakket;
  - maximaal 50 MB per SMTP-bericht.
- De bestaande Mail Foundation blijft bewust strenger: exact één ontvanger, maximaal 10 MB per PDF en maximaal 15 MB totaal aan bijlagen.
- De officiële Sport 2000 Corporate Identity and Design Manual is lokaal beschikbaar en visueel gecontroleerd. De primaire basiskleuren zijn rood, zwart en wit; Chevin Pro is de corporate font authority. Voor e-mail blijft een mail-safe systeemfontfallback nodig. Er is in deze fase geen nieuw logo of maildesign gemaakt.

### VDX-portaalverificatie - Mail 005B

Read-only bevestigd op 2026-08-09 in VDX-account `3833`:

- `sportpaleis.nl` gebruikt het actieve pakket `Webhosting - M` op `srv12403.hostingserver.nl`;
- `bedrukking@sportpaleis.nl` bestaat als afzonderlijk e-mailadres;
- `mailbox_enabled` staat aan: het adres heeft een actief postvak en is niet uitsluitend een alias;
- forwarding staat aan naar `teamsales@sportpaleis.nl`;
- Donovan heeft op 2026-08-09 bevestigd dat deze forwarding gewenst is en voorlopig actief moet blijven;
- er zijn geen e-mailaliases aan deze mailbox gekoppeld;
- automatische beantwoording staat uit;
- er is geen mutatie uitgevoerd en geen instelling opgeslagen.

Nog niet bevestigd:

- een specifieke mailboxquota wordt in dit VDX-scherm niet getoond; er was geen quota- of blokkadewaarschuwing zichtbaar;
- of de publiek aanwezige `default` DKIM-selector daadwerkelijk de actieve VDX-signer is;
- SMTP-authenticatie met de echte mailboxcredential;
- de exacte credentialstatus.

### From, Reply-To en Return-Path

- De VDX-documentatie vereist dat het verzendende adres binnen het hostingaccount bestaat.
- Het sender contract gebruikt daarom uitsluitend `bedrukking@sportpaleis.nl` als server-side `From`.
- `Reply-To` wordt eveneens `bedrukking@sportpaleis.nl`, zodat antwoorden functioneel bij Bedrukking terugkomen.
- De SMTP-envelope sender is hetzelfde adres. De provider bepaalt eventuele technische Return-Path-verwerking na acceptatie.
- Aliasverzending wordt niet aangenomen of gebruikt zolang het portaaltype niet is bevestigd.

### DNS-beoordeling

Er is niets gewijzigd. MX, SPF, DMARC en een `default` DKIM-record zijn aanwezig en de mailhost wijst aantoonbaar naar de VDX/hostingserver-infrastructuur. Een DNS-wijziging is nu niet onderbouwd. De actieve DKIM-selector moet nog in Plesk/VDX worden bevestigd en na een gecontroleerde test moeten de ontvangen authenticatieresultaten worden beoordeeld.

DNS-status: `NO CHANGE REQUIRED` voor deze fase.

## Architecture

### Bestaande foundation

De bestaande route blijft leidend:

`Mail Engine -> Organization configuration -> Sender policy -> Brand Foundation -> Template/context -> Transport -> History/audit/observability`

Sportpaleis krijgt geen tweede engine en geen gekopieerde transportlaag.

### Vastgestelde generieke tekortkomingen

Twee controlled-SMTP-grenzen waren nog WBD-specifiek in de generieke code:

1. `AuthenticatedSmtpTransport` stond alleen organisatie-ID `we-build-and-design` toe.
2. De controlled-testpolicy bevatte uitsluitend de twee WBD-templatekeys en hun volgorde.

Deze grenzen zijn organisatie-onafhankelijk configureerbaar gemaakt. De bestaande WBD-organisatie-ID, templates, volgorde, afzenders, Brand Foundation, transportinstellingen en acceptance-baseline zijn inhoudelijk ongewijzigd gebleven.

Geïmplementeerde generieke uitbreiding:

- SMTP-adapters zijn aan een configureerbare organization ID gebonden;
- controlled gates zijn per organisatie geïsoleerd;
- controlled templates en eventuele voorgangerseisen zijn configuratie in plaats van WBD-logica;
- Message-ID-domain en sender-policy-header zijn organisatieconfiguratie;
- conflicterende organisatie-mailmodi falen vroeg;
- alle bestaande idempotency-, history-, audit-, attachment- en unknown-sendcomponenten blijven gedeeld.

### Sportpaleis-configuratie

- Organization ID: `sportpaleis`.
- Capability: `Bedrukking`.
- Sender policy: `SPORTPALEIS_BEDRUKKING`.
- Functioneel afzenderadres: `bedrukking@sportpaleis.nl`.
- SMTP-host: `mail.hostingserver.nl`.
- SMTP-poort/TLS: `465`, impliciete TLS verplicht.
- Gebruikersnaamconventie: volledig mailboxadres.
- Controlled template: één minimale technische `SPORTPALEIS_BEDRUKKING_SMTP_TEST`, duidelijk als TEST gemarkeerd.
- Bestaande ordertemplates worden niet als onderdeel van deze activatietest uitgebreid of geactiveerd.

## Security

- Credentials worden alleen tijdens de lokale uitvoering uit environmentvariabelen gelezen.
- Geen credentialwaarde staat in code, documentatie, git, screenshots, history of audit.
- Controlled SMTP vereist een exacte environment-gate.
- De allowlist bevat exact één volledig e-mailadres; wildcards en meerdere adressen worden geweigerd.
- Organization ID, sender policy en `From` moeten alle drie overeenkomen met de serverconfiguratie.
- Productie-SMTP blijft afzonderlijk gesloten.
- Idempotency reserveert een poging vóór transport.
- Een eerdere geaccepteerde of onbekende controlled poging blokkeert een nieuwe poging voor dezelfde organization/template.
- Een onbekende uitkomst na SMTP `DATA` wordt `UNKNOWN_PARTIAL_SEND`, vraagt aandacht en wordt niet automatisch herhaald.
- History, audit-events en observability bevatten geen secrets.

## Testing

Uitgevoerd:

- organization isolation;
- server-side sender policy en spoofing rejection;
- exacte allowlist;
- ontbrekende credentials;
- SMTP-configvalidatie en TLS-only;
- controlled-testlimiet;
- idempotency en duplicate prevention;
- unknown-send safety;
- history, audit en observability;
- ongewijzigde WBD controlled-testvolgorde;
- volledige repositoryregressie.

Resultaten:

- gerichte Mail Foundation + Sportpaleis 005-suite: `18/18 PASS`;
- WBD/Mail Foundation-regressie: `41/41 PASS`;
- volledige repositorysuite na credential-handoffcorrectie: `403/403 PASS`;
- PowerShell-runner parsercontrole: `PASS`;
- lokale runner `status`: `PASS`, credentials `NOT_PROVISIONED`, real mail `false`;
- lokale runner `preview`: `PASS`, externe mail `false`;
- DNS/TCP/TLS/certificaat/SMTP-banner/EHLO op `mail.hostingserver.nl:465`: opnieuw `PASS`;
- SMTP-credentialverify opnieuw uitgevoerd met de huidige mailboxcredential: `PASS`;
- VDX accepteert authenticatie van `bedrukking@sportpaleis.nl`;
- sender-policycontrole: `PASS`;
- afzonderlijke webmail-login met dezelfde mailboxcredential: `PASS`;
- credential-handoffpreflight: `PASS`; AUTH en sender-policy geaccepteerd, gestopt na `RSET` en vóór `RCPT TO`/`DATA`;
- controlled send met nieuwe idempotencysleutel: `SMTP_ACCEPTED`;
- RFC Message-ID: `<mail-528f66e0-41ab-483a-8b06-f1f7d6f36edb@sportpaleis.nl>`;
- provider queue-reference: `901F429E0F9`;
- audit: `MAIL_SEND_ATTEMPTED` gevolgd door `MAIL_SEND_SUCCEEDED`;
- duplicate sends: `0`;
- inboxdelivery naar `donovanweide@gmail.com`: op 2026-08-09 door Donovan bevestigd als `PASS`, zichtbaar in Apple Mail op iPhone;
- SPF, DKIM en DMARC: nog niet bevestigd via de volledige ontvangen message headers.

Controlled teststatus: `SMTP ACCEPTED / INBOX DELIVERY PASS / AUTHENTICATION HEADERS PENDING`. Het actieve mailboxpostvak, de gewenste forwarding, het eigen testadres `donovanweide@gmail.com`, SMTP-authenticatie, sender-policy en daadwerkelijke inboxdelivery zijn bevestigd. SPORTPALEIS MAIL 005 blijft open totdat SPF, DKIM en DMARC afzonderlijk uit de volledige ontvangen message headers zijn beoordeeld.

## Future inbound readiness

Voor iedere outbound mail bewaart de foundation nu al:

- intern `messageId`;
- organization ID;
- contexttype en context-ID;
- templatekey en versie;
- afzenderpolicy;
- ontvanger;
- providerreference indien beschikbaar;
- poging-, history- en auditmetadata.

Voor de toekomstige reply -> order-koppeling moeten daarnaast de uiteindelijke RFC `Message-ID`, providerreference en na inbound de `In-Reply-To`- en `References`-headers duurzaam worden bewaard. De voorkeursvolgorde blijft:

1. thread via Message-ID/References;
2. ordernummer/context-ID;
3. klant/e-mailadres;
4. overige betrouwbare context.

Geen betrouwbare match resulteert later in `Bedrukking -> Aandacht -> Niet gekoppelde e-mail`. Er is in 005 geen IMAP- of inbound-engine gebouwd.

## Open punten

1. SPF, DKIM en DMARC afzonderlijk bevestigen via de volledige headers van de reeds ontvangen controlled testmail; hiervoor geen nieuwe mail verzenden.
2. From en Reply-To uit diezelfde volledige headers bevestigen.
3. Actieve DKIM-selector en quota blijven observatiepunten; er is geen actuele DNS- of quotawijziging onderbouwd.
4. Een specifieke Sportpaleis-mailvisual en mail-safe logoasset pas in een afzonderlijke menselijke brandreview activeren; de CID Manual blijft design authority.
5. Productieactivatie en inbound vallen buiten deze opdracht.

## Bronnen

- VDX FAQ: e-mailinstellingen en authenticatie.
- VDX FAQ: SMTP-poorten.
- VDX FAQ: uitgaande limieten.
- VDX FAQ: maximale berichtgrootte.
- VDX FAQ: SPF/DKIM/DMARC en afzendervereisten.
- Publieke DNS-observatie op 2026-08-09.
- Read-only TLS/EHLO-observatie op 2026-08-09.
- `NEW2025-CID_Manual_BENE sep 25.pdf` (42 pagina's), visueel gecontroleerd.
- Bestaande repositorycode en WBD-baseline `WBD-MAIL-FOUNDATION-004C3-FINAL-20260809`.

## Huidig besluit

- Architecture fit: `YES`.
- SMTP readiness: `READY` - mailbox, gewenste forwarding, credential, TLS, AUTH en sender-policy zijn bevestigd.
- Security/configuratie: voorbereid en lokaal getest; alle verify-grenzen zijn groen.
- Controlled send: `SMTP_ACCEPTED`; exact één echte testmail, duplicate count `0`.
- Inboxdelivery: `PASS`, menselijk bevestigd in Apple Mail op iPhone.
- SPF/DKIM/DMARC: `PENDING FULL MESSAGE HEADER REVIEW`.
- DNS: `NO CHANGE REQUIRED`.
- Brand: `READY` voor CID-authority; specifieke mailasset/visual blijft draft tot afzonderlijke menselijke review.
- Echte mail verzonden: `YES`, exact één allowlisted controlled testmail.
- Productiedeployment: `NO`.

Eindadvies: `INBOX DELIVERY CONFIRMED - KEEP 005 OPEN FOR SPF/DKIM/DMARC HEADER VALIDATION`.
