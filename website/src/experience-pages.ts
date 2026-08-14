import businessReality from "./assets/images/experience/wbd-business-reality-v01.webp";
import sourceToDigital from "./assets/images/experience/wbd-source-to-digital-v01.webp";
import attentionBehindWork from "./assets/images/experience/wbd-attention-behind-work-v01.webp";
import conversationThreshold from "./assets/images/experience/wbd-conversation-threshold-v01.webp";
import responsiveCheck from "./assets/images/experience/wbd-responsive-check-v01.webp";
import methodListening from "./assets/images/atlas/generated/atlas-method-listening-v01.jpg";
import methodClarity from "./assets/images/atlas/generated/atlas-method-clarity-v01.jpg";
import methodPrototype from "./assets/images/atlas/generated/atlas-method-prototype-v01.jpg";
import { legalPages, type LegalPage } from "./legal-pages";
import { renderSportpaleisPracticeCase } from "./sportpaleis-practice-case";

interface ExperienceSection {
  label: string;
  title: string;
  paragraphs: string[];
  image?: string;
  imageAlt?: string;
  points?: string[];
  editorialNote?: {
    label: string;
    text: string;
  };
  editorialInsight?: {
    label: string;
    title: string;
    paragraphs: string[];
  };
}

interface ExperiencePage {
  path: string;
  navLabel: string;
  metaTitle: string;
  index: string;
  phase: string;
  title: string;
  intro: string;
  description: string;
  heroAsset?: string;
  heroAlt?: string;
  heroPosition?: string;
  sections: ExperienceSection[];
  reflection: string;
  nextPath: string;
  nextLabel: string;
  nextTitle: string;
  contact?: boolean;
}

interface KnowledgeArticle {
  path: string;
  title: string;
  metaTitle: string;
  description: string;
  linkLabel: string;
  routeLabel: string;
  lead: string;
  readingTime: string;
  sections: ExperienceSection[];
  summaryTitle: string;
  summaryText: string;
  continuationIntro: string;
  relatedInsights: {
    path: string;
    title: string;
    reason: string;
  }[];
}

