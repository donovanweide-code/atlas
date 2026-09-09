import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createPlanningFixture } from "./helpers/workspace-planning-fixture.mjs";
import { detachSportpaleisRecordCollections, partitionSportpaleisState } from "../scripts/workspace-domain-state.mjs";

const root = process.env.WORKSPACE_ROLLBACK_ROOT;
if (!root) throw new Error("WORKSPACE_ROLLBACK_ROOT must name the immutable previous release source worktree.");
const expected = "c03d8604cb1ce232c73a34f8996d0ad193f17024";
assert.equal(execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), expected);
const previous = await import(pathToFileURL(path.join(root, "website/scripts/workspace-domain-state.mjs")).href);
const cleanups = []; const fixture = await createPlanningFixture({ after: cleanup => cleanups.push(cleanup) });
try {
  const task = await fixture.items.create(fixture.actors.Patrick.credential, { title: "Rollback compatibility fixture" });
  await fixture.items.change(fixture.actors.Patrick.credential, task.id, "complete", { revision: task.revision });
  const state = await fixture.store.read(); const platform = partitionSportpaleisState(state).platform;
  const { scalar, collections } = detachSportpaleisRecordCollections(platform);
  previous.assertSportpaleisDomainPayload("platform", scalar);
  const blockers = [];
  for (const [key, records] of Object.entries(collections)) for (const record of records.slice(0, 1)) {
    try { previous.sportpaleisRecordIdentity(key, record); }
    catch (error) { blockers.push({ collection: key, code: "PREVIOUS_RUNTIME_UNKNOWN_RECORD_COLLECTION", message: error.message }); }
  }
  const result = { status: blockers.length ? "BLOCKED" : "PASS", previousCommit: expected, platformScalarReadable: true, testedCollections: Object.keys(collections), blockers, mutationsOnLive: 0 };
  const output = path.resolve(".codex-tmp/central-release-gates"); await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "rollback-compatibility.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  if (blockers.length) process.exitCode = 1;
} finally { for (const cleanup of cleanups.reverse()) await cleanup(); }
