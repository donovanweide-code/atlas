# Teamwear front/back source-to-experience

Datum: 2026-08-28
Baseline: `SPW-R2.1-ORDER-CORRECTION-HOTFIX-20260828` / `cb9615c04a587ba9696a1537847b30d6a698b5d3`

## Root cause

De bestaande Sportpaleis-productbron bevatte voor veel artikelen al meerdere officiële galerijbeelden. De synchronisatie bewaarde echter alleen de lijstthumbnail en haalde de productpagina uitsluitend op voor personalisatieclassificatie. Daardoor werd de galerij niet als cataloguswaarheid gematerialiseerd. Verder forceerde de Teamwear-catalogus iedere variant terug naar alleen `FRONT`, bekende verenigingsartikelen kregen geen immutable catalog snapshot en de artifactmanifest-generator verloor aliases wanneer Vite identieke beelden dedupliceerde.

## Generieke correctie

1. De bestaande website-sync inventariseert de officiële productgalerij binnen exact dezelfde product- en kleurcontext.
2. Catalogusmetadata bewaart `FRONT`, `BACK` en inventariseerde `ALTERNATIVE` media inclusief product-id, kleur-id, kleurlabel, bron-URL, index, authority en checked-at.
3. De bestaande catalogus-/persistencelaag bewaart deze media; er is geen aparte Teamwear-afbeeldingendatabase.
4. Teamwear erft de variantmedia en legt front/back plus provenance vast in de immutable item snapshot.
5. Studio, klantpreview, revisions, voorstel/PDF en renderfoundation gebruiken dezelfde snapshot.
6. Ontbrekende achterkant blijft `null` en wordt als gecontroleerde ontbrekende bron getoond; er wordt geen voorkant of generieke achterkant verzonnen.
7. Het buildmanifest registreert alle bronaliases, ook wanneer Vite dezelfde bytes één keer uitgeeft. De build-gate controleert per bronalias de SHA-256 en het werkelijk uitgegeven bestand.

## Broninventaris

| Meting | Resultaat |
|---|---:|
| Catalogusartikelen | 183 |
| Artikelen met actuele officiële voorkant | 182 |
| Artikelen met bewezen officiële achterkant | 102 |
| Geïnventariseerde alternatieve beelden | 12 |
| Artikelen zonder bewezen achterkant | 81 |
| Product-/kleurmismatches front versus back | 0 |
| Lokale catalogusbeelden in buildcheck | 285 |
| Back-aliases in source | 102 |
| Back-aliases in production buildmanifest | 102 |
| Ontbrekende buildaliases | 0 |

De 81 ontbrekende achterkanten worden niet gefabriceerd. Eén actuele productpagina gaf tijdens de bronrun een 404; daarvan blijft de reeds bekende lokale voorkant behouden zonder een nieuwe back-claim.

## Exacte representatieve variant

- Artikel: `sp-live-138505` / Sportpaleis product `93035`
- Kleur-id: `12079`
- Kleurlabel: `ZWART`
- Voorkant: `https://www.sportpaleis.nl/img/almere-pioneers-varsity-jacket_1000x1000_181520.webp`
- Achterkant: `https://www.sportpaleis.nl/img/almere-pioneers-varsity-jacket_1000x1000_181660.webp`
- Classificatie: `SOURCE_GALLERY_ORDER_V1`
- Authority: `SPORTPALEIS_LIVE_PRODUCT_GALLERY`

## End-to-end evidence

- Gerichte sync/catalogus/Teamwear/proposal/PDF/persistence/productiehandoff: **46/46 PASS**.
- Workspace production build inclusief bronalias/hash-gate: **PASS**.
- Productiebuild: 102/102 back-aliases resolveerbaar; 0 ontbrekend.
- Echte PDF: `teamwear-front-back/TKV-REAL-FRONT-BACK-V2.pdf`.
- PDF-identiteit: `teamwear-front-back/TKV-REAL-FRONT-BACK-V2.identity.json`.
- Gerenderde visuele inspectie: `teamwear-front-back/rendered/page-1.png`.
- Visueel: officiële voor- en achterkant, rugnummer op back, naam op front, variant/prijs/revision leesbaar, geen clipping/overlap/lege pagina.

## Status

`sync → catalogus → artikelvariant → voor/achterkant → positionering → preview → PDF/revision-evidence`: **PASS**.

Akkoord en productie gebruiken dezelfde item/revision snapshot; de bestaande productie-invarianten blijven los van visuele garment-projectie en zijn niet versoepeld.
