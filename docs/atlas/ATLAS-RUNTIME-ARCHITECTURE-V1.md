# Atlas Runtime Architecture V1

**Status:** inhoudelijk gevalideerde runtime-architectuur  
**Datum:** 4 augustus 2026  
**Gezag:** uitvoeringsarchitectuur onder de geratificeerde Atlas Foundation, Continuous Inquiry Loop V1 en Cognitive Engine V1  
**Reikwijdte:** uitsluitend de kleinste technische architectuur die de cognitieve foundations betrouwbaar uitvoerbaar maakt  
**Niet ontworpen:** code, database, UI, Experience, prompts, modelkeuze, infrastructuur of deployment

---

## 1. Opdracht en grens

Runtime Architecture V1 beantwoordt niet opnieuw hoe Atlas denkt. Dat is geratificeerd.

De enige architectuurvraag is:

> Welke minimale technische verantwoordelijkheden zijn noodzakelijk om het geratificeerde Atlas-denken als één traceerbaar, herstelbaar en constitutioneel begrensd runtimeproces uit te voeren?

Deze architectuur mag:

- geratificeerde mentale toestand technisch begrenzen;
- geldige cognitieve veranderingen ordelijk laten verlopen;
- foundationregels vóór en na iedere overgang controleren;
- herkomst, afhankelijkheid en verandering traceerbaar houden;
- wachten op mens, bron of werkelijkheid wanneer intern denken niet volstaat;
- na onderbreking de laatst geldige cognitieve toestand herstellen.

Deze architectuur mag niet:

- een nieuwe manier van denken introduceren;
- nieuwe hypotheseregels, betekeniscategorieën of nieuwsgierigheidscriteria verzinnen;
- een inhoudelijk oordeel toevoegen dat niet uit de foundations volgt;
- waarschijnlijk klinkende output rechtstreeks als Atlas-toestand behandelen;
- een fundamenteel conflict stilzwijgend oplossen;
- alvast een database-, model-, prompt-, API-, UI- of deploymentkeuze maken.

---

## 2. Geratificeerde invoer

De Runtime voert uitsluitend deze documenten uit:

1. [Atlas Foundation](../../Foundation.md)
2. [Continuous Inquiry Loop V1](./ATLAS-CONTINUOUS-INQUIRY-LOOP-V1.md)
3. [Cognitive Engine V1](./ATLAS-COGNITIVE-ENGINE-V1.md)

Het eerdere [Foundation Revalidation Report](./ATLAS-FOUNDATION-REVALIDATION-V1.md) is bewijs dat de drie foundations gezamenlijk een GO hebben. Het rapport voegt geen runtimewaarheid toe.

### 2.1 Referentienotatie

Architectuurbeslissingen verwijzen rechtstreeks naar bestaande secties:

- `F · hiërarchie` — Atlas Foundation, Constitutionele hiërarchie;
- `F · P<n>` — Atlas Principle nummer `<n>`;
- `F · Understanding` — Atlas Method, Begrijpen;
- `F · verantwoordelijkheid` — Atlas Foundation, Verantwoordelijkheid;
- `F · kennis` — Kennis, begrip en interface;
- `F · waarnemen` — Waarnemen vóór beoordeling;
- `CI · <sectie>` — Continuous Inquiry Loop V1;
- `CE · <sectie>` — Cognitive Engine V1.

Deze notatie maakt geen nieuwe regels. Zij verkort alleen de herleidbaarheid.

---

## 3. Architectuur in één zin

**Atlas Runtime verwerkt iedere externe gebeurtenis als één gecontroleerde cognitieve transactie die een kandidaatverandering vergelijkt met het actuele cognitieve veld, constitutioneel valideert en pas daarna toestand, geschiedenis en eventuele zichtbare beweging gezamenlijk vastlegt.**

De minimale stroom is:

**Externe gebeurtenis → Runtime Boundary → Runtime Supervisor → Cognitive Processor → Transition Kernel → Constitutional Gate → atomische vastlegging in Cognitive Field en Cognitive Journal → Runtime Decision.**

Een verzoek om externe correctie loopt via dezelfde Boundary terug. Er bestaat geen kortere route naar toestand of zichtbare reactie.

---

## 4. De zes minimale runtimeverantwoordelijkheden

De onderdelen hieronder zijn **logische verantwoordelijkheden**. Runtime Architecture V1 zegt niet dat zij afzonderlijke processen, services, programma’s of machines moeten worden.

### 4.1 Runtime Boundary

De Boundary is de enige ingang en uitgang van de cognitieve runtime.

Hij doet uitsluitend het volgende:

- ontvangt een bijdrage, bron, waarneming, testresultaat, correctie, framewijziging, menselijke beslissing of hervatting;
- bewaart vóór interpretatie identiteit, actor, bronsoort, waarnemingsmoment, ontvangstmoment en inquiry-context;
- onderscheidt nieuwe, dubbele, late en nog onvolledige gebeurtenissen;
- geeft gebeurtenissen ongewijzigd door als runtime-event;
- geeft na commit uitsluitend een Runtime Decision terug;
- ontvangt later externe correctie opnieuw als volwaardige gebeurtenis.

