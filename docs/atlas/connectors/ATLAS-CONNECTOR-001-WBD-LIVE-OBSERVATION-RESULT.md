# Atlas Connector 001 — WBD live observation result

**Datum:** 12 augustus 2026
**Status:** IMPLEMENTATION PASS — handmatig, lokaal en read-only
**Bron:** `https://webuildanddesign.nl/`
**Context:** `organization:wbd`

## Uitkomst

De eerste echte externe WBD-waarneming loopt nu door de bestaande generieke
connectorengine naar snapshot/diff/provenance, een neutrale Atlas Observation
Candidate en uitsluitend bij een betekenisvolle wijziging één rustige
aandachtkaart op WBD Workspace Home.

De implementatie monitort exact vijf velden uit de HTML-`head`:

1. document title;
2. meta description;
3. Open Graph title;
4. Open Graph description;
5. canonical URL.

Body-inhoud, scripts, stylesheets, assetnamen en buildhashes zijn expliciet
geen bronvelden. De connector is handmatig; er is geen scheduler, productie-
activatie, dashboard, autonome duiding of andere organisatie toegevoegd.

## Keten

`publieke HTML` → `WBD homepage adapter` → `normalizer` → `bestaande
snapshot_diff-engine` → `Record Change` → `versioned translator` → `source_reported /
uninterpreted observation` → `read-only lokale feed` → `rustige Home-kaart`

De kaart toont alleen begrijpelijke vorige en huidige waarden. Change-ID's,
hashes, normalizer-/translatorversies en sync-run blijven in provenance en
komen niet in de eerste visuele laag.

## Werkelijk live resultaat

De handmatige publieke run eindigde succesvol:

- 1 homepage-record opgehaald;
- eerste geldige toestand als `new` vastgelegd;
- 0 betekenisvolle wijzigingen;
- 0 attention items;
- 0 technische fouten als attention item;
- bron- en contextgrens: `https://webuildanddesign.nl/` / `organization:wbd`.

De eerste poging binnen de beperkte runner kon niet naar buiten en werd als
`NETWORK_ERROR` vastgelegd. De toegestane read-only herhaling slaagde. De
fout maakte geen bronwijziging, verwijderde geen geldige staat en werd niet als
ondernemerssignaal getoond. Dit is aanvullend praktijkbewijs voor de foutgrens.

## Gecontroleerde A–D-proef

De demonstratie gebruikt dezelfde adapter, normalizer, engine, translator en
feedprojector, maar een expliciet gelabelde localhost-fixture en eigen
`organization:wbd-demo`-staat.

| Geval | Bronverloop | Resultaat |
|---|---|---|
| A — unchanged | baseline → identiek | 0 changes, 0 attention |
| B — meaningful | twee positioneringsvelden gewijzigd | 1 change, 1 attention |
| C — repeated | dezelfde gewijzigde toestand opnieuw | totaal blijft 1 attention, 0 duplicates |
| D — source failure | gecontroleerde netwerkfout na geldige staat | laatst-goed behouden, 1 technical failure, 0 failure-attention |

Gecombineerde demo-uitkomst: 5 checks, 1 meaningful change, 1 attention item,
0 duplicate/noise items, 1 technical failure en 0 technische fouten die naar
attention escaleerden.

Dezelfde vier gevallen zijn daarnaast volledig geïsoleerd uitgevoerd, zodat
iedere case een eigen baseline heeft. Geaggregeerd over A (2), B (2), C (3)
en D (2) zijn dat **9 checks, 2 gecontroleerde meaningful changes, 2 unieke
attention items, 0 duplicates, 0 false positives, 1 technical failure en 0
technical failures die menselijke attention veroorzaakten**. Dit zijn
acceptancemetingen, geen productietelemetrie.

## Provenance en bewijsgrens

Ieder betekenisvol signaal bewaart:

- connector- en context-ID;
- source URL en locator;
- sync-run-ID en observed/synchronized-at;
- raw en normalized content hashes;
- previous/current change-ID en snapshot-hash;
- normalizer-, inputschema-, translator- en outputschemaversie;
- `evidenceStatus: source_reported`;
- `interpretationStatus: uninterpreted`.

De tekst zegt alleen dat publieke metadata veranderde. Atlas claimt geen
oorzaak, effect, intentie, kwaliteit of zakelijke betekenis.

## Drie afzonderlijke passes

### Technische pass — PASS

- Nieuwe scope-tests plus bestaande connectorregressies: **21/21 PASS**.
- Afzonderlijke TypeScript-compile van de nieuwe connectormodule: **PASS**.
- Workspace Vite-build naar tijdelijke output: **PASS**, 240 modules.
- Handmatige demo-sync: **PASS**.
- Handmatige live read-only baseline: **PASS**.
- Geen scheduler, write-back, secret of productieaanpassing.

De volledige actuele repositorysuite geeft **499/532 PASS**. De 33 failures
zitten in reeds gelijktijdig gewijzigde Context/Intent- en Sportpaleis-fixtures
en -contracten; Connector 001-tests zijn groen. De globale TypeScript-check
wordt eveneens buiten deze scope geblokkeerd door
`sportpaleis-workspace.ts`: `state.employees` is mogelijk `undefined`. Deze
gebruikerswijzigingen zijn niet aangepast.

### Workspace-pass — PASS

- Browsermatig gecontroleerd op de echte route
  `/workspace/wbd/overzicht`.
- Desktop: kaart past in het lichte WBD-oppervlak en is visueel ondergeschikt
  aan de bestaande hoofdfocus.
- Mobiel: gecontroleerd op 390 × 844; velden stapelen leesbaar.
- Details openen semantisch en tonen twee bronwijzigingen plus de expliciete
  interpretatiegrens.
- Lege feed of feedfout houdt de sectie verborgen.
- Geen nieuwe route, navigatiebadge of dashboard.

De eerste browserreview vond te laag contrast door een donkere tekstkleur op
de lichte Workspace-surface. De kleuren zijn naar de bestaande lichte WBD-
surface gecorrigeerd en opnieuw visueel beoordeeld.

### Cognitive-load pass — PASS

- Ongewijzigd is stil.
- Herhaling is stil.
- Technische bronuitval is stil in de aandachtlaag.
- Alleen een werkelijk genormaliseerde wijziging opent één kaart.
- De eerste laag bevat titel, tijd, één zin en `Bekijken`.
- Bewijsdetails zijn optioneel uitklapbaar.
- Demonstratie en echte bron zijn onmogelijk met elkaar te verwarren.

## Opgeleverde onderdelen

- `website/src/atlas-connector-wbd-homepage.ts`
- `website/scripts/atlas-connector-wbd-observation-sync.mjs`
- `website/scripts/wbd-workspace-foundation-api.mjs`
- `website/src/wbd-foundation.ts`
- `website/src/styles/wbd-foundation.css`
- `website/tests/atlas-wbd-live-observation.test.mjs`
- `website/package.json`

Lokale connectorstaat staat onder `website/.atlas-data/connectors-v2/` en
blijft buiten Git. De buildcontrole staat onder een tijdelijke, genegeerde
`.codex-tmp`-output.

## Operationele grens en vervolg

De huidige uitvoering is bewust handmatig. Er is dus nog geen periodieke
waarneming en zonder tweede live toestand kan nog geen echte live wijziging
worden geclaimd. De kleinste latere vervolgstap is pas na afzonderlijke GO een
goedkope dagelijkse trigger rond exact hetzelfde commando en dezelfde state-
store. Dit resultaat activeert die stap niet.

**Connector 001 stopt hier.**
