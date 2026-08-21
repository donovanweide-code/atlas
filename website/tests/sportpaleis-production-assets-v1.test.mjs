import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectProductionAssetSource, NUMBER_GLYPH_SPACING_MM, productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
import { createCutJobBatch, createProductionPreview } from "../src/sportpaleis/direct-print/index.ts";
import { buildWorkspaceSearchIndex } from "../src/workspace-search.ts";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Assets-Kevin-2026!", patrick: "Assets-Patrick-2026!", collega: "Assets-Store-2026!", "donovan-support": "Assets-Support-2026!" };

function vectorPdf(rectangles) {
  const drawing = rectangles.map(({ x, y, width, height }) => `${x} ${y} m ${x + width} ${y} l ${x + width} ${y + height} l ${x} ${y + height} l h f`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 900] /Resources << >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(drawing)} >>\nstream\n${drawing}\nendstream`,
  ];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

function vectorSvg(rectangles) {
  const shapes = rectangles.map(({ x, y, width, height }) => `<path d="M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z" fill="#000000"/>`).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1000 1000">${shapes}</svg>`, "utf8");
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-assets-v1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

const emptyPersonalization = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

test("Production Assets V1 inspecteert deterministische vectorvormen zonder tekst-, raster- of AI-geometrie", async () => {
  const bytes = vectorPdf([{ x: 20, y: 20, width: 80, height: 40 }, { x: 300, y: 300, width: 60, height: 60 }]);
  const inspected = await inspectProductionAssetSource({ bytes, filename: "sanitized-multi-logo.pdf", mimeType: "application/pdf" });
  assert.equal(inspected.source.immutable, true);
  assert.equal(inspected.inspection.geometryNeverAiGenerated, true);
  assert.equal(inspected.inspection.publicPdf.rasterCount, 0);
  assert.equal(inspected.inspection.publicPdf.textCount, 0);
  assert.equal(inspected.candidates.filter(({ selectionMode }) => selectionMode === "VISUAL_REGION").length, 2);
  const complete = inspected.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK");
  assert.equal(complete.controlledVector.contours.length, 2);
  assert.ok(inspected.candidates.every(({ previewSvg, controlledVector, geometryHash }) => previewSvg.startsWith("<svg") && controlledVector.contours.length >= 1 && /^[A-F0-9]{64}$/u.test(geometryHash)));
});

test("canonical SVG intake weigert actieve, externe, raster- en fontafhankelijke inhoud fail-closed", async () => {
  const safe = await inspectProductionAssetSource({ bytes: vectorSvg([{ x: 10, y: 10, width: 80, height: 40 }]), filename: "safe.svg", mimeType: "image/svg+xml", intakeKind: "ARTWORK" });
  assert.equal(safe.source.format, "SVG");
  assert.equal(safe.inspection.engine, "WBD_PRODUCTION_ASSET_SVG_INTAKE_V1");
  assert.equal(safe.candidates.length, 1);
  const unsafe = [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0H10V10Z"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/logo.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="10">ABC</text></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:red" d="M0 0H10V10Z"/></svg>',
    '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10V10Z"/></svg>',
  ];
  for (const [index, source] of unsafe.entries()) await assert.rejects(inspectProductionAssetSource({ bytes: Buffer.from(source), filename: `unsafe-${index}.svg`, mimeType: "image/svg+xml", intakeKind: "ARTWORK" }), (error) => /^PRODUCTION_ASSET_SVG_/u.test(error.code));
});

