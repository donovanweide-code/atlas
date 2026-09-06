import { createHash } from "node:crypto";
import mariadb from "mariadb";

import { decodeSportpaleisRuntimeState } from "./sportpaleis-mariadb-store.mjs";
import { sha256CanonicalJson } from "./workspace-domain-state.mjs";

function poolConfiguration(database) {
  const socketPath = String(database?.socketPath ?? "").trim();
  const name = String(database?.name ?? database?.database ?? "").trim();
  const user = String(database?.user ?? "").trim();
  if (!name || !user) throw Object.assign(new Error("De geïsoleerde rollbackdatabase-identiteit ontbreekt."), { code: "LEGACY_ROLLBACK_DATABASE_INVALID" });
  return {
    ...(socketPath ? { socketPath } : { host: database.host, port: database.port }),
    database: name,
    user,
    ...(database.password ? { password: database.password } : {}),
    connectionLimit: 1,
    acquireTimeout: 5_000,
    connectTimeout: 5_000,
    idleTimeout: 30,
    bigIntAsNumber: true,
    insertIdAsNumber: true,
    timezone: "Z",
    charset: "utf8mb4",
    multipleStatements: false,
  };
}

process.on("disconnect", () => process.exit(0));
process.once("message", async ({ database, organizationId, expectedSchemaVersion, expectedGlobalRevision, expectedDomainHash, expectedEncodedHash } = {}) => {
  let pool;
  let response;
  try {
    pool = mariadb.createPool(poolConfiguration(database));
    const rows = await pool.query("SELECT schema_version, revision, state_json FROM sp_runtime_state WHERE organization_id = ?", [organizationId]);
    if (rows.length !== 1) throw Object.assign(new Error("Rollbackverificatie vond niet exact één legacy-row."), { code: "LEGACY_ROLLBACK_ROW_INVALID" });
    const row = rows[0];
    const serialized = Buffer.isBuffer(row.state_json) ? row.state_json.toString("utf8") : typeof row.state_json === "string" ? row.state_json : JSON.stringify(row.state_json);
    const decoded = decodeSportpaleisRuntimeState(row.state_json);
    const decodedSha256 = sha256CanonicalJson(decoded);
    const encodedSha256 = createHash("sha256").update(serialized).digest("hex");
    if (Number(row.schema_version) !== Number(expectedSchemaVersion)) throw Object.assign(new Error("Rollbackverificatie vond schemadrift."), { code: "LEGACY_ROLLBACK_SCHEMA_DRIFT" });
    if (Number(row.revision) !== Number(expectedGlobalRevision) || Number(decoded.revision) !== Number(expectedGlobalRevision)) throw Object.assign(new Error("Rollbackverificatie vond revisiondrift."), { code: "LEGACY_ROLLBACK_REVISION_DRIFT" });
    if (decodedSha256 !== expectedDomainHash) throw Object.assign(new Error("Rollbackverificatie vond domeinhashdrift."), { code: "LEGACY_ROLLBACK_DOMAIN_HASH_DRIFT" });
    if (encodedSha256 !== expectedEncodedHash) throw Object.assign(new Error("Rollbackverificatie vond bytehashdrift."), { code: "LEGACY_ROLLBACK_ENCODED_HASH_DRIFT" });
    await pool.end();
    pool = null;
    response = { ok: true, result: { independentlyDecodedSha256: decodedSha256, independentlyEncodedSha256: encodedSha256, independentlyReadRevision: Number(row.revision), independentlyReadSchemaVersion: Number(row.schema_version) } };
  } catch (error) {
    await pool?.end().catch(() => undefined);
    pool = null;
    response = { ok: false, error: { message: error?.message ?? "De geïsoleerde rollbackverificatie is mislukt.", code: error?.code ?? "LEGACY_ROLLBACK_VERIFICATION_FAILED" } };
  } finally {
    if (process.connected) process.send?.(response, () => process.disconnect());
  }
});
