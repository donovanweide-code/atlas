import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { inspectProductionAssetSvg } from "./production-assets-svg.mjs";

export const TEAMKIT_PROPOSAL_STATUSES = Object.freeze([
  "DRAFT", "WAITING_FOR_CUSTOMER_INPUT", "READY_FOR_DESIGN", "IN_DESIGN", "READY_FOR_REVIEW",
  "SENT_TO_CUSTOMER", "CUSTOMER_FEEDBACK", "READY_FOR_APPROVAL", "APPROVED", "ARCHIVED",
]);
export const TEAMKIT_FULFILLMENT_ROUTES = Object.freeze(["INTERN_BEDRUKKEN", "EXTERNE_BEDRUKKER", "NOG_TE_BEPALEN"]);
export const TEAMKIT_PLACEMENT_PRESETS = Object.freeze(["LINKERBORST", "RECHTERBORST", "MIDDENBORST", "RUG_BOVEN", "RUG_MIDDEN", "MOUW_LINKS", "MOUW_RECHTS", "SHORT_LINKS", "SHORT_RECHTS", "BROEK", "TAS"]);
const SOURCE_LIMIT_BYTES = 8 * 1024 * 1024;
const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIME_BY_EXTENSION = Object.freeze({
  svg: "image/svg+xml", pdf: "application/pdf", eps: "application/postscript", ai: "application/illustrator",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
});

function error(message, code, statusCode = 400, extra = {}) {
  return Object.assign(new Error(message), { code, statusCode, ...extra });
}

export function proposalSha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ""), "hex"); const b = Buffer.from(String(right ?? ""), "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function text(value, label, maximum = 240, required = true) {
  const normalized = String(value ?? "").trim().replace(/\s+/gu, " ");
  if (required && !normalized) throw error(`${label} is verplicht.`, "PROPOSAL_FIELD_REQUIRED");
  if (normalized.length > maximum) throw error(`${label} is te lang.`, "PROPOSAL_FIELD_TOO_LONG");
  return normalized;
}

function nullableText(value, label, maximum = 240) {
  const normalized = text(value, label, maximum, false); return normalized || null;
}

function email(value) {
  const normalized = text(value, "E-mailadres", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized) || /[\r\n]/u.test(normalized)) throw error("Gebruik één geldig e-mailadres.", "PROPOSAL_EMAIL_INVALID");
  return normalized;
}

function boundedNumber(value, label, minimum, maximum, nullable = false) {
  if ((value === "" || value === null || value === undefined) && nullable) return null;
  const number = Number(value); if (!Number.isFinite(number) || number < minimum || number > maximum) throw error(`${label} is ongeldig.`, "PROPOSAL_NUMBER_INVALID");
  return number;
}

function extension(filename) { return String(filename).toLowerCase().split(".").at(-1) ?? ""; }

function pngDimensions(bytes) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1]; const size = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    if (size < 2) break; offset += 2 + size;
  }
  return null;
}

function sourceQuality(format, bytes, dimensions) {
  if (["SVG", "EPS", "AI"].includes(format)) return { status: "VECTOR_SUITABLE", widthPx: null, heightPx: null, message: format === "SVG" ? "Vectorbestand — geschikt voor professionele uitwerking." : "Vectorbrontype — inhoud blijft vóór productie menselijk gecontroleerd." };
  if (format === "PDF") return { status: "UNKNOWN_REVIEW", widthPx: null, heightPx: null, message: "PDF opgeslagen — controleer of deze echte vectorinhoud bevat." };
  const width = dimensions?.width ?? null; const height = dimensions?.height ?? null; const minimum = Math.min(width ?? 0, height ?? 0);
  if (minimum >= 1600 || bytes.length >= 1_500_000) return { status: "RASTER_HIGH_RES_REVIEW", widthPx: width, heightPx: height, message: "Rasterbestand met bruikbare resolutie — controleer vóór productie." };
  return { status: "LOW_RES_BETTER_SOURCE_REQUIRED", widthPx: width, heightPx: height, message: "Referentiebeeld — vraag een SVG, EPS, AI of echte vector-PDF voor productie." };
}

