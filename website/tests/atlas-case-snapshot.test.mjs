import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCaseSnapshot } from "../src/atlas-case-snapshot.ts";

const snapshotUrl = new URL("../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json", import.meta.url);
const snapshotRaw = readFileSync(snapshotUrl, "utf8");

function confirmedSnapshotRaw() {
  const snapshot = JSON.parse(snapshotRaw);
  snapshot.lifecycleStatus = "confirmed";
  snapshot.confirmationMode = "editorially-confirmed";
  snapshot.confirmedBy = "donovan";
  snapshot.lastConfirmedAt = "2026-07-24";
  snapshot.lastConfirmedAtPrecision = "day";
  return JSON.stringify(snapshot);
}

test("de actuele Case 0001 Candidate blijft buiten de Workspace", () => {
  const result = parseCaseSnapshot(snapshotRaw);
  const snapshot = JSON.parse(snapshotRaw);

  assert.deepEqual(result, { state: "unavailable", reason: "not-confirmed" });
  assert.equal(snapshot.lifecycleStatus, "candidate");
  assert.equal(snapshot.confirmationMode, "editorial-confirmation-pending");
  assert.equal(snapshot.confirmedBy, null);
  assert.equal(snapshot.lastConfirmedAt, null);
});

test("dezelfde revision kan uitsluitend na expliciete bevestigingsmetadata laden", () => {
  const result = parseCaseSnapshot(confirmedSnapshotRaw());

  assert.equal(result.state, "confirmed");
  assert.equal(result.snapshot.caseId, "0001");
  assert.equal(result.snapshot.revision, 2);
  assert.equal(result.snapshot.confirmationMode, "editorially-confirmed");
  assert.equal(result.snapshot.editorialOwner, "atlas");
  assert.equal(result.snapshot.confirmedBy, "donovan");
  assert.match(result.snapshot.position.text, /preview\.webuildanddesign\.nl/);
  assert.match(result.snapshot.nextStep.text, /revision 2/);
  assert.ok(result.snapshot.sources.length >= 10);
});

test("ontbrekende, kapotte en ongeldige snapshots vallen niet terug op oude inhoud", () => {
  assert.deepEqual(parseCaseSnapshot(undefined), { state: "unavailable", reason: "missing" });
  assert.deepEqual(parseCaseSnapshot("{"), { state: "unavailable", reason: "invalid" });

  const invalid = JSON.parse(snapshotRaw);
  invalid.position.claimIds = ["C-404"];
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(invalid)), { state: "unavailable", reason: "invalid" });
});

test("alleen een Confirmed revision mag de Workspace voeden", () => {
  assert.deepEqual(
    parseCaseSnapshot(snapshotRaw),
    { state: "unavailable", reason: "not-confirmed" },
  );

  for (const lifecycleStatus of ["superseded", "withdrawn"]) {
    const snapshot = JSON.parse(confirmedSnapshotRaw());
    snapshot.lifecycleStatus = lifecycleStatus;
    assert.deepEqual(
      parseCaseSnapshot(JSON.stringify(snapshot)),
      { state: "unavailable", reason: "not-confirmed" },
    );
  }
});

test("een Candidate met bevestigingsmetadata wordt als inconsistent geweigerd", () => {
  const snapshot = JSON.parse(snapshotRaw);
  snapshot.confirmationMode = "editorially-confirmed";
  snapshot.confirmedBy = "donovan";
  snapshot.lastConfirmedAt = "2026-07-24";
  snapshot.lastConfirmedAtPrecision = "day";
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(snapshot)), { state: "unavailable", reason: "invalid" });
});

test("een onbekende schema-versie en ontbrekende bron worden geweigerd", () => {
  const future = JSON.parse(snapshotRaw);
  future.schemaVersion = 2;
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(future)), { state: "unavailable", reason: "invalid" });

  const untraceable = JSON.parse(snapshotRaw);
  untraceable.claims[0].sourceIds = ["S-404"];
  assert.deepEqual(parseCaseSnapshot(JSON.stringify(untraceable)), { state: "unavailable", reason: "invalid" });
});
