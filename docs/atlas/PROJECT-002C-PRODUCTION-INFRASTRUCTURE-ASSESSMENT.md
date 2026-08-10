# Project 002C.1 — Production Infrastructure Assessment

**Datum:** 6 augustus 2026

**Status:** **GO — assessment afgerond; uitsluitend gefaseerde implementatieplanning toegestaan**

**Karakter:** read-only onderzoek, architectuurbeoordeling en documentatie

**Productie-impact van 002C.1:** geen

**Canonieke voorgangers:** Project 002A en Project 002B

## Leeswijzer en bewijsstatus

Iedere feitelijke constatering gebruikt een van deze labels:

- **VERIFIED** — tijdens 002C.1 rechtstreeks in de lokale repository of in actuele officiële providerdocumentatie vastgesteld;
- **DOCUMENTED BUT NOT VERIFIED** — onderbouwd in een eerdere, gedateerde WBD-validatie, maar tijdens 002C.1 niet opnieuw in een account, server of live omgeving gecontroleerd;
- **UNKNOWN** — niet met het beschikbare bewijs vast te stellen;
- **RECOMMENDATION** — voorgestelde doelrichting; geen beschrijving van reeds bestaande werkelijkheid.

Een GO in dit document geeft geen toestemming voor een productie-, DNS-, hosting-, account- of deploymentwijziging. Iedere uitvoeringsstap met externe of productie-impact vereist een afzonderlijke preflight en expliciete menselijke GO.

---

## 1. Executive Summary

De huidige WBD-infrastructuur is begrijpelijk, herstelbaar en proportioneel voor de huidige fase: één eigenaar/beheerder, één publieke WBD-website, één centrale Experience en een beperkte dagelijkse interne Workspace. De productie draait op TransIP shared webhosting met afzonderlijke website- en Experience-DocumentRoots, een aparte previewsite, MariaDB/MySQL-opslag, automatische TLS en providerback-ups. Releases worden handmatig maar gecontroleerd naar versioned directories gebracht en geactiveerd via een DocumentRoot-wissel. **DOCUMENTED BUT NOT VERIFIED**

Project 002B heeft de directe security- en recoveryblockers gesloten. 2FA, onafhankelijk herstel, recoverycodes, tijdelijke-keyverwijdering, concrete herstelpunten en een volledig geïsoleerde restoretest zijn GO. De restoretest herstelde 11 van 11 verwachte tabellen, valideerde 10 foreign keys zonder weesrecords en liet de bronback-up ongewijzigd. **DOCUMENTED BUT NOT VERIFIED**

De huidige opzet hoeft niet direct naar VPS, containers, orchestration of een managed cloudplatform te worden verplaatst. De belangrijkste tekortkomingen zitten niet in rekenkracht, maar in operationele beheersing:

1. er is geen formele, onafhankelijk bewaakte productiebaseline voor uptime, TLS, DNS, release-identiteit en Experience-health;
2. deployment is reproduceerbaar maar handmatig, zonder CI/CD, onveranderlijk centraal artefactregister of machineleesbaar omgevingsregister;
3. providerback-ups en lokale pre-releaseback-ups zijn bruikbaar, maar een periodieke versleutelde off-provider kopie en vastgelegde RPO/RTO ontbreken;
4. DNS bevat een brede wildcard, `www` is geen bewezen canonieke redirect, DMARC staat nog op observatiebeleid en CAA ontbreekt;
5. de Experience-database is geschikt voor de huidige enkele omgeving, maar is niet ontworpen als formeel multi-tenant klantplatform;
6. WBD Workspace en Atlas hebben nog geen zelfstandige productiegrens; de publieke buildcontrole voorkomt juist dat interne routes per ongeluk in de publieke website terechtkomen.

Cloudflare Free kan later een zinvolle extra laag zijn voor WBD DNS, proxy/CDN, DDoS-bescherming, de Free Managed Ruleset, maximaal één eenvoudige rate-limitregel en beperkte cacheregels. Het is geen noodzakelijke voorwaarde voor de eerstvolgende infrastructuurverbeteringen en geen vervanging voor originbeveiliging, sessiebeveiliging, back-ups, monitoring of tenantisolatie. Een migratie vereist volledige DNS-inventarisatie, expliciete behandeling van mailrecords, DNSSEC-uit/aan-volgorde, origin-TLS-validatie en cache-bypass voor Experience-, login-, beheer- en API-routes. **RECOMMENDATION**

**Besluit:** Project 002C.1 is **GO**. De architectuur is voldoende bekend om Project 002C.2 als klein, niet-destructief implementatieproject te plannen. Er is **NO-GO** voor één brede infrastructuurmigratie, een ongecontroleerde Cloudflare-cutover, productiehosting van interne Workspaces of multi-tenant klantgebruik zonder de hieronder benoemde tussenstappen.

---

## 2. Scope

### Binnen scope

- huidige TransIP-hosting en aantoonbare servicelagen;
- domeinen, DNS, SSL/TLS en canonicalisatie;
- lokale ontwikkeling, preview en productie;
- deployment, release-identiteit en rollback;
- Experience-database, migraties en data-isolatie;
- backup en recovery;
- toegangsrechten en secretbeheer op architectuurniveau;
- monitoring en operationele bewijsvoering;
- Cloudflare Free als mogelijke extra laag;
- schaalpad voor meerdere organisaties en klanten;
- kleine vervolgprojecten voor gecontroleerde uitvoering.

### Buiten scope

- iedere account-, hosting-, DNS-, SSL-, database-, Cloudflare- of productiehandeling;
- code-, UX- of functionele wijzigingen;
- geheimwaarden, Bitwarden-inhoud, recoverycodes of credentials;
- aankoop, upgrade, migratie of deployment;
- uitvoering van een vervolgproject;
- Project 002A of 002B opnieuw openen.

---

## 3. Evidence / Sources Reviewed

### Canonieke WBD-bronnen

