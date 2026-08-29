import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalProductionProfileForDecoration,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { buildTeamwearCatalog, queryTeamwearCatalog } from "../src/sportpaleis-teamwear-foundations.ts";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R29-Canonical-Kevin!", patrick: "R29-Canonical-Patrick!", collega: "R29-Canonical-Store!", "donovan-support": "R29-Canonical-Support!" };
const proposalSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M5 5H115V75H5Z"/></svg>');
const productionSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80"><path d="M10 10H150V70H10Z"/></svg>');

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r29-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

function placement(id, kind, text, extra = {}) {
  return { id, kind, label: id, side: kind === "BACK_NUMBER" ? "BACK" : "FRONT", preset: kind === "BACK_NUMBER" ? "BACK_UPPER" : "CHEST_LEFT", sourceId: null, productionAssetId: null, assetVersion: null, text, colorOverride: null, widthPercent: 24, physicalSizeOverride: null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null, ...extra };
}

async function approve(service, operator, proposal, items) {
  const issued = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id);
  const customerToken = issued.path.split("/").at(-1);
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items, reason: "R2.9 canonical production truth" });
  for (const status of ["READY_FOR_REVIEW", "READY_FOR_APPROVAL"]) proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status, expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "R2.9 Reviewer", customerEmail: "reviewer@r29.test" });
  return (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
}

test("één decoration-specifieke resolver voorkomt base-profile interpretatieverlies", async (context) => {
  const { store } = await fixture(context); const state = await store.read();
  const buitenboys = state.articles.find(({ articleNumber }) => articleNumber === "140298");
  const pioneers = state.articles.find(({ articleNumber }) => articleNumber === "116386");
  const intent = (article) => ({ articleNumber: article.articleNumber, association: article.association, productionProfileId: article.profileId });
  assert.equal(canonicalProductionProfileForDecoration(state, intent(buitenboys), "initials").profile.id, "profile-source-sc-buitenboys-initials");
  assert.equal(canonicalProductionProfileForDecoration(state, intent(buitenboys), "backNumber").profile.id, "profile-source-sc-buitenboys-backNumber");
  assert.equal(canonicalProductionProfileForDecoration(state, intent(buitenboys), "chestNumber").profile.id, "profile-source-sc-buitenboys-initials");
  assert.equal(canonicalProductionProfileForDecoration(state, intent(pioneers), "backNumber").profile.id, "profile-pioneers-shirt");
  assert.equal(canonicalProductionProfileForDecoration(state, intent(pioneers), "chestNumber").profile.id, "profile-source-almere-pioneers-chestNumber");
});

