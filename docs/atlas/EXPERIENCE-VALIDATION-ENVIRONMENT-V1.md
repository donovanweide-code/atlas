# Experience Validation Environment v1

Status: **GO — productie actief en browseracceptatie geslaagd**  
Datum: 3 augustus 2026  
Voorkeursadres: `https://experience.webuildanddesign.nl`

## Besluit

De kleinste betrouwbare oplossing binnen de bestaande hosting is een volledig
afzonderlijke Experience-build met een PHP 8 API en een MySQL-database op het
bestaande TransIP-webhostingpakket. Dit sluit aan op de aanwezige, versiegebonden
DocumentRoot-aanpak en vereist geen externe dienst of nieuwe frontenddependency.

De publieke WBD-build, Atlas Workspace en Sportpaleis blijven buiten deze
release. De Experience wordt niet vanuit de publieke navigatie of sitemap
gelinkt. De productieomgeving draait uitsluitend op het afzonderlijke subdomein
`experience.webuildanddesign.nl`; de publieke DocumentRoot is niet gewijzigd.
Een echte, ongeopende persoonlijke uitnodiging is in het Observatory aangemaakt.
Het platte token staat bewust niet in dit document en wordt alleen in de
beveiligde oplevering gedeeld.

## Productieactivatie — 3 augustus 2026

- TransIP Extra Website: `experience.webuildanddesign.nl`, ingeschakeld als
  afzonderlijke subsite.
- Versioned DocumentRoot: `/sites/wbd-experience-20260803-92c3be5`.
- Private runtimeconfig: `/sites/experience-private/config.php`, buiten de
  DocumentRoot en met gebruikersrechten `600`.
- Runtime: PHP `8.2.33`, PDO MySQL actief.
- Centrale database: `webuil_experiencev1`, acht tabellen op MySQL `8.0.36`.
- HTTPS: publiek vertrouwd certificaat actief; HTTP wordt naar HTTPS gestuurd.
- DNS: A `85.10.159.158`; AAAA
  `2a01:7c8:f0:10e2::8c42:d0a3`. Beide horen bij hetzelfde WBD-hostingpakket.
- Releasearchief op server:
  `tmp/experience-documentroot-20260803-92c3be5.tar.gz`, SHA-256
  `B6C6339AAF9BD808AC0CF0EC02CCE221E2EFBDAD6B743926673E479B55E1A100`.
- Lokaal deploypakket: SHA-256
  `B876D1D9FA12595E108D01540AD86C5593C0D509801E46083964BB0A15FE0583`.
- Beveiligingsopruiming: de twee tijdelijke TransIP SSH-deploysleutels
  (`e06fc1324ab282a1885c6a07b1ce72b7` en
  `551e32ac0970bcb81ac3e407c9407422`) en alle vier lokale sleutelbestanden zijn
  verwijderd. Er is geen blijvende sleutelgebaseerde deploytoegang achtergelaten.

De echte MySQL 8-activatie bracht twee begrensde compatibiliteitsfouten aan het
licht. De kolomnaam `natural` is uitsluitend als SQL-identifier gequote; het
model en de API-vorm zijn ongewijzigd. Daarnaast is het pad van de bestaande
`Secure`, `HttpOnly`, `SameSite=Strict` beheercookie van `/observatory` naar `/`
gecorrigeerd, zodat dezelfde cookie ook naar `/api/admin/*` wordt gestuurd.
Beide correcties voegen geen functionaliteit toe.

## Architectuur

```text
Persoonlijke link /e/#<eenmalig zichtbaar token>
                 |
                 v
Afzonderlijke Vite Experience-build (dist-experience)
                 |
                 v
Same-origin /api/* -> PHP 8 + PDO
                 |
                 v
MySQL: uitnodigingen, sessies, antwoorden, feedback,
betekenisvolle momenten en interne observaties

Afgeschermd Observatory -> afzonderlijke beheersessie -> dezelfde API
```

