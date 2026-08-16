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

## D-012 — Production GO en Experience GO zijn afzonderlijke kwaliteitsgrenzen

- **Datum:** 2026-07-26
- **Status:** Expliciet besloten door Donovan na de gecontroleerde productielivegang van de We Build And Design Experience in Sprint 004.
- **Aanleiding:** Sprint 004 bewees dat een Experience technisch verantwoord naar productie kan terwijl de volledige inhoudelijke reis nog niet gereed is voor een eerlijk oordeel als geheel. Zonder afzonderlijke grenzen kan een technische livegang onbedoeld worden geïnterpreteerd als bevestiging van inhoudelijke volledigheid.
- **Keuze:** Iedere Atlas Experience kent twee zelfstandige GO-momenten:
  - **Production GO:** de Experience is technisch gereed voor een gecontroleerde productiepublicatie, inclusief aantoonbare buildkwaliteit, bereikbaarheid, kritieke routecontrole, herstelbaarheid en een bevestigde rollback.
  - **Experience GO:** de bedoelde inhoudelijke reis is voldoende volledig, coherent en eerlijk onderbouwd om als geheel door de beoogde mensen te laten beoordelen.
- **Onafhankelijkheid:** Production GO impliceert geen Experience GO. Experience GO impliceert geen toestemming voor productiepublicatie. Ieder GO-moment vereist een eigen expliciete menselijke bevestiging.
- **Voorwaarde voor Experience GO:** De volledige bedoelde reis is aanwezig; de belangrijkste claims rusten op herleidbare praktijk of aantoonbaar werk; kritieke tekst-, beeld-, bewijs- en vertrouwenslagen ontbreken niet; en bekende tijdelijke onderdelen vertekenen het oordeel over het geheel niet meer. Resterende punten mogen verfijningen zijn, maar geen ontbrekende hoofdstukken.
- **Validatiegrens:** Vóór Experience GO zijn praktijkgesprekken, observaties, brononderzoek en gerichte beoordeling van afzonderlijke onderdelen toegestaan en gewenst. Er wordt nog geen algemeen oordeel gevraagd over de Experience als geheel en vroege bevindingen worden niet als bewijs voor de totale ervaring gebruikt.
- **Menselijke grens:** Atlas en Codex mogen voor beide grenzen een onderbouwde kandidaatbeoordeling voorbereiden. Donovan of de verantwoordelijke menselijke eigenaar bevestigt Production GO en Experience GO afzonderlijk.
- **Gevolg:** Iedere toekomstige Atlas Experience maakt expliciet zichtbaar voor welk GO-moment zij wordt beoordeeld. Releasegereedheid en ervaringsgereedheid kunnen daardoor niet meer stilzwijgend met elkaar worden verwisseld.
- **Scope:** Dit besluit geldt generiek voor iedere toekomstige Atlas Experience en is niet beperkt tot de We Build And Design-website of Sprint 005.

## D-013 — Modules zijn de werkvorm; connectoren verbinden externe systemen

- **Datum:** 2026-08-05
- **Status:** Bevestigde WBD-bedrijfsrichting na afronding van Project 001B; geen promotie naar de Atlas Foundation en geen GO voor een volgende uitvoering.
- **Aanleiding:** De factuurworkflow is binnen de centrale WBD Workspace voor het eerst praktisch gebruikt. Daarmee is zichtbaar geworden welk onderscheid de groei van de Workspace nodig heeft.
- **Keuze:** Een module is een afzonderlijk bruikbare werkvorm binnen de WBD Workspace. Een connector verbindt zo'n werkvorm met een extern systeem en is geen zelfstandig doel. WBD wil bewezen modules later afzonderlijk commercieel kunnen aanbieden.
- **Prijsgrens:** Een prijs voor een ontwikkelpartner is niet automatisch een marktprijs. Een toekomstig Value & Pricing Framework moet waarde, doelgroep, bewijs, leveringsvorm, ondersteuning en prijsstelling afzonderlijk toetsen voordat een commerciële moduleprijs wordt vastgesteld.
- **Gevolg:** Na GO / Afgerond op de Atlas Workspace Sync is Experience Polish de actieve werkstroom. Project 002 blijft de fase hierna. Deze beslissing bouwt geen connector, module, prijsmodel of Sportpaleis-functionaliteit en activeert geen Horizon-item.

## D-014 — Home is regie; Organization is contextuele diepte

- **Datum:** 2026-08-16
- **Status:** Roadmapbesluit uit Human Review van `WBD-HISTORICAL-BOOTSTRAP-HUMAN-CORRECTION-V0.1`; geen implementatie-GO.
- **Keuze:** Home blijft de compacte owner-regielaag. Een Organization wordt later onderzocht als primaire contextdrager voor actuele betekenis, aandacht, relatie, bewezen levering, capabilities, service commitments, verantwoordelijkheid, opportunities, recurring effort en relevante evidence/besluiten.
- **Menselijke ingang:** De eerste vraag is wat er bij de organisatie speelt, wat aandacht vraagt en wat voor Donovan relevant is. Historische of technische diepte volgt daarna. Dit is geen CRM en geen lange databasepagina met een modulemenu.
- **Bronbezit:** Organization centraliseert betekenis en context, niet noodzakelijk ruwe brondata. Specialistische systemen blijven waar passend authoritative source. Verantwoordelijkheid, MRR, resultaat of opportunity worden nooit zonder bewijs afgeleid.
- **Workspace-A-hypothese:** Generieke geschiktheid mag pas worden beoordeeld na bewijsvolgorde WBD-dogfood → Sport 2000 Sportpaleis → BijCees/AquaFlask → bij voorkeur een ander bedrijfstype.
- **Atlasrelatie:** Organization Context wordt later een read-context: Atlas leest bevestigde waarheid, combineert die met capabilities/evidence/source health, adviseert, en alleen human-approved promotion wijzigt de canonieke Workspace.
- **Grens:** Geen Organization Depth-, Atlas-connector- of Workspace-A-build binnen dit besluit.

## D-015 — Technische bronstatus is niet automatisch Donovan-needed

- **Datum:** 2026-08-16
- **Status:** Roadmapbesluit uit dezelfde Human Review; geen implementatie-GO.
- **Keuze:** Technische termen zoals `SOURCE BLOCKER`, severity, coverage en source-health worden niet prominent als menselijke Owner Action gepresenteerd. Een bronprobleem wordt pas Donovan-needed wanneer Donovan werkelijk iets moet beslissen of uitvoeren.
- **Menselijke taal:** Workspace toont eerst betekenis, bijvoorbeeld “Bedrijfsinformatie nog niet volledig bekend” of “We kunnen hierover nog geen betrouwbare conclusie geven”. Technische details blijven secundair beschikbaar achter “Waarom?” of “Technische details”.
- **Grens:** Geen Human Attention-polish binnen dit besluit. De bestaande release wordt alleen aangepast wanneer een echte productieblocker afzonderlijk wordt vastgesteld en goedgekeurd.
- **Capaciteit:** Na sluiting van de huidige release-lijn geldt deze week WBD/Atlas BUILD STOP; resterende capaciteit is gereserveerd voor BijCees/AquaFlask — actuele werkelijkheid en commerciële voorbereiding.
