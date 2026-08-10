import "./styles/wbd-invoices.css";
import { wbdWorkspace } from "./workspace-config";
import { renderWorkspaceSidebar } from "./workspace-shell";
import { workspaceDocumentTitle } from "./workspace-routes";

type PriceMode = "inclusive" | "exclusive";

interface InvoiceLine {
  description: string;
  quantity: string;
  unit_price: string;
  price_mode: PriceMode;
  vat_rate: string;
}

interface InvoiceConcept {
  invoice: {
    number: string;
    date: string;
    payment_term_days: number;
    project: string;
    reference: string;
  };
  customer: {
    company_name: string;
    contact_person: string;
    email?: string;
    address: string;
    postal_code: string;
    city: string;
    reference: string;
  };
  lines: InvoiceLine[];
  workspace?: {
    concept_id: string;
    updated_at: string;
    finalized_at?: string;
    status?: "sent";
    locked?: boolean;
    pdf_url?: string;
    pdf_generated_at?: string;
    totals?: CalculationResult["totals"] | null;
  };
}

interface CalculationResult {
  lines: Array<{ net: string; vat: string; gross: string }>;
  totals: { exclusive: string; vat: string; inclusive: string };
}

interface ConceptSummary {
  id: string;
  number: string;
  date: string;
  project: string;
  customer_name: string;
  updated_at: string;
  finalized_at?: string;
  totals?: CalculationResult["totals"] | null;
}

const apiRoot = "/__wbd-invoices";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function today(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatMoney(value?: string): string {
  const number = Number(value ?? "0");
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value: string): string {
  if (!value) return "Datum nog niet ingevuld";
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "De factuuractie kon niet worden uitgevoerd.");
  return body as T;
}

async function mailApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      "X-WBD-Mail-Capture": "1",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
  if (!response.ok) throw new Error(body.message || body.error || "De mail-captureactie kon niet worden uitgevoerd.");
  return body as T;
}

function renderShell(title: string, content: string, context: string): string {
  return `<main class="atlas-workspace workspace-experience workspace-experience--wbd">
    <div class="workspace-shell">
      ${renderWorkspaceSidebar(wbdWorkspace, "business-foundation")}
      <div class="workspace-main wbd-dossier-main wbd-invoice-main" id="workspace-main-content" tabindex="-1">
        <header class="workspace-header workspace-placeholder-header">
          <div><p class="workspace-kicker">Business Foundation · Finance · Facturen</p><h1>${escapeHtml(title)}</h1></div>
          <p class="workspace-date">${escapeHtml(context)}</p>
        </header>
        ${content}
      </div>
    </div>
  </main>`;
}

function renderStorageNavigation(active: "concepts" | "sent" | "templates" = "concepts"): string {
  return `<nav class="wbd-invoice-storage" aria-label="Factuuropslag">
    <a class="${active === "concepts" ? "is-current" : ""}" href="/workspace/wbd/business-foundation/finance/facturen">Concepten <span>Werkend</span></a>
    <a class="${active === "sent" ? "is-current" : ""}" href="/workspace/wbd/business-foundation/finance/facturen/verzonden">Verzonden <span>Definitief</span></a>
    <span aria-disabled="true" class="${active === "templates" ? "is-current" : ""}">Templates <small>Basis aanwezig</small></span>
  </nav>`;
}

function renderInvoiceCard(invoice: ConceptSummary, storage: "concepts" | "sent"): string {
  const isSent = storage === "sent";
  const identity = invoice.number || "Factuurnummer nog niet ingevuld";
  const relation = invoice.customer_name || "Klant nog niet ingevuld";
  const href = isSent
    ? `/workspace/wbd/business-foundation/finance/facturen/verzonden/${encodeURIComponent(invoice.id)}`
    : `/workspace/wbd/business-foundation/finance/facturen/concepten/${encodeURIComponent(invoice.id)}`;
  return `<a class="wbd-invoice-concept" data-state="${isSent ? "sent" : "concept"}" href="${href}">
    <span class="wbd-invoice-concept__state">${isSent ? "Definitief" : "Concept"}</span>
    <div><p>${escapeHtml(relation)}</p><h3>${escapeHtml(identity)}</h3><span>${escapeHtml(invoice.project || "Project nog niet ingevuld")} · ${escapeHtml(formatDate(invoice.date))}</span></div>
    <div class="wbd-invoice-concept__amount"><strong>${formatMoney(invoice.totals?.inclusive)}</strong><small>${isSent ? "Definitief " : "Bijgewerkt "}${escapeHtml(formatDateTime(invoice.finalized_at || invoice.updated_at))}</small></div>
  </a>`;
}