- Het fragment na `#` wordt niet in het HTTP-pad verstuurd en verdwijnt direct
  uit de browsergeschiedenis. De server bewaart alleen een SHA-256-hash van het
  uitnodigingstoken.
- Na uitwisseling krijgt de deelnemer een willekeurig, HttpOnly, Secure,
  SameSite=Strict toegangscookie. Ook hiervan wordt centraal alleen een hash
  bewaard.
- De frontend gebruikt `localStorage` uitsluitend als niet-gevoelige
  herstelmarkering; de server is de bron van waarheid.
- Het Observatory gebruikt een afzonderlijke HttpOnly beheersessie en een sterk
  wachtwoord waarvan alleen een `password_hash` buiten de DocumentRoot staat.
- De lokale acceptatieserver in `scripts/experience-validation-local-server.mjs`
  is uitsluitend een testharnas met dezelfde API-contracten. Hij is geen
  productiebackend en wordt niet meegeleverd in de webroot.

TransIP documenteert PHP 8.0–8.4 en MySQL-databases op webhosting. Een database
is vanaf de eigen website bereikbaar maar niet extern. Dat is voor deze
same-host API passend:

- https://www.transip.nl/knowledgebase/5987-wil-php-versie-mijn-website-wijzigen
- https://www.transip.nl/knowledgebase/5906-een-database-aanmaken-en-beheren/

## Human First v2

De drie leidende verbeteringen uit de review en het v2-ontwerp zijn vertaald:

1. Na ieder ingestuurd antwoord verschijnt een eerlijk luistermoment. De tekst
   bevestigt ontvangst, citeert de eigen woorden en claimt geen begrip of AI.
2. De samenvatting toont alle eigen antwoorden herkenbaar en zegt expliciet dat
   er geen advies of analyse is toegevoegd. Antwoorden kunnen nog worden
   aangepast.
3. De persoonlijke plek is vrijwillig. Eerst kiest de deelnemer zelf een moment,
   daarna tussen bewaren, opnieuw terugkijken of afronden zonder bewaarplek.

De eerste invoer wordt voorafgegaan door rustige transparantie over opslag en
leren. Commerciële opvolging wordt nergens gevraagd of impliciet toegestaan.

## Uitnodigings- en sessiemodel

Een uitnodiging bevat een UUID, tokenhash, optionele interne omschrijving,
status (`created`, `opened`, `started`, `completed`, `revoked`), technische-
testmarkering en relevante tijdstippen. Alleen het Observatory kan een platte
token één keer bij aanmaak tonen. Namen staan nooit in de URL.

Een sessie bevat een willekeurige UUID, uitnodigings-id, Experience-versie,
fase, huidige stap, gekozen samenvattingsmoment, vrijwillige bewaarplek,
start-/afrondtijd en terugkeerstatus. Ingestuurde antwoorden, vrijwillige
feedback en WBD-observaties staan in afzonderlijke tabellen.

Alleen deze betekenisvolle gebeurtenissen worden geregistreerd:

- uitnodiging geopend;
- Experience gestart;
- vraag bewust ingestuurd;
- persoonlijke plek vrijwillig geopend;
- Experience afgerond;
- vrijwillig teruggekeerd;
- feedback ingestuurd.

Er zijn geen third-party trackers, toetsaanslagregistratie, muisprofielen,
advertentie-id's of automatische conclusies.

## Privacy en beveiliging

- Server-side validatie en vaste maximale lengtes gelden voor antwoorden,
  feedback, omschrijvingen en observaties.
- Alle gebruikersinhoud wordt als tekst gerenderd; HTML wordt niet vertrouwd.
- Mutaties vereisen same-origin JSON met een expliciete requestmarker.
- Rate limits begrenzen beheerlogin, tokenuitwisseling en deelnemeracties.
- Tokens, databasegegevens en de beheerhash staan niet in frontendcode.
- Ongeldige, verlopen en ingetrokken links tonen geen antwoorden of
  infrastructuurdetails.
