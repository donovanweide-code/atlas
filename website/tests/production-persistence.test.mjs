import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createSportpaleisProductionBootstrap,
  createSportpaleisPasswordRecord,
  createSportpaleisPilotRequestHandler,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  SportpaleisMariaDbStore,
  SportpaleisMariaDbStoreError,
  secretSafeMariaDbStartupDiagnostic,
} from "../scripts/sportpaleis-mariadb-store.mjs";
import {
  SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY,
  createSportpaleisProductionMailFoundation,
  sportpaleisProductionMailPolicy,
} from "../scripts/sportpaleis-production-mail.mjs";
import {
  parseWorkspaceRuntimeConfig,
  productionDatabaseCredentialsFromEnvironment,
  WorkspaceRuntimeConfigError,
} from "../scripts/workspace-runtime-config.mjs";
import { createWorkspaceRuntimeServer, sportpaleisRuntimeErrorLogFields, SPORTPALEIS_RUNTIME_ARTIFACT_ROOT } from "../scripts/workspace-runtime.mjs";
import { createInitialWbdOwnerState } from "../scripts/wbd-owner-foundation.mjs";
import { collectRuntimeDependencyGraph } from "../scripts/release-runtime-graph.mjs";

const migrationFile = new URL("../sportpaleis-server/production-migrations/workspace/001-runtime-state.sql", import.meta.url);
const passwords = { kevin: "Test-Kevin-Production!", patrick: "Test-Patrick-Production!", collega: "Test-Collega-Production!", "donovan-support": "Test-Support-Production!" };

function productionEnvironment() {
  return {
    NODE_ENV: "production",
    APP_ENV: "production",
    PUBLIC_BASE_URL: "https://webuildanddesign.nl",
    WORKSPACE_BASE_URL: "https://workspace.sportpaleis.nl",
    WBD_WORKSPACE_BASE_URL: "https://workspace.webuildanddesign.nl",
    RELEASE_ID: "production-persistence-test",
    WORKSPACE_DB_HOST: "127.0.0.1",
    WORKSPACE_DB_PORT: "3306",
    WORKSPACE_DB_NAME: "wbd_workspace",
    WORKSPACE_DB_USER: "wbd_workspace_app",
    WORKSPACE_DB_PASSWORD: "workspace-secret-not-returned",
    ATLAS_DB_HOST: "127.0.0.1",
    ATLAS_DB_PORT: "3306",
    ATLAS_DB_NAME: "wbd_atlas",
    ATLAS_DB_USER: "wbd_atlas_app",
    ATLAS_DB_PASSWORD: "atlas-secret-not-returned",
    SPORTPALEIS_UPLOADS_ENABLED: "false",
    SPORTPALEIS_CREATIVE_STUDIO_ENABLED: "false",
    SPORTPALEIS_FONT_UPLOADS_ENABLED: "true",
    SPORTPALEIS_MAIL_MODE: "capture",
    SPORTPALEIS_HARDWARE_OUTPUT_ENABLED: "false",
    SPORTPALEIS_DIRECT_PRINT_ENABLED: "false",
    SPORTPALEIS_SUMMA_ENABLED: "false",
    ATLAS_RUNTIME_MODE: "boundary-only",
    DEBUG: "false",
  };
}

class MemoryPool {
  constructor(checksum) {
    this.checksum = checksum;
    this.row = null;
    this.rollbackCalls = 0;
    this.failNextUpdate = null;
    this.fullStateReads = 0;
    this.revisionReads = 0;
    this.queryDelayMs = 0;
    this.activeQueries = 0;
    this.queryHighWatermark = 0;
    this.activeConnections = 0;
    this.connectionHighWatermark = 0;
  }

  async getConnection() {
    this.activeConnections += 1;
    this.connectionHighWatermark = Math.max(this.connectionHighWatermark, this.activeConnections);
    return new MemoryConnection(this, true);
  }

  async query(sql, params) {
    return new MemoryConnection(this).query(sql, params);
  }
}

class MemoryConnection {
  constructor(pool, trackedConnection = false) {
    this.pool = pool;
    this.trackedConnection = trackedConnection;
    this.released = false;
  }

  async beginTransaction() {}
  async commit() {}
  async rollback() { this.pool.rollbackCalls += 1; }
  release() {
    if (!this.trackedConnection || this.released) return;
    this.released = true;
    this.pool.activeConnections -= 1;
  }

  async query(sql, params = []) {
    this.pool.activeQueries += 1;
    this.pool.queryHighWatermark = Math.max(this.pool.queryHighWatermark, this.pool.activeQueries);
    if (this.pool.queryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.pool.queryDelayMs));
    try {
      return this.#execute(sql, params);
    } finally {
      this.pool.activeQueries -= 1;
    }
  }

  #execute(sql, params = []) {
    if (sql.includes("FROM wbd_schema_migrations")) return [{ checksum: this.pool.checksum }];
    if (sql.startsWith("SELECT revision, state_json")) {
      this.pool.fullStateReads += 1;
      return this.pool.row ? [{ revision: this.pool.row.revision, state_json: this.pool.row.state_json }] : [];
    }
    if (sql.startsWith("SELECT revision FROM sp_runtime_state")) {
      this.pool.revisionReads += 1;
      return this.pool.row ? [{ revision: this.pool.row.revision }] : [];
    }
    if (sql.startsWith("INSERT INTO sp_runtime_state")) {
      this.pool.row = { revision: Number(params[2]), state_json: params[3] };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE sp_runtime_state")) {
      if (this.pool.failNextUpdate) {
        const error = this.pool.failNextUpdate;
        this.pool.failNextUpdate = null;
        throw error;
      }
      if (!this.pool.row || this.pool.row.revision !== Number(params[4])) return { affectedRows: 0 };
      this.pool.row = { revision: Number(params[1]), state_json: params[2] };
      return { affectedRows: 1 };
    }
    throw new Error(`Unexpected SQL in memory store: ${sql}`);
  }
}

