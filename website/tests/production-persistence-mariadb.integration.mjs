import assert from "node:assert/strict";
import test from "node:test";
import mariadb from "mariadb";
import { verifyAtlasMariaDbBoundary } from "../scripts/atlas-mariadb-boundary.mjs";
import { runProductionMigrations } from "../scripts/production-migrate.mjs";
import { SportpaleisMariaDbStore } from "../scripts/sportpaleis-mariadb-store.mjs";

const enabled = process.env.MARIADB_INTEGRATION === "true";

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} ontbreekt voor MariaDB-integratietest.`);
  return value;
}

function config(prefix, runtime = true) {
  return {
    host: required(`${prefix}_DB_HOST`),
    port: Number(process.env[`${prefix}_DB_PORT`] || 3306),
    name: required(`${prefix}_DB_NAME`),
    user: required(runtime ? `${prefix}_DB_USER` : "WBD_MIGRATOR_USER"),
    password: required(runtime ? `${prefix}_DB_PASSWORD` : "WBD_MIGRATOR_PASSWORD"),
  };
}

test("geïsoleerde MariaDB production persistence, restart, concurrency en Atlas-boundary", { skip: !enabled }, async () => {
  const workspaceRuntime = config("WORKSPACE");
  const atlasRuntime = config("ATLAS");
  const direct = await mariadb.createConnection(workspaceRuntime);
  assert.equal((await direct.query("SELECT 1 AS connection_ready"))[0].connection_ready, 1);
  await direct.end();
  await runProductionMigrations({ target: "workspace", database: config("WORKSPACE", false) });
  await runProductionMigrations({ target: "atlas", database: config("ATLAS", false) });

  const first = new SportpaleisMariaDbStore({ database: workspaceRuntime });
  await first.initialize();
  const bootstrap = await first.read();
  assert.equal(bootstrap.users.length, 0);
  assert.equal(bootstrap.orders.length, 0);
  assert.equal(bootstrap.sessions.length, 0);
  assert.doesNotMatch(JSON.stringify(bootstrap), /Daniël Wouters|Interne productietest|example\.nl|Kevin Demo|Patrick Demo/);

  await first.mutate(async (state) => {
    state.settings.integrationRestartMarker = "persisted";
    state.settings.integrationCounter = 0;
    return { state, value: null };
  });
  await first.close();

  const restarted = new SportpaleisMariaDbStore({ database: workspaceRuntime });
  await restarted.initialize();
  assert.equal((await restarted.read()).settings.integrationRestartMarker, "persisted");

  await Promise.all(Array.from({ length: 8 }, () => restarted.mutate(async (state) => {
    state.settings.integrationCounter = Number(state.settings.integrationCounter ?? 0) + 1;
    return { state, value: state.settings.integrationCounter };
  })));
  assert.equal((await restarted.read()).settings.integrationCounter, 8);
  assert.deepEqual(await verifyAtlasMariaDbBoundary(atlasRuntime), {
    status: "ready",
    mode: "boundary-only",
    database: atlasRuntime.name,
  });
  await restarted.close();
});
