import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  CaptureTransport,
  MailFoundation,
  MemoryMailStore,
  createMailOrganizations,
} from "../scripts/mail-foundation.mjs";
import {
  ORGANIZATION_BRANDS,
  OrganizationBrandError,
  buildOrganizationMailShell,
  createOrganizationBrandRegistry,
  publicBrandSummary,
} from "../scripts/organization-brand-foundation.mjs";
import { formatInvoiceDueDate, wbdMailRequest } from "../scripts/wbd-invoice-development-api.mjs";

const actor = { id: "wbd-owner-004b", name: "WBD owner", role: "owner" };
const pdf = Buffer.from("%PDF-1.7\n%%EOF\n", "ascii");

function foundation() {
  return new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(process.cwd(), ".mail-004b-test-captures") }),
  });
}

function generalRequest(overrides = {}) {
  return {
    organizationId: "we-build-and-design",
    contextType: "smtp-validation",
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
    ...overrides,
  };
}

function invoiceRequest(overrides = {}) {
  return {
    organizationId: "we-build-and-design",
    contextType: "invoice",
    contextId: "mail-004b-invoice",
    templateKey: "WBD_INVOICE_FINAL",
    recipient: "donovan@example.test",
    context: {
      customer: { name: "Donovan test" },
      invoice: { number: "TEST-003", project: "Controlled SMTP activation", total: "€ 1,21", payment_term: "14 dagen", due_date: "22-08-2026" },
    },
    attachments: [{ id: "test-003-pdf", filename: "TEST-003.pdf", mimeType: "application/pdf", bytes: pdf }],
    ...overrides,
  };
}

test("organization brand foundation bewaart de goedgekeurde WBD-config en assetstatus", () => {
  const config = createOrganizationBrandRegistry().get("we-build-and-design");
  const summary = publicBrandSummary(config);
  assert.equal(summary.metadata.version, "WBD-BRAND-FOUNDATION-004C2");
  assert.equal(summary.brand.primary_color, "#08161A");
  assert.equal(summary.brand.accent_color, "#C7A166");
  assert.equal(summary.assets.email_logo.status, "owner_approved");
  assert.equal(summary.assets.email_logo.reference, "cid:brand-we-build-and-design-email-logo");
  assert.equal(summary.assets.email_logo.approved_by, "owner / Donovan");
  assert.equal(summary.assets.primary_logo.sha256, "b82bcb75111105cf5017c61ae9661be3ae7cccfdecd77e3f0f723585d99524c5");
});

test("mail-safe logo gebruikt de owner-approved CID-authority", async () => {
  const preview = await foundation().preview(generalRequest(), actor);
  assert.match(preview.html, /<img[^>]+src="cid:brand-we-build-and-design-email-logo"/i);
  assert.equal(preview.inlineAssets.length, 1);
  assert.equal(preview.inlineAssets[0].sha256, "342ecff3490157106f4a71161d54407b3f6aad71be48c09e5720bdc183e4d9f4");
  assert.equal(preview.organization.brand.assets.email_logo.version, "WBD-LOGO-CANDIDATE-004C1-MAIL-SAFE");
});

