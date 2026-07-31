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
          <a href="/werkwijze">Werkwijze</a>
          <a href="/diensten">Diensten</a>
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
            <a href="/werkwijze">Werkwijze</a>
            <a href="/diensten">Diensten</a>
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
          <p class="hero__eyebrow hero__descriptor">Praktische digitale verbeteringen die beginnen met begrip</p>

          <h1 class="hero__title" id="hero-title">Begrijpen is het vertrekpunt.</h1>

          <p class="hero__text">
            We Build And Design onderzoekt eerst hoe je organisatie werkt, wat al goed gaat en waar
            mensen vastlopen. Daarna bepalen we samen welke praktische digitale verbetering helpt.
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
              <p>“Ik merk dat ons werk onnodig ingewikkeld wordt.”</p>
              <p>“We lopen steeds tegen dezelfde vragen aan.”</p>
              <p>“Maar waar beginnen we zonder alles om te gooien?”</p>
            </div>

            <div class="understand__insight" data-home-reveal>
              <p class="understand__realisation">
                <span>${publicMethod.truth}</span>
                <strong>${publicMethod.question}</strong>
              </p>

              <div class="understand__belief">
                <p>
                  We beginnen niet bij techniek.<br>
                  <strong>Je dagelijkse praktijk, de betrokken mensen en bestaande systemen komen eerst.</strong>
                </p>
                <p>
                  Daarna kiezen we wat kan blijven<br>
                  <strong>en welke kleine stap echt verschil maakt.</strong>
                </p>
              </div>
              <a class="understand__next" href="#digitaal-fundament">Bekijk hoe een verbetering ontstaat <i aria-hidden="true">→</i></a>
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
          <p class="section-label">03 / Praktische verbetering</p>

          <h2 class="why__title" id="why-title">
            Een goede digitale verbetering begint bij hoe je organisatie nu werkt.
          </h2>

          <p class="why__lead">
            We kijken wat al werkt, waar jij of je collega’s tijd verliezen en wat klanten nodig hebben.
            Ontwerp en techniek volgen pas daarna.
          </p>

          <p class="why__bridge">
            Vaak kan de software die je al gebruikt gewoon blijven. Een digitale verbetering kan
            een website, intern systeem, webshop of koppeling zijn, maar ook een slimmer proces of
            een gerichte aanpassing. Welke vorm past, bepalen we pas nadat we de praktijk begrijpen.
          </p>
        </div>

        <div class="why__grid" data-home-reveal>
          <article class="why-principle">
            <span class="why-principle__number">01</span>
            <h3>De dagelijkse praktijk begrijpen</h3>
            <p>
              We onderzoeken wat goed gaat, waar werk blijft liggen en wat voor klanten of collega’s onduidelijk is.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">02</span>
            <h3>De kleinste zinvolle stap kiezen</h3>
            <p>
              We maken helder wat kan blijven, wat beter kan en waarom die keuze bij je organisatie past.
            </p>
          </article>

          <article class="why-principle">
            <span class="why-principle__number">03</span>
            <h3>Zorgvuldig verbeteren</h3>
            <p>
              We werken in begrensde stappen en spreken af wat we per stap beoordelen. Zo blijft
              duidelijk wat wel en niet wordt aangepakt.
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
              Verbeteren hoeft niet in één keer.
            </h2>

            <p class="vision__text">
              Je hoeft vooraf niet te weten welke oplossing past. We bekijken eerst wat behouden
              kan blijven en maken iedere volgende keuze begrijpelijk.
            </p>
          </header>

      <div class="vision__steps" data-home-reveal>

        <article class="vision-step">
          <span class="vision-step__number">01</span>

          <h3>Luisteren</h3>

          <p>
            We beginnen bij het dagelijkse werk, de mensen om wie het gaat en wat nu onnodig lastig is.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">02</span>

          <h3>Vertalen</h3>

          <p>
            We brengen de vraag terug tot een haalbare stap die je kunt beoordelen en dragen.
          </p>
        </article>

        <article class="vision-step">
          <span class="vision-step__number">03</span>

          <h3>Uitvoeren</h3>

          <p>
            We voeren de afgesproken verbetering uit en maken het duidelijk wanneer specialistische
            hulp of nieuwe software nodig is.
          </p>
        </article>

      </div>
      <div class="vision__quote" data-home-reveal>

        <h2>
          Jij hoeft de technische route niet te kennen.<br>
          Wel waar het werk vastloopt.
        </h2>

        <p>
          Je ziet wat kan blijven, wat moet veranderen en waarom die keuze bij je organisatie past.
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
            05 / Een gewone eerste stap
          </p>

          <h2 class="section-title" id="connection-title" data-home-reveal>
            Je hoeft nog niet te weten welke oplossing past.
          </h2>

          <p class="section-intro" data-home-reveal>
            Vertel hoe je organisatie werkt, wie tegen het probleem aanloopt en wat je wilt verbeteren.
            Samen bepalen we een haalbare eerste stap.
          </p>

          <div class="connection-message" data-home-reveal>

            <p>
              Eerst een gewoon gesprek.
            </p>

            <p>
              Daarna pas een oplossing.
            </p>

          </div>

          <div class="compass-moment" data-scene="scene-009" aria-hidden="true">
            <span class="compass-moment__north">N</span>
            <i class="compass-moment__needle"></i>
            <i class="compass-moment__relief"></i>
          </div>

          <div class="next-horizon" data-home-reveal>
            <p>Je hoeft geen briefing of technisch plan te hebben.</p>
            <h3>Bekijk hoe we samen beginnen.</h3>
            <a class="button button--primary" href="/werkwijze">
              Bekijk onze werkwijze
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
          <p>We beginnen bij hoe je organisatie werkt en verbeteren alleen wat nodig is.</p>
          <nav aria-label="Voettekstnavigatie">
            <a href="/werkwijze">Werkwijze</a>
            <a href="/diensten">Diensten</a>
            <a href="/projecten">Projecten</a>
            <a href="/over-ons">Over ons</a>
            <a href="/kennis">Kennis</a>
            <a href="/contact">Contact</a>
            <a href="/algemene-voorwaarden">Algemene voorwaarden</a>
            <a href="/privacy">Privacyverklaring</a>
          </nav>
        </footer>

      </section>
    </main>
  `;

  enablePageReveals("[data-home-reveal]");
} else {
  app.innerHTML = renderExperiencePage(route);
}
