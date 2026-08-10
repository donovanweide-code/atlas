import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("gebruikt in de Workspace-shell dezelfde W / BD-logo-opbouw als de publieke website", async () => {
  const [shell, publicPages] = await Promise.all([
    readFile(new URL("../src/workspace-shell.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/public-pages.ts", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /<span>W<\/span><i><\/i><span>BD<\/span>/);
  assert.match(shell, /\$\{className\}--wbd/);
  assert.doesNotMatch(publicPages, />WBD\.<\/span>/);
  assert.match(publicPages, /route-contact__logo brand__mark/);
});

test("bereidt aandacht in de navigatie semantisch voor zonder actieve badges", async () => {
  const [config, shell] = await Promise.all([
    readFile(new URL("../src/workspace-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/workspace-shell.ts", import.meta.url), "utf8"),
  ]);

  assert.match(config, /attentionLabel\?: string/);
  assert.doesNotMatch(config, /attentionLabel:/);
  assert.match(shell, /data-attention-ready="true"/);
  assert.match(shell, /workspace-nav__attention/);
  assert.doesNotMatch(shell, /notification|badge|unread/i);
});

test("geeft alle Experience-dialogen een toegankelijke naam", async () => {
  const workspace = await readFile(new URL("../src/experience-workspace.ts", import.meta.url), "utf8");

  for (const id of [
    "experience-feedback-title",
    "experience-delete-title",
    "experience-leave-title",
    "experience-edit-title",
  ]) {
    assert.match(workspace, new RegExp(`aria-labelledby="${id}"`));
    assert.match(workspace, new RegExp(`id="${id}"`));
  }
});
