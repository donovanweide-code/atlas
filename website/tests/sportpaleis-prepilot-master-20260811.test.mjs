import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { parseSportpaleisMailbatchExport, SportpaleisFileStore, SportpaleisPilotService, sportpaleisProductionInventoryView } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Prepilot-Kevin-2026!", patrick: "Prepilot-Patrick-2026!", collega: "Prepilot-Store-2026!", "donovan-support": "Prepilot-Support-2026!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-prepilot-master-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PRE-PILOT-MASTER-CORRECTION-20260811", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function orderPayload(overrides = {}) {
  return { orderKind: "INDIVIDUAL", customer: "Fictieve pilotklant", customerEmail: "pilot@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "34", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }], ...overrides };
}

test("PRE-PILOT MASTER — organisatie, sessies, operatie en intake", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);

  await context.test("serverrechten en dagelijkse werkcontext zijn afzonderlijk en rolbegrensd", async () => {
    const view = await service.bootstrap(admin.token);
    assert.deepEqual(view.currentUser.workContexts, ["ORGANISATION", "STORE", "WEBSHOP", "PRODUCTION", "ALL"]);
    assert.equal(view.currentUser.defaultContext, "ORGANISATION");
    const updated = await service.updateUser(admin.token, admin.csrfToken, "patrick", { workContexts: ["PRODUCTION", "STORE", "ALL"], defaultContext: "PRODUCTION" });
    assert.equal(updated.role, "operator");
    assert.equal(updated.defaultContext, "PRODUCTION");
    await assert.rejects(service.updateUser(admin.token, admin.csrfToken, "patrick", { workContexts: ["WEBSHOP"] }), (error) => error.code === "WORK_CONTEXT_FORBIDDEN");
  });

  await context.test("persoonlijk en gedeeld apparaat krijgen verschillende sessiegrenzen", async () => {
    const now = new Date("2026-08-11T10:00:00.000Z");
    const shared = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega, deviceMode: "SHARED", now });
    const personal = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick, deviceMode: "PERSONAL", now });
    assert.equal(new Date(shared.expiresAt).getTime() - now.getTime(), 8 * 60 * 60 * 1000);
    assert.equal(new Date(personal.expiresAt).getTime() - now.getTime(), 30 * 24 * 60 * 60 * 1000);
  });

  await context.test("snelle gebruikerswissel herauthenticeert en bewaart de echte actor in audit", async () => {
    const switched = await service.fastSwitch(admin.token, admin.csrfToken, { targetUserId: "patrick", password: passwords.patrick, deviceMode: "SHARED" });
    assert.equal(switched.user.id, "patrick");
    const state = await store.read();
    assert.ok(state.audit.some(({ userId, action, subject }) => userId === "kevin" && action === "Gebruiker gewisseld" && subject === "patrick"));
    assert.ok(state.audit.some(({ userId, action }) => userId === "patrick" && action === "Ingelogd via snelle wissel"));
  });

  await context.test("orderactor, verkooptoerekening, bron, betaling en levering blijven losse feiten", async () => {
    const currentAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
    await service.updateUser(currentAdmin.token, currentAdmin.csrfToken, "kevin", { salesNumber: "705" });
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ salesNumber: "705", deliveryMode: "DELIVERY", deliveryAddress: { postalCode: "1315 XC", houseNumber: "1", houseNumberSuffix: "", street: "Fictieve straat", city: "Almere", lookupStatus: "MANUAL_FALLBACK" } }), "prepilot-order-separate-facts")).value;
    assert.equal(created.acceptedBy.userId, "collega");
    assert.deepEqual({ number: created.salesAttribution.salesNumber, label: created.salesAttribution.label }, { number: "705", label: "Kevin" });
    assert.equal(created.sourceContext.transactionalAuthority, "WORKSPACE");
    assert.equal(created.payment.status, "UNKNOWN");
    assert.deepEqual({ mode: created.fulfillment.mode, status: created.fulfillment.status, fee: created.fulfillment.feeEur }, { mode: "DELIVERY", status: "PENDING", fee: 3.95 });
  });

  await context.test("contextuele acties registreren actor/tijd en maken betaald niet gelijk aan opgehaald", async () => {
    const activeAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
    const individual = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload(), "prepilot-operation-individual")).value;
    await assert.rejects(service.recordOperationalEvent(storeUser.token, storeUser.csrfToken, individual.id, { action: "PAID", expectedRevision: individual.revision }, "prepilot-paid-individual"), (error) => error.code === "PAYMENT_ACTION_NOT_AVAILABLE");
    await assert.rejects(service.recordOperationalEvent(storeUser.token, storeUser.csrfToken, individual.id, { action: "PICKED_UP", expectedRevision: individual.revision }, "prepilot-early-pickup"), (error) => error.code === "ORDER_NOT_READY");
    let created = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({
      orderKind: "TEAM",
      standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
      productionLines: [{ id: "prepilot-team-back", type: "NUMBER", content: "2", previewLabel: "Rugnummer 2", widthMm: 100, heightMm: 200, quantity: 1, sourceId: (await service.bootstrap(activeAdmin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID").id }],
    }), "prepilot-operation-team")).value;
    await store.mutate(async (state) => { const order = state.orders.find(({ id }) => id === created.id); order.communication.receipt.status = "CAPTURED"; return { state, value: undefined }; });
    created = (await service.advanceOrder(activeAdmin.token, activeAdmin.csrfToken, created.id, created.revision, "prepilot-team-control")).value;
    const proposal = (await service.createProductionProposal(activeAdmin.token, activeAdmin.csrfToken, { orders: [{ id: created.id, expectedRevision: created.revision }] }, "prepilot-team-proposal")).value;
    const group = proposal.groups[0];
    const job = (await service.createProductionJob(activeAdmin.token, activeAdmin.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "prepilot-team-job")).value;
    await service.completeProductionJob(activeAdmin.token, activeAdmin.csrfToken, job.id, "prepilot-team-printed");
    created = (await service.bootstrap(activeAdmin.token)).orders.find(({ id }) => id === created.id);
    created = (await service.completeProductionOrders(activeAdmin.token, activeAdmin.csrfToken, { orders: [{ id: created.id, expectedRevision: created.revision }] }, "prepilot-team-ready")).value.completed[0];
    const paid = (await service.recordOperationalEvent(storeUser.token, storeUser.csrfToken, created.id, { action: "PAID", expectedRevision: created.revision }, "prepilot-paid-event")).value;
    assert.equal(paid.payment.status, "PAID");
    assert.equal(paid.pickup.status, "NOT_PICKED_UP");
    assert.equal(paid.operationalFacts.PAID.userId, "collega");
  });

  await context.test("XPRT blijft transactionele autoriteit voor webshoporders", async () => {
    const currentAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
    const created = (await service.createOrder(currentAdmin.token, currentAdmin.csrfToken, orderPayload({ source: "WEBSHOP_XPRT", externalReference: "XPRT-90001", provenance: "Gestructureerd ACA XPRT-exportrecord 90001" }), "prepilot-xprt-order")).value;
    assert.deepEqual({ source: created.sourceContext.source, authority: created.sourceContext.transactionalAuthority, paymentSource: created.payment.source }, { source: "WEBSHOP_XPRT", authority: "ACA_XPRT", paymentSource: "ACA_XPRT" });
  });

  await context.test("mailbatch is gestructureerd, bron-idempotent en teammail blijft concept", async () => {
    const payload = { sourceMessageId: "message-xprt-20260811-0830", source: "WEBSHOP_XPRT", scheduledWindow: "08:30", provenance: "Gestructureerde JSON-bijlage; geen PDF/OCR", records: [{ externalId: "record-1", externalReference: "XPRT-90001", customer: "Fictieve klant", changes: ["Extra rugnummer 34", "Levering gewijzigd naar afhalen"] }] };
    const first = await service.importMailbatch(operator.token, operator.csrfToken, payload, "prepilot-mailbatch-1");
    const second = await service.importMailbatch(operator.token, operator.csrfToken, payload, "prepilot-mailbatch-2");
    assert.equal(first.value.id, second.value.id);
    assert.equal((await store.read()).mailbatches.length, 1);
    const team = await service.importMailbatch(operator.token, operator.csrfToken, { ...payload, sourceMessageId: "message-buitenhout-20260811-1200", source: "TEAM_MAIL", scheduledWindow: "12:00", records: [{ ...payload.records[0], externalId: "mhc-1", externalReference: "MHC-BUITENHOUT-TEAM-A", association: "Buitenhout MHC" }] }, "prepilot-mailbatch-team");
    assert.equal(team.value.status, "REVIEW_REQUIRED");
    assert.equal(team.value.records[0].productionConcept, true);
  });
});

