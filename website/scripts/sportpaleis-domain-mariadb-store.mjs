import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import {
  decodeSportpaleisRuntimeState,
  encodeSportpaleisRuntimeState,
  SportpaleisMariaDbStoreError,
} from "./sportpaleis-mariadb-store.mjs";
import {
  assertSportpaleisDomainPayload,
  assertIncrementalSportpaleisState,
  composeSportpaleisState,
  createLazySportpaleisStateDraft,
  createPreparedSportpaleisStateDraft,
  detachSportpaleisRecordCollections,
  immutableDomain,
  partitionSportpaleisState,
  sha256CanonicalJson,
  sportpaleisRecordIdentity,
  SPORTPALEIS_DOMAIN_CONTRACT_VERSION,
  SPORTPALEIS_RECORD_COLLECTIONS,
  SPORTPALEIS_STATE_DOMAINS,
} from "./workspace-domain-state.mjs";
import { diffStableRecords } from "./workspace-domain-storage-primitives.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationFile = path.resolve(scriptDirectory, "..", "sportpaleis-server", "production-migrations", "workspace", "007-sportpaleis-domain-state.sql");
const MIGRATION_COMPONENT = "sportpaleis-runtime-state";
const REQUIRED_MIGRATION_VERSION = 7;
const ORGANIZATION_ID = "sport-2000-sportpaleis-bv";

function databaseOptions(config) {
  return {
    host: config.host, port: config.port, database: config.name, user: config.user, password: config.password,
    connectionLimit: config.connectionLimit ?? 8, acquireTimeout: config.acquireTimeoutMs ?? 5_000,
    connectTimeout: config.connectTimeoutMs ?? 5_000, idleTimeout: 30, bigIntAsNumber: true,
    insertIdAsNumber: true, timezone: "Z", charset: "utf8mb4", multipleStatements: false,
  };
}

function withoutAuditEvents(payload) {
  if (!Object.hasOwn(payload, "audit")) return payload;
  const { audit: _audit, ...rest } = payload;
  return rest;
}

function persistedDomainPayload(domain, sourcePayload) {
  const withoutAudit = domain === "audit" ? withoutAuditEvents(sourcePayload) : sourcePayload;
  const withoutIdempotency = domain === "platform" && Object.hasOwn(withoutAudit, "idempotency")
    ? (({ idempotency: _idempotency, ...rest }) => rest)(withoutAudit)
    : withoutAudit;
  return detachSportpaleisRecordCollections(withoutIdempotency);
}

function idempotencyIdentityHash(identity) {
  return createHash("sha256").update(identity).digest("hex");
}

function recordMap(records, collectionKey) {
  return new Map(records.map((record) => [sportpaleisRecordIdentity(collectionKey, record), record]));
}

const RECORD_ORDINAL_GAP = 1024;

function recordOrdinalKey(collectionKey, recordId) {
  return `${collectionKey}:${recordId}`;
}

function stableRecordOrdinals(collectionKey, previous, next, priorOrdinals) {
  const previousIds = new Set(previous.map((record) => sportpaleisRecordIdentity(collectionKey, record)));
  const assigned = new Map(previous.map((record, index) => {
    const id = sportpaleisRecordIdentity(collectionKey, record);
    return [id, Number(priorOrdinals.get(recordOrdinalKey(collectionKey, id)) ?? index * RECORD_ORDINAL_GAP)];
  }));
  const existingInNext = next.map((record) => sportpaleisRecordIdentity(collectionKey, record)).filter((id) => previousIds.has(id));
  if (existingInNext.some((id, index) => index > 0 && assigned.get(existingInNext[index - 1]) >= assigned.get(id))) {
    return new Map(next.map((record, ordinal) => [sportpaleisRecordIdentity(collectionKey, record), ordinal * RECORD_ORDINAL_GAP]));
  }
  for (let index = 0; index < next.length;) {
    const id = sportpaleisRecordIdentity(collectionKey, next[index]);
    if (assigned.has(id)) { index += 1; continue; }
    const start = index;
    while (index < next.length && !assigned.has(sportpaleisRecordIdentity(collectionKey, next[index]))) index += 1;
    const count = index - start;
    const leftId = start > 0 ? sportpaleisRecordIdentity(collectionKey, next[start - 1]) : null;
    const rightId = index < next.length ? sportpaleisRecordIdentity(collectionKey, next[index]) : null;
    const left = leftId ? assigned.get(leftId) : null;
    const right = rightId ? assigned.get(rightId) : null;
    let step = RECORD_ORDINAL_GAP;
    let first = left === null ? Number(right ?? 0) - count * step : left + step;
    if (left !== null && right !== null) {
      step = Math.floor((right - left) / (count + 1));
      if (step < 1) return new Map(next.map((record, ordinal) => [sportpaleisRecordIdentity(collectionKey, record), ordinal * RECORD_ORDINAL_GAP]));
      first = left + step;
    }
    for (let offset = 0; offset < count; offset += 1) assigned.set(sportpaleisRecordIdentity(collectionKey, next[start + offset]), first + offset * step);
  }
  return assigned;
}

function immutableChangedRecordCollection(collectionKey, previous, next) {
  const priorById = new Map(previous.map((record) => [sportpaleisRecordIdentity(collectionKey, record), record]));
  return Object.freeze(next.map((record) => priorById.get(sportpaleisRecordIdentity(collectionKey, record)) === record ? record : immutableDomain(record)));
}

function orderHistoryRows(orders) {
  return orders.flatMap((order) => (order.eventHistory ?? []).map((event, ordinal) => ({ order, event, ordinal })));
}

const persistedOrderRecords = new WeakMap();

function persistedRecord(collectionKey, record) {
  if (collectionKey !== "orders") return record;
  if (persistedOrderRecords.has(record)) return persistedOrderRecords.get(record);
  const { eventHistory: _eventHistory, ...order } = record;
  persistedOrderRecords.set(record, order);
  return order;
}

