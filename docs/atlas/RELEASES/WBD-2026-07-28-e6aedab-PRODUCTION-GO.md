# WBD Production GO-pakket — 28 juli 2026

**Template:** Atlas Execution Template 006 — Production Hardening & Evidence Closure
**Status:** GO voor gecontroleerde productiepublicatie; productie is nog niet gewijzigd
**Canonieke broncommit:** `e6aedabe91946f0b93df0bbbb8a91d3bcd107ac7`
**Remote branch:** `origin/codex/production-hardening-006`
**Artefact:** `wbd-e6aedab-preview.zip`
**Artefact SHA-256:** `F95D1819EFC513E8782452082BA67DDFB471E7F6094D12AED336773F30064163`
**Artefactomvang:** 2.151.724 bytes
**Bestanden:** 29

## Candidate-overdracht

De inhoudelijk goedgekeurde Experience Candidate is zonder Experience Development
productiegereed gemaakt. De publieke bron is geïsoleerd van bestaande Workspace-
en interne Atlas-wijzigingen, als één commit naar de remote gepusht en vanuit exact
die commit opnieuw gebouwd.

De hardening voegt uitsluitend een reproduceerbare hostinggrens toe:

- bekende publieke routes en directe deeplinks;
- een echte 404-status en een publieke foutpagina;
- permanente redirect van `www` naar de canonieke host;
- preview-`noindex, nofollow`;
- cachebeleid voor hashed assets;
- baseline-securityheaders;
- juridische routes in router, footer en sitemap;
- een public-only buildcontrole die interne Atlas-inhoud afwijst.

## Bevestigde eigenaarfeiten

| Onderdeel | Bevestigde werkelijkheid |
| --- | --- |
| Handelsnaam | We Build And Design |
| Rechtsvorm | Eenmanszaak |
| Adres | Gerard Terborchstraat 35, 1318 LE Almere |
| KvK | 69326126 |
| Btw-identificatienummer | NL190255879B01 |
| E-mail | info@webuildanddesign.nl |
| Telefoon | 06 100 67 964 |
| Voorwaarden | Primair zakelijke dienstverlening; consumenten alleen na afzonderlijke afspraken |
| Betalingstermijn | 14 dagen |
| Hosting en e-mail | TransIP |
| Broncode | GitHub |
| AI-ondersteuning | OpenAI — ChatGPT en Codex |
| Externe specialisten | Momenteel geen structurele verwerkers |
| Projectcorrespondentie | Maximaal vijf jaar |
| Fiscale administratie | Zeven jaar |
| Eindverantwoordelijkheid | Donovan: hosting, domein, GitHub, e-mail, publicatie en incidentbesluiten |
| Monitoring | Nog niet actief |

De privacytekst is uitsluitend feitelijk aangepast voor de rechtsvorm, GitHub,
OpenAI en mogelijke verwerking buiten de EER. De Experience, juridische structuur
en overige redactie zijn niet herontwikkeld.

## Nog onbevestigde eigenaarfeiten

- gebruikt boekhoudpakket en/of accountant;
- eventuele cloudopslag;
- het exacte TransIP-back-upniveau;
- een door TransIP aantoonbaar bruikbaar herstelpunt;
- afzonderlijke juridische validatie door een bevoegde jurist.

De huidige privacytekst benoemt softwareleveranciers en professionele adviseurs als
categorie. Nieuwe concrete leveranciers moeten vóór structurele verwerking van
persoonsgegevens opnieuw tegen de verklaring worden getoetst.

De onbekende TransIP-back-upstatus blokkeert deze kandidaat niet, omdat de actieve
productieversie als afzonderlijke, direct beschikbare versioned DocumentRoot is
bewezen. Het blijft wel een eigenaarshandeling om pakketniveau en herstelpunt in
TransIP vast te stellen.

## Bron- en remote-bewijs

- lokale commit: `e6aedabe91946f0b93df0bbbb8a91d3bcd107ac7`;
- remote commit: `e6aedabe91946f0b93df0bbbb8a91d3bcd107ac7`;
- remote branch: `origin/codex/production-hardening-006`;
- commit bevat uitsluitend tien releasegerelateerde bron-, review-, configuratie-
  en testbestanden;
