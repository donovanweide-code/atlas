import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyPublicBuild } from "../scripts/verify-public-build.mjs";

const validSpaFallback = `RewriteEngine On

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\\.[^/]+$ [NC]
RewriteRule ^ index.html [L]
`;

async function withBuild(files, assertion, { includeFallback = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "atlas-public-build-"));
  try {
    const buildFiles = includeFallback ? { ".htaccess": validSpaFallback, ...files } : files;
    for (const [relativePath, content] of Object.entries(buildFiles)) {
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
    assert.equal(result.files, 4);
  });
});

test("weigert een publieke build zonder SPA-fallback", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": "export {};",
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /mist dist\/\.htaccess/);
  }, { includeFallback: false });
});

test("weigert een SPA-fallback die ontbrekende assets naar index herschrijft", async () => {
  await withBuild({
    ".htaccess": `RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`,
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": "export {};",
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /REQUEST_URI/);
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

test("weigert een interne Oriëntatie in de publieke build", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": 'const orientationSubject="Bij Cees";',
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /interne Oriëntatie/);
  });
});

test("weigert een intern leveringsbeeld als publiek artefact", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/atlas-delivery-review.js"></script>',
    "assets/atlas-delivery-review.js": "export const status='progress-update-ready';",
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /intern artefact/);
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
