import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";

import { WbdOwnerDomainMariaDbStore } from "./wbd-owner-domain-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";

export async function runWbdOwnerDomainBackfill(environment = process.env) {
  const canaryDatabase = String(environment.CANARY_WORKSPACE_DB ?? "").trim();
  const pool = canaryDatabase
    ? mariadb.createPool({ socketPath: "/run/mysqld/mysqld.sock", user: "root", database: canaryDatabase, connectionLimit: 2, acquireTimeout: 5_000, connectTimeout: 5_000, timezone: "Z", charset: "utf8mb4", multipleStatements: false })
    : null;
  const store = new WbdOwnerDomainMariaDbStore(pool ? { pool } : { database: productionDatabaseCredentialsFromEnvironment(environment).workspace });
  try { return await store.backfillLegacySource(); }
  finally {
    await store.close();
    if (pool) await pool.end().catch(() => undefined);
  }
}

async function main(environment = process.env) {
  if (environment.NODE_ENV !== "production" || environment.WBD_RELEASEBROKER_LOCK_HELD !== "true") throw new Error("WBD-owner domeinbackfill vereist production mode en de releasebrokerlock.");
  process.stdout.write(`${JSON.stringify(await runWbdOwnerDomainBackfill(environment))}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
