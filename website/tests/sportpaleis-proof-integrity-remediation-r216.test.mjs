import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  resolveCanonicalProductionLines,
  SportpaleisFileStore,
  SportpaleisPilotService,
  validateFinalProductionTruth,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R216-Kevin-Truth!", patrick: "R216-Patrick-Truth!", collega: "R216-Store-Truth!", "donovan-support": "R216-Support-Truth!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

class AcceptedMailTransport {
  constructor() { this.name = "R216_ACCEPTED_MAIL"; this.sequence = 0; }
  async send() {
    this.sequence += 1;
    return { outcome: "sent", code: "SMTP_ACCEPTED", confirmedNotSent: false, referenceId: `r216-provider-${this.sequence}`, safeMessage: "Accepted by deterministic R2.16 test transport." };
  }
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r216-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new AcceptedMailTransport() });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, store, service, admin };
}

async function createMailOrder(service, admin, key) {
  return (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: `R2.16 ${key}`,
    customerEmail: `${key}@r216.test`,
    standardPersonalization: { ...empty, initials: "AA" },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }],
  }, `r216-${key}-create`)).value;
}

test("deliverybewijs is aan de immutable attemptcontext gebonden en kan niet worden witgewassen", async (context) => {
  const { service, admin } = await fixture(context);
  let order = await createMailOrder(service, admin, "mail-replay");
  const attempt = await service.captureOrderMail(admin.token, admin.csrfToken, order.id, { templateKey: "ORDER_RECEIVED" }, "r216-mail-replay-capture");
  assert.equal(attempt.status, "SMTP_ACCEPTED");
  assert.match(attempt.contextHash, /^[a-f0-9]{64}$/u);
  assert.match(attempt.payloadHash, /^[a-f0-9]{64}$/u);
  order = await service.order(admin.token, order.id);
  order = await service.updateOrder(admin.token, admin.csrfToken, order.id, {
    customer: "R2.16 gewijzigde waarheid",
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    standardPersonalization: { ...empty, initials: "ZZ" },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 2, deviation: false, overrides: empty }],
  }, order.revision);
  assert.equal(order.communication.receipt.status, "NOT_SENT");
  await assert.rejects(service.recordCommunicationStatus(admin.token, admin.csrfToken, order.id, { channel: "receipt", status: "SENT", providerReference: attempt.referenceId, deliveryEvidence: { attemptId: attempt.id } }, order.revision), (error) => error.code === "COMMUNICATION_DELIVERY_EVIDENCE_REQUIRED");
  const current = await service.order(admin.token, order.id);
  assert.equal(current.communication.receipt.status, "NOT_SENT");
});

test("globale doorlooptijd is alleen default voor nieuwe orders en herinterpreteert bestaand mailbewijs niet", async (context) => {
  const { service, admin } = await fixture(context);
  let order = await createMailOrder(service, admin, "sla-freeze");
  const originalDays = order.communication.processingDaysSnapshot;
  await service.captureOrderMail(admin.token, admin.csrfToken, order.id, { templateKey: "ORDER_RECEIVED" }, "r216-sla-capture");
  order = await service.order(admin.token, order.id);
  assert.equal(order.communication.receipt.status, "SMTP_ACCEPTED");
  await service.updateSettings(admin.token, admin.csrfToken, { processingDays: originalDays + 2 });
  const advanced = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "r216-sla-advance")).value;
  assert.equal(advanced.stage, "CONTROL");
  assert.equal(advanced.communication.processingDaysSnapshot, originalDays);
  const later = await createMailOrder(service, admin, "sla-new-default");
  assert.equal(later.communication.processingDaysSnapshot, originalDays + 2);
});

test("completionbewijs blijft leesbaar door R2.14 en heeft een afzonderlijke V4 actor-attestatie", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { for (const profile of state.productionProfiles) profile.fontProfile = "Liberation Sans Regular"; state.productionJobs = []; return { state, value: null }; });
  let order = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "R2.16 rollback", customerEmail: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r216-rollback-create")).value;
  order = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "r216-rollback-control")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r216-rollback-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, job.id, "r216-rollback-print");
  order = await service.order(admin.token, order.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r216-rollback-done");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionClosure.status, "CONFIRMED");
  const evidence = order.productionCompletionEvidence;
  const { evidenceHash, confirmedAt, confirmedBy, ...r214CompletionBody } = evidence;
  assert.equal(sha256(JSON.stringify(r214CompletionBody)), evidenceHash);
  const readyEvent = order.eventHistory.find(({ type }) => type === "PRODUCTION_READY");
  assert.equal(readyEvent.details.completionAttestationHash, sha256(JSON.stringify({ evidenceHash, confirmedAt, confirmedBy })));
});

