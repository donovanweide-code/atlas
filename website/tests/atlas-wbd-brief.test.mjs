import test from "node:test";
import assert from "node:assert/strict";
import { focusRecommendation, wbdBrief } from "../src/atlas-wbd-brief.ts";

const emptyAquaFlask = {
  version: 1,
  problem: "",
  nextQuestion: "",
  nextStep: "",
  notes: "",
  lessons: "",
  updatedAt: "",
};

test("Case 0001 bewaart de bevestigde huidige werkelijkheid en bewuste stilte", () => {
  assert.match(wbdBrief.currentReality, /websitebouwer/);
  assert.match(wbdBrief.currentReality, /hoogste prioriteit/);
  assert.match(wbdBrief.silence, /geen bevestigde publieke bewijsset/);
  assert.match(wbdBrief.nextTest, /zestig seconden/);
});

test("het Kompas kiest zonder dagfocus de actieve WBD-prioriteit", () => {
  const recommendation = focusRecommendation([], emptyAquaFlask);
  assert.match(recommendation.title, /We Build And Design/);
  assert.match(recommendation.reason, /AquaFlask wacht terecht/);
  assert.equal(recommendation.kind, "wbd-first-minute");
});

test("bevestigde dagfocus en concrete klantstappen blijven voorgaan", () => {
  const focus = focusRecommendation([
    { id: "focus-1", text: "Controleer de eerste minuut", caseId: "0001", completed: false },
  ], emptyAquaFlask);
  assert.match(focus.title, /Controleer de eerste minuut/);
  assert.equal(focus.kind, "day-focus");

  const aqua = focusRecommendation([], { ...emptyAquaFlask, nextStep: "Bel de beheerder terug." });
  assert.equal(aqua.title, "Begin vandaag met AquaFlask: Bel de beheerder terug.");
  assert.equal(aqua.kind, "aquaflask");
});
