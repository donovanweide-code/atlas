import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCaseSnapshot } from "../src/atlas-case-snapshot.ts";

const snapshotUrl = new URL("../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json", import.meta.url);
const snapshotRaw = readFileSync(snapshotUrl, "utf8");

test("Case 0001 laadt als herleidbare Confirmed revision", () => {
  const result = parseCaseSnapshot(snapshotRaw);
  assert.equal(result.state, "confirmed");
  assert.equal(result.snapshot.caseId, "0001");
  assert.equal(result.snapshot.revision, 1);
  assert.equal(result.snapshot.confirmationMode, "editorially-confirmed");
  assert.equal(result.snapshot.editorialOwner, "atlas");
  assert.equal(result.snapshot.confirmedBy, "donovan");
  assert.match(result.snapshot.position.text, /TransIP Webhosting/);
  assert.match(result.snapshot.nextStep.text, /geen hostingwijziging/);
  assert.ok(result.snapshot.sources.length >= 5);
});

test("ontbrekende, kapotte en ongeldige snapshots vallen niet terug op oude inhoud", () => {
  assert.deepEqual(parseCaseSnapshot(undefined), { state: "unavailable", reason: "missing" });
  assert.deepEqual(parseCaseSnapshot("{"), { state: "unavailable", reason: "invalid" });

  const invalid = JSON.parse(snapshotRaw);
  invalid.position.claimIds = ["C-404"];
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(invalid)), { state: "unavailable", reason: "invalid" });
});

test("alleen een Confirmed revision mag de Workspace voeden", () => {
  for (const lifecycleStatus of ["candidate", "superseded", "withdrawn"]) {
    const snapshot = JSON.parse(snapshotRaw);
    snapshot.lifecycleStatus = lifecycleStatus;
    assert.deepEqual(
      parseCaseSnapshot(JSON.stringify(snapshot)),
      { state: "unavailable", reason: "not-confirmed" },
    );
  }
});

test("een onbekende schema-versie en ontbrekende bron worden geweigerd", () => {
  const future = JSON.parse(snapshotRaw);
  future.schemaVersion = 2;
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(future)), { state: "unavailable", reason: "invalid" });

  const untraceable = JSON.parse(snapshotRaw);
  untraceable.claims[0].sourceIds = ["S-404"];
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(untraceable)), { state: "unavailable", reason: "invalid" });
});
