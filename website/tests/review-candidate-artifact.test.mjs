import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyImmutableReviewCandidate } from "../scripts/review-candidate-artifact.mjs";
import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import {
  SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR,
  SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID,
} from "../scripts/sportpaleis-review-artifact-validator.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

test("immutable review candidate verification binds artifact, manifests and extracted files", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "review-candidate-identity-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const extracted = path.join(root, "extracted");
  await mkdir(path.join(extracted, "app", "dist-workspace"), { recursive: true });
  const page = Buffer.from("<!doctype html><title>R2.2</title>");
  await writeFile(path.join(extracted, "app", "dist-workspace", "sportpaleis.html"), page);
  const files = [{ path: "app/dist-workspace/sportpaleis.html", bytes: page.length, sha256: hash(page) }];
  const authoritativeProductionAssets = [];
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const bytes = await readFile(new URL(`../${asset.sourcePath}`, import.meta.url));
    const releasePath = `app/dist-workspace/${asset.artifactPath}`;
    const target = path.join(extracted, ...releasePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    files.push({ path: releasePath, bytes: bytes.length, sha256: hash(bytes) });
    authoritativeProductionAssets.push({ id: asset.id, kind: asset.kind, artifactPath: asset.artifactPath, releasePath, sha256: asset.sha256, sizeBytes: asset.sizeBytes, authority: asset.authority, provenance: asset.provenance });
  }
  const embedded = Buffer.from(JSON.stringify({
    releaseId: "R2.2", commit: "abc", files, authoritativeProductionAssets,
    artifactValidation: { schemaVersion: 1, requiredValidators: [{ id: SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID, schemaVersion: 1, productContext: { tenantId: "sportpaleis", application: "workspace" } }] },
  }));
  await writeFile(path.join(extracted, "RELEASE-MANIFEST.json"), embedded);
  const artifact = Buffer.from("immutable-archive-bytes");
  const artifactPath = path.join(root, "R2.2.tar.gz");
  await writeFile(artifactPath, artifact);
  const outer = {
    releaseId: "R2.2", commit: "abc", artifact: "R2.2.tar.gz", artifactBytes: artifact.length,
    artifactSha256: hash(artifact), embeddedManifestSha256: hash(embedded),
  };
  const manifestPath = path.join(root, "R2.2.manifest.json");
  await writeFile(manifestPath, JSON.stringify(outer));

  const options = { artifactValidators: [SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR] };
  const result = await verifyImmutableReviewCandidate({ artifactPath, manifestPath, extractedRoot: extracted, expectedReleaseId: "R2.2", expectedCommit: "abc", expectedArtifactSha256: hash(artifact) }, options);
  assert.equal(result.verifiedFileCount, files.length);
  assert.equal(result.releaseId, "R2.2");

  await writeFile(path.join(extracted, "app", "dist-workspace", "sportpaleis.html"), "tampered");
  await assert.rejects(
    () => verifyImmutableReviewCandidate({ artifactPath, manifestPath, extractedRoot: extracted, expectedReleaseId: "R2.2", expectedCommit: "abc", expectedArtifactSha256: hash(artifact) }, options),
    (error) => error?.code === "REVIEW_ARTIFACT_IDENTITY_MISMATCH",
  );
  assert.equal((await readFile(manifestPath, "utf8")).includes("tampered"), false);
});
