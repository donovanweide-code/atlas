# Atlas Context-First Production Deployment V1

**Datum:** 4 augustus 2026  
**Status:** **GO — gevalideerde Context-First Candidate live voor praktijkreview**  
**Scope:** uitsluitend `experience.webuildanddesign.nl`; de bestaande Experience en publieke website zijn niet vervangen

## Live kandidaat

**https://experience.webuildanddesign.nl/context-first-experiment.html?route=B**

De kandidaat is als afzonderlijke route toegevoegd aan een nieuwe versioned kopie van de gezonde Runtime 6.0-release. De bestaande `/ervaar`-ingang, uitnodigingsroutes, API, PHP Runtime, centrale opslag en Observatory blijven byte-identiek aan de vorige release.

## Actieve release en rollback

- actieve DocumentRoot: `/sites/wbd-experience-20260804-5me1w5v6`;
- directe rollbackdirectory: `/sites/wbd-experience-20260804-cdi4nuot`;
- bestaande Experience-asset: `assets/experience-Cdi4Nuot.js`;
- kandidaatasset: `assets/context-first-5ME1w5V6.js`;
- kandidaatstylesheet: `assets/context-first-Ddb3G2F6.css`;
- releasearchief: `tmp/experience-documentroot-20260804-5me1w5v6.tar.gz`;
- releasearchief: 52.087 bytes, mode `0600`;
- releasearchief SHA-256: `D4DE0542541ED1917BACCC8AB638616B620CFE89C5F677CD8C653A08C7163610`.

Directe applicatierollback bestaat uitsluitend uit het terugzetten van de Experience-DocumentRoot naar:

`/sites/wbd-experience-20260804-cdi4nuot`

Er is geen databasewijziging of migratie uitgevoerd. Een normale rollback vereist daarom geen databaseherstel.

## Pre-releaseback-ups

Vóór de nieuwe releasekopie en DocumentRoot-wissel zijn twee afzonderlijke herstelbronnen gemaakt.

### Volledige databaseback-up

- pad: `tmp/experience-before-context-first-20260804-080233.sql`;
- omvang: 97.141 bytes;
- mode: `0600`;
- SHA-256: `6EA54665DE9445EF4D69DE64DE76DAC6C6BDA66AFBF0847F244B96C79F288683`;
- mysqldump completion marker: aanwezig;
- tabellen op back-uptijdstip: 11.

### Archief van de actieve Runtime 6.0-DocumentRoot

- pad: `tmp/experience-documentroot-before-context-first-20260804-080233.tar.gz`;
- omvang: 44.019 bytes;
- mode: `0600`;
- SHA-256: `A2353295F10698CCD224408BD09B814A020EAA56B7F2EF0C7773C60454A48E2B`.

## Publicatiegrens

De nieuwe DocumentRoot is eerst server-side als exacte kopie van `/sites/wbd-experience-20260804-cdi4nuot` gemaakt. Voor activatie zijn de volgende productieonderdelen byte-voor-byte vergeleken en gelijk bevonden:

- `index.html`;
- `.htaccess`;
- `api/index.php`;
- `api/atlas-runtime.php`;
- `assets/experience-Cdi4Nuot.js`;
- `assets/experience-DNJAGAEK.css`.

Daarna zijn uitsluitend drie nieuwe bestanden toegevoegd:

| Bestand | Bytes | SHA-256 |
| --- | ---: | --- |
| `context-first-experiment.html` | 505 | `423CC3DF210363D004DDD6E33BF7E844038ECAED1BA9E13B8BA6213C2F4DE7DF` |
| `assets/context-first-5ME1w5V6.js` | 18.790 | `50DDB30A2148011E59B6DC41503ED0B1DCEC581A2538C8C21BD3E973A99F29DB` |
| `assets/context-first-Ddb3G2F6.css` | 6.528 | `BDBCB8D4891C23A742B91AAC277640F5CB25E0212B9288307D78DC5478CA3EF5` |

De externe live hashes zijn na propagatie opnieuw opgehaald en zijn exact gelijk aan de lokaal gevalideerde build.

## Technische validatie

