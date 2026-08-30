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
  assessAuthoritativeProposalVisualProof,
  generateProposalPdf,
  proposalSnapshot,
  renderProposalPreview,
} from "../src/sportpaleis/teamkit-proposals.mjs";
import { canonicalTeamkitArticleSurfaceTruth } from "../src/sportpaleis/teamkit-product-surfaces.mjs";

const passwords = { kevin: "R226-Visual-Kevin!", patrick: "R226-Visual-Patrick!", collega: "R226-Visual-Store!", "donovan-support": "R226-Visual-Support!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r226-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  return { store, service, operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

function canonicalSnapshot(article) {
  const front = article.catalogMedia.find(({ kind }) => kind === "FRONT");
  const back = article.catalogMedia.find(({ kind }) => kind === "BACK") ?? null;
  return {
    catalogProductId: article.id,
    brand: article.teamwearCatalog?.brand ?? "Sportpaleis",
    supplierName: article.teamwearCatalog?.supplierName ?? "Sportpaleis",
    supplierArticleName: article.name,
    supplierArticleNumber: article.articleNumber,
    category: article.category,
    collection: null,
    audience: [],
    colorLabel: front.colorLabel,
    imageKey: front.imageKey,
    backImageKey: back?.imageKey ?? null,
    frontSourceUrl: front.sourceUrl,
    backSourceUrl: back?.sourceUrl ?? null,
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

function placement({ id, side, preset, text }) {
  return { id, kind: side === "BACK" ? "BACK_NUMBER" : "FREE_TEXT", label: text, side, preset, sourceId: null, productionAssetId: null, assetVersion: null, text, colorOverride: "#ffffff", widthPercent: 24, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: side === "BACK" ? 24 : 44 }, physicalSizeOverride: null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null };
}

function payload(article, placements) {
  return {
    title: `R2.26 visual proof ${article.articleNumber}`,
    customerName: "Reviewklant",
    contactName: "Teamcontact",
    customerEmail: "visual-proof@r226.test",
    items: [{ id: `item-${article.articleNumber}`, articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: article.catalogMedia.find(({ kind }) => kind === "FRONT").colorLabel, quantity: 1, sizes: article.availableSizes.slice(0, 1), team: null, notes: null, catalogSnapshot: canonicalSnapshot(article), placements }],
  };
}

async function createProposal(context, articleNumber, placements) {
  const { store, service, operator } = await fixture(context);
  const article = (await store.read()).articles.find((candidate) => candidate.articleNumber === articleNumber);
  assert.ok(article, articleNumber);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload(article, placements), `r226-${articleNumber}-${placements.map(({ id }) => id).join("-")}`);
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id);
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  return { store, service, operator, article, proposal, customerToken: access.path.split("/").at(-1) };
}

test("59 canonical BACK-printable artikelen zonder authoritative BACK-media worden als visual-approval gap geclassificeerd", () => {
  const state = createSportpaleisProductionBootstrap();
  const gaps = state.articles.filter((article) => canonicalTeamkitArticleSurfaceTruth(article).printableSides.includes("BACK") && !article.catalogMedia.some(({ kind, classification }) => kind === "BACK" && classification === "SOURCE_GALLERY_ORDER_V1"));
  assert.equal(gaps.length, 59);
  assert.ok(gaps.some(({ articleNumber }) => articleNumber === "116386"));
  assert.ok(gaps.every((article) => article.catalogMedia.some(({ kind, classification }) => kind === "FRONT" && classification === "SOURCE_GALLERY_ORDER_V1")));
});

