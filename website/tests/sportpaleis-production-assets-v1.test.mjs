import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectProductionAssetSource, NUMBER_GLYPH_SPACING_MM, productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
import { createCutJobBatch, createProductionPreview } from "../src/sportpaleis/direct-print/index.ts";
import { buildWorkspaceSearchIndex, queryWorkspaceSearch } from "../src/workspace-search.ts";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { executableProductionAssetDecision, projectProductionReadyVisualAssets } from "../src/sportpaleis/production-practice-contract.mjs";

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
  const bootstrapSource = bootstrap.productionAssetSources.find(({ id }) => id === source.id);
  assert.equal(bootstrapSource.candidates[0].controlledVector, undefined);
  assert.equal(bootstrapSource.candidates[0].previewSvg, undefined);
  assert.equal(bootstrapSource.documentPreviewSvg, undefined);
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
  assert.equal(persisted.productionAssetSources.find(({ original }) => original.sha256 === source.original.sha256).original.dataBase64, bytes.toString("base64"));
  assert.ok(persisted.productionElements.find(({ id }) => id === asset.id).controlledVector.contours.length);
});

test("broninname legt operator, tijd en veilige Workspace-provenance automatisch vast", async (context) => {
  const { service, operator } = await fixture(context);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, {
    filename: "sanitized-automatic-intake.svg",
    mimeType: "image/svg+xml",
    dataBase64: vectorSvg([{ x: 20, y: 20, width: 100, height: 50 }]).toString("base64"),
    intakeKind: "ARTWORK",
    conversionMethod: "HUMAN_VERIFIED_SVG",
  });
  assert.equal(source.uploadedBy.userId, operator.user.id);
  assert.equal(source.uploadedBy.name, operator.user.name);
  assert.match(source.uploadedAt, /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(source.provenance, `Toegevoegd via Sportpaleis Workspace door ${operator.user.name}`);
});

test("artwork kan zonder maat veilig in de bibliotheek blijven en wordt pas na maatvrijgave productieklaar", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const bytes = vectorSvg([{ x: 40, y: 80, width: 160, height: 80 }]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-library-artwork.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde bibliotheekfixture", intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK");
  let asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Artwork zonder productiemaat", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm: 0, heightMm: 0, applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.equal(asset.lifecycleStatus, "REVIEW");
  assert.equal(asset.sizePolicy, undefined);
  assert.equal(asset.variants[0].widthMm, null);
  assert.equal(asset.variants[0].heightMm, null);
  await assert.rejects(service.setProductionAssetLifecycle(admin.token, admin.csrfToken, asset.id, { lifecycleStatus: "PRODUCTION_READY", expectedRevision: asset.revision }), (error) => error.code === "PRODUCTION_ASSET_SIZE_MISSING");
  asset = await service.setProductionAssetLifecycle(admin.token, admin.csrfToken, asset.id, { lifecycleStatus: "PRODUCTION_READY", expectedRevision: asset.revision, widthMm: 120 });
  assert.equal(asset.lifecycleStatus, "PRODUCTION_READY");
  assert.equal(asset.sizePolicy.defaultWidthMm, 120);
  assert.equal(asset.sizePolicy.defaultHeightMm, 60);
  assert.equal(asset.variants[0].heightMm, 60);
  const persisted = await store.read();
  const stored = persisted.productionElements.find(({ id }) => id === asset.id);
  assert.ok(stored.controlledVector.contours.length > 0);
  assert.equal(stored.sourceId, source.id);
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
  const expectedWidth = (9.3 / 20 * 75) + NUMBER_GLYPH_SPACING_MM + (9.4 / 20 * 75);
  assert.equal(Number(piece.requestedPhysicalSizeMm.widthMm.toFixed(6)), Number(expectedWidth.toFixed(6)));
});

