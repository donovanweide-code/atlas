# WBD Mail Foundation 001 — Preflight & Architecture Assessment

**Datum:** 8 augustus 2026  
**Scope:** WBD Workspace en Sport 2000 Sportpaleis Workspace  
**Status:** assessment en ontwerp gereed; geen implementatie of externe actie uitgevoerd  
**Hoofdregel:** één generieke platformcapability, met organisatiegebonden configuratie

## Bewijsstatus

- **VERIFIED** — rechtstreeks aangetroffen in repositorycode of canonieke lokale documentatie.
- **DOCUMENTED BUT NOT VERIFIED** — lokaal gedocumenteerd, maar in deze preflight niet operationeel of extern bevestigd.
- **UNKNOWN** — niet aantoonbaar; er is niet gegokt.
- **RECOMMENDATION** — voorgestelde toekomstige toestand, nog niet gebouwd.

## 1. Executive summary en huidige staat

Er is **geen bestaande operationele Mail Foundation** gevonden. De repository bevat geen SMTP- of IMAP-client, geen Node-maillibrary, geen PHP `mail()`-implementatie, geen transportadapter, geen mailqueue en geen server-side template-renderer voor e-mail. Er wordt nu geen mail vanuit een Workspace verzonden. **VERIFIED**

Er bestaan wel sterke, herbruikbare bouwstenen:

1. Sportpaleis bewaart beheerbare ontvangst- en gereedtekst, kent communicatiestatussen en koppelt een bounce aan Attention. Dit is domeinvoorbereiding, geen transport.
2. De WBD-factuurflow maakt een factuur expliciet definitief, vergrendelt haar inhoud en genereert dezelfde definitieve PDF server-side. Dit is de juiste bron voor een toekomstige bijlage.
3. De Sportpaleis-service heeft server-side sessies, rollen, CSRF, same-origincontrole, audit, revisies en idempotency.
4. Direct Print bevat een bewezen veiligheidsprincipe voor een onzekere uitgaande overdracht: `UNKNOWN_PARTIAL_SEND` is terminaal en vereist menselijke review.
5. Atlas Connectors heeft bruikbare adapter-, foutcategorie-, provenance-, status- en observabilitypatronen. Het generieke connector-retrybeleid mag niet rechtstreeks op SMTP-send worden toegepast.
6. De Workspace-runtime valideert environmentconfig en rapporteert toekomstige secretgebonden dependencies alleen als geconfigureerd/niet-geconfigureerd. Mailvelden ontbreken nog.
7. De lokale infrastructuurdocumentatie beschrijft TransIP-mail voor WBD, inclusief SMTP over SSL, MX, SPF, DKIM en DMARC.

De aanbevolen architectuur is daarom:

```text
Workspace use case
        ↓
MailRequest (organisatie + context + intentie)
        ↓
server-side permission policy
        ↓
organization mail configuration
        ↓
versioned template + allowlisted context
        ↓
renderer (subject + HTML + plain text)
        ↓
durable MailAttempt + idempotency reservation
        ↓
MailTransport
  ├─ CaptureTransport (local/test)
  └─ AuthenticatedSmtpTransport (later, after GO)
        ↓
safe result classification
        ↓
history/audit + context event + observability event
```

**Aanbeveling:** GO voor een volgende, expliciet goedgekeurde **lokale capture-only implementatiefase** van de generieke engine. NO-GO voor echte SMTP, externe ontvangers, credentials, DNS of deployment totdat de blockers in sectie 19 zijn gesloten.

## 2. Onderzochte bronnen

Belangrijkste lokale bronnen:

| Bron | Relevantie | Bevinding |
|---|---|---|
| `website/package.json` en lockfile | dependencies en runtime | geen maillibrary; Node/TypeScript-basis aanwezig |
| `website/scripts/sportpaleis-pilot-foundation.mjs` | auth, rollen, audit, idempotency, communicatie | herbruikbare serverpatronen; geen send |
| `website/src/sportpaleis-workspace.ts` | Sportpaleis-beheer/UI | mailcopy beheerbaar; expliciet foundation-only |
| `website/src/sportpaleis/workspace-data.ts` | Sportpaleis-contract | communicatie- en instellingenvelden aanwezig |
| `website/scripts/wbd-invoice-development-api.mjs` | factuurstatus en PDF | definitieve, vergrendelde PDF server-side beschikbaar |
| `invoices/wbd/invoice.py` en `invoices/wbd/README.md` | factuurbron | concept/final-validatie en vaste PDF-generator |
| `website/src/wbd-dossier-store.ts` | organisaties en contacthistorie | organisatie-ID en handmatige contactnotities; browserlokale opslag |
| `website/src/sportpaleis/direct-print/lifecycle.ts` | onzekere uitgaande overdracht | bewezen `UNKNOWN_PARTIAL_SEND`-patroon |
| `website/src/atlas-connectors.ts` | adapters, fouten, history, observability | conceptueel herbruikbaar, retry niet rechtstreeks herbruikbaar |
| `website/scripts/workspace-runtime-config.mjs` | environment/secrets | veilige configuratiebasis; mail nog niet gemodelleerd |
| `website/sportpaleis-server/schema.mysql.sql` | pilotdatamodel | org, rollen, audit en idempotency; schema is ouder dan huidige winkelrol |
| `docs/atlas/PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md` | mailhosting | WBD TransIP SMTP/IMAP en mailauth gedocumenteerd |
| `docs/atlas/PROJECT-002C-DNS-CANONICAL-MAIL-AUTH-HYGIENE.md` | sender-/DNS-bewijs | WBD mailauth gedeeltelijk bewezen; echte alignment nog open |
| `docs/atlas/PROJECT-002C-WORKSPACE-ARCHITECTURE-INPUT.md` | platformgrenzen | organisation-first, deny-by-default, secrets en audit |
| `docs/atlas/PROJECT-002C-ACCESS-DEPLOYMENT-CREDENTIAL-OPERATIONS.md` | credentialgovernance | environment- en organisatiegebonden secretmetadata |
| Sportpaleis 006–008 documenten | functionele historie | mailconnector expliciet nog niet gebouwd/geactiveerd |

