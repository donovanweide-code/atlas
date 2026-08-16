import type {
  ControlAction,
  ControlCommitment,
  ControlEffort,
  ControlOpportunity,
  ControlOrganization,
  ControlView,
} from "./wbd-control-home.ts";

const organizationsPath = "/workspace/wbd/organisaties";
const capabilitiesPath = "/workspace/wbd/capabilities";

const esc = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const humanLabels: Record<string, string> = {
  OWN_ORGANIZATION: "eigen organisatie", CUSTOMER: "klant", PROSPECT: "prospect", PARTNER: "partner",
  ACTIVE: "actief", INACTIVE: "inactief", ARCHIVED: "gearchiveerd", UNKNOWN: "onbekend",
  OPEN: "open", ON_HOLD: "gepauzeerd", WON: "gewonnen", LOST: "verloren",
  NONE: "geen voorstel", DRAFT: "concept", SENT: "verzonden", ACCEPTED: "geaccepteerd", DECLINED: "afgewezen",
  WBD: "WBD", SHARED: "gezamenlijk", EXTERNAL_PROVIDER: "externe leverancier",
  CRITICAL: "kritiek", HIGH: "hoog", MEDIUM: "normaal", LOW: "laag",
  RECURRING_SERVICE: "recurring service", SALES: "sales", IMPLEMENTATION: "implementatie",
  SUPPORT: "support", CUSTOMER_CONTACT: "klantcontact", INCIDENT: "incident", OPERATIONS: "operations", REVIEW: "review", CODEX_DIRECTION: "Codex-regie",
};
const human = (value: string): string => humanLabels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("nl-NL");
const dateLabel = (value: string | null): string => value ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "ONBEKEND";
const euro = (value: number | null): string => value === null ? "ONBEKEND" : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
const priorityScore: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export interface OrganizationContext {
  organization: ControlOrganization;
  opportunities: ControlOpportunity[];
  commitments: ControlCommitment[];
  actions: ControlAction[];
  effort: ControlEffort[];
}

function isOrganizationAction(action: ControlAction, organizationId: string, opportunities: Set<string>, commitments: Set<string>): boolean {
  if (action.subjectType === "ORGANIZATION") return action.subjectId === organizationId;
  if (action.subjectType === "OPPORTUNITY") return opportunities.has(action.subjectId);
  if (action.subjectType === "SERVICE_COMMITMENT") return commitments.has(action.subjectId);
  return false;
}

export function organizationContext(control: ControlView, organizationId: string): OrganizationContext | null {
  const organization = control.organizations.find(({ id, status }) => id === organizationId && status !== "ARCHIVED");
  if (!organization) return null;
  const opportunities = control.opportunities.filter((item) => item.organizationId === organizationId);
  const commitments = control.serviceCommitments.filter((item) => item.organizationId === organizationId);
  const opportunityIds = new Set(opportunities.map(({ id }) => id));
  const commitmentIds = new Set(commitments.map(({ id }) => id));
  const actions = control.ownerActions.filter((item) => isOrganizationAction(item, organizationId, opportunityIds, commitmentIds));
  const effort = control.effortObservations.filter((item) => item.organizationId === organizationId);
  return { organization, opportunities, commitments, actions, effort };
}

function nextOwnerAction(actions: ControlAction[]): ControlAction | null {
  return actions.filter(({ status }) => status === "OPEN").sort((left, right) => {
    const dueDifference = (left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER) - (right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER);
    return dueDifference || (priorityScore[right.priority] ?? 0) - (priorityScore[left.priority] ?? 0);
  })[0] ?? null;
}

function relevantOpportunity(opportunities: ControlOpportunity[]): ControlOpportunity | null {
  return opportunities.filter(({ status }) => status === "OPEN").sort((left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt))[0] ?? null;
}

