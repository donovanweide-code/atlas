import { request as httpRequest } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const adapterIds = new Set([
  "workspace-readiness", "workspace-health", "owner-login", "mail-runtime", "mail-r2-compatibility",
  "web-push-runtime-non-delivering", "sportpaleis-critical-flow",
]);

async function getJson(url, { host } = {}) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const request = httpRequest({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      headers: { Accept: "application/json", ...(host ? { Host: host } : {}) },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 1_000_000) {
          request.destroy(Object.assign(new Error("Smoke response is groter dan toegestaan."), { code: "SMOKE_RESPONSE_TOO_LARGE" }));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const status = response.statusCode ?? 500;
        if (status < 200 || status >= 300) {
          finish(reject, Object.assign(new Error(`HTTP ${status} voor smoke endpoint.`), { code: "SMOKE_HTTP_FAIL" }));
          return;
        }
        try {
          finish(resolve, JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          finish(reject, Object.assign(new Error("Smoke endpoint gaf geen geldige JSON."), { code: "SMOKE_JSON_INVALID" }));
        }
      });
    });
    request.setTimeout(10_000, () => request.destroy(Object.assign(new Error("Smoke endpoint timeout."), { code: "SMOKE_TIMEOUT" })));
    request.on("error", (error) => finish(reject, error));
    request.end();
  });
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
  } else if (adapterId === "mail-r2-compatibility") {
    const health = await getJson(`${base}/health/wbd`, { host: "workspace.webuildanddesign.nl" });
    if (health.status !== "ok" || health.persistence !== "mariadb" || !Number.isInteger(health.datastoreRevision)) throw Object.assign(new Error("Actieve Mail R2-runtime is niet compatibel met de additieve schemawijzigingen."), { code: "MAIL_R2_COMPATIBILITY_FAIL" });
  } else if (adapterId === "mail-runtime") {
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