- bestaande niet-gerelateerde Workspace- en Atlas-wijzigingen zijn niet gestaged,
  niet teruggedraaid en niet in de broncommit opgenomen.

## Reproduceerbare build

De volledige repository-inhoud van de broncommit is met `git archive` in een lege
tijdelijke map uitgepakt. Alleen de bestaande dependency-installatie is als
junction gekoppeld. Vanuit die geïsoleerde commit zijn tests en build uitgevoerd.

Resultaat:

- 46 van 46 tests geslaagd;
- TypeScript-compilatie geslaagd;
- Vite-productiebuild geslaagd;
- public-only verificatie: 29 bestanden en 9 tekstbestanden;
- npm-audit: 0 bekende kwetsbaarheden;
- geen Workspace-entrypoint, interne Atlas-route of interne case-inhoud in het
  publieke artefact.

## Artefactidentiteit

| Bestand | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 1.293 | `D46D9FF419E310DEE86B622B5A4DEBD9A962D8AC0A979FC3464B1EE68435AC77` |
| `assets/index-DX1T5CEV.js` | 79.818 | `6C2833BEA65828BD83B80CDE8091F2ECBFF4AF80074BA252AB56D2B0722DDE28` |
| `assets/index-DWjRSiTi.css` | 170.222 | `DF61A5346BAB9EF2E03F8E26ED7EF522C6B99A9B7F6B7789355EA1EBFAA7CB24` |
| `404.html` | 2.415 | `FED425F369CDC25A40B7C94F7D6CF5DC1DB5963D753523E4DE01972960AB09D9` |
| `robots.txt` | 77 | `A247B573EB85259C7C0CC575F930F9978476343E1A681D75CE4B0AA3D14B723A` |
| `sitemap.xml` | 1.003 | `B49C5EA5B376D5A2324088AC7CAE32339279919A363677C6B53410CC55E21410` |
| `.htaccess` | 2.054 | `ECF24C2E3B60486CA0B135E74EAE73B36EE2BC86D7C90B8851AF7E1C6E8AD9D9` |

Het volledige bestandsmanifest staat in
`WBD-2026-07-28-e6aedab.manifest.json`.

## Previewbewijs

Het exacte artefact is gepubliceerd naar:

`/subsites/preview.webuildanddesign.nl`

Daarna is de fysieke map opgeschoond en uitsluitend vanuit het canonieke ZIP
opnieuw opgebouwd. De preview bevat exact 29 kandidaatbestanden: 22 assets en 7
rootbestanden. Het tijdelijke ZIP-bestand en alle oude, niet-gerefereerde assets
zijn verwijderd.

Serververificatie:

- `index.html`, JS, CSS, `robots.txt`, `sitemap.xml` en de 404-respons zijn
  byte- en checksum-identiek aan het lokale manifest;
- alle 24 publiek opvraagbare assetbestanden geven HTTP 200;
- homepage, juridische routes en kennis-deeplink geven HTTP 200;
- een onbekende route geeft HTTP 404 met de canonieke `404.html`;
- `.htaccess` is publiek niet uitleesbaar en geeft HTTP 403;
- HTTP gaat permanent naar HTTPS;
- productie bleef onaangeraakt en serveert nog
  `assets/index-DxU6iiRJ.js`.

De externe browserbediening van de preview was door een eerder ingestelde
browserbeveiligingsvoorkeur geblokkeerd. Dit is niet omzeild. De visuele en
consolecontrole is daarom uitgevoerd op de lokale publieke runtime, terwijl
checksums bewijzen dat preview exact dezelfde HTML, JS, CSS en assets serveert.

Visuele/runtime-controle:

