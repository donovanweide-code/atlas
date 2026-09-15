# Sportpaleis event-loop baseline debt

Authority: expliciete opdracht van Donovan, 15 september 2026, om de releasebroker generiek baseline-aware te maken. Geen nieuwe productfunctionaliteit of wijziging aan absolute performancegrenzen.

De bestaande release-engine bewaakt baseline-identiteit en afstamming, maar kende geen performance-debtmechanisme. De absolute event-loopnormen blijven behouden in de bestaande versioned assurancecontracten. Deze policy voegt alleen een releasebesluit toe aan ongewijzigde ruwe assurance-uitkomsten.

## Besluit

- Absolute norm gehaald en alle overige gates groen: ABSOLUTE_PASS.
- Absolute event-loopnorm overschreden: alleen BASELINE_DEBT wanneer een actuele, onafhankelijke volledige LIVE-baseline dezelfde overschrijding heeft, de candidate niet slechter is en alle overige candidategates groen blijven.
- Nieuwe/erger geworden overschrijding, onbetrouwbaar bewijs, functionele fout, HTTP-fout of andere rode gate: FAIL.

Er is geen bestaande toegestane meettolerantie gevonden. Daarom geldt nul extra tolerantie. Twee herhalingen per versie worden vooraf vastgelegd in de volgorde baseline/candidate/candidate/baseline. De slechtste candidatewaarde moet kleiner dan of gelijk zijn aan de beste baselinewaarde. Geen selectie van gunstige runs. Iedere overschreden soakcyclus wordt afzonderlijk vergeleken.

## Bewijsbinding

Volledige assurance-entrypoint en contract zijn identiek, evenals Node-versie, host, workload en inputstate. De measurement-only loader selecteert uitsluitend de productruntime; hij past de assurance niet aan. Iedere runtime wordt tegen zijn immutable bestandsmanifest geverifieerd. De ruwe volledige resultaten, hashes, run-ID's, begin/eindtijden en bronidentiteiten worden in de candidate-evidence opgenomen. Runs mogen niet overlappen en moeten minder dan 24 uur oud zijn. Het actuele LIVE-manifest moet bij releasevoorbereiding overeenkomen; de bestaande checksum-locked deploymentprocedure bewaakt dat manifest opnieuw voor activatie.

De diagnostische deelmetingen van de voorafgaande run zijn geen releaseassurance. De bronstatus PASS/FAIL blijft ongewijzigd. `baselineEligibility.nonEventLoopThresholdsPassed` splitst alleen de bestaande niet-event-loopvoorwaarden af; geen voorwaarde wordt verwijderd. Het brokerbesluit behoudt alle bestaande identiteits-, functie-, opslag-, payload-, geheugen-, latency-, pool-, productie-, rollback- en migratiechecks.

De store-, canonical-hash- en rollbackprobes van de assurance blijven op beide versies identiek uit de candidate afkomstig. De oude LIVE-bundle bevatte bijvoorbeeld de inactieve Owner-domainstore niet. De loader heeft hiervoor een expliciete lijst van infrastructuurimports; dit is geen fallback voor ontbrekende productmodules. Service, request handler en productafhankelijkheden worden wel uit de gekozen immutable runtime geladen. De vergelijking bewijst daarmee runtimegedrag bij dezelfde domain-assurance-infrastructuur, niet een loadtest van de actieve Owner legacy-store. De afzonderlijke bestaande functionaliteits-/migratiegates blijven onverkort verplicht.

## Owner scope

De gedeelde `workspace-runtime.mjs` importeert en initialiseert Owner-services en gebruikt dezelfde releasebundle, Node-runtime en migratierunner. De externe release-manifesten vereisen daarom ook Owner-assurance. Deze controle wordt niet verwijderd wanneer alleen Sportpaleis-UX wijzigt. De Owner-domainassurance bewijst bovendien de bestaande meegeleverde migratie-/rollbackcontracten; dit autoriseert geen aparte LIVE Owner-domaincutover.

## Audit en schuld

BASELINE_DEBT is een toegestaan releasebesluit, geen absolute performance-PASS. Het beslisbewijs bevat de onveranderde norm, baseline/candidatewaarden, nul tolerantie, bronrelease, evidencehash en een OPEN remediation. Na een geslaagde release wordt dit als aparte Attention/evidence-entry `EVENT-LOOP BASELINE DEBT` vastgelegd. Een volgende release moet opnieuw tegen de dan actuele LIVE-basis worden gemeten; een historische slechtere baseline mag niet worden hergebruikt.
