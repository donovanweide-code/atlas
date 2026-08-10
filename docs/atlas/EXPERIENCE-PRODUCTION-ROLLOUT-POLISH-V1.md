# Productie-uitrol + Experience Polish V1

Datum: 3 augustus 2026  
Status: **GO**

## Productie-uitrol

De Experience Validation Environment is gecontroleerd gepubliceerd op
<https://experience.webuildanddesign.nl>. De publieke website is niet
gepubliceerd of gewijzigd.

- actieve DocumentRoot: `/sites/wbd-experience-20260803-cjgeeoit`;
- directe rollback: `/sites/wbd-experience-20260803-conrwi1g`;
- tweede rollback: `/sites/wbd-experience-20260803-1adp8tc`;
- productieartefact: `experience-documentroot-20260803-cjgeeoit.tar.gz`;
- SHA-256 artefact:
  `024E634A4C05ECD2BFDF88D7874E1DEA008FA62DA41B7C49645EDCCFB0C1A8E1`;
- actieve frontend: `assets/experience-CJGeEoit.js` en
  `assets/experience-xwTGsv-E.css`;
- PHP-runtime: PHP 8.2.33; de productie-API slaagde voor `php -l`.

Vóór de migratie is een volledige databaseback-up gemaakt:

- bestand: `tmp/experience-before-conversation-insight-20260803-173633.sql`;
- omvang: 26.360 bytes;
- rechten: `0600`;
- SHA-256:
  `316E9F002666B87142971AB946436405D5DE92EA9F2932FCB3687DFAB4D80206`.

Migratie `003-conversation-insight.sql` is eenmaal en zonder fout toegepast.
De bestaande sessies bleven intact: één sessie op `2.0-validation-v1` en vijf
sessies op `2.1-organic-entry-v1`, zowel vóór als na de migratie. Nieuwe
sessies gebruiken automatisch `3.0-conversation-insight-v1`.

## Experience Polish Review

Dit was een gerichte polishronde, geen redesign. Er zijn geen schermen,
vragen, analyses of functies toegevoegd.

De zichtbare branding is gelijkgetrokken met de publieke website: hetzelfde
W/BD-beeldmerk, hetzelfde woordmerk, dezelfde rustige headerpositie en
dezelfde typografische hiërarchie. De eerste uitleg is menselijker gemaakt en
beschrijft nu wat iemand ervaart, niet hoe het systeem werkt.

De invoervelden hebben een iets duidelijkere ruststand en focusstatus gekregen.
De geheugensteunen zijn beter leesbaar, maar blijven visueel ondergeschikt en
niet voorschrijvend. Op mobiel zijn alle zichtbare actieknoppen minimaal 44 px
hoog. Bij 390 × 844 px was geen horizontale overflow aanwezig; focus,
scrollgedrag, CTA-zichtbaarheid en hervatten na refresh bleven correct.

De overgangen zijn opnieuw in samenhang beoordeeld. De bestaande volgorde —
vraag, luistermoment, volgende vraag, samenvatting, voorzichtig inzicht en
vrijwillige verdieping — blijft logisch en rustig. Er is geen nieuwe animatie
of overgangslogica toegevoegd.

De afsluitende positionering maakt expliciet dat We Build And Design eerst de
organisatie probeert te begrijpen en pas daarna adviseert of bouwt. Daarbij
worden website, webshop, procesverbetering, intern systeem en maatwerksoftware
als mogelijke uitkomsten genoemd, zonder een uitkomst voor te schrijven.

## Productieacceptatie

De acceptatie is uitgevoerd met een volledig nieuwe technische uitnodiging en
een volledig nieuwe sessie; geen bestaande sessie is hervat voor de start van
de test.

- sessieversie: `3.0-conversation-insight-v1`;
- vier antwoorden opgeslagen;
- geheugensteunen zichtbaar en ondersteunend;
- ieder luistermoment herleidbaar tot het direct voorafgaande antwoord;
- samenvatting herleidbaar tot de ingevoerde woorden;
- voorzichtig inzicht getoond zonder verzonnen conclusie;
- herkenning `Gedeeltelijk` opgeslagen;
- vrijwillige verdieping gevolgd en één reflectie opgeslagen;
- refresh hervatte exact dezelfde verdiepingsstatus;
- afronden zonder persoonlijke plek werkte;
- feedback is opgeslagen en bevestigd;
- de technische uitnodiging is daarna ingetrokken en geeft geen toegang meer.

De centrale Observatory-opslag bevat voor deze sessie één start, vier
`question_answered`-events, herkenning, verdieping, reflectie, afronding en
feedback. De afgeschermde Observatory-route is bereikbaar; de ontvangst is
rechtstreeks in de centrale productieopslag geverifieerd.

Browserconsole en serverlog lieten tijdens de acceptatie geen nieuwe fouten of
waarschuwingen zien. HTTPS geeft HTTP 200 met HSTS. `X-Robots-Tag` bevat
`noindex`; `robots.txt` bevat `Disallow: /`; `sitemap.xml` geeft 404. IPv4 en
IPv6 zijn tijdens de uitrol beide met HTTP 200 gecontroleerd.

Na de uitrol en na de beveiligingsopruiming bleef de publieke website exact
hetzelfde artefact serveren: `assets/index-BqT0vFtt.js`. De public-only
buildgrens is eveneens opnieuw automatisch geverifieerd.

## Beveiligingsopruiming en rollback

De tijdelijke SSH-key `codex-experience-polish-20260803` met vingerafdruk
`b69e9059e843e90e79a8914b76420bc4` is uit TransIP verwijderd. Een aansluitende
aanmeldpoging met die sleutel werd geweigerd. De vier tijdelijke serverhelpers
en de tijdelijke migratiekopie zijn verwijderd. Lokale tijdelijke sleutel- en
helperkopieën zijn eveneens verwijderd.

De beveiligingsopruiming trok uitsluitend deploytoegang in. De actieve
Experience, centrale database, Observatory-data, uitnodigingsfunctionaliteit,
databaseback-up, release-archief en beide rollbackdirectories bleven behouden.
Een rollback bestaat uit het terugzetten van de Experience-DocumentRoot naar
`/sites/wbd-experience-20260803-conrwi1g`; voor een databaseherstel blijft de
afgeschermde pre-migratieback-up beschikbaar.

## Verificatie

- tests: **154/154 geslaagd**;
- TypeScript: **geslaagd**, geen fouten;
- Experience-build: **geslaagd**;
- public-only build: **geslaagd**;
- browseracceptatie desktop en mobiel: **geslaagd**;
- productie na intrekken deploytoegang: **HTTP 200**, correct Experience-artefact;
- publieke website na intrekken deploytoegang: **ongewijzigd**.

## Mogelijke Polish V2

Voer pas een volgende polishronde uit wanneer echte deelnemers daar concreet
bewijs voor geven. De belangrijkste toekomstige observaties zijn gedrag rond
het mobiele toetsenbord op fysieke toestellen en woorden of overgangen waarbij
deelnemers aantoonbaar aarzelen. Zonder dat bewijs is geen extra wijziging
gerechtvaardigd.
