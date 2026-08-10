# Project 002A — Infrastructure Foundation (TransIP)

**Datum inventarisatie:** 5 augustus 2026  
**Status:** analyse afgerond; implementatieplan opgesteld; **geen wijzigingen uitgevoerd**  
**Organisatie:** We Build And Design  
**Scope:** TransIP-account, domeinen, DNS, webhosting, databases, e-mail, TLS, toegang, deploys, monitoring, Cloudflare-readiness en schaalbaarheid

## Besluit in één zin

De huidige omgeving is gezond genoeg voor de bestaande WBD-site, Experience en één losse klantsite, maar is nog geen professioneel fundament voor tientallen tot honderden klanten: accountbeveiliging, secretbeheer, eigenaarschap, omgevingsscheiding, monitoring, deploymentautomatisering en tenantisolatie moeten eerst expliciet worden ingericht.

## Veiligheids- en bewijsgrens

Deze inventarisatie was volledig read-only. Er zijn geen accountgegevens, DNS-records, nameservers, certificaten, mailboxen, databases, DocumentRoots, SSH-keys, API-instellingen, bestanden of hostingdiensten gewijzigd.

Gebruikte bewijsbronnen:

- het ingelogde TransIP-controlepaneel;
- publieke HTTP(S)-metingen op 5 augustus 2026;
- de actuele lokale Git-repository en bestaande Atlas-releaseverslagen;
- officiële documentatie van TransIP en Cloudflare.

Gevoelige waarden zoals rekeningnummer, privé-accountmailadres, telefoonnummers, adressen, login-IP's, DNS-verificatietokens en eventuele credentials zijn bewust niet in dit rapport opgenomen.

Niet rechtstreeks bewezen:

- vervaldatums van de actieve Let's Encrypt-certificaten; de hostinginterface toonde geen bruikbare vervaldatum;
- aanwezigheid en herstelbaarheid van concrete automatische back-upmomenten; alleen het pakketrecht en bestaande handmatige releaseback-ups zijn vastgesteld;
- wie buiten de eigenaar de enige TransIP-login of SFTP-wachtwoorden kent;
- of de zakelijke eigenaar van `faraouderenzorg.nl` contractueel gelijk is aan de in TransIP getoonde houder;
- externe afleverbaarheid van e-mail bij verschillende ontvangers;
- of TransIP de loginnaam `sportpaleis` op verzoek kan hernoemen.

---

# 1. Huidige situatie

## 1.1 Account foundation

| Onderdeel | Bevinding | Beoordeling |
|---|---|---|
| Login-/portaalnaam | `sportpaleis` | Legacy klantnaam; ongeschikt als organisatie-identiteit |
| Accounttype | Bedrijfsaccount | Goed |
| Juridische bedrijfseigenaar | `We Build And Design` | Goed; de account is administratief al WBD-eigendom |
| Administratie-e-mail | WBD-domeinadres ingesteld | Goed |
| Hoofdaccountmail | Externe consumentenmailbox | Verbeteren; dit adres kan account recovery initiëren |
| Back-up e-mail | Niet ingesteld | Risico |
| KvK | Ingevuld | Goed |
| BTW-nummer | Niet ingevuld in TransIP; repository bevat wel een publiek BTW-nummer | Controleren en later corrigeren |
| Betaling | Automatische incasso; geen openstaande facturen | Goed |
| Verzamelfactuur | Uitgeschakeld | Operationele keuze; niet risicovol |
| Accountmeldingen | Domein-, storing- en accountwijzigingsmeldingen actief | Goed |
| Verwerkersovereenkomst | Oudere versie geaccepteerd; nieuw voorstel beschikbaar | Juridische review nodig |
| Subverwerkersovereenkomst | Oudere versie geaccepteerd; nieuw voorstel beschikbaar | Juridische review nodig |
| Extra gebruikers | Niet ondersteund door TransIP | Structurele beperking |
| Tags | 0 | Naamgeving en groepering ontbreken |
| VPS | Geen | Geen verborgen VPS-laag of VPS-firewall aanwezig |
| STACK | Niet in de actieve dienstenlijst | Geen afhankelijkheid vastgesteld |
| API | Uit; geen keypairs, access tokens of whitelistregels | Goed voor huidig aanvalsoppervlak |
| Accountbrede VPS-SSH-keys | Geen | Goed |

TransIP ondersteunt momenteel één accountlogin en geen extra controlepaneelgebruikers. Daarmee is persoonlijk, rolgebaseerd beheer in dit account niet mogelijk. Deel de hoofdlogin daarom niet; gebruik per dienst beperkte SFTP/SSH- of database-identiteiten en leg eigenaarschap buiten TransIP vast.

## 1.2 Analyse van de naam `sportpaleis`

De naam `sportpaleis` is niet de juridische bedrijfsnaam en ook niet de producthouder. Het is de TransIP-login-/portaalnaam. In hetzelfde account staat het bedrijfsveld al op `We Build And Design`. De actieve producten zijn `webuildanddesign.nl` en `faraouderenzorg.nl`; er staat geen Sportpaleis-domein, hostingpakket, VPS of database in TransIP.

### Kan de naam veilig worden gewijzigd?

In het controlepaneel bestaat geen zelfserviceveld voor de loginnaam. Officiële TransIP-documentatie beschrijft wel wijzigbare bedrijfs-, contact- en e-mailgegevens, maar geen wijziging van de accountgebruikersnaam. De enige verantwoorde conclusie is daarom:

> Behandel `sportpaleis` voorlopig als een mogelijk onveranderlijke of support-only loginnaam. Vraag TransIP eerst schriftelijk of hernoemen mogelijk is en of de loginidentiteit technisch wordt gewijzigd.

### Risicoanalyse van een eventuele loginwijziging