Niet onderzocht of gebruikt: mailboxinhoud, wachtwoorden, providerlogin, Bitwarden-inhoud, private configuratie, echte mailheaders, productiecredentials of live SMTP-connectiviteit.

## 3. Gevonden bestaande mail- en communicatiecode

### 3.1 Sportpaleis

**Aanwezig en herbruikbaar**

- `receiptMailText` en `readyMailText` bestaan als beheerbare instellingen.
- De standaardcopy noemt circa drie werkdagen zonder harde levergarantie.
- De gereedcopy noemt ophalen en wasinstructies.
- Orders hebben kanalen `receipt` en `ready` met statussen `NOT_SENT`, `SENT`, `DELIVERED`, `BOUNCED` en `FAILED`.
- Een `BOUNCED` status kan `Attention: E-mail niet bezorgd — klant bellen` veroorzaken.
- Een statuswijziging wordt in orderhistorie en audit vastgelegd.
- Winkelmedewerker, productie en admin zijn server-side onderscheiden.

**Beperking**

`recordCommunicationStatus()` registreert alleen een aangeleverde status. Het bewijst niet dat een transport heeft verzonden en mag later niet los van de Mail Engine als verzendbewijs worden gebruikt. Providerreferenties zijn nu vrije input. De toekomstige engine moet deze status zelf server-side afleiden en het context-event uit het definitieve `MailAttempt` publiceren.

### 3.2 WBD facturen

**Aanwezig en herbruikbaar**

- Conceptfacturen en definitieve facturen zijn gescheiden.
- Definitief maken vereist een expliciete bevestiging.
- Blockers verhinderen onveilige finalisatie.
- Definitieve inhoud is vergrendeld en kan niet via de normale flow worden verwijderd of gewijzigd.
- De definitieve PDF wordt server-side via de bestaande Python-generator gemaakt.
- De PDF heeft een bekende server-side locatie en downloadroute.
- Een bestaande definitieve factuur kan veilig opnieuw worden geopend en de PDF kan opnieuw worden opgebouwd.

**Semantische schuld**

De huidige factuurdata gebruikt `workspace.status: "sent"` voor de opslaggroep “Verzonden”, terwijl de README expliciet zegt dat geen e-mail wordt verstuurd. De Mail Foundation mag dit veld niet als mailbewijs behandelen. Voor implementatie is een migratie/adapter nodig naar bijvoorbeeld:

- factuurstatus: `FINALIZED`;
- mailstatus: afgeleid uit afzonderlijke `mail_attempts`.

De factuurlogica en PDF-generator worden niet opnieuw gebouwd.

### 3.3 WBD dossiers en communicatie

WBD kan een handmatig contactmoment van type `e-mail` registreren. Dit is een browserlokale dossiernotitie, geen verzendactie en geen betrouwbare mailhistorie. Organisatie-ID’s zijn bruikbaar als domeinreferentie, maar de huidige IndexedDB-opslag is niet geschikt als live multi-user mailaudit.

### 3.4 Wat niet is gevonden

- geen SMTP-transport;
- geen IMAP-connector;
- geen PHP `mail()`;
- geen PHPMailer;
- geen Nodemailer of vergelijkbare dependency;
- geen server-side mailtemplate-renderer;
- geen MIME-messagebuilder;
- geen attachmenttransport;
- geen bounce/webhookverwerking;
- geen mailqueue;
- geen echte WBD- of Sportpaleis-mailhistorietabel;
- geen productie-mailsecretschema.

## 4. Herbruikbaar, prototype en te vervangen

| Onderdeel | Classificatie | Besluit |
|---|---|---|
| Sportpaleis receipt/ready copy | herbruikbare domeininput | migreren naar organisatiegebonden, versioned templates |
| Sportpaleis communicatiestatus | prototype/foundation | vervangen door statusprojectie vanuit `MailAttempt`; UI-termen kunnen blijven |
| Sportpaleis RBAC/CSRF/audit/idempotency | veilig referentiepatroon | hergebruiken in gedeelde platformservice |
| WBD definitieve factuur/PDF | herbruikbare broncapability | via factuur-ID en server-side resolver koppelen |
| WBD `status: sent` | misleidende lokale semantiek | niet hergebruiken als mailstatus; adapter/migratie vereist |
| WBD dossier “e-mailcontact” | handmatige notitie | niet als verzendbewijs gebruiken |
| Direct Print `UNKNOWN_PARTIAL_SEND` | sterk veiligheidsprincipe | vertalen naar mailattempt-state machine |
| Atlas Connector adapter/fouten/history | conceptueel herbruikbaar | transportinterface en events volgen patroon; fetch-retry niet kopiëren |
| Workspace runtime-config | veilig configuratiepatroon | uitbreiden met secretreferenties en mailcapabilitystatus |
| Sportpaleis JSON pilotstore | lokale reviewopslag | bruikbaar voor fixtures; niet de live generieke mailstore |
| WBD lokale file/IndexedDB API’s | lokale prototypes | live mail vereist gedeelde server-side auth, DB en tenantisolatie |
| `sportpaleis-server/schema.mysql.sql` | oudere pilotkandidaat | niet blind uitbreiden; huidige `store`-rol ontbreekt in dit schema |

