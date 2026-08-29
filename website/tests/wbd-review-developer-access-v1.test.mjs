import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createSportpaleisPilotRequestHandler, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  WBD_REVIEW_DEVELOPER_FORBIDDEN_CAPABILITIES,
  WBD_REVIEW_DEVELOPER_PRINCIPAL,
  WbdReviewDeveloperAccessPolicy,
} from "../scripts/wbd-review-developer-access.mjs";
import { parseWorkspaceRuntimeConfig, WorkspaceRuntimeConfigError } from "../scripts/workspace-runtime-config.mjs";

const candidateId = "spw-experience-simplification-candidate-r2-2-20260828";
const fixturePassword = randomBytes(24).toString("base64url");
const passwords = { kevin: fixturePassword, patrick: fixturePassword, collega: fixturePassword, "donovan-support": fixturePassword };

async function fixture(context, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-review-developer-access-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const statePath = path.join(root, "state.json");
  const store = new SportpaleisFileStore({ filePath: statePath, backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({
    store,
    artifactRoot: root,
    runtimeArtifactRoot: path.join(root, "runtime"),
    allowedOrigin: "https://workspace.sportpaleis.nl",
    activeReviewCandidateIds: [candidateId],
    reviewAccessEnabled: options.reviewAccessEnabled ?? true,
    reviewAccessIsolatedState: options.reviewAccessIsolatedState ?? false,
    reviewAccessIssuerPrincipalIds: options.reviewAccessIssuerPrincipalIds ?? ["kevin"],
  });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { root, statePath, store, service, admin, operator };
}

const grantInput = (overrides = {}) => ({
  candidateId,
  scopes: ["candidate.review.read", "candidate.ui.safe-interact", "candidate.debug.read"],
  humanGoReference: "GO-R22-CODEX-REVIEW-20260828",
  ttlMs: 30 * 60 * 1_000,
  ...overrides,
});

function activationPayload(activationPath) {
  const url = new URL(activationPath, "https://workspace.sportpaleis.nl");
  const values = new URLSearchParams(url.hash.replace(/^#/, ""));
  return { activationToken: values.get("token"), candidateId: values.get("candidate") };
}

test("review/development principal is default-deny without configured access or Human GO", async (context) => {
  const disabled = await fixture(context, { reviewAccessEnabled: false });
  await assert.rejects(
    () => disabled.service.issueReviewDeveloperGrant(disabled.admin.token, disabled.admin.csrfToken, grantInput()),
    (error) => error?.code === "REVIEW_ACCESS_DISABLED" && error?.statusCode === 404,
  );
  await assert.rejects(
    () => disabled.service.activateReviewDeveloperGrant({ activationToken: "unknown", candidateId }),
    (error) => error?.code === "REVIEW_ACCESS_DISABLED",
  );
});

test("only configured Donovan/Human-GO authority can issue an exact scoped, expiring grant", async (context) => {
  const { service, admin, operator } = await fixture(context);
  await assert.rejects(
    () => service.issueReviewDeveloperGrant(operator.token, operator.csrfToken, grantInput()),
    (error) => error?.code === "REVIEW_GRANT_ISSUER_FORBIDDEN",
  );
  await assert.rejects(
    () => service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput({ humanGoReference: "geen-go" })),
    (error) => error?.code === "REVIEW_GRANT_HUMAN_GO_REQUIRED",
  );
  await assert.rejects(
    () => service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput({ candidateId: "andere-candidate" })),
    (error) => error?.code === "REVIEW_GRANT_CANDIDATE_FORBIDDEN",
  );
  await assert.rejects(
    () => service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput({ scopes: ["release.deploy"] })),
    (error) => error?.code === "REVIEW_GRANT_SCOPE_FORBIDDEN",
  );
});

test("Codex logs in independently with one-time handoff and receives read-only Candidate view", async (context) => {
  const { service, admin, statePath } = await fixture(context);
  const beforeAdmin = await service.issueSessionView(admin.token);
  const issued = await service.issueReviewDeveloperGrant(admin.token, beforeAdmin.csrfToken, grantInput());
  assert.equal(issued.grant.principalId, WBD_REVIEW_DEVELOPER_PRINCIPAL.id);
  assert.equal(issued.grant.state, "AWAITING_ACTIVATION");
  assert.match(issued.activationPath, /^\/workspace\/sportpaleis\/review-toegang#token=/u);

  const payload = activationPayload(issued.activationPath);
  assert.equal(payload.candidateId, candidateId);
  const activated = await service.activateReviewDeveloperGrant(payload);
  assert.equal(activated.principal.id, WBD_REVIEW_DEVELOPER_PRINCIPAL.id);
  const bootstrap = await service.bootstrap(activated.sessionToken);
  assert.equal(bootstrap.currentUser.id, WBD_REVIEW_DEVELOPER_PRINCIPAL.id);
  assert.deepEqual(bootstrap.users.map(({ id }) => id), [WBD_REVIEW_DEVELOPER_PRINCIPAL.id], "ephemeral principal exists only in its own bootstrap projection");
  assert.deepEqual(bootstrap.switchableUsers, [], "review principal cannot see or switch to customer identities");
  assert.equal(bootstrap.currentUser.principalType, "REVIEW_DEVELOPER");
  assert.equal(bootstrap.capabilities.reviewDeveloper, true);
  assert.equal(bootstrap.capabilities.reviewMode, true);
  assert.equal(bootstrap.capabilities.uploadsEnabled, false);
  assert.equal(bootstrap.capabilities.productionAssetUploadsEnabled, false);
  assert.equal(bootstrap.capabilities.fontUploadsEnabled, false);
  assert.equal(bootstrap.capabilities.mailMode, "disabled");
  assert.equal((await service.reviewManifest(activated.sessionToken)).productionMutationAuthority, false);

  const afterAdmin = await service.issueSessionView(admin.token);
  assert.equal(afterAdmin.user.id, beforeAdmin.user.id, "Donovan/admin-session remains a separate unchanged principal");
  assert.notEqual(activated.sessionToken, admin.token);

  const rawState = await readFile(statePath, "utf8");
  assert.equal(rawState.includes(payload.activationToken), false, "raw activation token is never persisted");
  assert.equal(rawState.includes(activated.sessionToken), false, "raw session token is never persisted");
  assert.equal(rawState.includes(activated.csrfToken), false, "raw CSRF token is never persisted");

  await assert.rejects(
    () => service.activateReviewDeveloperGrant(payload),
    (error) => error?.code === "REVIEW_GRANT_ACTIVATION_REPLAY",
  );
});

test("central request guard fails closed outside exact read-only scope and audit records allow/deny", async (context) => {
  const { service, admin, store } = await fixture(context);
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput());
  const activated = await service.activateReviewDeveloperGrant(activationPayload(issued.activationPath));

  const allowed = await service.assertTemporaryReviewRequest(activated.sessionToken, { method: "GET", route: "/api/sportpaleis/v1/bootstrap" });
  assert.equal(allowed.capability, "candidate.review.read");
  await assert.rejects(
    () => service.assertTemporaryReviewRequest(activated.sessionToken, { method: "POST", route: "/api/sportpaleis/v1/orders" }),
    (error) => error?.code === "REVIEW_SIDE_EFFECT_FORBIDDEN",
  );
  await assert.rejects(
    () => service.issueReviewDeveloperGrant(activated.sessionToken, activated.csrfToken, grantInput()),
    (error) => error?.code === "REVIEW_GRANT_CHAIN_FORBIDDEN",
  );
  await assert.rejects(
    () => service.fastSwitch(activated.sessionToken, activated.csrfToken, { targetUserId: "patrick", authMode: "PASSWORD", password: passwords.patrick, deviceMode: "SHARED" }),
    (error) => ["FORBIDDEN", "REVIEW_CSRF_INVALID"].includes(error?.code) || error?.statusCode === 403,
  );

  const state = await store.read();
  assert.ok(state.audit.some(({ action, userId }) => action === "Codex-reviewactie uitgevoerd" && userId === WBD_REVIEW_DEVELOPER_PRINCIPAL.id));
  assert.ok(state.audit.some(({ action }) => action === "Tijdelijke Codex-reviewsessie gestart"));
  assert.deepEqual(WBD_REVIEW_DEVELOPER_FORBIDDEN_CAPABILITIES.includes("release.deploy"), true);
});

test("safe-interact is limited to an explicit allowlist and disposable candidate state", async (context) => {
  const isolated = await fixture(context, { reviewAccessIsolatedState: true });
  const issued = await isolated.service.issueReviewDeveloperGrant(isolated.admin.token, isolated.admin.csrfToken, grantInput());
  const activated = await isolated.service.activateReviewDeveloperGrant(activationPayload(issued.activationPath));
  const allowed = await isolated.service.assertTemporaryReviewRequest(activated.sessionToken, { method: "PATCH", route: "/api/sportpaleis/v1/orders/SP-REVIEW-001" });
  assert.equal(allowed.capability, "candidate.ui.safe-interact");
  await assert.rejects(
    () => isolated.service.assertTemporaryReviewRequest(activated.sessionToken, { method: "POST", route: "/api/sportpaleis/v1/orders" }),
    (error) => error?.code === "REVIEW_SIDE_EFFECT_FORBIDDEN",
  );
  await assert.rejects(
    () => isolated.service.assertTemporaryReviewRequest(activated.sessionToken, { method: "POST", route: "/api/sportpaleis/v1/teamkit-proposals/proposal/mail/capture" }),
    (error) => error?.code === "REVIEW_SIDE_EFFECT_FORBIDDEN",
  );

  const persistentBoundary = await fixture(context, { reviewAccessIsolatedState: false });
  const persistentGrant = await persistentBoundary.service.issueReviewDeveloperGrant(persistentBoundary.admin.token, persistentBoundary.admin.csrfToken, grantInput());
  const persistentSession = await persistentBoundary.service.activateReviewDeveloperGrant(activationPayload(persistentGrant.activationPath));
  await assert.rejects(
    () => persistentBoundary.service.assertTemporaryReviewRequest(persistentSession.sessionToken, { method: "PATCH", route: "/api/sportpaleis/v1/orders/SP-REVIEW-001" }),
    (error) => error?.code === "REVIEW_SIDE_EFFECT_FORBIDDEN",
  );

  const state = await isolated.store.read();
  assert.ok(state.audit.some(({ action, details }) => action === "Codex-reviewactie uitgevoerd" && details.capability === "candidate.ui.safe-interact"));
  assert.ok(state.audit.some(({ action, details }) => action === "Codex-reviewactie geweigerd" && details.reason === "OUTSIDE_GRANT_SCOPE"));
});

test("TTL, explicit revocation and logout invalidate all temporary access", async (context) => {
  const { service, admin } = await fixture(context);
  const start = new Date("2026-08-28T08:00:00.000Z");
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput({ ttlMs: 5 * 60 * 1_000 }), start);
  const activated = await service.activateReviewDeveloperGrant(activationPayload(issued.activationPath), new Date(start.getTime() + 1_000));
  await assert.rejects(
    () => service.authenticate(activated.sessionToken, new Date(start.getTime() + 5 * 60 * 1_000)),
    (error) => error?.code === "REVIEW_GRANT_EXPIRED",
  );

  const second = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput(), new Date(start.getTime() + 10_000));
  const secondActive = await service.activateReviewDeveloperGrant(activationPayload(second.activationPath), new Date(start.getTime() + 11_000));
  const revoked = await service.revokeReviewDeveloperGrant(admin.token, admin.csrfToken, second.grant.id, new Date(start.getTime() + 12_000));
  assert.equal(revoked.state, "REVOKED");
  await assert.rejects(() => service.authenticate(secondActive.sessionToken, new Date(start.getTime() + 13_000)), (error) => error?.code === "REVIEW_GRANT_INACTIVE");

  const third = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput(), new Date(start.getTime() + 20_000));
  const thirdActive = await service.activateReviewDeveloperGrant(activationPayload(third.activationPath), new Date(start.getTime() + 21_000));
  await service.logout(thirdActive.sessionToken, thirdActive.principal, thirdActive.csrfToken, new Date(start.getTime() + 22_000));
  await assert.rejects(() => service.authenticate(thirdActive.sessionToken, new Date(start.getTime() + 23_000)), (error) => error?.code === "REVIEW_GRANT_INACTIVE");
});

