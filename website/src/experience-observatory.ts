import {
  experienceApi,
  ExperienceApiError,
  type ObservatoryDetail,
  type ObservatoryInvitation,
  type ObservatoryObservation,
  type ObservatoryOverview,
} from "./experience-validation-api";
import { deriveFirstInsight, stepById, summaryItems } from "./experience-store";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: ObservatoryInvitation["status"]): string {
  return ({ created: "Aangemaakt", opened: "Geopend", started: "Gestart", completed: "Afgerond", revoked: "Ingetrokken" })[status];
}

function shell(content: string): string {
  return `<main class="experience-observatory">
    <header class="observatory-header">
      <a href="/observatory" aria-label="Experience Observatory"><span>W</span><strong>Experience Observatory</strong></a>
      <button data-action="observatory-logout" type="button">Veilig afsluiten</button>
    </header>
    ${content}
  </main>`;
}

function renderLogin(): string {
  return `<main class="experience-observatory experience-observatory--login">
    <section class="observatory-login" aria-labelledby="observatory-login-title">
      <p>We Build And Design</p>
      <h1 id="observatory-login-title">Experience Observatory</h1>
      <p>Een afgeschermde interne omgeving voor onderzoek, menselijke review en historische Experiences.</p>
      <form data-form="observatory-login">
        <label>Beheerwachtwoord<input data-testid="observatory-password" name="password" type="password" autocomplete="current-password" required></label>
        <button data-testid="observatory-login" type="submit">Open Observatory</button>
      </form>
      <p class="observatory-error" data-login-error role="alert"></p>
    </section>
  </main>`;
}

function renderCounts(overview: ObservatoryOverview): string {
  const { counts } = overview;
  return `<dl class="observatory-counts" aria-label="Betekenisvolle gebruiksmomenten">
    <div><dt>Alle Experiences</dt><dd>${counts.invitations}</dd></div>
    <div><dt>Algemene instroom</dt><dd>${counts.organicEntries}</dd></div>
    <div><dt>Nieuwe deelnemers</dt><dd>${counts.organicStarted}</dd></div>
    <div><dt>Organisch hervat</dt><dd>${counts.organicResumed}</dd></div>
    <div><dt>Via gedeelde route</dt><dd>${counts.sharedEntries}</dd></div>
    <div><dt>Tokengebonden sessies</dt><dd>${counts.invitations - counts.organicEntries}</dd></div>
    <div><dt>Gestart</dt><dd>${counts.started}</dd></div>
    <div><dt>Afgerond</dt><dd>${counts.completed}</dd></div>
    <div><dt>Teruggekeerd</dt><dd>${counts.returned}</dd></div>
    <div><dt>Ervaringen gedeeld</dt><dd>${counts.feedback}</dd></div>
  </dl>`;
}

function renderInvitation(invitation: ObservatoryInvitation): string {
  const title = invitation.entryType === "organic"
    ? invitation.participantName || "Nieuwe deelnemer"
    : invitation.description || "Tokensessie zonder interne omschrijving";
  const context = invitation.entryType === "organic"
    ? [invitation.participantRole, invitation.participantOrganization, "Algemene ingang", invitation.referralId ? `via ${invitation.referralId}` : undefined].filter(Boolean).join(" · ")
    : "Tokengebonden toegang";
  return `<a class="observatory-invitation" href="/observatory/invitations/${encodeURIComponent(invitation.id)}" data-invitation-id="${escapeHtml(invitation.id)}">
    <span><strong>${escapeHtml(title)}</strong><small>${invitation.technicalTest ? "Technische acceptatie · " : ""}${escapeHtml(context)} · ${escapeHtml(statusLabel(invitation.status))}</small></span>
    <time datetime="${escapeHtml(invitation.lastActiveAt ?? invitation.createdAt)}">${escapeHtml(formatDate(invitation.lastActiveAt ?? invitation.createdAt))}</time>
  </a>`;
}

