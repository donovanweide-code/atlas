import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ReleaseEngineError, canonicalJson, sanitizeDiagnostic, validateReleaseContract, verifyAuditChain,
} from "../scripts/release-engine-core.mjs";
import {
  assertPureReadOnlyInspectionQueries, buildMigrationPlan, createPureSchemaInspectionQueries,
  inspectEnvironmentContract, inspectMigrationState, inspectRecoveryReadiness, schemaObjectMatches,
} from "../scripts/release-engine-inspection.mjs";
import { InMemoryReleasePlatform } from "../scripts/release-engine-platform.mjs";
import { privilegedInspect } from "../scripts/release-engine-privileged-inspect.mjs";
import { WbdReleaseEngine } from "../scripts/release-engine-runner.mjs";
import { FileReleaseStateStore, InMemoryReleaseStateStore } from "../scripts/release-engine-state-store.mjs";
import { createReleaseEngineRequestHandler } from "../scripts/release-engine-service.mjs";
import { applyOneMigration, assertMigrationSqlMatchesClassification } from "../scripts/release-engine-migrate-one.mjs";

const contractFile = new URL("../../ops/release-engine/contracts/WBD-MAIL-WEB-PUSH-FORWARD-R2-MOBILE-20260826.release-contract.json", import.meta.url);
const rawContract = JSON.parse(await readFile(contractFile, "utf8"));
const fixedNow = new Date("2026-08-25T22:00:00.000Z");

function contract(overrides = {}) {
  return validateReleaseContract({ ...structuredClone(rawContract), ...overrides });
}

function fixture() {
  const releaseContract = contract();
  const platform = new InMemoryReleasePlatform({ contract: releaseContract, now: fixedNow.toISOString() });
  const store = new InMemoryReleaseStateStore();
  const engine = new WbdReleaseEngine({ stateStore: store, platform, clock: () => fixedNow });
  return { contract: releaseContract, platform, store, engine };
}

async function prepared() {
  const result = fixture();
  result.plan = await result.engine.inspectAndPrepare(result.contract);
  return result;
}

async function activate(result) {
  return result.engine.approveAndActivate(result.contract, { decision: "GO", releaseId: result.contract.releaseId, planHash: result.plan.planHash, actor: "donovan-owner", requestId: "go-1" });
}

test("release contract locks Web Push identity, forward-only baseline and four additive migrations", () => {
  const value = contract();
  assert.equal(value.releaseId, "WBD-MAIL-WEB-PUSH-FORWARD-R2-MOBILE-20260826");
  assert.equal(value.compatibilityPolicy.mode, "forward-only");
  assert.equal(value.compatibilityPolicy.proof.baselineCommit, value.expectedBaseline.commit);
  assert.deepEqual(value.databases[0].migrations.map((migration) => migration.id), ["003", "004", "005", "006"]);
  assert.ok(value.databases[0].migrations.every((migration) => migration.classification === "ADDITIVE" && migration.compatibleWithActive));
  assert.match(value.contractHash, /^[a-f0-9]{64}$/u);
});

test("real immutable Web Push artifact, manifest and migration files match the release contract", async () => {
  const value = contract();
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const artifact = await readFile(new URL(`../../release/${value.artifact.path}`, import.meta.url));
  const manifestBytes = await readFile(new URL(`../../release/${value.artifact.manifestPath}`, import.meta.url));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(digest(artifact), value.artifact.sha256);
  assert.equal(digest(manifestBytes), value.artifact.manifestSha256);
  assert.equal(manifest.commit, value.commit);
  assert.equal(manifest.tag, value.tag);
  assert.equal(manifest.baseFreezeCommit, value.expectedBaseline.commit);
  for (const migration of value.databases.flatMap((database) => database.migrations)) {
    assert.equal(digest(await readFile(new URL(`../${migration.file.replace(/^website\//u, "")}`, import.meta.url))), migration.checksum);
  }
});

