import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";
import { renderSceneWorld } from "./atlas-scenes";
import { publicMethod } from "./public-method";
import {
  enablePageReveals,
  renderPublicPage,
} from "./public-pages";

const app = document.querySelector<HTMLDivElement>("#app")!;
const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/") {
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
          Bespreek je website
        </a>

        <details class="site-menu">
          <summary aria-label="Open navigatie"><span></span><span></span></summary>
          <nav aria-label="Mobiele navigatie">
            <a href="/diensten">Diensten</a>
            <a href="/werkwijze">Werkwijze</a>
            <a href="/projecten">Projecten</a>
            <a href="/over-ons">Over ons</a>
            <a href="/contact">Contact</a>
          </nav>
        </details>
      </header>

      <section class="hero atlas-scene" data-scene="scene-001" id="eerste-publieke-minuut" aria-labelledby="hero-title">
        ${renderSceneWorld("scene-001")}
        <div class="hero__content" data-home-reveal>
          <p class="route-label"><span>01</span> Overzicht</p>
          <p class="hero__eyebrow">Professionele websites. Persoonlijk en begrijpelijk.</p>

          <h1 class="hero__title" id="hero-title">Klaar voor je eerste professionele website?</h1>

          <p class="hero__text">
            Jij kent je bedrijf. Je hoeft de digitale wereld niet te kennen.<br>
            We Build And Design helpt je om die eerste stap rustig en begrijpelijk te zetten.
          </p>

          <a class="hero__step" href="#begrijpen">
            <span>Bekijk hoe Donovan begint</span>
            <i aria-hidden="true"></i>
          </a>
        </div>

      </section>

      <section class="understand atlas-scene" data-scene="scene-002" id="begrijpen" aria-labelledby="understand-title">
        ${renderSceneWorld("scene-002")}
        <div class="understand__inner">
          <header class="understand__intro" data-home-reveal>
            <p class="understand__label"><span>ROUTE 02</span> WERKWIJZE</p>
            <h2 class="understand__title" id="understand-title">
              Eerst luisteren. Dan pas bouwen.
            </h2>
          </header>

          <div class="understand__experience">
            <div class="understand__thoughts" data-home-reveal>
              <p>“Ik weet dat ik een website nodig heb.”</p>
              <p>“Ik stel die stap al een tijd uit.”</p>
              <p>“Maar waar begin ik?”</p>
            </div>

            <div class="understand__insight" data-home-reveal>
              <p class="understand__realisation">
                <span>${publicMethod.truth}</span>
                <strong>${publicMethod.question}</strong>
              </p>

              <div class="understand__belief">
                <p>
                  Donovan begint niet bij techniek.<br>
                  <strong>Hij begint bij jouw bedrijf, klanten en verhaal.</strong>
                </p>
                <p>
                  Daarna worden de keuzes kleiner<br>
                  <strong>en de eerste stap begrijpelijk.</strong>
                </p>
              </div>
              <a class="understand__next" href="#digitaal-fundament">Bekijk hoe je website ontstaat <i aria-hidden="true">→</i></a>
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

      <section class="why atlas-scene" data-scene="scene-004" id="digitaal-fundament" aria-labelledby="why-title">
        ${renderSceneWorld("scene-004")}

        <div class="why__intro" data-home-reveal>
          <p class="section-label">03 / Digitaal fundament</p>

          <h2 class="why__title" id="why-title">
            Een professionele website begint bij begrijpen wat jouw bedrijf zichtbaar moet maken.
          </h2>

          <p class="why__lead">
            Daarom maken we eerst het verhaal en de keuzes helder. Ontwerp en techniek volgen pas daarna.
          </p>
        </div>

        <div class="why__grid" data-home-reveal>
          <article class="why-principle">
            <span class="why-principle__number">01</span>
            <h3>Jouw bedrijf begrijpen</h3>
            <p>
              Donovan luistert naar wat je doet, voor wie je dat doet en waarom klanten voor jou kiezen.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">02</span>
            <h3>Je verhaal zichtbaar maken</h3>
            <p>
              Je verhaal krijgt een heldere structuur en een vorm die professioneel bij je onderneming past.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">03</span>
            <h3>Zorgvuldig bouwen</h3>
            <p>
              We bouwen wat je vandaag nodig hebt en leggen technische keuzes uit in gewone taal.
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
              Een professionele website ontstaat stap voor stap.
            </h2>

            <p class="vision__text">
              Je hoeft niet vooraf te weten hoe een website werkt. We maken iedere keuze zichtbaar
              voordat we haar ontwerpen en bouwen.
            </p>
          </header>

      <div class="vision__steps" data-home-reveal>

        <article class="vision-step">
          <span class="vision-step__number">01</span>

          <h3>Luisteren</h3>

          <p>
            We beginnen bij je bedrijf, je klanten en wat je online duidelijk wilt maken.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">02</span>

          <h3>Vertalen</h3>

          <p>
            We brengen je verhaal terug tot een logische structuur en een passend ontwerp.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">03</span>

          <h3>Bouwen</h3>

          <p>
            We bouwen en testen de website en houden het proces voor jou begrijpelijk.
          </p>
        </article>

      </div>
      <div class="vision__quote" data-home-reveal>

        <h2>
          Jij hoeft de digitale route niet te kennen.<br>
          Wel je bedrijf.
        </h2>

        <p>
          Donovan maakt de keuzes begrijpelijk en blijft bereikbaar wanneer je een vraag hebt.
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
            05 / Waarom de eerste stap blijft liggen
          </p>

          <h2 class="section-title" id="challenges-title" data-home-reveal>
            Een website wordt vaak uitgesteld omdat de eerste stap te groot voelt.
          </h2>

          <p class="section-intro" data-home-reveal>
            Je hoeft niet méér te weten. Je hebt iemand nodig die de route begrijpelijk maakt.
          </p>

          <div class="challenge-grid" data-home-reveal>

            <article class="challenge-card">
              <span>01</span>
              <h3>Je weet niet waar je begint</h3>
             <p>
      Je weet dat een website nodig is, maar niet welke keuzes eerst komen.
      </p>
      <p class="challenge-outcome">We beginnen bij jouw bedrijf, niet bij techniek.</p>
            </article>

            <article class="challenge-card">
              <span>02</span>
              <h3>Je verhaal staat nog niet online</h3>
             <p>
      In gesprekken is duidelijk wat je goed doet, maar online ziet een nieuwe klant dat nog niet.
      </p>
      <p class="challenge-outcome">Samen kiezen we wat je website helder moet vertellen.</p>
            </article>

            <article class="challenge-card">
              <span>03</span>
              <h3>Techniek maakt onzeker</h3>
              <p>
      Domeinen, hosting en systemen maken een overzichtelijke vraag onnodig groot.
      </p>
      <p class="challenge-outcome">Donovan legt de keuzes uit in gewone taal.</p>
            </article>

            <article class="challenge-card">
              <span>04</span>
              <h3>Een groot bureau voelt te groot</h3>
              <p>
      Je zoekt professionele kwaliteit zonder afstandelijk proces of onnodige lagen.
      </p>
      <p class="challenge-outcome">Je hebt rechtstreeks contact met Donovan.</p>
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
            06 / Een begrijpelijke eerste stap
          </p>

          <h2 class="section-title" id="connection-title" data-home-reveal>
            Je hoeft niet te weten hoe een website wordt gebouwd.
          </h2>

          <p class="section-intro" data-home-reveal>
            Vertel wat je bedrijf doet, wie je helpt en wat je online wilt laten zien.
            Donovan helpt je om daar een heldere eerste stap van te maken.
          </p>

          <div class="connection-message" data-home-reveal>

            <p>
              Eerst een gewoon gesprek.
            </p>

            <p>
              Daarna pas ontwerp en techniek.
            </p>

          </div>

          <div class="compass-moment" data-scene="scene-009" aria-hidden="true">
            <span class="compass-moment__north">N</span>
            <i class="compass-moment__needle"></i>
            <i class="compass-moment__relief"></i>
          </div>

          <div class="next-horizon" data-home-reveal>
            <p>Je hoeft nog geen briefing of technische kennis te hebben.</p>
            <h3>Vertel waar je nu staat.</h3>
            <a class="button button--primary" href="/contact">
              Neem contact op
            </a>
          </div>

        </div>

        <footer class="site-footer">
          <a class="brand" href="/" aria-label="We Build and Design — home">
            <span class="brand__mark">WBD.</span>
            <span class="brand__name">We Build and Design</span>
          </a>
          <p>Professionele websites voor ondernemers die hun eerste stap online begrijpelijk willen zetten.</p>
        </footer>

      </section>
    </main>
  `;

  enablePageReveals("[data-home-reveal]");
} else {
  app.innerHTML = renderPublicPage(route);
  enablePageReveals();
}
