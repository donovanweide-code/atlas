# Semantic SEO Foundation Review

**Status:** Sprintdocument — ter review  
**Scope:** audit en implementatievoorstel; geen implementatie  
**Onderzocht:** repository, actuele build en goedgekeurde Homepage Experience  
**Leidende regel:** SEO ondersteunt de Experience; zij mag haar nooit vervangen.

## 1. Managementsamenvatting

De publieke Experience heeft inhoudelijk een sterke semantische kern. De homepage communiceert een herkenbaar probleem, een duidelijke doelgroep, een onderscheidende werkwijze en een rustige volgende stap. De zichtbare HTML gebruikt bovendien grotendeels betekenisvolle elementen zoals `main`, `header`, `nav`, `section`, `article`, `aside` en `footer`.

De technische SEO-fundering is echter nog niet op hetzelfde niveau.

De grootste risico’s zijn:

1. publieke inhoud wordt volledig via client-side JavaScript in een lege `#app` geplaatst;
2. het document declareert `lang="en"` terwijl de Experience Nederlandstalig is;
3. routegebonden descriptions, canonicals, robotsregels, Open Graph en Twitter/X-metadata ontbreken;
4. sitemap, publieke `robots.txt` en webmanifest ontbreken;
5. structured data ontbreekt volledig;
6. interne Atlas-routes worden pas na JavaScript op `noindex` gezet;
7. routebeelden missen expliciete intrinsieke afmetingen en responsive bronselectie;
8. werkelijke praktijkbewijzen en concrete dienstgrenzen zijn nog onvoldoende om alle relevante zoekvragen overtuigend te beantwoorden.

De juiste eerste SEO-implementatie is daarom geen zoekwoordronde. Eerst moet iedere publieke route een zelfstandige, serverleesbare HTML-pagina met een waarheidsgetrouwe head en semantische hoofdinhoud worden.

## 2. Onderzoeksmethode en beperkingen

### Onderzocht

- `Foundation.md`
- de goedgekeurde homepage in `website/src/main.ts`
- de vijf bestaande publieke routes in `website/src/public-pages.ts`
- `website/index.html`
- `website/package.json`
- `website/public`
- productiebuild in `website/dist`
- publieke interne links en semantische elementkeuze
- aanwezige beeld- en bundeloutput

### Niet aantoonbaar vastgesteld

- productiehostname en definitieve URL-structuur;
- hostingplatform, HTTP-headers, compressie en cachebeleid;
- actuele indexstatus in Google/Bing;
- velddata uit Chrome UX Report of Search Console;
- echte Core Web Vitals van productiebezoekers;
- bedrijfsadres, telefoonnummer, servicegebied, openingstijden en juridische entiteitsgegevens;
- toestemming en brondata voor klantcases, testimonials en meetbare resultaten.

Deze punten blijven onzeker. Het document maakt er geen feiten van.

## 3. Huidige semantische betekenis

## 3.1 Sterke punten

### Homepage

- Eén zichtbare H1 bevat de centrale positionering.
- Hoofdstukken gebruiken H2’s en inhoudelijke kaarten gebruiken H3’s.
- Iedere hoofdsectie heeft een toegankelijke naam via `aria-labelledby`.
- Inhoudelijke reeksen zijn als `article` gemarkeerd.
- De hoofdnavigatie heeft een expliciet label.
- Decoratieve symboliek is grotendeels uit de candidate verwijderd of voor hulptechnologie verborgen.
- Betekenisvolle fotografie heeft een beschrijvend toegankelijk label; decoratieve beeldlagen hebben lege alt-tekst.
- Links beschrijven grotendeels hun bestemming of bedoeling.

### Overige routes

- Iedere route bevat één H1.
- De route-inhoud staat in een `article`.
- Verdiepende hoofdstukken zijn `section`-elementen met H2’s.
- Reflectie en volgende stap zijn als `aside` gemarkeerd.
- De actuele navigatieroute krijgt `aria-current="page"`.
- Hero-afbeeldingen hebben beschrijvende alt-teksten.
- Er is een zichtbare 404-ervaring.

## 3.2 Risico’s en inconsistenties

### Taaldeclaratie

`website/index.html` gebruikt `<html lang="en">`, terwijl vrijwel alle publieke content Nederlands is.

**Risico:** verkeerde uitspraak door schermlezers, minder duidelijke taalcontext voor zoekmachines en AI-systemen.

### Client-side rendering

De statische HTML bevat alleen:

```html
<div id="app"></div>
```

