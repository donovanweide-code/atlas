import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MemoryWbdMailStore, WbdMailControlService, createInitialWbdMailControl } from "../scripts/wbd-mail-control.mjs";
import {
  createSafeMailPushPayload,
  createWebPushTransportFromEnvironment,
  defaultNotificationPreference,
  determineMailNotificationPriority,
  publicNotificationView,
  registerPushSubscription,
} from "../scripts/wbd-push-notifications.mjs";

const fixedNow = new Date("2026-08-25T10:00:00.000Z");
const source = (overrides = {}) => ({ folder: "INBOX", uidValidity: "913", uid: 7, messageId: "<push-7@example.test>", from: { name: "Vertrouwelijke klant", address: "secret@example.test" }, to: [{ address: "info@webuildanddesign.nl" }], subject: "Storing bij geheime klant", text: "Urgent: de checkout werkt niet. Contract 12345.", receivedAt: fixedNow, flags: [], attachments: [], headers: {}, ...overrides });
const event = (overrides = {}) => ({ messageId: "mail-1", threadId: "thread-secret", mailboxId: "wbd-info", direction: "INBOUND", receivedAt: fixedNow.toISOString(), classification: "STORING", priority: "HIGH", securityStatus: "CLEAN_BY_POLICY", safeSenderLabel: "Vertrouwelijke klant", ...overrides });

test("Atlas pusht relevante mail en onderdrukt ruis, lage prioriteit en uitgeschakelde mailboxen", () => {
  const preference = defaultNotificationPreference("owner", [{ id: "wbd-info" }], fixedNow);
  assert.deepEqual(determineMailNotificationPriority(event(), preference, fixedNow), { decision: "PUSH", reason: "ATLAS_RELEVANT", priority: "HIGH" });
  assert.equal(determineMailNotificationPriority(event({ classification: "SPAM_NOISE", priority: "LOW" }), preference, fixedNow).reason, "NOISE_POLICY");
  assert.equal(determineMailNotificationPriority(event({ mailboxId: "wbd-facturen" }), preference, fixedNow).reason, "MAILBOX_DISABLED");
  assert.equal(determineMailNotificationPriority(event({ classification: "INFORMATIEF", priority: "LOW" }), preference, fixedNow).decision, "SUPPRESS");
  assert.equal(determineMailNotificationPriority(event({ receivedAt: "2026-08-24T10:00:00.000Z" }), preference, fixedNow).reason, "HISTORICAL_SYNC");
  assert.equal(determineMailNotificationPriority(event({ receivedAt: null }), preference, fixedNow).reason, "FRESHNESS_UNKNOWN");
});

test("lockscreen-payload lekt geen onderwerp, mailtekst, e-mailadres of thread-ID in zichtbare tekst", () => {
  const preference = defaultNotificationPreference("owner", [{ id: "wbd-info" }], fixedNow);
  const payload = createSafeMailPushPayload(event(), { id: "wbd-info", displayName: "WBD algemeen" }, preference);
  assert.equal(payload.title, "WBD Mail");
  assert.match(payload.body, /WBD algemeen/u);
  assert.doesNotMatch(`${payload.title} ${payload.body}`, /geheime|secret@|Contract 12345|thread-secret/iu);
  assert.equal(payload.data.url, "/workspace/wbd/mail?thread=thread-secret");
});

test("subscriptions blijven server-side en publieke notification-view redigeert endpoint en keys", () => {
  const state = createInitialWbdMailControl({ now: fixedNow });
  const client = createECDH("prime256v1"); client.generateKeys();
  registerPushSubscription(state, "wbd-owner-donovan", { endpoint: "https://web.push.apple.com/subscription/private", keys: { p256dh: client.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }, deviceLabel: "iPhone", platform: "IOS_PWA" }, fixedNow);
  const view = publicNotificationView(state, "wbd-owner-donovan", { status: "LIVE", publicKey: "public" });
  assert.equal(view.subscriptions.length, 1);
  assert.equal(view.subscriptions[0].deviceLabel, "iPhone");
  assert.equal("endpoint" in view.subscriptions[0], false);
  assert.equal("keys" in view.subscriptions[0], false);
  assert.doesNotMatch(JSON.stringify(view), /subscription\/private|p256dh|auth/iu);
});

