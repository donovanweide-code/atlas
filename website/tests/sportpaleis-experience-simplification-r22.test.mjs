import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";

const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
const teamwear = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");

test("Creative Studio begint bij bron en taak in plaats van verplichte interne classificatie", () => {
  const start = workspace.slice(workspace.indexOf('head("CREATIVE STUDIO", "Maak direct iets sterks"'), workspace.indexOf("function visualStudioFormPayload"));
  assert.match(start, /Plak of sleep je beeld hier/u);
  assert.match(start, /Direct naar canvas/u);
  assert.match(start, /Homepage \/ banner/u);
  assert.doesNotMatch(start, /name="sourceIntent"/u);
  assert.doesNotMatch(start, /Seizoenstart/u);
  assert.doesNotMatch(start, /Product in de hoofdrol/u);
  assert.match(workspace, /source \? "PRESERVE_SOURCE" : "PRODUCT_ONLY"/u);
});

test("Creative Studio canvas ondersteunt directe manipulatie met dezelfde formulierwaarheid", () => {
  assert.match(workspace, /data-visual-drag-key="product"/u);
  assert.match(workspace, /data-visual-drag-key="asset:/u);
  assert.match(workspace, /setPointerCapture/u);
  assert.match(workspace, /xInput\.dispatchEvent\(new Event\("input"/u);
  assert.match(styles, /cursor:grab;touch-action:none/u);
});

test("Vrije opdruk begint bij productieobjecten en accepteert reeksen, vrije waarden en tekstuele nummers", () => {
  const section = workspace.slice(workspace.indexOf("function freePrintingOrder"), workspace.indexOf("function productionFonts"));
  assert.match(section, /Wat moet ik maken\?/u);
  assert.match(section, /Snelle lijst of reeks/u);
  assert.match(section, /Optionele order- of artikelcontext/u);
  assert.doesNotMatch(section, /name="customer" required/u);
  assert.match(workspace, /dataset\.action === "add-free-bulk"/u);
  assert.match(workspace, /Meerdere opdrukken tegelijk aanpassen/u);
  assert.match(workspace, /dataset\.action === "apply-free-bulk-settings"/u);
  assert.match(workspace, /selectedIds\.size/u);
  assert.doesNotMatch(workspace, /line\.content = line\.content\.replace\(\/\\D/u);
  assert.deepEqual(parseTeamProductionLines("1 t/m 3\n99 x 2\nMW"), [
    { value: "1", quantity: 1 }, { value: "2", quantity: 1 }, { value: "3", quantity: 1 }, { value: "99", quantity: 2 }, { value: "MW", quantity: 1 },
  ]);
});

test("Teamwear toont geen databasewand en neemt een exacte bekende context automatisch over", () => {
  assert.match(teamwear, /Begin met typen/u);
  assert.match(teamwear, /context\.id !== requestedContextId \? "hidden"/u);
  assert.match(workspace, /exact\.length === 1/u);
  assert.match(workspace, /Automatisch herkend/u);
  assert.match(teamwear, /Alleen indien nodig: team, contact of planning/u);
});

test("Productie en ordercorrectie tonen de kleinste volgende handeling", () => {
  assert.match(workspace, /action: "Foliekleur kiezen"/u);
  assert.match(workspace, /orders\/nieuw\?edit=.*#bedrukking/u);
  assert.match(workspace, /Naam, e-mail of telefoon wijzigen/u);
  assert.match(workspace, /Artikelen en bedrukking blijven ongewijzigd/u);
  assert.match(workspace, /id="bedrukking" data-printing-step/u);
});
