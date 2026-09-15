import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectRuntimeDependencyGraph } from "../scripts/release-runtime-graph.mjs";

test("immutable release includes the complete dependency graph of its mandatory assurances", async () => {
  const builder = await readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8");
  const graphConfiguration = builder.slice(builder.indexOf("const runtimeDependencies ="), builder.indexOf("const explicit ="));
  const entries = ["sportpaleis-production-shaped-assurance.mjs", "wbd-owner-domain-assurance.mjs", "wbd-owner-domain-backfill.mjs", "wbd-owner-domain-rollback-bridge.mjs"];
  for (const entry of entries) assert.ok(graphConfiguration.includes(`"${entry}"`), `${entry} is not a dependency graph entrypoint`);
  const graph = await collectRuntimeDependencyGraph({
    websiteRoot: fileURLToPath(new URL("..", import.meta.url)),
    entrypoints: entries.map(entry => fileURLToPath(new URL(`../scripts/${entry}`, import.meta.url))),
    allowedRoots: ["scripts", "config", "src/sportpaleis"].map(root => fileURLToPath(new URL(`../${root}`, import.meta.url))),
  });
  const packaged = new Set(graph.map(({ archive }) => archive));
  for (const dependency of ["wbd-owner-domain-mariadb-store.mjs", "wbd-owner-domain-state.mjs", "wbd-owner-foundation.mjs", "sportpaleis-domain-mariadb-store.mjs"]) {
    assert.ok(packaged.has(`app/scripts/${dependency}`), `${dependency} is missing from the release`);
  }
});