- Een deelnemer kan de eigen sessie na expliciete bevestiging direct verwijderen;
  een ingetrokken uitnodiging verliest alle actieve toegangscookies.
- Technische acceptatiedata kan in het Observatory alleen na expliciete
  bevestiging worden verwijderd en moet bij aanmaak als technisch zijn gemarkeerd.
- Geen antwoordinhoud wordt onnodig naar serverlogs geschreven.

De compacte privacyroute is `/privacy`. De HTML gebruikt `Referrer-Policy:
no-referrer`; de serverheaders voegen CSP, frameblokkering, content-typecontrole,
permissions policy en HSTS toe.

## Experience Observatory

Route: `/observatory`.

Het rustige overzicht toont aantallen voor uitnodigingen, geopend, gestart,
afgerond, teruggekeerd en feedback, plus laatste activiteit. Een detail toont de
tijdlijn, ingestuurde woorden, gekozen moment, feedback en Experience-versie.
WBD-observaties zijn visueel en in opslag gescheiden van deelnemerswoorden.
Vanuit het detail kan een uitnodiging worden ingetrokken en expliciet gemarkeerde
technische data worden verwijderd.

## Niet-indexeerbaarheid

De borging is gelaagd:

- HTML: `robots=noindex,nofollow,noarchive,nosnippet,noimageindex` en een
  niet-publieke canonical zonder deelnemerpad;
- HTTP: dezelfde `X-Robots-Tag` op alle responses;
- `/robots.txt`: `Disallow: /`;
- `/sitemap.xml`: expliciet 404;
- geen Experience-route in de publieke sitemap of navigatie;
- geen persoonlijke Open Graph-metadata;
- eigen Vite-configuratie en eigen `dist-experience` output.

`npm run build` blijft public-only en controleert dat Experience/Atlas-interne
artefacten niet in `dist` verschijnen.

## Productieprocedure (TransIP)

### Eenmalige voorbereiding

1. Maak in TransIP een extra website/subsite `experience.webuildanddesign.nl`
   met een eigen DocumentRoot. TransIP beschrijft dit voor Pro/Max-pakketten:
   https://www.transip.nl/knowledgebase/een-website-toevoegen-aan-je-webhostingpakket
2. Maak een MySQL-database en gebruiker aan. Importeer
   `experience-server/private/schema.sql` via phpMyAdmin.
3. Kopieer `experience-config.php.example` naar een private map naast, nooit in,
   de versioned DocumentRoot. Bij `/sites/wbd-experience-...` is het standaardpad
   `/sites/experience-private/config.php`; bij een DocumentRoot onder
   `/subsites` is dit `/subsites/experience-private/config.php`.
4. Vul de PDO-DSN, databasegebruiker en het databasewachtwoord in. Maak lokaal of
   via een veilige shell een beheerhash met
   `password_hash('<sterk uniek wachtwoord>', PASSWORD_DEFAULT)` en vul alleen de
   hash in. Publiceer nooit het platte wachtwoord of dit configuratiebestand.
5. Kies in TransIP PHP 8.2 of hoger en activeer HTTPS/Let's Encrypt. Voor een
   certificaat moeten A en AAAA naar het webhostingpakket wijzen:
   https://www.transip.nl/knowledgebase/6985-let-s-encrypt-voor-webhosting/

### Exacte DNS-handoff

Read-only controle op 2 augustus 2026 laat zien dat beide gewenste records al
bestaan. Er is daarom geen DNS-wijziging uitgevoerd. De waarden voor controle of
handmatig herstel zijn:

| record | hostnaam | doelwaarde | TTL |
| --- | --- | --- | --- |
| A | `experience` | `85.10.159.158` | `300` seconden |
| AAAA | `experience` | `2a01:7c8:f0:10e2::8c42:d0a3` | `300` seconden |

