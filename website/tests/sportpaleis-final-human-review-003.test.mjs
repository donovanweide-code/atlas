import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_ASSOCIATIONS } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { associationPersonalizationModel } from "../src/sportpaleis/order-personalization.ts";
import { CUTJOB_SVG_WRITER, PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID, availableProductionSourceIdentities, resolveProductionSource } from "../src/sportpaleis/production-sources.ts";

const passwords = { kevin: "Review-Kevin-2026!", patrick: "Review-Patrick-2026!", collega: "Review-Store-2026!", "donovan-support": "Review-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-final-review-003-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, releaseId: "SPW-FINAL-PILOT-BLOCKER-CORRECTION-005-20260812", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

test("alle 20 verenigingen behouden iedere beschikbare bronwaarde afzonderlijk", async (context) => {
  const { service, admin } = await fixture(context); const state = await service.bootstrap(admin.token);
  assert.equal(state.associations.length, 20); assert.equal(SPORTPALEIS_ASSOCIATIONS.length, 20);
  for (const source of SPORTPALEIS_ASSOCIATIONS) {
    const actual = state.associations.find(({ name }) => name === source.name); assert.ok(actual, source.name);
    assert.equal(actual.fontProfile, source.fontProfile); assert.deepEqual(actual.foilColors, source.foilColors); assert.deepEqual(actual.dimensionsCm, source.dimensionsCm);
  }
  assert.equal(state.articles.filter(({ printRelevance }) => printRelevance?.status === "CONFIRMED_VISIBLE_PERSONALIZATION").length, 183);
  const knownPrices = state.articles.flatMap((article) => Object.values(article.priceConfiguration?.personalizationUnitPricesEur ?? {}).filter((value) => typeof value === "number"));
  assert.ok(knownPrices.length >= 27); assert.ok(state.articles.every((article) => article.priceConfiguration));
  assert.ok(state.employees.some(({ name, salesNumber, active }) => name === "Donovan" && salesNumber === "45" && active));
});

test("Pioneers 2 loopt van normale order tot byte-identiek SVG-productieartefact", async (context) => {
  const { service, admin, storeUser } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Human Review Pioneers", customerEmail: "review@example.nl", customerPhone: "0612345678", salesNumber: "45",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, "review-pioneers-order")).value;
  assert.equal(created.salesAttribution.label, "Donovan"); assert.equal(created.productionLines.length, 1);
  assert.equal(created.productionLines[0].source.kind, "PRODUCTION_ELEMENT");
  assert.equal(created.productionLines[0].source.id, "production-asset-verified-pioneers-rug-senior-200");
  assert.equal(created.productionLines[0].proofStatus, "GEOMETRY_VALIDATED"); assert.equal(created.productionLines[0].heightMm, 200);
  const acknowledged = await service.recordCommunicationStatus(admin.token, admin.csrfToken, created.id, { channel: "receipt", status: "SENT", providerReference: "human-review-local" }, created.revision);
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, acknowledged.revision, "review-pioneers-control")).value;
  const readyState = await service.bootstrap(admin.token); const readyOrder = readyState.orders.find(({ id }) => id === controlled.id);
  assert.equal(readyOrder.productionStatus, "READY"); assert.equal(readyOrder.productionStatusReason, null);
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "review-pioneers-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, orders: proposal.orders }, "review-pioneers-job")).value;
  assert.equal(job.snapshot.artifact.format, "SVG"); assert.equal(job.snapshot.orientation.preMirrored, true); assert.equal(job.snapshot.hardwareSendPerformedByWorkspace, false);
  assert.deepEqual(job.snapshot.outputWriter, { id: "cutjob-svg", version: "2", format: "SVG", proofStatus: "GEOMETRY_VALIDATED", physicalRouteStatus: "HUMAN_VALIDATION_REQUIRED" });
  assert.equal(job.snapshot.layout.objectCount, 1); assert.ok(job.snapshot.layout.closedContourCount >= 1); assert.ok(job.snapshot.artifact.productionDataHash);
  const first = await service.productionJobArtifact(admin.token, job.id); const second = await service.productionJobArtifact(admin.token, job.id);
  assert.equal(first.sha256, job.snapshot.artifact.sha256); assert.deepEqual(first.bytes, second.bytes); assert.match(first.bytes.toString("utf8"), /data-production-data-sha256=/u);
  const replot = (await service.replotProductionJob(admin.token, admin.csrfToken, job.id, { reason: "Gerichte immutable herdruktest" }, "review-pioneers-replot")).value;
  assert.equal(replot.originJobId, job.id); assert.equal(replot.snapshotHash, job.snapshotHash); assert.deepEqual(replot.snapshot, job.snapshot);
  const printingState = await service.bootstrap(admin.token); assert.equal(printingState.orders.find(({ id }) => id === created.id).productionStatus, "IN_PRODUCTION");
});