test("release contract rejects arbitrary switch/restart operations and unsafe paths", () => {
  assert.throws(() => contract({ activation: { ...rawContract.activation, switchStrategy: "shell" } }), /niet geallowlist/);
  assert.throws(() => contract({ artifact: { ...rawContract.artifact, path: "../escape.tar.gz" } }), /onveilig pad/);
});

test("schema inspector SQL is pure read-only and status cannot create the ledger", () => {
  const queries = createPureSchemaInspectionQueries("wbd_workspace", ["wbd_mail_control_state"], "sportpaleis-runtime-state");
  assert.equal(assertPureReadOnlyInspectionQueries(queries), true);
  assert.doesNotMatch(Object.values(queries).map(({ sql }) => sql).join("\n"), /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/iu);
  assert.throws(() => assertPureReadOnlyInspectionQueries({ bad: { sql: "CREATE TABLE x (id INT)" } }), /niet puur read-only/);
});

test("environment contract resolves tested legacy migrator aliases without exposing values", () => {
  const value = contract();
  const platform = new InMemoryReleasePlatform({ contract: value, now: fixedNow.toISOString() });
  platform.environment.MIGRATOR_DB_USER = platform.environment.WBD_MIGRATOR_USER;
  platform.environment.MIGRATOR_DB_PASSWORD = platform.environment.WBD_MIGRATOR_PASSWORD;
  delete platform.environment.WBD_MIGRATOR_USER;
  delete platform.environment.WBD_MIGRATOR_PASSWORD;
  const result = inspectEnvironmentContract(value, platform.environment, platform.secrets);
  assert.equal(result.bindings.find(({ key }) => key === "WBD_MIGRATOR_USER").source, "MIGRATOR_DB_USER");
  assert.equal(result.bindings.find(({ key }) => key === "WBD_MIGRATOR_PASSWORD").source, "MIGRATOR_DB_PASSWORD");
  assert.doesNotMatch(JSON.stringify(result.bindings), /fixture-/u);
});

test("environment inspection blocks missing keys and wrong secret permissions", () => {
  const value = contract();
  const platform = new InMemoryReleasePlatform({ contract: value, now: fixedNow.toISOString() });
  delete platform.environment.ATLAS_DB_HOST;
  assert.throws(() => inspectEnvironmentContract(value, platform.environment, platform.secrets), (error) => error instanceof ReleaseEngineError && error.diagnostic.class === "ENVIRONMENT");
  platform.environment.ATLAS_DB_HOST = "127.0.0.1";
  platform.secrets[value.environment.secretBindings[0].binding].mode = "0644";
  assert.throws(() => inspectEnvironmentContract(value, platform.environment, platform.secrets), (error) => error instanceof ReleaseEngineError && error.diagnostic.code === "SECRET_PERMISSION_MISMATCH");
});

test("diagnostics redact credentials but preserve useful commit/checksum evidence", () => {
  const sanitized = sanitizeDiagnostic({ password: "never-show", commit: "e".repeat(40), checksum: "a".repeat(64), message: "password=hunter2 mariadb://user:pass@db/x" });
  assert.equal(sanitized.password, "[REDACTED]");
  assert.equal(sanitized.commit, "e".repeat(40));
  assert.equal(sanitized.checksum, "a".repeat(64));
  assert.doesNotMatch(sanitized.message, /hunter2|user:pass/u);
});

test("schema comparator catches collisions while allowing MariaDB implicit JSON checks", () => {
  const target = contract().databases[0].migrations[0].targetState[0];
  const actual = structuredClone(target);
  actual.checks.push("json_valid(`state_json`)");
  assert.equal(schemaObjectMatches(target, actual), true);
  actual.columns[0].type = "varchar(63)";
  assert.equal(schemaObjectMatches(target, actual), false);
});

test("new tables are pending, not missing failures", () => {
  const database = contract().databases[0];
  const result = inspectMigrationState(database, { ledger: [], objects: [] });
  assert.deepEqual(result.pending, ["003", "004", "005", "006"]);
  assert.deepEqual(result.blocking, []);
});

