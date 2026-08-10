# UX Architecture Implementation Roadmap

**Status:** inhoudelijk afgesloten; geïntegreerde Project 001-releasecandidate gereed  
**Datum:** 5 augustus 2026  
**Reikwijdte:** Experience, WBD Workspace, Atlas Workspace, publieke website en eerste publieke livegang  
**Formele afsluiting:** [`PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md`](PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md)  
**Volgende hoofdopdracht:** Project 002 – Infrastructure Foundation

## 1. Besluitkader

Deze roadmap vertaalt de goedgekeurde review één-op-één naar kleine, zelfstandig uitvoerbare implementatieprojecten. De roadmap voegt geen nieuwe productfunctie, nieuw kanaal of nieuwe technische architectuur toe.

Gezaghebbende bronnen:

1. `ATLAS-WORKSPACE-COMPLETE-UX-ARCHITECTURE-REVIEW-2026-08-05.md`;
2. `WORKSPACE-NAVIGATION-EXPERIENCE-PROPOSAL-V1.md`, voor zover dit voorstel in de complete review is bevestigd.

De codes `UXA-01` tot en met `UXA-12` zijn uitvoeringscodes binnen deze roadmap. Ze zijn bewust geen nieuwe hoofdprojectnummers. `Project 002` blijft uitsluitend gereserveerd voor Infrastructure Foundation.

### Vaste ontwerp- en architectuurgrenzen

- De huidige rustige, crème-georiënteerde design language blijft leidend.
- WBD Workspace blijft de dagelijkse operationele werkomgeving.
- Atlas blijft de omgeving voor aandacht, werkelijkheid, begrip en kennis.
- Experience blijft een eigen menselijke ervaringsroute; Experience wordt niet bereikbaar via Waarnemen.
- `/ervaar` wordt de canonieke Experience-route. Bestaande tokens en sessies blijven werken via `/e/#token`.
- Observaties worden op een oppervlak vastgelegd, in Atlas door een mens beoordeeld en nooit automatisch tot kennis verheven.
- Foundation wordt een leesbare index naar canonieke technische bronnen, geen tweede documentatie- of beheersysteem.
- Aandachtsindicatoren blijven menselijk, subtiel en schaars: maximaal één betekenisvolle indicator per navigatiecluster, zonder traditioneel notificatiecentrum, ongelezen-tellers of realtime badge-infrastructuur.
- Het officiële WBD-logo wordt overal consequent gebruikt.
- Hosting, authenticatieverharding, secrets, mailinfrastructuur, back-ups, monitoring en overige infrastructurele garanties vallen onder Project 002.

## 2. Betekenis van de omvang

- **S:** één begrensd patroon of schermgroep; weinig afhankelijkheden.
- **M:** meerdere routes of componenten binnen één productgebied.
- **L:** een samenhangende gebruikersflow over meerdere lagen, met migratie- en regressierisico.

Een omvang is geen kalenderbelofte. Elk project eindigt met een afzonderlijk toetsbaar resultaat.

## 3. Uitvoerbare projecten

### UXA-01 — Experience: canonieke toegang en routecompatibiliteit

**Doel**  
Maak `/ervaar` de ondubbelzinnige menselijke hoofdingang en behoud bestaande toegang voor geldige tokens en hervatbare sessies.

**Waarom nodig**  
De huidige Experience toont nog verschillende richtingen naast elkaar. Daardoor kan een bezoeker zonder geldige uitnodiging direct in een fouttoestand belanden, terwijl First Visit V2 inhoudelijk de goedgekeurde richting is.

**Wordt aangepast**

- First Visit V2 wordt aangeboden op `/ervaar`;
- `/e/` zonder token verwijst vriendelijk door naar `/ervaar`;
- `/e/#token` blijft werken voor bestaande geldige tokens en sessies;
- `first-visit-v2.html` wordt een tijdelijke compatibiliteitsalias en verwijst uiteindelijk door naar `/ervaar`;
- de context-first variant blijft alleen een intern reviewartefact;
- directe toegang, hervatten, verlopen en ongeldige tokens worden als afzonderlijke toestanden gecontroleerd.

