import assert from "node:assert/strict";
import test from "node:test";

import { buildSportpaleisProductCatalog, querySportpaleisProductCatalog } from "../src/sportpaleis-product-catalog.ts";

function article(id, association, sizes) {
  return { id, active: true, name: `${association} Pride Shirt`, articleNumber: "460001", supplierArticleNumber: "460001", association, category: "Shirts", imageKey: "shirt-navy", availableSizes: sizes, variantLabels: ["Navy"] };
}

test("centrale catalogus groepeert clubreferenties zonder productkopie en stelt maten pas op variantniveau beschikbaar", () => {
  const catalog = buildSportpaleisProductCatalog([article("a-1", "Club A", ["S", "M"]), article("a-2", "Club B", ["L", "XL"])]);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].variants.length, 1);
  assert.deepEqual(catalog[0].variants[0].associationNames.sort(), ["Club A", "Club B"]);
  assert.deepEqual(catalog[0].variants[0].availableSizes, ["S", "M"]);
});

test("unisex blijft één product maar is vindbaar voor heren en dames", () => {
  const catalog = buildSportpaleisProductCatalog([article("a-1", "Club A", ["S", "M", "L"])]);
  const men = querySportpaleisProductCatalog(catalog, { audience: "MEN" });
  const women = querySportpaleisProductCatalog(catalog, { audience: "WOMEN" });
  assert.equal(men.total, 1);
  assert.equal(women.total, 1);
  assert.equal(men.products[0].id, women.products[0].id);
});

test("catalogusquery begrenst elke pagina voor een grote centrale productset", () => {
  const products = Array.from({ length: 5_100 }, (_, index) => ({ id: `p-${index}`, brand: "Merk", model: `Model ${index}`, category: "Shirts", audiences: ["UNISEX"], variants: [{ id: `v-${index}`, colorLabel: "Blauw", imageKey: "shirt-navy", availableSizes: ["S"], sourceArticleId: `a-${index}`, sourceArticleNumber: String(index), associationNames: [] }], sourceAdapterId: "fixture" }));
  const page = querySportpaleisProductCatalog(products, { limit: 12, offset: 4_992 });
  assert.equal(page.products.length, 12);
  assert.equal(page.total, 5_100);
  assert.equal(page.hasMore, true);
});
