import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CandidateSubmissionBroker,
  FileCandidateSubmissionAudit,
  FileCandidateSubmissionStore,
  InMemoryCandidateSubmissionAudit,
  InMemoryCandidateSubmissionStore,
  StaticCandidateSubmissionAuthorizer,
  verifyCandidateEnvelope,
} from "../scripts/candidate-submission-broker.mjs";
import { canonicalJson, validateReleaseContract } from "../scripts/release-engine-core.mjs";

const candidateId = "SPW-CANDIDATE-BROKER-TEST-20260827";
const commit = "a".repeat(40);
const token = "candidate-submit-token-abcdefghijklmnopqrstuvwxyz";
const tokenSha256 = createHash("sha256").update(token).digest("hex");
const hash = (value) => createHash("sha256").update(value).digest("hex");

function fixture({
  id = candidateId,
  candidateCommit = commit,
  artifact = Buffer.from("immutable candidate bytes"),
  featureDefault = "OFF",
  tenant = "sportpaleis",
  application = "workspace",
} = {}) {
  const artifactSha256 = hash(artifact);
  const manifest = {
    schemaVersion: 3,
    releaseId: id,
    commit: candidateCommit,
    tag: id,
    artifactSha256,
    buildTimestamp: "2026-08-27T08:00:00.000Z",
    assetManifestFingerprint: "b".repeat(64),
    sourceProvenance: { remote: "github", tag: id, commit: candidateCommit, tree: "c".repeat(40), verifiedAtBuild: true },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const rawContract = {
    schemaVersion: 1,
    releaseId: id,
    tenant,
    application,
    changeScope: { components: ["sportpaleis-review-mode"], otherTenantImpact: "NONE" },
    commit: candidateCommit,
    tag: id,
    artifact: { path: `${id}.tar.gz`, sha256: artifactSha256, manifestPath: `${id}.manifest.json`, manifestSha256: hash(manifestBytes) },
    expectedBaseline: { releaseId: "SPW-LIVE-BASELINE", commit: "d".repeat(40) },
    compatibilityPolicy: { mode: "forward-only", baselineMustBeAncestor: true, proof: { type: "immutable-manifest-base-freeze", baselineCommit: "d".repeat(40) } },
    requiredRuntimeVersion: ">=22.12.0 <25",
    environment: { required: [], secretBindings: [] },
    databases: [
      { id: "workspace", environmentPrefix: "WORKSPACE", migrationComponent: "workspace-runtime", requirements: [], migrations: [] },
      { id: "atlas", environmentPrefix: "ATLAS", migrationComponent: "atlas-runtime", requirements: [], migrations: [] },
    ],
    prepare: { autoBackup: true, backupMaxAgeSeconds: 90_000, restoreEvidenceMaxAgeSeconds: 2_678_400, schemaSnapshot: true },
    activation: { switchStrategy: "atomic-symlink", restart: { strategy: "single", service: "wbd-workspace.service" }, readinessChecks: ["workspace-readiness"], smokeSuite: ["workspace-health"], oldReleasePostMigrationSmokes: [] },
    rollback: { targetReleaseId: "SPW-LIVE-BASELINE", automaticAfterSwitch: true, smokeSuite: ["workspace-health"] },
    postDeployEvidence: ["release-audit"],
    featureExposure: { default: featureDefault, killSwitch: "SPORTPALEIS_REVIEW_PRINCIPAL_IDS" },
  };
  const contract = validateReleaseContract(rawContract);
  const contractBytes = Buffer.from(`${JSON.stringify(rawContract, null, 2)}\n`);
  return {
    submission: { candidateId: id, commit: candidateCommit, artifactSha256, contractHash: contract.contractHash },
    envelope: { artifactBytes: artifact, manifestBytes, contractBytes, remoteTagCommit: candidateCommit },
    contract,
  };
}

function authorizer({ tenants = ["sportpaleis"], applications = ["workspace"] } = {}) {
  return new StaticCandidateSubmissionAuthorizer({ bindings: [{ principalId: "codex_review_submitter", tokenSha256, tenants, applications }] });
}

function harness(options = {}) {
  const authorization = options.authorizer ?? authorizer();
  const principal = authorization.authenticate(`Bearer ${token}`);
  const store = options.store ?? new InMemoryCandidateSubmissionStore();
  const audit = options.audit ?? new InMemoryCandidateSubmissionAudit();
  const ingressCalls = [];
  const prepareCalls = [];
  const ingress = options.ingress ?? { async submit(verified) { ingressCalls.push(verified.submission.candidateId); return { duplicate: false }; } };
  const controlPlane = options.controlPlane ?? { async prepare(input) { prepareCalls.push(input); return { state: "AWAITING_HUMAN_GO", summary: { planHash: "e".repeat(64), featureExposure: { default: "OFF" } } }; } };
  const broker = new CandidateSubmissionBroker({ authorizer: authorization, ingress, controlPlane, store, audit, now: () => "2026-08-27T08:00:00.000Z" });
  return { authorization, principal, store, audit, ingressCalls, prepareCalls, broker };
}

test("authorized valid submission verifies immutable identity and stops on AWAITING_HUMAN_GO", async () => {
  const input = fixture();
  const app = harness();
  const result = await app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal);
  assert.equal(result.state, "AWAITING_HUMAN_GO");
  assert.equal(result.planHash, "e".repeat(64));
  assert.deepEqual(app.ingressCalls, [candidateId]);
  assert.deepEqual(app.prepareCalls, [{ releaseId: candidateId, contractHash: input.submission.contractHash }]);
});

