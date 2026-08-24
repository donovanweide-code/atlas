import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "P0-Color-Admin-2026!", patrick: "P0-Color-Operator-2026!", collega: "P0-Color-Store-2026!", "donovan-support": "P0-Color-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-p0-color-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-P0-PRODUCTION-COLOR-20260817" });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

async function controlledPioneersOrder(service, actor, idempotencyKey, items) {
  const created = (await service.createOrder(actor.token, actor.csrfToken, {
    orderKind: "INDIVIDUAL", customer: `P0 kleur ${idempotencyKey}`, customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" }, items,
  }, `${idempotencyKey}-order-fixture`)).value;
  const acknowledged = await service.recordCommunicationStatus(actor.token, actor.csrfToken, created.id, { channel: "receipt", status: "SENT", providerReference: `${idempotencyKey}-receipt` }, created.revision);
  return (await service.advanceOrder(actor.token, actor.csrfToken, created.id, acknowledged.revision, `${idempotencyKey}-control`)).value;
}

test("verenigingdefault en expliciete artikeloverride blijven logisch, persistent en zonder bulkmutatie", async (context) => {
  const { service, admin } = await fixture(context);
  const initial = await service.bootstrap(admin.token);
  const waterwijk = initial.associations.find(({ name }) => name === "A.S.C. Waterwijk");
  const waterwijkArticlesBefore = structuredClone(initial.articles.filter(({ association }) => association === waterwijk.name));
  assert.equal(waterwijk.defaultFoilColor, undefined);
  assert.equal(waterwijk.foilColors[0], "Wit");
  assert.ok(waterwijkArticlesBefore.every((article) => !Object.hasOwn(article, "foilColorOverride")));

  let association = await service.updateAssociation(admin.token, admin.csrfToken, waterwijk.id, {
    expectedRevision: waterwijk.revision, foilColors: ["Wit", "Rood"], defaultFoilColor: "Wit",
  });
  let state = await service.bootstrap(admin.token);
  assert.deepEqual(state.articles.filter(({ association: name }) => name === waterwijk.name), waterwijkArticlesBefore, "kleurbeheer mag bestaande artikelen niet bulkgewijs muteren");

  const blueShirt = state.articles.find(({ id }) => id === "sp-live-137294");
  await assert.rejects(service.updateArticle(admin.token, admin.csrfToken, blueShirt.id, { expectedRevision: blueShirt.revision, foilColorOverride: "Paars" }), (error) => error.code === "ARTICLE_FOIL_COLOR_UNKNOWN");
  const savedBlueShirt = await service.updateArticle(admin.token, admin.csrfToken, blueShirt.id, { expectedRevision: blueShirt.revision, foilColorOverride: "Blauw" });
  assert.equal(savedBlueShirt.foilColorOverride, "Blauw");
  state = await service.bootstrap(admin.token);
  assert.equal(state.articles.find(({ id }) => id === blueShirt.id).foilColorOverride, "Blauw");
  assert.equal(state.articles.find(({ id }) => id === "sp-live-137295").foilColorOverride, undefined);

  const whiteOrder = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Waterwijk kleurregel", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-137295", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, "waterwijk-blue-white-order")).value;
  assert.deepEqual(whiteOrder.items.map(({ foilColor }) => foilColor), ["Blauw", "Wit"]);

  association = await service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision, foilColors: ["Wit", "Rood"], defaultFoilColor: "Rood" });
  const changedDefaultOrder = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Waterwijk gewijzigde default", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-137295", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, "waterwijk-blue-black-order")).value;
  assert.deepEqual(changedDefaultOrder.items.map(({ foilColor }) => foilColor), ["Blauw", "Rood"], "override blijft staan terwijl een ervend artikel de nieuwe default volgt");
  await service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision, foilColors: ["Wit", "Rood"], defaultFoilColor: "Wit" });
  const reopened = await service.bootstrap(admin.token);
  assert.equal(reopened.associations.find(({ id }) => id === association.id).defaultFoilColor, "Wit");
  assert.equal(reopened.articles.find(({ id }) => id === blueShirt.id).foilColorOverride, "Blauw");
  assert.deepEqual(reopened.orders.find(({ id }) => id === whiteOrder.id).items.map(({ foilColor }) => foilColor), ["Blauw", "Wit"], "bestaande orders houden hun auditeerbare kleursnapshot");
});

