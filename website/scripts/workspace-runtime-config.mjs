const allowedNodeEnvironments = new Set(["development", "test", "production"]);
const allowedAppEnvironments = new Set(["local", "test", "staging", "production"]);
const releaseIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * @typedef {"development" | "test" | "production"} NodeEnvironment
 * @typedef {"local" | "test" | "staging" | "production"} AppEnvironment
 * @typedef {"debug" | "info" | "warn" | "error"} LogLevel
 * @typedef {{
 *   nodeEnv: NodeEnvironment,
 *   appEnv: AppEnvironment,
 *   host: string,
 *   port: number,
 *   publicBaseUrl: string,
 *   workspaceBaseUrl: string,
 *   wbdWorkspaceBaseUrl: string,
 *   releaseId: string,
 *   reviewPrincipalIds: readonly string[],
 *   distDir: string,
 *   logLevel: LogLevel,
 *   productionDatabases: Readonly<{
 *     workspace: Readonly<{host: string, port: number, name: string, user: string}>,
 *     atlas: Readonly<{host: string, port: number, name: string, user: string}>,
 *   }> | null,
 *   productionPolicy: Readonly<{
 *     uploadsEnabled: false,
 *     productionAssetUploadsEnabled: true,
 *     fontUploadsEnabled: true,
 *     mailMode: "capture",
 *     hardwareOutputEnabled: false,
 *     directPrintEnabled: false,
 *     summaEnabled: false,
 *     atlasMode: "boundary-only",
 *     debug: false,
 *   }> | null,
 *   futureDependencies: Readonly<{
 *     database: boolean,
 *     objectStorage: boolean,
 *     identity: boolean,
 *     monitoring: boolean,
 *   }>,
 * }} WorkspaceRuntimeConfig
 */

export class WorkspaceRuntimeConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkspaceRuntimeConfigError";
  }
}

export const workspaceRuntimeEnvironmentSchema = Object.freeze({
  NODE_ENV: { phase: "WS.1", requiredInProduction: true, secret: false },
  APP_ENV: { phase: "WS.1", requiredInProduction: true, secret: false },
  HOST: { phase: "WS.1", requiredInProduction: false, secret: false },
  PORT: { phase: "WS.1", requiredInProduction: false, secret: false },
  PUBLIC_BASE_URL: { phase: "WS.1", requiredInProduction: true, secret: false },
  WORKSPACE_BASE_URL: { phase: "WS.1", requiredInProduction: true, secret: false },
  WBD_WORKSPACE_BASE_URL: { phase: "WBD Owner V1", requiredInProduction: true, secret: false },
  RELEASE_ID: { phase: "WS.1", requiredInProduction: true, secret: false },
  SPORTPALEIS_REVIEW_PRINCIPAL_IDS: { phase: "Sportpaleis Review Mode V1", requiredInProduction: false, secret: false },
  WORKSPACE_DIST_DIR: { phase: "WS.1", requiredInProduction: false, secret: false },
  LOG_LEVEL: { phase: "WS.1", requiredInProduction: false, secret: false },
  WORKSPACE_DB_HOST: { phase: "production persistence", requiredInProduction: true, secret: false },
  WORKSPACE_DB_PORT: { phase: "production persistence", requiredInProduction: false, secret: false },
  WORKSPACE_DB_NAME: { phase: "production persistence", requiredInProduction: true, secret: false },
  WORKSPACE_DB_USER: { phase: "production persistence", requiredInProduction: true, secret: false },
  WORKSPACE_DB_PASSWORD: { phase: "production persistence", requiredInProduction: true, secret: true },
  ATLAS_DB_HOST: { phase: "Atlas boundary", requiredInProduction: true, secret: false },
  ATLAS_DB_PORT: { phase: "Atlas boundary", requiredInProduction: false, secret: false },
  ATLAS_DB_NAME: { phase: "Atlas boundary", requiredInProduction: true, secret: false },
  ATLAS_DB_USER: { phase: "Atlas boundary", requiredInProduction: true, secret: false },
  ATLAS_DB_PASSWORD: { phase: "Atlas boundary", requiredInProduction: true, secret: true },
  WBD_PUSH_VAPID_PUBLIC_KEY: { phase: "WBD Mail Web Push", requiredInProduction: false, secret: false },
  WBD_PUSH_VAPID_PRIVATE_KEY: { phase: "WBD Mail Web Push", requiredInProduction: false, secret: true },
  WBD_PUSH_VAPID_SUBJECT: { phase: "WBD Mail Web Push", requiredInProduction: false, secret: false },
  SPORTPALEIS_UPLOADS_ENABLED: { phase: "pilot policy", requiredInProduction: true, secret: false },
  SPORTPALEIS_PRODUCTION_ASSET_UPLOADS_ENABLED: { phase: "production assets", requiredInProduction: false, secret: false },
  SPORTPALEIS_FONT_UPLOADS_ENABLED: { phase: "pilot policy", requiredInProduction: true, secret: false },
  SPORTPALEIS_MAIL_MODE: { phase: "pilot policy", requiredInProduction: true, secret: false },
  SPORTPALEIS_HARDWARE_OUTPUT_ENABLED: { phase: "pilot policy", requiredInProduction: true, secret: false },
  SPORTPALEIS_DIRECT_PRINT_ENABLED: { phase: "pilot policy", requiredInProduction: true, secret: false },
  SPORTPALEIS_SUMMA_ENABLED: { phase: "pilot policy", requiredInProduction: true, secret: false },
  ATLAS_RUNTIME_MODE: { phase: "Atlas boundary", requiredInProduction: true, secret: false },
  DEBUG: { phase: "production policy", requiredInProduction: true, secret: false },
  DATABASE_URL: { phase: "WS.3", requiredInProduction: false, secret: true },
  OBJECT_STORAGE_ENDPOINT: { phase: "WS.3", requiredInProduction: false, secret: false },
  OBJECT_STORAGE_BUCKET: { phase: "WS.3", requiredInProduction: false, secret: false },
  OBJECT_STORAGE_ACCESS_KEY: { phase: "WS.3", requiredInProduction: false, secret: true },
  OBJECT_STORAGE_SECRET_KEY: { phase: "WS.3", requiredInProduction: false, secret: true },
  IDENTITY_ISSUER: { phase: "WS.2", requiredInProduction: false, secret: false },
  IDENTITY_CLIENT_ID: { phase: "WS.2", requiredInProduction: false, secret: false },
  IDENTITY_CLIENT_SECRET: { phase: "WS.2", requiredInProduction: false, secret: true },
  SENTRY_DSN: { phase: "later monitoring", requiredInProduction: false, secret: true },
});

