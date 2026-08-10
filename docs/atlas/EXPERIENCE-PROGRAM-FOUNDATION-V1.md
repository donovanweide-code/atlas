# Experience Program Foundation v1

## Doel

Experience is de eerste rustige kennismaking met hoe We Build And Design denkt. De bezoeker test geen software en krijgt geen demonstratie. De ervaring begint met luisteren: hoe ziet de werkdag eruit, waar gaat tijd naartoe, waar lekt energie weg, wat is moeilijk terug te vinden en welk moment zou natuurlijker mogen verlopen?

De flow is generiek. Er staan geen persoonsnamen, organisaties, projecten, cases of klantregels in het model. Dezelfde ervaring kan daardoor later worden gebruikt voor familie, Founding Explorers, toekomstige klanten en bezoekers van de website.

## Ervaringsflow

De interne route `/experience` heeft geen sidebar, menu, kaartenoverzicht, dashboard of technische navigatie.

1. **Welkom** — één open vraag over de huidige werkdag.
2. **Tijd** — waar vandaag de meeste tijd naartoe gaat.
3. **Energie** — waar de gebruiker energie verliest.
4. **Zoeken** — wat de gebruiker het vaakst probeert terug te vinden.
5. **Slimmer** — één concreet moment dat natuurlijker zou mogen verlopen.
6. **Samenvatting** — drie terughoudende thema's, zonder advies, conclusie of verkoop.
7. **Persoonlijke Workspace** — observaties, vragen, ideeën en één open volgende stap.

## Geen verborgen intelligentie

V1 bevat geen AI en doet geen vrije classificatie. De drie samenvattingsthema's volgen deterministisch uit de vaste vraagstructuur:

- Tijd en aandacht;
- Energie en frictie;
- Informatie en eenvoud.

De gebruiker ziet alleen de Experience en de persoonlijke Workspace. Namen zoals Atlas Engine, AI, Connector en Repository komen niet in de interface voor.

## Lokale opslag

De kleine state-repository gebruikt één versieerbare `localStorage`-sleutel: `wbd-experience-program-v1`.

Deze lokale state bevat:

- één huidige sessie;
- de antwoorden;
- de voortgang;
- de gemaakte samenvatting;
- de persoonlijke Workspace;
- lokaal ingediende ervaringsfeedback.

Na refresh wordt de actuele fase opnieuw geopend. Er is geen account, externe database, synchronisatie, CRM of backendkoppeling.

## Persoonlijke Workspace

De Workspace is niet gekoppeld aan organisaties, dossiers of projecten. Zij bevat uitsluitend:

- Mijn observaties;
- Mijn vragen;
- Mijn ideeën;
- Mijn volgende stap.

De inhoud wordt rechtstreeks uit de eigen antwoorden samengesteld. Er wordt geen advies gegenereerd.

## Feedback

Vanaf de begeleide vragen is de rustige actie **Dit voelde vreemd** beschikbaar. Het formulier vraagt:

- Wat verwachtte je?
- Wat gebeurde er?
- Wat zou natuurlijker voelen?

Feedback wordt lokaal bij de huidige Experience-sessie bewaard en wordt nergens verstuurd.

## Visuele grens

Experience hergebruikt de donkere WBD-basis, crème bevestigingen en subtiele goudaccenten. De compositie bestaat uit typografie, witruimte en dunne scheidingslijnen. Er zijn geen dashboards, tabellen, grafieken, KPI's of administratieve kaarten.

Voor schermen tot 720 pixels worden vragen, samenvatting en Workspace éénkoloms weergegeven, knoppen schermbreed en feedback als vrijwel schermvullend dialoogvenster.

## Bekende beperkingen

- Eén browserprofiel bevat één actuele Experience-sessie.
- Er is nog geen expliciete functie om een nieuwe sessie naast een bestaande sessie te bewaren.
- Feedback blijft lokaal en wordt niet verzonden.
- De samenvatting gebruikt vaste thema's en begrijpt geen vrije tekst.
- De Experience is nu een interne route en nog niet opgenomen in de publieke website.
- Er is geen AI, connector, analytics, authenticatie of centrale opslag.
