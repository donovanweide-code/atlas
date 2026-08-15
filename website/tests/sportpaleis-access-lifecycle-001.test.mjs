import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SportpaleisFileStore,
  SportpaleisPilotService,
  createSportpaleisPilotRequestHandler,
} from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Access-Lifecycle-Kevin-001!",
  patrick: "Access-Lifecycle-Patrick-001!",
  collega: "Access-Lifecycle-Store-001!",
  "donovan-support": "Access-Lifecycle-Support-001!",
};

const rawToken = (activationPath) => new URLSearchParams(activationPath.split("#")[1]).get("token");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-access-lifecycle-001-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-ACCESS-LIFECYCLE-001-TEST", allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { store, service, admin };
}

test("geldige uitnodiging wordt veilig vernieuwd en alleen de nieuwste link activeert", async (context) => {
  const { store, service, admin } = await fixture(context);
  const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Geldige Invite", email: "valid-reissue@example.nl", role: "store" });
  const oldToken = rawToken(invited.activationPath);
  const before = await service.bootstrap(admin.token);
  assert.equal(before.users.find(({ id }) => id === invited.user.id).invitation.state, "VALID");
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  await assert.rejects(service.reissueInvitedUser(operator.token, operator.csrfToken, invited.user.id), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.reissueInvitedUser(admin.token, "onjuiste-csrf", invited.user.id), (error) => error.code === "CSRF_INVALID");

  const reissued = await service.reissueInvitedUser(admin.token, admin.csrfToken, invited.user.id);
  const newToken = rawToken(reissued.activationPath);
  assert.notEqual(newToken, oldToken);
  assert.equal(reissued.delivery, "LOCAL_HANDOFF_ONLY");
  const remainingMs = new Date(reissued.expiresAt).getTime() - Date.now();
  assert.ok(remainingMs > 23 * 60 * 60 * 1000 && remainingMs <= 24 * 60 * 60 * 1000);

  const persisted = await store.read();
  const pending = persisted.activationInvites.filter(({ userId, usedAt }) => userId === invited.user.id && !usedAt);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].tokenHash, sha256(newToken));
  assert.doesNotMatch(JSON.stringify(persisted), new RegExp(oldToken));
  assert.doesNotMatch(JSON.stringify(persisted), new RegExp(newToken));
  const reissueAudit = persisted.audit.find(({ action, subject }) => action === "Activatielink vernieuwd" && subject === invited.user.id);
  assert.ok(reissueAudit);
  assert.doesNotMatch(JSON.stringify(reissueAudit), new RegExp(newToken));

  await assert.rejects(service.activateInvitedUser({ token: oldToken, password: "Old-Token-Must-Fail-001!" }), (error) => error.code === "ACTIVATION_INVALID");
  assert.equal((await service.activateInvitedUser({ token: newToken, password: "Newest-Token-Works-001!" })).activated, true);
});

test("verlopen uitnodiging en gelijktijdige reissue blijven fail-closed met één geldige link", async (context) => {
  const { store, service, admin } = await fixture(context);
  const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Verlopen Invite", email: "expired-reissue@example.nl", role: "operator" });
  await store.mutate(async (state) => {
    const invite = state.activationInvites.find(({ userId, usedAt }) => userId === invited.user.id && !usedAt);
    invite.expiresAt = "2020-01-01T00:00:00.000Z";
    return { state, value: undefined };
  });
  const expired = await service.bootstrap(admin.token);
  assert.equal(expired.users.find(({ id }) => id === invited.user.id).invitation.state, "EXPIRED");

  const [first, second] = await Promise.all([
    service.reissueInvitedUser(admin.token, admin.csrfToken, invited.user.id),
    service.reissueInvitedUser(admin.token, admin.csrfToken, invited.user.id),
  ]);
  const candidates = [rawToken(first.activationPath), rawToken(second.activationPath)];
  const state = await store.read();
  const pending = state.activationInvites.filter(({ userId, usedAt }) => userId === invited.user.id && !usedAt);
  assert.equal(pending.length, 1);
  const validToken = candidates.find((candidate) => sha256(candidate) === pending[0].tokenHash);
  const invalidToken = candidates.find((candidate) => candidate !== validToken);
  assert.ok(validToken && invalidToken);
  await assert.rejects(service.activateInvitedUser({ token: invalidToken, password: "Concurrent-Old-Fails-001!" }), (error) => error.code === "ACTIVATION_INVALID");
  assert.equal((await service.activateInvitedUser({ token: validToken, password: "Concurrent-New-Works-001!" })).activated, true);
});

