import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createSportpaleisPasswordRecord, createSportpaleisProductionBootstrap, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { SportpaleisDomainMariaDbStore } from "../scripts/sportpaleis-domain-mariadb-store.mjs";
import { materializeLegacyRollbackState } from "../scripts/sportpaleis-domain-rollback-bridge.mjs";
import { sha256CanonicalJson } from "../scripts/workspace-domain-state.mjs";

const migrationFile = new URL("../sportpaleis-server/production-migrations/workspace/007-sportpaleis-domain-state.sql", import.meta.url);

class DomainMemoryPool {
  constructor(legacy, checksum) {
    this.legacy = { revision: legacy.revision, state_json: JSON.stringify(legacy) };
    this.checksum = checksum;
    this.meta = null;
    this.domains = new Map();
    this.records = new Map();
    this.audit = new Map();
    this.history = new Map();
    this.artifacts = new Map();
    this.idempotency = new Map();
    this.queries = [];
    this.batchCalls = [];
    this.commits = 0;
    this.rollbacks = 0;
    this.transactionDurationsMs = [];
  }
  async getConnection() { return new DomainMemoryConnection(this); }
  async query(sql, parameters = []) { return new DomainMemoryConnection(this).query(sql, parameters); }
}

class DomainMemoryConnection {
  constructor(pool) { this.pool = pool; }
  async beginTransaction() {
    this.transactionStartedAt = performance.now();
    this.transactionSnapshot = {
      meta: this.pool.meta ? structuredClone(this.pool.meta) : null,
      reconciliation: this.pool.reconciliation ? structuredClone(this.pool.reconciliation) : null,
      legacy: structuredClone(this.pool.legacy),
      domains: structuredClone(this.pool.domains), records: structuredClone(this.pool.records),
      audit: structuredClone(this.pool.audit), history: structuredClone(this.pool.history), artifacts: structuredClone(this.pool.artifacts), idempotency: structuredClone(this.pool.idempotency),
    };
  }
  async commit() {
    this.pool.commits += 1;
    if (this.transactionStartedAt !== undefined) this.pool.transactionDurationsMs.push(performance.now() - this.transactionStartedAt);
    this.transactionSnapshot = null;
  }
  async rollback() {
    this.pool.rollbacks += 1;
    if (this.transactionStartedAt !== undefined) this.pool.transactionDurationsMs.push(performance.now() - this.transactionStartedAt);
    if (!this.transactionSnapshot) return;
    this.pool.meta = this.transactionSnapshot.meta;
    this.pool.reconciliation = this.transactionSnapshot.reconciliation;
    this.pool.legacy = this.transactionSnapshot.legacy;
    this.pool.domains = this.transactionSnapshot.domains;
    this.pool.records = this.transactionSnapshot.records;
    this.pool.audit = this.transactionSnapshot.audit;
    this.pool.history = this.transactionSnapshot.history;
    this.pool.artifacts = this.transactionSnapshot.artifacts;
    this.pool.idempotency = this.transactionSnapshot.idempotency;
    this.transactionSnapshot = null;
  }
  release() {}
  async batch(sql, parameters) {
    this.pool.batchCalls.push({ sql, count: parameters.length });
    for (const values of parameters) await this.query(sql, values);
    return { affectedRows: parameters.length };
  }
  async query(sql, parameters = []) {
    this.pool.queries.push(sql);
    if (sql.includes("FROM wbd_schema_migrations")) return [{ checksum: this.pool.checksum }];
    if (sql.startsWith("SELECT schema_version, global_revision, legacy_source_revision")) return this.pool.meta ? [{ ...this.pool.meta }] : [];
    if (sql.startsWith("SELECT schema_version, global_revision, contract_version")) return this.pool.meta ? [{ ...this.pool.meta }] : [];
    if (sql.startsWith("SELECT global_revision FROM sp_workspace_domain_meta")) return this.pool.meta ? [{ global_revision: this.pool.meta.global_revision }] : [];
    if (sql.startsWith("SELECT revision, state_json FROM sp_runtime_state")) return [{ ...this.pool.legacy }];
    if (sql.startsWith("SELECT revision FROM sp_runtime_state")) return [{ revision: this.pool.legacy.revision }];
    if (sql.startsWith("SELECT legacy_sha256, composed_sha256")) return this.pool.reconciliation ? [{ ...this.pool.reconciliation }] : [];
    if (sql.startsWith("INSERT INTO sp_workspace_domain_meta")) {
      this.pool.meta = { schema_version: parameters[1], global_revision: parameters[2], legacy_source_revision: parameters[3], contract_version: parameters[4], cutover_mode: "SHADOW" };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_domain_state")) {
      this.pool.domains.set(parameters[1], { domain_key: parameters[1], domain_revision: 1, global_revision: parameters[2], payload_json: parameters[3], payload_sha256: parameters[4] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_domain_record")) {
      const [organizationId, domain, collection, recordId, ordinal, globalRevision, recordJson, recordHash] = parameters;
      const key = `${collection}:${recordId}`;
      const prior = this.pool.records.get(key);
      this.pool.records.set(key, { organization_id: organizationId, domain_key: domain, collection_key: collection, record_id: recordId, ordinal, record_revision: Number(prior?.record_revision ?? 0) + 1, global_revision: globalRevision, record_json: recordJson, record_sha256: recordHash });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("DELETE FROM sp_workspace_domain_record")) {
      this.pool.records.delete(`${parameters[1]}:${parameters[2]}`);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_audit_event")) {
      this.pool.audit.set(parameters[1], { event_id: parameters[1], ordinal: parameters[2], global_revision: parameters[3], event_json: parameters[4], event_sha256: parameters[5] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_domain_reconciliation")) {
      this.pool.reconciliation = { legacy_sha256: parameters[3], composed_sha256: parameters[4], status: parameters[6] };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_order_history_event")) {
      this.pool.history.set(`${parameters[1]}:${parameters[2]}`, { order_id: parameters[1], event_id: parameters[2], ordinal: parameters[3], event_json: parameters[6], event_sha256: parameters[7] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_artifact_reference")) {
      this.pool.artifacts.set(`${parameters[1]}:${parameters[2]}`, { plot_job_id: parameters[1], artifact_sha256: parameters[2], artifact_path: parameters[3], artifact_format: parameters[4] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO sp_workspace_idempotency_record")) {
      const [organizationId, identityHash, identity, globalRevision, recordJson, recordHash] = parameters;
      this.pool.idempotency.set(identityHash, { organization_id: organizationId, identity_sha256: identityHash, identity_key: identity, global_revision: globalRevision, record_json: recordJson, record_sha256: recordHash });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("DELETE FROM sp_workspace_idempotency_record")) {
      this.pool.idempotency.delete(parameters[1]);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("SELECT domain_key, domain_revision")) {
      const since = parameters.length > 1 ? Number(parameters[1]) : null;
      return [...this.pool.domains.values()].filter(({ global_revision }) => since === null || Number(global_revision) > since);
    }
    if (sql.startsWith("SELECT event_json, event_sha256")) return [...this.pool.audit.values()].sort((a, b) => a.ordinal - b.ordinal);
    if (sql.startsWith("SELECT order_id, event_json, event_sha256")) return [...this.pool.history.values()].sort((a, b) => a.order_id.localeCompare(b.order_id) || a.ordinal - b.ordinal);
    if (sql.startsWith("SELECT identity_key, record_json, record_sha256")) return [...this.pool.idempotency.values()].sort((a, b) => a.identity_key.localeCompare(b.identity_key));
    if (sql.startsWith("SELECT collection_key, record_id")) return [...this.pool.records.values()].filter(({ domain_key }) => domain_key === parameters[1]).sort((a, b) => a.collection_key.localeCompare(b.collection_key) || a.ordinal - b.ordinal);
    if (sql.startsWith("SELECT COALESCE(MIN(ordinal)")) return [{ minimum_ordinal: Math.min(0, ...[...this.pool.audit.values()].map(({ ordinal }) => ordinal)) }];
    if (sql.startsWith("UPDATE sp_workspace_domain_state")) {
      const [globalRevision, payload, hash, _organization, domain, expected] = parameters;
      const row = this.pool.domains.get(domain);
      if (!row || row.domain_revision !== Number(expected)) return { affectedRows: 0 };
      this.pool.domains.set(domain, { ...row, domain_revision: row.domain_revision + 1, global_revision: globalRevision, payload_json: payload, payload_sha256: hash });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE sp_workspace_domain_meta")) {
      const [globalRevision, schemaVersion, _organization, expected] = parameters;
      if (this.pool.meta.global_revision !== Number(expected)) return { affectedRows: 0 };
      this.pool.meta = { ...this.pool.meta, global_revision: globalRevision, schema_version: schemaVersion, cutover_mode: "DOMAIN_READS" };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE sp_runtime_state")) {
      const [_schemaVersion, revision, stateJson, _organization, expected] = parameters;
      if (Number(this.pool.legacy.revision) !== Number(expected)) return { affectedRows: 0 };
      this.pool.legacy = { revision, state_json: stateJson };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("SELECT domain_key, OCTET_LENGTH")) return [...this.pool.domains.values()].map(({ domain_key, payload_json }) => ({ domain_key, bytes: Buffer.byteLength(payload_json) }));
    if (sql.startsWith("SELECT domain_key, COUNT(*)")) {
      const grouped = new Map();
      for (const row of this.pool.records.values()) {
        const entry = grouped.get(row.domain_key) ?? { domain_key: row.domain_key, record_count: 0, bytes: 0 };
        entry.record_count += 1;
        entry.bytes += Buffer.byteLength(row.record_json);
        grouped.set(row.domain_key, entry);
      }
      return [...grouped.values()];
    }
    throw new Error(`Onverwachte domeinquery: ${sql}`);
  }
}

test("runtime-start weigert een ontbrekende offline backfill zonder state te muteren", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await assert.rejects(store.initialize(), ({ code }) => code === "DOMAIN_BACKFILL_REQUIRED");
  assert.equal(pool.meta, null);
  assert.equal(pool.commits, 0);
});

test("additieve backfill is hashgelijk en een kleine mutatie schrijft geen legacy blob", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.audit[0].details.largeEvidence = "x".repeat(6 * 1024 * 1024);
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await store.backfillLegacySource();
  await store.initialize();
  assert.deepEqual(await store.read(), legacy);
  const legacyWritesBefore = pool.queries.filter((sql) => sql.startsWith("UPDATE sp_runtime_state")).length;
  const queryCountBefore = pool.queries.length;
  await store.mutate(async (state) => {
    state.preferences.operator = { density: "compact" };
    return { state, value: "saved" };
  });
  const writes = pool.queries.slice(queryCountBefore).filter((sql) => sql.startsWith("UPDATE sp_workspace_domain_state"));
  assert.equal(writes.length, 1);
  assert.match(writes[0], /domain_revision/);
  assert.equal(pool.queries.filter((sql) => sql.startsWith("UPDATE sp_runtime_state")).length, legacyWritesBefore);
  assert.equal((await store.readSnapshot()).preferences.operator.density, "compact");
  assert.equal((await store.readSnapshot()).audit[0].details.largeEvidence.length, 6 * 1024 * 1024);
});

test("herhaalde offline backfill is hash-idempotent en weigert legacy brondrift", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  const first = await store.backfillLegacySource();
  const repeated = await store.backfillLegacySource();
  assert.equal(first.status, "BACKFILLED");
  assert.equal(repeated.status, "ALREADY_BACKFILLED");
  assert.equal(repeated.legacySha256, first.legacySha256);
  assert.equal(repeated.composedSha256, first.composedSha256);
  pool.legacy.revision += 1;
  await assert.rejects(store.backfillLegacySource(), ({ code }) => code === "DOMAIN_BACKFILL_SOURCE_DRIFT");
});

test("auditappend schrijft alleen nieuwe immutable event en geen volledige auditpayload", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.audit[0].details.largeEvidence = "x".repeat(3 * 1024 * 1024);
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await store.backfillLegacySource();
  await store.initialize();
  const before = pool.audit.size;
  await store.mutate(async (state) => {
    state.audit.unshift({ id: "audit-incremental", at: "2026-09-05T06:01:00.000Z", userId: "test", action: "Test", subject: "Fixture", details: { bounded: true } });
    return { state, value: null };
  });
  assert.equal(pool.audit.size, before + 1);
  assert.equal(pool.domains.get("audit").payload_json.includes("largeEvidence"), false);
  assert.equal((await store.readSnapshot()).audit[0].id, "audit-incremental");
});

test("auth, bootstrap en honderd polls blijven read-only op de domeinopslag", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.idempotency["operator:FIXTURE:separate-record"] = { at: "2026-09-05T06:00:00.000Z", requestHash: null, value: { ok: true } };
  legacy.users.push({ id: "operator", name: "Operator", initials: "OP", role: "operator", email: "operator@example.test", status: "Actief", seatType: "customer", salesNumber: null, password: await createSportpaleisPasswordRecord("Domain-Store-Test!") });
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1" });
  await store.backfillLegacySource();
  await service.initialize();
  const login = await service.login({ email: "operator@example.test", password: "Domain-Store-Test!" });
  const writesAfterLogin = pool.queries.filter((sql) => sql.startsWith("UPDATE sp_workspace_domain_state")).length;
  const revisionAfterLogin = (await store.readSnapshot()).revision;
  assert.equal(JSON.parse(pool.domains.get("platform").payload_json).idempotency, undefined);
  assert.ok(pool.idempotency.size > 0, "login-idempotency staat als afzonderlijk record opgeslagen");
  const bootstrap = await service.bootstrap(login.token);
  assert.equal(bootstrap.currentUser.id, "operator");
  for (let index = 0; index < 100; index += 1) assert.equal((await service.currentRevision(login.token)).revision, revisionAfterLogin);
  assert.equal(pool.queries.filter((sql) => sql.startsWith("UPDATE sp_workspace_domain_state")).length, writesAfterLogin);
  assert.equal((await store.readSnapshot()).revision, revisionAfterLogin);
});

test("ordermutatie schrijft één record en historie append-only zonder andere collectie te herschrijven", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.orders.push({ id: "SP-TEST-1", revision: 1, status: "NEW", eventHistory: [{ id: "event-1", at: "2026-09-05T06:00:00.000Z", action: "Aangemaakt" }] });
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await store.backfillLegacySource();
  await store.initialize();
  const beforeQueries = pool.queries.length;
  await store.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === "SP-TEST-1");
    order.status = "READY";
    order.revision += 1;
    order.eventHistory.push({ id: "event-2", at: "2026-09-05T06:02:00.000Z", action: "Gereed" });
    return { state, value: null };
  });
  const writes = pool.queries.slice(beforeQueries);
  assert.equal(writes.filter((sql) => sql.startsWith("INSERT INTO sp_workspace_domain_record")).length, 1);
  assert.equal(writes.filter((sql) => sql.startsWith("INSERT INTO sp_workspace_order_history_event")).length, 1);
  assert.equal(pool.history.size, 2);
  assert.equal((await store.read()).orders[0].status, "READY");
  assert.equal(JSON.parse(pool.records.get("orders:SP-TEST-1").record_json).eventHistory, undefined);
  assert.equal((await store.read()).orders[0].eventHistory.length, 2);
});