test("missing migration ledger is a schema blocker and additive SQL classification is enforced", () => {
  const value = contract();
  const result = inspectMigrationState(value.databases[0], { ledgerPresent: false, ledger: [], objects: [] });
  assert.equal(result.blocking.find(({ kind }) => kind === "ledger").status, "SCHEMA_MISSING");
  assert.throws(() => assertMigrationSqlMatchesClassification(value.databases[0].migrations[0], "DROP TABLE wbd_mail_control_state;"), /ADDITIVE migration/);
  assert.equal(assertMigrationSqlMatchesClassification(value.databases[0].migrations[0], "CREATE TABLE IF NOT EXISTS safe_table (id INT);"), true);
});

test("existing exact unledgered schema is blocked instead of silently registered", () => {
  const database = contract().databases[0];
  const result = inspectMigrationState(database, { ledger: [], objects: [structuredClone(database.migrations[0].targetState[0])] });
  assert.equal(result.results.find(({ id }) => id === "003").status, "UNLEDGERED_SCHEMA");
  assert.throws(() => buildMigrationPlan(contract(), [result]), /schema-state|wijkt af/iu);
});

test("partial migration and ledger checksum mismatch are schema collisions", () => {
  const database = contract().databases[0];
  const partial = structuredClone(database.migrations[0].targetState[0]);
  partial.columns.pop();
  const partialResult = inspectMigrationState(database, { ledger: [], objects: [partial] });
  assert.equal(partialResult.results.find(({ id }) => id === "003").status, "PARTIAL_OR_COLLIDING_SCHEMA");
  const exact = structuredClone(database.migrations[0].targetState[0]);
  const ledgerResult = inspectMigrationState(database, { ledger: [{ id: "003", checksum: "0".repeat(64) }], objects: [exact] });
  assert.equal(ledgerResult.results.find(({ id }) => id === "003").status, "LEDGER_CHECKSUM_MISMATCH");
});

test("missing migration file fails before database access", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-release-missing-migration-"));
  const value = contract();
  const contractRoot = path.join(root, "contracts");
  await mkdir(contractRoot, { recursive: true });
  await writeFile(path.join(contractRoot, `${value.releaseId}.release-contract.json`), JSON.stringify(rawContract));
  let databaseAccess = 0;
  await assert.rejects(applyOneMigration({
    releaseId: value.releaseId, databaseId: "workspace", migrationId: "003", expectedChecksum: value.databases[0].migrations[0].checksum,
    roots: { releaseRoot: path.join(root, "empty-release"), contractRoot, stateRoot: path.join(root, "state"), environmentFile: path.join(root, "production.env") },
    poolFactory: () => { databaseAccess += 1; throw new Error("must not connect"); },
  }), /ENOENT|no such file/iu);
  assert.equal(databaseAccess, 0);
  await rm(root, { recursive: true, force: true });
});

test("known engine intent resumes exact unledgered DDL state and only completes ledger", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-release-resume-migration-"));
  const value = contract();
  const migration = value.databases[0].migrations[0];
  const contractRoot = path.join(root, "contracts");
  const releaseRoot = path.join(root, "release");
  const stateRoot = path.join(root, "state");
  const environmentFile = path.join(root, "production.env");
  await mkdir(contractRoot, { recursive: true });
  await mkdir(path.join(releaseRoot, path.dirname(migration.file)), { recursive: true });
  await mkdir(path.join(stateRoot, "migration-journal", value.releaseId), { recursive: true });
  await writeFile(path.join(contractRoot, `${value.releaseId}.release-contract.json`), JSON.stringify(rawContract));
  const sourceSql = await readFile(new URL(`../sportpaleis-server/production-migrations/workspace/003-wbd-mail-control.sql`, import.meta.url), "utf8");
  await writeFile(path.join(releaseRoot, migration.file), sourceSql);
  await writeFile(environmentFile, [
    "WORKSPACE_DB_HOST=127.0.0.1", "WORKSPACE_DB_PORT=3306", "WORKSPACE_DB_NAME=wbd_workspace",
    "MIGRATOR_DB_USER=wbd_migrator", "MIGRATOR_DB_PASSWORD=not-logged",
  ].join("\n"));
  await writeFile(path.join(stateRoot, "migration-journal", value.releaseId, "workspace-003.json"), JSON.stringify({ releaseId: value.releaseId, databaseId: "workspace", migrationId: "003", checksum: migration.checksum, status: "APPLYING" }));
  const queries = [];
  const result = await applyOneMigration({
    releaseId: value.releaseId, databaseId: "workspace", migrationId: "003", expectedChecksum: migration.checksum,
    roots: { releaseRoot, contractRoot, stateRoot, environmentFile },
    platformFactory: () => ({ async inspectDatabase() { return { ledger: [], objects: [structuredClone(migration.targetState[0])] }; } }),
    poolFactory: () => ({ async query(sql) { queries.push(sql); return sql.startsWith("SELECT") ? [{ count: 1 }] : { affectedRows: 1 }; }, async end() {} }),
  });
  assert.equal(result.status, "APPLIED");
  assert.equal(queries.length, 2);
  assert.match(queries[0], /^SELECT /u);
  assert.match(queries[1], /^INSERT INTO wbd_schema_migrations/u);
  assert.doesNotMatch(queries.join("\n"), /CREATE TABLE/iu);
  await rm(root, { recursive: true, force: true });
});

