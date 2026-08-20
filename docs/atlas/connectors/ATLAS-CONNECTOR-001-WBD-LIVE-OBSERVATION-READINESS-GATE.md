# Atlas Connector 001 — WBD Live Observation Readiness + Size Gate

**Datum:** 12 augustus 2026
**Status:** Fase 0 afgerond; nog geen implementatie-GO
**Advies:** GO-kandidaat voor één lokale, handmatig gestarte verticale slice van **3–5 engineer-days**
**Stopgrens:** geen connector-, website-, Workspace-, productie- of schedulerwijziging uitgevoerd

## Readiness-oordeel

De slice vereist geen nieuw connectorframework, grote Workspace-refactor of productiearchitectuur. De generieke fetch/snapshot/diff/provenance-kern bestaat al. De werkelijk ontbrekende schakels zijn één bronspecifieke homepage-normalizer, één neutrale translator/feed en een read-only lokale Workspace-projectie.

Een actuele read-only inspectie van `https://webuildanddesign.nl/` en de publieke sitemap bepaalt de technisch eerlijke bronbegrenzing:

- de homepage-HTML bevat betekenisvolle `<head>`-metadata: titel, description, Open Graph-titel/-description en canonical URL;
- de `<body>` bevat alleen een lege client-rendered app-root; een gewone HTTP-fetch ziet de zichtbare paginatekst dus niet;
- de publieke sitemap bevat dertien URL's, maar geen `lastmod`-waarden;
- een volledige HTML-hash zou vooral gewijzigde JS/CSS-assetnamen meten en daardoor technische buildruis als inhoudelijke verandering kunnen presenteren.

Daarom volgt Connector 001 in deze eerste slice uitsluitend de **publieke positioneringsmetadata van de WBD-homepage**. Een wijziging betekent dan exact: minstens één van de vooraf benoemde semantische metadatawaarden is veranderd. De slice claimt niet alle zichtbare website-inhoud te bewaken.

## 1. Bestaande componenten voor hergebruik

| Component | Direct hergebruik | Readiness-grens |
| --- | --- | --- |
| `website/src/atlas-connectors.ts` | `ConnectorDefinition`, adapter/normalizercontract, `syncConnector`, SHA-256, record changes, retries, complete-snapshotgrens, translator en deterministische Observation Candidate-ID | Niet uitbreiden tot nieuw framework |
| `website/scripts/atlas-connector-file-store.mjs` | Lokale atomische state-opslag op `contextId + connectorId` onder de bestaande `.atlas-data`-grens | Alleen lokaal; geen centrale database |
| `website/src/atlas-connector-wbd-sitemap.ts` | HTTPS-, origin-, response-size-, bronfout- en fetcher-injectiepatronen | Niet als inhoudsbron gebruiken: URL-aanwezigheid zonder `lastmod` bewijst geen betekenisvolle paginawijziging |
| `website/scripts/atlas-connector-sync.mjs` | Bestaand patroon voor één handmatige sync en veilig statusrapport | Geen polling of scheduler activeren |
| `website/src/atlas-observation-review.ts` | Invariant dat een bronobservatie nog geen betekenis of kennis is | Niet direct opslaan in de browserlokale Atlas-reviewstore |
| `website/src/workspace-shell.ts` | Bestaande rustige Workspace-shell; attentionmarkup is voorbereid | Geen badge/notificatiesysteem nodig |
| `website/src/wbd-foundation.ts` | Bestaande WBD Home als klein zichtbaar aandachtspunt; bestaande `api()` en HTML-escaping | Eén kaart, geen nieuwe sectie of route |
| `website/scripts/wbd-workspace-foundation-api.mjs` + `website/vite.config.ts` | Bestaande lokale read/write middlewaregrens; hier kan één read-only GET-projectie naast bestaan | Niet toevoegen aan `workspace-runtime.mjs`; productie blijft buiten scope |
| Bestaande tests | Connectoridempotentie/fail-safe, WBD Home, routes, shell en public-only buildgrens | Nieuwe slice voegt alleen ontbrekende A–D-regressies toe |