test("PRE-PILOT MASTER — zichtbaar contract en PWA-grens", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  const entry = await readFile(new URL("../sportpaleis.html", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../workspace-public/sportpaleis.webmanifest", import.meta.url), "utf8"));
  const pwaIcon = await readFile(new URL("../workspace-public/sportpaleis-pwa-icon.svg", import.meta.url), "utf8");
  const positions = ["<h2>Klant</h2>", "<h2>Vereniging</h2>", "<h2>Kies de artikelen</h2>", "<h2>Wat moet erop?</h2>", "<h2>Controleer de order</h2>"].map((marker) => source.indexOf(marker));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(source, /data-action="add-article"/);
  assert.match(source, /maxlength="\$\{field === "initials" \? 5/);
  assert.doesNotMatch(source, /Berekende initialen|data-standard-field="initialPrefix"/);
  for (const marker of ["Mijn werk", "Webshop", "Alles", "data-fast-switch-form", "Teamorder", "Uitgeleverd"]) assert.match(source, new RegExp(marker));
  assert.match(service, /const initials = optional\(value\.initials, 5\)/);
  assert.equal(manifest.start_url, "/overzicht");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/sportpaleis-pwa-icon.svg");
  assert.match(source, /icon\.href = "\/sportpaleis-pwa-icon\.svg"/);
  assert.match(pwaIcon, /Sportpaleis Workspace/);
  assert.doesNotMatch(pwaIcon, /\bWBD\b/);
  assert.match(entry, /<title>Sportpaleis Workspace<\/title>/);
  assert.match(entry, /rel="icon" type="image\/svg\+xml" href="\/sportpaleis-pwa-icon\.svg"/);
  assert.match(entry, /rel="manifest" href="\/sportpaleis\.webmanifest"/);
  assert.doesNotMatch(entry, /WBD Workspace/);
});

test("PRE-PILOT CORRECTION — snelle PIN is begrensd, gehasht en geaudit", async (context) => {
  const { store, service, admin } = await fixture(context);
  const enrolled = await service.setQuickPin(admin.token, admin.csrfToken, "collega", { pin: "2468" });
  assert.equal(enrolled.quickAuth.pinEnrolled, true);
  assert.equal("quickPin" in enrolled, false);
  const persisted = await store.read();
  assert.notEqual(persisted.users.find(({ id }) => id === "collega").quickPin.hash, "2468");
  assert.equal(persisted.users.find(({ id }) => id === "collega").quickPin.algorithm, "scrypt-pin-v1");
  await assert.rejects(service.setQuickPin(admin.token, admin.csrfToken, "kevin", { pin: "1357" }), (error) => error.code === "PIN_ROLE_NOT_ALLOWED");

  const personalAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin, deviceMode: "PERSONAL" });
  await assert.rejects(service.fastSwitch(personalAdmin.token, personalAdmin.csrfToken, { targetUserId: "collega", authMode: "PIN", pin: "2468", deviceMode: "PERSONAL", remoteAddress: "127.0.0.21" }), (error) => error.code === "PIN_SHARED_DEVICE_ONLY");
  const sharedAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin, deviceMode: "SHARED" });
  const switched = await service.fastSwitch(sharedAdmin.token, sharedAdmin.csrfToken, { targetUserId: "collega", authMode: "PIN", pin: "2468", deviceMode: "SHARED", remoteAddress: "127.0.0.22" });
  assert.equal(switched.user.id, "collega");

  const rateAdmin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin, deviceMode: "SHARED" });
  for (let attempt = 0; attempt < 5; attempt += 1) await assert.rejects(service.fastSwitch(rateAdmin.token, rateAdmin.csrfToken, { targetUserId: "collega", authMode: "PIN", pin: "0000", deviceMode: "SHARED", remoteAddress: "127.0.0.23" }), (error) => error.code === "INVALID_SWITCH_CREDENTIAL");
  await assert.rejects(service.fastSwitch(rateAdmin.token, rateAdmin.csrfToken, { targetUserId: "collega", authMode: "PIN", pin: "2468", deviceMode: "SHARED", remoteAddress: "127.0.0.23" }), (error) => error.code === "PIN_LOCKED");
  assert.ok((await store.read()).audit.some(({ action, details }) => action === "Ongeldige PIN-wissel" && details.authMethod === "PIN"));
});

