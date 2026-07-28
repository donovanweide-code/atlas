# Production Publication Attempt 002

**Datum:** 28 juli 2026
**Definitieve status:** TERUGGEDRAAID NAAR LAATST STABIELE PRODUCTIE
**Uitvoeringscommit:** `6031f8a1138a5a3756d29ba211ffe5906188af16`
**Releaseartefact:** `wbd-a0bd364-production.zip`
**Artefact SHA-256:** `B30E9FEB6D136AD1FBBCEC4EA7A68812A90001823FE6939EE35A48ACBC7936D4`

## Samenvatting

Publication Attempt 002 is uitgevoerd volgens Release Validation Hardening
002. De verse preflight leverde via IPv4 en IPv6 geldig en overeenstemmend
bewijs op. De DocumentRoot is daarom gecontroleerd gewijzigd van:

`/sites/wbd-20260726-ca3d1bd`

naar:

`/sites/wbd-20260728-a0bd364`

De post-switchvalidatie bereikte productie en de controlehost via beide
netwerkcontexten. Beide productieroutes leverden HTTP 200 en geldige TLS, maar
de productie-HTML bevatte gedurende alle vier meetpunten niet de verwachte
nieuwe JS- en CSS-bundels.

De evaluator classificeerde dit op twee onafhankelijke geldige routes als
`Production failed` en gaf het bindende besluit `rollback`. De DocumentRoot is
daarom onmiddellijk teruggezet naar `/sites/wbd-20260726-ca3d1bd`.

De rollback is door TransIP bevestigd en vervolgens via IPv4 en IPv6 opnieuw
als bereikbaar gevalideerd. Er is geen derde publicatiepoging uitgevoerd.

## 1. Voorwaarden vóór de switch

| Controle | Resultaat |
|---|---|
| Repository-HEAD | exact `6031f8a1138a5a3756d29ba211ffe5906188af16` |
| Relevante releasebestanden | geen afwijking van de commit |
| Bestaande overige worktreewijzigingen | niet gebruikt, niet gewijzigd en niet opgenomen |
| Artefact | aanwezig; 2.149.248 bytes |
| Artefact-SHA-256 | exact gelijk aan de goedgekeurde waarde |
| Voorbereide release-directory | `/sites/wbd-20260728-a0bd364` |
| Zichtbare releasebundels | `index-DX1T5CEV.js`, `index-DWjRSiTi.css` |
| Actieve productie vóór switch | `/sites/wbd-20260726-ca3d1bd` |
| Rollbackmap | intact en direct beschikbaar |

## 2. Definitieve verse preflight

Validatieprofiel:

`920EE02400357FCF07F7953BDDCEE388E398EDDB43F2D34C857A98D7F7995942`

### IPv4

- runnercontext: `codex-network-enabled`;
- netwerkcontext: `transip-ipv4`;
- meetvenster: 28 juli 2026, 20:52:29.830Z–20:52:45.116Z;
- productie: 4/4 HTTP 200;
- controlehost: 4/4 HTTP 200;
- runner- of probe-uitval: geen;
- rapport-SHA-256:
  `1000CBC9C2C88FC1302E790E503DD8C27F350D05AD543BBA400D82EBDE87AE7D`.

### IPv6

- runnercontext: `codex-network-enabled`;
- netwerkcontext: `transip-ipv6`;
- meetvenster: 28 juli 2026, 20:53:00.422Z–20:53:15.716Z;
- productie: 4/4 HTTP 200;
- controlehost: 4/4 HTTP 200;
- runner- of probe-uitval: geen;
- rapport-SHA-256:
  `7A148F1E764081D235F2640DCDB57016711EFC714BDC973A2E725118DADA1D4B`.

### Besluit

- geldige onafhankelijke routes: 2 van 2;
- dubbele route-identiteiten: geen;
- dubbele netwerkcontexten: geen;
- classificatie: `Pass`;
- releasebesluit: `switch-eligible`;
- besluit-SHA-256:
  `6538594ABFE62C51EF3E31508A177EAB402ADC92DB89E875359D69C03F562FA6`.

## 3. DocumentRoot-switch

TransIP accepteerde `/sites/wbd-20260728-a0bd364` als nieuw sitepad en toonde
dit daarna als actieve DocumentRoot.

Er zijn geen andere hosting-, DNS-, firewall-, alias- of
infrastructuurinstellingen gewijzigd.

## 4. Post-switchvalidatie

### Gemeenschappelijke geldige lagen

Beide routes bevestigden:

- DNS-resolutie;
- transportbereikbaarheid;
- geldige TLS;
- 4/4 HTTP 200 voor productie;
- 4/4 HTTP 200 voor de controlehost;
- geldige controlehostasserties;
- geen runner- of probe-uitval.

### Kritieke afwijking

Op zowel IPv4 als IPv6 faalden in ieder productie-meetpunt:

- `canonical-js-bundle`:
  `/assets/index-DX1T5CEV.js` ontbrak;
- `canonical-css-bundle`:
  `/assets/index-DWjRSiTi.css` ontbrak.

De productie bleef daarmee de eerdere bundelverwijzingen serveren, ondanks
dat het control panel de nieuwe DocumentRoot toonde.

### Rapporten