`website/src/atlas-observations.ts` is niet de juiste directe opslag voor deze slice: dit model is browserlokale Atlas Workspace-state, verwacht handmatige captureownership en heeft geen server-naar-WBD-handoff. Het adapteren daarvan zou meer architectuur introduceren dan de observatie zelf.

Development 001 wordt **niet** gebruikt. Connector 001 hoeft geen taakintentie of semantische resultverificatie op te lossen; het relevante predicate is hier deterministisch en vooraf begrensd tot gewijzigde publieke homepage-positioneringsmetadata. Development 001 kunstmatig invoegen voegt geen bewijswaarde toe.

## 2. Minimale architectuur

```text
handmatige sync
  → HTTPS GET https://webuildanddesign.nl/
  → valideer status/origin/content-type/omvang
  → normaliseer alleen title + description + og:title + og:description + canonical
  → bestaand syncConnector + lokale FileConnectorStateStore
  → baseline `new` blijft stil; alleen latere `changed` wordt vertaald
  → resolve previousChangeId naar vorige genormaliseerde payload
  → deterministische, uninterpreted AtlasObservationCandidate
  → lokale read-only GET-projectie
  → maximaal één rustige kaart op WBD Home: “Website gewijzigd” + “Bekijken”
```

### Fetch en normalize

- Eén expliciete bronpagina: `https://webuildanddesign.nl/`.
- Geen crawl, sitemapfollow, browserautomatisering of assetfetch.
- Trackingvelden: documenttitel, meta description, `og:title`, `og:description`, canonical.
- Uitsluiten: scripts, stylesheets, assethashes, JSON-LD-contactvelden, whitespace, attribuutvolgorde en responseheaders zonder inhoudelijke betekenis.
- De adapter levert exact één record of faalt. Een ontbrekend/ongeldig vereist veld, onverwacht origin, redirect, niet-HTML-response, te grote response, timeout of netwerkfout levert geen lege succesvolle snapshot.

### Snapshot, compare en provenance

- `syncConnector` bewaart raw hash, normalized hash, sync-run, normalizerversie, bronlocator, timestamps en change lineage.
- De eerste geldige `new`-staat is uitsluitend baseline en maakt geen attention.
- Alleen `changed` wordt vertaald; `removed` kan bij deze exact-één-recordadapter niet door een succesvolle lege response ontstaan.
- De translator gebruikt `previousChangeId` om uit de bestaande record-changehistorie vorige en huidige relevante payload plus hashes te projecteren.
- Observation identity blijft deterministisch uit change + translatorversie; hervertalen of een ongewijzigde poll maakt geen duplicaat.

### Observation en WBD Attention

- Source fact: welke benoemde metadatawaarden veranderden tussen twee geldige snapshots.
- Inference: niet nodig en dus niet genereren. De connector zegt niet waarom de wijziging belangrijk is of wat WBD moet doen.
- De lokale GET-projectie retourneert alleen veilige presentatiedata: observation-ID, bron-URL, observed-at, gewijzigde veldnamen, vorige/huidige tekst, hashes en provenanceversies.
- WBD Home toont niets bij nul candidates. Bij een candidate verschijnt één bestaande-stijl attentionkaart met rustige samenvatting en een inline detail/“Bekijken”-actie. Geen badge, dashboard, pollingindicator of HTTP-diagnostiek.
- Een onbereikbare lokale feed of technische connectorfailure houdt Home rustig en creëert geen content-change-item.

## 3. Werkelijk nieuwe componenten

1. **WBD homepage metadata-adapter + normalizer**: één bronrecord, strikte HTML-headextractie, ruisvrije genormaliseerde payload.
2. **WBD metadata-change translator/feed-projector**: vertaalt alleen `changed`, resolveert vorige staat en levert een deduplicated read model voor de Workspace.
3. **Handmatige runner-compositie**: gebruikt de bestaande sync-engine en file store; geen daemon/scheduler.
4. **Read-only lokale Workspace endpoint**: leest connectorstate en retourneert candidates/metrics; schrijft niets.
5. **Eén compacte WBD Home attentionkaart**: dynamisch geladen, veilig escaped, afwezig bij stilte/failure.

Geen nieuwe datastore, connectorregistry, reviewqueue, route, dashboard of state machine.

## 4. Waarschijnlijk geraakte bestanden/systemen

