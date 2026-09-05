import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Sportpaleis runtime gebruikt domeinrecords en niet langer de legacy monolith store", async () => {
  const runtime = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  assert.match(runtime, /new SportpaleisDomainMariaDbStore/u);
  assert.doesNotMatch(runtime, /new SportpaleisMariaDbStore/u);
});

test("Owner Workspace deelt niet de Sportpaleis-state maar heeft aantoonbaar dezelfde monolithische foutklasse", async () => {
  const owner = await readFile(new URL("../scripts/wbd-owner-mariadb-store.mjs", import.meta.url), "utf8");
  assert.match(owner, /FROM wbd_owner_state/u);
  assert.doesNotMatch(owner, /sp_runtime_state/u);
  assert.match(owner, /const current = validateWbdOwnerState\(jsonValue\(rows\[0\]\.state_json\)\)/u);
  assert.match(owner, /mutator\(structuredClone\(current\)\)/u);
  assert.match(owner, /UPDATE wbd_owner_state SET schema_version = \?, revision = \?, state_json = \?/u);
});

test("architectuurcontract houdt Owner-cutover uit de Sportpaleis-release", async () => {
  const document = await readFile(new URL("../docs/sportpaleis/state-architecture-v1.md", import.meta.url), "utf8");
  assert.match(document, /Owner Workspace does \*\*not\*\* import Sportpaleis state/u);
  assert.match(document, /separate candidate, domain map, backfill, shadow comparison and assurance contract/u);
  assert.match(document, /No Owner data migration or cutover is part of the Sportpaleis release/u);
});
