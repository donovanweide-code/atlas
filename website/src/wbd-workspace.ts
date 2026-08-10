import "./styles/workspace-base.css";
import "./styles/atlas-workspace.css";
import "./styles/wbd-dossier.css";
import { wbdWorkspace } from "./workspace-config";
import {
  createWbdBackup,
  parseWbdBackupFile,
  restoreWbdBackup,
  WbdBackupError,
  type WbdBackupFile,
} from "./wbd-dossier-backup";
import {
  type ContactNote,
  type DossierDocument,
  type Organization,
  type OrganizationDossier,
  type RestoreHistoryEntry,
  type RestoreMode,
  type RestoreResult,
  type TimelineEvent,
  wbdDossierRepository,
} from "./wbd-dossier-store";
import {
  knowledgeCategories,
  knowledgeProposalSources,
  type KnowledgeCategory,
  type KnowledgeEntry,
  type KnowledgeProposal,
  type KnowledgeProposalInput,
  type KnowledgeProposalSource,
  wbdKnowledgeRepository,
} from "./wbd-knowledge-store";
import {
  attachWorkspaceShellInteractions,
  renderWorkspaceSidebar,
} from "./workspace-shell";
import {
  resolveWbdWorkspaceRoute,
  workspaceDocumentTitle,
  WBD_WORKSPACE_HOME,
} from "./workspace-routes";
import { renderWbdFoundation } from "./wbd-foundation";
import { renderWbdInvoices } from "./wbd-invoices";
import "./styles/workspace-visual-foundation.css";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function localDateTimeValue(date = new Date()): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

let activeObjectUrls: string[] = [];
let activeBackupUrl: string | undefined;
let pendingBackup: WbdBackupFile | undefined;

function clearObjectUrls(): void {
  for (const url of activeObjectUrls) URL.revokeObjectURL(url);
  activeObjectUrls = [];
}

function renderPageShell(
  activeNavigationId: string,
  title: string,
  content: string,
  context = "Dagelijkse werkplek",
  mobileContext?: { label: string; backHref?: string; backLabel?: string },
): string {
  return `<main class="atlas-workspace workspace-experience workspace-experience--wbd">
    <div class="workspace-shell">
      ${renderWorkspaceSidebar(wbdWorkspace, activeNavigationId, mobileContext)}
      <div class="workspace-main ${activeNavigationId === "organisaties" || activeNavigationId === "tijdlijn" || activeNavigationId === "kennisvoorstellen" ? "wbd-dossier-main" : "workspace-placeholder-main"}" id="workspace-main-content" tabindex="-1">
        <header class="workspace-header workspace-placeholder-header">
          <div>
            <p class="workspace-kicker">We Build And Design</p>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <p class="workspace-date">${escapeHtml(context)}</p>
        </header>
        ${content}
      </div>
    </div>
  </main>`;
}

function renderOrganizationCard(organization: Organization): string {
  return `<a class="wbd-organization-card" data-testid="organization-card-${escapeHtml(organization.id)}" href="/workspace/wbd/organisaties/${escapeHtml(organization.id)}">
    <span class="wbd-organization-card__meta"><span>${escapeHtml(organization.type)}</span><span>Gewijzigd ${escapeHtml(formatDate(organization.updatedAt))}</span></span>
    <h3>${escapeHtml(organization.name)}</h3>
    <p>${escapeHtml(organization.description)}</p>
    <span class="wbd-organization-card__action">Open dossier <span aria-hidden="true">→</span></span>
  </a>`;
}

async function renderOrganizations(app: HTMLDivElement): Promise<void> {
  document.title = workspaceDocumentTitle("Organisaties");
  app.innerHTML = renderPageShell("organisaties", "Organisaties", `<p class="wbd-page-intro">Vier lokale dossiers vormen één rustige ingang naar documenten, contactmomenten en hun gezamenlijke geschiedenis.</p>
    <section class="workspace-section wbd-dossier-panel" aria-labelledby="organizations-title">
      <header class="wbd-dossier-panel__header">
        <div><p class="workspace-label">Dossiers</p><h2 id="organizations-title">Alles per organisatie bij elkaar</h2></div>
        <span>Lokale proef</span>
      </header>
      <div class="wbd-organization-grid" data-testid="organization-list" aria-live="polite"><p class="wbd-empty">Organisaties worden geladen…</p></div>
    </section>`);

  try {
    const organizations = await wbdDossierRepository.listOrganizations();
    const list = app.querySelector<HTMLDivElement>("[data-testid='organization-list']")!;
    list.innerHTML = organizations.map(renderOrganizationCard).join("");
  } catch (error) {
    showStatus(app, error instanceof Error ? error.message : "De organisaties konden niet worden geladen.", true);
  }
}

function renderDocument(document: DossierDocument): string {
  const objectUrl = URL.createObjectURL(document.file);
  activeObjectUrls.push(objectUrl);
  return `<article class="wbd-document-card" data-testid="document-${escapeHtml(document.id)}">
    <div class="wbd-document-card__meta"><span class="wbd-type-pill">${escapeHtml(document.documentType)}</span><span>${escapeHtml(formatDateTime(document.createdAt))}</span></div>
    <h3>${escapeHtml(document.title)}</h3>
    ${document.description ? `<p>${escapeHtml(document.description)}</p>` : ""}
    <p>${escapeHtml(document.originalFileName)} · ${escapeHtml(formatFileSize(document.sizeBytes))}</p>
    <div class="wbd-document-card__actions">
      <a data-testid="open-document-${escapeHtml(document.id)}" href="${objectUrl}" download="${escapeHtml(document.originalFileName)}">Open of download</a>
      <button type="button" data-action="request-delete-document" data-document-id="${escapeHtml(document.id)}" data-document-title="${escapeHtml(document.title)}">Verwijder</button>
    </div>
  </article>`;
}

function eventLabel(event: TimelineEvent): string {
  if (event.type === "document_added") return "Document toegevoegd";
  if (event.type === "document_removed") return "Document verwijderd";
  return "Contactmoment";
}

function renderTimelineEvent(event: TimelineEvent, notes: ContactNote[], organization: Organization): string {
  const note = event.contactNoteId ? notes.find((item) => item.id === event.contactNoteId) : undefined;
  return `<article class="wbd-timeline-item" data-testid="timeline-event-${escapeHtml(event.id)}">
    <time datetime="${escapeHtml(event.occurredAt)}">${escapeHtml(formatDateTime(event.occurredAt))}</time>
    <div>
      <strong>${escapeHtml(event.description)}</strong>
      ${note ? `<p>${escapeHtml(note.content)}</p>${note.contactPerson ? `<p>Contactpersoon: ${escapeHtml(note.contactPerson)}</p>` : ""}` : ""}
      <small>${escapeHtml(eventLabel(event))} · bron: ${escapeHtml(event.source)} · ${escapeHtml(organization.name)}</small>
      ${note ? `<button class="wbd-timeline-item__delete" type="button" data-action="request-delete-note" data-note-id="${escapeHtml(note.id)}" data-note-title="${escapeHtml(note.title)}">Notitie verwijderen</button>` : ""}
    </div>
  </article>`;
}