**Bewust buiten scope**

- nieuwe uitnodigingsmechanismen;
- nieuwe authenticatie- of sessiearchitectuur;
- koppeling van Experience aan Waarnemen;
- verwijdering van bestaande geldige tokens of sessies;
- hosting- en beveiligingsverharding.

**Afhankelijkheden:** geen implementatieafhankelijkheid; dit is de eerste routebeslissing.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-02 — Experience: inhoud, privacytaal en legacy-afbouw

**Doel**  
Breng alle zichtbare Experience-tekst en Observatory-taal in lijn met de canonieke, niet-uitnodigingsgerichte Experience.

**Waarom nodig**  
Teksten over een persoonlijke uitnodiging, dezelfde persoonlijke link en het aanvragen van een nieuwe uitnodiging maken een verouderd systeem tot hoofdverhaal. Dat botst met de goedgekeurde toegang via `/ervaar`.

**Wordt aangepast**

- verouderde uitnodigingscopy op publieke Experience-schermen;
- privacytekst die de Experience onnodig als invite-only beschrijft;
- fout- en herstelteksten voor ongeldige of verlopen tokens;
- Observatory-tekst waarin een nieuwe ontmoeting gelijkstaat aan een nieuwe uitnodiging;
- positionering van Observatory als intern onderzoeks-, review- en historisch hulpmiddel;
- taalcontrole op mobiel en desktop, inclusief lege, fout- en hervattoestanden.

**Bewust buiten scope**

- nieuwe Experience-hoofdstukken of contentconcepten;
- automatische observatievorming uit Experience-resultaten;
- verwijdering van historische Observatory-data;
- nieuw redactiesysteem.

**Afhankelijkheden:** UXA-01.  
**Omvang:** S  
**Oplevering:** GO

---

### UXA-03 — Observaties: eigenaarschap, levenscyclus en bronmodel

**Doel**  
Maak de goedgekeurde levenscyclus technisch en inhoudelijk eenduidig: vastleggen op het oppervlak, menselijk beoordelen in Atlas, daarna eventueel betekenis en bevestigde kennis.

**Waarom nodig**  
De huidige implementatie is verspreid over capture, lokale Case 0001/sprint-logica, `/atlas#waarnemen` en Observatory. Zonder één bronmodel blijft onduidelijk wat een ruwe waarneming, beoordeelde observatie, begrip of kennis is.

**Wordt aangepast**

- één begrippen- en statusmodel voor vastlegging, review, betekenis en bevestiging;
- behoud van bron, herkomst, tijd en context;
- verwijdering van hardcoded Case 0001- en sprintaannames uit het algemene pad;
- duidelijke grens tussen observatie, Understanding en Knowledge;
- menselijke toewijzing voordat iets aan een case wordt verbonden;
- bestaande gegevens worden in het model herkenbaar gehouden.

**Bewust buiten scope**

- automatische promotie naar kennis;
- AI-besluitvorming namens de gebruiker;
- nieuwe externe databronnen of connectors;
- een losstaand nieuw Waarnemen-product;
- Experience als observatie-ingang.

**Afhankelijkheden:** de reviewbeslissing is voldoende; UXA-01 en UXA-02 mogen parallel worden uitgevoerd.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-04 — Atlas Reality: menselijke observatiereview

**Doel**  
Maak de bestaande, deels verborgen reviewlaag als rustige werkstroom zichtbaar onder Atlas Reality: `Observaties · nog beoordelen`.

**Waarom nodig**  
Waarnemen is nu zichtbaar zonder dat de belangrijkste menselijke handeling — beoordelen wat de waarneming betekent — volwaardig zichtbaar is. Daardoor lijkt vastleggen belangrijker dan duiden.

**Wordt aangepast**

