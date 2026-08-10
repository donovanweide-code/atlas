# Project 002 — TransIP Production Readiness & Sportpaleis Pilot Deployment Preparation

**Datum:** 2026-08-10  
**Karakter:** read-only productieassessment en lokaal releaseonderzoek  
**Productiemutaties:** geen  
**Besluit:** **NO-GO voor deployment in de huidige toestand**

## Samenvatting

De bevroren Sportpaleis Bedrukking-pilot is functioneel lokaal pilot-ready, maar niet production-deployable op de huidige WBD/TransIP-grens.

De doorslaggevende feiten zijn:

1. `workspace.webuildanddesign.nl` is geen ingerichte Workspace-host. De naam resolveert via het algemene wildcardrecord naar dezelfde shared-hosting-IP's als WBD, preview en Experience. Normale TLS-validatie faalt; achter de host staat een TransIP-configuratieplaceholder en de Workspace- en healthroutes geven `404`.
2. De huidige lokale backend is een Node.js referentieruntime met een lokale JSON-file-store. De eigen deploymentdocumentatie zegt expliciet dat deze niet de goedgekeurde TransIP-productiedatabase vervangt.
3. Voor de bestaande TransIP PHP 8.2/MariaDB-grens bestaan een schema en review-only migraties, maar geen PHP-productie-API die het geteste servercontract uitvoert.
4. De lokale standaardinitialisatie bevat tien voorbeeld-/testorders en vier vooraf gedefinieerde gebruikers. Die state mag niet als productiedata worden ingezet.
5. De functionele release staat grotendeels in 372 gewijzigde/niet-getrackte worktree-items en is niet herleidbaar tot de huidige `HEAD`-commit. Er is daarom geen immutable productiebron.
6. Er is geen actuele Sportpaleis-productiedatabase, geen gerepeteerde schema-8-migratie/import, geen Sportpaleis-databasebackup en geen representatieve Sportpaleis-restoretest.

Een deployment zou nu óf een niet-goedgekeurde lokale file-store online zetten, óf een niet-bestaande PHP/MariaDB-implementatie veronderstellen. Beide zijn NO-GO.

## Bewijslabels

- **PROVEN** — eerder uitgevoerd en nog geldig binnen de bewezen scope.
- **VERIFIED TODAY** — op 2026-08-10 lokaal of publiek read-only gecontroleerd.
- **DOCUMENTED, NOT CURRENTLY VERIFIED** — canoniek vastgelegd, maar niet opnieuw live bevestigd.
- **DESIGN ONLY** — ontworpen, niet operationeel gemaakt.
- **BLOCKER** — moet vóór een pilotdeployment aantoonbaar worden gesloten.

---

## A. Reeds bewezen

| Onderwerp | Geldig bewijs | Grens van het bewijs |
|---|---|---|
| 002B restoretest | Geïsoleerde restore van één Experience SQL-backup: import PASS, 11/11 tabellen, `CHECK TABLE` PASS, 10 FK's, 0 weesrecords en cleanup bevestigd. | Bewijst niet dat een Sportpaleis-backup bestaat of herstelbaar is. |
| 002C.1 infrastructuur | TransIP Webhosting Pro was ingericht voor WBD public, preview en Experience; PHP/MySQL/SSH/SFTP en providerbackups waren gedocumenteerd. | Workspace had geen zelfstandige production boundary; 3/3 siteslots waren bezet. Actuele quota zijn vandaag niet opnieuw live bevestigd. |
| 002C.2 release control | Immutable release-ID, clean-commit-build, manifest/hash, Human GO, DB-impactclass, observatievenster en rollbackcontract zijn volledig ontworpen. | Niet operationeel toegepast op de huidige Sportpaleis-worktree. |
| 002C.3 monitoring | Health-, alert-, severity- en deduplicatiecontract zijn ontworpen. | Externe monitoring is niet geactiveerd; Workspace/Sportpaleis is niet gemonitord. |
| 002C.4 backup/recovery | Backupregister, RPO/RTO-model, restore-evidence en off-providercriteria zijn ontworpen. TransIP providerbackupclaims zijn vastgelegd. | Geen actuele onafhankelijke Sportpaleis-kopie en geen Sportpaleis-restorebewijs. |
| 002C.5 DNS/canonical/mail | TransIP DNS, DNSSEC, wildcard, WBD dual stack en bestaande mailauth zijn onderzocht. Cloudflare-cutover is bewust NO-GO/deferred. | Geen Workspace-hostrecord/site/TLS-grens is ingericht. |
| 002C.6 access/governance | Human authority → task GO → minimale toegang → evidence → intrekking is canoniek vastgelegd. | Operationele access inventory blijft `DOCUMENTED BUT NOT VERIFIED`; geen permanente deploykey of CI/CD-grens bewezen. |
| Sportpaleis freeze | `SPW-BEDRUKKING-PILOT-READINESS-007-20260810`: 46 bronbevestigde live artikelen, normale order, Teamorder, multi-vereniging, Artikelbeheer en kritieke DATA_GAP-policy. | Functionele lokale pilot-readiness is geen productie-infrastructuurgoedkeuring. |

