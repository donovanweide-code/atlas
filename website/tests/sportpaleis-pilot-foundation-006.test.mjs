import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SportpaleisFileStore,
  SportpaleisPilotService,
  createSportpaleisPilotRequestHandler,
} from "../scripts/sportpaleis-pilot-foundation.mjs";

function testPasswords() {
  return {
    kevin: "Test-Kevin-006!veilig",
    patrick: "Test-Patrick-006!veilig",
    collega: "Test-Collega-006!veilig",
    "donovan-support": "Test-Support-006!veilig",
  };
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-006-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "pilot-state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: testPasswords(),
  });
  const service = new SportpaleisPilotService({
    store,
    releaseId: "SPW-006-TEST",
    allowedOrigin: "http://127.0.0.1",
  });
  await service.initialize();
  return { root, store, service };
}

test("Pilot Foundation 006 — auth, rollen, gedeelde data, concurrency en herstel", async (context) => {
  const { root, store, service } = await fixture(context);

  await context.test("veilige login weigert een ongeldig wachtwoord en maakt geen browserrol", async () => {
    await assert.rejects(
      service.loginWithPersistedCsrf({ email: "patrick@sportpaleis.nl", password: "onjuist", remoteAddress: "test" }),
      (error) => error.statusCode === 401 && error.code === "INVALID_LOGIN",
    );
    const stateText = await readFile(store.filePath, "utf8");
    assert.doesNotMatch(stateText, /Test-Patrick-006!veilig/);
    assert.match(stateText, /"algorithm": "scrypt"/);
  });

  const patrick = await service.loginWithPersistedCsrf({
    email: "patrick@sportpaleis.nl",
    password: testPasswords().patrick,
    remoteAddress: "patrick-device",
  });
  const kevin = await service.loginWithPersistedCsrf({
    email: "kevin@sportpaleis.nl",
    password: testPasswords().kevin,
    remoteAddress: "kevin-device",
  });

  await context.test("server-side bootstrap verbergt beheerdata voor operator en toont die aan admin", async () => {
    const operatorView = await service.bootstrap(patrick.token);
    const adminView = await service.bootstrap(kevin.token);
    assert.equal(operatorView.capabilities.admin, false);
    assert.deepEqual(operatorView.users.map(({ id }) => id), ["patrick"]);
    assert.equal(adminView.capabilities.admin, true);
    assert.deepEqual(adminView.users.map(({ id }) => id).sort(), ["collega", "kevin", "patrick"]);
    assert.ok(adminView.users.every(({ seatType }) => seatType === "customer"));
  });

  await context.test("historische auditafwijking blokkeert de operator-bootstrap niet", async () => {
    await store.mutate(async (state) => {
      state.audit.unshift({ id: "audit-legacy-wrong-schema", at: "2026-08-07T09:59:00.000Z", actorId: "legacy", action: "Historische afwijking", targetId: "legacy", details: {} });
      return { state, value: null };
    });
    const operatorView = await service.bootstrap(patrick.token, "orders");
    assert.equal(operatorView.audit.some(({ id }) => id === "audit-legacy-wrong-schema"), false);
  });

  await context.test("operator krijgt server-side 403 op adminactie", async () => {
    await assert.rejects(
      service.requestUsers(patrick.token, patrick.csrfToken, { quantity: 1 }, "operator-admin-attempt-0001"),
      (error) => error.statusCode === 403 && error.code === "FORBIDDEN",
    );
  });

  let sharedOrder;
  await context.test("Patrick maakt één server-order met meerdere artikelen en Kevin ziet dezelfde waarheid", async () => {
    const created = await service.createOrder(patrick.token, patrick.csrfToken, {
      customer: "Pilotklant",
      association: "A.S.C. Waterwijk",
      promisedAt: "2026-08-10T12:00:00.000Z",
      items: [
        { product: "Wedstrijdshirt", quantity: 2, personalization: "Rug 12", foilColor: "Wit" },
        { product: "Wedstrijdshort", quantity: 2, personalization: "Short 12", foilColor: "Wit" },
      ],
    }, "pilot-order-create-0001");
    sharedOrder = created.value;
    assert.match(sharedOrder.id, /^SP-\d{4}-\d{4}$/);
    assert.equal(sharedOrder.totalPieces, 4);
    const kevinView = await service.bootstrap(kevin.token);
    assert.equal(kevinView.orders.find(({ id }) => id === sharedOrder.id)?.items.length, 2);
  });

  await context.test("dubbele submit met dezelfde idempotency key maakt geen tweede order", async () => {
    const payload = {
      customer: "Dubbeltest",
      association: "Buitenhout MHC",
      promisedAt: "2026-08-10T12:00:00.000Z",
      items: [{ product: "Polo", quantity: 1, personalization: "PD", foilColor: "Zwart" }],
    };
    const first = await service.createOrder(patrick.token, patrick.csrfToken, payload, "duplicate-order-key-0001");
    const second = await service.createOrder(patrick.token, patrick.csrfToken, payload, "duplicate-order-key-0001");
    assert.equal(first.value.id, second.value.id);
    assert.equal(second.duplicate, true);
    const state = await store.read();
    assert.equal(state.orders.filter(({ customer }) => customer === "Dubbeltest").length, 1);
  });

  await context.test("optimistische revisie voorkomt silent overwrite tussen Patrick en Kevin", async () => {
    const staleRevision = sharedOrder.revision;
    const advanced = await service.advanceOrder(patrick.token, patrick.csrfToken, sharedOrder.id, staleRevision, "advance-patrick-0001");
    assert.equal(advanced.value.stage, "CONTROL");
    await assert.rejects(
      service.advanceOrder(kevin.token, kevin.csrfToken, sharedOrder.id, staleRevision, "advance-kevin-stale-0001"),
      (error) => error.statusCode === 409 && error.code === "REVISION_CONFLICT" && error.currentRevision === 2,
    );
    const kevinView = await service.bootstrap(kevin.token);
    assert.equal(kevinView.orders.find(({ id }) => id === sharedOrder.id)?.stage, "CONTROL");
  });

  await context.test("audit, feedback en voorkeuren zijn duurzaam en per gebruiker", async () => {
    await service.saveFeedback(patrick.token, patrick.csrfToken, {
      page: "/workspace/sportpaleis/orders",
      module: "Orders",
      category: "Verbetering",
      description: "Pilotfeedback vanuit Patrick.",
    }, "feedback-patrick-0001");
    await service.savePreferences(patrick.token, patrick.csrfToken, {
      view: "compact",
      density: "compact",
      optionalPanels: { recent: false, shortcuts: true },
      panelOrder: ["attention", "production", "recent", "shortcuts"],
    });
    const state = await store.read();
    assert.equal(state.feedback[0].userId, "patrick");
    assert.equal(state.preferences.patrick.view, "compact");
    assert.equal(state.preferences.kevin.view, "focus");
    assert.ok(state.audit.some(({ action, subject }) => action === "Orderstatus gewijzigd" && subject === sharedOrder.id));
  });

  await context.test("restart behoudt orders en voorkeuren zonder seedwachtwoorden opnieuw te gebruiken", async () => {
    const restartedStore = new SportpaleisFileStore({
      filePath: store.filePath,
      backupDirectory: store.backupDirectory,
      seedPasswords: undefined,
    });
    await restartedStore.initialize();
    const restarted = await restartedStore.read();
    assert.ok(restarted.orders.some(({ id }) => id === sharedOrder.id));
    assert.equal(restarted.preferences.patrick.view, "compact");
  });

  await context.test("sessieverloop wordt server-side afgedwongen", async () => {
    const expiring = new SportpaleisPilotService({ store, releaseId: "SPW-006-TEST", allowedOrigin: "http://127.0.0.1", sessionTtlMs: 1 });
    const login = await expiring.loginWithPersistedCsrf({ email: "collega@sportpaleis.nl", password: testPasswords().collega, remoteAddress: "expiry-device", now: new Date("2026-08-07T10:00:00.000Z") });
    await assert.rejects(expiring.authenticate(login.token, new Date("2026-08-07T10:00:01.000Z")), (error) => error.statusCode === 401 && error.code === "SESSION_EXPIRED");
  });

  await context.test("back-up is hashgevalideerd en restore wordt niet destructief gevalideerd", async () => {
    const manifest = await store.createBackup("test");
    const verified = await store.verifyBackup(path.join(store.backupDirectory, `${manifest.file}.manifest.json`));
    assert.equal(verified.valid, true);
    assert.equal(verified.manifest.sourceRevision, (await store.read()).revision);
  });

  await context.test("health toont datastore, back-up, release en blijvend uitgeschakelde hardware-send", async () => {
    const health = await service.health();
    assert.equal(health.status, "ok");
    assert.equal(health.database, "ok");
    assert.equal(health.backup.status, "ok");
    assert.equal(health.releaseId, "SPW-006-TEST");
    assert.equal(health.hardwareSendEnabled, false);
  });

  await context.test("echte HTTP-cookieflow logt in, leest state en logt uit", async (httpContext) => {
    const handler = createSportpaleisPilotRequestHandler(service);
    const server = createServer(async (request, response) => {
      if (!await handler(request, response)) response.end();
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    httpContext.after(() => new Promise((resolve) => server.close(resolve)));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;
    service.allowedOrigin = origin;
    const loginResponse = await fetch(`${origin}/api/sportpaleis/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email: "kevin@sportpaleis.nl", password: testPasswords().kevin }),
    });
    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
    const loginBody = await loginResponse.json();
    assert.doesNotMatch(cookie, /Test-Kevin/);
    assert.match(loginResponse.headers.get("set-cookie"), /HttpOnly/);
    const bootstrap = await fetch(`${origin}/api/sportpaleis/v1/bootstrap`, { headers: { Cookie: cookie, Origin: origin } });
    assert.equal(bootstrap.status, 200);
    assert.equal((await bootstrap.json()).capabilities.admin, true);
    const logout = await fetch(`${origin}/api/sportpaleis/v1/auth/logout`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "X-CSRF-Token": loginBody.csrfToken } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  });

  await context.test("pilotfoundation bevat geen hardware-writepad", async () => {
    const source = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
    assert.doesNotMatch(source, /PIPE01|SummaUsb|usb\.write|DMPL|node-hid|serialport/i);
  });

  await context.test("tijdelijke API-uitval gebruikt alleen een niet-autoritatieve alleen-lezen cache", async () => {
    const apiSource = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
    const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    assert.match(apiSource, /createNonCriticalReadonlyCache<PilotBootstrap>/);
    assert.match(apiSource, /readonlyCache\.replace\(cacheProjection\(result\)\)/);
    assert.match(apiSource, /readOnlyFallback: true/);
    assert.doesNotMatch(apiSource, /localStorage/);
    assert.match(workspaceSource, /Alleen-lezen herstelweergave/);
    assert.match(workspaceSource, /if \(!state \|\| state\.readOnlyFallback\) return/);
  });
});