- een rustige reviewwachtrij binnen Reality;
- bestaande goedgekeurde reviewuitkomsten en menselijke beslismomenten;
- doorklik naar bron en context;
- expliciete overgang naar Understanding of een bevestigde vervolgstap;
- lege, afgeronde en onduidelijke toestanden;
- responsive en toegankelijke bediening.

**Bewust buiten scope**

- notificatiecentrum of realtime ongelezen-status;
- automatische classificatie of kennispublicatie;
- nieuwe capturekanalen;
- herintroductie van een zelfstandige observatiepagina buiten Atlas;
- nieuwe Experience-functionaliteit.

**Afhankelijkheden:** UXA-03.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-05 — Atlas: informatiearchitectuur en terminologie

**Doel**  
Orden Atlas volgens de goedgekeurde mentale kaart: Today, Reality, Horizon, Workroom en een secundaire Foundation-route.

**Waarom nodig**  
De bestaande functies hebben inhoudelijke waarde, maar hun plaats en naam vertellen nog onvoldoende wat de gebruiker er dagelijks mee doet. Vooral Waarnemen, Practice Dossiers en technische onderbouwing lopen nu door elkaar.

**Wordt aangepast**

- **Today:** Focus en Stilte;
- **Reality:** bevestigde werkelijkheid, observatiereview, Practice Sources/Orientations;
- **Horizon:** bestaande horizonfunctie;
- **Workroom:** Cases, Understanding, Knowledge proposals, Ideas en Logbook;
- Practice Dossiers wordt hernoemd en gepositioneerd als Practice Sources/Orientations;
- bestaande modellen, relevante inhoud en routes worden waar mogelijk behouden;
- labels, lege toestanden en interne verwijzingen worden consistent gemaakt.

**Bewust buiten scope**

- nieuwe Atlas-modules;
- nieuwe semantische engine;
- verwijdering van inhoud die alleen anders moet worden geplaatst;
- technische Foundation-inhoud zelf; die volgt in UXA-07.

**Afhankelijkheden:** UXA-03; UXA-04 kan daarna deels parallel lopen, met één gezamenlijke integratiecontrole.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-06 — Atlas: rustige dagelijkse shell en compacte hero

**Doel**  
Laat Atlas vanaf de eerste pixel als Workspace functioneren, met een compacte opening waarin Focus, Stilte en de Atlas-identiteit overeind blijven.

**Waarom nodig**  
De huidige hero vult op desktop en mobiel vrijwel een volledig openingsscherm en voelt daardoor als marketingintroductie. De dagelijkse werkelijkheid begint te laat, terwijl de WBD Workspace-opbouw aantoonbaar rustiger werkt.

**Wordt aangepast**

- normale Workspace-shell vanaf de bovenkant;
- compacte Atlas-header;
- rustige presentatie van Focus en Stilte;
- de kompasidentiteit in een minder dominante rol;
- eerste relevante werkelijkheid binnen de eerste viewport;
- desktop-, tablet- en mobiele verhoudingen;
- gebruik van bestaande typografie, kleur en ritme.

**Bewust buiten scope**

- visuele rebranding van Atlas;
- verwijdering van Focus, Horizon, Stilte of het kompas;
- nieuwe dashboardfunctionaliteit;
- afwijkend designsysteem naast WBD.

**Afhankelijkheden:** UXA-05.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-07 — Atlas Foundation: leesbaar technisch register

**Doel**  
Maak technische fundamenten bereikbaar via de secundaire route `/atlas/fundament`, zonder ze op de homepage te laten domineren.

**Waarom nodig**  
Architectuur, repositories, Codex-projecten, technische keuzes, implementatiestatus en validaties bestaan, maar zijn niet als samenhangende onderbouwing vindbaar.

**Wordt aangepast**

