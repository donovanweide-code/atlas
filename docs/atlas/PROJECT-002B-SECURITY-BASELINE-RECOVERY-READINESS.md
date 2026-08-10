# Project 002B — Security Baseline & Recovery Readiness

**Datum:** 2026-08-05  
**Scope:** secrets, credentials, accountbeveiliging, back-ups, herstel, eigenaarschap en documentatie  
**Account:** TransIP-login `sportpaleis`; contract-/bedrijfsnaam `We Build And Design`  
**Relatie met 002A:** dit document bouwt voort op `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`.

> **Preflight-update 2026-08-06:** de vier resterende blockeronderwerpen zijn opnieuw read-only gecontroleerd en uitvoerbaar voorbereid in [`PROJECT-002B-REMAINING-BLOCKERS-PREFLIGHT-2026-08-06.md`](PROJECT-002B-REMAINING-BLOCKERS-PREFLIGHT-2026-08-06.md). Project 002B blijft NO-GO totdat de daar beschreven closure-acties feitelijk zijn uitgevoerd en gevalideerd.

> **Scopebesluit 2026-08-06:** de eigenaar heeft de twee legacy `.txt`-bestanden expliciet uitgesteld. Codex mag deze niet verwerken of verwijderen en zij gelden binnen de actuele closure-opdracht niet als blocker. De actuele menselijke recoverychecklist staat in [`PROJECT-002B-RECOVERY-HUMAN-CHECKLIST-2026-08-06.md`](PROJECT-002B-RECOVERY-HUMAN-CHECKLIST-2026-08-06.md); het geïsoleerde restoretestdraaiboek staat in [`PROJECT-002B-ISOLATED-RESTORETEST-RUNBOOK-2026-08-06.md`](PROJECT-002B-ISOLATED-RESTORETEST-RUNBOOK-2026-08-06.md).

> **Private-keyclosure 2026-08-06:** de bevoegde mens heeft de twee reeds ingetrokken tijdelijke private keys lokaal verwijderd. Codex heeft daarna uitsluitend op bestandsniveau bevestigd dat beide exacte paden ontbreken. Geen map, hostinginstelling of productieomgeving is gewijzigd.

> **Recoveryclosure 2026-08-06:** de huidige bevoegde beheerder heeft zonder geheimwaarden te delen het onafhankelijke recoverypad, veilige opslag van recoverycodes, een nieuwe 2FA-login, device-lossroute en providerrecovery bevestigd. WBD is momenteel een eenpersoonsorganisatie; een tweede beheerder is daarom een toekomstige security-uitbreiding en geen actuele blocker.

> **Restoretestclosure 2026-08-06:** de aangewezen Experience-databaseback-up is succesvol geïmporteerd in een tijdelijke MySQL 8.0.36-omgeving zonder TCP-netwerk. Alle 11 tabellen en 10 foreign-keyrelaties zijn gevalideerd; tijdelijke runtime, database en werkkopie zijn verwijderd. Zie [`PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md`](PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md).

## 1. Uitkomst

De security- en recoverybasis is aantoonbaar gereed voor de huidige organisatiestructuur. Project 002B is **GO voor afsluiting** en Project 002C kan na een afzonderlijke project-GO starten.

| Onderdeel | Status | Kernuitkomst |
|---|---|---|
| Root `.gitignore` | PASS | Geheimen, lokale credentials, tijdelijke werkbestanden en dump-/logbijproducten worden standaard uitgesloten; bestaande bronmigraties en release-artefacten blijven zichtbaar. |
| Tracked-tree secretscan | PASS | Geen high-confidence private keys of gangbare cloud-/API-tokenformaten in de huidige tracked tree. |
| Bekende geheimbestanden | PARTIAL | Bestanden zijn ontracked en nu genegeerd, maar staan nog fysiek in de workspace. |
| Git-historie bekende paden | PASS | Geen commits gevonden voor de bekende credentialbestanden en tijdelijke private keys. |
| Volledige historische objectscan | PARTIAL | Twee brede objectscans liepen vast door repositoryomvang; bekende paden en huidige tracked tree zijn wel gecontroleerd. |
| TransIP API | PASS | API staat uit; geen keys, tokens of whitelistregels aanwezig. |
| TransIP accountbrede SSH-keys | PASS | Geen accountbrede SSH-keys aanwezig. |
| Authenticator-2FA | PASS | TransIP bevestigde succesvolle activatie; de status staat aantoonbaar op `Aan`. |
| Recovery readiness | PASS | Onafhankelijke recovery, recoverycodes, nieuwe 2FA-login, device-lossroute en providerrecovery zijn door de huidige bevoegde beheerder bevestigd zonder geheimwaarden te delen. |
| IP-binding | REVIEW | Staat uit. Niet gewijzigd omdat dit mobiele/dynamische sessies kan blokkeren zonder aantoonbare noodzaak. |
| DNS-export | PASS | Beide zones volledig read-only geëxporteerd; geen records gewijzigd. |
| Web-/databaseback-ups | PASS | Concrete restorepunten zijn bevestigd en één Experience-databaseback-up is succesvol geïsoleerd geïmporteerd en structureel gevalideerd. |
| E-mailback-ups | PARTIAL | TransIP documenteert maximaal 7 dagen en gefaseerde beschikbaarheid; per mailbox moet selfservice nog worden bevestigd. |
| Eigenaarschap | PARTIAL | Technisch beheer is helder; contractueel eigenaarschap van `faraouderenzorg.nl` blijft te bevestigen. |