test("gemengde Junior/Senior-aantallen materialiseren afzonderlijke fysieke waarheden", async (context) => {
  const { service, operator } = await fixture(context); const bootstrap = await service.bootstrap(operator.token); const article = bootstrap.articles.find(({ articleNumber }) => articleNumber === "140298");
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Buitenboys mixed sizing", customerName: "SC Buitenboys", contactName: "R2.9 Reviewer", customerEmail: "reviewer@r29.test", associationName: "SC Buitenboys" });
  const item = { id: "item-buitenboys-shirt", articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: "Navy", quantity: null, sizes: [], team: "Gemengde groep", notes: null, placements: [placement("rugnummer-17", "BACK_NUMBER", "17")] };
  proposal = await approve(service, operator, proposal, [item]);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: item.id, sizeQuantities: [{ size: "140", quantity: 2 }, { size: "M", quantity: 3 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  const lines = prepared.orders[0].productionLines;
  assert.deepEqual(lines.map(({ heightMm, quantity }) => ({ heightMm, quantity })).sort((a, b) => a.heightMm - b.heightMm), [{ heightMm: 200, quantity: 2 }, { heightMm: 220, quantity: 3 }]);
  assert.deepEqual(new Set(lines.map(({ personalizationField }) => personalizationField)), new Set(["backNumber"]));
  assert.ok(lines.every(({ decorationIdentity }) => decorationIdentity.articleNumber === "140298" && decorationIdentity.decorationType === "backNumber" && decorationIdentity.value === "17"));
  assert.equal(new Set(lines.map(({ decorationIdentity }) => decorationIdentity.targetGroup)).size, 2);
  assert.ok(lines.every(({ decorationIdentity, teamkitProductionContext }) => decorationIdentity.productionProfileId === teamkitProductionContext.profileId));
});

test("Studio-kleur resolveert naar dezelfde beheerde fysieke foliewaarheid", async (context) => {
  const { service, operator } = await fixture(context); const bootstrap = await service.bootstrap(operator.token); const article = bootstrap.articles.find(({ articleNumber }) => articleNumber === "140298");
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Managed blue foil", customerName: "SC Buitenboys", contactName: "R2.9 Reviewer", customerEmail: "reviewer@r29.test", associationName: "SC Buitenboys" });
  const item = { id: "item-managed-blue", articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [placement("rugnummer-34-blue", "BACK_NUMBER", "34", { colorOverride: "#175ec7" })] };
  proposal = await approve(service, operator, proposal, [item]);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: item.id, sizeQuantities: [{ size: "M", quantity: 1 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  const line = prepared.orders[0].productionLines[0];
  assert.equal(line.foilColor, "Blauw");
  assert.equal(line.decorationIdentity.foilColor, "Blauw");
  assert.ok(!line.dataGap?.fields.includes("FOIL_COLOR"), "een beheerde blauwe Studio-kleur mag geen false foliekleurblocker opleveren");
});

test("proposal-evidence en production-ready asset blijven legitiem verschillende rollen", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "production-logo.svg", mimeType: "image/svg+xml", dataBase64: productionSvg.toString("base64"), provenance: "R2.9 production master", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates[0];
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "R2.9 production logo", ownerType: "ASSOCIATION", ownerName: "A.S.C. Waterwijk", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: 80 * candidate.boundsMm.height / candidate.boundsMm.width, sizePolicyMode: "FIXED", defaultFoilColor: "Wit", contexts: [{ type: "ASSOCIATION", id: "asc-waterwijk", label: "A.S.C. Waterwijk" }], applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Asset role reconciliation", customerName: "Waterwijk", contactName: "R2.9 Reviewer", customerEmail: "reviewer@r29.test", associationName: "A.S.C. Waterwijk" });
  const proposalSource = await service.addTeamkitProposalSource(operator.token, operator.csrfToken, proposal.id, { filename: "customer-proof.svg", mimeType: "image/svg+xml", dataBase64: proposalSvg.toString("base64") });
  const item = { id: "item-logo", articleId: null, articleNumber: "LOGO-JOB", productName: "Trainingstop", color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [placement("clublogo", "CLUB_LOGO", null, { sourceId: proposalSource.source.id, productionAssetId: asset.id, assetVersion: asset.version })] };
  proposal = await approve(service, operator, proposal, [item]);
  const task = proposal.fulfillmentTasks[0];
  assert.equal(task.assetRef.proposalSource.role, "PROPOSAL_EVIDENCE");
  assert.equal(task.assetRef.productionAsset.role, "PRODUCTION_READY");
  assert.notEqual(task.assetRef.proposalSource.sha256, task.assetRef.productionAsset.sha256);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: item.id, sizeQuantities: [{ size: "M", quantity: 4 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  assert.equal(prepared.orders[0].productionLines[0].validation.status, "VALID");
  assert.equal(prepared.orders[0].productionLines[0].source.id, asset.id);
});

test("source-first creatie is atomair en retry-idempotent", async (context) => {
  const { store, service, operator } = await fixture(context); const key = "r29-atomic-source-first-001";
  const payload = { title: "Atomic source first", customerName: "Reviewklant", sources: [{ clientRef: "front", filename: "front.svg", mimeType: "image/svg+xml", dataBase64: proposalSvg.toString("base64") }], items: [{ id: "item-atomic", articleId: null, articleNumber: "AT-1", productName: "Eigen shirt", color: "Rood", quantity: null, sizes: [], team: null, notes: null, catalogSnapshot: { catalogProductId: "proposal-source:front", brand: "Eigen bron", supplierName: "Directe bron", supplierArticleName: "Eigen shirt", supplierArticleNumber: "AT-1", category: "UPPER_GARMENT", colorLabel: "Rood", audience: [], advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "proposal-direct-source", sourceReference: "front.svg", imageKey: "proposal-source:front", backImageKey: null, directFrontSourceId: null, directBackSourceId: null, directFrontSourceRef: "front", directBackSourceRef: null, productType: "UPPER_GARMENT", printableSides: ["FRONT", "BACK"], sourceStatus: "AUTHORITATIVE" }, placements: [] }] };
  const first = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload, key);
  const retry = await service.createTeamkitProposal(operator.token, operator.csrfToken, payload, key);
  assert.equal(retry.id, first.id); assert.equal((await store.read()).teamkitProposals.filter(({ id }) => id === first.id).length, 1);
  const before = (await store.read()).teamkitProposals.length;
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, { ...payload, title: "Invalid atomic source", sources: [], items: [{ ...payload.items[0], id: "invalid-item", catalogSnapshot: { ...payload.items[0].catalogSnapshot, directFrontSourceRef: "missing" } }] }, "r29-atomic-invalid-001"), (error) => error.code === "TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID");
  assert.equal((await store.read()).teamkitProposals.length, before, "partial failure laat geen proposal of bron achter");
});

test("mailstatus volgt deliverybewijs en nooit een losse statusklik", async (context) => {
  const { store, service, operator } = await fixture(context);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Mail truth", customerName: "Mail review", contactName: "R2.9 Reviewer", customerEmail: "reviewer@r29.test" });
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ id: "mail-item", articleId: null, articleNumber: "MAIL-1", productName: "Reviewshirt", color: "Zwart", quantity: null, sizes: [], team: null, notes: null, placements: [] }], reason: "Mail truth fixture" });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_REVIEW", expectedRevision: proposal.aggregateRevision });
  await assert.rejects(service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "SENT_TO_CUSTOMER", expectedRevision: proposal.aggregateRevision }), (error) => error.code === "PROPOSAL_DELIVERY_EVIDENCE_REQUIRED");
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id);
  const result = await service.captureTeamkitProposalMail(operator.token, operator.csrfToken, proposal.id, { templateKey: "PROPOSAL_REVIEW_REQUEST", customerPath: access.path }, "r29-mail-capture-001");
  assert.equal(result.status, "CAPTURED");
  const persisted = (await store.read()).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(persisted.status, "READY_FOR_REVIEW");
  assert.deepEqual(persisted.deliveryEvidence.map(({ status, delivered }) => ({ status, delivered })), [{ status: "CAPTURED", delivered: false }]);
});

