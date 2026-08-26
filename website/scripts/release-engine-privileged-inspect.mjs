import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";
import { validateReleaseContract, validateSideEffectCounters } from "./release-engine-core.mjs";
import { inspectEnvironmentContract } from "./release-engine-inspection.mjs";
import { LinuxReleasePlatform } from "./release-engine-platform.mjs";

function parseEnvironment(text) {
  return Object.fromEntries(String(text).split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1).replace(/^(['"])(.*)\1$/u, "$2")];
  }));
}
function modeString(mode) { return `0${(mode & 0o777).toString(8)}`; }

export function decodeMailControlState(value) {
  let decoded = value;
  try {
    if (typeof value === "string") decoded = JSON.parse(value);
    else if (Buffer.isBuffer(value)) decoded = JSON.parse(value.toString("utf8"));
  } catch {
    throw Object.assign(new Error("Mail control state bevat malformed JSON."), { code: "SIDE_EFFECT_STATE_MALFORMED" });
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw Object.assign(new Error("Mail control state is geen geldig object."), { code: "SIDE_EFFECT_STATE_SCHEMA_INVALID" });
  }
  return decoded;
}

export async function privilegedInspect({ releaseId, contractHash, mode, databaseId, roots = {} }) {
  const contractRoot = roots.contractRoot ?? "/srv/wbd/release-engine/contracts";
  const environmentFile = roots.environmentFile ?? "/etc/wbd/production.env";
  const stateRoot = roots.stateRoot ?? "/srv/wbd/shared/release-engine";
  const environment = parseEnvironment(await readFile(environmentFile, "utf8"));
  const contract = validateReleaseContract(JSON.parse(await readFile(path.join(contractRoot, `${releaseId}.release-contract.json`), "utf8")));
  if (contract.contractHash !== contractHash) throw Object.assign(new Error("Privileged inspect contracthash wijkt af."), { code: "CONTRACT_HASH_MISMATCH" });
  const platform = new LinuxReleasePlatform({ stateRoot, environmentFile });
  if (mode === "current") {
    const currentPath = await realpath(roots.currentLink ?? "/srv/wbd/current");
    const manifest = JSON.parse(await readFile(path.join(currentPath, "RELEASE-MANIFEST.json"), "utf8"));
    if (environment.RELEASE_ID !== manifest.releaseId || path.basename(currentPath) !== manifest.releaseId) {
      throw Object.assign(new Error("Current symlink, environment en manifest wijken af."), { code: "BASELINE_DRIFT" });
    }
    const probe = async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000), headers: { Accept: "application/json" } });
      return response.ok ? "PASS" : "FAIL";
    };
    return {
      releaseId: manifest.releaseId,
      commit: manifest.commit,
      health: await probe(roots.healthUrl ?? "http://127.0.0.1:3000/health"),
      readiness: await probe(roots.readinessUrl ?? "http://127.0.0.1:3000/ready"),
      currentPath,
      runtimeVersion: process.version,
    };
  }
  if (mode === "environment") {
    const secretInspection = {};
    for (const binding of contract.environment.secretBindings) {
      const match = /^env-file:(\/[^#]+)#([A-Z][A-Z0-9_]*)$/u.exec(binding.binding);
      if (!match) throw Object.assign(new Error("Niet-geallowliste secretbinding."), { code: "SECRET_BINDING_INVALID" });
      const metadata = await stat(match[1]);
      const values = match[1] === environmentFile ? environment : parseEnvironment(await readFile(match[1], "utf8"));
      secretInspection[binding.binding] = { exists: Boolean(values[match[2]]), owner: String(metadata.uid), mode: modeString(metadata.mode), readableByRunner: true };
    }
    const inspection = inspectEnvironmentContract(contract, environment, secretInspection);
    return { status: inspection.status, bindings: inspection.bindings, resolved: undefined };
  }
  if (mode === "database") {
    const database = contract.databases.find((item) => item.id === databaseId);
    if (!database) throw Object.assign(new Error("Database is niet geallowlist in contract."), { code: "DATABASE_NOT_ALLOWLISTED" });
    const resolved = new Map();
    for (const item of contract.environment.required) {
      const source = [item.key, ...item.aliases].find((key) => String(environment[key] ?? ""));
      if (source) resolved.set(item.key, environment[source]);
    }
    return platform.inspectDatabase(contract, database, resolved);
  }
  if (mode === "recovery") return platform.inspectRecoveryDirect(contract);
  if (mode === "push-counters") {
    const prefix = "WORKSPACE";
    const config = { host: environment[`${prefix}_DB_HOST`], port: Number(environment[`${prefix}_DB_PORT`] || 3306), database: environment[`${prefix}_DB_NAME`], user: environment[`${prefix}_DB_USER`], password: environment[`${prefix}_DB_PASSWORD`], connectionLimit: 1, connectTimeout: 5_000, acquireTimeout: 5_000, multipleStatements: false };
    const pool = (roots.poolFactory ?? mariadb.createPool)(config);
    try {
      const exists = await pool.query("SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'wbd_mail_control_state'", [config.database]);
      if (Number(exists[0]?.count ?? 0) === 0) return validateSideEffectCounters({ activeSubscriptions: 0, delivered: 0, pending: 0, schemaPresent: false });
      const rows = await pool.query("SELECT state_json FROM wbd_mail_control_state WHERE organization_id = 'we-build-and-design'");
      const state = rows.length ? decodeMailControlState(rows[0].state_json) : {};
      const subscriptions = Array.isArray(state.pushSubscriptions) ? state.pushSubscriptions : [];
      const outbox = Array.isArray(state.notificationOutbox) ? state.notificationOutbox : [];
      return validateSideEffectCounters({ activeSubscriptions: subscriptions.filter((item) => item.status === "ACTIVE").length, delivered: outbox.filter((item) => item.status === "DELIVERED").length, pending: outbox.filter((item) => item.status === "PENDING" || item.status === "SENDING").length, schemaPresent: true });
    } finally { await pool.end(); }
  }
  throw Object.assign(new Error("Inspectiemode niet geallowlist."), { code: "INSPECTION_NOT_ALLOWLISTED" });
}

async function main() {
  const [releaseId, contractHash, mode, databaseId] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(await privilegedInspect({ releaseId, contractHash, mode, databaseId }))}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ name: error?.name, code: error?.code ?? "INSPECTION_FAILED", message: String(error?.message ?? "Inspection failed").replace(/(password|secret|token|private[_-]?key)\s*[=:]\s*\S+/giu, "$1=[REDACTED]").slice(0, 2_000) })}\n`);
    process.exitCode = 1;
  });
}
