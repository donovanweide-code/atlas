import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-final-prelive-catalog.generated.mjs";
import { SportpaleisFileStore, SportpaleisPilotService, validateSportpaleisPilotState } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { resolveCatalogPersonalizationPrice } from "../src/sportpaleis/catalog-personalization-pricing.mjs";

const passwords = { kevin: "Article-141598-Admin!", patrick: "Article-141598-Operator!", collega: "Article-141598-Store!", "donovan-support": "Article-141598-Support!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-141598-pricing-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-ARTICLE-141598-PRICING-HOTFIX" });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { store, service, operator };
}

function orderPayload(backNumber, quantity = 1, extraItems = []) {
  return {
    orderKind: "INDIVIDUAL",
    association: "SC Buitenboys",
    customer: "Artikel 141598 praktijk",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: { ...empty, backNumber, backNumberSizeClass: backNumber ? "SENIOR" : "" },
    items: [
      { articleId: "sp-live-141598", size: "L", quantity, deviation: false, overrides: empty },
      ...extraItems,
    ],
  };
}

test("artikel 141598 draagt required rugnummer en één centrale 5,00/8,50 prijswaarheid", () => {
  const article = SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ articleNumber }) => articleNumber === "141598");
  assert.ok(article);
  assert.equal(article.personalizationPolicy.fields.backNumber, "required");
  assert.equal(article.priceConfiguration.personalizationUnitPricesEur.backNumber, null);
  assert.deepEqual(resolveCatalogPersonalizationPrice(article, "backNumber", " 7 "), { status: "PRICED", normalizedValue: "7", unitPriceEur: 5, reason: null });
  assert.deepEqual(resolveCatalogPersonalizationPrice(article, "backNumber", " 12 "), { status: "PRICED", normalizedValue: "12", unitPriceEur: 8.5, reason: null });
  assert.equal(resolveCatalogPersonalizationPrice(article, "backNumber", "123").status, "INVALID");
  assert.equal(resolveCatalogPersonalizationPrice(article, "backNumber", "AB").status, "INVALID");
  assert.equal(resolveCatalogPersonalizationPrice(article, "backNumber", "").status, "EMPTY");
});

test("orderwaarheid prijst occurrence-based en projecteert exact één rugnummer naar Productie", async (context) => {
  const { store, service, operator } = await fixture(context);
  const one = (await service.createOrder(operator.token, operator.csrfToken, orderPayload("7"), "article-141598-one-digit")).value;
  assert.deepEqual(one.commercialPriceTruth.lines.map(({ articleNumber, field, value, quantity, unitPriceEur, totalPriceEur }) => ({ articleNumber, field, value, quantity, unitPriceEur, totalPriceEur })), [
    { articleNumber: "141598", field: "backNumber", value: "7", quantity: 1, unitPriceEur: 5, totalPriceEur: 5 },
  ]);
  assert.equal(one.productionLines.filter(({ personalizationField }) => personalizationField === "backNumber").length, 1);

  const two = (await service.createOrder(operator.token, operator.csrfToken, orderPayload(" 12 ", 2, [
    { articleId: "sp-live-140300", size: "L", quantity: 1, deviation: false, overrides: empty },
  ]), "article-141598-two-digit-two-occurrences")).value;
  assert.equal(two.commercialPriceTruth.totalPersonalizationEur, 17);
  assert.deepEqual(two.commercialPriceTruth.lines.map(({ articleNumber, field, value, quantity, unitPriceEur, totalPriceEur }) => ({ articleNumber, field, value, quantity, unitPriceEur, totalPriceEur })), [
    { articleNumber: "141598", field: "backNumber", value: "12", quantity: 2, unitPriceEur: 8.5, totalPriceEur: 17 },
  ]);
  assert.equal(two.productionLines.filter(({ personalizationField }) => personalizationField === "backNumber").length, 1);
  assert.equal(two.productionLines.find(({ personalizationField }) => personalizationField === "backNumber").quantity, 2);
  assert.equal(two.productionLines.some(({ decorationIdentity }) => decorationIdentity?.articleNumber === "140300" && decorationIdentity?.decorationType === "backNumber"), false);

  const persisted = (await store.read()).orders.find(({ id }) => id === two.id);
  assert.deepEqual(persisted.commercialPriceTruth, two.commercialPriceTruth);
});

