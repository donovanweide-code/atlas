# Werkwijze Architecture

**Status:** Architecture Candidate — ter review  
**Actieve fase:** Architectuur  
**Volgende fase na GO:** Copy Candidate  
**Buiten scope:** publiekscopy, titels, CTA’s, ontwerp, wireframes, componenten, metadata-implementatie en code

## 1. Opdracht

De pagina Werkwijze moet aantonen dat de methode waarmee de Homepage Experience tot stand kwam reproduceerbaar is.

Dat betekent niet dat iedere pagina dezelfde vorm, secties of taal krijgt. Reproduceerbaarheid betekent dat dezelfde discipline opnieuw tot een onderbouwde, begrensde route-architectuur leidt:

1. eerst de werkelijkheid onderzoeken;
2. feiten, interpretaties en onzekerheden scheiden;
3. één primaire ondernemersvraag kiezen;
4. de inhoudelijke en emotionele beweging bepalen;
5. claims begrenzen tot wat aantoonbaar is;
6. bewijsbehoefte expliciet maken;
7. verantwoordelijkheden van aangrenzende routes bewaken;
8. pas na review en GO doorgaan naar copy.

Dit document voert uitsluitend die architectuurfase uit.

## 2. Canonieke basis

### Goedgekeurde bronnen

- `Foundation.md`
- `PUBLIC_EXPERIENCE_ARCHITECTURE.md`
- `SEO_FOUNDATION_REVIEW.md`
- de definitief goedgekeurde Homepage Experience

### Bestaande repositorywerkelijkheid

- `website/src/public-pages.ts` bevat een bestaande Werkwijze-route.
- Die route beschrijft vijf bewegingen: beginnen bij de werkelijkheid, samenhang zichtbaar maken, verbeelden vóór vastleggen, beheersbaar bouwen en context blijven dragen.
- De route gebruikt een vaste nummering en verwijst daarna rechtstreeks naar Projecten.

De bestaande route is onderzoeksbewijs van eerder werk, maar heeft niet dezelfde expliciete GO-status als de homepage en de Public Experience Foundation.

## 3. Feiten, interpretaties en onzekerheden

## 3.1 Feiten

- We Build And Design helpt ervaren ondernemers hun volgende stap begrijpen, zichtbaar maken en zorgvuldig bouwen.
- De ondernemer kent zijn vak, klanten, geschiedenis en ambitie; We Build And Design luistert, ordent en verbindt.
- De eerste vraag is niet automatisch de werkelijke vraag.
- De oplossing staat niet vooraf vast.
- De Foundation beschrijft de Atlas Method als herhaalbare werkwijze, niet als lineair verkooppraatje.
- De methode omvat Intake, Begrijpen, Structuur, Richting, Ontwerpen, Bouwen, Begeleiden, Verbeteren en leren.
- Feiten, aannames en onzekerheden blijven van elkaar onderscheiden.
- Een inzicht of vervolgstap is herleidbaar en wordt door een mens bevestigd.
- Technologie blijft gereedschap.
- Na de homepage is Werkwijze de goedgekeurde standaardverdieping.
- Na Werkwijze is Diensten de goedgekeurde standaardverdieping.

## 3.2 Interpretaties

- De bezoeker heeft op Werkwijze geen behoefte aan alle negen interne methodestappen. Hij wil vooral kunnen beoordelen of de manier van werken hem beschermt tegen een te vroege of verkeerde oplossing.
- De route moet vertrouwen opbouwen door beslismomenten en verantwoordelijkheden zichtbaar te maken, niet door veel procesinformatie te tonen.
- De belangrijkste onderscheidende beweging is niet “strategie → ontwerp → techniek”, maar “eerste vraag → begrip → gedragen keuze → zorgvuldige uitvoering → leren van werkelijk gebruik”.
- Niet handelen, uitstellen of nader onderzoeken hoort bij een geloofwaardige werkwijze wanneer bewijs ontbreekt.
- Werkwijze mag de praktische vormen van hulp kort herkenbaar maken, maar Diensten blijft verantwoordelijk voor de volledige duiding daarvan.

