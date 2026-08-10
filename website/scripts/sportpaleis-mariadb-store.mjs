import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";
import {
  createSportpaleisProductionBootstrap,
  validateSportpaleisPilotState,
} from "./sportpaleis-pilot-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationFile = path.resolve(
  scriptDirectory,
  "..",
  "sportpaleis-server",
  "production-migrations",
  "workspace",
  "001-runtime-state.sql",
);
const MIGRATION_COMPONENT = "sportpaleis-runtime-state";
const REQUIRED_MIGRATION_VERSION = 1;

export class SportpaleisMariaDbStoreError extends Error {
  constructor(message, code = "MARIADB_STORE_ERROR", cause) {
    super(message, { cause });
    this.name = "SportpaleisMariaDbStoreError";
    this.code = code;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

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
    connectionLimit: config.connectionLimit ?? 8,
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

async function migrationContract(filePath) {
  const body = await readFile(filePath, "utf8");
  return { body, checksum: sha256(body) };
}

export class SportpaleisMariaDbStore {
  constructor({ database, pool, bootstrap = createSportpaleisProductionBootstrap, migrationFile = defaultMigrationFile }) {
    if (!pool && !database) throw new SportpaleisMariaDbStoreError("Workspace MariaDB-configuratie ontbreekt.", "DATABASE_CONFIG_MISSING");
    this.pool = pool ?? mariadb.createPool(databaseOptions(database));
    this.ownsPool = !pool;
    this.bootstrap = bootstrap;
    this.migrationFile = path.resolve(migrationFile);
  }

  async initialize() {
    const contract = await migrationContract(this.migrationFile);
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const migrationRows = await connection.query(
        "SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ? FOR UPDATE",
        [MIGRATION_COMPONENT, REQUIRED_MIGRATION_VERSION],
      );
      if (migrationRows.length !== 1) {
        throw new SportpaleisMariaDbStoreError(
          "Verplichte Workspace-databasemigratie ontbreekt.",
          "DATABASE_MIGRATION_MISSING",
        );
      }
      if (migrationRows[0].checksum !== contract.checksum) {
        throw new SportpaleisMariaDbStoreError(
          "Workspace-databasemigratie wijkt af van het releasecontract.",
          "DATABASE_MIGRATION_CHECKSUM_MISMATCH",
        );
      }

      const rows = await connection.query(
        "SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ? FOR UPDATE",
        ["sport-2000-sportpaleis-bv"],
      );
      if (rows.length === 0) {
        const state = validateSportpaleisPilotState(await this.bootstrap());
        if (state.users.length !== 0 || state.orders.length !== 0) {
          throw new SportpaleisMariaDbStoreError(
            "Productiebootstrap bevat gebruikers of orders en is geweigerd.",
            "PRODUCTION_BOOTSTRAP_NOT_EMPTY",
          );
        }
        await connection.query(
          "INSERT INTO sp_runtime_state (organization_id, schema_version, revision, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))",
          [state.organizationId, state.schemaVersion, state.revision, JSON.stringify(state)],
        );
      } else {
        const state = validateSportpaleisPilotState(jsonValue(rows[0].state_json));
        if (Number(rows[0].revision) !== Number(state.revision)) {
          throw new SportpaleisMariaDbStoreError(
            "Workspace-state heeft een ongeldige revisie.",
            "DATABASE_REVISION_MISMATCH",
          );
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      if (error instanceof SportpaleisMariaDbStoreError) throw error;
      const code = error?.code === "ER_NO_SUCH_TABLE" ? "DATABASE_MIGRATION_MISSING" : "DATABASE_INITIALIZATION_FAILED";
      throw new SportpaleisMariaDbStoreError("Workspace MariaDB-initialisatie is mislukt.", code, error);
    } finally {
      connection.release();
    }
  }

  async read() {
    const rows = await this.pool.query(
      "SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ?",
      ["sport-2000-sportpaleis-bv"],
    );
    if (rows.length !== 1) {
      throw new SportpaleisMariaDbStoreError("Workspace-productiestate ontbreekt.", "DATABASE_STATE_MISSING");
    }
    const state = validateSportpaleisPilotState(jsonValue(rows[0].state_json));
    if (Number(rows[0].revision) !== Number(state.revision)) {
      throw new SportpaleisMariaDbStoreError("Workspace-state heeft een ongeldige revisie.", "DATABASE_REVISION_MISMATCH");
    }
    return state;
  }

  async mutate(mutator) {
    const connection = await this.#connection();
    try {
      await connection.beginTransaction();
      const rows = await connection.query(
        "SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ? FOR UPDATE",
        ["sport-2000-sportpaleis-bv"],
      );
      if (rows.length !== 1) {
        throw new SportpaleisMariaDbStoreError("Workspace-productiestate ontbreekt.", "DATABASE_STATE_MISSING");
      }
      const current = validateSportpaleisPilotState(jsonValue(rows[0].state_json));
      if (Number(rows[0].revision) !== Number(current.revision)) {
        throw new SportpaleisMariaDbStoreError("Workspace-state heeft een ongeldige revisie.", "DATABASE_REVISION_MISMATCH");
      }
      const result = await mutator(structuredClone(current));
      const next = validateSportpaleisPilotState(result.state);
      next.revision = current.revision + 1;
      const update = await connection.query(
        "UPDATE sp_runtime_state SET schema_version = ?, revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?",
        [next.schemaVersion, next.revision, JSON.stringify(next), next.organizationId, current.revision],
      );
      if (Number(update.affectedRows) !== 1) {
        throw new SportpaleisMariaDbStoreError("Gelijktijdige Workspace-wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      }
      await connection.commit();
      return { state: next, value: result.value };
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      if (error instanceof SportpaleisMariaDbStoreError) throw error;
      throw new SportpaleisMariaDbStoreError("Workspace MariaDB-transactie is mislukt.", "DATABASE_TRANSACTION_FAILED", error);
    } finally {
      connection.release();
    }
  }

  async latestBackupStatus() {
    return {
      status: "external",
      strategy: "encrypted-logical-dump-plus-provider-backup",
    };
  }

  async storageStatus() {
    const state = await this.read();
    return { engine: "mariadb", storageBytes: Buffer.byteLength(JSON.stringify(state)) };
  }

  async close() {
    if (this.ownsPool) await this.pool.end();
  }

  async #connection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      throw new SportpaleisMariaDbStoreError("Workspace MariaDB is niet bereikbaar.", "DATABASE_CONNECTION_FAILED", error);
    }
  }
}

export const sportpaleisMariaDbMigrationContract = Object.freeze({
  component: MIGRATION_COMPONENT,
  version: REQUIRED_MIGRATION_VERSION,
  file: defaultMigrationFile,
});
