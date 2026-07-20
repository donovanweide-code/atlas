# Creative Direction 012 — Atlas World Engine: First Expedition

## Aanleiding

De Atlas-elementen bestaan, maar eerdere iteraties zijn als opeengestapelde sectie- en CSS-aanpassingen gegroeid. Daardoor blijven ritme, ecosysteemvariatie en overgangen onvoldoende systemisch.

## Doel

Richt de bestaande homepage in als eerste expeditie door de Atlas World Engine. De wereld wordt eerst bepaald; content en interface worden daarin geplaatst.

## Ontwerpbesluit

- Gebruik het Visual Genome, Experience Rhythm, Director's Handbook en de Scene Library als samenhangend systeem.
- Gebruik één configuratiegestuurde scene-architectuur.
- Gebruik één gouden route over de volledige expeditie.
- Laat het kompas alleen in Scene 009 verschijnen.
- Wissel panorama, bos, water, materiaal, vallei en open horizon bewust af.
- Behoud bestaande publieke inhoud en navigatie.

## Gevolgen

Losse section-backgrounds worden vervangen door scene-layers die via mist, licht, water, materiaal en overlap doorlopen. Cartografie wordt onderdeel van landschap en materiaal. Atlas Lab blijft de interne ontwikkelomgeving.

## Scope

- Homepage `/`.
- Scene-configuratie en World Engine-styling.
- Lokale, geregistreerde Atlas-assets.
- Documentatie, Decisions en review.
- Responsive en reduced-motion gedrag.

Niet in scope: nieuwe commerciële content, andere publieke routes, externe libraries of vervanging van Atlas Lab.

## Acceptatiecriteria

- Minimaal de eerste scènes zijn zichtbaar vertaald.
- Landschapsvariatie omvat naast bergen ook bos, stromend en stil water, materialen en ruimte.
- Eén route verbindt de wereld; waypoints hebben betekenis.
- Het kompas verschijnt laat en eenmaal.
- Geen harde fotokaders of section-overgangen.
- Content en navigatie blijven intact.
- Desktop, tablet, mobiel en reduced motion zijn gecontroleerd.
- Typecheck en productiebuild slagen.

## Openstaande assets

Zie [Atlas Asset Backlog](../18-Atlas-Asset-Backlog.md).

## Implementatiestatus

Geïmplementeerd binnen de huidige World Engine-iteratie. Technische en visuele validatie is uitgevoerd op desktop, tablet en mobiel. De TypeScript-controle en productiebuild zijn succesvol afgerond.
