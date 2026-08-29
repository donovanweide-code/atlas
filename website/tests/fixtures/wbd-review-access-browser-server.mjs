import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createSportpaleisPilotRequestHandler,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../../scripts/sportpaleis-pilot-foundation.mjs";

const candidateId = "spw-experience-simplification-candidate-r2-2-20260828";
const root = await mkdtemp(path.join(tmpdir(), "wbd-review-access-browser-"));
const dist = path.resolve(new URL("../../dist-workspace/", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/u, (value) => value.slice(1)));
const fixturePassword = randomBytes(24).toString("base64url");
const store = new SportpaleisFileStore({
  filePath: path.join(root, "state.json"),
  backupDirectory: path.join(root, "backups"),
  seedPasswords: { kevin: fixturePassword, patrick: fixturePassword, collega: fixturePassword, "donovan-support": fixturePassword },
});
const service = new SportpaleisPilotService({
  store,
  artifactRoot: root,
  runtimeArtifactRoot: path.join(root, "runtime"),
  activeReviewCandidateIds: [candidateId],
  reviewAccessEnabled: true,
  reviewAccessIssuerPrincipalIds: ["kevin"],
  releaseId: "WBD-REVIEW-DEVELOPER-ACCESS-V1-BROWSER-PROOF",
});
await service.initialize();
const issuer = await service.login({ email: "kevin@sportpaleis.nl", password: fixturePassword });
const issued = await service.issueReviewDeveloperGrant(issuer.token, issuer.csrfToken, {
  candidateId,
  scopes: ["candidate.review.read", "candidate.ui.safe-interact", "candidate.debug.read"],
  humanGoReference: "GO-WBD-REVIEW-ACCESS-BROWSER-PROOF-20260828",
  ttlMs: 30 * 60 * 1_000,
});
let handoffConsumed = false;
const apiHandler = createSportpaleisPilotRequestHandler(service);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
]);

const server = createServer(async (request, response) => {
  if (await apiHandler(request, response)) return;
  const url = new URL(request.url ?? "/", service.allowedOrigin);
  if (url.pathname === "/proof-start") {
    if (handoffConsumed) {
      response.writeHead(410, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("Tijdelijke proof-link is al gebruikt.");
      return;
    }
    handoffConsumed = true;
    response.writeHead(302, { Location: issued.activationPath, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    response.end();
    return;
  }
  const relative = url.pathname.replace(/^\/+/, "");
  const requested = path.resolve(dist, relative);
  let file = requested;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(dist, "sportpaleis.html");
  }
  if (!file.startsWith(`${dist}${path.sep}`) && file !== dist) {
    response.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { "Content-Type": contentTypes.get(path.extname(file).toLowerCase()) ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("Browser-proofserver kon niet starten.");
service.allowedOrigin = `http://127.0.0.1:${address.port}`;
process.stdout.write(`WBD_REVIEW_ACCESS_BROWSER_PROOF_READY http://127.0.0.1:${address.port}/proof-start\n`);

const close = async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
};
process.once("SIGINT", () => void close().finally(() => process.exit(0)));
process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