test("een order met meerdere kleuren ondersteunt atomaire deelproductie en meerdere orders per kleurgroep", async (context) => {
  const { service, admin, storeUser } = await fixture(context);
  const initial = await service.bootstrap(admin.token);
  const pioneers = initial.associations.find(({ name }) => name === "Almerer Pioneers");
  await service.updateAssociation(admin.token, admin.csrfToken, pioneers.id, { expectedRevision: pioneers.revision, foilColors: ["Wit"], defaultFoilColor: "Wit" });
  const shirt = (await service.bootstrap(admin.token)).articles.find(({ id }) => id === "sp-live-116386");
  await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: "Blauw" });

  const mixed = await controlledPioneersOrder(service, admin, "mixed", [
    { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
    { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
  ]);
  const whiteOnly = await controlledPioneersOrder(service, admin, "white", [
    { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
  ]);
  assert.deepEqual(mixed.items.map(({ foilColor }) => foilColor), ["Wit", "Blauw"]);
  assert.ok([...mixed.productionLines, ...whiteOnly.productionLines].every(({ heightMm, validation }) => heightMm === 200 && validation.status === "VALID"));

  const beforeUnsafeDirect = await service.bootstrap(admin.token);
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { orders: [{ id: mixed.id, expectedRevision: mixed.revision }] }, "p0-direct-mixed-color"), (error) => error.code === "PRODUCTION_COLOR_GROUP_REQUIRED");
  const afterUnsafeDirect = await service.bootstrap(admin.token);
  assert.equal(afterUnsafeDirect.productionJobs.length, beforeUnsafeDirect.productionJobs.length);
  assert.equal(afterUnsafeDirect.orders.find(({ id }) => id === mixed.id).stage, "CONTROL");

  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [mixed, whiteOnly].map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "p0-color-proposal")).value;
  assert.deepEqual(proposal.groups.map(({ foilColor }) => foilColor).sort(), ["Blauw", "Wit"]);
  const whiteGroup = proposal.groups.find(({ foilColor }) => foilColor === "Wit");
  const blueGroup = proposal.groups.find(({ foilColor }) => foilColor === "Blauw");
  assert.equal(whiteGroup.productionLineRefs.length, 2);
  assert.equal(blueGroup.productionLineRefs.length, 1);
  assert.deepEqual(new Set(whiteGroup.orders.map(({ id }) => id)), new Set([mixed.id, whiteOnly.id]));
  assert.deepEqual(blueGroup.orders.map(({ id }) => id), [mixed.id]);

  const whiteJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: whiteGroup.id, orders: whiteGroup.orders }, "p0-white-job")).value;
  assert.equal(whiteJob.snapshot.productionGroup.foilColor, "Wit");
  assert.ok(whiteJob.snapshot.productionLines.every((line) => whiteGroup.productionLineRefs.some(({ orderId, lineId }) => orderId === line.orderId && lineId === line.id)));
  assert.ok(whiteJob.snapshot.productionLines.every((line) => !blueGroup.productionLineRefs.some(({ orderId, lineId }) => orderId === line.orderId && lineId === line.id)));
  const beforeUnauthorizedCompletion = await service.bootstrap(admin.token);
  await assert.rejects(service.completeProductionJob(storeUser.token, storeUser.csrfToken, whiteJob.id, "p0-store-complete-denied"), (error) => error.code === "FORBIDDEN");
  const afterUnauthorizedCompletion = await service.bootstrap(admin.token);
  assert.equal(afterUnauthorizedCompletion.productionJobs.find(({ id }) => id === whiteJob.id).status, "AWAITING_HUMAN_CHECK");
  assert.deepEqual(afterUnauthorizedCompletion.orders.filter(({ id }) => [mixed.id, whiteOnly.id].includes(id)).map(({ id, revision }) => [id, revision]), beforeUnauthorizedCompletion.orders.filter(({ id }) => [mixed.id, whiteOnly.id].includes(id)).map(({ id, revision }) => [id, revision]));
  const immutableSnapshot = structuredClone(whiteJob.snapshot); const immutableHash = whiteJob.snapshotHash;
  const completedWhite = (await service.completeProductionJob(admin.token, admin.csrfToken, whiteJob.id, "p0-white-complete")).value;
  assert.equal(completedWhite.status, "COMPLETED");
  assert.equal(completedWhite.snapshotHash, immutableHash); assert.deepEqual(completedWhite.snapshot, immutableSnapshot);

  let state = await service.bootstrap(admin.token);
  const mixedAfterWhite = state.orders.find(({ id }) => id === mixed.id);
  const whiteAfterWhite = state.orders.find(({ id }) => id === whiteOnly.id);
  assert.equal(mixedAfterWhite.stage, "PRINT"); assert.equal(whiteAfterWhite.stage, "PRINT");
  assert.equal(whiteAfterWhite.productionClosure.status, "ELIGIBLE");
  assert.ok(mixedAfterWhite.eventHistory.some(({ type, details }) => type === "PRODUCTION_GROUP_PRINTED" && details.foilColor === "Wit" && details.productionLineRefs.length === 1));
  await assert.rejects(service.advanceOrder(admin.token, admin.csrfToken, mixedAfterWhite.id, mixedAfterWhite.revision, "p0-mixed-premature-done"), (error) => error.code === "USE_PRODUCTION_READY_ACTION");
  const whiteReady = (await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: whiteAfterWhite.id, expectedRevision: whiteAfterWhite.revision }] }, "p0-white-ready")).value;
  assert.deepEqual(whiteReady.completed.map(({ id }) => id), [whiteOnly.id]);
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: whiteGroup.id, orders: whiteGroup.orders }, "p0-white-repeat"), (error) => error.code === "PRODUCTION_GROUP_NOT_OPEN");

  state = await service.bootstrap(admin.token);
  const savedProposal = state.productionProposals.find(({ id }) => id === proposal.id);
  const savedBlueGroup = savedProposal.groups.find(({ id }) => id === blueGroup.id);
  assert.equal(savedBlueGroup.status, "OPEN");
  assert.equal(savedBlueGroup.orders[0].expectedRevision, state.orders.find(({ id }) => id === mixed.id).revision);
  const blueJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: blueGroup.id, orders: savedBlueGroup.orders }, "p0-blue-job-001")).value;
  assert.equal(blueJob.snapshot.productionGroup.foilColor, "Blauw");
  assert.equal(blueJob.snapshot.productionLines.length, 1);
  assert.equal(blueJob.snapshot.productionLines[0].id, blueGroup.productionLineRefs[0].lineId);
  await service.completeProductionJob(admin.token, admin.csrfToken, blueJob.id, "p0-blue-complete");
  state = await service.bootstrap(admin.token);
  const mixedFullyProduced = state.orders.find(({ id }) => id === mixed.id);
  assert.equal(mixedFullyProduced.stage, "PRINT");
  assert.equal(mixedFullyProduced.productionClosure.status, "ELIGIBLE");
  const mixedReady = (await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: mixedFullyProduced.id, expectedRevision: mixedFullyProduced.revision }] }, "p0-mixed-ready")).value;
  assert.deepEqual(mixedReady.completed.map(({ id }) => id), [mixed.id]);
  assert.ok(state.audit.some(({ action, details }) => action === "Productiegroep bedrukt" && details.foilColor === "Wit" && details.snapshotHash === immutableHash));
});