| Afhankelijkheid | Verwachte impact | Huidig bewijs |
|---|---|---|
| Domeinen en houdergegevens | Geen directe impact verwacht | Producten gebruiken interne product-ID's en eigen houderdata |
| Webhosting en DocumentRoots | Geen directe impact verwacht | Hostingidentiteit is `webuil`, niet `sportpaleis` |
| VPS | Geen | Geen VPS aanwezig |
| SSL/Let's Encrypt | Geen directe impact verwacht | Certificaten zijn domeingebonden |
| TransIP API | Potentieel hoog als scripts de loginnaam gebruiken | API is nu uit; geen keys of tokens |
| Deploys via SFTP/SSH | Laag tot middel | Hostinglogin is apart; password managers en externe scripts blijven een onbekende afhankelijkheid |
| Facturatie | Geen directe impact verwacht | Bedrijfs- en betaalgegevens staan al op WBD |
| Klantportaal | Visuele en loginimpact | `sportpaleis` is juist de getoonde accountnaam |
| E-mailhosting | Geen directe impact verwacht | Mailboxen zijn domeingebonden |
| Monitoring | Potentieel laag | Geen centrale monitoringconfiguratie aangetroffen |

Aanbeveling: geen nieuwe account of producthandover starten om alleen een cosmetische loginnaam op te lossen. Eerst TransIP-support laten bevestigen wat kan. Als hernoemen mogelijk is, voer vóór uitvoering een zoekslag uit in password managers, CI-secrets, documentatie en lokale deployconfiguratie. Het gunstigste moment is na secret cleanup en vóór het activeren van API-automatisering.

## 1.3 Actieve diensten

| Naam | Product | Status | Verlenging/volgende factuur |
|---|---|---|---|
| `webuildanddesign.nl` | Domeinregistratie `.nl` | Actief | 31 oktober / 1 november 2026 |
| `webuildanddesign.nl` | Webhosting Pro | Actief | Maandelijks |
| `faraouderenzorg.nl` | Domeinregistratie `.nl` | Actief | 21 / 22 mei 2027 |
| `faraouderenzorg.nl` | Webhosting Core | Actief | Maandelijks |

Er zijn geen andere actieve TransIP-diensten in de dienstenlijst gevonden.

## 1.4 Domeinen en eigenaarschap

| Domein | Houder in TransIP | Functie | Omgevingen | DNSSEC | Publieke status |
|---|---|---|---|---|---|
| `webuildanddesign.nl` | We Build And Design | Organisatie, publieke website, Experience en preview | productie, preview, Experience | Ingeschakeld | HTTPS 200 |
| `faraouderenzorg.nl` | We Build And Design | Zelfstandige WordPress-site | productie | Ingeschakeld | HTTPS 200 |

Voor `faraouderenzorg.nl` moet contractueel worden bevestigd of We Build And Design juridisch houder hoort te zijn of alleen technisch beheerder. Een klantdomein structureel op naam van WBD houden creëert overdrachts-, continuïteits- en aansprakelijkheidsrisico als de zakelijke eigenaar elders ligt.

Er is geen domein voor Sportpaleis in dit TransIP-account. Sportpaleis vormt dus geen technische productbasis, maar de historische loginnaam maakt de klant nog wel zichtbaar op accountniveau.

## 1.5 DNS-overzicht — `webuildanddesign.nl`

Nameservers:

- `ns0.transip.net`
- `ns1.transip.nl`
- `ns2.transip.eu`

DNSSEC is ingeschakeld.

| Naam | Type | TTL | Waarde/doel | Beoordeling |
|---|---|---:|---|---|
| `@` | A | 5 min | `85.10.159.158` | Productiehost |
| `@` | AAAA | 5 min | `2a01:7c8:f0:10e2::8c42:d0a3` | Productiehost |
| `*` | A | 5 min | Zelfde shared-hosting IPv4 | Risico; onbedoelde hostnames lossen op |
| `*` | AAAA | 5 min | Zelfde shared-hosting IPv6 | Risico; onbedoelde hostnames lossen op |
| `www` | CNAME | 5 min | `@` | Werkt, maar redirect naar apex ontbreekt |
| `preview` | A/AAAA | 1 uur | WBD shared hosting | Logische previewhost |
| `experience` | A/AAAA | 1 uur | WBD shared hosting | Logische applicatiehost |
| `@` | MX | 5 min | `10 mx.transip.email.` | Goed |
| `@` | TXT | 5 min | SPF met TransIP en `~all` | Functioneel; softfail |
| `autoconfig` | CNAME | 5 min | TransIP mail | Goed |
| `autodiscover` | CNAME | 5 min | TransIP mail | Goed |
| drie DKIM-selectors | CNAME | 1 uur | TransIP DKIM | Goed |
| twee mail-authrecords | TXT | 5 min | Unieke TransIP-validaties | Verwacht op nieuw platform; waarden geredigeerd |
| `_dmarc` | TXT | 5 min | `v=DMARC1; p=none;` | Alleen monitoring; geen rapportageadres |

Niet aanwezig: CAA, expliciete `staging`, `workspace`, `atlas`, `observatory`, SRV, SSHFP, TLSA of andere projectrecords.

### DNS-risico's

1. De wildcard A/AAAA laat ook niet-geconfigureerde namen zoals `atlas.webuildanddesign.nl` naar shared hosting wijzen. Een rechtstreekse HTTPS-test op die host faalde door een certificaatnaam-mismatch. Dit is geen werkende omgeving, maar wel een verwarrend en onveilig foutpad.
2. `www.webuildanddesign.nl` retourneert HTTP 200 met dezelfde inhoud als de apex in plaats van één canonieke 301/308-redirect.
3. Er is geen CAA-record. Let's Encrypt mag zonder CAA nog steeds uitgeven, maar er is geen expliciete CA-beperking.
4. DMARC staat op `p=none` zonder `rua`; misbruik wordt niet afgedwongen en niet centraal gerapporteerd.
5. SPF gebruikt `~all`. Dat is de standaard TransIP-configuratie, maar moet opnieuw worden beoordeeld zodra ook transactionele leveranciers verzenden.

## 1.6 DNS-overzicht — `faraouderenzorg.nl`

