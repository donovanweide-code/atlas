import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import { createInitialWbdOwnerState, WbdOwnerService } from "../scripts/wbd-owner-foundation.mjs";
import { WbdOwnerDomainMariaDbStore } from "../scripts/wbd-owner-domain-mariadb-store.mjs";
import { materializeWbdOwnerLegacyRollbackSource } from "../scripts/wbd-owner-domain-rollback-bridge.mjs";
import { composeWbdOwnerState, partitionWbdOwnerState, sha256WbdOwnerCanonicalJson } from "../scripts/wbd-owner-domain-state.mjs";

class OwnerDomainMemoryPool {
  constructor({ checksum, legacy }) {
    this.checksum = checksum;
    this.legacy = structuredClone(legacy);
    this.meta = null;
    this.domains = new Map();
    this.audit = [];
    this.reconciliation = null;
    this.calls = [];
  }
  async getConnection() { return new OwnerDomainMemoryConnection(this); }
  async query(sql, params) { return new OwnerDomainMemoryConnection(this).query(sql, params); }
}

class OwnerDomainMemoryConnection {
  constructor(pool) { this.pool = pool; }
  async beginTransaction() {}
  async commit() {}
  async rollback() {}
  release() {}
  async query(sql, params = []) {
    this.pool.calls.push(sql.replace(/\s+/gu, " ").trim());
    if (sql.includes("FROM wbd_schema_migrations")) return [{ checksum: this.pool.checksum }];
    if (sql.startsWith("SELECT revision, state_json FROM wbd_owner_state")) return [{ revision: this.pool.legacy.revision, state_json: JSON.stringify(this.pool.legacy) }];
    if (sql.startsWith("SELECT revision FROM wbd_owner_state")) return [{ revision: this.pool.legacy.revision }];
    if (sql.startsWith("SELECT global_revision, legacy_source_revision")) return this.pool.meta ? [{ ...this.pool.meta }] : [];
    if (sql.startsWith("SELECT global_revision, contract_version")) return this.pool.meta ? [{ global_revision: this.pool.meta.global_revision, contract_version: this.pool.meta.contract_version }] : [];
    if (sql.startsWith("SELECT schema_version, global_revision")) return this.pool.meta ? [{ schema_version: this.pool.meta.schema_version, global_revision: this.pool.meta.global_revision, contract_version: this.pool.meta.contract_version }] : [];
    if (sql.startsWith("SELECT global_revision FROM wbd_owner_domain_meta")) return this.pool.meta ? [{ global_revision: this.pool.meta.global_revision }] : [];
    if (sql.startsWith("SELECT legacy_sha256")) return this.pool.reconciliation ? [{ ...this.pool.reconciliation }] : [];
    if (sql.startsWith("SELECT domain_key")) return [...this.pool.domains.entries()].map(([domain_key, row]) => ({ domain_key, ...row }));
    if (sql.startsWith("SELECT event_json")) return [...this.pool.audit].sort((left, right) => left.ordinal - right.ordinal).map(({ event_json, event_sha256 }) => ({ event_json, event_sha256 }));
    if (sql.startsWith("INSERT INTO wbd_owner_domain_meta")) {
      this.pool.meta = { schema_version: Number(params[1]), global_revision: Number(params[2]), legacy_source_revision: Number(params[3]), contract_version: Number(params[4]) };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO wbd_owner_domain_state")) {
      this.pool.domains.set(params[1], { domain_revision: 1, global_revision: Number(params[2]), payload_json: params[3], payload_sha256: params[4] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO wbd_owner_audit_event")) {
      this.pool.audit.push({ eventId: params[1], ordinal: Number(params[2]), globalRevision: Number(params[3]), event_json: params[4], event_sha256: params[5] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("INSERT INTO wbd_owner_domain_reconciliation")) {
      this.pool.reconciliation = { legacy_sha256: params[3], composed_sha256: params[4], status: "MATCH" };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE wbd_owner_domain_state")) {
      const row = this.pool.domains.get(params[5]);
      if (!row || row.domain_revision !== Number(params[6])) return { affectedRows: 0 };
      this.pool.domains.set(params[5], { domain_revision: Number(params[0]), global_revision: Number(params[1]), payload_json: params[2], payload_sha256: params[3] });
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE wbd_owner_domain_meta")) {
      if (!this.pool.meta || this.pool.meta.global_revision !== Number(params[2])) return { affectedRows: 0 };
      this.pool.meta.global_revision = Number(params[0]);
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE wbd_owner_state")) {
      if (this.pool.legacy.revision !== Number(params[4])) return { affectedRows: 0 };
      this.pool.legacy = JSON.parse(params[2]);
      this.pool.legacy.schemaVersion = Number(params[0]);
      this.pool.legacy.revision = Number(params[1]);
      return { affectedRows: 1 };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

async function domainFixture() {
  const migration = await readFile(new URL("../sportpaleis-server/production-migrations/workspace/008-wbd-owner-domain-state.sql", import.meta.url), "utf8");
  const passwordRecord = await createWorkspacePasswordRecord("WBD-Owner-Domain-Test-001!");
  const legacy = createInitialWbdOwnerState({ passwordRecord, now: new Date("2026-09-05T12:00:00.000Z") });
  const pool = new OwnerDomainMemoryPool({ checksum: createHash("sha256").update(migration).digest("hex"), legacy });
  const store = new WbdOwnerDomainMariaDbStore({ pool });
  return { legacy, pool, store };
}

test("owner-state partitioneert verliesvrij in begrensde herbruikbare domeinen", async () => {
  const { legacy } = await domainFixture();
  const domains = partitionWbdOwnerState(legacy);
  assert.deepEqual(composeWbdOwnerState(domains), legacy);
  assert.deepEqual(Object.keys(domains), ["identity", "capabilities", "productTruth", "controlPlane", "atlas", "promotion", "audit", "platform"]);
});

test("offline owner-backfill is hashgelijk en runtime-initialisatie blijft read-only", async () => {
  const { legacy, pool, store } = await domainFixture();
  const evidence = await store.backfillLegacySource();
  assert.equal(evidence.status, "BACKFILLED");
  assert.equal(evidence.legacySha256, sha256WbdOwnerCanonicalJson(legacy));
  assert.equal(evidence.composedSha256, evidence.legacySha256);
  const callsBefore = pool.calls.length;
  await store.initialize();
  const state = await store.read();
  assert.equal(sha256WbdOwnerCanonicalJson(state), evidence.legacySha256);
  assert.equal(pool.calls.slice(callsBefore).some((sql) => /INSERT|UPDATE|DELETE/u.test(sql)), false);
  const repeated = await store.backfillLegacySource();
  assert.equal(repeated.status, "ALREADY_BACKFILLED");
  assert.equal(repeated.globalRevision, legacy.revision);
});

test("kleine owner-mutatie schrijft alleen geraakte domeinen en append-only audit", async () => {
  const { pool, store } = await domainFixture();
  await store.backfillLegacySource();
  await store.initialize();
  const before = await store.read();
  const auditBefore = before.audit.length;
  const writesBefore = pool.calls.length;
  const result = await store.mutate(async (state) => {
    state.capabilities[0].guidance = "Incrementeel domeinbewijs.";
    state.audit.push({ id: "owner-domain-audit-001", actorId: state.owner.id, action: "Capability bijgewerkt", subject: state.capabilities[0].id, occurredAt: "2026-09-05T12:30:00.000Z" });
    return { state, value: state.capabilities[0].id };
  });
  assert.equal(result.state.revision, before.revision + 1);
  assert.equal(result.state.audit.length, auditBefore + 1);
  const writes = pool.calls.slice(writesBefore).filter((sql) => sql.startsWith("UPDATE wbd_owner_domain_state"));
  assert.equal(writes.length, 3, "capabilities, auditmetadata en platformrevision zijn de enige domeinwrites");
  assert.equal(pool.calls.slice(writesBefore).some((sql) => sql.startsWith("UPDATE wbd_owner_state")), false);
  const status = await store.storageStatus();
  assert.equal(status.metrics.auditAppends, 1);
  assert.ok(status.metrics.clonedKeys < Object.keys(result.state).length);
});

test("authenticatiepolls zijn cachehits zonder revision-, audit- of legacywrite", async () => {
  const { pool, store } = await domainFixture();
  await store.backfillLegacySource();
  const service = new WbdOwnerService({ store, releaseId: "WBD-OWNER-DOMAIN-CANDIDATE", allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const login = await service.login({ email: "donovanweide@gmail.com", password: "WBD-Owner-Domain-Test-001!", now: new Date("2026-09-05T13:00:00.000Z") });
  const baseline = await store.read();
  const callsBefore = pool.calls.length;
  for (let index = 0; index < 100; index += 1) {
    const session = await service.issueSessionView(login.token, new Date("2026-09-05T13:01:00.000Z"));
    assert.equal(session.csrfToken, login.csrfToken);
  }
  const after = await store.read();
  assert.equal(after.revision, baseline.revision);
  assert.equal(after.audit.length, baseline.audit.length);
  assert.equal(pool.calls.slice(callsBefore).some((sql) => /INSERT|UPDATE|DELETE/u.test(sql)), false);
  assert.equal(pool.calls.slice(callsBefore).some((sql) => sql.includes("state_json FROM wbd_owner_state")), false);
});

test("bestaande pre-cutover sessie migreert CSRF functioneel zonder pollwrite", async () => {
  const { pool, store } = await domainFixture();
  await store.backfillLegacySource();
  const token = "owner-existing-session-token";
  await store.initialize();
  await store.mutate(async (state) => {
    state.sessions.push({
      idHash: createHash("sha256").update(token).digest("hex"),
      userId: state.owner.id,
      csrfHash: createHash("sha256").update("legacy-random-csrf").digest("hex"),
      createdAt: "2026-09-05T12:00:00.000Z",
      lastSeenAt: "2026-09-05T12:00:00.000Z",
      expiresAt: "2099-09-05T12:00:00.000Z",
      deviceMode: "SHARED",
      authMethod: "PASSWORD",
    });
    return { state, value: undefined };
  });
  const service = new WbdOwnerService({ store, releaseId: "WBD-OWNER-DOMAIN-CANDIDATE", allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const baseline = await store.read();
  const callsBefore = pool.calls.length;
  const view = await service.issueSessionView(token, new Date("2026-09-05T13:00:00.000Z"));
  assert.equal(typeof view.csrfToken, "string");
  assert.equal((await store.read()).revision, baseline.revision);
  assert.equal(pool.calls.slice(callsBefore).some((sql) => /INSERT|UPDATE|DELETE/u.test(sql)), false);
});

test("afgebroken owner-mutatie laat revision en domeinhashes intact", async () => {
  const { pool, store } = await domainFixture();
  await store.backfillLegacySource();
  await store.initialize();
  const before = await store.read();
  const hashes = new Map([...pool.domains].map(([key, value]) => [key, value.payload_sha256]));
  await assert.rejects(store.mutate(async (state) => {
    state.atlasControlPlane.lastVisitedAt = "2026-09-05T14:00:00.000Z";
    throw new Error("fixture interrupted");
  }), /fixture interrupted/u);
  assert.equal((await store.read()).revision, before.revision);
  assert.deepEqual(new Map([...pool.domains].map(([key, value]) => [key, value.payload_sha256])), hashes);
});

test("owner rollbackbridge materialiseert exact R2.26.38-compatibele legacybron onder revisionlock", async () => {
  const { pool, store } = await domainFixture();
  await store.backfillLegacySource();
  await store.initialize();
  await store.mutate(async (state) => {
    state.boundaries.rollbackFixture = "domain-primary";
    return { state, value: undefined };
  });
  const snapshot = await store.read();
  const expectedHash = sha256WbdOwnerCanonicalJson(snapshot);
  const evidence = await materializeWbdOwnerLegacyRollbackSource({ pool, expectedGlobalRevision: snapshot.revision, expectedDomainHash: expectedHash });
  assert.equal(evidence.rollbackConsumer, "R2.26.38_COMPATIBLE");
  assert.equal(evidence.stateSha256, expectedHash);
  assert.equal(sha256WbdOwnerCanonicalJson(pool.legacy), expectedHash);
  await assert.rejects(materializeWbdOwnerLegacyRollbackSource({ pool, expectedGlobalRevision: snapshot.revision - 1, expectedDomainHash: expectedHash }), /revision-drift/u);
});