export function inspectTeamkitProposalSource(input, context) {
  const filename = text(input.filename, "Bestandsnaam", 180); const ext = extension(filename); const expectedMime = MIME_BY_EXTENSION[ext];
  if (!expectedMime) throw error("Gebruik SVG, EPS, AI, PDF, PNG of JPG.", "PROPOSAL_SOURCE_TYPE_UNSUPPORTED");
  const declaredMime = String(input.mimeType ?? "").toLowerCase();
  if (declaredMime && declaredMime !== expectedMime && !(ext === "jpg" && declaredMime === "image/jpeg")) throw error("Bestandstype en bestandsnaam komen niet overeen.", "PROPOSAL_SOURCE_MIME_MISMATCH");
  let bytes; try { bytes = Buffer.from(String(input.dataBase64 ?? ""), "base64"); } catch { bytes = Buffer.alloc(0); }
  if (!bytes.length || bytes.length > SOURCE_LIMIT_BYTES) throw error("Een bronbestand moet leesbaar en maximaal 8 MB zijn.", "PROPOSAL_SOURCE_SIZE_INVALID", bytes.length > SOURCE_LIMIT_BYTES ? 413 : 400);
  const format = ext === "jpeg" ? "JPG" : ext.toUpperCase(); let safePreviewSvg = null; let dimensions = null;
  if (format === "SVG") {
    const inspected = inspectProductionAssetSvg({ bytes, filename, mimeType: expectedMime, intakeKind: "ARTWORK" });
    safePreviewSvg = inspected.documentPreviewSvg;
  } else if (format === "PDF" && bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw error("De PDF-inhoud is ongeldig.", "PROPOSAL_SOURCE_SIGNATURE_INVALID");
  else if (format === "EPS" && !bytes.subarray(0, 11).toString("ascii").startsWith("%!PS-Adobe")) throw error("De EPS-inhoud is ongeldig.", "PROPOSAL_SOURCE_SIGNATURE_INVALID");
  else if (format === "AI" && !["%PDF-", "%!PS-"].some((prefix) => bytes.subarray(0, 5).toString("ascii").startsWith(prefix))) throw error("De AI-bron heeft geen herkenbare PDF/PostScript-inhoud.", "PROPOSAL_SOURCE_SIGNATURE_INVALID");
  else if (format === "PNG" && !(dimensions = pngDimensions(bytes))) throw error("De PNG-inhoud is ongeldig.", "PROPOSAL_SOURCE_SIGNATURE_INVALID");
  else if (format === "JPG" && !(dimensions = jpegDimensions(bytes))) throw error("De JPG-inhoud is ongeldig.", "PROPOSAL_SOURCE_SIGNATURE_INVALID");
  const id = `proposal-source-${randomUUID()}`; const now = context.now ?? new Date().toISOString();
  return {
    id, filename, mimeType: expectedMime, format, sha256: proposalSha256(bytes), sizeBytes: bytes.length, immutable: true,
    dataBase64: bytes.toString("base64"), safePreviewSvg, uploadedAt: now,
    uploader: { kind: context.uploaderKind, id: text(context.uploaderId, "Uploader", 120), name: text(context.uploaderName, "Uploader", 160) },
    proposalId: context.proposalId, associationName: nullableText(context.associationName, "Vereniging", 160), version: 1,
    quality: sourceQuality(format, bytes, dimensions), promotedProductionSourceId: null,
  };
}

export function createCustomerAccess(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    access: { id: `proposal-access-${randomUUID()}`, tokenHash: proposalSha256(token), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + ACCESS_TTL_MS).toISOString(), revokedAt: null, lastOpenedAt: null },
  };
}

export function findProposalByCustomerToken(state, token, now = new Date()) {
  const hash = proposalSha256(String(token ?? ""));
  const proposal = (state.teamkitProposals ?? []).find(({ customerAccess }) => customerAccess && safeEqual(customerAccess.tokenHash, hash));
  if (!proposal || proposal.customerAccess.revokedAt) throw error("Deze klantlink is niet geldig.", "PROPOSAL_ACCESS_INVALID", 404);
  if (new Date(proposal.customerAccess.expiresAt).getTime() <= now.getTime()) throw error("Deze klantlink is verlopen. Vraag Sportpaleis om een nieuwe link.", "PROPOSAL_ACCESS_EXPIRED", 410);
  return proposal;
}

