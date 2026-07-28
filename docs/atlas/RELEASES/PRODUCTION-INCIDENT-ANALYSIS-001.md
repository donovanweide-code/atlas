# Production Incident Analysis 001

Datum: 28 juli 2026
Release: `e6aedabe91946f0b93df0bbbb8a91d3bcd107ac7`
Status productie: rollbackversie actief
Classificatie: **meest waarschijnlijke oorzaak**

## Executive summary

De publicatievolgorde was logisch en de rollback is volgens de vooraf
vastgelegde grens uitgevoerd. De nieuwe release-map is volledig, zelfstandig
leesbaar en heeft dezelfde veilige bestandsrechten als de actieve
rollbackversie. De kandidaat werkt bovendien ongewijzigd op preview en is daar
opnieuw byte- en checksum-identiek aan het manifest bewezen.

Er is geen bewijs dat productie na de DocumentRoot-wijziging werkelijk acht
controles lang onbereikbaar was.

De acht controles waren `curl`-transportfouten met exitcode `7`: er kwam geen
HTTP-status en geen TLS-respons terug. Dezelfde fout is tijdens deze analyse
reproduceerbaar gebleken vanuit de beperkte uitvoeromgeving, terwijl zowel
productie als preview aantoonbaar bereikbaar waren. Vanuit een netwerktoegang
zonder die beperking gaven beide hosts direct en herhaaldelijk HTTP `200`.

De meest waarschijnlijke oorzaak van de acht mislukte controles is daarom een
onbetrouwbare healthcheckroute vanuit de uitvoeromgeving, niet het
releaseartefact, de release-map, `.htaccess`, DNS of het certificaat.

Dit bewijst niet met terugwerkende kracht dat productie tijdens het exacte
incidentvenster nooit kortstondig onbereikbaar is geweest. Daarvoor ontbreken
een onafhankelijke probe en leesbare serverlogs uit dat tijdvenster. Het
bewijst wel dat de acht `curl`-fouten op zichzelf geen geldig bewijs van een
productiestoring vormden.

De rollback was procedureel terecht: de toen geldende instructie vereiste
onmiddellijke rollback na een kritieke rooktestfout. De detectieregel was echter
onvoldoende in staat een websitefout van een meetfout te onderscheiden.

Er wordt binnen deze analyse geen nieuwe publicatie uitgevoerd of voorgesteld.

## 1. Tijdlijn

Alle tijden zijn CEST. Waar geen secondebewijs beschikbaar is, wordt alleen het
aantoonbare tijdvenster genoemd.

| Tijd | Gebeurtenis | Bewijs |
| --- | --- | --- |
| Voor 28 juli | Broncommit `e6aedab` geïsoleerd gebouwd | 46/46 tests, TypeScript, Vite-build en public-only controle geslaagd |
| Voor publicatie | Artefact `wbd-e6aedab-preview.zip` vastgelegd | SHA-256 `F95D1819EFC513E8782452082BA67DDFB471E7F6094D12AED336773F30064163` |
| Voor publicatie | Exacte kandidaat naar preview gebracht | `index.html`, JS, CSS, robots, sitemap en 404 checksum-identiek |
| 02:24 | Nieuwe versioned map gevuld | Alle serverbestanden in `/sites/wbd-20260728-e6aedab` tonen wijzigingstijd 02:24 |
| Circa 02:25 | DocumentRoot gewijzigd | TransIP bevestigde `/sites/wbd-20260728-e6aedab` met `Website opgeslagen` |
| 02:25:45 | Eerste productiecontrole | HTTP `200`, maar nog de oude `index-DxU6iiRJ.js` en oude ETag |
| Direct daarna | Acht bundelcontroles | Achtmaal `curl` exitcode `7`; geen HTTP-status en geen bundelnaam |
| Circa 02:27 | Rollback uitgevoerd | DocumentRoot terug naar `/sites/wbd-20260726-ca3d1bd`; TransIP bevestigde `Website opgeslagen` |
| 02:27:15 | Eerste controle na rollback | Primaire URL opnieuw HTTP `200` |
| 02:27:33–02:27:53 | Verdere rollbackcontrole | Oude bundels actief; `/over-ons` `200`; `www` `200`; onbekende route `200` |
| 08:43 | Healthcheck gereproduceerd binnen beperkte omgeving | Productie 8/8 exit `7`; preview 8/8 exit `7`, beide HTTP `000` |
| 08:43–08:44 | Dezelfde hosts buiten die netwerkbeperking gecontroleerd | Productie 4/4 HTTP `200`; preview 4/4 HTTP `200` |
| 08:47 | DNS, TLS en huidige headers gecontroleerd | DNS stabiel; TLS 1.3; geldig certificaat; beide productiehosts bereikbaar |

