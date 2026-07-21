import studioWorktable from "./assets/images/atlas/studio/atlas-studio-worktable-v01.webp";
import studioCraftHorizon from "./assets/images/atlas/studio/atlas-studio-craft-horizon-v01.webp";
import studioProjectReview from "./assets/images/atlas/studio/atlas-studio-project-review-v01.webp";
import studioCollaboration from "./assets/images/atlas/studio/atlas-studio-collaboration-v01.webp";
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
  heroObservationBoundary?: "public.contact.exploration";
  evidence?: {
    label: string;
    title: string;
    text: string;
  };
  tone: "midnight" | "aurora" | "first-light" | "horizon" | "summit";
}

const publicRoutes: PublicRoute[] = [
  {
    path: "/diensten",
    navLabel: "Diensten",
    index: "03",
    phase: "Van richting naar vorm",
    title: "Een sterke website begint niet bij een pagina.",
    intro:
      "We ontwerpen en bouwen websites vanuit één vraag: wat helpt jouw bedrijf nu werkelijk verder? Strategie, ontwerp en technologie volgen dezelfde richting.",
    heroAsset: studioCraftHorizon,
    heroAlt:
      "Een rustige ontwerpstudio met maquettes, schetsen en een open horizon.",
    chapters: [
      {
        number: "03.1",
        title: "Strategie brengt het geheel terug tot keuzes.",
        text: "We onderzoeken doelen, klanten, processen en wat je al hebt opgebouwd. Zo wordt duidelijk wat nu aandacht verdient en wat bewust later kan.",
      },
      {
        number: "03.2",
        title: "Ontwerp maakt de richting bespreekbaar.",
        text: "We vertalen het inzicht naar verhaal, structuur en ervaring. Niet om indruk te maken, maar om samen te kunnen zien of de gekozen richting klopt.",
      },
      {
        number: "03.3",
        title: "Technologie maakt haar bruikbaar.",
        text: "We bouwen een helder digitaal fundament dat vandaag werkt en ruimte houdt voor morgen. Technologie blijft gereedschap; jouw bedrijf houdt de hoofdrol.",
      },
      {
        number: "03.4",
        title: "We blijven kijken naar wat volgt.",
        text: "Na de eerste oplevering stopt de route niet. We blijven betrokken, leren van wat er gebeurt en bouwen alleen verder waar dat betekenis toevoegt.",
      },
    ],
    reflection:
      "Geen losse disciplines. Eén richting die zichtbaar, bruikbaar en verder uit te bouwen wordt.",
    heroStepLabel: "Bekijk wat een website nodig heeft",
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
    title: "We bouwen pas wanneer de richting klopt.",
    intro:
      "Niet ieder vraagstuk vraagt om hetzelfde antwoord. Wel om dezelfde aandacht: begrijpen, overzicht maken en samen een heldere stap kiezen.",
    heroAsset: studioWorktable,
    heroAlt:
      "Twee makers onderzoeken samen schetsen en modellen in een open ontwerpstudio.",
    heroPosition: "58% center",
    chapters: [
      {
        number: "04.1",
        title: "We beginnen bij jouw werkelijkheid.",
        text: "We luisteren, kijken en vragen door. Naar de ambitie én naar de spanning die ontstaat wanneer bedrijf, merk en digitaal fundament niet meer gelijk oplopen.",
      },
      {
        number: "04.2",
        title: "We maken samenhang zichtbaar.",
        text: "Losse signalen worden een overzicht. Daardoor ontstaat niet alleen een plan, maar ook rust: je ziet welke keuze de andere keuzes eenvoudiger maakt.",
      },
      {
        number: "04.3",
        title: "We verbeelden vóór we vastleggen.",
        text: "Routes, wireframes, ontwerpprincipes en prototypes geven het idee een vorm die je kunt beoordelen voordat techniek keuzes definitief maakt.",
      },
      {
        number: "04.4",
        title: "We bouwen in een beheersbaar tempo.",
        text: "Iedere stap heeft een duidelijke bedoeling. We testen, verfijnen en bewaken de samenhang, zodat voortgang niet ten koste gaat van kwaliteit.",
      },
      {
        number: "04.5",
        title: "We dragen de context met ons mee.",
        text: "Ook na livegang blijven keuzes begrijpelijk. Dat maakt verbeteren menselijker, overdraagbaar en minder afhankelijk van steeds opnieuw beginnen.",
      },
    ],
    reflection:
      "Je hoeft niet alle antwoorden te hebben. Je moet kunnen vertrouwen op de manier waarop ze ontstaan.",
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
        text: "Een nieuwe website, positionering of digitaal product is nooit het hele verhaal. We kijken eerst naar de situatie die moest veranderen.",
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
    nextLabel: "Ontmoet de makers",
    nextTitle: "Achter iedere route staan mensen die zorgvuldig blijven kijken.",
    tone: "horizon",
  },
  {
    path: "/over-ons",
    navLabel: "Over ons",
    index: "06",
    phase: "De makers naast de route",
    title: "We staan naast ondernemers die al iets hebben opgebouwd.",
    intro:
      "We Build And Design verbindt strategie, ontwerp en technologie in één studio. Niet om jouw bedrijf opnieuw uit te vinden, maar om helder te maken wat het al in zich heeft.",
    heroAsset: studioCollaboration,
    heroAlt:
      "Een ondernemer en twee makers werken samen aan strategie, ontwerp en digitale structuur in een open ontwerpstudio.",
    heroPosition: "68% center",
    chapters: [
      {
        number: "06.1",
        title: "We luisteren vóór we adviseren.",
        text: "Jij kent de geschiedenis, de klanten en de dagelijkse werkelijkheid. Wij brengen afstand, ontwerpkwaliteit en technische scherpte mee.",
      },
      {
        number: "06.2",
        title: "We werken aan één tafel.",
        text: "Strategie verdwijnt niet in een rapport, ontwerp niet in een presentatie en technologie niet achter jargon. De disciplines blijven met elkaar in gesprek.",
      },
      {
        number: "06.3",
        title: "We maken onszelf niet de hoofdrol.",
        text: "Het doel is dat jij overzicht krijgt en goede keuzes kunt dragen. Ons vakmanschap is zichtbaar in de rust, samenhang en zorg waarmee die richting vorm krijgt.",
      },
      {
        number: "06.4",
        title: "We blijven betrokken bij de horizon.",
        text: "Bedrijven blijven bewegen. Daarom ontwerpen we geen afgesloten eindpunt, maar een fundament waarop de volgende stap logisch kan voortbouwen.",
      },
    ],
    reflection:
      "Een goede samenwerking voelt niet alsof iemand het van je overneemt. Ze geeft je vertrouwen om zelf verder te kijken.",
    nextPath: "/contact",
    nextLabel: "Begin met een verkenning",
    nextTitle: "Vertel waar je staat. De oplossing hoeft nog niet vast te staan.",
    tone: "first-light",
  },
  {
    path: "/contact",
    index: "07",
    phase: "De volgende stap",
    title: "Je hoeft de oplossing nog niet te kennen.",
    intro:
      "Een eerste gesprek gaat niet over een verkooppraatje. Het gaat over waar je bedrijf staat, wat er schuurt en welke beweging je voor je ziet.",
    heroAsset: studioThreshold,
    heroAlt:
      "Een ondernemer staat bij een rustige gesprekstafel aan de drempel van een ontwerpstudio, met de route en horizon voor zich.",
    heroPosition: "74% center",
    chapters: [
      {
        number: "07.1",
        title: "Breng mee wat er nu speelt.",
        text: "Een vraag, een ambitie, een onrustig gevoel of een concrete volgende stap is genoeg. We helpen eerst om het gesprek helder te maken.",
      },
      {
        number: "07.2",
        title: "We onderzoeken of er een route is.",
        text: "Na de verkenning weet je welke vraag werkelijk voorligt en of wij de juiste studio zijn om die samen met jou verder te brengen.",
      },
    ],
    reflection:
      "Geen harde pitch. Wel een rustig gesprek over wat je hebt gebouwd en wat je nu verder wilt brengen.",
    heroStepLabel: "Bekijk hoe de verkenning begint",
    heroObservationBoundary: "public.contact.exploration",
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
        Plan een kennismaking
      </a>

      <details class="site-menu">
        <summary aria-label="Open navigatie"><span></span><span></span></summary>
        <nav aria-label="Mobiele navigatie">
          ${navLinks(currentPath)}
          <a href="/contact"${currentPath === "/contact" ? ' aria-current="page"' : ""}>
            Kennismaken
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
      <p>Websites, strategie, design en technologie voor bedrijven die zorgvuldig verder willen.</p>
      <nav aria-label="Voettekstnavigatie">
        <a href="/diensten">Diensten</a>
        <a href="/werkwijze">Werkwijze</a>
        <a href="/projecten">Projecten</a>
        <a href="/over-ons">Over ons</a>
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
    <section class="route-evidence" id="bevestigd-werk" data-atlas-observation="public.projects.confirmed-work" aria-labelledby="route-evidence-title" data-page-reveal>
      <p>${route.evidence.label}</p>
      <div>
        <h2 id="route-evidence-title">${route.evidence.title}</h2>
        <p>${route.evidence.text}</p>
      </div>
      <span aria-hidden="true">Bewuste ruimte</span>
    </section>`;
}

function renderRoute(route: PublicRoute): string {
  document.title = `${route.navLabel ?? "Kennismaken"} — We Build And Design`;

  return `
    <main class="page route-page route-page--${route.tone}">
      ${renderSiteHeader(route.path)}

      <article class="route-story">
        <header class="route-hero"${route.heroObservationBoundary ? ` id="contact-verkenning" data-atlas-observation="${route.heroObservationBoundary}"` : ""}>
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
            <a class="route-hero__step" href="#route-vervolg">
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
