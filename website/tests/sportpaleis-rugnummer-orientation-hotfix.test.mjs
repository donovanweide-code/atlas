import assert from "node:assert/strict";
import test from "node:test";

import { createCutJobBatch } from "../src/sportpaleis/direct-print/index.ts";
import { productionPieceNestingRotations } from "../scripts/sportpaleis-pilot-foundation.mjs";

function backNumber(id, width, height) {
  return {
    id, label: id, sourceOrderId: `ORDER-${id}`, product: "Rugnummer", printType: "rugnummer",
    association: "Fixtureclub", requestedPhysicalSizeMm: { widthMm: width, heightMm: height },
    vectorProfile: "FIXTURE@1", nestingSection: { key: "back-numbers", label: "Rugnummers", rank: 3 },
    material: { code: "HTV-WIT", foilColor: "Wit" },
    contours: [{ id: `contour-${id}`, closed: true, points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }, { x: 0, y: 0 }] }],
    productionRule: { mirror: true, rotation: 0 },
  };
}

function job(piece) {
  const prepared = { ...piece, productionRule: { ...piece.productionRule, allowedNestingRotations: productionPieceNestingRotations(piece) } };
  return createCutJobBatch({ organizationId: "sportpaleis", orderId: piece.sourceOrderId, revision: 1, attemptIdPrefix: piece.id, createdAt: "2026-09-07T00:00:00.000Z", pieces: [prepared], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
}

test("rugnummer kiest uitsluitend de oriëntatie met de kleinste dwarsmaat", () => {
  const narrow = job(backNumber("single-1", 118, 220));
  const wide = job(backNumber("wide-12", 330, 220));
  assert.equal(narrow.productionGeometry.groups[0].nestingRotationApplied, 0);
  assert.equal(wide.productionGeometry.groups[0].nestingRotationApplied, 90);
  for (const produced of [narrow, wide]) {
    const group = produced.productionGeometry.groups[0];
    assert.equal(group.mirrorApplied, true);
    assert.deepEqual([group.sourceBoundsMm.width, group.sourceBoundsMm.height].sort((a, b) => a - b), [group.boundsMm.width, group.boundsMm.height].sort((a, b) => a - b));
    assert.equal(group.contours.length, 1);
    assert.equal(group.contours[0].points.length, 5, "oriëntatie voegt geen guide/cut-line-vectoren toe");
  }
});
