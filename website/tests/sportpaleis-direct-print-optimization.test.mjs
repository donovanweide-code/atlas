import test from "node:test";
import assert from "node:assert/strict";
import {
  contourSetsConflict,
  createColorBatchPreview,
  createCutJobBatch,
  createOfflinePrintAction,
  createWorkspaceProductionBatchContract,
  minimumContourSetDistanceMm,
} from "../src/sportpaleis/direct-print/index.ts";

const WHITE_A = { code: "HTV-WHITE-A", foilColor: "Wit" };
const WHITE_B = { code: "HTV-WHITE-B", foilColor: "  WIT " };
const BLACK = { code: "HTV-BLACK", foilColor: "Zwart" };

function rectangle(id, width, height) {
  return {
    id,
    closed: true,
    points: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
      { x: 0, y: 0 },
    ],
  };
}

function lShape(id, width, height, arm) {
  return {
    id,
    closed: true,
    points: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: arm },
      { x: arm, y: arm },
      { x: arm, y: height },
      { x: 0, y: height },
      { x: 0, y: 0 },
    ],
  };
}

function object(id, width, height, options = {}) {
  return {
    id,
    label: options.label ?? id,
    sourceOrderId: options.sourceOrderId ?? `ORDER-${id}`,
    product: options.product ?? "Testbedrukking",
    printType: options.printType ?? "rugnummer",
    association: options.association ?? "Vereniging A",
    requestedPhysicalSizeMm: options.requestedPhysicalSizeMm ?? { widthMm: width, heightMm: height },
    vectorProfile: options.vectorProfile ?? "Profiel A",
    material: options.material ?? WHITE_A,
    contours: [options.contour ?? rectangle(`contour-${id}`, width, height)],
    productionRule: {
      mirror: options.mirror ?? false,
      rotation: options.rotation ?? 0,
      allowedNestingRotations: options.allowedNestingRotations ?? [0],
    },
  };
}

function plan(pieces, overrides = {}) {
  return createCutJobBatch({
    organizationId: "sport-2000-sportpaleis-bv",
    orderId: overrides.orderId ?? "MIXED-PRODUCTION-001",
    revision: 1,
    attemptIdPrefix: "optimization-004",
    createdAt: "2026-08-07T12:00:00.000Z",
    pieces,
    nesting: {
      absoluteMaxWidthMm: 450,
      preferredWorkingWidthMm: overrides.preferredWorkingWidthMm ?? 440,
      minimumCutGapMm: overrides.minimumCutGapMm ?? 5,
      edgeMarginMm: overrides.edgeMarginMm ?? 0,
      ...(overrides.maxJobLengthMm ? { maxJobLengthMm: overrides.maxJobLengthMm } : {}),
    },
  });
}

test("dezelfde foliekleur combineert verenigingen, materiaalcodes, lettertypes, maten en ordertypes", () => {
  const result = plan([
    object("initialen", 28, 20, {
      association: "Buitenhout",
      sourceOrderId: "ORDER-INITIALEN",
      printType: "initialen",
      vectorProfile: "Condensed Initials",
      material: WHITE_A,
    }),
    object("rugnummer", 120, 200, {
      association: "Pioneers",
      sourceOrderId: "ORDER-RUGNUMMER",
      printType: "rugnummer",
      vectorProfile: "Pioneers Number Profile",
      material: WHITE_B,
    }),
    object("naamregel", 180, 28, {
      association: "Andere vereniging",
      sourceOrderId: "ORDER-NAAM",
      printType: "naam",
      vectorProfile: "Naamfont B",
      material: WHITE_A,
    }),
  ]);
  assert.equal(result.batches.length, 1);
  assert.equal(result.batches[0].foilColor, "Wit");
  assert.deepEqual(result.batches[0].materialCodes, ["HTV-WHITE-A", "HTV-WHITE-B"]);
  assert.deepEqual(new Set(result.jobs.flatMap((job) =>
    job.productionGeometry.groups.map(({ provenance }) => provenance.sourceOrderId))), new Set([
    "ORDER-INITIALEN", "ORDER-RUGNUMMER", "ORDER-NAAM",
  ]));
  const inputsById = new Map(result.batches[0].objectIds.map((id) => [id, result.jobs
    .flatMap(({ productionGeometry }) => productionGeometry.groups)
    .find(({ sourcePieceId }) => sourcePieceId === id)?.provenance]));
  assert.equal(inputsById.get("initialen")?.association, "Buitenhout");
  assert.equal(inputsById.get("initialen")?.printType, "initialen");
  assert.equal(inputsById.get("initialen")?.vectorProfile, "Condensed Initials");
  assert.deepEqual(inputsById.get("rugnummer")?.requestedPhysicalSizeMm, { widthMm: 120, heightMm: 200 });
  assert.equal(inputsById.get("rugnummer")?.material.code, "HTV-WHITE-B");
  assert.equal(inputsById.get("naamregel")?.mirror, false);
  assert.deepEqual(inputsById.get("naamregel")?.allowedNestingRotations, [0]);
});

