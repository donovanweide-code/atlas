# AquaFlask incident — productaanmaak, juli 2026

## Status

Onderzocht; oorspronkelijke fout niet reproduceerbaar en oorzaak nog open.

## Bronnen

- Database-export van 18 juli 2026.
- Uitgevoerd onderzoek naar productdata, media, lookupdata en eenvoudige productpublicatie.
- Door Atlas bevestigde klantcontext over eerdere problemen bij updates.

Het databasebestand zelf staat niet in de huidige repository-checkout. Dit document bewaart daarom de reeds bevestigde onderzoeksuitkomsten, maar presenteert de snapshot niet als actuele live waarheid.

## Melding en onderzoek

De oorspronkelijke melding betrof het aanmaken of publiceren van een product. Tijdens het onderzoek kon een eenvoudig testproduct worden gepubliceerd. De oorspronkelijke fout trad niet opnieuw op. Zonder foutmelding, tijdstip, gebruiker of rol, producttype en exacte stappen kan de oorzaak niet betrouwbaar worden vastgesteld.

## Bevestigde waarnemingen

- De snapshot bevat 190 producten.
- Productdata is structureel consistent.
- Media- en lookupdata zijn in de snapshot consistent.
- Eenvoudige productpublicatie functioneerde tijdens de controle.
- De oorspronkelijke fout is niet reproduceerbaar.
- De snapshot bevat 1.680 mislukte Action Scheduler-acties, grotendeels uit één image-cleanuphook.
- Er is een bekende historie van problemen bij updates; updates zijn daarom bewust uitgesteld.

## Betekenis

De mislukte scheduleracties vormen onderhoudsruis en verdienen een aparte gecontroleerde beoordeling. Zij verklaren de oorspronkelijke productmelding op dit moment niet. De updatehistorie verhoogt het risico van wijzigingen en vereist vooraf een compatibiliteitscontrole, testplan en herstelroute.

## Onbekend

- Exacte oorspronkelijke foutmelding.
- Tijdstip van het incident.
- Account, gebruiker of rol.
- Producttype en exacte invoer.
- Of het gedrag alleen bij variabele of uitgebreidere producten optreedt.
- Of de actuele live database sinds 18 juli relevant is gewijzigd.

## Volgende aanbeveling

Wacht op een concrete herhaling. Leg bij herhaling onmiddellijk tijdstip, account of rol, producttype, stappen en volledige foutmelding vast. Probeer daarna gecontroleerd te reproduceren voordat een wijziging wordt gekozen.

## Kansen buiten dit incident

Onderhoud, compatibiliteitscontrole, consistente incidentregistratie en stabiliteitsverbetering zijn relevante vervolgrichtingen. Zij blijven gescheiden van de huidige productcase totdat afzonderlijk bewijs en prioriteit bestaan.
