import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Teamkit-RC2-Kevin!", patrick: "Teamkit-RC2-Patrick!", collega: "Teamkit-RC2-Store!", "donovan-support": "Teamkit-RC2-Support!" };
const vectorSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><path d="M10 10H190V90H10Z"/></svg>');

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-teamkit-rc2-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  return {
    store,
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

async function productionAsset(service, admin, operator) {
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "teamkit-ready.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg.toString("base64"), provenance: "RC2 Teamkit productierijp bewijs", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates[0];
  const widthMm = 80; const heightMm = widthMm * candidate.boundsMm.height / candidate.boundsMm.width;
  return service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "RC2 Teamkit clublogo", ownerType: "ASSOCIATION", ownerName: "A.S.C. Waterwijk", productionMethod: "SELF_PRODUCED", widthMm, heightMm, sizePolicyMode: "FIXED", defaultFoilColor: "Wit", contexts: [{ type: "ASSOCIATION", id: "asc-waterwijk", label: "A.S.C. Waterwijk" }], applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
}

function placement(id, route, { asset = null, sourceId = null, preset = "LINKERBORST" } = {}) {
  return { id, kind: "CLUB_LOGO", label: id.replaceAll("-", " "), side: "FRONT", preset, sourceId, productionAssetId: asset?.id ?? null, assetVersion: asset?.version ?? null, text: null, widthPercent: 24, route, supplierName: route === "EXTERNE_BEDRUKKER" ? "Vaste partner" : null, note: null };
}

function profilePlacement(id, kind, text, options = {}) {
  return { id, kind, label: id.replaceAll("-", " "), side: kind === "BACK_NUMBER" ? "BACK" : "FRONT", preset: kind === "BACK_NUMBER" ? "RUG_MIDDEN" : "LINKERBORST", sourceId: null, productionAssetId: null, assetVersion: null, text, colorOverride: options.colorOverride ?? null, widthPercent: 24, physicalSizeOverride: options.physicalSizeOverride ?? null, route: "INTERN_BEDRUKKEN", supplierName: null, note: null };
}

async function approvedProposal(service, operator, sourceId, asset) {
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "RC2 productieacceptance", customerName: "SV RC2", contactName: "Mevrouw Team", customerEmail: "team@rc2.test", associationName: "A.S.C. Waterwijk", team: "JO15", season: "2026/2027" });
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id); const customerToken = access.path.split("/").at(-1);
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  const articles = (await service.bootstrap(operator.token)).articles;
  const shirt = articles.find(({ association, name, active }) => active && association === "A.S.C. Waterwijk" && /wedstrijd shirt/iu.test(name));
  const jacket = articles.find(({ association, name, active }) => active && association === "A.S.C. Waterwijk" && /full zip jack|winterjas|regenjack/iu.test(name));
  const bag = articles.find(({ association, name, active }) => active && association === "A.S.C. Waterwijk" && /voetbaltas/iu.test(name));
  assert.ok(shirt && jacket && bag);
  const shirtSizes = shirt.availableSizes.slice(0, 1);
  const jacketSizes = jacket.availableSizes.slice(0, 1);
  const bagSizes = bag.availableSizes.slice(0, 1);
  assert.ok(shirtSizes.length > 0 && jacketSizes.length > 0 && bagSizes.length > 0);
  const items = [
    { id: "item-ready", articleId: shirt.id, articleNumber: shirt.articleNumber, productName: shirt.name, color: "Navy", quantity: 18, sizes: shirtSizes, team: "JO15", notes: null, placements: [placement("placement-ready-a", "INTERN_BEDRUKKEN", { asset }), placement("placement-ready-b", "INTERN_BEDRUKKEN", { asset, preset: "RECHTERBORST" })] },
    { id: "item-attention", articleId: jacket.id, articleNumber: jacket.articleNumber, productName: jacket.name, color: "Navy", quantity: 6, sizes: jacketSizes, team: "JO15", notes: null, placements: [placement("placement-attention", "INTERN_BEDRUKKEN", { sourceId })] },
    { id: "item-external", articleId: bag.id, articleNumber: bag.articleNumber, productName: bag.name, color: "Zwart", quantity: 18, sizes: bagSizes, team: "JO15", notes: null, placements: [placement("placement-external", "EXTERNE_BEDRUKKER", { sourceId, preset: "TAS" })] },
  ];
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items, reason: "Approved RC2 productiesnapshot" });
  for (const status of ["READY_FOR_REVIEW", "READY_FOR_APPROVAL"]) proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status, expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Mevrouw Team", customerEmail: "team@rc2.test" });
  return (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
}