## 3.3 Onzekerheden

- Niet iedere opdracht doorloopt alle negen Foundation-stappen in dezelfde zichtbare volgorde of omvang.
- Er is nog geen goedgekeurde publieke set artefacten die iedere methodestap bewijst.
- De precieze operationele vorm van begeleiding, reviews, monitoring en nazorg is nog niet als publieke standaardbelofte bevestigd.
- Er zijn nog geen goedgekeurde klantcitaten of meetbare resultaten die specifiek de werkwijze onderbouwen.
- Het is niet bevestigd welke interne termen voor ondernemers natuurlijk en begrijpelijk zijn.
- De bestaande route beweert dat context ook na livegang begrijpelijk blijft; de structurele bewijsbasis voor die brede publieke belofte moet nog worden bevestigd.

Deze onzekerheden mogen in de copyfase niet stilzwijgend als zekerheid worden ingevuld.

## 4. Primaire routeverantwoordelijkheid

### Rol binnen de totale Experience

Werkwijze maakt geloofwaardig hoe We Build And Design voorkomt dat een eerste vraag te snel een definitieve oplossing wordt.

De pagina laat de logica van zorgvuldige samenwerking begrijpen:

- beginnen bij de bestaande werkelijkheid;
- relevante signalen samenbrengen;
- onderscheid maken tussen weten en aannemen;
- samen één betekenisvolle keuze dragen;
- pas daarna zichtbaar maken en bouwen;
- blijven kijken of het resultaat in werkelijk gebruik waarde toevoegt.

Werkwijze legt Atlas niet uit. De methode wordt voelbaar door de kwaliteit van de beslissingen die zij mogelijk maakt.

### Primaire ondernemersvraag

> Hoe zorgen jullie dat ik niet te snel in een verkeerde oplossing terechtkom?

### Onderliggende vragen

- Hoe leren jullie mijn bedrijf werkelijk kennen?
- Wat doen jullie met wat al goed werkt?
- Hoe onderscheiden jullie feiten, aannames en onzekerheden?
- Wanneer is er voldoende begrip om een richting te kiezen?
- Welke rol houd ik zelf in die keuze?
- Wanneer worden ontwerp en technologie relevant?
- Wat gebeurt er wanneer nog niet handelen zorgvuldiger is?
- Hoe blijft een volgende stap beheersbaar?
- Hoe leren jullie van wat er na uitvoering werkelijk gebeurt?

### Gewenste uitkomst

Na deze route begrijpt de ondernemer:

> Ik hoef niet vooraf alle antwoorden te hebben. Ik kan wel beoordelen of de manier waarop antwoorden ontstaan zorgvuldig, begrijpelijk en gezamenlijk is.

## 5. Emotionele architectuur

De route beweegt niet van onwetendheid naar volledige zekerheid. Zij beweegt van onzekerheid naar procesvertrouwen.

| Fase | Beginsituatie ondernemer | Inhoudelijke functie | Emotionele overgang |
|---|---|---|---|
| 1. Erkenning | “Ik heb een vraag, maar misschien nog niet de juiste.” | Normaliseren dat de oplossing nog openstaat | Van spanning naar opluchting |
| 2. Aandacht | “Zien jullie wat ik al heb opgebouwd?” | Tonen dat bestaande context en waarde eerst worden onderzocht | Van voorzichtigheid naar gezien worden |
| 3. Helderheid | “Hoe voorkomen we aannames?” | Uitleggen hoe feiten, vragen en onzekerheden uit elkaar blijven | Van vaagheid naar overzicht |
| 4. Eigenaarschap | “Wie bepaalt wat de volgende stap wordt?” | Tonen dat richting samen wordt gekozen en begrensd | Van afhankelijkheid naar gedragen vertrouwen |
| 5. Vakmanschap | “Wat gebeurt er zodra de richting klopt?” | Plaatsen van ontwerp en technologie als zorgvuldige uitvoering | Van abstract vertrouwen naar praktische geloofwaardigheid |
| 6. Continuïteit | “Is oplevering het eindpunt?” | Begrenzen dat werkelijk gebruik aanleiding kan geven tot gerichte verbetering | Van eindpuntdenken naar rustige voortzetting |