### Project 002-reconciliation

- **Reeds bewezen:** één specifieke Experience-restore; release-/governancecontracten; lokale Sportpaleis-functionaliteit en regressies.
- **Ontwerp gereed, niet operationeel:** Workspace monitoring, off-provider recovery, immutable releaseproces, accessregister, productieproviderketen.
- **Nog open risico:** shared-hosting blast radius, actuele providerquota, account-/recoverydetails, productiedata-import en live observability.
- **Werkelijke pilotblockers:** production runtime/API, host/TLS, clean source commit, database/migratie/import, production bootstrap/accounts, Sportpaleis backup/restore en production smoke evidence.
- **Veilig uitstelbaar:** Cloudflare, uitgebreid monitoringplatform en volledige off-provider automatisering, maar alleen nadat een minimale werkende health/log/backup/restorebasis bestaat en het restrisico expliciet wordt geaccepteerd.

---

## B. Actueel geverifieerd op 2026-08-10

### B1. Publieke productiegrens

| Controle | Uitkomst | Status |
|---|---|---|
| `webuildanddesign.nl` | IPv4 `85.10.159.158`, IPv6 `2a01:7c8:f0:10e2::8c42:d0a3`, HTTPS `200` | VERIFIED TODAY |
| `preview.webuildanddesign.nl` | Zelfde A/AAAA, HTTPS `200` | VERIFIED TODAY |
| `experience.webuildanddesign.nl` | Zelfde A/AAAA, HTTPS `200` | VERIFIED TODAY |
| `workspace.webuildanddesign.nl` | Zelfde A/AAAA; een willekeurige niet-bestaande host resolveert eveneens naar deze IP's | VERIFIED TODAY — wildcard, geen bewijs van een expliciet record |
| Workspace TLS | Normale TLS-validatie faalt (`curl` exit 60 / onbetrouwbare certificaatketen) | FAIL |
| Workspace root zonder TLS-validatie | `200`, 52 bytes: `Please stand by while configuration is in progress.` | FAIL — providerplaceholder |
| `/workspace/sportpaleis/overzicht` | `404` | FAIL |
| `/health` en `/ready` | beide `404` | FAIL |

**Bedoelde host en route na afzonderlijke DNS/hosting-GO:**  
`https://workspace.webuildanddesign.nl/workspace/sportpaleis/overzicht`

Deze keuze volgt de bestaande WS.1/002C-architectuur. De wildcard mag niet als productieconfiguratie worden behandeld.

### B2. TransIP control panel

De reeds geopende control-panelpagina toonde PHP 8.2, `display_errors` uit, `log_errors` aan, OPcache aan, file uploads aan en timezone `Europe/Amsterdam`. Tijdens de read-only inspectie meldde het panel echter **“Sessie verlopen”**. Daardoor zijn deze waarden alleen zichtbaar uit de reeds geladen pagina en niet als verse accountmeting geclassificeerd.

