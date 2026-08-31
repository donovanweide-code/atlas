import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const password = "Efficiency-Admin-2026!";
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-efficiency-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: password, patrick: "Efficiency-Operator-2026!", collega: "Efficiency-Store-2026!", "donovan-support": "Efficiency-Support-2026!" } });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PRODUCTION-EFFICIENCY-TEST" });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password }) };
}

async function readyOrder(service, admin) {
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  assert.ok(font);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Geometrische restcapaciteit", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Interne productiefixture", size: "", quantity: 1, personalization: "Nummer 1", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: "base-number-1", type: "NUMBER", content: "1", previewLabel: "Nummer 1", widthMm: 100, heightMm: 200, quantity: 1, sourceId: font.id, foilColor: "Wit", provenance: "Geometrische restcapaciteit fixture" }],
  }, "efficiency-base-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "efficiency-base-control")).value;
  return { order: controlled, font };
}

test("efficiënte route voegt alleen geometrisch passende interne folie-opvulling toe", async (context) => {
  const { root, store, service, admin } = await fixture(context);
  const { order, font } = await readyOrder(service, admin);
  const before = await store.read();
  const supplement = { type: "NUMBER", content: "2", sourceId: font.id, heightMm: 100, quantity: 1 };
  const analysis = await service.analyzeProductionEfficiency(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement });
  context.diagnostic(JSON.stringify(analysis.evidence));
  assert.equal(analysis.status, "FIT");
  assert.equal(analysis.evidence.customerOrderLinesCreated, false);
  assert.ok(analysis.evidence.augmentedUsedLengthMm <= analysis.evidence.baseUsedLengthMm);

  const prepared = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement, efficiencyAnalysisHash: analysis.analysisHash }, "efficiency-prepare");
  const job = prepared.value.job;
  assert.equal(job.snapshot.productionSupplements.length, 1);
  assert.equal(job.snapshot.productionSupplements[0].customerOrderLine, false);
  assert.equal(job.snapshot.productionSupplements[0].analysisHash, analysis.analysisHash);
  assert.equal(job.snapshot.layout.objectCount, 2);
  assert.ok(job.snapshot.layout.placements.some(({ sourceOrderId }) => String(sourceOrderId).startsWith("SUPPLEMENT:")));
  const after = await store.read();
  assert.equal(after.orders.length, before.orders.length, "folie-opvulling maakt nooit een klantorder");
  assert.equal(after.orders.flatMap(({ productionLines = [] }) => productionLines).some(({ id }) => id === analysis.supplement.id), false);
  assert.ok(after.audit.some(({ action, details }) => action === "Human GO · PlotJob vastgelegd" && details.efficiencyAnalysisHash === analysis.analysisHash && details.customerOrderLinesCreatedForSupplement === false));
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.match(svg, /data-contour-id="SUPPLEMENT:/u);
});

test("geen aantoonbare restcapaciteit en stale analyse blokkeren fail-closed", async (context) => {
  const { service, admin } = await fixture(context);
  const { order, font } = await readyOrder(service, admin);
  const tooLarge = { type: "TEXT", content: "DIT PAST NIET IN DEZELFDE FOLIELENGTE", sourceId: font.id, heightMm: 300, quantity: 8 };
  const analysis = await service.analyzeProductionEfficiency(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement: tooLarge });
  assert.equal(analysis.status, "NO_SAFE_REST_CAPACITY");
  await assert.rejects(service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement: tooLarge, efficiencyAnalysisHash: analysis.analysisHash }, "efficiency-no-fit"), (error) => error.code === "PRODUCTION_SUPPLEMENT_NO_SAFE_CAPACITY");

  const valid = { type: "NUMBER", content: "2", sourceId: font.id, heightMm: 100, quantity: 1 };
  const fit = await service.analyzeProductionEfficiency(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement: valid });
  context.diagnostic(JSON.stringify(fit.evidence));
  assert.equal(fit.status, "FIT");
  await assert.rejects(service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement: valid, efficiencyAnalysisHash: "STALE" }, "efficiency-stale"), (error) => error.code === "PRODUCTION_EFFICIENCY_ANALYSIS_STALE");
});

test("winkelrol kan de specialistische geometrieanalyse niet uitvoeren", async (context) => {
  const { service, admin } = await fixture(context);
  const { order, font } = await readyOrder(service, admin);
  const storeUser = await service.login({ email: "collega@sportpaleis.nl", password: "Efficiency-Store-2026!" });
  await assert.rejects(service.analyzeProductionEfficiency(storeUser.token, storeUser.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit", supplement: { type: "NUMBER", content: "2", sourceId: font.id, heightMm: 200, quantity: 1 } }), (error) => error.code === "FORBIDDEN");
});