test("unauthorized submission fails before candidate ingress", async () => {
  const authorization = authorizer();
  assert.throws(() => authorization.authenticate("Bearer wrong-token-that-is-long-enough-123456789"), ({ code }) => code === "UNAUTHORIZED");
  assert.throws(() => authorization.authenticate(""), ({ code }) => code === "UNAUTHORIZED");
});

test("wrong artifact hash fails closed", () => {
  const input = fixture();
  assert.throws(() => verifyCandidateEnvelope({ ...input.submission, artifactSha256: "f".repeat(64) }, input.envelope), ({ code }) => code === "ARTIFACT_HASH_MISMATCH");
});

test("wrong commit fails closed", () => {
  const input = fixture();
  assert.throws(() => verifyCandidateEnvelope({ ...input.submission, commit: "f".repeat(40) }, input.envelope), ({ code }) => code === "CONTRACT_IDENTITY_MISMATCH");
});

test("wrong contract hash fails closed", () => {
  const input = fixture();
  assert.throws(() => verifyCandidateEnvelope({ ...input.submission, contractHash: "f".repeat(64) }, input.envelope), ({ code }) => code === "CONTRACT_HASH_MISMATCH");
});

test("tenant mismatch is rejected by the narrow principal binding", async () => {
  const input = fixture();
  const app = harness({ authorizer: authorizer({ tenants: ["wbd"] }) });
  await assert.rejects(app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal), ({ code }) => code === "TENANT_MISMATCH");
  assert.deepEqual(app.ingressCalls, []);
});

test("exact retry is idempotent while conflicting replay is rejected", async () => {
  const first = fixture();
  const app = harness();
  const original = await app.broker.submitCandidateForReview(first.submission, first.envelope, app.principal);
  const duplicate = await app.broker.submitCandidateForReview(first.submission, first.envelope, app.principal);
  assert.deepEqual(duplicate, original);
  assert.equal(app.prepareCalls.length, 1);
  const conflict = fixture({ candidateCommit: "f".repeat(40) });
  await assert.rejects(app.broker.submitCandidateForReview(conflict.submission, conflict.envelope, app.principal), ({ code }) => code === "REPLAY_IDENTITY_MISMATCH");
});

test("Control Plane unavailable fails closed and records BLOCKED", async () => {
  const input = fixture();
  const app = harness({ controlPlane: { async prepare() { throw Object.assign(new Error("socket unavailable"), { code: "CONTROL_PLANE_UNAVAILABLE" }); } } });
  await assert.rejects(app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal), ({ code }) => code === "CONTROL_PLANE_UNAVAILABLE");
  assert.equal((await app.store.get(candidateId)).status, "BLOCKED");
  assert.equal((await app.audit.events()).at(-1).type, "CANDIDATE_SUBMISSION_BLOCKED");
});

test("review broker rejects a candidate that requests default-on production exposure", () => {
  const input = fixture({ featureDefault: "ON" });
  assert.throws(() => verifyCandidateEnvelope(input.submission, input.envelope), ({ code }) => code === "PRODUCTION_PROMOTION_FORBIDDEN");
});

test("broker surface can only call prepare and contains no GO or production mutation path", async () => {
  const source = await readFile(new URL("../scripts/candidate-submission-broker.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /approveAndActivate|\/go\b|decision\s*:\s*["']GO|atomicSwitch|restartService|applyMigration/u);
  assert.match(source, /controlPlane\.prepare/u);
  const input = fixture();
  const app = harness();
  await app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal);
  assert.deepEqual(Object.keys(app.prepareCalls[0]).sort(), ["contractHash", "releaseId"]);
});

test("submission audit preserves provenance in a verifiable SHA-256 chain", async () => {
  const input = fixture();
  const app = harness();
  await app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal);
  const events = await app.audit.events();
  assert.deepEqual(events.map(({ type }) => type), ["CANDIDATE_SUBMISSION_ACCEPTED", "CANDIDATE_INGRESS_VERIFIED", "CONTROL_PLANE_PREPARED"]);
  let previousHash = null;
  for (const event of events) {
    assert.equal(event.previousHash, previousHash);
    const { eventHash, ...unsigned } = event;
    assert.equal(eventHash, hash(canonicalJson(unsigned)));
    previousHash = eventHash;
  }
  assert.equal(events[0].artifactSha256, input.submission.artifactSha256);
  assert.equal(events[0].contractHash, input.submission.contractHash);
  assert.equal(events.at(-1).planHash, "e".repeat(64));
});

test("submission state and audit evidence survive a process-local adapter restart", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-candidate-submission-"));
  try {
    const input = fixture();
    const persistentStore = new FileCandidateSubmissionStore({ root: path.join(root, "state") });
    const persistentAudit = new FileCandidateSubmissionAudit({ file: path.join(root, "audit", "submissions.jsonl") });
    const app = harness({ store: persistentStore, audit: persistentAudit });
    await app.broker.submitCandidateForReview(input.submission, input.envelope, app.principal);
    const reloadedStore = new FileCandidateSubmissionStore({ root: path.join(root, "state") });
    const reloadedAudit = new FileCandidateSubmissionAudit({ file: path.join(root, "audit", "submissions.jsonl") });
    assert.equal((await reloadedStore.get(candidateId)).status, "AWAITING_HUMAN_GO");
    assert.deepEqual((await reloadedAudit.events()).map(({ type }) => type), ["CANDIDATE_SUBMISSION_ACCEPTED", "CANDIDATE_INGRESS_VERIFIED", "CONTROL_PLANE_PREPARED"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
