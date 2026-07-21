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

## D-005 — Eén gedeeld Understanding-model

- **Datum:** 2026-07-21
- **Keuze:** Cases, Workspace, Logboek en Atlas Lab gebruiken hetzelfde versiegebonden domeinmodel voor bronnen, waarnemingen, bewijs, vragen, aannames, spanningen, patronen, inzichten, werkelijke vragen, vervolgstappen, relaties en revisies.
- **Waarom:** Betekenis moet herleidbaar blijven en mag niet verdwijnen in losse notities of schermspecifieke modellen.
- **Gevolg:** De publieke Experience gebruikt alleen de methodische taal; interne case-inhoud wordt nooit publiek gerenderd.

## D-006 — Atlas stelt voor, de mens bevestigt

- **Datum:** 2026-07-21
- **Keuze:** Relaties, inzichten, werkelijke vragen en vervolgstappen worden alleen na menselijke bevestiging bewaard. Lab-signalen zijn expliciet voorstellen en schrijven niets terug.
- **Waarom:** Understanding vereist ruimte voor onzekerheid en mag geen automatisch oordeel als waarheid presenteren.
- **Gevolg:** Revisies bewaren de eerdere betekenis; AquaFlask gebruikt uitsluitend bestaande, bevestigde klantkennis en krijgt geen automatisch gegenereerde inhoud.

## D-007 — Focus, Horizon en Stilte sturen de interface

- **Datum:** 2026-07-21
- **Status:** Besloten na de inhoudelijke GO op Sprint 001C; uitgangspunt voor toekomstig werk en geen uitbreiding van de afgesloten sprint.
- **Keuze:** Atlas onderscheidt Kennis, Begrip en Interface. De interface toont vanuit Focus alleen wat vandaag helpt, bewaart kansen en patronen aan de Horizon en gebruikt Stilte om overige kennis bewust niet te tonen.
- **Waarom:** De AquaFlask-review liet zien dat een volledig en zorgvuldig klantprofiel nog als dossier kan voelen wanneer alle beschikbare kennis tegelijk zichtbaar is. Atlas moet zich gedragen als een collega die al heeft nagedacht, niet als software die kennis opsomt.
- **Gevolg:** Meer beschikbare kennis leidt niet automatisch tot meer interface. Nieuwe ontwerpen moeten aantonen waarom informatie nu aandacht verdient; open kansen concurreren nooit met de actieve case.
- **Centrale toets:** Begrijpt Donovan binnen enkele seconden waarom een klant nu aandacht verdient en wat hij moet doen — en voelt het alsof Atlas al heeft nagedacht?
- **Horizonverkenning:** [`Redactionele Intelligentie`](../ideas/005-Redactionele-Intelligentie.md) bewaart de toekomstige ontwerpvragen, schaalrisico's en trigger zonder ze aan Sprint 001C toe te voegen.

## D-008 — Waarnemen vóór Review

- **Datum:** 2026-07-21
- **Status:** Besloten door Donovan tijdens het onderzoek naar een feedbackmodule na Sprint 001D.
- **Aanleiding:** De eerste verkenning gebruikte de werktitel `Review Mode`. Die taal begon al bij beoordeling, terwijl Atlas methodisch eerst de werkelijkheid wil zien zonder direct betekenis, probleem of oordeel toe te voegen.
- **Besluit:** De eerste laag heet `Waarnemen`. Een vastgelegde waarneming is een ervaring in een door Atlas herkende en door Donovan bevestigde context. Zij krijgt de status `Nog niet beoordeeld`. Review blijft uitsluitend de menselijke beoordelingsfase die daarna volgt.
- **Reden:** Atlas vraagt eerst wat iemand waarneemt, voordat Atlas vraagt wat daarvan gevonden wordt. Daarmee blijven waarneming, context, beoordeling, Understanding, inzicht en vervolgstap herkenbaar van elkaar onderscheiden.
- **Gevolg voor taal:** De methode gebruikt `Waarnemen`, `Waarneming`, `Atlas herkent de context`, `Donovan bevestigt de context` en `Nog niet beoordeeld`. Termen als review, feedback, probleem, issue of taak worden niet gebruikt voor de eerste vastleggingslaag.
- **Gevolg voor methode:** Een waarneming wordt nooit automatisch waarheid, Understanding, inzicht of taak. Ook positieve ervaringen zijn geldige waarnemingen. Pas menselijke beoordeling bepaalt of de waarneming betekenis heeft en verder wordt gedragen.

## D-009 — De website is de publieke ingang; Atlas blijft op de achtergrond

- **Datum:** 2026-07-21
- **Status:** Besloten bij de GO op Sprint 001D.
- **Keuze:** De publieke Experience maakt concreet dat We Build And Design websites realiseert en laat de Atlas-methode ervaren zonder Atlas als product, AI of publieke propositie te introduceren.
- **Waarom:** Klanten hoeven Atlas niet te kennen. Zij moeten ervaren dat We Build And Design hun bedrijf begrijpt. De bestaande herkenning als websitebouwer is daarom een waardevolle ingang, geen positionering die eerst moet verdwijnen.
- **Gevolg:** De publieke eerste minuut benoemt websites expliciet, waarna begrip, ontwerp en technologie de differentiatie dragen. Publiek bewijs wordt alleen toegevoegd wanneer werk, context en toestemming bevestigd zijn. De bestaande contactroute blijft intact zolang geen bevestigd alternatief bestaat.
- **Interne vertaling:** Case 0001 toont een actuele redactionele briefing. Een klantcase die terecht op bewijs wacht, verdringt zonder concrete vervolgstap niet langer de actieve WBD-prioriteit uit het Kompas.