test("destructive migration is outside normal Human GO", () => {
  const raw = structuredClone(rawContract);
  raw.databases[0].migrations[0].classification = "DESTRUCTIVE";
  const value = validateReleaseContract(raw);
  const inspection = inspectMigrationState(value.databases[0], { ledger: [], objects: [] });
  assert.throws(() => buildMigrationPlan(value, [inspection]), /destructief/iu);
});

test("backup readiness requires checksum, database scopes, fresh restore proof and entrypoint", () => {
  const value = contract();
  const platform = new InMemoryReleasePlatform({ contract: value, now: fixedNow.toISOString() });
  assert.equal(inspectRecoveryReadiness(value, platform.recovery, fixedNow.getTime()).ready, true);
  platform.recovery.backup.checksumValid = false;
  assert.equal(inspectRecoveryReadiness(value, platform.recovery, fixedNow.getTime()).ready, false);
});

test("append-only audit chain detects mutation", async () => {
  const { engine, contract: value } = fixture();
  await engine.register(value);
  const events = await engine.events(value);
  assert.equal(verifyAuditChain(events).valid, true);
  const mutated = structuredClone(events);
  mutated[0].details.commit = "0".repeat(40);
  assert.throws(() => verifyAuditChain(mutated), /hash wijkt af/);
});

test("happy prepare ends at one compact AWAITING_HUMAN_GO boundary", async () => {
  const result = await prepared();
  const state = await result.engine.state(result.contract);
  assert.equal(state.state, "AWAITING_HUMAN_GO");
  assert.equal(result.plan.migrations.steps.length, 4);
  assert.equal(result.plan.safetyCounters.activeSubscriptions, 0);
  const summary = result.engine.approvalSummary(result.contract, result.plan);
  assert.equal(summary.risk, "LOW_ADDITIVE");
  assert.equal(summary.expectedDowntime, "one-controlled-restart");
  assert.equal(summary.featureExposure.default, "OFF");
  assert.ok(result.platform.calls.indexOf("environmentUnlock:prepare") < result.platform.calls.indexOf("stageArtifact"));
  assert.ok(result.platform.calls.indexOf("stageArtifact") < result.platform.calls.indexOf("environmentLock:prepare-finalize"));
});

