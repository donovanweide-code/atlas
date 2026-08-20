import assert from "node:assert/strict";
import test from "node:test";
import { assertRemoteSourceTag, resolveRemoteTagCommit, sha256, verifyReleaseProvenance } from "../scripts/release-provenance-core.mjs";

const commit = "a".repeat(40);
const artifact = Buffer.from("release");
const rollbackArtifact = Buffer.from("rollback");
const manifest = {
  releaseId: "TEST-RELEASE",
  commit,
  buildTimestamp: "2026-08-20T08:00:00.000Z",
  assetManifestFingerprint: "c".repeat(64),
  artifactSha256: sha256(artifact),
  sourceProvenance: { remote: "origin", tag: "test-release", commit, tree: "d".repeat(40), verifiedAtBuild: true },
  deployability: { rollbackArtifactRequired: true },
};

test("centrale immutable tag wordt inclusief annotated-tag peeling opgelost", () => {
  const output = `${"b".repeat(40)}\trefs/tags/test-release\n${commit}\trefs/tags/test-release^{}\n`;
  assert.equal(resolveRemoteTagCommit(output, "test-release"), commit);
  assert.equal(assertRemoteSourceTag({ output, remote: "origin", tag: "test-release", expectedCommit: commit }), commit);
});

test("ontbrekende of afwijkende centrale source-tag faalt gesloten", () => {
  assert.throws(() => assertRemoteSourceTag({ output: "", remote: "origin", tag: "missing", expectedCommit: commit }), /bestaat niet/);
  assert.throws(() => assertRemoteSourceTag({ output: `${"b".repeat(40)}\trefs\/tags\/test-release\n`, remote: "origin", tag: "test-release", expectedCommit: commit }), /wijst naar/);
});

test("release is alleen deployable met centrale source, integer artifact en integer rollbackartifact", () => {
  assert.deepEqual(verifyReleaseProvenance({
    manifest,
    artifact,
    remoteTagCommit: commit,
    rollbackArtifact,
    rollbackSha256: sha256(rollbackArtifact),
  }), { deployable: true, commit, releaseId: "TEST-RELEASE" });
});

test("ontbrekend rollbackartifact faalt gesloten", () => {
  assert.throws(() => verifyReleaseProvenance({
    manifest,
    artifact,
    remoteTagCommit: commit,
    rollbackArtifact: null,
    rollbackSha256: "",
  }), /rollbackartifact ontbreekt/);
});

test("afwijkende artifacthash en niet-recoverable source falen gesloten", () => {
  assert.throws(() => verifyReleaseProvenance({
    manifest,
    artifact: Buffer.from("changed"),
    remoteTagCommit: "b".repeat(40),
    rollbackArtifact,
    rollbackSha256: sha256(rollbackArtifact),
  }), /centrale source-tag[\s\S]*release-artifact hash/);
});

test("ontbrekende build- en assetprovenance faalt gesloten", () => {
  const incomplete = { ...manifest, buildTimestamp: null, assetManifestFingerprint: null, sourceProvenance: { ...manifest.sourceProvenance, tree: null } };
  assert.throws(() => verifyReleaseProvenance({
    manifest: incomplete,
    artifact,
    remoteTagCommit: commit,
    rollbackArtifact,
    rollbackSha256: sha256(rollbackArtifact),
  }), /source-tree fingerprint[\s\S]*assetmanifest-fingerprint[\s\S]*buildtimestamp/);
});