function artifactReference(job) {
  const artifact = job?.snapshot?.artifact;
  if (!artifact?.sha256 || !artifact?.path || !artifact?.format) return null;
  return { plotJobId: job.id, sha256: String(artifact.sha256).toLowerCase(), path: artifact.path, format: artifact.format };
}

function decodePayload(value) {
  return decodeSportpaleisRuntimeState(value);
}

function encodePayload(value) {
  return encodeSportpaleisRuntimeState(value).serialized;
}

async function insertBatches(connection, sql, parameters, maximumBatchSize = 200) {
  for (let offset = 0; offset < parameters.length; offset += maximumBatchSize) {
    const batch = parameters.slice(offset, offset + maximumBatchSize);
    if (typeof connection.batch === "function") await connection.batch(sql, batch);
    else for (const values of batch) await connection.query(sql, values);
  }
}

function changedAuditEvents(previous, next) {
  const previousIds = new Set(previous.map(({ id }) => id));
  const nextById = new Map(next.map((event) => [event.id, event]));
  const nextIds = new Set(nextById.keys());
  if (previous.some(({ id }) => !nextIds.has(id))) throw Object.assign(new Error("Immutable auditregels mogen niet worden verwijderd."), { code: "AUDIT_IMMUTABILITY_VIOLATION" });
  for (const event of previous) {
    const candidate = nextById.get(event.id);
    if (candidate === event) continue;
    if (sha256CanonicalJson(candidate) !== sha256CanonicalJson(event)) throw Object.assign(new Error("Immutable auditregels mogen niet worden gewijzigd."), { code: "AUDIT_IMMUTABILITY_VIOLATION" });
  }
  return next.filter(({ id }) => !previousIds.has(id));
}

function prepareMutationPersistence({ current, finalized, globalRevision, schemaVersion, domainCache, domainRevisions, recordOrdinals }) {
  const nextRevision = Number(globalRevision) + 1;
  finalized.state.revision = nextRevision;
  if (finalized.state.organizationId !== ORGANIZATION_ID || Number(finalized.state.schemaVersion) !== Number(schemaVersion)) {
    throw new SportpaleisMariaDbStoreError("Immutable state-identiteit is gewijzigd.", "DOMAIN_IDENTITY_VIOLATION");
  }
  assertIncrementalSportpaleisState(finalized.state, finalized.changedKeys);
  const partitioned = partitionSportpaleisState(finalized.state);
  const nextDomainCache = new Map(domainCache);
  const nextDomainRevisions = new Map(domainRevisions);
  const nextRecordOrdinals = new Map(recordOrdinals);
  const domains = [];
  for (const domain of finalized.changedDomains) {
    const sourcePayload = partitioned[domain];
    const auditAdditions = domain === "audit"
      ? changedAuditEvents(current.audit, finalized.state.audit).map((event) => ({ id: event.id, json: encodePayload(event), sha256: sha256CanonicalJson(event) }))
      : [];
    const { scalar: payload, collections } = persistedDomainPayload(domain, sourcePayload);
    const collectionPlans = [];
    for (const [collectionKey, records] of Object.entries(collections)) {
      const priorRecords = current[collectionKey] ?? [];
      const assignedOrdinals = stableRecordOrdinals(collectionKey, priorRecords, records, nextRecordOrdinals);
      const delta = diffStableRecords(
        priorRecords.map((record) => persistedRecord(collectionKey, record)),
        records.map((record) => persistedRecord(collectionKey, record)),
        { identity: (record) => sportpaleisRecordIdentity(collectionKey, record), hash: sha256CanonicalJson, trackOrdinal: false },
      );
      if (["orders", "productionJobs"].includes(collectionKey) && delta.deleted.length) {
        throw new SportpaleisMariaDbStoreError(`${collectionKey} mag geen immutable records fysiek verwijderen.`, "DOMAIN_RECORD_IMMUTABILITY_VIOLATION");
      }
      const changed = delta.changed.map(({ id: recordId, record, hash }) => ({ recordId, ordinal: assignedOrdinals.get(recordId), json: encodePayload(record), hash }));
      collectionPlans.push({ collectionKey, deleted: delta.deleted, changed });
      for (const recordId of delta.deleted) nextRecordOrdinals.delete(recordOrdinalKey(collectionKey, recordId));
      for (const [recordId, ordinal] of assignedOrdinals) nextRecordOrdinals.set(recordOrdinalKey(collectionKey, recordId), ordinal);
    }
    const historyAdditions = [];
    if (domain === "orders") {
      const priorOrders = recordMap(current.orders ?? [], "orders");
      for (const order of finalized.state.orders ?? []) {
        const prior = priorOrders.get(order.id);
        if (prior === order) continue;
        if (prior && sha256CanonicalJson(prior) === sha256CanonicalJson(order)) continue;
        const priorEvents = new Map((prior?.eventHistory ?? []).map((event, ordinal) => [event.id ?? sha256CanonicalJson({ orderId: order.id, ordinal, event }), event]));
        const nextEvents = new Map((order.eventHistory ?? []).map((event, ordinal) => [event.id ?? sha256CanonicalJson({ orderId: order.id, ordinal, event }), { event, ordinal }]));
        for (const [eventId, event] of priorEvents) {
          const candidate = nextEvents.get(eventId)?.event;
          if (!candidate || sha256CanonicalJson(candidate) !== sha256CanonicalJson(event)) {
            throw new SportpaleisMariaDbStoreError(`Orderhistorie ${order.id}/${eventId} is niet append-only.`, "ORDER_HISTORY_IMMUTABILITY_VIOLATION");
          }
        }
        for (const [eventId, { event, ordinal }] of nextEvents) if (!priorEvents.has(eventId)) {
          historyAdditions.push({ orderId: order.id, eventId, ordinal, orderRevision: Number(order.revision ?? 1), json: encodePayload(event), sha256: sha256CanonicalJson(event) });
        }
      }
    }
    const artifactReferences = [];
    if (domain === "artifacts") {
      const priorJobs = recordMap(current.productionJobs ?? [], "productionJobs");
      for (const job of finalized.state.productionJobs ?? []) {
        if (priorJobs.get(job.id) === job) continue;
        const reference = artifactReference(job);
        if (!reference) continue;
        const priorReference = artifactReference(priorJobs.get(job.id));
        if (priorReference && sha256CanonicalJson(priorReference) !== sha256CanonicalJson(reference)) {
          throw new SportpaleisMariaDbStoreError(`Immutable artifactreferentie van ${job.id} is gewijzigd.`, "ARTIFACT_REFERENCE_IMMUTABILITY_VIOLATION");
        }
        if (!priorReference) artifactReferences.push(reference);
      }
    }
    const idempotency = { deleted: [], changed: [] };
    if (domain === "platform" && finalized.changedKeys.includes("idempotency")) {
      const previous = current.idempotency ?? {};
      const next = finalized.state.idempotency ?? {};
      for (const identity of Object.keys(previous)) if (!Object.hasOwn(next, identity)) idempotency.deleted.push({ identity, identityHash: idempotencyIdentityHash(identity) });
      for (const [identity, record] of Object.entries(next)) {
        if (previous[identity] === record) continue;
        if (Object.hasOwn(previous, identity) && sha256CanonicalJson(previous[identity]) === sha256CanonicalJson(record)) continue;
        idempotency.changed.push({ identity, identityHash: idempotencyIdentityHash(identity), json: encodePayload(record), sha256: sha256CanonicalJson(record) });
      }
    }
    const evidence = assertSportpaleisDomainPayload(domain, payload);
    const complete = { ...immutableDomain(payload) };
    for (const key of SPORTPALEIS_STATE_DOMAINS[domain]) {
      if (SPORTPALEIS_RECORD_COLLECTIONS.has(key)) complete[key] = immutableChangedRecordCollection(key, current[key] ?? [], sourcePayload[key] ?? []);
    }
    if (domain === "platform") complete.idempotency = immutableDomain(sourcePayload.idempotency ?? {});
    if (domain === "audit") {
      const priorEvents = new Map(current.audit.map((event) => [event.id, event]));
      complete.audit = Object.freeze(finalized.state.audit.map((event) => priorEvents.get(event.id) ?? immutableDomain(event)));
    }
    nextDomainCache.set(domain, Object.freeze(complete));
    nextDomainRevisions.set(domain, Number(nextDomainRevisions.get(domain) ?? 0) + 1);
    domains.push({ domain, auditAdditions, collectionPlans, historyAdditions, artifactReferences, idempotency, payloadJson: encodePayload(payload), payloadSha256: evidence.sha256, priorDomainRevision: domainRevisions.get(domain) });
  }
  const composed = composeSportpaleisState(Object.fromEntries(nextDomainCache));
  composed.revision = nextRevision;
  return {
    baseRevision: Number(globalRevision), nextRevision, domains,
    nextDomainCache, nextDomainRevisions, nextRecordOrdinals,
    nextSnapshot: Object.freeze(composed), clonedKeys: finalized.clonedKeys.length,
  };
}

