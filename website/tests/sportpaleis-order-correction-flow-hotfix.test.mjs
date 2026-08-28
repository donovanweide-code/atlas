import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Order-Correction-Admin-001!",
  patrick: "Order-Correction-Operator-001!",
  collega: "Order-Correction-Store-001!",
  "donovan-support": "Order-Correction-Support-001!",
};

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-order-correction-hotfix-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", releaseId: "SPW-R2.1-ORDER-CORRECTION-HOTFIX", mailMode: "capture" });
  await service.initialize();
  return {
    store,
    service,
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

const payload = {
  orderKind: "INDIVIDUAL",
  customer: "Oude klantnaam",
  customerEmail: "oud@example.nl",
  customerPhone: "06 12345678",
  standardPersonalization: { initials: "AB", initialsInfix: "", name: "", backNumber: "34", backNumberSizeClass: "SENIOR", chestNumber: "", shortsNumber: "" },
  items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: {} }],
};

test("contact-only correcties behouden vereniging, artikel, bedrukking en productie en auditen oud/nieuw", async (context) => {
  const { service, store, storeUser, operator } = await fixture(context);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, payload, "order-correction-create-0001")).value;
  const beforeCorrection = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  const productionTruth = {
    association: beforeCorrection.association,
    associations: structuredClone(beforeCorrection.associations),
    items: structuredClone(beforeCorrection.items),
    standardPersonalization: structuredClone(beforeCorrection.standardPersonalization),
    productionLines: structuredClone(beforeCorrection.productionLines),
    productionStatus: beforeCorrection.productionStatus,
    stage: beforeCorrection.stage,
  };

  const renamed = await service.updateOrder(operator.token, operator.csrfToken, created.id, { customer: "Nieuwe klantnaam" }, created.revision);
  assert.equal(renamed.customer, "Nieuwe klantnaam");
  assert.equal(renamed.customerEmail, "oud@example.nl");
  assert.equal(renamed.customerPhone, "06 12345678");

  const emailAdded = await service.updateOrder(operator.token, operator.csrfToken, created.id, { customerEmail: "nieuw@example.nl" }, renamed.revision);
  assert.equal(emailAdded.customerEmail, "nieuw@example.nl");
  const emailCleared = await service.updateOrder(operator.token, operator.csrfToken, created.id, { customerEmail: "" }, emailAdded.revision);
  assert.equal(emailCleared.customerEmail, "");

  const reopened = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  for (const [field, value] of Object.entries(productionTruth)) assert.deepEqual(reopened[field], value, `${field} moet ongewijzigd blijven`);
  assert.equal(reopened.customer, "Nieuwe klantnaam");
  assert.equal(reopened.customerEmail, "");
  assert.deepEqual(reopened.items, productionTruth.items);

  const persisted = await store.read();
  const corrections = persisted.audit.filter(({ action, subject }) => action === "Order gewijzigd" && subject === created.id);
  assert.equal(corrections.length, 3);
  assert.ok(corrections.every(({ userId, at, details }) => userId === "patrick" && Boolean(at) && details.contentChanged === false && details.productionImpact === false));
  const chronological = [...corrections].reverse();
  assert.deepEqual(chronological[0].details.changes.map(({ field, from, to }) => ({ field, from, to })), [{ field: "customer", from: "Oude klantnaam", to: "Nieuwe klantnaam" }]);
  assert.deepEqual(chronological[1].details.changes.map(({ field, from, to }) => ({ field, from, to })), [{ field: "customerEmail", from: "oud@example.nl", to: "nieuw@example.nl" }]);
  assert.deepEqual(chronological[2].details.changes.map(({ field, from, to }) => ({ field, from, to })), [{ field: "customerEmail", from: "nieuw@example.nl", to: "" }]);
  assert.ok(reopened.eventHistory.slice(-3).every(({ userId, userName, at, details }) => userId === "patrick" && userName === "Patrick" && Boolean(at) && details.productionImpact === false));
});

test("correctie-UX houdt opslaan bereikbaar, contact compact en e-mail optioneel", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  const newOrder = source.slice(source.indexOf("function newOrder"), source.indexOf("function humanProfileValue"));
  const orderDetail = source.slice(source.indexOf("function orderDetail"), source.indexOf("function production("));

  assert.match(newOrder, /sp-correction-toolbar[^]*Bestaande order geladen[^]*Wijzig alleen wat nodig is[^]*type="submit"[^]*Wijzigingen opslaan/u);
  assert.ok(newOrder.indexOf("sp-correction-toolbar") < newOrder.indexOf("sp-customer-compact"));
  assert.match(orderDetail, /canEditContact = order\.stage === "ORDER"/u);
  assert.match(orderDetail, /<details class="sp-store-edit" open>/u);
  assert.match(orderDetail, /Naam, e-mail of telefoon wijzigen/u);
  assert.match(orderDetail, /Contactgegevens opslaan/u);
  assert.match(orderDetail, /Artikelen en bedrukking blijven ongewijzigd/u);
  const managedCorrection = source.slice(source.indexOf("Bezorgwijze of productiecorrectie"), source.indexOf("button class=\"sp-button sp-button--secondary\">Correctie opslaan", source.indexOf("Bezorgwijze of productiecorrectie")));
  assert.match(managedCorrection, /E-mail \(optioneel\)<input name="customerEmail" type="email" value=/u);
  assert.doesNotMatch(managedCorrection, /name="customerEmail"[^>]*\brequired\b/u);
  assert.match(styles, /\.sp-correction-toolbar \{ position: sticky;[^]*top: calc\(var\(--sp-topbar\) \+ 10px\)/u);
  assert.match(styles, /@media\(max-width:760px\)\{\.sp-correction-toolbar[^]*\.sp-store-edit form\{grid-template-columns:1fr\}/u);
});
