import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SPORTPALEIS_ASSOCIATIONS,
  SPORTPALEIS_FONT_ASSET_INVENTORY,
  SPORTPALEIS_FONT_CONFIRMATION,
} from "../config/sportpaleis-bedrukking-configuration.mjs";
import {
  createSportpaleisProductionBootstrap,
  migrateSportpaleisPilotState,
} from "../scripts/sportpaleis-pilot-foundation.mjs";

const byAssociation = Object.fromEntries(SPORTPALEIS_ASSOCIATIONS.map((association) => [association.name, association]));

test("human-confirmed verenigingfonts zijn canoniek vastgelegd zonder assetclaims", () => {
  const expected = {
    "Almere'81": "Myriad Pro Italic",
    "Almere Pioneers": "FFF englisch",
    "As,8o": "Spain",
    "A.S.C. Waterwijk": "Schluber",
    Brouwersports: "Schluber",
    "Buitenhout MHC": "Myriad Pro Bold",
    DCG: "Schluber",
    EKVA: "Schluber",
    "FC Almere": "Schluber",
    "FC Huizen": "Spain",
    "MHC Lelystad": "Myriad Pro Bold",
    Najaden: "Schluber",
    "SC Buitenboys": "Schluber",
    "SC Geinburgia": "Spain",
    "Sporting Almere": "Spain",
    "VVA / Spartaan": "Schluber",
    Wooter: "Spain",
    Hasselbaink: "Spain",
  };
  for (const [association, font] of Object.entries(expected)) {
    assert.equal(byAssociation[association].fontProfile, font, association);
    assert.equal(byAssociation[association].fontEvidence.confirmationStatus, "MATCH", association);
    assert.equal(byAssociation[association].fontEvidence.assetStatus, font === "Spain" ? "HUMAN_PRODUCT_TRUTH_CONFIRMED" : "PRODUCTION_EXECUTABLE", association);
    assert.equal(Boolean(byAssociation[association].fontEvidence.assetId), font !== "Spain", association);
  }
  assert.equal(byAssociation.Sloeproeien.fontProfile, "Niet van toepassing");
  assert.equal(byAssociation.Sloeproeien.fontEvidence.confirmationStatus, "NOT_APPLICABLE");
  assert.equal(byAssociation.HBSA.fontProfile, "Niet van toepassing");
  assert.equal(byAssociation.HBSA.fontEvidence.confirmationStatus, "NOT_APPLICABLE");
  assert.equal(byAssociation.HBSA.fontEvidence.applied, false);
  assert.match(byAssociation.HBSA.fontEvidence.reason, /FSA.*HBSA/u);
  assert.equal(byAssociation["SC Buitenboys"].fontEvidence.exception, "Shortnummer gebruikt Spain Euro 2016 / SpainEuro-Regular");
});

test("vectorverwijzingen worden niet als fontbestand gepromoveerd", () => {
  assert.equal(SPORTPALEIS_FONT_ASSET_INVENTORY.length, 6);
  for (const font of SPORTPALEIS_FONT_ASSET_INVENTORY) {
    const expectedStatus = font.canonicalName === "Spain" ? "HUMAN_PRODUCT_TRUTH_CONFIRMED" : font.canonicalName === "Viking-Normal" ? "ADMISSION_REJECTED" : "PRODUCTION_EXECUTABLE";
    assert.equal(font.fontAssetStatus, expectedStatus, font.canonicalName);
    assert.equal(Boolean(font.registeredFontAssetId), expectedStatus === "PRODUCTION_EXECUTABLE", font.canonicalName);
  }
  const spain = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === "Spain");
  assert.equal(spain.referenceAsset.familyName, "Spain Euro 2016");
  assert.equal(spain.referenceAsset.postScriptName, "SpainEuro-Regular");
  assert.equal(spain.referenceAsset.sha256, "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585");
  const pioneers = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === "FFF englisch");
  assert.equal(pioneers.referenceAsset.filename, "Premier League Font 2018.ttf");
  assert.equal(pioneers.referenceAsset.status, "EXACT_IDENTITY_ADMITTED");
  assert.deepEqual(byAssociation["Almere Pioneers"].fontEvidence.vectorReferenceAsset, {
    filename: "Pioneers nummers.ai", format: "AI_VECTOR_REFERENCE",
    sha256: "FB2D8FF0939ACAE08FF4264C02775A317988F21DD09B6CA4F5DF178A1F7A3582", status: "PRESENT_REFERENCE_ONLY",
  });
  const myriadBold = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === "Myriad Pro Bold");
  assert.equal(myriadBold.referenceAsset.sha256, "B91EEF2AED805A9E5294AF9C43A751EC911FEF2B2090E30F0066B23493199E07");
  assert.equal(byAssociation["Buitenhout MHC"].fontEvidence.vectorReferenceAsset.sha256, "DE29A4CA4B77D429327E2A5758993687DB3A34C57CA3D7951763BD15F4FCF6B8");
});

