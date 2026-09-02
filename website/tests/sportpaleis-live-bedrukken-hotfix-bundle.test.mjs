import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { migrateSportpaleisPilotState, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { applyFreeProductionBulkSettings } from "../src/sportpaleis/free-production-lines.ts";
import { productionFontExecutableDecision } from "../src/sportpaleis/production-practice-contract.mjs";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";
import { createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

const passwords = { kevin: "Review-Kevin-2026!", patrick: "Review-Patrick-2026!", collega: "Review-Store-2026!", "donovan-support": "Review-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-live-hotfix-bundle-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root, releaseId: "SPW-LIVE-BEDRUKKEN-HOTFIX-BUNDLE", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    store,
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

test("FREE_PRINT bronpicker volgt iedere centraal admitted uitvoerbare fontbron", async () => {
  const decisions = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map((font) => ({ font, decision: productionFontExecutableDecision(font, "FREE_PRINT") }));
  assert.equal(decisions.length, 6);
  assert.ok(decisions.every(({ decision }) => decision.allowed), decisions.map(({ font, decision }) => `${font.name}:${decision.code}`).join(" | "));
  const blocked = structuredClone(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS[0]);
  blocked.admission.lifecycle = "TECHNICALLY_VALID";
  assert.equal(productionFontExecutableDecision(blocked, "FREE_PRINT").allowed, false);
  const wrongIdentity = structuredClone(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS[0]);
  wrongIdentity.authoritativeIdentity = "other-font";
  assert.equal(productionFontExecutableDecision(wrongIdentity, "FREE_PRINT").allowed, false);
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /productionFontExecutableDecision\(font, "FREE_PRINT"\)\.allowed/u);
  assert.doesNotMatch(workspace, /FREE_PRINT_FONT_ALLOWLIST/u);
  assert.match(workspace, /itemProductionSizeLabel\(order, item\.id\)/u);
});

test("Vrije opdruk 1 t/m 20 blijft compact, uniek en bulk-aanpasbaar met één uitzondering", async () => {
  const parsed = parseTeamProductionLines("1 T/M 20");
  assert.equal(parsed.length, 20);
  assert.deepEqual(parsed.map(({ value }) => value), Array.from({ length: 20 }, (_, index) => String(index + 1)));
  const lines = parsed.map(({ value }, index) => ({ id: `line-${index + 1}`, type: "NUMBER", content: value, fontId: "font-a", widthMm: 80, heightMm: 200, foilColor: "Wit", quantity: 1 }));
  assert.equal(applyFreeProductionBulkSettings(lines, new Set(lines.map(({ id }) => id)), { type: "NUMBER", fontId: "font-b", foilColor: "Zwart", heightCm: 20, quantity: 2 }), 20);
  applyFreeProductionBulkSettings(lines, new Set(["line-17"]), { foilColor: "Blauw", heightCm: 7.5, quantity: 1 });
  assert.equal(new Set(lines.map(({ id }) => id)).size, 20);
  assert.deepEqual(lines[16], { id: "line-17", type: "NUMBER", content: "17", fontId: "font-b", widthMm: 80, heightMm: 75, foilColor: "Blauw", quantity: 1 });
  assert.ok(lines.filter(({ foilColor, heightMm, quantity }) => foilColor === "Zwart" && heightMm === 200 && quantity === 2).length === 19);
  assert.deepEqual(parseTeamProductionLines("AA\r\nBB\n28 x 2"), [
    { value: "AA", quantity: 1 },
    { value: "BB", quantity: 1 },
    { value: "28", quantity: 2 },
  ]);
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(workspace, /GEDEELDE INSTELLINGEN/u);
  assert.match(workspace, /Pas toe op alle/u);
  assert.match(workspace, /Afwijking voor alleen deze waarde/u);
  assert.match(workspace, /sp-free-line--compact/u);
  assert.doesNotMatch(workspace, /select name="lineIds" multiple/u);
  assert.match(css, /@media\(max-width:560px\).*sp-free-shared-defaults__grid/u);
});

test("SP-2026-0116-klasse projecteert Rug 10 en Short 10 exact één keer terwijl alleen PvV geblokkeerd blijft", async (context) => {
  const { store, service, operator, storeUser } = await fixture(context);
  const state = await service.bootstrap(storeUser.token);
  const byArticleNumber = (articleNumber) => state.articles.find((article) => String(article.articleNumber) === articleNumber);
  const initialsArticle = byArticleNumber("141556");
  const shirtArticle = byArticleNumber("116597");
  const shortArticle = byArticleNumber("141521");
  assert.ok(initialsArticle && shirtArticle && shortArticle);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "416", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [
      { articleId: initialsArticle.id, variants: [{ id: "pv-v-1", size: "", quantity: 1, deviation: true, overrides: { ...empty, initials: "PV", initialsInfix: "v" } }, { id: "pv-v-2", size: "", quantity: 1, deviation: true, overrides: { ...empty, initials: "PV", initialsInfix: "v" } }] },
      { articleId: shirtArticle.id, variants: [{ id: "rug-10", size: "", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" } }] },
      { articleId: shortArticle.id, variants: [{ id: "short-10", size: "", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "10" } }] },
    ],
  }, "hotfix-bundle-order")).value;
  const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  const readyLines = current.productionLines.filter(({ id }) => current.productionReadyLineIds.includes(id));
  const blockedLines = current.productionLines.filter(({ id }) => current.productionBlockedLineIds.includes(id));
  assert.equal(current.productionStatus, "READY");
  assert.deepEqual(readyLines.map(({ personalizationField, content, quantity, heightMm }) => [personalizationField, content, quantity, heightMm]).sort(), [["backNumber", "10", 1, 200], ["shortsNumber", "10", 1, 75]]);
  assert.equal(blockedLines.length, 6);
  assert.ok(blockedLines.every(({ placementRule, validation }) => placementRule?.compositeText === "PvV" && validation.status === "BLOCKED"));

  const legacyState = structuredClone(await store.read());
  legacyState.schemaVersion = 14;
  const legacyOrder = legacyState.orders.find(({ id }) => id === created.id);
  const legacyProfile = legacyState.productionProfiles.find(({ id }) => id === legacyOrder.items.find(({ articleNumber }) => articleNumber === "116597").productionProfileId);
  legacyProfile.sizeLabel = "Junior bronwaarde 20 cm · Senior 22 cm";
  legacyProfile.backNumberSizeClasses.SENIOR.physicalHeightMm = 220;
  const legacyBackNumber = legacyOrder.productionLines.find(({ personalizationField }) => personalizationField === "backNumber");
  legacyBackNumber.heightMm = 220;
  const migrated = migrateSportpaleisPilotState(legacyState);
  const migratedOrder = migrated.orders.find(({ id }) => id === created.id);
  const migratedProfile = migrated.productionProfiles.find(({ id }) => id === legacyProfile.id);
  assert.equal(migrated.schemaVersion, 15);
  assert.equal(migratedProfile.backNumberSizeClasses.SENIOR.physicalHeightMm, 200);
  assert.doesNotMatch(migratedProfile.sizeLabel, /22\s*cm/iu);
  assert.equal(migratedOrder.productionLines.find(({ personalizationField }) => personalizationField === "backNumber").heightMm, 200);
  assert.equal(migratedOrder.eventHistory.at(-1).type, "PRODUCTION_TRUTH_REPROJECTED");
  assert.equal(migratedOrder.revision, legacyOrder.revision + 1);

  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }] }, "hotfix-bundle-proposal")).value;
  const refs = proposal.groups.flatMap(({ productionLineRefs }) => productionLineRefs);
  assert.equal(refs.length, 2);
  assert.deepEqual(new Set(refs.map(({ lineId }) => lineId)), new Set(readyLines.map(({ id }) => id)));
  assert.ok(blockedLines.every(({ id }) => refs.every(({ lineId }) => lineId !== id)));

  const first = await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "hotfix-bundle-job");
  const retry = await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "hotfix-bundle-job");
  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.equal(first.value.id, retry.value.id);
  assert.deepEqual(first.value.snapshot.productionLines.map(({ personalizationField, content }) => [personalizationField, content]).sort(), [["backNumber", "10"], ["shortsNumber", "10"]]);
  assert.equal(first.value.snapshot.artifact.format, "SVG");
});
