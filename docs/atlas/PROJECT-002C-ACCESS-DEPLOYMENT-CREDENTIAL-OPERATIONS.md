# Project 002C.6 — Access & Deployment Credential Operations Baseline

Status: **DOCUMENTED BUT NOT VERIFIED**  
Datum: 2026-08-07  
Eigenaar: We Build & Design (WBD)  
Karakter: read-only governancebaseline; geen activatie, login of productiewijziging

## 1. Executive Summary

Deze baseline maakt toegang bestuurbaar zonder toegang zelf te activeren. De vaste keten is:

`HUMAN AUTHORITY → EXPLICIT TASK / GO → MINIMUM ACCESS → CONTROLLED ACTION → VALIDATION / EVIDENCE → ACCESS EXPIRES / IS REMOVED`

De actuele inrichting steunt op één werkelijk bevoegde menselijke TransIP-accountbeheerder. Dat is voor de huidige eenpersoonsorganisatie een verdedigbare werkelijkheid, maar geen reden om een fictieve tweede beheerder, gedeeld account of permanente Codex-/CI-identiteit te creëren.

De aanbevolen korte-termijnstrategie is: Codex bereidt lokaal build, controles en bewijs voor; de bevoegde mens geeft per productiehandeling GO en voert control-panelhandelingen uit. Alleen wanneer geautomatiseerde bestandsoverdracht noodzakelijk is, kan later na aparte GO een tijdelijke taakgebonden SSH-public key worden toegevoegd. De bewezen providergrens is daarbij het hele hostingpakket, niet een fijnmazig deploypad. Na validatie vervalt of verdwijnt alle tijdelijke toegang.

**GO** voor het vastleggen en menselijk verifiëren van deze baseline. **NO-GO** voor feitelijke account-, credential-, rechten-, provider- of productiewijzigingen binnen 002C.6.

## 2. Scope

Binnen scope zijn toegang tot TransIP, hosting, SFTP/SSH, databases, DNS, mail, SSL, deployment, Git, toekomstige monitoring/Cloudflare/off-provider backup en Workspace/Atlas-beheer; human authority; machineaccounts; least privilege; lifecycle; recovery; break-glass; een secretvrij register; autorisatiebewijs; Human Action-checklists; en een veilige repositoryreview.

Buiten scope zijn alle logins op TransIP, Bitwarden, FTP/SFTP/SSH, database of mail; het maken, lezen, wijzigen, roteren of intrekken van credentials/accounts/rechten; provider-API-gebruik; deployments; productie-, DNS-, hosting-, database-, SSL-, Cloudflare-, monitoring- of backupwijzigingen; UI-werk; en Project 002C.7.

## 3. Evidence Reviewed

Lokale canonieke bronnen:

- `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`;
- `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md`;
- `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`;
- `PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md`;
- `PROJECT-002C-EXTERNAL-MONITORING-BASELINE.md`;
- `PROJECT-002C-BACKUP-OFF-PROVIDER-RECOVERY-BASELINE.md`;
- `PROJECT-002C-DNS-CANONICAL-MAIL-AUTH-HYGIENE.md`;
- `RELEASES/RELEASE-EVIDENCE-TEMPLATE.md` en bestaand productie-/deploybewijs.

Actuele officiële TransIP-documentatie is gebruikt voor providergrenzen rond extra gebruikers, SFTP/SSH en API-toegang. Lokale bewijzen blijven bepalend voor wat bij WBD daadwerkelijk is aangetoond.

Officiële providerbronnen:

