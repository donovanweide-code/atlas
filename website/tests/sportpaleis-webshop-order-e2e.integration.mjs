import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWebshopOrderReview } from "../scripts/webshop-order-review-server.mjs";
import { buildProductionJobSnapshot, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { extractPdfEvidence } from "../src/sportpaleis/webshop-pdf-evidence.mjs";
import { batchHash, projectWebshopPrintBatch } from "../src/sportpaleis/webshop-batch-projection.mjs";

if (!process.env.SPORTPALEIS_BATCH_PDF) throw new Error("SPORTPALEIS_BATCH_PDF is required: real PDF, not a synthetic substitute.");
test("real PDF → canonical persisted order → normal detail and production composition", async (t) => {
  const bytes = await readFile(process.env.SPORTPALEIS_BATCH_PDF);
  const sha256 = batchHash(bytes);
  const root = await mkdtemp(path.join(tmpdir(), "spw-pdf-order-e2e-"));
  const review = await createWebshopOrderReview({ root });
  t.after(() => review.close());
  const { service, store } = review;
  const secondService = new SportpaleisPilotService({ store: new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups") }), websiteSource: {}, mailMode: "capture", prewarmProductionBuildIsolation: false });
  const actor = await service.login({ email: "patrick@sportpaleis.nl", password: "Local-Canary-Only-2026!" });
  const other = await service.login({ email: "collega@sportpaleis.nl", password: "Local-Canary-Only-2026!" });
  const request = { pdfBase64: bytes.toString("base64"), filename: "1-012653-order.pdf", orderNumber: "2635358683", action: "preview" };
  const before = await store.read();
  let preview, order;
  const nameOrderIds = [];
  await t.test("preview reconstructs all and only printed items and persists nothing", async () => {
    preview = await service.webshopPdfOrder(actor.token, actor.csrfToken, request);
    assert.deepEqual(preview.value.items.map((item) => item.articleNumber), ["116597", "141521"]);
    assert.deepEqual(preview.value.items.map((item) => [item.size, item.quantity]), [["XL", 1], ["L", 1]]);
    assert.equal(preview.value.items[0].variants[0].personalizationValues.backNumber, "88");
    assert.equal(preview.value.items[0].variants[0].personalizationValues.backNumberSizeClass, "SENIOR");
    assert.deepEqual((await store.read()).orders, before.orders);
    assert.deepEqual(preview.value.sourceContext.webshopPdf.pages, [122]);
    assert.equal(preview.value.sourceContext.webshopPdf.orderDate, "2026-08-26");
  });
  await t.test("explicit confirmation is source/truth fenced", async () => {
    await assert.rejects(service.webshopPdfOrder(actor.token, actor.csrfToken, { ...request, action: "accept", expectedReviewHash: "stale" }), { code: "WEBSHOP_REVIEW_CONFLICT" });
    assert.equal((await store.read()).orders.length, before.orders.length);
  });
  await t.test("cross-user concurrent accept commits exactly one normal order", async () => {
    const input = { ...request, action: "accept", expectedReviewHash: preview.reviewHash };
    const results = await Promise.all([[actor, service], [other, secondService]].map(([user, instance]) => instance.webshopPdfOrder(user.token, user.csrfToken, input)));
    assert.equal(results.filter((value) => !value.duplicate).length, 1);
    assert.equal(results[0].value.id, results[1].value.id);
    order = results[0].value;
    assert.equal((await store.read()).orders.length, before.orders.length + 1);
    assert.equal(order.sourceContext.webshopPdf.sha256, sha256);
    assert.equal(order.sourceContext.source, "WEBSHOP_XPRT");
  });
  await t.test("normal detail and production read model see the canonical order", async () => {
    const detail = await service.order(actor.token, order.id);
    assert.equal(detail.productionStatus, "READY");
    assert.equal(detail.orderKind, "INDIVIDUAL");
    assert.equal(detail.items.length, 2);
    assert.ok(detail.productionLines.every((line) => line.validation.status === "VALID" && line.source.sha256));
    const bootstrap = await service.bootstrap(actor.token);
    assert.equal(bootstrap.orders.find(({ id }) => id === order.id).productionStatus, "READY");
    const response = await fetch(`${review.url}/api/sportpaleis/v1/orders/${order.id}`, { headers: { Cookie: `sportpaleis_session=${actor.token}` } });
    assert.equal(response.status, 200); assert.equal((await response.json()).id, order.id);
  });
  let snapshot;
  await t.test("existing production composition materializes real font contours without output", async () => {
    const state = await store.read();
    snapshot = buildProductionJobSnapshot(state, [state.orders.find(({ id }) => id === order.id)], "PLOT-2026-9998", undefined, root, root, undefined, { persistArtifacts: false });
    assert.ok(snapshot.layout.closedContourCount > 0);
    assert.equal(snapshot.productionLines.length, 2);
    assert.ok(snapshot.layout.placements.every((item) => item.sourceOrderId === order.id));
    assert.deepEqual((await store.read()).productionJobs, before.productionJobs);
    for (const key of ["articles", "associations", "productionProfiles"]) assert.deepEqual((await store.read())[key], before[key]);
  });
  await t.test("blocked printed line blocks whole order and never creates partial order", async () => {
    for (const orderNumber of ["2635358543", "2635358616", "2635358663"]) await assert.rejects(service.webshopPdfOrder(actor.token, actor.csrfToken, { ...request, orderNumber }), { code: "WEBSHOP_ORDER_REVIEW_REQUIRED" });
    assert.equal((await store.read()).orders.length, before.orders.length + 1);
  });
  await t.test("source conflict and changed corrections never silently overwrite accepted order", async () => {
    const itemId = order.sourceContext.webshopPdf.itemIds[0];
    await assert.rejects(service.webshopPdfOrder(actor.token, actor.csrfToken, { ...request, corrections: { [itemId]: { quantity: 2 } } }), { code: "WEBSHOP_SOURCE_CONFLICT" });
    const again = await service.webshopPdfOrder(other.token, other.csrfToken, { ...request, filename: "renamed-order.pdf" });
    assert.equal(again.duplicate, true); assert.equal(again.value.id, order.id);
  });
  await t.test("DE VRIES and VAN DER MEER survive source correction, canonical storage and output", async () => {
    const evidence = await extractPdfEvidence({ bytes, attachmentSha256: sha256, source: { tenantId: "sportpaleis", mailboxId: "test", messageId: "test", attachmentId: sha256 } });
    const batch = projectWebshopPrintBatch(evidence);
    for (const [orderNumber, value] of [["2635358540", "DE VRIES"], ["2635358566", "VAN DER MEER"]]) {
      const row = batch.items.find((row) => row.orderNumber === orderNumber && row.values.personalizations.some((p) => ["BACK_NAME", "NAME_PRINT"].includes(p.type)));
      assert.ok(row);
      const corrections = { [row.id]: { personalizations: row.values.personalizations.map((p) => ["BACK_NAME", "NAME_PRINT"].includes(p.type) ? { ...p, value } : p) } };
      const input = { ...request, orderNumber, corrections };
      const checked = await service.webshopPdfOrder(actor.token, actor.csrfToken, input);
      const accepted = await service.webshopPdfOrder(actor.token, actor.csrfToken, { ...input, action: "accept", expectedReviewHash: checked.reviewHash });
      const detail = await service.order(actor.token, accepted.value.id);
      nameOrderIds.push(detail.id);
      assert.ok(detail.items.some((item) => item.variants.some((variant) => variant.personalizationValues.name === value)));
      assert.ok(detail.productionLines.some((line) => line.content === value));
      const state = await store.read();
      const output = buildProductionJobSnapshot(state, [state.orders.find(({ id }) => id === detail.id)], "PLOT-2026-9999", undefined, root, root, undefined, { persistArtifacts: false });
      assert.ok(output.productionLines.some((line) => line.content === value));
      assert.ok(output.layout.closedContourCount > 0);
    }
  });
  await t.test("normal Bedrukken UI preserves spaces while typing, and shows the PDF order", async () => {
    if (!process.env.PLAYWRIGHT_MODULE) throw new Error("PLAYWRIGHT_MODULE is required for browser proof.");
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ channel: "msedge", headless: true });
    try {
      const context = await browser.newContext();
      await context.addCookies([{ name: "sportpaleis_session", value: actor.token, url: review.url }]);
      const page = await context.newPage();
      await page.goto(`${review.url}/orders/${order.id}`);
      await page.getByText(`${order.id} · 2 stuks`, { exact: true }).waitFor();
      assert.match(await page.locator("body").innerText(), /88/u);
      await page.goto(`${review.url}/productie`);
      const selection = page.locator(`[data-direct-production-order-select$="|${order.id}"]`);
      const group = page.locator("details").filter({ has: selection }).first();
      await group.locator("summary").click();
      assert.equal(await selection.isChecked(), true);
      assert.match(await group.innerText(), /88 × 1/u);
      await page.goto(`${review.url}/orders/nieuw?edit=${nameOrderIds[0]}`);
      const name = page.locator('[data-standard-field="name"]');
      await name.waitFor();
      for (const value of ["DE VRIES", "VAN DER MEER"]) {
        await name.fill(""); await name.pressSequentially(value);
        assert.equal(await name.inputValue(), value);
        assert.equal(await name.evaluate((input) => input.checkValidity()), true, await name.evaluate((input) => input.validationMessage));
      }
      await page.goto(`${review.url}/webshop`);
      await page.locator('[name="pdf"]').setInputFiles(process.env.SPORTPALEIS_BATCH_PDF);
      await page.locator('[name="orderNumber"]').fill(request.orderNumber);
      await page.locator('[data-pdf-order-form] button').click();
      await page.waitForURL(`${review.url}/orders/${order.id}`);
      assert.equal((await store.read()).orders.filter((item) => item.sourceContext?.externalReference === request.orderNumber).length, 1);
    } finally { await browser.close(); }
  });
  await t.test("only ordinary orders and minimal provenance persisted; source unchanged", async () => {
    const persisted = await readFile(path.join(root, "state.json"), "utf8");
    assert.ok(!persisted.includes(request.pdfBase64));
    assert.ok(!persisted.includes('"originalValue"'));
    assert.ok(!persisted.includes('"textPages"'));
    assert.equal(batchHash(await readFile(process.env.SPORTPALEIS_BATCH_PDF)), sha256);
    assert.deepEqual((await store.read()).productionJobs, before.productionJobs);
  });
  const proof = { canary: order.id, externalReference: request.orderNumber, sha256, pages: [122], sourceItemIds: order.sourceContext.webshopPdf.itemIds, canonicalInputHash: order.sourceContext.webshopPdf.inputHash, items: order.items.map((item) => ({ id: item.id, articleNumber: item.articleNumber, productionProfileId: item.productionProfileId, size: item.size, quantity: item.quantity })), productionLines: order.productionLines.map((line) => ({ id: line.id, itemId: line.itemId, content: line.content, source: line.source, heightMm: line.heightMm, quantity: line.quantity })), productionStatus: order.productionStatus, contourCount: snapshot?.layout.closedContourCount, storage: { fullPdf: 0, fullText: 0, fullOrderArchive: 0 }, physicalOutput: false };
  if (process.env.SPORTPALEIS_ORDER_PROOF) await writeFile(process.env.SPORTPALEIS_ORDER_PROOF, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
});
