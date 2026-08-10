# Project 002C.4 — Backup Register & Off-provider Recovery Baseline

**Datum:** 7 augustus 2026  
**Status:** **GO — ontwerpbaseline en repositoryguardrails gereed; NO-GO voor export, kopie, opslagactivatie of restore zonder afzonderlijke Human GO**  
**Scope:** providerback-ups, applicatie-/databaseback-ups, off-provider herstel, retentie, RPO/RTO, restorebewijs en toekomstige Atlas-attentie  
**Productie-impact:** geen

## Bewijsstatus

- **VERIFIED** — in deze opdracht rechtstreeks in de repository of in actuele officiële providerdocumentatie vastgesteld.
- **DOCUMENTED BUT NOT VERIFIED** — eerder vastgelegd bewijs dat in 002C.4 niet opnieuw aan de bron is gecontroleerd.
- **UNKNOWN** — onvoldoende bewijs om een positieve of negatieve conclusie te trekken.
- **RECOMMENDATION** — voorgestelde beheersmaatregel; geen geactiveerde werkelijkheid of SLA.

Een back-up kan aanwezig zijn zonder vers, integer, onafhankelijk of herstelbaar bewezen te zijn. Deze vijf eigenschappen worden daarom nooit samengevoegd tot één groen/roodveld.

---

## 1. Executive Summary

WBD heeft meerdere nuttige herstelmiddelen: TransIP maakt automatische webhosting- en databaseback-ups, releases gebruiken versioned artefacten en gerichte pre-releaseback-ups, Git beschermt tracked bron/documentatie en de lokale WBD Workspace kan een volledige dossierexport maken. **VERIFIED voor repositorymogelijkheden en actuele providerclaims; DOCUMENTED BUT NOT VERIFIED voor actuele WBD-providerpunten**

Project 002B bewees één concreet Experience-databaseherstel: importexitcode 0, 11/11 tabellen aanwezig, 11/11 `CHECK TABLE OK`, 10 foreign keys, 0 weesrecords, 0 niet-InnoDB-tabellen, 0 niet-`utf8mb4`-tabellen, 0 productieverbindingen en 0 TCP-listeners. De tijdelijke runtime, ZIP, testdatabase, logs en werkkopie zijn verwijderd; de bron bleef behouden met ongewijzigde SHA-256. **VERIFIED als canoniek uitgevoerd bewijs uit 002B**

Niet bewezen zijn een actuele versleutelde off-provider kopie, een tweede apparaat- of accountonafhankelijk herstelpad voor data, periodieke integriteitscontrole, vaste retentie per capability en een actuele restorecadans buiten dit ene testobject. **UNKNOWN**

**Besluit:** de governancestructuur van 002C.4 is **GO**. Operationele off-provider recovery is **NO-GO** totdat de bevoegde beheerder opslag, contract, encryptiemethode, sleutelrecovery en retentie kiest, een expliciete kopie-GO geeft en daarna secretvrij bewijs van integriteit en een geïsoleerde restore vastlegt.

---

## 2. Scope

### Binnen scope

- classificatie en register van herstelmiddelen;
- providerafhankelijkheid en off-provider vereisten;
- gegevensgevoeligheid, encryptie, toegang en veilige metadata;
- risicogestuurde freshness, retentie, RPO/RTO en restorecadans;
- koppeling aan database-impact en releasebewijs uit 002C.2;
- attentionregels volgens de grens uit 002C.3;
- providerneutrale repositoryschema's en een restore-evidencetemplate;
- een uitvoerbare Human Action Checklist voor latere menselijke activatie.

### Buiten scope

- back-ups downloaden, openen, kopiëren, verplaatsen, uploaden of verwijderen;
- database-inhoud, persoonsgegevens, mailboxinhoud of dossierexports inspecteren;
- een restoretest of productiehandeling uitvoeren;
- opslagaccount, abonnement, bucket, share, scheduler, monitor of integratie maken;
- retentie/schedules bij een provider wijzigen;
- secrets, encryptiesleutels, recoverycodes of Bitwarden-inhoud lezen;
- productie, DNS, hosting, database, SSL, Cloudflare, accounts, rechten of deploys wijzigen.

---

