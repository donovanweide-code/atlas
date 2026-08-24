import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { articlePersonalizationFields } from "../src/sportpaleis/order-personalization.ts";
import { isOperationalProductionOrder } from "../src/workspace-search.ts";

const passwords = { kevin: "Final-R8-Kevin-2026!", patrick: "Final-R8-Patrick-2026!", collega: "Final-R8-Store-2026!", "donovan-support": "Final-R8-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-final-r8-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), uploadsEnabled: false, productionAssetUploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

function numberSetSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 120">${Array.from({ length: 10 }, (_, digit) => `<g id="digit-${digit}"><path d="M ${digit * 75 + 5} 5 h ${35 + digit} v 100 h -${35 + digit} z"/></g>`).join("")}</svg>`);
}

async function configureArticle140298Production(service, store, admin, operator) {
  const state = await store.read();
  const association = state.associations.find(({ name }) => name === "SC Buitenboys");
  const font = state.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const updatedAssociation = await service.updateAssociation(admin.token, admin.csrfToken, association.id, {
    expectedRevision: association.revision,
    fontProfile: font.name,
    dimensionsCm: { ...association.dimensionsCm, chestNumber: null },
  });
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "sc-buitenboys-test-nummerset.svg", mimeType: "image/svg+xml", dataBase64: numberSetSvg().toString("base64"), intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const candidates = source.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, {
    candidateIds: candidates.map(({ id }) => id),
    glyphMap: Object.fromEntries(candidates.map(({ id }, digit) => [String(digit), id])),
    name: "SC Buitenboys test-only contours",
    ownerType: "ASSOCIATION",
    ownerName: updatedAssociation.name,
    productionMethod: "SELF_PRODUCED",
    widthMm: 75,
    heightMm: 75,
    contexts: [{ type: "ASSOCIATION", id: updatedAssociation.id, label: updatedAssociation.name }],
    applications: [{ kind: "NUMBER_SET", placement: "Rug en borst" }],
    proofAuthority: "HUMAN_ACCEPTANCE",
  });
  return { source, asset };
}

test("artikel 140298 biedt Initialen eerst en uitsluitend voor dit artikel aanvullende Rug- en Borstnummercombinaties", async (context) => {
  const { service, store, admin, operator } = await fixture(context);
  const seeded = await store.read();
  const article = seeded.articles.find(({ articleNumber }) => articleNumber === "140298");
  const other = seeded.articles.find((candidate) => candidate.articleNumber !== "140298" && !articlePersonalizationFields(candidate).includes("chestNumber"));
  assert.deepEqual(articlePersonalizationFields(article), ["initials", "backNumber", "chestNumber"]);
  assert.equal(article.personalizationPolicy.mode, "combination");
  assert.ok(!articlePersonalizationFields(other).includes("chestNumber"), "andere artikelen krijgen geen borstnummer-capability");

  await configureArticle140298Production(service, store, admin, operator);
  const create = async (suffix, personalization) => (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: `140298 ${suffix}`,
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: { ...empty, ...personalization },
    items: [{ articleId: article.id, size: "M", quantity: 1, deviation: false, overrides: empty }],
  }, `article-140298-${suffix}-20260824`)).value;

  const initials = await create("initials", { initials: "AB" });
  const chest = await create("chest", { chestNumber: "7" });
  const initialsBack = await create("initials-back", { initials: "AB", backNumber: "24", backNumberSizeClass: "SENIOR" });
  const initialsChest = await create("initials-chest", { initials: "AB", chestNumber: "7" });
  const all = await create("all", { initials: "AB", backNumber: "24", chestNumber: "7", backNumberSizeClass: "SENIOR" });
  assert.deepEqual(initials.productionLines.map(({ preview }) => preview.label), ["Initialen AB"]);
  assert.deepEqual(chest.productionLines.map(({ preview }) => preview.label), ["Borstnummer 7"]);
  assert.deepEqual(initialsBack.productionLines.map(({ preview }) => preview.label), ["Initialen AB", "Rugnummer 24"]);
  assert.deepEqual(initialsChest.productionLines.map(({ preview }) => preview.label), ["Initialen AB", "Borstnummer 7"]);
  assert.deepEqual(all.productionLines.map(({ preview }) => preview.label), ["Initialen AB", "Rugnummer 24", "Borstnummer 7"]);
  assert.ok([initials, chest, initialsBack, initialsChest, all].every(({ customerPhone, productionLines }) => customerPhone === "" && productionLines.every(({ validation }) => validation.status === "VALID")));
  assert.equal(all.productionLines.find(({ preview }) => preview.label.startsWith("Rugnummer")).heightMm, 220);
  const initialsLine = all.productionLines.find(({ preview }) => preview.label.startsWith("Initialen"));
  const chestLine = all.productionLines.find(({ preview }) => preview.label.startsWith("Borstnummer"));
  assert.equal(chestLine.heightMm, initialsLine.heightMm);
  assert.equal(chestLine.source.id, initialsLine.source.id);
  assert.equal(chestLine.source.version, initialsLine.source.version);
  assert.equal(chestLine.personalizationField, "chestNumber");
  assert.equal(initialsLine.personalizationField, "initials");

  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, all.id, all.revision, "article-140298-all-control")).value;
  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "article-140298-all-proposal")).value;
  const job = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "article-140298-all-job")).value;
  assert.deepEqual(job.snapshot.productionLines.map(({ preview }) => preview.label), ["Initialen AB", "Rugnummer 24", "Borstnummer 7"]);
  assert.equal(job.snapshot.productionLines.find(({ preview }) => preview.label === "Borstnummer 7").personalizationField, "chestNumber");
  const reprint = (await service.replotProductionJob(operator.token, operator.csrfToken, job.id, { reason: "140298 combinatie exact herhalen" }, "article-140298-all-reprint")).value;
  assert.equal(reprint.snapshotHash, job.snapshotHash);
  assert.deepEqual(reprint.snapshot.layout, job.snapshot.layout);

  const otherOrder = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Ander artikel", customerEmail: "", customerPhone: "", standardPersonalization: { ...empty, chestNumber: "7" },
    items: [{ articleId: other.id, size: other.availableSizes?.[0] ?? "M", quantity: 1, deviation: false, overrides: empty }],
  }, "other-article-no-chest-20260824")).value;
  assert.ok(otherOrder.productionLines.every(({ preview }) => !preview.label.startsWith("Borstnummer")));
});

