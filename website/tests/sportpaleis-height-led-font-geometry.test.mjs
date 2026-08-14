import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { boundsForContours } from "../src/sportpaleis/direct-print/geometry.ts";
import { createManagedFontProductionPiece } from "../src/sportpaleis/managed-font-production.mjs";

const fontPath = new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url);

async function fixture() {
  const bytes = await readFile(fontPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  return {
    bytes,
    fontRecord: { id: "font-height-led-fixture", version: sha256.slice(0, 12), sha256, status: "TECHNICALLY_VALID" },
  };
}

function piece(input, content, heightMm, legacyWidthMm) {
  return createManagedFontProductionPiece({
    ...input,
    content,
    widthMm: legacyWidthMm,
    heightMm,
    id: `piece-${content}-${heightMm}-${legacyWidthMm}`,
    sourceOrderId: "acceptance",
    product: "Pilotacceptatie",
    association: "Sportpaleis",
    foilColor: "Wit",
  });
}

test("rugnummer 8 op 220 mm behoudt verhouding en leidt breedte uitsluitend uit contour af", async () => {
  const source = await fixture();
  const narrowRequest = piece(source, "8", 220, 40);
  const wideRequest = piece(source, "8", 220, 400);
  const narrowBounds = boundsForContours(narrowRequest.contours);
  const wideBounds = boundsForContours(wideRequest.contours);

  assert.ok(Math.abs(narrowBounds.height - 220) < 0.03);
  assert.ok(Math.abs(wideBounds.height - 220) < 0.03);
  assert.ok(Math.abs(narrowBounds.width - wideBounds.width) < 0.03);
  assert.equal(narrowRequest.sizing.mode, "HEIGHT_UNIFORM");
  assert.equal(narrowRequest.sizing.legacyRequestedWidthMm, 40);
});

test("initialen op 30 mm behouden dezelfde fontverhouding bij iedere oude breedte-invoer", async () => {
  const source = await fixture();
  const first = piece(source, "DW", 30, 25);
  const second = piece(source, "DW", 30, 250);
  const firstBounds = boundsForContours(first.contours);
  const secondBounds = boundsForContours(second.contours);

  assert.ok(Math.abs(firstBounds.height - 30) < 0.03);
  assert.ok(Math.abs(firstBounds.width - secondBounds.width) < 0.03);
  assert.ok(Math.abs((firstBounds.width / firstBounds.height) - (secondBounds.width / secondBounds.height)) < 0.0001);
});
