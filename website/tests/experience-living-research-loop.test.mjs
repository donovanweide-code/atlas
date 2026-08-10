import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  conversationInsightVersion,
  deriveFirstInsight,
  experienceStepDefinitions,
  experienceVersion,
  flowRecompositionVersion,
  livingResearchLoopVersion,
  stepsForSession,
} from "../src/experience-store.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

function livingSession(answers) {
  return {
    id: "living-session",
    invitationId: "living-invitation",
    phase: "insight",
    currentStep: 1,
    answers: experienceStepDefinitions.map((step, index) => ({
      stepId: step.id,
      answer: answers[index],
      submittedAt: `2026-08-03T20:0${index}:00.000Z`,
    })),
    reflections: [],
    workspaceOpened: false,
    version: flowRecompositionVersion,
    startedAt: "2026-08-03T20:00:00.000Z",
    lastActiveAt: "2026-08-03T20:04:00.000Z",
  };
}

test("maakt vertellen en verhelderen samen één volledige onderzoekslus", () => {
  assert.equal(experienceVersion, "6.0-runtime-v1");
  assert.equal(flowRecompositionVersion, "5.0-flow-recomposition-v1");
  assert.deepEqual(experienceStepDefinitions.map(step => step.label), ["Vertellen", "Verhelderen"]);
  assert.equal(experienceStepDefinitions.length, 2);
  assert.match(experienceStepDefinitions[1].question, /direct vóór/i);
  assert.match(experienceStepDefinitions[1].transition, /mogelijkheid/i);
});

test("behoudt de vorige Living Research Loop voor bestaande 4.0-sessies", () => {
  const previous = stepsForSession({ version: livingResearchLoopVersion });
  assert.equal(previous.length, 2);
  assert.match(previous[1].question, /volgens jou/i);
});

test("behoudt de vier bestaande Conversation & Insight-momenten voor 3.0-sessies", () => {
  const previous = stepsForSession({ version: conversationInsightVersion });
  assert.equal(previous.length, 4);
  assert.deepEqual(previous.map(step => step.id), ["moment", "attention", "energy", "natural"]);
});

test("geeft alleen een herleidbaar en voorzichtig verband terug", () => {
  const grounded = deriveFirstInsight(livingSession([
    "Een offerte bleef liggen terwijl verkoop op de planning wachtte.",
    "De benodigde informatie stond verspreid en niemand wist welke versie actueel was.",
  ]));
  assert.equal(grounded.hasEvidence, true);
  assert.equal(grounded.evidence.length, 2);
  assert.match(grounded.explanation, /Zou het kunnen|Ik weet niet of/i);
  assert.match(grounded.explanation, /\?/);

  const insufficient = deriveFirstInsight(livingSession(["Druk.", "Weet ik nog niet."]));
  assert.equal(insufficient.hasEvidence, false);
  assert.match(insufficient.explanation, /geen zorgvuldige verbinding/i);
});

test("maakt herkomst, correctie, landing en stoppen zichtbaar zonder nieuw scherm", async () => {
  const workspace = await read("../src/experience-workspace.ts");
  assert.match(workspace, /Deze vraag komt voort uit wat je net vertelde/);
  assert.match(workspace, /We hebben nog niet genoeg om hier zorgvuldig op voort te bouwen/);
  for (const choice of ["Herken ik", "Gedeeltelijk", "Nog niet", "Ik zie het anders"]) {
    assert.match(workspace, new RegExp(choice));
  }
  assert.match(workspace, /data-followup-topic="other"/);
  assert.match(workspace, /Een rustig landingsmoment/);
  assert.match(workspace, /Hier verder naar kijken/);
  assert.match(workspace, /Dit voor nu laten rusten/);
  assert.match(workspace, /Voor vandaag stoppen/);
  assert.doesNotMatch(workspace, /In vier korte momenten/i);
});

test("gebruikt de bestaande opslag en ondersteunt beide inzichtversies zonder migratie", async () => {
  const [api, localServer, migrations] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../scripts/experience-validation-local-server.mjs"),
    read("../experience-server/private/migrations/003-conversation-insight.sql"),
  ]);
  assert.match(api, /LIVING_STEP_IDS = \['moment', 'attention'\]/);
  assert.match(api, /supports_insight_version/);
  assert.match(localServer, /stepsForVersion/);
  assert.match(localServer, /supportsInsight/);
  assert.match(migrations, /experience_reflections/);
});

test("verbetert alleen leesbaarheid, focus en rustige interactie", async () => {
  const css = await read("../src/styles/experience-workspace.css");
  assert.match(css, /experience-answer-label/);
  assert.match(css, /experience-question__origin/);
  assert.match(css, /caret-color: var\(--experience-gold\)/);
  assert.match(css, /textarea:focus[^\n]+outline: 2px solid var\(--wbd-focus-color\)/);
  assert.match(css, /textarea:focus[^\n]+box-shadow: 0 0 0 4px/);
  assert.match(css, /textarea::placeholder[^\n]+#91a49b/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /confetti|sparkle|glow-animation/i);
});
