import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { assertAuthoritativeProductionAssetBytes, authoritativeProductionAssetById } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { createSportpaleisProductionBootstrap, productionSourceAssociationDecision, productionSourceCompatibilityMatrix } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createManagedFontProductionPiece, inspectManagedFontAdmission } from "../src/sportpaleis/managed-font-production.mjs";
import { inspectProductionAssetSource, productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
import { availableProductionSourceIdentities, productionPieceFromSource, productionSourceByIdentity } from "../src/sportpaleis/production-sources.ts";
import { createCutJobBatch, createProductionPreview, stableJson } from "../src/sportpaleis/direct-print/index.ts";

const now = "2026-09-01T00:00:00.000Z";
const nesting = { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 };
const hash = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sameMm = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.001;

function outputProof(piece, key) {
  assert.ok(piece.contours.length > 0 && piece.contours.every(({ closed, points }) => closed && points.length >= 4), key);
  assert.equal(piece.productionRule.mirror, true, key);
  const batch = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: "ASSURANCE-" + hash(key).slice(0, 12), revision: 1, attemptIdPrefix: "source-assurance", createdAt: now, pieces: [piece], nesting });
  assert.equal(batch.jobs.length, 1, key);
  const job = batch.jobs[0];
  const preview = createProductionPreview(job);
  assert.equal(job.readyForPrinting, true, key);
  assert.equal(job.nesting.scaleApplied, 1, key);
  assert.equal(job.productionGeometry.groups[0].mirrorApplied, true, key);
  assert.equal(preview.ready, true, key);
  assert.match(preview.svg, /^<svg[^]*data-contour-id=/u, key);
  return { geometry: hash(stableJson(piece.contours)), output: hash(preview.svg), width: piece.requestedPhysicalSizeMm.widthMm, height: piece.requestedPhysicalSizeMm.heightMm, contours: piece.contours.length };
}

function deterministic(pieceFactory, row) {
  const firstPiece = pieceFactory();
  const secondPiece = pieceFactory();
  assert.equal(stableJson(secondPiece.contours), stableJson(firstPiece.contours), row.key);
  assert.ok(sameMm(firstPiece.requestedPhysicalSizeMm.heightMm, row.physicalHeightMm), row.key);
  const first = outputProof(firstPiece, row.key);
  assert.deepEqual(outputProof(secondPiece, row.key), first, row.key);
  return first;
}