De Boundary:

- bepaalt geen betekenis;
- vormt geen hypothese;
- verheft tekst niet tot feit;
- behandelt menselijke goedkeuring niet als feitelijk bewijs;
- voegt wereldkennis niet aan lokale grond toe.

**Herleiding:** F · P21, F · P23, F · waarnemen, CI · 4 en CE · 4.15.

### 4.2 Cognitive Field

Het Cognitive Field is de enige actuele, canonieke denktoestand van één inquiry.

Het draagt precies de geratificeerde toestandsgroepen:

- inquiry frame;
- actuele situatie en grondlaag;
- werkelijkheidscontact met bron-, actor-, relatie- en tijdscontext;
- meervoudige betekenis;
- hypotheses, alternatieven, aannames en bewijsverhoudingen;
- open onbekenden en spanningen;
- risico en foutkosten;
- wereldkennis als afgescheiden prior context;
- aandacht, nieuwsgierigheid en onderzoeksenergie;
- kwalitatief vertrouwen;
- metacognitieve toestand;
- consolidatiestatus en verwijzing naar epistemische geschiedenis.

Het veld bevat één actuele revisie. Geen Boundary, processor, outputlaag of externe bron mag het rechtstreeks wijzigen.

**Herleiding:** CE · 4, CE · 17, CE · 20, CE · 23.27–30 en CE · 24.1.

### 4.3 Cognitive Processor

De Processor voert het inhoudelijke verschilonderzoek uit, maar bezit geen commitrecht.

Op basis van één runtime-event en één expliciete veldrevisie maakt hij een **Candidate Transition** met:

- wat aan de grondlaag kan worden toegevoegd;
- welk intern veranderingstype van CE · 7 van toepassing kan zijn;
- welke betekenis, hypothese, bronafhankelijkheid, onzekerheid of spanning geraakt wordt;
- welke serieuze alternatieven open moeten blijven;
- welk vertrouwen kan stijgen, dalen of gelijk blijven en waarom;
- welke aandacht of onderzoeksenergie mogelijk verschuift;
- of risico, wereldkennis, frame of externe correctie de beweging begrenst;
- welke Runtime Decision mogelijk gerechtvaardigd is;
- welke foundationregels iedere voorgestelde verandering dragen.

De Processor mag nul, één of meerdere kandidaten voorstellen. Een kandidaat is nooit al een gedachte van Atlas. Pas een geldige commit maakt haar onderdeel van het cognitieve veld.

De architectuur schrijft niet voor of deze verantwoordelijkheid later door deterministische logica, een taalmodel, andere rekenmiddelen of een combinatie wordt uitgevoerd.

**Herleiding:** CI · 5, CI · 15, CI · 22, CE · 5–11 en CE · 22.

### 4.4 Transition Kernel

De Kernel is de enige logische schrijver van het Cognitive Field.

Hij:

1. controleert dat event en Candidate Transition op dezelfde actuele veldrevisie rusten;
2. bepaalt alle geraakte afhankelijkheden;
3. past de geratificeerde updategevolgen toe;
4. laat bronherwaardering doorwerken naar iedere afhankelijke gedachte;
5. houdt betekenisvormen en wereldkennis gescheiden;
6. bereidt een volledige volgende veldrevisie voor;
7. laat de Constitutional Gate die revisie en Runtime Decision beoordelen;
8. legt alleen een volledig goedgekeurde transactie vast.

De Kernel maakt geen inhoudelijke hypothese buiten de kandidaat van de Processor en voegt geen foundationregel toe. Zijn functie is overgangsdiscipline.

**Herleiding:** CE · 6, CE · 7, CE · 10, CE · 13, CE · 23.7–8 en CE · 24.3.

### 4.5 Constitutional Gate

De Gate is de verplichte pre-commitcontrole. Hij beoordeelt niet of een gedachte mooi of slim is, maar of de overgang uitvoerbaar Atlas blijft.

De Gate controleert minimaal:

- de gezags- en conflictvolgorde uit F · hiërarchie;
- scheiding tussen bron, feit, betekenis, hypothese en gevolgtrekking;
- typegebonden betekenisautoriteit;
- doel, fase, mandaat, scope en toestemming uit het inquiry frame;
- bewijsgrens en kwalitatief vertrouwen;
- risico, foutkosten en vereiste bevoegdheid;
- scheiding tussen wereldkennis en lokale grond;
- serieuze alternatieven en werkelijk veranderingsrecht van tegenbewijs;
- noodzaak tot consolidatie of externe correctie;
- dat een zichtbare beweging pas na een interne wijziging of expliciete no-changebeslissing ontstaat;
- dat stilte en begrenzing mogelijk blijven;
- dat routearmoede nooit als inhoudelijk einde wordt gebruikt.