function renderOverview(overview: ObservatoryOverview): string {
  return shell(`<section class="observatory-intro">
      <p>Interne onderzoeks- en reviewomgeving</p>
      <h1>Wat echte Experiences ons leren.</h1>
      <p>Hier beoordelen we afzonderlijke Experiences, bewaren we hun historie en houden we menselijke observaties gescheiden van de woorden van deelnemers.</p>
    </section>
    ${renderCounts(overview)}
    <section class="observatory-section" aria-labelledby="invitations-title">
      <header><div><p>Afzonderlijke deelnemers</p><h2 id="invitations-title">Iedere Experience blijft van zichzelf</h2></div><span>Laatste activiteit ${escapeHtml(formatDate(overview.counts.lastActivity))}</span></header>
      <div class="observatory-invitations" data-testid="observatory-invitations">
        ${overview.invitations.length ? overview.invitations.map(renderInvitation).join("") : "<p>Nog geen Experiences gestart.</p>"}
      </div>
    </section>
    <section class="observatory-section observatory-create" aria-labelledby="create-invitation-title">
      <header><div><p>Legacy tokencompatibiliteit</p><h2 id="create-invitation-title">Maak alleen indien nodig een persoonlijke toegang</h2></div></header>
      <p>De normale Experience begint op /ervaar. Gebruik deze bestaande tokenroute alleen voor gerichte compatibiliteit of technische acceptatie.</p>
      <form data-form="create-invitation">
        <label>Interne omschrijving<input data-testid="invitation-description" name="description" maxlength="120" placeholder="Bijvoorbeeld: Experience #001 · Liona"></label>
        <label>Vervalt na <span>(optioneel)</span><input name="expiresAt" type="datetime-local"></label>
        <label class="observatory-check"><input name="technicalTest" type="checkbox"> Dit is technische acceptatiedata</label>
        <button data-testid="create-invitation" type="submit">Maak persoonlijke toegangslink</button>
      </form>
      <div class="observatory-created-link" data-created-link aria-live="polite"></div>
    </section>`);
}

function eventLabel(event: ObservatoryDetail["events"][number], version?: string): string {
  if (event.type === "question_answered") {
    return event.stepId ? `Vraag beantwoord · ${stepById(event.stepId as Parameters<typeof stepById>[0], version).summaryLabel}` : "Vraag beantwoord";
  }
  if (event.type === "insight_recognized") {
    const recognition = ({ yes: "herkend", partly: "gedeeltelijk herkend", "not-yet": "nog niet herkend" } as Record<string, string>)[event.stepId ?? "not-yet"] ?? "beantwoord";
    return `Eerste inzicht getoetst · ${recognition}`;
  }
  return ({
    invitation_opened: "Persoonlijke toegang geopend",
    organic_entry_created: "Nieuwe deelnemer via de algemene ingang",
    organic_shared_entry_created: "Nieuwe deelnemer via een gedeelde route",
    organic_participant_resumed: "Bestaande deelnemer hervat op hetzelfde apparaat",
    experience_started: "Experience gestart",
    runtime_transition_committed: "Cognitieve transitie veilig vastgelegd",
    runtime_external_correction_required: "Externe werkelijkheidstoets vereist",
    insight_explored: "Vrijwillige verdieping gekozen",
    insight_reflection_saved: "Vrijwillige verdieping in eigen woorden bewaard",
    insight_exploration_finished: "Verdieping vrijwillig afgerond",
    experience_completed: "Experience afgerond",
    workspace_opened: "Persoonlijke plek vrijwillig geopend",
    experience_returned: "Vrijwillig teruggekeerd",
    feedback_submitted: "Ervaring gedeeld via ‘Dit voelde vreemd’",
  } as const)[event.type] ?? event.type;
}

function observationField(name: keyof Omit<ObservatoryObservation, "updatedAt">, label: string, value: string): string {
  return `<label>${escapeHtml(label)}<textarea name="${name}" maxlength="2400">${escapeHtml(value)}</textarea></label>`;
}

