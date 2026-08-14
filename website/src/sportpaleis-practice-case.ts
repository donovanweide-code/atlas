import formBefore from "./assets/images/cases/sportpaleis-formulier-before-v1.png";
import workspaceAttentionPublic from "./assets/images/cases/sportpaleis-workspace-attention-public-v1.png";
import workspaceOverviewPublic from "./assets/images/cases/sportpaleis-workspace-overview-public-v1.png";
import workspacePublic from "./assets/images/cases/sportpaleis-workspace-public-v1.png";
import workspaceRolesPublic from "./assets/images/cases/sportpaleis-workspace-roles-public-v1.png";

type ChromeRenderer = (currentPath: string) => string;
type FooterRenderer = () => string;

const CASE_PATH = "/projecten/sportpaleis";

function setCaseMeta(): void {
  const title = "Sportpaleis praktijkcase — Van papier naar één werkwijze";
  const description =
    "Een praktijkcase over hoe We Build And Design papieren kennis eerst begreep en daarna vertaalde naar een eenvoudige digitale werkwijze.";
  const canonicalUrl = new URL(CASE_PATH, "https://webuildanddesign.nl").toString();

  document.title = title;

  const setContent = (selector: string, attribute: "name" | "property", key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.append(element);
    }
    element.content = value;
  };

  setContent('meta[name="description"]', "name", "description", description);
  setContent('meta[property="og:title"]', "property", "og:title", title);
  setContent('meta[property="og:description"]', "property", "og:description", description);
  setContent('meta[property="og:type"]', "property", "og:type", "article");
  setContent('meta[property="og:url"]', "property", "og:url", canonicalUrl);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = canonicalUrl;
}

function renderBeforeVisual(): string {
  return `<figure class="sp-case-before__visual">
    <img
      src="${formBefore}"
      alt="Twee pagina's van het oorspronkelijke formulier voor de bedrukking van verenigingskleding."
      decoding="async"
    >
    <figcaption>Het oorspronkelijke formulier: velden, afspraken en kennis in één document.</figcaption>
  </figure>`;
}

function renderExplainer(label: string, title: string, body: string, items: string[] = []): string {
  return `<details class="sp-case-detail">
    <summary><span aria-hidden="true"></span><strong>${label}</strong></summary>
    <div>
      <h3>${title}</h3>
      <p>${body}</p>
      ${items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
    </div>
  </details>`;
}