## 2. Feiten

### 2.1 Deployvolgorde

De aantoonbare volgorde was:

1. canonieke broncommit vastleggen;
2. geïsoleerde tests en build uitvoeren;
3. één onveranderlijk ZIP-artefact en manifest maken;
4. exact dat artefact naar preview publiceren en bytegelijkheid bewijzen;
5. een nieuwe, lege versioned productiemap aanmaken;
6. het artefact daarin uploaden en uitpakken;
7. het tijdelijke ZIP-bestand verwijderen;
8. mapstructuur en bundelnamen controleren;
9. de vorige versioned productiemap ongemoeid laten;
10. alleen de primaire DocumentRoot wijzigen;
11. onmiddellijk healthchecks uitvoeren;
12. na de kritieke fout alleen de DocumentRoot terugzetten;
13. de vorige productie en oude bundels verifiëren.

Deze volgorde is logisch en veilig. De rollback vereiste geen bestandsmutatie en
de mislukte kandidaat bleef intact voor onderzoek.

### 2.2 DocumentRoot en mapstructuur

De huidige, door TransIP getoonde DocumentRoot is:

`/sites/wbd-20260726-ca3d1bd`

De onderzochte nieuwe release-map bestaat nog als:

`/sites/wbd-20260728-e6aedab`

Beide items zijn echte directories en geen symlinks:

- actieve map: `drwxr-xr-x`;
- nieuwe map: `drwxr-xr-x`.

De nieuwe release-map bevat:

- directory `assets`;
- `.htaccess`;
- `404.html`;
- `favicon.svg`;
- `icons.svg`;
- `index.html`;
- `robots.txt`;
- `sitemap.xml`.

Alle rootbestanden zijn `-rw-r--r--`. De assetdirectory is `drwxr-xr-x`.
Alle 22 assetbestanden zijn `-rw-r--r--`.

De verwachte bundels zijn aanwezig:

- `assets/index-DX1T5CEV.js`;
- `assets/index-DWjRSiTi.css`.

De actieve rollbackmap bevat vijf rootitems:

- `assets`;
- `.htaccess` van 124 bytes;
- `favicon.svg`;
- `icons.svg`;
- `index.html` van 480 bytes.

Ook die map en bestanden gebruiken respectievelijk `755` en `644`.

Een ontbrekende index, ontbrekende asset, symlink of leesrechtenprobleem is
daarmee niet aangetoond en wordt door de serverinventarisatie tegengesproken.

### 2.3 Release-identiteit

De preview serveert tijdens deze analyse nog steeds exact:

| Bestand | HTTP | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `index.html` | 200 | 1.293 | `D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77` |
| `assets/index-DX1T5CEV.js` | 200 | 79.818 | `6C2833BEA65828BD83B80CDE8091F2ECBFF4AF80074BA252AB56D2B0722DDE28` |
| `assets/index-DWjRSiTi.css` | 200 | 170.222 | `DF61A5346BAB9EF2E03F8E26ED7EF522C6B99A9B7F6B7789355EA1EBFAA7CB24` |
| `robots.txt` | 200 | 77 | `A247B573EB85259C7C0CC575F930F9978476343E1A681D75CE4B0AA3D14B723A` |
| `sitemap.xml` | 200 | 1.003 | `B49C5EA5B376D5A2324088AC7CAE32339279919A363677C6B53410CC55E21410` |
| onbekende route / `404.html` | 404 | 2.415 | `FED425F369CDC25A40B7C94F7D6CF5DC1DB5963D753523E4DE01972960AB09D9` |

Deze waarden zijn identiek aan het canonieke manifest.

De productiemap is uit hetzelfde artefact opgebouwd en de File Manager toont
dezelfde bestandsnamen, aantallen, omvangcategorieën en rechten. De externe
bytes van die niet-actieve map zijn niet rechtstreeks opvraagbaar, omdat zij
geen eigen publieke host heeft. Een afzonderlijke serverchecksum van die map is
daarom niet bewezen.

### 2.4 DNS en TLS

De huidige DNS-werkelijkheid is:

- `webuildanddesign.nl` → `85.10.159.158`;
- `www.webuildanddesign.nl` is een alias van het hoofddomein en komt uit op
  hetzelfde adres.

