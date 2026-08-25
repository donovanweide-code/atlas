# Werkelijk resterende menselijke Product Truth-acties

Read-only bepaald op live revision **1013** onder release **SPW-FINAL-CONSOLIDATION-CLEAN-START-R1-20260825**. Workspace heeft **28 verenigingen**, **190 artikelen**, **120 productieprofielen**, **6 productieassets** en **4 font-/nummerbronnen**. Geen productiegegevens zijn gewijzigd.

De eerdere inventarisatie bevatte **72 ruwe signalen**. Daarvan waren 31 plaatsingssignalen en 31 spiegelingssignalen geen menselijke bedrijfskeuzes: de bestaande decoration-/productieregels bepalen plaatsing en de golden production rule bepaalt spiegeling. Deze 62 pseudo-acties zijn uit de menselijke werklijst verwijderd.

**72 RAW → 10 REAL HUMAN ACTIONS.** Waarden worden bewust niet gegokt; na bevestiging gebruikt Workspace ze automatisch.

| # | Vereniging/context | Wat ontbreekt | Waarom niet automatisch bewezen | Waar | Donovan doet | Daarna automatisch |
|---:|---|---|---|---|---|---|
| 1 | Almere'81 | Actuele artikelen | Er zijn geen actieve artikelen aan deze vereniging gekoppeld. | Beheer > Verenigingen > Almere'81 > Artikelen | Controleer de bronkoppeling en voer daarna de bestaande websitecontrole uit. | De artikelen worden beschikbaar in Orders, Webshop en Teamwear. |
| 2 | Almere'81 | Productieprofiel | Geen actief artikel verwijst naar een productieprofiel. | Beheer > Productieprofielen > Almere'81 | Koppel per bedrukbaar artikel het bestaande juiste productieprofiel. | Workspace kan maat, plaatsing, kleur en productiemethode automatisch toepassen. |
| 3 | Almere'81 | Foliekleur | Voor deze vereniging is geen toegestane foliekleur bevestigd. | Beheer > Verenigingen > Almere'81 | Kies de werkelijk gebruikte foliekleur uit de bestaande rollen/configuratie. | Nieuwe productie wordt automatisch aan de juiste open kleurbatch gekoppeld. |
| 4 | Buitenhout MHC | Actuele artikelen | Er zijn geen actieve artikelen aan deze vereniging gekoppeld. | Beheer > Verenigingen > Buitenhout MHC > Artikelen | Controleer de bronkoppeling en voer daarna de bestaande websitecontrole uit. | De artikelen worden beschikbaar in Orders, Webshop en Teamwear. |
| 5 | Buitenhout MHC | Productieprofiel | Geen actief artikel verwijst naar een productieprofiel. | Beheer > Productieprofielen > Buitenhout MHC | Koppel per bedrukbaar artikel het bestaande juiste productieprofiel. | Workspace kan maat, plaatsing, kleur en productiemethode automatisch toepassen. |
| 6 | HBSA | Actuele artikelen | Er zijn geen actieve artikelen aan deze vereniging gekoppeld. | Beheer > Verenigingen > HBSA > Artikelen | Controleer de bronkoppeling en voer daarna de bestaande websitecontrole uit. | De artikelen worden beschikbaar in Orders, Webshop en Teamwear. |
| 7 | HBSA | Productieprofiel | Geen actief artikel verwijst naar een productieprofiel. | Beheer > Productieprofielen > HBSA | Koppel per bedrukbaar artikel het bestaande juiste productieprofiel. | Workspace kan maat, plaatsing, kleur en productiemethode automatisch toepassen. |
| 8 | Sloeproeien | Actuele artikelen | Er zijn geen actieve artikelen aan deze vereniging gekoppeld. | Beheer > Verenigingen > Sloeproeien > Artikelen | Controleer de bronkoppeling en voer daarna de bestaande websitecontrole uit. | De artikelen worden beschikbaar in Orders, Webshop en Teamwear. |
| 9 | Sloeproeien | Productieprofiel | Geen actief artikel verwijst naar een productieprofiel. | Beheer > Productieprofielen > Sloeproeien | Koppel per bedrukbaar artikel het bestaande juiste productieprofiel. | Workspace kan maat, plaatsing, kleur en productiemethode automatisch toepassen. |
| 10 | Teamwear (centrale catalogus) | Authoritative supplier-catalogusverbinding | De applicatie heeft een begrensd adaptercontract, maar er is nog geen bevestigde leverancier/feed en toegangscontract. | Beheer > Teamwear > Catalogusbron | Bevestig de leverancier/feed en laat de bestaande technische toegang veilig configureren. | Nieuwe supplierartikelen worden begrensd gesynchroniseerd naar Collectie zonder tweede productwaarheid. |

## Automatisch afgeleid

- Plaatsing volgt de bestaande artikel-, decoration- en productieregels.
- Spiegeling volgt de bestaande golden production rule.
- Bekende maten, fonts, kleuren, bronnen en methodes blijven gekoppeld aan hun profiel en assetversie.

## Consolidatiegrens

Deze tien acties zijn bestaande onbekende bedrijfswaarheid. Ze blokkeren geen production-ready contexten; ieder onvolledig profiel blijft fail-closed voor die specifieke output. De clean start, bestaande gevalideerde profielen en actuele Product Truth blijven intact.
