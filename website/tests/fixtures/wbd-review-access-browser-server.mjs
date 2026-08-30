import path from "node:path";

import { createWbdCandidateReviewRuntime } from "../../scripts/wbd-candidate-review-runtime.mjs";
import { createSportpaleisCandidateReviewAdapter } from "../../scripts/sportpaleis-candidate-review-adapter.mjs";
import { SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR } from "../../scripts/sportpaleis-review-artifact-validator.mjs";

const candidateId = "spw-experience-simplification-candidate-r2-2-20260828";
const expectedReleaseId = "SPW-EXPERIENCE-SIMPLIFICATION-CANDIDATE-R2.2-20260828";
const expectedCommit = "42e8a70b38f45de9e1615173ba66c284cc1e74eb";
const expectedArtifactSha256 = "57486d6fcbdc0a3254565fdc660f902aae65a1a3852f832de4db77ca20b5bed5";
const workspaceRoot = path.resolve(new URL("../../../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/u, (value) => value.slice(1)));
const releaseDirectory = path.join(workspaceRoot, "spw-production-teamwear-completion-r2-20260828", "release");

const runtime = await createWbdCandidateReviewRuntime({
  candidate: {
    artifactPath: path.join(releaseDirectory, `${expectedReleaseId}.tar.gz`),
    manifestPath: path.join(releaseDirectory, `${expectedReleaseId}.manifest.json`),
    extractedRoot: path.join(workspaceRoot, "tmp", "r22-browser-assurance-20260828-2300"),
    expectedReleaseId,
    expectedCommit,
    expectedArtifactSha256,
  },
  artifactValidators: [SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR],
  entryPath: "/overzicht",
  shellFile: "sportpaleis.html",
  createApplicationAdapter: ({ identity, runtimeRoot }) => createSportpaleisCandidateReviewAdapter({
    identity,
    runtimeRoot,
    candidateId,
    humanGoReference: "GO-WBD-REVIEW-ACCESS-R22-20260829",
  }),
});

process.stdout.write(`WBD_REVIEW_ACCESS_BROWSER_PROOF_READY ${runtime.startUrl} ${runtime.evidenceUrl} ${runtime.identity.releaseId} ${runtime.identity.commit} ${runtime.identity.artifactSha256}\n`);

const close = async () => { await runtime.close(); };
process.once("SIGINT", () => void close().finally(() => process.exit(0)));
process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
process.stdin.setEncoding("utf8");
process.stdin.on("data", (value) => {
  if (String(value).trim().toUpperCase() === "CLOSE") void close().finally(() => process.exit(0));
});
