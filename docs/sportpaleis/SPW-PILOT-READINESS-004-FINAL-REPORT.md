# Sportpaleis Workspace - Final Pilot Readiness 004

Release: `SPW-BEDRUKKING-PILOT-READINESS-004-20260810`  
Datum: 10 augustus 2026  
Omgeving: uitsluitend lokaal, review/demo  
Eindstatus: **READY FOR FINAL HUMAN PILOT REVIEW**

## Wijzigingen

- De normale orderflow vereist minimaal één daadwerkelijke bedrukking. Een order zonder bedrukking wordt server-side en in de interface geweigerd.
- De winkelmedewerker ziet de rustige volgorde Klant -> Bedrukking -> Vereniging -> Artikelen -> Controleren. Teamorder en Eigen artikel zijn bereikbaar als secundaire ordersoorten en domineren de normale flow niet.
- Shortnummer erft de orderstandaard zonder visuele of semantische uitval.
- Teamorder legt eerst groepsinformatie, pilotrelevante artikelen, bedruksoorten en nummerreeks vast. De reeks 1-18 maakt daarna 36 controleerbare artikelregels voor twee artikeltypen. Afwijkingen en extra speler-/artikelregels blijven afzonderlijk aanpasbaar.
- Teamorder toont alleen artikelen uit de expliciet bewaarde pilotcatalogus. Een deels onbevestigd FC Almere-artikel wordt niet als teamcatalogus gepresenteerd.
- De laatst opgeslagen winkelorder toont medewerker en vastgelegde verkoopsnapshot. Verkoopnummers zijn alleen door Beheer te onderhouden en worden niet achteraf in historische orders herschreven.
- Orders ondersteunt 10/20/30/alles zichtbaar selecteren en maakt daarna eerst een menselijk productievoorstel.
- Productievoorstellen groeperen op foliekleur, bedrukking en profiel. DATA_GAP schakelt GO uit; dezelfde overgang wordt ook server-side geweigerd.
- Patrick kan technische profielen, fysieke maten, positie, letterprofiel, afstand en rotatie alleen-lezen raadplegen. Beheer blijft eigenaar.
- Verenigingscorrecties gebruiken revisiecontrole, bronnotitie, validatiestatus, history en audit.
- Feedback ondersteunt maximaal drie PNG/JPEG/WebP-bijlagen van maximaal 5 MB per bestand. De bootstrap bevat geen base64; downloaden blijft geautoriseerd.
- De Sportpaleis-mail gebruikt de generieke Mail Foundation met organisatieconfiguratie: volle zwarte header, rode scheidingslijn en groter goedgekeurd mail-safe Sportpaleis-logo. Alleen capture-preview is gebruikt.
- De compacte zwarte Workspace-header draagt op desktop en mobiel duidelijk SPORT 2000 SPORTPALEIS / WORKSPACE.

## Design recovery

De laatste aantoonbaar goedgekeurde richting is de rustige Sportpaleis Workspace-richting uit Pilot Build 001, UX Simplification/Pilot Polish 002 en Capability 003: zwarte compacte merkheader, lichte werkvlakken, gewone winkeltaal, kaartselectie, orderbrede standaarden, rode afwijkingen en dezelfde navigatiepatronen op desktop en mobiel.

Behouden en hersteld:

- rustige shell en compacte merkheader;
- visuele verenigings- en artikelcontext;
- orderbrede standaardbedrukking met rode artikelafwijkingen;
- kaart- en lijstpatronen in plaats van een generiek dashboard of page-builder;
- herkenbare status- en aandachtspatronen;
- desktop en 390px binnen dezelfde ontwerpgrammatica;
- Teamorder als begeleide groepsinvoer binnen de bestaande ordertaal.

Niet opnieuw ontworpen: navigatiearchitectuur, rollenmodel, orderfasen, Mail Foundation, productieprofielmodel en hardwaregrenzen.

## Bronbesluiten en artikelinventaris

Bronhiërarchie:

1. `info bedrukkingen 2026.xlsx` - verenigingsspecifieke letterprofielen, foliekleuren en bronmaten.
2. `Untitled-43.ai` - algemene praktijkreferentie voor productieopbouw.
3. `Pioneers nummers.ai` - uitsluitend specifieke, eerder gevalideerde cijfercontouren.
4. `Sportpaleis-Snijtest-001-2-34-77.ai` - alleen de gevalideerde Senior-testmaat van Almerer Pioneers; niet gegeneraliseerd.
5. `NEW2025-CID_Manual_BENE sep 25.pdf` - primaire CID authority; het 2026-logo-overzicht bepaalt de gebruikte Sportpaleis-variant.

| Vereniging | Artikelstatus | Pilotbesluit |
|---|---|---|
| A.S.C. Waterwijk | `PILOT_CATALOG_PRESERVED_SOURCE_VALIDATION_PARTIAL` | 10 bewaarde catalogusartikelen, waarvan 9 bedrukbaar; enige Teamorder-pilotcatalogus. Bronvalidatie blijft gedeeltelijk. |
| FC Almere | `PARTIAL_SINGLE_ARTICLE_SOURCE_VALIDATION_REQUIRED` | Eén presentatiepolo aanwezig. SKU en afbeelding niet gevalideerd; daarom niet als Teamorder-pilotcatalogus gebruikt. |
| Almere'81 | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Almerer Pioneers | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen; productieconfiguratie is geen artikelcatalogus. |
| As,8o | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Brouwersports | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Buitenhout MHC | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| DCG | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| EKVA | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| FC Huizen | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| HBSA | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| MHC Lelystad | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Najaden | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| SC Buitenboys | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| SC Geinburgia | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Sporting Almere | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| VVA / Spartaan | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Wooter | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Sloeproeien | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |
| Hasselbaink | `NO_VALIDATED_ARTICLES` | Geen artikelkaarten tonen. |

