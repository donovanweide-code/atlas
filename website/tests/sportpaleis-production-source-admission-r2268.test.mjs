import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { createSportpaleisProductionBootstrap } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { inspectManagedFontAdmission } from "../src/sportpaleis/managed-font-production.mjs";
import { executableProductionAssetDecision, productionAssetReuseDecision, productionFontExecutableDecision, proportionalProductionAssetSize } from "../src/sportpaleis/production-practice-contract.mjs";

const stages = ["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "PREVIEWED", "HUMAN_CONFIRMED", "AUTHORITATIVE"];
const hash = "A".repeat(64);

function vectorAsset({ kind = "ARTWORK", placement = "BORST", admissionKind = kind, glyphs = false } = {}) {
  const applications = [{ kind, placement }];
  const asset = {
    id: "production-asset-admission",
    registrationId: "source-registration-admission",
    lifecycleStatus: "PRODUCTION_READY",
    productionMethod: "SELF_PRODUCED",
    sourceId: "production-source-admission",
    sourceSelection: { candidateIds: ["candidate-1"], selectionRef: "candidate-1", geometryHash: hash },
    controlledVector: { format: "WBD_CONTOURS_V1", geometryHash: hash, contourCount: 1, pointCount: 4, contours: [{ id: "contour-1", closed: true, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }] }] },
    sizePolicy: { mode: "PROPORTIONAL_FREE", aspectRatioLocked: true, defaultWidthMm: 100, defaultHeightMm: 50, minWidthMm: null, maxWidthMm: null },
    variants: [{ id: "variant-1", label: "Standaard", widthMm: 100, heightMm: 50, productionMode: "INTERNAL_PLOT", currentStock: null, minimumStock: null, targetStock: null }],
    applications,
    contexts: [{ type: "GENERIC", id: "generic", label: "Algemeen" }],
    sourceLayers: { visualSource: null, vectorSource: { filename: "source.svg", mimeType: "image/svg+xml", sha256: hash }, validatedCutContour: { sourceId: "production-source-admission", version: "1", sha256: hash }, physicallyProvenContour: null },
    admission: { lifecycle: "AUTHORITATIVE", sourceType: kind === "NUMBER_SET" ? "SVG_VECTOR_NUMBERSET" : "LOGO_ARTWORK", stages, applicationBindings: [{ kind: admissionKind, placement }], sourceSha256: hash, geometrySha256: hash, confirmedAt: "2026-08-31T00:00:00.000Z", confirmedBy: { userId: "admin", name: "Donovan" } },
  };
  if (glyphs) asset.numberGlyphs = Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [String(digit), { candidateId: `digit-${digit}`, geometryHash: hash, widthUnits: 10, heightUnits: 20, contours: asset.controlledVector.contours }]));
  return asset;
}

test("font admission gebruikt echte bytes, interne identity, glyphs en deterministische outlines", async () => {
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/Spain Euro 2016.ttf", import.meta.url));
  const first = inspectManagedFontAdmission(bytes, { representativeValues: ["MW", "34"] });
  const second = inspectManagedFontAdmission(bytes, { representativeValues: ["MW", "34"] });
  assert.equal(first.metadata.familyName, "Spain Euro 2016");
  assert.equal(first.metadata.postscriptName, "SpainEuro-Regular");
  assert.equal(first.executabilitySha256, second.executabilitySha256);
  assert.equal(first.representativeProofs.length, 2);
  await assert.rejects(async () => inspectManagedFontAdmission(Buffer.from("00010000-not-a-font")), (error) => error.code === "FONT_FILE_INVALID");
  assert.throws(() => inspectManagedFontAdmission(bytes, { representativeValues: ["😀"] }), (error) => error.code === "PRODUCTION_FONT_GLYPH_MISSING");
});

test("geregistreerde Spain-bron blijft executable maar filename-only of verkeerde toepassing blijft dicht", () => {
  const spain = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.find(({ id }) => id === "font-5d083befacdf98ae");
  assert.equal(productionFontExecutableDecision(spain, "shortsNumber").allowed, true);
  assert.equal(productionFontExecutableDecision({ ...spain, authority: "ADMIN_VERIFIED_UPLOAD" }, "shortsNumber").allowed, false);
  const admitted = { ...spain, authority: "ADMIN_VERIFIED_UPLOAD", admission: { lifecycle: "AUTHORITATIVE", sourceType: "FONT", stages: stages.filter((stage) => stage !== "PREVIEWED"), applicationBindings: ["name"], metadata: { familyName: "Spain Euro 2016", subfamilyName: "Regular", fullName: "Spain Euro 2016 Regular", postscriptName: "SpainEuro-Regular", unitsPerEm: 1000, glyphCount: 100 }, representativeProofs: [{ content: "MW", geometrySha256: hash, widthMm: 20, heightMm: 20 }], executabilitySha256: hash, confirmedAt: "2026-08-31T00:00:00.000Z", confirmedBy: { userId: "admin", name: "Donovan" } } };
  assert.equal(productionFontExecutableDecision(admitted, "name").allowed, true);
  assert.equal(productionFontExecutableDecision(admitted, "backNumber").code, "PRODUCTION_FONT_APPLICATION_MISMATCH");
});

