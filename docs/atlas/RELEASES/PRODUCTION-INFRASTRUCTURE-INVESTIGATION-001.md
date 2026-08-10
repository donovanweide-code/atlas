# Production Infrastructure Investigation 001

**Datum:** 28 juli 2026
**Onderzochte release:** `a0bd364`
**Uitvoeringscommit Publication Attempt 002:** `6031f8a1138a5a3756d29ba211ffe5906188af16`
**Nieuwe release-directory:** `/sites/wbd-20260728-a0bd364`
**Stabiele productie-directory:** `/sites/wbd-20260726-ca3d1bd`
**Onderzoeksstatus:** afgerond
**Productiestatus:** stabiele rollbackversie actief
**Production Publication:** **HOLD – Wacht op reactie TransIP**
**Openstaand extern actiepunt:** TransIP moet de activatie van de DocumentRoot
op `linweb412` verklaren voordat dit traject wordt heropend.
**Deployment of DocumentRoot-wijziging tijdens dit onderzoek:** niet uitgevoerd

## Executive summary

De nieuwe release was volledig en correct aanwezig op de hostingomgeving. De
fysieke `index.html` in `/sites/wbd-20260728-a0bd364` is 1.293 bytes, heeft
SHA-256
`D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77`
en verwijst naar:

- `/assets/index-DX1T5CEV.js`;
- `/assets/index-DWjRSiTi.css`.

De bestanden waren vóór de publicatiecontrole aanwezig, leesbaar en hadden
normale rechten (`0644`). De build, upload, mapstructuur en bestandsrechten
verklaren het incident daarom niet.

Tijdens Publication Attempt 002 accepteerde het TransIP-controlepaneel de
nieuwe DocumentRoot en toonde het
`/sites/wbd-20260728-a0bd364` als actief websitepad. De publiek geserveerde
werkelijkheid wijzigde echter niet mee. Alle acht post-switchmetingen via
IPv4 en IPv6 ontvingen exact de `index.html` van de oude release:

- 480 bytes;
- SHA-256
  `483BB096F17C8535CAA9844FFB8FFF8F44CFF5CC8759AFAEB55392E4F3339A63`;
- `Last-Modified: Sun, 26 Jul 2026 12:24:07 GMT`;
- `ETag: "1e0-65782aea81212"`.

Het hosting-accesslog bewijst dat deze verzoeken de Apache-backend
`linweb412` bereikten. Het was dus geen browsercache en ook geen cache-hit die
vóór de backend werd afgehandeld. De publieke Nginx-laag stuurde de verzoeken
door; Apache leverde daarna nog het oude document.

### Oorzaakclassificatie

**Bewezen directe oorzaak:** de door het TransIP-controlepaneel getoonde
DocumentRoot en de effectieve DocumentRoot van de Apache-vhost liepen tijdens
het post-switchvenster uiteen. De control-plane wijziging was geaccepteerd,
maar de data-plane bleef de oude release serveren.

**Niet bewezen onderliggend mechanisme:** met de beschikbare klanttoegang kan
niet worden vastgesteld of dit verschil ontstond door:

1. normale maar ongedocumenteerde asynchrone propagatie;
2. een vertraagde of mislukte Apache-vhostreload;
3. een andere interne TransIP-configuratiemapping.

De beschikbare feiten ondersteunen een hosting-specifieke
configuratie-/activatievertraging veel sterker dan een contentcache. Een
eerdere TransIP-DocumentRoot-wijziging op 26 juli liet bovendien hetzelfde
kwalitatieve patroon zien: eerst bleef de vorige pagina zichtbaar, daarna
werd de nieuwe root actief. De exacte convergentietijd van Attempt 002 is niet
bekend, omdat conform de veiligheidsprocedure is teruggerold.

Er is daarom **geen nieuw Production GO** verantwoord voordat TransIP de
verwachte activatiegrens of de concrete configuratiegebeurtenis op
`linweb412` heeft verduidelijkt en de releaseprocedure daarop bewust is
beoordeeld.

## 1. Chronologische reconstructie

Alle tijden hieronder zijn op 28 juli 2026. CEST is UTC+2.