test("productieconfiguratie is fail-closed, DB-only en houdt secrets buiten logbare config", () => {
  assert.throws(() => parseWorkspaceRuntimeConfig({ NODE_ENV: "production", APP_ENV: "production" }), WorkspaceRuntimeConfigError);
  const environment = productionEnvironment();
  const config = parseWorkspaceRuntimeConfig(environment);
  assert.equal(config.productionDatabases.workspace.name, "wbd_workspace");
  assert.equal(SPORTPALEIS_RUNTIME_ARTIFACT_ROOT, "/srv/wbd/shared");
  assert.equal(config.productionDatabases.atlas.name, "wbd_atlas");
  assert.deepEqual(config.productionPolicy, {
    uploadsEnabled: false,
    productionAssetUploadsEnabled: true,
    fontUploadsEnabled: true,
    mailMode: "capture",
    hardwareOutputEnabled: false,
    directPrintEnabled: false,
    summaEnabled: false,
    atlasMode: "boundary-only",
    debug: false,
  });
  assert.doesNotMatch(JSON.stringify(config), /workspace-secret|atlas-secret/);
  assert.equal(productionDatabaseCredentialsFromEnvironment(environment).workspace.password, "workspace-secret-not-returned");
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...environment, SPORTPALEIS_MAIL_MODE: "smtp" }), /exact capture/);
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...environment, SPORTPALEIS_SUMMA_ENABLED: "true" }), /exact false/);
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...environment, SPORTPALEIS_FONT_UPLOADS_ENABLED: "false" }), /exact true/);
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...environment, SPORTPALEIS_PRODUCTION_ASSET_UPLOADS_ENABLED: "false" }), /exact true/);
});

test("MariaDB startupdiagnose classificeert oorzaken zonder secrets of connection values", () => {
  const wrapped = (code, cause = null) => new SportpaleisMariaDbStoreError("Workspace MariaDB-initialisatie is mislukt.", code, cause);
  const cases = [
    [wrapped("DATABASE_CONNECTION_FAILED", Object.assign(new Error("dns"), { code: "ENOTFOUND" })), "DNS/CONNECT"],
    [wrapped("DATABASE_CONNECTION_FAILED", Object.assign(new Error("auth"), { code: "ER_ACCESS_DENIED_ERROR", sqlState: "28000", errno: 1045 })), "AUTH"],
    [wrapped("DATABASE_CONNECTION_FAILED", Object.assign(new Error("tls"), { code: "CERT_HAS_EXPIRED" })), "TLS"],
    [wrapped("DATABASE_INITIALIZATION_FAILED", Object.assign(new Error("db"), { code: "ER_BAD_DB_ERROR" })), "DATABASE_NOT_FOUND"],
    [wrapped("DATABASE_INITIALIZATION_FAILED", Object.assign(new Error("permission"), { code: "ER_TABLEACCESS_DENIED_ERROR" })), "PERMISSION"],
    [wrapped("DATABASE_INITIALIZATION_FAILED", new Error("legacy state validation failed")), "SCHEMA"],
    [wrapped("DATABASE_CONNECTION_FAILED", Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), "TIMEOUT"],
    [new Error("invalid runtime config"), "DRIVER/CONFIG"],
  ];
  for (const [error, expected] of cases) assert.equal(secretSafeMariaDbStartupDiagnostic(error).causeClass, expected);
  const secret = wrapped("DATABASE_CONNECTION_FAILED", Object.assign(new Error("password=do-not-log host=db.internal"), { code: "ER_ACCESS_DENIED_ERROR" }));
  const serialized = JSON.stringify(secretSafeMariaDbStartupDiagnostic(secret));
  assert.doesNotMatch(serialized, /do-not-log|db\.internal|password/iu);
  assert.deepEqual(Object.keys(secretSafeMariaDbStartupDiagnostic(secret)).sort(), ["causeClass", "causeCode", "causeErrno", "causeSqlState", "errorCode"].sort());
});

