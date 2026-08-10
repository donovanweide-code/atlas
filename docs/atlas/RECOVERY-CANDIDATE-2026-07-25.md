# Atlas Recovery Candidate — 25 juli 2026

> **Status:** Recovery Candidate — niet canoniek, niet besloten en niet geïmplementeerd  
> **Doel:** repository-gedragen inventarisatie ter beoordeling door Donovan  
> **Grens:** dit document wijzigt geen Foundation, Decision, case, Workspace, prioriteit of functionaliteit

## Onderzoeksbasis en bewijsgrens

Deze candidate is gebaseerd op de aantoonbare inhoud van de huidige repository en werkboom op commit `e6937fe105e1b13f9ccf4a1c9b428b28b3d8df7f`.

Onderzocht zijn:

- `Foundation.md` en de toegangspunten in `docs/atlas/`;
- `PRINCIPLES.md`, `DECISIONS.md`, `ATLAS_WORKFLOW.md` en `ATLAS_LOGBOOK.md`;
- Sprint 001A–001F en Sprint 002;
- beide geregistreerde casedossiers en het Case 0001-snapshot;
- de oudere Project Bible, ideeën, toekomstige WordPress-richting en documentatiestandaard;
- de publieke Experience, Workspace, Atlas Lab, Waarnemen, Understanding, opslagmodellen, tests en public-buildgrens;
- het designcorpus, Creative Direction, ontwerpbesluiten, tickets, Vision Boards en assetadministratie;
- vermeldingen van Bij Cees, Recovery, monitoring, live verbindingen, Research en Trust.

Gesprekken en eerdere overdrachten zijn niet als repositoryfeit gebruikt. Alleen het in de huidige opdracht expliciet aangeleverde principe is als gesprek-only Recovery Candidate opgenomen. Er is geen afzonderlijk, tracked Recovery-startdocument of bestaand Atlas Register aangetroffen. Deze inventaris kan daarom repositoryvolledig zijn, maar niet aantoonbaar gespreksvolledig.

De bestaande niet-gerelateerde lokale wijzigingen zijn alleen als werkboomwerkelijkheid gelezen en niet gewijzigd:

- gewijzigd: `website/src/atlas-understanding.ts`;
- untracked: twee sprintlogbestanden, `plugins/` en `website/.codex-tmp/`.

De 29 bestaande tests slagen in de huidige werkboom. Dat bewijst de actuele lokale codecombinatie, niet een volledig schone test van alleen `HEAD`, omdat `atlas-understanding.ts` lokaal gewijzigd is.

## Statuswoorden in deze candidate

- **Canoniek:** vastgelegd in `Foundation.md`, de enige bron van waarheid.
- **Besloten:** herleidbaar besluit in `docs/atlas/DECISIONS.md`, ondergeschikt aan de Foundation.
- **Geïmplementeerd — lokaal:** aanwezig en bruikbaar in de ontwikkeltoepassing, zonder live of gedeelde verbinding.
- **Geïmplementeerd — publiek:** aanwezig in de publieke Vite-build.
- **Candidate:** voorstel of inzicht zonder definitieve canonieke status.
- **Horizon:** bewust bewaarde toekomstige richting met reden of terugkeertrigger.
- **Open vraag:** nog niet voldoende beslist of bewezen.
- **Mogelijk verouderd:** een bron beschrijft aantoonbaar een oudere toestand of mist actuele statusmarkering.
- **Ontbrekend in de repository:** niet duurzaam als eigen object, methodeonderdeel of bron aanwezig.

Eén onderwerp kan meerdere statussen tegelijk dragen. Een methode kan bijvoorbeeld canoniek zijn, lokaal gedeeltelijk geïmplementeerd en technisch nog onvolledig.

# 1. Executive summary

Atlas heeft een relatief volwassen methodische kern, maar een veel smallere operationele werkelijkheid.

Canoniek bestaan één Foundation, 23 principes, een menselijk begrensde verantwoordelijkheidsverdeling, Kennis–Begrip–Interface, Focus–Horizon–Stilte, Waarnemen, Oriëntatie, de caselevenscyclus en herleidbaar redactioneel oordeel. Decisions D-001 tot en met D-011 vertalen delen daarvan naar concrete werkafspraken.

De huidige software is een lokale Vite-ontwikkeltoepassing. De Workspace en Atlas Lab zijn lokaal beschikbaar op `/atlas` en `/atlas-lab`, gebruiken versiegebonden `localStorage` en worden bewust uit de publieke productiebuild gehouden. Er is geen database, authenticatie, synchronisatie, back-up, monitoring, analytics of live klantverbinding. De publieke Experience is wél geïmplementeerd en heeft een technische controle die interne Atlas-inhoud uit de publieke build weert.

De casewerkelijkheid is beperkt:

- Case 0001, We Build And Design, is actief. Snapshot revision 2 is Candidate en voedt de Workspace daarom terecht niet.
- Case 0002, AquaFlask, is in onderzoek en heeft een dossier en lokaal bedrijfsprofiel, maar geen `CASE-SNAPSHOT`.
- Bij Cees is in de methodegeschiedenis genoemd als aanleiding voor Oriëntatie, maar bestaat niet als Oriëntatiesignaal, case-identiteit of casebeeld.

De belangrijkste discrepantie is dat de nieuwe caselevenscyclus methodisch wel canoniek is, maar technisch en administratief nog niet wordt gedragen. De code kent alleen hardgecodeerde cases `0001` en `0002`; er bestaat geen case-register, Oriëntatieopslag of generieke snapshotbron. Het Kompas kan bovendien een vrije dagfocus of lokale AquaFlask-vervolgstap vóór laten gaan zonder de volledige canonieke onderbouwing van focusbesluit, geldigheid en redactionele reden duurzaam vast te leggen.

De documentatie bevat daarnaast meerdere tijdlagen zonder eenduidige status:

- de actuele Foundation;
- operationele Atlas-documentatie;
- een oudere Project Bible;
- een uitgebreid designcorpus dat deels zegt te beschrijven “hoe Atlas denkt”;
- sprint- en handoffteksten die soms nog een oude werkboomtoestand beschrijven;
- vier lege idee-documenten;
- een lege documentatiestandaard;
- een toekomstige WordPress-architectuur zonder formele status.

De Recovery bevestigt daarmee het oorspronkelijke vermoeden: Atlas mist vooral een eenvoudig, duurzaam overzicht van gezag, realisatie en aandacht. Een later Register moet die bronnen niet kopiëren of vervangen, maar uitsluitend indexeren en hun status expliciet maken.