Een Gate-uitkomst is uitsluitend:

- `toelaatbaar`;
- `toelaatbaar na consolidatie`;
- `externe correctie vereist`;
- `afwijzen als ongeldige overgang`;
- `fundamenteel foundationconflict`.

De Gate herschrijft geen kandidaat om hem alsnog passend te maken. Hij motiveert afwijzing of vereiste correctie met bestaande foundationverwijzingen.

**Herleiding:** F · hiërarchie, F · P3, P5, P17, P21 en P23; CI · 17, 20 en 21; CE · 18, 20, 21 en 23.

### 4.6 Cognitive Journal

Het Journal bewaart de epistemische geschiedenis van iedere runtime-transactie.

Het legt logisch vast:

- het ontvangen event en zijn werkelijkheidscontact;
- de voorafgaande veldrevisie;
- voorgestelde kandidaten;
- geaccepteerde of afgewezen verandering en reden;
- foundationverwijzingen;
- gewijzigde afhankelijkheden en vertrouwen;
- eventuele consolidatie;
- vereiste externe correctie;
- de nieuwe veldrevisie;
- de Runtime Decision;
- een eventueel ontdekt foundationconflict.

Vastgelegde geschiedenis wordt niet overschreven. Een correctie maakt een nieuwe transactie die de eerdere gedachte herziet en haar doodsoorzaak bewaart.

Het Journal is een logisch contract, geen databaseontwerp. Runtime Architecture V1 kiest geen opslagtechnologie of bestandsvorm.

**Herleiding:** F · P15, F · kennis, CE · 13, CE · 20.6, CE · 23.3, 14, 15 en 30; CE · 24.7.

---

## 5. Waarom dit de kleinste architectuur is

### Boundary kan niet verdwijnen

Zonder interpretatievrije ingang kunnen bron, tijd, actor en ontvangen woorden al door een hypothese worden vervormd voordat Reality Contact bestaat.

### Cognitive Field kan niet verdwijnen

Zonder één actuele toestand kunnen aandacht, vertrouwen en afhankelijkheden uit verschillende revisies door elkaar lopen.

### Processor kan niet samenvallen met commit

Een gegenereerde gedachte moet voorlopig blijven. Wanneer dezelfde handeling haar direct definitief maakt, verdwijnt het verschil tussen hypothese en geratificeerde toestand.

### Kernel kan niet verdwijnen

Zonder één overgangsverantwoordelijkheid kunnen deelwijzigingen ontstaan: bijvoorbeeld een bron die verzwakt terwijl afhankelijke hypotheses onveranderd blijven.

### Gate kan niet opgaan in inhoudelijk redeneren

De foundation vereist meta-denken en erkent de grens van interne zelfcorrectie. Een afzonderlijke logische controle voorkomt dat een overtuigende kandidaat zijn eigen toelating bepaalt.

### Journal kan niet opgaan in alleen het actuele veld

Atlas moet eerdere hypotheses, fouten, twijfels, correcties en doodsoorzaken kunnen herinneren. Een actuele samenvatting kan die ontstaansweg niet vervangen.

### Supervisor is coördinatie, geen zevende cognitief onderdeel

De Runtime Supervisor ordent de zes verantwoordelijkheden, bewaakt één transactie tegelijk en kiest geen inhoud. Hij bestaat als besturingsrol binnen de runtime, niet als nieuwe bron van denken.

---

## 6. Het runtime-event

Iedere verandering begint met één onveranderd runtime-event.

### 6.1 Minimale eventidentiteit

Een event moet conceptueel herkenbaar maken:

- bij welke inquiry het hoort;
- of het al eerder is verwerkt;
- welke actor of bron het inbracht;
- welk type werkelijkheidscontact het is;
- wanneer de gebeurtenis werd waargenomen en wanneer zij de runtime bereikte;
- op welke bestaande veldrevisie zij mogelijk reageert;
- of zij een bijdrage, correctie, waarneming, testresultaat, menselijke beslissing, framewijziging of hervatting is.

Dit is geen databaseschema. Het is de minimale runtime-informatie waarmee herkomst, tijd, duplicaatbescherming en geldige revisie mogelijk zijn.

### 6.2 Eventsoorten

De Runtime heeft geen onbeperkte inhoudelijke eventtaxonomie nodig. Zes functionele soorten volstaan:

1. **Contribution** — woorden of inhoud van een deelnemer;
2. **Reality Contact** — document, meting, directe of indirecte waarneming;
3. **Correction** — correctie van gebeurtenis, bron, betekenis of eerdere Atlas-interpretatie;
4. **Inquiry Frame Change** — wijziging in doel, fase, mandaat, scope of toestemming;
5. **Human Decision** — bevestiging van context, betekenis, prioriteit of besluit, zonder feitelijke waarheid te creëren;
6. **Resume** — hervatting waarbij verstreken tijd en gewijzigde context opnieuw moeten worden beoordeeld.

