import { bindControlHome, renderControlHome, type ControlOverview, type ControlRecordType, type ControlView, type PromotionView } from "./wbd-control-home.ts";
import { bindOrganizationDirectory, renderOrganizationContext, renderOrganizationDirectory, renderOpportunityDirectory } from "./wbd-organization-context.ts";
import {
  bindAtlasSearch,
  renderAtlasAttention,
  renderAtlasSearch,
  renderAtlasToday,
  type AtlasSearchView,
  type AtlasWorkspaceView,
} from "./wbd-atlas-owner.ts";

type CapabilityStatus = "PROVEN_REUSABLE" | "PROVEN_PRODUCT_SPECIFIC" | "PARTIAL" | "DESIGN_ONLY" | "EXTERNAL_SOLUTION_PREFERRED" | "LEGACY" | "UNKNOWN";
type StrategicJudgement = "INVEST" | "INTEGRATE" | "MAINTAIN" | "WATCH" | "RETIRE";
type Level = "HIGH" | "MEDIUM" | "LOW";
type FilterId = "all" | "sell" | "proven" | "reusable" | "partial" | "decision";

interface Evidence { source: string; date: string; provenAt: string; summary: string; type: string }
interface Capability {
  id: string; name: string; category: string; status: CapabilityStatus; evidence: Evidence[];
  lastEvidenceDate: string; provenAt: string[]; reusability: Level; customerSpecificShare: Level;
  implementationClass: "XS" | "S" | "M" | "L"; sellNow: boolean; demoReady: boolean;
  customer2Reuse: Level; strategicJudgement: StrategicJudgement; guidance: string;
}
interface SessionView { owner: { name: string; email: string; role: "OWNER" }; csrfToken: string; expiresAt: string; releaseId: string }
interface CatalogView { organization: { id: string; name: string }; revision: number; capabilities: Capability[]; source: "central-wbd-owner-state"; releaseId: string }

const statusLabels: Record<CapabilityStatus, string> = {
  PROVEN_REUSABLE: "Bewezen · herbruikbaar", PROVEN_PRODUCT_SPECIFIC: "Bewezen · productspecifiek",
  PARTIAL: "Gedeeltelijk", DESIGN_ONLY: "Alleen ontworpen", EXTERNAL_SOLUTION_PREFERRED: "Bestaande oplossing eerst",
  LEGACY: "Verouderd", UNKNOWN: "Onbekend",
};
const judgementLabels: Record<StrategicJudgement, string> = { INVEST: "Investeren", INTEGRATE: "Integreren", MAINTAIN: "Onderhouden", WATCH: "Bewaken", RETIRE: "Niet voortzetten" };
const levelLabels: Record<Level, string> = { HIGH: "Hoog", MEDIUM: "Middel", LOW: "Laag" };
const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Alles" }, { id: "sell", label: "Nu verkoopbaar" }, { id: "proven", label: "Bewezen" },
  { id: "reusable", label: "Herbruikbaar" }, { id: "partial", label: "Gedeeltelijk" },
  { id: "decision", label: "Bewaken / integreren / stoppen" },
];
const capabilitiesPath = "/workspace/wbd/capabilities";
const homePath = "/workspace/wbd/home";
const attentionPath = "/workspace/wbd/attention";
const searchPath = "/workspace/wbd/zoeken";
const managementPath = "/workspace/wbd/beheer";
const organizationsPath = "/workspace/wbd/organisaties";
const opportunitiesPath = "/workspace/wbd/kansen";
const workContextPath = "/workspace/wbd/werkcontext";
const localWorkContextUrl = "http://127.0.0.1:5173/workspace/wbd/overzicht";
const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

interface WorkContextDeviceInput {
  userAgent: string;
  userAgentData?: { mobile?: boolean };
}

