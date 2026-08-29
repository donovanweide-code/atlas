import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  reconcileExistingOrderProductionTruth,
  SportpaleisFileStore,
  SportpaleisPilotService,
  validateFinalProductionTruth,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R212-Kevin-Truth!", patrick: "R212-Patrick-Truth!", collega: "R212-Store-Truth!", "donovan-support": "R212-Support-Truth!" };

function order(id, items, extra = {}) {
  return {
    id, revision: 1, customer: id, customerEmail: "", customerPhone: "", association: items[0]?.association ?? "Geen vereniging",
    associations: [...new Set(items.map(({ association }) => association).filter(Boolean))], createdAt: "2024-01-03T10:00:00.000Z", updatedAt: "2024-01-03T10:00:00.000Z",
    stage: "ORDER", orderKind: "LEGACY", owner: "Historische import", totalPieces: items.reduce((sum, item) => sum + Number(item.quantity), 0), items,
    foilStates: [{ color: "Wit", status: "READY" }], sourceContext: { source: "STORE", label: "Historische winkelorder", externalReference: id, provenance: `Orderbon ${id}`, transactionalAuthority: "WORKSPACE" },
    communication: { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } },
    pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null }, fulfillment: { mode: "PICKUP", status: "PENDING", updatedAt: null, updatedBy: null }, eventHistory: [], ...extra,
  };
}

function item(id, personalization, extra = {}) {
  return { id, articleNumber: `LEG-${id}`, product: "Historisch wedstrijdshirt", association: "A.S.C. Waterwijk", size: "L", quantity: 1, personalization, foilColor: "Wit", productionProfileId: "profile-shirt", sourceType: "LEGACY", sourceProvenance: `Orderbonregel ${id}`, ...extra };
}

function state() {
  const value = createSportpaleisProductionBootstrap();
  for (const profile of value.productionProfiles) if (["profile-shirt", "profile-initials"].includes(profile.id)) profile.fontProfile = "Liberation Sans Regular";
  return value;
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r212-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, store, service, admin };
}

test("lossless parser segmenteert +, &, komma en bewaakt dubbele decorationwaarden", () => {
  const source = state();
  const cases = [
    ["Naam JANSEN + Rug 34 (Senior)", [["name", "JANSEN"], ["backNumber", "34"]]],
    ["Initialen DW & Rug 34 (Senior)", [["initials", "DW"], ["backNumber", "34"]]],
    ["Initialen DW, Rug 34 (Senior)", [["initials", "DW"], ["backNumber", "34"]]],
  ];
  for (const [personalization, expected] of cases) {
    const result = reconcileExistingOrderProductionTruth(source, order(`SP-${expected[0][0]}-${expected[1][0]}`, [item("combined", personalization)]));
    assert.equal(result.status, "PROVEN", personalization);
    assert.deepEqual(result.productionLines.map(({ personalizationField, content }) => [personalizationField, content]).sort(), expected.sort());
  }
  for (const personalization of ["Naam JANSEN · Naam PIETERS", "Rug 10 (Senior) + Rug 11 (Senior)", "Initialen AB & Initialen CD"]) {
    const result = reconcileExistingOrderProductionTruth(source, order(`SP-DUP-${personalization.length}`, [item("duplicate", personalization)]));
    assert.equal(result.status, "HUMAN_DECISION_REQUIRED");
    assert.ok(result.findings.some(({ missingField }) => missingField === "DECORATION_CARDINALITY"));
    assert.equal(result.productionLines.length, 0);
  }
});