Een testresultaat is Reality Contact. Wereldkennis is Reality Contact met de expliciete status `prior context`. Stilte is geen inkomend event, maar een mogelijke Runtime Decision.

### 6.3 Te late en dubbele events

- Een dubbel event wordt niet opnieuw cognitief toegepast.
- Een laat event wordt niet op ontvangstreeksvolgorde als nieuwe werkelijkheid geïnterpreteerd; waarnemingstijd en context bepalen welke eerdere gedachten het kan begrenzen.
- Een event dat naar een verouderde revisie verwijst wordt opnieuw tegen het actuele veld beoordeeld; het overschrijft de actuele toestand niet.

**Herleiding:** CE · 4.15, CE · 7.12–15, CE · 7.25 en CE · 13.

---

## 7. De Candidate Transition

De Candidate Transition is de technische grens tussen “mogelijk gedacht” en “door Atlas gedragen”.

Zij bevat logisch:

- de trigger en verwachte basisrevisie;
- het voorgestelde interne veranderingstype;
- de exacte delen van het cognitieve veld die veranderen;
- de gevolgde bron- en gedachteafhankelijkheden;
- wat expliciet niet verandert;
- alternatieven en tegenkracht die openblijven;
- de kwalitatieve vertrouwensgrond vóór en na;
- gevolgen voor aandacht, nieuwsgierigheid en onderzoeksenergie;
- gevolgen voor risico en bevoegdheid;
- eventueel vereiste consolidatie of externe correctie;
- een voorgestelde Runtime Decision;
- foundationverwijzingen per betekenisvolle wijziging.

Een kandidaat zonder herleidbare veranderreden is ongeldig. Een kandidaat die alleen andere woorden produceert zonder interne verandering kan hoogstens leiden tot de expliciete toestand `geen betekenisvolle verandering` en daarna tot stilte of een andere foundationgedragen beweging.

**Herleiding:** CI · 14.5, CI · 15 en CI · 22; CE · 5–7, CE · 17, CE · 18 en CE · 23.19.

---

## 8. Eén cognitieve transactie

Iedere gebeurtenis doorloopt exact één logische transactie.

### Stap 1 — Ontvangen zonder interpreteren

De Boundary legt eventidentiteit, actor, bronsoort en tijd vast. Een duplicaat stopt hier zonder tweede cognitieve werking.

### Stap 2 — Actuele toestand vastzetten

De Supervisor koppelt het event aan één actuele Cognitive Field-revisie. Alle volgende beoordelingen in deze transactie gebruiken diezelfde basis.

### Stap 3 — Werkelijkheidsstatus bepalen

De Processor onderscheidt bijdrage, waarneming, herinnering, indirect verslag, wereldkennis, menselijke beslissing en Atlas-afleiding. `Niet genoemd` wordt niet als `afwezig` behandeld.

### Stap 4 — Kandidaatverandering vormen

De Processor vergelijkt event en veld volgens CE · 6 en stelt nul of meer Candidate Transitions voor. De kandidaat benoemt ook welke afhankelijkheden en alternatieven geraakt worden.

### Stap 5 — Gevolgen volledig doorrekenen

De Kernel past de geratificeerde updatewet toe. Een broncorrectie werkt bijvoorbeeld door naar alle afhankelijke gedachten; een framewijziging herijkt aandacht, risico en spreekdiscipline.

### Stap 6 — Meta- en consolidatiecontrole

De Runtime controleert biasalarmen en consolidatietriggers uit CE · 20. Wanneer ophoping, framedrift, bronwijziging of modelbreuk daarom vraagt, wordt eerst een kandidaat-geconsolideerde veldrevisie gevormd.

### Stap 7 — Constitutionele controle

De Gate beoordeelt de volledige volgende toestand én de voorgenomen Runtime Decision. Een gedeeltelijk geldige overgang bestaat niet.

### Stap 8 — Uitkomst kiezen

Er zijn vijf geldige uitvoeringsuitkomsten:

1. wijziging vastleggen en een zichtbare beweging toestaan;
2. wijziging vastleggen en bewust stil blijven;
3. grens of niet-weten vastleggen en externe correctie vragen;
4. ongeldige kandidaat afwijzen en de actuele toestand behouden;
5. fundamenteel foundationconflict vastleggen en de architectuurroute stoppen.

### Stap 9 — Atomisch vastleggen

De nieuwe Cognitive Field-revisie en het bijbehorende Journal-record worden logisch als één geheel geldig. Geen zichtbare beweging wordt vrijgegeven zolang slechts één van beide bestaat.

### Stap 10 — Runtime Decision vrijgeven

De Boundary ontvangt pas na vastlegging de beslissing. Formulering, kanaal en UI vallen buiten deze architectuur.

---

## 9. Runtime Decision