Alle route-inhoud wordt na JavaScript uitgevoerd.

**Risico:**

- crawlers zonder volledige JavaScript-rendering zien geen inhoud;
- metadata kan niet betrouwbaar per route uit de eerste response komen;
- link unfurlers en social crawlers voeren doorgaans geen applicatie-JavaScript uit;
- AI-crawlers verschillen sterk in rendercapaciteit;
- een JavaScript-fout maakt de volledige publieke inhoud onzichtbaar.

### Landmarkstructuur

Op de homepage staan header en footer binnen dezelfde `main`; de footer staat bovendien binnen de afsluitende `section`. Op routepagina’s staan siteheader en sitefooter eveneens binnen `main`.

Dit is niet automatisch ongeldig, maar communiceert minder helder dat header en footer sitebrede landmarks zijn en dat `main` uitsluitend de unieke hoofdinhoud hoort te bevatten.

### Sectielabels

De homepage gebruikt betekenisvolle secties. Sommige routepagina’s vertrouwen nog op numerieke hoofdstukaanduidingen en een visuele routelijn. Na de bindende ontwerpbeslissing over symboliek moet bij iedere toekomstige route worden vastgesteld of die nummering werkelijk oriëntatie biedt.

### 404-status

De applicatie rendert zelf een “route niet gevonden”-pagina. Zonder hostingconfiguratie is niet aantoonbaar dat de HTTP-response ook status `404` teruggeeft.

**Risico:** soft 404’s en indexatie van niet-bestaande URL’s.

## 4. Metadata-audit

| Onderdeel | Huidige staat | Beoordeling |
|---|---|---|
| Document title | Homepage heeft statische generieke titel; andere routes wijzigen `document.title` na JS | Onvoldoende voor eerste response en social crawlers |
| Meta description | Niet aanwezig | Hoog gemis |
| Canonical | Niet aanwezig | Hoog risico bij meerdere URL-varianten |
| Robots meta publiek | Niet aanwezig | Neutraal voor publieke routes, maar niet expliciet |
| Robots Atlas | `/atlas` en `/atlas-lab` voegen na JS `noindex, nofollow` toe | Te laat en afhankelijk van rendering |
| Open Graph | Niet aanwezig | Sociale previews missen betekenis en beeld |
| Twitter/X | Niet aanwezig | Sociale previews missen betekenis en beeld |
| Favicon | SVG aanwezig en vernieuwd | Sterk begin; aanvullende formaten nog te beoordelen |
| Webmanifest | Niet aanwezig | Gemiste merk- en installatiefundering; geen SEO-prioriteit op zichzelf |
| Social preview image | Niet aanwezig | Gemiste kans voor consistente merkpresentatie |
| `theme-color` | Niet aanwezig | Lage prioriteit |
| `hreflang` | Niet aanwezig | Correct zolang er maar één bevestigde taal/marktversie is |

### Metadata-principe

Iedere publieke route krijgt later een eigen title en description die:

- de echte ondernemersvraag samenvat;
- geen onbewezen uitkomst belooft;
- de routefunctie respecteert;
- menselijk leesbaar blijft;
- niet wordt volgestopt met zoektermen.

De definitieve titles en descriptions horen bij de copyfase van iedere route, niet bij deze sprint.

## 5. Structured-data-audit

Er is momenteel geen JSON-LD of andere Schema.org-markup aanwezig.

## 5.1 Schema’s die waarschijnlijk waarde toevoegen

### Organization

**Waarde:** maakt afzender, naam, URL, logo en bevestigde publieke contactrelaties expliciet.

**Voorwaarde:** officiële naam, definitieve URL, correct logo en eventuele profielen zijn bevestigd.

### WebSite

**Waarde:** identificeert de publieke website als geheel en verbindt deze aan de Organization.

**Voorwaarde:** definitieve site-URL en naam zijn bekend.

### WebPage

**Waarde:** beschrijft per route naam, URL, taal, hoofdonderwerp en relatie tot WebSite.

**Voorwaarde:** routes zijn statisch/prerendered en hun metadata is goedgekeurd.

### Service

**Waarde:** kan op Diensten afzonderlijke, werkelijk geleverde vormen van hulp beschrijven.

**Voorwaarde:** de dienst bestaat aantoonbaar, heeft een duidelijke provider en de publieke omschrijving is goedgekeurd. Geen schema voor toekomstige of theoretische diensten.

## 5.2 Alleen toevoegen wanneer de werkelijkheid het draagt

### LocalBusiness

