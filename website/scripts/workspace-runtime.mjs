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
import { secretSafeMariaDbStartupDiagnostic } from "./sportpaleis-mariadb-store.mjs";
import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
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
import { createWorkspacePasswordRecord } from "./workspace-auth-foundation.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
  createWbdOwnerRequestHandler,
} from "./wbd-owner-foundation.mjs";
import { WbdOwnerDomainMariaDbStore } from "./wbd-owner-domain-mariadb-store.mjs";
import { MemoryWbdMailStore, WbdMailControlService } from "./wbd-mail-control.mjs";
import { WbdMailMariaDbStore } from "./wbd-mail-mariadb-store.mjs";
import { WbdImapMailboxConnector, WbdMailConnectorScheduler, parseWbdImapConfiguration } from "./wbd-imap-connector.mjs";
import { parseSportpaleisMailboxConfiguration } from "./sportpaleis-mailbox-routing.mjs";
import {
  WBD_HOMEPAGE_CONNECTOR_ID,
  WBD_HOMEPAGE_SOURCE_URL,
  WbdHomepageConnectorScheduler,
} from "./wbd-homepage-live-connector.mjs";
import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET_MANIFEST_PATH,
  assertAuthoritativeProductionAssetBytes,
  authoritativeProductionAssetManifest,
} from "../config/sportpaleis-authoritative-production-assets.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDirectory, "..");
const workspaceBoundary = "/workspace/wbd";
const sportpaleisBoundary = "/workspace/sportpaleis";
export const SPORTPALEIS_RUNTIME_ARTIFACT_ROOT = "/srv/wbd/shared";
const workspaceBoundaries = [workspaceBoundary, sportpaleisBoundary];
const workspaceHome = `${workspaceBoundary}/home`;
const workspaceMail = `${workspaceBoundary}/mail`;
const workspaceAttention = `${workspaceBoundary}/attention`;
const workspaceSearch = `${workspaceBoundary}/zoeken`;
const workspaceManagement = `${workspaceBoundary}/beheer`;
const workspaceCapabilities = `${workspaceBoundary}/capabilities`;
const workspaceOrganizations = `${workspaceBoundary}/organisaties`;
const workspaceOpportunities = `${workspaceBoundary}/kansen`;
const workspaceWorkContext = `${workspaceBoundary}/werkcontext`;
const ownerWorkspaceRoutes = new Set([workspaceHome, workspaceMail, workspaceAttention, workspaceSearch, workspaceManagement, workspaceCapabilities, workspaceOrganizations, workspaceOpportunities, workspaceWorkContext]);
const ownerOrganizationRoute = /^\/workspace\/wbd\/organisaties\/[a-z0-9][a-z0-9-]*$/u;
const isOwnerWorkspaceRoute = (pathname) => ownerWorkspaceRoutes.has(pathname) || ownerOrganizationRoute.test(pathname);
const sportpaleisHome = `${sportpaleisBoundary}/overzicht`;
const workspaceAliases = new Map([
  [workspaceBoundary, workspaceHome],
  [sportpaleisBoundary, sportpaleisHome],
  [`${workspaceBoundary}/ontwikkeling`, `${workspaceBoundary}/ontwikkeling/monitor`],
  [`${workspaceBoundary}/business-foundation/finance/facturen/concepten`, `${workspaceBoundary}/business-foundation/finance/facturen`],
]);
const sportpaleisHostAliases = new Map([
  ["/bedrukken", "/orders/nieuw"],
]);
const workspaceRootAssets = new Set([
  "/robots.txt",
  "/sportpaleis.webmanifest",
  "/sportpaleis-sw.js",
  "/sportpaleis-pwa-icon.svg",
  "/wbd-owner.webmanifest",
  "/wbd-owner-sw.js",
  "/wbd-owner-icon.svg",
]);

