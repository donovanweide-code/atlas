import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { focusRecommendation } from "../src/atlas-case-guidance.ts";
import { parseCaseSnapshot } from "../src/atlas-case-snapshot.ts";

const snapshotRaw = readFileSync(
  new URL("../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json", import.meta.url),
  "utf8",
);
const confirmedCase0001 = parseCaseSnapshot(snapshotRaw);
const unavailableCase0001 = { state: "unavailable", reason: "missing" };
const emptyAquaFlask = {
  version: 1,
  problem: "",
  nextQuestion: "",
  nextStep: "",
  notes: "",
  lessons: "",
  updatedAt: "",
};

test("het Kompas gebruikt zonder dagfocus uitsluitend het bevestigde Case 0001-beeld", () => {
  const recommendation = focusRecommendation([], emptyAquaFlask, confirmedCase0001);
  assert.equal(recommendation.kind, "wbd-snapshot");
  assert.match(recommendation.title, /previewroute wacht op GO/);
  assert.match(recommendation.reason, /geïsoleerd en controleerbaar/);
  assert.match(recommendation.prepared, /geen hostingwijziging/);
});

test("een ontbrekend bevestigd casebeeld geeft geen oude inhoudelijke fallback", () => {
  const recommendation = focusRecommendation([], emptyAquaFlask, unavailableCase0001);
  assert.equal(recommendation.kind, "wbd-unavailable");
  assert.equal(recommendation.title, "Actueel casebeeld vraagt herbevestiging.");
  assert.match(recommendation.reason, /voorlopig geen richting/);
  assert.doesNotMatch(recommendation.title + recommendation.reason + recommendation.prepared, /zestig seconden|publieke minuut/i);
});

test("bevestigde dagfocus en concrete AquaFlask-stappen blijven onveranderd voorgaan", () => {
  const focus = focusRecommendation([
    { id: "focus-1", text: "Controleer de eerste minuut", caseId: "0001", completed: false },
  ], emptyAquaFlask, confirmedCase0001);
  assert.match(focus.title, /Controleer de eerste minuut/);
  assert.equal(focus.kind, "day-focus");

  const aqua = focusRecommendation(
    [],
    { ...emptyAquaFlask, nextStep: "Bel de beheerder terug." },
    confirmedCase0001,
  );
  assert.equal(aqua.title, "Begin vandaag met AquaFlask: Bel de beheerder terug.");
  assert.equal(aqua.kind, "aquaflask");
});
