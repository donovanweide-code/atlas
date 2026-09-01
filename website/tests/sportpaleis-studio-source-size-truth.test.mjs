import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { productionAssetPiece, productionAssetPieces } from "../src/sportpaleis/production-assets.mjs";

const experienceUrl = new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url);
const stylesUrl = new URL("../src/styles/sportpaleis-teamwear.css", import.meta.url);

test("Studio accepteert upload, drop en paste via dezelfde voorstelbron", async () => {
  const source = await readFile(experienceUrl, "utf8");
  assert.match(source, /sourceForm\.dataset\.studioDropzone\s*=\s*"true"/u);
  assert.match(source, /sourceInput\.multiple\s*=\s*true/u);
  assert.match(source, /addEventListener\("drop"/u);
  assert.match(source, /addEventListener\("paste"/u);
  assert.match(source, /submitIncomingFiles/u);
  assert.match(source, /requestSubmit/u);
  assert.match(source, /sourceForm\.requestSubmit/u, "upload blijft door de bestaande voorstel-source submitflow lopen");
});

test("bekende productieafmetingen zijn in Studio vergrendeld en niet via drag-resize te muteren", async () => {
  const source = await readFile(experienceUrl, "utf8");
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(source, /data-size-locked/u);
  assert.match(source, /placement\.dataset\.sizeLocked\s*!==\s*"true"/u);
  assert.match(source, /Maat vergrendeld door Product Truth/u);
  assert.match(source, /input\.disabled\s*=\s*sizeLocked/u);
  assert.match(source, /profile\?\.supports\?\.includes\(field\)/u);
  assert.match(styles, /sp-studio-placement__body\{min-width:48px;min-height:48px\}/u);
  assert.match(styles, /#teamkit-studio \.sp-studio-color button\{width:44px;height:44px;min-height:44px\}/u);
});

test("één canonical 0–9-bron componeert alleen de gevraagde cijfers op de gevraagde fysieke maat", () => {
  const glyph = (digit) => ({
    candidateId: `glyph-${digit}`,
    geometryHash: String(digit).repeat(64), heightUnits: 20,
    bounds: { minX: 0, minY: 0, maxX: 10 + Number(digit), maxY: 20 },
    contours: [{ id: `contour-${digit}`, closed: true, points: [{ x: 0, y: 0 }, { x: 10 + Number(digit), y: 0 }, { x: 10 + Number(digit), y: 20 }, { x: 0, y: 20 }] }],
  });
  const asset = {
    id: "canonical-number-master", version: "1", name: "Canonical 0-9", lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED",
    applications: [{ kind: "NUMBER_SET" }], sourceSelection: { geometryHash: "A".repeat(64) },
    numberGlyphs: Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [String(digit), glyph(digit)])),
    numberComposition: { freeContourSpacingMm: 5 },
  };
  const order = { id: "SP-CANONICAL-NUMBER", association: "Sportpaleis", items: [] };
  const line = { id: "number-34", content: "34", widthMm: 0, heightMm: 200, preview: { label: "Rugnummer 34" } };
  const pieces = productionAssetPieces({ asset, variant: { heightMm: 200 }, line, order, foilColor: "Wit" });
  assert.equal(pieces.length, 2);
  assert.deepEqual(pieces.map(({ semanticGroup }) => semanticGroup.digit), ["3", "4"]);
  assert.ok(pieces.every(({ requestedPhysicalSizeMm }) => requestedPhysicalSizeMm.heightMm === 200));
  assert.ok(pieces.every(({ assetIdentity }) => assetIdentity.assetId === asset.id));

  const short = productionAssetPiece({ asset, variant: { heightMm: 75 }, line: { ...line, id: "short-34", heightMm: 75 }, order, foilColor: "Wit" });
  assert.equal(short.requestedPhysicalSizeMm.heightMm, 75);
  assert.match(short.vectorProfile, new RegExp(`^${asset.id}@${asset.version}#`, "u"), "dezelfde master wordt geometrisch geschaald; geen tweede bron per maat");
});