## 3. Evidence Reviewed

| Bron | Relevantie | Status |
|---|---|---|
| `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md` | providerretentie, concrete herstelpunten, owners, recoverygrens | volledig gelezen; canoniek voorgangerbewijs |
| `PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md` | werkelijk geïsoleerd Experience-herstel en cleanup | **VERIFIED** |
| `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md` | huidige/target recoveryarchitectuur en gaps | canoniek ontwerpbewijs |
| `PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md` | DB-impactclasses, Human GO, release- en rollbackgrens | canoniek ontwerpbewijs |
| `PROJECT-002C-EXTERNAL-MONITORING-BASELINE.md` | backupmonitoringgrens, severity en deduplicatie | canoniek ontwerpbewijs |
| `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md` | historische provider-/release-inventaris en open punten | gedateerd voorgangerbewijs |
| `WBD-DOSSIER-BACKUP-RESTORE-V1.md` | lokale volledige dossierexport, validatie en beperkingen | repositoryfunctie **VERIFIED**; werkelijke export **UNKNOWN** |
| actuele TransIP Knowledge Base | automatische webhosting/databaseback-ups en e-mailback-ups | **VERIFIED als providerclaim op 2026-08-07** |

TransIP documenteert 10, 14 of 30 dagen webhostingretentie afhankelijk van pakket; bestanden worden de eerste dag ieder uur en daarna dagelijks bewaard, databases dagelijks. Een automatische restore raakt alle bestanden en databases van het pakket; gerichte database- en bestandsdownloads zijn mogelijk. Stored procedures/custom databasefuncties vallen volgens de provider buiten de databaseback-up. E-mailback-ups zijn maximaal zeven dagen beschikbaar en de selfservicefunctie is niet voor iedere mailbox uitgerold. **VERIFIED als actuele providerclaim; niet als actuele WBD-accountstatus**

Niet onderzocht: inhoud van een back-up, private storage, actuele providerconsole, mailbox, database, secret store, lokaal exportbestand of betaalde off-provider checkout. Credits/facturatie zijn niet zichtbaar.

---

## 4. Current Backup State

| Capability | Huidige herstelbronnen | Onafhankelijkheid | Oordeel |
|---|---|---|---|
| Publieke WBD-site | providerbestanden, immutable releaseartefact, Git-bron | providerbron TransIP; Git/release alleen gedeeltelijk herstel | **DOCUMENTED BUT NOT VERIFIED** |
| Experience-applicatie | versioned release, providerbestanden, gerichte archieven | code rollback beschikbaar; data blijft kritieke laag | **DOCUMENTED BUT NOT VERIFIED** |
| Experience-database | dagelijkse providerback-up en pre-release SQL-back-ups | één testobject lokaal hersteld; actuele off-provider reeks onbekend | herstelbewijs **VERIFIED**, huidige dekking **UNKNOWN** |
| DNS/configuratie | getrackte DNS-export en release-/infrastructuurdocumentatie | repository is buiten hostingdata, maar accounttoegang blijft nodig voor herstel | export **VERIFIED**; actuele drift **UNKNOWN** |
| WBD Workspace-dossier | handmatige volledige browserexport met interne validatie | download is lokaal/apparaatgebonden en niet aanvullend versleuteld | functie **VERIFIED**; bestaande kopie **UNKNOWN** |
| Atlas/Workspace bron en docs | Git en lokale werkboom | Git dekt alleen tracked materiaal | **VERIFIED** |
| E-mail | providerback-up, tijdelijke alleen-lezen mailboxroute | maximaal zeven dagen; selfservice per mailbox onbekend | providerclaim **VERIFIED**; WBD-dekking **UNKNOWN** |
| Fara | providerback-ups volgens historisch Core-pakket | governance/eindhouder blijft open | **DOCUMENTED BUT NOT VERIFIED** |
| Toekomstige klantdata | geen generieke productiebaseline | geen bewezen tenant-aware backup | **UNKNOWN / NO-GO** |

Lokale `output/`, tijdelijke directories, een gebruikersdownloadmap of één laptop gelden niet als structurele off-provider recovery. Een releaseartefact herstelt geen database, mailbox, DNS-account of niet-getrackte documenten.