Deze doelen zijn de aantoonbare huidige IPv4- en IPv6-adressen van het bestaande
WBD-webhostingpakket. `experience.webuildanddesign.nl` accepteert op dit moment
nog geen geldige HTTPS-verbinding; de subsite- en certificaatkoppeling is dus nog
niet actief. Verifieer vóór activering opnieuw dat de DNS-waarden nog bij het
pakket horen. Voer daarna uit:

```powershell
Resolve-DnsName experience.webuildanddesign.nl -Type A
Resolve-DnsName experience.webuildanddesign.nl -Type AAAA
curl.exe -I https://experience.webuildanddesign.nl/e/
curl.exe -I https://experience.webuildanddesign.nl/sitemap.xml
```

Verwacht: beide DNS-antwoorden exact zoals hierboven, geldig certificaat, 200 op
`/e/` met `X-Robots-Tag`, en 404 op `/sitemap.xml`.

### Release

1. Voer vanuit `website` uit: `npm ci`, `npm test`, `npm run build:experience`
   en `npm run build`.
2. Pak `output/experience-validation-environment-v1/experience-validation-
   environment-v1-deploy.zip` uit.
3. Upload uitsluitend `experience-documentroot` naar een nieuwe versiegebonden
   map, bijvoorbeeld `/sites/wbd-experience-20260802-92c3be5`.
4. Kopieer de private template niet naar die map; de live config blijft op het
   pad buiten de DocumentRoot.
5. Laat `experience-config.php` verwijzen naar die externe config of pas in één
   gecontroleerde serverkopie alleen het bestaande absolute configpad aan.
6. Controleer bestanden en hashes, wijzig uitsluitend de DocumentRoot van de
   Experience-subsite en noteer tijdstip/vorige waarde.
7. Valideer HTTPS over IPv4 en IPv6, uitnodiging, hervatten, Observatory,
   intrekken, console/serverlog, robots en sitemap. Markeer of verwijder de
   acceptatiedata.

## Rollback

De publieke site wordt nooit omgeschakeld. Voor Experience blijft de vorige
versiemap onaangeroerd. Rollback is uitsluitend: zet de DocumentRoot van
`experience.webuildanddesign.nl` terug naar de genoteerde vorige Experience-map
of schakel de nieuwe subsite uit als dit de eerste release is. Herstel daarna de
vorige databasebackup wanneer de schemawijziging niet achterwaarts compatibel
blijkt. TransIP maakt webhostingbackups beschikbaar, maar controleer vóór GO dat
het relevante herstelpunt werkelijk bestaat:
https://www.transip.nl/knowledgebase/5912-back-ups-op-webhostingpakketten

De rollback is aantoonbaar voorbereid door de geïsoleerde versioned DocumentRoot
en doordat geen bestaand productiepad is overschreven. Dit is de eerste
Experience-release: rollback betekent de subsite uitschakelen. De publieke
DocumentRoot blijft daarbij `/sites/wbd-20260801-f892849`. Wanneer de gedeelde
PHP-runtime onverwacht toch een regressie veroorzaakt, is de genoteerde vorige
waarde `7.4`; de publieke site en preview zijn na de overstap naar 8.2 beide met
HTTP 200 en zonder browserconsolefouten gecontroleerd.

## Acceptatiebewijs

De volledige browserflow is eerst lokaal en op 3 augustus 2026 opnieuw tegen de
echte productieomgeving doorlopen: technische uitnodiging maken, transparantie,
alle vier vragen, ieder luistermoment, eigen-woorden-samenvatting, vrijwillige
keuze, persoonlijke plek, refresh, heropenen via de persoonlijke link, feedback,
Observatory, interne observatie, intrekken en controle dat dezelfde link geen
toegang of persoonlijke gegevens meer geeft. De productieconsole bevatte in de
deelnemer-, terugkeer-, Observatory- en publieke-sitebrowser geen waarschuwingen
of fouten. De acceptatie-uitnodiging is als `technicalTest` gemarkeerd en blijft
ingetrokken als auditbewijs staan.