function prepareLegacyBackfill(row) {
  const legacy = decodeSportpaleisRuntimeState(row?.state_json);
  if (!legacy || typeof legacy !== "object" || legacy.organizationId !== ORGANIZATION_ID || !Number.isInteger(Number(legacy.schemaVersion))) {
    throw new SportpaleisMariaDbStoreError("Legacy migratiebron heeft een ongeldige identiteit.", "DATABASE_STATE_INVALID");
  }
  if (Number(row.revision) !== Number(legacy.revision)) throw new SportpaleisMariaDbStoreError("Legacy revisie is inconsistent.", "DATABASE_REVISION_MISMATCH");
  const domains = partitionSportpaleisState(legacy);
  const legacyHash = sha256CanonicalJson(legacy);
  const composedHash = sha256CanonicalJson(composeSportpaleisState({ ...domains, audit: { ...domains.audit, audit: legacy.audit } }));
  if (legacyHash !== composedHash) throw new SportpaleisMariaDbStoreError("Domeinbackfill wijkt af van de migratiebron.", "DOMAIN_BACKFILL_MISMATCH");
  return Object.freeze({ legacy, domains, legacyHash, composedHash });
}

function createMetrics() {
  return {
    metaQueries: 0, fullLegacyLoads: 0, domainRowsLoaded: 0, recordRowsLoaded: 0,
    auditRowsLoaded: 0, historyRowsLoaded: 0, idempotencyRowsLoaded: 0,
    decodedBytes: 0, domainWrites: 0, recordWrites: 0, recordDeletes: 0,
    auditAppends: 0, historyWrites: 0, artifactReferenceWrites: 0,
    idempotencyWrites: 0, idempotencyDeletes: 0,
    mutations: 0, unchangedMutations: 0, clonedKeys: 0, cacheHits: 0, cacheMisses: 0,
    preparedMutations: 0, preparedMutationMsTotal: 0, preparedMutationMsMax: 0,
    transactionHoldMsTotal: 0, transactionHoldMsMax: 0,
  };
}

export class SportpaleisDomainMariaDbStore {
  constructor({ database, pool, migrationFile = defaultMigrationFile }) {
    if (!pool && !database) throw new SportpaleisMariaDbStoreError("Workspace MariaDB-configuratie ontbreekt.", "DATABASE_CONFIG_MISSING");
    this.pool = pool ?? mariadb.createPool(databaseOptions(database));
    this.ownsPool = !pool;
    this.migrationFile = path.resolve(migrationFile);
    this.domainCache = new Map();
    this.collectionCache = new Map();
    this.recordOrdinals = new Map();
    this.domainRevisions = new Map();
    this.globalRevision = null;
    this.schemaVersion = null;
    this.snapshot = null;
    this.refreshPromise = null;
    this.metrics = createMetrics();
  }

