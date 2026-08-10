import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "./mail-foundation.mjs";
import { wbdMailRequest } from "./wbd-invoice-development-api.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const outputRoot = path.join(repositoryRoot, "output", "mail-foundation-004b-review");
const publicReviewRoot = path.join(websiteRoot, "public", "__wbd-mail-004b-review");
const fixturePath = path.join(repositoryRoot, "invoices", "wbd", "data", "sent", "mail-foundation-003-review.json");
const pdfPath = path.join(repositoryRoot, "output", "pdf", "sent", "mail-foundation-003-review.pdf");
const actor = { id: "wbd-owner-004b-review", name: "WBD owner", role: "owner" };

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

if (process.argv.includes("--cleanup-public")) {
  await rm(publicReviewRoot, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ removed: publicReviewRoot, outputPreserved: outputRoot })}\n`);
  process.exit(0);
}

function reviewFrame(title, subtitle, body) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body{margin:0;min-height:100%;background:#dfe5e2}body{font-family:Arial,Helvetica,sans-serif}.review{padding:18px 20px;background:#08161A;color:#F7F4EE;border-bottom:4px solid #C7A166}.review strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.review span{display:block;margin-top:3px;font-size:13px;line-height:19px}.mail{min-height:calc(100vh - 82px)}</style></head><body><header class="review"><strong>${title}</strong><span>${subtitle}</span></header><main class="mail">${body}</main></body></html>`;
}

function plainTextFrame(general, invoice) {
  const section = (title, subject, value) => `<section><p class="eyebrow">${title}</p><h2>${subject}</h2><pre>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre></section>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WBD Mail 004B plain text</title><style>body{margin:0;padding:32px;background:#F7F4EE;color:#17221F;font-family:Arial,Helvetica,sans-serif}main{max-width:880px;margin:auto}.eyebrow{color:#80642f;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:normal}section{margin:24px 0;padding:24px;border:1px solid #C7A166}pre{white-space:pre-wrap;font:15px/23px Arial,Helvetica,sans-serif}</style></head><body><main><h1>Inhoudelijk gelijkwaardige plain-textversies</h1>${section("WBD_GENERAL", general.subject, general.text)}${section("WBD_INVOICE", invoice.subject, invoice.text)}</main></body></html>`;
}

function mobileFrame(title, source, height) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — mobile</title><style>body{margin:0;padding:28px;background:#dfe5e2;color:#17221F;font-family:Arial,Helvetica,sans-serif}.label{max-width:390px;margin:0 auto 12px}.label strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.label span{font-size:13px;line-height:19px}.phone{width:390px;max-width:100%;margin:auto;border:1px solid #08161A;background:#F7F4EE;box-shadow:0 12px 30px rgba(8,22,26,.18)}iframe{display:block;width:390px;max-width:100%;height:${height}px;border:0}</style></head><body><header class="label"><strong>${title}</strong><span>iOS/Gmail mobiele breedte · 390 px</span></header><div class="phone"><iframe title="${title}" src="${source}"></iframe></div></body></html>`;
}

await Promise.all([mkdir(outputRoot, { recursive: true }), mkdir(publicReviewRoot, { recursive: true })]);
const invoice = JSON.parse(await readFile(fixturePath, "utf8"));
const pdfBytes = await readFile(pdfPath);
const pdfHashBefore = sha256(pdfBytes);
const foundation = new MailFoundation({
  organizations: createMailOrganizations(),
  store: new MemoryMailStore(),
  transport: new CaptureTransport({ captureDirectory: path.join(outputRoot, "captures") }),
});
const general = await foundation.preview({
  organizationId: "we-build-and-design",
  contextType: "mail-review",
  contextId: "mail-004b-general",
  templateKey: "WBD_GENERAL_SMTP_TEST",
  recipient: "donovan@example.test",
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
}, actor);
const invoicePreview = await foundation.preview({
  ...wbdMailRequest(invoice, { id: "wbd-invoice-mail-004b", filename: "WBD-factuur-TEST-003.pdf", mimeType: "application/pdf", bytes: pdfBytes }),
  recipient: "donovan@example.test",
}, actor);
const pdfHashAfter = sha256(await readFile(pdfPath));
if (pdfHashAfter !== pdfHashBefore) throw new Error("De bestaande factuur-PDF is tijdens review gewijzigd.");

const pages = {
  "general.html": reviewFrame("WBD_GENERAL — implemented", `${general.sender} · ${general.subject}`, general.html),
  "invoice.html": reviewFrame("WBD_INVOICE — implemented", `${invoicePreview.sender} · ${invoicePreview.subject}`, invoicePreview.html),
  "plain-text.html": plainTextFrame(general, invoicePreview),
  "general-mobile.html": mobileFrame("WBD_GENERAL — mobile", "general.html", 920),
  "invoice-mobile.html": mobileFrame("WBD_INVOICE — mobile", "invoice.html", 1080),
};
await Promise.all([
  ...Object.entries(pages).flatMap(([filename, contents]) => [
    writeFile(path.join(outputRoot, filename), contents, "utf8"),
    writeFile(path.join(publicReviewRoot, filename), contents, "utf8"),
  ]),
  writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    external_mail_sent: false,
    general: { sender: general.sender, sender_policy: general.senderPolicy, subject: general.subject, template_version: general.templateVersion },
    invoice: { sender: invoicePreview.sender, sender_policy: invoicePreview.senderPolicy, subject: invoicePreview.subject, template_version: invoicePreview.templateVersion, facts: invoicePreview.context },
    brand: general.organization.brand,
    logo: { official_source_confirmed: false, mail_safe_logo_ready: false, status: "FALLBACK_USED", fallback: "We Build And Design" },
    existing_invoice_pdf: { path: pdfPath, sha256_before: pdfHashBefore, sha256_after: pdfHashAfter, modified: false },
  }, null, 2)}\n`, "utf8"),
]);

process.stdout.write(`${JSON.stringify({ outputRoot, pdfHashBefore, pdfHashAfter, externalMailSent: false }, null, 2)}\n`);
