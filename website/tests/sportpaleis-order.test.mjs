import test from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_SOURCE,
  ORDER_STATUS,
} from "../src/sportpaleis/order.ts";
import { sportpaleisDemoOrders } from "../src/sportpaleis/demo-orders.ts";

test("het Order-model ondersteunt de afgesproken bronnen en statussen", () => {
  assert.deepEqual(Object.values(ORDER_SOURCE), ["Winkel", "Webshop"]);
  assert.deepEqual(Object.values(ORDER_STATUS), [
    "Nieuw",
    "Te controleren",
    "In productie",
    "Gereed",
    "Afgesloten",
  ]);
});

test("de demo bewijst dat winkel en webshop hetzelfde ordermodel gebruiken", () => {
  assert.equal(sportpaleisDemoOrders.length, 2);
  assert.deepEqual(
    sportpaleisDemoOrders.map(({ source }) => source),
    [ORDER_SOURCE.STORE, ORDER_SOURCE.WEBSHOP],
  );

  for (const order of sportpaleisDemoOrders) {
    assert.ok(order.internalOrderNumber);
    assert.ok(order.customerName);
    assert.ok(order.association);
    assert.ok(order.status);
    assert.ok(order.source);
    assert.ok(Date.parse(order.createdAt));
    assert.ok(Date.parse(order.updatedAt));
    assert.ok(Date.parse(order.updatedAt) >= Date.parse(order.createdAt));
  }
});

test("een extern ordernummer is optioneel en onafhankelijk van het interne nummer", () => {
  const [storeOrder, webshopOrder] = sportpaleisDemoOrders;

  assert.equal("externalOrderNumber" in storeOrder, false);
  assert.equal(webshopOrder.externalOrderNumber, "WEB-EMAIL-1042");
  assert.notEqual(
    webshopOrder.externalOrderNumber,
    webshopOrder.internalOrderNumber,
  );
});

test("uitgestelde domeinen zijn niet speculatief ingevuld", () => {
  const deferredFields = [
    "customer",
    "items",
    "personalization",
    "communication",
    "sourceMetadata",
  ];

  for (const order of sportpaleisDemoOrders) {
    for (const field of deferredFields) {
      assert.equal(field in order, false);
    }
  }
});
