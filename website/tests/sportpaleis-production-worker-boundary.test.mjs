import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createSportpaleisProductionBootstrap } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { buildProductionJobSnapshotIsolated, projectProductionJobBuildInput } from "../src/sportpaleis/production-job-build.mjs";

test("directe Vrije productie transporteert alleen bereikbare bronwaarheid naar de worker", () => {
  const usedFont = { id: "font-used", version: "USED", sha256: "A".repeat(64), status: "TECHNICALLY_VALID", sourceUrl: "/assets/used.ttf" };
  const unusedPayload = "x".repeat(2_000_000);
  const state = {
    organizationId: "sportpaleis",
    settings: { productionDefaults: { workingWidthMm: 440, maxSafeTrackWidthMm: 450, minimumGapMm: 5, edgeMarginMm: 5 }, unrelated: unusedPayload },
    associations: [{ id: "unused-association", name: unusedPayload }],
    articles: [{ id: "unused-article", name: unusedPayload }],
    productionProfiles: [{ id: "unused-profile", instruction: unusedPayload }],
    productionFonts: [usedFont, { id: "font-unused", sourceDataBase64: unusedPayload }],
    productionElements: [{ id: "asset-unused", controlledVector: unusedPayload }],
    productionAssetSources: [{ id: "source-unused", original: { dataBase64: unusedPayload } }],
    foilRolls: [{ id: "foil-unused", color: "Wit", note: unusedPayload }],
  };
  const line = { id: "free-12", type: "NUMBER", content: "12", source: { kind: "FONT", id: usedFont.id, version: usedFont.version, sha256: usedFont.sha256 }, widthMm: 80, heightMm: 80, quantity: 2, foilColor: "Wit", validation: { status: "VALID", reason: null } };
  const order = { id: "SP-FREE-1", orderKind: "CUSTOM", items: [{ id: "item-free", sourceType: "CUSTOM", association: "Vrije bedrukking", productionProfileId: null, quantity: 2, foilColor: "Wit" }], productionLines: [{ ...line, itemId: "item-free", orderId: "SP-FREE-1", decorationIdentity: { orderId: "SP-FREE-1", itemId: "item-free", articleNumber: "item-free", decorationType: "NUMBER", placement: "NUMBER", value: "12", foilColor: "Wit", productionProfileId: usedFont.id } }] };
  const projected = projectProductionJobBuildInput({
    state,
    orders: [order],
    productionGroup: { lineRefs: [{ orderId: order.id, lineId: line.id }], foilColor: "Wit" },
  });

  assert.equal(projected.projection.kind, "DIRECT_FREE_PRODUCTION_REACHABILITY_V1");
  assert.deepEqual(projected.state.productionFonts.map(({ id }) => id), [usedFont.id]);
  assert.deepEqual(projected.state.associations, []);
  assert.deepEqual(projected.state.articles, []);
  assert.deepEqual(projected.state.productionProfiles, []);
  assert.deepEqual(projected.state.productionElements, []);
  assert.deepEqual(projected.state.productionAssetSources, []);
  assert.deepEqual(projected.state.settings, { productionDefaults: state.settings.productionDefaults });
  const outputBytes = Buffer.byteLength(JSON.stringify(projected));
  const inputBytes = Buffer.byteLength(JSON.stringify({ state, orders: [order], productionGroup: { lineRefs: [{ orderId: order.id, lineId: line.id }], foilColor: "Wit" } }));
  assert.ok(outputBytes < 10_000, `workerinput bleef te groot: ${outputBytes} bytes`);
  assert.ok(inputBytes > 10_000_000, "fixture bewijst geen production-shaped transportreductie");
});

test("onvolledige of niet-vrije bronwaarheid valt fail-closed terug op de volledige workerinput", () => {
  const state = { organizationId: "sportpaleis", settings: { productionDefaults: {} }, associations: [], articles: [], productionProfiles: [], productionFonts: [], productionElements: [], productionAssetSources: [], foilRolls: [] };
  const orders = [{ id: "SP-HISTORICAL", orderKind: "INDIVIDUAL", items: [{ id: "item" }], productionLines: [] }];
  const projected = projectProductionJobBuildInput({ state, orders, productionGroup: { lineRefs: [{ orderId: "SP-HISTORICAL", lineId: "missing" }] } });
  assert.equal(projected.projection.kind, "FULL_STATE_SAFETY_FALLBACK_V1");
  assert.equal(projected.state, state);
});

test("een CUSTOM-order met verenigingswaarheid wordt niet als vrije reachability behandeld", () => {
  const state = { organizationId: "sportpaleis", settings: { productionDefaults: {} }, associations: [{ id: "pioneers", name: "Almere Pioneers" }], articles: [], productionProfiles: [], productionFonts: [], productionElements: [], productionAssetSources: [], foilRolls: [] };
  const line = { id: "club-number", type: "NUMBER", source: { kind: "PRODUCTION_ELEMENT", id: "club-asset", version: "1" }, validation: { status: "VALID" } };
  const order = { id: "SP-CLUB-CUSTOM", orderKind: "CUSTOM", items: [{ id: "item", sourceType: "CUSTOM", association: "Almere Pioneers", productionProfileId: null }], productionLines: [line] };
  const projected = projectProductionJobBuildInput({ state, orders: [order], productionGroup: { lineRefs: [{ orderId: order.id, lineId: line.id }] } });
  assert.equal(projected.projection.kind, "FULL_STATE_SAFETY_FALLBACK_V1");
  assert.equal(projected.state, state);
});