test("Production Assets V1 bewaart Source→Assets, vereist Human Acceptance en schrijft echte CutJob-SVG", async (context) => {
  const { root, store, service, admin, operator } = await fixture(context);
  const bytes = vectorSvg([{ x: 20, y: 20, width: 100, height: 50 }, { x: 140, y: 20, width: 40, height: 50 }]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-sponsor.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde V1-regressiebron", intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" });
  assert.equal(source.candidates.filter(({ selectionMode }) => selectionMode === "FULL_ARTWORK").length, 1);
  assert.equal(source.conversion.method, "HUMAN_VERIFIED_SVG");
  assert.equal(source.fidelity.comparisonMethod, "CANONICAL_SVG_PREVIEW");
  assert.equal(source.original.dataBase64, undefined);
  assert.equal(source.documentPreviewSvg, undefined);
  const operatorBootstrap = await service.bootstrap(operator.token);
  assert.deepEqual(operatorBootstrap.productionAssetSources, []);
  const bootstrap = await service.bootstrap(admin.token);
  assert.equal(bootstrap.productionAssetSources[0].candidates[0].controlledVector, undefined);
  assert.equal(bootstrap.productionAssetSources[0].candidates[0].previewSvg, undefined);
  assert.equal(bootstrap.productionAssetSources[0].documentPreviewSvg, undefined);
  await assert.rejects(service.promoteProductionAsset(operator.token, operator.csrfToken, source.id, {}), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [source.candidates[0].id], proofAuthority: "NO" }), (error) => error.code === "PRODUCTION_PROOF_AUTHORITY_REQUIRED");
  const candidate = source.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK");
  const original = await service.productionAssetOriginal(admin.token, source.id);
  assert.equal(original.sha256, source.original.sha256);
  assert.equal(original.allowSameOriginFrame, false);
  assert.deepEqual(original.bytes, bytes);
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Onjuiste verhouding", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: 80, applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" }), (error) => error.code === "PRODUCTION_ASSET_ASPECT_RATIO_MISMATCH");
  const physicalWidthMm = 80;
  const physicalHeightMm = physicalWidthMm * candidate.boundsMm.height / candidate.boundsMm.width;
  let asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Gesanitiseerd sponsorbeeld", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm: physicalWidthMm, heightMm: physicalHeightMm, contexts: [{ type: "GENERIC", id: "all", label: "Alle teams" }], applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.equal(asset.lifecycleStatus, "PRODUCTION_READY");
  assert.equal(asset.controlledVector.contours, undefined);
  const managedPreview = await service.productionAssetPreview(operator.token, asset.id);
  assert.equal((managedPreview.bytes.toString("utf8").match(/M /gu) ?? []).length, candidate.contourCount);
  assert.equal(managedPreview.sha256, asset.sourceSelection.geometryHash);
  await assert.rejects(service.setProductionAssetLifecycle(operator.token, operator.csrfToken, asset.id, { lifecycleStatus: "ARCHIVED", expectedRevision: asset.revision }), (error) => error.code === "FORBIDDEN");
  asset = await service.setProductionAssetLifecycle(admin.token, admin.csrfToken, asset.id, { lifecycleStatus: "ARCHIVED", expectedRevision: asset.revision });
  assert.equal(asset.lifecycleStatus, "ARCHIVED");
  asset = await service.setProductionAssetLifecycle(admin.token, admin.csrfToken, asset.id, { lifecycleStatus: "PRODUCTION_READY", expectedRevision: asset.revision });
  assert.equal(asset.lifecycleStatus, "PRODUCTION_READY");

  const order = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "TEAM", teamContext: "Fictieve vectorproef", customer: "Fictief team", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization,
    items: [{ product: "Teamshirt", association: "", size: "", quantity: 2, personalization: "Sponsorbeeld ×2", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }],
    productionLines: [{ id: "asset-line", type: "LOGO", content: asset.name, sourceId: asset.id, widthMm: physicalWidthMm, heightMm: physicalHeightMm, quantity: 2, provenance: "Production Assets V1 test" }],
  }, "assets-v1-order")).value;
  assert.equal(order.productionLines[0].validation.status, "VALID");
  await assert.rejects(service.setProductionAssetLifecycle(admin.token, admin.csrfToken, asset.id, { lifecycleStatus: "ARCHIVED", expectedRevision: asset.revision }), (error) => error.code === "PRODUCTION_ASSET_IN_ACTIVE_USE");
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, order.id, order.revision, "assets-v1-control")).value;
  const job = (await service.createProductionJob(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "assets-v1-job")).value;
  assert.equal(job.snapshot.artifact.format, "SVG");
  assert.equal(job.snapshot.layout.objectCount, 2);
  assert.equal(job.snapshot.scale, 1);
  assert.equal(job.snapshot.orientation.preMirrored, true);
  assert.equal(job.snapshot.hardwareSendPerformedByWorkspace, false);
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.match(svg, /data-production-data-sha256/u);
  assert.match(svg, /<path/u);
  const persisted = await store.read();
  assert.equal(persisted.productionAssetSources[0].original.dataBase64, bytes.toString("base64"));
  assert.ok(persisted.productionElements.find(({ id }) => id === asset.id).controlledVector.contours.length);
});