# 2. Geordende inventaris

## R-001 — Canonieke Foundation

- **Domein:** visie, methode, principes en governance.
- **Huidige status:** Canoniek.
- **Betekenis:** `Foundation.md` is aantoonbaar de enige bron van waarheid en bevat de huidige definitie van Atlas.
- **Bronnen:** `Foundation.md`; `docs/atlas/FOUNDATION.md`; `docs/atlas/README.md`; D-001 in `docs/atlas/DECISIONS.md`.
- **Aantoonbaar besloten:** één canonieke Foundation; Atlas is een methode en geen product; Donovan beslist; Atlas begeleidt; Codex denkt, onderzoekt en realiseert binnen begrensd mandaat.
- **Ontbreekt:** een expliciete kaart van welke oudere documenten historisch, afgeleid of nog actief zijn.
- **Voorgestelde volgende stap:** behoud één Foundation en laat een later Register alleen naar canonieke passages verwijzen.
- **Mogelijke terugkeertrigger:** een bron claimt opnieuw zelfstandige filosofische autoriteit of botst inhoudelijk met de Foundation.
- **Mogelijke canonieke bestemming:** Foundation voor fundamentele wijzigingen; anders geen duplicatie.

## R-002 — Atlas Principles en het principegroeiboek

- **Domein:** herbruikbare methodische lessen.
- **Huidige status:** 23 principes Canoniek; vijf entries in `PRINCIPLES.md` Candidate; twee entries Foundation en één entry Decision, waarbij zelfstandige principeformuleringen nog als praktijktoets worden gevolgd.
- **Betekenis:** de repository onderscheidt geldende principes van inzichten die eerst herhaald moeten worden.
- **Bronnen:** hoofdstuk 4 van `Foundation.md`; `docs/atlas/PRINCIPLES.md`; `docs/atlas/ATLAS_PRINCIPLES.md`.
- **Aantoonbaar besloten:** nieuwe fundamentele principes ontstaan niet automatisch uit één sprint; Candidate, Decision en Foundation hebben verschillende rollen.
- **Ontbreekt:** een consequente eindstatus per groeiboekitem nadat het inzicht al via een Decision of Foundation is opgenomen.
- **Voorgestelde volgende stap:** markeer later per groeiboekitem expliciet `Candidate`, `Besloten maar nog in praktijktoets`, `Opgenomen in Foundation` of `Afgesloten`.
- **Mogelijke terugkeertrigger:** een tweede case bevestigt of ontkracht een Candidate, of een Candidate wordt canoniek.
- **Mogelijke canonieke bestemming:** `PRINCIPLES.md` tijdens groei; `DECISIONS.md` bij besluit; Foundation alleen bij fundamentele geldigheid.

## R-003 — Besluitvorming en verantwoordelijkheid

- **Domein:** governance.
- **Huidige status:** Canoniek en Besloten.
- **Betekenis:** Donovan neemt fundamentele en ondernemersbesluiten; Atlas en Codex mogen signaleren, onderbouwen en voorstellen maar niet stilzwijgend de verantwoordelijkheid overnemen.
- **Bronnen:** `Foundation.md`, secties Verantwoordelijkheid en Werkstromen; D-006, D-010 en D-011.
- **Aantoonbaar besloten:** menselijke bevestiging is vereist; GO/NO GO geldt per werkstroom; Codex mag zelfstandig redactionele en technische keuzes voorbereiden binnen Foundation en scope.
- **Ontbreekt:** een algemene vastlegging van wat er gebeurt wanneer Donovan bewust afwijkt van een Atlas-advies.
- **Voorgestelde volgende stap:** beoordeel R-020 voordat een nieuwe formulering wordt toegevoegd.
- **Mogelijke terugkeertrigger:** de eerste bewuste afwijking van een Atlas-aanbeveling die gevolgen heeft voor actuele Focus of casewerkelijkheid.
- **Mogelijke canonieke bestemming:** waarschijnlijk Foundation onder Verantwoordelijkheid of Redactioneel oordeel; mogelijk een begrensde Decision als eerst praktijkbewijs nodig is.

## R-004 — Workflow, dagritme en signaalcontrole

- **Domein:** dagelijks gebruik.
- **Huidige status:** Operationeel gedocumenteerd; Oriëntatiegedeelte Canoniek afgeleid; lokaal gedeeltelijk Geïmplementeerd.
- **Betekenis:** de Workflow vertaalt Focus, maximaal drie stappen, ideeën, logboek en signaalcontrole naar dagelijks gedrag.
- **Bronnen:** `docs/atlas/ATLAS_WORKFLOW.md`; `Foundation.md`.
- **Aantoonbaar besloten:** een praktijksignaal wordt toegewezen, aan de Horizon bewaard of bewust afgesloten; Donovan beslist over case-identiteit.
- **Ontbreekt:** een werkende of repositorygedragen plaats waar een Oriëntatiesignaal zelf kan verblijven.
- **Voorgestelde volgende stap:** pas na Recovery-GO bepalen welk minimaal document- of dataspoor de canonieke workflow werkelijk kan dragen.
- **Mogelijke terugkeertrigger:** het eerstvolgende echte praktijksignaal, zoals de in het logboek genoemde methodetoets.
- **Mogelijke canonieke bestemming:** Workflow voor uitvoering; geen nieuwe Foundation-tekst nodig tenzij de praktijk de methode wijzigt.

## R-005 — Oriëntatie en de caselevenscyclus

- **Domein:** casemethode.
- **Huidige status:** Canoniek en Besloten; niet Geïmplementeerd.
- **Betekenis:** praktijksignaal, Oriëntatie, case-identiteit, case-rijpheid en aandacht zijn gescheiden.
- **Bronnen:** `Foundation.md`, Oriëntatie vóór case-identiteit; D-010; `ATLAS_WORKFLOW.md`; laatste entry in `ATLAS_LOGBOOK.md`.
- **Aantoonbaar besloten:** vier bestemmingen voor een signaal; voorwaarden voor case-ID, eerste snapshot, Kompasleiding, Horizon/Stilte en afsluiting.
- **Ontbreekt:** een duurzaam Oriëntatieobject, een generiek case-overzicht, lifecyclevelden per case en technische validatie van de overgang.
- **Voorgestelde volgende stap:** toets eerst één echt signaal handmatig aan de methode; ontwerp daarna pas de minimale drager.
- **Mogelijke terugkeertrigger:** een nieuw bevestigd praktijksignaal of het expliciete besluit om Bij Cees aan de methode te toetsen.
- **Mogelijke canonieke bestemming:** methode staat al in Foundation; uitvoering hoort later in Workflow, caseformat en eventueel een Decision.

