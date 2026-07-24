import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyPublicBuild } from "../scripts/verify-public-build.mjs";

async function withBuild(files, assertion) {
  const directory = await mkdtemp(path.join(tmpdir(), "atlas-public-build-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const destination = path.join(directory, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    await assertion(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("accepteert uitsluitend een publieke entry en publieke assets", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": 'document.title="We Build And Design";',
    "assets/atlas-landscape.webp": "publieke afbeelding",
  }, async (directory) => {
    const result = await verifyPublicBuild(directory);
    assert.equal(result.files, 3);
  });
});

test("weigert interne inhoud in een publiek script", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": 'const caseName="AquaFlask";',
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /AquaFlask/);
  });
});

test("weigert onzichtbare Waarnemen-context in publieke HTML", async () => {
  await withBuild({
    "index.html": '<main data-atlas-observation="public.home.entry"></main>',
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /Waarnemen-module/);
  });
});

test("weigert interne entrypoints en chunknamen", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "internal.html": '<script type="module" src="/assets/atlas-workspace.js"></script>',
    "assets/index.js": "export {};",
    "assets/atlas-workspace.js": "export {};",
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /HTML-entrypoints|intern artefact/);
  });
});