function normalizePlacement(input) {
  const route = TEAMKIT_FULFILLMENT_ROUTES.includes(input.route) ? input.route : "NOG_TE_BEPALEN";
  const preset = TEAMKIT_PLACEMENT_PRESETS.includes(input.preset) ? input.preset : "MIDDENBORST";
  const kind = ["CLUB_LOGO", "SPONSOR", "NAME", "INITIALS", "BACK_NUMBER", "SHORT_NUMBER", "FREE_TEXT"].includes(input.kind) ? input.kind : "FREE_TEXT";
  const sourceId = nullableText(input.sourceId, "Bron", 180); const productionAssetId = nullableText(input.productionAssetId, "Productieasset", 180);
  if (["CLUB_LOGO", "SPONSOR"].includes(kind) && !sourceId && !productionAssetId) throw error("Kies voor dit logo een bron of bestaand asset.", "PROPOSAL_PLACEMENT_SOURCE_REQUIRED");
  if (!["CLUB_LOGO", "SPONSOR"].includes(kind) && !nullableText(input.text, "Opdruktekst", 120)) throw error("Vul de opdruktekst in.", "PROPOSAL_PLACEMENT_TEXT_REQUIRED");
  const physicalSizeOverride = input.physicalSizeOverride == null ? null : {
    widthMm: boundedNumber(input.physicalSizeOverride.widthMm, "Fysieke breedte", 1, 1000),
    heightMm: boundedNumber(input.physicalSizeOverride.heightMm, "Fysieke hoogte", 1, 1000),
    aspectRatioLocked: true,
  };
  return { id: input.id || `placement-${randomUUID()}`, kind, label: text(input.label ?? kind, "Bedrukking", 120), side: input.side === "BACK" ? "BACK" : "FRONT", preset, sourceId, productionAssetId, assetVersion: nullableText(input.assetVersion, "Assetversie", 120), text: nullableText(input.text, "Opdruktekst", 120), widthPercent: boundedNumber(input.widthPercent ?? 24, "Breedte", 5, 80), physicalSizeOverride, route, supplierName: route === "EXTERNE_BEDRUKKER" ? nullableText(input.supplierName, "Externe bedrukker", 160) : null, note: nullableText(input.note, "Opmerking", 500) };
}

export function normalizeProposalItems(items) {
  if (!Array.isArray(items) || items.length > 40) throw error("Een voorstel bevat maximaal 40 artikelen.", "PROPOSAL_ITEMS_INVALID");
  return items.map((item) => ({
    id: item.id || `proposal-item-${randomUUID()}`, articleId: nullableText(item.articleId, "Artikel", 160), articleNumber: nullableText(item.articleNumber, "Artikelnummer", 120),
    productName: text(item.productName, "Artikelnaam", 180), color: text(item.color || "Nog te bepalen", "Kleur", 120), quantity: boundedNumber(item.quantity, "Aantal", 1, 10_000, true),
    sizes: Array.isArray(item.sizes) ? [...new Set(item.sizes.map((value) => text(value, "Maat", 40)).filter(Boolean))].slice(0, 60) : [],
    team: nullableText(item.team, "Team", 120), notes: nullableText(item.notes, "Artikelopmerking", 800), placements: Array.isArray(item.placements) ? item.placements.slice(0, 30).map(normalizePlacement) : [],
  }));
}

