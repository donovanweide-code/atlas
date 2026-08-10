# Technisch incidentrapport — DocumentRoot niet effectief op Apache

## 1. Incidentidentificatie

| Onderdeel | Waarde |
|---|---|
| Datum incident | 28 juli 2026 |
| Domein | `webuildanddesign.nl` |
| Preview | `preview.webuildanddesign.nl` |
| Hosting | TransIP shared webhosting (`webuil`), 100 GB |
| Commerciële pakketnaam | Niet zichtbaar in het klantpaneel |
| TransIP-productreferentie | `202162774` |
| Primair siteobject | `922418da-6ea2-484c-9c82-547ecdabcf6c` |
| Preview-siteobject | `c5d45bce-064c-4713-9ee1-685e50c6503c` |
| SFTP/SSH-host | `webuil.ssh.transip.me` |
| Hostinggebruiker | `webuildanddesignnl` |
| Publieke webserverheader | `Server: nginx` |
| Apache-backend uit logs | `tb-nl01-linweb412` / `linweb412` |
| Canonieke broncommit | `a0bd3641bafe83587cf210212f2a1e5f0160632a` |
| Uitvoeringscommit | `6031f8a1138a5a3756d29ba211ffe5906188af16` |
| Incidentonderzoekcommit | `691cf1536a549ff21e0216bfb672253f615464fd` |
| Releaseartefact | `wbd-a0bd364-production.zip` |
| Artefact SHA-256 | `B30E9FEB6D136AD1FBBCEC4EA7A68812A90001823FE6939EE35A48ACBC7936D4` |
| Artefactomvang | 2.149.248 bytes |
| Oude/stabiele DocumentRoot | `/sites/wbd-20260726-ca3d1bd` |
| Nieuwe beoogde DocumentRoot | `/sites/wbd-20260728-a0bd364` |
| Definitieve productiestatus | Teruggedraaid naar stabiele productie |

De commerciële naam van het hostingpakket was niet zichtbaar in het
klantpaneel. TransIP kan die koppelen aan productreferentie `202162774`.

## 2. Managementsamenvatting

De nieuwe release was volledig en correct aanwezig in
`/sites/wbd-20260728-a0bd364`. De fysieke nieuwe `index.html` was 1.293 bytes,
had SHA-256
`D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77`
en verwees naar:

- `/assets/index-DX1T5CEV.js`;
- `/assets/index-DWjRSiTi.css`.

Vlak vóór de omschakeling slaagden onafhankelijke IPv4- en IPv6-metingen.
Het TransIP-controlepaneel accepteerde vervolgens de nieuwe DocumentRoot en
toonde `/sites/wbd-20260728-a0bd364` als actief websitepad.

Direct na die bevestiging bleven alle acht productiecontroles via IPv4 en
IPv6 echter exact de oude HTML leveren:

- 480 bytes;
- SHA-256
  `483BB096F17C8535CAA9844FFB8FFF8F44CFF5CC8759AFAEB55392E4F3339A63`;
- `Last-Modified: Sun, 26 Jul 2026 12:24:07 GMT`;
- `ETag: "1e0-65782aea81212"`;
- JS: `/assets/index-DxU6iiRJ.js`;
- CSS: `/assets/index-NnYm0S8a.css`.

De preview leverde in hetzelfde meetvenster wél exact de nieuwe HTML. Alle
requests zijn teruggevonden in het Apache-accesslog van `linweb412`. Dit
bewijst dat de verzoeken de backend bereikten en dat de oude respons niet
uitsluitend uit een browsercache of een edge-cache vóór Apache kwam.

De releasevalidator classificeerde de situatie op twee onafhankelijke routes
terecht als `Production failed`. De DocumentRoot werd teruggezet naar
`/sites/wbd-20260726-ca3d1bd`; de rollbackvalidatie slaagde via IPv4 en IPv6.

### Bewezen directe oorzaak

Tijdens het post-switchvenster liepen de door het TransIP-controlepaneel
getoonde DocumentRoot en de effectief door de Apache-backend geserveerde
release uiteen.

### Nog door TransIP vast te stellen

Met klanttoegang is niet zichtbaar of de onderliggende oorzaak lag in:

- niet of vertraagd genereren van de Apache VirtualHost-configuratie;
- een niet uitgevoerde, mislukte of vertraagde VirtualHost-reload;
- asynchrone configuratiepropagatie;
- een tijdelijk achterblijvende backend-node of interne mapping.

## 3. Impact

- De bestaande productie bleef bereikbaar.
- Bezoekers ontvingen de stabiele oude release.
- De nieuwe release werd niet effectief als productie geserveerd.
- De geautomatiseerde veiligheidsprocedure detecteerde de inhoudelijke
  mismatch en voerde rollback uit.
