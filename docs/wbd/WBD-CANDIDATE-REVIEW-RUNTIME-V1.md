# WBD Candidate Review Runtime V1

## Contract

De runtime start uitsluitend na volledige verificatie van een immutable candidate:

1. outer release-ID, commit, artifactnaam en artifact-SHA-256;
2. embedded release-ID, commit en manifest-SHA-256;
3. ieder embedded bestand op pad, grootte en SHA-256;
4. containment van alle paden binnen de geverifieerde artifactroot.

Een mismatch stopt vóór een adapter, datastore of reviewsessie wordt aangemaakt.

De runtimegrenzen zijn:

| Grens | Contract |
|---|---|
| Artifact | `VERIFY_BEFORE_START` |
| Applicatiestate | `DISPOSABLE_CANDIDATE_ONLY` |
| Principal | `TEMPORARY_SCOPED_AUDITED` |
| Productiemutatie | geen bevoegdheid |
| Externe side-effects | geweigerd |
| Einde review | grant intrekken en runtimeroot vernietigen |

De generieke runtime serveert alleen de geverifieerde artifactroot. Een productadapter levert tenant-login, tijdelijke principal, de expliciete safe-interact-policy en audit. Daardoor kan dezelfde runtime later andere WBD-workspaces reviewen zonder Sportpaleis-specifieke security in de generieke laag te plaatsen.

## Sportpaleis-adapter

De Sportpaleis-adapter maakt voor één reviewrun:

- een tijdelijke `wbd-review-codex`-principal;
- een eenmalige activatie met Human GO-referentie en TTL;
- een eigen cookie en eigen users-view;
- een disposable datastore, backups en artifacts binnen de tijdelijke runtimeroot;
- een expliciete allowlist voor candidate-only veilige interacties;
- harde weigering voor mail/verzending, hardware, deployment, credentials en productie-write-through.

De principal wordt nooit in normale gebruikersdata opgeslagen en is alleen zichtbaar in de eigen reviewsessie. De normale Donovan- en customersessies worden niet gelezen of gewijzigd.

## Navigatie en evidence

- SPA-routes vallen terug op de geverifieerde candidate-shell.
- Direct load, refresh, back/forward en URL/render-state gebruiken dezelfde candidate-bootstrap.
- Iedere statische response bevat release-, commit- en artifactheaders.
- Het evidence-endpoint publiceert alleen niet-gevoelige contract- en artifactidentiteit, boundaryflags en audittelling.
- Screenshots zijn ondersteunend bewijs; het exacte artifact blijft de evidence-identiteit.

## Teardown

`close()` trekt eerst de tijdelijke grant in, sluit de server en verwijdert daarna recursief de volledige tijdelijke runtimeroot. Onbereikbaarheid van het evidence-endpoint na teardown is onderdeel van de acceptance.