Dit domein gebruikt dezelfde TransIP-nameservers, DNSSEC en mailbasis. De apex en wildcard wijzen naar een afzonderlijk shared-hostingadres:

- IPv4 `85.10.159.86`;
- IPv6 `2a01:7c8:f0:1081::8acf:1e0d`.

Aanwezig zijn apex en wildcard A/AAAA, `www` en `ftp` als CNAME naar de apex, TransIP MX/SPF/DKIM/mail-auth, autoconfig/autodiscover en DMARC `p=none`. Er zijn geen preview- of stagingrecords en geen CAA-records.

Dezelfde aandachtspunten gelden: wildcard beperken, DMARC gecontroleerd versterken, CAA overwegen en klantownership bevestigen.

## 1.7 Hostingstructuur

### We Build And Design — Webhosting Pro

| Onderdeel | Huidige toestand |
|---|---|
| Capaciteit | 100.000 MB webhosting |
| Gebruik | circa 476 MB webfiles; circa 40 MB databasegebruik |
| Websites | 3/3 slots gebruikt |
| Aliassen | 1 |
| SFTP/SSH | Ingeschakeld |
| Patchman | Niet actief |
| PHP | 8.2 |
| Databases | 2 actief |

| Website | Type | Actieve DocumentRoot |
|---|---|---|
| `webuildanddesign.nl` | Primair | `/sites/wbd-20260801-f892849` |
| `www.webuildanddesign.nl` | Alias | Zelfde websiteobject als apex |
| `preview.webuildanddesign.nl` | Subsite | `/subsites/preview.webuildanddesign.nl` |
| `experience.webuildanddesign.nl` | Subsite | `/sites/wbd-experience-20260805-fv2c0ybh` |

De 3/3-limiet is een directe schaalbaarheidsgrens. Er kan op dit pakket niet nog een zelfstandige staging-, Workspace- of Observatory-site worden toegevoegd zonder pakketwijziging of architectuurwijziging.

### Fara Ouderenzorg — Webhosting Core

| Website | Type | Actieve DocumentRoot |
|---|---|---|
| `faraouderenzorg.nl` | Primair | `/www` |
| `www.faraouderenzorg.nl` | Alias | Zelfde websiteobject |

De publieke respons toont WordPress. De nieuwe TransIP-interface gaf quota-, PHP- en databasevelden voor dit pakket niet volledig weer; die onderdelen zijn daarom niet als afwezig geïnterpreteerd.

## 1.8 Omgevingsmodel

| Omgeving | Huidige invulling | Oordeel |
|---|---|---|
| Local Development | Vite/TypeScript in `website/` | Aanwezig |
| Development | Lokale devservers | Aanwezig, niet gedeeld |
| Preview | `preview.webuildanddesign.nl` | Aanwezig; statische controlehost |
| Staging | Niet aanwezig | Ontbreekt |
| Production — public | `webuildanddesign.nl` | Aanwezig |
| Production — Experience | `experience.webuildanddesign.nl` | Aanwezig |
| Production — Workspace | Niet als zelfstandige beveiligde host aanwezig | Ontbreekt |
| Production — Observatory | Route in Experience, achter applicatie-auth | Aanwezig maar niet als eigen infrastructuurgrens |

Preview gebruikt geen versioned DocumentRoot en is daardoor minder reproduceerbaar dan productie. Productie en Experience gebruiken wel goede, versioned releasepaden met datum en release-identiteit.

## 1.9 Databases

Op WBD Webhosting Pro zijn twee actieve MySQL-databases gevonden:

| Providernaam | Gebruik | Functie | Oordeel |
|---|---:|---|---|
| `webuil_webuildanddesignnlwordpress334e` | 39 / 100 MB | Historische/WordPress-database | Providernaam; functioneel maar niet volgens doelconventie |
| `webuil_experiencev1` | 1 / 15.360 MB | Centrale Experience-opslag | Organisatiecomponent herkenbaar; omgeving en tenantgrens ontbreken in naam |

De databasepagina toonde tegelijk de kop `2/0 gebruikt`; dat is intern inconsistent met de twee zichtbare actieve databases en moet als UI-/quotumweergavefout worden beschouwd, niet als bewijs van een nulquotum.

De Experience-database bevat meerdere applicatieversies en sessies. Bestaande releaseverslagen tonen transactionele pre-releaseback-ups en databasecompatibiliteit. Dit is sterk operationeel bewijs, maar geen vervanging voor periodiek, onafhankelijk getest herstel.

## 1.10 E-mailfoundation

### WBD-mail

| Type | Aantal/gebruik |
|---|---|
| Mailboxen | 2 van 10 |
| `info@...` | 364 / 2.000 MB |
| `analytics@...` | 0 / 2.000 MB |
| Forwards | Geen |
| Groepen | Geen |

### Fara-mail

| Type | Aantal/gebruik |
|---|---|
| Mailboxen | 1 van 5 |
| `info@...` | 158 / 2.000 MB |
| Forwards | Geen |
| Groepen | Geen |

Technische mailinstellingen:

- IMAP: `imap.transip.email:993` met SSL;
- SMTP: `smtp.transip.email:465` met SSL;
- POP3: `pop3.transip.email:995` met SSL.

SPF, DKIM, DMARC en TransIP-mail-authrecords zijn op beide domeinen aanwezig. De basis is geschikt voor menselijke mailboxen, maar nog niet voor schaalbare transactionele e-mail:

- menselijke communicatie en systeemmail zijn niet organisatorisch gescheiden;
- er is geen benoemde `notifications@`, `no-reply@` of bounce-/return-pathstrategie;
- DMARC-rapportage ontbreekt;
- er is geen provider-, volume-, reputatie- of deliverabilitymonitoring;
- automatische webhostingback-ups dekken e-mail niet op dezelfde manier; TransIP levert mailback-ups alleen handmatig en op verzoek.

## 1.11 SSL, HTTPS en publieke headers

