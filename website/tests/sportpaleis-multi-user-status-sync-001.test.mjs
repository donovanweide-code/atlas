import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Sync-Kevin-001!", patrick: "Sync-Patrick-001!", collega: "Sync-Store-001!", "donovan-support": "Sync-Support-001!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-sync-001-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
  };
}

test("twee onafhankelijke sessies zien dezelfde globale revisie en stale statuswijziging blijft fail-closed", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const viewA = await service.bootstrap(admin.token);
  const orderA = viewA.orders.find(({ id, stage }) => id === "SP-2026-0103" && stage === "ORDER");
  assert.ok(orderA);
  const unchangedA = await service.currentRevision(admin.token);
  const unchangedB = await service.currentRevision(operator.token);
  assert.deepEqual(unchangedA, unchangedB);

  const changedByB = (await service.advanceOrder(operator.token, operator.csrfToken, orderA.id, orderA.revision, "sync-user-b-status-001")).value;
  assert.notEqual(changedByB.stage, orderA.stage);
  const changedRevision = await service.currentRevision(admin.token);
  assert.equal(changedRevision.revision, unchangedA.revision + 1);
  const refreshedA = await service.bootstrap(admin.token);
  assert.equal(refreshedA.orders.find(({ id }) => id === orderA.id).stage, changedByB.stage);

  await assert.rejects(
    service.advanceOrder(admin.token, admin.csrfToken, orderA.id, orderA.revision, "sync-user-a-stale-001"),
    (error) => error.code === "REVISION_CONFLICT" && error.currentRevision === changedByB.revision,
  );
});

test("client gebruikt lichte revision polling zonder realtime-foundation en beschermt invoer", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(source, /SHARED_STATUS_POLL_MS = 10_000/u);
  assert.match(source, /window\.setInterval\(\(\) => \{ if \(document\.visibilityState === "visible"\) void checkSharedRevision\("interval"\); \}, SHARED_STATUS_POLL_MS\)/u);
  assert.match(source, /visibilitychange[\s\S]+checkSharedRevision\("visible"\)/u);
  assert.match(source, /addEventListener\("focus"[\s\S]+checkSharedRevision\("focus"\)/u);
  assert.match(source, /revision === state\.revision/u);
  assert.match(source, /sharedSyncFormDirty \|\| hasFocusedEditor\(\)/u);
  assert.match(source, /state = await api\.bootstrap\(bootstrapSurfaceForPath\(\)\)/u);
  assert.match(source, /render\(\{ preserveScroll: true \}\)/u);
  assert.match(source, /deferredSharedRevision/u);
  assert.match(source, /hadDeferredSync[\s\S]+checkSharedRevision\("safe-boundary"\)/u);
  assert.match(api, /\/state-revision/u);
  assert.match(server, /async currentRevision\(token\)/u);
  assert.doesNotMatch(source, /new WebSocket|new EventSource|new BroadcastChannel/u);
});
