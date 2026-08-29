import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R210-Lossless-Kevin!", patrick: "R210-Lossless-Patrick!", collega: "R210-Lossless-Store!", "donovan-support": "R210-Lossless-Support!" };
const vector = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80"><path d="M10 10H150V70H10Z"/></svg>');
const emptyPersonalization = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r210-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function placement(id, kind, text, extra = {}) {
  return { id, kind, label: id, side: ["BACK_NUMBER", "BACK_NAME"].includes(kind) ? "BACK" : "FRONT", preset: kind === "BACK_NUMBER" ? "BACK_UPPER" : "CHEST_LEFT", sourceId: null, productionAssetId: null, assetVersion: null, text, colorOverride: null, widthPercent: 24, physicalSizeOverride: null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null, ...extra };
}

async function approve(service, actor, proposal, items) {
  const issued = await service.issueTeamkitCustomerLink(actor.token, actor.csrfToken, proposal.id);
  const customerToken = issued.path.split("/").at(-1);
  proposal = (await service.bootstrap(actor.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  proposal = await service.updateTeamkitProposal(actor.token, actor.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items, reason: "R2.10 lossless intent" });
  for (const status of ["READY_FOR_REVIEW", "READY_FOR_APPROVAL"]) proposal = await service.setTeamkitProposalStatus(actor.token, actor.csrfToken, proposal.id, { status, expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "R2.10 Reviewer", customerEmail: "reviewer@r210.test" });
  return (await service.bootstrap(actor.token)).teamkitProposals.find(({ id }) => id === proposal.id);
}

test("Teamwear logo en sponsor worden verliesloos aan echte order-, regel- en decoration-identiteit gebonden", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "lossless-logo.svg", mimeType: "image/svg+xml", dataBase64: vector.toString("base64"), provenance: "R2.10 controlled master", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates[0];
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "R2.10 controlled logo", ownerType: "ASSOCIATION", ownerName: "A.S.C. Waterwijk", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: 80 * candidate.boundsMm.height / candidate.boundsMm.width, sizePolicyMode: "FIXED", defaultFoilColor: "Wit", contexts: [{ type: "ASSOCIATION", id: "asc-waterwijk", label: "A.S.C. Waterwijk" }], applications: [{ kind: "LOGO", placement: "Borst" }, { kind: "SPONSOR", placement: "Mouw" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Lossless visual identities", customerName: "Waterwijk", contactName: "R2.10 Reviewer", customerEmail: "reviewer@r210.test", associationName: "A.S.C. Waterwijk" });
  const items = [{ id: "garment-one", articleId: null, articleNumber: "CUSTOM-1", productName: "Trainingstop", color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [
    placement("club-logo", "CLUB_LOGO", null, { productionAssetId: asset.id, assetVersion: asset.version }),
    placement("sleeve-sponsor", "SPONSOR", null, { productionAssetId: asset.id, assetVersion: asset.version, side: "SLEEVE_LEFT", preset: "SLEEVE_LEFT" }),
  ] }];
  proposal = await approve(service, operator, proposal, items);
  assert.equal(proposal.fulfillmentTasks.length, 2);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: "garment-one", sizeQuantities: [{ size: "M", quantity: 2 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  const order = prepared.orders[0]; const lines = prepared.orders.flatMap(({ productionLines }) => productionLines);
  assert.equal(lines.length, 2);
  assert.equal(new Set(lines.map(({ teamkitProductionContext }) => teamkitProductionContext.proposalPlacementId)).size, 2);
  for (const line of lines) {
    assert.equal(line.orderId, order.id);
    assert.equal(line.itemId, order.items[0].id);
    assert.equal(line.decorationIdentity.orderId, order.id);
    assert.equal(line.decorationIdentity.itemId, order.items[0].id);
    assert.equal(line.decorationIdentity.articleNumber, "CUSTOM-1");
    assert.equal(line.quantity, 2);
  }
  assert.deepEqual(new Set(lines.map(({ decorationIdentity }) => decorationIdentity.decorationType)), new Set(["CLUB_LOGO", "SPONSOR"]));
});

test("SHORT_NUMBER accepteert MW en CHEST_NUMBER blijft een zelfstandige canonical betekenis", async (context) => {
  const { service, operator } = await fixture(context);
  const bootstrap = await service.bootstrap(operator.token);
  const shorts = bootstrap.articles.find(({ association, supports }) => association === "SC Buitenboys" && supports.includes("shortsNumber"));
  const shirt = bootstrap.articles.find(({ articleNumber }) => articleNumber === "140298");
  assert.ok(shorts && shirt);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Semantic number truth", customerName: "Semantics", contactName: "R2.10 Reviewer", customerEmail: "reviewer@r210.test", associationName: shorts.association });
  const items = [
    { id: "short-item", articleId: shorts.id, articleNumber: shorts.articleNumber, productName: shorts.name, color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [placement("short-mw", "SHORT_NUMBER", "MW", { side: "FRONT", preset: "RIGHT" })] },
    { id: "shirt-item", articleId: shirt.id, articleNumber: shirt.articleNumber, productName: shirt.name, color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [placement("chest-seven", "CHEST_NUMBER", "7")] },
  ];
  proposal = await approve(service, operator, proposal, items);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: "short-item", sizeQuantities: [{ size: "M", quantity: 1 }] }, { itemId: "shirt-item", sizeQuantities: [{ size: "M", quantity: 1 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  const lines = prepared.orders.flatMap(({ productionLines }) => productionLines);
  const shortLine = lines.find(({ teamkitProductionContext }) => teamkitProductionContext.proposalPlacementId === "short-mw");
  const chestLine = lines.find(({ teamkitProductionContext }) => teamkitProductionContext.proposalPlacementId === "chest-seven");
  assert.equal(shortLine.type, "TEXT");
  assert.equal(shortLine.content, "MW");
  assert.equal(shortLine.decorationIdentity.value, "MW");
  assert.equal(shortLine.personalizationField, "shortsNumber");
  assert.equal(shortLine.decorationIdentity.decorationType, "shortsNumber");
  assert.equal(chestLine.type, "NUMBER");
  assert.equal(chestLine.personalizationField, "chestNumber");
  assert.equal(chestLine.decorationIdentity.decorationType, "chestNumber");
});

test("idempotency is payload-gebonden en een herordende maatverdeling materialiseert dezelfde fysieke groepen", async (context) => {
  const { service, operator } = await fixture(context);
  const bootstrap = await service.bootstrap(operator.token); const article = bootstrap.articles.find(({ articleNumber }) => articleNumber === "140298");
  const base = { title: "Payload bound", customerName: "R2.10", contactName: "Reviewer", customerEmail: "reviewer@r210.test", associationName: "SC Buitenboys" };
  const first = await service.createTeamkitProposal(operator.token, operator.csrfToken, base, "r210-payload-bound");
  await assert.rejects(service.createTeamkitProposal(operator.token, operator.csrfToken, { ...base, title: "Changed payload" }, "r210-payload-bound"), (error) => error.code === "IDEMPOTENCY_PAYLOAD_MISMATCH");
  let proposal = await approve(service, operator, first, [{ id: "mixed", articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: "Navy", quantity: null, sizes: [], team: null, notes: null, placements: [placement("back-11", "BACK_NUMBER", "11")] }]);
  proposal = await service.updateTeamkitProductionSizing(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [{ itemId: "mixed", sizeQuantities: [{ size: "M", quantity: 3 }, { size: "140", quantity: 2 }] }] });
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  assert.deepEqual(prepared.orders[0].productionLines.map(({ heightMm, quantity }) => ({ heightMm, quantity })).sort((a, b) => a.heightMm - b.heightMm), [{ heightMm: 200, quantity: 2 }, { heightMm: 220, quantity: 3 }]);
});

test("employee UX bevat geen universele Junior-gap en Today projecteert Teamwear/Webshop aandacht", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<div class="is-gap"><dt>Junior rugnummer<\/dt><dd>Fysieke maat nog bevestigen/);
  assert.match(source, /teamwearAttention/);
  assert.match(source, /webshopAttention/);
  assert.match(source, /profile-source-\$\{productionProfileSlug\(association\.name\)\}-\$\{productionField\}/);
});

test("verzonden of bezorgd wordt nooit zonder deliverybewijs als mailwaarheid opgeslagen", async (context) => {
  const { service, admin, storeUser } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "R2.10 mailwaarheid",
    customerEmail: "mailwaarheid@r210.test",
    standardPersonalization: { ...emptyPersonalization, backNumber: "10", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-137294", size: "152", quantity: 1, deviation: false, overrides: emptyPersonalization }],
  }, "r210-mail-truth-order")).value;
  await assert.rejects(service.recordCommunicationStatus(admin.token, admin.csrfToken, created.id, { channel: "receipt", status: "SENT" }, created.revision), (error) => error.code === "COMMUNICATION_DELIVERY_EVIDENCE_REQUIRED");
  const evidenceBody = { attemptId: "attempt-r210", provider: "WBD_MAIL_FOUNDATION", providerReference: "provider-proof-r210", status: "SENT", acceptedAt: "2026-08-29T12:00:00.000Z", channel: "receipt" };
  await assert.rejects(service.recordCommunicationStatus(admin.token, admin.csrfToken, created.id, { channel: "receipt", status: "SENT", providerReference: "provider-proof-r210", deliveryEvidence: { ...evidenceBody, evidenceHash: "client-authored" } }, created.revision), (error) => error.code === "COMMUNICATION_DELIVERY_EVIDENCE_REQUIRED");
  const captured = await service.captureOrderMail(admin.token, admin.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "r210-mail-truth-capture");
  assert.equal(captured.status, "CAPTURED");
  const projected = await service.order(admin.token, created.id);
  assert.equal(projected.communication.receipt.status, "CAPTURED");
  assert.notEqual(projected.communication.receipt.status, "SENT");
});