TransIP schakelt Let's Encrypt standaard in op webhosting. Op 5 augustus 2026 waren de volgende hosts via een vertrouwde HTTPS-verbinding bereikbaar en stuurden zij HTTP door naar HTTPS:

- `webuildanddesign.nl`;
- `www.webuildanddesign.nl`;
- `preview.webuildanddesign.nl`;
- `experience.webuildanddesign.nl`;
- `faraouderenzorg.nl`.

De controlepaneeltabellen toonden geen bruikbare certificaatnamen of vervaldatums. Certificaatverloop moet daarom extern worden gemonitord.

| Host | HTTPS | HSTS | CSP / aanvullende headers | Beoordeling |
|---|---|---|---|---|
| WBD apex en `www` | 200 | Niet waargenomen | Niet waargenomen in HEAD-response | Verbeteren |
| Preview | 200 | 180 dagen | CSP, frame-, content-type-, referrer- en permissionsbeleid aanwezig | Goed |
| Experience | 200 | 1 jaar | Sterke CSP en meerdere isolatieheaders; `no-store` | Goed |
| Fara | 200 | Niet waargenomen | Geen gangbare securityheaders waargenomen | Risico |

Fara stuurde bij een anonieme homepageaanvraag direct een PHP-sessiecookie zonder zichtbare `Secure`, `HttpOnly` of `SameSite`-attributen. Laat dit in een afzonderlijke WordPress/securityreview bevestigen en herstellen; de waarde van de cookie is niet opgeslagen.

## 1.12 Back-ups en rollback

### Wat goed is

- Webhosting Pro heeft volgens TransIP 30 dagen automatische retentie; maximaal 14 dagen is direct zichtbaar, oudere punten tot 30 dagen via support.
- Webhosting Core heeft 14 dagen automatische retentie.
- Bestanden worden frequent en databases dagelijks geback-upt door TransIP.
- WBD- en Experience-releases gebruiken versioned DocumentRoots.
- Bestaande deploymentrapporten bevatten pre-release database dumps, releasearchieven, hashes en intacte rollbackdirectories.
- Een eerdere DocumentRoot-rollback is aantoonbaar uitgevoerd en gevalideerd.

### Wat ontbreekt

- Geen read-only hersteltest van een concreet TransIP-back-uppunt uitgevoerd.
- Geen centraal back-upregister met eigenaar, retentie, laatste succesvolle back-up en laatste restore-test.
- Geen onafhankelijke/off-provider kopie vastgesteld.
- Mailback-up valt niet onder dezelfde automatische herstelroute.
- Een automatische restore werkt op pakketniveau en kan daardoor publieke site, Preview, Experience en databases samen terugzetten; een herstelactie heeft dus een grote blast radius.
- Restbestanden en oude releaseartefacten hebben geen formeel retentie- en verwijderbeleid.

## 1.13 Deploy foundation

| Onderdeel | Huidige toestand |
|---|---|
| Git-remote | `https://github.com/donovanweide-code/atlas.git` |
| Lokale branch | `codex/wbd-experience-release-20260801` |
| Laatste lokale commit | `1ec9898` — workspace sync, 5 augustus 2026 |
| CI/CD-workflows | Geen `.github/workflows` aangetroffen |
| Build | TypeScript + Vite; gescheiden public/Experience/context-first builds |
| Tests | Node-testset; releaseverslagen tonen uitgebreide geslaagde suites |
| Releasevalidatie | Repository bevat onafhankelijke IPv4/IPv6-probes en activatiemodel |
| Publicatie | Handmatig via TransIP, tijdelijke SSH-key en DocumentRoot-switch |
| Rollback | Handmatige DocumentRoot-terugwijzing naar intact versioned pad |
| Artefactregister | Releaseverslagen en lokale ZIP/tar-artefacten; geen centrale immutable registry |

Sterke punten zijn de versioned releases, hashes, preflight, twee onafhankelijke netwerkfamilies, expliciete GO/NO GO en bewezen rollback. Zwakke punten zijn de handmatige overdracht, tijdelijke lokale secrets, het ontbreken van CI/CD, het ontbreken van staging en de verspreiding van releasebewijs over lokale ongetrackte mappen.

De huidige werkboom bevat veel user-owned wijzigingen en ongetrackte artefacten. De lokale branchnaam, actuele WBD-productierelease, actuele Experience-release en repository-HEAD vormen daardoor niet één ondubbelzinnige releasebron. Een deployment moet voortaan uit een schone, vastgelegde commit en een immutable artefact komen.

## 1.14 Secret- en sleutelhygiëne

Zonder inhoud te openen zijn in de werkruimte aangetroffen:

- een ongetrackte `Wachtwoorden.txt` in de repositoryroot;
- een ongetrackt mailbox-/credentialachtig tekstbestand in de repositoryroot;
- een ongetrackte rootmap `.codex-tmp/` met deploymentlogs, artefacten en twee private-keybestanden;
- geen root-`.gitignore` die deze bestanden uitsluit;
- alleen `website/.gitignore` negeert een `.codex-tmp/` onder `website/`, niet die in de repositoryroot.

Bestaande deploymentrapporten verklaren dat de corresponderende publieke SSH-keys bij TransIP zijn ingetrokken. Dat beperkt remote misbruik, maar maakt lokale private keys of wachtwoordbestanden niet acceptabel in een Git-werkruimte. Eén foutieve `git add -A` kan ze publiceren.

Dit is de hoogste lokale securityprioriteit.

---

# 2. Risicoanalyse

## 2.1 Security Foundation — GO / Verbeteren / Risico

### GO

- DNSSEC actief op beide domeinen.
- HTTPS werkt op alle bekende productie- en previewhosts.
- HTTP wordt naar HTTPS gestuurd.
- Experience en Preview hebben sterke securityheaders en correcte indexatiegrenzen.
- TransIP API staat uit en heeft geen keys/tokens.
- Geen VPS of permanente VPS-SSH-keys.
- Tijdelijke remote deploykeys zijn volgens releasebewijs verwijderd.
- Versioned DocumentRoots en rollbackdirectories zijn bewezen bruikbaar.
- E-mail heeft MX, SPF, DKIM, DMARC en TransIP-mail-auth.
- Facturen hebben geen betalingsachterstand.