## R-006 — Waarnemen

- **Domein:** praktijkwaarneming vóór beoordeling.
- **Huidige status:** Canoniek als methode; Geïmplementeerd — lokaal voor Case 0001; Candidate als zelfstandig groeiboekprincipe.
- **Betekenis:** een ervaring wordt met bevestigde context en status `unreviewed` bewaard zonder automatische conclusie.
- **Bronnen:** `Foundation.md`; D-008; `docs/atlas/OBSERVATIONS.md`; Sprint 001E; `website/src/atlas-observations.ts`; `website/src/atlas-observe.ts`.
- **Aantoonbaar besloten:** Waarnemen komt vóór Review; een waarneming wordt niet automatisch Understanding.
- **Ontbreekt:** Review, classificatie, promotie naar Understanding, meerdere cases, externe omgevingen en gedeelde opslag.
- **Voorgestelde volgende stap:** geen uitbreiding vóór werkelijk gebruik van de huidige Case 0001-keten de volgende betekenisvolle grens aantoont.
- **Mogelijke terugkeertrigger:** herhaalde waarnemingen die menselijke beoordeling of een tweede case vereisen.
- **Mogelijke canonieke bestemming:** bestaande Foundation en Observations-notitie; later een Decision voor een concrete uitbreiding.

## R-007 — Understanding

- **Domein:** herleidbare betekenisvorming.
- **Huidige status:** Canoniek als methode; Geïmplementeerd — lokaal; implementatienotitie deels Mogelijk verouderd.
- **Betekenis:** bronnen, waarnemingen, vragen, relaties, revisies, inzichten en vervolgstappen kunnen lokaal herleidbaar worden verbonden.
- **Bronnen:** `Foundation.md`; D-005 en D-006; `docs/atlas/UNDERSTANDING_IMPLEMENTATION.md`; `website/src/atlas-understanding.ts`; Workspace en Lab.
- **Aantoonbaar besloten:** één versiegebonden model, menselijke bevestiging, revisiehistorie en read-only Labsignalen.
- **Ontbreekt:** duurzame bron-ID's, export, back-up, samenwerking, vertrouwelijkheidsmodel en verbinding met CASE-SNAPSHOT.
- **Voorgestelde volgende stap:** actualiseer later eerst de status van de implementatienotitie; bepaal daarna of het model nog de kleinste juiste drager is.
- **Mogelijke terugkeertrigger:** een case gebruikt de flow werkelijk, lokaal dataverlies dreigt of een snapshot uit Understanding moet worden samengesteld.
- **Mogelijke canonieke bestemming:** methode in Foundation; technische werkelijkheid in een actuele implementatienotitie en Decisions.

## R-008 — Redactioneel oordeel en Redactionele Intelligentie

- **Domein:** selectie, prioriteit, Horizon en Stilte.
- **Huidige status:** handmatig redactioneel oordeel Canoniek; automatisering en schaalvraag Horizon.
- **Betekenis:** Atlas toont niet alles wat hij weet en moet advies herleidbaar en herzienbaar houden.
- **Bronnen:** `Foundation.md`, Kennis–Begrip–Interface en Redactioneel oordeel; D-007; `docs/ideas/005-Redactionele-Intelligentie.md`.
- **Aantoonbaar besloten:** Focus, Horizon en Stilte; herleidbaar advies; menselijk besluit; geen automatische prioritering als objectieve waarheid.
- **Ontbreekt:** geldigheidsduur, herhaalde-adviespreventie, structurele stalenesscontrole en bewijs over meerdere cases.
- **Voorgestelde volgende stap:** behoud als Horizon; gebruik R-020 als inhoudelijke toets, niet als opdracht tot automatisering.
- **Mogelijke terugkeertrigger:** meerdere cases en voldoende historie tonen terugkerende patronen of verouderde adviezen.
- **Mogelijke canonieke bestemming:** bestaande Foundation voor de methode; Horizon-document voor nog onbewezen intelligentie.

## R-009 — Atlas Workspace

- **Domein:** interne interface.
- **Huidige status:** Besloten; Geïmplementeerd — lokaal; niet onderdeel van de publieke productiebuild.
- **Betekenis:** `/atlas` ondersteunt lokaal Kompas, dagfocus, cases, Waarnemen, Understanding, ideeën en logboek.
- **Bronnen:** D-002, D-003 en D-004; Sprint 001; `website/vite.config.ts`; `website/internal.html`; `website/src/atlas-workspace.ts`; public-buildcontrole.
- **Aantoonbaar besloten:** interne route, lokale opslag, geen publieke navigatielink en `noindex, nofollow`.
- **Ontbreekt:** gedeelde bereikbaarheid, authenticatie, sync, back-up, generieke cases en Oriëntatie.
- **Voorgestelde volgende stap:** geen interfacewijziging; maak in een later Register onderscheid tussen “in broncode”, “lokaal bruikbaar” en “live verbonden”.
- **Mogelijke terugkeertrigger:** dagelijks gebruik toont een concrete beperking of gedeeld gebruik wordt noodzakelijk.
- **Mogelijke canonieke bestemming:** Decisions voor architectuur; implementatiedocument voor actuele techniek.

## R-010 — Kompas en prioritering

- **Domein:** aandacht en handelingsadvies.
- **Huidige status:** Canonieke voorwaarden; Geïmplementeerd — lokaal, maar niet volledig conform de nieuwe lifecycle.
- **Betekenis:** de code kiest achtereenvolgens de eerste onafgeronde dagfocus, een lokale AquaFlask-stap, een Confirmed Case 0001-snapshot of een neutrale veiligheidsmelding.
- **Bronnen:** `Foundation.md`, Aandacht en Redactioneel oordeel; Sprint 001F; `website/src/atlas-case-guidance.ts`.
- **Aantoonbaar besloten:** een leidende case vereist expliciete actuele focus, uitlegbare reden en één bruikbare stap; een inhoudelijke conclusie vereist een Confirmed casebeeld.
- **Ontbreekt:** duurzame focusbesluitmetadata, geldigheidsduur, bewijsgrond en registratie van bewuste afwijking. Een vrije dagfocus of AquaFlask-`nextStep` kan nu leidend worden zonder volledige lifecyclecontrole.
- **Voorgestelde volgende stap:** eerst methodisch bepalen welke minimale gegevens een focusbesluit bewijzen; pas daarna technische aanpassing overwegen.
- **Mogelijke terugkeertrigger:** het eerstvolgende Kompasadvies dat niet alleen uit vrije lokale invoer mag volgen.
- **Mogelijke canonieke bestemming:** methode staat al in Foundation; concrete selectievolgorde later als Decision en implementatienotitie.

