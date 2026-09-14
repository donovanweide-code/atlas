import { createHash } from "node:crypto";
import { parseSportpaleisDividePdfText } from "../../scripts/sportpaleis-divide-import.mjs";

export const BATCH_VERSION = "WEBSHOP_PRINT_BATCH_V1";
export const batchHash = (value) => createHash("sha256").update(typeof value === "string" || value instanceof Uint8Array ? value : JSON.stringify(value)).digest("hex");
export const PRINT_TYPES = Object.freeze({ BACK_NUMBER: "Rugnummer", BACK_NAME: "Naam (rug)", INITIALS: "Initialen", NAME_PRINT: "Naam opdruk", NUMBER: "Nummer", CHEST_NUMBER: "Borstnummer", SHORTS_NUMBER: "Shortnummer", STOCK_LOGO: "Logo", UNKNOWN: "Onbekende opdruk" });
const clean = (value) => String(value ?? "").replace(/\u00a0/gu, " ").trim().replace(/\s+/gu, " ");
const printLabel = /^(?:rugnummer|borstnummer|shortnummer|broeknummer|nummer|initialen|rugnaam|naam\s*\(rug\)|naam\s*opdruk|voorraadlogo|clublogo|logo|opdruk[^:]*|bedrukking[^:]*|personalisatie[^:]*)\s*:/iu;
const instructionIdentity = (value) => clean(value).toLowerCase().replace(/\s*:\s*/u, ":").replace(/^rugnaam:/u, "naam (rug):");
const positivePrintValue = (value) => Boolean(clean(value)) && !/^(?:nee|geen(?:\s+(?:bedrukking|opdruk|personalisatie))?|zonder(?:\s+(?:bedrukking|opdruk|personalisatie))?|n\.?\s*v\.?\s*t\.?|[-–—])$/iu.test(clean(value));

export function sourceDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{2})-(\d{2})-(20\d{2})$/u);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

function rowsOf(page) {
  const values = page.items.filter(({ originalValue }) => originalValue.trim()).map((item) => ({
    x: item.transform[4], y: item.transform[5], text: item.originalValue,
  })).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const { x, y, text } of values) {
    let row = rows.at(-1);
    if (!row || Math.abs(row.y - y) >= 1.5) { row = { y, cells: [] }; rows.push(row); }
    row.cells.push({ x, text });
  }
  for (const row of rows) row.cells.sort((a, b) => a.x - b.x);
  return rows;
}

