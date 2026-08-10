import "./styles/atlas-workspace.css";
import "./styles/experience-admin-workspace.css";
import {
  experienceApi,
  ExperienceApiError,
  type ObservatoryDetail,
  type ObservatoryInvitation,
  type ObservatoryOverview,
} from "./experience-validation-api";
import { summaryItems } from "./experience-store";
import { experienceWorkspace } from "./workspace-config";
import { renderWorkspaceSidebar } from "./workspace-shell";

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
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isExpired(invitation: ObservatoryInvitation): boolean {
  return Boolean(invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now());
}

function statusLabel(invitation: ObservatoryInvitation): string {
  if (isExpired(invitation)) return "Verlopen";
  return ({
    created: "Nog niet gestart",
    opened: "Bezig",
    started: "Bezig",
    completed: "Afgerond",
    revoked: "Ingetrokken",
  } as const)[invitation.status];
}

function sourceLabel(invitation: ObservatoryInvitation): string {
  if (invitation.entryType === "organic") return invitation.referralId ? "Algemeen · gedeelde route" : "Algemene ingang";
  return "Persoonlijke toegang";
}

function sessionTitle(invitation: ObservatoryInvitation): string {
  if (invitation.entryType === "organic") return invitation.participantName || "Algemene Experience";
  return invitation.description || "Bestaande persoonlijke sessie";
}

function atlasReviewHref(): string {
  const local = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  return local
    ? `http://${window.location.hostname}:5173/atlas#observatie-review`
    : "https://webuildanddesign.nl/atlas#observatie-review";
}

function renderAccessSection(): string {
  return `<section class="workspace-section experience-admin-access" aria-labelledby="experience-access-title">
    <div class="experience-admin-access__intro">
      <p class="workspace-label">Deelnemer en beheer blijven gescheiden</p>
      <h2 id="experience-access-title">Drie ingangen, ieder met een eigen betekenis.</h2>
      <p>De Experience helpt iemand een werkelijk werkmoment te onderzoeken. Deze Workspace leest uitsluitend bestaande, bewust opgeslagen resultaten voor opvolging en menselijke review.</p>
    </div>
    <div class="experience-admin-access__routes">
      <article data-route="public">
        <span>01 · Algemene ingang</span>
        <h3>/ervaar</h3>
        <p>Voor iemand die de algemene menselijke Experience begint of op dit apparaat hervat.</p>
        <div><a class="experience-admin-button" href="/ervaar" target="_blank" rel="noopener">Open Experience</a><button class="experience-admin-text-action" data-copy-experience-link type="button">Kopieer link</button></div>
      </article>
      <article data-route="personal">
        <span>02 · Bestaande sessie</span>
        <h3>/e/#token</h3>
        <p>Alleen voor een concrete persoonlijke toegang of een bestaande geldige sessie. Hier wordt geen fictieve link gemaakt.</p>
      </article>
      <article data-route="workspace">
        <span>03 · Interne Workspace</span>
        <h3>/workspace/experience</h3>
        <p>Voor We Build And Design: overzicht, bestaande antwoorden, opvolging en menselijke review.</p>
      </article>
    </div>
    <p class="experience-admin-copy-status" data-copy-status role="status" aria-live="polite"></p>
  </section>`;
}

function renderFrame(content: string, context = "Interne beheer- en reviewomgeving"): string {
  return `<main class="atlas-workspace workspace-experience experience-admin-workspace">
    <div class="workspace-shell">
      ${renderWorkspaceSidebar(experienceWorkspace, "overzicht")}
      <div class="workspace-main experience-admin-main">
        <header class="workspace-header experience-admin-header">
          <div><p class="workspace-kicker">We Build And Design · Experience</p><h1>De menselijke Experience, zorgvuldig gevolgd.</h1></div>
          <p class="workspace-date">${escapeHtml(context)}</p>
        </header>
        ${renderAccessSection()}
        ${content}
      </div>
    </div>
  </main>`;
}

function renderLogin(): string {
  return `<section class="workspace-section experience-admin-login" aria-labelledby="experience-login-title">
    <div><p class="workspace-label">Afgeschermde gegevens</p><h2 id="experience-login-title">Open het interne overzicht.</h2><p>Gebruik dezelfde bestaande beheerstoegang als het Observatory. Er wordt geen deelnemerssessie gestart en er is geen persoonlijke token nodig.</p></div>
    <form data-experience-admin-login>
      <label for="experience-admin-password">Beheerwachtwoord</label>
      <input id="experience-admin-password" name="password" type="password" autocomplete="current-password" required>
      <button class="experience-admin-button" type="submit">Open Experience Workspace</button>
      <p data-login-error role="alert"></p>
    </form>
  </section>`;
}