test("AI/PDF blijft provenance-only en alleen canonical SVG kan productieroute worden", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const originalBytes = vectorPdf([{ x: 20, y: 20, width: 120, height: 60 }, { x: 170, y: 20, width: 30, height: 60 }]);
  const original = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "official-artwork.ai", mimeType: "application/illustrator", dataBase64: originalBytes.toString("base64"), provenance: "Officiële immutable productiebron" });
  const rejected = await service.reviewProductionAssetSourceFidelity(admin.token, admin.csrfToken, original.id, { status: "MISMATCH", expectedRevision: original.revision, note: "De Workspace-afleiding mist een zichtbaar onderdeel.", proofAuthority: "HUMAN_SOURCE_COMPARISON" });
  assert.equal(rejected.fidelity.status, "MISMATCH");
  const candidate = original.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK");
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, original.id, { candidateIds: [candidate.id], name: "Onveilige bron", ownerType: "SPONSOR", ownerName: "Fictief", productionMethod: "SELF_PRODUCED", widthMm: 120, applications: [{ kind: "ARTWORK", placement: null }], proofAuthority: "HUMAN_ACCEPTANCE" }), (error) => error.code === "PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED");

  const exportedBytes = vectorPdf([{ x: 30, y: 30, width: 120, height: 60 }, { x: 180, y: 30, width: 30, height: 60 }]);
  const derived = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "official-artwork-controlled-export.pdf", mimeType: "application/pdf", dataBase64: exportedBytes.toString("base64"), provenance: "Eenmalige gecontroleerde Illustrator vector-PDF-export", derivedFromSourceId: original.id, conversionMethod: "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT" });
  assert.equal(derived.conversion.method, "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT");
  assert.equal(derived.conversion.derivedFromSourceId, original.id);
  assert.equal(derived.conversion.derivedFromSha256, original.original.sha256);
  assert.equal(derived.fidelity.referenceSha256, original.original.sha256);
  assert.equal(derived.fidelity.status, "REFERENCE_REQUIRED");
  const derivedCandidate = derived.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK");
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, derived.id, { candidateIds: [derivedCandidate.id], name: "Nog steeds geen SVG", ownerType: "SPONSOR", ownerName: "Fictief", productionMethod: "SELF_PRODUCED", widthMm: 120, applications: [{ kind: "ARTWORK", placement: null }], proofAuthority: "HUMAN_ACCEPTANCE" }), (error) => error.code === "PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED");
  const persisted = await store.read();
  assert.equal(persisted.productionAssetSources.find(({ id }) => id === original.id).original.dataBase64, originalBytes.toString("base64"));
  assert.equal(persisted.productionAssetSources.find(({ id }) => id === derived.id).original.dataBase64, exportedBytes.toString("base64"));
});

test("Beheerde nummerbron zet willekeurige combinaties zonder fontsubstitutie en houdt fysieke maat", () => {
  const glyph = (digit, width) => ({ candidateId: `candidate-${digit}`, geometryHash: digit.repeat(64), widthUnits: width, heightUnits: 20, contours: [{ id: `glyph-${digit}`, closed: true, points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 0 }] }] });
  const asset = { id: "hockey-number-source", version: "1", name: "Hockeynummers exact", lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", applications: [{ kind: "NUMBER_SET" }], sourceSelection: { geometryHash: "A".repeat(64) }, numberGlyphs: Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [String(digit), glyph(String(digit), 9 + digit / 10)])) };
  const piece = productionAssetPiece({ asset, variant: { heightMm: 75 }, line: { id: "line-34", content: "34", widthMm: 80, heightMm: 75, preview: { label: "Shortnummer 34" } }, order: { id: "SP-TEST", association: "MHC Test", items: [] }, foilColor: "Wit" });
  assert.equal(piece.requestedPhysicalSizeMm.heightMm, 75);
  assert.equal(piece.vectorProfile.startsWith("hockey-number-source@1#"), true);
  assert.equal(piece.contours.length, 2);
  assert.equal(piece.productionRule.mirror, true);
  assert.equal(piece.productionRule.rotation, 0);
  const firstRight = Math.max(...piece.contours[0].points.map(({ x }) => x));
  const secondLeft = Math.min(...piece.contours[1].points.map(({ x }) => x));
  assert.equal(Number((secondLeft - firstRight).toFixed(6)), NUMBER_GLYPH_SPACING_MM);
  assert.ok(piece.requestedPhysicalSizeMm.widthMm > 90);
});

