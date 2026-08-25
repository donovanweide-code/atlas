import { createECDH, createHmac, createPrivateKey, randomBytes, randomUUID, sign } from "node:crypto";

const PRIORITY_RANK = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });
const PUSHABLE_CLASSIFICATIONS = new Set(["STORING", "FINANCIEEL", "COMMERCIAL_OPPORTUNITY", "NIEUWE_SCOPE", "AFSPRAAK", "VRAAG_UITLEG", "JURIDISCH"]);
const NEVER_PUSH = new Set(["SPAM_NOISE", "INFORMATIEF", "INSUFFICIENT_EVIDENCE"]);
const ORGANIZATION_ID = "we-build-and-design";
const DEFAULT_USER_ID = "wbd-owner-donovan";
const MAX_SUBSCRIPTIONS_PER_USER = 12;
const MAX_OUTBOX = 2_000;
const MAX_DELIVERY_ATTEMPTS = 4;
const DEFAULT_TTL_SECONDS = 300;
const MAX_PUSH_EVENT_AGE_MS = 30 * 60 * 1_000;

const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const clone = (value) => structuredClone(value);
const base64url = (value) => Buffer.from(value).toString("base64url");

function decodeBase64url(value, label, expectedLength) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > 500) throw new Error(`${label} is ongeldig.`);
  const decoded = Buffer.from(normalized, "base64url");
  if (expectedLength && decoded.length !== expectedLength) throw new Error(`${label} heeft een ongeldige lengte.`);
  return decoded;
}

function boundedText(value, label, maximum) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maximum) throw new Error(`${label} is ongeldig.`);
  return normalized;
}

function normalizePriority(value, fallback = "MEDIUM") {
  return Object.hasOwn(PRIORITY_RANK, value) ? value : fallback;
}

function normalizeMailboxIds(value, allowedMailboxes) {
  const allowed = new Set(allowedMailboxes.map(({ id }) => id));
  const result = [...new Set((Array.isArray(value) ? value : []).map(String).filter((id) => allowed.has(id)))];
  return result.length ? result : [...allowed];
}

export function defaultNotificationPreference(userId = DEFAULT_USER_ID, mailboxes = [], now = new Date()) {
  return {
    userId,
    organizationId: ORGANIZATION_ID,
    enabled: true,
    mailboxIds: mailboxes.map(({ id }) => id),
    minimumPriority: "MEDIUM",
    lockScreenDetail: "PRIVATE",
    quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: "Europe/Amsterdam", allowHighPriority: true },
    updatedAt: iso(now),
  };
}

export function ensurePushNotificationState(state, now = new Date()) {
  state.notificationPreferences = Array.isArray(state.notificationPreferences) ? state.notificationPreferences : [];
  if (!state.notificationPreferences.some(({ userId }) => userId === DEFAULT_USER_ID)) {
    state.notificationPreferences.push(defaultNotificationPreference(DEFAULT_USER_ID, state.mailboxes ?? [], now));
  }
  state.pushSubscriptions = Array.isArray(state.pushSubscriptions) ? state.pushSubscriptions.slice(-200) : [];
  state.notificationOutbox = Array.isArray(state.notificationOutbox) ? state.notificationOutbox.slice(-MAX_OUTBOX) : [];
  return state;
}