## 5. Hosting- en mailomgeving

### 5.1 WBD

| Eigenschap | Bevinding | Status |
|---|---|---|
| Provider/hostingrichting | TransIP voor WBD website en zakelijke e-mail | VERIFIED uit lokale inventaris |
| Maildomein | `webuildanddesign.nl` | VERIFIED |
| Publiek WBD-adres | `info@webuildanddesign.nl` | DOCUMENTED; SMTP-identiteit niet getest |
| SMTP-host | `smtp.transip.email` | DOCUMENTED BUT NOT VERIFIED in deze preflight |
| SMTP-poort/TLS | `465`, implicit TLS/SSL | DOCUMENTED BUT NOT VERIFIED |
| IMAP | `imap.transip.email:993`, SSL | DOCUMENTED; expliciet later |
| MX | `mx.transip.email`, prioriteit 10 | VERIFIED in lokale DNS-baseline |
| SPF | `include:_spf.transip.email ~all` | VERIFIED |
| DKIM | TransIP A/B bruikbaar; C-target conflict | VERIFIED/CONFLICT |
| DMARC | `p=none`, geen rapportageadres | VERIFIED |
| Authenticated SMTP | providerinstellingen wijzen erop; credential/login niet getest | PARTIAL |
| Outbound SMTP vanuit toekomstige Workspace-runtime | niet getest en runtime nog niet geprovisiond | UNKNOWN |
| Providerlimieten/volume/rate | niet aangetroffen | UNKNOWN |

De bestaande TransIP-mailvoorziening is een plausibele eerste transportbasis. Dat is nog geen live-readinessbewijs. Eerst moeten mailboxeigendom, SMTP-authenticatie, envelope/header alignment, verzendlimieten en outbound bereik vanaf de gekozen runtime menselijk en gecontroleerd worden bevestigd.

### 5.2 Sportpaleis

| Eigenschap | Bevinding | Status |
|---|---|---|
| Eigen concreet maildomein/provider | niet aangetoond in de WBD/TransIP-inventaris | UNKNOWN |
| Afzendernaam/adres | niet gevalideerd | UNKNOWN |
| SMTP-host/poort/TLS | niet gedocumenteerd | UNKNOWN |
| SPF/DKIM/DMARC | niet onderzocht of aangeleverd | UNKNOWN |
| Bestaande mailbox | niet bevestigd | UNKNOWN |
| Authenticated SMTP | niet bevestigd | UNKNOWN |
| Demo-accounts `@sportpaleis.nl` | alleen applicatie-fixtures | geen bewijs van mailbox of sender |

Sportpaleis blijft de eerste klantconfiguratie, maar levert geen generieke transportaannames. Zonder gevalideerde senderconfiguratie is echte Sportpaleis-mail NO-GO.

## 6. Voorgestelde generieke architectuur

### 6.1 Modules

```text
mail-domain/
  MailRequest
  MailAttempt
  MailResult
  MailStatus
  MailPolicy

mail-application/
  PrepareMail
  PreviewMail
  SendMail
  QueryMailHistory
  ResendAfterConfirmedFailure

mail-templates/
  TemplateRegistry
  TemplateRenderer
  ContextSchemaValidator
  BrandLayoutRegistry

mail-transports/
  MailTransport
  CaptureTransport
  AuthenticatedSmtpTransport

mail-infrastructure/
  OrganizationMailConfigRepository
  MailAttemptRepository
  AttachmentResolverRegistry
  SecretReferenceResolver
  MailEventPublisher
```

De engine kent alleen generieke contexttypes en resolvers. Zij weet niet wat een rugnummer, productieprofiel of factuurberekening is.

### 6.2 Kerncontracten

Conceptueel:

```ts
type MailRequest = {
  organizationId: string;
  context: { type: string; id: string; revision?: string };
  templateId: string;
  recipient: { address: string; displayName?: string };
  variables: Record<string, unknown>;
  attachmentRefs: TrustedAttachmentReference[];
  initiatedByUserId: string;
  idempotencyKey: string;
};

type OrganizationMailConfiguration = {
  organizationId: string;
  environment: "local" | "test" | "staging" | "production";
  enabled: boolean;
  sender: { displayName: string; address: string; replyTo?: string };
  transport: { type: "capture" | "smtp"; secretReference?: string };
  allowedTemplateIds: string[];
  brandLayoutId: string;
  recipientPolicy: "test-only" | "transactional";
};

interface MailTransport {
  send(message: RenderedMail, attempt: MailAttempt): Promise<TransportResult>;
}
```

De server leidt `organizationId`, actor, rollen, contextobject en toegestane ontvanger af uit de actieve sessie en repositories. De browser mag geen transport, sender, secretreferentie, attachmentpad, willekeurige templatecode of providerstatus bepalen.

