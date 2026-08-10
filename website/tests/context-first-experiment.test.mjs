import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  contextFirstExperimentVersion,
  createContextFirstBaselineCandidate,
  createContextFirstCandidate,
  createRouteA,
  mandatoryContextQuestionCount,
  normalizeOrganizationUrl,
  snapshotSupportsUrl,
} from "../src/atlas-context-first-experiment.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const snapshot = JSON.parse(await read("../context-first-sources/webuildanddesign.nl.snapshot.json"));
const timestamp = "2026-08-04T04:15:13.8506430+02:00";

function candidate(overrides = {}) {
  return createContextFirstCandidate({
    industry: "Digitale dienstverlening",
    organizationName: "We Build And Design",
    websiteUrl: "webuildanddesign.nl",
    ...overrides,
  }, snapshot, timestamp);
}

test("opent met branche en organisatie als enige verplichte contextvragen", async () => {
  const ui = await read("../src/context-first-experiment-main.ts");
  assert.equal(mandatoryContextQuestionCount, 2);
  assert.match(ui, /In welke branche werken we vandaag\?/);
  assert.match(ui, /Voor welke organisatie kijken we vandaag\?/);
  assert.match(ui, /Website \(optioneel\)/);
  assert.match(ui, /Website overslaan/);
  assert.doesNotMatch(ui, /required \/>\s*<\/label>\s*<div class="button-row">/);
  assert.doesNotMatch(ui, /een organisatie waar je graag van leert/);
});

test("accepteert uitsluitend de expliciet vastgelegde publieke bron", () => {
  assert.equal(normalizeOrganizationUrl("webuildanddesign.nl"), "https://webuildanddesign.nl/");
  assert.equal(snapshotSupportsUrl(snapshot, "https://www.webuildanddesign.nl/contact"), true);
  assert.equal(snapshotSupportsUrl(snapshot, "https://example.com"), false);
  assert.throws(
    () => createContextFirstCandidate({ industry: "Bouw", organizationName: "Voorbeeld", websiteUrl: "example.com" }, snapshot, timestamp),
    /No explicit local source snapshot/,
  );
});

test("gaat zonder website of gecontroleerde bron verder vanuit branche en organisatie", async () => {
  const ui = await read("../src/context-first-experiment-main.ts");
  const withoutWebsite = createContextFirstBaselineCandidate({
    industry: "Installatietechniek",
    organizationName: "Voorbeeldbedrijf",
  }, timestamp);
  const unsupportedWebsite = createContextFirstBaselineCandidate({
    industry: "Installatietechniek",
    organizationName: "Voorbeeldbedrijf",
    websiteUrl: "voorbeeldbedrijf.nl",
  }, timestamp);

  for (const result of [withoutWebsite, unsupportedWebsite]) {
    assert.equal(result.sourceAvailability, "not-observed");
    assert.match(result.firstQuestion, /Voorbeeldbedrijf/);
    assert.match(result.firstQuestion, /Installatietechniek/);
    assert.equal(result.state.contextRealityContacts.some(({ sourceStatus }) => sourceStatus === "public-observation"), false);
    assert.equal(result.state.revision, 3);
  }
  assert.match(ui, /Ik heb deze website nog niet kunnen observeren/);
  assert.match(ui, /Er is nu geen website om te observeren/);
  assert.doesNotMatch(ui, /renderWebsiteStep\("Voor deze website/);
});

test("scheidt deelnemerinput, publieke feiten, voorlopige interpretatie en onbekenden", () => {
  const result = candidate();
  const statuses = new Set([
    ...result.state.contextRealityContacts.map(({ sourceStatus }) => sourceStatus),
    ...result.state.provisionalInferences.map(({ sourceStatus }) => sourceStatus),
    ...result.state.openUnknowns.map(({ sourceStatus }) => sourceStatus),
  ]);

  assert.deepEqual(statuses, new Set(["participant-input", "public-observation", "provisional-inference", "unknown"]));
  assert.equal(result.provisionalPicture.confidence, "glimpse");
  assert.match(result.firstDistinction, /website laat zien wat de organisatie belooft; niet hoe/);
  assert.doesNotMatch(result.provisionalPicture.statement, /intern werkt|oorzaak is|zeker|conclusie/i);
});

test("leidt de eerste onderzoeksvraag aantoonbaar af van organisatiecontext en twee broncontacten", () => {
  const result = candidate();
  assert.match(result.firstQuestion, /We Build And Design/);
  assert.match(result.firstQuestion, /Digitale dienstverlening/);
  assert.match(result.firstQuestion, /belooft.*eerst te begrijpen/);
  assert.match(result.firstQuestion, /vertellen wat er speelt/);
  assert.match(result.firstQuestion, /nog zelf vertalen/);
  assert.equal(result.state.decision.movement, "connect");
  assert.equal(result.state.decision.reason, "De vraag verbindt twee direct zichtbare publieke feiten en opent precies wat daaruit nog niet bekend is.");
});

test("draagt context als Reality Contacts en herleidbare Journal-bewegingen", () => {
  const result = candidate();
  const publicContactIds = result.state.contextRealityContacts
    .filter(({ sourceStatus }) => sourceStatus === "public-observation")
    .map(({ id }) => id);
  const publicJournal = result.state.journal.find(({ eventType }) => eventType === "public-grounding");
  const decisionJournal = result.state.journal.find(({ eventType }) => eventType === "runtime-decision");

  assert.equal(result.state.experimentVersion, contextFirstExperimentVersion);
  assert.equal(result.state.baseField.revision, 0);
  assert.deepEqual(publicJournal?.affectedContactIds, publicContactIds);
  assert.ok(decisionJournal?.affectedContactIds.includes("context-public-home-method"));
  assert.ok(decisionJournal?.affectedContactIds.includes("context-public-home-entry"));
  assert.equal(result.state.revision, 4);
  assert.deepEqual(result.state.journal.map(({ revision }) => revision), [1, 2, 3, 4]);
});

test("Route B is inhoudelijk specifieker dan de huidige algemene Route A", () => {
  const routeA = createRouteA("route-a", timestamp);
  const routeB = candidate();

  assert.match(routeA.decision.question ?? "", /werksituatie/i);
  assert.doesNotMatch(routeA.decision.question ?? "", /We Build And Design|website|vertellen wat er speelt/i);
  assert.notEqual(routeA.decision.question, routeB.firstQuestion);
  assert.ok(routeB.firstQuestion.length > (routeA.decision.question?.length ?? 0));
});

test("snapshot bevat reproduceerbaar bronbewijs in plaats van een impliciete live crawl", () => {
  assert.equal(snapshot.acquisition.method, "explicit-local-snapshot-from-live-public-source");
  assert.match(snapshot.acquisition.homepageSha256, /^[A-F0-9]{64}$/);
  assert.match(snapshot.acquisition.bundleSha256, /^[A-F0-9]{64}$/);
  assert.equal(snapshot.observations.length, 4);
  assert.ok(snapshot.observations.every(observation => observation.sourceUrl.startsWith("https://webuildanddesign.nl")));
});

test("bouwt naar een aparte lokale output zonder Experience deploypakket of publieke entrypoint", async () => {
  const [config, packageJson, html] = await Promise.all([
    read("../vite.context-first.config.ts"),
    read("../package.json"),
    read("../context-first-experiment.html"),
  ]);
  assert.match(config, /outDir: "dist-context-first"/);
  assert.match(config, /publicDir: false/);
  assert.doesNotMatch(config, /dist-experience|prepare-experience-package|experience-server/);
  assert.match(packageJson, /build:context-first/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(html, /experience-validation-main|src\/main\.ts/);
});
