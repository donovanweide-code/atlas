import studioCraftHorizon from "./assets/images/atlas/studio/atlas-studio-craft-horizon-v01.webp";
import studioProjectReview from "./assets/images/atlas/studio/atlas-studio-project-review-v01.webp";
import studioThreshold from "./assets/images/atlas/studio/atlas-studio-threshold-v01.webp";
import methodListening from "./assets/images/atlas/generated/atlas-method-listening-v01.jpg";
import methodClarity from "./assets/images/atlas/generated/atlas-method-clarity-v01.jpg";
import methodPrototype from "./assets/images/atlas/generated/atlas-method-prototype-v01.jpg";

interface RouteChapter {
  number: string;
  title: string;
  text: string;
}

interface PublicRoute {
  path: string;
  navLabel?: string;
  index: string;
  phase: string;
  title: string;
  intro: string;
  heroAsset: string;
  heroAlt: string;
  heroPosition?: string;
  chapters: RouteChapter[];
  reflection: string;
  nextPath: string;
  nextLabel: string;
  nextTitle: string;
  heroStepLabel?: string;
  evidence?: {
    label: string;
    title: string;
    text: string;
  };
  contact?: {
    email: string;
    phone: string;
    phoneHref: string;
    address: string;
    postalCode: string;
    registration: string;
    vat: string;
  };
  tone: "midnight" | "aurora" | "first-light" | "horizon" | "summit";
}

