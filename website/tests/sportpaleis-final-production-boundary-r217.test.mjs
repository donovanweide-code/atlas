import assert from "node:assert/strict";
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
import { productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R217-Kevin-Truth!", patrick: "R217-Patrick-Truth!", collega: "R217-Store-Truth!", "donovan-support": "R217-Support-Truth!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r217-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { store, service, admin };
}

function visualFixture({ articleScope = null } = {}) {
  const state = createSportpaleisProductionBootstrap();
  const item = { id: "item-r217-visual", articleId: "article-r217-A", articleNumber: "SKU-R217-A", association: "A.S.C. Waterwijk", productionProfileId: "profile-shirt", quantity: 1, variants: [] };
  const asset = {
    id: "production-asset-r217-visual", version: "r217-visual-v1", revision: 1,
    lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", ownerType: "ASSOCIATION",
    contexts: [{ type: "ASSOCIATION", id: "asc-waterwijk", label: "A.S.C. Waterwijk" }, ...(articleScope ? [{ type: "ARTICLE", id: articleScope, label: articleScope }] : [])],
    applications: [{ kind: "LOGO", placement: "Borst" }],
    variants: [{ id: "variant-r217-visual", widthMm: 80, heightMm: 80 }],
    sizePolicy: { mode: "FIXED", aspectRatioLocked: true, defaultWidthMm: 80, defaultHeightMm: 80, minWidthMm: 80, maxWidthMm: 80 },
    sourceSelection: { geometryHash: "geometry-r217" }, controlledVector: { geometryHash: "geometry-r217", contours: [{ id: "square", closed: true, points: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }, { x: 0, y: 0 }] }] },
  };
  state.productionElements.push(asset);
  const line = {
    id: "line-r217-visual", orderId: "SP-R217-VISUAL", itemId: item.id, type: "LOGO", content: "Clublogo",
    source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version, variantId: asset.variants[0].id }, widthMm: 80, heightMm: 80, quantity: 1, foilColor: "Wit",
    preview: { label: "Clublogo" }, proofStatus: "PHYSICALLY_VALIDATED", validation: { status: "VALID", reason: null },
    decorationIdentity: { orderId: "SP-R217-VISUAL", itemId: item.id, articleNumber: item.articleNumber, decorationType: "logo", placement: "CHEST_LEFT", value: "Clublogo", foilColor: "Wit", productionProfileId: item.productionProfileId, assetId: asset.id, assetVersion: asset.version },
  };
  const order = { id: "SP-R217-VISUAL", revision: 1, orderKind: "CUSTOM", association: item.association, associations: [item.association], sourceContext: { source: "MANUAL" }, items: [item], productionLines: [line] };
  return { state, item, asset, line, order };
}

test("authoritative operationele API weigert statusfeiten buiten hun lifecycle", async (context) => {
  const { service, admin } = await fixture(context);
  const order = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "R2.17 lifecycle", customerEmail: "", standardPersonalization: { ...empty, initials: "AA" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "r217-lifecycle-create")).value;
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, order.id, { action: "PRINTED", expectedRevision: order.revision }, "r217-early-print"), (error) => error.code === "PRINT_ACTION_NOT_AVAILABLE");
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, order.id, { action: "REGISTER_PROCESSED", expectedRevision: order.revision }, "r217-early-register"), (error) => error.code === "REGISTER_ACTION_NOT_AVAILABLE");
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, order.id, { action: "CUSTOMER_INFORMED", expectedRevision: order.revision }, "r217-early-informed"), (error) => error.code === "CUSTOMER_INFORMED_ACTION_NOT_AVAILABLE");
  const current = await service.order(admin.token, order.id);
  assert.deepEqual(current.operationalFacts, {});
  assert.equal(current.revision, order.revision);
});

