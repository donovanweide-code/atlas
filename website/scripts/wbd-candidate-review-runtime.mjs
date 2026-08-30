import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { verifyImmutableReviewCandidate } from "./review-candidate-artifact.mjs";

export const WBD_CANDIDATE_REVIEW_RUNTIME_CONTRACT = Object.freeze({
  schemaVersion: 1,
  artifactIdentity: "VERIFY_BEFORE_START",
  applicationState: "DISPOSABLE_CANDIDATE_ONLY",
  principal: "TEMPORARY_SCOPED_AUDITED",
  productionMutationAuthority: false,
  externalSideEffects: false,
  cleanup: "REVOKE_AND_DESTROY",
});

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"], [".webp", "image/webp"], [".woff2", "font/woff2"], [".ttf", "font/ttf"],
]);

function noStoreHeaders(extra = {}) {
  return { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", ...extra };
}

export async function createWbdCandidateReviewRuntime({
  candidate,
  artifactValidators = [],
  createApplicationAdapter,
  entryPath = "/",
  shellFile = "index.html",
  host = "127.0.0.1",
  port = 0,
}) {
  const identity = await verifyImmutableReviewCandidate(candidate, { artifactValidators });
  const publicIdentity = Object.freeze({
    releaseId: identity.releaseId,
    commit: identity.commit,
    artifactSha256: identity.artifactSha256,
    manifestSha256: identity.manifestSha256,
    embeddedManifestSha256: identity.embeddedManifestSha256,
    verifiedFileCount: identity.verifiedFileCount,
  });
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "wbd-candidate-review-runtime-"));
  let adapter;
  try {
    adapter = await createApplicationAdapter({ identity, runtimeRoot, contract: WBD_CANDIDATE_REVIEW_RUNTIME_CONTRACT });
  } catch (error) {
    await rm(runtimeRoot, { recursive: true, force: true });
    throw error;
  }
  if (!adapter || typeof adapter.handleRequest !== "function" || typeof adapter.activate !== "function") {
    await rm(runtimeRoot, { recursive: true, force: true });
    throw Object.assign(new Error("De Candidate-adapter mist de verplichte request- of activatiegrens."), { code: "REVIEW_ADAPTER_INVALID" });
  }
  let handoffConsumed = false;
  let closed = false;
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://${host}`);
      if (requestUrl.pathname === "/__wbd-review/evidence") {
        const adapterEvidence = typeof adapter.evidence === "function" ? await adapter.evidence() : {};
        response.writeHead(200, noStoreHeaders({ "Content-Type": "application/json; charset=utf-8" }));
        response.end(JSON.stringify({ contract: WBD_CANDIDATE_REVIEW_RUNTIME_CONTRACT, identity: publicIdentity, ...adapterEvidence }));
        return;
      }
      if (requestUrl.pathname === "/__wbd-review/start") {
        if (handoffConsumed) {
          response.writeHead(410, noStoreHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
          response.end("Tijdelijke reviewstart is al gebruikt.");
          return;
        }
        const activation = await adapter.activate();
        handoffConsumed = true;
        response.writeHead(302, noStoreHeaders({ Location: `${entryPath}${entryPath.includes("?") ? "&" : "?"}wbd-review=${encodeURIComponent(identity.releaseId)}`, ...(activation.headers ?? {}) }));
        response.end();
        return;
      }
      if (await adapter.handleRequest(request, response)) return;
      const relative = requestUrl.pathname.replace(/^\/+/, "");
      const requested = path.resolve(identity.distRoot, relative);
      let file = requested;
      try {
        const info = await stat(file);
        if (info.isDirectory()) file = path.join(file, "index.html");
      } catch {
        file = path.join(identity.distRoot, shellFile);
      }
      const containment = path.relative(identity.distRoot, file);
      if (containment.startsWith("..") || path.isAbsolute(containment)) {
        response.writeHead(403, noStoreHeaders()); response.end(); return;
      }
      const bytes = await readFile(file);
      response.writeHead(200, noStoreHeaders({ "Content-Type": CONTENT_TYPES.get(path.extname(file).toLowerCase()) ?? "application/octet-stream", "X-WBD-Candidate-Release": identity.releaseId, "X-WBD-Candidate-Commit": identity.commit, "X-WBD-Candidate-Artifact-SHA256": identity.artifactSha256 }));
      response.end(bytes);
    } catch (error) {
      response.writeHead(Number(error?.statusCode) || 500, noStoreHeaders({ "Content-Type": "application/json; charset=utf-8" }));
      response.end(JSON.stringify({ error: error?.code ?? "REVIEW_RUNTIME_ERROR", message: error?.message ?? "Reviewruntime gestopt." }));
    }
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
  } catch (error) {
    if (typeof adapter.close === "function") await adapter.close();
    await rm(runtimeRoot, { recursive: true, force: true });
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Reviewruntime kon geen lokale poort openen.");
  const baseUrl = `http://${host}:${address.port}`;
  if (typeof adapter.setOrigin === "function") adapter.setOrigin(baseUrl);
  return Object.freeze({
    identity: publicIdentity,
    runtimeRoot,
    baseUrl,
    startUrl: `${baseUrl}/__wbd-review/start`,
    evidenceUrl: `${baseUrl}/__wbd-review/evidence`,
    async close() {
      if (closed) return;
      closed = true;
      if (typeof adapter.close === "function") await adapter.close();
      await new Promise((resolve) => server.close(resolve));
      await rm(runtimeRoot, { recursive: true, force: true });
    },
  });
}