test("runtime contract is explicit, canonical and fail-closed", () => {
  const base = { NODE_ENV: "test", APP_ENV: "test", WORKSPACE_DATA_FILE: "state.json", WORKSPACE_BACKUP_DIRECTORY: "backups", SESSION_COOKIE_SECURE: "false" };
  assert.equal(parseWorkspaceRuntimeConfig(base).reviewAccessEnabled, false);
  assert.throws(
    () => parseWorkspaceRuntimeConfig({ ...base, WBD_REVIEW_ACCESS_ENABLED: "true" }),
    WorkspaceRuntimeConfigError,
  );
  const configured = parseWorkspaceRuntimeConfig({
    ...base,
    WBD_REVIEW_ACCESS_ENABLED: "true",
    WBD_REVIEW_ACCESS_ISSUER_IDS: "user-25812f676558376d",
    SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS: candidateId,
  });
  assert.equal(configured.reviewAccessEnabled, true);
  assert.deepEqual(configured.reviewAccessIssuerPrincipalIds, ["user-25812f676558376d"]);
  assert.throws(
    () => parseWorkspaceRuntimeConfig({ ...base, WBD_REVIEW_ACCESS_ENABLED: "true", WBD_REVIEW_ACCESS_ISSUER_IDS: "Donovan", SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS: candidateId }),
    WorkspaceRuntimeConfigError,
  );
});

