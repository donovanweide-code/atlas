import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "./mail-foundation.mjs";
import { buildOrganizationCorporateFooter, createOrganizationBrandRegistry } from "./organization-brand-foundation.mjs";
import { wbdMailRequest } from "./wbd-invoice-development-api.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const outputRoot = path.join(repositoryRoot, "output", "mail-foundation-004c2-review");
const publicReviewRoot = path.join(websiteRoot, "public", "__wbd-mail-004c2-review");
const fixturePath = path.join(repositoryRoot, "invoices", "wbd", "data", "sent", "mail-foundation-003-review.json");
const pdfPath = path.join(repositoryRoot, "output", "pdf", "sent", "mail-foundation-003-review.pdf");
const cid = "cid:brand-we-build-and-design-email-logo";
const localLogo = "/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-mail-safe-light-candidate.png";
const actor = { id: "wbd-owner-004c2-review", name: "WBD owner", role: "owner" };

if (process.argv.includes("--cleanup-public")) {
  await rm(publicReviewRoot, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ removed: publicReviewRoot, outputPreserved: outputRoot })}\n`);
  process.exit(0);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const localRender = (html) => html.replaceAll(cid, localLogo);

function frame(title, subtitle, body) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body{margin:0;min-height:100%;background:#dfe5e2}body{font-family:Arial,Helvetica,sans-serif}.review{padding:18px 20px;background:#08161A;color:#F7F4EE;border-bottom:4px solid #C7A166}.review strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.review span{display:block;margin-top:3px;font-size:13px;line-height:19px}.mail{min-height:calc(100vh - 82px)}</style></head><body><header class="review"><strong>${title}</strong><span>${subtitle}</span></header><main class="mail">${body}</main></body></html>`;
}

function mobileFrame(title, source, height) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#dfe5e2;color:#17221F;font-family:Arial,Helvetica,sans-serif}.label{width:390px;max-width:100%;margin:0 auto 12px}.label strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.label span{font-size:13px;line-height:19px}.phone{width:390px;max-width:100%;margin:auto;border:1px solid #08161A;background:#F7F4EE;box-shadow:0 12px 30px rgba(8,22,26,.18)}iframe{display:block;width:390px;max-width:100%;height:${height}px;border:0}</style></head><body><header class="label"><strong>${title}</strong><span>Exacte mailbreedte: 390 px</span></header><div class="phone"><iframe title="${title}" src="${source}"></iframe></div></body></html>`;
}

function footerFrame(title, footerHtml, width = 600) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;padding:34px;background:#dfe5e2;color:#17221F;font-family:Arial,Helvetica,sans-serif}.label,.canvas{width:${width}px;max-width:100%;margin:auto}.label{margin-bottom:12px}.label strong{font:normal 25px/32px Georgia,"Times New Roman",serif}.label span{display:block;font-size:13px}.canvas{padding:${width === 390 ? 18 : 30}px;background:#F7F4EE;border:1px solid #08161A}</style></head><body><header class="label"><strong>${title}</strong><span>Owner-approved CID-logo uit Organization Brand Foundation - ${width}px</span></header><main class="canvas">${localRender(footerHtml)}</main></body></html>`;
}

await Promise.all([mkdir(outputRoot, { recursive: true }), mkdir(publicReviewRoot, { recursive: true })]);
const invoice = JSON.parse(await readFile(fixturePath, "utf8"));
const pdfBytes = await readFile(pdfPath);
const invoiceHash = sha256(pdfBytes);
const brandConfig = createOrganizationBrandRegistry().get("we-build-and-design");
const foundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(outputRoot, "captures") }) });
const general = await foundation.preview({
  organizationId: "we-build-and-design", contextType: "mail-review", contextId: "mail-004c2-general",
  templateKey: "WBD_GENERAL_SMTP_TEST", recipient: "donovan@example.test",
  context: { recipient: { name: "Donovan" }, message: {
    subject: "Uw vernieuwde WBD-mailervaring", preheader: "Finale visuele controle met het officiële WBD-logo.", heading: "Kort bijgepraat",
    introduction: "De WBD-mailervaring is visueel afgerond.",
    body: "Het owner-approved W/BD-logo wordt nu veilig uit de Organization Brand Foundation geladen.",
    next_step: "Controleer het logo, de persoonlijke afsluiting en corporate footer op desktop en mobiel.",
  } },
}, actor);
const invoicePreview = await foundation.preview({ ...wbdMailRequest(invoice, { id: "wbd-invoice-mail-004c2", filename: "WBD-factuur-TEST-003.pdf", mimeType: "application/pdf", bytes: pdfBytes }), recipient: "donovan@example.test" }, actor);
const generalFooter = buildOrganizationCorporateFooter({ brandConfig, email: "info@webuildanddesign.nl" });
const invoiceFooter = buildOrganizationCorporateFooter({ brandConfig, email: "facturen@webuildanddesign.nl" });
const imagesOffGeneral = localRender(general.html).replaceAll(localLogo, "/__missing-owner-approved-wbd-logo.png");

const pages = {
  "general.html": frame("WBD_GENERAL 004C.2", `${general.sender} - official logo active`, localRender(general.html)),
  "invoice.html": frame("WBD_INVOICE 004C.2", `${invoicePreview.sender} - invoice core preserved`, localRender(invoicePreview.html)),
  "general-mobile.html": mobileFrame("WBD_GENERAL 004C.2 - mobile", "general.html", 1540),
  "invoice-mobile.html": mobileFrame("WBD_INVOICE 004C.2 - mobile", "invoice.html", 1780),
  "header-footer.html": footerFrame("Approved header and corporate footer", generalFooter),
  "invoice-footer.html": footerFrame("Approved invoice footer", invoiceFooter),
  "general-footer-390.html": footerFrame("WBD_GENERAL footer", generalFooter, 390),
  "invoice-footer-390.html": footerFrame("WBD_INVOICE footer", invoiceFooter, 390),
  "images-off.html": frame("Images-off failure fallback", "Broken image source demonstrates alt text; delivery fails closed when the server asset/hash is invalid", imagesOffGeneral),
};

await Promise.all([
  ...Object.entries(pages).flatMap(([filename, contents]) => [writeFile(path.join(outputRoot, filename), contents, "utf8"), writeFile(path.join(publicReviewRoot, filename), contents, "utf8")]),
  writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({
    generated_at: new Date().toISOString(), external_mail_sent: false, production_deployment: false,
    brand_authority: { version: brandConfig.metadata.version, organization_id: brandConfig.organization_id, status: brandConfig.assets.primary_logo.status, approved_by: brandConfig.assets.primary_logo.approved_by, approved_at: brandConfig.assets.primary_logo.approved_at },
    logo: { master: brandConfig.assets.primary_logo, email: brandConfig.assets.email_logo, light: brandConfig.assets.optional_light_logo, dark: brandConfig.assets.optional_dark_logo },
    general: { sender: general.sender, subject: general.subject, inline_assets: general.inlineAssets, contains_cid: general.html.includes(cid) },
    invoice: { sender: invoicePreview.sender, subject: invoicePreview.subject, inline_assets: invoicePreview.inlineAssets, contains_cid: invoicePreview.html.includes(cid), attachment_count: invoicePreview.attachments.length },
    invoice_pdf: { path: pdfPath, sha256_before: invoiceHash, sha256_after: sha256(await readFile(pdfPath)), modified: false },
  }, null, 2)}\n`, "utf8"),
]);

process.stdout.write(`${JSON.stringify({ outputRoot, invoiceHash, externalMailSent: false }, null, 2)}\n`);
