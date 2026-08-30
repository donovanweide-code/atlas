import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  WBD_REVIEW_AUDIT_RETENTION_POLICY,
  WbdReviewDeveloperAccessPolicy,
} from "../scripts/wbd-review-developer-access.mjs";
import {
  generateProposalPdf,
  proposalSnapshot,
  renderProposalPreview,
} from "../src/sportpaleis/teamkit-proposals.mjs";
import { canonicalTeamkitArticleSurfaceTruth } from "../src/sportpaleis/teamkit-product-surfaces.mjs";

const passwords = { kevin: "R224-Media-Kevin!", patrick: "R224-Media-Patrick!", collega: "R224-Media-Store!", "donovan-support": "R224-Media-Support!" };
const directSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#111"/></svg>');

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r224-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const filePath = path.join(root, "state.json");
  const backupDirectory = path.join(root, "backups");
  const store = new SportpaleisFileStore({ filePath, backupDirectory, seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { root, filePath, backupDirectory, store, service, operator };
}

function canonicalSnapshot(article) {
  const front = article.catalogMedia.find(({ kind }) => kind === "FRONT");
  const back = article.catalogMedia.find(({ kind }) => kind === "BACK") ?? null;
  return {
    catalogProductId: article.id,
    brand: "Sportpaleis",
    supplierName: "Sportpaleis",
    supplierArticleName: article.name,
    supplierArticleNumber: article.articleNumber,
    category: article.category,
    collection: null,
    audience: [],
    colorLabel: front.colorLabel,
    imageKey: front.imageKey,
    backImageKey: back?.imageKey ?? null,
    frontImageUrl: front.sourceUrl,
    backImageUrl: back?.sourceUrl ?? null,
    sourceProductId: front.sourceProductId,
    sourceColorId: front.sourceColorId,
    mediaClassification: front.classification,
    sourceAdapterId: "sportpaleis-live-products",
    sourceStatus: "AUTHORITATIVE",
    directFrontSourceId: null,
    directBackSourceId: null,
    productType: null,
    printableSides: null,
    sourceReference: article.catalogProvenance.url,
  };
}

function placement({ kind = "FREE_TEXT", side = "FRONT", preset = "FRONT_CENTER_LARGE", text = "TEST" } = {}) {
  return {
    id: `r224-placement-${side.toLowerCase()}`,
    kind,
    label: text,
    side,
    preset,
    sourceId: null,
    productionAssetId: null,
    assetVersion: null,
    text,
    colorOverride: "WIT",
    widthPercent: 24,
    visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: 44 },
    physicalSizeOverride: null,
    route: "INTERN_BEDRUKKEN",
    supplierName: null,
    note: null,
  };
}

function proposalPayload(article, overrides = {}) {
  return {
    title: `R2.24 ${article.articleNumber}`,
    customerName: "Reviewklant",
    items: [{
      id: `r224-item-${article.articleNumber}`,
      articleId: article.id,
      articleNumber: article.articleNumber,
      productName: article.name,
      color: article.catalogMedia.find(({ kind }) => kind === "FRONT")?.colorLabel ?? "Onbekend",
      quantity: 1,
      sizes: article.availableSizes.slice(0, 1),
      team: null,
      notes: null,
      catalogSnapshot: canonicalSnapshot(article),
      placements: [placement()],
      ...overrides,
    }],
  };
}

test("article, revision, preview en PDF blijven atomair aan dezelfde canonical media-identity gebonden", async (context) => {
  const { store, service, operator } = await fixture(context);
  const state = await store.read();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "131285");
  const proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, proposalPayload(article), "r224-media-correct");
  const item = proposal.items[0];
  assert.equal(item.articleId, article.id);
  assert.equal(item.articleNumber, article.articleNumber);
  assert.equal(item.catalogSnapshot.catalogProductId, article.id);
  assert.equal(item.catalogSnapshot.imageKey, "sp-live-131285");
  assert.equal(item.catalogSnapshot.backImageKey, "sp-live-131285-back");
  assert.equal(item.catalogSnapshot.sourceProductId, "85835");

  const persistedState = await store.read();
  const persisted = persistedState.teamkitProposals.find(({ id }) => id === proposal.id);
  const revision = persisted.revisions[0].snapshot.items[0];
  assert.equal(revision.articleId, article.id);
  assert.equal(revision.catalogSnapshot.imageKey, "sp-live-131285");
  assert.equal(revision.catalogSnapshot.sourceProductId, "85835");

  const snapshot = proposalSnapshot(persisted, persistedState);
  assert.equal(snapshot.items[0].articleId, article.id);
  assert.equal(snapshot.items[0].catalogSnapshot.imageKey, "sp-live-131285");
  assert.match(renderProposalPreview(snapshot), /<small>131285<\/small>/u);
  const pdf = await generateProposalPdf(snapshot, false, { state: persistedState, proposal: persisted });
  assert.ok(pdf.length > 1_000);
});