export async function verifyRuntimeAuthoritativeProductionAssets(distRoot) {
  const manifestPath = path.join(distRoot, ...SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET_MANIFEST_PATH.split("/"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (JSON.stringify(manifest) !== JSON.stringify(authoritativeProductionAssetManifest())) {
    throw new Error("Runtime authoritative production-assetmanifest wijkt af van Product Truth.");
  }
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const artifactPath = path.join(distRoot, ...asset.artifactPath.split("/"));
    assertAuthoritativeProductionAssetBytes(asset, await readFile(artifactPath), `runtime:${asset.artifactPath}`);
  }
  return authoritativeProductionAssetManifest();
}

async function currentReleaseManifest(releaseId, requiredInProduction) {
  const manifestPath = path.resolve(websiteRoot, "..", "RELEASE-MANIFEST.json");
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest?.releaseId !== releaseId || !manifest?.commit || !manifest?.tag || !Array.isArray(manifest?.files)) throw new Error("Actief releasemanifest komt niet overeen met RELEASE_ID.");
    return manifest;
  } catch (cause) {
    if (requiredInProduction) throw cause;
    return null;
  }
}

const exactWorkspaceRoutes = new Set([
  workspaceHome,
  workspaceMail,
  workspaceAttention,
  workspaceSearch,
  workspaceCapabilities,
  `${workspaceBoundary}/overzicht`,
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
  `${sportpaleisBoundary}/activeren`,
  `${sportpaleisBoundary}/orders`,
  `${sportpaleisBoundary}/orders/nieuw`,
  `${sportpaleisBoundary}/webshop`,
  `${sportpaleisBoundary}/mail`,
  `${sportpaleisBoundary}/voorstellen`,
  `${sportpaleisBoundary}/voorstellen/nieuw`,
  `${sportpaleisBoundary}/studio`,
  `${sportpaleisBoundary}/reviews/library-teamkit`,
  `${sportpaleisBoundary}/zoeken`,
  `${sportpaleisBoundary}/productie`,
  `${sportpaleisBoundary}/context`,
  `${sportpaleisBoundary}/feedback`,
  `${sportpaleisBoundary}/voorkeuren`,
  `${sportpaleisBoundary}/beheer`,
  `${sportpaleisBoundary}/beheer/rollen`,
  `${sportpaleisBoundary}/beheer/webshop`,
  `${sportpaleisBoundary}/beheer/mailbox`,
  `${sportpaleisBoundary}/beheer/synchronisatie`,
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
  /^\/workspace\/sportpaleis\/voorstellen\/[^/]+$/,
  /^\/workspace\/sportpaleis\/voorstel\/[^/]+$/,
  /^\/workspace\/sportpaleis\/studio\/[^/]+$/,
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
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".otf", "font/otf"],
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

function isCanonicalSportpaleisRoute(pathname) {
  const normalized = normalizePathname(pathname);
  return ["/overzicht", "/zoeken", "/winkel", "/webshop", "/mail", "/alles", "/orders", "/voorstellen", "/voorstel", "/studio", "/productie", "/context", "/feedback", "/voorkeuren", "/beheer", "/activeren", "/reviews"]
    .some((root) => normalized === root || normalized.startsWith(`${root}/`));
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

function sendWbdOwnerHtml(response, statusCode, body, method = "GET") {
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  sendHtml(response, statusCode, body, method);
}

function sendSportpaleisHtml(response, statusCode, body, method = "GET") {
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Referrer-Policy", "same-origin");
  sendHtml(response, statusCode, body, method);
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
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
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

function stackFrames(error) {
  if (!(error instanceof Error) || !error.stack) return [];
  return String(error.stack).split("\n").slice(1, 13).map((line) => line.trim()).filter(Boolean);
}

export function sportpaleisRuntimeErrorLogFields({ error, method, route, statusCode }) {
  const cause = error instanceof Error ? error.cause : null;
  return {
    method,
    route,
    statusCode,
    errorCode: String(error?.code ?? "INTERNAL_ERROR"),
    errorType: String(error?.name ?? typeof error),
    transactionPhase: String(error?.transactionPhase ?? "not-applicable"),
    transactionRollbackStatus: String(error?.transactionRollbackStatus ?? "not-applicable"),
    stackFrames: stackFrames(error),
    causeCode: cause?.code ? String(cause.code) : null,
    causeType: cause?.name ? String(cause.name) : null,
    causeStackFrames: stackFrames(cause),
  };
}

export async function createWorkspaceRuntimeServer(options = {}) {
  const config = options.config ?? parseWorkspaceRuntimeConfig(process.env);
  const configuredWorkspaceUrl = new URL(config.workspaceBaseUrl);
  const canonicalSportpaleisHost = configuredWorkspaceUrl.pathname === "/" ? configuredWorkspaceUrl.hostname : null;
  const canonicalWbdHost = new URL(config.wbdWorkspaceBaseUrl).hostname;
  const distRoot = path.resolve(websiteRoot, config.distDir);
  await verifyRuntimeAuthoritativeProductionAssets(distRoot);
  const workspaceHtmlPath = path.join(distRoot, "workspace.html");
  const workspaceHtml = await readFile(workspaceHtmlPath, "utf8");
  const sportpaleisHtmlPath = path.join(distRoot, "sportpaleis.html");
  const sportpaleisHtml = await readFile(sportpaleisHtmlPath, "utf8");
  const outsideBoundaryHtml = "<!doctype html><html lang=\"nl\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Route niet gevonden</title></head><body><main><h1>Route niet gevonden</h1></main></body></html>";
  let sportpaleisHandlerPromise;
  let activeSportpaleisStore;
  let wbdOwnerHandlerPromise;
  let activeWbdOwnerStore;
  let activeWbdMailStore;
  let activeWbdOwnerService;
  let wbdConnectorScheduler = options.wbdConnectorScheduler ?? null;
  let wbdMailConnectorScheduler = options.wbdMailConnectorScheduler ?? null;
  let sportpaleisMailboxConnectorScheduler = options.sportpaleisMailboxConnectorScheduler ?? null;
  const sportpaleisHandler = () => {
    if (!sportpaleisHandlerPromise) {
      sportpaleisHandlerPromise = (async () => {
        const store = options.sportpaleisStore ?? (config.nodeEnv === "production"
          ? new SportpaleisDomainMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace })
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
        const mailboxConfiguration = parseSportpaleisMailboxConfiguration(process.env);
        const service = new SportpaleisPilotService({
          store,
          mailFoundation,
          releaseId: config.releaseId,
          secureCookies: config.nodeEnv === "production",
          allowedOrigin: new URL(config.workspaceBaseUrl).origin,
          demoMode: config.appEnv === "local" && config.nodeEnv !== "production" && process.env.SPORTPALEIS_REVIEW_DEMO === "true",
          uploadsEnabled: config.nodeEnv === "production" ? config.productionPolicy.uploadsEnabled : true,
          productionAssetUploadsEnabled: config.nodeEnv === "production" ? config.productionPolicy.productionAssetUploadsEnabled : true,
          fontUploadsEnabled: config.nodeEnv === "production" ? config.productionPolicy.fontUploadsEnabled : true,
          mailMode: config.nodeEnv === "production" ? config.productionPolicy.mailMode : "capture",
          mailboxConfiguration,
          creativeStudioEnabled: config.creativeStudioEnabled,
          runtimeArtifactRoot: config.nodeEnv === "production" ? SPORTPALEIS_RUNTIME_ARTIFACT_ROOT : undefined,
          reviewPrincipalIds: config.reviewPrincipalIds,
          activeReviewCandidateIds: config.activeReviewCandidateIds,
          reviewAccessEnabled: config.reviewAccessEnabled,
          reviewAccessIssuerPrincipalIds: config.reviewAccessIssuerPrincipalIds,
          reviewAccessIssuerSecret: config.reviewAccessIssuerSecret,
        });
        await service.initialize();
        if (!sportpaleisMailboxConnectorScheduler && mailboxConfiguration.configured) {
          sportpaleisMailboxConnectorScheduler = new WbdMailConnectorScheduler({
            service: {
              workspaceView: () => service.mailboxRoutingConnectorView(),
              ingestMailboxSnapshot: (snapshot) => service.ingestSportpaleisMailboxSnapshot(snapshot),
            },
            connectors: [new WbdImapMailboxConnector({ mailbox: mailboxConfiguration, captureRawSource: true, captureAttachmentContents: true, canonicalAttachmentSha256: true })],
            intervalMs: Number(process.env.SPORTPALEIS_BEDRUKKING_IMAP_INTERVAL_MS || 2 * 60 * 1_000),
            onResult: (result) => log(config, "info", "sportpaleis-mailbox-refreshed", { mailboxId: result.mailbox.id, ingested: result.ingested, duplicates: result.duplicates, routes: result.routes?.map(({ route }) => route) ?? [] }),
            onError: (error) => log(config, "warn", "sportpaleis-mailbox-refresh-failed", { errorCode: String(error?.code ?? "SPORTPALEIS_MAILBOX_REFRESH_FAILED") }),
          });
        }
        return createSportpaleisPilotRequestHandler(service, {
          onError: (context) => log(
            config,
            context.statusCode >= 500 ? "error" : "warn",
            "sportpaleis-api-error",
            sportpaleisRuntimeErrorLogFields(context),
          ),
        });
      })();
    }
    return sportpaleisHandlerPromise;
  };

  const wbdOwnerHandler = () => {
    if (!wbdOwnerHandlerPromise) {
      wbdOwnerHandlerPromise = (async () => {
        const bootstrap = async () => {
          if (config.nodeEnv === "production") {
            if (!activeSportpaleisStore) throw new Error("Bewezen Donovan credentialbron is niet beschikbaar.");
            const sportpaleisState = await activeSportpaleisStore.read();
            const candidates = sportpaleisState.users.filter(({ email, status, password }) => email?.trim().toLowerCase() === "donovanweide@gmail.com" && status === "Actief" && password);
            if (candidates.length !== 1) throw new Error("Exact één actieve Donovan credentialbron is vereist.");
            return createInitialWbdOwnerState({ passwordRecord: candidates[0].password });
          }
          const seedPassword = String(process.env.WBD_OWNER_SEED_PASSWORD ?? "");
          if (seedPassword.length < 12) throw new Error("WBD_OWNER_SEED_PASSWORD is vereist voor de lokale owner-store.");
          return createInitialWbdOwnerState({ passwordRecord: await createWorkspacePasswordRecord(seedPassword) });
        };
        const store = options.wbdOwnerStore ?? (config.nodeEnv === "production"
          ? new WbdOwnerDomainMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace })
          : new WbdOwnerFileStore({ filePath: process.env.WBD_OWNER_DATA_FILE ?? path.join(websiteRoot, "data", "wbd-owner", `${config.appEnv}-state.json`), bootstrap }));
        activeWbdOwnerStore = store;
        const mailStore = options.wbdMailStore ?? (options.wbdOwnerStore
          ? new MemoryWbdMailStore()
          : config.nodeEnv === "production"
            ? new WbdMailMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace })
            : new MemoryWbdMailStore());
        activeWbdMailStore = mailStore;
        const mailControl = options.wbdMailControl ?? new WbdMailControlService({ store: mailStore });
        const service = new WbdOwnerService({
          store,
          mailControl,
          releaseId: config.releaseId,
          releaseManifest: options.releaseManifest ?? await currentReleaseManifest(config.releaseId, config.nodeEnv === "production"),
          secureCookies: config.nodeEnv === "production",
          allowedOrigin: new URL(config.wbdWorkspaceBaseUrl).origin,
        });
        await service.initialize();
        activeWbdOwnerService = service;
        if (!wbdMailConnectorScheduler) {
          const connectors = parseWbdImapConfiguration(process.env).map((mailbox) => new WbdImapMailboxConnector({ mailbox }));
          wbdMailConnectorScheduler = new WbdMailConnectorScheduler({
            service: {
              workspaceView: (...args) => mailControl.workspaceView(...args),
              ingestMailboxSnapshot: (snapshot) => activeWbdOwnerService.ingestMailSnapshot(snapshot),
            },
            connectors,
            intervalMs: Number(process.env.WBD_MAIL_IMAP_INTERVAL_MS || 2 * 60 * 1_000),
            onResult: (result) => log(config, "info", "wbd-mail-connector-refreshed", { mailboxId: result.mailbox.id, ingested: result.ingested, duplicates: result.duplicates }),
            onError: (error) => log(config, "warn", "wbd-mail-connector-refresh-failed", { errorCode: String(error?.code ?? "IMAP_REFRESH_FAILED") }),
          });
        }
        return createWbdOwnerRequestHandler(service, {
          onError: ({ error, method, route, statusCode }) => log(config, statusCode >= 500 ? "error" : "warn", "wbd-owner-api-error", {
            method, route, statusCode, errorCode: String(error?.code ?? "INTERNAL_ERROR"), errorType: String(error?.name ?? typeof error),
          }),
        });
      })();
    }
    return wbdOwnerHandlerPromise;
  };

  if (config.nodeEnv === "production") {
    if (options.verifyAtlasBoundary) {
      await options.verifyAtlasBoundary();
    } else {
      await verifyAtlasMariaDbBoundary(productionDatabaseCredentialsFromEnvironment(process.env).atlas);
    }
    await sportpaleisHandler();
    await wbdOwnerHandler();
  }

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://workspace.runtime");
    const pathname = normalizePathname(requestUrl.pathname);
    const requestHost = String(request.headers.host ?? "").split(":")[0].toLowerCase();
    const canonicalSportpaleisRequest = Boolean(canonicalSportpaleisHost && requestHost === canonicalSportpaleisHost);
    const canonicalWbdRequest = requestHost === canonicalWbdHost;
    const creativeStudioPath = pathname === "/studio"
      || pathname.startsWith("/studio/")
      || pathname === `${sportpaleisBoundary}/studio`
      || pathname.startsWith(`${sportpaleisBoundary}/studio/`);

    if (!config.creativeStudioEnabled && creativeStudioPath) {
      response.statusCode = 303;
      response.setHeader("Location", pathname.startsWith(sportpaleisBoundary) ? `${sportpaleisBoundary}/overzicht` : "/overzicht");
      response.setHeader("Cache-Control", "no-store");
      response.end();
      return;
    }

    if (pathname.startsWith("/api/wbd/v1/") || pathname === "/health/wbd" || pathname === "/ready/wbd") {
      if (!canonicalWbdRequest) {
        sendJson(response, 404, { status: "not-found" }, method);
        return;
      }
      try {
        await (await wbdOwnerHandler())(request, response);
      } catch {
        sendJson(response, 503, { status: "not-configured" }, method);
      }
      return;
    }

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
    if (pathname === workspaceBoundary || pathname.startsWith(`${workspaceBoundary}/`)) {
      if (!canonicalWbdRequest) {
        sendWbdOwnerHtml(response, 404, outsideBoundaryHtml, method);
        return;
      }
      if (pathname === workspaceBoundary || pathname === `${workspaceBoundary}/overzicht`) {
        response.statusCode = 308;
        response.setHeader("Location", `${workspaceHome}${requestUrl.search}`);
        response.setHeader("Cache-Control", "no-store");
        response.end();
        return;
      }
      sendWbdOwnerHtml(response, isOwnerWorkspaceRoute(pathname) ? 200 : 404, isOwnerWorkspaceRoute(pathname) ? workspaceHtml : outsideBoundaryHtml, method);
      return;
    }
    if (canonicalSportpaleisRequest && (pathname === "/" || pathname === sportpaleisBoundary || pathname.startsWith(`${sportpaleisBoundary}/`))) {
      const target = pathname === "/" || pathname === sportpaleisBoundary ? "/overzicht" : pathname.slice(sportpaleisBoundary.length);
      response.statusCode = 308;
      response.setHeader("Location", `${target}${requestUrl.search}`);
      response.setHeader("Cache-Control", "no-store");
      response.end();
      return;
    }
    const sportpaleisAliasTarget = canonicalSportpaleisRequest ? sportpaleisHostAliases.get(pathname) : undefined;
    if (sportpaleisAliasTarget) {
      response.statusCode = 308;
      response.setHeader("Location", `${sportpaleisAliasTarget}${requestUrl.search}`);
      response.setHeader("Cache-Control", "no-store");
      response.end();
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
    if ((workspaceRootAssets.has(pathname) || pathname.startsWith("/assets/"))
      && await serveAsset(response, method, pathname, distRoot)) return;
    if (pathname === "/wbd-owner-icon.svg" && canonicalWbdRequest && await serveAsset(response, method, pathname, distRoot)) return;
    if (canonicalSportpaleisRequest && isCanonicalSportpaleisRoute(pathname)) {
      sendSportpaleisHtml(response, 200, sportpaleisHtml, method);
      return;
    }
    if (isKnownWorkspaceRoute(pathname)) {
      if (pathname.startsWith("/workspace/sportpaleis/")) sendSportpaleisHtml(response, 200, sportpaleisHtml, method);
      else sendHtml(response, 200, workspaceHtml, method);
      return;
    }
    if (isWorkspaceBoundaryPath(pathname)) {
      if (pathname.startsWith("/workspace/sportpaleis/")) sendSportpaleisHtml(response, 404, sportpaleisHtml, method);
      else sendHtml(response, 404, workspaceHtml, method);
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
    const connectorEnabled = options.wbdConnectorEnabled
      ?? (config.nodeEnv === "production" || process.env.ATLAS_WBD_CONNECTOR_ENABLED === "true");
    if (connectorEnabled) {
      void (async () => {
        await wbdOwnerHandler();
        if (!wbdConnectorScheduler) {
          wbdConnectorScheduler = new WbdHomepageConnectorScheduler({
            readPrevious: () => activeWbdOwnerService.connectorState(WBD_HOMEPAGE_CONNECTOR_ID),
            persistSnapshot: (snapshot) => activeWbdOwnerService.ingestConnectorSnapshot(snapshot),
            intervalMs: Number(process.env.ATLAS_WBD_CONNECTOR_INTERVAL_MS || 15 * 60 * 1_000),
            connectorOptions: { source: process.env.ATLAS_WBD_OBSERVATION_SOURCE_URL ?? WBD_HOMEPAGE_SOURCE_URL },
            onEvent: (event) => log(config, event.status === "FAILED" ? "warn" : "info", event.event, event),
          });
        }
        wbdConnectorScheduler.start();
      })().catch((error) => log(config, "error", "atlas-connector-scheduler-start-failed", { errorCode: String(error?.code ?? "INTERNAL_ERROR") }));
    }
    if (parseWbdImapConfiguration(process.env).some(({ configured }) => configured)) {
      void wbdOwnerHandler().then(() => wbdMailConnectorScheduler?.start())
        .catch((error) => log(config, "error", "wbd-mail-connector-scheduler-start-failed", { errorCode: String(error?.code ?? "INTERNAL_ERROR") }));
    }
    if (parseSportpaleisMailboxConfiguration(process.env).configured) {
      void sportpaleisHandler().then(() => sportpaleisMailboxConnectorScheduler?.start())
        .catch((error) => log(config, "error", "sportpaleis-mailbox-scheduler-start-failed", { errorCode: String(error?.code ?? "INTERNAL_ERROR") }));
    }
  });
  server.on("close", () => {
    wbdConnectorScheduler?.stop?.();
    wbdMailConnectorScheduler?.stop?.();
    sportpaleisMailboxConnectorScheduler?.stop?.();
    if (typeof activeSportpaleisStore?.close === "function") {
      void activeSportpaleisStore.close().catch(() => undefined);
    }
    if (typeof activeWbdOwnerStore?.close === "function") {
      void activeWbdOwnerStore.close().catch(() => undefined);
    }
    if (typeof activeWbdMailStore?.close === "function") {
      void activeWbdMailStore.close().catch(() => undefined);
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
    process.stderr.write(`${JSON.stringify({
      level: "error",
      event: "workspace-runtime-start-failed",
      message: error instanceof Error ? error.message : "Unknown error",
      ...secretSafeMariaDbStartupDiagnostic(error),
    })}\n`);
    process.exitCode = 1;
  });
}