export function isMobileWorkContextDevice({ userAgent, userAgentData }: WorkContextDeviceInput): boolean {
  if (typeof userAgentData?.mobile === "boolean") return userAgentData.mobile;
  const iphoneSafari = /\biPhone\b/iu.test(userAgent)
    && /\bMobile(?:\/|\b)/iu.test(userAgent)
    && /\bSafari\//iu.test(userAgent)
    && !/\b(?:CriOS|FxiOS|EdgiOS|OPiOS)\//iu.test(userAgent);
  return iphoneSafari;
}

function isCurrentDeviceMobile(): boolean {
  const browserNavigator = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return isMobileWorkContextDevice({
    userAgent: browserNavigator.userAgent,
    userAgentData: browserNavigator.userAgentData,
  });
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", headers: { Accept: "application/json", ...options.headers } });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw Object.assign(new Error(body.message || "WBD Workspace is tijdelijk niet beschikbaar."), { status: response.status });
  return body as T;
}

function loginView(message = ""): string {
  return `<main class="wbd-owner-login">
    <section class="wbd-owner-login__brand" aria-labelledby="login-title"><span class="wbd-owner-mark" aria-hidden="true">W</span><p>WBD Workspace</p><h1 id="login-title">Eén veilige plek voor wat WBD werkelijk kan.</h1><small>Owner Foundation · centrale gegevens · geen klantworkspace</small></section>
    <section class="wbd-owner-login__panel"><form data-owner-login><p class="wbd-owner-eyebrow">Alleen voor Donovan</p><h2>Inloggen</h2>${message ? `<p class="wbd-owner-alert" role="alert">${escapeHtml(message)}</p>` : ""}<label>E-mailadres<input name="email" type="email" autocomplete="username" inputmode="email" required></label><label>Wachtwoord<input name="password" type="password" autocomplete="current-password" minlength="12" required></label><label class="wbd-owner-device"><input name="personal" type="checkbox"> Dit is mijn persoonlijke apparaat</label><button type="submit">Veilig inloggen</button></form></section>
  </main>`;
}

function matchesFilter(capability: Capability, filter: FilterId): boolean {
  if (filter === "sell") return capability.sellNow;
  if (filter === "proven") return capability.status.startsWith("PROVEN_");
  if (filter === "reusable") return capability.status === "PROVEN_REUSABLE" || capability.reusability === "HIGH";
  if (filter === "partial") return capability.status === "PARTIAL";
  if (filter === "decision") return new Set<StrategicJudgement>(["WATCH", "INTEGRATE", "RETIRE"]).has(capability.strategicJudgement);
  return true;
}

