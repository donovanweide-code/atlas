import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "R20-Admin-2026!", patrick: "R20-Operator-2026!", collega: "R20-Store-2026!", "donovan-support": "R20-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-r20-fulfillment-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-R20-TEST" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { store, service, admin };
}

async function createOrder(service, admin, key) {
  return (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: `R20 ${key}`,
    customerEmail: "",
    customerPhone: "0612345678",
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }],
  }, `r20-create-${key}`)).value;
}

async function forceDone(store, orderId, mode) {
  await store.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === orderId);
    order.stage = "DONE";
    order.fulfillment = { mode, status: "PENDING", updatedAt: null, updatedBy: null, feeEur: mode === "DELIVERY" ? 3.95 : 0, address: mode === "DELIVERY" ? { street: "Teststraat", houseNumber: "1", houseNumberSuffix: "", postalCode: "1315 XC", city: "Almere", lookupStatus: "MANUAL_FALLBACK" } : null };
    order.revision += 1;
    return { state, value: undefined };
  });
}

test("R20 fulfillment transitions delen één centrale invariant voor handmatig, barcode en bezorgen", async (context) => {
  const { store, service, admin } = await fixture(context);

  const pickup = await createOrder(service, admin, "pickup");
  await forceDone(store, pickup.id, "PICKUP");
  let current = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === pickup.id);
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, current.id, { action: "PICKED_UP", expectedRevision: current.revision }, "r20-pickup-too-early"), (error) => error.code === "ORDER_NOT_READY_FOR_PICKUP");
  const ready = (await service.recordOperationalEvent(admin.token, admin.csrfToken, current.id, { action: "READY_FOR_PICKUP", expectedRevision: current.revision }, "r20-pickup-ready")).value;
  const picked = await service.confirmPickup(admin.token, admin.csrfToken, ready.id, {}, ready.revision);
  assert.equal(picked.fulfillment.status, "PICKED_UP");
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, picked.id, { action: "READY_FOR_PICKUP", expectedRevision: picked.revision }, "r20-pickup-rewind"), (error) => error.code === "FULFILLMENT_ALREADY_ADVANCED");

  const delivery = await createOrder(service, admin, "delivery");
  await forceDone(store, delivery.id, "DELIVERY");
  current = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === delivery.id);
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, current.id, { action: "READY_FOR_PICKUP", expectedRevision: current.revision }, "r20-delivery-as-pickup"), (error) => error.code === "FULFILLMENT_MODE_CONFLICT");
  await assert.rejects(service.confirmPickup(admin.token, admin.csrfToken, current.id, {}, current.revision), (error) => error.code === "FULFILLMENT_MODE_CONFLICT");
  const delivered = (await service.recordOperationalEvent(admin.token, admin.csrfToken, current.id, { action: "DELIVERED", expectedRevision: current.revision }, "r20-delivered")).value;
  assert.equal(delivered.fulfillment.status, "DELIVERED");
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, delivered.id, { action: "DELIVERED", expectedRevision: delivered.revision }, "r20-delivered-twice"), (error) => error.code === "FULFILLMENT_ALREADY_ADVANCED");
});

test("R20 Guided Setup gebruikt verenigingscontext en dubbele kernacties zijn verwijderd", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  const today = source.slice(source.indexOf("function winkel("), source.indexOf("function overview("));
  const orders = source.slice(source.indexOf("function orders("), source.indexOf("function activityLabel("));
  const execution = source.slice(source.indexOf("function productionExecution("), source.indexOf("function productionHistory("));

  assert.match(source, /function requestedAssociationContext\(state: PilotBootstrap\)/u);
  assert.match(source, /new URLSearchParams\(location\.search\)\.get\("vereniging"\)/u);
  assert.match(source, /const profiles = associationContext \? state\.productionProfiles\.filter/u);
  assert.match(source, /const requested = requestedAssociationContext\(state\);/u);
  assert.match(source, /sp-guided-route-context/u);

  assert.equal((today.match(/KLAAR OM OP TE HALEN/gu) ?? []).length, 1, "Vandaag toont één afhaalactie");
  assert.doesNotMatch(today, /Klaar om af te halen/u);
  assert.doesNotMatch(orders, /href="\$\{BASE\}\/orders\/nieuw"/u, "Orders gebruikt alleen de volledige ordertypekiezer");
  assert.doesNotMatch(execution, /sp-button--wide[^>]+productie\/historie/u, "Historie staat alleen in de productiecontextnavigatie");

  assert.equal((service.match(/assertFulfillmentTransition\(order,/gu) ?? []).length, 4, "alle drie mutatiepaden gebruiken dezelfde invariant");
});