test("pending duplicaten kunnen gericht weg terwijl leidende accounts en laatste admin beschermd blijven", async (context) => {
  const { store, service, admin } = await fixture(context);
  const reusable = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Opnieuw Uitnodigen", email: "reusable@example.nl", role: "store" });
  await service.cancelInvitedUser(admin.token, admin.csrfToken, reusable.user.id);
  const recreated = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Opnieuw Uitgenodigd", email: "REUSABLE@example.nl", role: "store" });
  assert.equal(recreated.user.email, "reusable@example.nl");

  const duplicate = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Overbodige Kevin", email: "pending-kevin@example.nl", role: "admin" });
  const duplicateToken = rawToken(duplicate.activationPath);
  await store.mutate(async (state) => {
    state.users.find(({ id }) => id === duplicate.user.id).email = "KEVIN@SPORTPALEIS.NL";
    return { state, value: undefined };
  });
  const duplicateView = await service.bootstrap(admin.token);
  const pendingDuplicate = duplicateView.users.find(({ id }) => id === duplicate.user.id);
  assert.equal(pendingDuplicate.invitation.identityState, "ACCOUNT_EXISTS");
  await assert.rejects(service.reissueInvitedUser(admin.token, admin.csrfToken, duplicate.user.id), (error) => error.code === "INVITATION_IDENTITY_CONFLICT");
  await assert.rejects(service.activateInvitedUser({ token: duplicateToken, password: "Duplicate-Must-Not-Activate-001!" }), (error) => error.code === "ACTIVATION_IDENTITY_CONFLICT");
  await service.cancelInvitedUser(admin.token, admin.csrfToken, duplicate.user.id);
  const preserved = await service.bootstrap(admin.token);
  assert.equal(preserved.currentUserId, admin.user.id);
  assert.equal(preserved.users.find(({ id }) => id === admin.user.id).status, "Actief");
  await assert.rejects(service.updateUser(admin.token, admin.csrfToken, admin.user.id, { status: "Inactief" }), (error) => error.code === "SELF_DEACTIVATION_BLOCKED");

  const pendingA = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Pending A", email: "pending-duplicate@example.nl", role: "store" });
  const pendingB = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Pending B", email: "pending-duplicate-b@example.nl", role: "operator" });
  await store.mutate(async (state) => {
    state.users.find(({ id }) => id === pendingB.user.id).email = " PENDING-DUPLICATE@example.nl ";
    return { state, value: undefined };
  });
  const pendingDuplicateView = await service.bootstrap(admin.token);
  assert.equal(pendingDuplicateView.users.find(({ id }) => id === pendingA.user.id).invitation.identityState, "PENDING_DUPLICATE");
  assert.equal(pendingDuplicateView.users.find(({ id }) => id === pendingB.user.id).invitation.identityState, "PENDING_DUPLICATE");
  await assert.rejects(service.reissueInvitedUser(admin.token, admin.csrfToken, pendingA.user.id), (error) => error.code === "INVITATION_IDENTITY_CONFLICT");
  await service.cancelInvitedUser(admin.token, admin.csrfToken, pendingB.user.id);
  const pendingAfterCleanup = await service.bootstrap(admin.token);
  assert.equal(pendingAfterCleanup.users.find(({ id }) => id === pendingA.user.id).invitation.identityState, "CLEAR");
  assert.equal(pendingAfterCleanup.users.some(({ id }) => id === pendingB.user.id), false);

  const ambiguous = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Ambigue Invite", email: "ambiguous@example.nl", role: "store" });
  await store.mutate(async (state) => {
    const source = state.users.find(({ id }) => id === admin.user.id);
    state.users.push({ ...structuredClone(source), id: "ambiguous-active", name: "Ambigue Actief", initials: "AA", email: "ambiguous@example.nl", role: "store", status: "Actief" });
    state.users.push({ ...structuredClone(source), id: "ambiguous-inactive", name: "Ambigue Inactief", initials: "AI", email: "AMBIGUOUS@example.nl", role: "store", status: "Inactief" });
    return { state, value: undefined };
  });
  const ambiguousView = await service.bootstrap(admin.token);
  assert.equal(ambiguousView.users.find(({ id }) => id === ambiguous.user.id).invitation.identityState, "AMBIGUOUS_ACCOUNTS");
  await assert.rejects(service.reissueInvitedUser(admin.token, admin.csrfToken, ambiguous.user.id), (error) => error.code === "INVITATION_IDENTITY_CONFLICT");
  await assert.rejects(service.cancelInvitedUser(admin.token, admin.csrfToken, ambiguous.user.id), (error) => error.code === "INVITATION_IDENTITY_AMBIGUOUS");
});

