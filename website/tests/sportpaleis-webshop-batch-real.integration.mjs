import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWebshopBatchReview } from "../scripts/webshop-batch-review-server.mjs";
import { batchHash } from "../src/sportpaleis/webshop-batch-projection.mjs";

const sourcePath = process.env.SPORTPALEIS_BATCH_PDF;
if (!sourcePath) throw new Error("SPORTPALEIS_BATCH_PDF moet naar de echte 1-012653-order.pdf wijzen.");
const limits = JSON.parse(await readFile(new URL("../../docs/atlas/SPORTPALEIS-WEBSHOP-BATCH-V1-LIMITS.json", import.meta.url)));
const golden = JSON.parse(await readFile(new URL("./fixtures/sportpaleis/real-webshop-pdf-012653.contract.json", import.meta.url)));

test("real 138-page PDF through authenticated review HTTP: printing-only batch, deltas, restart and idempotent existing-contract dry-run", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "spw-batch-http-"));
  const statePath = join(root, "overrides.sqlite");
  const beforeHash = batchHash(await readFile(sourcePath));
  assert.equal(beforeHash, golden.sourceSha256);
  let service = await createWebshopBatchReview({ sourcePath, statePath });
  t.after(async () => { await service.close(); });
  let cookie, csrf;
  async function authenticate() {
    const root = await fetch(service.url);
    assert.equal(root.status, 200); cookie = root.headers.get("set-cookie").split(";")[0];
    csrf = (await (await fetch(`${service.url}/api/session`, { headers: { cookie } })).json()).csrf;
  }
  async function post(route, body, expect = 200) {
    const response = await fetch(`${service.url}${route}`, { method: "POST", headers: { cookie, Origin: service.url, "X-Batch-CSRF": csrf, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const value = await response.json(); assert.equal(response.status, expect, JSON.stringify(value)); return value;
  }
  assert.equal((await fetch(`${service.url}/api/batch`)).status, 401);
  await authenticate();
  const initial = await fetch(`${service.url}/api/batch`, { headers: { cookie } });
  assert.equal(initial.status, 409, "general page/bootstrap does not parse the PDF");
  const crossOrigin = await fetch(`${service.url}/api/load`, { method: "POST", headers: { cookie, Origin: "http://attacker.invalid", "X-Batch-CSRF": csrf } });
  assert.equal(crossOrigin.status, 403);
  let batch = await post("/api/load", {});
  assert.equal(batch.metrics.pageCount, 138); assert.equal(batch.sourceOrderCount, 137);
  assert.equal(batch.orderCount, 9); assert.equal(batch.itemCount, 18); assert.equal(batch.sourceArticleCount, 194);
  assert.equal(batch.sourceWarnings.length, 0);
  for (const [number, expected] of Object.entries(golden.goldenOrders)) {
    assert.deepEqual(batch.items.filter(({ orderNumber }) => orderNumber === number).flatMap((row) => row.values.personalizations.map((p) => [row.values.articleNumber, p.type, p.value])), expected);
  }
  const anchor = batch.items.find((row) => row.orderNumber === "2635358683" && row.values.articleNumber === "116597");
  assert.equal(anchor.orderDate, "2026-08-26"); assert.equal(anchor.values.description, "FC Almere Wedstrijdshirt");
  assert.equal(anchor.values.size, "XL"); assert.equal(anchor.values.color, "GROEN"); assert.equal(anchor.values.quantity, 1);
  assert.equal(batch.items.filter(({ orderNumber }) => orderNumber === "2635358683").length, 2, "three unprinted order items never enter intake");
  const sorted = [...batch.items].sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.orderNumber.localeCompare(b.orderNumber) || a.sourceIndex - b.sourceIndex);
  assert.deepEqual(batch.items.map(({ id }) => id), sorted.map(({ id }) => id));
  const measurements = { ...batch.metrics };
  const performanceChecks = [];
  performanceChecks.push(["pdfParseMs", measurements.pdfParseMs, limits.pdfTextParseMaxMs]);
  performanceChecks.push(["structuredMs", measurements.structuredMs, limits.structuredExtractionMaxMs]);
  performanceChecks.push(["batchReadyMs", measurements.batchReadyMs, limits.firstUsableBatchMaxMs]);
  performanceChecks.push(["rssDeltaBytes", measurements.rssDeltaBytes, limits.parentRssDeltaMaxBytes]);
  const ready = batch.items.find((row) => row.values.articleNumber === "131240");
  assert.equal(ready.production.status, "READY");
  const bad = batch.items.find((row) => row.values.articleNumber === "140295");
  assert.equal(bad.production.status, "REVIEW_REQUIRED");
  batch = await post("/api/override", { id: ready.id, action: "edit", revision: batch.revision, values: { color: "Niet-bestaande-kleur" } });
  const invalidColor = await post("/api/preview", { ids: [ready.id], revision: batch.revision });
  assert.equal(invalidColor.eligible.length, 0); assert.equal(invalidColor.blocked.length, 1);
  batch = await post("/api/override", { id: ready.id, action: "reset", revision: batch.revision });
  assert.equal(anchor.production.sizeProfile.value, "SENIOR");
  assert.equal(anchor.production.sizeProfile.automatic, true);
  assert.equal(anchor.production.sizeProfile.heightMm, 200);
  assert.ok(anchor.production.sizeProfile.source.includes("Product Truth"));
  const thumbnailRows = batch.items.filter((row) => row.catalog?.thumbnail);
  assert.equal(thumbnailRows.length, 16);
  const imageResponse = await fetch(`${service.url}${anchor.catalog.thumbnail}`, { headers: { cookie } });
  assert.equal(imageResponse.status, 200); assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  const thumbnailBytes = (await imageResponse.arrayBuffer()).byteLength;
  assert.ok(thumbnailBytes < 12000);
  let totalThumbnailBytes = 0;
  const thumbnailStart = performance.now();
  for (const url of new Set(thumbnailRows.map((row) => row.catalog.thumbnail))) {
    const response = await fetch(`${service.url}${url}`, { headers: { cookie } });
    assert.equal(response.status, 200);
    const bytes = (await response.arrayBuffer()).byteLength;
    assert.ok(bytes < 12000); totalThumbnailBytes += bytes;
  }
  const thumbnailRenderMs = performance.now() - thumbnailStart;
  const detail = await post("/api/order", { orderNumber: anchor.orderNumber });
  assert.equal(detail.itemCount, 5); assert.equal(detail.printingCount, 2);
  assert.equal(detail.items.filter((row) => !row.printingRequired).length, 3);
  const printedDetail = detail.items.find((row) => row.id === anchor.id);
  assert.equal(printedDetail.catalog.thumbnail, anchor.catalog.thumbnail);
  const detailThumbnails = detail.items.filter((row) => row.catalog?.thumbnail);
  const contextThumbnails = detail.items.filter((row) => !row.printingRequired && row.catalog?.thumbnail);
  assert.ok(contextThumbnails.length > 0);
  for (const row of detailThumbnails) assert.equal((await fetch(service.url + row.catalog.thumbnail, { headers: { cookie } })).status, 200);
  performanceChecks.push(["orderDetailMs", detail.metrics.openMs, 3000]); assert.equal(detail.metrics.persistedFullOrders, 0);
  const cachedDetail = await post("/api/order", { orderNumber: anchor.orderNumber });
  assert.equal(cachedDetail.metrics.cached, true); performanceChecks.push(["cachedOrderDetailMs", cachedDetail.metrics.openMs, 100]);
  for (const number of ["2635358543", "2635358648"]) {
    const context = await post("/api/order", { orderNumber: number });
    assert.ok(context.items.length >= context.printingCount); assert.ok(context.items.every((row) => row.orderNumber === number));
  }
  const unknown = batch.items.find((row) => row.values.articleNumber === "131251");
  batch = await post("/api/override", { id: unknown.id, action: "edit", revision: batch.revision, values: { description: "Handmatig gecontroleerd shirt", sizeProfile: "CUSTOM", customProfile: "Naam op borst, bron nog te bevestigen" }, structuralRuleCandidate: true });
  const freeRow = batch.items.find((row) => row.id === unknown.id);
  assert.equal(freeRow.production.status, "REVIEW_REQUIRED");
  assert.equal(freeRow.correctionCandidate.type, "STRUCTURAL_RULE_CANDIDATE");
  assert.equal(freeRow.correctionCandidate.promotion, "NOT_AUTHORIZED");
  const freePreview = await post("/api/preview", { ids: [unknown.id], revision: batch.revision });
  assert.equal(freePreview.eligible.length, 0); assert.equal(freePreview.blocked.length, 1);
  batch = await post("/api/override", { id: unknown.id, action: "reset", revision: batch.revision });
  const start = performance.now();
  batch = await post("/api/override", { id: ready.id, action: "edit", revision: batch.revision, values: { size: "M", quantity: 2, personalizations: [{ type: "INITIALS", value: "AB" }] }, structuralRuleCandidate: true });
  measurements.overrideRoundtripMs = performance.now() - start;
  performanceChecks.push(["overrideRoundtripMs", measurements.overrideRoundtripMs, limits.editSaveMaxMs]);
  assert.equal(batch.items.find(({ id }) => id === ready.id).corrected, true);
  await post("/api/override", { id: ready.id, action: "exclude", revision: 0 }, 409);
  batch = await post("/api/override", { id: anchor.id, action: "exclude", revision: batch.revision });
  const revisions = batch.revision;
  await service.close(); service = await createWebshopBatchReview({ sourcePath, statePath }); await authenticate();
  batch = await post("/api/load", {});
  assert.equal(batch.revision, revisions);
  assert.equal(batch.items.find(({ id }) => id === anchor.id).excluded, true);
  const restoredContext = await post("/api/order", { orderNumber: anchor.orderNumber });
  assert.equal(restoredContext.items.find(({ id }) => id === anchor.id).excluded, true);
  assert.equal(restoredContext.items.filter((row) => !row.printingRequired).length, 3);
  const correctedContext = await post("/api/order", { orderNumber: ready.orderNumber });
  assert.equal(correctedContext.items.find(({ id }) => id === ready.id).values.quantity, 2);
  assert.equal(correctedContext.items.find(({ id }) => id === ready.id).source.quantity, 1);
  assert.equal(batch.items.find(({ id }) => id === ready.id).values.quantity, 2);
  assert.equal(batch.items.find(({ id }) => id === ready.id).override.structuralRuleCandidate, true);
  const selection = await post("/api/preview", { ids: [ready.id, bad.id, anchor.id], revision: batch.revision });
  assert.equal(selection.eligible.length, 1); assert.equal(selection.blocked.length, 1); assert.equal(selection.excluded.length, 1);
  assert.equal(selection.eligible[0].contract.quantity, 2);
  assert.equal(selection.eligible[0].contract.size, "M");
  assert.equal(selection.eligible[0].contract.productionLines[0].content, "AB");
  assert.equal(selection.eligible[0].contract.validation.status, "VALID");
  assert.equal(selection.eligible[0].contract.foilColor, "Wit");
  await post("/api/confirm", { previewId: selection.id, revision: selection.revision }, 409);
  const [one, two] = await Promise.all([post("/api/confirm", { previewId: selection.id, revision: selection.revision, confirmed: true }), post("/api/confirm", { previewId: selection.id, revision: selection.revision, confirmed: true })]);
  assert.equal(one.id, two.id); assert.equal(+one.duplicate + +two.duplicate, 1);
  assert.deepEqual(one.itemIds, [ready.id]);
  await service.close(); service = await createWebshopBatchReview({ sourcePath, statePath }); await authenticate();
  const replay = await post("/api/confirm", { previewId: selection.id, revision: selection.revision, confirmed: true });
  assert.equal(replay.duplicate, true);
  batch = await post("/api/load", {});
  assert.equal(batch.items.find(({ id }) => id === ready.id).completed, true);
  batch = await post("/api/override", { id: anchor.id, action: "restore", revision: batch.revision });
  assert.equal(batch.items.find(({ id }) => id === anchor.id).excluded, false);
  assert.equal(batchHash(await readFile(sourcePath)), beforeHash);
  assert.ok((await readdir(root)).every((name) => name.startsWith("overrides.sqlite")));
  assert.equal(batch.metrics.persistedPdfs, 0); assert.equal(batch.metrics.persistedFullTexts, 0);
  const dbBytes = await readFile(statePath); assert.ok(!dbBytes.includes(Buffer.from("%PDF-"))); assert.ok(!dbBytes.includes(Buffer.from("Besteldatum:")));
  const performanceFailures = performanceChecks.filter(([, value, limit]) => value >= limit);
  const proof = { status: performanceFailures.length ? "PERFORMANCE_FAILED" : "PASS", performanceChecks, performanceFailures, sourceSha256: beforeHash, sourceOrderCount: batch.sourceOrderCount, batchOrders: batch.orderCount, batchItems: batch.itemCount,
    onlyPrinting: true, goldenPatterns: Object.keys(golden.goldenOrders), defaultSort: batch.defaultSort, overrideSurvivesRestart: true,
    excludeRestore: true, staleEditRejected: true, partialHandoff: true, confirmationIdempotentAfterRestart: true,
    v11: { thumbnailMatches: thumbnailRows.length, thumbnailBytes, totalThumbnailBytes, thumbnailRenderMs, detailItems: detail.itemCount, detailPrinted: detail.printingCount, detailThumbnailMatches: detailThumbnails.length, contextThumbnailMatches: contextThumbnails.length, sameThumbnailCache: true, detailOpenMs: detail.metrics.openMs, cachedDetailMs: cachedDetail.metrics.openMs, senior: anchor.production.sizeProfile, freeEntryFailClosed: true, correctionEventPrepared: true, fullOrderArchive: 0 },
    existingProductionValidator: selection.eligible[0].contract.validation.version, metrics: measurements, sqliteBytes: (await stat(statePath)).size, persistedPdfs: 0, persistedFullTexts: 0 };
  console.log(JSON.stringify(proof));
  if (process.env.SPORTPALEIS_BATCH_PROOF) await writeFile(process.env.SPORTPALEIS_BATCH_PROOF, JSON.stringify(proof, null, 2));
  assert.deepEqual(performanceFailures, [], "Frozen performance limits must pass");
});
