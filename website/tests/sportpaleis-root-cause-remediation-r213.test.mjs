import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createSportpaleisProductionBootstrap, reconcileExistingOrderProductionTruth, SportpaleisFileStore, SportpaleisPilotService, validateFinalProductionTruth } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { queryTeamwearCatalog } from "../src/sportpaleis-teamwear-foundations.ts";

const passwords = { kevin: "R213-Kevin-Truth!", patrick: "R213-Patrick-Truth!", collega: "R213-Store-Truth!", "donovan-support": "R213-Support-Truth!" };

function legacyItem(id, personalization, extra = {}) {
  return { id, articleNumber: `LEG-${id}`, product: "Historisch wedstrijdshirt", association: "A.S.C. Waterwijk", size: "L", quantity: 1, personalization, foilColor: "Wit", productionProfileId: "profile-shirt", sourceType: "LEGACY", sourceProvenance: `Orderbonregel ${id}`, ...extra };
}

function legacyOrder(id, items, extra = {}) {
  return { id, revision: 1, customer: id, customerEmail: "", customerPhone: "", association: items[0]?.association ?? "Geen vereniging", associations: [...new Set(items.map(({ association }) => association).filter(Boolean))], createdAt: "2024-01-03T10:00:00.000Z", updatedAt: "2024-01-03T10:00:00.000Z", stage: "ORDER", orderKind: "LEGACY", owner: "Historische import", totalPieces: items.reduce((sum, item) => sum + Number(item.quantity), 0), items, foilStates: [{ color: "Wit", status: "READY" }], sourceContext: { source: "STORE", label: "Historische winkelorder", externalReference: id, provenance: `Orderbon ${id}`, transactionalAuthority: "WORKSPACE" }, communication: { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } }, pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null }, fulfillment: { mode: "PICKUP", status: "PENDING", updatedAt: null, updatedBy: null }, eventHistory: [], ...extra };
}

function sourceState() {
  const state = createSportpaleisProductionBootstrap();
  for (const profile of state.productionProfiles) if (["profile-shirt", "profile-initials"].includes(profile.id)) profile.fontProfile = "Liberation Sans Regular";
  return state;
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r213-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, store, service, admin };
}

const empty = { initials: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

test("materiële ordercorrectie invalideert open execution truth en proposal atomair", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { for (const profile of state.productionProfiles) profile.fontProfile = "Liberation Sans Regular"; state.productionJobs = []; return { state, value: null }; });
  const createPayload = { orderKind: "INDIVIDUAL", customer: "Snapshot correctie", customerEmail: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] };
  const created = (await service.createOrder(admin.token, admin.csrfToken, createPayload, "r213-snapshot-order")).value;
  await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: created.id, expectedRevision: created.revision }] }, "r213-snapshot-proposal");
  let current = await service.order(admin.token, created.id);
  assert.ok(current.productionExecutionSnapshot?.executionHash);
  const beforeCorrection = await store.read();
  assert.deepEqual(beforeCorrection.productionJobs.filter((job) => job.orders?.some(({ id }) => id === current.id) || job.snapshot?.orderIds?.includes(current.id) || job.snapshot?.orders?.some(({ id }) => id === current.id)).map(({ id, status }) => ({ id, status })), []);
  const updated = await service.updateOrder(admin.token, admin.csrfToken, current.id, { ...createPayload, standardPersonalization: { ...empty, backNumber: "13", backNumberSizeClass: "SENIOR" }, correctionReason: "Rugnummer gecorrigeerd" }, current.revision);
  assert.equal(updated.productionExecutionSnapshot, undefined);
  const persisted = await store.read();
  assert.equal(persisted.productionProposals.find(({ orders }) => orders.some(({ id }) => id === current.id)).status, "INVALIDATED");
  assert.ok(persisted.orders.find(({ id }) => id === current.id).productionExecutionHistory.length === 1);
  assert.ok(persisted.audit.some(({ action }) => action === "Productie-uitvoering ongeldig gemaakt na bronwijziging"));
});

