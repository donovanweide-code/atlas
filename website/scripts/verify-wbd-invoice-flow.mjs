import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const conceptId = "qa-001a1-e2e-20260804";
const conceptPath = path.join(repositoryRoot, "invoices", "wbd", "data", "concepts", `${conceptId}.json`);
const sentPath = path.join(repositoryRoot, "invoices", "wbd", "data", "sent", `${conceptId}.json`);
const pdfPath = path.join(repositoryRoot, "output", "pdf", "concepts", `${conceptId}.pdf`);
const finalPdfPath = path.join(repositoryRoot, "output", "pdf", "sent", `${conceptId}.pdf`);
let origin = "";

async function json(pathname, options) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await response.json();
  assert.equal(response.ok, true, body.error);
  return body;
}

const server = await createServer({
  root: websiteRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});

try {
  await rm(conceptPath, { force: true });
  await rm(sentPath, { force: true });
  await rm(pdfPath, { force: true });
  await rm(finalPdfPath, { force: true });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
  const calculation = await json("/__wbd-invoices/calculate", {
    method: "POST",
    body: JSON.stringify({
      lines: [
        { description: "Inclusief", quantity: "1", unit_price: "100.00", vat_rate: "21", price_mode: "inclusive" },
        { description: "Exclusief", quantity: "1", unit_price: "75.00", vat_rate: "21", price_mode: "exclusive" },
      ],
    }),
  });
  assert.deepEqual(calculation.totals, { exclusive: "157.64", vat: "33.11", inclusive: "190.75" });

  const saved = await json("/__wbd-invoices/concepts", {
    method: "POST",
    body: JSON.stringify({
      id: conceptId,
      invoice: { number: "QA-001A1", date: "2026-08-04", payment_term_days: 14, project: "Project 001A.1", reference: "Ketenproef" },
      customer: { company_name: "QA Relatie", contact_person: "Test", address: "Teststraat 1", postal_code: "1000 AA", city: "Amsterdam", reference: "QA" },
      lines: [
        { description: "Inclusieve ketenproef", quantity: "1", unit_price: "100.00", vat_rate: "21", price_mode: "inclusive" },
        { description: "Exclusieve ketenproef", quantity: "1", unit_price: "75.00", vat_rate: "21", price_mode: "exclusive" },
      ],
    }),
  });
  assert.equal(saved.concept.workspace.concept_id, conceptId);
  assert.equal(saved.concept.workspace.totals.inclusive, "190.75");

  const reopened = await json(`/__wbd-invoices/concepts/${conceptId}`);
  assert.equal(reopened.concept.invoice.reference, "Ketenproef");
  assert.equal(reopened.concept.lines.length, 2);

  const generated = await json(`/__wbd-invoices/concepts/${conceptId}/generate`, { method: "POST" });
  const pdfResponse = await fetch(`${origin}${generated.pdf_url}`);
  assert.equal(pdfResponse.ok, true);
  assert.equal(pdfResponse.headers.get("content-type"), "application/pdf");
  const pdf = Buffer.from(await pdfResponse.arrayBuffer());
  assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(pdf.length > 10_000);

  const unconfirmedResponse = await fetch(`${origin}/__wbd-invoices/concepts/${conceptId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed: false }),
  });
  const unconfirmed = await unconfirmedResponse.json();
  assert.equal(unconfirmedResponse.ok, false);
  assert.match(unconfirmed.error, /Bevestig expliciet/i);
  const stillConcept = await json(`/__wbd-invoices/concepts/${conceptId}`);
  assert.equal(stillConcept.concept.document_status, "concept");

  const finalized = await json(`/__wbd-invoices/concepts/${conceptId}/finalize`, {
    method: "POST",
    body: JSON.stringify({ confirmed: true }),
  });
  assert.equal(finalized.invoice.document_status, "final");
  assert.equal(finalized.invoice.workspace.locked, true);
  assert.equal(finalized.invoice.workspace.status, "sent");
  assert.equal(finalized.invoice.workspace.pdf_url, `/__wbd-invoices/sent/${conceptId}/pdf`);
  assert.deepEqual(finalized.invoice.validation.blockers, []);

  const finalPdfResponse = await fetch(`${origin}${finalized.invoice.workspace.pdf_url}`);
  assert.equal(finalPdfResponse.ok, true);
  assert.equal(finalPdfResponse.headers.get("content-type"), "application/pdf");
  assert.match(finalPdfResponse.headers.get("content-disposition"), /^inline;/);
  const finalPdf = Buffer.from(await finalPdfResponse.arrayBuffer());
  assert.equal(finalPdf.subarray(0, 4).toString("ascii"), "%PDF");
  assert.ok(finalPdf.length > 10_000);

  const downloadResponse = await fetch(`${origin}${finalized.invoice.workspace.pdf_url}?download=1`);
  assert.equal(downloadResponse.ok, true);
  assert.match(downloadResponse.headers.get("content-disposition"), /^attachment;/);

  const conceptsAfterFinalize = await json("/__wbd-invoices/concepts");
  assert.equal(conceptsAfterFinalize.concepts.some((concept) => concept.id === conceptId), false);
  const sentAfterFinalize = await json("/__wbd-invoices/sent");
  assert.equal(sentAfterFinalize.invoices.some((invoice) => invoice.id === conceptId), true);
  const reopenedFinal = await json(`/__wbd-invoices/sent/${conceptId}`);
  assert.equal(reopenedFinal.invoice.workspace.locked, true);

  const lockedSaveResponse = await fetch(`${origin}/__wbd-invoices/concepts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...saved.concept, id: conceptId }),
  });
  const lockedSave = await lockedSaveResponse.json();
  assert.equal(lockedSaveResponse.ok, false);
  assert.match(lockedSave.error, /definitief en vergrendeld/i);

  console.log(JSON.stringify({ calculation: calculation.totals, reopened: true, pdfBytes: pdf.length, finalPdfBytes: finalPdf.length, finalized: true, locked: true }));
} finally {
  await server.close();
  await rm(conceptPath, { force: true });
  await rm(sentPath, { force: true });
  await rm(pdfPath, { force: true });
  await rm(finalPdfPath, { force: true });
}