test("FIXED visuele bron kan niet door final validation of materialisatie worden opgeschaald", () => {
  const { state, asset, line, order } = visualFixture();
  const resized = { ...line, widthMm: 160, heightMm: 160 };
  assert.equal(validateFinalProductionTruth(state, { ...order, productionLines: [resized] }, [resized]).status, "BLOCKED");
  assert.throws(() => productionAssetPiece({ asset, variant: asset.variants[0], line: resized, order, foilColor: "Wit" }), (error) => error.code === "PRODUCTION_ASSET_SIZE_FIXED");
});

test("decoration identity kan niet naar een andere assetversie wijzen dan de uitvoerbron", () => {
  const { state, line, order } = visualFixture();
  const forged = structuredClone(line);
  forged.decorationIdentity.assetId = "production-asset-r217-other";
  assert.equal(validateFinalProductionTruth(state, { ...order, productionLines: [forged] }, [forged]).status, "BLOCKED");
});

test("herhaalde decorations met hetzelfde item en asset houden unieke fysieke outputidentity", () => {
  const { asset, line, order } = visualFixture();
  const first = productionAssetPiece({ asset, variant: asset.variants[0], line: { ...line, id: "line-r217-occurrence-1" }, order, foilColor: "Wit" });
  const second = productionAssetPiece({ asset, variant: asset.variants[0], line: { ...line, id: "line-r217-occurrence-2" }, order, foilColor: "Wit" });
  assert.notEqual(first.id, second.id);
  assert.match(first.id, /line-r217-occurrence-1/u);
  assert.match(second.id, /line-r217-occurrence-2/u);
});

test("ARTICLE-scoped productiebron is alleen geldig voor exact hetzelfde bronartikel", () => {
  const { state, line, order } = visualFixture({ articleScope: "SKU-R217-B" });
  const result = validateFinalProductionTruth(state, order, [line]);
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("HUMAN_ACCEPTANCE assignment kan een FIXED 75mm nummerset niet tot 200mm promoveren", () => {
  const state = createSportpaleisProductionBootstrap();
  const profile = state.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  const canonical = state.productionElements.find(({ id }) => id === "production-asset-verified-pioneers-rug-junior-160");
  const wrong = structuredClone(canonical);
  delete wrong.verifiedSourceKey;
  wrong.id = "production-asset-r217-fixed-75";
  wrong.version = "r217-fixed-75-v1";
  wrong.variants = [{ ...wrong.variants[0], id: "variant-r217-fixed-75", widthMm: 75, heightMm: 75 }];
  wrong.sizePolicy = { mode: "FIXED", aspectRatioLocked: true, defaultWidthMm: 75, defaultHeightMm: 75, minWidthMm: 75, maxWidthMm: 75 };
  state.productionElements.push(wrong);
  profile.productionNumberAssetIds = [wrong.id];
  profile.productionNumberAssetAssignmentsByHeight = { backNumber: { "HEIGHT_200.00": wrong.id } };
  profile.productionNumberAssetAssignmentEvidenceByHeight = { backNumber: { "HEIGHT_200.00": { assetId: wrong.id, targetHeightMm: 200, sourceHeightMm: 75, authority: "HUMAN_ACCEPTANCE" } } };
  const article = state.articles.find(({ id }) => id === "sp-live-116386");
  const item = { id: "item-r217-number", articleId: article.id, articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId, sourceProvenance: "R2.17 probe", foilColor: "Wit", quantity: 1, variants: [{ id: "variant-r217-number", quantity: 1, size: "XL", personalizationValues: { ...empty, backNumber: "28", backNumberSizeClass: "SENIOR" }, backNumberProduction: { status: "CONFIGURED", sizeClass: "SENIOR", physicalHeightMm: 200, source: "R2.17" } }] };
  const lines = resolveCanonicalProductionLines(state, "SP-R217-NUMBER", [item]);
  const order = { id: "SP-R217-NUMBER", revision: 1, orderKind: "INDIVIDUAL", association: article.association, associations: [article.association], sourceContext: { source: "STORE" }, items: [item], productionLines: lines };
  assert.equal(validateFinalProductionTruth(state, order, lines).status, "BLOCKED");
});
