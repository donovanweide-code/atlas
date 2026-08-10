# Living Experience — First Visit V2

**Datum:** 5 augustus 2026  
**Status:** **GO — live praktijkkandidaat**  
**Scope:** uitsluitend `experience.webuildanddesign.nl`; geen wijziging aan de publieke website, Foundation of Runtime Architecture

## Live ingang

**https://experience.webuildanddesign.nl/first-visit-v2.html**

First Visit V2 is een afzonderlijke directe ingang. De bestaande `/ervaar`-ingang en bestaande sessies blijven beschikbaar.

## Gerealiseerd gedrag

De opening bevat maximaal drie compacte contextstappen:

1. branche — verplicht;
2. organisatie — verplicht;
3. website — optioneel.

Een ontbrekende of niet-gecontroleerde website blokkeert het onderzoek niet. Het eerste beeld houdt deelnemerinput, publieke observatie, voorlopige inferentie en onbekenden afzonderlijk. De eerste inhoudelijke vraag ontstaat aantoonbaar uit de vastgelegde organisatiecontext. Na bevestiging gaat de deelnemer rechtstreeks door naar de bestaande verbeterde Runtime.

In de zichtbare First Visit- en vervolgflow wordt het woord `Atlas` niet gebruikt. De bestaande algemene `/ervaar`-ingang is inhoudelijk niet aangepast.

## Runtime en centrale opslag

De productieacceptatie maakte één nieuwe `6.0-runtime-v1`-sessie. Na de eerste bijdrage bevestigde de centrale controle:

- Runtime State aanwezig;
- revision `2` na de eerste bijdrage;
- `firstVisitContext` aanwezig;
- alle vier bronstatussen aanwezig;
- twee Runtime Journal-entries;
- startentry `first-visit-context-v2` aanwezig;
- twee Observatory-events, inclusief `experience_started`;
- 11 bestaande databasetabellen, zonder migratie of schemawijziging.

Bestaande sessieversies `2.1`, `3.0`, `4.0` en `5.0` zijn ongewijzigd aanwezig. De bestaande `/ervaar`-ingang opent nog steeds zijn eigen organische Experience.

## Productierelease en rollback

- actieve DocumentRoot: `/sites/wbd-experience-20260805-fv2c0ybh`;
- directe rollback: `/sites/wbd-experience-20260804-5me1w5v6`;
- First Visit asset: `assets/first-visit-v2-C0yBqhff.js`;
- Runtime asset: `assets/experience-Cjddk2RY.js`;
- publieke websiteasset bleef `assets/index-BqT0vFtt.js`.

### Volledige databaseback-up

- versleuteld pad: `sites/experience-private/backups/experience-before-first-visit-v2-20260805-001500.sql.gz.enc`;
- afzonderlijke sleutel: `sites/experience-private/backups/experience-before-first-visit-v2-20260805-001500.key`;
- AES-256-CBC met PBKDF2;
- omvang: 15.424 bytes;
- mode van beide bestanden: `0600`;
- SHA-256: `2908e9ee32a8a3cce85a2113a0187af679070f81f8b259749472c0aad00f057a`;
- 11 tabellen en 249 rijen;
- gzip-integriteit en completion marker gecontroleerd.

### Releasearchief

- versleuteld pad: `sites/experience-private/backups/experience-documentroot-before-first-visit-v2-20260805-001500.tar.gz.enc`;
- afzonderlijke sleutel: `sites/experience-private/backups/experience-documentroot-before-first-visit-v2-20260805-001500.key`;
- omvang: 52.112 bytes;
- mode van beide bestanden: `0600`;
- SHA-256: `71dbae9fa2c2e671ce2c04314c8b9d2f42f99e57480aedb27534b48760c9e37e`;
- decryptie en volledige tar-inventaris gecontroleerd.

Een normale applicatierollback vereist uitsluitend dat de DocumentRoot wordt teruggezet naar `/sites/wbd-experience-20260804-5me1w5v6`. Er is geen databasemigratie uitgevoerd.