Niet actueel live verifieerbaar zonder nieuwe menselijke login:

- pakket- en siteslotquota;
- actuele gebruikte/beschikbare opslag;
- actuele databases, quota, users en privileges;
- actuele providerbackupstatus en herstelpunten;
- DocumentRoot/subsite-directory en schrijfpermissions;
- SSH/SFTP-houders en packagebrede rechten;
- huidige loglocaties/retentie;
- cronmogelijkheden en eventueel toegestane achtergrondprocessen;
- environment/secrets-opslag buiten DocumentRoot;
- SSL/SAN-configuratie voor de toekomstige Workspace-host.

Er is niet opnieuw ingelogd en er zijn geen credentials gelezen of ingevoerd.

### B3. Lokale releasevalidatie

| Onderdeel | Resultaat |
|---|---|
| Functionele freeze | `SPW-BEDRUKKING-PILOT-READINESS-007-20260810`, schema 8 |
| Volledige tests | **457/457 PASS** op 2026-08-10 |
| Workspace-build | **PASS**; 8 bestanden, 6 tekstbestanden geverifieerd |
| Node/npm lokaal | Node `v24.18.0`, npm `11.16.0`; package-eis Node `>=22.12.0` |
| Buildmanifest SHA-256 | `170AA5085A364E7839290EB108EB34E56238AC87A6EB5A624300DA40CB88FD93` |
| Bundelwaarschuwing | Eén JS-chunk circa 3,40 MB; performance-aandacht, geen functionele blocker voor een beperkte pilot |
| Branch | `codex/wbd-experience-release-20260801` |
| Git `HEAD` | `1ec989896834101e986adaa5a944610457b1fdee` |
| Worktree | 372 gewijzigde/niet-getrackte entries; de Sportpaleis-release zit niet aantoonbaar in `HEAD` |

Unieke, voorlopig gereserveerde kandidaat-ID:

`SPW-PILOT-PROD-RC-20260810T125420Z-UNCOMMITTED`

De suffix `UNCOMMITTED` is bewust: dit is een traceerbare assessment-ID, **geen deploybare release-ID**. Na een schone commit moet volgens 002C.2 een nieuwe definitieve ID worden gegenereerd met de echte commitreferentie.

### B4. Runtime- en databasefit

- `dist-workspace` bevat alleen de frontendassets.
- `scripts/workspace-runtime.mjs` is een Node-runtime met een lokale JSON-file-store.
- De bestaande TransIP shared-hostinggrens is PHP 8.2/MariaDB/MySQL; persistent Node-process is niet bewezen en in 002C-WSP.1 niet aanbevolen.
- `website/sportpaleis-server/README.md` vereist voor deze route expliciet een productie-implementatie van hetzelfde API-contract op PHP/MariaDB.
- `schema.mysql.sql` en vijf review-only migratiebestanden bestaan, maar er is geen PHP-API, geen migratierunner, geen databaseconnection-adapter en geen gerepeteerde schema-8-keten.
- De laatste SQL-migratie voegt `catalog_metadata_json` toe voor live catalogus 006. De schema-8/deduplicatiepolicy uit readiness 007 bestaat alleen in de file-storemigratie en heeft geen aangetoonde MariaDB-equivalent.
- Er is geen productieimport/seed voor de 46 artikelen, verenigingen en productieprofielen.

### B5. Security-eigenschappen van de lokale referentie

Lokaal bewezen:

- scrypt-wachtwoordhashes met salt;
- maximaal zes loginpogingen per venster;
- opaque sessietoken, `HttpOnly`, `SameSite=Strict` en in production `Secure`;
- same-origincontrole en CSRF op mutaties;
- server-side rollen en `403` voor onbevoegde adminacties;
- idempotency en revision/conflictcontrole;
- veilige generieke 5xx-meldingen;
- `no-store`, CSP voor API-responses, `X-Content-Type-Options`, `DENY` framing en noindex;
- maximaal drie feedbackafbeeldingen, maximaal 5 MB per bestand, toegestane declared MIME-types;
- mail capture-only in deze flow en `hardwareSendEnabled: false`;
- geen Summa/WinPlot/Direct Print-hardware-writepad in de pilotservice.

