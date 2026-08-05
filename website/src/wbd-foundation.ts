import "./styles/wbd-foundation.css";
import { wbdWorkspace } from "./workspace-config";
import { renderWorkspaceSidebar } from "./workspace-shell";
import {
  currentWorkstream,
  developmentHistory,
  firstDevelopmentPartner,
  horizonItems,
  infrastructureItems,
  workspaceInsights,
  wbdProjects,
  type WbdProject,
} from "./wbd-foundation-data";

interface InvoiceSummary {
  id: string;
  number: string;
  date: string;
  project: string;
  customer_name: string;
  updated_at: string;
  finalized_at?: string;
  totals?: { exclusive: string; vat: string; inclusive: string } | null;
}

type PaymentStatus = "manual-unregistered" | "open" | "paid";

interface PaymentRecord {
  status: PaymentStatus;
  updated_at: string;
}

interface FeedbackEntry {
  id: string;
  organization: string;
  project: string;
  component: string;
  date: string;
  status: "Nieuw" | "In beoordeling" | "Besloten";
  observation: string;
  follow_up_decision: string;
  created_at: string;
}

const foundationApi = "/__wbd-foundation";
const invoiceApi = "/__wbd-invoices";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value?: string): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function today(): string {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "De Workspace-gegevens konden niet worden geladen.");
  return body as T;
}

function renderShell(activeId: string, title: string, kicker: string, context: string, content: string): string {
  return `<main class="atlas-workspace workspace-experience workspace-experience--wbd">
    <div class="workspace-shell">
      ${renderWorkspaceSidebar(wbdWorkspace, activeId)}
      <div class="workspace-main wbd-dossier-main wbd-foundation-main">
        <header class="workspace-header workspace-placeholder-header">
          <div><p class="workspace-kicker">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1></div>
          <p class="workspace-date">${escapeHtml(context)}</p>
        </header>
        ${content}
      </div>
    </div>
  </main>`;
}

