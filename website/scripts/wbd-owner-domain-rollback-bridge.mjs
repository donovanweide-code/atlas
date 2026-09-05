import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";

import { WbdOwnerDomainMariaDbStore } from "./wbd-owner-domain-mariadb-store.mjs";
import { validateWbdOwnerState } from "./wbd-owner-foundation.mjs";
import { sha256WbdOwnerCanonicalJson, WBD_OWNER_ORGANIZATION_ID } from "./wbd-owner-domain-state.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";

// Offline rollback compatibility bridge only. The releasebroker must stop
// application writes and hold its deployment lock before invoking this code.
export async function materializeWbdOwnerLegacyRollbackSource({ database, expectedGlobalRevision, expectedDomainHash, pool: suppliedPool }) {
  const pool = suppliedPool ?? mariadb.createPool({ ...database, connectionLimit: 2, multipleStatements: false, timezone: "Z", charset: "utf8mb4" });
  const ownsPool = !suppliedPool;
  const store = new WbdOwnerDomainMariaDbStore({ pool });
  try {
    await store.initialize();
    const snapshot = validateWbdOwnerState(await store.read());
    if (expectedGlobalRevision != null && Number(snapshot.revision) !== Number(expectedGlobalRevision)) throw new Error("Owner-rollbackbridge weigerde revision-drift.");
    const stateSha256 = sha256WbdOwnerCanonicalJson(snapshot);
    if (expectedDomainHash && stateSha256 !== expectedDomainHash) throw new Error("Owner-rollbackbridge weigerde domeinhash-drift.");
    const serialized = JSON.stringify(snapshot);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const meta = await connection.query("SELECT global_revision FROM wbd_owner_domain_meta WHERE organization_id = ? FOR UPDATE", [WBD_OWNER_ORGANIZATION_ID]);
      if (meta.length !== 1 || Number(meta[0].global_revision) !== Number(snapshot.revision)) throw new Error("Owner-rollbackbridge verloor de domeinrevision-lock.");
      const legacy = await connection.query("SELECT revision FROM wbd_owner_state WHERE organization_id = ? FOR UPDATE", [WBD_OWNER_ORGANIZATION_ID]);
      if (legacy.length !== 1) throw new Error("Owner legacy-rollbackdoel ontbreekt.");
      const update = await connection.query(
        "UPDATE wbd_owner_state SET schema_version = ?, revision = ?, state_json = ?, updated_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND revision = ?",
        [snapshot.schemaVersion, snapshot.revision, serialized, WBD_OWNER_ORGANIZATION_ID, Number(legacy[0].revision)],
      );
      if (Number(update.affectedRows) !== 1) throw new Error("Owner-rollbackmaterialisatie verloor concurrencycontrole.");
      await connection.commit();
      return Object.freeze({
        organizationId: WBD_OWNER_ORGANIZATION_ID,
        revision: snapshot.revision,
        stateSha256,
        serializedBytes: Buffer.byteLength(serialized),
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
  if (environment.NODE_ENV !== "production" || environment.WBD_RELEASEBROKER_LOCK_HELD !== "true") throw new Error("Owner-rollbackbridge vereist production mode en de releasebrokerlock.");
  const result = await materializeWbdOwnerLegacyRollbackSource({
    database: productionDatabaseCredentialsFromEnvironment(environment).workspace,
    expectedGlobalRevision: environment.EXPECTED_OWNER_DOMAIN_REVISION ? Number(environment.EXPECTED_OWNER_DOMAIN_REVISION) : null,
    expectedDomainHash: String(environment.EXPECTED_OWNER_DOMAIN_STATE_SHA256 ?? "").trim() || null,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
