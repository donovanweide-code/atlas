import "./styles/atlas-workspace.css";
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

const caseNames: Record<Exclude<CaseId, "">, string> = {
  "0001": "We Build And Design",
  "0002": "AquaFlask",
};

const statusLabels: Record<IdeaStatus, string> = {
  seed: "Zaadje",
  growth: "Groei",
  ready: "Klaar om te bouwen",
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
  if (!aquaFlask.problem.trim()) {
    return {
      title: "Maak eerst het werkelijke probleem van AquaFlask scherp.",
      reason: "Dit is een echte klantcase, maar de kernvraag ontbreekt nog. Eerst begrijpen, daarna bouwen.",
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
  let focusStore = focusLoad.value;
  let aquaFlask = aquaLoad.value;
  let ideas: Idea[] = ideasLoad.value;
  let logs: LogEntry[] = logsLoad.value;
  const priorDate = focusStore.activeDate !== today ? focusStore.activeDate : "";
  const priorOpenItems = priorDate ? (focusStore.days[priorDate] ?? []).filter((item) => !item.completed) : [];

  app.innerHTML = `<main class="atlas-workspace">
    <aside class="workspace-sidebar">
      <a class="workspace-brand" href="#overzicht" aria-label="Atlas Workspace"><span class="workspace-brand__mark">A</span><span><strong>Atlas</strong><small>Workspace</small></span></a>
      <nav class="workspace-nav" aria-label="Workspace navigatie">
        <a class="is-current" href="#overzicht"><span>01</span>Overzicht</a><a href="#focus"><span>02</span>Vandaag</a><a href="#cases"><span>03</span>Cases</a><a href="#ideeen"><span>04</span>Ideeën</a><a href="#logboek"><span>05</span>Logboek</a>
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
            <p>Hier wordt Atlas dagelijks bewezen: in de positionering, publieke ervaring en manier waarop strategie, ontwerp en technologie samenkomen.</p><footer><span>Eerstvolgende stap</span><strong>Beoordeel de publieke route als één complete ondernemersreis.</strong></footer></article>
          <article class="workspace-case workspace-case--open"><div class="workspace-case__meta"><span>0002</span><small>In onderzoek</small></div><h3>AquaFlask</h3>
            <p>De eerste echte klantcase waarmee Atlas probleem, vervolgstap en herbruikbare lessen leert bewaren.</p><footer><span data-aqua-activity>Geen activiteit</span><button type="button" data-open-aqua aria-controls="case-aquaflask">Open case <i aria-hidden="true">→</i></button></footer></article>
        </div>
      </section>

      <section class="workspace-section workspace-case-detail" id="case-aquaflask" aria-labelledby="aqua-title" hidden>
        <header class="workspace-case-detail__header"><div><p class="workspace-label">Case 0002 · In onderzoek</p><h2 id="aqua-title">AquaFlask</h2><p>Samen vaststellen welke verandering nu werkelijk nodig is.</p></div><button type="button" data-close-aqua aria-label="Sluit AquaFlask-case">Sluiten</button></header>
        <dl class="workspace-case-facts"><div><dt>Status</dt><dd>In onderzoek</dd></div><div><dt>Laatste activiteit</dt><dd data-aqua-activity-detail>Nog niet bijgewerkt</dd></div><div><dt>Doel</dt><dd>De werkelijke vraag begrijpen en één gedragen volgende stap kiezen.</dd></div></dl>
        <form class="workspace-case-form" data-aqua-form>
          <label>Werkelijk probleem<textarea name="problem" rows="3" maxlength="1200" placeholder="Wat ervaart AquaFlask nu, wie merkt dit en waarom verdient het aandacht?"></textarea></label>
          <label>Volgende vraag<input name="nextQuestion" maxlength="240"></label>
          <label>Volgende stap<input name="nextStep" maxlength="240"></label>
          <label>Notities<textarea name="notes" rows="5" maxlength="2400"></textarea></label>
          <label>Lessen<textarea name="lessons" rows="4" maxlength="1600" placeholder="Wat mag Atlas hiervan meenemen zonder de volgende klant dezelfde oplossing op te dringen?"></textarea></label>
          <div><button type="submit">Bewaar case</button><small>Alleen lokaal in deze browser. Gebruik geen vertrouwelijke gegevens.</small></div>
        </form>
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

    <dialog class="workspace-day-start" data-day-start><form method="dialog"><p class="workspace-label">Nieuwe werkdag</p><h2>Hoe wil je vandaag beginnen?</h2><p>Gisteren bleven ${priorOpenItems.length} ${priorOpenItems.length === 1 ? "stap" : "stappen"} openstaan. Niets wordt stilzwijgend meegenomen.</p><div><button value="carry" ${priorOpenItems.length ? "" : "disabled"}>Neem onafgeronde stappen over</button><button value="empty">Begin leeg</button></div></form></dialog>
  </main>`;

  const notice = app.querySelector<HTMLElement>("[data-notice]")!;
  const notify = (message: string, error = false) => {
    notice.textContent = message; notice.hidden = false; notice.classList.toggle("is-error", error);
    window.setTimeout(() => { notice.hidden = true; }, 3200);
  };
  [focusLoad.warning, aquaLoad.warning, ideasLoad.warning, logsLoad.warning].filter(Boolean).forEach((warning) => notify(warning, true));

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
  app.querySelector("[data-open-aqua]")?.addEventListener("click", () => { aquaDetail.hidden = false; paintAqua(); aquaDetail.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); aquaForm.querySelector<HTMLElement>("input,textarea")?.focus(); });
  app.querySelector("[data-close-aqua]")?.addEventListener("click", () => { aquaDetail.hidden = true; app.querySelector<HTMLElement>("[data-open-aqua]")?.focus(); });
  aquaForm.addEventListener("submit", (event) => {
    event.preventDefault(); const data = new FormData(aquaForm);
    aquaFlask = { version: 1, problem: String(data.get("problem") ?? "").trim(), nextQuestion: String(data.get("nextQuestion") ?? "").trim(), nextStep: String(data.get("nextStep") ?? "").trim(), notes: String(data.get("notes") ?? "").trim(), lessons: String(data.get("lessons") ?? "").trim(), updatedAt: new Date().toISOString() };
    save(localStorage, storageKeys.aquaFlask, aquaFlask) ? notify("AquaFlask-case opgeslagen.") : notify("De case kon niet lokaal worden opgeslagen.", true); paintAqua();
  });

  const ideaList = app.querySelector<HTMLElement>("[data-idea-list]")!; const ideaForm = app.querySelector<HTMLFormElement>("[data-idea-form]")!;
  const paintIdeas = () => { ideaList.innerHTML = ideas.length ? ideas.map((idea) => `<article class="workspace-idea" data-status="${idea.status}"><span>${statusLabels[idea.status]}</span><h3>${escapeHtml(idea.title)}</h3><button type="button" data-remove-idea="${escapeHtml(idea.id)}" aria-label="Verwijder ${escapeHtml(idea.title)}">×</button></article>`).join("") : '<p class="workspace-empty">Nieuwe ideeën mogen hier wachten tot de praktijk erom vraagt.</p>'; };
  app.querySelector("[data-open-idea]")?.addEventListener("click", () => { ideaForm.hidden = false; ideaForm.querySelector<HTMLInputElement>("input")?.focus(); });
  app.querySelector("[data-cancel-idea]")?.addEventListener("click", () => { ideaForm.hidden = true; ideaForm.reset(); });
  ideaForm.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(ideaForm); const title = String(data.get("title") ?? "").trim(); if (!title) return; ideas = [{ id: createId("idea"), title, status: String(data.get("status") ?? "seed") as IdeaStatus }, ...ideas]; save(localStorage, storageKeys.ideas, ideas) ? notify("Idee bewaard.") : notify("Idee kon niet worden opgeslagen.", true); ideaForm.reset(); ideaForm.hidden = true; paintIdeas(); });
  ideaList.addEventListener("click", (event) => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-idea]"); if (!button) return; ideas = ideas.filter((idea) => idea.id !== button.dataset.removeIdea); save(localStorage, storageKeys.ideas, ideas) ? notify("Idee verwijderd.") : notify("Wijziging kon niet worden opgeslagen.", true); paintIdeas(); });

  const logList = app.querySelector<HTMLElement>("[data-log-list]")!; const logForm = app.querySelector<HTMLFormElement>("[data-log-form]")!;
  const paintLogs = () => { logList.innerHTML = logs.length ? logs.map((entry) => `<article><time>${escapeHtml(entry.date)}</time><p>${escapeHtml(entry.text)}</p></article>`).join("") : '<p class="workspace-empty">Je eerste betekenisvolle notitie begint hier.</p>'; };
  logForm.addEventListener("submit", (event) => { event.preventDefault(); const text = String(new FormData(logForm).get("entry") ?? "").trim(); if (!text) return; logs = [{ id: createId("log"), text, date: new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date()) }, ...logs]; save(localStorage, storageKeys.log, logs) ? notify("Logboek bijgewerkt.") : notify("Notitie kon niet worden opgeslagen.", true); logForm.reset(); paintLogs(); });

  paintFocus(); paintAqua(); paintIdeas(); paintLogs();
}