---

## 5. Proven Recovery Evidence

Het bewijs uit 002B geldt uitsluitend voor de aangewezen Experience-databaseback-up van 4 augustus 2026:

| Controle | Uitkomst |
|---|---|
| Import | exitcode 0; 11 tabellen |
| Structuur/integriteit | 11/11 verwachte tabellen; 11/11 `CHECK TABLE OK` |
| Relaties | 10 foreign keys; 0 weesrecords |
| Engine/collation | 0 niet-InnoDB; 0 niet-`utf8mb4` |
| Isolatie | 0 productieverbindingen; 0 TCP-listeners |
| Cleanup | runtime, ZIP, testdatabase, logs en werkkopie verwijderd |
| Bronintegriteit | oorspronkelijke back-up behouden; SHA-256 ongewijzigd |

**Bewijssterkte:** deze test bewijst dat precies dit bestand in MySQL 8.0.36 structureel herstelbaar was. Zij bewijst niet dat latere back-ups bestaan, vers of volledig zijn; niet dat een productieherstel veilig is; niet dat bestanden, e-mail, DNS, WBD-dossiers of toekomstige klantdata herstelbaar zijn; en niet dat RTO/RPO contractueel wordt gehaald.

---

## 6. Backup Classification

| Classificatie | Definitie | Voorbeeld | Bewijsminimum |
|---|---|---|---|
| A — Provider backup | door primaire provider beheerd herstelpunt | TransIP hosting/database/mail | providerstatus, tijdstip, retentie en restorebereik |
| B — Application/database backup | app-consistente of gerichte export | pre-migratie SQL, Workspace-export | bron, completion, hash/integriteit en schema/appversie |
| C — Off-provider copy | versleutelde kopie buiten primaire providerblast-radius | encrypted cloud/object/offline copy | onafhankelijke provider/account, versleuteling, eigenaar, freshness en toegangstest |
| D — Recovery evidence | bewijs dat herstel bruikbaar is | geïsoleerde restore-uitkomst | testobject-ID, checks, resultaat, cleanup en reviewer |
| E — Configuration/DNS evidence | herstelbare technische configuratie zonder secrets | DNS-export, manifest, release-evidence | datum, bron, integriteit en toepassingsgrens |

Eén artefact kan in meerdere rijen voorkomen, maar niet stilzwijgend meerdere garanties krijgen. Een B-back-up wordt pas C wanneer de versleutelde kopie aantoonbaar buiten de primaire provider en het enige lokale apparaat staat.

---

## 7. Backup Register

Het canonieke providerneutrale schema en secretvrije voorbeeld staan in:

- `backup/BACKUP-REGISTER.schema.json`;
- `backup/BACKUP-REGISTER.example.json`.

Iedere entry bevat minimaal: `organisation_id`, `environment`, `service_capability`, `backup_type`, `source_system`, `storage_category`, `provider_dependency`, `frequency`, `expected_freshness`, `retention`, `encryption_status`, `owner`, `recovery_owner`, `last_successful_backup`, `last_integrity_check`, `last_restore_test`, `next_restore_due`, `recovery_objective`, `evidence_reference`, `current_status`, `attention_reason` en `notes`.

Registerregels:

- datum/tijd in UTC ISO-8601; `null` betekent onbekend, nooit “niet van toepassing” tenzij de capability dat motiveert;
- geen bestandsnamen met persoonsgegevens, private paden, provider-ID's, e-mailadressen, hashes van secrets of sleutelreferenties;
- `last_successful_backup` is geen restorebewijs;
- iedere statuswijziging verwijst naar secretvrij bewijs;
- één entry per organisatie + environment + capability + backuptype;
- Sportpaleis is hoogstens een toekomstige organisatie-entry en nooit de platformbasis.

---

## 8. Off-provider Recovery Baseline

### Minimale architectuur

**RECOMMENDATION:** hanteer per kritieke data-capability minimaal drie logisch verschillende lagen:

1. primaire productiedata;
2. providerback-up of gerichte applicatieback-up;
3. client-side versleutelde kopie bij een andere provider/account of gecontroleerd offline medium.