const pages: ExperiencePage[] = [
  {
    path: "/diensten",
    navLabel: "Diensten",
    metaTitle: "Digitale verbetering voor organisaties",
    index: "04",
    phase: "Van praktijk naar verbetering",
    title: "Wat je organisatie nodig heeft, bepaalt wat we verbeteren.",
    intro:
      "We beginnen bij hoe je organisatie werkt, welke systemen er al zijn en waar jij, collega’s of klanten vastlopen. Daarna bepalen we wat kan blijven en welke praktische verbetering het meest helpt.",
    description:
      "Lees hoe We Build And Design eerst je organisatie begrijpt en daarna gericht verbetert wat nodig is.",
    heroAsset: sourceToDigital,
    heroAlt:
      "Bronmateriaal uit de dagelijkse praktijk wordt naast een heldere digitale structuur beoordeeld.",
    heroPosition: "center",
    sections: [
      {
        label: "04.1 / Onderzoeken",
        title: "Eerst begrijpen we wat er in de praktijk gebeurt.",
        paragraphs: [
          "Misschien kost een terugkerende taak te veel tijd, sluit een systeem niet goed aan op het werk of krijgen klanten steeds dezelfde vraag niet beantwoord. Het zichtbare probleem is niet altijd de oorzaak.",
          "We bekijken de werkwijze, de betrokken mensen, bestaande software en de momenten waarop vertraging of twijfel ontstaat. Daarom luisteren we waar mogelijk ook naar de collega’s die er dagelijks mee werken. Gesprekken, veelgestelde vragen en gebruiksgegevens helpen, maar de praktijk geeft de context.",
        ],
        points: [
          "Bestaande werkwijze en software",
          "Klanten, collega’s en terugkerende vragen",
          "Knelpunten, afhankelijkheden en wat al goed werkt",
        ],
        editorialInsight: {
          label: "Bekijk de context",
          title: "Waarom cijfers alleen niet genoeg zijn",
          paragraphs: [
            "Cijfers kunnen laten zien waar klanten afhaken of hoeveel tijd een handeling kost. Ze vertellen niet vanzelf waarom iemand twijfelt, iets dubbel invoert of een omweg kiest.",
            "Daarom leggen we gegevens naast gesprekken en observaties uit de praktijk. Zo worden cijfers bruikbare signalen in plaats van snelle conclusies.",
          ],
        },
      },
      {
        label: "04.2 / Adviseren",
        title: "We kiezen eerst de kleinste stap die echt helpt.",
        paragraphs: [
          "We maken duidelijk wat kan blijven, wat beter kan, wat dat moet opleveren en wat we bewust nog niet aanpakken.",
          "Vaak is een aangepaste werkwijze, een slimmere inrichting of een gerichte verbetering van bestaande software genoeg. Denk aan gegevens nog maar één keer invoeren, een formulier dat bij de juiste collega uitkomt of software die eenvoudiger is ingericht. Alleen als de praktijk daar aantoonbaar om vraagt, adviseren we een nieuwe website of toepassing.",
          "Is WBD niet de passende partij, dan zeggen we dat voordat het traject groter wordt.",
        ],
      },
      {
        label: "04.3 / Ontwerpen",
        title: "We maken de verbetering zichtbaar en bespreekbaar.",
        paragraphs: [
          "We vertalen de gekozen richting naar een heldere werkwijze, inhoud, structuur en vorm. Zo zie je niet alleen hoe iets eruitziet, maar vooral hoe het straks voor klanten en collega’s werkt.",
          "We beoordelen keuzes zolang aanpassen nog eenvoudig is. Zo helpt het ontwerp om samen een besluit te nemen.",
        ],
        image: methodClarity,
        imageAlt:
          "Losse signalen worden teruggebracht tot een heldere inhoudelijke en visuele richting.",
      },
      {
        label: "04.4 / Bouwen",
        title: "We voeren uit wat binnen de gekozen stap past.",
        paragraphs: [
          "Wat WBD vandaag aantoonbaar kan, is een bestaande website gericht verbeteren of een nieuwe website ontwerpen en bouwen. Wijst de vraag naar een andere software-inrichting, een koppeling of specialistisch werk, dan bepalen we eerst wie dat verantwoord kan uitvoeren.",
          "Bestaande systemen kunnen vaak gewoon blijven. We onderzoeken hoe inhoud, formulieren, koppelingen en beheer elkaar beïnvloeden en veranderen alleen wat de gekozen verbetering belemmert.",
          "Vooraf spreken we af wat we binnen deze stap controleren en wat erbuiten valt. Zo weet je waarop je wel en niet kunt rekenen.",
        ],
        image: methodPrototype,
        imageAlt:
          "Een gekozen digitale richting wordt op meerdere schermformaten gecontroleerd.",
      },
      {
        label: "04.5 / Wanneer WBD past",
        title: "WBD past wanneer begrijpen en uitvoeren dicht bij elkaar moeten blijven.",
        paragraphs: [
          "Je hoeft geen technische briefing te hebben. Wel helpt het wanneer je de dagelijkse praktijk, betrokken mensen en twijfels open kunt bespreken en tussentijdse keuzes wilt beoordelen.",
          "Zoek je alleen snelle uitvoering van een volledig vaststaand plan of heb je direct een groot specialistisch team nodig, dan past een andere partij waarschijnlijk beter.",
        ],
      },
    ],
    reflection:
      "Eerst begrijpen we hoe je organisatie werkt. Daarna verbeteren we alleen wat nodig is.",
    nextPath: "/projecten",
    nextLabel: "Bekijk hoe we naar uitgevoerd werk kijken",
    nextTitle: "Goed werk laat zien welke keuze in de praktijk verschil maakte.",
  },
  {
    path: "/werkwijze",
    navLabel: "Werkwijze",
    metaTitle: "Werkwijze voor digitale verbetering",
    index: "03",
    phase: "Een zorgvuldig ritme",
    title: "Eerst luisteren. Dan pas bouwen.",
    intro:
      "Je hoeft geen briefing of technisch plan mee te brengen. We beginnen bij je dagelijkse praktijk en maken iedere belangrijke keuze begrijpelijk voordat we iets veranderen.",
    description:
      "Lees hoe We Build And Design van een vraag uit de praktijk naar een passende digitale verbetering werkt.",
    heroAsset: methodListening,
    heroAlt:
      "Iemand laat een tastbaar onderdeel van de dagelijkse praktijk zien tijdens een aandachtig gesprek.",
    heroPosition: "58% center",
    sections: [
      {
        label: "03.1 / Begrijpen",
        title: "We beginnen bij wat jij iedere dag al weet.",
        paragraphs: [
          "Jij kent het werk, de mensen en de afspraken achter je vraag. We onderzoeken wat voor jou vanzelfsprekend is, maar voor een buitenstaander nog niet zichtbaar is.",
          "Raakt de vraag het dagelijkse werk van collega’s, dan betrekken we hun ervaring bij de afweging. Een keuze voor de werkvloer baseren we niet alleen op het beeld van het management.",
          "We beginnen niet met oplossingen of een technische lijst, maar met een gedeeld beeld van wat er speelt.",
        ],
        points: [
          "Wat werkt nu al goed?",
          "Waar verliezen jij en je collega’s onnodig tijd?",
          "Wat hebben klanten nodig om verder te kunnen?",
        ],
      },
      {
        label: "03.2 / Helder krijgen",
        title: "Losse signalen worden een begrijpelijke kern.",
        paragraphs: [
          "We ordenen observaties, vragen en bestaande informatie. Waar mogelijk leggen we gesprekken en terugkerende hulpvragen naast gebruiksgegevens en de huidige werkwijze. Zo zien we waar verschillende signalen hetzelfde vertellen.",
          "Niet alles hoeft te veranderen. Alleen wat collega’s helpt efficiënter te werken en klanten helpt om te begrijpen of verder te gaan.",
        ],
        image: methodClarity,
        imageAlt:
          "Bronmateriaal wordt samen geordend tot een heldere reeks keuzes.",
      },
      {
        label: "03.3 / Samen kiezen",
        title: "Je ziet de keuze voordat zij definitief wordt.",
        paragraphs: [
          "Een procesvoorstel, structuur of ontwerp maakt mogelijkheden vergelijkbaar. Je hoeft geen technische kennis te hebben om te beoordelen waarom een richting bij de vraag en gewenste uitkomst past.",
          "Een besluit is pas sterk wanneer jij het zelf kunt begrijpen en dragen.",
        ],
      },
      {
        label: "03.4 / Zichtbaar maken",
        title: "We maken de gekozen verbetering bruikbaar.",
        paragraphs: [
          "We maken de werkwijze, prioriteiten en handelingen tastbaar. Daarmee toetsen we of de verbetering doet wat we samen hebben bedoeld.",
        ],
        image: methodPrototype,
        imageAlt:
          "Een gekozen structuur wordt op verschillende schermen getoetst.",
      },
      {
        label: "03.5 / Bouwen en verder",
        title: "De gekozen lijn blijft overeind tijdens de uitvoering.",
        paragraphs: [
          "Tijdens de uitvoering controleren en verfijnen we. Een bestaand CMS, webshop, koppeling, collega of leverancier is onderdeel van de praktijk. Wat goed werkt, hoeft niet te verdwijnen om ruimte te maken voor iets nieuws.",
          "Na oplevering kun je met vragen terugkomen. Doorlopende begeleiding is alleen onderdeel van de samenwerking wanneer we dat afzonderlijk afspreken.",
          "Nieuwe wensen beoordelen we opnieuw op wat de situatie dan nodig heeft; we voegen ze niet vanzelf aan de bestaande oplossing toe.",
        ],
      },
    ],
    reflection:
      "Je hoeft de oplossing niet vooraf te kennen. Je moet wel kunnen begrijpen waarom een keuze bij je organisatie past.",
    nextPath: "/diensten",
    nextLabel: "Bekijk wat we kunnen verbeteren",
    nextTitle: "De praktijk bepaalt welke vorm de verbetering krijgt.",
  },
  {
    path: "/projecten",
    navLabel: "Projecten",
    metaTitle: "Projecten: wat we wel en niet claimen",
    index: "05",
    phase: "Werk en werkelijkheid",
    title: "Goed werk moet in de praktijk verschil maken.",
    intro:
      "Een mooi eindbeeld vertelt niet genoeg. We delen alleen werk wanneer we de beginsituatie, de gemaakte keuzes en de verandering in de praktijk eerlijk kunnen laten zien.",
    description:
      "Bekijk welk werk je nu kunt beoordelen en waarom We Build And Design resultaten pas met bewijs deelt.",
    heroAsset: responsiveCheck,
    heroAlt:
      "Een website wordt op een telefoon en een groter scherm gecontroleerd.",
    heroPosition: "center",
    sections: [
      {
        label: "05.1 / Geen etalage",
        title: "Je moet kunnen zien wat er in de praktijk veranderde.",
        paragraphs: [
          "Daarom tonen we niet alleen een eindbeeld. We willen duidelijk maken hoe de organisatie werkte, welke keuze richting gaf en wat daarna aantoonbaar veranderde.",
        ],
      },
      {
        label: "05.2 / Huidige praktijk",
        title: "Dit kun je op deze website al beoordelen.",
        paragraphs: [
          "Deze website laat zien hoe we werken: eerst de vraag begrijpen, daarna keuzes zichtbaar maken, zorgvuldig uitvoeren en in de praktijk beoordelen.",
          "De website is stap voor stap ontwikkeld vanuit vragen over positionering, begrijpelijkheid, beeld, inhoud en gebruik op verschillende schermen. Keuzes zijn vastgelegd, getest en waar nodig teruggedraaid.",
          "Dit laat de werkwijze en de uitgevoerde website zien. Het zegt nog niets over resultaat bij een andere organisatie.",
        ],
        points: [
          "Een samenhangende website op desktop en mobiel",
          "Inhoud, beeld, ontwerp en techniek ontwikkeld vanuit dezelfde richting",
          "Een beheerste publicatie met ruimte om veilig terug te draaien",
        ],
        editorialInsight: {
          label: "Open het werkdossier",
          title: "Wat is hier uitgevoerd en geleerd?",
          paragraphs: [
            "<strong>Vertrekpunt.</strong> De website liet nog niet snel genoeg zien hoe WBD organisaties helpt en voelde per pagina nog niet als één geheel.",
            "<strong>Onderzocht en herzien.</strong> Positionering, beeldrichting, paginastructuur, tekst, beeldritme en de eerste indruk zijn afzonderlijk onderzocht. Diensten werden niet als productmenu opgebouwd, omdat de vraag uit de praktijk eerst richting moest geven.",
            "<strong>Gebouwd en gecontroleerd.</strong> De publieke route, kennisbibliotheek, werking op verschillende schermen, toetsenbordgebruik, paginasnelheid en publicatie zijn in samenhang beoordeeld. Keuzes die niet voldeden zijn aangepast of teruggedraaid.",
            "<strong>Geleerd.</strong> Een bezoeker moet vroeg begrijpen dat WBD eerst de organisatie en haar werkwijze wil doorgronden. Ontwerp en techniek ondersteunen de verbetering die daaruit volgt.",
            "<strong>Nog niet geclaimd.</strong> Er is nog geen extern klantresultaat, conversiestijging of organische groei die aan deze website kan worden toegeschreven. Zonder praktijkbewijs trekken we daar geen conclusie over.",
          ],
        },
      },
      {
        label: "05.3 / Wat nog niet wordt geclaimd",
        title: "We claimen alleen resultaten die aantoonbaar zijn.",
        paragraphs: [
          "De Sportpaleis-praktijkcase laat de uitgangssituatie, de gemaakte keuze en de werkwijze in ontwikkeling zien. We koppelen daar geen percentages, tijdwinst of onbewezen resultaatclaim aan.",
          "Nieuwe projecten verschijnen hier pas wanneer de vraag, samenwerking, uitvoering en feitelijke status samen een eerlijk verhaal vormen.",
        ],
      },
    ],
    reflection:
      "Eerst goed werk leveren. Daarna eerlijk vertellen wat het heeft veranderd.",
    nextPath: "/over-ons",
    nextLabel: "Lees waarom WBD zo werkt",
    nextTitle: "We beginnen niet met bouwen, maar met begrijpen.",
  },
  {
    path: "/over-ons",
    navLabel: "Over ons",
    metaTitle: "Over ons en onze werkwijze",
    index: "06",
    phase: "De aandacht achter het werk",
    title: "We beginnen niet met bouwen, maar met begrijpen.",
    intro:
      "Bij We Build And Design heb je rechtstreeks contact. We willen eerst weten hoe je organisatie werkt, wat al goed gaat en waar verandering nodig is. Daarna wordt pas duidelijk welke rol WBD verantwoord kan nemen.",
    description:
      "Lees waarom We Build And Design eerst je organisatie en werkwijze begrijpt en daarna gericht helpt verbeteren.",
    heroAsset: attentionBehindWork,
    heroAlt:
      "Vanuit het perspectief van de vraagsteller wordt een digitale keuze aandachtig beoordeeld.",
    heroPosition: "center",
    sections: [
      {
        label: "06.1 / Werkelijkheid",
        title: "Rechtstreeks contact. Korte lijnen.",
        paragraphs: [
          "Vanaf het eerste gesprek blijft We Build And Design betrokken bij de afwegingen, het ontwerp en de uitvoering. Je hoeft je vraag niet steeds opnieuw uit te leggen.",
          "Dat houdt de lijnen kort en de afstemming duidelijk. Wanneer aanvullende kennis nodig is, benoemen we dat vooraf en maken we helder wie waarvoor verantwoordelijk is.",
        ],
      },
      {
        label: "06.2 / Richting",
        title: "We beginnen bij wat er al is.",
        paragraphs: [
          "Er is al veel dat goed werkt: mensen, afspraken, software en processen. Jij kent de dagelijkse praktijk achter de vraag. Wij helpen zien wat moet blijven, wat niet meer meegroeit en waar onduidelijkheid ontstaat.",
          "De vraag waarmee je binnenkomt, is niet altijd de vraag die het meeste verschil maakt. Samen onderscheiden we wat vaststaat, wat onzeker is en welke verandering nu het meeste helpt.",
          "Wat we nog niet begrijpen, vullen we niet alvast in.",
        ],
      },
      {
        label: "06.3 / Ontwerpen",
        title: "Ontwerp maakt de keuze zichtbaar.",
        paragraphs: [
          "Ontwerpen begint niet bij kleur of een mooi scherm. Het begint bij wat klanten of collega’s moeten begrijpen en kunnen doen.",
          "We vertalen dat naar een werkwijze, inhoud, structuur, interactie en vorm. Zo kun je opties vergelijken voordat we iets definitief uitvoeren.",
        ],
      },
      {
        label: "06.4 / Uitvoeren",
        title: "Daarna voert WBD uit wat binnen zijn rol past.",
        paragraphs: [
          "Wat WBD vandaag aantoonbaar kan, is professionele websites ontwerpen en bouwen. Ook daarbij beginnen we bij de organisatie, bestaande inhoud en wat klanten of collega’s moeten kunnen doen.",
          "Vraagt de situatie om nieuwe software, complexe koppelingen of andere specialistische kennis, dan zeggen we duidelijk dat WBD dit niet vanzelfsprekend alleen kan. We maken eerst duidelijk welke rol passend is en wie er verder nodig is.",
        ],
        image: responsiveCheck,
        imageAlt:
          "Een website wordt op verschillende schermen en inhoudelijk gecontroleerd.",
      },
      {
        label: "06.5 / Grenzen",
        title: "Niet alles wat kan, hoeft te worden gebouwd.",
        paragraphs: [
          "Soms is behouden, kleiner beginnen of eerst één onzekerheid onderzoeken de beste keuze. Een technische oplossing is alleen zinvol wanneer zij het werk aantoonbaar verbetert.",
          "Bereikbaar blijven betekent dat je met vragen kunt terugkomen. Het is geen belofte van doorlopende begeleiding, tenzij we die afzonderlijk afspreken.",
        ],
      },
      {
        label: "06.6 / Verantwoordelijkheid",
        title: "Je weet wie waarvoor verantwoordelijk is.",
        paragraphs: [
          "We Build And Design blijft betrokken bij de keuzes, het ontwerp en de uitvoering. Begrip, richting en uitvoering worden niet aan losse loketten overgedragen.",
          "Wanneer aanvullende expertise nodig is, maken we dat duidelijk en betrekken we die gericht. Zo weet je wie waarvoor verantwoordelijk is en blijft jouw organisatie het uitgangspunt.",
        ],
      },
      {
        label: "06.7 / Volgende stap",
        title: "Een vraag hoeft nog geen oplossing te zijn.",
        paragraphs: [
          "Vertel wat er speelt, waar werk onnodig ingewikkeld wordt of welke stap je overweegt. Eerst bepalen we welke kleine verbetering past en of er überhaupt iets gebouwd hoeft te worden.",
        ],
      },
    ],
    reflection:
      "Eerst begrijpen we de praktijk. Daarna verbeteren we alleen wat nodig is.",
    nextPath: "/contact",
    nextLabel: "Vertel wat er speelt",
    nextTitle: "Een eerste gesprek begint bij je dagelijkse praktijk, niet bij een briefing.",
  },
  {
    path: "/contact",
    navLabel: "Contact",
    metaTitle: "Contact over een digitaal vraagstuk",
    index: "07",
    phase: "Een gewone eerste stap",
    title: "Vertel wat er speelt.",
    intro:
      "Je hoeft geen briefing, planning of technische keuze te hebben. Je hebt rechtstreeks contact met We Build And Design over hoe je organisatie werkt, waar jij of je collega’s vastlopen en wat je wilt verbeteren.",
    description:
      "Neem rechtstreeks contact op met We Build And Design over een praktische digitale verbetering binnen je organisatie.",
    heroAsset: conversationThreshold,
    heroAlt:
      "Een rustige werkruimte staat klaar voor een open eerste gesprek.",
    heroPosition: "center",
    sections: [
      {
        label: "07.1 / Wanneer contact past",
        title: "Je merkt dat iets slimmer kan, maar weet nog niet welke stap past.",
        paragraphs: [
          "Misschien kost een proces te veel tijd, sluit bestaande software niet goed aan of krijgen klanten online onvoldoende houvast. Je hoeft nog niet te weten of een kleine aanpassing, een slimmere inrichting of iets nieuws nodig is.",
        ],
      },
      {
        label: "07.2 / Wat je kunt verwachten",
        title: "Het eerste antwoord mag ook zijn dat WBD niet de juiste partij is.",
        paragraphs: [
          "We luisteren naar wat er speelt en kijken wat al goed werkt. Daarna maken we duidelijk wat we begrijpen, wat nog onderzocht moet worden en of WBD past.",
          "Een verantwoord antwoord kan ook zijn: nu niets veranderen, eerst informatie verzamelen of een andere specialist betrekken.",
          "Is een vervolgstap zinvol, dan maken we eerst duidelijk wat die stap omvat, wie ervoor nodig is en welke vragen nog openstaan. Afspraken over planning en kosten volgen voordat de uitvoering begint.",
        ],
      },
    ],
    reflection:
      "Een eerlijke beschrijving van de situatie is genoeg om te beginnen.",
    nextPath: "/kennis",
    nextLabel: "Liever eerst verder lezen?",
    nextTitle: "Bekijk vragen die helpen om je eigen situatie te verhelderen.",
    contact: true,
  },
];

