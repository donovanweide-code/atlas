import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildWorkspaceSearchIndex, queryWorkspaceSearch } from "../src/workspace-search.ts";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Teamkit-Kevin-2026!", patrick: "Teamkit-Patrick-2026!", collega: "Teamkit-Store-2026!", "donovan-support": "Teamkit-Support-2026!" };
const vectorSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path fill="#111111" d="M10 10H90V90H10Z"/><path fill="#222222" d="M110 10H190V90H110Z"/></svg>');

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-teamkit-v1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function item(sourceId) {
  return {
    id: "item-shirt", articleId: null, articleNumber: "SHIRT-2026", productName: "Wedstrijdshirt", color: "#13294b", quantity: 18, sizes: ["S", "M", "L"], team: "JO15", notes: "Clubkleuren behouden",
    placements: [
      { id: "placement-club", kind: "CLUB_LOGO", label: "Clublogo", side: "FRONT", preset: "LINKERBORST", sourceId, productionAssetId: null, assetVersion: null, text: null, widthPercent: 22, route: "INTERN_BEDRUKKEN", supplierName: null, note: null },
      { id: "placement-sponsor", kind: "SPONSOR", label: "Hoofdsponsor", side: "FRONT", preset: "MIDDENBORST", sourceId, productionAssetId: null, assetVersion: null, text: null, widthPercent: 38, route: "EXTERNE_BEDRUKKER", supplierName: "Bestaande bedrukpartner", note: null },
      { id: "placement-number", kind: "BACK_NUMBER", label: "Rugnummer", side: "BACK", preset: "RUG_MIDDEN", sourceId: null, productionAssetId: null, assetVersion: null, text: "10", widthPercent: 30, route: "NOG_TE_BEPALEN", supplierName: null, note: null },
    ],
  };
}