test("PRE-PILOT CORRECTION — operator beheert begrensde productieregels en productie-elementen", async (context) => {
  const { service, operator, storeUser } = await fixture(context);
  const profile = (await service.bootstrap(operator.token)).productionProfiles.find(({ id }) => id !== "profile-none");
  const updatedProfile = await service.updateProductionProfile(operator.token, operator.csrfToken, profile.id, { expectedRevision: profile.revision, placement: profile.placement, referenceDistanceCm: profile.referenceDistanceCm, sizeLabel: profile.sizeLabel, fontProfile: profile.fontProfile, foilColor: profile.foilColor, rotationDeg: profile.rotationDeg, mirror: profile.mirror, instruction: profile.instruction, validation: profile.validation });
  assert.equal(updatedProfile.revision, profile.revision + 1);

  const element = await service.upsertProductionElement(operator.token, operator.csrfToken, { name: "Fictief acceptatielogo", ownerType: "SPONSOR", ownerName: "Acceptatiesponsor", sourceAsset: "Fictieve testbron; geen productieclaim", sourceStatus: "REFERENCE_ONLY", variants: [{ id: "acceptatie-logo-wit", label: "Wit 80 × 40 mm", widthMm: 80, heightMm: 40, productionMode: "EXTERNAL", currentStock: 40, minimumStock: 20, targetStock: 40 }] });
  assert.equal(element.revision, 1);
  const order = (await service.bootstrap(operator.token)).orders.find(({ stage }) => stage !== "DONE");
  const inventory = await service.setProductionElementRequirement(operator.token, operator.csrfToken, { orderId: order.id, variantId: "acceptatie-logo-wit", quantity: 32 });
  const inventoryItem = inventory.find(({ variantId }) => variantId === "acceptatie-logo-wit");
  assert.deepEqual({ openDemand: inventoryItem.openDemand, projected: inventoryItem.projectedFreeStock, shortage: inventoryItem.shortage, suggested: inventoryItem.suggestedReplenishment }, { openDemand: 32, projected: 8, shortage: true, suggested: 32 });
  await assert.rejects(service.upsertProductionElement(storeUser.token, storeUser.csrfToken, { name: "Niet toegestaan", ownerType: "OWN_BRAND", ownerName: "Sportpaleis", sourceAsset: "n.v.t.", sourceStatus: "DATA_GAP", variants: [{ label: "test", productionMode: "INTERNAL_PLOT" }] }), (error) => error.code === "FORBIDDEN");

  const pure = sportpaleisProductionInventoryView({ orders: [{ id: "open", stage: "PRINT" }, { id: "done", stage: "DONE" }], productionElements: [element], productionElementRequirements: [{ orderId: "open", variantId: "acceptatie-logo-wit", quantity: 3 }, { orderId: "done", variantId: "acceptatie-logo-wit", quantity: 99 }] });
  assert.equal(pure[0].openDemand, 3);
});

