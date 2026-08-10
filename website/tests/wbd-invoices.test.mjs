import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  calculateWithExistingGenerator,
  createConceptDocument,
  deleteConceptDocument,
  sanitizeConceptId,
} from "../scripts/wbd-invoice-development-api.mjs";

test("laat de bestaande Python-logica inclusief en exclusief btw samen berekenen", async () => {
  const result = await calculateWithExistingGenerator([
    { description: "Inclusieve regel", quantity: "1", unit_price: "100.00", vat_rate: "21", price_mode: "inclusive" },
    { description: "Exclusieve regel", quantity: "1", unit_price: "75.00", vat_rate: "21", price_mode: "exclusive" },
  ]);

  assert.deepEqual(result.totals, { exclusive: "157.64", vat: "33.11", inclusive: "190.75" });
  assert.deepEqual(result.lines[0], { net: "82.64", vat: "17.36", gross: "100.00" });
  assert.deepEqual(result.lines[1], { net: "75.00", vat: "15.75", gross: "90.75" });
});

test("verwijdert alleen conceptdata en een afgeleide concept-PDF", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-invoice-delete-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const roots = {
    conceptRoot: path.join(root, "concepts"),
    sentRoot: path.join(root, "sent"),
    pdfRoot: path.join(root, "pdf"),
  };
  await Promise.all(Object.values(roots).map((directory) => mkdir(directory, { recursive: true })));
  const id = "concept-delete-001";
  const conceptPath = path.join(roots.conceptRoot, `${id}.json`);
  const pdfPath = path.join(roots.pdfRoot, `${id}.pdf`);
  await writeFile(conceptPath, JSON.stringify({ document_status: "concept" }), "utf8");
  await writeFile(pdfPath, "derived", "utf8");

  assert.deepEqual(await deleteConceptDocument(id, roots), { deleted: true, id });
  await assert.rejects(readFile(conceptPath), { code: "ENOENT" });
  await assert.rejects(readFile(pdfPath), { code: "ENOENT" });
});

test("verwijdert ook een leeg concept, maar weigert definitieve data", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-invoice-delete-guard-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const roots = {
    conceptRoot: path.join(root, "concepts"),
    sentRoot: path.join(root, "sent"),
    pdfRoot: path.join(root, "pdf"),
  };
  await Promise.all(Object.values(roots).map((directory) => mkdir(directory, { recursive: true })));

  const emptyId = "empty-concept-001";
  await writeFile(path.join(roots.conceptRoot, `${emptyId}.json`), JSON.stringify({ document_status: "concept", invoice: {}, lines: [] }), "utf8");
  await deleteConceptDocument(emptyId, roots);

  const sentId = "sent-invoice-001";
  await writeFile(path.join(roots.conceptRoot, `${sentId}.json`), JSON.stringify({ document_status: "concept" }), "utf8");
  await writeFile(path.join(roots.sentRoot, `${sentId}.json`), JSON.stringify({ document_status: "final" }), "utf8");
  await assert.rejects(deleteConceptDocument(sentId, roots), /Definitieve facturen kunnen niet worden verwijderd/);
  assert.equal(JSON.parse(await readFile(path.join(roots.conceptRoot, `${sentId}.json`), "utf8")).document_status, "concept");
});

