import { chmod, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateReleaseContract } from "./release-engine-core.mjs";
import { LinuxReleasePlatform } from "./release-engine-platform.mjs";
import { WbdReleaseEngine } from "./release-engine-runner.mjs";
import { FileReleaseStateStore } from "./release-engine-state-store.mjs";

const releaseIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 65_536) throw Object.assign(new Error("Request body is te groot."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}

export function createReleaseEngineRequestHandler({ engine, contractRoot }) {
  const resolvedRoot = path.resolve(contractRoot);
  async function loadContract(releaseId) {
    if (!releaseIdPattern.test(releaseId)) throw Object.assign(new Error("Ongeldige release-ID."), { statusCode: 400 });
    const file = path.join(resolvedRoot, `${releaseId}.release-contract.json`);
    if (!file.startsWith(`${resolvedRoot}${path.sep}`)) throw Object.assign(new Error("Contractpad geweigerd."), { statusCode: 400 });
    return validateReleaseContract(JSON.parse(await readFile(file, "utf8")));
  }
  return async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/healthz") return json(response, 200, { status: "ok", component: "wbd-release-engine" });
      const match = /^\/v1\/releases\/([A-Za-z0-9._-]+)(?:\/(prepare|go|resume))?$/u.exec(request.url ?? "");
      if (!match) return json(response, 404, { code: "NOT_FOUND" });
      const [, releaseId, action] = match;
      const contract = await loadContract(releaseId);
      if (request.method === "GET" && !action) return json(response, 200, await engine.ownerSummary(contract));
      if (request.method !== "POST") return json(response, 405, { code: "METHOD_NOT_ALLOWED" });
      const body = await readBody(request);
      if (action === "prepare") {
        if (body.contractHash !== contract.contractHash || Object.keys(body).some((key) => key !== "contractHash")) throw Object.assign(new Error("Prepare-request wijkt af van immutable contract."), { statusCode: 409 });
        const plan = await engine.inspectAndPrepare(contract);
        return json(response, 200, { state: "AWAITING_HUMAN_GO", summary: engine.approvalSummary(contract, plan) });
      }
      if (action === "go") {
        const allowed = new Set(["decision", "releaseId", "planHash", "actor", "requestId"]);
        if (Object.keys(body).some((key) => !allowed.has(key)) || body.requestId === undefined) throw Object.assign(new Error("GO-request bevat niet-geallowliste velden."), { statusCode: 400 });
        return json(response, 200, await engine.approveAndActivate(contract, body));
      }
      if (action === "resume") {
        if (Object.keys(body).length) throw Object.assign(new Error("Resume accepteert geen operationele input."), { statusCode: 400 });
        return json(response, 200, await engine.resume(contract));
      }
      return json(response, 404, { code: "NOT_FOUND" });
    } catch (error) {
      const diagnostic = error?.diagnostic ?? { class: "RUNTIME", code: error?.code ?? "REQUEST_FAILED", message: String(error?.message ?? "Request failed") };
      return json(response, Number(error?.statusCode ?? 409), { state: "BLOCKED", diagnostic });
    }
  };
}

export async function startReleaseEngineService(environment = process.env) {
  if (environment.NODE_ENV !== "production") throw new Error("Release Engine service vereist NODE_ENV=production.");
  const stateRoot = environment.WBD_RELEASE_ENGINE_STATE_ROOT || "/srv/wbd/shared/release-engine";
  const socketPath = environment.WBD_RELEASE_ENGINE_SOCKET || "/run/wbd-release-engine/engine.sock";
  const contractRoot = environment.WBD_RELEASE_ENGINE_CONTRACT_ROOT || "/srv/wbd/release-engine/contracts";
  await mkdir(path.dirname(socketPath), { recursive: true, mode: 0o750 });
  await rm(socketPath, { force: true });
  const platform = new LinuxReleasePlatform({ stateRoot });
  const engine = new WbdReleaseEngine({ stateStore: new FileReleaseStateStore({ root: stateRoot }), platform });
  const server = createServer(createReleaseEngineRequestHandler({ engine, contractRoot }));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(socketPath, resolve); });
  await chmod(socketPath, 0o660);
  const contractFiles = (await readdir(contractRoot)).filter((name) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.release-contract\.json$/u.test(name));
  for (const name of contractFiles) {
    try {
      const contract = validateReleaseContract(JSON.parse(await readFile(path.join(contractRoot, name), "utf8")));
      await engine.resume(contract);
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ component: "wbd-release-engine-recovery", class: error?.diagnostic?.class ?? "RUNTIME", code: error?.diagnostic?.code ?? error?.code ?? "RECOVERY_FAILED", releaseContract: name, message: String(error?.diagnostic?.message ?? error?.message ?? "Recovery failed").slice(0, 1_000) })}\n`);
    }
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startReleaseEngineService().catch((error) => {
    process.stderr.write(`${JSON.stringify({ component: "wbd-release-engine", class: "RUNTIME", code: error?.code ?? "START_FAILED", message: String(error?.message ?? "Start failed").slice(0, 1_000) })}\n`);
    process.exitCode = 1;
  });
}