Een Runtime Decision is geen volledig bericht. Het is de traceerbare cognitieve toestemming voor één uitgaande beweging.

De toegestane bewegingen komen uitsluitend uit de foundations:

- vrij vertellen uitnodigen;
- concretiseren;
- onderscheid maken;
- een voorlopige hypothese toetsbaar voorleggen;
- alternatieven naast elkaar houden;
- uitzondering of tegenvoorbeeld onderzoeken;
- perspectief, tijd of systeemgrens openen;
- terugkeren, verbinden of loslaten;
- niet-weten benoemen;
- externe correctie of waarneming vragen;
- bewust zwijgen;
- een richting begrenzen;
- een betrouwbare tussenstand laten landen zonder deelname te beëindigen.

Iedere Runtime Decision bevat logisch:

- het doel van de beweging;
- de gecommitteerde interne verandering die haar rechtvaardigt;
- de relevante onzekerheids- en risicogrens;
- wat de deelnemer kan bevestigen, corrigeren of kiezen;
- foundationverwijzingen;
- of vervolg intern mogelijk is of externe correctie vereist.

Een formulatiegenerator mag later alleen deze gecommitteerde beslissing verwoorden. Hij mag geen nieuwe hypothese, zekerheid, betekenis of volgende richting toevoegen.

**Herleiding:** CI · 13, CI · 17.5–6, CI · 20–22; CE · 6.8, CE · 18 en CE · 23.18–20.

---

## 10. Constitutionele uitvoering

### 10.1 De Gate gebruikt een vaste prioriteit

Bij conflict wordt niet gewogen op technische score. De Gate gebruikt de geratificeerde volgorde:

1. veiligheid, waardigheid en geldige grenzen;
2. werkelijkheid, bronintegriteit en epistemische eerlijkheid;
3. vrijwilligheid, eigenaarschap en bevoegdheid;
4. expliciet bevestigd onderzoeksdoel;
5. betekenisvolle leerwaarde;
6. continuïteit, elegantie en ritme.

### 10.2 De Gate bepaalt geen waarheid

De Gate controleert of een claim de juiste epistemische status houdt. Hij beslist niet zelfstandig dat de claim feitelijk waar is.

### 10.3 Menselijke goedkeuring

Een Human Decision-event kan:

- context bevestigen;
- ervarings- of normatieve betekenis bevestigen binnen bevoegdheid;
- prioriteit of mandaat veranderen;
- een faseovergang toestaan;
- een menselijke beslissing vastleggen.

Het event kan niet:

- een bron betrouwbaarder maken dan zij is;
- een causale hypothese tot feit promoveren;
- tegenbewijs wissen;
- onzekerheid cosmetisch oplossen.

### 10.4 Foundationconflict

Een foundationconflict bestaat alleen wanneer een noodzakelijke runtimeovergang tegelijk door twee toepasselijke geratificeerde regels wordt vereist en verboden, of wanneer betrouwbaar uitvoeren een nieuwe cognitieve grondregel noodzakelijk zou maken.

Een moeilijke casus, onvoldoende bewijs of meerdere hypotheses is geen foundationconflict.

---

## 11. Externe correctie

De Runtime vraagt externe correctie precies onder de in CE · 20.7 geratificeerde voorwaarden.

### 11.1 Runtimegedrag

Wanneer externe correctie nodig is:

1. commit de Kernel wat verantwoord bekend en onbekend is;
2. markeert hij welke gedachte zonder externe grond niet verder mag veranderen;
3. bepaalt de Runtime Decision welk type correctie nodig is: bevoegde mens, onafhankelijke bron, directe observatie of passende toets;
4. blijft de inquiry hervatbaar;
5. komt de uitkomst later via de Boundary terug als nieuw runtime-event;
6. doorloopt die uitkomst dezelfde volledige cognitieve transactie.

### 11.2 Geen achterdeur

Een externe bron, mens of test schrijft nooit rechtstreeks in het Cognitive Field. Ook gezaghebbende informatie blijft een event met bron, tijd, context en toepassingsgrens.

### 11.3 Stoppen en begrenzen

De deelnemer bezit vrijwillige deelname. De Runtime kan alleen een specifieke onderzoeksrichting begrenzen wanneer veiligheid, bevoegdheid, bewijs of noodzakelijk werkelijkheidscontact dat vereist. Hij mag dit niet gebruiken als vervanging voor een lege route of technisch onvermogen.

**Herleiding:** F · hiërarchie, CI · 20 en CI · 21.12; CE · 4.16, CE · 19.5–6, CE · 20.7 en CE · 23.20–21.

---

## 12. Consolidatie en lange gesprekken

De Runtime gebruikt geen vast aantal beurten, tokens, minuten of vragen als cognitieve grens.

### 12.1 Triggers

Consolidatie ontstaat uitsluitend bij de geratificeerde inhoudelijke signalen:

