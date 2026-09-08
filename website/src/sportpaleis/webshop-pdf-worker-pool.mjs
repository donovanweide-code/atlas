import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

// Internal supervisor. Tests inject a process factory here, never through attachment input.
export function createPdfWorkerPool({ spawn = spawnPdfProcess, concurrency = 2, queueLimit = 100 } = {}) {
  let active = 0;
  let residentInputBytes = 0;
  const queue = [];
  const drain = () => {
    while (active < concurrency && queue.length) queue.shift().start();
  };
  return {
    stats: () => ({ active, queued: queue.length }),
    run(payload, { signal, timeoutMs }) {
      if (signal !== undefined && !(signal instanceof AbortSignal)) return Promise.resolve({ ok: false, code: "PDF_SIGNAL_INVALID" });
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) return Promise.resolve({ ok: false, code: "PDF_LIMITS_INVALID" });
      if (signal?.aborted) return Promise.resolve({ ok: false, code: "PDF_ABORTED" });
      if (active >= concurrency && queue.length >= queueLimit) return Promise.resolve({ ok: false, code: "PDF_QUEUE_FULL" });
      const inputBytes = payload?.bytes?.byteLength ?? 0;
      if (residentInputBytes + inputBytes > 64 * 1024 * 1024) return Promise.resolve({ ok: false, code: "PDF_QUEUE_FULL" });
      residentInputBytes += inputBytes;
      return new Promise((resolve) => {
        let child, settled = false, outcome, slotHeld = false;
        let heartbeatTimer;
        const timer = setTimeout(() => finish({ ok: false, code: "PDF_TIMEOUT" }), timeoutMs);
        const abort = () => finish({ ok: false, code: "PDF_ABORTED" });
        signal?.addEventListener("abort", abort, { once: true });
        const release = () => {
          residentInputBytes -= inputBytes;
          if (slotHeld) { slotHeld = false; active -= 1; }
          resolve(outcome);
          drain();
        };
        function finish(result) {
          if (settled) return;
          settled = true;
          outcome = result;
          clearTimeout(timer);
          clearTimeout(heartbeatTimer);
          signal?.removeEventListener("abort", abort);
          const index = queue.indexOf(job);
          if (index >= 0) queue.splice(index, 1);
          // Never admit the next process until the old process has actually exited.
          if (child) child.kill("SIGKILL");
          else release();
        }
        const job = { start() {
          if (settled) return;
          active += 1; slotHeld = true;
          try {
            child = spawn();
            child.once("close", () => {
              if (!settled) {
                settled = true;
                outcome = { ok: false, code: "PDF_WORKER_EXIT" };
                clearTimeout(timer);
                clearTimeout(heartbeatTimer);
                signal?.removeEventListener("abort", abort);
              }
              release();
            });
            child.once("error", () => finish({ ok: false, code: "PDF_WORKER_ERROR" }));
            child.on("message", (message) => {
              if (settled) return;
              if (message?.type === "heartbeat") {
                clearTimeout(heartbeatTimer);
                heartbeatTimer = setTimeout(() => finish({ ok: false, code: "PDF_HEARTBEAT_LOST" }), 15_000);
                return;
              }
              if (message?.type !== "result" || typeof message.result?.ok !== "boolean") finish({ ok: false, code: "PDF_WORKER_PROTOCOL" });
              else finish(validateResult(message.result, payload.limits));
            });
            heartbeatTimer = setTimeout(() => finish({ ok: false, code: "PDF_HEARTBEAT_LOST" }), 15_000);
            child.send(payload, (error) => { if (error) finish({ ok: false, code: "PDF_WORKER_ERROR" }); });
          } catch {
            finish({ ok: false, code: "PDF_WORKER_ERROR" });
          }
        } };
        if (active < concurrency) job.start(); else queue.push(job);
      });
    },
  };
}

function validateResult(result, limits = { maxPages: 500, maxTextChars: 1_000_000, maxTextItems: 100_000 }) {
  const invalid = { ok: false, code: "PDF_WORKER_PROTOCOL" };
  if (!result.ok) {
    const codes = ["PDF_EMPTY", "PDF_PAGE_LIMIT", "PDF_TEXT_LIMIT", "PDF_MEMORY_LIMIT", "PDF_OCR_REQUIRED", "PDF_PASSWORD_PROTECTED", "PDF_UNREADABLE"];
    return codes.includes(result.code) ? { ok: false, code: result.code } : invalid;
  }
  const evidence = result.evidence;
  if (!evidence || !Number.isSafeInteger(evidence.pageCount) || evidence.pageCount < 1 || evidence.pageCount > limits.maxPages || !Array.isArray(evidence.pages) || evidence.pages.length !== evidence.pageCount) return invalid;
  let characters = 0, count = 0;
  const pages = [];
  for (const [index, page] of evidence.pages.entries()) {
    if (page?.page !== index + 1 || typeof page.text !== "string" || !page.text.trim() || !Array.isArray(page.items)) return invalid;
    characters += page.text.length; count += page.items.length;
    if (characters > limits.maxTextChars || count > limits.maxTextItems) return invalid;
    const items = [];
    let itemCharacters = 0;
    for (const item of page.items) {
      if (!item || typeof item.originalValue !== "string" || item.page !== page.page || !Array.isArray(item.transform) || item.transform.length !== 6 || !item.transform.every(Number.isFinite) || !Number.isFinite(item.width) || !Number.isFinite(item.height) || typeof item.fontName !== "string" || item.fontName.length > 512 || typeof item.hasEOL !== "boolean") return invalid;
      itemCharacters += item.originalValue.length + 1;
      if (itemCharacters > page.text.length) return invalid;
      items.push({ originalValue: item.originalValue, page: item.page, transform: [...item.transform], width: item.width, height: item.height, fontName: item.fontName, hasEOL: item.hasEOL });
    }
    if (items.map((item) => item.originalValue + (item.hasEOL ? "\n" : " ")).join("") !== page.text) return invalid;
    pages.push({ page: page.page, text: page.text, items });
  }
  return { ok: true, evidence: { pageCount: pages.length, pages } };
}

function spawnPdfProcess() {
  const source = fileURLToPath(new URL("./", import.meta.url));
  const dependencies = fileURLToPath(new URL("../../node_modules/", import.meta.url));
  return fork(new URL("./webshop-pdf-worker.mjs", import.meta.url), [], {
    // No parent credentials, NODE_OPTIONS, database configuration or provider secrets.
    env: process.platform === "win32" ? { SystemRoot: process.env.SystemRoot ?? "C:\\Windows" } : {},
    // pdfjs loads the existing native canvas dependency even for text extraction.
    // Native addons mean these Node permissions are NOT an OS security sandbox.
    execArgv: ["--max-old-space-size=256", "--permission", "--allow-addons", `--allow-fs-read=${source}`, `--allow-fs-read=${dependencies}`, "--no-warnings"],
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    windowsHide: true,
  });
}