function renderSubnav(items: readonly { label: string; href: string; active: boolean }[], label: string): string {
  return `<nav class="wbd-foundation-subnav" aria-label="${escapeHtml(label)}">
    ${items.map((item) => `<a class="${item.active ? "is-current" : ""}" href="${item.href}" ${item.active ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("")}
  </nav>`;
}

function renderDevelopmentNav(active: "monitor" | "history" | "feedback"): string {
  return renderSubnav([
    { label: "Ontwikkelmonitor", href: "/workspace/wbd/ontwikkeling/monitor", active: active === "monitor" },
    { label: "Ontwikkelhistorie", href: "/workspace/wbd/ontwikkeling/historie", active: active === "history" },
    { label: "Feedback", href: "/workspace/wbd/ontwikkeling/feedback", active: active === "feedback" },
  ], "Ontwikkeling");
}

function renderBusinessNav(active: "foundation" | "finance" | "incoming" | "company" | "templates"): string {
  return renderSubnav([
    { label: "Basis", href: "/workspace/wbd/business-foundation", active: active === "foundation" },
    { label: "Financieel overzicht", href: "/workspace/wbd/business-foundation/finance", active: active === "finance" },
    { label: "Inkomende facturen", href: "/workspace/wbd/business-foundation/finance/inkomende-facturen", active: active === "incoming" },
    { label: "Bedrijfsgegevens", href: "/workspace/wbd/business-foundation/bedrijfsgegevens", active: active === "company" },
    { label: "Templates", href: "/workspace/wbd/business-foundation/templates", active: active === "templates" },
  ], "Business Foundation");
}

function stateTone(state: string): string {
  if (state === "Afgerond" || state === "Actief") return "positive";
  if (state === "Verdient vandaag aandacht") return "attention";
  if (state === "Horizon") return "horizon";
  return "waiting";
}

function projectCard(project: WbdProject, detailed = false): string {
  const results = detailed && project.result
    ? `<div class="wbd-foundation-result"><p>Resultaat</p><ul>${project.result.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><small>Toekomstige automatiseringen vallen buiten Project 001A.</small></div>`
    : "";
  return `<article class="wbd-foundation-project" data-project="${project.id}">
    <header><span>${project.id}</span><strong class="wbd-foundation-state" data-tone="${stateTone(project.attentionState)}">${escapeHtml(project.attentionState)}</strong></header>
    <h3>${escapeHtml(project.title)}</h3>
    <p class="wbd-foundation-phase">${escapeHtml(project.phase)}</p>
    <dl>
      <div><dt>Laatste mijlpaal</dt><dd>${escapeHtml(project.latestMilestone)}</dd></div>
      <div><dt>Eerstvolgende gevalideerde stap</dt><dd>${escapeHtml(project.nextValidatedStep)}</dd></div>
      <div><dt>Blockers</dt><dd>${escapeHtml(project.blockers)}</dd></div>
    </dl>
    ${results}
  </article>`;
}

function renderOverview(app: HTMLDivElement): void {
  document.title = "Overzicht — We Build And Design Workspace";
  const next = wbdProjects.find((project) => project.id === "002")!;
  app.innerHTML = renderShell("overzicht", "De actuele bedrijfspraktijk", "We Build And Design · Overzicht", "5 augustus 2026", `
    <section class="wbd-foundation-opening" aria-labelledby="current-focus-title">
      <div><p class="workspace-label">Verdient vandaag aandacht</p><h2 id="current-focus-title">${escapeHtml(currentWorkstream.title)} is de actieve werkstroom.</h2><p>${escapeHtml(currentWorkstream.summary)}</p></div>
      <dl><div><dt>Afgerond</dt><dd>Atlas Workspace Sync · GO / Afgerond</dd></div><div><dt>Hierna</dt><dd>002 · Infrastructure Foundation</dd></div></dl>
    </section>
    <nav class="wbd-foundation-entry-grid" aria-label="Belangrijkste werkruimtes">
      <a href="/workspace/wbd/ontwikkelpartners"><span>01</span><strong>Ontwikkelpartner</strong><p>Sport 2000 Sportpaleis B.V. · actief</p></a>
      <a href="/workspace/wbd/ontwikkeling/monitor"><span>02</span><strong>Ontwikkelmonitor</strong><p>${escapeHtml(currentWorkstream.nextStep)}</p></a>
      <a href="/workspace/wbd/business-foundation/finance"><span>03</span><strong>Financiën</strong><p>F00248 · € 331,01 inclusief btw</p></a>
      <a href="/workspace/wbd/infrastructuur"><span>04</span><strong>Infrastructuur</strong><p>${escapeHtml(next.nextValidatedStep)}</p></a>
    </nav>
    <section class="workspace-section wbd-foundation-quiet"><div><p class="workspace-label">Bewuste grens</p><h2>Polish zonder herontwerp.</h2></div><p>${escapeHtml(currentWorkstream.boundaries)} Hosting, domein, SSL, back-ups en zakelijke e-mail blijven daarom nog buiten de actieve werkstroom.</p></section>`);
}

function renderProjects(app: HTMLDivElement): void {
  document.title = "Projecten — We Build And Design Workspace";
  app.innerHTML = renderShell("projecten", "Projecten", "We Build And Design · Roadmap", "Afgerond · Actief · Horizon", `
    <p class="wbd-page-intro">De projectvolgorde maakt zichtbaar wat afgerond is, wat nu aandacht verdient en wat bewust pas daarna start.</p>
    <section class="wbd-foundation-opening"><div><p class="workspace-label">Actieve werkstroom</p><h2>${escapeHtml(currentWorkstream.title)}</h2><p>${escapeHtml(currentWorkstream.summary)}</p></div><dl><div><dt>Grens</dt><dd>${escapeHtml(currentWorkstream.boundaries)}</dd></div></dl></section>
    <div class="wbd-foundation-project-list">${wbdProjects.map((project) => projectCard(project, project.id === "001A")).join("")}</div>
    <section class="workspace-section wbd-foundation-horizon"><header><div><p class="workspace-label">Workspace-inzichten</p><h2>Bevestigde werkvorm en commerciële grens</h2></div><span>Geen prijsbesluit</span></header><ul>${workspaceInsights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    <section class="workspace-section wbd-foundation-horizon"><header><div><p class="workspace-label">Horizon</p><h2>Bewust niet in uitvoering</h2></div><span>Geen onderdeel van Project 002</span></header><ul>${horizonItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`);
}

function renderPartners(app: HTMLDivElement): void {
  const partner = firstDevelopmentPartner;
  document.title = "Ontwikkelpartners — We Build And Design Workspace";
  app.innerHTML = renderShell("ontwikkelpartners", "Ontwikkelpartners", "We Build And Design · Praktijkvalidatie", "1 actieve ontwikkelpartner", `
    <p class="wbd-page-intro">Ontwikkelpartners brengen echte werksituaties in de ontwikkeling zonder eigenaar te worden van de WBD- of Atlas-fundering.</p>
    <article class="workspace-section wbd-foundation-partner">
      <header><div><p class="workspace-label">${escapeHtml(partner.role)}</p><h2>${escapeHtml(partner.name)}</h2></div><strong class="wbd-foundation-state" data-tone="positive">${escapeHtml(partner.status)}</strong></header>
      <dl>
        <div><dt>Samenwerking</dt><dd>${escapeHtml(partner.collaboration)}</dd></div>
        <div><dt>Praktijkcontext</dt><dd>${escapeHtml(partner.practiceContext)}</dd></div>
        <div><dt>Betekenis voor WBD</dt><dd>${escapeHtml(partner.meaning)}</dd></div>
        <div><dt>Relatie tot WBD</dt><dd>${escapeHtml(partner.relationship)}</dd></div>
      </dl>
      <footer><a href="/workspace/wbd/organisaties/sportpaleis">Open organisatiedossier <span aria-hidden="true">→</span></a><small>Er zijn geen ontbrekende contact- of bedrijfsgegevens aangevuld.</small></footer>
    </article>`);
}

function renderMonitor(app: HTMLDivElement): void {
  document.title = "Ontwikkelmonitor — We Build And Design Workspace";
  app.innerHTML = renderShell("ontwikkeling", "Ontwikkelmonitor", "Ontwikkeling · Aandacht", "Betekenis boven techniek", `
    ${renderDevelopmentNav("monitor")}
    <p class="wbd-page-intro">Een rustige monitor voor projecten en gevalideerde vervolgstappen. Technische activiteit blijft buiten beeld.</p>
    <section class="wbd-foundation-opening"><div><p class="workspace-label">Actieve werkstroom</p><h2>${escapeHtml(currentWorkstream.title)}</h2><p>${escapeHtml(currentWorkstream.nextStep)}</p></div><dl><div><dt>Grens</dt><dd>${escapeHtml(currentWorkstream.boundaries)}</dd></div></dl></section>
    <div class="wbd-foundation-project-list">${wbdProjects.map((project) => projectCard(project)).join("")}</div>
    <section class="workspace-section wbd-foundation-horizon"><header><div><p class="workspace-label">Horizon</p><h2>Later, wanneer de basis daarom vraagt</h2></div><span>${horizonItems.length} onderwerpen</span></header><ul>${horizonItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`);
}

function renderHistory(app: HTMLDivElement): void {
  document.title = "Ontwikkelhistorie — We Build And Design Workspace";
  app.innerHTML = renderShell("ontwikkeling", "Ontwikkelhistorie", "Ontwikkeling · Betekenisvolle mijlpalen", "Van publieke basis naar infrastructuur", `
    ${renderDevelopmentNav("history")}
    <p class="wbd-page-intro">Deze historie beschrijft wat iedere stap voor de bedrijfspraktijk betekent. Onbekende historische datums zijn bewust niet ingevuld.</p>
    <section class="workspace-section wbd-foundation-timeline"><ol>${developmentHistory.map((item) => `<li><span>${item.order}</span><div><time>${escapeHtml(item.moment)}</time><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.meaning)}</p></div></li>`).join("")}</ol></section>`);
}

function feedbackCard(entry: FeedbackEntry): string {
  return `<article class="wbd-foundation-feedback-card">
    <header><span>${escapeHtml(formatDate(entry.date))}</span><strong class="wbd-foundation-state" data-tone="${entry.status === "Besloten" ? "positive" : entry.status === "In beoordeling" ? "attention" : "waiting"}">${escapeHtml(entry.status)}</strong></header>
    <h3>${escapeHtml(entry.component)}</h3><p>${escapeHtml(entry.observation)}</p>
    <dl><div><dt>Organisatie</dt><dd>${escapeHtml(entry.organization)}</dd></div><div><dt>Project</dt><dd>${escapeHtml(entry.project)}</dd></div></dl>
    ${entry.follow_up_decision ? `<footer><span>Vervolgbeslissing</span><p>${escapeHtml(entry.follow_up_decision)}</p></footer>` : `<footer><span>Vervolgbeslissing</span><p>Nog niet vastgelegd.</p></footer>`}
  </article>`;
}

async function renderFeedback(app: HTMLDivElement): Promise<void> {
  document.title = "Feedback — We Build And Design Workspace";
  app.innerHTML = renderShell("ontwikkeling", "Feedback", "Ontwikkeling · Bewijs uit de praktijk", "Gescheiden van ideeën en roadmap", `
    ${renderDevelopmentNav("feedback")}
    <p class="wbd-page-intro">Leg concrete feedback uit echte werksituaties vast en verbind die met de juiste organisatie, het project en het onderdeel.</p>
    <section class="workspace-section wbd-foundation-feedback-layout">
      <form class="wbd-foundation-form" data-feedback-form>
        <header><p class="workspace-label">Nieuwe praktijkfeedback</p><h2>Leg vast wat werkelijk is waargenomen</h2></header>
        <div class="wbd-foundation-form-grid">
          <label>Organisatie<input name="organization" list="feedback-organizations" required placeholder="Bijv. Sport 2000 Sportpaleis B.V."><datalist id="feedback-organizations"><option value="Sport 2000 Sportpaleis B.V."><option value="We Build And Design"></datalist></label>
          <label>Project<input name="project" list="feedback-projects" required placeholder="Bijv. 002 — WBD Infrastructure Foundation"><datalist id="feedback-projects">${wbdProjects.map((project) => `<option value="${project.id} — ${escapeHtml(project.title)}">`).join("")}</datalist></label>
          <label>Onderdeel<input name="component" required placeholder="Workspace, factuur of module"></label>
          <label>Datum<input name="date" type="date" value="${today()}" required></label>
          <label>Status<select name="status" required><option>Nieuw</option><option>In beoordeling</option><option>Besloten</option></select></label>
        </div>
        <label>Praktijkfeedback<textarea name="observation" rows="4" required placeholder="Wat gebeurde er in de praktijk?"></textarea></label>
        <label>Eventuele vervolgbeslissing<textarea name="follow_up_decision" rows="3" placeholder="Laat leeg zolang er nog geen besluit is."></textarea></label>
        <button type="submit">Feedback vastleggen</button><p class="wbd-foundation-form-status" data-feedback-status aria-live="polite"></p>
      </form>
      <div><header class="wbd-foundation-list-header"><div><p class="workspace-label">Vastgelegd</p><h2>Praktijkbewijs</h2></div><span data-feedback-count>—</span></header><div class="wbd-foundation-feedback-list" data-feedback-list><p class="wbd-empty">Feedback wordt geladen…</p></div></div>
    </section>`);

  const list = app.querySelector<HTMLElement>("[data-feedback-list]")!;
  const count = app.querySelector<HTMLElement>("[data-feedback-count]")!;
  try {
    const { feedback } = await api<{ feedback: FeedbackEntry[] }>(`${foundationApi}/feedback`);
    count.textContent = `${feedback.length} ${feedback.length === 1 ? "registratie" : "registraties"}`;
    list.innerHTML = feedback.length ? feedback.map(feedbackCard).join("") : `<div class="wbd-foundation-empty"><p class="workspace-label">Nog leeg</p><h3>Nog geen praktijkfeedback</h3><p>De eerste registratie verschijnt hier als bewijs uit een echte werksituatie.</p></div>`;
  } catch (error) {
    list.innerHTML = `<p class="wbd-empty">${escapeHtml(error instanceof Error ? error.message : "Feedback kon niet worden geladen.")}</p>`;
  }

  app.querySelector<HTMLFormElement>("[data-feedback-form]")!.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const status = form.querySelector<HTMLElement>("[data-feedback-status]")!;
    const data = Object.fromEntries(new FormData(form).entries());
    status.textContent = "Feedback wordt vastgelegd…";
    try {
      await api(`${foundationApi}/feedback`, { method: "POST", body: JSON.stringify(data) });
      await renderFeedback(app);
      showNotice(app, "Praktijkfeedback is vastgelegd.");
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Feedback kon niet worden vastgelegd.";
      status.classList.add("is-error");
    }
  });
}

function paymentOptions(selected: PaymentStatus): string {
  return [
    ["manual-unregistered", "Nog handmatig registreren"],
    ["open", "Openstaand"],
    ["paid", "Betaald"],
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function invoiceRow(invoice: InvoiceSummary, storage: "concept" | "sent", payment?: PaymentRecord): string {
  const isSent = storage === "sent";
  const href = isSent
    ? `/workspace/wbd/business-foundation/finance/facturen/verzonden/${encodeURIComponent(invoice.id)}`
    : `/workspace/wbd/business-foundation/finance/facturen/concepten/${encodeURIComponent(invoice.id)}`;
  return `<article class="wbd-foundation-invoice" data-invoice="${escapeHtml(invoice.id)}">
    <div><span class="wbd-foundation-state" data-tone="${isSent ? "positive" : "waiting"}">${isSent ? "Definitief / verzonden" : "Concept"}</span><a href="${href}">${escapeHtml(invoice.number || "Nummer nog niet ingevuld")}</a><p>${escapeHtml(invoice.customer_name || "Organisatie nog niet ingevuld")}</p></div>
    <dl><div><dt>Project</dt><dd>${escapeHtml(invoice.project || "Nog niet gekoppeld")}</dd></div><div><dt>Factuurdatum</dt><dd>${escapeHtml(formatDate(invoice.date))}</dd></div></dl>
    <strong>${formatMoney(invoice.totals?.inclusive)}</strong>
    <label>Betaling${isSent ? `<select data-payment-status data-invoice-id="${escapeHtml(invoice.id)}">${paymentOptions(payment?.status ?? "manual-unregistered")}</select>` : `<span>Niet van toepassing</span>`}</label>
  </article>`;
}

async function renderFinance(app: HTMLDivElement): Promise<void> {
  document.title = "Financieel overzicht — We Build And Design Workspace";
  app.innerHTML = renderShell("business-foundation", "Financieel overzicht", "Business Foundation · Finance", "Eenvoudige financiële basis", `
    ${renderBusinessNav("finance")}
    <p class="wbd-page-intro">Uitgaande facturen komen rechtstreeks uit de bestaande factuurworkflow. Alleen de betaalstatus wordt hier apart en handmatig bijgehouden.</p>
    <section class="wbd-foundation-finance-summary" aria-label="Financiële samenvatting"><div><span>Uitgaand definitief</span><strong data-total-sent>—</strong></div><div><span>Open concepten</span><strong data-concept-count>—</strong></div><div><span>Inkomende facturen</span><strong>Nog geen</strong></div></section>
    <section class="workspace-section wbd-foundation-finance"><header><div><p class="workspace-label">Uitgaande facturen</p><h2>Status en relatie in één overzicht</h2></div><a href="/workspace/wbd/business-foundation/finance/facturen">Open factuurworkflow <span aria-hidden="true">→</span></a></header><div data-invoice-list><p class="wbd-empty">Facturen worden geladen…</p></div></section>
    <section class="workspace-section wbd-foundation-incoming-preview"><div><p class="workspace-label">Inkomend · Voorbereiding</p><h2>Ruimte voor leveranciersfacturen</h2><p>TransIP, OpenAI en andere zakelijke leveranciers krijgen hier later een vaste plek.</p></div><a href="/workspace/wbd/business-foundation/finance/inkomende-facturen">Bekijk de lege staat <span aria-hidden="true">→</span></a></section>`);

  try {
    const [{ invoices }, { concepts }, { payments }] = await Promise.all([
      api<{ invoices: InvoiceSummary[] }>(`${invoiceApi}/sent`),
      api<{ concepts: InvoiceSummary[] }>(`${invoiceApi}/concepts`),
      api<{ payments: Record<string, PaymentRecord> }>(`${foundationApi}/payments`),
    ]);
    const total = invoices.reduce((sum, invoice) => sum + Number(invoice.totals?.inclusive ?? 0), 0);
    app.querySelector<HTMLElement>("[data-total-sent]")!.textContent = formatMoney(String(total));
    app.querySelector<HTMLElement>("[data-concept-count]")!.textContent = String(concepts.length);
    const list = app.querySelector<HTMLElement>("[data-invoice-list]")!;
    list.innerHTML = [...invoices.map((invoice) => invoiceRow(invoice, "sent", payments[invoice.id])), ...concepts.map((invoice) => invoiceRow(invoice, "concept"))].join("") || `<p class="wbd-empty">Nog geen uitgaande facturen.</p>`;
    list.querySelectorAll<HTMLSelectElement>("[data-payment-status]").forEach((select) => {
      select.addEventListener("change", async () => {
        select.disabled = true;
        try {
          await api(`${foundationApi}/payments/${encodeURIComponent(select.dataset.invoiceId!)}`, { method: "PUT", body: JSON.stringify({ status: select.value }) });
          showNotice(app, "Betaalstatus handmatig bijgewerkt.");
        } catch (error) {
          showNotice(app, error instanceof Error ? error.message : "Betaalstatus kon niet worden bijgewerkt.", true);
        } finally {
          select.disabled = false;
        }
      });
    });
  } catch (error) {
    app.querySelector<HTMLElement>("[data-invoice-list]")!.innerHTML = `<p class="wbd-empty">${escapeHtml(error instanceof Error ? error.message : "Facturen konden niet worden geladen.")}</p>`;
  }
}

function renderIncoming(app: HTMLDivElement): void {
  document.title = "Inkomende facturen — We Build And Design Workspace";
  app.innerHTML = renderShell("business-foundation", "Inkomende facturen", "Business Foundation · Finance", "Voorbereid, nog niet geautomatiseerd", `
    ${renderBusinessNav("incoming")}
    <section class="workspace-section wbd-foundation-empty-state"><span aria-hidden="true">IN</span><div><p class="workspace-label">Nog leeg</p><h2>Leveranciersfacturen krijgen hier later hun plek.</h2><p>Deze structuur is voorbereid voor facturen van onder andere TransIP, OpenAI en andere zakelijke leveranciers.</p><small>Geen e-mailimport, OCR, automatische verwerking of boekhoudexport actief.</small></div></section>`);
}

function renderBusinessFoundation(app: HTMLDivElement): void {
  document.title = "Business Foundation — We Build And Design Workspace";
  app.innerHTML = renderShell("business-foundation", "Business Foundation", "We Build And Design · Bedrijfsbasis", "Blijvende bedrijfsmiddelen", `
    ${renderBusinessNav("foundation")}
    <p class="wbd-page-intro">De blijvende basis voor bedrijfsgegevens, financiën en herbruikbare documenten. Projectbestanden blijven daarvan gescheiden.</p>
    <nav class="wbd-foundation-business-grid" aria-label="Business Foundation onderdelen">
      <a href="/workspace/wbd/business-foundation/finance"><span>Finance</span><h2>Financieel overzicht</h2><p>Uitgaande facturen, handmatige betaalstatus en voorbereiding voor inkomende facturen.</p></a>
      <a href="/workspace/wbd/business-foundation/bedrijfsgegevens"><span>Organisatie</span><h2>Bedrijfsgegevens</h2><p>De vaste afzendergegevens die zakelijke documenten gebruiken.</p></a>
      <a href="/workspace/wbd/business-foundation/templates"><span>Hergebruik</span><h2>Templates</h2><p>Dezelfde WBD-basis voor facturen en toekomstige zakelijke documenten.</p></a>
      <a href="/workspace/wbd/tijdlijn"><span>Continuïteit</span><h2>Lokale back-up</h2><p>De bestaande lokale dossierback-up blijft bereikbaar vanuit de bedrijfsbasis.</p></a>
    </nav>`);
}

function renderCompany(app: HTMLDivElement): void {
  document.title = "Bedrijfsgegevens — We Build And Design Workspace";
  app.innerHTML = renderShell("business-foundation", "Bedrijfsgegevens", "Business Foundation · Organisatie", "Bron voor zakelijke documenten", `
    ${renderBusinessNav("company")}
    <section class="workspace-section wbd-foundation-company"><header><div><p class="workspace-label">Vaste afzender</p><h2>We Build And Design</h2></div><span>Gedeeld door factuursjabloon</span></header><dl><div><dt>Vestigingsadres</dt><dd>Gerard Terborchstraat 35<br>1318 LE Almere</dd></div><div><dt>KvK</dt><dd>69326126</dd></div><div><dt>Btw-nummer</dt><dd>NL190255879B01</dd></div><div><dt>IBAN</dt><dd>NL16 KNAB 0603 6280 95</dd></div><div><dt>E-mail</dt><dd>info@webuildanddesign.nl</dd></div><div><dt>Website</dt><dd>webuildanddesign.nl</dd></div></dl><footer>Deze pagina leest de bevestigde bedrijfsbasis; wijzigingen horen gecontroleerd in de centrale templatebron plaats te vinden.</footer></section>`);
}

function renderTemplates(app: HTMLDivElement): void {
  document.title = "Templates — We Build And Design Workspace";
  app.innerHTML = renderShell("business-foundation", "Templates", "Business Foundation · Hergebruik", "Eén vaste zakelijke basis", `
    ${renderBusinessNav("templates")}
    <section class="workspace-section wbd-foundation-template"><header><div><p class="workspace-label">Permanent bedrijfsmiddel</p><h2>WBD-factuursjabloon</h2></div><strong class="wbd-foundation-state" data-tone="positive">Actief</strong></header><p>De vaste branding, afzendergegevens, btw-berekening, validatie en PDF-opmaak vormen samen de herbruikbare basis voor WBD-facturen.</p><dl><div><dt>Werkplek</dt><dd>Business Foundation → Finance → Facturen</dd></div><div><dt>Doel</dt><dd>Consistente wettelijke en visuele facturen genereren.</dd></div><div><dt>Hergebruik</dt><dd>Basis voor toekomstige offertes en zakelijke documenten, zonder klantgebonden kopieën.</dd></div></dl><a href="/workspace/wbd/business-foundation/finance/facturen">Open factuurworkflow <span aria-hidden="true">→</span></a></section>`);
}

function renderInfrastructure(app: HTMLDivElement): void {
  document.title = "Infrastructuur — We Build And Design Workspace";
  app.innerHTML = renderShell("infrastructuur", "Infrastructuur", "We Build And Design · Hierna", "Project 002 · Nog niet gestart", `
    <p class="wbd-page-intro">De bekende toekomstige scope blijft zichtbaar, maar Experience Polish verdient eerst aandacht. Er zijn geen connectors of monitors actief.</p>
    <section class="workspace-section wbd-foundation-infrastructure"><header><div><p class="workspace-label">Infrastructure Foundation</p><h2>Van lokale Workspace naar een veilige online basis</h2></div><strong class="wbd-foundation-state" data-tone="waiting">Hierna</strong></header><div>${infrastructureItems.map((item) => `<article><span>${escapeHtml(item.label)}</span><strong data-tone="${item.tone}">${escapeHtml(item.status)}</strong></article>`).join("")}</div><footer><p>Project 002 bevat later TransIP-hosting, domein en SSL, back-ups, infrastructuurinzicht en zakelijke e-mail via SMTP en later IMAP.</p><small>Niet gebouwd en niet gestart: servermonitoring, SMTP, IMAP of TransIP-connector.</small></footer></section>`);
}

function showNotice(app: HTMLDivElement, message: string, isError = false): void {
  const notice = document.createElement("p");
  notice.className = `workspace-notice${isError ? " is-error" : ""}`;
  notice.setAttribute("role", isError ? "alert" : "status");
  notice.textContent = message;
  app.append(notice);
  window.setTimeout(() => notice.remove(), 4_000);
}

export function renderWbdFoundation(app: HTMLDivElement): void {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/workspace/wbd/overzicht";
  if (pathname === "/workspace/wbd/overzicht" || pathname === "/workspace/wbd") return renderOverview(app);
  if (pathname === "/workspace/wbd/projecten") return renderProjects(app);
  if (pathname === "/workspace/wbd/ontwikkelpartners") return renderPartners(app);
  if (pathname === "/workspace/wbd/ontwikkeling" || pathname === "/workspace/wbd/ontwikkeling/monitor") return renderMonitor(app);
  if (pathname === "/workspace/wbd/ontwikkeling/historie") return renderHistory(app);
  if (pathname === "/workspace/wbd/ontwikkeling/feedback") { void renderFeedback(app); return; }
  if (pathname === "/workspace/wbd/business-foundation") return renderBusinessFoundation(app);
  if (pathname === "/workspace/wbd/business-foundation/finance") { void renderFinance(app); return; }
  if (pathname === "/workspace/wbd/business-foundation/finance/inkomende-facturen") return renderIncoming(app);
  if (pathname === "/workspace/wbd/business-foundation/bedrijfsgegevens") return renderCompany(app);
  if (pathname === "/workspace/wbd/business-foundation/templates") return renderTemplates(app);
  if (pathname === "/workspace/wbd/infrastructuur") return renderInfrastructure(app);
  renderOverview(app);
}