Voor dynamische/persoonsgebonden data moet laag 3 buiten TransIP staan, niet alleen op de primaire laptop, en zonder toegang tot de primaire mailbox herstelbaar zijn. De sleutel of herstelcode staat niet naast het archief en wordt uitsluitend door de mens beheerd.

### Acceptatiecriteria

- verlies van TransIP-toegang verwijdert niet alle herstelkopieën;
- verlies of ransomware op één apparaat verwijdert niet bron én kopie;
- de off-provider dienst gebruikt een afzonderlijk account en onafhankelijk recoverykanaal;
- encryptie vindt vóór upload plaats voor databases, e-mail en dossiers;
- account-/provideruitval van de off-provider bestemming laat ten minste één tweede herstelroute over;
- periodiek wordt niet alleen login maar ook downloadbaarheid, hash/integriteit en geïsoleerd herstel bewezen;
- verwijdering volgt pas na retentiecontrole en nooit automatisch uit één mislukte synchronisatie.

### Opslagrichtingen

| Richting | Sterkte | Risico/grens | Status |
|---|---|---|---|
| encrypted cloud/object storage bij andere leverancier | apparaat- en provideronafhankelijk; versiebeheer mogelijk | contract, datalocatie, egress, accountrecovery en immutability menselijk toetsen | **RECOMMENDATION; HUMAN VERIFICATION REQUIRED** |
| encrypted removable media, offline bewaard | ransomware-/accountonafhankelijk | verlies, veroudering en één locatie; rotatie en fysieke bewaring nodig | **RECOMMENDATION als extra laag, niet enige kopie** |
| lokale encrypted schijf/NAS | snel herstel | brand, diefstal, ransomware en zelfde locatie | **RECOMMENDATION alleen als tussenlaag** |
| gewone syncmap of primaire laptop | eenvoudig | verwijdering/ransomware synchroniseert mee; geen echte onafhankelijkheid | **NO-GO als enige off-provider laag** |

Er is geen product of betaald plan gekozen. Prijs, btw, looptijd, DPA, datalocatie, versiegeschiedenis, immutability, export/exit en accountrecovery vereisen menselijke verificatie.

---

## 9. Data Sensitivity & Encryption

| Dataklasse | Voorbeelden | Baseline |
|---|---|---|
| Publiek/reproduceerbaar | statische websitebuild, openbare assets | transportversleuteling; hash/manifest; at-rest encryptie volgens opslagplatform |
| Intern bedrijfsvertrouwelijk | docs, factuurmetadata, DNS/configbewijs | versleuteling at rest en in transit; least privilege; geen publieke links |
| Persoons-/sessie-/maildata | Experience DB, WBD dossierexport, mailbox | client-side encryptie vóór off-provider upload; beperkte menselijke toegang; herstelbewijs zonder inhoud |
| Secret/key-materiaal | credentials, recoverycodes, encryptiesleutels | nooit in back-uparchief/register/repository; Bitwarden uitsluitend menselijk; aparte recoveryroute |

Guardrails:

- bestandsnamen bevatten alleen organisatie-ID, capability, UTC-datum en opaque backup-ID; geen klantnaam, deelnemer, onderwerp of e-mailadres;
- versleuteling in transit is aanvullend op, niet vervangend voor, encryptie at rest/client-side encryptie;
- logs bevatten alleen tijd, grootte, hash, status en foutklasse; geen SQL, documentinhoud, mailheader/body of token;
- tijdelijke plaintextkopieën gebruiken een beperkte lokale map, blijven niet in sync/temp/repo achter en krijgen expliciete cleanupbevestiging;
- key loss is een restorefailure: sleutelrecovery wordt apart menselijk getest zonder sleutelwaarden te documenteren;
- toegang wordt per werkelijke rol toegekend; WBD heeft nu één bevoegde beheerder en geen fictieve tweede.

---

## 10. Freshness & Retention

Er is geen universele retentie. Waarde, veranderingssnelheid, wettelijke/contractuele grens, verwijderplicht, opslagkosten en restorecomplexiteit bepalen de keuze.

