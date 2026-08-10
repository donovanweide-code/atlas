# Sportpaleis Bedrukking - Pilot Readiness 005 gerichte correctiefase

Datum: 10 augustus 2026  
Release: `SPW-BEDRUKKING-PILOT-READINESS-005-20260810`  
Scope: Artikelbeheer, artikelinrichting, maten/varianten, Junior/Senior en productie-readiness.  
Uitgesloten: deployment, echte mail, DNS/infrastructuur, Illustrator/WinPlot/Summa en hardware-send.

## Uitkomst

De eerder afgesproken beheer- en veiligheidsfuncties zijn nu geïmplementeerd en getest. De release presenteert onbevestigde catalogus- en productiegegevens niet meer als productiewaarheid. De pilot kan echter nog niet als volledig gereed worden beschouwd: er is onvoldoende bronbevestigde artikelinrichting om de operationele productieflow met echte Sportpaleis-productdata te doorlopen.

## Volledigheidsoverzicht

| BESLOTEN/BRON | HUIDIGE IMPLEMENTATIE | TESTDEKKING | STATUS | EVENTUELE ACTIE |
|---|---|---|---|---|
| Twintig verenigingen uit `info bedrukkingen 2026.xlsx`, Blad1 A2:J21 | Vastgelegde, genormaliseerde fixture; alle 20 verenigingen behouden naam, letterprofiel, foliekleur, bevestigde maten en notitie | 20/20 deep-vergelijking tegen `info-bedrukkingen-2026.confirmed-fixture.json` | Correct geïmplementeerd | Alleen aanpassen na een nieuwe bevestigde bronrevisie |
| Artikelbeheer binnen pilot: vereniging, naam, SKU, afbeelding, zichtbaarheid, variant, kledingmaten, bedrukking, productieprofiel, status en provenance | Eén gereviseerd beheerformulier; bestaande vereniging is verplicht; server weigert vrije/onbekende vereniging; wijzigingen zijn persistent en geaudit | Rolbeveiliging, ongeldige vereniging, revision conflict, restart-persistence en MariaDB mapping | Correct geïmplementeerd | Brondata per echt artikel laten bevestigen |
| Kledingmaat is niet hetzelfde als fysieke bedrukkingsmaat | Catalogusmaten staan op artikel/variant; fysieke nummerhoogte staat op profiel/Junior-regel; vrije maatinvoer is alleen toegestaan bij expliciete DATA_GAP | Bekende maten toegestaan; onbekende maat server-side geweigerd; DATA_GAP-pad getest | Correct geïmplementeerd | Bevestigde kledingmaten invoeren wanneer beschikbaar |
| Junior/Senior-productieregel | Senior-bronmaat blijft herleidbaar; Junior blijft DATA_GAP totdat een positieve fysieke millimeterwaarde plus bronnotitie is vastgelegd | Status zonder mm wordt geweigerd; 180 mm testfixture stroomt door naar nieuwe order; oude orders behouden veilige snapshot | Correct geïmplementeerd | Fysieke Junior-maten per relevante vereniging laten valideren |
| Toegestane bedrukking per artikel | `supports` en `personalizationPolicy` sturen normale order en Teamorder, inclusief required/optional/mutually-exclusive | Normale order, Teamorder, multiple items per speler, nummerafwijking, ongeldige maat en inheritance | Correct geïmplementeerd | Echte artikelregels per catalogusitem bevestigen |
| Productieprofiel: letter, folie, fysieke maat, positie, afstand, rotatie, spiegeling en instructie | Elk veld heeft eigen bronstatus. Positie, referentieafstand, rotatie en spiegeling zijn null/DATA_GAP waar geen gezaghebbende bron bestaat. De oude generieke 8/4/7 cm-waarheid is verwijderd | Ontbrekende waarde blokkeert profielvalidatie; revision/persistence/mapping getest; orderadvance blokkeert onvolledige productiecontext | Correct geïmplementeerd | Sportpaleis productie laat ontbrekende velden per profiel bevestigen |
| Vereniging-specifieke bronwaarden | Letterprofiel, foliekleur en bevestigde fysieke bronmaten blijven per vereniging zichtbaar met bestands-, blad- en celprovenance | 20/20 fixturetest en Junior-profielkoppeling | Correct geïmplementeerd | Geen generieke defaults als bronwaarheid gebruiken |
| A.S.C. Waterwijk pilotcatalogus | Bestaande items blijven beschikbaar voor review, maar de catalogus en onderliggende artikelvelden zijn `PARTIAL`/`DATA_GAP`; `ASC-100x` is niet definitief gemaakt | Seedstatus en productieblokkade getest; browserbewijs medewerker en Patrick | Oude/generieke pilotdata veilig begrensd | SKU, afbeelding, varianten, maten en beleid tegen een echte catalogusbron valideren |
| FC Almere pilotitem | Placeholder-SKU en hergebruikt beeld worden niet als gevalideerd gepresenteerd; status is `DATA_GAP` | Expliciete seedassertie | Oude/generieke pilotdata veilig begrensd | Vervangen of verwijderen na bevestigde FC Almere-catalogus |
| Overige 18 verenigingen | Verenigingsbrondata bestaat; geen verzonnen catalogi, artikelen, SKU's, beelden of maten | Exact 18 keer `NO_VALIDATED_ARTICLES` | Bewuste DATA_GAP | Catalogi alleen toevoegen vanuit bevestigde bronnen |
| Normale order met volledig bevestigd productieartikel | Codepad bestaat en wordt met test-only VALIDATED fixture bewezen; productie-data wordt niet als Sportpaleis-feit opgeslagen | Positieve testfixture plus negatieve echte-seedblokkade | Functioneel aanwezig, echte brondata ontbreekt | Minimaal één echt pilotartikel end-to-end valideren |
| Teamorder | Bestaande snelle groepsinvoer blijft; artikelbeleid, varianten, meerdere artikelen per speler, 18 spelers en afwijkend nummer gebruiken hetzelfde ordermodel | 18 spelers, twee artikeltypen in bestaande 004-regressie; 18 varianten, afwijkend nummer en DATA_GAP-gate in 005 | Correct geïmplementeerd | Human review herhalen zodra een echt artikel VALIDATED is |
| Rollen/rechten | Alleen Kevin/Admin kan artikel-, vereniging- en profieldata wijzigen; medewerker en Patrick kunnen dit niet | Admin/operator/store server-side autorisatietests | Correct geïmplementeerd | Geen actie |
| Nieuwe PIM/ERP, LIV-connector, prijzen, hardware of snijautomatisering | Niet gebouwd | Build/sourcegrenzen en bestaande hardware-gates blijven groen | Nooit onderdeel van deze scope | Alleen via aparte opdracht/GO |