test("beheerde nummerset toont samengestelde 12/34/77-preview uit dezelfde glyphgeometrie", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const bytes = vectorSvg(Array.from({ length: 10 }, (_, index) => ({ x: 20 + index * 60, y: 20, width: 10 + index * 2, height: 40 })));
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-hockey-numbers.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde glyphreview", intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidates = source.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(candidates.length, 10);
  const glyphMap = Object.fromEntries(candidates.map(({ id }, digit) => [String(digit), id]));
  const association = (await store.read()).associations[0];
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: candidates.map(({ id }) => id), glyphMap, name: "Hockeynummers vereniging", ownerType: "ASSOCIATION", ownerName: association.name, productionMethod: "SELF_PRODUCED", heightMm: 75, contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind: "NUMBER_SET", placement: "Short/rok" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.deepEqual(asset.numberComposition, { freeContourSpacingMm: 5, measurement: "CONTOUR_TO_CONTOUR" });
  assert.equal(asset.lifecycleStatus, "PRODUCTION_READY");
  assert.equal(asset.contexts[0].id, association.id);
  assert.equal(asset.variants[0].widthMm, 75);
  assert.equal(asset.variants[0].heightMm, 75);
  for (const value of ["12", "34", "77"]) {
    const preview = await service.productionAssetNumberPreview(operator.token, asset.id, value);
    assert.equal((preview.bytes.toString("utf8").match(/M /gu) ?? []).length, value.length);
  }
  const bootstrap = await service.bootstrap(operator.token);
  assert.equal(bootstrap.productionElements.find(({ id }) => id === asset.id)?.contexts[0].label, association.name);
  const order = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "TEAM", teamContext: association.name, customer: "Technische nummersetproef", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization,
    items: [{ product: "Hockeyrok", association: association.name, size: "M", quantity: 1, personalization: "Shortnummer 34", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }],
    productionLines: [{ id: "hockey-number-34", type: "NUMBER", content: "34", sourceId: asset.id, widthMm: asset.variants[0].widthMm, heightMm: asset.variants[0].heightMm, foilColor: "Wit", quantity: 1, provenance: "Technische ketentest; geen live Human Acceptance" }],
  }, "technical-hockey-number-set-flow")).value;
  assert.equal(order.productionLines[0].source.id, asset.id);
  assert.equal(order.productionLines[0].validation.status, "VALID");
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
  assert.match(source, /"Bibliotheek"/u);
  assert.match(source, /card\(`\$\{BASE\}\/productie\/elementen`, "Bibliotheek"/u);
  assert.doesNotMatch(source, /<div class="sp-panel"><p class="sp-eyebrow">ÉÉN BRON<\/p><h3>Productie-assets<\/h3>/u);
  assert.match(source, /data-production-asset-source-form/u);
  assert.match(source, /data-production-asset-promote-form/u);
  assert.match(source, /Artwork of nummerset toevoegen/u);
  assert.match(source, /Alleen kiezen toont een lokale preview; er wordt dan nog niets centraal opgeslagen/u);
  assert.match(source, /Stap 2 · SVG centraal opslaan en verdergaan/u);
  assert.match(source, /pendingSourceCount/u);
  assert.match(source, /opgeslagen bron/u);
  assert.match(source, /Van wie ontvangen\?/u);
  assert.match(source, /inferredProductionAssetKind/u);
  assert.match(source, /Mijn productie \/ Wachtrij/u);
  assert.match(source, /Productie-instellingen/u);
  assert.match(source, /Productiebron voor \$\{esc\(association\.name\)\} toevoegen/u);
  assert.doesNotMatch(source, /name="provenance" required maxlength="500" placeholder="Aangeleverd/u);
  assert.match(server, /Toegevoegd via Sportpaleis Workspace door \$\{user\.name\}/u);
  assert.match(source, /data-production-asset-lifecycle-form/u);
  assert.match(source, /Logo\/opdruk toevoegen/u);
  assert.match(source, /exacte vectornummerbron/u);
  assert.match(source, /type === "ASSOCIATION" && label\.toLocaleLowerCase/u);
  assert.match(source, /De zichtbare vorm en bronselectie kloppen/u);
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

test("visual asset search blijft licht bij een representatieve bibliotheek", () => {
  const productionElements = Array.from({ length: 1_000 }, (_, index) => ({
    id: `asset-${index}`,
    name: `Sponsorlogo ${index}`,
    ownerName: `Sponsor ${index}`,
    lifecycleStatus: "PRODUCTION_READY",
    sourceId: `source-${index}`,
    sourceSelection: { candidateIds: [`candidate-${index}`] },
    contexts: [{ type: "ASSOCIATION", id: `club-${index % 40}`, label: `Vereniging ${index % 40}` }],
    applications: [{ kind: "SPONSOR", placement: "Borst" }],
  }));
  const startedAt = performance.now();
  const index = buildWorkspaceSearchIndex({
    orders: [], articles: [], associations: [], employees: [], productionJobs: [],
    capabilities: { admin: true, operator: true }, productionElements,
  }, "/workspace/sportpaleis");
  const result = queryWorkspaceSearch(index, "Sponsorlogo 999");
  const durationMs = performance.now() - startedAt;
  assert.equal(index.length, 1_000);
  assert.equal(result[0]?.id, "asset-999");
  assert.ok(durationMs < 250, `Visual asset search duurde ${durationMs.toFixed(1)} ms`);
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
  assert.match(source, /de gecontroleerde SVG is de productiegeometrie/u);
  assert.match(source, /normalReviewRepresentative !== false/u);
  assert.match(source, /saveProductionAssetReviewDraft/u);
  assert.match(source, /data-context-picker/u);
  assert.match(source, /create-inline-production-association/u);
  assert.match(source, /sp-asset-preparation-form/u);
  assert.match(source, /Onderdelen in dit bestand · Welke wilt u bewaren\?/u);
  assert.match(source, /data-asset-split-card/u);
  assert.match(source, /assetName:\$\{esc\(candidate\.id\)\}/u);
  assert.match(source, /candidateArtwork/u);
  assert.match(source, /const artworkDraft = draft\?\.candidateArtwork\?\.\[candidate\.id\]/u);
  assert.doesNotMatch(source, /sp-asset-split-card[^`]+<img loading="lazy"/u);
  assert.match(source, /Geselecteerde onderdelen bewaren/u);
  assert.match(source, /candidateIds: \[selection\.candidateId\]/u);
  assert.doesNotMatch(source, /review=production-assets/u);
  assert.doesNotMatch(source, /A · Bibliotheek/u);
  assert.doesNotMatch(source, /G\/H · Productie & dashboard/u);
  assert.match(server, /PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED/u);
  assert.match(server, /ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT/u);
});

test("City logo's jeugd 2026 biedt vier visuele brononderdelen, separate centrale save en individuele order reuse", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  // Git may expose this text fixture with CRLF in a Windows worktree. Restore the
  // authoritative LF bytes before asserting the upload hash and SVG structure.
  const checkedOutFixture = await readFile(new URL("./fixtures/sportpaleis/city-logos-jeugd-2026-authoritative.svg", import.meta.url));
  const fixtureBytes = Buffer.from(checkedOutFixture.toString("utf8").replaceAll("\r\n", "\n"), "utf8");
  const artwork = fixtureBytes.subarray(0, fixtureBytes.length - 2);
  assert.equal(fixtureBytes.subarray(-2).toString("hex"), "0a0a", "alleen twee door de tekstpatch vereiste afsluitende LF-bytes staan buiten de authoritative uploadbytes");
  const inspected = await inspectProductionAssetSource({ bytes: artwork, filename: "City logo's jeugd 2026.svg", mimeType: "image/svg+xml", intakeKind: "ARTWORK" });
  assert.equal(inspected.candidates.length, 4);
  assert.equal(inspected.source.sha256, "35C5949B0CDCA38696F9DAF557DC8962D4C112CB294896C6EDAB434E2924A037");
  assert.deepEqual(inspected.candidates.map(({ contourCount }) => contourCount), [26, 37, 19, 12]);
  assert.ok(inspected.candidates.every(({ selectionMode, reviewCategory, warnings }) => selectionMode === "OBJECT_GROUP" && reviewCategory === "ARTWORK_CANDIDATE" && warnings.length === 0));
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "City logo's jeugd 2026.svg", mimeType: "image/svg+xml", dataBase64: artwork.toString("base64"), provenance: "Production-shaped City multi-asset acceptance", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const previews = await Promise.all(source.candidates.map(({ id }) => service.productionAssetCandidatePreview(operator.token, source.id, id)));
  assert.equal(previews.length, 4);
  assert.ok(previews.every(({ bytes }) => bytes.toString("utf8").includes("<svg")));
  const association = (await store.read()).associations[0];
  const names = ["KROONENBERG GROEP", "Almere City", "ruitenheer", "YANMAR"];
  const kinds = ["SPONSOR", "LOGO", "SPONSOR", "SPONSOR"];
  const candidateArtwork = Object.fromEntries(source.candidates.map(({ id }, index) => [id, { name: names[index], kind: kinds[index] }]));
  const draft = await service.saveProductionAssetReviewDraft(admin.token, admin.csrfToken, source.id, { revision: 0, selectedCandidateIds: source.candidates.map(({ id }) => id), glyphAssignments: {}, candidateArtwork, name: "", primaryContextKey: `ASSOCIATION:${association.id}`, additionalContextKeys: [], applicationKind: "ARTWORK", productionMethod: "SELF_PRODUCED", widthMm: "100", heightMm: "", sizePolicyMode: "FIXED", minWidthMm: "", maxWidthMm: "", defaultFoilColor: "Wit", strokeReviewAccepted: false });
  assert.deepEqual(draft.reviewDraft.candidateArtwork, candidateArtwork);
  const resumedDraft = (await service.bootstrap(admin.token)).productionAssetSources.find(({ id }) => id === source.id).reviewDraft;
  assert.deepEqual(resumedDraft.candidateArtwork, candidateArtwork, "naam en type blijven na refresh/new bootstrap bewaard");
  const create = async (candidate, name, kind) => service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name, ownerType: "ASSOCIATION", ownerName: association.name, productionMethod: "SELF_PRODUCED", widthMm: 100, heightMm: 100 * candidate.boundsMm.height / candidate.boundsMm.width, contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind, placement: null }], proofAuthority: "HUMAN_ACCEPTANCE" });
  const assets = [];
  assets.push(await create(source.candidates[0], names[0], kinds[0]));
  const partial = (await service.bootstrap(admin.token)).productionAssetSources.find(({ id }) => id === source.id).reviewDraft;
  assert.deepEqual(partial.selectedCandidateIds, source.candidates.slice(1).map(({ id }) => id));
  assert.deepEqual(partial.candidateArtwork, Object.fromEntries(Object.entries(candidateArtwork).slice(1)), "na de eerste separate save blijven alle volgende onderdeelkeuzes resumable");
  for (let index = 1; index < source.candidates.length; index += 1) assets.push(await create(source.candidates[index], names[index], kinds[index]));
  assert.equal(new Set(assets.map(({ sourceSelection }) => sourceSelection.geometryHash)).size, 4);
  const persisted = await store.read();
  const separateAssets = persisted.productionElements.filter(({ sourceId }) => sourceId === source.id);
  assert.equal(separateAssets.length, 4);
  assert.deepEqual(separateAssets.map(({ name }) => name).sort(), [...names].sort());
  assert.deepEqual(separateAssets.map(({ applications }) => applications[0].kind).sort(), [...kinds].sort());
  assert.deepEqual(separateAssets.map(({ sourceSelection }) => sourceSelection.candidateIds[0]).sort(), source.candidates.map(({ id }) => id).sort());
  const retainedSource = persisted.productionAssetSources.find(({ id }) => id === source.id);
  assert.equal(retainedSource.reviewDraft, undefined, "concept verdwijnt pas nadat alle geselecteerde onderdelen zijn opgeslagen");
  assert.equal(retainedSource.original.dataBase64, artwork.toString("base64"));
  assert.equal(retainedSource.original.filename, "City logo's jeugd 2026.svg");
  const library = await service.bootstrap(admin.token);
  assert.ok(assets.every(({ id }) => library.productionElements.some((asset) => asset.id === id && asset.sourceId === source.id)));
  assert.ok(assets.every(({ contexts }) => contexts.some(({ type, id }) => type === "ASSOCIATION" && id === association.id)));
  const profile = persisted.productionProfiles.find(({ id }) => id !== "profile-none");
  const reused = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "TEAM", teamContext: "City losse multi-assets", customer: "A.S.C. Waterwijk", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, items: [{ product: "Teamshirt", association: association.name, productionProfileId: profile.id, size: "M", quantity: 4, personalization: "Vier losse City-assets", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }], productionLines: assets.map((asset, index) => ({ id: `city-multi-asset-${index + 1}`, type: "LOGO", content: asset.name, sourceId: asset.id, widthMm: asset.variants[0].widthMm, heightMm: asset.variants[0].heightMm, foilColor: "Wit", quantity: 1, provenance: "City individuele order reuse" })) }, "city-assets-individual-order-reuse")).value;
  assert.deepEqual(reused.productionLines.map(({ source }) => source.id), assets.map(({ id }) => id));
  assert.equal(reused.items[0].productionProfileId, profile.id);
});

test("Human Review bewaart iedere cijferkeuze als resumable serverconcept en valideert alleen wat ontbreekt", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const bytes = vectorSvg(Array.from({ length: 10 }, (_, index) => ({ x: 20 + index * 70, y: 100, width: 8 + index * 5, height: 100 })));
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-resumable-numbers.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde resumable review", intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const assignments = Object.fromEntries(source.candidates.slice(0, 8).map(({ id }, digit) => [id, String(digit)]));
  const draft = await service.saveProductionAssetReviewDraft(admin.token, admin.csrfToken, source.id, { revision: 0, selectedCandidateIds: source.candidates.slice(0, 8).map(({ id }) => id), glyphAssignments: assignments, name: "Hockey nummers", primaryContextKey: "GENERIC:all-hockey", additionalContextKeys: [], applicationKind: "NUMBER_SET", productionMethod: "SELF_PRODUCED", widthMm: "", heightMm: "200", sizePolicyMode: "FIXED", minWidthMm: "", maxWidthMm: "", defaultFoilColor: "", strokeReviewAccepted: false });
  assert.equal(draft.reviewDraft.revision, 1);
  assert.equal(Object.keys(draft.reviewDraft.glyphAssignments).length, 8);
  const resumed = (await service.bootstrap(admin.token)).productionAssetSources.find(({ id }) => id === source.id);
  assert.deepEqual(resumed.reviewDraft.glyphAssignments, assignments);
  const nextAssignments = { ...assignments, [source.candidates[8].id]: "8" };
  const next = await service.saveProductionAssetReviewDraft(admin.token, admin.csrfToken, source.id, { ...draft.reviewDraft, revision: 1, selectedCandidateIds: source.candidates.slice(0, 9).map(({ id }) => id), glyphAssignments: nextAssignments });
  assert.equal(next.reviewDraft.revision, 2);
  assert.equal(next.reviewDraft.selectedCandidateIds.length, 9);
  await assert.rejects(service.saveProductionAssetReviewDraft(admin.token, admin.csrfToken, source.id, { ...draft.reviewDraft, revision: 1 }), (error) => error.code === "REVISION_CONFLICT");
});

test("identieke bronbytes canonicaliseren zonder verenigingsassociaties samen te voegen", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const bytes = vectorSvg([{ x: 20, y: 30, width: 120, height: 60 }]);
  const payload = { filename: "club-logo.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" };
  const firstSource = await service.createProductionAssetSource(operator.token, operator.csrfToken, payload);
  const auditCount = (await store.read()).audit.length;
  const duplicateSource = await service.createProductionAssetSource(operator.token, operator.csrfToken, { ...payload, filename: "dezelfde-bytes-andere-naam.svg" });
  const duplicateState = await store.read();
  assert.equal(duplicateSource.id, firstSource.id);
  assert.equal(duplicateSource.original.sha256, firstSource.original.sha256);
  assert.equal(duplicateState.productionAssetSources.filter(({ original }) => original.sha256 === firstSource.original.sha256).length, 1);
  assert.equal(duplicateState.audit.length, auditCount, "een byte-identieke retry schrijft geen nieuwe bron of misleidende auditregel");

  const [leftAssociation, rightAssociation] = duplicateState.associations.filter(({ active }) => active !== false).slice(0, 2);
  const candidate = firstSource.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK") ?? firstSource.candidates[0];
  const promote = (association) => service.promoteProductionAsset(admin.token, admin.csrfToken, firstSource.id, {
    candidateIds: [candidate.id], name: `${association.name} logo`, ownerType: "ASSOCIATION", ownerName: association.name,
    productionMethod: "SELF_PRODUCED", widthMm: 120, heightMm: 60,
    contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE",
  });
  const left = await promote(leftAssociation);
  const right = await promote(rightAssociation);
  assert.notEqual(left.id, right.id);
  assert.equal(left.sourceId, right.sourceId, "één canonical bytebron mag veilig worden hergebruikt");
  assert.deepEqual(left.contexts.map(({ id }) => id), [leftAssociation.id]);
  assert.deepEqual(right.contexts.map(({ id }) => id), [rightAssociation.id]);
});

test("nieuwe bytes vormen een nieuwe immutable versie en archivering laat historie intact", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const association = (await store.read()).associations.find(({ active }) => active !== false);
  const createVersion = async (bytes, widthMm, heightMm) => {
    const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "logo-actueel.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" });
    const candidate = source.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK") ?? source.candidates[0];
    const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Versieerbaar clublogo", ownerType: "ASSOCIATION", ownerName: association.name, productionMethod: "SELF_PRODUCED", widthMm, heightMm, contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
    return { source, asset };
  };
  const firstBytes = vectorSvg([{ x: 20, y: 30, width: 100, height: 50 }]);
  const secondBytes = vectorSvg([{ x: 20, y: 30, width: 120, height: 50 }]);
  const first = await createVersion(firstBytes, 100, 50);
  const second = await createVersion(secondBytes, 120, 50);
  assert.notEqual(first.source.id, second.source.id);
  assert.notEqual(first.source.original.sha256, second.source.original.sha256);
  assert.notEqual(first.asset.version, second.asset.version);

  const order = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "TEAM", teamContext: "Historische assetreferentie", customer: "Historiecontrole", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, items: [{ product: "Teamshirt", association: association.name, size: "M", quantity: 1, personalization: "Logo", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }], productionLines: [{ id: "historical-logo", type: "LOGO", content: first.asset.name, sourceId: first.asset.id, widthMm: 100, heightMm: 50, foilColor: "Wit", quantity: 1, provenance: "Beheer/Bibliotheek assurance" }] }, "asset-history-order")).value;
  const historicalIdentity = structuredClone(order.productionLines[0].source);
  await store.mutate((state) => { const storedOrder = state.orders.find(({ id }) => id === order.id); storedOrder.stage = "DONE"; return { state, value: null }; });
  const archived = await service.setProductionAssetLifecycle(admin.token, admin.csrfToken, first.asset.id, { lifecycleStatus: "ARCHIVED", expectedRevision: first.asset.revision });
  assert.equal(archived.lifecycleStatus, "ARCHIVED");
  const after = await store.read();
  assert.deepEqual(after.orders.find(({ id }) => id === order.id).productionLines[0].source, historicalIdentity);
  assert.equal(after.productionAssetSources.find(({ id }) => id === first.source.id).original.dataBase64, firstBytes.toString("base64"));
  assert.equal(after.productionElements.find(({ id }) => id === second.asset.id).lifecycleStatus, "PRODUCTION_READY");
});

test("directe bronroutes respecteren admin-, operator- en winkelrolgrenzen", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const storeUser = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  const bytes = vectorSvg([{ x: 10, y: 10, width: 60, height: 30 }]);
  const payload = { filename: "role-boundary.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" };
  await assert.rejects(service.createProductionAssetSource(storeUser.token, storeUser.csrfToken, payload), (error) => error.code === "FORBIDDEN");
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, payload);
  assert.deepEqual((await service.bootstrap(operator.token)).productionAssetSources, []);
  assert.deepEqual((await service.bootstrap(storeUser.token)).productionAssetSources, []);
  await assert.rejects(service.productionAssetOriginal(storeUser.token, source.id), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.promoteProductionAsset(operator.token, operator.csrfToken, source.id, { proofAuthority: "HUMAN_ACCEPTANCE" }), (error) => error.code === "FORBIDDEN");
  assert.equal((await service.productionAssetOriginal(admin.token, source.id)).sha256, source.original.sha256);
});

test("gearchiveerde nummerset blijft historisch previewbaar maar niet productieselecteerbaar", async (context) => {
  const { service, operator, store } = await fixture(context);
  const { value: archivedId } = await store.mutate((state) => {
    const asset = state.productionElements.find(({ applications, numberGlyphs }) => applications?.some(({ kind }) => kind === "NUMBER_SET") && Object.keys(numberGlyphs ?? {}).length === 10);
    assert.ok(asset, "seed bevat een bewezen nummerset");
    asset.lifecycleStatus = "ARCHIVED";
    return { state, value: asset.id };
  });
  const preview = await service.productionAssetNumberPreview(operator.token, archivedId, "34");
  assert.match(preview.bytes.toString("utf8"), /^<svg/u);
  assert.equal((await store.read()).productionElements.find(({ id }) => id === archivedId).lifecycleStatus, "ARCHIVED");
});

test("bootstrap projecteert uitvoerbaarheid identity-gebonden zonder zware contourpayload", async (context) => {
  const { service, admin, operator, store } = await fixture(context);
  const association = (await store.read()).associations.find(({ active }) => active !== false);
  const bytes = vectorSvg([{ x: 20, y: 30, width: 100, height: 50 }]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "selector-logo.svg", mimeType: "image/svg+xml", dataBase64: bytes.toString("base64"), intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidate = source.candidates.find(({ selectionMode }) => selectionMode === "FULL_ARTWORK") ?? source.candidates[0];
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Selectorlogo", ownerType: "ASSOCIATION", ownerName: association.name, productionMethod: "SELF_PRODUCED", widthMm: 100, heightMm: 50, contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind: "LOGO", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  const projected = (await service.bootstrap(operator.token)).productionElements.find(({ id }) => id === asset.id);
  assert.equal(projected.controlledVector.contours, undefined);
  assert.equal(projected.executability.allowed, true);
  assert.ok(projectProductionReadyVisualAssets([projected]).some(({ id }) => id === asset.id));
  assert.equal(executableProductionAssetDecision({ ...projected, sourceId: "tampered-source" }).code, "PRODUCTION_ASSET_EXECUTABILITY_PROJECTION_MISMATCH");
});
