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

const passwords = { kevin: "R222-Canonical-Kevin!", patrick: "R222-Canonical-Patrick!", collega: "R222-Canonical-Store!", "donovan-support": "R222-Canonical-Support!" };
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#111"/></svg>');

function unresolvedProfileFixture(fontProfile = "FFF englisch") {
  const state = createSportpaleisProductionBootstrap();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "116388");
  const item = {
    id: "r222-item", articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId,
    foilColor: "Wit", quantity: 1, sourceProvenance: "R2.22 canonical-font challenge",
    variants: [{ id: "r222-person", quantity: 1, size: "M", personalizationValues: { initials: "", initialsInfix: "", name: "NOVA", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" } }],
  };
  const profile = state.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  profile.fontProfile = fontProfile;
  delete profile.canonicalFontSourceId;
  const order = { id: `SP-R222-${fontProfile.replace(/\W+/gu, "-")}`, revision: 1, association: article.association, items: [item] };
  const line = resolveCanonicalProductionLines(state, order.id, order.items)[0];
  const liberation = state.productionFonts.find(({ id }) => id.startsWith("font-liberation"));
  line.source = { kind: "FONT", id: liberation.id, version: liberation.version, sha256: liberation.sha256 };
  line.validation = { status: "VALID", reason: null };
  return { state, profile, order: { ...order, productionLines: [line] }, line, liberation };
}

function directPayload({ filename = "131285-front.svg", productType = "BACKPACK", printableSides = ["FRONT"], placements = [], authoritativeIdentity = true } = {}) {
  return {
    title: "R2.22 source-first identity", customerName: "Reviewklant",
    sources: [{ clientRef: "front", filename, mimeType: "image/svg+xml", dataBase64: svg.toString("base64") }],
    items: [{
      id: "r222-direct-item", articleId: null, articleNumber: filename.startsWith("131285") ? "131285" : "DIRECT-UNKNOWN", productName: "Direct productbeeld", color: "Zwart", quantity: 1, sizes: ["ONE"], team: null, notes: null,
      catalogSnapshot: { catalogProductId: "proposal-source:front", brand: "Eigen bron", supplierName: "Directe bron", supplierArticleName: "Direct productbeeld", supplierArticleNumber: filename.startsWith("131285") ? "131285" : "DIRECT-UNKNOWN", category: productType, collection: null, audience: [], colorLabel: "Zwart", imageKey: "proposal-source:front", backImageKey: null, advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "proposal-direct-source", sourceStatus: "AUTHORITATIVE", directFrontSourceRef: "front", directBackSourceRef: null, productType, printableSides, sourceReference: filename, ...(authoritativeIdentity ? { sourceProductId: "85835", sourceColorId: "12079", mediaClassification: "SOURCE_GALLERY_ORDER_V1" } : {}) },
      placements,
    }],
  };
}

function placement({ side = "FRONT", preset = "FRONT_CENTER_LARGE" } = {}) {
  return { id: "r222-placement", kind: "FREE_TEXT", label: "TEST", side, preset, sourceId: null, productionAssetId: null, assetVersion: null, text: "TEST", colorOverride: null, widthPercent: 24, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: 44 }, physicalSizeOverride: null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null };
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r222-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { store, service, operator };
}

test("een werkelijk unresolved fontprofiel accepteert geen technisch geldig Liberation Sans", () => {
  const { state, order, line } = unresolvedProfileFixture("Historisch ontbrekend lettertype");
  const result = validateFinalProductionTruth(state, order, [line]);
  assert.equal(result.status, "BLOCKED");
  assert.ok(result.findings.some(({ code }) => code === "PRODUCTION_CANONICAL_FONT_UNRESOLVED"));
  assert.ok(result.findings.some(({ code }) => code === "PRODUCTION_SOURCE_ROLE_MISMATCH"));
});

test("meerdere werkelijk unresolved fontprofielen blijven generiek fail-closed", () => {
  for (const name of ["Ontbrekend lettertype A", "Ontbrekend lettertype B"]) {
    const { state, order, line } = unresolvedProfileFixture(name);
    const result = validateFinalProductionTruth(state, order, [line]);
    assert.equal(result.status, "BLOCKED", name);
    assert.ok(result.findings.some(({ code }) => code === "PRODUCTION_CANONICAL_FONT_UNRESOLVED"), name);
  }
});

test("resolved FFF englisch vereist exact dezelfde authoritative identity", () => {
  const exact = unresolvedProfileFixture("FFF englisch");
  const authoritative = { ...structuredClone(exact.liberation), id: "font-r222-fff-englisch", name: "FFF englisch", authoritativeIdentity: "font-r222-fff-englisch", provenance: "R2.22 isolated authoritative test master" };
  exact.state.productionFonts.push(authoritative);
  exact.profile.canonicalFontSourceId = authoritative.id;
  exact.line.source = { kind: "FONT", id: authoritative.id, version: authoritative.version, sha256: authoritative.sha256 };
  const valid = validateFinalProductionTruth(exact.state, { ...exact.order, productionLines: [exact.line] }, [exact.line]);
  assert.equal(valid.status, "VALID");

  exact.line.source = { kind: "FONT", id: exact.liberation.id, version: exact.liberation.version, sha256: exact.liberation.sha256 };
  assert.equal(validateFinalProductionTruth(exact.state, { ...exact.order, productionLines: [exact.line] }, [exact.line]).status, "BLOCKED");
});

test("Spain resolved met exacte authoritative hash blijft production-valid en verkeerde hash niet", () => {
  const state = createSportpaleisProductionBootstrap();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "131240");
  const item = { id: "r222-spain", articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId, foilColor: "Wit", quantity: 1, sourceProvenance: "R2.22 Spain anchor", variants: [{ id: "r222-spain-person", quantity: 1, size: "M", personalizationValues: { initials: "AB", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" } }] };
  const order = { id: "SP-R222-SPAIN", revision: 1, association: article.association, items: [item] };
  const line = resolveCanonicalProductionLines(state, order.id, order.items)[0];
  assert.equal(line.source.id, "font-5d083befacdf98ae");
  assert.equal(validateFinalProductionTruth(state, { ...order, productionLines: [line] }, [line]).status, "VALID");
  const wrong = structuredClone(line); wrong.source.sha256 = "A".repeat(64);
  assert.equal(validateFinalProductionTruth(state, { ...order, productionLines: [wrong] }, [wrong]).status, "BLOCKED");
});

test("source-first upload met exact officiële variantidentity krijgt server-authoritative backpacktruth", async (context) => {
  const { store, service, operator } = await fixture(context);
  const proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, directPayload(), "r222-source-resolved");
  const item = proposal.items[0];
  assert.equal(item.articleId, "sp-live-131285");
  assert.equal(item.articleNumber, "131285");
  assert.equal(item.catalogSnapshot.canonicalProductIdentity.sourceArticleId, "sp-live-131285");
  assert.equal(item.catalogSnapshot.canonicalProductIdentity.productType, "BACKPACK");
  assert.deepEqual(item.catalogSnapshot.canonicalProductIdentity.physicalSides, ["FRONT", "BACK"]);
  assert.deepEqual(item.catalogSnapshot.canonicalProductIdentity.printableSides, ["FRONT"]);
  assert.match(item.catalogSnapshot.canonicalProductIdentity.evidenceHash, /^[a-f0-9]{64}$/u);
  const persisted = (await store.read()).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.deepEqual(persisted.revisions[0].snapshot.items[0].catalogSnapshot.canonicalProductIdentity, item.catalogSnapshot.canonicalProductIdentity);
});

test("onvoldoende source-first identity blijft ondanks client-producttype atomair geblokkeerd", async (context) => {
  const { store, service, operator } = await fixture(context);
  const before = (await store.read()).teamkitProposals.length;
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, directPayload({ filename: "131285-but-client-controlled.svg", productType: "UPPER_GARMENT", printableSides: ["FRONT", "BACK"], authoritativeIdentity: false }), "r222-source-unresolved"), (error) => error.code === "TEAMKIT_CANONICAL_PRODUCT_IDENTITY_UNRESOLVED");
  assert.equal((await store.read()).teamkitProposals.length, before);
});

test("client kan type, zijde of placement van server-bound rugtas niet promoveren", async (context) => {
  const { store, service, operator } = await fixture(context);
  const before = (await store.read()).teamkitProposals.length;
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, directPayload({ productType: "SPORTS_BAG", printableSides: ["FRONT", "BACK"] }), "r222-type-conflict"), (error) => error.code === "TEAMKIT_PRODUCT_TYPE_CONFLICT");
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, directPayload({ printableSides: ["FRONT", "BACK"] }), "r222-side-conflict"), (error) => error.code === "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE");
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, directPayload({ placements: [placement({ side: "FRONT", preset: "BACK_UPPER" })] }), "r222-placement-conflict"), (error) => error.code === "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED");
  assert.equal((await store.read()).teamkitProposals.length, before);
});

test("legacy-vorm zonder serverbinding kan geen client-productsurface tot immutable truth promoveren", async (context) => {
  const { store, service, operator } = await fixture(context);
  const before = (await store.read()).teamkitProposals.length;
  const payload = directPayload({ authoritativeIdentity: false });
  delete payload.items[0].catalogSnapshot;
  payload.items[0].placements = [placement({ side: "FRONT", preset: "FRONT_CENTER_LARGE" })];
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, payload, "r222-no-snapshot-bypass"), (error) => error.code === "TEAMKIT_CANONICAL_PRODUCT_IDENTITY_UNRESOLVED");
  assert.equal((await store.read()).teamkitProposals.length, before);
});
