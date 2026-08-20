import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function resolveRemoteTagCommit(output, tag) {
  const directRef = `refs/tags/${tag}`;
  const peeledRef = `${directRef}^{}`;
  const references = new Map(String(output).trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const [commit, reference] = line.trim().split(/\s+/u);
    return [reference, commit];
  }));
  return references.get(peeledRef) ?? references.get(directRef) ?? null;
}

export function assertRemoteSourceTag({ output, remote, tag, expectedCommit }) {
  const remoteCommit = resolveRemoteTagCommit(output, tag);
  if (!remoteCommit) throw new Error(`Source-tag ${tag} bestaat niet op centrale remote ${remote}.`);
  if (remoteCommit !== expectedCommit) {
    throw new Error(`Source-tag ${tag} op ${remote} wijst naar ${remoteCommit}, niet naar ${expectedCommit}.`);
  }
  return remoteCommit;
}

export function verifyReleaseProvenance({ manifest, artifact, remoteTagCommit, rollbackArtifact, rollbackSha256 }) {
  const failures = [];
  const commitPattern = /^[a-f0-9]{40}$/u;
  const hashPattern = /^[a-f0-9]{64}$/u;
  const treePattern = /^[a-f0-9]{40}$/u;
  const provenance = manifest?.sourceProvenance;

  if (!commitPattern.test(String(manifest?.commit ?? ""))) failures.push("manifest commit ontbreekt of is ongeldig");
  if (!provenance?.remote || !provenance?.tag || provenance?.commit !== manifest?.commit || provenance?.verifiedAtBuild !== true) {
    failures.push("centrale source-provenance ontbreekt of is inconsistent");
  }
  if (!treePattern.test(String(provenance?.tree ?? ""))) failures.push("source-tree fingerprint ontbreekt");
  if (!hashPattern.test(String(manifest?.assetManifestFingerprint ?? ""))) failures.push("assetmanifest-fingerprint ontbreekt");
  if (!Number.isFinite(Date.parse(String(manifest?.buildTimestamp ?? "")))) failures.push("buildtimestamp ontbreekt of is ongeldig");
  if (remoteTagCommit !== manifest?.commit) failures.push("centrale source-tag wijst niet naar manifest commit");
  if (!Buffer.isBuffer(artifact) || artifact.length === 0) failures.push("immutable release-artifact ontbreekt");
  else if (!hashPattern.test(String(manifest?.artifactSha256 ?? "")) || sha256(artifact) !== manifest.artifactSha256) {
    failures.push("release-artifact hash wijkt af");
  }
  if (manifest?.deployability?.rollbackArtifactRequired !== true) failures.push("rollbackpolicy ontbreekt");
  if (!Buffer.isBuffer(rollbackArtifact) || rollbackArtifact.length === 0) failures.push("rollbackartifact ontbreekt");
  else if (!hashPattern.test(String(rollbackSha256 ?? "")) || sha256(rollbackArtifact) !== rollbackSha256) {
    failures.push("rollbackartifact hash wijkt af");
  }

  if (failures.length > 0) throw new Error(`Release niet deployable: ${failures.join("; ")}.`);
  return { deployable: true, commit: manifest.commit, releaseId: manifest.releaseId };
}