test("SKU 131285 met media van 131287 faalt atomair zonder proposal of revision", async (context) => {
  const { store, service, operator } = await fixture(context);
  const state = await store.read();
  const backpack = state.articles.find(({ articleNumber }) => articleNumber === "131285");
  const sportsBag = state.articles.find(({ articleNumber }) => articleNumber === "131287");
  const before = state.teamkitProposals.length;
  const payload = proposalPayload(backpack);
  payload.items[0].catalogSnapshot = canonicalSnapshot(sportsBag);
  await assert.rejects(
    service.createTeamkitProposal(operator.token, operator.csrfToken, payload, "r224-media-mismatch"),
    (error) => error.code === "TEAMKIT_ARTICLE_MEDIA_IDENTITY_CONFLICT",
  );
  assert.equal((await store.read()).teamkitProposals.length, before);
});

test("sterk gelijkende variant en losse client-media kunnen canonical article media niet vervangen", async (context) => {
  const { store, service, operator } = await fixture(context);
  const state = await store.read();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "131285");
  const lookalike = state.articles.find(({ articleNumber }) => articleNumber === "131287");
  const before = state.teamkitProposals.length;
  const payload = proposalPayload(article);
  payload.items[0].catalogSnapshot.frontSourceUrl = lookalike.catalogMedia.find(({ kind }) => kind === "FRONT").sourceUrl;
  await assert.rejects(
    service.createTeamkitProposal(operator.token, operator.csrfToken, payload, "r224-lookalike-media"),
    (error) => error.code === "TEAMKIT_ARTICLE_MEDIA_IDENTITY_CONFLICT",
  );
  assert.equal((await store.read()).teamkitProposals.length, before);
});

test("correct geverifieerde source-first media blijft klantmedia maar is atomair aan canonical article identity gebonden", async (context) => {
  const { store, service, operator } = await fixture(context);
  const state = await store.read();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "131285");
  const payload = proposalPayload(article);
  payload.sources = [{ clientRef: "front", filename: "131285-front.svg", mimeType: "image/svg+xml", dataBase64: directSvg.toString("base64") }];
  payload.items[0].articleId = null;
  payload.items[0].catalogSnapshot.directFrontSourceRef = "front";
  payload.items[0].catalogSnapshot.imageKey = "proposal-source:front";
  const proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload, "r224-direct-media-bound");
  const item = proposal.items[0];
  assert.equal(item.articleId, article.id);
  assert.equal(item.articleNumber, article.articleNumber);
  assert.equal(item.catalogSnapshot.canonicalProductIdentity.sourceArticleId, article.id);
  assert.equal(item.catalogSnapshot.imageKey, "proposal-source:front");
  assert.ok(item.catalogSnapshot.directFrontSourceId);
  assert.equal(item.catalogSnapshot.sourceProductId, "85835");
});

test("canonical article truth classificeert keeper-set, jack, broek, rugtas en sporttas zonder runtime naamheuristiek", () => {
  const state = createSportpaleisProductionBootstrap();
  const expected = new Map([
    ["137293", ["UPPER_GARMENT", ["FRONT", "BACK"]]],
    ["109104", ["UPPER_GARMENT", ["FRONT", "BACK"]]],
    ["140304", ["LOWER_GARMENT", ["FRONT"]]],
    ["141707", ["BACKPACK", ["FRONT"]]],
    ["141708", ["SPORTS_BAG", ["FRONT", "BACK"]]],
  ]);
  for (const [articleNumber, [productType, printableSides]] of expected) {
    const article = state.articles.find((candidate) => candidate.articleNumber === articleNumber);
    const truth = canonicalTeamkitArticleSurfaceTruth(article);
    assert.equal(truth.productType, productType, articleNumber);
    assert.deepEqual(truth.printableSides, printableSides, articleNumber);
    assert.equal(truth.authority, "SPORTPALEIS_PRODUCT_TRUTH_RECONCILIATION_R224", articleNumber);
  }
  assert.throws(
    () => canonicalTeamkitArticleSurfaceTruth({ id: "unknown", articleNumber: "UNKNOWN", name: "Keeper set rugnummer" }),
    (error) => error.code === "TEAMKIT_CANONICAL_ARTICLE_SURFACE_UNRESOLVED",
  );
});