- een leesbaar register voor Architectuur;
- Componenten en repositories;
- Codex-projecten;
- Technische keuzes;
- Implementatiestatus;
- Validaties en GO-reviews;
- per item: menselijke betekenis, canonieke bron, status, laatste validatie, gerelateerd project of GO en relevante grens/volgende toets.

**Bewust buiten scope**

- kopiëren van canonieke documentatie naar een tweede bron;
- documenteditor of projectmanagementsysteem;
- nieuwe repository- of CI-integraties;
- realtime statusinfrastructuur;
- publieke technische homepage.

**Afhankelijkheden:** UXA-05; bronverwijzingen gebruiken uitsluitend bestaande canonieke repositorydocumenten.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-08 — Workspace Navigation Experience: prototype en besluit

**Doel**  
Valideer de goedgekeurde navigatiegrammatica visueel voordat de gedeelde shells worden aangepast.

**Waarom nodig**  
Navigatie raakt WBD en Atlas tegelijk. Een klein prototype voorkomt dat iconen, groepering en aandachtindicatoren tijdens productie-implementatie alsnog als losse stijlbeslissingen ontstaan.

**Wordt aangepast**

- vier representatieve statische toestanden: normaal, actief, aandacht en compact/mobiel;
- officiële WBD-logo-uitvoering;
- 16–18px WBD-lijniconen;
- actieve crème-oppervlakken;
- visuele groepen Relaties, Werk, Bedrijf en Kennis;
- maximaal één menselijke aandachtsmarkering;
- vergelijking met de Atlas-shell en responsive gedrag.

**Bewust buiten scope**

- productiecode in de Workspace-shell;
- badgebackend, tellingen of realtime meldingen;
- nieuwe routes;
- alternatieve logo- of iconensets.

**Afhankelijkheden:** UXA-05 bepaalt de Atlas-navigatiestructuur.  
**Omvang:** S  
**Oplevering:** GO

---

### UXA-09 — Gedeelde navigatie-implementatie

**Doel**  
Implementeer de goedgekeurde navigatiegrammatica in WBD en Atlas.

**Waarom nodig**  
De Workspace is de sterkste dagelijkse basis, maar de navigatie kan rijker zonder drukker te worden. WBD en Atlas moeten daarbij herkenbaar één familie vormen zonder hun eigen rol te verliezen.

**Wordt aangepast**

- gedeelde navigatiestijl in WBD en Atlas;
- officiële WBD-logo-uitvoering op alle Workspace-oppervlakken;
- goedgekeurde kleine iconen, groepering, actieve toestand en responsive variant;
- uitsluitend een subtiele, menselijk betekenisvolle aandachtsmarkering waar die reeds uit bestaande toestand kan worden afgeleid;
- toetsenbord-, focus- en schermlezercontrole.

**Bewust buiten scope**

- notificatiecentrum, ongelezen-tellers of realtime badge-infrastructuur;
- nieuwe logo- of designvariant;
- nieuwe routes of informatiemodellen.

**Afhankelijkheden:** UXA-06 en UXA-08; voor Atlas ook UXA-04 en UXA-05.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-10 — WBD Facturen: veilige levenscyclus van concepten

**Doel**  
Maak opruimen en herstellen van factuurconcepten veilig, terwijl definitieve facturen onveranderlijk blijven.

**Waarom nodig**  
Een ondernemer moet tijdelijke concepten kunnen beheren zonder bang te zijn definitieve financiële historie te beschadigen. Het huidige onderscheid is functioneel nog niet volledig uitgewerkt in de dagelijkse bediening.

**Wordt aangepast**

- factuurconcepten veilig archiveren;
- gearchiveerde concepten terugzetten;
- een concept alleen vanuit het archief definitief verwijderen wanneer er geen definitieve afgeleide bestaat;
- heldere status- en bevestigingsteksten;
- definitieve facturen blijven onveranderlijk en niet-verwijderbaar;
- responsive en toegankelijke interactiestaten.

**Bewust buiten scope**

