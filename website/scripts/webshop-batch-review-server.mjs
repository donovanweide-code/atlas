import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { extractPdfEvidence } from "../src/sportpaleis/webshop-pdf-evidence.mjs";
import { batchHash, projectWebshopPrintBatch, validateBatchValues, PRINT_TYPES } from "../src/sportpaleis/webshop-batch-projection.mjs";
import { BatchOverrideStore } from "../src/sportpaleis/webshop-batch-overrides.mjs";
import { createBatchPlotJobDryRun } from "../src/sportpaleis/webshop-batch-plotjob.mjs";

const assets = new Map([["/", "index.html"], ["/batch.js", "batch.js"], ["/batch.css", "batch.css"]]);
const error = (message, code = "INVALID_REQUEST", statusCode = 400) => Object.assign(new Error(message), { code, statusCode });
const editable = ["articleNumber", "description", "size", "color", "quantity", "personalizations", "sizeProfile", "customProfile"];
export async function createWebshopBatchReview({ sourcePath, statePath, port = 0 }) {
  const store = new BatchOverrideStore(statePath);
  const sessions = new Map();
  const counters = { batchParses: 0, detailParses: 0, thumbnailBuilds: 0 };
  let batch = null, pendingLoad = null, sourceStamp, adapter;
  let metrics = {};
  const previews = new Map();
  const details = new Map(), thumbnails = new Map(), imageKeys = new Set();
  let pendingDetail = Promise.resolve();
  async function load() {
    if (pendingLoad) return pendingLoad;
    pendingLoad = (async () => {
      const metadata = await stat(sourcePath);
      const stamp = `${metadata.size}:${metadata.mtimeMs}`;
      if (batch && sourceStamp === stamp) return;
      if (metadata.size > 8 * 1024 * 1024) throw error("Deze bron is groter dan 8 MB.", "PDF_SIZE_LIMIT");
      const before = process.memoryUsage().rss, start = performance.now();
      const bytes = await readFile(sourcePath);
      counters.batchParses += 1;
      const result = await extractPdfEvidence({ bytes, attachmentSha256: batchHash(bytes), source: {
        tenantId: "sportpaleis", mailboxId: "local-supplied-source", messageId: "local-source-review", attachmentId: "supplied-webshop-pdf",
      } });
      const parsedAt = performance.now();
      const projected = projectWebshopPrintBatch(result);
      const structuredAt = performance.now();
      adapter ??= createBatchPlotJobDryRun();
      batch = projected; sourceStamp = stamp; previews.clear(); details.clear(); imageKeys.clear();
      metrics = { pdfParseMs: parsedAt - start, structuredMs: structuredAt - parsedAt, firstBatchMs: structuredAt - start,
        rssDeltaBytes: process.memoryUsage().rss - before, sourceBytes: bytes.length, pageCount: result.evidence.pageCount, persistedPdfs: 0, persistedFullTexts: 0, persistedFullOrders: 0 };
    })();
    try { await pendingLoad; } finally { pendingLoad = null; }
  }
  function catalogPresentation(item, timing) {
    const started = performance.now();
    const match = adapter.catalog(item);
    if (match?.imageKey) imageKeys.add(match.imageKey);
    if (timing) timing.catalogImageMatchMs += performance.now() - started;
    return match ? { ...match, thumbnail: /^[a-z0-9-]+$/u.test(match.imageKey) ? `/thumbnail/${match.imageKey}` : null } : null;
  }
  async function view(timing) {
    if (!batch) throw error("Laad eerst de batch.", "BATCH_NOT_LOADED", 409);
    const snapshot = store.snapshot(batch.sourceHash);
    const completed = new Set(snapshot.completedIds);
    const items = [];
    for (const original of batch.items) {
      const override = snapshot.overrides[original.id] ?? null;
      const item = { ...original, values: { ...original.source, ...override?.changes }, override };
      const lookupStarted = performance.now();
      const evaluated = await adapter.evaluate(item);
      if (timing) timing.productTruthMs += performance.now() - lookupStarted;
      const { contract: _contract, ...production } = evaluated;
      const candidate = override?.structuralRuleCandidate ? { version: "ORDER_CORRECTION_CANDIDATE_V1", type: "STRUCTURAL_RULE_CANDIDATE", sourceHash: batch.sourceHash, itemId: item.id, orderNumber: item.orderNumber, changes: override.changes, actor: override.actor, occurredAt: override.updatedAt, promotion: "NOT_AUTHORIZED" } : null;
      items.push({ ...item, catalog: catalogPresentation(item, timing), correctionCandidate: candidate, club: item.club ?? production.club ?? null, production, excluded: override?.excluded ?? false,
        reviewed: override?.reviewed ?? false, completed: completed.has(item.id), corrected: Boolean(override && Object.keys(override.changes).length) });
    }
    return { ...batch, items, revision: snapshot.revision, metrics: { ...metrics, ...counters }, mode: "LOCAL_DRY_RUN" };
  }
  async function update(input, actor) {
    const current = await view();
    const row = current.items.find(({ id }) => id === input.id);
    if (!row) throw error("Deze regel hoort niet bij de batch.");
    if (row.completed) throw error("Deze regel is al voorbereid in de proef.", "ALREADY_PREPARED", 409);
    const original = batch.items.find(({ id }) => id === row.id);
    const next = structuredClone(row.override ?? { changes: {}, excluded: false, reviewed: false, structuralRuleCandidate: false });
    if (input.action === "edit") {
      if (!input.values || Object.keys(input.values).some((key) => !editable.includes(key))) throw error("Onbekend bewerkveld.");
      const candidate = { ...row.values, ...input.values };
      const problems = validateBatchValues(candidate).filter(({ field }) => field !== "personalizations");
      if (problems.length || !Array.isArray(candidate.personalizations) || !candidate.personalizations.length || candidate.personalizations.length > 12 || candidate.personalizations.some((p) => !p || !Object.hasOwn(PRINT_TYPES, p.type) || typeof p.value !== "string" || p.value.length > 120)) throw error(problems[0]?.message ?? "Controleer de bedrukking.");
      candidate.personalizations = candidate.personalizations.map(({ type, value }) => ({ type, value }));
      next.changes = Object.fromEntries(editable.filter((key) => candidate[key] !== undefined && JSON.stringify(candidate[key]) !== JSON.stringify(original.source[key] ?? (key === "sizeProfile" ? "AUTO" : key === "customProfile" ? "" : undefined))).map((key) => [key, candidate[key]]));
      next.reviewed = false;
      next.structuralRuleCandidate = input.structuralRuleCandidate === true;
    } else if (input.action === "exclude") next.excluded = true;
    else if (input.action === "restore") next.excluded = false;
    else if (input.action === "reset") { next.changes = {}; next.reviewed = false; next.structuralRuleCandidate = false; }
    else if (input.action === "review") next.reviewed = true;
    else throw error("Onbekende actie.");
    store.save(original, next, input.revision, actor);
    return view();
  }
  async function preview(input, sessionId) {
    const current = await view();
    if (input.revision !== current.revision) throw error("De batch is gewijzigd. Controleer je selectie opnieuw.", "REVISION_CONFLICT", 409);
    if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 500 || new Set(input.ids).size !== input.ids.length) throw error("Selecteer één of meer regels.");
    const rows = input.ids.map((id) => current.items.find((row) => row.id === id));
    if (rows.some((row) => !row)) throw error("Een geselecteerde regel hoort niet bij deze bron.");
    const eligible = [], blocked = [], excluded = [];
    for (const row of rows) {
      if (row.excluded || row.completed) { excluded.push({ id: row.id, orderNumber: row.orderNumber, reason: row.completed ? "Al voorbereid" : "Uitgesloten" }); continue; }
      const evaluated = await adapter.evaluate({ ...row, club: batch.items.find(({ id }) => id === row.id).club });
      if (evaluated.status === "READY") eligible.push({ id: row.id, orderNumber: row.orderNumber, contract: evaluated.contract });
      else blocked.push({ id: row.id, orderNumber: row.orderNumber, reasons: evaluated.issues.map(({ message }) => message) });
    }
    const contracts = eligible.map(({ contract }) => contract);
    const id = batchHash([batch.id, current.revision, rows.map(({ id }) => id).sort(), contracts]);
    const result = { id, revision: current.revision, mode: "DRY_RUN", eligible, blocked, excluded,
      orderCount: new Set(eligible.map(({ orderNumber }) => orderNumber)).size, itemCount: eligible.length,
      selectedCount: rows.length, colorCounts: Object.fromEntries([...new Set(contracts.map((c) => c.foilColor))].map((color) => [color, contracts.filter((c) => c.foilColor === color).length])),
      pieceCount: contracts.reduce((sum, c) => sum + c.quantity, 0), colors: [...new Set(contracts.map(({ foilColor }) => foilColor))],
      sourceHash: batch.sourceHash, expiresAt: Date.now() + 10 * 60_000 };
    for (const [key, value] of previews) if (value.expiresAt < Date.now()) previews.delete(key);
    if (previews.size >= 50) previews.delete(previews.keys().next().value);
    previews.set(`${sessionId}:${id}`, result);
    return result;
  }
  async function orderDetail(number) {
    const started = performance.now();
    const timing = { sourceAccessMs: 0, parseMs: 0, reconstructMs: 0, catalogImageMatchMs: 0, productTruthMs: 0 };
    if (!batch || !batch.items.some((row) => row.orderNumber === number)) throw error("Bestelling niet beschikbaar.");
    const metadata = await stat(sourcePath);
    if (metadata.size > 8 * 1024 * 1024 || `${metadata.size}:${metadata.mtimeMs}` !== sourceStamp) throw error("De bron is gewijzigd. Vernieuw eerst de batch.", "SOURCE_CHANGED", 409);
    timing.sourceAccessMs = performance.now() - started;
    const sourceHash = batch.sourceHash;
    const anchor = batch.items.find((row) => row.orderNumber === number);
    const key = `${sourceHash}:${number}`;
    const cached = details.has(key);
    if (!cached) {
      const readStarted = performance.now();
      const bytes = await readFile(sourcePath);
      if (batchHash(bytes) !== sourceHash) throw error("De bron is gewijzigd. Vernieuw eerst de batch.", "SOURCE_CHANGED", 409);
      timing.sourceAccessMs += performance.now() - readStarted;
      counters.detailParses += 1;
      const parseStarted = performance.now();
      const evidence = await extractPdfEvidence({ bytes, attachmentSha256: sourceHash, pageNumbers: anchor.issues.some((issue) => issue.field === "orderNumber") ? undefined : anchor.sourcePages, source: { tenantId: "sportpaleis", mailboxId: "local-supplied-source", messageId: "local-source-review", attachmentId: "supplied-webshop-pdf" } });
      timing.parseMs = performance.now() - parseStarted;
      const reconstructStarted = performance.now();
      const projected = projectWebshopPrintBatch(evidence, { orderNumber: number, sourceOrderIndex: anchor.issues.some((issue) => issue.field === "orderNumber") ? null : anchor.sourceOrderIndex });
      timing.reconstructMs = performance.now() - reconstructStarted;
      if (projected.sourceWarnings.length || !projected.items.length) throw error("Deze bestelling kon niet volledig worden gelezen.");
      if (batch.sourceHash !== sourceHash) throw error("De batch is gewijzigd. Open de bestelling opnieuw.");
      if (details.size >= 8) details.delete(details.keys().next().value);
      details.set(key, projected.items);
    }
    const current = await view(timing);
    const rows = details.get(key).map((source) => source.printingRequired ? current.items.find((row) => row.id === source.id) ?? source : { ...source, catalog: catalogPresentation(source, timing) });
    return { orderNumber: number, orderDate: rows[0].orderDate, itemCount: rows.length, printingCount: rows.filter((r) => r.printingRequired).length, items: rows, metrics: { ...timing, openMs: performance.now() - started, cached, persistedFullOrders: 0 } };
  }
  const server = createServer(async (req, res) => {
    const requestStarted = performance.now();
    const origin = `http://127.0.0.1:${server.address().port}`;
    const send = (status, value, type = "application/json") => {
      const serializeStarted = performance.now();
      const serialized = type === "application/json" ? JSON.stringify(value) : value;
      res.writeHead(status, { "Server-Timing": `handler;dur=${(serializeStarted-requestStarted).toFixed(3)}, serialize;dur=${(performance.now()-serializeStarted).toFixed(3)}`, "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'" });
      res.end(serialized);
    };
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) throw error("Onbekende reviewhost.", "HOST_REJECTED", 403);
      const url = new URL(req.url, origin);
      let sessionId = String(req.headers.cookie ?? "").split(/;\s*/u).find((entry) => entry.startsWith("batch_review="))?.slice(13);
      let session = sessions.get(sessionId);
      if (session?.expiresAt < Date.now()) { sessions.delete(sessionId); session = null; }
      if (req.method === "GET" && assets.has(url.pathname)) {
        if (url.pathname === "/") {
          if (!session) {
            for (const [key, value] of sessions) if (value.expiresAt < Date.now()) sessions.delete(key);
            if (sessions.size >= 1000) throw error("Te veel actieve reviewsessies. Probeer later opnieuw.", "SESSION_LIMIT", 503);
            sessionId = randomBytes(24).toString("hex");
            session = { csrf: randomBytes(24).toString("hex"), actor: `local-review:${randomBytes(12).toString("hex")}`, expiresAt: Date.now() + 8 * 60 * 60_000 };
            sessions.set(sessionId, session);
          }
          res.setHeader("Set-Cookie", `batch_review=${sessionId}; HttpOnly; SameSite=Strict; Path=/`);
        }
        const file = assets.get(url.pathname);
        return send(200, await readFile(new URL(`../review/webshop-batch/${file}`, import.meta.url)), file.endsWith("js") ? "text/javascript" : file.endsWith("css") ? "text/css" : "text/html; charset=utf-8");
      }
      if (!session) throw error("Open de review opnieuw.", "UNAUTHENTICATED", 401);
      if (req.method === "GET" && url.pathname.startsWith("/thumbnail/")) {
        const key = url.pathname.slice(11);
        if (!/^[a-z0-9-]{1,100}$/u.test(key) || !imageKeys.has(key)) throw error("Geen productbeeld beschikbaar.", "IMAGE_UNAVAILABLE", 404);
        if (!thumbnails.has(key)) {
          const pending = (async () => {
            counters.thumbnailBuilds += 1;
            const image = await loadImage(await readFile(new URL(`../src/assets/images/sportpaleis/live-catalog/${key}.webp`, import.meta.url)));
            const canvas = createCanvas(96, 96), ctx = canvas.getContext("2d");
            const scale = Math.min(96 / image.width, 96 / image.height);
            ctx.fillStyle = "white"; ctx.fillRect(0, 0, 96, 96);
            ctx.drawImage(image, (96-image.width*scale)/2, (96-image.height*scale)/2, image.width*scale, image.height*scale);
            return canvas.toBuffer("image/webp");
          })();
          if (thumbnails.size >= 64) thumbnails.delete(thumbnails.keys().next().value);
          thumbnails.set(key, pending);
        }
        let bytes;
        try { bytes = await thumbnails.get(key); }
        catch { thumbnails.delete(key); throw error("Geen productbeeld beschikbaar.", "IMAGE_UNAVAILABLE", 404); }
        res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" });
        return res.end(bytes);
      }
      if (req.method === "GET" && url.pathname === "/api/session") return send(200, { csrf: session.csrf, actor: session.actor, mode: "LOCAL_DRY_RUN" });
      if (req.method === "GET" && url.pathname === "/api/batch") return send(200, await view());
      if (req.method !== "POST") throw error("Niet gevonden.", "NOT_FOUND", 404);
      if (req.headers.origin !== origin || req.headers["x-batch-csrf"] !== session.csrf) throw error("Open de review opnieuw en probeer het nog eens.", "CSRF_REJECTED", 403);
      let total = 0; const chunks = [];
      for await (const chunk of req) { total += chunk.length; if (total > 64 * 1024) throw error("Aanvraag te groot.", "BODY_LIMIT", 413); chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      if (url.pathname === "/api/load") {
        const start = performance.now(); await load(); const result = await view(); result.metrics.batchReadyMs = performance.now() - start;
        return send(200, result);
      }
      if (url.pathname === "/api/order") {
        const operation = pendingDetail.then(() => orderDetail(body.orderNumber));
        pendingDetail = operation.catch(() => {});
        return send(200, await operation);
      }
      if (url.pathname === "/api/override") return send(200, await update(body, session.actor));
      if (url.pathname === "/api/preview") return send(200, await preview(body, sessionId));
      if (url.pathname === "/api/confirm") {
        const previous = store.receipt(body.previewId);
        if (previous) return send(200, { ...previous, duplicate: true });
        const pending = previews.get(`${sessionId}:${body.previewId}`);
        if (!pending || pending.expiresAt < Date.now() || !pending.eligible.length || body.confirmed !== true) throw error("Controleer eerst de samenvatting.", "CONFIRMATION_REQUIRED", 409);
        if (body.revision !== pending.revision) throw error("De samenvatting is verouderd.", "REVISION_CONFLICT", 409);
        return send(200, store.confirm(pending.id, pending.sourceHash, pending.eligible.map(({ id }) => id), pending.revision, session.actor));
      }
      throw error("Niet gevonden.", "NOT_FOUND", 404);
    } catch (err) { send(err.statusCode ?? 400, { error: err.message, code: err.code ?? "REQUEST_FAILED" }); }
  });
  server.headersTimeout = 10_000; server.requestTimeout = 15_000;
  await new Promise((done) => server.listen(port, "127.0.0.1", done));
  return { server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done) => { server.close(() => { store.close(); done(); }); server.closeIdleConnections(); }) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Geef het lokale bronbestand op.");
  const review = await createWebshopBatchReview({ sourcePath, statePath: process.argv[3] ?? ".codex-tmp/webshop-batch-review/overrides.sqlite", port: Number(process.argv[4] ?? 4187) });
  console.log(`Webshop batch review: ${review.url}`);
  for (const event of ["SIGINT", "SIGTERM"]) process.once(event, async () => { await review.close(); process.exit(0); });
}
