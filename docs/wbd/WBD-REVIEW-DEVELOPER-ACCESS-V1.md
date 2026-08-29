# WBD Review/Developer Access V1

## Doel en grens

Deze foundation geeft een geïsoleerde Codex-run tijdelijk, identificeerbaar en controleerbaar toegang tot één bestaande immutable Candidate. Het is geen klantseat, geen tweede Donovan-account en geen algemene ontwikkel- of productiecredential.

De interne principal is `wbd-review-codex` met type `REVIEW_DEVELOPER`, rol `reviewer` en seat-type `system`. De principal wordt niet aan de normale gebruikerslijst toegevoegd. De Workspace projecteert alleen voor de geautoriseerde Candidate een read-only beheerweergave; dat verandert de interne rol niet.

## Levenscyclus

1. De runtime staat standaard uit (`WBD_REVIEW_ACCESS_ENABLED=false`).
2. Een expliciet geconfigureerde actieve administrator geeft na een concrete Donovan-GO een grant uit voor exact één tenant, Candidate, capabilityset en TTL.
3. De eenmalige activatietoken wordt alleen lokaal overgedragen in een URL-fragment. Alleen de SHA-256-hash wordt opgeslagen.
4. Activatie maakt een aparte secure-cookie-sessie en CSRF-token; Donovan's sessie wordt niet gelezen, gekopieerd of gewijzigd.
5. Iedere toegestane API-read en iedere geweigerde actie wordt aan grant, actor, route, methode, Candidate en GO-referentie gekoppeld.
6. Logout, expliciete intrekking, afronding of TTL beëindigt de grant en alle sessies fail-closed.

TTL is minimaal vijf minuten, standaard één uur en maximaal vier uur. Een activatielink is eenmalig; replay wordt geweigerd.

## Toegestane capabilities

- `candidate.review.read`
- `candidate.ui.safe-interact`
- `candidate.debug.read`
- `candidate.test-state.isolated`
- `pilot.live-validation.read`

De huidige HTTP-boundary is bewust read-only. Niet-GET-verzoeken van deze principal worden vóór de businessroute geweigerd. Veilige Candidate-interactie blijft browser-/Candidate-state en krijgt geen productieauthority.

## Altijd verboden

- productiegegevens wijzigen;
- klantcommunicatie versturen;
- orders of productie uitvoeren;
- credentials, gebruikers of rollen beheren;
- releases deployen;
- destructieve acties;
- scope uitbreiden of een volgende grant uitgeven;
- naar een medewerker- of beheeridentity wisselen.

## Configuratiecontract

De foundation wordt alleen actief als alle volgende niet-geheime waarden geldig zijn:

- `WBD_REVIEW_ACCESS_ENABLED=true`
- `WBD_REVIEW_ACCESS_ISSUER_IDS=<canonical user-id>`
- `SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS=<candidate-id>`

Ongeldige IDs, een ontbrekende Candidate, een onbekende tenant, een verlopen grant of ontbrekende configuratie stopt de flow. Tokens of credentials horen nooit in configuratie, source control of logs.

## Releasegrens

Deze wijziging bouwt alleen de herbruikbare policy en de Sportpaleis-adapter. Productieconfiguratie en deployment vallen buiten deze foundation. Activering in een klant-Workspace vereist altijd een afzonderlijk gecontroleerd releasecontract plus de concrete Donovan-GO voor de reviewsequence.