test("Teamkit Proposal V1 levert intake, revisions, exact akkoord en route-afhandeling end-to-end", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);
  let proposal = await service.createTeamkitProposal(storeUser.token, storeUser.csrfToken, { title: "Teamkit JO15 2026/2027", type: "Teamkit", customerName: "SV Voorbeeld", contactName: "Mevrouw Voorbeeld", customerEmail: "team@voorbeeld.nl", associationName: "A.S.C. Waterwijk", team: "JO15", season: "2026/2027" });
  assert.match(proposal.proposalNumber, /^PV-\d{4}-0001$/u);
  assert.equal(proposal.revisions.length, 1);

  const issued = await service.issueTeamkitCustomerLink(storeUser.token, storeUser.csrfToken, proposal.id);
  const customerToken = issued.path.split("/").at(-1);
  const mailPreview = await service.previewTeamkitProposalMail(storeUser.token, proposal.id, { templateKey: "PROPOSAL_INTAKE_REQUEST", customerPath: issued.path });
  assert.match(mailPreview.subject, /Gegevens voor voorstel/u);
  assert.match(mailPreview.html, /workspace\.sportpaleis\.nl\/voorstel/u);
  assert.equal(mailPreview.externalMailSent, false);
  const mailCapture = await service.captureTeamkitProposalMail(storeUser.token, storeUser.csrfToken, proposal.id, { templateKey: "PROPOSAL_INTAKE_REQUEST", customerPath: issued.path }, "teamkit-intake-mail-0001");
  assert.equal(mailCapture.status, "CAPTURED");
  assert.equal((await service.publicTeamkitProposal(customerToken)).intake.status, "REQUESTED");
  await service.savePublicTeamkitIntake(customerToken, { data: { association: "A.S.C. Waterwijk JO15", products: "18 wedstrijdshirts", sponsors: "Clublogo en hoofdsponsor" }, sources: [{ filename: "club-en-sponsors.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg.toString("base64") }] }, { submit: false });
  await service.savePublicTeamkitIntake(customerToken, { data: { colors: "Navy" }, sources: [] }, { submit: true });
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(proposal.status, "READY_FOR_DESIGN");
  assert.equal(proposal.sources[0].quality.status, "VECTOR_SUITABLE");

  const productionSource = await service.createProductionAssetSource(admin.token, admin.csrfToken, { filename: "club-en-sponsors.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg.toString("base64"), provenance: `Voorstelbron ${proposal.proposalNumber}`, conversionMethod: "HUMAN_VERIFIED_SVG" });
  proposal = await service.linkTeamkitProposalSource(admin.token, admin.csrfToken, proposal.id, proposal.sources[0].id, { expectedRevision: proposal.aggregateRevision, productionSourceId: productionSource.id });
  assert.equal(proposal.sources[0].promotedProductionSourceId, productionSource.id);

  const staleRevision = proposal.aggregateRevision;
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [item(proposal.sources[0].id)], reason: "Eerste complete teamkit" });
  assert.equal(proposal.currentRevision, 2);
  await assert.rejects(service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: staleRevision, title: "Stale wijziging" }), (error) => error.code === "REVISION_CONFLICT");

  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_REVIEW", expectedRevision: proposal.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "SENT_TO_CUSTOMER", expectedRevision: proposal.aggregateRevision });
  await service.savePublicTeamkitFeedback(customerToken, { revision: 2, kind: "ITEM", targetId: "item-shirt", decision: "CHANGE", message: "Sponsor iets kleiner", customerName: "Mevrouw Voorbeeld" });
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  const feedbackId = proposal.feedback[0].id;
  const revisedItem = item(proposal.sources[0].id); revisedItem.placements[1].widthPercent = 30;
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [revisedItem], reason: "Sponsor kleiner na klantfeedback", feedbackIds: [feedbackId] });
  assert.equal(proposal.currentRevision, 3);
  assert.equal(proposal.feedback[0].status, "PROCESSED");
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_REVIEW", expectedRevision: proposal.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "SENT_TO_CUSTOMER", expectedRevision: proposal.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_APPROVAL", expectedRevision: proposal.aggregateRevision });

  const approved = await service.approvePublicTeamkitProposal(customerToken, { revision: 3, customerName: "Mevrouw Voorbeeld", customerEmail: "team@voorbeeld.nl" });
  assert.equal(approved.status, "APPROVED");
  const approvedAgain = await service.approvePublicTeamkitProposal(customerToken, { revision: 3, customerName: "Mevrouw Voorbeeld", customerEmail: "team@voorbeeld.nl" });
  assert.equal(approvedAgain.approval.approvedAt, approved.approval.approvedAt);
  proposal = (await service.bootstrap(admin.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.deepEqual(proposal.fulfillmentTasks.map(({ kind }) => kind).sort(), ["EXTERNAL_SUPPLIER", "INTERNAL_PRODUCTION", "ROUTE_DECISION"]);
  assert.equal(proposal.fulfillmentTasks.find(({ kind }) => kind === "ROUTE_DECISION").attention, "Bepaal wie deze bedrukking uitvoert.");
  const finalPdf = await service.publicTeamkitProposalPdf(customerToken);
  assert.equal(finalPdf.bytes.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.equal(finalPdf.sha256, proposal.approval.pdfSha256);
  await assert.rejects(service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: [] }), (error) => error.code === "APPROVED_REVISION_IMMUTABLE");
  const externalTask = proposal.fulfillmentTasks.find(({ kind }) => kind === "EXTERNAL_SUPPLIER");
  const supplierPreview = await service.previewTeamkitProposalMail(operator.token, proposal.id, { templateKey: "PROPOSAL_SUPPLIER_HANDOFF", taskId: externalTask.id, recipient: "planning@bedrukpartner.nl", supplierName: "Bestaande bedrukpartner" });
  assert.match(supplierPreview.text, /A\.S\.C\. Waterwijk|SV Voorbeeld/u);
  assert.match(supplierPreview.text, /Hoofdsponsor/u);
  assert.equal((await service.captureTeamkitProposalMail(operator.token, operator.csrfToken, proposal.id, { templateKey: "PROPOSAL_SUPPLIER_HANDOFF", taskId: externalTask.id, recipient: "planning@bedrukpartner.nl", supplierName: "Bestaande bedrukpartner" }, "teamkit-supplier-mail-0001")).status, "CAPTURED");
  proposal = (await service.bootstrap(admin.token)).teamkitProposals.find(({ id }) => id === proposal.id);

  const approvedHash = proposal.approval.snapshotHash;
  const copy = await service.copyTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { season: "2027/2028" });
  assert.equal(copy.copiedFrom.approvedRevision, 3);
  assert.equal(copy.status, "DRAFT");
  assert.notEqual(copy.id, proposal.id);
  const original = (await store.read()).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(original.approval.snapshotHash, approvedHash);
  assert.ok(original.fulfillmentTasks.every(({ approvedRevision }) => approvedRevision === 3));

  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items: proposal.items, reason: "Wijziging na akkoord", reopenApproved: true });
  assert.equal(proposal.currentRevision, 4);
  assert.equal(proposal.approval, null);
  assert.equal(proposal.approvalHistory[0].revision, 3);
  const immutableOldPdf = await service.teamkitProposalPdf(admin.token, proposal.id, 3);
  assert.equal(immutableOldPdf.sha256, finalPdf.sha256);
  assert.ok(proposal.fulfillmentTasks.every(({ approvedRevision }) => approvedRevision === 3));
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_REVIEW", expectedRevision: proposal.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "SENT_TO_CUSTOMER", expectedRevision: proposal.aggregateRevision });
  proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status: "READY_FOR_APPROVAL", expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: 4, customerName: "Mevrouw Voorbeeld", customerEmail: "team@voorbeeld.nl" });
  proposal = (await service.bootstrap(admin.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  assert.equal(proposal.approval.revision, 4);
  assert.equal(proposal.approvalHistory[0].revision, 3);
  assert.deepEqual([...new Set(proposal.fulfillmentTasks.map(({ approvedRevision }) => approvedRevision))], [3, 4]);
  assert.equal((await service.teamkitProposalPdf(admin.token, proposal.id, 3)).sha256, finalPdf.sha256);

  const searchState = await service.bootstrap(admin.token);
  const hits = queryWorkspaceSearch(buildWorkspaceSearchIndex(searchState, ""), "PV");
  assert.ok(hits.some(({ id, kind }) => id === proposal.id && kind === "TEAMKIT_PROPOSAL"));
  assert.equal(searchState.audit.filter(({ action, subject }) => subject === proposal.id && action === "Klant akkoord").length, 2);
});

