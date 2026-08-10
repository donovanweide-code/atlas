import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";


const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const invoiceRoot = path.join(repositoryRoot, "invoices", "wbd");
const conceptRoot = path.join(invoiceRoot, "data", "concepts");
const sentRoot = path.join(invoiceRoot, "data", "sent");
const templatePath = path.join(invoiceRoot, "data", "wbd-invoice-template.json");
const generatorPath = path.join(invoiceRoot, "invoice.py");
const pdfRoot = path.join(repositoryRoot, "output", "pdf", "concepts");
const finalPdfRoot = path.join(repositoryRoot, "output", "pdf", "sent");
const apiPrefix = "/__wbd-invoices";


function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}


export function formatInvoiceDueDate(dateValue, paymentTermDays) {
  const source = cleanText(dateValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return "Onbekend";
  const date = new Date(`${source}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  const days = Number(paymentTermDays);
  if (!Number.isInteger(days) || days < 0 || days > 365) return "Onbekend";
  date.setUTCDate(date.getUTCDate() + days);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getUTCFullYear()}`;
}


function cleanDecimal(value, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const cleaned = cleanText(value).replace(/\s/g, "");
  if (!cleaned) return fallback;
  return cleaned.includes(",") ? cleaned.replaceAll(".", "").replace(",", ".") : cleaned;
}


export function sanitizeConceptId(value) {
  const id = cleanText(value);
  return /^[a-z0-9-]{8,80}$/i.test(id) ? id : undefined;
}


function resolvePythonCommand() {
  const configured = cleanText(process.env.WBD_INVOICE_PYTHON);
  if (configured) return { command: configured, prefix: [] };

  const bundled = process.platform === "win32"
    ? path.join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
    : path.join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "bin", "python3");
  if (existsSync(bundled)) return { command: bundled, prefix: [] };

  return process.platform === "win32"
    ? { command: "py", prefix: ["-3"] }
    : { command: "python3", prefix: [] };
}


function runGenerator(argumentsList, input) {
  const python = resolvePythonCommand();
  return new Promise((resolve, reject) => {
    const child = spawn(python.command, [...python.prefix, generatorPath, ...argumentsList], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", (error) => reject(new Error(`De bestaande PDF-generator kon niet worden gestart: ${error.message}`)));
    child.once("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8").trim();
      const errorOutput = Buffer.concat(stderr).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(errorOutput || output || "De bestaande PDF-generator gaf geen geldige uitvoer."));
        return;
      }
      resolve(output);
    });

    if (input !== undefined) child.stdin.end(input, "utf8");
    else child.stdin.end();
  });
}


export async function calculateWithExistingGenerator(lines) {
  const output = await runGenerator(["--calculate-stdin"], JSON.stringify({ lines }));
  return JSON.parse(output);
}


async function readTemplate() {
  return JSON.parse(await readFile(templatePath, "utf8"));
}


function normalizeLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => ({
    description: cleanText(line?.description),
    quantity: cleanDecimal(line?.quantity, "1"),
    unit_price: cleanDecimal(line?.unit_price),
    vat_rate: cleanDecimal(line?.vat_rate, "21"),
    price_mode: line?.price_mode === "exclusive" ? "exclusive" : "inclusive",
  }));
}


function normalizeExpectedTotals(expectedTotals) {
  if (!expectedTotals || typeof expectedTotals !== "object") return undefined;
  const exclusive = cleanDecimal(expectedTotals.exclusive);
  const vat = cleanDecimal(expectedTotals.vat);
  const inclusive = cleanDecimal(expectedTotals.inclusive);
  return exclusive && vat && inclusive ? { exclusive, vat, inclusive } : undefined;
}


function normalizeValidation(validation, fallback) {
  const blockers = Array.isArray(validation?.blockers)
    ? validation.blockers.map(cleanText).filter(Boolean)
    : undefined;
  return blockers ? { blockers } : { ...fallback };
}


