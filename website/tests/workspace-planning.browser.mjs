import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { createPlanningFixture } from "./helpers/workspace-planning-fixture.mjs";
import { createSportpaleisPilotRequestHandler } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { isKnownWorkspaceRoute } from "../scripts/workspace-runtime.mjs";

const modulePath = process.env.WORKSPACE_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("WORKSPACE_PLAYWRIGHT_MODULE required");
const { chromium } = await import(pathToFileURL(modulePath).href);
const cleanups = []; let browser; let server;
const evidence = path.resolve(".codex-tmp/central-planning-browser"); await mkdir(evidence, { recursive: true });
try {
  const f = await createPlanningFixture({ after: fn => cleanups.push(fn) });
  assert.ok(isKnownWorkspaceRoute("/workspace/sportpaleis/planning")); assert.ok(isKnownWorkspaceRoute("/workspace/sportpaleis/gedeeld-werk"));
  const beforeBusiness = JSON.stringify([(await f.store.read()).orders, (await f.store.read()).productionJobs, (await f.store.read()).mailFoundation]);
  const handler = createSportpaleisPilotRequestHandler(f.service); const dist = path.resolve("dist-workspace");
  server = createServer(async (req, res) => {
    try {
      if (await handler(req, res)) return;
      const url = new URL(req.url, "http://local"); const target = url.pathname.startsWith("/assets/") ? path.resolve(dist, `.${decodeURIComponent(url.pathname)}`) : path.join(dist, "sportpaleis.html");
      if (!target.startsWith(dist + path.sep)) { res.writeHead(403); res.end(); return; }
      const bytes = await readFile(target); const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
      res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" }); res.end(bytes);
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`; f.service.allowedOrigin = origin;
  const base = `${origin}/workspace/sportpaleis`;
  browser = await chromium.launch({ channel: "chrome", headless: true }); const pages = {}; const errors = [];
  for (const [name, actor] of Object.entries(f.actors)) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([{ name: "sportpaleis_session", value: actor.token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    pages[name] = await context.newPage(); pages[name].on("pageerror", error => errors.push(`${name}: ${error.message}`));
  }
  const page = pages.Donovan; const viewports = []; const captureTimes = [];
  const saveResponse = (target, suffix, action) => Promise.all([target.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(suffix) && response.status() < 300), action()]);
  for (const [width, height] of [[1440, 960], [1280, 800], [768, 1024], [390, 844], [320, 844]]) {
    await page.setViewportSize({ width, height }); await page.goto(`${base}/overzicht`);
    await page.getByRole("heading", { name: "Goedemorgen, Donovan", exact: true }).waitFor();
    const start = performance.now(); await page.locator('[data-wp-new="TASK"]').click();
    await page.locator("#wp-capture-title").fill(`Controle ${width} morgen`);
    await saveResponse(page, "/work-items", () => page.locator("[data-wp-capture] button.wp-primary").click());
    await page.locator(".wp-detail").waitFor(); captureTimes.push(performance.now() - start);
    await page.locator("[data-wp-note] textarea").fill(`Gecontroleerd op ${width}px`);
    await saveResponse(page, "/note", () => page.locator("[data-wp-note] button").click());
    await page.getByText(`Gecontroleerd op ${width}px`, { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Today overflow at ${width}`);
    await page.screenshot({ path: path.join(evidence, `work-card-${width}.png`), fullPage: true });
    await saveResponse(page, "/complete", () => page.locator("[data-wp-complete]").click());
    await page.goto(`${base}/planning`); await page.locator(".wp-full").waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Planning overflow at ${width}`);
    await page.screenshot({ path: path.join(evidence, `planning-${width}.png`), fullPage: true });
    viewports.push({ width, height, today: true, capture: true, note: true, complete: true, planning: true, overflow: false });
  }
  assert.ok(Math.max(...captureTimes) < 10000, `capture exceeded 10 seconds: ${captureTimes}`);
  await page.goto(`${base}/overzicht`); await page.locator('[data-wp-new="TASK"]').click();
  await page.locator("#wp-capture-title").fill("12 shirts Waterwijk bedrukken");
  await page.locator("[data-wp-capture] summary").click();
  await page.locator('[data-wp-capture] [name="owner"]').selectOption(f.actors.Patrick.id);
  await page.locator('[data-wp-capture] [name="dueDate"]').fill("2026-09-11");
  await saveResponse(page, "/work-items", () => page.locator("[data-wp-capture] button.wp-primary").click());
  await page.locator(".wp-detail").waitFor();
  let shirts = (await f.items.list(f.actors.Patrick.token)).items.find(item => item.title === "12 shirts Waterwijk bedrukken"); assert.equal(shirts.owner, f.actors.Patrick.id); assert.equal(shirts.dueDate, "2026-09-11");
  f.setNow("2026-09-12T06:14:00Z");
  await pages.Patrick.goto(`${base}/overzicht`); await pages.Patrick.getByRole("button", { name: /12 shirts Waterwijk bedrukken/ }).click();
  await pages.Patrick.getByText("1 dag te laat", { exact: true }).waitFor();
  await pages.Patrick.locator("[data-wp-note] textarea").fill("Shirts klaar voor klant");
  await saveResponse(pages.Patrick, "/note", () => pages.Patrick.locator("[data-wp-note] button").click());
  await saveResponse(pages.Patrick, "/complete", () => pages.Patrick.locator("[data-wp-complete]").click());
  shirts = await f.items.get(f.actors.Donovan.token, shirts.id); assert.equal(shirts.completedBy, f.actors.Patrick.id);
  f.setNow("2026-09-08T06:14:00Z");
  await page.goto(`${base}/planning`); await page.locator('[data-wp-new="APPOINTMENT"]').click();
  await page.locator("#wp-capture-title").fill("Stanno vertegenwoordiger donderdag 10:00");
  await saveResponse(page, "/work-items", () => page.locator("[data-wp-capture] button.wp-primary").click());
  await page.locator(".wp-detail").waitFor();
  const appointment = (await f.items.list(f.actors.Donovan.token)).items.find(item => item.type === "APPOINTMENT"); assert.equal(appointment.startTime, "10:00"); assert.equal(appointment.dueDate, "2026-09-10");
  await f.items.create(f.actors.Donovan.credential, { title: "Specifiek werk voor Erik", owner: f.actors.Erik.id, dueDate: "2026-09-08" });
  await pages.Erik.goto(`${base}/overzicht`); await pages.Erik.getByRole("button", { name: /Specifiek werk voor Erik/ }).click();
  assert.equal(await pages.Erik.locator('a[href$="/planning"]').count(), 0); assert.equal(await pages.Erik.locator("[data-wp-new]").count(), 0);
  await saveResponse(pages.Erik, "/complete", () => pages.Erik.locator("[data-wp-complete]").click());
  assert.equal((await pages.Erik.request.get(`${origin}/api/sportpaleis/v1/work-items`)).status(), 403);
  await pages.Kevin.goto(`${base}/planning`); await pages.Kevin.locator(".wp-full").waitFor();
  assert.ok(await pages.Kevin.locator('a[href$="/planning"]').count());
  const after = await f.store.read(); assert.equal(JSON.stringify([after.orders, after.productionJobs, after.mailFoundation]), beforeBusiness);
  assert.deepEqual(errors, []);
  captureTimes.sort((a,b) => a-b);
  const result = { status: "PASS", viewports, captureMs: { p50: captureTimes[2], max: captureTimes.at(-1) }, assignment: true, overdueUntilCompletion: true, completedByPatrick: true, appointment: true, ErikModuleDeniedSharedCompletionAllowed: true, KevinPlanning: true, productionMailMutation: false, pageErrors: errors, liveMutations: 0 };
  await writeFile(path.join(evidence, "result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally {
  await browser?.close(); if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  for (const cleanup of cleanups.reverse()) await cleanup();
}
