import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const proofSource = readFileSync(
  new URL("../src/sportpaleis-proof.ts", import.meta.url),
  "utf8",
);
const internalMain = readFileSync(
  new URL("../src/internal-main.ts", import.meta.url),
  "utf8",
);

test("de interne V3-richtingsproef behoudt de lokale route", () => {
  assert.match(internalMain, /sportpaleis-proof/);
  assert.match(proofSource, /Productiewerkplek/);
});

test("de compacte winkelorderkop toont handmatige klantcontext", () => {
  assert.match(proofSource, /SP-2026-0104/);
  assert.match(proofSource, /Daniël Wouters/);
  assert.match(proofSource, /Winkel/);
  assert.match(proofSource, /demo@sportpaleis\.test/);
  assert.match(proofSource, /06 0000 0000/);
  assert.match(proofSource, /A\.S\.C\. Waterwijk/);
  assert.match(proofSource, />Open</);
  assert.doesNotMatch(proofSource, /WEB-EMAIL-1042/);
});

test("standaardbedrukking is invoergericht en de catalogus bevat zestien artikelen", () => {
  assert.match(proofSource, /Standaardbedrukking/);
  assert.match(proofSource, /data-default="initials"/);
  assert.match(proofSource, /data-default="backNumber"/);
  assert.match(proofSource, /data-default="shortsNumber"/);
  assert.equal(proofSource.match(/articleNumber: "ASC-/g)?.length, 16);
});

test("de beginsituatie bevat precies één zichtbare afwijking", () => {
  assert.equal(proofSource.match(/backNumberOverride: "14"/g)?.length, 1);
});

test("selectie, aantallen, afwijking en optionele maat zijn lokaal simuleerbaar", () => {
  assert.match(proofSource, /data-select-article/);
  assert.match(proofSource, /data-quantity/);
  assert.match(proofSource, /data-override/);
  assert.match(proofSource, /data-size/);
  assert.match(proofSource, /Math\.max\(1/);
  assert.doesNotMatch(proofSource, /localStorage|sessionStorage|fetch\(/);
});

test("contactvalidatie en verenigingsprofiel blijven visueel en secundair", () => {
  assert.match(proofSource, /Validatievoorbeeld/);
  assert.match(proofSource, /Spain/);
  assert.match(proofSource, /23,5 cm/);
  assert.match(proofSource, /Nog te valideren/);
});

test("de proef gebruikt het officiële logo en lokale echte productbeelden", () => {
  assert.match(proofSource, /sportpaleis-logo\.svg/);
  assert.match(proofSource, /asc-shirt-home\.webp/);
  assert.doesNotMatch(proofSource, /sportpaleis-demo-teamwear-v01/);
});
