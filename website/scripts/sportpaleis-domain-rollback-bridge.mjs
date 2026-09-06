import { fork } from "node:child_process";
import { constants as osConstants, setPriority } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";

import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";
import { encodeLegacyRollbackStateIsolated } from "./workspace-legacy-state-encode.mjs";

const ORGANIZATION_ID = "sport-2000-sportpaleis-bv";
const ISOLATED_ROLLBACK_TIMEOUT_MS = 60_000;

export function materializeLegacyRollbackStateIsolated({ database, expectedGlobalRevision, expectedDomainHash }, { timeoutMs = ISOLATED_ROLLBACK_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = fork(new URL("./sportpaleis-domain-rollback-child.mjs", import.meta.url), [], {
      serialization: "advanced",
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      windowsHide: true,
      execArgv: ["--max-old-space-size=768", "--max-semi-space-size=64"],
    });
    let settled = false;
    let response = null;
    const finish = (callback, value, { terminate = false } = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("error", onError);
      child.off("exit", onExit);
      if (terminate) {
        if (child.connected) child.disconnect();
        child.kill();
      }
      callback(value);
    };
    const failure = (message, code = "LEGACY_ROLLBACK_ISOLATION_FAILED") => Object.assign(new Error(message), { code });
    const onMessage = (message) => { response = message; };
    const onError = () => finish(reject, failure("De geïsoleerde rollbackmaterialisatie kon niet worden uitgevoerd."), { terminate: true });
    const onExit = (code) => {
      if (code !== 0) return finish(reject, failure("De geïsoleerde rollbackmaterialisatie stopte onverwacht."));
      if (!response) return finish(reject, failure("De geïsoleerde rollbackmaterialisatie gaf geen resultaat."));
      return response.ok
        ? finish(resolve, Object.freeze({ ...response.result, isolatedProcessExitConfirmed: true }))
        : finish(reject, failure(response?.error?.message ?? "De geïsoleerde rollbackmaterialisatie is mislukt.", response?.error?.code));
    };
    const timer = setTimeout(() => finish(reject, failure("De geïsoleerde rollbackmaterialisatie duurde te lang.", "LEGACY_ROLLBACK_ISOLATION_TIMEOUT"), { terminate: true }), Math.max(1_000, Number(timeoutMs) || ISOLATED_ROLLBACK_TIMEOUT_MS));
    timer.unref?.();
    child.on("message", onMessage);
    child.once("error", onError);
    child.once("exit", onExit);
    try {
      setPriority(child.pid, osConstants.priority.PRIORITY_LOW);
      child.send({ database, expectedGlobalRevision, expectedDomainHash });
    } catch {
      onError();
    }
  });
}

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
    const encoded = await encodeLegacyRollbackStateIsolated(snapshot);
    if (expectedDomainHash && encoded.stateSha256 !== expectedDomainHash) throw new Error("Rollbackbridge weigerde domeinhash-drift.");
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
        stateSha256: encoded.stateSha256,
        encodedSha256: encoded.encodedSha256,
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