## 2. Uitgevoerde wijzigingen

Alle wijzigingen zijn lokaal en reversibel:

1. Root `.gitignore` toegevoegd.
2. Read-only TransIP DNS-export toegevoegd.
3. Deze security- en recoverybaseline toegevoegd.
4. Authenticator-2FA voor het TransIP-account succesvol geactiveerd en via succesmelding plus actieve status geverifieerd.

Er zijn **geen** DNS-records, websites, DocumentRoots, databases, mailboxen, hostingpakketten, certificaten, API-instellingen of deploys gewijzigd.

## 3. Credential- en secretinventaris

Secretwaarden zijn bewust niet in dit document opgenomen. Van moeilijk leesbare bestanden is geen inhoud geforceerd uitgelezen.

| Credential/artefact | Locatie of systeem | Waarschijnlijke eigenaar | Gebruik | Bevinding | Actie/rotatie |
|---|---|---|---|---|---|
| Legacy wachtwoordnotitie | `/Wachtwoorden.txt` | We Build And Design / Donovan | Onbekend; waarschijnlijk gedeelde operationele credentials | Ontracked, nu genegeerd, nog fysiek in repositoryworkspace | Verplaats naar password manager buiten repo. Roteer iedere nog actieve credential of iedere credential waarvan gebruik/onbedoelde deling niet kan worden uitgesloten. |
| Analytics-accountnotitie | `/Analytics@webuildanddesign.nl.txt` | We Build And Design | Volgens bestaande connectordocumentatie geen API-config, property-ID, service-account of private key | Ontracked, nu genegeerd, nog fysiek in workspace | Verplaats buiten repo. Indien een actief wachtwoord aanwezig is: roteer na gecontroleerde migratie naar password manager. |
| Tijdelijke deploy-private key | `/.codex-tmp/atlas-runtime-production-v1/transip-runtime-v1-ed25519` | Tijdelijke uitvoerder / WBD | Voormalige Atlas-runtime deploytoegang | Remote ingetrokken; lokaal door bevoegde mens verwijderd en op 2026-08-06 met `Test-Path=False` gevalideerd | Afgerond; geen rotatie of vervolgtoegang nodig. |
| Tijdelijke deploy-private key | `/.codex-tmp/living-online-validation-v1/transip-deploy-ed25519` | Tijdelijke uitvoerder / WBD | Voormalige Living Experience-validatie | Remote ingetrokken; lokaal door bevoegde mens verwijderd en op 2026-08-06 met `Test-Path=False` gevalideerd | Afgerond; geen rotatie of vervolgtoegang nodig. |
| TransIP hoofdaccountwachtwoord | TransIP | We Build And Design | Accountadministratie | Niet uitgelezen; geen opslag in tracked tree gevonden | Alleen roteren als gedeeld gebruik, verlies of blootstelling aannemelijk is; direct koppelen aan password manager en 2FA. |
| TransIP SFTP/SSH-credentials | Hostingpakket | We Build And Design | Websitebeheer/deploy | Providercredential bestaat; waarde niet uitgelezen | Niet blind roteren: eerst alle actieve deploy-/beheerafhankelijkheden inventariseren. |
| Databasecredentials | TransIP/app-config | We Build And Design | WordPress en Experience | Geen plaintextwaarde in tracked scan gevonden | Rotatie in afzonderlijk change-window met app-configupdate en rollback. |
| Mailboxcredentials | TransIP Email | WBD en Fara-gebruikers | Operationele e-mail | Niet uitgelezen | Roteer alleen gericht per mailbox; leg eigenaar en recoverykanaal vast. |
| API-tokens | TransIP | N.v.t. | API-automatisering | API uit; geen tokens gevonden | Geen actie. |

