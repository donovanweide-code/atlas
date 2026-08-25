import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";
import { validateReleaseContract } from "./release-engine-core.mjs";
import { inspectMigrationState, schemaObjectMatches } from "./release-engine-inspection.mjs";
import { LinuxReleasePlatform } from "./release-engine-platform.mjs";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function parseEnvironment(text) {
  return Object.fromEntries(String(text).split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1).replace(/^(['"])(.*)\1$/u, "$2")];
  }));
}
function required(environment, names) {
  for (const name of names) if (String(environment[name] ?? "")) return String(environment[name]);
  throw Object.assign(new Error(`${names[0]} ontbreekt.`), { code: "ENVIRONMENT_MISSING" });
}

export function assertMigrationSqlMatchesClassification(migration, sql) {
  const normalized = String(sql).replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/--[^\r\n]*/gu, " ").trim();
  const statements = normalized.split(";").map((statement) => statement.trim()).filter(Boolean);
  if (migration.classification === "ADDITIVE"
    && (statements.length !== 1 || !/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/iu.test(statements[0]) || /\b(DROP|TRUNCATE|RENAME|DELETE|UPDATE|REPLACE)\b/iu.test(statements[0]))) {
    throw Object.assign(new Error("ADDITIVE migration bevat geen enkelvoudige veilige CREATE TABLE IF NOT EXISTS DDL."), { code: "MIGRATION_CLASSIFICATION_MISMATCH" });
  }
  return true;
}