  async initialize() {
    const migration = await readFile(this.migrationFile, "utf8");
    const connection = await this.#connection();
    try {
      const registered = await connection.query(
        "SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ?",
        [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION],
      );
      const checksum = createHash("sha256").update(migration).digest("hex");
      if (registered.length !== 1) throw new SportpaleisMariaDbStoreError("Verplichte domeinmigratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
      if (registered[0].checksum !== checksum) throw new SportpaleisMariaDbStoreError("Domeinmigratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
      const metaRows = await connection.query(
        "SELECT schema_version, global_revision, legacy_source_revision, contract_version, cutover_mode FROM sp_workspace_domain_meta WHERE organization_id = ?",
        [ORGANIZATION_ID],
      );
      if (metaRows.length !== 1) throw new SportpaleisMariaDbStoreError("De offline domeinbackfill ontbreekt; runtime-start muteert nooit de migratiebron.", "DOMAIN_BACKFILL_REQUIRED");
      if (Number(metaRows[0].contract_version) !== SPORTPALEIS_DOMAIN_CONTRACT_VERSION) throw new SportpaleisMariaDbStoreError("Domeincontractversie is incompatibel.", "DOMAIN_CONTRACT_MISMATCH");
    } catch (cause) {
      if (cause instanceof SportpaleisMariaDbStoreError) throw cause;
      throw new SportpaleisMariaDbStoreError("Domeinopslag kon niet worden geïnitialiseerd.", "DOMAIN_INITIALIZATION_FAILED", cause);
    } finally {
      connection.release();
    }
    await this.#refresh(true);
  }

  // Releasebroker-only additive migration step. Runtime initialization is
  // deliberately read-only and refuses to perform this CPU/DB-heavy backfill.
  async backfillLegacySource() {
    const migration = await readFile(this.migrationFile, "utf8");
    const checksum = createHash("sha256").update(migration).digest("hex");
    const [registered, existingMeta, sourceRows] = await Promise.all([
      this.pool.query("SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ?", [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION]),
      this.pool.query("SELECT schema_version, global_revision, legacy_source_revision, contract_version, cutover_mode FROM sp_workspace_domain_meta WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ?", [ORGANIZATION_ID]),
    ]);
    if (registered.length !== 1) throw new SportpaleisMariaDbStoreError("Verplichte domeinmigratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
    if (registered[0].checksum !== checksum) throw new SportpaleisMariaDbStoreError("Domeinmigratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
    if (sourceRows.length !== 1) throw new SportpaleisMariaDbStoreError("Legacy migratiebron ontbreekt.", "DATABASE_STATE_MISSING");
    if (existingMeta.length === 1) {
      if (Number(existingMeta[0].legacy_source_revision) !== Number(sourceRows[0].revision)) throw new SportpaleisMariaDbStoreError("Legacy bron wijzigde na een eerdere backfill.", "DOMAIN_BACKFILL_SOURCE_DRIFT");
      const reconciliation = await this.pool.query(
        "SELECT legacy_sha256, composed_sha256, status FROM sp_workspace_domain_reconciliation WHERE organization_id = ? AND legacy_revision = ? AND contract_version = ?",
        [ORGANIZATION_ID, sourceRows[0].revision, SPORTPALEIS_DOMAIN_CONTRACT_VERSION],
      );
      if (reconciliation.length !== 1 || reconciliation[0].status !== "MATCH" || reconciliation[0].legacy_sha256 !== reconciliation[0].composed_sha256) throw new SportpaleisMariaDbStoreError("Bestaande backfill mist hashgelijk reconciliatiebewijs.", "DOMAIN_BACKFILL_EVIDENCE_INVALID");
      return Object.freeze({ status: "ALREADY_BACKFILLED", organizationId: ORGANIZATION_ID, globalRevision: Number(existingMeta[0].global_revision), contractVersion: Number(existingMeta[0].contract_version), legacySha256: reconciliation[0].legacy_sha256, composedSha256: reconciliation[0].composed_sha256 });
    }
    const prepared = prepareLegacyBackfill(sourceRows[0]);
    this.metrics.fullLegacyLoads += 1;
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const registered = await connection.query(
        "SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ? FOR UPDATE",
        [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION],
      );
      if (registered.length !== 1) throw new SportpaleisMariaDbStoreError("Verplichte domeinmigratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
      if (registered[0].checksum !== checksum) throw new SportpaleisMariaDbStoreError("Domeinmigratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
      const metaRows = await connection.query(
        "SELECT schema_version, global_revision, legacy_source_revision, contract_version, cutover_mode FROM sp_workspace_domain_meta WHERE organization_id = ? FOR UPDATE",
        [ORGANIZATION_ID],
      );
      if (metaRows.length !== 0) throw new SportpaleisMariaDbStoreError("Gelijktijdige domeinbackfill gedetecteerd; herhaal de idempotente stap.", "DOMAIN_BACKFILL_CONCURRENT");
      const lockedSource = await connection.query(
        "SELECT revision FROM sp_runtime_state WHERE organization_id = ? FOR UPDATE",
        [ORGANIZATION_ID],
      );
      if (lockedSource.length !== 1 || Number(lockedSource[0].revision) !== Number(prepared.legacy.revision)) throw new SportpaleisMariaDbStoreError("Legacy bron wijzigde tussen voorbereiding en commit.", "DOMAIN_BACKFILL_SOURCE_DRIFT");
      const evidence = await this.#backfill(connection, prepared);
      await connection.commit();
      return evidence;
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause instanceof SportpaleisMariaDbStoreError) throw cause;
      throw new SportpaleisMariaDbStoreError("Domeinbackfill kon niet atomair worden uitgevoerd.", "DOMAIN_BACKFILL_FAILED", cause);
    } finally {
      connection.release();
    }
  }

  async #backfill(connection, prepared) {
    const { legacy, domains, legacyHash, composedHash } = prepared;
    await connection.query(
      "INSERT INTO sp_workspace_domain_meta (organization_id, schema_version, global_revision, legacy_source_revision, contract_version, cutover_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'SHADOW', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
      [ORGANIZATION_ID, legacy.schemaVersion, legacy.revision, legacy.revision, SPORTPALEIS_DOMAIN_CONTRACT_VERSION],
    );
    for (const [domain, sourcePayload] of Object.entries(domains)) {
      const { scalar: payload, collections } = persistedDomainPayload(domain, sourcePayload);
      const evidence = assertSportpaleisDomainPayload(domain, payload);
      await connection.query(
        "INSERT INTO sp_workspace_domain_state (organization_id, domain_key, domain_revision, global_revision, payload_json, payload_sha256, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
        [ORGANIZATION_ID, domain, legacy.revision, encodePayload(payload), evidence.sha256],
      );
      for (const [collectionKey, records] of Object.entries(collections)) {
        const sql = "INSERT INTO sp_workspace_domain_record (organization_id, domain_key, collection_key, record_id, ordinal, record_revision, global_revision, record_json, record_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))";
        const parameters = records.map((sourceRecord, ordinal) => {
          const record = persistedRecord(collectionKey, sourceRecord);
          const recordId = sportpaleisRecordIdentity(collectionKey, record);
          const stableOrdinal = ordinal * RECORD_ORDINAL_GAP;
          this.recordOrdinals.set(recordOrdinalKey(collectionKey, recordId), stableOrdinal);
          return [ORGANIZATION_ID, domain, collectionKey, recordId, stableOrdinal, legacy.revision, encodePayload(record), sha256CanonicalJson(record)];
        });
        await insertBatches(connection, sql, parameters);
      }
    }
    const insertAuditSql = "INSERT INTO sp_workspace_audit_event (organization_id, event_id, ordinal, global_revision, event_json, event_sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))";
    const auditParameters = legacy.audit.map((event, index) => [ORGANIZATION_ID, event.id, index, legacy.revision, encodePayload(event), sha256CanonicalJson(event)]);
    await insertBatches(connection, insertAuditSql, auditParameters);
    const historySql = "INSERT INTO sp_workspace_order_history_event (organization_id, order_id, event_id, ordinal, order_revision, global_revision, event_json, event_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))";
    const historyParameters = orderHistoryRows(legacy.orders ?? []).map(({ order, event, ordinal }) => {
      const eventId = typeof event.id === "string" && event.id ? event.id : sha256CanonicalJson({ orderId: order.id, ordinal, event });
      return [ORGANIZATION_ID, order.id, eventId, ordinal, Number(order.revision ?? 1), legacy.revision, encodePayload(event), sha256CanonicalJson(event)];
    });
    await insertBatches(connection, historySql, historyParameters);
    const artifactSql = "INSERT INTO sp_workspace_artifact_reference (organization_id, plot_job_id, artifact_sha256, artifact_path, artifact_format, immutable, global_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))";
    const artifactParameters = (legacy.productionJobs ?? []).flatMap((job) => {
      const reference = artifactReference(job);
      return reference ? [[ORGANIZATION_ID, reference.plotJobId, reference.sha256, reference.path, reference.format, legacy.revision]] : [];
    });
    await insertBatches(connection, artifactSql, artifactParameters);
    const idempotencySql = "INSERT INTO sp_workspace_idempotency_record (organization_id, identity_sha256, identity_key, global_revision, record_json, record_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))";
    const idempotencyParameters = Object.entries(legacy.idempotency ?? {}).map(([identity, record]) => [
      ORGANIZATION_ID, idempotencyIdentityHash(identity), identity, legacy.revision, encodePayload(record), sha256CanonicalJson(record),
    ]);
    await insertBatches(connection, idempotencySql, idempotencyParameters);
    await connection.query(
      "INSERT INTO sp_workspace_domain_reconciliation (organization_id, legacy_revision, contract_version, legacy_sha256, composed_sha256, domain_manifest_json, status, compared_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))",
      [ORGANIZATION_ID, legacy.revision, SPORTPALEIS_DOMAIN_CONTRACT_VERSION, legacyHash, composedHash,
        JSON.stringify(Object.fromEntries(Object.entries(domains).map(([domain, payload]) => [domain, { count: Object.keys(payload).length, sha256: sha256CanonicalJson(payload) }]))),
        legacyHash === composedHash ? "MATCH" : "MISMATCH"],
    );
    return Object.freeze({ status: "BACKFILLED", organizationId: ORGANIZATION_ID, globalRevision: Number(legacy.revision), contractVersion: SPORTPALEIS_DOMAIN_CONTRACT_VERSION, legacySha256: legacyHash, composedSha256: composedHash });
  }

  async readSnapshot() {
    await this.#refresh(false);
    return this.snapshot;
  }

  async read() {
    return this.readSnapshot();
  }

  async #refresh(force) {
    if (this.refreshPromise) return this.refreshPromise;
    const pending = this.#refreshOnce(force);
    this.refreshPromise = pending;
    try { return await pending; } finally { if (this.refreshPromise === pending) this.refreshPromise = null; }
  }

  async #refreshOnce(force) {
    this.metrics.metaQueries += 1;
    const meta = await this.pool.query(
      "SELECT schema_version, global_revision, contract_version, cutover_mode FROM sp_workspace_domain_meta WHERE organization_id = ?",
      [ORGANIZATION_ID],
    );
    if (meta.length !== 1 || Number(meta[0].contract_version) !== SPORTPALEIS_DOMAIN_CONTRACT_VERSION) throw new SportpaleisMariaDbStoreError("Domeinmetadata ontbreekt of is incompatibel.", "DOMAIN_META_INVALID");
    const nextRevision = Number(meta[0].global_revision);
    if (!force && this.snapshot && nextRevision === this.globalRevision) {
      this.metrics.cacheHits += 1;
      return;
    }
    this.metrics.cacheMisses += 1;
    const rows = await this.pool.query(
      force || this.globalRevision === null
        ? "SELECT domain_key, domain_revision, global_revision, payload_json, payload_sha256 FROM sp_workspace_domain_state WHERE organization_id = ?"
        : "SELECT domain_key, domain_revision, global_revision, payload_json, payload_sha256 FROM sp_workspace_domain_state WHERE organization_id = ? AND global_revision > ?",
      this.globalRevision === null || force ? [ORGANIZATION_ID] : [ORGANIZATION_ID, this.globalRevision],
    );
    const domainsToReload = new Set(rows.map(({ domain_key: domain }) => domain));
    this.metrics.domainRowsLoaded += rows.length;
    for (const row of rows) {
      const payload = decodePayload(row.payload_json);
      this.metrics.decodedBytes += Buffer.byteLength(String(row.payload_json));
      const evidence = assertSportpaleisDomainPayload(row.domain_key, payload);
      if (evidence.sha256 !== row.payload_sha256) throw new SportpaleisMariaDbStoreError(`Domeinhash wijkt af voor ${row.domain_key}.`, "DOMAIN_HASH_MISMATCH");
      this.domainCache.set(row.domain_key, immutableDomain(payload));
      this.domainRevisions.set(row.domain_key, Number(row.domain_revision));
    }
    for (const domain of domainsToReload) {
      const recordRows = await this.pool.query(
        "SELECT collection_key, record_id, ordinal, record_revision, record_json, record_sha256 FROM sp_workspace_domain_record WHERE organization_id = ? AND domain_key = ? ORDER BY collection_key ASC, ordinal ASC",
        [ORGANIZATION_ID, domain],
      );
      this.metrics.recordRowsLoaded += recordRows.length;
      const grouped = new Map();
      for (const row of recordRows) {
        const record = decodePayload(row.record_json);
        this.metrics.decodedBytes += Buffer.byteLength(String(row.record_json));
        if (sha256CanonicalJson(record) !== row.record_sha256 || sportpaleisRecordIdentity(row.collection_key, record) !== row.record_id) {
          throw new SportpaleisMariaDbStoreError(`Recordhash wijkt af voor ${row.collection_key}/${row.record_id}.`, "DOMAIN_RECORD_HASH_MISMATCH");
        }
        if (!grouped.has(row.collection_key)) grouped.set(row.collection_key, []);
        grouped.get(row.collection_key).push(immutableDomain(record));
        this.recordOrdinals.set(recordOrdinalKey(row.collection_key, row.record_id), Number(row.ordinal));
      }
      if (domain === "orders") {
        const historyRows = await this.pool.query(
          "SELECT order_id, event_json, event_sha256 FROM sp_workspace_order_history_event WHERE organization_id = ? ORDER BY order_id ASC, ordinal ASC",
          [ORGANIZATION_ID],
        );
        this.metrics.historyRowsLoaded += historyRows.length;
        const histories = new Map();
        for (const row of historyRows) {
          const event = decodePayload(row.event_json);
          if (sha256CanonicalJson(event) !== row.event_sha256) throw new SportpaleisMariaDbStoreError(`Orderhistoriehash wijkt af voor ${row.order_id}.`, "ORDER_HISTORY_HASH_MISMATCH");
          if (!histories.has(row.order_id)) histories.set(row.order_id, []);
          histories.get(row.order_id).push(immutableDomain(event));
        }
        grouped.set("orders", (grouped.get("orders") ?? []).map((order) => immutableDomain({ ...order, eventHistory: histories.get(order.id) ?? [] })));
      }
      if (domain === "platform") {
        const idempotencyRows = await this.pool.query(
          "SELECT identity_key, record_json, record_sha256 FROM sp_workspace_idempotency_record WHERE organization_id = ? ORDER BY identity_key ASC",
          [ORGANIZATION_ID],
        );
        this.metrics.idempotencyRowsLoaded += idempotencyRows.length;
        const idempotency = {};
        for (const row of idempotencyRows) {
          const record = decodePayload(row.record_json);
          if (sha256CanonicalJson(record) !== row.record_sha256) throw new SportpaleisMariaDbStoreError(`Idempotencyhash wijkt af voor ${row.identity_key}.`, "IDEMPOTENCY_HASH_MISMATCH");
          idempotency[row.identity_key] = immutableDomain(record);
        }
        const platform = { ...(this.domainCache.get("platform") ?? {}), idempotency: Object.freeze(idempotency) };
        this.domainCache.set("platform", Object.freeze(platform));
      }
      const complete = { ...(this.domainCache.get(domain) ?? {}) };
      for (const key of SPORTPALEIS_STATE_DOMAINS[domain]) {
        if (!SPORTPALEIS_RECORD_COLLECTIONS.has(key)) continue;
        const records = Object.freeze(grouped.get(key) ?? []);
        complete[key] = records;
        this.collectionCache.set(key, records);
      }
      this.domainCache.set(domain, Object.freeze(complete));
    }
    if (force || rows.some(({ domain_key: key }) => key === "audit")) {
      const auditRows = await this.pool.query(
        "SELECT event_json, event_sha256 FROM sp_workspace_audit_event WHERE organization_id = ? ORDER BY ordinal ASC",
        [ORGANIZATION_ID],
      );
      this.metrics.auditRowsLoaded += auditRows.length;
      const events = auditRows.map((row) => {
        const event = decodePayload(row.event_json);
        if (sha256CanonicalJson(event) !== row.event_sha256) throw new SportpaleisMariaDbStoreError("Audit-evidencehash wijkt af.", "AUDIT_HASH_MISMATCH");
        return immutableDomain(event);
      });
      this.domainCache.set("audit", immutableDomain({ ...(this.domainCache.get("audit") ?? {}), audit: events }));
    }
    for (const domain of Object.keys(SPORTPALEIS_STATE_DOMAINS)) if (!this.domainCache.has(domain)) throw new SportpaleisMariaDbStoreError(`Domein ${domain} ontbreekt.`, "DOMAIN_MISSING");
    const composed = composeSportpaleisState(Object.fromEntries(this.domainCache));
    composed.revision = nextRevision;
    this.snapshot = Object.freeze(composed);
    this.globalRevision = nextRevision;
    this.schemaVersion = Number(meta[0].schema_version);
  }

  async mutate(mutator, preparedCommand = null) {
    const connection = await this.#connection();
    const transactionStartedAt = performance.now();
    let phase = "begin";
    try {
      await connection.beginTransaction();
      phase = "lock-meta";
      const meta = await connection.query(
        "SELECT schema_version, global_revision, contract_version FROM sp_workspace_domain_meta WHERE organization_id = ? FOR UPDATE",
        [ORGANIZATION_ID],
      );
      if (meta.length !== 1 || Number(meta[0].contract_version) !== SPORTPALEIS_DOMAIN_CONTRACT_VERSION) throw new SportpaleisMariaDbStoreError("Domeinmetadata ontbreekt.", "DOMAIN_META_INVALID");
      if (this.globalRevision !== Number(meta[0].global_revision)) {
        throw new SportpaleisMariaDbStoreError("De lokale domeinsnapshot is verouderd; herhaal veilig na refresh.", "DOMAIN_SNAPSHOT_STALE");
      }
      const current = this.snapshot;
      let result;
      let persistence;
      if (preparedCommand) {
        if (Number(preparedCommand.baseRevision) !== Number(this.globalRevision)) throw new SportpaleisMariaDbStoreError("De voorbereide productieopdracht is verouderd.", "DOMAIN_PREPARED_SNAPSHOT_STALE");
        result = { value: preparedCommand.value };
        persistence = preparedCommand.persistence;
        if (!persistence || Number(persistence.baseRevision) !== Number(this.globalRevision)) throw new SportpaleisMariaDbStoreError("De voorbereide persistentieopdracht is verouderd.", "DOMAIN_PREPARED_SNAPSHOT_STALE");
      } else {
        const lazy = createLazySportpaleisStateDraft(current);
        phase = "mutator";
        result = await mutator(lazy.draft);
        if (result.unchanged === true) {
          this.metrics.unchangedMutations += 1;
          await connection.rollback();
          return { state: current, value: result.value };
        }
        persistence = prepareMutationPersistence({ current, finalized: lazy.finalize(), globalRevision: this.globalRevision, schemaVersion: this.schemaVersion, domainCache: this.domainCache, domainRevisions: this.domainRevisions, recordOrdinals: this.recordOrdinals });
      }
      this.metrics.mutations += 1;
      this.metrics.clonedKeys += persistence.clonedKeys;
      const { nextRevision } = persistence;
      phase = "write-domains";
      for (const domainPlan of persistence.domains) {
        const { domain } = domainPlan;
        if (domainPlan.auditAdditions.length) {
          const minimum = await connection.query("SELECT COALESCE(MIN(ordinal), 0) AS minimum_ordinal FROM sp_workspace_audit_event WHERE organization_id = ?", [ORGANIZATION_ID]);
          let ordinal = Number(minimum[0].minimum_ordinal) - domainPlan.auditAdditions.length;
          for (const event of domainPlan.auditAdditions) {
            await connection.query(
              "INSERT INTO sp_workspace_audit_event (organization_id, event_id, ordinal, global_revision, event_json, event_sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))",
              [ORGANIZATION_ID, event.id, ordinal, nextRevision, event.json, event.sha256],
            );
            this.metrics.auditAppends += 1;
            ordinal += 1;
          }
        }
        for (const collectionPlan of domainPlan.collectionPlans) {
          for (const recordId of collectionPlan.deleted) {
            await connection.query(
              "DELETE FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = ? AND record_id = ?",
              [ORGANIZATION_ID, collectionPlan.collectionKey, recordId],
            );
            this.metrics.recordDeletes += 1;
          }
          for (const record of collectionPlan.changed) {
            await connection.query(
              "INSERT INTO sp_workspace_domain_record (organization_id, domain_key, collection_key, record_id, ordinal, record_revision, global_revision, record_json, record_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE domain_key = VALUES(domain_key), ordinal = VALUES(ordinal), record_revision = record_revision + 1, global_revision = VALUES(global_revision), record_json = VALUES(record_json), record_sha256 = VALUES(record_sha256), updated_at = UTC_TIMESTAMP(3)",
              [ORGANIZATION_ID, domain, collectionPlan.collectionKey, record.recordId, record.ordinal, nextRevision, record.json, record.hash],
            );
            this.metrics.recordWrites += 1;
          }
        }
        for (const event of domainPlan.historyAdditions) {
          await connection.query(
            "INSERT INTO sp_workspace_order_history_event (organization_id, order_id, event_id, ordinal, order_revision, global_revision, event_json, event_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
            [ORGANIZATION_ID, event.orderId, event.eventId, event.ordinal, event.orderRevision, nextRevision, event.json, event.sha256],
          );
          this.metrics.historyWrites += 1;
        }
        for (const reference of domainPlan.artifactReferences) {
          await connection.query(
            "INSERT INTO sp_workspace_artifact_reference (organization_id, plot_job_id, artifact_sha256, artifact_path, artifact_format, immutable, global_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
            [ORGANIZATION_ID, reference.plotJobId, reference.sha256, reference.path, reference.format, nextRevision],
          );
          this.metrics.artifactReferenceWrites += 1;
        }
        for (const record of domainPlan.idempotency.deleted) {
          await connection.query("DELETE FROM sp_workspace_idempotency_record WHERE organization_id = ? AND identity_sha256 = ? AND identity_key = ?", [ORGANIZATION_ID, record.identityHash, record.identity]);
          this.metrics.idempotencyDeletes += 1;
        }
        for (const record of domainPlan.idempotency.changed) {
          await connection.query(
            "INSERT INTO sp_workspace_idempotency_record (organization_id, identity_sha256, identity_key, global_revision, record_json, record_sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE global_revision = VALUES(global_revision), record_json = VALUES(record_json), record_sha256 = VALUES(record_sha256), updated_at = UTC_TIMESTAMP(3)",
            [ORGANIZATION_ID, record.identityHash, record.identity, nextRevision, record.json, record.sha256],
          );
          this.metrics.idempotencyWrites += 1;
        }
        const update = await connection.query(
          "UPDATE sp_workspace_domain_state SET domain_revision = domain_revision + 1, global_revision = ?, payload_json = ?, payload_sha256 = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND domain_key = ? AND domain_revision = ?",
          [nextRevision, domainPlan.payloadJson, domainPlan.payloadSha256, ORGANIZATION_ID, domain, domainPlan.priorDomainRevision],
        );
        if (Number(update.affectedRows) !== 1) throw new SportpaleisMariaDbStoreError(`Gelijktijdige wijziging in domein ${domain}.`, "DOMAIN_CONCURRENCY_CONFLICT");
        this.metrics.domainWrites += 1;
      }
      const metaUpdate = await connection.query(
        "UPDATE sp_workspace_domain_meta SET global_revision = ?, schema_version = ?, cutover_mode = 'DOMAIN_READS', updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND global_revision = ?",
        [nextRevision, this.schemaVersion, ORGANIZATION_ID, this.globalRevision],
      );
      if (Number(metaUpdate.affectedRows) !== 1) throw new SportpaleisMariaDbStoreError("Gelijktijdige Workspace-wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      phase = "commit";
      await connection.commit();
      this.domainCache = persistence.nextDomainCache;
      this.domainRevisions = persistence.nextDomainRevisions;
      this.recordOrdinals = persistence.nextRecordOrdinals;
      this.globalRevision = nextRevision;
      this.snapshot = persistence.nextSnapshot;
      return { state: this.snapshot, value: result.value };
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause?.statusCode || cause instanceof SportpaleisMariaDbStoreError) throw cause;
      throw new SportpaleisMariaDbStoreError("Domeintransactie is mislukt.", "DOMAIN_TRANSACTION_FAILED", cause);
    } finally {
      const transactionHoldMs = performance.now() - transactionStartedAt;
      this.metrics.transactionHoldMsTotal += transactionHoldMs;
      this.metrics.transactionHoldMsMax = Math.max(this.metrics.transactionHoldMsMax, transactionHoldMs);
      connection.release();
    }
  }

  // CPU-heavy command preparation deliberately happens before a database
  // connection is acquired. The final write still uses mutate(), so its
  // revision lock and incremental domain/record transaction remain the only
  // commit boundary. A concurrent writer makes the prepared command stale and
  // fails closed; callers can retry with the same idempotency identity.
  async prepareAndCommit(mutator) {
    const preparationStartedAt = performance.now();
    await this.#refresh(false);
    const baseRevision = this.globalRevision;
    const baseSnapshot = this.snapshot;
    const lazy = createPreparedSportpaleisStateDraft(baseSnapshot);
    const preparedResult = await mutator(lazy.draft);
    if (preparedResult.unchanged === true) {
      this.metrics.unchangedMutations += 1;
      return { state: baseSnapshot, value: preparedResult.value };
    }
    const prepared = lazy.finalize();
    if (prepared.changedKeys.length === 0) return { state: baseSnapshot, value: preparedResult.value };
    const persistence = prepareMutationPersistence({ current: baseSnapshot, finalized: prepared, globalRevision: baseRevision, schemaVersion: this.schemaVersion, domainCache: this.domainCache, domainRevisions: this.domainRevisions, recordOrdinals: this.recordOrdinals });
    const preparationMs = performance.now() - preparationStartedAt;
    this.metrics.preparedMutations += 1;
    this.metrics.preparedMutationMsTotal += preparationMs;
    this.metrics.preparedMutationMsMax = Math.max(this.metrics.preparedMutationMsMax, preparationMs);
    return this.mutate(null, { baseRevision, persistence, value: preparedResult.value });
  }

  async latestBackupStatus() { return { status: "external", strategy: "encrypted-logical-dump-plus-provider-backup" }; }
  async storageStatus() {
    const [rows, recordRows] = await Promise.all([
      this.pool.query("SELECT domain_key, OCTET_LENGTH(payload_json) AS bytes FROM sp_workspace_domain_state WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT domain_key, COUNT(*) AS record_count, COALESCE(SUM(OCTET_LENGTH(record_json)), 0) AS bytes FROM sp_workspace_domain_record WHERE organization_id = ? GROUP BY domain_key", [ORGANIZATION_ID]),
    ]);
    const domains = Object.fromEntries(rows.map(({ domain_key, bytes }) => [domain_key, { scalarBytes: Number(bytes), recordBytes: 0, records: 0 }]));
    for (const row of recordRows) domains[row.domain_key] = { ...(domains[row.domain_key] ?? { scalarBytes: 0 }), recordBytes: Number(row.bytes), records: Number(row.record_count) };
    return { engine: "mariadb-domain-record-v1", domains, globalRevision: this.globalRevision, metrics: this.metricsSnapshot() };
  }
  metricsSnapshot() { return Object.freeze({ ...this.metrics }); }
  async close() { if (this.ownsPool) await this.pool.end(); }
  async #connection() {
    try { return await this.pool.getConnection(); } catch (cause) { throw new SportpaleisMariaDbStoreError("Workspace MariaDB is niet bereikbaar.", "DATABASE_CONNECTION_FAILED", cause); }
  }
}

export const sportpaleisDomainMariaDbMigrationContract = Object.freeze({
  component: MIGRATION_COMPONENT,
  version: REQUIRED_MIGRATION_VERSION,
  file: defaultMigrationFile,
  domainContractVersion: SPORTPALEIS_DOMAIN_CONTRACT_VERSION,
});
