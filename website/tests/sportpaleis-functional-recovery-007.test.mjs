import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Test-Kevin-007!veilig", patrick: "Test-Patrick-007!veilig", collega: "Test-Collega-007!veilig", "donovan-support": "Test-Support-007!veilig" };

async function fixture(context, demoMode = false) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-007-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-007-TEST", allowedOrigin: "http://127.0.0.1", demoMode });
  await service.initialize();
  await store.mutate(async (state) => {
    for (const article of state.articles) article.validation = { status: "VALIDATED", source: "Test-only fixture", name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "VALIDATED", sizes: "VALIDATED", personalization: "VALIDATED" };
    for (const profile of state.productionProfiles.filter(({ id }) => id !== "profile-none")) { profile.placement = "Testpositie"; profile.referenceDistanceCm = 7; profile.rotationDeg = 0; profile.mirror = false; profile.instruction = "Test-only: 8 cm onder de kraag"; profile.validation = { status: "VALIDATED", source: "Test-only fixture", placement: "VALIDATED", referenceDistance: "VALIDATED", size: "VALIDATED", font: "VALIDATED", foilColor: "VALIDATED", rotation: "VALIDATED", mirror: "VALIDATED" }; }
    return { state, value: undefined };
  });
  return { store, service };
}

test("Functional Recovery 007 — snelle flow, personalisatie en rollen", async (context) => {
  const { store, service } = await fixture(context);
  const patrick = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const kevin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });

  await context.test("ongeldig e-mailadres wordt server-side geweigerd", async () => {
    await assert.rejects(service.createOrder(patrick.token, patrick.csrfToken, {
      customer: "Testklant", customerEmail: "geen-email", customerPhone: "06 12345678", promisedAt: "2026-08-12T15:00:00Z",
      standardPersonalization: { initials: "TT", name: "TEST", backNumber: "23", shortsNumber: "23" },
      items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
    }, "invalid-email-007-key"), (error) => error.code === "INVALID_EMAIL");
  });

  await store.mutate(async (state) => {
    state.articles.find(({ id }) => id === "sp-live-140218").association = "Buitenhout MHC";
    state.productionProfiles.find(({ id }) => id === "profile-keeper").foilColor = "Rood";
    return { state, value: undefined };
  });

  let order;
  await context.test("orderbrede defaults, itemafwijking, beelden en meerdere verenigingen", async () => {
    order = (await service.createOrder(patrick.token, patrick.csrfToken, {
      customer: "Sanne de Boer", customerEmail: "sanne@example.nl", customerPhone: "06 12345678", promisedAt: "2026-08-12T15:00:00Z",
      standardPersonalization: { initials: "SB", name: "DE BOER", backNumber: "23", shortsNumber: "23" },
      items: [
        { articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} },
        { articleId: "sp-live-140218", size: "M", quantity: 1, deviation: false, overrides: {} },
        { articleId: "sp-live-137293", size: "XL", quantity: 1, deviation: true, overrides: { backNumber: "14" } },
      ],
    }, "complete-order-007-key")).value;
    assert.equal(order.association, "Meerdere verenigingen");
    assert.deepEqual(order.associations.sort(), ["A.S.C. Waterwijk", "Buitenhout MHC"]);
    assert.match(order.items[0].personalization, /Rug 23/);
    assert.match(order.items[2].personalization, /Rug 14/);
    assert.equal(order.items[2].deviation, true);
    assert.equal(order.items[0].articleNumber, "137294");
    assert.equal(order.items[0].imageKey, "sp-live-137294");
    assert.deepEqual(order.foilStates, [{ color: "Wit", status: "READY" }, { color: "Rood", status: "HOLD" }]);
    assert.match(order.items[0].productionInstruction, /kraag/);
  });

  await context.test("bulkactie gebruikt revisies en is idempotent", async () => {
    const first = await service.bulkAdvanceOrders(patrick.token, patrick.csrfToken, { orders: [{ id: order.id, expectedRevision: 1 }] }, "bulk-advance-007-key");
    const duplicate = await service.bulkAdvanceOrders(patrick.token, patrick.csrfToken, { orders: [{ id: order.id, expectedRevision: 1 }] }, "bulk-advance-007-key");
    assert.equal(first.value[0].stage, "CONTROL");
    assert.equal(duplicate.duplicate, true);
  });

  await context.test("gecontroleerde voorkeuren zijn per gebruiker duurzaam", async () => {
    const saved = await service.savePreferences(patrick.token, patrick.csrfToken, { view: "compact", density: "compact", optionalPanels: { recent: false, shortcuts: true }, panelOrder: ["production", "attention", "shortcuts", "recent"], orderColumns: ["customer", "foilColors", "articles", "status"], orderDensity: "compact", productionPanels: ["batch", "fallback", "guidance"] });
    assert.deepEqual(saved.orderColumns, ["customer", "foilColors", "articles", "status"]);
    assert.deepEqual(saved.panelOrder, ["production", "attention", "shortcuts", "recent"]);
    assert.deepEqual(saved.productionPanels, ["batch", "fallback", "guidance"]);
    const operator = await service.bootstrap(patrick.token);
    const admin = await service.bootstrap(kevin.token);
    assert.equal(operator.preferences.patrick.view, "compact");
    assert.equal(admin.preferences.kevin.view, "focus");
    await assert.rejects(service.savePreferences(patrick.token, patrick.csrfToken, { ...saved, orderColumns: ["articles", "status"] }), (error) => error.code === "MANDATORY_COLUMNS");
  });

  await context.test("financiële data en beheerwijzigingen blijven admin-only", async () => {
    assert.deepEqual((await service.bootstrap(patrick.token)).foilRolls, []);
    assert.equal((await service.bootstrap(kevin.token)).foilRolls.length, 2);
    await assert.rejects(service.updateFoilRoll(patrick.token, patrick.csrfToken, "foil-white", { purchasePriceEur: 50 }), (error) => error.code === "FORBIDDEN");
  });

  await context.test("hardware-send blijft hard uit", async () => {
    assert.equal((await service.health()).hardwareSendEnabled, false);
    assert.equal((await service.bootstrap(patrick.token)).capabilities.hardwareSendEnabled, false);
  });
});

test("demo-login bestaat uitsluitend wanneer lokale review hem expliciet activeert", async (context) => {
  const disabled = await fixture(context, false);
  await assert.rejects(disabled.service.demoLogin("admin"), (error) => error.code === "DEMO_DISABLED");
  const enabled = await fixture(context, true);
  const demo = await enabled.service.demoLogin("operator");
  assert.equal(demo.user.name, "Patrick Demo");
  assert.equal(demo.user.role, "operator");
  assert.equal((await enabled.service.bootstrap(demo.token)).capabilities.demo, true);
});
