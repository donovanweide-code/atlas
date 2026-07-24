import studioWorktable from "./assets/images/atlas/studio/atlas-studio-worktable-v01.webp";
import studioCraftHorizon from "./assets/images/atlas/studio/atlas-studio-craft-horizon-v01.webp";
import studioProjectReview from "./assets/images/atlas/studio/atlas-studio-project-review-v01.webp";
import studioThreshold from "./assets/images/atlas/studio/atlas-studio-threshold-v01.webp";

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
      "We Build And Design helpt ondernemers die klaar zijn voor hun eerste professionele stap online. Donovan maakt de route begrijpelijk; ontwerp en techniek volgen daarna.",
    heroAsset: studioCraftHorizon,
    heroAlt:
      "Een rustige ontwerpstudio met maquettes, schetsen en een open horizon.",
    chapters: [
      {
        number: "03.1",
        title: "Donovan begint met luisteren.",
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
        title: "Na livegang blijft Donovan bereikbaar.",
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
    heroAsset: studioWorktable,
    heroAlt:
      "Twee mensen onderzoeken samen schetsen en modellen aan een rustige werktafel.",
    heroPosition: "58% center",
    chapters: [
      {
        number: "04.1",
        title: "We beginnen bij jouw bedrijf.",
        text: "Donovan luistert naar je werk, klanten en ambitie. Zo hoeft een digitaal vraagstuk niet groter te worden dan het is.",
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
    title: "Je werkt rechtstreeks met Donovan.",
    intro:
      "We Build And Design is de persoonlijke ontwerp- en webpraktijk van Donovan. Hij luistert, denkt mee, vertaalt je bedrijf visueel en blijft bereikbaar.",
    heroAsset: studioThreshold,
    heroAlt:
      "Een ondernemer kijkt vanuit een rustige werkruimte naar de volgende stap.",
    heroPosition: "74% center",
    chapters: [
      {
        number: "06.1",
        title: "Donovan luistert vóór hij adviseert.",
        text: "Jij kent je vak, klanten en dagelijkse werkelijkheid. Donovan helpt om dat terug te brengen tot een website die anderen begrijpen.",
      },
      {
        number: "06.2",
        title: "Je spreekt gewone taal.",
        text: "Je hoeft niet te denken in hosting, systemen of technische termen. Keuzes worden uitgelegd vanuit wat zij voor je bedrijf betekenen.",
      },
      {
        number: "06.3",
        title: "Je bedrijf blijft de hoofdrol houden.",
        text: "Donovan vertaalt je verhaal visueel zonder het van je over te nemen. Jij moet jezelf en je onderneming in de website herkennen.",
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
      "Je hoeft geen briefing, planning of technische kennis mee te brengen. Vertel wat je bedrijf doet en wat je online zichtbaar wilt maken; je spreekt rechtstreeks met Donovan.",
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
        text: "Donovan luistert eerst en maakt daarna duidelijk of We Build And Design je kan helpen en welke kleine vervolgstap logisch is.",
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
        <span class="brand__mark">WBD.</span>
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
        <span class="brand__mark">WBD.</span>
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
        <p>Rechtstreeks contact met Donovan</p>
      </div>
      <div class="route-contact__conversation">
        <p class="route-contact__eyebrow">Begin gewoon bij waar je nu staat</p>
        <h2 id="route-contact-title">Vertel kort wat jouw bedrijf online nodig heeft.</h2>
        <div class="route-contact__actions">
          <a class="button button--primary" href="mailto:${route.contact.email}">
            E-mail Donovan
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
