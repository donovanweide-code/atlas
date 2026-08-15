import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService, migrateSportpaleisPilotState } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { mariaDbRowsToOrder, orderToMariaDbRows } from "../sportpaleis-server/pilot-persistence-mapping.mjs";

const passwords = { kevin: "Pilot-Kevin-001!veilig", patrick: "Pilot-Patrick-001!veilig", collega: "Pilot-Collega-001!veilig", "donovan-support": "Pilot-Support-001!veilig" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-pilot-001-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "captures") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, releaseId: "SPW-BEDRUKKING-PILOT-001-20260809", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  await store.mutate(async (state) => {
    for (const article of state.articles) article.validation = { status: "VALIDATED", source: "Test-only fixture", name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "VALIDATED", sizes: "VALIDATED", personalization: "VALIDATED" };
    for (const profile of state.productionProfiles.filter(({ id }) => id !== "profile-none")) { profile.placement = "Testpositie"; profile.referenceDistanceCm = 7; profile.rotationDeg = 0; profile.mirror = false; profile.validation = { status: "VALIDATED", source: "Test-only fixture", placement: "VALIDATED", referenceDistance: "VALIDATED", size: "VALIDATED", font: "VALIDATED", foilColor: "VALIDATED", rotation: "VALIDATED", mirror: "VALIDATED" }; }
    return { state, value: undefined };
  });
  return {
    root, store, service,
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
    patrick: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    support: await service.login({ email: "support@webuildanddesign.nl", password: passwords["donovan-support"] }),
  };
}

function individualPayload(overrides = {}) {
  return {
    orderKind: "INDIVIDUAL",
    customer: "Pilot Klant", customerEmail: "pilot@example.nl", customerPhone: "06 12345678",
    standardPersonalization: { initials: "PK", name: "PILOT", backNumber: "10", backNumberSizeClass: "SENIOR", shortsNumber: "" },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
    ...overrides,
  };
}