- Er was geen blijvende eindgebruikersstoring en geen gegevensverlies.
- Er is na de rollback geen nieuwe publicatiepoging uitgevoerd.

## 4. Chronologische tijdlijn

Alle tijden zijn op 28 juli 2026. CEST is UTC+2.

| Tijd CEST | Tijd UTC | Gebeurtenis | Resultaat/bewijs |
|---|---|---|---|
| 21:25–21:26 | 19:25–19:26 | Nieuwe releasebestanden aanwezig | `index.html` 1.293 bytes; nieuwe JS/CSS aanwezig; rechten `0644` |
| 22:52:29–22:52:45 | 20:52:29–20:52:45 | Verse IPv4-preflight | Productie 4/4 HTTP 200; preview 4/4 HTTP 200; geldig bewijs |
| 22:53:00–22:53:15 | 20:53:00–20:53:15 | Verse IPv6-preflight | Productie 4/4 HTTP 200; preview 4/4 HTTP 200; geldig bewijs |
| Tussen 22:53:15 en 22:54:35 | Tussen 20:53:15 en 20:54:35 | DocumentRoot gewijzigd | Paneel accepteerde en toonde `/sites/wbd-20260728-a0bd364` |
| 22:54:35–22:54:50 | 20:54:35–20:54:50 | Post-switch IPv4 | Productie 4/4 HTTP 200, maar exact oude HTML; preview exact nieuwe HTML |
| 22:55:00–22:55:15 | 20:55:00–20:55:15 | Post-switch IPv6 | Productie 4/4 HTTP 200, maar exact oude HTML; preview exact nieuwe HTML |
| Na 22:55:15 | Na 20:55:15 | Releasebesluit | `Production failed` en bindend besluit `rollback` |
| Voor 22:56:53 | Voor 20:56:53 | Rollback | Paneel accepteerde `/sites/wbd-20260726-ca3d1bd` opnieuw |
| 22:56:53–22:57:08 | 20:56:53–20:57:08 | Rollbackvalidatie IPv4 | Productie en preview 4/4 HTTP 200; `Pass` |
| 22:57:18–22:57:33 | 20:57:18–20:57:33 | Rollbackvalidatie IPv6 | Productie en preview 4/4 HTTP 200; `Pass` |
| 23:10:42–23:10:43 | 21:10:42–21:10:43 | Read-only nameting | Productie nog oude hash; preview nieuwe hash; IPv4 en IPv6 |

De exacte seconde waarop de wijziging intern door TransIP werd verwerkt, is
niet beschikbaar in de klantlogs. Dit is een van de gegevens die TransIP via
de control-plane audit kan aanvullen.

## 5. Uitgevoerde validaties

### 5.1 Validatieprofiel

`920EE02400357FCF07F7953BDDCEE388E398EDDB43F2D34C857A98D7F7995942`

De validator gebruikte user-agent:

`Atlas-Release-Validator/1.0`

Per netwerkroute werden productie en preview als controlehost viermaal
gemeten met circa vijf seconden tussen de pogingen. De controles omvatten:

- runner- en netwerkcontext;
- DNS-resolutie;
- transport;
- TLS;
- HTTP-status;
- responsebody;
- aanwezigheid van de verwachte JS- en CSS-bundel;
- onafhankelijkheid van IPv4- en IPv6-routes.

### 5.2 Preflight vóór de switch

| Route | Meetvenster UTC | Productie | Preview | Classificatie |
|---|---|---:|---:|---|
| IPv4 | 20:52:29.830–20:52:45.116 | 4/4 HTTP 200 | 4/4 HTTP 200 | Geldig |
| IPv6 | 20:53:00.422–20:53:15.716 | 4/4 HTTP 200 | 4/4 HTTP 200 | Geldig |

Gecombineerd:

- twee onafhankelijke geldige netwerkmetingen;
- geen runner- of probe-uitval;
- classificatie `Pass`;
- besluit `switch-eligible`.

### 5.3 Direct na de switch

| Route | Meetvenster UTC | Productie | Preview | Inhoudelijk resultaat |
|---|---|---:|---:|---|
| IPv4 | 20:54:35.443–20:54:50.654 | 4/4 HTTP 200 | 4/4 HTTP 200 | Productie exact oude HTML; preview exact nieuwe HTML |
| IPv6 | 20:55:00.684–20:55:15.932 | 4/4 HTTP 200 | 4/4 HTTP 200 | Productie exact oude HTML; preview exact nieuwe HTML |

DNS, transport, TLS en HTTP waren gezond. De kritieke fout was een
artefactmismatch op beide onafhankelijke routes:

- `canonical-js-bundle` ontbrak op productie;
- `canonical-css-bundle` ontbrak op productie.