| Bron | Gebruik | Status in 002C.1 |
|---|---|---|
| `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md` | TransIP-account, hosting, DNS, TLS, omgevingen, database, deploy, backup en schaalanalyse | volledig als gedateerde bron gebruikt; niet opnieuw in TransIP gevalideerd |
| `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md` | actuele securitybaseline en formele GO van 002B | als canonieke voorganger gebruikt |
| `PROJECT-002B-RECOVERY-HUMAN-CHECKLIST-2026-08-06.md` | menselijke recoveryroute voor eenpersoonsorganisatie | als menselijke bevestiging gebruikt; geen geheime inhoud ingezien |
| `PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md` | aantoonbare restorebaarheid van Experience-back-up | resultaten en cleanup gebruikt |
| `ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md` | versioned Experience-release, databaseback-up, migratie en rollback | deploymentpatroon gebruikt |
| `ATLAS-CONTEXT-FIRST-PRODUCTION-DEPLOYMENT-V1.md` | kopie-gebaseerde release, bytevergelijking en rollback zonder DB-wijziging | deploymentpatroon gebruikt |
| `RELEASES/PRODUCTION-INCIDENT-ANALYSIS-001.md` | onderscheid tussen applicatiefout en meetfout | monitoring- en releaseadvies gebruikt |
| `RELEASES/PRODUCTION-INFRASTRUCTURE-INVESTIGATION-001.md` | TransIP control-plane/data-plane activatievertraging | deployment- en rollbackrisico gebruikt |
| `PROJECT-001-FINAL-RELEASE-REVIEW-2026-08-05.md` | laatst gedocumenteerde productievalidatie van Product 001 | releasecontext gebruikt |

### Rechtstreeks onderzochte repositorybronnen

- Git branch `codex/wbd-experience-release-20260801`, HEAD `1ec989896834`; **VERIFIED**.
- Git remote verwijst naar de GitHub-repository `donovanweide-code/atlas`; **VERIFIED**.
- geen getrackte `.github/workflows`; **VERIFIED**.
- de werkboom bevat veel reeds bestaande wijzigingen en is daarom geen schone releasebron; **VERIFIED**.
- `website/package.json`, Vite-configuraties en releasevalidatiescripts; **VERIFIED**.
- publieke buildgrens in `website/scripts/verify-public-build.mjs`; **VERIFIED**.
- Experience-packagegrens in `website/scripts/prepare-experience-package.mjs`; **VERIFIED**.
- deployment capture/evaluate/activate-logica in `website/scripts/release-validation.mjs`; **VERIFIED**.
- Experience-configvoorbeeld, API-bootstrap en databaseschema; **VERIFIED**.
- root- en website-`.gitignore`; **VERIFIED**.

Er zijn geen legacy credential-notities geopend en geen geheimwaarden gelezen, gekopieerd of vastgelegd.

### Actuele officiële providerbronnen