export function validatePushNotificationState(state) {
  ensurePushNotificationState(state);
  const mailboxIds = new Set((state.mailboxes ?? []).map(({ id }) => id));
  state.notificationPreferences = state.notificationPreferences.map((preference) => ({
    userId: boundedText(preference.userId, "Gebruiker", 160),
    organizationId: preference.organizationId === ORGANIZATION_ID ? ORGANIZATION_ID : (() => { throw new Error("Notification preference valt buiten de WBD-tenantboundary."); })(),
    enabled: preference.enabled !== false,
    mailboxIds: [...new Set((preference.mailboxIds ?? []).filter((id) => mailboxIds.has(id)))],
    minimumPriority: normalizePriority(preference.minimumPriority),
    lockScreenDetail: preference.lockScreenDetail === "SAFE_SENDER" ? "SAFE_SENDER" : "PRIVATE",
    quietHours: {
      enabled: preference.quietHours?.enabled === true,
      start: /^\d{2}:\d{2}$/u.test(preference.quietHours?.start) ? preference.quietHours.start : "22:00",
      end: /^\d{2}:\d{2}$/u.test(preference.quietHours?.end) ? preference.quietHours.end : "07:00",
      timezone: String(preference.quietHours?.timezone || "Europe/Amsterdam").slice(0, 80),
      allowHighPriority: preference.quietHours?.allowHighPriority !== false,
    },
    updatedAt: iso(preference.updatedAt),
  }));
  state.pushSubscriptions = state.pushSubscriptions.map((subscription) => ({
    id: boundedText(subscription.id, "Subscription-ID", 180),
    userId: boundedText(subscription.userId, "Gebruiker", 160),
    organizationId: subscription.organizationId === ORGANIZATION_ID ? ORGANIZATION_ID : (() => { throw new Error("Pushsubscription valt buiten de WBD-tenantboundary."); })(),
    endpoint: boundedText(subscription.endpoint, "Pushendpoint", 2_048),
    keys: { p256dh: boundedText(subscription.keys?.p256dh, "Pushkey", 500), auth: boundedText(subscription.keys?.auth, "Push-authkey", 500) },
    deviceLabel: String(subscription.deviceLabel || "Workspace-apparaat").slice(0, 120),
    platform: String(subscription.platform || "WEB_PUSH").slice(0, 80),
    status: subscription.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    createdAt: iso(subscription.createdAt), lastSeenAt: iso(subscription.lastSeenAt),
    disabledAt: subscription.disabledAt ? iso(subscription.disabledAt) : null,
  }));
  state.notificationOutbox = state.notificationOutbox.slice(-MAX_OUTBOX).map((item) => ({
    ...clone(item), attempts: Math.max(0, Math.min(MAX_DELIVERY_ATTEMPTS, Number(item.attempts ?? 0))),
    status: ["PENDING", "SENDING", "DELIVERED", "FAILED", "SUPPRESSED"].includes(item.status) ? item.status : "FAILED",
  }));
  return state;
}

function clockMinutes(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find(({ type }) => type === "hour")?.value) * 60 + Number(parts.find(({ type }) => type === "minute")?.value);
}

function timeMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function inQuietHours(preference, now) {
  if (!preference.quietHours.enabled) return false;
  const current = clockMinutes(now, preference.quietHours.timezone);
  const start = timeMinutes(preference.quietHours.start);
  const end = timeMinutes(preference.quietHours.end);
  return start === end ? true : start < end ? current >= start && current < end : current >= start || current < end;
}

export function determineMailNotificationPriority(event, preference, now = new Date()) {
  if (!preference?.enabled) return { decision: "SUPPRESS", reason: "USER_DISABLED", priority: event.priority };
  if (!preference.mailboxIds.includes(event.mailboxId)) return { decision: "SUPPRESS", reason: "MAILBOX_DISABLED", priority: event.priority };
  if (event.direction && event.direction !== "INBOUND") return { decision: "SUPPRESS", reason: "NOT_INBOUND", priority: event.priority };
  const receivedAt = event.receivedAt ? new Date(event.receivedAt).getTime() : Number.NaN;
  if (!Number.isFinite(receivedAt)) return { decision: "SUPPRESS", reason: "FRESHNESS_UNKNOWN", priority: event.priority };
  if (receivedAt < now.getTime() - MAX_PUSH_EVENT_AGE_MS) return { decision: "SUPPRESS", reason: "HISTORICAL_SYNC", priority: event.priority };
  if (receivedAt > now.getTime() + 5 * 60 * 1_000) return { decision: "SUPPRESS", reason: "SOURCE_CLOCK_SKEW", priority: event.priority };
  if (NEVER_PUSH.has(event.classification)) return { decision: "SUPPRESS", reason: "NOISE_POLICY", priority: event.priority };
  const priority = event.securityStatus !== "CLEAN_BY_POLICY" ? "HIGH" : normalizePriority(event.priority, "LOW");
  if (PRIORITY_RANK[priority] < PRIORITY_RANK[preference.minimumPriority]) return { decision: "SUPPRESS", reason: "BELOW_THRESHOLD", priority };
  if (priority !== "HIGH" && !PUSHABLE_CLASSIFICATIONS.has(event.classification)) return { decision: "SUPPRESS", reason: "INSUFFICIENT_RELEVANCE", priority };
  if (inQuietHours(preference, now) && !(priority === "HIGH" && preference.quietHours.allowHighPriority)) return { decision: "DEFER", reason: "QUIET_HOURS", priority };
  return { decision: "PUSH", reason: event.securityStatus !== "CLEAN_BY_POLICY" ? "SECURITY_REVIEW" : "ATLAS_RELEVANT", priority };
}

