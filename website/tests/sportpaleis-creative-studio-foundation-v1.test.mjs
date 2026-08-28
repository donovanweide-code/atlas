import assert from "node:assert/strict";
import { test } from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createCreativeVectorCandidate, CREATIVE_VECTOR_ENGINES, preflightCreativeRaster } from "../src/sportpaleis/creative-vectorization.mjs";
import { createVisualStudioComposition, updateVisualStudioComposition, VISUAL_STUDIO_DIRECTIONS } from "../src/sportpaleis/visual-studio.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

test("production package verklaart de self-hosted VTracer runtime-afhankelijkheid", async () => {
  const productionPackage = JSON.parse(await readFile(new URL("../package.production.json", import.meta.url), "utf8"));
  assert.equal(productionPackage.dependencies["@visioncortex/vtracer"], "1.0.0-alpha.3");
});

function raster({ width = 480, height = 320, paint }) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  paint(context, width, height);
  return canvas.toBuffer("image/png");
}

const article = { id: "article-creative-1", revision: 7, articleNumber: "SP-2401", name: "Sportpaleis Performance Shirt", imageKey: "workspace-BHxaANpi.webp" };
const source = { id: "source-logo-1", original: { sha256: "A".repeat(64) } };
const asset = { id: "asset-logo-1", sourceId: source.id, version: "v3", name: "Clublogo" };
const user = { id: "user-admin", name: "Beheerder" };

test("Creative Studio biedt betekenisvolle richtingen en componeert ieder kanaal afzonderlijk uit dezelfde waarheid", () => {
  assert.equal(VISUAL_STUDIO_DIRECTIONS.length, 4);
  let composition = createVisualStudioComposition({ id: "visual-1", now: "2026-08-28T10:00:00.000Z", user, concept: "SEASON_START", title: "Klaar voor het nieuwe seizoen", artDirection: "", article, assets: [asset], sources: [source] });
  assert.equal(composition.directionId, "EDITORIAL_IMPACT");
  assert.ok(composition.artDirection.length > 20, "geen leeg canvas of verplichte prompt");
  assert.equal(new Set(composition.channels.map(({ renderHash }) => renderHash)).size, 5);
  assert.equal(new Set(composition.channels.map(({ layout }) => layout.crop)).size, 5);
  assert.ok(composition.channels.every(({ layout }) => layout.safeInsetPercent >= 8));
  const immutableProductHash = composition.productRef.sourceHash;
  const immutableAssetHash = composition.assetRefs[0].sourceSha256;
  composition = updateVisualStudioComposition(composition, { expectedRevision: 1, directionId: "PERFORMANCE_ENERGY", title: composition.title, artDirection: composition.artDirection, geometry: composition.geometry }, user, "2026-08-28T10:01:00.000Z");
  assert.equal(composition.directionId, "PERFORMANCE_ENERGY");
  assert.equal(composition.productRef.sourceHash, immutableProductHash);
  assert.equal(composition.assetRefs[0].sourceSha256, immutableAssetHash);
  assert.equal(composition.checks.canonicalProductLocked, true);
  assert.equal(composition.checks.canonicalAssetsLocked, true);
});

test("self-hosted raster-naar-SVG maakt echte paden maar blijft Human Review en wordt nooit stil canonical", async () => {
  const bytes = raster({ paint(context) { context.fillStyle = "#d10019"; context.beginPath(); context.arc(170, 160, 96, 0, Math.PI * 2); context.fill(); context.fillStyle = "#111111"; context.fillRect(250, 72, 150, 176); } });
  const candidate = await createCreativeVectorCandidate({ bytes, filename: "fictief-clublogo.png", mimeType: "image/png" });
  assert.equal(candidate.engine, "VTRACER_WASM_1_0_0_ALPHA_3");
  assert.equal(candidate.status, "HUMAN_REVIEW_REQUIRED");
  assert.match(candidate.derivative.svg, /<path\b/u);
  assert.ok(candidate.derivative.pathCount >= 1);
  assert.ok(candidate.derivative.geometryHash);
  assert.equal(candidate.evidence.canonicalPromotionPerformed, false);
  assert.notEqual(candidate.preflight.source.sha256, candidate.derivative.sha256);
});

