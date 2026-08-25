import path from "node:path";
import { pathToFileURL } from "node:url";

const adapterIds = new Set([
  "workspace-readiness", "workspace-health", "owner-login", "mail-runtime", "mail-r2-compatibility",
  "web-push-runtime-non-delivering", "sportpaleis-critical-flow",
]);

async function getJson(url, { host } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json", ...(host ? { Host: host } : {}) } });
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status} voor smoke endpoint.`), { code: "SMOKE_HTTP_FAIL" });
  return response.json();
}

export async function runReleaseSmoke({ releaseId, adapterId, phase, roots = {}, environment = process.env }) {
  if (!adapterIds.has(adapterId)) throw Object.assign(new Error(`Smoke adapter ${adapterId} is niet geallowlist.`), { code: "SMOKE_NOT_ALLOWLISTED" });
  const port = Number(environment.PORT || 3000);
  const base = `http://127.0.0.1:${port}`;
  if (adapterId === "workspace-readiness") {
    const ready = await getJson(`${base}/ready`);
    if (ready.status !== "ready") throw Object.assign(new Error("Workspace readiness is niet ready."), { code: "READINESS_FAIL" });
  } else if (adapterId === "workspace-health") {
    const health = await getJson(`${base}/health`);
    if (health.status !== "ok") throw Object.assign(new Error("Workspace health is niet ok."), { code: "SMOKE_HEALTH_FAIL" });
  } else if (adapterId === "owner-login") {
    const ready = await getJson(`${base}/ready/wbd`, { host: "workspace.webuildanddesign.nl" });
    if (!new Set(["ready", "ok"]).has(ready.status)) throw Object.assign(new Error("Owner auth/runtime-boundary is niet ready."), { code: "OWNER_BOUNDARY_FAIL" });
  } else if (adapterId === "mail-runtime" || adapterId === "mail-r2-compatibility") {
    const health = await getJson(`${base}/health/wbd`, { host: "workspace.webuildanddesign.nl" });
    if (health.status !== "ok" || health.persistence !== "mariadb" || health.mail?.status !== "available" || health.mail?.connectorCallsDuringRender !== 0) throw Object.assign(new Error("Mail runtime smoke faalde."), { code: "MAIL_SMOKE_FAIL" });
  } else if (adapterId === "web-push-runtime-non-delivering") {
    const releaseRoot = roots.releaseRoot ?? `/srv/wbd/releases/${releaseId}`;
    const module = await import(pathToFileURL(path.join(releaseRoot, "website", "scripts", "wbd-push-notifications.mjs")).href);
    const transport = module.createWebPushTransportFromEnvironment(environment, { fetchImpl: async () => { throw new Error("NETWORK_CALL_FORBIDDEN_DURING_SMOKE"); } });
    if (transport.status !== "LIVE" || !transport.publicKey) throw Object.assign(new Error("Web Push runtime is niet LIVE/configured."), { code: "WEB_PUSH_RUNTIME_FAIL" });
  } else if (adapterId === "sportpaleis-critical-flow") {
    const health = await getJson(`${base}/health/sportpaleis`, { host: "workspace.sportpaleis.nl" });
    const ready = await getJson(`${base}/ready/sportpaleis`, { host: "workspace.sportpaleis.nl" });
    if (health.status !== "ok" || !new Set(["ready", "ok"]).has(ready.status)) throw Object.assign(new Error("Sportpaleis critical smoke faalde."), { code: "SPORTPALEIS_SMOKE_FAIL" });
  }
  return { status: "PASS", adapterId, phase, releaseId, nonDelivering: adapterId === "web-push-runtime-non-delivering" };
}

async function main() {
  const [releaseId, adapterId, phase] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(await runReleaseSmoke({ releaseId, adapterId, phase }))}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ name: error?.name, code: error?.code ?? "SMOKE_FAILED", message: String(error?.message ?? "Smoke failed").slice(0, 2_000) })}\n`);
    process.exitCode = 1;
  });
}
