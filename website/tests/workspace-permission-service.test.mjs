import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createPermissionPolicy } from "../scripts/workspace-permissions.mjs";
import { WorkspacePermissionService } from "../scripts/workspace-permission-service.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";

// Existing development persistence and actual personal session issuance; never connects to LIVE.
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "workspace-permissions-"));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
    assert.ok(path.basename(root).startsWith("workspace-permissions-"));
    await rm(root, { recursive: true, force: true });
  });
  const seedPasswords = { kevin: "Permission-Admin-2026!", patrick: "Permission-Operator-2026!", collega: "Permission-Store-2026!", "donovan-support": "Permission-Support-2026!" };
  const settings = { filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords };
  const store = new SportpaleisFileStore(settings);
  const pilot = new SportpaleisPilotService({ store, artifactRoot: root }); await pilot.initialize();
  const admin = await pilot.login({ email: "kevin@sportpaleis.nl", password: seedPasswords.kevin });
  const operator = await pilot.login({ email: "patrick@sportpaleis.nl", password: seedPasswords.patrick });
  const state = await store.read();
  const adminId = (await pilot.authenticate(admin.token)).user.id;
  const operatorId = (await pilot.authenticate(operator.token)).user.id;
  await store.mutate(next => { next.workspacePermissions = createPermissionPolicy(state.organizationId, { [adminId]: { presetId: "developer", overrides: {} }, [operatorId]: { presetId: "operations", overrides: {} } }, { enabledCapabilities: CAPABILITY_IDS }); return { state: next }; });
  const resolveActor = (snapshot, credential) => {
    const session = snapshot.sessions.find(s => s.idHash === createHash("sha256").update(credential).digest("hex"));
    const user = session && snapshot.users.find(u => u.id === session.userId && u.status === "Actief");
    if (!session || !user || Date.parse(session.expiresAt) <= Date.now()) throw Object.assign(new Error("Aanmelding vereist"), { statusCode: 401 });
    return { tenantId: snapshot.organizationId, userId: user.id };
  };
  return { store, pilot, admin, operator, adminId, operatorId, service: new WorkspacePermissionService({ store, resolveActor }), settings, resolveActor };
}
test("rights persist through store restart; dynamic update, summary and preview remain personal", async t => {
  const f = await fixture(t);
  const old = await f.service.inspect(f.operator.token);
  assert.equal(old.effective.decisions["teamwear.view"].allowed, false);
  const updated = await f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 1, overrides: { "teamwear.view": "allow" } });
  assert.equal(updated.version, 2); assert.ok(updated.summary.enabled.includes("Teamwear"));
  const restarted = new SportpaleisFileStore(f.settings); await restarted.initialize();
  const service = new WorkspacePermissionService({ store: restarted, resolveActor: f.resolveActor });
  assert.ok((await service.inspect(f.operator.token)).effective.decisions["teamwear.view"].allowed);
  const preview = await service.inspect(f.admin.token, f.operatorId, true); assert.deepEqual(preview.preview, { userId: f.operatorId, readOnly: true });
  assert.equal(JSON.stringify(preview).includes(f.operator.token), false);
  await assert.rejects(service.administration(f.operator.token), { statusCode: 403 });
  await assert.rejects(service.inspect(f.operator.token, f.adminId, true), { statusCode: 403 });
});
test("two concurrent edits yield exactly one commit, one visible conflict and one audit record", async t => {
  const f = await fixture(t);
  const result = await Promise.allSettled([
    f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 1, overrides: { "planning.complete": "deny" } }),
    f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 1, overrides: { "planning.note": "deny" } }),
  ]);
  assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(result.find(r => r.status === "rejected").reason.statusCode, 409);
  const state = await f.store.read(); assert.equal(state.workspacePermissions.audit.length, 1); assert.equal(state.workspacePermissions.version, 2);
});
test("queued permission write after session revocation is rejected inside transaction", async t => {
  const f = await fixture(t);
  const revoke = f.store.mutate(state => { state.sessions = state.sessions.filter(s => s.userId !== f.adminId); return { state }; });
  const write = f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 1, overrides: { "teamwear.view": "allow" } });
  await revoke; await assert.rejects(write, { statusCode: 401 });
  assert.equal((await f.store.read()).workspacePermissions.version, 1);
});
test("queued management revoke blocks subsequent write without login or stale cache", async t => {
  const f = await fixture(t);
  await f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 1, overrides: { "management.permissions": "allow" } });
  const revoke = f.service.update(f.admin.token, { userId: f.operatorId, expectedVersion: 2, overrides: { "management.permissions": "deny" } });
  const pending = f.service.update(f.operator.token, { userId: f.operatorId, expectedVersion: 3, overrides: { "management.permissions": "allow" } });
  await revoke; await assert.rejects(pending, { statusCode: 403 });
  assert.equal((await f.service.inspect(f.operator.token)).effective.decisions["management.permissions"].allowed, false);
});
