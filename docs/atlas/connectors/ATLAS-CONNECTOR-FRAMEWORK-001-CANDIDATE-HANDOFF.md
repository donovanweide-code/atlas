# Atlas Connector Framework 001 — Candidate-overdracht

**Status:** GO voor review  
**Datum:** 29 juli 2026  
**Werkspacestatus:** Workspace 002 ongewijzigd  
**Publicatiestatus:** geen deployment

> Deze eerste candidate-overdracht is beoordeeld. De definitieve
> architectuuruitkomst en de uitgevoerde kleine contractcorrecties staan in
> `ATLAS-CONNECTOR-FRAMEWORK-001-ARCHITECTURE-REVIEW.md`.

## Doel

Een minimaal herbruikbaar connectorcontract bewijzen zonder brondata als
Atlas-waarheid of inzicht te behandelen.

## Gekozen proefbron

De WBD-preview-sitemap is gebruikt als veilige, privacyarme externe
snapshotbron.

GA4 is nog niet gebruikt omdat Cloud-project, Data API-configuratie,
property-ID en read-only autorisatie ontbreken. Dat is een externe
toestemmingsgrens, geen technisch probleem dat in de repository mag worden
omzeild.

## Wat werkt

- handmatige en geplande trigger gebruiken dezelfde sync-engine;
- snapshot-diff herkent nieuwe, gewijzigde en verwijderde records;
- inhoudshashes en deterministische Record Change- en observation-ID's
  voorkomen duplicatie;
- bronfreshness en synchronisatiemoment blijven afzonderlijk;
- tijdelijk falen behoudt de laatst succesvolle staat;
- autorisatiefouten worden zichtbaar vóór een bronrequest;
- retry/backoff is begrensd;
- connectorstaat is strikt gekoppeld aan één `contextId`;
- Connector, Normalizer, Record Change, Translator, Observation en
  Interpretation zijn expliciet gescheiden.

## End-to-end bewijs

Eerste geldige sync:

- 13 opgehaald;
- 13 nieuw;
- gezondheid `healthy`.

Tweede geldige sync:

- 13 opgehaald;
- 13 ongewijzigd;
- 0 nieuwe observaties;
- gezondheid `healthy`.

Een beperkte netwerkcontext leverde zichtbaar `NETWORK_ERROR`; de
laatst-goede staat bleef intact en een volgende geldige sync herstelde de
status.

## Verificatie

- 72/72 tests geslaagd;
- productiebuild geslaagd;
- publieke buildgrens geslaagd;
- 13/13 observaties zijn `uninterpreted`;
- 13/13 observaties behoren tot `organization:wbd`;
- lokale runtimegegevens staan buiten Git.

## Bewust niet gebouwd

- GA4-connector;
- scheduler;
- realtime verwerking;
- Workspace-bronstatus;
- automatische Atlas-interpretatie;
- andere Google-, WooCommerce- of monitoringconnectors;
- preview- of productiepublicatie.

## Reviewpunten

1. Is de grens tussen bron, observatie en interpretatie scherp genoeg?
2. Is `contextId` voldoende expliciet als eerste isolatiegrens?
3. Is laatst succesvolle synchronisatie voldoende beschermd bij fouten?
4. Is de keuze om Workspace 002 niet uit te breiden correct?
5. Mag na review één externe GA4-configuratie-GO worden geopend?

## Atlas Recommendation

**Eerst het connectorcontract beoordelen.**

Daarna uitsluitend een kleine read-only GA4-proef wanneer runtime,
property-ID en veilige autorisatie expliciet zijn bevestigd.
