import { createHash } from "node:crypto";

export const SPORTPALEIS_MAILBOX_ID = "sportpaleis-bedrukking";
export const SPORTPALEIS_MAILBOX_ADDRESS = "bedrukking@sportpaleis.nl";
export const SPORTPALEIS_MAIL_ROUTES = Object.freeze(["WEBSHOP_ORDER_PDF", "CUSTOMER_REPLY", "UNKNOWN"]);

const MAX_TEXT = 500_000;
const MAX_HTML = 1_000_000;
const MAX_ATTACHMENTS = 20;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const normalizedMessageId = (value) => String(value ?? "").trim().toLocaleLowerCase("en-US");
const unique = (values) => [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
const safeIso = (value, fallback = new Date()) => {
  const parsed = new Date(value ?? fallback);
  if (!Number.isFinite(parsed.getTime())) throw Object.assign(new Error("Ongeldige maildatum."), { code: "SPORTPALEIS_MAIL_DATE_INVALID" });
  return parsed.toISOString();
};

function safeText(value, maximum) {
  return String(value ?? "").slice(0, maximum);
}

function address(value) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("en-US");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) throw Object.assign(new Error("Ongeldig mailadres in mailboxbron."), { code: "SPORTPALEIS_MAIL_ADDRESS_INVALID" });
  return normalized;
}

function participant(value) {
  return { name: safeText(value?.name, 240).trim() || null, address: address(value?.address) };
}

