import test from "node:test";
import assert from "node:assert/strict";
import { aquaFlaskProfile } from "../src/atlas-aquaflask-profile.ts";

test("het AquaFlask-profiel bewaart de bevestigde product- en incidentfeiten", () => {
  const known = aquaFlaskProfile.durableKnowledge.join(" ");
  const risks = aquaFlaskProfile.risks.map((risk) => `${risk.title} ${risk.meaning}`).join(" ");
  assert.match(known, /WordPress en WooCommerce/);
  assert.match(known, /190 producten/);
  assert.match(known, /momentopname/);
  assert.match(risks, /1\.680 mislukte Action Scheduler-acties/);
  assert.match(aquaFlaskProfile.currentCase.title, /oorspronkelijke fout blijft open/);
});

test("de aanbeveling vraagt om bewijs en kiest nog geen oplossing", () => {
  assert.equal(aquaFlaskProfile.recommendation.title, "Wacht op een concrete herhaling.");
  assert.deepEqual(aquaFlaskProfile.recommendation.capture, ["tijdstip", "account of rol", "producttype", "gevolgde stappen", "volledige foutmelding"]);
  assert.doesNotMatch(JSON.stringify(aquaFlaskProfile), /oplossing is|update nu|oorzaak is/i);
});

test("onbekende merk- en incidentinformatie blijft expliciet onbekend", () => {
  const unknowns = aquaFlaskProfile.unknowns.join(" ");
  assert.match(unknowns, /exacte oorspronkelijke foutmelding/);
  assert.match(unknowns, /merkidentiteit/);
  assert.match(unknowns, /tone of voice/);
  assert.match(unknowns, /doelgroep/);
});