Nu niet onderbouwd. Een publiek adres, lokaal servicegebied en relevante bedrijfsgegevens zijn niet bevestigd in de onderzochte bronnen.

`ProfessionalService` of een passende subtypekeuze mag pas na bewijs en actuele Schema.org-validatie worden overwogen. Organization is voorlopig eerlijker.

### Person

Kan later waarde toevoegen op Over ons wanneer een publiek persoon, rol en relatie tot de Organization expliciet zijn goedgekeurd. Niet gebruiken om de primaire afzender weer van “wij” naar één persoon te verschuiven.

### BreadcrumbList

Alleen gebruiken wanneer de Experience een echte, zichtbare hiërarchie hanteert. De huidige routes zijn grotendeels gelijkwaardige hoofdnav-items. Onzichtbare breadcrumbs uitsluitend voor zoekmachines voegen geen eerlijke betekenis toe.

### FAQPage

Niet voorgesteld. De huidige Experience bevat geen echte FAQ-structuur en zoekmachines kennen beperkte rich-resultwaarde toe. Vragen mogen nooit kunstmatig worden toegevoegd voor schema.

### Review / AggregateRating

Niet gebruiken zonder echte, publiceerbare reviews en een geldige toepassing binnen de Schema.org- en zoekmachinerichtlijnen.

## 5.3 Implementatieregel

Structured data:

- beschrijft alleen zichtbare of aantoonbare werkelijkheid;
- gebruikt stabiele `@id`-waarden;
- verbindt Organization, WebSite en WebPage;
- wordt per build gevalideerd;
- introduceert geen claims die niet in de Experience zelf verantwoord kunnen worden.

## 6. Zoekintentie

## 6.1 Werkelijke vraagclusters

De relevante zoekintentie is breder dan “website laten maken”.

| Vraagcluster | Werkelijke ondernemersvraag | Aansluiting homepage | Benodigde verdieping |
|---|---|---|---|
| Website verbeteren | “Wat werkt nog en wat moet werkelijk sterker?” | Sterk: behouden en verbeteren zijn expliciet mogelijk | Diensten + cases met bestaande websites |
| Website vernieuwen | “Moet alles opnieuw of kan het gerichter?” | Sterk: “Niet alles hoeft opnieuw” | Bewijs van afweging en keuze |
| Digitale strategie | “Welke digitale stap past nu bij mijn bedrijf?” | Sterk: vraag achter de vraag en gedragen richting | Werkwijze met besluitlogica |
| Online aanwezigheid verbeteren | “Waarom lopen verhaal, website en bedrijf niet meer gelijk?” | Sterk in hero en eerste hoofdstukken | Diensten met samenhang tussen disciplines |
| Digitale partner | “Wie blijft naast mij denken en uitvoeren?” | Gedeeltelijk: begeleiding wordt voelbaar maar niet concreet | Werkwijze, Over ons en bevestigde begeleidingspraktijk |
| Online groeien | “Welke volgende stap voegt echt waarde toe?” | Sterk begrensd: groei zonder permanente drukte | Projectbewijs en meetbare uitkomsten |
| Digitale begeleiding | “Wie helpt keuzes begrijpelijk maken?” | Sterk als positionering | Concrete samenwerkingsvormen, alleen na bevestiging |
| Bestaande digitale basis | “Hoe bouw ik verder op wat ik al heb?” | Zeer sterk | Cases over behoud, uitbreiding en gefaseerde verbetering |

## 6.2 Zoekintentieconclusie

De homepage sluit inhoudelijk goed aan op probleem- en oriëntatiegerichte zoekintentie. Zij vermijdt terecht een vroege productkeuze.

De gemiste kans zit niet primair in meer termen, maar in ontbrekende verdieping:

- wat dienstverlening concreet kan betekenen;
- hoe samenwerking werkelijk verloopt;
- welke cases de belofte bewijzen;
- voor welke situaties We Build And Design wel en niet passend is;
- welke resultaten of lessen aantoonbaar zijn.

Deze verdieping hoort bij de routeontwikkeling en bewijsverzameling, niet als extra SEO-tekst op de homepage.

## 7. AI readiness

## 7.1 Kan een AI-systeem de kernvragen beantwoorden?

### Wat doet We Build And Design?

**Menselijk antwoord uit Foundation en homepage:** We Build And Design helpt ervaren ondernemers begrijpen wat hun bedrijf digitaal werkelijk nodig heeft, maakt de gekozen richting zichtbaar en bouwt zorgvuldig wanneer bouwen betekenis toevoegt.

