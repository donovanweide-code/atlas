import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { normalizeWebshopOrder } from "../src/sportpaleis/webshop-order-input.mjs";
import { extractPdfEvidence } from "../src/sportpaleis/webshop-pdf-evidence.mjs";
import { projectWebshopPrintBatch } from "../src/sportpaleis/webshop-batch-projection.mjs";
import { createWebshopOrderReview } from "../scripts/webshop-order-review-server.mjs";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
function mail({ uid, messageId, subject, text, inReplyTo = null, references = [], attachments = [] }) {
  const raw = Buffer.from([`Message-ID: ${messageId}`, `Subject: ${subject}`, "From: klant@example.nl", "To: bedrukking@sportpaleis.nl", "", text].join("\r\n"));
  return {
    folder: "INBOX", uidValidity: "20260903", uid, messageId, inReplyTo, references,
    from: { name: "Klant", address: "klant@example.nl" }, to: [{ name: "Sportpaleis", address: "bedrukking@sportpaleis.nl" }], cc: [], replyTo: null,
    subject, receivedAt: `2026-09-03T0${uid}:00:00.000Z`, text, html: `<p>${text}</p><img src="https://tracker.example/pixel">`,
    attachments: attachments.map((attachment, index) => ({ id: `attachment-${uid}-${index}`, filename: attachment.filename, contentType: attachment.contentType, size: attachment.bytes.length, contentHash: sha256(attachment.bytes), dataBase64: attachment.bytes.toString("base64"), disposition: "attachment" })),
    size: raw.length, rawSha256: sha256(raw), rawDataBase64: raw.toString("base64"),
  };
}

function snapshot(messages) {
  return { status: "SUCCEEDED", mailboxId: "sportpaleis-bedrukking", folder: "INBOX", uidValidity: "20260903", highestUid: Math.max(...messages.map(({ uid }) => uid)), messages };
}