function sourceDetails(control: ControlView, sourceHealthId: string, sourceRefs: string[]): string {
  const source = control.sourceHealth.find(({ sourceId }) => sourceId === sourceHealthId);
  return `<details class="wbd-context-details"><summary>Waarom weten we dit?</summary><p>${sourceRefs.length ? sourceRefs.map(esc).join(" · ") : "Geen menselijke bronreferentie beschikbaar."}</p><small>Bronstatus: ${esc(source?.status ?? "UNKNOWN")} · dekking: ${esc(source?.coverage ?? "UNKNOWN")}${source?.lastKnownGoodAt ? ` · laatst goed ${esc(dateLabel(source.lastKnownGoodAt))}` : ""}</small></details>`;
}

function organizationSummary(control: ControlView, organization: ControlOrganization): string {
  const context = organizationContext(control, organization.id)!;
  const openActions = context.actions.filter(({ status }) => status === "OPEN").length;
  const openOpportunities = context.opportunities.filter(({ status }) => status === "OPEN").length;
  const activeCommitments = context.commitments.filter(({ status }) => status === "ACTIVE").length;
  const attention = openActions ? `${openActions} bevestigde ${openActions === 1 ? "actie" : "acties"}` : "Geen bevestigde actie";
  return `<a class="wbd-directory-card" href="${organizationsPath}/${encodeURIComponent(organization.id)}" data-organization-entry data-search="${esc(`${organization.name} ${organization.relationshipType} ${organization.status}`.toLocaleLowerCase("nl-NL"))}" data-relationship="${esc(organization.relationshipType)}" data-status="${esc(organization.status)}">
    <header><div><span>${esc(human(organization.relationshipType))}</span><h2>${esc(organization.name)}</h2></div><span class="wbd-context-chip" data-status="${esc(organization.status)}">${esc(human(organization.status))}</span></header>
    <p>${esc(attention)}</p><dl><div><dt>Kansen</dt><dd>${openOpportunities}</dd></div><div><dt>Afspraken</dt><dd>${activeCommitments}</dd></div><div><dt>Acties</dt><dd>${openActions}</dd></div></dl><strong>Open context →</strong>
  </a>`;
}

export function renderOrganizationDirectory(topbar: string, control: ControlView): string {
  const organizations = control.organizations.filter(({ status }) => status !== "ARCHIVED").sort((left, right) => left.name.localeCompare(right.name, "nl"));
  return `<main class="wbd-owner-workspace wbd-context-workspace">${topbar}<div class="wbd-context-worklayer"><header class="wbd-context-pagehead"><div><p class="wbd-owner-eyebrow">Centrale bevestigde waarheid</p><h1>Organisaties</h1><p>Open één relatie en zie uitsluitend wat al canoniek in de WBD Control Plane staat.</p></div><strong>${organizations.length}</strong></header>
    <section class="wbd-directory-tools" aria-label="Organisaties zoeken en filteren"><label>Zoeken<input type="search" data-organization-search placeholder="Zoek op naam, relatie of status" autocomplete="off"></label><label>Relatie<select data-organization-relationship><option value="">Alle relaties</option><option value="OWN_ORGANIZATION">Eigen organisatie</option><option value="CUSTOMER">Klant</option><option value="PROSPECT">Prospect</option><option value="PARTNER">Partner</option></select></label><label>Status<select data-organization-status><option value="">Alle statussen</option><option value="ACTIVE">Actief</option><option value="INACTIVE">Inactief</option><option value="UNKNOWN">Onbekend</option></select></label></section>
    <p class="wbd-directory-count" data-organization-count>${organizations.length} ${organizations.length === 1 ? "organisatie" : "organisaties"} zichtbaar</p>
    <section class="wbd-directory-list" aria-live="polite">${organizations.map((organization) => organizationSummary(control, organization)).join("") || '<p class="wbd-context-empty">Nog geen bevestigde organisaties.</p>'}</section>
    <p class="wbd-context-empty" data-organization-no-results hidden>Geen organisaties binnen deze zoekopdracht en filters.</p>
    <footer class="wbd-owner-footer"><span>Centrale Control Plane · revisie ${control.revision}</span><span>Geen browserdossiers geïmporteerd.</span></footer></div></main>`;
}