Iedere fase moet de volgende verdienen. Geen fase mag uitsluitend als sfeer- of procesdecoratie bestaan.

## 6. Inhoudelijke hoofdstukken

Dit zijn functies, geen voorgestelde publiekskoppen of secties.

## 6.1 Hoofdstukfunctie: de vraag mag nog openstaan

### Verantwoordelijkheid

De bezoeker laten landen vanuit de homepage en bevestigen dat een onvolledige of oplossingsgerichte eerste vraag een geldig vertrekpunt is.

### Moet duidelijk worden

- Een concrete vraag zoals “onze website moet vernieuwd” wordt serieus genomen.
- Die formulering wordt nog niet automatisch de opdracht.
- Begrip gaat vooraf aan advies, ontwerp, offerte of techniek.

### Claimgrens

Niet beloven dat WBD altijd een verborgen “diepere waarheid” vindt. De methode onderzoekt of de eerste vraag voldoende compleet is.

## 6.2 Hoofdstukfunctie: beginnen bij de bestaande werkelijkheid

### Verantwoordelijkheid

Laten zien dat bedrijf, klanten, ambitie, processen en bestaand digitaal fundament samen de context vormen.

### Moet duidelijk worden

- Wat vandaag al waarde heeft, krijgt bescherming.
- De ondernemer brengt kennis van zijn bedrijf mee.
- WBD brengt afstand, vragen, structuur en vakmanschap mee.
- Luisteren is actief onderzoek, geen vrijblijvende houding.

### Claimgrens

Niet suggereren dat één intakegesprek volledige bedrijfskennis oplevert.

## 6.3 Hoofdstukfunctie: van signalen naar helderheid

### Verantwoordelijkheid

Begrijpelijk maken hoe losse informatie leidt tot een controleerbaar beeld zonder interne Atlas-modellen uit te leggen.

### Moet duidelijk worden

- Feiten, aannames en onzekerheden worden herkenbaar uit elkaar gehouden.
- Betere vragen gaan vooraf aan conclusies.
- Samenhang en prioriteit zijn belangrijker dan hoeveelheid informatie.
- Ontbrekende kennis blijft zichtbaar onbekend.

### Claimgrens

Niet presenteren alsof Atlas autonoom bepaalt wat waar of belangrijk is.

## 6.4 Hoofdstukfunctie: samen richting kiezen

### Verantwoordelijkheid

Tonen wanneer onderzoek voldoende richting geeft om één betekenisvolle volgende stap te kiezen.

### Moet duidelijk worden

- De ondernemer blijft eigenaar van de keuze.
- WBD adviseert en maakt gevolgen begrijpelijk.
- Ook wat bewust niet wordt gedaan hoort bij de richting.
- Uitstellen of nader onderzoeken kan een geldige uitkomst zijn.

### Claimgrens

Niet beloven dat iedere onzekerheid verdwijnt of dat iedere keuze zonder risico is.

## 6.5 Hoofdstukfunctie: zichtbaar maken vóór definitief maken

### Verantwoordelijkheid

Plaatsen van strategie, ontwerp en verbeelding als middelen om een gekozen richting samen te beoordelen voordat techniek haar vastlegt.

### Moet duidelijk worden

- Ideeën worden bespreekbaar en toetsbaar gemaakt.
- De gekozen vorm hangt af van de vraag.
- Beoordelen gaat vooraf aan definitief bouwen.

### Claimgrens

Geen vaste lijst wireframes, prototypes of andere deliverables beloven. Dat hoort bij de gekozen opdracht en later bij Diensten.

## 6.6 Hoofdstukfunctie: zorgvuldig uitvoeren en blijven leren

### Verantwoordelijkheid

Tonen dat bouwen beheersbaar gebeurt en dat werkelijk gebruik belangrijker is dan de oplevering op zichzelf.

### Moet duidelijk worden