function esc(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
const PRESET_POSITION = Object.freeze({ LINKERBORST: [33, 28], RECHTERBORST: [67, 28], MIDDENBORST: [50, 39], RUG_BOVEN: [50, 24], RUG_MIDDEN: [50, 48], MOUW_LINKS: [16, 35], MOUW_RECHTS: [84, 35], SHORT_LINKS: [38, 64], SHORT_RECHTS: [62, 64], BROEK: [50, 64], TAS: [50, 50] });

function garment(item, side) {
  const placements = item.placements.filter((placement) => placement.side === side).map((placement) => {
    const [x, y] = PRESET_POSITION[placement.preset] ?? [50, 50]; const label = placement.text || placement.label;
    return `<span class="tk-mark tk-mark--${placement.kind.toLowerCase()}" style="left:${x}%;top:${y}%;width:${placement.widthPercent}%" title="${esc(placement.label)}">${esc(label)}</span>`;
  }).join("");
  return `<figure class="tk-garment"><div class="tk-shirt" style="--kit-color:${esc(item.color)}"><i></i>${placements}</div><figcaption>${side === "FRONT" ? "Voorzijde" : "Achterzijde"}</figcaption></figure>`;
}

export function proposalSnapshot(proposal) {
  return {
    proposalId: proposal.id, proposalNumber: proposal.proposalNumber, revision: proposal.currentRevision, title: proposal.title, type: proposal.type,
    customer: structuredClone(proposal.customer), association: structuredClone(proposal.association), team: proposal.team, season: proposal.season, category: proposal.category,
    deadline: proposal.deadline, notes: proposal.notes, items: structuredClone(proposal.items),
    sourceRefs: proposal.sources.map(({ id, filename, mimeType, sha256, version, quality }) => ({ id, filename, mimeType, sha256, version, qualityStatus: quality.status })),
  };
}

export function renderProposalPreview(snapshot, { customer = false } = {}) {
  const items = snapshot.items.map((item) => `<article class="tk-item"><header><div><small>${esc(item.articleNumber ?? "TEAMKIT")}</small><h2>${esc(item.productName)}</h2></div><strong>${item.quantity ? `${item.quantity}×` : "Aantal volgt"}</strong></header><div class="tk-views">${garment(item, "FRONT")}${garment(item, "BACK")}</div><dl><div><dt>Kleur</dt><dd>${esc(item.color)}</dd></div><div><dt>Maten</dt><dd>${esc(item.sizes.join(", ") || "Nog te bepalen")}</dd></div></dl>${item.placements.length ? `<ul>${item.placements.map((placement) => `<li><strong>${esc(placement.label)}</strong><span>${esc(placement.preset.replaceAll("_", " ").toLowerCase())}${customer ? "" : ` · ${esc(placement.route.replaceAll("_", " ").toLowerCase())}`}</span></li>`).join("")}</ul>` : `<p class="tk-empty">Nog geen bedrukkingen toegevoegd.</p>`}${item.notes ? `<p>${esc(item.notes)}</p>` : ""}</article>`).join("");
  return `<section class="tk-preview" data-proposal-revision="${snapshot.revision}"><header class="tk-preview__hero"><div><p>SPORT 2000 SPORTPALEIS</p><h1>${esc(snapshot.title)}</h1><span>${esc(snapshot.association.name ?? snapshot.customer.name)}${snapshot.team ? ` · ${esc(snapshot.team)}` : ""}</span></div><dl><div><dt>Voorstel</dt><dd>${esc(snapshot.proposalNumber)}</dd></div><div><dt>Versie</dt><dd>V${snapshot.revision}</dd></div></dl></header><div class="tk-preview__items">${items || `<p>Nog geen artikelen toegevoegd.</p>`}</div>${snapshot.notes ? `<aside><strong>Opmerking</strong><p>${esc(snapshot.notes)}</p></aside>` : ""}</section>`;
}

export function createProposalRevision(proposal, actor, reason, feedbackIds = [], now = new Date()) {
  const snapshot = proposalSnapshot(proposal); const previewHtml = renderProposalPreview(snapshot); const body = JSON.stringify(snapshot);
  return { number: proposal.currentRevision, createdAt: now.toISOString(), createdBy: { id: actor.id, name: actor.name, role: actor.role }, reason: text(reason || "Voorstel bijgewerkt", "Reden", 500), feedbackIds: [...new Set(feedbackIds)], snapshot, snapshotHash: proposalSha256(body), previewHtml, previewSha256: proposalSha256(previewHtml) };
}

function pdfSafe(value) { return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[€]/gu, "EUR ").replace(/[^\x20-\x7e]/gu, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"); }
function pdfText(x, y, size, value, bold = false) { return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfSafe(value)}) Tj ET`; }

export function generateProposalPdf(snapshot, approved = false) {
  const lines = [];
  lines.push({ text: snapshot.title, size: 20, bold: true }, { text: `${snapshot.proposalNumber}  |  V${snapshot.revision}${approved ? "  |  AKKOORD" : ""}`, size: 10 }, { text: `${snapshot.customer.name}${snapshot.association.name ? `  |  ${snapshot.association.name}` : ""}`, size: 11, bold: true });
  if (snapshot.team || snapshot.season) lines.push({ text: [snapshot.team, snapshot.season].filter(Boolean).join("  |  "), size: 10 });
  for (const [index, item] of snapshot.items.entries()) {
    lines.push({ text: `${index + 1}. ${item.productName}${item.articleNumber ? ` (${item.articleNumber})` : ""}`, size: 13, bold: true });
    lines.push({ text: `Kleur: ${item.color}  |  Aantal: ${item.quantity ?? "volgt"}  |  Maten: ${item.sizes.join(", ") || "volgen"}`, size: 9 });
    for (const placement of item.placements) lines.push({ text: `- ${placement.label}: ${placement.preset.replaceAll("_", " ").toLowerCase()}${placement.text ? ` - ${placement.text}` : ""}`, size: 9 });
    if (item.notes) lines.push({ text: `Opmerking: ${item.notes}`, size: 9 });
  }
  if (snapshot.notes) lines.push({ text: `Algemeen: ${snapshot.notes}`, size: 9 });
  const pages = []; let current = [];
  for (const line of lines) { if (current.length >= 30) { pages.push(current); current = []; } current.push(line); }
  if (current.length || !pages.length) pages.push(current);
  const objects = [null]; const add = (value) => { objects.push(value); return objects.length - 1; };
  const catalogId = add(""); const pagesId = add(""); const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];
  for (const [pageIndex, page] of pages.entries()) {
    const commands = ["0.035 0.075 0.09 rg 0 760 595 82 re f", pdfText(42, 808, 9, "SPORT 2000 SPORTPALEIS", true), pdfText(42, 785, 15, snapshot.title, true), "0.82 0.09 0.12 rg 42 748 82 4 re f"];
    if (pageIndex === 0 && snapshot.items[0]) {
      const visualItem = snapshot.items[0]; commands.push("0.94 0.95 0.96 rg 365 560 86 142 re f 465 560 86 142 re f", "0.12 0.15 0.17 RG 1.2 w 379 590 58 82 re S 479 590 58 82 re S", pdfText(382, 682, 8, "VOORZIJDE", true), pdfText(485, 682, 8, "ACHTERZIJDE", true));
      for (const placement of visualItem.placements.slice(0, 8)) { const front = placement.side !== "BACK"; const x = (front ? 384 : 484) + (placement.preset.includes("RECHTS") ? 25 : placement.preset.includes("MIDDEN") ? 13 : 0); const y = placement.preset.includes("RUG") ? 620 : placement.preset.includes("MOUW") ? 640 : 648; commands.push("0.82 0.09 0.12 rg", `${x} ${y} 22 5 re f`, "0.08 0.09 0.1 rg", pdfText(front ? 365 : 465, 575 - visualItem.placements.indexOf(placement) * 10, 6, placement.label)); }
    }
    let y = 724;
    for (const line of page) { commands.push("0.08 0.09 0.1 rg", pdfText(42, y, line.size, line.text, line.bold)); y -= line.size >= 13 ? 24 : 17; }
    commands.push("0.35 0.37 0.38 rg", pdfText(42, 28, 8, `${snapshot.proposalNumber} - V${snapshot.revision} - pagina ${pageIndex + 1}/${pages.length}`));
    const stream = commands.join("\n"); const streamId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`; objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let body = "%PDF-1.7\n%SPTK\n"; const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) { offsets[id] = Buffer.byteLength(body); body += `${id} 0 obj\n${objects[id]}\nendobj\n`; }
  const xref = Buffer.byteLength(body); body += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}