test("direct cataloguszoeken bereikt producten buiten de bootstrapselectie", async (context) => {
  const { service, operator } = await fixture(context); const bootstrap = await service.bootstrap(operator.token); const tail = bootstrap.articles.at(-1);
  assert.ok(bootstrap.articles.indexOf(tail) > 8, "doelartikel valt buiten de eerste zichtbare kaartselectie");
  const result = await service.searchTeamwearCatalog(operator.token, { query: tail.articleNumber, limit: 24 });
  assert.equal(result.resolver, "CANONICAL_PRODUCT_CATALOG_V1");
  assert.ok(result.products.some(({ variants }) => variants.some(({ sourceArticleId }) => sourceArticleId === tail.id)));
  assert.ok(result.elapsedMs < 500, `catalogusquery duurde ${result.elapsedMs} ms`);
  const seed = buildTeamwearCatalog(bootstrap);
  const scaled = Array.from({ length: 5_200 }, (_, index) => ({ ...seed[index % seed.length], id: `scale-${index}`, supplierArticleNumber: `SCALE-${String(index).padStart(5, "0")}` }));
  const scaledTail = scaled.at(-1);
  const scaledResult = queryTeamwearCatalog(scaled, { query: scaledTail.supplierArticleNumber, limit: 24 });
  assert.ok(scaledResult.products.some(({ id }) => id === scaledTail.id), "ook een product diep in 5.200 modellen blijft direct vindbaar");
});

test("production connector gebruikt een gepatchte, exact gelockte mariadb-versie", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(packageJson.dependencies.mariadb, "3.5.3");
  assert.equal(lock.packages["node_modules/mariadb"].version, "3.5.3");
});
