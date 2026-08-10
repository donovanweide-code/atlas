import assert from "node:assert/strict";
import test from "node:test";

import {
  atlasRuntimeArchitectureVersion,
  atlasRuntimeExperienceVersion,
  createInitialRuntime,
  resumeRuntime,
  transitionRuntime,
} from "../src/atlas-runtime.ts";

function contribute(view, content, index, actorId = "participant-1") {
  return transitionRuntime(view.field, {
    id: `event-${index}`,
    type: "contribution",
    inquiryId: view.field.sessionId,
    actorId,
    content,
    observedAt: `2026-08-04T10:${String(index).padStart(2, "0")}:00.000Z`,
    receivedAt: `2026-08-04T10:${String(index).padStart(2, "0")}:01.000Z`,
    baseRevision: view.field.revision,
  });
}

test("initialiseert een begrensd onderzoek zonder vooraf ingevulde kennis", () => {
  const view = createInitialRuntime("session-1", "participant-1", "2026-08-04T10:00:00.000Z");

  assert.equal(atlasRuntimeExperienceVersion, "6.0-runtime-v1");
  assert.equal(view.field.architectureVersion, atlasRuntimeArchitectureVersion);
  assert.equal(view.field.revision, 0);
  assert.deepEqual(view.field.worldKnowledge, []);
  assert.equal(view.field.inquiryFrame.mandate, "research-with-participant");
  assert.equal(view.decision.movement, "free-telling");
  assert.equal(view.decision.canStop, true);
  assert.ok(view.decision.foundationRefs.includes("RA-02"));
});

test("vormt na twee werkelijkheidscontacten een voorlopige hypothese en toetst een grens", () => {
  let view = createInitialRuntime("session-2", "participant-1", "2026-08-04T10:00:00.000Z");
  const first = contribute(view, "Tijdens de overdracht bleef mijn collega wachten op de laatste planning.", 1);
  view = { field: first.field, decision: first.decision };
  const second = contribute(view, "Daarna belde de klant opnieuw; een bevestiging was nog niet verstuurd.", 2);

  assert.equal(second.field.revision, 2);
  assert.equal(second.field.realityContacts.length, 2);
  assert.equal(second.field.hypotheses.length, 1);
  assert.equal(second.field.hypotheses[0].status, "candidate");
  assert.equal(second.decision.movement, "counterexample");
  assert.equal(second.journalEntry.changeType, "hypothesis-formation");
  assert.deepEqual(second.field.worldKnowledge, []);
});

test("laat een correctie de actieve hypothese werkelijk verzwakken", () => {
  let view = createInitialRuntime("session-3", "participant-1", "2026-08-04T10:00:00.000Z");
  const first = contribute(view, "De planning liep vast omdat informatie pas aan het einde werd gedeeld.", 1);
  view = { field: first.field, decision: first.decision };
  const corrected = contribute(view, "Nee, dat klopt niet: de informatie was er wel, maar niemand wist wie besloot.", 2);

  assert.equal(corrected.journalEntry.changeType, "correction");
  assert.equal(corrected.field.hypotheses[0].status, "contested");
  assert.equal(corrected.field.hypotheses[0].confidence, "weakened");
  assert.equal(corrected.field.hypotheses[0].counterEvidenceContactIds.length, 1);
  assert.equal(corrected.decision.movement, "correction");
});

test("verlegt aandacht en parkeert een opbrengstloos spoor zonder dezelfde vraag te herhalen", () => {
  let view = createInitialRuntime("session-no-change", "participant-1", "2026-08-04T10:00:00.000Z");
  const grounded = contribute(view, "De planning liep vast omdat de klantinformatie verspreid stond over mail en losse notities.", 1);
  view = { field: grounded.field, decision: grounded.decision };

  const first = contribute(view, "Weet ik nog niet.", 2);
  view = { field: first.field, decision: first.decision };
  const second = contribute(view, "Weet ik nog niet.", 3);
  view = { field: second.field, decision: second.decision };
  const third = contribute(view, "Weet ik nog niet.", 4);

  assert.equal(first.journalEntry.changeType, "attention-shift");
  assert.equal(first.decision.movement, "perspective");
  assert.equal(first.field.openUnknowns.find((unknown) => unknown.kind === "counterexample")?.status, "parked");
  assert.equal(second.journalEntry.changeType, "hypothesis-parking");
  assert.equal(second.decision.movement, "free-telling");
  assert.equal(second.field.hypotheses[0].status, "parked");
  assert.equal(second.field.hypotheses[0].confidence, "weakened");
  assert.equal(second.field.qualitativeConfidence, "weakened");
  assert.deepEqual(second.journalEntry.affectedHypothesisIds, [second.field.hypotheses[0].id]);
  assert.equal(third.decision.kind, "silence");
  assert.equal(third.decision.movement, "silence");
  assert.equal(third.decision.question, undefined);
  assert.notEqual(first.decision.question, grounded.decision.question);
  assert.notEqual(second.decision.question, first.decision.question);
  assert.equal(third.field.meta.consecutiveNoChange, 3);
});

