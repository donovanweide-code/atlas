import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsForContours,
  createCutJobBatch,
  createProductionPreview,
  generateDmpl,
  parseDmpl,
  recomputeContentHash,
  transformContours,
  validateDmplRoundTrip,
  validateGeometry,
} from "../src/sportpaleis/direct-print/index.ts";

const material = { code: "TEST-WHITE", foilColor: "Wit" };

function rectangle(id, width, height, x = 0, y = 0) {
  return {
    id,
    closed: true,
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
      { x, y },
    ],
  };
}

function piece(id, contour, options = {}) {
  return {
    id,
    label: id,
    product: "Testproduct",
    material: options.material ?? material,
    contours: [contour],
    productionRule: {
      mirror: options.mirror ?? false,
      rotation: options.rotation ?? 0,
    },
  };
}

function request(pieces, overrides = {}) {
  return {
    organizationId: "sportpaleis",
    orderId: overrides.orderId ?? "ORDER-001",
    revision: overrides.revision ?? 1,
    attemptIdPrefix: overrides.attemptIdPrefix ?? "attempt-001",
    createdAt: "2026-08-07T12:00:00.000Z",
    pieces,
    nesting: {
      absoluteMaxWidthMm: 450,
      preferredWorkingWidthMm: overrides.preferredWorkingWidthMm ?? 440,
      minimumCutGapMm: overrides.minimumCutGapMm ?? overrides.gapMm ?? 5,
      edgeMarginMm: overrides.edgeMarginMm ?? 0,
      ...(overrides.maxJobLengthMm ? { maxJobLengthMm: overrides.maxJobLengthMm } : {}),
    },
  };
}

test("millimeters gaan exact via 40 plotterunits per mm heen en terug", () => {
  const [job] = createCutJobBatch(request([piece("rect", rectangle("rect", 20, 10))])).jobs;
  const dmpl = generateDmpl(job);
  const parsed = parseDmpl(dmpl.content);
  assert.equal(dmpl.content.includes("ECN"), true);
  assert.deepEqual(parsed.boundsMm, job.productionGeometry.boundsMm);
  assert.equal(validateDmplRoundTrip(job).maxCoordinateDeltaMm, 0);
});

test("spiegelen behoudt de fysieke maat en wordt als productieregel toegepast", () => {
  const contour = rectangle("asymmetrisch", 31, 17);
  const before = boundsForContours([contour]);
  const after = boundsForContours(transformContours([contour], true, 0));
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  const [job] = createCutJobBatch(request([piece("mirror", contour, { mirror: true })])).jobs;
  assert.equal(job.productionGeometry.groups[0].mirrorApplied, true);
});

test("90 graden rotatie verwisselt breedte en hoogte zonder schaalwijziging", () => {
  const contour = rectangle("rotate", 30, 10);
  const rotated = boundsForContours(transformContours([contour], false, 90));
  assert.equal(rotated.width, 10);
  assert.equal(rotated.height, 30);
  const [job] = createCutJobBatch(request([piece("rotate", contour, { rotation: 90 })])).jobs;
  assert.equal(job.nesting.scaleApplied, 1);
});

test("nesting blijft binnen de harde 450 mm", () => {
  const [job] = createCutJobBatch(request([
    piece("a", rectangle("a", 200, 50)),
    piece("b", rectangle("b", 200, 50)),
  ], { minimumCutGapMm: 6.4, edgeMarginMm: 3 })).jobs;
  assert.ok(job.nesting.usedWidthMm <= 450);
  assert.equal(job.productionArea.absoluteMaxWidthMm, 450);
});

test("meer dan 450 mm wordt hard afgekeurd en nooit verkleind", () => {
  assert.throws(
    () => createCutJobBatch(request([piece("too-wide", rectangle("too-wide", 450.025, 20))])),
    /wordt niet geschaald/,
  );
});