| Capability | Freshnessvoorstel | Retentierichting | Reden/status |
|---|---|---|---|
| statische site/assets | bij iedere productiecandidate; Git continu | actieve + vorige release; maandelijkse historische mijlpalen alleen indien nodig | **RECOMMENDATION**; reproduceerbaarheid belangrijker dan dagelijkse dump |
| Experience DB | dagelijks en vóór iedere DB-impactrelease | dagelijks kort, wekelijks middellang, maandelijks langer; exacte aantallen menselijk vaststellen | **RECOMMENDATION**; 24-uurs RPO-voorstel uit 002B |
| WBD dossier/documenten | na materiële wijziging en minimaal iedere werkdag bij dagelijks gebruik | versies afgestemd op correctie- en bewaartermijnen | **RECOMMENDATION**; huidige export is handmatig/onversleuteld |
| DNS/config/evidence | vóór en na iedere wijziging; maandelijkse driftcapture | minimaal huidige + vorige geldige toestand en besluitbewijs | **RECOMMENDATION** |
| e-mail | afhankelijk van bedrijfskritiek, voorlopig dagelijks | provider zeven dagen is onvoldoende als enige route; exacte zakelijke/juridische retentie menselijk bepalen | **RECOMMENDATION / UNKNOWN** |
| toekomstige klantdata | vóór onboarding contractueel bepalen | per tenant/datatype, inclusief verwijderplicht | **UNKNOWN / NO-GO vóór besluit** |

Retentiebeëindiging verwijdert eerst sleutel-/kopieverwijzingen volgens een goedgekeurde procedure; zij mag nooit bewijsmateriaal, legal hold of actieve herstelpunten stilzwijgend wissen.

---

## 11. RPO / RTO Model

RPO is maximaal aanvaardbaar dataverlies in tijd. RTO is de gewenste tijd tot bruikbare capability. Onderstaande waarden zijn **RECOMMENDATIONS**, geen contractuele SLA's.

| Capability | Voorlopige RPO | Voorlopige RTO | Huidig bewijs |
|---|---:|---:|---|
| publieke website/code | immutable release; data max. 24 uur waar van toepassing | 4 uur | rollback gedocumenteerd; actuele off-provider kopie onbekend |
| Experience-app/code | immutable release | 4 uur | versioned rollback gedocumenteerd |
| Experience-database | 24 uur plus pre-change herstelpunt | 4 uur technisch doel, 1 werkdag bedrijfsdoel bij complexe datareconciliatie | één restore in 17,06 minuten bewezen; geen productie-SLA |
| DNS/configuratie | nul wijzigingen sinds laatste goedgekeurde export | 4 uur | export bestaat; actualiteit niet opnieuw live gecontroleerd |
| Atlas/Workspace tracked bron/docs | laatste gepushte commit | 8 uur | Git dekt alleen tracked materiaal |
| WBD dossier/non-tracked docs | 1 werkdag | 1 werkdag | exportfunctie bestaat; off-provider werkelijkheid onbekend |
| e-mail | 24 uur voorlopig | 8 uur voorlopig | providerretentie bekend; onafhankelijke restore onbekend |
| toekomstige klantdata | `UNKNOWN` | `UNKNOWN` | vóór contract/onboarding besluiten |

Een capability krijgt pas status `rpo_met` wanneer een verse succesvolle én integere back-up binnen de grens bestaat. `rto_proven` vereist een representatieve restoremeting inclusief toegang, voorbereiding, herstel, validatie en overdracht—niet alleen importtijd.

---

## 12. Restore Test Policy

### Cadans

- Experience/database: per kwartaal, na wijziging van backupmethode/encryptie/provider of materiële datamodelwijziging;
- WBD dossier: halfjaarlijks en na schema-/importwijziging, uitsluitend met veilige testdata of expliciet goedgekeurde geïsoleerde kopie;
- public site/release: jaarlijks plus na wijziging van build/deployopslag;
- DNS/config: jaarlijks tabletop en na formaat/providerwijziging;
- e-mail: minimaal jaarlijks zodra een onafhankelijke route is gekozen;
- toekomstige hoogrisico-/klantdata: contractueel en risicogestuurd, minimaal kwartaal als herstel kritisch is.

### Geldig restorebewijs