function renderDossierContent(dossier: OrganizationDossier): string {
  const { organization, documents, contactNotes, timelineEvents } = dossier;
  return `<a class="wbd-dossier-back" href="/workspace/wbd/organisaties"><span aria-hidden="true">←</span> Alle organisaties</a>
    <section class="wbd-dossier-hero" id="dossier-overview" aria-labelledby="dossier-title">
      <div>
        <p class="workspace-label">Overzicht · ${escapeHtml(organization.type)}</p>
        <h2 id="dossier-title">${escapeHtml(organization.name)}</h2>
        <p class="wbd-dossier-hero__description">${escapeHtml(organization.description)}</p>
      </div>
      <dl class="wbd-dossier-facts">
        <div><dt>Aangemaakt</dt><dd>${escapeHtml(formatDate(organization.createdAt))}</dd></div>
        <div><dt>Laatst gewijzigd</dt><dd>${escapeHtml(formatDateTime(organization.updatedAt))}</dd></div>
        <div><dt>Inhoud</dt><dd>${documents.length} ${documents.length === 1 ? "document" : "documenten"} · ${contactNotes.length} ${contactNotes.length === 1 ? "notitie" : "notities"}</dd></div>
        <div><dt>Opslag</dt><dd>Deze browser · IndexedDB</dd></div>
      </dl>
    </section>

    <nav class="workspace-dossier-nav" aria-label="Dossiersecties">
      <a href="#dossier-overview" aria-current="location">Overzicht</a>
      <a href="#timeline-title">Tijdlijn</a>
      <a href="#documents-title">Documenten</a>
    </nav>

    <div class="wbd-dossier-layout">
      <div class="wbd-dossier-column">
        <section class="workspace-section wbd-dossier-panel" aria-labelledby="documents-title">
          <header class="wbd-dossier-panel__header">
            <div><p class="workspace-label">Documenten</p><h2 id="documents-title">Bewaar wat bij dit dossier hoort</h2></div>
            <span>${documents.length} ${documents.length === 1 ? "document" : "documenten"}</span>
          </header>
          <div class="wbd-document-list" data-testid="document-list">
            ${documents.length ? documents.map(renderDocument).join("") : '<p class="wbd-empty">Nog geen documenten in dit dossier.</p>'}
          </div>
          <details class="workspace-action-disclosure">
            <summary><span class="workspace-action-disclosure__label">Document toevoegen</span><small>Upload met titel en documenttype</small></summary>
            <form class="wbd-dossier-form" data-form="document">
            <label data-wide="true">Bestand<input data-testid="document-file" name="file" type="file" required></label>
            <label>Titel<input data-testid="document-title" name="title" type="text" maxlength="100" required></label>
            <label>Documenttype<select data-testid="document-type" name="documentType" required>
              <option value="offerte">Offerte</option><option value="overeenkomst">Overeenkomst</option><option value="huisstijl">Huisstijl</option><option value="afbeelding">Afbeelding</option><option value="overig">Overig</option>
            </select></label>
            <label data-wide="true">Korte omschrijving <span>(optioneel)</span><textarea data-testid="document-description" name="description" maxlength="240"></textarea></label>
            <button data-testid="add-document" type="submit">Document toevoegen</button>
            </form>
          </details>
        </section>
      </div>

      <div class="wbd-dossier-column">
        <section class="workspace-section wbd-dossier-panel" aria-labelledby="timeline-title">
          <header class="wbd-dossier-panel__header">
            <div><p class="workspace-label">Tijdlijn</p><h2 id="timeline-title">De geschiedenis in één lijn</h2></div>
            <span>Nieuwste bovenaan</span>
          </header>
          <div class="wbd-timeline" data-testid="timeline-list" aria-live="polite">
            ${timelineEvents.length ? timelineEvents.map((event) => renderTimelineEvent(event, contactNotes, organization)).join("") : '<p class="wbd-empty">Nog geen gebeurtenissen. Voeg een document of contactmoment toe.</p>'}
          </div>
          <details class="workspace-action-disclosure">
            <summary><span class="workspace-action-disclosure__label">Contactmoment vastleggen</span><small>Telefoon, e-mail, gesprek of notitie</small></summary>
            <form class="wbd-dossier-form" data-form="contact-note">
            <label>Type<select data-testid="contact-type" name="type" required>
              <option value="telefoon">Telefoon</option><option value="e-mail">E-mail</option><option value="gesprek">Gesprek</option><option value="interne notitie">Interne notitie</option>
            </select></label>
            <label>Datum en tijd<input data-testid="contact-datetime" name="occurredAt" type="datetime-local" value="${localDateTimeValue()}" required></label>
            <label data-wide="true">Korte titel<input data-testid="contact-title" name="title" type="text" maxlength="100" required></label>
            <label data-wide="true">Contactpersoon <span>(optioneel)</span><input data-testid="contact-person" name="contactPerson" type="text" maxlength="100"></label>
            <label data-wide="true">Inhoud<textarea data-testid="contact-content" name="content" maxlength="1000" required></textarea></label>
            <button data-testid="add-contact-note" type="submit">Contactmoment vastleggen</button>
            </form>
          </details>
        </section>
      </div>
    </div>

    <dialog class="wbd-confirmation" data-testid="delete-confirmation">
      <div class="wbd-confirmation__inner">
        <p class="workspace-label">Expliciete bevestiging</p>
        <h2 data-confirmation-heading>Document verwijderen?</h2>
        <p data-confirmation-copy>Het bestand verdwijnt uit dit lokale dossier. De verwijdering blijft als gebeurtenis in de tijdlijn staan.</p>
        <div class="wbd-confirmation__actions">
          <button type="button" value="cancel" data-action="cancel-delete">Annuleren</button>
          <button type="button" data-testid="confirm-delete" data-action="confirm-delete" data-confirmation-action>Ja, verwijder document</button>
        </div>
      </div>
    </dialog>`;
}

function renderRestoreHistory(history: RestoreHistoryEntry[]): string {
  if (!history.length) return '<p class="wbd-empty">Nog geen back-up teruggezet in deze lokale Workspace.</p>';
  return history.map((entry) => `<article class="wbd-backup-history__item">
    <time datetime="${escapeHtml(entry.restoredAt)}">${escapeHtml(formatDateTime(entry.restoredAt))}</time>
    <div>
      <strong>Back-up teruggezet · ${entry.mode === "merge" ? "samengevoegd" : "lokale gegevens vervangen"}</strong>
      <p>Back-up van ${escapeHtml(formatDateTime(entry.backupExportedAt))}. ${entry.imported.total} toegevoegd, ${entry.skipped.total} overgeslagen en ${entry.conflicts.total} conflicterend.</p>
      <small>Bron: ${escapeHtml(entry.source)}</small>
    </div>
  </article>`).join("");
}

