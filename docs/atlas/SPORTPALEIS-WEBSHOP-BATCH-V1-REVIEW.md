# Webshop Bedrukking Intake V1 — lokale review

Status: WEBSHOP_BATCH_INTAKE_V1_REVIEW_READY (lokale interactieve proef; geen LIVE-vrijgave).

Broncommit: 82e7a08cea0f03ed012cd22dd3837d289c731cba. Eigen branch: codex/spw-mail-pdf-isolated-20260908. Alleen nieuwe, geïsoleerde bestanden; geen wijzigingen aan runtime, mailconnector, Teamwear, productieprofielen of kleurhotfixes.

## Echte bron en afbakening

1-012653-order.pdf, 759353 bytes, 138 pagina's, SHA256 411f0dab404eae3d0a394b2076639a378bd81e3bb55430ae78675d795f84b7d2.
137 bestellingen / 194 artikelen in de bron. De productie-intake bevat uitsluitend 18 aantoonbaar bedrukte artikelregels uit 9 bestellingen. 176 niet-bedrukte artikelregels worden niet opgenomen. Productnaam, clubnaam of catalogusondersteuning alleen zijn nooit toelatingsbewijs. Lege en expliciet negatieve opdrukwaarden worden uitgesloten. Onbekende maar expliciete positieve opdruk blijft zichtbaar voor controle.

Voorbeeld: pagina 122 → 2635358683, 26-08-2026, 116597, FC Almere Wedstrijdshirt, XL, GROEN, aantal 1, rugnummer 88. Dezelfde bestelling bevat een bedrukte short; drie andere, onbedrukte artikelen zijn uitgesloten. Vier echte orderpatronen zijn gecontroleerd: 2635358543, 2635358614, 2635358648, 2635358683.

## Implementatie en bewijs

De bestaande geïsoleerde PDF-worker leest de tekstlaag en posities. De nieuwe projectie splitst op expliciete orderkoppen en koppelt besteldatum vóór de orderkop. De bestaande Divide-parser verwerkt artikelblokken; een ontbrekend gelabeld aantal blijft null. Identieke complete orderpagina's worden eenmaal verwerkt. Afwijkende herhaalde orderkoppen blokkeren de betrokken regels; vervolgpagina's zonder nieuwe orderkop blijven aan de order gekoppeld. Geen OCR, AI of bronarchief.

Standaard is OLDEST_FIRST; datum, bestelnummer en bronvolgorde geven stabiele sortering. Eerste zichtbare order 2635358540 (25 augustus), laatste 2635358683 (26 augustus). Eén groep per bestelnummer, één selecteerbare regel per bedrukt artikel voorkomt informatieverlies.

Zoeken op 2635358683 toont direct twee regels zonder serverrequest. Enkelvoudige selectie, alles zichtbaar selecteren en wissen zijn in de browser getest. Maat, kleur, aantal, artikel en opdruk zijn bewerkbaar; wijzigingen blijven na heropenen en serverrestart bestaan. Herstel bronwaarde is beschikbaar. STRUCTURAL_RULE_CANDIDATE is de betekenis van de aparte structuralRuleCandidate-vlag; die wijzigt geen Product Truth. Uitsluiten/herstellen is getest, inclusief onveranderde PDF-hash.

De proef gebruikt SportpaleisPilotService.createOrder uitsluitend in wegwerpgeheugen en vervolgens SPORTPALEIS_FINAL_PRODUCTION_VALIDATOR_V3. De bestaande regels bepalen plaatsing, maatvoering en foliekleur. De bronkleur moet daarnaast eenduidig overeenkomen met de bestaande authoritative cataloguskleur. Een ongeldige kleur blokkeert ook na handmatige wijziging.

15 regels komen door deze contractproef. 3 blijven ter controle: artikel 140306 is niet eenduidig aan één vereniging gekoppeld; artikel 131251 ontbreekt in de catalogus; shortnummer MW is niet numeriek. Er worden geen waarden gegokt. Een gemengde selectie geeft een afzonderlijke lijst geldige, geblokkeerde en uitgesloten regels. Eén expliciete bevestiging maakt een lokale proefreceipt; geen echte productiejob. Na bevestiging: Voorbereid in proef. Twee gelijktijdige bevestigingen en retry na restart leveren dezelfde receipt op; dezelfde regels worden niet opnieuw als nieuw aangeboden.

