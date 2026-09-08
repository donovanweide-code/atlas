import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { createPermissionPolicy, compileEffectivePermissions, permissionDecision, updateUserPermissions, migrateLegacyPermissions, validatePermissionPolicy } from "../scripts/workspace-permissions.mjs";

const users = { donovan: { presetId: "developer", overrides: {} }, kevin: { presetId: "owner", overrides: {} }, patrick: { presetId: "operations", overrides: {} }, erik: { presetId: "production", overrides: {} }, employee: { presetId: "employee", overrides: {} } };
const fixture = () => createPermissionPolicy("fixture", users, { enabledCapabilities: CAPABILITY_IDS });
const context = (userId = "donovan") => ({ tenantId: "fixture", userId });
const can = (p, user, capability, object) => permissionDecision(p, context(user), capability, object).allowed;
const update = (p, userId, overrides, actor = "donovan") => updateUserPermissions(p, context(actor), { userId, expectedVersion: p.version, overrides });
test("Sportpaleis tenant fixture: all five presets, owner is not developer", () => {
  const p = fixture();
  for (const id of Object.keys(users)) assert.equal(can(p, id, "orders.create"), true);
  for (const id of ["donovan", "kevin", "patrick", "erik"]) assert.equal(can(p, id, "production.execute"), true);
  for (const id of ["donovan", "kevin", "patrick"]) assert.equal(can(p, id, "planning.view"), true);
  for (const id of ["erik", "employee"]) assert.equal(can(p, id, "planning.view"), false);
  assert.equal(can(p, "employee", "production.execute"), false);
  assert.equal(can(p, "kevin", "management.permissions"), true);
  for (const id of ["kevin", "patrick", "erik", "employee"]) assert.equal(can(p, id, "developer.manage"), false);
});
test("individual overrides and tenant denial have deterministic precedence", () => {
  let p = update(fixture(), "erik", { "planning.view": "allow", "production.execute": "deny" });
  assert.ok(can(p, "erik", "planning.view")); assert.equal(can(p, "erik", "production.execute"), false);
  p.deniedCapabilities.push("planning.view"); assert.equal(can(p, "erik", "planning.view"), false);
  p.deniedCapabilities = []; p.enabledCapabilities = p.enabledCapabilities.filter(id => id !== "planning.view"); assert.equal(can(p, "erik", "planning.view"), false);
});
test("view never implies mutate; destructive and connector management are separate", () => {
  const p = update(fixture(), "employee", { "planning.view": "allow", "mail.send": "allow" });
  assert.ok(can(p, "employee", "planning.view"));
  for (const id of ["planning.create", "planning.delete", "connectors.manage", "product_truth.approve"]) assert.equal(can(p, "employee", id), false);
  assert.ok(can(p, "employee", "mail.send"));
});
test("private objects, explicit shared work and module-independent access", () => {
  let p = fixture(); const obj = { tenantId: "fixture", id: "task-1", type: "WORK_ITEM", ownerId: "patrick", visibility: "private" };
  assert.ok(can(p, "patrick", "planning.complete", obj));
  assert.equal(can(p, "kevin", "planning.view", obj), false);
  obj.shares = [{ subjectType: "user", subjectId: "erik", capabilities: ["planning.view", "planning.note", "planning.complete"] }];
  assert.equal(can(p, "erik", "planning.view"), false);
  assert.ok(can(p, "erik", "planning.view", obj)); assert.ok(can(p, "erik", "planning.complete", obj));
  assert.equal(can(p, "erik", "planning.edit", obj), false);
  p = update(p, "erik", { "planning.complete": "deny" }); assert.equal(can(p, "erik", "planning.complete", obj), false);
  obj.shares[0].capabilities.push("management.permissions"); assert.equal(can(p, "erik", "management.permissions", obj), false);
});
test("team grants are explicit and tenant isolation applies to every object", () => {
  const p = fixture(); p.teams.push({ id: "floor", memberIds: ["erik"], capabilities: ["planning.note"] });
  const obj = { tenantId: "fixture", id: "task", type: "WORK_ITEM", ownerId: "patrick", visibility: "shared", shares: [{ subjectType: "team", subjectId: "floor", capabilities: ["planning.complete"] }] };
  assert.ok(can(p, "erik", "planning.note")); assert.ok(can(p, "erik", "planning.complete", obj));
  assert.equal(permissionDecision(p, { tenantId: "other", userId: "erik" }, "planning.complete", obj).allowed, false);
  obj.tenantId = "other"; assert.equal(can(p, "erik", "planning.complete", obj), false);
});
test("temporary grants expire at the boundary and expose cache expiry", () => {
  const p = fixture(); const now = Date.parse("2026-09-08T10:00:00Z");
  p.grants.push({ id: "g", tenantId: "fixture", userId: "employee", capabilities: ["planning.view"], startsAt: "2026-09-08T10:00:00Z", expiresAt: "2026-09-08T11:00:00Z" });
  validatePermissionPolicy(p);
  assert.equal(compileEffectivePermissions(p, "employee", now - 1).decisions["planning.view"].allowed, false);
  assert.ok(compileEffectivePermissions(p, "employee", now).decisions["planning.view"].allowed);
  assert.equal(compileEffectivePermissions(p, "employee", now).validUntil, now + 3600000);
  assert.equal(compileEffectivePermissions(p, "employee", now + 3600000).decisions["planning.view"].allowed, false);
});
test("permission revoke is immediately visible at new revision; stale mutation conflicts", () => {
  const p = fixture(); const changed = update(p, "patrick", { "planning.complete": "deny" });
  assert.equal(changed.version, p.version + 1); assert.equal(can(changed, "patrick", "planning.complete"), false);
  assert.throws(() => updateUserPermissions(changed, context(), { userId: "patrick", expectedVersion: p.version, overrides: {} }), { code: "PERMISSION_VERSION_CONFLICT" });
  assert.match(compileEffectivePermissions(changed, "patrick").decisions["planning.complete"].source, /individuele override/);
});
test("audit preserves personal actor, previous/next and authority source; reset restores preset", () => {
  const p = update(fixture(), "patrick", { "teamwear.view": "allow" }); const a = p.audit[0];
  assert.equal(a.actor, "donovan"); assert.equal(a.object.id, "patrick"); assert.equal(a.capability, "management.permissions"); assert.deepEqual(a.previous.overrides, {}); assert.equal(a.next.overrides["teamwear.view"], "allow");
  const reset = updateUserPermissions(p, context(), { userId: "patrick", expectedVersion: p.version, reset: true });
  assert.equal(can(reset, "patrick", "teamwear.view"), false);
});
test("owner cannot assign technical authority, including latent gated rights", () => {
  const p = fixture(); p.enabledCapabilities = p.enabledCapabilities.filter(id => !id.startsWith("developer."));
  assert.throws(() => updateUserPermissions(p, context("kevin"), { userId: "patrick", presetId: "developer", expectedVersion: 1 }), { code: "CAPABILITY_DENIED" });
  assert.throws(() => update(p, "patrick", { "connectors.manage": "allow" }, "kevin"), { code: "CAPABILITY_DENIED" });
});
test("read-only preview denies permission writes and object completion", () => {
  const p = fixture();
  assert.ok(permissionDecision(p, { ...context(), preview: true }, "planning.view").allowed);
  assert.equal(permissionDecision(p, { ...context(), preview: true }, "planning.complete").allowed, false);
  assert.throws(() => updateUserPermissions(p, { ...context(), preview: true }, { userId: "erik", expectedVersion: 1, overrides: {} }), { code: "CAPABILITY_DENIED" });
});
test("legacy mapping is explicit and unknown roles fail closed without broader default presets", () => {
  const { policy, unresolved } = migrateLegacyPermissions("fixture", [{ id: "a", role: "store", status: "Actief" }, { id: "b", role: "admin", status: "Actief" }], { enabledCapabilities: CAPABILITY_IDS, roleMapping: { store: { capabilities: ["orders.view", "orders.create"] } } });
  assert.deepEqual(compileEffectivePermissions(policy, "a").allowed.sort(), ["orders.create", "orders.view"]);
  assert.deepEqual(compileEffectivePermissions(policy, "b").allowed, []); assert.equal(unresolved[0].userId, "b");
});
test("malformed and prototype-derived identities do not acquire authority", () => {
  const p = fixture(); assert.equal(can(p, "constructor", "planning.view"), false);
  p.users.employee.presetId = "constructor"; assert.throws(() => validatePermissionPolicy(p), { statusCode: 400 });
  p.users.employee.presetId = "employee"; p.users.employee.overrides = []; assert.throws(() => validatePermissionPolicy(p), { statusCode: 400 });
});
test("resolution benchmark reports p50/p95 without IO or per-card database queries", t => {
  const p = fixture(); const times = [];
  for (let i = 0; i < 2000; i++) { const start = performance.now(); compileEffectivePermissions(p, "patrick"); times.push(performance.now() - start); }
  times.sort((a,b) => a-b); t.diagnostic(JSON.stringify({ samples: times.length, p50ms: times[1000], p95ms: times[1900] }));
  assert.ok(times[1900] < 10, "capability resolution p95 exceeds 10ms");
});
