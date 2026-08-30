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
import { teamkitCatalogSelectionIdentity } from "../src/sportpaleis-teamkit-catalog-identity.ts";

const passwords = { kevin: "R214-Kevin-Truth!", patrick: "R214-Patrick-Truth!", collega: "R214-Store-Truth!", "donovan-support": "R214-Support-Truth!" };
const empty = { initials: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

function legacyItem(id, personalization, extra = {}) {
  return { id, articleNumber: `LEG-${id}`, product: "Historisch wedstrijdshirt", association: "A.S.C. Waterwijk", size: "L", quantity: 1, personalization, foilColor: "Wit", productionProfileId: "profile-shirt", sourceType: "LEGACY", sourceProvenance: `Orderbonregel ${id}`, ...extra };
}

function legacyOrder(id, items, extra = {}) {
  return { id, revision: 1, customer: id, customerEmail: "", customerPhone: "", association: items[0]?.association ?? "Geen vereniging", associations: [...new Set(items.map(({ association }) => association).filter(Boolean))], createdAt: "2024-01-03T10:00:00.000Z", updatedAt: "2024-01-03T10:00:00.000Z", stage: "ORDER", orderKind: "LEGACY", owner: "Historische import", totalPieces: items.reduce((sum, item) => sum + Number(item.quantity), 0), items, foilStates: [{ color: "Wit", status: "READY" }], sourceContext: { source: "STORE", label: "Historische winkelorder", externalReference: id, provenance: `Orderbon ${id}`, transactionalAuthority: "WORKSPACE" }, communication: { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } }, pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null }, fulfillment: { mode: "PICKUP", status: "PENDING", updatedAt: null, updatedBy: null }, eventHistory: [], ...extra };
}

async function fixture(context, transportFactory = (root) => new CaptureTransport({ captureDirectory: path.join(root, "mail") })) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r214-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const transport = transportFactory(root);
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { root, store, service, admin, operator, transport };
}

async function createPrintableOrder(store, service, admin, key) {
  await store.mutate(async (state) => { for (const profile of state.productionProfiles) profile.fontProfile = "Liberation Sans Regular"; state.productionJobs = []; return { state, value: null }; });
  const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: key, customerEmail: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, `${key}-create`)).value;
  return (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, `${key}-control`)).value;
}

test("execution snapshot bevriest relevante verenigingswaarheid en negeert latere configuratiedrift", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular"; state.orders.push(legacyOrder("SP-R214-SNAPSHOT", [legacyItem("snapshot", "Rug 12 (Senior)")])); return { state, value: null }; });
  let order = await service.order(admin.token, "SP-R214-SNAPSHOT");
  await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-snapshot-proposal");
  const frozen = (await service.order(admin.token, order.id)).productionExecutionSnapshot;
  assert.ok(frozen?.associationTruth?.some(({ name }) => name === "A.S.C. Waterwijk"));
  await store.mutate(async (state) => { const association = state.associations.find(({ name }) => name === "A.S.C. Waterwijk"); association.dimensionsCm.backNumberSenior = 99; association.fontProfile = "Drifted config"; return { state, value: null }; });
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionReconciliation.finalValidation.status, "VALID");
  assert.equal(order.productionExecutionSnapshot.executionHash, frozen.executionHash);
});

test("truthy Teamwear-context omzeilt approved placement- en production truth nooit", () => {
  const state = createSportpaleisProductionBootstrap();
  state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
  const order = legacyOrder("SP-R214-TEAMWEAR-BYPASS", [legacyItem("teamwear", "Rug 12 (Senior)")]);
  const projection = reconcileExistingOrderProductionTruth(state, order);
  assert.equal(projection.status, "PROVEN");
  const line = structuredClone(projection.productionLines[0]);
  line.teamkitProductionContext = { proposalPlacementId: "placement-r214", side: "BACK", preset: "CHEST_LEFT", approvedProductionRuleHash: "A", currentProductionRuleHash: "A", approvedProductionIntentHash: "B", currentProductionIntentHash: "B", measurementSource: "PRODUCTION_PROFILE", measurementEvidence: "fixture" };
  const validation = validateFinalProductionTruth(state, { ...order, productionLines: [line] }, [line]);
  assert.ok(validation.findings.some(({ code }) => code === "TEAMWEAR_APPROVED_RULE_MISMATCH"));
});

