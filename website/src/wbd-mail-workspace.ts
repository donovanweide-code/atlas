export interface MailboxView { id: string; address: string; displayName: string; connectionState: string; freshness: string; inboundStatus: string; outboundStatus: string; lastSuccessfulSyncAt: string | null }
export interface MailThreadSummary { id: string; subject: string; snippet: string; participantAddresses: string[]; classification: string; classificationConfidence: string; priority: string; securityStatus: string; unreadCount: number; attachmentCount: number; waitingOn: string; status: string; lastActivityAt: string }
export interface MailWorkspaceView {
  generatedAt: string; mailboxes: MailboxView[]; counts: { threads: number; messages: number; unread: number; attention: number; drafts: number };
  threads: MailThreadSummary[]; templates: { id: string; name: string; channel: string; status: string; humanGoRequired: boolean }[];
  communicationFoundation: Record<string, string | boolean>; sportpaleisReadiness: { status: string; mailbox: string; templates: string[]; transport: string; externalNetworkEnabled: boolean; automaticSendEnabled: boolean };
  freshness: string; performance: { source: string; connectorCallsDuringRender: number; queryDurationMs: number };
}
export interface MailThreadView {
  thread: MailThreadSummary;
  messages: { id: string; from: { name: string | null; address: string }; to: { name: string | null; address: string }[]; subject: string; text: string; html: string; snippet: string; receivedAt: string; attachments: { id: string; filename: string; contentType: string; size: number }[]; security: { status: string; findings: string[] }; provenance: { sourceType: string; sourceIdentity: string; fetchedAt: string } }[];
  commitments: unknown[]; drafts: { id: string; subject: string; text: string; status: string; goRequirement: string; updatedAt: string }[];
}
export interface MailNotificationView {
  status: "LIVE" | "PREPARED" | "MISCONFIGURED";
  publicKey: string | null;
  permissionRequired: boolean;
  installation: { desktop: string; iphone: string };
  privacy: "PRIVATE_BY_DEFAULT";
  preference: { enabled: boolean; mailboxIds: string[]; minimumPriority: "LOW" | "MEDIUM" | "HIGH"; lockScreenDetail: "PRIVATE" | "SAFE_SENDER"; quietHours: { enabled: boolean; start: string; end: string; timezone: string; allowHighPriority: boolean } };
  subscriptions: { id: string; deviceLabel: string; platform: string; status: string; createdAt: string; lastSeenAt: string }[];
  counts: { activeDevices: number; delivered: number };
}