test("contextresolver kiest nooit de eerste duplicate SKU en gebruikt item- of unieke ordercontext", () => {
  const source = state();
  const template = source.articles.find(({ id }) => id === "sp-live-137294") ?? source.articles[0];
  source.articles.push({ ...structuredClone(template), id: "duplicate-sku-a", articleNumber: "DUP-140306", association: "SC Buitenboys", profileId: "profile-shirt" });
  source.articles.push({ ...structuredClone(template), id: "duplicate-sku-b", articleNumber: "DUP-140306", association: "DCG", profileId: "profile-initials" });
  const ambiguousItem = item("ambiguous-sku", "Initialen AB", { articleNumber: "DUP-140306", association: "" });
  const ambiguous = reconcileExistingOrderProductionTruth(source, order("SP-DUP-SKU", [ambiguousItem], { association: "Geen vereniging", associations: ["SC Buitenboys", "DCG"] }));
  assert.equal(ambiguous.status, "HUMAN_DECISION_REQUIRED");
  assert.ok(ambiguous.findings.some(({ missingField }) => missingField === "ARTICLE_CONTEXT"));
  const contextual = reconcileExistingOrderProductionTruth(source, order("SP-DUP-SKU-CONTEXT", [{ ...ambiguousItem, association: "SC Buitenboys" }], { association: "SC Buitenboys", associations: ["SC Buitenboys"] }));
  assert.equal(contextual.status, "PROVEN");
  assert.equal(new Set(contextual.productionLines.map(({ decorationIdentity }) => decorationIdentity.productionProfileId)).size, 1);
  assert.equal(contextual.productionLines[0].decorationIdentity.productionProfileId, "profile-shirt");
});

test("profile-none, KIDS en variant-cardinality zijn concrete pre-PROVEN blockers", () => {
  const source = state();
  const none = reconcileExistingOrderProductionTruth(source, order("SP-PROFILE-NONE", [item("none", "Rug 34 (Senior)", { productionProfileId: "profile-none" })]));
  assert.ok(none.findings.some(({ missingField }) => missingField === "PRODUCTION_PROFILE"));
  const kids = reconcileExistingOrderProductionTruth(source, order("SP-KIDS", [item("kids", "Rugnummer", { quantity: 1, variants: [{ id: "kid", quantity: 1, personalization: "Rug 8 KIDS", personalizationValues: { backNumber: "8", backNumberSizeClass: "KIDS" }, backNumberProduction: { sizeClass: "KIDS", physicalHeightMm: 190, status: "SOURCE_CONFIGURED" } }] })]));
  assert.ok(kids.findings.some(({ missingField }) => missingField === "SIZE_CLASS"));
  const mismatch = reconcileExistingOrderProductionTruth(source, order("SP-CARDINALITY", [item("cardinality", "Persoonsregels", { quantity: 3, variants: [{ id: "one", quantity: 1, personalization: "Initialen AA", personalizationValues: { initials: "AA" } }] })]));
  assert.ok(mismatch.findings.some(({ missingField }) => missingField === "CARDINALITY"));
});

test("opgeslagen lijnen kunnen de finale validator niet omzeilen", () => {
  const source = state();
  const original = order("SP-STORED-BLOCKED", [item("stored", "Initialen AB", { productionProfileId: "profile-initials", variants: [{ id: "stored-person", quantity: 1, personalization: "Initialen AB", personalizationValues: { initials: "AB" } }] })], { orderKind: "INDIVIDUAL" });
  const projection = reconcileExistingOrderProductionTruth(source, original);
  assert.equal(projection.status, "PROVEN");
  const invalid = structuredClone(projection.productionLines);
  invalid[0].widthMm = 0;
  invalid[0].quantity = 2;
  const validation = validateFinalProductionTruth(source, { ...original, productionLines: invalid }, invalid);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ field }) => field === "DIMENSIONS"));
  assert.ok(validation.findings.some(({ field }) => field === "DECORATION_CARDINALITY"));
  assert.equal(reconcileExistingOrderProductionTruth(source, { ...original, productionLines: invalid }).status, "HUMAN_DECISION_REQUIRED");
});

