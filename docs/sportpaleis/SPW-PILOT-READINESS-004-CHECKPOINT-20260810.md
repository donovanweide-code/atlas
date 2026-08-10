# SPW Pilot Readiness 004 — veilig checkpoint

Vastgelegd: 2026-08-10 (Europe/Amsterdam)

## Status

Werkstroom: `SPW-BEDRUKKING-PILOT-READINESS-004-20260810`

Checkpointreden: gebruiker verbreekt tijdelijk de verbinding en sluit de laptop. Geen externe of moeilijk onderbreekbare actie actief.

## Reeds uitgevoerd — niet opnieuw doen

- Bestaande 003/003B-implementatie en aangeleverde Final Pilot Readiness-opdracht geaudit.
- Teamorder herwerkt naar groepsinvoer: vereniging, bedrukbare pilotartikelen, bedruksoorten, nummerreeks, standaardmaat en pas daarna voorbereide speler-/artikelregels.
- Teamorder ondersteunt meerdere artikelen per speler, reeksen, afwijkingen en `+ Speler/artikel toevoegen`.
- Gewone order: één bedrukking verplicht; shortnummer-erfenis voor exclusieve artikelregels gecorrigeerd.
- Verkoopnummer toegevoegd aan server-user; `acceptedBy`-snapshot toegevoegd aan orders. Alleen Donovan=45 is als bronwaarde in seed vastgelegd; overige waarden blijven `null` tenzij admin ze expliciet invoert.
- Laatst opgeslagen order zichtbaar gemaakt in Winkelmedewerker-overzicht.
- Productievoorstelroute toegevoegd met menselijke GO, kleur/profiel/afmeting-groepering en expliciete hardwaregrens.
- Bulkselectie 10/20/30/alles zichtbaar/wissen toegevoegd.
- Operator-only technische profielweergave toegevoegd; financiële adminweergaven blijven afgeschermd.
- Verenigingsbeheer voorzien van server-side revisie, validatiebron, history en audit.
- Feedback ondersteunt max. 3 PNG/JPG/WebP-afbeeldingen van max. 5 MB, server-owned opslag en geautoriseerde retrieval; base64 wordt niet in bootstrap teruggegeven.
- Sportpaleis mailheader lokaal aangepast naar zwart met rode scheidingslijn en groter bestaand goedgekeurd logo. Geen echte mail verzonden.
- Schema v4 en additieve MariaDB-migratiekandidaat toegevoegd; niets gedeployed of op een database uitgevoerd.
- TypeScript-build, publieke build en Workspace-only build zijn geslaagd.
- Bestaande gerichte Minimal Pilot 001- en Capability 003-tests zijn na schema/release-update geslaagd.
- Nieuwe readiness-004-testset toegevoegd. Laatste run had nog drie gerichte testproblemen; twee waren uitsluitend te korte idempotency-testsleutels en zijn inmiddels gecorrigeerd, het derde was een broncode-stringassertie en is aangepast naar het zichtbare DATA_GAP-contract. Deze correcties zijn nog niet opnieuw gedraaid.

## Exact hervatpunt

Begin na hervatting met uitsluitend:

1. `node --experimental-strip-types --test tests/sportpaleis-pilot-readiness-004.test.mjs tests/sportpaleis-bedrukking-minimal-pilot-001.test.mjs tests/sportpaleis-capability-build-003.test.mjs`
2. Herstel alleen echte fouten uit die run.
3. Draai daarna `npm.cmd test` en `npm.cmd run build:workspace`.

## Nog resterend

- Nieuwe readiness-004-testset opnieuw draaien en volledig groen maken.
- Volledige regressiesuite draaien en definitief testtotaal vastleggen.
- Zichtbare oude string `Open het juiste snijbestand` ook uit de niet-gebruikte oorspronkelijke productiemarkup verwijderen; de gerenderde route overschrijft die al met het juiste DATA_GAP-contract, maar de bron moet eveneens schoon zijn.
- Teamorder in echte lokale browser testen: 18 spelers, 1–18, minstens twee artikeltypen, één afwijkend nummer en 390px.
- Scenario’s A–F uit de Final Pilot Readiness-opdracht volledig uitvoeren en bewijs vastleggen.
- Desktop- en 390px-reviewbeelden maken voor Winkelmedewerker, Patrick/Productie en Kevin/Admin.
- Sportpaleis-mailtemplates Ontvangen/In productie/Gereed desktop + 390px lokaal renderen; geen echte mail.
- Compacte review-PDF genereren, renderen en visueel controleren.
- Eindrapport schrijven met DESIGN RECOVERY, ARTICLE SOURCE RE-INVENTORY, NEW EMPLOYEE / LOW DIGITAL SKILL REVIEW, security/resultaten, open DATA_GAPs en pilotstatus.
- Alleen `READY FOR FINAL HUMAN PILOT REVIEW` rapporteren als alle scenario’s en regressies werkelijk slagen.

## Veiligheidsstatus

- Productiedeployment: niet uitgevoerd.
- DNS: niet gewijzigd.
- Echte mail: niet verzonden.
- Direct Print / Illustrator / WinPlot / Summa: niet aangestuurd.
- Database-migratie: niet uitgevoerd.
- Bronbestanden buiten de repository: niet gewijzigd.
- Lokale reviewserver op 5187 is door deze werkstroom niet herstart of gewijzigd; laptop-slaap kan hem uiteraard stoppen.

## Geschatte resterende werktijd

Circa 60–90 minuten na hervatting, afhankelijk van eventuele visuele/browserregressies in desktop en 390px.
