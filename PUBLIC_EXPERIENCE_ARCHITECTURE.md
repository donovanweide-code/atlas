# Public Experience Architecture

**Status:** Sprintdocument — ter review  
**Scope:** publieke Experience na de goedgekeurde homepage  
**Referentie:** `Foundation.md`, de goedgekeurde Homepage Experience en de aantoonbare repositorywerkelijkheid  
**Buiten scope:** copy, ontwerp, wireframes, componenten, implementatie en nieuwe functionaliteit

## 1. Doel

Dit document beschrijft de inhoudelijke functie van de vijf resterende publieke routes:

1. Werkwijze
2. Diensten
3. Projecten
4. Over ons
5. Contact

De routes zijn geen losse presentaties en ook geen verplichte funnel. Samen vormen zij een logisch verdiepend verhaal waarin een ondernemer steeds één volgende vraag kan beantwoorden.

De goedgekeurde homepage blijft het vertrekpunt. Daar ontstaat de herkenning:

> Mijn eerste oplossing hoeft nog niet de werkelijke vraag te zijn.

De overige routes moeten die herkenning achtereenvolgens omzetten in vertrouwen in de werkwijze, begrip van mogelijke vormen, bewijs uit de praktijk, vertrouwen in de mensen en bereidheid tot een eerste gesprek.

## 2. Bronnen en bewijsgrenzen

### Feiten

- `Foundation.md` is de canonieke bron voor missie, ideale klant, Atlas Method en ontwerpprincipes.
- De ideale klant is een ervaren ondernemer die al klanten, ervaring en een bedrijf heeft opgebouwd.
- We Build And Design helpt die ondernemer om een volgende stap te begrijpen, zichtbaar te maken en zorgvuldig te bouwen.
- De oplossing staat niet vooraf vast. Een nieuwe website is één mogelijke uitkomst naast behoud, verbetering, uitbreiding, procesverandering of nader onderzoek.
- De goedgekeurde homepage eindigt inhoudelijk met een overgang naar Werkwijze.
- De repository bevat al publieke routes voor Diensten, Werkwijze, Projecten, Over ons en Contact.

### Interpretaties

- De standaardverdieping na de homepage hoort bij Werkwijze, omdat de homepage de oplossing bewust openlaat en rechtstreeks vraagt hoe We Build And Design bepaalt wat werkelijk nodig is.
- Diensten hoort daarna de mogelijke vormen van hulp te begrenzen, zonder de eerdere openheid alsnog te vervangen door een productcatalogus.
- Projecten moet vervolgens bewijs leveren dat de beschreven werkwijze in concrete situaties tot betekenisvolle keuzes leidt.
- Over ons krijgt pas daarna zijn grootste waarde: de bezoeker weet inmiddels wat de samenwerking vraagt en wil kunnen beoordelen wie die verantwoordelijkheid draagt.
- Contact is geen verkoopeindpunt, maar de kleinste veilige volgende stap.

### Onzekerheden

- Er is nog geen goedgekeurde publieke bewijsset met meerdere cases, resultaten, klantcitaten of meetbare uitkomsten.
- De precieze omvang van het team, publieke rollen en persoonlijke biografieën zijn in de onderzochte canonieke bronnen niet volledig bevestigd.
- De operationele vorm van begeleiding, monitoring, reviews en klantoverzicht is nog niet als publieke dienstbelofte vastgesteld.
- De huidige routecopy in `website/src/public-pages.ts` is bestaande repositorywerkelijkheid, maar heeft niet dezelfde expliciete GO-status als de homepage.

Deze onzekerheden mogen in latere route-candidates niet met aannames worden ingevuld.

## 3. De totale ondernemersreis

| Hoofdstuk | Ondernemersbeweging | Kernuitkomst |
|---|---|---|
| Homepage | Van eerste oplossing naar herkenning van een bredere vraag | “Ik hoef de oplossing nog niet te kennen.” |
| Werkwijze | Van onzekerheid naar vertrouwen in het proces | “Ik begrijp hoe zorgvuldige keuzes ontstaan.” |
| Diensten | Van open vraag naar begrijpelijke mogelijkheden | “Ik zie welke soorten hulp mogelijk zijn, zonder dat er al iets wordt opgedrongen.” |
| Projecten | Van belofte naar aantoonbare praktijk | “Ik zie hoe context, keuze en resultaat werkelijk samenhangen.” |
| Over ons | Van methodisch vertrouwen naar relationeel vertrouwen | “Ik weet wie naast mij staat en welke verantwoordelijkheid zij nemen.” |
| Contact | Van belangstelling naar een veilige eerste stap | “Ik kan mijn situatie delen zonder al een oplossing te hoeven kopen.” |

