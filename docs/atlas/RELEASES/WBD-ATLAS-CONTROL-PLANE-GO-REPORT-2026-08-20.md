# WBD / ATLAS CONTROL PLANE — GO REPORT

## STATUS

READY FOR HUMAN REVIEW

## 1. Wat is gerealiseerd?

- Centrale, additieve Atlas Control Plane in de bestaande WBD owner-state: Evidence, Attention, NBA, Prepared Actions, connectorstate, capabilitylinks, Harvest en audit.
- Werkgerichte Owner Workspace met Today, Attention, Organizations, Search, Capabilities en Beheer & GO.
- Expliciete OBSERVE → ANALYZE → PREPARE → EXECUTE-policy; onbekende execution-risk faalt gesloten.
- Eerste echte live connector van publieke WBD-homepage tot centrale Evidence, Attention, NBA en Owner UI.
- Background refresh, deduplicatie, freshness, last-known-good, retry/backoff, grouped failure en recovery.
- Bestaande Human Promotion Boundary behouden en op Today gesurfaced.
- Bestaande Capability Catalog uitgebreid met evidence-backed maturityprojectie; geen tweede register.
- Traceerbare Attention resolution → Harvest candidate, zonder automatische productclaim.
- Productiesecurity dependency-audit: 0 vulnerabilities.

## 2. Wat merkt Donovan hiervan?

Voorheen: bron of chat openen → onthouden wat eerder gold → verschillen zoeken → betekenis/classificatie bepalen → bewijs verzamelen → volgende stap formuleren → uitzoeken of GO nodig is.

Nu: Atlas haalt brondata server-side op, normaliseert en vergelijkt, bewaart provenance/freshness, maakt of groepeert Attention, formuleert een gestructureerde NBA en toont op Today alleen verandering, onderzoek, beslissingen en wat kan wachten. In het live voorbeeld hoeft Donovan niets te verzamelen: de volgende refresh/hashvergelijking staat klaar met 0 minuten geschatte menselijke inspanning.

## 3. Atlas autonomy

Atlas doet nu zelfstandig: fetch, normalization, source identity/provenance, hashvergelijking, freshness, deduplicatie, retry/backoff, connectorhealth, evidence-linking, deterministische classificatie, Attention create/update/resolve, NBA, voorbereid werk, capability-evidence-koppeling, Search-projectie en Harvest candidate creation. Modeluitvoering is eerlijk `NOT_YET_CONNECTED`; redenering is `DETERMINISTIC`.

## 4. Human GO boundary

Geen GO voor observe/analyze/prepare. Expliciete GO blijft verplicht voor productie/deployment, security/access, destructie, publiceren/verzenden, klantcommunicatie, financiële acties, aankopen/structurele kosten, risicovolle infrastructuur en capability/Harvest-promotie naar materiële productwaarheid. Onbekende externe acties: `FAIL_CLOSED`.

## 5. Eerste live connector

- gekozen bron: `https://webuildanddesign.nl/`;
- waarom: actuele WBD-positionering, hoge dagelijkse relevantie, geen credentials/kosten, generiek HTTPS-pattern;
- welke data: title, description, `og:title`, `og:description`, canonical URL;
- freshness: definitieve live read 20 augustus 2026 15:03 UTC, observed `Last-Modified` 14 augustus; UI toont live fetch en bronmoment afzonderlijk;
- evidence/provenance: raw + normalized SHA-256, source identity, sync run, normalizer 2.0.0/schema v1, server-side HTTPS;
- failure behavior: 3 retries, backoff, last-known-good als STALE, één grouped Attention na 3 consecutive failures, recovery na succes, disable zonder systeemuitval.

Definitieve proof: PASS, één attempt, 106,3 ms, Evidence + Technical Verification + NBA + audit. De normalized hash was gelijk aan de historische baseline; daarom is correct geen fictieve websitewijziging gemeld.

