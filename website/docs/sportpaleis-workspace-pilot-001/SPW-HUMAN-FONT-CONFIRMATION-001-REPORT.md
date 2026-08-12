# Sportpaleis productieprofielen — Human Font Confirmation 001

Datum vergelijking: 2026-08-13
Evidence-ID: `SPW-HUMAN-FONT-CONFIRMATION-001-20260812`

## Bewijsgrens

De door Donovan bevestigde vereniging-naar-fonttabel bewijst uitsluitend de leesbare fontnaam en expliciete verwijzingen/uitzonderingen. Een naam of AI-vectorverwijzing bewijst niet dat het oorspronkelijke TTF/OTF/WOFF-fontbestand aanwezig, gelicentieerd of productiebruikbaar is. Daarom blijven alle zes gevraagde Sportpaleis-fontassets `DATA_GAP`.

De ongewijzigde ruwe tabelwaarde blijft per vereniging in `fontEvidence.sourceValue` bewaard. De operationele naam staat afzonderlijk in `fontProfile`; provenance staat onder evidence-ID `SPW-HUMAN-FONT-CONFIRMATION-001-20260812`.

## Vergelijking per vereniging

| Vereniging | Waarde vóór correctie | Human-confirmed bronwaarde | Huidige operationele waarde | Status | Minimale correctie | Fontbestand |
|---|---|---|---|---|---|---|
| Almere '81 | Myriad Pro - Italic | Myriad Pro - Italic | Myriad Pro Italic | MATCH | Spelling naar afzonderlijke canonieke identiteit | NEE |
| Almerer Pioneers | FFF englisch + mapnotitie | FFF englisch + bronverwijzing | FFF englisch | MATCH | Fontnaam en AI-vectorverwijzing gescheiden | NEE |
| AS '80 (`As,8o` in bronrecord) | Spain | Spain | Spain | MATCH | Geen fontwijziging; naamkoppeling door actuele first-party AS'80-artikelen ondersteund | NEE |
| ASC Waterwijk (`A.S.C. Waterwijk`) | schluber + Spain-thuisuitzondering | schluber; Spain = thuis shirt/short | Schluber + afzonderlijke Spain-uitzondering | MATCH | Casing en uitzondering gescheiden | NEE |
| Brouwersports | schluber | schluber | Schluber | MATCH | Casing | NEE |
| Buitenhout MHC | Myrad pro - Bold + mapnotitie | bedoeld als Myriad Pro Bold + verwijzing | Myriad Pro Bold | MATCH | Bevestigde spelling; AI-referentie afzonderlijk | NEE |
| DCG | schluber | schluber | Schluber | MATCH | Casing | NEE |
| EKVA | schluber | schluber | Schluber | MATCH | Casing | NEE |
| FC Almere | schluber + Spain-thuisuitzondering | schluber; Spain = thuis shirt/short | Schluber + afzonderlijke Spain-uitzondering | MATCH | Casing en uitzondering gescheiden | NEE |
| FC Huizen | spain | spain | Spain | MATCH | Casing | NEE |
| HBSA / bevestiging noemt FSA | Viking-Normal | FSA → Viking-Normal | Viking-Normal, niet opnieuw bevestigd voor HBSA | MISMATCH | Geen correctie; FSA en HBSA niet gelijkgesteld | NEE |
| MHC Lelystad | Myrad pro - Bold + mapnotitie | Myrad pro - Bold | Myriad Pro Bold | MATCH | Bevestigde spelling; AI-referentie afzonderlijk | NEE |
| Najaden | schluber | schluber | Schluber | MATCH | Casing | NEE |
| SC Buitenboys | schluber | schluber | Schluber | MATCH | Casing | NEE |
| SC Geinburgia | Spain | Spain | Spain | MATCH | Geen | NEE |
| Sporting Almere | Spain | Spain | Spain | MATCH | Geen | NEE |
| VVA / Spartaan | schluber | schluber | Schluber | MATCH | Casing | NEE |
| Wooter | spain | spain | Spain | MATCH | Casing | NEE |
| Sloeproeien | X | X = geen bevestigd bruikbaar font | DATA_GAP | DATA_GAP | `X` expliciet niet als fontidentiteit gebruiken | NEE |
| Hasselbaink | Spain | Spain | Spain | MATCH | Geen | NEE |