1. exact testobject en hash/integriteit vóór test;
2. tijdelijke geïsoleerde omgeving zonder productieverbinding of productiecredential;
3. vooraf vastgelegde volledigheids-, integriteits- en functionele checks;
4. gemeten totale herstelduur en geobserveerd dataverlies;
5. uitslag `PASS`, `PARTIAL` of `FAIL` met blockers;
6. bevestigde cleanup van plaintext, runtime, logs en tijdelijke database;
7. bronobject na afloop aanwezig/ongewijzigd of gecontroleerd vernietigd volgens plan;
8. reviewer en volgende vervaldatum.

De template staat in `backup/RESTORE-EVIDENCE-TEMPLATE.md`. Een mislukte test wordt niet “gerepareerd” door criteria te verlagen; eerst oorzaak, impact en nieuwe test vastleggen.

---

## 13. Release & Database Change Integration

| DB-impactclass | Backup/off-provider eis vóór GO | Restore/rollbackbewijs | Human GO |
|---|---|---|---|
| `NONE` | geen nieuwe DB-back-up door de release; bevestig geldige code-rollback en registreer N/A | geen DB-restore; vorige release-identiteit | productie-GO blijft verplicht |
| `ADDITIVE_COMPATIBLE` | verse consistente DB-back-up, hash en off-provider kopiestatus; vorige appcompatibiliteit | import-/schema-check volgens risico | expliciete migratie-GO |
| `BEHAVIORAL` | alles hierboven plus tabel-/constraintnulmeting en data-impactplan | geïsoleerde rehearsal of gemotiveerde blocker; writes sinds migratie behandelen | afzonderlijke DB-GO |
| `DESTRUCTIVE_OR_IRREVERSIBLE` | herstelbare pre-migratieback-up én versleutelde off-provider kopie vereist; completion/hash bevestigd | volledige rehearsal, tijdmeting, forward-/restoreplan; code-only rollback verboden | afzonderlijke expliciete destructieve GO |

Voor iedere class worden backup-ID, freshness, hashstatus, storage category, evidence reference en cleanupplan in release-evidence opgenomen. Een `UNKNOWN` impact wordt behandeld als `DESTRUCTIVE_OR_IRREVERSIBLE`. Een pakketrestore is nooit de standaard deployrollback.

---

## 14. Backup Attention Model

| Niveau | Trigger | Menselijke betekenis |
|---|---|---|
| `INFO` | verse back-up, geslaagde integriteitscheck, geplande test of stabiel herstel | historie; gezonde toestand blijft stil |
| `ATTENTION` | freshness overschreden, integriteitscheck ontbreekt, restore bijna/verlopen, off-provider status onbekend, één backupjob mislukt | onderzoek binnen normale werktijd |
| `URGENT` | restoretest mislukt voor kritieke datarelease, geen bruikbare onafhankelijke kopie, twee opeenvolgende corrupte herstelpunten, sleutel/account niet herstelbaar, provider én enige kopie onbereikbaar | herstelbescherming direct onvoldoende |

Deduplicatiesleutel: `organisation_id + environment + service_capability + signal_type`, nooit per bestand. Eén capability heeft maximaal één open incident per fouttype. Een incident sluit pas wanneer een nieuwe geldige meting de oorspronkelijke fout opheft; na restorefailure is alleen een geslaagde nieuwe restoretest voldoende. Geen reminders vaker dan eenmaal per 60 minuten. Geen groene notificatieruis.

002C.4 bouwt geen heartbeat, monitor, scheduler of notificatie. Iedere toekomstige bron moet eerst een secretvrij, aantoonbaar signaal leveren; “job draaide” is niet hetzelfde als “back-up bruikbaar”.

---

## 15. Atlas / Workspace Future Integration

```text
BACKUP SOURCE / REGISTER
          ↓
PROVIDER-NEUTRAL NORMALIZER
          ↓
RECOVERY OBSERVATION
          ↓
ATLAS INTERPRETATION
          ↓
WORKSPACE ATTENTION / TRUST STATUS
```

De normalizer levert afzonderlijk:

- `present`: bestaat een bewijsbaar herstelobject;
- `fresh`: valt het binnen de capability-RPO;
- `integrity_checked`: is hash/structuur gecontroleerd;
- `restore_proven`: is representatief herstel geldig en niet verlopen;
- `overdue`: welke verplichting is overschreden;
- `provider_dependence`: welke failure domain bron en kopie delen;
- `human_action_required`: welke concrete keuze/handeling nodig is.