test("beheerde nummerset toont samengestelde 12/34/77-preview uit dezelfde glyphgeometrie", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const bytes = vectorSvg(Array.from({ length: 10 }, (_, index) => ({ x: 20 + index * 60, y: 20, width: 10 + index * 2, height: 40 })));
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-hockey-numbers.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde glyphreview", intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidates = source.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(candidates.length, 10);
  const glyphMap = Object.fromEntries(candidates.map(({ id }, digit) => [String(digit), id]));
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: candidates.map(({ id }) => id), glyphMap, name: "Hockeynummers gedeeld", ownerType: "OWN_BRAND", ownerName: "Alle hockeyverenigingen", productionMethod: "SELF_PRODUCED", heightMm: 75, applications: [{ kind: "NUMBER_SET", placement: "Short/rok" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.deepEqual(asset.numberComposition, { freeContourSpacingMm: 30, measurement: "CONTOUR_TO_CONTOUR" });
  for (const value of ["12", "34", "77"]) {
    const preview = await service.productionAssetNumberPreview(operator.token, asset.id, value);
    assert.equal((preview.bytes.toString("utf8").match(/M /gu) ?? []).length, value.length);
  }
});

test("mixed Teamorder met logo, geschaalde sponsor en hockeynummer spiegelt iedere SELF_PRODUCED batch", () => {
  const rectangle = [{ id: "shape", closed: true, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }] }];
  const asset = { id: "visual-asset", version: "1", name: "Sponsorbeeld", lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", sourceSelection: { geometryHash: "A".repeat(64) }, controlledVector: { geometryHash: "A".repeat(64), contours: rectangle } };
  const order = { id: "SP-MIRROR", association: "Fictief team", items: [] };
  const logo = productionAssetPiece({ asset, variant: { widthMm: 80, heightMm: 40 }, line: { id: "logo", content: "Clublogo", widthMm: 80, heightMm: 40, preview: { label: "Clublogo" } }, order, foilColor: "Wit" });
  const scaledSponsor = productionAssetPiece({ asset, variant: { widthMm: 80, heightMm: 40 }, line: { id: "sponsor", content: "Sponsor", widthMm: 120, heightMm: 60, preview: { label: "Sponsor" } }, order, foilColor: "Zwart" });
  const glyph = (digit) => ({ candidateId: `candidate-${digit}`, geometryHash: digit.repeat(64), widthUnits: 9, heightUnits: 20, contours: [{ id: `glyph-${digit}`, closed: true, points: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 0 }] }] });
  const numberAsset = { id: "hockey-numbers", version: "1", name: "Hockeynummers", lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", applications: [{ kind: "NUMBER_SET" }], sourceSelection: { geometryHash: "B".repeat(64) }, numberGlyphs: Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [String(digit), glyph(String(digit))])) };
  const number = productionAssetPiece({ asset: numberAsset, variant: { heightMm: 75 }, line: { id: "number", content: "34", widthMm: 80, heightMm: 75, preview: { label: "Hockeynummer 34" } }, order, foilColor: "Wit" });
  assert.equal(logo.productionRule.mirror, true);
  assert.equal(scaledSponsor.productionRule.mirror, true);
  assert.equal(number.productionRule.mirror, true);
  assert.equal(scaledSponsor.requestedPhysicalSizeMm.widthMm, 120);
  const batch = createCutJobBatch({ organizationId: "sportpaleis", orderId: order.id, revision: 1, attemptIdPrefix: "assets-mirror", createdAt: "2026-08-21T00:00:00.000Z", pieces: [logo, scaledSponsor, number], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } });
  assert.equal(batch.jobs.length, 2);
  assert.ok(batch.jobs.every((job) => job.productionGeometry.groups.every(({ mirrorApplied }) => mirrorApplied)));
  const finalSvgs = batch.jobs.map((job) => createProductionPreview(job).svg);
  assert.equal(finalSvgs.reduce((sum, svg) => sum + (svg.match(/<path /gu) ?? []).length, 0), batch.jobs.reduce((sum, job) => sum + job.productionGeometry.contours.length, 0));
  assert.ok([logo, scaledSponsor, number].every(({ sourceOrderId }) => sourceOrderId === order.id));
  assert.ok(batch.jobs.every(({ readyForPrinting }) => readyForPrinting));
});

