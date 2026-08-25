import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { archiveConfirmedPilotOrders, archiveFinalCleanStartScope, cleanupEvidenceManifest, finalCleanStartEvidenceManifest, finalCleanStartInventory, preliveCleanupInventory } from "../scripts/sportpaleis-prelive-order-cleanup.mjs";
import { SportpaleisFileStore, SportpaleisPilotService, validateSportpaleisPilotState } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { buildWorkspaceSearchIndex, isOperationalOrder } from "../src/workspace-search.ts";

function order(id, customer, customerEmail, revision = 3) {
  return {
    id, customer, customerEmail, revision, stage: "PRINT", updatedAt: "2026-08-21T00:00:00.000Z", eventHistory: [], items: [],
    association: "Testvereniging", sourceContext: { source: "STORE" },
  };
}

test("pre-live cleanup archiveert alleen expliciet bevestigde testorders en bewaart productie-evidence", () => {
  const testOrder = order("SP-2026-0001", "Test 1", "test-1@example.invalid");
  const uncertainOrder = order("SP-2026-0002", "Mogelijk echte klant", "klant@example.nl");
  const productionJob = { id: "job-1", snapshot: { orderIds: [testOrder.id] }, immutableEvidence: "blijft exact staan" };
  const state = { revision: 800, orders: [testOrder, uncertainOrder], productionJobs: [productionJob], audit: [] };
  const inventory = preliveCleanupInventory(state);
  const evidence = cleanupEvidenceManifest(state, inventory, { releaseId: "SPW-R8-TEST", preparedAt: "2026-08-24T00:00:00.000Z", actor: "test" });
  assert.equal(evidence.orders.length, 1);
  assert.ok(evidence.sha256);
  assert.deepEqual(evidence.exclusions, { productionAssets: true, associations: true, productionProfiles: true, usersAndRoles: true, configuration: true, deploymentEvidence: true });
  assert.deepEqual({ active: inventory.activeOrders, confirmed: inventory.confirmedTestOrders, uncertain: inventory.unverifiedOrders }, { active: 2, confirmed: 1, uncertain: 1 });
  const beforeJob = structuredClone(productionJob);
  const result = archiveConfirmedPilotOrders(state, { expectedRevision: 800, confirmedFingerprint: inventory.confirmedFingerprint, at: "2026-08-21T01:00:00.000Z" });
  assert.equal(testOrder.deletion.status, "DELETED");
  assert.equal(testOrder.deletion.restorable, false);
  assert.equal(uncertainOrder.deletion, undefined);
  assert.deepEqual(state.productionJobs[0], beforeJob);
  assert.deepEqual(result.value, { archived: [testOrder.id], historyPreserved: true, hardDeleted: false });
  assert.ok(testOrder.eventHistory.some(({ type, details }) => type === "ORDER_DELETED" && details.productionHistoryPreserved));
  assert.ok(state.audit.some(({ action, subject }) => action.includes("testorder") && subject === testOrder.id));
});

test("cleanup is aan dezelfde revision en fingerprint gebonden", () => {
  const state = { revision: 12, orders: [order("SP-2026-0003", "Test 3", "test-3@example.invalid")], productionJobs: [], audit: [] };
  const inventory = preliveCleanupInventory(state);
  assert.throws(() => archiveConfirmedPilotOrders(structuredClone(state), { expectedRevision: 11, confirmedFingerprint: inventory.confirmedFingerprint }), ({ code }) => code === "REVISION_CONFLICT");
  assert.throws(() => archiveConfirmedPilotOrders(structuredClone(state), { expectedRevision: 12, confirmedFingerprint: "incorrect" }), ({ code }) => code === "CLEANUP_FINGERPRINT_MISMATCH");
});