const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const displayDate = (value: string): string => new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const classificationLabel = (value: string): string => ({ VRAAG_UITLEG: "Vraag", STORING: "Storing", FRICTIE: "Frictie", NIEUWE_SCOPE: "Nieuwe scope", COMMERCIAL_OPPORTUNITY: "Commerciële kans", AFSPRAAK: "Afspraak", FINANCIEEL: "Financieel", INFORMATIEF: "Informatief", INSUFFICIENT_EVIDENCE: "Nog te beoordelen" } as Record<string, string>)[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("nl-NL");
const mailboxStatus = (mailbox: MailboxView): string => mailbox.connectionState === "HEALTHY" ? (mailbox.lastSuccessfulSyncAt ? `Bijgewerkt ${displayDate(mailbox.lastSuccessfulSyncAt)}` : "Verbonden") : mailbox.connectionState === "UNAVAILABLE" ? "Tijdelijk niet bereikbaar · laatste veilige state blijft zichtbaar" : "Klaar om veilig te koppelen";

function mailboxCards(view: MailWorkspaceView): string {
  return view.mailboxes.map((mailbox) => `<article class="wbd-mail-mailbox" data-state="${escapeHtml(mailbox.connectionState)}"><span class="wbd-mail-mailbox__mark" aria-hidden="true">${mailbox.address.startsWith("facturen") ? "F" : "W"}</span><div><p>${escapeHtml(mailbox.displayName)}</p><h3>${escapeHtml(mailbox.address)}</h3><small>${escapeHtml(mailboxStatus(mailbox))}</small></div><span class="wbd-mail-status">${mailbox.connectionState === "HEALTHY" ? "Actief" : "Voorbereid"}</span></article>`).join("");
}

function threadList(view: MailWorkspaceView): string {
  if (!view.threads.length) return `<div class="wbd-mail-empty"><span aria-hidden="true">✉</span><h2>Nog geen centrale inbox</h2><p>De veilige lees-, zoek-, thread- en Atlas-laag staat klaar. Na het koppelen verschijnen hier alleen echte berichten.</p><details><summary>Wat is al voorbereid?</summary><ul><li>Meerdere WBD-mailboxen in één inbox</li><li>Threading, deduplicatie en snelle server-side synchronisatie</li><li>Veilige HTML, bijlagencontrole en geblokkeerde externe afbeeldingen</li><li>Atlas-classificatie, Attention, Next Best Action en conceptvoorbereiding</li><li>Menselijke controle vóór iedere externe verzending</li></ul></details></div>`;
  return `<div class="wbd-mail-thread-list">${view.threads.map((thread) => `<a href="/workspace/wbd/mail?thread=${encodeURIComponent(thread.id)}" data-priority="${escapeHtml(thread.priority)}"><span class="wbd-mail-thread__unread" aria-hidden="true">${thread.unreadCount ? "●" : ""}</span><div><p>${escapeHtml(thread.participantAddresses.slice(0, 3).join(" · "))}</p><h3>${escapeHtml(thread.subject)}</h3><span>${escapeHtml(thread.snippet)}</span></div><aside><time datetime="${escapeHtml(thread.lastActivityAt)}">${escapeHtml(displayDate(thread.lastActivityAt))}</time><small>${escapeHtml(classificationLabel(thread.classification))}${thread.attachmentCount ? ` · ${thread.attachmentCount} bijlage${thread.attachmentCount === 1 ? "" : "n"}` : ""}</small></aside></a>`).join("")}</div>`;
}

function threadDetail(detail: MailThreadView, view?: MailWorkspaceView): string {
  view ??= { mailboxes: [{ id: "wbd-info", address: "info@webuildanddesign.nl" }, { id: "wbd-facturen", address: "facturen@webuildanddesign.nl" }] } as MailWorkspaceView;
  const latest = detail.messages.at(-1);
  const replyTo = latest?.from.address.endsWith("@webuildanddesign.nl") ? detail.thread.participantAddresses.find((address) => !address.endsWith("@webuildanddesign.nl")) ?? "" : latest?.from.address ?? "";
  const subject = /^(?:re|antw):/iu.test(detail.thread.subject) ? detail.thread.subject : `Re: ${detail.thread.subject}`;
  return `<section class="wbd-mail-thread-detail"><a href="/workspace/wbd/mail">← Terug naar Mail</a><header><p>${escapeHtml(classificationLabel(detail.thread.classification))}</p><h1>${escapeHtml(detail.thread.subject)}</h1><span>${escapeHtml(detail.thread.participantAddresses.join(" · "))}</span></header><div class="wbd-mail-messages">${detail.messages.map((message) => `<article><header><div><strong>${escapeHtml(message.from.name ?? message.from.address)}</strong><small>${escapeHtml(message.from.address)}</small></div><time datetime="${escapeHtml(message.receivedAt)}">${escapeHtml(displayDate(message.receivedAt))}</time></header>${message.security.status !== "CLEAN_BY_POLICY" ? `<p class="wbd-mail-security" role="status">Veiligheidscontrole nodig vóór verdere actie.</p>` : ""}<div class="wbd-mail-message-text">${escapeHtml(message.text || message.snippet).replaceAll("\n", "<br>")}</div>${message.attachments.length ? `<ul class="wbd-mail-attachments">${message.attachments.map((attachment) => `<li>${escapeHtml(attachment.filename)} <small>${escapeHtml(attachment.contentType)} · ${Math.ceil(attachment.size / 1024)} KB</small></li>`).join("")}</ul>` : ""}<details><summary>Bewijs en herkomst</summary><dl><div><dt>Bron</dt><dd>${escapeHtml(message.provenance.sourceType)}</dd></div><div><dt>Ontvangen</dt><dd>${escapeHtml(displayDate(message.receivedAt))}</dd></div><div><dt>Opgehaald</dt><dd>${escapeHtml(displayDate(message.provenance.fetchedAt))}</dd></div></dl></details></article>`).join("")}</div><form class="wbd-mail-compose-ready" data-mail-draft><p>Volgende stap</p><h2>Antwoord voorbereiden</h2><span>Een concept opslaan is veilig. Extern verzenden blijft geblokkeerd tot jouw controle.</span><input type="hidden" name="threadId" value="${escapeHtml(detail.thread.id)}"><label>Van<select name="mailboxId" required>${view.mailboxes.map((mailbox) => `<option value="${escapeHtml(mailbox.id)}">${escapeHtml(mailbox.address)}</option>`).join("")}</select></label><label>Aan<input name="to" type="email" value="${escapeHtml(replyTo)}" autocomplete="off" required></label><label class="wbd-mail-compose-ready__wide">Onderwerp<input name="subject" value="${escapeHtml(subject)}" required maxlength="998"></label><label class="wbd-mail-compose-ready__wide">Concept<textarea name="text" rows="7" required></textarea></label><button type="submit">Concept opslaan</button><small role="status" data-mail-draft-status>${detail.drafts.length ? `${detail.drafts.length} voorbereid concept aanwezig.` : "Nog niets extern verzonden."}</small></form></section>`;
}

function notificationSettings(view: MailWorkspaceView, notifications: MailNotificationView): string {
  const live = notifications.status === "LIVE";
  const active = notifications.counts.activeDevices;
  return `<section class="wbd-mail-notifications" aria-labelledby="mail-notification-title"><header><div><p>Pushmeldingen</p><h2 id="mail-notification-title">Alleen als mail echt aandacht verdient.</h2></div><span data-state="${escapeHtml(notifications.status)}">${live ? active ? `${active} apparaat${active === 1 ? "" : "en"}` : "Beschikbaar" : "Voorbereid"}</span></header><p>Atlas filtert ruis. Op je lockscreen staat standaard geen onderwerp, mailtekst of e-mailadres.</p>${live ? `<form data-mail-notification-preferences><fieldset><legend>Mailboxen</legend>${view.mailboxes.map((mailbox) => `<label><input type="checkbox" name="mailboxId" value="${escapeHtml(mailbox.id)}" ${notifications.preference.mailboxIds.includes(mailbox.id) ? "checked" : ""}>${escapeHtml(mailbox.displayName)}</label>`).join("")}</fieldset><label>Vanaf welke prioriteit<select name="minimumPriority"><option value="HIGH" ${notifications.preference.minimumPriority === "HIGH" ? "selected" : ""}>Alleen hoog</option><option value="MEDIUM" ${notifications.preference.minimumPriority === "MEDIUM" ? "selected" : ""}>Relevant en hoog</option></select></label><label class="wbd-mail-notification-toggle"><input type="checkbox" name="enabled" ${notifications.preference.enabled ? "checked" : ""}>Pushmeldingen gebruiken</label><button type="submit">Voorkeuren opslaan</button><small role="status" data-mail-notification-status>Privé op lockscreen · per mailbox instelbaar.</small></form>${active ? `<ul>${notifications.subscriptions.filter(({ status }) => status === "ACTIVE").map((device) => `<li><span><strong>${escapeHtml(device.deviceLabel)}</strong><small>${escapeHtml(device.platform)}</small></span><button type="button" data-mail-push-disable="${escapeHtml(device.id)}">Uitschakelen</button></li>`).join("")}</ul>` : `<button type="button" class="wbd-mail-push-enable" data-mail-push-enable data-public-key="${escapeHtml(notifications.publicKey)}">Meldingen op dit apparaat inschakelen</button>`}<details><summary>iPhone gebruiken</summary><p>Installeer WBD Workspace via ‘Zet op beginscherm’ in Safari en schakel daarna hier meldingen in. iOS vraagt altijd zelf om toestemming.</p></details>` : `<div class="wbd-mail-notifications__prepared"><strong>Nog niet geactiveerd</strong><span>De PWA, prioriteitsregels, privacy en veilige delivery-boundary zijn gereed. De signing key is nog niet in productie geprovisioneerd.</span></div>`}</section>`;
}

export function renderMailWorkspace(topbar: string, view: MailWorkspaceView, detail?: MailThreadView, notifications: MailNotificationView = { status: "PREPARED", publicKey: null, permissionRequired: true, installation: { desktop: "SUPPORTED", iphone: "ADD_TO_HOME_SCREEN_REQUIRED" }, privacy: "PRIVATE_BY_DEFAULT", preference: { enabled: true, mailboxIds: view.mailboxes.map(({ id }) => id), minimumPriority: "MEDIUM", lockScreenDetail: "PRIVATE", quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: "Europe/Amsterdam", allowHighPriority: true } }, subscriptions: [], counts: { activeDevices: 0, delivered: 0 } }): string {
  const connected = view.mailboxes.filter(({ connectionState }) => connectionState === "HEALTHY").length;
  return `<main class="wbd-owner-workspace wbd-mail-workspace">${topbar}<div class="wbd-mail-canvas">${detail ? threadDetail(detail) : `<header class="wbd-mail-heading"><div><p class="wbd-owner-eyebrow">Mail &amp; communicatie</p><h1>Alles wat om een reactie vraagt.</h1><span>${connected ? `${connected} mailbox${connected === 1 ? "" : "en"} verbonden · ${view.counts.unread} ongelezen` : "De foundation staat klaar; er is nog geen mailbox gekoppeld."}</span></div><div class="wbd-mail-heading__status"><strong>${view.counts.attention}</strong><span>vraagt aandacht</span></div></header><section class="wbd-mail-mailboxes" aria-label="WBD-mailboxen">${mailboxCards(view)}</section>${notificationSettings(view, notifications)}<section class="wbd-mail-inbox"><header><div><p>Gecombineerde inbox</p><h2>Recente gesprekken</h2></div>${view.counts.threads ? `<span>${view.counts.threads} gesprekken</span>` : ""}</header>${threadList(view)}</section><section class="wbd-mail-readiness"><article><p>Opmaak &amp; templates</p><h2>WBD-huisstijl staat centraal</h2><span>${view.templates.length} bewezen templates · versiebeheer · preview · menselijke controle.</span><details><summary>Templates bekijken</summary><ul>${view.templates.map((template) => `<li><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.channel.toLocaleLowerCase("nl-NL"))} · ${template.humanGoRequired ? "controle vóór verzenden" : "policygestuurd"}</span></li>`).join("")}</ul></details></article><article><p>Campagnes &amp; automation</p><h2>Copernica-achtige lading, provider-onafhankelijk</h2><span>Contacten, consent, suppressies, segmenten, journeys en bulktransport zijn als veilige boundaries voorbereid—niet als nep-live functionaliteit.</span><details><summary>Readiness bekijken</summary><dl>${Object.entries(view.communicationFoundation).map(([key, value]) => `<div><dt>${escapeHtml(key.replaceAll(/([A-Z])/gu, " $1").replaceAll("_", " ").toLocaleLowerCase("nl-NL"))}</dt><dd>${escapeHtml(String(value).replaceAll("_", " ").toLocaleLowerCase("nl-NL"))}</dd></div>`).join("")}</dl></details></article><article><p>Sportpaleis</p><h2>Bedrukmails volledig voorbereid</h2><span>${view.sportpaleisReadiness.templates.length} transactionele templates · capture-only · geen automatische externe verzending.</span><details><summary>Veiligheidsgrens</summary><p>Mailbox ${escapeHtml(view.sportpaleisReadiness.mailbox)}. De bestaande productieflow blijft onaangeraakt; transportactivatie vereist een afzonderlijke gecontroleerde beslissing.</p></details></article></section>`}<footer class="wbd-owner-footer"><span>Centrale genormaliseerde mailstate</span><span>Geen connectorcall tijdens render</span><span>${escapeHtml(view.freshness === "UNKNOWN" ? "Nog niet gekoppeld" : view.freshness.toLocaleLowerCase("nl-NL"))}</span></footer></div></main>`;
}

