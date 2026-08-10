import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CaptureTransport,
  DisabledSmtpTransport,
  MailFoundation,
  MailFoundationError,
  MemoryMailStore,
  createMailOrganizations,
} from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { assertFinalInvoiceMailEligible, resolveFinalInvoiceMailAttachment } from "../scripts/wbd-invoice-development-api.mjs";

const sportActor = { id: "collega", name: "Winkelmedewerker", role: "store" };
const operatorActor = { id: "patrick", name: "Patrick", role: "operator" };
const adminActor = { id: "kevin", name: "Kevin", role: "admin" };
const wbdActor = { id: "wbd-local-owner", name: "WBD", role: "owner" };

function pdfBytes() {
  return Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");
}

function sportRequest(templateKey = "ORDER_RECEIVED", overrides = {}) {
  return {
    organizationId: "sportpaleis",
    contextType: "order",
    contextId: "SP-2026-0001",
    templateKey,
    recipient: "klant@example.nl",
    context: {
      customer: { name: "Mevrouw <Test>" },
      order: { number: "SP-2026-0001", items: "1× Wedstrijdshirt · Waterwijk · Rug 34", processingDays: 3, pickupInformation: "Neem de orderreferentie mee." },
      message: { question: "Welke initialen mogen we gebruiken?" },
    },
    attachments: [],
    ...overrides,
  };
}

function wbdRequest(overrides = {}) {
  return {
    organizationId: "we-build-and-design",
    contextType: "invoice",
    contextId: "f2026-001",
    templateKey: "WBD_INVOICE_FINAL",
    recipient: "finance@example.nl",
    context: { customer: { name: "Voorbeeld B.V." }, invoice: { number: "F2026-001", project: "Foundation 002", total: "€ 121,00", payment_term: "14 dagen", due_date: "22-08-2026" } },
    attachments: [{ id: "invoice-f2026-001", filename: "factuur-F2026-001.pdf", mimeType: "application/pdf", bytes: pdfBytes() }],
    ...overrides,
  };
}

async function fixture() {
  const captureDirectory = await mkdtemp(path.join(os.tmpdir(), "mail-foundation-002-"));
  const store = new MemoryMailStore();
  const transport = new CaptureTransport({ captureDirectory });
  const foundation = new MailFoundation({ organizations: createMailOrganizations(), store, transport });
  return { foundation, store, transport, captureDirectory, cleanup: () => rm(captureDirectory, { recursive: true, force: true }) };
}

test("Sportpaleis templates renderen rolgescheiden en HTML-escaped", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const received = await f.foundation.preview(sportRequest("ORDER_RECEIVED"), sportActor);
  assert.equal(received.templateKey, "ORDER_RECEIVED");
  assert.match(received.html, /Mevrouw &lt;Test&gt;/);
  assert.doesNotMatch(received.html, /Mevrouw <Test>/);
  const ready = await f.foundation.preview(sportRequest("ORDER_READY"), operatorActor);
  assert.match(ready.text, /niet in de droger/i);
  assert.match(ready.text, /sterke warmte/i);
  const question = await f.foundation.preview(sportRequest("ORDER_QUESTION"), sportActor);
  assert.match(question.text, /Welke initialen/);
});

test("WBD definitieve factuurmail bevat gecontroleerde PDF-metadata en capturebestand", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const preview = await f.foundation.preview(wbdRequest(), wbdActor);
  assert.equal(preview.attachments.length, 1);
  assert.equal(preview.attachments[0].mimeType, "application/pdf");
  assert.equal(Object.hasOwn(preview.attachments[0], "bytes"), false);
  const result = await f.foundation.capture({ ...wbdRequest(), idempotencyKey: "wbd-final-invoice-001" }, wbdActor);
  assert.equal(result.status, "CAPTURED");
  assert.equal(result.safeResult.confirmedNotSent, true);
  const files = await readdir(f.captureDirectory);
  assert.equal(files.length, 1);
  const capture = JSON.parse(await readFile(path.join(f.captureDirectory, files[0]), "utf8"));
  assert.equal(capture.externalNetworkUsed, false);
  assert.equal(Object.hasOwn(capture.message.attachments[0], "bytes"), false);
});

test("ongeldige ontvangers, recipient injection en bulk worden geblokkeerd", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  await assert.rejects(() => f.foundation.preview(sportRequest("ORDER_RECEIVED", { recipient: "bad-address" }), sportActor), (error) => error.code === "INVALID_RECIPIENT");
  await assert.rejects(() => f.foundation.preview(sportRequest("ORDER_RECEIVED", { recipient: "a@example.nl\r\nBcc: victim@example.nl" }), sportActor), (error) => error.code === "INVALID_RECIPIENT");
  await assert.rejects(() => f.foundation.preview(sportRequest("ORDER_RECEIVED", { recipient: ["a@example.nl", "b@example.nl"] }), sportActor), (error) => error.code === "MASS_SEND_BLOCKED");
});