export async function applyOneMigration({ releaseId, contractHash, databaseId, migrationId, expectedChecksum, roots = {}, platformFactory, poolFactory = mariadb.createPool } = {}) {
  for (const [name, value] of Object.entries({ releaseId, databaseId, migrationId })) if (!idPattern.test(String(value ?? ""))) throw new Error(`${name} is ongeldig.`);
  if (!shaPattern.test(String(expectedChecksum ?? ""))) throw new Error("Migrationchecksum is ongeldig.");
  const releaseRoot = roots.releaseRoot ?? `/srv/wbd/releases/${releaseId}`;
  const contractRoot = roots.contractRoot ?? "/srv/wbd/release-engine/contracts";
  const stateRoot = roots.stateRoot ?? "/srv/wbd/shared/release-engine";
  const environmentFile = roots.environmentFile ?? "/etc/wbd/production.env";
  const contract = validateReleaseContract(JSON.parse(await readFile(path.join(contractRoot, `${releaseId}.release-contract.json`), "utf8")));
  if (contractHash && contract.contractHash !== contractHash) throw Object.assign(new Error("Migrationcontracthash wijkt af."), { code: "CONTRACT_HASH_MISMATCH" });
  const database = contract.databases.find((item) => item.id === databaseId);
  const migration = database?.migrations.find((item) => item.id === migrationId);
  if (!database || !migration || migration.checksum !== expectedChecksum || migration.classification !== "ADDITIVE" || !migration.compatibleWithActive) throw Object.assign(new Error("Migration valt buiten locked releasecontract."), { code: "MIGRATION_NOT_ALLOWLISTED" });
  const sqlPath = path.resolve(releaseRoot, migration.file.replace(/^website\//u, "website/"));
  if (!sqlPath.startsWith(`${path.resolve(releaseRoot)}${path.sep}`)) throw new Error("Migrationpad verlaat release-root.");
  const sql = await readFile(sqlPath, "utf8");
  if (sha256(sql) !== migration.checksum) throw Object.assign(new Error("Migrationbestandchecksum wijkt af."), { code: "MIGRATION_CHECKSUM_MISMATCH" });
  assertMigrationSqlMatchesClassification(migration, sql);
  const environment = parseEnvironment(await readFile(environmentFile, "utf8"));
  const migratorUser = required(environment, ["WBD_MIGRATOR_USER", "MIGRATOR_DB_USER"]);
  const migratorPassword = required(environment, ["WBD_MIGRATOR_PASSWORD", "MIGRATOR_DB_PASSWORD"]);
  const prefix = database.environmentPrefix;
  const resolved = new Map([
    [`${prefix}_DB_HOST`, required(environment, [`${prefix}_DB_HOST`])],
    [`${prefix}_DB_PORT`, environment[`${prefix}_DB_PORT`] || "3306"],
    [`${prefix}_DB_NAME`, required(environment, [`${prefix}_DB_NAME`])],
    [`${prefix}_DB_USER`, migratorUser],
    [`${prefix}_DB_PASSWORD`, migratorPassword],
  ]);
  const platform = platformFactory ? platformFactory() : new LinuxReleasePlatform({ stateRoot, environmentFile });
  const inspect = () => platform.inspectDatabase(contract, database, resolved);
  let actual = await inspect();
  let state = inspectMigrationState(database, actual).results.find((result) => result.kind === "migration" && result.id === migrationId);
  if (state.status === "APPLIED") return { status: "ALREADY_APPLIED", migrationId, checksum: expectedChecksum };
  const journalDirectory = path.join(stateRoot, "migration-journal", releaseId);
  const journalFile = path.join(journalDirectory, `${databaseId}-${migrationId}.json`);
  let journal = null;
  try { journal = JSON.parse(await readFile(journalFile, "utf8")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (state.status === "UNLEDGERED_SCHEMA") {
    if (journal?.status !== "APPLYING" || journal?.checksum !== expectedChecksum) throw Object.assign(new Error("Exact schema bestaat zonder geldige engine-intent; collision."), { code: "SCHEMA_COLLISION" });
  } else if (state.status === "PENDING") {
    const objects = new Map(actual.objects.map((object) => [object.name, object]));
    if (!migration.expectedPriorState.every((expected) => schemaObjectMatches(expected, objects.get(expected.name)))) throw Object.assign(new Error("Expected prior schema-state wijkt af."), { code: "SCHEMA_COLLISION" });
    await mkdir(journalDirectory, { recursive: true, mode: 0o750 });
    const intent = { releaseId, databaseId, migrationId, checksum: expectedChecksum, status: "APPLYING", startedAt: new Date().toISOString() };
    await writeFile(journalFile, `${JSON.stringify(intent)}\n`, { mode: 0o640, flag: "wx" });
    const pool = poolFactory({ host: resolved.get(`${prefix}_DB_HOST`), port: Number(resolved.get(`${prefix}_DB_PORT`)), database: resolved.get(`${prefix}_DB_NAME`), user: migratorUser, password: migratorPassword, connectionLimit: 1, multipleStatements: false, connectTimeout: 5_000, acquireTimeout: 5_000, charset: "utf8mb4", timezone: "Z" });
    try { await pool.query(sql); } finally { await pool.end(); }
    actual = await inspect();
    state = inspectMigrationState(database, actual).results.find((result) => result.kind === "migration" && result.id === migrationId);
    if (state.status !== "UNLEDGERED_SCHEMA") throw Object.assign(new Error("DDL target-state kon na apply niet exact worden bewezen."), { code: "MIGRATION_VERIFY_FAIL" });
  } else throw Object.assign(new Error(`Migration state ${state.status} blokkeert apply.`), { code: "SCHEMA_COLLISION" });
  const targetObjects = new Map(actual.objects.map((object) => [object.name, object]));
  if (!migration.targetState.every((target) => schemaObjectMatches(target, targetObjects.get(target.name)))) throw Object.assign(new Error("Target schema wijkt af; ledger blijft ongewijzigd."), { code: "SCHEMA_COLLISION" });
  const pool = poolFactory({ host: resolved.get(`${prefix}_DB_HOST`), port: Number(resolved.get(`${prefix}_DB_PORT`)), database: resolved.get(`${prefix}_DB_NAME`), user: migratorUser, password: migratorPassword, connectionLimit: 1, multipleStatements: false, connectTimeout: 5_000, acquireTimeout: 5_000, charset: "utf8mb4", timezone: "Z" });
  try {
    for (const query of migration.verificationQueries) {
      const rows = await pool.query(query);
      const first = rows?.[0] ? Object.values(rows[0])[0] : undefined;
      if (rows?.length < 1 || (typeof first === "number" || typeof first === "bigint") && Number(first) < 1) throw Object.assign(new Error("Contractuele migration verification query faalde."), { code: "MIGRATION_VERIFY_FAIL" });
    }
    await pool.query("INSERT INTO wbd_schema_migrations (component, version, name, checksum, applied_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))", [database.migrationComponent, Number(migration.id), path.basename(migration.file), migration.checksum]);
  } finally { await pool.end(); }
  const completed = { releaseId, databaseId, migrationId, checksum: expectedChecksum, status: "APPLIED", completedAt: new Date().toISOString() };
  const completedFile = `${journalFile}.complete`;
  await writeFile(completedFile, `${JSON.stringify(completed)}\n`, { mode: 0o640, flag: "wx" });
  await rename(completedFile, journalFile);
  return { status: "APPLIED", migrationId, checksum: expectedChecksum };
}

async function main() {
  const [releaseId, contractHash, databaseId, migrationId, expectedChecksum] = process.argv.slice(2);
  const result = await applyOneMigration({ releaseId, contractHash, databaseId, migrationId, expectedChecksum });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ name: error?.name, code: error?.code ?? "MIGRATION_FAILED", message: String(error?.message ?? "Migration failed").replace(/(password|secret|token|private[_-]?key)\s*[=:]\s*\S+/giu, "$1=[REDACTED]").slice(0, 2_000) })}\n`);
    process.exitCode = 1;
  });
}
