import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Optional-Email-Admin-001!",
  patrick: "Optional-Email-Operator-001!",
  collega: "Optional-Email-Store-001!",
  "donovan-support": "Optional-Email-Support-001!",
};

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-optional-email-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(root, "captures") }),
  });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", releaseId: "SPW-OPTIONAL-EMAIL-001", mailMode: "capture" });
  await service.initialize();
  return {
    store,
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

const individualPayload = (customerEmail = "") => ({
  orderKind: "INDIVIDUAL",
  customer: "Klant zonder e-mail",
  customerEmail,
  customerPhone: "06 12345678",
  standardPersonalization: { initials: "KE", name: "KLANT", backNumber: "34", backNumberSizeClass: "SENIOR", shortsNumber: "34" },
  items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
});

test("Bedrukken bewaart en verwerkt een order zonder e-mailadres", async (context) => {
  const { service, storeUser, operator } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload(), "optional-email-individual-0001")).value;
  assert.equal(created.customerEmail, "");
  assert.equal(created.stage, "ORDER");
  assert.doesNotMatch(JSON.stringify(created), /sportpaleis\.invalid|dummy/iu);

  const reopened = (await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === created.id);
  assert.equal(reopened.customerEmail, "");
  assert.equal(reopened.attention?.includes("mail") ?? false, false);
  const advanced = await service.advanceOrder(operator.token, operator.csrfToken, created.id, reopened.revision, "optional-email-control-0001");
  assert.equal(advanced.value.stage, "CONTROL");

  await assert.rejects(
    service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload("geen-geldig-adres"), "optional-email-invalid-0001"),
    (error) => error.code === "INVALID_EMAIL",
  );
});

test("bestaande orders kunnen hun e-mailadres leeg bewaren en blijven bruikbaar", async (context) => {
  const { service, storeUser, operator } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload("bestaand@example.nl"), "optional-email-existing-0001")).value;
  const updated = await service.updateOrder(storeUser.token, storeUser.csrfToken, created.id, { customerEmail: "" }, created.revision);
  assert.equal(updated.customerEmail, "");
  assert.equal(updated.customerPhone, "06 12345678");
  assert.equal(updated.customer, "Klant zonder e-mail");
  const advanced = await service.advanceOrder(operator.token, operator.csrfToken, updated.id, updated.revision, "optional-email-existing-control-0001");
  assert.equal(advanced.value.stage, "CONTROL");
});

test("Teamorder houdt alle contactvelden optioneel", async (context) => {
  const { service, storeUser } = await fixture(context);
  const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "TEAM",
    customer: "",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-137294", variants: [{ participantName: "Speler Eén", size: "", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" } }] }],
  }, "optional-email-team-0001")).value;
  assert.equal(created.customerEmail, "");
  assert.equal(created.customerPhone, "");
  assert.match(created.customer, /^Teamorder/u);
});

test("alleen een geactiveerde e-mailactie meldt MISSING_RECIPIENT en Klaar blijft intact", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);
  await service.testNotification(admin.token, admin.csrfToken, "ORDER_READY", { recipient: "beheer-test@example.nl" }, "optional-email-ready-test-0001");
  await service.updateNotificationConfig(admin.token, admin.csrfToken, "ORDER_READY", { enabled: true });
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload(), "optional-email-ready-order-0001")).value;
  await store.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === created.id);
    order.stage = "PRINT";
    order.revision += 1;
    return { state, value: undefined };
  });
  const beforeReady = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  const ready = await service.advanceOrder(operator.token, operator.csrfToken, created.id, beforeReady.revision, "optional-email-ready-0001");
  assert.equal(ready.value.stage, "DONE");
  const persisted = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  assert.equal(persisted.stage, "DONE");
  assert.equal(persisted.communication.ready.status, "NOT_SENT");
  assert.equal(persisted.communication.ready.attentionCode, "MISSING_RECIPIENT");
});

test("relevante beheerformulieren markeren klant-e-mail als optioneel", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  const bedrukken = section("function newOrder", "function profileDetails");
  const teamorder = section("function teamOrderProductionFirst", "function teamOrder(");
  const custom = section("function customOrder", "function productionFontFamily");
  const free = section("function freePrintingOrder", "function productionFonts");
  const orderDetail = section("function orderDetail", "function production(");
  for (const form of [bedrukken, teamorder, custom, free, orderDetail]) {
    assert.match(form, /E-mail \(optioneel\)/u);
    assert.doesNotMatch(form, /name="customerEmail"[^>]*\brequired\b/u);
  }
});