export function projectWebshopPrintBatch(result, { orderNumber = null, sourceOrderIndex = null } = {}) {
  if (result?.status !== "EVIDENCE_READY") throw Object.assign(new Error(result?.quarantine?.code === "PDF_OCR_REQUIRED" ? "Deze bron heeft OCR nodig." : "De bron kon niet worden uitgelezen."), { code: result?.quarantine?.code ?? "PDF_UNAVAILABLE" });
  const groups = [];
  for (const page of result.evidence.pages) {
    const rows = rowsOf(page);
    const anchors = rows.flatMap((row) => row.cells.map(({ text }) => ({ row, reference: text.match(/^Bestelnummer\s*:\s*(\d{6,20})\s*$/iu)?.[1] })).filter(({ reference }) => reference));
    if (!anchors.length) {
      if (!groups.length) throw Object.assign(new Error("Bestelnummer ontbreekt in de bron."), { code: "ORDER_BOUNDARY_UNKNOWN" });
      groups.at(-1).parts.push({ page: page.page, rows });
      continue;
    }
    const starts = anchors.map(({ row }) => {
      const dateRow = rows.find((candidate) => candidate.y >= row.y && candidate.y - row.y < 40 && candidate.cells.some(({ text }) => /^Besteldatum\s*:/iu.test(text)));
      return dateRow?.y ?? row.y;
    });
    for (let index = 0; index < anchors.length; index += 1) {
      const { reference } = anchors[index];
      let group = groups.at(-1);
      if (group?.reference !== reference) { group = { reference, parts: [] }; groups.push(group); }
      const part = { page: page.page, rows: rows.filter(({ y }) => (index === 0 || y <= starts[index] + .5) && (index === anchors.length - 1 || y > starts[index + 1] + .5)) };
      // A repeated complete order page is transport duplication, not extra pieces.
      // Distinct continuation pages retain their own article rows.
      const digest = batchHash(part.rows);
      if (!group.parts.some((previous) => batchHash(previous.rows) === digest)) {
        if (group.parts.length) group.ambiguousRepeatedHeader = true;
        group.parts.push(part);
      }
    }
  }
  const items = [];
  const sourceWarnings = [];
  let sourceArticleCount = 0;
  for (const [orderIndex, group] of groups.entries()) {
    if (orderNumber && group.reference !== orderNumber) continue;
    const textPages = group.parts.map(({ rows }) => rows.map(({ cells }) => cells.map(({ text }) => text).join("\t")).join("\n"));
    const orderText = textPages.join("\n");
    const dateValues = [...new Set([...orderText.matchAll(/Besteldatum\s*:\s*(\d{2}-\d{2}-\d{4})/giu)].map((m) => m[1]))];
    const originalDate = dateValues.length === 1 ? dateValues[0] : null;
    const orderDate = sourceDate(originalDate);
    const explicitField = (pattern) => clean(orderText.match(pattern)?.[1]) || null;
    let parsed;
    try {
      parsed = parseSportpaleisDividePdfText({ pages: textPages, layoutPages: group.parts.map(({ rows }) => rows), sourceDocumentId: result.attachmentSha256, sourceHash: result.attachmentSha256, detectedAt: "1970-01-01T00:00:00.000Z" }).orders[0];
    } catch (error) {
      // An unreadable order never makes the readable orders fail; do not invent items.
      sourceWarnings.push({ orderNumber: group.reference, message: "Artikelregels konden niet betrouwbaar worden gekoppeld.", code: error.code ?? "ORDER_PARSE_FAILED", page: group.parts[0].page });
      continue;
    }
    sourceArticleCount += parsed.articles.length;
    for (const [articleIndex, article] of parsed.articles.entries()) {
      const personalization = article.personalization.filter(({ value }) => positivePrintValue(value)).map(({ kind, value, sourceLabel, sourceValue, sourcePosition }) => ({ type: kind, value, sourceLabel, sourceValue, page: sourcePosition ? group.parts[sourcePosition.pageNumber - 1].page : group.parts[0].page }));
      // Preserve explicit unknown print instructions instead of silently dropping them.
      const known = new Set(personalization.map(({ sourceLabel, sourceValue }) => instructionIdentity(`${sourceLabel}: ${sourceValue}`)));
      for (const line of article.sourceLines ?? []) for (const cell of line.split("\t")) {
        if (printLabel.test(clean(cell)) && !known.has(instructionIdentity(cell))) {
          const [sourceLabel, ...rest] = clean(cell).split(":");
          if (!positivePrintValue(rest.join(":"))) continue;
          personalization.push({ type: "UNKNOWN", value: rest.join(":").trim(), sourceLabel, sourceValue: rest.join(":").trim(), page: group.parts[0].page });
        }
      }
      // HARD BOUNDARY: an ordinary article or a club/product description is not printing evidence.
      if (!personalization.length && !orderNumber) continue;
      const labeledArticle = /^(?:Artikelnummer|Artikelnr\.?|Artikel nr\.?)\s*:/iu.test(article.sourceLines?.[0] ?? "");
      const explicitQuantity = !labeledArticle || article.sourceLines.some((line) => /^Aantal\s*:\s*\d+\s*$/iu.test(line));
      const fields = { articleNumber: article.articleNumber, description: article.description, size: article.size, color: article.color, quantity: explicitQuantity ? article.quantity : null,
        personalizations: personalization.map(({ type, value }) => ({ type, value })) };
      const id = batchHash([BATCH_VERSION, result.source.tenantId, result.attachmentSha256, group.reference, (sourceOrderIndex ?? orderIndex), articleIndex, article.articleNumber]);
      const issues = [];
      if (!orderDate) issues.push({ field: "orderDate", message: "Besteldatum controleren." });
      if (group.ambiguousRepeatedHeader || groups.filter(({ reference }) => reference === group.reference).length > 1) issues.push({ field: "orderNumber", message: "Bestelnummer staat meer dan één keer in de bron." });
      items.push({ id, orderNumber: group.reference, orderDate, originalDate, sourceOrderIndex: (sourceOrderIndex ?? orderIndex), sourceIndex: items.length, sourceLineId: article.sourceLineId,
        sourceHash: result.attachmentSha256, sourcePages: [...new Set(group.parts.map(({ page }) => page))],
        club: explicitField(/(?:^|\n)(?:Club|Vereniging)\s*:\s*([^\n\t]+)/iu), team: explicitField(/(?:^|\n)Team\s*:\s*([^\n\t]+)/iu),
        customerContext: { customer: parsed.customer, customerEmail: parsed.customerEmail, customerPhone: parsed.customerPhone },
        printingRequired: personalization.length > 0, source: fields, values: structuredClone(fields), printEvidence: personalization, issues, override: null });
    }
  }
  items.sort((a, b) => (a.orderDate ?? "9999").localeCompare(b.orderDate ?? "9999") || a.orderNumber.localeCompare(b.orderNumber, "nl", { numeric: true }) || a.sourceIndex - b.sourceIndex);
  return { version: BATCH_VERSION, id: batchHash([BATCH_VERSION, result.source.tenantId, result.attachmentSha256]), sourceHash: result.attachmentSha256,
    defaultSort: "OLDEST_FIRST", sourceOrderCount: new Set(groups.map(({ reference }) => reference)).size, sourceArticleCount,
    orderCount: new Set(items.map(({ orderNumber }) => orderNumber)).size, itemCount: items.length, items, sourceWarnings };
}

