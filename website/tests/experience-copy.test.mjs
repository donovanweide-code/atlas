import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("zichtbare Experience-copy gebruikt uitnodiging niet langer als hoofdconcept", async () => {
  const [workspace, privacy] = await Promise.all([
    read("src/experience-workspace.ts"),
    read("src/experience-privacy.ts"),
  ]);
  const visibleCopy = `${workspace}\n${privacy}`;

  assert.doesNotMatch(visibleCopy, /persoonlijke uitnodiging/i);
  assert.doesNotMatch(visibleCopy, /dezelfde persoonlijke link/i);
  assert.doesNotMatch(visibleCopy, /vraag een nieuwe uitnodiging/i);
  assert.match(workspace, /persoonlijke Experience-toegang/);
  assert.match(workspace, /We kunnen deze persoonlijke Experience niet openen/);
  assert.match(privacy, /intern onderzoek, menselijke review en historische Experience-continuïteit/);
});

test("Observatory positioneert zichzelf als intern onderzoek, review en historie", async () => {
  const observatory = await read("src/experience-observatory.ts");

  assert.match(observatory, /interne omgeving voor onderzoek, menselijke review en historische Experiences/);
  assert.match(observatory, /Interne onderzoeks- en reviewomgeving/);
  assert.match(observatory, /bewaren we hun historie/);
  assert.match(observatory, /De normale Experience begint op \/ervaar/);
  assert.match(observatory, /Legacy tokencompatibiliteit/);
  assert.doesNotMatch(observatory, /Nieuwe ontmoeting/);
  assert.doesNotMatch(observatory, /Maak een persoonlijke uitnodiging/);
});

test("tokenfouten behouden compatibiliteit met neutralere toegangstaal", async () => {
  const [workspace, productionApi, localApi] = await Promise.all([
    read("src/experience-workspace.ts"),
    read("experience-server/api/index.php"),
    read("scripts/experience-validation-local-server.mjs"),
  ]);

  for (const source of [workspace, productionApi, localApi]) {
    assert.match(source, /persoonlijke toegang/i);
  }
  assert.match(productionApi, /'INVITATION_REVOKED'/);
  assert.match(productionApi, /'INVITATION_EXPIRED'/);
  assert.match(localApi, /"INVITATION_REVOKED"/);
  assert.match(localApi, /"INVITATION_EXPIRED"/);
});