test("immutable execution snapshot voorkomt drift en completion evidence faalt gesloten bij tamper", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (current) => {
    current.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
    current.orders.push(order("SP-R212-DRIFT", [item("drift", "Rug 12 (Senior)")]));
    return { state: current, value: null };
  });
  let current = await service.order(admin.token, "SP-R212-DRIFT");
  const prepared = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }], foilColor: "Wit" }, "r212-drift-prepare")).value;
  const frozenHeight = prepared.job.snapshot.productionLines[0].heightMm;
  await store.mutate(async (next) => { next.productionProfiles.find(({ id }) => id === "profile-shirt").backNumberSizeClasses.SENIOR.physicalHeightMm = 999; return { state: next, value: null }; });
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionLines[0].heightMm, frozenHeight);
  assert.ok(current.productionExecutionSnapshot.executionHash);
  await service.completeProductionJob(admin.token, admin.csrfToken, prepared.job.id, "r212-drift-produced");
  current = await service.order(admin.token, current.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r212-drift-done");
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionClosure.status, "CONFIRMED");
  await store.mutate(async (next) => { next.orders.find(({ id }) => id === current.id).productionCompletionEvidence.requiredLineIds.push("forged-line"); return { state: next, value: null }; });
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionClosure.status, "REVIEW_REQUIRED");
});

test("een beschadigde bestaande execution snapshot wordt nooit opnieuw gebruikt", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (current) => {
    current.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
    current.orders.push(order("SP-R212-SNAPSHOT-TAMPER", [item("snapshot-tamper", "Rug 15 (Senior)")]));
    return { state: current, value: null };
  });
  let current = await service.order(admin.token, "SP-R212-SNAPSHOT-TAMPER");
  await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r212-snapshot-initial");
  await store.mutate(async (next) => {
    next.orders.find(({ id }) => id === current.id).productionExecutionSnapshot.productionLines[0].heightMm += 1;
    return { state: next, value: null };
  });
  current = await service.order(admin.token, current.id);
  await assert.rejects(
    service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "r212-snapshot-reuse"),
    (error) => error.code === "ORDER_NOT_READY" && /integriteitshash/u.test(error.message),
  );
});

test("reconciliationmutaties zijn na PRINT/DONE hard geblokkeerd", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (current) => { current.orders.push(order("SP-R212-IMMUTABLE", [item("immutable", "Rug 7")], { stage: "PRINT" })); return { state: current, value: null }; });
  const current = await service.order(admin.token, "SP-R212-IMMUTABLE");
  await assert.rejects(service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, current.id, { expectedRevision: current.revision, historicalSourceHash: current.productionReconciliation.historicalSourceHash, findingId: "anything", value: "SENIOR", reason: "mag niet" }, "r212-immutable-decision"), (error) => error.code === "HISTORICAL_PRODUCTION_TRUTH_IMMUTABLE");
});

test("herstelkeuze kan vóór bevestiging worden gewijzigd en ingetrokken met audit", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (current) => { current.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular"; current.orders.push(order("SP-R212-EDIT", [item("edit", "Rug 7")])); return { state: current, value: null }; });
  let current = await service.order(admin.token, "SP-R212-EDIT");
  const finding = current.productionReconciliation.findings.find(({ missingField }) => missingField === "SIZE_CLASS");
  await service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, current.id, { expectedRevision: current.revision, historicalSourceHash: current.productionReconciliation.historicalSourceHash, findingId: finding.id, value: "JUNIOR", reason: "Eerste controle" }, "r212-edit-junior");
  current = await service.order(admin.token, current.id);
  await service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, current.id, { expectedRevision: current.revision, historicalSourceHash: current.productionReconciliation.historicalSourceHash, findingId: finding.id, value: "SENIOR", reason: "Bron opnieuw gecontroleerd" }, "r212-edit-senior");
  current = await service.order(admin.token, current.id);
  assert.equal(current.productionReconciliation.decisions.find(({ findingId }) => findingId === finding.id).value, "SENIOR");
  await service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, current.id, { expectedRevision: current.revision, historicalSourceHash: current.productionReconciliation.historicalSourceHash, findingId: finding.id, cancel: true, reason: "Beslissing nog niet betrouwbaar" }, "r212-edit-cancel");
  current = await service.order(admin.token, current.id);
  assert.ok(current.productionReconciliation.findings.some(({ missingField }) => missingField === "SIZE_CLASS"));
  const persisted = await store.read();
  assert.ok(persisted.audit.some(({ action, subject }) => action === "Beslissing over bestaande-orderwaarheid ingetrokken" && subject === current.id));
});

