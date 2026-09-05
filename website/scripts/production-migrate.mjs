import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mariadb from "mariadb";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsRoot = path.resolve(scriptDirectory, "..", "sportpaleis-server", "production-migrations");
const targetDefinitions = Object.freeze({
  workspace: { directory: "workspace", component: "sportpaleis-runtime-state", prefix: "WORKSPACE" },
  atlas: { directory: "atlas", component: "atlas-runtime-boundary", prefix: "ATLAS" },
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function splitMigrationStatements(sql) {
  const statements = [];
  let current = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === "\n") { lineComment = false; current += character; }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (!quote && character === "-" && next === "-" && /\s/u.test(sql[index + 2] ?? "")) { lineComment = true; index += 1; continue; }
    if (!quote && character === "#") { lineComment = true; continue; }
    if (!quote && character === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (quote) {
      current += character;
      if (character === "\\" && next !== undefined) { current += next; index += 1; continue; }
      if (character === quote && next === quote) { current += next; index += 1; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (["'", '"', "`"].includes(character)) { quote = character; current += character; continue; }
    if (character === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (quote || blockComment) throw new Error("Migratie bevat een niet-afgesloten quote of comment.");
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function required(environment, name) {
  const value = String(environment[name] ?? "").trim();
  if (!value) throw new Error(`${name} is verplicht.`);
  return value;
}

function port(environment, name) {
  const value = Number(environment[name] || 3306);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) throw new Error(`${name} is ongeldig.`);
  return value;
}

export function migrationDatabaseConfig(target, environment = process.env) {
  const definition = targetDefinitions[target];
  if (!definition) throw new Error("Migration target moet workspace of atlas zijn.");
  return {
    host: required(environment, `${definition.prefix}_DB_HOST`),
    port: port(environment, `${definition.prefix}_DB_PORT`),
    name: required(environment, `${definition.prefix}_DB_NAME`),
    user: required(environment, "WBD_MIGRATOR_USER"),
    password: required(environment, "WBD_MIGRATOR_PASSWORD"),
  };
}

async function migrationFiles(target) {
  const definition = targetDefinitions[target];
  if (!definition) throw new Error("Migration target moet workspace of atlas zijn.");
  const directory = path.join(migrationsRoot, definition.directory);
  const names = (await readdir(directory)).filter((name) => /^\d{3}-[a-z0-9-]+\.sql$/u.test(name)).sort();
  const files = await Promise.all(names.map(async (name) => {
    const version = Number(name.slice(0, 3));
    const filePath = path.join(directory, name);
    const sql = await readFile(filePath, "utf8");
    return { version, name, sql, checksum: sha256(sql) };
  }));
  const duplicates = files.filter(({ version }, index) => files.findIndex((candidate) => candidate.version === version) !== index);
  if (duplicates.length) throw new Error(`${target} bevat dubbele migratieversies: ${[...new Set(duplicates.map(({ version }) => version))].join(", ")}.`);
  return files;
}

export async function runProductionMigrations({ target, database, mode = "apply", pool: suppliedPool }) {
  const definition = targetDefinitions[target];
  if (!definition) throw new Error("Migration target moet workspace of atlas zijn.");
  if (!new Set(["apply", "status"]).has(mode)) throw new Error("Migration mode moet apply of status zijn.");
  const pool = suppliedPool ?? mariadb.createPool({
    host: database.host,
    port: database.port,
    database: database.name,
    user: database.user,
    password: database.password,
    connectionLimit: 2,
    acquireTimeout: 5_000,
    connectTimeout: 5_000,
    multipleStatements: false,
    timezone: "Z",
    charset: "utf8mb4",
  });
  const ownsPool = !suppliedPool;
  const results = [];
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(`CREATE TABLE IF NOT EXISTS wbd_schema_migrations (
      component VARCHAR(80) NOT NULL,
      version INT UNSIGNED NOT NULL,
      name VARCHAR(180) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL,
      PRIMARY KEY (component, version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    for (const migration of await migrationFiles(target)) {
      const rows = await connection.query(
        "SELECT name, checksum, applied_at FROM wbd_schema_migrations WHERE component = ? AND version = ?",
        [definition.component, migration.version],
      );
      if (rows.length === 1) {
        if (rows[0].checksum !== migration.checksum || rows[0].name !== migration.name) {
          throw new Error(`${target} migration ${migration.version} checksum/name mismatch.`);
        }
        results.push({ version: migration.version, name: migration.name, status: "applied", checksum: migration.checksum });
        continue;
      }
      if (mode === "status") {
        results.push({ version: migration.version, name: migration.name, status: "pending", checksum: migration.checksum });
        continue;
      }
      await connection.beginTransaction();
      try {
        const statements = splitMigrationStatements(migration.sql);
        if (statements.length === 0) throw new Error(`${target} migration ${migration.version} bevat geen uitvoerbare SQL.`);
        for (const statement of statements) await connection.query(statement);
        await connection.query(
          "INSERT INTO wbd_schema_migrations (component, version, name, checksum, applied_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))",
          [definition.component, migration.version, migration.name, migration.checksum],
        );
        await connection.commit();
        results.push({ version: migration.version, name: migration.name, status: "applied-now", checksum: migration.checksum });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
    return { target, mode, database: database.name, results };
  } finally {
    connection?.release();
    if (ownsPool) await pool.end();
  }
}

async function main(argv = process.argv.slice(2), environment = process.env) {
  const [target, option] = argv;
  const mode = option === "--status" ? "status" : option === undefined ? "apply" : null;
  if (!mode) throw new Error("Gebruik: node scripts/production-migrate.mjs <workspace|atlas> [--status]");
  if (environment.NODE_ENV !== "production" && environment.ALLOW_ISOLATED_MIGRATION_TEST !== "true") {
    throw new Error("Migraties zijn alleen toegestaan met NODE_ENV=production of de geïsoleerde testgrens.");
  }
  const result = await runProductionMigrations({ target, mode, database: migrationDatabaseConfig(target, environment) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Migration failed"}\n`);
    process.exitCode = 1;
  });
}

