import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "./mail-foundation.mjs";
import { buildOrganizationCorporateFooter, createOrganizationBrandRegistry } from "./organization-brand-foundation.mjs";
import { wbdMailRequest } from "./wbd-invoice-development-api.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const outputRoot = path.join(repositoryRoot, "output", "mail-foundation-004c1-review");
const publicReviewRoot = path.join(websiteRoot, "public", "__wbd-mail-004c1-review");
const fixturePath = path.join(repositoryRoot, "invoices", "wbd", "data", "sent", "mail-foundation-003-review.json");
const pdfPath = path.join(repositoryRoot, "output", "pdf", "sent", "mail-foundation-003-review.pdf");
const actor = { id: "wbd-owner-004c1-review", name: "WBD owner", role: "owner" };

if (process.argv.includes("--cleanup-public")) {
  await rm(publicReviewRoot, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ removed: publicReviewRoot, outputPreserved: outputRoot })}\n`);
  process.exit(0);
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function escaped(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

function reviewFrame(title, subtitle, body) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body{margin:0;min-height:100%;background:#dfe5e2}body{font-family:Arial,Helvetica,sans-serif}.review{padding:18px 20px;background:#08161A;color:#F7F4EE;border-bottom:4px solid #C7A166}.review strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.review span{display:block;margin-top:3px;font-size:13px;line-height:19px}.mail{min-height:calc(100vh - 82px)}</style></head><body><header class="review"><strong>${title}</strong><span>${subtitle}</span></header><main class="mail">${body}</main></body></html>`;
}

function mobileFrame(title, source, height) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - mobile</title><style>body{margin:0;padding:28px;background:#dfe5e2;color:#17221F;font-family:Arial,Helvetica,sans-serif}.label{max-width:390px;margin:0 auto 12px}.label strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.label span{font-size:13px;line-height:19px}.phone{width:390px;max-width:100%;margin:auto;border:1px solid #08161A;background:#F7F4EE;box-shadow:0 12px 30px rgba(8,22,26,.18)}iframe{display:block;width:390px;max-width:100%;height:${height}px;border:0}</style></head><body><header class="label"><strong>${title}</strong><span>iOS/Gmail mobiele breedte · 390 px</span></header><div class="phone"><iframe title="${title}" src="${source}"></iframe></div></body></html>`;
}

function mobileFooterFrame(title, footerHtml) {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#dfe5e2;color:#17221F;font-family:Arial,Helvetica,sans-serif}.label{width:390px;max-width:100%;margin:0 auto 12px}.label strong{display:block;font:normal 22px/29px Georgia,"Times New Roman",serif}.label span{font-size:13px;line-height:19px}.phone{width:390px;max-width:100%;margin:auto;padding:18px;background:#F7F4EE;border:1px solid #08161A;box-shadow:0 12px 30px rgba(8,22,26,.18)}</style></head><body><header class="label"><strong>${title}</strong><span>Footer detail op exacte 390 px mailbreedte</span></header><main class="phone">${footerHtml}</main></body></html>`;
}

function plainTextFrame(general, invoice) {
  const section = (title, subject, value) => `<section><p>${title}</p><h2>${subject}</h2><pre>${escaped(value)}</pre></section>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WBD Mail 004C plain text</title><style>body{margin:0;padding:32px;background:#F7F4EE;color:#17221F;font-family:Arial,Helvetica,sans-serif}main{max-width:880px;margin:auto}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:normal}section{margin:24px 0;padding:24px;border:1px solid #C7A166}section>p{color:#80642f;font-size:12px;font-weight:bold;letter-spacing:1px}pre{white-space:pre-wrap;font:15px/23px Arial,Helvetica,sans-serif}</style></head><body><main><h1>004C plain-textfooter</h1>${section("WBD_GENERAL", general.subject, general.text)}${section("WBD_INVOICE", invoice.subject, invoice.text)}</main></body></html>`;
}