- Technologie ondersteunt de gekozen richting.
- Uitvoering gebeurt in begrijpelijke, controleerbare stappen.
- Kwaliteit omvat toegankelijkheid, performance, vindbaarheid, veiligheid en onderhoudbaarheid.
- Verbetering volgt op werkelijk gebruik en aantoonbare waarde.

### Claimgrens

Geen continue monitoring, vaste reviewfrequentie, responstijd of langdurige begeleiding beloven voordat die operationeel bevestigd is.

## 7. Bewijsarchitectuur

Werkwijze mag niet alleen vertellen dat WBD zorgvuldig werkt. De route moet later aantoonbare signalen gebruiken die de methode bewijzen zonder haar als software te demonstreren.

| Te bewijzen betekenis | Toelaatbare bewijsvorm | Huidige bewijsstatus |
|---|---|---|
| De eerste vraag wordt niet automatisch de opdracht | Een begrensde praktijkobservatie waarin onderzoek de vraag bevestigde of bijstelde | Foundation bevestigt principe; publieke case nog nodig |
| Bestaande waarde wordt beschermd | Een concrete keuze om iets te behouden, gericht te verbeteren of bewust niet opnieuw te bouwen | Homepagepositionering bevestigd; praktijkbewijs nog nodig |
| Aannames blijven herkenbaar | Een geanonimiseerd voorbeeld van feit, open vraag en besluitgrens | Interne methode bevestigd; publieke vorm nog niet goedgekeurd |
| De ondernemer draagt de keuze | Een review- of beslismoment met menselijke bevestiging | Foundation bevestigd; extern bewijs nog nodig |
| Ontwerp voorkomt te vroege technische vastlegging | Een beoordeelbaar tussenresultaat gekoppeld aan een echte keuze | Werkwijze bevestigd; publiceerbaar artefact nog nodig |
| Verbetering volgt op werkelijk gebruik | Een resultaat, herzien besluit of aantoonbare les na oplevering | Foundation bevestigd; publieke bewijsset ontbreekt |

### Bewijsregel

Een bewijsfragment hoort alleen op Werkwijze wanneer het primair laat zien **hoe een keuze ontstond**.

Wanneer het fragment vooral de volledige klantcontext, uitvoering en uitkomst bewijst, hoort het primair bij Projecten. Werkwijze mag er dan beknopt naar verwijzen.

## 8. Wat bewust niet op Werkwijze thuishoort

- Een uitleg van Atlas als product, platform, assistent of Workspace.
- Screenshots van interne software als zelfstandig bewijs.
- Alle negen Foundation-stappen als verplichte publieke funnel.
- Een technisch procesdiagram dat menselijke afweging vervangt.
- Dienstenpakketten, prijzen of deliverablelijsten.
- Uitgebreide cases en portfolio-eindbeelden.
- Een persoonlijk oprichtersverhaal; dat hoort primair bij Over ons.
- Een lang contactformulier of verkoopargument.
- SEO-termen die geen natuurlijke ondernemersvraag beantwoorden.
- Route-, kompas- of andere symboliek zonder aantoonbare functie.
- Claims over snelheid, gegarandeerde groei of resultaten zonder bewijs.

## 9. Aansluiting op andere routes

## 9.1 Binnenkomst vanaf Homepage

Homepage laat de bezoeker begrijpen:

> Mijn eerste oplossing hoeft nog niet de werkelijke vraag te zijn.

Werkwijze neemt precies daar over en beantwoordt:

> Hoe ontstaat dan wél een zorgvuldige volgende stap?

De route mag de homepage niet opnieuw samenvatten. Zij begint bij het vertrouwen dat nog moet worden verdiend.

## 9.2 Binnenkomst buiten de Homepage

Een ondernemer kan via een zoekmachine of externe verwijzing rechtstreeks op Werkwijze landen.

Daarom moet de route zelfstandig duidelijk maken:

- wie WBD helpt;
- welk probleem de methode voorkomt;
- welke rol ondernemer en WBD ieder hebben;
- dat de oplossing niet vooraf vaststaat;
- welke volgende verdieping logisch is.

Dit vraagt context, maar geen herhaling van de volledige homepage.

## 9.3 Overgang naar Diensten

