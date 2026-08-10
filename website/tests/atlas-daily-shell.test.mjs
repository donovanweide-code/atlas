import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { atlasWorkspace } from "../src/workspace-config.ts";

const workspaceUrl = new URL("../src/atlas-workspace.ts", import.meta.url);
const stylesUrl = new URL("../src/styles/atlas-workspace.css", import.meta.url);

test("Atlas opent direct binnen de gedeelde Workspace-shell", async () => {
  const workspace = await readFile(workspaceUrl, "utf8");
  const dailyRender = workspace.indexOf("const dailyHorizon");
  const shellStart = workspace.indexOf('<div class="workspace-shell">', dailyRender);
  const sidebar = workspace.indexOf("renderWorkspaceSidebar(atlasWorkspace", shellStart);
  const main = workspace.indexOf('<div class="workspace-main">', sidebar);
  const opening = workspace.indexOf('<section class="daily-opening"', main);

  assert.ok(shellStart >= 0 && shellStart < sidebar && sidebar < main && main < opening);
  assert.doesNotMatch(workspace.slice(shellStart, opening), /daily-brand|Daily companion/);
  assert.equal((workspace.slice(shellStart).match(/renderWorkspaceSidebar\(atlasWorkspace/g) ?? []).length, 1);
});

test("Focus draagt de dagelijkse hoofdconclusie en Stilte blijft ondersteunend", async () => {
  const workspace = await readFile(workspaceUrl, "utf8");
  const opening = workspace.match(/<section class="daily-opening"[\s\S]*?<div class="workspace-notice"/)?.[0] ?? "";

  assert.match(opening, /<h1 id="daily-title">\$\{escapeHtml\(atlasDailyBrief\.focus\.title\)\}<\/h1>/);
  assert.match(opening, /atlasDailyBrief\.focus\.summary/);
  assert.match(opening, /atlasDailyBrief\.focus\.nextStep/);
  assert.match(opening, /atlasDailyBrief\.focus\.actionLabel/);
  assert.match(opening, /atlasDailyBrief\.focus\.explanation\.map/);
  assert.match(opening, /<aside class="daily-silence"/);
  assert.match(opening, /\$\{dailySilence\}/);
  assert.match(workspace, /atlasDailyBrief\.silence\.map/);
  assert.equal((opening.match(/<h1/g) ?? []).length, 1);
});

test("de opening herhaalt geen oude hero-uitleg of tweede overgangskop", async () => {
  const workspace = await readFile(workspaceUrl, "utf8");
  const opening = workspace.match(/<section class="daily-opening"[\s\S]*?<div class="workspace-notice"/)?.[0] ?? "";

  for (const removedBinding of ["subtitle", "summary", "why", "reviewedAt", "returnTrigger", "evidenceSource", "externalDependency", "changedSinceLast"]) {
    assert.doesNotMatch(opening, new RegExp(`atlasDailyBrief\\.${removedBinding}\\b`));
  }
  assert.doesNotMatch(opening, /Verder in Atlas|De werkelijkheid achter vandaag|Laatst beoordeeld|Terugkeertrigger/);
  assert.match(workspace, /<section class="workspace-position" id="werkelijkheid"/);
});

test("de compacte shell schaalt zonder schermvullende hero", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const marker = "/* UXA-06 — compacte dagelijkse Atlas-opening binnen de bestaande Workspace-shell. */";
  const compact = styles.slice(styles.lastIndexOf(marker));

  assert.match(compact, /\.daily-opening \{[\s\S]*?min-height: 0;/);
  assert.match(compact, /\.daily-opening__frame \{[\s\S]*?min-height: 0;/);
  assert.doesNotMatch(compact, /100svh/);
  assert.match(compact, /\.daily-focus__compass \.workspace-compass \{ width: 4\.5rem; \}/);
  assert.match(compact, /@media \(max-width: 720px\)[\s\S]*?grid-template-columns: 1fr/);
  assert.match(compact, /min-height: 2\.75rem/);
});

test("UXA-06 verandert de goedgekeurde Atlas-informatiearchitectuur niet", () => {
  assert.deepEqual(
    atlasWorkspace.navigation.map(({ id, label, href }) => ({ id, label, href })),
    [
      { id: "overzicht", label: "Vandaag", href: "/atlas#overzicht" },
      { id: "werkelijkheid", label: "Werkelijkheid", href: "/atlas#werkelijkheid" },
      { id: "daily-horizon", label: "Horizon", href: "/atlas#daily-horizon" },
      { id: "werkruimte", label: "Werkruimte", href: "/atlas#werkruimte" },
    ],
  );
  assert.deepEqual(atlasWorkspace.secondaryNavigation?.map(({ id, label, href }) => ({ id, label, href })), [
    { id: "fundament", label: "Fundament", href: "/atlas/fundament" },
  ]);
});