test("production startup controleert Atlas en Workspace vóór luisteren en valt niet terug op files", async () => {
  const config = parseWorkspaceRuntimeConfig(productionEnvironment());
  const calls = [];
  const store = {
    async initialize() { calls.push("workspace"); },
    async read() { throw new Error("not used"); },
    async mutate() { throw new Error("not used"); },
    async close() {},
  };
  let wbdOwnerState = createInitialWbdOwnerState({
    passwordRecord: await createSportpaleisPasswordRecord("Test-WBD-Owner-Production!"),
  });
  const wbdOwnerStore = {
    async initialize() { calls.push("wbd-owner"); },
    async read() { return structuredClone(wbdOwnerState); },
    async mutate(mutator) {
      const draft = structuredClone(wbdOwnerState);
      const result = await mutator(draft);
      wbdOwnerState = draft;
      return { state: structuredClone(wbdOwnerState), result, revision: wbdOwnerState.revision };
    },
    async close() {},
  };
  await createWorkspaceRuntimeServer({
    config,
    sportpaleisStore: store,
    wbdOwnerStore,
    releaseManifest: {
      schemaVersion: 2,
      releaseId: config.releaseId,
      commit: "1".repeat(40),
      tag: config.releaseId,
      sourceDate: "2026-08-25",
      files: [{ path: "app/scripts/workspace-runtime.mjs", sha256: "2".repeat(64) }],
    },
    verifyAtlasBoundary: async () => { calls.push("atlas"); },
  });
  assert.deepEqual(calls, ["atlas", "workspace", "wbd-owner"]);
  await assert.rejects(
    createWorkspaceRuntimeServer({
      config,
      sportpaleisStore: {
        async initialize() { throw new Error("database unavailable"); },
        async read() { throw new Error("not used"); },
        async mutate() { throw new Error("not used"); },
      },
      verifyAtlasBoundary: async () => undefined,
    }),
    /database unavailable/,
  );
  const source = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  assert.match(source, /config\.nodeEnv === "production"[\s\S]*SportpaleisMariaDbStore/);
  assert.match(source, /config\.nodeEnv === "production"[\s\S]*await sportpaleisHandler\(\)/);
  assert.match(source, /createSportpaleisProductionMailFoundation/);
  assert.match(source, /SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY/);
  assert.doesNotMatch(source, /catch[\s\S]{0,200}SportpaleisFileStore/);
  assert.doesNotMatch(source, /JsonMailStore|MemoryMailStore|createLocalMailFoundation/);
  const releaseBuilder = await readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8");
  for (const required of [
    "sportpaleis-logo-mail-safe.png",
    "collectReferencedProductionArtifacts",
    "persistentProductionArtifacts",
    "nginx-workspace-predeployment.conf",
    "nginx-workspace-sportpaleis-predeployment.conf",
    "collectRuntimeDependencyGraph",
    "runtimeDependencyGraph",
    "sportpaleis-prelive-order-cleanup.mjs",
    "sportpaleis-teamwear-pilot-control.mjs",
  ]) assert.match(releaseBuilder, new RegExp(required.replaceAll(".", "\\.")));
  const sharedHostNginx = await readFile(new URL("../../ops/production/nginx-workspace-predeployment.conf", import.meta.url), "utf8");
  assert.match(sharedHostNginx, /location = \/sportpaleis-sw\.js \{[\s\S]*proxy_pass http:\/\/wbd_workspace_runtime\/sportpaleis-sw\.js;/);
  assert.doesNotMatch(releaseBuilder, /collect\(path\.join\(repositoryRoot, "outputs?"\)/);
  assert.doesNotMatch(releaseBuilder, /wbd-logo-mail-safe/);
});

test("releasebuilder volgt de gecontroleerde production runtime-importgraph zonder tests of reviewdata", async () => {
  const websiteRoot = fileURLToPath(new URL("..", import.meta.url));
  const graph = await collectRuntimeDependencyGraph({
    websiteRoot,
    entrypoints: [
      fileURLToPath(new URL("../scripts/workspace-runtime.mjs", import.meta.url)),
      fileURLToPath(new URL("../scripts/production-migrate.mjs", import.meta.url)),
      fileURLToPath(new URL("../src/workspace-sequence.ts", import.meta.url)),
    ],
    allowedRoots: [
      fileURLToPath(new URL("../scripts", import.meta.url)),
      fileURLToPath(new URL("../config", import.meta.url)),
      fileURLToPath(new URL("../src/sportpaleis", import.meta.url)),
      fileURLToPath(new URL("../src/workspace-sequence.ts", import.meta.url)),
    ],
  });
  const packaged = new Set(graph.map(({ archive }) => archive));
  for (const required of [
    "app/scripts/workspace-runtime.mjs",
    "app/scripts/mail-foundation.mjs",
    "app/scripts/organization-brand-foundation.mjs",
    "app/scripts/sportpaleis-production-mail.mjs",
    "app/scripts/sportpaleis-pilot-foundation.mjs",
    "app/src/sportpaleis/production-sources.ts",
    "app/src/sportpaleis/direct-print/index.ts",
    "app/src/sportpaleis/direct-print/cut-job.ts",
    "app/src/sportpaleis/direct-print/reference-2-34-77.ts",
    "app/src/sportpaleis/production-asset-inspection-worker.mjs",
  ]) assert.ok(packaged.has(required), `${required} ontbreekt in runtimegraph`);
  assert.ok([...packaged].every((archive) => !archive.includes("/tests/") && !archive.includes(".codex-tmp")));
});

test("production package installeert alle gelockte runtime dependencies", async () => {
  const productionPackage = JSON.parse(await readFile(new URL("../package.production.json", import.meta.url), "utf8"));
  const developmentPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const productionAssets = await readFile(new URL("../src/sportpaleis/production-assets.mjs", import.meta.url), "utf8");

  assert.match(productionAssets, /from "pdfjs-dist\/legacy\/build\/pdf\.mjs"/u);
  assert.equal(productionPackage.dependencies["pdfjs-dist"], "6.2.108");
  assert.equal(productionPackage.dependencies["pdfjs-dist"], developmentPackage.dependencies["pdfjs-dist"]);
  assert.equal(productionPackage.dependencies["pdfjs-dist"], packageLock.packages[""].dependencies["pdfjs-dist"]);
  assert.ok(packageLock.packages["node_modules/pdfjs-dist"]);
  assert.notEqual(packageLock.packages["node_modules/pdfjs-dist"].dev, true);
  for (const dependency of ["imapflow", "mailparser"]) {
    assert.equal(productionPackage.dependencies[dependency], developmentPackage.dependencies[dependency]);
    assert.equal(productionPackage.dependencies[dependency], packageLock.packages[""].dependencies[dependency]);
    assert.ok(packageLock.packages[`node_modules/${dependency}`]);
    assert.notEqual(packageLock.packages[`node_modules/${dependency}`].dev, true);
  }
});

test("productiebootstrap bevat alleen goedgekeurde referentieconfiguratie en nul accounts/orders", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-08-10T16:30:00.000Z"));
  assert.equal(state.organizationId, "sport-2000-sportpaleis-bv");
  assert.equal(state.users.length, 0);
  assert.equal(state.orders.length, 0);
  assert.equal(state.sessions.length, 0);
  assert.equal(state.feedback.length, 0);
  assert.ok(state.articles.length > 0);
  assert.ok(state.associations.length > 0);
  assert.ok(state.productionProfiles.length > 0);
  const bootstrapAudit = state.audit.find(({ id }) => id === "audit-production-bootstrap");
  assert.equal(bootstrapAudit.details.ordersCreated, 0);
  assert.equal(bootstrapAudit.details.usersCreated, 0);
  assert.doesNotMatch(JSON.stringify(state), /Daniël Wouters|Interne productietest|example\.nl|Kevin Demo|Patrick Demo/);
});

test("MariaDB-store initialiseert leeg, bewaart transacties en overleeft een store-restart", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const first = new SportpaleisMariaDbStore({ pool });
  await first.initialize();
  assert.equal((await first.read()).orders.length, 0);
  await first.mutate(async (state) => {
    state.settings.processingDays = 6;
    return { state, value: "saved" };
  });
  const restarted = new SportpaleisMariaDbStore({ pool });
  await restarted.initialize();
  const state = await restarted.read();
  assert.equal(state.settings.processingDays, 6);
  assert.equal(state.revision, 2);
  assert.equal((await restarted.storageStatus()).engine, "mariadb");
});

