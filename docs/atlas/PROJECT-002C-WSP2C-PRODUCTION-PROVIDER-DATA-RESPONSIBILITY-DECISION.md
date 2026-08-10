# Project 002C — WSP.2C Production Provider Decision & Data Responsibility Review

**Datum:** 2026-08-07  
**Onderzoek:** read-only leveranciers-, kosten-, privacy-, security- en continuïteitsbeoordeling  
**Assessmentstatus:** **GO**  
**Implementatie, accounts, aankopen, provisioning en productie:** **NO-GO**  
**Besliseigenaar:** menselijke review; dit document activeert geen leverancier of product

## 0. Preflight en bewijsregels

- **Omvang:** groot; 19 functionele afhankelijkheden, zes eerder genoemde leveranciers, Nederlandse/EU-alternatieven, vier kostenbeelden en een data-/recoverybeoordeling.
- **Operationeel risico:** laag; alleen openbare officiële bronnen en bestaande lokale canonieke documentatie zijn gelezen.
- **Codex-creditbandbreedte vooraf:** €35–80 indicatief. Werkelijke eurocredits zijn niet zichtbaar en worden daarom niet als gerealiseerd bedrag gerapporteerd.
- **Externe bronnen:** officiële product-, prijs-, SLA-, support-, status-, security-, DPA-, subprocessor-, dataregio-, backup- en exportdocumentatie van TransIP, DigitalOcean, UpCloud, Scaleway, WorkOS, ZITADEL, Auth0, UptimeRobot, Sentry en Cloudflare; ECB voor valuta.
- **Wijzigingsbevestiging:** niets gekocht, geen account of trial gestart, geen betaalmiddel toegevoegd, geen provider-, DNS-, database-, bucket-, identity-, monitoring-, code-, CSS-, infrastructuur- of productiewijziging uitgevoerd.

Bewijslabels:

- **VERIFIED:** actuele lokale canon of actuele officiële providerbron.
- **INDICATION:** berekening of planningsaanname; geen leveranciersprijs of factuur.
- **ACCOUNT CHECK:** alleen in checkout, contract of factuur definitief vast te stellen.
- **HUMAN DECISION:** vereist menselijke contract-, privacy-, belasting-, budget- of servicelevelkeuze.

Alle openbare bronnen zijn gecontroleerd op **2026-08-07**, tenzij bij de bron een eigen recentere verificatiedatum staat. USD-indicaties gebruiken de officiële [ECB-referentiekoers van 27 juli 2026](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.pt.html): **EUR 1 = USD 1,1389**, dus USD 1 ≈ EUR 0,8780. Dit is alleen een vergelijkingskoers; provider, kaartuitgever en factuur bepalen de werkelijke koers.

## 1. Besluit in één pagina

WBD moet voor de eerste veilige klant-Workspace de bestaande TransIP-estate behouden en daar één managed Workspace-keten naast zetten:

1. **TransIP** blijft registrar, DNS en host van de bestaande publieke WBD-, preview- en Experience-estate.
2. **DigitalOcean App Platform, 1 GiB fixed shared CPU, AMS, $10/maand** wordt de managed Node.js-runtime.
3. **DigitalOcean Managed PostgreSQL Basic Regular, 2 GiB primary + 1 matching standby, AMS3, $60,90/maand totaal** wordt de production database. De goedkopere $15,15-single-node is alleen verantwoord voor een interne pilot of expliciet als niet-HA geaccepteerde bèta, niet als standaard voor echte klantdata.
4. **DigitalOcean Spaces Standard, AMS, $5/maand** wordt private/versioned primaire documentopslag.
5. **WorkOS AuthKit, $0 binnen 1 miljoen MAU**, wordt identity/MFA **alleen na menselijke DPA-, doorgifte-, deletion-, recovery- en exitgoedkeuring**. WBD houdt `organization_id`, memberships, roles en permissions canoniek in de eigen database.
6. **UptimeRobot Solo, maandelijks $13**, levert 60-seconden externe monitoring; **Sentry Developer, $0 binnen allowance**, levert application/error monitoring met dataminimalisatie en EU-regiokeuze.
7. **TransIP Object Store**, €0,01/GB-maand opslag plus €0,01/GB uitgaand, bewaart client-side versleutelde off-provider database- en documentherstelkopieën in Nederland.
8. **Cloudflare wordt niet geactiveerd.** App Platform levert voor klant 1 al HTTPS, custom domains, CDN en basis-DDoS-mitigatie; een extra proxy-/DNS-laag heeft nu geen bewezen noodzaak.

Deze keten is niet de goedkoopste denkbare keten. Zij is de kleinste keten die OS/runtimebeheer, databasepatching en databasefailover niet volledig bij één WBD-operator legt, standaard PostgreSQL/S3/OIDC-grenzen behoudt en zonder fundamentele architectuurvervanging naar 5–10 klanten kan groeien.

**Nieuwe klant-1-infrastructuur:** officieel **USD 88,90/maand** fixed plus verwacht circa **€0,30/maand** TransIP-backupusage; op de genoemde ECB-koers circa **€78,36/maand excl. eventuele btw**, of €940,29/jaar. De bestaande TransIP-factuur is onbekend; daarom bestaat geen betrouwbaar volledig WBD-totaal.

## 2. Wat is werkelijk nodig?

| # | Functie | Classificatie klant 1 | Invulling / grens |
|---:|---|---|---|
| 1 | Domain registrar | **EXISTING / ALREADY COVERED** | TransIP; geen transfer nodig |
| 2 | DNS | **EXISTING / ALREADY COVERED** | TransIP DNS; later alleen afzonderlijk goedgekeurd Workspace-record |
| 3 | Publieke WBD-websitehosting | **EXISTING / ALREADY COVERED** | TransIP Webhosting Pro |
| 4 | Preview/Experience hosting | **EXISTING / ALREADY COVERED** | bestaande TransIP-estate; niet samenvoegen met Workspace |
| 5 | Workspace application runtime | **REQUIRED FOR CUSTOMER 1** | DigitalOcean App Platform AMS |
| 6 | Managed production database | **REQUIRED FOR CUSTOMER 1** | DigitalOcean Managed PostgreSQL HA |
| 7 | Private object/document storage | **REQUIRED FOR CUSTOMER 1** zodra documenten live zijn | DigitalOcean Spaces private/versioned |
| 8 | Identity/authentication | **REQUIRED FOR CUSTOMER 1** | WorkOS AuthKit, conditional; replaceable adapter |
| 9 | MFA | **REQUIRED FOR CUSTOMER 1** | WorkOS user MFA plus MFA op alle provideraccounts |
| 10 | Transactional/system e-mail | **EXISTING / ALREADY COVERED voor auth; DEFER voor app-mail** | AuthKit verzorgt standaard auth-mails. Een aparte mailprovider pas bij concrete niet-auth e-mailcapability |
| 11 | Uptime monitoring | **REQUIRED FOR CUSTOMER 1** | UptimeRobot Solo |
| 12 | Application/error monitoring | **REQUIRED FOR CUSTOMER 1** | Sentry Developer EU, privacyfilters; later Team bij usage/meer operators |
| 13 | Backups | **REQUIRED FOR CUSTOMER 1** | DB PITR, objectversioning en applicatie/release-evidence |
| 14 | Off-provider recovery storage | **REQUIRED FOR CUSTOMER 1** | TransIP Object Store, client-side encrypted |
| 15 | Logging/audit support | **REQUIRED FOR CUSTOMER 1; ALREADY COVERED IN STACK** | DO runtime/DB-logs, Sentry, plus canonical WBD-audittabel; geen extra logvendor |
| 16 | CDN/WAF/DDoS/proxy | **OPTIONAL** | App Platform-baseline eerst; Cloudflare deferred |
| 17 | SSL/certificaatbeheer | **ALREADY COVERED IN STACK** | App Platform managed HTTPS; TransIP voor bestaande estate |
| 18 | Secrets/configuration | **ALREADY COVERED IN STACK** | App Platform encrypted env/secrets; geen secret in repo/logs |
| 19 | Aanvullende dependency | **NOT REQUIRED NOW** | geen queue, Kubernetes, Redis, searchcluster of permanent staging voor klant 1 |

