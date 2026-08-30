import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deterministicTeamwearCatalogManifest,
  deterministicWorkspaceAssetFileName,
} from "../config/deterministic-workspace-assets.mjs";
import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  assertAuthoritativeProductionAssetBytes,
} from "../config/sportpaleis-authoritative-production-assets.mjs";

const bytes = Buffer.from("same-byte-content");
const asset = (fileName, originalFileNames, source = bytes) => ({ type: "asset", fileName, originalFileNames, source });

test("duplicate bytes behouden stabiele, brongebonden assetnamen onafhankelijk van discoveryvolgorde", () => {
  const first = { originalFileNames: ["src/assets/images/sportpaleis/live-catalog/b.webp"], names: ["b.webp"] };
  const second = { originalFileNames: ["src/assets/images/sportpaleis/live-catalog/a.webp"], names: ["a.webp"] };
  assert.equal(deterministicWorkspaceAssetFileName({ ...first, originalFileNames: [...first.originalFileNames].reverse() }), deterministicWorkspaceAssetFileName(first));
  assert.equal(deterministicWorkspaceAssetFileName({ ...second, originalFileNames: [...second.originalFileNames].reverse() }), deterministicWorkspaceAssetFileName(second));
  assert.notEqual(deterministicWorkspaceAssetFileName(first), deterministicWorkspaceAssetFileName(second), "dezelfde bytes van verschillende catalogusitems krijgen geen orderafhankelijke suffixcollision");
  assert.match(deterministicWorkspaceAssetFileName(first), /^assets\/workspace-b-[a-f0-9]{12}-\[hash\]\[extname\]$/u);
});

test("catalogusmanifest is byte-identiek bij verschillende bundle insertion orders", () => {
  const a = asset("assets/workspace-a-stable-A.webp", ["src/assets/images/sportpaleis/live-catalog/a.webp"]);
  const b = asset("assets/workspace-b-stable-A.webp", ["src/assets/images/sportpaleis/live-catalog/b.webp"]);
  const first = deterministicTeamwearCatalogManifest({ z: b, a });
  const second = deterministicTeamwearCatalogManifest({ a, z: b });
  assert.equal(`${JSON.stringify(first, null, 2)}\n`, `${JSON.stringify(second, null, 2)}\n`);
  assert.deepEqual(Object.keys(first.images), ["a", "b"]);
  assert.equal(first.images.a.fileName, a.fileName);
  assert.equal(first.images.b.fileName, b.fileName);
  assert.equal(first.images.a.sha256, first.images.b.sha256, "duplicate bytes blijven per correct catalogusitem traceerbaar");
});

test("conflicterende materialisatie van één catalogusidentity faalt gesloten", () => {
  const original = ["src/assets/images/sportpaleis/live-catalog/a.webp"];
  assert.throws(() => deterministicTeamwearCatalogManifest({
    first: asset("assets/a-one.webp", original, Buffer.from("one")),
    second: asset("assets/a-two.webp", original, Buffer.from("two")),
  }), /Conflicterende deterministische catalogusasset/u);
});

test("authoritative fonts en overige production assets behouden hun exacte bytes en identity", async () => {
  for (const productionAsset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const source = await readFile(new URL(`../${productionAsset.sourcePath}`, import.meta.url));
    const evidence = assertAuthoritativeProductionAssetBytes(productionAsset, source);
    assert.equal(evidence.id, productionAsset.id);
    assert.equal(evidence.sha256, productionAsset.sha256);
    assert.equal(evidence.artifactPath, productionAsset.artifactPath);
  }
});

test("releasemanifest gebruikt immutable commitmetadata en geen actuele klok", async () => {
  const source = await readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8");
  assert.match(source, /sourceCommitTimestamp = new Date\(git\("show", "-s", "--format=%cI", commit\)\)\.toISOString\(\)/u);
  assert.match(source, /buildTimestamp: sourceCommitTimestamp/u);
  assert.doesNotMatch(source, /buildTimestamp: new Date\(\)\.toISOString\(\)/u);
});
