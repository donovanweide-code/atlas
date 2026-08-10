import test from "node:test";
import assert from "node:assert/strict";
import {
  createCutJobBatch,
  createProductionPreview,
  createReferencePieces,
  generateDmpl,
  REFERENCE_2_34_77_SOURCE,
  validateDmplRoundTrip,
} from "../src/sportpaleis/direct-print/index.ts";

function referenceBatch() {
  return createCutJobBatch({
    organizationId: "sport-2000-sportpaleis-bv",
    orderId: "SNIJTEST-001-REFERENCE",
    revision: 1,
    attemptIdPrefix: "offline-foundation-003",
    createdAt: "2026-08-07T12:00:00.000Z",
    pieces: createReferencePieces(),
    nesting: {
      absoluteMaxWidthMm: 450,
      preferredWorkingWidthMm: 440,
      minimumCutGapMm: 6.4,
      edgeMarginMm: 3,
    },
  });
}

test("2/34/77 gebruikt de bestaande gevalideerde AI als contourbron", () => {
  assert.equal(REFERENCE_2_34_77_SOURCE.sha256, "4DBA141DC0CF8FA5260CF8360608A314794F839932D4A421EAC036CF86668A7B");
  const pieces = createReferencePieces();
  assert.deepEqual(pieces.map(({ label }) => label), ["Rugnummer 2", "Rugnummer 34", "Rugnummer 77"]);
  assert.equal(pieces.reduce((count, item) => count + item.contours.length, 0), 5);
});

test("referentie past na automatische spiegeling, 90°-rotatie en nesting binnen 450 mm", () => {
  const [job] = referenceBatch().jobs;
  assert.equal(job.productionGeometry.groups.length, 3);
  assert.equal(job.productionGeometry.contours.length, 5);
  assert.equal(job.nesting.minimumCutGapMm, 6.4);
  assert.equal(job.nesting.scaleApplied, 1);
  assert.ok(job.nesting.usedWidthMm <= 450);
  for (const group of job.productionGeometry.groups) {
    assert.equal(group.mirrorApplied, true);
    assert.equal(group.rotationApplied, 90);
  }
});

test("referentie-DM/PL round-trip is geometrisch exact op de 0,025-mm-grid", () => {
  const [job] = referenceBatch().jobs;
  const report = validateDmplRoundTrip(job);
  assert.equal(report.passed, true);
  assert.ok(report.maxCoordinateDeltaMm <= report.toleranceMm);
  assert.equal(report.contourCountMatches, true);
  assert.equal(report.duplicateLinesMatch, true);
  assert.equal(generateDmpl(job).contourCount, 5);
});

test("de referentiepreview toont dezelfde vijf productiecontouren en geen technische bediening", () => {
  const [job] = referenceBatch().jobs;
  const preview = createProductionPreview(job);
  assert.equal(preview.foilColor, "Wit");
  assert.equal(preview.quantity, 3);
  assert.equal(preview.ready, true);
  assert.equal(preview.svg.match(/<path /g)?.length, 5);
  assert.doesNotMatch(preview.svg, /DM\/PL|WinPlot|Illustrator|USB|Spiegelen|Rotatie/);
});