export function sanitizeSportpaleisMailHtml(value) {
  return safeText(value, MAX_HTML)
    .replace(/<\s*(script|iframe|object|embed|form|input|button|video|audio|base|meta|link)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu, "")
    .replace(/<\s*(script|iframe|object|embed|form|input|button|video|audio|base|meta|link)\b[^>]*\/?>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(src|href)\s*=\s*(["'])\s*(?:javascript|data:text\/html):[\s\S]*?\2/giu, " $1=\"#blocked\"")
    .replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/<img\b[^>]*\bsrc\s*=\s*(?:(['"])https?:\/\/[^"']+\1|https?:\/\/[^\s>]+)[^>]*>/giu, '<span data-remote-image="blocked">Externe afbeelding geblokkeerd</span>');
}

export function parseSportpaleisMailboxConfiguration(environment = process.env) {
  const prefix = "SPORTPALEIS_BEDRUKKING";
  const host = String(environment[`${prefix}_IMAP_HOST`] ?? "").trim();
  const user = String(environment[`${prefix}_IMAP_USER`] ?? "").trim();
  const secret = String(environment[`${prefix}_IMAP_PASSWORD`] ?? "");
  const configured = Boolean(host && user && secret);
  return {
    id: SPORTPALEIS_MAILBOX_ID,
    organizationId: "sport-2000-sportpaleis-bv",
    address: SPORTPALEIS_MAILBOX_ADDRESS,
    provider: "IMAP_TLS",
    configured,
    host: configured ? host : null,
    port: configured ? Number(environment[`${prefix}_IMAP_PORT`] || 993) : null,
    secure: configured ? environment[`${prefix}_IMAP_SECURE`] !== "false" : true,
    user: configured ? user : null,
    secret: configured ? secret : null,
    folder: String(environment[`${prefix}_IMAP_FOLDER`] ?? "INBOX").trim() || "INBOX",
  };
}

export function createSportpaleisMailboxRoutingState() {
  return {
    schemaVersion: 1,
    mailbox: {
      id: SPORTPALEIS_MAILBOX_ID,
      organizationId: "sport-2000-sportpaleis-bv",
      address: SPORTPALEIS_MAILBOX_ADDRESS,
      provider: "IMAP_TLS",
      credentialStatus: "NOT_PROVISIONED",
      connectionState: "NOT_CONNECTED",
      inboundStatus: "CREDENTIALS_REQUIRED",
      leastPrivilege: "READ_CAPTURE_NO_DELETE",
      destructiveMailboxActions: false,
      checkpoint: null,
      lastAttemptAt: null,
      lastSuccessfulSyncAt: null,
      lastFailureCode: null,
    },
    messages: [],
    attentions: [],
    classificationHistory: [],
  };
}

function orderTokens(order) {
  return unique([order?.id, order?.externalReference, order?.sourceContext?.externalReference]);
}

function referencedOrders(text, orders) {
  const source = String(text ?? "").toLocaleLowerCase("nl-NL");
  const exactToken = (token) => {
    const escaped = String(token).toLocaleLowerCase("nl-NL").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "u").test(source);
  };
  return (orders ?? []).filter((order) => orderTokens(order).some(exactToken)).map(({ id }) => id);
}

function productionImpact(text) {
  const source = String(text ?? "").toLocaleLowerCase("nl-NL");
  const signals = [];
  const checks = [
    ["NUMBER", /\b(?:rugnummer|shortnummer|roknummer|borstnummer|nummer)\b/u],
    ["NAME", /\b(?:naam|initialen|tussenvoegsel)\b/u],
    ["SIZE", /\b(?:maat|formaat)\b/u],
    ["COLOR", /\b(?:kleur|folie)\b/u],
    ["ARTICLE", /\b(?:artikel|product|shirt|broek|short|rok)\b/u],
    ["CANCELLATION", /\b(?:annuleer|annuleren|afbestellen|niet meer leveren)\b/u],
  ];
  for (const [signal, pattern] of checks) if (pattern.test(source)) signals.push(signal);
  return { detected: signals.length > 0, signals };
}

function threadIdentity(message, existingMessages, orderIds) {
  const references = unique([...(message.references ?? []), message.inReplyTo]).map(normalizedMessageId);
  const referenced = existingMessages.find((candidate) => candidate.messageId && references.includes(normalizedMessageId(candidate.messageId)));
  if (referenced) return { threadId: referenced.threadId, strategy: "REFERENCES", confidence: "HIGH" };
  const sameOrder = orderIds.length === 1 ? existingMessages.find((candidate) => candidate.orderIds?.includes(orderIds[0])) : null;
  if (sameOrder) return { threadId: sameOrder.threadId, strategy: "ORDER_CONTEXT", confidence: "HIGH" };
  return { threadId: `sp-mail-thread-${sha256(`${message.messageId ?? message.sourceKey}:${orderIds.join(",")}`).slice(0, 28)}`, strategy: "NEW_THREAD", confidence: message.messageId ? "MEDIUM" : "LOW" };
}

export function prepareSportpaleisMailboxMessage(input, { existingMessages = [], orders = [], fetchedAt = new Date() } = {}) {
  const mailboxId = String(input.mailboxId ?? "").trim();
  if (mailboxId !== SPORTPALEIS_MAILBOX_ID) throw Object.assign(new Error("Mail valt buiten de Sportpaleis-mailboxboundary."), { code: "SPORTPALEIS_MAILBOX_BOUNDARY" });
  const folder = safeText(input.folder || "INBOX", 500).trim();
  const uidValidity = safeText(input.uidValidity, 64).trim();
  const uid = Number(input.uid);
  if (!folder || !uidValidity || !Number.isSafeInteger(uid) || uid < 1) throw Object.assign(new Error("Onvolledige IMAP-bronidentiteit."), { code: "SPORTPALEIS_IMAP_IDENTITY_INVALID" });
  const from = participant(input.from);
  const to = (input.to ?? []).slice(0, 50).map(participant);
  const cc = (input.cc ?? []).slice(0, 50).map(participant);
  const messageId = safeText(input.messageId, 998).trim() || null;
  const sourceKey = `${mailboxId}:${folder}:${uidValidity}:${uid}`;
  const text = safeText(input.text, MAX_TEXT);
  const html = sanitizeSportpaleisMailHtml(input.html);
  const attachments = (input.attachments ?? []).slice(0, MAX_ATTACHMENTS).map((item, index) => {
    const dataBase64 = item.dataBase64 ? String(item.dataBase64) : null;
    const bytes = dataBase64 ? Buffer.from(dataBase64, "base64") : null;
    const contentHash = String(item.contentHash ?? (bytes ? sha256(bytes) : "")).toLocaleLowerCase("en-US") || null;
    if (bytes && contentHash !== sha256(bytes)) throw Object.assign(new Error("Attachmenthash komt niet overeen met de mailboxbron."), { code: "SPORTPALEIS_ATTACHMENT_HASH_MISMATCH" });
    return {
      id: safeText(item.id || `${sourceKey}:${index}`, 200),
      filename: safeText(item.filename || `bijlage-${index + 1}`, 500),
      contentType: safeText(item.contentType || "application/octet-stream", 200).toLocaleLowerCase("en-US"),
      size: Number(item.size ?? bytes?.length ?? 0),
      contentHash,
      disposition: item.disposition === "inline" ? "INLINE" : "ATTACHMENT",
      storageReference: item.storageReference ?? null,
      ...(dataBase64 ? { dataBase64 } : {}),
    };
  });
  const rawDataBase64 = input.rawDataBase64 ? String(input.rawDataBase64) : null;
  const rawBytes = rawDataBase64 ? Buffer.from(rawDataBase64, "base64") : null;
  const rawSha256 = String(input.rawSha256 ?? (rawBytes ? sha256(rawBytes) : "")).toLocaleLowerCase("en-US") || null;
  if (rawBytes && rawSha256 !== sha256(rawBytes)) throw Object.assign(new Error("Mailbronhash komt niet overeen met de immutable bytes."), { code: "SPORTPALEIS_MAIL_HASH_MISMATCH" });
  const body = `${input.subject ?? ""}\n${text}`;
  const orderIds = referencedOrders(body, orders);
  const base = {
    id: `sp-mail-${sha256(messageId ? `${mailboxId}:${normalizedMessageId(messageId)}` : sourceKey).slice(0, 32)}`,
    organizationId: "sport-2000-sportpaleis-bv",
    mailboxId,
    folder,
    uidValidity,
    uid,
    sourceKey,
    messageId,
    inReplyTo: safeText(input.inReplyTo, 998).trim() || null,
    references: unique(input.references ?? []).slice(0, 100),
    from,
    to,
    cc,
    replyTo: input.replyTo ? participant(input.replyTo) : null,
    subject: safeText(input.subject || "(geen onderwerp)", 998),
    receivedAt: safeIso(input.receivedAt, fetchedAt),
    fetchedAt: safeIso(fetchedAt),
    text,
    html,
    snippet: text.replace(/\s+/gu, " ").trim().slice(0, 260),
    attachments,
    rawEvidence: { sha256: rawSha256, sizeBytes: rawBytes?.length ?? Number(input.size ?? 0), storageReference: null, immutable: Boolean(rawSha256) },
    orderIds,
    contentHash: sha256(JSON.stringify({ from, to, subject: input.subject ?? "", text, html, attachments: attachments.map(({ dataBase64: _dataBase64, ...metadata }) => metadata) })),
  };
  base.threading = threadIdentity(base, existingMessages, orderIds);
  base.threadId = base.threading.threadId;
  return { ...base, ...(rawDataBase64 ? { rawDataBase64 } : {}) };
}

export function classifySportpaleisMailboxMessage(message, { existingMessages = [], pdfAssessments = [] } = {}) {
  const references = unique([...(message.references ?? []), message.inReplyTo]).map(normalizedMessageId);
  const referencedMessage = existingMessages.find((candidate) => candidate.messageId && references.includes(normalizedMessageId(candidate.messageId)));
  const verifiedPdfs = pdfAssessments.filter(({ valid, productionOrderCount }) => valid && productionOrderCount > 0);
  const isReply = Boolean(referencedMessage || message.orderIds?.length);
  if (verifiedPdfs.length && isReply) {
    return { route: "UNKNOWN", confidence: "HIGH", reasons: ["MIXED_PDF_AND_REPLY_SIGNALS"], productionImpact: productionImpact(`${message.subject}\n${message.text}`), orderIds: message.orderIds ?? [], pdfAttachmentIds: verifiedPdfs.map(({ attachmentId }) => attachmentId) };
  }
  if (verifiedPdfs.length === 1) {
    return { route: "WEBSHOP_ORDER_PDF", confidence: "HIGH", reasons: ["PDF_BYTES_AND_ORDER_STRUCTURE_VERIFIED"], productionImpact: { detected: false, signals: [] }, orderIds: [], pdfAttachmentIds: [verifiedPdfs[0].attachmentId] };
  }
  if (verifiedPdfs.length > 1) {
    return { route: "UNKNOWN", confidence: "HIGH", reasons: ["MULTIPLE_AUTHORITATIVE_WEBSHOP_PDFS"], productionImpact: { detected: false, signals: [] }, orderIds: [], pdfAttachmentIds: verifiedPdfs.map(({ attachmentId }) => attachmentId) };
  }
  if (isReply) {
    return { route: "CUSTOMER_REPLY", confidence: referencedMessage ? "HIGH" : "MEDIUM", reasons: [referencedMessage ? "MESSAGE_REFERENCES_MATCH" : "EXACT_ORDER_CONTEXT_MATCH"], productionImpact: productionImpact(`${message.subject}\n${message.text}`), orderIds: message.orderIds?.length ? message.orderIds : referencedMessage?.orderIds ?? [], pdfAttachmentIds: [] };
  }
  return { route: "UNKNOWN", confidence: "HIGH", reasons: [pdfAssessments.some(({ valid }) => !valid) ? "PDF_NOT_RECOGNIZED_AS_WEBSHOP_ORDER" : "INSUFFICIENT_DETERMINISTIC_EVIDENCE"], productionImpact: productionImpact(`${message.subject}\n${message.text}`), orderIds: message.orderIds ?? [], pdfAttachmentIds: [] };
}

export function publicSportpaleisMailboxRouting(state, { configured = false } = {}) {
  const source = clone(state ?? createSportpaleisMailboxRoutingState());
  source.mailbox.credentialStatus = configured ? source.mailbox.credentialStatus : "NOT_PROVISIONED";
  source.mailbox.connectionState = configured ? source.mailbox.connectionState : "NOT_CONNECTED";
  source.mailbox.inboundStatus = configured ? source.mailbox.inboundStatus : "CREDENTIALS_REQUIRED";
  source.messages = source.messages.map((message) => ({
    ...message,
    html: undefined,
    rawDataBase64: undefined,
    attachments: message.attachments.map(({ dataBase64: _dataBase64, ...attachment }) => attachment),
  }));
  return source;
}

export const sportpaleisMailboxRoutingContract = Object.freeze({
  mailbox: SPORTPALEIS_MAILBOX_ADDRESS,
  transport: "IMAP_TLS",
  credentials: "SERVER_SIDE_ENV_ONLY",
  leastPrivilege: "READ_CAPTURE_NO_DELETE",
  deterministicRoutes: SPORTPALEIS_MAIL_ROUTES,
  outgoingMail: false,
  automaticProductionMutationFromReply: false,
});