const notificationMeaning = (event) => ({
  STORING: "Een storing of urgente vraag vraagt beoordeling.",
  FINANCIEEL: "Een financieel bericht vraagt beoordeling.",
  COMMERCIAL_OPPORTUNITY: "Een commerciële kans vraagt beoordeling.",
  NIEUWE_SCOPE: "Een mogelijke uitbreiding vraagt beoordeling.",
  AFSPRAAK: "Een afspraak of tijdsgebonden vraag vraagt beoordeling.",
  VRAAG_UITLEG: "Een nieuwe vraag wacht op beoordeling.",
  JURIDISCH: "Een juridisch bericht vraagt beoordeling.",
})[event.classification] ?? "Een relevante nieuwe mail vraagt beoordeling.";

export function createSafeMailPushPayload(event, mailbox, preference) {
  const safeSender = preference.lockScreenDetail === "SAFE_SENDER" && event.safeSenderLabel ? ` van ${String(event.safeSenderLabel).slice(0, 60)}` : "";
  return {
    title: "WBD Mail",
    body: `${mailbox.displayName}${safeSender} · ${notificationMeaning(event)}`,
    tag: `wbd-mail-${event.messageId}`,
    data: { url: `/workspace/wbd/mail?thread=${encodeURIComponent(event.threadId)}`, kind: "MAIL_ATTENTION", priority: normalizePriority(event.priority, "LOW") },
    renotify: normalizePriority(event.priority, "LOW") === "HIGH",
  };
}

export function enqueueMailNotifications(state, events, now = new Date()) {
  ensurePushNotificationState(state, now);
  const created = [];
  for (const event of events) {
    const mailbox = state.mailboxes.find(({ id }) => id === event.mailboxId);
    if (!mailbox) continue;
    for (const preference of state.notificationPreferences) {
      const assessment = determineMailNotificationPriority(event, preference, now);
      if (assessment.decision === "SUPPRESS") continue;
      const subscriptions = state.pushSubscriptions.filter(({ userId, status }) => userId === preference.userId && status === "ACTIVE");
      for (const subscription of subscriptions) {
        const dedupeKey = `${event.messageId}:${subscription.id}`;
        if (state.notificationOutbox.some((item) => item.dedupeKey === dedupeKey)) continue;
        const record = {
          id: `push-${randomUUID()}`, dedupeKey, userId: preference.userId, organizationId: ORGANIZATION_ID,
          mailboxId: event.mailboxId, messageId: event.messageId, threadId: event.threadId, subscriptionId: subscription.id,
          priority: assessment.priority, status: assessment.decision === "DEFER" ? "SUPPRESSED" : "PENDING", reason: assessment.reason,
          payload: createSafeMailPushPayload(event, mailbox, preference), attempts: 0, createdAt: iso(now), updatedAt: iso(now), deliveredAt: null,
        };
        state.notificationOutbox.push(record);
        created.push(clone(record));
      }
    }
  }
  if (state.notificationOutbox.length > MAX_OUTBOX) state.notificationOutbox.splice(0, state.notificationOutbox.length - MAX_OUTBOX);
  return created;
}

function publicSubscription(subscription) {
  return { id: subscription.id, deviceLabel: subscription.deviceLabel, platform: subscription.platform, status: subscription.status, createdAt: subscription.createdAt, lastSeenAt: subscription.lastSeenAt };
}

export function publicNotificationView(state, userId, transport) {
  ensurePushNotificationState(state);
  const preference = state.notificationPreferences.find((item) => item.userId === userId) ?? defaultNotificationPreference(userId, state.mailboxes);
  return {
    status: transport.status,
    publicKey: transport.status === "LIVE" ? transport.publicKey : null,
    permissionRequired: true,
    installation: { desktop: "SUPPORTED", iphone: "ADD_TO_HOME_SCREEN_REQUIRED" },
    privacy: "PRIVATE_BY_DEFAULT",
    preference: clone(preference),
    subscriptions: state.pushSubscriptions.filter((item) => item.userId === userId).map(publicSubscription),
    counts: { activeDevices: state.pushSubscriptions.filter((item) => item.userId === userId && item.status === "ACTIVE").length, delivered: state.notificationOutbox.filter((item) => item.userId === userId && item.status === "DELIVERED").length },
  };
}