test("iedere huidige VALID association/source-combinatie executeert exacte bytes tot deterministische 1:1 SVG-contouroutput", async (context) => {
  const state = createSportpaleisProductionBootstrap(new Date(now));
  const matrix = productionSourceCompatibilityMatrix(state);
  const rows = matrix.filter(({ readiness }) => readiness === "VALID");
  const fontCache = new Map();
  const vectorCache = new Map();
  const proofs = [];
  for (const row of rows) {
    let pieceFactory;
    let byteIdentity;
    if (row.expectedSourceType === "MANAGED_FONT") {
      const font = state.productionFonts.find(({ id, version, sha256 }) => id === row.source.id && version === row.source.version && sha256 === row.source.sha256);
      assert.ok(font, row.key);
      let cached = fontCache.get(font.id);
      if (!cached) {
        const registry = authoritativeProductionAssetById(font.id);
        const bytes = await readFile(new URL("../" + registry.sourcePath, import.meta.url));
        const source = assertAuthoritativeProductionAssetBytes(registry, bytes);
        const inspection = inspectManagedFontAdmission(bytes, { representativeValues: ["MW", "VAN DER MEER", "34"] });
        for (const field of ["familyName", "subfamilyName", "fullName", "postscriptName", "unitsPerEm", "glyphCount"]) assert.equal(inspection.metadata[field], registry.admission.metadata[field], font.id + ":" + field);
        assert.equal(inspection.executabilitySha256, registry.admission.executabilitySha256, font.id);
        cached = { bytes, source, inspection };
        fontCache.set(font.id, cached);
      }
      assert.equal(productionSourceAssociationDecision(state, { associationId: row.associationId, profileId: row.profileId, applicationField: row.application, candidate: row.source }).allowed, true, row.key);
      pieceFactory = () => createManagedFontProductionPiece({ fontRecord: font, bytes: cached.bytes, content: row.representativeValue, widthMm: 430, heightMm: row.physicalHeightMm, id: "font-" + hash(row.key).slice(0, 12), sourceOrderId: "ASSURANCE", product: "Assurance", association: row.association, foilColor: "Wit" });
      byteIdentity = { bytes: cached.bytes.length, sha256: cached.source.sha256, internalIdentity: cached.inspection.metadata };
    } else if (row.expectedSourceType === "VECTOR_GLYPH_SET") {
      const asset = state.productionElements.find(({ id }) => id === row.source.id);
      assert.ok(asset && (asset.version ?? String(asset.revision)) === row.source.version, row.key);
      let cached = vectorCache.get(asset.id);
      if (!cached) {
        const source = state.productionAssetSources.find(({ id }) => id === asset.sourceId);
        const immutableBytes = Buffer.from(source.original.dataBase64, "base64");
        const productionSource = source.normalized ?? source.original;
        const bytes = Buffer.from(productionSource.dataBase64, "base64");
        assert.equal(immutableBytes.length, source.original.sizeBytes, row.key);
        assert.equal(hash(immutableBytes), source.original.sha256, row.key);
        assert.equal(bytes.length, productionSource.sizeBytes, row.key);
        assert.equal(hash(bytes), productionSource.sha256, row.key);
        assert.equal(productionSource.sha256, asset.sourceLayers.vectorSource.sha256, row.key);
        const parsed = await inspectProductionAssetSource({ bytes, filename: productionSource.filename, mimeType: productionSource.mimeType, intakeKind: "NUMBER_SET" });
        assert.equal(parsed.source.sha256, productionSource.sha256, row.key);
        assert.equal(Object.keys(asset.numberGlyphs ?? {}).sort().join(""), "0123456789", row.key);
        cached = { source, bytes, parsed };
        vectorCache.set(asset.id, cached);
      }
      if (row.profileId) assert.equal(productionSourceAssociationDecision(state, { associationId: row.associationId, profileId: row.profileId, applicationField: row.application, candidate: row.source }).allowed, true, row.key);
      const variant = asset.variants.find(({ heightMm }) => Number(heightMm) > 0);
      const line = { id: "vector-" + hash(row.key).slice(0, 12), content: row.representativeValue, widthMm: 0, heightMm: row.physicalHeightMm, preview: { label: row.application } };
      const order = { id: "ASSURANCE", association: row.association, items: [] };
      pieceFactory = () => productionAssetPiece({ asset, variant, line, order, foilColor: "Wit" });
      byteIdentity = { bytes: cached.bytes.length, originalSha256: cached.source.original.sha256, productionSha256: (cached.source.normalized ?? cached.source.original).sha256, geometrySha256: asset.controlledVector.geometryHash, parsedCandidates: cached.parsed.candidates.length, glyphs: 10 };
    } else {
      const identity = availableProductionSourceIdentities().find(({ sourceSetId, content, heightMm }) => sourceSetId === row.source.id && content === row.representativeValue && sameMm(heightMm, row.physicalHeightMm));
      const source = identity && productionSourceByIdentity(identity.id, identity.version);
      assert.ok(source, row.key);
      assert.equal(productionSourceAssociationDecision(state, { associationId: row.associationId, profileId: row.profileId, applicationField: row.application, candidate: { kind: "VERIFIED_PRODUCTION_SOURCE_SET", id: row.source.id, version: identity.version } }).allowed, true, row.key);
      pieceFactory = () => productionPieceFromSource(source, { id: "set-" + hash(row.key).slice(0, 12), sourceOrderId: "ASSURANCE", label: row.application, product: "Assurance" });
      byteIdentity = identity;
    }
    proofs.push({ key: row.key, sourceType: row.expectedSourceType, representativeValue: row.representativeValue, heightMm: row.physicalHeightMm, byteIdentity, output: deterministic(pieceFactory, row) });
  }
  assert.equal(proofs.length, rows.length);
  assert.equal(new Set(proofs.map(({ key }) => key)).size, rows.length);
  assert.ok(proofs.every(({ output }) => output.contours > 0 && output.geometry && output.output));
  const byType = Object.fromEntries(
    [...new Set(proofs.map(({ sourceType }) => sourceType))].map((type) => [
      type,
      proofs.filter(({ sourceType }) => sourceType === type).length,
    ]),
  );
  context.diagnostic(JSON.stringify({ matrixRows: matrix.length, pass: proofs.length, blocked: matrix.length - proofs.length, notProven: 0, byType, physicalChain: "HUMAN_PHYSICAL_PROOF_REQUIRED" }));
});

