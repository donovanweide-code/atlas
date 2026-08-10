# Experience Polish 001 — Kandidaat-handoff

## Status

Geïntegreerde kandidaat voor gezamenlijke eindreview.

Dit is geen Production GO, Experience GO of deployment-opdracht. De publieke productie is niet gewijzigd.

## Doel

De publieke website laten voelen als één redactionele Experience waarin begrip waarde geeft, iedere pagina een eigen hoofdstuk vormt en een relevante volgende vraag vanzelf zichtbaar wordt.

## Belangrijkste wijzigingen

### Positionering

- De algemene kern is losgemaakt van uitsluitend ondernemers, bedrijven en bedrijfswebsites.
- Homepage en metadata spreken vanuit digitale vragen, gewenste verandering, richting en realisatie.
- De bezoeker en diens werkelijkheid blijven het uitgangspunt; Donovan verschijnt alleen waar verantwoordelijkheid betekenis heeft.

### Publieke hoofdstukken

- Homepage: de eerste tien seconden maken begrip, design en build samen zichtbaar.
- Diensten en Werkwijze: Onderzoeken, Adviseren, Design en Build vormen één afhankelijk denkproces.
- Projecten: toont eerlijk wat WBD vandaag wél kan onderbouwen en construeert geen klantbewijs.
- Over ons: bewaart de vaste copy-architectuur en maakt verantwoordelijkheid menselijk zonder founder-verhaal.
- Contact: voelt als een rustige voortzetting van de methode, niet als verkoopovergang.

### Kennis als bibliotheek

- Ieder bestaand artikel onderzoekt één vraag, bevat een redactioneel ritmemoment en eindigt met een eigen conclusie.
- Ieder artikel opent twee inhoudelijk gekozen vervolgvragen met titel, reden en betekenisvolle link.
- Iedere artikelroute heeft boven- en onderaan een weg terug naar Kennis.
- Contact volgt pas na conclusie en inhoudelijke doorstroming.
- Kaart- en linklabels zijn inhoudelijk uniek; er is geen automatische aanbevelingslogica.

### Ritme en compositie

- Artikelafstand is op desktop en mobiel begrensd zonder de editorial rust te verliezen.
- Mobiele hero-overlays laten fotografie zichtbaar meewerken aan het verhaal.
- Een te brede mobiele homepage-descriptor is begrensd.
- Een bestaande positioneringsfout waardoor de Experience-footer achter een CTA kon vallen is hersteld.

### UX, accessibility en SEO-basis

- Alle publieke routes hebben één H1, een unieke paginatitel, beschrijving en canonical.
- Een zichtbare skiplink bij focus is op iedere publieke route toegevoegd.
- Vervolg- en teruglinks hebben focusstaten en minimaal betekenisvolle, bereikbare acties.
- Sitemap en robots omvatten alle publiceerbare routes.
- Hero-afbeeldingen krijgen voorrang; redactionele beelden laden uitgesteld.

## Bewust niet gewijzigd

- Geen redesign, nieuwe fotografie, AI-beelden of stockbeelden.
- Geen nieuwe kennis- of casepagina’s zonder echte publiceerbare inhoud.
- Geen fictieve resultaten, testimonials of klantbewijs.
- Geen CMS, aanbevelingsengine, Atlas Demo, Experience Preview, cliëntportaal, Workspace- of monitoringfunctionaliteit.
- Geen productie- of previewdeployment.

## Verificatie

- `npm test`: 43 tests geslaagd.
- `npm run build`: TypeScript- en Vite-build geslaagd.
- Public-only verificatie: 27 bestanden en 7 tekstbestanden gecontroleerd.
- `git diff --check`: geslaagd.
- 11 publieke routes direct geopend; alle routes leverden de bedoelde H1 en geen 404.
- Alle interne publieke links gecontroleerd; 0 onverwachte of dode interne routes.
- Desktop en een 390 × 844 mobiele viewport visueel gecontroleerd op hero, ritme, Kennis-doorstroming, CTA en footer.
- De tijdelijke responsive testpagina is na controle verwijderd.

## Reviewpunten

Beoordeel de kandidaat als één Experience:

1. Voelt Kennis als een levende, samenhangende bibliotheek?
2. Is de volgende betekenisvolle vraag gemakkelijk te vinden?
3. Is de positionering breed genoeg zonder abstract te worden?
4. Voelt de schrijfstem menselijk, rustig en deskundig?
5. Dragen tekst en bestaande fotografie samen één verhaal?
6. Voelen de disciplines als één proces in plaats van vier diensten?
7. Blijft contact zichtbaar zonder ieder artikel in een verkooppunt te veranderen?
8. Is het ritme op desktop en mobiel betekenisvol per schermhoogte?
9. Blijft Projecten volledig eerlijk over de huidige bewijsgrens?
10. Geeft iedere wijziging aantoonbaar meer begrip, vertrouwen of nieuwsgierigheid?

## Horizon — niet onderdeel van deze kandidaat

Nieuwe artikelen en cases ontstaan uitsluitend uit echte vragen, praktijk en publiceerbaar bewijs. De eerder benoemde Atlas Experience Preview en de evolutie van de Workspace blijven toekomstige trajecten; deze polish bouwt daar niets voor.