test("lege, ongeldige en driecijferige rugnummers blokkeren gericht vóór opslag", async (context) => {
  const { store, service, operator } = await fixture(context);
  const before = await store.read();
  await assert.rejects(service.createOrder(operator.token, operator.csrfToken, orderPayload(""), "article-141598-empty"), (error) => error.code === "PERSONALIZATION_REQUIRED" && /wedstrijd shirt.*rug/iu.test(error.message));
  await assert.rejects(service.createOrder(operator.token, operator.csrfToken, orderPayload("ABC"), "article-141598-invalid"), (error) => error.code === "ARTICLE_PERSONALIZATION_PRICE_INVALID");
  await assert.rejects(service.createOrder(operator.token, operator.csrfToken, orderPayload("123"), "article-141598-three-digit"), (error) => error.code === "ARTICLE_PERSONALIZATION_PRICE_INVALID");
  const after = await store.read();
  assert.equal(after.orders.length, before.orders.length);
  assert.equal(after.nextOrderSequence, before.nextOrderSequence);
});

test("deselectie, herselectie en bestaande handmatige waarde maken geen dubbele prijs of decoratie", async (context) => {
  const { service, operator } = await fixture(context);
  const created = (await service.createOrder(operator.token, operator.csrfToken, orderPayload("12"), "article-141598-dedupe")).value;
  const deduplicated = await service.updateOrder(operator.token, operator.csrfToken, created.id, {
    standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-141598", size: "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" } }],
  }, created.revision);
  assert.equal(deduplicated.productionLines.filter(({ personalizationField }) => personalizationField === "backNumber").length, 1);
  assert.equal(deduplicated.commercialPriceTruth.lines.length, 1);
  assert.equal(deduplicated.commercialPriceTruth.totalPersonalizationEur, 8.5);

  const deselected = await service.updateOrder(operator.token, operator.csrfToken, created.id, {
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-140300", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, deduplicated.revision);
  assert.equal(deselected.commercialPriceTruth.lines.length, 0);
  assert.equal(deselected.commercialPriceTruth.totalPersonalizationEur, 0);
  assert.equal(deselected.productionLines.some(({ personalizationField }) => personalizationField === "backNumber"), false);

  const reselected = await service.updateOrder(operator.token, operator.csrfToken, created.id, orderPayload("7"), deselected.revision);
  assert.equal(reselected.commercialPriceTruth.lines.length, 1);
  assert.equal(reselected.commercialPriceTruth.totalPersonalizationEur, 5);
  assert.equal(reselected.productionLines.filter(({ personalizationField }) => personalizationField === "backNumber").length, 1);
});

test("onbehandelde concepten worden veilig herprijsd terwijl productiehistorie immutable blijft", async (context) => {
  const { store, service, operator } = await fixture(context);
  const created = (await service.createOrder(operator.token, operator.csrfToken, orderPayload("12"), "article-141598-history-lock")).value;
  const legacyConcept = structuredClone(await store.read());
  const conceptOrder = legacyConcept.orders.find(({ id }) => id === created.id);
  delete conceptOrder.commercialPriceTruth;
  const reprojected = validateSportpaleisPilotState(legacyConcept).orders.find(({ id }) => id === created.id);
  assert.equal(reprojected.commercialPriceTruth.source, "CATALOG_CONCEPT_REPROJECTION");
  assert.equal(reprojected.commercialPriceTruth.totalPersonalizationEur, 8.5);

  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, "article-141598-control-lock")).value;
  const immutablePriceTruth = structuredClone(controlled.commercialPriceTruth);
  await assert.rejects(service.updateOrder(operator.token, operator.csrfToken, controlled.id, { ...orderPayload("7"), correctionReason: "Historische immutability-regressie" }, controlled.revision), (error) => error.code === "ORDER_CONTENT_LOCKED");
  const after = (await store.read()).orders.find(({ id }) => id === controlled.id);
  assert.deepEqual(after.commercialPriceTruth, immutablePriceTruth);
  assert.equal(after.stage, "CONTROL");
});

test("UI-contract houdt 141598 direct zichtbaar, artikelgebonden, geprijsd en mobiel bruikbaar", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(source, /requiredStandardField\(state, field\)/u);
  assert.match(source, /field !== "backNumber" \|\| requiredStandardField\(state, field\)/u);
  assert.match(source, /Artikel \$\{article\.articleNumber\}/u);
  assert.match(source, /catalogPersonalizationPriceHint/u);
  assert.match(source, /Rugnummer.*× \$\{count\}/su);
  assert.match(source, /data-standard-price/u);
  assert.match(source, /clearUnprojectedStandardPersonalization/u);
  assert.match(source, /captureMode === "mobile320"/u);
  assert.match(css, /sp-article-print-truth/u);
  assert.match(css, /--sp-capture-width/u);
});