- creditnota- of correctieworkflow;
- verwijderen, terugzetten of inhoudelijk wijzigen van definitieve facturen;
- nieuwe financiële automatisering;
- nieuw factuurmodel.

**Afhankelijkheden:** geen inhoudelijke afhankelijkheid; plan na UXA-09 om conflicten in de gedeelde Workspace-shell te vermijden.  
**Omvang:** M  
**Oplevering:** GO

---

### UXA-11 — WBD Organisatiedossier: formulieren op intentie

**Doel**  
Laat bestaande document- en contactformulieren pas verschijnen nadat de gebruiker bewust kiest om iets toe te voegen of te wijzigen.

**Waarom nodig**  
De formulieren nemen nu veel visuele ruimte in en laten het dossier als invoerscherm voelen. Voor dagelijks ondernemersgebruik moet eerst de relatie en actuele informatie leesbaar zijn; invoer volgt op intentie.

**Wordt aangepast**

- bestaande document- en contactformulieren openen via disclosure of dialoog;
- duidelijke primaire acties om formulieren te openen en te sluiten;
- behoud van bestaande velden, validatie en opslag;
- focusbeheer, foutterugkoppeling en mobiele bediening.

**Bewust buiten scope**

- nieuwe dossierfunctionaliteit;
- nieuwe velden, datamodellen of automatisering;
- verwijdering van bestaande document- of contactmogelijkheden;
- herontwerp van het volledige relatiedossier.

**Afhankelijkheden:** geen inhoudelijke afhankelijkheid; plan na UXA-09 om shellconflicten te vermijden. UXA-10 en UXA-11 mogen parallel wanneer zij geen gedeelde bestanden wijzigen.  
**Omvang:** S  
**Oplevering:** GO

---

### UXA-12 — Geïntegreerde productiereview en eerste publieke release

**Doel**  
Bevestig dat website, Experience, WBD Workspace en Atlas Workspace als één geheel hetzelfde kwaliteitsniveau hebben en publiceer daarna de reeds goedgekeurde publieke oppervlakken via de bestaande releaseroute.

**Waarom nodig**  
Lokale GO's bewijzen afzonderlijke onderdelen. De eerste livegang vereist ook dat routeovergangen, taal, responsive gedrag en productrollen in combinatie kloppen voor een ondernemer die tussen website, Experience en workspaces beweegt.

**Wordt aangepast en gecontroleerd**

- geïntegreerde regressie van alle goedgekeurde projecten;
- heldere rolgrenzen tussen website, Experience, WBD, Atlas en Foundation;
- websitecopy en verwijzingen die door de routewijzigingen geraakt worden;
- desktop, tablet en mobiel;
- toetsenbordnavigatie, focus, contrast, reduce-motion en semantiek;
- geldige, verlopen en ontbrekende Experience-tokens;
- build-, route- en assetgrenzen;
- afwezigheid van afwijkende WBD-logo's en traditionele notificatiebadges;
- bestaande publieke website en canonieke Experience worden na eind-GO via de bestaande releaseprocedure gepubliceerd.

**Bewust buiten scope**

- nieuwe functionaliteit of redesign tijdens de eindreview;
- nieuwe hosting- of authenticatiearchitectuur;
- mail, monitoring, back-ups, secretsbeheer of infrastructuurmigratie;
- WBD en Atlas publiek toegankelijk maken wanneer de bestaande toegangs- en hostinggrens dat nog niet verantwoord ondersteunt.

**Afhankelijkheden:** UXA-01 tot en met UXA-11.  
**Omvang:** M  
**Oplevering:** eerst GO, daarna **direct live** voor de reeds goedgekeurde publieke oppervlakken

## 4. Implementatievolgorde en GO-poorten

### Fase 1 — Experience weer eenduidig bereikbaar

1. UXA-01 — Canonieke toegang en routecompatibiliteit.
2. UXA-02 — Inhoud, privacytaal en legacy-afbouw.

