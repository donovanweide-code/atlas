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

## D-010 — Oriëntatie vóór case-identiteit

- **Datum:** 2026-07-25
- **Status:** Besloten met expliciete GO na het architectuuronderzoek dat volgde op de inhoudelijke beoordeling van Revision 3.
- **Aanleiding:** Revision 3 weerspiegelde de repository correct, maar de repository droeg nog niet alle bekende praktijkwerkelijkheid. Bij Cees maakte zichtbaar dat Atlas wel een levenscyclus voor bestaande cases bezat, maar geen neutrale methodische verblijfplaats en menselijke toelatingspoort voor een betekenisvol signaal voordat case-identiteit ontstaat.
- **Keuze:** Atlas introduceert **Oriëntatie** als methodische fase voor een werkelijk praktijksignaal met de status **Nog niet toegewezen**. Het signaal blijft daar neutraal totdat Donovan het aan een bestaande case verbindt, als zelfstandige nieuwe case bevestigt, zonder case aan de Horizon bewaart of bewust afsluit.
- **Architectuur:** Praktijkoriëntatie, case-identiteit, case-rijpheid en redactionele aandacht zijn afzonderlijke lagen. Een case-ID bevestigt identiteit; een Confirmed `CASE-SNAPSHOT` bevestigt het actuele redactionele casebeeld; Focus, Horizon en Stilte bepalen afzonderlijk hoeveel aandacht de case nu verdient.
- **Menselijke grens:** Atlas en Codex mogen een mogelijk praktijksignaal, voorlopige context en samenhang voorstellen. Donovan bevestigt de context en beslist over toewijzing, case-identiteit, prioriteit en afsluiting.
- **Gevolg:** Ieder betekenisvol praktijksignaal krijgt een expliciete bestemming of herbeoordelingstrigger. Nieuwheid, hoeveelheid kennis of een lokaal opgeslagen vervolgstap maken een case nooit zelfstandig leidend in het Kompas.
- **Scopegrens:** Dit besluit legt de generieke methode vast. Het registreert Bij Cees niet als case, kent geen case-ID toe, maakt geen `CASE-SNAPSHOT` en wijzigt geen Workspace, opslagmodel of interface. Die toepassing en uitvoering vragen afzonderlijke beoordeling en besluitvorming.

## D-011 — Codex als actieve denk- en uitvoeringspartner

- **Datum:** 2026-07-25
- **Status:** Expliciet bevestigd door Donovan bij de canonieke vastlegging van Oriëntatie en de caselevenscyclus.
- **Keuze:** Codex is niet alleen technisch uitvoerder. Codex denkt actief mee, onderzoekt alternatieven, signaleert inconsistenties, benoemt risico's en mag betere richtingen voorstellen.
- **Mandaat:** Binnen een vastgestelde Foundation en expliciete scope mag Codex zelfstandig technische en redactionele keuzes voorbereiden en onderbouwen. Realisatie volgt binnen de verleende opdracht; fundamentele wijzigingen in visie, methode, prioriteit of verantwoordelijkheid vallen daar nooit stilzwijgend onder.
- **Grens:** Een fundamentele wijziging wordt nooit stilzwijgend uitgevoerd. Codex legt haar eerst als Candidate met bronnen, gevolgen, risico's en een voorstel aan Donovan voor. Donovan houdt het uiteindelijke besluit.
- **Gevolg:** Kritisch meedenken en begrensd initiatief zijn onderdeel van goed Codex-werk; methodische of strategische autonomie zonder menselijke bevestiging niet.