test("ingestion dedupliceert push en disablet verlopen endpoints fail-closed", async () => {
  const state = createInitialWbdMailControl({ now: fixedNow });
  const client = createECDH("prime256v1"); client.generateKeys();
  registerPushSubscription(state, "wbd-owner-donovan", { endpoint: "https://fcm.googleapis.com/fcm/send/expired", keys: { p256dh: client.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }, deviceLabel: "Desktop", platform: "DESKTOP_WEB" }, fixedNow);
  const transport = { status: "LIVE", publicKey: "test", async send() { return { status: "GONE", statusCode: 410 }; } };
  const store = new MemoryWbdMailStore(state);
  const service = new WbdMailControlService({ store, now: () => fixedNow, pushTransport: transport });
  const first = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "913", highestUid: 7, messages: [source()] });
  const repeat = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "913", highestUid: 7, messages: [source()] });
  assert.equal(first.push.attempted, 1);
  assert.equal(repeat.duplicates, 1);
  const stored = await store.read();
  assert.equal(stored.notificationOutbox.length, 1);
  assert.equal(stored.notificationOutbox[0].status, "FAILED");
  assert.equal(stored.pushSubscriptions[0].status, "DISABLED");
});

test("Web Push transport is prepared zonder credential, fail-closed bij partial config en verstuurt RFC8291 bytes bij complete testconfig", async () => {
  assert.equal(createWebPushTransportFromEnvironment({}).status, "PREPARED");
  assert.equal(createWebPushTransportFromEnvironment({ WBD_PUSH_VAPID_PUBLIC_KEY: "x" }).status, "MISCONFIGURED");
  const vapid = createECDH("prime256v1"); vapid.generateKeys();
  const subscriber = createECDH("prime256v1"); subscriber.generateKeys();
  let request;
  const transport = createWebPushTransportFromEnvironment({ WBD_PUSH_VAPID_PUBLIC_KEY: vapid.getPublicKey().toString("base64url"), WBD_PUSH_VAPID_PRIVATE_KEY: vapid.getPrivateKey().toString("base64url"), WBD_PUSH_VAPID_SUBJECT: "mailto:security@webuildanddesign.nl" }, { fetchImpl: async (endpoint, options) => { request = { endpoint, options }; return { ok: true, status: 201 }; } });
  const result = await transport.send({ endpoint: "https://push.example.test/send/1", keys: { p256dh: subscriber.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } }, { title: "WBD Mail", body: "Veilige betekenis", data: { priority: "HIGH" } });
  assert.equal(result.status, "DELIVERED");
  assert.equal(request.options.headers["Content-Encoding"], "aes128gcm");
  assert.match(request.options.headers.Authorization, /^vapid t=.+, k=.+/u);
  assert.ok(Buffer.from(request.options.body).length > 100);
});

test("PWA-contract vraagt toestemming alleen na user action en houdt iPhone deep link binnen WBD", async () => {
  const [worker, client, manifest] = await Promise.all([readFile(new URL("../workspace-public/wbd-owner-sw.js", import.meta.url), "utf8"), readFile(new URL("../src/wbd-mail-workspace.ts", import.meta.url), "utf8"), readFile(new URL("../workspace-public/wbd-owner.webmanifest", import.meta.url), "utf8")]);
  assert.match(worker, /addEventListener\("push"/u);
  assert.match(worker, /showNotification/u);
  assert.match(worker, /startsWith\("\/workspace\/wbd\/"\)/u);
  assert.match(client, /data-mail-push-enable/u);
  assert.match(client, /Notification\.requestPermission\(\)/u);
  assert.match(client, /Zet op beginscherm/u);
  assert.doesNotMatch(worker, /subject|snippet|mailtext|email/iu);
  assert.equal(JSON.parse(manifest).start_url, "/workspace/wbd/home");
});
