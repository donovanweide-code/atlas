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
        const personalization = line.match(/^(Rugnummer|Borstnummer|Shortnummer|Broeknummer|Naam\s*\(Rug\)|Rugnaam|Initialen|Voorraadlogo|Clublogo|Logo)\s*:\s*(.+)$/iu);
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

export function parseSportpaleisDividePdfText({ pages, sourceDocumentId, sourceHash, detectedAt = new Date().toISOString() }) {
  if (!Array.isArray(pages) || pages.length < 1 || pages.length > 500) throw Object.assign(new Error("PDF-tekst moet uit 1 tot 500 pagina's bestaan."), { code: "DIVIDE_PAGES_INVALID" });
  if (!String(sourceDocumentId ?? "").trim() || !/^[a-f0-9]{64}$/iu.test(String(sourceHash ?? ""))) throw Object.assign(new Error("Brondocument-ID en SHA-256 zijn verplicht."), { code: "DIVIDE_SOURCE_PROVENANCE_INVALID" });
  const segments = splitOrderSegments(pages);
  const orders = segments.map((segment) => {
    const orderDate = segment.rawText.match(/(?:Besteldatum|Orderdatum)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? null;
    const customer = segment.rawText.match(/(?:Klant(?:naam)?|Naam klant)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? null;
    const association = segment.rawText.match(/(?:Vereniging|Club|Team)\s*:\s*([^\n]+)/iu)?.[1]?.trim() ?? null;
    const articles = parseArticleBlocks(segment.rawText, association ?? "");
    const normalized = { reference: segment.reference, orderDate, customer, association, articles };
    return {
      externalReference: segment.reference,
      channel: "WEBSHOP_XPRT",
      orderDate,
      customer,
      association,
      pageNumbers: segment.pageNumbers,
      articles,
      productionLines: articles.filter(({ productionRelevant }) => productionRelevant).map(({ articleNumber, description, size, color, quantity, personalization }) => ({ articleNumber, description, size, color, quantity, personalization })),
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