Gecombineerd:

- IPv4: `critical-mismatch`;
- IPv6: `critical-mismatch`;
- classificatie `Production failed`;
- besluit `rollback`.

### 5.4 Na rollback

| Route | Meetvenster UTC | Productie | Preview | Classificatie |
|---|---|---:|---:|---|
| IPv4 | 20:56:52.981–20:57:08.193 | 4/4 HTTP 200 | 4/4 HTTP 200 | Geldig |
| IPv6 | 20:57:18.530–20:57:33.773 | 4/4 HTTP 200 | 4/4 HTTP 200 | Geldig |

Gecombineerd:

- twee onafhankelijke geldige routes;
- classificatie `Pass`;
- stabiele oude productie aantoonbaar hersteld.

## 6. Bewijs uit serverlogs

### 6.1 Apache-accesslog

Bestand:

`access-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z`

- omvang: 355.092 bytes;
- SHA-256:
  `CD3FC743CC1D8F51010A4573508EB3A9E2219CA43FA4823BFB55776EFCC6B866`.

Het log bevat alle preflight-, post-switch- en rollbackrequests van
`Atlas-Release-Validator/1.0`.

Validatorbronadressen:

- IPv4: `77.164.172.232`;
- IPv6: `2a02:a46e:5f7:0:472f:6d95:1449:3155`.

Voor ieder post-switchmeetpunt staat:

- één productieantwoord van 480 bytes;
- één previewantwoord van 1.293 bytes.

Dit patroon komt op alle acht post-switchmetingen voor. Apache ontving dus
beide hostrequests, maar leverde voor het hoofddomein de oude HTML en voor de
preview de nieuwe HTML.

### 6.2 Apache-errorlog

Bestand:

`error-tb-nl01-linweb412.log.rotated_2026-07-28T21_09_14Z`

- omvang: 335.014 bytes;
- SHA-256:
  `3F227A0A3702601FF56FA3D68E1D137521D806D500EFC96A1F7FC0FB3E1507F1`.

Het errorlog bevat Apache-/ModSecurity-verwijzingen en paden onder
`/usr/local/httpd/conf/`, waarmee de Apache-backend aantoonbaar is. Rond het
incidentvenster staan geen klantzichtbare fouten over DocumentRoot,
VirtualHost, rechten, ontbrekende bestanden of configuratiereload.

Afwezigheid van zo'n fout sluit een interne reload- of propagatiefout niet
uit; die kan in niet-klanttoegankelijke platformlogs staan.

## 7. Release- en bestandvergelijking

| Bron | Bytes | SHA-256 | JavaScript | CSS |
|---|---:|---|---|---|
| Nieuwe fysieke release | 1.293 | `D46D...AC77` | `index-DX1T5CEV.js` | `index-DWjRSiTi.css` |
| Preview tijdens incident | 1.293 | `D46D...AC77` | `index-DX1T5CEV.js` | `index-DWjRSiTi.css` |
| Oude stabiele productie | 480 | `483B...9A63` | `index-DxU6iiRJ.js` | `index-NnYm0S8a.css` |
| Productie na switch | 480 | `483B...9A63` | `index-DxU6iiRJ.js` | `index-NnYm0S8a.css` |

De nieuwe fysieke release bevatte:

- `index.html`: 1.293 bytes, `0644`;
- `assets/index-DX1T5CEV.js`: 79.818 bytes, `0644`;
- `assets/index-DWjRSiTi.css`: 170.222 bytes;
- `.htaccess`, `404.html`, `robots.txt`, `sitemap.xml` en overige assets.

De nieuwe HTML in de release-directory was exact gelijk aan het
releasemanifest en de preview. Upload, build, assetnamen en rechten verklaren
het incident niet.

## 8. DNS en routering

Ten tijde van het onderzoek:

- apex A: `85.10.159.158`;
- apex AAAA: `2a01:7c8:f0:10e2::8c42:d0a3`;
- preview gebruikte dezelfde A- en AAAA-adressen;
- `www` was een CNAME naar het apex-domein;
- nameservers: `ns1.transip.nl`, `ns2.transip.eu`,
  `ns0.transip.net`.

Zowel IPv4 als IPv6 vertoonde hetzelfde inhoudelijke gedrag. Er was geen
routegebonden verschil en TLS bleef geldig.

## 9. Uitgesloten oorzaken