Nog niet production-proof:

- deze regels draaien nog niet op een productie-endpoint;
- geen eerste-adminbootstrap zonder de demo-/seedinitialisatie;
- geen wachtwoordreset/account-recoveryflow;
- geen actuele dedicated databasecredential/least-privilegebewijs;
- geen aparte tenant-/hostingboundary ten opzichte van WBD public/preview/Experience;
- feedbackbestanden worden als base64 in de datastore bewaard; alleen het opgegeven MIME-type wordt gecontroleerd, niet aantoonbaar de bestandsmagic;
- geen productie-logretentie/PII-review tegen de werkelijke server;
- geen live TLS-, cookie-, role-, brute-force-, upload- of directory-exposuretest.

### Cloudflare

Cloudflare is **niet nodig vóór deze pilot** en mag niet ad hoc worden geactiveerd. DNSSEC, nameserver- en mailrisico's blijven onder de bestaande 002C.5/Cloudflare-preflight vallen. De huidige blocker is de ontbrekende Workspace-productiegrens, niet het ontbreken van Cloudflare.

---

## C. Open punten en classificatie

### BLOCKER

| # | Punt | Kleinste sluitingsactie |
|---:|---|---|
| 1 | Geen gekozen/werkende production runtime voor de geteste API | Kies met Human GO óf de eerder aanbevolen managed Node/PostgreSQL-route, óf bouw en bewijs eerst de vereiste PHP/MariaDB-adapter op TransIP. Niet beide impliciet mengen. |
| 2 | Geen expliciete Workspace-host, geldige TLS of geïsoleerde site-root | Bevestig een beschikbaar siteobject/pakket, aparte DocumentRoot en certificaat voor `workspace.webuildanddesign.nl`; wildcard is onvoldoende. |
| 3 | Shared-hosting blast radius en eerder gedocumenteerde 3/3 siteslots | Bevestig actueel quota/slot en een deploymentgrens die WBD public/preview/Experience niet overschrijft; anders nieuw geïsoleerd product/service nodig. |
| 4 | Geen immutable source commit | Breng uitsluitend de bevroren scope in een schone branch/commit, bouw vanuit een clean clone en leg commit plus artefacthash vast. |
| 5 | Geen production database/schema-8-keten | Maak dedicated Workspace-DB/user, consolideer en repeteer schema+migraties inclusief readiness 007, met tenant/org-constraints en pre/postchecks. |
| 6 | Geen veilige production data bootstrap | Genereer een idempotent config/catalog-import die alleen de 46 bevestigde artikelen, provenance, verenigingen, profielen en DATA_GAP-statussen bevat. |
| 7 | Demo-/testdata in standaardinitialisatie | Productie moet leeg starten voor orders, feedback, sessions en audit behalve een expliciete bootstrapaudit. Tien voorbeeldorders, `SNIJTEST-001`, `example.nl`, demo-users en gesimuleerd folieverbruik mogen niet mee. |
| 8 | Accounts en recovery niet productie-gereed | Bevestig echte identities/e-mails, lever een veilige eerste-adminbootstrap, eenmalige activatie voor Patrick/winkelmedewerker en een beheerste reset/recoveryroute zonder standaardwachtwoorden. |
| 9 | Geen Sportpaleis backup/restorebewijs | Verifieer providerbackup, maak een gerichte predeploy DB-backup en bewijs de uiteindelijke schema/import in een geïsoleerde restore vóór livegang. |
| 10 | Geen productie-health/logging/observability | Maak de werkelijke `/health/sportpaleis` en `/ready/sportpaleis` bereikbaar, laat DB/datastore/release zien zonder secrets, verifieer logs en leg minimaal een menselijke check-/escalatieroute vast. |
| 11 | Feedbackbijlagen niet tegen werkelijke productieopslag getest | Valideer content magic/decoding, autorisatie, opslaglimiet, back-up/restore en dezelfde-origin serving; anders bijlagen niet activeren in de eerste productieconfig. |
| 12 | Account-/hostingdetails niet actueel bevestigd | Donovan voert 002C.6A read-only uit en legt alleen status/evidence vast; geen secrets delen. |

