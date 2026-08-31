import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { migrateSportpaleisPilotState, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Profile-Truth-Kevin-2026!",
  patrick: "Profile-Truth-Patrick-2026!",
  collega: "Profile-Truth-Store-2026!",
  "donovan-support": "Profile-Truth-Support-2026!",
};

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-profile-truth-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, store, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

test("snijlijnen en fysieke snijoutput zijn optionele bewijslagen en geen universele profielblokkade", async (context) => {
  const { service, admin } = await fixture(context);
  const profile = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-pioneers-shorts");
  assert.equal(profile.validation.cutContour, "DATA_GAP");
  assert.equal(profile.validation.physicalCutOutput, "DATA_GAP");

  const updated = await service.updateProductionProfile(admin.token, admin.csrfToken, profile.id, {
    expectedRevision: profile.revision,
    placement: "Short",
    referenceDistanceCm: 1,
    rotationDeg: 0,
    mirror: false,
    validation: {
      source: "Regression: generieke profielvereisten bevestigd; specifieke snijproef blijft optionele evidence.",
      placement: "VALIDATED",
      referenceDistance: "VALIDATED",
      size: "VALIDATED",
      font: "VALIDATED",
      foilColor: "VALIDATED",
      rotation: "VALIDATED",
      mirror: "VALIDATED",
    },
  });

  assert.equal(updated.validation.status, "VALIDATED");
  assert.equal(updated.validation.cutContour, "DATA_GAP", "historische optionele evidence blijft bewaard");
  assert.equal(updated.validation.physicalCutOutput, "DATA_GAP", "historische optionele evidence blijft bewaard");
});

