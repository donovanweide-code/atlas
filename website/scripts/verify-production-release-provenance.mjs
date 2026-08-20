import { readFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertRemoteSourceTag, verifyReleaseProvenance } from "./release-provenance-core.mjs";

async function main() {
  const [manifestPath, artifactPath, rollbackArtifactPath, rollbackHash] = process.argv.slice(2);
  if (!manifestPath || !artifactPath || !rollbackArtifactPath || !rollbackHash) {
    throw new Error("Gebruik: verify-production-release-provenance <manifest> <artifact> <rollbackartifact> <rollback-sha256>.");
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (path.basename(artifactPath) !== manifest.artifact) throw new Error("Artifactnaam wijkt af van het release-manifest.");
  const remote = manifest.sourceProvenance?.remote;
  const tag = manifest.sourceProvenance?.tag;
  const output = execFileSync("git", ["ls-remote", "--tags", remote, `refs/tags/${tag}`, `refs/tags/${tag}^{}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const remoteTagCommit = assertRemoteSourceTag({ output, remote, tag, expectedCommit: manifest.commit });
  const result = verifyReleaseProvenance({
    manifest,
    artifact: await readFile(artifactPath),
    remoteTagCommit,
    rollbackArtifact: await readFile(rollbackArtifactPath),
    rollbackSha256: rollbackHash.toLowerCase(),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Release provenance verification failed"}\n`);
  process.exitCode = 1;
});