| Hypothese | Beoordeling | Bewijs |
|---|---|---|
| Foutieve build | Uitgesloten | Artefact, manifest, fysieke release en preview hebben dezelfde nieuwe HTML/hash |
| Onvolledige upload | Uitgesloten | Nieuwe index, JS, CSS en overige releasebestanden fysiek aanwezig |
| Bestandsrechten | Uitgesloten als directe oorzaak | Gecontroleerde hoofdassets waren leesbaar en `0644` |
| DNS-wijziging | Uitgesloten | DNS bleef stabiel; IPv4 en IPv6 bereikten de hostingomgeving |
| TLS-probleem | Uitgesloten | Geldige TLS op alle pre- en post-switchmetingen |
| Browsercache | Uitgesloten | Geautomatiseerde netwerkmetingen; alle requests staan in Apache-accesslog |
| Cloudflare/CDN | Uitgesloten | Directe TransIP-DNS; geen Cloudflare-route of CDN-bewijs |
| Cache vóór Apache | Uitgesloten | Alle validatorrequests bereikten Apache op `linweb412` |
| PHP OPCache | Niet relevant | Het incident betrof statische HTML en assets |
| Preview als foutieve controle | Uitgesloten | Preview leverde gelijktijdig exact de nieuwe fysieke release |

In het TransIP-paneel stonden Redis, Varnish en RAM-disk uitgeschakeld.
LiteSpeed was niet actief. De publieke respons bevatte geen
`Age`, `Via`, `X-Cache` of Cloudflare-headers.

Een niet-klantzichtbare Apache-contentcache kan niet absoluut worden
uitgesloten. Er is daarvoor echter geen positief bewijs, terwijl de
control-plane/data-plane-afwijking direct is aangetoond.

## 10. Onderzoeksvragen voor TransIP

Wij vragen TransIP expliciet om de volgende punten te onderzoeken en
beantwoorden:

1. Is de DocumentRoot-wijziging naar
   `/sites/wbd-20260728-a0bd364` op 28 juli 2026 rond 22:53–22:54 CEST
   daadwerkelijk in de actieve Apache VirtualHost op `linweb412`
   overgenomen?
2. Is na de wijziging een VirtualHost-configuratie gegenereerd en een
   Apache-reload uitgevoerd? Wat waren tijdstip en resultaat?
3. Bestaat op deze hostingomgeving een bekende propagatie- of
   activatievertraging tussen bevestiging in het controlepaneel en de
   effectieve webserverconfiguratie?
4. Kan een backend-node of interne mapping tijdelijk een oude VirtualHost of
   DocumentRoot blijven gebruiken nadat het controlepaneel de nieuwe waarde
   toont?
5. Zijn control-plane auditlogs, configuratiegeneratielogs,
   reload-/deploylogs of andere platformlogs voor dit tijdvenster
   beschikbaar?
6. Zijn er bekende incidenten, beperkingen of afwijkingen op
   `linweb412` die dit gedrag kunnen verklaren?

## 11. Voorgestelde interne reproductie door TransIP

Zonder een nieuwe klantpublicatie uit te voeren kan TransIP het incident
onderzoeken door:

1. het audit-event voor siteobject
   `922418da-6ea2-484c-9c82-547ecdabcf6c` rond 22:53–22:54 CEST op te zoeken;
2. de door het platform gegenereerde Apache-vhost vóór en na dat event te
   vergelijken;
3. de reloadqueue en het reloadresultaat op `linweb412` te controleren;
4. de effectieve DocumentRoot of interne mapping voor
   `webuildanddesign.nl` op het incidentmoment vast te stellen;
5. te controleren of de publieke Nginx-laag naar één of meer backends
   routeerde en of een node een oudere configuratie behield;
6. het werkelijke activatietijdstip te vergelijken met de logregels van
   `Atlas-Release-Validator/1.0`.

Er is geen nieuwe DocumentRoot-switch nodig om de historische
control-plane- en webserverlogs te onderzoeken.

## 12. Gewenste uitkomst van support

Wij ontvangen graag:

- de vastgestelde interne oorzaak;
- het exacte of verwachte activatievenster voor een DocumentRoot-wijziging;
- bevestiging of de melding `Website opgeslagen` alleen control-plane-
  acceptatie betekent of ook effectieve webserveractivatie;
- een advies voor een betrouwbare, door TransIP ondersteunde
  publicatiecontrole;
- eventuele relevante platformincident- of logreferenties.

## 13. Bewijsgrens en huidige status

Bewezen is dat de nieuwe release correct op de server stond, het paneel de
nieuwe DocumentRoot toonde en Apache tijdens het post-switchvenster oude
productie-HTML bleef leveren.

Niet bewezen is welke interne TransIP-stap de afwijking veroorzaakte. Die
vaststelling vereist platformlogs of de effectieve vhostconfiguratie waar de
klant geen toegang toe heeft.

De productie is stabiel teruggezet naar:

`/sites/wbd-20260726-ca3d1bd`

Er wordt geen nieuwe publicatie uitgevoerd totdat dit incident is begrepen en
de publicatieprocedure bewust op het TransIP-gedrag is afgestemd.

