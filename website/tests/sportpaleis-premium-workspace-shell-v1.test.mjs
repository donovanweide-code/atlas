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
  assert.match(daily, /Volledig ordernummer, laatste 3 cijfers of klantnaam/u);
  assert.doesNotMatch(daily, /importplanning|startBoundary|retrievalMode/iu);
  assert.match(admin, /Import & synchronisatie/u);
  assert.match(admin, /data-webshop-document-intake-form/u);
  assert.match(admin, /Geavanceerd · planning en bronstatus/u);
});

test("foto-entrypoint bewaart iedere foto als afzonderlijke intake en behoudt document/evidencefoundation", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const intake = source.slice(source.indexOf("function quickProductionIntake"), source.indexOf("function proofLabel"));
  assert.match(intake, /Order uit foto of document/u);
  assert.match(intake, /image\/jpeg,image\/png,image\/webp,application\/pdf,text\/plain,message\/rfc822/u);
  assert.match(intake, /sourceKind === "PHOTO"/u, "bestaande evidence kan nog steeds worden geopend");
  assert.match(intake, /capture="environment"/u);
  assert.match(intake, /Foto maken/u);
  assert.match(intake, /Iedere gekozen foto wordt een afzonderlijke intake met eigen bewijs/u);
  assert.match(source, /for \(const file of files\)/u, "meerdere bronnen lopen als afzonderlijke server-intakes door dezelfde veilige route");
});

test("artikel 140298 toont Initialen direct en aanvullende nummers via progressive disclosure", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const printing = source.slice(source.indexOf("function standardPrinting"), source.indexOf("function standardPrintingSummary"));
  assert.match(printing, /articleNumber === "140298"/u);
  assert.match(printing, /field !== "chestNumber" && \(field !== "backNumber" \|\| requiredStandardField\(state, field\)\)/u);
  assert.match(printing, /field === "chestNumber" \|\| field === "backNumber" && !requiredStandardField\(state, field\)/u);
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

test("Sportpaleis visual final polish gebruikt merkcontrols en één City-artworkkolom op mobiel", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /--sp-control-radius:6px/u);
  assert.match(styles, /--sp-focus:#b9162b/u);
  assert.match(styles, /\.sp-topbar\{border-bottom-color:#292929;background:#090909;color:#fff/u);
  assert.match(styles, /\.sp-production-context-nav \.sp-button::after\{content:"›"/u);
  assert.match(styles, /\.sp-asset-library-tabs button\.is-active\{border-color:#181818;background:#181818;color:#fff/u);
  assert.match(styles, /\.sp-asset-candidate input\[type=checkbox\]\{accent-color:var\(--sp-accent\)\}/u);
  assert.match(styles, /input\[type=checkbox\],input\[type=radio\]\{accent-color:var\(--sp-accent\)\}/u);
  assert.match(styles, /\.sp-mobile-nav \.sp-nav__item\.is-active\{background:#181818;color:#fff/u);
  assert.match(styles, /\.sp-catalog-card\.is-selected\{border-color:var\(--sp-accent\);background:#fff7f8/u);
  assert.match(styles, /@media\(max-width:600px\)\{[\s\S]*\.sp-asset-source \.sp-asset-candidate-grid\{grid-template-columns:1fr/u);
  assert.match(styles, /\.sp-asset-source \.sp-asset-split-card__choice input\{width:24px;height:24px/u);
});