export function renderSportpaleisPracticeCase(
  renderHeader: ChromeRenderer,
  renderFooter: FooterRenderer,
): string {
  setCaseMeta();

  return `<a class="skip-link" href="#main-content">Ga naar inhoud</a>
  <main class="page experience-page sp-case" id="main-content" tabindex="-1">
    ${renderHeader(CASE_PATH)}

    <article>
      <header class="sp-case-hero">
        <div class="sp-case-hero__copy">
          <p class="sp-case-kicker"><span>Praktijkcase</span> In ontwikkeling</p>
          <h1>Van papier naar één werkwijze.</h1>
          <p>Sportpaleis werkte met formulieren, losse instructies en kennis van medewerkers.</p>
          <a href="#de-uitgangssituatie">Bekijk wat we zagen <i aria-hidden="true"></i></a>
        </div>
        ${renderBeforeVisual()}
      </header>

      <section class="sp-case-scattered" id="de-uitgangssituatie" aria-labelledby="sp-case-scattered-title">
        <div>
          <p class="sp-case-label">De uitgangssituatie</p>
          <h2 id="sp-case-scattered-title">De kennis zat overal.</h2>
        </div>
        <ul aria-label="Vragen die medewerkers zelf moesten beantwoorden">
          <li>Welk artikel?</li>
          <li>Welke afspraak?</li>
          <li>Welke uitzondering?</li>
        </ul>
        <p>De medewerker moest het weten of opzoeken.</p>
      </section>

      <section class="sp-case-insight" aria-labelledby="sp-case-insight-title">
        <p class="sp-case-label">Het inzicht</p>
        <h2 id="sp-case-insight-title">We hebben het formulier niet digitaal nagemaakt.</h2>
        <p>We zijn eerst gaan begrijpen waarom het bestond.</p>
        ${renderExplainer(
          "Waarom niet gewoon een digitaal formulier?",
          "Papier was alleen de zichtbare bovenkant.",
          "Daarachter zaten afspraken, uitzonderingen, artikelen en kennis die medewerkers moesten interpreteren. Daarom bouwden we het formulier niet simpelweg na. Eerst onderzochten we waarom de informatie nodig was en hoe die door het werkproces loopt.",
        )}
      </section>

      <section class="sp-case-workspace" aria-labelledby="sp-case-workspace-title">
        <header>
          <p class="sp-case-label">De werklaag</p>
          <h2 id="sp-case-workspace-title">Nu zit de kennis in de werkwijze.</h2>
        </header>
        <figure class="sp-case-workspace__visual">
          <img
            src="${workspacePublic}"
            alt="Privacyveilige uitsnede van de echte Sportpaleis Workspace met een lege orderwerkwijze in duidelijke stappen."
            loading="lazy"
            decoding="async"
          >
          <figcaption>Privacyveilige uitsnede uit de lokale reviewomgeving.</figcaption>
        </figure>
        <ol class="sp-case-callouts">
          <li><span>1</span><p><strong>Context</strong>Wat bij de order hoort, komt samen.</p></li>
          <li><span>2</span><p><strong>Organisatiekennis</strong>Afspraken hoeven niet los gezocht.</p></li>
          <li><span>3</span><p><strong>Controle</strong>Ontbrekende informatie blijft zichtbaar.</p></li>
          <li><span>4</span><p><strong>Volgende stap</strong>Vastgelegde informatie kan mee.</p></li>
        </ol>
        ${renderExplainer(
          "Wat weet de Workspace?",
          "Context zonder alles opnieuw te hoeven uitzoeken.",
          "De Workspace kan relevante context en vastgelegde organisatiekennis samenbrengen. Daardoor hoeft een medewerker niet iedere afspraak opnieuw zelf te zoeken, onthouden en interpreteren. De medewerker blijft beoordelen wat in de situatie klopt.",
        )}
      </section>

      <section class="sp-case-execution" aria-labelledby="sp-case-execution-title">
        <div>
          <p class="sp-case-label">Van order naar uitvoering</p>
          <h2 id="sp-case-execution-title">Van bestelling naar iets waar je mee verder kunt.</h2>
        </div>
        <p>Informatie komt samen. Wat ontbreekt, blijft zichtbaar. Daarna volgt controle.</p>
        ${renderExplainer(
          "Wat gebeurt er na de order?",
          "Registratie is het begin, niet het eindpunt.",
          "Dezelfde informatie die bij de order wordt vastgelegd, kan mee naar de volgende stap. Zo hoeft het werk niet telkens opnieuw vanaf nul geïnterpreteerd te worden. Wat nog ontbreekt, blijft zichtbaar voordat voorbereiding of uitvoering verdergaat.",
        )}
      </section>

      <section class="sp-case-change" aria-labelledby="sp-case-change-title">
        <header>
          <p class="sp-case-label">Wat veranderde er?</p>
          <h2 id="sp-case-change-title">Minder vertalen tussen werelden.</h2>
        </header>
        <div class="sp-case-change__routes">
          <article>
            <p>Voor</p>
            <ol><li>Zoeken</li><li>Interpreteren</li><li>Overnemen</li><li>Controleren</li><li>Uitvoeren</li></ol>
          </article>
          <article>
            <p>Nu</p>
            <ol><li>Vastleggen</li><li>Workspace helpt met context</li><li>Controleren</li><li>Verder</li></ol>
          </article>
        </div>
      </section>

      <section class="sp-case-beyond" aria-labelledby="sp-case-beyond-title">
        <header>
          <p class="sp-case-label">De bredere werkomgeving</p>
          <h2 id="sp-case-beyond-title">Dit was pas het begin.</h2>
          <p>Je ziet eenvoudige schermen. Daaronder komt het dagelijkse werk samen.</p>
        </header>
        <div class="sp-case-beyond__gallery" aria-label="Privacyveilige voorbeelden uit de Sportpaleis Workspace">
          <figure class="sp-case-beyond__figure sp-case-beyond__figure--lead">
            <img
              src="${workspaceOverviewPublic}"
              alt="Privacyveilige uitsnede van het Workspace-overzicht met aandacht en werkvoorraad."
              loading="lazy"
              decoding="async"
            >
            <figcaption>Werk blijft zichtbaar.</figcaption>
          </figure>
          <figure class="sp-case-beyond__figure">
            <img
              src="${workspaceRolesPublic}"
              alt="Geredigeerde Workspace-weergave waarin verschillende rollen en toegang zichtbaar zijn."
              loading="lazy"
              decoding="async"
            >
            <figcaption>Eén werkomgeving. Verschillende rollen.</figcaption>
          </figure>
          <figure class="sp-case-beyond__figure">
            <img
              src="${workspaceAttentionPublic}"
              alt="Geredigeerde Workspace-weergave waarin ontbrekende informatie om controle vraagt."
              loading="lazy"
              decoding="async"
            >
            <figcaption>Ontbreekt er iets? Dan vraagt de werkwijze om aandacht.</figcaption>
          </figure>
        </div>
        ${renderExplainer(
          "Hoe groot was de verandering?",
          "Achter het eenvoudige scherm komen meerdere werkdelen samen.",
          "Het concrete formulier was het startpunt. Daaromheen ontstond een groeiende digitale werkomgeving die verschillende onderdelen van het dagelijkse werk kan verbinden.",
          [
            "Orderinvoer",
            "Beheer",
            "Organisatiekennis",
            "Rollen en toegang",
            "Voorbereiding van vervolgstappen",
            "Historie en traceerbaarheid",
            "Samenwerken met meerdere gebruikers",
          ],
        )}
      </section>

      <section class="sp-case-control" aria-labelledby="sp-case-control-title">
        <p class="sp-case-label">Mens in controle</p>
        <h2 id="sp-case-control-title">We automatiseren wat we betrouwbaar weten.</h2>
        <div class="sp-case-control__question">
          <p>Ontbreekt er iets?</p>
          <strong>Dan moet dat zichtbaar worden.</strong>
          <span>Geen aannames.</span>
        </div>
        ${renderExplainer(
          "Wat zit er onder wat je ziet?",
          "Een rustig scherm kan een bredere werklaag dragen.",
          "De techniek blijft op de achtergrond. Daar brengt de Workspace gegevens, kennis en samenwerking gecontroleerd samen. Wanneer noodzakelijke informatie ontbreekt, moet de werkwijze blokkeren of om aandacht vragen in plaats van iets aan te nemen.",
          [
            "Rollen en rechten",
            "Validatie",
            "Vastgelegde organisatiekennis",
            "Centrale gegevens",
            "Historie en traceerbaarheid",
            "Meerdere gebruikers",
            "Gecontroleerde output en volgende stappen",
          ],
        )}
      </section>

      <section class="sp-case-closing" aria-labelledby="sp-case-closing-title">
        <div>
          <p class="sp-case-label">Waar zouden wij beginnen?</p>
          <h2 id="sp-case-closing-title">Ieder bedrijf heeft processen die ooit gewoon zo zijn ontstaan.</h2>
        </div>
        <p class="sp-case-closing__list">Papier.<br>Excel.<br>Mail.<br>Software.<br>Mensen die precies weten hoe het moet.</p>
        <p class="sp-case-closing__statement">Wij beginnen met kijken.</p>
        <a class="button button--primary" href="/contact">Wat zouden jullie bij ons zien?</a>
      </section>
    </article>

    ${renderFooter()}
  </main>`;
}
