import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Bulk-UX-Admin-2026!", patrick: "Bulk-UX-Operator-2026!", collega: "Bulk-UX-Store-2026!", "donovan-support": "Bulk-UX-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-bulk-ux-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PILOT-UX-BULK-PRODUCTION-READY-TEST" });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

async function controlledOrder(service, actor, key, items) {
  const created = (await service.createOrder(actor.token, actor.csrfToken, {
    orderKind: "INDIVIDUAL", customer: `Bulk UX ${key}`, customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" }, items,
  }, `${key}-create-order`)).value;
  return (await service.advanceOrder(actor.token, actor.csrfToken, created.id, created.revision, `${key}-to-control`)).value;
}

test("selectie over kleuren gebruikt bestaande groepen en bulk Gereed slaat onvolledige orders veilig over", async (context) => {
  const { store, service, admin } = await fixture(context);
  const initial = await service.bootstrap(admin.token);
  const lineLessControlled = initial.orders.filter(({ stage, productionLines }) => stage === "CONTROL" && !productionLines?.length);
  assert.ok(lineLessControlled.length > 0, "seed bevat de historische CONTROL-zonder-productieregels situatie");
  assert.ok(lineLessControlled.every(({ productionStatus, productionStatusReason }) => productionStatus === "ATTENTION" && /geen gevalideerde productieregels/u.test(productionStatusReason)));
  const pioneers = initial.associations.find(({ name }) => name === "Almerer Pioneers");
  if (pioneers.defaultFoilColor !== "Wit") await service.updateAssociation(admin.token, admin.csrfToken, pioneers.id, { expectedRevision: pioneers.revision, foilColors: pioneers.foilColors, defaultFoilColor: "Wit" });
  const legacyOrder = await controlledOrder(service, admin, "legacy-unmanaged", [{ articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty }]);
  const legacyProposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: legacyOrder.id, expectedRevision: legacyOrder.revision }] }, "bulk-ux-legacy-proposal")).value;
  await store.mutate(async (state) => {
    state.orders.find(({ id }) => id === legacyOrder.id).items.forEach((item) => { item.foilColor = "Onbekend"; });
    const group = state.productionProposals.find(({ id }) => id === legacyProposal.id).groups[0];
    group.foilColor = "Onbekend";
    group.label = "Onbekend — 1 order";
    return { state, value: null };
  });
  const unmanagedState = await service.bootstrap(admin.token);
  const unmanagedColorOrder = unmanagedState.orders.find(({ id }) => id === legacyOrder.id);
  assert.equal(unmanagedColorOrder.productionStatus, "ATTENTION");
  assert.match(unmanagedColorOrder.productionStatusReason, /beheerde foliekleur ontbreekt/u);
  const unmanagedProposal = unmanagedState.productionProposals.find(({ id }) => id === legacyProposal.id);
  const unmanagedGroup = unmanagedProposal.groups[0];
  const jobsBeforeUnmanagedAttempt = unmanagedState.productionJobs.length;
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { proposalId: unmanagedProposal.id, proposalGroupId: unmanagedGroup.id, orders: unmanagedGroup.orders }, "bulk-ux-unmanaged-color-denied"), (error) => error.code === "PRODUCTION_FOIL_COLOR_UNMANAGED");
  const afterUnmanagedAttempt = await service.bootstrap(admin.token);
  assert.equal(afterUnmanagedAttempt.productionJobs.length, jobsBeforeUnmanagedAttempt);
  assert.equal(afterUnmanagedAttempt.orders.find(({ id }) => id === unmanagedColorOrder.id).revision, unmanagedColorOrder.revision);
  const shirt = (await service.bootstrap(admin.token)).articles.find(({ id }) => id === "sp-live-116386");
  if (shirt.foilColorOverride !== "Blauw") await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: "Blauw" });

  const mixed = await controlledOrder(service, admin, "mixed", [
    { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
    { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
  ]);
  const white = await controlledOrder(service, admin, "white", [{ articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty }]);
  const blue = await controlledOrder(service, admin, "blue", [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }]);

  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [mixed, white, blue].map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "bulk-ux-multicolor-proposal")).value;
  assert.deepEqual(proposal.groups.map(({ foilColor }) => foilColor).sort(), ["Blauw", "Wit"]);
  const whiteGroup = proposal.groups.find(({ foilColor }) => foilColor === "Wit");
  const blueGroup = proposal.groups.find(({ foilColor }) => foilColor === "Blauw");
  assert.deepEqual(new Set(whiteGroup.orders.map(({ id }) => id)), new Set([mixed.id, white.id]));
  assert.deepEqual(new Set(blueGroup.orders.map(({ id }) => id)), new Set([mixed.id, blue.id]));

  const whiteJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: whiteGroup.id, orders: whiteGroup.orders }, "bulk-ux-white-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, whiteJob.id, "bulk-ux-white-complete");
  let state = await service.bootstrap(admin.token);
  const mixedAfterWhite = state.orders.find(({ id }) => id === mixed.id);
  const whiteAfterWhite = state.orders.find(({ id }) => id === white.id);
  assert.equal(mixedAfterWhite.stage, "PRINT");
  assert.equal(whiteAfterWhite.stage, "PRINT");

  const firstBulk = (await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [mixedAfterWhite, whiteAfterWhite].map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "bulk-ux-ready-white")).value;
  assert.deepEqual(firstBulk.completed.map(({ id }) => id), [white.id]);
  assert.deepEqual(firstBulk.skipped.map(({ id, code }) => [id, code]), [[mixed.id, "PRODUCTION_LINES_PENDING"]]);
  state = await service.bootstrap(admin.token);
  assert.equal(state.orders.find(({ id }) => id === mixed.id).stage, "PRINT");
  assert.equal(state.orders.find(({ id }) => id === white.id).stage, "DONE");
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: whiteGroup.id, orders: whiteGroup.orders }, "bulk-ux-no-white-repeat"), (error) => error.code === "PRODUCTION_GROUP_NOT_OPEN");

  const savedBlueGroup = state.productionProposals.find(({ id }) => id === proposal.id).groups.find(({ id }) => id === blueGroup.id);
  const blueJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: savedBlueGroup.id, orders: savedBlueGroup.orders }, "bulk-ux-blue-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, blueJob.id, "bulk-ux-blue-complete");
  state = await service.bootstrap(admin.token);
  const finalSelection = [mixed.id, blue.id].map((id) => state.orders.find((order) => order.id === id));
  const secondBulk = (await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: finalSelection.map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "bulk-ux-ready-blue")).value;
  assert.deepEqual(new Set(secondBulk.completed.map(({ id }) => id)), new Set([mixed.id, blue.id]));
  assert.equal(secondBulk.skipped.length, 0);
  state = await service.bootstrap(admin.token);
  assert.ok([mixed.id, white.id, blue.id].every((id) => state.orders.find((order) => order.id === id).stage === "DONE"));
  assert.ok(state.audit.some(({ action, subject }) => action === "Volledig geproduceerde order in bulk Gereed gemeld" && subject === mixed.id));
  assert.ok([whiteJob.id, blueJob.id].map((id) => state.productionJobs.find((job) => job.id === id)).every(({ snapshot }) => new Set(snapshot.productionLines.map(({ foilColor }) => foilColor)).size === 1), "kleur blijft een harde PlotJob-grens");
});