Dit is de standaard verhaallijn. Navigatie blijft vrij: een ondernemer mag rechtstreeks naar bewijs, mensen of contact gaan. Iedere route moet daarom zelfstandig begrijpelijk zijn en tegelijk herkenbaar onderdeel blijven van hetzelfde verhaal.

## 4. Routeblueprints

## 4.1 Werkwijze

### Rol binnen de totale Experience

Werkwijze maakt geloofwaardig **hoe** We Build And Design van een eerste vraag naar een gedragen volgende stap komt. De route bewijst zorgvuldigheid door de logica, menselijke bevestiging en grenzen van de werkwijze begrijpelijk te maken.

De route is geen uitleg van Atlas als systeem. Atlas mag alleen voelbaar zijn als discipline: luisteren, feiten en aannames scheiden, samen kiezen, beheersbaar uitvoeren en blijven leren.

### Vraag van de ondernemer

> Hoe zorgen jullie dat ik niet te snel in een verkeerde oplossing terechtkom?

Nevragen:

- Hoe leren jullie mijn bedrijf werkelijk kennen?
- Wanneer wordt iets een besluit?
- Welke rol houd ik zelf?
- Hoe voorkomen jullie dat strategie, ontwerp en techniek uit elkaar lopen?
- Wat gebeurt er nadat iets is gebouwd?

### Emotie en overgang

Van herkenning en lichte onzekerheid naar rust en procesvertrouwen.

De ondernemer hoeft na deze route nog niet te weten wat hij nodig heeft. Hij moet wel geloven dat hij dat samen met We Build And Design zorgvuldig kan ontdekken.

### Wat hier bewust niet thuishoort

- Een uitputtende proceshandleiding of interne Atlas-terminologie.
- Softwarebeelden van de Atlas Workspace.
- Een vaste fasering als universele garantie wanneer de praktijk per vraagstuk kan verschillen.
- Een dienstenlijst of pakketstructuur.
- Uitgebreide projectcases; die horen bij Projecten.
- Claims over snelheid, resultaat of begeleiding die nog niet aantoonbaar zijn.

### Aansluiting

**Vorige stap:** Homepage laat zien dat de eerste oplossing niet automatisch de werkelijke vraag is.  
**Volgende stap:** Diensten laat zien welke vormen een zorgvuldig gekozen vervolgstap kan aannemen.

De overgang beantwoordt: “Als jullie zo werken, waarbij kunnen jullie mij dan concreet helpen?”

## 4.2 Diensten

### Rol binnen de totale Experience

Diensten maakt het werkveld begrijpelijk zonder van We Build And Design opnieuw een catalogus van losse producten te maken.

De route beschrijft geen vooraf bepaalde bestemming, maar de mogelijke vormen waarin hulp na onderzoek kan landen: behouden, verbeteren, vernieuwen, uitbreiden, begeleiden of bewust nog niet bouwen. Strategie, ontwerp en technologie zijn samenwerkende disciplines, geen los verkoopmenu.

### Vraag van de ondernemer

> Waarmee kunnen jullie mij in de praktijk helpen?

Nevragen:

- Kunnen jullie ook mijn bestaande website verbeteren?
- Helpen jullie bij richting en keuzes vóór ontwerp of techniek?
- Kunnen jullie iets uitbreiden zonder opnieuw te beginnen?
- Blijven jullie betrokken nadat iets is opgeleverd?
- Wanneer adviseren jullie juist om niet te bouwen?

### Emotie en overgang

Van vertrouwen in het proces naar opluchting en handelingsperspectief.

De ondernemer herkent dat zijn situatie binnen het werkveld past, zonder zich al in een product of pakket te hoeven vastleggen.

### Wat hier bewust niet thuishoort

- Een lijst generieke deliverables zonder relatie tot ondernemersvragen.
- “Website laten maken” als overkoepelende positionering.
- Prijspakketten of harde scopebeloften voordat de werkelijke vraag bekend is.
- Technische stack als hoofdonderwerp.
- Niet-bewezen abonnements-, monitoring- of portaalbeloften.
- Volledige cases; Diensten mag naar bewijs verwijzen, maar vervangt Projecten niet.

### Aansluiting

**Vorige stap:** Werkwijze heeft vertrouwen gegeven in hoe keuzes ontstaan.  
**Volgende stap:** Projecten toont of deze manier van werken in echte context aantoonbaar standhoudt.

De overgang beantwoordt: “Dit klinkt passend, maar waar zie ik dat terug in werkelijk werk?”

## 4.3 Projecten

### Rol binnen de totale Experience

Projecten is de primaire bewijslaag van de publieke Experience.