| Tijd | Gebeurtenis | Bewijs |
|---|---|---|
| 21:25–21:26 CEST | Nieuwe rootbestanden aanwezig | File Manager: `index.html` 1.293 bytes; JS 79.818 bytes; beide `0644` |
| 20:52:29–20:52:45 UTC | Verse IPv4-preflight | 4/4 productie en 4/4 preview HTTP 200 |
| 20:53:00–20:53:15 UTC | Verse IPv6-preflight | 4/4 productie en 4/4 preview HTTP 200 |
| Tussen 20:53:15 en 20:54:35 UTC | TransIP-sitepad gewijzigd | Controlepaneel accepteerde en toonde `/sites/wbd-20260728-a0bd364` |
| 20:54:35–20:54:50 UTC | Post-switch IPv4 | 4/4 productie HTTP 200, maar exact oude HTML; preview exact nieuwe HTML |
| 20:55:00–20:55:15 UTC | Post-switch IPv6 | 4/4 productie HTTP 200, maar exact oude HTML; preview exact nieuwe HTML |
| Na 20:55:15 UTC | Evaluator: `Production failed` | Beide onafhankelijke routes hadden een kritieke artefactmismatch |
| Voor 20:56:52 UTC | Rollback uitgevoerd | Sitepad terug naar `/sites/wbd-20260726-ca3d1bd` |
| 20:56:52–20:57:33 UTC | Rollbackvalidatie | IPv4 en IPv6 opnieuw `Pass` |
| 21:10:42–21:10:43 UTC | Read-only nameting | Apex nog exact oude hash; preview exact nieuwe hash; beide via IPv4 en IPv6 |

De exacte seconde waarop TransIP de wijziging intern aanvaardde is niet in
een serverlog beschikbaar. De eerste post-switchmeting vond uiterlijk
79 seconden na het einde van de IPv6-preflight plaats. Binnen het
daadwerkelijke meetvenster bleef de afwijking ten minste 40 seconden
onveranderd.

## 2. DocumentRoot en mappings

### 2.1 Wat TransIP meldt

Tijdens Publication Attempt 002:

`/sites/wbd-20260728-a0bd364`

Na rollback en tijdens dit onderzoek:

`/sites/wbd-20260726-ca3d1bd`

Het huidige controlepaneel toont de stabiele rollbackmap zowel in het
hostingoverzicht als bij de primaire website-informatie. Het hoofddomein is
het primaire domein; `www.webuildanddesign.nl` is een alias van hetzelfde
websiteobject. Preview is een afzonderlijke subsite.

### 2.2 Wat de webserver werkelijk gebruikte

De publiek opgehaalde bytes tijdens het post-switchvenster waren exact gelijk
aan de vastgelegde `index.html` van
`/sites/wbd-20260726-ca3d1bd`, inclusief omvang, hash, `Last-Modified` en
`ETag`.

Daarmee is bewezen dat de effectieve serveergrens nog de oude release was.
Niet rechtstreeks zichtbaar is of Apache intern letterlijk die map als
`DocumentRoot` had, of via een door TransIP beheerde mapping naar die map
wees. Voor de publieke uitkomst is dit onderscheid niet relevant; voor de
onderliggende hostingoorzaak wel.

### 2.3 Symlinks

De File Manager toont `sites`, de oude release, de nieuwe release en `/www`
als normale directories. Binnen de toegankelijke bestandshiërarchie is geen
symlink tussen de twee versioned releases aangetroffen.

De door TransIP beheerde vhostmapping en eventuele interne includes zijn niet
zichtbaar vanuit de klantomgeving. Een verborgen configuratiemapping kan
daarom niet rechtstreeks worden gelezen of uitgesloten.

## 3. Webserverconfiguratie

De bereikbare architectuur bestaat aantoonbaar uit twee lagen:

1. **Nginx aan de publieke rand.** Alle publieke HTTP-responses bevatten
   `Server: nginx`.
2. **Apache als backend.** Het hosting-errorlog bevat Apache-processen,
   Apache-modulemeldingen en configuratiepaden onder
   `/usr/local/httpd/conf/...`. Het accesslog op
   `tb-nl01-linweb412` bevat alle validatorrequests.

Dit is dus geen uitsluitend Nginx- of uitsluitend Apache-hostingpad. Nginx
ontvangt het publieke verzoek; Apache behandelt de host achter die laag.

De actieve Nginx-vhost, Apache-vhost, include-bestanden en de gegenereerde
DocumentRootregel zijn op shared hosting niet leesbaar. SFTP/SSH is actief,
maar er is geen SSH-key en de beheerde vhostconfiguratie valt buiten de
klantdirectory. Het onderzoek heeft geen wachtwoord, configuratie of
infrastructuur gewijzigd.

## 4. Fysieke releasebestanden

