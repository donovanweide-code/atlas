import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import { createInitialWbdMailControl, validateWbdMailControl } from "./wbd-mail-control.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationDirectory = path.resolve(scriptDirectory, "..", "sportpaleis-server", "production-migrations", "workspace");
const defaultMigrationFile = path.join(migrationDirectory, "006-wbd-mail-audit.sql");
const MIGRATION_COMPONENT = "sportpaleis-runtime-state";
const REQUIRED_MIGRATION_VERSION = 6;
const ORGANIZATION_ID = "we-build-and-design";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

function jsonValue(value) {
  if (typeof value === "string") return JSON.parse(value);
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString("utf8"));
  return structuredClone(value);
}

function databaseOptions(config) {
  return {
    host: config.host, port: config.port, database: config.name, user: config.user, password: config.password,
    connectionLimit: config.connectionLimit ?? 6, acquireTimeout: config.acquireTimeoutMs ?? 5_000,
    connectTimeout: config.connectTimeoutMs ?? 5_000, idleTimeout: 30, bigIntAsNumber: true,
    insertIdAsNumber: true, timezone: "Z", charset: "utf8mb4", multipleStatements: false,
  };
}

export class WbdMailMariaDbStoreError extends Error {
  constructor(message, code = "WBD_MAIL_DATABASE_ERROR", cause) {
    super(message, { cause });
    this.name = "WbdMailMariaDbStoreError";
    this.code = code;
  }
}

export class WbdMailMariaDbStore {
  constructor({ database, pool, migrationFile = defaultMigrationFile }) {
    if (!pool && !database) throw new WbdMailMariaDbStoreError("Mail MariaDB-configuratie ontbreekt.", "DATABASE_CONFIG_MISSING");
    this.pool = pool ?? mariadb.createPool(databaseOptions(database));
    this.ownsPool = !pool;
    this.migrationFile = path.resolve(migrationFile);
  }

  async initialize() {
    const migrationBody = await readFile(this.migrationFile, "utf8");
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const migrations = await connection.query("SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ? FOR UPDATE", [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION]);
      if (migrations.length !== 1) throw new WbdMailMariaDbStoreError("Verplichte WBD Mail-migratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
      if (migrations[0].checksum !== sha256(migrationBody)) throw new WbdMailMariaDbStoreError("WBD Mail-migratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
      const rows = await connection.query("SELECT revision, state_json FROM wbd_mail_control_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (!rows.length) {
        const state = validateWbdMailControl(createInitialWbdMailControl());
        await connection.query("INSERT INTO wbd_mail_control_state (organization_id, schema_version, revision, state_json, created_at, updated_at) VALUES (?, ?, 1, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))", [ORGANIZATION_ID, state.schemaVersion, JSON.stringify({ ...state, messages: [], threads: [] })]);
      }
      await connection.commit();
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause instanceof WbdMailMariaDbStoreError) throw cause;
      throw new WbdMailMariaDbStoreError("WBD Mail MariaDB-initialisatie is mislukt.", "DATABASE_INITIALIZATION_FAILED", cause);
    } finally { connection.release(); }
  }

  async read() {
    const [controlRows, messageRows, threadRows, auditRows] = await Promise.all([
      this.pool.query("SELECT revision, state_json FROM wbd_mail_control_state WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT message_json FROM wbd_mail_messages WHERE organization_id = ? ORDER BY received_at DESC LIMIT 10000", [ORGANIZATION_ID]),
      this.pool.query("SELECT thread_json FROM wbd_mail_threads WHERE organization_id = ? ORDER BY last_activity_at DESC LIMIT 5000", [ORGANIZATION_ID]),
      this.pool.query("SELECT id, event_type, subject_id, actor, occurred_at, details_json FROM wbd_mail_audit WHERE organization_id = ? ORDER BY occurred_at DESC LIMIT 5000", [ORGANIZATION_ID]),
    ]);
    if (controlRows.length !== 1) throw new WbdMailMariaDbStoreError("WBD Mail-controlstate ontbreekt.", "DATABASE_STATE_MISSING");
    const state = jsonValue(controlRows[0].state_json);
    state.messages = messageRows.map(({ message_json }) => jsonValue(message_json));
    state.threads = threadRows.map(({ thread_json }) => jsonValue(thread_json));
    state.audit = auditRows.map((row) => ({ id: row.id, eventType: row.event_type, subjectId: row.subject_id, actor: row.actor, occurredAt: new Date(row.occurred_at).toISOString(), details: jsonValue(row.details_json) })).reverse();
    return validateWbdMailControl(state);
  }

