import "./styles/workspace-planning.css";
import { localDay, addDays, parseQuickCapture, projectWorkItems, todayIdentity, type WorkItem } from "./workspace-work-item.ts";

type User = { id: string; name: string };
type View = { users: User[]; items: WorkItem[]; serverTime: string; moduleAllowed: boolean; canCreate: boolean; canAssign: boolean; canShare: boolean };
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const dayLabel = (value: string | null) => value ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", weekday: "short", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`)) : "Zonder datum";
const stamp = (value: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(value));
const API = `${import.meta.env.VITE_WORKSPACE_REVIEW_BASE || ""}/api/sportpaleis/v1/work-items`;
export function mountPlanning(root: HTMLElement, options: { user: User; csrf?: string; base: string; full: boolean; readOnly?: boolean; sharedOnly?: boolean }) {
  let disposed = false; let view: View = { users: [], items: [], serverTime: new Date().toISOString(), moduleAllowed: false, canCreate: false, canAssign: false, canShare: false }; let current: string | null = null;
  let tab = "today"; let person = "all"; let filterDay = ""; let formType: "TASK" | "APPOINTMENT" | null = null; let error = ""; let notice = ""; let busy = false;
  let offset = 0;
  let listLimit = 50;
  const now = () => new Date(Date.now() + offset);
  const name = (id: string) => view.users.find(user => user.id === id)?.name || "Collega";
  const request = async (url = API, body?: unknown) => {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}) }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
    const value = await response.json(); if (!response.ok) throw Object.assign(new Error(response.status === 401 ? "Je sessie is verlopen of ingetrokken. Log opnieuw in." : value.message || value.error?.message || (typeof value.error === "string" ? value.error : "Opslaan lukt nu niet.")), { status: response.status }); return value;
  };
  const refresh = async () => { const next = await request(options.sharedOnly ? `${API}/shared` : API); if (disposed) return; view = next; offset = Date.parse(view.serverTime) - Date.now(); };
  const due = (item: WorkItem) => {
    const days = item.dueDate ? Math.floor((Date.parse(`${localDay(now())}T12:00:00Z`) - Date.parse(`${item.dueDate}T12:00:00Z`)) / 86400000) : 0;
    return item.status === "OPEN" && item.type === "TASK" && days > 0 ? `<span class="wp-late">${days} ${days === 1 ? "dag" : "dagen"} te laat</span>` : `<span>${esc(dayLabel(item.dueDate))}${item.startTime ? ` · ${esc(item.startTime)}${item.endTime ? `–${esc(item.endTime)}` : ""}` : ""}</span>`;
  };
  const card = (item: WorkItem) => `<button type="button" class="wp-item" data-wp-open="${esc(item.id)}"><span class="wp-item-symbol ${item.status === "COMPLETED" ? "is-done" : ""}" aria-hidden="true">${item.status === "COMPLETED" ? "✓" : item.type === "APPOINTMENT" ? "◷" : "○"}</span><span class="wp-item-body"><strong>${esc(item.title)}</strong><span class="wp-item-meta">${due(item)}<span>${esc(name(item.owner))}${item.sharedWith.length || item.sharedWithTeams.length ? " · gedeeld" : ""}</span></span></span><span aria-hidden="true">↗</span></button>`;
  const empty = (message: string) => `<div class="wp-empty"><span aria-hidden="true">☀</span><strong>${message}</strong><p>Leg iets vast zodra het in je opkomt.</p></div>`;
  const group = (title: string, items: WorkItem[], emptyText: string, key: string) => `<section class="wp-group"><div class="wp-group-heading"><h3>${title}</h3><span>${items.length}</span></div>${items.slice(0, options.full ? listLimit : 3).map(card).join("") || empty(emptyText)}${options.full && items.length > listLimit ? '<button class="wp-secondary" data-wp-more>Meer laden</button>' : ""}${!options.full && items.length ? `<button class="wp-text" data-wp-go="${key}">Bekijk ${options.sharedOnly ? "gedeeld werk" : "Planning"} →</button>` : ""}</section>`;
  const userOptions = (owner: string) => view.users.map(user => `<option value="${esc(user.id)}" ${owner === user.id ? "selected" : ""}>${esc(user.name)}${user.id === options.user.id ? " (ik)" : ""}</option>`).join("");
  const fields = (item?: WorkItem) => `<div class="wp-fields"><label>Eigenaar<select name="owner">${userOptions(item?.owner || options.user.id)}</select></label><label>Datum<input type="date" name="dueDate" value="${esc(item?.dueDate)}" ${((item?.type || formType) === "APPOINTMENT") ? "required" : ""}></label>${(item?.type || formType) === "APPOINTMENT" ? `<label>Starttijd<input type="time" name="startTime" value="${esc(item?.startTime)}" required></label><label>Eindtijd · optioneel<input type="time" name="endTime" value="${esc(item?.endTime)}"></label>` : ""}</div><fieldset class="wp-sharing"><legend>Delen met</legend>${view.users.filter(user => user.id !== options.user.id).map(user => `<label><input type="checkbox" name="sharedWith" value="${esc(user.id)}" ${item?.sharedWith.includes(user.id) ? "checked" : ""}>${esc(user.name)}</label>`).join("")}<small>De eigenaar en gedeelde collega’s kunnen bewerken en afronden. Als je werk aan iemand geeft, blijf jij betrokken.</small></fieldset>`;
  const capture = () => `<section class="wp-editor"><div class="wp-section-head"><h2>${formType === "TASK" ? "Wat moet er gebeuren?" : "Een moment afspreken"}</h2><button class="wp-close" data-wp-close aria-label="Sluiten">×</button></div><form data-wp-capture><label class="wp-sr" for="wp-capture-title">${formType === "TASK" ? "Taak" : "Afspraak"}</label><input id="wp-capture-title" class="wp-capture-input" name="title" maxlength="300" required placeholder="${formType === "TASK" ? "12 shirts bedrukken vrijdag" : "Stanno vertegenwoordiger donderdag 10:00"}" autocomplete="off"><p data-wp-parse class="wp-hint">Schrijf wat je wilt onthouden. Datum en collega herkennen we waar het duidelijk is.</p><details ${formType === "APPOINTMENT" ? "open" : ""}><summary>Datum, eigenaar en delen</summary>${fields()}</details><label>Notitie · optioneel<textarea name="description" rows="2" maxlength="10000" placeholder="Wat moet je collega weten?"></textarea></label><button class="wp-primary" ${busy ? "disabled" : ""}>${busy ? "Opslaan…" : formType === "TASK" ? "Taak opslaan" : "Afspraak opslaan"}</button></form></section>`;
  const detail = (item: WorkItem) => `<section class="wp-detail"><div class="wp-section-head"><span class="wp-kicker">${item.type === "TASK" ? "Taak" : "Afspraak"} · ${item.status === "COMPLETED" ? "Afgerond" : "Open"}</span><button class="wp-close" data-wp-close aria-label="Werkkaart sluiten">×</button></div><h2>${esc(item.title)}</h2><div class="wp-detail-meta">${due(item)}<span>Eigenaar: ${esc(name(item.owner))}</span>${item.sharedWith.length ? `<span>Gedeeld met: ${item.sharedWith.map(id => esc(name(id))).join(", ")}</span>` : ""}</div>${item.status === "OPEN" ? `<button class="wp-primary" data-wp-complete="${esc(item.id)}" ${busy ? "disabled" : ""}>✓ Afronden</button><details class="wp-edit"><summary>Werkitem aanpassen</summary><form data-wp-edit="${esc(item.id)}"><label>Titel<input name="title" value="${esc(item.title)}" maxlength="300" required></label>${fields(item)}<label>Omschrijving<textarea name="description" rows="3" maxlength="10000">${esc(item.description)}</textarea></label><button class="wp-primary" ${busy ? "disabled" : ""}>Wijzigingen opslaan</button></form></details>` : `<p class="wp-completed">Afgerond door ${esc(name(item.completedBy!))} · ${esc(stamp(item.completedAt!))}</p>`}${item.description ? `<section class="wp-context"><h3>Notitie</h3><p>${esc(item.description)}</p></section>` : ""}${item.notes.length ? `<section class="wp-context"><h3>Notities</h3>${item.notes.map(note => `<article><div class="wp-note-by"><strong>${esc(name(note.author))}</strong><time>${esc(stamp(note.at))}</time></div><p>${esc(note.text)}</p></article>`).join("")}</section>` : ""}<form data-wp-note="${esc(item.id)}" class="wp-note-form"><label>Notitie toevoegen<textarea name="text" required maxlength="10000" rows="3" placeholder="Wat is er besproken of gedaan?"></textarea></label><button class="wp-secondary" ${busy ? "disabled" : ""}>Notitie bewaren</button></form>${item.relatedEntities.length ? `<section class="wp-context"><h3>Context</h3>${item.relatedEntities.map(relation => `<p>${esc(relation.displayLabel)} <small>${esc(relation.entityType)}</small></p>`).join("")}</section>` : ""}<section class="wp-context"><h3>Activiteit</h3>${[...item.activity].reverse().map(event => `<div class="wp-activity"><span>${esc(name(event.actor))} · ${{ CREATED: "aangemaakt", UPDATED: "bijgewerkt", NOTE_ADDED: "notitie toegevoegd", COMPLETED: "afgerond" }[event.action] || "bijgewerkt"}</span><time>${esc(stamp(event.at))}</time></div>`).join("")}</section></section>`;
  const render = () => {
    if (disposed) return;
    const identity = todayIdentity(options.user.name, now());
    const filtered = view.items.filter(item => (person === "all" || person === "mine" && item.owner === options.user.id || person === "shared" && (item.sharedWith.length > 0 || item.sharedWithTeams.length > 0) || item.owner === person) && (!filterDay || item.dueDate === filterDay));
    const projection = projectWorkItems(filtered, now()); const all = projectWorkItems(view.items, now());
    const selected = current ? view.items.find(item => item.id === current) : null;
    root.innerHTML = `<div class="wp ${options.full ? "wp-full" : "wp-today"}"><header class="wp-hero"><p class="wp-kicker">${options.full ? "Ruimte voor je werk" : "Jouw dag, helder in beeld"}</p><div class="wp-section-head"><div><h1>${options.full ? options.sharedOnly ? "Gedeeld werk" : "Planning" : esc(identity.greeting)}</h1><p class="wp-clock">${esc(identity.dateLine)}</p></div><span class="wp-sun" aria-hidden="true">✳</span></div><p class="wp-summary">${all.today.filter(item => item.type === "TASK").length} taken vandaag · ${all.today.filter(item => item.type === "APPOINTMENT").length} afspraken${all.overdue.length ? ` · ${all.overdue.length} achterstallig` : ""}</p><div class="wp-actions"><button class="wp-primary" data-wp-new="TASK">+ Taak</button><button class="wp-secondary" data-wp-new="APPOINTMENT">+ Afspraak</button>${!options.full ? `<a href="${options.base}/planning" data-link class="wp-text">Planning bekijken →</a>` : ""}</div></header><div role="status" aria-live="polite">${notice ? `<p class="wp-notice">${esc(notice)}</p>` : ""}</div>${error ? `<p class="wp-error" role="alert">${esc(error)} <button data-wp-reload>Opnieuw laden</button></p>` : ""}${formType ? capture() : selected ? detail(selected) : options.full ? `<section class="wp-calendar" aria-label="Datum kiezen"><button class="wp-date ${!filterDay ? "is-active" : ""}" data-wp-day="">Alle<br>datums</button>${Array.from({ length: 7 }, (_, index) => { const date = addDays(localDay(now()), index); return `<button class="wp-date ${filterDay === date ? "is-active" : ""}" data-wp-day="${date}">${index === 0 ? "Vandaag" : dayLabel(date).split(" ")[0]}<strong>${date.slice(-2)}</strong><span>${view.items.filter(item => item.dueDate === date && item.status === "OPEN").length || "·"}</span></button>`; }).join("")}<label class="wp-date-picker">Andere datum<input type="date" data-wp-date-filter value="${filterDay}"></label></section><div class="wp-toolbar"><div class="wp-tabs" role="group" aria-label="Planningweergave">${[["today", "Vandaag"], ["upcoming", "Komend"], ["overdue", "Achterstallig"], ["completed", "Afgerond"]].map(([key, label]) => `<button class="${tab === key ? "is-active" : ""}" data-wp-tab="${key}" aria-pressed="${tab === key}">${label}${key === "overdue" && projection.overdue.length ? ` (${projection.overdue.length})` : ""}</button>`).join("")}</div><label>Toon<select data-wp-person><option value="all">Mijn bereik</option><option value="mine" ${person === "mine" ? "selected" : ""}>Van mij</option><option value="shared" ${person === "shared" ? "selected" : ""}>Gedeeld werk</option>${view.users.map(user => `<option value="${esc(user.id)}" ${person === user.id ? "selected" : ""}>${esc(user.name)}</option>`).join("")}</select></label></div>${filterDay ? group(dayLabel(filterDay), tab === "completed" ? projection.completed : filtered.filter(item => item.status === "OPEN"), "Geen werk op deze datum", "") : group(({ today: "Vandaag", upcoming: "Komend & zonder datum", overdue: "Achterstallig", completed: "Afgerond" })[tab] || "Planning", projection[tab as "today"], "Hier is het rustig", tab)}${!filterDay && tab === "upcoming" && projection.pastAppointments.length ? group("Eerdere afspraken · nog open", projection.pastAppointments, "", "upcoming") : ""}` : `<div class="wp-today-grid">${group("Vandaag", projection.today, "Je dag is nog vrij", "today")}${projection.overdue.length ? group("Achterstallig", projection.overdue, "", "overdue") : ""}${group("Komend", projection.upcoming, "Nog niets gepland", "upcoming")}${projection.pastAppointments.length ? group("Eerdere afspraken · nog open", projection.pastAppointments, "", "upcoming") : ""}</div>`}</div>`;
  };
  const applyPermissions = () => {
    if (!view.canCreate) root.querySelectorAll("[data-wp-new]").forEach(button => button.remove());
    const selected = current ? view.items.find(item => item.id === current) : null;
    if (selected) {
      if (!selected.permissions?.complete) root.querySelector("[data-wp-complete]")?.remove();
      if (!selected.permissions?.edit) root.querySelector(".wp-edit")?.remove();
      if (!selected.permissions?.note) root.querySelector("[data-wp-note]")?.remove();
    }
    root.querySelectorAll<HTMLSelectElement>('[name="owner"]').forEach(field => { field.disabled = !(selected ? selected.permissions?.assign : view.canAssign); });
    root.querySelectorAll<HTMLInputElement>('[name="sharedWith"]').forEach(field => { field.disabled = !(selected ? selected.permissions?.share : view.canShare); });
    if (options.sharedOnly) root.querySelectorAll<HTMLAnchorElement>(`a[href="${options.base}/planning"]`).forEach(link => { link.href = `${options.base}/gedeeld-werk`; link.textContent = "Gedeeld werk bekijken →"; });
    if (options.readOnly) root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("form input, form button, form select, form textarea, [data-wp-complete], [data-wp-new]").forEach(field => { field.disabled = true; });
  };
  const draw = () => { render(); applyPermissions(); };
  const save = async (operation: () => Promise<unknown>, message: string, close = false) => {
    if (busy || options.readOnly) return; busy = true; error = "";
    root.querySelectorAll<HTMLButtonElement>('button[type="submit"], form button, [data-wp-complete]').forEach(button => { button.disabled = true; });
    try { const capturing = Boolean(formType); const saved = await operation() as { id?: string }; await refresh(); if (close) { current = capturing && saved?.id ? saved.id : null; formType = null; } notice = message; draw(); }
    catch (reason) { error = (reason as Error).message; const alert = root.querySelector<HTMLElement>(".wp-error") || document.createElement("p"); alert.className = "wp-error"; alert.setAttribute("role", "alert"); alert.textContent = error; root.querySelector(".wp-hero")?.after(alert); }
    finally { busy = false; root.querySelectorAll<HTMLButtonElement>('form button, [data-wp-complete]').forEach(button => { button.disabled = false; }); }
  };
  const click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-wp-new],[data-wp-open],[data-wp-close],[data-wp-tab],[data-wp-complete],[data-wp-day],[data-wp-go],[data-wp-reload],[data-wp-more]"); if (!button || busy) return;
    event.preventDefault(); event.stopPropagation(); error = ""; notice = "";
    if (button.dataset.wpNew) { formType = button.dataset.wpNew as "TASK" | "APPOINTMENT"; current = null; }
    if (button.dataset.wpOpen) { current = button.dataset.wpOpen; formType = null; }
    if (button.hasAttribute("data-wp-close")) { current = null; formType = null; }
    if (button.dataset.wpTab) { tab = button.dataset.wpTab; filterDay = ""; }
    if (button.hasAttribute("data-wp-day")) { filterDay = button.dataset.wpDay!; tab = "upcoming"; }
    if (button.hasAttribute("data-wp-more")) listLimit += 50;
    if (button.dataset.wpGo) { location.href = `${options.base}/${options.sharedOnly ? "gedeeld-werk" : "planning"}`; return; }
    if (button.hasAttribute("data-wp-reload")) { void refresh().then(draw).catch(reason => { error = reason.message; draw(); }); return; }
    if (button.dataset.wpComplete) { const item = view.items.find(item => item.id === button.dataset.wpComplete)!; void save(() => request(`${API}/${item.id}/complete`, { revision: item.revision }), "Afgerond. Je vindt dit werk terug onder Afgerond.", true); return; }
    draw(); root.querySelector<HTMLInputElement>("#wp-capture-title")?.focus(); if (current) root.querySelector(".wp-detail")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const submit = (event: Event) => {
    const form = event.target as HTMLFormElement; if (!form.matches("[data-wp-capture],[data-wp-edit],[data-wp-note]")) return;
    event.preventDefault(); event.stopPropagation(); const data = new FormData(form);
    if (form.dataset.wpNote) { const item = view.items.find(item => item.id === form.dataset.wpNote)!; void save(() => request(`${API}/${item.id}/note`, { text: data.get("text"), revision: item.revision }), "Notitie bewaard."); return; }
    const parsed = parseQuickCapture(String(data.get("title")), view.canAssign ? view.users : [], now());
    const editing = form.dataset.wpEdit; const existing = editing ? view.items.find(item => item.id === editing)! : null;
    const owner = existing && !existing.permissions?.assign ? existing.owner : String(data.get("owner") || options.user.id);
    const sharedWith = existing && !existing.permissions?.share ? existing.sharedWith : data.getAll("sharedWith");
    const captureTitle = formType === "TASK" && parsed.startTime ? `${parsed.title} · ${parsed.startTime}` : parsed.title;
    const payload = { title: editing ? String(data.get("title")) : captureTitle, description: String(data.get("description") || ""), owner, dueDate: data.get("dueDate") || null, startTime: data.get("startTime") || null, endTime: data.get("endTime") || null, sharedWith, ...(existing ? { revision: existing.revision } : { type: formType }) };
    void save(() => request(editing ? `${API}/${editing}/edit` : API, payload), editing ? "Wijzigingen bewaard." : "Opgeslagen. Je werk blijft staan tot het is afgerond.", !editing);
  };
  const input = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.matches("[data-wp-capture] [name=title]")) {
      const parsed = parseQuickCapture(target.value, view.canAssign ? view.users : [], now()); const form = target.form!;
      for (const [key, value] of [["dueDate", parsed.dueDate], ["owner", parsed.owner || options.user.id], ["startTime", parsed.startTime]]) { const field = form.elements.namedItem(key!) as HTMLInputElement | null; if (field && !field.dataset.manual) field.value = value || ""; }
      const hint = form.querySelector<HTMLElement>("[data-wp-parse]")!;
      hint.textContent = parsed.needsDateChoice ? "Datum niet eenduidig. Kies zelf een datum; we gokken niet." : `${parsed.dueDate ? dayLabel(parsed.dueDate) : "Zonder datum"}${parsed.startTime ? ` · ${parsed.startTime}` : ""} · ${name(parsed.owner || options.user.id)}`;
    } else if (target.matches("[data-wp-capture] [name=owner], [data-wp-capture] [name=dueDate], [data-wp-capture] [name=startTime]")) target.dataset.manual = "true";
  };
  const change = (event: Event) => { const target = event.target as HTMLInputElement; if (target.matches("[data-wp-person]")) { person = target.value; draw(); } if (target.matches("[data-wp-date-filter]")) { filterDay = target.value; draw(); } };
  root.addEventListener("click", click); root.addEventListener("submit", submit); root.addEventListener("input", input); root.addEventListener("change", change);
  root.innerHTML = '<p class="wp-hint" role="status">Je werk laden…</p>';
  void refresh().then(() => {
    if (disposed) return;
    if (!options.full) root.parentElement?.querySelector<HTMLElement>(".sp-page-head")?.setAttribute("hidden", "");
    draw();
  }).catch(reason => {
    if (disposed) return;
    root.innerHTML = `<section class="wp-empty"><h2>${reason.status === 401 ? "Opnieuw aanmelden" : "Planning niet beschikbaar"}</h2><p role="alert">${esc(reason.message)}</p><button class="wp-secondary" data-wp-reload>Opnieuw laden</button></section>`;
  });
  const timer = window.setInterval(() => { if (disposed || document.hidden || current || formType || busy) return; void refresh().then(draw).catch(() => {}); }, 60000);
  return () => { disposed = true; clearInterval(timer); root.removeEventListener("click", click); root.removeEventListener("submit", submit); root.removeEventListener("input", input); root.removeEventListener("change", change); };
}