test("MariaDB-store hergebruikt gevalideerde state bij gelijke revision en invalideert veilig", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const fullReadsAfterInitialize = pool.fullStateReads;
  const first = await store.read();
  const second = await store.read();
  assert.notEqual(first, second);
  assert.equal(pool.fullStateReads, fullReadsAfterInitialize);
  assert.equal(pool.revisionReads, 2);
  await store.mutate(async (state) => { state.settings.processingDays = 9; return { state, value: null }; });
  const after = await store.read();
  assert.equal(after.settings.processingDays, 9);
  assert.equal(pool.fullStateReads, fullReadsAfterInitialize + 1);
  assert.equal(pool.revisionReads, 3);
  pool.row = { revision: 50, state_json: JSON.stringify({ ...after, revision: 50, settings: { ...after.settings, processingDays: 4 } }) };
  const external = await store.read();
  assert.equal(external.revision, 50);
  assert.equal(external.settings.processingDays, 4);
  assert.equal(pool.fullStateReads, fullReadsAfterInitialize + 2);
});

test("MariaDB-store geeft authenticated reads één immutable snapshot zonder full-state clones per request", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const first = await store.readSnapshot();
  const second = await store.readSnapshot();
  assert.equal(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.settings), true);
  assert.throws(() => { first.settings.processingDays = 99; }, TypeError);
  assert.equal((await store.read()).settings.processingDays, first.settings.processingDays);
});

test("MariaDB-store coalescet gelijktijdige snapshotreads tot één revision-query", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const originalQuery = pool.query.bind(pool);
  let releaseRevisionRead;
  const revisionGate = new Promise((resolve) => { releaseRevisionRead = resolve; });
  pool.query = async (sql, params) => {
    if (sql.startsWith("SELECT revision FROM sp_runtime_state")) await revisionGate;
    return originalQuery(sql, params);
  };
  const readsBefore = pool.revisionReads;
  const pending = Array.from({ length: 40 }, () => store.readSnapshot());
  await new Promise((resolve) => setImmediate(resolve));
  releaseRevisionRead();
  const snapshots = await Promise.all(pending);
  assert.equal(pool.revisionReads - readsBefore, 1);
  assert.ok(snapshots.every((snapshot) => snapshot === snapshots[0]));
});