test("approved Teamkit gebruikt na medewerker-GO atomair de bestaande WorkspaceOrder/Productie-foundation", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);
  const asset = await productionAsset(service, admin, operator);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Bronhouder", customerName: "SV RC2", contactName: "Contact", customerEmail: "contact@rc2.test" });
  const added = await service.addTeamkitProposalSource(operator.token, operator.csrfToken, proposal.id, { filename: "teamkit-reference.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg.toString("base64") });
  proposal = await approvedProposal(service, operator, added.source.id, asset);

  const beforeApprovalOrders = (await store.read()).orders;
  assert.equal(beforeApprovalOrders.filter(({ referenceSeries }) => referenceSeries === "TK").length, 0, "publieke approval maakt nooit zelfstandig een TK-order");
  await assert.rejects(service.prepareTeamkitInternalProduction(storeUser.token, storeUser.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision }), (error) => error.code === "FORBIDDEN");

  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  assert.equal(prepared.duplicate, false);
  assert.equal(prepared.orders.length, 2, "twee interne items leveren twee TK-orders");
  assert.deepEqual(prepared.orders.map(({ id }) => id), ["TK-2026-0001", "TK-2026-0002"]);
  assert.deepEqual(prepared.orders.map(({ productionStatus }) => productionStatus).sort(), ["ATTENTION", "READY"]);
  const ready = prepared.orders.find(({ productionStatus }) => productionStatus === "READY"); const attention = prepared.orders.find(({ productionStatus }) => productionStatus === "ATTENTION");
  assert.equal(ready.productionLines.length, 2, "meerdere placements van één item blijven één TK-order");
  assert.ok(ready.productionLines.every(({ validation }) => validation.status === "VALID"));
  const approvedAssetRatio = asset.sizePolicy.defaultWidthMm / asset.sizePolicy.defaultHeightMm;
  assert.ok(ready.productionLines.every(({ widthMm, heightMm }) => Math.abs((widthMm / heightMm) - approvedAssetRatio) < 0.002), "logo gebruikt de aspect ratio van de goedgekeurde productiebron");
  assert.ok(ready.productionLines.every(({ teamkitProductionContext }) => teamkitProductionContext.measurementSource === "PRODUCTION_ASSET"));
  assert.equal(attention.productionLines.length, 1);
  assert.equal(attention.productionLines[0].dataGap.status, "DATA_GAP");
  assert.deepEqual(attention.productionLines[0].dataGap.fields.sort(), ["DIMENSIONS", "FOIL_COLOR", "SOURCE"]);
  assert.equal(attention.productionLines[0].widthMm, 0, "ontbrekende millimeters worden niet verzonnen");
  assert.equal(attention.productionLines[0].validation.status, "BLOCKED");

  let state = await store.read();
  assert.equal(state.productionJobs.length, 4, "de bestaande golden jobs blijven ongewijzigd; er ontstaat geen PlotJob");
  proposal = state.teamkitProposals.find(({ id }) => id === proposal.id);
  const readyTasks = proposal.fulfillmentTasks.filter(({ approvedRevision, itemId }) => approvedRevision === proposal.approval.revision && itemId === "item-ready");
  assert.equal(new Set(readyTasks.map(({ orderId }) => orderId)).size, 1);
  assert.equal(readyTasks[0].orderId, ready.id);
  assert.ok(proposal.fulfillmentTasks.find(({ itemId }) => itemId === "item-external").orderId === null, "externe bedrukking krijgt geen interne TK-order");
  for (const order of prepared.orders) {
    assert.equal(order.referenceSeries, "TK");
    assert.equal(order.teamkitContext.kind, "TEAMKIT_APPROVAL");
    assert.equal(order.teamkitContext.proposalId, proposal.id);
    assert.equal(order.teamkitContext.approvedRevision, proposal.approval.revision);
    assert.ok(order.teamkitContext.itemSnapshotHash);
    assert.ok(order.teamkitContext.placementRefs.every(({ taskId, placementId }) => taskId && placementId));
    assert.ok(order.eventHistory.some(({ type, source }) => type === "TEAMKIT_APPROVED_ORDER_CREATED" && source === "human-go"));
  }
  assert.ok(state.audit.some(({ action, details }) => action === "Human GO · interne Teamkit-productie klaargezet" && details.plotJobCreated === false));

  const retried = await service.prepareTeamkitInternalProduction(admin.token, admin.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision - 1 });
  assert.equal(retried.duplicate, true, "retry met stale UI-context dupliceert niet nadat alle items al gekoppeld zijn");
  assert.deepEqual(retried.orders.map(({ id }) => id), prepared.orders.map(({ id }) => id));
  state = await store.read();
  assert.equal(state.orders.filter(({ referenceSeries }) => referenceSeries === "TK").length, 2);
  assert.equal(state.productionJobs.length, 4);

  const ordinary = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "CUSTOM", customer: "Gewone order", standardPersonalization: {}, items: [{ product: "Los artikel", association: "A.S.C. Waterwijk", size: "M", quantity: 1, personalization: "Geen bedrukking" }] }, "ordinary-sp-regression-rc2")).value;
  assert.match(ordinary.id, /^SP-2026-\d{4}$/u);
  assert.equal(ordinary.referenceSeries, "SP");
  assert.equal(ordinary.teamkitContext, undefined);
});

