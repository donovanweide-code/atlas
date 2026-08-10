import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  experienceVersion,
  flowRecompositionVersion,
  flowObservationFor,
  flowPromptFor,
} from "../src/experience-store.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

function session(moment, attention = "Een concreet tweede detail dat voldoende grond geeft.") {
  return {
    id: "flow-session",
    invitationId: "flow-invitation",
    phase: "question",
    currentStep: 1,
    answers: [
      { stepId: "moment", answer: moment, submittedAt: "2026-08-03T12:00:00.000Z" },
      { stepId: "attention", answer: attention, submittedAt: "2026-08-03T12:01:00.000Z" },
    ],
    reflections: [],
    workspaceOpened: false,
    version: flowRecompositionVersion,
    startedAt: "2026-08-03T12:00:00.000Z",
    lastActiveAt: "2026-08-03T12:01:00.000Z",
  };
}

test("kiest zonder AI een inhoudelijke vervolgvraag uit het eerste moment", () => {
  assert.match(flowPromptFor(session("Ik zocht de laatste versie in e-mail en Excel.")).question, /Waar stond de informatie/);
  assert.match(flowPromptFor(session("Een collega moest wachten bij de overdracht.")).question, /Wie moest wachten/);
  assert.match(flowPromptFor(session("Een klant belde omdat het antwoord uitbleef.")).question, /Wat merkte de klant/);
  assert.match(flowPromptFor(session("De planning verschoof vlak voor de deadline.")).question, /vlak voordat de planning/);
  assert.match(flowPromptFor(session("Er ging iets onverwachts mis.")).question, /direct vóór/);
});

test("legt twee mogelijke richtingen voor zonder een betekenis vast te leggen", () => {
  for (const text of [
    flowObservationFor(session("De informatie stond in meerdere systemen.")),
    flowObservationFor(session("De overdracht tussen collega's liep vast.")),
    flowObservationFor(session("De klant moest opnieuw bellen.")),
    flowObservationFor(session("De planning schoof iedere middag.")),
  ]) {
    assert.match(text, /Zou het kunnen/);
    assert.match(text, /Of /);
    assert.doesNotMatch(text, /de oorzaak is|dit betekent dat|zeker|altijd/i);
  }
});

test("behoudt 5.0 naast nieuwe Runtime-sessies en houdt 3.0 en 4.0 compatibel", async () => {
  const [php, local] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../scripts/experience-validation-local-server.mjs"),
  ]);
  assert.match(php, /EXPERIENCE_VERSION = '6\.0-runtime-v1'/);
  assert.match(php, /FLOW_RECOMPOSITION_VERSION = '5\.0-flow-recomposition-v1'/);
  assert.match(php, /LIVING_RESEARCH_LOOP_VERSION = '4\.0-living-research-loop-v1'/);
  assert.match(php, /experience_version'\] === FLOW_RECOMPOSITION_VERSION/);
  assert.match(php, /phase = 'insight'/);
  assert.match(local, /session\.version === flowRecompositionVersion/);
  assert.match(local, /session\.phase = "insight"/);
});

test("houdt tempo, eigenaarschap en veilig browser-terug zichtbaar in de interface", async () => {
  const workspace = await read("../src/experience-workspace.ts");
  for (const phrase of [
    "Een mogelijke samenhang",
    "Welke reactie komt het dichtst in de buurt?",
    "Dit komt dichtbij",
    "Ik zie het anders",
    "Kies één spoor dat je nieuwsgierig maakt",
    "Voor nu stoppen",
    "Wil je dit gesprek verlaten?",
  ]) assert.match(workspace, new RegExp(phrase.replace(/[?]/g, "\\?")));
  assert.match(workspace, /window\.history\.pushState\(\{ wbdExperienceGuard: true \}/);
  assert.match(workspace, /data-testid="flow-new-value"/);
  assert.doesNotMatch(workspace, /session\.version === experienceVersion[^\n]+question-origin/);
});