test("nummerset weigert tekstcontent en een onbekende variant faalt exact gesloten", () => {
  const state = createSportpaleisProductionBootstrap();
  const asset = state.productionElements.find(({ applications, variants }) => applications?.some(({ kind }) => kind === "NUMBER_SET") && variants?.length);
  assert.ok(asset);
  const item = legacyItem("asset-role", "Naam JANSEN", { productionProfileId: "profile-shirt" });
  const order = legacyOrder("SP-R214-ASSET-ROLE", [item]);
  const base = { id: "line-r214", type: "TEXT", content: "JANSEN", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version ?? String(asset.revision), variantId: asset.variants[0].id }, widthMm: 100, heightMm: 50, foilColor: "Wit", quantity: 1, validation: { status: "VALID", reason: null }, personalizationField: "name", decorationIdentity: { orderId: order.id, itemId: item.id, articleNumber: item.articleNumber, decorationType: "name", placement: "name", value: "JANSEN", foilColor: "Wit", productionProfileId: "profile-shirt", assetId: asset.id, assetVersion: asset.version ?? String(asset.revision), targetGroup: "all" } };
  let validation = validateFinalProductionTruth(state, { ...order, productionLines: [base] }, [base]);
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
  const wrongVariant = structuredClone(base); wrongVariant.content = "12"; wrongVariant.type = "NUMBER"; wrongVariant.personalizationField = "backNumber"; wrongVariant.heightMm = 220; wrongVariant.source.variantId = "missing-variant"; wrongVariant.decorationIdentity.decorationType = "backNumber"; wrongVariant.decorationIdentity.placement = "backNumber"; wrongVariant.decorationIdentity.value = "12";
  validation = validateFinalProductionTruth(state, { ...order, productionLines: [wrongVariant] }, [wrongVariant]);
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("één order krijgt nooit twee open production proposals via verschillende keys", async (context) => {
  const { store, service, admin } = await fixture(context); const order = await createPrintableOrder(store, service, admin, "r214-overlap");
  await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-overlap-first");
  await assert.rejects(service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-overlap-second"), (error) => error.code === "PRODUCTION_PROPOSAL_ALREADY_OPEN");
  assert.equal((await store.read()).productionProposals.filter(({ status, orders }) => status === "OPEN" && orders.some(({ id }) => id === order.id)).length, 1);
});

test("directe productie materialiseert een canonieke proposal-koppeling; replot is afsluitbaar zonder orderherschrijving", async (context) => {
  const { store, service, admin } = await fixture(context); let order = await createPrintableOrder(store, service, admin, "r214-direct");
  const original = (await service.createProductionJob(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-direct-job")).value;
  let state = await store.read();
  const proposal = state.productionProposals.find(({ groups }) => groups?.some(({ productionJobId }) => productionJobId === original.id));
  assert.ok(proposal, "een directe job blijft nooit zonder proposal/group lineage achter");
  await service.completeProductionJob(admin.token, admin.csrfToken, original.id, "r214-direct-complete");
  order = await service.order(admin.token, order.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-order-complete");
  const before = await service.order(admin.token, order.id);
  const replot = (await service.replotProductionJob(admin.token, admin.csrfToken, original.id, { reason: "Controleherdruk" }, "r214-replot-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, replot.id, "r214-replot-complete");
  state = await store.read();
  assert.equal(state.productionJobs.find(({ id }) => id === replot.id).status, "COMPLETED");
  assert.equal((await service.order(admin.token, order.id)).productionCompletionEvidence.evidenceHash, before.productionCompletionEvidence.evidenceHash);
});

test("closure wordt ongeldig wanneer een gekoppelde job niet meer COMPLETED en menselijk bevestigd is", async (context) => {
  const { store, service, admin } = await fixture(context); let order = await createPrintableOrder(store, service, admin, "r214-closure");
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-closure-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, job.id, "r214-closure-print");
  order = await service.order(admin.token, order.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r214-closure-done");
  await store.mutate(async (state) => { state.productionJobs.find(({ id }) => id === job.id).status = "FAILED"; return { state, value: null }; });
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionClosure.status, "REVIEW_REQUIRED");
  await assert.rejects(service.confirmPickup(admin.token, admin.csrfToken, order.id, {}, order.revision), (error) => error.code === "PRODUCTION_CLOSURE_NOT_CONFIRMED");
});

test("mailresultaat voor een oude ontvanger/revision wordt auditable stale en nooit toegepast", async (context) => {
  let releaseTransport;
  let markStarted;
  let startedPromise;
  class DelayedCaptureTransport extends CaptureTransport {
    constructor(root) {
      super({ captureDirectory: path.join(root, "mail") });
      this.wait = new Promise((resolve) => { releaseTransport = resolve; });
      startedPromise = new Promise((resolve) => { markStarted = resolve; });
    }
    async send(message, options) { markStarted(); await this.wait; return super.send(message, options); }
  }
  const { store, service, operator } = await fixture(context, (root) => new DelayedCaptureTransport(root));
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Recipient TOCTOU", customerName: "Review", contactName: "Contact", customerEmail: "old@r214.test" });
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ id: "mail-item", articleId: null, articleNumber: "MAIL-R214", productName: "Shirt", color: "Zwart", quantity: null, sizes: [], team: null, notes: null, placements: [] }], reason: "Mailfixture" });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_REVIEW", expectedRevision: proposal.aggregateRevision });
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id);
  const capture = service.captureTeamkitProposalMail(operator.token, operator.csrfToken, proposal.id, { templateKey: "PROPOSAL_REVIEW_REQUEST", customerPath: access.path }, "r214-mail-old-recipient");
  await startedPromise;
  await store.mutate(async (state) => { const current = state.teamkitProposals.find(({ id }) => id === proposal.id); current.customer.email = "new@r214.test"; current.currentRevision += 1; current.aggregateRevision += 1; return { state, value: null }; });
  releaseTransport(); await capture;
  const persisted = (await store.read()).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(persisted.status, "READY_FOR_REVIEW");
  assert.ok(persisted.deliveryEvidence.some(({ status, invalidatedReason }) => status === "STALE" && invalidatedReason === "PROPOSAL_OR_RECIPIENT_CHANGED_DURING_SEND"));
});

test("audittrail wordt niet stil op 2000 regels afgekapt", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { state.audit = Array.from({ length: 2_105 }, (_, index) => ({ id: `audit-r214-${index}`, at: "2026-08-30T10:00:00.000Z", userId: admin.user.id, action: "Historische audit", subject: String(index), details: {} })); return { state, value: null }; });
  await service.savePreferences(admin.token, admin.csrfToken, { view: "compact", density: "compact", optionalPanels: { recent: false, shortcuts: true }, panelOrder: ["production", "attention", "shortcuts", "recent"], orderColumns: ["customer", "foilColors", "articles", "status"], orderDensity: "compact", productionPanels: ["batch", "fallback", "guidance"] });
  assert.equal((await store.read()).audit.length, 2_106);
});