function opportunityCard(opportunity: ControlOpportunity, organizationName: string, linkedAction: ControlAction | null): string {
  return `<article class="wbd-context-record"><header><div><span>${esc(organizationName)} · ${esc(human(opportunity.proposalStatus))}</span><h3>${esc(opportunity.title)}</h3></div><span class="wbd-context-chip" data-status="${esc(opportunity.status)}">${esc(human(opportunity.status))}</span></header><p>${esc(opportunity.problemOrOpportunity)}</p><dl><div><dt>Eenmalig</dt><dd>${euro(opportunity.expectedOneOffRevenue)}</dd></div><div><dt>MRR</dt><dd>${euro(opportunity.expectedMrr)}</dd></div><div><dt>Review</dt><dd>${esc(dateLabel(opportunity.nextReviewAt))}</dd></div></dl><small>${linkedAction ? `Gekoppelde actie: ${esc(linkedAction.title)}` : "Geen gekoppelde Owner Action"}</small></article>`;
}

export function renderOpportunityDirectory(topbar: string, control: ControlView): string {
  const opportunities = control.opportunities.slice().sort((left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt));
  return `<main class="wbd-owner-workspace wbd-context-workspace">${topbar}<div class="wbd-context-worklayer"><header class="wbd-context-pagehead"><div><p class="wbd-owner-eyebrow">Cross-organization</p><h1>Kansen</h1><p>Alleen door Donovan bevestigde Opportunities. Atlas Candidates en historische ideeën staan hier niet tussen.</p></div><strong>${opportunities.length}</strong></header><section class="wbd-context-stack">${opportunities.map((opportunity) => {
    const organization = control.organizations.find(({ id }) => id === opportunity.organizationId);
    const linkedAction = opportunity.ownerActionId ? control.ownerActions.find(({ id }) => id === opportunity.ownerActionId) ?? null : control.ownerActions.find(({ subjectType, subjectId }) => subjectType === "OPPORTUNITY" && subjectId === opportunity.id) ?? null;
    return `<a class="wbd-context-record-link" href="${organizationsPath}/${encodeURIComponent(opportunity.organizationId)}">${opportunityCard(opportunity, organization?.name ?? "Onbekende organisatie", linkedAction)}</a>`;
  }).join("") || '<p class="wbd-context-empty">Nog geen canonieke Opportunities.</p>'}</section><footer class="wbd-owner-footer"><span>Centrale Control Plane · revisie ${control.revision}</span><span>Geen candidate-store.</span></footer></div></main>`;
}

function actionCard(action: ControlAction): string {
  return `<article class="wbd-context-record"><header><div><span>${esc(human(action.priority))} · ${esc(human(action.status))}</span><h3>${esc(action.title)}</h3></div>${action.status === "OPEN" ? '<span class="wbd-context-chip" data-status="OPEN">Donovan nodig</span>' : ""}</header><p>${esc(action.reasonDonovanNeeded)}</p><small>${action.dueAt ? `Uiterlijk ${esc(dateLabel(action.dueAt))}` : "Geen bevestigde deadline"}</small></article>`;
}