async function renderConcepts(app: HTMLDivElement): Promise<void> {
  document.title = workspaceDocumentTitle("Facturen");
  app.innerHTML = renderShell("Facturen", `<p class="wbd-page-intro">Maak en heropen WBD-facturen vanuit één vaste invoerplek. De bestaande PDF-generator, validatie en branding blijven de bron.</p>
    ${renderStorageNavigation()}
    <section class="workspace-section wbd-dossier-panel wbd-invoice-overview" aria-labelledby="invoice-concepts-title">
      <header class="wbd-dossier-panel__header">
        <div><p class="workspace-label">Concepten</p><h2 id="invoice-concepts-title">Facturen in voorbereiding</h2></div>
        <a class="wbd-invoice-primary" href="/workspace/wbd/business-foundation/finance/facturen/nieuw">Nieuwe factuur</a>
      </header>
      <div class="wbd-invoice-concept-list" data-concept-list><p class="wbd-empty">Concepten worden geladen…</p></div>
    </section>`, "Finance");

  try {
    const { concepts } = await api<{ concepts: ConceptSummary[] }>("/concepts");
    const list = app.querySelector<HTMLElement>("[data-concept-list]")!;
    list.innerHTML = concepts.length
      ? concepts.map((concept) => renderInvoiceCard(concept, "concepts")).join("")
      : `<div class="wbd-invoice-empty"><p class="workspace-label">Nog leeg</p><h3>Begin met de eerste factuur</h3><p>Een opgeslagen concept verschijnt hier en kan later opnieuw worden geopend en aangepast.</p><a href="/workspace/wbd/business-foundation/finance/facturen/nieuw">Nieuwe factuur maken</a></div>`;
  } catch (error) {
    showMessage(app, error instanceof Error ? error.message : "Concepten konden niet worden geladen.", true);
  }
}

async function renderSentInvoices(app: HTMLDivElement): Promise<void> {
  document.title = workspaceDocumentTitle("Verzonden facturen");
  app.innerHTML = renderShell("Verzonden", `<p class="wbd-page-intro">Definitief gemaakte facturen staan hier vergrendeld. Deze status betekent nog niet dat automatisch een e-mail of boekhoudboeking is verstuurd.</p>
    ${renderStorageNavigation("sent")}
    <section class="workspace-section wbd-dossier-panel wbd-invoice-overview" aria-labelledby="sent-invoices-title">
      <header class="wbd-dossier-panel__header"><div><p class="workspace-label">Verzonden</p><h2 id="sent-invoices-title">Definitieve facturen</h2></div><span>Inhoud vergrendeld</span></header>
      <div class="wbd-invoice-concept-list" data-sent-list><p class="wbd-empty">Definitieve facturen worden geladen…</p></div>
    </section>`, "Finance");

  try {
    const { invoices } = await api<{ invoices: ConceptSummary[] }>("/sent");
    const list = app.querySelector<HTMLElement>("[data-sent-list]")!;
    list.innerHTML = invoices.length
      ? invoices.map((invoice) => renderInvoiceCard(invoice, "sent")).join("")
      : `<div class="wbd-invoice-empty"><p class="workspace-label">Nog leeg</p><h3>Nog geen definitieve facturen</h3><p>Een bevestigd concept wordt hier automatisch geplaatst en voor inhoudelijke wijzigingen vergrendeld.</p></div>`;
  } catch (error) {
    showMessage(app, error instanceof Error ? error.message : "Definitieve facturen konden niet worden geladen.", true);
  }
}

function blankLine(): InvoiceLine {
  return { description: "", quantity: "1", unit_price: "", price_mode: "inclusive", vat_rate: "21" };
}

function normalizeAmount(value: string): string {
  const cleaned = value.trim().replace(/\s/g, "");
  if (cleaned.includes(",")) return cleaned.replaceAll(".", "").replace(",", ".");
  return cleaned;
}

