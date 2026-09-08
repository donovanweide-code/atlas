import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SportpaleisFileStore, SportpaleisPilotService, createSportpaleisPilotRequestHandler } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createPermissionPolicy } from "../scripts/workspace-permissions.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

const playwrightPath = process.env.WORKSPACE_PLAYWRIGHT_MODULE;
if (!playwrightPath) throw new Error("Set WORKSPACE_PLAYWRIGHT_MODULE to the installed Playwright entry point.");
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const root = await mkdtemp(path.join(tmpdir(), "workspace-permissions-browser-"));
const evidence = path.resolve(".codex-tmp/central-permission-browser"); await mkdir(evidence, { recursive: true });
const dist = path.resolve("dist-workspace");
let browser; let server;
try {
  const passwords = { kevin: "Fixture-Admin-Permissions-2026!", patrick: "Fixture-Operator-Permissions-2026!", collega: "Fixture-Employee-Permissions-2026!", "donovan-support": "Fixture-Support-Permissions-2026!" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root }); await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const adminId = (await service.authenticate(admin.token)).user.id; const operatorId = (await service.authenticate(operator.token)).user.id;
  await store.mutate(state => { state.workspacePermissions = createPermissionPolicy(state.organizationId, { [adminId]: { presetId: "developer", overrides: {} }, [operatorId]: { presetId: "operations", overrides: {} } }, { enabledCapabilities: CAPABILITY_IDS }); return { state }; });
  const handler = createSportpaleisPilotRequestHandler(service);
  server = createServer(async (req, res) => {
    try {
      if (await handler(req, res)) return;
      const url = new URL(req.url, "http://local"); const isAsset = url.pathname.startsWith("/assets/");
      const target = isAsset ? path.resolve(dist, `.${decodeURIComponent(url.pathname)}`) : path.join(dist, "sportpaleis.html");
      if (!target.startsWith(dist + path.sep)) { res.writeHead(403); res.end(); return; }
      const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
      res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" }); res.end(await readFile(target));
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const origin = `http://127.0.0.1:${server.address().port}`; service.allowedOrigin = origin;
  browser = await chromium.launch({ headless: true, channel: "chrome" }); const context = await browser.newContext();
  await context.addCookies([{ name: "sportpaleis_session", value: admin.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const page = await context.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
  const workerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await workerContext.addCookies([{ name: "sportpaleis_session", value: operator.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const workerPage = await workerContext.newPage();
  await workerPage.goto(`${origin}/workspace/sportpaleis/overzicht`); await workerPage.locator(".sp-workspace").waitFor();
  assert.equal(await workerPage.locator('a[href$="/voorstellen"]').count(), 0);
  const proofs = [];
  for (const [width, height] of [[1440, 960], [1280, 800], [768, 1024], [390, 844], [320, 844]]) {
    await page.setViewportSize({ width, height }); await page.goto(`${origin}/workspace/sportpaleis/beheer/gebruikers`);
    await page.locator("[data-permission-user]").waitFor(); await page.locator("[data-permission-user]").selectOption(operatorId);
    await page.getByRole("heading", { name: /Wat kan Patrick/ }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    await page.locator("[data-permission-preview]").click(); await page.getByRole("heading", { name: /Je bekijkt Workspace als Patrick/ }).waitFor();
    await page.screenshot({ path: path.join(evidence, `permissions-${width}.png`), fullPage: true });
    proofs.push({ width, height, overflow: false, summary: true, preview: true });
  }
  const domain = page.locator("form details").filter({ has: page.locator('[data-capability="teamwear.view"]') });
  await domain.locator("summary").click(); await page.locator('[data-capability="teamwear.view"]').selectOption("allow");
  await Promise.all([page.waitForResponse(response => response.request().method() === "PATCH" && response.url().includes("/admin/permissions/users/") && response.status() === 200), page.getByRole("button", { name: "Rechten opslaan", exact: true }).click()]);
  await page.waitForFunction(() => document.querySelector("[data-permission-user]") !== null);
  assert.equal((await service.permissionProjection(operator.token)).effective.decisions["teamwear.view"].allowed, true);
  await workerPage.reload(); await workerPage.locator('a[href$="/voorstellen"]').first().waitFor({ state: "attached" });
  assert.equal((await service.assertTeamwearPilotAccess(operator.token)).enabled, true);
  const current = await service.permissionAdministration(admin.token);
  await service.updatePermissionConfiguration(admin.token, admin.csrfToken, { userId: operatorId, expectedVersion: current.version, reset: true });
  assert.equal((await service.permissionProjection(operator.token)).effective.decisions["teamwear.view"].allowed, false);
  await workerPage.reload(); await workerPage.locator(".sp-workspace").waitFor();
  assert.equal(await workerPage.locator('a[href$="/voorstellen"]').count(), 0);
  await assert.rejects(service.assertTeamwearPilotAccess(operator.token), { statusCode: 403 });
  assert.deepEqual(errors, []);
  const result = { status: "PASS", viewports: proofs, dynamicUpdate: true, secondUserNavigationAndBackend: true, restore: true, pageErrors: errors, liveMutations: 0 };
  await writeFile(path.join(evidence, "result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep)); assert.ok(path.basename(root).startsWith("workspace-permissions-browser-"));
  await rm(root, { recursive: true, force: true });
}