test("een nieuwe store reconstrueert exact de actuele domeinen en aparte orderhistorie", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.orders.push({ id: "SP-RESTART-1", revision: 1, status: "NEW", eventHistory: [{ id: "event-start", at: "2026-09-05T06:00:00.000Z", action: "Aangemaakt" }] });
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const first = new SportpaleisDomainMariaDbStore({ pool });
  await first.backfillLegacySource();
  await first.initialize();
  await first.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === "SP-RESTART-1");
    order.status = "READY";
    order.revision += 1;
    order.eventHistory.push({ id: "event-ready", at: "2026-09-05T06:05:00.000Z", action: "Gereed" });
    return { state, value: null };
  });
  const expected = await first.read();
  const second = new SportpaleisDomainMariaDbStore({ pool });
  await second.initialize();
  const restored = await second.read();
  assert.equal(sha256CanonicalJson(restored), sha256CanonicalJson(expected));
  assert.equal(restored.orders.find(({ id }) => id === "SP-RESTART-1").eventHistory.length, 2);
  assert.equal(second.metricsSnapshot().fullLegacyLoads, 0, "restart leest niet opnieuw de legacy monoliet");
});

test("gelijktijdige stores blokkeren stale writes en kunnen daarna veilig refreshen en retryen", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const first = new SportpaleisDomainMariaDbStore({ pool });
  const second = new SportpaleisDomainMariaDbStore({ pool });
  await first.backfillLegacySource();
  await first.initialize();
  await second.initialize();
  await first.mutate(async (state) => {
    state.preferences.operator = { density: "compact" };
    return { state, value: null };
  });
  await assert.rejects(second.mutate(async (state) => {
    state.preferences.store = { density: "comfortable" };
    return { state, value: null };
  }), ({ code }) => code === "DOMAIN_SNAPSHOT_STALE");
  assert.equal((await second.read()).preferences.operator.density, "compact");
  await second.mutate(async (state) => {
    state.preferences.store = { density: "comfortable" };
    return { state, value: null };
  });
  assert.equal((await first.read()).preferences.store.density, "comfortable");
});