### 3.1 Scanresultaten

- Huidige tracked tree: geen PEM/private-keyheader en geen high-confidence GitHub-, AWS-, Google-, Stripe-, Slack- of OpenAI-tokenpatronen.
- Historische volledige-workspacecontrole vond de twee inmiddels ingetrokken tijdelijke keys in `/.codex-tmp/`; beide exacte bestanden zijn op 2026-08-06 verwijderd en daarna als afwezig gevalideerd.
- Bekende secretpaden: geen Git-commitgeschiedenis gevonden.
- Reeds gevolgde bestanden die nu door `.gitignore` worden geraakt: geen (`git ls-files -ci --exclude-standard` gaf geen resultaat).
- `gitleaks` en `trufflehog` waren lokaal niet geïnstalleerd. Een volledige historische Git-objectscan kon door time-outs niet sluitend worden afgerond.

**Conclusie:** secrets zijn niet zichtbaar voor normale `git status`/`git add`-flows. De twee ingetrokken private keys zijn verwijderd. De twee legacy notitiebestanden zijn door expliciet scopebesluit uitgesteld en worden niet door Codex verwerkt.

## 4. Root `.gitignore`-baseline

De rootregels dekken onder meer:

- `.env` en `.env.*`, met expliciete uitzondering voor voorbeeldbestanden;
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `id_rsa*`, `id_ed25519*` en `*ed25519`;
- generieke credential-/service-accountbestanden en lokale secretmappen;
- de twee bekende legacy notitiebestanden;
- `/.codex-tmp/`, `/tmp/`, logs, dumps en backupbijproducten;
- editor- en OS-bijproducten.

Bewust niet globaal genegeerd:

- `*.sql`, omdat de repository bedoelde schema- en migratiebestanden bevat;
- `*.zip` en `*.tar.gz`, omdat `output/` bedoelde release-/opleverartefacten bevat;
- subprojectspecifieke bestanden waarvoor al een lokale `.gitignore` bestaat.

Nieuwe dump- of releasebestanden in `output/` moeten daarom vóór staging handmatig op secrets en persoonsgegevens worden gecontroleerd.

## 5. TransIP-accountbeveiliging

### 5.1 Actuele status

- Authenticator-2FA: op 2026-08-05 succesvol ingeschakeld. TransIP toonde de succesmelding en de preference/status stond daarna op `yes`/`Aan`.
- E-mailverificatie: TransIP gebruikt dit sinds oktober 2025 voor accounts zonder actieve 2FA. Dit is een vangnet, geen vervanging voor authenticator-2FA.
- IP-adres koppelen aan sessie: uit en bewust niet gewijzigd.
- API: uit; geen token of IP-whitelist.
- Accountbrede SSH-keys: geen.
- Recoveryroute: een onafhankelijk adres buiten de WBD/TransIP-mailomgeving is door de bevoegde beheerder praktisch getest; het adres is niet aan Codex verstrekt of vastgelegd.
- Nieuwe privésessie-login met wachtwoord en 2FA: door de bevoegde beheerder als geslaagd bevestigd.
- Recoverycodes: aanwezigheid in beveiligde opslag bevestigd; geen codes of geheimwaarden gedeeld.
- Organisatiestructuur: WBD heeft momenteel één bevoegde beheerder. Een tweede beheerder wordt pas als control toegevoegd zodra deze rol werkelijk bestaat.
- Open accountpunt: bijgewerkte overeenkomsten/voorwaarden in het account vereisen nog menselijke contractuele beoordeling.

### 5.2 Bevestigde recoverybaseline

1. Een nieuwe login in een privésessie met wachtwoord en 2FA is geslaagd.
2. Recoverycodes zijn volgens menselijke bevestiging aanwezig in beveiligde opslag; Codex heeft geen toegang en legt geen waarden vast.
3. Een onafhankelijk recoverypad buiten de primaire WBD/TransIP-mailomgeving is praktisch getest.
4. Device loss wordt in de huidige eenpersoonsorganisatie afgehandeld via beveiligde recoverymiddelen, het onafhankelijke recoverypad en als laatste route het officiële TransIP-support-/recoveryproces.
5. Er wordt geen gedeeld noodwachtwoord of fictieve tweede beheerder aangemaakt.
6. Zodra een tweede bevoegde beheerder wordt aangesteld, worden break-glass, menselijke tegencontrole en tweepersoonsautorisatie opnieuw beoordeeld.

