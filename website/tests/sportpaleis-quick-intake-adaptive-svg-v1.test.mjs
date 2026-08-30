import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createCutJobBatch, minimumContourSetDistanceMm } from "../src/sportpaleis/direct-print/index.ts";
import { normalizeSwitchEvidence } from "../src/sportpaleis/deployment-switch-evidence.mjs";
import { inspectQuickProductionSource } from "../src/sportpaleis/quick-production-intake.mjs";
import { NUMBER_GLYPH_SPACING_MM, productionAssetPiece, productionAssetPieces } from "../src/sportpaleis/production-assets.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Quick-Kevin-2026!", patrick: "Quick-Patrick-2026!", collega: "Quick-Store-2026!", "donovan-support": "Quick-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-quick-adaptive-svg-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

const sourceInput = (text, filename = "praktijkorder.txt", mimeType = "text/plain") => ({ filename, mimeType, dataBase64: Buffer.from(text).toString("base64") });

function textPdf(lines) {
  const drawing = `BT /F1 12 Tf 72 720 Td ${lines.map((line, index) => `${index ? "0 -20 Td " : ""}(${line}) Tj`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(drawing)} >>\nstream\n${drawing}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let source = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(source); source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

test("Quick Production Intake extraheert alleen exact gelabelde documentfeiten en gokt ontbrekende foliekleur niet", async () => {
  const inspected = await inspectQuickProductionSource(sourceInput([
    "Bestelnummer: EXT-2026-0818", "Artikelnummer: 116386", "Artikelomschrijving: Wedstrijdshirt", "Maat: L", "Aantal: 2", "Artikelkleur: zwart", "Initialen: MvdB", "Naam (Rug): Mees", "Rugnummer: 2",
  ].join("\n")));
  assert.equal(inspected.extraction.fields.externalReference.status, "RELIABLE");
  assert.equal(inspected.extraction.fields.articleNumber.value, "116386");
  assert.equal(inspected.extraction.fields.initials.value, "MvdB");
  assert.equal(inspected.extraction.fields.foilColor.status, "MISSING");
  assert.equal(inspected.extraction.confidencePolicy, "NO_SILENT_GUESSING");
  assert.equal(inspected.extraction.status, "HUMAN_CHECK_REQUIRED");
});

test("foto gebruikt dezelfde centrale intake maar blijft zonder brede OCR volledig Human Check", async () => {
  const inspected = await inspectQuickProductionSource({ filename: "papier.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64") });
  assert.equal(inspected.source.sourceKind, "PHOTO");
  assert.equal(inspected.extraction.engine, "NO_OCR_HUMAN_CHECK_V1");
  assert.ok(Object.values(inspected.extraction.fields).every(({ status }) => status === "MISSING"));
  assert.match(inspected.extraction.uncertainties[0], /OCR/u);
});

test("bestaande PDF-parserdependency levert documenttekst aan dezelfde Quick Production Intake", async () => {
  const bytes = textPdf(["Bestelnummer: PDF-2026-18", "Artikelnummer: 116386", "Aantal: 1"]);
  const inspected = await inspectQuickProductionSource({ filename: "order.pdf", mimeType: "application/pdf", dataBase64: bytes.toString("base64") });
  assert.equal(inspected.source.sourceKind, "PDF");
  assert.equal(inspected.extraction.engine, "EMBEDDED_TEXT_EXACT_LABELS_V1");
  assert.equal(inspected.extraction.fields.externalReference.value, "PDF-2026-18");
  assert.equal(inspected.extraction.fields.articleNumber.value, "116386");
});

test("intake bewaart originele bron centraal, dedupliceert en maakt pas na expliciet akkoord één canonieke order", async (context) => {
  const { service, store, operator } = await fixture(context); const orderCountBefore = (await store.read()).orders.length;
  const input = sourceInput("Bestelnummer: EXT-QPI-001\nArtikelnummer: 116386\nMaat: L\nAantal: 1\nRugnummer: 2");
  const first = await service.createQuickProductionIntake(operator.token, operator.csrfToken, input, "quick-intake-source-001");
  const second = await service.createQuickProductionIntake(operator.token, operator.csrfToken, input, "quick-intake-source-002");
  assert.equal(first.value.source.dataBase64, undefined);
  assert.equal(second.value.id, first.value.id);
  assert.equal((await store.read()).quickProductionIntakes.length, 1);
  assert.equal((await store.read()).quickProductionIntakes[0].source.dataBase64, input.dataBase64);
  await assert.rejects(service.acceptQuickProductionIntake(operator.token, operator.csrfToken, first.value.id, { explicitAgreement: false }), (error) => error.code === "QUICK_INTAKE_AGREEMENT_REQUIRED");
  const accepted = await service.acceptQuickProductionIntake(operator.token, operator.csrfToken, first.value.id, { explicitAgreement: true, customer: "Praktijk Mees", customerEmail: "", customerPhone: "0612345678", backNumberSizeClass: "SENIOR", fields: { foilColor: "Wit" } });
  assert.equal(accepted.value.intake.status, "ACCEPTED");
  assert.equal(accepted.value.order.orderKind, "INDIVIDUAL");
  assert.equal(accepted.value.order.sourceContext.externalReference, "EXT-QPI-001");
  assert.equal(accepted.value.order.sourceContext.quickIntake.sha256, first.value.source.sha256);
  assert.equal(accepted.value.order.productionLines[0].validation.status, "VALID");
  assert.equal(accepted.value.order.productionLines[0].heightMm, 200);
  assert.equal((await service.acceptQuickProductionIntake(operator.token, operator.csrfToken, first.value.id, { explicitAgreement: true })).duplicate, true);
  assert.equal((await store.read()).orders.length, orderCountBefore + 1);
});

test("Quick Intake gokt een ontbrekend aantal nooit als één", async (context) => {
  const { service, operator } = await fixture(context);
  const created = await service.createQuickProductionIntake(operator.token, operator.csrfToken, sourceInput("Bestelnummer: EXT-QPI-NO-QTY\nArtikelnummer: 116386\nMaat: L\nRugnummer: 2"), "quick-intake-no-quantity");
  await assert.rejects(
    service.acceptQuickProductionIntake(operator.token, operator.csrfToken, created.value.id, { explicitAgreement: true, customer: "Controle aantal", backNumberSizeClass: "SENIOR", fields: {} }),
    (error) => error.code === "QUICK_INTAKE_QUANTITY_REQUIRED",
  );
});

function vectorSvg() {
  const groups = Array.from({ length: 10 }, (_, digit) => `<g id="digit-${digit}"><path d="M ${20 + digit * 60} 20 h ${10 + digit} v 40 h -${10 + digit} z"/></g>`).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 100">${groups}</svg>`);
}