test("meerdere visuele assets houden eigen veilige maat en foliekleur en groeperen server-side", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const whiteSource = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-sponsor-white.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg([{ x: 20, y: 20, width: 100, height: 50 }]).toString("base64"), provenance: "Gesanitiseerde sponsor A", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const blackSource = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-sponsor-black.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg([{ x: 20, y: 20, width: 40, height: 80 }]).toString("base64"), provenance: "Gesanitiseerde sponsor B", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const whiteCandidate = whiteSource.candidates[0]; const blackCandidate = blackSource.candidates[0];
  const firstHeight = 80 * whiteCandidate.boundsMm.height / whiteCandidate.boundsMm.width;
  const secondHeight = 40 * blackCandidate.boundsMm.height / blackCandidate.boundsMm.width;
  const first = await service.promoteProductionAsset(admin.token, admin.csrfToken, whiteSource.id, { candidateIds: [whiteCandidate.id], name: "Sponsor wit", ownerType: "SPONSOR", ownerName: "Sponsor A", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: firstHeight, sizePolicyMode: "FIXED", defaultFoilColor: "Wit", applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  const second = await service.promoteProductionAsset(admin.token, admin.csrfToken, blackSource.id, { candidateIds: [blackCandidate.id], name: "Sponsor zwart", ownerType: "SPONSOR", ownerName: "Sponsor B", productionMethod: "SELF_PRODUCED", widthMm: 40, heightMm: secondHeight, sizePolicyMode: "DEFAULT_WITH_LIMITS", minWidthMm: 20, maxWidthMm: 60, defaultFoilColor: "Zwart", applications: [{ kind: "SPONSOR", placement: "Rug" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  await assert.rejects(service.createOrder(operator.token, operator.csrfToken, { orderKind: "TEAM", teamContext: "Maatgrens", customer: "Fictief team", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, items: [{ product: "Teamshirt", association: "", size: "", quantity: 1, personalization: "Sponsor", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }], productionLines: [{ type: "LOGO", content: second.name, sourceId: second.id, widthMm: 70, heightMm: 70 * secondHeight / 40, foilColor: "Zwart", quantity: 1, provenance: "test" }] }, "assets-size-invalid"), (error) => error.code === "PRODUCTION_ASSET_SIZE_OUT_OF_RANGE");
  const created = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "TEAM", teamContext: "Twee sponsors", customer: "Fictief team", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, items: [{ product: "Teamshirt", association: "", size: "", quantity: 3, personalization: "Twee sponsors", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }], productionLines: [{ id: "white", type: "LOGO", content: first.name, sourceId: first.id, widthMm: 80, heightMm: firstHeight, foilColor: "Wit", quantity: 2, provenance: "test" }, { id: "black", type: "LOGO", content: second.name, sourceId: second.id, widthMm: 30, heightMm: 30 * secondHeight / 40, foilColor: "Zwart", quantity: 1, provenance: "test" }] }, "assets-two-color-order")).value;
  assert.deepEqual(created.productionLines.map(({ foilColor }) => foilColor), ["Wit", "Zwart"]);
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, "assets-two-color-control")).value;
  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "assets-two-color-proposal")).value;
  assert.deepEqual(proposal.groups.map(({ foilColor }) => foilColor).sort(), ["Wit", "Zwart"]);
  assert.deepEqual(proposal.groups.map(({ productionLineRefs }) => productionLineRefs.length), [1, 1]);
});