## Unieke fontassetinventaris

| Bevestigde naam | Echt fontbestand aanwezig | Exacte aanwezige identiteit/verwijzing | Productiebruikbaarheid |
|---|---:|---|---|
| Myriad Pro Italic | NEE | Geen TTF/OTF/WOFF geregistreerd | DATA_GAP; niet vrijgegeven |
| Myriad Pro Bold | NEE | `Buitenhout - Lelystad nummers.ai`, SHA-256 `DE29A4CA4B77D429327E2A5758993687DB3A34C57CA3D7951763BD15F4FCF6B8`; AI-vectorreferentie, geen fontbestand | DATA_GAP als font; referentie aanwezig |
| FFF englisch | NEE | `Pioneers nummers.ai`, SHA-256 `FB2D8FF0939ACAE08FF4264C02775A317988F21DD09B6CA4F5DF178A1F7A3582`; AI-vectorreferentie, geen fontbestand | DATA_GAP als algemeen font; specifieke bewezen Pioneers-cijfercontouren behouden hun eigen begrensde fysieke bewijs |
| Spain | NEE | Geen TTF/OTF/WOFF geregistreerd | DATA_GAP; niet vrijgegeven |
| Schluber | NEE | Geen TTF/OTF/WOFF geregistreerd | DATA_GAP; niet vrijgegeven |
| Viking-Normal | NEE | Geen TTF/OTF/WOFF geregistreerd; bovendien FSA/HBSA-identiteitsmismatch | DATA_GAP; niet vrijgegeven |

`LiberationSans-Regular.ttf` is wel lokaal geregistreerd (SHA-256 `F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F`), maar is geen van de zes bevestigde Sportpaleis-fontfamilies en is niet als vervanging gebruikt.

## Overige productieconflicten — read-only

1. **FSA versus HBSA:** de nieuwe bevestiging noemt FSA; het bestaande twintig-verenigingenrecord heet HBSA. Dit blijft een menselijke identiteitsbeslissing. Viking-Normal is niet op grond van deze bevestiging opnieuw aan HBSA gekoppeld.
2. **Pioneers Junior:** de oorspronkelijke verenigingsbron bevat 16 cm, terwijl een afzonderlijk later Human productbesluit kledingmaten 116–164 op 200 mm zet. Beide bronnen blijven gescheiden; de fysiek bewezen Pioneers-route blijft uitsluitend Senior 200 mm voor de bewezen cijfers. Geen Junior-output is door deze fontcorrectie vrijgegeven.
3. **Waterwijk en FC Almere:** Schluber is het basisfont; Spain blijft uitsluitend als thuiswedstrijdshirt/-shortuitzondering vastgelegd. De uitzondering is niet weggecanonicaliseerd.
4. **Kleur, afmetingen, nummer-/naamhoogtes en bijzonderheden:** geen waarden gewijzigd. De bestaande ruwe bronfixture blijft 20/20 reproduceerbaar; de gerichte test vergelijkt die voortaan met `fontEvidence.sourceValue` in plaats van met de operationeel gecanoniseerde naam.

## Verificatie

- Gerichte Human Font Confirmation-tests: 4/4 PASS.
- Bronfixture + gerichte readiness: 11/11 PASS.
- Relevante productie-, profiel-, Golden- en historie-regressies: 108/108 PASS.
- `build:workspace`: PASS; 195 bestanden gecontroleerd.
- Golden Physical Case 001 SHA-256: `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571` — ongewijzigd.
- Golden Physical Batch 001 SHA-256: `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B` — ongewijzigd.
- Pre-mirror A/B SHA-256: `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4` — ongewijzigd.
- PLOT-2026-0004 SVG SHA-256: `26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6` — ongewijzigd.

Geen font gedownload of vervangen. Geen onbevestigd font tot feit gepromoveerd. Geen deployment, datastoremutatie, productieartifact of hardwareactie uitgevoerd.