## 6. Owner Workspace

- Today: Nu belangrijk, Sinds je laatste bezoek, Atlas heeft onderzocht, Beslissing nodig, Kan wachten, modes en freshness.
- Attention: generiek model, confidence, grouped signals, interpretatie, NBA, evidence en provenance.
- Organizations: centrale WBD-context met Attention, Evidence, capabilities, acties/kansen/afspraken en expliciete onbekenden.
- Search: Organizations, Capabilities, Attention, Evidence, Owner Actions en Human GO; Nederlandse stopwoordruis onderdrukt.
- Capabilities: maturity, bewijs, proven-at, reuse/scopeclass en limitations uit bestaande registry.
- Beheer & GO: bestaande accept/adjust/reject-promoties behouden; niets verandert vóór menselijke beslissing.

## 7. Evidence & Capability Registry

Live connector-evidence en bestaande repository/capability-evidence staan centraal in dezelfde revisioned owner-state. Capability `connectors-snapshot-diff` is aan live evidence gekoppeld. `BUILT` wordt nooit stil `PROVEN`: lifecycle is CONCEPT → BUILT → FIRST_REAL_USE → PROVEN → REUSABLE met evidence en menselijke approval.

## 8. Mobile

Interactief getest op iPhone-acceptanceviewport 390 × 844: login, Today, Attention, NBA, evidence/provenance, WBD Organization, Search en Beheer & GO. Geen screenshot-only acceptance: formulieren, navigatie, drill-down en zoekflow zijn werkelijk bediend. Vaste bottom navigation; `scrollWidth 375` bij `innerWidth 390`, dus geen horizontale overflow. Fysieke iPhone/Safari blijft onderdeel van Donovans Human Review.

## 9. Performance

Lokale geïsoleerde metingen:

- login: 103,9 ms API; login + Today interactief 343 ms;
- Today/Atlas API gemiddeld 7 ms (10 runs);
- Attention API 5 ms; interactieve route 169 ms;
- Organization API 3 ms; interactieve route 172 ms;
- Search API 4 ms; Search-route 165 ms;
- Capabilities API 4 ms;
- iPhone Today 177 ms, Attention 167 ms, Organization 174 ms;
- projectie + Search over >2.000 evidence-items 65–78 ms, testgrens <500 ms;
- live connectorfetch 106,3 ms.

Geen live connectorfetch vindt tijdens render plaats.

## 10. Security

Owner-only server authorization, HttpOnly/SameSite sessions, CSRF, allowed origin, rate limits, no-store, frame protection, scoped server connectorboundary, geen client secrets, HTTPS/canonical allowlist, size/content/redirect checks, fail-closed executionpolicy, revision conflicts en audit zijn getest. `npm audit`: 0 productie- en 0 totale vulnerabilities.

## 11. Tests

- `npm run build:workspace`: PASS; 219 bestanden en 12 tekstbestanden geverifieerd.
- volledige suite: 688 tests, 688 PASS, 0 FAIL, 0 skipped.
- Atlas masterflow: 11/11 PASS.
- owner/control/runtime/routing regressiekern: 70/70 PASS.
- mail security/invariance: 31/31 PASS.
- context-intent fail-closed reference: 8/8 PASS.
- echte live connectorproof: PASS.
- dependency-audit: 0 vulnerabilities.

## 12. Regressions

Beschermd/getest: WBD Owner auth/sessions/rate limiting/CSRF; central MariaDB persistence; human promotions; Workcontext Bridge; Organization context; Experience/public/WBD/Sportpaleis route-isolatie; Sportpaleis auth, catalogus, orders, productie, PWA, audit en mail; invoice/PDF hash-invariance; release/runtime boundaries. Geen Sportpaleis-klantfeature is herschreven.

## 13. Migrations/data

