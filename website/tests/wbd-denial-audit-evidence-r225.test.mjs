import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  WBD_REVIEW_DENIAL_AUDIT_PROVENANCE,
  WbdReviewDeveloperAccessPolicy,
} from "../scripts/wbd-review-developer-access.mjs";

const candidateId = "spw-immutable-execution-truth-candidate-r2-25-20260830";
const passwords = { kevin: "R225-Denial-Kevin!", patrick: "R225-Denial-Patrick!", collega: "R225-Denial-Store!", "donovan-support": "R225-Denial-Support!" };
const start = new Date("2026-08-30T20:00:00.000Z");

function policy() {
  return new WbdReviewDeveloperAccessPolicy({ issuerPrincipalIds: ["kevin"], allowedCandidateIds: [candidateId], tenantId: "sportpaleis" });
}

function grantInput(overrides = {}) {
  return {
    issuer: { id: "kevin", role: "admin", status: "Actief" },
    tenantId: "sportpaleis",
    candidateId,
    scopes: ["candidate.review.read"],
    humanGoReference: "GO-R225-DENIAL-AUDIT",
    ttlMs: 5 * 60 * 1_000,
    runId: "codex-run-r225-audit",
    role: "operator",
    ...overrides,
  };
}

function activationInput(activationToken, overrides = {}) {
  return { activationToken, tenantId: "sportpaleis", candidateId, ...overrides };
}

function sessionInput(sessionToken, overrides = {}) {
  return { sessionToken, tenantId: "sportpaleis", candidateId, ...overrides };
}

function denialRecords(state) {
  return state.audit.filter(({ action }) => action === "Codex-review securityweigering");
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-r225-denial-audit-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const filePath = path.join(root, "state.json");
  const backupDirectory = path.join(root, "backups");
  const store = new SportpaleisFileStore({ filePath, backupDirectory, seedPasswords: passwords });
  const service = new SportpaleisPilotService({
    store,
    artifactRoot: root,
    runtimeArtifactRoot: path.join(root, "runtime"),
    allowedOrigin: "https://workspace.sportpaleis.nl",
    activeReviewCandidateIds: [candidateId],
    reviewAccessEnabled: true,
    reviewAccessIsolatedState: true,
    reviewAccessIssuerPrincipalIds: ["kevin"],
  });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, filePath, backupDirectory, store, service, admin };
}

test("cross-tenant, verkeerde Candidate, expiry en activation replay blijven deny en leveren exact één secret-safe auditrecord", () => {
  const state = { audit: [], reviewDeveloperAccess: { grants: [] } };
  const access = policy();
  const issued = access.issueGrant(state, grantInput(), start);
  const activated = access.activateGrant(state, activationInput(issued.activationToken), new Date(start.getTime() + 1_000));
  const cases = [
    ["REVIEW_GRANT_TENANT_MISMATCH", () => access.authenticateSession(state, sessionInput(activated.sessionToken, { tenantId: "other" }), new Date(start.getTime() + 2_000))],
    ["REVIEW_GRANT_CANDIDATE_MISMATCH", () => access.authenticateSession(state, sessionInput(activated.sessionToken, { candidateId: "other" }), new Date(start.getTime() + 3_000))],
    ["REVIEW_GRANT_EXPIRED", () => access.authenticateSession(state, sessionInput(activated.sessionToken), new Date(start.getTime() + 5 * 60 * 1_000 + 1))],
    ["REVIEW_GRANT_ACTIVATION_REPLAY", () => access.activateGrant(state, activationInput(issued.activationToken), new Date(start.getTime() + 4_000))],
  ];
  for (const [code, attempt] of cases) {
    const before = denialRecords(state).length;
    assert.throws(attempt, (cause) => cause?.code === code);
    assert.equal(denialRecords(state).length, before + 1, `${code} moet exact één denialrecord toevoegen`);
    const denial = denialRecords(state)[0];
    assert.equal(denial.details.reason, code);
    assert.equal(denial.details.provenance, WBD_REVIEW_DENIAL_AUDIT_PROVENANCE);
    assert.match(denial.details.credentialFingerprint, /^sha256:[0-9a-f]{16}$/u);
  }
  const serialized = JSON.stringify(state);
  assert.equal(serialized.includes(issued.activationToken), false);
  assert.equal(serialized.includes(activated.sessionToken), false);
  assert.equal(serialized.includes(activated.csrfToken), false);
});