**GO 1 — Experience:** `/ervaar` is de inhoudelijke hoofdingang, bestaande geldige sessies blijven werken en verouderde uitnodigingstaal bepaalt de ervaring niet langer.

**Na GO 1 is de Experience inhoudelijk gereed.** De definitieve productiewaardigheid wordt in Fase 5 integraal bevestigd.

### Fase 2 — Waarnemen krijgt één menselijke levenscyclus

1. UXA-03 — Eigenaarschap, levenscyclus en bronmodel.
2. UXA-04 — Menselijke observatiereview in Atlas Reality.

**GO 2 — Observatielaag:** bron, review, betekenis en kennis zijn aantoonbaar gescheiden; geen automatische promotie; bestaande relevante data blijft herkenbaar.

### Fase 3 — Atlas wordt een dagelijkse Workspace

1. UXA-05 — Informatiearchitectuur en terminologie.
2. UXA-06 — Rustige dagelijkse shell en compacte hero.
3. UXA-07 — Leesbaar Foundation-register.

UXA-06 en UXA-07 mogen na het structuurdeel van UXA-05 parallel worden uitgevoerd, mits zij niet tegelijk dezelfde shellbestanden wijzigen.

**GO 3 — Atlas:** de eerste viewport ondersteunt dagelijks gebruik, Reality en Workroom hebben een heldere rol, Practice Sources/Orientations klopt en technische onderbouwing is secundair maar vindbaar.

**Na GO 3 is Atlas functioneel en inhoudelijk gereed; de gedeelde navigatie en integrale productiereview volgen nog.**

### Fase 4 — Eén Workspace-grammatica en rustige bedrijfsvoering

1. UXA-08 — Navigatieprototype en besluit.
2. UXA-09 — Gedeelde navigatie-implementatie.
3. UXA-10 — Veilige levenscyclus van factuurconcepten.
4. UXA-11 — Formulieren in het organisatiedossier op intentie.

UXA-10 en UXA-11 mogen na UXA-09 parallel worden uitgevoerd wanneer zij geen gedeelde bestanden wijzigen.

**GO 4 — Workspaces:** WBD en Atlas spreken dezelfde visuele taal, het officiële logo is consistent, aandacht is subtiel en de bestaande WBD-beheerhandelingen zijn veiliger en rustiger.

**Na GO 4 is de WBD Workspace productiewaardig en is Atlas implementatiegereed voor de integrale eindtoets.**

### Fase 5 — Eén geïntegreerde productiereview

1. UXA-12, reviewdeel — volledige regressie en eindbeoordeling.
2. Alleen gerichte correcties op geconstateerde afwijkingen binnen de goedgekeurde scope.
3. Herhaal de relevante controles tot alle vier productgebieden hetzelfde kwaliteitsniveau halen.

**GO 5 — Release candidate:** website, Experience, WBD Workspace en Atlas Workspace zijn inhoudelijk, visueel, responsive en functioneel productiewaardig binnen de bestaande architectuur.

**Na GO 5 zijn Experience, WBD Workspace, Atlas Workspace en website productiewaardig.**

### Fase 6 — Eerste publieke livegang

1. UXA-12, releasedeel — publiceer website en canonieke Experience via de bestaande, reeds gebruikte releaseroute.
2. Voer directe smokechecks uit op routes, assets, Experience-toestanden en responsive hoofdflows.
3. Bij een releaseblokkerende afwijking: herstel binnen de goedgekeurde scope en herhaal de GO-check; voeg geen nieuwe functionaliteit toe.

**Oplevering:** direct live na GO 5 en succesvolle smokecheck.

**GO 6 — Publieke livegang:** de publieke website en Experience zijn verantwoord live binnen de bestaande infrastructuurgrenzen.

## 5. Productiewaardigheid per omgeving