test("vectorpreflight geeft officiële bron voorrang en weigert fotografie als logo-SVG", async () => {
  const logo = raster({ paint(context) { context.fillStyle = "#111"; context.fillRect(90, 70, 280, 180); } });
  const official = await preflightCreativeRaster({ bytes: logo, filename: "sponsor.png", mimeType: "image/png", officialVectorAvailable: true });
  assert.equal(official.status, "OFFICIAL_VECTOR_PREFERRED");
  assert.equal(official.vectorizable, false);
  const photo = raster({ width: 320, height: 240, paint(context, width, height) { const data = context.createImageData(width, height); for (let i = 0; i < data.data.length; i += 4) { const n = (i / 4) % 251; data.data[i] = n; data.data[i + 1] = (n * 7) % 255; data.data[i + 2] = (n * 13) % 255; data.data[i + 3] = 255; } context.putImageData(data, 0, 0); } });
  const rejected = await preflightCreativeRaster({ bytes: photo, filename: "teamfoto.jpg", mimeType: "image/png" });
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.sourceClass, "UNSUITABLE_PHOTO");
});

test("enginecontract houdt VTracer self-hosted, Vectorizer.AI optioneel en Illustrator uitsluitend benchmark", () => {
  assert.deepEqual(CREATIVE_VECTOR_ENGINES.map(({ route }) => route), ["ACTIVE_SELF_HOSTED", "OPTIONAL_COMMERCIAL_BENCHMARK", "HUMAN_QUALITY_BENCHMARK"]);
  assert.equal(CREATIVE_VECTOR_ENGINES[0].externalCost, 0);
  assert.equal(CREATIVE_VECTOR_ENGINES[0].dataLeavesWorkspace, false);
});

test("Teamwear-productieparameters zijn geen vrije Creative Studio-geometrie", () => {
  const composition = createVisualStudioComposition({ id: "visual-teamwear-proof", now: "2026-08-28T10:00:00.000Z", user, concept: "CLUB_MOMENT", title: "Teamwear voorstel", artDirection: "Bewezen clubbronnen", article, assets: [asset], sources: [source] });
  assert.equal(composition.channels.find(({ channel }) => channel === "TEAMWEAR_PROOF").layout.emphasis, "SOURCE_TRUTH");
  assert.equal("widthMm" in composition.geometry.product, false);
  assert.equal("heightMm" in composition.geometry.product, false);
  assert.equal("rotation" in composition.geometry.product, false);
  assert.equal("skew" in composition.geometry.product, false);
});

test("Creative vectorflow bewaart bron en afleiding immutable, dedupliceert en verbergt bytes in bootstrap", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "spw-creative-vector-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: "Creative-Kevin-2026!", patrick: "Creative-Patrick-2026!", collega: "Creative-Store-2026!", "donovan-support": "Creative-Support-2026!" } });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: "Creative-Kevin-2026!" });
  const bytes = raster({ paint(context) { context.fillStyle = "#d10019"; context.fillRect(70, 55, 340, 210); } });
  const payload = { filename: "fictief-sponsorlogo.png", mimeType: "image/png", dataBase64: bytes.toString("base64"), officialVectorAvailable: false };
  const first = await service.createCreativeVectorDraft(admin.token, admin.csrfToken, payload, "creative-vector-1");
  const second = await service.createCreativeVectorDraft(admin.token, admin.csrfToken, payload, "creative-vector-2");
  assert.equal(first.value.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(second.value.id, first.value.id);
  assert.equal((await store.read()).creativeVectorDrafts.length, 1);
  assert.ok((await service.creativeVectorDraftFile(admin.token, first.value.id, "source")).bytes.equals(bytes));
  assert.match((await service.creativeVectorDraftFile(admin.token, first.value.id, "derivative")).bytes.toString("utf8"), /<path\b/u);
  const bootstrap = await service.bootstrap(admin.token);
  assert.equal("dataBase64" in bootstrap.creativeVectorDrafts[0].source, false);
  assert.equal("svg" in bootstrap.creativeVectorDrafts[0].derivative, false);
  assert.equal(bootstrap.creativeVectorDrafts[0].evidence.canonicalPromotionPerformed, false);
});