export function updateNotificationPreference(state, userId, payload, now = new Date()) {
  ensurePushNotificationState(state, now);
  const current = state.notificationPreferences.find((item) => item.userId === userId) ?? defaultNotificationPreference(userId, state.mailboxes, now);
  const next = {
    ...current,
    enabled: payload.enabled !== false,
    mailboxIds: normalizeMailboxIds(payload.mailboxIds, state.mailboxes),
    minimumPriority: normalizePriority(payload.minimumPriority),
    lockScreenDetail: payload.lockScreenDetail === "SAFE_SENDER" ? "SAFE_SENDER" : "PRIVATE",
    quietHours: { ...current.quietHours, ...(payload.quietHours ?? {}), enabled: payload.quietHours?.enabled === true, allowHighPriority: payload.quietHours?.allowHighPriority !== false },
    updatedAt: iso(now),
  };
  const index = state.notificationPreferences.findIndex((item) => item.userId === userId);
  if (index >= 0) state.notificationPreferences[index] = next; else state.notificationPreferences.push(next);
  return clone(next);
}

export function registerPushSubscription(state, userId, input, now = new Date()) {
  ensurePushNotificationState(state, now);
  if (state.pushSubscriptions.filter((item) => item.userId === userId && item.status === "ACTIVE").length >= MAX_SUBSCRIPTIONS_PER_USER) throw new Error("Maximum aantal actieve apparaten bereikt.");
  const endpoint = boundedText(input?.endpoint, "Pushendpoint", 2_048);
  if (!endpoint.startsWith("https://")) throw new Error("Pushendpoint moet HTTPS gebruiken.");
  const target = new URL(endpoint);
  const trustedPushService = target.hostname === "fcm.googleapis.com" || target.hostname === "web.push.apple.com" || target.hostname.endsWith(".push.services.mozilla.com") || target.hostname.endsWith(".notify.windows.com");
  if (!trustedPushService || target.username || target.password || (target.port && target.port !== "443")) throw new Error("Pushendpoint behoort niet tot een ondersteunde browser-pushservice.");
  decodeBase64url(input?.keys?.p256dh, "Pushkey", 65);
  decodeBase64url(input?.keys?.auth, "Push-authkey", 16);
  const existing = state.pushSubscriptions.find((item) => item.endpoint === endpoint);
  if (existing && existing.userId !== userId) throw new Error("Pushendpoint is al aan een andere gebruiker gekoppeld.");
  const subscription = {
    id: existing?.id ?? `push-subscription-${randomUUID()}`, userId, organizationId: ORGANIZATION_ID,
    endpoint, keys: { p256dh: input.keys.p256dh, auth: input.keys.auth },
    deviceLabel: String(input.deviceLabel || "Workspace-apparaat").slice(0, 120), platform: String(input.platform || "WEB_PUSH").slice(0, 80),
    status: "ACTIVE", createdAt: existing?.createdAt ?? iso(now), lastSeenAt: iso(now), disabledAt: null,
  };
  if (existing) Object.assign(existing, subscription); else state.pushSubscriptions.push(subscription);
  return publicSubscription(subscription);
}

export function disablePushSubscription(state, userId, subscriptionId, now = new Date()) {
  ensurePushNotificationState(state, now);
  const subscription = state.pushSubscriptions.find((item) => item.id === subscriptionId && item.userId === userId);
  if (!subscription) throw Object.assign(new Error("Pushapparaat niet gevonden."), { statusCode: 404, code: "NOT_FOUND" });
  subscription.status = "DISABLED";
  subscription.disabledAt = iso(now);
  subscription.lastSeenAt = iso(now);
  return publicSubscription(subscription);
}

function hkdfExtract(salt, input) { return createHmac("sha256", salt).update(input).digest(); }
function hkdfExpand(prk, info, length) {
  let previous = Buffer.alloc(0); const blocks = [];
  for (let counter = 1; Buffer.concat(blocks).length < length; counter += 1) {
    previous = createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([counter])])).digest();
    blocks.push(previous);
  }
  return Buffer.concat(blocks).subarray(0, length);
}