test("Teamkit-bronnen blokkeren actieve SVG en klantlinks zijn scoped, intrekbaar en expirable", async (context) => {
  const { service, store, storeUser } = await fixture(context);
  const proposal = await service.createTeamkitProposal(storeUser.token, storeUser.csrfToken, { title: "Veilige intake", customerName: "Veilige club", contactName: "Contact", customerEmail: "contact@club.nl" });
  const first = await service.issueTeamkitCustomerLink(storeUser.token, storeUser.csrfToken, proposal.id); const oldToken = first.path.split("/").at(-1);
  await assert.rejects(service.savePublicTeamkitIntake(oldToken, { data: {}, sources: [{ filename: "actief.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64") }] }), (error) => /^PRODUCTION_ASSET_SVG_/u.test(error.code));
  const lowResolutionPng = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(lowResolutionPng); lowResolutionPng.writeUInt32BE(180, 16); lowResolutionPng.writeUInt32BE(90, 20);
  const rasterDraft = await service.savePublicTeamkitIntake(oldToken, { data: { notes: "PNG is alleen referentie" }, sources: [{ filename: "clublogo-reference.png", mimeType: "image/png", dataBase64: lowResolutionPng.toString("base64") }] }, { submit: false });
  assert.equal(rasterDraft.sources[0].quality.status, "LOW_RES_BETTER_SOURCE_REQUIRED");
  const betterSource = await service.savePublicTeamkitIntake(oldToken, { data: {}, sources: [{ filename: "clublogo-definitief.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg.toString("base64") }] }, { submit: true });
  assert.deepEqual(betterSource.sources.map(({ quality }) => quality.status).sort(), ["LOW_RES_BETTER_SOURCE_REQUIRED", "VECTOR_SUITABLE"]);
  const second = await service.issueTeamkitCustomerLink(storeUser.token, storeUser.csrfToken, proposal.id); const token = second.path.split("/").at(-1);
  await assert.rejects(service.publicTeamkitProposal(oldToken), (error) => error.code === "PROPOSAL_ACCESS_INVALID");
  await store.mutate((state) => { state.teamkitProposals.find(({ id }) => id === proposal.id).customerAccess.expiresAt = "2000-01-01T00:00:00.000Z"; return { state }; });
  await assert.rejects(service.publicTeamkitProposal(token), (error) => error.code === "PROPOSAL_ACCESS_EXPIRED");
});