test("Sportpaleis Bedrukking minimal pilot 001", async (context) => {
  const { root, store, service, storeUser, patrick, support } = await fixture(context);

  await context.test("Junior/Senior is verborgen semantiek zonder rugnummer en verplicht bij een individuele rugnummerorder", async () => {
    const withoutBackNumber = await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({
      standardPersonalization: { initials: "PK", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
      items: [{ articleId: "sp-live-140226", size: "M", quantity: 1, deviation: false, overrides: {} }],
    }), "pilot-no-back-number");
    assert.equal(withoutBackNumber.value.standardPersonalization.backNumberSizeClass, "");
    await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({
      standardPersonalization: { initials: "PK", name: "", backNumber: "10", backNumberSizeClass: "", shortsNumber: "" },
    }), "pilot-missing-size-class"), (error) => error.code === "BACK_NUMBER_SIZE_CLASS_REQUIRED");
    await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({
      standardPersonalization: { initials: "PK", name: "", backNumber: "", backNumberSizeClass: "JUNIOR", shortsNumber: "" },
      items: [{ articleId: "sp-live-140226", size: "M", quantity: 1, deviation: false, overrides: {} }],
    }), "pilot-size-class-without-number"), (error) => error.code === "BACK_NUMBER_SIZE_CLASS_NOT_APPLICABLE");
  });

  let order;
  await context.test("Senior erft orderbreed en vertaalt naar de verenigingsspecifieke bronconfiguratie", async () => {
    order = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload(), "pilot-senior-order")).value;
    assert.equal(order.orderKind, "INDIVIDUAL");
    assert.equal(order.items[0].personalizationValues.backNumberSizeClass, "SENIOR");
    assert.deepEqual(order.items[0].backNumberProduction, { sizeClass: "SENIOR", physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" });
    assert.match(order.items[0].personalization, /Rug 10 \(Senior\)/);
  });

  await context.test("artikeloverride bewaart Junior apart en laat kledingmaat de productieklasse niet overschrijven", async () => {
    const junior = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({ items: [{ articleId: "sp-live-137294", variants: [
      { id: "standard", size: "M", quantity: 1, deviation: false, overrides: {} },
      { id: "junior", size: "S", quantity: 1, deviation: true, overrides: { initials: "", name: "", backNumber: "14", backNumberSizeClass: "JUNIOR", shortsNumber: "" } },
    ] }] }), "pilot-junior-override")).value;
    assert.equal(junior.items[0].variants[0].backNumberProduction.status, "SOURCE_CONFIGURED");
    assert.equal(junior.items[0].variants[1].backNumberProduction.status, "VALIDATED");
    assert.equal(junior.items[0].variants[1].backNumberProduction.physicalHeightMm, 200);
  });

  await context.test("ontvangstcommunicatie blokkeert de orderflow nooit", async () => {
    const beforeAdvance = (await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === order.id);
    assert.equal(beforeAdvance.communication.receipt.status, "NOT_SENT");
    const advanced = await service.advanceOrder(patrick.token, patrick.csrfToken, order.id, beforeAdvance.revision, "pilot-without-receipt");
    assert.equal(advanced.value.stage, "CONTROL");
    assert.equal(advanced.value.communication.receipt.status, "NOT_SENT");
  });

  await context.test("bekende mailfout is herstelbaar, unknown outcome blokkeert iedere automatische retry en duplicates blijven idempotent", async () => {
    const failedOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({ customer: "Mail Failure" }), "pilot-mail-failure-order")).value;
    const failed = await service.captureOrderMail(storeUser.token, storeUser.csrfToken, failedOrder.id, { templateKey: "ORDER_RECEIVED", simulation: "failure" }, "pilot-mail-failure");
    assert.notEqual(failed.status, "CAPTURED");
    assert.equal((await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === failedOrder.id).communication.receipt.status, "FAILED");
    const recovered = await service.captureOrderMail(storeUser.token, storeUser.csrfToken, failedOrder.id, { templateKey: "ORDER_RECEIVED", simulation: "success" }, "pilot-mail-recovery");
    assert.equal(recovered.status, "CAPTURED");
    const duplicate = await service.captureOrderMail(storeUser.token, storeUser.csrfToken, failedOrder.id, { templateKey: "ORDER_RECEIVED", simulation: "success" }, "pilot-mail-recovery");
    assert.equal(duplicate.duplicate, true);

    const unknownOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({ customer: "Mail Unknown" }), "pilot-mail-unknown-order")).value;
    const unknown = await service.captureOrderMail(storeUser.token, storeUser.csrfToken, unknownOrder.id, { templateKey: "ORDER_RECEIVED", simulation: "unknown" }, "pilot-mail-unknown");
    assert.equal(unknown.status, "UNKNOWN_PARTIAL_SEND");
    assert.equal((await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === unknownOrder.id).communication.receipt.status, "UNKNOWN");
    await assert.rejects(service.captureOrderMail(storeUser.token, storeUser.csrfToken, unknownOrder.id, { templateKey: "ORDER_RECEIVED" }, "pilot-mail-unknown-retry"), (error) => error.code === "UNKNOWN_SEND_REQUIRES_HUMAN_REVIEW");
  });

  await context.test("inhoudscorrectie mag alleen in ORDER en gebruikt revision, audit en authorization", async () => {
    const correctionOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, individualPayload({ customer: "Correctie Klant" }), "pilot-correction-order")).value;
    const corrected = await service.updateOrder(storeUser.token, storeUser.csrfToken, correctionOrder.id, {
      standardPersonalization: { ...correctionOrder.standardPersonalization, backNumber: "34", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-137294", size: "L", quantity: 2, deviation: false, overrides: {} }],
    }, correctionOrder.revision);
    assert.equal(corrected.totalPieces, 2); assert.match(corrected.items[0].personalization, /Rug 34/);
    await assert.rejects(service.updateOrder(storeUser.token, storeUser.csrfToken, correctionOrder.id, { customerPhone: "06 00000000" }, correctionOrder.revision), (error) => error.code === "REVISION_CONFLICT");
    await assert.rejects(service.updateOrder(support.token, support.csrfToken, correctionOrder.id, { customerPhone: "06 00000000" }, corrected.revision), (error) => error.code === "FORBIDDEN");
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, correctionOrder.id, { templateKey: "ORDER_RECEIVED" }, "pilot-correction-receipt");
    const readyForControl = (await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === correctionOrder.id);
    const controlled = (await service.advanceOrder(patrick.token, patrick.csrfToken, correctionOrder.id, readyForControl.revision, "pilot-correction-control")).value;
    await assert.rejects(service.updateOrder(patrick.token, patrick.csrfToken, correctionOrder.id, {
      standardPersonalization: corrected.standardPersonalization, items: [{ articleId: "sp-live-137294", size: "XL", quantity: 1, deviation: false, overrides: {} }], correctionReason: "Test",
    }, controlled.revision), (error) => error.code === "ORDER_CONTENT_LOCKED");
    const persisted = await store.read();
    assert.ok(persisted.audit.some(({ action, subject, details }) => action === "Order gewijzigd" && subject === correctionOrder.id && details.contentChanged === true));
  });

  await context.test("schema-1 migratie en MariaDB mapping bewaren bestaande data zonder Junior/Senior te gokken", async () => {
    const migrated = migrateSportpaleisPilotState({ schemaVersion: 1, organizationId: "sport-2000-sportpaleis-bv", orders: [{ id: "LEGACY-1", revision: 1, customer: "Bestaand", customerEmail: "bestaand@example.nl", association: "A.S.C. Waterwijk", createdAt: "2026-08-01T00:00:00.000Z", stage: "ORDER", owner: "Patrick", totalPieces: 1, standardPersonalization: { initials: "", name: "", backNumber: "9", shortsNumber: "" }, items: [] }], users: [], audit: [] });
    assert.equal(migrated.schemaVersion, 12); assert.equal(migrated.orders[0].standardPersonalization.backNumberSizeClass, "");
    assert.equal(migrated.orders[0].communication.requiredForIndividualOrder, false); assert.match(migrated.migrationWarnings[0], /geen gevalideerde/);

    const latest = (await service.bootstrap(storeUser.token)).orders.find(({ id }) => id === order.id);
    const rows = orderToMariaDbRows(latest);
    const roundTrip = mariaDbRowsToOrder({ ...rows.order, owner: latest.owner }, rows.items, rows.variants);
    assert.equal(roundTrip.id, latest.id); assert.deepEqual(roundTrip.standardPersonalization, latest.standardPersonalization);
    assert.deepEqual(roundTrip.items[0].backNumberProduction, latest.items[0].backNumberProduction);

    const restarted = new SportpaleisFileStore({ filePath: store.filePath, backupDirectory: path.join(root, "backups"), seedPasswords: undefined });
    await restarted.initialize(); assert.equal((await restarted.read()).schemaVersion, 12);
  });

  await context.test("UI en schema borgen rode afwijking, 390px, focusbehoud, release en reproduceerbare migratie", async () => {
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
    const schema = await readFile(new URL("../sportpaleis-server/schema.mysql.sql", import.meta.url), "utf8");
    const migration = await readFile(new URL("../sportpaleis-server/migrations/008a-to-pilot-001.sql", import.meta.url), "utf8");
    assert.match(source, /SPW-LIVE-PILOT-CORRECTION-001-20260810/); assert.match(source, /Junior of senior/); assert.match(source, /preventScroll: true/);
    assert.match(source, /const draftOrderMeta = emptyOrderMeta\(\)/); assert.match(source, /editing\?\.customer \?\? draftOrderMeta\.customer/);
    assert.match(styles, /\.sp-selected-item\.has-deviation[^}]+var\(--sp-red\)/s); assert.match(styles, /390px|390 px/); assert.doesNotMatch(styles, /has-deviation[^}]+#d59b00/s);
    assert.match(schema, /back_number_size_classes_json/); assert.match(schema, /communication_json/); assert.match(schema, /sp_order_item_variants/);
    assert.match(migration, /orders_before/); assert.match(migration, /orders_after/); assert.match(migration, /productionExecuted', FALSE/);
  });
});