function value(env, name) {
  return String(env[name] ?? "").trim();
}

function required(env, name) {
  const result = value(env, name);
  if (!result) throw new WorkspaceRuntimeConfigError(`${name} is verplicht in production mode.`);
  return result;
}

function parsePort(raw) {
  const port = Number(raw || "3000");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new WorkspaceRuntimeConfigError("PORT moet een geheel getal tussen 0 en 65535 zijn.");
  }
  return port;
}

function parseDatabasePort(raw, name) {
  const port = Number(raw || "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new WorkspaceRuntimeConfigError(`${name} moet een geheel getal tussen 1 en 65535 zijn.`);
  }
  return port;
}

function databaseCredentials(env, prefix) {
  return Object.freeze({
    host: required(env, `${prefix}_DB_HOST`),
    port: parseDatabasePort(value(env, `${prefix}_DB_PORT`), `${prefix}_DB_PORT`),
    name: required(env, `${prefix}_DB_NAME`),
    user: required(env, `${prefix}_DB_USER`),
    password: required(env, `${prefix}_DB_PASSWORD`),
  });
}

export function productionDatabaseCredentialsFromEnvironment(env = process.env) {
  return Object.freeze({
    workspace: databaseCredentials(env, "WORKSPACE"),
    atlas: databaseCredentials(env, "ATLAS"),
  });
}

function requiredLiteral(env, name, expected) {
  const actual = required(env, name);
  if (actual !== expected) throw new WorkspaceRuntimeConfigError(`${name} moet in deze pilot exact ${expected} zijn.`);
  return actual;
}

function parseHttpUrl(raw, name) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new WorkspaceRuntimeConfigError(`${name} moet een absolute http(s)-URL zijn.`);
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol) || parsed.username || parsed.password) {
    throw new WorkspaceRuntimeConfigError(`${name} moet een absolute http(s)-URL zonder credentials zijn.`);
  }
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

/**
 * Validate environment configuration without logging or returning secret values.
 * Future dependency fields are represented only as configured/not-configured.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {WorkspaceRuntimeConfig}
 */
