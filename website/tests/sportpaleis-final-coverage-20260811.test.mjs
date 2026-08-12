import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";

const passwords = { kevin: "Coverage-Kevin-2026!", patrick: "Coverage-Patrick-2026!", collega: "Coverage-Store-2026!", "donovan-support": "Coverage-Support-2026!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-final-coverage-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-PRE-PILOT-MASTER-CORRECTION-20260811", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

function orderPayload(overrides = {}) {
  return { orderKind: "INDIVIDUAL", customer: "Coverage klant", customerEmail: "coverage@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "34", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }], ...overrides };
}

test("FINAL COVERAGE — productie-eerst teamregels ondersteunen reeks, losse waarde en herhaling", () => {
  assert.deepEqual(parseTeamProductionLines("1 t/m 3\n34\nnummer 3 twee keer\nDW x 2"), [
    { value: "1", quantity: 1 }, { value: "2", quantity: 1 }, { value: "3", quantity: 1 },
    { value: "34", quantity: 1 }, { value: "3", quantity: 2 }, { value: "DW", quantity: 2 },
  ]);
  assert.throws(() => parseTeamProductionLines("50 t/m 1"), /oplopende reeks/);
  assert.throws(() => parseTeamProductionLines("A x 10"), /maximaal 9/);
});

test("FINAL COVERAGE — admin kan vereniging en verborgen DATA_GAP-artikel veilig toevoegen", async (context) => {
  const { service, admin, store } = await fixture(context);
  const association = await service.createAssociation(admin.token, admin.csrfToken, { name: "Coverage Testclub", sourceName: "Coverage Testclub bron", provenance: "Menselijk ingevoerd tijdens lokale final coverage; technische waarden niet bevestigd" });
  assert.equal(association.juniorValidationStatus, "DATA_GAP");
  assert.equal(association.dimensionsCm.backNumberSenior, null);
  const bootstrap = await service.bootstrap(admin.token);
  const example = bootstrap.articles[0];
  const profile = bootstrap.productionProfiles.find(({ id }) => id !== "profile-none");
  const article = await service.createArticle(admin.token, admin.csrfToken, { name: "Coverage testshirt", articleNumber: "COVERAGE-SKU-001", imageKey: example.imageKey, association: association.name, profileId: profile.id, source: "Handmatige lokale testbron; maten en bedrukking nog niet bevestigd" });
  assert.deepEqual({ active: article.active, status: article.validation.status, association: article.association }, { active: false, status: "DATA_GAP", association: association.name });
  const state = await store.read();
  assert.ok(state.audit.some(({ action, subject }) => action === "Vereniging aangemaakt" && subject === association.name));
  assert.ok(state.audit.some(({ action, subject }) => action === "Artikel aangemaakt" && subject === article.id));
});

test("FINAL COVERAGE — correcties bewaren oud/nieuw en respecteren XPRT-autoriteit", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, orderPayload(), "coverage-correction-order")).value;
  const corrected = await service.updateOrder(operator.token, operator.csrfToken, created.id, { customerPhone: "0687654321", deliveryMode: "DELIVERY", deliveryAddress: { postalCode: "1315 XC", houseNumber: "1", houseNumberSuffix: "", street: "Fictieve straat", city: "Almere", lookupStatus: "MANUAL_FALLBACK" }, correctionReason: "Klant bevestigde bezorging" }, created.revision);
  const details = corrected.eventHistory.at(-1).details;
  assert.equal(details.productionImpact, true);
  assert.ok(details.changes.some(({ field, from, to }) => field === "customerPhone" && from === "0612345678" && to === "0687654321"));
  assert.ok(details.changes.some(({ field, from, to }) => field === "deliveryMode" && from === "PICKUP" && to === "DELIVERY"));
  assert.equal(corrected.fulfillment.feeEur, 3.95);
  assert.equal(corrected.fulfillment.address.postalCode, "1315 XC");

  const xprt = (await service.createOrder(admin.token, admin.csrfToken, orderPayload({ source: "WEBSHOP_XPRT", externalReference: "XPRT-COVERAGE", provenance: "Lokale gestructureerde testimport" }), "coverage-xprt-order")).value;
  await assert.rejects(service.updateOrder(operator.token, operator.csrfToken, xprt.id, { deliveryMode: "DELIVERY" }, xprt.revision), (error) => error.code === "XPRT_TRANSACTIONAL_AUTHORITY");
});

test("FINAL COVERAGE — feedback bewaart rol, vereniging en herkenbare operationele blokkade", async (context) => {
  const { service, operator } = await fixture(context);
  const saved = (await service.saveFeedback(operator.token, operator.csrfToken, { page: "/workspace/sportpaleis/productie", module: "Productie", category: "Operationele blokkade", description: "Fictieve lokale blokkade voor coverage-test", associationContext: "A.S.C. Waterwijk" }, "coverage-feedback")).value;
  assert.deepEqual({ role: saved.userRole, category: saved.category, association: saved.associationContext }, { role: "operator", category: "Operationele blokkade", association: "A.S.C. Waterwijk" });
});