function renderRestoreResult(result: RestoreResult): string {
  return `<div class="wbd-backup-result" data-testid="restore-result" role="status">
    <p class="workspace-label">Herstel voltooid</p>
    <h3>${result.history.mode === "merge" ? "Back-up samengevoegd" : "Lokale gegevens vervangen"}</h3>
    <dl>
      <div><dt>Toegevoegd</dt><dd>${result.imported.total}</dd></div>
      <div><dt>Overgeslagen</dt><dd>${result.skipped.total}</dd></div>
      <div><dt>Conflicten</dt><dd>${result.conflicts.total}</dd></div>
    </dl>
    <p>Documenten: ${result.imported.documents} toegevoegd, ${result.skipped.documents} overgeslagen, ${result.conflicts.documents} conflicterend.</p>
  </div>`;
}

function backupErrorMessage(error: unknown): string {
  if (error instanceof WbdBackupError) return error.issues.join(" ");
  return error instanceof Error ? error.message : "De back-upactie is mislukt.";
}

async function refreshRestoreHistory(app: HTMLDivElement): Promise<void> {
  const container = app.querySelector<HTMLElement>("[data-testid='restore-history']");
  if (!container) return;
  container.innerHTML = renderRestoreHistory(await wbdDossierRepository.listRestoreHistory());
}

function attachImportPreviewActions(app: HTMLDivElement, backup: WbdBackupFile): void {
  const replaceDialog = app.querySelector<HTMLDialogElement>("[data-testid='replace-confirmation']")!;
  const resultContainer = app.querySelector<HTMLElement>("[data-testid='restore-result-container']")!;

  const applyBackup = async (mode: RestoreMode): Promise<void> => {
    try {
      const result = await restoreWbdBackup(wbdDossierRepository, backup, mode);
      resultContainer.innerHTML = renderRestoreResult(result);
      await refreshRestoreHistory(app);
      showStatus(app, mode === "merge" ? "Back-up veilig samengevoegd." : "Lokale gegevens veilig vervangen.");
    } catch (error) {
      resultContainer.innerHTML = `<p class="wbd-backup-error" role="alert">${escapeHtml(backupErrorMessage(error))} Bestaande lokale gegevens zijn niet aangepast.</p>`;
      showStatus(app, "Terugzetten mislukt; lokale gegevens zijn behouden.", true);
    }
  };

  app.querySelector<HTMLButtonElement>("[data-action='merge-backup']")!.addEventListener("click", () => void applyBackup("merge"));
  app.querySelector<HTMLButtonElement>("[data-action='replace-backup']")!.addEventListener("click", () => replaceDialog.showModal());
  app.querySelector<HTMLButtonElement>("[data-action='cancel-import']")!.addEventListener("click", () => {
    pendingBackup = undefined;
    app.querySelector<HTMLElement>("[data-testid='import-preview']")!.innerHTML = '<p class="wbd-empty">Selecteer een WBD-back-up om deze eerst veilig te controleren.</p>';
  });
  replaceDialog.querySelector<HTMLButtonElement>("[data-action='cancel-replace']")!.addEventListener("click", () => replaceDialog.close());
  replaceDialog.querySelector<HTMLButtonElement>("[data-action='confirm-replace']")!.addEventListener("click", () => {
    replaceDialog.close();
    void applyBackup("replace");
  });
}

