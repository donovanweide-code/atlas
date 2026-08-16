export type ControlRecordType = "organizations" | "opportunities" | "commitments" | "actions" | "effort-observations";

interface SourceHealth {
  sourceId: string;
  status: "HEALTHY" | "STALE" | "FAILED" | "UNKNOWN";
  coverage: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  lastKnownGoodAt: string | null;
}

interface BaseRecord { id: string; revision: number; sourceHealthId: string; confirmedBy: string; createdAt: string; updatedAt: string }
export interface ControlOrganization extends BaseRecord { name: string; relationshipType: string; status: string; reviewedAt: string; sourceRefs: string[] }
export interface ControlOpportunity extends BaseRecord { organizationId: string; title: string; problemOrOpportunity: string; status: string; valueType: string; expectedOneOffRevenue: number | null; expectedMrr: number | null; proposalStatus: string; evidenceRefs: string[]; nextReviewAt: string; ownerActionId: string | null }
export interface ControlCommitment extends BaseRecord { organizationId: string; status: string; contractedMrr: number | null; startsAt: string | null; endsAt: string | null; renewalReviewAt: string | null; responsibilities: { description: string; responsibleParty: string }[]; sourceRefs: string[] }
export interface ControlAction extends BaseRecord { subjectType: string; subjectId: string; title: string; reasonDonovanNeeded: string; status: string; priority: string; dueAt: string | null; completedAt: string | null; sourceRefs: string[] }
export interface ControlEffort extends BaseRecord { organizationId: string; serviceCommitmentId: string | null; timeClass: string; category: string; minutes: number; context: string | null; capturedAt: string; status: string; sourceRefs: string[] }

export interface ControlView {
  schemaVersion: 1;
  organizations: ControlOrganization[];
  opportunities: ControlOpportunity[];
  serviceCommitments: ControlCommitment[];
  ownerActions: ControlAction[];
  effortObservations: ControlEffort[];
  sourceHealth: SourceHealth[];
  revision: number;
  releaseId: string;
}

export interface ControlOverview {
  revision: number;
  reliability: { status: "BETROUWBAAR" | "GEDEELTELIJK BETROUWBAAR" | "ONVOLDOENDE BRONDEKKING"; blockers: { sourceId: string; status: string; coverage: string; impact: string; message: string; lastKnownGoodAt: string | null }[]; noAttentionNeeded: boolean };
  attention: { kind: string; id: string; title: string; reason?: string; priority: string; dueAt: string | null }[];
  opportunities: (ControlOpportunity & { organizationName: string; ownerAction: ControlAction | null })[];
  company: { activeCommitments: number; confirmedContractedMrr: number | null; recurringMinutes: number | null; mrrPerRecurringHour: number | null; evidenceStatus: "SUFFICIENT" | "INSUFFICIENT"; period: string };
  responsibilityExceptions: { id: string; organizationName: string; renewalReviewAt: string | null; responsibilities: { description: string; responsibleParty: string }[]; sourceStatus: string }[];
  nextBestAction: { id: string; title: string; reason: string; priority: string; dueAt: string | null } | null;
  nextBestActionStatus: "SUPPORTED" | "INSUFFICIENT_EVIDENCE";
  capabilitiesPath: string;
}

const esc = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const euro = (value: number | null): string => value === null ? "UNKNOWN" : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
const dateLabel = (value: string | null): string => value ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Geen datum";
const dateInput = (offsetDays = 0): string => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

