import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  parseWorkspaceRuntimeConfig,
  productionDatabaseCredentialsFromEnvironment,
} from "./workspace-runtime-config.mjs";
import { verifyAtlasMariaDbBoundary } from "./atlas-mariadb-boundary.mjs";
import { SportpaleisMariaDbStore } from "./sportpaleis-mariadb-store.mjs";
import {
  SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY,
  createSportpaleisProductionMailFoundation,
} from "./sportpaleis-production-mail.mjs";
import {
  SportpaleisFileStore,
  SportpaleisPilotService,
  createSportpaleisPilotRequestHandler,
  seedPasswordsFromEnvironment,
} from "./sportpaleis-pilot-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDirectory, "..");
const workspaceBoundary = "/workspace/wbd";
const sportpaleisBoundary = "/workspace/sportpaleis";
const workspaceBoundaries = [workspaceBoundary, sportpaleisBoundary];
const workspaceHome = `${workspaceBoundary}/overzicht`;
const sportpaleisHome = `${sportpaleisBoundary}/overzicht`;
const workspaceAliases = new Map([
  [workspaceBoundary, workspaceHome],
  [sportpaleisBoundary, sportpaleisHome],
  [`${workspaceBoundary}/ontwikkeling`, `${workspaceBoundary}/ontwikkeling/monitor`],
  [`${workspaceBoundary}/business-foundation/finance/facturen/concepten`, `${workspaceBoundary}/business-foundation/finance/facturen`],
]);

const exactWorkspaceRoutes = new Set([
  workspaceHome,
  `${workspaceBoundary}/organisaties`,
  `${workspaceBoundary}/projecten`,
  `${workspaceBoundary}/ontwikkelpartners`,
  `${workspaceBoundary}/ontwikkeling/monitor`,
  `${workspaceBoundary}/ontwikkeling/historie`,
  `${workspaceBoundary}/ontwikkeling/feedback`,
  `${workspaceBoundary}/business-foundation`,
  `${workspaceBoundary}/business-foundation/bedrijfsgegevens`,
  `${workspaceBoundary}/business-foundation/finance`,
  `${workspaceBoundary}/business-foundation/finance/inkomende-facturen`,
  `${workspaceBoundary}/business-foundation/finance/facturen`,
  `${workspaceBoundary}/business-foundation/finance/facturen/nieuw`,
  `${workspaceBoundary}/business-foundation/finance/facturen/verzonden`,
  `${workspaceBoundary}/business-foundation/templates`,
  `${workspaceBoundary}/infrastructuur`,
  `${workspaceBoundary}/kennisvoorstellen`,
  `${workspaceBoundary}/kennis`,
  `${workspaceBoundary}/tijdlijn`,
  sportpaleisHome,
  `${sportpaleisBoundary}/orders`,
  `${sportpaleisBoundary}/orders/nieuw`,
  `${sportpaleisBoundary}/productie`,
  `${sportpaleisBoundary}/context`,
  `${sportpaleisBoundary}/feedback`,
  `${sportpaleisBoundary}/voorkeuren`,
  `${sportpaleisBoundary}/beheer`,
]);

const parameterizedWorkspaceRoutes = [
  /^\/workspace\/wbd\/organisaties\/[^/]+$/,
  /^\/workspace\/wbd\/organisaties\/[^/]+\/documenten$/,
  /^\/workspace\/wbd\/organisaties\/[^/]+\/documenten\/nieuw$/,
  /^\/workspace\/wbd\/organisaties\/[^/]+\/notities\/nieuw$/,
  /^\/workspace\/wbd\/business-foundation\/finance\/facturen\/concepten\/[^/]+$/,
  /^\/workspace\/wbd\/business-foundation\/finance\/facturen\/verzonden\/[^/]+$/,
  /^\/workspace\/wbd\/kennisvoorstellen\/[^/]+$/,
  /^\/workspace\/sportpaleis\/orders\/[^/]+$/,
];

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

function normalizePathname(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function isWorkspaceBoundaryPath(pathname) {
  const normalized = normalizePathname(pathname);
  return workspaceBoundaries.some((boundary) =>
    normalized === boundary || normalized.startsWith(`${boundary}/`));
}

export function isKnownWorkspaceRoute(pathname) {
  const normalized = normalizePathname(pathname);
  try {
    for (const segment of normalized.split("/").filter(Boolean)) decodeURIComponent(segment);
  } catch {
    return false;
  }
  return exactWorkspaceRoutes.has(normalized) || parameterizedWorkspaceRoutes.some((pattern) => pattern.test(normalized));
}

function sendJson(response, statusCode, payload, method = "GET") {
  const body = `${JSON.stringify(payload)}\n`;
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(method === "HEAD" ? undefined : body);
}

function sendHtml(response, statusCode, body, method = "GET") {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(method === "HEAD" ? undefined : body);
}

async function serveAsset(response, method, pathname, distRoot) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(distRoot, relative);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${path.sep}`)) return false;

  let details;
  try {
    details = await stat(candidate);
  } catch {
    return false;
  }
  if (!details.isFile()) return false;

  response.statusCode = 200;
  response.setHeader("Content-Type", mimeTypes.get(path.extname(candidate).toLowerCase()) ?? "application/octet-stream");
  response.setHeader("Content-Length", details.size);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
  if (method === "HEAD") {
    response.end();
  } else {
    createReadStream(candidate).pipe(response);
  }
  return true;
}

function log(config, level, event, fields = {}) {
  const levels = ["debug", "info", "warn", "error"];
  if (levels.indexOf(level) < levels.indexOf(config.logLevel)) return;
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields })}\n`);
}

