# Atlas Decisions

Beslissingen zijn herleidbaar. De Foundation blijft leidend.

## D-001 — Eén canonieke Foundation

- **Datum:** 2026-07-20
- **Keuze:** `Foundation.md` in de repository-root blijft de enige bron van waarheid.
- **Waarom:** Een tweede volledige `docs/atlas/FOUNDATION.md` zou duplicatie en toekomstige conflicten veroorzaken.
- **Gevolg:** Het document in `/docs/atlas` verwijst alleen naar de canonieke Foundation.

## D-002 — Workspace als interne route

- **Datum:** 2026-07-20
- **Keuze:** De eerste Atlas Workspace leeft op `/atlas` binnen de bestaande Vite-app.
- **Waarom:** Dit maakt de werkplek morgen bruikbaar zonder een tweede applicatie of dependency.
- **Gevolg:** De publieke website en `/atlas-lab` blijven onafhankelijk en ongewijzigd.

## D-003 — Lokale opslag vóór database

- **Datum:** 2026-07-20
- **Keuze:** Focus, ideeën en logboeknotities worden voorlopig in `localStorage` bewaard.
- **Waarom:** Dagelijks gebruik moet eerst bewijzen welke datamodellen en samenwerking werkelijk nodig zijn.
- **Gevolg:** Data blijft aan één browser gekoppeld en is nog niet geschikt voor samenwerking of back-up.

## D-004 — Geen publieke navigatielink

- **Datum:** 2026-07-20
- **Keuze:** `/atlas` krijgt `noindex, nofollow` en geen link in de publieke navigatie.
- **Waarom:** De Workspace is een interne voordeur, geen marketingpagina of klantportaal.