## R-011 — Lokale opslag en gegevensrisico

- **Domein:** technische architectuur en vertrouwelijkheid.
- **Huidige status:** Besloten en Geïmplementeerd — lokaal; bewust tijdelijk.
- **Betekenis:** Focus, AquaFlask, ideeën, logboek, Understanding en Waarnemen hebben afzonderlijke versiegebonden `localStorage`-sleutels.
- **Bronnen:** D-003; Sprint 001; `atlas-workspace-data.ts`; `atlas-understanding.ts`; `atlas-observations.ts`.
- **Aantoonbaar besloten:** eerst lokaal valideren, geen vertrouwelijke klantdata op een publieke ongeauthenticeerde route.
- **Ontbreekt:** één actueel besluit dat de later toegevoegde opslagdomeinen volledig opsomt; export, back-up, synchronisatie, retentie en herstel.
- **Voorgestelde volgende stap:** niets migreren zonder aantoonbaar dagelijks gebruik of verliesrisico; actualiseer later wel de architectuurbeschrijving.
- **Mogelijke terugkeertrigger:** apparaatwissel, samenwerking, echte vertrouwelijke context of een tweede actieve gebruiker.
- **Mogelijke canonieke bestemming:** Decision voor opslagarchitectuur; geen Foundation-uitbreiding nodig.

## R-012 — Case 0001: We Build And Design

- **Domein:** hoofdcase en publieke propositie.
- **Huidige status:** case Actief; technisch en redactioneel uitgebreid gedocumenteerd; snapshot revision 2 Candidate.
- **Betekenis:** WBD is de eigen praktijkcase waarin websitepropositie, publieke Experience en Atlas-methode worden getoetst.
- **Bronnen:** `clients/0001-we-build-and-design/CASE.md`, `CASE-SNAPSHOT.json`, oorsprong, identiteit, publieke gegevens en Experience-audit.
- **Aantoonbaar besloten:** website is de bewezen publieke dienst; Atlas blijft interne methode; productie, DNS, WordPress en database vereisen afzonderlijke besluiten.
- **Ontbreekt:** Confirmed snapshot; menselijk ervaringsbewijs; onafhankelijk klantbewijs; end-to-end bevestiging van het publieke contactkanaal; geïsoleerde herstelproef.
- **Voorgestelde volgende stap:** eerst beslissen of snapshot revision 2 inhoudelijk kan worden bevestigd, herzien of ingetrokken; geen automatische Workspacepromotie.
- **Mogelijke terugkeertrigger:** redactionele review van de Candidate of nieuwe bronwerkelijkheid.
- **Mogelijke canonieke bestemming:** feiten in het casedossier; actueel oordeel in CASE-SNAPSHOT; generieke lessen elders pas na herhaling.

## R-013 — Case 0002: AquaFlask

- **Domein:** klantcase en WooCommerce-incident.
- **Huidige status:** In onderzoek; lokaal profiel Geïmplementeerd; geen snapshot.
- **Betekenis:** de oorspronkelijke productfout is niet gereproduceerd; wachten op herhaling en volledige incidentcontext is de aantoonbare aanbeveling.
- **Bronnen:** `clients/0002-aquaflask/CASE.md`; incidentnotitie; `website/src/atlas-aquaflask-profile.ts`.
- **Aantoonbaar besloten:** geen oorzaak of oplossing verzinnen; onderhoudskansen blijven gescheiden van de actieve melding; wijzigingen vragen test- en herstelroute.
- **Ontbreekt:** oorspronkelijke databasebron in de checkout; actuele live waarheid; volledige foutcontext; CASE-SNAPSHOT en expliciet aandachtsoordeel volgens de nieuwe lifecycle.
- **Voorgestelde volgende stap:** wacht op een concrete herhaling en leg dan tijdstip, rol, producttype, stappen en foutmelding vast.
- **Mogelijke terugkeertrigger:** reproduceerbare fout, nieuwe actuele bron of expliciete prioriteitswijziging.
- **Mogelijke canonieke bestemming:** casedossier en later eventueel CASE-SNAPSHOT; herbruikbare les pas na bevestiging.

## R-014 — Bij Cees

- **Domein:** mogelijk praktijksignaal of toekomstige case.
- **Huidige status:** Ontbrekend als duurzaam praktijkobject; alleen genoemd als methodische aanleiding en scopegrens.
- **Betekenis:** de naam maakte aantoonbaar zichtbaar waarom Oriëntatie nodig was, maar de repository bevat geen vastgelegde bron, context, eigenaar, betekenis, toewijzingsvraag of terugkeertrigger.
- **Bronnen:** D-010; `docs/atlas/PRINCIPLES.md`; één scopevermelding in Case 0001.
- **Aantoonbaar besloten:** Bij Cees is door D-010 uitdrukkelijk niet als case geregistreerd en kreeg geen ID of snapshot.
- **Ontbreekt:** alles wat nodig is om het als werkelijk Oriëntatiesignaal te beoordelen.
- **Voorgestelde volgende stap:** pas na afzonderlijke GO de werkelijke broncontext verzamelen en aan de generieke methode toetsen.
- **Mogelijke terugkeertrigger:** Donovan besluit de praktijkwerkelijkheid van Bij Cees formeel te beoordelen.
- **Mogelijke canonieke bestemming:** eerst een toekomstige Oriëntatiedrager; alleen na menselijke casebeoordeling een casedossier.

## R-015 — CASE-SNAPSHOT en case-rijpheid

- **Domein:** actueel redactioneel casebeeld.
- **Huidige status:** methode Canoniek; parser en veiligheidsgrens Geïmplementeerd — lokaal; bron alleen voor Case 0001.
- **Betekenis:** alleen een geldige Confirmed revision mag de Workspace inhoudelijk voeden.
- **Bronnen:** `docs/atlas/README.md`; Foundation; `atlas-case-snapshot.ts`; `atlas-case-snapshot-source.ts`; Case 0001 snapshot en tests.
- **Aantoonbaar besloten:** Candidate blijft buiten de interface; confirmed metadata en bronvaliditeit zijn vereist; geen oude inhoudelijke fallback.
- **Ontbreekt:** generieke snapshotontdekking, snapshots voor andere cases, lifecycleoverzicht en een formele redactionele reviewhandeling.
- **Voorgestelde volgende stap:** bevestig eerst de methode in één werkelijk caseverloop voordat een generiek mechanisme wordt ontworpen.
- **Mogelijke terugkeertrigger:** Candidate review van Case 0001 of eerste snapshotbehoefte bij een andere case.
- **Mogelijke canonieke bestemming:** casebestanden voor inhoud; Decision voor generieke technische werking.