Atlas combineert deze signalen met organisatie-, release- en risicocontext. Workspace toont alleen relevante aandacht en kan nooit uit alleen providerstatus de claim “herstelbaar” afleiden. Events bevatten geen bestandsinhoud, filenames met persoonsgegevens, opslagcredentials of sleutelmetadata. De connector/normalizer wordt in 002C.4 niet gebouwd.

---

## 16. Human Responsibilities

WBD heeft één werkelijke bevoegde beheerder. Deze persoon:

- bepaalt zakelijke RPO/RTO en retentie;
- kiest off-provider leverancier/medium, contract, kosten en datalocatie;
- maakt account en onafhankelijke recoveryroute aan;
- kiest client-side encryptiemethode en bewaart sleutel/recovery uitsluitend in menselijk Bitwardenbeheer;
- autoriseert iedere productie-export, gevoelige kopie en restore;
- bevestigt periodiek dat toegang zonder primaire TransIP-mailbox en zonder enige laptop mogelijk is;
- beoordeelt testbewijs, privacy, verwijderplicht en incidentactie;
- wijst pas een tweede beheerder toe wanneer die rol werkelijk bestaat.

### Human Action Checklist — latere off-provider activatie

1. Kies één onafhankelijke bestemming en één aanvullend offline/lokaal scenario.
2. Verifieer prijs, btw, looptijd, DPA, datalocatie, versiebeheer, export/exit en verwijdering.
3. Maak het account zelf aan met uniek wachtwoord, 2FA en onafhankelijk recoverykanaal.
4. Kies encryptiemethode en test sleutelrecovery zonder sleutelwaarden te delen.
5. Stel per capability RPO, retentie en owner vast.
6. Geef exact `GO OFF-PROVIDER COPY <capability> <backup-id>`.
7. Voer export/versleuteling/kopie onder menselijke controle uit; Codex krijgt geen inhoud of sleutel.
8. Leg secretvrij grootte, hashstatus, tijd, storage category en bewijsreferentie vast.
9. Geef apart GO voor een geïsoleerde restoretest.
10. Markeer de entry pas `operational` na geslaagde integrity- én restorechecks.

---

## 17. Provider / Disaster Scenarios

| Scenario | Vereiste route | Huidige status |
|---|---|---|
| TransIP down | off-provider encrypted kopie + release/Git + onafhankelijke communicatie | **UNKNOWN / NO-GO** |
| TransIP-account inaccessible | off-provider account en herstelrunbook zonder primaire mailbox | recoverykanaal account **DOCUMENTED**, datakopie **UNKNOWN** |
| primaire mailbox unavailable | independent recovery/contact en geen mailafhankelijke sleutel | **DOCUMENTED BUT NOT VERIFIED** |
| database corrupt | gerichte integere DB-back-up, write-freeze, isolated verify, restore-GO | één historisch testobject **VERIFIED** |
| bad deploy | vorige immutable release; DB apart volgens impactclass | **DOCUMENTED BUT NOT VERIFIED** |
| accidental delete | versioned provider/off-provider herstelpunt vóór verwijdering | providerroute gedocumenteerd; off-provider **UNKNOWN** |
| lokaal device lost | remote encrypted kopie + account/key recovery op vervangend device | **UNKNOWN** |
| off-provider account down | providerback-up + tweede offline/andere failure-domain kopie | **UNKNOWN** |
| één corrupt backupbestand | vorige retentieversie + hash/integriteitscheck + nieuwe export | beleid **RECOMMENDATION**, werkelijkheid **UNKNOWN** |

Geen enkel scenario mag afhankelijk zijn van één bestand, één device, één mailbox en één provider tegelijk.

---

## 18. Repository Guardrails

### Toegevoegd

- dit canonieke 002C.4-document;
- `backup/BACKUP-REGISTER.schema.json`;
- `backup/BACKUP-REGISTER.example.json`;
- `backup/RESTORE-EVIDENCE-TEMPLATE.md`;
- indexverwijzing in `docs/atlas/README.md`.