- TransIP, [Webhosting](https://www.transip.nl/webhosting/) — automatische back-ups, pakketkenmerken en retentieclaim; **VERIFIED als actuele providerdocumentatie**.
- TransIP, [Let's Encrypt voor webhosting](https://www.transip.nl/knowledgebase/6985-let-s-encrypt-voor-webhosting/) — automatisch TLS, subdomeinen, DNS- en DNSSEC-afhankelijkheden; **VERIFIED als actuele providerdocumentatie**.
- TransIP, [Handmatig een websiteback-up maken](https://www.transip.nl/knowledgebase/5927-handmatig-back-up-maken-website-webhostingpakket) — handmatige file/database-backupgrens; **VERIFIED als actuele providerdocumentatie**.
- Cloudflare, [Full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) — Free/Pro vereisen full setup, DNS-recordreview en DNSSEC-volgorde; **VERIFIED als actuele providerdocumentatie**.
- Cloudflare, [WAF overview](https://developers.cloudflare.com/waf/) — Free Managed Ruleset, één rate-limitregel en planbeperkingen; **VERIFIED als actuele providerdocumentatie**.
- Cloudflare, [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/) — Free heeft maximaal tien cache rules; **VERIFIED als actuele providerdocumentatie**.
- Cloudflare, [Dynamic content and login issues](https://developers.cloudflare.com/cache/troubleshooting/dynamic-content-and-login-issues/) — login-, account- en API-routes moeten niet als algemene HTML worden gecachet; **VERIFIED als actuele providerdocumentatie**.

### Bewijsgrenzen

- 002C.1 heeft niet ingelogd bij TransIP, GitHub, Cloudflare, Bitwarden of een e-mailaccount.
- 002C.1 heeft productie, DNS, certificaten, database-inhoud en serverlogs niet opnieuw live bevraagd.
- providerpakketnamen, quota en prijzen kunnen wijzigen; definitieve implementatie moet daarom een verse accountinventarisatie bevatten.
- de werkelijke facturatie- of Codex-creditwaarde is niet zichtbaar.

---

## 4. Current State Architecture

### 4.1 Logische kaart

| Laag | Huidige invulling | Bewijsstatus |
|---|---|---|
| Registrar en DNS | TransIP voor `webuildanddesign.nl` en `faraouderenzorg.nl`; TransIP-nameservers en DNSSEC | DOCUMENTED BUT NOT VERIFIED |
| Publieke website | statische Vite-build op `webuildanddesign.nl`, versioned DocumentRoot op Webhosting Pro | DOCUMENTED BUT NOT VERIFIED |
| `www` | alias/CNAME naar de apex; duplicate 200 in plaats van bewezen permanente canonical redirect | DOCUMENTED BUT NOT VERIFIED |
| Preview | `preview.webuildanddesign.nl`, aparte subsite op dezelfde Webhosting Pro-omgeving | DOCUMENTED BUT NOT VERIFIED |
| Experience | `experience.webuildanddesign.nl`, aparte versioned DocumentRoot met statische frontend en PHP-API | DOCUMENTED BUT NOT VERIFIED |
| Experience-config | private PHP-config buiten de DocumentRoot | DOCUMENTED BUT NOT VERIFIED; repositorypatroon VERIFIED |
| Experience-data | centrale relationele database `webuil_experiencev1`; 11 tabellen na Runtime-migratie | DOCUMENTED BUT NOT VERIFIED |
| WBD Workspace / Atlas | geen aantoonbare zelfstandige productiehost; interne routes worden uit de publieke build geweerd | repositorygrens VERIFIED; hostingstatus DOCUMENTED BUT NOT VERIFIED |
| Observatory | afgeschermde route binnen de Experience-applicatie, geen afzonderlijke infrastructuurgrens | DOCUMENTED BUT NOT VERIFIED |
| Fara | afzonderlijk domein en Webhosting Core met WordPress | DOCUMENTED BUT NOT VERIFIED |
| Deployment | lokale build, handmatige transfer, versioned directory, expliciete DocumentRoot-switch | DOCUMENTED BUT NOT VERIFIED; scripts VERIFIED |
| Rollback | DocumentRoot terugzetten naar vorige versioned directory; DB-restore alleen indien migratie dit vereist | DOCUMENTED BUT NOT VERIFIED |
| Back-up | TransIP-retentie plus pre-release SQL- en file-archieven; restorebaarheid Experience bewezen | providerclaim VERIFIED; WBD-werkelijkheid DOCUMENTED BUT NOT VERIFIED |
| Toegang | één TransIP-accountbeheerder, 2FA en onafhankelijk recoverypad; tijdelijke deploykeys verwijderd | DOCUMENTED BUT NOT VERIFIED |

### 4.2 Fysieke en operationele werkelijkheid

- `webuildanddesign.nl` gebruikt TransIP Webhosting Pro met drie van drie gedocumenteerde websiteslots: hoofddomein, preview en Experience. **DOCUMENTED BUT NOT VERIFIED**
- Er is geen VPS, containerplatform, queue, object store, afzonderlijke load balancer of managed database aangetoond. **DOCUMENTED BUT NOT VERIFIED**
- Publieke website en Experience gebruiken verschillende DocumentRoots maar delen het hostingaccount en daarmee een deel van de provider- en beheerblast-radius. **DOCUMENTED BUT NOT VERIFIED**
- De Experience gebruikt PHP 8.2 en PDO met prepared statements, uitgeschakelde emulated prepares, same-origincontrole, veilige cookies, no-store en databasegestuurde rate limits. **Repositorypatroon VERIFIED; actieve productieconfiguratie DOCUMENTED BUT NOT VERIFIED**
- De lokale repository bevat build- en releasecontrole, maar geen centraal CI/CD-proces. **VERIFIED**

---

## 5. Current Strengths

1. **Proportionele architectuur.** Shared hosting past bij het huidige verkeers-, team- en productstadium; er is geen technisch bewijs dat capaciteit nu de beperkende factor is. **RECOMMENDATION op basis van gedocumenteerde omvang**
2. **Sterke publieke buildgrens.** De buildcontrole weigert interne Atlas-routes, documentatie, lokale data en andere interne artefacten in de publieke build. **VERIFIED**
3. **Versioned releases.** Nieuwe releases vervangen de vorige directory niet en houden een directe applicatierollback beschikbaar. **DOCUMENTED BUT NOT VERIFIED**
4. **Release-identiteit.** Assets, releasearchieven en belangrijke serverbestanden worden gehasht en voor/na publicatie vergeleken. **DOCUMENTED BUT NOT VERIFIED**
5. **Dataherstel bewezen.** De Experience-back-up is in een geïsoleerde tijdelijke MySQL-runtime succesvol geïmporteerd en relationeel gevalideerd. **DOCUMENTED BUT NOT VERIFIED**
6. **Menselijke recovery passend ingericht.** Eén bevoegde beheerder, onafhankelijk herstel, 2FA en providerrecovery zijn vastgelegd zonder fictieve tweede beheerder of gedeeld noodwachtwoord. **DOCUMENTED BUT NOT VERIFIED**
7. **Secretgrens.** De productieconfig hoort buiten de DocumentRoot en geheime bestandspatronen zijn genegeerd. **Repositorypatroon VERIFIED**
8. **Veilige Experience-defaults.** Noindex, no-store, HSTS/CSP en sessiegebonden beveiliging zijn aantoonbaar onderdeel van het ontwerp en eerdere productievalidaties. **Repositorypatroon VERIFIED; productieheaders DOCUMENTED BUT NOT VERIFIED**
9. **Voorzichtige deploycultuur.** Preflight, expliciete GO, afzonderlijke rollback en post-releasecontrole zijn aantoonbaar de normale werkvorm. **DOCUMENTED BUT NOT VERIFIED**

---

## 6. Current Risks / Gaps

| Risico / gat | Beoordeling | Prioriteit |
|---|---|---:|
| Geen onafhankelijke continue uptime-, TLS-, DNS- en releasebewaking | Een incident kan pas via handmatige review zichtbaar worden; eerdere healthchecks konden meetfout en applicatiefout niet altijd onderscheiden | hoog |
| Handmatige deployment en zeer vuile werkboom | Vergroot kans op verkeerde bron, vergeten bewijs of lokale drift, ook al zijn de releasechecks inhoudelijk sterk | hoog |
| Geen formeel off-provider backupbeleid | Provider- en accountblast-radius blijven deels gekoppeld; RPO/RTO zijn niet als bedrijfsbesluit vastgelegd | hoog |
| TransIP DocumentRoot control-plane kan vertraagd convergeren | Het paneel kan een nieuwe root tonen terwijl de backend nog de vorige release serveert | hoog |
| DNS-wildcard | Onbedoelde hostnamen kunnen naar hosting wijzen en vergroten attack surface/certificaatverwarring | middel |
| `www` duplicate 200 | Canonicalisatie en meetbaarheid zijn minder eenduidig | middel |
| DMARC `p=none`, geen rapportageadres gedocumenteerd | Mailspoofingbeleid blijft observerend; aanscherping vereist eerst rapportage en menselijke controle | middel |
| Geen CAA | Certificate authority-beleid is niet expliciet beperkt | laag/middel |
| Preview is geen volwaardige staging | Geen geïsoleerde database of productiegelijke Experience-testomgeving; bovendien zijn alle drie siteslots bezet | middel |
| Interne Workspace heeft geen productiegrens | Niet geschikt voor brede of klantgebonden productie-exposure zonder authenticatie, autorisatie en hostingbesluit | hoog zodra extern gebruik begint |
| Experience-schema heeft geen formele `tenant_id`-isolatie | Acceptabel voor huidige enkelvoudige toepassing, ongeschikt als bewijs van multi-tenant isolatie | hoog zodra tweede organisatie klantdata krijgt |
| Gedeeld hostingaccount | Website en Experience hebben een gezamenlijke beheer-/providerblast-radius | middel; nu aanvaardbaar |
| Historische Git-secretanalyse bleef deels tijdsbegrensd | Geen actuele blocker volgens 002B, maar toekomstige repositoryhygiëne moet getrackte historie beheerst houden | laag |
| E-mailbackupmogelijkheden niet volledig onafhankelijk gevalideerd | Herstel van mailboxinhoud is minder hard bewezen dan web/databaseherstel | middel |
| Fara contractuele governance niet volledig gesloten | Geen technische WBD-productieblocker, wel apart eigenaarschapsvraagstuk | buiten 002C-implementatie tenzij opnieuw gescopeerd |

---

## 7. Target Architecture — Current WBD Phase

Het doel voor de huidige fase is geen platformmigratie, maar een beheersbare productiecel rondom de bestaande TransIP-opzet.

### 7.1 Doelbeeld

- **Publieke website:** statische, reproduceerbare build op de WBD-apex; `www` permanent naar één canonieke host. **RECOMMENDATION**
- **Experience:** afzonderlijke subsite en DocumentRoot, dynamische/API-routes nooit publiek gecachet, private config buiten DocumentRoot, eigen databasecredential met minimale rechten. **RECOMMENDATION**
- **Preview:** uitsluitend niet-gevoelige releasekandidaat voor publieke assets; noindex; geen productiegegevens en geen permanente interne Workspace. **RECOMMENDATION**
- **WBD Workspace en Atlas:** lokaal/intern houden totdat een apart project de productiegrens, toegang en data-autorisatie vastlegt. Niet stilzwijgend via de publieke website aanbieden. **RECOMMENDATION**
- **Releases:** één vastgelegde broncommit, schone buildcontext, onveranderlijk artefact plus manifest, versioned root, expliciete activatie, onafhankelijke content-hashprobes en directe rollback. **RECOMMENDATION**
- **Data:** dezelfde Experience-database kan blijven voor de huidige enkelvoudige toepassing; migraties moeten versioned, vooruit/achteruit beoordeeld en voorafgegaan door een herstelpunt zijn. **RECOMMENDATION**
- **Recovery:** providerback-up plus periodieke versleutelde off-provider kopie, backupregister, kwartaalrestoretest en menselijk recoverybewijs. **RECOMMENDATION**
- **Monitoring:** externe probes voor beschikbaarheid, TLS, DNS, canonicalisatie, release-identiteit en een niet-mutatief Experience-healthsignaal. **RECOMMENDATION**
- **Cloudflare:** optionele latere randlaag na DNS-opruiming en monitoring; geen voorwaarde voor het huidige doelbeeld. **RECOMMENDATION**

### 7.2 Bewuste niet-keuzes

- geen VPS alleen om “professioneler” te lijken;
- geen Kubernetes, containers of service mesh;
- geen permanente CI/CD-deploycredential voordat key lifecycle en approvals zijn ontworpen;
- geen tweede beheerder zolang er feitelijk één bevoegde persoon is;
- geen multi-tenant abstractie zolang er geen tweede echte datadragende organisatie is;
- geen productie-stagingdatabase op hetzelfde hostingaccount zonder duidelijke noodzaak en capaciteit.

---

## 8. Future Scale Architecture

Het toekomstige schaalbeeld wordt pas geactiveerd door concrete triggers, niet door abstracte groeiambitie.

### 8.1 Triggers

- een tweede betalende of datadragende klantorganisatie;
- behoefte aan aantoonbare tenantisolatie, dataresidentie of contractuele retentie;
- achtergrondtaken, queues, websockets of langdurige processen;
- frequente databaseschemamigraties of zero-downtimevereisten;
- meerdere bevoegde beheerders met auditbare rollen;
- beschikbaarheidsdoelen die shared hosting en handmatige activatie niet betrouwbaar ondersteunen;
- aantoonbare limietproblemen rond siteslots, database, geheugen, CPU, logs of deployfrequentie.

### 8.2 Richting na zo'n trigger

- afzonderlijke `dev`, `test/staging` en `production` accounts/projecten of minimaal credentials en datastores;
- managed applicatieruntime of passende VPS/PaaS, gekozen op beheerlast en aantoonbare eisen;
- managed relationele database met point-in-time recovery indien RPO dit vereist;
- object storage voor observatiebestanden en exports, gekoppeld aan tenant en bron;
- per-request server-side tenantautorisatie met immutable `tenant_id`;
- centrale auditlog, application error tracking en externe metrics;
- herhaalbare provisioning en offboarding;
- klant- of risicogebonden dedicated database/schema/storage waar nodig;
- scheiding tussen publieke edge, Experience, interne Workspace en beheervlak.

Dit is **FUTURE SCALE** en geen goedkeuring om deze componenten nu te bouwen.

---

## 9. Environment Model

| Omgeving | Doel | Data | Toegang | Huidige status | Doelstatus |
|---|---|---|---|---|---|
| Local development | bouwen en tests | fixtures/synthetisch | lokale beheerder | VERIFIED aanwezig | behouden |
| Isolated test runtime | DB-migratie/restore en technische acceptatie | kopie zonder productie-write | lokaal, tijdelijk | restorepad bewezen | herhaalbaar runbook behouden |
| Preview | publieke websitekandidaat en visuele review | geen productiepersoonsdata | publiek maar noindex | DOCUMENTED aanwezig | beperken tot releasecandidate |
| Experience test | lokale functionele Experience-validatie | synthetisch | lokaal | VERIFIED via scripts/configs | behouden; geen gedeelde prod-DB |
| Production public | openbare website | statisch/publiek | publiek | DOCUMENTED aanwezig | canoniek en gemonitord |
| Production Experience | menselijke Experience + API | persoonsgegevens/sessies | publiek ingang, sessie- en beheergrenzen | DOCUMENTED aanwezig | afzonderlijk gemonitord, niet cachen |
| Internal Workspace | dagelijkse WBD/Atlas-werkplek | intern | intern | geen zelfstandige prod-host aangetoond | lokaal houden tot eigen besluit |

Een volwaardige online stagingomgeving is nu **niet noodzakelijk**. De combinatie van lokale geïsoleerde tests, preview voor statische kandidaatassets en gecontroleerde productiepromotie is proportioneel. Zodra databasewijzigingen frequenter worden of meerdere beheerders/releases ontstaan, wordt een gescheiden stagingdatabase en -host opnieuw beoordeeld.

---

## 10. Domain / DNS Model

### Current state

- TransIP is registrar en authoritative DNS voor WBD; DNSSEC is gedocumenteerd actief. **DOCUMENTED BUT NOT VERIFIED**
- Apex, wildcard, `www`, `preview` en `experience` wijzen naar shared hosting. **DOCUMENTED BUT NOT VERIFIED**
- Mail gebruikt MX, SPF en DKIM; DMARC staat op `p=none`. **DOCUMENTED BUT NOT VERIFIED**
- Er is geen CAA-record gedocumenteerd. **DOCUMENTED BUT NOT VERIFIED**

### Target current phase

1. Exporteer en hash vóór iedere DNS-wijziging de volledige zone. **RECOMMENDATION**
2. Leg per record eigenaar, functie, proxygeschiktheid en verwijdercriterium vast. **RECOMMENDATION**
3. Vervang de wildcard door alleen expliciet benodigde hostnamen, nadat verkeer en afhankelijkheden zijn gecontroleerd. **RECOMMENDATION**
4. Kies de apex als enige publieke canonical en maak `www` een permanente redirect. **RECOMMENDATION**
5. Voeg CAA alleen toe nadat Let's Encrypt/TransIP-uitgiftepad expliciet is gevalideerd. **RECOMMENDATION**
6. Voer DMARC stapsgewijs op basis van rapportage op; nooit direct van `p=none` naar reject zonder analyse van legitieme verzenders. **RECOMMENDATION**
7. Houd mailrecords altijd DNS-only wanneer later een proxy wordt gebruikt. **RECOMMENDATION**

### Future scale

- afzonderlijke hostnamen voor publieke website, Experience, Workspace, beheer en API;
- infrastructure-as-code of minimaal een versioned DNS-register met review;
- tenantdomeinen pas na een formeel onboarding- en certificaatmodel.

---

## 11. Hosting / Runtime Model

### Current state

TransIP Webhosting Pro bedient de WBD-hoofdsite, preview en Experience. De Experience draait als statische frontend plus PHP 8.2/API en relationele database. Fara staat op een afzonderlijk Core-pakket. Er is geen VPS of separate runtime. **DOCUMENTED BUT NOT VERIFIED**

### Beoordeling

De hosting is geschikt voor de huidige WBD-fase zolang:

- de Experience geen langdurige achtergrondprocessen nodig heeft;
- verkeer en datavolume binnen pakketgrenzen blijven;
- handmatige releases incidenteel en gecontroleerd blijven;
- het ontbreken van root/vhostcontrole acceptabel is;
- monitoring buiten de hostingprovider staat.

### Target current phase

- shared hosting behouden;
- PHP-versie, databaseversie, siteslots, quota en logtoegang per kwartaal registreren;
- static public en dynamic Experience als afzonderlijke releasefamilies behandelen;
- geen Workspace op dezelfde publieke releasegrens toevoegen;
- Patchman of gelijkwaardige functie alleen na compatibiliteitsanalyse activeren, niet als blinde baseline.

### Exitcriteria shared hosting

Een verhuizing wordt pas gepland wanneer een schaaltrigger uit sectie 8 optreedt of wanneer providerbeperkingen aantoonbaar herstel, beveiliging of releasebetrouwbaarheid blokkeren.

---

## 12. Database Model

### Current state

- één centrale Experience-database met 11 tabellen en relationele foreign keys; **DOCUMENTED BUT NOT VERIFIED**;
- migraties worden als versioned SQL uitgevoerd met voorafgaande transactionele dump; **DOCUMENTED BUT NOT VERIFIED**;
- configuratie en databasecredential horen buiten de DocumentRoot; **repositorypatroon VERIFIED**;
- sessie-/invite-scope bestaat, maar geen formeel immutable `tenant_id`-model; **VERIFIED in schema/API-structuur**.

### Target current phase

- huidige database behouden;
- schema- en migratieversie expliciet opnemen in ieder releasemanifest;
- vóór iedere migratie: consistente dump, hash, completion marker en tabelnulmeting;
- na iedere migratie: tabel-/FK-/row-sanity, applicatiehealth en rollbackbesluit;
- databasecredential beperken tot wat de Experience werkelijk nodig heeft;
- geen productiegegevens naar preview of gewone lokale development kopiëren;
- verwijdering en retentie van deelnemersdata blijven applicatief en menselijk controleerbaar.

### Multi-organisation-grens

De huidige database is **NO-GO als generieke multi-tenant garantie**. Een organisatienaam of invitation-scope is niet gelijk aan tenantisolatie. Vóór een tweede datadragende klant zijn een formeel tenantmodel, autorisatiereview, migratieplan, export-/deletegrens en tenant-aware backup nodig.

---

## 13. Backup & Recovery Model

### Current state

- TransIP documenteert automatische webhostingback-ups tot 30 dagen voor het actuele aanbod. **VERIFIED als providerclaim**
- 002A legde voor WBD Pro 30 dagen en Fara Core 14 dagen vast. **DOCUMENTED BUT NOT VERIFIED**
- pre-release database- en DocumentRoot-archieven worden gehasht en met beperkte rechten opgeslagen. **DOCUMENTED BUT NOT VERIFIED**
- een concrete Experience-back-up is geïsoleerd succesvol teruggezet en gecontroleerd. **DOCUMENTED BUT NOT VERIFIED**
- menselijke recovery is GO voor de huidige eenpersoonsorganisatie. **DOCUMENTED BUT NOT VERIFIED**

### Gaten

- geen formeel bedrijfsbesluit over RPO en RTO;
- geen centraal backupregister met eigenaar, locatie, retentie en laatste restorebewijs;
- geen bewezen periodieke versleutelde off-provider kopie;
- e-mailherstel is minder hard gevalideerd;
- een volledige hostingpakketrestore heeft een grotere blast-radius dan gerichte file/DB-restore.

### Target current phase

- stel per systeem RPO/RTO vast;
- houd providerback-up, versioned release en gerichte databaseback-up als drie verschillende herstelmiddelen;
- voeg een versleutelde off-provider kopie toe onder menselijke controle, zonder geheimen in de repository;
- voer minimaal per kwartaal en na materiële datamodelwijziging een geïsoleerde restoretest uit;
- test gerichte restore vóór pakketrestore;
- registreer hash, datum, omvang, bron, retentie, teststatus en verwijderdatum; nooit geheime inhoud;
- houd de bestaande eenpersoons-recoveryprocedure leidend en herbeoordeel pas bij een echte tweede bevoegde beheerder.

---

## 14. Access & Secret Management Model

### Current state

- één bevoegde TransIP-accountbeheerder; aanvullende control-panel users zijn niet gedocumenteerd als beschikbare functie. **DOCUMENTED BUT NOT VERIFIED**
- 2FA, onafhankelijk recoverypad en recoverycodes zijn menselijk gevalideerd. **DOCUMENTED BUT NOT VERIFIED**
- TransIP API staat uit en er zijn geen actieve API-tokens/keypairs gedocumenteerd. **DOCUMENTED BUT NOT VERIFIED**
- tijdelijke deploykeys zijn ingetrokken en lokaal verwijderd. **DOCUMENTED BUT NOT VERIFIED**
- de repository negeert secretpatronen en bekende legacy notities. **VERIFIED**
- productieconfiguratie is ontworpen voor opslag buiten de DocumentRoot. **VERIFIED als codepatroon**

### Target current phase

- Bitwarden blijft een uitsluitend menselijke secretgrens; Codex leest of beheert geen waarden;
- gebruik per deployment een tijdelijk, taakgebonden sleutelpad met expliciete intrekking en lokale cleanup;
- leg alleen secretmetadata vast: eigenaar, doel, systeem, rotatiedatum, status en verificatiemoment;
- vermijd permanente gedeelde deploycredentials;
- documenteer welke acties alleen de accountbeheerder kan uitvoeren;
- voer periodiek read-only controle uit op actieve keys/tokens zonder waarden te rapporteren;
- maak geen fictieve tweede beheerder of gedeeld noodwachtwoord;
- herbeoordeel rollen, vier-ogenprincipe en break-glass zodra een tweede bevoegde beheerder feitelijk bestaat.

---

## 15. Cloudflare Assessment

### 15.1 Wat Cloudflare Free nu kan bijdragen

Volgens de actuele officiële documentatie biedt de Free-laag onder meer:

- authoritative DNS via een full zone setup;
- reverse proxy/CDN voor daarvoor geschikte HTTP(S)-records;
- DDoS- en edgebeveiliging als onderdeel van het Cloudflare-netwerk;
- Cloudflare Free Managed Ruleset;
- één eenvoudige rate-limitregel op Free;
- maximaal tien cache rules op Free;
- Security Events met beperkte/sampled zichtbaarheid.

Dit is genoeg voor een **kleine WBD-edgebaseline**, maar niet voor uitgebreid application security management, volledige logretentie, geavanceerde botcontrole of accountbrede enterprise policies.

### 15.2 Geschiktheid per WBD-onderdeel

| Onderdeel | Advies | Reden |
|---|---|---|
| Publieke statische website | geschikt na preflight | CDN, DDoS, WAF en statische caching passen goed |
| `www` redirect | geschikt | kan canonieke routering ondersteunen, mits DNS correct is |
| Experience HTML/API | alleen gecontroleerd | sessies, cookies, POST en API moeten cache-bypass houden; WAF/challenges mogen de menselijke flow niet breken |
| Observatory/beheer | later mogelijk achter Access | vereist identiteit-, recovery- en lockouttest; geen vervanging voor app-auth |
| Mailrecords | niet proxyen | MX/TXT/DKIM/DMARC en mailhostrecords DNS-only houden |
| Preview | mogelijk, maar niet noodzakelijk | eerst doel en toegang vastleggen; geen productiedata |
| Fara | buiten eerste migratie | eigen governance en WordPress-risico; apart besluit nodig |

### 15.3 Risico's en noodzakelijke volgorde

- Free/Pro gebruiken voor de gebruikelijke route een full setup met Cloudflare-nameservers. **VERIFIED als providerclaim**
- De huidige DNSSEC-status vereist een expliciete, providerconforme migratievolgorde. Cloudflare waarschuwt dat nameservers wijzigen terwijl oude DNSSEC actief is het domein onbereikbaar kan maken. **VERIFIED als providerclaim**
- Automatische recordscan is niet volledig; alle web- en mailrecords moeten handmatig met de TransIP-export worden vergeleken. **VERIFIED als providerclaim**
- TransIP Let's Encrypt blijft afhankelijk van correcte A/AAAA-records, DNS en DNSSEC. Bij externe nameservers moet validatie vooraf worden getest. **VERIFIED als providerclaim**
- Algemene HTML-caching of challengebeleid kan login-, sessie-, formulier- en API-flows verstoren. **VERIFIED als providerclaim**
- Cloudflare verbergt de origin alleen effectief als rechtstreeks originverkeer ook wordt begrensd; shared hosting kan die beperking mogelijk niet volledig bieden. **UNKNOWN**

### 15.4 Besluit

Cloudflare Free is **GO als later, afzonderlijk preflightproject** en **NO-GO als onmiddellijke algemene cutover**. Eerst moeten DNS-opruiming, externe monitoring, rollbackbewijs en een exacte proxy/cachematrix bestaan. De eerste eventuele migratie beperkt zich tot `webuildanddesign.nl`; Fara en klantdomeinen blijven buiten scope.

---

## 16. Deployment Model

### Current state

De bestaande methode is: canonieke bron vastleggen, lokaal testen/bouwen, artefact en hashes vastleggen, uploaden naar een nieuwe versioned directory, candidate valideren, DocumentRoot wisselen, live release-identiteit controleren en zo nodig alleen de DocumentRoot terugzetten. **DOCUMENTED BUT NOT VERIFIED**

De repository bevat scripts voor buildgrenzen en release-evidence, maar geen CI/CD-workflow. **VERIFIED**

### Kritiek operationeel inzicht

Een TransIP-paneel kan een gewijzigde DocumentRoot tonen terwijl de effectieve backend nog de vorige bytes serveert. Daardoor is “paneel opgeslagen” geen activatiebewijs. Alleen publiek gemeten release-identiteit vanaf meer dan één betrouwbare meetroute bewijst activatie. **DOCUMENTED BUT NOT VERIFIED**

### Target current phase

1. werk vanuit een vastgelegde commit en een schone, geïsoleerde buildcontext;
2. produceer één onveranderlijk artefact en machineleesbaar manifest;
3. valideer bestandenaantal, hashes, routegrenzen en public-only grens;
4. archiveer de vorige actieve root en maak vóór DB-migratie een gerichte dump;
5. upload naar een nieuwe versioned directory;
6. voer server-side preflight uit vóór activatie;
7. vraag expliciete menselijke GO voor de DocumentRoot-wissel;
8. meet na activatie HTTP-status én verwachte contenthash/assetnaam via minimaal twee onafhankelijke netwerkpaden;
9. behandel control-planevertraging als aparte toestand, niet onmiddellijk als applicatiefout;
10. rollback bij foutieve bytes, foutstatus, integriteitsfout of overschreden activatievenster;
11. trek tijdelijke keys in en leg releasebewijs vast.

CI kan later build/test/manifest automatiseren. Productieactivatie blijft in de huidige fase een expliciete menselijke gate.

---

## 17. Monitoring Baseline

### Minimale externe controles

| Controle | Frequentie | Signaal |
|---|---:|---|
| apex en canonieke redirect | 1–5 min | status, redirectdoel, latency |
| Experience `/ervaar` | 1–5 min | status, noindex/no-store, herkenbaar releasekenmerk |
| niet-mutatieve API-health | 5 min | bereik PHP/database zonder sessie of data-write |
| TLS-certificaat | dagelijks | hostname, issuer, vervaldatum, keten |
| DNS-records en nameservers | dagelijks | drift t.o.v. goedgekeurde zone-export |
| release-identiteit | na deploy + periodiek | verwachte index-/asset-hash |
| securityheaders | dagelijks | HSTS, CSP/no-store waar van toepassing |
| backupbewijs | dagelijks/wekelijk | laatste succesvolle provider-/gerichte back-up |
| restorebewijs | kwartaal | laatste geslaagde geïsoleerde restore |
| mailauth | dagelijks/wekelijk | SPF, DKIM, DMARC en rapportage |
| opslag/quota | wekelijks | files, database, mailbox en siteslots |
| applicatiefouten | continu of dagelijks | server-/PHP-fouten zonder geheime payloads |

### Eisen

- monitoring staat buiten TransIP;
- alerts gaan naar een kanaal dat ook bij primaire-mailuitval bereikbaar blijft;
- probes mogen geen sessies, uitnodigingen of productiegegevens creëren;
- log nooit tokens, cookies, antwoorden of geheime waarden;
- releasevalidatie gebruikt een controlehost om meetfout en sitefout te onderscheiden.

De monitorprovider en meldkanalen zijn **OPEN QUESTIONS** en vereisen menselijke keuze.

---

## 18. Rollback Model

### Applicatie zonder DB-migratie

- zet de DocumentRoot terug naar de vorige bekende goede versioned directory;
- verifieer extern de oude releasehash en kritieke routes;
- laat de mislukte candidate intact voor onderzoek;
- verwijder niets tijdens incidentrespons.

### Applicatie met compatibele DB-migratie

- rollback alleen de applicatie als de vorige versie het nieuwe schema veilig kan negeren;
- verifieer vooraf dat dit expliciet in het migratieplan staat.

### Applicatie met incompatibele DB-migratie

- stop writes indien het platform dit beheerst ondersteunt;
- beoordeel data sinds de migratie;
- voer geen blinde volledige pakketrestore uit;
- gebruik gerichte down-migratie of gerichte databaseherstelprocedure met expliciete menselijke GO;
- valideer tabellen, foreign keys, rijtotalen en applicatiegedrag.

### DNS/Cloudflare

- bewaar een volledige voor-export en TTL/DNSSEC-status;
- definieer vooraf het terugkeerpad naar TransIP-nameservers of DNS-only;
- rollbackcriteria omvatten DNS-resolutie, mail, TLS, Experience-sessies en originbereik;
- DNSSEC is een afzonderlijke gate en mag nooit geïmproviseerd worden.

---

## 19. Multi-Organisation / Customer Isolation

### Huidige beoordeling

WBD werkt nu als een eenpersoonsorganisatie en de Experience ondersteunt context rond organisaties, uitnodigingen en sessies. Dat is geen formeel multi-tenant securitymodel. **VERIFIED in repositorystructuur**

### Verplicht vóór tweede datadragende klant

- immutable, server-side vastgestelde `tenant_id` op alle tenantdata;
- deny-by-default autorisatie per route, query en bestand;
- tenant-aware auditlog, export, verwijdering, retentie en backup;
- tests die cross-tenant reads en writes aantoonbaar blokkeren;
- tenant- en environmentgebonden secretmetadata;
- bestandsobjecten altijd gekoppeld aan observatie/praktijkbron én tenant;
- provisioning/offboarding met menselijke eigenaar;
- besluit per risicoklasse: gedeelde database met strikte row isolation, apart schema of aparte database;
- incident- en herstelprocedure die één tenant kan herstellen zonder andere tenants te overschrijven.

### Besluit

- huidige enkele WBD/Experience-context: **GO**;
- tweede organisatie als puur niet-gevoelige configuratie/demo: afzonderlijk beoordelen;
- tweede organisatie met echte klant- of deelnemersdata: **NO-GO vóór formele isolation foundation**.

---

## 20. Security / Trust Architecture

De technische architectuur moet dezelfde menselijke trustbelofte ondersteunen als het product.

### Kernprincipes

- minimale dataverzameling en duidelijke doelbinding;
- observaties blijven herleidbaar naar bron en menselijke beoordeling;
- geen automatische verheffing van observatie naar kennis;
- geheime waarden nooit in repository, rapportage, monitoring of deploymentlogs;
- productiedata niet naar preview of algemene development;
- veilige sessiecookies, same-origincontrole, inputlimieten en rate limiting blijven server-side;
- Observatory en Workspace zijn interne beheercontexten, geen alternatieve publieke Experience;
- `/ervaar` blijft de canonieke menselijke ingang; tokenroutes blijven compatibiliteit, geen infrastructuuridentiteit;
- toegang, data-isolatie, back-up en verwijdering moeten uitlegbaar zijn aan een ondernemer zonder verborgen tweede waarheid;
- Cloudflare of een andere edgepartij is een aanvullende verwerker/vertrouwenslaag en moet daarom bewust in privacy- en leveranciersbeheer worden opgenomen.

### Trustgrens per laag

| Laag | Verantwoordelijkheid |
|---|---|
| Browser | minimale sessiegegevens, geen geheimen in clientbundel |
| Edge/DNS | bereikbaarheid, TLS, basale filtering; geen inhoudelijke autorisatie |
| Origin/PHP | sessie, authenticatie, autorisatie, validatie en rate limiting |
| Database | integriteit, herleidbaarheid en minimale rechten |
| Beheerder | expliciete GO, recovery, secrets en menselijke beoordeling |
| Monitoring | alleen technische metadata, nooit inhoud of tokens |

---

## 21. Proposed Implementation Sequence

Geen van onderstaande projecten is met dit assessment gestart.

| Project | Titel en doel | Omvang | Risico | Productie-impact | Menselijke actie | Expliciete GO |
|---|---|---:|---:|---|---|---|
| **002C.2** | **Environment & Release Control Baseline** — environmentregister, schone buildgrens, releasemanifest, controlehost, control-plane wachttoestand en rollbackcriteria formaliseren | S | laag | geen tot zeer laag; uitsluitend tooling/documentatie tot activatietest apart wordt toegestaan | review van releasebeleid | ja vóór iedere live activatietest |
| **002C.3** | **External Monitoring Baseline** — provider kiezen en niet-mutatieve uptime/TLS/DNS/release/API-probes plus onafhankelijke alerts inrichten | S/M | laag/middel | externe probes op productie, geen writes | account/provider en meldkanaal kiezen | ja vóór extern account of alertconfiguratie |
| **002C.4** | **Backup Register & Off-provider Recovery Baseline** — RPO/RTO, backupregister, versleutelde off-provider kopie en restorecadans | M | middel | geen productie-write; wel kopie van beveiligde data onder menselijke controle | opslaglocatie, retentie en sleutelbeheer kiezen | ja vóór data-export/kopie |
| **002C.5** | **DNS, Canonical & Mail-auth Hygiene** — wildcard beoordelen, `www` canonicaliseren, CAA preflight en DMARC-rapportage gefaseerd voorbereiden | M | middel/hoog | ja, DNS en mail kunnen geraakt worden | volledige zonecheck en mailvalidatie | ja per DNS-wijziging |
| **002C.6** | **Access & Deployment Credential Operations** — tijdelijke-keyrunbook, secretmetadataregister, periodieke read-only key/tokencontrole en cleanupbewijs | S | middel | mogelijk externe accountactie, geen permanente nieuwe credential als doel | TransIP/Bitwardenhandelingen door beheerder | ja vóór key- of accountactie |
| **002C.7** | **Cloudflare Free Preflight** — exacte DNS-importvergelijking, DNSSEC-runbook, proxy/cachematrix, origin-TLS, Access-keuze en rollbackbewijs; nog geen cutover | M | middel | geen productie-impact zolang read-only | Cloudflare-accountkeuze en review | ja vóór accountconfiguratie; aparte GO voor cutover |
| **002C.8** | **Cloudflare WBD Edge Cutover** — alleen uitvoeren als 002C.7 GO is; eerst WBD, mail DNS-only, Experience dynamisch/no-cache, volledige productievalidatie | M/L | hoog | ja: DNS, TLS en verkeer | live handelingen en directe review | verplicht per fase |

### Volgorde en gates

1. **002C.2** — GO vereist op het operationele releasefundament.
2. **002C.3** — GO vereist zodat latere productieacties onafhankelijk meetbaar zijn.
3. **002C.4** — GO vereist voordat structurele data- of platformwijzigingen worden overwogen.
4. **002C.5** — per DNS-record een aparte preflight; mail en DNSSEC als harde gates.
5. **002C.6** — kan na 002C.2 parallel in planning, maar externe acties blijven menselijk.
6. **002C.7** — pas nadat monitoring en DNS-inventaris volwassen zijn.
7. **002C.8** — optioneel; alleen als de baten na preflight groter zijn dan de extra complexiteit.

### Toekomstige, nog niet te starten projecten

- **002C.9 — Internal Workspace Production Boundary**, trigger: WBD/Atlas moet buiten lokale beheercontext beschikbaar worden. Omvang M/L, hoog securityrisico, productie-impact ja, menselijke GO verplicht.
- **002C.10 — Multi-Organisation Isolation Foundation**, trigger: tweede datadragende klantorganisatie. Omvang L, hoog datarisico, productie-impact ja, menselijke en mogelijk juridische GO verplicht.

---

## 22. Explicitly Deferred Items

- VPS/PaaS/containerkeuze zonder concrete schaaltrigger;
- volwaardige online stagingomgeving zolang lokale isolatie en preview voldoende zijn;
- CI/CD-productieactivatie; eerst build/evidence automatiseren met menselijke gate;
- Cloudflare-cutover vóór 002C.7;
- Fara-migratie of Cloudflare-configuratie;
- Workspace/Atlas publiek of extern hosten;
- tenantmodel en klantprovisioning vóór tweede datadragende organisatie;
- object storage, queues, websockets en background workers;
- tweede beheerder of gedeeld break-glass geheim zolang WBD één bevoegde beheerder heeft;
- legacy `.txt`-bestanden; bewust buiten huidige blockerstatus en niet geopend;
- juridische verwerkingsovereenkomsten en contractreview door Codex;
- secrets, recoverygegevens of Bitwarden-inhoud;
- e-mailpakketmigratie of mailboxrestore zonder aparte scope.

---

## 23. Open Questions

Deze vragen blokkeren 002C.1 niet, maar moeten vóór het relevante vervolgproject door een mens worden beantwoord:

1. Welke zakelijke RPO en RTO gelden voor publieke website, Experience, database en e-mail?
2. Welke onafhankelijke monitoringprovider en welk recovery-onafhankelijk alertkanaal passen bij WBD?
3. Waar mag een versleutelde off-provider backup juridisch en operationeel worden bewaard?
4. Moet preview publiek bereikbaar blijven of later achter beperkte toegang komen?
5. Wanneer moet WBD Workspace/Atlas feitelijk buiten de lokale beheeromgeving beschikbaar zijn, en voor wie?
6. Welke TransIP-pakketlimieten en siteslots toont het account direct vóór een implementatie?
7. Kan rechtstreeks originverkeer bij een Cloudflare-inzet op shared hosting voldoende worden begrensd?
8. Welke Cloudflare-accountowner en recoveryroute worden gebruikt zonder nieuwe single point of failure?
9. Welke legitieme mailverzenders moeten in DMARC-rapportage worden gevalideerd vóór aanscherping?
10. Is Fara contractueel en technisch volledig onder WBD-beheer, of blijft dit een afzonderlijk governanceproject?
11. Welke data- en bewaartermijnen gelden per Experience-sessie en observatiebron?
12. Wat is de concrete trigger voor een tweede beheerder en vier-ogenautorisatie?

---

## 24. GO / NO-GO Recommendation for Implementation Planning

### 002C.1

**GO.** De huidige architectuur, bewijsgrenzen, risico's en proportionele doelrichting zijn voldoende scherp vastgelegd. Dit document is de canonieke basis voor vervolgplanning binnen Project 002C.

### Eerstvolgende stap

**GO om Project 002C.2 — Environment & Release Control Baseline afzonderlijk voor te bereiden.**

**NO-GO om 002C.2 of enig later project op basis van dit document direct uit te voeren.** Eerst volgt gezamenlijke review en een nieuwe preflight met expliciete scope, productie-impact en menselijke GO.

### Brede productie-implementatie

**NO-GO** voor:

- één gecombineerde infrastructuurmigratie;
- ongecontroleerde DNS- of Cloudflare-cutover;
- automatische productie-deployment zonder menselijke gate;
- externe Workspace-publicatie;
- multi-tenant klantdata op het huidige model;
- enige handeling met geheimen door Codex.

### Eindadvies

Behoud TransIP shared hosting als huidige basis. Versterk eerst releasebewijs, onafhankelijke monitoring, backupgovernance en DNS-hygiëne. Behandel Cloudflare als optionele, afzonderlijk omkeerbare edgeverbetering. Schaal pas naar een zwaarder platform wanneer een concrete bedrijfs- of technische trigger dit rechtvaardigt.

Project 002C.1 is hiermee documentair afgerond. Er wordt gestopt vóór Project 002C.2 en gewacht op gezamenlijke review en expliciete GO.
