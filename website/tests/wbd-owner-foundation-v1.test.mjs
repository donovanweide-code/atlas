import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import { WBD_CAPABILITY_SEED, validateWbdCapabilityCatalog } from "../scripts/wbd-capability-catalog.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
  createWbdOwnerRequestHandler,
} from "../scripts/wbd-owner-foundation.mjs";
import { WbdOwnerMariaDbStore } from "../scripts/wbd-owner-mariadb-store.mjs";

const password = "WBD-Owner-Foundation-Test-001!";

class OwnerMemoryPool {
  constructor(checksum) { this.checksum = checksum; this.row = null; }
  async getConnection() { return new OwnerMemoryConnection(this); }
  async query(sql, params) { return new OwnerMemoryConnection(this).query(sql, params); }
}

class OwnerMemoryConnection {
  constructor(pool) { this.pool = pool; }
  async beginTransaction() {}
  async commit() {}
  async rollback() {}
  release() {}
  async query(sql, params = []) {
    if (sql.includes("FROM wbd_schema_migrations")) return [{ checksum: this.pool.checksum }];
    if (sql.startsWith("SELECT revision, state_json FROM wbd_owner_state")) return this.pool.row ? [{ ...this.pool.row }] : [];
    if (sql.startsWith("INSERT INTO wbd_owner_state")) {
      this.pool.row = { revision: Number(params[2]), state_json: params[3] };
      return { affectedRows: 1 };
    }
    if (sql.startsWith("UPDATE wbd_owner_state")) {
      if (!this.pool.row || this.pool.row.revision !== Number(params[4])) return { affectedRows: 0 };
      this.pool.row = { revision: Number(params[1]), state_json: params[2] };
      return { affectedRows: 1 };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

async function fixture(context, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-owner-v1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwordRecord = await createWorkspacePasswordRecord(password);
  const store = new WbdOwnerFileStore({
    filePath: path.join(root, "state.json"),
    bootstrap: async () => createInitialWbdOwnerState({ passwordRecord }),
  });
  const service = new WbdOwnerService({
    store,
    releaseId: "WBD-OWNER-FOUNDATION-V1-TEST",
    allowedOrigin: "http://127.0.0.1",
    sessionTtlMs: options.sessionTtlMs,
  });
  await service.initialize();
  return { root, store, service };
}

test("capabilityseed heeft één gecontroleerd centraal contract zonder pricing-engine", () => {
  const catalog = validateWbdCapabilityCatalog(WBD_CAPABILITY_SEED);
  assert.ok(catalog.length >= 25);
  for (const capability of catalog) {
    for (const required of ["name", "category", "status", "lastEvidenceDate", "reusability", "customerSpecificShare", "implementationClass", "customer2Reuse", "strategicJudgement"]) assert.ok(capability[required] !== undefined, `${capability.id} mist ${required}`);
    assert.equal(typeof capability.sellNow, "boolean");
    assert.equal(typeof capability.demoReady, "boolean");
    assert.ok(capability.evidence.length > 0);
    assert.equal(capability.marketPricing, null);
    assert.equal(capability.commercialPriceLogic, null);
  }
  assert.equal(catalog.find(({ id }) => id === "workspace-fail-closed").lastEvidenceDate, "2026-08-15");
  assert.equal(catalog.find(({ id }) => id === "pwa-service-worker").status, "PROVEN_PRODUCT_SPECIFIC");
  assert.equal(catalog.find(({ id }) => id === "identity-invite-lifecycle").lastEvidenceDate, "2026-08-15");
});

test("desktop en mobiel gebruiken losse veilige sessies en exact dezelfde centrale catalogus", async (context) => {
  const { service } = await fixture(context);
  const desktop = await service.login({ email: "donovanweide@gmail.com", password, deviceMode: "SHARED", remoteAddress: "desktop" });
  const mobile = await service.login({ email: "DONOVANWEIDE@GMAIL.COM", password, deviceMode: "PERSONAL", remoteAddress: "iphone" });
  assert.notEqual(desktop.token, mobile.token);
  assert.ok(new Date(mobile.expiresAt) > new Date(desktop.expiresAt));
  const desktopCatalog = await service.capabilityCatalog(desktop.token);
  const mobileCatalog = await service.capabilityCatalog(mobile.token);
  assert.deepEqual(mobileCatalog.capabilities, desktopCatalog.capabilities);
  assert.equal(desktopCatalog.source, "central-wbd-owner-state");

  await assert.rejects(
    service.updateCapability(desktop.token, "wrong-csrf", "commerce-managed-care", { expectedRevision: desktopCatalog.revision, patch: { guidance: "mag niet opslaan" } }),
    (error) => error.code === "CSRF_INVALID",
  );
  const changed = await service.updateCapability(desktop.token, desktop.csrfToken, "commerce-managed-care", {
    expectedRevision: desktopCatalog.revision,
    patch: { guidance: "Centrale wijziging is op desktop vastgelegd en moet mobiel direct zichtbaar zijn." },
  });
  const refreshedOnMobile = await service.capabilityCatalog(mobile.token);
  assert.equal(refreshedOnMobile.revision, changed.revision);
  assert.equal(refreshedOnMobile.capabilities.find(({ id }) => id === "commerce-managed-care").guidance, "Centrale wijziging is op desktop vastgelegd en moet mobiel direct zichtbaar zijn.");

  await service.logout(desktop.token, desktop.csrfToken);
  await assert.rejects(service.capabilityCatalog(desktop.token), (error) => error.code === "SESSION_EXPIRED");
  assert.ok((await service.capabilityCatalog(mobile.token)).capabilities.length >= 25);
});

test("MariaDB is de restart-bestendige centrale capabilitybron", async () => {
  const migration = await readFile(new URL("../sportpaleis-server/production-migrations/workspace/002-wbd-owner-state.sql", import.meta.url), "utf8");
  const pool = new OwnerMemoryPool(createHash("sha256").update(migration).digest("hex"));
  const passwordRecord = await createWorkspacePasswordRecord(password);
  const bootstrap = async () => createInitialWbdOwnerState({ passwordRecord });
  const first = new WbdOwnerMariaDbStore({ pool, bootstrap });
  await first.initialize();
  const firstState = await first.read();
  await first.mutate(async (state) => {
    state.capabilities.find(({ id }) => id === "commerce-managed-care").guidance = "Restart-bestendig centraal bewijs.";
    return { state, value: undefined };
  });
  const restarted = new WbdOwnerMariaDbStore({ pool, bootstrap });
  await restarted.initialize();
  const restartedState = await restarted.read();
  assert.equal(restartedState.revision, firstState.revision + 1);
  assert.equal(restartedState.capabilities.find(({ id }) => id === "commerce-managed-care").guidance, "Restart-bestendig centraal bewijs.");
  assert.equal((await restarted.storageStatus()).engine, "mariadb");
});

test("sessieverval en login rate limiting blijven fail-closed en auditbaar", async (context) => {
  const { service, store } = await fixture(context, { sessionTtlMs: 1 });
  const now = new Date("2026-08-15T12:00:00.000Z");
  const login = await service.login({ email: "donovanweide@gmail.com", password, now, remoteAddress: "expiry" });
  await assert.rejects(service.authenticate(login.token, new Date(now.getTime() + 2)), (error) => error.code === "SESSION_EXPIRED");
  for (let index = 0; index < 6; index += 1) {
    await assert.rejects(service.login({ email: "donovanweide@gmail.com", password: "wrong-password-value", now: new Date(now.getTime() + index), remoteAddress: "limited" }), (error) => error.code === "INVALID_LOGIN");
  }
  await assert.rejects(service.login({ email: "donovanweide@gmail.com", password, now: new Date(now.getTime() + 7), remoteAddress: "limited" }), (error) => error.code === "RATE_LIMITED");
  const state = await store.read();
  assert.ok(state.audit.filter(({ action }) => action === "Ongeldige login").length >= 6);
});

test("HTTP-boundary lekt zonder sessie geen capabilities en beschermt login/logout/mutatie", async (context) => {
  const { service } = await fixture(context);
  const handler = createWbdOwnerRequestHandler(service);
  const server = createServer(async (request, response) => { if (!await handler(request, response)) response.end(); });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address(); assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = origin;

  const unauthorized = await fetch(`${origin}/api/wbd/v1/capabilities`);
  assert.equal(unauthorized.status, 401);
  assert.doesNotMatch(await unauthorized.text(), /WooCommerce|Sportpaleis|capabilities"\s*:/i);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");
  assert.equal(unauthorized.headers.get("x-frame-options"), "DENY");

  const foreign = await fetch(`${origin}/api/wbd/v1/auth/login`, { method: "POST", headers: { Origin: "https://attacker.invalid", "Content-Type": "application/json" }, body: JSON.stringify({ email: "donovanweide@gmail.com", password }) });
  assert.equal(foreign.status, 403);

  service.secureCookies = true;
  const loginResponse = await fetch(`${origin}/api/wbd/v1/auth/login`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: "donovanweide@gmail.com", password, deviceMode: "PERSONAL" }) });
  assert.equal(loginResponse.status, 200);
  assert.match(loginResponse.headers.get("set-cookie"), /^wbd_owner_session=/);
  assert.match(loginResponse.headers.get("set-cookie"), /HttpOnly/);
  assert.match(loginResponse.headers.get("set-cookie"), /SameSite=Strict/);
  assert.match(loginResponse.headers.get("set-cookie"), /Secure/);
  const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
  const login = await loginResponse.json();
  const catalogResponse = await fetch(`${origin}/api/wbd/v1/capabilities`, { headers: { Cookie: cookie } });
  assert.equal(catalogResponse.status, 200);
  assert.ok((await catalogResponse.json()).capabilities.length >= 25);
  const logout = await fetch(`${origin}/api/wbd/v1/auth/logout`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "X-CSRF-Token": login.csrfToken } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await fetch(`${origin}/api/wbd/v1/capabilities`, { headers: { Cookie: cookie } })).status, 401);
});

test("owner-entrypoint bevat geen browsercatalogus of oude WBD-dossierimports", async () => {
  const ownerSource = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const ownerMain = await readFile(new URL("../src/wbd-owner-main.ts", import.meta.url), "utf8");
  const workspaceHtml = await readFile(new URL("../workspace.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8");
  assert.match(workspaceHtml, /wbd-owner-main\.ts/);
  assert.match(ownerMain, /wbd-owner/);
  assert.doesNotMatch(ownerSource + ownerMain, /WBD_CAPABILITY_SEED|wbd-dossier|wbd-invoices|indexedDB|localStorage/);
  for (const label of ["Nu verkoopbaar", "Bewezen", "Herbruikbaar", "Gedeeltelijk", "Bewaken / integreren / stoppen"]) assert.match(ownerSource, new RegExp(label));
  assert.match(css, /@media \(max-width:840px\)/);
  assert.match(css, /safe-area-inset-bottom/);
});