test("browser handoff is fragment-only and server routes preserve the single read-only boundary", async () => {
  const client = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(client, /review-toegang/u);
  assert.match(client, /location\.hash/u);
  assert.match(client, /history\.replaceState\(\{\}, "", FULL_WORKSPACE_REVIEW_ROUTE\)/u);
  assert.match(api, /auth\/review-access\/activate/u);
  assert.match(server, /LOCAL_HANDOFF_ONLY/u);
  assert.match(server, /REVIEW_SIDE_EFFECT_FORBIDDEN/u);
  assert.match(server, /typeof service\.assertTemporaryReviewRequest === "function"\) await service\.assertTemporaryReviewRequest\(token, \{ method, route \}\)/u);
});

test("real HTTP activation creates an independent cookie session and rejects a write before routing", async (context) => {
  const { service, admin } = await fixture(context);
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput());
  const payload = activationPayload(issued.activationPath);
  const server = createServer(createSportpaleisPilotRequestHandler(service));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const activationResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/auth/review-access/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(activationResponse.status, 200);
  const activated = await activationResponse.json();
  const cookie = activationResponse.headers.get("set-cookie").split(";", 1)[0];
  assert.equal(activated.user.id, WBD_REVIEW_DEVELOPER_PRINCIPAL.id);

  const bootstrapResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/bootstrap`, { headers: { cookie } });
  assert.equal(bootstrapResponse.status, 200);
  assert.equal((await bootstrapResponse.json()).currentUser.principalType, "REVIEW_DEVELOPER");

  const forbiddenResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/orders`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": activated.csrfToken },
    body: "{}",
  });
  assert.equal(forbiddenResponse.status, 403);
  assert.equal((await forbiddenResponse.json()).error, "REVIEW_SIDE_EFFECT_FORBIDDEN");
});

