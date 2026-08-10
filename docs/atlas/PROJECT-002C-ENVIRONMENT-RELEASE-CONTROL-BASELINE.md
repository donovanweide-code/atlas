# Project 002C.2 — Environment & Release Control Baseline

**Datum:** 7 augustus 2026

**Status:** **GO — minimale baseline vastgelegd; geen deployment uitgevoerd**

**Productie-impact:** geen

**Canonieke architectuurbron:** `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`

## Bewijsstatus

- **VERIFIED** — tijdens 002C.2 rechtstreeks in de repository vastgesteld of lokaal uitgevoerd;
- **DOCUMENTED BUT NOT VERIFIED** — in eerdere WBD-release- of infrastructuurdocumentatie onderbouwd, maar tijdens 002C.2 niet opnieuw extern gecontroleerd;
- **UNKNOWN** — niet aantoonbaar met de beschikbare lokale bronnen;
- **RECOMMENDATION** — de vastgelegde baseline voor volgende releases; nog geen bewijs van uitvoering.

Een GO in dit document is uitsluitend een GO voor de baseline. Het geeft geen toestemming om preview, productie, hosting, DNS, database, SSL, Cloudflare, accounts of rechten te wijzigen.

---

## 1. Executive Summary

WBD heeft al sterke afzonderlijke releasebouwstenen: gescheiden publieke en Experience-builds, een public-only grens, versioned DocumentRoots, checksumgebonden artefacten, een controlehost, twee netwerkcontexten, propagatiebewuste post-switchvalidatie en een directe applicatierollback. **VERIFIED voor repositorytooling; DOCUMENTED BUT NOT VERIFIED voor de huidige externe inrichting**

Het resterende risico was vooral organisatorisch: environment, releasecandidate, menselijke GO, deploymentbewijs en uiteindelijke livebeoordeling stonden verspreid over projectspecifieke rapporten. Deze baseline brengt ze samen zonder een nieuw deploymentplatform te bouwen.

Vanaf deze baseline geldt één workflow:

```text
LOCAL DEVELOPMENT
        ↓
LOCAL VALIDATION
        ↓
RELEASE CANDIDATE / PRE-FLIGHT
        ↓
HUMAN GO
        ↓
CONTROLLED DEPLOYMENT
        ↓
REAL ENVIRONMENT VALIDATION
        ↓
GO / ROLLBACK
```

De bestaande validator blijft de canonieke technische meetlaag. Het nieuwe `RELEASE-EVIDENCE-TEMPLATE.md` is de kleine repositoryguardrail die per release de targetomgeving, bron, artefacten, menselijke toestemming, live bewijs en rollbackbeslissing bijeenhoudt. Een screenshot, localhost, buildresultaat of preview is nooit zelfstandig productiebewijs.

**002C.2-beoordeling: GO.** De baseline is compleet genoeg om toekomstige releases gecontroleerd voor te bereiden. Iedere externe handeling blijft een nieuw, expliciet goed te keuren projectmoment.

---

## 2. Scope

### Binnen scope

- huidig environmentmodel expliciet maken;
- release-identificatie standaardiseren;
- minimale lokale pre-deploymentvalidatie vastleggen;
- vaste fasen `BEFORE DEPLOY`, `DEPLOY`, `AFTER DEPLOY` en `ROLLBACK TRIGGER` definiëren;
- werkelijk productie-evidence definiëren;
- code-, database- en infrastructuurrollback onderscheiden;
- Codex- en menselijke verantwoordelijkheden vastleggen;
- bestaande repositorytooling als guardrail positioneren;
- één herbruikbaar, secretvrij release-evidencetemplate toevoegen.

### Buiten scope

- deployment naar preview of productie;
- externe monitoring implementeren;
- backupregister of off-provider backup implementeren;
- DNS, mailauth, SSL of Cloudflare wijzigen;
- credentials, accounts of rechten wijzigen;
- CI/CD-platform bouwen;
- nieuwe betaalde stagingomgeving aanschaffen;
- applicatie-, Experience-, Workspace- of Atlas-functionaliteit wijzigen.

---

## 3. Evidence Reviewed

### Canonieke voorgangers