test("final clean start archiveert exact de bounded peildatum en bewaart Product Truth", () => {
  const old = { ...order("SP-2026-0100", "Pilotorder", "pilot@sportpaleis.nl"), createdAt: "2026-08-25T09:00:00.000Z" };
  const next = { ...order("SP-2026-0101", "Nieuwe echte order", "klant@example.nl"), createdAt: "2026-08-25T11:00:00.000Z" };
  const teamkit = { id: "teamkit-1", aggregateRevision: 4, currentRevision: 2, status: "IN_DESIGN", createdAt: "2026-08-25T09:30:00.000Z", updatedAt: "2026-08-25T09:45:00.000Z", archivedAt: null };
  const state = { revision: 99, orders: [old, next], productionJobs: [{ id: "job-old", snapshot: { orderIds: [old.id] } }], productionProposals: [], teamkitProposals: [teamkit], audit: [], associations: [{ id: "club" }], articles: [{ id: "article" }], productionProfiles: [{ id: "profile" }], productionElements: [{ id: "asset" }] };
  const inventory = finalCleanStartInventory(state, { cutoffAt: "2026-08-25T10:00:00.000Z" });
  const evidence = finalCleanStartEvidenceManifest(state, inventory, { releaseId: "SPW-FINAL-TEST", preparedAt: "2026-08-25T10:05:00.000Z" });
  assert.deepEqual(inventory.scope, { orders: 1, activeOrders: 1, productionProposals: 0, productionJobs: 1, teamkitProposals: 1, activeTeamkitProposals: 1 });
  assert.deepEqual(evidence.orders.map(({ id }) => id), [old.id]);
  assert.deepEqual(evidence.teamkitProposals.map(({ id }) => id), [teamkit.id]);
  assert.ok(evidence.sha256);
  const preserved = { associations: structuredClone(state.associations), articles: structuredClone(state.articles), profiles: structuredClone(state.productionProfiles), assets: structuredClone(state.productionElements), jobs: structuredClone(state.productionJobs) };
  const result = archiveFinalCleanStartScope(state, { expectedRevision: 99, scopeFingerprint: inventory.scopeFingerprint, cutoffAt: inventory.cutoffAt, at: "2026-08-25T10:10:00.000Z" });
  assert.equal(old.deletion.status, "DELETED");
  assert.equal(next.deletion, undefined);
  assert.equal(teamkit.status, "ARCHIVED");
  assert.deepEqual(state.associations, preserved.associations);
  assert.deepEqual(state.articles, preserved.articles);
  assert.deepEqual(state.productionProfiles, preserved.profiles);
  assert.deepEqual(state.productionElements, preserved.assets);
  assert.deepEqual(state.productionJobs, preserved.jobs);
  assert.deepEqual(result.value.archivedOrders, [old.id]);
  assert.deepEqual(result.value.archivedTeamkitProposals, [teamkit.id]);
});

test("final clean start faalt gesloten bij nieuwe state of gewijzigde bounded set", () => {
  const old = { ...order("SP-2026-0102", "Pilotorder", "pilot@sportpaleis.nl"), createdAt: "2026-08-25T09:00:00.000Z" };
  const state = { revision: 100, orders: [old], productionJobs: [], productionProposals: [], teamkitProposals: [], audit: [] };
  const inventory = finalCleanStartInventory(state, { cutoffAt: "2026-08-25T10:00:00.000Z" });
  assert.throws(() => archiveFinalCleanStartScope(structuredClone(state), { expectedRevision: 101, scopeFingerprint: inventory.scopeFingerprint, cutoffAt: inventory.cutoffAt }), ({ code }) => code === "REVISION_CONFLICT");
  assert.throws(() => archiveFinalCleanStartScope(structuredClone(state), { expectedRevision: 100, scopeFingerprint: "wrong", cutoffAt: inventory.cutoffAt }), ({ code }) => code === "CLEAN_START_FINGERPRINT_MISMATCH");
});

test("final clean start valideert op een volledige production-shaped datastorekopie", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "spw-final-clean-start-copy-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: "Final-Copy-Kevin!", patrick: "Final-Copy-Patrick!", collega: "Final-Copy-Store!", "donovan-support": "Final-Copy-Support!" } });
  await store.initialize();
  const state = await store.read();
  const preserved = { associations: structuredClone(state.associations), articles: structuredClone(state.articles), profiles: structuredClone(state.productionProfiles), assets: structuredClone(state.productionElements), fonts: structuredClone(state.productionFonts), users: structuredClone(state.users) };
  const inventory = finalCleanStartInventory(state, { cutoffAt: "2026-08-26T00:00:00.000Z" });
  const evidence = finalCleanStartEvidenceManifest(state, inventory, { releaseId: "SPW-FINAL-COPY" });
  const result = archiveFinalCleanStartScope(state, { expectedRevision: state.revision, scopeFingerprint: inventory.scopeFingerprint, cutoffAt: inventory.cutoffAt, at: "2026-08-26T00:01:00.000Z" });
  const validated = validateSportpaleisPilotState(result.state);
  assert.ok(evidence.sha256);
  assert.equal(validated.orders.filter(({ id, deletion }) => inventory.orderIds.includes(id) && !deletion).length, 0);
  assert.equal((validated.teamkitProposals ?? []).filter(({ id, status }) => inventory.teamkitProposalIds.includes(id) && status !== "ARCHIVED").length, 0);
  assert.deepEqual(validated.associations, preserved.associations);
  assert.deepEqual(validated.articles, preserved.articles);
  assert.deepEqual(validated.productionProfiles, preserved.profiles);
  assert.deepEqual(validated.productionElements, preserved.assets);
  assert.deepEqual(validated.productionFonts, preserved.fonts);
  assert.deepEqual(validated.users, preserved.users);
});

