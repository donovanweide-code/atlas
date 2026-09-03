import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
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
const DIRECT_STATE_WRITE_MAX_BYTES = 8 * 1024 * 1024;
const MAX_DECOMPRESSED_STATE_BYTES = 128 * 1024 * 1024;
const COMPRESSED_STATE_ENCODING = "WBD_GZIP_BASE64_V1";

export class SportpaleisMariaDbStoreError extends Error {
  constructor(message, code = "MARIADB_STORE_ERROR", cause) {
    super(message, { cause });
    this.name = "SportpaleisMariaDbStoreError";
    this.code = code;
  }
}

const STARTUP_CAUSE_CLASSES = Object.freeze({
  DNS_CONNECT: "DNS/CONNECT",
  AUTH: "AUTH",
  TLS: "TLS",
  DATABASE_NOT_FOUND: "DATABASE_NOT_FOUND",
  PERMISSION: "PERMISSION",
  SCHEMA: "SCHEMA",
  DRIVER_CONFIG: "DRIVER/CONFIG",
  TIMEOUT: "TIMEOUT",
});

export function secretSafeMariaDbStartupDiagnostic(error) {
  const chain = [];
  for (let current = error; current && chain.length < 6; current = current.cause) chain.push(current);
  const codes = chain.map(({ code }) => String(code ?? "").toUpperCase()).filter(Boolean);
  const joined = codes.join(" ");
  let causeClass = STARTUP_CAUSE_CLASSES.DRIVER_CONFIG;
  if (/ETIMEDOUT|POOL_ACQUIRE_TIMEOUT|ER_GET_CONNECTION_TIMEOUT/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.TIMEOUT;
  else if (/ER_ACCESS_DENIED_ERROR|ER_ACCESS_DENIED_NO_PASSWORD_ERROR/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.AUTH;
  else if (/CERT|SSL|TLS|HANDSHAKE/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.TLS;
  else if (/ER_BAD_DB_ERROR|UNKNOWN_DATABASE/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.DATABASE_NOT_FOUND;
  else if (/ER_DBACCESS_DENIED_ERROR|ER_TABLEACCESS_DENIED_ERROR|ER_COLUMNACCESS_DENIED_ERROR|ER_PROCACCESS_DENIED_ERROR|ER_COMMAND_DENIED_ERROR/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.PERMISSION;
  else if (/DATABASE_MIGRATION|DATABASE_STATE|DATABASE_REVISION|DATABASE_EVIDENCE|ER_NO_SUCH_TABLE|ER_BAD_FIELD_ERROR|ER_PARSE_ERROR|DATABASE_INITIALIZATION_FAILED/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.SCHEMA;
  else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|DATABASE_CONNECTION_FAILED/u.test(joined)) causeClass = STARTUP_CAUSE_CLASSES.DNS_CONNECT;
  return Object.freeze({
    causeClass,
    errorCode: String(error?.code ?? "INTERNAL_ERROR"),
    causeCode: String(chain.slice(1).find(({ code }) => code)?.code ?? "UNCLASSIFIED_CAUSE"),
    causeErrno: chain.slice(1).find(({ errno }) => Number.isInteger(errno))?.errno ?? null,
    causeSqlState: String(chain.slice(1).find(({ sqlState }) => sqlState)?.sqlState ?? "") || null,
  });
}

function withTransactionOutcome(error, { phase, rollbackStatus, rollbackError = null }) {
  if ((typeof error !== "object" && typeof error !== "function") || error === null) return error;
  for (const [key, value] of Object.entries({ transactionPhase: phase, transactionRollbackStatus: rollbackStatus })) {
    Object.defineProperty(error, key, { configurable: true, value });
  }
  if (rollbackError) Object.defineProperty(error, "transactionRollbackError", { configurable: true, value: rollbackError });
  return error;
}

async function rollbackWithStatus(connection) {
  try {
    await connection.rollback();
    return { status: "succeeded", error: null };
  } catch (error) {
    return { status: "failed", error };
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function decodeSportpaleisRuntimeState(value) {
  const parsed = typeof value === "string"
    ? JSON.parse(value)
    : Buffer.isBuffer(value)
      ? JSON.parse(value.toString("utf8"))
      : structuredClone(value);
  if (parsed?.encoding !== COMPRESSED_STATE_ENCODING) return parsed;
  if (typeof parsed.payload !== "string"
    || !/^[a-f0-9]{64}$/u.test(String(parsed.sha256))
    || !Number.isInteger(parsed.uncompressedBytes)
    || parsed.uncompressedBytes < 1
    || parsed.uncompressedBytes > MAX_DECOMPRESSED_STATE_BYTES
    || !Number.isInteger(parsed.compressedBytes)
    || parsed.compressedBytes < 1) {
    throw new SportpaleisMariaDbStoreError("Gecomprimeerde Workspace-state heeft ongeldige metadata.", "DATABASE_STATE_ENCODING_INVALID");
  }
  try {
    const compressed = Buffer.from(parsed.payload, "base64");
    if (compressed.byteLength !== parsed.compressedBytes) throw new Error("compressed-byte-count-mismatch");
    const raw = gunzipSync(compressed, { maxOutputLength: MAX_DECOMPRESSED_STATE_BYTES });
    if (raw.byteLength !== parsed.uncompressedBytes || sha256(raw) !== parsed.sha256) throw new Error("state-integrity-mismatch");
    return JSON.parse(raw.toString("utf8"));
  } catch (error) {
    if (error instanceof SportpaleisMariaDbStoreError) throw error;
    throw new SportpaleisMariaDbStoreError("Gecomprimeerde Workspace-state kon niet integer worden gelezen.", "DATABASE_STATE_ENCODING_INVALID", error);
  }
}

function immutableSnapshot(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) immutableSnapshot(nested);
  return Object.freeze(value);
}

export function encodeSportpaleisRuntimeState(state) {
  const raw = JSON.stringify(state);
  const uncompressedBytes = Buffer.byteLength(raw, "utf8");
  if (uncompressedBytes <= DIRECT_STATE_WRITE_MAX_BYTES) return { serialized: raw, encoding: "PLAIN_JSON", uncompressedBytes, storedBytes: uncompressedBytes };
  const compressed = gzipSync(raw, { level: 9 });
  const serialized = JSON.stringify({
    encoding: COMPRESSED_STATE_ENCODING,
    sha256: sha256(raw),
    uncompressedBytes,
    compressedBytes: compressed.byteLength,
    payload: compressed.toString("base64"),
  });
  const storedBytes = Buffer.byteLength(serialized, "utf8");
  if (storedBytes > DIRECT_STATE_WRITE_MAX_BYTES) {
    throw new SportpaleisMariaDbStoreError(
      "Workspace-state past ook na veilige compressie niet binnen het begrensde databasepakket.",
      "DATABASE_STATE_PACKET_BUDGET_EXCEEDED",
    );
  }
  return { serialized, encoding: COMPRESSED_STATE_ENCODING, uncompressedBytes, storedBytes };
}

export async function updateSportpaleisRuntimeState(connection, state, previousRevision) {
  const encoded = encodeSportpaleisRuntimeState(state);
  return connection.query(
    "UPDATE sp_runtime_state SET schema_version = ?, revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?",
    [state.schemaVersion, state.revision, encoded.serialized, state.organizationId, previousRevision],
  );
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
    this.cachedState = null;
    this.cachedRevision = null;
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
        this.#remember(state);
      } else {
        const persistedState = decodeSportpaleisRuntimeState(rows[0].state_json);
        const state = validateSportpaleisPilotState(structuredClone(persistedState));
        if (Number(rows[0].revision) !== Number(state.revision)) {
          throw new SportpaleisMariaDbStoreError(
            "Workspace-state heeft een ongeldige revisie.",
            "DATABASE_REVISION_MISMATCH",
          );
        }
        const persistedProductionJobIds = new Set((persistedState.productionJobs ?? []).map(({ id }) => id));
        const addedImmutableEvidence = state.productionJobs.filter(({ id }) => !persistedProductionJobIds.has(id));
        if (addedImmutableEvidence.length > 0) {
          const previousRevision = state.revision;
          state.revision = previousRevision + 1;
          const update = await updateSportpaleisRuntimeState(connection, state, previousRevision);
          if (Number(update.affectedRows) !== 1) {
            throw new SportpaleisMariaDbStoreError(
              "Immutable productie-evidence kon niet duurzaam worden geregistreerd.",
              "DATABASE_EVIDENCE_MIGRATION_CONFLICT",
            );
          }
        }
        this.#remember(state);
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

  async readSnapshot() {
    if (this.cachedState && this.cachedRevision !== null) {
      const revisionRows = await this.pool.query(
        "SELECT revision FROM sp_runtime_state WHERE organization_id = ?",
        ["sport-2000-sportpaleis-bv"],
      );
      if (revisionRows.length === 1 && Number(revisionRows[0].revision) === this.cachedRevision) {
        return this.cachedState;
      }
    }
    const rows = await this.pool.query(
      "SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ?",
      ["sport-2000-sportpaleis-bv"],
    );
    if (rows.length !== 1) {
      throw new SportpaleisMariaDbStoreError("Workspace-productiestate ontbreekt.", "DATABASE_STATE_MISSING");
    }
    const state = validateSportpaleisPilotState(decodeSportpaleisRuntimeState(rows[0].state_json));
    if (Number(rows[0].revision) !== Number(state.revision)) {
      throw new SportpaleisMariaDbStoreError("Workspace-state heeft een ongeldige revisie.", "DATABASE_REVISION_MISMATCH");
    }
    this.#remember(state);
    return this.cachedState;
  }

  async read() {
    return structuredClone(await this.readSnapshot());
  }

  async mutate(mutator) {
    const connection = await this.#connection();
    let phase = "begin";
    try {
      await connection.beginTransaction();
      phase = "read";
      const rows = await connection.query(
        "SELECT revision, state_json FROM sp_runtime_state WHERE organization_id = ? FOR UPDATE",
        ["sport-2000-sportpaleis-bv"],
      );
      if (rows.length !== 1) {
        throw new SportpaleisMariaDbStoreError("Workspace-productiestate ontbreekt.", "DATABASE_STATE_MISSING");
      }
      const current = validateSportpaleisPilotState(decodeSportpaleisRuntimeState(rows[0].state_json));
      if (Number(rows[0].revision) !== Number(current.revision)) {
        throw new SportpaleisMariaDbStoreError("Workspace-state heeft een ongeldige revisie.", "DATABASE_REVISION_MISMATCH");
      }
      phase = "mutator";
      const result = await mutator(structuredClone(current));
      phase = "state-validation";
      const next = validateSportpaleisPilotState(result.state);
      next.revision = current.revision + 1;
      phase = "write";
      const update = await updateSportpaleisRuntimeState(connection, next, current.revision);
      if (Number(update.affectedRows) !== 1) {
        throw new SportpaleisMariaDbStoreError("Gelijktijdige Workspace-wijziging is geweigerd.", "DATABASE_CONCURRENCY_CONFLICT");
      }
      phase = "commit";
      await connection.commit();
      this.#remember(next);
      return { state: next, value: result.value };
    } catch (error) {
      const rollback = await rollbackWithStatus(connection);
      if (phase === "mutator" && rollback.status === "succeeded") {
        throw withTransactionOutcome(error, { phase, rollbackStatus: rollback.status });
      }
      if (error instanceof SportpaleisMariaDbStoreError && rollback.status === "succeeded") {
        throw withTransactionOutcome(error, { phase, rollbackStatus: rollback.status });
      }
      const failure = new SportpaleisMariaDbStoreError("Workspace MariaDB-transactie is mislukt.", "DATABASE_TRANSACTION_FAILED", error);
      throw withTransactionOutcome(failure, { phase, rollbackStatus: rollback.status, rollbackError: rollback.error });
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

  #remember(state) {
    this.cachedState = immutableSnapshot(structuredClone(state));
    this.cachedRevision = Number(state.revision);
  }
}

export const sportpaleisMariaDbMigrationContract = Object.freeze({
  component: MIGRATION_COMPONENT,
  version: REQUIRED_MIGRATION_VERSION,
  file: defaultMigrationFile,
});