De nieuwe release-directory bestaat zelfstandig en bevat:

- `.htaccess`;
- `404.html`;
- `favicon.svg`;
- `icons.svg`;
- `index.html`;
- `robots.txt`;
- `sitemap.xml`;
- `assets/` met de volledige nieuwe assetset.

### 4.1 Gecontroleerde metadata

| Bestand | Omvang | Wijzigingstijd File Manager | Rechten | Eigenaar |
|---|---:|---|---|---|
| `index.html` | 1.293 bytes | 28 juli 2026 21:25 CEST | `0644` | `webuildanddesignnl@webuildanddesignnl` |
| `assets/index-DX1T5CEV.js` | 79.818 bytes | 28 juli 2026 21:26 CEST | `0644` | `webuildanddesignnl@webuildanddesignnl` |
| `assets/index-DWjRSiTi.css` | 170.222 bytes | aanwezig in File Manager | leesbaar | zelfde hostingaccount |

De fysieke serverkopie van `index.html` is tijdens dit onderzoek read-only
gedownload en gehasht:

`D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77`

Deze hash is exact gelijk aan:

- het canonieke releasemanifest;
- de lokale kandidaat;
- de publiek geserveerde preview.

De release-map is daarmee inhoudelijk correct en zelfstandig bruikbaar.

## 5. HTML- en assetvergelijking

| Bron | Bytes | SHA-256 | JS | CSS |
|---|---:|---|---|---|
| Nieuwe fysieke release | 1.293 | `D46D...AC77` | `index-DX1T5CEV.js` | `index-DWjRSiTi.css` |
| Preview tijdens en na incident | 1.293 | `D46D...AC77` | `index-DX1T5CEV.js` | `index-DWjRSiTi.css` |
| Oude stabiele productie | 480 | `483B...9A63` | `index-DxU6iiRJ.js` | `index-NnYm0S8a.css` |
| Productie na de switch | 480 | `483B...9A63` | `index-DxU6iiRJ.js` | `index-NnYm0S8a.css` |

De oude bundelnamen werden niet gekozen door nieuwe HTML. De publiek
geserveerde HTML zelf was oud. De browser kreeg daardoor correct de
bundelverwijzingen die in die oude HTML stonden.

Ook de verwachte security- en cacheheaders uit de nieuwe `.htaccess` waren
tijdens de post-switchmetingen niet aanwezig op de apexresponse. Dat is
aanvullend bewijs dat de nieuwe root inclusief zijn `.htaccess` nog niet de
effectieve serveergrens was.

## 6. Serverlogs

### 6.1 Accesslog

Bewijsbestand:

`access-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z`

- omvang: 355.092 bytes;
- SHA-256:
  `CD3FC743CC1D8F51010A4573508EB3A9E2219CA43FA4823BFB55776EFCC6B866`.

Het log bevat voor iedere preflight-, post-switch- en rollbackmeting een
request met user-agent `Atlas-Release-Validator/1.0`.

Tijdens preflight en rollback staan per meetpunt twee responses:

- 1.293 bytes voor preview;
- 480 bytes voor productie.

Tijdens het volledige post-switchvenster blijft hetzelfde patroon bestaan.
Dat bewijst:

- de requests bereikten de TransIP Apache-backend;
- Nginx heeft de responses niet als zelfstandige cache-hit vóór Apache
  afgehandeld;
- hostrouting naar preview en apex bleef werken;
- Apache leverde voor de apexhost nog de oude file-identiteit.

### 6.2 Errorlog

Bewijsbestand:

`error-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z`

- omvang: 335.014 bytes;
- SHA-256:
  `3F227A0A3702601FF56FA3D68E1D137521D806D500EFC96A1F7FC0FB3E1507F1`.

Het errorlog bevat in het publicatievenster geen foutmelding voor:

- de primaire vhost;
- de nieuwe release-directory;
- `index.html`;
- de nieuwe JS- of CSS-bundel;
- rechten of bestandstoegang;
- een Apache-configreload.

De afwezigheid van een fout bewijst niet dat de configreload slaagde. Zij
sluit wel een zichtbare runtimefout, permission error en ontbrekend-bestandfout
in het beschikbare errorlog uit.

## 7. Cachelagen

