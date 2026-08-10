import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveFirstInsight,
  conversationInsightVersion,
  stepsForSession,
} from "../src/experience-store.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

function conversationSession(answers) {
  const definitions = stepsForSession({ version: conversationInsightVersion });
  return {
    id: "conversation-session",
    invitationId: "conversation-invitation",
    phase: "insight",
    currentStep: 3,
    answers: definitions.map((step, index) => ({
      stepId: step.id,
      answer: answers[index],
      submittedAt: `2026-08-03T09:0${index}:00.000Z`,
    })),
    reflections: [],
    workspaceOpened: false,
    version: conversationInsightVersion,
    startedAt: "2026-08-03T09:00:00.000Z",
    lastActiveAt: "2026-08-03T09:05:00.000Z",
  };
}

test("onderzoekt gebeurtenis, oorzaak, intern gevolg en externe impact zonder antwoord voor te schrijven", () => {
  const definitions = stepsForSession({ version: conversationInsightVersion });
  assert.deepEqual(definitions.map(step => step.summaryLabel), [
    "De situatie",
    "Wat mogelijk meespeelde",
    "Het interne gevolg",
    "De externe impact",
  ]);
  const allText = definitions.map(step => `${step.question} ${step.prompt} ${step.examples}`).join(" ");
  for (const memoryAid of ["e-mail", "Excel", "papier", "meerdere systemen", "collega", "leverancier", "klant"]) {
    assert.match(allText, new RegExp(memoryAid, "i"));
  }
  assert.match(definitions[2].question, /binnen je organisatie/i);
  assert.match(definitions[3].question, /buiten je organisatie/i);
});

test("geeft alleen bij voldoende antwoordbewijs een voorzichtig eerste inzicht", () => {
  const sufficient = conversationSession([
    "Een klantorder bleef liggen omdat de overdracht niet duidelijk was.",
    "De informatie stond verdeeld over e-mail, Excel en twee interne systemen.",
    "Mijn collega moest alles opnieuw controleren en de planning aanpassen.",
    "De klant kreeg later antwoord en moest dezelfde informatie opnieuw geven.",
  ]);
  const insight = deriveFirstInsight(sufficient);
  assert.equal(insight.hasEvidence, true);
  assert.equal(insight.evidence.length, 4);
  assert.match(insight.explanation, /nog geen conclusie/i);
  assert.doesNotMatch(insight.explanation, /zeker|altijd|oorzaak is/i);

  const insufficient = deriveFirstInsight(conversationSession([
    "Druk.",
    "Weet ik nog niet.",
    "Alleen ik.",
    "Niemand.",
  ]));
  assert.equal(insufficient.hasEvidence, false);
  assert.match(insufficient.headline, /niet genoeg/i);
  assert.match(insufficient.explanation, /vullen we niets/i);
});

test("maakt herkenning en iedere vrijwillige verdieping herleidbaar naar eerdere woorden", async () => {
  const workspace = await read("../src/experience-workspace.ts");
  for (const choice of [
    "Waarom viel dit op?",
    "Welke uitspraken brachten jullie hierbij?",
    "Wat kan dit betekenen voor klanten of leveranciers?",
    "Wat kan dit betekenen voor collega’s?",
    "Waar zou dit kunnen beginnen?",
    "Ik wil een ander onderwerp onderzoeken",
    "Voor vandaag is dit genoeg",
  ]) assert.match(workspace, new RegExp(choice.replace(/[?]/g, "\\?")));
  assert.match(workspace, /Herken je dit\?/);
  assert.match(workspace, /Deze vraag komt hier vandaan/);
  assert.match(workspace, /answerFor\(session, "natural"\)/);
  assert.match(workspace, /answerFor\(session, "energy"\)/);
  assert.match(workspace, /answerFor\(session, "attention"\)/);
});

test("legt herkenning en verdieping centraal, afzonderlijk en observeerbaar vast", async () => {
  const [api, schema, migration, client, observatory] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../experience-server/private/schema.sql"),
    read("../experience-server/private/migrations/003-conversation-insight.sql"),
    read("../src/experience-validation-api.ts"),
    read("../src/experience-observatory.ts"),
  ]);
  assert.match(schema, /CREATE TABLE experience_reflections/);
  assert.match(schema, /UNIQUE KEY uq_experience_reflection_topic \(session_id, topic\)/);
  assert.match(migration, /ADD COLUMN insight_recognition/);
  for (const route of ["participant/insight/recognition", "participant/insight/explore", "participant/insight/finish"]) {
    assert.match(api, new RegExp(route));
  }
  for (const event of ["insight_recognized", "insight_explored", "insight_reflection_saved", "insight_exploration_finished"]) {
    assert.match(api, new RegExp(event));
    assert.match(observatory, new RegExp(event));
  }
  assert.match(client, /recognizeInsight/);
  assert.match(client, /exploreInsight/);
});

test("maakt de werkwijze en mogelijke digitale oplossingen van We Build And Design concreet", async () => {
  const workspace = await read("../src/experience-workspace.ts");
  assert.match(workspace, /Eerst begrijpen\. Daarna pas ontwerpen en bouwen\./);
  for (const solution of ["website", "webshop", "procesverbetering", "intern systeem", "maatwerksoftware"]) {
    assert.match(workspace, new RegExp(solution, "i"));
  }
  assert.match(workspace, /waar je morgen iets aan hebt/i);
  assert.match(workspace, /https:\/\/webuildanddesign\.nl\/contact/);
  assert.doesNotMatch(workspace, /AI-demo|chatbot|intakeformulier|koop nu|plan direct/i);
});

test("beperkt de visuele verandering tot focus, tikgebieden, rustige overgang en leesbaarheid", async () => {
  const [css, workspace, privacy] = await Promise.all([
    read("../src/styles/experience-workspace.css"),
    read("../src/experience-workspace.ts"),
    read("../src/experience-privacy.ts"),
  ]);
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /experience-reveal 260ms ease-out/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /experience-exploration-detail textarea:focus/);
  assert.match(css, /experience-brand__mark > i/);
  assert.match(css, /\.experience-button,\.experience-recognition button[^\n]+min-height: 2\.75rem/);
  assert.match(css, /background: rgba\(199,161,102,\.055\)/);
  assert.match(workspace, /<span>W<\/span><i><\/i><span>BD<\/span>/);
  assert.match(privacy, /<span>W<\/span><i><\/i><span>BD<\/span>/);
  assert.match(workspace, /Iedere gedachte is een mogelijkheid, nooit een conclusie/);
});
