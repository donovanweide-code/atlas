import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import mariadb from "mariadb";
import { assertPureReadOnlyInspectionQueries, createPureSchemaInspectionQueries } from "./release-engine-inspection.mjs";

const execFileAsync = promisify(execFile);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseEnvironment(text) {
  const environment = {};
  for (const rawLine of String(text).split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    environment[key] = value;
  }
  return environment;
}

function modeString(mode) {
  return `0${(mode & 0o777).toString(8)}`;
}

function baseType(columnType) {
  return String(columnType).toLowerCase();
}

function databaseConfig(prefix, environment) {
  const required = (name) => {
    const value = String(environment[name] ?? "");
    if (!value) throw Object.assign(new Error(`${name} ontbreekt.`), { code: "ENVIRONMENT_MISSING" });
    return value;
  };
  return {
    host: required(`${prefix}_DB_HOST`), port: Number(environment[`${prefix}_DB_PORT`] ?? 3306), database: required(`${prefix}_DB_NAME`),
    user: required(`${prefix}_DB_USER`), password: required(`${prefix}_DB_PASSWORD`), connectionLimit: 2, acquireTimeout: 5_000,
    connectTimeout: 5_000, multipleStatements: false, timezone: "Z", charset: "utf8mb4",
  };
}

export class LinuxReleasePlatform {
  constructor({
    root = "/srv/wbd", environmentFile = "/etc/wbd/production.env", backupRoot = "/var/backups/wbd-mariadb",
    stateRoot = "/srv/wbd/shared/release-engine", inboxRoot = "/srv/wbd/shared/release-inbox",
    broker = "/usr/local/libexec/wbd-release-engine-operation", healthUrl = "http://127.0.0.1:3000/health",
    readinessUrl = "http://127.0.0.1:3000/ready", deploymentLockFile = "/srv/wbd/shared/.spw-release-deploy.lock", fetchImpl = fetch,
  } = {}) {
    this.root = root;
    this.environmentFile = environmentFile;
    this.backupRoot = backupRoot;
    this.stateRoot = stateRoot;
    this.inboxRoot = inboxRoot;
    this.broker = broker;
    this.deploymentLockFile = deploymentLockFile;
    this.healthUrl = healthUrl;
    this.readinessUrl = readinessUrl;
    this.fetchImpl = fetchImpl;
  }

