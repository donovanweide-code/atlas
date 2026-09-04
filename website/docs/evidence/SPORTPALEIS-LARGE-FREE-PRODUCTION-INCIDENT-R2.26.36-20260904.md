# Sportpaleis grote Vrije productieopdracht — incidentbewijs R2.26.36

Datum: 2026-09-04 (Europe/Amsterdam)

Boundary: read-only LIVE-forensics en lokale hotfix. Er is niet gedeployed en er is geen LIVE-state gemuteerd.

## Immutable baseline

- LIVE-release tijdens de inspectie: `SPW-TTL-REVIEW-ACCESS-BOOTSTRAP-R2.26.35-20260904`
- Baselinecommit en tag: `48fddd691e1b2d13ef0cd8758abc964a674dfd04`
- De baselinecommit en tag zijn niet gewijzigd.

## Gereconcilieerde LIVE-uitkomst

- Vrije productieorder: `SP-2026-0133`, stage `PRINT`, revision 2.
- Voorstel: `PV-2026-0052`, status `CONVERTED`.
- PlotJob: `PLOT-2026-0077`, status `AWAITING_HUMAN_CHECK`.
- Exact één idempotencyrecord, één databasejob en één immutable SVG-artifact.
- Artifact: `PLOT-2026-0077-production.svg`, 88.888 bytes.
- Artifact SHA-256: `0f0d393542d76045bd5d2229bc1dd3db52cfa1e5ed8d11f8fe10fbef8b9905b8`.
- De artifactbytes en de in de database vastgelegde hash zijn gelijk.
- Geen pending artifact, orphan, dubbele job of dubbele aanvraagstate aangetroffen.
- De bestaande output is 200 mm hoog gematerialiseerd, terwijl de gemelde invoer 80 mm was. Daarom is opnieuw proberen zonder correctie niet veilig.

Het bestaande artifact blijft immutable incidentbewijs en is niet als fysiek correct of `Bedrukt` aangemerkt.

## Tijdlijn en oorzaak

- 09:21:53 CEST: jobcreatie gestart.
- 09:22:28 CEST: eerste productie-POST bereikt de proxytimeout (`504`).
- 09:22:38–09:23:47 CEST: bootstrap- en revisionrequests lopen eveneens op `504` doordat de synchrone request de Node-event-loop bezet.
- 09:23:14 CEST: tweede POST met dezelfde deterministische intentie loopt eveneens op `504`; idempotency voorkomt een dubbele job.
- 09:23:47 CEST: de databasecommit/audit wordt alsnog voltooid.
- 09:24:25 CEST: applicatielog registreert de verbroken clientverbinding (`ECONNRESET`).

De productie-input bevat zes semantische meercijfergroepen (`10`, `11`, `12`, ieder tweemaal). De oude nestingroute koos exhaustief op basis van alleen het aantal groepen. In deze concrete bronflow ontstonden 64 gezamenlijke oriëntatiestrategieën, daarna gecombineerd met maximaal vier ordeningen en twee werkbreedtes: maximaal 512 dure, contourbewuste nestingpasses in één synchrone HTTP-request. Gemeten LIVE nesting: 111.855,7 ms; totale generatie: 113.293,4 ms.

De service is niet herstart en er was geen OOM: `NRestarts=0`; de zichtbare service-uitval werd veroorzaakt door event-loop starvation en proxytime-outs.

Een tweede fout zat aan de formuliergrens: zichtbare gedeelde instellingen werden alleen naar de rijstate gekopieerd na de aparte knop `Pas toe op alle`. Direct opslaan kon daardoor oude rijwaarden materialiseren. Dat verklaart de objectief vastgestelde 200-mm-output ondanks de gemelde zichtbare 80-mm-invoer; individuele browserhandelingen zijn niet uit serverlogs reconstrueerbaar.

## Lokale structurele correctie

- De uitputtende oriëntatiesearch is begrensd op het werkelijke aantal combinaties, niet het aantal semantische groepen.
- Grotere zoekruimtes gebruiken deterministische AUTO/uniforme strategieën met conservatieve bounding-envelopes. Dit bewaart fysieke schaal, maximale baanbreedte, snijafstand, semantische nummergroepen en deterministische output, zonder exponentiële contourvergelijking in de request.
- Vóór submit worden de op dat moment zichtbare gedeelde Vrije-opdrukinstellingen centraal naar alle bedoelde occurrences geprojecteerd. De productieprojectie gebruikt daardoor dezelfde hoogte, kleur, bron, type en hoeveelheid die de medewerker ziet.
- Bestaande idempotency, transaction rollback en immutable artifactreservation zijn ongewijzigd.

## Testbewijs

Gerichte nieuwe regressie:

- 80 mm, Spain Euro 2016, WIT, reeks 2 t/m 12, ieder ×2: PASS.
- Dezelfde batch op 200 mm: PASS.
- Zichtbare 8 cm wordt vóór materialisatie exact 80 mm op alle elf regels: PASS.
- 11 invoerregels, 22 semantische productieobjecten en 28 fysieke glyph pieces blijven behouden.
- Exact dezelfde operation-key levert dezelfde job en artifacthash; er ontstaat geen tweede job of voorstel.

Gemeten in de volledige parallelle repositorysuite:

- 80 mm: nesting 1.430,1 ms; totale generatie 2.111,4 ms; wall 3.607,3 ms.
- 200 mm: nesting 3.488,7 ms; totale generatie 5.075,4 ms; wall 7.099,5 ms.
- Beide blijven onder de gerichte grenzen van 10 seconden nesting en 15 seconden volledige lokale production-shaped write.

Gerichte aangrenzende suite: 33/36 PASS. De drie failures zijn bestaande bron-/historische-UI-contractverwachtingen buiten deze diff; alle direct-printoptimalisatie-, artifactreservation-, concurrency-, rollback-, WIT-batch- en idempotencychecks binnen de hotfixgrens zijn groen.

De volledige repositorysuite is uitgevoerd. Zij eindigt niet volledig groen door reeds bestaande, buiten-scope WBD/Sportpaleis legacyverwachtingen. De nieuwe incidentregressies zijn daarin groen. De Workspace production build is groen.

## Releasegrens

Dit is alleen een lokaal, commitbaar hotfixcheckpoint. Deployen of het bestaande LIVE-artifact opnieuw uitvoeren vereist een afzonderlijke consequential gate en een nieuwe gecontroleerde production candidate vanaf de actuele LIVE-baseline.