### ACCEPTABLE PILOT RISK — alleen na expliciete menselijke acceptatie

| Punt | Voorwaarde |
|---|---|
| 46 artikelen zijn geen volledige live catalogus | Reeds geaccepteerde pilotbeperking; vraaggestuurd aanvullen uit geldige bron. |
| Niet-kritieke positionering/afstand/rotatie/spiegeling als DATA_GAP | Bestaand human pilotbeleid en server-side blokkades voor werkelijk kritieke data blijven actief. |
| Geen Cloudflare/WAF | Geldige TLS, veilige headers, beperkte accounts en handmatige pilotblast-radius moeten eerst wel bewezen zijn. |
| Off-provider recovery nog niet geautomatiseerd | Alleen verantwoord als actuele providerbackup + gerichte predeploydump + geïsoleerde Sportpaleis-restore PASS zijn, RPO/RTO expliciet zijn geaccepteerd en export later gepland staat. |
| Geen uitgebreid monitoringplatform | Alleen tijdelijk acceptabel met werkende health/readiness, bruikbare logs, vaste menselijke controle en een klein bemand deployment-/observatievenster. |
| Grote frontendchunk | Beperkte pilotbelasting; performance meten in werkelijk gebruik. |

### POST-PILOT IMPROVEMENT

- permanente externe uptime-/TLS-/release-monitoring;
- geautomatiseerde versleutelde off-provider recovery en periodieke restorecadans;
- performance/code-splitting van de grote frontendchunk;
- Cloudflare alleen bij een concrete WAF/DDoS/performance-eis en na aparte DNSSEC/nameserver-GO;
- identity-/MFA- en managed HA-provideruitbreiding volgens WSP.2C wanneer klant- en servicelevelrisico dit vereist;
- verdere catalogusdekking en productieprofielvalidatie uitsluitend uit geldige bronnen/praktijkfeedback.

---

## Productiedata-plan

| Dataklasse | Mee bij deployment | Niet meenemen | Vereist bewijs |
|---|---|---|---|
| Configuratie | Organisatie-ID, 20 verenigingrecords, gevalideerde actieve/inactieve status, productieprofielen, DATA_GAP/provenance, veilige pilotsettings die door de freeze zijn bevestigd | lokale paths, reviewflags, demoMode, SMTP-testconfig, hardwareconfig | idempotent importmanifest + counts/hash |
| Referentie/catalogus | Exact 46 bevestigde records: Waterwijk 41, FC Almere 2, Pioneers 3; afbeeldingen, maten/varianten, bronmetadata en zichtbare bedrukopties zoals lokaal vastgelegd | niet-bevestigde live artikelen, oude `asc-live-*` duplicaten, demo-SKU's, aannames | 46 totaal, verenigingcounts 41/2/3, 0 legacy dubbelen |
| Sportpaleis pilotdata | Bij eerste livegang standaard geen orders; alleen later werkelijk ingevoerde pilotorders | revieworders, `SNIJTEST-001` als order, voorbeeldklanten, voorbeeldcontactgegevens | lege runtime nulmeting |
| Test/demo-data | niets | tien seedorders, demo-login, `example.nl`, gesimuleerd folieverbruik, testaccounts/-wachtwoorden, testmail, mock bridge, reviewfeedback | negatieve importcheck |
| Runtime gebruikersdata | lege orders/feedback/sessions/idempotency/loginAttempts; echte accounts via gecontroleerde bootstrap/activatie | lokale `development-state.json`, lokale backups, sessies en auditseed | accountlijst, rolecheck en herstelroute |

`FOIL_ROLLS` uit de lokale initialisatie mag niet als productiewaarheid worden geïmporteerd: inkoopprijs en oorspronkelijke lengte zijn onbekend en `usedLengthMm` is referentie-/testdata.