test("actief naar inactief trekt sessies in en opnieuw activeren behoudt accountdata", async (context) => {
  const { store, service, admin } = await fixture(context);
  const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Lifecycle Gebruiker", email: "account-lifecycle@example.nl", role: "operator" });
  await service.activateInvitedUser({ token: rawToken(invited.activationPath), password: "Account-Lifecycle-User-001!" });
  const userLogin = await service.login({ email: "account-lifecycle@example.nl", password: "Account-Lifecycle-User-001!" });
  const preferenceBefore = structuredClone((await store.read()).preferences[invited.user.id]);
  await service.updateUser(admin.token, admin.csrfToken, invited.user.id, { status: "Inactief" });
  await assert.rejects(service.authenticate(userLogin.token), (error) => error.code === "SESSION_EXPIRED");
  assert.deepEqual((await store.read()).preferences[invited.user.id], preferenceBefore);
  await service.updateUser(admin.token, admin.csrfToken, invited.user.id, { status: "Actief" });
  assert.equal((await service.login({ email: "account-lifecycle@example.nl", password: "Account-Lifecycle-User-001!" })).user.status, "Actief");
});

test("HTTP- en beheer-UI-contract dekken create, reissue, cancel en directe state-refresh", async (context) => {
  const { service } = await fixture(context);
  const handler = createSportpaleisPilotRequestHandler(service);
  const server = createServer(async (request, response) => { if (!await handler(request, response)) response.end(); });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = origin;
  const loginResponse = await fetch(`${origin}/api/sportpaleis/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
  const login = await loginResponse.json();
  const adminHeaders = { Cookie: cookie, Origin: origin, "X-CSRF-Token": login.csrfToken };
  const createdResponse = await fetch(`${origin}/api/sportpaleis/v1/admin/users`, { method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ name: "HTTP Invite", email: "http-lifecycle@example.nl", role: "store" }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const reissuedResponse = await fetch(`${origin}/api/sportpaleis/v1/admin/users/${created.user.id}/invitation`, { method: "POST", headers: adminHeaders });
  assert.equal(reissuedResponse.status, 200);
  const reissued = await reissuedResponse.json();
  assert.equal(reissued.delivery, "LOCAL_HANDOFF_ONLY");
  const revokedResponse = await fetch(`${origin}/api/sportpaleis/v1/admin/users/${created.user.id}/invitation`, { method: "DELETE", headers: adminHeaders });
  assert.equal(revokedResponse.status, 200);
  const bootstrapResponse = await fetch(`${origin}/api/sportpaleis/v1/bootstrap`, { headers: { Cookie: cookie, Origin: origin } });
  assert.equal(bootstrapResponse.status, 200);
  assert.equal((await bootstrapResponse.json()).users.some(({ id }) => id === created.user.id), false);
  const recreatedResponse = await fetch(`${origin}/api/sportpaleis/v1/admin/users`, { method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ name: "HTTP Invite Opnieuw", email: "HTTP-LIFECYCLE@example.nl", role: "store" }) });
  assert.equal(recreatedResponse.status, 201);

  const apiSource = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  const uiSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(apiSource, /reissueInvitation[\s\S]+method: "POST"/);
  for (const label of ["Uitgenodigd — geldig", "Uitgenodigd — verlopen", "Nieuwe activatielink", "Uitnodiging intrekken", "Bevestig intrekken", "Inactief maken", "Opnieuw activeren"]) assert.match(uiSource, new RegExp(label));
  assert.match(uiSource, /activationHandoff = [\s\S]+notice = "Nieuwe activatielink gemaakt[\s\S]+render\(\)/);
  assert.doesNotMatch(uiSource, /localStorage[\s\S]{0,200}activation/i);
});
