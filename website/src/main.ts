import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";
import { renderSceneWorld } from "./atlas-scenes";
import { understandingMethod } from "./atlas-understanding";
import {
  enablePageReveals,
  renderPublicPage,
} from "./public-pages";

const app = document.querySelector<HTMLDivElement>("#app")!;
const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/atlas") {
  void import("./atlas-workspace").then(({ renderAtlasWorkspace }) =>
    renderAtlasWorkspace(app),
  );
} else if (route === "/atlas-lab") {
  void import("./atlas-lab").then(({ renderAtlasLab }) => renderAtlasLab(app));
} else if (route === "/") {
  app.innerHTML = `
    <main class="page">
      <header class="site-header">
        <a class="brand" href="/" aria-label="We Build and Design — home">
          <span class="brand__mark">WBD.</span>
          <span class="brand__name">We Build and Design</span>
        </a>

        <nav class="site-nav" aria-label="Hoofdnavigatie">
          <a href="/diensten">Diensten</a>
          <a href="/werkwijze">Werkwijze</a>
          <a href="/projecten">Projecten</a>
          <a href="/over-ons">Over ons</a>
        </nav>

        <a class="button button--primary site-header__cta" href="/contact">
          Plan een kennismaking
        </a>

        <details class="site-menu">
          <summary aria-label="Open navigatie"><span></span><span></span></summary>
          <nav aria-label="Mobiele navigatie">
            <a href="/diensten">Diensten</a>
            <a href="/werkwijze">Werkwijze</a>
            <a href="/projecten">Projecten</a>
            <a href="/over-ons">Over ons</a>
            <a href="/contact">Kennismaken</a>
          </nav>
        </details>
      </header>

      <section class="hero atlas-scene" data-scene="scene-001" data-atlas-observation="public.home.entry" id="eerste-publieke-minuut" aria-labelledby="hero-title">
        ${renderSceneWorld("scene-001")}
        <div class="hero__content" data-home-reveal>
          <p class="route-label"><span>01</span> Overzicht</p>
          <p class="hero__eyebrow">Websites. Strategie. Design. Technologie.</p>

          <h1 class="hero__title" id="hero-title">Je bedrijf is klaar voor wat volgt.</h1>

          <p class="hero__text">
            We ontwerpen en bouwen websites voor ondernemers die al iets hebben opgebouwd.<br>
            Eerst maken we helder wat jouw bedrijf nu werkelijk nodig heeft.
          </p>

          <a class="hero__step" href="#begrijpen">
            <span>Zie hoe we eerst begrijpen</span>
            <i aria-hidden="true"></i>
          </a>
        </div>

      </section>

      <section class="understand atlas-scene" data-scene="scene-002" data-atlas-observation="public.home.understanding" id="begrijpen" aria-labelledby="understand-title">
        ${renderSceneWorld("scene-002")}
        <div class="understand__inner">
          <header class="understand__intro" data-home-reveal>
            <p class="understand__label"><span>ROUTE 02</span> WERKWIJZE</p>
            <h2 class="understand__title" id="understand-title">
              We luisteren voorbij het eerste antwoord.
            </h2>
          </header>

          <div class="understand__experience">
            <div class="understand__thoughts" data-home-reveal>
              <p>“De website moet vernieuwd.”</p>
              <p>“We moeten meer automatiseren.”</p>
              <p>“Ons verhaal moet scherper.”</p>
            </div>

            <div class="understand__insight" data-home-reveal>
              <p class="understand__realisation">
                <span>${understandingMethod.publicTruth}</span>
                <strong>${understandingMethod.publicQuestion}</strong>
              </p>

              <div class="understand__belief">
                <p>
                  Daarom blijft het antwoord nog even open.<br>
                  <strong>Tot waarneming en bewijs een patroon laten zien.</strong>
                </p>
                <p>
                  Pas dan kiezen we samen<br>
                  <strong>één betekenisvolle volgende stap.</strong>
                </p>
              </div>
              <a class="understand__next" href="#digitaal-fundament">Verder wanneer de vraag helder is <i aria-hidden="true">→</i></a>
            </div>
          </div>

          <div class="orientation-waypoint" aria-hidden="true">
            <span class="orientation-waypoint__ring"></span>
            <span class="orientation-waypoint__axis"></span>
            <span class="orientation-waypoint__label">02 / RICHTING</span>
          </div>

        </div>
      </section>

      <div class="route-transition atlas-scene scene-crossing" data-scene="scene-003" aria-hidden="true">
        ${renderSceneWorld("scene-003")}
        <span class="scene-waypoint scene-waypoint--crossing"></span>
      </div>

      <section class="why atlas-scene" data-scene="scene-004" data-atlas-observation="public.home.digital-foundation" id="digitaal-fundament" aria-labelledby="why-title">
        ${renderSceneWorld("scene-004")}

        <div class="why__intro" data-home-reveal>
          <p class="section-label">03 / Digitaal fundament</p>

          <h2 class="why__title" id="why-title">
            Een website is vaak de eerste zichtbare stap. Het fundament erachter bepaalt hoe zij verder kan groeien.
          </h2>

          <p class="why__lead">
            Daarom brengen we strategie, ontwerp en technologie samen voordat we bepalen wat er gebouwd moet worden.
          </p>
        </div>

        <div class="why__grid" data-home-reveal>
          <article class="why-principle">
            <span class="why-principle__number">01</span>
            <h3>Eerst begrijpen</h3>
            <p>
              We onderzoeken waar je bedrijf staat, wat al werkt en waar groei begint te knellen.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">02</span>
            <h3>Samenhang ontwerpen</h3>
            <p>
              Strategie, merk, website en processen krijgen één logische richting.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">03</span>
            <h3>Zorgvuldig doorbouwen</h3>
            <p>
              We bouwen wat nu nodig is en houden ruimte voor de volgende fase.
            </p>
          </article>
        </div>
      </section>

      <section class="vision atlas-scene" data-scene="scene-005" aria-labelledby="vision-title">
        ${renderSceneWorld("scene-005")}
        <div class="vision__content">

          <header class="vision__intro" data-home-reveal>
            <p class="vision__eyebrow">04 / Van inzicht naar uitvoering</p>

            <h2 class="vision__title" id="vision-title">
              Richting wordt waardevol wanneer je haar zorgvuldig kunt bouwen.
            </h2>

            <p class="vision__text">
              Daarom maken we keuzes zichtbaar voordat ze code worden. In strategiekaarten,
              UX-structuren, ontwerpen en een plan dat past bij je organisatie.
            </p>
          </header>

      <div class="vision__steps" data-home-reveal>

        <article class="vision-step">
          <span class="vision-step__number">01</span>

          <h3>Analyseren</h3>

          <p>
            We brengen doelen, klanten, processen en het bestaande digitale fundament samen.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">02</span>

          <h3>Richting bepalen</h3>

          <p>
            We kiezen welke ingreep nu het meeste waarde toevoegt en wat bewust later kan.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">03</span>

          <h3>Realiseren</h3>

          <p>
            We ontwerpen, ontwikkelen, testen en verbeteren in een beheersbaar tempo.
          </p>
        </article>

      </div>
      <div class="vision__quote" data-home-reveal>

        <h2>
          Overzicht maakt keuzes kleiner.<br>
          Goede keuzes maken groei beheersbaar.
        </h2>

        <p>
          Wat we vandaag bouwen moet direct bruikbaar zijn en morgen verder kunnen groeien.
        </p>

      </div>
        </div>
      </section>
      <section class="challenges atlas-scene" data-scene="scene-006" aria-labelledby="challenges-title">
        ${renderSceneWorld("scene-006")}
        <div class="scene-waypoint-moment" data-scene="scene-007" aria-hidden="true">
          <span class="scene-waypoint scene-waypoint--insight"></span>
        </div>

        <div class="container">

          <p class="section-eyebrow" data-home-reveal>
            05 / Waar groei begint te knellen
          </p>

          <h2 class="section-title" id="challenges-title" data-home-reveal>
            Je bedrijf beweegt verder. Je digitale fundament moet mee kunnen bewegen.
          </h2>

          <p class="section-intro" data-home-reveal>
            Vaak is niet méér nodig, maar meer samenhang tussen wat je al hebt.
          </p>

          <div class="challenge-grid" data-home-reveal>

            <article class="challenge-card">
              <span>01</span>
              <h3>Zichtbaarheid blijft achter</h3>
             <p>
      Je expertise is sterk, maar dat wordt online nog niet overtuigend zichtbaar.
      </p>
      <p class="challenge-outcome">Merk, verhaal en klantreis opnieuw uitlijnen.</p>
            </article>

            <article class="challenge-card">
              <span>02</span>
              <h3>Systemen werken los</h3>
             <p>
      Marketing, website en processen werken los van elkaar.
      </p>
      <p class="challenge-outcome">Eén richting voor kanalen, content en techniek.</p>
            </article>

            <article class="challenge-card">
              <span>03</span>
              <h3>Handwerk remt</h3>
              <p>
      Handmatig werk kost iedere week uren die je liever
      aan je bedrijf besteedt.
      </p>
      <p class="challenge-outcome">Processen vereenvoudigen waar technologie echt helpt.</p>
            </article>

            <article class="challenge-card">
              <span>04</span>
              <h3>Het fundament groeit niet mee</h3>
              <p>
      Je onderneming groeit sneller dan je digitale fundament.
      </p>
      <p class="challenge-outcome">Doorbouwen zonder opnieuw vanaf nul te beginnen.</p>
            </article>

          </div>

        </div>

      </section>
      <section class="connection atlas-scene" data-scene="scene-008" aria-labelledby="connection-title">
        ${renderSceneWorld("scene-008")}
        ${renderSceneWorld("scene-009")}
        ${renderSceneWorld("scene-010")}

        <div class="container">

          <p class="section-eyebrow" data-home-reveal>
            06 / De volgende horizon
          </p>

          <h2 class="section-title" id="connection-title" data-home-reveal>
            Je hoeft de oplossing niet vooraf te kennen.
          </h2>

          <p class="section-intro" data-home-reveal>
            Wel wat een goede volgende stap voor je bedrijf moet opleveren.
            Wij brengen de keuzes terug tot een richting die past bij wat je al hebt opgebouwd.
          </p>

          <div class="connection-message" data-home-reveal>

            <p>
              Eerst ontstaat overzicht.
            </p>

            <p>
              Vanuit overzicht ontstaat vertrouwen om te bewegen.
            </p>

          </div>

          <div class="compass-moment" data-scene="scene-009" aria-hidden="true">
            <span class="compass-moment__north">N</span>
            <i class="compass-moment__needle"></i>
            <i class="compass-moment__relief"></i>
          </div>

          <div class="next-horizon" data-home-reveal>
            <p>Je volgende stap hoeft niet groter te zijn. Wel scherper.</p>
            <h3>Begin bij wat jouw website en bedrijf nu nodig hebben.</h3>
            <a class="button button--primary" href="/contact">
              Begin de verkenning
            </a>
          </div>

        </div>

        <footer class="site-footer">
          <a class="brand" href="/" aria-label="We Build and Design — home">
            <span class="brand__mark">WBD.</span>
            <span class="brand__name">We Build and Design</span>
          </a>
          <p>Websites, strategie, design en technologie voor bedrijven die zorgvuldig verder willen.</p>
        </footer>

      </section>
    </main>
  `;

  enablePageReveals("[data-home-reveal]");
} else {
  app.innerHTML = renderPublicPage(route);
  enablePageReveals();
}

if (route !== "/atlas" && route !== "/atlas-lab") {
  try {
    if (localStorage.getItem("atlas.workspace.observing-context.v1")) {
      void import("./atlas-observe")
        .then(({ mountObservationCapture }) => mountObservationCapture())
        .catch(() => undefined);
    }
  } catch {
    // Lokale opslag mag de publieke Experience nooit onderbreken.
  }
}
