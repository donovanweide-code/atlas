import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmedOrientations,
  orientationStatusLabel,
} from "../src/atlas-orientations.ts";

test("Bij Cees is een bevestigde, nog niet toegewezen Oriëntatie", () => {
  assert.equal(confirmedOrientations.length, 1);

  const orientation = confirmedOrientations[0];
  assert.equal(orientation.subject, "Bij Cees");
  assert.equal(orientation.status, "unassigned");
  assert.equal(orientationStatusLabel(orientation.status), "Nog niet toegewezen");
  assert.match(orientation.signal, /nog niet gespecificeerde fricties/);
  assert.match(orientation.returnTrigger, /herleidbare bron nieuwe betekenis toevoegt/i);
  assert.equal(
    orientation.sourcePath,
    "docs/atlas/PRAKTIJKVALIDATIE-BIJ-CEES-CANDIDATE.md",
  );
});

test("de Oriëntatie introduceert geen case-, snapshot- of aandachtsidentiteit", () => {
  const orientation = confirmedOrientations[0];

  assert.equal("caseId" in orientation, false);
  assert.equal("snapshot" in orientation, false);
  assert.equal("priority" in orientation, false);
  assert.equal("nextStep" in orientation, false);
  assert.deepEqual(orientation.boundaries, [
    "Geen case-ID",
    "Geen CASE-SNAPSHOT",
    "Geen Focus- of Kompaspositie",
  ]);
});