---

## Accounts en eerste pilottoegang

| Rol | Bedoelde capability | Vereiste pre-live handeling |
|---|---|---|
| Kevin / Admin | Beheer, verenigingen, artikelen, profielen, gebruikers, financiële/admininformatie | Werkelijke identiteit/e-mail bevestigen; eerste-adminbootstrap via een apart veilig, auditable proces; sterk uniek wachtwoord; recoveryroute vastleggen. |
| Patrick / Productie | Orders controleren, productiecontext, voortgang | Eenmalige 24-uursactivatie na adminbootstrap; alleen operatorrechten; geen admin-finance, provider of hardwaretoegang. |
| Winkelmedewerker | Normale orders/Teamorders invoeren en terugvinden | Werkelijke gebruiker(s)/e-mail bevestigen; store-role; geen beheer/productiefinance. |
| Donovan / WBD support | Technische ondersteuning | Alleen indien expliciet gewenst en contractueel bevestigd; support is geen klantseat en geen providerrecht. |

De huidige code kan uitnodigen en activeren, maar kan geen bestaand account veilig resetten. Een verlopen/vergeten wachtwoord vereist nu een niet-ontworpen productiedatamutatie. Dit moet vóór livegang worden opgelost of met een expliciet, getest human recovery-runbook worden afgedekt.

---

## D. Deployment- en rollbackrunbook

Dit runbook mag pas worden uitgevoerd nadat alle BLOCKER-regels 1–12 een bewijsreferentie en Human GO hebben. De nog onbekende TransIP-site-ID, DocumentRoot, DB-naam en credential-ID worden niet gegokt; zij moeten in het release-evidence staan voordat de eerste write plaatsvindt.

### PRE-DEPLOY

1. **Target locken**
   - Leg vast: provider/product, site-ID, `workspace.webuildanddesign.nl`, DocumentRoot, runtime, DB-engine/version, DB-naam, dedicated runtimeuser en loglocatie.
   - Bevestig dat WBD public, preview en Experience niet dezelfde DocumentRoot gebruiken.
2. **Immutable release maken**
   - Maak een schone branch/commit met uitsluitend de bevroren pilot.
   - Bouw vanuit een schone clone met de gepinde lockfile en ondersteunde Nodeversie.
   - Genereer een nieuwe release-ID volgens `<family>-<UTC>-<commit7>`; `UNCOMMITTED` is verboden voor deployment.
   - Hash frontend, backend, migrations en importmanifest afzonderlijk.
3. **Security preflight**
   - Secretscan op de volledige kandidaat; geen `.env`, wachtwoord, token, private key, lokale state of testmailcapture in het artefact.
   - `NODE_ENV/APP_ENV` of PHP-equivalent op production; debug/display errors uit; veilige errorlogging aan.
   - Demo-, SMTP- en hardwaregates hard uit.
4. **Backup/recovery**
   - Bevestig actuele TransIP providerbackupstatus en timestamp.
   - Maak gerichte predeploybackup van de toekomstige Workspace-DB; bij een nieuwe lege DB: schema-export en providerrestorepad vastleggen.
   - Bewaar actuele WBD/Experience release- en rootidentiteit zodat packagebrede impact kan worden hersteld.
   - Verifieer de kandidaatdatabase/import geïsoleerd en registreer counts/checks/duur.
5. **Database dry-run**
   - Run de geconsolideerde schema-8-keten op een lege geïsoleerde DB en, indien relevant, op een kopie van de laatste pilotstate.
   - Controleer tabellen, FK's, organisatie-ID, 46 catalogusrecords, 41/2/3 counts, 0 orders, 0 sessions, 0 legacy dubbelen en alle DATA_GAP/provenance.
6. **Accounts**
   - Laat Donovan alleen echte naam/e-mail/rol bevestigen.
   - Maak geen standaardwachtwoorden. Bootstrap uitsluitend de eerste admin via het goedgekeurde eenmalige proces; overige accounts via eenmalige activatie.