- [Extra gebruikers en accounttoegang](https://www.transip.nl/knowledgebase/389-extra-gebruikers-aanmaken-account-transip);
- [SSH op webhostingpakketten](https://www.transip.nl/knowledgebase/6191-ssh-op-webhostingpakketten/);
- [Bestanden uploaden/downloaden via SFTP](https://www.transip.nl/knowledgebase/5894-bestanden-mappen-website-uploaden-downloaden/);
- [TransIP REST API gebruiken](https://www.transip.nl/knowledgebase/77-de-transip-rest-api-gebruiken).

Labels: **VERIFIED**, **DOCUMENTED BUT NOT VERIFIED**, **UNKNOWN**, **RECOMMENDATION**, **CONFLICT** en **HUMAN VERIFICATION REQUIRED**.

## 4. Current Access Surface

| Capability | Organisatie / omgeving | Accountklasse | Huidige status | Productie-impact | Bewijsstatus |
|---|---|---|---|---|---|
| TransIP-account/control-panel | WBD / productie-gedeeld | één menselijke full-account login | bestaand | kritiek/accountbreed | VERIFIED structuur |
| Webhosting Pro | WBD / productie | control-panel + hostingtoegang | bestaand | kritiek | DOCUMENTED BUT NOT VERIFIED |
| SFTP/SSH | WBD / productie-hostingpakket | hostingcredential/public-key-optie | ingeschakeld; geen persistente deploykey bewezen | hoog/pakketbreed | DOCUMENTED BUT NOT VERIFIED |
| Database runtime | WBD / productie | app-credential in private providerconfig | bestaand; waarde niet gelezen | kritiek | DOCUMENTED BUT NOT VERIFIED |
| Databasebeheer | WBD / productie | control-panel/phpMyAdmin/mogelijke DB-users | exacte users/rechten onbekend | kritiek | UNKNOWN |
| DNS/domeinen | WBD en Fara / productie | TransIP control-plane | bestaand | kritiek | DOCUMENTED BUT NOT VERIFIED |
| Mailboxbeheer | WBD en Fara / productie | TransIP control-plane | bestaand | hoog | DOCUMENTED BUT NOT VERIFIED |
| SSL | WBD en Fara / productie | provider/control-plane | bestaand | hoog | DOCUMENTED BUT NOT VERIFIED |
| Git-repository | WBD / ontwikkeling | menselijke Git-identiteit | bestaand | indirect hoog | DOCUMENTED BUT NOT VERIFIED |
| CI/CD | WBD | machine/service account | niet aangetoond | n.v.t. | VERIFIED: geen workflows aangetroffen |
| Externe monitoring | WBD / toekomstig | provider-/serviceaccount | niet geactiveerd | observerend | VERIFIED vanuit 002C.3 |
| Cloudflare | WBD / toekomstig | provideraccount/API | niet geconfigureerd | potentieel kritiek | VERIFIED vanuit 002C.1/002C.5 |
| Off-provider backup | WBD / toekomstig | opslag-/serviceaccount | niet geselecteerd/geactiveerd | herstelkritiek | VERIFIED vanuit 002C.4 |
| Workspace/Atlas admin | WBD / lokaal-intern | applicatiebeheer | geen productie-adminmodel | geen providerrecht | DOCUMENTED BUT NOT VERIFIED |

Niet bewezen en dus niet aannemen: houders van de SFTP/SSH-credential, DB-users/rechten, Git-recovery/2FA, Bitwarden-recovery, mailbox-adminroutes, fijnmazige hostingpadrechten en een operationele off-provider herstelidentiteit.

## 5. Human Authority Model

`AUTHORITY`, `ACCESS` en `EXECUTION` zijn afzonderlijke feiten:

- **Authority**: de mens die voor organisatie, omgeving en capability mag goedkeuren.
- **Access**: het technische middel waarmee de goedgekeurde handeling kan worden uitgevoerd.
- **Execution**: de mens of machine die precies de goedgekeurde handeling uitvoert.

Er is één werkelijke WBD-eigenaar als bevoegde TransIP-accountbeheerder. De historische accountnaam verandert dit zakelijke eigenaarschap niet. Een tweede beheerder wordt niet gefingeerd; die rol ontstaat pas na echte aanwijzing, instructie en registratie. Sportpaleis is founding partner/casecontext, nooit infrastructuurfundament. Fara-specifieke autoriteit is nog **UNKNOWN** en iedere Fara-actie vereist vooraf menselijke governance.

Een GO bevat minimaal taak, organisatie, omgeving, capability, doel, impact, tijdvenster en bevoegde autorisator. Algemene toestemming of een eerdere login is geen GO voor een nieuwe handeling.

## 6. Bitwarden Boundary

Bitwarden is de menselijk beheerde centrale opslagklasse voor wachtwoorden, recoverycodes, private keys, providercredentials, gevoelige tokens en herstelgegevens.

- Codex opent, leest of inventariseert Bitwarden niet.
- Codex vraagt nooit om volledige secrets, private keys, recoverycodes of mailboxinhoud.
- Het register noemt alleen `human_bitwarden`, nooit gevoelige itemnamen of inhoud.
- Een mens voert geheimen rechtstreeks in de bedoelde vertrouwde interface in.
- Veilig bewijs is alleen status, datum, niet-geheime fingerprint of providerbevestiging.

Bitwarden-recovery blijft **UNKNOWN** tot een bevoegde mens uitsluitend status en veilige evidence bevestigt.

## 7. Codex Access Model

Standaard toegestaan: repositoryanalyse, lokale tests/builds, publieke read-only endpoint-/header-/certificaat-/DNS-controles, documentatie, generieke scripts en secretvrij bewijs.

Niet standaard toegestaan: productiecredentials ontvangen/gebruiken; provider-, Bitwarden-, hosting-, SFTP/SSH-, DB- of maillogin; provider-API; deployment; of account-, rechten-, DNS-, DB-, mail-, SSL-, monitoring-, backup- en Cloudflarehandelingen. Secrets komen nooit in prompts, logs, broncode, artefacten of evidence.

Toekomstige externe uitvoering vereist expliciete taak, Human GO, minimale toegang, gecontroleerde actie, validatie/evidence en verval/intrekking. Codex bezit geen blijvend infrastructuurrecht.

## 8. Deployment Credential Model

Huidige werkelijkheid: releases waren handmatig en bewijsgericht; SFTP/SSH is beschikbaar; een providercredential bestaat maar is niet gelezen; huidige houders zijn onbekend; eerdere tijdelijke SSH-public keys en lokale private-keyrestanten zijn verwijderd; een persistente machine-deploykey is niet bewezen.

Aanbevolen strategie:

1. Codex maakt lokaal een reproduceerbare build met hash, manifest, controles en rollbackinstructie.
2. De mens keurt release, target en benodigde capabilities goed.
3. Control-panelhandelingen worden door de mens uitgevoerd.
4. Alleen voor noodzakelijke geautomatiseerde overdracht kan per taak een tijdelijke SSH-public key worden toegevoegd aan het bedoelde hostingpakket.
5. De private key blijft in een tijdelijk beperkt lokaal pad, nooit in Git/evidence/chat, en wordt na de taak verwijderd.
6. De remote public key wordt direct na live-validatie of afbreken verwijderd; control-panelbewijs is leidend.
7. Databasehandeling krijgt een aparte GO en geldige pre-change backup/rollbackroute.

SFTP en SSH delen de hostingtoegangsgegevens en de bewezen grens is het gehele hostingpakket. Padbeperkte, upload-only of volledig deploy-only toegang is niet bewezen en wordt niet als bestaand gepresenteerd.

Permanent CI/CD-account, TransIP API-token of permanente Codex-key is **DEFERRED** totdat frequentie, teamomvang en provider-scoping dit rechtvaardigen.

## 9. Least Privilege

- Eén capability, organisatie en omgeving per autorisatie.
- Kortst haalbare levensduur; read-only waar schrijven niet nodig is.
- Runtime-DB-credential niet voor beheer hergebruiken als een aparte route beschikbaar is.
- Geen accountbreed machine-control-panelrecht zolang een mens de zeldzame handeling kan uitvoeren.
- Geen secret in broncode, build, log, issue, evidence of register.
- Toegang vervalt of wordt aantoonbaar ingetrokken na de taak.

Providerbeperkingen:

- TransIP biedt momenteel geen extra control-panelgebruikers; de login heeft accountbrede toegang.
- SFTP/SSH kan private websiteconfiguratie en daardoor databasegegevens bereikbaar maken.
- SFTP en SSH gebruiken dezelfde hostingtoegangsgegevens; public-key-auth voorkomt wachtwoorddeling, maar bewijst geen kleinere pakketgrens.
- Het control-panel blijft nodig voor DocumentRoot- en accountbrede beheeracties.
- De API kan technisch verlopen, IP-beperkt en read-only zijn, maar staat voor WBD uit en is geen korte-termijnaanbeveling.

## 10. Organisation Isolation

Elke registerregel krijgt `organisation_id` en `environment`. WBD-, Sportpaleis- en Fara-capabilities worden niet samengevoegd omdat ze technisch een provideraccount delen. Gedeelde blast radius is een beperking, nooit organisatieoverschrijdende toestemming. Fara-eigenaarschap blijft **UNKNOWN**. Customer workspaces krijgen uitsluitend rechten binnen hun eigen applicatie-/organisatiecontext.

## 11. Machine / Service Accounts

Een machineaccount is alleen verantwoord met één capability, minimale afdwingbare rechten, één menselijke eigenaar, één organisatie, individuele intrekbaarheid, traceerbaarheid en vooraf bepaalde review/verval. Het mag geen gedeelde menselijke identiteit nabootsen.

Huidige beslissing: geen serviceaccount creëren. Monitoring, off-provider backup, CI/CD en toekomstige integraties blijven voorgesteld/deferred tot capability, eigenaar en providergrens helder zijn.

## 12. Credential Lifecycle

`CREATE / AUTHORISE → STORE → USE → REVIEW → ROTATE IF REQUIRED → REVOKE`

| Fase | Minimumeis | Secretvrij bewijs |
|---|---|---|
| Create/Authorise | capability, eigenaar, scope, duur, GO | referentie en tijd |
| Store | Bitwarden of machine-secretstore met eigenaar | alleen opslagklasse |
| Use | alleen binnen taak/tijdvenster | uitvoerder, doel, resultaat |
| Review | noodzaak en rechten herbeoordelen | reviewdatum/status |
| Rotate if required | triggergericht | reden en voltooiingsstatus |
| Revoke | na tijdelijke taak/einde noodzaak | providerbevestiging/status |

Rotatietriggers: vermoed compromis, vertrek/rolwijziging, lek naar bron/log/evidence, providereis, privilegewijziging, onduidelijk eigenaarschap of risicoreview. Periodieke review is verplicht; betekenisloze kalenderrotatie niet.

## 13. Recovery Access

| Herstelroute | Status | Gat/afhankelijkheid |
|---|---|---|
| TransIP account recovery/2FA/device-loss | eerder menselijk bevestigd | niet opnieuw gevalideerd; providerafhankelijk |
| Bitwarden recovery | UNKNOWN | human-only verificatie |
| Git recovery/2FA | UNKNOWN | human-only verificatie |
| Hosting SFTP/SSH recovery | DOCUMENTED BUT NOT VERIFIED | zelfde control-plane |
| DB-beheer/runtimeconfig | DOCUMENTED BUT NOT VERIFIED | users/rechten onbekend |
| Domein/DNS/mail recovery | DOCUMENTED BUT NOT VERIFIED | geconcentreerd in TransIP |
| Off-provider backup access | niet operationeel | provider/account nog te kiezen |
| Tweede menselijke route | niet bestaand | toekomstige keuze, niet fingeren |

002B en 002C.4 blijven canoniek. Deze opdracht test geen route en leest geen codes.

## 14. Break-glass Model

Break-glass is conceptueel en niet geactiveerd. Alleen bij kritieke storing of herstelnoodzaak wanneer de primaire route ontbreekt:

1. Leg incident, organisatie, capability en reden vast.
2. Laat actuele eigenaar of later werkelijk aangewezen tweede autoriteit goedkeuren.
3. Gebruik de smalste bestaande route; creëer geen permanent gedeeld noodaccount.
4. Deel geen secret met Codex; de mens voert direct in.
5. Registreer handeling, resultaat en impact.
6. Trek tijdelijke toegang in en roteer bij exposure/onzekerheid.
7. Doe post-incidentreview en koppel aan 002B/002C.4.

## 15. Access Register

De definitie staat in `access/ACCESS-REGISTER.schema.json`; een volledig fictief secretvrij voorbeeld in `access/ACCESS-REGISTER.example.json`.

Verplicht: `access_id`, `organisation_id`, `environment`, `capability`, `system_provider`, `account_class`, `human_or_machine`, `owner`, `privilege_scope`, `authentication_method_class`, `secret_location_class`, `production_impact`, `recovery_route_status`, `last_reviewed`, `rotation_trigger`, `status`, `evidence_reference`, `notes`, plus `authority_role`, `execution_boundary`, `expires_at`, `revocation_status` en `provider_constraint`.

Het register bevat nooit secretwaarden, volledige usernames, private sleuteldata, recoverycodes of mailboxinhoud. `last_reviewed` en `expires_at` mogen alleen `null` zijn als onbekend/niet van toepassing aantoonbaar is.

## 16. Deployment Authorisation Evidence

`RELEASES/RELEASE-EVIDENCE-TEMPLATE.md` blijft de enige releasebewijsstructuur. Iedere productie-uitvoering koppelt daar release-ID/target, organisatie/omgeving/capability, Human GO/autorisator, access class zonder identifier/secret, start/eindtijd, resultaat/impact, live-validatie, rollback en verval/intrekking. Upload, database en DocumentRoot krijgen afzonderlijke GO-regels in hetzelfde bewijs.

## 17. Audit / Traceability

Minimumaudit: wie autoriseerde; welke capability/organisatie/omgeving; welk doel; wanneer/hoe lang; verwachte/werkelijke impact; uitvoerder; resultaat/bewijs; en of toegang nog nodig is. Secretvrije auditdata mag in Git; credentials, keymaterialen, cookies en gevoelige provider-/mail-/DB-inhoud niet.

## 18. Atlas / Workspace Future Integration

`ACCESS REGISTER → NORMALIZER → SECURITY / GOVERNANCE OBSERVATION → ATLAS INTERPRETATION → WORKSPACE TRUST / ATTENTION`

Gezond blijft stil. Atlas toont alleen governancefeiten zoals verlopen review, onbekende eigenaar, brede scope of onbevestigde revocatie; nooit secrets, vault-itemnamen, keydata of recoverycodes. Observaties mogen geen provideractie/rotatie/rechtenwijziging starten, alleen menselijke attention.

## 19. Customer Workspace Permission Boundary

Applicatierechten zijn geen infrastructuurrechten. Een customer workspace admin krijgt niet automatisch TransIP-, hosting-, DNS-, mail-, DB-, SSL-, deployment-, Atlas-infra-, Bitwarden-, backup-, monitoring- of andere-organisatietoegang. Iedere toekomstige mapping is standaard verboden tenzij apart ontworpen, beoordeeld en goedgekeurd.

## 20. Human Action Checklists

De sjablonen staan in `access/HUMAN-ACTION-CHECKLIST-TEMPLATE.md`; periodieke review in `access/CREDENTIAL-REVIEW-CHECKLIST.md`. Zij bevatten `PROVIDER LOGIN REQUIRED`, `CREDENTIAL CREATION REQUIRED`, `CREDENTIAL ROTATION REQUIRED`, `RECOVERY VERIFICATION REQUIRED` en `PRODUCTION ACCESS REQUIRED`, telkens met reden, systeem/capability, menschecks, wat nooit te delen, veilige evidence en hervatcriterium.

## 21. Security Review

Read-only repositoryreview op 2026-08-07, met bekende secretbestanden, `.env`, tijdelijke deploymappen, dependencies en gegenereerde output uitgesloten:

- **PASS** geen private-key header;
- **PASS** geen high-confidence AWS/GitHub/Slack/Stripe/Google/OpenAI-tokenpatroon;
- **PASS** geen credential-in-URI patroon;
- **PASS** geen tracked secretachtig bestand;
- **PASS** geen tracked-and-ignored bestand.

Beperking: geen volledige historische secretscan. Legacy secretnotities en `.env`-inhoud zijn bewust niet geopend. Eerdere brede 002B-scan vond geen high-confidence tracked secrets; de historyscan was niet voltooid. Geen nieuwe `SECURITY ATTENTION`, maar geen claim dat elke historische byte secretvrij is.

## 22. Repository Guardrails

- `.env*`, private keys, credentials, recoverycodes, vaultexports en geheime providerconfig blijven buiten Git.
- Voorbeelden gebruiken placeholders, nooit productieachtige waarden.
- Evidence bevat alleen access class, autorisatie, resultaat en revocatiestatus.
- Scripts printen secrets niet; logs worden gecontroleerd op headers, querystrings, identifiers en persoonsgegevens.
- Bij mogelijke secretvondst: stop; noteer alleen pad/klasse; label `SECURITY ATTENTION`; vraag Human GO voor remediatie; roteer alleen bij aantoonbare exposure.
- Geen generieke IAM-, vault-, broker- of CI-infrastructuur zonder concrete requirements.

## 23. Proposed Operational Sequence

Onderstaande stappen zijn niet uitgevoerd.

### 002C.6A — Human access inventory verification

- Doel: per capability eigenaar, gebruiker, 2FA/recovery en noodzaak bevestigen.
- Risico/impact: read-only control-panelinzage; gevoelige metadata.
- Human action/GO: mens logt na aparte GO zelf in en deelt alleen veilige status.
- Revoke/evidence: wijzigingen alleen met nieuwe GO; registerdatum en referentie.

### 002C.6B — Deployment access scope decision

- Doel: menselijk uploaden versus tijdelijke key bepalen.
- Risico/impact: pakketbrede filesystemtoegang.
- Human action/GO: accepteer providerblast-radius vóór credentialvoorstel.
- Revoke/evidence: verwijderroute vooraf bepalen; besluit/scope/duur vastleggen.

### 002C.6C — Restricted deployment credential setup

- Doel: alleen bij noodzaak tijdelijke taaktoegang.
- Risico/impact: hoog en pakketbreed, niet bewezen padbeperkt.
- Human action/GO: public key toevoegen/fingerprint/eindtijd; aparte GO's voor create/use/productie.
- Revoke/evidence: remote en local key direct verwijderen; fingerprint/tijden/providerstatus, geen keydata.

### 002C.6D — Recovery access verification

- Doel: TransIP-, Bitwarden-, Git- en deploymentrecovery human-only bevestigen.
- Risico/impact: zeer gevoelig; geen recovery uitvoeren.
- Human action/GO: aparte GO voor login; geen codes/secrets delen.
- Revoke/evidence: tijdelijke route sluiten; alleen status/datum/eigenaar.

### 002C.6E — Access register activation

- Doel: fictief voorbeeld vervangen door bevestigde secretvrije records.
- Risico/impact: geen directe productie-impact; gevoelige metadata.
- Human action/GO: eigenaar/scope accorderen; GO voor niet-publieke metadata.
- Revoke/evidence: feitelijke intrekking apart autoriseren; gereviewde revision.

### 002C.6F — Final access baseline validation

- Doel: minimale, traceerbare, gesloten toegang aantonen.
- Risico/impact: read-only tenzij open toegang moet worden ingetrokken.
- Human action/GO: providerstatus/recovery bevestigen; aparte GO voor wijziging.
- Revoke/evidence: alle taaktoegang gesloten; eindreview/releasebewijs/gaps.

## 24. Deferred Items

TransIP-/Bitwardeninventarisatie; SFTP/SSH-/DB-/mail-/Git-rechtenverificatie; tijdelijke deploymenttoegang; CI/serviceaccounts; API/Cloudflare/monitoring/off-provider accounts; Bitwarden-/Git-recovery; tweede beheerder; Fara-eigenaarschap; volledige Git-history secretscan; alle productiewijzigingen/tests; en Project 002C.7.

## 25. Open Questions

1. Wie gebruikt de hosting-SFTP/SSH-credential nog en waarom?
2. Welke DB-users/rechten/herstelroute bestaan?
3. Volstaat menselijk uploaden of rechtvaardigt frequentie tijdelijke machine-uitvoering?
4. Biedt de provider een aantoonbaar kleinere capability dan pakketbreed?
5. Wat is de human-only Bitwarden- en Git-recoverystatus?
6. Wie is bevoegd voor Fara-specifieke infrastructuur?
7. Wanneer rechtvaardigt groei een echte tweede menselijke autoriteit?
8. Welke off-provider opslag/eigenaar wordt via 002C.4 geactiveerd?

## 26. GO / NO-GO Recommendation

**GO** voor deze documentatie, schema, fictieve voorbeelden/checklists, 002C.6A als aparte human-led read-only verificatie na GO en bestaand releasebewijs als canonieke deploymentaudit.

**NO-GO** voor feitelijke access changes; permanente Codex-/CI-/gedeelde infrastructuuraccounts; secretdeling/opslag in Git; provider-/deployment-/DB-/DNS-/mail-/SSL-/monitoring-/backup-/Cloudflarehandelingen zonder task-scoped GO; claims van padbeperkte hostingtoegang zonder bewijs; en 002C.7.

De baseline is inhoudelijk gereed maar operationeel **DOCUMENTED BUT NOT VERIFIED** tot 002C.6A–6F afzonderlijk aantoonbaar zijn doorlopen.