test("een FIXED nummerbron kan niet buiten zijn fysieke klasse worden toegewezen of gevalideerd", () => {
  const state = createSportpaleisProductionBootstrap();
  const profile = state.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  const canonical = state.productionElements.find(({ id }) => id === "production-asset-verified-pioneers-rug-junior-160");
  const wrong = structuredClone(canonical);
  delete wrong.verifiedSourceKey;
  wrong.id = "production-asset-r216-fixed-75";
  wrong.version = "r216-fixed-75-v1";
  wrong.sizePolicy = { mode: "FIXED", aspectRatioLocked: true, defaultWidthMm: 75, defaultHeightMm: 75, minWidthMm: 75, maxWidthMm: 75 };
  wrong.variants = [{ ...wrong.variants[0], id: "variant-r216-fixed-75", widthMm: 75, heightMm: 75 }];
  state.productionElements.push(wrong);
  profile.productionNumberAssetIds.push(wrong.id);
  profile.productionNumberAssetAssignments = { ...(profile.productionNumberAssetAssignments ?? {}), backNumber: { "HEIGHT_200.00": wrong.id } };
  const article = state.articles.find(({ id }) => id === "sp-live-116386");
  const item = { id: "item-r216-fixed", articleId: article.id, articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId, sourceProvenance: "R2.16 fixed source probe", foilColor: "Wit", quantity: 1, variants: [{ id: "variant-r216-senior", quantity: 1, size: "XL", personalizationValues: { ...empty, backNumber: "28", backNumberSizeClass: "SENIOR" }, backNumberProduction: { status: "CONFIGURED", sizeClass: "SENIOR", physicalHeightMm: 200, source: "R2.16" } }] };
  const lines = resolveCanonicalProductionLines(state, "SP-R216-FIXED", [item]);
  assert.equal(lines[0].source.id, "production-asset-verified-pioneers-rug-senior-200");
  const forged = structuredClone(lines[0]);
  forged.source = { kind: "PRODUCTION_ELEMENT", id: wrong.id, version: wrong.version, variantId: wrong.variants[0].id };
  const order = { id: "SP-R216-FIXED", revision: 1, orderKind: "INDIVIDUAL", association: article.association, associations: [article.association], sourceContext: { source: "STORE" }, items: [item], productionLines: [forged] };
  const validation = validateFinalProductionTruth(state, order, [forged]);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("visuele productieassetrol moet exact overeenkomen met de decoration-semantiek", () => {
  const state = createSportpaleisProductionBootstrap();
  const item = { id: "item-r216-role", articleNumber: "CUSTOM-R216", association: "A.S.C. Waterwijk", productionProfileId: "profile-shirt", quantity: 1, variants: [] };
  const asset = { id: "production-asset-r216-logo-only", version: "r216-logo-v1", revision: 1, lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", ownerType: "ASSOCIATION", contexts: [{ type: "ASSOCIATION", id: "asc-waterwijk", label: "A.S.C. Waterwijk" }], applications: [{ kind: "LOGO", placement: "Borst" }], variants: [{ id: "variant-r216-logo", widthMm: 80, heightMm: 80 }], sizePolicy: { mode: "FIXED", defaultWidthMm: 80, defaultHeightMm: 80 } };
  state.productionElements.push(asset);
  const line = { id: "line-r216-sponsor", orderId: "SP-R216-ROLE", itemId: item.id, type: "LOGO", content: "Sponsor", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version, variantId: asset.variants[0].id }, widthMm: 80, heightMm: 80, quantity: 1, foilColor: "Wit", preview: { label: "Sponsor" }, proofStatus: "PHYSICALLY_VALIDATED", validation: { status: "VALID", reason: null }, decorationIdentity: { orderId: "SP-R216-ROLE", itemId: item.id, articleNumber: item.articleNumber, decorationType: "sponsor", placement: "CHEST_LEFT", value: "Sponsor", foilColor: "Wit", productionProfileId: item.productionProfileId, assetId: asset.id, assetVersion: asset.version } };
  const order = { id: "SP-R216-ROLE", revision: 1, orderKind: "CUSTOM", association: item.association, associations: [item.association], sourceContext: { source: "MANUAL" }, items: [item], productionLines: [line] };
  const validation = validateFinalProductionTruth(state, order, [line]);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});
