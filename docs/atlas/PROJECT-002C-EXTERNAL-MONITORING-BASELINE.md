# Project 002C.3 — External Monitoring Baseline

**Datum:** 7 augustus 2026

**Status:** **GO — ontwerpbaseline en repositoryguardrails gereed; externe monitoring niet geactiveerd**

**Productie-impact:** geen wijzigingen; uitsluitend eenmalige read-only HTTP-controles

**Canonieke voorgangers:** `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`, `PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md` en `RELEASES/RELEASE-EVIDENCE-TEMPLATE.md`

## Bewijsstatus

- **VERIFIED** — tijdens 002C.3 rechtstreeks in de repository, via een eenmalige read-only publieke HTTP-controle of in actuele officiële providerdocumentatie vastgesteld;
- **DOCUMENTED BUT NOT VERIFIED** — in eerdere WBD-infrastructuur- of releasedocumentatie onderbouwd, maar niet opnieuw in een account of beheeromgeving gecontroleerd;
- **UNKNOWN** — niet aantoonbaar met het beschikbare bewijs;
- **RECOMMENDATION** — voorgestelde baseline; nog niet geactiveerd.

Een GO in dit document geeft geen toestemming om een account aan te maken, een abonnement af te sluiten, een monitor te activeren, een health endpoint te publiceren of productie, DNS, hosting, database, SSL, Cloudflare, accounts of rechten te wijzigen.

---

## 1. Executive Summary

WBD heeft geen aantoonbaar actief, centraal en onafhankelijk extern monitoringsysteem. De bestaande releasevalidator is technisch sterk, maar wordt doelgericht tijdens releases uitgevoerd en is geen continue monitor. TransIP bewaakt het eigen netwerk en automatiseert Let's Encrypt op webhosting, maar dat bewijst niet onafhankelijk dat de WBD-website, Experience, release-identiteit en applicatielaag bruikbaar zijn. **VERIFIED voor repository en officiële providerclaims; huidige accountconfiguratie DOCUMENTED BUT NOT VERIFIED**

De minimale baseline bestaat uit twee primaire externe HTTPS-monitors:

1. `https://webuildanddesign.nl/` — publieke website, HTTP 200, herkenbare publieke inhoud, geldige TLS en beperkte responstijd;
2. `https://experience.webuildanddesign.nl/ervaar` — Experience-ingang, HTTP 200, herkenbaar Experience-artefact, `noindex` en `no-store`, geldige TLS en beperkte responstijd.

Een derde, minimale applicatiehealthmonitor wordt pas toegevoegd nadat een afzonderlijk goedgekeurd `GET /api/health`-contract is geïmplementeerd. Dat endpoint bestaat nu niet en is in 002C.3 niet gebouwd of gepubliceerd. Databasegezondheid wordt nooit rechtstreeks extern geprobed; een toekomstige applicatiehealthcheck mag alleen bevestigen dat de bestaande applicatiebootstrap inclusief databaseverbinding functioneert en retourneert uitsluitend `{"status":"ok"}` of HTTP 503. **RECOMMENDATION**

Het attentionmodel volgt **GEZOND = STIL**:

- één mislukte check is alleen intern kandidaatbewijs;
- pas bevestigde, herhaalde uitval wordt `ATTENTION` of `URGENT`;
- één incident per target en signaal blijft open tot stabiel herstel;
- herstel sluit het incident na twee geslaagde checks en veroorzaakt hoogstens één recoverymelding;
- groene checks en periodieke succesmeldingen blijven stil.

Op basis van actuele officiële informatie is **UptimeRobot Solo** de voorkeursrichting voor de huidige eenpersoons-WBD-fase: 10 monitors, 60-secondeninterval, HTTPS/SSL, keyword-, DNS- en API-monitoring, 12 maanden retentie en e-mail/mobile meldingen voor een officieel vermelde vanafprijs van **€108 per jaar** bij jaarlijkse facturatie. UptimeRobot controleert per gewone check via drie willekeurige nodes; een incident ontstaat pas wanneer alle drie falen. De exacte checkoutprijs, contractkeuze, DPA en meldkanalen vereisen menselijke verificatie vóór aankoop. **RECOMMENDATION / HUMAN VERIFICATION REQUIRED**

**002C.3-beoordeling: GO voor de baseline; NO-GO voor activatie.** Een mens kiest accountowner, plan en recovery-onafhankelijk meldkanaal en geeft daarna een afzonderlijke `GO MONITORING ACTIVATION` voor exact benoemde targets.

---

## 2. Scope

### Binnen scope

- huidige aantoonbare monitoringsstatus en publieke productiegrenzen;
- externe availability- en TLS-baseline;
- minimale veilige applicatiehealthgrens;
- database-, dependency- en backupmonitoringgrenzen;
- `INFO`, `ATTENTION` en `URGENT` met deduplicatie, herstel en flappingbeperking;
- providervergelijking op actuele officiële bronnen;
- generiek monitoringtargetregister en JSON Schema;
- toekomstige Atlas-/Workspace-normalisatie en release-integratie;
- eenmalige read-only HTTP-controle van bekende publieke targets.

