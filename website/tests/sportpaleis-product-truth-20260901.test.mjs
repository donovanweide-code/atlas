import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SPORTPALEIS_SUPPLIED_FONT_ADMISSION } from "../src/sportpaleis/supplied-font-admission.generated.mjs";
import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { SPORTPALEIS_ASSOCIATIONS, SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM, SPORTPALEIS_WATERWIJK_BACK_NUMBER_HEIGHT_MM } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { createSportpaleisProductionBootstrap, productionSourceCompatibilityMatrix, resolveCanonicalProductionLines } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { inspectManagedFontAdmission } from "../src/sportpaleis/managed-font-production.mjs";
import { NUMBER_GLYPH_SPACING_MM, PIONEERS_NUMBER_GLYPH_SPACING_MM, productionAssetPiece, productionAssetPieces } from "../src/sportpaleis/production-assets.mjs";
import { boundsForContours, createCutJobBatch, groupSemanticNumberObjects, validateGeometry } from "../src/sportpaleis/direct-print/index.ts";

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

test("standaard dubbele nummers gebruiken 18 mm contourafstand en uitsluitend Pioneers gebruikt 5 mm", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const assets = state.productionElements.filter(({ lifecycleStatus, applications }) => lifecycleStatus === "PRODUCTION_READY" && applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && /rug|shirt/iu.test(placement)));
  assert.ok(assets.length >= 2);
  assert.equal(NUMBER_GLYPH_SPACING_MM, 18);
  for (const asset of assets) for (const value of ["10", "11", "17", "22", "23", "28", "44", "67", "87"]) {
    const expectedSpacingMm = asset.verifiedSourceKey === "pioneers-rug-senior-200" ? PIONEERS_NUMBER_GLYPH_SPACING_MM : NUMBER_GLYPH_SPACING_MM;
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
    assert.ok(near(digitBounds[1].minX - digitBounds[0].maxX, expectedSpacingMm), `${asset.id}:${value}:spacing`);
    assert.ok(near(piece.requestedPhysicalSizeMm.widthMm, digitBounds[0].width + expectedSpacingMm + digitBounds[1].width), `${asset.id}:${value}:width`);
    const grouped = groupSemanticNumberObjects(productionAssetPieces({ asset, variant: asset.variants[0], line: { id: `group-${value}`, content: value, widthMm: 0, heightMm: 200, preview: { label: value } }, order: { id: "ASSURANCE", association: asset.contexts[0]?.label ?? "Sportpaleis", items: [] }, foilColor: "Wit" }));
    const members = grouped[0].semanticGroup.physicalMembers;
    assert.ok(near(members[1].relativePlacementMm.x - members[0].sourceBoundsMm.width, expectedSpacingMm), `${asset.id}:${value}:final-group-spacing`);
    assert.equal(validateGeometry(piece.contours).valid, true, `${asset.id}:${value}:geometry`);
    const batch = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: `DOUBLE-${asset.id}-${value}`, revision: 1, attemptIdPrefix: "product-truth-double", createdAt: now.toISOString(), pieces: [piece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } });
    assert.equal(batch.jobs.length, 1, `${asset.id}:${value}:job-count`);
    assert.equal(batch.jobs[0].readyForPrinting, true, `${asset.id}:${value}:ready`);
    assert.equal(batch.jobs[0].nesting.scaleApplied, 1, `${asset.id}:${value}:scale`);
  }
});

test("Waterwijk gebruikt 220/200 mm zonder hockey- of andere clubregels te wijzigen", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const matrix = productionSourceCompatibilityMatrix(state);
  for (const profile of state.productionProfiles.filter(({ supports }) => supports?.includes("backNumber"))) {
    const waterwijk = ["profile-shirt", "profile-keeper", "profile-shirt-home", "profile-shirt-standard", "profile-source-a-s-c-waterwijk-backNumber"].includes(profile.id);
    assert.equal(profile.backNumberSizeClasses.SENIOR.physicalHeightMm, waterwijk ? SPORTPALEIS_WATERWIJK_BACK_NUMBER_HEIGHT_MM.SENIOR : 200, profile.id);
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

test("Waterwijk wedstrijdshirt en -short projecteren Spain; overige items blijven Schluber", () => {
  const state = createSportpaleisProductionBootstrap(now);
  const article = (pattern) => state.articles.find(({ association, name, active }) => active && association === "A.S.C. Waterwijk" && pattern.test(name));
  const shirt = article(/WEDSTRIJD SHIRT SELECTIE/iu);
  const shorts = article(/WEDSTRIJD SHORT/iu);
  const training = article(/TRAINING SHIRT/iu);
  assert.equal(shirt.profileId, "profile-shirt-home");
  assert.equal(shorts.profileId, "profile-shorts-home");
  assert.notEqual(training.profileId, "profile-shirt-home");
  const values = (overrides) => ({ initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "", ...overrides });
  const item = (id, candidate, size, personalizationValues) => ({ id, articleNumber: candidate.articleNumber, association: candidate.association, productionProfileId: candidate.profileId, sourceProvenance: "gerichte Waterwijk Product Truth-test", foilColor: "Wit", variants: [{ id: `${id}-variant`, size, quantity: 1, personalizationValues, ...(personalizationValues.backNumber ? { backNumberProduction: { status: "SOURCE_CONFIGURED", sizeClass: personalizationValues.backNumberSizeClass, physicalHeightMm: personalizationValues.backNumberSizeClass === "SENIOR" ? 220 : 200, source: "Waterwijk Product Truth" } } : {}) }] });
  const lines = resolveCanonicalProductionLines(state, "WATERWIJK-TRUTH", [
    item("shirt-senior", shirt, "L", values({ backNumber: "12", backNumberSizeClass: "SENIOR" })),
    item("shirt-junior", shirt, "152", values({ backNumber: "17", backNumberSizeClass: "JUNIOR" })),
    item("short", shorts, "L", values({ shortsNumber: "24" })),
    item("training", training, "L", values({ initials: "AB" })),
  ]);
  const fontName = (line) => state.productionFonts.find(({ id }) => id === line.source.id)?.name;
  const senior = lines.find(({ itemId }) => itemId === "shirt-senior");
  const junior = lines.find(({ itemId }) => itemId === "shirt-junior");
  const short = lines.find(({ itemId }) => itemId === "short");
  const other = lines.find(({ itemId }) => itemId === "training");
  assert.equal(fontName(senior), "Spain Euro 2016");
  assert.equal(fontName(junior), "Spain Euro 2016");
  assert.equal(fontName(short), "Spain Euro 2016");
  assert.equal(fontName(other), "Schluber");
  assert.equal(senior.heightMm, 220);
  assert.equal(junior.heightMm, 200);
});
