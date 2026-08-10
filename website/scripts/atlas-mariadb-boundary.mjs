import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationFile = path.resolve(
  scriptDirectory,
  "..",
  "sportpaleis-server",
  "production-migrations",
  "atlas",
  "001-runtime-boundary.sql",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function verifyAtlasMariaDbBoundary(database, suppliedPool) {
  const pool = suppliedPool ?? mariadb.createPool({
    host: database.host,
    port: database.port,
    database: database.name,
    user: database.user,
    password: database.password,
    connectionLimit: 1,
    acquireTimeout: 5_000,
    connectTimeout: 5_000,
    timezone: "Z",
    charset: "utf8mb4",
  });
  const ownsPool = !suppliedPool;
  let connection;
  try {
    connection = await pool.getConnection();
    const checksum = sha256(await readFile(migrationFile, "utf8"));
    const rows = await connection.query(
      "SELECT checksum FROM wbd_schema_migrations WHERE component = ? AND version = ?",
      ["atlas-runtime-boundary", 1],
    );
    if (rows.length !== 1 || rows[0].checksum !== checksum) {
      throw new Error("Atlas MariaDB-migratie ontbreekt of wijkt af van het releasecontract.");
    }
    await connection.query("SELECT 1 AS atlas_boundary_ready");
    return { status: "ready", mode: "boundary-only", database: database.name };
  } finally {
    connection?.release();
    if (ownsPool) await pool.end();
  }
}