const knowledgeArticles: KnowledgeArticle[] = [
  {
    path: "/kennis/wanneer-website-vernieuwen",
    title: "Wanneer is het tijd om je website te vernieuwen?",
    metaTitle: "Website vernieuwen: wanneer is dat nodig?",
    description:
      "Herken wanneer je website niet meer meegroeit en bepaal of vernieuwing echt nodig is.",
    linkLabel: "Onderzoek de signalen",
    routeLabel: "Begin hier",
    lead:
      "Niet iedere oude website hoeft te worden vervangen. De relevante vraag is of de huidige website mensen nog helpt om te begrijpen, kiezen en handelen.",
    readingTime: "3 minuten",
    sections: [
      {
        label: "Signaal 01",
        title: "De werkelijkheid is veranderd, maar de website vertelt nog het oude verhaal.",
        paragraphs: [
          "Aanbod, doelgroep of manier van werken kan gegroeid zijn terwijl de website dezelfde nadruk houdt. Nieuwe bezoekers begrijpen dan een versie van de werkelijkheid die niet meer bestaat.",
        ],
      },
      {
        label: "Signaal 02",
        title: "Mensen stellen vragen die de website al had moeten beantwoorden.",
        paragraphs: [
          "Terugkerende vragen over aanbod, werkwijze, prijs of de vraag of iets past, laten zien waar de website onvoldoende richting geeft.",
          "Gebruiksgegevens kunnen laten zien op welke pagina bezoekers afhaken of met welke vraag zij binnenkomen. Waarom iemand twijfelt, wordt pas duidelijk wanneer we die gegevens naast gesprekken, inhoud en navigatie leggen.",
        ],
        editorialNote: {
          label: "Veelgemaakte aanname",
          text: "Meer informatie is niet altijd het antwoord. Soms staat alles er al, maar krijgt het nog niet de juiste prioriteit.",
        },
      },
      {
        label: "Signaal 03",
        title: "De techniek staat bruikbare verbetering in de weg.",
        paragraphs: [
          "Een nieuw systeem is pas logisch wanneer de bestaande basis bruikbare verbeteringen echt belemmert. Denk aan toegankelijkheid, snelheid of beheer. Alleen het bouwjaar is zelden een goede reden.",
        ],
      },
      {
        label: "Eerste stap",
        title: "Begin met vaststellen wat behouden moet blijven.",
        paragraphs: [
          "Breng eerst in kaart wat mensen al begrijpen, welke pagina’s worden gebruikt en welke onderdelen nog goed bij de organisatie passen. Dan wordt duidelijk of een gerichte verbetering volstaat of een grondigere vernieuwing nodig is.",
        ],
      },
    ],
    summaryTitle: "Vernieuw alleen wanneer de huidige website noodzakelijke verbetering belemmert, niet omdat zij oud aanvoelt.",
    summaryText:
      "Onderzoek eerst wat nog werkt, waar begrip verloren gaat en of de bestaande basis verbetering in de weg staat.",
    continuationIntro:
      "Als vernieuwing een mogelijkheid wordt, ontstaat meestal meteen een tweede vraag: hoeveel moet er veranderen?",
    relatedInsights: [
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of is vernieuwing nodig?",
        reason: "Vergelijk een gerichte verbetering met een grondigere vernieuwing.",
      },
      {
        path: "/kennis/wat-wbd-doet",
        title: "Hoe helpt We Build And Design bij digitale vraagstukken?",
        reason: "Bekijk hoe een onduidelijke vraag stap voor stap wordt teruggebracht tot een passende verbetering.",
      },
    ],
  },
  {
    path: "/kennis/website-verbeteren-of-vernieuwen",
    title: "Verbeter je de bestaande website of is vernieuwing nodig?",
    metaTitle: "Website verbeteren of vernieuwen?",
    description:
      "Een praktische afweging tussen gericht verbeteren en grondiger vernieuwen.",
    linkLabel: "Vergelijk beide richtingen",
    routeLabel: "Een logische volgende vraag",
    lead:
      "De grootste oplossing is niet automatisch de beste. De juiste keuze hangt af van de vraag, de bruikbaarheid van de basis en de waarde van wat al werkt.",
    readingTime: "2 minuten",
    sections: [
      {
        label: "Verbeteren",
        title: "Verbeter wanneer de basis klopt en het probleem begrensd is.",
        paragraphs: [
          "Als positionering, techniek en structuur nog bruikbaar zijn, kan een gerichte aanpassing aan inhoud, navigatie, interactie of toegankelijkheid meer opleveren dan volledige vervanging.",
        ],
      },
      {
        label: "Vernieuwen",
        title: "Vernieuw wanneer meerdere lagen elkaar tegelijk tegenwerken.",
        paragraphs: [
          "Wanneer verhaal, structuur, vorm en techniek allemaal niet meer passen, kan steeds plaatselijk repareren duur en onoverzichtelijk worden. Ook dan onderzoeken we eerst wat behouden kan blijven. Alleen de lagen die verbetering blokkeren, vragen om een nieuwe basis.",
        ],
      },
      {
        label: "Beslissen",
        title: "Laat de gewenste verandering de omvang bepalen.",
        paragraphs: [
          "Beschrijf eerst wat iemand na de verbetering beter moet begrijpen of kunnen doen. Beoordeel daarna pas hoeveel van de bestaande website daarvoor moet veranderen.",
        ],
        editorialNote: {
          label: "Kernvraag",
          text: "De vraag is meestal niet of er een nieuwe website nodig is, maar wat klanten of collega’s straks beter moeten begrijpen of kunnen doen.",
        },
        editorialInsight: {
          label: "Open de technische afweging",
          title: "Wanneer beïnvloedt de bestaande basis de keuze?",
          paragraphs: [
            "Een CMS, koppeling, webshop of hostingomgeving kan een ogenschijnlijk kleine verbetering onnodig kwetsbaar of kostbaar maken. Dat is een reden om de basis te onderzoeken, niet automatisch om haar te vervangen.",
            "Daarom brengen we afhankelijkheden, beheer en de risico’s van een overstap in kaart voordat we de omvang bepalen. Wat bruikbaar en onderhoudbaar is, blijft. Alleen wat de gewenste verandering aantoonbaar blokkeert, vraagt om een nieuwe basis.",
          ],
        },
      },
    ],
    summaryTitle: "Behoud wat de nieuwe richting kan dragen.",
    summaryText:
      "Vernieuw alleen de lagen die begrip, gebruik of verdere verbetering aantoonbaar tegenwerken.",
    continuationIntro:
      "De omvang wordt duidelijker zodra je weet welke keuzes vóór ontwerp en techniek onderzocht moeten worden.",
    relatedInsights: [
      {
        path: "/kennis/wanneer-website-vernieuwen",
        title: "Wanneer is het tijd om je website te vernieuwen?",
        reason: "Controleer eerst welke signalen erop wijzen dat de website niet meer goed aansluit.",
      },
      {
        path: "/kennis/wat-wbd-doet",
        title: "Hoe helpt We Build And Design bij digitale vraagstukken?",
        reason: "Zie hoe onderzoek en duidelijke grenzen voorkomen dat de oplossing groter wordt dan de vraag.",
      },
    ],
  },
  {
    path: "/kennis/wanneer-past-wbd",
    title: "Wanneer past We Build And Design bij je vraag?",
    metaTitle: "Wanneer past We Build And Design?",
    description:
      "Lees wanneer de werkwijze van WBD bij je vraag past en wanneer waarschijnlijk niet.",
    linkLabel: "Bekijk of WBD past",
    routeLabel: "Beoordeel de samenwerking",
    lead:
      "Een goede samenwerking begint niet met overtuigen, maar met eerlijk vaststellen of de vraag, werkwijze en verantwoordelijkheid bij elkaar passen.",
    readingTime: "2 minuten",
    sections: [
      {
        label: "WBD past",
        title: "Wanneer richting én uitvoering dicht bij elkaar moeten blijven.",
        paragraphs: [
          "WBD past wanneer een vraag uit de praktijk eerst begrip en richting nodig heeft en de gekozen verbetering daarna ook zorgvuldig moet worden uitgevoerd.",
          "Dat kan binnen een organisatie met een intern team, bestaande systemen en meerdere leveranciers. We maken verantwoordelijkheden en afhankelijkheden bespreekbaar, zodat een verbetering op de ene plek geen nieuw probleem op een andere plek veroorzaakt.",
          "Wat WBD vandaag aantoonbaar kan, is professionele websites ontwerpen en bouwen. Gaat de vraag over andere software of specialistische koppelingen, dan onderzoeken we eerst of WBD de juiste rol kan nemen.",
        ],
      },
      {
        label: "WBD past mogelijk niet",
        title: "Als de oplossing volledig vaststaat of een groot team nodig is.",
        paragraphs: [
          "Zoek je uitsluitend uitvoering van een aangeleverd ontwerp, doorlopende campagneondersteuning of direct een groot specialistisch team, dan sluit een andere organisatie waarschijnlijk beter aan.",
        ],
      },
      {
        label: "Eerste gesprek",
        title: "Twijfel hoeft vooraf niet opgelost te zijn.",
        paragraphs: [
          "Je hoeft alleen te kunnen vertellen wat er speelt. In het eerste contact bekijken we of WBD kan helpen en wat een passende volgende stap is.",
        ],
        editorialNote: {
          label: "Goed om te weten",
          text: "Je hoeft de oplossing niet alvast mee te nemen. Een eerlijke beschrijving van de situatie is bruikbaarder.",
        },
      },
    ],
    summaryTitle: "Een goede samenwerking draait niet om overtuigen, maar om een passende vraag en werkwijze.",
    summaryText:
      "WBD past wanneer begrijpen, kiezen en uitvoeren één herkenbare lijn moeten vormen. Staat de oplossing al volledig vast, dan kan een andere vorm van uitvoering beter passen.",
    continuationIntro:
      "Wil je weten wat die samenwerking concreet omvat, kijk dan naar de rol van iedere stap vóór en tijdens de bouw.",
    relatedInsights: [
      {
        path: "/kennis/wat-wbd-doet",
        title: "Hoe helpt We Build And Design bij digitale vraagstukken?",
        reason: "Zie hoe begrip, richting en uitvoering elkaar opvolgen zonder los van elkaar te raken.",
      },
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of is vernieuwing nodig?",
        reason: "Bekijk hoe de gewenste verandering de omvang van een mogelijke samenwerking bepaalt.",
      },
    ],
  },
  {
    path: "/kennis/wat-wbd-doet",
    title: "Hoe helpt We Build And Design bij digitale vraagstukken?",
    metaTitle: "Hulp bij digitale vraagstukken",
    description:
      "Een concreet overzicht van hoe We Build And Design een vraag begrijpt, terugbrengt tot een heldere keuze en praktisch helpt verbeteren.",
    linkLabel: "Bekijk het denkproces",
    routeLabel: "Bekijk het geheel",
    lead:
      "Onderzoeken, kiezen, ontwerpen en uitvoeren vormen één geheel. Iedere stap bouwt voort op het begrip uit de vorige.",
    readingTime: "3 minuten",
    sections: [
      {
        label: "Onderzoeken",
        title: "De dagelijkse praktijk, betrokken mensen, bestaande systemen en onzekerheden.",
        paragraphs: [
          "We verzamelen alleen wat nodig is om de vraag te begrijpen: doelen, terugkerende handelingen, bestaande informatie, knelpunten en relevante context. Waar mogelijk verbinden we gesprekken met gebruiksgegevens, formulieren en andere signalen uit de dagelijkse praktijk.",
        ],
      },
      {
        label: "Adviseren",
        title: "Eén begrijpelijke richting en duidelijke grenzen.",
        paragraphs: [
          "Het advies maakt duidelijk wat kan blijven, wat nu verandert, waarom dat helpt en wat buiten de eerste stap blijft.",
        ],
      },
      {
        label: "Ontwerpen",
        title: "We brengen inhoud, structuur, interactie en vorm samen.",
        paragraphs: [
          "Het ontwerp maakt de gekozen richting zichtbaar en toetsbaar, voordat aanpassen tijdens de technische uitvoering lastiger wordt.",
        ],
        editorialNote: {
          label: "Even onthouden",
          text: "Een andere kleur kan iets duidelijker maken, maar bepaalt niet wát eerst duidelijk moet worden.",
        },
      },
      {
        label: "Bouwen",
        title: "Een verbetering die werkt in de dagelijkse praktijk.",
        paragraphs: [
          "Pas wanneer de richting beoordeeld kan worden, begint de technische uitvoering. WBD kan professionele websites ontwerpen en bouwen en bestaande websites gericht verbeteren.",
          "Vraagt de gekozen richting om andere software, complexe koppelingen of aanvullende specialistische kennis, dan maken we eerst duidelijk wie die verantwoordelijkheid kan dragen.",
          "Binnen de afgesproken uitvoering controleren we wat voor de situatie belangrijk is, zoals bruikbaarheid, toegankelijkheid, snelheid, veiligheid en beheer.",
        ],
        editorialInsight: {
          label: "Open de kwaliteitslaag",
          title: "Technische kwaliteit is geen losse eindcontrole",
          paragraphs: [
            "Snelheidsmetingen zijn geen doel op zichzelf. Ze kunnen wel laten zien waar beeld, code en inhoud samen een pagina vertragen. Toegankelijkheid is evenmin één controlemoment; zij begint al bij structuur, contrast, taal en interactie.",
            "Ook privacy, hosting, koppelingen en beheerbaarheid beoordelen we in hun context. De kwaliteitsvraag blijft steeds dezelfde: kunnen mensen deze oplossing betrouwbaar gebruiken, begrijpen en onderhouden?",
          ],
        },
      },
    ],
    summaryTitle: "Begrijpen, richting kiezen, ontwerpen en uitvoeren vormen één proces.",
    summaryText:
      "Onderzoek verkleint de onzekerheid. Advies bepaalt de grenzen. Ontwerp maakt de richting beoordeelbaar. De uitvoering zorgt dat dezelfde lijn in de praktijk overeind blijft.",
    continuationIntro:
      "Nu de samenhang helder is, kun je beoordelen wanneer deze manier van werken bij een vraag past — en wanneer niet.",
    relatedInsights: [
      {
        path: "/kennis/wanneer-past-wbd",
        title: "Wanneer past We Build And Design bij je vraag?",
        reason: "Beoordeel of de vraag, werkwijze en verantwoordelijkheid bij elkaar passen.",
      },
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of is vernieuwing nodig?",
        reason: "Pas deze werkwijze toe op een concrete keuze over de bestaande digitale basis.",
      },
    ],
  },
];

