import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
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
    WORKSPACE_BASE_URL: "https://workspace.sportpaleis.nl",
    WBD_WORKSPACE_BASE_URL: "https://workspace.webuildanddesign.nl",
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
    SPORTPALEIS_FONT_UPLOADS_ENABLED: "true",
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
  await writeFile(path.join(temporary, "sportpaleis.html"), "<!doctype html><title>Sportpaleis Workspace</title><link rel=icon href=/sportpaleis-pwa-icon.svg><div id=app></div>");
  await writeFile(path.join(temporary, "assets", "workspace-test.js"), "export const ok=true;\n");
  await writeFile(path.join(temporary, "robots.txt"), "User-agent: *\nDisallow: /\n");
  await writeFile(path.join(temporary, "sportpaleis-sw.js"), "self.addEventListener('install', () => self.skipWaiting());\n");

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
  assert.equal(alias.headers.get("location"), "/workspace/wbd/home?bron=test");

  const capabilities = await fetch(`${origin}/workspace/wbd/capabilities`);
  assert.equal(capabilities.status, 200);
  assert.match(capabilities.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(capabilities.headers.get("permissions-policy"), /camera=\(\)/);
  assert.match(await capabilities.text(), /Workspace shell marker/);

  const workContext = await fetch(`${origin}/workspace/wbd/werkcontext`);
  assert.equal(workContext.status, 200);
  assert.match(await workContext.text(), /Workspace shell marker/);

  const developmentAlias = await fetch(`${origin}/workspace/wbd/ontwikkeling`, { redirect: "manual" });
  assert.equal(developmentAlias.status, 404);
  assert.doesNotMatch(await developmentAlias.text(), /Workspace shell marker/);

  const organizations = await fetch(`${origin}/workspace/wbd/organisaties`);
  assert.equal(organizations.status, 200);
  assert.match(await organizations.text(), /Workspace shell marker/);

  const organization = await fetch(`${origin}/workspace/wbd/organisaties/organization-05e88cb6-9a3a-4ae8-9f52-e53124fe6a39`);
  assert.equal(organization.status, 200);
  assert.match(await organization.text(), /Workspace shell marker/);

  const opportunities = await fetch(`${origin}/workspace/wbd/kansen`);
  assert.equal(opportunities.status, 200);
  assert.match(await opportunities.text(), /Workspace shell marker/);

  const invalidOrganization = await fetch(`${origin}/workspace/wbd/organisaties/sportpaleis/details`);
  assert.equal(invalidOrganization.status, 404);
  assert.doesNotMatch(await invalidOrganization.text(), /Workspace shell marker/);

  const sportpaleisAlias = await fetch(`${origin}/workspace/sportpaleis`, { redirect: "manual" });
  assert.equal(sportpaleisAlias.status, 308);
  assert.equal(sportpaleisAlias.headers.get("location"), "/workspace/sportpaleis/overzicht");

  const sportpaleisOrder = await fetch(`${origin}/workspace/sportpaleis/orders/SNIJTEST-001`);
  assert.equal(sportpaleisOrder.status, 200);
  const sportpaleisOrderHtml = await sportpaleisOrder.text();
  assert.match(sportpaleisOrderHtml, /<title>Sportpaleis Workspace<\/title>/);
  assert.match(sportpaleisOrderHtml, /sportpaleis-pwa-icon\.svg/);
  assert.doesNotMatch(sportpaleisOrderHtml, /WBD Workspace/);

  const sportpaleisActivation = await fetch(`${origin}/workspace/sportpaleis/activeren`);
  assert.equal(sportpaleisActivation.status, 200);
  assert.match(await sportpaleisActivation.text(), /<title>Sportpaleis Workspace<\/title>/);

  const unknown = await fetch(`${origin}/workspace/wbd/onbekend`);
  assert.equal(unknown.status, 404);
  assert.doesNotMatch(await unknown.text(), /Workspace shell marker/);

  const publicRoute = await fetch(`${origin}/`);
  assert.equal(publicRoute.status, 404);
  assert.doesNotMatch(await publicRoute.text(), /Workspace shell marker/);

  const experienceRoute = await fetch(`${origin}/workspace/experience`);
  assert.equal(experienceRoute.status, 404);
  assert.doesNotMatch(await experienceRoute.text(), /Workspace shell marker/);

  const asset = await fetch(`${origin}/assets/workspace-test.js`);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.equal(asset.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const robots = await fetch(`${origin}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");
  assert.equal(robots.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(robots.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const serviceWorker = await fetch(`${origin}/sportpaleis-sw.js`);
  assert.equal(serviceWorker.status, 200);
  assert.equal(serviceWorker.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.equal(serviceWorker.headers.get("cache-control"), "no-cache");
  assert.match(await serviceWorker.text(), /addEventListener/);

  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 404);
  assert.equal(sitemap.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");

  const rejectedMethod = await fetch(`${origin}/health`, { method: "POST" });
  assert.equal(rejectedMethod.status, 405);
});

test("dedicated Sportpaleis-host gebruikt korte routes en redirect oude links met query", async (context) => {
  const temporary = await mkdtemp(path.join(tmpdir(), "spw-clean-route-runtime-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(path.join(temporary, "assets"));
  await writeFile(path.join(temporary, "workspace.html"), "<!doctype html><title>Workspace shell marker</title><div id=app></div>");
  await writeFile(path.join(temporary, "sportpaleis.html"), "<!doctype html><title>Sportpaleis Workspace</title><div id=app></div>");
  const config = parseWorkspaceRuntimeConfig({ NODE_ENV: "test", APP_ENV: "test", PORT: "0", WORKSPACE_DIST_DIR: temporary, WORKSPACE_BASE_URL: "https://workspace.sportpaleis.nl", RELEASE_ID: "spw-clean-routes" });
  const server = await createWorkspaceRuntimeServer({ config });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address(); assert.ok(address && typeof address === "object");
  const request = (route, host = "workspace.sportpaleis.nl") => new Promise((resolve, reject) => {
    const outbound = httpRequest({ hostname: "127.0.0.1", port: address.port, path: route, headers: { Host: host } }, (response) => {
      const chunks = []; response.on("data", (chunk) => chunks.push(chunk)); response.on("end", () => resolve({ status: response.statusCode, location: response.headers.location, body: Buffer.concat(chunks).toString("utf8") }));
    });
    outbound.on("error", reject); outbound.end();
  });
  const root = await request("/?bron=bookmark");
  assert.equal(root.status, 308); assert.equal(root.location, "/overzicht?bron=bookmark");
  const legacy = await request("/workspace/sportpaleis/orders/SP-2026-0005?tab=detail");
  assert.equal(legacy.status, 308); assert.equal(legacy.location, "/orders/SP-2026-0005?tab=detail");
  const clean = await request("/productie");
  assert.equal(clean.status, 200); assert.match(clean.body, /Sportpaleis Workspace/);
  const printingAlias = await request("/bedrukken?bron=snelkoppeling");
  assert.equal(printingAlias.status, 308); assert.equal(printingAlias.location, "/orders/nieuw?bron=snelkoppeling");
  const printing = await request(printingAlias.location);
  assert.equal(printing.status, 200); assert.match(printing.body, /Sportpaleis Workspace/);
  const sharedHostPrintingAlias = await request("/bedrukken", "workspace.webuildanddesign.nl");
  assert.equal(sharedHostPrintingAlias.status, 404);
  const users = await request("/beheer/gebruikers");
  assert.equal(users.status, 200); assert.match(users.body, /Sportpaleis Workspace/);
  const unknown = await request("/publieke-onbekende-route");
  assert.equal(unknown.status, 404);
});