test("real mail PDF stages minimal index, canonical acceptance and deletion survive retries/restart", async (t) => {
  assert.ok(process.env.SPORTPALEIS_BATCH_PDF);
  const bytes = await readFile(process.env.SPORTPALEIS_BATCH_PDF);
  const root = await mkdtemp(path.join(tmpdir(), "spw-mail-live-"));
  const config = { filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: "Acceptance-Admin-2026!", patrick: "Acceptance-Operator-2026!", collega: "Acceptance-Store-2026!", "donovan-support": "Acceptance-Support-2026!" } };
  const store = new SportpaleisFileStore(config);
  const options = { store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), mailboxConfiguration: { configured: true } };
  let service = new SportpaleisPilotService(options); await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: config.seedPasswords.kevin });
  const source = mail({ uid: 1, messageId: "<real-acceptance@example.invalid>", subject: "Webshop", text: "Bijgaand webshoporders", attachments: [{ filename: "1-012653-order.pdf", contentType: "application/pdf", bytes }] });
  const before = await store.read();
  const start = performance.now();
  const ingested = await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  console.log("mail-intake-ms", performance.now() - start);
  assert.equal(ingested.routes[0].route, "WEBSHOP_ORDER_PDF");
  let state = await store.read();
  const matches = state.webshopIntake.matches;
  assert.equal(matches.length, 9); assert.equal(matches.reduce((n, m) => n+m.itemCount, 0), 18);
  assert.equal(state.orders.length, before.orders.length);
  assert.ok(state.webshopIntake.sources.every((s) => s.mailboxEvidence && !s.dataBase64));
  assert.ok(matches.every((m) => !m.source.originalEvidence && !m.articles.length));
  const evidence = await extractPdfEvidence({ bytes, attachmentSha256: sha256(bytes), source: { tenantId: "sportpaleis", mailboxId: "fixture", messageId: "fixture", attachmentId: "fixture" } });
  const batch = projectWebshopPrintBatch(evidence);
  const rows = batch.items.filter((row) => row.orderNumber === "2635358683");
  await t.test("legacy overrides carry production differences and exclusions without changing truth", () => {
    const beforeTruth = JSON.stringify(state.articles);
    const batchOverrides = { sourceHash: batch.sourceHash, overrides: { [rows[0].id]: { changes: { size: "140", quantity: 2, sizeProfile: "JUNIOR" }, excluded: false }, [rows[1].id]: { changes: {}, excluded: true } } };
    const normalized = normalizeWebshopOrder(state, batch, "2635358683", { batchOverrides });
    assert.equal(normalized.input.items.length, 1);
    assert.equal(normalized.input.items[0].quantity, 2);
    assert.equal(normalized.input.items[0].size, "140");
    assert.equal(normalized.input.items[0].overrides.backNumberSizeClass, "JUNIOR");
    assert.equal(normalized.reference.corrections.length, 2);
    assert.equal(JSON.stringify(state.articles), beforeTruth);
    assert.throws(() => normalizeWebshopOrder(state, batch, "2635358683", { batchOverrides: { ...batchOverrides, sourceHash: "wrong" } }), { code: "WEBSHOP_ORDER_REVIEW_REQUIRED" });
    const invalid = structuredClone(batchOverrides); invalid.overrides[rows[0].id].changes.productionSource = "guess";
    assert.throws(() => normalizeWebshopOrder(state, batch, "2635358683", { batchOverrides: invalid }), { code: "WEBSHOP_ORDER_REVIEW_REQUIRED" });
  });
  await t.test("upload automatically takes saved overrides from the source-bound provider", async () => {
    const overrideService = new SportpaleisPilotService({ ...options, webshopBatchOverrideProvider: (sourceHash, orderNumber) => {
      assert.equal(sourceHash, batch.sourceHash); assert.equal(orderNumber, "2635358683");
      return { sourceHash, overrides: { [rows[0].id]: { changes: { size: "140", quantity: 2, sizeProfile: "JUNIOR" }, excluded: false }, [rows[1].id]: { changes: {}, excluded: true } } };
    } });
    const result = await overrideService.webshopPdfOrder(admin.token, admin.csrfToken, { pdfBase64: bytes.toString("base64"), orderNumber: "2635358683", action: "preview" });
    assert.equal(result.value.items.length, 1);
    assert.equal(result.value.items[0].quantity, 2);
    assert.equal(result.value.items[0].size, "140");
    assert.equal(result.value.items[0].variants[0].personalizationValues.backNumberSizeClass, "JUNIOR");
    assert.equal((await store.read()).orders.length, before.orders.length);
  });
  const target = matches.find((m) => m.externalReference === "2635358683");
  const races = await Promise.allSettled(Array.from({ length: 5 }, () => service.webshopMatchLifecycle(admin.token, admin.csrfToken, target.id, { action: "delete", expectedRevision: target.revision })));
  assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(races.filter((r) => r.status === "rejected").every((r) => r.reason.code === "REVISION_CONFLICT"));
  const deleted = races.find((r) => r.status === "fulfilled").value;
  await assert.rejects(service.webshopPdfOrder(admin.token, admin.csrfToken, { matchId: target.id, action: "preview" }), { code: "WEBSHOP_ORDER_DELETED" });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  service = new SportpaleisPilotService({ ...options, store: new SportpaleisFileStore(config) }); await service.initialize();
  assert.equal((await store.read()).webshopIntake.matches.find((m) => m.id === target.id).status, "DELETED");
  await service.webshopMatchLifecycle(admin.token, admin.csrfToken, target.id, { action: "restore", expectedRevision: deleted.revision });
  const preview = await service.webshopPdfOrder(admin.token, admin.csrfToken, { matchId: target.id, action: "preview" });
  assert.equal(preview.value.items.length, 2);
  const results = await Promise.all(Array.from({ length: 2 }, () => service.webshopPdfOrder(admin.token, admin.csrfToken, { matchId: target.id, action: "accept", expectedReviewHash: preview.reviewHash })));
  assert.equal(new Set(results.map((r) => r.value.id)).size, 1);
  const order = results[0].value;
  assert.equal(order.productionStatus, "READY");
  await service.deleteOrder(admin.token, admin.csrfToken, order.id, { expectedRevision: order.revision });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  await assert.rejects(service.webshopPdfOrder(admin.token, admin.csrfToken, { matchId: target.id, action: "preview" }), { code: "WEBSHOP_ORDER_DELETED" });
  await assert.rejects(service.webshopPdfOrder(admin.token, admin.csrfToken, { pdfBase64: bytes.toString("base64"), orderNumber: target.externalReference, action: "preview" }), { code: "WEBSHOP_ORDER_DELETED" });
  const reoffered = mail({ uid: 2, messageId: "<same-pdf-new-envelope@example.invalid>", subject: "Opnieuw aangeboden", text: "Zelfde bron", attachments: [{ filename: "renamed.pdf", contentType: "application/pdf", bytes }] });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([reoffered]));
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  state = await store.read();
  assert.equal(state.mailboxRouting.mailbox.checkpoint.highestUid, 2, "A retry cannot move the intake checkpoint backwards");
  assert.equal(state.webshopIntake.sources.length, 1);
  assert.equal(state.orders.filter((o) => o.sourceContext?.externalReference === target.externalReference).length, 1);
  assert.equal(state.webshopIntake.matches.filter((m) => m.status === "DELETED").length, 1);
  assert.equal(state.webshopIntake.matches.length, 9);
  const tombstone = state.orders.find((o) => o.id === order.id);
  await service.restoreOrder(admin.token, admin.csrfToken, order.id, { expectedRevision: tombstone.revision });
  const restored = await service.webshopPdfOrder(admin.token, admin.csrfToken, { matchId: target.id, action: "preview" });
  assert.equal(restored.duplicate, true); assert.equal(restored.value.id, order.id);
  await service.deleteOrder(admin.token, admin.csrfToken, order.id, { expectedRevision: restored.value.revision });
  if (process.env.PLAYWRIGHT_MODULE) await t.test("normal Workspace exposes mail batch, deletion/restore and canonical acceptance", async () => {
    const review = await createWebshopOrderReview({ root });
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ channel: "msedge", headless: true });
    try {
      const user = await review.service.login({ email: "kevin@sportpaleis.nl", password: config.seedPasswords.kevin });
      const context = await browser.newContext();
      await context.addCookies([{ name: "sportpaleis_session", value: user.token, url: review.url }]);
      const page = await context.newPage();
      await page.goto(`${review.url}/webshop`);
      await page.getByText("Nieuwe batch · automatisch vanuit mail", { exact: true }).waitFor();
      const other = matches.find((m) => m.externalReference === "2635358540");
      await page.locator(`[data-action="delete-mail-intake"][data-match-id="${other.id}"]`).click();
      await page.locator(`[data-action="restore-mail-intake"][data-match-id="${other.id}"]`).click();
      await page.locator(`[data-action="preview-mail-intake"][data-match-id="${other.id}"]`).click();
      await page.locator('[data-pdf-order-summary]').waitFor();
      await page.locator('[data-action="accept-pdf-order"]').click();
      await page.waitForURL(/\/orders\/SP-/u);
      assert.ok((await store.read()).orders.some((o) => o.sourceContext?.externalReference === other.externalReference));
    } finally { await browser.close(); await review.close(); }
  });
});
