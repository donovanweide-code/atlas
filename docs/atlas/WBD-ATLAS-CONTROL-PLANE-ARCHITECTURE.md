# WBD Owner Workspace + Atlas Control Plane

Status: lokale Human Review-kandidaat, 20 augustus 2026. Dit document beschrijft geïmplementeerd gedrag; productie is niet gewijzigd.

## Reality Map

| Onderdeel | Classificatie | Werkelijke toestand en keuze |
|---|---|---|
| WBD Owner-auth | REUSE | Server-side password/session, CSRF, origin, rate-limit, owner-role en audit blijven leidend. |
| MariaDB owner-state | EXTEND | `wbd_owner_state.state_json` blijft de centrale, revisioned singleton. Atlas-state is een additieve JSON-migratie; geen tweede databasewaarheid. |
| Capability Catalog | EXTEND | Bestaande catalogus blijft productwaarheid. Atlas voegt centrale Evidence-links en een afgeleide maturity-projectie toe. |
| Control Plane | REUSE | Organizations, Opportunities, Service Commitments, Owner Actions en Effort blijven canoniek. |
| Human Promotion Boundary | REUSE + SURFACE | Bestaande accept/adjust/reject-flow blijft onder Beheer & GO; READY-items worden op Today getoond. |
| Workcontext Bridge | MIGRATE LATER | IndexedDB-dossiers blijven intact en expliciet lokaal. Geen stille import, verwijdering of centrale statusclaim. |
| Atlas connector foundation | EXTEND | De eerdere TypeScript connectorproef blijft; de owner-runtime krijgt een production-shaped `.mjs` connector en scheduler. |
| Experience | REUSE | Contracten en routes zijn niet gewijzigd. Experience-evidence-ingestion is nog niet gekoppeld. |
| Search | EXTEND | Geen nieuwe zoekmachine: deterministische search over centrale Organizations, Capabilities, Attention, Evidence, Owner Actions en Human GO. |
| Sportpaleis pilot | REUSE / PROTECT | Geen klantfeature herschreven. Bestaande auth-, order-, productie-, mail- en catalogusregressies blijven onderdeel van de suite. |

Geen onderdeel is vervangen. De belangrijkste blokkade was niet ontbrekende functionaliteit, maar het ontbreken van één centrale Evidence → Attention → NBA-projectie en een runtimekoppeling voor actuele brondata.

## Centrale domeingrens

`atlasControlPlane` leeft in de bestaande owner-state en bevat:

- Evidence met source identity, observed/fetched time, normalized value, raw hash-reference, provenance, freshness, reliability, organization/entity/capability-links;
- generieke Attention met type, severity, urgency, confidence, status, grouping key, interpretation, evidence, NBA, resolution en Harvest-reference;
- gestructureerde Next Best Actions en Prepared Actions;
- connector state en maximaal honderd refresh-history entries;
- capability/evidence-links;
- Harvest candidates;
- Atlas-audit en `lastVisitedAt`.

De client ontvangt alleen een owner-projectie. Connectorfetches, bronvalidatie, secrets en mutatiepolicy blijven server-side.

## Autonomy en GO

De policy onderscheidt OBSERVE, ANALYZE, PREPARE en EXECUTE.

- OBSERVE/ANALYZE/PREPARE: autonoom voor lezen, fetch, normalization, provenance, deduplicatie, classificatie, Attention/NBA, drafts en Harvest candidates.
- EXECUTE: `REQUIRED` voor deployment, productie/config/security/access-mutatie, publiceren/verzenden, destructie, aankoop/financiën en structurele kosten.
- Onbekende externe actie: `FAIL_CLOSED`.
- Harvest wordt nooit automatisch productwaarheid; promotion vereist een menselijke beslissing.
- Capability `BUILT` wordt niet automatisch `PROVEN`; FIRST_REAL_USE, evidence en menselijke approval zijn vereist.

Model/API-executie is eerlijk `NOT_YET_CONNECTED`. Interpretatie is `DETERMINISTIC`; evidence is live/repository-backed; prepared work is `PREPARED`.

## Dataflow en performance

`source → server-side HTTPS fetch → strict normalization → provenance/hash → centrale owner-state → deterministic interpretation → Attention/NBA → cached owner-projectie`

De connector draait in de achtergrond en nooit synchroon tijdens een Today-render. Een failure bewaart last-known-good, markeert freshness als STALE/UNAVAILABLE en genereert pas na drie opeenvolgende failures één gegroepeerde Technical Verification. Een succesvolle refresh herstelt dit automatisch.

## Audit en observability

Traceerbare events omvatten connector refresh/failure, evidence ingestion, Attention create/update/resolve, NBA generation/update, Harvest creation, owner visits, promotion review en centrale control-plane mutaties. Connectorprojecties tonen health, freshness, last success en failure count. Runtime logs gebruiken gestructureerde connector-events. Renders veroorzaken geen Atlas-auditspam; alleen een expliciete Today-visit wordt vastgelegd.

## Migratie en recovery

Er is geen nieuw SQL-schema nodig: de bestaande JSON-kolom is de bedoelde uitbreidingsboundary. `validateWbdOwnerState` voegt een ontbrekende `atlasControlPlane` repeatable en additief toe, seedt repository-evidence uit de bestaande Capability Catalog en bewaart onbekende boundarymetadata.

Voor productie, pas na GO:

1. Maak een consistente backup van `wbd_owner_state` en de migration ledger.
2. Leg huidige revision, state hash en release-id vast.
3. Draai migrations eerst in statusmodus; deze release verwacht geen nieuwe workspace-SQL-migratie.
4. Start de nieuwe release; de app valideert de bestaande state vóór gebruik.
5. Controleer schema, revision, recordaantallen, capabilities, sessions en Atlas-projectie.
6. Bij failure: switch terug naar de vorige immutable release en herstel alleen wanneer validatie state-corruptie aantoont; de additieve onbekende `atlasControlPlane` mag veilig door de vorige release worden genegeerd/bewaard.

Geen browserdata wordt vernietigd. Een eventuele latere IndexedDB-import vereist apart bewijs, backup en Human GO.

## Security

- owner-only server authorization op alle Atlas endpoints;
- no-store, X-Frame-Options en bestaande security headers;
- CSRF + allowed-origin op visit/resolution en alle beheer-/GO-mutaties;
- connectorcredentials nooit in URL, clientbundle of logs;
- eerste connector gebruikt geen credential; toekomstige connectors moeten scoped server-side credentials leveren;
- onbekende execution risk faalt gesloten;
- bestaande productiecredentialbron en break-glass-invarianten blijven ongewijzigd.

## Bekende grenzen

- Experience-interactions zijn nog geen live Evidence-source.
- Geen model-provider is gekoppeld; er is geen fake AI-claim.
- WBD lokale IndexedDB-dossiers zijn nog niet centraal.
- Search is deterministische full-text/intentscoring, geen semantische vectorzoekmachine.
- Connectorobservability staat in owner API/runtime logs, nog niet in een afzonderlijk Beheer-dashboard.
- Alleen de publieke WBD-homepage is live aangesloten.
