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
import {
  approvedFulfillmentTasks,
  generateProposalPdf,
  normalizeProposalItems,
  proposalSnapshot,
  renderProposalPreview,
} from "../src/sportpaleis/teamkit-proposals.mjs";
import { assertCanonicalTeamkitItemSurfaceTruth, inferCanonicalTeamkitProductType } from "../src/sportpaleis/teamkit-product-surfaces.mjs";

const passwords = { kevin: "R221-Canonical-Kevin!", patrick: "R221-Canonical-Patrick!", collega: "R221-Canonical-Store!", "donovan-support": "R221-Canonical-Support!" };

function canonicalInitialsFixture() {
  const state = createSportpaleisProductionBootstrap();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "131240");
  const item = {
    id: "item-r221-as80", articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId,
    foilColor: "Wit", quantity: 1, sourceProvenance: "R2.21 canonical font binding",
    variants: [{ id: "person-r221", quantity: 1, size: "M", personalizationValues: { initials: "AB", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" } }],
  };
  const order = { id: "SP-R221-FONT", revision: 1, association: article.association, items: [item] };
  const lines = resolveCanonicalProductionLines(state, order.id, order.items);
  return { state, order: { ...order, productionLines: lines }, line: lines[0] };
}

function directItem(productType, printableSides, placements = []) {
  return {
    id: `item-${productType.toLowerCase()}`, articleId: null, articleNumber: "DIRECT-R221", productName: "Direct bronartikel", color: "Zwart", quantity: 1, sizes: ["M"], team: null, notes: null,
    catalogSnapshot: { catalogProductId: "proposal-source:front", brand: "Eigen bron", supplierName: "Directe bron", supplierArticleName: "Direct bronartikel", supplierArticleNumber: "DIRECT-R221", category: productType, collection: null, audience: [], colorLabel: "Zwart", imageKey: "proposal-source:front", backImageKey: null, advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "proposal-direct-source", sourceStatus: "AUTHORITATIVE", directFrontSourceId: "source-front", directBackSourceId: null, productType, printableSides, sourceReference: "R2.21 fixture" },
    placements,
  };
}

function textPlacement(extra = {}) {
  return { id: "placement-r221", kind: "FREE_TEXT", label: "CLUB", side: "FRONT", preset: "FRONT_CENTER_LARGE", sourceId: null, productionAssetId: null, assetVersion: null, text: "CLUB", colorOverride: null, widthPercent: 24, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: 44 }, physicalSizeOverride: null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null, ...extra };
}

test("canonical profile bindt exact de vereiste managed-font identity", () => {
  const { state, order, line } = canonicalInitialsFixture();
  assert.equal(line.source.kind, "FONT");
  assert.equal(line.source.id, "font-5d083befacdf98ae");
  assert.equal(validateFinalProductionTruth(state, order, [line]).status, "VALID");

  const liberation = state.productionFonts.find(({ id }) => id.startsWith("font-liberation"));
  const substituted = structuredClone(line);
  substituted.source = { kind: "FONT", id: liberation.id, version: liberation.version, sha256: liberation.sha256 };
  const wrongFont = validateFinalProductionTruth(state, { ...order, productionLines: [substituted] }, [substituted]);
  assert.equal(wrongFont.status, "BLOCKED");
  assert.ok(wrongFont.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("juiste naam met verkeerde hash en ontbrekende canonical source blijven fail-closed", () => {
  const fixture = canonicalInitialsFixture();
  const wrongHashState = structuredClone(fixture.state);
  const spain = wrongHashState.productionFonts.find(({ id }) => id === fixture.line.source.id);
  spain.sha256 = "A".repeat(64);
  const wrongHashLine = structuredClone(fixture.line); wrongHashLine.source.sha256 = spain.sha256;
  assert.equal(validateFinalProductionTruth(wrongHashState, { ...fixture.order, productionLines: [wrongHashLine] }, [wrongHashLine]).status, "BLOCKED");

  const missingState = structuredClone(fixture.state);
  missingState.productionFonts = missingState.productionFonts.filter(({ id }) => id !== fixture.line.source.id);
  assert.equal(validateFinalProductionTruth(missingState, fixture.order, [fixture.line]).status, "BLOCKED");
});

test("canonical product surface accepteert alleen geldige subset en placement", () => {
  const validUpper = normalizeProposalItems([directItem("UPPER_GARMENT", ["FRONT", "BACK"], [textPlacement({ side: "BACK", preset: "BACK_UPPER" })])]);
  assert.equal(validUpper[0].placements[0].preset, "BACK_UPPER");
  const validBag = normalizeProposalItems([directItem("SPORTS_BAG", ["FRONT", "BACK"], [textPlacement({ side: "BACK", preset: "FREE_PLACEMENT" })])]);
  assert.equal(assertCanonicalTeamkitItemSurfaceTruth(validBag[0]).productType, "SPORTS_BAG");
  assert.equal(inferCanonicalTeamkitProductType({ name: "Academy Rugtas" }), "BACKPACK");
  assert.equal(inferCanonicalTeamkitProductType({ name: "Academy Sporttas" }), "SPORTS_BAG");
});

test("client kan geen verboden zijde of placement tot immutable truth promoveren", () => {
  assert.throws(() => normalizeProposalItems([directItem("BACKPACK", ["FRONT", "BACK"], [textPlacement({ side: "BACK", preset: "BACK_UPPER" })])]), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
  assert.throws(() => normalizeProposalItems([directItem("LOWER_GARMENT", ["FRONT"], [textPlacement({ side: "FRONT", preset: "CHEST_LEFT" })])]), (error) => error.code === "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED");
  assert.throws(() => normalizeProposalItems([directItem("UPPER_GARMENT", ["FRONT", "BACK"], [textPlacement({ side: "FRONT", preset: "BACK_UPPER" })])]), (error) => error.code === "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED");
  const mixed = directItem("UPPER_GARMENT", ["FRONT", "BACK"], [
    textPlacement({ id: "valid-front", side: "FRONT", preset: "CHEST_LEFT" }),
    textPlacement({ id: "invalid-back", side: "BACK", preset: "CHEST_RIGHT" }),
  ]);
  assert.throws(() => normalizeProposalItems([mixed]), (error) => error.code === "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED" && error.placementId === "invalid-back");
});

test("preview, PDF en handoff weigeren ook reeds vervalste persisted truth", async () => {
  const forged = directItem("BACKPACK", ["FRONT", "BACK"], [textPlacement({ side: "BACK", preset: "BACK_UPPER" })]);
  const proposal = { id: "proposal-r221", proposalNumber: "PV-R221", currentRevision: 1, title: "R2.21", type: "Teamwear", customer: { id: null, name: "Review", contactName: "", email: "", phone: null }, association: { id: null, name: null }, team: null, season: null, category: null, deadline: null, notes: null, items: [forged], sources: [], productionSizing: null };
  const snapshot = { proposalId: proposal.id, proposalNumber: proposal.proposalNumber, revision: 1, title: proposal.title, type: proposal.type, customer: proposal.customer, association: proposal.association, team: null, season: null, category: null, deadline: null, notes: null, items: [forged], sourceRefs: [] };
  assert.throws(() => proposalSnapshot(proposal, { articles: [], productionElements: [], associations: [] }), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
  assert.throws(() => renderProposalPreview(snapshot), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
  await assert.rejects(generateProposalPdf(snapshot, false, { state: { articles: [], productionElements: [], associations: [] }, proposal }), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
  assert.throws(() => approvedFulfillmentTasks(proposal, { number: 1, snapshot }, { productionElements: [] }), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
});

test("server-authoritative bekend artikel weigert client producttype-conflict atomair", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r221-")); context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const state = await store.read(); const backpack = state.articles.find(({ articleNumber }) => articleNumber === "131285"); const before = state.teamkitProposals.length;
  const malicious = directItem("SPORTS_BAG", ["FRONT", "BACK"], [textPlacement({ side: "BACK", preset: "FREE_PLACEMENT" })]); malicious.articleId = backpack.id; malicious.articleNumber = backpack.articleNumber; malicious.catalogSnapshot.directFrontSourceId = null; malicious.catalogSnapshot.imageKey = backpack.imageKey;
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Rugtas conflict", customerName: "Review", items: [malicious] }, "r221-product-conflict"), (error) => error.code === "TEAMKIT_PRODUCT_TYPE_CONFLICT");
  assert.equal((await store.read()).teamkitProposals.length, before);
});
