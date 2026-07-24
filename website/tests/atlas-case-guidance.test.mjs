import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { focusRecommendation } from "../src/atlas-case-guidance.ts";
import { parseCaseSnapshot } from "../src/atlas-case-snapshot.ts";

const snapshotRaw = readFileSync(
  new URL("../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json", import.meta.url),
  "utf8",
);
const confirmedSnapshot = JSON.parse(snapshotRaw);
confirmedSnapshot.lifecycleStatus = "confirmed";
confirmedSnapshot.confirmationMode = "editorially-confirmed";
confirmedSnapshot.confirmedBy = "donovan";
confirmedSnapshot.lastConfirmedAt = "2026-07-24";
confirmedSnapshot.lastConfirmedAtPrecision = "day";

const confirmedCase0001 = parseCaseSnapshot(JSON.stringify(confirmedSnapshot));
const candidateCase0001 = parseCaseSnapshot(snapshotRaw);
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
  assert.match(recommendation.title, /publieke bron, casecontext en casebeeld/);
  assert.match(recommendation.reason, /preview bewijst de nieuwe publieke richting/);
  assert.match(recommendation.prepared, /revision 2/);
});

test("de actuele Candidate geeft dezelfde neutrale veiligheidsgrens", () => {
  const recommendation = focusRecommendation([], emptyAquaFlask, candidateCase0001);
  assert.equal(recommendation.kind, "wbd-unavailable");
  assert.equal(recommendation.title, "Actueel casebeeld vraagt herbevestiging.");
  assert.match(recommendation.reason, /voorlopig geen richting/);
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