**Huidige machineleesbaarheid:** inhoudelijk goed, technisch kwetsbaar door volledige client-side rendering.

### Voor wie?

**Antwoord:** voor ervaren ondernemers die al klanten, ervaring en een bedrijf hebben opgebouwd en merken dat verhaal, website, processen of technologie niet meer vanzelf meegroeien.

**Huidige dekking:** sterk op homepage en in Foundation.

### Welk probleem wordt opgelost?

**Antwoord:** niet alleen een verouderde website, maar gebrek aan overzicht en richting wanneer verschillende delen van het digitale fundament niet meer gelijk oplopen.

**Huidige dekking:** sterk op homepage.

### Waarom is de werkwijze anders?

**Antwoord:** de oplossing staat niet vooraf vast; feiten, aannames en onzekerheden worden onderscheiden en keuzes worden samen gedragen voordat ontwerp of techniek ze definitief maakt.

**Huidige dekking:** inhoudelijk aanwezig, maar Werkwijze moet dit later als zelfstandige route bewijzen.

### Wat is de volgende stap?

**Antwoord:** de werkwijze bekijken of een rustig gesprek beginnen over wat er nu speelt, zonder de oplossing vooraf te hoeven kennen.

**Huidige dekking:** aanwezig via interne links; Contact moet operationele verwachtingen later bevestigen.

## 7.2 AI-risico’s

- Crawlers zonder JavaScript zien geen antwoorden.
- Oude routecopy en actuele homepagepositionering kunnen zonder redactionele herijking verschillende accenten geven.
- Ontbrekende structured data maakt afzender en paginarelatie minder expliciet.
- Ontbrekend praktijkbewijs kan ertoe leiden dat AI-systemen de methode goed samenvatten maar weinig concrete onderbouwing vinden.
- Historische project-bibleteksten positioneren WBD sterker als websitebouwer; zij zijn niet publiek geladen, maar mogen later niet ongemerkt als actuele copybron worden gebruikt.

## 7.3 AI-ready schrijfregel voor latere fases

Iedere route moet in zichtbare, natuurlijke taal zelfstandig duidelijk maken:

1. over welke ondernemerssituatie de route gaat;
2. welke vraag zij beantwoordt;
3. wat WBD aantoonbaar doet;
4. welke grens of onzekerheid geldt;
5. welke logische volgende stap beschikbaar is.

Geen verborgen “AI-copy”, woordenlijsten of extra tekstblokken uitsluitend voor machines.

## 8. Technical SEO

## 8.1 Rendering en indexeerbaarheid

### Bevinding

Vite bouwt één applicatieshell. Routekeuze en inhoudsrendering gebeuren in `main.ts` op basis van `window.location.pathname`.

### Risico

De publieke Experience is afhankelijk van JavaScript-rendering. Routehead, statuscodes en inhoud zijn niet gegarandeerd in de eerste HTML-response.

### Aanbeveling

Maak iedere publieke route statisch of prerendered:

- `/`
- `/werkwijze`
- `/diensten`
- `/projecten`
- `/over-ons`
- `/contact`

Elke route moet eigen HTML, headmetadata en hoofdinhoud in de response bevatten. Hydration of clientinteractie mag daarna volgen, maar mag niet nodig zijn om de betekenis te lezen.

## 8.2 Robots en sitemap

### Bevinding

- Geen publieke `robots.txt`.
- Geen XML-sitemap.
- `/atlas` en `/atlas-lab` krijgen alleen na JS `noindex, nofollow`.

### Aanbeveling

- Maak een productie-`robots.txt` met verwijzing naar de sitemap.
- Neem alleen canonieke, goedgekeurde publieke routes in de sitemap op.
- Sluit interne Atlas-routes op server-/hostingniveau uit en lever `X-Robots-Tag` of statische robotsmeta mee.
- Overweeg bovendien authenticatie of netwerkbeperking voor interne werkruimtes; `noindex` is geen toegangsbeveiliging.

## 8.3 Core Web Vitals en performance

### Aantoonbare sterke punten

- Beelden gebruiken grotendeels WebP.
- Niet-hero-afbeeldingen worden doorgaans lazy geladen.
- Hero-afbeeldingen gebruiken `fetchpriority="high"`.
- JavaScript is relatief klein in de huidige build.
- `prefers-reduced-motion` wordt ondersteund.

### Aantoonbare risico’s

