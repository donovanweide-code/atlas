import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Sportpaleis runtime gebruikt domeinrecords en niet langer de legacy monolith store", async () => {
  const runtime = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  assert.match(runtime, /new SportpaleisDomainMariaDbStore/u);
  assert.doesNotMatch(runtime, /new SportpaleisMariaDbStore/u);
});

test("Owner Workspace deelt niet de Sportpaleis-state en gebruikt een afzonderlijke domeincandidate", async () => {
  const runtime = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  const owner = await readFile(new URL("../scripts/wbd-owner-domain-mariadb-store.mjs", import.meta.url), "utf8");
  assert.match(runtime, /new WbdOwnerDomainMariaDbStore/u);
  assert.doesNotMatch(runtime, /new WbdOwnerMariaDbStore/u);
  assert.match(owner, /FROM wbd_owner_state/u, "de legacybron blijft uitsluitend voor offline backfill beschikbaar");
  assert.doesNotMatch(owner, /sp_runtime_state/u);
  assert.match(owner, /createLazyWbdOwnerStateDraft/u);
  assert.match(owner, /UPDATE wbd_owner_domain_state/u);
  assert.doesNotMatch(owner, /UPDATE wbd_owner_state/u);
});

test("architectuurcontract houdt Owner-cutover in een afzonderlijke release", async () => {
  const document = await readFile(new URL("../docs/sportpaleis/state-architecture-v1.md", import.meta.url), "utf8");
  assert.match(document, /Owner Workspace does \*\*not\*\* import Sportpaleis state/u);
  assert.match(document, /separate forward-only Owner candidate/u);
  assert.match(document, /No Owner production data migration or cutover is part of the Sportpaleis release/u);
});
