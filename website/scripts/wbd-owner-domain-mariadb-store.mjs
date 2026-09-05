import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import { validateWbdOwnerState } from "./wbd-owner-foundation.mjs";
import {
  assertWbdOwnerDomainPayload,
  composeWbdOwnerState,
  createLazyWbdOwnerStateDraft,
  immutableWbdOwnerDomain,
  partitionWbdOwnerState,
  sha256WbdOwnerCanonicalJson,
  validateIncrementalWbdOwnerState,
  WBD_OWNER_DOMAIN_CONTRACT_VERSION,
  WBD_OWNER_ORGANIZATION_ID,
  WBD_OWNER_STATE_DOMAINS,
  wbdOwnerDomainForStateKey,
} from "./wbd-owner-domain-state.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationFile = path.resolve(scriptDirectory, "..", "sportpaleis-server", "production-migrations", "workspace", "008-wbd-owner-domain-state.sql");
const MIGRATION_COMPONENT = "sportpaleis-runtime-state";
const REQUIRED_MIGRATION_VERSION = 8;

function databaseOptions(config) {
  return {
    host: config.host, port: config.port, database: config.name, user: config.user, password: config.password,
    connectionLimit: config.connectionLimit ?? 6, acquireTimeout: config.acquireTimeoutMs ?? 5_000,
    connectTimeout: config.connectTimeoutMs ?? 5_000, idleTimeout: 30, bigIntAsNumber: true,
    insertIdAsNumber: true, timezone: "Z", charset: "utf8mb4", multipleStatements: false,
  };
}

function jsonValue(value) {
  if (typeof value === "string") return JSON.parse(value);
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString("utf8"));
  return value;
}

function databaseTimestamp(value) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) throw new WbdOwnerDomainMariaDbStoreError("Owner-audittijd is ongeldig.", "OWNER_AUDIT_TIMESTAMP_INVALID");
  return timestamp;
}

function storedDomainPayload(domain, payload) {
  if (domain !== "audit") return payload;
  const { audit: _audit, ...rest } = payload;
  return rest;
}

function changedAuditEvents(previous, next) {
  const nextById = new Map(next.map((event) => [event.id, event]));
  if (previous.some(({ id }) => !nextById.has(id))) throw new WbdOwnerDomainMariaDbStoreError("Owner-audit mag niet worden verwijderd.", "OWNER_AUDIT_IMMUTABILITY_VIOLATION");
  for (const event of previous) {
    if (sha256WbdOwnerCanonicalJson(event) !== sha256WbdOwnerCanonicalJson(nextById.get(event.id))) {
      throw new WbdOwnerDomainMariaDbStoreError("Owner-audit mag niet worden gewijzigd.", "OWNER_AUDIT_IMMUTABILITY_VIOLATION");
    }
  }
  const previousIds = new Set(previous.map(({ id }) => id));
  return next.filter(({ id }) => !previousIds.has(id));
}

function createMetrics() {
  return { revisionQueries: 0, domainLoads: 0, decodedBytes: 0, cacheHits: 0, cacheMisses: 0, mutations: 0, domainWrites: 0, auditAppends: 0, clonedKeys: 0, fullLegacyLoads: 0, transactionHoldMsTotal: 0, transactionHoldMsMax: 0 };
}

export class WbdOwnerDomainMariaDbStoreError extends Error {
  constructor(message, code = "WBD_OWNER_DOMAIN_DATABASE_ERROR", cause) {
    super(message, { cause });
    this.name = "WbdOwnerDomainMariaDbStoreError";
    this.code = code;
  }
}

export class WbdOwnerDomainMariaDbStore {
  constructor({ database, pool, migrationFile = defaultMigrationFile }) {
    if (!pool && !database) throw new WbdOwnerDomainMariaDbStoreError("Workspace MariaDB-configuratie ontbreekt.", "DATABASE_CONFIG_MISSING");
    this.pool = pool ?? mariadb.createPool(databaseOptions(database));
    this.ownsPool = !pool;
    this.migrationFile = path.resolve(migrationFile);
    this.snapshot = null;
    this.globalRevision = null;
    this.domainRevisions = new Map();
    this.refreshPromise = null;
    this.metrics = createMetrics();
  }

  async initialize() {
    await this.#assertMigration();
    const meta = await this.pool.query("SELECT global_revision, contract_version FROM wbd_owner_domain_meta WHERE organization_id = ?", [WBD_OWNER_ORGANIZATION_ID]);
    if (meta.length !== 1) throw new WbdOwnerDomainMariaDbStoreError("Offline WBD-owner domeinbackfill ontbreekt; runtime-start muteert de legacybron nooit.", "OWNER_DOMAIN_BACKFILL_REQUIRED");
    if (Number(meta[0].contract_version) !== WBD_OWNER_DOMAIN_CONTRACT_VERSION) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeincontract is incompatibel.", "OWNER_DOMAIN_CONTRACT_MISMATCH");
    await this.#refresh(true);
  }