test("fontmigratie wijzigt alleen aantoonbare fontvelden en houdt productieparameters gelijk", () => {
  const current = createSportpaleisProductionBootstrap(new Date("2026-08-12T12:00:00.000Z"));
  const legacy = structuredClone(current);
  delete legacy.fontConfirmationVersion;
  legacy.associations.find(({ name }) => name === "A.S.C. Waterwijk").fontProfile = "schluber (spain = thuis wedstrijdshirt/short)";
  legacy.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt").fontProfile = "FFF englisch · Pioneers cijfercontouren";
  const beforeAssociation = structuredClone(legacy.associations.find(({ name }) => name === "A.S.C. Waterwijk"));
  const beforeProfile = structuredClone(legacy.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt"));

  const migrated = migrateSportpaleisPilotState(legacy);
  const association = migrated.associations.find(({ name }) => name === "A.S.C. Waterwijk");
  const profile = migrated.productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
  assert.equal(migrated.fontConfirmationVersion, SPORTPALEIS_FONT_CONFIRMATION.id);
  assert.equal(association.fontProfile, "Schluber");
  assert.deepEqual(association.dimensionsCm, beforeAssociation.dimensionsCm);
  assert.deepEqual(association.foilColors, beforeAssociation.foilColors);
  assert.equal(profile.fontProfile, "FFF englisch");
  assert.equal(profile.sizeLabel, beforeProfile.sizeLabel);
  assert.equal(profile.foilColor, beforeProfile.foilColor);
  assert.deepEqual(profile.backNumberSizeClasses, beforeProfile.backNumberSizeClasses);
  assert.equal(profile.productionSourceSetId, beforeProfile.productionSourceSetId);
  assert.equal(profile.outputWriterId, beforeProfile.outputWriterId);
});

test("legacy Pioneers-weergavenaam wordt centraal genormaliseerd zonder immutable jobhistorie te herschrijven", () => {
  const legacy = createSportpaleisProductionBootstrap(new Date("2026-08-12T12:00:00.000Z"));
  legacy.configurationVersion = "SPW-CONFIG-BEDRUKKING-006-20260812";
  legacy.associations.find(({ id }) => id === "association-03").name = "Almerer Pioneers";
  legacy.articles.find(({ association }) => association === "Almere Pioneers").association = "Almerer Pioneers";
  legacy.orders.push({
    id: "SP-LEGACY-PIONEERS",
    revision: 1,
    customer: "Legacy Pioneers",
    customerEmail: "",
    customerPhone: "",
    association: "Almerer Pioneers",
    associations: ["Almerer Pioneers"],
    createdAt: "2026-08-12T12:00:00.000Z",
    updatedAt: "2026-08-12T12:00:00.000Z",
    stage: "ORDER",
    owner: "Patrick",
    totalPieces: 1,
    standardPersonalization: { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null },
    items: [{ product: "Legacy shirt", association: "Almerer Pioneers", quantity: 1 }],
  });
  legacy.productionElements.push({ id: "legacy-pioneers-asset", ownerName: "Almerer Pioneers", contexts: [{ type: "ASSOCIATION", id: "association-03", label: "Almerer Pioneers" }] });
  const historicalJob = legacy.productionJobs.find(({ snapshot }) => snapshot?.association === "Almere Pioneers");
  historicalJob.snapshot.association = "Almerer Pioneers";

  const migrated = migrateSportpaleisPilotState(legacy);
  const order = migrated.orders.find(({ id }) => id === "SP-LEGACY-PIONEERS");
  const element = migrated.productionElements.find(({ id }) => id === "legacy-pioneers-asset");
  assert.equal(migrated.associations.find(({ id }) => id === "association-03").name, "Almere Pioneers");
  assert.equal(migrated.articles.find(({ id }) => id === legacy.articles.find(({ association }) => association === "Almerer Pioneers").id).association, "Almere Pioneers");
  assert.equal(order.association, "Almere Pioneers");
  assert.deepEqual(order.associations, ["Almere Pioneers"]);
  assert.equal(order.items[0].association, "Almere Pioneers");
  assert.equal(element.ownerName, "Almere Pioneers");
  assert.equal(element.contexts[0].label, "Almere Pioneers");
  assert.equal(migrated.productionJobs.find(({ id }) => id === historicalJob.id).snapshot.association, "Almerer Pioneers", "immutable productiehistorie behoudt de destijds vastgelegde snapshot");
});

test("alle hashbewezen canonieke fontmasters zijn lokaal geregistreerd", async () => {
  const liberation = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const spain = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/Spain%20Euro%202016.ttf", import.meta.url));
  assert.equal(liberation.byteLength, 139512);
  assert.equal(spain.byteLength, 15232);
  const state = createSportpaleisProductionBootstrap();
  assert.deepEqual(state.productionFonts.map(({ name, sha256 }) => ({ name, sha256 })).sort((left, right) => left.name.localeCompare(right.name)), [
    { name: "Liberation Sans Regular", sha256: "F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F" },
    { name: "Spain Euro 2016", sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585" },
    { name: "Myriad Pro Italic", sha256: "E952ADA73367D7223B57EE60B764DBAF75FA8A7F5D72D7CB9E139EDD9E6D6814" },
    { name: "Schluber", sha256: "985B2931E85CEC60F0D661E7F9FF05CE32C959C41D4E2116E22A1ADA129C03BF" },
    { name: "Myriad Pro Bold", sha256: "B91EEF2AED805A9E5294AF9C43A751EC911FEF2B2090E30F0066B23493199E07" },
    { name: "FFF English Premier League", sha256: "0F330CF7AA7DD6C6ADC5FC49DE9028A8AE265CAC469E8C34E91C1B4E5B0014B7" },
  ].sort((left, right) => left.name.localeCompare(right.name)));
  assert.ok(!SPORTPALEIS_FONT_ASSET_INVENTORY.some(({ canonicalName }) => canonicalName === "Liberation Sans Regular"));
});