### Verbeteren

- Authenticator-2FA inschakelen en recoveryprocedure vastleggen.
- Back-up e-mail toevoegen na gecontroleerde keuze.
- Hoofdaccountmail onder zakelijk beheer brengen of aantoonbaar beveiligen.
- Nieuwere verwerkers- en subverwerkersovereenkomst juridisch beoordelen.
- BTW-veld en houdergegevens controleren.
- Tags/naming aanbrengen nadat de conventie is vastgesteld.
- HSTS, CSP en overige securityheaders op WBD apex en Fara toevoegen.
- `www` canoniek redirecten.
- Back-ups onafhankelijk controleren en restore-tests plannen.
- DMARC-rapportage invoeren en daarna gefaseerd naar enforcement.
- Externe TLS-, uptime- en DNS-monitoring toevoegen.

### Risico

- Authenticator-2FA en sessie-IP-binding staan uit. Het activiteitenlog toont soms e-mail-2FA, maar dat is geen bewijs van permanent sterke authenticator-2FA.
- TransIP kent één login met volledige accountrechten en geen rolgebaseerde gebruikers.
- Secrets en private-keybestanden staan ongetrackt maar niet genegeerd in de repositorywerkruimte.
- Wildcard DNS creëert onbedoelde resolutie en TLS-fouten voor niet-geconfigureerde WBD-hostnamen.
- WBD Webhosting Pro gebruikt 3/3 websiteslots.
- Geen stagingomgeving.
- Geen CI/CD of centrale artefactregistry.
- Geen centrale monitoring, alerting of back-upcontrole.
- Fara zet een zwak geattribueerde sessiecookie en mist zichtbare securityheaders.
- DMARC staat op monitoringmodus zonder rapportage.
- De Experience gebruikt één centrale database zonder formeel beschreven tenantisolatiebeleid.

## 2.2 Technische risico's

1. **Shared-hostingplafond:** de huidige omgeving kan niet lineair doorgroeien naar honderden klanten; siteslots, gedeelde resources en providerbeheer worden een bottleneck.
2. **Control-planevertraging:** eerdere TransIP-incidenten bewijzen dat een opgeslagen DocumentRoot niet direct de effectief geserveerde root hoeft te zijn. De activatieprocedure vangt dit inmiddels beter op, maar blijft providerafhankelijk.
3. **Geen staging:** preview en productie zijn niet genoeg zodra database- of API-migraties risicovoller worden.
4. **Geen declaratieve infrastructuur:** DNS, hosting en secrets zijn niet als gecontroleerde configuratie vastgelegd.
5. **Branch/release-drift:** broncode, werkboom, releaseartefact en actieve release zijn niet automatisch aan elkaar gekoppeld.

## 2.3 Operationele risico's

1. Eén volledige TransIP-login is een bus-factor en auditbeperking.
2. Handmatige deploys zijn gevoelig voor verkeerde map, key, artefact of timing.
3. Back-upbestaan is niet hetzelfde als herstelbaarheid; restore-tests ontbreken.
4. Monitoring is reactief en grotendeels handmatig.
5. Klantownership en technische hosting zitten in hetzelfde account zonder formele product-/tenantlabels.

## 2.4 Privacy- en klantgrensrisico's

1. WBD en Fara staan onder één account en facturatie-/beheergrens.
2. De centrale Experience-database moet aantoonbaar iedere query, export, log en back-up op tenantcontext begrenzen.
3. Observatory en Workspace mogen niet alleen door verborgen URLs worden beschermd; sterke identity-aware toegang is nodig.
4. Een toekomstige klant mag nooit in basistabellen, servernamen, databasecredentials of deploypaden als impliciete eigenaar van het platform voorkomen.

---

# 3. Naamgevingsconventie

## 3.1 Principes

- Organisatie eerst: `wbd`.
- Product/component daarna: `public`, `atlas`, `workspace`, `experience`, `observatory`.
- Omgeving expliciet: `dev`, `preview`, `stg`, `prod`.
- Resource expliciet: `web`, `api`, `db`, `storage`, `queue`, `monitor`.
- Klanten alleen binnen de customerlaag met stabiel klant-ID: `c0001-sportpaleis`.
- Geen persoonsgegevens of tijdelijke campagne-/projectnamen in infrastructuurnamen.
- Release-identiteit is datum + korte Git-hash of immutable build-ID.

## 3.2 Patronen

```text
<org>-<component>-<env>-<resource>-<nn>
<org>-<customer-id>-<env>-<resource>-<nn>
<org>-<component>-<yyyyMMdd>-<gitshort>
```

Voorbeelden:

```text
wbd-atlas-prod-api-01
wbd-experience-stg-web-01
wbd-observatory-prod-db-01
wbd-c0001-sportpaleis-prod-workspace-01
/releases/wbd-public-20260801-f892849
/releases/wbd-experience-20260805-fv2c0ybh
```

## 3.3 Domeinconventie

```text
webuildanddesign.nl                  publieke organisatie
www.webuildanddesign.nl              permanente redirect naar apex
preview.webuildanddesign.nl          preview van publieke site
staging.webuildanddesign.nl          afgeschermde integratieomgeving
experience.webuildanddesign.nl       publieke Experience-ingang
workspace.webuildanddesign.nl        intern, identity-aware afgeschermd
observatory.webuildanddesign.nl      intern, identity-aware afgeschermd
status.webuildanddesign.nl           publieke statuspagina, later
```

Klantidentiteit hoort in de tenantlaag of op een expliciet klantdomein, niet in de basisnamen van Atlas. Intern mag `c0001-sportpaleis` worden gebruikt; platformresources blijven `wbd-atlas-*` en `wbd-experience-*`.

Providergegenereerde database- of hostingnamen hoeven niet cosmetisch te worden hernoemd als dat migratierisico creëert. Leg in een resourceregister de providernaam naast de canonieke WBD-naam vast.