test("Today projecteert alleen echte menselijke Teamwear-aandacht en telt sync-aandacht mee", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /\["READY_FOR_DESIGN", "READY_FOR_REVIEW", "CUSTOMER_FEEDBACK"\]\.includes\(proposal\.status\) \|\| proposal\.fulfillmentTasks\.some\(\(\{ status \}\) => \["HUMAN_CHECK", "RETURNED"\]\.includes\(status\)\)/u);
  assert.doesNotMatch(source, /proposal\.status === "WAITING_FOR_CUSTOMER_INPUT"[^\n]*teamwearAttention/u);
  assert.match(source, /attention\.length \+ teamwearAttention\.length \+ webshopAttention\.length \+ Number\(syncAttentionCount > 0\)/u);
  assert.match(source, /syncAttentionCount \? `\$\{BASE\}\/beheer\/synchronisatie`/u);
});

test("cataloguszoeking behoudt filters, pagination, reset en variant-specifieke bronautoriteit", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const experience = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
  const foundation = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(workspace, /searchTeamwearCatalog\(\{ query, audience, use, offset, limit: 24 \}\)/u);
  assert.match(workspace, /data-action="load-more-teamwear-catalog"[^>]*data-offset="\$\{result\.nextOffset\}"/u);
  assert.match(workspace, /if \(!query && catalog\?\.dataset\.remoteSearch === "true"\) \{ teamwearCatalogSearchSequence \+= 1; render\(\{ preserveScroll: true \}\); return; \}/u);
  assert.match(foundation, /nextOffset: catalogPage\.hasMore \? offset \+ limit : null/u);
  assert.match(experience, /const variantSourceStatus = variant\.sourceStatus \?\? product\.sourceStatus/u);
  assert.match(experience, /variantSourceStatus !== "AUTHORITATIVE" \|\| !variant\.sourceArticleId/u);
});

test("mailtransport en Workspace-projectie convergeren idempotent na crash tussen beide fasen", async (context) => {
  const { store, service, admin } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "R2.12 crash recovery",
    customerEmail: "recovery@example.test",
    customerPhone: "",
    standardPersonalization: { initials: "AB", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
  }, "r212-mail-crash-order")).value;
  const mutate = store.mutate.bind(store);
  let failProjection = true;
  store.mutate = async (...args) => {
    if (failProjection) {
      failProjection = false;
      throw Object.assign(new Error("Injected projection crash"), { code: "INJECTED_PROJECTION_CRASH" });
    }
    return mutate(...args);
  };
  await assert.rejects(
    service.captureOrderMail(admin.token, admin.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "r212-mail-crash"),
    (error) => error.code === "INJECTED_PROJECTION_CRASH",
  );
  const recovered = await service.captureOrderMail(admin.token, admin.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "r212-mail-crash");
  assert.equal(recovered.duplicate, true);
  const persisted = await store.read();
  const orderAfterRecovery = persisted.orders.find(({ id }) => id === created.id);
  assert.equal(orderAfterRecovery.communication.receipt.status, "CAPTURED");
  assert.equal(orderAfterRecovery.eventHistory.filter(({ details }) => details?.mailAttemptId === recovered.id).length, 1);
  assert.equal(orderAfterRecovery.eventHistory.find(({ details }) => details?.mailAttemptId === recovered.id)?.details?.duplicateRecovery, true);
});
