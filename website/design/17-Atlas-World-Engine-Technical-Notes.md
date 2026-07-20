# Atlas World Engine — Technical Notes

## Architectuur

De publieke homepage blijft binnen de bestaande Vite + TypeScript-structuur. Scènedata staat in `src/atlas-scenes.ts`; semantische content blijft in `src/main.ts`; de World Engine-presentatie staat in `src/styles/atlas-expedition.css`. Atlas Lab blijft zelfstandig in `src/atlas-lab.ts` en wordt niet gekoppeld aan publieke scene-motion.

## Scene-model

Iedere geïmplementeerde scène heeft een stabiel ID, journey phase, asset, lichtfase, density en implementatiestatus. Markup gebruikt `data-scene` en herbruikbare scene-layers. Hierdoor kan een landschap of overgang worden vervangen zonder inhoud of routearchitectuur te herschrijven.

## Gouden route

De eenvoudigste robuuste oplossing is één SVG (`src/assets/atlas-golden-route.svg`) als doorlopende laag over `.page`.

- Eén geometrie voor de hele expeditie.
- Waypoints zitten op dezelfde coördinatenruimte.
- De lijn wordt met opacity en masking gedeeltelijk zichtbaar.
- Landschapslagen kunnen door z-index en masks vóór de route liggen, zodat zij achter terrein verdwijnt.
- Desktop, tablet en mobiel gebruiken dezelfde geometrie met aangepaste positionering; geen concurrerende segmenten.
- Reduced motion toont de volledige statische route zonder intro-animatie.

Een scroll-progressgestuurde path animation is bewust niet gekozen: zij voegt complexiteit en motion-afhankelijkheid toe zonder inhoudelijke winst.

## Compass Moment

Het kompas is één semantisch decoratief DOM-element in Scene 009. Messing, reliëf, licht en schaduw worden met CSS opgebouwd. De naald oriënteert hoogstens eenmaal wanneer motion is toegestaan. Het kompas is geen fixed navigatie, logo, canvas of externe component.

## Media

- Vision Boards blijven documentatie.
- Alleen geregistreerde tekstvrije WebP-crops worden in productie geïmporteerd.
- Hero-assets laden eager; latere scene-assets gebruiken `loading="lazy"` en `decoding="async"`.
- Image-layers gebruiken `object-fit`, oversized bounds en organische masks; nooit een zichtbaar fotokader.
- Lage-resolutie boardcrops worden alleen als zachte atmosferische laag gebruikt.

## Motion en performance

Motion gebruikt uitsluitend transform en opacity. Geen scroll-jacking, canvas of animatielibrary. `IntersectionObserver` activeert bestaande contentreveal; scene-motion blijft CSS-gestuurd. `prefers-reduced-motion` schakelt alle niet-essentiële animatie en transitions uit.

## Toegankelijkheid

Decoratieve world-layers zijn `aria-hidden`. Informatieve beelden krijgen alt-tekst. De DOM-volgorde blijft inhoudelijk. Tekstcontrast, focusgedrag en responsive leesvolgorde hebben voorrang op landschap. Waypoints en kompas zijn nooit de enige drager van betekenis.

## Uitbreiden

Nieuwe scènes krijgen eerst een volledig Scene Library-record, vervolgens een geregistreerde asset en pas daarna een configuratie-entry en world-layer. Een nieuwe scène mag de bestaande routegeometrie niet dupliceren.