- De publieke hoofdbundel laadt circa 128 kB ongecomprimeerde CSS.
- Publieke afbeeldingen hebben in de HTML geen `width` en `height`.
- Er is geen `srcset`/`sizes` voor responsive beeldselectie.
- De homepage gebruikt meerdere beeldlagen; dit kan LCP, decodekosten en mobiel datagebruik verhogen.
- Fonts en hun laaddiscipline moeten vóór productie afzonderlijk worden gemeten.
- Reveal-animaties maken zichtbaarheid afhankelijk van JavaScript en IntersectionObserver, al bestaat er een fallback.
- Twee vision-board PNG’s van ruim 2 MB worden in de buildoutput uitgegeven. Zij lijken bij Atlas Lab te horen en hoeven niet noodzakelijk door publieke bezoekers geladen te worden, maar build- en deploymenthygiëne verdient controle.

### Niet vastgesteld

- LCP, CLS en INP uit velddata.
- TTFB.
- Brotli/gzip.
- immutable caching voor gehashte assets.
- CDN-gedrag.
- preload/preconnect-beleid.

### Meetvoorstel

Na prerendering en vóór publicatie:

1. Lighthouse mobiel en desktop per publieke route;
2. WebPageTest op een representatieve Nederlandse verbinding;
3. toetsen op 360–430 px, tablet en desktop;
4. na livegang CrUX/Search Console volgen;
5. beeldbytes, LCP-element, CLS-bronnen en long tasks per route vastleggen.

Geen harde scorebelofte opnemen voordat deze metingen bestaan.

## 8.4 Afbeeldingen

### Aanbeveling

- Voeg intrinsieke dimensies toe.
- Genereer passende mobiele en desktopvarianten.
- Gebruik `srcset` en `sizes`.
- Houd slechts één werkelijk betekenisvol LCP-beeld eager.
- Behoud beschrijvende alt-tekst voor inhoudelijke fotografie.
- Houd decoratieve lagen leeg in alt-tekst en buiten de accessibility tree.
- Laat bestandsnamen, alt-tekst en captions de scène beschrijven; geen zoekwoordstapeling.
- Maak een goedgekeurd social-previewbeeld dat de merkidentiteit draagt zonder mock-upclaims.

## 8.5 Interne structuur

### Sterk

- Alle hoofdroutes zijn vanuit navigatie gelinkt.
- De homepage verwijst inhoudelijk naar Werkwijze.
- Bestaande routepagina’s hebben een expliciete volgende route.

### Risico

De bestaande “volgende route”-volgorde wijkt af van de nieuwe Experience Architecture. In `public-pages.ts` loopt Diensten naar Werkwijze en Werkwijze rechtstreeks naar Projecten. De nieuwe blauwdruk hanteert als standaardverdieping:

Homepage → Werkwijze → Diensten → Projecten → Over ons → Contact.

Dit is geen implementatiebesluit, maar moet vóór routecopy en interne-linkimplementatie worden opgelost.

### Regel

Interne links moeten voortkomen uit ondernemersvragen, niet uit een SEO-silo die de Experience dwingt.

## 8.6 Overige technische risico’s

- Er is geen aantoonbare canonicalisatie van trailing slashes, hoofdletters, hostvarianten of parameters.
- Een Content Security Policy en overige securityheaders zijn niet onderzocht omdat hostingconfiguratie ontbreekt.
- Contactprivacy, spambeheersing en formulierstatus zijn nog niet relevant geïmplementeerd en moeten later als aparte risico’s worden behandeld.
- Er is geen aantoonbare RSS/feedbehoefte; niet toevoegen zonder redactioneel gebruik.
- Een webmanifest is nuttig voor merkconsistentie, maar geen prioriteit boven renderbaarheid, metadata en indexeerbaarheid.

## 9. Prioriteiten

## P0 — vóór publieke release

1. Publieke routes statisch genereren of prerenderen.
2. `lang="nl"` en correcte documentstructuur per route.
3. Unieke title, description en canonical per goedgekeurde route.
4. Betrouwbare 404-status.
5. Publieke `robots.txt` en XML-sitemap.
6. Interne Atlas-routes buiten indexatie houden op respons-/hostingniveau.
7. Intrinsieke beeldafmetingen en controle van LCP/CLS.

## P1 — tijdens route-implementaties