test("privileged current inspection vergelijkt symlink, manifest en env zonder secretoutput", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "release-current-inspect-"));
  const server = createServer((_request, response) => { response.writeHead(200, { "Content-Type": "application/json" }); response.end('{"status":"ok"}'); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const value = contract();
    const contractRoot = path.join(root, "contracts");
    const releaseRoot = path.join(root, value.expectedBaseline.releaseId);
    await mkdir(contractRoot, { recursive: true });
    await mkdir(releaseRoot, { recursive: true });
    await writeFile(path.join(contractRoot, `${value.releaseId}.release-contract.json`), `${JSON.stringify(rawContract)}\n`);
    await writeFile(path.join(releaseRoot, "RELEASE-MANIFEST.json"), `${JSON.stringify({ releaseId: value.expectedBaseline.releaseId, commit: value.expectedBaseline.commit })}\n`);
    const environmentFile = path.join(root, "production.env");
    await writeFile(environmentFile, `RELEASE_ID=${value.expectedBaseline.releaseId}\nPRIVATE_VALUE=never-return-this\n`);
    const address = server.address();
    const inspected = await privilegedInspect({ releaseId: value.releaseId, contractHash: value.contractHash, mode: "current", roots: {
      contractRoot, environmentFile, currentLink: releaseRoot,
      healthUrl: `http://127.0.0.1:${address.port}/health`, readinessUrl: `http://127.0.0.1:${address.port}/ready`,
    } });
    assert.equal(inspected.releaseId, value.expectedBaseline.releaseId);
    assert.equal(inspected.commit, value.expectedBaseline.commit);
    assert.equal(inspected.health, "PASS");
    assert.equal(inspected.readiness, "PASS");
    assert.doesNotMatch(JSON.stringify(inspected), /never-return-this/u);
  } finally { server.close(); await rm(root, { recursive: true, force: true }); }
});

test("legacy staging krijgt de gedeelde lock zonder self-deadlock en drift daarna blokkeert", async () => {
  const result = fixture();
  const stage = result.platform.stageArtifact.bind(result.platform);
  result.platform.stageArtifact = async (...args) => {
    const staged = await stage(...args);
    result.platform.current.commit = "f".repeat(40);
    return staged;
  };
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "BASELINE_DRIFT");
  assert.equal(result.platform.plan, null);
  assert.equal((await result.engine.state(result.contract)).state, "BLOCKED");
});

test("baseline drift blocks before staging", async () => {
  const result = fixture();
  result.platform.current.commit = "f".repeat(40);
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "BASELINE_DRIFT");
  assert.equal(result.platform.calls.includes("stageArtifact"), false);
});

test("corrupt artifact blocks before any mutation", async () => {
  const result = fixture();
  result.platform.artifact.sha256 = "0".repeat(64);
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "ARTIFACT");
  assert.equal(result.platform.calls.includes("stageArtifact"), false);
});

test("missing environment and missing secret fail closed", async (context) => {
  await context.test("missing environment", async () => {
    const result = fixture(); delete result.platform.environment.WORKSPACE_DB_HOST;
    await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "ENVIRONMENT");
  });
  await context.test("missing secret", async () => {
    const result = fixture(); result.platform.secrets[result.contract.environment.secretBindings[0].binding].exists = false;
    await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "SECRET");
  });
});

test("database unavailable is classified with component and safe retry", async () => {
  const result = fixture();
  result.platform.fail("inspectDatabase:workspace", Object.assign(new Error("connect timeout"), { code: "ETIMEDOUT" }));
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "DATABASE_CONNECTIVITY" && error.diagnostic.retrySafe === true);
});

test("schema collision and unavailable backup block prepare", async (context) => {
  await context.test("schema collision", async () => {
    const result = fixture();
    const object = structuredClone(result.contract.databases[0].migrations[0].targetState[0]); object.columns.pop();
    result.platform.databases.get("workspace").objects.push(object);
    await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "SCHEMA_COLLISION");
  });
  await context.test("backup unavailable", async () => {
    const raw = structuredClone(rawContract); raw.prepare.autoBackup = false;
    const value = validateReleaseContract(raw); const platform = new InMemoryReleasePlatform({ contract: value, now: fixedNow.toISOString() });
    platform.recovery.backup.checksumValid = false;
    const engine = new WbdReleaseEngine({ stateStore: new InMemoryReleaseStateStore(), platform, clock: () => fixedNow });
    await assert.rejects(engine.inspectAndPrepare(value), /recoverybasis/iu);
  });
});

