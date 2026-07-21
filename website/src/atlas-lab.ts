import "./styles/atlas-lab.css";
import masterVisionBoard from "../design/Vision Board/08-Master-Vision-Boards/Atlas-Master-Vision-Board-v03.png";
import worldBuildingBoard from "../design/Vision Board/08-Master-Vision-Boards/Atlas-Master-Vision-Board-v04-World-Building.png";
import journeyPanorama from "./assets/images/atlas/landscapes/atlas-landscape-journey-panorama-v01.webp";
import auroraLandscape from "./assets/images/atlas/atmosphere/atlas-landscape-aurora-v01.webp";
import horizonLandscape from "./assets/images/atlas/landscapes/atlas-landscape-horizon-v01.webp";
import routeLandscape from "./assets/images/atlas/navigation/atlas-route-landscape-v01.webp";
import { kindLabel, loadUnderstanding, reviewUnderstanding, type UnderstandingCaseId, type UnderstandingItem } from "./atlas-understanding";

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const roomLabel = (number: string, title: string) => `
  <div class="lab-room__heading" data-reveal>
    <p class="lab-room__number">Room ${number}</p>
    <h2>${title}</h2>
  </div>
`;

export function renderAtlasLab(app: HTMLDivElement) {
  document.documentElement.classList.add("atlas-lab-mode");
  document.title = "Atlas Lab — World Building Environment";

  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = "noindex, nofollow";

  const understanding = loadUnderstanding(localStorage).value;
  const understandingCases: { id: UnderstandingCaseId; name: string }[] = [{ id: "0001", name: "We Build And Design" }, { id: "0002", name: "AquaFlask" }];
  const proposedSignals = (caseId: UnderstandingCaseId): UnderstandingItem[] => {
    const review = reviewUnderstanding(understanding, caseId);
    return [...review.openQuestions, ...review.needsEvidence, ...review.tensions, ...review.emergingPatterns].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  };

  app.innerHTML = `
    <main class="atlas-lab">
      <p class="lab-signature" aria-label="Interne ontwerpomgeving">
        <span>Atlas Lab</span><span>Internal environment</span>
      </p>

      <section class="lab-intro lab-shell" aria-labelledby="lab-title">
        <div class="lab-intro__copy" data-reveal>
          <p class="lab-kicker">World building environment</p>
          <h1 id="lab-title">Atlas Lab</h1>
          <p class="lab-intro__statement">Hier ontwikkelen we de wereld van Atlas voordat zij zichtbaar wordt voor de ondernemer.</p>
        </div>
        <a class="lab-entry" href="#light" aria-label="Betreed de eerste ruimte">
          <span>Enter the landscape</span><i aria-hidden="true"></i>
        </a>
      </section>

      <section class="lab-room lab-room--light-fields lab-shell" id="light" aria-labelledby="light-title">
        ${roomLabel("01", "Light & Atmosphere").replace("<h2>", '<h2 id="light-title">')}
        <p class="lab-room__thought" data-reveal>Niet het donker verdwijnt.<br>Het zicht wordt helderder.</p>
        <div class="light-fields" aria-label="Lichtreis van Midnight naar Summit" data-reveal>
          ${["Midnight", "Aurora", "First Light", "Horizon", "Summit"]
            .map((name, index) => `<div class="light-field light-field--${index + 1}"><span>0${index + 1}</span><strong>${name}</strong></div>`)
            .join("")}
        </div>
      </section>

      <section class="lab-room lab-room--landscape lab-shell" aria-labelledby="landscape-title">
        ${roomLabel("02", "Landscapes").replace("<h2>", '<h2 id="landscape-title">')}
        <div class="landscape-study" aria-hidden="true" data-reveal>
          <i class="landscape-study__sun"></i>
          <i class="landscape-study__ridge landscape-study__ridge--far"></i>
          <i class="landscape-study__ridge landscape-study__ridge--near"></i>
          <span class="landscape-study__horizon"></span>
        </div>
        <p class="lab-caption" data-reveal>Ruimte om te kijken. Een horizon om naartoe te bewegen.</p>
      </section>

      <section class="lab-room lab-room--navigation lab-shell" aria-labelledby="navigation-title">
        ${roomLabel("03", "Navigation").replace("<h2>", '<h2 id="navigation-title">')}
        <div class="navigation-study" data-reveal>
          <svg viewBox="0 0 1100 560" role="img" aria-label="Een route tussen vier waypoints en een subtiele kompasrichting">
            <g class="navigation-study__contours">
              <path d="M-20 366C145 220 319 470 472 326S790 104 1136 202"/>
              <path d="M-14 405C150 267 325 507 497 356S813 145 1122 243"/>
              <path d="M4 447C167 315 349 536 520 398S839 196 1110 292"/>
            </g>
            <path class="navigation-study__route" pathLength="1" d="M86 418C206 394 194 255 330 276S480 431 618 332S783 132 974 185"/>
            <g class="navigation-study__points">
              <circle cx="86" cy="418" r="7"/><circle cx="330" cy="276" r="7"/><circle cx="618" cy="332" r="7"/><circle cx="974" cy="185" r="7"/>
            </g>
            <g class="navigation-study__compass" transform="translate(887 389)">
              <circle r="76"/><circle r="55"/><path d="M0-44L8-7 0 0-8-7Z"/><path d="M0 44L-6 7 0 0 6 7Z"/>
              <text x="0" y="-92">N</text>
            </g>
          </svg>
          <p>Richting zonder uitleg.</p>
        </div>
      </section>

      <section class="lab-room lab-room--materials lab-shell" aria-labelledby="materials-title">
        ${roomLabel("04", "Materials").replace("<h2>", '<h2 id="materials-title">')}
        <div class="material-library" data-reveal>
          <figure class="material material--stone"><span></span><figcaption>Natuursteen</figcaption></figure>
          <figure class="material material--wood"><span></span><figcaption>Hout</figcaption></figure>
          <figure class="material material--linen"><span></span><figcaption>Linnen</figcaption></figure>
          <figure class="material material--paper"><span></span><figcaption>Papier</figcaption></figure>
          <figure class="material material--metal"><span></span><figcaption>Mat metaal</figcaption></figure>
        </div>
      </section>

      <section class="lab-room lab-room--spaces lab-shell" aria-labelledby="spaces-title">
        ${roomLabel("05", "Spaces").replace("<h2>", '<h2 id="spaces-title">')}
        <div class="space-study" aria-hidden="true" data-reveal>
          <span class="space-study__wall"></span><span class="space-study__opening"></span>
          <span class="space-study__light"></span><span class="space-study__bench"></span>
          <span class="space-study__path"></span>
        </div>
        <p class="lab-caption" data-reveal>Een museum. Een observatorium. Een stille plek die je blik opent.</p>
      </section>

      <section class="lab-room lab-room--emotion lab-shell" aria-labelledby="emotion-title">
        ${roomLabel("06", "Emotion").replace("<h2>", '<h2 id="emotion-title">')}
        <div class="emotion-field" data-reveal>
          <span>Rust</span><span>Nieuwsgierigheid</span><span>Verwondering</span><span>Hoop</span><span>Vertrouwen</span><span>Richting</span>
        </div>
      </section>

      <section class="lab-room lab-room--journey lab-shell" aria-labelledby="journey-title">
        ${roomLabel("07", "From Night to Light").replace("<h2>", '<h2 id="journey-title">')}
        <div class="journey-stage" data-reveal>
          <i class="journey-stage__sun" aria-hidden="true"></i>
          <p>De ondernemer beweegt niet naar een antwoord.<br>Hij beweegt naar helderheid.</p>
          <ol aria-label="De vijf fases van de Atlas-reis">
            <li><span>01</span>Midnight</li><li><span>02</span>Aurora</li><li><span>03</span>First Light</li><li><span>04</span>Horizon</li><li><span>05</span>Summit</li>
          </ol>
        </div>
      </section>

      <section class="lab-room lab-room--real-assets lab-shell" aria-labelledby="real-assets-title">
        ${roomLabel("08", "Real Landscape Assets").replace("<h2>", '<h2 id="real-assets-title">')}
        <p class="lab-room__thought" data-reveal>Van goedgekeurde bron naar een gecontroleerde horizon in de website.</p>
        <div class="real-assets" data-reveal>
          <figure>
            <img src="${worldBuildingBoard}" alt="Atlas Master Vision Board v04 als bron" loading="lazy" decoding="async">
            <figcaption><span>Bron</span><strong>Master Vision Board v04</strong></figcaption>
          </figure>
          <figure>
            <img src="${journeyPanorama}" alt="Tekstvrije panoramacrop van de Atlas-lichtreis" loading="lazy" decoding="async">
            <figcaption><span>Crop</span><strong>Journey panorama</strong></figcaption>
          </figure>
          <figure>
            <img src="${auroraLandscape}" alt="Webasset met aurora boven een bergvallei" loading="lazy" decoding="async">
            <figcaption><span>Webasset</span><strong>Route 02 — herkenning</strong></figcaption>
          </figure>
          <figure>
            <img src="${horizonLandscape}" alt="Webasset met warme horizon en rivierlicht" loading="lazy" decoding="async">
            <figcaption><span>Toepassing</span><strong>Latere routes — richting</strong></figcaption>
          </figure>
          <figure>
            <img src="${routeLandscape}" alt="Ondersteunende webasset met organische route en topografie" loading="lazy" decoding="async">
            <figcaption><span>Ondersteuning</span><strong>Navigatie — niet leidend</strong></figcaption>
          </figure>
        </div>
      </section>

      <section class="lab-room lab-room--golden-system lab-shell" aria-labelledby="golden-system-title">
        ${roomLabel("09", "Golden Route System").replace("<h2>", '<h2 id="golden-system-title">')}
        <p class="lab-room__thought" data-reveal>Één route. Inzichten als waypoints. Een kompas wanneer keuze betekenis krijgt.</p>

        <div class="golden-system" data-reveal>
          <div class="golden-system__routes" aria-label="Drie helderheidsfases van dezelfde gouden route">
            <figure class="golden-route-variant golden-route-variant--soft">
              <svg viewBox="0 0 420 90" aria-hidden="true"><path d="M8 66C92 74 96 18 185 42s126 40 227-12"/></svg>
              <figcaption><span>01</span>Zacht begin</figcaption>
            </figure>
            <figure class="golden-route-variant golden-route-variant--mist">
              <svg viewBox="0 0 420 90" aria-hidden="true"><path d="M8 66C92 74 96 18 185 42s126 40 227-12"/></svg>
              <figcaption><span>02</span>Verdwijnt in mist</figcaption>
            </figure>
            <figure class="golden-route-variant golden-route-variant--clear">
              <svg viewBox="0 0 420 90" aria-hidden="true"><path d="M8 66C92 74 96 18 185 42s126 40 227-12"/><circle cx="185" cy="42" r="5"/></svg>
              <figcaption><span>03</span>Richting wordt helder</figcaption>
            </figure>
          </div>

          <div class="golden-system__symbols" aria-label="Waypoint en kompasreferentie">
            <figure><div class="golden-waypoint"><i></i></div><figcaption>Waypoint<br><span>Inzicht bereikt</span></figcaption></figure>
            <figure><div class="golden-compass"><span>N</span><i></i></div><figcaption>Kompasring<br><span>Klaar om te kiezen</span></figcaption></figure>
          </div>
        </div>

        <div class="golden-compare" data-reveal>
          <figure class="golden-compare__abstract">
            <div><i></i><i></i></div>
            <figcaption><span>Niet</span>Geometrie als landschap</figcaption>
          </figure>
          <figure>
            <div><img src="${horizonLandscape}" alt="Echt Atlas-landschap zonder grafische route" loading="lazy" decoding="async"></div>
            <figcaption><span>Basis</span>Echt landschap</figcaption>
          </figure>
          <figure class="golden-compare__leading">
            <div>
              <img src="${horizonLandscape}" alt="Echt Atlas-landschap met een ondersteunende gouden route" loading="lazy" decoding="async">
              <svg viewBox="0 0 520 300" aria-hidden="true"><path d="M12 245C134 210 180 268 269 183S391 129 508 54"/><circle cx="269" cy="183" r="5"/></svg>
            </div>
            <figcaption><span>Leidend</span>Landschap met betekenisvolle route</figcaption>
          </figure>
        </div>
      </section>

      <section class="lab-room lab-room--understanding lab-shell" aria-labelledby="understanding-study-title">
        ${roomLabel("10", "Understanding Study").replace("<h2>", '<h2 id="understanding-study-title">')}
        <p class="lab-room__thought" data-reveal>De tweede denker signaleert. De mens bepaalt wat betekenis krijgt.</p>
        <div class="lab-understanding" data-reveal>
          ${understandingCases.map(({ id, name }) => {
            const items = understanding.items.filter((item) => item.caseId === id);
            const signals = proposedSignals(id);
            return `<article><header><span>Case ${id}</span><h3>${name}</h3></header>${items.length === 0
              ? '<div class="lab-understanding__empty"><strong>Het bekende beeld staat.</strong><p>De oorzaak van de productmelding blijft open. Atlas wacht op een concrete herhaling voordat nieuw begrip wordt toegevoegd.</p></div>'
              : `<p class="lab-understanding__status">${signals.length} signaal${signals.length === 1 ? "" : "en"} voor menselijke beoordeling</p><ul>${signals.length ? signals.map((item) => `<li><span>${escapeHtml(kindLabel(item.kind))}</span><p>${escapeHtml(item.text)}</p><small>Signaal · geen conclusie</small><a href="/atlas?case=${id}&amp;item=${encodeURIComponent(item.id)}#understanding">Bevestig, pas aan of verwerp in Workspace →</a></li>`).join("") : '<li><p>Geen open signalen in de huidige gegevens.</p><small>Geen automatische conclusie</small></li>'}</ul>`}</article>`;
          }).join("")}
        </div>
        <p class="lab-caption" data-reveal>Het Lab schrijft niets terug en trekt geen conclusie. Het maakt alleen vragen, ontbrekend bewijs, spanningen en beginnende patronen zichtbaar.</p>
      </section>

      <section class="lab-room lab-room--experiments lab-shell" aria-labelledby="experiments-title">
        <div class="lab-room__heading" data-reveal><p class="lab-room__number">Permanent space</p><h2 id="experiments-title">Experiments</h2></div>
        <p class="lab-room__thought" data-reveal>Werk dat nog geen antwoord hoeft te zijn.</p>
        <div class="experiment-index" data-reveal>
          ${["Hero", "Motion", "Typography", "World", "Lighting", "Component explorations"]
            .map((name, index) => `<div><span>0${index + 1}</span><p>${name}</p><i>Open study</i></div>`)
            .join("")}
        </div>
      </section>

      <section class="lab-room lab-room--compare lab-shell" aria-labelledby="compare-title">
        <div class="lab-room__heading" data-reveal><p class="lab-room__number">Compare mode</p><h2 id="compare-title">World studies</h2></div>
        <div class="compare-mode" data-reveal>
          <figure class="compare-study compare-study--empty">
            <div><span>Source study</span><p>Visual reference not yet available</p></div>
            <figcaption><span>v02</span>Earlier direction</figcaption>
          </figure>
          <figure class="compare-study">
            <img src="${masterVisionBoard}" alt="Atlas Master Vision Board versie 03" loading="lazy" decoding="async">
            <figcaption><span>v03</span>Current world direction</figcaption>
          </figure>
        </div>
      </section>

      <footer class="lab-footer lab-shell">
        <p>Atlas is not explained.<br>Atlas is felt.</p>
        <span>World building environment · v01</span>
      </footer>
    </main>
  `;

  const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
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

  revealElements.forEach((element) => observer.observe(element));
}