test("R2.14 behoudt de R2.12 datastoreversie en additive provenance blijft serializeerbaar", () => {
  const state = createSportpaleisProductionBootstrap();
  assert.equal(state.schemaVersion, 13);
  state.audit.unshift({
    id: "audit-r214-parent-compat",
    at: "2026-08-30T10:00:00.000Z",
    userId: "system:release-proof",
    action: "R2.14 additive provenance",
    subject: "parent-runtime-compatibility",
    details: { recipientHash: "recipient", contextHash: "context", productionRuleHashes: ["rule"] },
  });
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(restored.schemaVersion, 13);
  assert.deepEqual(restored.audit[0].details.productionRuleHashes, ["rule"]);
});

test("legacy correctie bewaart een niet-mapbaar artikel zonder stille datavernietiging", async (context) => {
  const { store, service, admin } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "r214-legacy-correction", customerEmail: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r214-legacy-correction-create")).value;
  const legacy = legacyItem("unknown-preserved", "Historische vrije opdruk", { articleId: null, articleNumber: "ARCHIEF-ONBEKEND" });
  await store.mutate(async (state) => { const order = state.orders.find(({ id }) => id === created.id); order.items.push(legacy); order.totalPieces += 1; return { state, value: null }; });
  let current = await service.order(admin.token, created.id);
  const updated = await service.updateOrder(admin.token, admin.csrfToken, current.id, { customer: "Alleen bekende regel aangepast", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }], preservedLegacyItemIds: [legacy.id], correctionReason: "Klantnaam gecorrigeerd; historische regel behouden" }, current.revision);
  assert.ok(updated.items.some(({ id, articleNumber }) => id === legacy.id && articleNumber === "ARCHIEF-ONBEKEND"));
});

test("herstel- en catalogus-UX exposeert concrete keuzes, anchors en variantidentity", async () => {
  const state = createSportpaleisProductionBootstrap();
  state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
  const dimension = reconcileExistingOrderProductionTruth(state, legacyOrder("SP-R214-CM", [legacyItem("cm", "Rug 12 (Senior) · 18 cm")]));
  assert.ok(dimension.findings.find(({ missingField }) => missingField === "DIMENSIONS")?.action.options.includes("180"));
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const teamkit = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /CHOOSE_PHYSICAL_HEIGHT_MM/u);
  assert.match(workspace, /CHOOSE_ARTICLE_CONTEXT/u);
  assert.match(workspace, /\?mode=beheer#afhandeling/u);
  assert.match(teamkit, /id="afhandeling"/u);
  assert.match(workspace, /query\.length >= 2 \|\| filter !== "ALL"/u);
  const first = { articleId: null, catalogSnapshot: { catalogProductId: "model-1", catalogVariantId: "navy", supplierArticleNumber: "SKU-N", colorLabel: "Navy" } };
  const second = { articleId: null, catalogSnapshot: { catalogProductId: "model-1", catalogVariantId: "red", supplierArticleNumber: "SKU-R", colorLabel: "Red" } };
  assert.notEqual(teamkitCatalogSelectionIdentity(first), teamkitCatalogSelectionIdentity(second));
});