export function createConceptDocument(template, payload, existing) {
  const conceptId = sanitizeConceptId(payload?.id) ?? sanitizeConceptId(existing?.workspace?.concept_id) ?? randomUUID();
  const now = new Date().toISOString();
  const expectedTotals = normalizeExpectedTotals(existing?.expected_totals ?? payload?.expected_totals);
  return {
    ...template,
    document_status: "concept",
    invoice: {
      ...template.invoice,
      number: cleanText(payload?.invoice?.number),
      date: cleanText(payload?.invoice?.date),
      payment_term_days: Number(payload?.invoice?.payment_term_days) || 14,
      project: cleanText(payload?.invoice?.project),
      reference: cleanText(payload?.invoice?.reference),
    },
    sender: { ...template.sender },
    customer: {
      ...template.customer,
      company_name: cleanText(payload?.customer?.company_name),
      contact_person: cleanText(payload?.customer?.contact_person),
      email: cleanText(payload?.customer?.email).toLowerCase(),
      address: cleanText(payload?.customer?.address),
      postal_code: cleanText(payload?.customer?.postal_code),
      city: cleanText(payload?.customer?.city),
      reference: cleanText(payload?.customer?.reference),
    },
    lines: normalizeLines(payload?.lines),
    ...(expectedTotals ? { expected_totals: expectedTotals } : {}),
    validation: normalizeValidation(existing?.validation ?? payload?.validation, template.validation),
    workspace: {
      concept_id: conceptId,
      created_at: existing?.workspace?.created_at ?? now,
      updated_at: now,
      storage: "Business Foundation → Finance → Facturen → Concepten",
      totals: existing?.workspace?.totals ?? null,
    },
  };
}


function validateForPdf(concept) {
  const required = [
    ["factuurnummer", concept.invoice.number],
    ["factuurdatum", concept.invoice.date],
    ["project", concept.invoice.project],
    ["bedrijfsnaam van de klant", concept.customer.company_name],
    ["adres van de klant", concept.customer.address],
    ["postcode van de klant", concept.customer.postal_code],
    ["plaats van de klant", concept.customer.city],
  ];
  const missing = required.filter(([, value]) => !cleanText(value)).map(([label]) => label);
  if (missing.length) throw new Error(`Vul eerst in: ${missing.join(", ")}.`);
  if (!concept.lines.length) throw new Error("Voeg minimaal één factuurregel toe.");
  if (concept.lines.some((line) => !line.description || !line.unit_price)) {
    throw new Error("Vul voor iedere factuurregel een omschrijving en bedrag in.");
  }
}


function isPlaceholder(value) {
  return /^\s*\[[^\]]+\]\s*$/.test(cleanText(value));
}


async function createFinalInvoice(concept) {
  validateForPdf(concept);
  const placeholderFields = [
    ["referentie", concept.invoice.reference],
    ["contactpersoon", concept.customer.contact_person],
    ["adres van de klant", concept.customer.address],
    ["postcode van de klant", concept.customer.postal_code],
    ["plaats van de klant", concept.customer.city],
    ["klantreferentie", concept.customer.reference],
  ].filter(([, value]) => isPlaceholder(value)).map(([label]) => label);
  if (placeholderFields.length) {
    throw new Error(`Vervang eerst de tijdelijke invulling bij: ${placeholderFields.join(", ")}.`);
  }

  const calculation = await calculateWithExistingGenerator(concept.lines);
  const expected = normalizeExpectedTotals(concept.expected_totals);
  if (expected && Object.keys(expected).some((key) => expected[key] !== calculation.totals[key])) {
    throw new Error("De berekende totalen wijken af van de vastgelegde controlebedragen.");
  }

  const now = new Date().toISOString();
  const resolvedBlockers = Array.isArray(concept.validation?.blockers) ? concept.validation.blockers : [];
  return {
    ...concept,
    document_status: "final",
    validation: {
      blockers: [],
      resolved_blockers: resolvedBlockers,
      resolved_at: now,
      resolution: "Expliciet bevestigd in de WBD Workspace.",
    },
    workspace: {
      ...concept.workspace,
      updated_at: now,
      finalized_at: now,
      storage: "Business Foundation → Finance → Facturen → Verzonden",
      status: "sent",
      locked: true,
      totals: calculation.totals,
    },
  };
}


function finalPdfUrl(id) {
  return `${apiPrefix}/sent/${encodeURIComponent(id)}/pdf`;
}