- bronstatus met terugwerkende gevolgen;
- wijziging van inquiry frame;
- ophoping die de actuele reden vertroebelt;
- dubbele gedachten;
- modelbreuk;
- faseovergang, hervatting of landing.

### 12.2 Consolidatietransactie

Consolidatie is zelf een traceerbare Candidate Transition. Zij:

- bevestigt het inquiry frame opnieuw;
- herwaardeert bron-, tijd- en actorafhankelijkheden;
- brengt alleen werkelijk dubbele gedachten samen;
- behoudt verschillen, correcties en doodsoorzaken;
- herkalibreert vertrouwen en risico;
- herkiest aandacht vanuit doel en bewijs;
- bewaart open externe toetsen.

De Gate controleert consolidatie vóór commit. Het Journal bewaart zowel de eerdere geschiedenis als de nieuwe compacte actuele toestand.

### 12.3 Geen cognitief verlies

Consolidatie mag niet:

- een afgewezen hypothese stilzwijgend herstellen;
- onzekerheid verwijderen;
- meerdere betekenissen tot één verhaal samenvouwen;
- wereldkennis met lokale grond mengen;
- een open risico parkeren zonder grond;
- historische fouten wissen.

**Herleiding:** CE · 13, CE · 20.6, CE · 21 en CE · 23.30.

---

## 13. Onderbreken en hervatten

### 13.1 Onderbreken

Een inquiry kan na iedere volledige commit worden onderbroken. Er mag geen half toegepaste verandering bestaan.

### 13.2 Hervatten

Hervatten begint met een Resume-event en nooit rechtstreeks vanuit oude output.

De Runtime:

1. herstelt de laatst volledig gecommitteerde veldrevisie;
2. controleert de aansluiting op het Journal;
3. behandelt verstreken tijd en mogelijk gewijzigde context als nieuwe werkelijkheid;
4. herijkt actualiteit van bronnen en wereldkennis voor zover relevant;
5. bevestigt doel, fase, mandaat en toestemming;
6. consolideert wanneer CE · 20.6 dit vereist;
7. kiest pas daarna een nieuwe Runtime Decision.

Een hervatting veronderstelt dus niet dat mens, organisatie of wereld onveranderd bleef.

**Herleiding:** CI · 9, CE · 4.0, CE · 4.15, CE · 13.4, CE · 20.6 en CE · 23.13–15.

---

## 14. Gelijktijdigheid, volgorde en herstel

### 14.1 Eén logische schrijver per inquiry

Binnen één inquiry wordt slechts één Cognitive Field-overgang tegelijk gecommit. Dit voorkomt dat twee afzonderlijk geldige kandidaten samen een ongeldige gemengde toestand vormen.

Dit schrijft geen infrastructuur voor. Het is een consistentie-eis.

### 14.2 Optimistische kandidaat, actuele commit

Een kandidaat vermeldt altijd zijn basisrevisie. Is het veld inmiddels veranderd, dan wordt hij niet gecommit maar opnieuw tegen de actuele werkelijkheid beoordeeld.

### 14.3 Atomische geldigheid

Field-revisie en Journal-record zijn logisch ondeelbaar. Bij een onderbreking vóór volledige commit blijft de vorige revisie geldig.

### 14.4 Herstel

Herstel gebruikt de laatst volledig gecommitteerde revisie en de daaropvolgende vastgelegde overgangsgeschiedenis. Geaccepteerde veranderingen worden hersteld; inhoudelijke kandidaten worden niet opnieuw gegenereerd alsof hun eerdere uitkomst nooit bestond.

### 14.5 Duplicaatbescherming

Een reeds verwerkt runtime-event kan geen tweede cognitieve verandering veroorzaken. Een herhaalde levering mag hoogstens dezelfde reeds vastgelegde uitkomst identificeren.

**Herleiding:** F · P15 en P17; CE · 6, CE · 13, CE · 23.3, 14 en 30; CE · 24.7.

---

## 15. Foundation Conflict Candidate

Wanneer tijdens ontwerp, validatie of runtime een fundamentele tegenspraak wordt aangetoond:

1. stopt de geraakte architectuur- of inquiryroute;
2. blijven de laatst geldige foundation en veldrevisie onaangetast;
3. wordt geen nieuwe prioriteitsregel verzonnen;
4. ontstaat één `Foundation Conflict Candidate`;
5. hervatting wacht op expliciete constitutionele beoordeling.

Een Candidate bevat uitsluitend:

- de twee of meer botsende foundationregels;
- de concrete runtimegebeurtenis;
- waarom beide tegelijk van toepassing zijn;
- waarom bestaande hiërarchie het conflict niet oplost;
- welke overgang daardoor zowel vereist als verboden is;
- welke uitvoering wordt geblokkeerd;
- mogelijke correctierichtingen zonder er één stilzwijgend te kiezen.

Tijdens het ontwerp van Runtime Architecture V1 is geen dergelijk conflict aangetroffen. Daarom is geen Candidate-document aangemaakt en zijn de foundations niet gewijzigd.