test("generieke mailshell is client-safe, 600px en gebruikt alleen organisatiepalet", async () => {
  const preview = await foundation().preview(generalRequest(), actor);
  assert.match(preview.html, /role="presentation"/);
  assert.match(preview.html, /max-width:600px/);
  assert.match(preview.html, /font-size:16px/);
  for (const color of ["#08161A", "#F7F4EE", "#C7A166", "#17221F"]) assert.match(preview.html, new RegExp(color, "i"));
  assert.doesNotMatch(preview.html, /<script\b|javascript:|#ff4422|#111111/i);
});

test("algemene mail behoudt sender policy, natuurlijke inhoud en Donovan-signatuur", async () => {
  const preview = await foundation().preview(generalRequest(), actor);
  assert.equal(preview.senderPolicy, "WBD_GENERAL");
  assert.match(preview.sender, /info@webuildanddesign\.nl/);
  assert.equal(preview.subject, "Uw vernieuwde WBD-mailervaring");
  assert.match(preview.text, /Met vriendelijke groet,\nDonovan\nWe Build And Design/);
  assert.match(preview.text, /info@webuildanddesign\.nl/);
});

test("factuurmail toont operationele feiten, geen CTA en ongewijzigde sender policy", async () => {
  const preview = await foundation().preview(invoiceRequest(), actor);
  assert.equal(preview.senderPolicy, "WBD_INVOICE");
  assert.match(preview.sender, /facturen@webuildanddesign\.nl/);
  for (const fact of ["TEST-003", "Controlled SMTP activation", "€ 1,21", "14 dagen", "22-08-2026"]) {
    assert.match(preview.text, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(preview.html, /<a[^>]+(?:button|cta)|Bekijk factuur|Betaal nu/i);
  assert.match(preview.text, /Bijlage: Factuur TEST-003 \(PDF\)/);
});

test("contextinjectie wordt ge-escaped en onveilige action-URL's worden geweigerd", async () => {
  const injected = generalRequest();
  injected.context.message.body = '<img src=x onerror="alert(1)">';
  const preview = await foundation().preview(injected, actor);
  assert.doesNotMatch(preview.html, /<img src=x/);
  assert.match(preview.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.throws(() => buildOrganizationMailShell({
    brandConfig: ORGANIZATION_BRANDS["we-build-and-design"],
    preheader: "Test", eyebrow: "Test", heading: "Test", contentHtml: "Test", closingHtml: "Test",
    action: { label: "Open", href: "javascript:alert(1)" },
  }), (error) => error instanceof OrganizationBrandError && error.code === "BRAND_ACTION_UNSAFE");
  const malicious = structuredClone(ORGANIZATION_BRANDS);
  malicious["we-build-and-design"].assets.email_logo.reference = "../../secrets/logo.png";
  assert.throws(() => createOrganizationBrandRegistry(malicious), (error) => error instanceof OrganizationBrandError && error.code === "BRAND_ASSET_UNSAFE");
  const filesystemInjection = structuredClone(ORGANIZATION_BRANDS);
  filesystemInjection["we-build-and-design"].assets.email_logo.embedded_source = "C:\\secrets\\logo.png";
  assert.throws(() => createOrganizationBrandRegistry(filesystemInjection), (error) => error instanceof OrganizationBrandError && error.code === "BRAND_ASSET_UNSAFE");
});

test("organization separation houdt WBD-branding uit Sportpaleis-mail", async () => {
  const preview = await foundation().preview({
    organizationId: "sportpaleis", contextType: "order", contextId: "SP-004B", templateKey: "ORDER_RECEIVED",
    recipient: "klant@example.test",
    context: {
      customer: { name: "Klant" },
      order: { number: "SP-004B", items: "Shirt", processingDays: 3, pickupInformation: "Winkel" },
      message: { question: "Geen" },
    },
  }, { id: "store-004b", name: "Winkel", role: "store" });
  assert.equal(preview.organization.brand.organization_id, "sportpaleis");
  assert.equal(preview.organization.brand.metadata.status, "approved");
  assert.doesNotMatch(preview.html, /We Build And Design|#08161A|#C7A166/i);
});

test("factuuradapter berekent betaaltermijn en vervaldatum zonder PDF-mutatie", async () => {
  assert.equal(formatInvoiceDueDate("2026-08-08", 14), "22-08-2026");
  assert.equal(formatInvoiceDueDate("ongeldig", 14), "Onbekend");
  const invoice = JSON.parse(await readFile(path.resolve("..", "invoices", "wbd", "data", "sent", "mail-foundation-003-review.json"), "utf8"));
  const pdfPath = path.resolve("..", "output", "pdf", "sent", "mail-foundation-003-review.pdf");
  const before = createHash("sha256").update(await readFile(pdfPath)).digest("hex");
  const request = wbdMailRequest(invoice, { id: "existing-pdf", filename: "TEST-003.pdf", mimeType: "application/pdf", bytes: await readFile(pdfPath) });
  assert.equal(request.context.invoice.payment_term, "14 dagen");
  assert.equal(request.context.invoice.due_date, "22-08-2026");
  await foundation().preview({ ...request, recipient: "donovan@example.test" }, actor);
  const after = createHash("sha256").update(await readFile(pdfPath)).digest("hex");
  assert.equal(after, before);
});
