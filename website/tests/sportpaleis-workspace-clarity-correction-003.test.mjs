import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateBedrukkenCheckoutTotal } from "../src/sportpaleis/workspace-data.ts";

const sourceUrl = new URL("../src/sportpaleis-workspace.ts", import.meta.url);
const stylesUrl = new URL("../src/styles/sportpaleis-workspace.css", import.meta.url);

test("clarity correction 003 houdt Bedrukken taakgericht en rekent uitsluitend bedrukkingskosten", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /SPW-PILOT-FINAL-SMOOTH-POLISH-004-20260814/u);
  const steps = ["<h2>Klant</h2>", "<h2>Vereniging</h2>", "<h2>Kies de artikelen</h2>", "<h2>Wat moet erop?</h2>", "<h2>Controleer de order</h2>"].map((marker) => source.indexOf(marker));
  assert.ok(steps.every((position) => position >= 0));
  assert.deepEqual([...steps].sort((left, right) => left - right), steps);
  assert.match(source, /calculateBedrukkenCheckoutTotal\(\[\{ personalizations: printingPrices \}\]\)/u);
  assert.match(source, /<span>Totaal bedrukking<\/span>/u);
  assert.match(source, /<summary>Artikelen en overige bedragen<\/summary>/u);
  assert.match(source, /Deze bedragen tellen niet mee in het totaal voor Bedrukken/u);
  assert.deepEqual(calculateBedrukkenCheckoutTotal([{ articleUnitPriceEur: 79.95, personalizations: [{ quantity: 2, unitPriceEur: 4.5 }, { quantity: 1, unitPriceEur: 9.95 }] }]), { totalEur: 18.95, missingPriceCount: 0 });
});

test("clarity correction 003 bewaart bewijs achter details en toont menselijke primaire acties", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.ok((source.match(/<summary>Technische details<\/summary>/gu) ?? []).length >= 8);
  assert.match(source, /Bestandshash[\s\S]*Snapshot-hash/u);
  assert.match(source, /const artifactDownload = [\s\S]*sp-button--primary/u);
  assert.match(source, /<h2>Productiebestand<\/h2>[\s\S]*\$\{artifactDownload\}[\s\S]*<summary>Opnieuw plotten<\/summary>/u);
  assert.match(source, /<h2>Alles gecontroleerd\?<\/h2>/u);
  assert.match(source, /Goedkeuren en productiejob maken/u);
  assert.doesNotMatch(source, /Human GO/u);
  assert.match(source, /<summary>Gebruiker uitnodigen<\/summary>/u);
  assert.match(source, /<summary>Lettertype toevoegen<\/summary>/u);
  assert.match(source, /<summary>Technische productie-instellingen<\/summary>/u);
});

test("clarity correction 003 maakt het accountmenu bruikbaar en voorkomt mobiele actie-overlap", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const styles = await readFile(stylesUrl, "utf8");
  for (const label of ["Mijn werk", "Mijn weergave", "Gebruikers beheren", "Vergrendelen", "Uitloggen"]) assert.match(source, new RegExp(label));
  assert.match(styles, /\.sp-action-notice\{position:static;max-width:none\}/u);
  assert.match(styles, /\.sp-form-actions \.sp-button--primary\{grid-row:1\}/u);
  assert.match(styles, /\.sp-proposal-go \.sp-button\{width:100%;min-height:50px\}/u);
  assert.match(styles, /\.sp-production-summary-facts\{grid-template-columns:1fr\}/u);
});