## R-016 — Publieke Experience en publicatiegrens

- **Domein:** publieke website.
- **Huidige status:** Geïmplementeerd — publiek; inhoudelijk begrensd door Case 0001 en D-009.
- **Betekenis:** de website presenteert professionele eerste websites en laat Atlas als werkwijze ervaren zonder Atlas als product te verkopen.
- **Bronnen:** D-009; Sprint 001D en Sprint 002; Case 0001-audit; `website/src/main.ts`; `public-pages.ts`; `verify-public-build.mjs`.
- **Aantoonbaar besloten:** publieke website is de ingang; interne Workspace, case-inhoud, AquaFlask, localStorage en sprintcontext mogen niet in de productiebuild lekken.
- **Ontbreekt:** repositorygedragen live monitoring, actueel deploymentbewijs, menselijk ervaringsbewijs en eerste publiek projectbewijs.
- **Voorgestelde volgende stap:** geen nieuwe publieke implementatie in Recovery; later alleen reageren op nieuw bewijs of expliciete review.
- **Mogelijke terugkeertrigger:** nieuwe publicatie, gebruikersreview, bevestigd projectbewijs of wijziging van de publieke propositie.
- **Mogelijke canonieke bestemming:** case- en sprintdocumentatie; publieke code; Foundation alleen als de propositie fundamenteel verandert.

## R-017 — Design System, World Engine en Creative Direction

- **Domein:** visuele en ervaringsarchitectuur.
- **Huidige status:** uitgebreid gedocumenteerd en grotendeels Geïmplementeerd; interne statushiërarchie onduidelijk.
- **Betekenis:** World Laws, Visual Genome, Experience Rhythm, Scene Library, één gouden route en Atlas Studio sturen de publieke visuele wereld.
- **Bronnen:** `website/design/README.md`; Decisions 001–016 in `website/design/08-Decisions.md`; Ticket 012; Experience Review; Asset Manifest; `Creative-Direction/Hero-Evolution/README.md`; scene- en stylecode.
- **Aantoonbaar besloten:** echte landschappen leiden; één route; kompas in Scene 009; configuratiegestuurde scenes; Hero v03 heet actuele officiële Creative Reference.
- **Ontbreekt:** formele verhouding tussen Foundation, designbesluiten, “vaste” World Laws, actieve Visual Language en Creative Reference; status of supersessie voor oudere tickets.
- **Voorgestelde volgende stap:** maak later een autoriteitskaart, geen nieuwe designlaag. Designbronnen mogen de Foundation toepassen maar niet als tweede Atlas-filosofie functioneren.
- **Mogelijke terugkeertrigger:** een visueel besluit botst met Foundation of twee documenten claimen tegelijk de hoogste visuele waarheid.
- **Mogelijke canonieke bestemming:** designcorpus voor visuele regels; een begrensde Decision voor de autoriteitsverhouding indien nodig.

## R-018 — Ideeën en Horizon

- **Domein:** toekomstige mogelijkheden.
- **Huidige status:** idee 005 expliciet Horizon; ideeën 001–004 zijn lege placeholders; Workspace-ideeën bestaan alleen lokaal.
- **Betekenis:** namen als WBD Audit Framework, Client Portal, AI Assistent en Subscription Model bestaan als bestand, maar zonder aantoonbare betekenis, status of trigger.
- **Bronnen:** `docs/ideas/001-...` tot en met `005-Redactionele-Intelligentie.md`; lokale ideeënfunctie in de Workspace.
- **Aantoonbaar besloten:** alleen Redactionele Intelligentie heeft een expliciete Horizonstatus, grens en trigger.
- **Ontbreekt:** inhoud en status voor 001–004; koppeling tussen repository-ideeën en lokale Workspace-ideeën; eigenaarschap en terugkeertrigger.
- **Voorgestelde volgende stap:** behandel lege bestanden niet als inhoudelijk bestaand. Beoordeel later per naam: herstellen uit aantoonbare bron, als open vraag registreren of bewust afsluiten.
- **Mogelijke terugkeertrigger:** een echte case rechtvaardigt één idee of een betrouwbare bron voor de ontbrekende inhoud wordt gevonden.
- **Mogelijke canonieke bestemming:** ideeën/Horizon; pas bij een besluit naar Decision of sprint.

## R-019 — WordPress Execution Foundation

- **Domein:** toekomstige gecontroleerde uitvoering.
- **Huidige status:** richting/Horizon op basis van maplocatie en inhoud; niet formeel gelabeld of besloten; niet geïmplementeerd.
- **Betekenis:** beschrijft een mogelijke veilige straat met staging, back-up, tests, goedkeuring, deployment en rollback.
- **Bronnen:** `website/docs/future/atlas-wordpress-execution-foundation.md`; WordPress-profieltemplate.
- **Aantoonbaar besloten:** alleen de algemene Foundationgrenzen rond risico, menselijke goedkeuring en herstelbaarheid zijn canoniek. De specifieke uitvoeringstraat is geen Decision.
- **Ontbreekt:** formele status, actuele praktijkcase, technische verbindingen, credentialsmodel, omgeving en acceptatiebesluit.
- **Voorgestelde volgende stap:** expliciet als Candidate of Horizon labelen wanneer dit document opnieuw aandacht krijgt; niet vooraf bouwen.
- **Mogelijke terugkeertrigger:** een echte WordPress-case vereist herhaalbare uitvoering en staging.
- **Mogelijke canonieke bestemming:** eerst Decision plus projectspecifieke technische documentatie; niet automatisch Foundation.

## R-020 — Recovery Candidate: “Atlas overtuigt niet. Atlas onderbouwt.”

- **Domein:** adviseringsethiek, eigenaarschap en prioritering.
- **Huidige status:** Candidate — nieuw fundamenteel principe; exacte formulering Ontbrekend in de repository.
- **Betekenis:** Atlas geeft controleerbare grond voor een keuze, terwijl de ondernemer de keuze bezit en bewust anders mag beslissen.
- **Bronnen met aantoonbare overlap:** Foundationprincipes 4 en 5; Verantwoordelijkheid; Aandacht; Redactioneel oordeel; D-006; D-007; D-010; Sprint 001F; Redactionele Intelligentie.
- **Aantoonbaar al aanwezig:**
  - de ondernemer draagt en neemt de keuze zelf;
  - Atlas beslist niet zelfstandig wat waar of belangrijk is;
  - een Kompasprioriteit moet uitlegbaar zijn;
  - advies blijft herleidbaar naar bronnen, risico's, besluiten en onzekerheden;
  - automatische prioritering mag niet als objectieve waarheid worden gepresenteerd.
