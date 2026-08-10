# Impactanalyse Bij Cees — eerste Oriëntatie

> **Status:** niet-canoniek reviewresultaat  
> **Datum:** 25 juli 2026  
> **Aanleiding:** afronding van de eerste bron- en Oriëntatiesessie voor Bij Cees  
> **Besluitgrens:** geen GO voor canonieke wijziging, candidate, architectuur, interface of implementatie

## Reviewuitkomst

De impactanalyse voldoet aan de onderzoeksopdracht. Er is geen aanleiding om op basis van deze review implementaties of canonieke wijzigingen te starten.

Ontwerpimplicaties rond onder meer Workspace, Register en README blijven hypotheses. Zij krijgen pas een andere status wanneer daarvoor afzonderlijk een candidate wordt opgesteld en door Donovan wordt beoordeeld.

## 1. Welke bestaande Atlas-onderdelen zijn geraakt?

- **Oriëntatie en caselevenscyclus.** D-010 is voor het eerst werkelijk doorlopen van bron tot bevestigd praktijksignaal, menselijke contextbevestiging en `Nog niet toegewezen`.
- **Bronherkomst.** De cyclus onderscheidde de oorspronkelijke praktijkbron van het latere moment waarop die werkelijkheid in Atlas verscheen. Beide vallen binnen het bestaande begrip Bron; er ontstond geen nieuwe methodische laag.
- **Waarnemen.** De bron bevat Donovans eigen ervaring van frictie, maar is niet via de bestaande Waarnemen-module ontstaan. De canon staat `bron of waarneming` toe; de implementatie ondersteunt alleen casegebonden Waarnemen voor Case 0001.
- **Menselijke bevestiging.** D-006 en de verantwoordelijkheidsverdeling zijn toegepast: Atlas stelde context en signaal voor, Donovan corrigeerde de formulering en bevestigde plaatsing en terugkeertrigger.
- **Kennis, Begrip en Interface.** Er bestaat nu bevestigde kennis die nog geen case, Understanding of Interface is. Daarmee is dit onderscheid voor het eerst praktisch zichtbaar vóór case-identiteit.
- **Focus, Horizon en Stilte.** Geen van deze aandachtstoestanden is toegekend. Wel is besloten dat casebeoordeling wacht op een terugkeertrigger. Daardoor bestaat feitelijk een wachtende toestand zonder dat die als Horizon of Bewuste Stilte is geclassificeerd.
- **Workspace.** H-BC-001 is nu daadwerkelijk toetsbaar: de Oriëntatie bestaat buiten de Workspace. Of dat contextverlies of mentale belasting veroorzaakt, is nog onbewezen.
- **Case en CASE-SNAPSHOT.** De grens is bevestigd: echte klantwerkelijkheid, uitgevoerd werk en mogelijke WBD-verantwoordelijkheid kunnen bestaan voordat Atlas case-identiteit of rijpheid toekent.
- **Principlegroeiboek.** Principe-entry 8 is voor het eerst in praktijk toegepast. De bestaande status — Decision en canonieke methode, maar nog geen zelfstandig Foundation-principe — blijft consistent.
- **Logboek en Recovery.** De in het Logboek aangekondigde praktijktoets heeft plaatsgevonden. De Recovery beschrijft nu niet meer de actuele toestand van Bij Cees, maar de toestand vóór deze validatie.

## 2. Welke documenten of beslissingen zijn mogelijk niet meer consistent?

- `PRAKTIJKVALIDATIE-BIJ-CEES-CANDIDATE.md` bevat bovenaan nog de tekst dat Bij Cees “nog geen praktijksignaal” en geen Oriëntatie heeft. Dat botst met de latere bevestigde status in hetzelfde document.
- Datzelfde document noemt de Oriëntatie “duurzaam vindbaar”. Het bestand is momenteel untracked en daarmee alleen lokaal aanwezig. Dat is nog geen repositoryduurzaamheid.
- `RECOVERY-CANDIDATE-2026-07-25.md` vermeldt dat Bij Cees geen vastgelegde bron, context, eigenaar, betekenis of terugkeertrigger heeft. Als goedgekeurde nulmeting blijft dat historisch correct; als beschrijving van de huidige staat is het inmiddels verouderd.
- `ATLAS_LOGBOOK.md` noemt het toetsen van een volgend praktijksignaal nog als volgende stap. Die stap is inmiddels uitgevoerd.
- `docs/atlas/README.md` zegt dat klantgebonden feiten in een dossier onder `clients/` blijven. De praktijkvalidatienotitie onder `docs/atlas/` bevat inmiddels concrete klantgebonden werkzaamheden en ervaring, terwijl Bij Cees terecht nog geen klantdossier heeft. De bestaande documentgrens dekt pre-casepraktijk daarmee niet eenduidig.
- Hetzelfde README-document indexeert methode, Decisions, sprints, Observations en Principles, maar kent geen huidige documentsoort voor een niet-toegewezen praktijksignaal.
- **D-010 blijft inhoudelijk consistent.** Het besluit verbood alleen dat de canonieke vastlegging Bij Cees meteen als case registreerde of de Workspace wijzigde. De latere, afzonderlijk bevestigde Oriëntatie schendt die grens niet.
- **D-005 is niet rechtstreeks tegenstrijdig, maar niet volledig dekkend.** Het gedeelde Understandingmodel begint bij cases en kan deze pre-casewerkelijkheid niet vertegenwoordigen.
- **D-007 blijft consistent.** De nieuwe kennis hoeft niet automatisch Interface te worden. H-BC-001 onderzoekt juist of zichtbaarheid redactioneel gerechtvaardigd is.

