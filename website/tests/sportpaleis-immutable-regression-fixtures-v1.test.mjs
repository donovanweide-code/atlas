import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../config/sportpaleis-immutable-regression-fixtures-v1.json", import.meta.url), "utf8"));

test("historische regressiefixtures zijn versioned, byte-authentiek en beschikbaar in een schone checkout", async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.fixtures.length, 6);
  assert.equal(new Set(manifest.fixtures.map(({ id }) => id)).size, manifest.fixtures.length);
  for (const fixture of manifest.fixtures) {
    const url = new URL(fixture.path.replaceAll("\\", "/"), repositoryRoot);
    const [metadata, bytes] = await Promise.all([stat(url), readFile(url)]);
    assert.equal(metadata.size, fixture.bytes, `${fixture.id} heeft niet de authoritative bytegrootte`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.sha256, `${fixture.id} heeft niet de authoritative SHA-256`);
  }
});

test("de immutable fixturelijst dekt exact de vier eerder ontbrekende evidencegroepen", () => {
  const ids = new Set(manifest.fixtures.map(({ id }) => id));
  for (const required of [
    "sportpaleis-f00248-concept-json",
    "sportpaleis-f00248-concept-pdf",
    "mail-foundation-003-review-json",
    "mail-foundation-003-review-pdf",
    "web-push-runtime-recovery-r2-artifact",
    "web-push-runtime-recovery-r2-manifest",
  ]) assert.ok(ids.has(required), `immutable evidence ontbreekt: ${required}`);
});
