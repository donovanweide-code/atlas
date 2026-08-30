import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R215-Kevin-Truth!", patrick: "R215-Patrick-Truth!", collega: "R215-Store-Truth!", "donovan-support": "R215-Support-Truth!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r215-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, store, service, admin };
}

function numberItem(article, { id = "item-r215", value = "34", sizeClass = "SENIOR", heightMm = 200 } = {}) {
  return {
    id,
    articleId: article.id,
    articleNumber: article.articleNumber,
    association: article.association,
    productionProfileId: article.profileId,
    sourceProvenance: "R2.15 novelty probe",
    foilColor: "Wit",
    quantity: 1,
    variants: [{ id: `${id}-variant`, quantity: 1, size: "XL", personalizationValues: { ...empty, backNumber: value, backNumberSizeClass: sizeClass }, backNumberProduction: { status: "CONFIGURED", sizeClass, physicalHeightMm: heightMm, source: "R2.15 probe" } }],
  };
}

test("profielautoriteit en exacte fysieke variant voorkomen een verkeerde association-specific nummerset", () => {
  const state = createSportpaleisProductionBootstrap();
  const canonical = state.productionElements.find(({ id }) => id === "production-asset-verified-pioneers-rug-junior-160");
  const rogue = structuredClone(canonical);
  delete rogue.verifiedSourceKey;
  rogue.id = "production-asset-pioneers-rug-legacy-75";
  rogue.name = "Pioneers oude rugset 7,5 cm";
  rogue.version = "legacy-75-v1";
  rogue.variants = [{ ...rogue.variants[0], id: "variant-legacy-rug-75", widthMm: 75, heightMm: 75, label: "Rug legacy 7,5 cm" }];
  rogue.applications = [{ kind: "NUMBER_SET", placement: "Rug legacy" }];
  state.productionElements.push(rogue);
  const article = state.articles.find(({ id }) => id === "sp-live-116386");
  const item = numberItem(article);
  const lines = resolveCanonicalProductionLines(state, "SP-R215-WRONG-DIMENSION", [item]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].source.id, "production-asset-verified-pioneers-rug-senior-200");
  assert.equal(lines[0].source.variantId, "variant-verified-pioneers-rug-senior-200");
  assert.equal(lines[0].heightMm, 200);
  const order = { id: "SP-R215-WRONG-DIMENSION", revision: 1, orderKind: "INDIVIDUAL", association: article.association, associations: [article.association], sourceContext: { source: "STORE" }, items: [item], productionLines: lines };
  assert.equal(validateFinalProductionTruth(state, order, lines).status, "VALID");
});

test("final validator bindt productieasset per regel aan de vereniging van exact het bronitem", () => {
  const state = createSportpaleisProductionBootstrap();
  const asset = state.productionElements.find(({ id }) => id === "production-asset-verified-pioneers-rug-senior-200");
  const waterwijkArticle = state.articles.find(({ id }) => id === "sp-live-137294");
  const pioneersArticle = state.articles.find(({ id }) => id === "sp-live-116386");
  const waterwijk = numberItem(waterwijkArticle, { id: "item-waterwijk", heightMm: 220 });
  const pioneers = { ...numberItem(pioneersArticle, { id: "item-pioneers" }), variants: [] };
  const line = { id: "line-cross-club", orderId: "SP-R215-CROSS-CLUB", itemId: waterwijk.id, variantId: waterwijk.variants[0].id, variantIds: [waterwijk.variants[0].id], type: "NUMBER", personalizationField: "backNumber", content: "34", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version ?? String(asset.revision), variantId: asset.variants[0].id }, widthMm: 211.2, heightMm: 220, quantity: 1, foilColor: "Wit", preview: { label: "Rugnummer 34" }, proofStatus: "PHYSICALLY_VALIDATED", validation: { status: "VALID", reason: null }, decorationIdentity: { orderId: "SP-R215-CROSS-CLUB", itemId: waterwijk.id, articleNumber: waterwijk.articleNumber, decorationType: "backNumber", placement: "backNumber", value: "34", foilColor: "Wit", productionProfileId: waterwijk.productionProfileId, targetGroup: "SENIOR" } };
  const order = { id: "SP-R215-CROSS-CLUB", revision: 1, orderKind: "INDIVIDUAL", association: waterwijk.association, associations: [waterwijk.association, pioneers.association], sourceContext: { source: "STORE" }, items: [waterwijk, pioneers], productionLines: [line] };
  const validation = validateFinalProductionTruth(state, order, [line]);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ code }) => ["PRODUCTION_SOURCE_ROLE_MISMATCH", "PRODUCTION_ASSET_CONTEXT_MISMATCH"].includes(code)));
});