De huidige TLS-controle toont:

- TLS 1.3;
- certificaat voor `CN=webuildanddesign.nl`;
- SAN voor `webuildanddesign.nl`, `www.webuildanddesign.nl` en
  `webuil.site.transip.me`;
- geldig van 26 juni 2026 tot 24 september 2026.

Het certificaat bestond al vóór het incident. Een DocumentRoot-wijziging
wijzigt de DNS-records of het certificaat niet. De incidentmeldingen waren
bovendien TCP-connectiefouten (`curl` exit `7`), geen certificaat- of
TLS-validatiefouten.

### 2.5 Webserver en logs

De publieke response identificeert de edge als `nginx`.

De gedeelde hostingomgeving verwerkt `.htaccess` aantoonbaar:

- dezelfde releaseconfiguratie werkt op preview;
- de preview geeft de bedoelde securityheaders, caching en echte 404;
- TransIP documenteert `.htaccess` voor HTML-websites als ondersteunde
  configuratie.

De onderliggende Nginx-/virtual-hostconfiguratie is in dit shared-hostingpakket
niet zichtbaar.

In `/logs` zijn aantoonbaar aanwezig:

- `access-tb-nl01-linweb412.log`;
- `access.log`;
- `error-tb-nl01-linweb412.log`;
- `error.log`;
- geroteerde `.gz`-logs.

De loginhoud kon niet betrouwbaar worden uitgelezen:

- de File Manager-download leverde
  `Unable to determine file size for download`;
- een niet-interactieve SSH-controle naar het zichtbare serveradres op poort
  22 liep af op een connectietime-out.

Daarom is niet bewezen of de acht oorspronkelijke probes de webserver hebben
bereikt. Dit is een expliciete bewijsgrens, geen stilzwijgende aanname.

### 2.6 Healthchecks

De eerste controle na de switch leverde HTTP `200`, maar nog de vorige
productie-index. Dat bewijst dat de oude versie op dat moment nog werd
geserveerd. Het bewijst niet waarom: cache, configuratie-activatie of een andere
hostinglaag zijn zonder aanvullend bewijs niet van elkaar te onderscheiden.

De daaropvolgende controle:

- deed acht aanvragen;
- wachtte vijf seconden tussen pogingen;
- zocht na iedere aanvraag naar de nieuwe bundelnaam;
- registreerde geen expliciete `curl`-exitcode of HTTP-status;
- gebruikte geen controlehost;
- gebruikte geen onafhankelijke tweede meetroute.

Alle acht aanvragen eindigden feitelijk met `curl` exitcode `7`. Daardoor was
de lege bundelnaam geen inhoudelijk resultaat; er was helemaal geen HTTP-body.

Tijdens de analyse is dezelfde controleomgeving opnieuw getest:

- stabiele productie: 8/8 exit `7`, HTTP `000`;
- stabiele preview: 8/8 exit `7`, HTTP `000`.

Direct daarna vanuit een netwerktoegang zonder die beperking:

- stabiele productie: 4/4 HTTP `200`;
- stabiele preview: 4/4 HTTP `200`.

Dit bewijst dat de healthcheckomgeving false negatives kan produceren die
visueel identiek zijn aan de acht incidentfouten.

De totale observatieduur van ongeveer veertig seconden was op zichzelf niet het
fundamentele probleem. Zonder betrouwbare probe kan geen timeout — kort of
lang — betekenisvol worden beoordeeld. De officiële TransIP-documentatie
beschrijft hoe een DocumentRoot wordt gewijzigd, maar noemt geen gegarandeerde
activatietijd.

### 2.7 WWW-redirect

Het controlepaneel toont `www.webuildanddesign.nl` als alias van
`webuildanddesign.nl`.

Na rollback retourneren hoofdhost en `www`:

- HTTP `200`;
- `Content-Length: 480`;
- dezelfde `Last-Modified`;
- dezelfde ETag;
- dezelfde oude bundels.

De actieve rollbackmap heeft een `.htaccess` van 124 bytes en levert aantoonbaar
geen `www`-redirect. Dit was al het gedrag van de vorige productieversie.

De nieuwe `.htaccess` bevat wel de expliciete hostregel:

`www.webuildanddesign.nl` → `https://webuildanddesign.nl` met HTTP `301`.

Die regel is door de rollback nooit op de productiehost gevalideerd. Het huidige
`200`-gedrag is daarom:

- bestaand gedrag van de rollbackversie;
- geen regressie van `e6aedab`;
- losstaand van de acht connectiefouten;
- nog steeds een open rooktest voor een toekomstige publicatie.