test("printable BACK zonder authoritative BACK-media toont attention, nooit een fabricated garment-proof", async (context) => {
  const back = placement({ id: "back-34", side: "BACK", preset: "BACK_UPPER", text: "34" });
  const { store, proposal } = await createProposal(context, "116386", [back]);
  const state = await store.read();
  const persisted = state.teamkitProposals.find(({ id }) => id === proposal.id);
  const snapshot = proposalSnapshot(persisted, state);
  assert.equal(canonicalTeamkitArticleSurfaceTruth(state.articles.find(({ articleNumber }) => articleNumber === "116386")).printableSides.includes("BACK"), true, "physical production truth remains printable");
  assert.equal(snapshot.visualProof.status, "BLOCKED_FOR_VISUAL_APPROVAL");
  assert.deepEqual(snapshot.visualProof.issues.map(({ surface, code }) => ({ surface, code })), [{ surface: "BACK", code: "AUTHORITATIVE_SURFACE_MEDIA_MISSING" }]);
  const preview = renderProposalPreview(snapshot, { customer: true });
  assert.match(preview, /data-visual-proof-status="BLOCKED_FOR_VISUAL_APPROVAL"/u);
  const backFigure = preview.match(/<figure class="tk-garment tk-garment--visual-proof-blocked" data-visual-proof-surface="BACK"[\s\S]*?<\/figure>/u)?.[0] ?? "";
  assert.match(backFigure, /Achterzijde niet als productbeeld bewezen/u);
  assert.doesNotMatch(backFigure, /class="tk-shirt/u, "generic CSS garment is not visual evidence");
});

test("missing used BACK-media blocks approval status, approval mutation and PDF evidence", async (context) => {
  const back = placement({ id: "back-34", side: "BACK", preset: "BACK_UPPER", text: "34" });
  const { store, service, operator, proposal: initial, customerToken } = await createProposal(context, "116386", [back]);
  let proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, initial.id, { status: "READY_FOR_REVIEW", expectedRevision: initial.aggregateRevision });
  await assert.rejects(service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_APPROVAL", expectedRevision: proposal.aggregateRevision }), (error) => error.code === "TEAMKIT_VISUAL_APPROVAL_MEDIA_REQUIRED" && error.visualProof.status === "BLOCKED_FOR_VISUAL_APPROVAL");
  await store.mutate(async (state) => { const candidate = state.teamkitProposals.find(({ id }) => id === proposal.id); candidate.status = "SENT_TO_CUSTOMER"; return { state }; });
  await assert.rejects(service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Reviewer", customerEmail: "visual-proof@r226.test" }), (error) => error.code === "TEAMKIT_VISUAL_APPROVAL_MEDIA_REQUIRED");
  const state = await store.read();
  const persisted = state.teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(persisted.approval, null);
  assert.equal(persisted.status, "SENT_TO_CUSTOMER");
  await assert.rejects(generateProposalPdf(persisted.revisions.at(-1).snapshot, false, { state, proposal: persisted }), (error) => error.code === "TEAMKIT_VISUAL_APPROVAL_MEDIA_REQUIRED");
});

test("FRONT-only approval remains possible when only authoritative FRONT is used", async (context) => {
  const front = placement({ id: "front-name", side: "FRONT", preset: "FRONT_CENTER_LARGE", text: "SPORTPALEIS" });
  const { store, service, operator, proposal: initial, customerToken } = await createProposal(context, "116386", [front]);
  let proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, initial.id, { status: "READY_FOR_REVIEW", expectedRevision: initial.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_APPROVAL", expectedRevision: proposal.aggregateRevision });
  const approved = await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Reviewer", customerEmail: "visual-proof@r226.test" });
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.visualApproval.status, "PROVEN");
  const persisted = (await store.read()).teamkitProposals.find(({ id }) => id === initial.id);
  assert.match(Buffer.from(persisted.approval.pdfBase64, "base64").subarray(0, 5).toString("ascii"), /^%PDF-/u);
});

test("mixed FRONT/BACK approval succeeds only with exact variant-bound media for both used surfaces", async (context) => {
  const placements = [placement({ id: "front", side: "FRONT", preset: "CHEST_LEFT", text: "SP" }), placement({ id: "back", side: "BACK", preset: "BACK_UPPER", text: "34" })];
  const { store, service, operator, proposal: initial, customerToken } = await createProposal(context, "137293", placements);
  let proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, initial.id, { status: "READY_FOR_REVIEW", expectedRevision: initial.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_APPROVAL", expectedRevision: proposal.aggregateRevision });
  const approved = await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Reviewer", customerEmail: "visual-proof@r226.test" });
  assert.equal(approved.visualApproval.status, "PROVEN");

  let state = await store.read();
  const persisted = state.teamkitProposals.find(({ id }) => id === initial.id);
  const tampered = structuredClone(persisted.revisions.at(-1).snapshot);
  const other = state.articles.find(({ articleNumber }) => articleNumber === "131287");
  const otherProposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload(other, [placement({ id: "other-back", side: "BACK", preset: "FREE_PLACEMENT", text: "SP" })]), "r226-other-variant");
  state = await store.read();
  const otherPersisted = state.teamkitProposals.find(({ id }) => id === otherProposal.id);
  const otherSnapshot = proposalSnapshot(otherPersisted, state);
  tampered.items[0].visualGarmentSources.BACK = structuredClone(otherSnapshot.items[0].visualGarmentSources.BACK);
  assert.deepEqual(assessAuthoritativeProposalVisualProof(tampered).issues.map(({ code, surface }) => ({ code, surface })), [{ code: "AUTHORITATIVE_SURFACE_MEDIA_IDENTITY_CONFLICT", surface: "BACK" }]);
  await assert.rejects(generateProposalPdf(tampered, true, { state, proposal: persisted }), (error) => error.code === "TEAMKIT_VISUAL_APPROVAL_MEDIA_REQUIRED");
});
