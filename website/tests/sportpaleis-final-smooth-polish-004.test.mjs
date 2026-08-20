import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { calculateBedrukkenCheckoutTotal } from "../src/sportpaleis/workspace-data.ts";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";

const sourceUrl = new URL("../src/sportpaleis-workspace.ts", import.meta.url);
const serviceUrl = new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url);
const stylesUrl = new URL("../src/styles/sportpaleis-workspace.css", import.meta.url);
const passwords = { kevin: "Smooth-Kevin-2026!", patrick: "Smooth-Patrick-2026!", collega: "Smooth-Store-2026!", "donovan-support": "Smooth-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-smooth-polish-004-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, releaseId: "SPW-PILOT-FINAL-SMOOTH-POLISH-004-20260814", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

test("Teamorder accepteert geldige verwerkte invoer zonder verborgen native required-blokkade", async () => {
  assert.deepEqual(parseTeamProductionLines("1 t/m 18\n34\nDW x 2"), [
    ...Array.from({ length: 18 }, (_, index) => ({ value: String(index + 1), quantity: 1 })),
    { value: "34", quantity: 1 },
    { value: "DW", quantity: 2 },
  ]);
  assert.throws(() => parseTeamProductionLines(""), /1 tot 50 regels/u);
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /name="teamLines:\$\{kind\}"/u);
  for (const kind of ["backNumber", "shortsNumber", "initials", "name"]) assert.match(source, new RegExp(`block\\("${kind}"`, "u"));
  assert.match(source, /data-action="prepare-team-production">Overzicht maken/u);
  assert.match(source, /type="submit" \$\{teamPreparedRows\.length \? "" : "disabled"\}>Teamorder bevestigen/u);
});

test("Vrije opdruk accepteert ontbrekend artikel en maat in UI en server", async (context) => {
  const source = await readFile(sourceUrl, "utf8");
  const serviceSource = await readFile(serviceUrl, "utf8");
  assert.match(source, /Artikel \(optioneel\)<input name="product" placeholder=/u);
  assert.match(source, /Maat \(optioneel\)<input name="size" placeholder=/u);
  assert.doesNotMatch(source, /Artikel<input name="product" required/u);
  assert.match(serviceSource, /options\.freeProduction \? \(optional\(item\.product, 120\) \|\| "Vrije opdruk"\)/u);

  const { service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const profile = state.productionProfiles.find(({ id }) => id !== "profile-none");
  assert.ok(profile);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    productionLines: [{ id: "free-line-1", type: "TEXT", content: "SPORT", sourceId: profile.id, widthMm: 100, heightMm: 30, quantity: 1, previewLabel: "SPORT", provenance: "Gerichte optionaliteitscontrole" }],
    items: [{ product: "", association: "Vrije bedrukking", size: "", quantity: 1, personalization: "SPORT ×1", deviation: true, overrides: empty }],
  }, "smooth-polish-free-optional")).value;
  assert.equal(created.items[0].product, "Vrije opdruk");
  assert.equal(created.items[0].size, "Niet opgegeven");
  assert.equal(created.productionLines.length, 1);
});

test("polish maakt taak en werk primair zonder auditgegevens te verwijderen", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const styles = await readFile(stylesUrl, "utf8");
  assert.match(source, /SPW-PILOT-FINAL-SMOOTH-POLISH-004-20260814/u);
  assert.match(source, /head\("PRODUCTIEVOORSTEL", "Productiewerk uitvoeren"/u);
  assert.match(source, /head\("PRODUCTIEBESTAND", esc\(snapshot\.association\)/u);
  assert.match(source, /<h2>Te maken werk<\/h2>/u);
  assert.match(source, /Bestandshash[\s\S]*Snapshot-hash/u);
  assert.match(source, /<summary>Technische details<\/summary>/u);
  assert.match(styles, /font-size:clamp\(30px,3vw,42px\)/u);
  assert.match(styles, /\.sp-proposal-groups>\.sp-production-line-proposal\{grid-column:1\}/u);
});

test("Bedrukken-prijs blijft uitsluitend personalisatiekosten", () => {
  assert.deepEqual(calculateBedrukkenCheckoutTotal([{ articleUnitPriceEur: 79.95, personalizations: [{ quantity: 2, unitPriceEur: 4.5 }, { quantity: 1, unitPriceEur: 9.95 }] }]), { totalEur: 18.95, missingPriceCount: 0 });
});