| Cachelaag | Uitkomst | Bewijs |
|---|---|---|
| Browsercache | uitgesloten | Node-validator deed verse HTTPS-requests; server-accesslog bevat iedere request |
| Cloudflare | uitgesloten als actieve proxy | TransIP-nameservers; apex A/AAAA wijzen rechtstreeks naar TransIP; geen Cloudflare-headers |
| Externe CDN | geen bewijs voor aanwezigheid | geen CDN-CNAME, `Via`, `Age`, `X-Cache` of vergelijkbare headers |
| Varnish | uitgeschakeld | TransIP-controlepaneel: `Uitgeschakeld` |
| Redis | uitgeschakeld | TransIP-controlepaneel: `Uitgeschakeld` |
| RAM-disk | uitgeschakeld | TransIP-controlepaneel: `Uitgeschakeld` |
| LiteSpeed | niet actief | controlepaneel toont bestelmogelijkheid, geen actieve add-on |
| PHP OPCache | niet relevant | het afwijkende bestand is statische HTML, geen PHP-uitvoer |
| Nginx responsecache vóór Apache | uitgesloten voor de gemeten requests | iedere validatorrequest staat in het Apache-accesslog |
| Apache contentcache | geen aanwijzing; niet volledig zichtbaar | geen cacheheaders of actieve control-panelcache; globale moduleconfig is beheerd |
| TransIP configuratie-/vhostpropagatie | sterk ondersteund | control-plane toonde nieuw pad terwijl Apache oude file-identiteit bleef leveren |

Een verborgen Apache-contentcache kan zonder beheerde moduleconfig niet
absoluut worden uitgesloten. Zij verklaart de feiten echter minder goed dan
een nog niet bijgewerkte vhostmapping: zowel de oude HTML als de oude
`.htaccess`-werking bleven actief, terwijl iedere request de backend bereikte.

Er is bewust geen cache geleegd. De oorspronkelijke toestand is behouden.

## 8. DNS, TLS en routering

Actuele DNS:

| Host | IPv4 | IPv6 / mapping |
|---|---|---|
| `webuildanddesign.nl` | `85.10.159.158` | `2a01:7c8:f0:10e2::8c42:d0a3` |
| `preview.webuildanddesign.nl` | `85.10.159.158` | `2a01:7c8:f0:10e2::8c42:d0a3` |
| `www.webuildanddesign.nl` | CNAME naar apex | volgt apex |

Nameservers:

- `ns1.transip.nl`;
- `ns2.transip.eu`;
- `ns0.transip.net`.

IPv4 en IPv6 leverden tijdens het incident dezelfde oude productiehash en
dezelfde nieuwe previewhash. TLS was op beide routes geldig en HTTP gaf op
alle meetpunten 200.

Daarmee zijn als oorzaak uitgesloten:

- DNS-propagatie;
- een uitsluitend IPv4- of IPv6-probleem;
- TLS of certificaat;
- netwerkbereikbaarheid;
- verlies van de hostheader;
- een defecte validatorroute.

## 9. Reproduceerbaarheid

Het exacte incident is niet opnieuw gereproduceerd, omdat de opdracht iedere
nieuwe DocumentRoot-switch terecht uitsluit.

Wel zijn twee relevante feiten beschikbaar:

1. Attempt 002 leverde gedurende acht post-switchmetingen op twee
   netwerkfamilies consequent de oude root.
2. Sprint 004 legde op dezelfde TransIP-hosting eerder vast dat na een
   DocumentRoot-wijziging tijdelijk de vorige pagina zichtbaar bleef en de
   nieuwe root pas later actief werd.

Hierdoor is het gedrag niet aannemelijk als eenmalige browser- of
validatorafwijking. Het patroon is **hosting-specifiek en waarschijnlijk
timing-afhankelijk**. Of de tweede gebeurtenis normale vertraagde convergentie
of een mislukte reload was, blijft zonder TransIP-configuratielog onbekend.

Het probleem kan daarom niet als structureel defect worden bestempeld, maar
ook niet als incidentele externe storing worden afgesloten.

## 10. Onderzochte hypotheses

