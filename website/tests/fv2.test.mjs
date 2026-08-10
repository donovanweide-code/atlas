import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFirstVisitRuntime, firstVisitVersion } from "../src/atlas-first-visit.ts";
import { transitionRuntime } from "../src/atlas-runtime.ts";

const snapshot = JSON.parse(await readFile(new URL("../context-first-sources/webuildanddesign.nl.snapshot.json", import.meta.url), "utf8"));
const timestamp = "2026-08-04T10:00:00.000Z";
const create = websiteUrl => createFirstVisitRuntime("fv2-session", "fv2-participant", {
  industry: "Digitale dienstverlening",
  organizationName: "We Build And Design",
  websiteUrl,
}, snapshot, timestamp);

test("First Visit V2 gaat zonder website contextgebonden verder", () => {
  const result = create();
  assert.equal(result.context.sourceAvailability, "not-observed");
  assert.match(result.decision.question ?? "", /We Build And Design/);
  assert.match(result.decision.question ?? "", /Digitale dienstverlening/);
  assert.equal(result.field.revision, 1);
  assert.equal(result.journalEntry.changeType, "first-visit-context-established");
});

test("een onbekende website wordt niet als publiek feit behandeld", () => {
  const result = create("voorbeeldbedrijf.nl");
  assert.equal(result.context.sourceAvailability, "not-observed");
  assert.equal(result.context.contacts.some(contact => contact.sourceStatus === "public-observation"), false);
  assert.equal(result.context.contacts.some(contact => contact.kind === "website" && contact.sourceStatus === "participant-input"), true);
});

test("een gecontroleerde website scheidt vier epistemische lagen", () => {
  const result = create("webuildanddesign.nl");
  assert.equal(result.context.sourceAvailability, "controlled-public-source");
  assert.deepEqual(new Set(result.context.contacts.map(contact => contact.sourceStatus)), new Set(["participant-input", "public-observation", "provisional-inference", "unknown"]));
  assert.ok(result.context.contacts.filter(contact => contact.sourceStatus === "public-observation").every(contact => contact.sourceUrl && contact.evidenceExcerpt));
});

test("context blijft na een Runtime Improvement-transitie herleidbaar", () => {
  const result = create("webuildanddesign.nl");
  const next = transitionRuntime(result.field, {
    id: "fv2-answer",
    type: "contribution",
    inquiryId: result.field.sessionId,
    actorId: "fv2-participant",
    content: "Een klantvraag begint meestal via het formulier en wordt daarna handmatig verdeeld over het team.",
    observedAt: "2026-08-04T10:01:00.000Z",
    receivedAt: "2026-08-04T10:01:00.000Z",
    baseRevision: 1,
  });
  assert.equal(next.field.revision, 2);
  assert.equal(next.field.firstVisitContext.experienceVersion, firstVisitVersion);
  assert.equal(next.journalEntry.baseRevision, 1);
});