export function parseWorkspaceRuntimeConfig(env) {
  const nodeEnv = value(env, "NODE_ENV") || "development";
  const appEnv = value(env, "APP_ENV") || (nodeEnv === "test" ? "test" : "local");
  if (!allowedNodeEnvironments.has(nodeEnv)) throw new WorkspaceRuntimeConfigError("NODE_ENV is ongeldig.");
  if (!allowedAppEnvironments.has(appEnv)) throw new WorkspaceRuntimeConfigError("APP_ENV is ongeldig.");

  const productionMode = nodeEnv === "production";
  if (productionMode && appEnv !== "staging" && appEnv !== "production") {
    throw new WorkspaceRuntimeConfigError("APP_ENV moet staging of production zijn wanneer NODE_ENV=production.");
  }

  const port = parsePort(value(env, "PORT"));
  const localOrigin = `http://127.0.0.1:${port}`;
  const publicBaseUrl = parseHttpUrl(
    productionMode ? required(env, "PUBLIC_BASE_URL") : value(env, "PUBLIC_BASE_URL") || localOrigin,
    "PUBLIC_BASE_URL",
  );
  const workspaceBaseUrl = parseHttpUrl(
    productionMode ? required(env, "WORKSPACE_BASE_URL") : value(env, "WORKSPACE_BASE_URL") || `${localOrigin}/workspace/wbd`,
    "WORKSPACE_BASE_URL",
  );
  const wbdWorkspaceBaseUrl = parseHttpUrl(
    productionMode ? required(env, "WBD_WORKSPACE_BASE_URL") : value(env, "WBD_WORKSPACE_BASE_URL") || `${localOrigin}/workspace/wbd`,
    "WBD_WORKSPACE_BASE_URL",
  );
  const releaseId = productionMode ? required(env, "RELEASE_ID") : value(env, "RELEASE_ID") || "local-development";
  if (!releaseIdPattern.test(releaseId)) {
    throw new WorkspaceRuntimeConfigError("RELEASE_ID moet een opaque identifier van maximaal 128 veilige tekens zijn.");
  }
  const reviewPrincipalIds = Object.freeze(value(env, "SPORTPALEIS_REVIEW_PRINCIPAL_IDS")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean));
  if (reviewPrincipalIds.some((entry) => !/^user-[a-f0-9]{16}$/u.test(entry))) {
    throw new WorkspaceRuntimeConfigError("SPORTPALEIS_REVIEW_PRINCIPAL_IDS bevat een ongeldige canonical principal ID.");
  }

  const logLevel = value(env, "LOG_LEVEL") || "info";
  if (!new Set(["debug", "info", "warn", "error"]).has(logLevel)) {
    throw new WorkspaceRuntimeConfigError("LOG_LEVEL is ongeldig.");
  }

  let productionDatabases = null;
  let productionPolicy = null;
  if (productionMode) {
    const credentials = productionDatabaseCredentialsFromEnvironment(env);
    productionDatabases = Object.freeze({
      workspace: Object.freeze({ host: credentials.workspace.host, port: credentials.workspace.port, name: credentials.workspace.name, user: credentials.workspace.user }),
      atlas: Object.freeze({ host: credentials.atlas.host, port: credentials.atlas.port, name: credentials.atlas.name, user: credentials.atlas.user }),
    });
    productionPolicy = Object.freeze({
      uploadsEnabled: requiredLiteral(env, "SPORTPALEIS_UPLOADS_ENABLED", "false") === "true",
      productionAssetUploadsEnabled: requiredLiteral({ SPORTPALEIS_PRODUCTION_ASSET_UPLOADS_ENABLED: "true", ...env }, "SPORTPALEIS_PRODUCTION_ASSET_UPLOADS_ENABLED", "true") === "true",
      fontUploadsEnabled: requiredLiteral(env, "SPORTPALEIS_FONT_UPLOADS_ENABLED", "true") === "true",
      mailMode: requiredLiteral(env, "SPORTPALEIS_MAIL_MODE", "capture"),
      hardwareOutputEnabled: requiredLiteral(env, "SPORTPALEIS_HARDWARE_OUTPUT_ENABLED", "false") === "true",
      directPrintEnabled: requiredLiteral(env, "SPORTPALEIS_DIRECT_PRINT_ENABLED", "false") === "true",
      summaEnabled: requiredLiteral(env, "SPORTPALEIS_SUMMA_ENABLED", "false") === "true",
      atlasMode: requiredLiteral(env, "ATLAS_RUNTIME_MODE", "boundary-only"),
      debug: requiredLiteral(env, "DEBUG", "false") === "true",
    });
  }

  return Object.freeze({
    nodeEnv,
    appEnv,
    host: value(env, "HOST") || (productionMode ? "0.0.0.0" : "127.0.0.1"),
    port,
    publicBaseUrl,
    workspaceBaseUrl,
    wbdWorkspaceBaseUrl,
    releaseId,
    reviewPrincipalIds,
    distDir: value(env, "WORKSPACE_DIST_DIR") || "dist-workspace",
    logLevel,
    productionDatabases,
    productionPolicy,
    futureDependencies: Object.freeze({
      database: Boolean(value(env, "DATABASE_URL")),
      objectStorage: Boolean(value(env, "OBJECT_STORAGE_ENDPOINT") && value(env, "OBJECT_STORAGE_BUCKET")),
      identity: Boolean(value(env, "IDENTITY_ISSUER") && value(env, "IDENTITY_CLIENT_ID")),
      monitoring: Boolean(value(env, "SENTRY_DSN")),
    }),
  });
}
