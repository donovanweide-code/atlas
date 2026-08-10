import test from "node:test";
import assert from "node:assert/strict";
import { ARTICLE_CATEGORY } from "../src/sportpaleis/article.ts";
import { sportpaleisDemoArticles } from "../src/sportpaleis/demo-articles.ts";
import { sportpaleisDemoOrders } from "../src/sportpaleis/demo-orders.ts";

test("de demo-artikelen hebben een geldige uniforme basisstructuur", () => {
  const validCategories = new Set(Object.values(ARTICLE_CATEGORY));

  for (const article of sportpaleisDemoArticles) {
    assert.ok(article.id);
    assert.ok(article.articleNumber);
    assert.ok(article.name);
    assert.ok(validCategories.has(article.category));
    assert.equal(typeof article.active, "boolean");
    assert.ok(Date.parse(article.createdAt));
    assert.ok(Date.parse(article.updatedAt));
    assert.ok(Date.parse(article.updatedAt) >= Date.parse(article.createdAt));
  }
});

test("ieder artikel heeft een veilige fictieve afbeeldingreferentie", () => {
  for (const article of sportpaleisDemoArticles) {
    assert.match(article.imageReference, /^demo:\/\/sportpaleis\/articles\//);
  }
});

test("een vereniging is optioneel en twee artikelen delen dezelfde referentie", () => {
  const [shirt, shorts, trainingJacket] = sportpaleisDemoArticles;

  assert.equal(
    shirt.associationReference,
    shorts.associationReference,
  );
  assert.equal("associationReference" in trainingJacket, false);
});

test("shirt, short en trainingsartikel hebben verschillende capabilities", () => {
  const [shirt, shorts, trainingJacket] = sportpaleisDemoArticles;

  assert.deepEqual(shirt.personalizationCapabilities, {
    initials: true,
    backNumber: true,
    shortsNumber: false,
  });
  assert.deepEqual(shorts.personalizationCapabilities, {
    initials: true,
    backNumber: false,
    shortsNumber: true,
  });
  assert.deepEqual(trainingJacket.personalizationCapabilities, {
    initials: true,
    backNumber: false,
    shortsNumber: false,
  });
});

test("artikel-id's en artikelnummers zijn uniek binnen de demo-data", () => {
  const ids = sportpaleisDemoArticles.map(({ id }) => id);
  const articleNumbers = sportpaleisDemoArticles.map(
    ({ articleNumber }) => articleNumber,
  );

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(articleNumbers).size, articleNumbers.length);
});

test("bestaande demo-orders krijgen nog geen artikelen of orderregels", () => {
  for (const order of sportpaleisDemoOrders) {
    assert.equal("items" in order, false);
  }
});