test("Naambalk blijft een samengestelde NAME + RUGNUMBER-applicatie zonder eigen fysieke maat", async (context) => {
  const { store, service, admin } = await fixture(context);
  assert.deepEqual(SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.componentFields, ["name", "backNumber"]);
  assert.equal(SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.aggregatePhysicalDimensions, null);

  await store.mutate(async (state) => {
    const template = state.articles.find(({ association }) => association === "MHC Lelystad");
    assert.ok(template, "bestaande MHC-productwaarheid is aanwezig");
    state.articles.push({
      ...structuredClone(template),
      id: "fixture-naambalk-composition",
      articleNumber: "FIXTURE-NAAMBALK-COMPOSITION",
      name: "Fixture naam + rugnummer",
      profileId: "profile-mhc-shirt-home",
      supports: ["name", "backNumber"],
      personalizationPolicy: { mode: "combination", fields: { name: "optional", backNumber: "optional" } },
      active: true,
      revision: 1,
    });
    return { state, value: undefined };
  });

  const bootstrap = await service.bootstrap(admin.token);
  const association = bootstrap.associations.find(({ name }) => name === "MHC Lelystad");
  const profile = bootstrap.productionProfiles.find(({ id }) => id === "profile-mhc-shirt-home");
  const order = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Naambalk product truth fixture",
    customerEmail: "",
    customerPhone: "0612345678",
    standardPersonalization: { ...empty, name: "JANSEN", backNumber: "34", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "fixture-naambalk-composition", size: "M", quantity: 1, deviation: false, overrides: empty }],
  }, "r20-naambalk-human-product-truth")).value;

  const components = order.productionLines.filter(({ personalizationField }) => ["name", "backNumber"].includes(personalizationField));
  assert.equal(components.length, 2, "één samengestelde applicatie bewaart exact twee zelfstandige productiecomponenten");
  const name = components.find(({ personalizationField }) => personalizationField === "name");
  const backNumber = components.find(({ personalizationField }) => personalizationField === "backNumber");
  assert.equal(name.heightMm, Number(association.dimensionsCm.nameHeight) * 10, "NAME gebruikt uitsluitend de bestaande naamprofielmaat");
  assert.equal(backNumber.heightMm, profile.backNumberSizeClasses.SENIOR.physicalHeightMm, "RUGNUMBER gebruikt uitsluitend de bestaande Senior-rugnummermaat");
  assert.deepEqual(components.map(({ applicationContext }) => applicationContext.component).sort(), ["NAME", "RUGNUMBER"]);
  assert.ok(components.every(({ applicationContext }) => applicationContext.kind === "NAAMBALK" && applicationContext.semantic === "COMPOSED_APPLICATION"));
  assert.ok(components.every(({ applicationContext }) => applicationContext.aggregatePhysicalDimensions === null));
  assert.ok(components.every((line) => !("naambalkWidthMm" in line) && !("naambalkHeightMm" in line) && !("totalWidthMm" in line) && !("totalHeightMm" in line)));
  assert.notDeepEqual(name.decorationIdentity, backNumber.decorationIdentity, "NAME en RUGNUMBER behouden hun eigen semantische productie-identiteit");
});