---

# 4. Cloudflare-readiness

## 4.1 Advies

Cloudflare is geschikt voor `webuildanddesign.nl`, maar pas na secret cleanup, DNS-export, monitoring en een gecontroleerd migratieplan. Begin niet gelijktijdig met WBD en een klantdomein.

`faraouderenzorg.nl` hoort alleen in een eigen Cloudflare-zone en beheergrens als contractueel duidelijk is wie eigenaar is en wie wijzigingen mag goedkeuren.

## 4.2 Geschikte functies

| Functie | Advies |
|---|---|
| Authoritative DNS | Ja, later; volledige zone en gefaseerde nameservermigratie |
| Proxy/CDN | Ja voor apex, `www` en statische assets |
| Caching | Hashed assets lang; HTML standaard niet forceren; Experience/API altijd bypass/no-store |
| WAF | Begin met managed rules in log/challenge; daarna gericht blokkeren |
| Rate limiting | Bescherm login-, uitnodigings-, formulier- en API-routes |
| Bot protection | Voor publieke content testen; niet blind op deelnemers- of API-verkeer activeren |
| DDoS | Waardevol voor publieke webhosts |
| Zero Trust Access | Sterk aanbevolen voor Workspace en Observatory |
| Origin exposure | Wordt beperkt voor geproxiede webhosts, maar gedeelde hosting-IP's blijven historisch/publiek kenbaar |

## 4.3 Migratierisico's

1. DNSSEC moet bewust worden gemigreerd. Een nameserverwissel met een oude DS-keten kan `SERVFAIL` en volledige onbereikbaarheid veroorzaken.
2. Cloudflare quick scan is niet volledig; alle MX, SPF, DKIM, DMARC, mail-auth en verificatierecords moeten handmatig worden vergeleken.
3. Mailrecords blijven DNS-only; proxy nooit SMTP/IMAP/MX-verkeer via gewone webproxyrecords.
4. Bot Fight Mode is domeinbreed en kan API- of appverkeer challengen. Experience eerst op een testzone of beperkte regels valideren.
5. Cache Rules mogen geen HTML, sessie-, Observatory-, admin- of API-responses cachen.
6. De huidige wildcard moet vóór proxying expliciet worden beoordeeld; maak geen geproxiede catch-all zonder routing- en certificaatontwerp.
7. Cloudflare is geen vervanging voor originbeveiliging, back-ups of applicatie-authenticatie.

## 4.4 Voorgestelde Cloudflare-volgorde

1. Export en hash de volledige TransIP-zone.
2. Leg alle records vast in een canoniek DNS-register.
3. Verwijder of verklaar wildcardrecords.
4. Verlaag TTL's gecontroleerd.
5. Voeg de zone toe met alle records eerst DNS-only.
6. Plan DNSSEC-uit/aan volgens TransIP- en Cloudflareprocedure.
7. Wissel nameservers in een bewaakt venster.
8. Valideer DNS, mail, HTTPS en beide netwerkfamilies.
9. Proxy eerst apex en `www` zonder agressieve caching.
10. Voeg WAF/rate limiting per route toe in observe/challenge-mode.
11. Proxy Experience pas na volledige sessie-, API-, cookie- en CSP-validatie.
12. Plaats Workspace en Observatory achter Cloudflare Access wanneer hun eigen hosts bestaan.

---

# 5. Monitoring foundation

## Direct nodig

| Controle | Frequentie | Alarm |
|---|---:|---|
| Uptime en HTTP-status per kritieke route | 1 minuut | 2 onafhankelijke fouten |
| TLS-verval en keten | Dagelijks | 30, 14 en 7 dagen |
| DNS A/AAAA/MX/NS/DS-drift | Dagelijks | Iedere ongeplande wijziging |
| Publieke release-identiteit/hash | 5 minuten na deploy; daarna dagelijks | Onbekend artefact |
| HTTP→HTTPS en `www`-canonicalisatie | Dagelijks | Afwijking |
| Securityheaders | Dagelijks | Verwijdering/verslechtering |
| Experience API-health | 1–5 minuten | 5xx, latency of contractbreuk |
| Databaseback-up | Dagelijks | Geen verse succesvolle back-up |
| Restore-test | Per kwartaal | Mislukte test |
| Schijf/databasequota | Dagelijks | 70/85/95% |
| Mailauth (SPF/DKIM/DMARC) | Dagelijks | Record- of alignmentfout |
| DMARC-rapportage | Dagelijks verwerken | Onbekende verzenders/spoofing |
| Applicatiefouten | Continu | SLO-/severitybeleid |

Monitoring moet buiten dezelfde TransIP-hosting draaien, anders kan een providerstoring zowel de dienst als de monitor uitschakelen.

---

# 6. Schaalbaarheidsbeoordeling

## Huidige geschiktheid

| Doel | Oordeel |
|---|---|
| Enkele publieke WBD-site | Geschikt |
| Eén Experience met beperkte praktijkgebruikers | Geschikt met monitoring en securityverbeteringen |
| Enkele losse klantsite | Technisch mogelijk, governance ontbreekt |
| Tientallen klanten | Niet geschikt als huidige shared-hostingstructuur |
| Honderden klanten | Niet geschikt |
| Meerdere Workspaces/organisaties | Applicatie- en datalaag moeten eerst tenant-aware worden |
| Gescheiden databases waar nodig | Handmatig mogelijk; beleid en provisioning ontbreken |
| Veilige horizontale uitbreiding | Ontbreekt |

## Vereiste multi-tenantprincipes

1. Iedere organisatie krijgt een onveranderlijk `tenant_id`; namen zijn metadata.
2. Autorisatie wordt op iedere query en iedere API-route server-side afgedwongen.
3. Auditlogs bevatten actor, tenant, actie, object, tijd en correlatie-ID.
4. Back-ups, exports, bestanden en queues bewaren tenantcontext.
5. Secrets zijn per omgeving en waar nodig per tenant gescheiden.
6. High-risk of contractueel vereiste klanten kunnen een eigen database/schema, encryption key of volledige deployment krijgen.
7. Geen klantnaam in platformbrede server-, root-, admin- of database-eigenaarschap.
8. Provisioning en offboarding zijn herhaalbaar, getest en auditeerbaar.