7. **Human GO-pakket**
   - Toon release-ID/commit/hashes, exact target, backup-ID, DB-impactclass, smoke matrix, rollbacktarget, onderhoudsvenster en uitvoerder.
   - Vereis afzonderlijke GO voor hostingupload, database/migratie en DNS/TLS/hostactivatie.

### DEPLOY

1. Open een kort bemand maintenance-/changevenster; mail en hardware blijven uit.
2. Upload de kandidaat naar een **nieuwe versioned release-directory**; overschrijf de huidige WBD/preview/Experience-root niet.
3. Installeer uitsluitend gelockte productiedependencies indien de gekozen runtime dit vereist; geen developmentserver/Vite als productionserver.
4. Maak/controleer de dedicated Workspace-DB en least-privilege runtimeuser.
5. Voer de vooraf gerepeteerde, gehashte migratieketen exact eenmaal uit; schrijf begin/einde/resultaat in secretvrij evidence.
6. Importeer uitsluitend configuratie + 46 catalogusrecords via het idempotente manifest; verifieer counts en negatieve demo-data-asserties.
7. Plaats secrets buiten DocumentRoot/in provider-secretconfig; verifieer alleen `configured/not configured`, nooit waarden.
8. Zet file/directorypermissions minimaal; runtime mag alleen de bedoelde log/cache/uploadlocaties schrijven.
9. Configureer de Workspace-site-root naar de nieuwe versioned release en activeer geldige TLS voor de expliciete host.
10. Start/reload alleen de gekozen Workspace-runtime. Geen packagebrede restart als die WBD/Experience kan raken.
11. Bootstrap/activeer accounts via het goedgekeurde proces. Verwijder tijdelijke bootstraptoegang direct na validatie.
12. Laat SMTP-send, barcodehardware, Direct Print, WinPlot en Summa expliciet uit.

### POST-DEPLOY SMOKE TEST

Voer in deze volgorde uit en stop bij de eerste kritieke fout:

1. `https://workspace.webuildanddesign.nl/health/sportpaleis` — HTTPS geldig; datastore/DB en backupstatus gezond; geen secrets; `hardwareSendEnabled=false`.
2. `https://workspace.webuildanddesign.nl/ready/sportpaleis` — juiste definitieve release-ID.
3. Root en `/workspace/sportpaleis` canonicaliseren naar `/workspace/sportpaleis/overzicht` zonder wildcardplaceholder.
4. Onbekende Workspace-route geeft echte `404`; WBD public, preview en Experience blijven `200` met hun bestaande release-identiteit.
5. Login als Admin, Productie en Winkelmedewerker; server-side rechtenmatrix en `403`-negatieve tests.
6. Beheer → Artikelen: 46 records, verenigingcounts 41/2/3, provenance/DATA_GAP intact.
7. Normale order aanmaken met één vereniging; opslaan, afmelden/aanmelden, heropenen.
8. Normale multi-verenigingsorder Waterwijk + FC Almere; vereniging/profiel per artikel blijft intact.
9. Teamorder: team 18, rugnummers 1–18, één afwijkend nummer, meerdere artikeltypen; opslaan/heropenen.
10. Kritieke fysieke maat-/bedrukdata ontbreekt: order mag opgeslagen en bekeken worden, maar productievoortgang wordt server-side geblokkeerd.
11. Niet-blokkerende positionering/afstand/rotatie/spiegeling: aandacht zichtbaar, geen onterechte blokkade.
12. Feedback zonder bijlage en met geldige veilige testafbeelding; autorisatie en downloadheaders controleren zonder klantdata.
13. 390px mobiele kernflow: geen horizontale overflow; login, overzicht, order en productie bruikbaar.
14. Logs: elke fout traceerbaar met release/context, zonder wachtwoord, cookie, token, bijlage-inhoud of onnodige persoonsgegevens.
15. Bevestig nul externe mails, nul hardwarejobs en nul duplicate sends/actions.
16. Observeer minimaal het afgesproken bemande venster; pas daarna Human ACCEPT of rollback.