- desktopviewport 864 × 698: correcte rendering;
- mobiele viewport 639 × 698: geen horizontale overflow;
- Privacy en Algemene voorwaarden openen vanuit de footer;
- routegebonden titels en canonicals worden correct gezet;
- Privacy bevat de bevestigde GitHub- en OpenAI-informatie;
- Algemene voorwaarden vermeldt de eenmanszaak;
- e-mail- en telefoonlinks zijn correct;
- browserconsole bevat geen fouten.

## Hostingconfiguratie

De versiegebonden `.htaccess` bevat:

- uitsluitend de bekende publieke SPA-routes;
- directe deeplinkondersteuning;
- een echte 404 voor onbekende routes;
- `www.webuildanddesign.nl` → `https://webuildanddesign.nl` met HTTP 301;
- `X-Robots-Tag: noindex, nofollow` op de previewhost;
- `Cache-Control: public, max-age=31536000, immutable` voor hashed assets;
- `Cache-Control: no-cache` voor HTML, robots en sitemap;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Frame-Options: DENY`;
- een beperkte `Permissions-Policy`;
- HSTS;
- een CSP voor uitsluitend self-hosted publieke bronnen.

De headers, caching, preview-indexatieblokkade en 404 zijn op preview werkelijk
gemeten. De `www`-redirect kan pas na omschakeling van de productie-DocumentRoot
op de canonieke productiehost worden bewezen en staat daarom in de
publicatierooktest.

## SEO- en indexatiebewijs

- `robots.txt` verwijst naar
  `https://webuildanddesign.nl/sitemap.xml`;
- `sitemap.xml` bevat alle publieke routes, inclusief
  `/algemene-voorwaarden` en `/privacy`;
- iedere runtimepagina zet een routegebonden titel en canonical op de
  niet-`www` productiehost;
- preview wordt via de responseheader niet geïndexeerd en niet gevolgd;
- productie krijgt deze previewheader niet;
- Search Console blijft conform fasegrens na productie.

## Back-up- en rollbackbewijs

Huidige productie:

- actieve DocumentRoot:
  `/sites/wbd-20260726-ca3d1bd`;
- de map is in TransIP aanwezig en bevat de stabiele productiebuild;
- de publieke productie serveert nog de bijbehorende bundel
  `assets/index-DxU6iiRJ.js`;
- `/www` blijft daarnaast beschikbaar als oudere terugvalgrens.

TransIP toont een map `/backups`, maar die map bevat in de File Manager geen
zichtbaar herstelpunt. Het actuele pakketniveau en een providerherstelpunt konden
daarom niet objectief worden bevestigd.

Primaire rollback voor deze release is niet afhankelijk van die onbekende:

1. laat `/sites/wbd-20260726-ca3d1bd` volledig ongemoeid;
2. publiceer de nieuwe release naar een nieuwe versioned map;
3. wijzig alleen de primaire DocumentRoot;
4. zet bij een rollbacktrigger de DocumentRoot onmiddellijk terug naar
   `/sites/wbd-20260726-ca3d1bd`;
5. verifieer vervolgens homepage, routes en bundel
   `assets/index-DxU6iiRJ.js`;
6. laat de mislukte nieuwe map intact voor onderzoek.

Er is geen risicovolle productie-rollbacktest uitgevoerd, omdat productie niet
mag worden gewijzigd vóór een nieuw expliciet Production GO.

## Exacte publicatiestappen

Na een nieuw expliciet Production GO:

1. bevestig dat productie nog
   `/sites/wbd-20260726-ca3d1bd` gebruikt;
2. maak `/sites/wbd-20260728-e6aedab` aan;
3. upload exact `wbd-e6aedab-preview.zip`;
4. verifieer vóór uitpakken SHA-256
   `F95D1819EFC513E8782452082BA67DDFB471E7F6094D12AED336773F30064163`;
5. pak het archief uit in de nieuwe map;
6. verwijder het tijdelijke ZIP-bestand;
7. controleer 29 bestanden en de twee bundelnamen;
8. wijzig de primaire DocumentRoot naar
   `/sites/wbd-20260728-e6aedab`;
9. voer onmiddellijk de onderstaande rooktest uit;
10. leg actieve DocumentRoot, tijdstip en resultaten vast.

## Rooktest na publicatie

