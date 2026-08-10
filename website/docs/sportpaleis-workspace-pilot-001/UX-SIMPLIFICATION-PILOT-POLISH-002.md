# Sportpaleis Bedrukking - UX Simplification & Pilot Polish 002

- Release: `SPW-BEDRUKKING-PILOT-POLISH-002-20260810`
- Baseline: `SPW-BEDRUKKING-PILOT-001-20260809`
- Datum: 10 augustus 2026
- Scope: uitsluitend lokale UX-simplificatie en pilot-polish

## Operationeel contract

- Eerste laag: wat moet de medewerker nu doen?
- Tweede laag: aanvullende details op verzoek.
- Technische laag: productie-instructie, audit of beheer.
- Status en aandacht blijven afzonderlijke begrippen.
- Productie toont alleen gecontroleerd, maakbaar werk.

## Belangrijkste wijzigingen

- Nieuwe order volgt `Klant -> Bedrukking -> Vereniging -> Artikelen -> Controleren`.
- Dubbele semantische naam-/initialeninvoer is uit de primaire flow verwijderd.
- Junior/Senior verschijnt alleen wanneer een rugnummer is ingevuld.
- Verenigingen gebruiken een zoekbare, scrollbare contextlijst in bronvolgorde.
- Actieve en gereedgemelde orders zijn gescheiden; aandacht is een aparte indicator.
- Productie toont uitsluitend orders in `CONTROL` of `PRINT` en gebruikt gewone werktaal.
- Gebruikersbeheer scheidt rol, toegang en concrete rolrechten.
- De header is een uniforme zwarte Sportpaleis-identiteitsbalk.
- Desktop- en 390px-layouts hebben een hard no-overflow-contract.

## Bewust uitgesteld

- Nieuwe gebruiker uitnodigen: een veilige uitnodigings- en activatiestroom bestaat nog niet.
- Individuele rechtenafwijkingen: server-RBAC blijft leidend; geen schijnrechten in de UI.
- Officiele verenigingslogo's: alleen gebruiken wanneer betrouwbare assets beschikbaar zijn.
- Junior-rugnummermaat: fysieke bronvalidatie blijft vereist.

## Veiligheidsgrenzen

- Geen deployment.
- Geen DNS-wijziging.
- Geen echte mail.
- Geen Direct Print-, WinPlot- of Summa-actie.
- Geen wijziging aan gevalideerde order-, mail-, persistence- of RBAC-regels.

## Design recovery en behouden richting

- Laatst aantoonbaar gekozen richting: de rustige `SPW-008A-BIJSTURING-20260808` Workspace-layout met visuele vereniging- en artikelkeuze, orderbrede standaardbedrukking, rode artikelafwijkingen en dezelfde desktop-/mobiele design language.
- Behouden: verenigingscontext per artikelregel, één klantorder met meerdere verenigingen, visuele artikelcatalogus, orderstandaard met artikelafwijkingen, rolgebonden navigatie en beheer als eigenaar van configuratie.
- Hersteld/versterkt: één zwarte Sportpaleis-header, herkenbare ordervolgorde, rustige actieve navigatie, menselijke status- en aandachtstaal, schaalbare verenigingenlijsten en technische details één niveau dieper.
- Geen nieuwe dashboard- of formulierarchitectuur geïntroduceerd.

## Orders en Productie

- Orders blijft de administratie van de volledige klantorder en scheidt `Actief`, `Gereed` en `Alles`.
- Aandacht is een aparte rode indicator en geen vervangende status.
- Productie toont alleen orders in de gecontroleerde maakfasen en groepeert deze per foliekleur.
- De bestaande Illustrator-route blijft zichtbaar; Workspace stuurt niets automatisch naar Direct Print, WinPlot of Summa.

## Rollen en toegang

