import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Test-Kevin-007B!veilig", patrick: "Test-Patrick-007B!veilig", collega: "Test-Collega-007B!veilig", "donovan-support": "Test-Support-007B!veilig" };

async function fixture(context, demoMode = false) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-007b-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-007B-20260807", allowedOrigin: "http://127.0.0.1", demoMode });
  await service.initialize();
  await store.mutate(async (state) => {
    for (const article of state.articles) article.validation = { status: "VALIDATED", source: "Test-only fixture", name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "VALIDATED", sizes: "VALIDATED", personalization: "VALIDATED" };
    for (const profile of state.productionProfiles.filter(({ id }) => id !== "profile-none")) { profile.placement = "Testpositie"; profile.referenceDistanceCm = 7; profile.rotationDeg = 0; profile.mirror = false; profile.validation = { status: "VALIDATED", source: "Test-only fixture", placement: "VALIDATED", referenceDistance: "VALIDATED", size: "VALIDATED", font: "VALIDATED", foilColor: "VALIDATED", rotation: "VALIDATED", mirror: "VALIDATED" }; }
    return { state, value: undefined };
  });
  return { store, service };
}

function orderPayload(overrides = {}) {
  return {
    customer: "Sanne de Boer", customerEmail: "sanne@example.nl", customerPhone: "06 12345678",
    standardPersonalization: { initials: "SB", initialsSemantic: { prefix: "Sanne", infix: "de", surname: "Boer" }, name: "DE BOER", backNumber: "23", shortsNumber: "" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
    ...overrides,
  };
}

test("Operational Review 007B — winkel, productie, beheer en barcodefoundation", async (context) => {
  const { store, service } = await fixture(context);
  const storeUser = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  const patrick = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const kevin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });

  await context.test("serverrollen leveren drie verschillende capability-profielen", async () => {
    const light = await service.bootstrap(storeUser.token); const production = await service.bootstrap(patrick.token); const admin = await service.bootstrap(kevin.token);
    assert.deepEqual({ admin: light.capabilities.admin, operator: light.capabilities.operator, store: light.capabilities.store }, { admin: false, operator: false, store: true });
    assert.deepEqual({ admin: production.capabilities.admin, operator: production.capabilities.operator, store: production.capabilities.store }, { admin: false, operator: true, store: false });
    assert.equal(admin.capabilities.admin, true);
    assert.equal(light.foilRolls.length, 0); assert.equal(production.foilRolls.length, 0); assert.equal(admin.foilRolls.length, 6);
    assert.equal(light.commercialAdministration, undefined); assert.equal(production.commercialAdministration, undefined);
    assert.equal(admin.commercialAdministration.seats.customerSeats, 3);
    assert.equal(admin.commercialAdministration.seats.activeCustomerSeats, 3);
    assert.equal(admin.commercialAdministration.seats.supportAccessOutsideSeats, true);
    assert.equal(admin.commercialAdministration.subscription.monthlyPriceEur, null);
    assert.deepEqual(admin.commercialAdministration.invoices.records, []);
  });

  let order;
  await context.test("winkel maakt zonder beloofdatum een valide order met fysieke contactvelden", async () => {
    order = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload(), "store-order-007b")).value;
    assert.equal(order.promisedAt, null); assert.equal(order.customerEmail, "sanne@example.nl"); assert.equal(order.customerPhone, "06 12345678");
    assert.equal(order.communication.receipt.status, "NOT_SENT"); assert.equal(order.communication.ready.status, "NOT_SENT");
    assert.deepEqual(order.barcode, { value: `SPW:${order.id}`, featureEnabled: false, hardwareValidated: false });
  });

  await context.test("drie identieke artikelen blijven één compacte groep", async () => {
    const grouped = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ items: [{ articleId: "sp-live-137294", size: "M", quantity: 3, deviation: false, overrides: {} }] }), "three-identical-007b")).value;
    assert.equal(grouped.totalPieces, 3); assert.equal(grouped.items.length, 1); assert.equal(grouped.items[0].quantity, 3); assert.equal(grouped.items[0].variants.length, 1);
  });

  await context.test("live artikelbeleid laat de commercieel optionele rugbedrukking leeg", async () => {
    const withoutPrint = await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ standardPersonalization: { initials: "SB", name: "", backNumber: "", shortsNumber: "" } }), "missing-required-007b");
    assert.equal(withoutPrint.value.items[0].personalization, "Geen bedrukking");
  });

  await context.test("mutually-exclusive shortbedrukking blokkeert twee gelijktijdige keuzes", async () => {
    await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ standardPersonalization: { initials: "SB", name: "", backNumber: "", shortsNumber: "23" }, items: [{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: true, overrides: { initials: "SB", shortsNumber: "23" } }] }), "short-xor-007b"), (error) => error.code === "ARTICLE_PERSONALIZATION_NOT_ALLOWED");
  });

  await context.test("gegroepeerde varianten bewaren maat, aantal, afwijking en semantische initialen", async () => {
    const variantOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ items: [{ articleId: "sp-live-137294", variants: [
      { id: "a", size: "M", quantity: 2, deviation: false, overrides: {} },
      { id: "b", size: "XL", quantity: 1, deviation: true, overrides: { backNumber: "14" } },
    ] }] }), "variants-007b")).value;
    assert.equal(variantOrder.totalPieces, 3); assert.equal(variantOrder.items[0].size, "Meerdere maten"); assert.equal(variantOrder.items[0].variants.length, 2);
    assert.match(variantOrder.items[0].variants[1].personalization, /Rug 14/);
    assert.equal(variantOrder.standardPersonalization.initialsSemantic, null);
    assert.equal(variantOrder.standardPersonalization.initials, "SB");
  });

  await context.test("notitie, aandacht en prioriteitsuitzondering zijn geaudit", async () => {
    const priorityOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ internalNote: "Klant vóór wedstrijd terugbellen.", noteKind: "attention", priority: { enabled: true, requestedBy: "Winkelmedewerker", alignedWith: "Patrick", reason: "event", explanation: "Wedstrijd zaterdag" } }), "priority-007b")).value;
    assert.equal(priorityOrder.notes[0].authorName, "Winkelmedewerker"); assert.equal(priorityOrder.notes[0].scope, "order"); assert.equal(priorityOrder.notes[0].kind, "attention");
    assert.equal(priorityOrder.priority.alignedWith, "Patrick"); assert.equal(priorityOrder.priority.reason, "event"); assert.match(priorityOrder.attention, /Prioriteitsuitzondering/);
  });

  await context.test("bounce wordt een duidelijke Attention zonder mail te verzenden", async () => {
    const bounceOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload(), "bounce-order-007b")).value;
    const bounced = await service.recordCommunicationStatus(patrick.token, patrick.csrfToken, bounceOrder.id, { channel: "receipt", status: "BOUNCED" }, bounceOrder.revision);
    assert.equal(bounced.communication.receipt.status, "BOUNCED"); assert.equal(bounced.attention, "E-mail niet bezorgd — klant bellen"); assert.equal(bounced.eventHistory.at(-1).type, "COMMUNICATION_BOUNCED");
  });

  await context.test("winkel wijzigt vóór controle en wordt daarna server-side vergrendeld", async () => {
    const changed = await service.updateOrder(storeUser.token, storeUser.csrfToken, order.id, { customerPhone: "06 87654321" }, order.revision);
    assert.equal(changed.customerPhone, "06 87654321");
    const controlled = (await service.advanceOrder(patrick.token, patrick.csrfToken, order.id, changed.revision, "control-007b")).value;
    await assert.rejects(service.updateOrder(storeUser.token, storeUser.csrfToken, order.id, { customer: "Niet toegestaan" }, controlled.revision), (error) => error.code === "ORDER_LOCKED_FOR_STORE");
    await assert.rejects(service.advanceOrder(storeUser.token, storeUser.csrfToken, order.id, controlled.revision, "store-advance-007b"), (error) => error.code === "FORBIDDEN");
  });

  await context.test("bulkstatus is atomair en respecteert een volledige kleurblokkade", async () => {
    await store.mutate(async (state) => { state.productionProfiles.find(({ id }) => id === "profile-source-a-s-c-waterwijk-backNumber").foilColor = "Rood"; return { state, value: undefined }; });
    const blocked = (await service.createOrder(patrick.token, patrick.csrfToken, orderPayload({ items: [{ articleId: "sp-live-137293", size: "L", quantity: 1, deviation: false, overrides: {} }] }), "red-only-007b")).value;
    const control = (await service.advanceOrder(patrick.token, patrick.csrfToken, blocked.id, blocked.revision, "red-control-007b")).value;
    await assert.rejects(service.bulkAdvanceOrders(patrick.token, patrick.csrfToken, { orders: [{ id: control.id, expectedRevision: control.revision }] }, "red-bulk-007b"), (error) => error.code === "COLOR_HOLD");
    assert.equal((await service.bootstrap(patrick.token)).orders.find(({ id }) => id === control.id).stage, "CONTROL");
  });

  await context.test("Patrick en winkelmedewerker blijven server-side buiten beheer", async () => {
    await assert.rejects(service.updateFoilRoll(patrick.token, patrick.csrfToken, "foil-white", { purchasePriceEur: 50 }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(service.updateArticle(storeUser.token, storeUser.csrfToken, "sp-live-137294", { active: false }), (error) => error.code === "FORBIDDEN");
    const before = (await service.bootstrap(kevin.token)).articles.find(({ id }) => id === "sp-live-137294");
    const article = await service.updateArticle(kevin.token, kevin.csrfToken, "sp-live-137294", { expectedRevision: before.revision, association: "A.S.C. Waterwijk" });
    assert.equal(article.association, "A.S.C. Waterwijk");
  });

  await context.test("afhalen is een aparte gebeurtenis na gereedmelden", async () => {
    const done = (await service.bootstrap(storeUser.token)).orders.find(({ stage }) => stage === "DONE");
    const pickupReady = (await service.recordOperationalEvent(storeUser.token, storeUser.csrfToken, done.id, { action: "READY_FOR_PICKUP", expectedRevision: done.revision }, "review-007b-ready-for-pickup")).value;
    const picked = await service.confirmPickup(storeUser.token, storeUser.csrfToken, pickupReady.id, {}, pickupReady.revision);
    assert.ok(pickupReady.eventHistory.some(({ type }) => type === "READY_FOR_PICKUP"));
    assert.equal(picked.pickup.status, "PICKED_UP"); assert.equal(picked.eventHistory.at(-1).type, "PICKED_UP");
  });

  await context.test("barcode blijft uit en alleen expliciete lokale emulatie kan lezen", async () => {
    await assert.rejects(service.resolveBarcode(storeUser.token, { value: `SPW:${order.id}`, emulate: true }), (error) => error.code === "BARCODE_DISABLED");
    const demo = await fixture(context, true); const demoStore = await demo.service.demoLogin("store"); const demoOrder = (await demo.service.bootstrap(demoStore.token)).orders[0];
    const resolved = await demo.service.resolveBarcode(demoStore.token, { value: demoOrder.barcode?.value ?? demoOrder.id, emulate: true });
    assert.equal(resolved.emulated, true); assert.equal(resolved.hardwareValidated, false);
  });

  await context.test("UI-bron borgt winkelzoekvelden, vaste rolgrens en review release", async () => {
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
    const serviceSource = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
    assert.match(source, /SPW-007B-20260807/); assert.match(source, /placeholder="Zoek order"/);
    assert.match(source, /Deze pagina hoort niet bij de winkelrol/); assert.doesNotMatch(source, /Keyboard-wedge datamodel voorbereid/);
    assert.match(source, /Winkelmedewerker/); assert.match(source, /Patrick · Productie/); assert.match(source, /Kevin · Beheer/);
  assert.match(source, /WBD & commercieel/);
  assert.match(source, /beheer\/commercieel/);
  assert.match(serviceSource, /Geen factuurbron aangesloten/);
  assert.match(source, /Er worden geen bedragen, factuurnummers of documenten gesimuleerd/);
  assert.match(source, /render\(\{ preserveScroll: true, focusArticleId: id \}\)/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(source, /data-order-count/);
  assert.match(source, /visible === 1 \? "order" : "orders"/);
  });
});