- `https://webuildanddesign.nl/` geeft HTTP 200;
- `http://webuildanddesign.nl/` gaat naar HTTPS;
- `https://www.webuildanddesign.nl/` geeft HTTP 301 naar de niet-`www` host;
- alle publieke en juridische routes geven HTTP 200;
- een onbekende route geeft HTTP 404;
- JS is `index-DX1T5CEV.js`;
- CSS is `index-DWjRSiTi.css`;
- HTML, JS, CSS, robots en sitemap hebben de vastgelegde checksums;
- alle publieke assets laden;
- canonical, robots en sitemap wijzen naar de productiehost;
- productie heeft géén `X-Robots-Tag: noindex`;
- securityheaders en cachebeleid zijn actief;
- footerlinks, e-mail en telefoon werken;
- desktop en mobiel tonen geen kritieke visuele afwijking;
- browserconsole bevat geen kritieke fout.

## Rollbacktrigger

Rollback direct wanneer één van deze situaties tijdens de publicatierooktest
optreedt:

- homepage of een primaire/juridische route is niet bereikbaar;
- de actieve bundels of checksums wijken af;
- assets ontbreken of de browserconsole bevat een kritieke fout;
- productie krijgt onbedoeld `noindex`;
- canonicals, redirects of echte 404 werken niet;
- contactroutes werken niet;
- de visuele Experience is aantoonbaar beschadigd.

## Resterende onzekerheden

Niet blokkerend voor gecontroleerde publicatie:

- boekhoudleverancier en eventuele cloudopslag nog niet benoemd;
- providerback-upniveau en providerherstelpunt niet aangetoond;
- geen actieve monitoring;
- Search Console nog niet ingericht;
- geen analytics zonder concrete leervraag;
- juridische tekst niet afzonderlijk door een jurist gevalideerd.

Deze punten wijzigen de huidige no-form/no-analytics releasegrens niet. Nieuwe
leveranciers of gegevensstromen vereisen vóór activering een nieuwe
privacytoets.

## Eindoordeel

**GO — de kandidaat is reproduceerbaar, naar preview uitgelijnd, via een
bewezen versioned productieversie herstelbaar en gereed voor gecontroleerde
publicatie.**

Dit is geen toestemming om productie nu te wijzigen. Daarvoor blijft een nieuw,
expliciet Production GO van Donovan vereist.

## Atlas Reflection

### Waarneming

Een inhoudelijk goedgekeurde Experience was nog niet automatisch één
reproduceerbare release. De grootste risico's zaten in bronisolatie, oude
previewbestanden, hostinggedrag en bewijs van herstelbaarheid.

### Begrip

Releasekwaliteit ontstaat pas wanneer broncommit, artefact, geserveerde bytes,
hostingconfiguratie en rollback naar dezelfde kandidaat verwijzen. Een werkende
pagina alleen is daarvoor onvoldoende.

### Herbruikbare les

Bouw een publieke release altijd uit een schone commit, publiceer naar een lege
of opgeschoonde versiegrens en bewijs zowel de actuele als de vorige
DocumentRoot. Verouderde hashed bestanden moeten niet stilzwijgend als
deploymentwerkelijkheid blijven bestaan.

### Bewijsgrens

Het TransIP-back-upniveau en een providerherstelpunt zijn niet aangetoond. De
versioned productie-DocumentRoot is wel aantoonbaar beschikbaar als primaire
rollback.

### Onzekerheid

De boekhoudleverancier, eventuele cloudopslag en afzonderlijke juridische
validatie zijn nog niet bevestigd. Ook is monitoring nog niet actief.

### Terugkeertrigger

Heropen Production Hardening wanneer een nieuwe gegevensstroom, leverancier,
contactformulier, analytics, hostingmigratie of afwijkende releasevorm wordt
ingevoerd.

### Atlas Recommendation

**Production GO-beoordeling aanbevolen.** Publiceer pas na het expliciete GO en
voer dan uitsluitend de vastgelegde versiegebonden publicatie- en
rollbackprocedure uit.
