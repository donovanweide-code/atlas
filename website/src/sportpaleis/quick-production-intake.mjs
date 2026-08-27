import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const SUPPORTED = new Map([
  ["application/pdf", "PDF"],
  ["image/jpeg", "PHOTO"],
  ["image/png", "PHOTO"],
  ["image/webp", "PHOTO"],
  ["text/plain", "DOCUMENT"],
  ["message/rfc822", "EMAIL"],
]);

const FIELD_RULES = Object.freeze({
  externalReference: ["bestelnummer", "ordernummer", "externe referentie", "referentie"],
  orderDate: ["orderdatum", "datum"],
  articleNumber: ["artikelnummer", "artikel nr", "artikelnr"],
  description: ["artikelomschrijving", "omschrijving", "artikel"],
  size: ["maat"],
  quantity: ["aantal"],
  articleColor: ["artikelkleur", "kleur artikel"],
  initials: ["initialen"],
  backName: ["naam (rug)", "rugnaam", "naam rug"],
  backNumber: ["rugnummer", "nummer rug"],
  shortsNumber: ["shortnummer", "broeknummer", "roknummer"],
  foilColor: ["foliekleur", "kleur opdruk", "opdrukkleur"],
});

const clean = (value, maximum = 240) => String(value ?? "").replace(/\0/gu, "").trim().slice(0, maximum);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const intakeError = (message, code, statusCode = 400) => Object.assign(new Error(message), { code, statusCode });

function validateSource(input) {
  const filename = clean(input?.filename, 180);
  const mimeType = clean(input?.mimeType, 80).toLowerCase();
  if (!filename || !SUPPORTED.has(mimeType)) throw intakeError("Gebruik een foto, PDF, tekstbestand of opgeslagen e-mail.", "QUICK_INTAKE_SOURCE_UNSUPPORTED");
  let bytes;
  try { bytes = Buffer.from(String(input?.dataBase64 ?? ""), "base64"); }
  catch { throw intakeError("Het bronbestand kon niet veilig worden gelezen.", "QUICK_INTAKE_SOURCE_INVALID"); }
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES || bytes.toString("base64").replace(/=+$/u, "") !== String(input?.dataBase64 ?? "").replace(/\s|=+$/gu, "")) {
    throw intakeError("Het bronbestand is leeg, ongeldig of groter dan 8 MB.", "QUICK_INTAKE_SOURCE_INVALID");
  }
  if (mimeType === "application/pdf" && bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw intakeError("De PDF-bestandsinhoud klopt niet met het opgegeven type.", "QUICK_INTAKE_SOURCE_INVALID");
  if (mimeType === "image/png" && bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw intakeError("De PNG-bestandsinhoud klopt niet met het opgegeven type.", "QUICK_INTAKE_SOURCE_INVALID");
  if (mimeType === "image/jpeg" && bytes.subarray(0, 2).toString("hex") !== "ffd8") throw intakeError("De JPEG-bestandsinhoud klopt niet met het opgegeven type.", "QUICK_INTAKE_SOURCE_INVALID");
  return { filename, mimeType, bytes, sourceKind: SUPPORTED.get(mimeType) };
}

async function embeddedText(bytes, mimeType) {
  if (["text/plain", "message/rfc822"].includes(mimeType)) return clean(bytes.toString("utf8"), 100_000);
  if (mimeType !== "application/pdf") return "";
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = fileURLToPath(new URL(".", import.meta.resolve("pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"))).replaceAll("\\", "/").replace(/\/?$/u, "/");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true, disableFontFace: true, useSystemFonts: false, isEvalSupported: false, standardFontDataUrl }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 40); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join(""));
  }
  return clean(pages.join("\n"), 100_000);
}