test("gekoppelde SVG-clubnummerset wordt automatisch in normale orders gebruikt met 200/75 mm en 30 mm multi-digit spacing", async (context) => {
  const { root, service, store, admin, operator } = await fixture(context);
  const persisted = await store.read(); const association = persisted.associations.find(({ name }) => name === "Buitenhout MHC");
  await store.mutate(async (state) => {
    const template = state.articles.find(({ id }) => id === "sp-live-137294");
    state.articles.push({ ...structuredClone(template), id: "fixture-hockey-back", articleNumber: "HOC-BACK", association: association.name, profileId: "profile-source-buitenhout-mhc-backNumber", supports: ["backNumber"], personalizationPolicy: { mode: "optional", fields: { backNumber: "optional" } } });
    state.articles.push({ ...structuredClone(template), id: "fixture-hockey-short", articleNumber: "HOC-SHORT", association: association.name, profileId: "profile-source-buitenhout-mhc-shortsNumber", supports: ["shortsNumber"], personalizationPolicy: { mode: "optional", fields: { shortsNumber: "optional" } } });
    return { state, value: null };
  });
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "buitenhout-clubnummers.svg", mimeType: "image/svg+xml", dataBase64: vectorSvg().toString("base64"), intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidates = source.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(candidates.length, 10);
  const promotion = { candidateIds: candidates.map(({ id }) => id), glyphMap: Object.fromEntries(candidates.map(({ id }, digit) => [String(digit), id])), name: "Buitenhout echte SVG-contourset", ownerType: "ASSOCIATION", ownerName: association.name, productionMethod: "SELF_PRODUCED", widthMm: 75, heightMm: 75, contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }], applications: [{ kind: "NUMBER_SET", placement: "Rug en short/rok" }], proofAuthority: "HUMAN_ACCEPTANCE" };
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { ...promotion, productionProfileId: "profile-source-buitenhout-mhc-backNumber" });
  const reusedForShort = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { ...promotion, productionProfileId: "profile-source-buitenhout-mhc-shortsNumber" });
  assert.equal(reusedForShort.id, asset.id, "één immutable glyphmaster mag expliciet aan meerdere toepasselijke profielen worden gekoppeld");
  const storedAfterPromotion = await store.read();
  const storedAsset = storedAfterPromotion.productionElements.find(({ id }) => id === asset.id);
  const storedSource = storedAfterPromotion.productionAssetSources.find(({ id }) => id === source.id);
  assert.equal(asset.numberComposition.freeContourSpacingMm, NUMBER_GLYPH_SPACING_MM);
  for (const [digit, candidate] of candidates.entries()) {
    const storedCandidate = storedSource.candidates.find(({ id }) => id === candidate.id);
    assert.equal(storedAsset.numberGlyphs[String(digit)].candidateId, candidate.id);
    assert.equal(storedAsset.numberGlyphs[String(digit)].geometryHash, storedCandidate.geometryHash);
    assert.ok(storedAsset.numberGlyphs[String(digit)].contours.length > 0, `cijfer ${digit} bewaart de gesloten SVG-contouren en eventuele holes`);
    assert.ok(storedAsset.numberGlyphs[String(digit)].contours.every(({ closed, points }) => closed && points.length >= 4));
  }
  for (const number of ["10", "11", "18", "23", "28", "38", "83", "88", "99"]) {
    const preview = await service.productionAssetNumberPreview(operator.token, asset.id, number);
    assert.equal((preview.bytes.toString("utf8").match(/M /gu) ?? []).length, 2);
  }
  const practiceEightPiece = productionAssetPiece({ asset: storedAsset, variant: { heightMm: 200 }, line: { id: "practice-svg-8", content: "8", widthMm: 0, heightMm: 200, preview: { label: "Rugnummer 8" } }, order: { id: "PRACTICE-8", association: association.name, items: [] }, foilColor: "Wit" });
  const practiceEightJob = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: "PRACTICE-8", revision: 1, attemptIdPrefix: "practice-svg-8", createdAt: "2026-08-24T00:00:00.000Z", pieces: [practiceEightPiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  const practiceEightGroup = practiceEightJob.productionGeometry.groups[0];
  assert.equal(practiceEightGroup.nestingRotationApplied, 90);
  assert.ok(practiceEightJob.nesting.usedLengthMm < practiceEightJob.nesting.baselineUsedLengthMm);
  assert.equal(practiceEightGroup.provenance.vectorProfile, `${storedAsset.id}@${storedAsset.version}#${storedAsset.sourceSelection.geometryHash}`);
  assert.deepEqual([practiceEightGroup.sourceBoundsMm.width, practiceEightGroup.sourceBoundsMm.height].sort((a, b) => a - b), [practiceEightGroup.boundsMm.width, practiceEightGroup.boundsMm.height].sort((a, b) => a - b));
  context.diagnostic(`practice-svg-8: before=${practiceEightJob.nesting.baselineUsedLengthMm}mm; after=${practiceEightJob.nesting.usedLengthMm}mm; saved=${practiceEightJob.nesting.savedLengthVsBaselineMm}mm; saving=${Number(((practiceEightJob.nesting.savedLengthVsBaselineMm / practiceEightJob.nesting.baselineUsedLengthMm) * 100).toFixed(2))}%; rotation=${practiceEightGroup.nestingRotationApplied}°`);
  const cannotRotatePiece = productionAssetPiece({ asset: storedAsset, variant: { heightMm: 460 }, line: { id: "practice-svg-8-too-wide-rotated", content: "8", widthMm: 0, heightMm: 460, preview: { label: "Rugnummer 8" } }, order: { id: "PRACTICE-8-NO-ROTATE", association: association.name, items: [] }, foilColor: "Wit" });
  const cannotRotateJob = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: "PRACTICE-8-NO-ROTATE", revision: 1, attemptIdPrefix: "practice-svg-8-no-rotate", createdAt: "2026-08-24T00:00:00.000Z", pieces: [cannotRotatePiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  assert.equal(cannotRotateJob.productionGeometry.groups[0].nestingRotationApplied, 0, "90° wordt niet gekozen wanneer de geroteerde vorm de absolute baanbreedte overschrijdt");
  for (const number of ["18", "23", "28", "38", "83", "88", "99"]) {
    const line = { id: `practice-svg-${number}`, content: number, widthMm: 0, heightMm: 200, preview: { label: `Rugnummer ${number}` }, source: { variantId: asset.variants[0].id } };
    const numberOrder = { id: `PRACTICE-${number}`, association: association.name, items: [] };
    const composedPiece = productionAssetPiece({ asset: storedAsset, variant: { heightMm: 200 }, line, order: numberOrder, foilColor: "Wit" });
    const digitPieces = productionAssetPieces({ asset: storedAsset, variant: { heightMm: 200 }, line, order: numberOrder, foilColor: "Wit" });
    const before = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: numberOrder.id, revision: 1, attemptIdPrefix: `before-${number}`, createdAt: "2026-08-24T00:00:00.000Z", pieces: [composedPiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
    const after = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: numberOrder.id, revision: 1, attemptIdPrefix: `after-${number}`, createdAt: "2026-08-24T00:00:00.000Z", pieces: digitPieces, nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
    assert.equal(digitPieces.length, 2);
    assert.ok(after.nesting.usedLengthMm < before.nesting.usedLengthMm, `${number}: fysiek gesplitste digits moeten minder baanlengte gebruiken`);
    assert.deepEqual(after.productionGeometry.groups.map(({ provenance }) => provenance.semanticGroup.value), [number, number]);
    assert.deepEqual(after.productionGeometry.groups.map(({ provenance }) => provenance.semanticGroup.digit).sort(), Array.from(number).sort());
    assert.deepEqual(after.productionGeometry.groups.map(({ provenance }) => provenance.semanticGroup.digitIndex).sort(), [0, 1]);
    assert.ok(after.productionGeometry.groups.every(({ provenance, mirrorApplied, sourceBoundsMm, boundsMm }) => {
      const sourceSides = [sourceBoundsMm.width, sourceBoundsMm.height].sort((left, right) => left - right);
      const placedSides = [boundsMm.width, boundsMm.height].sort((left, right) => left - right);
      return provenance.semanticGroup.garmentCompositionSpacingMm === NUMBER_GLYPH_SPACING_MM
        && provenance.assetIdentity.assetId === asset.id
        && provenance.assetIdentity.assetVersion === asset.version
        && provenance.vectorProfile === `${asset.id}@${asset.version}#${provenance.assetIdentity.geometryHash}`
        && mirrorApplied === true
        && sourceSides.every((side, index) => Math.abs(side - placedSides[index]) < 0.001);
    }));
    assert.ok(minimumContourSetDistanceMm(after.productionGeometry.groups[0].contours, after.productionGeometry.groups[1].contours) >= 6.4 - 0.000001);
    const saving = before.nesting.usedLengthMm - after.nesting.usedLengthMm;
    context.diagnostic(`multi-digit-${number}: before=${before.nesting.usedLengthMm}mm; after=${after.nesting.usedLengthMm}mm; saved=${saving}mm; saving=${Number((saving / before.nesting.usedLengthMm * 100).toFixed(2))}%`);
  }
  const back = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "INDIVIDUAL", customer: "Hockey rug", customerEmail: "", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "18", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "fixture-hockey-back", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "hockey-auto-back-18")).value;
  const shorts = (await service.createOrder(operator.token, operator.csrfToken, { orderKind: "INDIVIDUAL", customer: "Hockey short", customerEmail: "", customerPhone: "0612345678", standardPersonalization: { ...empty, shortsNumber: "23" }, items: [{ articleId: "fixture-hockey-short", size: "M", quantity: 1, deviation: false, overrides: empty }] }, "hockey-auto-short-23")).value;
  assert.equal(back.productionLines[0].source.id, asset.id); assert.equal(back.productionLines[0].heightMm, 200);
  assert.equal(shorts.productionLines[0].source.id, asset.id); assert.equal(shorts.productionLines[0].heightMm, 75);
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, back.id, back.revision, "hockey-back-control")).value;
  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "hockey-back-proposal")).value;
  const job = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, orders: proposal.orders }, "hockey-back-job")).value;
  assert.ok(job.snapshot.productionLines.some(({ source }) => source.id === asset.id && source.version === asset.version));
  assert.equal(job.snapshot.logoSources.find(({ id }) => id === asset.id).version, asset.version);
  assert.equal(job.snapshot.logoSources.find(({ id }) => id === asset.id).sourceId, source.id);
  assert.ok(job.snapshot.layout.productionGeometry?.groups.length > 0);
  assert.equal(job.snapshot.layout.objectCount, 1, "semantisch rugnummer 18 blijft één herkenbare fysieke set");
  assert.equal(job.snapshot.productionLines[0].content, "18", "de semantische orderbetekenis blijft ongewijzigd");
  assert.deepEqual(job.snapshot.layout.placements.map(({ semanticGroup }) => semanticGroup.value), ["18"]);
  assert.deepEqual(job.snapshot.layout.placements[0].physicalMembers.map(({ digit }) => digit), ["1", "8"]);
  assert.ok(job.snapshot.layout.placements.every(({ semanticGroup, physicalMembers }) => semanticGroup.garmentCompositionSpacingMm === 30 && semanticGroup.productionProfileId === "profile-source-buitenhout-mhc-backNumber" && physicalMembers.every(({ assetIdentity }) => assetIdentity.assetId === asset.id && assetIdentity.assetVersion === asset.version)));
  assert.ok(job.snapshot.layout.placements.every(({ rotationApplied, mirrorApplied, vectorProfile }) => [0, 90, 180, 270].includes(rotationApplied) && mirrorApplied === true && vectorProfile?.includes(`@${asset.version}#`)));
  assert.equal(typeof job.snapshot.artifact.sha256, "string");
  assert.equal(typeof job.snapshot.artifact.productionDataHash, "string");
  const artifactSvg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.equal((artifactSvg.match(/data-contour-id=/gu) ?? []).length, job.snapshot.layout.productionGeometry.contours.length, "preview/PlotJob/output delen exact dezelfde contourlayout");
  assert.ok(artifactSvg.includes(`data-production-data-sha256="${job.snapshot.artifact.productionDataHash}"`));
  const replot = (await service.replotProductionJob(operator.token, operator.csrfToken, job.id, { reason: "Immutable SVG-versieregressie" }, "hockey-back-replot")).value;
  assert.equal(replot.snapshotHash, job.snapshotHash); assert.deepEqual(replot.snapshot, job.snapshot);
});