test("header injection via templatecontext wordt geblokkeerd", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const request = sportRequest("ORDER_RECEIVED");
  request.context.order.number = "SP-1\r\nBcc: victim@example.nl";
  await assert.rejects(() => f.foundation.preview(request, sportActor), (error) => error.code === "TEMPLATE_RENDER_FAILED");
});

test("server-side permissions en cross-organization toegang worden geweigerd", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  await assert.rejects(() => f.foundation.preview(sportRequest("ORDER_READY"), sportActor), (error) => error.code === "PERMISSION_DENIED");
  await assert.rejects(() => f.foundation.preview(wbdRequest(), adminActor), (error) => error.code === "PERMISSION_DENIED");
  await assert.rejects(() => f.foundation.history({ organizationId: "we-build-and-design", contextType: "invoice", contextId: "f2026-001" }, adminActor), (error) => error.code === "PERMISSION_DENIED");
  assert.equal((await f.foundation.events()).some(({ name }) => name === "MAIL_PERMISSION_DENIED"), true);
});

test("idempotency voorkomt dubbele capture en detecteert payloadconflict", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const request = { ...sportRequest(), idempotencyKey: "sport-mail-duplicate-001" };
  const first = await f.foundation.capture(request, sportActor);
  const second = await f.foundation.capture(request, sportActor);
  assert.equal(first.id, second.id);
  assert.equal(second.duplicate, true);
  assert.equal((await readdir(f.captureDirectory)).length, 1);
  await assert.rejects(() => f.foundation.capture({ ...request, recipient: "other@example.nl" }, sportActor), (error) => error.code === "DUPLICATE_SEND_REQUEST");
});

test("failure, timeout en UNKNOWN_PARTIAL_SEND hebben veilige retrysemantiek", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const failed = await f.foundation.capture({ ...sportRequest(), idempotencyKey: "simulation-failure-001" }, sportActor, { simulation: "failure" });
  assert.equal(failed.status, "TRANSPORT_FAILED");
  assert.equal(failed.safeResult.confirmedNotSent, true);
  const timeout = await f.foundation.capture({ ...sportRequest(), idempotencyKey: "simulation-timeout-001" }, sportActor, { simulation: "timeout" });
  assert.equal(timeout.status, "TIMEOUT");
  assert.equal(timeout.safeResult.confirmedNotSent, true);
  const unknown = await f.foundation.capture({ ...sportRequest(), idempotencyKey: "simulation-unknown-001" }, sportActor, { simulation: "unknown" });
  assert.equal(unknown.status, "UNKNOWN_PARTIAL_SEND");
  assert.equal(unknown.attentionRequired, true);
  assert.equal(unknown.automaticRetryAllowed, false);
});

test("bijlagebron, padtraversal en MIME-spoofing worden geblokkeerd", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  await assert.rejects(() => f.foundation.preview(wbdRequest({ attachments: [{ filename: "../../secret.pdf", mimeType: "application/pdf", path: "../../secret.pdf" }] }), wbdActor), (error) => error.code === "ATTACHMENT_INVALID");
  await assert.rejects(() => f.foundation.preview(wbdRequest({ attachments: [{ filename: "invoice.pdf", mimeType: "application/pdf", bytes: Buffer.from("not a pdf") }] }), wbdActor), (error) => error.code === "ATTACHMENT_MIME_MISMATCH");
  await assert.rejects(() => f.foundation.preview(wbdRequest({ attachments: [{ filename: "invoice.pdf", mimeType: "text/plain", bytes: pdfBytes() }] }), wbdActor), (error) => error.code === "ATTACHMENT_MIME_MISMATCH");
});

test("secrets lekken niet naar preview, capture, history of events", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const request = sportRequest();
  request.context.smtp_secret = "do-not-leak";
  await assert.rejects(() => f.foundation.preview(request, sportActor), (error) => error.code === "SECRET_BOUNDARY_VIOLATION");
  const clean = await f.foundation.capture({ ...sportRequest(), idempotencyKey: "secret-clean-capture-001" }, sportActor);
  const history = await f.foundation.history({ organizationId: "sportpaleis", contextType: "order", contextId: "SP-2026-0001" }, adminActor);
  const events = await f.foundation.events();
  assert.doesNotMatch(JSON.stringify({ clean, history, events }), /do-not-leak|smtp_secret|password/i);
});

test("SMTP-adapter is contractueel aanwezig maar technisch hard uitgeschakeld", async () => {
  const smtp = new DisabledSmtpTransport({ host: "smtp.transip.email", port: 465, tls: "TLS/SSL", usernameStatus: "REQUIRES_SECRET_REFERENCE", secretReference: "SMTP_WBD_PASSWORD" });
  assert.equal(smtp.publicSummary().realSendEnabled, false);
  assert.equal(smtp.externalNetworkEnabled, false);
  assert.equal(Object.hasOwn(smtp.publicSummary(), "secretReference"), false);
  await assert.rejects(() => smtp.send({}), (error) => error.code === "SMTP_SEND_DISABLED");
});