| Bron | Relevantie | Bewijsstatus |
|---|---|---|
| `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md` | hosting-, DNS-, environment-, deploy- en rollbackinventaris | DOCUMENTED BUT NOT VERIFIED |
| `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md` | security- en recoverygrenzen | DOCUMENTED BUT NOT VERIFIED |
| `PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md` | herstelbaarheid van een Experience-databaseback-up | DOCUMENTED BUT NOT VERIFIED |
| `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md` | architectuurbesluit en scope voor 002C.2 | VERIFIED als repositorybron |

### Release- en incidentbronnen

| Bron | Gebruikte les | Bewijsstatus |
|---|---|---|
| `RELEASES/PRODUCTION-INCIDENT-ANALYSIS-001.md` | een mislukte probe is niet automatisch een productiefout | DOCUMENTED BUT NOT VERIFIED |
| `RELEASES/PRODUCTION-INFRASTRUCTURE-INVESTIGATION-001.md` | TransIP control-plane en effectief geserveerde bytes kunnen tijdelijk uiteenlopen | DOCUMENTED BUT NOT VERIFIED |
| `RELEASES/PRODUCTION-VALIDATION-HARDENING-001.md` | controlehost, onafhankelijke routes en bewijsclassificatie | VERIFIED als repositorybron |
| `RELEASES/PRODUCTION-VALIDATION-HARDENING-002.md` | runnerbevoegdheid, netwerkcontext en propagatiebewuste activatie | VERIFIED als repositorybron |
| `RELEASES/WBD-2026-07-28-a0bd364-PRODUCTION-CANDIDATE.md` | geïsoleerde build uit broncommit en checksumgebonden artefact | DOCUMENTED BUT NOT VERIFIED |
| `RELEASES/WBD-2026-08-01-f892849.md` | succesvolle productieactivatie na stabiele kandidaatrondes | DOCUMENTED BUT NOT VERIFIED |
| `ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md` | Experience-release met DB-migratie en afzonderlijke rollbackgrenzen | DOCUMENTED BUT NOT VERIFIED |
| `ATLAS-CONTEXT-FIRST-PRODUCTION-DEPLOYMENT-V1.md` | release zonder DB-wijziging en byte-identieke bestaande Experience | DOCUMENTED BUT NOT VERIFIED |

### Rechtstreeks onderzochte repository

- branch `codex/wbd-experience-release-20260801`, HEAD `1ec989896834101e986adaa5a944610457b1fdee`; **VERIFIED**;
- 226 bestaande worktree-items tijdens inventarisatie, waarvan 32 getrackte wijzigingen en 194 untracked items; **VERIFIED**;
- geen getrackte `.github/workflows`; **VERIFIED**;
- `website/package.json` met public-, Experience-, Context-First-, test- en releasevalidatiescripts; **VERIFIED**;
- `vite.config.ts`: interne Workspace-/Atlas-routes bestaan uitsluitend in development serve mode; **VERIFIED**;
- afzonderlijke `dist`, `dist-experience` en `dist-context-first` buildgrenzen; **VERIFIED**;
- `verify-public-build.mjs`: interne data en routes worden uit de publieke build geweerd; **VERIFIED**;
- `prepare-experience-package.mjs`: Experience wordt apart verpakt en noemt config/secrets buiten de DocumentRoot; **VERIFIED**;
- `release-validation*.mjs`: capture, evaluate en propagatiebewuste activate; **VERIFIED**;
- `release-validation.example.json`: expliciete target, controlehost, vorige/kandidaatrelease en netwerkcontexten; **VERIFIED**.

Geen `.env`-, credential-, private-key- of Bitwarden-inhoud is gelezen.

### Lokale verificatie op 7 augustus 2026

- `npm test`: **PASS**, 244 van 244 tests geslaagd; hieronder vallen de releasevalidator, activatielogica, probeclassificaties en publieke buildgrens;
- `npm run build`: **PASS**, TypeScript, publieke Vite-build en `verify-public-build.mjs`; 32 publieke bestanden en 10 tekstbestanden gecontroleerd;
- `npm run build:experience`: **PASS**, TypeScript, afzonderlijke Experience-build en afgeschermde pakketvoorbereiding;
- `npm run build:context-first`: **PASS**, TypeScript en afzonderlijke Context-First-build;
- documentstructuur en alle genoemde lokale bron-/toolpaden: **PASS**, repositorymatig gecontroleerd.