export async function createWorkspaceRuntimeServer(options = {}) {
  const config = options.config ?? parseWorkspaceRuntimeConfig(process.env);
  const distRoot = path.resolve(websiteRoot, config.distDir);
  const workspaceHtmlPath = path.join(distRoot, "workspace.html");
  const workspaceHtml = await readFile(workspaceHtmlPath, "utf8");
  const outsideBoundaryHtml = "<!doctype html><html lang=\"nl\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Route niet gevonden</title></head><body><main><h1>Route niet gevonden</h1></main></body></html>";
  let sportpaleisHandlerPromise;
  let activeSportpaleisStore;
  const sportpaleisHandler = () => {
    if (!sportpaleisHandlerPromise) {
      sportpaleisHandlerPromise = (async () => {
        const store = options.sportpaleisStore ?? (config.nodeEnv === "production"
          ? new SportpaleisMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace })
          : new SportpaleisFileStore({
            filePath: process.env.SPORTPALEIS_DATA_FILE ?? path.join(websiteRoot, "data", "sportpaleis-pilot", `${config.appEnv}-state.json`),
            backupDirectory: process.env.SPORTPALEIS_BACKUP_DIRECTORY ?? path.join(websiteRoot, "data", "sportpaleis-pilot", "backups"),
            seedPasswords: seedPasswordsFromEnvironment(),
          }));
        activeSportpaleisStore = store;
        const mailFoundation = config.nodeEnv === "production"
          ? createSportpaleisProductionMailFoundation({
            workspaceStore: store,
            captureDirectory: SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY,
          })
          : options.mailFoundation;
        const service = new SportpaleisPilotService({
          store,
          mailFoundation,
          releaseId: config.releaseId,
          secureCookies: config.nodeEnv === "production",
          allowedOrigin: new URL(config.workspaceBaseUrl).origin,
          demoMode: config.appEnv === "local" && config.nodeEnv !== "production" && process.env.SPORTPALEIS_REVIEW_DEMO === "true",
          uploadsEnabled: config.nodeEnv === "production" ? config.productionPolicy.uploadsEnabled : true,
          mailMode: config.nodeEnv === "production" ? config.productionPolicy.mailMode : "capture",
        });
        await service.initialize();
        return createSportpaleisPilotRequestHandler(service);
      })();
    }
    return sportpaleisHandlerPromise;
  };

  if (config.nodeEnv === "production") {
    if (options.verifyAtlasBoundary) {
      await options.verifyAtlasBoundary();
    } else {
      await verifyAtlasMariaDbBoundary(productionDatabaseCredentialsFromEnvironment(process.env).atlas);
    }
    await sportpaleisHandler();
  }

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://workspace.runtime");
    const pathname = normalizePathname(requestUrl.pathname);

    if (pathname.startsWith("/api/sportpaleis/v1/")
      || pathname === "/health/sportpaleis"
      || pathname === "/ready/sportpaleis") {
      try {
        await (await sportpaleisHandler())(request, response);
      } catch {
        sendJson(response, 503, { status: "not-configured" }, method);
      }
      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendJson(response, 405, { status: "method-not-allowed" }, method);
      return;
    }
    if (pathname === "/health") {
      sendJson(response, 200, { status: "ok" }, method);
      return;
    }
    if (pathname === "/ready") {
      sendJson(response, 200, { status: "ready" }, method);
      return;
    }
    const aliasTarget = workspaceAliases.get(pathname);
    if (aliasTarget) {
      response.statusCode = 308;
      response.setHeader("Location", `${aliasTarget}${requestUrl.search}`);
      response.setHeader("Cache-Control", "no-store");
      response.end();
      return;
    }
    if (pathname.startsWith("/assets/") && await serveAsset(response, method, pathname, distRoot)) return;
    if (isKnownWorkspaceRoute(pathname)) {
      sendHtml(response, 200, workspaceHtml, method);
      return;
    }
    if (isWorkspaceBoundaryPath(pathname)) {
      sendHtml(response, 404, workspaceHtml, method);
      return;
    }
    sendHtml(response, 404, outsideBoundaryHtml, method);
  }).on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  }).on("listening", () => {
    log(config, "info", "workspace-runtime-listening", {
      appEnv: config.appEnv,
      releaseId: config.releaseId,
      persistence: config.nodeEnv === "production" ? "mariadb" : "file-development",
    });
  });
  server.on("close", () => {
    if (typeof activeSportpaleisStore?.close === "function") {
      void activeSportpaleisStore.close().catch(() => undefined);
    }
  });
  return server;
}

async function start() {
  const config = parseWorkspaceRuntimeConfig(process.env);
  const server = await createWorkspaceRuntimeServer({ config });
  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    log(config, "info", "workspace-runtime-shutdown", { signal });
    server.close((error) => {
      if (error) {
        log(config, "error", "workspace-runtime-shutdown-failed");
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  server.listen(config.port, config.host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  start().catch((error) => {
    process.stderr.write(`${JSON.stringify({ level: "error", event: "workspace-runtime-start-failed", message: error instanceof Error ? error.message : "Unknown error" })}\n`);
    process.exitCode = 1;
  });
}