Geen nieuw SQL-schema. Bestaande `wbd_owner_state.state_json` wordt additief uitgebreid via repeatable validation/migration. Bestaande records, revisions en onbekende boundarymetadata blijven behouden. IndexedDB/browserdossiers zijn niet geïmporteerd, gewijzigd of verwijderd. Voor productie: eerst consistente DB-backup, state hash/revision, migration status en restore-test; daarna pas release activation.

## 14. Kosten

Nieuwe kosten:

NONE

## 15. Known limitations

- Geen fysieke iPhone/Safari door Codex getest; wel volledige interactieve 390 × 844 flow.
- Atlas model/API is niet gekoppeld; interpretatie is deterministisch.
- Experience-interactions, analytics, mail en CRM zijn nog geen live connectors.
- Lokale IndexedDB-dossiers zijn nog niet centraal.
- Search is deterministisch, geen vector/LLM search.
- Alleen publieke WBD-homepage is live aangesloten.
- Production release artifact/tag is nog niet gemaakt, omdat deployment en remote releasehandelingen GO-bound zijn.

## 16. Niet gebouwd

- Geen multi-connector enterpriseplatform.
- Geen marketing/CRM/analyticsplatform.
- Geen automatische production mutation of deployment.
- Geen autonome klantcommunicatie/publicatie.
- Geen nieuwe AI-provider, SaaS, infrastructuur of kosten.
- Geen Experience-contractrewrite.
- Geen klantworkspace- of Sportpaleis-feature-rewrite.
- Geen destructieve browserdatamigratie.

## 17. Human Acceptance stappen

1. Desktop: login → Today; beantwoord binnen één minuut wat veranderde, aandacht vraagt, Atlas onderzocht, adviseert, voorbereidt, GO vraagt en laat wachten.
2. Open Attention → NBA → `Waarom zegt Atlas dit?` → `Techniek`.
3. Open Organizations → We Build And Design en controleer Attention/Evidence/Capabilities plus onbekenden.
4. Zoek `welke capabilities zijn bewezen bij Sportpaleis?` en `wat vraagt mijn GO?`.
5. Open `Veilig beoordelen`; inspecteer Beheer & GO zonder onbedoelde accept/reject.
6. Herhaal op fysieke iPhone/Safari en controleer dezelfde centrale state.
7. Geef alleen GO wanneer betekenis, mobile gebruik en operationele waardevermindering overtuigen.

## 18. Production deployment

Na GO:

1. Review diff, maak schone commit en immutable release-tag; push naar bestaande remote.
2. Herhaal build, 688-test suite, audit en release-provenancecheck op de tagged commit.
3. Maak en verifieer databasebackup; leg owner revision/state-hash en huidige release vast.
4. Draai workspace/atlas migrations in `--status`; verwacht geen nieuwe SQL-migratie.
5. Bouw het immutable production release artifact met bestaande releasepipeline en verifieer hashes/dependencygraph.
6. Plaats artifact in een nieuwe release-directory; wijzig geen actieve release.
7. Draai preflight/ready/auth/Today/Attention/Search/Organization/connectorchecks.
8. Switch atomair naar de nieuwe release.
9. Draai post-switch activation, desktop + fysieke iPhone smoke en connectorrefresh.
10. Bewaar vorige release en backup totdat Human Acceptance en observatieperiode PASS zijn.

## 19. Rollback

1. Stop connector scheduler van de nieuwe release.
2. Switch atomair terug naar de vorige immutable release.
3. Verifieer health, owner login en bestaande Sportpaleis invariants.
4. Laat additieve onbekende `atlasControlPlane` staan wanneer de vorige validator deze veilig bewaart/negeert.
5. Alleen bij aangetoonde statecorruptie: zet `wbd_owner_state` terug uit de predeploy-backup en controleer revision/hash/recordaantallen.
6. Herhaal post-rollback health/auth/data checks en leg oorzaak/evidence vast.

## 20. GO request

GO / NO-GO gevraagd voor production deployment.