test("vergelijkbare vroege grant/auth-denials zijn auditbaar zonder de boundary te versoepelen", () => {
  const state = { audit: [], reviewDeveloperAccess: { grants: [] } };
  const access = policy();
  const attempts = [
    ["REVIEW_GRANT_ISSUER_FORBIDDEN", () => access.issueGrant(state, grantInput({ issuer: { id: "patrick", role: "operator", status: "Actief" } }), start)],
    ["REVIEW_GRANT_TENANT_MISMATCH", () => access.issueGrant(state, grantInput({ tenantId: "other" }), start)],
    ["REVIEW_GRANT_CANDIDATE_FORBIDDEN", () => access.issueGrant(state, grantInput({ candidateId: "other" }), start)],
    ["REVIEW_GRANT_SCOPE_FORBIDDEN", () => access.issueGrant(state, grantInput({ scopes: ["release.deploy"] }), start)],
    ["REVIEW_GRANT_UNKNOWN", () => access.activateGrant(state, activationInput("unknown"), start)],
    ["REVIEW_SESSION_UNKNOWN", () => access.authenticateSession(state, sessionInput("unknown"), start)],
  ];
  for (const [code, attempt] of attempts) {
    const before = denialRecords(state).length;
    assert.throws(attempt, (cause) => cause?.code === code);
    assert.equal(denialRecords(state).length, before + 1);
    assert.equal(denialRecords(state)[0].details.reason, code);
  }
  assert.equal(state.reviewDeveloperAccess.grants.length, 0, "denial audit mag nooit een grant materialiseren");
});

test("service bewaart replay, expiry en cross-boundary denial evidence na restart", async (context) => {
  const { filePath, backupDirectory, store, service, admin } = await fixture(context);
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, {
    candidateId,
    scopes: ["candidate.review.read"],
    humanGoReference: "GO-R225-SERVICE-PERSISTENCE",
    ttlMs: 5 * 60 * 1_000,
    runId: "codex-run-r225-service",
    role: "operator",
  }, start);
  const activationUrl = new URL(issued.activationPath, "https://workspace.sportpaleis.nl");
  const params = new URLSearchParams(activationUrl.hash.slice(1));
  const activationToken = params.get("token");
  const activated = await service.activateReviewDeveloperGrant({ activationToken, candidateId }, new Date(start.getTime() + 1_000));

  await assert.rejects(
    () => service.activateReviewDeveloperGrant({ activationToken, candidateId }, new Date(start.getTime() + 2_000)),
    (cause) => cause?.code === "REVIEW_GRANT_ACTIVATION_REPLAY",
  );
  await assert.rejects(
    () => service.authenticate(activated.sessionToken, new Date(start.getTime() + 5 * 60 * 1_000 + 1)),
    (cause) => cause?.code === "REVIEW_GRANT_EXPIRED",
  );

  let crossBoundaryCause = null;
  await store.mutate(async (state) => {
    try {
      service.reviewDeveloperAccessPolicy.authenticateSession(state, sessionInput(activated.sessionToken, { tenantId: "other" }), new Date(start.getTime() + 3_000));
    } catch (cause) {
      crossBoundaryCause = cause;
      return { state, value: null };
    }
    throw new Error("cross-tenant attempt unexpectedly allowed");
  });
  assert.equal(crossBoundaryCause?.code, "REVIEW_GRANT_TENANT_MISMATCH");

  const restarted = new SportpaleisFileStore({ filePath, backupDirectory, seedPasswords: passwords });
  await restarted.initialize();
  const persisted = await restarted.read();
  const denials = denialRecords(persisted);
  assert.deepEqual(new Set(denials.map(({ details }) => details.reason)), new Set([
    "REVIEW_GRANT_ACTIVATION_REPLAY",
    "REVIEW_GRANT_EXPIRED",
    "REVIEW_GRANT_TENANT_MISMATCH",
  ]));
  assert.equal(denials.length, 3, "iedere poging is precies eenmaal persisted");
  assert.ok(denials.every(({ details }) => details.provenance === WBD_REVIEW_DENIAL_AUDIT_PROVENANCE));
  const raw = await readFile(filePath, "utf8");
  assert.equal(raw.includes(activationToken), false);
  assert.equal(raw.includes(activated.sessionToken), false);
  assert.equal(raw.includes(activated.csrfToken), false);
});

test("ongeldige CSRF bij session completion wordt eenmaal geaudit en beëindigt de sessie niet", () => {
  const state = { audit: [], reviewDeveloperAccess: { grants: [] } };
  const access = policy();
  const issued = access.issueGrant(state, grantInput(), start);
  const activated = access.activateGrant(state, activationInput(issued.activationToken), new Date(start.getTime() + 1_000));
  const before = denialRecords(state).length;
  assert.throws(
    () => access.completeSession(state, { ...sessionInput(activated.sessionToken), csrfToken: "wrong" }, new Date(start.getTime() + 2_000)),
    (cause) => cause?.code === "REVIEW_CSRF_INVALID",
  );
  assert.equal(denialRecords(state).length, before + 1);
  assert.equal(denialRecords(state)[0].details.reason, "REVIEW_CSRF_INVALID");
  assert.equal(state.reviewDeveloperAccess.grants[0].completedAt, null);
  assert.equal(state.reviewDeveloperAccess.grants[0].sessions[0].endedAt, null);
});
