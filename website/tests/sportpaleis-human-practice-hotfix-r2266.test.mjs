import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { createSportpaleisProductionBootstrap, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  canonicalArticlePersonalizationFields,
  canonicalOrderFoilColors,
  canonicalProductionLineFoilColor,
  productionAssetContextDecision,
  projectProductionReadyVisualAssets,
  proportionalProductionAssetSize,
} from "../src/sportpaleis/production-practice-contract.mjs";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";

const profile = (association, field) => ({ id: `profile-source-${association}-${field}`, supports: [field] });
const article = (association, supports = [], personalizationPolicy = undefined) => ({ association, supports, personalizationPolicy, profileId: `profile-${association.toLowerCase().replaceAll(" ", "-")}` });
const geometryHash = "a".repeat(64);
const executableVisual = (name, association, kind = "SPONSOR") => ({
  id: name.toLowerCase(), name, lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", sourceId: `source-${name}`,
  sourceSelection: { geometryHash }, controlledVector: { geometryHash, contours: [[[0, 0], [10, 0], [10, 5], [0, 5]]] },
  variants: [{ id: `${name}-100mm`, widthMm: 100, heightMm: 50 }], sizePolicy: { defaultWidthMm: 100, defaultHeightMm: 50 },
  ownerType: "ASSOCIATION", contexts: [{ type: "ASSOCIATION", id: association.toLowerCase(), label: association }], applications: [{ kind }],
});

test("commerciale artikelopties worden generiek aangevuld vanuit fysieke verenigingstruth en producttype", () => {
  const state = createSportpaleisProductionBootstrap();
  const mhc = state.associations.find(({ name }) => name === "MHC Lelystad");
  const shirt = state.articles.find(({ association }) => association === "MHC Lelystad");
  assert.deepEqual(
    canonicalArticlePersonalizationFields({ article: shirt, association: mhc, productionProfiles: state.productionProfiles, productType: "UPPER_GARMENT" }),
    ["name", "backNumber"],
    "MHC-shirt behoudt naam en krijgt het fysiek bevestigde rugnummer zonder ongeldige short-/borstopties",
  );

  const otherClub = { name: "Toekomst FC", dimensionsCm: { initialsShirt: 3, nameHeight: 5, backNumberSenior: 22, chestNumber: 8, shortsNumber: 7 } };
  const profiles = [{ id: "profile-toekomst-fc", supports: ["initials", "name", "backNumber", "chestNumber", "shortsNumber"] }, ...["initials", "name", "backNumber", "chestNumber", "shortsNumber"].map((field) => profile("toekomst-fc", field))];
  assert.deepEqual(canonicalArticlePersonalizationFields({ article: article("Toekomst FC", ["name"]), association: otherClub, productionProfiles: profiles, productType: "UPPER_GARMENT" }), ["name", "initials", "backNumber", "chestNumber"]);
  assert.deepEqual(canonicalArticlePersonalizationFields({ article: article("Toekomst FC"), association: otherClub, productionProfiles: profiles, productType: "LOWER_GARMENT" }), ["initials", "name", "shortsNumber"]);
});

test("onbewezen maat, ontbrekend profiel en incompatible productoppervlak verlenen nooit extra personalisatie", () => {
  const association = { name: "Safe Stop VV", dimensionsCm: { initialsShirt: null, nameHeight: 5, backNumberSenior: 20, chestNumber: null, shortsNumber: 7 } };
  const fields = canonicalArticlePersonalizationFields({
    article: article("Safe Stop VV", ["name"]),
    association,
    productionProfiles: [{ id: "profile-safe-stop-vv", supports: ["name", "backNumber", "shortsNumber"] }, profile("safe-stop-vv", "name"), profile("safe-stop-vv", "backNumber"), profile("safe-stop-vv", "shortsNumber")],
    productType: "BACKPACK",
  });
  assert.deepEqual(fields, ["name"]);
  assert.deepEqual(canonicalArticlePersonalizationFields({ article: article("Safe Stop VV"), association, productionProfiles: [], productType: "UPPER_GARMENT" }), []);
});

test("concrete MHC-order bewaart naam én rugnummer server-side zonder catalogus-hardcode", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sp-r2266-mhc-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwords = { kevin: "R2266-MHC-Kevin!", patrick: "R2266-MHC-Patrick!", collega: "R2266-MHC-Store!", "donovan-support": "R2266-MHC-Support!" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), uploadsEnabled: false, productionAssetUploadsEnabled: true });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "MHC praktijkbewijs", customerEmail: "", customerPhone: "",
    standardPersonalization: { ...empty, name: "Jansen", backNumber: "28", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-101119", size: "M", quantity: 1, deviation: false, overrides: empty }],
  }, "r2266-mhc-name-backnumber")).value;
  assert.deepEqual(created.items[0].personalizationValues, { name: "Jansen", backNumber: "28", backNumberSizeClass: "SENIOR" });
  assert.deepEqual(created.productionLines.map(({ personalizationField }) => personalizationField), ["name", "backNumber"]);
  assert.equal(created.productionLines.find(({ personalizationField }) => personalizationField === "backNumber").heightMm, 220);
});