test("full GO applies migrations, switches once, verifies and marks LIVE", async () => {
  const result = await prepared();
  const outcome = await activate(result);
  assert.equal(outcome.state, "LIVE");
  assert.equal(result.platform.current.releaseId, result.contract.releaseId);
  assert.equal(result.platform.restartCount, 1);
  assert.equal((await result.engine.state(result.contract)).state, "LIVE");
  assert.equal(result.platform.databases.get("workspace").ledger.length, 4);
});

test("duplicate GO after LIVE is idempotent and never restarts twice", async () => {
  const result = await prepared();
  await activate(result);
  const second = await activate(result);
  assert.equal(second.idempotent, true);
  assert.equal(result.platform.restartCount, 1);
});

for (const [label, operation, expectedClass] of [
  ["restart fail", "restartService", "RESTART"],
  ["readiness timeout", "readiness:workspace-readiness:candidate", "READINESS"],
  ["Workspace smoke fail", "smoke:workspace-health:post-switch", "SMOKE"],
  ["Mail smoke fail", "smoke:mail-runtime:post-switch", "SMOKE"],
  ["feature smoke fail", "smoke:web-push-runtime-non-delivering:post-switch", "SMOKE"],
]) {
  test(`${label} triggers automatic rollback and rollback smokes`, async () => {
    const result = await prepared();
    result.platform.fail(operation, new Error(label));
    const outcome = await activate(result);
    assert.equal(outcome.state, "ROLLED_BACK");
    assert.equal(outcome.reason.class, expectedClass);
    assert.equal(result.platform.current.releaseId, result.contract.rollback.targetReleaseId);
    assert.equal((await result.engine.state(result.contract)).state, "ROLLED_BACK");
  });
}

test("unexpected push/subscription side effect triggers rollback", async () => {
  const result = await prepared();
  const original = result.platform.runSmoke.bind(result.platform);
  result.platform.runSmoke = async (...args) => { const response = await original(...args); if (args[1] === "web-push-runtime-non-delivering") result.platform.unexpectedPushes += 1; return response; };
  const outcome = await activate(result);
  assert.equal(outcome.state, "ROLLED_BACK");
});

test("rollback failure escalates to BLOCKED with ROLLBACK diagnostic", async () => {
  const result = await prepared();
  result.platform.fail("restartService", new Error("restart failed"));
  result.platform.fail("rollback", new Error("rollback target unavailable"));
  await assert.rejects(activate(result), (error) => error.diagnostic.class === "ROLLBACK");
  assert.equal((await result.engine.state(result.contract)).state, "BLOCKED");
});

test("ENVIRONMENT_LOCK blocks WBD prepare while a parallel Sportpaleis release owns production", async () => {
  const result = fixture();
  const releaseEnvironment = await result.platform.acquireEnvironmentLock(result.contract, "sportpaleis-final");
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "ENVIRONMENT_LOCK" && error.diagnostic.retrySafe === true);
  assert.equal((await result.engine.state(result.contract)).state, "CANDIDATE");
  assert.equal(result.platform.calls.includes("inspectCurrent"), false);
  await releaseEnvironment();
  const plan = await result.engine.inspectAndPrepare(result.contract);
  assert.equal(plan.observedBaseline.commit, result.contract.expectedBaseline.commit);
});

test("CONCURRENT_RELEASE_PROTECTION rejects the same tenant/app and releases the environment lease", async () => {
  const result = fixture();
  const release = await result.store.lock({ tenant: result.contract.tenant, application: result.contract.application }, "other-run");
  await assert.rejects(result.engine.inspectAndPrepare(result.contract), (error) => error.diagnostic.class === "CONCURRENT_RELEASE");
  assert.equal(result.platform.environmentLeaseHeld, false);
  await release();
});

test("BASELINE_DRIFT_RECHECK invalidates a stale plan before migrations or switch", async () => {
  const result = await prepared();
  result.platform.current = { ...result.platform.current, releaseId: "SPW-NEWER-PRODUCTION", commit: "f".repeat(40) };
  await assert.rejects(activate(result), (error) => error.diagnostic.class === "BASELINE_DRIFT");
  const events = await result.engine.events(result.contract);
  const stale = events.find((event) => event.type === "stale_plan_invalidated");
  assert.equal(stale?.details.invalidated, true);
  assert.equal(stale?.details.planHash, result.plan.planHash);
  assert.equal((await result.engine.state(result.contract)).state, "BLOCKED");
  assert.equal(result.platform.calls.some((call) => call.startsWith("applyMigration:")), false);
  assert.equal(result.platform.calls.includes("atomicSwitch"), false);
  assert.equal(result.platform.restartCount, 0);
});

