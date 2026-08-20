import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { SPORTPALEIS_ASSOCIATION_LOGOS } from "../config/sportpaleis-association-logos.generated.mjs";
import {
  SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS,
  SPORTPALEIS_LIVE_HUMAN_CONFIRMATION_REQUIRED_ARTICLES,
  SPORTPALEIS_LIVE_PILOT_ARTICLES,
} from "../config/sportpaleis-final-prelive-catalog.generated.mjs";
import { SPORTPALEIS_ASSOCIATIONS } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { createSportpaleisProductionBootstrap } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { associationPersonalizationModel } from "../src/sportpaleis/order-personalization.ts";

const ZERO_PRINT_ASSOCIATIONS = ["Almere'81", "Buitenhout MHC", "HBSA", "Sloeproeien"];
const PHYSICAL_SVG_SHA256 = "26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6";

test("final pre-live catalogus 006 bevat exact de gevalideerde 183/267-grens", async () => {
  assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.length, 183);
  assert.equal(SPORTPALEIS_LIVE_HUMAN_CONFIRMATION_REQUIRED_ARTICLES.length, 267);
  assert.equal(new Set(SPORTPALEIS_LIVE_PILOT_ARTICLES.map(({ id }) => id)).size, 183);
  assert.equal(new Set(SPORTPALEIS_LIVE_PILOT_ARTICLES.map(({ association }) => association)).size, 16);
  assert.deepEqual(SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.filter(({ confirmedPrintArticleCount }) => confirmedPrintArticleCount === 0).map(({ association }) => association), ZERO_PRINT_ASSOCIATIONS);
  for (const article of SPORTPALEIS_LIVE_PILOT_ARTICLES) {
    assert.equal(article.printRelevance.status, "CONFIRMED_VISIBLE_PERSONALIZATION");
    assert.ok(article.supports.length > 0, article.id);
    assert.ok(article.catalogProvenance.url.startsWith("https://www.sportpaleis.nl/"), article.id);
    assert.ok(article.catalogProvenance.imageUrl.startsWith("https://www.sportpaleis.nl/"), article.id);
    assert.ok(article.availableSizes.length > 0, article.id);
    assert.ok(article.availableSizes.every((size) => typeof article.priceConfiguration.articleUnitPricesBySizeEur[size] === "number"), article.id);
    assert.ok(Object.values(article.priceConfiguration.personalizationUnitPricesEur).some((value) => typeof value === "number"), article.id);
    await access(new URL(`../src/assets/images/sportpaleis/live-catalog/${article.imageKey}.webp`, import.meta.url));
  }
});

test("alle 20 first-party verenigingslogo's en hun provenance zijn lokaal vastgelegd", async () => {
  assert.equal(SPORTPALEIS_ASSOCIATIONS.length, 20);
  assert.equal(Object.keys(SPORTPALEIS_ASSOCIATION_LOGOS).length, 20);
  for (const association of SPORTPALEIS_ASSOCIATIONS) {
    const logo = SPORTPALEIS_ASSOCIATION_LOGOS[association.name];
    assert.ok(logo, association.name);
    assert.equal(logo.authority, "SPORTPALEIS_LIVE_ASSOCIATION_PAGE");
    assert.ok(logo.sourceUrl.startsWith("https://www.sportpaleis.nl/img/"));
    assert.match(logo.sha256, /^[A-F0-9]{64}$/u);
    assert.equal(association.workspaceLogo.sha256, logo.sha256);
    await access(new URL(`../public/assets/organizations/sportpaleis/association-logos/${logo.filename}`, import.meta.url));
  }
});

test("Bedrukken toont dynamisch alleen de 16 verenigingen met actuele artikelen", async () => {
  const available = SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.filter(({ confirmedPrintArticleCount }) => confirmedPrintArticleCount > 0).map(({ association }) => association);
  assert.equal(available.length, 16);
  for (const association of available) assert.ok(associationPersonalizationModel(SPORTPALEIS_LIVE_PILOT_ARTICLES, association).articles.length > 0, association);
  for (const association of ZERO_PRINT_ASSOCIATIONS) assert.deepEqual(associationPersonalizationModel(SPORTPALEIS_LIVE_PILOT_ARTICLES, association), { articles: [], fields: [] });
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /associationNames\(state\)\.filter\(\(association\) => orderableAssociations\.has\(association\)\)/u);
  assert.match(source, /SPW-PILOT-FINAL-SMOOTH-POLISH-004-20260814/u);
});

test("werknemer 45 is onafhankelijk van logins en fysiek bewijs blijft immutable", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-08-12T12:00:00.000Z"));
  assert.equal(state.employees.filter(({ salesNumber }) => salesNumber === "45").length, 1);
  assert.ok(state.employees.every(({ userId }) => userId === null), "verkoopcodes maken geen loginaccounts");
  assert.ok(state.employeeDirectorySource?.suppliedNamedCodes > 1);
  assert.equal(state.users.length, 0);
  const physical = state.productionJobs.find(({ jobNumber }) => jobNumber === "PLOT-2026-0004");
  assert.equal(physical.proofStatus, "PHYSICALLY_VALIDATED");
  assert.equal(physical.humanAcceptance.status, "PASS");
  assert.equal(physical.snapshot.artifact.sha256, PHYSICAL_SVG_SHA256);
  assert.equal(physical.snapshot.artifact.version, "cutjob-svg@1");
});
