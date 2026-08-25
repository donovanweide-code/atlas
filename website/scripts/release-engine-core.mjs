import { createHash } from "node:crypto";

export const RELEASE_STATES = Object.freeze([
  "CANDIDATE",
  "INSPECTING",
  "BLOCKED",
  "PREPARED",
  "AWAITING_HUMAN_GO",
  "ACTIVATING",
  "VERIFYING",
  "LIVE",
  "ROLLING_BACK",
  "ROLLED_BACK",
]);

export const RELEASE_ERROR_CLASSES = Object.freeze([
  "AUTH", "PERMISSION", "NETWORK", "SSH_TRANSPORT", "ARTIFACT", "BASELINE_DRIFT",
  "ENVIRONMENT", "ENVIRONMENT_LOCK", "CONCURRENT_RELEASE", "SECRET", "DATABASE_CONNECTIVITY", "SCHEMA_MISSING", "SCHEMA_COLLISION",
  "MIGRATION", "RUNTIME", "RESTART", "READINESS", "SMOKE", "AUDIT", "ROLLBACK",
]);

const transitionTargets = Object.freeze({
  CANDIDATE: new Set(["INSPECTING", "BLOCKED"]),
  INSPECTING: new Set(["BLOCKED", "PREPARED"]),
  BLOCKED: new Set(["INSPECTING"]),
  PREPARED: new Set(["AWAITING_HUMAN_GO", "BLOCKED"]),
  AWAITING_HUMAN_GO: new Set(["ACTIVATING", "BLOCKED"]),
  ACTIVATING: new Set(["VERIFYING", "ROLLING_BACK", "BLOCKED"]),
  VERIFYING: new Set(["LIVE", "ROLLING_BACK"]),
  LIVE: new Set(),
  ROLLING_BACK: new Set(["ROLLED_BACK", "BLOCKED"]),
  ROLLED_BACK: new Set(),
});

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const allowedSwitchStrategies = new Set(["atomic-symlink"]);
const allowedRestartStrategies = new Set(["single"]);
const allowedMigrationClassifications = new Set(["ADDITIVE", "DESTRUCTIVE"]);
const allowedFeatureDefaults = new Set(["OFF", "ON"]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireString(value, name, pattern) {
  const result = String(value ?? "").trim();
  if (!result || (pattern && !pattern.test(result))) throw new Error(`${name} ontbreekt of is ongeldig.`);
  return result;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} moet een array zijn.`);
  return value;
}

function unique(values, name) {
  if (new Set(values).size !== values.length) throw new Error(`${name} bevat duplicaten.`);
}

function assertSafeRelativePath(value, name) {
  const path = requireString(value, name);
  if (path.startsWith("/") || path.startsWith("\\") || path.includes("..") || path.includes("\0")) {
    throw new Error(`${name} bevat een onveilig pad.`);
  }
  return path.replaceAll("\\", "/");
}

function validateReadOnlyQuery(query, name) {
  const normalized = requireString(query, name).replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/--[^\r\n]*/gu, " ").trim();
  if (!/^(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/iu.test(normalized)
    || /\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE|CALL|DO|HANDLER|LOAD|LOCK|UNLOCK|SET)\b/iu.test(normalized)
    || normalized.replace(/;\s*$/u, "").includes(";")) {
    throw new Error(`${name} is niet aantoonbaar read-only.`);
  }
  return normalized;
}

function normalizeEnvironment(environment = {}) {
  const required = requireArray(environment.required ?? [], "environment.required").map((entry, index) => {
    const key = requireString(entry?.key, `environment.required[${index}].key`, /^[A-Z][A-Z0-9_]*$/u);
    const aliases = requireArray(entry?.aliases ?? [], `environment.required[${index}].aliases`)
      .map((alias) => requireString(alias, `${key}.alias`, /^[A-Z][A-Z0-9_]*$/u));
    unique([key, ...aliases], `${key} aliases`);
    return Object.freeze({ key, aliases, secret: entry?.secret === true, required: entry?.required !== false });
  });
  unique(required.map((entry) => entry.key), "environment.required keys");
  const secretBindings = requireArray(environment.secretBindings ?? [], "environment.secretBindings").map((entry, index) => ({
    key: requireString(entry?.key, `environment.secretBindings[${index}].key`, /^[A-Z][A-Z0-9_]*$/u),
    binding: requireString(entry?.binding, `environment.secretBindings[${index}].binding`),
    owner: requireString(entry?.owner, `environment.secretBindings[${index}].owner`),
    mode: requireString(entry?.mode, `environment.secretBindings[${index}].mode`, /^0?[0-7]{3,4}$/u),
  }));
  unique(secretBindings.map((entry) => entry.key), "secret bindings");
  return Object.freeze({ required, secretBindings });
}

function normalizeSchemaObject(object, name) {
  const columns = requireArray(object?.columns, `${name}.columns`).map((column, index) => ({
    name: requireString(column?.name, `${name}.columns[${index}].name`, /^[A-Za-z_][A-Za-z0-9_]*$/u),
    type: requireString(column?.type, `${name}.columns[${index}].type`).toLowerCase(),
    nullable: column?.nullable === true,
  }));
  unique(columns.map((column) => column.name), `${name}.columns`);
  const indexes = requireArray(object?.indexes ?? [], `${name}.indexes`).map((index, position) => ({
    name: requireString(index?.name, `${name}.indexes[${position}].name`),
    unique: index?.unique === true,
    fulltext: index?.fulltext === true,
    columns: requireArray(index?.columns, `${name}.indexes[${position}].columns`).map((column) => requireString(column, "index column")),
  }));
  unique(indexes.map((index) => index.name), `${name}.indexes`);
  return Object.freeze({
    type: object?.type === "VIEW" ? "VIEW" : "TABLE",
    name: requireString(object?.name, `${name}.name`, /^[A-Za-z_][A-Za-z0-9_]*$/u),
    columns,
    primaryKey: requireArray(object?.primaryKey ?? [], `${name}.primaryKey`).map((column) => requireString(column, "primary key column")),
    indexes,
    checks: requireArray(object?.checks ?? [], `${name}.checks`).map((check) => requireString(check, "check constraint")),
    engine: object?.engine ? requireString(object.engine, `${name}.engine`).toUpperCase() : null,
    charset: object?.charset ? requireString(object.charset, `${name}.charset`).toLowerCase() : null,
    collation: object?.collation ? requireString(object.collation, `${name}.collation`).toLowerCase() : null,
  });
}

function normalizeMigration(migration, name) {
  const classification = requireString(migration?.classification, `${name}.classification`).toUpperCase();
  if (!allowedMigrationClassifications.has(classification)) throw new Error(`${name}.classification is ongeldig.`);
  return Object.freeze({
    id: requireString(migration?.id, `${name}.id`, idPattern),
    file: assertSafeRelativePath(migration?.file, `${name}.file`),
    checksum: requireString(migration?.checksum, `${name}.checksum`, shaPattern),
    classification,
    compatibleWithActive: migration?.compatibleWithActive === true,
    idempotent: migration?.idempotent === true,
    transactional: migration?.transactional === true,
    lockRisk: requireString(migration?.lockRisk, `${name}.lockRisk`),
    expectedPriorState: requireArray(migration?.expectedPriorState ?? [], `${name}.expectedPriorState`).map((object, index) => normalizeSchemaObject(object, `${name}.expectedPriorState[${index}]`)),
    targetState: requireArray(migration?.targetState, `${name}.targetState`).map((object, index) => normalizeSchemaObject(object, `${name}.targetState[${index}]`)),
    verificationQueries: requireArray(migration?.verificationQueries, `${name}.verificationQueries`).map((query, index) => validateReadOnlyQuery(query, `${name}.verificationQueries[${index}]`)),
    recoveryPolicy: requireString(migration?.recoveryPolicy, `${name}.recoveryPolicy`),
  });
}

export function validateReleaseContract(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Releasecontract moet een object zijn.");
  if (input.schemaVersion !== 1) throw new Error("Alleen releasecontract schemaVersion 1 wordt ondersteund.");
  const databases = requireArray(input.databases ?? [], "databases").map((database, index) => {
    const migrations = requireArray(database?.migrations ?? [], `databases[${index}].migrations`)
      .map((migration, migrationIndex) => normalizeMigration(migration, `databases[${index}].migrations[${migrationIndex}]`));
    unique(migrations.map((migration) => migration.id), `databases[${index}].migrations`);
    return Object.freeze({
      id: requireString(database?.id, `databases[${index}].id`, idPattern),
      environmentPrefix: requireString(database?.environmentPrefix, `databases[${index}].environmentPrefix`, /^[A-Z][A-Z0-9_]*$/u),
      migrationComponent: requireString(database?.migrationComponent, `databases[${index}].migrationComponent`, idPattern),
      requirements: requireArray(database?.requirements ?? [], `databases[${index}].requirements`).map((object, objectIndex) => normalizeSchemaObject(object, `databases[${index}].requirements[${objectIndex}]`)),
      migrations,
    });
  });
  unique(databases.map((database) => database.id), "databases");

  const switchStrategy = requireString(input.activation?.switchStrategy, "activation.switchStrategy");
  const restartStrategy = requireString(input.activation?.restart?.strategy, "activation.restart.strategy");
  if (!allowedSwitchStrategies.has(switchStrategy)) throw new Error("activation.switchStrategy is niet geallowlist.");
  if (!allowedRestartStrategies.has(restartStrategy)) throw new Error("activation.restart.strategy is niet geallowlist.");
  const featureDefault = requireString(input.featureExposure?.default ?? "OFF", "featureExposure.default").toUpperCase();
  if (!allowedFeatureDefaults.has(featureDefault)) throw new Error("featureExposure.default is ongeldig.");
  const compatibilityMode = requireString(input.compatibilityPolicy?.mode, "compatibilityPolicy.mode");
  if (compatibilityMode !== "forward-only") throw new Error("Alleen forward-only compatibility wordt ondersteund.");

  const normalized = Object.freeze({
    schemaVersion: 1,
    releaseId: requireString(input.releaseId, "releaseId", idPattern),
    tenant: requireString(input.tenant, "tenant", idPattern),
    application: requireString(input.application, "application", idPattern),
    changeScope: Object.freeze({
      components: requireArray(input.changeScope?.components, "changeScope.components").map((component) => requireString(component, "changeScope component", idPattern)),
      otherTenantImpact: requireString(input.changeScope?.otherTenantImpact, "changeScope.otherTenantImpact"),
    }),
    commit: requireString(input.commit, "commit", commitPattern),
    tag: requireString(input.tag, "tag", idPattern),
    artifact: Object.freeze({
      path: assertSafeRelativePath(input.artifact?.path, "artifact.path"),
      sha256: requireString(input.artifact?.sha256, "artifact.sha256", shaPattern),
      manifestPath: assertSafeRelativePath(input.artifact?.manifestPath, "artifact.manifestPath"),
      manifestSha256: requireString(input.artifact?.manifestSha256, "artifact.manifestSha256", shaPattern),
    }),
    expectedBaseline: Object.freeze({
      releaseId: requireString(input.expectedBaseline?.releaseId, "expectedBaseline.releaseId", idPattern),
      commit: requireString(input.expectedBaseline?.commit, "expectedBaseline.commit", commitPattern),
    }),
    compatibilityPolicy: Object.freeze({
      mode: compatibilityMode,
      baselineMustBeAncestor: input.compatibilityPolicy?.baselineMustBeAncestor === true,
      proof: Object.freeze({
        type: requireString(input.compatibilityPolicy?.proof?.type, "compatibilityPolicy.proof.type"),
        baselineCommit: requireString(input.compatibilityPolicy?.proof?.baselineCommit, "compatibilityPolicy.proof.baselineCommit", commitPattern),
      }),
    }),
    requiredRuntimeVersion: requireString(input.requiredRuntimeVersion, "requiredRuntimeVersion"),
    environment: normalizeEnvironment(input.environment),
    databases,
    prepare: Object.freeze({
      autoBackup: input.prepare?.autoBackup === true,
      backupMaxAgeSeconds: Number(input.prepare?.backupMaxAgeSeconds ?? 86_400),
      restoreEvidenceMaxAgeSeconds: Number(input.prepare?.restoreEvidenceMaxAgeSeconds ?? 2_678_400),
      schemaSnapshot: input.prepare?.schemaSnapshot !== false,
    }),
    activation: Object.freeze({
      switchStrategy,
      restart: Object.freeze({ strategy: restartStrategy, service: requireString(input.activation?.restart?.service, "activation.restart.service", idPattern) }),
      readinessChecks: requireArray(input.activation?.readinessChecks, "activation.readinessChecks").map((id) => requireString(id, "readiness adapter", idPattern)),
      smokeSuite: requireArray(input.activation?.smokeSuite, "activation.smokeSuite").map((id) => requireString(id, "smoke adapter", idPattern)),
      oldReleasePostMigrationSmokes: requireArray(input.activation?.oldReleasePostMigrationSmokes ?? [], "activation.oldReleasePostMigrationSmokes").map((id) => requireString(id, "old release smoke adapter", idPattern)),
    }),
    rollback: Object.freeze({
      targetReleaseId: requireString(input.rollback?.targetReleaseId, "rollback.targetReleaseId", idPattern),
      automaticAfterSwitch: input.rollback?.automaticAfterSwitch === true,
      smokeSuite: requireArray(input.rollback?.smokeSuite, "rollback.smokeSuite").map((id) => requireString(id, "rollback smoke adapter", idPattern)),
    }),
    postDeployEvidence: requireArray(input.postDeployEvidence, "postDeployEvidence").map((id) => requireString(id, "postDeployEvidence", idPattern)),
    featureExposure: Object.freeze({ default: featureDefault, killSwitch: requireString(input.featureExposure?.killSwitch, "featureExposure.killSwitch", /^[A-Z][A-Z0-9_]*$/u) }),
  });
  if (!Number.isFinite(normalized.prepare.backupMaxAgeSeconds) || normalized.prepare.backupMaxAgeSeconds <= 0) throw new Error("backupMaxAgeSeconds is ongeldig.");
  if (!Number.isFinite(normalized.prepare.restoreEvidenceMaxAgeSeconds) || normalized.prepare.restoreEvidenceMaxAgeSeconds <= 0) throw new Error("restoreEvidenceMaxAgeSeconds is ongeldig.");
  unique(normalized.changeScope.components, "changeScope.components");
  return Object.freeze({ ...normalized, contractHash: sha256(canonicalJson(normalized)) });
}

const sensitiveKey = /(password|secret|token|private|credential|authorization|cookie|dsn|key$)/iu;
const secretLike = /(mysql|mariadb|postgres(?:ql)?):\/\/[^\s]+|-----BEGIN [^-]+ PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\b(password|secret|token|private[_-]?key)\s*[=:]\s*\S+/giu;

export function sanitizeDiagnostic(value, key = "") {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (typeof value === "string") return value.replace(secretLike, "[REDACTED]").slice(0, 4_000);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeDiagnostic(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitizeDiagnostic(child, childKey)]));
  return value;
}

export class ReleaseEngineError extends Error {
  constructor({ stage, className, component, code, message, candidate, activeRelease, nextAction, retrySafe = false, metadata = {} }) {
    super(String(message ?? "Release Engine failure"));
    this.name = "ReleaseEngineError";
    if (!RELEASE_ERROR_CLASSES.includes(className)) throw new Error(`Onbekende release error class: ${className}`);
    this.diagnostic = Object.freeze(sanitizeDiagnostic({
      stage, class: className, component, code, message: this.message, candidate, activeRelease,
      recommendedNextAction: nextAction, retrySafe: retrySafe === true, metadata,
    }));
  }
}

export function classifyReleaseError(error, context = {}) {
  if (error instanceof ReleaseEngineError) return error;
  const code = String(error?.code ?? error?.errno ?? "UNKNOWN");
  const message = String(error?.message ?? error ?? "Unknown release error");
  let className = context.className ?? "RUNTIME";
  if (/ACCESS_DENIED|ER_ACCESS_DENIED|authentication/iu.test(`${code} ${message}`)) className = "AUTH";
  else if (/EACCES|EPERM|permission/iu.test(`${code} ${message}`)) className = "PERMISSION";
  else if (/ECONN|ETIMEDOUT|ENOTFOUND|network/iu.test(`${code} ${message}`)) className = context.component?.includes("database") ? "DATABASE_CONNECTIVITY" : "NETWORK";
  else if (/checksum|artifact|manifest/iu.test(message)) className = "ARTIFACT";
  else if (/schema|table|column|index/iu.test(message)) className = "SCHEMA_COLLISION";
  return new ReleaseEngineError({
    stage: context.stage ?? "UNKNOWN", className, component: context.component ?? "release-engine",
    code, message, candidate: context.candidate, activeRelease: context.activeRelease,
    nextAction: context.nextAction ?? "Inspecteer de gestructureerde diagnostics en herstel alleen de genoemde boundary.",
    retrySafe: context.retrySafe === true,
    metadata: { name: error?.name, errno: error?.errno, sqlState: error?.sqlState, ...(context.metadata ?? {}) },
  });
}

export function assertTransition(from, to) {
  if (!RELEASE_STATES.includes(from) || !RELEASE_STATES.includes(to) || !transitionTargets[from]?.has(to)) {
    throw new ReleaseEngineError({ stage: "STATE", className: "AUDIT", component: "state-machine", code: "INVALID_TRANSITION", message: `Ongeldige release-overgang ${from} -> ${to}.`, nextAction: "Herstel de release-state vanuit de append-only audit trail.", retrySafe: false });
  }
}

export function createAuditEvent({ previous = null, state, type, releaseId, tenant, application, actor, details = {}, idempotencyKey, at = new Date().toISOString() }) {
  if (!RELEASE_STATES.includes(state)) throw new Error("Ongeldige audit-state.");
  const event = {
    sequence: Number(previous?.sequence ?? 0) + 1,
    at,
    state,
    type: requireString(type, "event.type", idPattern),
    releaseId: requireString(releaseId, "event.releaseId", idPattern),
    tenant: requireString(tenant, "event.tenant", idPattern),
    application: requireString(application, "event.application", idPattern),
    actor: requireString(actor, "event.actor", idPattern),
    idempotencyKey: requireString(idempotencyKey, "event.idempotencyKey", idPattern),
    details: sanitizeDiagnostic(details),
    previousHash: previous?.eventHash ?? null,
  };
  return Object.freeze({ ...event, eventHash: sha256(canonicalJson(event)) });
}

export function verifyAuditChain(events) {
  let previous = null;
  const idempotencyKeys = new Set();
  for (const event of events) {
    if (event.sequence !== Number(previous?.sequence ?? 0) + 1 || event.previousHash !== (previous?.eventHash ?? null)) throw new Error("Audit chain sequence/hash-link wijkt af.");
    const { eventHash, ...unsigned } = event;
    if (sha256(canonicalJson(unsigned)) !== eventHash) throw new Error("Audit event hash wijkt af.");
    if (idempotencyKeys.has(event.idempotencyKey)) throw new Error("Audit idempotency-key is herhaald.");
    idempotencyKeys.add(event.idempotencyKey);
    previous = event;
  }
  return { valid: true, current: previous ?? null };
}