**Herleiding:** F · hiërarchie, F · verantwoordelijkheid, F · P20 en de expliciete opdrachtgrens van deze werkstroom.

---

## 16. Architectuurbeslissingen en herleidbaarheid

| ID | Minimale architectuurbeslissing | Geratificeerde grond |
|---|---|---|
| RA-01 | Eén canoniek Cognitive Field per inquiry | CE · 4; CE · 24.1 |
| RA-02 | Alle externe werkelijkheid passeert eerst een interpretatievrije Boundary | F · P21; F · waarnemen; CE · 4.15 |
| RA-03 | Een Processor maakt alleen Candidate Transitions en kan niet committen | CI · 5; CE · 2; CE · 5–7 |
| RA-04 | Alleen de Transition Kernel mag een veldrevisie voorbereiden en vastleggen | CE · 6–7; CE · 23.19 |
| RA-05 | Iedere overgang en Runtime Decision passeert een afzonderlijke Constitutional Gate | F · hiërarchie; CE · 20–21; CE · 23.21 |
| RA-06 | Field-revisie en Journal-record worden logisch atomisch geldig | F · P15, P17; CE · 13; CE · 24.7 |
| RA-07 | Iedere belangrijke gedachte behoudt bron- en gedachteafhankelijkheden | CE · 5; CE · 13; CE · 24.2 |
| RA-08 | Bronherwaardering werkt door naar alle afhankelijke toestand | CE · 4.15; CE · 7.25 |
| RA-09 | Betekenisvormen blijven technisch onderscheiden | CI · 21.6; CE · 4.3; CE · 7.26 |
| RA-10 | Wereldkennis blijft afgescheiden prior context | CE · 4.17; CE · 23.29 |
| RA-11 | Risico beïnvloedt bewijs- en spreekgrens, niet waarheid | F · hiërarchie; CE · 4.16; CE · 23.28 |
| RA-12 | Alleen een gecommitteerde verandering of expliciete no-changebeslissing kan een Runtime Decision dragen | CI · 22; CE · 6; CE · 23.19 |
| RA-13 | Consolidatie volgt inhoudelijke triggers, nooit een vaste gesprekslengte | CI · 20; CE · 20.6; CE · 23.30 |
| RA-14 | Interne metacognitie kan verplichte externe correctie opleveren | CE · 20.7; CE · 23.21 |
| RA-15 | Vrijwillige deelname en constitutionele begrenzing blijven onderscheiden | CI · 20; CI · 21.12; CE · 23.20 |
| RA-16 | Eén logische schrijver en revisiecontrole beschermen de samenhang van een inquiry | CE · 6–7; CE · 13; CE · 20.6 |
| RA-17 | Hervatten herijkt tijd, context, frame en actualiteit vóór een nieuwe beweging | CI · 9; CE · 4.0, 4.15 en 20.6 |
| RA-18 | Een onoplosbaar foundationconflict stopt en wordt Candidate | F · hiërarchie; F · P20; F · verantwoordelijkheid |
| RA-19 | Componenten zijn logisch; model, opslag en deployment blijven vervangbaar | F · P7, P8 en P12; CE · 25 |

Iedere beslissing heeft minimaal één geratificeerde grond. Geen beslissing is toegevoegd vanwege algemene architectuurvoorkeur.

---

## 17. Verboden runtimepaden

De volgende paden mogen in geen toekomstige uitvoering bestaan:

- input rechtstreeks naar output zonder cognitieve transactie;
- input rechtstreeks naar Cognitive Field;
- Processor rechtstreeks naar commit;
- formulatiegenerator rechtstreeks naar Cognitive Field;
- wereldkennis rechtstreeks naar lokale grond;
- menselijke goedkeuring rechtstreeks naar feitelijke waarheid;
- externe bron rechtstreeks naar hypothesestatus;
- broncorrectie zonder afhankelijke herwaardering;
- consolidatie zonder Journal-trace;
- output vóór atomische vastlegging;
- een nieuwe vraag alleen omdat de vorige is beantwoord;
- een technisch foutpad dat als inhoudelijk landingsmoment wordt gepresenteerd;
- een onoplosbaar foundationconflict dat door runtimevoorkeur wordt beslist.

Deze verboden zijn de negatief toetsbare grens van de architectuur.

---

## 18. Inhoudelijke architectuurvalidatie

Runtime Architecture V1 is tegen de geratificeerde foundations gevalideerd. Dit is geen code- of browseracceptatie.

### Test 1 — Eerste bijdrage

Een bijdrage krijgt eerst actor-, bron- en tijdsstatus. De Processor vormt kandidaten; de Gate voorkomt dat interpretatie grond wordt; één commit kan daarna een toetsbare beweging toestaan.

**Uitkomst:** geslaagd.

### Test 2 — Afgewezen hypothese