const publicRoutes: PublicRoute[] = [
  {
    path: "/diensten",
    navLabel: "Diensten",
    index: "03",
    phase: "Van richting naar vorm",
    title: "Een professionele website begint bij jouw bedrijf.",
    intro:
      "We Build And Design helpt ondernemers die klaar zijn voor hun eerste professionele stap online. We maken de route begrijpelijk; ontwerp en techniek volgen daarna.",
    heroAsset: studioCraftHorizon,
    heroAlt:
      "Een rustige ontwerpstudio met maquettes, schetsen en een open horizon.",
    chapters: [
      {
        number: "03.1",
        title: "We beginnen met luisteren.",
        text: "Jij vertelt wat je bedrijf doet, voor wie je werkt en wat een nieuwe klant online moet begrijpen. Technische kennis is niet nodig.",
      },
      {
        number: "03.2",
        title: "Ontwerp maakt jouw bedrijf herkenbaar.",
        text: "We vertalen je verhaal naar een heldere structuur en een visuele stijl die professioneel past bij wat je al hebt opgebouwd.",
      },
      {
        number: "03.3",
        title: "Techniek blijft begrijpelijk.",
        text: "We bouwen en testen de website en leggen keuzes uit in gewone taal. Technologie blijft gereedschap; jouw bedrijf houdt de hoofdrol.",
      },
      {
        number: "03.4",
        title: "Na livegang blijven we bereikbaar.",
        text: "Je kunt met vragen terugkomen. Een volgende stap kiezen we samen wanneer daar werkelijk aanleiding voor is; structurele begeleiding beloven we niet vooraf.",
      },
    ],
    reflection:
      "Een professionele website, gebouwd vanuit jouw bedrijf en uitgelegd in gewone taal.",
    heroStepLabel: "Bekijk hoe je website ontstaat",
    nextPath: "/werkwijze",
    nextLabel: "Bekijk hoe we samenwerken",
    nextTitle: "Een goede oplossing begint met een zorgvuldig ritme.",
    tone: "first-light",
  },
  {
    path: "/werkwijze",
    navLabel: "Werkwijze",
    index: "04",
    phase: "Een zorgvuldig ritme",
    title: "Eerst luisteren. Dan pas bouwen.",
    intro:
      "Je hoeft geen briefing of technisch plan mee te brengen. We beginnen bij jouw verhaal en maken de route samen kleiner.",
    heroAsset: methodListening,
    heroAlt:
      "Een ondernemer laat een tastbaar onderdeel van het bedrijf zien tijdens een aandachtig gesprek.",
    heroPosition: "58% center",
    chapters: [
      {
        number: "04.1",
        title: "We beginnen bij jouw bedrijf.",
        text: "We luisteren naar je werk, klanten en ambitie. Zo hoeft een digitaal vraagstuk niet groter te worden dan het is.",
      },
      {
        number: "04.2",
        title: "We kiezen wat de website moet vertellen.",
        text: "Samen brengen we je verhaal terug tot wat een bezoeker als eerste moet begrijpen en welke informatie daarna helpt.",
      },
      {
        number: "04.3",
        title: "We maken keuzes zichtbaar.",
        text: "Structuur en ontwerp geven het idee een vorm die je kunt beoordelen voordat we de website definitief bouwen.",
      },
      {
        number: "04.4",
        title: "We bouwen in overzichtelijke stappen.",
        text: "Iedere stap heeft een duidelijke bedoeling. We testen en verfijnen zonder je te belasten met onnodig technisch jargon.",
      },
      {
        number: "04.5",
        title: "We blijven bereikbaar.",
        text: "Na livegang kun je met vragen terugkomen. Nieuwe wensen beoordelen we opnieuw op wat je bedrijf dan werkelijk nodig heeft.",
      },
    ],
    reflection:
      "Je hoeft de digitale antwoorden niet vooraf te kennen. Je moet kunnen begrijpen waarom een keuze bij je bedrijf past.",
    nextPath: "/projecten",
    nextLabel: "Zie waar we op letten",
    nextTitle: "Goed werk laat zijn keuzes zien.",
    tone: "aurora",
  },
  {
    path: "/projecten",
    navLabel: "Projecten",
    index: "05",
    phase: "Werk dat verder draagt",
    title: "Een sterk project toont niet alleen wat er is gemaakt.",
    intro:
      "Het maakt voelbaar welke beweging nodig was, welke keuzes richting gaven en waarom het resultaat bij het bedrijf past.",
    heroAsset: studioProjectReview,
    heroAlt:
      "Een ondernemer en ontwerper beoordelen samen een uitgewerkt digitaal ontwerp, maquette en route in een rustige ontwerpstudio.",
    heroPosition: "76% center",
    chapters: [
      {
        number: "05.1",
        title: "De context komt vóór het eindbeeld.",
        text: "Een nieuwe website is nooit het hele verhaal. We kijken eerst naar het bedrijf dat zichtbaar moest worden en de drempel die kleiner moest worden.",
      },
      {
        number: "05.2",
        title: "De belangrijkste keuze krijgt ruimte.",
        text: "Goed werk ontstaat door te kiezen wat het geheel richting geeft. Daarom laten we liever één betekenisvolle beslissing zien dan een lange lijst deliverables.",
      },
      {
        number: "05.3",
        title: "Kwaliteit leeft ook na de oplevering.",
        text: "De waarde zit in wat mensen begrijpen, gebruiken en verder kunnen dragen. Een resultaat is pas sterk wanneer het bedrijf er met vertrouwen mee verder kan.",
      },
    ],
    reflection:
      "We delen projecten wanneer context, keuzes en betekenis samen verteld kunnen worden. Niet als etalage, maar als een eerlijk spoor van het werk.",
    evidence: {
      label: "Ruimte voor bevestigd werk",
      title: "We delen alleen werk waarvan we het verhaal volledig kunnen dragen.",
      text: "Nieuwe voorbeelden krijgen hier ruimte voor de uitgangssituatie, de belangrijkste keuze en wat daarna werkelijk veranderde. Tot die bronnen bevestigd zijn, blijft deze plek bewust open.",
    },
    nextPath: "/over-ons",
    nextLabel: "Lees wie achter WBD staat",
    nextTitle: "Persoonlijk vertrouwen begint bij weten met wie je werkt.",
    tone: "horizon",
  },
  {
    path: "/over-ons",
    navLabel: "Over ons",
    index: "06",
    phase: "Persoonlijk samenwerken",
    title: "Je werkt rechtstreeks met degene die ook bouwt.",
    intro:
      "We Build And Design is een persoonlijke ontwerp- en webpraktijk. We luisteren, denken mee, vertalen je bedrijf visueel en blijven bereikbaar.",
    heroAsset: studioThreshold,
    heroAlt:
      "Een ondernemer kijkt vanuit een rustige werkruimte naar de volgende stap.",
    heroPosition: "74% center",
    chapters: [
      {
        number: "06.1",
        title: "Eerst luisteren, dan adviseren.",
        text: "Jij kent je vak, klanten en dagelijkse werkelijkheid. We helpen om dat terug te brengen tot een website die anderen begrijpen.",
      },
      {
        number: "06.2",
        title: "Je spreekt gewone taal.",
        text: "Je hoeft niet te denken in hosting, systemen of technische termen. Keuzes worden uitgelegd vanuit wat zij voor je bedrijf betekenen.",
      },
      {
        number: "06.3",
        title: "Je bedrijf blijft de hoofdrol houden.",
        text: "We vertalen je verhaal visueel zonder het van je over te nemen. Jij moet jezelf en je onderneming in de website herkennen.",
      },
      {
        number: "06.4",
        title: "We zijn eerlijk over onze grenzen.",
        text: "Niet iedere vraag vraagt om een grotere oplossing. Wanneer specialistische kennis nodig is, maken we dat bespreekbaar in plaats van alles zelf te beloven.",
      },
    ],
    reflection:
      "Persoonlijk betekent: weten met wie je werkt, begrijpen wat er gebeurt en met vragen kunnen terugkomen.",
    nextPath: "/contact",
    nextLabel: "Bekijk wanneer contact past",
    nextTitle: "Een eerste gesprek mag beginnen voordat je weet hoe de website eruit moet zien.",
    tone: "first-light",
  },
  {
    path: "/contact",
    index: "07",
    phase: "De volgende stap",
    title: "Je eerste website mag beginnen met een gewoon gesprek.",
    intro:
      "Je hoeft geen briefing, planning of technische kennis mee te brengen. Vertel wat je bedrijf doet en wat je online zichtbaar wilt maken; je spreekt rechtstreeks met degene die je vraag verder brengt.",
    heroAsset: studioThreshold,
    heroAlt:
      "Een ondernemer staat bij een rustige gesprekstafel aan de drempel van een ontwerpstudio, met de route en horizon voor zich.",
    heroPosition: "74% center",
    chapters: [
      {
        number: "07.1",
        title: "Dit is een goed moment om contact op te nemen.",
        text: "Je weet dat je professioneel online wilt verschijnen, maar stelt de stap uit of weet niet waar je moet beginnen.",
      },
      {
        number: "07.2",
        title: "We beginnen zonder jargon.",
        text: "We luisteren eerst en maken daarna duidelijk of We Build And Design kan helpen en welke kleine vervolgstap logisch is.",
      },
    ],
    reflection:
      "Geen groot bureau of harde pitch. Wel persoonlijk contact over de website die bij jouw bedrijf past.",
    heroStepLabel: "Neem rechtstreeks contact op",
    contact: {
      email: "info@webuildanddesign.nl",
      phone: "06 100 67 964",
      phoneHref: "+31610067964",
      address: "Gerard Terborchstraat 35",
      postalCode: "1318 LE Almere",
      registration: "69326126",
      vat: "NL190255879B01",
    },
    nextPath: "/",
    nextLabel: "Terug naar het begin",
    nextTitle: "Richting begint bij opnieuw helder kijken.",
    tone: "summit",
  },
];