test("laat een hypothese los na herhaalde expliciete correctie", () => {
  let view = createInitialRuntime("session-abandon", "participant-1", "2026-08-04T10:00:00.000Z");
  const grounded = contribute(view, "De planning liep vast omdat niemand de actuele klantafspraak kon vinden.", 1);
  view = { field: grounded.field, decision: grounded.decision };
  const firstCorrection = contribute(view, "Nee, dat klopt niet: iedereen kende de actuele afspraak.", 2);
  view = { field: firstCorrection.field, decision: firstCorrection.decision };
  const secondCorrection = contribute(view, "Nee, ik zie het anders: ook de vindbaarheid speelde hier helemaal niet mee.", 3);

  assert.equal(firstCorrection.field.hypotheses[0].status, "contested");
  assert.equal(secondCorrection.journalEntry.changeType, "hypothesis-abandonment");
  assert.equal(secondCorrection.field.hypotheses[0].status, "abandoned");
  assert.equal(secondCorrection.field.hypotheses[0].deathReason, "refuted-same-conditions");
  assert.deepEqual(secondCorrection.journalEntry.affectedHypothesisIds, [secondCorrection.field.hypotheses[0].id]);
  assert.equal(secondCorrection.decision.movement, "correction");
  assert.match(secondCorrection.decision.title, /niet langer verantwoord/i);
});

test("blokkeert talige verdieping bij een mogelijk hoog-risicosignaal", () => {
  const view = createInitialRuntime("session-4", "participant-1", "2026-08-04T10:00:00.000Z");
  const result = contribute(view, "Er ontstond een gevaarlijke situatie en iemand raakte gewond.", 1);

  assert.equal(result.field.risk.externalCorrectionRequired, true);
  assert.equal(result.journalEntry.gateStatus, "external-correction-required");
  assert.equal(result.decision.kind, "external-correction");
  assert.equal(result.decision.movement, "external-correction");
});

test("weigert een transitie vanaf een verouderde revisie", () => {
  const view = createInitialRuntime("session-5", "participant-1", "2026-08-04T10:00:00.000Z");

  assert.throws(() => transitionRuntime(view.field, {
    id: "stale-event",
    type: "contribution",
    inquiryId: view.field.sessionId,
    actorId: "participant-1",
    content: "Dit antwoord vertrekt vanaf de verkeerde revisie.",
    observedAt: "2026-08-04T10:01:00.000Z",
    receivedAt: "2026-08-04T10:01:01.000Z",
    baseRevision: 4,
  }), /RUNTIME_STALE_REVISION/);
});

test("hervat uitsluitend via een nieuwe gecommitteerde context-herijking", () => {
  let view = createInitialRuntime("session-resume", "participant-1", "2026-08-04T10:00:00.000Z");
  const first = contribute(view, "Tijdens de bespreking wachtte het team op een besluit van de manager.", 1);
  view = { field: first.field, decision: first.decision };
  const resumed = resumeRuntime(view.field, {
    id: "resume-event-1",
    type: "resume",
    inquiryId: view.field.sessionId,
    actorId: "participant-1",
    observedAt: "2026-08-11T10:00:00.000Z",
    receivedAt: "2026-08-11T10:00:01.000Z",
    baseRevision: view.field.revision,
  });

  assert.equal(resumed.field.revision, 2);
  assert.equal(resumed.journalEntry.eventType, "resume");
  assert.equal(resumed.journalEntry.changeType, "resume-revalidation");
  assert.equal(resumed.decision.movement, "time-shift");
  assert.ok(resumed.decision.foundationRefs.includes("RA-17"));
  assert.match(resumed.decision.question, /sinds ons vorige gesprek veranderd/i);
});

test("blijft na veel bijdragen onderzoek aanbieden en consolideert zonder automatisch einde", () => {
  let view = createInitialRuntime("session-6", "participant-1", "2026-08-04T10:00:00.000Z");
  const contributions = [
    "Tijdens de ochtendstart was de planning nog niet gedeeld met het team.",
    "Daarna vroeg de klant wanneer de levering werkelijk kon beginnen.",
    "Het team keek naar de manager omdat de volgorde nog onduidelijk bleef.",
    "Vorige week liep hetzelfde moment anders doordat de leverancier eerder belde.",
    "Misschien speelt vooral mee dat niemand eigenaar van de laatste controle is.",
    "Een collega zag juist dat de informatie al voor de bespreking beschikbaar was.",
    "Nee, ik bedoel niet dat informatie ontbreekt, maar dat het besluit onzichtbaar blijft.",
    "De klant merkt dit pas later wanneer de beloofde datum weer verandert.",
    "Vooraf controleert iemand de voorraad, maar daarna wacht iedereen op toestemming.",
    "Soms gaat het wel goed wanneer de manager direct één persoon aanwijst.",
    "De leverancier ervaart dan minder losse telefoontjes vanuit verschillende afdelingen.",
    "Gisteren veranderde het beeld opnieuw toen een medewerker zelf de klant terugbelde.",
  ];

  for (const [index, content] of contributions.entries()) {
    const result = contribute(view, content, index + 1);
    assert.equal(result.journalEntry.committedRevision, index + 1);
    assert.ok(result.decision.foundationRefs.length > 0);
    assert.equal(result.decision.canStop, true);
    view = { field: result.field, decision: result.decision };
  }

  assert.equal(view.field.revision, contributions.length);
  assert.ok(view.field.meta.consolidationCount >= 1);
  assert.equal(view.decision.kind === "question" || view.decision.kind === "external-correction", true);
  assert.equal(view.decision.requiresResponse, true);
});