test("Vrije opdruk projecteert alle visuele productierijpe bronnen; context rangschikt maar verbergt niet", () => {
  const elements = [executableVisual("Kroonenberg", "Club A"), executableVisual("Yanmar", "Club B", "LOGO"), executableVisual("Ruitenheer", "Club C", "ARTWORK"), executableVisual("Nummerset", "Club D", "NUMBER_SET"), { ...executableVisual("Concept", "Club A"), lifecycleStatus: "REVIEW" }];
  assert.deepEqual(projectProductionReadyVisualAssets(elements, "").map(({ name }) => name), ["Kroonenberg", "Yanmar", "Ruitenheer"]);
  assert.deepEqual(projectProductionReadyVisualAssets(elements, "Club B", { includeAll: false }).map(({ name }) => name), ["Yanmar"]);
  assert.deepEqual(projectProductionReadyVisualAssets(elements, "Onbekende club", { includeAll: false }), []);
});

test("één broncontextcontract staat expliciete Vrije opdruk toe en houdt vereniging/artikel/order strikt", () => {
  const visual = { ...executableVisual("Toekomst Sponsor", "Club A"), id: "asset-visual", sourceId: "source-visual", contexts: [{ type: "ASSOCIATION", id: "club-a", label: "Club A" }] };
  assert.equal(productionAssetContextDecision({ asset: visual, orderKind: "CUSTOM", associationIdentities: ["Vrije bedrukking"] }).allowed, true);
  assert.equal(productionAssetContextDecision({ asset: visual, orderKind: "TEAM", associationIdentities: ["club-b", "Club B"] }).code, "PRODUCTION_ASSET_CONTEXT_MISMATCH");
  assert.equal(productionAssetContextDecision({ asset: visual, orderKind: "TEAM", associationIdentities: ["club-a", "Club A"] }).allowed, true);

  const articleScoped = { ...visual, id: "asset-article", name: "Artikelbron", ownerType: "BRAND", contexts: [{ type: "ARTICLE", id: "sku-100", label: "sku-100" }] };
  assert.equal(productionAssetContextDecision({ asset: articleScoped, orderKind: "CUSTOM", articleIdentities: [] }).code, "PRODUCTION_ASSET_ARTICLE_MISMATCH");
  assert.equal(productionAssetContextDecision({ asset: articleScoped, orderKind: "CUSTOM", articleIdentities: ["sku-100"] }).allowed, true);
  const orderScoped = { ...visual, id: "asset-order", name: "Orderbron", ownerType: "CUSTOMER", contexts: [{ type: "ORDER", id: "SP-42", label: "SP-42" }] };
  assert.equal(productionAssetContextDecision({ asset: orderScoped, orderKind: "CUSTOM", orderId: "SP-41" }).code, "PRODUCTION_ASSET_ORDER_MISMATCH");
  assert.equal(productionAssetContextDecision({ asset: orderScoped, orderKind: "CUSTOM", orderId: "SP-42" }).allowed, true);
  assert.equal(productionAssetContextDecision({ asset: { ...visual, lifecycleStatus: "REVIEW" }, orderKind: "CUSTOM" }).code, "PRODUCTION_ASSET_NOT_READY");
});

test("concrete Vrije opdruk gebruikt een expliciet gekozen productierijpe nummerset buiten verenigingscontext", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sp-r2266-free-source-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwords = { kevin: "R2266-Free-Kevin!", patrick: "R2266-Free-Patrick!", collega: "R2266-Free-Store!", "donovan-support": "R2266-Free-Support!" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), uploadsEnabled: false, productionAssetUploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const bootstrap = await service.bootstrap(admin.token);
  const source = bootstrap.productionElements.find(({ applications, lifecycleStatus }) => lifecycleStatus === "PRODUCTION_READY" && applications?.some(({ kind }) => kind === "NUMBER_SET"));
  assert.ok(source, "fixture bevat een beheerde productierijpe nummerset");
  const variant = source.variants[0];
  const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Vrije bronpraktijk", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Vrije opdruk", association: "Vrije bedrukking", size: "", quantity: 1, personalization: "34 × 1 · Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: "free-number-34", type: "NUMBER", content: "34", sourceId: source.id, widthMm: variant.widthMm, heightMm: variant.heightMm, foilColor: "Wit", quantity: 1 }],
  }, "r2266-free-number-source")).value;
  assert.equal(created.productionLines[0].source.id, source.id);
  assert.equal(created.productionLines[0].content, "34");
  assert.equal(created.items[0].foilColor, "Wit");
  assert.deepEqual(created.foilStates.map(({ color }) => color), ["Wit"]);
  assert.ok(!created.foilStates.some(({ color }) => color === "Onbekend"));
});

