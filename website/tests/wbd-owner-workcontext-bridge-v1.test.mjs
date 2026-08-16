import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner bridge is expliciet tijdelijk, lokaal en bereikbaar vanuit beide owner-routes", async () => {
  const source = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  for (const marker of [
    "Capabilities",
    "Bestaande werkcontext",
    "Tijdelijke continuïteitsbrug",
    "http://127.0.0.1:5173/workspace/wbd/overzicht",
    "Niet beschikbaar op iPhone",
    "Terug naar Capabilities",
    "geen eindarchitectuur",
  ]) assert.match(source, new RegExp(marker, "u"));
  assert.match(source, /target="_blank" rel="noopener noreferrer"/u);
  assert.match(source, /aria-current=/u);
});

test("bridge publiceert de legacy workspace niet en raakt browserdata niet", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const entry = await readFile(new URL("../src/wbd-owner-main.ts", import.meta.url), "utf8");
  const buildConfig = await readFile(new URL("../vite.workspace.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(owner + entry, /workspace-main|wbd-workspace|indexedDB|deleteDatabase|localStorage/u);
  assert.doesNotMatch(buildConfig, /workspace-main|internal-main/u);
});

test("desktop krijgt de lokale actie en mobiel uitsluitend de eerlijke grensmelding", async () => {
  const css = await readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8");
  assert.match(css, /\.wbd-workcontext__desktop \{ display:grid;/u);
  assert.match(css, /\.wbd-workcontext__mobile \{ display:none;/u);
  assert.match(css, /@media \(max-width:700px\), \(hover:none\) and \(pointer:coarse\)/u);
  assert.match(css, /\.wbd-workcontext__desktop \{ display:none; \}/u);
  assert.match(css, /\.wbd-workcontext__mobile \{ display:block; \}/u);
});