### 6.3 Opslagmodel

Minimaal duurzaam relationeel model:

- `mail_organization_configs` — niet-geheime organisatieconfiguratie;
- `mail_templates` — logisch template-ID en organisatie;
- `mail_template_versions` — immutable onderwerp/HTML/plain text/schema/status;
- `mail_requests` — intentie, context, recipient, templateversie, actor en idempotency;
- `mail_attempts` — iedere transportpoging en uitkomst;
- `mail_attachments` — vertrouwde referentie, MIME, grootte, hash en bestandsnaam;
- `mail_events` — append-only status-/auditprojectie;
- unieke constraint op `organization_id + idempotency_key`;
- indexes op organisatie/context, recipient-hash, status en tijd.

Volledige body- en attachmentbytes horen niet in auditlogs. In local/test mag CaptureTransport een testartefact bewaren. In productie bewaart de engine standaard alleen templateversie, variabelen-/renderhash, onderwerp of onderwerphash volgens retentiebeleid, recipient, providerreferentie en resultaat. Als een juridisch vereiste exacte inhoudsretentie vraagt, volgt daarvoor een apart versleuteld en beperkt toegankelijk ontwerp.

## 7. Organization mail configuration

### 7.1 Generieke regels

- Configuratie is altijd gekoppeld aan `organizationId` en environment.
- Organisatiegegevens staan niet hardcoded in de engine.
- Sender, reply-to, templateallowlist, brandlayout en transportreferentie zijn data/configuratie.
- SMTP-wachtwoord en gebruikersnaam worden alleen via een secretreferentie opgehaald.
- Eén organisatie kan later meerdere gecontroleerde senderprofielen hebben, maar implementatie 001 start met maximaal één actief transactioneel profiel per organisatie/environment.
- Een organisatieconfiguratie kan afzonderlijk worden uitgeschakeld zonder andere organisaties te raken.
- De engine controleert dat `header.from` binnen de voor die organisatie goedgekeurde senderidentiteiten valt.

### 7.2 Voorlopige WBD-configuratie

| Veld | Voorlopige waarde |
|---|---|
| organization | `we-build-and-design` |
| display name | `We Build And Design` |
| sender address | kandidaat `info@webuildanddesign.nl`; menselijke bevestiging vereist |
| transport | local/test: capture; productie: TransIP SMTP kandidaat |
| templates | `wbd.invoice.final` en later andere WBD-transacties |
| brand | WBD maillayout |
| productie-enabled | `false` tot SMTP-canary en GO |

### 7.3 Voorlopige Sportpaleis-configuratie

| Veld | Voorlopige waarde |
|---|---|
| organization | `sportpaleis` |
| display name | `Sport 2000 Sportpaleis B.V.` |
| sender address | UNKNOWN |
| transport | capture tot provider/sender is gevalideerd |
| templates | order ontvangen, bestelling klaar, handmatig contact |
| brand | Sportpaleis-organisatielayout volgens bestaande Workspace-designauthority |
| productie-enabled | `false` |

## 8. Secretsmodel

### 8.1 Regels

- nooit in frontend, clientbundle of API-response;
- nooit in Git, documentatie, screenshot of gegenereerd reviewartefact;
- nooit in audit, providerresultaat, exceptiontekst of observability-event;
- per organisatie, environment en capability gescheiden;
- secretwaarden alleen bij transportinitialisatie in servergeheugen;
- logs redigeren URI-auth, SMTP-user, authmethodedata en headers;
- productieconfiguratie buiten DocumentRoot of via de gekozen managed secretstore;
- local/test gebruikt CaptureTransport en heeft geen SMTP-secret nodig;
- productie start niet met `capture` en start geen SMTP-config zonder complete secretreferentie;
- rotatie vervangt de secret achter de referentie; template- en mailhistorie bevatten alleen secretmetadata/status.

### 8.2 Later menselijk benodigde gegevens

Per organisatie, zonder ze nu op te vragen:

1. gevalideerde SMTP-host;
2. poort en TLS-modus;
3. authenticatiegebruikersnaam/mailbox-ID;
4. SMTP-wachtwoord of provider-appcredential;
5. goedgekeurd header-from-adres;
6. optioneel reply-to-adres;
7. envelope-from/return-pathbeleid indien provider dit ondersteunt;
8. providerlimieten en toegestane use case;
9. secretowner, recoveryroute, reviewdatum en rotatietrigger.

Het bestaande access-registerpatroon wordt gebruikt om alleen secretklasse, eigenaar, scope en status te registreren; nooit de waarden.

## 9. Permissions

### 9.1 Generieke capabilities

- `mail.preview`
- `mail.send.transactional`
- `mail.send.order.received`
- `mail.send.order.ready`
- `mail.send.order.manual-contact`
- `mail.send.invoice.final`
- `mail.history.view.context`
- `mail.history.view.organization`
- `mail.template.manage`
- `mail.sender.manage`
- `mail.retry.confirmed-failure`

Autorisatie vindt server-side plaats op actor + actieve organisatie + contextobject + capability. UI-verbergen is alleen presentatie.

### 9.2 Sportpaleis

