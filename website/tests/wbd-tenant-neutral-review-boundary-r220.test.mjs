import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { verifyImmutableReviewCandidate } from "../scripts/review-candidate-artifact.mjs";
import {
  SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR,
  SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID,
} from "../scripts/sportpaleis-review-artifact-validator.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(context, { product = "generic", omitAssetId = null, mutateDeclaredAssetId = null, productContext = null } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-r220-artifact-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const extractedRoot = path.join(root, "extracted");
  const distRoot = path.join(extractedRoot, "app", "dist-workspace");
  await mkdir(distRoot, { recursive: true });
  const shellName = product === "sportpaleis" ? "sportpaleis.html" : "index.html";
  const shell = Buffer.from(`<!doctype html><title>${product}</title>`);
  await writeFile(path.join(distRoot, shellName), shell);
  const files = [{ path: `app/dist-workspace/${shellName}`, bytes: shell.length, sha256: sha256(shell) }];
  const embedded = { releaseId: `R220-${product}`, commit: "2".repeat(40), files };
  if (product === "sportpaleis") {
    embedded.authoritativeProductionAssets = [];
    for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
      if (asset.id === omitAssetId) continue;
      const bytes = await readFile(new URL(`../${asset.sourcePath}`, import.meta.url));
      const releasePath = `app/dist-workspace/${asset.artifactPath}`;
      const target = path.join(extractedRoot, ...releasePath.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
      files.push({ path: releasePath, bytes: bytes.length, sha256: sha256(bytes) });
      embedded.authoritativeProductionAssets.push({
        id: asset.id, kind: asset.kind, artifactPath: asset.artifactPath, releasePath,
        sha256: asset.id === mutateDeclaredAssetId ? "0".repeat(64) : asset.sha256,
        sizeBytes: asset.sizeBytes, authority: asset.authority, provenance: asset.provenance,
      });
    }
    embedded.artifactValidation = {
      schemaVersion: 1,
      requiredValidators: [{
        id: SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID,
        schemaVersion: 1,
        productContext: productContext ?? { tenantId: "sportpaleis", application: "workspace" },
      }],
    };
  }
  const embeddedBytes = Buffer.from(JSON.stringify(embedded));
  await writeFile(path.join(extractedRoot, "RELEASE-MANIFEST.json"), embeddedBytes);
  const artifact = Buffer.from(`immutable-${product}`);
  const artifactPath = path.join(root, `${embedded.releaseId}.tar.gz`);
  const manifestPath = path.join(root, `${embedded.releaseId}.manifest.json`);
  await writeFile(artifactPath, artifact);
  await writeFile(manifestPath, JSON.stringify({
    releaseId: embedded.releaseId, commit: embedded.commit, artifact: path.basename(artifactPath),
    artifactBytes: artifact.length, artifactSha256: sha256(artifact), embeddedManifestSha256: sha256(embeddedBytes),
  }));
  return {
    candidate: { artifactPath, manifestPath, extractedRoot, expectedReleaseId: embedded.releaseId, expectedCommit: embedded.commit, expectedArtifactSha256: sha256(artifact) },
    options: { artifactValidators: [SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR] },
  };
}

test("generieke Candidate blijft tenantneutraal en roept geen ongevraagde productvalidator aan", async (context) => {
  const { candidate } = await fixture(context);
  let calls = 0;
  const result = await verifyImmutableReviewCandidate(candidate, { artifactValidators: [{ id: "unrelated.product.v1", async validate() { calls += 1; } }] });
  assert.equal(result.releaseId, "R220-generic");
  assert.deepEqual(result.invokedArtifactValidators, []);
  assert.equal(calls, 0);
});

test("Sportpaleis Candidate met exacte production assets en context passeert dezelfde strenge grens", async (context) => {
  const { candidate, options } = await fixture(context, { product: "sportpaleis" });
  const result = await verifyImmutableReviewCandidate(candidate, options);
  assert.deepEqual(result.invokedArtifactValidators, [SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID]);
});

test("Sportpaleis Candidate zonder Spain asset faalt gesloten", async (context) => {
  const { candidate, options } = await fixture(context, { product: "sportpaleis", omitAssetId: "font-5d083befacdf98ae" });
  await assert.rejects(() => verifyImmutableReviewCandidate(candidate, options), (error) => error?.code === "REVIEW_ARTIFACT_PRODUCTION_ASSET_MISMATCH");
});

test("verkeerde productspecifieke assetset faalt gesloten", async (context) => {
  const { candidate, options } = await fixture(context, { product: "sportpaleis", mutateDeclaredAssetId: "font-5d083befacdf98ae" });
  await assert.rejects(() => verifyImmutableReviewCandidate(candidate, options), (error) => error?.code === "REVIEW_ARTIFACT_PRODUCTION_ASSET_MISMATCH");
});

test("Sportpaleis validator faalt buiten zijn tenant/application-context", async (context) => {
  const { candidate, options } = await fixture(context, { product: "sportpaleis", productContext: { tenantId: "wbd", application: "workspace" } });
  await assert.rejects(() => verifyImmutableReviewCandidate(candidate, options), (error) => error?.code === "REVIEW_ARTIFACT_VALIDATOR_CONTEXT_MISMATCH");
});

test("vereiste productspecifieke validator ontbreekt nooit stil", async (context) => {
  const { candidate } = await fixture(context, { product: "sportpaleis" });
  await assert.rejects(() => verifyImmutableReviewCandidate(candidate), (error) => error?.code === "REVIEW_ARTIFACT_VALIDATOR_MISSING");
});

test("generieke reviewmodules importeren of benoemen geen Sportpaleis-productdependency", async () => {
  for (const moduleName of ["review-candidate-artifact.mjs", "wbd-candidate-review-runtime.mjs"]) {
    const source = await readFile(new URL(`../scripts/${moduleName}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /sportpaleis/iu, moduleName);
  }
});
