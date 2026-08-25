import { ReleaseEngineError, canonicalJson, sha256 } from "./release-engine-core.mjs";

function fail({ stage, className, component, code, message, contract, activeRelease, nextAction, retrySafe = false, metadata }) {
  throw new ReleaseEngineError({ stage, className, component, code, message, candidate: contract?.releaseId, activeRelease, nextAction, retrySafe, metadata });
}

export function inspectEnvironmentContract(contract, environment, secretInspection = {}) {
  const resolved = new Map();
  const publicBindings = [];
  for (const item of contract.environment.required) {
    const source = [item.key, ...item.aliases].find((key) => String(environment[key] ?? "").length > 0);
    if (!source && item.required) fail({ stage: "INSPECTING", className: item.secret ? "SECRET" : "ENVIRONMENT", component: "environment-contract", code: "REQUIRED_ENV_MISSING", message: `Vereiste runtimebinding ${item.key} ontbreekt.`, contract, nextAction: `Bind ${item.key} via het centrale environmentcontract; wijzig geen candidate.`, retrySafe: true, metadata: { key: item.key, aliases: item.aliases } });
    if (source) {
      resolved.set(item.key, String(environment[source]));
      publicBindings.push({ key: item.key, source, secret: item.secret, status: "BOUND" });
    }
  }
  for (const binding of contract.environment.secretBindings) {
    const actual = secretInspection[binding.binding];
    if (!actual?.exists) fail({ stage: "INSPECTING", className: "SECRET", component: "secret-binding", code: "SECRET_BINDING_MISSING", message: `Secretbinding voor ${binding.key} ontbreekt.`, contract, nextAction: "Provision de bestaande secret via de goedgekeurde secret-boundary.", retrySafe: true, metadata: { key: binding.key, binding: binding.binding } });
    if (actual.owner !== binding.owner || String(actual.mode) !== String(binding.mode) || actual.readableByRunner !== true) {
      fail({ stage: "INSPECTING", className: "SECRET", component: "secret-binding", code: "SECRET_PERMISSION_MISMATCH", message: `Secretbinding voor ${binding.key} heeft ongeldige owner/mode/runtime-toegang.`, contract, nextAction: "Herstel uitsluitend de geautoriseerde secret-permissions en voer inspect opnieuw uit.", retrySafe: true, metadata: { key: binding.key, expectedOwner: binding.owner, expectedMode: binding.mode, actualOwner: actual.owner, actualMode: actual.mode, readableByRunner: actual.readableByRunner } });
    }
  }
  return Object.freeze({ status: "PASS", bindings: publicBindings, resolved });
}

function comparableObject(object) {
  if (!object) return null;
  return {
    type: object.type ?? "TABLE",
    name: object.name,
    columns: [...(object.columns ?? [])].map(({ name, type, nullable }) => ({ name, type: String(type).toLowerCase(), nullable: nullable === true })).sort((a, b) => a.name.localeCompare(b.name)),
    primaryKey: [...(object.primaryKey ?? [])],
    indexes: [...(object.indexes ?? [])].map(({ name, unique, fulltext, columns }) => ({ name, unique: unique === true, fulltext: fulltext === true, columns: [...columns] })).sort((a, b) => a.name.localeCompare(b.name)),
    checks: [...(object.checks ?? [])].map((check) => String(check).replace(/\s+/gu, " ").trim()).sort(),
    engine: object.engine ? String(object.engine).toUpperCase() : null,
    charset: object.charset ? String(object.charset).toLowerCase() : null,
    collation: object.collation ? String(object.collation).toLowerCase() : null,
  };
}

export function schemaObjectMatches(expected, actual) {
  const wanted = comparableObject(expected);
  const found = comparableObject(actual);
  if (!found) return false;
  const normalizeType = (value) => String(value).replace(/\b(tinyint|smallint|mediumint|int|bigint)\(\d+\)/giu, "$1").replace(/\s+/gu, " ").trim();
  const normalizeCheck = (value) => String(value).toLowerCase().replaceAll("`", "").replace(/[()]/gu, "").replace(/\s+/gu, " ").trim();
  if (wanted.type !== found.type || wanted.name !== found.name || wanted.engine !== found.engine || wanted.charset !== found.charset || wanted.collation !== found.collation) return false;
  if (wanted.columns.length !== found.columns.length) return false;
  for (let index = 0; index < wanted.columns.length; index += 1) {
    if (wanted.columns[index].name !== found.columns[index].name || normalizeType(wanted.columns[index].type) !== normalizeType(found.columns[index].type) || wanted.columns[index].nullable !== found.columns[index].nullable) return false;
  }
  if (canonicalJson(wanted.primaryKey) !== canonicalJson(found.primaryKey) || canonicalJson(wanted.indexes) !== canonicalJson(found.indexes)) return false;
  const foundChecks = new Set(found.checks.map(normalizeCheck));
  return wanted.checks.every((check) => foundChecks.has(normalizeCheck(check)));
}