function renderDetail(detail: ObservatoryDetail): string {
  const { invitation, session, observation } = detail;
  const participantSummary = session?.runtime
    ? session.runtime.field.realityContacts.map((contact, index) => ({ stepId: `runtime-${index}`, label: `Bijdrage ${index + 1}`, answer: contact.content }))
    : session ? summaryItems(session) : [];
  const participantInsight = session ? deriveFirstInsight(session) : undefined;
  const recognition = session?.insightRecognition ? ({ yes: "Ja", partly: "Gedeeltelijk", "not-yet": "Nog niet" } as const)[session.insightRecognition] : "Nog niet beantwoord";
  const detailTitle = invitation.entryType === "organic" ? invitation.participantName || "Nieuwe deelnemer" : invitation.description || "Tokensessie zonder interne omschrijving";
  const detailKind = invitation.entryType === "organic" ? "Algemene ingang" : "Tokengebonden toegang";
  return shell(`<a class="observatory-back" href="/observatory">← Alle Experiences</a>
    <section class="observatory-detail-header">
      <div><p>${escapeHtml(detailKind)} · ${escapeHtml(statusLabel(invitation.status))}${invitation.technicalTest ? " · technische acceptatie" : ""}</p><h1>${escapeHtml(detailTitle)}</h1></div>
      <dl><div><dt>Functie</dt><dd>${escapeHtml(invitation.participantRole || "—")}</dd></div><div><dt>Bedrijf</dt><dd>${escapeHtml(invitation.participantOrganization || "—")}</dd></div><div><dt>Herkomst</dt><dd>${escapeHtml(invitation.referralId || detailKind)}</dd></div><div><dt>Versie</dt><dd>${escapeHtml(session?.version ?? "Nog niet gestart")}</dd></div><div><dt>Laatste activiteit</dt><dd>${escapeHtml(formatDate(invitation.lastActiveAt))}</dd></div><div><dt>Vervalt</dt><dd>${escapeHtml(formatDate(invitation.expiresAt))}</dd></div></dl>
    </section>
    <div class="observatory-detail-grid">
      <section class="observatory-section" aria-labelledby="timeline-title"><header><div><p>Betekenisvolle momenten</p><h2 id="timeline-title">Tijdlijn</h2></div></header>
        <ol class="observatory-timeline" data-testid="observatory-timeline">${detail.events.length ? detail.events.map((event) => `<li><time datetime="${escapeHtml(event.createdAt)}">${escapeHtml(formatDate(event.createdAt))}</time><span>${escapeHtml(eventLabel(event, session?.version))}</span></li>`).join("") : "<li>Nog geen gebruiksmomenten.</li>"}</ol>
      </section>
      <section class="observatory-section" aria-labelledby="answers-title"><header><div><p>Zoals de deelnemer het zag</p><h2 id="answers-title">Eigen woorden</h2></div></header>
        <div class="observatory-answers" data-testid="observatory-answers">${participantSummary.length ? participantSummary.map((item) => `<article><h3>${escapeHtml(item.label)}</h3><blockquote>“${escapeHtml(item.answer)}”</blockquote>${session?.chosenStepId === item.stepId ? "<span>Door deelnemer gekozen om te bewaren</span>" : ""}</article>`).join("") : "<p>Nog geen antwoorden bewust ingestuurd.</p>"}</div>
      </section>
    ${session?.runtime ? `<section class="observatory-section" aria-labelledby="runtime-title"><header><div><p>Runtime Architecture V1</p><h2 id="runtime-title">Actueel cognitief onderzoeksbeeld</h2></div><span>Revisie ${session.runtime.field.revision}</span></header>
      <div class="observatory-answers" data-testid="observatory-runtime">
        <article><h3>Actuele beweging · ${escapeHtml(session.runtime.decision.movement)}</h3><p>${escapeHtml(session.runtime.decision.reason)}</p></article>
        ${session.runtime.field.hypotheses.map((hypothesis) => `<article><h3>${escapeHtml(hypothesis.status)} · ${escapeHtml(hypothesis.confidence)}</h3><p>${escapeHtml(hypothesis.statement)}</p><p><small>Alternatief: ${escapeHtml(hypothesis.alternative)}</small></p></article>`).join("") || "<p>Nog geen hypothese gevormd.</p>"}
      </div>
    </section>` : ""}
    </div>
    ${session && ["3.0-conversation-insight-v1", "4.0-living-research-loop-v1", "5.0-flow-recomposition-v1"].includes(session.version) ? `<section class="observatory-section" aria-labelledby="insight-title"><header><div><p>Voorzichtig teruggegeven</p><h2 id="insight-title">Eerste inzicht en verdieping</h2></div><span>Herkenning: ${escapeHtml(recognition)}</span></header>
      <div class="observatory-insight" data-testid="observatory-insight">
        <article><h3>${escapeHtml(participantInsight?.headline ?? "Nog geen inzicht beschikbaar")}</h3><p>${escapeHtml(participantInsight?.explanation ?? "")}</p></article>
        ${session.reflections.length ? session.reflections.map((reflection) => `<article><h3>${escapeHtml(({ why: "Waarom dit opviel", evidence: "Gebruikte uitspraken", customers: "Klanten of leveranciers", colleagues: "Collega’s", begin: "Waar het onderzoek kan beginnen", other: "Ander onderwerp" } as const)[reflection.topic])}</h3><p>${reflection.response ? escapeHtml(reflection.response) : "Bekeken zonder aanvullende woorden."}</p></article>`).join("") : "<p>Nog geen vrijwillige verdieping gekozen.</p>"}
      </div>
    </section>` : ""}
    <section class="observatory-section" aria-labelledby="feedback-title"><header><div><p>Vrijwillig gedeeld</p><h2 id="feedback-title">Dit voelde vreemd</h2></div></header>
      <div class="observatory-feedback" data-testid="observatory-feedback">${detail.feedback.length ? detail.feedback.map((item) => `<article><time>${escapeHtml(formatDate(item.createdAt))}</time><dl><div><dt>Verwachting</dt><dd>${escapeHtml(item.expected)}</dd></div><div><dt>Wat gebeurde</dt><dd>${escapeHtml(item.happened)}</dd></div><div><dt>Natuurlijker</dt><dd>${escapeHtml(item.natural)}</dd></div></dl></article>`).join("") : "<p>Geen vrijwillige ervaring gedeeld.</p>"}</div>
    </section>
    <section class="observatory-section observatory-observation" aria-labelledby="observation-title"><header><div><p>Alleen intern</p><h2 id="observation-title">Menselijke observaties</h2></div><span>${observation.updatedAt ? `Bijgewerkt ${escapeHtml(formatDate(observation.updatedAt))}` : "Nog niet vastgelegd"}</span></header>
      <p>Deze notities zijn van WBD en staan bewust los van de woorden van de deelnemer.</p>
      <form data-form="save-observation" data-invitation-id="${escapeHtml(invitation.id)}">
        ${observationField("expected", "Wat verwachtte iemand waarschijnlijk?", observation.expected)}
        ${observationField("surprising", "Wat was opvallend of verrassend?", observation.surprising)}
        ${observationField("valuable", "Welk moment leek waarde te geven?", observation.valuable)}
        ${observationField("confusing", "Waar ontstond twijfel of verwarring?", observation.confusing)}
        ${observationField("improvement", "Welke verbetering moet mogelijk onderzocht worden?", observation.improvement)}
        <button data-testid="save-observation" type="submit">Bewaar interne observatie</button>
      </form>
    </section>
    <section class="observatory-section observatory-access" aria-labelledby="access-title"><header><div><p>Toegang</p><h2 id="access-title">Experience beheren</h2></div></header>
      <p>Intrekken sluit bestaande apparaattoegang af zonder gegevens van andere deelnemers te raken.</p>
      ${invitation.status !== "revoked" ? '<button data-action="revoke-invitation" data-testid="revoke-invitation" type="button">Trek toegang in</button>' : "<p>Deze toegang is ingetrokken.</p>"}
      ${invitation.technicalTest ? '<button data-action="delete-test-invitation" type="button">Verwijder technische testdata</button>' : ""}
    </section>`);
}

