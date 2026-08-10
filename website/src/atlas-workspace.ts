import "./styles/atlas-workspace.css";
import { atlasWorkspace, getAtlasNavigationItem } from "./workspace-config";
import { renderWorkspaceSidebar } from "./workspace-shell";
import { atlasDailyBrief } from "./atlas-daily-brief";
import { currentWorkstream, wbdProjects } from "./wbd-foundation-data";
import { aquaFlaskProfile } from "./atlas-aquaflask-profile";
import { focusRecommendation } from "./atlas-case-guidance";
import { case0001SnapshotLoad } from "./atlas-case-snapshot-source";
import {
  activateObserving,
  deactivateObserving,
  loadObservationStore,
  loadObservingContext,
  observationStatusLabel,
  reviewObservation,
  type Observation,
} from "./atlas-observations";
import {
  observationOriginLabel,
  observationReviewOutcomes,
  observationReviewTitle,
  observationsNeedingReview,
  observationSourceKindLabel,
  prepareObservationReview,
  type ObservationReviewOutcome,
} from "./atlas-observation-review";
import {
  type CaseId,
  type Idea,
  type IdeaStatus,
  type LogEntry,
  loadAquaFlask,
  loadFocus,
  loadIdeas,
  loadLogs,
  localDateKey,
  save,
  storageKeys,
} from "./atlas-workspace-data";
import {
  type UnderstandingCaseId,
  type UnderstandingItem,
  type UnderstandingKind,
  type UnderstandingRelationshipType,
  type UnderstandingStatus,
  addUnderstandingItem,
  createInsight,
  createNextStep,
  getUnderstandingLineage,
  kindLabel,
  loadUnderstanding,
  relateUnderstandingItems,
  reviseUnderstandingItem,
  saveUnderstanding,
  statusLabel,
  understandingRecommendation,
  understandingEntryKinds,
  understandingKinds,
  understandingStatuses,
} from "./atlas-understanding";
import { bijCeesDeliveryReview, deliveryEvidenceLabel } from "./atlas-delivery-review";
import { confirmedOrientations, orientationStatusLabel } from "./atlas-orientations";
import {
  reviewAuthorityLabels,
  reviewItemTypeLabels,
  type ReviewLayerItem,
  workspaceReviewLayer,
} from "./atlas-review-layer";

const caseNames: Record<Exclude<CaseId, "">, string> = {
  "0001": "We Build And Design",
  "0002": "AquaFlask",
};

const statusLabels: Record<IdeaStatus, string> = {
  seed: "Zaadje",
  growth: "Groei",
  ready: "Klaar om te bouwen",
};

const relationshipLabels: Record<UnderstandingRelationshipType, string> = {
  supports: "ondersteunt",
  questions: "roept deze vraag op",
  "relates-to": "hangt samen met",
  reveals: "maakt zichtbaar",
  justifies: "rechtvaardigt",
  supersedes: "vervangt",
};