### Buiten scope

- account, proefperiode of abonnement aanmaken;
- een externe monitor of statuspagina activeren;
- health endpoint implementeren of deployen;
- productie-, DNS-, hosting-, database-, SSL-, Cloudflare-, account- of rechtenwijziging;
- backupgovernance of off-provider recovery uitvoeren;
- Workspace-interface, Atlas-connector of notificatieplatform bouwen;
- Fara of Sportpaleis als monitoringsbasis opnemen;
- secrets, credentials, tokens of private configuratie gebruiken.

---

## 3. Evidence Reviewed

### Canonieke repositorybronnen

| Bron | Gebruik | Status |
|---|---|---|
| `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md` | huidige architectuur, 002C-volgorde, monitoringgap en doelrichting | VERIFIED als repositorybron |
| `PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md` | environments, release-identiteit, echte livevalidatie en Human GO | VERIFIED als repositorybron |
| `RELEASES/RELEASE-EVIDENCE-TEMPLATE.md` | preflight-, live- en rollbackbewijs | VERIFIED als repositorybron |
| `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md` | eerste monitoringinventaris en frequentierichting | DOCUMENTED BUT NOT VERIFIED |
| `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md` | SSL-, DNS-, backup- en eenpersoonsbeheergrens | DOCUMENTED BUT NOT VERIFIED |
| `RELEASES/PRODUCTION-INCIDENT-ANALYSIS-001.md` | false negatives door een ongeschikte runner | DOCUMENTED BUT NOT VERIFIED |
| `RELEASES/PRODUCTION-VALIDATION-HARDENING-001.md` | controlehost, bewijsclassificatie en onafhankelijke routes | VERIFIED als repositorybron |
| `RELEASES/PRODUCTION-VALIDATION-HARDENING-002.md` | runnerbevoegdheid, tijdelijke fouten en activatievenster | VERIFIED als repositorybron |
| `website/release-validation.example.json` | huidige on-demand target-, control- en assertiestructuur | VERIFIED |
| `website/experience-server/api/index.php` | huidige API-bootstrap en ontbreken van een healthroute | VERIFIED |

### Eenmalige read-only publieke controle

Op **7 augustus 2026 rond 00:31 CEST** zijn vier gewone publieke HTTPS-GET/HEAD-equivalente controles uitgevoerd. Er is geen cookie, token, formulier, API-write of sessie aangemaakt.

| URL | Waarneming | Status |
|---|---|---|
| `https://webuildanddesign.nl/` | HTTP 200, nginx, HTML, herkenbare WBD-titel en publieke assetnamen | VERIFIED op controlemoment |
| `https://www.webuildanddesign.nl/` | HTTP 200 met dezelfde `ETag` en `Content-Length` als apex; geen redirect | VERIFIED op controlemoment |
| `https://experience.webuildanddesign.nl/ervaar` | HTTP 200, `X-Robots-Tag: noindex`, `Cache-Control: no-store`, HSTS/CSP en Experience-assets | VERIFIED op controlemoment |
| `https://experience.webuildanddesign.nl/` | HTTP 200 met dezelfde `ETag` en lengte als `/ervaar`; geen redirect aangetoond | VERIFIED op controlemoment |

Deze momentopname is geen continue monitoring en geen release-GO.

### Actuele officiële providerbronnen

Alle providerinformatie is opgehaald op 7 augustus 2026 en kan wijzigen.

