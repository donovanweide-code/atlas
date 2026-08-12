# Sportpaleis Workspace — final pre-live completion 006

Datum: 2026-08-12
Kandidaat: `SPW-FINAL-PRELIVE-COMPLETION-006-20260812`
Status: **LOCAL HUMAN REVIEW REQUIRED — NOT DEPLOYED**

## Canonieke catalogusgrens

- Eerste-partij audit: `SPW-PRELIVE-LIVE-PRINT-AUDIT-20260812`.
- Audit SHA-256: `5E6709816F2F5B81E422B8AB85541D654DC4BEAFA44B9370EEEB4C3BEDDD4B4F`.
- 450 werkelijk live zichtbare producten gecontroleerd.
- 183 producten hebben op de actuele productpagina een concrete bestelbare personalisatieoptie en zijn opgenomen in Bedrukken.
- 267 producten zonder productspecifiek bewijs blijven buiten Bedrukken; dit zijn geen menselijke beslispunten.
- Alle 183 opgenomen producten hebben een first-party productbeeld, SKU/artikelnummer, actuele maten, prijs per maat en de zichtbare personalisatieoptie met prijs/provenance.
- Alle 20 first-party verenigingslogo's zijn lokaal met bron-URL, controledatum en SHA-256 vastgelegd.
- De verenigingsselectie in Bedrukken wordt dynamisch uit de actieve gevalideerde catalogus afgeleid.
- Daardoor toont Bedrukken 16 verenigingen. Almere'81, Buitenhout MHC, HBSA en Sloeproeien blijven als organisatie/context en beheerdossier bestaan, maar zijn niet zichtbaar in Bedrukken zolang hun aantal actuele bedrukartikelen nul is.

## Samengestelde feedbackcontrole

| Onderdeel | Status | Feitelijke grens |
|---|---|---|
| Login/startbranding, titel, favicon en PWA | INCLUDED | Sport 2000 Sportpaleis; WBD-entrypoint blijft afzonderlijk |
| Desktopheader, alignment en mobiele shell | INCLUDED | Desktop en 390 px zonder horizontale overflow |
| Admin-hoofdnavigatie en werkcontexten | INCLUDED | Volledig menu naast vierdelige mobiele dagelijkse navigatie |
| Bedrukken: klant → vereniging → bedrukking → artikelen → controleren | INCLUDED | 183 artikelen, 16 dynamische verenigingen |
| Artikelafbeeldingen, SKU, artikelvolgorde, maten en maatprijzen | INCLUDED | First-party bron en actuele productpagina |
| Bedrukkingsprijzen en personalisatieopties | INCLUDED | Alleen actuele zichtbare bestelbare opties; niets afgeleid |
| Maat en contactpersoon optioneel waar afgesproken | INCLUDED | Server-side en UI-tests |
| Rugnummer, naam, initialen en shortnummer per artikelregel | INCLUDED | Alleen velden die de actuele productpagina ondersteunt |
| Exemplaarregels en orderbrede overname/override | INCLUDED | Dezelfde server-side orderkern |
| Tussenvoegsel en samengestelde initialen | INCLUDED / DATA_GAP | `JM + vd → JvdM`; exacte fysieke infixmaat/spacing/baseline blijft fail-closed tot profielbevestiging |
| Teamorder en Vrije opdruk | INCLUDED | Dezelfde permissie- en productiegrenzen; geen aparte waarheid |
| Post-save/controleflow en menselijke statuslabels | INCLUDED | Productie-DATA_GAP blokkeert pas fysieke productie, niet orderinvoer/controle |
| Orders, directe productievoorstellen, filters en toolbar | INCLUDED | Server-side status is autoritatief |
| Outputgedreven preview, PlotJob-historie en replot | INCLUDED | Immutable snapshot; geen automatische hardware-send |
| Beheer: verenigingen, artikelen, prijzen en productie-instellingen | INCLUDED | Bronwaarden zichtbaar/bewerkbaar met revisie en audit |
| Mensen: Gebruikers en Werknemers | INCLUDED | Gescheiden modellen en server-side rolgrenzen |
| Werknemers/verkoopnummers | INCLUDED | Alleen bevestigd record Donovan / 45; niet aan een login gegokt |
| Rollen Beheerder, Productie en Winkel | INCLUDED | Werkelijke server-side capabilities; lokale demo-ingangen gebruiken dezelfde API-autorisatie |
| 20 verenigingsdossiers en logo's | INCLUDED | Bekende waarden ingevuld; individuele onbekenden blijven DATA_GAP |
| Summa Direct | NOT INCLUDED | Buiten scope en niet geactiveerd |

## Normale Pioneers-productieketen

Een verse normale Pioneers-order met de bewezen rugnummer-2-bron doorloopt zonder Golden fixture als orderinput:

`normale order → personalisatie → productionLines → productievoorstel → outputgedreven preview → PLOT-*.svg → gekoppelde PlotJob/historie`

Het gegenereerde productieartefact is een 1:1 SVG van writer `cutjob-svg@1`. De ketentest bewijst byte-identieke afleiding uit de gevalideerde Pioneers-bron. `PLOT-2026-0004-production.svg` is daarnaast fysiek HUMAN PASS via SVG → Illustrator → Summa Send To WinPlot → Summa. Dit bewijs geldt uitsluitend voor de gekoppelde Pioneers-bron en route. Er is geen wijziging aangebracht aan Golden geometrie, schaal, spiegelstrategie of fysieke writer-output.

