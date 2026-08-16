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
const workContextPath = "/workspace/wbd/werkcontext";
const localWorkContextUrl = "http://127.0.0.1:5173/workspace/wbd/overzicht";
const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

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

function capabilityCard(capability: Capability): string {
  const proof = capability.provenAt.length ? capability.provenAt.join(" · ") : "Nog nergens bewezen";
  return `<article class="wbd-capability" data-capability-id="${escapeHtml(capability.id)}" data-status="${escapeHtml(capability.status)}">
    <header><div><p>${escapeHtml(capability.category)}</p><h2>${escapeHtml(capability.name)}</h2></div><span class="wbd-capability__sell" data-sell="${capability.sellNow}">${capability.sellNow ? "Nu verkoopbaar" : "Nog niet verkopen"}</span></header>
    <div class="wbd-capability__status"><span>${escapeHtml(statusLabels[capability.status])}</span><span>${escapeHtml(judgementLabels[capability.strategicJudgement])}</span></div>
    <p class="wbd-capability__guidance">${escapeHtml(capability.guidance)}</p>
    <dl><div><dt>Bewezen bij</dt><dd>${escapeHtml(proof)}</dd></div><div><dt>Hergebruik</dt><dd>${escapeHtml(levelLabels[capability.reusability])}</dd></div><div><dt>Klant 2</dt><dd>${escapeHtml(levelLabels[capability.customer2Reuse])}</dd></div><div><dt>Implementatie</dt><dd>${escapeHtml(capability.implementationClass)}</dd></div></dl>
    <details><summary>Bewijs en grenzen</summary><div class="wbd-capability__evidence">${capability.evidence.map((item) => `<article><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><strong>${escapeHtml(item.provenAt)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(item.type)} · ${escapeHtml(item.source)}</small></article>`).join("")}<footer><span>Statuscode: ${escapeHtml(capability.status)}</span><span>Klantspecifiek: ${escapeHtml(levelLabels[capability.customerSpecificShare])}</span><span>Demo: ${capability.demoReady ? "Ja" : "Nee"}</span></footer></div></details>
  </article>`;
}

function ownerTopbar(session: SessionView, active: "capabilities" | "workcontext"): string {
  return `<header class="wbd-owner-topbar">
    <a class="wbd-owner-brand" href="${capabilitiesPath}" aria-label="WBD Workspace"><span class="wbd-owner-mark" aria-hidden="true">W</span><span>WBD Workspace</span></a>
    <nav class="wbd-owner-sections" aria-label="WBD werkgebieden"><a href="${capabilitiesPath}" aria-current="${active === "capabilities" ? "page" : "false"}">Capabilities</a><a href="${workContextPath}" aria-current="${active === "workcontext" ? "page" : "false"}">Bestaande werkcontext</a></nav>
    <div><span>${escapeHtml(session.owner.name)}</span><button type="button" data-logout>Uitloggen</button></div>
  </header>`;
}

function workspaceView(session: SessionView, catalog: CatalogView, filter: FilterId): string {
  const visible = catalog.capabilities.filter((capability) => matchesFilter(capability, filter));
  const proven = catalog.capabilities.filter(({ status }) => status.startsWith("PROVEN_")).length;
  const sellable = catalog.capabilities.filter(({ sellNow }) => sellNow).length;
  return `<main class="wbd-owner-workspace">
    ${ownerTopbar(session, "capabilities")}
    <section class="wbd-owner-intro"><div><p class="wbd-owner-eyebrow">Owner Foundation · centrale waarheid</p><h1>Capabilities</h1><p>Wat WBD vandaag aantoonbaar kan, waar het bewezen is en wat nog niet verkocht moet worden.</p></div><dl><div><dt>Totaal</dt><dd>${catalog.capabilities.length}</dd></div><div><dt>Bewezen</dt><dd>${proven}</dd></div><div><dt>Nu verkoopbaar</dt><dd>${sellable}</dd></div><div><dt>Nog niet</dt><dd>${catalog.capabilities.length - sellable}</dd></div></dl></section>
    <nav class="wbd-owner-filters" aria-label="Capabilityfilters">${filters.map(({ id, label }) => `<button type="button" data-filter="${id}" aria-pressed="${filter === id}">${escapeHtml(label)}</button>`).join("")}</nav>
    <section class="wbd-capability-list" aria-live="polite" aria-label="${visible.length} capabilities">${visible.length ? visible.map(capabilityCard).join("") : '<p class="wbd-owner-empty">Geen capabilities binnen dit filter.</p>'}</section>
    <footer class="wbd-owner-footer"><span>Centrale bron · revisie ${catalog.revision}</span><span>Release ${escapeHtml(catalog.releaseId)}</span><span>Oude browserdossiers zijn niet gemigreerd.</span></footer>
  </main>`;
}

function workContextView(session: SessionView): string {
  return `<main class="wbd-owner-workspace">
    ${ownerTopbar(session, "workcontext")}
    <section class="wbd-workcontext" aria-labelledby="workcontext-title">
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
  let activeFilter: FilterId = "all";

  const bindLogin = (): void => {
    app.querySelector<HTMLFormElement>("[data-owner-login]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      submit.disabled = true;
      try {
        const fields = new FormData(form);
        session = await api<SessionView>("/api/wbd/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password"), deviceMode: fields.get("personal") ? "PERSONAL" : "SHARED" }) });
        catalog = await api<CatalogView>("/api/wbd/v1/capabilities");
        renderWorkspace();
      } catch (cause) {
        app.innerHTML = loginView(cause instanceof Error ? cause.message : "Inloggen is mislukt.");
        bindLogin();
      }
    });
  };

  const renderWorkspace = (): void => {
    if (!session || !catalog) return;
    const workContextActive = window.location.pathname === workContextPath;
    document.title = `${workContextActive ? "Bestaande werkcontext" : "Capabilities"} — WBD Workspace`;
    app.innerHTML = workContextActive ? workContextView(session) : workspaceView(session, catalog, activeFilter);
    app.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((button) => button.addEventListener("click", () => { activeFilter = button.dataset.filter as FilterId; renderWorkspace(); }));
    app.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", async () => {
      try { await api("/api/wbd/v1/auth/logout", { method: "POST", headers: { Origin: window.location.origin, "X-CSRF-Token": session!.csrfToken } }); } catch { /* local view still closes */ }
      session = undefined; catalog = undefined; app.innerHTML = loginView(); bindLogin();
    });
  };

  const start = async (): Promise<void> => {
    app.innerHTML = '<main class="wbd-owner-loading"><span class="wbd-owner-mark">W</span><p>Veilige werkplek openen…</p></main>';
    try {
      session = await api<SessionView>("/api/wbd/v1/auth/session");
      catalog = await api<CatalogView>("/api/wbd/v1/capabilities");
      renderWorkspace();
    } catch { app.innerHTML = loginView(); bindLogin(); }
  };
  void start();
}
