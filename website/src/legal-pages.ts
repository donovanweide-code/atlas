export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
}

export interface LegalPage {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  updated: string;
  note: string;
  sections: LegalSection[];
}

export const legalPages: LegalPage[] = [
  {
    path: "/algemene-voorwaarden",
    title: "Duidelijke afspraken voor zorgvuldig digitaal werk.",
    description:
      "De zakelijke algemene voorwaarden van We Build And Design, helder uitgelegd voor advies, ontwerp en digitale realisatie.",
    eyebrow: "Algemene voorwaarden",
    intro:
      "Goed samenwerken begint niet bij kleine letters, maar bij afspraken die beide partijen kunnen begrijpen. Deze voorwaarden beschrijven de vaste basis onder onze zakelijke opdrachten.",
    updated: "Versie 28 juli 2026",
    note:
      "De offerte of opdrachtbevestiging beschrijft wat we voor een specifieke opdracht afspreken. Wijkt die afspraak af van deze voorwaarden, dan gaat de specifieke afspraak voor.",
    sections: [
      {
        id: "wie-wij-zijn",
        title: "1. Wie wij zijn en wanneer deze voorwaarden gelden",
        paragraphs: [
          "We Build And Design is een eenmanszaak, gevestigd aan de Gerard Terborchstraat 35, 1318 LE Almere en ingeschreven bij de Kamer van Koophandel onder nummer 69326126. Ons btw-nummer is NL190255879B01. Vragen kun je sturen naar info@webuildanddesign.nl.",
          "Deze voorwaarden gelden voor offertes en overeenkomsten waarin We Build And Design zakelijke opdrachtgevers helpt met onderzoek, advies, ontwerp, ontwikkeling en andere digitale dienstverlening. Voor een opdracht van een consument maken we vooraf afzonderlijke, passende afspraken.",
          "Voorwaarden van de opdrachtgever gelden alleen wanneer We Build And Design die uitdrukkelijk en schriftelijk heeft aanvaard.",
        ],
      },
      {
        id: "offerte-en-overeenkomst",
        title: "2. Offerte en overeenkomst",
        paragraphs: [
          "Een offerte beschrijft de vraag, aanpak, beoogde resultaten, prijs en relevante aannames. Zij is geldig gedurende de genoemde termijn. Ontbreekt die termijn, dan blijft de offerte dertig dagen geldig.",
          "De overeenkomst ontstaat zodra de opdrachtgever de offerte of opdrachtbevestiging schriftelijk of elektronisch aanvaardt. Zij ontstaat ook wanneer We Build And Design op verzoek van de opdrachtgever aantoonbaar met het afgesproken werk begint.",
          "Alleen wat in de overeenkomst is opgenomen behoort tot de opdracht. Een gesprek of voorbeeld dat niet als afspraak is vastgelegd, verandert de scope niet vanzelf.",
        ],
      },
      {
        id: "samenwerken",
        title: "3. Samenwerken en verantwoordelijkheid",
        paragraphs: [
          "De opdrachtgever levert tijdig de informatie, inhoud, toegang en beslissingen die redelijkerwijs nodig zijn. We Build And Design mag ervan uitgaan dat aangeleverde informatie juist is en dat de opdrachtgever de benodigde gebruiksrechten heeft.",
          "Wanneer informatie, feedback of toegang later komt dan afgesproken, kan de planning verschuiven. We bespreken de gevolgen voordat hierdoor extra werk of kosten ontstaan.",
          "We Build And Design blijft verantwoordelijk voor de eigen professionele afwegingen. De opdrachtgever blijft verantwoordelijk voor bedrijfsbesluiten, de juistheid van bedrijfsinformatie en de uiteindelijke goedkeuring van inhoud en richting.",
        ],
      },
      {
        id: "wijzigingen",
        title: "4. Veranderingen tijdens de opdracht",
        paragraphs: [
          "Een nieuwe observatie kan de juiste richting veranderen. Daarom behandelen we een wijziging niet automatisch als meerwerk of als iets dat stilzwijgend wordt meegenomen.",
          "Heeft een wijziging invloed op scope, planning of prijs, dan maken we die invloed eerst begrijpelijk. Pas na akkoord voeren we haar uit. Kleine aanpassingen zonder betekenisvolle invloed kunnen binnen de bestaande opdracht worden verwerkt.",
        ],
      },
      {
        id: "planning-en-oplevering",
        title: "5. Planning, beoordeling en oplevering",
        paragraphs: [
          "Planning is een gezamenlijke verwachting. Een datum is alleen een harde uiterste termijn wanneer dat uitdrukkelijk is afgesproken. Afhankelijkheid van feedback, derden of bestaande systemen kan de planning veranderen.",
          "We leveren op via de afgesproken omgeving of overdracht. De opdrachtgever krijgt een redelijke mogelijkheid om het resultaat te beoordelen en meldt aantoonbare afwijkingen zo snel mogelijk. We Build And Design krijgt eerst gelegenheid om een afwijking van de overeenkomst te onderzoeken en te herstellen.",
          "Oplevering betekent niet dat onderhoud, hosting, updates of ondersteuning doorlopend onderdeel blijven van de opdracht. Dat geldt alleen wanneer dit afzonderlijk is afgesproken.",
        ],
      },
      {
        id: "prijs-en-betaling",
        title: "6. Prijs en betaling",
        paragraphs: [
          "Bedragen zijn exclusief btw, tenzij anders vermeld. De offerte bepaalt hoe en wanneer wordt gefactureerd. Ontbreekt een apart betaalschema, dan mag We Build And Design voltooid werk tussentijds of bij oplevering factureren.",
          "Facturen worden binnen veertien dagen na factuurdatum betaald. Is een factuur inhoudelijk onduidelijk, dan bespreekt de opdrachtgever dat zo snel mogelijk; het onbetwiste deel blijft betaalbaar.",
          "Blijft betaling na een schriftelijke herinnering uit, dan mag We Build And Design het werk tijdelijk pauzeren. Wettelijke handelsrente en redelijke buitengerechtelijke incassokosten kunnen dan in rekening worden gebracht.",
        ],
      },
      {
        id: "derden",
        title: "7. Diensten en materialen van derden",
        paragraphs: [
          "Digitale ervaringen kunnen afhankelijk zijn van hosting, software, koppelingen, lettertypen of andere diensten van derden. We maken zulke afhankelijkheden zichtbaar wanneer zij betekenisvol zijn voor kosten, continuïteit of gebruik.",
          "Voor diensten van derden kunnen eigen licenties en voorwaarden gelden. We Build And Design kan niet garanderen dat een derde zijn dienst ongewijzigd of zonder storing blijft aanbieden, maar helpt binnen de opdracht om gevolgen zorgvuldig te beoordelen.",
        ],
      },
      {
        id: "intellectueel-eigendom",
        title: "8. Intellectueel eigendom en gebruik",
        paragraphs: [
          "Materiaal dat de opdrachtgever aanlevert blijft van de opdrachtgever of diens rechthebbende. De opdrachtgever staat ervoor in dat dit materiaal voor de opdracht mag worden gebruikt.",
          "Na volledige betaling mag de opdrachtgever het specifiek opgeleverde werk duurzaam gebruiken voor het afgesproken doel. Overdracht van intellectuele-eigendomsrechten, bewerkbare bronbestanden of een ruimer gebruiksrecht geldt alleen wanneer dat uitdrukkelijk is afgesproken.",
          "Bestaande methoden, kennis, algemene componenten, hulpmiddelen en herbruikbare technieken van We Build And Design blijven van We Build And Design. We gebruiken een opdracht alleen als publieke case of portfolio-item na uitdrukkelijke toestemming van de opdrachtgever.",
        ],
      },
      {
        id: "vertrouwelijkheid-en-privacy",
        title: "9. Vertrouwelijkheid en persoonsgegevens",
        paragraphs: [
          "Beide partijen behandelen vertrouwelijke bedrijfsinformatie zorgvuldig en gebruiken die alleen voor de opdracht. Deze verplichting blijft gelden wanneer de samenwerking eindigt.",
          "Iedere partij blijft verantwoordelijk voor de eigen naleving van privacywetgeving. Wanneer We Build And Design voor de opdrachtgever structureel persoonsgegevens verwerkt, leggen partijen waar nodig aanvullende afspraken vast in een verwerkersovereenkomst.",
        ],
      },
      {
        id: "kwaliteit",
        title: "10. Kwaliteit, herstel en verwachtingen",
        paragraphs: [
          "We Build And Design voert de opdracht zorgvuldig en professioneel uit. De controles worden afgestemd op de toepassing en de afgesproken scope.",
          "Een digitale ervaring blijft mede afhankelijk van inhoud, gebruik, apparaten, browsers en diensten van derden. Daarom garanderen we geen specifieke omzet, conversie, zoekpositie of volledig ononderbroken werking.",
          "Meldt de opdrachtgever tijdig een aantoonbare afwijking, dan onderzoeken we eerst of het werk afwijkt van wat is afgesproken. Onderhoud, uitbreiding en veranderingen na oplevering zijn geen herstelwerk wanneer zij buiten die afspraak vallen.",
        ],
      },
      {
        id: "aansprakelijkheid",
        title: "11. Aansprakelijkheid",
        paragraphs: [
          "We Build And Design is alleen aansprakelijk voor directe schade die het aantoonbare gevolg is van een toerekenbare tekortkoming. De opdrachtgever stelt We Build And Design eerst schriftelijk in gebreke en geeft een redelijke hersteltermijn, tenzij herstel blijvend onmogelijk is.",
          "Voor zover de wet dit toestaat, is de aansprakelijkheid beperkt tot het bedrag exclusief btw dat voor het betreffende deel van de opdracht is gefactureerd. Bij een doorlopende overeenkomst geldt maximaal het bedrag dat in de zes maanden vóór de schade voor die dienstverlening is betaald.",
          "Aansprakelijkheid voor indirecte schade, zoals gemiste winst, gemiste besparingen of bedrijfsstagnatie, is uitgesloten. Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van We Build And Design en doen niets af aan rechten die wettelijk niet mogen worden beperkt.",
        ],
      },
      {
        id: "beeindigen-en-overmacht",
        title: "12. Beëindigen en overmacht",
        paragraphs: [
          "Een partij mag de overeenkomst beëindigen wanneer de andere partij een wezenlijke afspraak niet nakomt en die tekortkoming niet binnen een redelijke schriftelijke hersteltermijn oplost.",
          "Stopt de opdrachtgever eerder zonder tekortkoming van We Build And Design, dan worden het uitgevoerde werk, gemaakte kosten en niet meer annuleerbare verplichtingen betaald. We zorgen voor een redelijke overdracht van wat tot dat moment is betaald en opgeleverd.",
          "Geen van beide partijen is aansprakelijk voor vertraging door omstandigheden die redelijkerwijs buiten haar invloed liggen. Duurt zo'n situatie langer dan zestig dagen, dan mag iedere partij het nog niet uitgevoerde deel beëindigen. Reeds uitgevoerd werk en gemaakte kosten blijven verschuldigd.",
        ],
      },
      {
        id: "vragen-en-geschillen",
        title: "13. Vragen, klachten en geschillen",
        paragraphs: [
          "Een vraag of klacht bespreken we eerst rechtstreeks. Een heldere beschrijving van wat er volgens de opdrachtgever afwijkt, helpt om sneller tot een oplossing te komen.",
          "Op de overeenkomst is Nederlands recht van toepassing. Komen partijen er samen niet uit, dan wordt het geschil voorgelegd aan de bevoegde rechter in het arrondissement waar We Build And Design is gevestigd, tenzij dwingend recht een andere rechter aanwijst.",
        ],
      },
    ],
  },
  {
    path: "/privacy",
    title: "Privacy zonder verborgen laag.",
    description:
      "Lees welke persoonsgegevens We Build And Design verwerkt, waarom dat gebeurt en welke keuzes de publieke website bewust niet maakt.",
    eyebrow: "Privacyverklaring",
    intro:
      "We vragen alleen om informatie die nodig is om een vraag te begrijpen, samen te werken of aan wettelijke verplichtingen te voldoen. Deze verklaring beschrijft de werkelijkheid van de website en onze zakelijke contacten van vandaag.",
    updated: "Versie 28 juli 2026",
    note:
      "De publieke website gebruikt nu geen contactformulier, analytics, trackingcookies of marketingprofielen. Contact begint via je eigen e-mail- of telefoonapp.",
    sections: [
      {
        id: "verantwoordelijke",
        title: "1. Wie verantwoordelijk is",
        paragraphs: [
          "We Build And Design is verantwoordelijk voor de persoonsgegevens die in deze verklaring worden beschreven. We zijn gevestigd aan de Gerard Terborchstraat 35, 1318 LE Almere en staan bij de Kamer van Koophandel ingeschreven onder nummer 69326126.",
          "Voor een privacyvraag of verzoek kun je e-mailen naar info@webuildanddesign.nl.",
        ],
      },
      {
        id: "gegevens",
        title: "2. Welke gegevens we verwerken",
        paragraphs: [
          "Wanneer je contact opneemt, kunnen we je naam, bedrijfsnaam, e-mailadres, telefoonnummer en de inhoud van je vraag ontvangen. Tijdens een samenwerking kunnen daar afspraken, correspondentie, aangeleverd materiaal, projectkeuzes, factuurgegevens en contactgegevens van betrokkenen bij komen.",
          "Bij een websitebezoek kan de hostingomgeving technisch noodzakelijke servergegevens vastleggen, zoals een IP-adres, browsertype, tijdstip en opgevraagde pagina. We gebruiken deze gegevens niet om een marketingprofiel te maken.",
          "We vragen niet om bijzondere persoonsgegevens. Stuur zulke informatie niet mee wanneer die niet noodzakelijk is voor je vraag.",
        ],
      },
      {
        id: "doelen-en-grondslagen",
        title: "3. Waarom we gegevens gebruiken",
        paragraphs: [
          "We gebruiken contactgegevens om een vraag te beantwoorden, een mogelijke opdracht te onderzoeken en afspraken voor te bereiden. Dat is nodig voor stappen vóór een overeenkomst of volgt uit ons gerechtvaardigde belang om zorgvuldig op een zakelijke vraag te reageren.",
          "Tijdens een opdracht gebruiken we gegevens om de overeenkomst uit te voeren, keuzes vast te leggen, werk op te leveren en contact te onderhouden. Factuur- en administratiegegevens verwerken we omdat de wet dat van ondernemers vraagt.",
          "Technische gegevens kunnen worden gebruikt om de website veilig en betrouwbaar te houden, fouten te onderzoeken en misbruik tegen te gaan. Dat is ons gerechtvaardigde belang. We gebruiken geen geautomatiseerde besluitvorming en sturen geen nieuwsbrief zonder afzonderlijke toestemming.",
        ],
      },
      {
        id: "bron",
        title: "4. Waar de gegevens vandaan komen",
        paragraphs: [
          "De meeste gegevens ontvangen we rechtstreeks van jou. Soms verstrekt een opdrachtgever of collega zakelijke contactgegevens omdat je bij een project betrokken bent. Technische servergegevens ontstaan wanneer je browser een pagina bij de hostingomgeving opvraagt.",
          "We kopen geen contactlijsten en verzamelen niet zonder aanleiding persoonsgegevens van openbare profielen.",
        ],
      },
      {
        id: "delen",
        title: "5. Met wie we gegevens delen",
        paragraphs: [
          "De website en zakelijke e-mail maken gebruik van diensten van TransIP. Deze leverancier kan gegevens verwerken voor hosting, e-mail, beveiliging en technische ondersteuning.",
          "Voor broncode en versiebeheer gebruiken we GitHub. Daarbij kunnen technische projectgegevens worden verwerkt. We plaatsen daar niet bewust meer persoonsgegevens dan voor ontwikkeling en versiebeheer nodig is.",
          "ChatGPT en Codex van OpenAI kunnen ons ondersteunen bij analyse, redactie en ontwikkeling. We beperken de informatie die we daarvoor gebruiken tot wat voor die taak nodig is en blijven zelf verantwoordelijk voor iedere afweging en ieder resultaat.",
          "Wanneer een opdracht dat nodig maakt, kunnen gegevens worden gedeeld met een zorgvuldig gekozen specialist, softwareleverancier of professioneel adviseur. We delen alleen wat voor die taak nodig is en leggen waar vereist afspraken over verwerking en vertrouwelijkheid vast.",
          "We verkopen geen persoonsgegevens. We verstrekken ze alleen aan een overheidsinstantie wanneer een wettelijke verplichting dat vereist.",
        ],
      },
      {
        id: "buiten-eer",
        title: "6. Verwerking buiten de Europese Economische Ruimte",
        paragraphs: [
          "De huidige publieke website en zakelijke e-mail zijn ondergebracht bij TransIP. GitHub en OpenAI kunnen gegevens ook buiten de Europese Economische Ruimte verwerken.",
          "Wanneer een leverancier gegevens buiten de EER verwerkt, gebruiken we de dienst alleen wanneer daarvoor een geldige wettelijke waarborg bestaat, zoals een adequaatheidsbesluit of goedgekeurde standaardcontractbepalingen.",
        ],
      },
      {
        id: "bewaren",
        title: "7. Hoe lang we gegevens bewaren",
        paragraphs: [
          "Een zakelijke vraag die niet tot een opdracht leidt bewaren we maximaal twee jaar na het laatste inhoudelijke contact, tenzij eerder verwijderen passend is.",
          "Projectcorrespondentie en afspraken bewaren we in beginsel maximaal vijf jaar na het einde van een opdracht. Gegevens die onderdeel zijn van onze fiscale administratie, zoals facturen en betaalinformatie, bewaren we zeven jaar. Is informatie nodig voor een lopend geschil of een wettelijke verplichting, dan kan een langere termijn gelden.",
          "Technische serverlogs worden alleen bewaard zolang dat nodig is voor beveiliging, storingsonderzoek en beheer van de hostingomgeving. De hostingprovider hanteert daarvoor zijn eigen technische bewaarschema. We gebruiken deze logs niet voor bezoekersprofielen.",
        ],
      },
      {
        id: "beveiliging",
        title: "8. Hoe we gegevens beschermen",
        paragraphs: [
          "We nemen passende technische en organisatorische maatregelen die passen bij de aard van de gegevens en de huidige dienstverlening. Toegang wordt beperkt tot mensen en leveranciers die de informatie nodig hebben voor hun taak.",
          "Geen digitale overdracht is zonder risico. Vermoed je dat gegevens onjuist zijn gebruikt of beveiligd, neem dan direct contact op via info@webuildanddesign.nl.",
        ],
      },
      {
        id: "rechten",
        title: "9. Jouw privacyrechten",
        paragraphs: [
          "Je kunt vragen om inzage, correctie, verwijdering, beperking of overdracht van je persoonsgegevens. Je kunt ook bezwaar maken tegen een verwerking op basis van een gerechtvaardigd belang en een eerder gegeven toestemming intrekken.",
          "Stuur je verzoek naar info@webuildanddesign.nl. We reageren in beginsel binnen één maand. Wanneer we redelijkerwijs moeten controleren of het verzoek van jou komt, vragen we alleen om de informatie die daarvoor noodzakelijk is.",
          "Denk je dat we niet zorgvuldig met je gegevens omgaan, bespreek dat dan bij voorkeur eerst met ons. Je hebt daarnaast het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens via autoriteitpersoonsgegevens.nl.",
        ],
      },
      {
        id: "cookies",
        title: "10. Cookies en vergelijkbare technieken",
        paragraphs: [
          "De publieke website plaatst nu geen cookies en gebruikt geen lokale browseropslag, analytics, trackingpixels of andere volgtechnieken. Daarom tonen we geen cookiebanner en is een afzonderlijk cookiebeleid nu niet nodig.",
          "Voordat we later een techniek toevoegen waarvoor informatie of toestemming nodig is, beoordelen we eerst doel, gegevens en gevolgen. Pas daarna passen we de website en deze verklaring aan.",
        ],
      },
      {
        id: "wijzigingen",
        title: "11. Wanneer deze verklaring verandert",
        paragraphs: [
          "Deze verklaring volgt de werkelijke gegevensverwerking. Verandert de website of onze manier van werken op een relevante manier, dan werken we de verklaring bij en vermelden we een nieuwe versiedatum.",
          "Een nieuwe versie geldt vanaf publicatie. Voor een wezenlijk nieuw doel informeren we betrokkenen vooraf wanneer de AVG dat vereist.",
        ],
      },
    ],
  },
];