async function renderBackupPage(app: HTMLDivElement): Promise<void> {
  clearObjectUrls();
  if (activeBackupUrl) URL.revokeObjectURL(activeBackupUrl);
  activeBackupUrl = undefined;
  pendingBackup = undefined;
  document.title = workspaceDocumentTitle("Lokale back-up");
  app.innerHTML = renderPageShell("tijdlijn", "Lokale back-up", `<p class="wbd-page-intro">Bewaar één volledige kopie van alle lokale organisatiedossiers, inclusief de daadwerkelijke documentbestanden.</p>
    <div class="wbd-backup-layout">
      <section class="workspace-section wbd-dossier-panel wbd-backup-panel" aria-labelledby="backup-export-title">
        <header class="wbd-dossier-panel__header">
          <div><p class="workspace-label">Export</p><h2 id="backup-export-title">Back-up maken</h2></div>
          <span>Volledige lokale kopie</span>
        </header>
        <p class="wbd-backup-panel__intro">Atlas controleert eerst ieder documentbestand, de bestandsgrootte en alle manifest-aantallen. Alleen een volledige back-up wordt downloadbaar.</p>
        <button class="wbd-backup-primary" data-testid="create-backup" type="button">Back-up maken</button>
        <div data-testid="export-result" aria-live="polite"><p class="wbd-empty">Nog geen back-up gemaakt.</p></div>
      </section>

      <section class="workspace-section wbd-dossier-panel wbd-backup-panel" aria-labelledby="backup-import-title">
        <header class="wbd-dossier-panel__header">
          <div><p class="workspace-label">Herstel</p><h2 id="backup-import-title">Back-up terugzetten</h2></div>
          <span>Eerst controleren</span>
        </header>
        <p class="wbd-backup-panel__intro">Selecteer een eerder gemaakte WBD-back-up. Er verandert niets voordat de inhoud volledig is gevalideerd en je een herstelmodus kiest.</p>
        <label class="wbd-backup-file">Back-upbestand<input data-testid="backup-file" type="file" accept=".json,application/json,application/vnd.wbd.workspace-backup+json"></label>
        <div data-testid="import-preview" aria-live="polite"><p class="wbd-empty">Selecteer een WBD-back-up om deze eerst veilig te controleren.</p></div>
        <div data-testid="restore-result-container"></div>
      </section>
    </div>

    <section class="workspace-section wbd-dossier-panel wbd-backup-history" aria-labelledby="backup-history-title">
      <header class="wbd-dossier-panel__header">
        <div><p class="workspace-label">Lokale historie</p><h2 id="backup-history-title">Teruggezette back-ups</h2></div>
        <span>Technische herkomst</span>
      </header>
      <div data-testid="restore-history" aria-live="polite"><p class="wbd-empty">Herstelhistorie wordt geladen…</p></div>
    </section>

    <dialog class="wbd-confirmation" data-testid="replace-confirmation">
      <div class="wbd-confirmation__inner">
        <p class="workspace-label">Onomkeerbare lokale vervanging</p>
        <h2>Alle lokale dossiergegevens vervangen?</h2>
        <p>De huidige lokale organisaties, documenten, bestanden, notities en tijdlijn worden pas gewist wanneer de volledig gevalideerde back-up in dezelfde transactie kan worden teruggezet.</p>
        <div class="wbd-confirmation__actions">
          <button type="button" value="cancel" data-action="cancel-replace">Annuleren</button>
          <button type="button" data-testid="confirm-replace" data-action="confirm-replace">Ja, vervang lokale gegevens</button>
        </div>
      </div>
    </dialog>`);

  await refreshRestoreHistory(app);
  const exportResult = app.querySelector<HTMLElement>("[data-testid='export-result']")!;
  app.querySelector<HTMLButtonElement>("[data-testid='create-backup']")!.addEventListener("click", async () => {
    exportResult.innerHTML = '<p class="wbd-empty">Documentbestanden en metadata worden gecontroleerd…</p>';
    try {
      const artifact = await createWbdBackup(await wbdDossierRepository.readAllData());
      if (activeBackupUrl) URL.revokeObjectURL(activeBackupUrl);
      activeBackupUrl = URL.createObjectURL(artifact.blob);
      const { counts } = artifact.backup.manifest;
      exportResult.innerHTML = `<div class="wbd-backup-result" data-testid="export-ready">
        <p class="workspace-label">Volledig gecontroleerd</p>
        <h3>Je lokale kopie staat klaar</h3>
        <dl>
          <div><dt>Organisaties</dt><dd>${counts.organizations}</dd></div>
          <div><dt>Documenten</dt><dd>${counts.documents}</dd></div>
          <div><dt>Notities</dt><dd>${counts.contactNotes}</dd></div>
          <div><dt>Bestanden</dt><dd>${counts.files}</dd></div>
        </dl>
        <a class="wbd-backup-download" data-testid="backup-download" href="${activeBackupUrl}" download="${escapeHtml(artifact.fileName)}">Download volledige back-up</a>
        <details class="wbd-backup-check" open>
          <summary>Technische controle · schema ${artifact.backup.manifest.schemaVersion}</summary>
          <ul data-testid="export-file-list">${artifact.backup.files.map((file) => `<li><span>${escapeHtml(file.originalFileName)}</span><small>${file.sizeBytes} bytes · SHA-256 ${escapeHtml(file.sha256.slice(0, 12))}…</small></li>`).join("") || "<li>Geen documenten in deze back-up.</li>"}</ul>
        </details>
      </div>`;
    } catch (error) {
      exportResult.innerHTML = `<p class="wbd-backup-error" role="alert">${escapeHtml(backupErrorMessage(error))} Er is geen back-upbestand gemaakt.</p>`;
    }
  });

  const importInput = app.querySelector<HTMLInputElement>("[data-testid='backup-file']")!;
  importInput.addEventListener("change", async () => {
    const preview = app.querySelector<HTMLElement>("[data-testid='import-preview']")!;
    const file = importInput.files?.[0];
    if (!file) return;
    preview.innerHTML = '<p class="wbd-empty">Manifest en documentbestanden worden gecontroleerd…</p>';
    try {
      pendingBackup = await parseWbdBackupFile(file);
      const { counts, exportedAt, schemaVersion } = pendingBackup.manifest;
      preview.innerHTML = `<div class="wbd-backup-preview" data-testid="valid-backup-preview">
        <p class="workspace-label">Geldige volledige back-up</p>
        <h3>Deze back-up kan veilig worden teruggezet</h3>
        <p>Gemaakt op ${escapeHtml(formatDateTime(exportedAt))} · schema ${schemaVersion}.</p>
        <dl>
          <div><dt>Organisaties</dt><dd>${counts.organizations}</dd></div>
          <div><dt>Documenten</dt><dd>${counts.documents}</dd></div>
          <div><dt>Contactnotities</dt><dd>${counts.contactNotes}</dd></div>
          <div><dt>Tijdlijn</dt><dd>${counts.timelineEvents}</dd></div>
          <div><dt>Bestanden</dt><dd>${counts.files}</dd></div>
        </dl>
        <div class="wbd-backup-actions">
          <button type="button" data-testid="merge-backup" data-action="merge-backup">Samenvoegen</button>
          <button type="button" data-testid="replace-backup" data-action="replace-backup">Lokale gegevens vervangen</button>
          <button type="button" value="cancel" data-action="cancel-import">Annuleren</button>
        </div>
      </div>`;
      attachImportPreviewActions(app, pendingBackup);
    } catch (error) {
      pendingBackup = undefined;
      preview.innerHTML = `<p class="wbd-backup-error" data-testid="invalid-backup" role="alert">Back-up geweigerd: ${escapeHtml(backupErrorMessage(error))} Bestaande lokale gegevens zijn niet aangepast.</p>`;
    }
  });
}

