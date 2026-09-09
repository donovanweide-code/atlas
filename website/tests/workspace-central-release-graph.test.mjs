import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectRuntimeDependencyGraph } from "../scripts/release-runtime-graph.mjs";

test("central runtime and initial configuration ship all dependencies inside the immutable website artifact", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const graph = await collectRuntimeDependencyGraph({ websiteRoot: root,
    entrypoints: ["scripts/workspace-runtime.mjs", "scripts/sportpaleis-permission-rollout.mjs", "scripts/sportpaleis-domain-cutover-cli.mjs", "scripts/sportpaleis-production-shaped-assurance.mjs", "scripts/wbd-owner-domain-assurance.mjs"].map(file => path.join(root, file)),
    allowedRoots: ["scripts", "config", "src/sportpaleis", "src/workspace-sequence.ts", "src/workspace-permission-catalog.mjs", "src/workspace-context-signal-catalog.mjs", "src/workspace-work-item.ts"].map(file => path.join(root, file)),
  });
  const paths = graph.map(entry => entry.archive);
  for (const file of ["app/config/sportpaleis-permission-rollout.mjs", "app/scripts/workspace-mutation-authority.mjs", "app/scripts/workspace-work-item-store.mjs", "app/src/workspace-work-item.ts", "app/src/workspace-permission-catalog.mjs", "app/src/workspace-context-signal-catalog.mjs", "app/scripts/sportpaleis-printing-signals.mjs"]) assert.ok(paths.includes(file), file);
  assert.equal(paths.some(file => file.includes("shared-planning-review") || file.includes("webshop-batch-review")), false);
  for (const file of ["app/config/sportpaleis-domain-cutover.mjs", "app/scripts/sportpaleis-domain-cutover.mjs", "app/scripts/sportpaleis-domain-authority.mjs"]) assert.ok(paths.includes(file), file);
  for (const file of ["app/scripts/wbd-owner-domain-mariadb-store.mjs", "app/scripts/wbd-owner-domain-state.mjs"]) assert.ok(paths.includes(file), file);
});