test("SVG-nummerset en logo/artwork zijn alleen executable met exacte admission en toepassing", () => {
  const numberSet = vectorAsset({ kind: "NUMBER_SET", placement: "RUG", glyphs: true });
  assert.equal(executableProductionAssetDecision(numberSet).allowed, true);
  const wrongApplication = vectorAsset({ kind: "NUMBER_SET", placement: "RUG", admissionKind: "ARTWORK", glyphs: true });
  assert.equal(executableProductionAssetDecision(wrongApplication).code, "PRODUCTION_ASSET_APPLICATION_MISMATCH");
  const incompleteGlyphs = vectorAsset({ kind: "NUMBER_SET", placement: "RUG", glyphs: true });
  delete incompleteGlyphs.numberGlyphs[9];
  assert.equal(executableProductionAssetDecision(incompleteGlyphs).code, "PRODUCTION_ASSET_GLYPHS_UNPROVEN");
  const artwork = vectorAsset({ kind: "LOGO", placement: "BORST" });
  assert.equal(executableProductionAssetDecision(artwork).allowed, true);
  assert.deepEqual(proportionalProductionAssetSize({ defaultWidthMm: 100, defaultHeightMm: 50, requestedWidthMm: 60, requestedHeightMm: 999 }), { widthMm: 60, heightMm: 30 });
  assert.equal(executableProductionAssetDecision({ ...artwork, sourceLayers: { ...artwork.sourceLayers, vectorSource: { ...artwork.sourceLayers.vectorSource, sha256: "B".repeat(64) } } }).code, "PRODUCTION_ASSET_ADMISSION_INCOMPLETE");
  assert.equal(executableProductionAssetDecision({ ...artwork, admission: { ...artwork.admission, stages: artwork.admission.stages.filter((stage) => stage !== "HUMAN_CONFIRMED") } }).code, "PRODUCTION_ASSET_ADMISSION_INCOMPLETE");
  assert.equal(executableProductionAssetDecision({ ...artwork, controlledVector: { ...artwork.controlledVector, contours: [] } }).code, "PRODUCTION_ASSET_GEOMETRY_UNPROVEN");
  assert.equal(productionFontExecutableDecision(numberSet, "backNumber").allowed, false, "een SVG-nummerset is nooit een font");
  assert.equal(executableProductionAssetDecision(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS[0]).allowed, false, "een font is nooit een SVG-/artworkbron");
});

test("bestaande vectorbron is uitsluitend binnen dezelfde vereniging en nummer-toepassing herbruikbaar", () => {
  const numberSet = vectorAsset({ kind: "NUMBER_SET", placement: "Rug Senior", glyphs: true });
  numberSet.contexts = [{ type: "ASSOCIATION", id: "association-a", label: "Vereniging A" }];
  assert.equal(productionAssetReuseDecision({ asset: numberSet, targetAssociationIdentities: ["association-a", "Vereniging A"], applicationField: "backNumber" }).allowed, true);
  assert.equal(productionAssetReuseDecision({ asset: numberSet, targetAssociationIdentities: ["association-b", "Vereniging B"], applicationField: "backNumber" }).code, "PRODUCTION_ASSET_REUSE_ASSOCIATION_MISMATCH");
  assert.equal(productionAssetReuseDecision({ asset: numberSet, targetAssociationIdentities: ["association-a"], applicationField: "shortsNumber" }).code, "PRODUCTION_ASSET_REUSE_APPLICATION_MISMATCH");
});

test("alle bestaande productierijpe bootstrapbronnen blijven uitvoerbaar binnen hun bestaande contract", () => {
  const state = createSportpaleisProductionBootstrap();
  const selfProduced = state.productionElements.filter(({ lifecycleStatus, productionMethod }) => lifecycleStatus === "PRODUCTION_READY" && productionMethod === "SELF_PRODUCED");
  assert.ok(selfProduced.length > 0);
  for (const asset of selfProduced) assert.equal(executableProductionAssetDecision(asset).allowed, true, `${asset.id} blijft uitvoerbaar`);
  const spain = state.productionFonts.find(({ id }) => id === "font-5d083befacdf98ae");
  assert.equal(productionFontExecutableDecision(spain, "shortsNumber").allowed, true);
  assert.equal(spain.sha256, "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585");
});
