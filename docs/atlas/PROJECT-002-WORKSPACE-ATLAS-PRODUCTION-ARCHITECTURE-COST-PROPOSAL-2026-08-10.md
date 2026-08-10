# Project 002 — Workspace + Atlas Production Architecture & TransIP Cost Proposal

**Datum:** 2026-08-10  
**Karakter:** read-only architectuur-, provider- en kostenonderzoek  
**Scope:** WBD-platform, Workspace, Atlas, capabilities en Sportpaleis als eerste organisatie  
**Producten geactiveerd:** geen  
**Productiewijzigingen:** geen  
**Besluit:** **GO RECOMMENDED voor de architectuurrichting; huidige deployment blijft NO-GO tot de implementatiepoorten zijn gesloten.**

## 1. Besluit in één alinea

Start WBD op één **aparte TransIP VPS met 4 shared vCPU, 8 GB RAM en 100 GB NVMe**, achter een TLS reverse proxy. Draai daarop één versioned Node-applicatierelease met Workspace, capabilities en de synchrone Atlas-kern als logisch gescheiden modules. Gebruik op dezelfde VPS aanvankelijk één MariaDB-service, maar **twee afzonderlijke databases en least-privilege users**: één voor operationele Workspace/capabilitydata en één voor Atlas context, provenance en journal. Gebruik private TransIP Object Store voor documenten en versleutelde logische back-ups. Atlas krijgt nog geen autonome connector- of AI-activiteit; een afzonderlijk workerproces wordt pas aangezet wanneer een concrete job dit vereist. Sportpaleis is tenant/configuratie binnen dit platform, niet de server- of databasegrens.

Deze richting voorkomt een PHP-herschrijving, promoveert de lokale JSON-file-store niet naar productie, vermijdt een voortijdig microservicelandschap en laat Workspace en Atlas later zonder datamigratie van elkaar loskoppelen.

## 2. Actueel TransIP-account — read-only geverifieerd

| Onderwerp | Actuele bevinding op 2026-08-10 | Betekenis voor Workspace |
|---|---|---|
| Producten | Twee webhostingpakketten; geen huidige VPS, Public Cloud of Kubernetes-runtime zichtbaar | Een nieuwe geïsoleerde runtime is een nieuw betaald product |
| WBD-pakket | Webhosting Pro, €15,99 per maand excl. btw | Behouden voor public, preview en Experience; niet inzetten als Workspace-runtime |
| WBD-hostingcapaciteit | 100.000 MB; 476 MB webdata gebruikt; 15.420 MB toegewezen databasevrij en 40 MB toegewezen databasegebruik | Opslag is ruim, maar lost runtime- en isolatiegrens niet op |
| Websites | 3/3: public, preview, Experience; toevoegen disabled | Geen vrij zelfstandig websiteslot voor Workspace |
| Runtime | PHP 8.2, PHP-FPM-gericht; geen gedocumenteerd of bewezen persistent Node-proces | De geteste Node-API kan hier niet verantwoord als continu serverproces draaien |
| Databases | Overzicht meldt 2 van 100 in gebruik; MySQL/MariaDB-capability aanwezig | Technisch bruikbaar voor PHP/Experience, maar geen Node Workspace-adapter en geen geïsoleerde runtimegrens |
| SSH/SFTP | Ingeschakeld; wachtwoordtoegang en SSH-keybeheer beschikbaar; momenteel geen key zichtbaar | Packagebrede beheergrens, niet de gewenste minimaal bevoegde VPS-servicegrens |
| Cron | Beschikbaar; geen bestaande cronjob | Kan geplande scripts starten, maar is geen blijvende Node-/worker-runtime |
| Back-ups | Herstelpunten zichtbaar per uur en per dag; publieke Webhosting Pro-informatie noemt tot 30 dagen | Geldig voor huidige hosting, niet voor een nog niet bestaande Workspace VPS/database/objectset |
| DNS | TransIP nameservers, DNSSEC actief; wildcard A/AAAA wijst onbekende hosts naar shared hosting | `workspace.webuildanddesign.nl` moet later een expliciet record en geldige TLS-origin krijgen |
| TLS | Bestaande sites gebruiken de hostinggrens; toekomstige Workspace-host toont nu een providerplaceholder en heeft geen geldige Workspace-route | Productieblokker tot afzonderlijke DNS/TLS-GO |
| API | TransIP REST API v6 ondersteunt scoped access tokens, read-only en IP-whitelisting; geen actieve key pair/token zichtbaar | Later bruikbaar voor gecontroleerde automatisering; niet nodig voor de applicatieruntime |
| Huidige factuur | WBD Webhosting Pro €15,99 excl. btw; volledig TransIP-account €25,98 excl. btw / €31,44 incl. btw per maand | De nieuwe kosten zijn aanvullend; het andere hostingpakket valt buiten Workspacekosten |

