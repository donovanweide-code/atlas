# Sportpaleis Product Truth assurance — 2026-09-01

Status: **NO CANDIDATE / NO DEPLOYMENT**. Deze run heeft uitsluitend lokale source-, test- en buildmutaties uitgevoerd. Er is geen LIVE-, klantdata-, database-, mail-, hardware- of deploymentmutatie uitgevoerd.

## Gereconcilieerde uitkomst

- `FONT_EXECUTABLE = 49/49` actuele association/application-regels.
- `SUPPLIED_FONT_ADMISSION = 11/12` aangeleverde bestanden.
- `SVG_EXECUTABLE = 14/14` actuele matrixregels: 8/8 vereiste association/application-bindings plus 6/6 canonieke asset/contextregels.
- `ACTIVE_SVG_SOURCES_EXECUTABLE = 4/4`.
- `HOCKEY_NUMBER_SOURCE = PASS`.
- `PIONEERS_NUMBER_SOURCE = PASS`.
- `DOUBLE_NUMBER_5MM_SPACING = PASS` voor `10`, `17`, `22` en `28` via de echte geometrie- en cut-jobvalidator.
- `20CM_HEIGHT_RULE = PASS`: iedere actuele Junior- en Senior-rugnummerprofielhoogte is exact 200 mm; breedte wordt proportioneel uit de glyphcontour afgeleid.
- `SEEDORF_TDG = PASS`: vereniging aanwezig met `Spain`; zonder onbewezen automatisch geprojecteerde toepassingen.
- `SLOEPROEIEN_FALSE_REQUIREMENT_REMOVED = PASS`: `NOT_APPLICABLE`, nul toepassingen en nul association/source-matrixregels.
- `HBSA_FALSE_REQUIREMENT_REMOVED = PASS`: `NOT_APPLICABLE`, nul toepassingen en nul association/source-matrixregels; Viking is geen HBSA-productie-eis.
- `HUMAN_SOURCE_FILES_REQUIRED = []`.
- `HUMAN_PRODUCT_TRUTH_REQUIRED = []`.

`TOTAL REAL PRODUCTION ASSOCIATIONS = 18` verenigingen met ten minste één daadwerkelijke toepassing. Deze leveren samen 63 association/application-regels: `EXECUTABLE PROVEN = 63`, `BLOCKED/NOT_PROVEN = 0`, exacte resterende reden: `geen`.

HBSA kwam eerder als 64e regel binnen doordat de generieke legacyprojectie iedere positieve maat automatisch in een productieapplicatie vertaalde: de oude HBSA-rij bevatte `nameHeight: 2`, waardoor kunstmatig `name` en vervolgens `Viking-Normal` werden vereist. De authoritative no-print Product Truth staat nu vóór die projectie: HBSA heeft `productionEligibility = NOT_APPLICABLE`, een lege `productionApplications`-lijst en geen productiematen. Daarmee is de fout via de eligibility/projectiegrens verwijderd en niet met een HBSA-only UI-uitzondering.

## Font admission

Alle twaalf aangeleverde fontbestanden zijn vanuit exacte lokale bytes door hetzelfde outline- en productiecontourpad gevoerd. Elf zijn deterministisch production-executable. `VIKING-N.TTF` blijft als immutable intake-evidence geregistreerd, maar is door HBSA no-print Product Truth geen actuele association requirement. Het blijft bewust niet-authoritative:

- SHA-256: `5A3B7AB3D853FA1C78D40E54F4ADC5A4052431F555FD8E7502D2080906544F25`.
- Status: `REJECTED / PRODUCTION_FONT_GEOMETRY_INVALID`.
- Representatieve naamproef `VAN DER MEER`: drie `SELF_INTERSECTION`-bevindingen (`admission-2-g2-c1`, `admission-2-g6-c1`, `admission-2-g10-c1`).
- Geen OS-fontfallback, Liberation-substitutie of stil herstel toegepast.

## Pioneers provenance

- Immutable origineel: `Almere-Pioneers-rugnummers-20cm.original.svg`.
- Originele SHA-256: `FD6716E5911EB5AB239D291808DC490ECF305FD3F30C49E183AB063097C67143`.
- Deterministische afleiding: twee samengestelde dubbele objecten (`22`, `36`) uitgesloten; tien unieke enkelglyphs `0–9` behouden, voldoende voor rugnummers `1–10`.
- Production source: `Almere-Pioneers-rugnummers-20cm.normalized.svg`.
- Production SHA-256: `5CC303321ADCB7BF9F0722E6BDFE8CCAD6BBABA28139AF77DB08CA3C478BD709`.
- De historische Junior-160-mm-bron blijft immutable evidence met lifecycle `SUPERSEDED_BY_PRODUCT_TRUTH_200MM` en wordt niet meer als actuele productiebron geprojecteerd.

## Hockey en geometrie

`production-asset-verified-hockey-rug-200` is hard aan alleen de rugnummertoepassingen van MHC Lelystad, Almeerse Hockeyclub en Buitenhout MHC gebonden. Namen blijven afzonderlijk op de authoritative Myriad Pro Bold-fontbron.

De SVG→productiecontourgrens verwijdert generiek uitsluitend sub-0,01-mm dubbele sluitpunten en vrijwel nul-oppervlakte heen-en-terugspikes, registreert het verwijderde puntaantal en valideert ieder glyph daarna fail-closed. Hierdoor is onder meer hockeyglyph `8` zonder dubbele snijlijn of zelfkruising uitvoerbaar, terwijl de originele SVG-bytes en hash onveranderd bewijs blijven.

## Verificatie

- Product Truth-tests: 5/5 PASS.
- Exhaustieve actuele association/source executability: 63/63 `VALID` regels produceerden deterministische 1:1 contouroutput; er zijn geen resterende blockers of niet-bewezen actuele toepassingen.
- Actuele SVG-source executability: 4/4 PASS.
- Authoritative static assetregistry: 7/7 PASS na lokale Workspace-build.
- `npm run build:workspace`: PASS; TypeScript, Vite en Workspace-buildverificatie groen.
- De volledige historische repositorytestsuite is ook uitgevoerd, maar is niet volledig groen: meerdere oudere fixtures verwachten inmiddels vervallen 160/220-mm-rugnummers, eerdere ontbrekende-fonttoestanden of oude bronbindings. Daarom wordt geen algemene release-readiness geclaimd.

Er is geen fysieke plotter-/hardwareproef uitgevoerd. Deze rapportage bewijst software-executability en overselt dat niet als fysieke productieacceptatie.
