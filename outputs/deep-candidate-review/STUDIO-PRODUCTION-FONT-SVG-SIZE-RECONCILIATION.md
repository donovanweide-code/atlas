# Studio / productie / fonts / SVG / maatwaarheid

Candidate: `SPW-PRODUCTION-TEAMWEAR-DEEP-REVIEW-CANDIDATE-R1-20260828`
Basis: `cb9615c04a587ba9696a1537847b30d6a698b5d3`
Productie gewijzigd: **NO**
Deployment uitgevoerd: **NO**

| Requirement | Implementatie / waarheid | Evidence | Status |
|---|---|---|---|
| Studio-bron direct toevoegen | Bestaande proposal-sourceflow ondersteunt meerdere bestanden en wordt in Studio aangeboden als kiezen, slepen of plakken. Geen tweede assetdatabase. | `sportpaleis-teamkit-experience.ts`; contracttest | DONE |
| Originele bron behouden | Upload blijft via `addTeamkitProposalSource` naar de centrale voorstel-/contextbron lopen; hash en origineel blijven leidend. | bestaande Teamwear upload/persistence-regressie | ALREADY CORRECT |
| Bekende fysieke maat niet via canvas wijzigen | RESOLVED Product Truth zonder expliciete override zet `data-size-locked`; resize-handle ontbreekt en breedte/hoogte/visuele slider zijn disabled. | browser 390/320 + contracttest | DONE |
| Vrij schaalbare asset proportioneel | Niet-vergrendelde asset behoudt aspect-lock, drag en scale; fysieke override blijft expliciet en gescheiden van canvascoördinaten. | bestaande Studio composition tests | ALREADY CORRECT |
| Eén fontmaster, verschillende fysieke maten | Dezelfde immutable `sourceId`/`vectorProfile` wordt geometrisch naar de gevraagde hoogte geschaald. | managed-font, height-led geometry en nieuwe master-scaling test | ALREADY CORRECT |
| Canonieke 0–9-bron | Eén `NUMBER_SET` bewaart 0–9; willekeurige nummers worden uit uitsluitend de gevraagde glyphs samengesteld. | adaptive SVG suite + nieuwe 34/200mm/75mm test | ALREADY CORRECT |
| Schone productie-SVG | Plotartifact bevat contourpaden, geen `<text>`/`font-family`; niet-gebruikte glyphmasters worden niet geëxporteerd. | font-upload + production-group regressie | ALREADY CORRECT |
| Vrije opdruk gebruikt dezelfde production foundation | Vrije tekst, namen, initialen en nummers materialiseren naar dezelfde versie-/hash-/contourroute. | bestaande functional-pilot en production regressies | ALREADY CORRECT |
| Eén geometrische waarheid | Proposal snapshot draagt exact garment front/back, placement, revision en productie-eigenschappen naar preview/PDF/handoff. | Teamwear convergence + echte front/back PDF | DONE |
| Production preview blokkeert onvolledige waarheid | Onbekende/ambigue source blijft ATTENTION; bekende bron, kleur, maat en identity blijven hard. | productie-regressies | ALREADY CORRECT |
| Front/back uit bestaande sync | Catalogmedia komt uit bestaande artikelvariant en kleur; geen Teamwear-image-database of gespiegeld verzinsel. | 183 artikelen; 182 front; 102 proven back; 0 variant mismatch | DONE |
| Ontbrekende achterkant | Gecontroleerde placeholder/attention; geen front-mirroring. | source + browser/PDF evidence | DONE |
| Spain/Buitenboys | Canonical naam is `Spain Euro 2016` / `SpainEuro-Regular`; shortnummer blijft WIT en 75 mm. Geen lookalike. | Human Product Truth + 12/12 gerichte tests | DONE (naam-/matchingwaarheid) |
| Spain bronbytes in deze lokale candidate | Lokale recovery vond geen authoritative fontbytes; browserinspectie van LIVE Library was door browserbinding/Cloudflare niet betrouwbaar uitvoerbaar. Geen bron gefabriceerd. | 19 fontbestanden gescand; 0 byte-match | HUMAN SOURCE/LINKAGE VERIFICATION REQUIRED |
| Desktop rendered review | Garment-first Studio, echte achterzijde, bronpaneel, selection/properties en vergrendelde maat zichtbaar. Geen horizontale overflow. | echte Chrome candidate runtime | PASS |
| 390px rendered review | Canvas en contextuele bottom sheet bruikbaar; uploaddrawer 375px breed, geen overflow, inputs locked. | echte Chrome viewport 390×844 | PASS |
| 320px rendered review | Geen overflow; canvas, properties en 44px+ primaire touchcontrols. | echte Chrome viewport 320×720 | PASS |
| Werkelijke browser-fileupload | Chrome file chooser werd geopend, maar de browserextensie weigerde lokale file access. Onderliggende UI/API/contracttests zijn groen. | browser `Not allowed`; geen productfailure | TOOLING LIMITATION |

## Front/back inventaris

- Catalogusartikelen: **183**
- Officiële voorkanten: **182**
- Bewezen achterkanten: **102**
- Alternatieve beelden: **12**
- Zonder bewezen achterkant: **81**
- Product-/kleurmismatch: **0**
- Lokale front/back assets: **285**

## Productie-efficiëntie zonder klantorder

De bestaande productie-engine analyseert vrije folieruimte niet-persistent. Een veilige interne aanvulling verhoogde de gemeten benutting van **42,10% naar 53,05%** zonder extra klantorder en zonder langere baan (beide **135,325 mm**). Bij onvoldoende ruimte blijft de route fail-closed.

## Gate

De code-, build-, PDF-, front/back-, production-geometry- en responsive gates zijn groen. Deployment blijft buiten scope. De enige open evidencebeperking is een echte browser-fileupload door ontbrekende Chrome file-URL permissie; de productflow zelf is via contract/integrationtests bewezen. Spain blijft fail-closed totdat de authoritative bytes in de beoogde datastore aantoonbaar gekoppeld zijn.