- [UptimeRobot pricing](https://uptimerobot.com/pricing/) — planfuncties, intervallen, retentie en actuele europrijzen;
- [UptimeRobot locations and incident confirmation](https://help.uptimerobot.com/en/articles/11358522-understanding-uptimerobot-locations-and-multi-location-feature) — drie checkernodes en multi-locationgedrag;
- [UptimeRobot data retention](https://help.uptimerobot.com/en/articles/11360873-what-is-uptimerobot-data-retention-and-how-does-it-work-in-different-plans) — 3/12/24-maandsretentie;
- [UptimeRobot DPA](https://uptimerobot.com/dpa/) — verwerkingscategorieën, EU/VS-locaties en internationale waarborgen;
- [Better Stack pricing](https://betterstack.com/pricing) — monitors, SSL, API/webhooks en alertfuncties;
- [Better Stack confirmation and recovery](https://betterstack.com/docs/uptime/confirmation-and-recovery-period/) — instelbare bevestigings- en herstelperioden;
- [Better Stack security](https://betterstack.com/security) — GDPR, EU-defaultopslag en encryptieclaims;
- [StatusCake pricing](https://www.statuscake.com/pricing/) — free/Superior-functies en actuele europrijzen;
- [StatusCake confirmation servers](https://www.statuscake.com/kb/knowledge-base/statuscake-uptime-monitoring-regions-and-confirmation-servers-a-complete-guide/) — 0–3 confirmation checks;
- [StatusCake retention](https://www.statuscake.com/data-retention-policies/) — overzichts- en detailretentie;
- [TransIP storingsinformatie](https://www.transip.nl/knowledgebase/53-wil-een-netwerk-storing-melden/) — 24/7 netwerkmonitoring en dienstspecifieke e-mailmeldingen;
- [TransIP SSL voor webhosting](https://www.transip.nl/knowledgebase/7150-ssl-voor-webhosting) — automatisch actieve Let's Encrypt-certificaten;
- [TransIP Let's Encrypt](https://www.transip.nl/knowledgebase/370-wat-is-let-s-encrypt) — 90-dagenlevensduur en automatische vernieuwing.

### Bewijsgrenzen

- niet ingelogd bij TransIP of een monitoringprovider;
- providerstatus, accountinstellingen en huidige contracten niet ingezien;
- geen actieve TransIP-monitoring per applicatieroute aangetoond;
- geen serverlogs, private config, `.env` of database-inhoud gelezen;
- prijzen moeten vóór aankoop in checkout en voorwaarden menselijk worden bevestigd.

---

## 4. Current Monitoring State

| Laag | Huidige aantoonbare situatie | Bewijsstatus |
|---|---|---|
| Externe uptime | geen centrale config, account of actieve monitor aangetroffen | VERIFIED repository; externe afwezigheid DOCUMENTED BUT NOT VERIFIED |
| Releasevalidatie | sterke lokale/on-demand capture-evaluate-activate tooling | VERIFIED |
| TransIP netwerk | provider claimt 24/7 netwerkmonitoring en meldt dienstspecifieke storingen per e-mail | VERIFIED als providerclaim |
| Webhosting/applicatie | geen bewijs dat TransIP WBD-routes, bodymarkers of Experiencebruikbaarheid bewaakt | UNKNOWN |
| TLS | Let's Encrypt op webhosting automatisch actief en vernieuwend | VERIFIED als providerclaim; WBD-accountstatus DOCUMENTED BUT NOT VERIFIED |
| Certificaat-expiryalert | geen onafhankelijke WBD-expiryalert aangetoond | UNKNOWN / gap |
| Applicatiehealth | geen `health`-route in de Experience-API; bestaande routes zijn deelnemer- of adminfunctionaliteit | VERIFIED |
| Databasehealth | alleen impliciet via API-bootstrap/gebruik; geen veilige externe healthmonitor | VERIFIED in codepatroon |
| Backups | provider- en restorebewijs bestaan, maar doorlopende backupfreshnessmonitoring valt onder 002C.4 | DOCUMENTED BUT NOT VERIFIED |
| Logging | PHP logt databaseconnectiefouten server-side; geen extern errorplatform aangetoond | VERIFIED in codepatroon |

De releasevalidator wordt niet als uptimeprovider hergebruikt. Hij bewijst releases op verzoek en vereist expliciete runnercontext; monitoring observeert continu met andere doelen, retentie en alertgedrag.

---

## 5. Availability Baseline

### 5.1 Primaire targets

| Target-ID | Capability | URL | Verwachte toestand | Interval | Timeout | Bevestiging vóór aandacht |
|---|---|---|---|---:|---:|---|
| `wbd-prod-public-web` | publieke WBD-website | `https://webuildanddesign.nl/` | 200; WBD-marker aanwezig; TLS geldig | 60–300 sec | 10 sec | alle providernodes falen; daarna nog een geplande failure of tweede regio |
| `wbd-prod-experience-entry` | Experience-ingang | `https://experience.webuildanddesign.nl/ervaar` | 200; Experience-marker; `noindex`; `no-store`; TLS geldig | 60–300 sec | 10 sec | alle providernodes falen; daarna nog een geplande failure of tweede regio |

Voor UptimeRobot Solo geldt 60 seconden. Een eventuele kosteloze of andere provider met 3–5 minuten is voor de huidige fase nog bruikbaar, mits de incidentbevestiging false positives begrenst.

### 5.2 Niet als primaire uptime gebruiken

- `www.webuildanddesign.nl` is nu aantoonbaar duplicate 200 en geen redirect; dit is een 002C.5-canonicalisatiepunt, geen huidige outage;
- preview is controle-/releasecandidate en geen productiecapability;
- Workspace en Atlas hebben geen zelfstandige productiehost;
- admin-, invitation-, sessie- en write-routes worden nooit als uptimeprobe gebruikt;
- een willekeurige HTTP 200 zonder marker bewijst niet dat de juiste applicatie wordt geserveerd.

### 5.3 HTTP- en redirectregels

- volg redirects alleen wanneer het targetcontract dat expliciet vereist;
- de apex verwacht direct 200;
- monitor `www → apex` pas na 002C.5 en verwacht dan exact 301/308 naar de HTTPS-apex zonder extra hop;
- 3xx naar login, foutpagina, preview of onbekende host is failure;
- 401/403/404/429/5xx is failure voor publieke targets;
- timeout is transportfailure, geen bodymismatch;
- maximaal 10 seconden voorkomt dat vastlopende requests als gezond gelden.

### 5.4 False-positivegrens

Eén tijdelijke netwerkfout genereert geen menselijke melding. Minimaal geldt:

1. provider bevestigt een failing check vanuit meerdere nodes of een confirmation server;
2. het target faalt nogmaals na minimaal één normaal interval, of een tweede regio bevestigt de failure;
3. controleer vóór `URGENT` waar mogelijk ook het andere WBD-target en de providerstatus;
4. een monitorrunner die meerdere gezonde controlehosts niet bereikt wordt geclassificeerd als **probe/provider failure**, niet als WBD-uitval.

---

## 6. SSL Baseline

Voor ieder primair HTTPS-target worden onafhankelijk gecontroleerd:

- TLS-handshake slaagt;
- certificaatketen is geldig;
- hostname/SAN komt exact overeen;
- certificaat is nog niet verlopen;
- expirywaarschuwingen op 30, 14 en 7 dagen;
- een ongeldig, verlopen of hostname-mismatchcertificaat is direct `URGENT` omdat gebruikers de dienst niet betrouwbaar kunnen bereiken;
- 30 dagen resterend is `ATTENTION`; 14 dagen blijft `ATTENTION` met verhoogde opvolging; 7 dagen is `URGENT`;
- recovery wordt pas gesloten na een nieuwe geldige externe TLS-check.

Automatische Let's Encrypt-vernieuwing is een preventieve providerfunctie, geen onafhankelijke verificatie. Er wordt geen certificaat, DNS-record of SSL-instelling gewijzigd in 002C.3.

---

## 7. Application Health Boundary

### 7.1 Huidige toestand

De publieke website is statisch; bereikbaarheid plus juiste marker/assets is daar voldoende minimale application health. De Experience-API maakt vóór routering een databaseverbinding, maar heeft geen publieke healthroute. Alle bestaande participant- en adminroutes hebben functionele, sessie- of writebetekenis en zijn ongeschikt als monitor. **VERIFIED**

### 7.2 Aanbevolen toekomstig contract

Alleen na een afzonderlijke code-, test-, release- en Human GO:

```http
GET /api/health
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Robots-Tag: noindex, nofollow

{"status":"ok"}
```

Failurecontract:

```http
HTTP/1.1 503 Service Unavailable
Cache-Control: no-store

{"status":"unavailable"}
```

Harde grenzen:

- uitsluitend `GET` en `HEAD`;
- geen cookies of sessie aanmaken;
- geen writes, rate-limitrecords of analytics-events;
- geen database-, tabel-, host-, versie-, commit-, config- of foutdetails;
- geen timings, stack traces, secrets, persoonsgegevens of deelnemerdata;
- 200 alleen wanneer configuratiebootstrap en bestaande databaseverbinding slagen;
- generieke 503 bij iedere dependencyfailure;
- beperkte publieke request rate via hosting/WAF pas in een afzonderlijk project;
- body is maximaal enkele tientallen bytes en stabiel genoeg voor een keywordassertie.

002C.3 implementeert of publiceert dit endpoint niet.

---

## 8. Dependency Health Boundary

- geen directe externe databaseprobe;
- geen databasecredentials in een monitoringprovider;
- geen externe SQL, tabeltelling of data-inhoud;
- de toekomstige apphealth bevestigt alleen dat de applicatie haar normale minimale dependency kan openen;
- mail, DNS en providerstatus zijn afzonderlijke capabilities en worden niet verborgen achter één algemene groen/roodstatus;
- server-/PHP-logs blijven diagnostisch bewijs na een incident, geen publiek monitoringsantwoord;
- een dependencyfailure mag extern alleen `unavailable` tonen.

Database-integriteit, migratiestatus en sessiegedrag blijven onderdeel van releasevalidatie en menselijke incidentdiagnose, niet van een publieke uptimecheck.

---

## 9. Backup Monitoring Boundary

002C.3 definieert uitsluitend toekomstige signalen:

| Signaal | Betekenis | Eerste severity |
|---|---|---|
| laatste succesvolle backup ouder dan vastgestelde RPO-grens | mogelijk onvoldoende herstelpunt | ATTENTION |
| backupjob expliciet mislukt | herstelbescherming verminderd | ATTENTION; URGENT bij aanhoudende overschrijding |
| integriteitscontrole ontbreekt | backupbestaan niet aantoonbaar bruikbaar | ATTENTION |
| restoretest over afgesproken cadence | herstelbaarheid verouderd | ATTENTION |
| laatste restoretest mislukt | herstelroute niet bewezen | URGENT voor risicovolle datarelease |

RPO/RTO, opslag, versleuteling, retentie, heartbeatbron en backupregister worden pas in Project 002C.4 ontworpen of geactiveerd. Geen providerheartbeat mag eerder een fictieve backupgarantie creëren.

---

## 10. Alert / Attention Model

### 10.1 Niveaus

| Niveau | Menselijke betekenis | Melding |
|---|---|---|
| `INFO` | gebeurtenis zonder benodigde actie, zoals eerste failurecandidate of stabiel herstel | standaard geen menselijke melding; alleen historie |
| `ATTENTION` | onderzoek binnen normale werktijd is zinvol | één e-mail/appmelding; geen herhalende ruis |
| `URGENT` | productie of belangrijke capability is bevestigd verstoord of dreigt direct onbruikbaar te worden | directe e-mail + mobile push; mens beslist over actie |

### 10.2 Classificatieregels

`ATTENTION`:

- blijvende latency boven afgesproken grens volgens 3-uit-5-metingen;
- TLS-expiry binnen 30 of 14 dagen;
- canonieke redirect/header/marker wijkt af terwijl dienst bereikbaar blijft;
- één primaire capability faalt bevestigd, maar tweede externe context ontbreekt;
- flapping of providerprobeconflict;
- toekomstige backup-/restorecadence wordt overschreden.

`URGENT`:

- primair target faalt bevestigd via provider-nodes en een volgende check/tweede regio;
- zowel public als Experience falen, wat een gedeelde hosting/providerstoring ondersteunt;
- Experience health geeft herhaald 503 terwijl de statische ingang nog 200 is;
- TLS is ongeldig, verlopen, hostname mismatch of binnen 7 dagen zonder bewezen renewal;
- onbekend/beschadigd release-artefact is extern bevestigd;
- kritieke security- of data-integriteitsgrens is aantoonbaar doorbroken.

### 10.3 Deduplicatie, herstel en flapping

- deduplicatiesleutel: `organizationId + environmentId + targetId + signalType`;
- maximaal één open incident per sleutel;
- geen reminder vaker dan eenmaal per 60 minuten en alleen zolang menselijke actie nog zinvol is;
- herstel pas na twee opeenvolgende geslaagde checks over minimaal twee normale intervallen;
- één recoverymelding sluit alleen een bestaand `ATTENTION`/`URGENT` incident;
- drie of meer up/downovergangen binnen 30 minuten wordt `FLAPPING`, houdt het incident open en onderdrukt nieuwe up/downmeldingen 30 minuten;
- geplande maintenance wordt vooraf gepauzeerd en gekoppeld aan release-ID/Human GO;
- een releaseactivatievenster uit 002C.2 mag niet door monitoring als losse outage worden verdubbeld zolang de bekende vorige release gezond wordt geserveerd.

---

## 11. Notification Model

WBD heeft één daadwerkelijk bevoegde beheerder. Er is geen 24/7-team en geen fictieve escalatieketen.

### Startmodel

- primaire melding: accountgebonden e-mail naar de bevoegde beheerder;
- urgent secundair kanaal: mobile push van de gekozen provider;
- geen periodieke groene rapportmails tenzij de beheerder bewust een maandrapport wil;
- geen SMS/voicebaseline zolang praktijkincidenten niet aantonen dat e-mail + push tekortschieten;
- meldkanaal en provideraccount gebruiken 2FA;
- minstens één recoveryroute voor het provideraccount mag niet uitsluitend afhangen van de gemonitorde WBD-hosting;
- geen publieke statuspagina in de eerste activatie; dit creëert beheer- en communicatieplicht zonder huidige noodzaak.

Een toekomstige Workspace toont geen provideralerts rechtstreeks. Alleen genormaliseerde observaties die Atlas als betekenisvol beoordeelt mogen als Workspace Attention verschijnen.

---

## 12. Provider Assessment

### 12.1 Vergelijking op 7 augustus 2026

| Onderdeel | UptimeRobot | Better Stack | StatusCake |
|---|---|---|---|
| Passende kleine laag | Solo: 10 monitors | Free: 10 monitors/heartbeats; responderlaag optioneel | Free: 10 uptime, 1 SSL; Superior: 100 uptime, 50 SSL |
| Actuele prijs | Solo vanaf €108/jaar; checkout verifiëren | free voor personal projects; responder vanaf $29/maand jaarlijks | Free €0; Superior vanaf €16,66/maand jaarlijks |
| Interval | Solo 60 sec | freepagina noemt 3 min; betaald tot 30 sec | Free 5 min; Superior 1 min |
| False-positivebeperking | drie willekeurige nodes per check; paid multi-location | configureerbare confirmation/recovery en multi-step verification | 0–3 confirmation servers, default 2 |
| SSL/expiry | Solo: SSL en 30/14/7-waarschuwingen | SSL monitoring inbegrepen bij uptimefunctie | Free slechts 1 SSL-monitor; Superior 50 |
| Inhoud/API | keyword, API, custom statuses/headers | keyword, REST API, DNS, webhooks | uptime/API en integrations; API free-rate 250/dag |
| Meldingen | e-mail, app; Solo o.a. Slack/Teams; webhook pas Team | e-mail/Slack; responder voegt phone/SMS toe | e-mail en integrations; SMS op paid |
| Retentie | Solo 12 maanden | incident history wordt genoemd; exacte free uptime-retentie niet eenduidig gepubliceerd | Bronze 90 dagen overview/30 dagen detail; actuele planmapping verifiëren |
| Atlas-route later | pull via REST API; webhook vereist duurder Team | REST API en webhooks sterk | REST API beschikbaar |
| Privacy | DPA; primaire EU- en secundaire VS-verwerking vermeld | GDPR/SOC2; default EU-opslagclaim | GDPR/DPA beschikbaar; exacte datalocatie verifiëren |
| Beheerlast | laag | middel; bredere incident/observabilitysuite dan nu nodig | laag/middel |
| Belangrijkste beperking | Solo kost geld; webhook niet in Solo | pricing/featuremodel breder en free noemt personal projects | Free SSL-dekking onvoldoende voor twee primaire hostnamen |

Alle prijzen zijn providerclaims van het controlemoment, geen offerte. Belastingen, valuta, maand-/jaarselectie en voorwaarden moeten in checkout worden gecontroleerd.

### 12.2 Voorkeursrichting

**RECOMMENDATION: UptimeRobot Solo**, om vijf redenen:

1. voldoende en niet overdreven: 10 monitors voor twee primaire targets, TLS en later één apphealth;
2. 60-secondenchecks en multi-nodebevestiging geven snelle detectie zonder een enkele netwerkfout te alarmeren;
3. SSL-expiry, keyword/API, DNS en custom status/headercontroles dekken de baseline;
4. 12 maanden retentie is bruikbaar voor betrouwbaarheidshistorie;
5. de beheerlast en officiële vanafprijs zijn lager en eenvoudiger dan een bredere incidentmanagementsuite.

**Vendor lock-in blijft beperkt** door het repositorytargetregister als canonieke waarheid te houden. Provider-ID's zijn optionele metadata; targets, verwachtingen, severity en ownership blijven providerneutraal. Incidenthistorie wordt later via API periodiek als genormaliseerde, minimale evidence geëxporteerd—niet als provider-specifieke Workspacewaarheid.

### 12.3 Alternatieven

- **StatusCake Free** is geschikt voor een kosteloze proef van availability en confirmation checks, maar één SSL-monitor dekt de twee primaire WBD-hostnamen niet volledig. Superior is functioneel ruim maar duurder dan nodig.
- **Better Stack** is technisch zeer sterk voor confirmation/recovery, API/webhooks en toekomstige incidentworkflows. Voor de huidige één-beheerderfase is de bredere suite niet nodig en moet commerciële geschiktheid van de free-laag plus exacte uptimekosten eerst worden bevestigd.

### 12.4 Human verification required

Vóór iedere keuze bevestigt de mens:

- actuele checkoutprijs inclusief btw en factureringsperiode;
- zakelijk gebruik en contractpartij;
- DPA, subverwerkers en datalocaties;
- accountowner, 2FA en recoveryroute;
- beschikbare e-mail/mobile kanalen in het gekozen plan;
- exacte SSL-, keyword-, custom status/header- en API-functies;
- export/API-limieten en verwijdering bij accountbeëindiging.

---

## 13. Monitoring Target Register

De canonieke providerneutrale structuur staat in:

- `monitoring/MONITORING-TARGET-REGISTER.schema.json`;
- `monitoring/MONITORING-TARGET-REGISTER.example.json`.

Ieder target bevat minimaal:

- stabiel target-ID;
- organisatie en environment;
- service en capability;
- secretvrije endpoint-URL en HTTP-methode;
- verwachte status, redirects, markers, headers, timeout en TLS-grens;
- monitoringmethode, interval, failure-/recoverythreshold en confirmations;
- ownerrol en default severity;
- lifecyclestatus;
- laatste check en laatste incident;
- notities en expliciete activatieblocker.

Het schema is generiek. WBD is alleen de eerste voorbeeldorganisatie; Sportpaleis of een andere organisatie is geen hardcoded platformbasis. Nieuwe organisaties krijgen eigen `organizationId`, targets, ownership en dataclassificatie.

---

## 14. Release Integration

Monitoring ondersteunt 002C.2, maar vervangt de livevalidatie niet.

### Voor deployment

- monitorstatus wordt als context opgenomen in release evidence;
- actieve incidenten op target, provider of controlehost blokkeren automatische conclusies;
- maintenance window krijgt release-ID, begin, maximumduur en Human GO.

### Tijdens/na deployment

- de bestaande releasevalidator bewijst kandidaatidentiteit en propagatie via minimaal twee goedgekeurde routes;
- externe monitoring blijft de release-onafhankelijke availabilitylaag;
- geplande propagatie binnen budget is geen nieuw outage-incident zolang de vorige release gezond is;
- na technische RELEASE GO eindigt maintenance en start een verscherpt observatievenster van 30 minuten;
- iedere onbekende artifactmarker of kritieke healthfailure wordt aan het releasebewijs gekoppeld.

### Rollback

- monitoring is aanvullend rollbackbewijs, nooit de enige beslisser;
- een enkele providerfailure veroorzaakt geen rollback;
- `Production failed` vereist de 002C.2-bewijsgrens of gelijkwaardig onafhankelijk bewijs;
- na rollback moeten vorige release-identiteit en twee stabiele monitorchecks zijn bevestigd;
- providerincident, WBD-incident en release-incident blijven afzonderlijk geclassificeerd.

---

## 15. Atlas / Workspace Future Integration

Toekomstige richting:

```text
MONITORING PROVIDER / SOURCE
            ↓
SECRET-SAFE CONNECTOR
            ↓
PROVIDER-NEUTRAL NORMALIZER
            ↓
TECHNICAL OBSERVATION
            ↓
ATLAS INTERPRETATION
            ↓
WORKSPACE ATTENTION OF STILTE
```

### Minimaal genormaliseerd eventcontract

```json
{
  "schemaVersion": 1,
  "source": "external-monitoring",
  "externalEventId": "provider-opaque-id",
  "observedAt": "2026-08-07T00:00:00Z",
  "organizationId": "wbd",
  "environmentId": "production-public",
  "targetId": "wbd-prod-public-web",
  "capability": "public-website",
  "eventType": "check-failed",
  "providerState": "down",
  "severityHint": "urgent",
  "evidence": {
    "httpStatus": 503,
    "confirmationCount": 2,
    "responseTimeMs": 1200
  },
  "containsPersonalData": false
}
```

Normalizerregels:

- querystrings, headers, bodies, cookies en providercredentials niet overnemen;
- alleen allowlisted technische velden;
- providerseverity is een hint, geen Atlasbesluit;
- events dedupliceren op provider-event-ID plus target;
- recovery relateert aan het open incident;
- Atlas voegt organisatiecontext, releasecontext, bekende maintenance en bewijsbetrouwbaarheid toe;
- Workspace toont alleen aandacht wanneer Atlas of een mens dat verantwoord vindt;
- gezonde checks worden geaggregeerd tot betrouwbaarheidshistorie, niet als notificaties.

Deze connector/normalizer wordt niet in 002C.3 gebouwd.

---

## 16. Security & Privacy

- monitor uitsluitend publieke, secretvrije URLs zonder querytokens;
- geen participant-, invitation-, admin- of persoonlijke routes;
- geen Authorization-, cookie- of API-secret in probes;
- sla geen responsebody of screenshot op wanneer die persoonsgegevens kan bevatten;
- zet providermogelijkheden voor failure screenshots/bodycapture uit voor dynamische routes;
- gebruik alleen stabiele publieke markers, nooit deelnemerinput;
- targetregister bevat geen provider-API-keys of notification-webhooks;
- providercredentials blijven buiten repository en onder menselijke secretgrens;
- account gebruikt unieke credentials, 2FA en een recoveryroute;
- DPA en datalocaties worden vóór activatie beoordeeld;
- statuspagina blijft standaard uit om infrastructuurdetails niet onnodig publiek te maken;
- retentie wordt niet langer gekozen dan nodig voor trend- en incidentbewijs;
- Atlas-export bevat alleen genormaliseerde technische metadata.

UptimeRobot vermeldt in de DPA dat gemonitorde URLs, contactgegevens en API-keys persoonsgegevens kunnen zijn en dat verwerking primair in de EU en secundair in de VS kan plaatsvinden. Dat vereist een bewuste leverancierskeuze, ook wanneer alleen publieke WBD-endpoints worden gemonitord.

---

## 17. Repository Guardrails

### Toegevoegd

- dit canonieke 002C.3-document;
- providerneutraal JSON Schema voor monitoringtargets;
- voorbeeldregister met twee huidige targets en twee expliciet geblokkeerde toekomstige targets;
- indexverwijzing in `docs/atlas/README.md`.

### Bewust niet toegevoegd

- geen monitoringscript, daemon of scheduler;
- geen provider-SDK, API-token of webhook;
- geen health endpoint;
- geen statuspagina;
- geen Workspace-interface of Atlas-connector;
- geen backupheartbeat;
- geen productieconfig.

Het register is configuratie-evidence, geen activatie-instructie. `status: proposed` en `activationBlockedBy` voorkomen dat de voorbeeldtargets als actief worden geïnterpreteerd.

---

## 18. Human Responsibilities

De bevoegde beheerder:

- kiest provider en plan;
- bevestigt zakelijke kosten en voorwaarden;
- is accountowner en stelt 2FA/recovery in;
- kiest e-mail en mobile push;
- beoordeelt privacy/DPA en datalocaties;
- geeft exacte `GO MONITORING ACTIVATION`;
- valideert testalerts en recovery;
- beslist bij een echt incident over onderzoek, communicatie en rollback;
- beoordeelt maandelijks of alerts zinvol waren en verlaagt ruis;
- herbeoordeelt ownership pas wanneer een tweede bevoegde beheerder werkelijk bestaat.

### Human Action Checklist voor latere activatie

1. Kies `UptimeRobot Solo` of documenteer gemotiveerd alternatief.
2. Verifieer checkoutprijs, btw, looptijd, auto-renewal en opzegging.
3. Accepteer voorwaarden/DPA bewust namens WBD.
4. Maak het account zelf aan met uniek wachtwoord, 2FA en recovery.
5. Bevestig uitsluitend secretvrij: `PROVIDER ACCOUNT READY`.
6. Laat Codex een exacte, nog niet actieve targetconfig/preflight voorbereiden.
7. Review URLs, markers, interval, timeout, severity en meldkanalen.
8. Geef afzonderlijk `GO MONITORING ACTIVATION <target-ids>`.
9. Activeer eerst de twee primaire targets zonder statuspagina of webhook.
10. Voer één gecontroleerde provider-testalert uit zonder productie te verstoren.
11. Bevestig ontvangst en stabiele recovery via e-mail/mobile push.
12. Leg provider-ID's secretvrij in het register vast en zet targets pas daarna op `active`.

002C.3 stopt vóór stap 1; er is geen accountactie uitgevoerd.

---

## 19. Deferred Items

- account-, plan- en monitoractivatie: afzonderlijke Human GO;
- Experience `/api/health`: afzonderlijk code-/releaseproject;
- backupfreshness, RPO/RTO en restorecadans: Project 002C.4;
- `www` canonical, DNS-drift, CAA en mailauth: Project 002C.5;
- providercredential lifecycle: Project 002C.6;
- Cloudflare/proxy/WAF en monitoringallowlisting: Project 002C.7/002C.8;
- publieke statuspagina;
- SMS/voice/on-callsoftware;
- Workspace-monitoringinterface;
- Atlas monitoringconnector en normalizer;
- monitoring voor Fara, Sportpaleis of toekomstige organisaties;
- synthetische browsertransacties met sessies of persoonsgegevens;
- serveragents, logshipping en APM.

---

## 20. Open Questions

Deze vragen blokkeren de ontwerpbaseline niet, maar wel de betreffende activatie:

1. Bevestigt de beheerder UptimeRobot Solo en de actuele checkoutprijs?
2. Welk e-mailadres en welk recovery-onafhankelijk mobile pushkanaal worden gebruikt?
3. Is de UptimeRobot-DPA passend voor WBD's minimale publieke endpointmetadata?
4. Welke responstijd wordt na 30 dagen nulmeting de zakelijke latencygrens?
5. Moet de Experience healthroute later alleen bootstrap/DB-connectie of ook een veilige schema-compatibiliteitsmarker bewijzen?
6. Wordt `www` in 002C.5 een 301 of 308, en wanneer mag die monitor actief worden?
7. Welke maandelijkse betrouwbaarheidssamenvatting is nuttig zonder groene notificatieruis?
8. Wanneer rechtvaardigt een echte tweede beheerder een tweede alertrecipient?
9. Welke API/exportcadans is later proportioneel voor Atlas zonder providerlock-in?

---

## 21. GO / NO-GO Recommendation

### Project 002C.3

**GO.** De huidige monitoringsstatus, twee primaire targets, availability-/TLS-grenzen, veilige toekomstige apphealth, dependency- en backupgrenzen, attentionmodel, providerkeuze, generiek targetregister, release-integratie en toekomstige Atlas-normalisatie zijn voldoende scherp vastgelegd.

### Externe activatie

**NO-GO** zolang één van deze zaken ontbreekt:

- menselijke provider- en contractkeuze;
- accountowner, 2FA en recovery;
- exacte targetreview en secretvrije monitorconfig;
- privacy/DPA-beoordeling;
- bevestigd e-mail/mobile meldkanaal;
- expliciete `GO MONITORING ACTIVATION`;
- gecontroleerde testalert en recoverybewijs.

### Eerstvolgende project

Project 002C.4 wordt niet gestart. Eerst volgt menselijke beoordeling van 002C.3. Monitoringactivatie is een afzonderlijke handeling en kan alleen na exacte Human GO.

Geen monitoringaccount of abonnement is aangemaakt. Geen monitor, statuspagina, health endpoint of webhook is geactiveerd. Geen productie-, DNS-, hosting-, database-, SSL-, Cloudflare-, account- of rechtenwijziging is uitgevoerd. Geen secrets, private keys, `.env`-waarden, recoverycodes of Bitwarden-inhoud zijn gelezen of gerapporteerd.

