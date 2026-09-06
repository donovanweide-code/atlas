import mariadb from "mariadb";

import { materializeLegacyRollbackState } from "./sportpaleis-domain-rollback-bridge.mjs";

process.on("disconnect", () => process.exit(0));
process.once("message", async ({ database, expectedGlobalRevision, expectedDomainHash } = {}) => {
  let pool;
  let response;
  try {
    const socketPath = String(database?.socketPath ?? "").trim();
    const name = String(database?.name ?? database?.database ?? "").trim();
    const user = String(database?.user ?? "").trim();
    if (!name || !user) throw Object.assign(new Error("De geïsoleerde rollbackdatabase-identiteit ontbreekt."), { code: "LEGACY_ROLLBACK_DATABASE_INVALID" });
    pool = mariadb.createPool({
      ...(socketPath ? { socketPath } : { host: database.host, port: database.port }),
      database: name,
      user,
      ...(database.password ? { password: database.password } : {}),
      connectionLimit: 2,
      acquireTimeout: 5_000,
      connectTimeout: 5_000,
      idleTimeout: 30,
      bigIntAsNumber: true,
      insertIdAsNumber: true,
      timezone: "Z",
      charset: "utf8mb4",
      multipleStatements: false,
    });
    const result = await materializeLegacyRollbackState({ pool, expectedGlobalRevision, expectedDomainHash });
    await pool.end();
    pool = null;
    response = { ok: true, result };
  } catch (error) {
    await pool?.end().catch(() => undefined);
    pool = null;
    response = { ok: false, error: { message: error?.message ?? "De geïsoleerde rollbackmaterialisatie is mislukt.", code: error?.code ?? "LEGACY_ROLLBACK_ISOLATION_FAILED" } };
  } finally {
    if (process.connected) process.send?.(response, () => process.disconnect());
  }
});
