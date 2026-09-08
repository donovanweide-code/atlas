import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { fork } from "node:child_process";
import test from "node:test";
import { extractPdfEvidence, pdfEvidenceWorkerStats, PDF_EVIDENCE_LIMITS } from "../src/sportpaleis/webshop-pdf-evidence.mjs";
import { createPdfWorkerPool } from "../src/sportpaleis/webshop-pdf-worker-pool.mjs";

// Small deterministic PDF fixture, with a valid xref; held in memory only.
function pdf(lines = ["Bestelnummer: 2635358683"], { encrypted = false } = {}) {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids = [];
  for (const line of lines) {
    const page = objects.length + 1;
    kids.push(`${page} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${page + 1} 0 R >>`);
    const escaped = line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
    const content = line ? `BT /F1 12 Tf 40 750 Td (${escaped}) Tj ET` : "";
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
  let encryptRef = "";
  if (encrypted) {
    objects.push(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${"00".repeat(32)}> /U <${"00".repeat(32)}> /P -4 >>`);
    encryptRef = `/Encrypt ${objects.length} 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>]`;
  }
  let output = "%PDF-1.7\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${encryptRef} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}
const source = () => ({ tenantId: "sportpaleis", mailboxId: "bedrukking", messageId: "test-message", attachmentId: "test-attachment" });
const request = (bytes = pdf(), extra = {}) => ({ bytes, source: source(), attachmentSha256: createHash("sha256").update(bytes).digest("hex"), ...extra });
const failClosed = (result, code) => {
  assert.equal(result.status, "QUARANTINED");
  assert.equal(result.evidence, null);
  assert.deepEqual(result.proposals, []);
  assert.equal(result.quarantine.code, code);
};

test("real child extracts page evidence, coordinates and stable source-bound identity", async () => {
  const input = request(pdf(["Bestelnummer: 2635358683", "Initialen: AB"]));
  const result = await extractPdfEvidence(input);
  assert.equal(result.status, "EVIDENCE_READY", JSON.stringify(result));
  assert.equal(result.evidence.pageCount, 2);
  assert.match(result.evidence.pages[1].text, /Initialen: AB/u);
  assert.equal(result.evidence.pages[1].items[0].page, 2);
  assert.equal(result.evidence.pages[1].items[0].transform.length, 6);
  assert.deepEqual(result.source, input.source);
  assert.deepEqual(result.proposals, []);
  const replay = await extractPdfEvidence({ ...input, filename: "renamed.pdf" });
  assert.deepEqual(replay, result);
  const other = await extractPdfEvidence({ ...input, source: { ...source(), attachmentId: "other" } });
  assert.notEqual(other.evidence.extractionId, result.evidence.extractionId);
  assert.deepEqual(pdfEvidenceWorkerStats(), { active: 0, queued: 0 });
});

test("validation rejects bad identity/hash/type/size and attempts to loosen caps", async () => {
  const cases = [
    [request(pdf(), { source: { ...source(), tenantId: "owner" } }), "PDF_SOURCE_INVALID"],
    [request(pdf(), { source: { ...source(), messageId: "\r\nforged" } }), "PDF_SOURCE_INVALID"],
    [request(pdf(), { attachmentSha256: "0".repeat(64) }), "PDF_HASH_MISMATCH"],
    [request(Buffer.alloc(0)), "PDF_EMPTY"],
    [request(Buffer.alloc(PDF_EVIDENCE_LIMITS.maxBytes + 1)), "PDF_SIZE_LIMIT"],
    [request(Buffer.from("not pdf")), "PDF_TYPE_INVALID"],
    [request(pdf(), { mimeType: "image/png" }), "PDF_TYPE_INVALID"],
    [request(pdf(), { filename: "document.exe" }), "PDF_TYPE_INVALID"],
    [request(pdf(), { limits: { timeoutMs: 30_001 } }), "PDF_LIMITS_INVALID"],
    [request(pdf(), { limits: { arbitrary: 1 } }), "PDF_LIMITS_INVALID"],
    [request(pdf(), { limits: { maxBytes: 1 } }), "PDF_SIZE_LIMIT"],
    [request(pdf(), { signal: {} }), "PDF_SIGNAL_INVALID"],
    [request(pdf(), { signal: null }), "PDF_SIGNAL_INVALID"],
  ];
  for (const [input, code] of cases) failClosed(await extractPdfEvidence(input), code);
  assert.deepEqual(pdfEvidenceWorkerStats(), { active: 0, queued: 0 });
});

test("real child rejects unreadable, encrypted, scan-only and mixed text-free pages atomically", async () => {
  for (const [bytes, code] of [
    [Buffer.from("%PDF-1.7\ncorrupt"), "PDF_UNREADABLE"],
    [pdf([""], { encrypted: true }), "PDF_PASSWORD_PROTECTED"],
    [pdf([""]), "PDF_OCR_REQUIRED"],
    [pdf(["Bestelnummer: 2635358683", ""]), "PDF_OCR_REQUIRED"],
  ]) failClosed(await extractPdfEvidence(request(bytes)), code);
});

test("page, text, RSS and deadline caps fail closed and release real child slots", async () => {
  for (const [input, code] of [
    [request(pdf(["one", "two"]), { limits: { maxPages: 1 } }), "PDF_PAGE_LIMIT"],
    [request(pdf(["too much text"]), { limits: { maxTextChars: 2 } }), "PDF_TEXT_LIMIT"],
    [request(pdf(), { limits: { maxRssBytes: 1 } }), "PDF_MEMORY_LIMIT"],
    [request(pdf(), { limits: { timeoutMs: 1 } }), "PDF_TIMEOUT"],
  ]) failClosed(await extractPdfEvidence(input), code);
  assert.deepEqual(pdfEvidenceWorkerStats(), { active: 0, queued: 0 });
  assert.equal((await extractPdfEvidence(request())).status, "EVIDENCE_READY");
});

test("abort and caller mutation cannot alter captured bytes or source", async () => {
  const controller = new AbortController();
  controller.abort();
  failClosed(await extractPdfEvidence(request(pdf(), { signal: controller.signal })), "PDF_ABORTED");
  const input = request();
  const extraction = extractPdfEvidence(input);
  input.bytes.fill(0); input.source.tenantId = "owner";
  assert.equal((await extraction).status, "EVIDENCE_READY");
  const active = new AbortController();
  const aborted = extractPdfEvidence(request(pdf(), { signal: active.signal }));
  active.abort();
  failClosed(await aborted, "PDF_ABORTED");
  assert.deepEqual(pdfEvidenceWorkerStats(), { active: 0, queued: 0 });
});

function fakeFactory() {
  const children = [];
  const spawn = () => {
    const child = new EventEmitter();
    child.send = () => {};
    child.kill = () => { child.killed = true; };
    children.push(child);
    return child;
  };
  return { children, spawn };
}
test("pool holds two slots until process close; bounded queue, queued abort, crash recovery", async () => {
  const { children, spawn } = fakeFactory();
  const pool = createPdfWorkerPool({ spawn, queueLimit: 1 });
  const first = pool.run({}, { timeoutMs: 10_000 });
  const second = pool.run({}, { timeoutMs: 10_000 });
  const abort = new AbortController();
  const queued = pool.run({}, { timeoutMs: 10_000, signal: abort.signal });
  assert.equal((await pool.run({}, { timeoutMs: 10_000 })).code, "PDF_QUEUE_FULL");
  abort.abort();
  assert.equal((await queued).code, "PDF_ABORTED");
  const next = pool.run({}, { timeoutMs: 10_000 });
  children[0].emit("message", { type: "result", result: { ok: false, code: "PDF_UNREADABLE" } });
  assert.equal(children.length, 2);
  assert.deepEqual(pool.stats(), { active: 2, queued: 1 });
  children[0].emit("close", 0);
  assert.equal((await first).code, "PDF_UNREADABLE");
  assert.equal(children.length, 3);
  children[1].emit("close", 1);
  assert.equal((await second).code, "PDF_WORKER_EXIT");
  children[2].emit("close", 1);
  assert.equal((await next).code, "PDF_WORKER_EXIT");
  assert.deepEqual(pool.stats(), { active: 0, queued: 0 });
});

test("real process crash, malformed protocol and blocked event loop are reaped", async () => {
  const children = [];
  const pool = createPdfWorkerPool({ spawn: () => {
    const child = fork(new URL("./fixtures/sportpaleis/webshop-pdf-fault-worker.mjs", import.meta.url), [], {
      env: {}, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true,
    });
    children.push(child);
    return child;
  } });
  assert.equal((await pool.run({ mode: "crash" }, { timeoutMs: 5_000 })).code, "PDF_WORKER_EXIT");
  assert.equal((await pool.run({ mode: "protocol" }, { timeoutMs: 5_000 })).code, "PDF_WORKER_PROTOCOL");
  assert.equal((await pool.run({ mode: "empty-success" }, { timeoutMs: 5_000 })).code, "PDF_WORKER_PROTOCOL");
  let ticks = 0;
  const tick = setInterval(() => { ticks += 1; }, 10);
  try {
    assert.equal((await pool.run({ mode: "hang" }, { timeoutMs: 250 })).code, "PDF_TIMEOUT");
    assert.ok(ticks > 0, "parent event loop remains responsive while child is blocked");
  } finally { clearInterval(tick); }
  assert.deepEqual(pool.stats(), { active: 0, queued: 0 });
  assert.ok(children.every((child) => child.exitCode !== null || child.signalCode !== null));
});

test("bad abort handles allocate no timer, child or queue slot", async () => {
  const { children, spawn } = fakeFactory();
  const pool = createPdfWorkerPool({ spawn });
  for (const signal of [{}, null, { aborted: false, addEventListener: "bad" }]) {
    assert.equal((await pool.run({}, { signal, timeoutMs: 1 })).code, "PDF_SIGNAL_INVALID");
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(children.length, 0);
  assert.deepEqual(pool.stats(), { active: 0, queued: 0 });
});

test("input-memory admission rejects above 64 MiB and restores capacity after abort", async () => {
  const { children, spawn } = fakeFactory();
  const pool = createPdfWorkerPool({ spawn });
  const controllers = Array.from({ length: 8 }, () => new AbortController());
  const bytes = Buffer.alloc(8 * 1024 * 1024);
  const pending = controllers.map(({ signal }) => pool.run({ bytes }, { signal, timeoutMs: 10_000 }));
  assert.equal((await pool.run({ bytes }, { timeoutMs: 10_000 })).code, "PDF_QUEUE_FULL");
  for (const controller of controllers) controller.abort();
  for (const child of children) child.emit("close", null);
  await Promise.all(pending);
  const recovered = pool.run({ bytes }, { timeoutMs: 10_000 });
  assert.equal(children.length, 3);
  children[2].emit("close", 1);
  assert.equal((await recovered).code, "PDF_WORKER_EXIT");
});

test("default admission is exactly two processes and one hundred queued jobs", async () => {
  const { children, spawn } = fakeFactory();
  const pool = createPdfWorkerPool({ spawn });
  const controllers = Array.from({ length: 102 }, () => new AbortController());
  const pending = controllers.map((controller) => pool.run({}, { signal: controller.signal, timeoutMs: 10_000 }));
  assert.deepEqual(pool.stats(), { active: 2, queued: 100 });
  assert.equal((await pool.run({}, { timeoutMs: 10_000 })).code, "PDF_QUEUE_FULL");
  for (const controller of controllers) controller.abort();
  for (const child of children) child.emit("close", null);
  assert.ok((await Promise.all(pending)).every(({ code }) => code === "PDF_ABORTED"));
  assert.equal(children.length, 2);
  assert.deepEqual(pool.stats(), { active: 0, queued: 0 });
});

test("concurrent real extractions keep identities separate, reject page 501 and oversized text-item count", async () => {
  const input = request();
  const [a, b] = await Promise.all([
    extractPdfEvidence(input),
    extractPdfEvidence({ ...input, source: { ...source(), messageId: "second-message" } }),
  ]);
  assert.equal(a.status, "EVIDENCE_READY"); assert.equal(b.status, "EVIDENCE_READY");
  assert.notEqual(a.evidence.extractionId, b.evidence.extractionId);
  a.evidence.pages[0].items[0].originalValue = "mutated";
  assert.notEqual(b.evidence.pages[0].items[0].originalValue, "mutated");
  failClosed(await extractPdfEvidence(request(pdf(Array(501).fill("order")))), "PDF_PAGE_LIMIT");
  failClosed(await extractPdfEvidence(request(pdf(["one", "two"]), { limits: { maxTextItems: 1 } })), "PDF_TEXT_LIMIT");
  assert.deepEqual(pdfEvidenceWorkerStats(), { active: 0, queued: 0 });
});
