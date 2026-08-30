import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";

import { createSportpaleisProductionBootstrap, migrateSportpaleisPilotState, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { OWNER_SUPPLIED_FONT_EVIDENCE } from "../src/sportpaleis/front-name-production-truth.mjs";

const EXPECTED_ID = "font-5d083befacdf98ae";
const EXPECTED_HASH = "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585";
const passwords = { kevin: "R218-Kevin-Truth!", patrick: "R218-Patrick-Truth!", collega: "R218-Store-Truth!", "donovan-support": "R218-Support-Truth!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r218-spain-"));
  const runtimeArtifactRoot = path.join(root, "runtime");
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), runtimeArtifactRoot, allowedOrigin: "https://workspace.sportpaleis.nl" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, runtimeArtifactRoot, store, service, admin };
}

test("Spain Euro 2016-bronbytes en interne fontidentity zijn exact authoritative", async () => {
  const sourceUrl = new URL("../public/assets/organizations/sportpaleis/fonts/Spain%20Euro%202016.ttf", import.meta.url);
  const bytes = await readFile(sourceUrl);
  const font = fontkit.openSync(fileURLToPath(sourceUrl));
  assert.equal(bytes.length, 15_232);
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), EXPECTED_HASH);
  assert.equal(`font-${EXPECTED_HASH.slice(0, 16).toLowerCase()}`, EXPECTED_ID);
  assert.deepEqual(
    [font.familyName, font.subfamilyName, font.fullName, font.postscriptName],
    [OWNER_SUPPLIED_FONT_EVIDENCE.spain.familyName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.subfamilyName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.fullName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.postscriptName],
  );
});

test("bootstrap en migratie registreren exact één canonieke Spain-master met provenance", async (context) => {
  const { store, admin } = await fixture(context);
  const state = await store.read();
  const matches = state.productionFonts.filter(({ id, sha256 }) => id === EXPECTED_ID || sha256 === EXPECTED_HASH);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, EXPECTED_ID);
  assert.equal(matches[0].sizeBytes, 15_232);
  assert.equal(matches[0].postscriptName, "SpainEuro-Regular");
  assert.match(matches[0].provenance, /Donovan.*2026-08-30.*historische Human Product Truth/u);
  assert.ok(state.audit.every(({ action }) => action !== "Productiefont toegevoegd"), "seed/migratie mag geen menselijke uploadactie fabriceren");
  assert.equal(admin.user.role, "admin");
});

test("een ID/hash-conflict met de canonieke Spain-master faalt gesloten", () => {
  const state = createSportpaleisProductionBootstrap();
  state.productionFonts.find(({ id }) => id === EXPECTED_ID).sha256 = "A".repeat(64);
  assert.throws(() => migrateSportpaleisPilotState(state), /Conflicterende canonieke productiefontidentity/u);
});

test("SC Buitenboys shortnummer 34 gebruikt Spain bytes voor schone fysieke SVG-productie", async (context) => {
  const { runtimeArtifactRoot, service, admin } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Buitenboys authoritative Spain proof",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-140294", size: "", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } }],
  }, "r218-spain-create")).value;
  const line = created.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
  assert.deepEqual(line.source, { kind: "FONT", id: EXPECTED_ID, version: EXPECTED_HASH.slice(0, 12), sha256: EXPECTED_HASH });
  assert.equal(line.heightMm, 75);
  assert.equal(line.decorationIdentity.foilColor, "Wit");
  assert.equal(line.validation.status, "VALID");

  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "r218-spain-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "r218-spain-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "r218-spain-job")).value;
  assert.deepEqual(job.snapshot.fontSources, [{ id: EXPECTED_ID, name: "Spain Euro 2016", version: EXPECTED_HASH.slice(0, 12), sha256: EXPECTED_HASH, originalFilename: "Spain Euro 2016.ttf" }]);
  const svg = await readFile(path.join(runtimeArtifactRoot, job.snapshot.artifact.path), "utf8");
  assert.match(svg, /<path data-contour-id=/u);
  assert.doesNotMatch(svg, /<text|font-family/iu);
  assert.equal(createHash("sha256").update(svg).digest("hex").toUpperCase(), job.snapshot.artifact.sha256);
});
