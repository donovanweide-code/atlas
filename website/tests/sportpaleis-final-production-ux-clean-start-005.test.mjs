import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("final UX gebruikt profielhoogte, menselijke statussen en geen handmatige Teamorder-breedte", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");

  assert.match(source, /SPW-PILOT-PRODUCTION-UX-CLEAN-START-005-20260814/u);
  assert.match(source, /teamProfileHeightMm/u);
  assert.match(source, /Lettertype en maat/u);
  assert.doesNotMatch(source, /name="teamWidthMm"/u);
  assert.doesNotMatch(source, /name="teamHeightMm"/u);
  assert.match(source, /AWAITING_HUMAN_CHECK: "Klaar om te bedrukken"/u);
  assert.match(source, /COMPLETED: "Bedrukt"/u);
  assert.match(css, /\.sp-catalog-card\.is-selected\{border-color:#18372f;background:#f1f8f4/u);
  assert.match(css, /\.sp-production-measure/u);
});