async function generateFinalPdf(invoice, force = false) {
  const id = sanitizeConceptId(invoice?.workspace?.concept_id);
  if (!id) throw new Error("De definitieve factuur heeft geen geldige opslagcode.");
  await mkdir(finalPdfRoot, { recursive: true });
  await mkdir(sentRoot, { recursive: true });
  const target = path.join(finalPdfRoot, `${id}.pdf`);
  if (!force && existsSync(target)) return finalPdfUrl(id);

  const source = path.join(sentRoot, `.${id}.${process.pid}.pdf-source.json`);
  const temporaryPdf = path.join(finalPdfRoot, `.${id}.${process.pid}.tmp.pdf`);
  await writeFile(source, `${JSON.stringify(invoice, null, 2)}\n`, "utf8");
  try {
    await runGenerator([source, temporaryPdf]);
    if (existsSync(target)) await unlink(target);
    await rename(temporaryPdf, target);
  } finally {
    if (existsSync(source)) await unlink(source);
    if (existsSync(temporaryPdf)) await unlink(temporaryPdf);
  }
  return finalPdfUrl(id);
}


async function ensureFinalPdf(invoice) {
  const pdfUrl = await generateFinalPdf(invoice, false);
  if (invoice.workspace.pdf_url === pdfUrl && invoice.workspace.pdf_generated_at) return invoice;
  const updated = {
    ...invoice,
    workspace: {
      ...invoice.workspace,
      pdf_url: pdfUrl,
      pdf_generated_at: invoice.workspace.pdf_generated_at ?? new Date().toISOString(),
    },
  };
  await writeInvoice(sentRoot, updated);
  return updated;
}

export async function resolveFinalInvoiceMailAttachment(id) {
  const safeId = sanitizeConceptId(id);
  if (!safeId) throw new Error("De definitieve factuur heeft geen geldige opslagcode.");
  let invoice = await readSentInvoice(safeId);
  assertFinalInvoiceMailEligible(invoice);
  invoice = await ensureFinalPdf(invoice);
  const pdfPath = path.join(finalPdfRoot, `${safeId}.pdf`);
  const bytes = await readFile(pdfPath);
  return {
    invoice,
    attachment: {
      id: `wbd-invoice-${safeId}`,
      filename: `wbd-factuur-${safeId}.pdf`,
      mimeType: "application/pdf",
      bytes,
    },
  };
}

export function assertFinalInvoiceMailEligible(invoice) {
  if (!invoice || invoice.document_status !== "final" || invoice.workspace?.locked !== true || invoice.workspace?.status !== "sent") {
    throw new Error("Alleen een definitieve, vergrendelde factuur kan als bijlage worden voorbereid.");
  }
  return true;
}


async function readInvoice(root, id) {
  const safeId = sanitizeConceptId(id);
  if (!safeId) return undefined;
  const invoicePath = path.join(root, `${safeId}.json`);
  if (!existsSync(invoicePath)) return undefined;
  return JSON.parse(await readFile(invoicePath, "utf8"));
}


async function readConcept(id) {
  return readInvoice(conceptRoot, id);
}


async function readSentInvoice(id) {
  return readInvoice(sentRoot, id);
}