| Omgeving | Inhoudelijk gereed | Productiewaardig | Verantwoord live |
|---|---|---|---|
| Experience | Na GO 1 | Na GO 5 | Na GO 6 via `/ervaar`, met `/e/#token` als compatibiliteitsroute |
| WBD Workspace | Na GO 4 | Na GO 5 | Binnen de huidige goedgekeurde toegangsgrens; bredere online productie-exploitatie pas na de relevante GO van Project 002 |
| Atlas Workspace | Na GO 3, inclusief observatielaag | Na GO 5 | Binnen de huidige goedgekeurde toegangsgrens; bredere online productie-exploitatie pas na de relevante GO van Project 002 |
| Publieke website | Na de geïntegreerde content- en routecontrole in Fase 5 | Na GO 5 | Na GO 6 |
| Volledige omgeving | Na GO 5 productmatig compleet | Na GO 5 UX- en applicatietechnisch productiewaardig | Publieke oppervlakken na GO 6; het volledige ecosysteem inclusief verantwoord gehoste interne workspaces pas nadat Project 002 zijn infrastructuur-GO heeft behaald |

## 6. Definition of Done voor iedere GO

Een project krijgt alleen GO wanneer:

- het doel aantoonbaar is behaald zonder nieuwe scope;
- alle expliciet buiten scope gehouden onderwerpen buiten de implementatie zijn gebleven;
- desktop, tablet en mobiel zijn gecontroleerd;
- toetsenbord, focus, semantiek en contrast op de geraakte flow zijn gecontroleerd;
- bestaande geldige routes, data en compatibiliteit niet onbedoeld zijn gebroken;
- taal, logo, iconen, kleur en ruimtelijk ritme overeenkomen met de design language;
- er geen traditionele notificatiebadge of automatisch kennisbesluit is geïntroduceerd;
- de ondernemer de primaire dagelijkse handeling sneller kan herkennen en met minder visuele belasting kan afronden;
- de project-GO schriftelijk is vastgelegd voordat de volgende afhankelijke fase begint.

## 7. Eindadvies

Voer deze roadmap uit als zes gecontroleerde fasen met een harde GO na iedere fase. Houd de Experience-route eerst stabiel, leg daarna de menselijke observatieketen vast, bouw vervolgens Atlas om tot een rustige dagelijkse Workspace en pas pas daarna de gedeelde navigatie en WBD-beheerpatronen aan. Daarmee blijft iedere stap klein genoeg om zelfstandig te beoordelen, terwijl de eindkwaliteit als één geheel wordt bewaakt.

De eerste publieke livegang moet niet wachten op nieuwe infrastructuur zolang uitsluitend de bestaande publieke website en Experience via de huidige, reeds goedgekeurde releaseroute worden gepubliceerd. De volledige omgeving — inclusief structureel gehoste WBD- en Atlas-workspaces — is pas verantwoord live nadat de infrastructurele garanties van Project 002 afzonderlijk zijn ontworpen, uitgevoerd en goedgekeurd.

**Na deze stap adviseren wij Project 002 – Infrastructure Foundation.**

## 8. Formele afsluitstatus — 6 augustus 2026

Project 001 is na UXA-01 tot en met UXA-06, de integrale beoordeling en Project 001D inhoudelijk en applicatietechnisch afgesloten. De actuele geïntegreerde releasecandidate is productmatig gereed; er zijn geen open product-, UX- of applicatieblockers.

De eerdere Fase 6-publicatie is niet als volledige productieclaim uitgevoerd. De productiewerkelijkheid liet zien dat de publieke en interne omgevingen nog geen gedeelde, veilige hosting- en toegangsgrens hebben. Publicatie, structurele online hosting, autorisatie, monitoring, restore en rollback vallen daarom vanaf deze afsluiting onder Project 002.

Niet afzonderlijk uitgevoerde roadmaplabels na UXA-06 zijn geen impliciete open releaseblockers. Nieuwe productuitwerking ontstaat alleen door een expliciete nieuwe roadmapbeslissing. De volledige status, overdrachtsgrens en heropeningscriteria staan in [`PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md`](PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md).
