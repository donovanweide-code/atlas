import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Foil-Admin-2026!", patrick: "Foil-Operator-2026!", collega: "Foil-Store-2026!", "donovan-support": "Foil-Support-2026!" };
const originalWhite = { id: "foil-white", color: "Wit", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 327.4 };
const originalRed = { id: "foil-red", color: "Rood", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 0 };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-foil-rolls-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime") });
  await service.initialize();
  return {
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
  };
}

test("canonieke folierollen voegen alleen bewezen fysieke kleuren toe zonder fictieve historie", async (context) => {
  const { service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  assert.deepEqual(state.foilRolls.find(({ id }) => id === "foil-white"), originalWhite);
  assert.deepEqual(state.foilRolls.find(({ id }) => id === "foil-red"), originalRed);
  assert.deepEqual(state.foilRolls.map(({ color }) => color), ["Wit", "Rood", "Blauw", "Zwart", "Groen", "Geel"]);
  for (const color of ["Blauw", "Zwart", "Groen", "Geel"]) {
    const roll = state.foilRolls.find((candidate) => candidate.color === color);
    assert.deepEqual({ supplierType: roll.supplierType, purchasePriceEur: roll.purchasePriceEur, originalLengthM: roll.originalLengthM, widthMm: roll.widthMm, usedLengthMm: roll.usedLengthMm }, { supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null });
  }
});

test("beheerder kan een fysieke rol met onbekende waarden registreren, gebruiken en veilig archiveren", async (context) => {
  const { service, admin, operator } = await fixture(context);
  await assert.rejects(service.createFoilRoll(operator.token, operator.csrfToken, { color: "Pilot testkleur" }), (error) => error.code === "FORBIDDEN");
  const created = await service.createFoilRoll(admin.token, admin.csrfToken, { color: "Pilot testkleur" });
  assert.deepEqual({ color: created.color, supplierType: created.supplierType, purchasePriceEur: created.purchasePriceEur, originalLengthM: created.originalLengthM, widthMm: created.widthMm, usedLengthMm: created.usedLengthMm, active: created.active }, { color: "Pilot testkleur", supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null, active: true });
  await assert.rejects(service.createFoilRoll(admin.token, admin.csrfToken, { color: "pilot TESTKLEUR" }), (error) => error.code === "FOIL_ROLL_EXISTS");
  await assert.rejects(service.updateFoilRoll(admin.token, admin.csrfToken, "foil-white", { active: false }), (error) => error.code === "FOIL_ROLL_PROTECTED");

  let state = await service.bootstrap(admin.token);
  const shirt = state.articles.find(({ id }) => id === "sp-live-137294");
  await assert.rejects(service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: "Niet beheerd" }), (error) => error.code === "ARTICLE_FOIL_COLOR_UNKNOWN");
  const saved = await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: created.color });
  await assert.rejects(service.updateFoilRoll(admin.token, admin.csrfToken, created.id, { active: false }), (error) => error.code === "FOIL_ROLL_IN_USE");
  await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: saved.revision, foilColorOverride: null });
  const archived = await service.updateFoilRoll(admin.token, admin.csrfToken, created.id, { active: false });
  assert.equal(archived.active, false);

  state = await service.bootstrap(admin.token);
  const reopened = state.articles.find(({ id }) => id === shirt.id);
  await assert.rejects(service.updateArticle(admin.token, admin.csrfToken, reopened.id, { expectedRevision: reopened.revision, foilColorOverride: created.color }), (error) => error.code === "ARTICLE_FOIL_COLOR_UNKNOWN");
  const restored = await service.updateFoilRoll(admin.token, admin.csrfToken, created.id, { active: true });
  assert.equal(restored.active, true);
  assert.ok((await service.bootstrap(admin.token)).audit.some(({ action, subject }) => action === "Folierol toegevoegd" && subject === created.id));
});

test("Folie en rollen-UI gebruikt dezelfde beheer- en artikeloverridebron", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /\+ Folierol toevoegen/u);
  assert.match(source, /data-create-roll-form/u);
  assert.match(source, /state!\.foilRolls\.filter\(\(\{ active \}\) => active !== false\)/u);
  assert.doesNotMatch(source, /const managedFoilColors = state!\.associations/u);
});