De centrale opslag bevat na acceptatie twee uitnodigingen, één sessie, één
feedbackrecord en één interne observatie. Het Observatory toont één geopende,
gestarte, afgeronde en teruggekeerde technische Experience. De afzonderlijke
Liona-uitnodiging staat ongeopend op `Aangemaakt`.

Niet-indexeerbaarheid is live bevestigd: `/robots.txt` bevat `Disallow: /`,
`/sitemap.xml` geeft 404 en responses bevatten
`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`.

Bewijsbestanden staan in `output/experience-validation-environment-v1/`.

## GO-grens en resterende operationele notitie

Productie is GO. PHP is op de echte hosting gelint en via PDO tegen de centrale
database uitgevoerd. HTTPS over IPv4 is vanaf een afzonderlijke serverroute
bevestigd. De autoritatieve AAAA-recordwaarde is exact gelijk aan het werkende
IPv6-adres van de publieke WBD-hosting; de gebruikte lokale runner en de
TransIP-shell boden zelf geen uitgaande IPv6-route voor een geforceerde
`curl -6`-meting. Dit is een beperking van de meetroutes, niet van de
autoritatieve DNS-configuratie.

Het actuele hosting-errorlog is na de productieflow niet gewijzigd. Er hoeft
geen extra infrastructuur te worden aangeschaft. De praktijkvalidatie kan nu
starten; nieuwe functionaliteit blijft buiten deze release.

Na het intrekken van de deploysleutels zijn Experience, HTTPS, centrale opslag,
Observatory, uitnodigingsstatussen, noindex en de publieke website opnieuw via
de publieke routes gecontroleerd. Deze beveiligingsopruiming heeft uitsluitend
de tijdelijke deploytoegang ingetrokken; runtime, data en rollbackvoorziening
zijn ongewijzigd operationeel gebleven.

## Route naar latere publieke integratie

Na bewezen gebruik kan de publieke website één redactionele instap naar de
Experience krijgen. De uitnodigings-, sessie- en Observatory-API blijven
afzonderlijk op het subdomein; er wordt geen persoonlijke inhoud naar de publieke
build gekopieerd. Eerst volgt een afzonderlijk privacy-, bewaartermijn- en
publicatiebesluit. Tot die tijd blijft de omgeving uitnodiging-only en noindex.

## Productiecorrectie — Organic Entry & Session Separation v1

Op 3 augustus 2026 is de begrensde correctie voor een algemene ingang
geactiveerd. De actuele, deelbare route is
`https://experience.webuildanddesign.nl/ervaar`. Iedere nieuwe browser krijgt
een eigen deelnemer en sessie; dezelfde browser kan hervatten en kan bewust voor
`Ik ben iemand anders` kiezen zonder bestaande centrale data te overschrijven.
De persoonlijke `/e/#<token>`-route blijft daarnaast ongewijzigd bestaan.

- Actieve DocumentRoot: `/sites/wbd-experience-20260803-1adp8tc`.
- Vorige DocumentRoot: `/sites/wbd-experience-20260803-92c3be5`.
- Databaseback-up vóór migratie:
  `tmp/experience-before-organic-entry-20260803.sql`, rechten `600`, SHA-256
  `ad487ac92ba4e1fa2cb0cf430b0219975ef5a108d3f4443b333f51d02671f82f`.
- De publieke DocumentRoot bleef `/sites/wbd-20260801-f892849`.
- TransIP toont na beveiligingsopruiming `Geen SSH-key`; tijdelijke lokale en
  remote deploybestanden zijn verwijderd.

Het volledige bewijs, de privacygrens en de gescheiden sessieacceptatie staan in
`EXPERIENCE-ORGANIC-ENTRY-SESSION-SEPARATION-V1.md`.