Deze lokale resultaten bewijzen uitsluitend dat de repositorybaseline en buildgrenzen werken. Ze zijn geen productie-evidence en er is geen externe validatie of deployment uitgevoerd.

---

## 4. Environment Model

### 4.1 Canonieke environments

| Environment-ID | Werkelijkheid | Toegestane acties | Niet toegestaan zonder expliciete GO |
|---|---|---|---|
| `local-development` | lokale bron, Vite development server en lokale fixtures | code, lokale tests, lokale build, lokaal gegenereerd bewijs | externe writes, productiecredentials, productiegegevens |
| `local-isolated-validation` | tijdelijke lokale build-, database- of restoreomgeving | reproduceerbare tests, migratie-/restorevalidatie zonder productieverbinding | productie-write, pakketrestore, hergebruik als productie |
| `preview-public` | externe reviewhost voor uitsluitend niet-gevoelige publieke releasecandidate | read-only review na aantoonbare publicatie | deploy/hostingwijziging zonder menselijke GO; productiepersoonsdata |
| `production-public` | werkelijke publieke website op de canonieke live-URL | read-only preflight en post-deployvalidatie | deployment, DocumentRoot- of configuratiewijziging zonder menselijke GO |
| `production-experience` | werkelijke menselijke Experience en PHP/API/datastore | read-only healthchecks; expliciet goedgekeurde Experience-release | code-, database-, config- of hostingwrite zonder menselijke GO |
| `internal-workspace-local` | lokale WBD Workspace, Atlas en Observatory-reviewcontext | lokaal dagelijks gebruik en review | behandelen als publiek/productieplatform |

### 4.2 Geen zelfstandige stagingomgeving

Er is nu geen volwaardige online stagingomgeving met eigen productieachtige database. Preview is alleen een externe publieke releasecandidate voor niet-gevoelige website-inhoud. **DOCUMENTED BUT NOT VERIFIED**

Een aparte stagingomgeving wordt pas noodzakelijk wanneer minimaal één van deze criteria optreedt:

- frequente of incompatibele databasemigraties;
- meerdere engineers of gelijktijdige releases;
- externe integraties die niet veilig lokaal zijn te testen;
- een tweede datadragende organisatie;
- contractueel vereiste acceptatieomgeving;
- releases waarvoor lokale isolatie plus statische preview onvoldoende bewijs opleveren.

### 4.3 Environmentherkenning

Een engineer of Codex mag een environment nooit afleiden uit een screenshot, branchnaam, geopend browservenster of `dist`-map. Vóór iedere externe actie moeten expliciet worden vastgelegd:

1. `environmentId`;
2. releasefamily: `public-site`, `experience` of een later expliciet toegelaten family;
3. exacte target-URL;
4. beoogde DocumentRoot of externe targetgrens;
5. huidige bevestigde actieve en rollback-DocumentRoot indien relevant;
6. operatie: `read-only validation`, `upload candidate`, `activate`, `rollback` of `database migration`;
7. productie-/data-impact;
8. vereiste menselijke GO-referentie.

Ontbreekt één van deze velden, dan is de environment **UNKNOWN** en geldt **STOP / NO-GO**.

---

## 5. Release Identification

### 5.1 Release-ID

Nieuwe release-evidence gebruikt:

```text
<family>-<YYYYMMDDTHHmmssZ>-<commit7>
```

Voorbeelden:

- `wbd-public-20260807T103000Z-1ec9898`;
- `wbd-experience-20260807T111500Z-1ec9898`.

De timestamp is UTC en beschrijft het moment waarop de releasecandidate is vastgelegd. `commit7` is alleen de leesbare suffix; het bewijs bevat altijd ook de volledige 40-teken broncommit.

### 5.2 Verplichte identiteit

Iedere candidate legt minimaal vast:

- release-ID;
- releasefamily;
- volledige source commit;
- branch als informatieve context, niet als immutable identiteit;
- buildtijd in ISO-8601 UTC;
- buildcommando;
- geïsoleerde/schone bronstatus;
- artefactnaam, bytegrootte en SHA-256;
- bestandsmanifest en SHA-256 daarvan;
- primaire JS/CSS- of entrypointidentiteit;
- intended environment en URL;
- candidate DocumentRoot;
- bevestigde huidige en rollback-DocumentRoot;
- database-impactclassificatie;
- preflightresultaat;
- menselijke GO-referentie en tijd;
- switchtijd, live validatieresultaat en eindstatus.