| Rol | Preview | Verzenden | Historie | Template/config |
|---|---|---|---|---|
| Winkelmedewerker | orderontvangst en toegestaan handmatig bericht | alleen vanuit toegestane eigen ordercontext | contextgebonden | geen |
| Patrick/Productie | gereedbericht en toegestaan productiecontact | alleen relevante ordercontext | contextgebonden | geen |
| Kevin/Admin | alle relevante previews | organisatiebrede transactionele use cases | organisatiebreed | templates; senderconfig alleen via afzonderlijke beheerpolicy |
| WBD support | standaard geen send | geen, tenzij expliciete tijdelijke supportcapability | alleen task-scoped audit indien toegestaan | geen secrets |

### 9.3 WBD

Alleen een expliciet bevoegde WBD-rol mag een definitieve factuurmail voorbereiden en verzenden. De huidige WBD Workspace heeft nog geen productie-auth/RBAC voor deze capability; daarom is live WBD-mail geblokkeerd. Een factuur moet server-side `document_status: final`, vergrendeld en blocker-vrij zijn. Een concept mag nooit als bijlage worden gebruikt.

## 10. Template Foundation

### 10.1 Model

Iedere templateversie bevat:

- `organizationId`;
- logisch template-ID;
- semantische versie/revision;
- contextschema met toegestane paden;
- onderwerp;
- HTML-body;
- plain-text-body;
- brandlayout-ID;
- status `DRAFT`, `ACTIVE` of `RETIRED`;
- auteur/goedkeurder/timestamps;
- contenthash.

Een eenmaal gebruikte versie is immutable. Wijzigen maakt een nieuwe versie.

### 10.2 Veilig renderen

- uitsluitend eenvoudige placeholders zoals `{{ customer.name }}`;
- geen `eval`, imports, loops met executable code of arbitrary helpers;
- ontbrekende vereiste variabele is een renderfout, geen lege tekst;
- HTML-escaping standaard aan;
- alleen vooraf gecontroleerde layoutcomponenten mogen trusted HTML leveren;
- onderwerp en afzendernaam weigeren CR/LF om header injection te voorkomen;
- recipient wordt met een bewezen parser/normalizer gevalideerd;
- plain text is verplicht en wordt niet blind uit onbetrouwbare HTML gestript;
- preview gebruikt exact dezelfde renderer en templateversie als send;
- send toont recipient, sender, onderwerp, context, bijlagen en templateversie vóór bevestiging.

## 11. Concrete Sportpaleis-use-cases

### 11.1 `sportpaleis.order.received.v1`

Context:

- `customer.name`;
- `order.number`;
- `order.items[]` met artikel, aantal en relevante bedrukking;
- `organization.name`;
- `organization.processingDays`.

Inhoud:

- bevestigt dat kleding/order is ontvangen;
- toont ordernummer en gecontroleerd overzicht;
- noemt “ongeveer 3 werkdagen” of de beheerde organisatie-indicatie;
- vermeldt dat de klant bericht krijgt wanneer de bestelling klaar ligt;
- formuleert geen harde levergarantie.

Trigger blijft in de eerste implementatie handmatig. Geen automatische mail direct na orderaanmaak.

### 11.2 `sportpaleis.order.ready.v1`

Context:

- klantnaam;
- ordernummer;
- afhaallocatie/informatie;
- relevant orderoverzicht;
- goedgekeurde wasinstructies.

Inhoud:

- “Uw bestelling ligt klaar om opgehaald te worden bij Sportpaleis.”;
- duidelijk herkenbaar ordernummer;
- mail mag als extra herkenning dienen, maar barcode/order blijft afzonderlijk;
- kleding bij voorkeur binnenstebuiten wassen;
- voorzichtig wassen volgens kleding- en drukinstructies;
- niet in de droger vanwege risico op schade/verzwakking van bedrukking;
- definitieve tekst vereist Sportpaleis-goedkeuring.

### 11.3 `sportpaleis.order.manual-contact.v1`

Handmatig gekozen template voor een vraag of probleem. Geen automatische trigger en geen vrije executable template. Vrije aanvulling krijgt een korte lengtebeperking, wordt ge-escaped en wordt in preview getoond.

## 12. Concrete WBD-use-case

### `wbd.invoice.final.v1`

Flow:

1. gebruiker opent een bestaande definitieve factuur;
2. server controleert organisatie, bevoegdheid, `document_status`, lock en blockers;
3. server resolveert klantadres uit de factuur/context en laat recipient bevestigen volgens policy;
4. templatepreview toont onderwerp, begeleidende tekst en PDF-metadata;
5. attachmentresolver haalt de definitieve PDF via factuur-ID op;
6. engine legt `MailRequest` en attempt vast;
7. transport verzendt pas na expliciete bevestiging;
8. resultaat en historie worden gekoppeld aan factuur én organisatie.

De factuurcalculator, nummering, finalisatie en PDF-generator blijven buiten de Mail Engine. De engine ontvangt uitsluitend een vertrouwde context- en attachmentreferentie.

## 13. Bijlagen

### 13.1 Veilige attachmentreferentie

```ts
type TrustedAttachmentReference = {
  resolver: "wbd-final-invoice";
  objectId: string;
  expectedRevision?: string;
};
```

De browser levert nooit een bestandspad.

### 13.2 Eerste policy

