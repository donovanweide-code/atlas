import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import { SportpaleisMariaDbStore, SportpaleisMariaDbStoreError } from "../scripts/sportpaleis-mariadb-store.mjs";
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
  }

  async getConnection() {
    return new MemoryConnection(this);
  }

  async query(sql, params) {
    return new MemoryConnection(this).query(sql, params);
  }
}

class MemoryConnection {
  constructor(pool) {
    this.pool = pool;
  }

  async beginTransaction() {}
  async commit() {}
  async rollback() { this.pool.rollbackCalls += 1; }
  release() {}

  async query(sql, params = []) {
    if (sql.includes("FROM wbd_schema_migrations")) return [{ checksum: this.pool.checksum }];
    if (sql.startsWith("SELECT revision, state_json")) {
      return this.pool.row ? [{ revision: this.pool.row.revision, state_json: this.pool.row.state_json }] : [];
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
  const wbdOwnerState = createInitialWbdOwnerState({
    passwordRecord: await createSportpaleisPasswordRecord("Test-WBD-Owner-Production!"),
  });
  const wbdOwnerStore = {
    async initialize() { calls.push("wbd-owner"); },
    async read() { return structuredClone(wbdOwnerState); },
    async mutate() { throw new Error("not used"); },
    async close() {},
  };
  await createWorkspaceRuntimeServer({
    config,
    sportpaleisStore: store,
    wbdOwnerStore,
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
    "app/src/workspace-sequence.ts",
    "app/src/sportpaleis/production-sources.ts",
    "app/src/sportpaleis/direct-print/index.ts",
    "app/src/sportpaleis/direct-print/cut-job.ts",
    "app/src/sportpaleis/direct-print/reference-2-34-77.ts",
  ]) assert.ok(packaged.has(required), `${required} ontbreekt in runtimegraph`);
  assert.ok([...packaged].every((archive) => !archive.includes("/tests/") && !archive.includes(".codex-tmp")));
});

test("production package installeert de gelockte PDF-runtime dependency", async () => {
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