function logoCandidateFrame() {
  const root = "/assets/organizations/we-build-and-design/logo-candidate-004c1";
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WBD Official Logo Candidate</title><style>*{box-sizing:border-box}body{margin:0;background:#F0E8D8;color:#17221F;font-family:Arial,Helvetica,sans-serif}.mast{padding:26px 34px;background:#08161A;color:#F7F4EE;border-bottom:4px solid #C7A166}.mast p{margin:0;color:#C7A166;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase}.mast h1{margin:8px 0 0;font:normal 34px/42px Georgia,"Times New Roman",serif}.mast span{display:block;margin-top:8px;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:1040px;margin:auto;padding:28px}.card{min-height:220px;padding:26px;border:1px solid rgba(8,22,26,.15);background:#F7F4EE}.card--dark{background:#08161A;color:#F7F4EE}.label{margin:0 0 22px;color:#9A763B;font-size:10px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase}.logo{display:block;width:236px;max-width:100%;height:auto}.mail{padding:0}.mail-head{padding:25px 28px;background:#08161A;border-bottom:4px solid #C7A166}.mail-foot{padding:22px 24px;background:#08161A;border-top:3px solid #C7A166}.mail-foot p{max-width:360px;margin:12px 0 0;color:#F7F4EE;font:italic 14px/20px Georgia,"Times New Roman",serif}.mobile{width:390px;max-width:100%;min-height:230px;margin:auto;padding:24px 20px;background:#08161A;border:8px solid #17221F;border-radius:22px}.mobile .logo{width:146px}.mobile p{margin:14px 0 0;color:#F7F4EE;font:italic 13px/19px Georgia,"Times New Roman",serif}.status{grid-column:1/-1;padding:20px 24px;background:#173A31;color:#F7F4EE}.status strong{color:#C7A166}.status p{margin:4px 0;font-size:13px;line-height:20px}@media(max-width:720px){.mast{padding:22px 20px}.mast h1{font-size:28px;line-height:35px}.grid{grid-template-columns:1fr;padding:18px}.status{grid-column:auto}}</style></head><body><header class="mast"><p>WBD Mail 004C.1</p><h1>WBD OFFICIAL LOGO CANDIDATE</h1><span>Bestaande W/BD-identiteit - geen redesign - menselijke visuele GO vereist</span></header><main class="grid"><section class="card"><p class="label">Master op crème/wit</p><img class="logo" src="${root}/wbd-logo-master-candidate.svg" alt="WBD-logo kandidaat in nachtgroen"></section><section class="card card--dark"><p class="label">Light variant op nachtgroen</p><img class="logo" src="${root}/wbd-logo-light-candidate.svg" alt="WBD-logo kandidaat in crème"></section><section class="card mail"><p class="label" style="padding:20px 24px 0">Toepassing in mailheader</p><div class="mail-head"><img class="logo" src="${root}/wbd-logo-mail-safe-light-candidate.png" alt="Mail-safe WBD-logo kandidaat"></div></section><section class="card mail"><p class="label" style="padding:20px 24px 0">Toepassing in corporate footer</p><div class="mail-foot"><img class="logo" src="${root}/wbd-logo-mail-safe-light-candidate.png" alt="Mail-safe WBD-logo kandidaat"><p>Onze naam begint met bouwen. Ons werk begint met begrijpen.</p></div></section><section class="card" style="grid-column:1/-1"><p class="label">Klein formaat / mobiele weergave - 390 px</p><div class="mobile"><img class="logo" src="${root}/wbd-logo-mail-safe-light-candidate.png" alt="Kleine WBD-logo kandidaat"><p>Onze naam begint met bouwen. Ons werk begint met begrijpen.</p></div></section><section class="status"><p><strong>STATUS</strong> REVIEW_REQUIRED</p><p>Websitebron: ca3d1bd90128ae25c033eae2c9b73d95b0c1d512 - Factuurvector: e91b80a0eddf1cf495d66587b1c71e0d081ac5da</p><p>Live mailfallback blijft actief. Owner approval toegepast: NO.</p></section></main></body></html>`;
}

await Promise.all([mkdir(outputRoot, { recursive: true }), mkdir(publicReviewRoot, { recursive: true })]);
const invoice = JSON.parse(await readFile(fixturePath, "utf8"));
const pdfBytes = await readFile(pdfPath);
const pdfHashBefore = sha256(pdfBytes);
const brandConfig = createOrganizationBrandRegistry().get("we-build-and-design");
const foundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(outputRoot, "captures") }) });
const general = await foundation.preview({
  organizationId: "we-build-and-design", contextType: "mail-review", contextId: "mail-004c1-general",
  templateKey: "WBD_GENERAL_SMTP_TEST", recipient: "donovan@example.test",
  context: {
    recipient: { name: "Donovan" },
    message: {
      subject: "Uw vernieuwde WBD-mailervaring",
      preheader: "Een korte visuele controle van de aangescherpte WBD-mail.",
      heading: "Kort bijgepraat",
      introduction: "De WBD-mailervaring is visueel aangescherpt.",
      body: "De persoonlijke boodschap en de vaste bedrijfsinformatie hebben ieder een duidelijke eigen plaats gekregen.",
      next_step: "Controleer de rustige afsluiting en gedeelde corporate footer op desktop en mobiel.",
    },
  },
}, actor);
const invoicePreview = await foundation.preview({ ...wbdMailRequest(invoice, { id: "wbd-invoice-mail-004c1", filename: "WBD-factuur-TEST-003.pdf", mimeType: "application/pdf", bytes: pdfBytes }), recipient: "donovan@example.test" }, actor);
const corporateFooter = buildOrganizationCorporateFooter({ brandConfig });
const invoiceCorporateFooter = buildOrganizationCorporateFooter({ brandConfig, email: "facturen@webuildanddesign.nl" });
const footerCloseUp = reviewFrame("WBD Corporate Footer - 004C.1", "Contactlaag + nachtgroene corporate laag · owner-approved tagline subtiel toegepast", `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:44px 18px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#F7F4EE;"><tr><td style="padding:32px;color:#17221F;">${corporateFooter}</td></tr></table></td></tr></table>`);
const pages = {
  "general.html": reviewFrame("WBD_GENERAL 004C.1 - polished", `${general.sender} · ${general.subject}`, general.html),
  "invoice.html": reviewFrame("WBD_INVOICE 004C.1 - shared footer", `${invoicePreview.sender} · kern en feitenblok behouden`, invoicePreview.html),
  "general-mobile.html": mobileFrame("WBD_GENERAL 004C.1 - mobile", "general.html", 1420),
  "invoice-mobile.html": mobileFrame("WBD_INVOICE 004C.1 - mobile", "invoice.html", 1680),
  "general-mobile-footer.html": mobileFooterFrame("WBD_GENERAL footer - 390 px", corporateFooter),
  "invoice-mobile-footer.html": mobileFooterFrame("WBD_INVOICE footer - 390 px", invoiceCorporateFooter),
  "corporate-footer.html": footerCloseUp,
  "logo-candidate.html": logoCandidateFrame(),
  "plain-text.html": plainTextFrame(general, invoicePreview),
};
await Promise.all([
  ...Object.entries(pages).flatMap(([filename, contents]) => [writeFile(path.join(outputRoot, filename), contents, "utf8"), writeFile(path.join(publicReviewRoot, filename), contents, "utf8")]),
  writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({
    generated_at: new Date().toISOString(), external_mail_sent: false,
    comparison: { preserved: ["003B transport foundation", "393-test baseline", "sender policies", "invoice subject", "invoice facts block", "PDF attachment", "no CTA", "safe text logo fallback"], improved: ["night-green corporate footer", "contact/corporate layer separation", "owner-approved tagline", "logo candidate provenance"], unknown: ["logo candidate owner approval"] },
    logo: { external_original_required: false, existing_implementation_found: true, provenance_identified: true, candidate_version: "WBD-LOGO-CANDIDATE-004C1", candidate_status: "REVIEW_REQUIRED", owner_approval_applied: false, master_candidate_created: true, mail_safe_candidate_created: true, logo_redesigned: false, live_fallback_preserved: true },
    tagline: { owner_approved: true, selected: "Onze naam begint met bouwen. Ons werk begint met begrijpen.", authority: "Donovan - WBD Mail 004C.1 human decision" },
    corporate_profile: brandConfig.corporate,
    general: { sender: general.sender, subject: general.subject, template_version: general.templateVersion },
    invoice: { sender: invoicePreview.sender, subject: invoicePreview.subject, template_version: invoicePreview.templateVersion, attachment_count: invoicePreview.attachments.length },
    existing_invoice_pdf: { path: pdfPath, sha256_before: pdfHashBefore, sha256_after: sha256(await readFile(pdfPath)), modified: false },
  }, null, 2)}\n`, "utf8"),
]);
process.stdout.write(`${JSON.stringify({ outputRoot, pdfHashBefore, externalMailSent: false }, null, 2)}\n`);
