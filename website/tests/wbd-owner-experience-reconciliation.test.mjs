import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Owner Experience houdt de cockpit licht, begrensd en progressive", async () => {
  const [owner, today, organizations, css, build] = await Promise.all([
    readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-atlas-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-organization-context.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8"),
    readFile(new URL("../vite.workspace.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(today, /Goedemorgen|Goedemiddag|Goedenavond/u);
  assert.match(today, /Dit speelt er vandaag\./u);
  assert.match(today, /Wat vraagt vandaag aandacht\?/u);
  for (const label of ["Signaal", "Betekenis", "Evidence · waarom zie ik dit?", "Next Best Action"]) assert.match(today, new RegExp(label));
  assert.match(today, /\.slice\(0, 4\)/u);
  assert.match(today, /Sinds je laatste bezoek/u);
  assert.match(today, /wbd-atlas-help/u);
  assert.match(today, /Geen urgente aandacht/u);
  assert.match(today, /wbd-atlas-technical/u);

  assert.match(owner, /wbd-owner-primary/u);
  assert.match(owner, /wbd-owner-mobile-header/u);
  assert.match(owner, /wbd-owner-drawer/u);
  assert.match(owner, /data-owner-drawer-toggle/u);
  assert.match(owner, /aria-controls="wbd-owner-drawer"/u);
  assert.match(owner, /document\.body\.classList\.add\("wbd-owner-drawer-open"\)/u);
  assert.match(owner, /event\.key !== "Escape"/u);
  assert.doesNotMatch(owner, /wbd-owner-mobile-sections/u);
  assert.match(owner, /aria-disabled="true"[\s\S]*Mail/u);
  assert.doesNotMatch(owner, /workspace\/wbd\/mail/u);
  for (const source of [owner, today, organizations, build]) assert.match(source, /wbd-logo-light-candidate\.svg/u);
  assert.doesNotMatch(owner, /<span class="wbd-owner-mark"[^>]*>W<\/span>/u);

  assert.match(css, /--wbd-owner-green:#17352f/u);
  assert.match(css, /background:linear-gradient\(180deg,var\(--wbd-owner-green\)/u);
  assert.match(css, /\.wbd-owner-drawer\[data-open="true"\]/u);
  assert.match(css, /body\.wbd-owner-drawer-open/u);
  assert.match(css, /env\(safe-area-inset-bottom\)/u);
  assert.match(css, /min-height:3rem/u);
  assert.match(css, /:focus-visible/u);
});

test("Mail blijft een eerlijke gereserveerde positie zonder capability theatre", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  assert.match(owner, /aria-disabled="true"[^>]*title="Mail Foundation is behouden; de echte inbox is nog niet aangesloten"/u);
  assert.match(owner, /<span>Mail<\/span><small>Voorbereid<\/small>/u);
  assert.doesNotMatch(owner, /href="\/workspace\/wbd\/mail"/u);
  assert.match(owner, /<span>Growth<\/span><small>Voorbereid<\/small>/u);
});
