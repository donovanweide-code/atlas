import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createWbdCandidateReviewRuntime, WBD_CANDIDATE_REVIEW_RUNTIME_CONTRACT } from "../scripts/wbd-candidate-review-runtime.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function candidateFixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-candidate-runtime-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const extractedRoot = path.join(root, "extracted");
  const distRoot = path.join(extractedRoot, "app", "dist-workspace");
  await mkdir(distRoot, { recursive: true });
  const shell = Buffer.from("<!doctype html><title>Exact Candidate</title><main>immutable bytes</main>");
  await writeFile(path.join(distRoot, "index.html"), shell);
  const embedded = {
    releaseId: "WBD-REVIEW-RUNTIME-TEST",
    commit: "a".repeat(40),
    files: [{ path: "app/dist-workspace/index.html", bytes: shell.length, sha256: sha256(shell) }],
  };
  const embeddedBytes = Buffer.from(JSON.stringify(embedded));
  await writeFile(path.join(extractedRoot, "RELEASE-MANIFEST.json"), embeddedBytes);
  const artifact = Buffer.from("immutable archive identity");
  const artifactPath = path.join(root, "candidate.tar.gz");
  const manifestPath = path.join(root, "candidate.manifest.json");
  await writeFile(artifactPath, artifact);
  await writeFile(manifestPath, JSON.stringify({
    releaseId: embedded.releaseId,
    commit: embedded.commit,
    artifact: path.basename(artifactPath),
    artifactBytes: artifact.length,
    artifactSha256: sha256(artifact),
    embeddedManifestSha256: sha256(embeddedBytes),
  }));
  return {
    expectedReleaseId: embedded.releaseId,
    expectedCommit: embedded.commit,
    expectedArtifactSha256: sha256(artifact),
    artifactPath,
    manifestPath,
    extractedRoot,
    shell,
  };
}

test("generic Candidate Review Runtime verifies first, serves exact bytes, audits identity and destroys state", async (context) => {
  const candidate = await candidateFixture(context);
  let adapterRuntimeRoot = null;
  let adapterClosed = false;
  const runtime = await createWbdCandidateReviewRuntime({
    candidate,
    createApplicationAdapter: async ({ identity, runtimeRoot, contract }) => {
      assert.equal(identity.releaseId, candidate.expectedReleaseId);
      assert.equal(contract, WBD_CANDIDATE_REVIEW_RUNTIME_CONTRACT);
      adapterRuntimeRoot = runtimeRoot;
      await writeFile(path.join(runtimeRoot, "candidate-only-state.json"), "disposable");
      return {
        activate: async () => ({ headers: { "Set-Cookie": "review_session=temporary; Path=/; HttpOnly; SameSite=Strict" } }),
        handleRequest: async (request, response) => {
          if (request.url !== "/api/review-safe") return false;
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ state: "candidate-only" }));
          return true;
        },
        evidence: async () => ({ principalId: "wbd-review-codex", stateBoundary: "DISPOSABLE_CANDIDATE_ONLY", auditCount: 1 }),
        close: async () => { adapterClosed = true; },
      };
    },
  });
  context.after(() => runtime.close());

  const shellResponse = await fetch(`${runtime.baseUrl}/overzicht`);
  assert.equal(shellResponse.status, 200);
  assert.deepEqual(Buffer.from(await shellResponse.arrayBuffer()), candidate.shell);
  assert.equal(shellResponse.headers.get("x-wbd-candidate-release"), candidate.expectedReleaseId);
  assert.equal(shellResponse.headers.get("x-wbd-candidate-commit"), candidate.expectedCommit);
  assert.equal(shellResponse.headers.get("x-wbd-candidate-artifact-sha256"), candidate.expectedArtifactSha256);

  const evidence = await (await fetch(runtime.evidenceUrl)).json();
  assert.equal(evidence.identity.releaseId, candidate.expectedReleaseId);
  assert.equal(evidence.identity.extractedRoot, undefined, "host paths are not exposed to the review principal");
  assert.equal(evidence.stateBoundary, "DISPOSABLE_CANDIDATE_ONLY");

  const start = await fetch(runtime.startUrl, { redirect: "manual" });
  assert.equal(start.status, 302);
  assert.match(start.headers.get("set-cookie"), /^review_session=temporary/u);
  assert.equal((await fetch(runtime.startUrl, { redirect: "manual" })).status, 410, "handoff is one-time");
  assert.deepEqual(await (await fetch(`${runtime.baseUrl}/api/review-safe`)).json(), { state: "candidate-only" });

  await runtime.close();
  assert.equal(adapterClosed, true);
  await assert.rejects(() => access(adapterRuntimeRoot), { code: "ENOENT" });
});

test("identity mismatch fails before an application adapter or state is created", async (context) => {
  const candidate = await candidateFixture(context);
  let adapterCreated = false;
  await assert.rejects(
    () => createWbdCandidateReviewRuntime({
      candidate: { ...candidate, expectedArtifactSha256: "0".repeat(64) },
      createApplicationAdapter: async () => { adapterCreated = true; },
    }),
    (error) => error?.code === "REVIEW_ARTIFACT_IDENTITY_MISMATCH",
  );
  assert.equal(adapterCreated, false);
});