test("CaptureTransport heeft geen netwerkpad en observability bevat alle uitkomsten", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  assert.equal(f.transport.externalNetworkEnabled, false);
  await f.foundation.preview(sportRequest(), sportActor);
  await f.foundation.capture({ ...sportRequest(), idempotencyKey: "observability-success-001" }, sportActor);
  await f.foundation.capture({ ...sportRequest(), idempotencyKey: "observability-failed-001" }, sportActor, { simulation: "failure" });
  await f.foundation.capture({ ...sportRequest(), idempotencyKey: "observability-unknown-001" }, sportActor, { simulation: "unknown" });
  const names = new Set((await f.foundation.events()).map(({ name }) => name));
  for (const name of ["MAIL_RENDERED", "MAIL_SEND_ATTEMPTED", "MAIL_SEND_SUCCEEDED", "MAIL_SEND_FAILED", "MAIL_SEND_UNKNOWN"]) assert.equal(names.has(name), true);
});

test("rate limiting begrenst transactionele abuse", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  for (let index = 0; index < 10; index += 1) {
    await f.foundation.capture({ ...sportRequest(), idempotencyKey: `rate-limit-mail-${String(index).padStart(3, "0")}` }, sportActor);
  }
  await assert.rejects(() => f.foundation.capture({ ...sportRequest(), idempotencyKey: "rate-limit-mail-blocked" }, sportActor), (error) => error.code === "RATE_LIMITED");
});

test("organization summaries tonen vastgestelde providerconfig maar nooit credentials", async (t) => {
  const f = await fixture(); t.after(f.cleanup);
  const sport = f.foundation.organizationSummary("sportpaleis");
  assert.equal(sport.smtp.host, "mail.hostingserver.nl");
  assert.equal(sport.smtp.port, 465);
  assert.equal(sport.smtp.usernameStatus, "REQUIRES_SECRET_REFERENCE");
  assert.equal(sport.smtp.realSendEnabled, false);
  const serialized = JSON.stringify(sport);
  assert.doesNotMatch(serialized, /smtp_secret|password|authorization/i);
});

test("MailFoundationError levert alleen veilige foutvelden", () => {
  const error = new MailFoundationError("TRANSPORT_FAILED", "Veilige fout", 502);
  assert.equal(error.code, "TRANSPORT_FAILED");
  assert.equal(error.statusCode, 502);
  assert.equal(Object.hasOwn(error, "credentials"), false);
});

test("WBD adapter blokkeert concepten en levert de bestaande definitieve PDF server-side", async () => {
  assert.throws(() => assertFinalInvoiceMailEligible({ document_status: "concept", workspace: { locked: false } }), /Alleen een definitieve/);
  const resolved = await resolveFinalInvoiceMailAttachment("sportpaleis-f00248-concept");
  assert.equal(resolved.invoice.document_status, "final");
  assert.equal(resolved.invoice.workspace.locked, true);
  assert.equal(resolved.attachment.mimeType, "application/pdf");
  assert.equal(resolved.attachment.bytes.subarray(0, 5).toString("ascii"), "%PDF-");
});

test("Sportpaleis orderadapter gebruikt bestaande sessies, rollen, ordercontext en gedeelde history", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mail-sportpaleis-adapter-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const passwords = { kevin: "Mail-Kevin-002!veilig", patrick: "Mail-Patrick-002!veilig", collega: "Mail-Collega-002!veilig", "donovan-support": "Mail-Support-002!veilig" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "sportpaleis.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "captures") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", releaseId: "MAIL-002-TEST" });
  await service.initialize();
  const colleague = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  const patrick = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const kevin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const order = (await service.createOrder(colleague.token, colleague.csrfToken, {
    customer: "Capture Klant", customerEmail: "capture-klant@example.nl", customerPhone: "06 12345678",
    standardPersonalization: { initials: "CK", name: "CAPTURE", backNumber: "34", shortsNumber: "34" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
  }, "mail-adapter-order-0001")).value;
  const received = await service.previewOrderMail(colleague.token, order.id, { templateKey: "ORDER_RECEIVED" });
  assert.equal(received.recipient, "capture-klant@example.nl");
  assert.match(received.text, new RegExp(order.id));
  await assert.rejects(() => service.previewOrderMail(colleague.token, order.id, { templateKey: "ORDER_READY" }), (error) => error.code === "PERMISSION_DENIED");
  const ready = await service.captureOrderMail(patrick.token, patrick.csrfToken, order.id, { templateKey: "ORDER_READY" }, "sport-adapter-ready-0001");
  assert.equal(ready.status, "CAPTURED");
  const history = await service.orderMailHistory(kevin.token, order.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].templateKey, "ORDER_READY");
});