test("execution snapshot is brongebonden en stale bronwaarheid faalt gesloten", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular"; state.orders.push(legacyOrder("SP-R213-STALE", [legacyItem("stale", "Rug 12 (Senior)")])); return { state, value: null }; });
  let current = await service.order(admin.token, "SP-R213-STALE");
  await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r213-stale-proposal");
  await store.mutate(async (state) => { state.orders.find(({ id }) => id === current.id).items[0].personalization = "Rug 99 (Senior)"; return { state, value: null }; });
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionReconciliation.status, "HUMAN_DECISION_REQUIRED");
  assert.ok(current.productionReconciliation.finalValidation.findings.some(({ code }) => code === "PRODUCTION_EXECUTION_SNAPSHOT_STALE" || /orderbron is gewijzigd/u.test(current.productionReconciliation.finalValidation.findings[0]?.reason ?? "")));
  await assert.rejects(service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r213-stale-retry"));
});

test("exact artikel-ID met tegenstrijdige vereniging en SKU stopt vóór profielkeuze", () => {
  const state = sourceState();
  const article = state.articles.find(({ id }) => id === "sp-live-137294");
  const order = legacyOrder("SP-R213-CONTEXT", [legacyItem("context", "Initialen AB", { articleId: article.id, articleNumber: "WRONG-SKU", association: article.association === "SC Buitenboys" ? "DCG" : "SC Buitenboys" })]);
  const result = reconcileExistingOrderProductionTruth(state, order);
  assert.equal(result.status, "HUMAN_DECISION_REQUIRED");
  assert.ok(result.findings.some(({ missingField, reason }) => missingField === "ARTICLE_CONTEXT" && /spreken elkaar tegen/u.test(reason)));
  assert.equal(result.productionLines.length, 0);
});

test("expliciete historische maat wordt nooit stil door een profieldefault vervangen", () => {
  const state = sourceState();
  const result = reconcileExistingOrderProductionTruth(state, legacyOrder("SP-R213-DIMENSION", [legacyItem("dimension", "Rug 34 (Senior) · 180 mm")]));
  assert.equal(result.status, "HUMAN_DECISION_REQUIRED");
  const finding = result.findings.find(({ missingField }) => missingField === "DIMENSIONS");
  assert.equal(finding.action.kind, "CHOOSE_PHYSICAL_HEIGHT_MM");
  assert.ok(finding.action.options.includes("180"));
  assert.equal(result.productionLines.length, 0);
});

test("finale boundary blokkeert bronrol-, placement- en maatafwijkingen centraal", () => {
  const state = sourceState();
  const order = legacyOrder("SP-R213-VALIDATOR", [legacyItem("validator", "Initialen AB")]);
  const projection = reconcileExistingOrderProductionTruth(state, order);
  assert.equal(projection.status, "PROVEN");
  const invalid = structuredClone(projection.productionLines);
  invalid[0].type = "LOGO";
  invalid[0].decorationIdentity.placement = "backNumber";
  invalid[0].heightMm += 7;
  const validation = validateFinalProductionTruth(state, { ...order, productionLines: invalid }, invalid);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_PLACEMENT_MISMATCH"));
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_DIMENSIONS_TRUTH_MISMATCH"));
});

test("identieke herhaalde decorations behouden cardinaliteit en worden niet samengevouwen", () => {
  const state = sourceState();
  for (const personalization of ["Naam JANSEN · Naam JANSEN", "Rug 10 (Senior) + Rug 10 (Senior)", "Initialen AB & Initialen AB"]) {
    const result = reconcileExistingOrderProductionTruth(state, legacyOrder(`SP-R213-DUP-${personalization.length}`, [legacyItem("dup", personalization)]));
    assert.equal(result.status, "HUMAN_DECISION_REQUIRED");
    assert.ok(result.findings.some(({ missingField }) => missingField === "DECORATION_CARDINALITY"));
    assert.equal(result.productionLines.length, 0);
  }
});

