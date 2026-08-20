import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyPublicBuild } from "../scripts/verify-public-build.mjs";
import {
  collectApprovedPublicStaticAssets,
  PUBLIC_STATIC_ALLOWLIST,
} from "../scripts/public-static-boundary.mjs";

test("neemt de juridische basis op in routes, footer en sitemap", async () => {
  const [experienceSource, homepageSource, legalSource, sitemap] = await Promise.all([
    readFile(new URL("../src/experience-pages.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/legal-pages.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
  ]);

  for (const route of ["/algemene-voorwaarden", "/privacy"]) {
    assert.match(legalSource, new RegExp(`path: "${route}"`));
    assert.match(experienceSource, new RegExp(`href="${route}"`));
    assert.match(homepageSource, new RegExp(`href="${route}"`));
    assert.match(sitemap, new RegExp(`<loc>https://webuildanddesign\\.nl${route}</loc>`));
  }

  assert.match(experienceSource, /legalPageIndex\.get\(path\)/);
  assert.match(legalSource, /geen cookies/);
  assert.match(legalSource, /geen cookiebanner/);
});

test("borgt de releasewaardige hostinggrens", async () => {
  const [hostingConfig, notFoundPage] = await Promise.all([
    readFile(new URL("../public/.htaccess", import.meta.url), "utf8"),
    readFile(new URL("../public/404.html", import.meta.url), "utf8"),
  ]);

  assert.match(hostingConfig, /www\\\.webuildanddesign\\\.nl/);
  assert.match(hostingConfig, /algemene-voorwaarden\|privacy/);
  assert.match(hostingConfig, /R=404/);
  assert.match(hostingConfig, /X-Robots-Tag "noindex, nofollow"/);
  assert.match(hostingConfig, /Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(hostingConfig, /Content-Security-Policy/);
  assert.match(notFoundPage, /meta name="robots" content="noindex, nofollow"/);
  assert.match(notFoundPage, /Deze pagina konden we niet vinden/);
});

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
    "assets/index.js": 'document.title="We Build And Design"; const image="/assets/atlas-landscape.webp";',
    "assets/atlas-landscape.webp": "publieke afbeelding",
  }, async (directory) => {
    const result = await verifyPublicBuild(directory);
    assert.equal(result.files, 3);
  });
});

test("kopieert alleen expliciet toegestane publieke statics", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "wbd-public-source-"));
  try {
    for (const fileName of PUBLIC_STATIC_ALLOWLIST) {
      const destination = path.join(directory, fileName);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, `approved:${fileName}`);
    }
    await mkdir(path.join(directory, "assets/organizations/example"), { recursive: true });
    await writeFile(path.join(directory, "assets/organizations/example/private.json"), "{}");

    const assets = await collectApprovedPublicStaticAssets(directory);
    assert.deepEqual(assets.map(({ fileName }) => fileName), [...PUBLIC_STATIC_ALLOWLIST]);
    assert.equal(assets.some(({ fileName }) => fileName.includes("organizations")), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("weigert organization- en provenance-assets ook wanneer code ernaar verwijst", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": 'const evidence="/assets/organizations/example/provenance.json";',
    "assets/organizations/example/provenance.json": '{"source":"internal"}',
  }, async (directory) => {
    await assert.rejects(() => verifyPublicBuild(directory), /intern artefact/);
  });
});

test("accepteert expliciet geïmporteerde geschoonde publieke caseassets", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "assets/index.js": 'const proof="/assets/sportpaleis-public-proof-A1b2C3.png";',
    "assets/sportpaleis-public-proof-A1b2C3.png": "geschoond publiek bewijs",
  }, async (directory) => {
    const result = await verifyPublicBuild(directory);
    assert.equal(result.files, 3);
  });
});

test("accepteert een publieke 404 en gescande hostingconfiguratie", async () => {
  await withBuild({
    "index.html": '<script type="module" src="/assets/index.js"></script>',
    "404.html": '<meta name="robots" content="noindex"><h1>Niet gevonden</h1>',
    ".htaccess": 'ErrorDocument 404 /404.html',
    "assets/index.js": 'document.title="We Build And Design";',
  }, async (directory) => {
    const result = await verifyPublicBuild(directory);
    assert.equal(result.files, 4);
    assert.equal(result.scannedTextFiles, 4);
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