const routeIndex = new Map(publicRoutes.map((item) => [item.path, item]));

const navItems = publicRoutes.filter((item) => item.navLabel);

function navLinks(currentPath: string): string {
  return navItems
    .map(
      ({ path, navLabel }) => `
        <a href="${path}"${currentPath === path ? ' aria-current="page"' : ""}>
          ${navLabel}
        </a>`,
    )
    .join("");
}

export function renderSiteHeader(currentPath: string): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="We Build And Design — home">
        <span class="brand__mark" aria-hidden="true">
          <span>W</span><i></i><span>BD</span>
        </span>
        <span class="brand__name">We Build And Design</span>
      </a>

      <nav class="site-nav" aria-label="Hoofdnavigatie">
        ${navLinks(currentPath)}
      </nav>

      <a class="button button--primary site-header__cta" href="/contact">
        Bespreek je website
      </a>

      <details class="site-menu">
        <summary aria-label="Open navigatie"><span></span><span></span></summary>
        <nav aria-label="Mobiele navigatie">
          ${navLinks(currentPath)}
          <a href="/contact"${currentPath === "/contact" ? ' aria-current="page"' : ""}>
            Contact
          </a>
        </nav>
      </details>
    </header>`;
}

export function renderSiteFooter(): string {
  return `
    <footer class="site-footer">
      <a class="brand" href="/" aria-label="We Build And Design — home">
        <span class="brand__mark" aria-hidden="true">
          <span>W</span><i></i><span>BD</span>
        </span>
        <span class="brand__name">We Build And Design</span>
      </a>
      <p>Professionele websites voor ondernemers die hun eerste stap online begrijpelijk willen zetten.</p>
      <nav aria-label="Voettekstnavigatie">
        <a href="/diensten">Diensten</a>
        <a href="/werkwijze">Werkwijze</a>
        <a href="/projecten">Projecten</a>
        <a href="/over-ons">Over ons</a>
        <a href="mailto:info@webuildanddesign.nl">E-mail</a>
      </nav>
    </footer>`;
}

function renderChapter(chapter: RouteChapter): string {
  return `
    <section class="route-chapter" data-page-reveal>
      <p class="route-chapter__number">${chapter.number}</p>
      <div>
        <h2>${chapter.title}</h2>
        <p>${chapter.text}</p>
      </div>
    </section>`;
}

function renderEvidence(route: PublicRoute): string {
  if (!route.evidence) return "";
  return `
    <section class="route-evidence" id="bevestigd-werk" aria-labelledby="route-evidence-title" data-page-reveal>
      <p>${route.evidence.label}</p>
      <div>
        <h2 id="route-evidence-title">${route.evidence.title}</h2>
        <p>${route.evidence.text}</p>
      </div>
      <span aria-hidden="true">Bewuste ruimte</span>
    </section>`;
}

function renderContact(route: PublicRoute): string {
  if (!route.contact) return "";

  return `
    <section class="route-contact" id="contact-opnemen" aria-labelledby="route-contact-title" data-page-reveal>
      <div class="route-contact__identity">
        <span class="route-contact__logo" aria-hidden="true">WBD.</span>
        <p>Rechtstreeks contact met WBD</p>
      </div>
      <div class="route-contact__conversation">
        <p class="route-contact__eyebrow">Begin gewoon bij waar je nu staat</p>
        <h2 id="route-contact-title">Vertel kort wat jouw bedrijf online nodig heeft.</h2>
        <div class="route-contact__actions">
          <a class="button button--primary" href="mailto:${route.contact.email}">
            E-mail WBD
          </a>
          <a class="button button--secondary" href="tel:${route.contact.phoneHref}">
            Bel ${route.contact.phone}
          </a>
        </div>
        <p class="route-contact__email">
          <a href="mailto:${route.contact.email}">${route.contact.email}</a>
        </p>
      </div>
      <address class="route-contact__details">
        <strong>We Build And Design</strong>
        <span>${route.contact.address}</span>
        <span>${route.contact.postalCode}</span>
        <span>KvK ${route.contact.registration}</span>
        <span>BTW ${route.contact.vat}</span>
      </address>
    </section>`;
}

function renderRoute(route: PublicRoute): string {
  document.title = `${route.navLabel ?? "Kennismaken"} — We Build And Design`;

  return `
    <main class="page route-page route-page--${route.tone}">
      ${renderSiteHeader(route.path)}

      <article class="route-story">
        <header class="route-hero"${route.path === "/contact" ? ' id="contact-verkenning"' : ""}>
          <div class="route-hero__world" aria-hidden="true"></div>
          <img
            class="route-hero__image"
            src="${route.heroAsset}"
            alt="${route.heroAlt}"
            style="--route-image-position: ${route.heroPosition ?? "center"}"
            fetchpriority="high"
            decoding="async"
          >
          <div class="route-hero__veil" aria-hidden="true"></div>
          <div class="route-hero__content" data-page-reveal>
            <p class="route-kicker"><span>${route.index}</span>${route.phase}</p>
            <h1>${route.title}</h1>
            <p>${route.intro}</p>
            <a class="route-hero__step" href="${route.contact ? "#contact-opnemen" : "#route-vervolg"}">
              ${route.heroStepLabel ?? "Loop verder"} <i aria-hidden="true"></i>
            </a>
          </div>
        </header>

        <div class="route-continuum" id="route-vervolg">
          <div class="route-line" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="route-chapters">
            ${route.chapters.map(renderChapter).join("")}
          </div>

          ${renderEvidence(route)}
          ${renderContact(route)}

          <aside class="route-reflection" data-page-reveal>
            <span aria-hidden="true"></span>
            <p>${route.reflection}</p>
          </aside>

          <aside class="route-next" data-page-reveal>
            <p>${route.nextLabel}</p>
            <h2>${route.nextTitle}</h2>
            <a href="${route.nextPath}" aria-label="${route.nextLabel}">
              <span>Volgende route</span><i aria-hidden="true"></i>
            </a>
          </aside>
        </div>
      </article>

      ${renderSiteFooter()}
    </main>`;
}

function renderMethodPage(route: PublicRoute): string {
  const [understand, clarify, reveal, build, remain] = route.chapters;
  document.title = "Werkwijze — We Build And Design";

  return `
    <main class="page route-page route-page--aurora method-page">
      ${renderSiteHeader(route.path)}

      <article class="method-story">
        <header class="method-hero">
          <img
            class="method-hero__image"
            src="${methodListening}"
            alt="Een ondernemer laat een tastbaar onderdeel van het bedrijf zien tijdens een aandachtig gesprek."
            fetchpriority="high"
            decoding="async"
          >
          <div class="method-hero__veil" aria-hidden="true"></div>
          <div class="method-hero__content" data-page-reveal>
            <p class="route-kicker"><span>${route.index}</span>${route.phase}</p>
            <h1>${route.title}</h1>
            <p>${route.intro}</p>
            <a class="route-hero__step" href="#eerste-vraag">
              Ervaar hoe we beginnen <i aria-hidden="true"></i>
            </a>
          </div>
          <aside class="method-hero__question" aria-label="De eerste vraag" data-page-reveal>
            <span>Niet de oplossing</span>
            <p>Wat moet een nieuwe klant als eerste over jouw bedrijf begrijpen?</p>
          </aside>
        </header>

        <div class="method-continuum">
          <div class="method-route" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i>
          </div>

          <section class="method-listen" id="eerste-vraag" aria-labelledby="method-listen-title">
            <div class="method-listen__intro" data-page-reveal>
              <p class="method-index">${understand.number} / Begrijpen</p>
              <h2 id="method-listen-title">${understand.title}</h2>
              <p>${understand.text}</p>
            </div>
            <div class="method-listen__questions" aria-label="Vragen waarmee het gesprek begint">
              <p data-page-reveal><span>01</span>Wat doe je iedere dag dat voor jou vanzelfsprekend is?</p>
              <p data-page-reveal><span>02</span>Waar komen klanten juist voor bij jou terug?</p>
              <p data-page-reveal><span>03</span>Wat moet iemand voelen voordat die contact opneemt?</p>
            </div>
            <p class="method-listen__answer" data-page-reveal>
              Nog geen briefing.<br>
              Eerst jouw werkelijkheid.
            </p>
          </section>

          <section class="method-clarity" aria-labelledby="method-clarity-title">
            <div class="method-clarity__image" data-page-reveal>
              <img
                src="${methodClarity}"
                alt="Losse observaties, foto's en materiaal worden door twee mensen teruggebracht tot een heldere reeks."
                loading="lazy"
                decoding="async"
              >
              <span aria-hidden="true">Ruis</span>
              <span aria-hidden="true">Kern</span>
              <span aria-hidden="true">Richting</span>
            </div>
            <div class="method-clarity__copy" data-page-reveal>
              <p class="method-index">${clarify.number} / Helder krijgen</p>
              <h2 id="method-clarity-title">${clarify.title}</h2>
              <p>${clarify.text}</p>
              <blockquote>
                Niet alles hoeft op de website.<br>
                Alleen wat iemand helpt om verder te kijken.
              </blockquote>
            </div>
          </section>

          <section class="method-choice" aria-labelledby="method-choice-title">
            <header data-page-reveal>
              <p class="method-index">${reveal.number} / Samen kiezen</p>
              <h2 id="method-choice-title">${reveal.title}</h2>
              <p>${reveal.text}</p>
            </header>
            <div class="method-choice__field" data-page-reveal>
              <article>
                <span>Mogelijkheid 01</span>
                <i></i><i></i><i></i>
              </article>
              <article class="is-chosen">
                <span>Dit draagt het verhaal</span>
                <strong>De kern</strong>
                <i></i><i></i>
              </article>
              <article>
                <span>Mogelijkheid 03</span>
                <i></i><i></i><i></i>
              </article>
              <p>Een keuze wordt pas definitief wanneer jij haar kunt zien, vergelijken en begrijpen.</p>
            </div>
          </section>

          <section class="method-build" aria-labelledby="method-build-title">
            <img
              src="${methodPrototype}"
              alt="Een gekozen ontwerp wordt zorgvuldig vertaald naar een tastbaar prototype en digitaal gecontroleerd."
              loading="lazy"
              decoding="async"
            >
            <div class="method-build__veil" aria-hidden="true"></div>
            <div class="method-build__copy" data-page-reveal>
              <p class="method-index">${build.number} / Zorgvuldig bouwen</p>
              <h2 id="method-build-title">${build.title}</h2>
              <p>${build.text}</p>
              <ol>
                <li><span>01</span>Eerst zichtbaar</li>
                <li><span>02</span>Dan samen beoordelen</li>
                <li><span>03</span>Daarna zorgvuldig bouwen</li>
              </ol>
            </div>
          </section>

          <section class="method-remain" aria-labelledby="method-remain-title">
            <div class="method-remain__marker" aria-hidden="true">
              <span></span>
            </div>
            <div data-page-reveal>
              <p class="method-index">${remain.number} / Verder kunnen</p>
              <h2 id="method-remain-title">${remain.title}</h2>
              <p>${remain.text}</p>
            </div>
            <blockquote data-page-reveal>${route.reflection}</blockquote>
          </section>

          <aside class="route-next method-next" data-page-reveal>
            <p>${route.nextLabel}</p>
            <h2>${route.nextTitle}</h2>
            <a href="${route.nextPath}" aria-label="${route.nextLabel}">
              <span>Volgende route</span><i aria-hidden="true"></i>
            </a>
          </aside>
        </div>
      </article>

      ${renderSiteFooter()}
    </main>`;
}

function renderNotFound(): string {
  document.title = "Route niet gevonden — We Build And Design";

  return `
    <main class="page route-page route-page--summit route-page--missing">
      ${renderSiteHeader("")}
      <div class="route-missing" data-page-reveal>
        <p class="route-kicker"><span>—</span>Route niet gevonden</p>
        <h1>Deze route loopt hier niet verder.</h1>
        <p>Ga terug naar het begin en kies opnieuw waar je wilt kijken.</p>
        <a class="button button--primary" href="/">Terug naar de homepage</a>
      </div>
      ${renderSiteFooter()}
    </main>`;
}

export function renderPublicPage(path: string): string {
  const route = routeIndex.get(path);
  if (route?.path === "/werkwijze") return renderMethodPage(route);
  return route ? renderRoute(route) : renderNotFound();
}

export function enablePageReveals(selector = "[data-page-reveal]"): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.12 },
  );

  elements.forEach((element) => observer.observe(element));
}