function showObservatoryStatus(app: HTMLDivElement, message: string, error = false): void {
  app.querySelector(".observatory-status")?.remove();
  const node = document.createElement("p");
  node.className = "observatory-status";
  node.dataset.state = error ? "error" : "success";
  node.setAttribute("role", error ? "alert" : "status");
  node.textContent = message;
  app.append(node);
  window.setTimeout(() => node.remove(), 5000);
}

function setBusy(form: HTMLElement, busy: boolean): void {
  form.setAttribute("aria-busy", String(busy));
  form.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = busy; });
}

async function loadPage(app: HTMLDivElement): Promise<void> {
  const match = window.location.pathname.match(/^\/observatory\/invitations\/([^/]+)\/?$/);
  if (match) app.innerHTML = renderDetail(await experienceApi.observatoryDetail(decodeURIComponent(match[1])));
  else app.innerHTML = renderOverview(await experienceApi.observatoryOverview());
  attachActions(app);
}

function attachActions(app: HTMLDivElement): void {
  app.querySelector<HTMLButtonElement>("[data-action='observatory-logout']")?.addEventListener("click", async () => {
    await experienceApi.adminLogout().catch(() => undefined);
    window.history.replaceState({}, "", "/observatory");
    app.innerHTML = renderLogin();
    attachLogin(app);
  });

  app.querySelector<HTMLFormElement>("[data-form='create-invitation']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setBusy(form, true);
    try {
      const result = await experienceApi.createInvitation({
        description: String(data.get("description") ?? "").trim() || undefined,
        expiresAt: String(data.get("expiresAt") ?? "").trim() || undefined,
        technicalTest: data.get("technicalTest") === "on",
      });
      const output = app.querySelector<HTMLElement>("[data-created-link]")!;
      output.innerHTML = `<p>Persoonlijke toegangslink — de toegangscode wordt alleen nu getoond.</p><code>${escapeHtml(result.url)}</code><button data-action="copy-created-link" type="button">Kopieer link</button>`;
      output.querySelector<HTMLButtonElement>("[data-action='copy-created-link']")!.addEventListener("click", async () => {
        await navigator.clipboard.writeText(result.url);
        showObservatoryStatus(app, "Persoonlijke toegangslink gekopieerd.");
      });
      form.reset();
      showObservatoryStatus(app, "Persoonlijke toegangslink aangemaakt.");
    } catch (error) {
      showObservatoryStatus(app, error instanceof Error ? error.message : "De persoonlijke toegang kon niet worden gemaakt.", true);
    } finally {
      setBusy(form, false);
    }
  });

  app.querySelector<HTMLFormElement>("[data-form='save-observation']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setBusy(form, true);
    try {
      await experienceApi.saveObservation(form.dataset.invitationId!, {
        expected: String(data.get("expected") ?? ""),
        surprising: String(data.get("surprising") ?? ""),
        valuable: String(data.get("valuable") ?? ""),
        confusing: String(data.get("confusing") ?? ""),
        improvement: String(data.get("improvement") ?? ""),
      });
      showObservatoryStatus(app, "Interne observatie bewaard.");
    } catch (error) {
      showObservatoryStatus(app, error instanceof Error ? error.message : "De observatie kon niet worden bewaard.", true);
    } finally {
      setBusy(form, false);
    }
  });

  const invitationId = window.location.pathname.match(/^\/observatory\/invitations\/([^/]+)/)?.[1];
  app.querySelector<HTMLButtonElement>("[data-action='revoke-invitation']")?.addEventListener("click", async (event) => {
    if (!invitationId || !window.confirm("Deze persoonlijke toegang direct intrekken? De deelnemer krijgt daarna geen toegang meer.")) return;
    const button = event.currentTarget as HTMLButtonElement;
    setBusy(button, true);
    try {
      await experienceApi.revokeInvitation(decodeURIComponent(invitationId));
      await loadPage(app);
    } catch (error) {
      showObservatoryStatus(app, error instanceof Error ? error.message : "De persoonlijke toegang kon niet worden ingetrokken.", true);
      setBusy(button, false);
    }
  });
  app.querySelector<HTMLButtonElement>("[data-action='delete-test-invitation']")?.addEventListener("click", async () => {
    if (!invitationId || !window.confirm("Alle technische acceptatiedata definitief verwijderen?")) return;
    await experienceApi.deleteTechnicalInvitation(decodeURIComponent(invitationId));
    window.history.pushState({}, "", "/observatory");
    await loadPage(app);
  });
}

function attachLogin(app: HTMLDivElement): void {
  app.querySelector<HTMLFormElement>("[data-form='observatory-login']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const errorNode = app.querySelector<HTMLElement>("[data-login-error]")!;
    setBusy(form, true);
    errorNode.textContent = "";
    try {
      await experienceApi.adminLogin(String(new FormData(form).get("password") ?? ""));
      await loadPage(app);
    } catch (error) {
      errorNode.textContent = error instanceof Error ? error.message : "Het Observatory kon niet worden geopend.";
      setBusy(form, false);
    }
  });
}

export async function renderExperienceObservatory(app: HTMLDivElement): Promise<void> {
  document.documentElement.className = "experience-observatory-mode";
  document.documentElement.lang = "nl";
  document.title = "Experience Observatory — We Build And Design";
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
  try {
    await loadPage(app);
  } catch (error) {
    if (error instanceof ExperienceApiError && error.status === 401) {
      app.innerHTML = renderLogin();
      attachLogin(app);
      return;
    }
    app.innerHTML = renderLogin();
    attachLogin(app);
    app.querySelector<HTMLElement>("[data-login-error]")!.textContent = "Het Observatory kon niet veilig worden geopend.";
  }
}