test("uit werkvoorraad halen bewaart order, audit en PlotJob en kan gecontroleerd worden hersteld", async (context) => {
  const { service, store, admin, operator } = await fixture(context);
  const font = (await store.read()).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const order = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "CUSTOM", customer: "Verouderde productieopdracht", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Archieffixture", size: "", quantity: 1, personalization: "AB", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: "archive-line", type: "INITIALS", content: "AB", sourceId: font.id, widthMm: 50, heightMm: 30, quantity: 1, provenance: "archive regressie" }],
  }, "archive-work-order-20260824")).value;
  const archived = await service.archiveProductionWork(operator.token, operator.csrfToken, order.id, { expectedRevision: order.revision, reason: "Niet meer nodig in dagelijkse productie" });
  assert.equal(archived.productionArchive.status, "ARCHIVED");
  assert.equal(isOperationalProductionOrder(archived), false);
  let persisted = await store.read();
  assert.ok(persisted.orders.some(({ id }) => id === order.id));
  assert.ok(persisted.orders.find(({ id }) => id === order.id).eventHistory.some(({ type }) => type === "PRODUCTION_WORK_ARCHIVED"));
  assert.ok(persisted.audit.some(({ subject, action }) => subject === order.id && action === "Productie uit werkvoorraad gehaald"));
  const restored = await service.restoreProductionWork(admin.token, admin.csrfToken, order.id, { expectedRevision: archived.revision });
  assert.equal(restored.productionArchive, undefined);
  assert.equal(isOperationalProductionOrder(restored), true);
  persisted = await store.read();
  assert.ok(persisted.orders.find(({ id }) => id === order.id).eventHistory.some(({ type }) => type === "PRODUCTION_WORK_RESTORED"));
});

test("production asset source-upload blijft beschikbaar terwijl generieke uploads production-breed uitstaan", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const bootstrap = await service.bootstrap(operator.token);
  assert.equal(bootstrap.capabilities.uploadsEnabled, false);
  assert.equal(bootstrap.capabilities.productionAssetUploadsEnabled, true);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "centrale-bron.svg", mimeType: "image/svg+xml", dataBase64: numberSetSvg().toString("base64"), intakeKind: "NUMBER_SET", conversionMethod: "HUMAN_VERIFIED_SVG" });
  assert.equal(source.original.immutable, true);
  assert.equal(typeof source.original.sha256, "string");
  assert.equal((await service.bootstrap(admin.token)).productionAssetSources.some(({ id }) => id === source.id), true, "centrale bron blijft na nieuwe admin-bootstrap/sessie-load aanwezig");
});