test("alle 183 actuele Teamwear-artikelen hebben expliciete server-authoritative surface truth", () => {
  const state = createSportpaleisProductionBootstrap();
  assert.equal(state.articles.length, 183);
  for (const article of state.articles) {
    const truth = canonicalTeamkitArticleSurfaceTruth(article);
    assert.equal(truth.authority, "SPORTPALEIS_PRODUCT_TRUTH_RECONCILIATION_R224", article.articleNumber);
    assert.ok(truth.printableSides.length >= 1, article.articleNumber);
  }
});

test("keeper-set 137293 gebruikt canonical BACK truth en onbekende article truth blijft geblokkeerd", async (context) => {
  const { store, service, operator } = await fixture(context);
  const state = await store.read();
  const keeper = state.articles.find(({ articleNumber }) => articleNumber === "137293");
  const payload = proposalPayload(keeper, { placements: [placement({ kind: "BACK_NUMBER", side: "BACK", preset: "BACK_UPPER", text: "34" })] });
  const proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload, "r224-keeper-back");
  assert.equal(proposal.items[0].catalogSnapshot.canonicalProductIdentity.productType, "UPPER_GARMENT");
  assert.deepEqual(proposal.items[0].catalogSnapshot.canonicalProductIdentity.printableSides, ["FRONT", "BACK"]);
  assert.equal(proposal.items[0].placements[0].side, "BACK");
});

test("Human-GO, grant en session evidence blijven na meer dan 2000 acties append-only en restart-persistent", async (context) => {
  const { filePath, backupDirectory, store } = await fixture(context);
  const state = await store.read();
  const policy = new WbdReviewDeveloperAccessPolicy({ issuerPrincipalIds: ["kevin"], allowedCandidateIds: ["r224"], tenantId: "sportpaleis" });
  const start = new Date("2026-08-30T08:00:00.000Z");
  const issued = policy.issueGrant(state, {
    issuer: { id: "kevin", role: "admin", status: "Actief" },
    tenantId: "sportpaleis",
    candidateId: "r224",
    scopes: ["candidate.review.read"],
    humanGoReference: "GO-R224-AUDIT-RETENTION",
    ttlMs: 4 * 60 * 60 * 1_000,
  }, start);
  const activated = policy.activateGrant(state, { activationToken: issued.activationToken, tenantId: "sportpaleis", candidateId: "r224" }, new Date(start.getTime() + 1_000));
  for (let index = 0; index < 2_005; index += 1) {
    policy.authorizeCapability(state, {
      sessionToken: activated.sessionToken,
      tenantId: "sportpaleis",
      candidateId: "r224",
      capability: "candidate.review.read",
      method: "GET",
      route: `/review/evidence/${index}`,
    }, new Date(start.getTime() + 2_000 + index));
  }
  assert.ok(state.audit.length > 2_000);
  assert.deepEqual(state.reviewDeveloperAccess.auditRetentionPolicy, WBD_REVIEW_AUDIT_RETENTION_POLICY);
  assert.ok(state.audit.some(({ action, details }) => action === "Tijdelijke Codex-reviewtoegang geautoriseerd" && details.humanGoReference === "GO-R224-AUDIT-RETENTION"));
  assert.ok(state.audit.some(({ action }) => action === "Tijdelijke Codex-reviewsessie gestart"));

  await store.mutate(async () => ({ state, value: null }));
  const restarted = new SportpaleisFileStore({ filePath, backupDirectory, seedPasswords: passwords });
  await restarted.initialize();
  const persisted = await restarted.read();
  assert.equal(persisted.audit.length, state.audit.length);
  assert.ok(persisted.audit.some(({ action, details }) => action === "Tijdelijke Codex-reviewtoegang geautoriseerd" && details.humanGoReference === "GO-R224-AUDIT-RETENTION"));
  assert.ok(persisted.audit.some(({ action }) => action === "Tijdelijke Codex-reviewsessie gestart"));
  assert.deepEqual(persisted.reviewDeveloperAccess.auditRetentionPolicy, WBD_REVIEW_AUDIT_RETENTION_POLICY);
});