test("de algemene 200-mm-regel en no-print eligibility verwijderen kunstmatige maat- en bronblokkades", () => {
  const matrix = productionSourceCompatibilityMatrix(createSportpaleisProductionBootstrap(new Date(now)));
  const physical = matrix.filter(({ code }) => code === "PRODUCTION_PHYSICAL_SIZE_UNPROVEN");
  const sourceFiles = matrix.filter(({ readiness, source, code }) => readiness === "BLOCKED" && !source && code !== "PRODUCTION_PHYSICAL_SIZE_UNPROVEN");
  assert.equal(physical.length, 0);
  assert.deepEqual(sourceFiles, []);
  assert.ok(matrix.every(({ readiness }) => readiness === "VALID"));
  assert.equal(matrix.some(({ association }) => association === "HBSA"), false);
});

test("alle vier actuele SVG-nummersetbronnen blijven exact software-uitvoerbaar; superseded 160 mm blijft alleen evidence", async (context) => {
  const state = createSportpaleisProductionBootstrap(new Date(now));
  const matrix = productionSourceCompatibilityMatrix(state);
  const proofs = [];
  for (const asset of state.productionElements.filter(({ lifecycleStatus }) => lifecycleStatus === "PRODUCTION_READY")) {
    const source = state.productionAssetSources.find(({ id }) => id === asset.sourceId);
    assert.ok(source, asset.id);
    const productionSource = source.normalized ?? source.original;
    const bytes = Buffer.from(productionSource.dataBase64, "base64");
    assert.equal(bytes.length, productionSource.sizeBytes, asset.id);
    assert.equal(hash(bytes), productionSource.sha256, asset.id);
    assert.equal(productionSource.sha256, asset.sourceLayers.vectorSource.sha256, asset.id);
    const parsed = await inspectProductionAssetSource({ bytes, filename: productionSource.filename, mimeType: productionSource.mimeType, intakeKind: "NUMBER_SET" });
    assert.equal(parsed.source.sha256, productionSource.sha256, asset.id);
    assert.equal(Object.keys(asset.numberGlyphs ?? {}).sort().join(""), "0123456789", asset.id);
    const variant = asset.variants.find(({ heightMm }) => Number(heightMm) > 0);
    const row = { key: asset.id, physicalHeightMm: variant.heightMm };
    const line = { id: `source-${asset.id}`, content: "34", widthMm: 0, heightMm: variant.heightMm, preview: { label: asset.name } };
    const factory = () => productionAssetPiece({ asset, variant, line, order: { id: "ASSURANCE-SOURCE", association: asset.contexts.find(({ type }) => type === "ASSOCIATION")?.label ?? "Generic", items: [] }, foilColor: "Wit" });
    proofs.push({ id: asset.id, originalSha256: source.original.sha256, productionSha256: productionSource.sha256, geometrySha256: asset.controlledVector.geometryHash, output: deterministic(factory, row) });
  }
  assert.equal(proofs.length, 4);
  assert.equal(state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "pioneers-rug-junior-160")?.lifecycleStatus, "SUPERSEDED_BY_PRODUCT_TRUTH_200MM");
  const nonCanonical = matrix.filter(({ code }) => code === "PRODUCTION_ASSET_NOT_CANONICAL_ASSOCIATION_SOURCE");
  assert.equal(nonCanonical.length, 0);
  assert.ok(nonCanonical.every(({ readiness, softwareReadiness }) => readiness === "BLOCKED" && softwareReadiness === "EXECUTABLE"));
  context.diagnostic(JSON.stringify({ exactSvgSources: proofs.length, associationBlocked: nonCanonical.length, softwareExecutable: proofs.length }));
});

test("medewerkerherstel blijft rolveilig en Vrije opdruk verzoent bronkeuze met het gekozen type", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const remediation = workspace.slice(workspace.indexOf("function productionAttentionGuidance"), workspace.indexOf("function orderProductDefinition"));
  const freePrinting = workspace.slice(workspace.indexOf("function freePrintingOrder"), workspace.indexOf("function productionFonts"));
  const inputHandler = workspace;
  assert.match(remediation, /state\.currentUser\.role === "store"[^]*Open order en deel het ordernummer met Productie[^]*orders\/\$\{encodeURIComponent\(order\.id\)\}#productieherstel/u);
  assert.match(freePrinting, /if \(!fonts\.length && !visualAssets\.length\)/u);
  assert.match(inputHandler, /freeProductionSourceChoices\(state, line\)[^]*if \(!choices\.some\(\(\{ id \}\) => id === line\.fontId\)\) line\.fontId = choices\[0\]\?\.id \?\? ""/u);
  assert.match(inputHandler, /field === "content"[^]*freeProductionSourceChoices\(state, line\)[^]*line\.fontId = choices\[0\]\?\.id \?\? ""/u);
});
