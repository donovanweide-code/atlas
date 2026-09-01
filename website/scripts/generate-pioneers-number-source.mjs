import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { inspectProductionAssetSvg } from "../src/sportpaleis/production-assets-svg.mjs";

const ORIGINAL_PATH = new URL("../public/assets/organizations/sportpaleis/number-sources/Almere-Pioneers-rugnummers-20cm.original.svg", import.meta.url);
const NORMALIZED_PATH = new URL("../public/assets/organizations/sportpaleis/number-sources/Almere-Pioneers-rugnummers-20cm.normalized.svg", import.meta.url);
const MODULE_PATH = new URL("../src/sportpaleis/pioneers-number-source.generated.mjs", import.meta.url);
const EXPECTED_ORIGINAL_SHA256 = "FD6716E5911EB5AB239D291808DC490ECF305FD3F30C49E183AB063097C67143";
const SVG_UNITS_PER_MM = 72 / 25.4;
const DIGIT_BY_GEOMETRY_SHA256 = Object.freeze({
  "07EE25364CEF0433F49E172E0A062A8B308435E13DC68834FD297825ED9AE0E8": "0",
  "D769C4714104571ADE9189FF3AB4D6FEEB8E42704E24C83C3EB2F86FB0B8A4A7": "1",
  "8859ADB48EEB42E67E250F32D6D05DBCC490A8A671FFEA0EF7C86CB02C401D3A": "2",
  "D69D8540C6C71558975B1552154D710DAA0CE2EB783F7232C95210D5D13C793C": "3",
  "53A23D451369CE77C35A6C2E04E92015CEEA940B1197D30DD8B1FBD19364D2F1": "4",
  "DA6CB88D46C8B827C2D101AABE06D388C1154E14BB2EC0A12DB3C64EFF19C29E": "5",
  "BB1780C090DB5BB4404AA7A47758A1327C35851F8F38A5229DE6765B0B8D9CBA": "6",
  "C7D390C23871628F5D7E9AD43FE5F0E338EE59D9F00C314500C4D600C8AD05D7": "7",
  "0D776B5239D311557AB937F25C6BB2C62F82AEB3CF14C5429A64EA8623DEBDA3": "8",
  "A86FE67B70A2116C533AFBEAFE659584BA546DC85CCC703E2CAE4FBCB612A5AD": "9",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const number = (value) => String(Math.round(Number(value) * 100_000) / 100_000);
const pathData = (contours, translateX) => contours.map(({ points }) => points.map(({ x, y }, index) => `${index ? "L" : "M"}${number((x + translateX) * SVG_UNITS_PER_MM)} ${number(y * SVG_UNITS_PER_MM)}`).join(" ") + " Z").join(" ");

const originalBytes = await readFile(ORIGINAL_PATH);
const originalSha256 = sha256(originalBytes);
if (originalSha256 !== EXPECTED_ORIGINAL_SHA256) throw new Error(`Immutable Pioneers source changed: ${originalSha256}`);
const original = inspectProductionAssetSvg({ bytes: originalBytes, filename: "rug nummers Pioneers senior 20cm.svg", mimeType: "image/svg+xml", intakeKind: "NUMBER_SET" });
const selectedByDigit = new Map();
const removedObjects = [];
for (const candidate of original.candidates) {
  const digit = DIGIT_BY_GEOMETRY_SHA256[candidate.geometryHash];
  if (digit === undefined) {
    removedObjects.push({ geometrySha256: candidate.geometryHash, widthMm: candidate.boundsMm.width, heightMm: candidate.boundsMm.height, contourCount: candidate.controlledVector.contours.length });
    continue;
  }
  if (selectedByDigit.has(digit)) throw new Error(`Dubbele enkelglyph voor ${digit}.`);
  selectedByDigit.set(digit, candidate);
}
if ([...Array(10).keys()].some((digit) => !selectedByDigit.has(String(digit)))) throw new Error("De aangeleverde bron dekt niet exact de cijfers 0–9 voor rugnummers 1 t/m 10.");
if (removedObjects.length !== 2) throw new Error(`Verwacht twee samengestelde dubbele bronobjecten; gevonden ${removedObjects.length}.`);

let offsetX = 0;
const paths = [];
for (let digit = 0; digit <= 9; digit += 1) {
  const candidate = selectedByDigit.get(String(digit));
  paths.push(`<path id="glyph-${digit}" data-digit="${digit}" data-original-geometry-sha256="${candidate.geometryHash}" fill="#000" fill-rule="evenodd" d="${pathData(candidate.controlledVector.contours, offsetX)}"/>`);
  offsetX += candidate.boundsMm.width + 20;
}
const artboardWidthMm = offsetX - 20;
const normalizedSvg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${number(artboardWidthMm)}mm" height="200.001mm" viewBox="0 0 ${number(artboardWidthMm * SVG_UNITS_PER_MM)} ${number(200.001 * SVG_UNITS_PER_MM)}" data-normalization="WBD_PIONEERS_DEDUP_V1" data-original-sha256="${originalSha256}">\n${paths.join("\n")}\n</svg>\n`;
const normalizedBytes = Buffer.from(normalizedSvg, "utf8");
const normalizedSha256 = sha256(normalizedBytes);
await writeFile(NORMALIZED_PATH, normalizedBytes);
const normalized = inspectProductionAssetSvg({ bytes: normalizedBytes, filename: "Almere-Pioneers-rugnummers-20cm.normalized.svg", mimeType: "image/svg+xml", intakeKind: "NUMBER_SET" });
if (normalized.candidates.length !== 10 || new Set(normalized.candidates.map(({ geometryHash }) => geometryHash)).size !== 10) throw new Error("De genormaliseerde production source bevat niet exact tien distincte enkelglyphs.");
const normalizedGlyphGeometrySha256ByDigit = Object.fromEntries(normalized.candidates.map((candidate, digit) => [String(digit), candidate.geometryHash]));
for (let digit = 0; digit <= 9; digit += 1) {
  const candidate = normalized.candidates[digit];
  if (Math.abs(candidate.boundsMm.height - 200) > 0.01) throw new Error(`Genormaliseerde glyph ${digit} is niet exact 200 mm hoog.`);
}

const definition = {
  key: "pioneers-rug-senior-200",
  filename: "Almere-Pioneers-rugnummers-20cm.normalized.svg",
  originalFilename: "rug nummers Pioneers senior 20cm.svg",
  name: "Almere Pioneers rugnummers 20 cm",
  ownerName: "Almere Pioneers",
  contextType: "ASSOCIATION",
  contextId: "association-03",
  placement: "Rugnummer",
  heightMm: 200,
  sha256: normalizedSha256,
  originalSha256,
  originalDataBase64: originalBytes.toString("base64"),
  dataBase64: normalizedBytes.toString("base64"),
  normalization: {
    method: "WBD_PIONEERS_DEDUP_V1",
    coverage: "RUGNUMMERS_1_THROUGH_10_DIGITS_0_THROUGH_9",
    selectedGlyphGeometrySha256ByDigit: Object.fromEntries([...selectedByDigit].map(([digit, candidate]) => [digit, candidate.geometryHash]).sort(([left], [right]) => left.localeCompare(right))),
    normalizedGlyphGeometrySha256ByDigit,
    removedCompositeObjects: removedObjects,
    visuallyReviewedAt: "2026-09-01",
    immutableOriginal: true,
  },
};
await writeFile(MODULE_PATH, `// Generated by scripts/generate-pioneers-number-source.mjs. Do not edit manually.\nexport const PIONEERS_NUMBER_SOURCE_DEFINITION = Object.freeze(${JSON.stringify(definition, null, 2)});\n`);
console.log(JSON.stringify({ originalSha256, originalCandidates: original.candidates.length, normalizedSha256, normalizedCandidates: normalized.candidates.length, removedCompositeObjects: removedObjects.length }, null, 2));
