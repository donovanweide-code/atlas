# Atlas Runtime Production Deployment V1

**Datum:** 4 augustus 2026  
**Status:** **GO — Runtime 6.0 actief; klaar voor Donovans live praktijkreview**  
**Scope:** uitsluitend `experience.webuildanddesign.nl`; geen code-, Foundation-, Runtime- of publieke-websitewijzigingen tijdens de uitrol

## Actieve productieversie

- Experience-versie voor nieuwe sessies: `6.0-runtime-v1`;
- actieve DocumentRoot: `/sites/wbd-experience-20260804-cdi4nuot`;
- directe applicatierollback: `/sites/wbd-experience-20260803-bph5r6h4`;
- frontend: `assets/experience-Cdi4Nuot.js`;
- stylesheet: `assets/experience-DNJAGAEK.css`;
- releasearchief: `tmp/experience-documentroot-20260804-cdi4nuot.tar.gz`;
- releasearchief SHA-256: `F0302DAD1004EC1E98D88FE632196DF19302232660DCA5CC2C8465DFD870D0AF`;
- JavaScript SHA-256: `97298787554898EBE503FCEEF3359DF73E0C319A22FBBCEDB65B6D413117FD63`;
- CSS SHA-256: `066E00895F66D3DB17DA33D85A97A472D3361EF118825EC4C77597F9895F541B`;
- PHP API SHA-256: `A5F795D711CFB90EA66B662082264099BFC56ACDFF9C92B37BAB6818D6C59C92`;
- PHP Runtime SHA-256: `123E1C7D9E89042E0D4C4D4C8E0993E8703308AAC445F3ABEDC6A3252F253274`;
- PHP 8.2.33; beide productie-PHP-bestanden slaagden voor `php -l`.

Het TransIP-controlepaneel bevestigde de nieuwe DocumentRoot. Tijdens het bekende activatievenster bleef uitsluitend de gezonde 5.0-release zichtbaar. Om 02:21 CEST werd het nieuwe gehashte 6.0-asset effectief geserveerd. Er is geen foutstatus of gemengde release waargenomen.

## Databaseback-up en migratie

Vóór migratie en publicatie is een volledige transactionele back-up gemaakt:

- pad: `tmp/experience-before-atlas-runtime-20260804-021303.sql`;
- omvang: 53.542 bytes;
- rechten: `0600`;
- SHA-256: `2C95A5D50A0971D39CA36D4F4A4191E60A7A60CD1311CF7FB2C3645C0E6D2271`;
- `mysqldump`-completion marker: aanwezig;
- nulmeting: 9 tabellen en 13 bestaande sessies.

Daarnaast is de actieve 5.0-DocumentRoot afzonderlijk gearchiveerd:

- pad: `tmp/experience-documentroot-before-atlas-runtime-20260804-021303.tar.gz`;
- omvang: 35.524 bytes;
- rechten: `0600`;
- SHA-256: `F24F6FC423E3E596EB761FD4CDE4D256DFA2AF5C1A5104CB9B3C5FEEBAF4AF0`.

Migratie `004-atlas-runtime.sql` met SHA-256 `CBFD4EC33D07EE6CD1A84DD2A2FECAD282179ADA2A6D645BD0D04DE0EF7646B7` is eenmaal en zonder fout uitgevoerd. Daarna bestaan 11 tabellen. De nieuwe tabellen `experience_runtime_states` en `experience_runtime_journal` waren vóór de acceptatiesessie leeg.

## Compatibiliteit

De sessieverdeling vóór migratie was:

- `2.0-validation-v1`: 1;
- `2.1-organic-entry-v1`: 5;
- `3.0-conversation-insight-v1`: 2;
- `4.0-living-research-loop-v1`: 3;
- `5.0-flow-recomposition-v1`: 2.

Deze 13 sessies en hun versies bleven na migratie en acceptatie ongewijzigd. Er is precies één technische productiesessie toegevoegd als `6.0-runtime-v1`.

## Runtime-acceptatie

De productiesessie `Runtime 6.0 productieacceptatie` is volledig nieuw gestart. De volgende controles zijn geslaagd:

- nieuwe organische sessie wordt automatisch `6.0-runtime-v1`;
- twee bijdragen lopen via Runtime-overgangen;
- Runtime State en Journal worden centraal en atomair opgeslagen;
- State-revisie en JSON-revisie zijn beide `3`;
- Journal-keten is aaneengesloten: `0 → 1 → 2 → 3`;
- Journal bevat twee `contribution`-commits en één `resume`-commit;
- alle Event- en Transition-JSON is geldig;
- de actuele cognitieve toestand bevat twee werkelijkheidcontacten, twee hypotheses en een herleidbare `time-shift`-beslissing;
- refresh toont `Welkom terug` en bewaart de sessie;
- browser-terug toont `Wil je dit gesprek verlaten?`; `Blijf in het gesprek` bewaart de context;
- vrijwillig stoppen toont `Voor vandaag is dit genoeg.`;
- hervatten opent `De draad opnieuw opnemen` en schrijft een nieuwe Journal-revisie;
- browserconsole: 0 waarschuwingen en 0 fouten;
- productie-errorlog kreeg tijdens de uitrol en acceptatie geen nieuwe regels.

