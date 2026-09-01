import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SPORTPALEIS_SUPPLIED_FONT_ADMISSION } from "../src/sportpaleis/supplied-font-admission.generated.mjs";
import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { SPORTPALEIS_ASSOCIATIONS, SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { createSportpaleisProductionBootstrap, productionSourceCompatibilityMatrix } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { inspectManagedFontAdmission } from "../src/sportpaleis/managed-font-production.mjs";
import { NUMBER_GLYPH_SPACING_MM, productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
import { boundsForContours, createCutJobBatch, validateGeometry } from "../src/sportpaleis/direct-print/index.ts";

const now = new Date("2026-09-01T00:00:00.000Z");
const near = (left, right, tolerance = 0.01) => Math.abs(Number(left) - Number(right)) <= tolerance;

test("no-print eligibility verwijdert Sloeproeien en HBSA generiek en Seedorf projecteert geen onbewezen toepassingen", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const matrix = productionSourceCompatibilityMatrix(state);
  const sloeproeien = SPORTPALEIS_ASSOCIATIONS.find(({ name }) => name === "Sloeproeien");
  const hbsa = SPORTPALEIS_ASSOCIATIONS.find(({ name }) => name === "HBSA");
  const seedorf = SPORTPALEIS_ASSOCIATIONS.find(({ name }) => name === "Seedorf TDG");
  assert.deepEqual(sloeproeien.productionApplications, []);
  assert.equal(sloeproeien.productionEligibility, "NOT_APPLICABLE");
  assert.equal(matrix.some(({ association }) => association === "Sloeproeien"), false);
  assert.deepEqual(hbsa.productionApplications, []);
  assert.equal(hbsa.productionEligibility, "NOT_APPLICABLE");
  assert.equal(hbsa.fontProfile, "Niet van toepassing");
  assert.equal(matrix.some(({ association }) => association === "HBSA"), false);
  assert.equal(seedorf.fontProfile, "Spain");
  assert.deepEqual(seedorf.productionApplications, []);
  assert.equal(matrix.some(({ association }) => association === "Seedorf TDG"), false);
});

test("alle aangeleverde fonts doorlopen admission; Viking blijft intake-evidence maar is geen HBSA-requirement", async () => {
  assert.equal(SPORTPALEIS_SUPPLIED_FONT_ADMISSION.length, 12);
  assert.equal(SPORTPALEIS_SUPPLIED_FONT_ADMISSION.filter(({ status }) => status === "PRODUCTION_EXECUTABLE").length, 11);
  assert.deepEqual(SPORTPALEIS_SUPPLIED_FONT_ADMISSION.filter(({ status }) => status === "REJECTED").map(({ filename, code }) => ({ filename, code })), [{ filename: "VIKING-N.TTF", code: "PRODUCTION_FONT_GEOMETRY_INVALID" }]);
  for (const proof of SPORTPALEIS_SUPPLIED_FONT_ADMISSION.filter(({ status }) => status === "PRODUCTION_EXECUTABLE")) {
    const bytes = await readFile(new URL(`../public/assets/organizations/sportpaleis/fonts/${proof.filename}`, import.meta.url));
    const repeated = inspectManagedFontAdmission(bytes, { representativeValues: ["MW", "VAN DER MEER", "34"] });
    assert.equal(repeated.sourceSha256, proof.sourceSha256, proof.filename);
    assert.equal(repeated.executabilitySha256, proof.executabilitySha256, proof.filename);
  }
  const authoritative = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.filter(({ originalFilename }) => ["Schluber.otf", "MyriadPro-It.otf", "MyriadPro-Bold.otf", "Premier League Font 2018.ttf"].includes(originalFilename));
  assert.equal(authoritative.length, 4);
  assert.ok(authoritative.every(({ admission }) => admission.lifecycle === "AUTHORITATIVE" && admission.stages.includes("PRODUCTION_EXECUTABLE") && admission.stages.includes("PREVIEWED")));
});

test("Pioneers provenance bewaart immutable origineel en gebruikt exact tien gededupliceerde 200-mm glyphs", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const asset = state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "pioneers-rug-senior-200");
  const source = state.productionAssetSources.find(({ id }) => id === asset.sourceId);
  assert.equal(source.original.sha256, "FD6716E5911EB5AB239D291808DC490ECF305FD3F30C49E183AB063097C67143");
  assert.equal(source.normalized.sha256, "5CC303321ADCB7BF9F0722E6BDFE8CCAD6BBABA28139AF77DB08CA3C478BD709");
  assert.equal(source.conversion.derivedFromSha256, source.original.sha256);
  assert.equal(source.conversion.normalizedSha256, source.normalized.sha256);
  assert.equal(source.inspection.originalCandidateCount, 12);
  assert.equal(source.inspection.normalizedCandidateCount, 10);
  assert.equal(source.conversion.normalization.removedCompositeObjects.length, 2);
  assert.equal(Object.keys(asset.numberGlyphs).sort().join(""), "0123456789");
  assert.ok(Object.values(asset.numberGlyphs).every(({ heightUnits }) => near(heightUnits, 200)));
  assert.equal(asset.numberComposition.freeContourSpacingMm, 5);
  assert.equal(asset.sizePolicy.heightFixed, true);
  assert.equal(asset.sizePolicy.widthDerived, true);
  assert.equal(asset.sizePolicy.defaultWidthMm, 0);
});