test("real HTTP safe-interact mutates only disposable Candidate state and preserves the ephemeral principal boundary", async (context) => {
  const { service, admin, store } = await fixture(context, { reviewAccessIsolatedState: true });
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, grantInput({
    scopes: ["candidate.review.read", "candidate.ui.safe-interact", "candidate.debug.read", "candidate.test-state.isolated"],
  }));
  const payload = activationPayload(issued.activationPath);
  const server = createServer(createSportpaleisPilotRequestHandler(service));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = baseUrl;

  const activationResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/auth/review-access/activate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(activationResponse.status, 200);
  const activated = await activationResponse.json();
  const cookie = activationResponse.headers.get("set-cookie").split(";", 1)[0];
  const bootstrap = await (await fetch(`${baseUrl}/api/sportpaleis/v1/bootstrap`, { headers: { cookie } })).json();
  const order = bootstrap.orders.find(({ stage }) => stage === "ORDER");
  assert.ok(order, "disposable review fixture contains a safe editable order");

  const customer = `${order.customer} · review`;
  const updateResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/orders/${encodeURIComponent(order.id)}`, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": activated.csrfToken, origin: baseUrl },
    body: JSON.stringify({ expectedRevision: order.revision, customer }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).customer, customer);

  const article = bootstrap.articles.find(({ imageKey, active }) => active && imageKey);
  assert.ok(article);
  const compositionResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/visual-compositions`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": activated.csrfToken, origin: baseUrl, "idempotency-key": "review-composition-projection" },
    body: JSON.stringify({ concept: "PRODUCT_FOCUS", title: "Disposable reviewcompositie", artDirection: "Zelfde bron, veilige reviewstate.", articleId: article.id, assetIds: [] }),
  });
  assert.equal(compositionResponse.status, 201);
  const composition = await compositionResponse.json();
  const refreshedBootstrap = await (await fetch(`${baseUrl}/api/sportpaleis/v1/bootstrap`, { headers: { cookie } })).json();
  assert.equal(refreshedBootstrap.visualCompositions.some(({ id }) => id === composition.value.id), true, "review capability, not the synthetic role label, controls its own projection");

  const mailResponse = await fetch(`${baseUrl}/api/sportpaleis/v1/orders/${encodeURIComponent(order.id)}/mail/capture`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", "x-csrf-token": activated.csrfToken, origin: baseUrl },
    body: "{}",
  });
  assert.equal(mailResponse.status, 403);
  assert.equal((await mailResponse.json()).error, "REVIEW_SIDE_EFFECT_FORBIDDEN");

  const state = await store.read();
  assert.equal(state.orders.find(({ id }) => id === order.id).customer, customer);
  assert.equal(state.users.some(({ id }) => id === WBD_REVIEW_DEVELOPER_PRINCIPAL.id), false, "temporary principal is never persisted as a customer user");
  assert.ok(state.audit.some(({ action, userId }) => action === "Order gewijzigd" && userId === WBD_REVIEW_DEVELOPER_PRINCIPAL.id));
  assert.ok(state.audit.some(({ action, details }) => action === "Codex-reviewactie geweigerd" && details.route.endsWith("/mail/capture")));
});