## 3. Onderzochte hypotheses

| Hypothese | Beoordeling | Bewijs |
| --- | --- | --- |
| Release-map ontbreekt of is onvolledig | Tegengesproken | Map bestaat; alle rootbestanden en 22 assets aanwezig |
| Verkeerde Unix-rechten | Tegengesproken | Directories `755`, bestanden `644`, gelijk aan actieve productie |
| Symlink wijst verkeerd | Tegengesproken | Beide versioned releases zijn echte directories |
| `index.html` verwijst naar ontbrekende bundels | Tegengesproken | Beide verwachte bundels aanwezig; preview exact werkend |
| Releaseartefact is inhoudelijk defect | Tegengesproken | Preview opnieuw volledig checksum-identiek en werkend |
| `.htaccess` veroorzaakte de connectiefouten | Niet passend bij fouttype | Een `.htaccess`-fout ontstaat na TCP/TLS en zou een HTTP-fout geven; exit `7` ontstond vóór HTTP |
| Certificaat of TLS faalde | Tegengesproken | Geldig bestaand certificaat; huidige TLS 1.3; incident gaf geen TLS-fout |
| DNS wijzigde door de DocumentRoot-switch | Geen bewijs | Huidige DNS stabiel; DocumentRoot-procedure verandert geen DNS |
| TransIP had korte activatie- of reloadtijd | Plausibel maar onbewezen | Eerste response bleef oud; officiële documentatie noemt geen activatietijd |
| Productie was werkelijk onbereikbaar | Onvoldoende bewijs | Geen onafhankelijke probe en geen leesbare logs uit het venster |
| Healthcheckomgeving blokkeerde of verloor netwerktoegang | Sterk ondersteund | Identieke 8/8 exit-`7` false negatives gereproduceerd op twee gezonde hosts; buiten beperking direct 200 |

## 4. Vastgestelde oorzaak en onzekerheden

### Classificatie

**Meest waarschijnlijke oorzaak**

De acht opeenvolgende meldingen werden zeer waarschijnlijk veroorzaakt door de
beperkte of tijdelijk onbeschikbare netwerkroute van de healthcheckomgeving.
De releaseprocedure interpreteerde deze transportfouten als
productie-onbereikbaarheid, terwijl de probe zelf niet betrouwbaar was.

### Wat wel bewezen is

- De acht checks ontvingen geen HTTP-response.
- Dezelfde healthcheckomgeving produceert identieke false negatives op twee
  gezonde WBD-hosts.
- Een netwerktoegang zonder die beperking bereikt beide hosts direct.
- De kandidaat, mapstructuur en rechten vertonen geen aangetoonde fout.
- De rollback herstelde de vorige, bekende productiegrens.

### Wat niet bewezen is

- Dat productie tijdens het incidentvenster werkelijk uit de buitenwereld
  onbereikbaar was.
- Dat productie tijdens het incidentvenster onafgebroken bereikbaar bleef.
- Hoe snel TransIP een DocumentRoot-wijziging actief maakt.
- Of een vhost-reload tijdelijk plaatsvond.
- Of de oorspronkelijke probes ooit de TransIP-webserver bereikten.
- De inhoud van access- en errorlogs rond 02:25–02:27.
- De serverchecksum van de niet-actieve productiemap.

## 5. Beoordeling van rollback

De rollback was **procedureel terecht**.

De vooraf goedgekeurde grens luidde dat bij een mislukte kritieke rooktest
onmiddellijk moest worden gestopt en teruggerold. Dat is exact uitgevoerd.

De analyse verandert niet achteraf die beslissing. Zij toont dat de definitie
van een geldige kritieke rooktest onvoldoende was. Een `curl`-transportfout uit
één niet-gevalideerde meetomgeving mag voortaan niet zonder meer gelijkstaan
aan een bewezen productiestoring.

## 6. Aanbevolen verbeteringen

Alle aanbevelingen hieronder volgen rechtstreeks uit het incident.

### 6.1 Voeg een verplichte preflight voor de meetroute toe

Vóór iedere DocumentRoot-switch:

- controleer productie én preview vanuit exact dezelfde healthcheckrunner;
- leg exitcode, HTTP-status, resolved IP en responstijd vast;
- voer geen switch uit wanneer een van beide hosts een transportfout geeft.

Dit voorkomt dat een release begint terwijl de meetroute zelf onbetrouwbaar is.

