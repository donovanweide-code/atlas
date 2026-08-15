import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AuthenticatedSmtpTransport,
  CaptureTransport,
  MailFoundation,
  MemoryMailStore,
  createMailOrganizations,
  createManagedSportpaleisOrderTemplate,
} from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createSportpaleisProductionMailFoundation } from "../scripts/sportpaleis-production-mail.mjs";

const passwords = {
  kevin: "Notification-Kevin-V1!",
  patrick: "Notification-Patrick-V1!",
  collega: "Notification-Store-V1!",
  "donovan-support": "Notification-Support-V1!",
};

async function fixture(context, simulation = "success", serviceOptions = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-notification-v1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const transport = new CaptureTransport({ captureDirectory: path.join(root, "captures"), simulation });
  const mailStore = new MemoryMailStore();
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: mailStore, transport });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", releaseId: "SPW-NOTIFICATION-V1-TEST", mailMode: "capture", ...serviceOptions });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const colleague = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  return { root, store, transport, mailStore, service, admin, operator, colleague };
}

async function createOrder(service, colleague, idempotencyKey, customerEmail = "notification-customer@example.nl") {
  return (await service.createOrder(colleague.token, colleague.csrfToken, {
    customer: "Notification Klant",
    customerEmail,
    customerPhone: "06 12345678",
    standardPersonalization: { initials: "NK", name: "NOTIFICATION", backNumber: "34", shortsNumber: "34" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
  }, idempotencyKey)).value;
}

async function testAndEnable(service, admin, event) {
  const tested = await service.testNotification(admin.token, admin.csrfToken, event, { recipient: "admin-test@example.nl" }, `notification-test-${event.toLowerCase()}-0001`);
  assert.equal(tested.status, "CAPTURED");
  const enabled = await service.updateNotificationConfig(admin.token, admin.csrfToken, event, { enabled: true });
  assert.equal(enabled.enabled, true);
}

test("beide events zijn standaard uit en ORDER_RECEIVED blokkeert de orderflow niet", async (context) => {
  const { store, mailStore, service, colleague, operator, admin } = await fixture(context);
  const bootstrap = await service.bootstrap(admin.token);
  assert.equal(bootstrap.notificationFoundation.events.ORDER_RECEIVED.enabled, false);
  assert.equal(bootstrap.notificationFoundation.events.ORDER_READY.enabled, false);

  const order = await createOrder(service, colleague, "notification-default-off-order-0001");
  const state = await store.read();
  const execution = state.notificationFoundation.executions.find(({ orderId, event }) => orderId === order.id && event === "ORDER_RECEIVED");
  assert.equal(execution.status, "DISABLED");
  assert.equal((await mailStore.read()).attempts.length, 0);
  const advanced = await service.advanceOrder(operator.token, operator.csrfToken, order.id, order.revision, "notification-default-off-advance-0001");
  assert.equal(advanced.value.stage, "CONTROL");
});

test("templatebeheer is admin-only, veilig gerenderd en vereist een actuele test voor activering", async (context) => {
  const { service, admin, operator } = await fixture(context);
  await assert.rejects(service.updateNotificationConfig(operator.token, operator.csrfToken, "ORDER_READY", { enabled: true }), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { enabled: true }), (error) => error.code === "NOTIFICATION_TEST_REQUIRED");
  await assert.rejects(service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { template: {
    name: "Onveilig", subject: "{{unknown.value}}", heading: "Kop", body: "Tekst", buttonText: "", footerContact: "Contact",
  } }), (error) => error.code === "TEMPLATE_RENDER_FAILED");

  const saved = await service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { template: {
    name: "Bestelling klaar V1", subject: "Order {{order.number}} is klaar", heading: "Afhalen", body: "Beste {{customer.name}},\n\n{{order.pickupInformation}}\n\n<script>alert(1)</script>", buttonText: "Neem uw referentie mee", footerContact: "Sportpaleis\nbedrukking@sportpaleis.nl",
  } });
  assert.equal(saved.template.version, 2);
  const preview = await service.previewNotificationTemplate(admin.token, "ORDER_READY");
  assert.match(preview.subject, /^\[TEST\]/u);
  assert.doesNotMatch(preview.html, /<script>/iu);
  assert.match(preview.html, /&lt;script&gt;/u);
  await testAndEnable(service, admin, "ORDER_READY");

  await service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { template: { ...saved.template, body: "Nieuwe tekst voor {{customer.name}}" } });
  await assert.rejects(service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { enabled: true }), (error) => error.code === "NOTIFICATION_TEST_REQUIRED");
});