Een branchnaam, zipnaam, screenshot of assethash alleen is onvoldoende release-identiteit.

---

## 6. Pre-deployment Validation

### 6.1 Algemene harde gates

Vóór iedere productie-release moeten minimaal slagen:

- targetenvironment en releasefamily expliciet vastgesteld;
- volledige source commit bestaat en is de gekozen bron;
- candidate gebouwd uit een schone, geïsoleerde commitcontext; de huidige vuile werkboom mag niet als releasebron dienen;
- relevante tests geslaagd;
- TypeScript en juiste family-build geslaagd;
- public-only buildcontrole geslaagd voor de publieke website;
- Experience-packagegrens geslaagd voor Experience;
- artefact, bestandenaantal, bytegrootte, SHA-256 en manifest vastgelegd;
- verwachte entrypoints/assets komen overeen met het artefact;
- configuratie-aanwezigheid gecontroleerd zonder waarden te tonen;
- database-impact expliciet geclassificeerd;
- rollbackroute en herstelbron read-only bevestigd;
- candidate en rollback-DocumentRoots zijn verschillende, expliciete paden;
- releasevalidationconfig bevat definitieve vorige en kandidaatidentiteit zonder placeholders;
- nieuwe preflightreports zijn geldig en niet verlopen;
- evaluatorresultaat is exact `Pass`;
- menselijke GO is daarna expliciet vastgelegd.

### 6.2 Per releasefamily

| Family | Minimale lokale validatie |
|---|---|
| `public-site` | `npm test`, TypeScript/Vite via `npm run build`, public-only controle, robots/sitemap/canonical/favicon en verwachte assets |
| `experience` | `npm test`, `npm run build:experience`, packagegrens, PHP syntax waar runtime beschikbaar is, sessie-/routecompatibiliteit, noindex/no-store, DB-impact |
| `context-first` | `npm test`, `npm run build:context-first`, expliciete bevestiging dat dit geen stilzwijgende primaire Experience-route wordt |

De daadwerkelijke testselectie kan bij een kleine wijziging gerichter beginnen, maar een productiecandidate vereist de volledige relevante regressie en buildgrens.

### 6.3 Preflight is tijdelijk bewijs

Preflight wordt onmiddellijk vóór deployment opnieuw gemaakt. Oud bewijs, bewijs met een ander validatieprofiel of een rapport uit een niet-goedgekeurde runnercontext is `Probe invalid` en geeft nooit switchtoestemming.

---

## 7. Deployment Workflow

### BEFORE DEPLOY

- maak een nieuw release-evidencedocument vanuit `RELEASES/RELEASE-EVIDENCE-TEMPLATE.md`;
- leg environment, release-ID, broncommit en scope vast;
- bouw vanuit geïsoleerde bron;
- voer tests/build/packagecontroles uit;
- genereer artefact en manifest;
- classificeer database- en configuratie-impact;
- bevestig target-, active- en rollback-DocumentRoot read-only;
- maak verse preflightmetingen via de bestaande validator en controlehost;
- stop tenzij resultaat `Pass` is;
- presenteer exact de voorgenomen externe handelingen;
- wacht op expliciete menselijke GO.

### DEPLOY

- voer uitsluitend de goedgekeurde handelingen en artefacthash uit;
- upload naar een nieuwe versioned candidate directory;
- overschrijf of verwijder de actieve en rollbackdirectory niet;
- voer database-/configuratiehandeling alleen uit als die apart in de GO staat;
- leg het werkelijke mutatie- en switchtijdstip vast;
- start propagatiebewuste `activate` met één vast `switchRequestedAt`;
- voeg tijdens deployment geen code- of scopewijziging toe.

### AFTER DEPLOY

- valideer de werkelijke target-URL, niet localhost of preview;
- bewijs kandidaatidentiteit via bodyhash en/of verwachte assets;
- vereis voldoende stabiele kandidaatrondes;
- controleer HTTPS, kritieke headers en kernroutes;
- voer read-only technische en menselijke functionele checks uit;
- controleer console en relevante server-/runtimefouten zonder secrets te loggen;
- leg desktop en mobiel vast waar de wijziging zichtbaar is;
- geef pas RELEASE GO wanneer alle verplichte bewijzen compleet zijn.

### ROLLBACK TRIGGER