test("PRE-PILOT CORRECTION — CSV/TSV-import bewaart provenance en weigert onbetrouwbare structuur", async (context) => {
  const { service, operator, store } = await fixture(context);
  const csv = "Regel-ID;Ordernummer;Klant;Vereniging;Wijzigingen;Naar productie\nregel-1;XPRT-101;Testklant;A.S.C. Waterwijk;Rugnummer 34|Afhalen;ja\n";
  const parsed = parseSportpaleisMailbatchExport(csv, "xprt-mailbatch-20260811.csv");
  assert.deepEqual({ format: parsed.input.format, rows: parsed.input.rowCount, status: parsed.input.sourceStatus }, { format: "CSV", rows: 1, status: "REAL_EXPORT_UNCONFIRMED" });
  assert.equal(parsed.records[0].productionConcept, true);
  const payload = { sourceMessageId: "xprt-export-20260811-1400", source: "WEBSHOP_XPRT", scheduledWindow: "14:00", provenance: "Handmatig geëxporteerd door testoperator uit ACA XPRT", filename: "xprt-mailbatch-20260811.csv", rawExportText: csv };
  const first = await service.importMailbatch(operator.token, operator.csrfToken, payload, "mailbatch-file-1");
  const second = await service.importMailbatch(operator.token, operator.csrfToken, payload, "mailbatch-file-2");
  assert.equal(first.value.id, second.value.id);
  assert.equal(first.value.input.sha256, parsed.input.sha256);
  assert.equal((await store.read()).mailbatches.length, 1);
  assert.throws(() => parseSportpaleisMailbatchExport("foo;bar;baz\n1;2;3\n", "unknown.csv"), (error) => error.code === "MAILBATCH_EXPORT_HEADERS_UNKNOWN");
  assert.throws(() => parseSportpaleisMailbatchExport("Regel-ID;Ordernummer;Klant\n1;A;Klant\n1;B;Klant\n", "duplicates.csv"), (error) => error.code === "MAILBATCH_EXPORT_DUPLICATE_ROW");
});