test("stock-only closure is immutable verifieerbaar; corruptie blokkeert pickup", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => {
    const appliedAt = "2026-08-30T08:00:00.000Z";
    state.orders.push(legacyOrder("SP-R213-STOCK", [legacyItem("stock", "Geen bedrukking")], { stage: "PRINT", productionLines: [], stockApplications: [{ id: "stock-app-1", association: "VVA / Spartaan", quantity: 2, status: "APPLIED", appliedAt, appliedBy: admin.user.id }] }));
    state.webshopIntake.stockLogo.mutations.unshift({ id: "stock-mutation-r213", orderId: "SP-R213-STOCK", quantity: -2, previousStock: 20, nextStock: 18, at: appliedAt, byUserId: admin.user.id, idempotencyKey: "r213-stock-mutation" });
    return { state, value: null };
  });
  let current = await service.order(admin.token, "SP-R213-STOCK");
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r213-stock-complete");
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionClosure.status, "CONFIRMED");
  assert.equal(current.productionCompletionEvidence.completionMode, "STOCK");
  await store.mutate(async (state) => { state.orders.find(({ id }) => id === current.id).productionCompletionEvidence.stockEvidence.applications[0].quantity = 99; return { state, value: null }; });
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionClosure.status, "REVIEW_REQUIRED");
  await assert.rejects(service.confirmPickup(admin.token, admin.csrfToken, current.id, {}, current.revision), (error) => error.code === "PRODUCTION_CLOSURE_NOT_CONFIRMED");
});

test("mixed stock/plot closure bindt beide evidenceklassen aan exact dezelfde order", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => {
    state.productionJobs = [];
    state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
    state.orders.push(legacyOrder("SP-R213-MIXED", [legacyItem("mixed", "Rug 12 (Senior)")], { stage: "ORDER" }));
    return { state, value: null };
  });
  let current = await service.order(admin.token, "SP-R213-MIXED");
  const prepared = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }], foilColor: "Wit" }, "r213-mixed-prepare")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, prepared.job.id, "r213-mixed-plot-done");
  const appliedAt = "2026-08-30T08:15:00.000Z";
  await store.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === current.id);
    order.stockApplications = [{ id: "stock-mixed-1", association: "VVA / Spartaan", quantity: 1, status: "APPLIED", appliedAt, appliedBy: admin.user.id }];
    state.webshopIntake.stockLogo.mutations.unshift({ id: "stock-mixed-mutation", orderId: current.id, quantity: -1, previousStock: 8, nextStock: 7, at: appliedAt, byUserId: admin.user.id, idempotencyKey: "r213-mixed-stock" });
    return { state, value: null };
  });
  current = await service.order(admin.token, current.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r213-mixed-complete");
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionCompletionEvidence.completionMode, "MIXED");
  assert.equal(current.productionCompletionEvidence.productionJobs.length, 1);
  assert.equal(current.productionCompletionEvidence.stockEvidence.applications.length, 1);
  assert.equal(current.productionClosure.status, "CONFIRMED");
  await store.mutate(async (state) => {
    state.webshopIntake.stockLogo.mutations.find(({ orderId }) => orderId === current.id).nextStock = 6;
    return { state, value: null };
  });
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionClosure.status, "REVIEW_REQUIRED");
});

