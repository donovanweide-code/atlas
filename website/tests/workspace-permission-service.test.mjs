import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { SportpaleisFileStore, SportpaleisPilotService, createSportpaleisPilotRequestHandler } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createPermissionPolicy } from "../scripts/workspace-permissions.mjs";
import { WorkspacePermissionService } from "../scripts/workspace-permission-service.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { SPORTPALEIS_METHOD_CAPABILITIES } from "../scripts/sportpaleis-capability-boundary.mjs";
import { createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

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
  const pilot = new SportpaleisPilotService({ store, artifactRoot: root, mailFoundation: createTestMailFoundation(root) }); await pilot.initialize();
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
test("actual HTTP administration: valid session, CSRF, backend denial, preview and logout", async t => {
  const f = await fixture(t); const handler = createSportpaleisPilotRequestHandler(f.pilot);
  const server = createServer((req, res) => void handler(req, res));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`; f.pilot.allowedOrigin = base;
  const call = (suffix = "", { token = f.admin.token, csrf = f.admin.csrfToken, method = "GET", body } = {}) => fetch(`${base}/api/sportpaleis/v1/admin/permissions${suffix}`, { method, headers: { Cookie: `sportpaleis_session=${token}`, Origin: base, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: body && JSON.stringify(body) });
  assert.equal((await call()).status, 200);
  assert.equal((await call("", { token: f.operator.token })).status, 403);
  assert.equal((await call("", { token: "invalid" })).status, 401);
  const input = { expectedVersion: 1, overrides: { "teamwear.view": "allow" } };
  assert.equal((await call(`/users/${f.operatorId}`, { method: "PATCH", csrf: "invalid", body: input })).status, 403);
  const changed = await call(`/users/${f.operatorId}`, { method: "PATCH", body: input }); assert.equal(changed.status, 200);
  assert.equal((await changed.json()).version, 2);
  const preview = await call(`/users/${f.operatorId}/preview`); assert.equal((await preview.json()).preview.readOnly, true);
  assert.equal((await call(`/users/${f.operatorId}/preview`, { method: "PATCH", body: input })).status, 404);
  const user = (await f.pilot.authenticate(f.admin.token)).user;
  await f.pilot.logout(f.admin.token, user, f.admin.csrfToken);
  assert.equal((await call(`/users/${f.operatorId}`, { method: "PATCH", body: { ...input, expectedVersion: 2 } })).status, 401);
});
test("every existing token-first service entry point has an explicit capability policy", async () => {
  const source = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  // Customer proposal tokens and temporary review-grant classification have their own existing authorities.
  const separateTokenAuthorities = new Set(["authenticate", "assertTemporaryReviewRequest", "publicTeamkitProposal", "savePublicTeamkitIntake", "savePublicTeamkitFeedback", "approvePublicTeamkitProposal", "publicTeamkitProposalSource", "publicTeamkitProposalPdf"]);
  const methods = [...source.matchAll(/^  async ([A-Za-z][\w]*)\(token(?:,|\))/gm)].map(match => match[1]).filter(name => !separateTokenAuthorities.has(name));
  assert.deepEqual(methods.filter(name => !Object.hasOwn(SPORTPALEIS_METHOD_CAPABILITIES, name)), []);
  assert.ok(methods.length > 100);
});
test("existing service APIs obey dynamic capabilities even when legacy role remains admin/operator", async t => {
  const f = await fixture(t);
  await assert.rejects(f.pilot.assertTeamwearPilotAccess(f.operator.token), { statusCode: 403 });
  await f.pilot.updatePermissionConfiguration(f.admin.token, f.admin.csrfToken, { userId: f.operatorId, expectedVersion: 1, overrides: { "teamwear.view": "allow", "production.complete": "deny" } });
  assert.equal((await f.pilot.assertTeamwearPilotAccess(f.operator.token)).enabled, true);
  await assert.rejects(f.pilot.completeProductionJob(f.operator.token, f.operator.csrfToken, "absent", {}), { statusCode: 403 });
  await assert.rejects(f.pilot.deleteOrder(f.operator.token, f.operator.csrfToken, "absent", {}), { statusCode: 403 });
  const projected = await f.pilot.bootstrap(f.operator.token, "overview");
  assert.equal(projected.capabilities.teamwearExperiencePilot, true);
  await f.pilot.updatePermissionConfiguration(f.admin.token, f.admin.csrfToken, { userId: f.adminId, expectedVersion: 2, presetId: "owner" });
  assert.equal((await f.pilot.authenticate(f.admin.token)).user.role, "admin");
  await assert.rejects(f.pilot.updateArticle(f.admin.token, f.admin.csrfToken, "absent", {}), { statusCode: 403 });
  await assert.rejects(f.pilot.updateUser(f.admin.token, f.admin.csrfToken, f.operatorId, { role: "admin" }), { code: "LEGACY_ROLE_CHANGE_DISABLED" });
  await assert.rejects(f.pilot.updateSettings(f.admin.token, f.admin.csrfToken, { productionDefaults: {} }), { statusCode: 403 });
  await assert.rejects(f.pilot.deleteEmployee(f.admin.token, f.admin.csrfToken, "absent"), { statusCode: 403 });
  await f.pilot.updateSettings(f.admin.token, f.admin.csrfToken, { processingDays: 3 });
  const event = (await f.store.read()).audit[0];
  assert.equal(event.details.authorization.actor, f.adminId);
  assert.ok(event.details.authorization.capabilities.some(c => c.capability === "management.settings"));
});
test("Mail OFF preserves proven networkless order receipt; it never grants an external send", async t => {
  const f = await fixture(t);
  await f.store.mutate(state => { state.workspacePermissions.enabledCapabilities = state.workspacePermissions.enabledCapabilities.filter(id => !id.startsWith("mail.")); return { state }; });
  const empty = { initials: "", initialsInfix: "", name: "", backNumber: "2", backNumberSizeClass: "SENIOR", shortsNumber: "" };
  const order = (await f.pilot.createOrder(f.operator.token, f.operator.csrfToken, { orderKind: "INDIVIDUAL", customer: "Permission fixture", customerEmail: "permission@example.test", customerPhone: "0612345678", standardPersonalization: empty, items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: { ...empty, backNumber: "", backNumberSizeClass: "" } }] }, "permission-order-create")).value;
  const receipt = await f.pilot.captureOrderMail(f.operator.token, f.operator.csrfToken, order.id, { templateKey: "ORDER_RECEIVED" }, "permission-capture-receipt");
  assert.equal(receipt.status, "CAPTURED");
  assert.equal(f.pilot.mailFoundation.transport.externalNetworkEnabled, false);
  const saved = await f.pilot.order(f.operator.token, order.id);
  await f.pilot.advanceOrder(f.operator.token, f.operator.csrfToken, order.id, saved.revision, "permission-order-advance");
  let externalCalls = 0;
  f.pilot.mailFoundation.transport = { name: "smtp", externalNetworkEnabled: true, send: async () => { externalCalls++; throw new Error("External send must never be reached"); } };
  await assert.rejects(f.pilot.captureOrderMail(f.operator.token, f.operator.csrfToken, order.id, { templateKey: "ORDER_RECEIVED" }, "permission-external-denied"), { statusCode: 403 });
  assert.equal(externalCalls, 0);
});
