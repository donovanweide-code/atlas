import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createSportpaleisProductionBootstrap,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { SportpaleisMariaDbStore } from "../scripts/sportpaleis-mariadb-store.mjs";
import {
  parseWorkspaceRuntimeConfig,
  productionDatabaseCredentialsFromEnvironment,
  WorkspaceRuntimeConfigError,
} from "../scripts/workspace-runtime-config.mjs";
import { createWorkspaceRuntimeServer } from "../scripts/workspace-runtime.mjs";

const migrationFile = new URL("../sportpaleis-server/production-migrations/workspace/001-runtime-state.sql", import.meta.url);
const passwords = { kevin: "Test-Kevin-Production!", patrick: "Test-Patrick-Production!", collega: "Test-Collega-Production!", "donovan-support": "Test-Support-Production!" };

function productionEnvironment() {
  return {
    NODE_ENV: "production",
    APP_ENV: "production",
    PUBLIC_BASE_URL: "https://webuildanddesign.nl",
    WORKSPACE_BASE_URL: "https://workspace.webuildanddesign.nl",
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
  async rollback() {}
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
  assert.equal(config.productionDatabases.atlas.name, "wbd_atlas");
  assert.deepEqual(config.productionPolicy, {
    uploadsEnabled: false,
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
});

test("production startup controleert Atlas en Workspace vóór luisteren en valt niet terug op files", async () => {
  const config = parseWorkspaceRuntimeConfig(productionEnvironment());
  const calls = [];
  const store = {
    async initialize() { calls.push("workspace"); },
    async close() {},
  };
  await createWorkspaceRuntimeServer({
    config,
    sportpaleisStore: store,
    verifyAtlasBoundary: async () => { calls.push("atlas"); },
  });
  assert.deepEqual(calls, ["atlas", "workspace"]);
  await assert.rejects(
    createWorkspaceRuntimeServer({
      config,
      sportpaleisStore: { async initialize() { throw new Error("database unavailable"); } },
      verifyAtlasBoundary: async () => undefined,
    }),
    /database unavailable/,
  );
  const source = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  assert.match(source, /config\.nodeEnv === "production"[\s\S]*SportpaleisMariaDbStore/);
  assert.match(source, /config\.nodeEnv === "production"[\s\S]*await sportpaleisHandler\(\)/);
  assert.doesNotMatch(source, /catch[\s\S]{0,200}SportpaleisFileStore/);
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
  assert.equal(state.audit[0].details.ordersCreated, 0);
  assert.equal(state.audit[0].details.usersCreated, 0);
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

test("tussenvoegsel blijft persistent, heropenbaar en als volledige naam zichtbaar", async (context) => {
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
  assert.deepEqual(reopened.standardPersonalization.initialsSemantic, {
    prefix: "Donovan", infix: "van de", surname: "Weide", typographyManagedByProfile: true,
  });
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  for (const label of ["Voornaam", "Tussenvoegsel", "Achternaam", "data-semantic-full-name", "semanticFullName"]) assert.match(source, new RegExp(label));
  assert.match(source, /standard\.initialsSemantic\?\.infix/);
  assert.match(source, /Initialen voor/);
});
