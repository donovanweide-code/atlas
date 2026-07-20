# WBD Design Decisions

Dit document legt de belangrijkste ontwerpbeslissingen vast.

Iedere beslissing beschrijft niet alleen *wat* we hebben besloten, maar vooral *waarom*.

---

# Decision 001 — Hero headline

## Beslissing

De hero-headline is:

> Wij geven ideeën richting.

## Reden

De headline beschrijft niet wat We Build And Design maakt.

De headline beschrijft de verandering die we voor mensen creëren.

---

# Decision 002 — Hero supporting copy

## Beslissing

De ondersteunende tekst is:

- Door eerst te begrijpen.
- Daarna te visualiseren.
- Pas dan te bouwen.

## Reden

Deze volgorde vormt de basis van onze werkwijze.

We beginnen nooit met techniek.

---

# Decision 003 — Atlas

## Beslissing

Atlas is geen product.

Atlas is de wereld en de werkwijze van We Build And Design.

Bezoekers ontdekken Atlas stap voor stap.

Atlas wordt niet direct uitgelegd.

## Reden

Nieuwsgierigheid mag nooit verwarring worden.

Atlas moet voelen als een ontdekking.

Niet als een marketingterm.

---

# Decision 004 — Ontwerpprincipes

## Beslissing

We hanteren de volgende ontwerpprincipes:

- Nieuwsgierigheid vóór aannames.
- Begrijpen vóór bouwen.
- Verbinden vóór overtuigen.
- Eerst visualiseren, daarna bouwen.
- Herkenning vóór overtuiging.

## Reden

Iedere ontwerpkeuze wordt aan deze principes getoetst.

---

# Decision 005 — De rol van de bezoeker

## Beslissing

De bezoeker is de hoofdpersoon.

We Build And Design is de gids.

Atlas is de wereld waarin de reis plaatsvindt.

## Reden

Wij vertellen nooit ons eigen verhaal als eerste.

De bezoeker moet zichzelf eerst herkennen.

Pas daarna introduceren we onze visie.

---

# Decision 006 — De Wet van Atlas

## Beslissing

Iedere route beantwoordt precies één vraag.

En roept precies één nieuwe vraag op.

We vertellen nooit vooruit op de reis van de bezoeker.

## Reden

Een bezoeker ontdekt Atlas.

Hij krijgt Atlas niet uitgelegd.

Nieuwsgierigheid mag nooit verwarring worden.

---

# Decision 007 — Visuele richting

## Beslissing

De website moet rustig, menselijk en premium voelen.

Iedere route krijgt maximaal één opvallend detail.

Dat detail ondersteunt de ervaring.

Niet de aandacht.

## Reden

Rust creëert vertrouwen.

Subtiele verrassingen maken de reis memorabel zonder de bezoeker af te leiden.
# Decision 008 — De Belofte

Vertrouwen is geen alternatief voor verkoop.

Vertrouwen is de manier waarop We Build And Design verkoopt.

De bezoeker moet eerst zichzelf herkennen en daarna voelen dat hij de route niet langer alleen hoeft af te leggen.

---

# Decision 009 — The World Beyond The Horizon

## Beslissing

Landschappen worden gebruikt als bestemming, niet als decoratieve achtergrond.

Iedere volgende route onthult meer van dezelfde wereld en maakt de horizon letterlijk groter. Natuurlijke elementen en licht zijn visueel leidend; topografie, routes en waypoints zijn ondersteunend.

## Reden

Atlas moet de bezoeker niet uitnodigen om een volgende sectie te lezen, maar om verder te reizen. Een steeds grotere horizon maakt groei, inzicht en richting voelbaar zonder ze uit te leggen.

---

# Decision 010 — Echte landschappen zijn onderdeel van Atlas

## Beslissing

Atlas gebruikt echte landschappelijke beeldlagen als inhoudelijk onderdeel van de ervaring.

CSS-vormen, SVG-lijnen, topografie en gradients blijven ondersteunend.

Zij vervangen het landschap niet.

## Reden

De bezoeker moet niet alleen een route zien.

Hij moet verlangen voelen naar de wereld achter de horizon.

