import "./styles/atlas-workspace.css";
import { aquaFlaskProfile } from "./atlas-aquaflask-profile";
import {
  type AquaFlaskCase,
  type CaseId,
  type FocusItem,
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
  understandingKinds,
  understandingStatuses,
} from "./atlas-understanding";

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

function focusRecommendation(items: FocusItem[], aquaFlask: AquaFlaskCase): { title: string; reason: string } {
  const next = items.find((item) => !item.completed);
  if (next) {
    const caseName = next.caseId ? caseNames[next.caseId] : "je dagfocus";
    return {
      title: `Begin met ${caseName}: ${next.text}`,
      reason: "Deze stap staat als eerste onafgeronde keuze in je dagfocus. Atlas adviseert; jij bepaalt.",
    };
  }
  if (!aquaFlask.problem.trim() && !aquaFlask.nextStep.trim()) {
    return {
      title: `AquaFlask: ${aquaFlaskProfile.recommendation.title}`,
      reason: "Eenvoudige productpublicatie werkte tijdens het onderzoek. De oorzaak blijft open; een concrete herhaling kan het ontbrekende bewijs opleveren.",
    };
  }
  if (aquaFlask.nextStep.trim()) {
    return {
      title: `AquaFlask: ${aquaFlask.nextStep}`,
      reason: "De klantcontext is aanwezig en er ligt een concrete, nog niet afgeronde vervolgstap.",
    };
  }
  return {
    title: "Bepaal de eerstvolgende stap voor We Build And Design.",
    reason: "De hoofdcase blijft de plek waar Atlas dagelijks wordt bewezen.",
  };
}

function caseOptions(selected: CaseId): string {
  return `<option value="" ${selected === "" ? "selected" : ""}>Geen case</option>
    <option value="0001" ${selected === "0001" ? "selected" : ""}>0001 · We Build And Design</option>
    <option value="0002" ${selected === "0002" ? "selected" : ""}>0002 · AquaFlask</option>`;
}

function understandingKindOptions(selected: UnderstandingKind): string {
  return understandingKinds.map((kind) => `<option value="${kind.id}" ${kind.id === selected ? "selected" : ""}>${kind.label}</option>`).join("");
}