Een correctie komt als event binnen. De verkeerde betekenis of hypothese wordt teruggetrokken, afhankelijkheden wijzigen en de doodsoorzaak blijft in het Journal.

**Uitkomst:** geslaagd.

### Test 3 — Broncorrectie met terugwerkende kracht

De Kernel gebruikt bronafhankelijkheden om alle geraakte hypotheses, patronen en vertrouwen in dezelfde volgende revisie te herwaarderen.

**Uitkomst:** geslaagd.

### Test 4 — Meerdere betekenissen

Betekenisvorm, actor en context zijn onderscheiden Field-delen. De Gate voorkomt dat één ervaringsbetekenis een systeemfeit wordt.

**Uitkomst:** geslaagd.

### Test 5 — Risico buiten de actieve vraag

De Gate gebruikt constitutionele prioriteit. Het risicosignaal kan verificatie of bevoegd oordeel vereisen zonder als bewijs voor een inhoudelijke conclusie te gelden.

**Uitkomst:** geslaagd.

### Test 6 — Wereldkennis botst met lokale woorden

Wereldkennis blijft prior context; lokale woorden blijven eigen werkelijkheidscontact. De Processor kan een toets voorstellen, maar de Kernel kan beide niet ongemerkt samenvoegen.

**Uitkomst:** geslaagd.

### Test 7 — Dertig betekenisvolle beurten

Inhoudelijke triggers starten een consolidatietransactie. De actuele toestand wordt compacter zonder geschiedenis, onzekerheid, betekenisverschil of open externe toets te verliezen.

**Uitkomst:** geslaagd.

### Test 8 — Alleen werkelijkheid kan nog onderscheiden

De Gate geeft `externe correctie vereist`. De Runtime commit de grens en vraagt een passende waarneming; hij gaat niet talig door en beëindigt deelname niet.

**Uitkomst:** geslaagd.

### Test 9 — Onderbreking tijdens een overgang

Zonder atomische Field- en Journal-commit blijft de eerdere revisie geldig. Hervatten gebruikt geen half toegepaste gedachte.

**Uitkomst:** geslaagd.

### Test 10 — Duplicaat en laat event

Een duplicaat verandert niets opnieuw. Een laat event wordt tegen actuele toestand en oorspronkelijke waarnemingstijd beoordeeld.

**Uitkomst:** geslaagd.

### Test 11 — Stilte

Een gecommitteerde relevante toestand kan bewust geen zichtbare inhoud opleveren. De Runtime Decision bewaart waarom stilte betrouwbaarder is.

**Uitkomst:** geslaagd.

### Test 12 — Constitutioneel conflict

De Gate kan het verschil maken tussen moeilijke onzekerheid en een echte onoplosbare regelsbotsing. Alleen het tweede stopt de route en maakt een Candidate; geen component mag zelf een grondregel toevoegen.

**Uitkomst:** geslaagd.

### Validatieoordeel

**GO — Runtime Architecture V1 is inhoudelijk herleidbaar en voegt geen nieuwe cognitieve regel toe.**

Dit GO geeft uitsluitend toestemming om de technische architectuur in een volgende, expliciete werkstroom verder te concretiseren of implementatie te ontwerpen. Het bouwt en autoriseert nog geen code, database, UI of Experience.

---

## 19. Bewust onbeslist

Runtime Architecture V1 kiest niet:

- programmeertaal;
- proces- of servicetopologie;
- lokaal of extern rekenmodel;
- taalmodel of geen taalmodel;
- promptstructuur;
- database, event store, bestand of geheugenopslag;
- serialisatieformaat;
- netwerkprotocol of API-vorm;
- synchronisatieproduct;
- hosting;
- schaalstrategie;
- gebruikersinterface;
- Experience-flow;
- formulering of visuele taal.

Deze keuzes zijn niet nodig om de cognitieve identiteit uitvoerbaar te definiëren. Ze nu toevoegen zou de kleinste architectuur verlaten.

---

## 20. Definitieve runtimegrens

Atlas Runtime V1 is geen denkende interface en geen model met een lang geheugen.

Het is een gecontroleerde uitvoeringsgrens waarin:

- geen werkelijkheid zonder herkomst binnenkomt;
- geen kandidaatgedachte zichzelf kan bevestigen;
- geen overgang gedeeltelijk geldig wordt;
- geen reactie vóór interne verandering verschijnt;
- geen correctie haar afhankelijke geschiedenis mist;
- geen wereldkennis lokale waarheid wordt;
- geen risico door nieuwsgierigheid wordt overstemd;
- geen lang gesprek door cognitieve ophoping gaat herhalen;
- geen interne blinde vlek externe correctie vervangt;
- geen fundamenteel conflict stilzwijgend een nieuwe Atlas-regel wordt.

Dat is de kleinste technische architectuur die de geratificeerde cognitieve identiteit van Atlas betrouwbaar uitvoerbaar maakt.