- `Production failed` uit voldoende onafhankelijke geldige routes;
- onbekend of beschadigd artefact bevestigd op de werkelijke target;
- kritieke runtime-/data-integriteitsfout;
- securitygrens doorbroken;
- activatie blijft na budget onvoltooid: herstel de vorige root, maar classificeer dit als `Activation timeout`, niet automatisch als productiefalen;
- menselijk besluit bij strijdig of onvoldoende bewijs is STOP, niet improviseren.

---

## 8. Human GO Boundary

Menselijke GO is verplicht vóór:

- iedere upload naar een externe hostingomgeving;
- iedere DocumentRoot-switch of rollback;
- productie- of previewconfiguratie;
- databasebackup met productiegegevens, migratie, write of restore;
- installatie, gebruik of intrekking van deploycredentials;
- account-, recht-, SSL-, DNS-, hosting- of Cloudflarewijziging;
- destructieve bestandsactie;
- het accepteren van een materieel restrisico.

Een geldige GO noemt minimaal:

- release-ID;
- exact artefact en SHA-256;
- targetenvironment;
- toegestane handelingen;
- database-/configuratie-impact;
- rollbackroute;
- datum/tijd of ondubbelzinnige verwijzing naar de goedgekeurde preflight.

Een algemeen eerder project-GO is geen permanente productie-GO voor een nieuwe candidate.

---

## 9. Real Production Validation

### Verplicht bewijs

RELEASE GO vereist gezamenlijk:

1. de werkelijke canonieke productie-URL is gemeten;
2. DNS, transport, TLS en HTTP zijn afzonderlijk gezond;
3. kandidaatidentiteit is bewezen met bodyhash en/of concrete assetnamen;
4. dezelfde kandidaat is gedurende minimaal het ingestelde aantal stabiele rondes zichtbaar;
5. minimaal twee vooraf goedgekeurde onafhankelijke netwerkcontexten stemmen overeen;
6. de controlehost bewijst dat de meetroute zelf functioneert;
7. kritieke routes en functionaliteit zijn read-only of gecontroleerd functioneel beoordeeld;
8. browserconsole en relevante runtimefouten tonen geen releaseblokker;
9. desktop en mobiel zijn gecontroleerd wanneer UI is geraakt;
10. database- en sessie-integriteit zijn gecontroleerd wanneer de Experience of het schema is geraakt;
11. het bewijs is vers, hoort bij hetzelfde validatieprofiel en bevat geen secrets;
12. een mens bevestigt de eindbeslissing `GO`, `NO-GO` of `ROLLED BACK`.

### Onvoldoende bewijs

Nooit zelfstandig voldoende:

- screenshot;
- lokale browser;
- localhost;
- build output;
- unit-testresultaat;
- preview zonder bewezen relatie tot exact hetzelfde artefact;
- “Website opgeslagen” in een hostingpaneel;
- één netwerkprobe;
- alleen HTTP 200;
- branch- of bestandsnaam zonder checksum;
- Codex-interpretatie zonder werkelijk live bewijs.

---

## 10. Release Evidence

Het canonieke per-releasebewijs is één ingevulde kopie van:

`docs/atlas/RELEASES/RELEASE-EVIDENCE-TEMPLATE.md`

Het document verwijst naar ruwe JSON-rapporten en manifesten; het kopieert geen volledige ruwe output wanneer een hash en pad volstaan.

### Minimale bewijsset

- release identity;
- environment declaration;
- scope en expliciet uitgesloten onderdelen;
- lokale test-/buildresultaten;
- artifact en manifest;
- database/config impact;
- read-only target- en rollbackbevestiging;
- preflightprofiel en reports;
- Human GO;
- exact deploymentlog;
- post-switch activatierapport;
- live technische en menselijke checks;
- eindbeslissing en eventuele rollback.

Releasebewijs bevat nooit wachtwoorden, tokens, cookies, private keys, recoverycodes, antwoorden van deelnemers, `.env`-inhoud of private configuratiewaarden.

---

## 11. Rollback Baseline

### A. Applicatie/code rollback

Voorwaarden vóór GO:

- vorige bekende goede versioned directory bestaat en is read-only bevestigd;
- candidate is een andere directory;
- terugzetprocedure en verwachte vorige release-identiteit zijn vastgelegd;
- rollback verandert alleen de DocumentRoot wanneer geen DB/configimpact bestaat.