Na Werkwijze is de logische vraag:

> Als jullie zo tot een keuze komen, welke vormen van hulp kunnen daar dan uit volgen?

Diensten neemt de verantwoordelijkheid over voor:

- mogelijke vormen van behouden, verbeteren, vernieuwen, uitbreiden en begeleiden;
- de samenhang tussen strategie, ontwerp en technologie;
- grenzen van het actuele aanbod.

Werkwijze mag deze mogelijkheden signaleren, maar niet uitwerken als aanbod.

## 10. Semantische en SEO-architectuur

Dit onderdeel bepaalt betekenis, geen metadata- of code-implementatie.

### Semantische hoofdstructuur

- Eén routegebonden H1 met de primaire ondernemersvraag of betekenis.
- Eén `main` voor de unieke route-inhoud.
- Inhoudelijke hoofdstukken als benoemde `section`-elementen.
- `article` alleen voor zelfstandig bruikbare bewijsfragmenten.
- Siteheader, navigatie en sitefooter als zelfstandige landmarks.
- Een betekenisvolle overgang naar Diensten.
- Geen numerieke secties tenzij gebruikerstests aantonen dat ze werkelijk oriëntatie bieden.

### Zoekintentie die natuurlijk wordt bediend

- digitale strategie;
- website verbeteren of vernieuwen;
- eerst strategie dan website;
- digitale partner;
- digitale begeleiding;
- online aanwezigheid verbeteren;
- bestaande website doorontwikkelen.

Deze termen zijn geen verplichte woordenlijst. De route moet de achterliggende vragen beantwoorden in natuurlijke taal.

### AI readiness

Na het lezen van Werkwijze moet een AI-systeem op basis van zichtbare inhoud correct kunnen uitleggen:

1. WBD begint bij de bedrijfswerkelijkheid, niet bij een vooraf gekozen product.
2. De eerste vraag wordt onderzocht voordat zij een opdracht wordt.
3. Feiten, aannames en onzekerheden blijven onderscheiden.
4. De ondernemer bevestigt en draagt de keuze.
5. Ontwerp en technologie volgen op richting.
6. Werkelijk gebruik bepaalt of verdere verbetering waarde toevoegt.

Wanneer één van deze antwoorden alleen uit structured data of verborgen tekst kan worden afgeleid, is de zichtbare route nog onvoldoende.

## 11. Ontwerpprincipes voor een latere fase

Dit zijn grenzen, geen Experience Design.

- De ondernemer blijft visueel en inhoudelijk het middelpunt.
- Mensen, gesprekken, werktafels, beslissingen en beoordeelbare tussenresultaten hebben voorrang boven abstracte methodebeelden.
- Symboliek is uitsluitend toegestaan voor herkenning, begrip, richting, vertrouwen of een betekenisvolle overgang.
- De route mag geen fictieve Atlas-wereld worden.
- Rust betekent niet dat bewijs wordt weggelaten.
- Procesvertrouwen ontstaat door begrijpelijke beslissingen, niet door veel stappen te tonen.
- SEO ondersteunt de route en mag haar menselijke ritme niet vervangen.

## 12. Reproduceerbaarheid van de methode

De Homepage-methode is op Werkwijze opnieuw toegepast zonder de homepagevorm te kopiëren.