test("Teamkit resolveert bestaande profielmaten en bewaart alleen expliciete overrides als approved afwijking", async (context) => {
  const { store, service, operator } = await fixture(context);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "RC2 authoritative maatvoering", customerName: "A.S.C. Waterwijk", contactName: "Teamcoördinator", customerEmail: "team@waterwijk.test", associationName: "A.S.C. Waterwijk", team: "Selectie", season: "2026/2027" });
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id); const customerToken = access.path.split("/").at(-1);
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  const items = [
    { id: "profile-initials", articleId: "sp-live-140221", articleNumber: "140221", productName: "ASC Waterwijk TRAINING SHIRT", color: "Blauw", quantity: 1, sizes: ["L"], team: "Selectie", notes: null, placements: [profilePlacement("initials-default", "INITIALS", "AB", { colorOverride: "#101419" })] },
    { id: "profile-back-number", articleId: "sp-live-137294", articleNumber: "137294", productName: "ASC Waterwijk WEDSTRIJD SHIRT SELECTIE", color: "Blauw", quantity: 1, sizes: ["M"], team: "Selectie", notes: null, placements: [profilePlacement("back-default", "BACK_NUMBER", "12")] },
    { id: "profile-explicit-override", articleId: "sp-live-140224", articleNumber: "140224", productName: "ASC Waterwijk FULL ZIP JACK", color: "Blauw", quantity: 1, sizes: ["M"], team: "Selectie", notes: null, placements: [profilePlacement("initials-override", "INITIALS", "CD", { physicalSizeOverride: { widthMm: 58, heightMm: 35, aspectRatioLocked: true } })] },
  ];
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items, reason: "Profielmaat en expliciete override vastgelegd" });
  const draftRules = Object.fromEntries(proposal.items.map((item) => [item.id, item.placements[0].productionRule]));
  assert.equal(draftRules["profile-initials"].status, "REVIEW_REQUIRED", "ontbrekende gecontroleerde contourbron blijft fail-closed zonder bekende defaults te verliezen");
  assert.equal(draftRules["profile-initials"].resolver, "ARTICLE_PROFILE");
  assert.equal(draftRules["profile-initials"].fontProfile, "Schluber");
  assert.equal(draftRules["profile-initials"].foilColor, "Zwart", "visuele zwartkeuze is dezelfde beheerde productiefoliekleur");
  assert.equal(draftRules["profile-initials"].physicalHeightMm, 30);
  assert.equal(draftRules["profile-explicit-override"].measurementSource, "EXPLICIT_PROPOSAL_OVERRIDE");
  assert.equal(draftRules["profile-explicit-override"].physicalWidthMm, 58);
  assert.equal(draftRules["profile-explicit-override"].physicalHeightMm, 35);
  assert.match(proposal.revisions.at(-1).previewHtml, /Schluber · [\d.]+×30 mm · Zwart · Productiecontrole nodig/u, "revision-preview toont dezelfde production truth plus de echte reviewstatus");
  for (const status of ["READY_FOR_REVIEW", "READY_FOR_APPROVAL"]) proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status, expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Teamcoördinator", customerEmail: "team@waterwijk.test" });
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  assert.equal(prepared.orders.length, 3);
  const byItem = Object.fromEntries(prepared.orders.map((order) => [order.teamkitContext.itemId, order.productionLines[0]]));
  assert.equal(byItem["profile-initials"].heightMm, 30, "initialen gebruiken de bestaande verenigings-/profielmaat zonder proposal-mm");
  assert.equal(byItem["profile-initials"].foilColor, "Zwart");
  assert.equal(byItem["profile-initials"].teamkitProductionContext.fontProfile, draftRules["profile-initials"].fontProfile);
  assert.equal(byItem["profile-initials"].teamkitProductionContext.profileId, draftRules["profile-initials"].profileId);
  assert.equal(byItem["profile-initials"].teamkitProductionContext.approvedProductionRuleHash, draftRules["profile-initials"].ruleHash);
  assert.equal(byItem["profile-initials"].teamkitProductionContext.currentProductionRuleHash, draftRules["profile-initials"].ruleHash);
  assert.equal(byItem["profile-initials"].teamkitProductionContext.measurementSource, "PRODUCTION_PROFILE");
  assert.ok(!byItem["profile-initials"].dataGap?.fields.includes("DIMENSIONS"));
  assert.equal(byItem["profile-back-number"].heightMm, 220, "Senior rugnummer gebruikt het bestaande server-authoritative profiel");
  assert.equal(byItem["profile-back-number"].teamkitProductionContext.measurementSource, "PRODUCTION_PROFILE");
  assert.match(byItem["profile-back-number"].teamkitProductionContext.measurementEvidence, /SENIOR/u);
  assert.equal(byItem["profile-explicit-override"].widthMm, 58);
  assert.equal(byItem["profile-explicit-override"].heightMm, 35);
  assert.deepEqual(byItem["profile-explicit-override"].teamkitProductionContext.explicitOverride, { widthMm: 58, heightMm: 35, aspectRatioLocked: true });
  assert.equal(byItem["profile-explicit-override"].teamkitProductionContext.measurementSource, "EXPLICIT_PROPOSAL_OVERRIDE");
  assert.match(byItem["profile-explicit-override"].provenance, /override 58×35 mm/u);
  const state = await store.read(); const approved = state.teamkitProposals.find(({ id }) => id === proposal.id).revisions.find(({ number }) => number === proposal.approval.revision);
  assert.deepEqual(approved.snapshot.items[2].placements[0].physicalSizeOverride, { widthMm: 58, heightMm: 35, aspectRatioLocked: true }, "approved snapshot bewaart exact dezelfde override");
  assert.deepEqual(approved.snapshot.items.map((item) => item.placements[0].productionRule), proposal.items.map((item) => item.placements[0].productionRule), "approved compositie bewaart profiel/font/folie/formaat onveranderd");
  const approval = state.teamkitProposals.find(({ id }) => id === proposal.id).approval;
  assert.match(Buffer.from(approval.pdfBase64, "base64").toString("ascii"), /Schluber \| [\d.]+x30 mm \| Zwart/u, "immutable PDF bevat dezelfde font-, formaat- en foliekeuze");
  assert.equal(state.productionJobs.length, 4, "profielresolutie start geen PlotJob");
});

