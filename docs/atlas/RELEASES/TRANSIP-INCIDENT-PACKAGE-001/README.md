# TransIP Incident Package 001

**Datum:** 28 juli 2026  
**Domein:** `webuildanddesign.nl`  
**Hostingomgeving:** TransIP shared webhosting (`webuil`), backend `linweb412`  
**Status productie:** stabiele rollbackrelease actief  
**Wijzigingen tijdens samenstelling pakket:** geen

## Doel

Dit pakket bevat de technische reconstructie en de bronbestanden die TransIP
Support nodig heeft om te onderzoeken waarom een in het controlepaneel
bevestigde DocumentRoot-wijziging niet zichtbaar werd in de door Apache
geserveerde website.

De publicatieprocedure heeft de afwijking correct gedetecteerd en teruggerold.
Er was geen blijvende storing voor bezoekers. De nieuwe release is niet als
productieversie geaccepteerd.

## Inhoud

1. `TECHNICAL-INCIDENT-REPORT.md`  
   Zelfstandig technisch incidentrapport met tijdlijn, bewijs, uitsluitingen,
   onderzoeksvragen en reproduceerbare onderzoekspunten.
2. `SUPPORT-MAIL.md`  
   Direct te gebruiken begeleidende e-mail voor TransIP Support.
3. `ATTACHMENTS-AND-FOLLOW-UP.md`  
   Bijlagenregister met omvang, SHA-256, betekenis en mogelijke aanvullende
   informatievragen.
4. `evidence/`  
   Publicatieverslagen, manifest, validatierapporten, serverlogs en de fysieke
   `index.html` van de nieuwe release.

## Belangrijkste conclusie

De nieuwe release stond volledig en correct op de server. Het TransIP-
controlepaneel accepteerde en toonde `/sites/wbd-20260728-a0bd364` als nieuwe
DocumentRoot. Direct daarna leverden zowel IPv4 als IPv6 echter nog exact de
oude productie-HTML uit `/sites/wbd-20260726-ca3d1bd`.

Het Apache-accesslog van `linweb412` bevat alle validatorrequests. Daarmee
zijn browsercache en een cache-hit vóór Apache uitgesloten. Welke interne
TransIP-stap niet of vertraagd is uitgevoerd — bijvoorbeeld vhostgeneratie,
configuratiepropagatie of VirtualHost-reload — kan alleen TransIP vaststellen.

## Integriteit

De SHA-256-waarden van alle bijlagen staan in
`ATTACHMENTS-AND-FOLLOW-UP.md`. Het pakket bevat geen wachtwoorden,
sessiecookies, API-sleutels of andere authenticatiegegevens.