test("dubbele rugnummers 10, 17, 22 en 28 behouden per glyph 200 mm hoogte, aspect ratio en exact 5 mm contourafstand", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const assets = state.productionElements.filter(({ lifecycleStatus, applications }) => lifecycleStatus === "PRODUCTION_READY" && applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && /rug|shirt/iu.test(placement)));
  assert.ok(assets.length >= 2);
  assert.equal(NUMBER_GLYPH_SPACING_MM, 5);
  for (const asset of assets) for (const value of ["10", "17", "22", "28"]) {
    const piece = productionAssetPiece({ asset, variant: asset.variants[0], line: { id: `line-${value}`, content: value, widthMm: 0, heightMm: 200, preview: { label: value } }, order: { id: "ASSURANCE", association: asset.contexts[0]?.label ?? "Sportpaleis", items: [] }, foilColor: "Wit" });
    const digitBounds = [];
    let cursor = 0;
    for (const digit of value) {
      const glyph = asset.numberGlyphs[digit];
      const contours = piece.contours.slice(cursor, cursor + glyph.contours.length);
      cursor += glyph.contours.length;
      const produced = boundsForContours(contours);
      digitBounds.push(produced);
      assert.ok(near(produced.height, SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM), `${asset.id}:${value}:${digit}:height`);
      assert.ok(near(produced.width, glyph.widthUnits / glyph.heightUnits * 200), `${asset.id}:${value}:${digit}:ratio`);
    }
    assert.ok(near(digitBounds[1].minX - digitBounds[0].maxX, 5), `${asset.id}:${value}:spacing`);
    assert.ok(near(piece.requestedPhysicalSizeMm.widthMm, digitBounds[0].width + 5 + digitBounds[1].width), `${asset.id}:${value}:width`);
    assert.equal(validateGeometry(piece.contours).valid, true, `${asset.id}:${value}:geometry`);
    const batch = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: `DOUBLE-${asset.id}-${value}`, revision: 1, attemptIdPrefix: "product-truth-double", createdAt: now.toISOString(), pieces: [piece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } });
    assert.equal(batch.jobs.length, 1, `${asset.id}:${value}:job-count`);
    assert.equal(batch.jobs[0].readyForPrinting, true, `${asset.id}:${value}:ready`);
    assert.equal(batch.jobs[0].nesting.scaleApplied, 1, `${asset.id}:${value}:scale`);
  }
});

test("alle actuele rugnummerprofielen zijn 200 mm en hockeynummertruth blijft van letters gescheiden", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const matrix = productionSourceCompatibilityMatrix(state);
  for (const profile of state.productionProfiles.filter(({ supports }) => supports?.includes("backNumber"))) {
    assert.equal(profile.backNumberSizeClasses.SENIOR.physicalHeightMm, 200, profile.id);
    assert.equal(profile.backNumberSizeClasses.JUNIOR.physicalHeightMm, 200, profile.id);
  }
  for (const association of ["MHC Lelystad", "Almeerse Hockeyclub", "Buitenhout MHC"]) {
    const backNumber = matrix.find((row) => row.association === association && row.application === "backNumber");
    assert.equal(backNumber?.readiness, "VALID", association);
    assert.equal(backNumber?.expectedSourceType, "VECTOR_GLYPH_SET", association);
    assert.equal(backNumber?.source?.id, "production-asset-verified-hockey-rug-200", association);
    assert.equal(matrix.some((row) => row.association === association && ["initials", "name"].includes(row.application) && row.source?.id === "production-asset-verified-hockey-rug-200"), false, association);
  }
});