## Migratietrigger weg van shared hosting

Start platformmigratie uiterlijk wanneer één van deze situaties nadert:

- een tweede echte klantworkspace of klant-Experience;
- noodzaak voor background jobs, queues, websockets of langdurige processen;
- meer dan één ontwikkelaar/beheerder met auditbare toegang;
- formele SLO's of 24/7-alerting;
- tenant-specifieke dataretentie, encryptie of datalocatie;
- frequente database- of applicatiemigraties;
- structurele limiet van websites, resources of deployvensters.

---

# 7. Definitieve doelarchitectuur

```text
Internet
  |
  +-- Authoritative DNS + DNSSEC
  |
  +-- Edge: TLS, DDoS, WAF, rate limiting, botbeleid, CDN
        |
        +-- webuildanddesign.nl -------- WBD Public (stateless)
        +-- experience... -------------- Experience Web/API
        +-- workspace... --------------- Identity-aware Access
        +-- observatory... ------------- Identity-aware Access
                                            |
                                            v
                                  Atlas application services
                                  - tenant-aware API
                                  - authentication/authorization
                                  - jobs/queues
                                  - audit/event pipeline
                                            |
                      +---------------------+--------------------+
                      |                     |                    |
                 relational DB        object storage       observability
                 tenant policies      tenant prefixes      logs/metrics/traces
                      |
            shared-by-policy or dedicated-by-risk

Customers
  +-- c0001-sportpaleis
  +-- c0002-...
  +-- cNNNN-...

Customer resources depend on WBD platform services;
they never own or name the platform foundation.
```

### Scheiding van verantwoordelijkheden

- **We Build And Design:** organisatie, contracten, domeinen, platformgovernance en eindverantwoordelijkheid.
- **Atlas:** engine, data- en beslislogica.
- **Workspace:** afgeschermde werkinterface.
- **Experience:** publieke of uitnodigingsgestuurde deelnemerinterface.
- **Observatory:** afgeschermde observatie, audit en kwaliteitscontrole.
- **Customers:** tenants met eigen beleid, data en optionele dedicated resources.

---

# 8. Quick wins — voorgesteld, niet uitgevoerd

## P0 — eerst goedkeuren en uitvoeren

1. Maak een root-`.gitignore` voor `.codex-tmp/`, credentialbestanden, `.env*`, private keys, logs en lokale artefacten.
2. Verplaats wachtwoorden en private keys uit de repositorywerkruimte naar een password manager/secret store; controleer eerst dat niets ooit is gecommit. Roteer alles waarvan blootstelling niet aantoonbaar uitgesloten is.
3. Schakel authenticator-2FA in op TransIP en leg recoverycodes veilig vast.
4. Kies en configureer een gecontroleerde back-up/recovery-mailbox.
5. Bevestig juridisch eigenaarschap van `faraouderenzorg.nl`.
6. Laat de nieuwe verwerkersovereenkomsten beoordelen; niet blind accepteren.
7. Controleer BTW- en factuurgegevens op volledigheid.

## P1 — fundament hardenen

1. Maak een centraal infrastructuurregister met resource-ID, providernaam, eigenaar, omgeving, tenant, data-classificatie, back-up en monitoring.
2. Voer een read-only back-upinventarisatie en een gecontroleerde restore-test uit.
3. Verwijder de DNS-wildcards pas na impactanalyse en expliciete goedkeuring.
4. Voeg externe uptime-, TLS-, DNS- en back-upmonitoring toe.
5. Voeg securityheaders toe aan WBD apex en Fara; corrigeer de Fara-sessiecookie.
6. Maak `www` een permanente redirect naar de gekozen canonical host.
7. Voeg DMARC `rua` toe, observeer, en verhoog beleid gefaseerd van `none` naar `quarantine` en uiteindelijk `reject`.
8. Overweeg CAA voor uitsluitend werkelijk gebruikte CA's.

## P2 — releaseketen professionaliseren

1. Maak `staging.webuildanddesign.nl` als afgeschermde integratieomgeving, buiten de huidige 3/3-siteslotgrens.
2. Bouw CI voor test, TypeScript, build, securityscan, artefacthash en release manifest.
3. Publiceer alleen immutable artefacten uit een schone commit.
4. Gebruik kortlevende, least-privilege deploycredentials vanuit een secret store.
5. Automatiseer upload en validatie; houd DocumentRoot-switch en rollback als expliciet goedgekeurde releaseactie zolang TransIP shared hosting blijft.
6. Centraliseer releasebewijs en verwijder lokale artefactdrift.

## P3 — Cloudflare en private toegang

1. Migreer eerst alleen `webuildanddesign.nl` volgens de DNSSEC-veilige volgorde.
2. Proxy apex/`www`; voeg WAF en rate limiting in observe/challenge-mode toe.
3. Valideer Experience volledig vóór proxying.
4. Zet Workspace en Observatory op eigen hosts achter identity-aware Access.

## P4 — platformmigratie voor meerdere klanten

1. Verplaats Atlas/Experience-runtime naar een platform met gescheiden compute, managed database, object storage, queue en observability.
2. Implementeer tenant-aware provisioning, autorisatie, audit en lifecycle.
3. Kies per klant risicogestuurd tussen gedeelde database met harde tenantpolicies, eigen schema of eigen database.
4. Maak klantdomeinen, e-mail en hosting overdraagbaar en contractueel gescheiden.

---

# 9. Aanbevolen implementatievolgorde