| Methodische discipline | Homepage | Werkwijze Architecture | Reproduceerbaar resultaat |
|---|---|---|---|
| Onderzoek vóór conclusie | Bestaande Experience, Foundation en praktijk beoordeeld | Foundation, goedgekeurde blueprint en bestaande route opnieuw getoetst | Bestaande vorm is niet automatisch de nieuwe waarheid |
| Eén primaire ondernemersvraag | “Is mijn eerste oplossing wel de werkelijke vraag?” | “Hoe voorkomen jullie dat ik te snel in een verkeerde oplossing terechtkom?” | Iedere route krijgt één eigen verantwoordelijkheid |
| Emotionele beweging | Van oplossingsdruk naar herkenning en openheid | Van onzekerheid naar procesvertrouwen | Architectuur stuurt betekenis vóór pagina-indeling |
| Claims begrenzen | Website is mogelijke uitkomst, geen bestemming | Methode beschermt zorgvuldigheid, maar garandeert geen uitkomst | Geen marketingclaim zonder bewijs |
| Bewijs scheiden van uitleg | Homepage draagt beperkt positioneringsbewijs | Bewijsbehoefte per methodische betekenis vastgelegd | Latere copy weet wat wel en niet gedragen wordt |
| Routegrenzen bewaken | Cases niet volledig op homepage | Diensten en Projecten behouden eigen verantwoordelijkheden | De Experience blijft één geheel zonder duplicatie |
| Symboliek toetsen | Decoratie teruggebracht ten gunste van werkelijkheid | Alleen functionele symboliek toegestaan | Ontwerpprincipe werkt route-onafhankelijk |
| SEO begrenzen | Geen extra SEO-copy op goedgekeurde homepage | Zoekvragen opgenomen zonder woordenlijst of implementatie | SEO volgt betekenis |
| Reviewpoort | Copy en design pas na route-GO | Document stopt vóór copy | Fasen worden opnieuw aantoonbaar gescheiden |

### Conclusie reproduceerbaarheid

De methode is reproduceerbaar op architectuurniveau wanneer zij:

- bij een andere route tot een andere primaire vraag leidt;
- dezelfde bewijsdiscipline en claimgrenzen behoudt;
- de verantwoordelijkheid van aangrenzende routes respecteert;
- zonder ontwerp of copy al duidelijk maakt welke beweging de ondernemer moet ervaren;
- opnieuw stopt bij een expliciete review- en GO-poort.

Aan deze voorwaarden voldoet deze candidate.

De reproduceerbaarheid van de uiteindelijke publiekswerking is nog niet bewezen. Daarvoor zijn achtereenvolgens nodig:

1. architectuurreview en GO;
2. copycandidate en review;
3. Experience Design en review;
4. implementatie;
5. validatie met echte ondernemers.

## 13. Reviewvragen

1. Is “voorkomen dat ik te snel in een verkeerde oplossing terechtkom” de juiste primaire ondernemersvraag?
2. Leidt de route overtuigend van onzekerheid naar procesvertrouwen?
3. Zijn de zes hoofdstukfuncties noodzakelijk en onderling onderscheidend?
4. Is voldoende zichtbaar welke rol en welk eigenaarschap de ondernemer houdt?
5. Zijn begeleiding en verbeteren voldoende eerlijk begrensd?
6. Is duidelijk welk bewijs op Werkwijze hoort en wat naar Projecten moet?
7. Blijft Diensten verantwoordelijk voor de concrete vormen van hulp?
8. Kan een rechtstreekse bezoeker de route zelfstandig begrijpen?
9. Is Atlas voelbaar als discipline zonder als product of fictieve wereld te verschijnen?
10. Is er voldoende basis om na GO een Copy Candidate te maken zonder fundamentele positioneringskeuzes te heropenen?

## 14. GO-criteria

De architectuur kan alleen een GO krijgen wanneer:

- de primaire ondernemersvraag is bevestigd;
- iedere hoofdstukfunctie een unieke inhoudelijke verantwoordelijkheid heeft;
- de emotionele beweging van onzekerheid naar procesvertrouwen klopt;
- claimgrenzen en onzekerheden expliciet blijven;
- de bewijsarchitectuur realistisch en controleerbaar is;
- Werkwijze niet verandert in Diensten, Projecten of Over ons;
- de overgang Homepage → Werkwijze → Diensten logisch blijft;
- symboliek en SEO aantoonbaar ondergeschikt blijven aan de werkelijkheid;
- copy daarna kan starten zonder nieuwe architectuurkeuzes.

## 15. Opleverstatus

Deze sprint levert uitsluitend `WERKWIJZE_ARCHITECTURE.md` op.

Er is nog geen:

- publiekscopy;
- routecandidate;
- ontwerp;
- wireframe;
- component;
- metadata;
- structured data;
- implementatie.

Na review stopt het proces bij deze architectuur. Alleen een expliciete GO opent de Copy-fase.
