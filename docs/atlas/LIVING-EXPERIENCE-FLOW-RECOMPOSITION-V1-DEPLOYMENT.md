# Living Experience Flow Recomposition V1 — Deploymentrapport

**Datum:** 3 augustus 2026  
**Status:** **GO — productie actief en klaar voor Donovan's praktijkreview**  
**Scope:** uitsluitend `experience.webuildanddesign.nl`; geen functionele wijziging en geen publicatie van de publieke website

## Actieve versie

- Experience-versie voor nieuwe sessies: `5.0-flow-recomposition-v1`;
- actieve DocumentRoot: `/sites/wbd-experience-20260803-bph5r6h4`;
- frontend: `assets/experience-bph5R6h4.js`;
- stylesheet: `assets/experience-DNJAGAEK.css`;
- releasearchief: `tmp/experience-documentroot-20260803-bph5r6h4.tar.gz`;
- releasearchief SHA-256: `99DB29071963BEE90BE906877463AC13D14A31FB1853207725CBB8BF6489F704`;
- JavaScript SHA-256: `9D2DECB636D215F375A5A5B74E40C3776C46F9FE2FD1B9E789BD53F6474B9336`;
- CSS SHA-256: `066E00895F66D3DB17DA33D85A97A472D3361EF118825EC4C77597F9895F541B`;
- PHP 8.2.33; de gepubliceerde API slaagde voor `php -l`;
- geen database- of schemamigratie uitgevoerd.

De lokale, server-side en live assethashes zijn gelijk. TransIP had na de DocumentRoot-wissel ongeveer zes minuten nodig om de nieuwe release te serveren. Gedurende die propagatie bleef de vorige gezonde 4.0-release beschikbaar; er is pas GO gegeven nadat 5.0 op zowel HTML- als assetniveau live was bewezen.

## Databaseback-up

Vóór de activatie is een volledige transactionele databaseback-up gemaakt:

- pad: `tmp/experience-before-flow-recomposition-20260803-214442.sql`;
- omvang: 47.687 bytes;
- rechten: `0600`;
- SHA-256: `032697F895576A7EC70C75B7E6672C7DFC6FEFAE19C07F922668F187E742B595`;
- inhoudelijke nulmeting: 9 tabellen.

De sessieverdeling vóór de release was één 2.0-sessie, vijf 2.1-sessies, twee 3.0-sessies en drie 4.0-sessies. Na acceptatie zijn die aantallen ongewijzigd en is precies één technische 5.0-sessie toegevoegd. Daarmee zijn bestaande sessies en centrale opslag intact gebleven.

## Rollbacklocatie

Directe applicatierollback:

`/sites/wbd-experience-20260803-bal5fhm5`

Zet uitsluitend de DocumentRoot van `experience.webuildanddesign.nl` terug van:

`/sites/wbd-experience-20260803-bph5r6h4`

naar:

`/sites/wbd-experience-20260803-bal5fhm5`

De vorige directory is ongewijzigd aanwezig en de bijbehorende 4.0-release blijft als `tmp/experience-documentroot-20260803-bal5fhm5.tar.gz` beschikbaar. Omdat 5.0 geen migratie bevat, is voor een normale applicatierollback geen databaseherstel nodig. Voor volledig herstel blijft de nieuwe pre-releaseback-up beschikbaar.

## Uitgevoerde controles

- lokale candidate: 165/165 tests geslaagd, TypeScript geslaagd, Experience-build geslaagd en public-only buildgrens geslaagd;
- live Experience: HTTPS 200, HTTP 301 naar HTTPS, HSTS `max-age=31536000`;
- noindex: `X-Robots-Tag` actief, `robots.txt` bevat `Disallow: /`, `sitemap.xml` geeft 404;
- live JavaScript en CSS zijn hash-identiek aan de goedgekeurde lokale 5.0-candidate;
- publieke website bleef HTTP 200 en serveert ongewijzigd `assets/index-BqT0vFtt.js`;
- uitsluitend de Experience-DocumentRoot is gewijzigd;
- volledig nieuwe organische productiesessie aangemaakt als `5.0-flow-recomposition-v1`;
- centrale opslag bewezen met twee antwoorden, één reflectie en acht events tijdens de controle;
- eerste gebeurtenis, gerichte verhelderingsvraag, vroege Atlas-gedachte, vrijwillige richting en extra onderzoekssporen werkten;
- browser-terug op een actieve sessie toont `Wil je dit gesprek verlaten?`; `Blijf in het gesprek` bewaart de context;
- refresh toont `Welkom terug` en hervat exact dezelfde Atlas-gedachte;
- vrijwillig stoppen eindigt met `Voor vandaag is dit genoeg.`;
- browserconsole: geen warnings of errors;
- tijdelijke serverhelpers zijn verwijderd;
- tijdelijke SSH-key `codex-flow-recomposition-prod-20260803` met vingerafdruk `0cba6e8fca310fc618e73e91bc0e51d9` is uit TransIP verwijderd;
- TransIP toont daarna `Geen SSH-key` en een aansluitende SSH-poging is geweigerd;
- beide lokale tijdelijke sleutels en alle lokale deployhelpers zijn verwijderd;
- na de beveiligingsopruiming bleven Experience 5.0, sessiehervatting en de publieke website operationeel.

## Loose ends voor de praktijkreview

- De technische organische acceptatiesessie `Flow 5.0 productieacceptatie` blijft bewust als auditrecord in de centrale opslag en het Observatory aanwezig. Er is geen delete-flow gebruikt vanwege het reeds gedocumenteerde risico bij verwijderen vanuit een hergebruikt browserprofiel.
- De korte productieacceptatie is uitgevoerd in de beschikbare in-app Chromium-browser. Donovan's beoordeling op zijn eigen desktop en telefoon is vanaf nu leidend.
- Er zijn geen nieuwe functionele, visuele of inhoudelijke wijzigingen uitgevoerd tijdens of na de deployment.
- De eerstvolgende stap is uitsluitend de live praktijkreview door Donovan. Nieuwe wijzigingen blijven uit tot na die review.