test("preferredWorkingWidthMm is configureerbaar en geen permanente 440 mm-limiet", () => {
  const [job] = createCutJobBatch(request([
    piece("wide-but-valid", rectangle("wide-but-valid", 445, 20)),
  ])).jobs;
  assert.equal(job.nesting.configuredWidthMm, 450);
  assert.equal(job.nesting.scaleApplied, 1);
  assert.equal(job.productionGeometry.boundsMm.width, 445);
});

test("een opdracht wordt in meerdere jobs gesplitst als de lengteconfiguratie dat vereist", () => {
  const batch = createCutJobBatch(request([
    piece("first", rectangle("first", 230, 100)),
    piece("second", rectangle("second", 230, 100)),
  ], { preferredWorkingWidthMm: 150, minimumCutGapMm: 10, maxJobLengthMm: 150 }));
  assert.equal(batch.jobs.length, 2);
  assert.deepEqual(batch.jobs.map(({ nesting }) => nesting.sheetIndex), [0, 1]);
});

test("foliekleuren worden deterministisch in afzonderlijke CutJobs gesplitst", () => {
  const batch = createCutJobBatch(request([
    piece("white", rectangle("white", 20, 20)),
    piece("black", rectangle("black", 20, 20), { material: { code: "TEST-BLACK", foilColor: "Zwart" } }),
  ]));
  assert.equal(batch.jobs.length, 2);
  assert.deepEqual(batch.jobs.map(({ material: value }) => value.foilColor).sort(), ["Wit", "Zwart"]);
});

test("dubbele contouren en dubbele snijlijnen worden gedetecteerd", () => {
  const first = rectangle("first", 20, 20);
  const second = { ...rectangle("second", 20, 20), points: [...first.points].reverse() };
  const issues = validateGeometry([first, second]).issues.map(({ code }) => code);
  assert.ok(issues.includes("DUPLICATE_CONTOUR"));
  assert.ok(issues.includes("DUPLICATE_SEGMENT"));
});

test("open en ongeldige geometrie wordt geweigerd", () => {
  const open = { id: "open", closed: false, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] };
  const invalid = rectangle("invalid", 10, 10);
  invalid.points[1].x = Number.NaN;
  assert.ok(validateGeometry([open]).issues.some(({ code }) => code === "OPEN_CONTOUR"));
  assert.ok(validateGeometry([invalid]).issues.some(({ code }) => code === "INVALID_COORDINATE"));
});

test("de content hash verandert bij gewijzigde productiegeometrie", () => {
  const [first] = createCutJobBatch(request([piece("hash", rectangle("hash", 20, 20))])).jobs;
  const [second] = createCutJobBatch(request([piece("hash", rectangle("hash", 20.025, 20))])).jobs;
  assert.notEqual(first.contentHash, second.contentHash);
  assert.equal(recomputeContentHash(first), first.contentHash);
});

test("preview en DM/PL consumeren exact dezelfde CutJob-productiegeometrie", () => {
  const [job] = createCutJobBatch(request([piece("preview", rectangle("preview", 20, 10))])).jobs;
  const preview = createProductionPreview(job);
  const parsed = parseDmpl(generateDmpl(job).content);
  assert.equal(preview.svg.match(/<path /g)?.length, job.productionGeometry.contours.length);
  assert.deepEqual(parsed.boundsMm, job.productionGeometry.boundsMm);
  assert.equal(validateDmplRoundTrip(job).passed, true);
});

test("DM/PL bevat geen druk-, snelheid-, tool-, FlexCut- of afsnijcommando's", () => {
  const [job] = createCutJobBatch(request([piece("safe", rectangle("safe", 20, 10))])).jobs;
  const output = generateDmpl(job);
  assert.doesNotMatch(output.content, /(^|\n)(BP|V\d|P\d|c|FLEX|SET)/);
  assert.equal(output.endCommandStatus, "HARDWARE_VALIDATION_REQUIRED");
  assert.equal(output.productionReady, false);
});