test("bouwt een heropenbaar concept op de vaste WBD-template zonder de afzender te overschrijven", async () => {
  const template = JSON.parse(await readFile(new URL("../../invoices/wbd/data/wbd-invoice-template.json", import.meta.url), "utf8"));
  const concept = createConceptDocument(template, {
    invoice: { number: "F2026-001", date: "2026-08-04", payment_term_days: 21, project: "Project 001A.1", reference: "WBD" },
    sender: { company_name: "Onjuiste afzender" },
    customer: { company_name: "Voorbeeld BV", address: "Straat 1", postal_code: "1000 AA", city: "Amsterdam" },
    lines: [{ description: "Werk", quantity: "1", unit_price: "121,00", vat_rate: "21", price_mode: "inclusive" }],
    expected_totals: { exclusive: "100,00", vat: "21,00", inclusive: "121,00" },
    validation: { blockers: ["Controleer het factuurnummer."] },
  });

  assert.equal(concept.sender.company_name, "We Build And Design");
  assert.equal(concept.invoice.number, "F2026-001");
  assert.equal(concept.lines[0].price_mode, "inclusive");
  assert.equal(concept.lines[0].unit_price, "121.00");
  assert.deepEqual(concept.expected_totals, { exclusive: "100.00", vat: "21.00", inclusive: "121.00" });
  assert.deepEqual(concept.validation.blockers, ["Controleer het factuurnummer."]);
  assert.equal(concept.workspace.storage, "Business Foundation → Finance → Facturen → Concepten");
  assert.ok(sanitizeConceptId(concept.workspace.concept_id));
  assert.equal(sanitizeConceptId("../../factuur"), undefined);

  const reopened = createConceptDocument(template, {
    id: concept.workspace.concept_id,
    invoice: concept.invoice,
    customer: concept.customer,
    lines: concept.lines,
  }, concept);
  assert.deepEqual(reopened.expected_totals, concept.expected_totals);
  assert.deepEqual(reopened.validation, concept.validation);
});

test("biedt alle afgesproken invoervelden, conceptacties en de vaste generatorbridge", async () => {
  const [interfaceSource, apiSource, generatorSource, viteSource] = await Promise.all([
    readFile(new URL("../src/wbd-invoices.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/wbd-invoice-development-api.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../invoices/wbd/invoice.py", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);

  for (const field of ["invoice_number", "invoice_date", "payment_term_days", "project", "reference", "company_name", "contact_person", "address", "postal_code", "city", "customer_reference"]) {
    assert.match(interfaceSource, new RegExp(`\\b${field}\\b`));
  }
  for (const lineField of ["description", "quantity", "unit_price", "price_mode", "vat_rate"]) {
    assert.match(interfaceSource, new RegExp(`data-line-field=["']${lineField}["']`));
  }
  assert.match(interfaceSource, /Opslaan als concept/);
  assert.match(interfaceSource, /PDF genereren/);
  assert.match(interfaceSource, /Factuur definitief maken/);
  assert.match(interfaceSource, /Concept verwijderen/);
  assert.match(interfaceSource, /Ja, verwijder concept/);
  assert.match(interfaceSource, /Ja, maak definitief/);
  assert.match(interfaceSource, /facturen\/verzonden/);
  assert.match(interfaceSource, /inhoud is vergrendeld/i);
  assert.match(interfaceSource, /PDF openen/);
  assert.match(interfaceSource, /PDF downloaden/);
  assert.match(interfaceSource, />Printen</);
  assert.match(interfaceSource, /Factuur vergrendeld/);
  assert.match(interfaceSource, /Gegenereerde PDF openen/);
  assert.match(interfaceSource, /Inclusief btw/);
  assert.match(interfaceSource, /Exclusief btw/);
  assert.match(apiSource, /runGenerator\(\[conceptPath, pdfPath\]\)/);
  assert.match(apiSource, /document_status: "final"/);
  assert.match(apiSource, /locked: true/);
  assert.match(apiSource, /await unlink\(path\.join\(conceptRoot/);
  assert.match(apiSource, /Deze factuur is definitief en vergrendeld/);
  assert.match(apiSource, /Definitieve facturen kunnen niet worden verwijderd/);
  assert.match(apiSource, /generateFinalPdf/);
  assert.match(apiSource, /Content-Disposition/);
  assert.match(apiSource, /download.*attachment/);
  assert.match(generatorSource, /--calculate-stdin/);
  assert.match(viteSource, /createWbdInvoiceDevelopmentMiddleware/);
});
