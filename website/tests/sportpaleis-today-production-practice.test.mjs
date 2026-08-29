import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { parseSportpaleisDividePdfText } from "../scripts/sportpaleis-divide-import.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { verifiedProductionNumberSources } from "../src/sportpaleis/verified-production-number-sources.mjs";

const passwords = { kevin: "Practice-Kevin-2026!", patrick: "Practice-Patrick-2026!", collega: "Practice-Store-2026!", "donovan-support": "Practice-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-today-practice-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-TODAY-PRODUCTION-PRACTICE-TEST", allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

function textPdf(lines) {
  const escaped = lines.map((line) => String(line).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const drawing = `BT /F1 11 Tf 50 760 Td ${escaped.map((line, index) => `${index ? "0 -17 Td " : ""}(${line}) Tj`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(drawing)} >>\nstream\n${drawing}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

const sourceHash = "a".repeat(64);

test("vijf echte productiebronnen blijven byte-identiek, leveren 0-9 en koppelen aan de juiste profielen", async (context) => {
  const expected = [
    ["pioneers-rug-junior-160", "1C336C5E380A3100DDFD2318302D2AC10ACE60F4E44F4E544509DD628920522B", 160],
    ["hockey-rug-200", "4F30D058BE23E208EBA9FA40A5779A9E0FA826FDAEAA34F51029ADF57F887293", 200],
    ["pioneers-short-80", "E89630E0450B35F10AE1D0DA1C231AF98E5E6D96B887DE3DE9629F2A2FF29860", 80],
    ["hockey-short-75", "17859D2173CFC5A75B488CEA75033A92D22EBAE036C989EE226DA6E40B43F015", 75],
    ["pioneers-rug-senior-200", "58343DD0C38F913C871E3AB421A48AF48304FAED80BFF67A5CF407DA65EE839C", 200],
  ];
  const entries = verifiedProductionNumberSources();
  assert.equal(entries.length, expected.length);
  for (const [key, expectedSha, expectedHeight] of expected) {
    const entry = entries.find(({ definition }) => definition.key === key);
    assert.ok(entry, key);
    const bytes = Buffer.from(entry.source.original.dataBase64, "base64");
    assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), expectedSha);
    assert.equal(entry.source.original.sha256, expectedSha);
    assert.equal(entry.source.candidates.length, 10);
    assert.equal(new Set(entry.source.candidates.map(({ geometryHash }) => geometryHash)).size, 10);
    assert.deepEqual(Object.keys(entry.element.numberGlyphs), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    assert.equal(entry.element.lifecycleStatus, "PRODUCTION_READY");
    assert.equal(entry.element.variants[0].heightMm, expectedHeight);
    assert.equal(entry.element.sourceLayers.vectorSource.sha256, expectedSha);
  }
  assert.equal(entries.find(({ definition }) => definition.key === "pioneers-rug-senior-200").source.inspection.svg.excludedTextAnnotationCount, 1);
  assert.equal(entries.find(({ definition }) => definition.key === "hockey-rug-200").source.inspection.svg.excludedTextAnnotationCount, 0);

  const { service, operator } = await fixture(context);
  const bootstrap = await service.bootstrap(operator.token);
  assert.equal(bootstrap.productionElements.filter(({ verifiedSourceKey }) => Boolean(verifiedSourceKey)).length, 5);
  const junior = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: "260000104-J", provenance: "Pioneers junior source fixture", association: "Almere Pioneers", customer: "Pioneers Junior", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ articleId: "sp-live-116386", size: "M", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "18", backNumberSizeClass: "JUNIOR" } }],
  }, "pioneers-junior-exact-source")).value;
  assert.equal(junior.productionLines[0].heightMm, 160);
  assert.equal(junior.productionLines[0].source.id, "production-asset-verified-pioneers-rug-junior-160");
  assert.equal(junior.productionLines[0].validation.status, "VALID");
});

test("SV Huizen Webshop-PDF bewaart de artikelspecifieke bedrukking per artikel", () => {
  const parsed = parseSportpaleisDividePdfText({ sourceDocumentId: sourceHash, sourceHash, pages: [[
    "260000101", "Klantnaam: Mees van den Berg", "Vereniging: FC Huizen", "Orderdatum: 25-08-2026",
    "Artikelnummer: 131252", "Omschrijving: SV Huizen Trainingsbroek", "Maat: L", "Aantal: 1", "Kleur: Zwart", "Initialen: MB", "Naam (Rug): Mees",
    "Artikelnummer: 131250", "Omschrijving: SV Huizen Pro Backpack Junior", "Maat: One size", "Aantal: 1", "Kleur: Zwart", "Initialen: MB", "Naam (Rug): Mees",
    "Artikelnummer: 131247", "Omschrijving: SV Huizen Training Shirt", "Maat: L", "Aantal: 1", "Kleur: Blauw", "Initialen: MB", "Naam (Rug): Mees",
    "Artikelnummer: 131246", "Omschrijving: SV Huizen Training Top", "Maat: L", "Aantal: 1", "Kleur: Blauw", "Initialen: MB", "Naam (Rug): Mees",
  ].join("\n")] });
  const articles = parsed.orders[0].articles;
  assert.deepEqual(articles.map(({ articleNumber, articlePersonalizationRule, personalization }) => [articleNumber, articlePersonalizationRule?.kind, personalization.map(({ kind }) => kind)]), [
    ["131252", "INITIALS", ["INITIALS"]],
    ["131250", "INITIALS", ["INITIALS"]],
    ["131247", "BACK_NAME", ["BACK_NAME"]],
    ["131246", "BACK_NAME", ["BACK_NAME"]],
  ]);
});

test("mail-PDF wordt immutable, dedupe-safe en pas na Human Check één Webshoporder", async (context) => {
  const { service, store, operator } = await fixture(context);
  const bytes = textPdf(["260000102", "Klantnaam: Team Huizen", "Vereniging: FC Huizen", "Orderdatum: 25-08-2026", "Artikelnummer: 131252", "Omschrijving: SV Huizen Trainingsbroek", "Maat: L", "Aantal: 1", "Kleur: Zwart", "Initialen: TH"]);
  const payload = { sourceMessageId: "divide-message-260000102", receivedAt: "2026-08-25T07:15:00.000Z", filename: "webshop-260000102.pdf", mimeType: "application/pdf", dataBase64: bytes.toString("base64") };
  const first = await service.ingestWebshopMailDocument(operator.token, operator.csrfToken, payload, "ingest-260000102-a");
  const duplicate = await service.ingestWebshopMailDocument(operator.token, operator.csrfToken, payload, "ingest-260000102-b");
  assert.equal(duplicate.value.source.id, first.value.source.id);
  assert.equal(first.value.matches.length, 1);
  assert.equal((await store.read()).webshopIntake.sources.length, 1);
  const persisted = (await store.read()).webshopIntake.sources[0];
  assert.equal(persisted.immutable, true);
  assert.deepEqual(Buffer.from(persisted.dataBase64, "base64"), bytes);
  await assert.rejects(service.acceptWebshopMatch(operator.token, operator.csrfToken, first.value.matches[0].id, { explicitAgreement: false }), (error) => error.code === "WEBSHOP_AGREEMENT_REQUIRED");
  const accepted = await service.acceptWebshopMatch(operator.token, operator.csrfToken, first.value.matches[0].id, { explicitAgreement: true, customer: "Team Huizen", association: "FC Huizen", customerEmail: "", customerPhone: "" });
  assert.equal(accepted.value.sourceContext.source, "WEBSHOP_XPRT");
  assert.equal(accepted.value.sourceContext.externalReference, "260000102");
  assert.equal(accepted.value.sourceContext.webshopDocument.sourceId, first.value.source.id);
  assert.equal(accepted.value.communication.requiredForIndividualOrder, false);
  assert.equal((await service.acceptWebshopMatch(operator.token, operator.csrfToken, first.value.matches[0].id, { explicitAgreement: true })).duplicate, true);
  const printed = await service.recordWebshopOrderPrint(operator.token, operator.csrfToken, accepted.value.id, "print-260000102");
  const reprinted = await service.recordWebshopOrderPrint(operator.token, operator.csrfToken, accepted.value.id, "reprint-260000102");
  assert.equal(printed.value.kind, "PRINT");
  assert.equal(reprinted.value.kind, "REPRINT");
  assert.deepEqual((await store.read()).webshopIntake.printEvents.map(({ kind }) => kind), ["REPRINT", "PRINT"]);
});

test("VVA / Spartaan voorraadlogo is uitsluitend Webshop, verlaagt 74 eenmaal en maakt geen PlotJob", async (context) => {
  const { service, store, operator } = await fixture(context);
  const bytes = textPdf(["260000103", "Klantnaam: VVA Praktijk", "Vereniging: VVA / Spartaan", "Artikelnummer: 140823", "Omschrijving: VVA/Spartaan Training shirt", "Maat: M", "Aantal: 2", "Kleur: Zwart", "Voorraadlogo: VVA / Spartaan"]);
  const ingested = await service.ingestWebshopMailDocument(operator.token, operator.csrfToken, { sourceMessageId: "divide-message-260000103", receivedAt: "2026-08-25T07:20:00.000Z", filename: "webshop-260000103.pdf", mimeType: "application/pdf", dataBase64: bytes.toString("base64") }, "ingest-260000103");
  const accepted = await service.acceptWebshopMatch(operator.token, operator.csrfToken, ingested.value.matches[0].id, { explicitAgreement: true, customer: "VVA Praktijk", association: "VVA / Spartaan", customerEmail: "", customerPhone: "" });
  assert.deepEqual(accepted.value.stockApplications.map(({ quantity, status, source }) => [quantity, status, source]), [[2, "PENDING", "WEBSHOP_XPRT"]]);
  const jobsBefore = (await store.read()).productionJobs.length;
  const applied = await service.applyWebshopStockLogo(operator.token, operator.csrfToken, accepted.value.id, { expectedRevision: accepted.value.revision }, "apply-stock-260000103");
  const duplicate = await service.applyWebshopStockLogo(operator.token, operator.csrfToken, accepted.value.id, { expectedRevision: accepted.value.revision }, "apply-stock-260000103");
  assert.equal(duplicate.value.id, applied.value.id);
  const state = await store.read();
  assert.equal(state.webshopIntake.stockLogo.currentStock, 72);
  assert.equal(state.webshopIntake.stockLogo.unconfirmedValue20, 20);
  assert.equal(state.webshopIntake.stockLogo.mutations.length, 1);
  assert.equal(state.productionJobs.length, jobsBefore);
  assert.ok(state.audit.some(({ action, details }) => action === "Webshop voorraadlogo fysiek toegepast" && details.plotJobCreated === false));
  await assert.rejects(service.applyWebshopStockLogo(operator.token, operator.csrfToken, accepted.value.id, { expectedRevision: applied.value.revision }, "apply-stock-260000103-new"), (error) => error.code === "WEBSHOP_STOCK_LOGO_NOT_PENDING");
});

test("Pioneers 45 gebruikt de echte rug- en shortbronnen en houdt borst fail-closed", async (context) => {
  const { service, store, operator } = await fixture(context);
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: "260000104", provenance: "Gecontroleerde webshop-PDF fixture", association: "Almere Pioneers", customer: "Pioneers 45", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "45", chestNumber: "45", backNumberSizeClass: "SENIOR" } },
      { articleId: "sp-live-116387", size: "L", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "45" } },
    ],
  }, "pioneers-45-webshop-order")).value;
  assert.deepEqual(created.productionLines.map(({ content, heightMm, preview }) => [content, heightMm, preview.label]), [
    ["45", 200, "Rugnummer 45"],
    ["45", 80, "Borstnummer 45"],
    ["45", 80, "Shortnummer 45"],
  ]);
  assert.ok(created.productionLines.every(({ source }) => source.id !== "font-0f330cf7aa7dd6c6"));
  const [back, chest, shorts] = created.productionLines;
  assert.equal(back.source.id, "production-asset-verified-pioneers-rug-senior-200");
  assert.equal(back.validation.status, "VALID");
  assert.equal(shorts.source.id, "production-asset-verified-pioneers-short-80");
  assert.equal(shorts.validation.status, "VALID");
  assert.equal(chest.validation.status, "BLOCKED");
  assert.match(chest.validation.reason, /FFF englisch|productiebron/iu);
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, "pioneers-45-control")).value;
  await assert.rejects(service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "pioneers-45-proposal"), (error) => ["PIONEERS_NUMBER_SOURCE_REVIEW_REQUIRED", "PIONEERS_NUMBER_SOURCE_MISMATCH", "ORDER_NOT_READY"].includes(error.code));
  assert.equal((await store.read()).productionJobs.some(({ snapshot }) => snapshot?.orders?.some(({ id }) => id === created.id)), false);
});

test("SC Buitenboys shortnummer 19 materialiseert exact eenmaal naast bestaande initialen en vereist Spain", async (context) => {
  const { service, operator } = await fixture(context);
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: "260000105", provenance: "Gecontroleerde SC Buitenboys praktijkfixture", association: "SC Buitenboys", customer: "Buitenboys 19", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [
      { articleId: "sp-live-140294", size: "L", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "19" } },
      { articleId: "sp-live-140300", size: "L", quantity: 1, deviation: true, overrides: { ...empty, initials: "AB" } },
    ],
  }, "sc-buitenboys-short-19-cardinality")).value;
  const shortLines = created.productionLines.filter(({ personalizationField }) => personalizationField === "shortsNumber");
  const initialsLines = created.productionLines.filter(({ personalizationField }) => personalizationField === "initials");
  assert.equal(shortLines.length, 1);
  assert.equal(shortLines[0].quantity, 1);
  assert.equal(shortLines[0].content, "19");
  assert.deepEqual(shortLines[0].decorationIdentity, {
    orderId: created.id, itemId: shortLines[0].itemId, articleNumber: "140294", decorationType: "shortsNumber", placement: "shortsNumber", value: "19", foilColor: "Wit", productionProfileId: "profile-source-sc-buitenboys-shortsNumber",
  });
  assert.equal(initialsLines.length, 1);
  assert.equal(initialsLines[0].quantity, 1);
  assert.equal(initialsLines[0].content, "AB");
  const state = await service.bootstrap(operator.token);
  assert.equal(state.productionProfiles.find(({ id }) => id === "profile-source-sc-buitenboys-shortsNumber").fontProfile, "Spain");
  assert.equal(shortLines[0].validation.status, "BLOCKED", "zonder exacte beheerde Spain-bron moet productie fail-closed blijven");
});

test("SC Buitenboys behoudt BLAUW Rug 34, WIT Short 34 en WIT Rug 34 als drie afzonderlijke decoraties", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const seeded = await service.bootstrap(admin.token);
  const blueShirt = seeded.articles.find(({ id }) => id === "sp-live-141598");
  if (blueShirt.foilColorOverride !== "Blauw") await service.updateArticle(admin.token, admin.csrfToken, blueShirt.id, { expectedRevision: blueShirt.revision, foilColorOverride: "Blauw" });
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: "260000106", provenance: "Gecontroleerde SC Buitenboys 34 praktijkfixture", association: "SC Buitenboys", customer: "Buitenboys 34", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [
      { articleId: "sp-live-141598", size: "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "34", backNumberSizeClass: "SENIOR" } },
      { articleId: "sp-live-140294", size: "L", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } },
      { articleId: "sp-live-140305", size: "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "34", backNumberSizeClass: "SENIOR" } },
    ],
  }, "sc-buitenboys-three-distinct-34-decorations")).value;
  assert.equal(created.productionLines.length, 3);
  assert.deepEqual(created.productionLines.map(({ quantity, decorationIdentity }) => ({ quantity, article: decorationIdentity.articleNumber, placement: decorationIdentity.placement, value: decorationIdentity.value, color: decorationIdentity.foilColor, profile: decorationIdentity.productionProfileId })).sort((left, right) => left.article.localeCompare(right.article)), [
    { quantity: 1, article: "140294", placement: "shortsNumber", value: "34", color: "Wit", profile: "profile-source-sc-buitenboys-shortsNumber" },
    { quantity: 1, article: "140305", placement: "backNumber", value: "34", color: "Wit", profile: "profile-source-sc-buitenboys-backNumber" },
    { quantity: 1, article: "141598", placement: "backNumber", value: "34", color: "Blauw", profile: "profile-source-sc-buitenboys-backNumber" },
  ]);
  assert.equal(new Set(created.productionLines.map(({ decorationIdentity }) => JSON.stringify(decorationIdentity))).size, 3);
  assert.deepEqual(created.foilStates.map(({ color }) => color).sort(), ["Blauw", "Wit"]);
});

test("production-shaped 23-stuks voorstel meet iedere fase, bewaart output en dedupet een herhaalde request", async (context) => {
  const { service, store, admin } = await fixture(context);
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "23-stuks performancepraktijk", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Representatieve bedrukking", size: "", quantity: 23, personalization: "Initialen SP", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: "practice-23-initials", type: "INITIALS", content: "SP", previewLabel: "Initialen SP", widthMm: 60, heightMm: 30, quantity: 23, sourceId: font.id, provenance: "Production-shaped 20–30 onderdelen performancefixture" }],
  }, "practice-performance-23-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "practice-performance-23-control")).value;
  const request = { orders: [{ id: controlled.id, expectedRevision: controlled.revision }], foilColor: "Wit" };
  const startedAt = performance.now();
  const first = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, request, "practice-performance-23-prepare");
  const responseMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const duplicate = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, request, "practice-performance-23-prepare");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.value.job.id, first.value.job.id);
  const state = await store.read();
  assert.equal(state.productionJobs.filter(({ id }) => id === first.value.job.id).length, 1);
  assert.equal(state.productionProposals.filter(({ id }) => id === first.value.proposal.id).length, 1);
  assert.equal(first.value.job.snapshot.layout.objectCount, 23);
  assert.equal(first.value.job.snapshot.generationMetrics.physicalPieceCount, 23);
  assert.equal(first.value.job.snapshot.generationMetrics.nestedObjectCount, 23);
  assert.ok(first.value.job.snapshot.generationMetrics.geometryMs >= 0);
  assert.ok(first.value.job.snapshot.generationMetrics.nestingMs >= 0);
  assert.ok(first.value.job.snapshot.generationMetrics.svgAndIntegrityMs >= 0);
  const original = await service.productionJobArtifact(admin.token, first.value.job.id);
  const reprint = await service.replotProductionJob(admin.token, admin.csrfToken, first.value.job.id, { reason: "Output-equivalentie performancecorrectie" }, "practice-performance-23-reprint");
  const repeated = await service.productionJobArtifact(admin.token, reprint.value.id);
  assert.equal(repeated.sha256, original.sha256);
  assert.deepEqual(reprint.value.snapshot.layout, first.value.job.snapshot.layout);
  context.diagnostic(`PRACTICE_23_RESPONSE_MS=${responseMs}; PHASES=${JSON.stringify(first.value.job.snapshot.generationMetrics)}; ARTIFACT_SHA256=${original.sha256}`);
});

test("expliciet bulk Afronden maakt alleen complete afhaalorders direct Klaar om op te halen", async (context) => {
  const { service, admin } = await fixture(context);
  const initial = await service.bootstrap(admin.token);
  const font = initial.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "CUSTOM", customer: "Afronden praktijk", customerEmail: "", customerPhone: "", standardPersonalization: empty, items: [{ product: "Vrije initialen", size: "", quantity: 1, personalization: "Initialen AF", foilColor: "Wit", deviation: true, overrides: empty }], productionLines: [{ id: "finish-initials", type: "INITIALS", content: "AF", previewLabel: "Initialen AF", widthMm: 50, heightMm: 30, quantity: 1, sourceId: font.id }] }, "practice-finish-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "practice-finish-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "practice-finish-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "practice-finish-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, job.id, "practice-finish-printed");
  const eligible = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id);
  assert.equal(eligible.productionClosure.status, "ELIGIBLE");
  const result = await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: eligible.id, expectedRevision: eligible.revision }] }, "practice-explicit-finish");
  assert.equal(result.value.completed.length, 1);
  assert.equal(result.value.completed[0].fulfillment.status, "READY_FOR_PICKUP");
  assert.equal(result.value.completed[0].eventHistory.at(-1).details.explicitHumanAction, "AFRONDEN");
});
