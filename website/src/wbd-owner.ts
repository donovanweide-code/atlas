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
const wbdLogoPath = "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-light-candidate.svg";
const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

type NavigationIcon = "today" | "mail" | "search" | "growth" | "clients" | "attention" | "capabilities" | "experience" | "management" | "opportunities" | "context" | "more";

function navigationIcon(name: NavigationIcon): string {
  const paths: Record<NavigationIcon, string> = {
    today: '<path d="M3.5 10.5 12 3.6l8.5 6.9v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    growth: '<path d="M4 18 10 12l4 3 6-8"/><path d="M15 7h5v5"/>',
    clients: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-2.2c0-2.7 2.2-4.8 4.8-4.8h1.4c2.6 0 4.8 2.1 4.8 4.8V20M15 14h1.7c2.1 0 3.8 1.7 3.8 3.8V20"/>',
    attention: '<path d="M12 3a7 7 0 0 0-7 7v3.5L3.5 17h17L19 13.5V10a7 7 0 0 0-7-7Z"/><path d="M9.5 20h5"/>',
    capabilities: '<path d="m12 3 8 4.5-8 4.5-8-4.5z"/><path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5"/>',
    experience: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2M9 9h.01M15 9h.01"/>',
    management: '<path d="m12 3 8 3v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6z"/><path d="M9.5 12h5M12 9.5v5"/>',
    opportunities: '<path d="M4 17 10 11l4 3 6-7"/><circle cx="4" cy="17" r="1"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="20" cy="7" r="1"/>',
    context: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  return `<svg class="wbd-owner-nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function brandMark(className = ""): string {
  return `<img class="wbd-owner-brandmark${className ? ` ${className}` : ""}" src="${wbdLogoPath}" alt="WBD">`;
}

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
    <section class="wbd-owner-login__brand" aria-labelledby="login-title">${brandMark()}<p>Owner Workspace</p><h1 id="login-title">Rust, overzicht en controle.</h1><small>De veilige werkplek voor WBD.</small></section>
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
    <dl><div><dt>Volwassenheid</dt><dd>${escapeHtml(({ CONCEPT: "Concept", BUILT: "Gebouwd", PROVEN: "Bewezen", REUSABLE: "Herbruikbaar" } as Record<string, string>)[registry?.maturity ?? ""] ?? "Onbekend")}</dd></div><div><dt>Bewezen bij</dt><dd>${escapeHtml(proof)}</dd></div><div><dt>Evidence</dt><dd>${registry?.evidenceRefs.length ?? capability.evidence.length} gekoppeld</dd></div><div><dt>Hergebruik</dt><dd>${escapeHtml(registry?.reusable ?? levelLabels[capability.reusability])}</dd></div></dl>
    <details><summary>Bewijs en grenzen</summary><div class="wbd-capability__evidence">${capability.evidence.map((item) => `<article><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><strong>${escapeHtml(item.provenAt)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</small></article>`).join("")}<footer><span>Statuscode: ${escapeHtml(capability.status)}</span><span>Klantspecifiek: ${escapeHtml(levelLabels[capability.customerSpecificShare])}</span><span>Demo: ${capability.demoReady ? "Ja" : "Nee"}</span></footer></div></details>
  </article>`;
}

type OwnerSection = "home" | "attention" | "organizations" | "search" | "management" | "opportunities" | "capabilities" | "workcontext";

function ownerMoreLinks(active: OwnerSection, atlas: AtlasWorkspaceView, includeAttention: boolean): string {
  const attention = includeAttention ? `<a href="${attentionPath}" aria-current="${active === "attention" ? "page" : "false"}">${navigationIcon("attention")}<span>Attention</span><small>${atlas.attention.length || "Rustig"}</small></a>` : "";
  const decisionCount = atlas.decisionsNeeded.length;
  return `${attention}<a href="${capabilitiesPath}" aria-current="${active === "capabilities" ? "page" : "false"}">${navigationIcon("capabilities")}<span>Capabilities</span></a><a href="/workspace/experience">${navigationIcon("experience")}<span>Experience</span><small>Monitoring voorbereid</small></a><a href="${managementPath}" aria-current="${active === "management" ? "page" : "false"}">${navigationIcon("management")}<span>Beheer &amp; GO</span>${decisionCount ? `<small>${decisionCount} te controleren</small>` : ""}</a><a href="${opportunitiesPath}" aria-current="${active === "opportunities" ? "page" : "false"}">${navigationIcon("opportunities")}<span>Kansen</span></a><a href="${workContextPath}" aria-current="${active === "workcontext" ? "page" : "false"}">${navigationIcon("context")}<span>Bestaande werkcontext</span></a>`;
}

let ownerNavigationAbortController: AbortController | undefined;

function ownerTopbar(session: SessionView, active: OwnerSection, atlas: AtlasWorkspaceView): string {
  const secondaryActive = new Set<OwnerSection>(["attention", "organizations", "management", "capabilities", "workcontext", "opportunities"]).has(active);
  const decisionCount = atlas.decisionsNeeded.length;
  return `<header class="wbd-owner-topbar">
    <a class="wbd-owner-brand" href="${homePath}" aria-label="WBD Owner Workspace">${brandMark()}<span><strong>Owner Workspace</strong><small>Think big, show small.</small></span></a>
    <nav class="wbd-owner-primary" aria-label="Primaire WBD-navigatie"><a href="${homePath}" aria-current="${active === "home" ? "page" : "false"}">${navigationIcon("today")}<span>Today</span></a><span class="wbd-owner-sections__unavailable" aria-disabled="true" title="Mail Foundation is behouden; de echte inbox is nog niet aangesloten">${navigationIcon("mail")}<span>Mail</span><small>Voorbereid</small></span><a href="${searchPath}" aria-current="${active === "search" ? "page" : "false"}">${navigationIcon("search")}<span>Search</span></a><span class="wbd-owner-sections__unavailable" aria-disabled="true" title="GA4 en Search Console zijn nog niet als live Owner-feed aangesloten">${navigationIcon("growth")}<span>Growth</span><small>Voorbereid</small></span><a href="${organizationsPath}" aria-current="${active === "organizations" ? "page" : "false"}">${navigationIcon("clients")}<span>Klanten</span></a></nav>
    <div class="wbd-owner-actions">${decisionCount ? `<a class="wbd-owner-go-status" href="${managementPath}">${decisionCount} te controleren</a>` : ""}<details class="wbd-owner-more wbd-owner-more--desktop" data-owner-more><summary aria-current="${secondaryActive ? "page" : "false"}">${navigationIcon("more")}<span>Meer</span></summary><div class="wbd-owner-more-panel">${ownerMoreLinks(active, atlas, true)}</div></details><div class="wbd-owner-profile"><span class="wbd-owner-avatar" aria-hidden="true">DW</span><span><strong>${escapeHtml(session.owner.name)}</strong><small>Owner</small></span><button type="button" data-logout>Uitloggen</button></div></div>
    <div class="wbd-owner-mobile-header"><a href="${homePath}" aria-label="WBD Owner Workspace">${brandMark("wbd-owner-brandmark--mobile")}</a>${atlas.importantNow.length || decisionCount ? `<span class="wbd-owner-mobile-attention" aria-label="${atlas.importantNow.length + decisionCount} ${atlas.importantNow.length + decisionCount === 1 ? "punt vraagt" : "punten vragen"} aandacht">${atlas.importantNow.length + decisionCount}</span>` : ""}<button type="button" class="wbd-owner-menu-button" data-owner-drawer-toggle aria-controls="wbd-owner-drawer" aria-expanded="false" aria-label="Navigatie openen"><span></span><span></span><span></span></button></div>
    <div class="wbd-owner-drawer-backdrop" data-owner-drawer-backdrop hidden></div>
    <aside class="wbd-owner-drawer" id="wbd-owner-drawer" aria-hidden="true" aria-label="WBD-navigatie">
      <header>${brandMark("wbd-owner-brandmark--drawer")}<button type="button" data-owner-drawer-close aria-label="Navigatie sluiten"><span aria-hidden="true">×</span></button></header>
      <nav><section><h2>Dagelijks</h2><a href="${homePath}" aria-current="${active === "home" ? "page" : "false"}">${navigationIcon("today")}<span>Today</span></a><span class="wbd-owner-drawer-prepared" aria-disabled="true">${navigationIcon("mail")}<span>Mail<small>Voorbereid</small></span></span><a href="${searchPath}" aria-current="${active === "search" ? "page" : "false"}">${navigationIcon("search")}<span>Search</span></a></section><section><h2>Werk &amp; groei</h2><a href="${attentionPath}" aria-current="${active === "attention" ? "page" : "false"}">${navigationIcon("attention")}<span>Attention</span>${atlas.attention.length ? `<small>${atlas.attention.length}</small>` : ""}</a><span class="wbd-owner-drawer-prepared" aria-disabled="true">${navigationIcon("growth")}<span>Growth<small>Voorbereid</small></span></span><a href="${organizationsPath}" aria-current="${active === "organizations" ? "page" : "false"}">${navigationIcon("clients")}<span>Klanten</span></a></section><section><h2>Verdieping</h2>${ownerMoreLinks(active, atlas, false)}</section></nav>
      <footer><div><span class="wbd-owner-avatar" aria-hidden="true">DW</span><span><strong>${escapeHtml(session.owner.name)}</strong><small>Owner</small></span></div><button type="button" data-logout>Uitloggen</button></footer>
    </aside>
  </header>`;
}

function bindOwnerNavigation(app: HTMLDivElement): void {
  ownerNavigationAbortController?.abort();
  ownerNavigationAbortController = new AbortController();
  const { signal } = ownerNavigationAbortController;
  const drawer = app.querySelector<HTMLElement>("[id='wbd-owner-drawer']");
  const toggle = app.querySelector<HTMLButtonElement>("[data-owner-drawer-toggle]");
  const backdrop = app.querySelector<HTMLElement>("[data-owner-drawer-backdrop]");
  const more = app.querySelector<HTMLDetailsElement>("[data-owner-more]");
  let previouslyFocused: HTMLElement | null = null;
  let drawerTouchStartX: number | null = null;

  const drawerFocusable = (): HTMLElement[] => drawer ? Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
  const closeDrawer = (restoreFocus = true): void => {
    if (!drawer || !toggle || !backdrop) return;
    drawer.dataset.open = "false";
    drawer.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Navigatie openen");
    backdrop.hidden = true;
    document.body.classList.remove("wbd-owner-drawer-open");
    if (restoreFocus) (previouslyFocused ?? toggle).focus();
  };
  const openDrawer = (): void => {
    if (!drawer || !toggle || !backdrop) return;
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
    backdrop.hidden = false;
    drawer.dataset.open = "true";
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Navigatie sluiten");
    document.body.classList.add("wbd-owner-drawer-open");
    requestAnimationFrame(() => drawerFocusable()[0]?.focus());
  };

  toggle?.addEventListener("click", () => drawer?.dataset.open === "true" ? closeDrawer() : openDrawer(), { signal });
  app.querySelector<HTMLButtonElement>("[data-owner-drawer-close]")?.addEventListener("click", () => closeDrawer(), { signal });
  backdrop?.addEventListener("click", () => closeDrawer(), { signal });
  drawer?.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => link.addEventListener("click", () => closeDrawer(false), { signal }));
  drawer?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = drawerFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, { signal });
  drawer?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") drawerTouchStartX = event.clientX;
  }, { signal, passive: true });
  drawer?.addEventListener("pointerup", (event) => {
    if (drawerTouchStartX !== null && event.pointerType === "touch" && event.clientX - drawerTouchStartX > 70) closeDrawer();
    drawerTouchStartX = null;
  }, { signal, passive: true });
  window.addEventListener("resize", () => { if (window.innerWidth > 840 && drawer?.dataset.open === "true") closeDrawer(false); }, { signal });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (drawer?.dataset.open === "true") closeDrawer();
    if (more?.open) { more.open = false; more.querySelector<HTMLElement>("summary")?.focus(); }
  }, { signal });
  document.addEventListener("pointerdown", (event) => {
    if (more?.open && event.target instanceof Node && !more.contains(event.target)) more.open = false;
  }, { signal });
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
    const pageTitle = homeActive ? "Today" : attentionActive ? "Attention" : searchActive ? "Search" : managementActive ? "Beheer" : organizationDirectoryActive ? "Organisaties" : organizationId ? control.organizations.find(({ id }) => id === organizationId)?.name ?? "Organization" : opportunitiesActive ? "Kansen" : workContextActive ? "Bestaande werkcontext" : "Capabilities";
    document.title = `${pageTitle} — WBD Workspace`;
    if (homeActive) app.innerHTML = renderAtlasToday(ownerTopbar(session, "home", atlas), atlas, session.owner.name);
    else if (attentionActive) app.innerHTML = renderAtlasAttention(ownerTopbar(session, "attention", atlas), atlas);
    else if (searchActive) app.innerHTML = renderAtlasSearch(ownerTopbar(session, "search", atlas), searchView);
    else if (managementActive) app.innerHTML = renderControlHome(ownerTopbar(session, "management", atlas), control, overview, promotions);
    else if (organizationDirectoryActive) app.innerHTML = renderOrganizationDirectory(ownerTopbar(session, "organizations", atlas), control, atlas);
    else if (organizationId) app.innerHTML = renderOrganizationContext(ownerTopbar(session, "organizations", atlas), control, organizationId, catalog.capabilities.length, atlas);
    else if (opportunitiesActive) app.innerHTML = renderOpportunityDirectory(ownerTopbar(session, "opportunities", atlas), control);
    else if (workContextActive) app.innerHTML = workContextView(session, isCurrentDeviceMobile(), atlas);
    else app.innerHTML = workspaceView(session, catalog, activeFilter, atlas);
    bindOwnerNavigation(app);
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
    app.querySelectorAll<HTMLButtonElement>("[data-logout]").forEach((button) => button.addEventListener("click", async () => {
      try { await api("/api/wbd/v1/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken } }); } catch { /* local view still closes */ }
      session = undefined; catalog = undefined; control = undefined; overview = undefined; promotions = undefined; atlas = undefined; searchView = undefined; app.innerHTML = loginView(); bindLogin();
    }));
  };

  const start = async (): Promise<void> => {
    app.innerHTML = `<main class="wbd-owner-loading">${brandMark()}<p>Veilige werkplek openen…</p></main>`;
    try {
      session = await api<SessionView>("/api/wbd/v1/auth/session");
      await loadOwnerTruth();
      await loadSearchFromRoute();
      renderWorkspace();
    } catch { app.innerHTML = loginView(); bindLogin(); }
  };
  void start();
}
