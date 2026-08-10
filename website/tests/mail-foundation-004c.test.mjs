import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import {
  ORGANIZATION_BRANDS,
  buildOrganizationCorporateFooter,
  buildOrganizationPlainTextFooter,
  createOrganizationBrandRegistry,
} from "../scripts/organization-brand-foundation.mjs";

const actor = { id: "wbd-owner-004c", name: "WBD owner", role: "owner" };
const pdfBytes = Buffer.from("%PDF-1.7\n%%EOF\n", "ascii");

function foundation() {
  return new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(process.cwd(), ".mail-004c-test-captures") }),
  });
}

function generalRequest() {
  return {
    organizationId: "we-build-and-design", contextType: "review", contextId: "mail-004c-general",
    templateKey: "WBD_GENERAL_SMTP_TEST", recipient: "donovan@example.test",
    context: {
      recipient: { name: "Donovan" },
      message: {
        subject: "Uw vernieuwde WBD-mailervaring", preheader: "Visuele 004C-review.", heading: "Kort bijgepraat",
        introduction: "De WBD-mailervaring is visueel aangescherpt.",
        body: "De persoonlijke boodschap en zakelijke presentatie blijven duidelijk gescheiden.",
        next_step: "Controleer de gedeelde corporate footer op desktop en mobiel.",
      },
    },
  };
}

function invoiceRequest() {
  return {
    organizationId: "we-build-and-design", contextType: "invoice", contextId: "mail-004c-invoice",
    templateKey: "WBD_INVOICE_FINAL", recipient: "donovan@example.test",
    context: {
      customer: { name: "Donovan test" },
      invoice: { number: "TEST-003", project: "Controlled SMTP activation", total: "€ 1,21", payment_term: "14 dagen", due_date: "22-08-2026" },
    },
    attachments: [{ id: "test-003-pdf", filename: "TEST-003.pdf", mimeType: "application/pdf", bytes: pdfBytes }],
  };
}

test("WBD corporate profile gebruikt uitsluitend dubbel bevestigde bedrijfsgegevens", () => {
  const profile = createOrganizationBrandRegistry().get("we-build-and-design").corporate;
  assert.deepEqual({
    legal_name: profile.legal_name, address: profile.address, postal_code: profile.postal_code, city: profile.city,
    phone: profile.phone, general_email: profile.general_email, website: profile.website,
    registration_number: profile.registration_number, vat_number: profile.vat_number, tagline: profile.tagline,
  }, {
    legal_name: "We Build And Design", address: "Gerard Terborchstraat 35", postal_code: "1318 LE", city: "Almere",
    phone: "06 100 67 964", general_email: "info@webuildanddesign.nl", website: "webuildanddesign.nl",
    registration_number: "69326126", vat_number: "NL190255879B01", tagline: "Onze naam begint met bouwen. Ons werk begint met begrijpen.",
  });
  assert.equal(profile.source_references.length >= 3, true);
});

