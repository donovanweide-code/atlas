import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("biedt één organische ingang zonder de persoonlijke uitnodigingsroute te vervangen", async () => {
  const [main, workspace, apiClient] = await Promise.all([
    read("../src/experience-validation-main.ts"),
    read("../src/experience-workspace.ts"),
    read("../src/experience-validation-api.ts"),
  ]);
  assert.match(workspace, /=== "\/ervaar"/);
  assert.match(workspace, /Verder als/);
  assert.match(workspace, /Ik ben iemand anders/);
  assert.match(apiClient, /participant\/organic\/create/);
  assert.match(apiClient, /participant\/exchange/);
  assert.doesNotMatch(main, /src\/main|public.*website/i);
});

test("maakt per organische deelnemer cryptografisch gescheiden centrale toegang", async () => {
  const [api, schema] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../experience-server/private/schema.sql"),
  ]);
  assert.match(api, /\$invitationId = uuid\(\)/);
  assert.match(api, /\$sessionId = uuid\(\)/);
  assert.match(api, /\$credential = random_token\(\)/);
  assert.match(api, /token_hash\(\$credential\)/);
  assert.match(api, /participant_context\(\$pdo, \$config, 'organic'\)/);
  assert.match(api, /DELETE a FROM experience_participant_access/);
  assert.match(schema, /entry_type VARCHAR\(16\) NOT NULL DEFAULT 'personal'/);
  assert.match(schema, /participant_name VARCHAR\(120\)/);
  assert.match(schema, /referral_id VARCHAR\(96\)/);
  assert.match(schema, /invitation_id CHAR\(36\) NOT NULL UNIQUE/);
});

test("registreert alleen niet-persoonlijke herkomst en betekenisvolle instroomgebeurtenissen", async () => {
  const [api, observatory, workspace] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../src/experience-observatory.ts"),
    read("../src/experience-workspace.ts"),
  ]);
  for (const event of ["organic_entry_created", "organic_shared_entry_created", "organic_participant_resumed"]) {
    assert.match(api, new RegExp(event));
    assert.match(observatory, new RegExp(event));
  }
  assert.match(workspace, /\^#via=\(\[A-Za-z0-9_-/);
  assert.doesNotMatch(workspace, /#via=.*participantName|#via=.*name/i);
  assert.doesNotMatch(api, /fingerprint|advertising|analytics|utm_/i);
});

test("houdt de publieke buildgrens en persoonlijke uitnodigingen intact", async () => {
  const [publicMain, experienceMain, api] = await Promise.all([
    read("../src/main.ts"),
    read("../src/experience-validation-main.ts"),
    read("../experience-server/api/index.php"),
  ]);
  assert.doesNotMatch(publicMain, /organic\/create|\/ervaar|experience-validation-main/);
  assert.match(experienceMain, /renderExperienceWorkspace/);
  assert.match(api, /participant\/exchange/);
  assert.match(api, /entry_type = 'personal'/);
});