| Fase | Moment | Doel | Go-voorwaarde |
|---|---|---|---|
| 0 | Nu | Secrets, accountbeveiliging, eigenaarschap | Geen credentials in repo; 2FA actief; owners bevestigd |
| 1 | Daarna | Register, monitoring, back-ups, DNS/mail/securityheaders | Alerts werken; restore bewezen; DNS-plan goedgekeurd |
| 2 | Voor volgende belangrijke release | CI/CD, staging, immutable artefacten | Deploy uit schone commit; rollback geoefend |
| 3 | Na stabiele baseline | Cloudflare WBD | Volledige DNS-pariteit; mail en DNSSEC gevalideerd |
| 4 | Vóór tweede echte tenant | Multi-tenant platformlaag | Tenantisolatie-, audit- en provisioningtests geslaagd |
| 5 | Bij groei/SLO-behoefte | Shared hosting verlaten voor Atlas-runtime | Managed platform, HA, observability en herstel-SLO bewezen |

Voer fases niet als één big-bangmigratie uit. Iedere fase moet een expliciete change set, impactanalyse, preflight, rollbackplan en post-change bewijs krijgen.

---

# 10. Samenvatting: goed, ontbreekt, risico, later

## Wat goed is

- WBD is al de administratieve bedrijfseigenaar van het account.
- Domeinen, hosting en facturatie zijn actief en betaald.
- DNSSEC, HTTPS, mailauthenticatie en automatische hostingback-ups zijn aanwezig.
- Productie en Experience gebruiken versioned releases en bewezen rollback.
- API, VPS en permanente account-SSH-keys vergroten het huidige aanvalsoppervlak niet.
- Releasevalidatie is inhoudelijk bovengemiddeld zorgvuldig.

## Wat ontbreekt

- sterke account-2FA en gecontroleerde recovery;
- root secret-exclusions en centrale secret store;
- staging;
- CI/CD en immutable artefactregistry;
- centrale monitoring en alerts;
- restore-tests en off-provider back-upbeleid;
- formele tenant- en klantownershipgrenzen;
- schaalbaar compute/datafundament voor Atlas.

## Wat technisch risico vormt

- onbeschermde lokale credentialbestanden;
- één volledige TransIP-login;
- wildcard DNS en TLS-foutpaden;
- 3/3 websiteslots;
- zwakke headers/cookie op Fara en ontbrekende headers op WBD apex;
- DMARC zonder enforcement of rapportage;
- handmatige deploys en branch/release-drift;
- centrale Experience-database zonder formeel tenantbeleid.

## Wat direct verbeterd kan worden

- secret hygiene, 2FA, recovery, infrastructuurregister en monitoring;
- `www`-redirect en securityheaders;
- DMARC-rapportage;
- back-up-/restorebewijs;
- naming en tags, zonder providerresources risicovol te hernoemen.

## Wat bewust later kan

- Cloudflare-proxying;
- eigen Workspace- en Observatory-hosts;
- managed compute/database/queue-platform;
- dedicated klantdatabases;
- multi-region/high availability;
- volledige Infrastructure as Code, zodra de doelprovider is gekozen.

---

# 11. Besluitpunten voor Donovan

Voor de eerste implementatiefase zijn na dit rapport alleen de volgende expliciete besluiten nodig:

1. Goedkeuring voor P0 secret cleanup en root-`.gitignore`.
2. Goedkeuring om authenticator-2FA en recovery in TransIP in te richten.
3. Bevestiging wie juridisch eigenaar hoort te zijn van `faraouderenzorg.nl`.
4. Keuze of TransIP-support mag worden gevraagd naar een veilige loginnaamwijziging van `sportpaleis` naar een WBD-identiteit.
5. Goedkeuring voor een afzonderlijke restore-test en monitoringimplementatie.

Tot die goedkeuring blijft de huidige infrastructuur ongewijzigd.

---

# Bronnen

## Intern

- `docs/atlas/RELEASES/PRODUCTION-INFRASTRUCTURE-INVESTIGATION-001.md`
- `docs/atlas/RELEASES/PRODUCTION-INCIDENT-ANALYSIS-001.md`
- `docs/atlas/RELEASES/WBD-2026-08-01-f892849.md`
- `docs/atlas/ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md`
- `docs/atlas/LIVING-EXPERIENCE-FIRST-VISIT-V2.md`
- `docs/atlas/LIVING-EXPERIENCE-FLOW-RECOMPOSITION-V1-DEPLOYMENT.md`
- `website/release-validation.example.json`
- `website/package.json`

## Officieel — TransIP

- [Contact- en adresgegevens in mijn account wijzigen](https://www.transip.nl/knowledgebase/382-contactgegevens-in-mijn-account-wijzigen)
- [Extra gebruikers aanmaken voor een TransIP-account](https://www.transip.nl/knowledgebase/389-extra-gebruikers-aanmaken-account-transip)
- [Back-ups op webhostingpakketten](https://www.transip.nl/knowledgebase/5912-back-ups-op-webhostingpakketten)
- [Let's Encrypt voor webhosting](https://www.transip.nl/knowledgebase/6985-let-s-encrypt-voor-webhosting)
- [SSH op webhostingpakketten](https://www.transip.nl/knowledgebase/6191-ssh-op-webhostingpakketten/)
- [DNS-instellingen van een webhostingpakket](https://www.transip.nl/knowledgebase/webhosting-algemeen/527-de-dns-instellingen-van-mijn-webhostingpakket)
- [Een SPF-record instellen](https://www.transip.nl/knowledgebase/426-een-spf-record-instellen/)
- [E-mail overzetten naar TransIP: MX, SPF, DKIM en DMARC](https://www.transip.nl/knowledgebase/ik-wil-mijn-e-mail-overzetten-naar-transip)
- [Algemene e-mailinstellingen](https://www.transip.nl/knowledgebase/314-ik-wil-mijn-e-mailadres-instellen)

## Officieel — Cloudflare

- [Full DNS setup en nameservermigratie](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Cloudflare DNS setupmodellen](https://developers.cloudflare.com/dns/zone-setups/)
- [WAF-overzicht](https://developers.cloudflare.com/waf/)
- [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Standaard cachegedrag](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [Cloudflare Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Self-hosted webapplicaties achter Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/)
