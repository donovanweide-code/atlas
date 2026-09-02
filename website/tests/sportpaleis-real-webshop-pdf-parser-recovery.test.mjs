import assert from "node:assert/strict";
import test from "node:test";
import { parseSportpaleisDividePdfText } from "../scripts/sportpaleis-divide-import.mjs";

const sourceHash = "a".repeat(64);
const row = (y, cells) => ({ y, cells: cells.map(([x, text]) => ({ x, text })) });

test("positionele Divide-tabel bewaart klantdata en decorations per artikelregel", () => {
  const pages = ["Bestelnummer: 2635358683\nBesteldatum: 27-08-2026"];
  const layoutPages = [[
    row(740, [[36, "Gegevens"], [216, "Factuuradres"], [396, "Afleveradres"]]),
    row(725, [[36, "dhr. Test Klant"], [216, "Teststraat 1"]]),
    row(710, [[36, "Telefoon: 0612345678"]]),
    row(695, [[36, "E-mail: test@example.invalid"]]),
    row(650, [[20, "Productafbeelding"], [120, "Artikelnummer"], [230, "Omschrijving"], [430, "Maat"], [500, "Kleur"], [590, "Aantal"], [700, "Totaal"]]),
    row(600, [[120, "116597"], [230, "Wedstrijdshirt"], [430, "L"], [500, "ZWART"], [590, "1"]]),
    row(575, [[230, "Rugnummer: 88"]]),
    row(540, [[120, "141521"], [230, "Wedstrijdshort"], [430, "L"], [500, "ZWART"], [590, "1"]]),
    row(515, [[230, "Nummer: 88"]]),
    row(480, [[120, "141522"], [230, "Trainingsbroek"], [430, "L"], [500, "ZWART"], [590, "1"]]),
    row(100, [[590, "Subtotaal"]]),
  ]];
  const order = parseSportpaleisDividePdfText({ pages, layoutPages, sourceDocumentId: sourceHash, sourceHash }).orders[0];
  assert.deepEqual([order.customer, order.customerPhone, order.customerEmail], ["dhr. Test Klant", "0612345678", "test@example.invalid"]);
  assert.equal(order.articles.length, 3);
  assert.equal(order.productionLines.length, 2);
  assert.deepEqual(order.productionLines.map((line) => [line.articleNumber, line.personalization[0].kind, line.personalization[0].value]), [
    ["116597", "BACK_NUMBER", "88"],
    ["141521", "NUMBER", "88"],
  ]);
  assert.equal(new Set(order.productionLines.flatMap((line) => line.personalization.map(({ decorationIdentity }) => decorationIdentity))).size, 2);
  assert.equal(order.sourceChannel, "WEBSHOP");
});

test("tekstueel Shortnummer blijft brongetrouw maar fail-closed; legacy labels blijven ondersteund", () => {
  const pages = [[
    "Bestelnummer: 2635358663", "Artikelnummer: 140295", "Omschrijving: Short", "Maat: M", "Kleur: ZWART", "Aantal: 2", "Shortnummer: MW",
    "Artikelnummer: 138505", "Omschrijving: Jacket", "Maat: 152", "Kleur: ZWART", "Aantal: 1", "Naam opdruk: Luca",
  ].join("\n")];
  const order = parseSportpaleisDividePdfText({ pages, sourceDocumentId: sourceHash, sourceHash }).orders[0];
  assert.equal(order.status, "ATTENTION_REQUIRED");
  assert.deepEqual(order.productionLines.flatMap((line) => line.personalization.map(({ kind, value, sourceValue, status }) => [line.articleNumber, line.quantity, kind, value, sourceValue, status])), [
    ["140295", 2, "SHORTS_NUMBER", "MW", "MW", "ATTENTION_REQUIRED"],
    ["138505", 1, "NAME_PRINT", "Luca", "Luca", "EXPLICIT"],
  ]);
});

test("niet-numerieke generieke nummerwaarde blijft fail-closed", () => {
  const pages = ["Bestelnummer: 2635358000\nArtikelnummer: 141705\nOmschrijving: Short\nMaat: M\nKleur: ZWART\nAantal: 1\nNummer: AB"];
  const order = parseSportpaleisDividePdfText({ pages, sourceDocumentId: sourceHash, sourceHash }).orders[0];
  assert.equal(order.status, "ATTENTION_REQUIRED");
  assert.equal(order.attention[0].code, "DECORATION_VALUE_CHECK_REQUIRED");
});
