import { createHash } from "node:crypto";

const ORDER_REFERENCE = /\b(26\d{6,})\b/gu;
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");

export function createSportpaleisWebshopIntakeState() {
  return {
    enabled: true,
    status: "READY",
    startBoundary: null,
    lastSuccessfulRetrievalAt: null,
    highWaterMark: null,
    processedSourceIdentifiers: [],
    processedOrderRevisionIdentifiers: [],
    retrievalMode: "CONTROLLED_MAIL_DOCUMENT_ADAPTER",
    channel: "WEBSHOP_XPRT",
    sources: [],
    matches: [],
    printEvents: [],
    stockLogo: { association: "VVA / Spartaan", currentStock: 74, unconfirmedValue20: 20, mutations: [] },
  };
}

function clean(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").trim().replace(/\s+/gu, " ");
}

function fieldValue(line, labels) {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*:\\s*(.+)$`, "iu");
  return clean(line.match(pattern)?.[1] ?? "");
}

export function normalizeDividePersonalization(label, sourceValue) {
  const value = clean(sourceValue);
  const normalizedLabel = clean(label).toLocaleLowerCase("nl-NL");
  if (!value) throw Object.assign(new Error("Personalisatiewaarde ontbreekt."), { code: "DIVIDE_PERSONALIZATION_EMPTY" });
  if (normalizedLabel === "rugnummer") return { kind: "BACK_NUMBER", value, sourceLabel: label, sourceValue };
  if (normalizedLabel === "naam (rug)") return /^\d+$/u.test(value)
    ? { kind: "BACK_NUMBER", value, sourceLabel: label, sourceValue }
    : { kind: "BACK_NAME", value, sourceLabel: label, sourceValue };
  if (normalizedLabel === "initialen") return { kind: "INITIALS", value, sourceLabel: label, sourceValue };
  if (normalizedLabel === "naam opdruk") return { kind: "NAME_PRINT", value, sourceLabel: label, sourceValue };
  if (normalizedLabel === "nummer") return { kind: "NUMBER", value, sourceLabel: label, sourceValue };
  if (["borstnummer", "nummer borst"].includes(normalizedLabel)) return { kind: "CHEST_NUMBER", value, sourceLabel: label, sourceValue };
  if (["shortnummer", "broeknummer", "nummer short"].includes(normalizedLabel)) return { kind: "SHORTS_NUMBER", value, sourceLabel: label, sourceValue };
  if (["voorraadlogo", "clublogo", "logo"].includes(normalizedLabel)) return { kind: "STOCK_LOGO", value, sourceLabel: label, sourceValue };
  throw Object.assign(new Error(`Onbekende personalisatie: ${label}.`), { code: "DIVIDE_PERSONALIZATION_UNKNOWN" });
}

function splitOrderSegments(pages) {
  const segments = [];
  let active = null;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const text = String(pages[pageIndex] ?? "").replace(/\r\n?/gu, "\n");
    const matches = [...text.matchAll(ORDER_REFERENCE)];
    if (!matches.length) {
      if (!active && text.trim()) throw Object.assign(new Error(`Pagina ${pageIndex + 1} heeft geen herleidbaar 26…-bestelnummer.`), { code: "DIVIDE_ORDER_BOUNDARY_AMBIGUOUS" });
      if (active) { active.rawText += `\n${text}`; active.pageNumbers.push(pageIndex + 1); }
      continue;
    }
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const reference = match[1];
      const start = match.index;
      const end = matches[index + 1]?.index ?? text.length;
      const chunk = text.slice(start, end);
      if (active?.reference === reference) {
        active.rawText += `\n${chunk}`;
        if (!active.pageNumbers.includes(pageIndex + 1)) active.pageNumbers.push(pageIndex + 1);
      } else {
        active = { reference, rawText: chunk, pageNumbers: [pageIndex + 1] };
        segments.push(active);
      }
    }
  }
  if (!segments.length) throw Object.assign(new Error("Geen 26…-bestellingen gevonden."), { code: "DIVIDE_ORDERS_EMPTY" });
  const duplicates = segments.filter((segment, index) => segments.findIndex(({ reference }) => reference === segment.reference) !== index);
  if (duplicates.length) throw Object.assign(new Error("Een bestelnummer komt in niet-aansluitende segmenten terug."), { code: "DIVIDE_ORDER_BOUNDARY_AMBIGUOUS" });
  return segments;
}

function parseArticleBlocks(rawText, association = "") {
  const lines = rawText.split("\n").map(clean).filter(Boolean);
  const articles = [];
  let current = null;
  for (const line of lines) {
    const articleNumber = fieldValue(line, ["Artikelnummer", "Artikelnr\\.?", "Artikel nr\\.?"]);
    if (articleNumber) {
      current = { articleNumber, description: "", size: "", color: "", quantity: 1, personalization: [], sourceLines: [line] };
      articles.push(current);
      continue;
    }
    if (!current) continue;
    current.sourceLines.push(line);
    const description = fieldValue(line, ["Omschrijving", "Artikel"]);
    const size = fieldValue(line, ["Maat"]);
    const color = fieldValue(line, ["Kleur"]);
    const quantity = fieldValue(line, ["Aantal"]);
    if (description) current.description = description;
    else if (size) current.size = size;
    else if (color) current.color = color;
    else if (quantity) {
      const parsed = Number(quantity);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) throw Object.assign(new Error(`Ongeldig aantal bij artikel ${current.articleNumber}.`), { code: "DIVIDE_ARTICLE_QUANTITY_INVALID" });
      current.quantity = parsed;
    } else {
      const combinedNumber = line.match(/^Rug\s*\/\s*Borst\s*\/\s*Short\s*nummer\s*:\s*(.+)$/iu);
      if (combinedNumber) current.personalization.push(
        normalizeDividePersonalization("Rugnummer", combinedNumber[1]),
        normalizeDividePersonalization("Borstnummer", combinedNumber[1]),
        normalizeDividePersonalization("Shortnummer", combinedNumber[1]),
      );
      else {
        const personalization = line.match(/^(Rugnummer|Borstnummer|Shortnummer|Broeknummer|Naam\s*\(Rug\)|Naam\s*opdruk|Rugnaam|Initialen|Nummer|Voorraadlogo|Clublogo|Logo)\s*:\s*(.+)$/iu);
        if (personalization) current.personalization.push(normalizeDividePersonalization(personalization[1].replace(/^Rugnaam$/iu, "Naam (Rug)"), personalization[2]));
      }
    }
  }
  if (!articles.length) throw Object.assign(new Error("Bestelling bevat geen herkenbare artikelregels."), { code: "DIVIDE_ARTICLES_EMPTY" });
  return articles.map((article) => {
    const product = article.description.toLocaleLowerCase("nl-NL");
    const huizenArticleRule = /(?:sv|fc)\s*huizen/iu.test(association)
      ? (/trainingsbroek|backpack/u.test(product) ? "INITIALS" : /training\s*(?:shirt|top)/u.test(product) ? "BACK_NAME" : null)
      : null;
    const personalization = huizenArticleRule
      ? article.personalization.filter(({ kind }) => kind === huizenArticleRule)
      : article.personalization;
    return {
    ...article, personalization,
    originalEvidence: article.sourceLines.join("\n"),
    productionRelevant: personalization.length > 0,
    ...(huizenArticleRule ? { articlePersonalizationRule: { kind: huizenArticleRule, source: "SV_HUIZEN_ARTICLE_PRODUCT_RULE", overridesGeneralChoice: true } } : {}),
  }; });
}

const POSITIONAL_PERSONALIZATION = /^(Rugnummer|Borstnummer|Shortnummer|Broeknummer|Naam\s*\(Rug\)|Naam\s*opdruk|Rugnaam|Initialen|Nummer|Voorraadlogo|Clublogo|Logo)\s*:\s*(.+)$/iu;

function positionedOrderMetadata(layoutPages, pageNumbers) {
  for (const pageNumber of pageNumbers) {
    const rows = Array.isArray(layoutPages?.[pageNumber - 1]) ? layoutPages[pageNumber - 1] : [];
    const header = rows.find(({ cells }) => cells.some(({ text }) => clean(text) === "Gegevens") && cells.some(({ text }) => clean(text) === "Factuuradres"));
    if (!header) continue;
    const leftCells = rows
      .filter(({ y }) => y < header.y && y > header.y - 80)
      .flatMap(({ y, cells }) => cells.filter(({ x }) => x < 180).map((cell) => ({ ...cell, y, text: clean(cell.text) })))
      .filter(({ text }) => text);
    const customer = leftCells.find(({ text }) => !/^(?:Telefoon|E-mail)\s*:/iu.test(text))?.text ?? null;
    const customerPhone = leftCells.map(({ text }) => text.match(/^Telefoon\s*:\s*(.+)$/iu)?.[1]).find(Boolean) ?? null;
    const customerEmail = leftCells.map(({ text }) => text.match(/^E-mail\s*:\s*(.+)$/iu)?.[1]).find(Boolean) ?? null;
    return { customer, customerPhone: clean(customerPhone) || null, customerEmail: clean(customerEmail) || null };
  }
  return { customer: null, customerPhone: null, customerEmail: null };
}

function positionedArticleBlocks(layoutPages, pageNumbers) {
  const articles = [];
  for (const pageNumber of pageNumbers) {
    const rows = Array.isArray(layoutPages?.[pageNumber - 1]) ? layoutPages[pageNumber - 1] : [];
    const requiredHeaders = ["Productafbeelding", "Artikelnummer", "Omschrijving", "Maat", "Kleur", "Aantal", "Totaal"];
    const header = rows.find(({ cells }) => requiredHeaders.every((label) => cells.some(({ text }) => clean(text) === label)));
    if (!header) continue;
    const headerX = Object.fromEntries(requiredHeaders.map((label) => [label, header.cells.find(({ text }) => clean(text) === label)?.x ?? null]));
    if (Object.values(headerX).some((value) => !Number.isFinite(value))) continue;
    const midpoint = (first, second) => (first + second) / 2;
    const ranges = {
      article: [midpoint(headerX.Productafbeelding, headerX.Artikelnummer), midpoint(headerX.Artikelnummer, headerX.Omschrijving)],
      description: [midpoint(headerX.Artikelnummer, headerX.Omschrijving), midpoint(headerX.Omschrijving, headerX.Maat)],
      size: [midpoint(headerX.Omschrijving, headerX.Maat), midpoint(headerX.Maat, headerX.Kleur)],
      color: [midpoint(headerX.Maat, headerX.Kleur), midpoint(headerX.Kleur, headerX.Aantal)],
      quantity: [midpoint(headerX.Kleur, headerX.Aantal), midpoint(headerX.Aantal, headerX.Totaal)],
    };
    const inRange = (x, range) => x >= range[0] && x < range[1];
    const subtotalY = rows.find(({ cells }) => cells.some(({ text }) => clean(text) === "Subtotaal"))?.y ?? -Infinity;
    const starts = rows.map((row) => ({ row, articleCell: row.cells.find(({ x }) => inRange(x, ranges.article)) }))
      .filter(({ row, articleCell }) => row.y < header.y - 1 && row.y > subtotalY && /^[\p{L}\p{N}][\p{L}\p{N}._/-]{2,39}$/u.test(clean(articleCell?.text)))
      .sort((first, second) => second.row.y - first.row.y);
    for (let index = 0; index < starts.length; index += 1) {
      const { row: start, articleCell } = starts[index];
      const lowerY = starts[index + 1]?.row.y ?? subtotalY;
      const block = rows.filter(({ y }) => y <= start.y + 0.5 && y > lowerY + 0.5);
      const cells = block.flatMap((row) => row.cells.map((cell) => ({ ...cell, y: row.y })));
      const sameRow = (range) => cells.filter(({ x, y }) => inRange(x, range) && Math.abs(y - start.y) < 1.5).map(({ text }) => clean(text));
      const personalization = cells.map(({ text, x, y }) => ({ match: clean(text).match(POSITIONAL_PERSONALIZATION), x, y }))
        .filter(({ match }) => match)
        .map(({ match, x, y }) => ({ ...normalizeDividePersonalization(match[1].replace(/^Rugnaam$/iu, "Naam (Rug)"), match[2]), sourcePosition: { pageNumber, x, y } }));
      const descriptionContinuations = cells
        .filter(({ x, y, text }) => inRange(x, ranges.description) && Math.abs(y - start.y) >= 1.5 && !POSITIONAL_PERSONALIZATION.test(clean(text)) && clean(text) !== "Meerprijs:")
        .sort((first, second) => second.y - first.y)
        .map(({ text }) => clean(text));
      const parts = (range) => cells.filter(({ x }) => inRange(x, range)).sort((first, second) => second.y - first.y).map(({ text }) => clean(text));
      const quantity = Number(sameRow(ranges.quantity)[0] ?? "");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw Object.assign(new Error(`Ongeldig aantal bij artikel ${clean(articleCell.text)}.`), { code: "DIVIDE_ARTICLE_QUANTITY_INVALID" });
      articles.push({
        articleNumber: clean(articleCell.text),
        description: clean([...sameRow(ranges.description), ...descriptionContinuations].join(" ")),
        size: clean(parts(ranges.size).join(" ")),
        color: clean(parts(ranges.color).join(" ")),
        quantity,
        personalization,
        sourceLines: block.map(({ cells: rowCells }) => rowCells.map(({ text }) => clean(text)).join("\t")),
      });
    }
  }
  return articles;
}

function finalizeArticles(articles, association = "") {
  if (!articles.length) throw Object.assign(new Error("Bestelling bevat geen herkenbare artikelregels."), { code: "DIVIDE_ARTICLES_EMPTY" });
  return articles.map((article) => {
    const product = article.description.toLocaleLowerCase("nl-NL");
    const huizenArticleRule = /(?:sv|fc)\s*huizen/iu.test(association)
      ? (/trainingsbroek|backpack/u.test(product) ? "INITIALS" : /training\s*(?:shirt|top)/u.test(product) ? "BACK_NAME" : null)
      : null;
    const personalization = huizenArticleRule ? article.personalization.filter(({ kind }) => kind === huizenArticleRule) : article.personalization;
    return {
      ...article,
      personalization,
      originalEvidence: article.sourceLines.join("\n"),
      productionRelevant: personalization.length > 0,
      ...(huizenArticleRule ? { articlePersonalizationRule: { kind: huizenArticleRule, source: "SV_HUIZEN_ARTICLE_PRODUCT_RULE", overridesGeneralChoice: true } } : {}),
    };
  });
}

export function parseSportpaleisDividePdfText({ pages, layoutPages = [], sourceDocumentId, sourceHash, detectedAt = new Date().toISOString() }) {
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > 500) throw Object.assign(new Error("PDF-tekst moet uit 1 tot 500 pagina's bestaan."), { code: "DIVIDE_PAGES_INVALID" });
  if (!String(sourceDocumentId ?? "").trim() || !/^[a-f0-9]{64}$/iu.test(String(sourceHash ?? ""))) throw Object.assign(new Error("Brondocument-ID en SHA-256 zijn verplicht."), { code: "DIVIDE_SOURCE_PROVENANCE_INVALID" });
  const segments = splitOrderSegments(pages);
  const orders = segments.map((segment) => {
    const orderDate = segment.rawText.match(/(?:Besteldatum|Orderdatum)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? null;
    const positionalMetadata = positionedOrderMetadata(layoutPages, segment.pageNumbers);
    const customer = segment.rawText.match(/(?:Klant(?:naam)?|Naam klant)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? positionalMetadata.customer;
    const customerPhone = segment.rawText.match(/Telefoon\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? positionalMetadata.customerPhone;
    const customerEmail = segment.rawText.match(/E-mail\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? positionalMetadata.customerEmail;
    const association = segment.rawText.match(/(?:Vereniging|Club|Team)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? null;
    let articles;
    try { articles = parseArticleBlocks(segment.rawText, association ?? ""); }
    catch (error) {
      if (error.code !== "DIVIDE_ARTICLES_EMPTY") throw error;
      try { articles = finalizeArticles(positionedArticleBlocks(layoutPages, segment.pageNumbers), association ?? ""); }
      catch (positionedError) {
        positionedError.message = `Bestelling ${segment.reference} (pagina ${segment.pageNumbers.join(", ")}): ${positionedError.message}`;
        throw positionedError;
      }
    }
    articles = articles.map((article, lineIndex) => {
      const sourceLineId = `${segment.reference}:line:${lineIndex + 1}`;
      return {
        ...article,
        sourceLineId,
        personalization: article.personalization.map((personalization, decorationIndex) => ({
          ...personalization,
          sourceLineId,
          decorationIdentity: `${sourceLineId}:${personalization.kind}:${decorationIndex + 1}:${personalization.value}`,
          ...(["BACK_NUMBER", "CHEST_NUMBER", "SHORTS_NUMBER", "NUMBER"].includes(personalization.kind) && !/^\d+$/u.test(personalization.value)
            ? { status: "ATTENTION_REQUIRED", attentionReason: `${personalization.sourceLabel} bevat geen numerieke waarde.` }
            : { status: "EXPLICIT" }),
        })),
      };
    });
    const attention = articles.flatMap((article) => article.personalization.filter(({ status }) => status === "ATTENTION_REQUIRED").map(({ decorationIdentity, attentionReason }) => ({ code: "DECORATION_VALUE_CHECK_REQUIRED", sourceLineId: article.sourceLineId, decorationIdentity, reason: attentionReason })));
    const normalized = { reference: segment.reference, orderDate, customer, customerPhone, customerEmail, association, articles };
    return {
      externalReference: segment.reference,
      channel: "WEBSHOP_XPRT",
      orderDate,
      customer,
      customerPhone,
      customerEmail,
      association,
      pageNumbers: segment.pageNumbers,
      articles,
      productionLines: articles.filter(({ productionRelevant }) => productionRelevant).map(({ sourceLineId, articleNumber, description, size, color, quantity, personalization }) => ({ sourceLineId, articleNumber, description, size, color, quantity, personalization })),
      sourceChannel: "WEBSHOP",
      attention,
      status: attention.length ? "ATTENTION_REQUIRED" : "READY",
      source: { documentId: String(sourceDocumentId), sha256: String(sourceHash).toLowerCase(), detectedAt, segmentHash: sha256(segment.rawText), originalEvidence: segment.rawText },
      contentHash: sha256(JSON.stringify(normalized)),
    };
  });
  if (new Set(orders.map(({ externalReference }) => externalReference)).size !== orders.length) throw Object.assign(new Error("Dubbele 26…-bestelling in hetzelfde document."), { code: "DIVIDE_ORDER_DUPLICATE" });
  return { sourceDocumentId: String(sourceDocumentId), sourceHash: String(sourceHash).toLowerCase(), detectedAt, pageCount: pages.length, orders };
}

export function reconcileSportpaleisDivideRevision(existingRevisions, parsedOrder, productionState = "NOT_PREPARED") {
  const revisions = Array.isArray(existingRevisions) ? existingRevisions : [];
  const latest = revisions.at(-1);
  if (latest?.contentHash === parsedOrder.contentHash) return { action: "NO_OP", revision: latest.revision, record: latest };
  const revision = (latest?.revision ?? 0) + 1;
  const safety = productionState === "PRODUCED" ? "HUMAN_GO_REQUIRED" : productionState === "PROPOSAL_EXISTS" ? "ATTENTION" : "READY";
  return {
    action: latest ? "NEW_REVISION" : "CREATE_REVISION",
    revision,
    safety,
    record: {
      externalReference: parsedOrder.externalReference,
      revision,
      contentHash: parsedOrder.contentHash,
      sourceDocumentId: parsedOrder.source.documentId,
      sourceHash: parsedOrder.source.sha256,
      parsedLines: parsedOrder.articles,
      personalization: parsedOrder.productionLines.flatMap(({ personalization }) => personalization),
      detectedChanges: latest ? { previousContentHash: latest.contentHash, nextContentHash: parsedOrder.contentHash } : null,
      originalEvidence: parsedOrder.source.originalEvidence,
      safety,
    },
  };
}
