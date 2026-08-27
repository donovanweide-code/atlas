import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Guided Setup toont iedere verplichte Product Truth-dimensie en concrete vervolgstap", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  for (const label of ["Vereniging", "Sync", "Artikelen", "Logo/assets", "Plaatsingen", "Fonts", "Maten", "Kleuren", "Productiemethode", "Compleetheid", "Actie"]) {
    assert.match(source, new RegExp(`<span>${label.replace("/", "\\/")}<\\/span>`, "u"), `${label} ontbreekt in het finale beheeroverzicht`);
  }
  assert.match(source, /Klaar[\s\S]*Automatisch hersteld[\s\S]*Actie nodig/u);
  assert.match(source, /beheer\/verenigingen\?vereniging=/u);
  assert.match(source, /beheer\/productieprofielen\?vereniging=/u);
  assert.match(source, /Controleer .* in .*\. Na bevestiging verdwijnt deze actie|productiebron ontbreekt/u);
  assert.match(source, /Geen actie nodig/u);
});

test("Teamwear-begeleiding, contextassets en garment surfaces blijven in de finale shell verankerd", async () => {
  const experience = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/sportpaleis-teamwear.css", import.meta.url), "utf8");
  assert.match(experience, /Context[\s\S]*Collectie[\s\S]*Studio[\s\S]*Voorstel & akkoord[\s\S]*Maten & aantallen[\s\S]*Afhandeling/u);
  assert.match(experience, /const contextAssets = clubAssets\(state, proposal\)/u);
  assert.match(experience, /studio-filter-assets[\s\S]*CLUB_LOGO[\s\S]*SPONSOR[\s\S]*NAME[\s\S]*BACK_NUMBER[\s\S]*FREE_TEXT/u);
  assert.match(experience, /aria-label="Collectie in Studio"/u);
  assert.match(experience, /GARMENT_SURFACE_V1/u);
  assert.match(workspace, /Bestaande klant, vereniging of team/u);
  assert.match(workspace, /Contact, planning en overige gegevens/u);
  assert.match(workspace, /Naar collectie/u);
  assert.match(styles, /GARMENT_SURFACE_V1/u);
  assert.match(styles, /LEFT_SLEEVE[\s\S]*RIGHT_SLEEVE[\s\S]*FRONT_TORSO[\s\S]*BACK_TORSO/u);
  assert.match(styles, /Tenant-brand enforcement/u);
  assert.match(styles, /#b30f26|#d3172f/u);
});