### 5.3 Historische accountnaam

De loginnaam `sportpaleis` is historisch en wijkt af van `We Build And Design`. Niet wijzigen binnen 002B. Plan:

1. Vraag TransIP-support of een loginnaamwijziging mogelijk is zonder product-, facturatie- of autorisatie-impact.
2. Bewaar supportantwoord en ticketnummer in het bedrijfsdossier.
3. Voer alleen uit in een afzonderlijk change-window met testlogin, recoverycontact en rollback.

## 6. DNS-export en risicoanalyse

De volledige read-only export staat in:

`docs/atlas/infrastructure/TRANSIP-DNS-EXPORT-2026-08-05.json`

Gecontroleerd:

- `webuildanddesign.nl` en `faraouderenzorg.nl` gebruiken TransIP-nameservers en DNSSEC.
- Beide zones hebben dubbele `x-transip-mail-auth`-TXT-records met verschillende waarden. Dit is geen letterlijke duplicatie; niet verwijderen zonder TransIP-bevestiging.
- SPF, DKIM, DMARC en MX zijn aanwezig.
- DMARC staat op monitoring (`p=none`), wat acceptabel is voor inventarisatie maar geen afdwingende spoofingbescherming biedt.
- Wildcard A/AAAA-records vangen onbekende subdomeinen af. Bij `webuildanddesign.nl` veroorzaakte dit voor een niet-geconfigureerde hostname een TLS-naamfout.
- `www.webuildanddesign.nl` geeft een eigen 200-response en redirect niet naar apex.

Geen van deze punten is in 002B gewijzigd. DMARC-verharding, wildcardverwijdering en canonical redirects horen in een afzonderlijk DNS-/mailchangeplan.

## 7. Back-upbaseline

### 7.1 TransIP-retentie

| Product | Pakket | Web-/bestandsretentie | Databaseritme | Toegang |
|---|---|---:|---:|---|
| `webuildanddesign.nl` | Webhosting Pro | 30 dagen | 1 per dag | Tot 14 dagen via CP; dag 15–30 via supportverzoek |
| `faraouderenzorg.nl` | Webhosting Core | 14 dagen | 1 per dag | Via CP |

TransIP documenteert voor webbestanden uurlijkse back-ups over de afgelopen dag en daarna dagelijks. Een automatische pakketrestore kan alle bestanden, subsites en databases binnen het pakket raken. Omdat WBD productie, preview en Experience op één pakket deelt, is pakketbrede restore alleen een laatste redmiddel.

Read-only gecontroleerde restorepunten op 2026-08-05:

| Back-upreeks | Punten zichtbaar | Nieuwste | Oudste zichtbaar |
|---|---:|---|---|
| WBD Pro — website/pakket | 37 | 05-08-2026 23:00 | 22-07-2026 00:05 |
| WBD WordPress-database | 54 | 05-08-2026 23:00 | 07-07-2026 00:00 |
| Experience-database | 26 | 05-08-2026 23:00 | 04-08-2026 00:00 |
| Fara Core — website/pakket | 36 | 05-08-2026 23:00 | 23-07-2026 00:05 |
| Fara WordPress-database | 37 | 05-08-2026 23:00 | 23-07-2026 00:00 |

Er is geen knop **Herstellen** of **Downloaden** geactiveerd. De Experience-database heeft een kortere historie omdat deze reeks pas vanaf 04-08-2026 zichtbaar is. Het oudere WBD WordPress-databasepunt is rechtstreeks in het databasebackupoverzicht zichtbaar; dit verandert niets aan het voorzichtigheidsadvies om vóór gebruik de download en import geïsoleerd te testen.

### 7.2 E-mail

De actuele TransIP-documentatie vermeldt:

- mailboxback-ups tot maximaal 7 dagen;
- maximaal 10 uurlijkse back-ups, afhankelijk van het tijdstip;
- een tijdelijke, alleen-lezen mailbox waarmee berichten kunnen worden opgeslagen of teruggezet;
- gefaseerde beschikbaarheid; support is nodig als de knop niet beschikbaar is.

Per actieve mailbox moet nog worden bevestigd of de selfserviceknop zichtbaar is. Voor bedrijfskritische mail is daarnaast een onafhankelijke periodieke export vereist.

### 7.3 Lokale en releaseback-ups