function extractExactFields(text) {
  const normalizedLines = String(text).split(/\r?\n/u).flatMap((line) => line.split(/\s{2,}|\t/gu)).map((line) => line.trim()).filter(Boolean);
  const fields = {};
  for (const [field, aliases] of Object.entries(FIELD_RULES)) {
    const matches = [];
    for (const line of normalizedLines) for (const alias of aliases) {
      const match = line.match(new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*[:#-]?\\s*(.+)$`, "iu"));
      if (match?.[1]) matches.push(clean(match[1], 240));
    }
    const distinct = [...new Set(matches)];
    fields[field] = distinct.length === 1
      ? { value: distinct[0], status: "RELIABLE", evidence: "Exact gelabeld bronveld" }
      : distinct.length > 1
        ? { value: distinct.join(" / "), status: "CHECK_REQUIRED", evidence: "Meerdere waarden in de bron" }
        : { value: "", status: "MISSING", evidence: "Niet aangetroffen" };
  }
  return fields;
}

export async function inspectQuickProductionSource(input) {
  const source = validateSource(input);
  const text = await embeddedText(source.bytes, source.mimeType);
  const fields = extractExactFields(text);
  const missing = Object.entries(fields).filter(([, value]) => value.status === "MISSING").map(([field]) => field);
  return {
    source: {
      filename: source.filename,
      mimeType: source.mimeType,
      sourceKind: source.sourceKind,
      sizeBytes: source.bytes.length,
      sha256: sha256(source.bytes),
      dataBase64: source.bytes.toString("base64"),
      immutable: true,
    },
    extraction: {
      engine: source.sourceKind === "PHOTO" ? "NO_OCR_HUMAN_CHECK_V1" : "EMBEDDED_TEXT_EXACT_LABELS_V1",
      extractedText: text,
      fields,
      confidencePolicy: "NO_SILENT_GUESSING",
      status: source.sourceKind === "PHOTO" ? "HUMAN_CHECK_REQUIRED" : missing.length ? "HUMAN_CHECK_REQUIRED" : "REVIEW_REQUIRED",
      uncertainties: source.sourceKind === "PHOTO" ? ["Foto-OCR is niet binnen de veilige bestaande foundation beschikbaar.", ...missing] : missing,
    },
  };
}

export function createQuickProductionIntakeRecord(inspected, user, now = new Date()) {
  const createdAt = now.toISOString();
  return {
    id: `intake-${randomBytes(8).toString("hex")}`,
    version: "1",
    revision: 1,
    createdAt,
    createdBy: { userId: user.id, name: user.name },
    status: "HUMAN_CHECK",
    source: inspected.source,
    extraction: inspected.extraction,
    humanCorrections: [],
    acceptedAt: null,
    acceptedBy: null,
    orderId: null,
  };
}

export function publicQuickProductionIntake(record) {
  const { dataBase64: _dataBase64, ...source } = record.source;
  const { extractedText: _extractedText, ...extraction } = record.extraction;
  return structuredClone({ ...record, source, extraction });
}

export function quickIntakeOrderPayload(record, input, state) {
  if (record.status !== "HUMAN_CHECK") throw intakeError("Deze intake is al verwerkt.", "QUICK_INTAKE_ALREADY_ACCEPTED", 409);
  if (input?.explicitAgreement !== true) throw intakeError("Expliciet medewerkerakkoord is vereist.", "QUICK_INTAKE_AGREEMENT_REQUIRED", 409);
  const value = (field) => clean(input?.fields?.[field] ?? record.extraction.fields[field]?.value, 240);
  const articleNumber = value("articleNumber");
  const matches = articleNumber ? (state.articles ?? []).filter((article) => article.active !== false && String(article.articleNumber) === articleNumber) : [];
  const association = clean(input?.association || (matches.length === 1 ? matches[0].association : ""), 160);
  const article = matches.length === 1 && (!association || matches[0].association === association) ? matches[0] : null;
  const quantity = Number(value("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw intakeError("Controleer en vul een geldig aantal van 1 tot en met 500 in.", "QUICK_INTAKE_QUANTITY_REQUIRED", 409);
  const safeQuantity = quantity;
  const corrections = Object.entries(input?.fields ?? {}).filter(([field, next]) => clean(next) !== clean(record.extraction.fields[field]?.value)).map(([field, next]) => ({ field, previous: record.extraction.fields[field]?.value ?? "", next: clean(next) }));
  const externalReference = value("externalReference");
  const standardPersonalization = { initials: value("initials"), initialsInfix: "", name: value("backName"), backNumber: value("backNumber"), backNumberSizeClass: value("backNumber") ? clean(input?.backNumberSizeClass) : "", shortsNumber: value("shortsNumber"), initialsSemantic: null };
  const evidence = `Quick Production Intake ${record.id} · SHA-256 ${record.source.sha256}`;
  if (article) return {
    corrections,
    payload: {
      orderKind: "INDIVIDUAL",
      customer: clean(input?.customer, 120) || "Nog te controleren",
      customerEmail: clean(input?.customerEmail, 160),
      customerPhone: clean(input?.customerPhone, 40),
      standardPersonalization,
      items: [{ articleId: article.id, size: value("size"), quantity: safeQuantity, deviation: false, overrides: {} }],
      source: "MANUAL",
      externalReference,
      provenance: evidence,
      internalNote: record.extraction.status === "HUMAN_CHECK_REQUIRED" ? "Bron via Quick Production Intake; onzekerheden zijn door medewerker gecontroleerd." : "Bron via Quick Production Intake.",
    },
  };
  return {
    corrections,
    payload: {
      orderKind: "CUSTOM",
      customer: clean(input?.customer, 120) || "Nog te controleren",
      customerEmail: clean(input?.customerEmail, 160),
      customerPhone: clean(input?.customerPhone, 40),
      standardPersonalization,
      items: [{ product: value("description") || `Bronartikel ${articleNumber || "zonder artikelnummer"}`, association: association || "Geen vereniging", size: value("size"), quantity: safeQuantity, personalization: [standardPersonalization.initials, standardPersonalization.name, standardPersonalization.backNumber, standardPersonalization.shortsNumber].filter(Boolean).join(" · "), deviation: true, overrides: {} }],
      source: "MANUAL",
      externalReference,
      provenance: evidence,
      internalNote: "Productiegegevens uit bron zijn niet volledig aan één catalogusartikel gekoppeld; bestaande Aandacht-route blijft vereist.",
      noteKind: "attention",
    },
  };
}
