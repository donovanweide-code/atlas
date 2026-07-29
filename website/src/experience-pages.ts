import businessReality from "./assets/images/experience/wbd-business-reality-v01.webp";
import sourceToDigital from "./assets/images/experience/wbd-source-to-digital-v01.webp";
import attentionBehindWork from "./assets/images/experience/wbd-attention-behind-work-v01.webp";
import conversationThreshold from "./assets/images/experience/wbd-conversation-threshold-v01.webp";
import responsiveCheck from "./assets/images/experience/wbd-responsive-check-v01.webp";
import methodListening from "./assets/images/atlas/generated/atlas-method-listening-v01.jpg";
import methodClarity from "./assets/images/atlas/generated/atlas-method-clarity-v01.jpg";
import methodPrototype from "./assets/images/atlas/generated/atlas-method-prototype-v01.jpg";
import { legalPages, type LegalPage } from "./legal-pages";

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
    index: "03",
    phase: "Van vraag naar digitale ervaring",
    title: "Wat werkelijk nodig is, bepaalt wat we maken.",
    intro:
      "We Build And Design onderzoekt, adviseert, ontwerpt en bouwt digitale ervaringen. Niet als vast pakket, maar als één samenhangende vertaling van een werkelijke vraag naar wat mensen digitaal moeten begrijpen en kunnen doen.",
    description:
      "Ontdek hoe We Build And Design van een werkelijke digitale vraag naar een begrijpelijke, werkende ervaring gaat.",
    heroAsset: sourceToDigital,
    heroAlt:
      "Bronmateriaal uit een werkelijke situatie wordt naast een heldere digitale structuur beoordeeld.",
    heroPosition: "center",
    sections: [
      {
        label: "03.1 / Onderzoeken",
        title: "Eerst bepalen we welke vraag werkelijk aandacht verdient.",
        paragraphs: [
          "Misschien is je website verouderd, groeit het aanbod niet meer logisch mee of begrijpen bezoekers onvoldoende wat er voor hen mogelijk is. Dat is het zichtbare probleem. De werkelijke vraag kan ergens anders liggen.",
          "We onderzoeken de situatie, het aanbod, de mensen om wie het gaat, de bestaande ervaring en de momenten waarop twijfel ontstaat. Bestaande gesprekken, zoekgedrag en meetdata kunnen daarbij helpen, zolang we ze niet verwarren met een verklaring.",
        ],
        points: [
          "Bestaande website en inhoud",
          "Aanbod, gebruikers en veelgestelde vragen",
          "Digitale route en belangrijkste onzekerheden",
        ],
        editorialInsight: {
          label: "Open de professionele context",
          title: "Waarom meetdata alleen niet genoeg is",
          paragraphs: [
            "Analytics kan laten zien waar bezoekers afhaken. Search Console kan zichtbaar maken via welke zoekvragen zij binnenkomen. Campagnedata kan tonen welke boodschap een klik oplevert. Geen van die bronnen vertelt vanzelf waarom iemand daarna twijfelt.",
            "Daarvoor bekijken we gedrag, inhoud, navigatie en techniek in samenhang. Zo wordt data een bruikbaar signaal, in plaats van een snelle conclusie met een keurig percentage erachter.",
          ],
        },
      },
      {
        label: "03.2 / Adviseren",
        title: "Eerst wordt de richting helder. Daarna kiezen we de oplossing.",
        paragraphs: [
          "We brengen mogelijkheden terug tot een keuze die je kunt begrijpen: wat veranderen we, waarom, wat moet dat opleveren en wat laten we bewust liggen?",
          "Soms leidt dat tot een nieuwe website. Soms is een gerichte verbetering van de bestaande ervaring verstandiger. Als WBD niet de passende partij is, zeggen we dat voordat het traject groter wordt.",
        ],
      },
      {
        label: "03.3 / Ontwerpen",
        title: "Design maakt de richting zichtbaar en toetsbaar.",
        paragraphs: [
          "We vertalen de gekozen richting naar inhoud, paginastructuur, interactie en visuele vorm. Je ziet niet alleen hoe iets eruitziet, maar vooral wat een bezoeker eerst moet begrijpen en welke route daarna helpt.",
          "Opties worden beoordeeld zolang aanpassen nog eenvoudig is. Zo wordt design een besluitvormingsmiddel, niet alleen een mooie eindlaag.",
        ],
        image: methodClarity,
        imageAlt:
          "Losse signalen worden teruggebracht tot een heldere inhoudelijke en visuele richting.",
      },
      {
        label: "03.4 / Bouwen",
        title: "We realiseren de ervaring die we samen hebben begrepen.",
        paragraphs: [
          "WBD bouwt professionele websites en digitale ervaringen waarin inhoud, ontwerp en techniek dezelfde richting dragen. De toepassing werkt responsive, blijft begrijpelijk en wordt gecontroleerd op wat voor dit project relevant is.",
          "Bij een bestaande omgeving kijken we bijvoorbeeld hoe contentstructuur, formulieren, integraties en beheer elkaar beïnvloeden. Performance, toegankelijkheid en organische vindbaarheid worden niet achteraf als losse controles toegevoegd; ze krijgen de plek die de toepassing vraagt.",
          "We maken geen universele kwaliteitsclaim. We leggen uit welke controles bij jouw toepassing nodig zijn en waarom.",
        ],
        image: methodPrototype,
        imageAlt:
          "Een gekozen digitale richting wordt op meerdere schermformaten gecontroleerd.",
      },
      {
        label: "03.5 / Passendheid",
        title: "WBD past wanneer kwaliteit en begrip dicht bij elkaar moeten blijven.",
        paragraphs: [
          "Je hoeft geen technische briefing te hebben. Wel helpt het wanneer je bereid bent de situatie, betrokken mensen en twijfel open te bespreken en tussentijdse keuzes werkelijk te beoordelen.",
          "Zoek je alleen snelle productie van een vooraf vaststaand ontwerp of een groot uitvoerend team, dan is een andere partij waarschijnlijk passender.",
        ],
      },
    ],
    reflection:
      "Begrijpen, richting kiezen, ontwerpen en bouwen zijn geen losse diensten. Ze vormen één lijn van werkelijkheid naar digitale ervaring.",
    nextPath: "/werkwijze",
    nextLabel: "Bekijk hoe die lijn ontstaat",
    nextTitle: "Eerst begrijpen. Dan kiezen. Daarna bouwen.",
  },
  {
    path: "/werkwijze",
    navLabel: "Werkwijze",
    index: "04",
    phase: "Een zorgvuldig ritme",
    title: "Eerst luisteren. Dan pas bouwen.",
    intro:
      "Je hoeft geen briefing of technisch plan mee te brengen. We beginnen bij jouw werkelijkheid en zorgen dat je iedere betekenisvolle keuze kunt begrijpen voordat zij wordt gebouwd.",
    description:
      "Ervaar hoe We Build And Design van een echte vraag naar een werkende digitale ervaring gaat.",
    heroAsset: methodListening,
    heroAlt:
      "Iemand laat een tastbaar onderdeel van de werkelijke situatie zien tijdens een aandachtig gesprek.",
    heroPosition: "58% center",
    sections: [
      {
        label: "04.1 / Begrijpen",
        title: "We beginnen bij wat jij iedere dag al weet.",
        paragraphs: [
          "Jij kent de situatie, de betrokken mensen en de werkelijkheid achter je vraag. We onderzoeken wat voor jou vanzelfsprekend is, maar voor een buitenstaander nog niet zichtbaar wordt.",
          "Nog geen oplossingen of technische lijst. Eerst een gedeeld beeld van wat er speelt.",
        ],
        points: [
          "Wat waarderen mensen nu al?",
          "Wat begrijpen zij nu nog niet?",
          "Welke verandering zou werkelijk helpen?",
        ],
      },
      {
        label: "04.2 / Helder krijgen",
        title: "Losse signalen worden een begrijpelijke kern.",
        paragraphs: [
          "We ordenen observaties, vragen en bestaande inhoud. Wanneer ze beschikbaar zijn, leggen we gesprekken en supportvragen naast zoekgedrag, gebruiksdata en bestaande conversieroutes. Niet om de mens tot een dashboard terug te brengen, maar om te zien waar verschillende signalen hetzelfde vertellen.",
          "Niet alles hoeft in de digitale ervaring. Alleen wat iemand helpt om de situatie te begrijpen, vertrouwen en de volgende stap te zetten.",
        ],
        image: methodClarity,
        imageAlt:
          "Bronmateriaal wordt samen geordend tot een heldere reeks van betekenisvolle keuzes.",
      },
      {
        label: "04.3 / Samen kiezen",
        title: "Je ziet de keuze voordat zij definitief wordt.",
        paragraphs: [
          "Structuur, inhoud en ontwerp maken mogelijkheden vergelijkbaar. Je hoeft geen ontwerper te zijn om te kunnen beoordelen waarom een richting bij de vraag en gewenste uitkomst past.",
          "Een besluit is pas sterk wanneer jij het zelf kunt begrijpen en dragen.",
        ],
      },
      {
        label: "04.4 / Zichtbaar maken",
        title: "Design vertaalt begrip naar een ervaring die je kunt gebruiken.",
        paragraphs: [
          "We maken de route, prioriteiten en interacties tastbaar. Daarmee toetsen we of de digitale ervaring werkelijk zegt en doet wat we samen hebben bedoeld.",
        ],
        image: methodPrototype,
        imageAlt:
          "Een gekozen structuur wordt als digitale ervaring op verschillende schermen getoetst.",
      },
      {
        label: "04.5 / Bouwen en verder",
        title: "De gekozen lijn blijft overeind in de werkende toepassing.",
        paragraphs: [
          "Tijdens de bouw controleren en verfijnen we. Een bestaand CMS, webshop, integratie, interne collega of andere leverancier wordt niet genegeerd omdat die niet in een nieuw ontwerp past; de afhankelijkheden horen bij de werkelijkheid die de oplossing moet dragen.",
          "Na livegang kun je met vragen terugkomen. Nieuwe wensen worden opnieuw beoordeeld op wat de situatie dan nodig heeft, niet automatisch aan de bestaande oplossing toegevoegd.",
        ],
      },
    ],
    reflection:
      "Je hoeft de digitale antwoorden niet vooraf te kennen. Je moet kunnen begrijpen waarom een keuze bij de werkelijke vraag past.",
    nextPath: "/projecten",
    nextLabel: "Bekijk hoe we naar werk kijken",
    nextTitle: "Werk wordt bewijs wanneer de context eerlijk verteld kan worden.",
  },
  {
    path: "/projecten",
    navLabel: "Projecten",
    index: "05",
    phase: "Werk en werkelijkheid",
    title: "Werk bewijst zich pas in de werkelijkheid.",
    intro:
      "Een beeld van een website is nog geen case. We delen alleen wat de uitgangssituatie, de keuzes, het gebouwde werk en de werkelijke betekenis samen kan laten zien.",
    description:
      "Lees hoe We Build And Design projecten beoordeelt en welk werk vandaag aantoonbaar gedeeld kan worden.",
    heroAsset: responsiveCheck,
    heroAlt:
      "Een digitale ervaring wordt op een telefoon en een groter scherm gecontroleerd.",
    heroPosition: "center",
    sections: [
      {
        label: "05.1 / Geen etalage",
        title: "De context komt vóór het eindbeeld.",
        paragraphs: [
          "Een projectpagina hoort niet alleen smaak te tonen. Je moet kunnen zien welke situatie er speelde, welke keuze richting gaf en wat daarna aantoonbaar veranderde.",
        ],
      },
      {
        label: "05.2 / Huidige praktijk",
        title: "Deze website laat zien hoe WBD keuzes onderzoekt en bouwt.",
        paragraphs: [
          "Deze website is iteratief ontwikkeld vanuit observaties over positionering, begrip, beeldtaal, inhoud, responsive gedrag en gecontroleerde livegang. Keuzes zijn vastgelegd, gebouwd, getest en waar nodig teruggedraaid.",
          "Dit laat zien dat WBD zijn eigen werkwijze toepast: eerst begrijpen, vervolgens zichtbaar maken, gecontroleerd bouwen en pas daarna beoordelen.",
        ],
        points: [
          "Een werkende, samenhangende digitale ervaring op desktop en mobiel",
          "Inhoud, beeld, ontwerp en techniek ontwikkeld vanuit dezelfde richting",
          "Een gecontroleerde livegang met ruimte om verantwoord terug te draaien",
        ],
        editorialInsight: {
          label: "Open het werkdossier",
          title: "Wat is hier werkelijk uitgevoerd en geleerd?",
          paragraphs: [
            "<strong>Vertrekpunt.</strong> De website liet nog niet snel genoeg zien wat WBD concreet realiseert en voelde per pagina nog niet als één merkwereld.",
            "<strong>Onderzocht en herzien.</strong> Positionering, art direction, paginastructuur, copy, beeldritme en de compositie boven de vouw zijn afzonderlijk onderzocht. Diensten werden niet als productmenu opgebouwd, omdat de werkelijke vraag eerst richting moest geven.",
            "<strong>Gebouwd en gecontroleerd.</strong> De publieke reis, kennisbibliotheek, responsive ritme, toetsenbordgebruik, metadata, performance en gecontroleerde release zijn in samenhang beoordeeld. Keuzes die niet voldeden zijn aangepast of teruggedraaid.",
            "<strong>Geleerd.</strong> De bezoeker moet vroeg begrijpen dat WBD niet alleen onderzoekt en adviseert, maar ook ontwerpt en bouwt. De positionering moest bovendien ruimte bieden aan teams en organisaties, zonder de menselijke nabijheid te verliezen.",
            "<strong>Nog niet geclaimd.</strong> Er is nog geen extern klantresultaat, conversiestijging of organische groei die aan deze website kan worden toegeschreven. Zulke uitkomsten blijven onderzoek totdat echte praktijk ze bevestigt.",
          ],
        },
      },
      {
        label: "05.3 / Wat nog niet wordt geclaimd",
        title: "Geen resultaat voordat het werkelijk bestaat.",
        paragraphs: [
          "Er zijn op dit moment geen gepubliceerde klantcases met bevestigde uitkomsten. Dat ontbrekende bewijs vullen we niet aan met fictieve resultaten, testimonials of representatieve succesverhalen.",
          "Nieuwe projecten verschijnen hier zodra vraag, samenwerking, gebouwd werk en observaties samen een eerlijk verhaal vormen.",
        ],
      },
    ],
    reflection:
      "Eerst goed werk leveren. Daarna het echte verhaal vertellen.",
    nextPath: "/over-ons",
    nextLabel: "Lees waarom WBD zo werkt",
    nextTitle: "Onze naam begint met bouwen. Ons werk begint met begrijpen.",
  },
  {
    path: "/over-ons",
    navLabel: "Over ons",
    index: "06",
    phase: "De aandacht achter het werk",
    title: "Onze naam begint met bouwen. Ons werk begint met begrijpen.",
    intro:
      "We Build And Design helpt helder krijgen wat digitaal werkelijk nodig is. Daarna ontwerpen en bouwen we de professionele website of digitale ervaring die daarbij past.",
    description:
      "Waarom We Build And Design eerst begrijpt en daarna professionele websites en digitale ervaringen bouwt.",
    heroAsset: attentionBehindWork,
    heroAlt:
      "Vanuit het perspectief van de vraagsteller wordt een digitale keuze aandachtig beoordeeld.",
    heroPosition: "center",
    sections: [
      {
        label: "06.1 / Werkelijkheid",
        title: "Je vraag begint nooit op een leeg vel.",
        paragraphs: [
          "Er zijn al mensen, keuzes en onderdelen die goed werken. Jij kent de dagelijkse werkelijkheid achter de vraag. Wij helpen zien wat moet blijven, wat niet meer meegroeit en wat nog niet helder wordt begrepen.",
          "Wat we nog niet begrijpen, vullen we niet alvast in.",
        ],
      },
      {
        label: "06.2 / Richting",
        title: "Richting begint bij een betere vraag.",
        paragraphs: [
          "De vraag waarmee je binnenkomt, is niet altijd de vraag die het meeste verschil maakt. Samen onderscheiden we wat vaststaat, wat onzeker is en welke verandering nu de meeste waarde toevoegt.",
          "Zo ontstaat overzicht en een volgende stap die je zelf kunt begrijpen en dragen.",
        ],
      },
      {
        label: "06.3 / Design",
        title: "Design the understanding first.",
        paragraphs: [
          "Ontwerpen begint niet bij kleur of een mooi scherm. Het begint bij wat iemand moet begrijpen, welke informatie voorrang krijgt en welke route daarbij helpt.",
          "We vertalen dat naar inhoud, structuur, interactie en vorm, zodat je opties kunt vergelijken voordat we definitief bouwen.",
        ],
      },
      {
        label: "06.4 / Build",
        title: "We Build.",
        paragraphs: [
          "WBD stopt niet bij inzicht, advies of een ontwerpbestand. We realiseren professionele websites en digitale ervaringen waarin inhoud, ontwerp en techniek dezelfde gekozen richting dragen.",
          "Tijdens de bouw toetsen we of die lijn in de werkende toepassing overeind blijft. Waar gebruik of beheer om een correctie vraagt, sturen we bij.",
        ],
        image: responsiveCheck,
        imageAlt:
          "Een werkende digitale ervaring wordt responsive en inhoudelijk gecontroleerd.",
      },
      {
        label: "06.5 / Begrenzing",
        title: "Niet alles wat kan, hoeft te worden gebouwd.",
        paragraphs: [
          "Soms is behouden, kleiner beginnen of eerst één onzekerheid onderzoeken de sterkste keuze. Een technische oplossing is alleen zinvol wanneer zij werkelijk helpt.",
        ],
      },
      {
        label: "06.6 / Verantwoordelijkheid",
        title: "Van eerste gesprek tot uitvoering blijft dezelfde lijn bewaakt.",
        paragraphs: [
          "De persoon die luistert, blijft betrokken bij de keuzes, het ontwerp en de digitale vertaling. Begrip, richting en realisatie worden niet aan losse loketten overgedragen.",
          "Wanneer aanvullende expertise nodig is, maken we dat helder en betrekken we die gericht. Zo blijft duidelijk wie verantwoordelijkheid draagt, terwijl jouw werkelijkheid het uitgangspunt blijft.",
        ],
      },
      {
        label: "06.7 / Volgende stap",
        title: "Een vraag hoeft nog geen oplossing te zijn.",
        paragraphs: [
          "Vertel wat er speelt, wat mensen moeilijk begrijpen of welke volgende stap je overweegt. Eerst wordt helder welke kleine stap passend is — en of er überhaupt iets gebouwd moet worden.",
        ],
      },
    ],
    reflection:
      "Onze naam begint met bouwen. Ons werk begint met begrijpen.",
    nextPath: "/contact",
    nextLabel: "Vertel wat er speelt",
    nextTitle: "Een eerste gesprek begint bij je werkelijkheid, niet bij een briefing.",
  },
  {
    path: "/contact",
    navLabel: "Contact",
    index: "07",
    phase: "Een gewone eerste stap",
    title: "Vertel wat er speelt.",
    intro:
      "Je hoeft nog geen briefing, planning of technische keuze te hebben. Beschrijf kort wat er verandert, wat digitaal niet meer werkt of welke vraag je blijft uitstellen.",
    description:
      "Neem rechtstreeks contact op met We Build And Design over een digitale vraag of gewenste verandering.",
    heroAsset: conversationThreshold,
    heroAlt:
      "Een rustige werkruimte staat klaar voor een open eerste gesprek.",
    heroPosition: "center",
    sections: [
      {
        label: "07.1 / Wanneer contact past",
        title: "Je weet dat er digitaal iets moet veranderen, maar nog niet wat de juiste stap is.",
        paragraphs: [
          "Misschien groeit je website niet meer mee, wordt online onvoldoende duidelijk wat mensen kunnen doen of raakt een verandering verstrikt in bestaande keuzes. Je hoeft nog niet te weten of verbeteren, vernieuwen of iets kleiners passend is.",
        ],
      },
      {
        label: "07.2 / Wat je kunt verwachten",
        title: "Het eerste gesprek draait om de context, niet om een kant-en-klare oplossing.",
        paragraphs: [
          "We luisteren naar wat er speelt en maken daarna duidelijk of WBD passend is en welke kleine vervolgstap betekenisvol kan zijn. Als een andere richting verstandiger is, benoemen we dat.",
        ],
      },
    ],
    reflection:
      "Een echte vraag is genoeg om het gesprek te beginnen.",
    nextPath: "/",
    nextLabel: "Terug naar het begin",
    nextTitle: "Begrip blijft het vertrekpunt.",
    contact: true,
  },
];