- **Nog niet algemeen vastgelegd:** een bewuste afwijking van advies blijft geldig, wordt niet als fout teruggedraaid en wordt als actuele werkelijkheid met reden en gevolg bewaard.
- **Voorgestelde volgende stap:** voeg nu geen los nieuw principe toe. Onderzoek na review of één aanscherping onder Verantwoordelijkheid of Redactioneel oordeel de ontbrekende afwijkingsregel kan dragen. Houd de slogan eventueel als kandidaatkop, omdat “overtuigen” in de bestaande Foundation ook een publieke verkoopbetekenis heeft.
- **Mogelijke terugkeertrigger:** een echte situatie waarin Donovan of een ondernemer bewust van een onderbouwd Atlas-advies afwijkt.
- **Mogelijke canonieke bestemming:** waarschijnlijk Foundation onder Verantwoordelijkheid/Redactioneel oordeel; alleen als zelfstandig principe wanneer praktijkherhaling aantoont dat het meer is dan een precisering.

### Gevolgen van R-020 voor later, nog niet voor implementatie

Een eventuele latere vertaling naar Workspace en prioritering zou minimaal onderscheid moeten bewaren tussen:

1. wat Atlas aanbeveelt en waarom;
2. wat Donovan of de ondernemer daadwerkelijk besluit;
3. wanneer en op basis van welke werkelijkheid dat besluit geldt;
4. welke bewuste afwijking is gekozen;
5. welk gevolg die afwijking heeft voor actuele Focus en een volgend advies.

Zonder dat onderscheid kan Atlas een oude aanbeveling blijven herhalen, een menselijke keuze stilzwijgend overschrijven of achteraf doen alsof de gekozen route zijn eigen advies was.

## R-021 — Research en bewijs

- **Domein:** onderzoek.
- **Huidige status:** methodisch aanwezig; geen zelfstandig Research-domein of systeem.
- **Betekenis:** Foundation, Sprint 002, cases en audits tonen een duidelijke onderzoeksmethode met bron, waarneming, betrouwbaarheid, betekenis, onzekerheid en gericht vervolgonderzoek.
- **Bronnen:** Foundationprincipes 19–23; Sprint 002; Case 0001-audit; AquaFlask-incident; Understanding.
- **Aantoonbaar besloten:** onderzoek gaat vóór onbewezen advies; ontbrekende kennis blijft onbekend; productie wordt niet gewijzigd om bewijs te verzamelen.
- **Ontbreekt:** een centrale Research-status, onderzoeksregister, bronretentiebeleid of generiek bewijsobject buiten cases en sprints.
- **Voorgestelde volgende stap:** voeg geen nieuw Research-systeem toe zolang case- en sprintbronnen voldoende zijn; registreer in een later Register alleen waar het onderzoek staat.
- **Mogelijke terugkeertrigger:** onderzoek loopt over meerdere cases, bronnen raken onvindbaar of dezelfde bewijsstructuur wordt herhaald.
- **Mogelijke canonieke bestemming:** Foundation voor methode; cases/sprints voor bewijs; eventueel later een operationeel format.

## R-022 — Trust

- **Domein:** vertrouwen en publieke ervaring.
- **Huidige status:** Canoniek als gewenste uitkomst en ontwerpbetekenis; geen zelfstandig Trust-domein.
- **Betekenis:** vertrouwen ontstaat in Atlas uit begrip, gedragen keuzes, persoonlijke bereikbaarheid, rust en controleerbare uitvoering.
- **Bronnen:** Foundation; WBD-identiteit en oorsprong; Experience-audit; designcorpus en publieke Experience.
- **Aantoonbaar besloten:** verbinden vóór overtuigen; de ondernemer draagt de keuze; vertrouwen is onderdeel van de methodische en creatieve beweging.
- **Ontbreekt:** bewijs dat “Trust” een aparte capability, architectuurlaag, metriek of werkstroom moet zijn.
- **Voorgestelde volgende stap:** behandel Trust voorlopig als uitkomst en toets, niet als zelfstandig systeem.
- **Mogelijke terugkeertrigger:** herhaalde cases tonen een eigen, meetbaar vertrouwensvraagstuk dat niet door bestaande methode en bewijs wordt gedragen.
- **Mogelijke canonieke bestemming:** bestaande Foundation en casebewijs; geen nieuw domein zonder praktijkgrond.

## R-023 — Monitoring en live verbindingen

- **Domein:** operationele techniek.
- **Huidige status:** bewust niet gebouwd; Ontbrekend als actuele verbinding.
- **Betekenis:** de repository kent openbare brononderzoeken en historische preview-/hostingfeiten, maar geen continue monitoring of live API-, hosting-, WordPress-, Search Console-, GitHub-, analytics- of databasekoppeling.
- **Bronnen:** grenzen in Sprint 001 en Sprint 002; AquaFlask-brongrens; toekomstige WordPress-richting; public-buildcode.
- **Aantoonbaar besloten:** geen automatische monitoring, alerts of live productiehandelingen in de uitgevoerde sprints.
- **Ontbreekt:** verbindingseigenaar, credentials, laatste succesvolle controle, foutstatus, datagrens en herautorisatieproces.
- **Voorgestelde volgende stap:** registreer later alleen concrete verbindingen die werkelijk bestaan; presenteer repositoryclaims nooit als live status.
- **Mogelijke terugkeertrigger:** een echte case vereist actuele externe werkelijkheid die handmatig onderzoek niet verantwoord kan dragen.
- **Mogelijke canonieke bestemming:** technische Decision en projectspecifieke configuratiedocumentatie; geheimen nooit in Markdown.

## R-024 — Sprints, logboek en historische overdrachten