test("Teamkit productie faalt gesloten wanneer profiel/font/folie/formaat na approval afwijkt", async (context) => {
  const { store, service, operator } = await fixture(context);
  let proposal = await service.createTeamkitProposal(operator.token, operator.csrfToken, { title: "Immutable productieregel", customerName: "A.S.C. Waterwijk", contactName: "Teamcoördinator", customerEmail: "team@waterwijk.test", associationName: "A.S.C. Waterwijk", team: "Selectie" });
  const access = await service.issueTeamkitCustomerLink(operator.token, operator.csrfToken, proposal.id); const customerToken = access.path.split("/").at(-1);
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  const items = [{ id: "profile-drift", articleId: "sp-live-140221", articleNumber: "140221", productName: "ASC Waterwijk TRAINING SHIRT", color: "Blauw", quantity: 1, sizes: ["L"], team: "Selectie", notes: null, placements: [profilePlacement("initials-drift", "INITIALS", "AB")] }];
  proposal = await service.updateTeamkitProposal(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision, items, reason: "Productieregel approved" });
  const approvedRule = structuredClone(proposal.items[0].placements[0].productionRule);
  for (const status of ["READY_FOR_REVIEW", "READY_FOR_APPROVAL"]) proposal = await service.setTeamkitProposalStatus(operator.token, operator.csrfToken, proposal.id, { status, expectedRevision: proposal.aggregateRevision });
  await service.approvePublicTeamkitProposal(customerToken, { revision: proposal.currentRevision, customerName: "Teamcoördinator", customerEmail: "team@waterwijk.test" });
  proposal = (await service.bootstrap(operator.token)).teamkitProposals.find(({ id }) => id === proposal.id);
  await store.mutate(async (state) => { const profile = state.productionProfiles.find(({ id }) => id === approvedRule.profileId); profile.fontProfile = "Onverwacht gewijzigd profiel"; profile.revision = (profile.revision ?? 1) + 1; return { state, value: null }; });

  const prepared = await service.prepareTeamkitInternalProduction(operator.token, operator.csrfToken, proposal.id, { expectedRevision: proposal.aggregateRevision });
  assert.equal(prepared.orders[0].productionStatus, "ATTENTION");
  assert.equal(prepared.orders[0].productionLines[0].validation.status, "BLOCKED");
  assert.ok(prepared.orders[0].productionLines[0].dataGap.fields.includes("APPROVED_RULE_DRIFT"));
  assert.equal(prepared.orders[0].teamkitContext.approvedRevision, proposal.approval.revision);
  assert.equal((await store.read()).productionJobs.length, 4, "drift maakt nooit stil een PlotJob");
});