function capabilityCard(capability: Capability, atlas?: AtlasWorkspaceView): string {
  const proof = capability.provenAt.length ? capability.provenAt.join(" · ") : "Nog nergens bewezen";
  const registry = atlas?.capabilityRegistry.find(({ id }) => id === capability.id);
  return `<article class="wbd-capability" data-capability-id="${escapeHtml(capability.id)}" data-status="${escapeHtml(capability.status)}">
    <header><div><p>${escapeHtml(capability.category)}</p><h2>${escapeHtml(capability.name)}</h2></div><span class="wbd-capability__sell" data-sell="${capability.sellNow}">${capability.sellNow ? "Nu verkoopbaar" : "Nog niet verkopen"}</span></header>
    <div class="wbd-capability__status"><span>${escapeHtml(statusLabels[capability.status])}</span><span>${escapeHtml(judgementLabels[capability.strategicJudgement])}</span></div>
    <p class="wbd-capability__guidance">${escapeHtml(capability.guidance)}</p>
    <dl><div><dt>Maturity</dt><dd>${escapeHtml(registry?.maturity ?? "ONBEKEND")}</dd></div><div><dt>Bewezen bij</dt><dd>${escapeHtml(proof)}</dd></div><div><dt>Evidence</dt><dd>${registry?.evidenceRefs.length ?? capability.evidence.length} gekoppeld</dd></div><div><dt>Hergebruik</dt><dd>${escapeHtml(registry?.reusable ?? levelLabels[capability.reusability])}</dd></div></dl>
    <details><summary>Bewijs en grenzen</summary><div class="wbd-capability__evidence">${capability.evidence.map((item) => `<article><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><strong>${escapeHtml(item.provenAt)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</small></article>`).join("")}<footer><span>Statuscode: ${escapeHtml(capability.status)}</span><span>Klantspecifiek: ${escapeHtml(levelLabels[capability.customerSpecificShare])}</span><span>Demo: ${capability.demoReady ? "Ja" : "Nee"}</span></footer></div></details>
  </article>`;
}

type OwnerSection = "home" | "attention" | "organizations" | "search" | "management" | "opportunities" | "capabilities" | "workcontext";

function ownerMoreLinks(active: OwnerSection, atlas: AtlasWorkspaceView, includeAttention: boolean): string {
  const attention = includeAttention ? `<a href="${attentionPath}" aria-current="${active === "attention" ? "page" : "false"}"><span>Attention</span><small>${atlas.attention.length}</small></a>` : "";
  const decisionCount = atlas.decisionsNeeded.length;
  return `${attention}<a href="${organizationsPath}" aria-current="${active === "organizations" ? "page" : "false"}"><span>Organisaties</span></a><a href="${managementPath}" aria-current="${active === "management" ? "page" : "false"}"><span>Beheer &amp; GO</span>${decisionCount ? `<small>${decisionCount} nodig</small>` : ""}</a><a href="${capabilitiesPath}" aria-current="${active === "capabilities" ? "page" : "false"}"><span>Capabilities</span></a><a href="${opportunitiesPath}" aria-current="${active === "opportunities" ? "page" : "false"}"><span>Kansen</span></a><a href="/workspace/experience"><span>Experience</span></a><a href="${workContextPath}" aria-current="${active === "workcontext" ? "page" : "false"}"><span>Bestaande werkcontext</span></a>`;
}

function ownerTopbar(session: SessionView, active: OwnerSection, atlas: AtlasWorkspaceView): string {
  const secondaryActive = new Set<OwnerSection>(["attention", "organizations", "management", "capabilities", "workcontext", "opportunities"]).has(active);
  const mobileMoreActive = new Set<OwnerSection>(["organizations", "management", "capabilities", "workcontext", "opportunities"]).has(active);
  const decisionCount = atlas.decisionsNeeded.length;
  return `<header class="wbd-owner-topbar">
    <a class="wbd-owner-brand" href="${homePath}" aria-label="WBD Workspace"><span class="wbd-owner-mark" aria-hidden="true">W</span><span>WBD Workspace</span></a>
    <nav class="wbd-owner-primary" aria-label="Primaire WBD-navigatie"><a href="${homePath}" aria-current="${active === "home" ? "page" : "false"}">Today</a><span class="wbd-owner-sections__unavailable" aria-disabled="true" title="Mail krijgt hier een plek zodra een echte Owner Mail-workarea is aangesloten">Mail<small>later</small></span><a href="${searchPath}" aria-current="${active === "search" ? "page" : "false"}">Search</a></nav>
    <div class="wbd-owner-actions">${decisionCount ? `<a class="wbd-owner-go-status" href="${managementPath}">${decisionCount} beslissing${decisionCount === 1 ? "" : "en"}</a>` : ""}<details class="wbd-owner-more wbd-owner-more--desktop"><summary aria-current="${secondaryActive ? "page" : "false"}">Meer</summary><div>${ownerMoreLinks(active, atlas, true)}</div></details><div class="wbd-owner-profile"><span>${escapeHtml(session.owner.name)}</span><button type="button" data-logout>Uitloggen</button></div></div>
    <nav class="wbd-owner-mobile-sections" aria-label="Primaire mobiele WBD-navigatie"><a href="${homePath}" aria-current="${active === "home" ? "page" : "false"}">Today</a><a href="${attentionPath}" aria-current="${active === "attention" ? "page" : "false"}">Attention</a><a href="${searchPath}" aria-current="${active === "search" ? "page" : "false"}">Search</a><details class="wbd-owner-more wbd-owner-more--mobile"><summary aria-current="${mobileMoreActive ? "page" : "false"}">Meer</summary><div>${ownerMoreLinks(active, atlas, false)}</div></details></nav>
  </header>`;
}

function organizationIdFromPath(pathname: string): string | null {
  const prefix = `${organizationsPath}/`;
  if (!pathname.startsWith(prefix)) return null;
  const encoded = pathname.slice(prefix.length);
  if (!encoded || encoded.includes("/")) return null;
  try { return decodeURIComponent(encoded); } catch { return null; }
}

function workspaceView(session: SessionView, catalog: CatalogView, filter: FilterId, atlas: AtlasWorkspaceView): string {
  const visible = catalog.capabilities.filter((capability) => matchesFilter(capability, filter));
  const proven = catalog.capabilities.filter(({ status }) => status.startsWith("PROVEN_")).length;
  const sellable = catalog.capabilities.filter(({ sellNow }) => sellNow).length;
  return `<main class="wbd-owner-workspace">
    ${ownerTopbar(session, "capabilities", atlas)}
    <section class="wbd-owner-intro"><div><p class="wbd-owner-eyebrow">Owner Foundation · centrale waarheid</p><h1>Capabilities</h1><p>Wat WBD vandaag aantoonbaar kan, waar het bewezen is en wat nog niet verkocht moet worden.</p></div><dl><div><dt>Totaal</dt><dd>${catalog.capabilities.length}</dd></div><div><dt>Bewezen</dt><dd>${proven}</dd></div><div><dt>Nu verkoopbaar</dt><dd>${sellable}</dd></div><div><dt>Nog niet</dt><dd>${catalog.capabilities.length - sellable}</dd></div></dl></section>
    <nav class="wbd-owner-filters" aria-label="Capabilityfilters">${filters.map(({ id, label }) => `<button type="button" data-filter="${id}" aria-pressed="${filter === id}">${escapeHtml(label)}</button>`).join("")}</nav>
    <section class="wbd-capability-list" aria-live="polite" aria-label="${visible.length} capabilities">${visible.length ? visible.map((capability) => capabilityCard(capability, atlas)).join("") : '<p class="wbd-owner-empty">Geen capabilities binnen dit filter.</p>'}</section>
    <footer class="wbd-owner-footer"><span>Centrale bron · revisie ${catalog.revision}</span><span>Release ${escapeHtml(catalog.releaseId)}</span><span>Oude browserdossiers zijn niet gemigreerd.</span></footer>
  </main>`;
}

function workContextView(session: SessionView, mobileDevice: boolean, atlas: AtlasWorkspaceView): string {
  return `<main class="wbd-owner-workspace">
    ${ownerTopbar(session, "workcontext", atlas)}
    <section class="wbd-workcontext" data-mobile-device="${mobileDevice}" aria-labelledby="workcontext-title">
      <p class="wbd-owner-eyebrow">Tijdelijke continuïteitsbrug</p>
      <h1 id="workcontext-title">Bestaande werkcontext</h1>
      <p class="wbd-workcontext__lead">De bestaande WBD-werkcontext blijft lokaal en browsergebonden. Deze brug maakt haar bereikbaar zonder te doen alsof die gegevens centraal of productierijp zijn.</p>
      <div class="wbd-workcontext__boundary" role="note">
        <strong>Niet centraal</strong>
        <p>Er wordt niets uit IndexedDB gekopieerd, verwijderd of stil gemigreerd. De lokale werkcontext werkt alleen op deze desktop wanneer de bestaande lokale Workspace op poort 5173 draait.</p>
      </div>
      <div class="wbd-workcontext__desktop">
        <a class="wbd-workcontext__launch" href="${localWorkContextUrl}" target="_blank" rel="noopener noreferrer" data-local-workcontext-link>Bestaande werkcontext openen</a>
        <small>Opent de lokale route in een nieuw tabblad; Capabilities blijft hier beschikbaar.</small>
      </div>
      <div class="wbd-workcontext__mobile" role="status">
        <strong>Niet beschikbaar op iPhone</strong>
        <p>Deze lokale werkcontext staat op de desktop en is vanaf dit apparaat niet bereikbaar. Capabilities blijft wel centraal en mobiel beschikbaar.</p>
      </div>
      <a class="wbd-workcontext__back" href="${capabilitiesPath}">Terug naar Capabilities</a>
    </section>
    <footer class="wbd-owner-footer"><span>Continuïteitsbrug · geen eindarchitectuur</span><span>Release ${escapeHtml(session.releaseId)}</span><span>Lokale browserdata blijft ongewijzigd.</span></footer>
  </main>`;
}

export function mountWbdOwnerWorkspace(app: HTMLDivElement): void {
  let session: SessionView | undefined;
  let catalog: CatalogView | undefined;
  let control: ControlView | undefined;
  let overview: ControlOverview | undefined;
  let promotions: PromotionView | undefined;
  let atlas: AtlasWorkspaceView | undefined;
  let searchView: AtlasSearchView | undefined;
  let activeFilter: FilterId = "all";
  let visitRecorded = false;

  const loadOwnerTruth = async (): Promise<void> => {
    [catalog, control, overview, promotions, atlas] = await Promise.all([
      api<CatalogView>("/api/wbd/v1/capabilities"),
      api<ControlView>("/api/wbd/v1/control"),
      api<ControlOverview>("/api/wbd/v1/control/overview"),
      api<PromotionView>("/api/wbd/v1/promotions"),
      api<AtlasWorkspaceView>("/api/wbd/v1/atlas"),
    ]);
  };

  const loadSearchFromRoute = async (): Promise<void> => {
    if (window.location.pathname !== searchPath) return;
    const query = new URLSearchParams(window.location.search).get("q")?.trim();
    searchView = query ? await api<AtlasSearchView>(`/api/wbd/v1/atlas/search?q=${encodeURIComponent(query)}`) : undefined;
  };

  const bindLogin = (): void => {
    app.querySelector<HTMLFormElement>("[data-owner-login]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      submit.disabled = true;
      try {
        const fields = new FormData(form);
        session = await api<SessionView>("/api/wbd/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password"), deviceMode: fields.get("personal") ? "PERSONAL" : "SHARED" }) });
        await loadOwnerTruth();
        await loadSearchFromRoute();
        renderWorkspace();
      } catch (cause) {
        app.innerHTML = loginView(cause instanceof Error ? cause.message : "Inloggen is mislukt.");
        bindLogin();
      }
    });
  };

  const renderWorkspace = (): void => {
    if (!session || !catalog || !control || !overview || !promotions || !atlas) return;
    const pathname = window.location.pathname;
    const workContextActive = pathname === workContextPath;
    const homeActive = pathname === homePath;
    const attentionActive = pathname === attentionPath;
    const searchActive = pathname === searchPath;
    const managementActive = pathname === managementPath;
    const organizationDirectoryActive = pathname === organizationsPath;
    const organizationId = organizationIdFromPath(pathname);
    const opportunitiesActive = pathname === opportunitiesPath;
    const capabilitiesActive = pathname === capabilitiesPath;
    const pageTitle = homeActive ? "Today" : attentionActive ? "Attention" : searchActive ? "Search" : managementActive ? "Beheer & GO" : organizationDirectoryActive ? "Organisaties" : organizationId ? control.organizations.find(({ id }) => id === organizationId)?.name ?? "Organization" : opportunitiesActive ? "Kansen" : workContextActive ? "Bestaande werkcontext" : "Capabilities";
    document.title = `${pageTitle} — WBD Workspace`;
    if (homeActive) app.innerHTML = renderAtlasToday(ownerTopbar(session, "home", atlas), atlas, session.owner.name);
    else if (attentionActive) app.innerHTML = renderAtlasAttention(ownerTopbar(session, "attention", atlas), atlas);
    else if (searchActive) app.innerHTML = renderAtlasSearch(ownerTopbar(session, "search", atlas), searchView);
    else if (managementActive) app.innerHTML = renderControlHome(ownerTopbar(session, "management", atlas), control, overview, promotions);
    else if (organizationDirectoryActive) app.innerHTML = renderOrganizationDirectory(ownerTopbar(session, "organizations", atlas), control);
    else if (organizationId) app.innerHTML = renderOrganizationContext(ownerTopbar(session, "organizations", atlas), control, organizationId, catalog.capabilities.length, atlas);
    else if (opportunitiesActive) app.innerHTML = renderOpportunityDirectory(ownerTopbar(session, "opportunities", atlas), control);
    else if (workContextActive) app.innerHTML = workContextView(session, isCurrentDeviceMobile(), atlas);
    else app.innerHTML = workspaceView(session, catalog, activeFilter, atlas);
    if (homeActive && !visitRecorded) {
      visitRecorded = true;
      void api("/api/wbd/v1/atlas/visited", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": session.csrfToken } }).catch(() => undefined);
    }
    if (searchActive) bindAtlasSearch(app, async (query) => {
      searchView = await api<AtlasSearchView>(`/api/wbd/v1/atlas/search?q=${encodeURIComponent(query)}`);
      return searchView;
    });
    if (managementActive) bindControlHome(app, control, promotions, {
      create: async (recordType: ControlRecordType, payload: Record<string, unknown>) => {
        await api(`/api/wbd/v1/control/${recordType}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken }, body: JSON.stringify({ ...payload, expectedRevision: control!.revision }) });
        await loadOwnerTruth(); renderWorkspace();
      },
      patch: async (recordType: ControlRecordType, recordId: string, payload: Record<string, unknown>) => {
        await api(`/api/wbd/v1/control/${recordType}/${encodeURIComponent(recordId)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken }, body: JSON.stringify({ ...payload, expectedRevision: control!.revision }) });
        await loadOwnerTruth(); renderWorkspace();
      },
      review: async (proposalId: string, decision: "ACCEPT" | "ADJUST" | "REJECT", adjustments?: Record<string, unknown>) => {
        await api(`/api/wbd/v1/promotions/${encodeURIComponent(proposalId)}/review`, { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken }, body: JSON.stringify({ decision, adjustments, expectedRevision: control!.revision }) });
        await loadOwnerTruth(); renderWorkspace();
      },
    });
    if (organizationDirectoryActive) bindOrganizationDirectory(app);
    if (capabilitiesActive) app.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => button.addEventListener("click", () => { activeFilter = button.dataset.filter as FilterId; renderWorkspace(); }));
    app.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", async () => {
      try { await api("/api/wbd/v1/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken } }); } catch { /* local view still closes */ }
      session = undefined; catalog = undefined; control = undefined; overview = undefined; promotions = undefined; atlas = undefined; searchView = undefined; app.innerHTML = loginView(); bindLogin();
    });
  };

  const start = async (): Promise<void> => {
    app.innerHTML = '<main class="wbd-owner-loading"><span class="wbd-owner-mark">W</span><p>Veilige werkplek openen…</p></main>';
    try {
      session = await api<SessionView>("/api/wbd/v1/auth/session");
      await loadOwnerTruth();
      await loadSearchFromRoute();
      renderWorkspace();
    } catch { app.innerHTML = loginView(); bindLogin(); }
  };
  void start();
}