test("prepared persistence faalt zonder writes bij revisiondrift en commit een idempotente retry exact eenmaal", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const first = new SportpaleisDomainMariaDbStore({ pool });
  const second = new SportpaleisDomainMariaDbStore({ pool });
  await first.backfillLegacySource();
  await first.initialize();
  await second.initialize();
  let releasePreparation;
  let markPreparationStarted;
  const preparationPaused = new Promise((resolve) => { releasePreparation = resolve; });
  const preparationStarted = new Promise((resolve) => { markPreparationStarted = resolve; });
  const identity = "prepared-persistence-race";
  const applyPreparedMutation = async (state) => {
    if (state.idempotency[identity]) return { state, value: state.idempotency[identity], unchanged: true };
    state.preferences.prepared = { density: "compact" };
    state.idempotency[identity] = { status: "SUCCEEDED", value: { density: "compact" } };
    return { state, value: state.idempotency[identity] };
  };
  const stale = first.prepareAndCommit(async (state) => {
    const result = await applyPreparedMutation(state);
    markPreparationStarted();
    await preparationPaused;
    return result;
  });
  await preparationStarted;
  await second.mutate(async (state) => {
    state.preferences.concurrent = { density: "comfortable" };
    return { state, value: null };
  });
  const afterConcurrentCommit = {
    revision: pool.meta.global_revision,
    commits: pool.commits,
    records: structuredClone(pool.records),
    audit: structuredClone(pool.audit),
    history: structuredClone(pool.history),
    artifacts: structuredClone(pool.artifacts),
    idempotency: structuredClone(pool.idempotency),
  };
  releasePreparation();
  await assert.rejects(stale, ({ code }) => code === "DOMAIN_SNAPSHOT_STALE" || code === "DOMAIN_PREPARED_SNAPSHOT_STALE");
  assert.equal(pool.meta.global_revision, afterConcurrentCommit.revision);
  assert.equal(pool.commits, afterConcurrentCommit.commits);
  assert.deepEqual(pool.records, afterConcurrentCommit.records);
  assert.deepEqual(pool.audit, afterConcurrentCommit.audit);
  assert.deepEqual(pool.history, afterConcurrentCommit.history);
  assert.deepEqual(pool.artifacts, afterConcurrentCommit.artifacts);
  assert.deepEqual(pool.idempotency, afterConcurrentCommit.idempotency);
  await first.read();
  const retried = await first.prepareAndCommit(applyPreparedMutation);
  assert.equal(retried.value.status, "SUCCEEDED");
  assert.equal(pool.meta.global_revision, afterConcurrentCommit.revision + 1);
  assert.equal(pool.commits, afterConcurrentCommit.commits + 1);
  assert.equal(pool.idempotency.size, afterConcurrentCommit.idempotency.size + 1);
  const repeated = await first.prepareAndCommit(applyPreparedMutation);
  assert.deepEqual(repeated.value, retried.value);
  assert.equal(pool.meta.global_revision, afterConcurrentCommit.revision + 1);
  assert.equal(pool.commits, afterConcurrentCommit.commits + 1);
});