function understandingStatusOptions(selected: UnderstandingStatus): string {
  return understandingStatuses.map((status) => `<option value="${status.id}" ${status.id === selected ? "selected" : ""}>${status.label}</option>`).join("");
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

  const today = localDateKey();
  const focusLoad = loadFocus(localStorage, today);
  const aquaLoad = loadAquaFlask(localStorage);
  const ideasLoad = loadIdeas(localStorage);
  const logsLoad = loadLogs(localStorage);
  const understandingLoad = loadUnderstanding(localStorage);
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

  app.innerHTML = `<main class="atlas-workspace">
    <aside class="workspace-sidebar">
      <a class="workspace-brand" href="#overzicht" aria-label="Atlas Workspace"><span class="workspace-brand__mark">A</span><span><strong>Atlas</strong><small>Workspace</small></span></a>
      <nav class="workspace-nav" aria-label="Workspace navigatie">
        <a class="is-current" href="#overzicht"><span>01</span>Overzicht</a><a href="#focus"><span>02</span>Vandaag</a><a href="#cases"><span>03</span>Cases</a><a href="#understanding"><span>04</span>Understanding</a><a href="#ideeen"><span>05</span>Ideeën</a><a href="#logboek"><span>06</span>Logboek</a>
      </nav>
      <div class="workspace-sidebar__footer"><p>We Build And Design</p><a href="/">Publieke website <span aria-hidden="true">↗</span></a></div>
    </aside>

    <div class="workspace-main">
      <header class="workspace-header"><div><p class="workspace-kicker">Werkdag</p><h1>Goedemorgen, Donovan.</h1></div><p class="workspace-date">${new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p></header>
      <div class="workspace-notice" data-notice role="status" aria-live="polite" hidden></div>

      <section class="workspace-compass-card" id="overzicht" aria-labelledby="compass-title">
        <div class="workspace-compass-card__copy"><p class="workspace-label">Het kompas</p><h2 id="compass-title">Helpt dit de ondernemer vandaag écht verder?</h2>
          <div class="workspace-advice"><span>Atlas adviseert</span><strong data-advice-title></strong><p data-advice-reason></p></div>
        </div>${compass()}
      </section>

      <section class="workspace-section workspace-focus" id="focus" aria-labelledby="focus-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Vandaag</p><h2 id="focus-title">Maximaal drie betekenisvolle stappen.</h2></div><span data-focus-count></span></header>
        <div class="workspace-focus__list" data-focus-list></div>
        <form class="workspace-focus-form" data-focus-form>
          <label>Nieuwe stap<input name="text" required maxlength="160" placeholder="Wat verdient vandaag aandacht?"></label>
          <label>Case<select name="caseId">${caseOptions("")}</select></label>
          <button type="submit">Voeg toe</button>
        </form>
        <details class="workspace-history"><summary>Eerdere dagen</summary><div data-focus-history></div></details>
      </section>

      <section class="workspace-section" id="cases" aria-labelledby="cases-title">
        <header class="workspace-section__header"><div><p class="workspace-label">Cases</p><h2 id="cases-title">Werk met betekenis en context.</h2></div><p>De hoofdcase bewijst Atlas. De klantcase laat Atlas leren.</p></header>
        <div class="workspace-cases">
          <article class="workspace-case workspace-case--primary"><div class="workspace-case__meta"><span>0001 · Hoofdcase</span><small>Eigen bedrijf</small></div><h3>We Build And Design</h3>
            <p>Hier wordt Atlas dagelijks bewezen: in de positionering, publieke ervaring en manier waarop strategie, ontwerp en technologie samenkomen.</p><footer><span>Eerstvolgende stap</span><strong>Beoordeel de publieke route als één complete ondernemersreis.</strong><button type="button" data-open-understanding-case="0001">Open Understanding <i aria-hidden="true">→</i></button></footer></article>
          <article class="workspace-case workspace-case--open" data-open-aqua role="button" tabindex="0" aria-controls="case-aquaflask" aria-expanded="false"><div class="workspace-case__meta"><span>0002 · Klant</span><small>Oorzaak open</small></div><h3>AquaFlask</h3>
            <p>Atlas kent de bestaande WooCommerce-omgeving, het onderzochte productincident en het verhoogde wijzigingsrisico.</p><footer><span>Onderzoek · 18 juli 2026</span><strong>Bekijk het bedrijfsprofiel <i aria-hidden="true">→</i></strong></footer></article>
        </div>
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
        <header class="workspace-section__header"><div><p class="workspace-label">Understanding</p><h2 id="understanding-title">Eerst zien wat er werkelijk speelt.</h2></div><p>Bewaar het verschil tussen wat je weet, vermoedt en nog moet vragen.</p></header>
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
              <label>Soort<select name="kind">${understandingKindOptions("observation")}</select></label>
              <label>Inhoud<textarea name="text" required maxlength="1600" rows="4" placeholder="Beschrijf zo concreet mogelijk, zonder de oplossing alvast in te vullen."></textarea></label>
              <label>Herkomst<input name="sourceLabel" maxlength="240" placeholder="Gesprek, document, observatie of link"></label>
              <div class="understanding-form-row"><label>Status<select name="status">${understandingStatusOptions("observed")}</select></label><label>Onzekerheid<select name="uncertainty"><option value="low">Laag</option><option value="medium" selected>Middel</option><option value="high">Hoog</option></select></label></div>
              <label>Relateer aan<select name="relatedTo"><option value="">Nog niet relateren</option></select></label>
              <label>Relatie<select name="relationshipType">${Object.entries(relationshipLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
              <button type="submit">Bewaar in Understanding</button>
            </form>
            <details class="understanding-relate"><summary>Leg een relatie tussen bestaand materiaal</summary><form data-relationship-form><label>Van<select name="fromId" required></select></label><label>Relatie<select name="type">${Object.entries(relationshipLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Naar<select name="toId" required></select></label><button type="submit">Bevestig relatie</button><small>Relaties worden alleen na jouw bevestiging vastgelegd.</small></form></details>
            <form class="understanding-derived-form" data-insight-form hidden><p class="workspace-label">Menselijke duiding</p><h3>Welk inzicht ontstaat uit de selectie?</h3><textarea name="text" required maxlength="1600" rows="4"></textarea><div><button type="submit">Bewaar herleidbaar inzicht</button><button type="button" data-cancel-insight>Annuleren</button></div></form>
            <form class="understanding-derived-form" data-next-step-form hidden><p class="workspace-label">Van inzicht naar handelen</p><h3>Welke kleine volgende stap wordt hierdoor gerechtvaardigd?</h3><input type="hidden" name="insightId"><textarea name="text" required maxlength="1600" rows="3"></textarea><div><button type="submit">Bewaar volgende stap</button><button type="button" data-cancel-next-step>Annuleren</button></div></form>
          </aside>
        </div>
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

    <dialog class="workspace-revision" data-revision-dialog><form data-revision-form><input type="hidden" name="itemId"><p class="workspace-label">Interpretatie verfijnen</p><h2>Bewaar de eerdere betekenis.</h2><label>Inhoud<textarea name="text" required maxlength="1600" rows="5"></textarea></label><div class="understanding-form-row"><label>Soort<select name="kind">${understandingKindOptions("observation")}</select></label><label>Status<select name="status">${understandingStatusOptions("observed")}</select></label></div><label>Reden voor wijziging<input name="reason" required maxlength="240" placeholder="Wat is er geleerd of opnieuw geclassificeerd?"></label><div><button type="submit">Bewaar revisie</button><button type="button" data-close-revision>Annuleren</button></div></form></dialog>
    <dialog class="workspace-day-start" data-day-start><form method="dialog"><p class="workspace-label">Nieuwe werkdag</p><h2>Hoe wil je vandaag beginnen?</h2><p>Gisteren bleven ${priorOpenItems.length} ${priorOpenItems.length === 1 ? "stap" : "stappen"} openstaan. Niets wordt stilzwijgend meegenomen.</p><div><button value="carry" ${priorOpenItems.length ? "" : "disabled"}>Neem onafgeronde stappen over</button><button value="empty">Begin leeg</button></div></form></dialog>
  </main>`;

  const notice = app.querySelector<HTMLElement>("[data-notice]")!;
  const notify = (message: string, error = false) => {
    notice.textContent = message; notice.hidden = false; notice.classList.toggle("is-error", error);
    window.setTimeout(() => { notice.hidden = true; }, 3200);
  };
  [focusLoad.warning, aquaLoad.warning, ideasLoad.warning, logsLoad.warning, understandingLoad.warning].filter(Boolean).forEach((warning) => notify(warning, true));

  const persistFocus = () => save(localStorage, storageKeys.focus, focusStore) ? notify("Dagfocus opgeslagen.") : notify("Dagfocus kon niet lokaal worden opgeslagen.", true);
  const currentItems = () => focusStore.days[today] ?? [];
  const adviceTitle = app.querySelector<HTMLElement>("[data-advice-title]")!;
  const adviceReason = app.querySelector<HTMLElement>("[data-advice-reason]")!;
  const paintAdvice = () => { const advice = focusRecommendation(currentItems(), aquaFlask); adviceTitle.textContent = advice.title; adviceReason.textContent = advice.reason; };

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
  if (priorDate) dayDialog.showModal();
  dayDialog.addEventListener("cancel", (event) => event.preventDefault());
  dayDialog.addEventListener("close", () => {
    focusStore.activeDate = today;
    focusStore.days[today] = dayDialog.returnValue === "carry" ? priorOpenItems.slice(0, 3).map((item) => ({ ...item, id: createId("focus"), completed: false })) : [];
    persistFocus(); paintFocus();
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
  aquaForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(aquaForm);
    aquaFlask = { version: 1, problem: String(data.get("problem") ?? "").trim(), nextQuestion: String(data.get("nextQuestion") ?? "").trim(), nextStep: String(data.get("nextStep") ?? "").trim(), notes: String(data.get("notes") ?? "").trim(), lessons: String(data.get("lessons") ?? "").trim(), updatedAt: new Date().toISOString() };
    save(localStorage, storageKeys.aquaFlask, aquaFlask) ? notify("AquaFlask-case opgeslagen.") : notify("De case kon niet lokaal worden opgeslagen.", true); paintAqua();
  });

  const understandingSection = app.querySelector<HTMLElement>("#understanding")!;
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