function knowledgeDateValue(value = new Date()): string {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function proposalFormValue(form: HTMLFormElement, name: string): string {
  return String(new FormData(form).get(name) ?? "");
}

function proposalInputFromForm(form: HTMLFormElement): KnowledgeProposalInput {
  return {
    title: proposalFormValue(form, "title"),
    summary: proposalFormValue(form, "summary"),
    importance: proposalFormValue(form, "importance"),
    category: proposalFormValue(form, "category") as KnowledgeCategory,
    source: proposalFormValue(form, "source") as KnowledgeProposalSource,
    capturedAt: proposalFormValue(form, "capturedAt"),
    comments: proposalFormValue(form, "comments"),
  };
}

function renderKnowledgeOptions<T extends string>(options: readonly T[], selected: T): string {
  return options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function renderProposalForm(mode: "create" | "edit", proposal?: KnowledgeProposal): string {
  const selectedCategory = proposal?.category ?? "Knowledge";
  const selectedSource = proposal?.source ?? "Handmatig";
  return `<form class="wbd-dossier-form wbd-knowledge-form" data-form="knowledge-${mode}">
    <label data-wide="true">Titel<input data-testid="proposal-title" name="title" type="text" maxlength="120" value="${escapeHtml(proposal?.title ?? "")}" required></label>
    <label data-wide="true">Korte samenvatting<textarea data-testid="proposal-summary" name="summary" maxlength="500" required>${escapeHtml(proposal?.summary ?? "")}</textarea></label>
    <label data-wide="true">Waarom dit belangrijk is<textarea data-testid="proposal-importance" name="importance" maxlength="700" required>${escapeHtml(proposal?.importance ?? "")}</textarea></label>
    <label>Categorie<select data-testid="proposal-category" name="category" required>${renderKnowledgeOptions(knowledgeCategories, selectedCategory)}</select></label>
    <label>Bron<select data-testid="proposal-source" name="source" required>${renderKnowledgeOptions(knowledgeProposalSources, selectedSource)}</select></label>
    <label>Datum<input data-testid="proposal-date" name="capturedAt" type="date" value="${escapeHtml(proposal ? knowledgeDateValue(new Date(proposal.capturedAt)) : knowledgeDateValue())}" required></label>
    <label data-wide="true">Opmerkingen <span>(optioneel)</span><textarea data-testid="proposal-comments" name="comments" maxlength="1200">${escapeHtml(proposal?.comments ?? "")}</textarea></label>
    <div class="wbd-knowledge-form__actions">
      ${mode === "edit" ? `<a href="/workspace/wbd/kennisvoorstellen/${encodeURIComponent(proposal!.id)}">Annuleren</a>` : ""}
      <button data-testid="${mode === "create" ? "create-proposal" : "save-proposal"}" type="submit">${mode === "create" ? "Voorstel bewaren" : "Wijzigingen bewaren"}</button>
    </div>
  </form>`;
}

function renderProposalCard(proposal: KnowledgeProposal): string {
  return `<article class="wbd-knowledge-proposal" data-testid="proposal-card-${escapeHtml(proposal.id)}">
    <div class="wbd-knowledge-proposal__meta">
      <span class="wbd-knowledge-status" data-status="${escapeHtml(proposal.status.toLowerCase())}">${escapeHtml(proposal.status)}</span>
      <span>${escapeHtml(proposal.source)} · ${escapeHtml(formatDate(proposal.capturedAt))}</span>
    </div>
    <p class="workspace-label">${escapeHtml(proposal.category)}</p>
    <h3>${escapeHtml(proposal.title)}</h3>
    <p>${escapeHtml(proposal.summary)}</p>
    <a href="/workspace/wbd/kennisvoorstellen/${encodeURIComponent(proposal.id)}">${proposal.status === "Nieuw" ? "Beoordeel voorstel" : "Bekijk voorstel"} <span aria-hidden="true">→</span></a>
  </article>`;
}

async function renderKnowledgeProposals(app: HTMLDivElement): Promise<void> {
  document.title = workspaceDocumentTitle("Kennisvoorstellen");
  const proposals = await wbdKnowledgeRepository.listProposals();
  const newCount = proposals.filter((proposal) => proposal.status === "Nieuw").length;
  app.innerHTML = renderPageShell("kennisvoorstellen", "Kennisvoorstellen", `<p class="wbd-page-intro">Nieuwe kennis begint hier altijd als voorstel. Niets wordt onderdeel van Atlas zonder menselijk oordeel.</p>
    <aside class="wbd-knowledge-principle" aria-label="Beslisprincipe">
      <p class="workspace-label">Beslisprincipe</p>
      <blockquote>Atlas verzamelt alleen kennis die een ondernemer helpt morgen betere beslissingen te nemen.</blockquote>
      <a href="/workspace/wbd/kennis">Open Atlas Knowledge Repository <span aria-hidden="true">→</span></a>
    </aside>

    <section class="workspace-section wbd-dossier-panel wbd-knowledge-list-panel" aria-labelledby="knowledge-proposals-title">
      <header class="wbd-dossier-panel__header">
        <div><p class="workspace-label">Menselijke beoordeling</p><h2 id="knowledge-proposals-title">Voorstellen die om een oordeel vragen</h2></div>
        <span>${newCount} nieuw · ${proposals.length} totaal</span>
      </header>
      <div class="wbd-knowledge-proposal-list" data-testid="proposal-list">
        ${proposals.length ? proposals.map(renderProposalCard).join("") : '<p class="wbd-empty">Nog geen kennisvoorstellen. Formuleer hieronder het eerste voorstel.</p>'}
      </div>
    </section>

    <details class="workspace-section wbd-dossier-panel wbd-knowledge-compose">
      <summary><span><small>Handmatige invoer</small><strong>Nieuw kennisvoorstel formuleren</strong></span><i aria-hidden="true">+</i></summary>
      <p>Leg alleen een voorstel vast dat later bewust kan worden beoordeeld. Bronlabels zijn handmatig; er is nog geen connector actief.</p>
      ${renderProposalForm("create")}
    </details>`);

  app.querySelector<HTMLFormElement>("[data-form='knowledge-create']")!.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    try {
      await wbdKnowledgeRepository.addProposal(proposalInputFromForm(form));
      await renderKnowledgeProposals(app);
      showStatus(app, "Kennisvoorstel lokaal bewaard voor beoordeling.");
    } catch (error) {
      showStatus(app, error instanceof Error ? error.message : "Het kennisvoorstel kon niet worden bewaard.", true);
    }
  });
}

function renderProposalReview(proposal: KnowledgeProposal): string {
  return `<a class="wbd-dossier-back" href="/workspace/wbd/kennisvoorstellen"><span aria-hidden="true">←</span> Alle kennisvoorstellen</a>
    <article class="wbd-knowledge-review" data-testid="proposal-detail">
      <header>
        <div>
          <p class="workspace-label">${escapeHtml(proposal.category)}</p>
          <h2>${escapeHtml(proposal.title)}</h2>
        </div>
        <span class="wbd-knowledge-status" data-status="${escapeHtml(proposal.status.toLowerCase())}">${escapeHtml(proposal.status)}</span>
      </header>
      <div class="wbd-knowledge-review__body">
        <section><p class="workspace-label">Samenvatting</p><p>${escapeHtml(proposal.summary)}</p></section>
        <section><p class="workspace-label">Waarom dit belangrijk is</p><p>${escapeHtml(proposal.importance)}</p></section>
        <section class="wbd-knowledge-review__meta">
          <dl>
            <div><dt>Bron</dt><dd>${escapeHtml(proposal.source)}</dd></div>
            <div><dt>Datum</dt><dd>${escapeHtml(formatDate(proposal.capturedAt))}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(proposal.status)}</dd></div>
          </dl>
        </section>
        <section><p class="workspace-label">Opmerkingen</p><p>${proposal.comments ? escapeHtml(proposal.comments) : "Nog geen opmerkingen toegevoegd."}</p></section>
      </div>
      <footer class="wbd-knowledge-review__actions">
        <button class="is-approve" data-testid="approve-proposal" type="button">Goedkeuren</button>
        <a data-testid="edit-proposal" href="/workspace/wbd/kennisvoorstellen/${encodeURIComponent(proposal.id)}?bewerken=1">Bewerken</a>
        <button class="is-reject" data-testid="reject-proposal" type="button">Afwijzen</button>
      </footer>
    </article>`;
}