## 3. Welke aannames moeten opnieuw worden bekeken?

### Workspace

- De Workspace kan niet langer als volledig actueel werkbeeld worden beschouwd wanneer hij uitsluitend Case 0001, Case 0002, lokale focus en losse ideeën kent.
- De aanname dat relevante werkelijkheid altijd aan een case-ID kan worden gekoppeld is ontkracht.
- De huidige Waarnemen-flow veronderstelt Case 0001 en een sprint voordat een waarneming kan worden opgeslagen. Pre-casewaarnemingen passen daar niet in.
- Focusitems kunnen alleen geen case, Case 0001 of Case 0002 dragen; ze kunnen niet herleidbaar naar een Oriëntatie verwijzen.
- Logboekregels kunnen vrije tekst zonder case bevatten, maar geen formele relatie met een praktijksignaal of Oriëntatie bewaren.
- `Niet zichtbaar` kan zowel Bewuste Stilte als ontbrekende interfacerepresentatie betekenen. De huidige Workspace kan dat onderscheid niet tonen.

### Case

- Een klantrelatie of uitgevoerd klantwerk is niet automatisch een Atlas-case.
- Een substantieel pakket uitgevoerde werkzaamheden bewijst nog geen zelfstandige case-identiteit.
- Case-identiteit kan niet worden afgeleid uit de aanwezigheid van een map, een Workspacekaart of bekende klantnaam.
- Klantgebonden werkelijkheid kan vóór een case bestaan, terwijl de bestaande repositorystructuur alleen methodedocumenten en formele casedossiers onderscheidt.

### CASE-SNAPSHOT

- Een CASE-SNAPSHOT is niet vereist om een Oriëntatie te laten bestaan.
- De regel dat alleen een Confirmed snapshot de Workspace mag voeden geldt voor een actueel inhoudelijk **casebeeld**. Zij geeft nog geen antwoord op de zichtbaarheid van bevestigde pre-casewerkelijkheid.
- Zichtbaarheid in de Workspace mag daardoor niet automatisch worden gelezen als snapshotbevestiging, case-rijpheid of inhoudelijk oordeel.
- De huidige snapshotbron ondersteunt uitsluitend Case 0001 en veronderstelt al case-identiteit.

### Foundation

- De Foundationaanname dat Oriëntatie een signaal `duurzaam draagt` is methodisch gevalideerd, maar operationeel nog niet aantoonbaar gerealiseerd.
- De vier bestemmingen na menselijke casebeoordeling blijven intact. In deze cyclus is de beoordeling uitgesteld met een trigger; nog geen bestemming is gekozen.
- Redactionele aandacht is expliciet nog niet beoordeeld, terwijl tegelijk is vastgelegd dat nu geen onderzoek of andere handeling start. Daarmee is impliciet al enige aandachtsturing toegepast.
- De Foundation hoeft inhoudelijk niet te veranderen: de nieuwe Oriëntatie past binnen de bestaande volgorde en menselijke grenzen.

## 4. Hebben we een bestaande stap onder een andere naam toegevoegd?

Er is geen aantoonbaar nieuwe methodische stap toegevoegd.

- **Eerste praktijkbron** is de bestaande Werkelijkheid/Bron vóór Atlas.
- **Eerste Atlas-bron** is een latere herleidbare bron in Atlas’ kennisgeschiedenis.
- **Bron- en Oriëntatiesessie** is een werkvorm rond bestaande stappen, geen nieuwe lifecyclefase.
- **Voorlopige context bevestigen** bestond al in Waarnemen, D-010 en de verantwoordelijkheidsverdeling.
- **Beoordeling als praktijksignaal** is de bestaande overgang van bron naar praktijksignaal.
- **Terugkeertrigger** was al canoniek vereist voor een signaal dat niet direct wordt toegewezen.
- **Nulmeting voor H-BC-001** is praktijkbewijs binnen bestaand onderzoek, geen nieuwe Atlas-fase.

Er bestaat wel een terminologierisico: wanneer `praktijkbron` en `Atlas-bron` later vaste statussen of verplichte fasen worden genoemd, ontstaat alsnog een nieuwe taxonomie. In deze cyclus zijn ze uitsluitend beschrijvingen van herkomst.