function rectangle(id, width, height, printType) { const points = printType === "rugnummer" ? [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: 45 }, { x: 45, y: 45 }, { x: 45, y: height }, { x: 0, y: height }, { x: 0, y: 0 }] : [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }, { x: 0, y: 0 }]; return { id, label: id, sourceOrderId: `ORDER-${id}`, product: "Fixture", printType, association: "Fixtureclub", requestedPhysicalSizeMm: { widthMm: width, heightMm: height }, vectorProfile: "SVG@1", material: { code: "HTV-WIT", foilColor: "Wit" }, contours: [{ id: `c-${id}`, closed: true, points }], productionRule: { mirror: true, rotation: 0, allowedNestingRotations: [0, 90] } }; }
function efficiency(pieces) { return createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: "EFFICIENCY", revision: 1, attemptIdPrefix: "adaptive-v1", createdAt: "2026-08-24T00:00:00.000Z", pieces, nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).batches[0]; }

test("adaptive nesting bewijst kleine, grote en gemengde fixturewinst zonder productie-invariant te breken", (context) => {
  const fixtures = {
    small: [rectangle("back-18", 330, 200, "rugnummer"), rectangle("short-18", 105, 75, "shortnummer"), rectangle("initials", 40, 30, "initialen")],
    large: Array.from({ length: 12 }, (_, index) => rectangle(`personal-${index}`, index % 3 === 0 ? 215 : index % 3 === 1 ? 105 : 40, index % 3 === 0 ? 200 : index % 3 === 1 ? 75 : 30, index % 3 === 0 ? "rugnummer" : index % 3 === 1 ? "shortnummer" : "initialen")),
    mixed: [rectangle("mix-back-a", 210, 200, "rugnummer"), rectangle("mix-back-b", 190, 200, "rugnummer"), ...Array.from({ length: 4 }, (_, index) => rectangle(`mix-small-${index}`, 45 + index * 10, 30 + index * 8, index % 2 ? "shortnummer" : "initialen"))],
  };
  for (const [name, pieces] of Object.entries(fixtures)) {
    const batch = efficiency(pieces); const before = batch.jobs.reduce((sum, job) => sum + job.nesting.baselineUsedLengthMm, 0); const after = batch.efficiency.usedFoilLengthMm;
    assert.ok(after < before, `${name}: ${before} -> ${after}`); assert.equal(batch.objectIds.length, pieces.length); assert.ok(batch.jobs.every(({ nesting }) => nesting.scaleApplied === 1));
    assert.equal(batch.strategy.classification, pieces.length >= 8 ? "LARGE" : "SMALL");
    const rotations = batch.jobs.flatMap(({ productionGeometry }) => productionGeometry.groups.map(({ nestingRotationApplied }) => nestingRotationApplied)).filter(Boolean);
    context.diagnostic(`${name}: elements=${pieces.length}; before=${before}mm; after=${after}mm; saved=${Number((before - after).toFixed(3))}mm; saving=${Number((((before - after) / before) * 100).toFixed(2))}%; rotations=${rotations.join(",")}; strategy=${batch.strategy.objective}`);
    for (const job of batch.jobs) for (let left = 0; left < job.productionGeometry.groups.length; left += 1) for (let right = left + 1; right < job.productionGeometry.groups.length; right += 1) assert.ok(minimumContourSetDistanceMm(job.productionGeometry.groups[left].contours, job.productionGeometry.groups[right].contours) >= 6.4 - 0.000001);
  }
});