async function renderKnowledgeProposalDetail(app: HTMLDivElement, proposalId: string, editMode: boolean): Promise<void> {
  const proposal = await wbdKnowledgeRepository.getProposal(proposalId);
  if (!proposal) {
    document.title = workspaceDocumentTitle("Kennisvoorstel niet gevonden");
    app.innerHTML = renderPageShell("kennisvoorstellen", "Voorstel niet gevonden", `<section class="workspace-section wbd-dossier-panel"><p class="wbd-page-intro">Dit voorstel bestaat niet meer of is inmiddels goedgekeurd.</p><a class="wbd-dossier-back" href="/workspace/wbd/kennisvoorstellen">← Terug naar kennisvoorstellen</a></section>`);
    return;
  }

  document.title = workspaceDocumentTitle(proposal.title);
  if (editMode) {
    app.innerHTML = renderPageShell("kennisvoorstellen", "Voorstel bewerken", `<a class="wbd-dossier-back" href="/workspace/wbd/kennisvoorstellen/${encodeURIComponent(proposal.id)}"><span aria-hidden="true">←</span> Terug naar beoordeling</a>
      <section class="workspace-section wbd-dossier-panel wbd-knowledge-edit" aria-labelledby="proposal-edit-title">
        <p class="workspace-label">Menselijke correctie</p>
        <h2 id="proposal-edit-title">Maak het voorstel scherp genoeg om te beoordelen</h2>
        ${renderProposalForm("edit", proposal)}
      </section>`, proposal.status);
    app.querySelector<HTMLFormElement>("[data-form='knowledge-edit']")!.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      try {
        await wbdKnowledgeRepository.updateProposal(proposal.id, proposalInputFromForm(form));
        window.history.replaceState({}, "", `/workspace/wbd/kennisvoorstellen/${encodeURIComponent(proposal.id)}`);
        await renderKnowledgeProposalDetail(app, proposal.id, false);
        showStatus(app, "Kennisvoorstel bijgewerkt.");
      } catch (error) {
        showStatus(app, error instanceof Error ? error.message : "Het voorstel kon niet worden bijgewerkt.", true);
      }
    });
    return;
  }

  app.innerHTML = renderPageShell("kennisvoorstellen", "Voorstel beoordelen", renderProposalReview(proposal), proposal.status);
  app.querySelector<HTMLButtonElement>("[data-testid='approve-proposal']")!.addEventListener("click", async () => {
    try {
      await wbdKnowledgeRepository.approveProposal(proposal.id);
      window.history.pushState({}, "", "/workspace/wbd/kennis");
      await renderKnowledgeRepository(app);
      showStatus(app, "Voorstel goedgekeurd en opgenomen in Atlas Knowledge Repository.");
    } catch (error) {
      showStatus(app, error instanceof Error ? error.message : "Het voorstel kon niet worden goedgekeurd.", true);
    }
  });
  app.querySelector<HTMLButtonElement>("[data-testid='reject-proposal']")!.addEventListener("click", async () => {
    try {
      await wbdKnowledgeRepository.rejectProposal(proposal.id);
      await renderKnowledgeProposalDetail(app, proposal.id, false);
      showStatus(app, "Voorstel afgewezen; er is geen kennis aan de repository toegevoegd.");
    } catch (error) {
      showStatus(app, error instanceof Error ? error.message : "Het voorstel kon niet worden afgewezen.", true);
    }
  });
}

function renderKnowledgeEntry(entry: KnowledgeEntry): string {
  return `<article class="wbd-knowledge-entry" data-testid="knowledge-entry-${escapeHtml(entry.id)}">
    <div><span>${escapeHtml(entry.source)}</span><time datetime="${escapeHtml(entry.approvedAt)}">Goedgekeurd ${escapeHtml(formatDate(entry.approvedAt))}</time></div>
    <h3>${escapeHtml(entry.title)}</h3>
    <p>${escapeHtml(entry.summary)}</p>
    <details><summary>Waarom dit helpt beslissen</summary><p>${escapeHtml(entry.importance)}</p>${entry.comments ? `<p><strong>Opmerking:</strong> ${escapeHtml(entry.comments)}</p>` : ""}</details>
  </article>`;
}

async function renderKnowledgeRepository(app: HTMLDivElement): Promise<void> {
  document.title = workspaceDocumentTitle("Atlas Knowledge Repository");
  const entries = await wbdKnowledgeRepository.listKnowledgeEntries();
  app.innerHTML = renderPageShell("kennisvoorstellen", "Knowledge Repository", `<p class="wbd-page-intro">Alleen menselijk goedgekeurde kennis krijgt hier een vaste plek. Afgewezen en open voorstellen blijven buiten deze repository.</p>
    <a class="wbd-dossier-back" href="/workspace/wbd/kennisvoorstellen"><span aria-hidden="true">←</span> Terug naar kennisvoorstellen</a>
    <div class="wbd-knowledge-repository" data-testid="knowledge-repository">
      ${knowledgeCategories.map((category) => {
        const categoryEntries = entries.filter((entry) => entry.category === category);
        return `<section class="workspace-section wbd-dossier-panel wbd-knowledge-category" aria-labelledby="category-${escapeHtml(category.replaceAll(" ", "-").toLowerCase())}">
          <header class="wbd-dossier-panel__header">
            <div><p class="workspace-label">Atlas Knowledge</p><h2 id="category-${escapeHtml(category.replaceAll(" ", "-").toLowerCase())}">${escapeHtml(category)}</h2></div>
            <span>${categoryEntries.length} ${categoryEntries.length === 1 ? "inzicht" : "inzichten"}</span>
          </header>
          <div class="wbd-knowledge-entry-list">${categoryEntries.length ? categoryEntries.map(renderKnowledgeEntry).join("") : '<p class="wbd-empty">Nog geen goedgekeurde kennis in deze categorie.</p>'}</div>
        </section>`;
      }).join("")}
    </div>`);
}

function showStatus(app: HTMLDivElement, message: string, isError = false): void {
  app.querySelector(".wbd-status")?.remove();
  const status = document.createElement("p");
  status.className = "wbd-status";
  status.dataset.state = isError ? "error" : "success";
  status.setAttribute("role", isError ? "alert" : "status");
  status.textContent = message;
  app.append(status);
  window.setTimeout(() => status.remove(), 4200);
}

async function renderDossier(app: HTMLDivElement, organizationId: string): Promise<void> {
  clearObjectUrls();
  const dossier = await wbdDossierRepository.getDossier(organizationId);
  if (!dossier) {
    document.title = workspaceDocumentTitle("Dossier niet gevonden");
    app.innerHTML = renderPageShell("organisaties", "Dossier niet gevonden", `<section class="workspace-section wbd-dossier-panel"><p class="wbd-page-intro">Deze organisatie bestaat niet in de lokale dossierproef.</p><a class="wbd-dossier-back" href="/workspace/wbd/organisaties">← Terug naar organisaties</a></section>`);
    return;
  }

  document.title = workspaceDocumentTitle(dossier.organization.name);
  app.innerHTML = renderPageShell(
    "organisaties",
    "Organisatiedossier",
    renderDossierContent(dossier),
    dossier.organization.name,
    {
      label: dossier.organization.name,
      backHref: "/workspace/wbd/organisaties",
      backLabel: "Terug naar organisaties",
    },
  );
  attachDossierInteractions(app, dossier.organization);
}