Vendor sprawl is daarmee begrensd tot bestaande TransIP plus vier nieuwe accounts bij livegang: DigitalOcean, WorkOS, UptimeRobot en Sentry. WorkOS en Sentry ontvangen geen documenten of bedrijfsdossiers.

## 3. Providervergelijking per kritieke laag

### 3.1 Runtime

| Kandidaat | Product en prijs | Type / regio | SLA en support | Beheerlast en exit | Oordeel |
|---|---|---|---|---|---|
| **DigitalOcean** | App Platform `apps-s-1vcpu-1gb-fixed`: **$10/mnd**, 1 shared vCPU, 1 GiB, 100 GiB egress; $0,02/GiB overage. Per seconde met minimum 1 minuut. [Prijs](https://docs.digitalocean.com/products/app-platform/details/pricing/) | managed PaaS; AMS; Git/container; managed OS/process/HTTPS/custom domain/CDN/DDoS | 99,95% App Platform SLA; Starter support $0, 24/7 ticket, <24 uur reactie. [SLA](https://www.digitalocean.com/sla/app-platform), [support](https://docs.digitalocean.com/platform/support-plans/) | laag; stateless Node/container en manifest blijven portable. Filesystem is ephemeral. | **RECOMMENDED** |
| **UpCloud** | Premium Cloud Server 1 vCPU/1 GB/25 GB: **€5/mnd excl. tax**, per begonnen uur, max. 28 dagen. Starter €3 is officieel dev/test/self-host. [Prijs](https://upcloud.com/pricing/) | self-managed VM; AMS; WBD beheert OS, reverse proxy, Node, patches, firewall, logs en backups | Premium 99,999%; 24/7 chat/e-mail en publieke status. Sterke support, maar applicatiebeheer blijft WBD. | middel/hoog; VM is portable, operationele single-person-afhankelijkheid neemt toe | **NIET GEKOZEN**; goede IaaS, geen PaaS-equivalent |
| **Scaleway** | Serverless Containers: €0,000002/GB-s en €0,00001/vCPU-s na maandelijkse free allowances; usage-based. [Prijs](https://www.scaleway.com/en/pricing/serverless/) | managed serverless containers, EU; geschikt voor stateless/sporadische workloads, minimum scale nodig tegen cold starts | Basic ticket IRT 8 uur; Scaleway noemt Business (€250/mnd of 10% spend) een prerequisite voor production workloads. [Support](https://www.scaleway.com/en/docs/account/reference-content/understanding-support-plans/) | laag/middel; container portable, maar prijs bij permanent warm proces en productsupport minder passend | **SERIEUS EU-ALTERNATIEF, NIET GEKOZEN** |

Een TransIP- of UpCloud-VPS is technisch capabel, maar is geen gelijkwaardige vervanger van een managed application platform. De paar euro lagere computeprijs koopt geen patching, process supervision, managed releases of runtime rollback.

### 3.2 Managed PostgreSQL

| Kandidaat | Exacte instap / productieprijs | Beschikbaarheid, backup en regio | Support / beheer | Oordeel |
|---|---|---|---|---|
| **DigitalOcean** | 1 GiB single node $15,15/mnd; **2 GiB primary $30,45 + matching standby $30,45 = $60,90/mnd**; 10/30 GiB storage; extra storage $0,215/GiB-mnd. [Prijs](https://www.digitalocean.com/pricing/managed-databases) | AMS3; single node SLA 99,5%, met standby 99,95%. Dagelijkse backup en PITR 7 dagen, restore naar nieuw cluster. [SLA](https://www.digitalocean.com/sla/databases), [restore](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/) | patches, TLS, metrics, failover en updates managed | **RECOMMENDED: HA voor echte klantdata** |
| **UpCloud** | Developer 1 GiB/1 node €9/mnd, 3 dagen PITR; productiecluster Standard 8 GiB €60 plus tweede node met 10% korting = **€114/mnd** excl. tax. [Prijs](https://upcloud.com/pricing/) | AMS beschikbaar; single node is volgens setupdocs dev/test; 2–3 nodes voor productie/HA; encrypted off-site backups, 15 dagen bij Standard. [HA](https://upcloud.com/docs/products/managed-postgresql/high-availability/), [backups](https://upcloud.com/docs/products/managed-postgresql/backups/) | sterke 24/7 human support; database managed | **STERK EU-ALTERNATIEF**, maar minimum echte HA te groot/duur voor klant 1 |
| **Scaleway** | DB-DEV-S 2 vCPU/2 GB **€0,0156/uur** primary; extra nodes €0,0136/uur; storage vanaf €0,0993/GB-mnd en backups €0,03/GB-mnd; prijzen vóór tax. [Prijs](https://www.scaleway.com/en/pricing/managed-databases/) | Parijs/EU; multi-node/Multi-AZ configureerbaar | Basic support niet als productionplan gepositioneerd; Businesssupport €250/mnd | technisch serieus, maar billing/config/supportketen minder proportioneel |
| **Self-managed op VPS** | compute vanaf €3–€9/mnd | geen managed failover/PITR; WBD bouwt en test alles | patching, hardening, vacuum, monitoring, restores, upgrades en on-call volledig bij WBD | **DO NOT RECOMMEND** voor klantdatabase |

De eerdere WSP.2A-begroting gebruikte DigitalOcean single-node. Deze review corrigeert de productiestandaard: DigitalOcean noemt een cluster zonder standby lager beschikbaar (99,5%) en de [pricingdocs](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/) positioneren single-node voor preliminaire/testworkloads. Besparen op de standby zou voor echte klantdata onevenredig meer downtime- en herstelrisico bij één operator leggen.

### 3.3 Private documenten

| Kandidaat | Exacte prijs | Eigenschappen | Risico / oordeel |
|---|---|---|---|
| **DigitalOcean Spaces Standard** | **$5/mnd**, 250 GiB opslag + 1.024 GiB egress; extra $0,02/GiB-mnd en $0,01/GiB egress. [Prijs](https://docs.digitalocean.com/products/spaces/details/pricing/) | AMS3; S3-compatible; private keys/policies; TLS en encryptie at rest; versioning/lifecycle; 99,9% SLA. [API/features](https://docs.digitalocean.com/reference/api/spaces/), [securitymodel](https://www.digitalocean.com/security/shared-responsibility-model-spaces) | zelf niet als enige repository/backup gebruiken; **RECOMMENDED primary** plus onafhankelijke kopie |
| **TransIP Object Store** | **€0,01/GB-mnd opslag + €0,01/GB uitgaand**, ingress/API gratis; excl. btw, per uur. [Prijs](https://www.transip.nl/public-cloud/prijzen/) | Nederland; S3/SWIFT; 3× over drie availability zones; DPA via control panel; ISO 27001/9001 en NEN 7510. [Product](https://www.transip.nl/object-store/) | publieke documentatie bewijst niet dezelfde volledige versioning/lifecycleconfiguratie als Spaces; **RECOMMENDED off-provider encrypted recovery**, niet primary |
| **Scaleway Object Storage Multi-AZ** | **€0,01606/GB-mnd**, requests/ingress inbegrepen, 75 GB egress gratis daarna €0,01/GB; vóór tax. [Prijs](https://www.scaleway.com/en/pricing/storage/) | Amsterdam-regio, S3 subset, private policy, versioning, lifecycle, object lock, KMS. [Concepts](https://www.scaleway.com/en/docs/object-storage/concepts/) | uitstekende EU-primary kandidaat; extra leverancier naast gekozen runtime/database levert nu weinig nettovoordeel |

### 3.4 Identity, organisations en MFA

| Kandidaat | Exacte prijs/capaciteit | Privacy, support en exit | Oordeel |
|---|---|---|---|
| **WorkOS AuthKit** | **$0/mnd tot 1 miljoen MAU**; daarna $2.500 per extra 1 miljoen. Billinginformatie is vereist om production te openen. [Prijs](https://workos.com/user-management), [environments](https://workos.com/docs/authkit/environments) | MFA, organisations, policies, password/social/magic/SSO; US provider; DPA staat EEA→US en andere internationale transfers met SCCs toe. Publieke self-service export van alle gebruikers/password hashes is niet voldoende bewezen. [DPA](https://workos.com/legal/data-processing-addendum), [status](https://status.workos.com/) | **RECOMMEND WITH CONDITIONS**; beste B2B-fit/laagste startlast, maar privacy en exit zijn harde gates |
| **ZITADEL Cloud** | Free $0, 100 daily active users, unlimited orgs en EU/US/CH/AU residency; Pro **$100/mnd**, 25.000 DAU en SLA/support. [Prijs](https://zitadel.com/pricing) | Swiss roots maar contract/DPA noemt ZITADEL Inc. en mogelijke verwerking buiten EU/CH; EU-region beschikbaar; open-source/self-host en gedocumenteerde export inclusief hashes/OTP. [DPA](https://zitadel.com/docs/legal/data-processing-agreement), [export](https://zitadel.com/docs/guides/migrate/sources/zitadel) | sterkste exit/EU-residency-alternatief; hogere productionprijs en korter trackrecord; **fallback als WorkOS privacygate faalt** |
| **Auth0 B2B** | Free $0 tot 25.000 MAU maar slechts 5 organisations; Essentials **$35/mnd** tot 500 MAU, 10 orgs, MFA/RBAC; Professional $240. [Prijs](https://auth0.com/pricing) | mature Okta-platform, EU-regionmogelijkheden contractueel te controleren; prijs groeit sneller voor B2B-orgs | volwassen maar voor multi-organisation WBD minder kostenefficiënt; niet gekozen |
| **Zelfbeheer** | licentie mogelijk €0 | volledige verantwoordelijkheid voor password security, MFA/recovery, anti-abuse, mail, patches en incidenten | geen prijsbesparing zodra beheerlast eerlijk wordt meegerekend |

**Identitybesluit:** **RECOMMEND WITH CONDITIONS — WorkOS AuthKit.** Een providerorganisation is een identity-context, niet de WBD-architectuurbasis. Iedere request wordt in WBD gemapt naar de eigen `organization_id`; authorisatie en tenantfilters blijven in app/database. Bij afwijzing van de WorkOS-doorgiftevoorwaarden is ZITADEL EU de concrete fallback, na een nieuwe prijs-/contractpreflight.

### 3.5 Monitoring en logs

| Laag | Product | Exacte allowance/prijs | Besluit |
|---|---|---|---|
| Externe uptime | UptimeRobot Solo monthly | **$13/mnd**, 10 monitors, 60 sec, 3 statuspages, 12 maanden retentie; jaarlijks $132 ($11/mnd-equivalent). [Prijs](https://uptimerobot.com/pricing/) | **REQUIRED / RECOMMENDED**. Monthly voorkomt jaarcommitment. Free $0/50 monitors maar 5-minuten detectie en hobby/non-profit-positionering is niet de klant-1-standaard. |
| App/error | Sentry Developer EU | **$0/mnd**, 1 user, 5.000 errors, 5 GB logs, 5M spans, 50 replays, 30 dagen. Team $26/mnd bevat 50.000 errors en unlimited users; logs boven 5 GB $0,50/GB op paid. [Prijs](https://sentry.io/pricing/) | **REQUIRED binnen allowance**. PII scrubben; geen request bodies, documenten, secrets of gevoelige persoonsgegevens. Upgrade op volume/2e operator. |
| Audit | WBD PostgreSQL audittabel | in databaseprijs | canonical business/security audit; niet afhankelijk maken van WorkOS Audit Logs |
| Providerlogs | App Platform en managed DB logs/metrics | inbegrepen | operationeel, beperkte retentie; kritieke release-/incident-evidence extern bewaren |

UptimeRobot is een Slowaakse entiteit; de [DPA](https://uptimerobot.com/dpa/) noemt primaire EU- en secundaire US-verwerking. Sentry is een US-leverancier met DPA en EU-dataregion; de [DPA](https://sentry.io/legal/dpa/) staat ook wereldwijde subprocessors/transfers toe. Beide worden daarom dataminimaal ingericht.

### 3.6 Bestaande diensten, mail en edge

- **TransIP:** sinds 2003, Nederlandse data-/supportpositionering en onderdeel van team.blue met meer dan 3,5 miljoen klanten; de [officiële bedrijfsinformatie](https://www.transip.nl/transip/) ondersteunt volwassenheid en lokale support. Registrar, DNS, public, preview en Experience blijven.
- **Transactional mail:** AuthKit verzorgt login-, verificatie- en herstelmail. Voor toekomstige Workspace-notificaties is Scaleway Transactional Email Essential een geschikte EU-kandidaat: 300 mails inbegrepen, daarna €0,25 per 1.000, pay-as-you-go; [officiële productprijs](https://www.scaleway.com/en/transactional-email-tem/). Niet activeren voordat WS communication/mail werkelijk e-mail verstuurt.
- **Cloudflare:** Free kost $0 en levert DNS/CDN/SSL/unmetered DDoS en beperkte managed WAF-regels. [Free](https://www.cloudflare.com/en-gb/plans/free/), [DDoS](https://developers.cloudflare.com/ddos-protection/). Het is volwassen, maar niet nodig om klant 1 professioneel live te krijgen. Extra DNS/proxy/cache/TLS ownership is nu een netto complicatie. **DEFER.**

## 4. Volwassenheid en uiteindelijke providerfit

| Provider | Objectief volwassenheidssignaal | Status/SLA/securitybewijs | WBD-fit |
|---|---|---|---|
| TransIP | >20 jaar; team.blue-groep; NL support/data | beschikbaarheidsregeling, DPA, ISO/NEN voor Object Store | uitstekend voor bestaande estate en onafhankelijke NL recovery |
| DigitalOcean | beursgenoteerd; >650.000 klanten volgens [Investor Relations](https://investors.digitalocean.com/) | publieke [status](https://status.digitalocean.com/), product-SLA's, SOC 2/3 via [Trust Platform](https://www.digitalocean.com/trust), DPA/subprocessors | beste totale managed developer/SMB-keten |
| UpCloud | Europees/Fins, 15 datacenters, volwassen IaaS/DB en 24/7 human support | publieke status, SLA, ISO 27001, DPA geïntegreerd; [security/privacy](https://upcloud.com/global/security-privacy/) | sterke EU-alternatiefprovider; runtime is IaaS, echte DB-HA te groot |
| Scaleway | Frans/EU full-cloudportfolio, meerdere EU-regio's | DPA, subprocessorregister, publieke supportlevels/productdocs | technisch sterk; production supportminimum disproportioneel voor klant 1 |
| WorkOS | gespecialiseerd B2B identityplatform; goede actuele docs en publieke status | DPA/SCC, MFA/orgs, status; enterprise SLA niet in free | functioneel beste startfit, privacy/exit conditional |
| ZITADEL | open source + cloud, EU-region en self-host exit | DPA/subprocessors/exportdocs; Pro SLA | concrete fallback, niet automatisch privacyvrij |
| UptimeRobot | langlopend gespecialiseerd monitorproduct; actuele SOC 2/DPA-claims | status, 2FA, DPA, publieke pricing | proportioneel als betaalde externe monitor |
| Sentry | gevestigd error/observabilityplatform met open SDK-ecosysteem | EU ingestion/status, DPA, SOC2/ISO-vermelding | geschikt als niet-kritieke, dataminimale observabilitylaag |
| Cloudflare | wereldwijde edgeprovider op zeer grote schaal | status, DPA/compliance en mature DDoS/WAF | later nuttig, nu geen noodzakelijke dependency |

Geen claim over financiële gezondheid is afgeleid uit marketing. Schaal, trackrecord, documentatie, SLA, status en contractbewijs zijn alleen gebruikt als continuïteitssignalen.

## 5. Exact prijzenregister

### 5.1 Gekozen klant-1-producten

| Leverancier / exact product | List price en billing | Inbegrepen / overage | Setup / commitment | BTW/tax | EUR-indicatie 2026-07-27 |
|---|---|---|---|---|---:|
| DigitalOcean App Platform `apps-s-1vcpu-1gb-fixed` | **$10/mnd**, per seconde, min. 1 minuut | 1 shared vCPU, 1 GiB, 100 GiB egress; $0,02/GiB extra | $0 setup; geen minimumtermijn | **ACCOUNT/INVOICE CHECK** | €8,78 |
| DigitalOcean Managed PostgreSQL Basic Regular 2 GiB primary | **$30,45/mnd** | 1 vCPU, 2 GiB, 30 GiB; storageoverage $0,215/GiB-mnd | $0; usage-billed | **ACCOUNT/INVOICE CHECK** | €26,74 |
| DigitalOcean matching standby | **$30,45/mnd** | HA replica/failover; geen extra applicatiecapaciteit beloven | $0; usage-billed | **ACCOUNT/INVOICE CHECK** | €26,74 |
| DigitalOcean Spaces Standard | **$5/mnd** | 250 GiB + 1 TiB egress; $0,02/GiB storage, $0,01/GiB egress extra | $0; subscription prorated bij verwijderen alle buckets | **ACCOUNT/INVOICE CHECK** | €4,39 |
| WorkOS AuthKit | **$0/mnd tot 1M MAU**; daarna $2.500 per extra 1M | auth, MFA, organisations; enterpriseconnections afzonderlijk | billinginfo vereist voor production; geen setupprijs gepubliceerd | **ACCOUNT/INVOICE CHECK** | €0 binnen allowance |
| UptimeRobot Solo monthly | **$13/mnd** | 10 monitors, 60 sec, 12m history; SMS/voice apart | $0 setup; maandelijks opzegbaar; 14-day refund policy | **ACCOUNT/INVOICE CHECK** | €11,41 |
| Sentry Developer EU | **$0/mnd** | 5k errors, 5GB logs, 5M spans, 50 replays, 1 user, 30d | geen setup/minimum; bovenlimiet vereist upgrade of events worden niet volledig verwerkt | **ACCOUNT/INVOICE CHECK** | €0 binnen allowance |
| TransIP Object Store | **€0,01/GB-mnd storage + €0,01/GB egress**, per uur | ingress en API requests gratis | eerste project wordt als 30-day trial aangeboden, maar budget rekent zonder korting; geen setup | prijzen **excl. btw** | native EUR |
| DigitalOcean Starter support | **$0/mnd** | 24/7 e-mailticket; <24h initial response; gemiddelde resolution 48h | inbegrepen | n.v.t. | €0 |

### 5.2 Serieuze niet-gekozen producten

| Product | Officiële prijs | Capaciteit/grens | Waarom niet gekozen |
|---|---:|---|---|
| UpCloud Starter 1 GB | €3/mnd excl. tax | 1 vCPU, 10 GB, 250 Mbit/s, 99,99%; max 5 van kleinste plan | dev/test/self-host; geen managed runtime |
| UpCloud Premium 1 GB | €5/mnd excl. tax | 1 vCPU, 25 GB MaxIOPS, 99,999% | production VM maar alle app/OS-operations blijven WBD |
| UpCloud Managed PostgreSQL Developer | €9/mnd excl. tax | 1 node, 1 GB, 3d PITR | single-node dev/test, geen echte HA |
| UpCloud Managed PostgreSQL Standard 2-node | €60 + €54 = €114/mnd excl. tax | 8 GB per node, 15d PITR | zeer degelijk maar overcapaciteit klant 1 |
| UpCloud Managed Object Storage | €5/mnd excl. tax | 250 GB, zero-cost egress fair-use | goed product; niet genoeg voordeel voor providerwissel |
| Scaleway Serverless Container | €0,000002/GB-s + €0,00001/vCPU-s na allowance | pay-per-execution; warm minimumscale kost continu | minder voorspelbaar voor dagelijkse stateful webapp; production support extra |
| Scaleway DB-DEV-S | €0,0156/uur primary vóór tax | 2 vCPU/2 GB; nodes/storage/backups apart | meer prijsonderdelen; production support €250 minimum |
| Scaleway Object Storage Multi-AZ | €0,01606/GB-mnd vóór tax | 75GB egress vrij, daarna €0,01/GB | uitstekend EU-product, maar extra vendor |
| ZITADEL Pro | $100/mnd | 25k DAU, EU residency, support/SLA | privacy/exit sterk; aanzienlijk duurder dan conditional WorkOS start |
| Auth0 B2B Essentials | $35/mnd | 500 MAU, 10 orgs, MFA/RBAC | organisatiegrens en groei minder gunstig |
| DigitalOcean Standard Support | $99/mnd | <2h response, live chat, high-level staff | **defer tot 5 klanten/SLO-trigger**; te groot t.o.v. klant-1 compute |
| Sentry Team | $26/mnd | 50k errors, unlimited users, 90d lookback mogelijk | activeer bij 2e operator of allowanceoverschrijding |
| Cloudflare Free | $0 | CDN/DNS/SSL/DDoS/limited WAF; geen SLA | geen klant-1-noodzaak; operationele extra laag |

Publieke acties/trials zijn niet als structurele besparing gebruikt. Checkout kan tarieven en belasting wijzigen; elk gekozen bedrag vereist een laatste read-only checkoutcontrole vóór aankoop.

## 6. Kostenoverzichten

### A. Bestaande WBD-infrastructuur

| Leverancier | Product | Werkelijke huidige prijs | Maandequivalent | Jaarprijs | Behouden? |
|---|---|---:|---:|---:|---|
| TransIP | `webuildanddesign.nl` domein + Webhosting Pro | **HUMAN/INVOICE VERIFICATION REQUIRED** | onbekend | onbekend | ja; public, preview, Experience en DNS |
| TransIP | `faraouderenzorg.nl` domein + Webhosting Core | **HUMAN/INVOICE VERIFICATION REQUIRED** | onbekend | onbekend | ja, buiten Workspacebesluit |

Canonieke Project 002-evidence bewijst de producten en retention, niet de actuele factuurprijs. Er wordt daarom geen bestaand totaal verzonnen.

### B. Nieuwe klant-1 Workspace-infrastructuur

Modelaannames: één WBD-productieapp, één HA-PostgreSQL-cluster, <250 GiB primary objects, <1M MAU, <5k Sentry-errors, 10 uptime monitors, circa 25 GB encrypted off-provider retention en 5 GB uitgaand herstel-/verificatietraffic per maand.

| Product | Officiële prijs | Verwacht klant 1 / maand | Jaar |
|---|---:|---:|---:|
| App Platform 1 GiB | $10,00 | $10,00 / €8,78 indicatie | €105,36 indicatie |
| PostgreSQL 2 GiB primary | $30,45 | $30,45 / €26,74 | €320,84 |
| PostgreSQL standby | $30,45 | $30,45 / €26,74 | €320,84 |
| Spaces Standard | $5,00 | $5,00 / €4,39 | €52,68 |
| WorkOS AuthKit allowance | $0 | €0 | €0 |
| UptimeRobot Solo monthly | $13,00 | $13,00 / €11,41 | €136,97 |
| Sentry Developer allowance | $0 | €0 | €0 |
| DO Starter support | $0 | €0 | €0 |
| TransIP encrypted recovery, 25 GB + 5 GB egress | usage-based | **€0,30 indication** | €3,60 |
| **PARTIAL NEW TOTAL** | **$88,90 + TransIP usage** | **circa €78,36 excl. btw** | **circa €940,29 excl. btw** |

### C. Volledige WBD-productieketen bij klant 1

| Samenvatting | Bedrag excl. btw |
|---|---:|
| Existing WBD fixed monthly | **UNKNOWN — HUMAN/INVOICE VERIFICATION REQUIRED** |
| New Workspace fixed monthly | $88,90 ≈ **€78,06** |
| Expected usage monthly | **€0,30** TransIP; verder €0 binnen allowances |
| **PARTIAL TOTAL EXPECTED MONTHLY** | **€78,36 + bestaande onbekende TransIP-factuur** |
| **PARTIAL TOTAL EXPECTED YEARLY** | **€940,29 + bestaande onbekende TransIP-jaarprijs** |
| One-time provider setup fees | **€0 list price**; menselijke/technische implementatie-uren niet inbegrepen |

Als op alle nieuwe kosten 21% Nederlandse btw zou gelden, is de rekenkundige indicatie €94,81/maand en €1.137,76/jaar. Dit is **geen fiscale conclusie**. Reverse charge, providerregistratie, bedrijfs-btw-ID en factuurinstellingen moeten per account worden geverifieerd: **TAX TREATMENT REQUIRES INVOICE/ACCOUNT VERIFICATION**.

### D. Groei: 1, 5 en 10 klanten

Dit is een gedeeld multi-organisationplatform; kosten worden niet lineair per klant vermenigvuldigd.

| Schaal | Verantwoorde resource-aanname | Fixed native | Recovery usage | Verwacht excl. btw / maand | Jaar |
|---:|---|---:|---:|---:|---:|
| **1** | 1× App 1GiB fixed; DB 2GiB HA; Spaces; Uptime Solo; Sentry Free; Starter support | $88,90 | €0,30 | **€78,36** | €940,29 |
| **5** | 2× App 1GiB scalable ($24); DB 2GiB HA ($60,90); Spaces $5; Uptime Solo $13; Sentry Team $26; DO Standard Support $99 | $227,90 | €1,10 (100GB +10GB egress) | **€201,21** | €2.414,46 |
| **10** | 2× App 2GiB scalable ($50); DB 4GiB HA ($121,80); Spaces $5; Uptime Team $38; Sentry Team $26; DO Standard Support $99 | $339,80 | €2,75 (250GB +25GB egress) | **€301,11** | €3.613,30 |

Deze 5/10-klantupgrades zijn **budgetscenario's, geen automatische aankopen**. App-, DB-, monitoring- en supportupgrades gebeuren alleen bij meetbare load, operatorgroei, incidentimpact of klant-SLO. Spaces blijft tot 250 GiB binnen $5; WorkOS blijft $0 zolang de MAU-allowance en gebruikte features niet worden overschreden. Enterprise SSO, bijzondere retention, dedicated environments of klant-specifieke residency zijn afzonderlijk door te prijzen.

### Marginale infrastructuurkosten

| Nieuwe klant | Kostensoort | Marginale indicatie |
|---|---|---:|
| Klant 2 binnen klant-1-capaciteit | organisation record, users, DB rows, object GB en verkeer | typisch **€0–€1/mnd usage**; geen nieuwe runtime/DB vereist |
| Klanten 2–5 samen | platformstap naar 2 runtime-instances, Sentry Team en production support in dit scenario | stijging €122,85; gemiddeld **€30,71 per extra klant**, maar platform-wide en niet lineair |
| Klanten 6–10 samen | grotere runtime/DB, monitoring Team en meer backupusage | stijging €99,90; gemiddeld **€19,98 per extra klant** |

Klant-specifiek zijn vooral storage/egress en eventuele enterprise identity/mail-eisen. Runtime, database, monitoring en support zijn platform-wide fixed/step costs. MAU is user-based; object/log/mailvolume is usage-based.

## 7. Support en werkelijke incidentroute

| Provider | Kanaal/uren/taal | Inbegrepen commitment | Betaalde escalatie | WBD bij incident |
|---|---|---|---|---|
| DigitalOcean | 24/7 ticket, Engels; publieke status | Starter $0: <24h reactie, avg. 48h resolution | Standard $99: <2h, live chat, high-level staff; Premium $999 | externe monitor bevestigen; DO status; logs/release/DB-state veiligstellen; ticket met impact/timestamps/resources; eigen rollback/restore uitvoeren waar mogelijk |
| TransIP | control-panel ticket/chat/support, Nederlandse supportorganisatie; publieke status/availabilityregeling | accountproductafhankelijk; geen ongefundeerde responsebelofte vastgelegd | provider/accountcheck nodig | DNS/hosting/Object Store scope bepalen; status controleren; Nederlands ticket; geen brede DNS-change zonder rollback |
| WorkOS | supportroute en publieke status, Engels | free/AuthKit publieke response-SLA niet vastgesteld | enterprise support/SLA op contract | authstatus check; nieuwe login/recovery als unavailable communiceren; bestaande sessies niet kunstmatig omzeilen; ticket; nooit auth fail-open |
| UptimeRobot | help/support en status; Engels | productmonitoring; geen enterprise SLA op Solo | Enterprise bevat SLA/CSM/private Slack, price on request | monitorfalse-positive vanuit tweede netwerk/providerstatus verifiëren; incident openen; handmatig communiceren als UptimeRobot zelf faalt |
| Sentry | community GitHub/Discord op Developer; publieke status | geen dedicated support op free | e-mail op paid; enterprise dedicated | DO logs en UptimeRobot blijven onafhankelijk; Sentry-uitval beïnvloedt app niet en wordt geen reden voor unsafe change |

**Customer-1 supportacceptatie:** DigitalOcean Starter support is bruikbaar maar langzaam. Dit is alleen professioneel als WBD zelf aantoonbare release-, rollback-, backup-, restore- en incidentrunbooks heeft en het klantcontract geen <2 uur providerreactie belooft. Een klant die 24/7 kritieke service of korte response eist, activeert vóór livegang DigitalOcean Standard Support of krijgt een andere geprijsde servicepropositie. Bij 5 klanten is Standard in het budgetscenario opgenomen.

## 8. Data responsibility map

```text
Gebruiker
  ├─ DNS lookup ───────────────> TransIP DNS
  ├─ HTTPS/app requests ───────> DigitalOcean App Platform
  │                               ├─ relational data ─> DO PostgreSQL AMS3
  │                               ├─ private files ───> DO Spaces AMS3
  │                               ├─ auth redirect ───> WorkOS AuthKit
  │                               └─ errors/metrics ──> Sentry EU (minimised)
  └─ public status (optional) ──> UptimeRobot

Scheduled encrypted recovery export
  DO PostgreSQL + DO Spaces ───> client-side encryption ───> TransIP Object Store NL
```

| Partij | Ontvangt | Persoons-/klantdata | Documenten / secrets | Regio / juridische context | Rol en contract | Retentie / export / delete |
|---|---|---|---|---|---|---|
| **TransIP** | domein-/DNS-metadata, bestaande websites; versleutelde recoveryobjects | account/contactdata; encrypted blobs waarvan TransIP inhoud niet hoeft te kennen | geen plaintext Workspace-document; S3 credentials ja in WBD secret store, niet in data | NL, TransIP B.V.; data volgens product in NL | WBD processor richting klant; TransIP subprocessor; DPA in control panel beschikbaar | S3/SWIFT export; lifecycle door WBD; account-delete/retention menselijk bevestigen |
| **DigitalOcean** | volledige apprequests, DB-rows, private objects, operational logs, env/secrets | namen, zakelijke contactdata, organisation/project/history/finance indien gebouwd; mogelijk bijzondere data alleen na apart ontwerp | ja, private documenten in Spaces; provider verwerkt encrypted-at-rest; app secrets | AMS/AMS3 service region; US juridische entiteit en internationale subprocessors mogelijk | DPA en subprocessorregister beschikbaar; WBD blijft verantwoordelijk voor lawful instructions/config | PG dump/PITR, S3 sync, app manifest; providerbackups 7d; deletion test en off-provider export verplicht |
| **WorkOS** | identityprofiel, e-mail, naam, memberships/extern org mapping, authmethods, login-IP/user-agent/sessiondata | authentication personal data; geen businessdossier | geen documenten; WorkOS API/webhook secrets in app secret store | US service; DPA autoriseert US/internationale transfers met SCC | subprocessor voor service data; eigen controllerrollen voor account/telemetry kunnen bestaan en moeten in privacyreview | user/org API/delete; volledige exit/passwordhash-export publiek onvoldoende bewezen — contractgate |
| **UptimeRobot** | endpoint URL, statuscode, response timing, alertcontact, eventueel safe keyword | WBD contactdata; geen end-userprofiel nodig | geen documenten/secrets; health endpoint bevat geen sensitive payload/header op Solo | Slowaakse entiteit; primary EU en secondary US subprocessors volgens DPA | DPA beschikbaar | 12m Solo monitoringhistory; monitor verwijderen/exportmogelijkheden accountcheck |
| **Sentry** | stack traces, release ID, breadcrumbs, performance/error/logmetadata | mogelijk user/organisation pseudonymous IDs en IP tenzij uitgeschakeld | **geen** documentbody, tokens, passwords, requestbody of sensitive fields; SDK scrublist verplicht | EU dataregion kiezen; US entiteit/DPA en subprocessors/transfers | DPA beschikbaar; WBD configureert lawful minimisation | 30d Developer; project/delete/export via product/API; niet system of record |
| **Cloudflare (deferred)** | niets zolang niet geactiveerd | n.v.t. | n.v.t. | globale US edgeprovider | pas DPA/dataflowreview bij concrete cutover | niet in klant-1-keten |

WBD is in een klantrelatie normaliter verwerker; de zakelijke klant is verwerkingsverantwoordelijke; infrastructuur-/SaaS-providers zijn subverwerkers voor de gegevens die zij namens WBD verwerken. De precieze rolverdeling, doeleinden, bewaartermijnen, datacategorieën en doorgifte-instrumenten moeten in WBD–klant DPA en subprocessorbijlage worden vastgelegd. Dit document is geen juridisch advies.

## 9. Identity-specifieke menselijke review

### Bevinding

WorkOS heeft de beste functionele aansluiting op organisation-first B2B: hosted auth, MFA, organisations, policies en toekomstig enterprise SSO zonder dat WBD password-/recoveryoperations zelf bouwt. De free allowance verwijdert echter geen contract- of privacyrisico. De eigen DPA maakt expliciet internationale transfers mogelijk en de eigen 2026-publicatie beschrijft identity als een globale/US control plane. EU-hosting van de Workspace-content maakt WorkOS dus niet automatisch EU-only.

### Voorwaarden vóór production

1. Mens accepteert de actuele WorkOS DPA, SCC-module, transfer impact en subprocessors.
2. Mens verifieert waar AuthKit user-, session-, backup- en supportdata feitelijk worden opgeslagen/verwerkt.
3. Retention/delete na user deletion en account termination is schriftelijk voldoende.
4. Accountowner, MFA, recovery en billinginfo hebben minimaal twee herstelroutes zonder secrets in projectdocs.
5. WBD documenteert export van users, e-mails, verification, memberships en — cruciaal — de migratieroute voor password users. Als hashes niet exporteerbaar zijn, is gefaseerde password reset de exitroute.
6. WBD houdt canonical organisations, membershipstatus, roles, permissions en audit in PostgreSQL; WorkOS IDs zijn external references.
7. Login outage leidt nooit tot bypass/fail-open.
8. Een klant met harde EU-only identity-eis activeert niet stilzwijgend WorkOS; dan volgt ZITADEL EU of een andere goedgekeurde route met nieuwe kostenreview.

**Resultaat:** **RECOMMEND WITH CONDITIONS**.

## 10. Backup, recovery en servicelevels

### Recoverylagen

| Asset | Primary continuity | Onafhankelijke recovery | Te bewijzen vóór live |
|---|---|---|---|
| Application | Git/source, lockfile, build/release manifest, App Platform revisions; stateless runtime | reproduceerbaar container/build artifact en configinventory zonder secretvalues | clean deploy, previous-release rollback, schema compatibility |
| PostgreSQL | HA standby; dagelijkse providerbackups + PITR 7d; restore naar nieuw cluster | dagelijkse encrypted logical dump naar TransIP Object Store | dump integrity, restore naar isolated DB, row counts/checks, secret/connection cutover |
| Private objects | Spaces private; versioning + lifecycle; checksums/object manifest | encrypted incremental copy naar TransIP Object Store | delete/previous version, bulk export, decrypt/restore selected file en full manifest |
| Identity mapping | WorkOS service + WBD external ID mapping | periodic minimal identity/org/member export where contract permits; canonical authz remains WBD | disable user, revoke session, provider-outage behavior, migration rehearsal |
| DNS | TransIP zone and domain ownership | secret-free DNS record inventory; low-TTL planned change | exact record rollback/TLS check |
| Monitoring | UptimeRobot + Sentry + provider status | manual second-network checks and local/provider logs | test alert, false positive route, contact recovery |

### RPO/RTO-capability, geen belofte

- Provider-PITR kan PostgreSQL naar een transactiepunt binnen de afgelopen 7 dagen herstellen; exacte laatste recoverable transaction moet bij restore worden vastgesteld.
- Onafhankelijke dagelijkse exports geven een conservatieve off-provider **RPO-capability van maximaal circa 24 uur**, zodra succesvolle exports en restoretests bewezen zijn.
- HA vermindert node-outage, maar elimineert logisch dataverlies, region failure of operatorfouten niet.
- Een voorlopig intern hersteldoel van **RTO 4 uur voor applicatie/releaseherstel** en **RTO 8 uur voor volledige datarestore** is alleen een ontwerpdoel. Mens en eerste klant moeten impact, supportniveau, bereikbaarheid en contractuele servicelevels accepteren.
- Ieder kwartaal en vóór grote datamigraties: isolated DB-restore plus steekproef objectrestore. Jaarlijks: volledige provider-exit/tabletop.

Providerbackup is geen WBD-recoverystrategie. Verwijderen van een DigitalOcean DB-cluster verwijdert ook de providerbackups; off-provider exports moeten vóór destructive action bestaan en restorebaar zijn.

## 11. Security en trust

Minimale production gates, los van providerlogo's:

- MFA en recovery op TransIP, DigitalOcean, WorkOS, UptimeRobot en Sentry; geen gedeeld persoonlijk account.
- least-privilege teamroles en scoped runtime/DB/Spaces keys; secret rotationregister zonder secretvalues.
- TLS naar app, DB en object storage; DB trusted sources/private connectivity waar productmatig mogelijk.
- Spaces private-by-default, public access negative test, versioning/lifecycle en separate backup credential.
- server-side `organization_id` derivation; nooit vertrouwen op browser/local storage tenantkeuze.
- database constraints/RLS waar passend, cross-organisation denial tests en object-key namespace enforcement.
- Sentry PII scrub, sampling en denylist voor headers, body, querystrings, finance, documents en authtokens.
- safe `/health` en `/ready` endpoints zonder klantdata, version details of secrets.
- immutable release evidence, migrations geclassificeerd, rollback/forward-fix, human production GO.
- DPA/subprocessors/customer subprocessorlist, retentionregister en incident/breachroute.
- security contact/vulnerability reporting en provider-statusfeeds in het incidentrunbook.

Trust blijft aantoonbaar WBD-gedrag: isolationtests, restorebewijs, heldere verantwoordelijkheid en beheerste releases.

## 12. Vendor lock-in en exit over twee jaar

| Providerlaag | Exitactie | Proprietary afhankelijkheid | Complexiteit |
|---|---|---|---|
| DigitalOcean App Platform | container/Node app + env schema naar andere PaaS/IaaS; DNS wijzigen na parallel proof | App spec, alerts, revisionhistory | **laag/middel** als filesystem stateless blijft |
| DigitalOcean PostgreSQL | `pg_dump`/`pg_restore` of logical replication; extensions vooraf inventariseren; validate counts/checks | provider users/metrics/PITR niet portable | **middel**; database-engine blijft standaard PostgreSQL |
| DigitalOcean Spaces | S3 list/sync inclusief versions waar nodig; checksums/manifests; presigned URL adapter wijzigen | S3 subset, key/policysemantics | **laag/middel** |
| WorkOS | users/org/membership export; mapping vanuit WBD DB; nieuwe OIDC-provider parallel; password reset/hash migration; revoke old sessions | hosted flow, user IDs, sessions, mogelijk password hashes | **middel/hoog** en daarom conditional |
| UptimeRobot | monitorlijst/contacten/statuspage recreëren; DNS statusdomain aanpassen | history/status configuration | **laag** |
| Sentry | SDK DSN/config verwijderen of naar compatible observability; export relevante incidents | history/dashboards | **laag**; niet system of record |
| TransIP DNS/domain | DNS records exporteren/recreëren; domain transfercode onder human control; TTL/cutoverplan | registrar control panel | **laag/middel** |
| TransIP backup storage | S3/SWIFT export, decrypttest, checksumverify, nieuwe endpoint | beperkt door standard object APIs | **laag** |

Portabilityregels: geen provider-ID als businessprimary key, geen durable local filesystem, geen provider-only databasefeature zonder exitnotitie, storage achter S3-adapter, identity achter OIDC/provideradapter, config/releasemanifest in source control zonder secrets.

## 13. Provider outage playbook

| Failure | Klantimpact | WBD-respons | Support/recoveryroute |
|---|---|---|---|
| Runtime/App Platform | Workspace geheel of gedeeltelijk unavailable; DB/data mogelijk intact | Uptime alert verifiëren; DO status; laatste release/metrics/logs; previous revision/redeploy alleen als app-gerelateerd; incidentcommunicatie | DO ticket; stateless redeploy; bij langdurige providerstoring portable container naar vooraf voorbereide alternatieve runtime is disasterproject, geen instant failoverclaim |
| PostgreSQL primary/node | writes/reads kunnen kort falen | retries begrensd; geen writes cachen in browser; failover observeren; consistency check | managed standby promote; DO status/ticket. Bij cluster/logical failure restore naar nieuw cluster en gecontroleerde connection switch |
| WorkOS | nieuwe login, MFA/recovery of tokenrefresh kan falen | providerstatus; bestaande geldig geverifieerde sessies alleen volgens bestaande lifetime; heldere melding; geen bypass/admin backdoor | WorkOS support; na herstel revoke/consistency review; bij langdurig incident exitplan, niet ad hoc auth bouwen |
| Spaces | documents unavailable/uploads falen; kernrecord kan blijven werken | documentfuncties degraded/read-only; bounded retry; geen duplicate writes; object manifest check | DO status/ticket; version restore; bij permanent verlies encrypted TransIP copy terugplaatsen |
| TransIP DNS | naamresolutie of wijzigingsbeheer raakt app/public sites | onafhankelijke resolvers testen; geen onnodige changes; recordinventory/TTL beoordelen | TransIP status/support; exact record rollback of vooraf goedgekeurde secondary-DNS-route, niet improviseren |
| UptimeRobot | alerts/statuspage ontbreken, app kan gezond zijn | handmatige probe, DO/Sentry/TransIP status en klantmeldingen; monitoringincident apart | UptimeRobot support; geen productionchange alleen door afwezige monitor |
| Sentry | error visibility verminderd, app blijft werken | DO runtime logs/metrics en UptimeRobot gebruiken; sampling/buffer niet onbeperkt opvoeren | Sentry status/community/support; na herstel gaps documenteren |

Er wordt geen “zero downtime” beloofd. WBD blijft eindverantwoordelijk voor triage, communicatie, veilige restorekeuze en klantcontract; providers voeren hun platformverantwoordelijkheden uit.

## 14. Groei zonder fundamentele herbouw

**Ja, conditioneel.** De keten kan groeien van intern naar klant 1, 5 en 10 klanten en een grotere zakelijke klant zonder engine-, identitymodel- of storagearchitectuur te vervangen, mits:

- de Workspace één modulair Node/TypeScript-monolith blijft zolang opsplitsing geen meetbare noodzaak heeft;
- organisatiescheiding canoniek in WBD/PostgreSQL zit en vóór klant 2 hard is getest;
- runtime horizontaal kan schalen door van fixed $10 naar scalable $12/$25 instances te gaan;
- PostgreSQL verticaal en met standby/read nodes groeit; connectionpooling en querymetrics worden vóór grotere tiers gebruikt;
- private documenten via S3-contract en objectmanifesten lopen;
- WorkOS uitsluitend identity levert en canonical authorization intern blijft;
- monitoring/support op incidentimpact en operatoraantal opschaalt;
- enterprise SSO, dedicated tenant, hard EU-only identity of bijzondere compliance als geprijsde capability wordt behandeld.

Een grotere zakelijke klant kan wel een dedicated database/environment, langere retention, enterprise identity/SLA of paid support eisen. Dat is capaciteits-/contractuitbreiding binnen dezelfde architectuur, niet noodzakelijk een fundamentele rebuild.

## 15. Klantverklaring (voorbereiding, geen marketingcopy)

> WBD draait de Workspace op een professioneel beheerd applicatieplatform in een Europese regio. Klantgegevens worden per organisatie afgeschermd in een centrale PostgreSQL-database; private documenten staan niet publiek en worden via gecontroleerde toegangsregels opgehaald. Inloggen en MFA worden door een gespecialiseerde identitydienst verzorgd, terwijl WBD zelf eigenaar blijft van organisaties, rollen en autorisaties. De database heeft een standby en point-in-time herstel, documenten hebben versiebeheer en versleutelde herstelkopieën worden bij een onafhankelijke Nederlandse provider bewaard. Externe beschikbaarheid en applicatiefouten worden afzonderlijk gemonitord. WBD beheert releases, toegangsrechten, bewaartermijnen, restoretests en incidentcommunicatie en legt leveranciers vast als subverwerkers. De technische basis gebruikt gangbare standaarden zoals PostgreSQL, S3 en OIDC, zodat capaciteit kan meegroeien en migratie mogelijk blijft zonder klantdata in een gesloten applicatiemodel op te sluiten.

## 16. Production provider stack — recommended

| Functie | Leverancier | Exact product | Waarom | Officiële prijs | Verwacht klant 1 | Wanneer activeren | Belangrijkste voorwaarde |
|---|---|---|---|---:|---:|---|---|
| Registrar/DNS/public | TransIP | bestaande domeinen, DNS, Webhosting Pro/Core | bewezen bestaand, NL support, geen dubbele hosting | actual invoice unknown | bestaand | behouden | factuur/owner/recovery verifiëren; geen wijziging nu |
| Runtime | DigitalOcean | App Platform `apps-s-1vcpu-1gb-fixed`, AMS | managed OS/process/HTTPS/release; lage opslast | $10/mnd | $10 | Customer 1 live | loadtest, health, rollback en ephemeral filesystem |
| Database | DigitalOcean | Managed PostgreSQL Basic Regular 2GiB primary + standby, AMS3 | managed HA/PITR/patching, standard PG | $60,90/mnd | $60,90 | Customer 1 live met echte data | RPO/RTO, isolated restore en DPA |
| Primary documents | DigitalOcean | Spaces Standard AMS3, private/versioned | S3, same-region, lifecycle, 250GiB included | $5/mnd | $5 | wanneer echte private docs live gaan | private/access/version/restore negative tests |
| Identity/MFA | WorkOS | AuthKit production | B2B organisations/MFA, lage startops | $0 tot 1M MAU | $0 | Customer 1 live | **CONDITIONAL:** DPA/transfers/export/delete/recovery human GO |
| Uptime | UptimeRobot | Solo monthly | 60-sec onafhankelijke detectie en 12m history | $13/mnd | $13 | bij eerste externe production endpoint | DPA, safe health endpoint, test alert |
| App errors | Sentry | Developer, EU region | structured error visibility zonder early fixed cost | $0 allowance | $0 | bij production candidate | PII scrub/EU region/limits; upgrade trigger |
| Off-provider recovery | TransIP | Object Store | providerdiversiteit, NL, S3/SWIFT, usage-priced | €0,01/GB storage + egress | circa €0,30 | vóór eerste echte productiegegevens | client-side encryptie, manifest, restore PASS |
| TLS/CDN/DDoS baseline | DigitalOcean | App Platform included | voorkomt extra edgeleverancier | inbegrepen | €0 extra | met runtime | origin/TLS/security headers testen |
| Transactional app-mail | Scaleway, candidate only | TEM Essential | volwassen EU pay-as-you-go route | 300 mails incl., daarna €0,25/1k | €0 zolang niet nodig | later bij concrete app-mail | afzonderlijke deliverability/DPA/DNS-GO |
| Extra edge/WAF | Cloudflare | none | geen bewezen klant-1-vereiste | $0 zolang niet actief | €0 | later op concrete risk/performance trigger | afzonderlijke 002C.8 GO |

## 17. Wat kopen we wanneer?

### Nu

- **Niets. Nieuwe maandlast: €0.**
- Alleen providerneutrale lokale WS.1–WS.3-voorbereiding na afzonderlijke Workspace-GO: boundaries, schema/migrations, repositories, adapters, policytests en synthetic fixtures.
- Geen provideraccount, trial, card, service of permanent staging nodig voor verdere lokale bouw.

### Klant 1 live

Na aparte contract/privacy/budget/account-GO en geslaagde production gates:

1. DigitalOcean App Platform 1 GiB fixed, AMS — $10/mnd.
2. DigitalOcean Managed PostgreSQL 2 GiB primary + standby, AMS3 — $60,90/mnd.
3. DigitalOcean Spaces Standard AMS3 — $5/mnd zodra documenten live zijn.
4. WorkOS AuthKit production — $0 binnen allowance, **conditional** en billinginfo vereist.
5. UptimeRobot Solo monthly — $13/mnd.
6. Sentry Developer EU — $0 binnen allowance.
7. TransIP Object Store — usage-based, pas na encrypted export/restore proof.

### Later / growth

- scalable/tweede App instance bij load of availabilitydoel;
- grotere PostgreSQL tier bij memory/CPU/connections/storage/querybewijs;
- DigitalOcean Standard Support bij 5 klanten of contractuele response-eis;
- Sentry Team bij tweede operator, >5k errors of langere retention;
- UptimeRobot Team bij meer seats/integrations/monitors/statuspages;
- transactional mail bij een echte niet-auth mailcapability;
- enterprise SSO/directory sync per betalende klantbehoefte;
- Cloudflare bij concrete WAF/DDoS/performance/edge-eis;
- dedicated klantomgeving alleen bij risico, contract of compliance, niet als standaardarchitectuur.

## 18. Definitieve financiële samenvatting

```text
EXISTING WBD INFRASTRUCTURE
ACTUAL WBD COST: HUMAN/INVOICE VERIFICATION REQUIRED
No reliable monthly/yearly total available.

NEW WORKSPACE CUSTOMER-1 INFRASTRUCTURE
approximately €78.36 / month excl. VAT
approximately €940.29 / year excl. VAT

TOTAL WBD INFRASTRUCTURE AT CUSTOMER 1
PARTIAL TOTAL ONLY:
approximately €78.36 / month + unknown existing TransIP invoice
approximately €940.29 / year + unknown existing TransIP annual cost

EXPECTED AT 5 CUSTOMERS
approximately €201.21 / month excl. VAT
approximately €2,414.46 / year excl. VAT
+ unknown existing TransIP infrastructure

EXPECTED AT 10 CUSTOMERS
approximately €301.11 / month excl. VAT
approximately €3,613.30 / year excl. VAT
+ unknown existing TransIP infrastructure

ONE-TIME PROVIDER COSTS
€0 published setup fees
Implementation/human labour and possible migration support are excluded.

UNKNOWN / USAGE-RISK
Existing TransIP invoices; tax/reverse-charge; FX; real object/egress/log/error/mail use;
enterprise identity connections; customer-specific retention/residency; paid support timing;
provider price changes and checkout-specific conditions.
```

Indicatief inclusief 21% indien die werkelijk op alle nieuwe posten geldt: klant 1 €94,81/mnd; 5 klanten €243,46/mnd; 10 klanten €364,34/mnd. **Niet gebruiken als factuur- of fiscale claim zonder account-/invoicecheck.**

## 19. Menselijke beslissingen en gates

### Beslissingen vóór provider readiness GO

1. Accepteert WBD circa €78,36 excl. btw per maand voor de veilige HA klant-1-keten, versus expliciete non-HA-risicoacceptatie?
2. Accepteert eerste klant het te formuleren RPO/RTO en geen 24/7/enterprise uptimebelofte?
3. Accepteert WBD DigitalOcean als US juridische leverancier met AMS-dataregio, DPA/SCC en subprocessors?
4. Accepteert WBD WorkOS-internationale identitydoorgifte, retention/deletion en de concrete exit/password-migratieroute?
5. Welke persoonsgegevens/documentcategorieën zijn voor klant 1 toegestaan, en zijn bijzondere persoonsgegevens uitgesloten of apart ontworpen?
6. Wie zijn contractowner, technical owner, billing owner en tweede recoverypersoon per provider?
7. Zijn alle provideraccounts zakelijk, met MFA, recovery en gecontroleerde least privilege?
8. Wat is de juiste btw-/reverse-chargebehandeling en wat zijn de actuele bestaande TransIP-factuurbedragen?
9. Is DigitalOcean Starter support voldoende voor klant 1, of vereist klantcontract Standard Support vanaf livegang?
10. Welke data-/audit-/object-/backupretentie geldt en wanneer worden exports/delete/restore getest?
11. Keurt de klant/WBD-subprocessorbijlage DigitalOcean, WorkOS, UptimeRobot, Sentry en TransIP goed?

### Production gates

- DPA/subprocessor/TIA/account/tax/checkout review PASS;
- WS.1 route/runtime boundary PASS;
- WS.2 identity/organisation/permissions en cross-tenant negative tests PASS;
- WS.3 migrations, durable data, private objects, export/delete en audit PASS;
- immutable release, health/ready, alert en rollback PASS;
- HA database en isolated DB restore PASS;
- object version + encrypted off-provider restore PASS;
- owner/MFA/recovery/secrets/access register PASS;
- klantcontract, privacy, supportniveau, RPO/RTO en incidentcommunicatie HUMAN GO;
- afzonderlijke provisioning-, DNS-, migration- en deployment-GO's.

## 20. Eindstatus

| Status | Besluit | Reden |
|---|---|---|
| **WSP.2C ASSESSMENT** | **GO** | één providerketen, alternatieven, exacte prijzen, support, data responsibility, recovery, exit en groei zijn voldoende onderbouwd |
| **PROVIDER DECISION READINESS** | **CONDITIONAL** | technische voorkeur is duidelijk; WorkOS privacy/exit, DO support/SLO, DPA/TIA, tax/account checkout en bestaande invoices vereisen menselijke review |
| **PRODUCTION PURCHASES** | **NO-GO** | geen aankoop, trial, billinginfo of accountwijziging geautoriseerd |
| **PRODUCTION DEPLOYMENT** | **NO-GO** | WS.1–WS.5, isolation, restore, release, DNS en klantcontractgates zijn niet uitgevoerd binnen deze opdracht |

## 21. Canonieke lokale input

- `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`
- `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md`
- `PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md`
- `PROJECT-002C-WORKSPACE-ARCHITECTURE-INPUT.md`
- `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`
- `PROJECT-002C-WSP1-RUNTIME-SERVICE-FIT-ASSESSMENT.md`
- `PROJECT-002C-WSP2A-PROVIDER-CONTRACT-COST-PHASING-VERIFICATION.md`
- `PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md`
- `PROJECT-WS-VIS1-WORKSPACE-VISUAL-DIRECTION-CONCEPT.md`
- `PROJECT-WS-VIS2-VISUAL-SYSTEM-RESPONSIVE-INTERACTION-SPECIFICATION.md`
- Project 002C access, monitoring, backup, DNS, release-control en Cloudflare-baselines

**STOP.** Dit assessment geeft geen automatische goedkeuring voor implementatie, aankoop, accountactivatie, providerconfiguratie, DNS, data, deployment of productie.