## Observatory en centrale opslag

De afgeschermde Observatory-route is via HTTPS bereikbaar en blijft achter beheer-authenticatie. De productieopslag bevat voor de nieuwe Runtime-sessie aantoonbaar:

- `experience_started`: 1;
- `runtime_transition_committed`: 2;
- `experience_completed`: 1;
- `experience_returned`: 1;
- `organic_participant_resumed`: 1.

De State-, Journal- en Observatory-records verwijzen naar dezelfde 6.0-sessie. De centrale ontvangst en onderlinge consistentie zijn rechtstreeks in productie geverifieerd. De aangemelde Observatory-presentatielaag is in deze uitrol niet opnieuw geopend, omdat geen nieuw beheercredential is aangemaakt of gewijzigd; dit is geen dataverlies- of rollbacksignaal.

## HTTPS, indexatie en publieke grens

- HTTPS: HTTP `200`;
- HTTP: `301` naar HTTPS;
- HSTS: `max-age=31536000`;
- `X-Robots-Tag`: `noindex, nofollow, noarchive, nosnippet, noimageindex`;
- `robots.txt`: `Disallow: /`;
- `sitemap.xml`: HTTP `404`;
- API-health: de beveiligde State-route bereikt PHP en MySQL en retourneert zonder deelnemerscookie correct `401 INVITATION_REQUIRED`;
- publieke website bleef HTTP `200` en serveert ongewijzigd `assets/index-BqT0vFtt.js`.

## Rollback

Directe applicatierollback:

1. zet uitsluitend de DocumentRoot van `experience.webuildanddesign.nl` terug van `/sites/wbd-experience-20260804-cdi4nuot` naar `/sites/wbd-experience-20260803-bph5r6h4`;
2. laat de publieke website ongemoeid;
3. controleer dat `assets/experience-bph5R6h4.js` weer effectief wordt geserveerd.

De vorige versioned directory en het afzonderlijke 5.0-archief zijn ongewijzigd aanwezig. De extra Runtime-tabellen verhinderen de 5.0-applicatie niet. Alleen wanneer volledig databaseherstel noodzakelijk is: verwijder eerst, in deze volgorde, `experience_runtime_journal` en `experience_runtime_states`, en herstel daarna de afgeschermde pre-migratieback-up. Deze destructieve herstelroute is bewust niet op gezonde productie uitgevoerd; beschikbaarheid, integriteit, rechten en hashes van alle herstelbronnen zijn wel gecontroleerd.

## Beveiligingsopruiming

- tijdelijke serverhelper verwijderd;
- tijdelijke serverkopie van migratie 004 verwijderd;
- beide tijdelijke TransIP SSH-sleutels verwijderd;
- TransIP toont daarna `Geen SSH-key`;
- een aansluitende aanmeldpoging met de werkende deploysleutel is geweigerd met `Permission denied`;
- de actieve Experience bleef daarna `6.0-runtime-v1`, HTTP `200`, persistent en zonder browserconsolefouten;
- databaseback-up, beide rollbackartefacten en het actieve releasearchief bleven behouden.

Eén lokaal sleutelbestand met een door Windows afgeschermde ACL kon niet uit de werkmap worden verwijderd:

`C:\Users\donov\Documents\Atlas\.codex-tmp\atlas-runtime-production-v1\transip-runtime-v1-ed25519`

De corresponderende TransIP-public key is verwijderd; het bestand geeft daardoor geen deploytoegang. Verwijder dit lokale restbestand later vanuit een verhoogde PowerShell met `takeown`, `icacls` en `Remove-Item`. Dit raakt geen productievoorziening.

## Gevalideerde kandidaat en besluit

De gepubliceerde kandidaat had vóór uitrol al **176/176 geslaagde tests**, een geslaagde TypeScript-/Experience-build en een geslaagde public-only buildgrens. Tijdens de uitrol is geen code gewijzigd, geen nieuwe cognitieve regel toegevoegd en geen Foundation Conflict Candidate ontstaan.

De gecontroleerde productie-uitrol is **GO**. Er worden na deze oplevering geen nieuwe wijzigingen uitgevoerd. De eerstvolgende stap is uitsluitend Donovans volledige live praktijkreview van Atlas Runtime V1.