function renderEmpty(): string {
  return `<section class="workspace-section experience-admin-empty" aria-labelledby="experience-empty-title">
    <p class="workspace-label">Nog geen sessies</p>
    <h2 id="experience-empty-title">Er zijn nog geen bestaande Experiences om te beoordelen.</h2>
    <p>De algemene ingang staat klaar op <strong>/ervaar</strong>. Zodra iemand bewust antwoorden verstuurt, verschijnt de bestaande sessie hier vanuit dezelfde bron.</p>
    <a class="experience-admin-button" href="/ervaar" target="_blank" rel="noopener">Open algemene Experience</a>
  </section>`;
}

function renderSession(invitation: ObservatoryInvitation): string {
  return `<a class="experience-admin-session" href="/workspace/experience/sessions/${encodeURIComponent(invitation.id)}" data-session-id="${escapeHtml(invitation.id)}">
    <span class="experience-admin-session__top"><span>${escapeHtml(sourceLabel(invitation))}</span><strong data-status="${escapeHtml(statusLabel(invitation).toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(statusLabel(invitation))}</strong></span>
    <h3>${escapeHtml(sessionTitle(invitation))}</h3>
    <p>${escapeHtml([invitation.participantRole, invitation.participantOrganization].filter(Boolean).join(" · ") || "Context wordt zichtbaar wanneer die bewust is gedeeld.")}</p>
    <dl><div><dt>Gestart</dt><dd>${escapeHtml(formatDate(invitation.startedAt ?? invitation.openedAt))}</dd></div><div><dt>Laatst actief</dt><dd>${escapeHtml(formatDate(invitation.lastActiveAt ?? invitation.createdAt))}</dd></div></dl>
    <span class="experience-admin-session__action">Bekijk bestaande resultaten <span aria-hidden="true">→</span></span>
  </a>`;
}

function renderOverview(overview: ObservatoryOverview): string {
  if (!overview.invitations.length) return renderEmpty();
  const active = overview.invitations.filter((invitation) => ["opened", "started"].includes(invitation.status) && !isExpired(invitation)).length;
  const completed = overview.invitations.filter((invitation) => invitation.status === "completed").length;
  return `<section class="workspace-section experience-admin-overview" aria-labelledby="experience-overview-title">
    <header class="experience-admin-section-header">
      <div><p class="workspace-label">Bestaande sessies</p><h2 id="experience-overview-title">Iedere Experience blijft van zichzelf.</h2><p>Deze lijst leest de bestaande Experience-bron één keer. Er ontstaat geen tweede sessie- of antwoordmodel.</p></div>
      <dl aria-label="Sessiesamenvatting"><div><dt>Beschikbaar</dt><dd>${overview.invitations.length}</dd></div><div><dt>Bezig</dt><dd>${active}</dd></div><div><dt>Afgerond</dt><dd>${completed}</dd></div></dl>
    </header>
    <div class="experience-admin-session-list">${overview.invitations.map(renderSession).join("")}</div>
    <footer><p>Observatory blijft de specialistische onderzoeks- en historische omgeving.</p><a href="/observatory">Open Observatory <span aria-hidden="true">→</span></a></footer>
  </section>`;
}

function answerItems(detail: ObservatoryDetail): { label: string; answer: string }[] {
  if (detail.session?.runtime) {
    return detail.session.runtime.field.realityContacts.map((contact, index) => ({ label: `Bewuste bijdrage ${index + 1}`, answer: contact.content }));
  }
  return detail.session ? summaryItems(detail.session).map((item) => ({ label: item.label, answer: item.answer })) : [];
}

