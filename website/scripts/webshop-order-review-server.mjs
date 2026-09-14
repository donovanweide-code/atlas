import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SportpaleisFileStore, SportpaleisPilotService, createSportpaleisPilotRequestHandler } from "./sportpaleis-pilot-foundation.mjs";

// Isolated review state, canonical application and APIs. Never a live data path.
export async function createWebshopOrderReview({ root, port = 0 } = {}) {
  if (!root) throw new Error("An isolated review directory is required.");
  root = path.resolve(root);
  await mkdir(root, { recursive: true });
  const password = "Local-Canary-Only-2026!";
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: password, patrick: password, collega: password, "donovan-support": password } });
  const service = new SportpaleisPilotService({ store, websiteSource: {}, mailMode: "capture", artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), prewarmProductionBuildIsolation: false, releaseId: "PDF-ORDER-E2E-LOCAL-REVIEW" });
  await service.initialize();
  const handler = createSportpaleisPilotRequestHandler(service);
  const dist = fileURLToPath(new URL("../dist-workspace/", import.meta.url));
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      // This review proves readiness, not a production or communication mutation.
      if (request.method === "POST" && /production-jobs|production-proposals|mail\/|mailbox|website-sync/u.test(url.pathname)) { response.writeHead(403); response.end("Review: geen productie-uitvoer of verzending."); return; }
      if (await handler(request, response)) return;
      const requested = decodeURIComponent(url.pathname);
      const filename = requested.startsWith("/assets/") || /\.(?:svg|webmanifest|js|png|webp)$/u.test(requested) ? path.resolve(dist, `.${requested}`) : path.join(dist, "sportpaleis.html");
      if (!filename.startsWith(path.resolve(dist) + path.sep)) { response.writeHead(404); response.end(); return; }
      let body = await readFile(filename);
      if (path.extname(filename) === ".html") body = Buffer.from(body.toString("utf8").replace(/<body([^>]*)>/u, '<body$1><div style="padding:8px;text-align:center;background:#ffe7a8;color:#242424;font:600 14px system-ui">LOKALE REVIEW · aparte testopslag · geen LIVE</div>'));
      response.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".webmanifest": "application/manifest+json" })[path.extname(filename)] ?? "text/html; charset=utf-8");
      response.setHeader("Cache-Control", "no-store"); response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  service.allowedOrigin = `http://127.0.0.1:${server.address().port}`;
  return { server, store, service, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const review = await createWebshopOrderReview({ root: process.argv[2], port: Number(process.argv[3] ?? 4188) });
  console.log(`Isolated canonical Workspace review: ${review.url}/webshop`);
}