| Bestand | Verwachte actie na expliciete GO |
| --- | --- |
| `website/src/atlas-connector-wbd-homepage.ts` | Nieuw; adapter, normalizer en translator/projector |
| `website/scripts/atlas-connector-wbd-observation-sync.mjs` | Nieuw; handmatige compositie en compact meetrapport |
| `website/scripts/wbd-workspace-foundation-api.mjs` | Kleine wijziging; één read-only observation-GET |
| `website/vite.config.ts` | Kleine wijziging indien een afzonderlijke middlewarefunctie nodig blijkt; anders ongewijzigd |
| `website/src/wbd-foundation.ts` | Kleine wijziging; rustige async attentionprojectie op Home |
| `website/src/styles/wbd-foundation.css` | Kleine wijziging; bestaande visuele taal voor één kaart/detail |
| `website/package.json` | Eén handmatig sync-script; geen scheduler |
| `website/tests/atlas-wbd-live-observation.test.mjs` | Nieuw; A–D, provenance, noise en UI-contract |
| `docs/atlas/connectors/ATLAS-CONNECTOR-001-WBD-LIVE-OBSERVATION-RESULT.md` | Nieuw na uitvoering; bewijs en cognitieve-loadmeting |

Niet raken:

- publieke WBD-website en deployment;
- `workspace-runtime.mjs` en productieconfiguratie;
- Sportpaleis-code/data;
- Atlas Runtime, Development 001-engine, Workspace routes en Atlas browser-observationstore;
- externe services of credentials.

## 5. Teststrategie

### Verplichte controlled demonstration

Dezelfde productiecode krijgt een geïnjecteerde fetcher en tijdelijke state store; geen test-specifieke conclusie of alternatieve comparelogica.

| Case | Fixturevolgorde | Vereist resultaat |
| --- | --- | --- |
| A — unchanged | baseline A → A | 2 controles, 0 changes vertaald, 0 attention-items |
| B — meaningful change | baseline A → metadata B | 2 controles, 1 echte change, exact 1 observation/attention-item |
| C — repeated observation | A → B → B | 3 controles, nog steeds exact 1 unieke observation/attention, 0 duplicates |
| D — source failure | baseline A → timeout/invalid HTML | laatste geldige staat behouden, 0 nieuwe content-change, 0 menselijke attention door failure |

Aanvullend:

- alleen JS/CSS-assethash of whitespace wijzigt → normalized hash gelijk, geen attention;
- eerste succesvolle baseline maakt geen attention;
- title/description/OG/canonicalwijziging toont exact de veranderde velden;
- unexpected origin, redirect, niet-HTML, oversize en ontbrekende vereiste metadata falen gesloten;
- provenance bevat source, URL, synchronized/observed-at, raw/normalized hash, previous change/payload, current change/payload, normalizer- en translatorversie;
- endpoint is GET-only/read-only, begrenst output en lekt geen volledige HTML;
- Workspace zonder item blijft stil; met item toont kaart + detail; alle broninhoud wordt escaped;
- bestaande connector-, WBD Foundation-, Workspace routing/shell-, volledige testsuite en build blijven groen.

Een optionele lokale visuele demonstratie gebruikt een geïsoleerde demo-connector-ID/data-directory en een lokale HTTP-fixturebron. De Workspace moet die bron zichtbaar als **gecontroleerde demonstratie** labelen; zij mag nooit doen alsof fixture B werkelijk live op WBD stond. De standaardconfiguratie blijft de echte publieke homepage.

### Human Cognitive Load-meting

Het handmatige syncrapport en feed-readmodel tellen minimaal:

- `checks`;
- `meaningfulChanges`;
- `attentionItems`;
- `duplicateNoiseItems`;
- `falsePositives` in de gecontroleerde cases;
- `technicalFailures`;
- `technicalFailuresEscalatedToAttention`.

Acceptance voor de vier geïsoleerde A–D-scenario's samen: 9 controles totaal, 2 gecontroleerde betekenisvolle changes, 2 unieke attention-items, **0 duplicates**, **0 false positives** en **0 technische failures die menselijke aandacht krijgen**. De eindrapportage moet scenariocijfers ook afzonderlijk tonen en deze demonstratiemeting niet als productietelemetrie presenteren.