function renderDetail(detail: ObservatoryDetail): string {
  const answers = answerItems(detail);
  const observations = [detail.observation.expected, detail.observation.surprising, detail.observation.valuable, detail.observation.confusing, detail.observation.improvement].filter(Boolean);
  return `<section class="experience-admin-detail" aria-labelledby="experience-detail-title">
    <a class="experience-admin-back" href="/workspace/experience">← Alle Experiences</a>
    <header class="workspace-section experience-admin-detail__header">
      <div><p class="workspace-label">${escapeHtml(sourceLabel(detail.invitation))} · ${escapeHtml(statusLabel(detail.invitation))}</p><h2 id="experience-detail-title">${escapeHtml(sessionTitle(detail.invitation))}</h2><p>${escapeHtml([detail.invitation.participantRole, detail.invitation.participantOrganization].filter(Boolean).join(" · ") || "Geen aanvullende organisatiecontext bewust gedeeld.")}</p></div>
      <dl><div><dt>Gestart</dt><dd>${escapeHtml(formatDate(detail.invitation.startedAt ?? detail.invitation.openedAt))}</dd></div><div><dt>Laatst actief</dt><dd>${escapeHtml(formatDate(detail.invitation.lastActiveAt))}</dd></div><div><dt>Versie</dt><dd>${escapeHtml(detail.session?.version ?? "Nog niet gestart")}</dd></div></dl>
    </header>
    <div class="experience-admin-detail__grid">
      <section class="workspace-section" aria-labelledby="experience-answers-title"><p class="workspace-label">Bewust ingestuurd</p><h2 id="experience-answers-title">Eigen woorden</h2><div class="experience-admin-answers">${answers.length ? answers.map((item) => `<article><h3>${escapeHtml(item.label)}</h3><blockquote>“${escapeHtml(item.answer)}”</blockquote></article>`).join("") : "<p>Nog geen antwoorden bewust ingestuurd.</p>"}</div></section>
      <section class="workspace-section" aria-labelledby="experience-timeline-title"><p class="workspace-label">Voortgang en herkomst</p><h2 id="experience-timeline-title">Betekenisvolle momenten</h2><ol class="experience-admin-timeline">${detail.events.length ? detail.events.map((event) => `<li><time datetime="${escapeHtml(event.createdAt)}">${escapeHtml(formatDate(event.createdAt))}</time><span>${escapeHtml(event.type.replaceAll("_", " "))}</span></li>`).join("") : "<li>Nog geen gebruiksmomenten.</li>"}</ol></section>
      <section class="workspace-section" aria-labelledby="experience-feedback-title"><p class="workspace-label">Vrijwillig gedeeld</p><h2 id="experience-feedback-title">Feedback</h2>${detail.feedback.length ? detail.feedback.map((item) => `<article class="experience-admin-feedback"><time>${escapeHtml(formatDate(item.createdAt))}</time><p>${escapeHtml(item.happened)}</p></article>`).join("") : "<p>Geen vrijwillige feedback gedeeld.</p>"}</section>
      <section class="workspace-section" aria-labelledby="experience-review-title"><p class="workspace-label">Menselijke beoordeling</p><h2 id="experience-review-title">Betekenis ontstaat niet automatisch.</h2><p>${observations.length ? `${observations.length} bestaande interne observatie${observations.length === 1 ? "" : "s"} zijn bij deze Experience vastgelegd.` : "Er zijn nog geen interne observaties bij deze Experience vastgelegd."}</p><p>Beoordeling en eventuele doorstroming blijven in de canonieke Atlas-observatiereview.</p><a class="experience-admin-button" href="${escapeHtml(atlasReviewHref())}">Open menselijke review</a></section>
    </div>
    <p class="experience-admin-privacy-boundary">Bron: bestaande Experience-opslag. Alleen bewust verstuurde antwoorden, betekenisvolle gebeurtenissen en vrijwillige feedback zijn zichtbaar. Niet-verstuurde concepttekst wordt niet centraal opgeslagen of hier getoond.</p>
  </section>`;
}

function attachSharedActions(app: HTMLDivElement): void {
  app.querySelector<HTMLButtonElement>("[data-copy-experience-link]")?.addEventListener("click", async () => {
    const status = app.querySelector<HTMLElement>("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(new URL("/ervaar", window.location.origin).href);
      if (status) status.textContent = "De algemene Experience-link is gekopieerd.";
    } catch {
      if (status) status.textContent = "Kopiëren lukte niet. Gebruik /ervaar.";
    }
  });
}

function attachLogin(app: HTMLDivElement): void {
  app.querySelector<HTMLFormElement>("[data-experience-admin-login]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const error = form.querySelector<HTMLElement>("[data-login-error]");
    const password = String(new FormData(form).get("password") ?? "");
    form.setAttribute("aria-busy", "true");
    try {
      await experienceApi.adminLogin(password);
      await renderExperienceAdminWorkspace(app);
    } catch (cause) {
      if (error) error.textContent = cause instanceof Error ? cause.message : "De beheeromgeving kon niet worden geopend.";
    } finally {
      form.removeAttribute("aria-busy");
    }
  });
}

export async function renderExperienceAdminWorkspace(app: HTMLDivElement): Promise<void> {
  document.documentElement.className = "experience-admin-mode";
  document.documentElement.lang = "nl";
  document.title = "Experience Workspace — We Build And Design";
  const detailId = window.location.pathname.match(/^\/workspace\/experience\/sessions\/([^/]+)\/?$/)?.[1];

  try {
    const content = detailId
      ? renderDetail(await experienceApi.observatoryDetail(decodeURIComponent(detailId)))
      : renderOverview(await experienceApi.observatoryOverview());
    app.innerHTML = renderFrame(content);
    attachSharedActions(app);
  } catch (cause) {
    if (cause instanceof ExperienceApiError && cause.status === 401) {
      app.innerHTML = renderFrame(renderLogin(), "Bestaande beheerstoegang vereist");
      attachSharedActions(app);
      attachLogin(app);
      return;
    }

    app.innerHTML = renderFrame(`<section class="workspace-section experience-admin-empty" role="alert"><p class="workspace-label">Tijdelijk niet beschikbaar</p><h2>De bestaande Experience-bron kon niet veilig worden gelezen.</h2><p>Er is geen deelnemerssessie gestart en er zijn geen gegevens gewijzigd.</p></section>`);
    attachSharedActions(app);
  }
}