- alleen WBD definitieve factuur-PDF;
- server-side resolver controleert organisatie en factuurstatus opnieuw;
- MIME allowlist: initieel alleen `application/pdf`;
- extensie én magic bytes controleren;
- veilige bestandsnaam zonder padtekens/control characters;
- SHA-256 vastleggen;
- maximaal 10 MiB per bestand en 15 MiB totaal als conservatieve startlimiet; providerlimiet vóór livegang bevestigen;
- attachmentbytes niet in logs, audit of API-JSON;
- ontbrekende/gewijzigde PDF blokkeert send;
- hash en metadata horen bij de preview en worden vóór send opnieuw gevalideerd.

Sportpaleis-feedbackbijlagen en willekeurige uploads zijn deferred.

## 14. Send history en audit

Minimaal per request/attempt:

- organization-ID;
- contexttype, context-ID en revision;
- template-ID en versie;
- recipientadres en optioneel genormaliseerde/hashingvelden;
- senderprofiel-ID en header-from;
- actor/user-ID;
- requested/started/completed timestamps;
- status en veilige foutcategorie;
- transporttype;
- provider message/reference-ID indien veilig;
- RFC Message-ID;
- idempotency key/hash;
- attachmentmetadata/hashes;
- renderhash;
- superseded/resendrelatie;
- release-ID en environment.

Niet opslaan in algemene audit:

- SMTP-password/username;
- AUTH-data;
- volledige providerresponses als die recipient/content kunnen bevatten;
- volledige mailbody;
- attachmentbytes;
- cookies, tokens of requestheaders.

Contextprojecties mogen tonen:

```text
Orderbevestiging verzonden — 8 aug 10:32 — door medewerker X
Gereedmelding verzonden — 10 aug 15:04 — door Patrick
```

Deze projectie komt uitsluitend uit een definitieve engine-status, niet uit browserinput.

## 15. Statusmodel, fouten, retry en idempotency

### 15.1 State machine

```text
DRAFT
  → PREVIEWED
  → READY_TO_SEND
  → SENDING
      ├─ SENT_CONFIRMED
      ├─ FAILED_CONFIRMED
      └─ UNKNOWN_PARTIAL_SEND

Later, via delivery connector:
SENT_CONFIRMED → DELIVERED | BOUNCED
```

`CANCELLED`, `RENDER_FAILED` en `POLICY_DENIED` zijn terminale pre-senduitkomsten.

### 15.2 Classificatie

**Confirmed success**

- SMTP-server heeft een positieve finale acceptatiereactie gegeven;
- attempt wordt `SENT_CONFIRMED`;
- dit is acceptatie door transport, niet gegarandeerde inboxdelivery.

**Confirmed failure**

- render/policy/attachment faalt vóór transport; of
- connect/auth/TLS faalt aantoonbaar vóór message submission; of
- SMTP geeft een definitieve reject die geen acceptatie inhoudt.

Attempt wordt `FAILED_CONFIRMED` of een specifiek pre-sendresultaat. De context zelf blijft ongewijzigd.

**Unknown/partial outcome**

- timeout/socketverlies tijdens of na DATA;
- processtoring nadat submission begon maar vóór veilige resultaatopslag;
- providerantwoord is niet betrouwbaar te classificeren.

Attempt wordt `UNKNOWN_PARTIAL_SEND`. Geen automatische retry. Workspace Attention:

```text
Verzenduitkomst onbekend — controleer mailhistorie/provider voordat u opnieuw verzendt
```

### 15.3 Retrybeleid voor implementatie 001

- geen automatische retry nadat SMTP message submission is gestart;
- render- en validatiefouten worden gecorrigeerd, niet automatisch herhaald;
- een aantoonbare pre-connect tijdelijke fout mag in een latere versie hoogstens begrensd worden herprobeerd, maar implementatie 001 start met nul automatische transportretries;
- `FAILED_CONFIRMED` kan alleen door een bevoegde gebruiker handmatig opnieuw worden geprobeerd;
- handmatige resend maakt een nieuwe attempt met `supersedesAttemptId` en expliciete bevestiging;
- `UNKNOWN_PARTIAL_SEND` blokkeert resend totdat een bevoegde mens de uitkomst heeft onderzocht en een gemotiveerde override vastlegt;
- de engine genereert vóór send een stabiele RFC Message-ID voor traceerbaarheid, maar behandelt die niet als garantie tegen providerduplicates.

### 15.4 Idempotency

- request reserveert een unieke `organizationId + idempotencyKey` vóór rendering/send;
- een identieke browser/API-submit retourneert de bestaande request/attempt;
- dezelfde key met andere recipient, templateversie, contextrevision of attachmenthash wordt geweigerd;
- contextrevision voorkomt dat een oude preview na order-/factuurwijziging wordt verzonden;
- DB-write vóór transport en terminale statuswrite na transport;
- een aangetroffen niet-terminale `SENDING` na procesherstart wordt `UNKNOWN_PARTIAL_SEND`, niet opnieuw verzonden.

## 16. Veilige lokale teststrategie

### 16.1 CaptureTransport

De eerste implementatie gebruikt een ingebouwde `CaptureTransport`:

- geen netwerkverbinding;
- accepteert uitsluitend local/test environment;
- weigert productie-echte ontvangers of herschrijft ze naar gereserveerde `.invalid` fixtures;
- rendert exact onderwerp, HTML, plain text en MIME-attachments;
- bewaart testartefacten alleen in een expliciete lokale tijdelijke/capturemap;
- markeert zichtbaar `CAPTURED_NOT_SENT`;
- kan foutscenario’s deterministisch simuleren;
- bevat geen SMTP-credentials.

