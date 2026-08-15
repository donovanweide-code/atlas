import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import { validateWbdOwnerState } from "./wbd-owner-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationFile = path.resolve(scriptDirectory, "..", "sportpaleis-server", "production-migrations", "workspace", "002-wbd-owner-state.sql");
const MIGRATION_COMPONENT = "sportpaleis-runtime-state";
const REQUIRED_MIGRATION_VERSION = 2;
const ORGANIZATION_ID = "we-build-and-design";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function jsonValue(value) {
  if (typeof value === "string") return JSON.parse(value);
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString("utf8"));
  return structuredClone(value);
}

function databaseOptions(config) {
  return {
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    connectionLimit: config.connectionLimit ?? 6,
    acquireTimeout: config.acquireTimeoutMs ?? 5_000,
    connectTimeout: config.connectTimeoutMs ?? 5_000,
    idleTimeout: 30,
    bigIntAsNumber: true,
    insertIdAsNumber: true,
    timezone: "Z",
    charset: "utf8mb4",
    multipleStatements: false,
  };
}

export class WbdOwnerMariaDbStoreError extends Error {
  constructor(message, code = "WBD_OWNER_DATABASE_ERROR", cause) {
    super(message, { cause });
    this.name = "WbdOwnerMariaDbStoreError";
    this.code = code;
  }
}

export class WbdOwnerMariaDbStore {
  constructor({ database, pool, bootstrap, migrationFile = defaultMigrationFile }) {
    if (!pool && !database) throw new WbdOwnerMariaDbStoreError("Workspace MariaDB-configuratie ontbreekt.", "DATABASE_CONFIG_MISSING");
    if (typeof bootstrap !== "function") throw new WbdOwnerMariaDbStoreError("WBD-owner bootstrap ontbreekt.", "OWNER_BOOTSTRAP_MISSING");
    this.pool = pool ?? mariadb.createPool(databaseOptions(database));
    this.ownsPool = !pool;
    this.bootstrap = bootstrap;
    this.migrationFile = path.resolve(migrationFile);
  }

  async initialize() {
    const migrationBody = await readFile(this.migrationFile, "utf8");
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const migrationRows = await connection.query(
        "SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ? FOR UPDATE",
        [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION],
      );
      if (migrationRows.length !== 1) throw new WbdOwnerMariaDbStoreError("Verplichte WBD-owner migratie ontbreekt.", "DATABASE_MIGRATION_MISSING");
      if (migrationRows[0].checksum !== sha256(migrationBody)) throw new WbdOwnerMariaDbStoreError("WBD-owner migratie wijkt af van het releasecontract.", "DATABASE_MIGRATION_CHECKSUM_MISMATCH");
      const rows = await connection.query("SELECT revision, state_json FROM wbd_owner_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (rows.length === 0) {
        const state = validateWbdOwnerState(await this.bootstrap());
        await connection.query(
          "INSERT INTO wbd_owner_state (organization_id, schema_version, revision, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
          [state.organizationId, state.schemaVersion, state.revision, JSON.stringify(state)],
        );
      } else {
        const state = validateWbdOwnerState(jsonValue(rows[0].state_json));
        if (Number(rows[0].revision) !== state.revision) throw new WbdOwnerMariaDbStoreError("WBD-owner revisie is inconsistent.", "DATABASE_REVISION_MISMATCH");
      }
      await connection.commit();
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause instanceof WbdOwnerMariaDbStoreError) throw cause;
      throw new WbdOwnerMariaDbStoreError("WBD-owner MariaDB-initialisatie is mislukt.", "DATABASE_INITIALIZATION_FAILED", cause);
    } finally {
      connection.release();
    }
  }

  async read() {
    const rows = await this.pool.query("SELECT revision, state_json FROM wbd_owner_state WHERE organization_id = ?", [ORGANIZATION_ID]);
    if (rows.length !== 1) throw new WbdOwnerMariaDbStoreError("WBD-owner state ontbreekt.", "DATABASE_STATE_MISSING");
    const state = validateWbdOwnerState(jsonValue(rows[0].state_json));
    if (Number(rows[0].revision) !== state.revision) throw new WbdOwnerMariaDbStoreError("WBD-owner revisie is inconsistent.", "DATABASE_REVISION_MISMATCH");
    return state;
  }

  async mutate(mutator) {
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const rows = await connection.query("SELECT revision, state_json FROM wbd_owner_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (rows.length !== 1) throw new WbdOwnerMariaDbStoreError("WBD-owner state ontbreekt.", "DATABASE_STATE_MISSING");
      const current = validateWbdOwnerState(jsonValue(rows[0].state_json));
      if (Number(rows[0].revision) !== current.revision) throw new WbdOwnerMariaDbStoreError("WBD-owner revisie is inconsistent.", "DATABASE_REVISION_MISMATCH");
      const result = await mutator(structuredClone(current));
      const next = validateWbdOwnerState(result.state);
      next.revision = current.revision + 1;
      const update = await connection.query(
        "UPDATE wbd_owner_state SET schema_version = ?, revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?",
        [next.schemaVersion, next.revision, JSON.stringify(next), ORGANIZATION_ID, current.revision],
      );
      if (Number(update.affectedRows) !== 1) throw new WbdOwnerMariaDbStoreError("Gelijktijdige WBD-owner wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      await connection.commit();
      return { state: next, value: result.value };
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      if (cause?.statusCode || cause instanceof WbdOwnerMariaDbStoreError) throw cause;
      throw new WbdOwnerMariaDbStoreError("WBD-owner MariaDB-transactie is mislukt.", "DATABASE_TRANSACTION_FAILED", cause);
    } finally {
      connection.release();
    }
  }

  async storageStatus() {
    return { engine: "mariadb" };
  }

  async close() {
    if (this.ownsPool) await this.pool.end();
  }

  async #connection() {
    try { return await this.pool.getConnection(); } catch (cause) { throw new WbdOwnerMariaDbStoreError("Workspace MariaDB is niet bereikbaar.", "DATABASE_CONNECTION_FAILED", cause); }
  }
}

export const wbdOwnerMariaDbMigrationContract = Object.freeze({
  component: MIGRATION_COMPONENT,
  version: REQUIRED_MIGRATION_VERSION,
  file: defaultMigrationFile,
});