## Wat was fout of onvolledig en is gecorrigeerd

- Artikelbeheer toonde wel een tegel, maar bood niet alle afgesproken pilotvelden duurzaam en gereviseerd aan. Dit is hersteld zonder een PIM te bouwen.
- Artikel-naar-vereniging was te vrij. De server accepteert nu alleen een bestaande verenigingsentiteit.
- Kledingmaat, fysieke bedrukmaat en Junior/Senior liepen functioneel door elkaar. Deze zijn gescheiden in het model, beheer en ordervalidatie.
- Een Junior-status kon eerder zonder werkelijke fysieke maat betekenis krijgen. `VALIDATED` vereist nu een positieve millimeterwaarde en provenance.
- Onbewezen profielwaarden konden op productiefeiten lijken. Positie, referentieafstand, rotatie en spiegeling zijn nu expliciet nullable en `DATA_GAP` totdat de bron is bevestigd.
- Een gedeeltelijk gevalideerde catalogus kon te gemakkelijk op een gewone catalogus lijken. Artikel- en catalogusstatus zijn nu zichtbaar en server-side onderdeel van productie-readiness.
- De databasevorm miste varianten, maten, validatiehistorie en nullable rotatie/spiegeling. Schema, mapping en een niet-uitgevoerde migratie zijn toegevoegd.

## Bewust resterende DATA_GAP

- Geen volledige, bevestigde artikelcatalogus voor alle twintig verenigingen.
- Voor A.S.C. Waterwijk zijn de bestaande `ASC-100x`-gegevens geen definitieve brongevalideerde productdata.
- FC Almere heeft nog geen bevestigde SKU, afbeelding, varianten of maten.
- De meeste verenigingen hebben geen bevestigde artikelvarianten, kledingmaten, productbeelden of artikel-specifieke bedrukregels.
- Fysieke Junior-hoogtes zijn niet bevestigd; een bronwaarde zoals 20 cm wordt niet automatisch gelijkgesteld aan een fysiek gevalideerde productiemaat.
- Exacte positie, referentieafstand, rotatie en spiegeling zijn voor de seed-profielen niet gezaghebbend bevestigd.
- Daardoor bestaat er nog geen echt bronbevestigd artikel dat in de review veilig als volledig productiegereed kan worden getoond. De positieve flow is uitsluitend met een expliciet test-only fixture getest.

## Test- en buildresultaat

- Volledige regressiesuite: **441/441 PASS**.
- Nieuwe gerichte suite `sportpaleis-pilot-readiness-005.test.mjs`: **6/6 subtests PASS**.
- Workspace-only build: **PASS**; TypeScript, Vite-build, buildgrens en runtime syntaxcontrole geslaagd.
- Browserreview: Artikelbeheer desktop en 390 px, artikelvalidatie/provenance, verenigingsbeheer, Junior-validatie, profielbeheer, normale order en productieblokkade voor medewerker en Patrick vastgelegd.
- Teamorderbeelden in de PDF zijn transparant als continuiteitsbewijs uit readiness 004 gemarkeerd. De onveranderde Teamorderlogica is in de actuele 005-tests opnieuw gevalideerd.

## Reviewartefactgrens

De nieuwe review-PDF bevat actuele 005-beelden voor alle gewijzigde en pilotkritische beheer- en blokkadepaden. Voor Teamorder bevat hij herkenbaar gemarkeerde 004-continuiteitsbeelden, omdat de gerichte correctie geen Teamorder-redesign bevatte; de actuele implementatie is wel door de 005-regressies afgedekt. Er is bewust geen screenshot met verzonnen `VALIDATED` productdata gemaakt.

## Eindstatus

**ARTIKELINRICHTING PILOT: GEDEELTELIJK**

De beheerfunctionaliteit en veilige validatiegrenzen zijn compleet binnen scope, maar de feitelijke bronbevestigde productcatalogus en meerdere noodzakelijke productievelden zijn nog onvolledig.

**PILOT READINESS: NOT READY**

De release is technisch consistent en blokkeert veilig, maar een normale fysieke pilot kan pas READY worden nadat minimaal de gebruikte pilotartikelen en hun noodzakelijke productieprofielvelden bronbevestigd zijn en de human review daarmee opnieuw is uitgevoerd.

