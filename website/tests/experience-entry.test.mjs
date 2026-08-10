import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalExperiencePath,
  hasPersonalExperienceToken,
  isCanonicalExperiencePath,
  normalizeExperiencePath,
  shouldRedirectMissingPersonalAccess,
} from "../src/experience-entry.ts";

test("/ervaar is de canonieke Experience-route", () => {
  assert.equal(canonicalExperiencePath, "/ervaar");
  assert.equal(isCanonicalExperiencePath("/ervaar"), true);
  assert.equal(isCanonicalExperiencePath("/ervaar/"), true);
  assert.equal(normalizeExperiencePath("/e/"), "/e");
});

test("persoonlijke tokenroutes blijven herkenbaar", () => {
  assert.equal(hasPersonalExperienceToken("#bestaand-token"), true);
  assert.equal(hasPersonalExperienceToken("#token=bestaand-token"), true);
  assert.equal(hasPersonalExperienceToken(""), false);
  assert.equal(hasPersonalExperienceToken("#token="), false);
  assert.equal(hasPersonalExperienceToken("#via=bron"), false);
});

test("alleen /e/ zonder token en zonder geldige sessie verwijst naar /ervaar", () => {
  assert.equal(shouldRedirectMissingPersonalAccess("/e/", "", 401), true);
  assert.equal(shouldRedirectMissingPersonalAccess("/e", "", 404), true);
  assert.equal(shouldRedirectMissingPersonalAccess("/e/", "#bestaand-token", 404), false);
  assert.equal(shouldRedirectMissingPersonalAccess("/e/", "", 410), false);
  assert.equal(shouldRedirectMissingPersonalAccess("/ervaar", "", 401), false);
});

test("/ervaar bewaart hervatten voor een bestaande organische sessie", async () => {
  const entry = await readFile(new URL("../src/experience-validation-main.ts", import.meta.url), "utf8");
  assert.match(entry, /await experienceApi\.organicState\(\)/);
  assert.match(entry, /await renderExperienceWorkspace\(app\)/);
  assert.match(entry, /await import\("\.\/first-visit-v2-main"\)/);
});
