import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("houdt de Experience-build strikt buiten de publieke entrypointgrens", async () => {
  const [packageSource, publicSource, buildConfig, experienceHtml] = await Promise.all([
    read("../package.json"), read("../src/main.ts"), read("../vite.experience.config.ts"), read("../experience.html"),
  ]);
  assert.match(packageSource, /build:experience/);
  assert.match(buildConfig, /dist-experience/);
  assert.match(buildConfig, /experience-public/);
  assert.doesNotMatch(publicSource, /experience-validation-main|experience-observatory|participant\/exchange/);
  assert.match(experienceHtml, /noindex, nofollow, noarchive/);
  assert.match(experienceHtml, /no-referrer/);
});

test("gebruikt gehashte toegangstokens, veilige cookies en server-side validatie", async () => {
  const [api, schema, config] = await Promise.all([
    read("../experience-server/api/index.php"), read("../experience-server/private/schema.sql"), read("../experience-server/private/experience-config.php.example"),
  ]);
  assert.match(api, /hash\('sha256', \$token\)/);
  assert.match(api, /httponly.*true/is);
  assert.match(api, /samesite.*Strict/is);
  assert.match(api, /require_same_origin/);
  assert.match(api, /MAX_ANSWER_LENGTH = 1600/);
  assert.match(api, /RATE_LIMITED/);
  assert.doesNotMatch(api, /SELECT \* FROM experience_invitations WHERE token =/);
  assert.match(schema, /token_hash CHAR\(64\) NOT NULL UNIQUE/);
  assert.match(schema, /FOREIGN KEY.*ON DELETE CASCADE/);
  assert.doesNotMatch(config, /password' => '[^Y]/);
});

test("registreert alleen betekenisvolle gebeurtenissen", async () => {
  const [api, observatory] = await Promise.all([read("../experience-server/api/index.php"), read("../src/experience-observatory.ts")]);
  for (const event of ["invitation_opened", "experience_started", "question_answered", "experience_completed", "workspace_opened", "experience_returned", "feedback_submitted"]) {
    assert.match(api, new RegExp(event));
    assert.match(observatory, new RegExp(event));
  }
  assert.doesNotMatch(api, /mousemove|keypress|draft_content|advertising|fingerprint/i);
});

test("borgt noindex op HTML, robots en serverheaders", async () => {
  const [html, robots, htaccess] = await Promise.all([read("../experience.html"), read("../experience-public/robots.txt"), read("../experience-public/.htaccess")]);
  assert.match(html, /noindex, nofollow, noarchive, nosnippet, noimageindex/);
  assert.match(robots, /Disallow: \/$/m);
  assert.match(htaccess, /X-Robots-Tag/);
  assert.match(htaccess, /Content-Security-Policy/);
  assert.match(htaccess, /Options -Indexes/);
});

test("scheidt deelnemerwoorden en interne observaties", async () => {
  const [observatory, schema] = await Promise.all([read("../src/experience-observatory.ts"), read("../experience-server/private/schema.sql")]);
  assert.match(observatory, /Deze notities zijn van WBD en staan bewust los van de woorden van de deelnemer/);
  assert.match(schema, /CREATE TABLE experience_observations/);
  assert.match(schema, /CREATE TABLE experience_answers/);
});