## Performance en opslag

Vaste grenzen staan in SPORTPALEIS-WEBSHOP-BATCH-V1-LIMITS.json; bewijs in SPORTPALEIS-WEBSHOP-BATCH-V1-PROOF.json. Gemeten runs: PDF-tekst 1,04–2,05 s, structurering 47–111 ms, bruikbare batch inclusief contractcontrole 1,20–2,35 s. De laatste run liep naast bestaande regressietests. Geen grens versoepeld.

Browser: zoeken 0,8 ms, selectie 0,7 ms, edit openen 27,5 ms, opslaan/render 27,2 ms. Geen externe requests of browserfouten. Desktop, 390 px en 320 px getest; geen horizontale overflow, dialoog en toetsenbordfocus bruikbaar.

Persistente PDFs = 0. Persistente volledige PDF-teksten = 0. Alleen SQLite-deltas, actor/timestamp, reviewed/excluded/structural-vlaggen en minimale idempotencyreceipts. Testdatabase 24576 bytes. Runtimeprojectie blijft in geheugen. Parse uitsluitend bij Laad batch; herladen zonder bronwijziging hergebruikt de projectie.

## Tests en resterende afhankelijkheden

11/11 nieuwe unit- en echte HTTP-integratietests groen, plus interactieve browserproef. Aanvullend 54 regressietests: 52 groen, 2 bestaande fouten opnieuw afzonderlijk gereproduceerd in ongewijzigde broncode die de nieuwe batchmodules niet importeert:
- sportpaleis-p0-production-color: PRODUCTION_FONT_SOURCE_MISSING voor Liberation Sans.
- sportpaleis-teamkit-production-rc2: bestaande rugnummermaat 220 versus testverwachting 200 mm.
Deze gedeelde productie-/Teamwear-code is conform isolatie niet aangepast. De bredere regressiesuite is dus niet volledig groen.

DEPENDENCY_CANDIDATE: koppeling aan de centrale Mail-bijlagebron en de productiejob-mutatie blijven bij de bestaande eigenaar. Deze review gebruikt alleen de vaste aangeleverde lokale PDF. Geen mailstatussen wijzigen. Voor echte productie moeten de bestaande fontbron/maatverschillen worden beoordeeld en de jobmutatie via de bestaande runtime, autorisatie en statuswaarheid lopen. Reviewreceipts zijn geen productie-status en mogen niet als echte jobs worden geïmporteerd.

Geen LIVE-deployment of echte PlotJob gemaakt. De lokale proef bewijst projectie, bewerken, selectie en bestaande contractvalidatie; geen fysieke snijbestanden of end-to-end LIVE-job. Productiegebruik van willekeurige onbetrouwbare PDF-bijlagen blijft afhankelijk van de eerder gemelde harde worker-isolatie.

## Review openen / opnieuw starten

http://127.0.0.1:4187 — klik Laad batch. De server luistert uitsluitend lokaal en gebruikt een eigen cookie, CSRF-controle en Origin-controle.

Vanaf repository-root, Node 24 met de bestaande website-dependencies:

```powershell
node website/scripts/webshop-batch-review-server.mjs '<pad naar 1-012653-order.pdf>' .codex-tmp/webshop-batch-review/overrides.sqlite 4187
```

Automatische HTTP-test: stel SPORTPALEIS_BATCH_PDF in op de echte bron en voer vanuit website `node --test tests/sportpaleis-webshop-batch-real.integration.mjs tests/sportpaleis-webshop-batch.test.mjs` uit. Browsertest gebruikt daarnaast PLAYWRIGHT_MODULE en de lokaal geïnstalleerde Edge-browser. De tests gebruiken afzonderlijke tijdelijke override-databases en wijzigen de reviewbatch niet.