test("alleen bewezen generieke profielvelden blokkeren en de UI maakt geen nieuwe snijsemantiek verplicht", async () => {
  const serviceSource = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const profileAdminSource = workspaceSource.slice(workspaceSource.indexOf("function profileAdmin"), workspaceSource.indexOf("function foilAdmin"));
  assert.match(serviceSource, /const criticalLabels = \{ size: "fysieke maatvoering", font: "letterprofiel", foilColor: "foliekleur" \}/u);
  assert.doesNotMatch(serviceSource, /const advisoryLabels = \{ placement:/u);
  assert.doesNotMatch(workspaceSource, /<label>Snijlijnen|<label>Fysieke snijoutput/u);
  assert.doesNotMatch(workspaceSource, /data\.get\("validation:(?:cutContour|physicalCutOutput)"\)/u);
  assert.doesNotMatch(profileAdminSource, /name="(?:placement|referenceDistanceCm|rotationDeg|mirror|initialsInfixHorizontalSpacingMm|initialsInfixBaselineOffsetMm)"/u);
  assert.doesNotMatch(profileAdminSource, /profileValidationSelect\("(?:placement|referenceDistance|rotation|mirror|cutContour|physicalCutOutput)"/u);
  assert.match(profileAdminSource, /Spiegeling en veilige rotatie past Workspace automatisch toe/u);
  assert.match(profileAdminSource, /Workspace gebruikt standaard 20 mm/u);
  assert.doesNotMatch(profileAdminSource, /profile\.instruction|name="instruction"|Horizontale tussenruimte|verticale positie|baseline/u);
  assert.doesNotMatch(workspaceSource, /horizontale tussenruimte en verticale positie nog niet bevestigd|fysieke preview en artefact geblokkeerd/u);
  assert.match(workspaceSource, /validation\.font === "DATA_GAP" \? "lettertype\/nummerbron"/u);
  assert.match(workspaceSource, /validation\.size === "DATA_GAP" \? "fysieke maat"/u);
  assert.match(workspaceSource, /validation\.foilColor === "DATA_GAP" \? "foliekleur"/u);
});

test("legacy profielbewijs wordt exact en menselijk gemigreerd zonder custom instructies te overschrijven", async (context) => {
  const { store } = await fixture(context);
  const state = await store.read();
  const generated = state.productionProfiles.find(({ id }) => id === "profile-source-sc-buitenboys-shortsNumber");
  generated.instruction = "Bronconfiguratie bron.xlsx · Blad1!A1. Positie, afstand, contour-/fontoutput, rotatie en spiegeling blijven fail-closed totdat de specifieke route is gevalideerd.";
  generated.validation.source = generated.instruction;
  const custom = state.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  custom.instruction = "Menselijk vastgelegd: gebruik de gecontroleerde Pioneers-bron.";

  const migrated = migrateSportpaleisPilotState(state);
  const migratedGenerated = migrated.productionProfiles.find(({ id }) => id === generated.id);
  const migratedCustom = migrated.productionProfiles.find(({ id }) => id === custom.id);
  assert.doesNotMatch(migratedGenerated.instruction, /fail-closed|contour-\/fontoutput/u);
  assert.doesNotMatch(migratedGenerated.validation.source, /fail-closed|contour-\/fontoutput/u);
  assert.equal(migratedCustom.instruction, custom.instruction);
});

test("verborgen legacy-validaties blokkeren het opslaan van noodzakelijke profielwaarheid niet", async (context) => {
  const { service, store, admin } = await fixture(context);
  await store.mutate(async (state) => {
    const profile = state.productionProfiles.find(({ id }) => id === "profile-source-sc-buitenboys-shortsNumber");
    profile.placement = "Onbevestigd";
    profile.referenceDistanceCm = null;
    profile.rotationDeg = null;
    profile.mirror = null;
    Object.assign(profile.validation, { placement: "VALIDATED", referenceDistance: "VALIDATED", rotation: "VALIDATED", mirror: "VALIDATED" });
    return { state, value: null };
  });
  const profile = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-source-sc-buitenboys-shortsNumber");
  const updated = await service.updateProductionProfile(admin.token, admin.csrfToken, profile.id, {
    expectedRevision: profile.revision,
    sizeLabel: profile.sizeLabel,
    fontProfile: profile.fontProfile,
    foilColor: profile.foilColor,
    validation: { source: "Gerichte regressie: alleen operationeel noodzakelijke waarheid.", size: "VALIDATED", font: "VALIDATED", foilColor: "VALIDATED" },
  });
  assert.equal(updated.validation.status, "VALIDATED");
  assert.equal(updated.placement, "Onbevestigd");
  assert.equal(updated.referenceDistanceCm, null);
  assert.equal(updated.rotationDeg, null);
  assert.equal(updated.mirror, null);
});

test("primaire productie-UX toont Bedrukken en houdt batch en vrij specialistisch werk onder disclosure", async () => {
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const shellSource = workspaceSource.slice(workspaceSource.indexOf("function shell"), workspaceSource.indexOf("function orderCard"));
  assert.match(shellSource, /const orderActions = contexts\.has\("STORE"\) \? nav\(`\$\{BASE\}\/orders\/nieuw`, "Bedrukken", current\) : ""/u);
  assert.doesNotMatch(shellSource, /orders\/eigen-artikel.*Vrije opdruk.*orders\/team/u);
  assert.match(workspaceSource, /<summary>Meer soorten productiewerk<\/summary>/u);
  assert.match(workspaceSource, /Batch-\/teamproductie/u);
  assert.match(workspaceSource, /Vrij specialistisch werk/u);
});

test("Guided Setup benoemt bij afzonderlijke nummerbronnen de exacte profiel- en maatcontext", async () => {
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceSource, /const sourceContext = \[sourceProfile\.name, humanProfileValue\(sourceProfile\.sizeLabel\)\]/u);
  assert.match(workspaceSource, /authoritative SVG-nummerset ontbreekt voor \$\{sourceContext \|\| sourceProfile\.name\}/u);
  assert.match(workspaceSource, /Nog geen actieve bedrukartikelen; richt dit pas in wanneer de vereniging ermee gaat werken\./u);
  assert.match(workspaceSource, /Artikelen zijn bekend; koppel het eerste productieprofiel wanneer bedrukking nodig is\./u);
  assert.doesNotMatch(workspaceSource, /action: `Controleer \$\{missing\.join/u);
  assert.doesNotMatch(workspaceSource, />DATA_GAP · niet fysiek bevestigd</u);
  assert.doesNotMatch(workspaceSource, /value="\$\{esc\(price\?\.sourceLabel \?\? "DATA_GAP:/u);
});

test("Beheer vertaalt interne DATA_GAP-statussen naar concrete menselijke profielvelden", async () => {
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const profileAdminSource = workspaceSource.slice(workspaceSource.indexOf("function profileAdmin"), workspaceSource.indexOf("function foilAdmin"));
  assert.match(workspaceSource, /function humanProfileValue[\s\S]{0,240}\\bDATA_GAP\\b/u);
  assert.match(workspaceSource, /\.replace\(\/\\bDATA_GAP\\b\/giu, "Nog te bevestigen"\)/u);
  assert.match(profileAdminSource, /const sizeValue = humanProfileValue\(profile\.sizeLabel\)/u);
  assert.match(profileAdminSource, /value="\$\{esc\(sizeValue === "Nog instellen" \? "" : sizeValue\)\}"/u);
  assert.doesNotMatch(profileAdminSource, /value="\$\{esc\(humanProfileValue\(profile\.sizeLabel\) === "Nog instellen" \? "" : profile\.sizeLabel\)\}"/u);
});

test("spiegeling en veilige rotatie worden door de uitvoerbron afgeleid en niet per profiel gevraagd", async () => {
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const managedFontSource = await readFile(new URL("../src/sportpaleis/managed-font-production.mjs", import.meta.url), "utf8");
  const productionAssetSource = await readFile(new URL("../src/sportpaleis/production-assets.mjs", import.meta.url), "utf8");
  assert.match(managedFontSource, /productionRule: \{ mirror: true, rotation: productionRotationForRequestedHeightAxis\(requestedHeightAxis\), allowedNestingRotations: \[0, 90\] \}/u);
  assert.match(productionAssetSource, /productionRule: \{ mirror: true, rotation: 0, allowedNestingRotations: \[0, 90\] \}/u);
  assert.match(workspaceSource, /Spiegeling en veilige rotatie worden automatisch toegepast/u);
});

test("legacy tussenruimte en baseline zijn geen menselijke profielvereisten en blokkeren alleen via ontbrekende uitvoerbare compositiebron", async () => {
  const serviceSource = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(serviceSource, /status: existing\?\.heightMm != null \? "SOURCE_CONFIGURED" : "DATA_GAP"/u);
  assert.doesNotMatch(serviceSource, /status: existing\?\.heightMm != null && existing\?\.horizontalSpacingMm/u);
  assert.match(serviceSource, /De samengestelde initialenopmaak heeft nog geen gecontroleerde uitvoerbare productiebron\./u);
  assert.doesNotMatch(serviceSource, /De kleinere maat, horizontale tussenruimte en verticale positie van het tussenvoegsel zijn nog niet bevestigd\./u);
});

test("specifieke Pioneers-snijproef blijft onveranderd als beperkte provenance bestaan", async (context) => {
  const { service, admin } = await fixture(context);
  const profile = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  assert.equal(profile.validation.cutContour, "VALIDATED");
  assert.equal(profile.validation.physicalCutOutput, "VALIDATED");
  assert.deepEqual(profile.validation.validatedScope, [
    "Senior rugnummerhoogte 200 mm",
    "Snijlijnen/cijfercontouren 2, 34 en 77",
    "Fysieke snijtest uitgevoerd en snijlijnen correct bevestigd",
  ]);
});