async function writeInvoice(root, invoice) {
  await mkdir(root, { recursive: true });
  const id = invoice.workspace.concept_id;
  const target = path.join(root, `${id}.json`);
  const temporary = path.join(root, `.${id}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(invoice, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}


async function writeConcept(concept) {
  return writeInvoice(conceptRoot, concept);
}


export async function deleteConceptDocument(id, roots = {}) {
  const safeId = sanitizeConceptId(id);
  if (!safeId) throw new Error("Het concept heeft geen geldige opslagcode.");

  const concepts = roots.conceptRoot ?? conceptRoot;
  const sent = roots.sentRoot ?? sentRoot;
  const conceptPdfs = roots.pdfRoot ?? pdfRoot;
  const conceptPath = path.join(concepts, `${safeId}.json`);
  const sentPath = path.join(sent, `${safeId}.json`);
  const pdfPath = path.join(conceptPdfs, `${safeId}.pdf`);

  if (existsSync(sentPath)) {
    throw new Error("Definitieve facturen kunnen niet worden verwijderd.");
  }
  if (!existsSync(conceptPath)) throw new Error("Concept niet gevonden.");

  const concept = JSON.parse(await readFile(conceptPath, "utf8"));
  if (concept?.document_status !== "concept") {
    throw new Error("Alleen facturen met conceptstatus kunnen worden verwijderd.");
  }

  // Remove derived output first. If deleting the source record fails, the
  // concept remains recoverable and its PDF can safely be regenerated.
  if (existsSync(pdfPath)) await unlink(pdfPath);
  await unlink(conceptPath);
  return { deleted: true, id: safeId };
}


async function listInvoices(root) {
  await mkdir(root, { recursive: true });
  const names = (await readdir(root)).filter((name) => name.endsWith(".json"));
  const invoices = await Promise.all(names.map(async (name) => {
    try {
      return JSON.parse(await readFile(path.join(root, name), "utf8"));
    } catch {
      return undefined;
    }
  }));
  return invoices
    .filter(Boolean)
    .map((invoice) => ({
      id: invoice.workspace.concept_id,
      number: invoice.invoice.number,
      date: invoice.invoice.date,
      project: invoice.invoice.project,
      customer_name: invoice.customer.company_name,
      updated_at: invoice.workspace.updated_at,
      finalized_at: invoice.workspace.finalized_at,
      totals: invoice.workspace.totals,
    }))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}


async function listConcepts() {
  return listInvoices(conceptRoot);
}


async function listSentInvoices() {
  return listInvoices(sentRoot);
}


export async function finalizeConcept(id, confirmed) {
  const safeId = sanitizeConceptId(id);
  if (!safeId) throw new Error("Het concept heeft geen geldige opslagcode.");
  if (confirmed !== true) throw new Error("Bevestig expliciet dat de factuur definitief mag worden gemaakt.");

  const existingFinal = await readSentInvoice(safeId);
  if (existingFinal) {
    const staleConceptPath = path.join(conceptRoot, `${safeId}.json`);
    if (existsSync(staleConceptPath)) await unlink(staleConceptPath);
    return ensureFinalPdf(existingFinal);
  }
  const concept = await readConcept(safeId);
  if (!concept) throw new Error("Concept niet gevonden.");

  const finalInvoice = await createFinalInvoice(concept);
  const pdfUrl = await generateFinalPdf(finalInvoice, true);
  const finalizedWithPdf = {
    ...finalInvoice,
    workspace: {
      ...finalInvoice.workspace,
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
    },
  };
  await writeInvoice(sentRoot, finalizedWithPdf);
  await unlink(path.join(conceptRoot, `${safeId}.json`));
  return finalizedWithPdf;
}


function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}


function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("De factuurdata is groter dan toegestaan."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("De factuurdata is niet geldig."));
      }
    });
    request.once("error", reject);
  });
}


function assertLocalMailReviewRequest(request) {
  const remote = request.socket?.remoteAddress ?? "";
  if (!new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]).has(remote)) {
    throw Object.assign(new Error("WBD mail capture is alleen vanaf de lokale reviewserver toegestaan."), { statusCode: 403, code: "LOCAL_REVIEW_ONLY" });
  }
  if (request.headers["x-wbd-mail-capture"] !== "1") {
    throw Object.assign(new Error("De lokale mail-capturebevestiging ontbreekt."), { statusCode: 403, code: "CAPTURE_CONFIRMATION_REQUIRED" });
  }
}

export function wbdMailRequest(invoice, attachment) {
  const recipient = cleanText(invoice.customer?.email).toLowerCase();
  const total = invoice.workspace?.totals?.inclusive;
  const paymentTermDays = Number(invoice.invoice?.payment_term_days);
  return {
    organizationId: "we-build-and-design",
    contextType: "invoice",
    contextId: invoice.workspace.concept_id,
    templateKey: "WBD_INVOICE_FINAL",
    recipient,
    context: {
      customer: { name: cleanText(invoice.customer.contact_person) || cleanText(invoice.customer.company_name) },
      invoice: {
        number: cleanText(invoice.invoice.number),
        project: cleanText(invoice.invoice.project),
        total: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(total ?? 0)),
        payment_term: Number.isInteger(paymentTermDays) && paymentTermDays >= 0 ? `${paymentTermDays} dagen` : "Onbekend",
        due_date: formatInvoiceDueDate(invoice.invoice?.date, paymentTermDays),
      },
    },
    attachments: [attachment],
  };
}

async function handleRequest(request, response, options = {}) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const pathname = requestUrl.pathname;
  const method = request.method ?? "GET";

  const invoiceValidationMatch = pathname.match(new RegExp(`^/__wbd-mail-validation/invoice/(status|preview|verify|send)$`, "i"));
  if (invoiceValidationMatch) {
    assertLocalMailReviewRequest(request);
    if (!options.mailFoundation) throw Object.assign(new Error("Mail Foundation is lokaal niet ingericht."), { statusCode: 503, code: "MAIL_FOUNDATION_UNAVAILABLE" });
    const operation = invoiceValidationMatch[1].toLowerCase();
    const actor = { id: "wbd-controlled-smtp-owner", name: "WBD eigenaar", role: "owner" };
    const recipient = String(process.env.WBD_SMTP_TEST_RECIPIENT ?? "").trim();
    const reviewId = /^[a-z0-9-]{4,80}$/i.test(String(process.env.WBD_MAIL_REVIEW_ID ?? ""))
      ? String(process.env.WBD_MAIL_REVIEW_ID)
      : "mail-foundation-003";
    if (operation === "status" && method === "GET") {
      sendJson(response, 200, {
        organization: options.mailFoundation.organizationSummary("we-build-and-design"),
        transport: typeof options.mailFoundation.transport.publicSummary === "function"
          ? options.mailFoundation.transport.publicSummary({ senderPolicy: "WBD_INVOICE" })
          : { mode: "CAPTURE", transport: "capture" },
      });
      return true;
    }
    if (operation === "verify" && method === "POST") {
      if (typeof options.mailFoundation.transport.verify !== "function") {
        throw Object.assign(new Error("De gecontroleerde SMTP-safety gate is niet actief."), { statusCode: 503, code: "SMTP_SEND_DISABLED" });
      }
      sendJson(response, 200, await options.mailFoundation.transport.verify("WBD_INVOICE"));
      return true;
    }
    if (["preview", "send"].includes(operation) && method === "POST") {
      const resolved = await resolveFinalInvoiceMailAttachment("mail-foundation-003-review");
      const mailRequest = {
        ...wbdMailRequest(resolved.invoice, resolved.attachment),
        recipient,
        contextId: `${reviewId}-invoice`,
      };
      const result = operation === "preview"
        ? await options.mailFoundation.preview(mailRequest, actor)
        : await options.mailFoundation.capture({ ...mailRequest, idempotencyKey: `${reviewId}-invoice-real-v1` }, actor);
      sendJson(response, 200, result);
      return true;
    }
  }

  const validationMatch = pathname.match(new RegExp(`^/__wbd-mail-validation/general/(status|preview|verify|send)$`, "i"));
  if (validationMatch) {
    assertLocalMailReviewRequest(request);
    if (!options.mailFoundation) throw Object.assign(new Error("Mail Foundation is lokaal niet ingericht."), { statusCode: 503, code: "MAIL_FOUNDATION_UNAVAILABLE" });
    const operation = validationMatch[1].toLowerCase();
    const actor = { id: "wbd-controlled-smtp-owner", name: "WBD eigenaar", role: "owner" };
    const recipient = String(process.env.WBD_SMTP_TEST_RECIPIENT ?? "").trim();
    const reviewId = /^[a-z0-9-]{4,80}$/i.test(String(process.env.WBD_MAIL_REVIEW_ID ?? ""))
      ? String(process.env.WBD_MAIL_REVIEW_ID)
      : "mail-foundation-003";
    const mailRequest = {
      organizationId: "we-build-and-design",
      contextType: "smtp-validation",
      contextId: `${reviewId}-general`,
      templateKey: "WBD_GENERAL_SMTP_TEST",
      recipient,
      context: {
        recipient: { name: "Donovan" },
        message: {
          subject: "Uw vernieuwde WBD-mailervaring",
          preheader: "Een korte visuele controle van de vernieuwde WBD-mail.",
          heading: "Kort bijgepraat",
          introduction: "De goedgekeurde WBD-mailervaring is nu technisch verwerkt.",
          body: "Deze gecontroleerde test bevat geen klantgegevens en laat de nieuwe rustige WBD-opbouw zien.",
          next_step: "Controleer de afzender, inhoud, handtekening en weergave op uw telefoon.",
        },
      },
    };
    if (operation === "status" && method === "GET") {
      sendJson(response, 200, {
        organization: options.mailFoundation.organizationSummary("we-build-and-design"),
        transport: typeof options.mailFoundation.transport.publicSummary === "function"
          ? options.mailFoundation.transport.publicSummary({ senderPolicy: "WBD_GENERAL" })
          : { mode: "CAPTURE", transport: "capture" },
      });
      return true;
    }
    if (operation === "preview" && method === "POST") {
      sendJson(response, 200, await options.mailFoundation.preview(mailRequest, actor));
      return true;
    }
    if (operation === "verify" && method === "POST") {
      if (typeof options.mailFoundation.transport.verify !== "function") {
        throw Object.assign(new Error("De gecontroleerde SMTP-safety gate is niet actief."), { statusCode: 503, code: "SMTP_SEND_DISABLED" });
      }
      sendJson(response, 200, await options.mailFoundation.transport.verify("WBD_GENERAL"));
      return true;
    }
    if (operation === "send" && method === "POST") {
      sendJson(response, 200, await options.mailFoundation.capture({ ...mailRequest, idempotencyKey: `${reviewId}-general-real-v1` }, actor));
      return true;
    }
  }

  if (pathname === `${apiPrefix}/template` && method === "GET") {
    sendJson(response, 200, await readTemplate());
    return true;
  }

  if (pathname === `${apiPrefix}/calculate` && method === "POST") {
    const payload = await readRequestJson(request);
    sendJson(response, 200, await calculateWithExistingGenerator(normalizeLines(payload.lines)));
    return true;
  }

  if (pathname === `${apiPrefix}/concepts` && method === "GET") {
    sendJson(response, 200, { concepts: await listConcepts() });
    return true;
  }

  if (pathname === `${apiPrefix}/concepts` && method === "POST") {
    const payload = await readRequestJson(request);
    const safeId = sanitizeConceptId(payload.id);
    if (safeId && await readSentInvoice(safeId)) {
      throw new Error("Deze factuur is definitief en vergrendeld voor inhoudelijke wijzigingen.");
    }
    const existing = safeId ? await readConcept(safeId) : undefined;
    const concept = createConceptDocument(await readTemplate(), payload, existing);
    try {
      concept.workspace.totals = (await calculateWithExistingGenerator(concept.lines)).totals;
    } catch {
      concept.workspace.totals = null;
    }
    await writeConcept(concept);
    sendJson(response, 200, { concept });
    return true;
  }

  if (pathname === `${apiPrefix}/sent` && method === "GET") {
    sendJson(response, 200, { invoices: await listSentInvoices() });
    return true;
  }

  const sentMailMatch = pathname.match(new RegExp(`^${apiPrefix}/sent/([a-z0-9-]+)/mail/(preview|capture|history)$`, "i"));
  if (sentMailMatch) {
    assertLocalMailReviewRequest(request);
    if (!options.mailFoundation) throw Object.assign(new Error("Mail Foundation is lokaal niet ingericht."), { statusCode: 503, code: "MAIL_FOUNDATION_UNAVAILABLE" });
    const id = sentMailMatch[1];
    const operation = sentMailMatch[2].toLowerCase();
    const actor = { id: "wbd-local-owner", name: "WBD lokale eigenaar", role: "owner" };
    if (operation === "history" && method === "GET") {
      const invoice = await readSentInvoice(id);
      if (!invoice?.workspace?.locked) throw Object.assign(new Error("Definitieve factuur niet gevonden."), { statusCode: 404, code: "INVOICE_NOT_FOUND" });
      sendJson(response, 200, { history: await options.mailFoundation.history({ organizationId: "we-build-and-design", contextType: "invoice", contextId: invoice.workspace.concept_id }, actor) });
      return true;
    }
    if ((operation === "preview" || operation === "capture") && method === "POST") {
      const payload = await readRequestJson(request);
      const resolved = await resolveFinalInvoiceMailAttachment(id);
      const mailRequest = wbdMailRequest(resolved.invoice, resolved.attachment);
      if (operation === "preview") sendJson(response, 200, await options.mailFoundation.preview(mailRequest, actor));
      else sendJson(response, 200, await options.mailFoundation.capture({ ...mailRequest, idempotencyKey: request.headers["idempotency-key"] }, actor, { simulation: payload.simulation ?? "success" }));
      return true;
    }
  }

  const sentMatch = pathname.match(new RegExp(`^${apiPrefix}/sent/([a-z0-9-]+)$`, "i"));
  if (sentMatch && method === "DELETE") {
    sendJson(response, 409, { error: "Definitieve facturen kunnen niet worden verwijderd." });
    return true;
  }
  if (sentMatch && method === "GET") {
    let invoice = await readSentInvoice(sentMatch[1]);
    if (!invoice) {
      sendJson(response, 404, { error: "Definitieve factuur niet gevonden." });
      return true;
    }
    invoice = await ensureFinalPdf(invoice);
    sendJson(response, 200, { invoice });
    return true;
  }

  const sentPdfMatch = pathname.match(new RegExp(`^${apiPrefix}/sent/([a-z0-9-]+)/pdf$`, "i"));
  if (sentPdfMatch && method === "GET") {
    let invoice = await readSentInvoice(sentPdfMatch[1]);
    if (!invoice) {
      sendJson(response, 404, { error: "Definitieve PDF niet gevonden." });
      return true;
    }
    invoice = await ensureFinalPdf(invoice);
    const id = invoice.workspace.concept_id;
    const pdfPath = path.join(finalPdfRoot, `${id}.pdf`);
    const download = requestUrl.searchParams.get("download") === "1";
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="wbd-factuur-${id}.pdf"`);
    response.setHeader("Cache-Control", "no-store");
    response.end(await readFile(pdfPath));
    return true;
  }

  const finalizeMatch = pathname.match(new RegExp(`^${apiPrefix}/concepts/([a-z0-9-]+)/finalize$`, "i"));
  if (finalizeMatch && method === "POST") {
    const payload = await readRequestJson(request);
    const invoice = await finalizeConcept(finalizeMatch[1], payload.confirmed);
    sendJson(response, 200, { invoice });
    return true;
  }

  const conceptMatch = pathname.match(new RegExp(`^${apiPrefix}/concepts/([a-z0-9-]+)$`, "i"));
  if (conceptMatch && method === "DELETE") {
    sendJson(response, 200, await deleteConceptDocument(conceptMatch[1]));
    return true;
  }
  if (conceptMatch && method === "GET") {
    const concept = await readConcept(conceptMatch[1]);
    if (!concept) {
      sendJson(response, 404, { error: "Concept niet gevonden." });
      return true;
    }
    sendJson(response, 200, { concept });
    return true;
  }

  const generateMatch = pathname.match(new RegExp(`^${apiPrefix}/concepts/([a-z0-9-]+)/generate$`, "i"));
  if (generateMatch && method === "POST") {
    const concept = await readConcept(generateMatch[1]);
    if (!concept) {
      sendJson(response, 404, { error: "Concept niet gevonden." });
      return true;
    }
    validateForPdf(concept);
    await mkdir(pdfRoot, { recursive: true });
    const conceptPath = path.join(conceptRoot, `${concept.workspace.concept_id}.json`);
    const pdfPath = path.join(pdfRoot, `${concept.workspace.concept_id}.pdf`);
    await runGenerator([conceptPath, pdfPath]);
    sendJson(response, 200, {
      pdf_url: `${apiPrefix}/pdf/${encodeURIComponent(concept.workspace.concept_id)}`,
    });
    return true;
  }

  const pdfMatch = pathname.match(new RegExp(`^${apiPrefix}/pdf/([a-z0-9-]+)$`, "i"));
  if (pdfMatch && method === "GET") {
    const id = sanitizeConceptId(pdfMatch[1]);
    const pdfPath = id ? path.join(pdfRoot, `${id}.pdf`) : "";
    if (!id || !existsSync(pdfPath)) {
      sendJson(response, 404, { error: "PDF niet gevonden." });
      return true;
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename="wbd-factuur-${id}.pdf"`);
    response.setHeader("Cache-Control", "no-store");
    response.end(await readFile(pdfPath));
    return true;
  }

  return false;
}


export function createWbdInvoiceDevelopmentMiddleware(options = {}) {
  return (request, response, next) => {
    const requestPath = request.url ?? "";
    if (!requestPath.startsWith(apiPrefix) && !requestPath.startsWith("/__wbd-mail-validation/")) {
      next();
      return;
    }
    void handleRequest(request, response, options).then((handled) => {
      if (!handled) next();
    }).catch((error) => {
      sendJson(response, Number(error?.statusCode) || 422, {
        error: error?.code ?? (error instanceof Error ? error.message : "De factuuractie kon niet worden uitgevoerd."),
        message: error instanceof Error ? error.message : "De factuuractie kon niet worden uitgevoerd.",
      });
    });
  };
}
