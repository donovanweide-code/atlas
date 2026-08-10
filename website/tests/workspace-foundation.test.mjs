import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  atlasWorkspace,
  experienceWorkspace,
  getWbdNavigationItem,
  wbdWorkspace,
  workspaces,
} from "../src/workspace-config.ts";

test("configureert Atlas, WBD en Experience als afzonderlijke Workspaces", () => {
  assert.deepEqual(workspaces.map(({ id }) => id), ["atlas", "wbd", "experience"]);
  assert.equal(new Set(workspaces.map(({ id }) => id)).size, workspaces.length);
  assert.equal(atlasWorkspace.homeHref, "/atlas");
  assert.equal(wbdWorkspace.poweredBy, "Atlas");
  assert.equal(experienceWorkspace.homeHref, "/workspace/experience");
  assert.deepEqual(experienceWorkspace.navigation.map((item) => item.id), ["overzicht"]);
  assert.deepEqual(experienceWorkspace.secondaryNavigation?.map((item) => item.id), ["observatory"]);
});

test("biedt de actuele WBD Foundation-routes in een rustige hoofdstructuur", () => {
  assert.deepEqual(
    wbdWorkspace.navigation.map(({ label }) => label),
    ["Overzicht", "Organisaties", "Projecten", "Ontwikkelpartners", "Ontwikkeling", "Business Foundation", "Infrastructuur", "Kennisvoorstellen"],
  );

  for (const item of wbdWorkspace.navigation) {
    assert.equal(getWbdNavigationItem(item.href)?.id, item.id);
  }
  assert.equal(getWbdNavigationItem("/workspace/wbd/business-foundation/finance/facturen/nieuw")?.id, "business-foundation");
  assert.equal(getWbdNavigationItem("/workspace/wbd/ontwikkeling/feedback")?.id, "ontwikkeling");
});

test("geeft een onbekende WBD-route geen foutverbergende actieve navigatie", () => {
  assert.equal(getWbdNavigationItem("/workspace/wbd/onbekend"), undefined);
});

test("routeert WBD intern en hergebruikt in beide Workspaces dezelfde shell", async () => {
  const [internalMain, viteConfig, atlasSource, wbdSource, routeSource] = await Promise.all([
    readFile(new URL("../src/internal-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/workspace-routes.ts", import.meta.url), "utf8"),
  ]);

  assert.match(internalMain, /route\.startsWith\("\/workspace\/wbd\/"\)/);
  assert.match(viteConfig, /pathname\.startsWith\("\/workspace\/wbd\/"\)/);
  assert.match(viteConfig, /context\.originalUrl \?\? context\.path/);
  assert.match(viteConfig, /\? "\/src\/internal-main\.ts"/);
  assert.match(atlasSource, /renderWorkspaceSidebar\(atlasWorkspace/);
  assert.match(wbdSource, /renderWorkspaceSidebar\(wbdWorkspace/);
  for (const route of ["projecten", "organisaties", "tijdlijn"]) {
    assert.equal(routeSource.includes(`\${WBD_WORKSPACE_BOUNDARY}/${route}`), true);
  }
  assert.doesNotMatch(wbdSource, /localStorage|fetch\(|database/i);
});
