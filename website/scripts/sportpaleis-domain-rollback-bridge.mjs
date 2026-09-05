import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";

import { encodeSportpaleisRuntimeState } from "./sportpaleis-mariadb-store.mjs";
import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";
import { sha256CanonicalJson } from "./workspace-domain-state.mjs";

const ORGANIZATION_ID = "sport-2000-sportpaleis-bv";

// Offline compatibility bridge only. The releasebroker must stop application
// writes and hold its deployment lock before invoking this operation.
export async function materializeLegacyRollbackState({ database, expectedGlobalRevision, expectedDomainHash, pool: suppliedPool }) {
  const pool = suppliedPool ?? mariadb.createPool({ ...database, connectionLimit: 2, multipleStatements: false, timezone: "Z", charset: "utf8mb4" });
  const ownsPool = !suppliedPool;
  const store = new SportpaleisDomainMariaDbStore({ pool });
  try {
    await store.initialize();
    const snapshot = await store.readSnapshot();
    if (expectedGlobalRevision != null && Number(snapshot.revision) !== Number(expectedGlobalRevision)) throw new Error("Rollbackbridge weigerde revision-drift.");
    const snapshotHash = sha256CanonicalJson(snapshot);
    if (expectedDomainHash && snapshotHash !== expectedDomainHash) throw new Error("Rollbackbridge weigerde domeinhash-drift.");
    const encoded = encodeSportpaleisRuntimeState(snapshot);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const meta = await connection.query("SELECT global_revision FROM sp_workspace_domain_meta WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (meta.length !== 1 || Number(meta[0].global_revision) !== Number(snapshot.revision)) throw new Error("Rollbackbridge verloor de domeinrevision-lock.");
      const legacy = await connection.query("SELECT revision FROM sp_runtime_state WHERE organization_id = ? FOR UPDATE", [ORGANIZATION_ID]);
      if (legacy.length !== 1) throw new Error("Legacy rollbackdoel ontbreekt.");
      const update = await connection.query(
        "UPDATE sp_runtime_state SET schema_version = ?, revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?",
        [snapshot.schemaVersion, snapshot.revision, encoded.serialized, ORGANIZATION_ID, Number(legacy[0].revision)],
      );
      if (Number(update.affectedRows) !== 1) throw new Error("Legacy rollbackmaterialisatie verloor concurrencycontrole.");
      await connection.commit();
      return Object.freeze({
        organizationId: ORGANIZATION_ID,
        revision: snapshot.revision,
        stateSha256: snapshotHash,
        encodedSha256: createHash("sha256").update(encoded.serialized).digest("hex"),
        encoding: encoded.encoding,
        rollbackConsumer: "R2.26.38_COMPATIBLE",
      });
    } catch (cause) {
      await connection.rollback().catch(() => undefined);
      throw cause;
    } finally {
      connection.release();
    }
  } finally {
    await store.close();
    if (ownsPool) await pool.end().catch(() => undefined);
  }
}

async function main(environment = process.env) {
  if (environment.NODE_ENV !== "production" || environment.WBD_RELEASEBROKER_LOCK_HELD !== "true") throw new Error("Rollbackbridge vereist production mode en de releasebrokerlock.");
  const result = await materializeLegacyRollbackState({
    database: productionDatabaseCredentialsFromEnvironment(environment).workspace,
    expectedGlobalRevision: environment.EXPECTED_DOMAIN_REVISION ? Number(environment.EXPECTED_DOMAIN_REVISION) : null,
    expectedDomainHash: String(environment.EXPECTED_DOMAIN_STATE_SHA256 ?? "").trim() || null,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