- Winkelmedewerker: Nieuwe order, Overzicht en Orders; geen beheer- of financiële routes.
- Patrick/Productie: Overzicht, Orders en Productie; geen beheer- of financiële routes.
- Kevin/Beheer: beheer van gebruikers, verenigingen, artikelen/productieprofielen, folie/rollen en bestaande commerciële WBD-context.
- Server-side RBAC blijft authority. Individuele overrides en een nieuwe-gebruikeruitnodiging zijn bewust niet gesimuleerd.

## New employee / low digital skill review

### Verder vereenvoudigd

- Nieuwe order gebruikt `Klant -> Bedrukking -> Vereniging -> Artikelen -> Controleren`.
- Orders gebruikt korte filters, één zoekveld en menselijke statusnamen.
- Productie opent met `Wat kunnen we nu maken?` en toont alleen maakbaar werk.
- Gebruikers en verenigingen gebruiken herkenbare lijsten met één gekozen detail.
- Optionele velden zijn als optioneel gemarkeerd en vervolgkeuzes verschijnen pas wanneer relevant.

### Nog uitleg nodig

- Een bewuste artikelafwijking ten opzichte van de orderstandaard.
- De vakinhoudelijke betekenis van een ontbrekende beheerde prijs.
- Fysieke validatie van de Junior-rugnummermaat.

### Redelijke twijfel en risico

- Een nieuwe medewerker kan kort twijfelen bij één klantorder met meerdere verenigingen of bij een artikelafwijking. Verenigingslabels per artikel en de rode afwijkingsmarkering beperken dit risico.
- De normale orderflow is in de lokale browserreview zonder handleiding te begrijpen.
- Echte winkelobservatie blijft nodig voor tempo, uitzonderingssituaties en woordgebruik. Training is geen acceptatievoorwaarde voor de primaire flow.

## Zelf gevonden en gecorrigeerd

- Artikelkeuze houdt focus bij het gekozen artikel en reset de scrollpositie niet.
- Lange aandachtsredenen zijn teruggebracht tot `Aandacht nodig`; de volledige reden blijft aanvullend beschikbaar.
- Een mobiele reviewcapture met een verkeerde gedeelde demosessie is verworpen en opnieuw vastgelegd met Patrick/Productie.
- Desktop en de deterministische lokale 390px-capture hebben geen horizontale overflow.

## Exacte validatie

- `npm.cmd test` - 418/418 tests PASS.
- `npm.cmd run build` - PASS inclusief `verify-public-build.mjs`.
- `npm.cmd run build:workspace` - PASS inclusief `verify-workspace-build.mjs`.
- `node --check scripts/sportpaleis-pilot-foundation.mjs` - PASS.
- `node --check scripts/sportpaleis-pilot-development-api.mjs` - PASS.
- Lokale health - `status: ok`, release `SPW-BEDRUKKING-PILOT-POLISH-002-20260810`, hardware-send `false`.
- Lokale readiness - `status: ready`.
- Browser - desktop 1265/1265 client/scrollbreedte, lokale mobiele Workspace 390/390.
- Browser - Winkelmedewerker en Patrick krijgen geen toegang tot beheercontext.
- PDF - 21 pagina's teruggerenderd met Poppler en visueel gecontroleerd.

## Reviewartefacten

- Screenshots: `C:\Users\donov\Documents\Atlas\website\output\screenshots\SPW-BEDRUKKING-PILOT-POLISH-002-20260810`
- Primaire review-PDF: `C:\Users\donov\Documents\Atlas\output\pdf\SPORTPALEIS-BEDRUKKING-UX-SIMPLIFICATION-PILOT-POLISH-REVIEW.pdf`

## Open blockers

- Open UX-blockers voor menselijke visuele review: 0.
- Pilotproductie met Junior-rugnummers blijft geblokkeerd totdat de fysieke maat door Sportpaleis is gevalideerd.
- Geen deployment, echte mail, DNS-wijziging of hardware-actie uitgevoerd.