  async backfillLegacySource() {
    await this.#assertMigration();
    const existing = await this.pool.query("SELECT global_revision, legacy_source_revision, contract_version FROM wbd_owner_domain_meta WHERE organization_id = ?", [WBD_OWNER_ORGANIZATION_ID]);
    const sourceRows = await this.pool.query("SELECT revision, state_json FROM wbd_owner_state WHERE organization_id = ?", [WBD_OWNER_ORGANIZATION_ID]);
    if (sourceRows.length !== 1) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner legacybron ontbreekt.", "DATABASE_STATE_MISSING");
    if (existing.length === 1) {
      if (Number(existing[0].legacy_source_revision) !== Number(sourceRows[0].revision)) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner legacybron wijzigde na backfill.", "OWNER_DOMAIN_BACKFILL_SOURCE_DRIFT");
      const evidence = await this.pool.query("SELECT legacy_sha256, composed_sha256, status FROM wbd_owner_domain_reconciliation WHERE organization_id = ? AND legacy_revision = ? AND contract_version = ?", [WBD_OWNER_ORGANIZATION_ID, sourceRows[0].revision, WBD_OWNER_DOMAIN_CONTRACT_VERSION]);
      if (evidence.length !== 1 || evidence[0].status !== "MATCH" || evidence[0].legacy_sha256 !== evidence[0].composed_sha256) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner backfillbewijs is ongeldig.", "OWNER_DOMAIN_BACKFILL_EVIDENCE_INVALID");
      return Object.freeze({ status: "ALREADY_BACKFILLED", globalRevision: Number(existing[0].global_revision), legacySha256: evidence[0].legacy_sha256, composedSha256: evidence[0].composed_sha256 });
    }
    const legacy = validateWbdOwnerState(jsonValue(sourceRows[0].state_json));
    this.metrics.fullLegacyLoads += 1;
    const domains = partitionWbdOwnerState(legacy);
    const legacySha256 = sha256WbdOwnerCanonicalJson(legacy);
    const composedSha256 = sha256WbdOwnerCanonicalJson(composeWbdOwnerState({ ...domains, audit: { audit: legacy.audit } }));
    if (legacySha256 !== composedSha256) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner backfill wijkt af van de legacybron.", "OWNER_DOMAIN_BACKFILL_MISMATCH");
    const preparedDomains = Object.entries(domains).map(([domain, payload]) => {
      const stored = storedDomainPayload(domain, payload);
      const validation = assertWbdOwnerDomainPayload(domain, stored);
      return { domain, stored, validation };
    });
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const locked = await connection.query("SELECT revision FROM wbd_owner_state WHERE organization_id = ? FOR UPDATE", [WBD_OWNER_ORGANIZATION_ID]);
      if (locked.length !== 1 || Number(locked[0].revision) !== Number(sourceRows[0].revision)) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner legacybron wijzigde tijdens backfill.", "OWNER_DOMAIN_BACKFILL_SOURCE_DRIFT");
      const currentMeta = await connection.query("SELECT global_revision FROM wbd_owner_domain_meta WHERE organization_id = ? FOR UPDATE", [WBD_OWNER_ORGANIZATION_ID]);
      if (currentMeta.length) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner backfill is gelijktijdig al gestart.", "OWNER_DOMAIN_BACKFILL_CONFLICT");
      await connection.query("INSERT INTO wbd_owner_domain_meta (organization_id, schema_version, global_revision, legacy_source_revision, contract_version, cutover_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'DOMAIN_PRIMARY', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))", [WBD_OWNER_ORGANIZATION_ID, legacy.schemaVersion, legacy.revision, legacy.revision, WBD_OWNER_DOMAIN_CONTRACT_VERSION]);
      for (const { domain, stored, validation } of preparedDomains) await connection.query("INSERT INTO wbd_owner_domain_state (organization_id, domain_key, domain_revision, global_revision, payload_json, payload_sha256, updated_at) VALUES (?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(3))", [WBD_OWNER_ORGANIZATION_ID, domain, legacy.revision, JSON.stringify(stored), validation.sha256]);
      for (let ordinal = 0; ordinal < legacy.audit.length; ordinal += 1) {
        const event = legacy.audit[ordinal];
        await connection.query("INSERT INTO wbd_owner_audit_event (organization_id, event_id, ordinal, global_revision, event_json, event_sha256, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [WBD_OWNER_ORGANIZATION_ID, event.id, ordinal, legacy.revision, JSON.stringify(event), sha256WbdOwnerCanonicalJson(event), databaseTimestamp(event.occurredAt)]);
      }
      await connection.query("INSERT INTO wbd_owner_domain_reconciliation (organization_id, legacy_revision, contract_version, legacy_sha256, composed_sha256, status, verified_at) VALUES (?, ?, ?, ?, ?, 'MATCH', UTC_TIMESTAMP(3))", [WBD_OWNER_ORGANIZATION_ID, legacy.revision, WBD_OWNER_DOMAIN_CONTRACT_VERSION, legacySha256, composedSha256]);
      await connection.commit();
      return Object.freeze({ status: "BACKFILLED", globalRevision: legacy.revision, legacySha256, composedSha256 });
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause instanceof WbdOwnerDomainMariaDbStoreError) throw cause;
      throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinbackfill is mislukt.", "OWNER_DOMAIN_BACKFILL_FAILED", cause);
    } finally { connection.release(); }
  }

  async read() {
    await this.#refresh(false);
    return this.snapshot;
  }

  async mutate(mutator) {
    const base = await this.read();
    const copyOnWrite = createLazyWbdOwnerStateDraft(base);
    const result = await mutator(copyOnWrite.draft);
    if (result?.state !== copyOnWrite.draft) throw new WbdOwnerDomainMariaDbStoreError("Owner-mutator moet de begrensde copy-on-write state retourneren.", "OWNER_MUTATOR_REPLACED_STATE");
    const finalized = copyOnWrite.finalize();
    const changedKeys = [...finalized.changedKeys];
    if (changedKeys.length === 0) return { state: base, value: result.value };
    const validated = validateIncrementalWbdOwnerState(finalized.state, changedKeys);
    for (const [key, value] of validated) finalized.state[key] = value;
    const auditChanged = changedKeys.includes("audit");
    const appendedAudit = auditChanged ? changedAuditEvents(base.audit, finalized.state.audit) : [];
    const nextRevision = base.revision + 1;
    finalized.state.revision = nextRevision;
    const domains = partitionWbdOwnerState(finalized.state);
    const changedDomains = new Set([...finalized.changedDomains, "platform"]);
    const prepared = [...changedDomains].map((domain) => {
      const payload = storedDomainPayload(domain, domains[domain]);
      const validation = assertWbdOwnerDomainPayload(domain, payload);
      return { domain, payload, validation };
    });
    const connection = await this.#connection();
    const started = performance.now();
    try {
      await connection.beginTransaction();
      const meta = await connection.query("SELECT global_revision FROM wbd_owner_domain_meta WHERE organization_id = ? FOR UPDATE", [WBD_OWNER_ORGANIZATION_ID]);
      if (meta.length !== 1 || Number(meta[0].global_revision) !== base.revision) throw new WbdOwnerDomainMariaDbStoreError("Gelijktijdige WBD-owner wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      for (const { domain, payload, validation } of prepared) {
        const currentDomainRevision = Number(this.domainRevisions.get(domain) ?? 1);
        const update = await connection.query("UPDATE wbd_owner_domain_state SET domain_revision = ?, global_revision = ?, payload_json = ?, payload_sha256 = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND domain_key = ? AND domain_revision = ?", [currentDomainRevision + 1, nextRevision, JSON.stringify(payload), validation.sha256, WBD_OWNER_ORGANIZATION_ID, domain, currentDomainRevision]);
        if (Number(update.affectedRows) !== 1) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinrevisionconflict.", "DATABASE_CONCURRENCY_CONFLICT");
      }
      for (let index = 0; index < appendedAudit.length; index += 1) {
        const event = appendedAudit[index];
        await connection.query("INSERT INTO wbd_owner_audit_event (organization_id, event_id, ordinal, global_revision, event_json, event_sha256, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [WBD_OWNER_ORGANIZATION_ID, event.id, base.audit.length + index, nextRevision, JSON.stringify(event), sha256WbdOwnerCanonicalJson(event), databaseTimestamp(event.occurredAt)]);
      }
      const metaUpdate = await connection.query("UPDATE wbd_owner_domain_meta SET global_revision = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND global_revision = ?", [nextRevision, WBD_OWNER_ORGANIZATION_ID, base.revision]);
      if (Number(metaUpdate.affectedRows) !== 1) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner global revisionconflict.", "DATABASE_CONCURRENCY_CONFLICT");
      await connection.commit();
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause instanceof WbdOwnerDomainMariaDbStoreError || cause?.statusCode) throw cause;
      throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeintransactie is mislukt.", "DATABASE_TRANSACTION_FAILED", cause);
    } finally {
      const elapsed = performance.now() - started;
      this.metrics.transactionHoldMsTotal += elapsed;
      this.metrics.transactionHoldMsMax = Math.max(this.metrics.transactionHoldMsMax, elapsed);
      connection.release();
    }
    this.metrics.mutations += 1;
    this.metrics.domainWrites += prepared.length;
    this.metrics.auditAppends += appendedAudit.length;
    this.metrics.clonedKeys += finalized.clonedKeys.length;
    await this.#refresh(true);
    return { state: this.snapshot, value: result.value };
  }

  async storageStatus() {
    return { engine: "mariadb-owner-domains", revision: this.globalRevision, metrics: { ...this.metrics } };
  }

  async close() { if (this.ownsPool) await this.pool.end(); }

  async #assertMigration() {
    const body = await readFile(this.migrationFile, "utf8");
    const checksum = createHash("sha256").update(body).digest("hex");
    const rows = await this.pool.query("SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ?", [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION]);
    if (rows.length !== 1) throw new WbdOwnerDomainMariaDbStoreError("Verplichte WBD-owner domeinmigratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
    if (rows[0].checksum !== checksum) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinmigratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
  }

  async #refresh(force) {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      this.metrics.revisionQueries += 1;
      const meta = await this.pool.query("SELECT schema_version, global_revision, contract_version FROM wbd_owner_domain_meta WHERE organization_id = ?", [WBD_OWNER_ORGANIZATION_ID]);
      if (meta.length !== 1) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinmeta ontbreekt.", "DATABASE_STATE_MISSING");
      const revision = Number(meta[0].global_revision);
      if (!force && this.snapshot && revision === this.globalRevision) { this.metrics.cacheHits += 1; return; }
      this.metrics.cacheMisses += 1;
      const [rows, auditRows] = await Promise.all([
        this.pool.query("SELECT domain_key, domain_revision, payload_json, payload_sha256 FROM wbd_owner_domain_state WHERE organization_id = ?", [WBD_OWNER_ORGANIZATION_ID]),
        this.pool.query("SELECT event_json, event_sha256 FROM wbd_owner_audit_event WHERE organization_id = ? ORDER BY ordinal", [WBD_OWNER_ORGANIZATION_ID]),
      ]);
      if (rows.length !== Object.keys(WBD_OWNER_STATE_DOMAINS).length) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinset is incompleet.", "OWNER_DOMAIN_SET_INCOMPLETE");
      const domains = {};
      const revisions = new Map();
      for (const row of rows) {
        const payload = jsonValue(row.payload_json);
        if (sha256WbdOwnerCanonicalJson(payload) !== row.payload_sha256) throw new WbdOwnerDomainMariaDbStoreError(`WBD-owner domeinhash wijkt af: ${row.domain_key}.`, "OWNER_DOMAIN_HASH_MISMATCH");
        domains[row.domain_key] = immutableWbdOwnerDomain(payload);
        revisions.set(row.domain_key, Number(row.domain_revision));
        this.metrics.decodedBytes += Buffer.byteLength(JSON.stringify(payload));
      }
      const audit = auditRows.map((row) => {
        const event = jsonValue(row.event_json);
        if (sha256WbdOwnerCanonicalJson(event) !== row.event_sha256) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner audithash wijkt af.", "OWNER_AUDIT_HASH_MISMATCH");
        return event;
      });
      domains.audit = { ...domains.audit, audit: immutableWbdOwnerDomain(audit) };
      const composed = composeWbdOwnerState(domains);
      if (composed.organizationId !== WBD_OWNER_ORGANIZATION_ID || composed.schemaVersion !== Number(meta[0].schema_version) || composed.revision !== revision) throw new WbdOwnerDomainMariaDbStoreError("WBD-owner domeinmeta en state zijn inconsistent.", "DATABASE_REVISION_MISMATCH");
      this.snapshot = Object.freeze(composed);
      this.globalRevision = revision;
      this.domainRevisions = revisions;
      this.metrics.domainLoads += rows.length;
    })().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  async #connection() {
    try { return await this.pool.getConnection(); } catch (cause) { throw new WbdOwnerDomainMariaDbStoreError("Workspace MariaDB is niet bereikbaar.", "DATABASE_CONNECTION_FAILED", cause); }
  }
}

export const wbdOwnerDomainMariaDbMigrationContract = Object.freeze({ component: MIGRATION_COMPONENT, version: REQUIRED_MIGRATION_VERSION, file: defaultMigrationFile });
