import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { archiveConfirmedPilotOrders, preliveCleanupInventory } from "../scripts/sportpaleis-prelive-order-cleanup.mjs";
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
  assert.match(source, /const activeOrders = state\.orders\.filter\(isOperationalOrder\)/u);
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
  assert.match(primary, /\+ Bekijk orders/u);
  assert.match(primary, /orders Gereed melden/u);
  assert.match(primary, /Plot-\/printhistorie/u);
  assert.match(primary, /voorbereid\$\{currentJobs\.length/u);
});