test("R2.26.41 22-MB envelope-stress houdt auth, previews en cache-invalidatie begrensd", async (context) => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const password = "P1-MariaDB-Load-Foundation!";
  await store.mutate(async (state) => {
    state.users.push({
      id: "p1-load-admin",
      name: "P1 Load Admin",
      initials: "PL",
      role: "admin",
      email: "p1-load-admin@sportpaleis.test",
      status: "Actief",
      seatType: "customer",
      salesNumber: null,
      password: await createSportpaleisPasswordRecord(password),
    });
    return { state, value: undefined };
  });
  const candidateId = "spw-experience-simplification-candidate-r2-2-20260828";
  const service = new SportpaleisPilotService({
    store,
    allowedOrigin: "http://127.0.0.1",
    activeReviewCandidateIds: [candidateId],
    reviewAccessEnabled: true,
    reviewAccessIssuerPrincipalIds: ["p1-load-admin"],
    reviewAccessIssuerSecret: "p1-load-review-issuer-secret-with-sufficient-entropy",
  });
  await service.initialize();
  const admin = await service.login({ email: "p1-load-admin@sportpaleis.test", password });
  const issued = await service.issueReviewDeveloperGrant(admin.token, admin.csrfToken, {
    candidateId,
    scopes: ["candidate.review.read", "candidate.debug.read"],
    humanGoReference: "GO-P1-R22641-LOAD",
    ttlMs: 30 * 60 * 1_000,
    runId: "p1-r22641-load-run",
    role: "operator",
  });
  const activation = new URL(issued.activationPath, "https://workspace.sportpaleis.nl");
  const fragment = new URLSearchParams(activation.hash.slice(1));
  const review = await service.activateReviewDeveloperGrant({ activationToken: fragment.get("token"), candidateId: fragment.get("candidate") });
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0H100V50H0Z"/></svg>');
  const source = await service.createProductionAssetSource(admin.token, admin.csrfToken, {
    filename: "p1-production-shaped.svg",
    mimeType: "image/svg+xml",
    dataBase64: svg.toString("base64"),
    provenance: "R2.26.41 production-shaped fixture",
    intakeKind: "ARTWORK",
    conversionMethod: "HUMAN_VERIFIED_SVG",
  });
  const randomBlock = randomBytes(16 * 1024).toString("base64");
  await store.mutate(async (state) => {
    const storedSource = state.productionAssetSources.find(({ id }) => id === source.id);
    const candidate = storedSource.candidates[0];
    storedSource.candidates = Array.from({ length: 300 }, (_, index) => ({ ...structuredClone(candidate), id: `${candidate.id}-load-${index}` }));
    state.audit.unshift({
      id: "audit-p1-production-shaped-load",
      userId: admin.user.id,
      action: "Production-shaped belastingsfixture",
      subject: "R2.26.41",
      at: new Date().toISOString(),
      details: { payload: randomBlock.repeat(1_024) },
    });
    return { state, value: undefined };
  });
  const largeState = await store.readSnapshot();
  assert.ok(Buffer.byteLength(JSON.stringify(largeState)) >= 22 * 1024 * 1024, "de echte MariaDB-state is minimaal 22 MB");
  const businessHash = (state) => createHash("sha256").update(JSON.stringify({ orders: state.orders, productionJobs: state.productionJobs, productionProposals: state.productionProposals })).digest("hex");
  const before = { revision: largeState.revision, audit: largeState.audit.length, businessHash: businessHash(largeState) };
  const previewRoutes = largeState.productionAssetSources.find(({ id }) => id === source.id).candidates.map(({ id }) => `/api/sportpaleis/v1/production-asset-sources/${source.id}/candidates/${id}/preview.svg`);
  const errors = [];
  const server = createServer(createSportpaleisPilotRequestHandler(service, { onError: (entry) => errors.push(entry) }));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  service.allowedOrigin = origin;
  const cookies = { admin: `sportpaleis_session=${admin.token}`, review: `sportpaleis_session=${review.sessionToken}` };
  pool.queryDelayMs = 8;
  pool.queryHighWatermark = 0;
  pool.connectionHighWatermark = 0;
  const fullReadsBefore = pool.fullStateReads;
  let lastTick = performance.now();
  let maxEventLoopLagMs = 0;
  const ticker = setInterval(() => {
    const now = performance.now();
    maxEventLoopLagMs = Math.max(maxEventLoopLagMs, now - lastTick - 10);
    lastTick = now;
  }, 10);
  const timings = [];
  const timedFetch = async (route, cookie) => {
    const started = performance.now();
    const response = await fetch(`${origin}${route}`, { headers: { cookie } });
    await response.arrayBuffer();
    timings.push(performance.now() - started);
    return response.status;
  };
  const controlledMutation = store.mutate(async (state) => {
    state.settings.processingDays += 1;
    return { state, value: undefined };
  });
  const routes = Array.from({ length: 120 }, (_, index) => {
    if (index % 20 === 0) return "/api/sportpaleis/v1/bootstrap";
    if (index % 3 === 0) return previewRoutes[index % previewRoutes.length];
    return index % 2 === 0 ? "/api/sportpaleis/v1/auth/session" : "/api/sportpaleis/v1/state-revision";
  });
  const statuses = [];
  for (let offset = 0; offset < routes.length; offset += 12) {
    const batch = await Promise.all(routes.slice(offset, offset + 12).map((route, index) => timedFetch(route, (offset + index) % 2 === 0 ? cookies.admin : cookies.review)));
    statuses.push(...batch);
  }
  await controlledMutation;
  clearInterval(ticker);
  const after = await store.readSnapshot();
  const sortedTimings = timings.toSorted((left, right) => left - right);
  const p95 = sortedTimings[Math.floor(sortedTimings.length * 0.95)];
  assert.ok(statuses.every((status) => status === 200), "alle auth/bootstrap/revision/previewroutes blijven 200");
  assert.equal(errors.length, 0, "geen 500/504 of routefout onder belasting");
  assert.equal(after.revision, before.revision + 1, "de gecontroleerde mutatie invalideert de cache exact eenmaal");
  assert.equal(after.audit.length, before.audit, "normale reads schrijven geen audit");
  assert.equal(businessHash(after), before.businessHash, "orders, productiejobs en voorstellen blijven bit-identiek");
  assert.ok(pool.fullStateReads - fullReadsBefore <= 1, "cache-invalidatie veroorzaakt maximaal één gedeelde full-state read");
  assert.ok(pool.queryHighWatermark <= 2, `query-high-watermark bleef ${pool.queryHighWatermark}`);
  assert.ok(pool.connectionHighWatermark <= 1, `connection-high-watermark bleef ${pool.connectionHighWatermark}`);
  assert.ok(maxEventLoopLagMs < 2_000, `zelfs onder parallelle volledige regressie bleef event-looplag ${maxEventLoopLagMs.toFixed(1)} ms`);
  assert.ok(p95 < 5_000, `route-p95 bleef ${p95.toFixed(1)} ms`);
  context.diagnostic(JSON.stringify({ stateBytes: Buffer.byteLength(JSON.stringify(after)), storedEnvelopeBytes: Buffer.byteLength(pool.row.state_json), distinctPreviewRoutes: previewRoutes.length, requests: timings.length, routeP95Ms: Number(p95.toFixed(1)), routeMaxMs: Number(Math.max(...timings).toFixed(1)), maxEventLoopLagMs: Number(maxEventLoopLagMs.toFixed(1)), queryHighWatermark: pool.queryHighWatermark, connectionHighWatermark: pool.connectionHighWatermark, fullStateReads: pool.fullStateReads - fullReadsBefore }));
});

