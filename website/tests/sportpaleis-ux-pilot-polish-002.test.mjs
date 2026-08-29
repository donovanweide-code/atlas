import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Pilot polish 002 gebruikt gewone werktaal en een herkenbare ordervolgorde", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  for (const label of ["<h2>Klant</h2>", "<h2>Vereniging</h2>", "<h2>Kies de artikelen</h2>", "<h2>Wat moet erop?</h2>", "<h2>Controleer de order</h2>"]) assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(source.indexOf("<h2>Klant</h2>") < source.indexOf("<h2>Vereniging</h2>"));
  assert.ok(source.indexOf("<h2>Vereniging</h2>") < source.indexOf("<h2>Kies de artikelen</h2>"));
  assert.ok(source.indexOf("<h2>Kies de artikelen</h2>") < source.indexOf("<h2>Wat moet erop?</h2>"));
  assert.ok(source.indexOf("<h2>Wat moet erop?</h2>") < source.indexOf("<h2>Controleer de order</h2>"));
  assert.doesNotMatch(source, /Naam \/ initialen controleren/);
  assert.doesNotMatch(source, /Wie staat er aan de balie\?/);
  assert.doesNotMatch(source, /KLANT · VERPLICHT/);
});

test("Verenigingen zijn schaalbaar en behouden bronvolgorde zonder alfabetische hersortering", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /function associationNames/);
  assert.match(source, /data-association-search/);
  assert.match(source, /sp-association-picker/);
  assert.doesNotMatch(source, /sp-association-rail__list/);
  assert.match(source, /sp-association-admin-layout/);
  assert.doesNotMatch(source, /map\(\(\{ association \}\) => association\)\)\.sort\(\)/);
});

test("Orders scheiden status, aandacht en gereed werk", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /activeOrderFilter/);
  assert.match(source, /data-action="order-filter"/);
  assert.match(source, /function productionPill/);
  assert.match(source, /ATTENTION: "Aandacht nodig", READY: "Klaar om te produceren", IN_PRODUCTION: "In productie", PARTIALLY_PRODUCED: "Deels geproduceerd", FULLY_PRODUCED: "Volledig geproduceerd", DONE: "Gereed"/);
  assert.doesNotMatch(source, /if \(order\.attention\) return \{ label: "Aandacht nodig"/);
});

test("Productie scheidt geblokkeerd en maakbaar werk en verbergt ontwikkelaarstaal", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /productionStatus === "READY" \|\| isActiveProductionStatus\(productionStatus\)/);
  assert.match(source, /Nog niet maakbaar/);
  assert.match(source, /Klaar om te produceren/);
  assert.match(source, /Bekijk wat nodig is/);
  for (const phrase of ["Keyboard-wedge datamodel voorbereid", "BARCODE FOUNDATION", "hardwareSendEnabled=false", "FEATURE FLAG UIT"]) assert.doesNotMatch(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Gebruikersbeheer houdt toegang primair en rechten plus uitnodigen bewust secundair", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /function userAdmin/);
  assert.match(source, /function userDetail/);
  assert.match(source, /Rol bepaalt de standaardrechten/);
  assert.match(source, /Toegang bepaalt of iemand kan inloggen/);
  assert.match(source, /class="sp-panel sp-invite-user"/);
  assert.match(source, /<summary>Gebruiker uitnodigen<\/summary>/);
  assert.match(source, /class="sp-panel sp-user-rights"/);
});

test("Layout contract voorkomt desktop- en 390px-overflow en houdt focus zichtbaar", async () => {
  const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(styles, /html, body, #app \{ max-width: 100%; overflow-x: clip; \}/);
  assert.match(styles, /\.sp-main \{ width: 100%; max-width: 1400px; min-width: 0; \}/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /\.sp-order-row-v2 \{ grid-template-columns: 24px minmax\(0, 1fr\)/);
});
