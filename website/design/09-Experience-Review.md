# Atlas Experience Review

## Visuele controle

- Is onmiddellijk een echte horizon zichtbaar?
- Voelt het landschap als bestemming en niet als decoratie?
- Wordt per route meer afstand en diepte onthuld?
- Blijven tekst en navigatie volledig leesbaar?
- Vloeien echte beelden zonder harde fotokaders in dezelfde wereld over?
- Ondersteunen topografie, route en gradients het landschap zonder het te vervangen?

## Assetcontrole

Een Vision Board is niet alleen een sfeerreferentie. Wanneer een goedgekeurd landschap essentieel is voor de ervaring, wordt daarvan een gecontroleerde, lokale en webgeschikte asset gemaakt.

Abstracte vormen, topografische lijnen en gradients mogen echte landschappelijke diepte ondersteunen, maar nooit vervangen.

Controleer voor oplevering:

- bron en crop staan in het Atlas Asset Manifest;
- het originele board is onaangetast;
- productieassets zijn lokaal en geoptimaliseerd;
- er staat geen boardtekst of infographic-inhoud in de crop;
- assetpaden bouwen zonder 404;
- responsive crops en reduced motion blijven correct.

## Golden Route-controle

- Zijn echte landschappen leidend en geometrische bergvormen afwezig of nauwelijks zichtbaar?
- Is er één doorlopende gouden route in plaats van losse lijnen per sectie?
- Markeren waypoints aantoonbaar een verworven inzicht?
- Verschijnt het kompas slechts één keer, na herkenning en vóór keuze?
- Wordt Atlas eerst als wereld ervaren en pas daarna benoemd?
- Ondersteunen grafische lijnen fotografie en betekenis, nooit andersom?
# World-before-interface review

Controleer bij iedere review:

- Is de mens een kleine, vooruitkijkende reiziger en geen poserend beeld?
- Voelt de pagina als één landschap zonder zichtbare blokken?
- Leiden natuur, horizon, licht en atmosfeer de compositie?
- Zijn de primaire Vision Boards vooraf als blauwdruk geanalyseerd?
- Voelt de wereld groter dan de interface?

Gebruik [Atlas World Laws](./11-Atlas-World-Laws.md) als beslissende toets.

## World Engine-audit — huidige implementatie

### Bevindingen vóór implementatie

- De homepage bevat zes semantische hoofdsecties met behouden navigatie en content.
- `main.css` bevat meerdere opeenvolgende Creative Direction-overrides; dezelfde pseudo-elementen en backgrounds worden herhaald overschreven.
- Geldige productieassets tonen vooral bergen en valleien; bos, stil water, architectuur en materialen zijn nog niet publiek toegepast.
- De globale gouden SVG is één route, maar de oude inline `route-transition` bevat een tweede verborgen routegeometrie.
- Het kompas staat aan het einde van Route 02 en verschijnt volgens het nieuwe Experience Rhythm te vroeg.
- Menselijke schaal is aanwezig in hero en reizigerscrop, maar de reiziger is nog niet verbonden aan een late perspectiefscène.
- Challenges en Waarom lezen door grids, borders en kaarten nog als interfaceblokken.
- Fotolagen gebruiken verschillende achtergrondgroottes en overlappende overrides, waardoor interne beeldranden kunnen ontstaan.
- Cartografie is hoofdzakelijk overlay; materiaal, reliëf en landschap zijn nog onvoldoende geïntegreerd.
- Motion is technisch licht en reduced-motion-safe, maar meerdere gelijktijdige breathe-animaties maken het systeem moeilijk beheersbaar.

### Herstelrichting

- Eén scene-configuratie en één aanvullende expedition-stylesheet.
- Verwijder de tweede routegeometrie uit de overgang.
- Gebruik echte scene-layers met oversized media en organische masks.
- Voeg bos, stromend water, stil water, materiaal en architectuur uit goedgekeurde bronnen toe.
- Verplaats de reiziger naar Ridge of Perspective en het kompas naar Compass Moment.
- Maak grids transparanter en laat route en landschap onder de content doorlopen.

### Eindcontrole

Toets de implementatie per scène aan [Atlas Scene Library](./16-Atlas-Scene-Library.md) en registreer ontbrekende bronnen in [Atlas Asset Backlog](./18-Atlas-Asset-Backlog.md).

### Eindstatus eerste expeditie

- De bestaande navigatie, content en zes hoofdsecties zijn behouden.
- Scenes 001–010 delen één configuratiegestuurd worldsysteem met panorama, bos, crossing, stil water, materiaal, architectuur, vallei en open horizon.
- Eén gouden route loopt over de homepage; de oude tweede inline route is verwijderd.
- Het kompas verschijnt eenmaal en pas in Scene 009, na herkenning en perspectief.
- Fotografie wordt met organische masks, mist en overlap in de omgeving opgenomen zonder losse kaart- of fotokaders.
- Desktop, tablet en mobiel tonen geen horizontale overflow; de route, teksthiërarchie en scene-lagen blijven intact.
- `prefers-reduced-motion` schakelt de atmosferische en oriëntatiebewegingen uit.
- `/` en `/atlas-lab` zijn afzonderlijk gecontroleerd; Atlas Lab blijft inhoudelijk en visueel ongewijzigd.