test("soft-delete verdwijnt uit operatie, is geautoriseerd en bewaart consequential productiehistorie", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);
  await store.mutate(async (state) => { state.productionJobs = []; state.productionProposals = []; state.nextOrderSequence = 500; return { state, value: null }; });
  const disposable = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Verkeerde invoer", customerEmail: "", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, "bulk-ux-delete-disposable")).value;
  await assert.rejects(service.deleteOrder(storeUser.token, storeUser.csrfToken, disposable.id, { expectedRevision: disposable.revision, reason: "Niet bevoegd" }), (error) => error.code === "FORBIDDEN");
  const deleted = await service.deleteOrder(operator.token, operator.csrfToken, disposable.id, { expectedRevision: disposable.revision, reason: "Foutieve invoer" });
  assert.deepEqual({ status: deleted.deletion.status, restorable: deleted.deletion.restorable, by: deleted.deletion.byUserId, reason: deleted.deletion.reason }, { status: "DELETED", restorable: true, by: operator.user.id, reason: "Foutieve invoer" });
  assert.ok(deleted.eventHistory.some(({ type }) => type === "ORDER_DELETED"));
  await assert.rejects(service.advanceOrder(operator.token, operator.csrfToken, deleted.id, deleted.revision, "bulk-ux-deleted-advance"), (error) => error.code === "ORDER_DELETED");
  const restored = await service.restoreOrder(operator.token, operator.csrfToken, deleted.id, { expectedRevision: deleted.revision });
  assert.equal(restored.deletion, undefined);
  assert.ok(restored.eventHistory.some(({ type }) => type === "ORDER_RESTORED"));

  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, restored.id, restored.revision, "bulk-ux-restored-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "bulk-ux-history-proposal")).value;
  const group = proposal.groups[0];
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "bulk-ux-history-job")).value;
  const immutableBefore = structuredClone((await service.bootstrap(admin.token)).productionJobs.find(({ id }) => id === job.id));
  const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === restored.id);
  const archived = await service.deleteOrder(operator.token, operator.csrfToken, current.id, { expectedRevision: current.revision, reason: "Archiveren met historie" });
  assert.equal(archived.deletion.restorable, false);
  await assert.rejects(service.restoreOrder(operator.token, operator.csrfToken, archived.id, { expectedRevision: archived.revision }), (error) => error.code === "ORDER_RESTORE_NOT_ALLOWED");
  const immutableAfter = (await service.bootstrap(admin.token)).productionJobs.find(({ id }) => id === job.id);
  assert.deepEqual(immutableAfter, immutableBefore, "PlotJob, artifactreferentie en snapshot blijven exact behouden");
});

test("dunne UX toont select-all, exception-first, Produceren, bulk Gereed en Verwijderd zonder mailactie", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(source, /data-action="select-all-production-orders"[^]*?>Alles selecteren</u);
  assert.match(source, /data-action="create-production-proposal"[^]*?>Produceren</u);
  assert.match(source, /Klaar voor productie/u);
  assert.match(source, /Aandacht nodig/u);
  assert.match(source, />Oplossen ›</u);
  assert.match(source, /data-action="select-all-completion-orders"[^]*?>Alles selecteren</u);
  assert.match(source, /data-action="bulk-complete-production-orders"[^]*?>Gereed</u);
  assert.match(source, /data-filter="deleted"[^]*?>Verwijderd</u);
  assert.match(source, /data-delete-order-form/u);
  assert.doesNotMatch(source, /bulk-complete-production-orders[^]{0,800}(mail|notification)/iu);
  assert.match(server, /completeProductionOrders/u);
  assert.match(server, /PRODUCTION_LINES_PENDING/u);
  assert.match(server, /ORDER_DELETED/u);
  assert.match(server, /PRODUCTION_FOIL_COLOR_UNMANAGED/u);
  assert.match(source, /managedFoilColors[^]*openGroups\.splice/u);
  assert.match(source, /actieve beheerde foliekleur ontbreekt/u);
});
