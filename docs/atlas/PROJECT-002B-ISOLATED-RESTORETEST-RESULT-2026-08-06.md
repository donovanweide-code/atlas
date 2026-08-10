# Project 002B — Isolated Experience Restore Test Result

**Datum:** 2026-08-06  
**Afgerond:** 23:44:42 CEST  
**Resultaat:** GO  
**Productie-impact:** geen

## Testobject

- Bronbestand: `C:\Users\donov\AppData\Local\Temp\WBD-002B-RestoreTest\experience-before-context-first-20260804-080233.sql`
- Back-uptijdstip: 2026-08-04 08:02:33
- Grootte: 97.141 bytes
- SHA-256 vóór en na de test: `6EA54665DE9445EF4D69DE64DE76DAC6C6BDA66AFBF0847F244B96C79F288683`
- Runtime: tijdelijk uitgepakte MySQL Community Server 8.0.36 voor Win64
- Runtimebron: `https://cdn.mysql.com/archives/mysql-8.0/mysql-8.0.36-winx64.zip`
- Runtime-omvang: 243.592.163 bytes
- Runtime-SHA-256: `A1BC2AD567EEF672BE20B591AD25B14F221E60BDE3AE3EB235128D91E4166557`

Het oorspronkelijke back-upbestand is niet gewijzigd en na cleanup behouden.

## Isolatie

- Nieuwe tijdelijke datamap en database `wbd_002b_restoretest`.
- Geen Windows-service, installatie, PATH- of registerwijziging.
- `skip_networking=1`.
- Alleen lokale named pipe `WBD002BRestore`.
- Nul TCP-listeners voor het MySQL-proces.
- Geen productiehostname, productiecredential, DNS-, hosting-, deployment- of pakketrestorehandeling.

## Import

| Controle | Resultaat |
|---|---|
| Werkkopiehash gelijk aan bron | PASS |
| Importexitcode | 0 |
| Importduur | 0,441 seconde |
| Importfoutlog | 0 bytes |
| Herstelde tabellen | 11 |

## Integriteitscontroles

| Controle | Resultaat |
|---|---|
| Verwachte Experience-tabellen aanwezig | 11 van 11 |
| Ontbrekende verwachte tabellen | 0 |
| Onverwachte tabellen | 0 |
| `COUNT(*)` structureel uitvoerbaar | 11 van 11 tabellen |
| MySQL `CHECK TABLE` | 11 van 11 `OK`; exitcode 0 |
| Foreign-keyrelaties gecontroleerd | 10 |
| Weesrecords binnen foreign-keyrelaties | 0 |
| Niet-InnoDB-tabellen | 0 |
| Tabellen zonder `utf8mb4`-collation | 0 |
| Definitief validatiefoutlog | 0 bytes |
| Validatieduur | 1,865 seconde |

Rij-inhoud en individuele row-countwaarden zijn niet gerapporteerd of in het projectdossier opgeslagen.

## Testharnasfouten

Er waren twee herstelbare validatorfouten; geen van beide kwam uit de back-up:

1. De eerste row-countquery selecteerde geen standaarddatabase en gaf `ERROR 1046 — No database selected`. De query is gecorrigeerd door uitsluitend de tijdelijke database expliciet te selecteren.
2. De eerste foreign-keymetadataquery ontsnapte tab-separators. De query is gecorrigeerd met raw metadata-uitvoer.

Na correctie is de volledige validatieset foutvrij geslaagd. De database is niet opnieuw geïmporteerd en er is geen data gewijzigd voor deze correcties.

## RPO/RTO-observatie

- Leeftijd van het gekozen historische back-uppunt tijdens de test: 63,67 uur.
- Pure database-import: 0,441 seconde.
- Structurele validatie: 1,865 seconde.
- Totale praktijktijd vanaf voltooide runtime-download tot en met validatie en cleanup: 17,06 minuten, inclusief twee extractietime-outs en twee validatorcorrecties.

Deze meting bewijst herstelbaarheid van dit back-uppunt; zij is geen productie-SLA.

## Cleanup

- Tijdelijk MySQL-proces ordelijk gestopt.
- Tijdelijke `work`-map verwijderd.
- Tijdelijke `runtime`-map, inclusief ZIP en uitgepakte binaries, verwijderd.
- Tijdelijke database, datamap, logs en werkkopie verwijderd.
- Oorspronkelijk menselijk aangeleverd back-upbestand behouden en opnieuw met dezelfde SHA-256 gevalideerd.

## Besluit

**Restoretest: GO.** De aangeleverde Experience-databaseback-up is volledig importeerbaar en voldoet aan alle vastgelegde structurele en integriteitscriteria.

**Project 002B: GO voor afsluiting.** De actuele blockers — ingetrokken private keys, recovery readiness en geïsoleerde restoretest — zijn gesloten. De legacy `.txt`-bestanden zijn door eigenaarbesluit uitgesteld en gelden niet als blocker.

**Project 002C: GO om als afzonderlijk project te starten.** Deze test voert geen werk uit aan Project 002C en autoriseert geen productie- of infrastructuurwijziging.