test("normale Bedrukken-invoer volgt de werkelijk ingerichte artikelregels", async () => {
  const pioneers = associationPersonalizationModel(SPORTPALEIS_LIVE_PILOT_ARTICLES, "Almerer Pioneers");
  assert.equal(pioneers.articles.length, 4);
  assert.deepEqual(pioneers.fields, ["backNumber", "shortsNumber", "name"]);
  assert.ok(pioneers.articles.every((article) => pioneers.fields.some((field) => article.personalizationPolicy.fields[field])));
  const withoutArticles = associationPersonalizationModel(SPORTPALEIS_LIVE_PILOT_ARTICLES, "Almere'81");
  assert.deepEqual(withoutArticles, { articles: [], fields: [] });
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceSource, /associationPersonalizationModel\(state\.articles, activeAssociation\)/u);
  assert.match(workspaceSource, /data-standard-field="\$\{field\}"/u);
});

test("versioned productiebron en outputwriter zijn generiek geregistreerd en onbekende waarden falen gesloten", async () => {
  const sources = availableProductionSourceIdentities();
  assert.equal(sources.length, 3);
  assert.ok(sources.every(({ sourceSetId, outputWriterId, outputWriterVersion }) => sourceSetId === PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID && outputWriterId === "cutjob-svg" && outputWriterVersion === "2"));
  assert.ok(resolveProductionSource({ sourceSetId: PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID, outputWriterId: "cutjob-svg", lineType: "NUMBER", content: "2", physicalHeightMm: 200 }));
  assert.equal(resolveProductionSource({ sourceSetId: PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID, outputWriterId: "cutjob-svg", lineType: "NUMBER", content: "5", physicalHeightMm: 200 }), null);
  const serviceSource = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(serviceSource, /buildPioneersSvgArtifact|PIONEERS_REFERENCE_WIDTH_MM/u);
  assert.match(serviceSource, /buildVersionedProductionArtifact/u);
});

test("tussenvoegsel blijft een apart handmatig initialenelement met overname en lege override", async (context) => {
  const { service, admin, storeUser } = await fixture(context);
  const state = await service.bootstrap(storeUser.token);
  const article = state.articles.find(({ active, supports }) => active && supports.includes("initials") && !supports.includes("name") && !supports.includes("backNumber") && !supports.includes("shortsNumber"));
  assert.ok(article, "een actief initialenartikel is vereist voor deze acceptatietest");
  const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
  assert.ok(profile?.initialsInfixRule);
  assert.deepEqual(profile.initialsInfixRule, { active: true, heightMm: 20, horizontalSpacingMm: null, baselineOffsetMm: null, alignment: "CENTER", status: "DATA_GAP", revision: 1 });

  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Initialencontrole", customerEmail: "initialen@example.nl", customerPhone: "0612345678", salesNumber: "45",
    standardPersonalization: { ...empty, initials: "JM", initialsInfix: "vd" },
    items: [{ articleId: article.id, variants: [
      { id: "inherit", size: "M", quantity: 1, deviation: false, overrides: empty },
      { id: "empty-infix", size: "L", quantity: 1, deviation: true, overrides: { ...empty, initials: "PK", initialsInfix: "" } },
      { id: "other-infix", size: "XL", quantity: 1, deviation: true, overrides: { ...empty, initials: "AB", initialsInfix: "de" } },
    ] }],
  }, "review-initials-infix-order")).value;

  assert.equal(created.standardPersonalization.initials, "JM");
  assert.equal(created.standardPersonalization.initialsInfix, "vd");
  assert.deepEqual(created.items[0].variants.map(({ personalizationValues }) => [personalizationValues.initials, personalizationValues.initialsInfix]), [["JM", "vd"], ["PK", ""], ["AB", "de"]]);
  assert.match(created.items[0].variants[0].personalization, /Initialen JM/u);
  assert.match(created.items[0].variants[0].personalization, /Tussenvoegsel vd/u);
  assert.doesNotMatch(created.items[0].variants[1].personalization, /Tussenvoegsel/u);
  assert.match(created.items[0].variants[2].personalization, /Tussenvoegsel de/u);

  const infixLines = created.productionLines.filter(({ placementRole }) => placementRole === "INITIALS_INFIX");
  assert.deepEqual(infixLines.map(({ content }) => content).sort(), ["de", "vd"]);
  assert.ok(infixLines.every(({ type, widthMm, heightMm, validation, placementRule }) => type === "TEXT" && widthMm === 0 && heightMm === 0 && validation.status === "BLOCKED" && placementRule.alignment === "CENTER" && placementRule.horizontalSpacingMm === null && placementRule.baselineOffsetMm === null));
  const composites = new Map(); for (const line of created.productionLines.filter(({ placementRule }) => placementRule?.compositionId)) composites.set(line.placementRule.compositionId, [...(composites.get(line.placementRule.compositionId) ?? []), line]);
  assert.deepEqual([...composites.values()].map((lines) => lines[0].placementRule.compositeText).sort(), ["AdeB", "JvdM"]);
  assert.ok([...composites.values()].every((lines) => lines.length === 3 && lines.map(({ placementRole }) => placementRole).join(",") === "INITIALS_FIRST,INITIALS_INFIX,INITIALS_LAST"));
  assert.ok(created.productionLines.some(({ type, content, placementRole }) => type === "INITIALS" && content === "J" && placementRole === "INITIALS_FIRST"));
  assert.ok(created.productionLines.some(({ type, content, placementRole }) => type === "INITIALS" && content === "M" && placementRole === "INITIALS_LAST"));
  assert.ok(created.productionLines.some(({ type, content }) => type === "INITIALS" && content === "PK"));

  await service.recordCommunicationStatus(admin.token, admin.csrfToken, created.id, { channel: "receipt", status: "SENT", providerReference: "human-review-local" }, created.revision);
  const current = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id);
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, current.revision, "review-infix-to-control")).value;
  await assert.rejects(service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "review-infix-fail-closed"), (error) => error.code === "ORDER_NOT_READY");
});

