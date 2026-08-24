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
  assert.match(today, /Wat vraagt vandaag aandacht\?/u);
  for (const label of ["Signaal", "Betekenis", "Evidence · waarom zie ik dit?", "Next Best Action"]) assert.match(today, new RegExp(label));
  assert.match(today, /\.slice\(0, 6\)/u);
  assert.match(today, /<details><summary><span>Sinds je laatste bezoek/u);
  assert.match(today, /<details><summary><span>Hoe Atlas werkt/u);
  assert.match(today, /Geen urgente Attention/u);

  assert.match(owner, /wbd-owner-primary/u);
  assert.match(owner, /wbd-owner-mobile-sections/u);
  assert.match(owner, /aria-disabled="true"[\s\S]*Mail/u);
  assert.doesNotMatch(owner, /workspace\/wbd\/mail/u);

  assert.match(css, /--wbd-v2-cream:#f7f5ef/u);
  assert.match(css, /position:fixed[\s\S]*width:16\.75rem/u);
  assert.match(css, /background:var\(--wbd-v2-cream\)/u);
  assert.match(css, /@media \(max-width:840px\)[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/u);
  assert.match(css, /min-height:3rem/u);
  assert.match(css, /:focus-visible/u);
});

test("Mail blijft een eerlijke gereserveerde positie zonder capability theatre", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  assert.match(owner, /aria-disabled="true"[^>]*title="Mail Foundation is behouden; de echte inbox is nog niet aangesloten"/u);
  assert.match(owner, /Mail<small>foundation<\/small>/u);
  assert.doesNotMatch(owner, /href="\/workspace\/wbd\/mail"/u);
  assert.match(owner, /Growth<small>niet live<\/small>/u);
});