test("PHYSICAL_TRANSFER blijft beheersbaar maar gaat nooit door de SELF_PRODUCED plotroute", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const bytes = vectorSvg([{ x: 20, y: 20, width: 100, height: 50 }]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-transfer.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde transfer-regressie", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates[0]; const widthMm = 80; const heightMm = widthMm * candidate.boundsMm.height / candidate.boundsMm.width;
  const transfer = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Extern clublogo", ownerType: "ASSOCIATION", ownerName: "Fictieve club", productionMethod: "PHYSICAL_TRANSFER", widthMm, heightMm, sizePolicyMode: "FIXED", applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.equal(transfer.productionMethod, "PHYSICAL_TRANSFER");
  assert.deepEqual(transfer.physicalTransfer, { supplier: null, location: null, stock: null, reserved: null });
  const order = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "TEAM", teamContext: "Transfer", customer: "Fictief team", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, items: [{ product: "Teamshirt", association: "", size: "", quantity: 1, personalization: "Extern logo", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }], productionLines: [{ type: "LOGO", content: transfer.name, sourceId: transfer.id, widthMm, heightMm, foilColor: "Wit", quantity: 1, provenance: "test" }] }, "assets-transfer-order")).value;
  assert.equal(order.productionLines[0].validation.status, "BLOCKED");
  assert.match(order.productionLines[0].validation.reason, /fysieke transfer/u);
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, order.id, order.revision, "assets-transfer-control")).value;
  await assert.rejects(service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "assets-transfer-proposal"), (error) => error.code === "ORDER_NOT_READY" && /fysieke transfer/u.test(error.message));
});

test("Production Assets V1 UX is visueel, contextueel en laat bronbytes buiten bootstrap", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  const assetModule = await readFile(new URL("../src/sportpaleis/production-assets.mjs", import.meta.url), "utf8");
  assert.match(source, /Visuele productiebibliotheek/u);
  assert.match(source, /data-production-asset-source-form/u);
  assert.match(source, /data-production-asset-promote-form/u);
  assert.match(source, /SVG-productiebron toevoegen/u);
  assert.match(source, /Preview en productie gebruiken exact dezelfde gevalideerde vectorvorm/u);
  assert.match(source, /data-production-asset-lifecycle-form/u);
  assert.match(source, /Logo\/opdruk toevoegen/u);
  assert.match(source, /exacte vectornummerbron/u);
  assert.match(source, /Dit is exact wat wij straks willen produceren/u);
  assert.match(source, /\+ Technische details/u);
  assert.match(source, /Kies het cijfer, of kies Niet gebruiken/u);
  assert.match(source, /teamAssetDrafts/u);
  assert.match(source, /freeAssetDrafts/u);
  assert.match(source, /data-asset-draft-field="foilColor"/u);
  assert.match(source, /data-asset-draft-field="widthMm"/u);
  assert.match(source, /lowerFilename\.endsWith\("\.svg"\)/u);
  assert.match(source, /conversionMethod: "HUMAN_VERIFIED_SVG"/u);
  assert.doesNotMatch(source, /\$\{source\.candidates\.length\} vectorvorm/u);
  assert.match(assetModule, /geometryNeverAiGenerated:\s*true/u);
  assert.match(server, /PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED/u);
  assert.match(assetModule, /collapseEquivalentVectorComponents/u);
  assert.match(server, /dataBase64: _dataBase64/u);
  assert.match(server, /PRODUCTION_ASSET_IDENTITY_MISMATCH/u);
  assert.match(server, /PRODUCTION_ASSET_SIZE_OUT_OF_RANGE/u);
  assert.match(server, /PRODUCTION_LINE_FOIL_COLOR_INVALID/u);
});

test("Productieasset-search is visual-first en zoekt op gedeelde context", () => {
  const [item] = buildWorkspaceSearchIndex({
    orders: [], articles: [], associations: [], employees: [], productionJobs: [],
    capabilities: { admin: true, operator: true },
    productionElements: [{ id: "asset-yanmar", name: "Yanmar", ownerName: "Yanmar", lifecycleStatus: "PRODUCTION_READY", sourceId: "source-city", sourceSelection: { candidateIds: ["candidate-yanmar"] }, contexts: [{ type: "ASSOCIATION", id: "almere-city", label: "Almere City" }], applications: [{ kind: "SPONSOR", placement: "Borst" }] }],
  }, "/workspace/sportpaleis");
  assert.equal(item.kind, "PRODUCTION_ASSET");
  assert.match(item.terms, /almere city/u);
  assert.equal(item.previewSrc, "/api/sportpaleis/v1/production-asset-sources/source-city/candidates/candidate-yanmar/preview.svg");
});

