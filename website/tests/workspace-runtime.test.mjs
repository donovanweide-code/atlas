import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseWorkspaceRuntimeConfig,
  WorkspaceRuntimeConfigError,
  workspaceRuntimeEnvironmentSchema,
} from "../scripts/workspace-runtime-config.mjs";
import { createWorkspaceRuntimeServer } from "../scripts/workspace-runtime.mjs";

test("productionconfig faalt vroeg en houdt toekomstige secrets buiten het resultaat", () => {
  assert.throws(
    () => parseWorkspaceRuntimeConfig({ NODE_ENV: "production", APP_ENV: "production" }),
    WorkspaceRuntimeConfigError,
  );

  const config = parseWorkspaceRuntimeConfig({
    NODE_ENV: "production",
    APP_ENV: "production",
    PORT: "8080",
    PUBLIC_BASE_URL: "https://webuildanddesign.nl",
    WORKSPACE_BASE_URL: "https://workspace.webuildanddesign.nl",
    RELEASE_ID: "ws1-test.1",
    DATABASE_URL: "postgres://do-not-return",
    IDENTITY_CLIENT_SECRET: "do-not-return",
    WORKSPACE_DB_HOST: "127.0.0.1",
    WORKSPACE_DB_NAME: "wbd_workspace",
    WORKSPACE_DB_USER: "workspace_app",
    WORKSPACE_DB_PASSWORD: "do-not-return-workspace",
    ATLAS_DB_HOST: "127.0.0.1",
    ATLAS_DB_NAME: "wbd_atlas",
    ATLAS_DB_USER: "atlas_app",
    ATLAS_DB_PASSWORD: "do-not-return-atlas",
    SPORTPALEIS_UPLOADS_ENABLED: "false",
    SPORTPALEIS_MAIL_MODE: "capture",
    SPORTPALEIS_HARDWARE_OUTPUT_ENABLED: "false",
    SPORTPALEIS_DIRECT_PRINT_ENABLED: "false",
    SPORTPALEIS_SUMMA_ENABLED: "false",
    ATLAS_RUNTIME_MODE: "boundary-only",
    DEBUG: "false",
  });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 8080);
  assert.equal(config.futureDependencies.database, true);
  assert.doesNotMatch(JSON.stringify(config), /do-not-return|postgres:/);
  assert.equal(workspaceRuntimeEnvironmentSchema.DATABASE_URL.secret, true);
  assert.equal(workspaceRuntimeEnvironmentSchema.IDENTITY_CLIENT_SECRET.phase, "WS.2");
});

test("health/readiness en documentrouting zijn klein, gescheiden en HTTP-correct", async (context) => {
  const temporary = await mkdtemp(path.join(tmpdir(), "wbd-ws1-runtime-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(path.join(temporary, "assets"));
  await writeFile(path.join(temporary, "workspace.html"), "<!doctype html><title>Workspace shell marker</title><div id=app></div>");
  await writeFile(path.join(temporary, "assets", "workspace-test.js"), "export const ok=true;\n");

  const config = parseWorkspaceRuntimeConfig({
    NODE_ENV: "test",
    APP_ENV: "test",
    PORT: "0",
    WORKSPACE_DIST_DIR: temporary,
    RELEASE_ID: "secretless-release-id",
  });
  const server = await createWorkspaceRuntimeServer({ config });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal(health.headers.get("cache-control"), "no-store");

  const ready = await fetch(`${origin}/ready`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: "ready" });
  assert.doesNotMatch(await (await fetch(`${origin}/health`)).text(), /release|database|identity|secretless/);

  const alias = await fetch(`${origin}/workspace/wbd?bron=test`, { redirect: "manual" });
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get("location"), "/workspace/wbd/overzicht?bron=test");

  const developmentAlias = await fetch(`${origin}/workspace/wbd/ontwikkeling`, { redirect: "manual" });
  assert.equal(developmentAlias.status, 308);
  assert.equal(developmentAlias.headers.get("location"), "/workspace/wbd/ontwikkeling/monitor");

  const known = await fetch(`${origin}/workspace/wbd/organisaties/sportpaleis`);
  assert.equal(known.status, 200);
  assert.match(await known.text(), /Workspace shell marker/);

  const sportpaleisAlias = await fetch(`${origin}/workspace/sportpaleis`, { redirect: "manual" });
  assert.equal(sportpaleisAlias.status, 308);
  assert.equal(sportpaleisAlias.headers.get("location"), "/workspace/sportpaleis/overzicht");

  const sportpaleisOrder = await fetch(`${origin}/workspace/sportpaleis/orders/SNIJTEST-001`);
  assert.equal(sportpaleisOrder.status, 200);
  assert.match(await sportpaleisOrder.text(), /Workspace shell marker/);

  const unknown = await fetch(`${origin}/workspace/wbd/onbekend`);
  assert.equal(unknown.status, 404);
  assert.match(await unknown.text(), /Workspace shell marker/);

  const publicRoute = await fetch(`${origin}/`);
  assert.equal(publicRoute.status, 404);
  assert.doesNotMatch(await publicRoute.text(), /Workspace shell marker/);

  const experienceRoute = await fetch(`${origin}/workspace/experience`);
  assert.equal(experienceRoute.status, 404);
  assert.doesNotMatch(await experienceRoute.text(), /Workspace shell marker/);

  const asset = await fetch(`${origin}/assets/workspace-test.js`);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "text/javascript; charset=utf-8");

  const rejectedMethod = await fetch(`${origin}/health`, { method: "POST" });
  assert.equal(rejectedMethod.status, 405);
});
