import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  productionSourceAssociationDecision,
  productionSourceCompatibilityMatrix,
  validateSportpaleisPilotState,
} from "../scripts/sportpaleis-pilot-foundation.mjs";

const SPAIN_ID = "font-5d083befacdf98ae";
const SPAIN_SHA256 = "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585";

function validApplicationRows(state) {
  return productionSourceCompatibilityMatrix(state).filter(({ readiness, profileId }) => readiness === "VALID" && profileId);
}

test("generated BEFORE=VALID associations blijven na echte production-shaped stateprojectie volledig VALID", async () => {
  const canonicalBefore = createSportpaleisProductionBootstrap(new Date("2026-09-01T00:00:00.000Z"));
  const beforeRows = productionSourceCompatibilityMatrix(canonicalBefore).filter(({ readiness }) => readiness === "VALID");
  assert.ok(beforeRows.length >= 10, "de proof moet de actuele profiel-, vector- en artwork-associationruimte genereren, niet één fixture");

  const legacyPersistedState = structuredClone(canonicalBefore);
  const productionProjection = JSON.parse(await readFile(new URL("./fixtures/sportpaleis-production-shaped-source-projection.json", import.meta.url), "utf8"));
  const legacySpainIndex = legacyPersistedState.productionFonts.findIndex(({ id }) => id === SPAIN_ID);
  legacyPersistedState.productionFonts[legacySpainIndex] = structuredClone(productionProjection.productionFont);
  for (const profile of legacyPersistedState.productionProfiles) delete profile.canonicalFontSourceId;

  const migrated = validateSportpaleisPilotState(legacyPersistedState);
  const afterRows = productionSourceCompatibilityMatrix(migrated).filter(({ readiness }) => readiness === "VALID");
  const afterByKey = new Map(afterRows.map((row) => [row.key, row]));
  for (const before of beforeRows) assert.equal(afterByKey.get(before.key)?.readiness, "VALID", `BEFORE=VALID → AFTER=VALID: ${before.key}`);

  const migratedSpain = migrated.productionFonts.find(({ id }) => id === SPAIN_ID);
  assert.deepEqual({ name: migratedSpain.name, familyName: migratedSpain.familyName, postscriptName: migratedSpain.postscriptName, authority: migratedSpain.authority, authoritativeIdentity: migratedSpain.authoritativeIdentity, sha256: migratedSpain.sha256 }, {
    name: "Spain Euro 2016",
    familyName: "Spain Euro 2016",
    postscriptName: "SpainEuro-Regular",
    authority: "HUMAN_PRODUCT_TRUTH",
    authoritativeIdentity: SPAIN_ID,
    sha256: SPAIN_SHA256,
  });
  const buitenboys = afterRows.find(({ association, application }) => association === "SC Buitenboys" && application === "shortsNumber");
  assert.equal(buitenboys?.source?.id, SPAIN_ID);
});

test("generated wrong club/application/type/source/hash matrix blijft volledig fail-closed", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-01T00:00:00.000Z"));
  const validRows = validApplicationRows(state);
  assert.ok(validRows.length >= 10);
  for (const row of validRows) {
    const otherAssociation = state.associations.find(({ id }) => id !== row.associationId);
    const base = { associationId: row.associationId, profileId: row.profileId, applicationField: row.application };
    assert.equal(productionSourceAssociationDecision(state, base).allowed, true, row.key);
    assert.equal(productionSourceAssociationDecision(state, { ...base, associationId: otherAssociation.id }).allowed, false, `wrong club: ${row.key}`);
    assert.equal(productionSourceAssociationDecision(state, { ...base, applicationField: `${row.application}-wrong` }).allowed, false, `wrong application: ${row.key}`);
    const wrongType = row.expectedSourceType === "MANAGED_FONT" ? "PRODUCTION_ELEMENT" : "FONT";
    assert.equal(productionSourceAssociationDecision(state, { ...base, candidate: { kind: wrongType, id: row.source.id } }).allowed, false, `wrong type: ${row.key}`);
    assert.equal(productionSourceAssociationDecision(state, { ...base, candidate: { kind: row.source.kind, id: `${row.source.id}-wrong`, sha256: row.source.sha256 } }).allowed, false, `wrong source: ${row.key}`);
    assert.equal(productionSourceAssociationDecision(state, { ...base, candidate: { ...row.source, version: undefined } }).allowed, false, `missing version: ${row.key}`);
    assert.equal(productionSourceAssociationDecision(state, { ...base, candidate: { ...row.source, version: "WRONG-VERSION" } }).allowed, false, `wrong version: ${row.key}`);
    if (row.source.kind === "FONT") assert.equal(productionSourceAssociationDecision(state, { ...base, candidate: { ...row.source, sha256: "A".repeat(64) } }).allowed, false, `wrong hash: ${row.key}`);
  }
});