const knowledgeArticles: KnowledgeArticle[] = [
  {
    path: "/kennis/wanneer-website-vernieuwen",
    title: "Wanneer is het tijd om je website te vernieuwen?",
    description:
      "Herken wanneer je website niet meer meegroeit en bepaal of vernieuwing werkelijk nodig is.",
    linkLabel: "Onderzoek de signalen",
    routeLabel: "Begin hier",
    lead:
      "Niet iedere oude website hoeft te worden vervangen. De relevante vraag is of de huidige ervaring mensen nog helpt om te begrijpen, kiezen en handelen.",
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
          "Terugkerende twijfel over aanbod, werkwijze, prijsrichting of passendheid is bruikbaar onderzoeksmateriaal. Het laat zien waar de digitale ervaring onvoldoende richting geeft.",
          "Analytics kan laten zien op welke pagina een route stopt en Search Console via welke zoekintentie iemand binnenkomt. Waarom die persoon twijfelt, wordt pas zichtbaar wanneer data naast gesprekken, inhoud en navigatie wordt gelegd.",
        ],
        editorialNote: {
          label: "Veelgemaakte aanname",
          text: "Meer informatie is niet altijd het antwoord. Soms staat alles er al, maar krijgt het nog niet de juiste prioriteit.",
        },
      },
      {
        label: "Signaal 03",
        title: "De techniek beperkt betekenisvolle verbetering.",
        paragraphs: [
          "Een nieuw systeem is pas logisch wanneer de bestaande basis aanpassingen, toegankelijkheid, snelheid of beheer daadwerkelijk belemmert. Alleen het bouwjaar is zelden een overtuigend argument.",
        ],
      },
      {
        label: "Eerste stap",
        title: "Begin met vaststellen wat behouden moet blijven.",
        paragraphs: [
          "Breng eerst in kaart wat mensen al begrijpen, welke pagina’s worden gebruikt en welke onderdelen de huidige werkelijkheid goed vertegenwoordigen. Dan wordt duidelijk of gerichte verbetering volstaat of een nieuwe website eerlijker is.",
        ],
      },
    ],
    summaryTitle: "Vernieuw niet omdat een website oud voelt, maar omdat de huidige ervaring de gewenste verandering belemmert.",
    summaryText:
      "Onderzoek eerst wat nog werkt, waar begrip verloren gaat en of de bestaande basis verbetering werkelijk in de weg staat.",
    continuationIntro:
      "Als vernieuwing een mogelijkheid wordt, ontstaat meestal meteen een tweede vraag: hoeveel moet er werkelijk veranderen?",
    relatedInsights: [
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of begin je opnieuw?",
        reason: "Vergelijk een gerichte verbetering met het bouwen van een nieuwe digitale basis.",
      },
      {
        path: "/kennis/wat-wbd-doet",
        title: "Wat onderzoekt, adviseert, ontwerpt en bouwt WBD?",
        reason: "Bekijk hoe een onduidelijke vernieuwingsvraag stap voor stap wordt teruggebracht tot richting.",
      },
    ],
  },
  {
    path: "/kennis/website-verbeteren-of-vernieuwen",
    title: "Verbeter je de bestaande website of begin je opnieuw?",
    description:
      "Een praktische afweging tussen gericht verbeteren en een nieuwe digitale basis bouwen.",
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
          "Als positionering, techniek en structuur nog bruikbaar zijn, kan een gerichte aanpassing aan inhoud, navigatie, interactie of toegankelijkheid meer waarde leveren dan volledige vervanging.",
        ],
      },
      {
        label: "Vernieuwen",
        title: "Vernieuw wanneer meerdere lagen elkaar tegelijk tegenwerken.",
        paragraphs: [
          "Wanneer verhaal, structuur, vorm en techniek allemaal niet meer passen, wordt lokaal repareren vaak duurder en onduidelijker. Een nieuwe basis kan dan juist kleiner en beter beheersbaar zijn.",
        ],
      },
      {
        label: "Beslissen",
        title: "Laat de gewenste verandering de omvang bepalen.",
        paragraphs: [
          "Beschrijf eerst wat iemand na de verbetering beter moet begrijpen of kunnen doen. Beoordeel daarna pas hoeveel van de bestaande website daarvoor moet veranderen.",
        ],
        editorialNote: {
          label: "Werkelijke vraag",
          text: "De vraag is meestal niet of er een nieuwe website nodig is. De vraag is welke verandering mensen straks beter moeten begrijpen of kunnen uitvoeren.",
        },
        editorialInsight: {
          label: "Open de technische afweging",
          title: "Wanneer beïnvloedt de bestaande basis de keuze?",
          paragraphs: [
            "Een CMS, koppeling, webshop of hostingomgeving kan een ogenschijnlijk kleine verbetering onnodig kwetsbaar of kostbaar maken. Dat is een reden om de basis te onderzoeken, niet automatisch om haar te vervangen.",
            "We brengen daarom afhankelijkheden, beheer en migratierisico's in kaart voordat de omvang wordt bepaald. Wat bruikbaar en onderhoudbaar is, blijft. Alleen wat de gewenste verandering aantoonbaar blokkeert, vraagt om een nieuwe basis.",
          ],
        },
      },
    ],
    summaryTitle: "Behoud wat de nieuwe richting kan dragen.",
    summaryText:
      "Vernieuw alleen de lagen die begrip, gebruik of verdere ontwikkeling aantoonbaar tegenwerken.",
    continuationIntro:
      "De omvang wordt duidelijker zodra je weet welke keuzes vóór ontwerp en techniek onderzocht moeten worden.",
    relatedInsights: [
      {
        path: "/kennis/wanneer-website-vernieuwen",
        title: "Wanneer is het tijd om je website te vernieuwen?",
        reason: "Controleer eerst welke signalen werkelijk op een verouderde digitale ervaring wijzen.",
      },
      {
        path: "/kennis/wat-wbd-doet",
        title: "Wat onderzoekt, adviseert, ontwerpt en bouwt WBD?",
        reason: "Zie hoe onderzoek en begrenzing voorkomen dat de oplossing groter wordt dan de vraag.",
      },
    ],
  },
  {
    path: "/kennis/wanneer-past-wbd",
    title: "Wanneer past We Build And Design bij je vraag?",
    description:
      "Lees wanneer de ontwerp- en bouwpraktijk van WBD passend is en wanneer waarschijnlijk niet.",
    linkLabel: "Beoordeel de passendheid",
    routeLabel: "Beoordeel de samenwerking",
    lead:
      "Een goede samenwerking begint niet bij overtuigen, maar bij eerlijk vaststellen of vraag, werkwijze en verantwoordelijkheid bij elkaar passen.",
    readingTime: "2 minuten",
    sections: [
      {
        label: "WBD past",
        title: "Wanneer richting én realisatie dicht bij elkaar moeten blijven.",
        paragraphs: [
          "WBD past wanneer de digitale vraag nog begrip en richting nodig heeft, keuzes beoordeelbaar moeten blijven en de gekozen lijn daarna ook professioneel gerealiseerd moet worden.",
          "Dat kan ook binnen een organisatie met een intern team, bestaande systemen en meerdere leveranciers. Voorwaarde is dat verantwoordelijkheden en afhankelijkheden bespreekbaar blijven, zodat één keuze niet elders onverwacht schade veroorzaakt.",
        ],
      },
      {
        label: "WBD past mogelijk niet",
        title: "Als de oplossing volledig vaststaat of een groot team nodig is.",
        paragraphs: [
          "Zoek je uitsluitend productie van een aangeleverd ontwerp, voortdurende campagnecapaciteit of grootschalige specialistische uitvoering, dan sluit een andere organisatie waarschijnlijk beter aan.",
        ],
      },
      {
        label: "Eerste gesprek",
        title: "Twijfel hoeft vooraf niet opgelost te zijn.",
        paragraphs: [
          "Je hoeft alleen te kunnen vertellen wat er speelt. In het eerste contact bekijken we of WBD betekenisvol kan helpen en wat een passende volgende stap zou zijn.",
        ],
        editorialNote: {
          label: "Goed om te weten",
          text: "Je hoeft de oplossing niet alvast mee te nemen. Een eerlijke beschrijving van de situatie is bruikbaarder.",
        },
      },
    ],
    summaryTitle: "Passendheid gaat niet over overtuigen, maar over de aard van de vraag en de gewenste samenwerking.",
    summaryText:
      "WBD past wanneer begrijpen, kiezen en realiseren één herkenbare lijn moeten vormen. Staat de oplossing al volledig vast, dan kan een andere vorm van uitvoering beter passen.",
    continuationIntro:
      "Wil je weten wat die samenwerking concreet omvat, kijk dan naar de rol van iedere stap vóór en tijdens de bouw.",
    relatedInsights: [
      {
        path: "/kennis/wat-wbd-doet",
        title: "Wat onderzoekt, adviseert, ontwerpt en bouwt WBD?",
        reason: "Zie hoe richting en realisatie elkaar opvolgen zonder los van elkaar te raken.",
      },
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of begin je opnieuw?",
        reason: "Bekijk hoe de gewenste verandering de omvang van een mogelijke samenwerking bepaalt.",
      },
    ],
  },
  {
    path: "/kennis/wat-wbd-doet",
    title: "Wat onderzoekt, adviseert, ontwerpt en bouwt WBD?",
    description:
      "Een concreet overzicht van de rol van onderzoek, advies, design en build binnen We Build And Design.",
    linkLabel: "Bekijk het denkproces",
    routeLabel: "Bekijk het geheel",
    lead:
      "De disciplines zijn geen los menu. Iedere volgende stap is afhankelijk van het begrip dat in de vorige ontstaat.",
    readingTime: "3 minuten",
    sections: [
      {
        label: "Onderzoeken",
        title: "De situatie, betrokken mensen, bestaande ervaring en onzekerheden.",
        paragraphs: [
          "We verzamelen alleen wat nodig is om de digitale vraag te begrijpen: doelen, vragen, huidige inhoud, routes, frictie en relevante context. Waar beschikbaar verbinden we gesprekken met zoekgedrag, analytics, formulieren en andere signalen uit de werkende ervaring.",
        ],
      },
      {
        label: "Adviseren",
        title: "Eén begrijpelijke richting en bewuste begrenzing.",
        paragraphs: [
          "Advies maakt helder wat nu verandert, waarom, wat het moet opleveren en wat buiten de eerste stap blijft.",
        ],
      },
      {
        label: "Ontwerpen",
        title: "Inhoud, structuur, interactie en visuele vorm.",
        paragraphs: [
          "Design maakt de gekozen richting zichtbaar en toetsbaar voordat technische realisatie de aanpassingsruimte kleiner maakt.",
        ],
        editorialNote: {
          label: "Even onthouden",
          text: "Een andere kleur kan iets duidelijker maken. Maar niet bepalen wát eerst duidelijk moet worden.",
        },
      },
      {
        label: "Bouwen",
        title: "Een werkende, responsive digitale ervaring.",
        paragraphs: [
          "Pas wanneer de richting beoordeeld kan worden, begint de technische realisatie. We vertalen de gekozen lijn naar een professionele toepassing en controleren wat voor de specifieke ervaring relevant is, waaronder bruikbaarheid, toegankelijkheid, snelheid, vindbaarheid, veiligheid en beheer.",
        ],
        editorialInsight: {
          label: "Open de kwaliteitslaag",
          title: "Technische kwaliteit is geen losse eindcontrole",
          paragraphs: [
            "Core Web Vitals zijn geen doel op zichzelf. Ze kunnen wel laten zien waar beeld, code en content samen een pagina vertragen. Toegankelijkheid gaat evenmin over één auditmoment; zij begint al bij structuur, contrast, taal en interactie.",
            "Ook privacy, hosting, integraties en beheerbaarheid worden in hun context beoordeeld. De relevante kwaliteitsvraag is steeds dezelfde: kan deze ervaring betrouwbaar gebruikt, begrepen en onderhouden worden?",
          ],
        },
      },
    ],
    summaryTitle: "Begrijpen, richting kiezen, ontwerpen en bouwen vormen één denkproces.",
    summaryText:
      "Onderzoek verkleint de onzekerheid. Advies begrenst de richting. Design maakt haar toetsbaar. Build zorgt dat dezelfde lijn in de werkende ervaring overeind blijft.",
    continuationIntro:
      "Nu de samenhang helder is, kun je beoordelen wanneer deze manier van werken bij een vraag past — en wanneer niet.",
    relatedInsights: [
      {
        path: "/kennis/wanneer-past-wbd",
        title: "Wanneer past We Build And Design bij je vraag?",
        reason: "Beoordeel of vraag, werkwijze en verantwoordelijkheid werkelijk bij elkaar passen.",
      },
      {
        path: "/kennis/website-verbeteren-of-vernieuwen",
        title: "Verbeter je de bestaande website of begin je opnieuw?",
        reason: "Pas het denkproces toe op een concrete keuze over de bestaande digitale basis.",
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

function setMeta(title: string, description: string, path: string): void {
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
  upsert('meta[property="og:type"]', "property:og:type", "website");
  upsert('meta[property="og:url"]', "property:og:url", absoluteUrl);
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
    ["/diensten", "Diensten"],
    ["/werkwijze", "Werkwijze"],
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
    <p>We helpen begrijpen wat digitaal werkelijk nodig is en bouwen daarna de passende ervaring.</p>
    <nav aria-label="Voettekstnavigatie">
      <a href="/diensten">Diensten</a><a href="/werkwijze">Werkwijze</a>
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
      <h2>Begin bij waar je nu staat.</h2>
      <p>Beschrijf in een paar regels wat er speelt. Je ontvangt een persoonlijk antwoord over wat we zien en welke vervolgstap passend kan zijn.</p>
      <div class="experience-contact__actions">
        <a class="button button--primary" href="mailto:info@webuildanddesign.nl">Stuur een e-mail</a>
        <a class="button button--secondary" href="tel:+31610067964">Bel direct</a>
      </div>
    </div>
    <address>
      <strong>We Build And Design</strong>
      <span>Gerard Terborchstraat 35</span><span>1318 LE Almere</span>
      <span>KvK 69326126</span><span>BTW NL190255879B01</span>
    </address>
  </section>`;
}

function renderPage(page: ExperiencePage): string {
  setMeta(page.navLabel, page.description, page.path);
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
    "Kennis voor digitale keuzes",
    "Een samenhangende bibliotheek met heldere inzichten over digitale vragen, richting, design en build.",
    "/kennis",
  );
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page knowledge-page" id="main-content" tabindex="-1">
    ${renderExperienceHeader("/kennis")}
    <article>
      <header class="knowledge-hero">
        <p class="experience-kicker"><span>08</span>Kennis die een keuze helpt dragen</p>
        <h1>Begrijp eerst welke digitale stap werkelijk nodig is.</h1>
        <p>Geen losse artikelen, maar een groeiende bibliotheek van vragen die vóór ontwerp en techniek aandacht verdienen.</p>
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
        <h2>Een echte situatie is vaak een betere start dan een algemene oplossing.</h2>
        <p class="knowledge-question__text">Je hoeft de oplossing nog niet te kennen. Beschrijf wat er speelt; dan onderzoeken we welke vraag eerst helder moet worden.</p>
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
  setMeta(article.title, article.description, article.path);
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
        <h2>Onderzoek eerst welke vraag aandacht verdient.</h2>
        <p class="knowledge-question__text">Een eerste gesprek hoeft niet met een briefing te beginnen. Een eerlijke beschrijving van wat er speelt is genoeg.</p>
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
  setMeta("Pagina niet gevonden", "Deze pagina bestaat niet.", window.location.pathname);
  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page knowledge-page" id="main-content" tabindex="-1">
    ${renderExperienceHeader("")}
    <section class="knowledge-hero"><p class="experience-kicker"><span>—</span>Niet gevonden</p>
      <h1>Deze route loopt hier niet verder.</h1>
      <p>Ga terug naar het begin en kies opnieuw waar je wilt kijken.</p>
      <a class="button button--primary" href="/">Terug naar de homepage</a>
    </section>
    ${renderExperienceFooter()}
  </main>`;
}

export function renderExperiencePage(path: string): string {
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