Een project is hier geen visuele etalage en geen lijst opgeleverde onderdelen. Het maakt de herleidbare lijn zichtbaar tussen:

1. de situatie van de ondernemer;
2. wat aanvankelijk werd gevraagd;
3. wat tijdens het begrijpen relevant bleek;
4. de belangrijkste keuze;
5. wat bewust niet werd gedaan;
6. de uitvoering;
7. het resultaat of de actuele leerstatus.

Waar een resultaat nog niet bewezen is, blijft dat zichtbaar. Een eerlijke case met een begrensde conclusie is sterker dan een grote claim zonder bewijs.

### Vraag van de ondernemer

> Hebben jullie dit soort zorgvuldige beweging al in de praktijk begeleid?

Nevragen:

- Begrijpen jullie bedrijven die al iets hebben opgebouwd?
- Welke keuzes maken jullie wanneer niet alles opnieuw hoeft?
- Hoe ziet het verschil tussen vraag en werkelijke vraag eruit?
- Wat veranderde er voor de ondernemer?
- Wat hebben jullie geleerd en later herzien?

### Emotie en overgang

Van rationele interesse naar geloofwaardigheid en concreet vertrouwen.

De bezoeker moet zichzelf niet noodzakelijk in dezelfde branche herkennen, maar wel in de verantwoordelijkheid, twijfel of beweging achter de case.

### Wat hier bewust niet thuishoort

- Alleen eindbeelden, mock-ups of technische specificaties.
- Resultaatclaims zonder bron, periode of context.
- Vertrouwelijke klantcontext.
- Een fictieve “ideale case” samengesteld uit meerdere klanten.
- Niet-bevestigde testimonials.
- Cases die alleen worden getoond omdat het ontwerp aantrekkelijk is.
- Atlas als softwaredemonstratie.

### Aansluiting

**Vorige stap:** Diensten heeft mogelijke vormen van hulp begrijpelijk gemaakt.  
**Volgende stap:** Over ons laat zien welke mensen en professionele houding achter de keuzes staan.

De overgang beantwoordt: “Ik zie hoe jullie werken; met wie werk ik dan daadwerkelijk samen?”

## 4.4 Over ons

### Rol binnen de totale Experience

Over ons bouwt relationeel vertrouwen op nadat de ondernemer de belofte, werkwijze en bewijslogica begrijpt.

De primaire afzender is We Build And Design. Het persoonlijke verhaal krijgt ruimte waar het verantwoordelijkheid, vakmanschap en nabijheid concreet maakt. De route gaat niet om zelfpresentatie, maar om de vraag of de ondernemer deze mensen zijn context en volgende stap toevertrouwt.

### Vraag van de ondernemer

> Wie staat er naast mij wanneer de keuzes lastig worden?

Nevragen:

- Wie neemt verantwoordelijkheid voor samenhang?
- Welke disciplines komen samen?
- Hoe luisteren en communiceren jullie?
- Wat verwachten jullie van mij?
- Hoe dichtbij of zelfstandig is de samenwerking?

### Emotie en overgang

Van bewezen vakvertrouwen naar menselijke nabijheid.

De ondernemer moet voelen dat hij serieus wordt genomen, niet wordt overgenomen en met herkenbare mensen aan tafel zit.

### Wat hier bewust niet thuishoort

- Een heldenverhaal waarin de oprichter de ondernemer overschaduwt.
- Een generieke tijdlijn zonder betekenis voor de samenwerking.
- Persoonlijkheden, teamomvang of rollen die niet actueel bevestigd zijn.
- Interne Atlas-filosofie als abstract manifest.
- Een herhaling van Diensten of Werkwijze.
- Cultuurclaims die niet door gedrag of voorbeelden worden ondersteund.

### Aansluiting

**Vorige stap:** Projecten heeft laten zien hoe verantwoordelijkheid zichtbaar wordt in keuzes en resultaten.  
**Volgende stap:** Contact maakt een eerste ontmoeting klein, veilig en concreet.

De overgang beantwoordt: “Dit voelt passend; hoe begin ik zonder al een oplossing vast te leggen?”

## 4.5 Contact

### Rol binnen de totale Experience

Contact verlaagt de drempel naar een eerste, gelijkwaardig gesprek. De route helpt een ondernemer zijn huidige situatie te delen, ook wanneer de vraag nog onvolledig of onzeker is.

De route sluit de Experience niet af met verkoopdruk. Zij maakt één betekenisvolle volgende stap mogelijk.

### Vraag van de ondernemer

> Kan ik mijn situatie veilig voorleggen zonder al te moeten weten wat ik nodig heb?

Nevragen:

- Wat kan ik meenemen naar het gesprek?
- Wat gebeurt er na mijn bericht?
- Is mijn vraag passend?
- Met wie spreek ik?
- Welke verwachtingen zijn redelijk?

### Emotie en overgang

Van vertrouwen naar rustige bereidheid om contact te leggen.

De ondernemer houdt eigenaarschap. Een gesprek is een verkenning, geen stilzwijgende instemming met een traject.

### Wat hier bewust niet thuishoort

- Kunstmatige urgentie, schaarste of druk.
- Een lang intakeformulier dat begrip simuleert voordat er is geluisterd.
- Verplichte keuze uit diensten of budgetcategorieën als die niet noodzakelijk zijn.
- Beloften over reactietijd, proces of beschikbaarheid die niet operationeel bevestigd zijn.
- Een volledig adviesproces op de contactpagina.
- Atlas-terminologie die de drempel verhoogt.

### Aansluiting

**Vorige stap:** Over ons heeft duidelijk gemaakt wie verantwoordelijkheid draagt.  
**Volgende stap:** Geen volgende publieke route is vereist. De betekenisvolle vervolgstap ligt buiten de website: een echt gesprek.

Na contact moet de bevestiging dezelfde verwachting bewaken: ontvangen, menselijk beoordelen en pas daarna samen bepalen wat zinvol is.

## 5. Routeverantwoordelijkheden

| Inhoudelijke verantwoordelijkheid | Primaire route | Ondersteunende route |
|---|---|---|
| Herkenning dat de eerste oplossing niet vaststaat | Homepage | Werkwijze |
| Vertrouwen in hoe keuzes ontstaan | Werkwijze | Projecten |
| Begrip van mogelijke vormen van hulp | Diensten | Werkwijze |
| Praktijkbewijs | Projecten | Diensten, Werkwijze |
| Menselijke afzender en professionele houding | Over ons | Projecten |
| Veilige eerste stap | Contact | Over ons |

Een ondersteunende route mag verwijzen of een beknopt signaal geven, maar neemt de volledige verantwoordelijkheid van de primaire route niet over.

## 6. Architectuurregels voor volgende sprints

1. Iedere route krijgt één primaire ondernemersvraag.
2. Iedere route creëert één herkenbare emotionele overgang.
3. Iedere claim wordt gekoppeld aan bewijs, een bron of een expliciete onzekerheid.
4. De routevolgorde is een redactionele logica, geen verplichte klikroute.
5. De homepage wordt niet opnieuw de inhoudelijke container voor alle bewijs en uitleg.
6. Atlas blijft methode en onderlaag, nooit product of fictieve wereld.
7. Symboliek is alleen toegestaan wanneer zij herkenning, begrip, richting, vertrouwen of overgang ondersteunt.
8. SEO ondersteunt de Experience; terminologie wordt nooit toegevoegd wanneer zij de menselijke betekenis vertroebelt.
9. Geen route-candidate start voordat de noodzakelijke bewijslaag voor die route bekend is.
10. Iedere route doorloopt afzonderlijk: architectuurreview, GO, copy, Experience Design en implementatie.

## 7. Open bewijsopdrachten vóór route-candidates

Deze opdrachten zijn geen nieuwe features en nog geen contentvoorstellen. Zij markeren welke werkelijkheid later bevestigd moet worden.

- **Werkwijze:** bevestig welke stappen publiek consequent beloofd kunnen worden en waar praktijk per opdracht varieert.
- **Diensten:** bevestig welke vormen van begeleiding en uitvoering vandaag werkelijk worden geleverd.
- **Projecten:** selecteer alleen cases waarvan context, keuze, resultaat en publicatierechten voldoende bekend zijn.
- **Over ons:** bevestig actuele publieke afzender, rollen, teamcontext en persoonlijke informatie.
- **Contact:** bevestig werkelijk contactkanaal, opvolging, verwachtingen, privacygrondslag en eventuele responstijd.

## 8. Architectuurconclusie

De volledige publieke Experience hoort niet te vertellen dat We Build And Design websites verkoopt. Zij moet stap voor stap aantonen dat We Build And Design:

- een bestaande bedrijfswerkelijkheid serieus neemt;
- de vraag achter de eerste vraag onderzoekt;
- mogelijke oplossingen openhoudt totdat er voldoende begrip is;
- keuzes zichtbaar en draagbaar maakt;
- zorgvuldig bouwt wanneer bouwen betekenis toevoegt;
- betrokken blijft bij werkelijk gebruik en verdere ontwikkeling.

De vijf routes hebben ieder een unieke verantwoordelijkheid. Samen brengen zij de ondernemer van herkenning naar een echt gesprek, zonder de website zelf tot vervanging van dat gesprek te maken.