## 20-verenigingenmatrix

Notatie `Bedrukken/live`: geselecteerde actuele bedrukartikelen tegenover alle werkelijk live zichtbare producten. `Prijs` en `beeld` geven dekking binnen de geselecteerde Bedrukken-set.

| Vereniging | Bedrukken/live | Beeld | Artikel- en bedrukkingsprijs | Personalisatie | Junior/Senior, font, folie en afmetingen | Productieprofiel/status | Resterende DATA_GAP |
|---|---:|---:|---:|---|---|---|---|
| Almere'81 | 0/20 | 0/0 | 0/0 | — | Fontbron Myriad Pro Italic; overige productiewaarden deels onbekend | Niet zichtbaar in Bedrukken | Geen actueel artikel met bestelbare personalisatie; folie/afmetingen |
| Almerer Pioneers | 4/10 | 4/4 | 4/4 | Rug-/shortnummer/naam volgens artikel | FFF englisch/Pioneers; wit; Junior bron 16 cm, Senior 20 cm, borst/short 8 cm, naam 2 cm | Orderbaar; bewezen Senior-rugnummerroute fysiek gevalideerd | Niet-bewezen artikel-/veldcombinaties blijven fail-closed |
| As,8o | 29/53 | 29/29 | 29/29 | Volgens actuele productoptie | Spain; wit; initialen 3 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| A.S.C. Waterwijk | 22/41 | 22/22 | 22/22 | Volgens actuele productoptie | Schluber/Spain; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| Brouwersports | 5/8 | 5/5 | 5/5 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, short 7,5 cm, naam 5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| Buitenhout MHC | 0/22 | 0/0 | 0/0 | — | Myriad Pro Bold bron; wit; bekende nummer/naamwaarden bewaard | Niet zichtbaar in Bedrukken | Geen actueel artikel met bestelbare personalisatie |
| DCG | 14/30 | 14/14 | 14/14 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| EKVA | 6/17 | 6/6 | 6/6 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, borst/short 7,5 cm, naam 5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| FC Almere | 20/36 | 20/20 | 20/20 | Volgens actuele productoptie | Schluber/Spain; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| FC Huizen | 14/38 | 14/14 | 14/14 | Volgens actuele productoptie | Spain; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, borst 3 cm, short 7,5 cm, naam 5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| HBSA | 0/11 | 0/0 | 0/0 | — | Viking-Normal; geel; naam 2 cm | Niet zichtbaar in Bedrukken | Geen actueel artikel met bestelbare personalisatie |
| MHC Lelystad | 4/19 | 4/4 | 4/4 | Volgens actuele productoptie | Myriad Pro Bold bron; wit/zwart; Junior bron 20 cm, Senior 22 cm, naam 3,2 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| Najaden | 2/3 | 2/2 | 2/2 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, Junior/Senior 20 cm, borst/short 7,5 cm, naam 5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| SC Buitenboys | 22/35 | 22/22 | 22/22 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| SC Geinburgia | 6/23 | 6/6 | 6/6 | Volgens actuele productoptie | Spain; wit; initialen 3,5 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| Sporting Almere | 9/26 | 9/9 | 9/9 | Volgens actuele productoptie | Spain; wit; initialen 3,5 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| VVA / Spartaan | 9/29 | 9/9 | 9/9 | Volgens actuele productoptie | Schluber; wit; initialen 3 cm, Junior bron 20 cm, Senior 22 cm, short 7,5 cm | Orderbaar; productie fail-closed | Contour/fontbestand en fysieke combinatievalidatie |
| Wooter | 15/18 | 15/15 | 15/15 | Volgens actuele productoptie | Spain; wit; initialen 3,5 cm | Orderbaar; productie fail-closed | Overige afmetingen, contour/fontbestand en fysieke combinatievalidatie |
| Sloeproeien | 0/5 | 0/0 | 0/0 | — | Bronwaarde font `X`; wit | Niet zichtbaar in Bedrukken | Geen actueel artikel met bestelbare personalisatie; bruikbaar font/afmetingen |
| Hasselbaink | 2/6 | 2/2 | 2/2 | Volgens actuele productoptie | Spain; wit; Junior bron 20 cm, Senior 22 cm | Orderbaar; productie fail-closed | Overige afmetingen, contour/fontbestand en fysieke combinatievalidatie |

## Verificatie

- Gerichte correctie-/regressiecluster: **54/54 PASS**.
- Volledige Sportpaleis-suite: **229/229 PASS**.
- Volledige repositorysuite: **530/536 PASS**. De zes fouten behoren uitsluitend tot reeds aanwezige, ongerelateerde untracked Atlas-contextfixtures; geen Sportpaleis-test faalt.
- `build:workspace`: **PASS**; TypeScript, Vite, build-boundary en runtime syntax; 195 releasebestanden gecontroleerd.
- Desktop en 390 px browser-smoke: **PASS**; geen horizontale overflow of relevante console-errors.
- Golden Physical Case 001: `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571` — ongewijzigd.
- Golden Physical Batch 001: `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B` — ongewijzigd.
- Pre-mirror A/B: `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4` — ongewijzigd.
- PLOT-2026-0004 SVG: `26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6` — ongewijzigd en begrensd fysiek HUMAN PASS.

Geen deployment, DNS/Nginx-wijziging, productiedatamigratie, mail-send, Summa Direct-activatie of hardwareactie is uitgevoerd.
