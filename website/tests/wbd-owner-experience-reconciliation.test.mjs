import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Owner Experience houdt de cockpit licht, begrensd en progressive", async () => {
  const [owner, today, css] = await Promise.all([
    readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-atlas-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8"),
  ]);

  assert.match(today, /Goedemorgen|Goedemiddag|Goedenavond/u);
  assert.match(today, /Dit speelt er vandaag\./u);
  assert.match(today, /Wat ertoe doet/u);
  assert.match(today, /\.slice\(0, 6\)/u);
  assert.match(today, /<details><summary><span>Sinds je laatste bezoek/u);
  assert.match(today, /<details><summary><span>Hoe Atlas werkt/u);
  assert.match(today, /Geen urgente Attention/u);

  assert.match(owner, /wbd-owner-primary/u);
  assert.match(owner, /wbd-owner-mobile-sections/u);
  assert.match(owner, /aria-disabled="true"[\s\S]*Mail/u);
  assert.doesNotMatch(owner, /workspace\/wbd\/mail/u);

  assert.match(css, /--wbd-owner-shell:#0d3a2f/u);
  assert.match(css, /background:var\(--wbd-owner-shell\)/u);
  assert.match(css, /\.wbd-atlas-layer[\s\S]*background:var\(--wbd-owner-surface\)/u);
  assert.match(css, /@media \(max-width:840px\)[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/u);
  assert.match(css, /min-height:3rem/u);
  assert.match(css, /:focus-visible/u);
});

test("Mail blijft een eerlijke gereserveerde positie zonder capability theatre", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const unavailable = owner.match(/<span class="wbd-owner-sections__unavailable"[\s\S]*?<\/span>/u)?.[0] ?? "";
  assert.match(unavailable, /aria-disabled="true"/u);
  assert.match(unavailable, /Mail<small>later<\/small>/u);
  assert.doesNotMatch(unavailable, /href=/u);
});