export function createPureSchemaInspectionQueries(databaseName, objectNames, migrationComponent) {
  const names = [...new Set(objectNames)];
  const placeholders = names.map(() => "?").join(", ") || "NULL";
  return Object.freeze({
    ledger: { sql: "SELECT component, version, name, checksum, applied_at FROM wbd_schema_migrations WHERE component = ? ORDER BY version", params: [migrationComponent] },
    tables: { sql: `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`, params: [databaseName, ...names] },
    columns: { sql: `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, ORDINAL_POSITION`, params: [databaseName, ...names] },
    indexes: { sql: `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE, COLUMN_NAME, SUB_PART, SEQ_IN_INDEX FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, params: [databaseName, ...names] },
    checks: { sql: `SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA = ? AND tc.TABLE_NAME IN (${placeholders}) AND tc.CONSTRAINT_TYPE = 'CHECK'`, params: [databaseName, ...names] },
  });
}

export function assertPureReadOnlyInspectionQueries(queries) {
  for (const [name, query] of Object.entries(queries)) {
    const text = String(query?.sql ?? "").replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/--[^\r\n]*/gu, " ").trim();
    if (!/^(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/iu.test(text) || /\b(CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|REPLACE|RENAME|GRANT|REVOKE|CALL|SET)\b/iu.test(text)) {
      throw new Error(`Schema inspector query ${name} is niet puur read-only.`);
    }
  }
  return true;
}

export function inspectMigrationState(databaseContract, actual) {
  const ledger = new Map((actual.ledger ?? []).map((entry) => [String(entry.id ?? entry.version), entry]));
  const objects = new Map((actual.objects ?? []).map((object) => [object.name, object]));
  const results = [];
  if (databaseContract.migrations.length > 0 && actual.ledgerPresent === false) {
    results.push({ kind: "ledger", name: "wbd_schema_migrations", status: "SCHEMA_MISSING" });
  }
  for (const required of databaseContract.requirements) {
    const found = objects.get(required.name);
    if (!found) results.push({ kind: "requirement", name: required.name, status: "SCHEMA_MISSING" });
    else if (!schemaObjectMatches(required, found)) results.push({ kind: "requirement", name: required.name, status: "SCHEMA_COLLISION" });
    else results.push({ kind: "requirement", name: required.name, status: "PRESENT" });
  }
  for (const migration of databaseContract.migrations) {
    const recorded = ledger.get(migration.id);
    const targetMatches = migration.targetState.map((expected) => ({ name: expected.name, exists: objects.has(expected.name), matches: schemaObjectMatches(expected, objects.get(expected.name)) }));
    let status;
    if (recorded) {
      if (recorded.checksum !== migration.checksum) status = "LEDGER_CHECKSUM_MISMATCH";
      else if (recorded.name && recorded.name !== migration.file.split("/").at(-1)) status = "LEDGER_NAME_MISMATCH";
      else if (targetMatches.every((target) => target.matches)) status = "APPLIED";
      else status = "LEDGER_SCHEMA_MISMATCH";
    } else if (targetMatches.every((target) => !target.exists)) status = "PENDING";
    else if (targetMatches.every((target) => target.matches)) status = "UNLEDGERED_SCHEMA";
    else status = "PARTIAL_OR_COLLIDING_SCHEMA";
    results.push({ kind: "migration", id: migration.id, checksum: migration.checksum, classification: migration.classification, status, targetMatches });
  }
  const blocking = results.filter((result) => ["SCHEMA_MISSING", "SCHEMA_COLLISION", "LEDGER_CHECKSUM_MISMATCH", "LEDGER_NAME_MISMATCH", "LEDGER_SCHEMA_MISMATCH", "UNLEDGERED_SCHEMA", "PARTIAL_OR_COLLIDING_SCHEMA"].includes(result.status));
  return Object.freeze({ database: databaseContract.id, results, pending: results.filter((result) => result.status === "PENDING").map((result) => result.id), blocking });
}

export function buildMigrationPlan(contract, inspections) {
  const steps = [];
  for (const database of contract.databases) {
    const inspection = inspections.find((item) => item.database === database.id);
    if (!inspection) fail({ stage: "INSPECTING", className: "SCHEMA_MISSING", component: `database:${database.id}`, code: "DATABASE_INSPECTION_MISSING", message: `Schema-inspectie voor ${database.id} ontbreekt.`, contract, nextAction: "Herhaal pure read-only schema-inspectie.", retrySafe: true });
    if (inspection.blocking.length) fail({ stage: "INSPECTING", className: "SCHEMA_COLLISION", component: `database:${database.id}`, code: "SCHEMA_STATE_INCOMPATIBLE", message: `Echte schema-state van ${database.id} wijkt af van contract.`, contract, nextAction: "Beoordeel schema collision; registreer nooit stilzwijgend een ledger entry.", retrySafe: false, metadata: { blocking: inspection.blocking } });
    for (const id of inspection.pending) {
      const migration = database.migrations.find((item) => item.id === id);
      if (migration.classification === "DESTRUCTIVE") fail({ stage: "INSPECTING", className: "MIGRATION", component: `database:${database.id}`, code: "DESTRUCTIVE_MIGRATION_REQUIRES_MATERIAL_GO", message: `Migration ${id} is destructief en valt buiten normale release-GO.`, contract, nextAction: "Maak een aparte recovery- en material-impactbeslissing.", retrySafe: false });
      if (!migration.compatibleWithActive) fail({ stage: "INSPECTING", className: "MIGRATION", component: `database:${database.id}`, code: "MIGRATION_NOT_BACKWARD_COMPATIBLE", message: `Migration ${id} is niet compatibel met de actieve release.`, contract, nextAction: "Gebruik een expliciet zero-downtime of maintenance-contract.", retrySafe: false });
      steps.push({ database: database.id, migrationId: id, checksum: migration.checksum, file: migration.file, transactional: migration.transactional, idempotent: migration.idempotent, lockRisk: migration.lockRisk, recoveryPolicy: migration.recoveryPolicy });
    }
  }
  return Object.freeze({ steps, risk: steps.length ? "LOW_ADDITIVE" : "NONE", requiresMaterialGo: false });
}

export function inspectRecoveryReadiness(contract, recovery, now = Date.now()) {
  const maxBackupAge = contract.prepare.backupMaxAgeSeconds * 1_000;
  const maxRestoreAge = contract.prepare.restoreEvidenceMaxAgeSeconds * 1_000;
  const backupAge = now - Date.parse(String(recovery?.backup?.createdAt ?? ""));
  const restoreAge = now - Date.parse(String(recovery?.restoreEvidence?.verifiedAt ?? ""));
  const requiredScopes = new Set(contract.databases.map((database) => database.id));
  const availableScopes = new Set(recovery?.backup?.scopes ?? []);
  const missingScopes = [...requiredScopes].filter((scope) => !availableScopes.has(scope));
  const backupReady = recovery?.backup?.exists === true && recovery?.backup?.checksumValid === true && backupAge >= 0 && backupAge <= maxBackupAge && missingScopes.length === 0;
  const restoreReady = recovery?.restoreEvidence?.passed === true && restoreAge >= 0 && restoreAge <= maxRestoreAge && recovery?.restoreEntrypoint?.available === true;
  return Object.freeze({ ready: backupReady && restoreReady, backupReady, restoreReady, backupAgeMs: Number.isFinite(backupAge) ? backupAge : null, restoreAgeMs: Number.isFinite(restoreAge) ? restoreAge : null, missingScopes });
}

export function createLockedDeployPlan({ contract, active, artifact, environment, migrations, recovery, stagedRelease, schemaSnapshotHash, safetyCounters = null, createdAt = new Date().toISOString() }) {
  const unsigned = {
    schemaVersion: 1,
    releaseId: contract.releaseId,
    contractHash: contract.contractHash,
    tenant: contract.tenant,
    application: contract.application,
    candidateCommit: contract.commit,
    expectedBaseline: contract.expectedBaseline,
    observedBaseline: { releaseId: active.releaseId, commit: active.commit },
    artifact: { sha256: artifact.sha256, manifestSha256: artifact.manifestSha256, stagedRelease },
    environment: { bindings: environment.bindings, contractHash: sha256(canonicalJson(contract.environment)) },
    migrations,
    recovery: { backupId: recovery.backup.id, backupSha256: recovery.backup.sha256, restoreEvidenceId: recovery.restoreEvidence.id },
    schemaSnapshotHash,
    safetyCounters,
    activation: contract.activation,
    rollback: contract.rollback,
    featureExposure: contract.featureExposure,
    createdAt,
  };
  return Object.freeze({ ...unsigned, planHash: sha256(canonicalJson(unsigned)) });
}

export function verifyLockedDeployPlan(plan, contract) {
  const { planHash, ...unsigned } = plan ?? {};
  if (plan?.releaseId !== contract.releaseId || plan?.contractHash !== contract.contractHash || sha256(canonicalJson(unsigned)) !== planHash) {
    fail({ stage: "ACTIVATING", className: "ARTIFACT", component: "deploy-plan", code: "DEPLOY_PLAN_TAMPERED", message: "Checksum-locked deployplan wijkt af.", contract, nextAction: "Prepare opnieuw vanuit hetzelfde immutable contract.", retrySafe: false });
  }
  return true;
}
