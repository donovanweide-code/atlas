import "./styles/context-first-experiment.css";
import snapshotText from "../context-first-sources/webuildanddesign.nl.snapshot.json?raw";
import {
  createContextFirstBaselineCandidate,
  createContextFirstCandidate,
  createRouteA,
  mandatoryContextQuestionCount,
  normalizeOrganizationUrl,
  snapshotSupportsUrl,
  type ContextFirstCandidate,
  type ContextSnapshot,
} from "./atlas-context-first-experiment";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("Context-first experiment root is missing.");
const app: HTMLDivElement = appRoot;

const snapshot = JSON.parse(snapshotText) as ContextSnapshot;
const params = new URLSearchParams(window.location.search);
const route = params.get("route") === "A" ? "A" : "B";
const embedded = params.get("embedded") === "1";
const harness = params.get("harness") === "mobile";
const experimentTimestamp = "2026-08-04T04:15:13.8506430+02:00";

interface ExperimentDraft {
  industry: string;
  organizationName: string;
  websiteUrl: string;
}

const draft: ExperimentDraft = {
  industry: "",
  organizationName: "",
  websiteUrl: "",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeUrl(nextRoute: "A" | "B"): string {
  const next = new URL(window.location.href);
  next.search = `?route=${nextRoute}`;
  return `${next.pathname}${next.search}`;
}

function resetView(): void {
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function shell(content: string): string {
  return `
    <div class="experiment-shell">
      <header class="experiment-header">
        <a class="wordmark" href="${routeUrl("B")}" aria-label="We Build And Design — Context-First experiment">
          <span class="wordmark-mark" aria-hidden="true">W</span>
          <span>We Build And Design</span>
        </a>
        <span class="local-badge">Lokaal experiment · geen productie</span>
      </header>
      ${content}
      ${embedded ? "" : `
        <nav class="route-switch" aria-label="Vergelijkingsroutes">
          <a class="${route === "A" ? "is-active" : ""}" href="${routeUrl("A")}">Route A · huidige opening</a>
          <a class="${route === "B" ? "is-active" : ""}" href="${routeUrl("B")}">Route B · context-first</a>
        </nav>
      `}
    </div>
  `;
}

function renderRouteA(): void {
  const current = createRouteA("route-a-local", experimentTimestamp);
  app.innerHTML = shell(`
    <main class="conversation-stage route-a" data-testid="route-a">
      <p class="eyebrow">Huidige algemene opening</p>
      <p class="atlas-line">Atlas vraagt</p>
      <h1>${escapeHtml(current.decision.question ?? "Welke concrete werksituatie bleef bij je hangen?")}</h1>
      <p class="supporting-copy">Neem één moment van vandaag. Je hoeft het nog niet te verklaren.</p>
      <label class="answer-field">
        <span>Wat gebeurde er?</span>
        <textarea rows="5" placeholder="Vertel wat je zag, hoorde of deed."></textarea>
      </label>
      <button class="primary-button" type="button">Samen kijken</button>
      <aside class="route-note">
        <strong>Wat Atlas hier nog niet weet</strong>
        <p>Geen organisatie, geen publiek beeld en geen context voor waarom juist deze vraag nu relevant is.</p>
      </aside>
      <details class="trace-panel">
        <summary>Runtime State · Route A</summary>
        <pre>${escapeHtml(JSON.stringify({
          revision: current.state.revision,
          realityContacts: current.state.realityContacts,
          hypotheses: current.state.hypotheses,
          openUnknowns: current.state.openUnknowns,
          decision: current.decision,
        }, null, 2))}</pre>
      </details>
    </main>
  `);
}

function renderIndustryStep(): void {
  app.innerHTML = shell(`
    <main class="conversation-stage" data-testid="industry-step">
      <p class="eyebrow">Contextmoment 1 van ${mandatoryContextQuestionCount}</p>
      <p class="atlas-line">Laten we niet blind beginnen.</p>
      <h1>In welke branche werken we vandaag?</h1>
      <form id="industry-form" class="single-question">
        <label class="answer-field">
          <span>Branche</span>
          <input id="industry" name="industry" value="${escapeHtml(draft.industry)}" required />
        </label>
        <button class="primary-button" type="submit">Verder</button>
      </form>
      <p class="quiet-boundary">Dit geeft richting zonder al iets over de organisatie aan te nemen.</p>
    </main>
  `);
  const form = document.querySelector<HTMLFormElement>("#industry-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    draft.industry = String(data.get("industry") ?? "").trim();
    if (draft.industry) renderOrganizationStep();
  });
  resetView();
}

function renderOrganizationStep(): void {
  app.innerHTML = shell(`
    <main class="conversation-stage" data-testid="organization-step">
      <p class="eyebrow">Contextmoment 2 van ${mandatoryContextQuestionCount}</p>
      <p class="atlas-line">Dank je. Nu weet ik vanuit welke omgeving we kijken.</p>
      <h1>Voor welke organisatie kijken we vandaag?</h1>
      <form id="organization-form" class="single-question">
        <label class="answer-field">
          <span>Naam van de organisatie</span>
          <input id="organization-name" name="organizationName" autocomplete="organization" value="${escapeHtml(draft.organizationName)}" required />
        </label>
        <button class="primary-button" type="submit">Verder</button>
      </form>
      <p class="quiet-boundary">We gebruiken dit alleen om de eerste vraag minder algemeen te maken.</p>
    </main>
  `);
  const form = document.querySelector<HTMLFormElement>("#organization-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    draft.organizationName = String(data.get("organizationName") ?? "").trim();
    if (draft.organizationName) renderWebsiteStep();
  });
  resetView();
}