test("MariaDB-store sluit expliciete no-op mutaties zonder revisionwrite af", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const before = await store.readSnapshot();
  const rollbackCalls = pool.rollbackCalls;
  const result = await store.mutate(async (state) => ({ state, value: "unchanged", unchanged: true }));
  assert.equal(result.value, "unchanged");
  assert.equal(result.state.revision, before.revision);
  assert.equal(pool.rollbackCalls, rollbackCalls + 1);
  assert.equal(JSON.parse(pool.row.state_json).revision, before.revision);
});

test("MariaDB-store behoudt functionele fouten na rollback en vertaalt alleen echte DB-fouten", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const before = JSON.parse(pool.row.state_json);
  const domainError = Object.assign(new Error("Kies een geldige vereniging."), { statusCode: 422, code: "ASSOCIATION_INVALID" });

  await assert.rejects(
    store.mutate(async (state) => {
      state.nextOrderSequence += 1;
      state.orders.unshift({ id: "SP-2026-TEST-PARTIAL" });
      throw domainError;
    }),
    (error) => error === domainError
      && error.statusCode === 422
      && error.code === "ASSOCIATION_INVALID"
      && error.message === "Kies een geldige vereniging."
      && error.transactionPhase === "mutator"
      && error.transactionRollbackStatus === "succeeded",
  );
  assert.equal(pool.rollbackCalls, 1);
  assert.deepEqual(JSON.parse(pool.row.state_json), before);
  assert.equal(JSON.parse(pool.row.state_json).orders.some(({ id }) => id === "SP-2026-TEST-PARTIAL"), false);

  const databaseCause = Object.assign(new Error("connection lost"), { code: "ER_SERVER_SHUTDOWN" });
  pool.failNextUpdate = databaseCause;
  await assert.rejects(
    store.mutate(async (state) => {
      state.settings.processingDays = 7;
      return { state, value: "not-committed" };
    }),
    (error) => error instanceof SportpaleisMariaDbStoreError
      && error.code === "DATABASE_TRANSACTION_FAILED"
      && error.cause === databaseCause
      && error.transactionPhase === "write"
      && error.transactionRollbackStatus === "succeeded",
  );
  assert.equal(pool.rollbackCalls, 2);
  assert.deepEqual(JSON.parse(pool.row.state_json), before);
});

test("normale Bedrukken-validatie rolt volledig terug zonder ordernummer of gedeeltelijke order", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const password = "Bedrukken-Validation-Test!";
  await store.mutate(async (state) => {
    state.users.push({
      id: "bedrukken-validation-user",
      name: "Bedrukken Validation",
      initials: "BV",
      role: "store",
      email: "bedrukken-validation@sportpaleis.test",
      status: "Actief",
      seatType: "customer",
      salesNumber: null,
      password: await createSportpaleisPasswordRecord(password),
    });
    return { state, value: undefined };
  });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const session = await service.login({ email: "bedrukken-validation@sportpaleis.test", password });
  const before = await store.read();

  await assert.rejects(
    service.createOrder(session.token, session.csrfToken, {
      customer: "",
      customerEmail: "validation@example.test",
      customerPhone: "0612345678",
      standardPersonalization: { initials: "BV", initialsSemantic: null, name: "VALIDATION", backNumber: "10", backNumberSizeClass: "SENIOR", shortsNumber: "" },
      items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
    }, "bedrukken-normal-validation"),
    (error) => error.statusCode === 400
      && error.code === "VALIDATION_ERROR"
      && error.message === "Klant is verplicht en maximaal 120 tekens."
      && error.transactionPhase === "mutator"
      && error.transactionRollbackStatus === "succeeded",
  );
  const after = await store.read();
  assert.equal(after.revision, before.revision);
  assert.equal(after.nextOrderSequence, before.nextOrderSequence);
  assert.deepEqual(after.orders, before.orders);
  assert.equal(new Set(after.orders.map(({ id }) => id)).size, after.orders.length);
  assert.equal(after.idempotency["bedrukken-validation-user:CREATE_ORDER:bedrukken-normal-validation"], undefined);
});