test("historie en artifactreferentie zijn immutable en een fout rolt recordwrites terug", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.orders.push({ id: "SP-TEST-2", revision: 1, eventHistory: [{ id: "event-fixed", at: "2026-09-05T06:00:00.000Z", action: "Aangemaakt" }] });
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await store.backfillLegacySource();
  await store.initialize();
  const beforeRevision = (await store.read()).revision;
  const beforeArtifacts = structuredClone(pool.artifacts);
  await assert.rejects(store.mutate(async (state) => {
    state.orders[0].eventHistory[0].action = "Gewijzigd";
    return { state, value: null };
  }), ({ code }) => code === "ORDER_HISTORY_IMMUTABILITY_VIOLATION");
  await assert.rejects(store.mutate(async (state) => {
    state.productionJobs[0].snapshot.artifact.path = "outputs/changed.svg";
    return { state, value: null };
  }), ({ code }) => code === "ARTIFACT_REFERENCE_IMMUTABILITY_VIOLATION");
  assert.equal((await store.read()).revision, beforeRevision);
  assert.deepEqual(pool.artifacts, beforeArtifacts);
  assert.equal((await store.read()).orders[0].eventHistory[0].action, "Aangemaakt");
});

test("rollbackbridge materialiseert onder revision- en hashlock exact één legacy snapshot", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  await store.backfillLegacySource();
  await store.initialize();
  await store.mutate(async (state) => {
    state.preferences.operator = { density: "compact" };
    return { state, value: null };
  });
  const domainSnapshot = await store.read();
  assert.notEqual(pool.legacy.revision, domainSnapshot.revision, "legacy blijft tijdens normale domeinmutatie ongewijzigd");
  const evidence = await materializeLegacyRollbackState({
    pool,
    expectedGlobalRevision: domainSnapshot.revision,
    expectedDomainHash: sha256CanonicalJson(domainSnapshot),
  });
  assert.equal(pool.legacy.revision, domainSnapshot.revision);
  assert.equal(evidence.stateSha256, sha256CanonicalJson(domainSnapshot));
  await assert.rejects(materializeLegacyRollbackState({ pool, expectedGlobalRevision: domainSnapshot.revision - 1, expectedDomainHash: evidence.stateSha256 }), /revision-drift/);
});