test("STALE_PLAN_INVALIDATION prohibits replay of the old Human GO", async () => {
  const result = await prepared();
  result.platform.current = { ...result.platform.current, releaseId: "SPW-NEWER-PRODUCTION", commit: "f".repeat(40) };
  await assert.rejects(activate(result), (error) => error.diagnostic.class === "BASELINE_DRIFT");
  await assert.rejects(activate(result), /Human GO niet toegestaan vanuit BLOCKED/iu);
  assert.equal(result.platform.calls.includes("atomicSwitch"), false);
});

test("durable lock recovers only a proven-dead runner PID", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-release-lock-"));
  const lock = path.join(root, "locks", "wbd--workspace.lock");
  await mkdir(lock, { recursive: true });
  await writeFile(path.join(lock, "owner.json"), JSON.stringify({ owner: "crashed-runner", pid: 2_147_483_647, acquiredAt: fixedNow.toISOString() }));
  const store = new FileReleaseStateStore({ root });
  const release = await store.lock({ tenant: "wbd", application: "workspace" }, "restarted-runner");
  await release();
  await rm(root, { recursive: true, force: true });
});

test("core remains tenant/app generic for a Sportpaleis candidate", async () => {
  const raw = structuredClone(rawContract);
  raw.releaseId = "SPW-GENERIC-ENGINE-FIXTURE";
  raw.tenant = "sportpaleis";
  raw.application = "workspace";
  raw.tag = raw.releaseId;
  raw.commit = "a".repeat(40);
  raw.artifact.path = `${raw.releaseId}.tar.gz`;
  raw.artifact.manifestPath = `${raw.releaseId}.manifest.json`;
  raw.rollback.targetReleaseId = raw.expectedBaseline.releaseId;
  const value = validateReleaseContract(raw);
  const platform = new InMemoryReleasePlatform({ contract: value, now: fixedNow.toISOString() });
  platform.artifact.commit = value.commit;
  platform.artifact.tag = value.tag;
  const engine = new WbdReleaseEngine({ stateStore: new InMemoryReleaseStateStore(), platform, clock: () => fixedNow });
  const plan = await engine.inspectAndPrepare(value);
  assert.equal(plan.tenant, "sportpaleis");
  assert.equal((await engine.ownerSummary(value)).application, "workspace");
});

test("runner restart after an uncertain switch automatically rolls back without a second planned restart", async () => {
  const result = await prepared();
  await result.engine.transition(result.contract, "ACTIVATING", "human_go_approved", { planHash: result.plan.planHash }, "go-interrupted", "donovan-owner");
  result.platform.current = { ...result.platform.current, releaseId: result.contract.releaseId, commit: result.contract.commit };
  const resumed = await result.engine.resume(result.contract);
  assert.equal(resumed.state, "ROLLED_BACK");
  assert.equal(result.platform.current.releaseId, result.contract.rollback.targetReleaseId);
  assert.equal(result.platform.restartCount, 1);
});