### 16.2 Verplichte tests

- organisatie-isolatie WBD/Sportpaleis;
- negatieve permissiontests per rol;
- context- en templateallowlist;
- ontbrekende variabele en HTML-escaping;
- header injection;
- recipientnormalisatie;
- idempotente dubbele submit;
- gewijzigde context na preview;
- confirmed success/failure/unknown partial;
- procesonderbreking tijdens `SENDING`;
- handmatige resendgrens;
- factuurconcept geblokkeerd;
- definitieve factuur/PDF toegestaan;
- attachment MIME, magic bytes, grootte, hash en bestandsnaam;
- geen secrets/body/attachmentdata in logs;
- event- en auditprojectie;
- CaptureTransport kan nooit echte mail versturen.

Een internetgebaseerde testmailbox is niet nodig voor deze fase.

## 17. IMAP en incoming mail — expliciet later

IMAP wordt niet onderdeel van Mail Foundation 001.

Toekomstige extensie:

```text
IncomingMailConnector
        ↓
mailbox adapter (IMAP of provider API)
        ↓
message normalization
        ↓
organization + context matching
        ↓
quarantine / human review
        ↓
Workspace context event
```

Incoming mail gebruikt eigen credentials, checkpoints, deduplicatie, malware-/attachmentbeleid, retentie en autorisatie. Het deelt organisatieconfiguratie en auditprincipes, maar niet de uitgaande send-state machine. Geen inbox, sync of archiefdownload wordt nu gebouwd.

## 18. Atlas/observability, security en privacy

### 18.1 Events en metrics

Events:

- `mail.preview.created`;
- `mail.send.attempted`;
- `mail.send.succeeded`;
- `mail.send.failed_confirmed`;
- `mail.send.unknown_partial`;
- `mail.render.failed`;
- `mail.policy.denied`;
- `mail.delivery.bounced` — later;
- `mail.queue.backlog` — pas wanneer een queue bestaat.

Veilige dimensies:

- organization-ID;
- template-ID/versie;
- contexttype, niet noodzakelijk context-ID;
- environment en release-ID;
- foutcategorie;
- duur;
- transporttype;
- status.

Geen recipient, onderwerp, body, variabelen, attachmentnaam/bytes, providersecret of SMTP-user in algemene metrics.

Atlas mag constateren “Sportpaleis gereedmail faalt sinds release X” en Attention voorstellen. Atlas mag nooit credentials/config wijzigen, mail opnieuw verzenden, DNS aanpassen of infrastructuur muteren.

### 18.2 Securityreview

| Risico | Ontwerpmaatregel |
|---|---|
| credentiallekkage | secretreferenties, server-only, redaction, geen API/log/auditwaarde |
| cross-organization send | immutable orgcontext, deny-by-default, repository/policy per org |
| recipientmanipulatie | contextgebonden resolver, validatie, preview, serverpolicy |
| header injection | CR/LF weigeren; bewezen messagebuilder |
| template injection/XSS | allowlisted placeholders, escaping, geen executable templatecode |
| onveilige HTML | vaste layouts, sanitized/escaped variabelen, plain text verplicht |
| arbitrary attachment path | trusted resolver + object-ID; nooit browserpad |
| schadelijke/grote attachment | MIME/magic/size/hash/filename-policy; later malwarecontrole waar nodig |
| dubbele mail | durable idempotency + terminale unknown-status + menselijke resend |
| mass-send/campaign misuse | alleen single-context transactional API; rate limits; geen lijsten/campagnes |
| CSRF/sessionmisbruik | server-auth, CSRF en same-origin volgens Workspace Foundation |
| privilege escalation | capabilitytests en negatieve roltests |
| gevoelige logs | structured allowlist logging; geen raw SMTP/provider payload |
| PII-retentie | minimale metadata, vastgesteld retentiebeleid, orggebonden query/delete |
| environmentmix | capture-only local/test; production startup guards; gescheiden secrets |
| deliverabilityblindheid | providerreferentie, veilige status, later deliveryconnector en Attention |

Dit is transactionele mail. Nieuwsbrieven, campagnes, mailinglijsten, trackingpixels, marketingprofilering en WhatsApp vallen buiten scope.

### 18.3 Retentierichting

Vóór livegang moet een menselijke eigenaar bewaartermijnen vastleggen. Voorlopige richting:

- operationele attemptmetadata zolang order/factuur plus redelijke nazorg/audit dit vereist;
- recipient niet langer dan nodig;
- geen standaard langdurige opslag van body/attachmentbytes;
- testcapture bevat alleen synthetische data en wordt periodiek verwijderd;
- bounce/deliverymetadata later afzonderlijk beoordelen.

## 19. Kosten, fasering, blockers en GO/NO-GO

### 19.1 Kostenpreflight

**Bestaand / €0 extra aangetoond**

- deze preflight en repositoryanalyse;
- bestaande Node/TypeScript- en Pythonbasis;
- bestaande WBD-factuur/PDF-generator;
- bestaande lokale Sportpaleis-role/audit/idempotencypatronen;
- CaptureTransport en lokale synthetische tests in een volgende implementatiefase;
- huidige TransIP-mailvoorziening bestaat, maar inbegrepen transactioneel gebruik is nog niet gevalideerd.