test("grote Vrije productie en reject-only gebruiken recordtransacties zonder duplicaat of artifactmutatie", async (context) => {
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "sp-domain-production-"));
  context.after(() => rm(runtimeRoot, { recursive: true, force: true }));
  const migration = await readFile(migrationFile, "utf8");
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  legacy.users.push({ id: "operator", name: "Operator", initials: "OP", role: "operator", email: "operator@example.test", status: "Actief", seatType: "customer", salesNumber: null, password: await createSportpaleisPasswordRecord("Domain-Production-Test!") });
  const pool = new DomainMemoryPool(legacy, createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisDomainMariaDbStore({ pool });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve("."), runtimeArtifactRoot: runtimeRoot, allowedOrigin: "http://127.0.0.1" });
  await store.backfillLegacySource();
  await service.initialize();
  const login = await service.login({ email: "operator@example.test", password: "Domain-Production-Test!" });
  const bootstrap = await service.bootstrap(login.token);
  const font = bootstrap.productionFonts.find(({ name }) => name === "Spain Euro 2016");
  assert.ok(font);
  const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
  const lines = Array.from({ length: 11 }, (_, index) => String(index + 2)).map((content) => ({ id: `domain-free-${content}`, type: "NUMBER", content, previewLabel: content, widthMm: 180, heightMm: 80, quantity: 2, foilColor: "Wit", sourceId: font.id, provenance: "Domeinopslag production fixture" }));
  const order = (await service.createOrder(login.token, login.csrfToken, { orderKind: "CUSTOM", customer: "Domeinfixture", customerEmail: "", customerPhone: "", standardPersonalization: empty, productionLines: lines, items: [{ product: "Vrije opdruk", association: "Vrije bedrukking", size: "", quantity: 22, personalization: "2 t/m 12 ×2", foilColor: "Wit", deviation: true, overrides: empty }] }, "domain-order")).value;
  const proposal = (await service.createProductionProposal(login.token, login.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "domain-production-proposal")).value;
  const heartbeatAt = [];
  const heartbeat = setInterval(() => heartbeatAt.push(performance.now()), 20);
  const transactionsBeforeBuild = pool.transactionDurationsMs.length;
  const batchCallsBeforeBuild = pool.batchCalls.length;
  const recordWritesBeforeBuild = store.metricsSnapshot().recordWrites;
  const first = await service.createProductionJob(login.token, login.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "domain-production-job");
  clearInterval(heartbeat);
  const heartbeatGaps = heartbeatAt.slice(1).map((at, index) => at - heartbeatAt[index]);
  const buildTransactions = pool.transactionDurationsMs.slice(transactionsBeforeBuild);
  assert.ok(heartbeatAt.length >= 10, "de event-loop blijft tijdens de geïsoleerde workerproductie responsief");
  assert.ok(Math.max(0, ...heartbeatGaps) < 500, `event-loopblok tijdens productie is begrensd: ${Math.max(0, ...heartbeatGaps)} ms`);
  assert.ok(buildTransactions.length >= 1 && Math.max(...buildTransactions) < 1_500, `de databaseverbinding omvat niet de zware geometryworker: ${buildTransactions.join(", ")} ms`);
  assert.ok(pool.batchCalls.slice(batchCallsBeforeBuild).some(({ sql }) => sql.startsWith("INSERT INTO sp_workspace_domain_record")), "production persistence gebruikt de gebundelde MariaDB-writegrens");
  assert.ok(store.metricsSnapshot().recordWrites - recordWritesBeforeBuild <= 6, "een nieuwe PlotJob herschrijft geen honderden indexverschoven records");
  context.diagnostic(`worker heartbeat max=${Math.max(0, ...heartbeatGaps).toFixed(1)}ms; db transaction max=${Math.max(...buildTransactions).toFixed(1)}ms; record writes=${store.metricsSnapshot().recordWrites - recordWritesBeforeBuild}`);
  const retry = await service.createProductionJob(login.token, login.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "domain-production-job");
  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.equal(first.value.id, retry.value.id);
  const artifactBefore = structuredClone(first.value.snapshot.artifact);
  const rejected = await service.rejectProductionJob(login.token, login.csrfToken, first.value.id, { reason: "Geïsoleerde assurance-afkeur; geen fysieke productie." });
  const rejectedAgain = await service.rejectProductionJob(login.token, login.csrfToken, first.value.id, { reason: "Geïsoleerde assurance-afkeur; geen fysieke productie." });
  assert.equal(rejected.duplicate, false);
  assert.equal(rejectedAgain.duplicate, true);
  const persisted = (await store.read()).productionJobs.find(({ id }) => id === first.value.id);
  assert.equal(persisted.status, "REJECTED");
  assert.deepEqual(persisted.snapshot.artifact, artifactBefore);
  assert.equal([...pool.records.values()].filter(({ collection_key, record_id }) => collection_key === "productionJobs" && record_id === first.value.id).length, 1);
  assert.equal([...pool.artifacts.values()].filter(({ plot_job_id }) => plot_job_id === first.value.id).length, 1);
  assert.ok(store.metricsSnapshot().recordWrites > 0);
});