| Hypothese | Beoordeling | Onderbouwing |
|---|---|---|
| Fout releaseartefact | uitgesloten | fysieke root, manifest en preview zijn byte-identiek |
| Onvolledige upload | uitgesloten | alle rootfiles en verwachte bundles aanwezig |
| Verkeerde rechten | uitgesloten voor gecontroleerde bestanden | `0644`, juiste eigenaar, bestanden leesbaar |
| DNS of TLS | uitgesloten | beide netwerkfamilies gezond en eensluidend |
| Browsercache | uitgesloten | validator en serverlogs |
| Cloudflare/CDN | uitgesloten als route | directe TransIP-DNS en geen proxyheaders |
| Varnish/LiteSpeed/Redis/RAM-disk | uitgesloten als actieve laag | control-panelstatus |
| Nginx edgecache | uitgesloten voor gemeten requests | requests bereikten Apache |
| Apache contentcache | weinig waarschijnlijk, niet absoluut uitsluitbaar | geen cache-indicatoren; beheerconfig niet zichtbaar |
| Verkeerde primaire host | uitgesloten | controlepaneel en logs identificeren `webuildanddesign.nl` |
| Control-plane/data-plane divergentie | bewezen | nieuw pad in control panel, oude bytes uit Apache |
| Asynchrone propagatie | meest waarschijnlijke onderliggende hypothese | eerder vergelijkbaar patroon; exacte SLA onbekend |
| Mislukte vhostreload | plausibele resterende hypothese | zelfde symptomen; geen beheerde configlog beschikbaar |

## 11. Vastgestelde oorzaak en bewijsgrens

### Vastgestelde oorzaak

De productie bleef oude bundels serveren omdat de effectieve Apache-vhost de
nieuwe release-root tijdens het volledige validatievenster niet gebruikte.
De DocumentRoot-bevestiging in het TransIP-controlepaneel liep vóór op de
werkelijk geserveerde configuratie.

### Bewijsgrens

Niet vastgesteld is waarom TransIP deze control-plane wijziging nog niet naar
de Apache data-plane had doorgezet. De ontbrekende beslissende bron is de
TransIP-configuratie-/reloadlog voor `linweb412` en de officiële
activatiegarantie voor een sitepadwijziging.

De uitkomst is daarom:

- **bewezen oorzaak op de releasegrens**;
- **meerdere plausibele oorzaken voor het onderliggende hostingmechanisme**.

## 12. Aanbevolen vervolgstap

### 12.1 Eerst TransIP-serverbewijs opvragen

Open een begrensd supportonderzoek bij TransIP met:

- primaire host `webuildanddesign.nl`;
- backendindicatie `tb-nl01-linweb412`;
- switchvenster tussen 22:53:15 en 22:54:35 CEST;
- oude filehash `483BB0...9A63`;
- nieuwe filehash `D46D9F...AC77`;
- accesslogregels 22:54:35–22:55:15 CEST;
- control-panelpad `/sites/wbd-20260728-a0bd364`;
- effectieve oude root `/sites/wbd-20260726-ca3d1bd`.

Vraag TransIP specifiek:

1. wanneer de gegenereerde Apache-vhost op `linweb412` is gewijzigd;
2. of een reload is gestart, vertraagd of mislukt;
3. welke activatie-/convergentietijd voor een DocumentRoot-wijziging geldt;
4. welke read-only controle de effectieve DocumentRoot kan bevestigen;
5. of control-panelbevestiging een opgeslagen wens of een actieve
   webserverconfiguratie betekent.

### 12.2 Releaseprocedure pas daarna beoordelen

Wanneer TransIP een verwachte propagatiegrens bevestigt, kan de procedure
worden uitgebreid met een aparte status `Activation pending`:

- alleen zolang de oude stabiele release aantoonbaar gezond blijft;
- alleen zolang beide onafhankelijke routes hetzelfde oude artefact tonen;
- met een vaste, onderbouwde deadline;
- zonder `Production failed` of rollbackcriteria voor werkelijk defecte
  productie te versoepelen.

Wanneer TransIP geen betrouwbare activatiegrens of effectieve-rootcontrole
kan geven, is een DocumentRoot-switch op deze shared-hostinglaag onvoldoende
voorspelbaar voor de huidige release-eisen. Dan is eerst een afzonderlijk
hosting-/publicatiemechanismebesluit nodig.

### 12.3 Bewijs bij een latere, expliciet goedgekeurde publicatie

Voor een eventuele latere poging:

- geef ieder request een unieke query-/correlatie-id;
- stuur `Cache-Control: no-cache` en `Pragma: no-cache`;
- registreer bodyhash, `ETag`, `Last-Modified`, backend-accesslog en
  control-panelstatus;
- behoud IPv4 en IPv6 als twee geldige meetroutes;
- wis geen cache zonder voorafgaand bewijs dat die cache actief en relevant
  is.

## 13. Voorwaarden voor een nieuw Production GO

Een nieuw Production GO is pas verantwoord wanneer:

1. TransIP de verwachte activatiegrens of het concrete incident op
   `linweb412` heeft verklaard;
