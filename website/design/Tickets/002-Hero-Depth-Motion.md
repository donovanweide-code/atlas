# Design Ticket 002 — Hero Depth & Motion

## Doel

De Hero moet rust uitstralen, maar tegelijkertijd subtiel leven.

De bezoeker mag niet bewust animaties zien.
De pagina moet natuurlijk aanvoelen.

## Waarom

We Build And Design staat voor richting, niet voor spektakel.

Beweging ondersteunt het verhaal, maar wordt nooit het verhaal.

## Opdracht

Voeg subtiele micro-interacties toe aan de Hero.

## Vereisten

### Afbeelding

- Geef de afbeelding een zeer lichte parallax tijdens scroll.
- Maximale verticale beweging: 20px.
- Geen schokkerige animaties.

### Route

- Laat de Atlas-route heel langzaam "ademen".
- Gebruik opacity of een zeer subtiele gradient.
- Geen bewegende streepjes.

### Waypoint

- Laat het waypoint iedere paar seconden heel subtiel pulseren.
- Niet groter dan ongeveer 2px verschil.

### CTA

- Hover:
    - 2px omhoog
    - iets diepere schaduw
    - snelle easing

### Hero

- Alle animaties moeten samen rustig aanvoelen.
- Alles moet performant blijven.
- Respecteer prefers-reduced-motion.

## Niet doen

- Geen bounce.
- Geen grote fades.
- Geen futuristische effecten.
- Geen zware JavaScript libraries.

## Acceptatiecriteria

De Hero voelt levendiger.

De bezoeker merkt nauwelijks waarom.

Alles blijft rustig en premium.

De performance blijft hoog.

Het project compileert zonder fouten.