function attachDossierInteractions(app: HTMLDivElement, organization: Organization): void {
  const documentForm = app.querySelector<HTMLFormElement>("[data-form='document']")!;
  documentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = documentForm.elements.namedItem("file") as HTMLInputElement;
    const titleInput = documentForm.elements.namedItem("title") as HTMLInputElement;
    const typeInput = documentForm.elements.namedItem("documentType") as HTMLSelectElement;
    const descriptionInput = documentForm.elements.namedItem("description") as HTMLTextAreaElement;
    const file = fileInput.files?.[0];
    if (!file) return showStatus(app, "Selecteer eerst een bestand.", true);

    try {
      await wbdDossierRepository.addDocument({
        organizationId: organization.id,
        title: titleInput.value,
        documentType: typeInput.value as "offerte" | "overeenkomst" | "huisstijl" | "afbeelding" | "overig",
        description: descriptionInput.value,
        file,
      });
      await renderDossier(app, organization.id);
      showStatus(app, "Document lokaal toegevoegd aan het dossier.");
    } catch (error) {
      showStatus(app, error instanceof Error ? error.message : "Het document kon niet worden toegevoegd.", true);
    }
  });

  const noteForm = app.querySelector<HTMLFormElement>("[data-form='contact-note']")!;
  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const typeInput = noteForm.elements.namedItem("type") as HTMLSelectElement;
    const titleInput = noteForm.elements.namedItem("title") as HTMLInputElement;
    const contentInput = noteForm.elements.namedItem("content") as HTMLTextAreaElement;
    const occurredAtInput = noteForm.elements.namedItem("occurredAt") as HTMLInputElement;
    const contactPersonInput = noteForm.elements.namedItem("contactPerson") as HTMLInputElement;

    try {
      await wbdDossierRepository.addContactNote({
        organizationId: organization.id,
        type: typeInput.value as "telefoon" | "e-mail" | "gesprek" | "interne notitie",
        title: titleInput.value,
        content: contentInput.value,
        occurredAt: occurredAtInput.value,
        contactPerson: contactPersonInput.value,
      });
      await renderDossier(app, organization.id);
      showStatus(app, "Contactmoment toegevoegd aan de tijdlijn.");
    } catch (error) {
      showStatus(app, error instanceof Error ? error.message : "Het contactmoment kon niet worden toegevoegd.", true);
    }
  });

  const dialog = app.querySelector<HTMLDialogElement>("[data-testid='delete-confirmation']")!;
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-action='request-delete-document']")) {
    button.addEventListener("click", () => {
      dialog.dataset.deleteKind = "document";
      dialog.dataset.documentId = button.dataset.documentId;
      delete dialog.dataset.noteId;
      dialog.querySelector<HTMLElement>("[data-confirmation-heading]")!.textContent = "Document verwijderen?";
      dialog.querySelector<HTMLButtonElement>("[data-confirmation-action]")!.textContent = "Ja, verwijder document";
      const copy = dialog.querySelector<HTMLElement>("[data-confirmation-copy]")!;
      copy.textContent = `‘${button.dataset.documentTitle ?? "Dit document"}’ verdwijnt uit dit lokale dossier. De verwijdering blijft als gebeurtenis in de tijdlijn staan.`;
      dialog.showModal();
    });
  }
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-action='request-delete-note']")) {
    button.addEventListener("click", () => {
      dialog.dataset.deleteKind = "note";
      dialog.dataset.noteId = button.dataset.noteId;
      delete dialog.dataset.documentId;
      dialog.querySelector<HTMLElement>("[data-confirmation-heading]")!.textContent = "Contactnotitie verwijderen?";
      dialog.querySelector<HTMLButtonElement>("[data-confirmation-action]")!.textContent = "Ja, verwijder notitie";
      const copy = dialog.querySelector<HTMLElement>("[data-confirmation-copy]")!;
      copy.textContent = `‘${button.dataset.noteTitle ?? "Deze notitie"}’ en de bijbehorende tijdlijnregel verdwijnen uit dit lokale dossier.`;
      dialog.showModal();
    });
  }
  dialog.querySelector<HTMLButtonElement>("[data-action='cancel-delete']")!.addEventListener("click", () => dialog.close());
  dialog.querySelector<HTMLButtonElement>("[data-action='confirm-delete']")!.addEventListener("click", async () => {
    try {
      if (dialog.dataset.deleteKind === "note") {
        const noteId = dialog.dataset.noteId;
        if (!noteId) return;
        await wbdDossierRepository.removeContactNote(noteId);
      } else {
        const documentId = dialog.dataset.documentId;
        if (!documentId) return;
        await wbdDossierRepository.removeDocument(documentId);
      }
      dialog.close();
      await renderDossier(app, organization.id);
      showStatus(app, dialog.dataset.deleteKind === "note" ? "Contactnotitie verwijderd." : "Document verwijderd; de tijdlijn is bijgewerkt.");
    } catch (error) {
      dialog.close();
      showStatus(app, error instanceof Error ? error.message : "Het document kon niet worden verwijderd.", true);
    }
  });
}

function renderWorkspaceNotFound(app: HTMLDivElement): void {
  document.title = workspaceDocumentTitle("Route niet gevonden");
  console.warn("WBD_WORKSPACE_ROUTE_NOT_FOUND", { routeClass: "workspace" });
  app.innerHTML = renderPageShell("", "Route niet gevonden", `
    <section class="workspace-section workspace-placeholder" data-route-status="not-found" aria-labelledby="workspace-not-found-title">
      <p class="workspace-label">404 · Workspace</p>
      <h2 id="workspace-not-found-title">Deze route bestaat niet.</h2>
      <p>De link is mogelijk verouderd of bevat een typefout. Er is geen andere pagina als geldige route weergegeven.</p>
      <p><a class="workspace-opening__action" href="${WBD_WORKSPACE_HOME}"><span>Terug naar Home</span><i aria-hidden="true">→</i></a></p>
    </section>`, "Veilige herstelroute");
}

function renderWorkspaceRouteParsingError(app: HTMLDivElement): void {
  document.title = workspaceDocumentTitle("Route kan niet worden gelezen");
  console.warn("WBD_WORKSPACE_ROUTE_PARSE_ERROR", { routeClass: "workspace" });
  app.innerHTML = renderPageShell("", "Route kan niet worden gelezen", `
    <section class="workspace-section workspace-placeholder" data-route-status="parse-error" aria-labelledby="workspace-route-error-title">
      <p class="workspace-label">Ongeldige route</p>
      <h2 id="workspace-route-error-title">Deze link kan niet veilig worden geopend.</h2>
      <p>Controleer het adres of ga terug naar de vaste ingang van de Workspace.</p>
      <p><a class="workspace-opening__action" href="${WBD_WORKSPACE_HOME}"><span>Terug naar Home</span><i aria-hidden="true">→</i></a></p>
    </section>`, "Geen automatische fallback");
}