- **Domein:** werkgeschiedenis.
- **Huidige status:** deels Besloten en afgerond; meerdere passages Mogelijk verouderd.
- **Betekenis:** Sprint 001 bevat zes fasen in één groeiend document; Sprint 002 bevat bewijsrondes en afsluiting; het Logboek bewaart slechts een selectie van betekenisvolle momenten.
- **Bronnen:** beide sprintdocumenten; `ATLAS_LOGBOOK.md`; Gitgeschiedenis.
- **Aantoonbaar besloten:** 001C en 001F hebben GO; Sprint 002 is afgerond; meerdere bewuste grenzen zijn vastgelegd.
- **Ontbreekt of verouderd:** 001D zegt nog dat gebruikersreview vereist is terwijl D-009 een latere GO noemt; 001E heeft geen expliciet GO; oude handoffpassages beschrijven niet meer de huidige werkboom; Sprint 002 noemt aan het slot een toen nog ongecommitteerde Candidate die inmiddels gecommit is.
- **Voorgestelde volgende stap:** herschrijf de historie niet. Markeer later per fase een korte actuele eindstatus en label handoffmomenten als historische momentopname.
- **Mogelijke terugkeertrigger:** een sprintstatus wordt gebruikt om nieuwe scope of implementatietoestand af te leiden.
- **Mogelijke canonieke bestemming:** sprintdocumenten en Logboek; besluiten in Decisions.

## R-025 — Project Bible, documentatiestandaard en documenthiërarchie

- **Domein:** documentgovernance.
- **Huidige status:** Project Bible inhoudelijk ouder en Mogelijk verouderd; documentatiestandaard leeg; hiërarchie deels besloten.
- **Betekenis:** de Project Bible bevat vroege missie-, methode- en identiteitsformuleringen die deels overlappen en deels breder zijn dan de actuele Foundation.
- **Bronnen:** `docs/project-bible/00-03`; lege `docs/standards/00-Documentation-Standard.md`; D-001; root README.
- **Aantoonbaar besloten:** bij conflict wint de Foundation.
- **Ontbreekt:** expliciete labels “historisch”, “vervangen” of “nog actief”; een werkende documentatiestandaard.
- **Voorgestelde volgende stap:** later de status markeren zonder historische inhoud te verwijderen. Vul de standaard alleen als terugkerende documentproblemen aantoonbaar een norm vereisen.
- **Mogelijke terugkeertrigger:** oude tekst wordt als actuele methode gebruikt of nieuwe documenttypen krijgen opnieuw onduidelijke status.
- **Mogelijke canonieke bestemming:** documentatie-index/standaard; geen kopie van de Foundation.

## R-026 — Recovery, Register en overdrachtsgeheugen

- **Domein:** continuïteit en bestuurbaar overzicht.
- **Huidige status:** Recovery Candidate aanwezig via dit document; Atlas Register Ontbrekend.
- **Betekenis:** de repository heeft inhoudelijke bronnen, maar geen enkel overzicht dat per onderwerp gezag, realisatie, aandacht, afhankelijkheden en terugkeertrigger samenbrengt.
- **Bronnen:** afwezigheid van een tracked Recovery-/Registerbestand; verspreide statusinformatie in alle onderzochte bronnen.
- **Aantoonbaar besloten:** nog geen Register; deze opdracht verbiedt het nu aan te maken.
- **Ontbreekt:** gecontroleerde inventaris van gesprek-only materiaal en een door Donovan goedgekeurde registerset.
- **Voorgestelde volgende stap:** Donovan reviewt eerst deze candidate en vult aantoonbare ontbrekende overdrachtsinhoud aan. Alleen daarna kan een Register als afzonderlijke candidate worden samengesteld.
- **Mogelijke terugkeertrigger:** expliciete GO na Recovery-review.
- **Mogelijke canonieke bestemming:** later `docs/atlas/ATLAS_REGISTER.md` als index, nooit als tweede Foundation of kopie van cases.

## R-027 — Niet-gerelateerde lokale werkboomwijziging

- **Domein:** actuele lokale implementatiewerkelijkheid.
- **Huidige status:** lokaal gewijzigd, niet staged en niet besloten.
- **Betekenis:** `atlas-understanding.ts` importeert lokaal de publieke methodetekst over een eerste professionele website in het gedeelde Understandingmodel.
- **Bronnen:** lokale diff van `website/src/atlas-understanding.ts`; `website/src/public-method.ts`.
- **Aantoonbaar besloten:** niets in de onderzochte Decisions of sprints kent deze wijziging een status toe.
- **Ontbreekt:** herkomst, scope en review. De tekst is WBD-specifiek terwijl Understanding ook AquaFlask bedient.
- **Voorgestelde volgende stap:** buiten deze Recovery onaangeraakt laten en later afzonderlijk door de eigenaar van die wijziging beoordelen.
- **Mogelijke terugkeertrigger:** hervatting van de betreffende lokale werkstroom.
- **Mogelijke canonieke bestemming:** waarschijnlijk implementatie/sprint, niet Foundation, tenzij de gedeelde methodetekst bewust fundamenteel verandert.

# 3. Tegenstrijdigheden en hiaten

## 3.1 Conflicterende of concurrerende formuleringen

1. **Eén Foundation versus meerdere filosofische claims.** D-001 noemt `Foundation.md` de enige bron van waarheid. `website/design/README.md` zegt tegelijk dat de designmap beschrijft “hoe Atlas denkt”, noemt World Laws een vaste toets en verwijst naar een hoogste visuele waarheid. De Project Bible bevat daarnaast oudere missie- en methodeclaims. Dit hoeft inhoudelijk niet te botsen, maar de autoriteitsverhouding is niet zichtbaar genoeg.

2. **Principes eerst in Foundation versus groeien via Candidate.** `ATLAS_PRINCIPLES.md` zegt nieuwe principes eerst aan de Foundation toe te voegen. Het actuele groeiboek en de governance verlangen juist eerst Candidate en Decision. De pointertekst is daarom waarschijnlijk verouderd.

3. **Gedeeld Understandingmodel versus gefragmenteerde case-architectuur.** D-005 spreekt over een gedeeld domeinmodel. In code zijn CaseId, UnderstandingCaseId, Waarnemen en CASE-SNAPSHOT afzonderlijk begrensd; Waarnemen en snapshot ondersteunen alleen Case 0001, terwijl Workspace en Lab twee hardgecodeerde cases kennen.

4. **Canonieke Kompasvoorwaarden versus huidige selectiecode.** De Foundation verlangt expliciete actuele focus, uitlegbare reden en een bruikbare stap. De implementatie gebruikt als hoogste bron de eerste vrije, onafgeronde dagfocus en daarna een lokale AquaFlask-tekst. De reden is afgeleid van lijstpositie of aanwezigheid, niet van een duurzaam redactioneel focusbesluit.

5. **Snapshotdiscipline versus AquaFlask-prioriteit.** Een inhoudelijke conclusie vereist canoniek een Confirmed casebeeld. AquaFlask heeft geen snapshot, maar een lokale `nextStep` kan wel Kompasprioriteit krijgen.

