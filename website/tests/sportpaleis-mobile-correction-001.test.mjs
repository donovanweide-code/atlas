import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Correction-Kevin-2026!", patrick: "Correction-Patrick-2026!", collega: "Correction-Store-2026!", "donovan-support": "Correction-Support-2026!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-mobile-correction-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-MOBILE-CORRECTION-001-20260812", allowedOrigin: "http://127.0.0.1", demoMode: true, uploadsEnabled: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function orderPayload(overrides = {}) {
  return { orderKind: "INDIVIDUAL", customer: "Fictieve correctieklant", customerEmail: "correctie@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "152", quantity: 1, deviation: false, overrides: empty }], ...overrides };
}

test("mobile correction — e-mail en bezorging falen gesloten en bewaren kassafeiten", async (context) => {
  const { service, storeUser } = await fixture(context);
  await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ customerEmail: "donovan@sportpaleis.n" }), "correction-email-invalid"), (error) => error.code === "INVALID_EMAIL");
  await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ deliveryMode: "DELIVERY" }), "correction-address-missing"), (error) => error.code === "VALIDATION_ERROR");
  await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ deliveryMode: "DELIVERY", deliveryAddress: { postalCode: "0000 AA", houseNumber: "1", houseNumberSuffix: "", street: "Teststraat", city: "Almere", lookupStatus: "MANUAL_FALLBACK" } }), "correction-postcode-invalid"), (error) => error.code === "INVALID_POSTAL_CODE");
  const delivered = (await service.createOrder(storeUser.token, storeUser.csrfToken, orderPayload({ deliveryMode: "DELIVERY", deliveryAddress: { postalCode: "1315xc", houseNumber: "1", houseNumberSuffix: "A", street: "Fictieve straat", city: "Almere", lookupStatus: "MANUAL_FALLBACK" } }), "correction-delivery-valid")).value;
  assert.equal(delivered.fulfillment.feeEur, 3.95);
  assert.deepEqual(delivered.fulfillment.address, { postalCode: "1315 XC", houseNumber: "1", houseNumberSuffix: "A", street: "Fictieve straat", city: "Almere", lookupStatus: "MANUAL_FALLBACK" });
  const pickup = await service.updateOrder(storeUser.token, storeUser.csrfToken, delivered.id, { deliveryMode: "PICKUP" }, delivered.revision);
  assert.deepEqual({ mode: pickup.fulfillment.mode, fee: pickup.fulfillment.feeEur, address: pickup.fulfillment.address }, { mode: "PICKUP", fee: 0, address: null });
});

test("mobile correction — operator mag alleen de artikelvolgorde wijzigen", async (context) => {
  const { service, operator } = await fixture(context);
  const article = (await service.bootstrap(operator.token)).articles.find(({ association }) => association === "A.S.C. Waterwijk");
  assert.ok(article);
  const reordered = await service.updateArticle(operator.token, operator.csrfToken, article.id, { expectedRevision: article.revision ?? 1, displayOrder: 7 });
  assert.equal(reordered.displayOrder, 7);
  await assert.rejects(service.updateArticle(operator.token, operator.csrfToken, article.id, { expectedRevision: reordered.revision, name: "Onbevoegde naamwijziging" }), (error) => error.code === "FORBIDDEN");
});

test("mobile correction — beheerlogo is afzonderlijk, geaudit en inhoudsgevalideerd", async (context) => {
  const { service, admin, storeUser } = await fixture(context);
  const association = (await service.bootstrap(admin.token)).associations[0];
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  await assert.rejects(service.updateAssociation(storeUser.token, storeUser.csrfToken, association.id, { expectedRevision: association.revision ?? 1, workspaceLogo: { filename: "logo.png", mimeType: "image/png", dataBase64: png } }), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision ?? 1, workspaceLogo: { filename: "logo.png", mimeType: "image/png", dataBase64: Buffer.from("geen png").toString("base64") } }), (error) => error.code === "ASSOCIATION_LOGO_SIGNATURE_INVALID");
  await service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision ?? 1, workspaceLogo: { filename: "clublogo.png", mimeType: "image/png", dataBase64: png } });
  const saved = (await service.bootstrap(admin.token)).associations.find(({ id }) => id === association.id);
  assert.equal(saved.workspaceLogo.filename, "clublogo.png");
  assert.equal(saved.workspaceLogo.sha256.length, 64);
});

test("mobile correction — zichtbaar contract gebruikt korte rustige flow en mobiele appnavigatie", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../workspace-public/sportpaleis.webmanifest", import.meta.url), "utf8"));
  for (const marker of ["Klant → Vereniging → Bedrukking → Artikelen → Controleren", "data-association-filter", "Vrije opdruk", "+ Voeg exemplaar toe", "Bezorgen (+", "Bezorgkosten", "Bedoelde je", "Nog niet maakbaar", "Bekijk wat nodig is", "data-association-logo-form"]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /sp-association-rail__list/);
  assert.match(source, /inheritBackNumberClass/);
  assert.match(source, /productionAttentionCopy/);
  assert.match(source, /workspaceTerminology/);
  assert.match(source, /const workAudit = state\.audit\.filter/);
  assert.match(source, /ingelogd\|uitgelogd\|login\|sessie/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.sp-mobile-nav \.sp-nav__item\.is-active/);
  assert.match(css, /background:var\(--sp-red\)/);
  assert.equal(manifest.start_url, "/overzicht");
  assert.equal(manifest.scope, "/");
});