function finishContext(): void {
  const normalizedUrl = normalizeOrganizationUrl(draft.websiteUrl);
  if (normalizedUrl && snapshotSupportsUrl(snapshot, normalizedUrl)) {
    renderCandidate(createContextFirstCandidate({
      industry: draft.industry,
      organizationName: draft.organizationName,
      websiteUrl: normalizedUrl,
    }, snapshot, experimentTimestamp));
    return;
  }

  const sourceMessage = draft.websiteUrl
    ? "Ik heb deze website nog niet kunnen observeren. Daarom gebruik ik haar niet als bron en gaan we verder met wat jij hebt gegeven."
    : "Er is nu geen website om te observeren. We gaan verder vanuit de branche en organisatienaam die jij hebt gegeven.";
  renderCandidate(createContextFirstBaselineCandidate({
    industry: draft.industry,
    organizationName: draft.organizationName,
    websiteUrl: draft.websiteUrl,
  }, experimentTimestamp), sourceMessage);
}

function renderWebsiteStep(): void {
  app.innerHTML = shell(`
    <main class="conversation-stage" data-testid="website-step">
      <p class="eyebrow">Aanvullende context · optioneel</p>
      <p class="atlas-line">Als er een website is, kan die een eerste publieke observatie toevoegen.</p>
      <h1>Welke website hoort bij ${escapeHtml(draft.organizationName)}?</h1>
      <form id="website-form" class="single-question">
        <label class="answer-field">
          <span>Website (optioneel)</span>
          <input id="organization-website" name="websiteUrl" inputmode="url" autocomplete="url" placeholder="www.organisatie.nl" value="${escapeHtml(draft.websiteUrl)}" />
        </label>
        <div class="button-row">
          <button class="primary-button" type="submit">Begin het onderzoek</button>
          <button class="text-button" id="skip-website" type="button">Website overslaan</button>
        </div>
      </form>
      <p class="quiet-boundary">De website verrijkt de context wanneer er een gecontroleerde bron is. Zij is nooit een voorwaarde om te beginnen.</p>
    </main>
  `);
  const form = document.querySelector<HTMLFormElement>("#website-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    draft.websiteUrl = String(data.get("websiteUrl") ?? "").trim();
    finishContext();
  });
  document.querySelector<HTMLButtonElement>("#skip-website")?.addEventListener("click", () => {
    draft.websiteUrl = "";
    finishContext();
  });
  resetView();
}