test("kleine type-sortering ordent stabiel binnen één kleur vóór de bestaande nesting", async (context) => {
  const { store, service, admin } = await fixture(context);
  const before = structuredClone((await store.read()).productionJobs.filter(({ id }) => id.includes("golden")));
  const font = (await store.read()).productionFonts[0];
  const input = [
    ["name-a", "TEXT", "WEIDE", "Naam WEIDE", 120, 30],
    ["back-a", "NUMBER", "10", "Rugnummer 10", 120, 200],
    ["initials-a", "INITIALS", "DW", "Initialen DW", 50, 30],
    ["short-a", "NUMBER", "10", "Shortnummer 10", 50, 75],
    ["initials-b", "INITIALS", "AB", "Initialen AB", 50, 30],
    ["name-b", "TEXT", "JANSEN", "Naam JANSEN", 140, 30],
    ["back-b", "NUMBER", "34", "Rugnummer 34", 130, 200],
    ["short-b", "NUMBER", "34", "Shortnummer 34", 55, 75],
  ];
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "P0 sortering", customerEmail: "", customerPhone: "0612345678", standardPersonalization: empty,
    items: [{ product: "Sorteringstest", size: "", quantity: 8, personalization: "Gerichte productiefixture", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: input.map(([id, type, content, previewLabel, widthMm, heightMm]) => ({ id, type, content, previewLabel, widthMm, heightMm, quantity: 1, sourceId: font.id, provenance: "P0 sort-key regressiefixture" })),
  }, "p0-sort-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "p0-sort-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "p0-sort-proposal")).value;
  assert.equal(proposal.groups.length, 1);
  assert.deepEqual(proposal.groups[0].productionLineRefs.map(({ lineId }) => lineId), ["initials-a", "initials-b", "short-a", "short-b", "back-a", "back-b", "name-a", "name-b"]);
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "p0-sort-job-001")).value;
  assert.deepEqual(job.snapshot.productionLines.map(({ id }) => id), ["initials-a", "initials-b", "short-a", "short-b", "back-a", "back-b", "name-a", "name-b"]);
  assert.deepEqual(job.snapshot.productionLines.map(({ widthMm, heightMm }) => [widthMm, heightMm]), [[50, 30], [50, 30], [50, 75], [55, 75], [120, 200], [130, 200], [120, 30], [140, 30]]);
  assert.equal(job.snapshot.scale, 1); assert.equal(job.snapshot.artifact.format, "SVG");
  assert.deepEqual((await store.read()).productionJobs.filter(({ id }) => id.includes("golden")), before, "Golden/reference-jobs blijven byte- en objectgelijk");
});