test("terminale pickup kan niet via normale correctie in delivery eindigen", async (context) => {
  const { store, service, admin } = await fixture(context);
  const completionBody = { version: "CANONICAL_PRODUCTION_COMPLETION_V3", completionMode: "STOCK", productionExecutionHash: null, productionLineHash: "placeholder", requiredLineIds: [], productionJobs: [], stockApplicationIds: ["stock-terminal"], stockEvidence: { applications: [{ id: "stock-terminal", association: "VVA / Spartaan", quantity: 1, status: "APPLIED", appliedAt: "2026-08-30T08:00:00.000Z", appliedBy: admin.user.id }], mutations: [{ id: "stock-terminal-mutation", orderId: "SP-R213-TERMINAL", quantity: -1, previousStock: 5, nextStock: 4, at: "2026-08-30T08:00:00.000Z", byUserId: admin.user.id }] }, explicitHumanAction: "AFRONDEN" };
  await store.mutate(async (state) => { const done = legacyOrder("SP-R213-TERMINAL", [legacyItem("terminal", "Geen bedrukking")], { stage: "DONE", productionLines: [], stockApplications: completionBody.stockEvidence.applications, fulfillment: { mode: "PICKUP", status: "PICKED_UP", updatedAt: "2026-08-30T09:00:00.000Z", updatedBy: admin.user.id }, pickup: { status: "PICKED_UP", pickedUpAt: "2026-08-30T09:00:00.000Z", pickedUpBy: admin.user.id }, productionCompletionEvidence: { ...completionBody, evidenceHash: "not-used", confirmedAt: "2026-08-30T08:30:00.000Z", confirmedBy: { userId: admin.user.id } } }); state.orders.push(done); state.webshopIntake.stockLogo.mutations.unshift(...completionBody.stockEvidence.mutations); return { state, value: null }; });
  const current = await service.order(admin.token, "SP-R213-TERMINAL");
  await assert.rejects(service.updateOrder(admin.token, admin.csrfToken, current.id, { deliveryMode: "DELIVERY", correctionReason: "Niet toegestaan" }, current.revision), (error) => error.code === "FULFILLMENT_TERMINAL_IMMUTABLE");
});

test("mailbewijs is ontvangergebonden en wordt na e-mailcorrectie auditable ongeldig", async (context) => {
  const { store, service, admin } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "Mail evidence", customerEmail: "old@example.test", standardPersonalization: { ...empty, initials: "AB" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r213-mail-order")).value;
  await service.captureOrderMail(admin.token, admin.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "r213-mail-capture");
  let current = await service.order(admin.token, created.id);
  assert.equal(current.communication.receipt.status, "CAPTURED");
  await service.updateOrder(admin.token, admin.csrfToken, current.id, { customerEmail: "new@example.test" }, current.revision);
  current = await service.order(admin.token, current.id);
  assert.equal(current.communication.receipt.status, "NOT_SENT");
  assert.equal(current.communication.receipt.invalidatedReason, "RECIPIENT_CHANGED");
  assert.ok(current.communication.history.some(({ channel, invalidatedReason }) => channel === "receipt" && invalidatedReason === "RECIPIENT_CHANGED"));
  assert.ok((await store.read()).audit.some(({ action }) => action === "Communicatiebewijs ongeldig gemaakt na ontvangerwijziging"));
});

test("exact SKU selecteert exact dezelfde variant en variantprijs", () => {
  const product = { id: "catalog-model", brand: "Stanno", model: "Model X", category: "Shirt", audiences: ["UNISEX"], supplierName: "Stanno", supplierArticleName: "Model X", supplierArticleNumber: "SKU-RED", use: "WEDSTRIJD", collection: null, familyKey: null, advicePriceEur: 19, sourceStatus: "AUTHORITATIVE", syncStatus: "CURRENT", sourceAdapterId: "test", variants: [
    { id: "red", colorLabel: "Rood", colorHex: "#f00", imageKey: "red", availableSizes: ["M"], sourceArticleId: "red-id", sourceArticleNumber: "SKU-RED", associationNames: [], advicePriceEur: 19, sourceStatus: "AUTHORITATIVE", media: [{ kind: "FRONT", imageKey: "red" }] },
    { id: "blue", colorLabel: "Blauw", colorHex: "#00f", imageKey: "blue", availableSizes: ["M"], sourceArticleId: "blue-id", sourceArticleNumber: "SKU-BLUE", associationNames: [], advicePriceEur: 29, sourceStatus: "AUTHORITATIVE", media: [{ kind: "FRONT", imageKey: "blue" }] },
  ] };
  const result = queryTeamwearCatalog([product], { query: "SKU-BLUE", limit: 12 });
  assert.equal(result.products[0].matchedVariantId, "blue");
  assert.equal(result.products[0].variants.find(({ id }) => id === result.products[0].matchedVariantId).advicePriceEur, 29);
});