function renderCandidate(candidate: ContextFirstCandidate, sourceMessage = ""): void {
  const participantFacts = candidate.facts.filter(({ sourceStatus }) => sourceStatus === "participant-input");
  const publicFacts = candidate.facts.filter(({ sourceStatus }) => sourceStatus === "public-observation");
  const hasPublicSource = candidate.sourceAvailability === "controlled-public-source" && Boolean(candidate.source);
  app.innerHTML = shell(`
    <main class="conversation-stage observation-stage" data-testid="context-result">
      <p class="eyebrow">Binnen de eerste minuut</p>
      <p class="atlas-line">Dit is mijn voorlopige onderzoekskader, nog geen conclusie.</p>
      <h1>${hasPublicSource
        ? "Er zit een interessant verschil tussen jullie belofte en het eerste gesprek."
        : `We beginnen bij ${escapeHtml(draft.organizationName)} binnen ${escapeHtml(draft.industry)}.`}</h1>
      ${sourceMessage ? `<p class="source-boundary" role="status">${escapeHtml(sourceMessage)}</p>` : ""}

      <section class="source-layers" aria-label="Herkomst van het eerste beeld">
        <article>
          <p class="layer-label participant">Door jou gegeven</p>
          <ul>${participantFacts.map(({ content }) => `<li>${escapeHtml(content)}</li>`).join("")}</ul>
        </article>
        ${hasPublicSource ? `<article>
          <p class="layer-label public">Rechtstreeks publiek zichtbaar</p>
          <ul>${publicFacts.slice(0, 3).map(({ content }) => `<li>${escapeHtml(content)}</li>`).join("")}</ul>
        </article>` : ""}
        <article>
          <p class="layer-label inference">Voorlopig beeld</p>
          <p>${escapeHtml(candidate.provisionalPicture.statement)}</p>
        </article>
        <article>
          <p class="layer-label unknown">Nog onbekend</p>
          <p>${escapeHtml(candidate.unknown.statement)}</p>
        </article>
      </section>

      <div class="distinction">
        <p class="layer-label">Eerste onderscheid</p>
        <p>${escapeHtml(candidate.firstDistinction)}</p>
      </div>

      <section class="first-question" aria-labelledby="first-question-title">
        <p class="atlas-line">Daarom wil ik dit als eerste begrijpen.</p>
        <h2 id="first-question-title">${escapeHtml(candidate.firstQuestion)}</h2>
        <label class="answer-field">
          <span>Wat zie jij gebeuren?</span>
          <textarea rows="4" placeholder="Een concreet moment is genoeg."></textarea>
        </label>
        <div class="button-row">
          <button class="primary-button" type="button">Samen verder kijken</button>
          <button class="text-button" type="button">Eerst dit beeld corrigeren</button>
        </div>
      </section>

      ${hasPublicSource ? `<details class="source-proof">
        <summary>Bronbewijs</summary>
        <dl>
          <div><dt>Publieke bron</dt><dd><a href="${escapeHtml(candidate.source!.canonicalUrl)}">${escapeHtml(candidate.source!.canonicalUrl)}</a></dd></div>
          <div><dt>Vastgelegd</dt><dd>${escapeHtml(candidate.source!.retrievedAt)}</dd></div>
          <div><dt>Homepage SHA-256</dt><dd><code>${escapeHtml(candidate.source!.acquisition.homepageSha256)}</code></dd></div>
          <div><dt>Bundle SHA-256</dt><dd><code>${escapeHtml(candidate.source!.acquisition.bundleSha256)}</code></dd></div>
        </dl>
        <p>Lokale, expliciete snapshot. De kandidaat voert tijdens het gesprek geen verborgen live crawl uit.</p>
      </details>` : ""}

      <details class="trace-panel">
        <summary>Runtime State & Journal · bewijs</summary>
        <pre>${escapeHtml(JSON.stringify(candidate.state, null, 2))}</pre>
      </details>
    </main>
  `);
  resetView();
}

if (harness) document.documentElement.classList.add("mobile-preview");

if (route === "A") {
  renderRouteA();
} else {
  renderIndustryStep();
}