test("Owner Workspace seam exposes summary and requires exact contract hash", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-release-contracts-"));
  const result = fixture();
  await writeFile(path.join(root, `${result.contract.releaseId}.release-contract.json`), JSON.stringify(rawContract));
  const server = createServer(createReleaseEngineRequestHandler({ engine: result.engine, contractRoot: root }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const blocked = await fetch(`http://127.0.0.1:${address.port}/v1/releases/${result.contract.releaseId}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractHash: "0".repeat(64) }) });
    assert.equal(blocked.status, 409);
    const preparedResponse = await fetch(`http://127.0.0.1:${address.port}/v1/releases/${result.contract.releaseId}/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractHash: result.contract.contractHash }) });
    assert.equal(preparedResponse.status, 200);
    assert.equal((await preparedResponse.json()).state, "AWAITING_HUMAN_GO");
    const summary = await (await fetch(`http://127.0.0.1:${address.port}/v1/releases/${result.contract.releaseId}`)).json();
    assert.equal(summary.humanAction, "REVIEW_AND_GO");
  } finally { server.close(); await rm(root, { recursive: true, force: true }); }
});

test("server-side runner sources contain no SSH, PowerShell or arbitrary shell execution", async () => {
  const sources = await Promise.all([
    "../scripts/release-engine-service.mjs", "../scripts/release-engine-runner.mjs", "../scripts/release-engine-platform.mjs",
  ].map((relative) => readFile(new URL(relative, import.meta.url), "utf8")));
  assert.doesNotMatch(sources.join("\n"), /\bssh\b|powershell|cmd\.exe|shell:\s*true/iu);
  assert.match(sources.join("\n"), /execFileAsync\("sudo", \["--non-interactive"/u);
});

test("machine identity service is hardened and break-glass is not granted to runner", async () => {
  const unit = await readFile(new URL("../../ops/release-engine/wbd-release-engine.service", import.meta.url), "utf8");
  const sudoers = await readFile(new URL("../../ops/release-engine/wbd-release-engine.sudoers", import.meta.url), "utf8");
  const broker = await readFile(new URL("../../ops/release-engine/wbd-release-engine-operation", import.meta.url), "utf8");
  const installation = await readFile(new URL("../../ops/release-engine/INSTALLATION-CHECKLIST.md", import.meta.url), "utf8");
  const platform = await readFile(new URL("../scripts/release-engine-platform.mjs", import.meta.url), "utf8");
  assert.match(unit, /User=wbd-release[\s\S]*ProtectSystem=strict/u);
  assert.doesNotMatch(unit, /NoNewPrivileges=true/u);
  assert.match(unit, /ExecStart=\/usr\/bin\/node [^\n]+release-engine-service\.mjs/u);
  assert.doesNotMatch(unit, /MemoryDenyWriteExecute=true/u);
  assert.match(unit, /ReadWritePaths=.*\.spw-release-deploy\.lock/u);
  const sudoRules = sudoers.split(/\r?\n/u).filter((line) => line.trim() && !line.trim().startsWith("#")).join("\n");
  assert.doesNotMatch(sudoRules, /\/bin\/(ba)?sh|systemctl|NOPASSWD:\s*ALL/u);
  assert.doesNotMatch(broker, /\beval\b|ssh|scp|sftp|powershell/iu);
  assert.match(broker, /OPERATION_NOT_ALLOWLISTED/u);
  assert.match(broker, /inspect-current/u);
  assert.match(broker, /inspect-env\) mode=environment/u);
  assert.match(broker, /inspect-recovery\) mode=recovery/u);
  assert.match(platform, /#broker\("inspect-current"/u);
  assert.match(installation, /traverse-only ACL \(`--x`\)[\s\S]*do not grant directory listing/u);
  assert.match(broker, /backup\|stage\|rollback-set\|migrate\|switch\|restart\|rollback/u);
  assert.match(broker, /systemd-run --quiet --wait --pipe --collect --service-type=exec/u);
  assert.match(broker, /--setenv=WBD_RELEASE_ENGINE_HOST_CONTEXT=1/u);
  assert.match(broker, /DELEGATED_CALLER_INVALID/u);
  assert.match(installation, /transient root-owned systemd execution unit[\s\S]*ProtectSystem=strict/u);
  assert.doesNotMatch(unit, /ReadWritePaths=.*\/srv\/wbd\/releases/u);
  assert.doesNotMatch(unit, /ReadWritePaths=.*\/etc\/wbd/u);
  assert.match(broker, /\/usr\/local\/libexec\/wbd-deployment\/spw-immutable-release\.sh/u);
  assert.match(broker, /-prechange-production\.env/u);
  assert.doesNotMatch(broker, /snapshot\)\s*[\s\S]{0,200}\/dev\/null/u);
});