test("Zuinig-bedrukken-supplementen tellen mee in de bereikbare bronset", () => {
  const font = (id, marker) => ({ id, version: marker, sha256: marker.repeat(64).slice(0, 64), status: "TECHNICALLY_VALID", sourceUrl: `/assets/${id}.ttf` });
  const base = font("font-base", "A");
  const supplement = font("font-supplement", "B");
  const line = (id, source) => ({ id, type: "TEXT", content: id, source: { kind: "FONT", id: source.id, version: source.version, sha256: source.sha256 }, widthMm: 80, heightMm: 30, quantity: 1, validation: { status: "VALID", reason: null } });
  const order = { id: "SP-FREE-SUPPLEMENT", orderKind: "CUSTOM", items: [{ id: "item", sourceType: "CUSTOM", association: "Vrije bedrukking", productionProfileId: null }], productionLines: [line("base", base)] };
  const projected = projectProductionJobBuildInput({
    state: { organizationId: "sportpaleis", settings: { productionDefaults: {} }, associations: [], articles: [], productionProfiles: [], productionFonts: [base, supplement], productionElements: [], productionAssetSources: [], foilRolls: [] },
    orders: [order],
    productionGroup: { lineRefs: [{ orderId: order.id, lineId: "base" }], supplements: [line("supplement", supplement)] },
  });
  assert.equal(projected.projection.kind, "DIRECT_FREE_PRODUCTION_REACHABILITY_V1");
  assert.equal(projected.projection.supplementCount, 1);
  assert.deepEqual(projected.state.productionFonts.map(({ id }) => id), [base.id, supplement.id]);
});

test("een gekoppelde visuele bron transporteert geen origineel intakebestand naar de geometryworker", () => {
  const asset = { id: "asset-used", version: "1", sourceId: "source-large", variants: [{ id: "variant", widthMm: 80, heightMm: 40 }], controlledVector: { paths: [] } };
  const line = { id: "visual", type: "LOGO", content: "Logo", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version, variantId: "variant" }, widthMm: 80, heightMm: 40, quantity: 1, validation: { status: "VALID", reason: null } };
  const order = { id: "SP-FREE-VISUAL", orderKind: "CUSTOM", items: [{ id: "item", sourceType: "CUSTOM", association: "Vrije bedrukking", productionProfileId: null }], productionLines: [line] };
  const projected = projectProductionJobBuildInput({
    state: { organizationId: "sportpaleis", settings: { productionDefaults: {} }, associations: [], articles: [], productionProfiles: [], productionFonts: [], productionElements: [asset], productionAssetSources: [{ id: asset.sourceId, original: { dataBase64: "x".repeat(2_000_000) } }], foilRolls: [] },
    orders: [order],
    productionGroup: { lineRefs: [{ orderId: order.id, lineId: line.id }] },
  });
  assert.equal(projected.projection.kind, "DIRECT_FREE_PRODUCTION_REACHABILITY_V1");
  assert.deepEqual(projected.state.productionAssetSources, []);
  assert.ok(Buffer.byteLength(JSON.stringify(projected)) < 1_000_000);
});

test("de geïsoleerde worker materialiseert basis en supplement uit twee bereikbare fontbronnen", async () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-06T12:00:00.000Z"));
  const [baseFont, supplementFont] = state.productionFonts.filter(({ status, sourceUrl }) => status === "TECHNICALLY_VALID" && sourceUrl).slice(0, 2);
  assert.ok(baseFont && supplementFont);
  const source = (font) => ({ kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 });
  const line = (id, font, content) => ({ id, itemId: "item", orderId: "SP-WORKER-REAL", type: "TEXT", content, source: source(font), widthMm: 50, heightMm: 20, quantity: 1, foilColor: "Wit", validation: { status: "VALID", reason: null }, decorationIdentity: { orderId: "SP-WORKER-REAL", itemId: "item", articleNumber: "item", decorationType: "TEXT", placement: "TEXT", value: content, foilColor: "Wit", productionProfileId: font.id } });
  const baseLine = line("base", baseFont, "A");
  const supplementLine = { ...line("supplement", supplementFont, "B"), productionSupplement: true };
  const order = { id: "SP-WORKER-REAL", orderKind: "CUSTOM", association: "Vrije bedrukking", items: [{ id: "item", sourceType: "CUSTOM", association: "Vrije bedrukking", product: "Vrije opdruk", quantity: 1, foilColor: "Wit", productionProfileId: null }], productionLines: [baseLine] };
  const input = projectProductionJobBuildInput({ state, orders: [order], jobNumber: "PLOT-2026-9999", createdAt: "2026-09-06T12:00:00.000Z", artifactRoot: path.resolve("."), runtimeArtifactRoot: path.resolve("."), productionGroup: { lineRefs: [{ orderId: order.id, lineId: baseLine.id }], supplements: [supplementLine], foilColor: "Wit", efficiencyEvidence: { analysisHash: "C".repeat(64) } }, options: { persistArtifacts: false, returnArtifactPayload: true, operationIdentity: "worker-supplement-two-fonts" } });
  assert.deepEqual(new Set(input.state.productionFonts.map(({ id }) => id)), new Set([baseFont.id, supplementFont.id]));
  const snapshot = await buildProductionJobSnapshotIsolated(input, { operationIdentity: "worker-supplement-two-fonts" });
  assert.deepEqual(snapshot.productionLines.map(({ id }) => id), [baseLine.id, supplementLine.id]);
  assert.equal(snapshot.fontSources.length, 2);
  assert.match(snapshot.artifactPayload, /^<svg/u);
});
