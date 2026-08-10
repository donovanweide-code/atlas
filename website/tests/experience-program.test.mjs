import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  experienceStepDefinitions,
  experienceVersion,
  selectedSummaryItem,
  summaryItems,
} from "../src/experience-store.ts";

function completedSession() {
  return {
    id: "session-test",
    invitationId: "invitation-test",
    phase: "summary",
    currentStep: 1,
    answers: experienceStepDefinitions.map((step, index) => ({ stepId: step.id, answer: `Eigen antwoord ${index + 1}`, submittedAt: `2026-08-03T08:0${index}:00.000Z` })),
    chosenStepId: "attention",
    workspaceOpened: false,
    version: experienceVersion,
    startedAt: "2026-08-03T08:00:00.000Z",
    lastActiveAt: "2026-08-03T08:04:00.000Z",
  };
}

test("bouwt één compacte onderzoekslus op zonder probleem- of technologiedwang", () => {
  assert.deepEqual(experienceStepDefinitions.map(({ id, number }) => [id, number]), [
    ["moment", 1], ["attention", 2],
  ]);
  assert.doesNotMatch(experienceStepDefinitions.map(step => `${step.question} ${step.prompt}`).join(" "), /AI|software|slimmer|analyse/i);
});

test("ieder antwoord krijgt een eerlijke ontvangst en verklaarde overgang", () => {
  for (const step of experienceStepDefinitions) {
    assert.match(step.acknowledgement, /Laten we|Mag ik je/i);
    assert.ok(step.transition.length > 20);
    assert.doesNotMatch(step.acknowledgement, /begrijp|frustrerend|patroon|conclusie/i);
  }
});

test("de spiegel brengt beide eigen bijdragen onvervormd en in volgorde terug", () => {
  const session = completedSession();
  const items = summaryItems(session);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(item => item.answer), ["Eigen antwoord 1", "Eigen antwoord 2"]);
  assert.equal(selectedSummaryItem(session)?.answer, "Eigen antwoord 2");
});

test("borgt transparantie, keuzevrijheid en afwezigheid van formulierenclaims", async () => {
  const source = await readFile(new URL("../src/experience-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Jij houdt de regie/i);
  assert.match(source, /We gebruiken wat je bewust deelt ook om te leren/i);
  assert.match(source, /Dit nemen we mee/);
  assert.match(source, /Dit heb jij vandaag onder woorden gebracht/);
  assert.match(source, /Laat het voor vandaag hierbij/);
  assert.match(source, /Mijn sessie verwijderen/);
  assert.doesNotMatch(source, /Vraag \$\{|progress|dashboard|KPI|ChatGPT|Atlas Engine/);
});