  async workspaceView({ mailboxId = null, limit = 40, now = new Date() } = {}) {
    const started = performance.now();
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 40));
    const controlRows = await this.pool.query("SELECT state_json FROM wbd_mail_control_state WHERE organization_id = ?", [ORGANIZATION_ID]);
    if (controlRows.length !== 1) throw new WbdMailMariaDbStoreError("WBD Mail-controlstate ontbreekt.", "DATABASE_STATE_MISSING");
    const control = validateWbdMailControl({ ...jsonValue(controlRows[0].state_json), messages: [], threads: [], audit: [] });
    const filter = mailboxId ? " AND JSON_CONTAINS(thread_json, JSON_QUOTE(?), '$.mailboxIds')" : "";
    const threadRows = await this.pool.query(`SELECT thread_json FROM wbd_mail_threads WHERE organization_id = ?${filter} ORDER BY last_activity_at DESC LIMIT ?`, mailboxId ? [ORGANIZATION_ID, mailboxId, boundedLimit] : [ORGANIZATION_ID, boundedLimit]);
    const [threadCount, messageCount, unreadCount, attentionCount] = await Promise.all([
      this.pool.query("SELECT COUNT(*) AS total FROM wbd_mail_threads WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT COUNT(*) AS total FROM wbd_mail_messages WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT COALESCE(SUM(CAST(JSON_VALUE(thread_json, '$.unreadCount') AS UNSIGNED)), 0) AS total FROM wbd_mail_threads WHERE organization_id = ?", [ORGANIZATION_ID]),
      this.pool.query("SELECT COUNT(*) AS total FROM wbd_mail_threads WHERE organization_id = ? AND status = 'OPEN' AND priority = 'HIGH'", [ORGANIZATION_ID]),
    ]);
    const threads = threadRows.map(({ thread_json }) => jsonValue(thread_json));
    return {
      schemaVersion: 1, generatedAt: iso(now), mailboxes: control.mailboxes,
      counts: { threads: Number(threadCount[0].total), messages: Number(messageCount[0].total), unread: Number(unreadCount[0].total), attention: Number(attentionCount[0].total), drafts: control.drafts.filter(({ status }) => status !== "SENT").length },
      threads, templates: control.templates, communicationFoundation: control.communicationFoundation, sportpaleisReadiness: control.sportpaleisReadiness,
      freshness: control.mailboxes.some(({ freshness }) => freshness === "LIVE") ? "LIVE" : control.mailboxes.some(({ freshness }) => freshness === "RECENT") ? "RECENT" : "UNKNOWN",
      performance: { source: "CENTRAL_NORMALIZED_MARIADB_PROJECTION", connectorCallsDuringRender: 0, queryDurationMs: Math.round((performance.now() - started) * 100) / 100 },
    };
  }

  async notificationState() {
    const rows = await this.pool.query("SELECT state_json FROM wbd_mail_control_state WHERE organization_id = ?", [ORGANIZATION_ID]);
    if (rows.length !== 1) throw new WbdMailMariaDbStoreError("WBD Mail-controlstate ontbreekt.", "DATABASE_STATE_MISSING");
    return validateWbdMailControl({ ...jsonValue(rows[0].state_json), messages: [], threads: [], audit: [] });
  }

  async mutateNotificationState(mutator) {
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const rows = await connection.query("SELECT revision, state_json FROM wbd_mail_control_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (rows.length !== 1) throw new WbdMailMariaDbStoreError("WBD Mail-controlstate ontbreekt.", "DATABASE_STATE_MISSING");
      const current = validateWbdMailControl({ ...jsonValue(rows[0].state_json), messages: [], threads: [], audit: [] });
      const value = await mutator(current);
      const next = validateWbdMailControl(current);
      const revision = Number(rows[0].revision) + 1;
      const compact = { ...next, messages: [], threads: [], audit: [] };
      const update = await connection.query("UPDATE wbd_mail_control_state SET revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?", [revision, JSON.stringify(compact), ORGANIZATION_ID, Number(rows[0].revision)]);
      if (Number(update.affectedRows) !== 1) throw new WbdMailMariaDbStoreError("Gelijktijdige WBD Mail-wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      for (const event of next.audit) await connection.query("INSERT IGNORE INTO wbd_mail_audit (id, organization_id, event_type, subject_id, actor, occurred_at, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)", [event.id, ORGANIZATION_ID, event.eventType, event.subjectId, event.actor, event.occurredAt, JSON.stringify(event.details ?? {})]);
      await connection.commit();
      return structuredClone(value);
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause?.statusCode || cause instanceof WbdMailMariaDbStoreError) throw cause;
      throw new WbdMailMariaDbStoreError("WBD Mail notificationtransactie is mislukt.", "DATABASE_TRANSACTION_FAILED", cause);
    } finally { connection.release(); }
  }

  async thread(threadId) {
    const threadRows = await this.pool.query("SELECT thread_json FROM wbd_mail_threads WHERE id = ? AND organization_id = ?", [threadId, ORGANIZATION_ID]);
    if (threadRows.length !== 1) throw Object.assign(new Error("Mailgesprek niet gevonden."), { statusCode: 404, code: "NOT_FOUND" });
    const thread = jsonValue(threadRows[0].thread_json);
    const messageRows = await this.pool.query("SELECT message_json FROM wbd_mail_messages WHERE thread_id = ? AND organization_id = ? ORDER BY received_at", [threadId, ORGANIZATION_ID]);
    const controlRows = await this.pool.query("SELECT state_json FROM wbd_mail_control_state WHERE organization_id = ?", [ORGANIZATION_ID]);
    const control = jsonValue(controlRows[0].state_json);
    return { thread, messages: messageRows.map(({ message_json }) => jsonValue(message_json)), commitments: (control.commitments ?? []).filter((item) => item.threadId === threadId), drafts: (control.drafts ?? []).filter((item) => item.threadId === threadId) };
  }

  async search(query, { limit = 30 } = {}) {
    const normalized = String(query ?? "").trim();
    if (!normalized || normalized.length > 240) throw Object.assign(new Error("Zoekvraag is ongeldig."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const tokens = normalized.split(/[^\p{L}\p{N}@._-]+/u).filter((token) => token.length > 1).slice(0, 12).map((token) => `+${token.replace(/[^\p{L}\p{N}@._-]/gu, "")}*`).join(" ");
    if (!tokens) return [];
    const rows = await this.pool.query(`SELECT DISTINCT t.thread_json, MATCH(m.subject, m.snippet, m.body_text) AGAINST (? IN BOOLEAN MODE) AS score
      FROM wbd_mail_messages m JOIN wbd_mail_threads t ON t.id = m.thread_id
      WHERE m.organization_id = ? AND MATCH(m.subject, m.snippet, m.body_text) AGAINST (? IN BOOLEAN MODE)
      ORDER BY score DESC, t.last_activity_at DESC LIMIT ?`, [tokens, ORGANIZATION_ID, tokens, Math.max(1, Math.min(50, Number(limit) || 30))]);
    return rows.map(({ thread_json }) => jsonValue(thread_json)).map((thread) => ({ type: "MAIL_THREAD", id: thread.id, title: thread.subject, summary: thread.snippet, href: `/workspace/wbd/mail?thread=${encodeURIComponent(thread.id)}`, source: "CENTRAL_MAIL_STATE" }));
  }

  async mutate(mutator) {
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const controlRows = await connection.query("SELECT revision, state_json FROM wbd_mail_control_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (controlRows.length !== 1) throw new WbdMailMariaDbStoreError("WBD Mail-controlstate ontbreekt.", "DATABASE_STATE_MISSING");
      const messageRows = await connection.query("SELECT message_json FROM wbd_mail_messages WHERE organization_id = ? ORDER BY received_at DESC LIMIT 10000", [ORGANIZATION_ID]);
      const threadRows = await connection.query("SELECT thread_json FROM wbd_mail_threads WHERE organization_id = ? ORDER BY last_activity_at DESC LIMIT 5000", [ORGANIZATION_ID]);
      const auditRows = await connection.query("SELECT id, event_type, subject_id, actor, occurred_at, details_json FROM wbd_mail_audit WHERE organization_id = ? ORDER BY occurred_at DESC LIMIT 5000", [ORGANIZATION_ID]);
      const current = jsonValue(controlRows[0].state_json);
      current.messages = messageRows.map(({ message_json }) => jsonValue(message_json));
      current.threads = threadRows.map(({ thread_json }) => jsonValue(thread_json));
      current.audit = auditRows.map((row) => ({ id: row.id, eventType: row.event_type, subjectId: row.subject_id, actor: row.actor, occurredAt: new Date(row.occurred_at).toISOString(), details: jsonValue(row.details_json) })).reverse();
      const value = await mutator(current);
      const next = validateWbdMailControl(current);
      const revision = Number(controlRows[0].revision) + 1;
      const compact = { ...next, messages: [], threads: [], audit: [] };
      const update = await connection.query("UPDATE wbd_mail_control_state SET revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?", [revision, JSON.stringify(compact), ORGANIZATION_ID, Number(controlRows[0].revision)]);
      if (Number(update.affectedRows) !== 1) throw new WbdMailMariaDbStoreError("Gelijktijdige WBD Mail-wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      for (const message of next.messages) await connection.query(`INSERT INTO wbd_mail_messages (id, organization_id, mailbox_id, thread_id, source_key, message_id, subject, snippet, body_text, classification, priority, received_at, content_hash, message_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE thread_id = VALUES(thread_id), subject = VALUES(subject), snippet = VALUES(snippet), body_text = VALUES(body_text), classification = VALUES(classification), priority = VALUES(priority), received_at = VALUES(received_at), content_hash = VALUES(content_hash), message_json = VALUES(message_json)`,
      [message.id, ORGANIZATION_ID, message.mailboxId, message.threadId, message.sourceKey, message.messageId, message.subject, message.snippet, message.text, message.classification.classification, message.classification.priority, message.receivedAt, message.contentHash, JSON.stringify(message)]);
      for (const thread of next.threads) await connection.query(`INSERT INTO wbd_mail_threads (id, organization_id, priority, status, last_activity_at, thread_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE priority = VALUES(priority), status = VALUES(status), last_activity_at = VALUES(last_activity_at), thread_json = VALUES(thread_json), updated_at = UTC_TIMESTAMP(3)`,
      [thread.id, ORGANIZATION_ID, thread.priority, thread.status, thread.lastActivityAt, JSON.stringify(thread)]);
      for (const event of next.audit) await connection.query("INSERT IGNORE INTO wbd_mail_audit (id, organization_id, event_type, subject_id, actor, occurred_at, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)", [event.id, ORGANIZATION_ID, event.eventType, event.subjectId, event.actor, event.occurredAt, JSON.stringify(event.details ?? {})]);
      await connection.commit();
      return structuredClone(value);
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause?.statusCode || cause instanceof WbdMailMariaDbStoreError) throw cause;
      throw new WbdMailMariaDbStoreError("WBD Mail MariaDB-transactie is mislukt.", "DATABASE_TRANSACTION_FAILED", cause);
    } finally { connection.release(); }
  }

  async storageStatus() { return { engine: "mariadb-normalized-mail", boundedHotMessageWindow: 10000, boundedThreadWindow: 5000 }; }
  async close() { if (this.ownsPool) await this.pool.end(); }
  async #connection() { try { return await this.pool.getConnection(); } catch (cause) { throw new WbdMailMariaDbStoreError("Workspace MariaDB is niet bereikbaar.", "DATABASE_CONNECTION_FAILED", cause); } }
}

export const wbdMailMariaDbMigrationContract = Object.freeze({ component: MIGRATION_COMPONENT, version: REQUIRED_MIGRATION_VERSION, file: defaultMigrationFile, files: Object.freeze(["003-wbd-mail-control.sql", "004-wbd-mail-messages.sql", "005-wbd-mail-threads.sql", "006-wbd-mail-audit.sql"].map((name) => path.join(migrationDirectory, name))) });