test("verschillende foliekleuren komen nooit in dezelfde CutBatch of fysieke CutJob", () => {
  const result = plan([
    object("white", 20, 20, { material: WHITE_A }),
    object("black", 20, 20, { material: BLACK }),
  ]);
  assert.equal(result.batches.length, 2);
  for (const batch of result.batches) {
    assert.ok(batch.jobs.every((job) => job.material.foilColor === batch.foilColor));
    assert.ok(batch.jobs.every((job) => job.productionGeometry.groups.every((group) =>
      group.provenance.material.foilColor.trim().toLocaleLowerCase("nl-NL")
        === batch.foilColor.trim().toLocaleLowerCase("nl-NL"))));
  }
});

test("nesting behoudt de fysieke objectmaat exact en schaalt nooit", () => {
  const inputs = [
    object("fixed", 37.5, 82.5, { mirror: true }),
    object("rotatable", 190, 100, { allowedNestingRotations: [0, 90] }),
  ];
  const result = plan(inputs);
  for (const group of result.jobs.flatMap((job) => job.productionGeometry.groups)) {
    const sourceSides = [group.sourceBoundsMm.width, group.sourceBoundsMm.height].sort((a, b) => a - b);
    const outputSides = [group.boundsMm.width, group.boundsMm.height].sort((a, b) => a - b);
    assert.deepEqual(outputSides, sourceSides);
  }
  assert.ok(result.jobs.every((job) => job.nesting.scaleApplied === 1));
});

test("minimumCutGapMm wordt gerespecteerd en onafhankelijke contouren overlappen niet", () => {
  const minimumCutGapMm = 7.5;
  const [job] = plan([
    object("left", 100, 60),
    object("right", 100, 60),
    object("l-vorm", 80, 80, { contour: lShape("l-vorm-contour", 80, 80, 25) }),
  ], { minimumCutGapMm }).jobs;
  const groups = job.productionGeometry.groups;
  for (let left = 0; left < groups.length; left += 1) {
    for (let right = left + 1; right < groups.length; right += 1) {
      assert.equal(contourSetsConflict(groups[left].contours, groups[right].contours, 0), false);
      assert.ok(minimumContourSetDistanceMm(groups[left].contours, groups[right].contours) >= minimumCutGapMm - 0.000_001);
    }
  }
});

test("verbeterde nesting gebruikt aantoonbaar niet meer folie dan de shelf-baseline", () => {
  const batch = plan([
    object("wide", 260, 100),
    object("rotatable", 190, 100, { allowedNestingRotations: [0, 90] }),
  ], { preferredWorkingWidthMm: 450, minimumCutGapMm: 5 }).batches[0];
  assert.ok(batch.efficiency.usedFoilLengthMm <= batch.jobs[0].nesting.baselineUsedLengthMm);
  assert.ok(batch.efficiency.savedLengthVsBaselineMm > 0);
  assert.ok(batch.jobs.some((job) => job.productionGeometry.groups.some((group) =>
    group.nestingRotationApplied === 90)));
});

