import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/sportpaleis-workspace.ts", import.meta.url);
const stylesUrl = new URL("../src/styles/sportpaleis-workspace.css", import.meta.url);

test("Premium Shell maakt Today, Orders, Webshop en Productie taakgericht zonder nieuwe module-routes", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /data-premium-shell="v1"/u);
  assert.match(source, /VOLGENDE BESTE ACTIE/u);
  assert.match(source, /sp-dashboard--today/u);
  assert.match(source, /Meer filters/u);
  assert.match(source, /function webshopImport[\s\S]*Webshoporders[\s\S]*data-order-row/u);
  assert.match(source, /function webshopAdmin/u);
  assert.match(source, /current === `\$\{BASE\}\/beheer\/webshop`/u);
  assert.match(source, /sp-production-ready-group[\s\S]*nu produceren/u);
  assert.match(source, /Wacht op huidige fysieke stap/u);
  assert.doesNotMatch(source.slice(source.indexOf("function shell"), source.indexOf("function winkel")), /href="\$\{BASE\}\/voorstellen"/u);
});

test("Webshop scheidt dagelijks orderwerk van importbeheer", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const daily = source.slice(source.indexOf("function webshopImport"), source.indexOf("function webshopAdmin"));
  const admin = source.slice(source.indexOf("function webshopAdmin"), source.indexOf("function allWorkspace"));
  assert.match(daily, /sourceContext\?\.source === "WEBSHOP_XPRT"/u);
  assert.match(daily, /Ordernummer, klant of vereniging/u);
  assert.doesNotMatch(daily, /importplanning|startBoundary|retrievalMode/iu);
  assert.match(admin, /Import & synchronisatie/u);
  assert.match(admin, /data-mailbatch-import-form/u);
  assert.match(admin, /Geavanceerd · planning en bronstatus/u);
});

test("foto-entrypoint is geparkeerd terwijl document- en evidencefoundation behouden blijven", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const intake = source.slice(source.indexOf("function quickProductionIntake"), source.indexOf("function proofLabel"));
  assert.match(intake, /Order uit document/u);
  assert.match(intake, /application\/pdf,text\/plain,message\/rfc822/u);
  assert.match(intake, /sourceKind === "PHOTO"/u, "bestaande evidence kan nog steeds worden geopend");
  assert.doesNotMatch(intake, /capture="environment"/u);
  assert.doesNotMatch(intake, /Foto maken/u);
});

test("artikel 140298 toont Initialen direct en aanvullende nummers via progressive disclosure", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const printing = source.slice(source.indexOf("function standardPrinting"), source.indexOf("function standardPrintingSummary"));
  assert.match(printing, /articleNumber === "140298"/u);
  assert.match(printing, /field !== "backNumber" && field !== "chestNumber"/u);
  assert.match(printing, /\+ Rugnummer of borstnummer toevoegen/u);
  assert.match(printing, /additionalFields\.map\(renderField\)/u);
});

test("Premium Shell centraliseert tokens en bewaakt desktop, mobile, focus en reduced motion", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  for (const token of ["--sp-shell-bg", "--sp-surface", "--sp-text-muted", "--sp-radius-lg", "--sp-shadow-soft", "--sp-focus"]) assert.match(styles, new RegExp(token));
  assert.match(styles, /:focus-visible/u);
  assert.match(styles, /@media\(max-width:760px\)/u);
  assert.match(styles, /@media\(max-width:360px\)/u);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/u);
  assert.match(styles, /\.sp-mobile-nav\{position:fixed/u);
  assert.match(styles, /\.sp-production-select-all\{position:absolute/u);
});
