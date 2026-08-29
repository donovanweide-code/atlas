import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function fail(message, code) {
  throw Object.assign(new Error(message), { code });
}

function exact(value, expected, label) {
  if (String(value ?? "") !== String(expected ?? "")) fail(`${label} komt niet overeen met de geautoriseerde Candidate.`, "REVIEW_ARTIFACT_IDENTITY_MISMATCH");
}

export async function verifyImmutableReviewCandidate({
  artifactPath,
  manifestPath,
  extractedRoot,
  expectedReleaseId,
  expectedCommit,
  expectedArtifactSha256,
}) {
  const resolvedArtifact = path.resolve(artifactPath);
  const resolvedManifest = path.resolve(manifestPath);
  const resolvedRoot = path.resolve(extractedRoot);
  const outerManifest = JSON.parse(await readFile(resolvedManifest, "utf8"));
  exact(outerManifest.releaseId, expectedReleaseId, "Release-ID");
  exact(outerManifest.commit, expectedCommit, "Commit");
  exact(String(outerManifest.artifactSha256).toLowerCase(), String(expectedArtifactSha256).toLowerCase(), "Artifact SHA-256 in manifest");
  exact(path.basename(resolvedArtifact), outerManifest.artifact, "Artifactbestandsnaam");
  const artifactInfo = await stat(resolvedArtifact);
  exact(artifactInfo.size, outerManifest.artifactBytes, "Artifactgrootte");
  exact(await sha256(resolvedArtifact), String(expectedArtifactSha256).toLowerCase(), "Artifact SHA-256");

  const embeddedManifestPath = path.join(resolvedRoot, "RELEASE-MANIFEST.json");
  exact(await sha256(embeddedManifestPath), String(outerManifest.embeddedManifestSha256).toLowerCase(), "Embedded manifest SHA-256");
  const embeddedManifest = JSON.parse(await readFile(embeddedManifestPath, "utf8"));
  exact(embeddedManifest.releaseId, expectedReleaseId, "Embedded release-ID");
  exact(embeddedManifest.commit, expectedCommit, "Embedded commit");

  for (const entry of embeddedManifest.files ?? []) {
    const relative = String(entry.path ?? "").replaceAll("/", path.sep);
    const filePath = path.resolve(resolvedRoot, relative);
    const containment = path.relative(resolvedRoot, filePath);
    if (!relative || containment.startsWith("..") || path.isAbsolute(containment)) fail("Embedded manifest bevat een pad buiten de Candidate-root.", "REVIEW_ARTIFACT_PATH_ESCAPE");
    const info = await stat(filePath);
    exact(info.size, entry.bytes, `Bestandsgrootte ${entry.path}`);
    exact(await sha256(filePath), String(entry.sha256).toLowerCase(), `Bestandshash ${entry.path}`);
  }

  const distRoot = path.join(resolvedRoot, "app", "dist-workspace");
  await stat(path.join(distRoot, "sportpaleis.html"));
  return Object.freeze({
    releaseId: outerManifest.releaseId,
    commit: outerManifest.commit,
    artifactSha256: String(outerManifest.artifactSha256).toLowerCase(),
    manifestSha256: await sha256(resolvedManifest),
    embeddedManifestSha256: String(outerManifest.embeddedManifestSha256).toLowerCase(),
    distRoot,
    extractedRoot: resolvedRoot,
    verifiedFileCount: (embeddedManifest.files ?? []).length,
  });
}
