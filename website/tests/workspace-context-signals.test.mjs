import test from "node:test";
import assert from "node:assert/strict";
import { createPermissionPolicy, updateUserPermissions, compileEffectivePermissions } from "../scripts/workspace-permissions.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { effectiveSignalDisplay } from "../src/workspace-context-signal-catalog.mjs";
import { registerCounterPrintingOrigin, registerWebshopPrintingOrigin, projectPrintingSignals } from "../scripts/sportpaleis-printing-signals.mjs";
const at = "2026-09-09T08:00:00.000Z";
const policy = () => createPermissionPolicy("tenant-a", { admin: { presetId: "developer", overrides: {} }, worker: { presetId: "operations", overrides: {} }, colleague: { presetId: "operations", overrides: {} } }, { enabledCapabilities: CAPABILITY_IDS });
const order = (id, source = "STORE") => ({ id, sourceContext: { source }, createdAt: at, stage: "ORDER", productionLines: [{ quantity: 12 }] });
const worker = { id: "worker", role: "operator", seatType: "customer", status: "Actief" };
const project = (orders, extra = {}) => projectPrintingSignals({ orders, tenantId: "tenant-a", policy: policy(), userId: "worker", allowed: CAPABILITY_IDS, now: new Date(at), completedAt: item => item.confirmedAt, ...extra });
const value = (view, id) => view.signals.find(signal => signal.id === id)?.value;

test("first personal employee order starts counter registration; no historic backfill, no name hardcode", () => {
  const history = order("historic"), state = { organizationId: "tenant-a", orders: [history] };
  const earlyOwner = order("early-owner"); registerCounterPrintingOrigin(state, earlyOwner, { ...worker, role: "admin" }); assert.equal(earlyOwner.printingOrigin, undefined);
  const first = order("first"); registerCounterPrintingOrigin(state, first, worker); state.orders.push(first);
  assert.equal(first.printingOrigin.actorId, "worker"); assert.equal(history.printingOrigin, undefined);
  const laterOwner = order("later-owner"); registerCounterPrintingOrigin(state, laterOwner, { ...worker, id: "owner", role: "admin" }); state.orders.push(laterOwner);
  assert.equal(value(project(state.orders), "printing.counter"), 2); // 2 orders, not 24 pieces
  const stable = structuredClone(first.printingOrigin); registerCounterPrintingOrigin(state, first, worker); assert.deepEqual(first.printingOrigin, stable);
  const plain = { ...order("plain"), productionLines: [], items: [{ personalization: { backNumberSizeClass: "SENIOR" } }] }; registerCounterPrintingOrigin(state, plain, worker); assert.equal(plain.printingOrigin, undefined);
});

test("webshop requires a verified activation boundary; older imports never become registered history", () => {
  const item = order("webshop", "WEBSHOP_XPRT"); const evidence = { tenantId: "tenant-a", actorId: "worker", sourceIdentity: "source:order:123", observedAt: at, activation: { tenantId: "tenant-a", status: "LIVE", releaseId: "fixture-only", activatedAt: "2026-09-09T07:00:00Z" } };
  assert.throws(() => registerWebshopPrintingOrigin(item, { ...evidence, activation: null }), { code: "PRINTING_SOURCE_NOT_LIVE" });
  assert.throws(() => registerWebshopPrintingOrigin({ ...item, createdAt: "2026-09-08T12:00:00Z" }, evidence), { code: "PRINTING_SOURCE_NOT_LIVE" });
  registerWebshopPrintingOrigin(item, evidence); assert.equal(value(project([item]), "printing.webshop"), 1);
  assert.equal(value(project([item, { ...item, id: "duplicate-handoff" }]), "printing.webshop"), 1);
  assert.equal(value(project([item], { allowed: ["orders.view"] }), "printing.webshop"), undefined);
  assert.deepEqual(project([order("legacy", "WEBSHOP_XPRT")]).signals, []);
});

test("context projection is bounded in-memory work without datastore IO", t => {
  const p = policy(); const orders = Array.from({ length: 5000 }, (_, i) => order(`historical-${i}`));
  const fresh = order("fresh"); registerCounterPrintingOrigin({ organizationId: "tenant-a", orders }, fresh, worker); orders.push(fresh);
  const samples = [];
  for (let i = 0; i < 200; i++) { const started = performance.now(); const view = project(orders, { policy: p }); assert.equal(value(view, "printing.counter"), 1); samples.push(performance.now() - started); }
  samples.sort((a,b) => a-b);
  t.diagnostic(JSON.stringify({ historicalOrders: 5000, registeredOrders: 1, samples: 200, p50Ms: samples[100], p95Ms: samples[190], datastoreQueries: 0 }));
  assert.ok(samples[190] < 100);
});

test("open counts, genuine completion date, dedupe, deletion and Dutch day are projected without writes", () => {
  const state = { organizationId: "tenant-a", orders: [] }; const open = order("open"), done = order("done"), deleted = order("deleted");
  for (const item of [open, done, deleted]) { registerCounterPrintingOrigin(state, item, worker); state.orders.push(item); }
  done.stage = "DONE"; done.confirmedAt = "2026-09-09T22:30:00Z"; deleted.deletion = { status: "DELETED" };
  const before = JSON.stringify(state);
  const view = project([...state.orders, open], { now: new Date("2026-09-09T23:00:00Z") });
  assert.equal(value(view, "printing.counter"), 1); assert.equal(value(view, "printing.completed_today"), 1);
  const archivedDone = { ...done, productionArchive: { status: "ARCHIVED" } };
  assert.equal(value(project([archivedDone], { now: new Date("2026-09-09T23:00:00Z") }), "printing.completed_today"), 1);
  assert.equal(value(project(state.orders, { completedAt: () => null }), "printing.completed_today"), 0);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(project(state.orders, { tenantId: "tenant-b" }).signals, []);
  assert.deepEqual(project(state.orders, { allowed: [] }).signals, []);
});

test("display defaults, user/preset updates, source explanation, reset, audit and conflict preserve permissions", () => {
  let p = policy(); const context = { tenantId: "tenant-a", userId: "admin" }; const before = compileEffectivePermissions(p, "worker").allowed;
  p = updateUserPermissions(p, context, { expectedVersion: 1, userId: "worker", displayPriorities: { "printing.counter": "HIDDEN" }, presetDisplayPriorities: { "printing.counter": "PRIMARY" } });
  assert.equal(effectiveSignalDisplay(p, "worker")["printing.counter"].priority, "HIDDEN");
  assert.equal(effectiveSignalDisplay(p, "colleague")["printing.counter"].priority, "PRIMARY");
  assert.deepEqual(compileEffectivePermissions(p, "worker").allowed, before);
  assert.equal(p.audit[0].actor, "admin"); assert.equal(p.audit[0].presetDisplayChange.next["printing.counter"], "PRIMARY");
  assert.throws(() => updateUserPermissions(p, context, { expectedVersion: 1, userId: "worker" }), { statusCode: 409 });
  assert.throws(() => updateUserPermissions(p, context, { expectedVersion: 2, userId: "worker", displayPriorities: { "printing.counter": "FAKE" } }), { statusCode: 400 });
  assert.throws(() => updateUserPermissions(p, { ...context, userId: "worker" }, { expectedVersion: 2, userId: "worker" }), { statusCode: 403 });
  p = updateUserPermissions(p, context, { expectedVersion: 2, userId: "worker", reset: true });
  assert.equal(effectiveSignalDisplay(p, "worker")["printing.counter"].priority, "PRIMARY");
});