test("algemene mail scheidt persoonlijke handtekening van gedeelde corporate footer", async () => {
  const preview = await foundation().preview(generalRequest(), actor);
  assert.equal(preview.templateVersion, 3);
  assert.match(preview.html, /Met vriendelijke groet,<br><strong>Donovan<\/strong><br>We Build And Design/);
  assert.match(preview.html, /border-top:3px solid #C7A166/i);
  for (const value of ["Gerard Terborchstraat 35", "1318 LE Almere", "06 100 67 964", "KvK 69326126", "BTW NL190255879B01"]) assert.match(preview.html, new RegExp(value));
  assert.match(preview.html, /Onze naam begint met bouwen\. Ons werk begint met begrijpen\./i);
  assert.doesNotMatch(preview.html, /Design the understanding first|Eerst begrijpen, dan verbeteren|NL16 KNAB/i);
  assert.match(preview.html, /<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">/i);
  assert.match(preview.html, /a\[x-apple-data-detectors\][\s\S]+\.wbd-no-autolink a/i);
  assert.match(preview.html, /\.wbd-intentional-link\[x-apple-data-detectors\][^{]*\{[^}]+pointer-events:auto!important/i);
  assert.match(preview.html, /<td class="wbd-corporate-footer-cell" width="100%" style="width:100%;padding:0;/i);
  assert.match(preview.html, /<table class="wbd-corporate-footer"[^>]+width="100%"[^>]+width:100%!important;min-width:100%;margin:0/i);
  assert.match(preview.html, /href="tel:0610067964"/i);
  assert.match(preview.html, /href="mailto:info@webuildanddesign\.nl"/i);
  assert.match(preview.html, /href="https:\/\/webuildanddesign\.nl"/i);
  const footer = preview.html.slice(preview.html.indexOf('<table class="wbd-corporate-footer"'));
  assert.doesNotMatch(footer, /<a[^>]*>[\s\S]{0,80}(?:Gerard Terborchstraat|1318 LE Almere|KvK 69326126|BTW NL190255879B01)/i);
  assert.match(footer, /padding:17px 20px 16px/i);
  assert.match(footer, /margin-top:13px/i);
  assert.doesNotMatch(footer, /margin-top:32px/i);
});

test("factuurmail behoudt kern en feitenblok en gebruikt dezelfde footerfamilie", async () => {
  const preview = await foundation().preview(invoiceRequest(), actor);
  assert.equal(preview.templateVersion, 3);
  assert.equal(preview.subject, "Factuur TEST-003 - Controlled SMTP activation");
  for (const value of ["Factuurnummer", "Project", "Bedrag", "Betaaltermijn", "Vervaldatum", "€ 1,21", "22-08-2026"]) assert.match(preview.html, new RegExp(value));
  assert.match(preview.html, /facturen@webuildanddesign\.nl/);
  assert.match(preview.html, /href="mailto:facturen@webuildanddesign\.nl"/i);
  assert.match(preview.html, /Gerard Terborchstraat 35/);
  assert.doesNotMatch(preview.html, /Bekijk factuur|Betaal nu|Mollie|ideal/i);
});

test("plain text houdt persoonlijke afsluiting en corporate footer inhoudelijk gescheiden", async () => {
  const general = await foundation().preview(generalRequest(), actor);
  const invoice = await foundation().preview(invoiceRequest(), actor);
  assert.match(general.text, /Met vriendelijke groet,\nDonovan\nWe Build And Design\n\n---\nCONTACT/);
  assert.match(invoice.text, /Bijlage: Factuur TEST-003 \(PDF\)\n\n---\nCONTACT/);
  for (const text of [general.text, invoice.text]) {
    assert.match(text, /CONTACT\n06 100 67 964[\s\S]+Gerard Terborchstraat 35\n1318 LE Almere\n\nWE BUILD AND DESIGN/);
    assert.match(text, /Onze naam begint met bouwen\. Ons werk begint met begrijpen\./);
    assert.match(text, /KvK 69326126\nBTW NL190255879B01/);
  }
});

test("ontbrekende optionele corporate velden verdwijnen veilig zonder UNKNOWN in echte mail", () => {
  const seed = structuredClone(ORGANIZATION_BRANDS);
  Object.assign(seed["we-build-and-design"].corporate, { tagline: null, address: null, postal_code: null, city: null, phone: null, registration_number: null, vat_number: null });
  const config = createOrganizationBrandRegistry(seed).get("we-build-and-design");
  const html = buildOrganizationCorporateFooter({ brandConfig: config });
  const text = buildOrganizationPlainTextFooter({ brandConfig: config });
  assert.doesNotMatch(`${html}\n${text}`, /UNKNOWN|KvK|BTW|Gerard|06 100/i);
  assert.match(html, /info@webuildanddesign\.nl/);
});

test("generieke footergenerator lekt geen WBD-data naar een andere organisatie", () => {
  const acme = structuredClone(ORGANIZATION_BRANDS["we-build-and-design"]);
  acme.organization_id = "voorbeeld-organisatie";
  acme.brand.display_name = "Voorbeeld Organisatie";
  acme.corporate = {
    legal_name: "Voorbeeld Organisatie B.V.", tagline: null, address: null, postal_code: null, city: null, phone: null,
    general_email: "info@voorbeeld.nl", website: "voorbeeld.nl", registration_number: null, vat_number: null,
    source_references: ["server-controlled-test-fixture"],
  };
  for (const asset of Object.values(acme.assets)) if (asset) Object.assign(asset, { status: "draft", reference: null, embedded_source: null, sha256: null, approved_by: null, approved_at: null });
  const config = createOrganizationBrandRegistry({ "voorbeeld-organisatie": acme }).get("voorbeeld-organisatie");
  const footer = buildOrganizationCorporateFooter({ brandConfig: config });
  assert.match(footer, /Voorbeeld Organisatie B\.V\./);
  assert.doesNotMatch(footer, /We Build And Design|webuildanddesign|69326126/);
});

test("owner-approved logoauthority is gedeeld, faalt veilig terug en laat factuur-PDF hash-identiek", async () => {
  const preview = await foundation().preview(generalRequest(), actor);
  const invoicePreview = await foundation().preview(invoiceRequest(), actor);
  for (const rendered of [preview, invoicePreview]) {
    assert.match(rendered.html, /<img[^>]+src="cid:brand-we-build-and-design-email-logo"/i);
    assert.equal(rendered.organization.brand.assets.email_logo.status, "owner_approved");
    assert.equal(rendered.inlineAssets.length, 1);
    assert.equal(rendered.inlineAssets[0].contentId, "brand-we-build-and-design-email-logo");
  }
  const fallbackSeed = structuredClone(ORGANIZATION_BRANDS);
  Object.assign(fallbackSeed["we-build-and-design"].assets.email_logo, { status: "draft", reference: null, embedded_source: null, sha256: null, approved_by: null, approved_at: null });
  const fallbackConfig = createOrganizationBrandRegistry(fallbackSeed).get("we-build-and-design");
  const fallback = buildOrganizationCorporateFooter({ brandConfig: fallbackConfig });
  assert.doesNotMatch(fallback, /<img\b/i);
  assert.match(fallback, />We Build And Design<\/div>/);
  const pdfPath = path.resolve("..", "output", "pdf", "sent", "mail-foundation-003-review.pdf");
  const before = createHash("sha256").update(await readFile(pdfPath)).digest("hex");
  await foundation().preview(invoiceRequest(), actor);
  const after = createHash("sha256").update(await readFile(pdfPath)).digest("hex");
  assert.equal(after, before);
  assert.equal(after, "8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b");
});