export function validateBatchValues(values) {
  const issues = [];
  if (values.sizeProfile !== undefined && !["AUTO", "JUNIOR", "SENIOR", "CUSTOM"].includes(values.sizeProfile)) issues.push({ field: "sizeProfile", message: "Kies Junior, Senior of Vrij invoeren." });
  if (values.customProfile !== undefined && (typeof values.customProfile !== "string" || values.customProfile.length > 120)) issues.push({ field: "customProfile", message: "Profielomschrijving controleren." });
  for (const field of ["articleNumber", "description", "size", "color"]) if (typeof values[field] !== "string" || !values[field].trim() || values[field].length > 240) issues.push({ field, message: ({ articleNumber: "Artikelnummer", description: "Omschrijving", size: "Maat", color: "Kleur" })[field] + " controleren." });
  if (!Number.isInteger(values.quantity) || values.quantity < 1 || values.quantity > 999) issues.push({ field: "quantity", message: "Aantal moet tussen 1 en 999 liggen." });
  if (!Array.isArray(values.personalizations) || !values.personalizations.length || values.personalizations.length > 12) issues.push({ field: "personalizations", message: "Bedrukking ontbreekt." });
  else for (const p of values.personalizations) {
    if (!Object.hasOwn(PRINT_TYPES, p.type) || p.type === "UNKNOWN") issues.push({ field: "personalizations", message: "Type bedrukking controleren." });
    if (typeof p.value !== "string" || !p.value.trim() || p.value.length > 120 || /[\x00-\x1f]/u.test(p.value)) issues.push({ field: "personalizations", message: "Opdrukwaarde controleren." });
    else if (["BACK_NUMBER", "NUMBER", "CHEST_NUMBER", "SHORTS_NUMBER"].includes(p.type) && !/^\d+$/u.test(p.value)) issues.push({ field: "personalizations", message: "Nummer bevat letters of andere tekens." });
  }
  return issues;
}