test("productie blijft fail-closed zolang alleen capture en geen SMTP-acceptatie beschikbaar is", async (context) => {
  const { service, admin } = await fixture(context, "success", { requireSmtpForNotificationActivation: true });
  assert.equal((await service.bootstrap(admin.token)).capabilities.notificationDeliveryReady, false);
  assert.equal((await service.testNotification(admin.token, admin.csrfToken, "ORDER_READY", { recipient: "admin-test@example.nl" }, "notification-production-capture-test-0001")).status, "CAPTURED");
  await assert.rejects(service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { enabled: true }), (error) => error.code === "NOTIFICATION_TEST_REQUIRED");
});

test("ORDER_RECEIVED verstuurt exact eenmaal en testmail wijzigt geen ordercommunicatie", async (context) => {
  const { store, mailStore, service, admin, colleague } = await fixture(context);
  await testAndEnable(service, admin, "ORDER_RECEIVED");
  const beforeTestOrder = await createOrder(service, colleague, "notification-received-order-0001");
  const persisted = await store.read();
  assert.equal(persisted.orders.find(({ id }) => id === beforeTestOrder.id).communication.receipt.status, "CAPTURED");
  assert.equal((await mailStore.read()).attempts.filter(({ contextType }) => contextType === "order").length, 1);

  const duplicate = await service.createOrder(colleague.token, colleague.csrfToken, {
    customer: "Notification Klant", customerEmail: "notification-customer@example.nl", customerPhone: "06 12345678",
    standardPersonalization: { initials: "NK", name: "NOTIFICATION", backNumber: "34", shortsNumber: "34" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
  }, "notification-received-order-0001");
  assert.equal(duplicate.duplicate, true);
  assert.equal((await mailStore.read()).attempts.filter(({ contextType }) => contextType === "order").length, 1);

  const communicationSnapshot = structuredClone((await store.read()).orders.find(({ id }) => id === beforeTestOrder.id).communication);
  await service.testNotification(admin.token, admin.csrfToken, "ORDER_RECEIVED", { recipient: "second-test@example.nl" }, "notification-received-second-test-0001");
  assert.deepEqual((await store.read()).orders.find(({ id }) => id === beforeTestOrder.id).communication, communicationSnapshot);
});

test("ORDER_READY houdt Klaar intact bij ontbrekende ontvanger en delivery failure; retry bewaart historie", async (context) => {
  const { store, transport, service, admin, operator, colleague } = await fixture(context);
  await testAndEnable(service, admin, "ORDER_READY");
  const order = await createOrder(service, colleague, "notification-ready-order-0001");
  await store.mutate(async (state) => {
    const target = state.orders.find(({ id }) => id === order.id);
    target.stage = "PRINT"; target.customerEmail = ""; target.revision += 1;
    return { state, value: undefined };
  });
  let current = (await store.read()).orders.find(({ id }) => id === order.id);
  const missing = await service.advanceOrder(operator.token, operator.csrfToken, order.id, current.revision, "notification-ready-missing-0001");
  assert.equal(missing.value.stage, "DONE");
  current = (await store.read()).orders.find(({ id }) => id === order.id);
  assert.equal(current.stage, "DONE");
  assert.equal(current.communication.ready.status, "NOT_SENT");
  assert.equal(current.communication.ready.attentionCode, "MISSING_RECIPIENT");

  const failedOrder = await createOrder(service, colleague, "notification-ready-failure-order-0001");
  await store.mutate(async (state) => {
    const target = state.orders.find(({ id }) => id === failedOrder.id);
    target.stage = "PRINT"; target.revision += 1;
    return { state, value: undefined };
  });
  const successfulSend = transport.send.bind(transport);
  transport.send = async () => ({ outcome: "failed", code: "TRANSPORT_FAILED", confirmedNotSent: true, safeMessage: "Provider test failure." });
  current = (await store.read()).orders.find(({ id }) => id === failedOrder.id);
  await service.advanceOrder(operator.token, operator.csrfToken, failedOrder.id, current.revision, "notification-ready-failure-0001");
  let failedState = await store.read();
  current = failedState.orders.find(({ id }) => id === failedOrder.id);
  assert.equal(current.stage, "DONE");
  assert.equal(current.communication.ready.status, "FAILED");
  const failedExecution = failedState.notificationFoundation.executions.find(({ orderId, status }) => orderId === failedOrder.id && status === "DELIVERY_FAILED");
  assert.ok(failedExecution);

  transport.send = successfulSend;
  const retried = await service.retryOrderNotification(operator.token, operator.csrfToken, failedOrder.id, failedExecution.id, "notification-ready-retry-0001");
  assert.equal(retried.status, "CAPTURED");
  failedState = await store.read();
  assert.ok(failedState.notificationFoundation.executions.some(({ retryOf, status }) => retryOf === failedExecution.id && status === "CAPTURED"));
  assert.ok(failedState.notificationFoundation.executions.some(({ id, status }) => id === failedExecution.id && status === "DELIVERY_FAILED"));
});

test("productie-SMTP accepteert één gevalideerde transactionele ontvanger zonder controlled allowlist", () => {
  const template = createManagedSportpaleisOrderTemplate("ORDER_READY", {
    name: "Klaar", subject: "{{order.number}} klaar", heading: "Klaar", body: "Beste {{customer.name}}", buttonText: "", footerContact: "Sportpaleis", version: 1,
  });
  assert.equal(template.key, "ORDER_READY");
  assert.throws(() => createManagedSportpaleisOrderTemplate("ORDER_READY", { ...template, subject: "{{order.internalId}}" }), (error) => error.code === "TEMPLATE_RENDER_FAILED");
  const smtp = new AuthenticatedSmtpTransport({
    organizationId: "sportpaleis", host: "mail.hostingserver.nl", senderPolicy: "SPORTPALEIS_BEDRUKKING", senderAddress: "bedrukking@sportpaleis.nl",
    usernameProvider: () => "bedrukking@sportpaleis.nl", secretProvider: () => "fixture-only", allowAnyValidatedRecipient: true,
  });
  assert.doesNotThrow(() => smtp.validateMessage({ organizationId: "sportpaleis", senderPolicy: "SPORTPALEIS_BEDRUKKING", from: "Sportpaleis <bedrukking@sportpaleis.nl>", to: "customer@example.nl" }));
  assert.throws(() => smtp.validateMessage({ organizationId: "we-build-and-design", senderPolicy: "SPORTPALEIS_BEDRUKKING", from: "Sportpaleis <bedrukking@sportpaleis.nl>", to: "customer@example.nl" }), (error) => error.code === "PERMISSION_DENIED");

  const workspaceStore = { async read() { return {}; }, async mutate() { throw new Error("not used"); } };
  const production = createSportpaleisProductionMailFoundation({
    workspaceStore,
    environment: {
      SPORTPALEIS_MAIL_MODE: "PRODUCTION_SMTP",
      SPORTPALEIS_PRODUCTION_SMTP_ENABLED: "YES_EXPLICIT_PRODUCTION_APPROVAL",
      SPORTPALEIS_SMTP_BEDRUKKING_USERNAME: "bedrukking@sportpaleis.nl",
      SPORTPALEIS_SMTP_BEDRUKKING_PASSWORD: "fixture-only",
    },
  });
  const summary = production.transport.publicSummary({ senderPolicy: "SPORTPALEIS_BEDRUKKING" });
  assert.equal(summary.mode, "PRODUCTION_SMTP");
  assert.equal(summary.smtp.recipientPolicy, "SINGLE_TRANSACTIONAL_RECIPIENT");
  assert.equal(summary.smtp.credentialStatus, "PROVISIONED");
  assert.doesNotMatch(JSON.stringify(summary), /fixture-only/);
});

test("beheer-UI en HTTP-contract bevatten preview, test, toggle en serverroutes", async () => {
  const client = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  for (const proof of ["Klantcommunicatie", "Gegeven invoegen", "Testmail sturen", "toggle-notification", "ORDER_RECEIVED", "ORDER_READY"]) assert.match(client, new RegExp(proof));
  assert.match(server, /admin\\\/notifications/);
  assert.match(server, /retryOrderNotification/);
  assert.match(server, /assertRole\(user, \["admin"\]\)/);
});