test("compatibility matrix bevat actuele associationprofielen plus actieve article/profile/application truth", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-01T00:00:00.000Z"));
  const first = productionSourceCompatibilityMatrix(state);
  const second = productionSourceCompatibilityMatrix(structuredClone(state));
  assert.deepEqual(second, first, "de matrix is deterministisch");
  assert.equal(new Set(first.map(({ key }) => key)).size, first.length, "iedere association/application heeft één identity");
  assert.ok(first.some(({ expectedSourceType }) => expectedSourceType === "MANAGED_FONT"));
  assert.ok(first.some(({ expectedSourceType }) => expectedSourceType === "VECTOR_GLYPH_SET"));
  assert.ok(state.associations.filter(({ active, productionApplications }) => active !== false && productionApplications?.length).every((association) => first.some(({ associationId }) => associationId === association.id)), "iedere actieve toepasselijke verenigingscontext is vertegenwoordigd");
  assert.equal(first.some(({ association }) => association === "Sloeproeien"), false, "no-print context genereert geen kunstmatige source association");
  assert.equal(first.some(({ association }) => association === "Seedorf TDG"), false, "Seedorf projecteert zonder concrete toepassing geen mogelijke personalisaties");
  assert.ok(first.every(({ readiness }) => ["VALID", "BLOCKED"].includes(readiness)));
});

test("configuration bump bewaart beheerdata, custom associations en hun assetcontexten lossless", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-01T00:00:00.000Z"));
  const association = state.associations[0];
  association.defaultFoilColor = "Sentinel Magenta";
  association.customContinuityField = { authority: "HUMAN_ADMIN_EDIT", value: 17 };
  const customAssociation = { ...structuredClone(association), id: "association-custom-sentinel", name: "Custom Sentinel Club", revision: 3 };
  state.associations.push(customAssociation);
  const article = state.articles.find(({ id }) => id === "sp-live-131240");
  article.priceConfiguration = { articleUnitPriceEur: 123.45, personalizationUnitPricesEur: { initials: 6.78 }, sourceLabel: "HUMAN_ADMIN_EDIT" };
  article.availableSizes = ["SENTINEL-SIZE"];
  article.customContinuityField = "ARTICLE-SENTINEL";
  const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
  profile.instruction = "HUMAN CUSTOM INSTRUCTION";
  profile.customContinuityField = "PROFILE-SENTINEL";
  const asset = state.productionElements[0];
  asset.contexts.push({ type: "ASSOCIATION", id: customAssociation.id, label: customAssociation.name });
  state.configurationVersion = "SPW-BEDRUKKING-CONFIGURATION-008";

  const migrated = validateSportpaleisPilotState(state);
  assert.equal(migrated.associations.find(({ id }) => id === association.id).defaultFoilColor, "Sentinel Magenta");
  assert.deepEqual(migrated.associations.find(({ id }) => id === association.id).customContinuityField, association.customContinuityField);
  assert.equal(migrated.associations.find(({ id }) => id === customAssociation.id).name, customAssociation.name);
  assert.ok(migrated.productionElements.find(({ id }) => id === asset.id).contexts.some(({ id }) => id === customAssociation.id));
  const migratedArticle = migrated.articles.find(({ id }) => id === article.id);
  assert.equal(migratedArticle.priceConfiguration.articleUnitPriceEur, 123.45);
  assert.deepEqual(migratedArticle.priceConfiguration.personalizationUnitPricesEur, { initials: 6.78 });
  assert.equal(migratedArticle.priceConfiguration.sourceLabel, "HUMAN_ADMIN_EDIT");
  assert.deepEqual(migratedArticle.availableSizes, article.availableSizes);
  assert.equal(migratedArticle.customContinuityField, "ARTICLE-SENTINEL");
  const migratedProfile = migrated.productionProfiles.find(({ id }) => id === profile.id);
  assert.equal(migratedProfile.instruction, "HUMAN CUSTOM INSTRUCTION");
  assert.equal(migratedProfile.customContinuityField, "PROFILE-SENTINEL");
});
