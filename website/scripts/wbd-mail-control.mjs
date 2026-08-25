import { createHash, randomUUID } from "node:crypto";
import {
  createWebPushTransportFromEnvironment,
  disablePushSubscription,
  enqueueMailNotifications,
  ensurePushNotificationState,
  publicNotificationView,
  registerPushSubscription,
  updateNotificationPreference,
  validatePushNotificationState,
} from "./wbd-push-notifications.mjs";

const EMAIL_PATTERN = /^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/u;
const MAILBOX_KINDS = new Set(["PERSONAL", "SHARED", "TRANSACTIONAL"]);
const CONNECTION_STATES = new Set(["NOT_CONNECTED", "CONNECTING", "SYNCING", "HEALTHY", "DEGRADED", "UNAVAILABLE", "DISABLED"]);
const FRESHNESS = new Set(["LIVE", "RECENT", "STALE", "UNAVAILABLE", "UNKNOWN"]);
const CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_EVIDENCE"]);
const CLASSIFICATIONS = new Set([
  "VRAAG_UITLEG", "STORING", "FRICTIE", "NIEUWE_SCOPE", "IDEE_KANS", "COMMERCIAL_OPPORTUNITY",
  "AFSPRAAK", "FOLLOW_UP", "WACHT_OP_WBD", "WACHT_OP_EXTERN", "FINANCIEEL", "LEVERANCIER",
  "JURIDISCH", "PRODUCT_LEARNING", "INFORMATIEF", "SPAM_NOISE", "INSUFFICIENT_EVIDENCE",
]);
const DELIVERY_STATES = new Set(["PREPARED", "WAITING_FOR_GO", "SCHEDULED", "SENDING", "ACCEPTED", "FAILED", "UNCERTAIN", "CANCELLED"]);
const TEMPLATE_STATES = new Set(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);
const MAX_BODY_TEXT = 2_000_000;
const MAX_BODY_HTML = 4_000_000;
const MAX_SUBJECT = 998;
const MAX_PARTICIPANTS = 100;
const MAX_ATTACHMENTS = 100;

const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function required(value, label, maximum = 2_000) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maximum) throw new Error(`${label} is ongeldig.`);
  return normalized;
}

function optional(value, maximum = 2_000) {
  const normalized = String(value ?? "").trim();
  if (normalized.length > maximum) throw new Error("Mailwaarde is te lang.");
  return normalized || null;
}

function enumValue(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`${label} is ongeldig.`);
  return value;
}

function email(value, label = "E-mailadres") {
  const normalized = required(value, label, 320).toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) throw new Error(`${label} is ongeldig.`);
  return normalized;
}

function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function normalizeParticipant(input) {
  if (typeof input === "string") return { name: null, address: email(input) };
  return { name: optional(input?.name, 240), address: email(input?.address) };
}

