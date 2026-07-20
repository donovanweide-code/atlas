# Design Ticket 001 — Hero Route

## Doel

De hero moet voelen als het begin van een route, niet als losse tekst naast een afbeelding.

## Huidige situatie

De hero bevat:

- De headline: “Wij geven ideeën richting.”
- De ondersteunende tekst:
  - Door eerst te begrijpen.
  - Daarna te visualiseren.
  - Pas dan te bouwen.
- Eén knop: “Start de route”.
- Een route-indicator:
  - ROUTE 01
  - Ontdek Atlas
- Een rond waypoint met een verticale lijn.
- Een subtiele groene glow achter de afbeelding.

## Opdracht

Voeg een subtiele horizontale Atlas-route toe die vanuit de linkerkolom richting de afbeelding loopt.

## Vereisten

- Voeg in `src/main.ts` direct na de bestaande route-indicator een semantisch decoratief element toe voor de route-lijn.
- Style dit element in `src/styles/main.css`.
- De lijn moet dun en rustig zijn.
- Gebruik een groene kleur die aansluit op de bestaande huisstijl.
- Gebruik lage opacity.
- Laat de lijn eindigen met een klein rond waypoint.
- De route moet het oog van links naar rechts begeleiden.
- Geen futuristisch of technisch HUD-effect.
- Verberg of verkort de route op kleinere schermen.
- Verander niets aan andere secties.
- Behoud de bestaande hero-content en compositie.

## Acceptatiecriteria

- De hero voelt meer als één compositie.
- De route ondersteunt het Atlas-verhaal.
- De lijn trekt niet te veel aandacht.
- De website blijft responsive.
- Het project compileert zonder fouten.