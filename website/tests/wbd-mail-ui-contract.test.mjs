import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Owner Mail is a canonical route and replaces the disabled navigation item", async () => {
  const [runtime, owner, css] = await Promise.all([readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8"), readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8"), readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8")]);
  assert.match(runtime, /workspaceMail = `\$\{workspaceBoundary\}\/mail`/u);
  assert.match(owner, /href="\$\{mailPath\}"/u);
  assert.match(owner, /renderMailWorkspace/u);
  assert.match(css, /\.wbd-mail-canvas/u);
  assert.match(css, /@media\(max-width:840px\)/u);
});

test("mail UI states do not claim live data before credentials exist", async () => {
  const source = await readFile(new URL("../src/wbd-mail-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /er is nog geen mailbox gekoppeld/u);
  assert.match(source, /geen connectorcall tijdens render/iu);
  assert.match(source, /capture-only/iu);
  assert.doesNotMatch(source, /dummy inbox|demo inbox/iu);
});

test("Mail push UI is explicit opt-in, private by default and iPhone-PWA aware", async () => {
  const source = await readFile(new URL("../src/wbd-mail-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Alleen als mail echt aandacht verdient/u);
  assert.match(source, /geen onderwerp, mailtekst of e-mailadres/u);
  assert.match(source, /data-mail-push-enable/u);
  assert.match(source, /Zet op beginscherm/u);
  assert.match(source, /minimumPriority/u);
});