### ROLLBACKTRIGGERS

Direct stoppen/rollback bij:

- ongeldige TLS, verkeerde host/site, wildcardplaceholder of verkeerde release-ID;
- WBD public, preview of Experience geraakt;
- onbevoegde toegang, role bypass, demo-login of blootgestelde secret/config;
- seed-/testorders of testaccounts zichtbaar;
- order kan niet duurzaam worden opgeslagen/heropend;
- kritieke DATA_GAP kan toch naar productie;
- migratie/count/integrity mismatch;
- aanhoudende 5xx/DB-fout, onbruikbare logs of onbekende write-uitkomst.

### APPLICATIEROLLBACK

1. Freeze nieuwe Workspace-writes en noteer tijd/release/revision; stuur geen mail/hardwareactie.
2. Bewaar de **huidige pilot-DB ongewijzigd** en maak een gerichte post-failure export met hash.
3. Zet de site-root/revision terug naar de vooraf bevestigde vorige compatibele release.
4. Reload alleen de Workspace-runtime.
5. Valideer TLS, health, login/read-only orderoverzicht en WBD/preview/Experience.
6. Heropen writes alleen na Human GO.

Een code-rollback herstelt de database **niet** automatisch. Zo blijven orders die tijdens het observatievenster zijn aangemaakt behouden.

### DATABASEROLLBACK / RECOVERY

1. Alleen bij aantoonbare datacorruptie of incompatibele migratie en na afzonderlijke DB-rollback-GO.
2. Houd writes dicht; bewaar predeploybackup én post-failure export.
3. Restore de predeploybackup eerst in een geïsoleerde DB.
4. Valideer schema, counts, FK/integriteit en applicatiecompatibiliteit.
5. Inventariseer nieuwe/gewijzigde pilotorders sinds de predeploybackup via order-ID, revision, event history en audit.
6. Reconcileer die orders gecontroleerd en idempotent naar de herstel-DB; geen blinde volledige overschrijving.
7. Schakel de connection pas na checks en Human GO om.
8. Valideer opnieuw de volledige kritieke smoke matrix en leg het werkelijk verloren/herstelde datavenster vast.

---

## E. Human actions vóór een nieuwe deployment-GO

1. Log zelf opnieuw in bij TransIP en bevestig secretvrij: pakket, 3/3-slots of actuele ruimte, opslag, databasequota/users, providerbackups, SSL/subsiteoptie, DocumentRoot, loglocatie en SFTP/SSH-scope.
2. Kies expliciet de productiegrens:
   - bestaande TransIP PHP/MariaDB **alleen nadat** de ontbrekende adapter/import/migratie/restore is gebouwd en bewezen; of
   - de eerder aanbevolen aparte managed Node/PostgreSQL Workspace-stack na aparte budget/provider/privacy-GO.
3. Accepteer of weiger de shared-hosting blast radius. Zonder aparte site/runtime/DB-grens blijft het NO-GO.
4. Autoriseer een schone releasebranch/commit en review de exacte bevroren diff.
5. Bevestig echte accountidentiteiten/e-mails voor Kevin, Patrick en Winkelmedewerker; kies een recoveryeigenaar en bootstrapmethode.
6. Kies voorlopig RPO/RTO en bevestig dat providerbackup + gerichte dump + geïsoleerde restore voor deze beperkte pilot voldoende is, of activeer eerst off-provider recovery.
7. Geef pas daarna afzonderlijke expliciete GO's voor:
   - production access/temporary deploykey;
   - hosting/site/TLS;
   - database/schema/import;
   - accountbootstrap;
   - deployment;
   - eventueel DNS-record.

Geen enkele van deze Human Actions is in dit assessment uitgevoerd.

---

## F. Beslisstatus

TRANSIP PRODUCTION BASELINE: FAIL

BACKUP & ROLLBACK: FAIL

SECURITY BASELINE: FAIL

RELEASE CANDIDATE: NOT READY

SPORTPALEIS DEPLOYMENT: NO-GO

DEPLOYMENT UITGEVOERD: NEE