  async acquireEnvironmentLock(_contract, purpose) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(String(purpose ?? ""))) throw new Error("Ongeldige environment-lock purpose.");
    const child = spawn("/usr/bin/flock", ["--nonblock", "--exclusive", this.deploymentLockFile, "/usr/bin/sleep", "infinity"], {
      stdio: ["ignore", "ignore", "pipe"], windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(0, 2_000); });
    await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(Object.assign(new Error(`Production environment lock is bezet${stderr.trim() ? `: ${stderr.trim()}` : "."}`), { code: "ENVIRONMENT_LOCKED" }));
      };
      child.once("error", fail);
      child.once("exit", (code) => fail(Object.assign(new Error(`flock stopte met code ${code}.`), { code: "ENVIRONMENT_LOCKED" })));
      setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve();
      }, 100).unref();
    });
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      if (child.exitCode === null) {
        await new Promise((resolve) => {
          child.once("exit", resolve);
          child.kill("SIGTERM");
        });
      }
    };
  }

  async #probe(url) {
    const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(5_000), headers: { Accept: "application/json" } });
    return response.ok ? "PASS" : "FAIL";
  }

  async inspectCurrent() {
    const currentPath = await realpath(path.join(this.root, "current"));
    const manifest = JSON.parse(await readFile(path.join(currentPath, "RELEASE-MANIFEST.json"), "utf8"));
    const environment = parseEnvironment(await readFile(this.environmentFile, "utf8"));
    if (environment.RELEASE_ID !== manifest.releaseId || path.basename(currentPath) !== manifest.releaseId) throw Object.assign(new Error("Current symlink, environment en manifest wijken af."), { code: "BASELINE_DRIFT" });
    return { releaseId: manifest.releaseId, commit: manifest.commit, health: await this.#probe(this.healthUrl), readiness: await this.#probe(this.readinessUrl), currentPath, runtimeVersion: process.version };
  }

  async inspectArtifact(contract) {
    const artifactPath = path.resolve(this.inboxRoot, contract.artifact.path);
    const manifestPath = path.resolve(this.inboxRoot, contract.artifact.manifestPath);
    if (!artifactPath.startsWith(`${path.resolve(this.inboxRoot)}${path.sep}`) || !manifestPath.startsWith(`${path.resolve(this.inboxRoot)}${path.sep}`)) throw new Error("Artifactpad verlaat de release-inbox.");
    const [artifactBytes, manifestBytes] = await Promise.all([readFile(artifactPath), readFile(manifestPath)]);
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    return { sha256: sha256(artifactBytes), manifestSha256: sha256(manifestBytes), commit: manifest.commit, tag: manifest.tag, releaseId: manifest.releaseId, baseFreezeCommit: manifest.baseFreezeCommit, sourceProvenance: manifest.sourceProvenance };
  }

  async readEnvironment() {
    return parseEnvironment(await readFile(this.environmentFile, "utf8"));
  }

  async inspectEnvironment(contract) {
    return this.#broker("inspect-env", [contract.releaseId, contract.contractHash]);
  }

  async inspectSecrets(contract) {
    const result = {};
    const environmentCache = new Map();
    for (const binding of contract.environment.secretBindings) {
      const match = /^env-file:(\/[^#]+)#([A-Z][A-Z0-9_]*)$/u.exec(binding.binding);
      if (!match) throw new Error(`Niet-geallowliste secretbinding: ${binding.binding}`);
      const [, file, key] = match;
      const metadata = await stat(file);
      let parsed = environmentCache.get(file);
      if (!parsed) {
        parsed = parseEnvironment(await readFile(file, "utf8"));
        environmentCache.set(file, parsed);
      }
      result[binding.binding] = { exists: Boolean(parsed[key]), owner: String(metadata.uid), mode: modeString(metadata.mode), readableByRunner: true };
    }
    return result;
  }

  async inspectDatabase(contract, database, resolvedEnvironment) {
    if (!resolvedEnvironment) return this.#broker("inspect-db", [contract.releaseId, contract.contractHash, database.id]);
    const environment = Object.fromEntries(resolvedEnvironment.entries());
    const config = databaseConfig(database.environmentPrefix, environment);
    const pool = mariadb.createPool(config);
    const names = [...new Set([...database.requirements, ...database.migrations.flatMap((migration) => migration.targetState)].map((object) => object.name))];
    const queries = createPureSchemaInspectionQueries(config.database, names, database.migrationComponent);
    assertPureReadOnlyInspectionQueries(queries);
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.query("SET SESSION TRANSACTION READ ONLY");
      const tableExists = await connection.query("SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'wbd_schema_migrations'", [config.database]);
      const ledger = Number(tableExists[0]?.count ?? 0) === 1 ? await connection.query(queries.ledger.sql, queries.ledger.params) : [];
      const [tables, columns, indexes, checks] = await Promise.all([
        connection.query(queries.tables.sql, queries.tables.params), connection.query(queries.columns.sql, queries.columns.params),
        connection.query(queries.indexes.sql, queries.indexes.params), connection.query(queries.checks.sql, queries.checks.params),
      ]);
      const objects = tables.map((table) => {
        const tableColumns = columns.filter((column) => column.TABLE_NAME === table.TABLE_NAME).map((column) => ({ name: column.COLUMN_NAME, type: baseType(column.COLUMN_TYPE), nullable: column.IS_NULLABLE === "YES" }));
        const groupedIndexes = new Map();
        for (const index of indexes.filter((entry) => entry.TABLE_NAME === table.TABLE_NAME)) {
          const current = groupedIndexes.get(index.INDEX_NAME) ?? { name: index.INDEX_NAME, unique: Number(index.NON_UNIQUE) === 0, fulltext: index.INDEX_TYPE === "FULLTEXT", columns: [] };
          current.columns.push(index.SUB_PART ? `${index.COLUMN_NAME}(${index.SUB_PART})` : index.COLUMN_NAME);
          groupedIndexes.set(index.INDEX_NAME, current);
        }
        const primary = groupedIndexes.get("PRIMARY")?.columns ?? [];
        groupedIndexes.delete("PRIMARY");
        return { type: "TABLE", name: table.TABLE_NAME, columns: tableColumns, primaryKey: primary, indexes: [...groupedIndexes.values()], checks: checks.filter((check) => check.TABLE_NAME === table.TABLE_NAME).map((check) => check.CHECK_CLAUSE), engine: table.ENGINE, charset: columns.find((column) => column.TABLE_NAME === table.TABLE_NAME && column.CHARACTER_SET_NAME)?.CHARACTER_SET_NAME ?? "utf8mb4", collation: table.TABLE_COLLATION };
      });
      return { ledgerPresent: Number(tableExists[0]?.count ?? 0) === 1, ledger: ledger.map((row) => ({ id: String(row.version).padStart(3, "0"), name: row.name, checksum: row.checksum, appliedAt: row.applied_at })), objects };
    } finally {
      connection?.release();
      await pool.end();
    }
  }

  async inspectRecovery(contract) {
    return this.#broker("inspect-recovery", [contract.releaseId, contract.contractHash]);
  }

  async inspectRecoveryDirect(contract) {
    const backups = (await readdir(this.backupRoot, { withFileTypes: true })).filter((entry) => entry.isFile() && /^wbd-mariadb-\d{8}T\d{6}Z\.sql\.enc$/u.test(entry.name));
    const candidates = await Promise.all(backups.map(async (entry) => ({ entry, metadata: await stat(path.join(this.backupRoot, entry.name)) })));
    candidates.sort((left, right) => right.metadata.mtimeMs - left.metadata.mtimeMs);
    if (!candidates.length) throw Object.assign(new Error("Geen WBD MariaDB backup gevonden."), { code: "BACKUP_MISSING" });
    const latest = candidates[0];
    const backupPath = path.join(this.backupRoot, latest.entry.name);
    const expected = String(await readFile(`${backupPath}.sha256`, "utf8")).trim().split(/\s+/u)[0].toLowerCase();
    const actual = sha256(await readFile(backupPath));
    const evidenceRoot = path.join(this.root, "shared", "recovery-evidence");
    const evidenceFiles = (await readdir(evidenceRoot, { withFileTypes: true })).filter((entry) => entry.isFile() && /^restore-verify-.*\.txt$/u.test(entry.name)).sort().reverse();
    if (!evidenceFiles.length) throw Object.assign(new Error("Restore-evidence ontbreekt."), { code: "RESTORE_EVIDENCE_MISSING" });
    const evidenceText = await readFile(path.join(evidenceRoot, evidenceFiles[0].name), "utf8");
    const evidence = parseEnvironment(evidenceText);
    return {
      backup: { id: latest.entry.name, file: latest.entry.name, sha256: actual, exists: true, checksumValid: expected === actual, createdAt: latest.metadata.mtime.toISOString(), scopes: ["workspace", "atlas"] },
      restoreEvidence: { id: evidenceFiles[0].name, passed: evidence.isolated_restore === "PASS" && evidence.cleanup === "PASS" && evidence.source_sha256 === actual, verifiedAt: evidence.verified_at },
      restoreEntrypoint: { available: await access("/usr/local/sbin/wbd-mariadb-restore-verify").then(() => true, () => false) },
    };
  }

  async #broker(operation, args = []) {
    const allowed = new Set(["inspect-env", "inspect-db", "inspect-recovery", "push-counters", "backup", "stage", "rollback-set", "migrate", "switch", "restart", "rollback", "smoke", "evidence"]);
    if (!allowed.has(operation) || args.some((argument) => typeof argument !== "string" || argument.includes("\0") || argument.includes("\n"))) throw new Error("Niet-geallowliste brokeroperatie geweigerd.");
    try {
      const result = await execFileAsync("sudo", ["--non-interactive", this.broker, operation, ...args], { timeout: 300_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
      return JSON.parse(String(result.stdout).trim() || "{}");
    } catch (error) {
      const safeStderr = String(error?.stderr ?? "").replace(/(password|secret|token|private[_-]?key)\s*[=:]\s*\S+/giu, "$1=[REDACTED]").slice(0, 4_000);
      throw Object.assign(new Error(`Release broker ${operation} faalde: ${safeStderr || "geen veilige stderr"}`), { code: "BROKER_FAILURE", exitCode: error?.code });
    }
  }

  async createAndVerifyBackup(contract) { await this.#broker("backup", [contract.releaseId]); return this.inspectRecovery(contract); }
  async createSchemaSnapshot(contract, inspections) {
    const directory = path.join(this.stateRoot, "schema-snapshots");
    await mkdir(directory, { recursive: true, mode: 0o750 });
    const file = path.join(directory, `${contract.releaseId}.json`);
    const bytes = Buffer.from(`${JSON.stringify({ schemaVersion: 1, releaseId: contract.releaseId, contractHash: contract.contractHash, capturedAt: new Date().toISOString(), inspections }, null, 2)}\n`);
    await writeFile(file, bytes, { mode: 0o640, flag: "wx" });
    return { path: file, sha256: sha256(bytes) };
  }
  async stageArtifact(contract) { return this.#broker("stage", [contract.releaseId, contract.contractHash]); }
  async prepareRollback(contract) { return this.#broker("rollback-set", [contract.releaseId, contract.rollback.targetReleaseId]); }

  async persistPlan(contract, plan) {
    const file = path.join(this.stateRoot, "plans", `${contract.releaseId}.json`);
    try {
      await writeFile(file, `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", mode: 0o640, flag: "wx" });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = JSON.parse(await readFile(file, "utf8"));
      if (existing.planHash !== plan.planHash) throw Object.assign(new Error("Bestaand immutable deployplan wijkt af."), { code: "DEPLOY_PLAN_COLLISION" });
    }
    return { file, planHash: plan.planHash };
  }

  async loadPlan(contract) {
    return JSON.parse(await readFile(path.join(this.stateRoot, "plans", `${contract.releaseId}.json`), "utf8"));
  }

  async applyMigration(contract, step, plan) { return this.#broker("migrate", [contract.releaseId, plan.planHash, step.database, step.migrationId, step.checksum]); }
  async verifyMigration(contract, step) {
    const database = contract.databases.find((item) => item.id === step.database);
    const environment = inspectEnvironmentForPlatform(contract, await this.readEnvironment());
    const actual = await this.inspectDatabase(contract, database, environment);
    const ledger = actual.ledger.find((entry) => entry.id === step.migrationId);
    const migration = database.migrations.find((entry) => entry.id === step.migrationId);
    const objects = new Map(actual.objects.map((object) => [object.name, object]));
    return { passed: ledger?.checksum === step.checksum && migration.targetState.every((target) => objects.has(target.name)), evidence: { ledgerChecksum: ledger?.checksum ?? null, targets: migration.targetState.map((target) => target.name) } };
  }

  async atomicSwitch(contract, plan) { return this.#broker("switch", [contract.releaseId, plan.planHash]); }
  async restartService(contract, plan) { return this.#broker("restart", [contract.releaseId, plan.planHash, contract.activation.restart.service]); }
  async restartRollbackTarget(contract, plan) { return this.#broker("restart", [contract.rollback.targetReleaseId, plan.planHash, contract.activation.restart.service]); }
  async rollback(contract, plan) { return this.#broker("rollback", [contract.releaseId, plan.planHash, contract.rollback.targetReleaseId]); }
  async writeReleaseEvidence(contract, plan) { return this.#broker("evidence", [contract.releaseId, plan.planHash]); }
  async runReadiness() { if (await this.#probe(this.readinessUrl) !== "PASS") throw Object.assign(new Error("Readiness check faalde."), { code: "READINESS_FAIL" }); }
  async runSmoke(contract, smoke, context) {
    const allowed = new Set([...contract.activation.smokeSuite, ...contract.activation.oldReleasePostMigrationSmokes, ...contract.rollback.smokeSuite]);
    if (!allowed.has(smoke)) throw new Error(`Smoke adapter ${smoke} is niet contractueel geallowlist.`);
    return this.#broker("smoke", [contract.releaseId, smoke, context.phase]);
  }
  async captureSideEffectCounters(contract) { return this.#broker("push-counters", [contract.releaseId, contract.contractHash]); }
  async reconcileInterruptedRun(contract) {
    const active = await this.inspectCurrent(contract);
    return { action: active.releaseId === contract.releaseId ? "ROLLBACK_REQUIRED_UNCERTAIN_RESTART_STATE" : "RESUME_PRE_SWITCH", active };
  }
}

function inspectEnvironmentForPlatform(contract, environment) {
  const resolved = new Map();
  for (const item of contract.environment.required) {
    const source = [item.key, ...item.aliases].find((key) => String(environment[key] ?? "").length > 0);
    if (source) resolved.set(item.key, environment[source]);
  }
  return resolved;
}

export class InMemoryReleasePlatform {
  constructor({ contract, now = "2026-08-25T22:00:00.000Z" } = {}) {
    this.contract = contract;
    this.now = now;
    this.current = { releaseId: contract.expectedBaseline.releaseId, commit: contract.expectedBaseline.commit, health: "PASS", readiness: "PASS", runtimeVersion: "v24.18.0" };
    this.artifact = { sha256: contract.artifact.sha256, manifestSha256: contract.artifact.manifestSha256, commit: contract.commit, tag: contract.tag, releaseId: contract.releaseId, baseFreezeCommit: contract.expectedBaseline.commit };
    this.environment = Object.fromEntries(contract.environment.required.map((item) => [item.key, item.secret ? `fixture-${item.key.toLowerCase()}` : `fixture-${item.key.toLowerCase()}`]));
    this.secrets = Object.fromEntries(contract.environment.secretBindings.map((binding) => [binding.binding, { exists: true, owner: binding.owner, mode: binding.mode, readableByRunner: true }]));
    this.databases = new Map(contract.databases.map((database) => [database.id, { ledgerPresent: true, ledger: [], objects: structuredClone(database.requirements) }]));
    this.recovery = { backup: { id: "backup-1", file: "backup.enc", sha256: "b".repeat(64), exists: true, checksumValid: true, createdAt: now, scopes: contract.databases.map((database) => database.id) }, restoreEvidence: { id: "restore-1", passed: true, verifiedAt: now }, restoreEntrypoint: { available: true } };
    this.plan = null;
    this.calls = [];
    this.failures = new Map();
    this.restartCount = 0;
    this.unexpectedPushes = 0;
    this.environmentLocked = false;
    this.environmentLeaseHeld = false;
  }

  fail(operation, error = new Error(`${operation} injected failure`)) { this.failures.set(operation, error); return this; }
  maybeFail(operation) { this.calls.push(operation); const error = this.failures.get(operation); if (error) throw error; }
  async acquireEnvironmentLock(_contract, purpose) {
    this.maybeFail(`environmentLock:${purpose}`);
    if (this.environmentLocked || this.environmentLeaseHeld) throw Object.assign(new Error("Production environment lock is bezet."), { code: "ENVIRONMENT_LOCKED" });
    this.environmentLeaseHeld = true;
    return async () => { this.environmentLeaseHeld = false; };
  }
  async inspectCurrent() { this.maybeFail("inspectCurrent"); return structuredClone(this.current); }
  async inspectArtifact() { this.maybeFail("inspectArtifact"); return structuredClone(this.artifact); }
  async readEnvironment() { this.maybeFail("readEnvironment"); return structuredClone(this.environment); }
  async inspectSecrets() { this.maybeFail("inspectSecrets"); return structuredClone(this.secrets); }
  async inspectDatabase(_contract, database) { this.maybeFail(`inspectDatabase:${database.id}`); return structuredClone(this.databases.get(database.id)); }
  async inspectRecovery() { this.maybeFail("inspectRecovery"); return structuredClone(this.recovery); }
  async createAndVerifyBackup() { this.maybeFail("createBackup"); this.recovery.backup.createdAt = this.now; this.recovery.backup.checksumValid = true; return structuredClone(this.recovery); }
  async createSchemaSnapshot() { this.maybeFail("schemaSnapshot"); return { sha256: "c".repeat(64) }; }
  async stageArtifact(contract) { this.maybeFail("stageArtifact"); return { releasePath: `/srv/wbd/releases/${contract.releaseId}`, verified: true }; }
  async prepareRollback(contract) { this.maybeFail("prepareRollback"); return { targetReleaseId: contract.rollback.targetReleaseId, verified: true }; }
  async persistPlan(_contract, plan) { this.maybeFail("persistPlan"); this.plan = structuredClone(plan); return { planHash: plan.planHash }; }
  async loadPlan() { this.maybeFail("loadPlan"); return structuredClone(this.plan); }
  async applyMigration(contract, step) {
    this.maybeFail(`applyMigration:${step.migrationId}`);
    const databaseContract = contract.databases.find((database) => database.id === step.database);
    const migration = databaseContract.migrations.find((item) => item.id === step.migrationId);
    const actual = this.databases.get(step.database);
    for (const object of migration.targetState) {
      const index = actual.objects.findIndex((item) => item.name === object.name);
      if (index >= 0) actual.objects[index] = structuredClone(object); else actual.objects.push(structuredClone(object));
    }
    actual.ledger.push({ id: migration.id, name: path.basename(migration.file), checksum: migration.checksum, appliedAt: this.now });
  }
  async verifyMigration(_contract, step) { this.maybeFail(`verifyMigration:${step.migrationId}`); const actual = this.databases.get(step.database); return { passed: actual.ledger.some((entry) => entry.id === step.migrationId && entry.checksum === step.checksum), evidence: { readOnly: true } }; }
  async runSmoke(_contract, smoke, context) { this.maybeFail(`smoke:${smoke}:${context.phase}`); return { passed: true, smoke, context }; }
  async atomicSwitch(contract) { this.maybeFail("atomicSwitch"); this.current = { ...this.current, releaseId: contract.releaseId, commit: contract.commit }; }
  async restartService() { this.maybeFail("restartService"); this.restartCount += 1; }
  async runReadiness(_contract, readiness, _plan, context = {}) { this.maybeFail(`readiness:${readiness}:${context.rollback ? "rollback" : "candidate"}`); return { passed: true }; }
  async writeReleaseEvidence(contract, plan) { this.maybeFail("writeEvidence"); return { id: `evidence-${contract.releaseId}`, planHash: plan.planHash, unexpectedPushes: this.unexpectedPushes }; }
  async captureSideEffectCounters() { this.maybeFail("pushCounters"); return { activeSubscriptions: 0, delivered: this.unexpectedPushes, pending: 0 }; }
  async rollback(contract) { this.maybeFail("rollback"); this.current = { ...this.current, releaseId: contract.rollback.targetReleaseId, commit: contract.expectedBaseline.commit }; }
  async restartRollbackTarget() { this.maybeFail("restartRollback"); this.restartCount += 1; }
  async reconcileInterruptedRun(contract) { this.maybeFail("reconcile"); return { action: this.current.releaseId === contract.releaseId ? "ROLLBACK_REQUIRED_UNCERTAIN_RESTART_STATE" : "RESUME_PRE_SWITCH", active: structuredClone(this.current) }; }
}
