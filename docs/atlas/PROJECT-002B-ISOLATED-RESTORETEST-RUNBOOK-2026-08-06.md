# Project 002B — Isolated Experience Restore Test Runbook

**Datum:** 2026-08-06  
**Status:** uitgevoerd en GO op 2026-08-06; zie [`PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md`](PROJECT-002B-ISOLATED-RESTORETEST-RESULT-2026-08-06.md)  
**Testobject:** één handmatig geselecteerde Experience-databaseback-up  
**Productiegrens:** geen accounttoegang door Codex, geen pakketrestore, geen productieverbinding en geen productie-write

## 1. Menselijke voorbereiding

Een bevoegde beheerder voert zelf uit:

1. Selecteer in TransIP één databaseback-up van de Experience-database.
2. Gebruik uitsluitend **Downloaden**; activeer nooit **Herstellen**.
3. Plaats het gedownloade `.sql`- of `.sql.gz`-bestand in een lokaal beveiligde tijdelijke map buiten de repository.
4. Deel met Codex uitsluitend het lokale bestandspad, back-uptijdstip en de bevestiging dat dit de bedoelde Experience-database is. Deel geen databasecredential of inhoud.

Aanbevolen tijdelijke hoofdmap:

`C:\Users\donov\AppData\Local\Temp\WBD-002B-RestoreTest`

## 2. Verplichte GO vóór uitvoering

Codex start pas na:

```text
GO RESTORETEST
Het bestand <lokaal pad> is de geselecteerde Experience-databaseback-up.
Codex mag uitsluitend een geïsoleerde lokale testomgeving maken, de back-up structureel importeren en de tijdelijke testomgeving na bewijsverzameling verwijderen.
Het oorspronkelijke door mij aangeleverde back-upbestand mag NIET worden verwijderd.
```

Als een benodigde MySQL 8.0.36-containerimage niet lokaal aanwezig is, stopt Codex vóór een download/pull en toont eerst de exacte externe handeling voor een nieuwe GO.

## 3. Exacte technische grens

Na GO mag uitsluitend het volgende gebeuren:

1. Controleer bestandstype, grootte en SHA-256 zonder records of geheimwaarden weer te geven.
2. Maak een tijdelijke werkkopie in de hiervoor bedoelde lokale testmap.
3. Start één container met exacte naam `wbd-002b-restoretest`, MySQL `8.0.36`, zonder gepubliceerd netwerkpoort en met netwerkmodus `none`.
4. Importeer alleen in de container. Er worden geen productiehostnamen, productiecredentials of applicatieconnectors gebruikt.
5. Valideer uitsluitend structuur: importexitcode, schema, tabelaantal, tabelnamen, row-counts, foreign-keychecks, charset/collation en noodzakelijke Experience-relaties. Rapporteer geen rij-inhoud.
6. Meet leeftijd van het back-uppunt en totale import-/validatieduur als feitelijke test-RPO en test-RTO.
7. Verzamel een niet-geheim testverslag.
8. Verwijder na de vooraf gegeven GO de tijdelijke container en Codex-werkkopie. Laat het oorspronkelijke menselijke bronbestand onaangeraakt.

## 4. Stopvoorwaarden

Stop direct en rapporteer NO-GO wanneer:

- het bestand niet eenduidig de Experience-databaseback-up is;
- een productiehostname, credential of netwerkverbinding nodig blijkt;
- de containerimage extern moet worden opgehaald zonder aanvullende GO;
- de dump een pakketbrede of meerdere onverwachte databases bevat;
- structurele controle alleen mogelijk is door persoonsgegevens of geheimwaarden te tonen;
- import of integriteitscontrole faalt;
- cleanup buiten de exacte tijdelijke testtargets zou vallen.

## 5. Acceptatiecriteria

| Controle | Vereist resultaat |
|---|---|
| Bron | Bestandstype, grootte, back-uptijd en SHA-256 vastgelegd |
| Isolatie | Geen hostpoort, netwerk `none`, geen productiecredential |
| Import | Exitcode 0 zonder databasefout |
| Structuur | Verwachte schemaobjecten en consistente row-counts aanwezig |
| Integriteit | Foreign-key-, charset- en collationcontroles slagen |
| Experience | Noodzakelijke sessie-/eventrelaties structureel aanwezig |
| RPO/RTO | Back-upleeftijd en gemeten testduur vastgelegd |
| Cleanup | Container en werkkopie verwijderd; menselijk bronbestand behouden |

## 6. GO-poort

**Voorbereiding: GO.** Testobject, menselijke aanlevering, isolatie, stopvoorwaarden en acceptatiecriteria zijn vastgelegd.  
**Herstelbaarheid: GO op 2026-08-06.** De geïsoleerde import is uitgevoerd; alle acceptatiecriteria zijn geslaagd en de tijdelijke omgeving is volledig opgeruimd met behoud van het oorspronkelijke bronbestand.