function commitmentCard(control: ControlView, commitment: ControlCommitment): string {
  return `<article class="wbd-context-record"><header><div><span>Service Commitment</span><h3>${commitment.status === "UNKNOWN" ? "Actuele afspraak nog niet volledig bekend" : `${esc(human(commitment.status))}e afspraak`}</h3></div><span class="wbd-context-chip" data-status="${esc(commitment.status)}">${esc(human(commitment.status))}</span></header><dl><div><dt>Gecontracteerde MRR</dt><dd>${euro(commitment.contractedMrr)}</dd></div><div><dt>Start</dt><dd>${esc(dateLabel(commitment.startsAt))}</dd></div><div><dt>Review</dt><dd>${esc(dateLabel(commitment.renewalReviewAt))}</dd></div></dl><div class="wbd-responsibilities">${commitment.responsibilities.length ? commitment.responsibilities.map(({ description, responsibleParty }) => `<p><strong>${esc(human(responsibleParty))}</strong>${esc(description)}</p>`).join("") : "<p>Responsibility: ONBEKEND</p>"}</div>${sourceDetails(control, commitment.sourceHealthId, commitment.sourceRefs)}</article>`;
}

function effortView(effort: ControlEffort[]): string {
  const active = effort.filter(({ status }) => status === "ACTIVE");
  if (!active.length) return '<p class="wbd-context-empty">ONBEKEND — er zijn geen centrale Effort Observations. Dit betekent niet nul uur.</p>';
  const recurring = active.filter(({ timeClass }) => timeClass === "RECURRING_SERVICE").reduce((total, item) => total + item.minutes, 0);
  const sales = active.filter(({ timeClass }) => timeClass === "SALES").reduce((total, item) => total + item.minutes, 0);
  const implementation = active.filter(({ timeClass }) => timeClass === "IMPLEMENTATION").reduce((total, item) => total + item.minutes, 0);
  return `<dl class="wbd-context-metrics"><div><dt>Recurring service</dt><dd>${recurring} min</dd></div><div><dt>Sales</dt><dd>${sales} min</dd></div><div><dt>Implementatie</dt><dd>${implementation} min</dd></div></dl><details class="wbd-context-details"><summary>Waarnemingen bekijken</summary>${active.slice().reverse().map((item) => `<p><strong>${item.minutes} min · ${esc(human(item.category))}</strong><span>${esc(item.context ?? "Geen aanvullende context")} · ${esc(dateLabel(item.capturedAt))}</span></p>`).join("")}</details>`;
}