1. Organization, WebSite en WebPage JSON-LD na bevestiging van entiteitsgegevens.
2. Open Graph en Twitter/X metadata met goedgekeurde previews.
3. Service-schema uitsluitend voor werkelijk bevestigde diensten.
4. Routegebonden intentie- en entiteitsdekking zonder extra SEO-copy.
5. Praktijkbewijs met bron, context en begrensde resultaten.
6. Responsive afbeeldingen en routegebonden assetbudgetten.
7. Interne links laten aansluiten op de goedgekeurde Experience Architecture.

## P2 — na livegang en echte data

1. Core Web Vitals volgen via velddata.
2. Search Console-indexatie en query’s analyseren.
3. AI-antwoorden periodiek toetsen op juistheid.
4. Contentgaten alleen vullen wanneer echte ondernemersvragen ze bevestigen.
5. Eventuele LocalBusiness-, Person- of aanvullende schema’s heroverwegen na bewijs.

## 10. Implementatievoorstel

Dit voorstel is een volgorde voor later werk, geen toestemming om nu te implementeren.

### Fase 1 — technische publicatiefundering

- Kies en documenteer prerendering/statische generatie.
- Definieer de canonieke productie-URL.
- Scheid publieke routes van interne Atlas-routes.
- Maak een herbruikbaar route-headmodel voor language, title, description, canonical, robots en social metadata.
- Maak sitemap en robotsbeleid onderdeel van de build.
- Zorg dat onbekende routes echte 404-responses geven.

### Fase 2 — semantisch paginacontract

Definieer per route een technisch contract:

- precies één H1;
- siteheader/nav buiten de unieke hoofdinhoud;
- één `main`;
- secties met toegankelijke namen;
- artikelen voor zelfstandig betekenisvolle eenheden;
- sitefooter als zelfstandig landmark;
- betekenisvolle linkteksten;
- beeldstatus: inhoudelijk of decoratief;
- routegebonden WebPage-data.

Dit contract bepaalt geen copy of design.

### Fase 3 — route voor route

Voor Werkwijze, Diensten, Projecten, Over ons en Contact:

1. architectuurreview en GO;
2. bewijsinventarisatie;
3. copycandidate inclusief metadata-intentie;
4. Experience Design;
5. semantische implementatie;
6. schema alleen wanneer de zichtbare route het draagt;
7. performance- en accessibilityvalidatie.

### Fase 4 — releasevalidatie

- crawl de productiecandidate zonder JavaScript;
- valideer HTML, canonicals, statuscodes, sitemap en robots;
- valideer JSON-LD;
- controleer social previews;
- voer accessibility- en Core Web Vitals-metingen uit;
- vergelijk AI-samenvattingen met de vijf kernvragen;
- publiceer pas na een afzonderlijke release-GO.

## 11. Beslismatrix

| Voorstel | Waarde | Bewijsstatus | Advies |
|---|---|---|---|
| Prerender publieke routes | Hoog | Technisch probleem aantoonbaar | P0 |
| `lang="nl"` | Hoog | Fout aantoonbaar | P0 |
| Routegebonden metadata | Hoog | Ontbreekt aantoonbaar | P0 |
| Sitemap/robots | Hoog | Ontbreekt aantoonbaar | P0 |
| Organization/WebSite/WebPage | Hoog | Entiteitsdetails deels open | P1 na bevestiging |
| Service-schema | Middel | Diensten nog niet redactioneel goedgekeurd | Per Diensten-sprint |
| LocalBusiness | Onzeker | Lokale bedrijfsgegevens ontbreken | Uitstellen |
| Person | Onzeker | Publieke rol/afzender nog te bevestigen | Uitstellen |
| BreadcrumbList | Laag/onzeker | Echte hiërarchie niet vastgesteld | Niet toevoegen zonder zichtbare functie |
| FAQPage | Laag | Geen echte FAQ | Niet voorstellen |
| Extra SEO-tekst homepage | Negatieve impact | Homepage heeft GO | Niet doen |

## 12. Eindadvies

De Homepage Experience is inhoudelijk geschikt als semantische referentie. Zij beantwoordt de belangrijkste ondernemersvragen menselijker en scherper dan een klassieke websitebouwerpositionering.

De volgende stap is niet meer SEO-copy. De noodzakelijke fundering is:

- serverleesbare publieke HTML;
- eerlijke routegebonden metadata;
- duidelijke indexatiegrenzen;
- structured data die uitsluitend bevestigde werkelijkheid beschrijft;
- praktijkbewijs op de routes die daarvoor verantwoordelijk zijn;
- performance en toegankelijkheid als onderdeel van de architectuur.

Wanneer deze basis later route voor route wordt uitgevoerd, kan SEO de Experience versterken zonder haar over te nemen.