test("decorationregels bepalen generiek de fysieke kleur en synthetische artikelmetadata maakt geen lege batch", () => {
  const custom = { orderKind: "CUSTOM", items: [{ id: "custom", foilColor: "Onbekend" }], productionLines: [{ itemId: "custom", foilColor: "Wit" }] };
  assert.deepEqual(canonicalOrderFoilColors(custom), ["Wit"]);
  assert.equal(canonicalProductionLineFoilColor(custom, custom.productionLines[0]), "Wit");

  const mixed = { orderKind: "TEAM", items: [{ id: "shirt", foilColor: "Rood" }], productionLines: [{ itemId: "shirt", foilColor: "Rood" }, { itemId: "shirt", decorationIdentity: { foilColor: "Wit" }, foilColor: "Zwart" }] };
  assert.deepEqual(canonicalOrderFoilColors(mixed), ["Rood", "Wit"]);
  assert.equal(canonicalProductionLineFoilColor(mixed, mixed.productionLines[1]), "Wit");

  const stockOnly = { items: [{ id: "stock", foilColor: "Blauw" }], productionLines: [] };
  assert.deepEqual(canonicalOrderFoilColors(stockOnly), ["Blauw"]);
});

test("visuele productieassets schalen proportioneel op breedte of hoogte en blijven begrensd", () => {
  assert.deepEqual(proportionalProductionAssetSize({ requestedWidthMm: 200, currentWidthMm: 100, currentHeightMm: 50, defaultWidthMm: 100, defaultHeightMm: 50 }), { widthMm: 200, heightMm: 100 });
  assert.deepEqual(proportionalProductionAssetSize({ requestedHeightMm: 80, currentWidthMm: 100, currentHeightMm: 50, defaultWidthMm: 100, defaultHeightMm: 50 }), { widthMm: 160, heightMm: 80 });
  assert.deepEqual(proportionalProductionAssetSize({ requestedHeightMm: 500, currentWidthMm: 100, currentHeightMm: 50, defaultWidthMm: 100, defaultHeightMm: 50, maxWidthMm: 300 }), { widthMm: 300, heightMm: 150 });
  assert.throws(() => proportionalProductionAssetSize({ requestedWidthMm: 100, currentWidthMm: 100, currentHeightMm: 50, defaultWidthMm: 100, defaultHeightMm: 0 }), /bronverhouding/u);
});

test("bulk invoer herkent echte Excel-/reeks-/aantalvarianten zonder stil dataverlies", () => {
  assert.deepEqual(parseTeamProductionLines("28\t2\n29 x 3\n30 t/m 32\nMW"), [
    { value: "28", quantity: 2 },
    { value: "29", quantity: 3 },
    { value: "30", quantity: 1 },
    { value: "31", quantity: 1 },
    { value: "32", quantity: 1 },
    { value: "MW", quantity: 1 },
  ]);
  assert.throws(() => parseTeamProductionLines("A x 1000"), /maximaal 999/u);
});

test("Vrije opdruk implementeert één generieke snelle productieflow en duidelijke roundtrip", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Productiebron \/ stijl/u);
  assert.match(source, /quantity: 1/u);
  assert.match(source, /<label>Aantal<input[^>]+min="1"/u);
  assert.match(source, /Plak een lijst, reeks of Excel-kolom/u);
  assert.match(source, /Vrije folieruimte benutten/u);
  assert.match(source, /Naar productie/u);
  assert.match(source, /Bekijk order/u);
});

test("bronprojectie en bulkerkenning blijven interactief bij toekomstige catalogusomvang", () => {
  const elements = Array.from({ length: 5_000 }, (_, index) => ({ ...executableVisual(`Asset ${index}`, `Club ${index % 100}`, index % 2 ? "SPONSOR" : "LOGO"), id: `asset-${index}`, sourceId: `source-${index}` }));
  const rows = Array.from({ length: 50 }, (_, index) => `${index + 1} x 2`).join("\n");
  const start = performance.now();
  assert.equal(projectProductionReadyVisualAssets(elements, "Club 37").length, 5_000);
  assert.equal(parseTeamProductionLines(rows).reduce((sum, row) => sum + row.quantity, 0), 100);
  assert.ok(performance.now() - start < 100, "projectie en invoercontrole blijven onder 100 ms voor 5.000 bronnen/50 regels");
});