function options(values: readonly string[], selected?: string): string {
  return values.map((value) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(value.replaceAll("_", " "))}</option>`).join("");
}

function sourceFields(defaultReview: string): string {
  return `<fieldset class="wbd-control-source"><legend>Bronbetrouwbaarheid</legend><label>Dekking<select name="sourceCoverage">${options(["PARTIAL", "COMPLETE", "UNKNOWN"], "PARTIAL")}</select></label><label>Impact<select name="sourceImpact">${options(["MEDIUM", "HIGH", "CRITICAL", "LOW"], "MEDIUM")}</select></label><label>Herbeoordelen op<input name="sourceReviewDueAt" type="date" value="${defaultReview}"></label><label class="wbd-control-check"><input name="permitsNoAttentionClaim" type="checkbox"> Compleet genoeg voor een betrouwbare stilteclaim</label></fieldset>`;
}

function organizationOptions(control: ControlView): string {
  return control.organizations.filter(({ status }) => status !== "ARCHIVED").map(({ id, name }) => `<option value="${esc(id)}">${esc(name)}</option>`).join("");
}

function actionSubjectOptions(control: ControlView): string {
  const organizations = control.organizations.filter(({ status }) => status !== "ARCHIVED").map(({ id, name }) => `<option value="ORGANIZATION|${esc(id)}">Organization · ${esc(name)}</option>`);
  const opportunities = control.opportunities.map(({ id, title }) => `<option value="OPPORTUNITY|${esc(id)}">Opportunity · ${esc(title)}</option>`);
  const commitments = control.serviceCommitments.map(({ id, organizationId }) => `<option value="SERVICE_COMMITMENT|${esc(id)}">Commitment · ${esc(control.organizations.find(({ id: candidate }) => candidate === organizationId)?.name ?? id)}</option>`);
  return [...organizations, ...opportunities, ...commitments].join("");
}

function commitmentOptions(control: ControlView): string {
  return `<option value="">Geen commitment</option>${control.serviceCommitments.filter(({ status }) => status !== "ENDED").map(({ id, organizationId }) => `<option value="${esc(id)}">${esc(control.organizations.find(({ id: candidate }) => candidate === organizationId)?.name ?? id)}</option>`).join("")}`;
}

function recordForms(control: ControlView): string {
  return `<section class="wbd-control-capture" aria-labelledby="capture-title"><header><p class="wbd-owner-eyebrow">Menselijke bevestiging</p><h2 id="capture-title">Canonieke waarheid vastleggen</h2><p>Geen import en geen Atlas. Alleen wat Donovan hier bewust bevestigt wordt centrale WBD-waarheid.</p></header><div class="wbd-control-capture__grid">
    <details><summary>Organization bevestigen</summary><form data-control-form="organizations"><label>Naam<input name="name" required maxlength="160"></label><label>Relatie<select name="relationshipType">${options(["CUSTOMER", "PROSPECT", "PARTNER"], "PROSPECT")}</select></label><label>Status<select name="status">${options(["ACTIVE", "INACTIVE", "UNKNOWN"], "ACTIVE")}</select></label><label>Beoordeeld op<input name="reviewedAt" type="date" value="${dateInput()}" required></label><label>Bronreferenties<textarea name="sourceRefs" placeholder="Bijvoorbeeld: bevestiging Donovan 2026-08-16" required></textarea></label>${sourceFields(dateInput(365))}<button type="submit">Organization bevestigen</button></form></details>
    <details><summary>Opportunity bevestigen</summary><form data-control-form="opportunities"><label>Organization<select name="organizationId">${organizationOptions(control)}</select></label><label>Titel<input name="title" required maxlength="180"></label><label>Kans of probleem<textarea name="problemOrOpportunity" required maxlength="1200"></textarea></label><label>Status<select name="status">${options(["OPEN", "ON_HOLD", "WON", "LOST"], "OPEN")}</select></label><label>Waardetype<select name="valueType">${options(["UNKNOWN", "ONE_OFF", "MRR", "MIXED"], "UNKNOWN")}</select></label><label>Eenmalige omzet €<input name="expectedOneOffRevenue" type="number" min="0" step="0.01"></label><label>Verwachte MRR €<input name="expectedMrr" type="number" min="0" step="0.01"></label><label>Voorstelstatus<select name="proposalStatus">${options(["NONE", "DRAFT", "SENT", "ACCEPTED", "DECLINED", "UNKNOWN"], "NONE")}</select></label><label>Volgende review<input name="nextReviewAt" type="date" value="${dateInput(14)}" required></label><label>Gekoppelde actie<select name="ownerActionId"><option value="">Geen</option>${control.ownerActions.filter(({ status }) => status === "OPEN").map(({ id, title }) => `<option value="${esc(id)}">${esc(title)}</option>`).join("")}</select></label><label>Bewijsreferenties<textarea name="evidenceRefs" required></textarea></label>${sourceFields(dateInput(14))}<button type="submit">Opportunity bevestigen</button></form></details>
    <details><summary>Service Commitment vastleggen</summary><form data-control-form="commitments"><label>Organization<select name="organizationId">${organizationOptions(control)}</select></label><label>Status<select name="status">${options(["ACTIVE", "PAUSED", "UNKNOWN", "ENDED"], "ACTIVE")}</select></label><label>Gecontracteerde MRR €<input name="contractedMrr" type="number" min="0" step="0.01" placeholder="Leeg = UNKNOWN"></label><label>Start<input name="startsAt" type="date"></label><label>Einde<input name="endsAt" type="date"></label><label>Renewal-review<input name="renewalReviewAt" type="date" value="${dateInput(90)}"></label><label>Verantwoordelijkheid<textarea name="responsibilityDescription" required maxlength="600"></textarea></label><label>Verantwoordelijke partij<select name="responsibleParty">${options(["WBD", "CUSTOMER", "SHARED", "EXTERNAL_PROVIDER"], "WBD")}</select></label><label>Bronreferenties<textarea name="sourceRefs" required></textarea></label>${sourceFields(dateInput(90))}<button type="submit">Commitment vastleggen</button></form></details>
    <details><summary>Owner Action vastleggen</summary><form data-control-form="actions"><label>Onderwerp<select name="subject">${actionSubjectOptions(control)}</select></label><label>Titel<input name="title" required maxlength="200"></label><label>Waarom Donovan nodig is<textarea name="reasonDonovanNeeded" required maxlength="800"></textarea></label><label>Prioriteit<select name="priority">${options(["HIGH", "MEDIUM", "LOW", "CRITICAL"], "MEDIUM")}</select></label><label>Deadline<input name="dueAt" type="date" value="${dateInput(7)}"></label><label>Bronreferenties<textarea name="sourceRefs" required></textarea></label>${sourceFields(dateInput(30))}<button type="submit">Owner Action vastleggen</button></form></details>
    <details><summary>Effort Observation registreren</summary><form data-control-form="effort-observations"><label>Organization<select name="organizationId">${organizationOptions(control)}</select></label><label>Commitment<select name="serviceCommitmentId">${commitmentOptions(control)}</select></label><label>Tijdklasse<select name="timeClass">${options(["RECURRING_SERVICE", "SALES", "IMPLEMENTATION"], "RECURRING_SERVICE")}</select></label><label>Categorie<select name="category">${options(["SUPPORT", "CUSTOMER_CONTACT", "INCIDENT", "OPERATIONS", "REVIEW", "CODEX_DIRECTION"], "SUPPORT")}</select></label><fieldset class="wbd-effort-minutes"><legend>Minuten</legend>${[5, 15, 30, 60].map((minutes) => `<button type="button" data-effort-minutes="${minutes}" aria-pressed="${minutes === 15}">${minutes} min</button>`).join("")}<input name="minutes" type="hidden" value="15"></fieldset><label>Context<input name="context" maxlength="500"></label><label>Bronreferenties<textarea name="sourceRefs">Handmatige tijdwaarneming Donovan</textarea></label>${sourceFields(dateInput(8))}<button type="submit">Effort registreren</button></form></details>
  </div><p class="wbd-control-message" data-control-message role="status"></p></section>`;
}

export function renderControlHome(topbar: string, control: ControlView, overview: ControlOverview): string {
  const reliabilityTone = overview.reliability.status === "BETROUWBAAR" ? "healthy" : overview.reliability.status === "GEDEELTELIJK BETROUWBAAR" ? "partial" : "blocked";
  const attention = overview.attention.length ? overview.attention.map((item) => `<article class="wbd-control-row"><div><span>${esc(item.kind.replaceAll("_", " "))} · ${esc(item.priority)}</span><strong>${esc(item.title)}</strong>${item.reason ? `<p>${esc(item.reason)}</p>` : ""}<small>${item.dueAt ? `Uiterlijk ${esc(dateLabel(item.dueAt))}` : "Geen deadline"}</small></div>${item.kind === "OWNER_ACTION" ? `<button type="button" data-complete-action="${esc(item.id)}">Afronden</button>` : ""}</article>`).join("") : `<p class="wbd-control-empty">${overview.reliability.noAttentionNeeded ? "Geen bekende actie nodig binnen gezonde en complete bronnen." : "Geen bevestigde acties, maar de brondekking staat nog geen stilteclaim toe."}</p>`;
  const opportunities = overview.opportunities.length ? overview.opportunities.map((opportunity) => `<article class="wbd-control-opportunity"><span>${esc(opportunity.organizationName)} · ${esc(opportunity.proposalStatus)}</span><h3>${esc(opportunity.title)}</h3><p>${esc(opportunity.problemOrOpportunity)}</p><dl><div><dt>Eenmalig</dt><dd>${euro(opportunity.expectedOneOffRevenue)}</dd></div><div><dt>MRR</dt><dd>${euro(opportunity.expectedMrr)}</dd></div><div><dt>Review</dt><dd>${esc(dateLabel(opportunity.nextReviewAt))}</dd></div></dl>${opportunity.ownerAction ? `<small>Actie: ${esc(opportunity.ownerAction.title)}</small>` : `<small>Geen gekoppelde Owner Action</small>`}</article>`).join("") : '<p class="wbd-control-empty">Nog geen canonieke OPEN opportunities.</p>';
  const exceptions = overview.responsibilityExceptions.length ? overview.responsibilityExceptions.map((item) => `<article class="wbd-control-row"><div><span>${esc(item.organizationName)} · ${esc(item.sourceStatus)}</span><strong>Commitment vraagt review</strong><p>${item.responsibilities.map(({ description, responsibleParty }) => `${esc(responsibleParty)} · ${esc(description)}`).join("<br>")}</p><small>${item.renewalReviewAt ? `Review ${esc(dateLabel(item.renewalReviewAt))}` : "Geen reviewdatum"}</small></div></article>`).join("") : '<p class="wbd-control-empty">Geen responsibility-uitzonderingen binnen de bekende commitments.</p>';
  return `<main class="wbd-owner-workspace">${topbar}<section class="wbd-control-hero"><div><p class="wbd-owner-eyebrow">Control Plane V0.1 · centrale ownerwaarheid</p><h1>Home</h1><p>Alleen bevestigde feiten. UNKNOWN, STALE of FAILED blijft zichtbaar wanneer de werkelijkheid nog niet betrouwbaar genoeg is.</p></div><div class="wbd-control-reliability" data-tone="${reliabilityTone}"><span>Betrouwbaarheid</span><strong>${esc(overview.reliability.status)}</strong><small>${overview.reliability.blockers.length} relevante blocker${overview.reliability.blockers.length === 1 ? "" : "s"}</small></div></section>
    ${overview.reliability.blockers.length ? `<section class="wbd-control-blockers" aria-label="Bronblockers">${overview.reliability.blockers.map((blocker) => `<article><strong>${esc(blocker.sourceId)}</strong><span>${esc(blocker.status)} · ${esc(blocker.coverage)} · ${esc(blocker.impact)}</span><p>${esc(blocker.message)}</p>${blocker.lastKnownGoodAt ? `<small>Last-known-good: ${esc(dateLabel(blocker.lastKnownGoodAt))}</small>` : ""}</article>`).join("")}</section>` : ""}
    <section class="wbd-control-metrics" aria-label="Bedrijfspositie"><article><span>Confirmed contracted MRR</span><strong>${euro(overview.company.confirmedContractedMrr)}</strong></article><article><span>Actieve commitments</span><strong>${overview.company.activeCommitments}</strong></article><article><span>Recurring Donovan-tijd</span><strong>${overview.company.recurringMinutes === null ? "ONVOLDOENDE BEWIJS" : `${overview.company.recurringMinutes} min`}</strong></article><article><span>MRR / recurring uur</span><strong>${overview.company.mrrPerRecurringHour === null ? "ONVOLDOENDE BEWIJS" : euro(overview.company.mrrPerRecurringHour)}</strong></article></section>
    <div class="wbd-control-columns"><section class="wbd-control-panel"><header><p class="wbd-owner-eyebrow">Management by exception</p><h2>Donovan nodig</h2></header>${attention}</section><section class="wbd-control-panel"><header><p class="wbd-owner-eyebrow">Bevestigd</p><h2>Kansen</h2></header>${opportunities}</section></div>
    <div class="wbd-control-columns"><section class="wbd-control-panel"><header><p class="wbd-owner-eyebrow">Verantwoordelijkheid</p><h2>Alleen uitzonderingen</h2></header>${exceptions}</section><section class="wbd-control-panel wbd-next-best"><header><p class="wbd-owner-eyebrow">Evidence first</p><h2>Next Best Action</h2></header>${overview.nextBestAction ? `<strong>${esc(overview.nextBestAction.title)}</strong><p>${esc(overview.nextBestAction.reason)}</p><small>${esc(overview.nextBestAction.priority)}${overview.nextBestAction.dueAt ? ` · ${esc(dateLabel(overview.nextBestAction.dueAt))}` : ""}</small>` : '<p class="wbd-control-empty">ONVOLDOENDE BEWIJS VOOR ÉÉN BESTE VOLGENDE ACTIE</p>'}<a href="${esc(overview.capabilitiesPath)}">Bekijk wat WBD al kan</a></section></div>
    ${recordForms(control)}
    <section class="wbd-control-panel wbd-effort-history"><header><p class="wbd-owner-eyebrow">Traceerbaar</p><h2>Recente effortwaarnemingen</h2></header>${control.effortObservations.slice().reverse().slice(0, 8).map((effort) => `<article class="wbd-control-row"><div><span>${esc(effort.timeClass)} · ${esc(effort.category)}</span><strong>${effort.minutes} minuten · ${esc(effort.status)}</strong><p>${esc(effort.context ?? "Geen aanvullende context")}</p><small>${esc(dateLabel(effort.capturedAt))}</small></div>${effort.status === "ACTIVE" ? `<form data-void-effort="${esc(effort.id)}"><input name="voidReason" aria-label="Reden correctie" placeholder="Reden voor void" required maxlength="500"><button type="submit">Void</button></form>` : ""}</article>`).join("") || '<p class="wbd-control-empty">Nog geen effortwaarnemingen. Afwezigheid wordt niet als nul geïnterpreteerd.</p>'}</section>
    <footer class="wbd-owner-footer"><span>Centrale bron · revisie ${control.revision}</span><span>Release ${esc(control.releaseId)}</span><span>Geen browserdata geïmporteerd.</span></footer></main>`;
}

function refs(value: FormDataEntryValue | null): string[] {
  return String(value ?? "").split(/[\n,]/gu).map((part) => part.trim()).filter(Boolean);
}

function isoDate(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw ? `${raw}T00:00:00.000Z` : null;
}

function amount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : Number(raw);
}

function sourceHealth(fields: FormData): Record<string, unknown> {
  return { coverage: fields.get("sourceCoverage"), impact: fields.get("sourceImpact"), reviewDueAt: isoDate(fields.get("sourceReviewDueAt")), permitsNoAttentionClaim: fields.get("permitsNoAttentionClaim") === "on" };
}

function formPayload(recordType: ControlRecordType, fields: FormData): Record<string, unknown> {
  const commonSource = sourceHealth(fields);
  if (recordType === "organizations") return { name: fields.get("name"), relationshipType: fields.get("relationshipType"), status: fields.get("status"), reviewedAt: isoDate(fields.get("reviewedAt")), sourceRefs: refs(fields.get("sourceRefs")), sourceHealth: commonSource };
  if (recordType === "opportunities") return { organizationId: fields.get("organizationId"), title: fields.get("title"), problemOrOpportunity: fields.get("problemOrOpportunity"), status: fields.get("status"), valueType: fields.get("valueType"), expectedOneOffRevenue: amount(fields.get("expectedOneOffRevenue")), expectedMrr: amount(fields.get("expectedMrr")), proposalStatus: fields.get("proposalStatus"), evidenceRefs: refs(fields.get("evidenceRefs")), nextReviewAt: isoDate(fields.get("nextReviewAt")), ownerActionId: fields.get("ownerActionId") || null, sourceHealth: commonSource };
  if (recordType === "commitments") return { organizationId: fields.get("organizationId"), status: fields.get("status"), contractedMrr: amount(fields.get("contractedMrr")), startsAt: isoDate(fields.get("startsAt")), endsAt: isoDate(fields.get("endsAt")), renewalReviewAt: isoDate(fields.get("renewalReviewAt")), responsibilities: [{ description: fields.get("responsibilityDescription"), responsibleParty: fields.get("responsibleParty") }], sourceRefs: refs(fields.get("sourceRefs")), sourceHealth: commonSource };
  if (recordType === "actions") {
    const [subjectType, subjectId] = String(fields.get("subject") ?? "|").split("|");
    return { subjectType, subjectId, title: fields.get("title"), reasonDonovanNeeded: fields.get("reasonDonovanNeeded"), status: "OPEN", priority: fields.get("priority"), dueAt: isoDate(fields.get("dueAt")), sourceRefs: refs(fields.get("sourceRefs")), sourceHealth: commonSource };
  }
  return { organizationId: fields.get("organizationId"), serviceCommitmentId: fields.get("serviceCommitmentId") || null, timeClass: fields.get("timeClass"), category: fields.get("category"), minutes: Number(fields.get("minutes")), context: fields.get("context") || null, capturedAt: new Date().toISOString(), sourceRefs: refs(fields.get("sourceRefs")), sourceHealth: commonSource, correctionOf: null };
}

export function bindControlHome(app: HTMLDivElement, control: ControlView, handlers: { create: (recordType: ControlRecordType, payload: Record<string, unknown>) => Promise<void>; patch: (recordType: ControlRecordType, recordId: string, payload: Record<string, unknown>) => Promise<void> }): void {
  const message = app.querySelector<HTMLElement>("[data-control-message]");
  const run = async (operation: () => Promise<void>, pending: string): Promise<void> => {
    if (message) message.textContent = pending;
    try { await operation(); } catch (cause) { if (message) message.textContent = cause instanceof Error ? cause.message : "De centrale wijziging is mislukt."; }
  };
  app.querySelectorAll<HTMLButtonElement>("[data-effort-minutes]").forEach((button) => button.addEventListener("click", () => {
    const form = button.closest("form")!;
    form.querySelectorAll<HTMLButtonElement>("[data-effort-minutes]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
    form.querySelector<HTMLInputElement>('input[name="minutes"]')!.value = button.dataset.effortMinutes!;
  }));
  app.querySelectorAll<HTMLFormElement>("[data-control-form]").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const recordType = form.dataset.controlForm as ControlRecordType;
    void run(() => handlers.create(recordType, formPayload(recordType, new FormData(form))), "Centrale waarheid wordt vastgelegd…");
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-complete-action]").forEach((button) => button.addEventListener("click", () => {
    const action = control.ownerActions.find(({ id }) => id === button.dataset.completeAction);
    if (action) void run(() => handlers.patch("actions", action.id, { status: "DONE", expectedRecordRevision: action.revision }), "Actie wordt afgerond…");
  }));
  app.querySelectorAll<HTMLFormElement>("[data-void-effort]").forEach((form) => form.addEventListener("submit", (event) => {
    event.preventDefault();
    const effort = control.effortObservations.find(({ id }) => id === form.dataset.voidEffort);
    if (effort) void run(() => handlers.patch("effort-observations", effort.id, { status: "VOIDED", voidReason: new FormData(form).get("voidReason"), expectedRecordRevision: effort.revision }), "Effortwaarneming wordt traceerbaar gecorrigeerd…");
  }));
}