test("output is deterministisch en blijft binnen de absolute 450 mm zonder autoscale", () => {
  const pieces = [
    object("small-initials", 30, 18),
    object("large-number", 180, 260, { allowedNestingRotations: [0, 90] }),
    object("name-line", 210, 24),
    object("different-shape", 70, 85, { contour: lShape("different-shape-contour", 70, 85, 20) }),
  ];
  const first = plan(pieces);
  const second = plan(pieces);
  assert.deepEqual(first, second);
  assert.ok(first.jobs.every((job) => job.nesting.usedWidthMm <= 450));
  assert.ok(first.jobs.every((job) => job.nesting.scaleApplied === 1));
});

test("een te breed object wordt alleen via expliciet toegestane rotatie passend of anders geweigerd", () => {
  assert.throws(() => plan([object("too-wide", 450.025, 20)]), /wordt niet geschaald/);
  const [rotated] = plan([object("allowed", 450.025, 20, { allowedNestingRotations: [90] })]).jobs;
  assert.equal(rotated.productionGeometry.groups[0].nestingRotationApplied, 90);
  assert.ok(rotated.nesting.usedWidthMm <= 450);
});

test("batchsplit behoudt ieder object en alle provenance exact één keer", () => {
  const pieces = [
    object("split-a", 230, 90, { sourceOrderId: "ORDER-A" }),
    object("split-b", 230, 90, { sourceOrderId: "ORDER-B" }),
    object("split-c", 230, 90, { sourceOrderId: "ORDER-C" }),
  ];
  const batch = plan(pieces, { maximum: 1, maxJobLengthMm: 100 }).batches[0];
  assert.equal(batch.jobs.length, 3);
  assert.deepEqual(batch.objectIds, pieces.map(({ id }) => id));
  const ids = batch.jobs.flatMap((job) =>
    job.productionGeometry.groups.map(({ provenance }) => provenance.sourceObjectId));
  assert.deepEqual(ids.sort(), pieces.map(({ id }) => id).sort());
  assert.equal(new Set(ids).size, pieces.length);
});

test("preview en Workspace-contract tonen medewerkerdata en blokkeren offline hardware-send", () => {
  const batch = plan([
    object("initialen", 28, 20, { printType: "initialen" }),
    object("naam", 160, 25, { printType: "naam" }),
  ]).batches[0];
  const preview = createColorBatchPreview(batch);
  assert.equal(preview.objectCount, 2);
  assert.equal(preview.foilColor, "Wit");
  assert.ok(preview.estimatedFoilLengthMm > 0);
  assert.doesNotMatch(JSON.stringify(preview), /DM\/PL|PIPE01|WriteFile/);

  const workspace = createWorkspaceProductionBatchContract(batch);
  assert.equal(workspace.readiness.status, "READY_FOR_PRINTING");
  assert.equal(workspace.summaStatus, "HARDWARE_VALIDATION_REQUIRED");
  const action = createOfflinePrintAction({
    cutBatchId: batch.cutBatchId,
    requestedBy: "medewerker-001",
    requestedAt: "2026-08-07T12:00:00.000Z",
    confirmation: "PRINT",
  });
  assert.equal(action.hardwareSendEnabled, false);
  assert.equal(action.accepted, false);
  assert.equal(action.reason, "HARDWARE_SEND_NOT_IMPLEMENTED");
});

test("efficiency-metrics zijn volledig en intern consistent", () => {
  const metrics = plan([
    object("one", 100, 50),
    object("two", 80, 40),
  ]).batches[0].efficiency;
  assert.ok(metrics.totalBoundingAreaMm2 > 0);
  assert.ok(metrics.totalContourAreaMm2 > 0);
  assert.ok(metrics.usedProductionAreaMm2 >= metrics.totalBoundingAreaMm2);
  assert.equal(metrics.wastedAreaMm2, metrics.estimatedFoilAreaMm2 - metrics.totalBoundingAreaMm2);
  assert.ok(metrics.efficiencyPercent > 0 && metrics.efficiencyPercent <= 100);
  assert.ok(metrics.wastedLengthIndicatorMm >= 0);
});