const pageIndex = new Map(pages.map((page) => [page.path, page]));
const articleIndex = new Map(knowledgeArticles.map((article) => [article.path, article]));
const legalPageIndex = new Map(legalPages.map((page) => [page.path, page]));

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function setMeta(
  title: string,
  description: string,
  path: string,
  options: { type?: "website" | "article"; robots?: string } = {},
): void {
  const brandedTitle = `${title} — We Build And Design`;
  document.title = brandedTitle;
  const absoluteUrl = `https://webuildanddesign.nl${path}`;
  const upsert = (selector: string, attribute: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      const [name, key] = attribute.split(":");
      element.setAttribute(name, key);
      document.head.append(element);
    }
    element.setAttribute("content", value);
  };
  upsert('meta[name="description"]', "name:description", description);
  upsert('meta[property="og:title"]', "property:og:title", brandedTitle);
  upsert('meta[property="og:description"]', "property:og:description", description);
  upsert('meta[property="og:type"]', "property:og:type", options.type ?? "website");
  upsert('meta[property="og:url"]', "property:og:url", absoluteUrl);
  if (options.robots) {
    upsert('meta[name="robots"]', "name:robots", options.robots);
  }
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = absoluteUrl;
}

function navLinks(currentPath: string): string {
  const links = [
    ["/werkwijze", "Werkwijze"],
    ["/diensten", "Diensten"],
    ["/projecten", "Projecten"],
    ["/over-ons", "Over ons"],
    ["/kennis", "Kennis"],
  ];
  return links
    .map(
      ([path, label]) =>
        `<a href="${path}"${currentPath === path || currentPath.startsWith(`${path}/`) ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
}

export function renderExperienceHeader(currentPath: string): string {
  const contactCurrent = currentPath === "/contact" ? ' aria-current="page"' : "";
  return `<header class="site-header experience-header">
    <a class="brand" href="/" aria-label="We Build And Design — home">
      <span class="brand__mark" aria-hidden="true"><span>W</span><i></i><span>BD</span></span>
      <span class="brand__name">We Build And Design</span>
    </a>
    <nav class="site-nav" aria-label="Hoofdnavigatie">${navLinks(currentPath)}</nav>
    <a class="button button--primary site-header__cta" href="/contact"${contactCurrent}>Vertel wat er speelt</a>
    <details class="site-menu">
      <summary aria-label="Open navigatie"><span></span><span></span></summary>
      <nav aria-label="Mobiele navigatie">${navLinks(currentPath)}<a href="/contact"${contactCurrent}>Contact</a></nav>
    </details>
  </header>`;
}

export function renderExperienceFooter(): string {
  return `<footer class="site-footer experience-footer">
    <a class="brand" href="/" aria-label="We Build And Design — home">
      <span class="brand__mark" aria-hidden="true"><span>W</span><i></i><span>BD</span></span>
      <span class="brand__name">We Build And Design</span>
    </a>
    <p>We begrijpen eerst hoe je organisatie werkt en verbeteren daarna wat nodig is.</p>
    <nav aria-label="Voettekstnavigatie">
      <a href="/werkwijze">Werkwijze</a><a href="/diensten">Diensten</a>
      <a href="/projecten">Projecten</a><a href="/over-ons">Over ons</a>
      <a href="/kennis">Kennis</a><a href="/contact">Contact</a>
      <a href="/algemene-voorwaarden">Algemene voorwaarden</a><a href="/privacy">Privacyverklaring</a>
    </nav>
  </footer>`;
}

function renderSection(section: ExperienceSection, index: number): string {
  return `<section class="experience-section${section.image ? " experience-section--media" : ""}">
    <div class="experience-section__copy">
      <p class="experience-label">${section.label}</p>
      <h2>${section.title}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      ${
        section.editorialNote
          ? `<aside class="editorial-note">
              <p>${section.editorialNote.label}</p>
              <blockquote>${section.editorialNote.text}</blockquote>
            </aside>`
          : ""
      }
      ${
        section.points
          ? `<ul>${section.points.map((point) => `<li>${point}</li>`).join("")}</ul>`
          : ""
      }
      ${
        section.editorialInsight
          ? `<details class="editorial-insight">
              <summary>
                <span>${section.editorialInsight.label}</span>
                <strong>${section.editorialInsight.title}</strong>
                <i aria-hidden="true"></i>
              </summary>
              <div class="editorial-insight__page">
                ${section.editorialInsight.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
              </div>
            </details>`
          : ""
      }
    </div>
    ${
      section.image
        ? `<figure class="experience-section__media experience-section__media--${index % 2 === 0 ? "left" : "right"}">
            <img src="${section.image}" alt="${escapeAttribute(section.imageAlt ?? "")}" loading="lazy" decoding="async">
          </figure>`
        : ""
    }
  </section>`;
}

function renderContactPanel(): string {
  return `<section class="experience-contact" id="contact-opnemen">
    <p class="experience-label">Een gewone eerste stap</p>
    <div>
      <h2>Begin bij wat er nu speelt.</h2>
      <p>Beschrijf in een paar regels hoe je organisatie werkt en waar iets vastloopt. Je krijgt rechtstreeks antwoord met wat we begrijpen, wat nog niet duidelijk is en welke vervolgstap eventueel past.</p>
      <div class="experience-contact__actions">
        <a class="button button--primary" href="mailto:info@webuildanddesign.nl">Stuur een e-mail</a>
        <a class="button button--secondary" href="tel:+31610067964">Bel rechtstreeks</a>
      </div>
    </div>
    <address>
      <strong>We Build And Design</strong>
      <span>Gerard Terborchstraat 35</span><span>1318 LE Almere</span>
      <span>KvK 69326126</span><span>BTW NL190255879B01</span>
    </address>
  </section>`;
}

function renderSportpaleisCaseEntry(): string {
  return `<aside class="sp-case-entry" aria-labelledby="sp-case-entry-title">
    <div class="sp-case-entry__copy">
      <p>Nieuwe praktijkcase · in ontwikkeling</p>
      <h2 id="sp-case-entry-title">Van papier naar één werkwijze.</h2>
    </div>
    <div class="sp-case-entry__action">
      <p>Niet het formulier stond centraal, maar de kennis en keuzes die erachter zaten.</p>
      <a href="/projecten/sportpaleis">Bekijk de Sportpaleis-case <span aria-hidden="true">→</span></a>
    </div>
  </aside>`;
}

function renderPage(page: ExperiencePage): string {
  setMeta(page.metaTitle, page.description, page.path);
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page experience-page--${page.path.slice(1)}" id="main-content" tabindex="-1">
    ${renderExperienceHeader(page.path)}
    <article>
      <header class="experience-hero${page.heroAsset ? "" : " experience-hero--text"}">
        ${
          page.heroAsset
            ? `<img src="${page.heroAsset}" alt="${escapeAttribute(page.heroAlt ?? "")}" style="--experience-image-position:${page.heroPosition ?? "center"}" fetchpriority="high" decoding="async">`
            : ""
        }
        <div class="experience-hero__veil" aria-hidden="true"></div>
        <div class="experience-hero__content">
          <p class="experience-kicker"><span>${page.index}</span>${page.phase}</p>
          <h1>${page.title}</h1>
          <p>${page.intro}</p>
          <a href="#inhoud">Lees verder <i aria-hidden="true"></i></a>
        </div>
      </header>
      <div class="experience-flow" id="inhoud">
        ${page.sections.map(renderSection).join("")}
        ${page.path === "/projecten" ? renderSportpaleisCaseEntry() : ""}
        ${page.contact ? renderContactPanel() : ""}
        <blockquote class="experience-reflection">${page.reflection}</blockquote>
        <aside class="experience-next">
          <p>${page.nextLabel}</p><h2>${page.nextTitle}</h2>
          <a href="${page.nextPath}" aria-label="${page.nextLabel}: ${page.nextTitle}">Volgende hoofdstuk <i aria-hidden="true"></i></a>
        </aside>
      </div>
    </article>
    ${renderExperienceFooter()}
  </main>`;
}

function renderKnowledgeHub(): string {
  setMeta(
    "Kennis voor praktische digitale keuzes",
    "Heldere inzichten om te bepalen welke digitale verbetering bij je organisatie past en wat behouden kan blijven.",
    "/kennis",
  );
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page knowledge-page" id="main-content" tabindex="-1">
    ${renderExperienceHeader("/kennis")}
    <article>
      <header class="knowledge-hero">
        <p class="experience-kicker"><span>08</span>Kennis voor een doordachte keuze</p>
        <h1>Begrijp eerst wat er in je organisatie beter kan.</h1>
        <p>Praktische vragen die helpen om te bepalen wat kan blijven en welke digitale stap echt nodig is.</p>
      </header>
      <section class="knowledge-grid" aria-label="Kennisartikelen">
        ${knowledgeArticles
          .map(
            (article, index) => `<article>
              <p><span>${article.routeLabel}</span><small>0${index + 1} / ${article.readingTime}</small></p>
              <h2><a href="${article.path}">${article.title}</a></h2>
              <p>${article.description}</p>
              <a href="${article.path}">${article.linkLabel} <span aria-hidden="true">→</span></a>
            </article>`,
          )
          .join("")}
      </section>
      <aside class="knowledge-question">
        <p>Staat je vraag er niet tussen?</p>
        <h2>Je eigen praktijk is een betere start dan een algemene oplossing.</h2>
        <p class="knowledge-question__text">Je hoeft de oplossing nog niet te kennen. Beschrijf wat er speelt; dan onderzoeken we wat eerst helder moet worden.</p>
        <a class="button button--primary" href="/contact">Vertel wat er speelt</a>
      </aside>
    </article>
    ${renderExperienceFooter()}
  </main>`;
}

function renderKnowledgeContinuation(article: KnowledgeArticle): string {
  return `<section class="knowledge-continuation" aria-labelledby="verder-lezen">
    <div class="knowledge-continuation__intro">
      <p class="experience-label">Misschien vraag je je nu af…</p>
      <h2 id="verder-lezen">Welke vraag helpt je verder?</h2>
      <p>${article.continuationIntro}</p>
    </div>
    <div class="knowledge-continuation__grid">
      ${article.relatedInsights
        .map(
          (insight) => `<article>
            <h3><a href="${insight.path}">${insight.title}</a></h3>
            <p>${insight.reason}</p>
            <a class="knowledge-continuation__link" href="${insight.path}" aria-label="Onderzoek: ${insight.title}">Onderzoek deze vraag <span aria-hidden="true">→</span></a>
          </article>`,
        )
        .join("")}
    </div>
    <a class="knowledge-back knowledge-back--footer" href="/kennis"><span aria-hidden="true">←</span> Terug naar alle kennis</a>
  </section>`;
}

function renderKnowledgeArticle(article: KnowledgeArticle): string {
  setMeta(article.metaTitle, article.description, article.path, { type: "article" });
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page knowledge-article" id="main-content" tabindex="-1">
    ${renderExperienceHeader(article.path)}
    <article>
      <header class="knowledge-article__hero">
        <a class="knowledge-back" href="/kennis"><span aria-hidden="true">←</span> Terug naar Kennis</a>
        <p class="experience-kicker"><span>K</span>${article.readingTime}</p>
        <h1>${article.title}</h1>
        <p>${article.lead}</p>
      </header>
      <div class="knowledge-article__body">
        ${article.sections.map(renderSection).join("")}
        <aside class="knowledge-article__summary">
          <p class="experience-label">Kern</p>
          <h2>${article.summaryTitle}</h2>
          <p>${article.summaryText}</p>
        </aside>
      </div>
      ${renderKnowledgeContinuation(article)}
      <aside class="knowledge-question">
        <p>Toepassen op je eigen situatie?</p>
        <h2>Begin bij wat er in de praktijk gebeurt.</h2>
        <p class="knowledge-question__text">Een eerste gesprek hoeft niet met een briefing te beginnen. Een eerlijke beschrijving van wat er speelt, is genoeg.</p>
        <a class="button button--primary" href="/contact">Vertel wat er speelt</a>
      </aside>
    </article>
    ${renderExperienceFooter()}
  </main>`;
}

function renderLegalPage(page: LegalPage): string {
  setMeta(page.eyebrow, page.description, page.path);
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page legal-page" id="main-content" tabindex="-1">
    ${renderExperienceHeader(page.path)}
    <article>
      <header class="legal-hero">
        <p class="experience-kicker"><span>—</span>${page.eyebrow}</p>
        <h1>${page.title}</h1>
        <p>${page.intro}</p>
        <p class="legal-meta">${page.updated}</p>
      </header>
      <div class="legal-layout">
        <aside class="legal-index" aria-label="Inhoudsopgave">
          <p>Op deze pagina</p>
          <ol>
            ${page.sections
              .map((section) => `<li><a href="#${section.id}">${section.title.replace(/^\d+\.\s*/, "")}</a></li>`)
              .join("")}
          </ol>
        </aside>
        <div class="legal-document">
          <aside class="legal-note">
            <p>Goed om vooraf te weten</p>
            <strong>${page.note}</strong>
          </aside>
          ${page.sections
            .map(
              (section) => `<section class="legal-section" id="${section.id}">
                <h2>${section.title}</h2>
                ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
                ${
                  section.points
                    ? `<ul>${section.points.map((point) => `<li>${point}</li>`).join("")}</ul>`
                    : ""
                }
              </section>`,
            )
            .join("")}
          <aside class="legal-contact">
            <p>Een vraag over deze afspraken?</p>
            <h2>Vraag liever om uitleg dan dat je iets moet aannemen.</h2>
            <a href="mailto:info@webuildanddesign.nl">info@webuildanddesign.nl <span aria-hidden="true">→</span></a>
          </aside>
        </div>
      </div>
    </article>
    ${renderExperienceFooter()}
  </main>`;
}

function renderNotFound(): string {
  setMeta("Pagina niet gevonden", "Deze pagina bestaat niet.", window.location.pathname, {
    robots: "noindex, follow",
  });
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page knowledge-page" id="main-content" tabindex="-1">
    ${renderExperienceHeader("")}
    <section class="knowledge-hero"><p class="experience-kicker"><span>—</span>Niet gevonden</p>
      <h1>Deze pagina konden we niet vinden.</h1>
      <p>Ga terug naar de homepage om verder te kijken.</p>
      <a class="button button--primary" href="/">Terug naar de homepage</a>
    </section>
    ${renderExperienceFooter()}
  </main>`;
}

export function renderExperiencePage(path: string): string {
  if (path === "/projecten/sportpaleis") {
    return renderSportpaleisPracticeCase(renderExperienceHeader, renderExperienceFooter);
  }
  const page = pageIndex.get(path);
  if (page) return renderPage(page);
  if (path === "/kennis") return renderKnowledgeHub();
  const article = articleIndex.get(path);
  if (article) return renderKnowledgeArticle(article);
  const legalPage = legalPageIndex.get(path);
  if (legalPage) return renderLegalPage(legalPage);
  return renderNotFound();
}

export { businessReality };