async function encryptWebPushPayload(payload, subscription) {
  const { createCipheriv } = await import("node:crypto");
  const clientPublic = decodeBase64url(subscription.keys.p256dh, "Pushkey", 65);
  const authSecret = decodeBase64url(subscription.keys.auth, "Push-authkey", 16);
  const server = createECDH("prime256v1"); server.generateKeys();
  const serverPublic = server.getPublicKey();
  const sharedSecret = server.computeSecret(clientPublic);
  const authPrk = hkdfExtract(authSecret, sharedSecret);
  const ikm = hkdfExpand(authPrk, Buffer.concat([Buffer.from("WebPush: info\0"), clientPublic, serverPublic]), 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const contentEncryptionKey = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0"), 12);
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload), "utf8"), Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4); recordSize.writeUInt32BE(4_096);
  return Buffer.concat([salt, recordSize, Buffer.from([serverPublic.length]), serverPublic, ciphertext]);
}

function vapidJwt(endpoint, config, now = new Date()) {
  const audience = new URL(endpoint).origin;
  const header = base64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = base64url(JSON.stringify({ aud: audience, exp: Math.floor(now.getTime() / 1_000) + 12 * 60 * 60, sub: config.subject }));
  const privateBytes = decodeBase64url(config.privateKey, "VAPID private key", 32);
  const publicBytes = decodeBase64url(config.publicKey, "VAPID public key", 65);
  const x = publicBytes.subarray(1, 33).toString("base64url");
  const y = publicBytes.subarray(33).toString("base64url");
  const key = createPrivateKey({ key: { kty: "EC", crv: "P-256", d: privateBytes.toString("base64url"), x, y }, format: "jwk" });
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

export function createWebPushTransportFromEnvironment(environment = process.env, { fetchImpl = globalThis.fetch, timeoutMs = 5_000 } = {}) {
  const config = { publicKey: String(environment.WBD_PUSH_VAPID_PUBLIC_KEY ?? "").trim(), privateKey: String(environment.WBD_PUSH_VAPID_PRIVATE_KEY ?? "").trim(), subject: String(environment.WBD_PUSH_VAPID_SUBJECT ?? "").trim() };
  const populated = Object.values(config).filter(Boolean).length;
  if (populated === 0) return { status: "PREPARED", publicKey: null, async send() { return { status: "NOT_CONFIGURED" }; } };
  try {
    if (populated !== 3) throw new Error("VAPID-configuratie is incompleet.");
    decodeBase64url(config.publicKey, "VAPID public key", 65); decodeBase64url(config.privateKey, "VAPID private key", 32);
    if (!config.subject.startsWith("mailto:") && !config.subject.startsWith("https://")) throw new Error("VAPID-subject is ongeldig.");
  } catch (cause) {
    return { status: "MISCONFIGURED", publicKey: null, async send() { return { status: "MISCONFIGURED", errorCode: cause.message }; } };
  }
  return {
    status: "LIVE", publicKey: config.publicKey,
    async send(subscription, payload) {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const body = await encryptWebPushPayload(payload, subscription);
        const response = await fetchImpl(subscription.endpoint, { method: "POST", signal: controller.signal, headers: { Authorization: `vapid t=${vapidJwt(subscription.endpoint, config)}, k=${config.publicKey}`, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(DEFAULT_TTL_SECONDS), Urgency: payload.data?.priority === "HIGH" ? "high" : "normal" }, body });
        if (response.status === 404 || response.status === 410) return { status: "GONE", statusCode: response.status };
        if (!response.ok) return { status: "FAILED", statusCode: response.status };
        return { status: "DELIVERED", statusCode: response.status };
      } catch (cause) { return { status: "FAILED", errorCode: cause?.name === "AbortError" ? "TIMEOUT" : "WEB_PUSH_FAILED" }; }
      finally { clearTimeout(timeout); }
    },
  };
}

export const wbdPushNotificationContract = Object.freeze({
  provider: "STANDARD_WEB_PUSH", paidProviderRequired: false, defaultPrivacy: "PRIVATE", permissionMode: "EXPLICIT_USER_GESTURE",
  iphone: "INSTALLED_PWA_IOS_16_4_OR_NEWER", maximumSubscriptionsPerUser: MAX_SUBSCRIPTIONS_PER_USER, maximumDeliveryAttempts: MAX_DELIVERY_ATTEMPTS, maximumPushEventAgeMs: MAX_PUSH_EVENT_AGE_MS,
});