## Datagaps en resterende Sportpaleis-input

- Fysieke Junior-rugnummerhoogte is per vereniging niet bevestigd. Junior blijft geblokkeerd.
- Voor 18 van 20 verenigingen ontbreekt een gevalideerde artikelcatalogus.
- FC Almere SKU en productafbeelding vereisen bronbevestiging.
- Artikel- en bedrukkingsprijzen ontbreken in gevalideerde bronnen; de Workspace rekent niets fictiefs.
- Positionering en referentieafstanden zijn niet voor iedere vereniging afzonderlijk bevestigd.
- Folie-inkoopprijzen, leveranciers/types en oorspronkelijke rollengtes blijven onbekend waar geen bron bestaat.
- De precieze Workspace-naar-bestandshandoff is niet brongevalideerd. Workspace stuurt niets naar Illustrator, WinPlot, Summa of Direct Print.

Pilotklaar is daarom: **A.S.C. Waterwijk binnen de bewaarde pilotcatalogus en brongeconfigureerde Senior-profielen, met menselijke productiecontrole**. Andere verenigingen blijven context/configuratie en worden niet als volledig pilotklare artikelcatalogus voorgesteld.

## Praktijkscenario's

| Scenario | Resultaat | Bewijs |
|---|---|---|
| A - Winkelmedewerker | PASS | Login, normale order, minimaal één bedrukking, vereniging/artikel, shortnummer-erfenis, controle, verkoopsnapshot en laatste order zijn getest. |
| B - Meerdere verenigingen | PASS | Eén order met artikelen uit twee verenigingen blijft één klantorder; detail- en controlemodel bewaren vereniging en profiel per regel. |
| C - Productie | PASS | 10/20/30/alles-selectie, foliegroepering, voorstel, menselijke GO en stop vóór hardware zijn getest. DATA_GAP blokkeert GO. |
| D - Productierol | PASS | Productievoorraad, ordercontext en technische profielen zijn zichtbaar; financiële/adminroutes blijven server-side afgeschermd. |
| E - Feedback | PASS | Tekst, desktop-/mobiele afbeeldingsbijlage, contextopslag en geautoriseerde retrieval zijn getest. |
| F - Admin | PASS | Verenigingscorrectie, revision/history/audit, gebruiker/verkoopnummer en DATA_GAP-behoud zijn getest. |
| Teamorder 18 | PASS | Reeks 1-18, twee artikeltypen, 36 regels en afwijkend nummer 99 zijn getest. |

## New employee / low digital skill review

Verder vereenvoudigd:

- normale order toont één herkenbare volgorde en vraagt productie-instellingen niet aan winkelmedewerkers;
- Teamorder vraagt eerst groep, artikeltypen en reeks en toont individuele regels pas daarna;
- secundaire ordersoorten staan achter één rustige uitklapper;
- knoppen gebruiken werktaal: Nieuwe order, Regels voorbereiden, Controleren, Maak productievoorstel, GO - naar productie;
- ontbrekende bronnen worden als DATA_GAP of Onbekend getoond in plaats van als technische fouttekst.

Nog uitleg nodig:

- een korte operationele afspraak over wanneer Teamorder versus normale order wordt gekozen;
- Sportpaleis moet de betekenis en fysieke validatie van Junior bevestigen voordat die optie productierijp kan worden;
- productie blijft menselijke kennis vereisen na Workspace-GO, omdat de bestandshandoff bewust niet is geautomatiseerd.

Een nieuwe winkelmedewerker kan de primaire normale orderflow zonder handleiding herkennen en doorlopen. De grootste resterende twijfel zit niet in de bediening maar in ontbrekende brondata voor niet-gevalideerde verenigingen en Junior-productie.

## Tests en validatie

- Volledige Node-regressiesuite: **434/434 PASS**, 0 failures, 0 skipped.
- Gerichte Readiness 004-suite: **9/9 PASS**.
- TypeScript + Workspace-build + build boundary verification: **PASS**; 6 buildbestanden gecontroleerd.
- Browserreview: winkelmedewerker, Patrick/Productie en Kevin/Beheer op desktop; relevante flows op 390px; **0 browser warnings/errors**.
- Mailtemplate: desktop + 390px capture-render gecontroleerd; geen echte mail verzonden.
- Reviewbeelden: 20 lokale PNG-captures, logisch gebundeld in de definitieve PDF.

## Security- en activatiegrenzen

- Geen deployment, TransIP- of DNS-mutatie.
- Geen echte klantmail; Mail Foundation transport bleef `capture`.
- Geen WinPlot-, Summa-, Illustrator- of Direct Print-aansturing.
- `hardwareSendEnabled` blijft false.
- Rollen en adminrechten worden server-side afgedwongen.
- CSRF, sessies, idempotency, revisiecontrole, audit/history en veilige attachmentlimieten blijven actief.
- De SQL-migratie is uitsluitend voorbereid en niet op een database uitgevoerd.

## Deployment-readiness

De lokale build en gecontroleerde pilotflows zijn klaar voor menselijke pilotreview. Productiedeployment is niet uitgevoerd of geautoriseerd. Voor bredere uitrol blijven fysieke Junior-validatie, catalogusbevestiging per vereniging en de afgesproken beheer-/operationele acceptatie nodig.

**READY FOR FINAL HUMAN PILOT REVIEW**