### 6.2 Scheid transport, TLS, HTTP en artefact

De healthcheck moet vier afzonderlijke uitkomsten rapporteren:

1. TCP/transport;
2. TLS/certificaat;
3. HTTP-status en headers;
4. verwachte bundel en checksum.

Een lege bundelnaam mag niet als inhoudelijke mismatch worden behandeld wanneer
`curl` geen HTTP-response heeft ontvangen.

### 6.3 Gebruik bij een kritieke fout een onafhankelijke controle

Een transportfout moet worden bevestigd door minstens één tweede, onafhankelijke
route, bijvoorbeeld:

- een externe browserrequest;
- een tweede onbeperkte netwerkprobe;
- of TransIP access/errorlogbewijs.

De controlehost preview moet gelijktijdig worden gemeten. Wanneer productie én
preview vanuit één runner tegelijk exit `7` geven, is de runner verdacht en niet
de release.

### 6.4 Maak rollbacktriggers bewijsgericht

Behoud onmiddellijke rollback voor bevestigde kritieke fouten, waaronder:

- HTTP 5xx/4xx op een vereiste route;
- verkeerde of ontbrekende bundels;
- onbedoeld `noindex`;
- beschadigde assets;
- bevestigde onbereikbaarheid vanuit een onafhankelijke tweede probe.

Classificeer een enkelvoudige transportfout zonder bevestiging eerst als
`probe invalid`. Stop verdere releasehandelingen, maar onderscheid dit van
`production failed`.

### 6.5 Leg de switchconvergentie expliciet vast

De eerste response na de switch serveerde nog de oude bundel. Een toekomstige
procedure moet daarom onderscheid maken tussen:

- oude versie nog gezond actief;
- nieuwe versie actief;
- echte foutstatus;
- ongeldige probe.

De observatieduur mag pas definitief worden gekozen nadat TransIP-gedrag via
documentatie, support of een gecontroleerde niet-productietest is vastgesteld.

### 6.6 Maak serverlogs vóór de volgende release leesbaar

TransIP schrijft voor dat `error.log` en accesslogs via File Manager of SSH
worden geraadpleegd. In deze analyse blokkeerden zowel de File
Manager-download als de directe SSH-route.

Vóór een volgende Production GO moet één read-only logroute aantoonbaar werken,
of moet bewust worden vastgesteld dat onafhankelijke externe probes de
bewijsfunctie overnemen.

### 6.7 Behoud versioned rollback

De bestaande aanpak met een onaangeroerde vorige DocumentRoot heeft aantoonbaar
gewerkt en blijft behouden.

## 7. Voorwaarden voor een nieuw Production GO

Een nieuw Production GO kan pas worden beoordeeld wanneer:

1. de healthcheckrunner productie en preview vooraf zonder transportfouten
   bereikt;
2. iedere check exitcode, HTTP-status, IP, tijdstip en artefactidentiteit
   afzonderlijk vastlegt;
3. een onafhankelijke tweede reachability-probe beschikbaar en getest is;
4. `probe invalid` en `production failed` verschillende release-uitkomsten
   zijn;
5. het verwachte gedrag tijdens DocumentRoot-activatie is vastgesteld of
   bewust begrensd;
6. een read-only logroute beschikbaar is, of het ontbreken daarvan expliciet
   als bewijsgrens is beoordeeld;
7. de intacte map `/sites/wbd-20260728-e6aedab` opnieuw tegen het canonieke
   manifest is gecontroleerd voor zover de hostinggrens dat toestaat;
8. de `www`-redirect als afzonderlijke productierooktest gehandhaafd blijft;
9. een nieuw expliciet Production GO wordt verleend.

Tot die voorwaarden zijn beoordeeld:

**geen nieuwe productiepublicatie en geen tweede omschakelpoging.**

## Bronnen

- Interne releasebasis:
  `WBD-2026-07-28-e6aedab-PRODUCTION-GO.md`
- Interne incidenthandoff:
  `WBD-2026-07-28-e6aedab-PRODUCTION-HANDOFF.md`
- Canoniek manifest:
  `WBD-2026-07-28-e6aedab.manifest.json`
- TransIP, DocumentRoot:
  https://www.transip.nl/knowledgebase/6605-de-documentroot-van-je-website
- TransIP, errorlog:
  https://www.transip.nl/knowledgebase/7411-het-error-log-webhostingpakket-inzien/
- TransIP, `.htaccess`:
  https://www.transip.nl/knowledgebase/116-wil-een-htaccess-bestand-gebruiken/