| Route | Meetvenster | Rapport-SHA-256 |
|---|---|---|
| IPv4 | 20:54:35.443Z–20:54:50.654Z | `CCC5AE3749E1DA160EAAA22F0D8128CB50D3014DEF71EE663C03375837CF2722` |
| IPv6 | 20:55:00.684Z–20:55:15.932Z | `266A6C9E71557048C7EA13D6D81EED7773E319441EA6070475952179E338E737` |

Evaluator:

- geldige onafhankelijke routes: 2 van 2;
- IPv4: `critical-mismatch`;
- IPv6: `critical-mismatch`;
- classificatie: `Production failed`;
- releasebesluit: `rollback`;
- rollback aanbevolen: ja;
- besluit-SHA-256:
  `5484FD679992DE148BD042FC786333DFF37E7558E8F0B52A55BCB459412A009A`.

## 5. Rollback

De DocumentRoot is teruggezet naar:

`/sites/wbd-20260726-ca3d1bd`

TransIP bevestigde de wijziging met `Website opgeslagen` en toonde daarna de
oude map opnieuw als actief sitepad.

### Herstelvalidatie

| Route | Meetvenster | Productie | Controlehost | Rapport-SHA-256 |
|---|---|---:|---:|---|
| IPv4 | 20:56:52.981Z–20:57:08.193Z | 4/4 HTTP 200 | 4/4 HTTP 200 | `4DE08BC52D1DD77BC9560E34AC4DE6DB0D00EECC47B5BF9D15D5364E9788C8E9` |
| IPv6 | 20:57:18.530Z–20:57:33.773Z | 4/4 HTTP 200 | 4/4 HTTP 200 | `8A4FA996FD9C7FF9E744E839002CD1ACA7BE83C78C78BE67E76A8ECA56D67B8A` |

Gecombineerd herstelbesluit:

- classificatie: `Pass`;
- geldige onafhankelijke routes: 2 van 2;
- besluit-SHA-256:
  `74F6793721895AA9F5B55EA217AFD44939FAC5235073B23C6D4D6CC060A3CAC2`.

Aanvullende rooktest:

- homepage: HTTP 200 via IPv4 en IPv6;
- belangrijke publieke routes: HTTP 200;
- actieve stabiele bundels:
  `index-DxU6iiRJ.js` en `index-NnYm0S8a.css`;
- `www.webuildanddesign.nl`: bestaand gedrag blijft HTTP 200;
- een niet-bestaand pad levert in de herstelde bestaande productie nog HTTP
  200. Dit is bestaand soft-404-gedrag van de rollbackversie en geen regressie
  uit Attempt 002.

## 6. Afwijkingen en bewijsgrens

Bewezen:

- de nieuwe release-directory bestaat en bevat de verwachte bundels;
- het control panel accepteerde en toonde de nieuwe DocumentRoot;
- productie bleef tijdens het volledige post-switchvenster via IPv4 en IPv6
  de eerdere bundelverwijzingen serveren;
- de validator had twee geldige meetroutes en gaf terecht rollback;
- de oude productie is aantoonbaar hersteld.

Niet bewezen:

- of de afwijking wordt veroorzaakt door vertraagde activatie, caching tussen
  hostingconfiguratie en webserver, of een andere TransIP-publicatiegrens;
- of de nieuwe DocumentRoot na een langer venster alsnog actief zou zijn
  geworden.

Omdat de veiligheidsgrens expliciet geen improvisatie of verlengd wachten
toestond nadat twee geldige routes een kritieke mismatch bevestigden, is deze
onzekerheid niet op productie onderzocht.

## 7. Definitieve Production Status

**TERUGGEDRAAID NAAR LAATST STABIELE PRODUCTIE**

Actieve DocumentRoot:

`/sites/wbd-20260726-ca3d1bd`

Niet actief:

`/sites/wbd-20260728-a0bd364`

De nieuwe release is niet geaccepteerd als productieversie.

## Atlas Reflection

### Waarneming

De vernieuwde validatie onderscheidde deze keer correct een geldige
meetomgeving van een werkelijke productiemismatch. DNS, TLS, transport, HTTP,
runner en controlehost waren gezond; uitsluitend de gepubliceerde
bundelidentiteit week af.

### Begrip

Een door het control panel geaccepteerde DocumentRoot is nog geen bewijs dat
de webserver die map al werkelijk serveert. Configuratiestatus en
serveerwerkelijkheid zijn afzonderlijke bewijsgrenzen.

### Herbruikbare les

Een publicatie is pas voltooid wanneer het onveranderlijke artefact vanaf de
publieke productie-URL aantoonbaar wordt geserveerd. Het control panel kan de
handeling bevestigen, maar niet het resultaat.

### Bewijsgrens

De metingen bewijzen de aanhoudende oude bundelverwijzingen binnen het
vastgelegde post-switchvenster. Zij bewijzen niet waarom de hostinglaag de
nieuwe map nog niet serveerde.

### Onzekerheid

De werkelijke activatie- en convergentietijd van een TransIP-sitepadwijziging
is nog niet vastgesteld.

### Terugkeertrigger

Een nieuwe publicatiepoging is pas verantwoord nadat de relatie tussen de
sitepadbevestiging en de werkelijk geserveerde DocumentRoot aantoonbaar is
onderzocht en de releaseprocedure daar bewust op is beoordeeld.

### Atlas Recommendation

Geen derde publicatiepoging starten. Voer eerst een begrensde
Production Activation Analysis uit op basis van deze meetrapporten en, waar
beschikbaar, TransIP-documentatie of serverbewijs. Verlaag de bestaande
validatie- of rollbackgrens niet.