test("deployment evidence normaliseert beide successmarkers maar bewaart exitcode, failure en rollbackbewijs fail-closed", () => {
  for (const marker of ["SWITCH=PASS", "LIVE_SWITCH=PASS"]) assert.equal(normalizeSwitchEvidence({ remoteExitCode: 0, output: `${marker}\nACTIVE_RELEASE=SPW-CANDIDATE`, expectedRelease: "SPW-CANDIDATE" }).pass, true);
  assert.equal(normalizeSwitchEvidence({ remoteExitCode: 17, output: "SWITCH=PASS\nACTIVE_RELEASE=SPW-CANDIDATE", expectedRelease: "SPW-CANDIDATE" }).pass, false);
  assert.equal(normalizeSwitchEvidence({ remoteExitCode: 0, output: "SWITCH=FAIL\nACTIVE_RELEASE=SPW-CANDIDATE", expectedRelease: "SPW-CANDIDATE" }).pass, false);
  const rolledBack = normalizeSwitchEvidence({ remoteExitCode: 23, output: "SWITCH=FAIL\nROLLBACK_RESULT=PASS\nACTIVE_RELEASE=SPW-BASELINE", expectedRelease: "SPW-CANDIDATE" });
  assert.equal(rolledBack.pass, false); assert.equal(rolledBack.remoteExitCode, 23); assert.equal(rolledBack.rollbackResult, "PASS");
});