## 5. Welke beslissingen zijn impliciet genomen zonder bewuste GO?

- Een afzonderlijk bestand onder `docs/atlas/` is gebruikt als tijdelijke drager van een niet-toegewezen, klantgebonden praktijksignaal. Er was GO om de hypothese en praktijk vast te leggen, maar geen afzonderlijk besluit over documenttype, locatie of blijvende status.
- Het lokale, untracked candidate-document is behandeld als een duurzame verblijfplaats. Er is geen expliciet besluit dat lokale, ongecommitteerde vastlegging voldoende duurzaamheid biedt.
- Het onderscheid `eerste praktijkbron` en `eerste Atlas-bron` is operationeel gebruikt en vastgelegd zonder een afzonderlijk besluit over die terminologie. Het is wel expliciet begrensd als niet-methodisch.
- H-BC-001 is na bevestiging van de Oriëntatie als `geactiveerd` beschouwd. De hypothese zelf was expliciet goedgekeurd; het exacte startmoment van de praktijkevaluatie niet afzonderlijk.
- Er is vastgelegd dat nu geen onderzoek, monitoring of andere handeling start. Het wachten op de terugkeertrigger is bevestigd, maar er is geen afzonderlijk aandachtsoordeel genomen waarin deze toestand Focus, Horizon of Bewuste Stilte heet.
- Er is aangenomen dat de bevestigde Oriëntatie voldoende vindbaar blijft via de validatienotitie. Of Donovan haar zonder Workspaceweergave werkelijk terugvindt, is juist nog onderwerp van H-BC-001.

De bevestiging van signaalinhoud, plaatsing in Oriëntatie, uitstel van casebeoordeling en terugkeertrigger waren wél expliciete menselijke beslissingen.

## 6. Welke toekomstige implementaties worden beïnvloed?

- **Workspace:** moet rekening houden met bevestigde werkelijkheid die geen case is, zonder automatisch prioriteit of casebetekenis te suggereren.
- **Workspacegegevens:** het huidige model kent casefocus, twee cases, ideeën en logboek, maar geen pre-casebron, praktijksignaal, Oriëntatiestatus, beoordelingseigenaar of terugkeertrigger.
- **Waarnemen:** de huidige implementatie veronderstelt vooraf Case 0001. De praktijkcyclus toont dat een bron of waarneming ook vóór case-identiteit betekenisvol kan worden.
- **Casevorming:** een toekomstige overgang naar een case wordt beïnvloed door de noodzaak om bron, bevestigde context en eerdere Oriëntatie herleidbaar te behouden.
- **Understanding:** mag pas na case-identiteit beginnen en mag de Oriëntatie niet stilzwijgend als inzicht, probleem of werkelijke vraag overnemen.
- **CASE-SNAPSHOT:** blijft pas relevant na case-identiteit en voldoende case-rijpheid. Een Oriëntatie mag geen verkapte Candidate-snapshot worden.
- **Kompas en Focus:** nieuwheid, zichtbaarheid of aanwezigheid van een Oriëntatie mag niet automatisch tot prioriteit leiden.
- **Logboek:** toekomstige herleidbaarheid wordt geraakt doordat een betekenisvolle beslissing nu bestaat zonder case-ID en zonder formele relatie vanuit het huidige logmodel.
- **Atlas Register:** een eventueel later Register zou ook niet-toegewezen praktijkwerkelijkheid moeten kunnen onderscheiden van cases, ideeën en Horizon. Dit is uitsluitend een impacthypothese.
- **Research en brononderzoek:** iedere gevonden bron kan de terugkeertrigger activeren, maar de wens om beter te begrijpen rechtvaardigt nog geen specifieke onderzoeks-, meet- of monitoringtechniek.
- **Monitoring en live verbindingen:** de oorspronkelijke vermelding van meten en monitoren is redactioneel teruggebracht tot `beter begrijpen wat daadwerkelijk gebeurt`. Geen toekomstige monitoringimplementatie kan daarom op deze bron alleen worden gebaseerd.
- **Privacy en documentgrenzen:** pre-casepraktijk bevat al klantgebonden informatie voordat een klantdossier bestaat. Iedere toekomstige opslag of Workspaceweergave wordt hierdoor geraakt.
- **Test- en validatielogica:** toekomstige controles worden geraakt door het onderscheid tussen bevestigd signaal, toegewezen case, Confirmed snapshot en redactionele aandacht; de huidige tests dekken alleen de bestaande case- en snapshotgrenzen.

## Status na review

- Geen nieuwe functionaliteit.
- Geen implementatie.
- Geen nieuwe architectuur.
- Geen Foundation- of Principle-wijziging.
- Geen Decision.
- Geen Workspace-, Register- of README-candidate.
- Geen staging of commit.