test("teamorder bewaart tussenvoegsel afzonderlijk en blokkeert onbekende fysieke opmaak", async (context) => {
  const { service, admin } = await fixture(context); const state = await service.bootstrap(admin.token);
  const profile = state.productionProfiles.find(({ supports }) => supports?.includes("initials")); assert.ok(profile);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "TEAM", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    productionLines: [
      { id: "team-initials-first", type: "INITIALS", placementRole: "INITIALS_FIRST", placementRule: { compositionId: "team-composite", compositeText: "JvdM", segmentIndex: 0, segmentCount: 3, alignment: "CENTER" }, content: "J", sourceId: profile.id, widthMm: 0, heightMm: 0, quantity: 1, previewLabel: "Samengestelde initialen JvdM", provenance: "Gerichte lokale Human Review" },
      { id: "team-infix", type: "TEXT", placementRole: "INITIALS_INFIX", placementRule: { compositionId: "team-composite", compositeText: "JvdM", segmentIndex: 1, segmentCount: 3, alignment: "CENTER" }, content: "vd", sourceId: profile.id, widthMm: 0, heightMm: 0, quantity: 1, previewLabel: "Samengestelde initialen JvdM", provenance: "Gerichte lokale Human Review" },
      { id: "team-initials-last", type: "INITIALS", placementRole: "INITIALS_LAST", placementRule: { compositionId: "team-composite", compositeText: "JvdM", segmentIndex: 2, segmentCount: 3, alignment: "CENTER" }, content: "M", sourceId: profile.id, widthMm: 0, heightMm: 0, quantity: 1, previewLabel: "Samengestelde initialen JvdM", provenance: "Gerichte lokale Human Review" },
      { id: "team-initials-no-infix", type: "INITIALS", content: "PK", sourceId: profile.id, widthMm: 60, heightMm: 30, quantity: 1, previewLabel: "Initialen PK", provenance: "Gerichte lokale Human Review" },
    ],
    items: [{ product: "Teamproductie", association: "Almerer Pioneers", productionProfileId: profile.id, size: "", quantity: 3, personalization: "Initialen JM + tussenvoegsel vd; initialen PK zonder tussenvoegsel", deviation: true, overrides: empty }],
  }, "review-team-initials-infix")).value;
  const infix = created.productionLines.find(({ placementRole }) => placementRole === "INITIALS_INFIX");
  assert.equal(infix.content, "vd"); assert.equal(infix.validation.status, "BLOCKED"); assert.equal(infix.widthMm, 0); assert.equal(infix.heightMm, 0);
  assert.equal(created.productionLines.filter(({ type }) => type === "INITIALS").length, 3);
  assert.equal(created.productionLines.filter(({ placementRule }) => placementRule?.compositionId === "team-composite").length, 3);
});

test("legacy-order zonder initialsInfix blijft werken", async (context) => {
  const { service, storeUser } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Legacy initialen", customerEmail: "legacy@example.nl", customerPhone: "0612345678",
    standardPersonalization: { initials: "JM", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
    items: [{ articleId: "sp-live-140226", size: "M", quantity: 1, deviation: false, overrides: {} }],
  }, "review-legacy-initials")).value;
  assert.equal(created.standardPersonalization.initials, "JM"); assert.equal(created.standardPersonalization.initialsInfix, "");
  assert.equal(created.productionLines.some(({ placementRole }) => placementRole === "INITIALS_INFIX"), false);
});

test("teamorder accepteert lege contactgegevens en kledingmaat zonder die waarden te verzinnen", async (context) => {
  const { service, admin } = await fixture(context); const state = await service.bootstrap(admin.token);
  const profile = state.productionProfiles.find(({ id }) => id !== "profile-none"); assert.ok(profile);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "TEAM", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    productionLines: [{ id: "team-line-1", type: "NUMBER", content: "2", sourceId: profile.id, widthMm: 99.06, heightMm: 200, quantity: 1, previewLabel: "Rugnummer 2", provenance: "Gerichte lokale Human Review" }],
    items: [{ product: "Teamproductie", association: "Almerer Pioneers", productionProfileId: profile.id, size: "", quantity: 1, personalization: "Rugnummer 2", deviation: true, overrides: empty }],
  }, "review-team-optional-contact")).value;
  assert.equal(created.customer, "Teamorder · Almerer Pioneers"); assert.equal(created.customerEmail, ""); assert.equal(created.customerPhone, ""); assert.equal(created.items[0].size, "");
});