export function approvedFulfillmentTasks(proposal, revision, state, now = new Date()) {
  const snapshot = revision.snapshot; const tasks = [];
  for (const item of snapshot.items) for (const placement of item.placements) {
    const source = proposal.sources.find(({ id }) => id === placement.sourceId); const asset = (state.productionElements ?? []).find(({ id }) => id === placement.productionAssetId);
    const assetRef = { sourceId: source?.id ?? asset?.sourceId ?? null, productionAssetId: asset?.id ?? null, version: source ? String(source.version) : asset?.version ?? placement.assetVersion ?? null, sha256: source?.sha256 ?? asset?.sourceLayers?.vectorSource?.sha256 ?? null };
    const missing = [!item.quantity && "aantal", !item.sizes.length && "maten", !source && !asset && ["CLUB_LOGO", "SPONSOR"].includes(placement.kind) && "bronbestand"].filter(Boolean);
    const route = placement.route; const kind = route === "INTERN_BEDRUKKEN" ? "INTERNAL_PRODUCTION" : route === "EXTERNE_BEDRUKKER" ? "EXTERNAL_SUPPLIER" : "ROUTE_DECISION";
    const attention = route === "NOG_TE_BEPALEN" ? "Bepaal wie deze bedrukking uitvoert." : missing.length ? `Controleer ontbrekend: ${missing.join(", ")}.` : null;
    const status = route === "EXTERNE_BEDRUKKER" && !attention ? "READY_TO_SEND" : "HUMAN_CHECK";
    const specification = `${snapshot.proposalNumber} V${revision.number} | ${item.productName} | ${item.quantity ?? "aantal ontbreekt"} | ${item.sizes.join(", ") || "maten ontbreken"} | ${item.color} | ${placement.label} | ${placement.preset.replaceAll("_", " ")} | asset ${assetRef.productionAssetId ?? assetRef.sourceId ?? "ontbreekt"}@${assetRef.version ?? "onbekend"}`;
    tasks.push({ id: `proposal-task-${proposal.id}-${revision.number}-${item.id}-${placement.id}-${route}`.replace(/[^a-zA-Z0-9_-]/gu, "-"), proposalId: proposal.id, approvedRevision: revision.number, customerName: snapshot.customer.name, associationName: snapshot.association.name, itemId: item.id, placementId: placement.id, assetRef, route, kind, status, attention, specification, supplierName: placement.supplierName, orderId: null, createdAt: now.toISOString(), updatedAt: now.toISOString() });
  }
  return tasks;
}

