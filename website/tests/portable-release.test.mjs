import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createPortableRelease,
  inspectPortableRelease,
} from "../scripts/create-portable-release.mjs";
import {
  verifyPublicBuild,
  verifySpaFallbackConfiguration,
} from "../scripts/verify-public-build.mjs";

const spaFallback = `RewriteEngine On

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\\.[^/]+$ [NC]
RewriteRule ^ index.html [L]
`;

async function withReleaseFixture(assertion) {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-portable-release-"));
  const dist = path.join(root, "dist");
  const archive = path.join(root, "release.zip");
  try {
    await mkdir(path.join(dist, "assets"), { recursive: true });
    await writeFile(path.join(dist, ".htaccess"), spaFallback);
    await writeFile(path.join(dist, "index.html"), '<script src="/assets/index.js"></script>');
    await writeFile(path.join(dist, "assets", "index.js"), "export {};");
    await assertion({ archive, dist });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function resolveIsolatedRequest(dist, requestUrl) {
  const url = new URL(requestUrl, "https://example.test");
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requestedFile = path.join(dist, relativePath);
  const requestedStats = await stat(requestedFile).catch(() => null);
  if (requestedStats?.isFile()) return { type: "file", file: relativePath };
  if (path.extname(url.pathname)) return { type: "not-found" };
  return { type: "spa", file: "index.html", query: url.search };
}

test("portable release bevat dotfiles en uitsluitend servercompatibele paden", async () => {
  await withReleaseFixture(async ({ archive, dist }) => {
    await verifyPublicBuild(dist);
    const result = await createPortableRelease(dist, archive);
    assert.deepEqual(
      result.entries.map(({ name }) => name),
      [".htaccess", "assets/index.js", "index.html"],
    );

    const archiveEntries = inspectPortableRelease(await readFile(archive));
    assert.deepEqual(
      archiveEntries.map(({ name }) => name),
      [".htaccess", "assets/index.js", "index.html"],
    );
    assert.ok(archiveEntries.every(({ name }) => !name.includes("\\")));
    const archivedFallback = archiveEntries.find(({ name }) => name === ".htaccess");
    assert.ok(archivedFallback);
    assert.equal(archivedFallback.content.toString("utf8"), spaFallback);
    verifySpaFallbackConfiguration(archivedFallback.content.toString("utf8"));
  });
});

test("geïsoleerde fallback bedient routes, bestanden en ontbrekende assets correct", async () => {
  await withReleaseFixture(async ({ dist }) => {
    assert.deepEqual(
      await resolveIsolatedRequest(dist, "/"),
      { type: "spa", file: "index.html", query: "" },
    );
    assert.deepEqual(
      await resolveIsolatedRequest(dist, "/diensten"),
      { type: "spa", file: "index.html", query: "" },
    );
    assert.deepEqual(
      await resolveIsolatedRequest(dist, "/contact?bron=review"),
      { type: "spa", file: "index.html", query: "?bron=review" },
    );
    assert.deepEqual(await resolveIsolatedRequest(dist, "/index.html"), { type: "file", file: "index.html" });
    assert.deepEqual(
      await resolveIsolatedRequest(dist, "/assets/index.js"),
      { type: "file", file: "assets/index.js" },
    );
    assert.deepEqual(await resolveIsolatedRequest(dist, "/assets/ontbreekt.js"), { type: "not-found" });
    assert.deepEqual(
      await resolveIsolatedRequest(dist, "/nog-onbekend"),
      { type: "spa", file: "index.html", query: "" },
    );
  });
});