export function renderOrganizationContext(topbar: string, control: ControlView, organizationId: string, capabilityCount: number): string {
  const context = organizationContext(control, organizationId);
  if (!context) return `<main class="wbd-owner-workspace wbd-context-workspace">${topbar}<div class="wbd-context-worklayer"><a class="wbd-context-back" href="${organizationsPath}">← Alle organisaties</a><section class="wbd-context-panel"><h1>Organization niet gevonden</h1><p>Deze route verwijst niet naar een actieve centrale Organization.</p></section></div></main>`;
  const { organization, opportunities, commitments, actions, effort } = context;
  const nextAction = nextOwnerAction(actions);
  const opportunity = relevantOpportunity(opportunities);
  const activeCommitments = commitments.filter(({ status }) => status !== "ENDED");
  return `<main class="wbd-owner-workspace wbd-context-workspace">${topbar}<div class="wbd-context-worklayer"><a class="wbd-context-back" href="${organizationsPath}">← Alle organisaties</a>
    <header class="wbd-context-hero"><div><p class="wbd-owner-eyebrow">${esc(human(organization.relationshipType))}</p><h1>${esc(organization.name)}</h1><p>${organization.status === "UNKNOWN" ? "De actuele status is nog niet bevestigd." : `Bevestigde status: ${esc(human(organization.status))}.`}</p></div><dl><div><dt>Huidige fase</dt><dd>Niet centraal beschikbaar</dd></div><div><dt>Volgende actie</dt><dd>${nextAction ? esc(nextAction.title) : "Geen bevestigde actie"}</dd></div><div><dt>Relevante kans</dt><dd>${opportunity ? esc(opportunity.title) : "Geen open kans"}</dd></div></dl>${sourceDetails(control, organization.sourceHealthId, organization.sourceRefs)}</header>
    <div class="wbd-context-grid"><section class="wbd-context-panel"><header><p class="wbd-owner-eyebrow">Donovan nodig</p><h2>Acties</h2></header>${actions.length ? actions.map(actionCard).join("") : '<p class="wbd-context-empty">Geen canonieke Owner Actions voor deze organisatie.</p>'}</section>
    <section class="wbd-context-panel"><header><p class="wbd-owner-eyebrow">Bevestigd</p><h2>Kansen</h2></header>${opportunities.length ? opportunities.map((item) => opportunityCard(item, organization.name, actions.find(({ subjectType, subjectId }) => subjectType === "OPPORTUNITY" && subjectId === item.id) ?? null)).join("") : '<p class="wbd-context-empty">Geen canonieke Opportunities voor deze organisatie.</p>'}</section></div>
    <section class="wbd-context-panel"><header><p class="wbd-owner-eyebrow">Commerciële verantwoordelijkheid</p><h2>Afspraken & responsibility</h2></header>${activeCommitments.length ? activeCommitments.map((item) => commitmentCard(control, item)).join("") : '<p class="wbd-context-empty">ONBEKEND — er is geen actieve centrale Service Commitment. Hieruit volgt geen aanname over MRR of verantwoordelijkheid.</p>'}</section>
    <div class="wbd-context-grid"><section class="wbd-context-panel"><header><p class="wbd-owner-eyebrow">Menselijke inspanning</p><h2>Effort</h2></header>${effortView(effort)}</section><section class="wbd-context-panel"><header><p class="wbd-owner-eyebrow">WBD-brede bron</p><h2>Capabilities</h2></header><p>De centrale catalogus bevat ${capabilityCount} WBD-capabilities. V1A koppelt daarvan bewust geen status aan deze Organization.</p><a class="wbd-context-action" href="${capabilitiesPath}">Open centrale Capability Catalogus</a></section></div>
    <section class="wbd-context-panel wbd-context-unknown"><header><p class="wbd-owner-eyebrow">Eerlijke grens</p><h2>Nog niet centraal beschikbaar</h2></header><p>Omgevingen, historische milestones, Organization–Capability-gebruik, integraties, monitoring, usage en financiële bronprojecties zijn in V1A niet als canonieke Organization-waarheid vastgelegd.</p><p>Lokale dossiers, IndexedDB, Finance en Atlas-documentatie zijn niet geïmporteerd.</p></section>
    <footer class="wbd-owner-footer"><span>Centrale Control Plane · revisie ${control.revision}</span><span>Organization-record · revisie ${organization.revision}</span><span>Geen historische bootstrap.</span></footer></div></main>`;
}

export function bindOrganizationDirectory(app: HTMLDivElement): void {
  const search = app.querySelector<HTMLInputElement>("[data-organization-search]");
  const relationship = app.querySelector<HTMLSelectElement>("[data-organization-relationship]");
  const status = app.querySelector<HTMLSelectElement>("[data-organization-status]");
  const entries = [...app.querySelectorAll<HTMLElement>("[data-organization-entry]")];
  const count = app.querySelector<HTMLElement>("[data-organization-count]");
  const empty = app.querySelector<HTMLElement>("[data-organization-no-results]");
  const apply = (): void => {
    const query = search?.value.trim().toLocaleLowerCase("nl-NL") ?? "";
    let visible = 0;
    for (const entry of entries) {
      const matches = (!query || (entry.dataset.search ?? "").includes(query))
        && (!relationship?.value || entry.dataset.relationship === relationship.value)
        && (!status?.value || entry.dataset.status === status.value);
      entry.hidden = !matches;
      if (matches) visible += 1;
    }
    if (count) count.textContent = `${visible} ${visible === 1 ? "organisatie" : "organisaties"} zichtbaar`;
    if (empty) empty.hidden = visible !== 0;
  };
  search?.addEventListener("input", apply);
  relationship?.addEventListener("change", apply);
  status?.addEventListener("change", apply);
}