test("first-day bootstrap toont een lege werkset maar behoudt Product Truth en recovery-evidence", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "spw-first-day-copy-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const seedPasswords = { kevin: "First-Day-Kevin!", patrick: "First-Day-Patrick!", collega: "First-Day-Store!", "donovan-support": "First-Day-Support!" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime") });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: seedPasswords.kevin });
  const before = await service.bootstrap(admin.token);
  const current = await store.read();
  const inventory = finalCleanStartInventory(current, { cutoffAt: "2026-08-26T00:00:00.000Z" });
  const manifest = finalCleanStartEvidenceManifest(current, inventory, { releaseId: "SPW-FIRST-DAY-COPY" });
  await store.mutate(async (state) => archiveFinalCleanStartScope(state, { expectedRevision: state.revision, scopeFingerprint: finalCleanStartInventory(state, { cutoffAt: inventory.cutoffAt }).scopeFingerprint, cutoffAt: inventory.cutoffAt, at: "2026-08-26T00:01:00.000Z" }));
  const after = await service.bootstrap(admin.token);
  assert.ok(before.orders.length > 0);
  assert.equal(after.orders.length, 0);
  assert.equal(after.productionProposals.length, 0);
  assert.equal(after.teamkitProposals.length, 0);
  assert.ok(after.productionJobs.every(({ snapshot }) => snapshot.orderIds.every((id) => !before.orders.some(({ id: orderId }) => orderId === id))));
  assert.deepEqual(after.associations, before.associations);
  assert.deepEqual(after.articles, before.articles);
  assert.deepEqual(after.productionProfiles, before.productionProfiles);
  assert.deepEqual(after.productionElements, before.productionElements);
  assert.ok(manifest.orders.length > 0);
  assert.ok(manifest.sha256);
  assert.ok(JSON.stringify(after).length < JSON.stringify(before).length);
});

test("testdata telt niet mee in Today, Search of primaire Productie", async () => {
  const testOrder = { ...order("SP-2026-0004", "Test 4", "test-4@example.invalid"), items: [{ product: "Shirt", association: "Testvereniging" }] };
  const realOrder = { ...order("SP-2026-0005", "Echte context", "context@example.nl"), items: [{ product: "Shirt", association: "Vereniging" }] };
  assert.equal(isOperationalOrder(testOrder), false);
  assert.equal(isOperationalOrder(realOrder), true);
  const index = buildWorkspaceSearchIndex({ orders: [testOrder, realOrder], articles: [], associations: [], employees: [], productionJobs: [], capabilities: {} });
  assert.deepEqual(index.filter(({ kind }) => kind === "ORDER").map(({ id }) => id), [realOrder.id]);
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /const operationalOrders = state\.orders\.filter\(isOperationalOrder\)/u);
  assert.match(source, /const events = operationalOrders\.flatMap/u);
  assert.match(source, /const operationalOrders = state\.orders\.filter\(isOperationalProductionOrder\)/u);
});

test("Productie is batch-first en technische prepared PlotJobs staan alleen in historie", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const primary = source.slice(source.indexOf("function productionExecution"), source.indexOf("function proofLabel"));
  assert.doesNotMatch(primary, /const currentJobCards/u);
  assert.match(primary, /VOLGENDE FYSIEKE STAP/u);
  assert.match(primary, /Welke foliekleur wil je nu produceren/u);
  assert.match(primary, /\+ Bekijk wat meegaat/u);
  assert.match(primary, /data-direct-production-order-select/u);
  assert.match(primary, /Alles is veilig voorgeselecteerd/u);
  assert.match(primary, /\+ Bekijk technisch complete orders/u);
  assert.match(primary, /orders Afronden/u);
  assert.match(primary, /Plot-\/printhistorie/u);
  assert.match(primary, /voorbereid\$\{currentJobs\.length/u);
});