### Harde repositorygrens

- geen productieback-up, dump, mailboxexport, dossierexport of encrypted payload committen;
- geen private opslagpaden, downloadlinks, tokens, keys, recoverycodes of Bitwardenmetadata;
- schema/voorbeeld bevatten alleen fictieve IDs en secretvrije bewijsreferenties;
- hashes horen in gecontroleerd privaat operationeel bewijs wanneer zij gevoelige bestandsidentiteit onthullen; het register mag `verified` noemen zonder hashwaarde;
- `.gitignore` blijft leidend voor dumps, secrets en tijdelijke runtime;
- repositoryautomatisering mag geen externe storage write of restore starten.

---

## 19. Deferred Items

- keuze/aankoop/configuratie van off-provider opslag;
- export, encryptie, upload, retentiejob en immutability;
- actuele providerconsole- en mailboxbackupcontrole;
- nieuwe restoretests;
- backupheartbeat en integratie met 002C.3-monitoring;
- Atlas connector/normalizer en Workspace-interface;
- klant-/tenant-specifieke contractretentie;
- formele e-mailarchivering;
- tweede beheerder/break-glassprocedure;
- Project 002C.5 en latere infrastructuurprojecten.

---

## 20. Open Questions

1. Welke zakelijke RPO/RTO accepteert de eigenaar definitief per capability?
2. Welke onafhankelijke leverancier/locatie voldoet aan kosten, DPA, datalocatie, versiebeheer en exit?
3. Welke client-side encryptiemethode is op een vervangend device herstelbaar?
4. Hoe worden sleutelrecovery en accountrecovery onafhankelijk van TransIP-mail bewezen?
5. Welke e-mail en WBD-dossierdata moeten juridisch/zakelijk hoe lang worden bewaard of verwijderd?
6. Is per actuele mailbox de provider-selfserviceback-up beschikbaar?
7. Welke providerback-ups bevatten geen stored procedures/custom functions en zijn die relevant voor WBD?
8. Wanneer wordt een actuele file + DB pair voor public/Experience geïsoleerd getest?
9. Welke toekomstige organisatie krijgt een eigen tenant-aware backup- en deletebeleid vóór data-onboarding?
10. Welke backupmetadata mag later naar Atlas zonder klant- of infrastructuurinformatie onnodig te onthullen?

---

## 21. GO / NO-GO Recommendation

### Project 002C.4

**GO.** De huidige staat, bewezen recovery, classificatie, registervelden, off-provider criteria, data-/encryptiegrenzen, risk-based freshness/retentie, RPO/RTO, restorebeleid, release-integratie, attentionmodel, Atlas-contract, menselijke rollen en disasterscenario's zijn vastgelegd. De generieke repositoryguardrails zijn gereed.

### Operationele off-provider recovery

**NO-GO** zolang opslag/product, contract/DPA, onafhankelijke accountrecovery, encryptie- en sleutelrecovery, definitieve RPO/retentie, expliciete kopie-GO en een geslaagde integriteits-/restoretest ontbreken.

### Expliciete afsluiting

Er is geen back-up gedownload, geopend, verwijderd, verplaatst, geüpload of hersteld. Er is geen database-inhoud of persoonsgegeven ingezien. Er is geen storageaccount, abonnement, scheduler, monitor of integratie gemaakt. Er is niets gewijzigd aan productie, DNS, hosting, databases, SSL, Cloudflare, accounts, rechten, providerschedules of retentie. Er zijn geen secrets, private keys, `.env`-waarden, recoverycodes, encryptiesleutels of Bitwarden-inhoud gelezen of gerapporteerd. Credits/facturatie zijn niet zichtbaar.

Project 002C.5 is niet gestart. Start een volgend project pas na menselijke beoordeling en afzonderlijke expliciete GO.

### Bronnen

- TransIP — <https://www.transip.nl/knowledgebase/5912-back-ups-op-webhostingpakketten>
- TransIP — <https://www.transip.nl/knowledgebase/5939-handmatig-back-up-maken-database-webhostingpakket>
- TransIP — <https://www.transip.nl/knowledgebase/email-algemeen/e-mail-back-ups-via-het-controlepaneel-opvragen>

