import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { calculateManagedCheckoutTotal } from "../src/sportpaleis/workspace-data.ts";

const passwords = { kevin: "Test-Kevin-008A!veilig", patrick: "Test-Patrick-008A!veilig", collega: "Test-Collega-008A!veilig", "donovan-support": "Test-Support-008A!veilig" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-008a-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-008A-20260808", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function payload(items, standardPersonalization = {}) {
  return {
    customer: "Donovan van de Weide", customerEmail: "donovan@example.nl", customerPhone: "06 12345678",
    standardPersonalization: { initials: "DvdW", initialsSemantic: { prefix: "Donovan", infix: "van de", surname: "Weide" }, name: "VAN DE WEIDE", backNumber: "10", shortsNumber: "", ...standardPersonalization },
    items,
  };
}

test("008A - Winkelmedewerker simplification", async (context) => {
  const { service, storeUser } = await fixture(context);
  const create = (items, key, personalization) => service.createOrder(storeUser.token, storeUser.csrfToken, payload(items, personalization), key);

  await context.test("drie verschillende artikelen erven één orderstandaard en negeren niet-ondersteunde velden", async () => {
    const order = (await create([
      { articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} },
      { articleId: "sp-live-134826", size: "M", quantity: 1, deviation: true, overrides: { initials: "", name: "", backNumber: "", shortsNumber: "23" } },
      { articleId: "sp-live-140226", size: "M", quantity: 1, deviation: false, overrides: {} },
    ], "three-articles-standard-008a", { initials: "SB", backNumber: "23", shortsNumber: "23" })).value;
    assert.equal(order.items.length, 3);
    assert.match(order.items[0].personalization, /Rug 23/);
    assert.match(order.items[1].personalization, /Short 23/);
    assert.match(order.items[2].personalization, /Initialen SB/);
  });

  await context.test("één klantorder bewaart twee verenigingen en verschillende productieprofielen per artikel", async () => {
    const order = (await create([
      { articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} },
      { articleId: "sp-live-116597", size: "L", quantity: 1, deviation: false, overrides: {} },
    ], "multi-association-008a", { initials: "SB", backNumber: "23", shortsNumber: "23" })).value;
    assert.equal(order.association, "Meerdere verenigingen");
    assert.deepEqual(order.associations.sort(), ["A.S.C. Waterwijk", "FC Almere"]);
    assert.equal(order.items[0].association, "A.S.C. Waterwijk");
    assert.equal(order.items[1].association, "FC Almere");
    assert.notEqual(order.items[0].productionProfileId, order.items[1].productionProfileId);
    assert.match(order.items[0].personalization, /Rug 23/);
    assert.match(order.items[1].personalization, /Rug 23/);
  });

  await context.test("een, twee en drie identieke artikelen blijven elk een eenvoudige groep", async () => {
    for (const quantity of [1, 2, 3]) {
      const order = (await create([{ articleId: "sp-live-137294", size: "M", quantity, deviation: false, overrides: {} }], `simple-${quantity}-008a`)).value;
      assert.equal(order.items.length, 1); assert.equal(order.items[0].quantity, quantity); assert.equal(order.items[0].size, "M");
    }
  });

  await context.test("verschillende maat, bedrukking en beide blijven varianten van hetzelfde artikel", async () => {
    const scenarios = [
      [{ id: "a", size: "M", quantity: 1, deviation: false, overrides: {} }, { id: "b", size: "L", quantity: 1, deviation: false, overrides: {} }],
      [{ id: "a", size: "M", quantity: 1, deviation: false, overrides: {} }, { id: "b", size: "M", quantity: 1, deviation: true, overrides: { backNumber: "14" } }],
      [{ id: "a", size: "M", quantity: 1, deviation: false, overrides: {} }, { id: "b", size: "L", quantity: 1, deviation: true, overrides: { backNumber: "14" } }],
    ];
    for (const [index, variants] of scenarios.entries()) {
      const order = (await create([{ articleId: "sp-live-137294", variants }], `variant-${index}-008a`)).value;
      assert.equal(order.items.length, 1); assert.equal(order.items[0].quantity, 2); assert.equal(order.items[0].variants.length, 2);
    }
  });

  await context.test("live short ondersteunt uitsluitend de bevestigde shortnummeroptie", async () => {
    await assert.rejects(create([{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: true, overrides: { initials: "DW", name: "", backNumber: "", shortsNumber: "" } }], "short-initials-008a", { initials: "", backNumber: "", shortsNumber: "" }), (error) => error.code === "ARTICLE_PERSONALIZATION_NOT_ALLOWED");
    const number = (await create([{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: true, overrides: { initials: "", name: "", backNumber: "", shortsNumber: "10" } }], "short-number-008a", { initials: "", backNumber: "", shortsNumber: "" })).value;
    assert.match(number.items[0].personalization, /Short 10/);
    await assert.rejects(create([{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: true, overrides: { initials: "DW", name: "", backNumber: "", shortsNumber: "10" } }], "short-both-008a", { initials: "", backNumber: "", shortsNumber: "" }), (error) => error.code === "ARTICLE_PERSONALIZATION_NOT_ALLOWED");
  });

  await context.test("artikel zonder actuele zichtbare bestelbare bedrukoptie blijft buiten de Bedrukken-catalogus", async () => {
    await assert.rejects(
      create([{ articleId: "sp-live-134827", size: "M", quantity: 1, deviation: false, overrides: {} }], "socks-order-008a", { initials: "", name: "", backNumber: "", shortsNumber: "" }),
      (error) => error.code === "ARTICLE_UNAVAILABLE",
    );
  });

  await context.test("letterlijke initialen vervangen de oude semantische naamopbouw", async () => {
    const order = (await create([{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }], "infix-order-008a")).value;
    assert.equal(order.standardPersonalization.initials, "DvdW");
    assert.equal(order.standardPersonalization.initialsSemantic, null);
  });

  await context.test("kassa-overzicht rekent bekende prijzen exact en blokkeert aannames bij ontbrekende prijzen", () => {
    assert.deepEqual(calculateManagedCheckoutTotal([
      { quantity: 2, unitPriceEur: 34.95 },
      { quantity: 2, unitPriceEur: 7.5 },
    ]), { totalEur: 84.9, missingPriceCount: 0 });
    assert.deepEqual(calculateManagedCheckoutTotal([
      { quantity: 1, unitPriceEur: 34.95 },
      { quantity: 1, unitPriceEur: null },
    ]), { totalEur: null, missingPriceCount: 1 });
  });

  await context.test("UI-bron borgt herstelde storevolgorde, exemplaren, prijsgrens en focus", async () => {
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
    assert.match(source, /"Mijn werk"/);
    for (const label of ["In behandeling", "Klaar", "Klant geïnformeerd", "Opgehaald", "Klaar voor productie"]) assert.match(source, new RegExp(label));
    assert.ok(source.indexOf("<h2>Vereniging</h2>") < source.indexOf("<h2>Wat moet erop?</h2>"));
    assert.ok(source.indexOf("<h2>Wat moet erop?</h2>") < source.indexOf("<h2>Artikelen en exemplaren</h2>"));
    for (const phrase of ["Andere vereniging", "Kies eerst een vereniging", "+ Exemplaar", "Leeg = standaardbedrukking", "Levering en afronden", "Totaal voor de kassa", "Prijs ontbreekt", "data-association-search"]) assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(source, /Naam \/ initialen controleren/);
    assert.match(source, /association === activeAssociation/);
    assert.match(source, /beheer\/verenigingen/);
    assert.match(source, /articleFields\(article\)/); assert.match(source, /personalizationPolicy/); assert.match(source, /priceConfiguration/);
    assert.match(source, /render\(\{ preserveScroll: true, focusArticleId:/); assert.match(source, /focus\(\{ preventScroll: true \}\)/);
    assert.match(styles, /sp-exemplar-row/); assert.match(styles, /sp-store-status/); assert.match(styles, /sp-price-total/);
  });
});