function valueOf(form: HTMLFormElement, name: string): string {
  return (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value.trim() ?? "";
}

function readForm(form: HTMLFormElement, conceptId?: string): InvoiceConcept & { id?: string } {
  const lines = [...form.querySelectorAll<HTMLElement>("[data-invoice-line]")].map((row) => ({
    description: (row.querySelector<HTMLInputElement>("[data-line-field='description']")?.value ?? "").trim(),
    quantity: normalizeAmount(row.querySelector<HTMLInputElement>("[data-line-field='quantity']")?.value ?? "1"),
    unit_price: normalizeAmount(row.querySelector<HTMLInputElement>("[data-line-field='unit_price']")?.value ?? ""),
    price_mode: (row.querySelector<HTMLSelectElement>("[data-line-field='price_mode']")?.value === "exclusive" ? "exclusive" : "inclusive") as PriceMode,
    vat_rate: normalizeAmount(row.querySelector<HTMLInputElement>("[data-line-field='vat_rate']")?.value ?? "21"),
  }));
  return {
    id: conceptId,
    invoice: {
      number: valueOf(form, "invoice_number"),
      date: valueOf(form, "invoice_date"),
      payment_term_days: Number(valueOf(form, "payment_term_days")) || 14,
      project: valueOf(form, "project"),
      reference: valueOf(form, "reference"),
    },
    customer: {
      company_name: valueOf(form, "company_name"),
      contact_person: valueOf(form, "contact_person"),
      email: valueOf(form, "customer_email"),
      address: valueOf(form, "address"),
      postal_code: valueOf(form, "postal_code"),
      city: valueOf(form, "city"),
      reference: valueOf(form, "customer_reference"),
    },
    lines,
  };
}

function input(label: string, name: string, value: string, type = "text", hint = "", locked = false): string {
  return `<label><span>${escapeHtml(label)}</span><input type="${type}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${hint ? `placeholder="${escapeHtml(hint)}"` : ""} ${locked ? "readonly" : ""}></label>`;
}

function renderLine(line: InvoiceLine, index: number, locked = false): string {
  return `<article class="wbd-invoice-line" data-invoice-line>
    <header><span>Regel ${index + 1}</span>${locked ? '<i class="wbd-invoice-lock-label">Vergrendeld</i>' : `<button type="button" data-remove-line aria-label="Factuurregel ${index + 1} verwijderen">Verwijderen</button>`}</header>
    <div class="wbd-invoice-line__fields">
      <label class="is-description"><span>Omschrijving</span><input data-line-field="description" value="${escapeHtml(line.description)}" placeholder="Werkzaamheden of product" ${locked ? "readonly" : ""}></label>
      <label><span>Aantal</span><input data-line-field="quantity" inputmode="decimal" value="${escapeHtml(line.quantity)}" ${locked ? "readonly" : ""}></label>
      <label><span>Bedrag per stuk</span><div class="wbd-money-input"><span>€</span><input data-line-field="unit_price" inputmode="decimal" value="${escapeHtml(line.unit_price)}" placeholder="0,00" ${locked ? "readonly" : ""}></div></label>
      <label><span>Bedrag is</span><select data-line-field="price_mode" ${locked ? "disabled" : ""}><option value="inclusive" ${line.price_mode === "inclusive" ? "selected" : ""}>Inclusief btw</option><option value="exclusive" ${line.price_mode === "exclusive" ? "selected" : ""}>Exclusief btw</option></select></label>
      <label><span>Btw</span><div class="wbd-rate-input"><input data-line-field="vat_rate" inputmode="decimal" value="${escapeHtml(line.vat_rate)}" ${locked ? "readonly" : ""}><span>%</span></div></label>
    </div>
    <p class="wbd-invoice-line__calculation" data-line-calculation>Vul een bedrag in voor de berekening.</p>
  </article>`;
}

function formMarkup(concept: InvoiceConcept, mode: "new" | "concept" | "sent"): string {
  const isExisting = mode !== "new";
  const locked = mode === "sent";
  const lines = concept.lines.length ? concept.lines : [blankLine()];
  const backHref = locked ? "/workspace/wbd/business-foundation/finance/facturen/verzonden" : "/workspace/wbd/business-foundation/finance/facturen";
  const finalPdfUrl = concept.workspace?.pdf_url ?? (concept.workspace?.concept_id ? `${apiRoot}/sent/${encodeURIComponent(concept.workspace.concept_id)}/pdf` : "");
  const conceptIdentity = concept.invoice.number || concept.customer.company_name || concept.workspace?.concept_id || "dit lege concept";
  return `<a class="wbd-dossier-back" href="${backHref}"><span aria-hidden="true">←</span> ${locked ? "Alle verzonden facturen" : "Alle concepten"}</a>
    ${renderStorageNavigation(locked ? "sent" : "concepts")}
    <form class="wbd-invoice-form" data-invoice-form novalidate>
      <div class="wbd-invoice-form__content">
        <section class="workspace-section wbd-dossier-panel wbd-invoice-section">
          <header><div><p class="workspace-label">01</p><h2>Factuurgegevens</h2></div><p>${locked ? "Definitief · vergrendeld" : isExisting ? "Bestaand concept" : "Nieuw concept"}</p></header>
          <div class="wbd-invoice-fields">
            ${input("Factuurnummer", "invoice_number", concept.invoice.number, "text", "Bijv. F2026-001", locked)}
            ${input("Factuurdatum", "invoice_date", concept.invoice.date || today(), "date", "", locked)}
            ${input("Betalingstermijn (dagen)", "payment_term_days", String(concept.invoice.payment_term_days || 14), "number", "", locked)}
            ${input("Project", "project", concept.invoice.project, "text", "Projectnaam", locked)}
            ${input("Referentie", "reference", concept.invoice.reference, "text", "Optioneel", locked)}
          </div>
        </section>

        <section class="workspace-section wbd-dossier-panel wbd-invoice-section">
          <header><div><p class="workspace-label">02</p><h2>Klantgegevens</h2></div><p>Voor op de factuur</p></header>
          <div class="wbd-invoice-fields">
            ${input("Bedrijfsnaam", "company_name", concept.customer.company_name, "text", "Organisatie", locked)}
            ${input("Contactpersoon", "contact_person", concept.customer.contact_person, "text", "Optioneel", locked)}
            ${input("E-mailadres factuur", "customer_email", concept.customer.email ?? "", "email", "facturen@klant.nl", locked)}
            ${input("Adres", "address", concept.customer.address, "text", "Straat en huisnummer", locked)}
            ${input("Postcode", "postal_code", concept.customer.postal_code, "text", "", locked)}
            ${input("Plaats", "city", concept.customer.city, "text", "", locked)}
            ${input("Klantreferentie", "customer_reference", concept.customer.reference, "text", "Optioneel", locked)}
          </div>
        </section>

        <section class="workspace-section wbd-dossier-panel wbd-invoice-section wbd-invoice-lines-section">
          <header><div><p class="workspace-label">03</p><h2>Factuurregels</h2></div><p>Inclusief of exclusief per regel</p></header>
          <div class="wbd-invoice-lines" data-lines>${lines.map((line, index) => renderLine(line, index, locked)).join("")}</div>
          ${locked ? "" : '<button class="wbd-invoice-add" type="button" data-add-line><span aria-hidden="true">+</span> Nieuwe regel toevoegen</button>'}
        </section>
      </div>

      <aside class="wbd-invoice-summary" aria-label="Factuurtotalen">
        ${locked ? `<section class="wbd-invoice-final-state" aria-label="Definitieve factuurstatus"><span>Definitief</span><h2>Factuur vergrendeld</h2><p>Definitief gemaakt ${concept.workspace?.finalized_at ? escapeHtml(formatDateTime(concept.workspace.finalized_at)) : "in de WBD Workspace"}</p></section>` : ""}
        <p class="workspace-label">${locked ? "Definitieve berekening" : "Live berekening"}</p>
        <h2>Totaal</h2>
        <dl>
          <div><dt>Exclusief btw</dt><dd data-total="exclusive">€ 0,00</dd></div>
          <div><dt>Btw</dt><dd data-total="vat">€ 0,00</dd></div>
          <div class="is-total"><dt>Te betalen</dt><dd data-total="inclusive">€ 0,00</dd></div>
        </dl>
        <p class="wbd-invoice-summary__source"><span></span> Berekend met de bestaande WBD-factuurlogica</p>
        ${locked ? `<div class="wbd-invoice-locked"><span aria-hidden="true">✓</span><div><strong>PDF direct beschikbaar</strong><p>De inhoud is vergrendeld en kan niet meer worden gewijzigd.</p></div></div>
        <div class="wbd-invoice-actions wbd-invoice-final-actions">
          <a class="is-primary" href="${escapeHtml(finalPdfUrl)}" target="_blank" rel="noopener">PDF openen</a>
          <a href="${escapeHtml(`${finalPdfUrl}?download=1`)}" download>PDF downloaden</a>
          <button type="button" data-action="print-final" data-pdf-url="${escapeHtml(finalPdfUrl)}">Printen</button>
        </div>
        <section class="wbd-mail-capture" data-wbd-mail-capture data-invoice-id="${escapeHtml(concept.workspace?.concept_id ?? "")}">
          <p class="workspace-label">MAIL FOUNDATION 003 · TECHNISCHE VALIDATIE</p>
          <h2>Factuurmail voorbereiden</h2>
          <p><strong>Ontvanger:</strong> ${escapeHtml(concept.customer.email || "Niet vastgelegd")}</p>
          <p class="wbd-mail-safety" data-mail-safety>De actieve transportmodus wordt server-side vastgesteld na de preview. Alleen de definitieve PDF wordt server-side toegevoegd.</p>
          <div class="wbd-invoice-actions">
            <button type="button" data-action="mail-preview" ${concept.customer.email ? "" : "disabled"}>Preview mail</button>
            <button type="button" data-action="mail-capture" disabled>Capture Send</button>
          </div>
          <div class="wbd-mail-preview" data-mail-preview aria-live="polite"><p>${concept.customer.email ? "Maak eerst een preview." : "Ontvanger ontbreekt in de definitieve factuur; capture is geblokkeerd."}</p></div>
          <div class="wbd-mail-history" data-mail-history><p>Communicatiehistorie wordt geladen…</p></div>
        </section>` : `<div class="wbd-invoice-actions">
          <button type="button" data-action="save">Opslaan als concept</button>
          <button class="is-primary" type="button" data-action="generate">PDF genereren</button>
          ${isExisting ? '<button class="is-finalize" type="button" data-action="request-finalize">Factuur definitief maken</button>' : ""}
          ${mode === "concept" ? '<button class="is-delete" type="button" data-action="request-delete">Concept verwijderen</button>' : ""}
          <a hidden data-pdf-link target="_blank" rel="noopener">Gegenereerde PDF openen ↗</a>
        </div>`}
        <p class="wbd-invoice-feedback" data-feedback role="status" aria-live="polite"></p>
      </aside>
    </form>
    ${mode === "concept" ? `<dialog class="wbd-invoice-confirmation" data-finalize-dialog>
      <form method="dialog">
        <p class="workspace-label">Statusovergang</p>
        <h2>Factuur definitief maken?</h2>
        <p>Controleer factuurnummer, klantgegevens, btw-gegevens en betaalgegevens. Na bevestiging wordt de factuur naar Verzonden verplaatst en inhoudelijk vergrendeld.</p>
        <ul><li>Conceptstatus wordt verwijderd</li><li>Inhoudelijke wijzigingen worden geblokkeerd</li><li>Er wordt nog geen e-mail of boekhoudboeking verstuurd</li></ul>
        <div><button value="cancel">Annuleren</button><button class="is-confirm" value="default" data-confirm-finalize>Ja, maak definitief</button></div>
      </form>
    </dialog>
    <dialog class="wbd-invoice-confirmation is-danger" data-delete-dialog>
      <form method="dialog">
        <p class="workspace-label">Concept opruimen</p>
        <h2>Concept verwijderen?</h2>
        <p>Je verwijdert <strong>${escapeHtml(conceptIdentity)}</strong>. Het concept en een eventueel gegenereerde concept-PDF verdwijnen definitief. Een verzonden factuur kan via deze actie niet worden verwijderd.</p>
        <div><button value="cancel">Annuleren</button><button class="is-delete-confirm" value="default" data-confirm-delete>Ja, verwijder concept</button></div>
      </form>
    </dialog>` : ""}`;
}

function updateLineNumbers(container: HTMLElement): void {
  [...container.querySelectorAll<HTMLElement>("[data-invoice-line]")].forEach((row, index) => {
    row.querySelector("header span")!.textContent = `Regel ${index + 1}`;
    row.querySelector<HTMLButtonElement>("[data-remove-line]")!.ariaLabel = `Factuurregel ${index + 1} verwijderen`;
  });
}

function setFeedback(form: HTMLFormElement, message: string, isError = false): void {
  const feedback = form.querySelector<HTMLElement>("[data-feedback]")!;
  feedback.textContent = message;
  feedback.dataset.state = isError ? "error" : "success";
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  for (const button of form.querySelectorAll<HTMLButtonElement>("[data-action]")) button.disabled = busy;
}

function applyCalculation(form: HTMLFormElement, calculation: CalculationResult): void {
  const rows = [...form.querySelectorAll<HTMLElement>("[data-invoice-line]")];
  rows.forEach((row, index) => {
    const line = calculation.lines[index];
    row.querySelector<HTMLElement>("[data-line-calculation]")!.textContent = line
      ? `${formatMoney(line.net)} excl. · ${formatMoney(line.vat)} btw · ${formatMoney(line.gross)} incl.`
      : "Vul een bedrag in voor de berekening.";
  });
  for (const key of ["exclusive", "vat", "inclusive"] as const) {
    form.querySelector<HTMLElement>(`[data-total='${key}']`)!.textContent = formatMoney(calculation.totals[key]);
  }
}

async function calculate(form: HTMLFormElement, conceptId?: string): Promise<void> {
  const data = readForm(form, conceptId);
  if (!data.lines.length || data.lines.some((line) => !line.unit_price || !line.quantity || !line.vat_rate)) {
    applyCalculation(form, { lines: [], totals: { exclusive: "0", vat: "0", inclusive: "0" } });
    return;
  }
  try {
    const calculation = await api<CalculationResult>("/calculate", { method: "POST", body: JSON.stringify({ lines: data.lines }) });
    applyCalculation(form, calculation);
  } catch (error) {
    setFeedback(form, error instanceof Error ? error.message : "De totalen konden niet worden berekend.", true);
  }
}

async function saveConcept(form: HTMLFormElement, conceptId?: string): Promise<InvoiceConcept> {
  const { concept } = await api<{ concept: InvoiceConcept }>("/concepts", {
    method: "POST",
    body: JSON.stringify(readForm(form, conceptId)),
  });
  return concept;
}

async function renderInvoiceForm(app: HTMLDivElement, requestedId?: string, storage: "concepts" | "sent" = "concepts"): Promise<void> {
  const locked = storage === "sent";
  const title = locked ? "Definitieve factuur" : requestedId ? "Concept bewerken" : "Nieuwe factuur";
  document.title = workspaceDocumentTitle(title);
  try {
    const response = locked && requestedId
      ? { concept: (await api<{ invoice: InvoiceConcept }>(`/sent/${encodeURIComponent(requestedId)}`)).invoice }
      : requestedId
        ? await api<{ concept: InvoiceConcept }>(`/concepts/${encodeURIComponent(requestedId)}`)
      : { concept: await api<InvoiceConcept>("/template") };
    let conceptId = response.concept.workspace?.concept_id;
    const mode = locked ? "sent" : requestedId ? "concept" : "new";
    app.innerHTML = renderShell(title, formMarkup(response.concept, mode), locked ? "Verzonden" : requestedId ? "Concept" : "Nieuwe invoer");

    const form = app.querySelector<HTMLFormElement>("[data-invoice-form]")!;
    if (locked) {
      const printButton = form.querySelector<HTMLButtonElement>("[data-action='print-final']")!;
      printButton.addEventListener("click", () => {
        const pdfUrl = printButton.dataset.pdfUrl;
        if (!pdfUrl) return setFeedback(form, "De definitieve PDF is niet beschikbaar.", true);
        const printWindow = window.open(pdfUrl, "_blank");
        if (!printWindow) return setFeedback(form, "Sta pop-ups toe om de factuur te printen.", true);
        let printStarted = false;
        const startPrint = (): void => {
          if (printStarted || printWindow.closed) return;
          printStarted = true;
          printWindow.focus();
          printWindow.print();
        };
        printWindow.addEventListener("load", startPrint, { once: true });
        window.setTimeout(startPrint, 900);
      });
      const mailSection = form.querySelector<HTMLElement>("[data-wbd-mail-capture]");
      const mailPreviewButton = form.querySelector<HTMLButtonElement>("[data-action='mail-preview']");
      const mailCaptureButton = form.querySelector<HTMLButtonElement>("[data-action='mail-capture']");
      const mailPreview = form.querySelector<HTMLElement>("[data-mail-preview]");
      const mailHistory = form.querySelector<HTMLElement>("[data-mail-history]");
      const mailSafety = form.querySelector<HTMLElement>("[data-mail-safety]");
      const invoiceId = mailSection?.dataset.invoiceId;
      const captureKey = `wbd-invoice-${invoiceId}-${crypto.randomUUID()}`;
      const renderHistory = async (): Promise<void> => {
        if (!invoiceId || !mailHistory) return;
        try {
          const { history } = await mailApi<{ history: Array<{ status: string; createdAt: string; initiatedBy: { name: string }; templateKey: string; safeResult: { message: string } }> }>(`/sent/${encodeURIComponent(invoiceId)}/mail/history`);
          mailHistory.innerHTML = history.length
            ? `<h3>Mailhistorie</h3>${history.map((entry) => `<article><strong>${escapeHtml(entry.templateKey)} · ${escapeHtml(entry.status)}</strong><span>${escapeHtml(formatDateTime(entry.createdAt))} · ${escapeHtml(entry.initiatedBy.name)}</span><p>${escapeHtml(entry.safeResult.message)}</p></article>`).join("")}`
            : "<h3>Mailhistorie</h3><p>Nog geen capturepogingen voor deze factuur.</p>";
        } catch (error) {
          mailHistory.textContent = error instanceof Error ? error.message : "Mailhistorie kon niet worden geladen.";
        }
      };
      mailPreviewButton?.addEventListener("click", async () => {
        if (!invoiceId || !mailPreview || !mailCaptureButton) return;
        mailPreviewButton.disabled = true;
        mailPreview.textContent = "Mailpreview wordt veilig opgebouwd…";
        try {
          const preview = await mailApi<{ sender: string; senderPolicy: string; subject: string; html: string; text: string; recipient: string; attachments: Array<{ filename: string; sizeBytes: number; mimeType: string }>; transport: string }>(`/sent/${encodeURIComponent(invoiceId)}/mail/preview`, { method: "POST", body: "{}" });
          const transportNote = preview.transport === "capture" ? "geen internetmail" : "gecontroleerde SMTP-modus";
          if (mailSafety) mailSafety.textContent = preview.transport === "capture"
            ? "CAPTURE is actief: er wordt geen internetmail verstuurd. Alleen de definitieve PDF wordt server-side toegevoegd."
            : "CONTROLLED_SMTP_TEST is actief: uitsluitend de server-side allowlisted testontvanger is toegestaan.";
          mailCaptureButton.textContent = preview.transport === "capture" ? "Capture Send" : "Gecontroleerd verzenden";
          mailPreview.innerHTML = `<dl><div><dt>Van</dt><dd>${escapeHtml(preview.sender)}<br><small>${escapeHtml(preview.senderPolicy)}</small></dd></div><div><dt>Aan</dt><dd>${escapeHtml(preview.recipient)}</dd></div><div><dt>Onderwerp</dt><dd>${escapeHtml(preview.subject)}</dd></div><div><dt>Transport</dt><dd>${escapeHtml(preview.transport)} · ${transportNote}</dd></div></dl><iframe sandbox title="HTML-preview factuurmail"></iframe><h3>Bijlage</h3>${preview.attachments.map((attachment) => `<p><strong>${escapeHtml(attachment.filename)}</strong><br>${escapeHtml(attachment.mimeType)} · ${Math.ceil(attachment.sizeBytes / 1024)} kB · server-controlled</p>`).join("")}`;
          mailPreview.querySelector<HTMLIFrameElement>("iframe")!.srcdoc = preview.html;
          mailCaptureButton.disabled = false;
        } catch (error) {
          mailPreview.textContent = error instanceof Error ? error.message : "De mailpreview kon niet worden opgebouwd.";
        } finally {
          mailPreviewButton.disabled = false;
        }
      });
      mailCaptureButton?.addEventListener("click", async () => {
        if (!invoiceId || !mailPreview || !mailCaptureButton) return;
        mailCaptureButton.disabled = true;
        try {
          const result = await mailApi<{ status: string; safeResult: { message: string }; duplicate?: boolean }>(`/sent/${encodeURIComponent(invoiceId)}/mail/capture`, { method: "POST", headers: { "Idempotency-Key": captureKey }, body: "{}" });
          mailPreview.insertAdjacentHTML("beforeend", `<p class="wbd-mail-result"><strong>${escapeHtml(result.status)}</strong><br>${escapeHtml(result.safeResult.message)}${result.duplicate ? " · dubbele aanvraag veilig onderschept" : ""}</p>`);
          await renderHistory();
        } catch (error) {
          mailPreview.insertAdjacentHTML("beforeend", `<p class="wbd-mail-result is-error">${escapeHtml(error instanceof Error ? error.message : "Capture Send is mislukt.")}</p>`);
          mailCaptureButton.disabled = false;
        }
      });
      void renderHistory();
      void calculate(form, conceptId);
      return;
    }
    const linesContainer = form.querySelector<HTMLElement>("[data-lines]")!;
    let calculationTimer = 0;
    const scheduleCalculation = (): void => {
      window.clearTimeout(calculationTimer);
      calculationTimer = window.setTimeout(() => void calculate(form, conceptId), 220);
    };

    form.addEventListener("input", scheduleCalculation);
    form.addEventListener("change", scheduleCalculation);
    form.querySelector<HTMLButtonElement>("[data-add-line]")!.addEventListener("click", () => {
      linesContainer.insertAdjacentHTML("beforeend", renderLine(blankLine(), linesContainer.children.length));
      scheduleCalculation();
    });
    linesContainer.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-line]");
      if (!button) return;
      button.closest("[data-invoice-line]")?.remove();
      if (!linesContainer.children.length) linesContainer.insertAdjacentHTML("beforeend", renderLine(blankLine(), 0));
      updateLineNumbers(linesContainer);
      scheduleCalculation();
    });

    form.querySelector<HTMLButtonElement>("[data-action='save']")!.addEventListener("click", async () => {
      setBusy(form, true);
      setFeedback(form, "Concept wordt opgeslagen…");
      try {
        const concept = await saveConcept(form, conceptId);
        conceptId = concept.workspace?.concept_id;
        if (conceptId) window.history.replaceState({}, "", `/workspace/wbd/business-foundation/finance/facturen/concepten/${encodeURIComponent(conceptId)}`);
        setFeedback(form, "Concept opgeslagen. Je kunt dit later opnieuw openen en bewerken.");
      } catch (error) {
        setFeedback(form, error instanceof Error ? error.message : "Het concept kon niet worden opgeslagen.", true);
      } finally {
        setBusy(form, false);
      }
    });

    form.querySelector<HTMLButtonElement>("[data-action='generate']")!.addEventListener("click", async () => {
      setBusy(form, true);
      setFeedback(form, "Concept wordt gecontroleerd en de PDF wordt opgebouwd…");
      try {
        const concept = await saveConcept(form, conceptId);
        conceptId = concept.workspace?.concept_id;
        if (!conceptId) throw new Error("Het concept heeft geen geldige opslagcode.");
        window.history.replaceState({}, "", `/workspace/wbd/business-foundation/finance/facturen/concepten/${encodeURIComponent(conceptId)}`);
        const result = await api<{ pdf_url: string }>(`/concepts/${encodeURIComponent(conceptId)}/generate`, { method: "POST" });
        const pdfLink = form.querySelector<HTMLAnchorElement>("[data-pdf-link]")!;
        pdfLink.href = result.pdf_url;
        pdfLink.hidden = false;
        setFeedback(form, "PDF gegenereerd met het vaste WBD-sjabloon.");
        pdfLink.click();
      } catch (error) {
        setFeedback(form, error instanceof Error ? error.message : "De PDF kon niet worden gegenereerd.", true);
      } finally {
        setBusy(form, false);
      }
    });

    const finalizeDialog = app.querySelector<HTMLDialogElement>("[data-finalize-dialog]");
    const requestFinalize = form.querySelector<HTMLButtonElement>("[data-action='request-finalize']");
    if (finalizeDialog && requestFinalize) {
      requestFinalize.addEventListener("click", () => finalizeDialog.showModal());
      finalizeDialog.querySelector<HTMLButtonElement>("[data-confirm-finalize]")!.addEventListener("click", async (event) => {
        event.preventDefault();
        finalizeDialog.close();
        setBusy(form, true);
        setFeedback(form, "Concept wordt gecontroleerd en definitief gemaakt…");
        try {
          const concept = await saveConcept(form, conceptId);
          conceptId = concept.workspace?.concept_id;
          if (!conceptId) throw new Error("Het concept heeft geen geldige opslagcode.");
          await api<{ invoice: InvoiceConcept }>(`/concepts/${encodeURIComponent(conceptId)}/finalize`, {
            method: "POST",
            body: JSON.stringify({ confirmed: true }),
          });
          window.history.replaceState({}, "", `/workspace/wbd/business-foundation/finance/facturen/verzonden/${encodeURIComponent(conceptId)}`);
          await renderInvoiceForm(app, conceptId, "sent");
        } catch (error) {
          setFeedback(form, error instanceof Error ? error.message : "De factuur kon niet definitief worden gemaakt.", true);
          setBusy(form, false);
        }
      });
    }

    const deleteDialog = app.querySelector<HTMLDialogElement>("[data-delete-dialog]");
    const requestDelete = form.querySelector<HTMLButtonElement>("[data-action='request-delete']");
    if (deleteDialog && requestDelete) {
      requestDelete.addEventListener("click", () => deleteDialog.showModal());
      deleteDialog.querySelector<HTMLButtonElement>("[data-confirm-delete]")!.addEventListener("click", async (event) => {
        event.preventDefault();
        deleteDialog.close();
        if (!conceptId) return setFeedback(form, "Het concept heeft geen geldige opslagcode.", true);
        setBusy(form, true);
        setFeedback(form, "Concept wordt verwijderd…");
        try {
          await api<{ deleted: true; id: string }>(`/concepts/${encodeURIComponent(conceptId)}`, { method: "DELETE" });
          window.history.replaceState({}, "", "/workspace/wbd/business-foundation/finance/facturen");
          await renderConcepts(app);
        } catch (error) {
          setFeedback(form, error instanceof Error ? error.message : "Het concept kon niet worden verwijderd.", true);
          setBusy(form, false);
        }
      });
    }

    void calculate(form, conceptId);
  } catch (error) {
    app.innerHTML = renderShell("Factuur niet beschikbaar", `<section class="workspace-section wbd-dossier-panel"><p class="wbd-page-intro">${escapeHtml(error instanceof Error ? error.message : "De factuur kon niet worden geopend.")}</p><a class="wbd-dossier-back" href="/workspace/wbd/business-foundation/finance/facturen">← Terug naar concepten</a></section>`, "Finance");
  }
}

function showMessage(app: HTMLDivElement, message: string, isError = false): void {
  const notice = document.createElement("p");
  notice.className = `workspace-notice${isError ? " is-error" : ""}`;
  notice.setAttribute("role", isError ? "alert" : "status");
  notice.textContent = message;
  app.append(notice);
}

export function renderWbdInvoices(app: HTMLDivElement): void {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const conceptMatch = pathname.match(/^\/workspace\/wbd\/business-foundation\/finance\/facturen\/concepten\/([^/]+)$/);
  const sentMatch = pathname.match(/^\/workspace\/wbd\/business-foundation\/finance\/facturen\/verzonden\/([^/]+)$/);
  if (pathname === "/workspace/wbd/business-foundation/finance/facturen/nieuw") {
    void renderInvoiceForm(app);
    return;
  }
  if (pathname === "/workspace/wbd/business-foundation/finance/facturen/verzonden") {
    void renderSentInvoices(app);
    return;
  }
  if (sentMatch) {
    void renderInvoiceForm(app, decodeURIComponent(sentMatch[1]), "sent");
    return;
  }
  if (conceptMatch) {
    void renderInvoiceForm(app, decodeURIComponent(conceptMatch[1]));
    return;
  }
  void renderConcepts(app);
}
