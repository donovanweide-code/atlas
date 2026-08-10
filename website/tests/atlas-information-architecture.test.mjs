import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  atlasWorkspace,
  getAtlasNavigationItem,
} from "../src/workspace-config.ts";

test("Atlas volgt de goedgekeurde primaire mentale kaart met secundair Fundament", () => {
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

test("iedere Atlas-locatie houdt de juiste hoofdomgeving actief", () => {
  for (const hash of ["#overzicht", "#focus", ""]) {
    assert.equal(getAtlasNavigationItem("/atlas", hash).id, "overzicht");
  }
  for (const hash of ["#werkelijkheid", "#observatie-review", "#praktijkdossiers", "#waarnemen"]) {
    assert.equal(getAtlasNavigationItem("/atlas", hash).id, "werkelijkheid");
  }
  assert.equal(getAtlasNavigationItem("/atlas", "#daily-horizon").id, "daily-horizon");
  for (const hash of ["#werkruimte", "#cases", "#understanding", "#ideeen", "#logboek"]) {
    assert.equal(getAtlasNavigationItem("/atlas", hash).id, "werkruimte");
  }
  assert.equal(getAtlasNavigationItem("/atlas/fundament", "").id, "fundament");
});

test("Werkelijkheid ordent bevestigd beeld, review en bestaande praktijkbronnen", async () => {
  const workspace = await readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /aria-label="Werkelijkheid in Atlas"/);
  assert.match(workspace, /Observaties<\/span><strong>Nog menselijk beoordelen/);
  assert.match(workspace, /Praktijkbronnen<\/span><strong>Oriëntaties en leveringsbewijs/);
  assert.match(workspace, /Praktijkbronnen · Oriëntaties/);
  assert.doesNotMatch(workspace, /workspace-label">Praktijkdossiers/);
  assert.match(workspace, /horizonSection\.before\(practiceSourcesSection\)/);
});

test("Werkruimte verwijst naar bestaande werkobjecten zonder een tweede kennisroute", async () => {
  const workspace = await readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8");
  const workroomNavigation = workspace.match(/<nav class="workspace-room__routes" aria-label="Verdiepende werkruimte">([\s\S]*?)<\/nav>/)?.[1] ?? "";
  for (const label of ["Cases", "Understanding", "Kennisvoorstellen", "Ideeën", "Logboek"]) {
    assert.match(workroomNavigation, new RegExp(`>${label}<`));
  }
  assert.match(workroomNavigation, /href="\/workspace\/wbd\/kennisvoorstellen"/);
  assert.doesNotMatch(workroomNavigation, /Praktijk|Waarnemen/);
  assert.match(workspace, /logbookSection\.after\(observingSection\)/);
  assert.match(workspace, /Broncapture · secundair/);
});

test("Fundament is bereikbaar als lege secundaire plaats zonder UXA-07-inhoud", async () => {
  const [internalMain, vite, workspace, shell] = await Promise.all([
    readFile(new URL("../src/internal-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/workspace-shell.ts", import.meta.url), "utf8"),
  ]);
  assert.match(internalMain, /route === "\/atlas\/fundament"/);
  assert.match(vite, /pathname === "\/atlas\/fundament"/);
  assert.match(workspace, /function renderAtlasFoundationPosition/);
  assert.match(workspace, /Atlas · secundaire route/);
  assert.match(shell, /workspace-nav__secondary/);
  assert.match(shell, />Secundair<\/span>/);
});

test("UXA-05 verplaatst bestaande secties en introduceert geen nieuwe Atlas-functie", async () => {
  const workspace = await readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /practiceSourcesSection\.dataset\.atlasArea = "werkelijkheid"/);
  assert.match(workspace, /observingSection\.dataset\.atlasArea = "secundair"/);
  assert.match(workspace, /syncAtlasNavigation\(app\)/);
  assert.doesNotMatch(workspace, /notification center|AI-samenvatting|automatische prioritering/i);
});
