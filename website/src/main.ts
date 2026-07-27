import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";
import "./styles/experience-pages.css";
import { renderSceneWorld } from "./atlas-scenes";
import { publicMethod } from "./public-method";
import {
  enablePageReveals,
} from "./public-pages";
import { renderExperiencePage } from "./experience-pages";

const app = document.querySelector<HTMLDivElement>("#app")!;
const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/") {
  app.innerHTML = `
    <a class="skip-link" href="#main-content">Ga naar inhoud</a>
    <main class="page" id="main-content" tabindex="-1">
      <header class="site-header">
        <a class="brand" href="/" aria-label="We Build And Design — home">
          <span class="brand__mark" aria-hidden="true">
            <span>W</span><i></i><span>BD</span>
          </span>
          <span class="brand__name">We Build And Design</span>
        </a>

        <nav class="site-nav" aria-label="Hoofdnavigatie">
          <a href="/diensten">Diensten</a>
          <a href="/werkwijze">Werkwijze</a>
          <a href="/projecten">Projecten</a>
          <a href="/over-ons">Over ons</a>
          <a href="/kennis">Kennis</a>
        </nav>

        <a class="button button--primary site-header__cta" href="/contact">
          Vertel wat er speelt
        </a>

        <details class="site-menu">
          <summary aria-label="Open navigatie"><span></span><span></span></summary>
          <nav aria-label="Mobiele navigatie">
            <a href="/diensten">Diensten</a>
            <a href="/werkwijze">Werkwijze</a>
            <a href="/projecten">Projecten</a>
            <a href="/over-ons">Over ons</a>
            <a href="/kennis">Kennis</a>
            <a href="/contact">Contact</a>
          </nav>
        </details>
      </header>

      <section class="hero atlas-scene" data-scene="scene-001" id="eerste-publieke-minuut" aria-labelledby="hero-title">
        ${renderSceneWorld("scene-001")}
        <div class="hero__content" data-home-reveal>
          <p class="route-label"><span>01</span> Overzicht</p>
          <p class="hero__eyebrow hero__descriptor">Digitale ervaringen die beginnen met begrip</p>

          <h1 class="hero__title" id="hero-title">Begrijpen is het vertrekpunt.</h1>

          <p class="hero__text">
            We onderzoeken eerst wat digitaal werkelijk nodig is. Daarna ontwerpen en bouwen we
            een ervaring die de gewenste verandering helder maakt.
          </p>

          <a class="hero__step" href="#begrijpen">
            <span>Bekijk hoe we beginnen</span>
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
              <p>“Ik weet dat er digitaal iets moet veranderen.”</p>
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
                  We beginnen niet bij techniek.<br>
                  <strong>De situatie, de betrokken mensen en de gewenste verandering komen eerst.</strong>
                </p>
                <p>
                  Daarna worden de keuzes kleiner<br>
                  <strong>en de eerste stap begrijpelijk.</strong>
                </p>
              </div>
              <a class="understand__next" href="#digitaal-fundament">Bekijk hoe een richting ontstaat <i aria-hidden="true">→</i></a>
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
            Een professionele digitale ervaring begint met begrijpen wat zichtbaar en mogelijk moet worden.
          </h2>

          <p class="why__lead">
            Daarom maken we eerst de vraag en de keuzes helder. Ontwerp en techniek volgen pas daarna.
          </p>

          <p class="why__bridge">
            Dat kan betekenen dat we een bestaande digitale route verbeteren, een nieuw onderdeel
            ontwerpen of een complete website bouwen — afhankelijk van wat werkelijk nodig is.
          </p>
        </div>

        <div class="why__grid" data-home-reveal>
          <article class="why-principle">
            <span class="why-principle__number">01</span>
            <h3>De werkelijke vraag begrijpen</h3>
            <p>
              We onderzoeken wat al werkt, waar mensen twijfelen en welke verandering ertoe doet.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">02</span>
            <h3>Richting zichtbaar maken</h3>
            <p>
              De gekozen richting krijgt een heldere structuur en een vorm die mensen kunnen begrijpen en beoordelen.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">03</span>
            <h3>Zorgvuldig bouwen</h3>
            <p>
              We bouwen en controleren de ervaring — van inhoud en interactie tot toegankelijkheid,
              snelheid en beheer.
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
              Een professionele digitale ervaring ontstaat stap voor stap.
            </h2>

            <p class="vision__text">
              Je hoeft niet vooraf te weten hoe de oplossing werkt. We maken iedere keuze zichtbaar
              voordat we haar ontwerpen en bouwen.
            </p>
          </header>

      <div class="vision__steps" data-home-reveal>

        <article class="vision-step">
          <span class="vision-step__number">01</span>

          <h3>Luisteren</h3>

          <p>
            We beginnen bij de situatie, de mensen om wie het gaat en wat digitaal duidelijk moet worden.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">02</span>

          <h3>Vertalen</h3>

          <p>
            We brengen de gekozen richting terug tot een logische structuur en een passend ontwerp.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">03</span>

          <h3>Bouwen</h3>

          <p>
            We bouwen en testen de digitale ervaring en houden het proces begrijpelijk.
          </p>
        </article>

      </div>
      <div class="vision__quote" data-home-reveal>

        <h2>
          Jij hoeft de digitale route niet te kennen.<br>
          Wel wat er moet veranderen.
        </h2>

        <p>
          Je ziet waarom een keuze bij de werkelijke vraag past en wie er verantwoordelijkheid voor draagt.
        </p>

      </div>
        </div>
      </section>
      <section class="connection atlas-scene" data-scene="scene-008" aria-labelledby="connection-title">
        ${renderSceneWorld("scene-008")}
        ${renderSceneWorld("scene-009")}
        ${renderSceneWorld("scene-010")}

        <div class="container">

          <p class="section-eyebrow" data-home-reveal>
            05 / Een begrijpelijke eerste stap
          </p>

          <h2 class="section-title" id="connection-title" data-home-reveal>
            Je hoeft niet te weten hoe de digitale oplossing wordt gebouwd.
          </h2>

          <p class="section-intro" data-home-reveal>
            Vertel wat er speelt, wie ermee te maken heeft en wat je digitaal wilt veranderen.
            Samen maken we daar een heldere eerste stap van.
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
              Vertel wat er speelt
            </a>
          </div>

        </div>

        <footer class="site-footer">
          <a class="brand" href="/" aria-label="We Build And Design — home">
            <span class="brand__mark" aria-hidden="true">
              <span>W</span><i></i><span>BD</span>
            </span>
            <span class="brand__name">We Build And Design</span>
          </a>
          <p>Digitale ervaringen voor vragen die eerst goed begrepen moeten worden.</p>
          <nav aria-label="Voettekstnavigatie">
            <a href="/diensten">Diensten</a>
            <a href="/werkwijze">Werkwijze</a>
            <a href="/projecten">Projecten</a>
            <a href="/over-ons">Over ons</a>
            <a href="/kennis">Kennis</a>
            <a href="/contact">Contact</a>
          </nav>
        </footer>

      </section>
    </main>
  `;

  enablePageReveals("[data-home-reveal]");
} else {
  app.innerHTML = renderExperiencePage(route);
}