## Technische validatie

- volledige testset: **196/196 geslaagd**;
- First Visit V2-tests: 4/4 geslaagd;
- TypeScript: geslaagd;
- Experience-build: geslaagd;
- PHP 8.2.33;
- PHP-lint voor `api/index.php`, `api/atlas-runtime.php` en `api/first-visit.php`: geslaagd;
- publieke public-only build: geslaagd, 29 bestanden en 9 tekstbestanden gecontroleerd;
- externe live route serveert `first-visit-v2-C0yBqhff.js`;
- HTTP leidt naar HTTPS;
- live HTML bevat `noindex, nofollow, noarchive, nosnippet, noimageindex`;
- Experience `.htaccess` borgt dezelfde `X-Robots-Tag` en HSTS `max-age=31536000`;
- `robots.txt` blijft `Disallow: /`.

## Browseracceptatie

Desktop, productie:

- branche, organisatie en gecontroleerde website doorlopen;
- eerste beeld toont brongebonden publieke context;
- contextafgeleide eerste vraag verschijnt;
- overgang naar Runtime werkt;
- eerste Runtime-bijdrage levert een nieuwe cognitieve beweging op;
- refresh behoudt sessie en vraag;
- browser-terug behoudt het gesprek op `/e/`;
- zichtbare First Visit-sessie bevat geen `Atlas`;
- console: 0 fouten, 0 waarschuwingen.

Mobiel, productie op een 390 × 844 viewport:

- branche en organisatie doorlopen;
- website bewust overgeslagen;
- eerlijk niet-blokkerend eerste beeld verschijnt;
- contextafgeleide vraag verschijnt;
- geen horizontale overflow (`375/375` CSS-pixels);
- beide acties hebben een tikhoogte van 44 px;
- bodytekst is 16 px;
- console: 0 fouten, 0 waarschuwingen.

De eerste activatie kende een tijdelijke TransIP-bestandsscan: het HTML-entrypoint was zichtbaar terwijl een nieuwe asset kort `403` gaf. Conform rollbackbeleid is onmiddellijk terugschakeling voorbereid. Zodra de scan de release had vrijgegeven, is de release opnieuw geactiveerd en volledig geaccepteerd. Er is geen gedeeltelijke of gebroken eindstatus achtergelaten.

## Screenshots

- desktop: `output/first-visit-v2/first-visit-v2-production-desktop.png`;
- mobiel: `output/first-visit-v2/first-visit-v2-production-mobile.png`.

## Besluit

First Visit V2 is **GO** als afzonderlijke live praktijkkandidaat. De nieuwe ingang is context-first, website-optioneel, niet-blokkerend en volledig doorgeleid naar de bestaande verbeterde Runtime. Centrale opslag, Runtime State, Runtime Journal en Observatory zijn aantoonbaar actief. De publieke website bleef byte-identiek op zijn bestaande gehashte asset.

## Beveiligingsopruiming

- tijdelijke TransIP SSH-key verwijderd;
- TransIP toont `Geen SSH-key`;
- aansluitende SSH-poging geweigerd met `Permission denied`;
- beide lokaal gegenereerde tijdelijke keypairs verwijderd;
- tijdelijke serverhelpers verwijderd;
- actieve release, rollbackrelease en geldige versleutelde back-ups bleven ongewijzigd.

De afgekeurde, nooit als eindstatus geaccepteerde directory `wbd-experience-20260804-c0ybqhff` bleef buiten de DocumentRoot staan. Verwijdering werd door de tijdelijke TransIP-bestandslock niet afgerond. Dezelfde lock verhinderde een definitieve nacontrole op drie ongeldig verklaarde exportpogingen onder `tmp/`. Deze artefacten staan buiten iedere DocumentRoot, bevatten geen deploysleutel of configuratie en vormen geen rollbackafhankelijkheid. De afgekeurde directory en eventuele resterende incomplete exports zijn het enige operationele opruimpunt voor een later onderhoudsmoment.