2. het verschil tussen opgeslagen sitepad en effectieve vhost expliciet in
   de releaseprocedure is gemodelleerd;
3. een begrensde activatiewachtregel is vastgesteld of bewust is verworpen;
4. de validator cache-bypass en correlatiebewijs vastlegt;
5. de nieuwe release-map opnieuw read-only tegen het manifest is bevestigd;
6. de stabiele rollbackmap intact blijft;
7. een nieuwe expliciete Production GO wordt verleend.

Tot die tijd:

**geen nieuwe DocumentRoot-switch en geen nieuwe productiepublicatie.**

## 14. Bewijsregister

### Repository

- `docs/atlas/RELEASES/WBD-2026-07-28-a0bd364-PUBLICATION-ATTEMPT-002.md`
- `docs/atlas/RELEASES/WBD-2026-07-28-a0bd364.manifest.json`
- `docs/atlas/RELEASES/WBD-2026-07-26-ca3d1bd.md`
- `website/.codex-tmp/release-preparation-001-a0bd364/publication-002-post-ipv4.json`
- `website/.codex-tmp/release-preparation-001-a0bd364/publication-002-post-ipv6.json`
- `website/.codex-tmp/release-preparation-001-a0bd364/publication-002-rollback-ipv4.json`
- `website/.codex-tmp/release-preparation-001-a0bd364/publication-002-rollback-ipv6.json`
- `docs/atlas/SPRINTS/Sprint-004.md`

### Hosting

- TransIP-controlepaneel: huidige primaire Sitepad
  `/sites/wbd-20260726-ca3d1bd`;
- TransIP-controlepaneel: Varnish, Redis en RAM-disk uitgeschakeld;
- TransIP-controlepaneel: LiteSpeed niet actief;
- TransIP File Manager: fysieke release-root en bestandsmetadata;
- Apache access- en errorlogs zoals hierboven gehasht.

### Officiële TransIP-documentatie

- DocumentRoot:
  <https://www.transip.nl/knowledgebase/6605-de-documentroot-van-je-website>
- Caching:
  <https://www.transip.nl/knowledgebase/6104-de-caching-opties-op-webhostingpakketten>
- `.htaccess` en Apache:
  <https://www.transip.nl/knowledgebase/116-wil-een-htaccess-bestand-gebruiken/>

De DocumentRoot-documentatie beschrijft hoe het pad wordt opgeslagen, maar
noemt geen activatie-SLA of bewijs dat de webserverconfiguratie al is
herladen. Dat ontbrekende contract is materieel voor deze releaseprocedure.

## Atlas Reflection

### Waarneming

De releasebestanden, netwerkpaden en validatie waren correct. De afwijking
ontstond pas tussen de opgeslagen hostingconfiguratie en de Apache-backend die
het verzoek werkelijk afhandelde.

### Begrip

Een hostingcontrolepaneel toont control-plane toestand. Een publieke hash en
een backend-accesslog tonen data-plane toestand. Deze twee werkelijkheden
kunnen tijdelijk of door een fout uiteenlopen.

### Herbruikbare les

Een configuratiewijziging is geen afgeronde publicatiehandeling. Een release
is pas actief wanneer de effectieve webserver het verwachte onveranderlijke
artefact serveert. Bij asynchrone hosting moet “opgeslagen”, “in activatie” en
“actief” als drie verschillende toestanden worden behandeld.

### Bewijsgrens

Het onderzoek bewijst waar de releaseketen uiteenliep, maar heeft geen toegang
tot de interne TransIP-vhostgenerator en reloadlogs. Daardoor kan het exacte
onderliggende mechanisme niet zonder leverancierbewijs worden benoemd.

### Onzekerheid

Onbekend blijven:

- de officiële activatie-/convergentietijd;
- of de reload vertraagd of mislukt was;
- of TransIP een ondersteunde effectieve-rootcontrole biedt;
- of de nieuwe root zonder rollback later actief zou zijn geworden.

### Terugkeertrigger

Heropen de releaseketen pas wanneer TransIP antwoord geeft op de
configuratie-/activatievragen en dat bewijs kan worden vertaald naar een
begrensde, testbare publicatieregel.

### Atlas Recommendation

**Nieuwe Execution Template aanbevolen:** eerst een
`TransIP Activation Contract & Release State Alignment` op basis van
leverancierbewijs. Geen nieuwe productiepublicatie of cachehandeling starten
voordat die bewijsgrens is gesloten.
