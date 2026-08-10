# Atlas Knowledge Capture Foundation v1

## Doel en beslisgrens

Atlas neemt nooit automatisch kennis op. Iedere mogelijke toevoeging begint als een kennisvoorstel en wordt pas na een expliciete menselijke goedkeuring onderdeel van de Atlas Knowledge Repository.

Het inhoudelijke filter is:

> Atlas verzamelt alleen kennis die een ondernemer helpt morgen betere beslissingen te nemen.

V1 bewijst uitsluitend deze handmatige kennisstroom. Er is geen AI, automatische classificatie of connector actief.

## Lokaal datamodel

De aparte IndexedDB-database `atlas-wbd-knowledge-v1` gebruikt twee stores:

- `proposals`: open en afgewezen kennisvoorstellen;
- `knowledgeEntries`: uitsluitend goedgekeurde repository-inhoud.

Een voorstel bevat minimaal id, titel, samenvatting, categorie, bron, datum en status. Daarnaast bewaart v1 waarom het voorstel belangrijk is, menselijke opmerkingen en lokale aanmaak- en wijzigingsmomenten.

Ondersteunde statussen zijn `Nieuw`, `Goedgekeurd` en `Afgewezen`. `Goedgekeurd` is de overgangsstatus: na goedkeuring staat het record niet langer in `proposals`, maar als herleidbare entry in `knowledgeEntries`.

Bronlabels zijn `Chat`, `Codex` en `Handmatig`. In v1 worden alle voorstellen handmatig ingevoerd; Chat en Codex zijn alleen handmatig gekozen herkomstlabels en vormen geen koppeling.

## Menselijke kennisstroom

1. Een gebruiker formuleert handmatig een voorstel.
2. Het voorstel krijgt status `Nieuw` en verschijnt onder Kennisvoorstellen.
3. De gebruiker opent het detail en kan inhoud, categorie, bron, datum en opmerkingen aanpassen.
4. Afwijzen zet de status op `Afgewezen`; er ontstaat geen repository-entry.
5. Goedkeuren maakt één Knowledge-entry en verwijdert het voorstel in dezelfde IndexedDB-`readwrite`-transactie.
6. De Knowledge Repository toont de entry in de gekozen categorie en bewaart de oorspronkelijke voorstel-id als herkomst.

Goedkeuren kan daardoor niet eindigen met zowel een open voorstel als een halfgeschreven repository-entry. Als de transactie mislukt, blijft het voorstel bestaan en wordt geen kennis toegevoegd.

## Repositorystructuur

De eerste vaste categorieën zijn:

- Knowledge
- Product Principles
- Design Principles
- Workflow Principles
- Architecture
- Cases
- Ideas

De repository bevat geen zoekfunctie, versies, rechten, automatische samenvattingen of afgeleide classificatie.

## Interface

De module leeft uitsluitend binnen de interne WBD Workspace:

- `/workspace/wbd/kennisvoorstellen`: voorstellen en handmatige invoer;
- `/workspace/wbd/kennisvoorstellen/<id>`: bekijken, bewerken, goedkeuren of afwijzen;
- `/workspace/wbd/kennis`: goedgekeurde Atlas Knowledge Repository.

De voorstellenlijst bevat geen goedgekeurde kennis. De repository bevat geen nieuwe of afgewezen voorstellen.

## Bekende beperkingen

- Opslag is lokaal in het huidige browserprofiel; er is geen cloud, synchronisatie of gebruikersaccount.
- De bestaande WBD Dossier Backup & Restore v1 bevat nog geen Knowledge Capture-database.
- Er is geen connector voor ChatGPT, Codex, e-mail, Search Console of Analytics.
- Bronlabels bewijzen alleen handmatig vastgelegde herkomst.
- Er is geen AI, RAG, vector database, embedding, zoekfunctie of automatische classificatie.
- Er is nog geen versiehistorie; bewerken actualiseert het lokale voorstel.

Een volgende fase kan één externe bron voorstellen laten aanleveren, maar die bron moet exact dezelfde menselijke beoordelings- en goedkeuringsgrens blijven gebruiken.
