import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectProductionAssetSource, productionAssetPiece } from "../src/sportpaleis/production-assets.mjs";
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
  assert.equal(inspected.candidates.length, 2);
  assert.ok(inspected.candidates.every(({ selectionMode }) => selectionMode === "VISUAL_REGION"));
  assert.ok(inspected.candidates.every(({ previewSvg, controlledVector, geometryHash }) => previewSvg.startsWith("<svg") && controlledVector.contours.length === 1 && /^[A-F0-9]{64}$/u.test(geometryHash)));
});

test("Production Assets V1 bewaart Source→Assets, vereist Human Acceptance en schrijft echte CutJob-SVG", async (context) => {
  const { root, store, service, admin, operator } = await fixture(context);
  const bytes = vectorPdf([{ x: 20, y: 20, width: 100, height: 50 }, { x: 300, y: 300, width: 40, height: 80 }]);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sanitized-city-assets.pdf", mimeType: "application/pdf", dataBase64: bytes.toString("base64"), provenance: "Gesanitiseerde V1-regressiebron" });
  assert.equal(source.candidates.length, 2);
  assert.equal(source.original.dataBase64, undefined);
  assert.equal(source.documentPreviewSvg, undefined);
  const bootstrap = await service.bootstrap(operator.token);
  assert.equal(bootstrap.productionAssetSources[0].candidates[0].controlledVector, undefined);
  assert.equal(bootstrap.productionAssetSources[0].candidates[0].previewSvg, undefined);
  assert.equal(bootstrap.productionAssetSources[0].documentPreviewSvg, undefined);
  await assert.rejects(service.promoteProductionAsset(operator.token, operator.csrfToken, source.id, {}), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [source.candidates[0].id], proofAuthority: "NO" }), (error) => error.code === "PRODUCTION_PROOF_AUTHORITY_REQUIRED");
  const candidate = source.candidates[0];
  await assert.rejects(service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Onjuiste verhouding", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: 80, applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" }), (error) => error.code === "PRODUCTION_ASSET_ASPECT_RATIO_MISMATCH");
  const physicalWidthMm = 80;
  const physicalHeightMm = physicalWidthMm * candidate.boundsMm.height / candidate.boundsMm.width;
  let asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [candidate.id], name: "Gesanitiseerd sponsorbeeld", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", productionMethod: "SELF_PRODUCED", widthMm: physicalWidthMm, heightMm: physicalHeightMm, contexts: [{ type: "GENERIC", id: "all", label: "Alle teams" }], applications: [{ kind: "SPONSOR", placement: "Borst" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  assert.equal(asset.lifecycleStatus, "PRODUCTION_READY");
  assert.equal(asset.controlledVector.contours, undefined);
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
  assert.equal(job.snapshot.hardwareSendPerformedByWorkspace, false);
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.match(svg, /data-production-data-sha256/u);
  assert.match(svg, /<path/u);
  const persisted = await store.read();
  assert.equal(persisted.productionAssetSources[0].original.dataBase64, bytes.toString("base64"));
  assert.ok(persisted.productionElements.find(({ id }) => id === asset.id).controlledVector.contours.length);
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
  assert.ok(piece.requestedPhysicalSizeMm.widthMm > 70);
});

test("Production Assets V1 UX is visueel, contextueel en laat bronbytes buiten bootstrap", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  const assetModule = await readFile(new URL("../src/sportpaleis/production-assets.mjs", import.meta.url), "utf8");
  assert.match(source, /Visuele productiebibliotheek/u);
  assert.match(source, /data-production-asset-source-form/u);
  assert.match(source, /data-production-asset-promote-form/u);
  assert.match(source, /Volledig document/u);
  assert.match(source, /Precies vectoronderdeel kiezen/u);
  assert.match(source, /data-production-asset-lifecycle-form/u);
  assert.match(source, /Beeldmerk uit bibliotheek/u);
  assert.match(source, /exacte vectornummerbron/u);
  assert.match(source, /Human Acceptance/u);
  assert.match(assetModule, /geometryNeverAiGenerated:\s*true/u);
  assert.match(server, /dataBase64: _dataBase64/u);
  assert.match(server, /PRODUCTION_ASSET_IDENTITY_MISMATCH/u);
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
