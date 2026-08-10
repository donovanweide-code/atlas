import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("gebruikt uitsluitend het compacte officiële WBD-favicon op iedere entrypoint", async () => {
  const [favicon, experienceFavicon, index, internal, experience, notFound, experiment, compatibility] = await Promise.all([
    read("public/favicon.svg"),
    read("experience-public/favicon.svg"),
    read("index.html"),
    read("internal.html"),
    read("experience.html"),
    read("public/404.html"),
    read("context-first-experiment.html"),
    read("first-visit-v2.html"),
  ]);

  assert.equal(experienceFavicon, favicon);
  assert.match(favicon, />WBD<\/text>/);
  assert.doesNotMatch(favicon, /863bff|vite/i);

  for (const html of [index, internal, experience, notFound, experiment, compatibility]) {
    assert.match(html, /rel="icon"[^>]+href="\/favicon\.svg"/);
    assert.match(html, /rel="shortcut icon"[^>]+href="\/favicon\.ico"/);
    assert.match(html, /rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/);
    assert.match(html, /rel="mask-icon"[^>]+href="\/safari-pinned-tab\.svg"/);
  }
});

test("geeft uitsluitend de twee afgeleide Understanding-velden een bestaande toegankelijke naam", async () => {
  const workspace = await read("src/atlas-workspace.ts");

  for (const id of ["understanding-insight-label", "understanding-next-step-label"]) {
    assert.match(workspace, new RegExp(`<h3 id="${id}">`));
    assert.match(workspace, new RegExp(`<textarea name="text" aria-labelledby="${id}"`));
  }
});

test("maakt ervaar ook in bronmetadata en het deploypakket de canonieke Experience-ingang", async () => {
  const [experience, entry, packageScript] = await Promise.all([
    read("experience.html"),
    read("src/experience-entry.ts"),
    read("scripts/prepare-experience-package.mjs"),
  ]);

  assert.match(experience, /rel="canonical" href="https:\/\/experience\.webuildanddesign\.nl\/ervaar\/"/);
  assert.doesNotMatch(experience, /rel="canonical" href="https:\/\/experience\.webuildanddesign\.nl\/e\/"/);
  assert.match(entry, /canonicalExperiencePath = "\/ervaar"/);
  assert.match(packageScript, /content="0;url=\/ervaar"/);
  assert.match(packageScript, /rel="canonical" href="https:\/\/experience\.webuildanddesign\.nl\/ervaar\/"/);
  assert.match(packageScript, /href="\/favicon\.svg"/);
});

test("routeert de Workspace-selector naar een interne Experience Workspace", async () => {
  const [config, shell, internalMain, experienceMain, vite] = await Promise.all([
    read("src/workspace-config.ts"),
    read("src/workspace-shell.ts"),
    read("src/internal-main.ts"),
    read("src/experience-validation-main.ts"),
    read("vite.config.ts"),
  ]);

  assert.match(config, /homeHref: "\/workspace\/experience"/);
  assert.match(config, /Overzicht van Experiences, sessies, antwoorden en menselijke review/);
  assert.match(shell, /experience\.webuildanddesign\.nl/);
  assert.doesNotMatch(config, /homeHref: "\/(?:ervaar|e\/?)"/);
  assert.match(internalMain, /import\("\.\/experience-admin-workspace"\)/);
  assert.match(experienceMain, /import\("\.\/experience-admin-workspace"\)/);
  assert.match(vite, /pathname\.startsWith\("\/workspace\/experience\/"\)/);
});

test("leest bestaande Experience-gegevens zonder een tweede opslag- of reviewmodel", async () => {
  const workspace = await read("src/experience-admin-workspace.ts");

  assert.match(workspace, /<h3>\/ervaar<\/h3>/);
  assert.match(workspace, /<h3>\/e\/#token<\/h3>/);
  assert.match(workspace, /<h3>\/workspace\/experience<\/h3>/);
  assert.match(workspace, /experienceApi\.observatoryOverview\(\)/);
  assert.match(workspace, /experienceApi\.observatoryDetail/);
  assert.match(workspace, /summaryItems\(detail\.session\)/);
  assert.match(workspace, /Niet-verstuurde concepttekst wordt niet centraal opgeslagen/);
  assert.match(workspace, /atlas#observatie-review/);
  assert.doesNotMatch(workspace, /createInvitation|saveObservation|localStorage|sessionStorage|analytics|notification/i);
  assert.equal((workspace.match(/experienceApi\.observatoryOverview\(\)/g) ?? []).length, 1);
});