- Git dekt alleen tracked broncode en documentatie.
- `output/`, lokale releasearchieven en database-exportbestanden zijn geen structureel off-site back-upsysteem.
- `/.codex-tmp/` en subproject-`.codex-tmp` zijn tijdelijke werkgebieden en geen herstelbron.
- Een back-up is pas bruikbaar na een gecontroleerde restoretest en vastgelegde RPO/RTO.

## 8. Praktische herstelprocedures

### 8.1 WBD-productiewebsite

1. Declareer incident, tijdstip, vermoedelijke oorzaak en eigenaar.
2. Stop writes/deploys; wijzig nog geen DNS.
3. Leg huidige DocumentRoot, release-id en HTTP/TLS-status vast.
4. Kies eerst een geïsoleerde file-/databasebackup; vermijd pakketbrede restore vanwege preview en Experience.
5. Maak vóór iedere restore een actuele handmatige kopie van bestanden en betrokken database.
6. Herstel bestanden en database uit hetzelfde consistente tijdvenster wanneer de applicatie beide gebruikt.
7. Valideer apex, `www`, formulieren, mailflow, IPv4/IPv6, TLS en applicatielogs.
8. Documenteer datapuntverlies, herstelduur en post-incidentacties.

### 8.2 Living Experience

1. Stop publicatie- of contentwrites.
2. Noteer huidige DocumentRoot: `/sites/wbd-experience-20260805-fv2c0ybh`.
3. Voorkeursrollback is de laatst aantoonbaar werkende immutable release; de eerder gebruikte kandidaat is `/sites/wbd-experience-20260804-cdi4nuot`, maar dit pad moet vóór wijziging visueel in TransIP worden bevestigd.
4. Herstel database `webuil_experiencev1` alleen bij data-/schemaproblemen, niet bij een zuiver frontend-/releaseprobleem.
5. Valideer `/`, `/ervaar`, sessiestart, eventopslag en eigenaarschap van nieuwe sessies.
6. Pakketbrede automatische restore is laatste redmiddel omdat deze WBD-productie en preview eveneens kan terugzetten.

### 8.3 Atlas / Workspace

Atlas en Workspace zijn volgens 002A niet als afzonderlijke TransIP-sites gepubliceerd. Herstel daarom uit:

1. de laatst bekende goede Git-commit voor broncode;
2. gecontroleerde exports van niet-tracked bedrijfsdata;
3. package-lock en buildinstructies voor reproduceerbare installatie;
4. de laatst gevalideerde browser-/runtimeconfiguratie.

Pas geen TransIP-pakketrestore toe voor een uitsluitend lokaal Atlas-/Workspaceprobleem.

### 8.4 Databases

1. Identificeer exact één getroffen database en applicatie.
2. Download eerst de huidige database als pre-restore snapshot.
3. Download de gewenste TransIP-back-up; gebruik waar mogelijk een geïsoleerde import in een tijdelijke database voor verificatie.
4. Controleer schema, tabellen, row counts, encoding en applicatiecompatibiliteit.
5. Plan een write-freeze voor de definitieve restore.
6. Importeer pas na expliciete goedkeuring; een destructieve `DROP`/lege database is niet automatisch toegestaan.
7. Voer functionele en dataconsistentiechecks uit en leg de hersteltijd vast.

### 8.5 Documenten en dossier

- Tracked dossier: herstel via Git.
- Niet-tracked documenten: herstel via goedgekeurde externe bedrijfsopslag, niet via `.codex-tmp`.
- Bewaar periodiek een versleutelde, off-repo kopie van het Atlas-dossier met eigenaar, retentie en testdatum.

## 9. RPO/RTO-voorstel

| Asset | Voorlopige RPO | Voorlopige RTO | Opmerking |
|---|---:|---:|---|
| WBD-productiewebsite | 24 uur data, 1 uur bestanden | 4 uur | Verlaag RPO met app-consistente exports indien formulieren/data bedrijfskritisch zijn. |
| Living Experience | 24 uur data, immutable release voor code | 4 uur | Release-rollback is sneller dan pakketrestore. |
| Fara-website | 24 uur | 8 uur | Contractuele eigenaar en businessimpact nog bevestigen. |
| E-mail | 24 uur | 8 uur | Providerretentie maximaal 7 dagen; onafhankelijke export nodig. |
| Atlas/Workspace-documenten | 1 werkdag | 8 uur | Vereist off-repo kopie voor niet-tracked materiaal. |