test("NUMBER_SET kan nooit als logo-application door final validation", () => {
  const state = createSportpaleisProductionBootstrap();
  const asset = state.productionElements.find(({ id }) => id === "production-asset-verified-pioneers-short-80");
  const item = { id: "item-role", articleNumber: "116387", association: "Almere Pioneers", productionProfileId: "profile-pioneers-shorts", quantity: 1, variants: [] };
  const line = { id: "line-role", orderId: "SP-R215-ROLE", itemId: item.id, type: "LOGO", content: "34", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version ?? String(asset.revision), variantId: asset.variants[0].id }, widthMm: 80, heightMm: 80, quantity: 1, foilColor: "Wit", preview: { label: "Logo 34" }, proofStatus: "PHYSICALLY_VALIDATED", validation: { status: "VALID", reason: null }, decorationIdentity: { orderId: "SP-R215-ROLE", itemId: item.id, articleNumber: item.articleNumber, decorationType: "logo", placement: "CHEST_LEFT", value: "34", foilColor: "Wit", productionProfileId: item.productionProfileId, assetId: asset.id, assetVersion: asset.version } };
  const order = { id: "SP-R215-ROLE", revision: 1, orderKind: "CUSTOM", association: item.association, associations: [item.association], sourceContext: { source: "MANUAL" }, items: [item], productionLines: [line] };
  const validation = validateFinalProductionTruth(state, order, [line]);
  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("gewijzigde orderinhoud maakt eerder ontvangstbewijs auditable ongeldig", async (context) => {
  const { store, service, admin } = await fixture(context);
  const first = { ...empty, initials: "AA" };
  let order = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "Mail context", customerEmail: "context@r215.test", standardPersonalization: first, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r215-mail-create")).value;
  await service.captureOrderMail(admin.token, admin.csrfToken, order.id, { templateKey: "ORDER_RECEIVED" }, "r215-mail-receipt");
  order = await service.order(admin.token, order.id);
  assert.equal(order.communication.receipt.status, "CAPTURED");
  order = await service.updateOrder(admin.token, admin.csrfToken, order.id, { customer: order.customer, customerEmail: order.customerEmail, customerPhone: order.customerPhone, standardPersonalization: { ...empty, initials: "ZZ" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 2, deviation: false, overrides: empty }] }, order.revision);
  assert.equal(order.communication.receipt.status, "NOT_SENT");
  assert.ok(order.communication.history.some(({ channel, invalidatedReason }) => channel === "receipt" && invalidatedReason === "ORDER_TRUTH_CHANGED"));
  await assert.rejects(service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "r215-mail-advance"), (error) => error.code === "RECEIPT_CONFIRMATION_REQUIRED");
  assert.ok((await store.read()).audit.some(({ action, subject }) => action.includes("Communicatiebewijs ongeldig") && subject === order.id));
});

test("completion zonder gehashte actor/tijd-attestatie faalt gesloten", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => { for (const profile of state.productionProfiles) profile.fontProfile = "Liberation Sans Regular"; state.productionJobs = []; return { state, value: null }; });
  let order = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "Closure attestation", customerEmail: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r215-closure-create")).value;
  order = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "r215-closure-control")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r215-closure-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, job.id, "r215-closure-print");
  order = await service.order(admin.token, order.id);
  await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r215-closure-done");
  assert.equal((await service.order(admin.token, order.id)).productionClosure.status, "CONFIRMED");
  await store.mutate(async (state) => { const evidence = state.orders.find(({ id }) => id === order.id).productionCompletionEvidence; delete evidence.confirmedAt; delete evidence.confirmedBy; return { state, value: null }; });
  assert.equal((await service.order(admin.token, order.id)).productionClosure.status, "REVIEW_REQUIRED");
});

test("actionable recovery en correctie-UX bevatten geen bewezen dode routes of verborgen bezorgwaarheid", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const foundation = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(workspace, /webshop\/import/u);
  assert.match(workspace, /HISTORICAL_EXECUTION_WITHOUT_SNAPSHOT/u);
  assert.match(foundation, /productie\/historie\?query=/u);
  assert.match(workspace, /data-order-correction-delivery-address/u);
  assert.match(workspace, /deliveryMode: order\.fulfillment\?\.mode/u);
  assert.match(workspace, /optionLabels/u);
  assert.match(foundation, /expliciet in historische orderbron/u);
});