test("glyphreview toont uitsluitend gededupliceerde enkelvoudige cijfercomponenten", async () => {
  const bytes = vectorSvg(Array.from({ length: 10 }, (_, index) => ({ x: 20 + index * 70, y: 100, width: 8 + index * 5, height: 100 })));
  const inspected = await inspectProductionAssetSource({ bytes, filename: "sanitized-number-sheet.svg", mimeType: "image/svg+xml", intakeKind: "NUMBER_SET" });
  const glyphs = inspected.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(glyphs.length, 10);
  assert.ok(glyphs.every(({ selectionMode, aspectRatio }) => selectionMode === "VECTOR_COMPONENT" && aspectRatio <= 1));
  assert.equal(inspected.inspection.engine, "WBD_PRODUCTION_ASSET_SVG_INTAKE_V1");
});

test("samengesteld bronvoorbeeld wordt nooit als één cijferglyph aangeboden", async () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><g><path d="M10 10H20V110H10Z"/><path d="M25 10H35V110H25Z"/></g></svg>');
  const inspected = await inspectProductionAssetSource({ bytes, filename: "sanitized-composed-number-example.svg", mimeType: "image/svg+xml", intakeKind: "NUMBER_SET" });
  const glyphs = inspected.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(glyphs.length, 1);
  assert.ok(glyphs.every(({ contourCount }) => contourCount === 1));
});

test("één SVG blijft één complete composition zonder fragmentatie", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const bytes = vectorSvg([
    { x: 20, y: 100, width: 20, height: 20 },
    { x: 45, y: 100, width: 20, height: 20 },
    { x: 70, y: 100, width: 20, height: 20 },
    { x: 360, y: 500, width: 60, height: 40 },
  ]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-complete-artwork.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde complete-composition proof", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const composition = source.candidates.find(({ selectionMode, contourCount }) => selectionMode === "FULL_ARTWORK" && contourCount === 4);
  assert.ok(composition);
  const widthMm = 120; const heightMm = widthMm * composition.boundsMm.height / composition.boundsMm.width;
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [composition.id], name: "Compleet sponsorwoordmerk", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm, heightMm, applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  const preview = await service.productionAssetPreview(operator.token, asset.id);
  assert.equal((preview.bytes.toString("utf8").match(/M /gu) ?? []).length, 4);
  assert.equal(asset.sourceSelection.candidateIds.length, 1);
});

test("tussenvoegsel heeft canonical 20 mm default en blijft fail-closed zonder fysiek profielbewijs", async (context) => {
  const { store } = await fixture(context);
  const state = await store.read();
  const profiles = state.productionProfiles.filter(({ supports }) => supports?.includes("initials"));
  assert.ok(profiles.length > 0);
  assert.ok(profiles.every(({ initialsInfixRule }) => initialsInfixRule?.heightMm === 20));
  assert.ok(profiles.every(({ initialsInfixRule }) => initialsInfixRule?.status === "DATA_GAP" || initialsInfixRule?.status === "SOURCE_CONFIGURED"));
});

test("Production dashboard gebruikt één centrale set voor Attention teller en zichtbare lijst", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(source, /const blocked = attentionOrders;/u);
  assert.match(source, /statusCounts = \{ attention: blocked\.length/u);
  assert.match(source, /data-action="production-filter" data-filter="attention"/u);
  assert.match(source, /data-managed-asset-search/u);
  assert.match(source, /Niet gebruiken/u);
  assert.match(source, /Nummerset compleet/u);
  assert.match(source, /source\.original\.format === "SVG" \|\| glyphReview/u);
  assert.match(source, /alleen deze gevalideerde SVG wordt productiegeometrie/u);
  assert.match(source, /normalReviewRepresentative !== false/u);
  assert.match(source, /fidelityStatus === "MATCHED" \? visualCandidates : \[\]/u);
  assert.match(source, /technicalReviewCandidates/u);
  assert.match(source, /review=production-assets/u);
  assert.match(source, /A · Bibliotheek/u);
  assert.match(source, /G\/H · Productie & dashboard/u);
  assert.match(server, /PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED/u);
  assert.match(server, /ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT/u);
});