- volledige testset: **188/188 geslaagd**;
- Context-First tests: **8/8 geslaagd**;
- TypeScript: geslaagd;
- Context-First build: geslaagd;
- bestaande Experience-build: geslaagd;
- publieke public-only build: geslaagd, 29 bestanden en 9 tekstbestanden gecontroleerd;
- PHP 8.2.33;
- `api/index.php`: `php -l` geslaagd;
- `api/atlas-runtime.php`: `php -l` geslaagd.

## Productieacceptatie

### Context-First route

Een volledig nieuwe browserflow is uitgevoerd:

1. organisatie: We Build And Design;
2. website: `webuildanddesign.nl`;
3. brongebonden eerste beeld verschijnt;
4. deelnemerinput, publieke informatie, voorlopige inferentie en onbekende zijn zichtbaar gescheiden;
5. de gevalideerde afgeleide eerste vraag verschijnt;
6. browserconsole: 0 fouten, 0 waarschuwingen.

### Bestaande Experience

- `/ervaar` opent de bestaande Runtime 6.0-Experience;
- een bestaande Runtime 6.0-acceptatiesessie wordt nog correct als hervatbare sessie getoond;
- productie blijft `assets/experience-Cdi4Nuot.js` serveren;
- API bereikt PHP en MySQL en retourneert zonder deelnemerscredential correct `401`;
- Observatory opent achter het bestaande beheerwachtwoord;
- browserconsole Experience: 0 fouten, 0 waarschuwingen;
- browserconsole Observatory: 0 fouten, 0 waarschuwingen.

### Centrale opslag

Na acceptatie:

- tabellen: 11;
- uitnodigingen: 17;
- sessies: 14;
- Runtime States: 1;
- Runtime Journal-entries: 3;
- Observatory-events: 143;
- feedbackrecords: 2.

De Context-First Candidate is in deze release bewust een afzonderlijke praktijkroute en schrijft geen nieuwe centrale sessie- of Observatory-records. Er is geen database- of Runtime-integratie toegevoegd.

De pre-releaseback-up telde 15 sessies. Eén niet-technische 6.0-sessie is tijdens het acceptatievenster via de bestaande expliciete deelnemersverwijdering ingetrokken:

- uitnodigingsstatus: `revoked`;
- `technical_test`: `0`;
- ingetrokken: 4 augustus 2026 08:13 CEST;
- geen nieuwe sessie na de back-up;
- alle overige sessies zijn ongewijzigd aanwezig.

De bestaande code kan een sessie alleen op deze manier verwijderen na de expliciete bevestiging `VERWIJDER MIJN SESSIE`. De DocumentRoot-wissel bevatte geen databaseactie en is niet de oorzaak van deze intrekking.

## HTTPS, indexatie en publieke grens

- kandidaat: HTTP `200`;
- HTTP wordt `301` naar HTTPS;
- HSTS: `max-age=31536000`;
- `X-Robots-Tag`: `noindex, nofollow, noarchive, nosnippet, noimageindex`;
- `robots.txt`: `Disallow: /`;
- `sitemap.xml`: HTTP `404`;
- publieke website: HTTP `200` en ongewijzigd `assets/index-BqT0vFtt.js`;
- server-errorlog: geen nieuwe Experience-, PHP- of kandidaatfout na activatie; de laatste regel vóór activatie was een geblokkeerde externe WordPress-probe.

## Beveiligingsopruiming

- drie tijdelijke serverhelpers verwijderd;
- tijdelijke TransIP SSH-public key verwijderd;
- TransIP toont daarna `Geen SSH-key`;
- aansluitende SSH-poging: exit `255`, `Permission denied`;
- beide tijdelijke lokale keypairs verwijderd;
- private Experience-config blijft uitsluitend buiten de DocumentRoot in `/sites/experience-private/config.php`;
- databaseback-ups, releasearchieven en rollbackdirectory bleven intact.

## Besluit

De gecontroleerde productie-uitrol is **GO**. De gevalideerde Context-First Candidate is live als afzonderlijke praktijkroute, terwijl Runtime 6.0, bestaande sessies, API, Observatory, noindex, publieke website en directe rollback operationeel blijven.

Er worden na deze oplevering geen verdere Experience-wijzigingen uitgevoerd. De praktijkwaarneming is nu leidend.