## 6. Risico's

| Risico | Gevolg | Beheersing |
| --- | --- | --- |
| SPA-body is niet zichtbaar via fetch | Schijnclaim dat alle paginatekst wordt bewaakt | Scope expliciet beperken tot semantische homepage-headmetadata |
| Buildassethash verandert | Valse websitewijziging | Scripts/styles/assets volledig buiten normalized payload |
| HTML-regex wordt een parserproject | Brittleness en scopegroei | Alleen vijf unieke headvelden met begrensde extractors; fail-closed bij ambiguïteit; geen algemene DOM/parserarchitectuur |
| Eerste sync geeft ruis | Baseline verschijnt als verandering | `new` nooit naar attention vertalen |
| Fetchfailure lijkt verwijdering | False positive | Adapter levert exact één geldig record of gooit; bestaande sync bewaart laatste geldige state |
| Dezelfde change blijft dupliceren | Notification fatigue | Deterministische observation-ID en dedupe op ID; geen item per poll |
| Observation wordt stil insight | Atlas overschrijdt epistemische grens | Alleen source fact; `interpretationStatus: uninterpreted`; geen aanbeveling/inference |
| Lokale API wordt productieontwerp | Onbedoelde architectuurverbreding | Alleen Vite/local; production runtime expliciet onaangeroerd |
| Attention blijft zichtbaar zonder read-state | Kan oud aanvoelen | Toon observed-at en maximaal de laatste unieke candidate; acknowledge/read-state is een latere keuze, geen verborgen extra store |
| Werkboom bevat andere actieve Sportpaleis-wijzigingen | Onbedoeld overlapverlies | Implementatie uitsluitend op genoemde connector/WBD-bestanden; bestaande ongerelateerde wijzigingen niet aanpassen |

## 7. Verwachte implementatieomvang

| Werkpakket | Engineer-days |
| --- | ---: |
| Homepage adapter/normalizer + fail-safe contract | 0,5–1,0 |
| Translator, previous/current projectie en manual runner | 0,5–1,0 |
| Read-only lokale API + WBD Home attentionkaart | 0,75–1,25 |
| A–D/noise/provenance/UI-regressies | 0,75–1,25 |
| Visuele check, volledige regressie, build en rapport | 0,5–0,75 |
| **Totaal** | **3–5** |

Dit is een kleine verticale slice. Als implementatie toch een browserrobot, centrale database, production middleware, algemene HTML-parser, scheduler of observationplatform vereist, treedt de size gate opnieuw in werking en stopt de uitvoering.

## 8. Verwachte Codex-uitvoeringsomvang

- één gefocuste implementatiecyclus plus één test/visuele review- en reparatiecyclus;
- twee à drie nieuwe code/testbestanden en vier à zes kleine bestaande wijzigingen;
- circa **550–900 netto regels** inclusief fixtures en tests;
- één echte read-only baselinefetch na GO, plus fixturegedreven A–D-demonstratie;
- gerichte connector/WBD-tests, volledige repositorytests, Workspace-build en public-only grenscontrole;
- geen credentials, browserautomatisering, productie, deployment of externe betaalde dienst.

## 9. GO/NO-GO-advies

**GO-kandidaat — uitsluitend na een nieuwe expliciete Implementation GO voor deze 3–5-daagse lokale slice.**

Technische reden:

- Framework 001 levert de moeilijke sync-, diff-, idempotentie- en fail-safegrenzen al;
- één echte publieke WBD-metadatarecord is via gewone HTTPS veilig observeerbaar;
- WBD Home en de lokale read-only middleware bieden een kleine zichtbare aansluiting;
- de proof kan zonder connectorplatform, Workspace-route, centrale opslag of productie worden geleverd.

**NO-GO binnen Connector 001** voor bodybrede observatie, browserautomatisering, sitemapmonitoring als inhoudsproxy, scheduling, productie-API, persistent read/acknowledge-model, Atlas-interpretatie, Sportpaleis of verdere connectoren.

## Hard stop

Fase 0 stopt hier. Geen implementatie, echte baseline-sync, Workspace-wijziging, websitewijziging, polling, scheduler, productieactivatie of deployment is uitgevoerd. Een nieuwe expliciete GO is vereist.