function normalizedSubject(value) {
  return String(value ?? "")
    .replace(/^\s*(?:(?:re|fw|fwd|antw)\s*:\s*)+/giu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("nl-NL");
}

function visibleSnippet(text, maximum = 260) {
  const compact = String(text ?? "").replace(/\s+/gu, " ").trim();
  return compact.length > maximum ? `${compact.slice(0, maximum - 1)}…` : compact;
}

function sanitizeHtml(value) {
  const source = String(value ?? "").slice(0, MAX_BODY_HTML);
  return source
    .replace(/<\s*(script|iframe|object|embed|form|input|button|video|audio|base|meta|link)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu, "")
    .replace(/<\s*(script|iframe|object|embed|form|input|button|video|audio|base|meta|link)\b[^>]*\/?>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(src|href)\s*=\s*(["'])\s*(?:javascript|data:text\/html):[\s\S]*?\2/giu, " $1=\"#blocked\"")
    .replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/url\(\s*(["']?)https?:\/\/[^)]+\1\s*\)/giu, "none")
    .replace(/<img\b[^>]*\bsrc\s*=\s*(?:(["'])https?:\/\/[^"']+\1|https?:\/\/[^\s>]+)[^>]*>/giu, '<span data-remote-image="blocked">Externe afbeelding geblokkeerd</span>');
}

function classifyMessage({ subject, text, from, headers = {} }) {
  const haystack = `${subject}\n${text}`.toLocaleLowerCase("nl-NL");
  const sender = from?.address ?? "";
  const autoSubmitted = String(headers["auto-submitted"] ?? "").toLowerCase();
  if (/\b(?:unsubscribe|afmelden|newsletter|nieuwsbrief)\b/u.test(haystack) || autoSubmitted.includes("auto-generated")) {
    return { classification: "INFORMATIEF", confidence: "MEDIUM", priority: "LOW", reason: "Geautomatiseerde of abonnementsmail herkend." };
  }
  if (/\b(?:factuur|invoice|betaling|betaal|creditnota|incasso|vervaldatum)\b/u.test(haystack)) {
    return { classification: "FINANCIEEL", confidence: "HIGH", priority: "MEDIUM", reason: "Financiële taal is aanwezig." };
  }
  if (/\b(?:storing|werkt niet|foutmelding|error|uitval|onbereikbaar|urgent|spoed)\b/u.test(haystack)) {
    return { classification: "STORING", confidence: "HIGH", priority: "HIGH", reason: "Een concrete fout- of storingsindicatie is aanwezig." };
  }
  if (/\b(?:offerte|prijs|kosten|interesse|kennismaken|voorstel|demo)\b/u.test(haystack)) {
    return { classification: "COMMERCIAL_OPPORTUNITY", confidence: "MEDIUM", priority: "MEDIUM", reason: "Commerciële intentie is waarschijnlijk." };
  }
  if (/\b(?:extra|aanvullend|nieuwe functionaliteit|uitbreiden|kan er ook|buiten scope)\b/u.test(haystack)) {
    return { classification: "NIEUWE_SCOPE", confidence: "MEDIUM", priority: "MEDIUM", reason: "De vraag lijkt aanvullende scope te introduceren." };
  }
  if (/\b(?:afspraak|bellen|meeting|morgen|volgende week|vrijdag|maandag)\b/u.test(haystack)) {
    return { classification: "AFSPRAAK", confidence: "MEDIUM", priority: "MEDIUM", reason: "Tijd- of afspraaktaal is aanwezig." };
  }
  if (/\b(?:wanneer|hoe|waarom|kun je|kunt u|vraag|graag reactie|laat weten)\b/u.test(haystack) || /\?\s*(?:$|\n)/u.test(text)) {
    return { classification: "VRAAG_UITLEG", confidence: "MEDIUM", priority: "MEDIUM", reason: "Het bericht bevat een expliciete vraag of reactieverzoek." };
  }
  if (/\b(?:noreply|no-reply|mailer-daemon)@/u.test(sender)) {
    return { classification: "INFORMATIEF", confidence: "HIGH", priority: "LOW", reason: "Automatische afzender herkend." };
  }
  return { classification: "INSUFFICIENT_EVIDENCE", confidence: "INSUFFICIENT_EVIDENCE", priority: "LOW", reason: "Er is onvoldoende bewijs voor een betrouwbare inhoudelijke classificatie." };
}

function securityAssessment({ from, replyTo, html, attachments }) {
  const findings = [];
  if (replyTo?.address && from?.address && replyTo.address.split("@")[1] !== from.address.split("@")[1]) findings.push("REPLY_TO_DOMAIN_MISMATCH");
  if (/javascript:|<\s*script\b/iu.test(String(html ?? ""))) findings.push("ACTIVE_CONTENT_REMOVED");
  for (const attachment of attachments ?? []) {
    const filename = String(attachment.filename ?? "").toLowerCase();
    if (/\.(?:exe|com|bat|cmd|js|vbs|ps1|scr|msi|jar)$/u.test(filename)) findings.push("EXECUTABLE_ATTACHMENT");
    if (/\.(?:docm|xlsm|pptm)$/u.test(filename)) findings.push("MACRO_ATTACHMENT");
  }
  return { status: findings.length ? "REVIEW_REQUIRED" : "CLEAN_BY_POLICY", findings };
}

function sourceKey({ mailboxId, folder, uidValidity, uid }) {
  return `${mailboxId}:${folder}:${uidValidity}:${uid}`;
}

export function deriveCommitmentCandidates(message) {
  const text = `${message.subject}\n${message.text}`.replace(/\s+/gu, " ").trim();
  const dateMatch = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/u)
    ?? text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/u);
  let dueAt = null;
  if (dateMatch) {
    const yearFirst = dateMatch[1].length === 4;
    const year = yearFirst ? dateMatch[1] : dateMatch[3];
    const month = dateMatch[2].padStart(2, "0");
    const day = (yearFirst ? dateMatch[3] : dateMatch[1]).padStart(2, "0");
    const candidate = new Date(`${year}-${month}-${day}T17:00:00.000Z`);
    if (Number.isFinite(candidate.getTime())) dueAt = candidate.toISOString();
  }
  const explicitPromise = /\b(?:ik|wij|we)\s+(?:stuur|sturen|lever|leveren|bevestig|bevestigen|kom|komen)\b/iu.test(text);
  const replyRequest = /\b(?:graag|kun je|kunt u)\s+(?:voor\s+[^.]{0,40}\s+)?(?:reageren|bevestigen|laten weten|terugkomen)\b/iu.test(text);
  if (!explicitPromise && !replyRequest && !dueAt) return [];
  return [{
    id: `commitment-${sha256(`${message.id}:${dueAt ?? "open"}:${explicitPromise}:${replyRequest}`).slice(0, 28)}`,
    threadId: message.threadId, messageId: message.id, organizationId: message.organizationId,
    summary: visibleSnippet(text, 180), owner: explicitPromise && message.direction === "OUTBOUND" ? "WBD" : message.direction === "INBOUND" ? "WBD_REVIEW" : "UNRESOLVED",
    dueAt, confidence: dueAt ? "HIGH" : "MEDIUM", status: "OPEN", evidenceRef: message.provenance.sourceIdentity,
    interpretationMode: "DETERMINISTIC", createdAt: message.fetchedAt,
  }];
}

function messageIdentity(input) {
  return `mail-${sha256(sourceKey(input)).slice(0, 32)}`;
}

function threadIdentity(message, existingMessages = []) {
  const referenceIds = unique([...(message.references ?? []), message.inReplyTo]).map((value) => value.toLowerCase());
  const referenced = existingMessages.find((candidate) => candidate.messageId && referenceIds.includes(candidate.messageId.toLowerCase()));
  if (referenced) return { threadId: referenced.threadId, confidence: "HIGH", strategy: "REFERENCES" };
  if (message.messageId) {
    const duplicate = existingMessages.find((candidate) => candidate.messageId?.toLowerCase() === message.messageId.toLowerCase());
    if (duplicate) return { threadId: duplicate.threadId, confidence: "HIGH", strategy: "MESSAGE_ID" };
  }
  const subject = normalizedSubject(message.subject);
  const participantAddresses = unique([message.from?.address, ...(message.to ?? []).map(({ address }) => address), ...(message.cc ?? []).map(({ address }) => address)]).sort();
  const fallback = existingMessages.find((candidate) => normalizedSubject(candidate.subject) === subject
    && participantAddresses.some((address) => candidate.participantAddresses.includes(address)));
  if (fallback) return { threadId: fallback.threadId, confidence: "LOW", strategy: "SUBJECT_PARTICIPANTS" };
  return { threadId: `thread-${sha256(`${subject}:${participantAddresses.join(",")}:${message.messageId ?? message.id}`).slice(0, 32)}`, confidence: message.messageId ? "MEDIUM" : "LOW", strategy: "NEW_THREAD" };
}

export function normalizeInboundMessage(input, { mailbox, existingMessages = [], fetchedAt = new Date() } = {}) {
  if (!mailbox) throw new Error("Mailboxcontext ontbreekt.");
  const mailboxId = required(mailbox.id, "Mailbox-ID", 120);
  const folder = required(input.folder ?? "INBOX", "Mailmap", 500);
  const uidValidity = required(input.uidValidity, "UIDVALIDITY", 64);
  const uid = Number(input.uid);
  if (!Number.isSafeInteger(uid) || uid < 1) throw new Error("IMAP UID is ongeldig.");
  const from = normalizeParticipant(input.from);
  const to = (input.to ?? []).slice(0, MAX_PARTICIPANTS).map(normalizeParticipant);
  const cc = (input.cc ?? []).slice(0, MAX_PARTICIPANTS).map(normalizeParticipant);
  const replyTo = input.replyTo ? normalizeParticipant(input.replyTo) : null;
  const attachments = (input.attachments ?? []).slice(0, MAX_ATTACHMENTS).map((attachment) => ({
    id: required(attachment.id ?? randomUUID(), "Bijlage-ID", 160),
    filename: required(attachment.filename ?? "bijlage", "Bijlagenaam", 500),
    contentType: required(attachment.contentType ?? "application/octet-stream", "Bijlagetype", 200),
    size: Math.max(0, Number(attachment.size ?? 0)),
    contentHash: optional(attachment.contentHash, 128),
    disposition: String(attachment.disposition ?? "attachment").toLowerCase() === "inline" ? "INLINE" : "ATTACHMENT",
    contentId: optional(attachment.contentId, 500),
    storageReference: optional(attachment.storageReference, 1_000),
  }));
  const text = String(input.text ?? "").slice(0, MAX_BODY_TEXT);
  const html = sanitizeHtml(input.html ?? "");
  const message = {
    id: messageIdentity({ mailboxId, folder, uidValidity, uid }),
    organizationId: mailbox.organizationId,
    mailboxId,
    folder,
    uidValidity,
    uid,
    messageId: optional(input.messageId, 998),
    inReplyTo: optional(input.inReplyTo, 998),
    references: unique(input.references ?? []).slice(0, 100).map((value) => required(value, "Message-reference", 998)),
    from,
    to,
    cc,
    replyTo,
    direction: from.address === mailbox.address ? "OUTBOUND" : "INBOUND",
    subject: String(input.subject ?? "(geen onderwerp)").slice(0, MAX_SUBJECT),
    sentAt: iso(input.sentAt ?? input.receivedAt ?? fetchedAt),
    receivedAt: iso(input.receivedAt ?? fetchedAt),
    fetchedAt: iso(fetchedAt),
    text,
    html,
    snippet: visibleSnippet(text || String(input.subject ?? "")),
    flags: unique(input.flags ?? []),
    headers: clone(input.headers ?? {}),
    attachments,
    size: Math.max(0, Number(input.size ?? Buffer.byteLength(text) + Buffer.byteLength(html))),
    participantAddresses: unique([from.address, ...to.map(({ address }) => address), ...cc.map(({ address }) => address)]),
    sourceKey: sourceKey({ mailboxId, folder, uidValidity, uid }),
    rawReference: clone(input.rawReference ?? { kind: "IMAP", mailboxId, folder, uidValidity, uid, immutable: false }),
  };
  const threading = threadIdentity(message, existingMessages);
  message.threadId = threading.threadId;
  message.threading = threading;
  message.classification = classifyMessage(message);
  message.security = securityAssessment(message);
  message.contentHash = sha256(JSON.stringify(stable({ subject: message.subject, text: message.text, html: message.html, attachments: message.attachments, from: message.from, to: message.to })));
  message.provenance = {
    sourceType: "IMAP",
    provider: mailbox.provider,
    sourceIdentity: message.sourceKey,
    observedAt: message.receivedAt,
    fetchedAt: message.fetchedAt,
    normalizedSchemaVersion: 1,
    contentHash: message.contentHash,
  };
  return message;
}

export function createInitialWbdMailControl({ now = new Date() } = {}) {
  const createdAt = iso(now);
  return {
    schemaVersion: 1,
    mailboxes: [
      {
        id: "wbd-info", organizationId: "we-build-and-design", address: "info@webuildanddesign.nl", displayName: "WBD algemeen",
        provider: "TRANSIP_IMAP_SMTP", kind: "SHARED", connectionState: "NOT_CONNECTED", freshness: "UNKNOWN",
        readScope: "OWNER", draftScope: "OWNER", sendScope: "HUMAN_GO", campaignEligible: false,
        credentialStatus: "NOT_PROVISIONED", inboundStatus: "PREPARED", outboundStatus: "PREPARED",
        lastSuccessfulSyncAt: null, lastAttemptAt: null, consecutiveFailures: 0, checkpoint: null, createdAt, updatedAt: createdAt,
      },
      {
        id: "wbd-facturen", organizationId: "we-build-and-design", address: "facturen@webuildanddesign.nl", displayName: "WBD facturen",
        provider: "TRANSIP_IMAP_SMTP", kind: "TRANSACTIONAL", connectionState: "NOT_CONNECTED", freshness: "UNKNOWN",
        readScope: "OWNER", draftScope: "OWNER", sendScope: "HUMAN_GO", campaignEligible: false,
        credentialStatus: "NOT_PROVISIONED", inboundStatus: "PREPARED", outboundStatus: "PREPARED",
        lastSuccessfulSyncAt: null, lastAttemptAt: null, consecutiveFailures: 0, checkpoint: null, createdAt, updatedAt: createdAt,
      },
    ],
    messages: [],
    threads: [],
    drafts: [],
    deliveries: [],
    commitments: [],
    contacts: [],
    consentRecords: [],
    suppressions: [],
    segments: [],
    campaigns: [],
    journeys: [],
    notificationPreferences: [],
    pushSubscriptions: [],
    notificationOutbox: [],
    audit: [],
    templates: [
      { id: "wbd-general", key: "WBD_GENERAL_SMTP_TEST", name: "Persoonlijk WBD-bericht", version: 3, status: "PUBLISHED", channel: "ONE_TO_ONE", organizationId: "we-build-and-design", transport: "MAILBOX", humanGoRequired: true, createdAt, updatedAt: createdAt },
      { id: "wbd-invoice", key: "WBD_INVOICE_FINAL", name: "WBD-factuur", version: 3, status: "PUBLISHED", channel: "TRANSACTIONAL", organizationId: "we-build-and-design", transport: "MAILBOX", humanGoRequired: true, createdAt, updatedAt: createdAt },
    ],
    communicationFoundation: {
      contacts: "PREPARED", consentLedger: "PREPARED", suppressions: "PREPARED", segments: "PREPARED",
      campaigns: "PREPARED", journeys: "PREPARED", bulkTransport: "NOT_CONNECTED", tracking: "NOT_CONNECTED",
      providerBoundary: "PROVIDER_INDEPENDENT", externalNetworkEnabled: false,
    },
    sportpaleisReadiness: {
      organizationId: "sportpaleis", status: "READY_CAPTURE_ONLY", mailbox: "bedrukking@sportpaleis.nl",
      templates: ["ORDER_RECEIVED", "ORDER_IN_PRODUCTION", "ORDER_READY", "ORDER_QUESTION", "PROPOSAL_INTAKE_REQUEST", "PROPOSAL_REVIEW_REQUEST", "PROPOSAL_SUPPLIER_HANDOFF"],
      transport: "CAPTURE", externalNetworkEnabled: false, automaticSendEnabled: false,
      invariant: "SPORTPALEIS_PRODUCTION_BEHAVIOR_UNCHANGED", updatedAt: createdAt,
    },
    updatedAt: createdAt,
  };
}

function validateMailbox(input) {
  return {
    ...clone(input), id: required(input.id, "Mailbox-ID", 120), organizationId: required(input.organizationId, "Mailboxorganisatie", 160),
    address: email(input.address), displayName: required(input.displayName, "Mailboxnaam", 160), provider: required(input.provider, "Mailboxprovider", 160),
    kind: enumValue(input.kind, MAILBOX_KINDS, "Mailboxtype"), connectionState: enumValue(input.connectionState, CONNECTION_STATES, "Mailboxstatus"),
    freshness: enumValue(input.freshness, FRESHNESS, "Mailboxfreshness"), readScope: required(input.readScope, "Mailbox-leesrecht", 100),
    draftScope: required(input.draftScope, "Mailbox-conceptrecht", 100), sendScope: required(input.sendScope, "Mailbox-verzendrecht", 100),
    campaignEligible: input.campaignEligible === true, credentialStatus: input.credentialStatus === "PROVISIONED" ? "PROVISIONED" : "NOT_PROVISIONED",
    consecutiveFailures: Math.max(0, Number(input.consecutiveFailures ?? 0)), createdAt: iso(input.createdAt), updatedAt: iso(input.updatedAt),
    lastSuccessfulSyncAt: input.lastSuccessfulSyncAt ? iso(input.lastSuccessfulSyncAt) : null,
    lastAttemptAt: input.lastAttemptAt ? iso(input.lastAttemptAt) : null,
  };
}

function validateTemplate(input) {
  return { ...clone(input), id: required(input.id, "Template-ID", 160), key: required(input.key, "Templatekey", 160), name: required(input.name, "Templatenaam", 240), version: Number(input.version), status: enumValue(input.status, TEMPLATE_STATES, "Templatestatus"), organizationId: required(input.organizationId, "Templateorganisatie", 160), humanGoRequired: input.humanGoRequired !== false, createdAt: iso(input.createdAt), updatedAt: iso(input.updatedAt) };
}

export function validateWbdMailControl(input) {
  const state = clone(input ?? {});
  if (state.schemaVersion !== 1) throw new Error("WBD Mail Control schema is ongeldig.");
  state.mailboxes = (state.mailboxes ?? []).map(validateMailbox);
  if (new Set(state.mailboxes.map(({ id }) => id)).size !== state.mailboxes.length) throw new Error("Mailbox-ID is niet uniek.");
  if (state.mailboxes.some(({ organizationId }) => organizationId !== "we-build-and-design")) throw new Error("WBD Mail Control bevat organisatievreemde mailboxen.");
  state.messages = Array.isArray(state.messages) ? state.messages : [];
  state.threads = Array.isArray(state.threads) ? state.threads : [];
  state.drafts = Array.isArray(state.drafts) ? state.drafts : [];
  state.deliveries = Array.isArray(state.deliveries) ? state.deliveries.map((item) => ({ ...item, status: enumValue(item.status, DELIVERY_STATES, "Deliverystatus") })) : [];
  state.commitments = Array.isArray(state.commitments) ? state.commitments : [];
  state.contacts = Array.isArray(state.contacts) ? state.contacts : [];
  state.consentRecords = Array.isArray(state.consentRecords) ? state.consentRecords : [];
  state.suppressions = Array.isArray(state.suppressions) ? state.suppressions : [];
  state.segments = Array.isArray(state.segments) ? state.segments : [];
  state.campaigns = Array.isArray(state.campaigns) ? state.campaigns : [];
  state.journeys = Array.isArray(state.journeys) ? state.journeys : [];
  validatePushNotificationState(state);
  state.templates = (state.templates ?? []).map(validateTemplate);
  state.audit = Array.isArray(state.audit) ? state.audit.slice(-5_000) : [];
  state.communicationFoundation = clone(state.communicationFoundation ?? {});
  state.sportpaleisReadiness = clone(state.sportpaleisReadiness ?? {});
  state.updatedAt = iso(state.updatedAt ?? new Date());
  return state;
}

function rebuildThreads(messages, previousThreads = []) {
  const byThread = new Map();
  for (const message of messages) {
    const list = byThread.get(message.threadId) ?? [];
    list.push(message);
    byThread.set(message.threadId, list);
  }
  return [...byThread.entries()].map(([id, entries]) => {
    entries.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt));
    const latest = entries.at(-1);
    const previous = previousThreads.find((item) => item.id === id);
    const participantAddresses = unique(entries.flatMap((item) => item.participantAddresses));
    const highestPriority = entries.some(({ classification }) => classification.priority === "HIGH") ? "HIGH"
      : entries.some(({ classification }) => classification.priority === "MEDIUM") ? "MEDIUM" : "LOW";
    return {
      id,
      organizationId: previous?.organizationId ?? null,
      organizationConfidence: previous?.organizationConfidence ?? "INSUFFICIENT_EVIDENCE",
      subject: latest.subject,
      snippet: latest.snippet,
      messageIds: entries.map(({ id: messageId }) => messageId),
      mailboxIds: unique(entries.map(({ mailboxId }) => mailboxId),),
      participantAddresses,
      classification: latest.classification.classification,
      classificationConfidence: latest.classification.confidence,
      priority: highestPriority,
      securityStatus: entries.some(({ security }) => security.status !== "CLEAN_BY_POLICY") ? "REVIEW_REQUIRED" : "CLEAN_BY_POLICY",
      unreadCount: entries.filter(({ flags }) => !flags.includes("\\Seen") && !flags.includes("SEEN")).length,
      attachmentCount: entries.reduce((sum, { attachments }) => sum + attachments.length, 0),
      waitingOn: latest.direction === "OUTBOUND" ? "EXTERNAL" : "WBD_REVIEW",
      status: previous?.status ?? "OPEN",
      lastActivityAt: latest.receivedAt,
      updatedAt: latest.fetchedAt,
    };
  }).sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt));
}

export class MemoryWbdMailStore {
  constructor(seed = createInitialWbdMailControl()) {
    this.state = validateWbdMailControl(seed);
    this.queue = Promise.resolve();
  }
  async initialize() {}
  async read() { return clone(this.state); }
  async mutate(mutator) {
    const operation = this.queue.then(async () => {
      const next = clone(this.state);
      const value = await mutator(next);
      next.updatedAt = iso();
      this.state = validateWbdMailControl(next);
      return clone(value);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async close() {}
}

function audit(state, eventType, subjectId, details = {}, now = new Date()) {
  state.audit.push({ id: `mail-audit-${randomUUID()}`, eventType, subjectId, actor: "ATLAS_MAIL_DETERMINISTIC", occurredAt: iso(now), details: clone(details) });
  if (state.audit.length > 5_000) state.audit.splice(0, state.audit.length - 5_000);
}

export class WbdMailControlService {
  constructor({ store, now = () => new Date(), pushTransport = createWebPushTransportFromEnvironment() }) {
    this.store = store;
    this.now = now;
    this.pushTransport = pushTransport;
  }
  async initialize() { await this.store.initialize(); }
  async notificationMutate(mutator) { return typeof this.store.mutateNotificationState === "function" ? this.store.mutateNotificationState(mutator) : this.store.mutate(mutator); }
  async workspaceView({ mailboxId = null, limit = 40 } = {}) {
    if (typeof this.store.workspaceView === "function") return this.store.workspaceView({ mailboxId, limit, now: this.now() });
    const started = performance.now();
    const state = await this.store.read();
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 40));
    const threads = state.threads.filter((thread) => !mailboxId || thread.mailboxIds.includes(mailboxId)).slice(0, boundedLimit);
    return {
      schemaVersion: 1,
      generatedAt: iso(this.now()),
      mailboxes: state.mailboxes.map((mailbox) => ({ ...mailbox, checkpoint: mailbox.checkpoint ? { uidValidity: mailbox.checkpoint.uidValidity, highestUid: mailbox.checkpoint.highestUid, syncedAt: mailbox.checkpoint.syncedAt } : null })),
      counts: {
        threads: state.threads.length,
        messages: state.messages.length,
        unread: state.threads.reduce((sum, { unreadCount }) => sum + unreadCount, 0),
        attention: state.threads.filter(({ priority, status }) => priority === "HIGH" && status === "OPEN").length,
        drafts: state.drafts.filter(({ status }) => status !== "SENT").length,
      },
      threads,
      templates: state.templates,
      communicationFoundation: state.communicationFoundation,
      sportpaleisReadiness: state.sportpaleisReadiness,
      freshness: state.mailboxes.some(({ freshness }) => freshness === "LIVE") ? "LIVE" : state.mailboxes.some(({ freshness }) => freshness === "RECENT") ? "RECENT" : "UNKNOWN",
      performance: { source: "CENTRAL_NORMALIZED_STATE", connectorCallsDuringRender: 0, queryDurationMs: Math.round((performance.now() - started) * 100) / 100 },
    };
  }
  async notificationView(userId) {
    const state = typeof this.store.notificationState === "function" ? await this.store.notificationState() : await this.store.read();
    return publicNotificationView(state, userId, this.pushTransport);
  }
  async saveNotificationPreference(userId, payload) {
    const now = this.now();
    return this.notificationMutate(async (state) => {
      const preference = updateNotificationPreference(state, userId, payload, now);
      audit(state, "NOTIFICATION_PREFERENCES_UPDATED", userId, { enabled: preference.enabled, mailboxIds: preference.mailboxIds, minimumPriority: preference.minimumPriority, lockScreenDetail: preference.lockScreenDetail }, now);
      return preference;
    });
  }
  async registerNotificationSubscription(userId, payload) {
    if (this.pushTransport.status !== "LIVE") throw Object.assign(new Error("Pushmeldingen zijn nog niet geactiveerd."), { statusCode: 409, code: "PUSH_NOT_CONFIGURED" });
    const now = this.now();
    return this.notificationMutate(async (state) => {
      const subscription = registerPushSubscription(state, userId, payload, now);
      audit(state, "PUSH_SUBSCRIPTION_REGISTERED", subscription.id, { userId, platform: subscription.platform, deviceLabel: subscription.deviceLabel }, now);
      return subscription;
    });
  }
  async disableNotificationSubscription(userId, subscriptionId) {
    const now = this.now();
    return this.notificationMutate(async (state) => {
      const subscription = disablePushSubscription(state, userId, subscriptionId, now);
      audit(state, "PUSH_SUBSCRIPTION_DISABLED", subscription.id, { userId }, now);
      return subscription;
    });
  }
  async dispatchPendingNotifications({ limit = 8 } = {}) {
    if (this.pushTransport.status !== "LIVE") return { status: this.pushTransport.status, attempted: 0, delivered: 0, failed: 0 };
    const now = this.now();
    const claimed = await this.notificationMutate(async (state) => {
      ensurePushNotificationState(state, now);
      const staleClaimBefore = now.getTime() - 10 * 60 * 1_000;
      const selected = state.notificationOutbox.filter(({ status, attempts, updatedAt }) => (status === "PENDING" || (status === "SENDING" && new Date(updatedAt).getTime() < staleClaimBefore)) && attempts < 4).slice(0, Math.max(1, Math.min(20, limit)));
      for (const item of selected) { item.status = "SENDING"; item.attempts += 1; item.updatedAt = iso(now); }
      return selected.map((item) => ({ item: clone(item), subscription: clone(state.pushSubscriptions.find(({ id }) => id === item.subscriptionId)) }));
    });
    const outcomes = await Promise.all(claimed.filter(({ subscription }) => subscription?.status === "ACTIVE").map(async ({ item, subscription }) => ({ item, result: await this.pushTransport.send(subscription, item.payload) })));
    if (outcomes.length || claimed.length) await this.notificationMutate(async (state) => {
      for (const { item, result } of outcomes) {
        const active = state.notificationOutbox.find(({ id }) => id === item.id);
        if (!active) continue;
        active.status = result.status === "DELIVERED" ? "DELIVERED" : active.attempts >= 4 ? "FAILED" : "PENDING";
        active.deliveredAt = result.status === "DELIVERED" ? iso(this.now()) : null;
        active.updatedAt = iso(this.now());
        active.lastFailureCode = result.status === "DELIVERED" ? null : String(result.errorCode ?? result.statusCode ?? result.status);
        if (result.status === "GONE") {
          const subscription = state.pushSubscriptions.find(({ id }) => id === item.subscriptionId);
          if (subscription) { subscription.status = "DISABLED"; subscription.disabledAt = iso(this.now()); }
          active.status = "FAILED";
        }
        audit(state, result.status === "DELIVERED" ? "PUSH_DELIVERED" : "PUSH_DELIVERY_FAILED", active.id, { status: result.status, statusCode: result.statusCode ?? null, subscriptionId: active.subscriptionId, messageId: active.messageId }, this.now());
      }
      for (const { item } of claimed.filter(({ subscription }) => !subscription || subscription.status !== "ACTIVE")) {
        const active = state.notificationOutbox.find(({ id }) => id === item.id);
        if (active) { active.status = "FAILED"; active.lastFailureCode = "SUBSCRIPTION_UNAVAILABLE"; active.updatedAt = iso(this.now()); }
      }
      return undefined;
    });
    return { status: "LIVE", attempted: outcomes.length, delivered: outcomes.filter(({ result }) => result.status === "DELIVERED").length, failed: outcomes.filter(({ result }) => result.status !== "DELIVERED").length };
  }
  async thread(threadId) {
    if (typeof this.store.thread === "function") return this.store.thread(threadId);
    const state = await this.store.read();
    const thread = state.threads.find(({ id }) => id === threadId);
    if (!thread) throw Object.assign(new Error("Mailgesprek niet gevonden."), { statusCode: 404, code: "NOT_FOUND" });
    const messages = thread.messageIds.map((id) => state.messages.find((item) => item.id === id)).filter(Boolean);
    return { thread, messages, commitments: state.commitments.filter((item) => item.threadId === threadId), drafts: state.drafts.filter((item) => item.threadId === threadId) };
  }
  async search(query, { limit = 30 } = {}) {
    if (typeof this.store.search === "function") return this.store.search(query, { limit });
    const normalized = required(query, "Zoekvraag", 240).toLocaleLowerCase("nl-NL");
    const tokens = normalized.split(/[^\p{L}\p{N}@._-]+/u).filter((token) => token.length > 1);
    const state = await this.store.read();
    return state.threads.map((thread) => {
      const messages = thread.messageIds.map((id) => state.messages.find((item) => item.id === id)).filter(Boolean);
      const haystack = `${thread.subject}\n${thread.snippet}\n${thread.participantAddresses.join(" ")}\n${messages.map(({ text }) => text).join("\n")}`.toLocaleLowerCase("nl-NL");
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { thread, score };
    }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || right.thread.lastActivityAt.localeCompare(left.thread.lastActivityAt)).slice(0, limit)
      .map(({ thread }) => ({ type: "MAIL_THREAD", id: thread.id, title: thread.subject, summary: thread.snippet, href: `/workspace/wbd/mail?thread=${encodeURIComponent(thread.id)}`, source: "CENTRAL_MAIL_STATE" }));
  }
  async ingestMailboxSnapshot(snapshot) {
    const now = this.now();
    const ingestedResult = await this.store.mutate(async (state) => {
      const mailbox = state.mailboxes.find(({ id }) => id === snapshot.mailboxId);
      if (!mailbox) throw new Error("Mailbox is niet geregistreerd.");
      if (mailbox.organizationId !== "we-build-and-design") throw new Error("Mailbox valt buiten de WBD-tenantboundary.");
      mailbox.lastAttemptAt = iso(now);
      if (snapshot.status === "FAILED") {
        mailbox.connectionState = mailbox.credentialStatus === "PROVISIONED" ? "UNAVAILABLE" : "NOT_CONNECTED";
        mailbox.freshness = mailbox.lastSuccessfulSyncAt ? "STALE" : "UNAVAILABLE";
        mailbox.consecutiveFailures += 1;
        mailbox.updatedAt = iso(now);
        audit(state, "CONNECTOR_FAILED", mailbox.id, { failureCode: snapshot.failureCode ?? "UNKNOWN", consecutiveFailures: mailbox.consecutiveFailures }, now);
        return { mailbox: clone(mailbox), ingested: 0, duplicates: 0, events: [] };
      }
      const existing = state.messages.filter(({ mailboxId }) => mailboxId === mailbox.id);
      const normalizedMessages = [];
      let malformed = 0;
      for (const source of snapshot.messages ?? []) {
        try { normalizedMessages.push(normalizeInboundMessage(source, { mailbox, existingMessages: [...existing, ...state.messages, ...normalizedMessages], fetchedAt: now })); }
        catch (cause) {
          malformed += 1;
          audit(state, "MALFORMED_MESSAGE_SKIPPED", mailbox.id, { failureCode: String(cause?.code ?? "NORMALIZATION_FAILED"), uid: Number(source?.uid ?? 0) || null }, now);
        }
      }
      let ingested = 0;
      let duplicates = 0;
      const events = [];
      for (const message of normalizedMessages) {
        const duplicate = state.messages.find((candidate) => candidate.sourceKey === message.sourceKey || (candidate.mailboxId === message.mailboxId && candidate.contentHash === message.contentHash && candidate.messageId && candidate.messageId === message.messageId));
        if (duplicate) { duplicates += 1; continue; }
        state.messages.push(message);
        ingested += 1;
        for (const commitment of deriveCommitmentCandidates(message)) {
          if (!state.commitments.some(({ id }) => id === commitment.id)) state.commitments.push(commitment);
        }
        events.push({
          id: `mail-event-${message.id}`,
          messageId: message.id,
          threadId: message.threadId,
          mailboxId: message.mailboxId,
          organizationId: message.organizationId,
          subject: message.subject,
          summary: message.snippet,
          receivedAt: message.receivedAt,
          classification: message.classification.classification,
          confidence: message.classification.confidence,
          priority: message.classification.priority,
          securityStatus: message.security.status,
          sourceIdentity: message.sourceKey,
          provenance: message.provenance,
          direction: message.direction,
          safeSenderLabel: message.from?.name || null,
        });
        audit(state, "MESSAGE_INGESTED", message.id, { mailboxId: mailbox.id, classification: message.classification.classification, contentHash: message.contentHash }, now);
      }
      state.threads = rebuildThreads(state.messages, state.threads);
      mailbox.credentialStatus = "PROVISIONED";
      mailbox.connectionState = "HEALTHY";
      mailbox.freshness = "LIVE";
      mailbox.lastSuccessfulSyncAt = iso(now);
      mailbox.consecutiveFailures = 0;
      mailbox.checkpoint = {
        uidValidity: required(snapshot.uidValidity, "UIDVALIDITY", 64),
        highestUid: Math.max(Number(snapshot.highestUid ?? 0), ...normalizedMessages.map(({ uid }) => uid), 0),
        syncedAt: iso(now),
      };
      mailbox.updatedAt = iso(now);
      audit(state, "CONNECTOR_REFRESHED", mailbox.id, { ingested, duplicates, malformed, checkpoint: mailbox.checkpoint }, now);
      const notificationCandidates = enqueueMailNotifications(state, events, now);
      if (notificationCandidates.length) audit(state, "PUSH_NOTIFICATIONS_QUEUED", mailbox.id, { count: notificationCandidates.length, messageIds: [...new Set(notificationCandidates.map(({ messageId }) => messageId))] }, now);
      return { mailbox: clone(mailbox), ingested, duplicates, malformed, events };
    });
    ingestedResult.push = await this.dispatchPendingNotifications();
    return ingestedResult;
  }
  async prepareDraft({ threadId, mailboxId, to, subject, text, templateKey = "WBD_GENERAL_SMTP_TEST" }) {
    const now = this.now();
    return this.store.mutate(async (state) => {
      const mailbox = state.mailboxes.find(({ id }) => id === mailboxId);
      if (!mailbox) throw new Error("Mailbox is niet geregistreerd.");
      const thread = state.threads.find(({ id }) => id === threadId);
      if (!thread) throw new Error("Mailgesprek niet gevonden.");
      const recipient = email(to);
      const existing = state.drafts.find((item) => item.threadId === threadId && item.status === "PREPARED");
      const draft = {
        id: existing?.id ?? `draft-${randomUUID()}`, threadId, mailboxId, organizationId: "we-build-and-design",
        from: mailbox.address, to: [recipient], subject: required(subject, "Onderwerp", MAX_SUBJECT), text: required(text, "Concepttekst", 200_000),
        templateKey, templateVersion: state.templates.find(({ key }) => key === templateKey)?.version ?? null,
        status: "PREPARED", goRequirement: "REQUIRED", externalNetworkUsed: false,
        evidenceRefs: thread.messageIds, createdAt: existing?.createdAt ?? iso(now), updatedAt: iso(now),
      };
      if (existing) Object.assign(existing, draft); else state.drafts.push(draft);
      audit(state, existing ? "DRAFT_UPDATED" : "DRAFT_PREPARED", draft.id, { threadId, mailboxId, recipient }, now);
      return clone(draft);
    });
  }
}

export const wbdMailControlContract = Object.freeze({
  schemaVersion: 1,
  organizationId: "we-build-and-design",
  capabilities: Object.freeze({ multiMailbox: "PREPARED", imapInbound: "PREPARED", smtpOutbound: "HUMAN_GO", webPush: "PREPARED_REQUIRES_VAPID", bulkTransport: "NOT_CONNECTED", sportpaleisBedrukmail: "READY_CAPTURE_ONLY" }),
  performance: Object.freeze({ renderConnectorCalls: 0, recentFirstSync: true, incrementalCheckpoints: true, boundedViews: true }),
});