test("API toont functionele 4xx ongewijzigd, maskeert echte 5xx en logt alleen veilige context", async (context) => {
  const observed = [];
  let selectedError = Object.assign(new Error("Kies een geldige vereniging."), { statusCode: 422, code: "ASSOCIATION_INVALID" });
  const service = {
    allowedOrigin: "",
    async createOrder() { throw selectedError; },
  };
  const handler = createSportpaleisPilotRequestHandler(service, { onError: (entry) => observed.push(entry) });
  const server = createServer(async (request, response) => {
    if (!(await handler(request, response))) response.end();
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = origin;
  const request = () => fetch(`${origin}/api/sportpaleis/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "X-CSRF-Token": "safe-test-token", Cookie: "spw_session=safe-test-session" },
    body: JSON.stringify({ customer: "Niet loggen", customerEmail: "privacy@example.test" }),
  });

  const domainResponse = await request();
  assert.equal(domainResponse.status, 422);
  assert.deepEqual(await domainResponse.json(), { error: "ASSOCIATION_INVALID", message: "Kies een geldige vereniging." });
  assert.deepEqual({ method: observed[0].method, route: observed[0].route, statusCode: observed[0].statusCode }, { method: "POST", route: "/api/sportpaleis/v1/orders", statusCode: 422 });

  selectedError = Object.assign(new SportpaleisMariaDbStoreError("Workspace MariaDB-transactie is mislukt.", "DATABASE_TRANSACTION_FAILED", Object.assign(new Error("private database detail"), { code: "ER_LOCK_DEADLOCK" })), { transactionPhase: "write", transactionRollbackStatus: "succeeded" });
  const databaseResponse = await request();
  assert.equal(databaseResponse.status, 500);
  assert.deepEqual(await databaseResponse.json(), { error: "DATABASE_TRANSACTION_FAILED", message: "De Workspace-service is tijdelijk niet beschikbaar." });
  const safeFields = sportpaleisRuntimeErrorLogFields(observed[1]);
  assert.deepEqual({ code: safeFields.errorCode, type: safeFields.errorType, phase: safeFields.transactionPhase, rollback: safeFields.transactionRollbackStatus, causeCode: safeFields.causeCode }, { code: "DATABASE_TRANSACTION_FAILED", type: "SportpaleisMariaDbStoreError", phase: "write", rollback: "succeeded", causeCode: "ER_LOCK_DEADLOCK" });
  assert.doesNotMatch(JSON.stringify(safeFields), /Niet loggen|privacy@example\.test|private database detail|Workspace MariaDB-transactie is mislukt/);
});

test("MariaDB-store registreert ontbrekende immutable productie-evidence exact eenmaal", async () => {
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const persisted = JSON.parse(pool.row.state_json);
  persisted.productionJobs = persisted.productionJobs.filter(({ jobNumber }) => jobNumber !== "PLOT-2026-0004");
  persisted.nextProductionJobSequence = 4;
  pool.row = { revision: persisted.revision, state_json: JSON.stringify(persisted) };

  await store.initialize();
  const migrated = JSON.parse(pool.row.state_json);
  assert.equal(migrated.revision, persisted.revision + 1);
  assert.equal(migrated.nextProductionJobSequence, 5);
  assert.equal(migrated.productionJobs.filter(({ jobNumber }) => jobNumber === "PLOT-2026-0004").length, 1);
  assert.equal(migrated.productionJobs.find(({ jobNumber }) => jobNumber === "PLOT-2026-0004").humanAcceptance.status, "PASS");

  await store.initialize();
  assert.equal(JSON.parse(pool.row.state_json).revision, migrated.revision);
});

test("production Mail Foundation legt ontvangst netwerkloos en restart-bestendig vast in Workspace MariaDB", async (context) => {
  const captureDirectory = await mkdtemp(path.join(tmpdir(), "sportpaleis-production-mail-captures-"));
  context.after(() => rm(captureDirectory, { recursive: true, force: true }));
  const migration = await readFile(migrationFile, "utf8");
  const pool = new MemoryPool(createHash("sha256").update(migration).digest("hex"));
  const firstStore = new SportpaleisMariaDbStore({ pool });
  await firstStore.initialize();
  const password = "Production-Mail-Capture-Only!";
  await firstStore.mutate(async (state) => {
    state.users.push({
      id: "production-mail-admin",
      name: "Production Mail Admin",
      initials: "PM",
      role: "admin",
      email: "production-mail-admin@sportpaleis.test",
      status: "Actief",
      seatType: "customer",
      salesNumber: null,
      password: await createSportpaleisPasswordRecord(password),
    });
    return { state, value: undefined };
  });

  const firstFoundation = createSportpaleisProductionMailFoundation({
    workspaceStore: firstStore,
    captureDirectory,
  });
  assert.equal(firstFoundation.transport.name, "capture");
  assert.equal(firstFoundation.transport.externalNetworkEnabled, false);
  assert.equal(sportpaleisProductionMailPolicy.captureDirectory, SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY);
  assert.equal(sportpaleisProductionMailPolicy.persistence, "workspace-mariadb-runtime-state");
  const firstService = new SportpaleisPilotService({
    store: firstStore,
    mailFoundation: firstFoundation,
    allowedOrigin: "http://127.0.0.1",
    mailMode: "capture",
  });
  await firstService.initialize();
  const session = await firstService.login({ email: "production-mail-admin@sportpaleis.test", password });
  const created = (await firstService.createOrder(session.token, session.csrfToken, {
    customer: "Capture Validatie",
    customerEmail: "capture-validatie@example.test",
    customerPhone: "0612345678",
    standardPersonalization: {
      initials: "CV",
      initialsSemantic: { prefix: "Capture", infix: "", surname: "Validatie" },
      name: "CAPTURE VALIDATIE",
      backNumber: "10",
      backNumberSizeClass: "SENIOR",
      shortsNumber: "",
    },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
  }, "production-mail-order-create")).value;

  const preview = await firstService.previewOrderMail(session.token, created.id, { templateKey: "ORDER_RECEIVED" });
  assert.equal(preview.transport, "capture");
  assert.equal(preview.externalMailSent, false);
  assert.equal(preview.inlineAssets.length, 1);
  assert.equal(preview.inlineAssets[0].filename, "sportpaleis-logo-mail-safe.png");
  assert.equal(preview.inlineAssets[0].sha256, "70c424dcd371bb7f690946d24b6f3aeeea3f7d0f276928c4707951eb8bdd4bb4");

  const captured = await firstService.captureOrderMail(
    session.token,
    session.csrfToken,
    created.id,
    { templateKey: "ORDER_RECEIVED" },
    "production-mail-receipt-capture",
  );
  assert.equal(captured.status, "CAPTURED");
  assert.equal(captured.safeResult.confirmedNotSent, true);
  const duplicate = await firstService.captureOrderMail(
    session.token,
    session.csrfToken,
    created.id,
    { templateKey: "ORDER_RECEIVED" },
    "production-mail-receipt-capture",
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal((await firstService.orderMailHistory(session.token, created.id)).length, 1);

  const captures = await readdir(captureDirectory);
  assert.equal(captures.length, 1);
  const capture = JSON.parse(await readFile(path.join(captureDirectory, captures[0]), "utf8"));
  assert.equal(capture.externalNetworkUsed, false);
  assert.equal(capture.transport, "capture");

  const persisted = await firstStore.read();
  assert.equal(persisted.mailFoundation.sportpaleis.attempts.length, 1);
  assert.equal(persisted.orders.find(({ id }) => id === created.id).communication.receipt.status, "CAPTURED");

  const restartedStore = new SportpaleisMariaDbStore({ pool });
  await restartedStore.initialize();
  const restartedFoundation = createSportpaleisProductionMailFoundation({
    workspaceStore: restartedStore,
    captureDirectory,
  });
  const restartedService = new SportpaleisPilotService({
    store: restartedStore,
    mailFoundation: restartedFoundation,
    allowedOrigin: "http://127.0.0.1",
    mailMode: "capture",
  });
  await restartedService.initialize();
  const historyAfterRestart = await restartedService.orderMailHistory(session.token, created.id);
  assert.equal(historyAfterRestart.length, 1);
  assert.equal(historyAfterRestart[0].status, "CAPTURED");
  const reopened = (await restartedService.bootstrap(session.token)).orders.find(({ id }) => id === created.id);
  const advanced = await restartedService.advanceOrder(
    session.token,
    session.csrfToken,
    created.id,
    reopened.revision,
    "production-mail-order-control",
  );
  assert.equal(advanced.value.stage, "CONTROL");
});

test("letterlijke initialen blijven persistent zonder formuliergedreven naamopbouw", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-infix-regression-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", demoMode: false });
  await service.initialize();
  const session = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  const created = await service.createOrder(session.token, session.csrfToken, {
    customer: "Donovan van de Weide",
    customerEmail: "donovan@example.test",
    customerPhone: "0612345678",
    standardPersonalization: {
      initials: "DvdW",
      initialsSemantic: { prefix: "Donovan", infix: "van de", surname: "Weide" },
      name: "VAN DE WEIDE",
      backNumber: "10",
      backNumberSizeClass: "SENIOR",
      shortsNumber: "",
    },
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
  }, "infix-persistence-production-correction");
  const restarted = new SportpaleisFileStore({ filePath: store.filePath, backupDirectory: store.backupDirectory, seedPasswords: undefined });
  await restarted.initialize();
  const reopened = (await restarted.read()).orders.find(({ id }) => id === created.value.id);
  assert.equal(reopened.standardPersonalization.initials, "DvdW");
  assert.equal(reopened.standardPersonalization.initialsSemantic, null);
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data-standard-field="initialPrefix"|Berekende initialen/);
  assert.match(source, /maxlength="\$\{field === "initials" \? 5/);
});