Na rollback wordt de werkelijke productie opnieuw met dezelfde bewijsgrens gevalideerd.

### B. Database-impact

Code rollback en database rollback zijn afzonderlijke beslissingen. Een schemawijziging mag alleen als code-only rollbackbaar worden geclassificeerd wanneer de vorige applicatie aantoonbaar compatibel is met het nieuwe schema.

Bij incompatibiliteit zijn vóór GO verplicht:

- concrete pre-migratieback-up;
- integriteitsbewijs en hash;
- forward- en herstelplan;
- behandeling van writes sinds migratie;
- geïsoleerde rehearsal waar risico dit vereist;
- aparte menselijke GO voor herstel of destructieve down-migratie.

### C. Configuratie/infrastructuur-impact

DNS, SSL, Cloudflare, account, rechten, hostinginstellingen en private productieconfig hebben ieder een eigen rollbackplan nodig. De applicatieroot terugzetten herstelt deze lagen niet automatisch.

---

## 12. Database Change Boundary

| Classificatie | Voorbeeld | Backup vóór deploy | Migratieplan | Menselijke GO | Code-only rollback |
|---|---|---|---|---|---|
| `NONE` | statische frontend of copy zonder schema/API-writewijziging | niet door deze release vereist | nee | productie-GO blijft verplicht | meestal ja |
| `ADDITIVE_COMPATIBLE` | nieuwe nullable kolom/tabel die vorige app negeert | verplicht | verplicht | expliciet voor migratie | alleen na compatibiliteitsbewijs |
| `BEHAVIORAL` | constraint/default/index of gewijzigde write-semantiek | verplicht | verplicht + data-analyse | expliciet | niet aannemen |
| `DESTRUCTIVE_OR_IRREVERSIBLE` | drop, truncate, typevernauwing, datarewrite of verlies van oude semantiek | verplicht en herstelbaar bewezen | volledige rehearsal en herstelplan | afzonderlijke expliciete GO | nee |

### Harde regels

- een restoretest uit 002B bewijst het herstelpad, niet de veiligheid van iedere nieuwe migratie;
- destructive migration wordt nooit gecombineerd met een gewone frontend-GO;
- productie-write of restore gebeurt nooit als impliciet onderdeel van een deployscript;
- migratiebestand, volgorde, checksum en verwachte voor/na-toestand worden vooraf vastgelegd;
- bij onbekende impact is de classificatie `DESTRUCTIVE_OR_IRREVERSIBLE` totdat het tegendeel is bewezen;
- pakketrestore is geen standaard rollbackroute.

---

## 13. Codex/Human Responsibility

### Codex mag binnen een opdracht

- repository en bestaande documentatie onderzoeken;
- lokale tests en builds uitvoeren;
- lokale artefacten, hashes, manifesten en secretvrij bewijs maken;
- de bestaande read-only releasevalidator voorbereiden en na toestemming gebruiken;
- checklists en runbooks bijwerken;
- risico's, bewijsgrenzen en een exacte Human Action Checklist rapporteren.

### Codex mag niet zonder expliciete GO

- preview of productie deployen;
- externe hosting, DocumentRoot, DNS, SSL of Cloudflare wijzigen;
- databasewrite, migratie, restore of pakketrestore uitvoeren;
- account, rechten, credentials of productieconfig wijzigen;
- private keys of secrets lezen/gebruiken;
- bestanden destructief verwijderen;
- een menselijk releasebesluit simuleren.

### Mens

- bepaalt de zakelijke releaseomvang;
- geeft de afzonderlijke externe/productie-GO;
- voert securitygevoelige handelingen uit waar de securityboundary dit vereist;
- controleert de werkelijke omgeving waar menselijke waarneming nodig is;
- beslist bij twijfel tussen wachten, stoppen en rollback;
- bevestigt de formele release-eindstatus.

---

## 14. Security Boundary

- Geen Bitwarden-toegang door Codex.
- Geen wachtwoorden, recoverycodes, private keys, tokens, cookies of `.env`-waarden lezen of rapporteren.
- Geen productiecredential “testen” zonder expliciete opdracht en exacte handeling.
- Configuratiecontrole rapporteert alleen aanwezigheid, locatieklasse, rechtenstatus en eventueel sleutelnaam; nooit waarde.
- Release- en probeoutput mag geen querytokens, headers met credentials, deelnemersantwoorden of persoonlijke sessiedata bevatten.
- Tijdelijke credentials vallen onder Project 002C.6 en een afzonderlijke Human Action Checklist.
- Zodra menselijke/securitygevoelige toegang noodzakelijk is: **STOP**, geef exacte stappen en wacht op GO.