**Noodzakelijk voor eerste live mail**

- menselijke provider-/mailboxverificatie;
- gevalideerde senderidentiteit en credentialprovisioning;
- veilige live Workspace-runtime met server-auth, DB, secretinjectie en audit;
- outbound SMTP-connectiviteitstest vanaf exact die runtime;
- beperkte canary, deliverability/alignmentcheck en operationeel runbook;
- mogelijk een afzonderlijke transactionele mailbox/alias als eigenaar/provider dat vereist — kosten UNKNOWN.

**Later/optioneel**

- externe transactionele provider bij aantoonbare volume-, reputatie-, webhook-, bounce- of SLA-behoefte;
- queue/worker bij werkelijk volume of beschikbaarheidseis;
- DMARC-reportingservice;
- incoming mail/IMAP;
- geavanceerde observability.

Er is geen bewijs dat SendGrid, Mailgun, Postmark, SES of een andere betaalde provider nu nodig is. Er is evenmin voldoende bewijs om extra kosten definitief uit te sluiten.

### 19.2 Implementatiefasen

| Fase | Scope | Externe impact | Gate |
|---|---|---|---|
| 001 — deze preflight | inventarisatie en ontwerp | geen | gereed |
| 002 — Generic Mail Core | contracten, policies, templates, DB-migratieontwerp, CaptureTransport, tests | geen mail/netwerk | expliciete implementatie-GO |
| 003 — Workspace adapters | WBD-factuurpreview en Sportpaleis-orderpreview; capture-only | geen echte mail | security-/UX-review |
| 004 — SMTP adapter preflight | authenticated SMTP-adapter, secretschema, startup guards; nog geen externe ontvanger | credential/runtimevoorbereiding | aparte credential-GO |
| 005 — WBD canary | één gecontroleerde mail naar een door WBD beheerd testadres | echte mail | live-mail-GO + provider/runtimebewijs |
| 006 — Sportpaleis activation | organisatieconfig, templates goedgekeurd, één gecontroleerde canary | echte klantorganisatie-mail | Sportpaleis sender/DNS/template-GO |
| 007 — gecontroleerde livegang | transactionele use cases beperkt activeren | productie | release/rollback/observability-GO |
| later — incoming/IMAP | losse connectorfoundation | mailbox reads | afzonderlijk project |

### 19.3 Blockers voor live SMTP

1. Geen operationele Mail Engine of geselecteerde SMTP-library.
2. WBD Workspace heeft nog geen bewezen productie-auth/RBAC/tenantstore voor mail.
3. De huidige WBD API’s zijn lokale prototypes; WBD-factuur- en dossierdata zijn file/IndexedDB-gebaseerd.
4. Geen duurzame generieke multi-org maildatabase/migratie.
5. WBD SMTP-credential, mailboxrechten en actuele senderalignment zijn niet getest.
6. Outbound SMTP vanaf de toekomstige productie-runtime is UNKNOWN.
7. WBD DKIM-selector C heeft een gedocumenteerd conflict; echte gebruikte selector is niet uit headers bevestigd.
8. WBD providerlimieten, volume, rate en transactionele gebruiksvoorwaarden zijn UNKNOWN.
9. Sportpaleis senderadres, provider, SMTP, SPF, DKIM en DMARC zijn UNKNOWN.
10. Sportpaleis ontvangst-, gereed- en wascopy zijn nog niet definitief door Sportpaleis goedgekeurd.
11. WBD-factuurstatus `sent` moet van echte mailstatus worden losgekoppeld.
12. Attachmentopslag en factuurresolver moeten in de uiteindelijke serverruntime veilig worden aangesloten.
13. Retentie, supportproces, failure-Attention en resendbevoegdheid moeten operationeel worden goedgekeurd.
14. Geen SMTP-canary, rollback/runbook of onafhankelijke deliverabilitycontrole uitgevoerd.

### 19.4 GO/NO-GO

**GO — na expliciete vervolgopdracht:** bouw één generieke multi-org Mail Core met versioned templates, server-side policies, CaptureTransport, durable idempotency/state machine en tests. Sluit WBD en Sportpaleis uitsluitend via adapters aan. Verstuur in die fase niets extern.

**NO-GO:** echte SMTP-verbinding, credentials, externe ontvangers, DNS-aanpassingen, productieconfiguratie, deployment, IMAP, WhatsApp, campaigns of automatische retry na onzekere submission.

## 20. Expliciete afsluiting

```text
EXISTING MAIL FOUNDATION FOUND: NO
GENERIC MULTI-ORG DESIGN READY: YES
WBD SMTP READINESS: PARTIAL
SPORTPALEIS SMTP READINESS: UNKNOWN
SECRETS MODEL READY: YES
TRANSACTIONAL MAIL SECURITY DESIGN READY: YES
SAFE LOCAL TEST STRATEGY READY: YES
EXTERNAL PAID SERVICE REQUIRED: UNKNOWN
READY FOR MAIL IMPLEMENTATION: YES
REAL MAIL SENT: NO
PRODUCTION MUTATIONS: NO
```

`READY FOR MAIL IMPLEMENTATION: YES` betekent uitsluitend: gereed voor een apart goedgekeurde, lokale capture-only implementatiefase. Het betekent niet dat live SMTP of klantmail gereed is.

Daarna STOP en wacht op expliciete GO.