export function bindMailWorkspace(root: HTMLElement, csrfToken: string, onPrepared: () => Promise<void> | void): void {
  const request = async (url: string, options: RequestInit): Promise<void> => {
    const response = await fetch(url, { ...options, credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json", Origin: window.location.origin, "X-CSRF-Token": csrfToken, ...(options.headers ?? {}) } });
    const body = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) throw new Error(body.message || "De meldingsinstelling kon niet worden opgeslagen.");
  };
  const status = root.querySelector<HTMLElement>("[data-mail-notification-status]");
  root.querySelector<HTMLButtonElement>("[data-mail-push-enable]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Dit apparaat ondersteunt Web Push niet.");
      const publicKey = button.dataset.publicKey; if (!publicKey) throw new Error("Pushmeldingen zijn nog niet geactiveerd.");
      const registration = await navigator.serviceWorker.register("/wbd-owner-sw.js", { scope: "/workspace/wbd/" });
      const permission = await Notification.requestPermission(); if (permission !== "granted") throw new Error("Meldingstoestemming is niet gegeven.");
      const bytes = Uint8Array.from(atob(publicKey.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      const serialized = subscription.toJSON();
      await request("/api/wbd/v1/mail/notifications/subscriptions", { method: "POST", body: JSON.stringify({ endpoint: serialized.endpoint, keys: serialized.keys, deviceLabel: /iPhone|iPad|iPod/u.test(navigator.userAgent) ? "iPhone / iPad" : "Desktopbrowser", platform: /iPhone|iPad|iPod/u.test(navigator.userAgent) ? "IOS_PWA" : "DESKTOP_WEB" }) });
      if (status) status.textContent = "Pushmeldingen zijn veilig ingeschakeld.";
      await onPrepared();
    } catch (cause) { if (status) status.textContent = cause instanceof Error ? cause.message : "Pushmelding kon niet worden ingeschakeld."; }
    finally { button.disabled = false; }
  });
  root.querySelector<HTMLFormElement>("[data-mail-notification-preferences]")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; button.disabled = true;
    try { const fields = new FormData(form); await request("/api/wbd/v1/mail/notifications/preferences", { method: "PUT", body: JSON.stringify({ enabled: fields.get("enabled") === "on", mailboxIds: fields.getAll("mailboxId"), minimumPriority: fields.get("minimumPriority"), lockScreenDetail: "PRIVATE" }) }); if (status) status.textContent = "Voorkeuren opgeslagen."; }
    catch (cause) { if (status) status.textContent = cause instanceof Error ? cause.message : "Voorkeuren konden niet worden opgeslagen."; }
    finally { button.disabled = false; }
  });
  root.querySelectorAll<HTMLButtonElement>("[data-mail-push-disable]").forEach((button) => button.addEventListener("click", async () => { button.disabled = true; try { await request(`/api/wbd/v1/mail/notifications/subscriptions/${encodeURIComponent(button.dataset.mailPushDisable!)}`, { method: "DELETE" }); await onPrepared(); } catch (cause) { if (status) status.textContent = cause instanceof Error ? cause.message : "Apparaat kon niet worden uitgeschakeld."; } finally { button.disabled = false; } }));
  root.querySelector<HTMLFormElement>("[data-mail-draft]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const status = form.querySelector<HTMLElement>("[data-mail-draft-status]");
    button.disabled = true;
    if (status) status.textContent = "Concept veilig opslaan…";
    try {
      const fields = new FormData(form);
      const response = await fetch("/api/wbd/v1/mail/drafts", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json", Origin: window.location.origin, "X-CSRF-Token": csrfToken }, body: JSON.stringify({ threadId: fields.get("threadId"), mailboxId: fields.get("mailboxId"), to: fields.get("to"), subject: fields.get("subject"), text: fields.get("text") }) });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Concept kon niet worden opgeslagen.");
      if (status) status.textContent = "Concept voorbereid · nog niets extern verzonden.";
      await onPrepared();
    } catch (cause) {
      if (status) status.textContent = cause instanceof Error ? cause.message : "Concept kon niet worden opgeslagen.";
    } finally { button.disabled = false; }
  });
}