---

## 15. Repository Guardrails

### Bestaand en leidend

- `npm run build` combineert TypeScript, publieke Vite-build en public-only verificatie;
- `npm run build:experience` bouwt en verpakt de afzonderlijke Experience-boundary;
- `npm test` bevat releasevalidator- en buildgrensregressies;
- `npm run validate:release` voert `capture`, `evaluate` en `activate` uit zonder deployment;
- `release-validation.example.json` legt controlehost, assertions, runnercontexten, candidate/previous identity en propagatiebudget vast;
- versioned releasefolders en checksums maken code rollback controleerbaar;
- `.gitignore` begrenst secrets en tijdelijke werkbestanden.

### Toegevoegd in 002C.2

- dit canonieke baseline-document;
- `RELEASES/RELEASE-EVIDENCE-TEMPLATE.md` als vaste secretvrije preflight-, GO-, deployment-, livevalidatie- en rollbackregistratie.

### Bewust niet toegevoegd

Geen nieuw manifest-, deployment- of environment-script. De bestaande validator is al herbruikbaar en krachtig; een tweede tool zou bewijslogica dupliceren. Artefactmanifesten blijven deterministic per candidate worden gegenereerd en in de template gekoppeld. Automatische manifestgeneratie kan later alleen worden toegevoegd wanneer één concrete, herhaalde handmatige fout dit rechtvaardigt.

---

## 16. Deferred Items

- externe monitoring en alerts: Project 002C.3;
- backupregister, RPO/RTO en off-provider recovery: Project 002C.4;
- DNS, canonical en mailauth: Project 002C.5;
- credential lifecycle en rotatie: Project 002C.6;
- Cloudflare-preflight en eventuele cutover: Project 002C.7/002C.8;
- productiehosting van WBD Workspace/Atlas: toekomstig afzonderlijk project;
- multi-organisation isolation: vóór tweede datadragende klant;
- CI/CD-platform en automatische productieactivatie;
- betaalde stagingomgeving;
- VPS, containers en orchestration.

---

## 17. Open Questions

Deze vragen blokkeren de baseline niet:

1. Welke tweede werkelijk onafhankelijke runner wordt later naast IPv4/IPv6 op één host gebruikt?
2. Welke externe monitoringprovider levert vanaf 002C.3 doorlopend bewijs?
3. Welke zakelijke maximale activatietijd vervangt of bevestigt het huidige twintigminutenbudget?
4. Wanneer wordt preview achter toegang geplaatst of opgeheven?
5. Welke toekomstige releasefrequentie rechtvaardigt automatische manifestgeneratie of CI?
6. Welke RPO/RTO geldt per releasefamily bij database-impact?

Deze vragen worden pas beantwoord in het project dat de betreffende laag implementeert.

---

## 18. GO / NO-GO Recommendation

### Project 002C.2

**GO.** Het environmentmodel, de release-identiteit, preflight, menselijke gates, werkelijke productievalidatie, bewijsset en drie rollbackcategorieën zijn eenduidig vastgelegd. De bestaande validator blijft de technische waarheid; het nieuwe template maakt de totale releasebeslissing herhaalbaar en reviewbaar.

### Toekomstige releases

**GO voor voorbereiding** wanneer lokaal uit een geïsoleerde bron wordt gebouwd en de template volledig wordt ingevuld.

**NO-GO voor deployment** zolang één van deze zaken ontbreekt:

- exacte targetenvironment;
- immutable source/artifact identity;
- relevante geslaagde tests en buildgrenzen;
- geldige verse preflight met `Pass`;
- rollback readiness;
- database-impactclassificatie;
- expliciete menselijke GO.

### Eerstvolgende project

Project 002C.3 mag pas worden gestart na menselijke beoordeling en expliciete GO. Dit document start 002C.3 niet.

Geen productie-, preview-, hosting-, DNS-, database-, SSL-, Cloudflare-, account- of rechtenwijziging is in 002C.2 uitgevoerd.