export function publicProposal(proposal) {
  return structuredClone({
    id: proposal.id, proposalNumber: proposal.proposalNumber, aggregateRevision: proposal.aggregateRevision, currentRevision: proposal.currentRevision, status: proposal.status,
    title: proposal.title, type: proposal.type, customer: proposal.customer, association: proposal.association, team: proposal.team, season: proposal.season, category: proposal.category,
    deadline: proposal.deadline, notes: proposal.notes, items: proposal.items,
    sources: proposal.sources.map(({ dataBase64: _dataBase64, safePreviewSvg: _safePreviewSvg, ...source }) => source), intake: proposal.intake,
    feedback: proposal.feedback, revisions: proposal.revisions, approval: proposal.approval ? (({ pdfBase64: _pdfBase64, previewHtml: _previewHtml, ...approval }) => approval)(proposal.approval) : null,
    approvalHistory: (proposal.approvalHistory ?? []).map(({ pdfBase64: _pdfBase64, previewHtml: _previewHtml, ...approval }) => approval),
    fulfillmentTasks: proposal.fulfillmentTasks, createdAt: proposal.createdAt, createdBy: proposal.createdBy, updatedAt: proposal.updatedAt, updatedBy: proposal.updatedBy, archivedAt: proposal.archivedAt, copiedFrom: proposal.copiedFrom,
  });
}