6. **Actuele status versus historische tekst.** Sprint- en handoffpassages noemen oude staged, uncommitted of reviewstatussen zonder overal duidelijk te maken dat het momentopnamen zijn. Case 0001 bevat eveneens vervolgstappen die door latere commits zijn ingehaald.

## 3.2 Ideeën zonder vaste of bruikbare plek

- ideeën 001–004 bestaan alleen als lege bestandsnamen;
- lokale Workspace-ideeën zijn apparaatgebonden en niet gekoppeld aan repository-Horizon;
- Bij Cees is methodisch genoemd, maar niet als Oriëntatiesignaal gedragen;
- de WordPress Execution Foundation staat onder `future`, maar mist expliciete Candidate-/Horizonstatus;
- de nieuwe adviseringsregel bestaat alleen als Recovery Candidate;
- er is geen repositorybron voor de eerder genoemde volledige Recovery uit gesprekken.

## 3.3 Functionaliteit zonder voldoende actuele methodische of bestuurlijke dekking

- lokaal opgeslagen dagfocus kan Kompasleiding veroorzaken zonder duurzaam focusbesluit;
- AquaFlask kan via een vrije lokale vervolgstap leiden zonder snapshot;
- Understanding, Observations en snapshots gebruiken verschillende casebegrenzingen zonder generiek case-register;
- latere lokale opslagdomeinen zijn geïmplementeerd, maar D-003 noemt alleen Focus, ideeën en logboek;
- designbesluiten en tickets hebben geen consistente lifecycle- of supersessiestatus.

## 3.4 Methodiek die technisch nog niet wordt weerspiegeld

- Oriëntatie en `Nog niet toegewezen`;
- generieke case-identiteit en blijvende ID-uitgifte;
- casefase, rijpheid, Horizon-/Stiltereden en terugkeertrigger;
- generieke CASE-SNAPSHOT;
- duurzaam onderscheid tussen Atlas-advies en menselijke beslissing;
- vastlegging van bewuste afwijking als actuele werkelijkheid;
- geldigheidsduur en herziening van Kompasprioriteit;
- overzicht van afhankelijkheden over cases, sprints, ideeën en besluiten.

## 3.5 Repositorywerkelijkheid die afwijkt van mogelijke praktijkverwachting

- de Workspace is lokaal, niet live of gedeeld;
- een publieke preview of historische broncontrole is geen live verbinding;
- de AquaFlask-databasebron is niet aanwezig en niet actueel;
- Case 0001 heeft geen actief Confirmed snapshot;
- Bij Cees is geen case en zelfs nog geen duurzaam Oriëntatieobject;
- Research bestaat als methode en bewijspraktijk, niet als zelfstandig systeem;
- Trust bestaat als uitkomst en ontwerpbetekenis, niet als zelfstandig domein;
- vier genoemde ideeën bevatten geen inhoud;
- de documentatiestandaard is leeg;
- er is geen Atlas Register.

# 4. Aanbevolen registerstructuur

## Ontwerpprincipe

Gebruik niet één overbelast statusveld. De Recovery laat zien dat drie onafhankelijke vragen door elkaar lopen:

1. **Gezag:** wat mogen we als geldend beschouwen?
2. **Realisatie:** in welke werkelijkheid bestaat het?
3. **Aandacht:** waarom vraagt het nu wel of geen aandacht?

Een methode kan canoniek zijn zonder implementatie. Code kan lokaal bestaan zonder besluit. Een Horizon-item kan volledig gedocumenteerd zijn zonder dat het nu gebouwd hoort te worden.

## Minimale velden per registeritem

| Veld | Functie |
| --- | --- |
| `ID` | Stabiele registerverwijzing, los van case-, sprint- en decision-ID's. |
| `Naam` | Herkenbaar onderwerp. |
| `Domein` | Bijvoorbeeld Methode, Case, Interface, Research, Trust, Integratie of Design. |
| `Gezag` | Canoniek, Besloten, Candidate, Horizon, Open, Historisch of Ontbrekend. |
| `Realisatie` | Niet van toepassing, Alleen document, Lokaal, Publiek, Live verbonden of Onbekend. |
| `Bronnen` | Alleen links naar de werkelijke bronbestanden; geen gekopieerde waarheid. |
| `Betekenis` | Waarom dit onderdeel bestaat. |
| `Afhankelijkheden` | Welke besluiten, cases, bronnen of triggers eerst nodig zijn. |
| `Aandacht` | Focus, Horizon of Stilte, inclusief de reden waarom. |
| `Volgende stap` | Eén betekenisvolle stap, of expliciet “geen”. |
| `Terugkeertrigger` | Gebeurtenis die herbeoordeling rechtvaardigt. |
| `Eigenaar` | Wie de volgende beoordeling of beslissing draagt. |
| `Laatst bevestigd` | Datum plus bron van menselijke bevestiging. |

## Wat het Register niet moet worden

- geen tweede Foundation;
- geen kopie van volledige cases, sprints of Decisions;
- geen automatisch geprioriteerde takenlijst;
- geen interfaceontwerp;
- geen opslagplaats voor onbewezen gesprekssamenvattingen;
- geen excuus om verouderde bronbestanden te laten staan zonder status.

## Eenvoudigste documentstructuur

Als Donovan later GO geeft, is één Markdown-index aanvankelijk voldoende:

1. statusdefinities;
2. actieve registeritems;
3. Horizon en Bewuste Stilte;
4. open inconsistenties;
5. afgesloten of historische items;
6. links naar Foundation, Decisions, cases, sprints en implementatiebronnen.

Pas werkelijk gebruik mag aantonen of een dataschema, automatisering of interface nodig wordt.

# 5. Aanbevolen beslisvolgorde na review

Dit is geen uitvoeringsopdracht, maar de kleinste voorgestelde volgorde voor bewuste besluitvorming:

1. Donovan corrigeert feitelijke missers en vult alleen aantoonbare gesprek-only onderwerpen aan.
2. Donovan beslist welke oudere bronnen expliciet historisch of afgeleid zijn.
3. Donovan beoordeelt R-020: precisering van bestaande governance of werkelijk nieuw principe.
4. Donovan bepaalt of deze inventaris voldoende is om een Register-candidate te maken.
5. Pas daarna wordt Bij Cees als werkelijk signaal aan Oriëntatie getoetst.
6. Pas na die praktijktoets wordt beoordeeld welke minimale technische of documentdrager de lifecycle nodig heeft.

Tot die besluiten blijven Foundation, cases, Workspace, Kompas en huidige prioriteiten ongewijzigd.
