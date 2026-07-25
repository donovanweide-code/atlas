import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";
import "./styles/werkwijze.css";
import { renderSceneWorld } from "./atlas-scenes";
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
          <img class="brand__logo" src="/wbd-mark-dark.svg" alt="" width="82" height="48">
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

      <section class="hero atlas-scene" data-scene="scene-001" aria-labelledby="hero-title">
        ${renderSceneWorld("scene-001")}
        <div class="hero__content" data-home-reveal>
          <p class="hero__eyebrow">Voor ondernemers die al iets hebben opgebouwd.</p>

          <h1 class="hero__title" id="hero-title">
            <span class="hero__title-recognition">Je bedrijf beweegt verder.</span>
            <span class="hero__title-question">Wat digitaal nodig is, is niet altijd meteen zichtbaar.</span>
          </h1>

          <p class="hero__text">
            Je website, verhaal, processen en techniek groeien niet altijd in dezelfde richting mee.<br>
            Voordat we iets kiezen, begrijpen we eerst wat er werkelijk speelt.
          </p>

          <a class="hero__step" href="#begrijpen">
            <span>Begin bij wat er al staat</span>
            <i aria-hidden="true"></i>
          </a>
        </div>

      </section>

      <section class="understand atlas-scene" data-scene="scene-002" id="begrijpen" aria-labelledby="understand-title">
        ${renderSceneWorld("scene-002")}
        <div class="understand__inner">
          <header class="understand__intro" data-home-reveal>
            <h2 class="understand__title" id="understand-title">
              Niet alles hoeft opnieuw.
            </h2>
          </header>

          <div class="understand__experience">
            <div class="understand__thoughts" data-home-reveal>
              <p>“Onze website moet vernieuwd.”</p>
              <p>“Dit proces kost te veel tijd.”</p>
              <p>“We willen verder, maar waar beginnen we?”</p>
            </div>

            <div class="understand__insight" data-home-reveal>
              <p class="understand__realisation">
                <span>Dit zijn goede vertrekpunten.</span>
                <strong>Maar de eerste vraag is niet altijd de werkelijke vraag.</strong>
              </p>

              <div class="understand__belief">
                <p>
                  Je bedrijf heeft al een geschiedenis, klanten en keuzes.<br>
                  <strong>Daarom onderzoeken we eerst wat behouden moet blijven.</strong>
                </p>
                <p>
                  Daarna maken we zichtbaar wat niet meer vanzelf meebeweegt<br>
                  <strong>en wat werkelijk aandacht vraagt.</strong>
                </p>
              </div>
              <a class="understand__next" href="#digitaal-fundament">Verder zonder de oplossing al vast te leggen <i aria-hidden="true">→</i></a>
            </div>
          </div>

        </div>
      </section>

      <section class="why atlas-scene" data-scene="scene-004" id="digitaal-fundament" aria-labelledby="why-title">
        ${renderSceneWorld("scene-004")}

        <div class="why__intro" data-home-reveal>
          <h2 class="why__title" id="why-title">
            Eerst maken we helder wat werkelijk aandacht vraagt.
          </h2>

          <p class="why__lead">
            We brengen je bedrijf, klanten, ambitie, processen en digitale basis samen in één begrijpelijk beeld.
          </p>
        </div>

        <div class="why__grid" data-home-reveal>
          <article class="why-principle">
            <span class="why-principle__number">01</span>
            <h3>Wat we weten</h3>
            <p>
              We beginnen bij bevestigde context en bij wat vandaag al waarde heeft.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">02</span>
            <h3>Wat nog openstaat</h3>
            <p>
              Aannames en onzekerheden blijven zichtbaar, zodat we geen besluit nemen op basis van vermoedens.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">03</span>
            <h3>Wat nu betekenis heeft</h3>
            <p>
              We kiezen samen welke stap aandacht verdient en wat bewust kan wachten.
            </p>
          </article>
        </div>
      </section>

      <section class="vision atlas-scene" data-scene="scene-005" aria-labelledby="vision-title">
        ${renderSceneWorld("scene-005")}
        <div class="vision__content">

          <header class="vision__intro" data-home-reveal>
            <h2 class="vision__title" id="vision-title">
              De juiste volgende stap staat niet vooraf vast.
            </h2>

            <p class="vision__text">
              Soms is een nieuwe website nodig. Soms een gerichte verbetering, uitbreiding
              of een helderder proces. Soms is eerst meer onderzoek nodig.
            </p>
          </header>

      <div class="vision__steps" data-home-reveal>

        <article class="vision-step">
          <span class="vision-step__number">01</span>

          <h3>Behouden</h3>

          <p>
            Wat goed werkt, hoeft niet te veranderen om ruimte te maken voor een volgende stap.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">02</span>

          <h3>Verbeteren</h3>

          <p>
            Een bestaande website, route of proces kan gericht sterker worden zonder opnieuw te beginnen.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">03</span>

          <h3>Nieuw bouwen</h3>

          <p>
            Wanneer de richting daarom vraagt, maken we haar zichtbaar en bruikbaar in ontwerp en technologie.
          </p>
        </article>

      </div>
      <div class="vision__quote" data-home-reveal>

        <h2>
          Begrip maakt de volgende stap kleiner.<br>
          Richting maakt haar draagbaar.
        </h2>

        <p>
          Wat volgt, moet passen bij je bedrijf en bij wat we samen hebben vastgesteld.
        </p>

      </div>
        </div>
      </section>
      <section class="challenges atlas-scene" data-scene="scene-006" aria-labelledby="challenges-title">
        ${renderSceneWorld("scene-006")}

        <div class="container">

          <h2 class="section-title" id="challenges-title" data-home-reveal>
            Wanneer de richting klopt, maken we haar zichtbaar en bruikbaar.
          </h2>

          <p class="section-intro" data-home-reveal>
            Strategie, ontwerp en technologie zijn middelen om een gekozen richting zorgvuldig uit te voeren.
          </p>

          <div class="challenge-grid" data-home-reveal>

            <article class="challenge-card">
              <span>01</span>
              <h3>Keuzes blijven begrijpelijk</h3>
             <p>
      We maken keuzes begrijpelijk voordat ontwerp of techniek ze definitief maakt.
      </p>
      <p class="challenge-outcome">Eerst beoordelen, daarna pas vastleggen.</p>
            </article>

            <article class="challenge-card">
              <span>02</span>
              <h3>Uitvoering blijft beheersbaar</h3>
             <p>
      We ontwerpen, bouwen en testen in stappen met een duidelijke bedoeling.
      </p>
      <p class="challenge-outcome">Voortgang zonder onnodige complexiteit.</p>
            </article>

            <article class="challenge-card">
              <span>03</span>
              <h3>Technologie blijft gereedschap</h3>
              <p>
      De technische oplossing ondersteunt de gekozen richting en neemt je bedrijf niet over.
      </p>
      <p class="challenge-outcome">Jouw bedrijf en keuze houden de hoofdrol.</p>
            </article>

            <article class="challenge-card">
              <span>04</span>
              <h3>Niet handelen blijft mogelijk</h3>
              <p>
      Wanneer bewijs ontbreekt, kan wachten of nader onderzoeken zorgvuldiger zijn dan direct bouwen.
      </p>
      <p class="challenge-outcome">Alleen veranderen wanneer dat betekenis toevoegt.</p>
            </article>

          </div>

        </div>

      </section>
      <section class="connection atlas-scene" data-scene="scene-008" aria-labelledby="connection-title">
        ${renderSceneWorld("scene-008")}

        <div class="container">

          <h2 class="section-title" id="connection-title" data-home-reveal>
            Hoe bepalen we wat werkelijk nodig is?
          </h2>

          <p class="section-intro" data-home-reveal>
            Een goede digitale beslissing ontstaat niet uit een vast aanbod.
            Ze begint bij zorgvuldig luisteren, onderzoeken en samen kiezen.
          </p>

          <div class="connection-message" data-home-reveal>

            <p>
              Eerst begrijpen we de werkelijkheid achter de vraag.
            </p>

            <p>
              Daarna kiezen we één betekenisvolle volgende stap.
            </p>

          </div>

          <div class="next-horizon" data-home-reveal>
            <p>De oplossing hoeft aan het begin nog niet vast te staan.</p>
            <h3>Bekijk hoe wij van een eerste vraag naar een gedragen richting werken.</h3>
            <a class="button button--primary" href="/werkwijze">
              Bekijk onze werkwijze
            </a>
          </div>

        </div>

        <footer class="site-footer">
          <a class="brand" href="/" aria-label="We Build and Design — home">
            <img class="brand__logo" src="/wbd-mark-dark.svg" alt="" width="82" height="48">
            <span class="brand__name">We Build and Design</span>
          </a>
          <p>Strategie, design en technologie voor bedrijven die zorgvuldig verder willen.</p>
        </footer>

      </section>
    </main>
  `;

  enablePageReveals("[data-home-reveal]");
} else {
  app.innerHTML = renderPublicPage(route);
  enablePageReveals();
}