Deze waarden zijn een werkbare baseline, geen goedgekeurde SLA.

## 10. Ownership- en verantwoordelijkheidsmatrix

| Asset | Contract-/technisch account | Operationeel eigenaar | Wijzigingsbeslissing | Hersteluitvoerder |
|---|---|---|---|---|
| TransIP-account | We Build And Design / `sportpaleis` | WBD-directie/Donovan | Bevoegde WBD-eigenaar | Bevoegde beheerder; TransIP-support voor accountrecovery |
| `webuildanddesign.nl` | WBD in TransIP | WBD | WBD | Beheerder onder change-window |
| WBD Webhosting Pro | WBD in TransIP | WBD | WBD | Beheerder/TransIP-support |
| Living Experience-subsite en database | WBD Webhosting Pro | WBD | WBD productowner | Beheerder |
| `faraouderenzorg.nl` en Core-hosting | WBD-account; contractuele eindhouder open | Fara/WBD nog vastleggen | Bevoegde contracthouder | Beheerder na eigenaarbevestiging |
| Mailboxen | WBD TransIP-account | Per mailboxgebruiker + WBD-admin | WBD/contracthouder | WBD-admin/TransIP-support |
| TLS-certificaten | TransIP-managed | WBD | WBD | TransIP + beheerder |
| Atlas Git-repository | GitHub `donovanweide-code/atlas` | WBD/Donovan | Repositoryeigenaar | Repositorybeheerder |
| Tijdelijke Codex-deploytoegang | Geen blijvend eigenaarschap | Tijdelijke uitvoerder | WBD autoriseert | Verwijderen na taak; nooit als break-glass-account |

## 11. Open acties en volgorde

### Blokkerend vóór 002C

Geen actuele blockers binnen de goedgekeurde Project 002B-scope.

Afgerond op 2026-08-06: beide ingetrokken tijdelijke private keys zijn lokaal verwijderd en als afwezig gevalideerd; recovery readiness is door de huidige bevoegde beheerder bevestigd; de geïsoleerde Experience-databaserestoretest is volledig geslaagd en opgeruimd.

### Expliciet uitgesteld en geen blocker in de actuele closure-opdracht

- `Wachtwoorden.txt` en `Analytics@webuildanddesign.nl.txt`: geen toegang, verwerking, validatie of verwijdering door Codex.

### Niet opnieuw beoordeeld in deze beperkte opdracht

- Contractueel eigenaarschap en herstelbevoegdheid voor Fara blijven een afzonderlijk governancepunt uit de oorspronkelijke baseline. Deze status is door dit scopebesluit niet stilzwijgend gewijzigd.

### Niet-blokkerend maar gepland

1. Onderzoek DMARC-verharding (`p=quarantine`/`reject`) in een afzonderlijk mailproject.
2. Beoordeel wildcard DNS en canonical redirects in een afzonderlijk DNS-project.
3. Plan periodieke mail- en dossierexports naar versleutelde off-site opslag.
4. Herhaal secret scanning met een dedicated scanner in CI of pre-commit, na afzonderlijke CI/CD-scope.

## 12. GO/NO-GO

**Besluit, bijgewerkt op 2026-08-06: GO voor afronding van 002B. Project 002C kan na een afzonderlijke project-GO starten.**

Reden: de preventieve Git-baseline, Authenticator-2FA, recovery readiness, DNS-export, private-keyverwijdering en geïsoleerde restoretest zijn gereed. De legacy `.txt`-bestanden zijn expliciet uitgesteld en gelden binnen dit besluit niet als blocker.

Het afzonderlijke Fara-governancepunt moet vóór een Fara-gerelateerde infrastructuurwijziging zelfstandig worden besloten. Het vormt geen blocker voor de generieke start van Project 002C zolang Project 002C geen Fara-specifieke wijziging uitvoert.

## 13. Bronnen

- Interne 002A-inventaris: `docs/atlas/PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`
- DNS-export: `docs/atlas/infrastructure/TRANSIP-DNS-EXPORT-2026-08-05.json`
- TransIP: <https://www.transip.nl/knowledgebase/5912-back-ups-op-webhostingpakketten>
- TransIP: <https://www.transip.nl/knowledgebase/5939-handmatig-back-up-maken-database-webhostingpakket>
- TransIP: <https://www.transip.nl/knowledgebase/email-algemeen/e-mail-back-ups-via-het-controlepaneel-opvragen>
- TransIP: <https://www.transip.nl/knowledgebase/e-mailverificatie-voor-transip-accounts>