const understandingCaseNames: Record<UnderstandingCaseId, string> = {
  "0001": "We Build And Design",
  "0002": "AquaFlask",
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function snapshotDate(value: string): string {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function reviewLayerCard(item: ReviewLayerItem): string {
  return `<article class="workspace-review-item" data-lane="${escapeHtml(item.lane)}" data-authority="${escapeHtml(item.authority)}">
    <header>
      <span>${escapeHtml(reviewItemTypeLabels[item.type])}</span>
      <small>${escapeHtml(item.status)}</small>
    </header>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.why)}</p>
    <dl>
      <div><dt>Gekoppeld aan</dt><dd>${escapeHtml(item.sourceLabel)}</dd></div>
      <div><dt>Voorgestelde beoordeling</dt><dd>${escapeHtml(item.nextReview)}</dd></div>
    </dl>
    <footer>
      <span>${escapeHtml(reviewAuthorityLabels[item.authority])}</span>
      <small>${escapeHtml(item.approval)}</small>
      <code>${escapeHtml(item.sourcePath)}</code>
    </footer>
  </article>`;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compass(): string {
  return `<svg class="workspace-compass" viewBox="0 0 180 180" aria-hidden="true">
    <circle cx="90" cy="90" r="76"/><circle cx="90" cy="90" r="58"/>
    <path class="workspace-compass__route" d="M34 119C54 109 57 83 78 86s22 27 43 14 17-31 31-41"/>
    <path class="workspace-compass__needle" d="M90 37l8 45-8 8-8-8 8-45Z"/>
    <circle class="workspace-compass__point" cx="90" cy="90" r="4"/><text x="90" y="22">N</text>
  </svg>`;
}

function caseOptions(selected: CaseId): string {
  return `<option value="" ${selected === "" ? "selected" : ""}>Geen case</option>
    <option value="0001" ${selected === "0001" ? "selected" : ""}>0001 · We Build And Design</option>
    <option value="0002" ${selected === "0002" ? "selected" : ""}>0002 · AquaFlask</option>`;
}

function understandingKindOptions(
  selected: UnderstandingKind,
  kinds: readonly { id: UnderstandingKind; label: string }[] = understandingKinds,
): string {
  return kinds.map((kind) => `<option value="${kind.id}" ${kind.id === selected ? "selected" : ""}>${kind.label}</option>`).join("");
}

function understandingStatusOptions(selected: UnderstandingStatus): string {
  return understandingStatuses.map((status) => `<option value="${status.id}" ${status.id === selected ? "selected" : ""}>${status.label}</option>`).join("");
}

function renderAtlasFoundationPosition(app: HTMLDivElement): void {
  document.title = "Fundament — Atlas Workspace";
  app.innerHTML = `<main class="atlas-workspace">
    <div class="workspace-shell">
      ${renderWorkspaceSidebar(atlasWorkspace, "fundament")}
      <div class="workspace-main workspace-main--foundation-position">
        <header class="workspace-header"><div><p class="workspace-kicker">Atlas · secundaire route</p><h1>Fundament</h1></div></header>
      </div>
    </div>
  </main>`;
}

function syncAtlasNavigation(app: HTMLDivElement): void {
  const activeId = getAtlasNavigationItem(window.location.pathname, window.location.hash).id;
  app.querySelectorAll<HTMLAnchorElement>("[data-navigation-id]").forEach((link) => {
    const current = link.dataset.navigationId === activeId;
    link.classList.toggle("is-current", current);
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

export function renderAtlasWorkspace(app: HTMLDivElement): void {
  document.documentElement.classList.add("atlas-workspace-mode");
  document.documentElement.lang = "nl";
  document.title = "Atlas Workspace — We Build And Design";

  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = "noindex, nofollow";

  if (window.location.pathname.replace(/\/+$/, "") === "/atlas/fundament") {
    renderAtlasFoundationPosition(app);
    return;
  }

  const today = localDateKey();
  const focusLoad = loadFocus(localStorage, today);
  const aquaLoad = loadAquaFlask(localStorage);
  const ideasLoad = loadIdeas(localStorage);
  const logsLoad = loadLogs(localStorage);
  const understandingLoad = loadUnderstanding(localStorage);
  let observationStore = loadObservationStore(localStorage);
  let observingContext = loadObservingContext(localStorage);
  let focusStore = focusLoad.value;
  let aquaFlask = aquaLoad.value;
  let ideas: Idea[] = ideasLoad.value;
  let logs: LogEntry[] = logsLoad.value;
  const understanding = understandingLoad.value;
  const requestedUnderstandingCase = new URLSearchParams(window.location.search).get("case");
  const requestedUnderstandingItem = new URLSearchParams(window.location.search).get("item") ?? "";
  let activeUnderstandingCase: UnderstandingCaseId = requestedUnderstandingCase === "0002" ? "0002" : "0001";
  const selectedUnderstandingItems = new Set<string>();
  const priorDate = focusStore.activeDate !== today ? focusStore.activeDate : "";
  const priorOpenItems = priorDate ? (focusStore.days[priorDate] ?? []).filter((item) => !item.completed) : [];
  const case0001 = case0001SnapshotLoad.state === "confirmed" ? case0001SnapshotLoad.snapshot : null;
  const case0001Position = case0001?.position.text ?? "Actueel casebeeld vraagt herbevestiging. Atlas geeft voorlopig geen richting.";
  const case0001Status = case0001?.status.label ?? "Herbevestiging nodig";
  const case0001NextStep = case0001?.nextStep.text ?? "Herstel eerst een geldig bevestigd casebeeld; de eerdere briefing wordt niet als waarheid gebruikt.";
  const case0001Uncertainty = case0001?.openUncertainties[0]?.text ?? "Atlas vormt geen nieuwe onzekerheid zonder bevestigd casebeeld.";
  const case0001Boundary = case0001?.evidenceBoundary.join(" ") ?? "Atlas geeft geen inhoudelijk oordeel zolang de herleidbare momentopname ontbreekt.";
  const case0001Sources = case0001?.sources.map((source) => `<li><code>${escapeHtml(source.path)}</code><span>${escapeHtml(source.locator)}</span></li>`).join("") ?? "";
  const orientationCards = confirmedOrientations.map((orientation) => `
    <article class="workspace-orientation-card">
      <header>
        <span>${escapeHtml(orientationStatusLabel(orientation.status))}</span>
        <time datetime="${escapeHtml(orientation.confirmedAt)}">Bevestigd ${escapeHtml(snapshotDate(orientation.confirmedAt))}</time>
      </header>
      <h3>${escapeHtml(orientation.subject)}</h3>
      <blockquote>${escapeHtml(orientation.signal)}</blockquote>
      <div class="workspace-orientation-card__context">
        <div><span>Waarom Atlas dit bewaart</span><p>${escapeHtml(orientation.meaning)}</p></div>
        <div><span>Terugkeertrigger</span><p>${escapeHtml(orientation.returnTrigger)}</p></div>
      </div>
      <footer>
        <p>${orientation.boundaries.map((boundary) => `<span>${escapeHtml(boundary)}</span>`).join("")}</p>
        <small>Beoordelingseigenaar · ${escapeHtml(orientation.reviewOwner)}</small>
        <code>${escapeHtml(orientation.sourcePath)}</code>
      </footer>
    </article>`).join("");
  const orientationSummary = confirmedOrientations.length === 1
    ? "1 bevestigd praktijksignaal wacht op menselijke toewijzing."
    : `${confirmedOrientations.length} bevestigde praktijksignalen wachten op menselijke toewijzing.`;
  const reviewObservationItems: ReviewLayerItem[] = observationStore.observations.filter((observation) => observation.status === "unreviewed").map((observation) => ({
    id: observation.id,
    lane: "review",
    title: observation.text,
    why: `Als observatie vastgelegd bij ‘${observation.context.boundaryLabel}’ en nog niet inhoudelijk beoordeeld.`,
    sourceLabel: `${observation.source.label} · ${observation.context.boundaryLabel}`,
    sourcePath: observation.source.locator,
    type: "observation",
    status: observationStatusLabel(observation.status),
    authority: "review-result",
    nextReview: `${observation.ownership.reviewOwner} beoordeelt welke betekenis deze Waarneming heeft; We Build And Design trekt hier nog geen conclusie.`,
    approval: "Betekenis en vervolg zijn nog niet bevestigd.",
  }));
  const reviewCandidateCards = workspaceReviewLayer.review.map(reviewLayerCard).join("");
  const reviewObservationCards = reviewObservationItems.map(reviewLayerCard).join("");
  const reviewHorizonCards = workspaceReviewLayer.horizon.map(reviewLayerCard).join("");
  const reviewOpenDeliveryItems = workspaceReviewLayer.today.relatedOpenItems
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const pendingReviewCount = workspaceReviewLayer.review.length + reviewObservationItems.length;
  const deliveryEvidenceCards = bijCeesDeliveryReview.realized.map((item) => `
    <article class="workspace-delivery-evidence">
      <header><h4>${escapeHtml(item.title)}</h4><span data-strength="${escapeHtml(item.strength)}">${escapeHtml(deliveryEvidenceLabel(item.strength))}</span></header>
      <p>${escapeHtml(item.finding)}</p>
      <small>${escapeHtml(item.boundary)}</small>
    </article>`).join("");
  const deliveryOpenItems = bijCeesDeliveryReview.openItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const deliveryBlockers = bijCeesDeliveryReview.blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const deliveryUncertainties = bijCeesDeliveryReview.uncertainties.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const deliveryScopeRows = bijCeesDeliveryReview.scopeItems.map((item) => `
    <article class="workspace-delivery-scope-row">
      <header><h5>${escapeHtml(item.title)}</h5><span data-strength="${escapeHtml(item.strength)}">${escapeHtml(deliveryEvidenceLabel(item.strength))}</span></header>
      <div><span>Oorspronkelijk gevraagd</span><p>${escapeHtml(item.originallyRequested)}</p></div>
      <div><span>Aantoonbaar live</span><p>${escapeHtml(item.liveFinding)}</p></div>
      <div><span>Nog open</span><p>${escapeHtml(item.open)}</p></div>
      <div><span>Bewijs voor acceptatie</span><p>${escapeHtml(item.acceptanceEvidence)}</p></div>
    </article>`).join("");
  const deliverySources = bijCeesDeliveryReview.sources.map((source) => source.kind === "live"
    ? `<li><span>${escapeHtml(source.label)}</span><a href="${escapeHtml(source.location)}" target="_blank" rel="noreferrer">${escapeHtml(source.location)}</a></li>`
    : `<li><span>${escapeHtml(source.label)}</span><code>${escapeHtml(source.location)}</code></li>`).join("");
  const dailySilence = atlasDailyBrief.silence.map((item) => `
    <li>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.why)}</span>
    </li>`).join("");
  const dailyHorizon = atlasDailyBrief.horizon.map((item, index) => `
    <article class="daily-horizon-item">
      <span>0${index + 1}</span>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <details class="daily-disclosure">
          <summary><i aria-hidden="true">+</i> Waarom staat dit op Horizon?</summary>
          <p>${escapeHtml(item.trigger)}</p>
        </details>
      </div>
    </article>`).join("");

  app.innerHTML = `<main class="atlas-workspace">
    <div class="workspace-shell">
    ${renderWorkspaceSidebar(atlasWorkspace, getAtlasNavigationItem(window.location.pathname, window.location.hash).id)}

    <div class="workspace-main">
      <section class="daily-opening" id="overzicht" aria-labelledby="daily-title">
        <div class="daily-opening__frame">
          <header class="daily-mast">
            <div class="daily-mast__day">
              <p class="workspace-kicker">Vandaag · ${new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
              <p>Goedemorgen, Donovan.</p>
            </div>
            <div class="daily-status">
              <span aria-hidden="true"></span>
              <div><small>Actieve werkstroom</small><strong>${escapeHtml(atlasDailyBrief.title)}</strong><em>${escapeHtml(atlasDailyBrief.statusLabel)}</em></div>
            </div>
          </header>

          <div class="daily-first-layer">
            <article class="daily-focus" aria-labelledby="daily-title">
              <header class="daily-focus__header">
                <div><p class="workspace-label">Focus · wat vandaag betekenis heeft</p><h1 id="daily-title">${escapeHtml(atlasDailyBrief.focus.title)}</h1></div>
                <div class="daily-focus__compass" aria-hidden="true">${compass()}<span>Richting</span></div>
              </header>
              <p>${escapeHtml(atlasDailyBrief.focus.summary)}</p>
              <div class="daily-focus__boundary"><span>Eerstvolgende betekenisvolle stap</span><p>${escapeHtml(atlasDailyBrief.focus.nextStep)}</p></div>
              <footer>
                <a href="${escapeHtml(atlasDailyBrief.focus.actionHref)}">${escapeHtml(atlasDailyBrief.focus.actionLabel)} <span aria-hidden="true">↓</span></a>
                <details class="daily-disclosure">
                  <summary><i aria-hidden="true">+</i> Waarom verdient dit aandacht?</summary>
                  <div><ul>${atlasDailyBrief.focus.explanation.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></div>
                </details>
              </footer>
            </article>
            <aside class="daily-silence" aria-labelledby="daily-silence-title">
              <p class="workspace-label">Stilte · bewust niet doen</p>
              <h2 id="daily-silence-title">Rust is hier een besluit.</h2>
              <ul>${dailySilence}</ul>
            </aside>
          </div>
          <div hidden>
            <span data-advice-title></span>
            <span data-advice-reason></span>
            <span data-guidance-prepared></span>
            <a data-guidance-action href="/"><span data-guidance-action-label></span></a>
          </div>
        </div>
      </section>
      <div class="workspace-notice" data-notice role="status" aria-live="polite" hidden></div>

      <section class="workspace-position" id="werkelijkheid" aria-labelledby="workspace-position-title">
        <header>
          <div><p class="workspace-label">Werkelijkheid</p><h2 id="workspace-position-title">Atlas en de WBD Workspace tonen dezelfde projectstatus.</h2></div>
          <p>Workspace Sync · GO / Afgerond</p>
        </header>
        <dl>
          <div data-state="completed"><dt>${escapeHtml(wbdProjects[0].id)} · Afgerond</dt><dd>${escapeHtml(wbdProjects[0].latestMilestone)}</dd></div>
          <div data-state="completed"><dt>${escapeHtml(wbdProjects[1].id)} · Afgerond</dt><dd>${escapeHtml(wbdProjects[1].latestMilestone)}</dd></div>
          <div data-state="current"><dt>${escapeHtml(currentWorkstream.title)} · Actief</dt><dd>${escapeHtml(currentWorkstream.summary)}</dd></div>
          <div data-state="next"><dt>${escapeHtml(wbdProjects[2].id)} · Hierna</dt><dd>${escapeHtml(wbdProjects[2].nextValidatedStep)}</dd></div>
        </dl>
        <nav class="workspace-room__routes atlas-reality-routes" aria-label="Werkelijkheid in Atlas">
          <a href="#werkelijkheid"><span>Werkelijkheid</span><strong>Bevestigd actueel beeld</strong><i aria-hidden="true">↓</i></a>
          <a href="#observatie-review"><span>Observaties</span><strong>Nog menselijk beoordelen</strong><i aria-hidden="true">↓</i></a>
          <a href="#praktijkdossiers"><span>Praktijkbronnen</span><strong>Oriëntaties en leveringsbewijs</strong><i aria-hidden="true">↓</i></a>
        </nav>
      </section>

      <section class="workspace-section workspace-observation-review" id="observatie-review" aria-labelledby="observation-review-title">
        <header class="workspace-section__header">
          <div><p class="workspace-label">Werkelijkheid · menselijke beoordeling</p><h2 id="observation-review-title">Welke ontvangen werkelijkheid vraagt nog om menselijk oordeel?</h2></div>
          <p>Een observatie blijft zonder betekenis of kennis totdat jij bewust een beslissing bevestigt.</p>
        </header>
        <div class="observation-review-method" aria-label="Atlas-methode">
          <span>Werkelijkheid</span><i aria-hidden="true">↓</i><strong>Observatie</strong><i aria-hidden="true">↓</i><strong>Menselijke beoordeling</strong><i aria-hidden="true">↓</i><span>Betekenis</span><i aria-hidden="true">↓</i><span>Kennis</span>
        </div>
        <div class="observation-review-queue__status" data-observation-review-status role="status" aria-live="polite"></div>
        <div class="observation-review-queue" data-observation-review-list></div>
      </section>

      <section class="workspace-section daily-horizon" id="daily-horizon" aria-labelledby="daily-horizon-title">
        <header class="workspace-section__header">
          <div><p class="workspace-label">Horizon</p><h2 id="daily-horizon-title">Niet vergeten. Ook niet naar voren halen.</h2></div>
          <p>Een ontwikkeling keert alleen terug wanneer de werkelijkheid daarom vraagt.</p>
        </header>
        <div class="daily-horizon__list">${dailyHorizon}</div>
      </section>

      <section class="workspace-section workspace-review-layer" id="werkbeeld" aria-labelledby="review-layer-title" hidden>
        <header class="workspace-section__header">
          <div><p class="workspace-label">${escapeHtml(workspaceReviewLayer.sender)}</p><h2 id="review-layer-title">Open voor beoordeling.</h2></div>
          <p>Wat we hebben vastgesteld, wat nog openstaat en wat bewust kan wachten.</p>
        </header>

        <div class="workspace-review-summary" aria-label="Actueel werkbeeld">
          <div data-state="decided"><span>Vastgestelde grens</span><strong>${escapeHtml(workspaceReviewLayer.workingBoundary)}</strong></div>
          <div data-state="today"><span>Vandaag</span><strong>1 betekenisvolle actie</strong></div>
          <div data-state="review"><span>Nog beoordelen</span><strong>${pendingReviewCount} ${pendingReviewCount === 1 ? "item" : "items"}</strong></div>
          <div data-state="horizon"><span>Horizon</span><strong>${workspaceReviewLayer.horizon.length} bewust bewaard idee</strong></div>
        </div>

        <article class="workspace-review-today" aria-labelledby="review-today-title">
          <div class="workspace-review-today__marker"><span>Vandaag doen</span><small>Handmatig gekozen uit de bestaande review</small></div>
          <div class="workspace-review-today__content">
            <header><span>${escapeHtml(reviewItemTypeLabels[workspaceReviewLayer.today.type])}</span><small>${escapeHtml(workspaceReviewLayer.today.status)}</small></header>
            <h3 id="review-today-title">${escapeHtml(workspaceReviewLayer.today.title)}</h3>
            <p>${escapeHtml(workspaceReviewLayer.today.why)}</p>
            <dl>
              <div><dt>Gekoppeld aan</dt><dd>${escapeHtml(workspaceReviewLayer.today.sourceLabel)}</dd></div>
              <div><dt>Volgende beoordeling</dt><dd>${escapeHtml(workspaceReviewLayer.today.nextReview)}</dd></div>
            </dl>
            <footer><span>${escapeHtml(reviewAuthorityLabels[workspaceReviewLayer.today.authority])}</span><small>${escapeHtml(workspaceReviewLayer.today.approval)}</small><code>${escapeHtml(workspaceReviewLayer.today.sourcePath)}</code></footer>
            <details>
              <summary>Bekijk alle ${workspaceReviewLayer.today.relatedOpenItems.length} open leveringspunten <i aria-hidden="true">→</i></summary>
              <ol>${reviewOpenDeliveryItems}</ol>
            </details>
          </div>
        </article>

        <section class="workspace-review-pending" aria-labelledby="review-pending-title">
          <header>
            <div><p class="workspace-label">Nog beoordelen</p><h3 id="review-pending-title">Praktijkinzichten zijn nog geen besluiten.</h3></div>
            <p>${reviewObservationItems.length === 0 ? "Geen lokale Waarnemingen wachten op beoordeling." : `${reviewObservationItems.length} lokale ${reviewObservationItems.length === 1 ? "Waarneming wacht" : "Waarnemingen wachten"} op beoordeling.`}</p>
          </header>
          ${reviewObservationItems.length > 0
            ? `<div class="workspace-review-pending__observations"><p class="workspace-review-subtitle">Onbeoordeelde Waarnemingen</p>${reviewObservationCards}</div>`
            : `<div class="workspace-review-empty"><span>0</span><p>Geen onbeoordeelde Waarnemingen in deze browser.</p></div>`}
          <div class="workspace-review-pending__candidates">
            <p class="workspace-review-subtitle">${workspaceReviewLayer.review.length} candidates uit praktijkgebruik</p>
            <div>${reviewCandidateCards}</div>
          </div>
        </section>

        <section class="workspace-review-horizon" aria-labelledby="review-horizon-title">
          <header><div><p class="workspace-label">Horizon</p><h3 id="review-horizon-title">Waardevol, maar nu niet dominant.</h3></div><p>Terugkeer alleen bij een aantoonbare praktijktrigger.</p></header>
          <div>${reviewHorizonCards}</div>
        </section>

        <footer class="workspace-review-signature">
          <strong>${escapeHtml(workspaceReviewLayer.signature)}</strong>
          <span>Ontwerpverkenning · geen definitieve merkbeslissing</span>
          <code>${escapeHtml(workspaceReviewLayer.handoffPath)}</code>
        </footer>
      </section>

      <section class="workspace-section workspace-room" id="werkruimte" aria-labelledby="workspace-room-title">
        <header class="workspace-section__header">
          <div><p class="workspace-label">Werkruimte</p><h2 id="workspace-room-title">Open alleen wat je nodig hebt.</h2></div>
          <p>De volledige Atlas-werkelijkheid blijft beschikbaar, zonder de dagstart te belasten.</p>
        </header>
        <nav class="workspace-room__routes" aria-label="Verdiepende werkruimte">
          <a href="#cases"><span>Cases</span><strong>Werk met betekenis en context</strong><i aria-hidden="true">↓</i></a>
          <a href="#understanding"><span>Understanding</span><strong>Begrens het begrip</strong><i aria-hidden="true">↓</i></a>
          <a href="/workspace/wbd/kennisvoorstellen"><span>Kennisvoorstellen</span><strong>Menselijk beoordelen vóór Knowledge</strong><i aria-hidden="true">↗</i></a>
          <a href="#ideeen"><span>Ideeën</span><strong>Bewaren zonder nu te bouwen</strong><i aria-hidden="true">↓</i></a>
          <a href="#logboek"><span>Logboek</span><strong>Bewaar wat betekenis heeft</strong><i aria-hidden="true">↓</i></a>
        </nav>
      </section>

      <section class="workspace-section workspace-orientation workspace-deep" id="praktijkdossiers" aria-labelledby="orientation-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Praktijkbronnen · Oriëntaties</p><h2 id="orientation-title">De onderbouwing blijft dichtbij.</h2></div><p>${orientationSummary}</p></header>
        <details class="workspace-dossier">
          <summary><span>Open de actuele praktijkbronnen</span><small>Oriëntatie en leveringsbewijs</small><i aria-hidden="true">+</i></summary>
          <div class="workspace-dossier__content">
        <div class="workspace-orientations">${orientationCards}</div>
        <article class="workspace-delivery-review" aria-labelledby="delivery-review-title">
          <header class="workspace-delivery-review__header">
            <div><p class="workspace-label">Leveringsbeeld · ${escapeHtml(snapshotDate(bijCeesDeliveryReview.reviewedAt))}</p><h3 id="delivery-review-title">Grip op wat live is — zonder te vroeg af te tekenen.</h3></div>
            <p><strong>${escapeHtml(bijCeesDeliveryReview.feedback.timing)}</strong><span>${escapeHtml(bijCeesDeliveryReview.feedback.scope)}</span></p>
          </header>

          <section class="workspace-delivery-review__completion" aria-labelledby="delivery-completion-title">
            <p class="workspace-label">Wat aantoonbaar af is</p>
            <h4 id="delivery-completion-title">Formele afronding is nog niet bewezen.</h4>
            <p>${escapeHtml(bijCeesDeliveryReview.formalCompletion)}</p>
          </section>

          <section class="workspace-delivery-review__scope-source" aria-labelledby="delivery-scope-source-title">
            <header><div><p class="workspace-label">Eerste herleidbare scopebron</p><h4 id="delivery-scope-source-title">${escapeHtml(bijCeesDeliveryReview.scopeSource.subject)}</h4></div><span>Bron bevestigd</span></header>
            <p>${escapeHtml(bijCeesDeliveryReview.scopeSource.finding)}</p>
            <footer><time datetime="${escapeHtml(bijCeesDeliveryReview.scopeSource.date)}">${escapeHtml(snapshotDate(bijCeesDeliveryReview.scopeSource.date))}</time><code>${escapeHtml(bijCeesDeliveryReview.scopeSource.sourcePath)}</code><small>${escapeHtml(bijCeesDeliveryReview.scopeSource.boundary)}</small></footer>
          </section>

          <section class="workspace-delivery-review__scope" aria-labelledby="delivery-scope-title">
            <header><p class="workspace-label">Scope tegenover werkelijkheid</p><h4 id="delivery-scope-title">Per genoemd onderdeel — zonder acceptatie te veronderstellen.</h4></header>
            <div>${deliveryScopeRows}</div>
          </section>

          <section class="workspace-delivery-review__realized" aria-labelledby="delivery-realized-title">
            <header><p class="workspace-label">Aantoonbaar gerealiseerd</p><h4 id="delivery-realized-title">Live gezien, met een expliciete bewijsgrens.</h4></header>
            <div>${deliveryEvidenceCards}</div>
          </section>

          <div class="workspace-delivery-review__questions">
            <section aria-labelledby="delivery-open-title"><p class="workspace-label">Wat openstaat</p><h4 id="delivery-open-title">${bijCeesDeliveryReview.openItems.length} gerichte controles</h4><ol>${deliveryOpenItems}</ol></section>
            <section aria-labelledby="delivery-blockers-title"><p class="workspace-label">Wat oplevering blokkeert</p><h4 id="delivery-blockers-title">${bijCeesDeliveryReview.blockers.length} beslissende grenzen</h4><ul>${deliveryBlockers}</ul></section>
            <section aria-labelledby="delivery-uncertainties-title"><p class="workspace-label">Eerst onderzoeken</p><h4 id="delivery-uncertainties-title">${bijCeesDeliveryReview.uncertainties.length} onzekerheden</h4><ul>${deliveryUncertainties}</ul></section>
          </div>

          <section class="workspace-delivery-review__feedback" aria-labelledby="delivery-feedback-title">
            <div><p class="workspace-label">Volgende betrouwbare terugkoppeling</p><h4 id="delivery-feedback-title">${escapeHtml(bijCeesDeliveryReview.feedback.timing)} — als voortgangsupdate.</h4></div>
            <div><p>${escapeHtml(bijCeesDeliveryReview.feedback.message)}</p><small><strong>Opleverdatum:</strong> ${escapeHtml(bijCeesDeliveryReview.feedback.completionDate)}</small></div>
          </section>

          <details class="workspace-delivery-review__sources">
            <summary>Bekijk ${bijCeesDeliveryReview.sources.length} onderzochte bronnen <i aria-hidden="true">→</i></summary>
            <ul>${deliverySources}</ul>
          </details>
        </article>
          </div>
        </details>
      </section>

      <section class="workspace-section workspace-observing" id="waarnemen" aria-labelledby="observing-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Broncapture · secundair</p><h2 id="observing-title">Waarnemen begint bij het oppervlak.</h2></div><p data-observing-summary></p></header>
        <div class="workspace-observing__control">
          <div class="workspace-observing__state">
            <span data-observing-indicator aria-hidden="true"></span>
            <div><p data-observing-status></p><small>Alleen actief in deze browser</small></div>
          </div>
          <dl><div><dt>Bron</dt><dd data-observing-source></dd></div><div><dt>Beoordeling</dt><dd>Menselijk · Atlas Werkelijkheid</dd></div></dl>
          <form data-observing-form>
            <button type="submit" data-observing-start>Activeer Waarnemen</button>
          </form>
          <div class="workspace-observing__actions">
            <a href="/" data-observing-open>Open publieke website <span aria-hidden="true">↗</span></a>
            <button type="button" data-observing-stop>Beëindig Waarnemen</button>
          </div>
        </div>
        <div class="workspace-observations" aria-labelledby="observations-title">
          <header><div><p class="workspace-label">Bron en context bewaard</p><h3 id="observations-title">Observaties</h3></div><p>Betekenis en vervolg ontstaan pas na menselijke beoordeling.</p></header>
          <div data-observation-list></div>
        </div>
      </section>

      <section class="workspace-section workspace-focus" id="focus" aria-labelledby="focus-title" hidden>
        <header class="workspace-section__header"><div><p class="workspace-label">Atlas heeft afgewogen</p><h2 id="focus-title" data-today-decision></h2></div><p data-today-reason></p></header>
        <a class="workspace-screen-action" data-today-action href="/"><strong data-today-action-label></strong><i aria-hidden="true">→</i></a>
        <details class="workspace-screen-tools" data-focus-tools>
          <summary><span>Dag organiseren</span><small data-focus-count></small></summary>
          <div class="workspace-focus__list" data-focus-list></div>
          <form class="workspace-focus-form" data-focus-form>
            <label>Nieuwe stap<input name="text" required maxlength="160" placeholder="Wat verdient vandaag aandacht?"></label>
            <label>Case<select name="caseId">${caseOptions("")}</select></label>
            <button type="submit">Voeg toe</button>
          </form>
          <details class="workspace-history"><summary>Eerdere dagen</summary><div data-focus-history></div></details>
        </details>
      </section>

      <section class="workspace-section" id="cases" aria-labelledby="cases-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Cases</p><h2 id="cases-title">Werk met betekenis en context.</h2></div><p>De hoofdcase bewijst Atlas. De klantcase laat Atlas leren.</p></header>
        <div class="workspace-cases">
          <article class="workspace-case workspace-case--primary"><div class="workspace-case__meta"><span>0001 · Hoofdcase</span><small>${escapeHtml(case0001Status)}</small></div><h3>We Build And Design</h3>
            <p>${escapeHtml(case0001Position)}</p><footer><span>Volgende stap</span><strong>${escapeHtml(case0001NextStep)}</strong><button type="button" data-open-wbd aria-controls="case-wbd" aria-expanded="false">${case0001 ? "Open bevestigd casebeeld" : "Bekijk Case 0001"} <i aria-hidden="true">→</i></button></footer></article>
          <article class="workspace-case workspace-case--open" data-open-aqua role="button" tabindex="0" aria-controls="case-aquaflask" aria-expanded="false"><div class="workspace-case__meta"><span>0002 · Klant</span><small>Oorzaak open</small></div><h3>AquaFlask</h3>
            <p>Atlas kent de bestaande WooCommerce-omgeving, het onderzochte productincident en het verhoogde wijzigingsrisico.</p><footer><span>Onderzoek · 18 juli 2026</span><strong>Bekijk het bedrijfsprofiel <i aria-hidden="true">→</i></strong></footer></article>
        </div>
      </section>

      <section class="workspace-section workspace-case-detail workspace-wbd-brief" id="case-wbd" aria-labelledby="wbd-brief-title" tabindex="-1" hidden>
        <header class="wbd-brief-hero">
          <div><p class="workspace-label">Case 0001 · Redactioneel bevestigd casebeeld</p><h2 id="wbd-brief-title">${escapeHtml(case0001?.priority.text ?? "Actueel casebeeld vraagt herbevestiging.")}</h2></div>
          <p>${escapeHtml(case0001 ? "Atlas toont revision " + case0001.revision + ": één bewust bevestigde werkelijkheid, geen live kopie van de repository." : "Atlas toont geen eerdere briefing als actuele waarheid.")}</p>
          <button type="button" data-close-wbd aria-label="Sluit briefing van We Build And Design">Sluit briefing</button>
        </header>
        <div class="wbd-brief-grid">
          <article class="wbd-brief-card wbd-brief-card--focus"><p class="workspace-label">Positie · Laatst bevestigd</p><h3>Waar Case 0001 nu staat</h3><p>${escapeHtml(case0001Position)}</p></article>
          <article class="wbd-brief-card"><p class="workspace-label">Betekenis</p><h3>Wat Atlas hierin ziet</h3><p>${escapeHtml(case0001?.meaning.text ?? case0001Boundary)}</p></article>
          <article class="wbd-brief-card wbd-brief-card--test"><p class="workspace-label">Direct bruikbare volgende stap</p><h3>${escapeHtml(case0001?.status.label ?? "Eerst het casebeeld herstellen")}</h3><p>${escapeHtml(case0001NextStep)}</p></article>
          <article class="wbd-brief-card"><p class="workspace-label">Open onzekerheid</p><h3>Wat het besluit nog kan verfijnen</h3><p>${escapeHtml(case0001Uncertainty)}</p></article>
          <article class="wbd-brief-card wbd-brief-card--silence"><p class="workspace-label">Bewijsgrens · Bewuste Stilte</p><h3>Wat Atlas niet als zelfstandig geverifieerd presenteert</h3><p>${escapeHtml(case0001Boundary)}</p></article>
        </div>
        <footer class="wbd-brief-footer"><div class="wbd-brief-provenance">${case0001 ? `<p><span>Revision</span>${case0001.revision} · bevestigd ${escapeHtml(snapshotDate(case0001.lastConfirmedAt))} · redactioneel bevestigd</p><p><span>Eigenaarschap</span>Atlas stelt samen · Donovan bevestigt · Codex borgt</p><details><summary>${case0001.sources.length} herleidbare bronnen</summary><ul>${case0001Sources}</ul></details>` : '<p><span>Status</span>Geen geldige Confirmed revision beschikbaar</p>'}</div><button type="button" data-open-wbd-understanding>Bekijk Understanding <i aria-hidden="true">↓</i></button></footer>
      </section>

      <section class="workspace-section workspace-case-detail workspace-aqua-profile" id="case-aquaflask" aria-labelledby="aqua-title" tabindex="-1" hidden>
        <header class="aqua-profile-hero">
          <div><p class="workspace-label">Relatie 0002 · Bedrijfsprofiel</p><h2 id="aqua-title">AquaFlask</h2><p class="aqua-profile-hero__lead">${escapeHtml(aquaFlaskProfile.relationshipSummary)}</p></div>
          <div class="aqua-profile-source"><span>Bronbeeld</span><p>${escapeHtml(aquaFlaskProfile.source)}</p><small>Momentopname, geen live waarheid</small></div>
          <button type="button" data-close-aqua aria-label="Sluit AquaFlask-profiel">Sluit profiel</button>
        </header>

        <article class="aqua-current-case" aria-labelledby="aqua-current-title">
          <div><p class="workspace-label">${escapeHtml(aquaFlaskProfile.currentCase.label)}</p><h3 id="aqua-current-title">${escapeHtml(aquaFlaskProfile.currentCase.title)}</h3></div>
          <p>${escapeHtml(aquaFlaskProfile.currentCase.summary)}</p>
        </article>

        <div class="aqua-profile-knowledge">
          <section aria-labelledby="aqua-knows-title"><p class="workspace-label">Blijvende klantkennis</p><h3 id="aqua-knows-title">Wat Atlas weet</h3><ul>${aquaFlaskProfile.durableKnowledge.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
          <section class="aqua-profile-unknown" aria-labelledby="aqua-unknown-title"><p class="workspace-label">Bewust open</p><h3 id="aqua-unknown-title">Wat Atlas nog niet weet</h3><ul>${aquaFlaskProfile.unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
        </div>

        <div class="aqua-profile-perspectives">
          <section aria-labelledby="aqua-risks-title"><p class="workspace-label">Bekende risico's</p><h3 id="aqua-risks-title">Voorzichtigheid heeft hier een reden.</h3>${aquaFlaskProfile.risks.map((risk) => `<article><h4>${escapeHtml(risk.title)}</h4><p>${escapeHtml(risk.meaning)}</p></article>`).join("")}</section>
          <section aria-labelledby="aqua-opportunities-title"><p class="workspace-label">Kansen buiten de actieve case</p><h3 id="aqua-opportunities-title">Waardevol, maar niet de huidige vraag.</h3><ul>${aquaFlaskProfile.opportunities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p class="aqua-opportunity-note">Deze kansen nemen de productmelding niet over. Ze verdienen pas een eigen keuze wanneer bewijs en prioriteit samenkomen.</p></section>
        </div>

        <section class="aqua-next-step" aria-labelledby="aqua-next-title"><div><p class="workspace-label">Eerstvolgende betekenisvolle stap</p><h3 id="aqua-next-title">${escapeHtml(aquaFlaskProfile.recommendation.title)}</h3><p>${escapeHtml(aquaFlaskProfile.recommendation.summary)}</p></div><div><span>Leg dan direct vast</span><ul>${aquaFlaskProfile.recommendation.capture.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></section>

        <details class="aqua-work-notes"><summary><span>Werknotities</span><small>Lokaal in deze browser · laatst bijgewerkt: <span data-aqua-activity-detail>Nog niet bijgewerkt</span></small></summary>
          <form class="workspace-case-form" data-aqua-form>
            <label>Actuele formulering<textarea name="problem" rows="3" maxlength="1200" placeholder="Alleen aanpassen wanneer nieuwe klantinformatie het beeld verandert."></textarea></label>
            <label>Volgende vraag<input name="nextQuestion" maxlength="240"></label>
            <label>Volgende stap<input name="nextStep" maxlength="240"></label>
            <label>Notities<textarea name="notes" rows="5" maxlength="2400"></textarea></label>
            <label>Lessen<textarea name="lessons" rows="4" maxlength="1600" placeholder="Welke bewezen les blijft bruikbaar zonder de oplossing te kopiëren?"></textarea></label>
            <div><button type="submit">Bewaar werknotities</button><small>Gebruik geen vertrouwelijke gegevens.</small></div>
          </form>
        </details>
      </section>

      <section class="workspace-section workspace-understanding" id="understanding" aria-labelledby="understanding-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Atlas begrenst het begrip</p><h2 id="understanding-title" data-understanding-decision></h2></div><p data-understanding-reason></p></header>
        <details class="workspace-screen-tools" data-understanding-tools>
          <summary><span>Bekijk de onderbouwing en werk verder</span><i aria-hidden="true">→</i></summary>
          <div class="understanding-case-tabs" role="tablist" aria-label="Kies een case">
          <button type="button" class="is-current" data-understanding-case="0001" role="tab" aria-selected="true">0001 · We Build And Design</button>
          <button type="button" data-understanding-case="0002" role="tab" aria-selected="false">0002 · AquaFlask</button>
        </div>
        <div class="understanding-context" data-understanding-context></div>
        <div class="understanding-layout">
          <div class="understanding-canvas">
            <div class="understanding-filters">
              <label>Zoek<input type="search" data-understanding-search placeholder="Zoek in waarnemingen, vragen en bronnen"></label>
              <label>Soort<select data-understanding-kind-filter><option value="">Alles</option>${understandingKinds.map((kind) => `<option value="${kind.id}">${kind.label}</option>`).join("")}</select></label>
              <label>Status<select data-understanding-status-filter><option value="">Alle statussen</option>${understandingStatuses.map((status) => `<option value="${status.id}">${status.label}</option>`).join("")}</select></label>
            </div>
            <div class="understanding-selection" data-understanding-selection hidden><span data-understanding-selected>0 geselecteerd</span><button type="button" data-start-insight>Vorm een inzicht</button></div>
            <div class="understanding-list" data-understanding-list></div>
          </div>
          <aside class="understanding-composer" aria-label="Voeg begrip toe">
            <p class="workspace-label">Vastleggen zonder conclusie</p><h3>Wat heb je gezien, gehoord of nog niet begrepen?</h3>
            <form data-understanding-form>
              <label>Soort<select name="kind">${understandingKindOptions("source", understandingEntryKinds)}</select></label>
              <label>Inhoud<textarea name="text" required maxlength="1600" rows="4" placeholder="Beschrijf zo concreet mogelijk, zonder de oplossing alvast in te vullen."></textarea></label>
              <label>Herkomst<input name="sourceLabel" maxlength="240" placeholder="Gesprek, document, observatie of link"></label>
              <div class="understanding-form-row"><label>Status<select name="status">${understandingStatusOptions("observed")}</select></label><label>Onzekerheid<select name="uncertainty"><option value="low">Laag</option><option value="medium" selected>Middel</option><option value="high">Hoog</option></select></label></div>
              <label>Relateer aan<select name="relatedTo"><option value="">Nog niet relateren</option></select></label>
              <label>Relatie<select name="relationshipType">${Object.entries(relationshipLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
              <button type="submit">Bewaar in Understanding</button>
            </form>
            <details class="understanding-relate"><summary>Leg een relatie tussen bestaand materiaal</summary><form data-relationship-form><label>Van<select name="fromId" required></select></label><label>Relatie<select name="type">${Object.entries(relationshipLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Naar<select name="toId" required></select></label><button type="submit">Bevestig relatie</button><small>Relaties worden alleen na jouw bevestiging vastgelegd.</small></form></details>
            <form class="understanding-derived-form" data-insight-form hidden><p class="workspace-label">Menselijke duiding</p><h3 id="understanding-insight-label">Welk inzicht ontstaat uit de selectie?</h3><textarea name="text" aria-labelledby="understanding-insight-label" required maxlength="1600" rows="4"></textarea><div><button type="submit">Bewaar herleidbaar inzicht</button><button type="button" data-cancel-insight>Annuleren</button></div></form>
            <form class="understanding-derived-form" data-next-step-form hidden><p class="workspace-label">Van inzicht naar handelen</p><h3 id="understanding-next-step-label">Welke kleine volgende stap wordt hierdoor gerechtvaardigd?</h3><input type="hidden" name="insightId"><textarea name="text" aria-labelledby="understanding-next-step-label" required maxlength="1600" rows="3"></textarea><div><button type="submit">Bewaar volgende stap</button><button type="button" data-cancel-next-step>Annuleren</button></div></form>
          </aside>
          </div>
        </details>
      </section>

      <section class="workspace-section" id="ideeen" aria-labelledby="ideas-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Ideeën</p><h2 id="ideas-title">Bewaren zonder nu te bouwen.</h2></div><button class="workspace-action" type="button" data-open-idea>Nieuw idee</button></header>
        <div class="workspace-ideas" data-idea-list></div>
        <form class="workspace-form" data-idea-form hidden><label>Idee<input name="title" required maxlength="80" placeholder="Wat wil je bewaren?"></label><label>Status<select name="status"><option value="seed">Zaadje</option><option value="growth">Groei</option><option value="ready">Klaar om te bouwen</option></select></label><div><button type="submit">Bewaar</button><button type="button" data-cancel-idea>Annuleren</button></div></form>
      </section>

      <section class="workspace-section" id="logboek" aria-labelledby="log-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Atlas Logboek</p><h2 id="log-title">Bewaar wat betekenis heeft.</h2></div><p>Beslissing, les, succes of momentum.</p></header>
        <form class="workspace-log-form" data-log-form><label for="log-entry">Wat moet Atlas onthouden?</label><textarea id="log-entry" name="entry" required maxlength="360" rows="3" placeholder="Vandaag werd duidelijk dat…"></textarea><button type="submit">Voeg toe</button></form><div class="workspace-log-list" data-log-list></div>
      </section>
    </div>
    </div>

    <dialog class="observation-review-dialog" data-observation-review-dialog aria-labelledby="observation-review-dialog-title">
      <div class="observation-review-dialog__shell">
        <header class="observation-review-dialog__header">
          <div><p class="workspace-label">Observatiedetail</p><h2 id="observation-review-dialog-title">Menselijke beoordeling</h2></div>
          <button type="button" data-observation-review-close aria-label="Sluit observatiedetail">Sluiten</button>
        </header>
        <div data-observation-review-detail></div>
        <form class="observation-review-form" data-observation-review-form>
          <input type="hidden" name="observationId">
          <fieldset>
            <legend>Welke menselijke beslissing past?</legend>
            <p>Een keuze verandert nog niets. Pas de bevestigingsknop legt het besluit vast.</p>
            <div class="observation-review-options">
              ${observationReviewOutcomes.map((outcome, index) => `<label><input type="radio" name="status" value="${outcome.id}" ${index === 0 ? "required" : ""}><span><strong>${escapeHtml(outcome.label)}</strong><small>${escapeHtml(outcome.description)}</small></span></label>`).join("")}
            </div>
          </fieldset>
          <div class="observation-review-form__fields">
            <label>Beoordelaar<input name="reviewedBy" required maxlength="120" autocomplete="name" placeholder="Wie neemt dit besluit?"></label>
            <label>Motivering<textarea name="rationale" required maxlength="800" rows="4" placeholder="Waarom past deze uitkomst bij de bron en context?"></textarea></label>
            <label data-observation-review-case hidden>Koppel aan Case<select name="caseId"><option value="">Kies een bestaande Case</option><option value="0001">0001 · We Build And Design</option><option value="0002">0002 · AquaFlask</option></select></label>
            <label data-observation-review-trigger hidden>Terugkeertrigger<input name="returnTrigger" maxlength="240" placeholder="Wanneer verdient dit opnieuw aandacht?"></label>
          </div>
          <p class="observation-review-form__error" data-observation-review-error role="alert" hidden></p>
          <p class="observation-review-form__boundary">Deze beoordeling maakt geen kennisvoorstel en publiceert niets.</p>
          <div class="observation-review-form__actions">
            <button type="submit">Bevestig menselijke beoordeling</button>
            <button type="button" data-observation-review-cancel>Annuleren</button>
          </div>
        </form>
        <section class="observation-review-complete" data-observation-review-complete aria-live="polite" hidden>
          <p class="workspace-label">Beoordeling bewaard</p>
          <h3>De observatie heeft een menselijke uitkomst.</h3>
          <p>Bron, context en eerdere historie blijven behouden. Er is geen kennis gevormd.</p>
          <button type="button" data-observation-review-done>Sluit en ga terug naar de wachtrij</button>
        </section>
      </div>
    </dialog>
    <dialog class="workspace-revision" data-revision-dialog><form data-revision-form><input type="hidden" name="itemId"><p class="workspace-label">Interpretatie verfijnen</p><h2>Bewaar de eerdere betekenis.</h2><label>Inhoud<textarea name="text" required maxlength="1600" rows="5"></textarea></label><div class="understanding-form-row"><label>Soort<select name="kind">${understandingKindOptions("observation")}</select></label><label>Status<select name="status">${understandingStatusOptions("observed")}</select></label></div><label>Reden voor wijziging<input name="reason" required maxlength="240" placeholder="Wat is er geleerd of opnieuw geclassificeerd?"></label><div><button type="submit">Bewaar revisie</button><button type="button" data-close-revision>Annuleren</button></div></form></dialog>
    <dialog class="workspace-day-start" data-day-start><form method="dialog"><p class="workspace-label">Nieuwe werkdag</p><h2>Hoe wil je vandaag beginnen?</h2><p>Gisteren bleven ${priorOpenItems.length} ${priorOpenItems.length === 1 ? "stap" : "stappen"} openstaan. Niets wordt stilzwijgend meegenomen.</p><div><button value="carry" ${priorOpenItems.length ? "" : "disabled"}>Neem onafgeronde stappen over</button><button value="empty">Begin leeg</button></div></form></dialog>
  </main>`;

  const workspaceMain = app.querySelector<HTMLElement>(".workspace-main")!;
  const horizonSection = app.querySelector<HTMLElement>("#daily-horizon")!;
  const practiceSourcesSection = app.querySelector<HTMLElement>("#praktijkdossiers")!;
  const observingSection = app.querySelector<HTMLElement>("#waarnemen")!;
  const logbookSection = app.querySelector<HTMLElement>("#logboek")!;
  practiceSourcesSection.dataset.atlasArea = "werkelijkheid";
  horizonSection.before(practiceSourcesSection);
  observingSection.dataset.atlasArea = "secundair";
  logbookSection.after(observingSection);
  workspaceMain.querySelectorAll<HTMLElement>("#werkelijkheid,#observatie-review").forEach((section) => { section.dataset.atlasArea = "werkelijkheid"; });
  workspaceMain.querySelectorAll<HTMLElement>("#werkruimte,#cases,#case-wbd,#case-aquaflask,#understanding,#ideeen,#logboek").forEach((section) => { section.dataset.atlasArea = "werkruimte"; });
  syncAtlasNavigation(app);
  window.addEventListener("hashchange", () => syncAtlasNavigation(app));

  const notice = app.querySelector<HTMLElement>("[data-notice]")!;
  const notify = (message: string, error = false) => {
    notice.textContent = message; notice.hidden = false; notice.classList.toggle("is-error", error);
    window.setTimeout(() => { notice.hidden = true; }, 3200);
  };
  const currentItems = () => focusStore.days[today] ??= [];
  const adviceTitle = app.querySelector<HTMLElement>("[data-advice-title]")!;
  const adviceReason = app.querySelector<HTMLElement>("[data-advice-reason]")!;
  const guidanceAction = app.querySelector<HTMLAnchorElement>("[data-guidance-action]")!;
  const guidanceActionLabel = app.querySelector<HTMLElement>("[data-guidance-action-label]")!;
  const guidancePrepared = app.querySelector<HTMLElement>("[data-guidance-prepared]")!;
  const todayDecision = app.querySelector<HTMLElement>("[data-today-decision]")!;
  const todayReason = app.querySelector<HTMLElement>("[data-today-reason]")!;
  const todayAction = app.querySelector<HTMLAnchorElement>("[data-today-action]")!;
  const todayActionLabel = app.querySelector<HTMLElement>("[data-today-action-label]")!;
  const focusTools = app.querySelector<HTMLDetailsElement>("[data-focus-tools]")!;
  let adviceKind: ReturnType<typeof focusRecommendation>["kind"] = "wbd-unavailable";
  const paintAdvice = () => {
    const advice = focusRecommendation(currentItems(), aquaFlask, case0001SnapshotLoad);
    adviceKind = advice.kind;
    adviceTitle.textContent = advice.title;
    adviceReason.textContent = advice.reason;
    todayDecision.textContent = advice.title;
    todayReason.textContent = advice.reason;
    if (advice.kind === "day-focus") {
      guidanceAction.href = "#focus";
      guidanceActionLabel.textContent = "Open je eerste stap";
      guidancePrepared.textContent = advice.prepared;
      todayAction.href = "#focus";
      todayActionLabel.textContent = "Begin met deze stap";
      return;
    }
    if (advice.kind === "aquaflask") {
      guidanceAction.href = "#cases";
      guidanceActionLabel.textContent = "Open AquaFlask";
      guidancePrepared.textContent = advice.prepared;
      todayAction.href = "#cases";
      todayActionLabel.textContent = "Open AquaFlask";
      return;
    }
    guidanceAction.href = "#cases";
    guidanceActionLabel.textContent = advice.kind === "wbd-snapshot"
      ? "Open het bevestigde casebeeld"
      : "Bekijk Case 0001";
    todayAction.href = "#cases";
    todayActionLabel.textContent = guidanceActionLabel.textContent;
    guidancePrepared.textContent = advice.prepared;
  };
  const observingForm = app.querySelector<HTMLFormElement>("[data-observing-form]")!;
  const observingStart = app.querySelector<HTMLButtonElement>("[data-observing-start]")!;
  const observingStop = app.querySelector<HTMLButtonElement>("[data-observing-stop]")!;
  const observingOpen = app.querySelector<HTMLAnchorElement>("[data-observing-open]")!;
  const observingStatus = app.querySelector<HTMLElement>("[data-observing-status]")!;
  const observingSource = app.querySelector<HTMLElement>("[data-observing-source]")!;
  const observingIndicator = app.querySelector<HTMLElement>("[data-observing-indicator]")!;
  const observingSummary = app.querySelector<HTMLElement>("[data-observing-summary]")!;
  const observationList = app.querySelector<HTMLElement>("[data-observation-list]")!;

  const observationMoment = (observation: Observation) => new Intl.DateTimeFormat("nl-NL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(observation.createdAt));

  const observationReviewStatus = app.querySelector<HTMLElement>("[data-observation-review-status]")!;
  const observationReviewList = app.querySelector<HTMLElement>("[data-observation-review-list]")!;
  const observationReviewDialog = app.querySelector<HTMLDialogElement>("[data-observation-review-dialog]")!;
  const observationReviewDetail = app.querySelector<HTMLElement>("[data-observation-review-detail]")!;
  const observationReviewForm = app.querySelector<HTMLFormElement>("[data-observation-review-form]")!;
  const observationReviewComplete = app.querySelector<HTMLElement>("[data-observation-review-complete]")!;
  const observationReviewError = app.querySelector<HTMLElement>("[data-observation-review-error]")!;
  const observationReviewCase = app.querySelector<HTMLElement>("[data-observation-review-case]")!;
  const observationReviewTrigger = app.querySelector<HTMLElement>("[data-observation-review-trigger]")!;

  const observationHistory = (observation: Observation) => observation.history.map((entry) => `<li>
    <div><strong>${escapeHtml(observationStatusLabel(entry.to))}</strong><time datetime="${escapeHtml(entry.at)}">${escapeHtml(observationMoment({ ...observation, createdAt: entry.at }))}</time></div>
    <p>${escapeHtml(entry.rationale)}</p>
    <small>${entry.confirmedByHuman ? `Menselijk bevestigd door ${escapeHtml(entry.actor)}` : `Vastgelegd door ${escapeHtml(entry.actor)}`}</small>
  </li>`).join("");

  const observationReferences = (observation: Observation) => observation.supportingFiles.length
    ? `<ul>${observation.supportingFiles.map((file) => `<li><span>${escapeHtml(file.kind)}</span><strong>${escapeHtml(file.label)}</strong><code>${escapeHtml(file.reference)}</code></li>`).join("")}</ul>`
    : '<p>Geen aanvullende bronreferenties vastgelegd.</p>';

  const observationRelations = (observation: Observation) => {
    const layerLabels = { case: "Case", understanding: "Understanding", knowledge: "Knowledge" } as const;
    return observation.relations.length
      ? `<ul>${observation.relations.map((relation) => `<li>
          <div><span>${escapeHtml(layerLabels[relation.layer])}</span><strong>${escapeHtml(relation.targetId)}</strong></div>
          <p>${escapeHtml(relation.rationale)}</p>
          <small>Menselijk bevestigd door ${escapeHtml(relation.linkedBy)} · <time datetime="${escapeHtml(relation.linkedAt)}">${escapeHtml(observationMoment({ ...observation, createdAt: relation.linkedAt }))}</time></small>
        </li>`).join("")}</ul>`
      : '<p>Er zijn nog geen menselijk bevestigde relaties.</p>';
  };

  const renderObservationReviewDetail = (observation: Observation) => `<article class="observation-review-detail">
    <header><span>${escapeHtml(observationStatusLabel(observation.status))}</span><time datetime="${escapeHtml(observation.createdAt)}">${escapeHtml(observationMoment(observation))}</time></header>
    <blockquote>${escapeHtml(observation.text)}</blockquote>
    <p class="observation-review-detail__boundary">Dit is een observatie. Betekenis en kennis volgen alleen uit afzonderlijke menselijke beslissingen.</p>
    <dl>
      <div><dt>Bronsoort</dt><dd>${escapeHtml(observationSourceKindLabel(observation))}</dd></div>
      <div><dt>Herkomst</dt><dd>${escapeHtml(observationOriginLabel(observation))}</dd></div>
      <div><dt>Bron</dt><dd>${escapeHtml(observation.source.label)}</dd></div>
      <div><dt>Oppervlak</dt><dd>${escapeHtml(observation.context.pageLabel)}</dd></div>
      <div><dt>Context</dt><dd>${escapeHtml(observation.context.boundaryLabel)}</dd></div>
      <div><dt>Revieweigenaar</dt><dd>${escapeHtml(observation.ownership.reviewOwner)}</dd></div>
      <div><dt>Oorspronkelijke route</dt><dd><code>${escapeHtml(observation.source.locator)}</code></dd></div>
      <div><dt>Viewport</dt><dd>${observation.context.viewport ? `${observation.context.viewport.width} × ${observation.context.viewport.height} px` : "Niet van toepassing"}</dd></div>
    </dl>
    ${observation.legacyContext ? `<section class="observation-review-detail__legacy"><h3>Historische context</h3><p>Deze bestaande observatie bewaart haar vroegere ontwikkelcontext zonder die als actuele toewijzing te behandelen.</p><dl><div><dt>Voormalige Case</dt><dd>${escapeHtml(observation.legacyContext.caseId ?? "Niet vastgelegd")}</dd></div><div><dt>Voormalige sprint</dt><dd>${escapeHtml(observation.legacyContext.sprintId ?? "Niet vastgelegd")}</dd></div></dl></section>` : ""}
    <section class="observation-review-detail__relations"><h3>Menselijk bevestigde relaties</h3>${observationRelations(observation)}</section>
    <section class="observation-review-detail__references"><h3>Bronreferenties</h3>${observationReferences(observation)}</section>
    <details class="observation-review-detail__history" open><summary>Volledige geschiedenis · ${observation.history.length} ${observation.history.length === 1 ? "moment" : "momenten"}</summary><ol>${observationHistory(observation)}</ol></details>
  </article>`;

  const paintObservationReviewQueue = () => {
    observationStore = loadObservationStore(localStorage);
    const pending = observationsNeedingReview(observationStore);
    observationReviewStatus.textContent = pending.length
      ? `${pending.length} ${pending.length === 1 ? "observatie vraagt" : "observaties vragen"} om menselijke beoordeling.`
      : "Er zijn momenteel geen observaties die om jouw beoordeling vragen.";
    observationReviewList.innerHTML = pending.length
      ? pending.map((observation) => `<article class="observation-review-card">
          <div class="observation-review-card__main">
            <header><span>${escapeHtml(observationStatusLabel(observation.status))}</span><time datetime="${escapeHtml(observation.createdAt)}">${escapeHtml(observationMoment(observation))}</time></header>
            <h3>${escapeHtml(observationReviewTitle(observation))}</h3>
            <p>${escapeHtml(observation.source.label)} · ${escapeHtml(observation.context.boundaryLabel)}</p>
          </div>
          <dl>
            <div><dt>Bronsoort</dt><dd>${escapeHtml(observationSourceKindLabel(observation))}</dd></div>
            <div><dt>Herkomst</dt><dd>${escapeHtml(observationOriginLabel(observation))}</dd></div>
            <div><dt>Beoordelaar</dt><dd>${escapeHtml(observation.ownership.reviewOwner)}</dd></div>
          </dl>
          <button type="button" data-open-observation-review="${escapeHtml(observation.id)}">Open en beoordeel<span aria-hidden="true">→</span></button>
        </article>`).join("")
      : `<div class="observation-review-empty"><span aria-hidden="true">✓</span><div><h3>De wachtrij is rustig.</h3><p>Er zijn momenteel geen observaties die om jouw beoordeling vragen.</p></div></div>`;
  };

  const resetObservationReviewDialog = () => {
    observationReviewForm.reset();
    observationReviewForm.hidden = false;
    observationReviewComplete.hidden = true;
    observationReviewError.hidden = true;
    observationReviewError.textContent = "";
    observationReviewCase.hidden = true;
    observationReviewTrigger.hidden = true;
    (observationReviewCase.querySelector("select") as HTMLSelectElement).required = false;
    (observationReviewTrigger.querySelector("input") as HTMLInputElement).required = false;
  };

  const openObservationReview = (observationId: string) => {
    resetObservationReviewDialog();
    const observation = observationsNeedingReview(loadObservationStore(localStorage)).find((item) => item.id === observationId);
    if (!observation) {
      observationReviewDetail.innerHTML = '<div class="observation-review-missing"><h3>Deze observatie is niet beschikbaar.</h3><p>De wachtrij is opnieuw geladen. Er zijn geen gegevens gewijzigd.</p></div>';
      observationReviewForm.hidden = true;
    } else {
      observationReviewDetail.innerHTML = renderObservationReviewDetail(observation);
      (observationReviewForm.elements.namedItem("observationId") as HTMLInputElement).value = observation.id;
    }
    observationReviewDialog.showModal();
  };

  const closeObservationReview = () => {
    observationReviewDialog.close();
    resetObservationReviewDialog();
    paintObservationReviewQueue();
  };

  observationReviewList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-open-observation-review]");
    if (button?.dataset.openObservationReview) openObservationReview(button.dataset.openObservationReview);
  });

  observationReviewForm.addEventListener("change", () => {
    const status = String(new FormData(observationReviewForm).get("status") ?? "") as ObservationReviewOutcome;
    const caseSelect = observationReviewCase.querySelector("select") as HTMLSelectElement;
    const triggerInput = observationReviewTrigger.querySelector("input") as HTMLInputElement;
    observationReviewCase.hidden = status !== "linked";
    observationReviewTrigger.hidden = status !== "parked";
    caseSelect.required = status === "linked";
    triggerInput.required = status === "parked";
    observationReviewError.hidden = true;
  });

  observationReviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(observationReviewForm);
    const observationId = String(data.get("observationId") ?? "");
    const current = observationsNeedingReview(loadObservationStore(localStorage)).find((item) => item.id === observationId);
    if (!current) {
      observationReviewError.textContent = "Deze observatie wacht niet meer op beoordeling. De wachtrij is opnieuw geladen.";
      observationReviewError.hidden = false;
      paintObservationReviewQueue();
      return;
    }
    try {
      const decision = prepareObservationReview({
        status: String(data.get("status") ?? "") as ObservationReviewOutcome,
        reviewedBy: String(data.get("reviewedBy") ?? ""),
        rationale: String(data.get("rationale") ?? ""),
        caseId: String(data.get("caseId") ?? ""),
        returnTrigger: String(data.get("returnTrigger") ?? ""),
      });
      const reviewed = reviewObservation(localStorage, observationId, decision);
      if (!reviewed) throw new Error("De beoordeling kon niet worden bewaard. Controleer of de observatie nog openstaat.");
      observationReviewDetail.innerHTML = renderObservationReviewDetail(reviewed);
      observationReviewForm.hidden = true;
      observationReviewComplete.hidden = false;
      paintObservationReviewQueue();
      paintObserving();
    } catch (error) {
      observationReviewError.textContent = error instanceof Error ? error.message : "De beoordeling kon niet worden bewaard.";
      observationReviewError.hidden = false;
    }
  });

  app.querySelectorAll<HTMLButtonElement>("[data-observation-review-close],[data-observation-review-cancel],[data-observation-review-done]").forEach((button) => button.addEventListener("click", closeObservationReview));
  observationReviewDialog.addEventListener("cancel", () => resetObservationReviewDialog());

  const paintObserving = () => {
    observationStore = loadObservationStore(localStorage);
    observingContext = loadObservingContext(localStorage);
    const count = observationStore.observations.length;
    const pendingCount = observationStore.observations.filter((observation) => observation.status === "unreviewed").length;
    observingStatus.textContent = observingContext ? "Waarnemen is actief" : "Waarnemen is beschikbaar";
    observingSource.textContent = observingContext?.source.label ?? "Publieke WBD-website";
    observingIndicator.classList.toggle("is-active", Boolean(observingContext));
    observingStart.textContent = observingContext ? "Bevestig opnieuw" : "Activeer Waarnemen";
    observingStop.hidden = !observingContext;
    observingOpen.hidden = !observingContext;
    observingSummary.textContent = pendingCount
      ? `${pendingCount} ${pendingCount === 1 ? "observatie wacht" : "observaties wachten"} op menselijke beoordeling.`
      : count
        ? "Geen observaties wachten op beoordeling. De geschiedenis blijft behouden."
        : "Nog geen observaties. Atlas houdt de betekenis bewust open.";
    paintAdvice();
    observationList.innerHTML = count ? observationStore.observations.map((observation) => `<article class="workspace-observation">
      <div class="workspace-observation__meaning"><span>${escapeHtml(observationStatusLabel(observation.status))}</span><blockquote>${escapeHtml(observation.text)}</blockquote><time datetime="${escapeHtml(observation.createdAt)}">${escapeHtml(observationMoment(observation))}</time></div>
      <dl>
        <div><dt>Pagina</dt><dd>${escapeHtml(observation.context.pageLabel)}</dd></div>
        <div><dt>Ervaringsgrens</dt><dd>${escapeHtml(observation.context.boundaryLabel)}</dd></div>
        <div><dt>Bron</dt><dd>${escapeHtml(observation.source.label)}</dd></div>
        <div><dt>Eigenaar</dt><dd>${escapeHtml(observation.ownership.reviewOwner)}</dd></div>
        <div><dt>Viewport</dt><dd>${observation.context.viewport ? `${observation.context.viewport.width} × ${observation.context.viewport.height} px` : "Niet van toepassing"}</dd></div>
      </dl>
      <a href="${escapeHtml(observation.source.locator)}">Open oorspronkelijke route <span aria-hidden="true">↗</span></a>
    </article>`).join("") : '<p class="workspace-empty">Tijdens normaal gebruik kun je straks vastleggen wat je ziet of ervaart. Een waarneming blijft hier bewust nog zonder conclusie.</p>';
    paintObservationReviewQueue();
  };

  observingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const activated = activateObserving(localStorage, {
      source: { id: "public-wbd-website", label: "Publieke WBD-website", origin: "website" },
      ownership: { captureOwner: "We Build And Design", reviewOwner: "Atlas · Werkelijkheid" },
    });
    if (!activated) {
      notify("Waarnemen kon niet lokaal worden geactiveerd.", true);
      return;
    }
    notify(`Waarnemen is actief voor ${activated.source.label}.`);
    paintObserving();
  });

  observingStop.addEventListener("click", () => {
    if (!deactivateObserving(localStorage)) {
      notify("Waarnemen kon niet lokaal worden beëindigd.", true);
      return;
    }
    notify("Waarnemen is in deze browser beëindigd.");
    paintObserving();
  });

  paintObserving();
  [focusLoad.warning, aquaLoad.warning, ideasLoad.warning, logsLoad.warning, understandingLoad.warning].filter(Boolean).forEach((warning) => notify(warning, true));

  const persistFocus = () => save(localStorage, storageKeys.focus, focusStore) ? notify("Dagfocus opgeslagen.") : notify("Dagfocus kon niet lokaal worden opgeslagen.", true);

  const focusList = app.querySelector<HTMLElement>("[data-focus-list]")!;
  const focusForm = app.querySelector<HTMLFormElement>("[data-focus-form]")!;
  const focusCount = app.querySelector<HTMLElement>("[data-focus-count]")!;
  const history = app.querySelector<HTMLElement>("[data-focus-history]")!;
  const paintFocus = () => {
    const items = currentItems();
    focusCount.textContent = `${items.length} / 3`;
    focusForm.hidden = items.length >= 3;
    focusList.innerHTML = items.length ? items.map((item) => `<article class="workspace-focus-item${item.completed ? " is-complete" : ""}" data-focus-id="${escapeHtml(item.id)}">
      <label class="workspace-focus-toggle"><input type="checkbox" ${item.completed ? "checked" : ""} aria-label="Markeer stap als afgerond"><i aria-hidden="true"></i></label>
      <input class="workspace-focus-item__text" value="${escapeHtml(item.text)}" maxlength="160" aria-label="Dagstap">
      <select aria-label="Gekoppelde case">${caseOptions(item.caseId)}</select><button type="button" data-remove-focus aria-label="Verwijder stap">×</button></article>`).join("") : '<p class="workspace-empty">Kies bewust wat vandaag betekenis heeft.</p>';
    history.innerHTML = Object.entries(focusStore.days).filter(([date]) => date !== today).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7).map(([date, dayItems]) => `<article><time>${escapeHtml(date)}</time><p>${dayItems.length ? `${dayItems.filter((item) => item.completed).length} van ${dayItems.length} afgerond` : "Leeg begonnen"}</p></article>`).join("") || '<p class="workspace-empty">Nog geen eerdere werkdagen.</p>';
    paintAdvice();
  };

  const dayDialog = app.querySelector<HTMLDialogElement>("[data-day-start]")!;
  let dayChoiceResolved = !priorDate;
  focusTools.addEventListener("toggle", () => {
    if (!focusTools.open || dayChoiceResolved) return;
    focusTools.open = false;
    dayDialog.showModal();
  });
  dayDialog.addEventListener("cancel", (event) => event.preventDefault());
  dayDialog.addEventListener("close", () => {
    dayChoiceResolved = true;
    focusStore.activeDate = today;
    focusStore.days[today] = dayDialog.returnValue === "carry" ? priorOpenItems.slice(0, 3).map((item) => ({ ...item, id: createId("focus"), completed: false })) : [];
    persistFocus(); paintFocus(); focusTools.open = true;
  });

  focusForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(focusForm); const text = String(data.get("text") ?? "").trim();
    if (!text || currentItems().length >= 3) return;
    currentItems().push({ id: createId("focus"), text, caseId: String(data.get("caseId") ?? "") as CaseId, completed: false });
    persistFocus(); focusForm.reset(); paintFocus();
  });
  focusList.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement; const row = target.closest<HTMLElement>("[data-focus-id]"); const item = currentItems().find((entry) => entry.id === row?.dataset.focusId); if (!item) return;
    if (target.type === "checkbox") item.completed = (target as HTMLInputElement).checked;
    else if (target.matches(".workspace-focus-item__text")) item.text = target.value.trim() || item.text;
    else item.caseId = target.value as CaseId;
    persistFocus(); paintFocus();
  });
  focusList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest("[data-remove-focus]"); const row = button?.closest<HTMLElement>("[data-focus-id]"); if (!row) return;
    focusStore.days[today] = currentItems().filter((item) => item.id !== row.dataset.focusId); persistFocus(); paintFocus();
  });

  const aquaDetail = app.querySelector<HTMLElement>("#case-aquaflask")!;
  const aquaForm = app.querySelector<HTMLFormElement>("[data-aqua-form]")!;
  const activity = () => aquaFlask.updatedAt ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(aquaFlask.updatedAt)) : "Nog niet bijgewerkt";
  const paintAqua = () => {
    (["problem", "nextQuestion", "nextStep", "notes", "lessons"] as const).forEach((name) => { const field = aquaForm.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement; field.value = aquaFlask[name]; });
    app.querySelectorAll<HTMLElement>("[data-aqua-activity],[data-aqua-activity-detail]").forEach((element) => { element.textContent = activity(); }); paintAdvice();
  };
  const aquaTrigger = app.querySelector<HTMLElement>("[data-open-aqua]")!;
  const aquaCloseButton = app.querySelector<HTMLButtonElement>("[data-close-aqua]")!;
  const openAquaProfile = () => {
    aquaDetail.hidden = false; aquaTrigger.setAttribute("aria-expanded", "true"); paintAqua();
    aquaDetail.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    aquaCloseButton.focus({ preventScroll: true });
  };
  aquaTrigger.addEventListener("click", openAquaProfile);
  aquaTrigger.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openAquaProfile(); } });
  aquaCloseButton.addEventListener("click", () => { aquaDetail.hidden = true; aquaTrigger.setAttribute("aria-expanded", "false"); aquaTrigger.focus(); });
  guidanceAction.addEventListener("click", (event) => {
    if (adviceKind !== "aquaflask") return;
    event.preventDefault();
    openAquaProfile();
  });
  todayAction.addEventListener("click", (event) => {
    if (adviceKind === "day-focus") {
      event.preventDefault();
      focusTools.open = true;
      focusList.querySelector<HTMLInputElement>(".workspace-focus-item__text")?.focus();
      return;
    }
    if (adviceKind !== "aquaflask") return;
    event.preventDefault();
    openAquaProfile();
  });
  aquaForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(aquaForm);
    aquaFlask = { version: 1, problem: String(data.get("problem") ?? "").trim(), nextQuestion: String(data.get("nextQuestion") ?? "").trim(), nextStep: String(data.get("nextStep") ?? "").trim(), notes: String(data.get("notes") ?? "").trim(), lessons: String(data.get("lessons") ?? "").trim(), updatedAt: new Date().toISOString() };
    save(localStorage, storageKeys.aquaFlask, aquaFlask) ? notify("AquaFlask-case opgeslagen.") : notify("De case kon niet lokaal worden opgeslagen.", true); paintAqua();
  });

  const wbdDetail = app.querySelector<HTMLElement>("#case-wbd")!;
  const wbdTrigger = app.querySelector<HTMLButtonElement>("[data-open-wbd]")!;
  const wbdCloseButton = app.querySelector<HTMLButtonElement>("[data-close-wbd]")!;
  const openWbdBrief = () => {
    wbdDetail.hidden = false;
    wbdTrigger.setAttribute("aria-expanded", "true");
    wbdDetail.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    wbdCloseButton.focus({ preventScroll: true });
  };
  wbdTrigger.addEventListener("click", openWbdBrief);
  wbdCloseButton.addEventListener("click", () => {
    wbdDetail.hidden = true;
    wbdTrigger.setAttribute("aria-expanded", "false");
    wbdTrigger.focus();
  });
  app.querySelector<HTMLButtonElement>("[data-open-wbd-understanding]")?.addEventListener("click", () => {
    wbdDetail.hidden = true;
    wbdTrigger.setAttribute("aria-expanded", "false");
    showUnderstandingCase("0001");
  });

  const understandingSection = app.querySelector<HTMLElement>("#understanding")!;
  const understandingTools = app.querySelector<HTMLDetailsElement>("[data-understanding-tools]")!;
  const understandingDecision = app.querySelector<HTMLElement>("[data-understanding-decision]")!;
  const understandingReason = app.querySelector<HTMLElement>("[data-understanding-reason]")!;
  const understandingContext = app.querySelector<HTMLElement>("[data-understanding-context]")!;
  const understandingList = app.querySelector<HTMLElement>("[data-understanding-list]")!;
  const understandingForm = app.querySelector<HTMLFormElement>("[data-understanding-form]")!;
  const relationshipForm = app.querySelector<HTMLFormElement>("[data-relationship-form]")!;
  const insightForm = app.querySelector<HTMLFormElement>("[data-insight-form]")!;
  const nextStepForm = app.querySelector<HTMLFormElement>("[data-next-step-form]")!;
  const revisionDialog = app.querySelector<HTMLDialogElement>("[data-revision-dialog]")!;
  const revisionForm = app.querySelector<HTMLFormElement>("[data-revision-form]")!;
  const understandingSearch = app.querySelector<HTMLInputElement>("[data-understanding-search]")!;
  const understandingKindFilter = app.querySelector<HTMLSelectElement>("[data-understanding-kind-filter]")!;
  const understandingStatusFilter = app.querySelector<HTMLSelectElement>("[data-understanding-status-filter]")!;
  const selectionBar = app.querySelector<HTMLElement>("[data-understanding-selection]")!;
  const selectedLabel = app.querySelector<HTMLElement>("[data-understanding-selected]")!;

  if (requestedUnderstandingItem) understandingTools.open = true;

  const persistUnderstanding = (message = "Understanding bijgewerkt.") => {
    saveUnderstanding(localStorage, understanding) ? notify(message) : notify("Understanding kon niet lokaal worden opgeslagen.", true);
  };

  const caseUnderstandingItems = () => understanding.items.filter((item) => item.caseId === activeUnderstandingCase);
  const understandingOption = (item: UnderstandingItem) => `<option value="${escapeHtml(item.id)}">${escapeHtml(kindLabel(item.kind))} · ${escapeHtml(item.text.slice(0, 72))}</option>`;

  const updateUnderstandingOptions = () => {
    const items = caseUnderstandingItems();
    const empty = '<option value="">Nog niet relateren</option>';
    const relatedSelect = understandingForm.elements.namedItem("relatedTo") as HTMLSelectElement;
    const priorRelated = relatedSelect.value;
    relatedSelect.innerHTML = empty + items.map(understandingOption).join("");
    if (items.some((item) => item.id === priorRelated)) relatedSelect.value = priorRelated;
    (["fromId", "toId"] as const).forEach((name) => {
      const select = relationshipForm.elements.namedItem(name) as HTMLSelectElement;
      const prior = select.value;
      select.innerHTML = items.length ? items.map(understandingOption).join("") : '<option value="">Nog geen materiaal</option>';
      if (items.some((item) => item.id === prior)) select.value = prior;
    });
  };

  const itemRelationships = (item: UnderstandingItem) => understanding.relationships.filter((relationship) => relationship.fromId === item.id || relationship.toId === item.id);
  const paintUnderstanding = () => {
    const recommendation = understandingRecommendation(understanding, activeUnderstandingCase);
    understandingDecision.textContent = recommendation.title;
    understandingReason.textContent = recommendation.reason;
    app.querySelectorAll<HTMLButtonElement>("[data-understanding-case]").forEach((button) => {
      const current = button.dataset.understandingCase === activeUnderstandingCase;
      button.classList.toggle("is-current", current); button.setAttribute("aria-selected", String(current));
    });
    const query = understandingSearch.value.trim().toLocaleLowerCase("nl");
    const kind = understandingKindFilter.value as UnderstandingKind | "";
    const status = understandingStatusFilter.value as UnderstandingStatus | "";
    const allCaseItems = caseUnderstandingItems();
    const items = allCaseItems.filter((item) => (!query || `${item.text} ${item.sourceLabel}`.toLocaleLowerCase("nl").includes(query)) && (!kind || item.kind === kind) && (!status || item.status === status));
    const isAquaFlaskAwaitingEvidence = activeUnderstandingCase === "0002" && allCaseItems.length === 0;
    understandingContext.innerHTML = isAquaFlaskAwaitingEvidence
      ? '<strong>Het bekende beeld staat.</strong><p>Atlas heeft de productmelding onderzocht en het risico begrensd. De oorzaak blijft open. Het bedrijfsprofiel en incidentdossier blijven het herleidbare bronbeeld.</p>'
      : `<strong>${escapeHtml(understandingCaseNames[activeUnderstandingCase])}</strong><p>${allCaseItems.length} ${allCaseItems.length === 1 ? "betekenisdrager" : "betekenisdragers"}; conclusies blijven herleidbaar naar hun oorsprong.</p>`;
    understandingList.innerHTML = items.length ? items.map((item) => {
      const lineage = getUnderstandingLineage(understanding, item.id);
      const revisions = understanding.revisions.filter((revision) => revision.itemId === item.id);
      const relationships = itemRelationships(item).map((relationship) => {
        const otherId = relationship.fromId === item.id ? relationship.toId : relationship.fromId;
        const other = understanding.items.find((candidate) => candidate.id === otherId);
        return other ? `${relationshipLabels[relationship.type]}: ${kindLabel(other.kind)}` : "";
      }).filter(Boolean);
      return `<article class="understanding-item${item.id === requestedUnderstandingItem ? " is-review" : ""}" data-understanding-id="${escapeHtml(item.id)}" data-kind="${item.kind}" data-status="${item.status}">
        <header><label class="understanding-item__select"><input type="checkbox" data-select-understanding ${selectedUnderstandingItems.has(item.id) ? "checked" : ""}><span class="sr-only">Selecteer voor inzicht</span></label><span>${escapeHtml(kindLabel(item.kind))}</span><small>${escapeHtml(statusLabel(item.status))} · onzekerheid ${item.uncertainty === "low" ? "laag" : item.uncertainty === "high" ? "hoog" : "middel"}</small></header>
        <p>${escapeHtml(item.text)}</p>${item.sourceLabel ? `<cite>${escapeHtml(item.sourceLabel)}</cite>` : '<cite>Herkomst nog open</cite>'}
        ${relationships.length ? `<ul class="understanding-item__relations">${relationships.map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>` : ""}
        ${lineage.length > 1 ? `<p class="understanding-lineage"><span>Herkomst</span>${lineage.map((source) => escapeHtml(kindLabel(source.kind))).join(" → ")}</p>` : ""}
        ${revisions.length ? `<details class="understanding-revisions"><summary>${revisions.length} ${revisions.length === 1 ? "revisie" : "revisies"} bewaard</summary>${revisions.map((revision) => `<p><time>${escapeHtml(new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(revision.createdAt)))}</time> ${escapeHtml(revision.reason)}<br><del>${escapeHtml(revision.before.text)}</del></p>`).join("")}</details>` : ""}
        <footer><button type="button" data-question-item>Maak betere vraag</button><button type="button" data-edit-understanding>Verfijn</button>${item.kind === "insight" ? '<button type="button" data-start-next-step>Volgende stap</button>' : ""}</footer>
      </article>`;
    }).join("") : (isAquaFlaskAwaitingEvidence ? '<div class="understanding-empty"><span>0002</span><h3>Wachten is nu de juiste stap.</h3><p>Vandaag is geen aanvullende wijziging gerechtvaardigd. Bij een concrete herhaling legt Atlas tijdstip, account of rol, producttype, stappen en de volledige foutmelding vast.</p></div>' : '<p class="workspace-empty">Geen materiaal past bij deze filters.</p>');
    selectedUnderstandingItems.forEach((id) => { if (!allCaseItems.some((item) => item.id === id)) selectedUnderstandingItems.delete(id); });
    selectionBar.hidden = selectedUnderstandingItems.size === 0;
    selectedLabel.textContent = `${selectedUnderstandingItems.size} geselecteerd`;
    updateUnderstandingOptions();
  };

  const showUnderstandingCase = (caseId: UnderstandingCaseId) => {
    activeUnderstandingCase = caseId;
    selectedUnderstandingItems.clear();
    app.querySelectorAll<HTMLButtonElement>("[data-understanding-case]").forEach((button) => {
      const current = button.dataset.understandingCase === caseId;
      button.classList.toggle("is-current", current); button.setAttribute("aria-selected", String(current));
    });
    paintUnderstanding();
    understandingSection.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  app.querySelectorAll<HTMLButtonElement>("[data-understanding-case]").forEach((button) => button.addEventListener("click", () => showUnderstandingCase(button.dataset.understandingCase as UnderstandingCaseId)));
  app.querySelectorAll<HTMLButtonElement>("[data-open-understanding-case]").forEach((button) => button.addEventListener("click", () => showUnderstandingCase(button.dataset.openUnderstandingCase as UnderstandingCaseId)));
  [understandingSearch, understandingKindFilter, understandingStatusFilter].forEach((field) => field.addEventListener(field === understandingSearch ? "input" : "change", paintUnderstanding));

  understandingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(understandingForm);
    const text = String(data.get("text") ?? "").trim();
    if (!text) return;
    try {
      const item = addUnderstandingItem(understanding, { caseId: activeUnderstandingCase, kind: String(data.get("kind")) as UnderstandingKind, text, sourceLabel: String(data.get("sourceLabel") ?? ""), status: String(data.get("status")) as UnderstandingStatus, uncertainty: String(data.get("uncertainty")) as UnderstandingItem["uncertainty"] });
      const relatedTo = String(data.get("relatedTo") ?? "");
      if (relatedTo) relateUnderstandingItems(understanding, relatedTo, item.id, String(data.get("relationshipType")) as UnderstandingRelationshipType);
      persistUnderstanding(); understandingForm.reset(); paintUnderstanding();
    } catch (error) { notify(error instanceof Error ? error.message : "Dit materiaal kon niet worden bewaard.", true); }
  });

  relationshipForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(relationshipForm);
    try { relateUnderstandingItems(understanding, String(data.get("fromId")), String(data.get("toId")), String(data.get("type")) as UnderstandingRelationshipType); persistUnderstanding("Relatie bevestigd."); paintUnderstanding(); }
    catch { notify("Kies twee verschillende items binnen dezelfde case.", true); }
  });

  understandingList.addEventListener("change", (event) => {
    const checkbox = (event.target as HTMLElement).closest<HTMLInputElement>("[data-select-understanding]");
    const row = checkbox?.closest<HTMLElement>("[data-understanding-id]");
    if (!checkbox || !row) return;
    checkbox.checked ? selectedUnderstandingItems.add(row.dataset.understandingId!) : selectedUnderstandingItems.delete(row.dataset.understandingId!);
    paintUnderstanding();
  });
  understandingList.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    const row = button?.closest<HTMLElement>("[data-understanding-id]");
    const item = understanding.items.find((candidate) => candidate.id === row?.dataset.understandingId);
    if (!button || !item) return;
    if (button.matches("[data-question-item]")) {
      (understandingForm.elements.namedItem("kind") as HTMLSelectElement).value = "question";
      (understandingForm.elements.namedItem("relatedTo") as HTMLSelectElement).value = item.id;
      (understandingForm.elements.namedItem("relationshipType") as HTMLSelectElement).value = "questions";
      (understandingForm.elements.namedItem("text") as HTMLTextAreaElement).focus();
    } else if (button.matches("[data-edit-understanding]")) {
      (revisionForm.elements.namedItem("itemId") as HTMLInputElement).value = item.id;
      (revisionForm.elements.namedItem("text") as HTMLTextAreaElement).value = item.text;
      (revisionForm.elements.namedItem("kind") as HTMLSelectElement).value = item.kind;
      (revisionForm.elements.namedItem("status") as HTMLSelectElement).value = item.status;
      revisionDialog.showModal();
    } else if (button.matches("[data-start-next-step]")) {
      (nextStepForm.elements.namedItem("insightId") as HTMLInputElement).value = item.id;
      insightForm.hidden = true; nextStepForm.hidden = false;
      (nextStepForm.elements.namedItem("text") as HTMLTextAreaElement).focus();
    }
  });

  app.querySelector("[data-start-insight]")?.addEventListener("click", () => { nextStepForm.hidden = true; insightForm.hidden = false; insightForm.querySelector<HTMLTextAreaElement>("textarea")?.focus(); });
  app.querySelector("[data-cancel-insight]")?.addEventListener("click", () => { insightForm.hidden = true; insightForm.reset(); });
  app.querySelector("[data-cancel-next-step]")?.addEventListener("click", () => { nextStepForm.hidden = true; nextStepForm.reset(); });
  insightForm.addEventListener("submit", (event) => {
    event.preventDefault(); const text = String(new FormData(insightForm).get("text") ?? "").trim(); if (!text) return;
    try { const sources = [...selectedUnderstandingItems]; const insight = createInsight(understanding, activeUnderstandingCase, text, sources); logs.unshift({ id: createId("log"), text: `Inzicht gevormd: ${insight.text}`, date: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date()), caseId: activeUnderstandingCase, understandingItemId: insight.id, sourceItemIds: sources, type: "insight" }); save(localStorage, storageKeys.log, logs); persistUnderstanding("Herleidbaar inzicht bewaard."); selectedUnderstandingItems.clear(); insightForm.reset(); insightForm.hidden = true; paintUnderstanding(); paintLogs(); }
    catch { notify("Selecteer minimaal één herleidbare bron voor dit inzicht.", true); }
  });
  nextStepForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(nextStepForm); const text = String(data.get("text") ?? "").trim(); if (!text) return;
    try { const step = createNextStep(understanding, String(data.get("insightId")), text); const lineage = getUnderstandingLineage(understanding, step.id).map((item) => item.id); logs.unshift({ id: createId("log"), text: `Betekenisvolle volgende stap: ${step.text}`, date: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date()), caseId: step.caseId, understandingItemId: step.id, sourceItemIds: lineage, type: "next-step" }); save(localStorage, storageKeys.log, logs); persistUnderstanding("Volgende stap met herkomst bewaard."); nextStepForm.reset(); nextStepForm.hidden = true; paintUnderstanding(); paintLogs(); }
    catch { notify("Een volgende stap moet aan een herleidbaar inzicht verbonden zijn.", true); }
  });

  revisionForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(revisionForm);
    try { reviseUnderstandingItem(understanding, String(data.get("itemId")), { text: String(data.get("text") ?? ""), kind: String(data.get("kind")) as UnderstandingKind, status: String(data.get("status")) as UnderstandingStatus, reason: String(data.get("reason") ?? "") }); persistUnderstanding("Revisie bewaard; eerdere betekenis blijft zichtbaar."); revisionDialog.close(); revisionForm.reset(); paintUnderstanding(); }
    catch { notify("De revisie kon niet worden bewaard.", true); }
  });
  app.querySelector("[data-close-revision]")?.addEventListener("click", () => { revisionDialog.close(); revisionForm.reset(); });

  const ideaList = app.querySelector<HTMLElement>("[data-idea-list]")!; const ideaForm = app.querySelector<HTMLFormElement>("[data-idea-form]")!;
  const paintIdeas = () => { ideaList.innerHTML = ideas.length ? ideas.map((idea) => `<article class="workspace-idea" data-status="${idea.status}"><span>${statusLabels[idea.status]}</span><h3>${escapeHtml(idea.title)}</h3><button type="button" data-remove-idea="${escapeHtml(idea.id)}" aria-label="Verwijder ${escapeHtml(idea.title)}">×</button></article>`).join("") : '<p class="workspace-empty">Nieuwe ideeën mogen hier wachten tot de praktijk erom vraagt.</p>'; };
  app.querySelector("[data-open-idea]")?.addEventListener("click", () => { ideaForm.hidden = false; ideaForm.querySelector<HTMLInputElement>("input")?.focus(); });
  app.querySelector("[data-cancel-idea]")?.addEventListener("click", () => { ideaForm.hidden = true; ideaForm.reset(); });
  ideaForm.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(ideaForm); const title = String(data.get("title") ?? "").trim(); if (!title) return; ideas = [{ id: createId("idea"), title, status: String(data.get("status") ?? "seed") as IdeaStatus }, ...ideas]; save(localStorage, storageKeys.ideas, ideas) ? notify("Idee bewaard.") : notify("Idee kon niet worden opgeslagen.", true); ideaForm.reset(); ideaForm.hidden = true; paintIdeas(); });
  ideaList.addEventListener("click", (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-idea]"); if (!button) return; ideas = ideas.filter((idea) => idea.id !== button.dataset.removeIdea); save(localStorage, storageKeys.ideas, ideas) ? notify("Idee verwijderd.") : notify("Wijziging kon niet worden opgeslagen.", true); paintIdeas(); });

  const logList = app.querySelector<HTMLElement>("[data-log-list]")!; const logForm = app.querySelector<HTMLFormElement>("[data-log-form]")!;
  function paintLogs() { logList.innerHTML = logs.length ? logs.map((entry) => {
    const lineage = entry.understandingItemId ? getUnderstandingLineage(understanding, entry.understandingItemId) : [];
    return `<article class="${entry.type ? `is-${entry.type}` : ""}"><time>${escapeHtml(entry.date)}</time><p>${escapeHtml(entry.text)}</p>${entry.caseId ? `<small>Case ${entry.caseId} · ${escapeHtml(caseNames[entry.caseId])}</small>` : ""}${lineage.length ? `<p class="workspace-log-lineage"><span>Herkomst</span>${lineage.map((item) => escapeHtml(kindLabel(item.kind))).join(" → ")}</p>` : ""}</article>`;
  }).join("") : '<p class="workspace-empty">Je eerste betekenisvolle notitie begint hier.</p>'; }
  logForm.addEventListener("submit", (event) => { event.preventDefault(); const text = String(new FormData(logForm).get("entry") ?? "").trim(); if (!text) return; logs = [{ id: createId("log"), text, date: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date()) }, ...logs]; save(localStorage, storageKeys.log, logs) ? notify("Logboek bijgewerkt.") : notify("Notitie kon niet worden opgeslagen.", true); logForm.reset(); paintLogs(); });

  paintFocus(); paintAqua(); paintUnderstanding(); paintIdeas(); paintLogs();
}