function renderOrganizationRouteContract(
  app: HTMLDivElement,
  organizationId: string,
  kind: "documents" | "document-new" | "note-new",
): void {
  const dossierPath = `/workspace/wbd/organisaties/${encodeURIComponent(organizationId)}`;
  const routeCopy = kind === "documents"
    ? {
        title: "Documenten",
        label: "Dossierroute",
        heading: "Documenten blijven bij hun organisatiecontext.",
        body: "Deze dedicated route is technisch beschikbaar voor WS.3. De huidige lokale documenten blijven tot die fase in het bestaande dossier zichtbaar.",
      }
    : kind === "document-new"
      ? {
          title: "Document toevoegen",
          label: "Focusroute · contract",
          heading: "Een document toevoegen krijgt een eigen herstelbare route.",
          body: "Het uploadformulier wordt pas binnen de data- en documentboundary geïmplementeerd. Deze route bewijst nu alleen directe toegang, terugcontext en mobiel hergebruik.",
        }
      : {
          title: "Notitie toevoegen",
          label: "Focusroute · contract",
          heading: "Een contactnotitie krijgt een eigen herstelbare route.",
          body: "De invoer blijft in deze fase in het bestaande dossier. Deze route reserveert de latere focuscontext zonder een tweede datastroom te bouwen.",
        };

  document.title = workspaceDocumentTitle(routeCopy.title);
  app.innerHTML = renderPageShell("organisaties", routeCopy.title, `
    <section class="workspace-section workspace-placeholder" data-route-status="focus-contract" data-organization-context="${escapeHtml(organizationId)}" aria-labelledby="workspace-focus-title">
      <p class="workspace-label">${routeCopy.label}</p>
      <h2 id="workspace-focus-title">${routeCopy.heading}</h2>
      <p>${routeCopy.body}</p>
      <p><a class="workspace-opening__action" href="${escapeHtml(dossierPath)}"><span>${kind === "documents" ? "Terug naar dossier" : "Annuleren en terug"}</span><i aria-hidden="true">←</i></a></p>
    </section>`, `Organisatiecontext · ${organizationId}`, {
      label: routeCopy.title,
      backHref: dossierPath,
      backLabel: "Terug naar organisatiedossier",
    });
}

export function renderWorkspaceApplicationError(app: HTMLDivElement): void {
  document.title = workspaceDocumentTitle("Workspace tijdelijk niet beschikbaar");
  app.innerHTML = renderPageShell("", "Workspace tijdelijk niet beschikbaar", `
    <section class="workspace-section workspace-placeholder" data-route-status="application-error" role="alert" aria-labelledby="workspace-application-error-title">
      <p class="workspace-label">Application error</p>
      <h2 id="workspace-application-error-title">Deze pagina kon niet veilig worden geladen.</h2>
      <p>Er zijn geen technische details of gegevens getoond. Probeer de vaste Workspace-ingang opnieuw.</p>
      <p><a class="workspace-opening__action" href="${WBD_WORKSPACE_HOME}"><span>Opnieuw naar Home</span><i aria-hidden="true">→</i></a></p>
    </section>`, "Veilige foutgrens");
}

export function renderWbdWorkspace(app: HTMLDivElement): void {
  document.documentElement.classList.add("atlas-workspace-mode");
  document.documentElement.lang = "nl";

  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = "noindex, nofollow";

  const resolved = resolveWbdWorkspaceRoute(window.location.pathname);
  if (resolved.status === "parse-error") {
    renderWorkspaceRouteParsingError(app);
    return;
  }
  if (resolved.status === "not-found" || !resolved.definition) {
    renderWorkspaceNotFound(app);
    return;
  }
  if (resolved.redirectTo) {
    window.history.replaceState(window.history.state, "", `${resolved.redirectTo}${window.location.search}${window.location.hash}`);
  }

  const routeId = resolved.definition.id;
  if (["invoice-list", "invoice-new", "invoice-sent-list", "invoice-concept", "invoice-sent"].includes(routeId)) {
    renderWbdInvoices(app);
    return;
  }
  if ([
    "home",
    "projects",
    "development-partners",
    "development-monitor",
    "development-history",
    "development-feedback",
    "business-foundation",
    "company-details",
    "finance",
    "incoming-invoices",
    "templates",
    "infrastructure",
  ].includes(routeId)) {
    renderWbdFoundation(app);
    return;
  }
  if (routeId === "organization") {
    app.innerHTML = renderPageShell("organisaties", "Organisatiedossier", '<p class="wbd-page-intro">Dossier wordt geladen…</p>');
    void renderDossier(app, resolved.params.organizationId).catch((error: unknown) => {
      showStatus(app, error instanceof Error ? error.message : "Het dossier kon niet worden geladen.", true);
    });
    return;
  }
  if (routeId === "organization-documents" || routeId === "organization-document-new" || routeId === "organization-note-new") {
    renderOrganizationRouteContract(
      app,
      resolved.params.organizationId,
      routeId === "organization-documents" ? "documents" : routeId === "organization-document-new" ? "document-new" : "note-new",
    );
    return;
  }
  if (routeId === "knowledge-proposal") {
    app.innerHTML = renderPageShell("kennisvoorstellen", "Voorstel beoordelen", '<p class="wbd-page-intro">Kennisvoorstel wordt geladen…</p>');
    const editMode = new URLSearchParams(window.location.search).get("bewerken") === "1";
    void renderKnowledgeProposalDetail(app, resolved.params.proposalId, editMode).catch((error: unknown) => {
      showStatus(app, error instanceof Error ? error.message : "Het kennisvoorstel kon niet worden geladen.", true);
    });
    return;
  }
  if (routeId === "knowledge") {
    void renderKnowledgeRepository(app).catch((error: unknown) => {
      showStatus(app, error instanceof Error ? error.message : "De Knowledge Repository kon niet worden geladen.", true);
    });
    return;
  }
  if (routeId === "organizations") {
    void renderOrganizations(app);
    return;
  }
  if (routeId === "continuity") {
    void renderBackupPage(app).catch((error: unknown) => {
      showStatus(app, error instanceof Error ? error.message : "De lokale back-upomgeving kon niet worden geladen.", true);
    });
    return;
  }
  if (routeId === "knowledge-proposals") {
    void renderKnowledgeProposals(app).catch((error: unknown) => {
      showStatus(app, error instanceof Error ? error.message : "De kennisvoorstellen konden niet worden geladen.", true);
    });
    return;
  }
  renderWorkspaceNotFound(app);
}

export function mountWbdWorkspaceApplication(app: HTMLDivElement): void {
  attachWorkspaceShellInteractions(app);
  const renderCurrentRoute = () => {
    try {
      renderWbdWorkspace(app);
    } catch {
      renderWorkspaceApplicationError(app);
    }
  };

  window.addEventListener("popstate", renderCurrentRoute);
  renderCurrentRoute();
}