Echte landschappelijke diepte maakt Atlas begrijpelijk, voelbaar en memorabel.

## Gevolg

Goedgekeurde Vision Boards worden vertaald naar gecontroleerde webassets.

De originele boards blijven documentatie.

De afgeleide assets worden vanuit `src/assets` gebruikt en geregistreerd in het Atlas Asset Manifest.

Een Vision Board is niet alleen een sfeerreferentie. Wanneer een goedgekeurd landschap essentieel is voor de ervaring, wordt daarvan een gecontroleerde, lokale en webgeschikte asset gemaakt.

Abstracte vormen, topografische lijnen en gradients mogen echte landschappelijke diepte ondersteunen, maar nooit vervangen.

---

# Decision 011 — Gouden route, echte landschappen en kompasbetekenis

## Beslissing

Echte landschappen vormen de primaire visuele wereld van Atlas.

De gouden route is het vaste herkenningselement dat de bezoeker door die wereld begeleidt.

Waypoints tonen momenten van inzicht.

Het kompas verschijnt alleen op een betekenisvol moment van oriëntatie en keuze.

Geometrische bergvormen worden niet langer als dominante landschapsvervanging gebruikt.

Atlas wordt eerst ervaren en pas daarna benoemd. Grafische lijnen ondersteunen fotografie en betekenis, niet andersom.

## Reden

De bezoeker moet niet alleen zien dat er een route is.

Hij moet verlangen voelen naar de wereld waar die route naartoe leidt.

Atlas en het kompas worden begrijpelijk wanneer hun functie zichtbaar wordt in de ervaring.

---

# Decision 012 — Vision Boards zijn ontwerpdocumenten

## Beslissing

Goedgekeurde Vision Boards zijn ontwerpdocumenten, geen vrijblijvende sfeerreferenties.

Hun compositie, diepte, schaal, leegte, horizon, licht, ritme, beweging en mensbeeld worden geanalyseerd voordat zij naar het web worden vertaald. Deze analyse wordt vastgelegd en vormt samen met de Atlas World Laws de toets voor implementatie.

## Reden

De kracht van Atlas zit niet in losse visuele motieven, maar in de ruimtelijke relaties ertussen. Zonder analyse worden landschappen decoratie en wordt de interface opnieuw leidend.

## Gevolg

Iedere visuele vertaling begint bij de wereld. De wereld stuurt de ervaring; de ervaring stuurt de interface.

---

# Decision 013 — De Atlas World Engine

## Beslissing

Atlas wordt ontworpen in de volgorde World Laws → Visual Genome → Experience Rhythm → Scene Library → interface. De homepage is de First Expedition en geen verzameling zelfstandig vormgegeven secties.

## Reden

Een gedeeld systeem voorkomt dat landschappen, cartografie en symbolen als losse decoratie worden toegevoegd.

---

# Decision 014 — Eén technische gouden route

## Beslissing

De homepage gebruikt één doorlopende SVG-route over de volledige pagina. Scènes mogen haar maskeren of achter landschap laten verdwijnen, maar maken geen eigen concurrerende routegeometrie.

## Reden

Eén coördinatenruimte bewaakt continuïteit, responsive gedrag en performance zonder scroll-library of zware JavaScript-aansturing.

---

# Decision 015 — Het kompas behoort tot Scene 009

## Beslissing

Het kompas verschijnt eenmaal in The Compass Moment, nadat herkenning, ontdekking, reflectie en perspectief zijn opgebouwd. Het wordt met CSS/SVG als messing en gegraveerd wereldobject vormgegeven.

## Reden

Oriëntatie heeft pas betekenis wanneer de bezoeker voldoende van de wereld en zijn eigen positie begrijpt.

---

# Decision 016 — Scènes zijn configuratiegestuurd

## Beslissing

Scène-identiteit, journey phase, asset en visuele toestand worden centraal vastgelegd in `src/atlas-scenes.ts`. Content blijft semantisch in de homepage; scene-layers en motion blijven daarvan gescheiden.

## Reden

De Scene Library kan zo groeien zonder dat iedere nieuwe wereldlaag de volledige homepage opnieuw laat ontstaan.