export function customerProposal(proposal) {
  const revision = proposal.revisions.find(({ number }) => number === proposal.currentRevision) ?? createProposalRevision(proposal, { id: "system", name: "Sportpaleis", role: "customer" }, "Actuele klantpreview");
  return structuredClone({ proposalNumber: proposal.proposalNumber, title: proposal.title, status: proposal.status, currentRevision: proposal.currentRevision, customer: proposal.customer, association: proposal.association, team: proposal.team, season: proposal.season, category: proposal.category, intake: proposal.intake, items: proposal.items, sources: proposal.sources.map(({ dataBase64: _dataBase64, safePreviewSvg: _safePreviewSvg, promotedProductionSourceId: _promotedProductionSourceId, ...source }) => source), previewHtml: renderProposalPreview(revision.snapshot, { customer: true }), feedback: proposal.feedback.filter(({ revision: number }) => number === proposal.currentRevision).map(({ processedAt: _processedAt, processedBy: _processedBy, ...feedback }) => feedback), approval: proposal.approval ? { revision: proposal.approval.revision, approvedAt: proposal.approval.approvedAt, customerName: proposal.approval.customerName, pdfAvailable: true } : null });
}

export function validateTeamkitProposalState(state) {
  state.teamkitProposals ??= [];
  const ids = new Set(); const numbers = new Set();
  for (const proposal of state.teamkitProposals) {
    if (ids.has(proposal.id) || numbers.has(proposal.proposalNumber)) throw new Error("Dubbel proposal-ID of voorstelnummer."); ids.add(proposal.id); numbers.add(proposal.proposalNumber);
    if (!TEAMKIT_PROPOSAL_STATUSES.includes(proposal.status) || !Number.isInteger(proposal.currentRevision) || proposal.currentRevision < 1 || !Number.isInteger(proposal.aggregateRevision) || proposal.aggregateRevision < 1) throw new Error("Ongeldige voorstelstatus of revisie.");
    const sourceIds = new Set();
    for (const source of proposal.sources) { if (sourceIds.has(source.id) || !source.immutable || proposalSha256(Buffer.from(source.dataBase64 ?? "", "base64")) !== source.sha256) throw new Error("Immutable voorstelbron ontbreekt of is gewijzigd."); sourceIds.add(source.id); }
    for (const revision of proposal.revisions) { if (revision.snapshotHash !== proposalSha256(JSON.stringify(revision.snapshot)) || revision.previewSha256 !== proposalSha256(revision.previewHtml)) throw new Error("Voorstelrevision is gewijzigd."); }
    proposal.approvalHistory ??= [];
    const approvals = [...proposal.approvalHistory, ...(proposal.approval ? [proposal.approval] : [])]; const approvedRevisions = new Set();
    for (const approval of approvals) { const revision = proposal.revisions.find(({ number }) => number === approval.revision); const pdf = Buffer.from(approval.pdfBase64, "base64"); if (approvedRevisions.has(approval.revision) || !revision || revision.snapshotHash !== approval.snapshotHash || proposalSha256(approval.previewHtml) !== approval.previewSha256 || proposalSha256(pdf) !== approval.pdfSha256 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Approved proposal is niet exact reproduceerbaar."); approvedRevisions.add(approval.revision); }
    const taskIds = new Set(); for (const task of proposal.fulfillmentTasks) {
      if (taskIds.has(task.id) || !approvedRevisions.has(task.approvedRevision)) throw new Error("Dubbele of onherleidbare afhandelingstaak."); taskIds.add(task.id);
      if (task.orderId) {
        const order = state.orders.find(({ id }) => id === task.orderId);
        if (!order || order.referenceSeries !== "TK" || order.teamkitContext?.kind !== "TEAMKIT_APPROVAL" || order.teamkitContext.proposalId !== proposal.id || order.teamkitContext.approvedRevision !== task.approvedRevision || order.teamkitContext.itemId !== task.itemId || !order.teamkitContext.fulfillmentTaskIds.includes(task.id)) throw new Error("Teamkit-afhandelingstaak mist een atomair herleidbare TK-order.");
      }
    }
    const internalGroups = new Map();
    for (const task of proposal.fulfillmentTasks.filter(({ kind, route }) => kind === "INTERNAL_PRODUCTION" && route === "INTERN_BEDRUKKEN")) {
      const key = `${task.approvedRevision}:${task.itemId}`; internalGroups.set(key, [...(internalGroups.get(key) ?? []), task]);
    }
    for (const tasks of internalGroups.values()) if (new Set(tasks.map(({ orderId }) => orderId).filter(Boolean)).size > 1) throw new Error("Eén approved Teamkit-item verwijst naar meerdere productieorders.");
  }
  return state;
}