De actuele publieke Webhosting Pro-prijs en eigenschappen zijn ook zichtbaar op [TransIP Webhosting](https://www.transip.nl/webhosting/). De provider documenteert PHP-FPM voor webhosting op [HTTP headers gebruiken op webhosting](https://www.transip.nl/knowledgebase/http-headers-gebruiken-op-webhosting).

## 3. Wat de huidige code werkelijk nodig heeft

| Onderdeel | Huidige implementatie | Productierichting | Wanneer nodig |
|---|---|---|---|
| Node-runtime | Package-eis `>=22.12.0`; lokaal Node 24; `workspace-runtime.mjs` is HTTP-server en static/API entry | Gepinde actieve Node LTS, systemd-service, geen Vite-devserver | vóór pilot |
| Frontend | Immutable `dist-workspace` assets, één grote JS-chunk van circa 3,4 MB | Door reverse proxy/Node serveren met immutable assetcache en no-store voor private HTML/API | vóór pilot |
| API | Node-service met Workspace- en Sportpaleis-routes, health/readiness en server-side policies | Zelfde API-contract met database repositories | vóór pilot |
| Persistence | Lokale JSON-file-store met atomic rename en lokale backups | MariaDB repositories, transacties, migraties en idempotency | vóór pilot |
| Accounts/sessies | Scrypt, opaque sessies, CSRF, Origin-checks en rollen bestaan; demo/bootstrap/recovery is niet production-ready | Echte activation/bootstrap, revocable DB-sessies, recoveryrunbook | vóór pilot |
| Uploads/bijlagen | Base64 in JSON-state; declared MIME-validatie | Private Object Store, content magic/hash/size, metadata in DB; anders bijlagen uit | vóór pilot als bijlagen aan staan |
| Logging | JSON naar stdout, health/readiness bestaan | journald/rotation, correlation IDs, PII/secret-redactie en externe beschikbaarheidscheck | vóór pilot |
| Mail | Afzonderlijke gecontroleerde scripts; niet onderdeel van orderserver | Achter capabilitygate en bestaande allowlist/idempotency; niet automatisch activeren | later/afzonderlijke GO |
| Hardware | Send-gates staan uit | Blijft uit; geen WinPlot/Summa/Direct Print in deze architectuuractie | later/afzonderlijke GO |
| Background jobs | Geen benodigde productieworker in de pilot | Zelfde artifact als apart systemd-workerproces zodra een concrete queuejob bestaat | later |
| Secrets | Environmentcontract aanwezig, maar geen productiesecretvoorziening | Root-owned environment/credentials buiten release en logs; per service/user gescheiden | vóór pilot |

### Lokale keuze versus structurele keuze

De JSON-file-store, browser-localStorage, lokale connectorbestanden, demoaccounts en testorders zijn ontwikkelkeuzes. Structureel zijn de server-side application boundary, organisatiecontext, transacties, audit/provenance, private objecten, immutable releases, health/readiness en herstelbaarheid. Voor de pilot zijn runtime, relationele persistence, identity/recovery, tenant-enforcement, logging, back-up/restore en clean release noodzakelijk. Een queue, connectorworker, AI/modelservice, Cloudflare, Kubernetes en multi-region zijn veilig later.

## 4. Atlas production boundary

### Wat nu aantoonbaar bestaat

| Atlas-onderdeel | Werkelijke status | Productiebetekenis |
|---|---|---|
| `atlas-runtime.ts` | Deterministische, opslag-onafhankelijke Field/Transition/Gate/Journal-kern | Kan in hetzelfde Node-proces draaien; vereist geen aparte server |
| Experience Runtime V1 | MySQL/PHP-productiekandidaat met atomische state+journal, maar volgens eigen implementatierecord nog niet gepubliceerd | Blijft een aparte Experience-releasefamilie en database; niet samenvoegen met Workspace |
| Atlas Workspace UI | Focus, observations, understanding en logboek gebruiken browser-localStorage | Development/review, niet duurzame multi-userproductie |
| Connectorkern | Context-scoping, authorizationstatus, retry, freshness, provenance en idempotente sync zijn geïmplementeerd | Herbruikbaar contract, nog geen production worker |
| WBD sitemapconnector | Handmatige CLI-sync met lokale file-store onder `.atlas-data` | Development-only; niet vóór de Sportpaleis-pilot activeren |
| AI/model/reasoningservice | Niet aanwezig; Runtime V1 gebruikt deterministische signalen | Geen modelserver, GPU of externe AI-provider nodig in initiële sizing |
| Jobs/queue | Niet aanwezig | Pas toevoegen bij concrete connector- of lange taak |

### Nodig vóór en na de Sportpaleis-pilot

Voor de Sportpaleis-pilot hoeft Atlas geen orders te beoordelen, geen productieactie te blokkeren en geen connector autonoom te draaien. Wel moet de platformgrens vanaf de eerste productie-release Atlas later kunnen ontvangen zonder de operationele data te verbouwen. Daarom worden applicatiemodules, database-eigenaarschap, organisatie-ID's, event/provenancecontract en resourceheadroom nu ontworpen; Atlas-jobs en connectoractivatie blijven uit.

Na werkelijk gebruik kan een apart workerproces uit dezelfde release worden aangezet. Dat proces leest alleen geautoriseerde, organisatiegescopeerde events/jobs, gebruikt leases en idempotency, schrijft Atlas-journal/provenance en mag operationele Workspace-records niet rechtstreeks wijzigen.

### Data-eigenaarschap en communicatie

| Data | Autoritatieve eigenaar | Grens |
|---|---|---|
| Gebruiker, membership, rol, organisatie, order, artikel, productie- en commerciële toestand | Workspace/capabilitydatabase | Atlas ontvangt alleen minimaal noodzakelijke projecties en opaque referenties |
| Observatie, bron, evidence, interpretation, Candidate/Confirmed, inquiry field, cognitive journal, connectorstatus | Atlas-database | Geen orderwaarheid en geen directe productiemutaties |
| Documentbinary, afbeelding, export en back-upartefact | Private Object Store | DB bewaart organisatie, object-ID, hash, type, provenance, retention en actor |
| Gedeelde technische context | `organization_id`, actor-ID, event-ID, correlation-ID, schema/releaseversie en source reference | Server-side vastgesteld; geen klantnaam als infrastructuur-ID |

Workspace en Atlas communiceren aanvankelijk via een interne typed module-interface. Zodra asynchrone verwerking nodig is, schrijft Workspace het domeinevent en een outboxrecord in dezelfde operationele transactie. De worker consumeert dit idempotent en schrijft uitsluitend Atlas-eigendom. Dit maakt later een aparte Atlas-service mogelijk zonder de eventsemantiek of Workspace-database open te breken.

### Tenant- en auditgrens

Iedere tenantgebonden rij en job draagt een immutable `organization_id`. De server bepaalt actor, membership en actieve organisatie; iedere repositorymethode vereist deze context. Workspace- en Atlas-databaseusers krijgen geen wederzijdse schrijfrechten. Event-ID en correlation-ID verbinden Workspace-audit, outbox, Atlas-journal en applicatielog; logs bevatten geen tokens, documentinhoud of onnodige persoonsgegevens. Cross-tenant read/write/link/export/download blijft deny-by-default en krijgt negatieve regressietests.

## 5. Persistencebeslissing

| Optie | Betrouwbaarheid en concurrency | Backup/restore en tenantisolatie | Complexiteit/pilotrisico | Besluit |
|---|---|---|---|---|
| A. Node + JSON-file-store | Eén proces kan atomic rename doen, maar gelijktijdige writes, zoekvragen, constraints en herstel per tenant zijn zwak | Grove filebackups; geen DB-constraints, transacties over domeinen of tenantgerichte restore | Snel, maar creëert directe productieschuld en datarisico | **AFWIJZEN voor productie** |
| B. Node + MariaDB | ACID, FK's, transactions, locks, indexen, sessions, audit en idempotency; bestaand Sportpaleis-schema/migraties zijn al MySQL-gericht | Logical dumps, providerbackups, aparte databases/users, organisationconstraints en tenantexport mogelijk | Productie-adapter/migrator moet nog worden gebouwd, maar geen schema-engineport nodig | **AANBEVOLEN** |
| C. Node + PostgreSQL | Eveneens sterk; RLS en JSONB kunnen extra defense-in-depth geven | Goede backup/restore en scheiding | Vereist nu port van bestaand MariaDB-schema, migraties en tests zonder bewezen pilotvoordeel | **Later alleen bij concrete managed-DB/RLS-eis** |

De initiële MariaDB-service mag op dezelfde VPS draaien om kosten en beheer klein te houden, maar Workspace en Atlas krijgen aparte databases, credentials en migrations. Dit is geen claim dat zij voor altijd dezelfde databasehost moeten delen. Het opsplitsen van Atlas-worker of database wordt een operationele schaalactie, geen fundamentele herbouw.

## 6. Drie productieopties

| Productieoptie | Technische fit | Kosten excl. btw | Schaal/risico | Oordeel |
|---|---|---:|---|---|
| A. Huidige Webhosting Pro maximaal hergebruiken | PHP/MySQL, 3/3 sites; blijvend Node-proces niet bewezen. Vereist PHP-herschrijving of afwijkend runtimecontract | Huidig €15,99; upgrade naar 5 sites publiek €29,99, maar nog steeds geen Node-oplossing | Gedeelde blast radius met public/preview/Experience; geen structurele Atlas-/workergrens | **Niet gebruiken voor Workspace** |
| B. Aparte TransIP VPS | Volledige Node/systemd/reverse-proxy/MariaDB-controle; dezelfde Nederlandse provider; API- en firewallmogelijkheden | Aanbevolen 8 GB VPS €50 + backup €5 + offsite €10 + Object Storegebruik | Eenvoudigste begrijpelijke start; verticaal schaalbaar en later services los te trekken | **Aanbevolen** |
| C. TransIP Public Cloud/OpenStack | 8 GB/4 core/160 GB instance €57,89; Object Store sluit direct aan | Vanaf €57,89 plus volumes/backups/objectgebruik | Meer OpenStack-/netwerkbeheer, nog steeds zelf-managed DB; geen aantoonbaar initiëel voordeel | **Niet nu** |

TransIP publiceert de actuele VPS-specificaties, prijzen, firewall, roottoegang en schaalmogelijkheden op [TransIP VPS](https://www.transip.nl/vps/). De Public Cloud-prijstabel staat op [OpenStack prijzen](https://www.transip.nl/public-cloud/prijzen/).

## 7. Aanbevolen productietopologie

```text
Internet
  ↓
TransIP DNS — expliciete workspace-host
  ↓
TLS reverse proxy (Caddy of Nginx) + rate limits
  ↓
WBD application boundary — versioned Node release
  ├─ Workspace web/API
  ├─ capabilities (Sportpaleis Bedrukking als eerste)
  ├─ Atlas synchronous core/context adapter
  └─ later: apart systemd workerproces uit hetzelfde artifact
  ↓
MariaDB op localhost
  ├─ workspace_core database + app user
  └─ atlas_context database + atlas/worker user
  ↓
Private Object Store
  ├─ uploads/documenten
  └─ encrypted logical backup objects

Extern: uptime/TLS/release/backup-freshness monitoring
Recovery: VPS backup + offsite backup + versleutelde off-provider export
```

De publieke WBD-site, preview en bestaande Experience blijven op Webhosting Pro. Daardoor kan Workspace worden gedeployed, herstart of teruggedraaid zonder die drie surfaces te raken.

## 8. Sizing en schaalpad

### Minimum versus aanbeveling

| Configuratie | Fit |
|---|---|
| 2 vCPU / 4 GB / 100 GB (€20) | Kan een beperkte pilot technisch dragen, maar laat te weinig comfortabele marge voor MariaDB page cache, Node, een worker, uploads en meerdere capabilities |
| **4 vCPU / 8 GB / 100 GB (€50)** | Aanbevolen start: ruimte voor Node API, MariaDB, reverse proxy, OS-cache en een later lichte worker zonder snelle platformmigratie |
| 8 vCPU / 16 GB / 100 GB (€100) | Volgende verticale stap wanneer gemeten resource- of DB-druk dit vraagt |

De initiële capaciteit is een engineering-envelop, geen marketingbelofte: één WBD-platform met Sportpaleis als eerste organisatie, circa 1–5 vroege organisaties en lage tientallen gelijktijdige sessies zolang er geen model-/GPU-workload en geen zware connectorbatch draait. Werkelijke capaciteit wordt bepaald door p95 CPU/latency, geheugendruk, DB-pool, schijf, jobleeftijd en restoreduur.

Opschalen of splitsen wordt gestart zodra gedurende twee opeenvolgende meetvensters van 15 minuten één van deze grenzen wordt geraakt: CPU p95 boven 60%, geheugen boven 70% of swapactiviteit, DB-pool boven 70%, API p95 boven 500 ms of DB-query p95 boven 250 ms. Schijf boven 70%, oudste job boven 5 minuten of een gemiste RPO/RTO is direct een schaal-/incidenttrigger. De volgende verticale stap kost bij gelijk backup/objectprofiel circa €115,20 per maand excl. btw; afhankelijk van de oorzaak kan een aparte worker- of databasehost verstandiger zijn dan alleen verticaal vergroten.

## 9. Securitybaseline

| Moment | Vereiste grens |
|---|---|
| Vóór pilot | Alleen 80/443 publiek; SSH key-only vanaf expliciete bron-IP's; remote rootlogin uit; aparte deploy- en runtimeuser; MariaDB uitsluitend localhost; TLS end-to-end; Secure/HttpOnly/SameSite cookies; CSRF/Origin/Host-checks; login/upload rate limits; secrets buiten Git/release/log; OS security updates; private objecten; content magic/hash; audit en PII-redactie |
| Aanbevolen bij start | Automatische securityupdates met gecontroleerde rebootpolicy, fail2ban/vergelijkbaar, providerfirewall én hostfirewall, dependency/secret scan, maandelijkse accessreview en bemand observatievenster na release |
| Later bij bewijs | Cloudflare/WAF, dedicated vCPU, extra IOPS, aparte worker/database, managed identity of MFA-uitbreiding, malware scanning en SIEM/tracing |

Cloudflare is geen pilotvoorwaarde. DNS-only naar een correct beveiligde origin is valide; Cloudflare kan later alleen na de bestaande nameserver/DNSSEC/mailpreflight worden toegevoegd.

## 10. Release, deployment en rollback

| Fase | Vereist bewijs |
|---|---|
| Local development | Synthetische data, alle tests/builds, databaseadapter/migraties, tenant-denialtests, objectadapter, secretscan |
| Approved release | Schone broncommit, tag/release-ID, lockfile, immutable artifact+SHA-256 manifest, lege production bootstrap, demo/testdata-negatieve check, migrationimpact en rollbacktarget |
| Pre-deploy | Versioned release-directory, productieconfig zonder secrets in artifact, DB/objectback-up, geïsoleerde restore PASS, exact target/host en HUMAN + COST GO |
| Deploy | Nieuwe release naast oude plaatsen, migrations exact eenmaal, catalog/config idempotent importeren, service atomic omschakelen, TLS/DNS pas na aparte GO |
| Smoke | `/health`, `/ready`, release-ID, login/revoke, rollen, cross-tenant denial, order+Teamorder+multi-vereniging, data-gap policy, audit, objecttoegang, nul mail/hardwareactie |
| Rollback | Writes stoppen, post-failure dump, vorige compatibele release terugschakelen; database nooit blind terugzetten. Bij datacorruptie eerst geïsoleerd restore+reconcile en aparte DB-GO |

De huidige 373 gewijzigde/untracked worktree-items en demo/teststate maken de huidige branch geen release candidate. Eerst moet uitsluitend de bevroren scope in een clean commit komen; productionorders, sessions, feedback en audit starten leeg. De geaccepteerde commerciële catalogus/configuratie wordt via een gehasht, idempotent bootstrapmanifest geladen.

## 11. Backup en recovery

Vóór de eerste echte Sportpaleis-order zijn minimaal nodig: VPS back-up iedere vier uur plus wekelijkse retentie, geografisch gescheiden offsite VPS-back-up, consistente dagelijkse MariaDB logical dump, Object Store-objectmanifest met hashes, immutable applicatieartifact, secretmetadata zonder secretwaarden en één geslaagde isolated restore. TransIP noemt €5 per maand voor vieruurlijkse+wekelijkse back-ups en €10 per maand voor offsite back-ups op [VPS back-ups](https://www.transip.nl/vps/back-ups/).

Object Store is private opslag en een tweede technisch herstelpad binnen TransIP; het is niet hetzelfde als off-provider. Vóór de eerste echte order moet daarom ook een versleutelde recoveryset op een WBD-gecontroleerd medium buiten TransIP liggen en geïsoleerd zijn hersteld. Dat kan aanvankelijk zonder nieuw abonnement. Automatische off-provider replicatie is uiterlijk kort na pilotstart nodig, maar krijgt pas een prijs nadat provider, retentie en datavolume betrouwbaar zijn gekozen.

RPO/RTO blijven human decisions. Voorstel voor de beperkte bemande pilot: RPO maximaal 4 uur voor serverbeeld en 24 uur voor logical/objectexport; RTO binnen één werkdag. Geen productie-GO zolang Donovan deze doelen niet expliciet accepteert en de restore ze niet aantoonbaar haalt.

## 12. Kostenbesluit

Alle prijzen hieronder zijn excl. btw tenzij anders genoemd en op 2026-08-10 geverifieerd. TransIP vermeldt VPS 4 vCPU/8 GB/100 GB voor €50, backups €5, offsite backups €10 en Object Store €0,01 per GB opslag en €0,01 per GB egress. Zie [VPS](https://www.transip.nl/vps/), [VPS back-ups](https://www.transip.nl/vps/back-ups/) en [Object Store](https://www.transip.nl/object-store/).

### Huidige kosten

| Bestaand | Per maand excl. btw | Per maand incl. 21% btw | Jaar excl. btw |
|---|---:|---:|---:|
| WBD Webhosting Pro | €15,99 | €19,35 | €191,88 |
| Volledig huidig TransIP-account, inclusief ander hostingpakket | €25,98 | €31,44 | €311,76 |

### Nieuwe verplichte kosten bij GO

| Onderdeel | Per maand excl. btw | Waarom |
|---|---:|---|
| TransIP VPS 4 vCPU / 8 GB / 100 GB | €50,00 | Geïsoleerde Node/MariaDB/runtimegrens met Atlas-headroom |
| VPS backups iedere 4 uur + wekelijks | €5,00 | Operationeel herstel en langere retentie |
| Offsite VPS backups | €10,00 | Geografisch gescheiden VPS-herstelpad |
| Object Store — rekenbasis 20 GB | €0,20 | Private objecten en logical backup objects; werkelijk verbruik variabel |
| **Nieuwe maandlast op 20 GB-basis** | **€65,20** | Excl. egress; egress €0,01/GB |

Nieuwe jaarlast op deze rekenbasis: **€782,40 excl. btw / €946,70 incl. btw**, plus werkelijk Object Store-egress. WBD Webhosting Pro blijft bestaan; de WBD-gerelateerde TransIP-maandlast wordt daarmee **€81,19 excl. btw**. Het volledige huidige account inclusief het andere hostingpakket wordt **€91,18 excl. btw / €110,33 incl. btw**.

### Optioneel, nu niet activeren

| Optie | Prijs per maand excl. btw | Activeringscriterium |
|---|---:|---|
| Dedicated vCPU | €10,00 | Aantoonbare CPU-noisy-neighbor of stabiele compute-load |
| Extra IOPS | €5,00 | DB/storage latency als bewezen bottleneck |
| Extra bandbreedte | €2,00 | Gemeten netwerkdoorvoer vraagt dit |
| Extra snapshot | €6,99 | Meer handmatige releasepunten nodig dan inbegrepen |
| Cloudflare Free | €0,00 | Alleen na aparte DNSSEC/nameserver/mail-GO |
| Betaalde monitoring/off-provider service | ONBEKEND | Pas kiezen na eisen/providervergelijking; geen bedrag gokken |

Aanbevolen optionele maandlast nu: **€0,00**. De publieke TransIP-pagina toont geen eenmalige setupkosten voor de gekozen VPS/add-ons; eenmalige kosten worden daarom **€0,00** begroot. Facturering kan bij activatie naar rato plaatsvinden en is geen setupfee.

## 13. Verantwoordelijkheden na expliciete HUMAN + COST GO

CODEX KAN NA GO UITVOEREN:

- een schone releasebranch/commit, immutable artifact, manifest, hashes en release-ID voorbereiden;
- MariaDB-schema's, repositories, migraties, idempotente production bootstrap en negatieve demo-data-check bouwen en lokaal bewijzen;
- Workspace/Atlas module-, database-, event/outbox-, audit- en organisatiegrenzen implementeren zonder Atlas-features autonoom te activeren;
- Object Store-adapter, uploadvalidatie, backup/exportscripts en isolated restoretest voorbereiden;
- server hardening-, systemd-, reverse-proxy-, firewall-, logging-, health/readiness- en rollbackconfiguratie als gecontroleerde change set voorbereiden;
- na aparte access-GO een tijdelijk minimaal bevoegd deploypad gebruiken, VPS configureren, release kandidaat plaatsen en bewijs verzamelen;
- na afzonderlijke DNS/TLS/deployment-GO de expliciete Workspace-host, certificaat, smoke tests en observatievenster uitvoeren;
- tijdelijke toegang en credentials na bewijs intrekken en het release-/backup-/auditregister bijwerken.

DONOVAN MOET ZELF DOEN:

- dit architectuur- en kostenvoorstel expliciet HUMAN + COST GO of NO-GO geven;
- de VPS, backup-add-ons en Object Store bestellen/betalen of de providerhandeling expliciet autoriseren;
- eventuele TransIP-login, 2FA, contract-, betaal- en ownerbevestiging uitvoeren;
- echte gebruikersidentiteiten, eerste admin, recoveryeigenaar, RPO/RTO en de off-provider bewaarlocatie bevestigen;
- afzonderlijke menselijke GO geven voor tijdelijke provideraccess, database/import, DNS/TLS, deployment en uiteindelijke productieacceptatie.

RECOMMENDED ARCHITECTURE:
TransIP VPS 4 vCPU/8 GB/100 GB met Node modular monolith, TLS reverse proxy, afzonderlijke Workspace- en Atlas-MariaDB-databases/users, private Object Store, Atlas zonder autonome jobs vóór pilot en later een los workerproces uit hetzelfde artifact.

CURRENT MONTHLY COST:
€15,99 excl. btw voor WBD Webhosting Pro

REQUIRED NEW MONTHLY COST:
€65,20 excl. btw op basis van 20 GB Object Store, plus werkelijk egress à €0,01/GB

OPTIONAL NEW MONTHLY COST:
€0,00

ONE-TIME COST:
€0,00

EXPECTED INITIAL CAPACITY:
Engineering-envelop voor WBD Workspace + Atlas-basiskern, Sportpaleis, circa 1–5 vroege organisaties en lage tientallen gelijktijdige sessies zonder AI/GPU of zware connectorbatch; valideren op p95- en resourcegegevens.

NEXT SCALE TRIGGER:
CPU p95 >60%, geheugen >70%/swap, DB-pool >70%, API p95 >500 ms of DB p95 >250 ms gedurende twee vensters van 15 minuten; schijf >70%, jobleeftijd >5 minuten of gemiste RPO/RTO triggert direct schaal-/splitsingsbesluit.

TRANSIP / PROVIDER ACTION REQUIRED:
Na HUMAN + COST GO een nieuwe 8 GB VPS, VPS backup, offsite backup en Object Store provisionen; later expliciet DNS/TLS naar de nieuwe origin. Nu niets uitvoeren.

DONOVAN ACTION REQUIRED:
HUMAN + COST GO, bestelling/betaling en owner/2FA-bevestiging; daarna afzonderlijke GO's voor access, database, DNS/TLS en deployment.

CODEX CAN IMPLEMENT AFTER GO:
JA

PRODUCTION ARCHITECTURE: GO RECOMMENDED

PAID SERVICES ACTIVATED: NEE

PRODUCTION CHANGES EXECUTED: NEE
