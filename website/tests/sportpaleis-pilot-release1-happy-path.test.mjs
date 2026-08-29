import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { assertSportpaleisProductionInstanceIntegrity, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Release1-Admin-2026!", patrick: "Release1-Operator-2026!", collega: "Release1-Store-2026!", "donovan-support": "Release1-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-release1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PILOT-RELEASE1-HAPPY-PATH-TEST" });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

test("geldige beheerde artikeloverride en meerkleurige order stromen zonder Controleren of Aandacht naar Productie", async (context) => {
  const { service, admin } = await fixture(context);
  let state = await service.bootstrap(admin.token);
  const pioneers = state.associations.find(({ name }) => name === "Almere Pioneers");
  if (pioneers.defaultFoilColor !== "Wit") await service.updateAssociation(admin.token, admin.csrfToken, pioneers.id, { expectedRevision: pioneers.revision, foilColors: pioneers.foilColors, defaultFoilColor: "Wit" });
  state = await service.bootstrap(admin.token);
  const shirt = state.articles.find(({ id }) => id === "sp-live-116386");
  if (shirt.foilColorOverride !== "Zwart") await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: "Zwart" });

  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Release 1 meerkleurig", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, "release1-multicolor-order")).value;
  assert.equal(created.stage, "ORDER", "bestaande statusarchitectuur blijft intact");
  assert.ok(created.eventHistory.some(({ type, source }) => type === "ORDER_VALIDATED" && source === "automatic-validation"));
  state = await service.bootstrap(admin.token);
  const ready = state.orders.find(({ id }) => id === created.id);
  assert.equal(ready.productionStatus, "READY");
  assert.equal(ready.attention, undefined);
  assert.deepEqual(ready.items.map(({ foilColor }) => foilColor), ["Zwart", "Wit"]);

  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: ready.id, expectedRevision: ready.revision }] }, "release1-multicolor-proposal")).value;
  assert.deepEqual(proposal.groups.map(({ foilColor }) => foilColor).sort(), ["Wit", "Zwart"]);
  assert.ok(proposal.groups.every(({ status }) => status === "OPEN"));
});

test("Junior of Senior wordt alleen afgeleid uit betrouwbare beheerde maatcontext", async (context) => {
  const { service, admin } = await fixture(context);
  const junior = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Release 1 junior", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "14" },
    items: [{ articleId: "sp-live-137294", size: "164", quantity: 1, deviation: false, overrides: empty }],
  }, "release1-junior-inference")).value;
  assert.equal(junior.items[0].personalizationValues.backNumberSizeClass, "JUNIOR");
  assert.equal(junior.productionLines[0].heightMm, junior.items[0].backNumberProduction.physicalHeightMm);

  await assert.rejects(service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Release 1 onbekende klasse", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "14" },
    items: [{ articleId: "sp-live-137294", size: "", quantity: 1, deviation: false, overrides: empty }],
  }, "release1-class-required"), (error) => error.code === "BACK_NUMBER_SIZE_CLASS_REQUIRED" && /Junior of Senior/u.test(error.message));
});

test("DW 2x plus 1x levert exact drie artifactinstanties; mismatch faalt vóór vrijgave", async (context) => {
  const { root, service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const font = state.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "DW quantity regressie", customerEmail: "", customerPhone: "0612345678", standardPersonalization: empty,
    items: [{ product: "DW fixture", size: "", quantity: 3, personalization: "3× DW", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [
      { id: "dw-two", type: "INITIALS", content: "DW", previewLabel: "Initialen DW", widthMm: 50, heightMm: 30, quantity: 2, sourceId: font.id, provenance: "Bewezen DW 2x regel" },
      { id: "dw-one", type: "INITIALS", content: "DW", previewLabel: "Initialen DW", widthMm: 50, heightMm: 30, quantity: 1, sourceId: font.id, provenance: "Bewezen DW 1x regel" },
    ],
  }, "release1-dw-three-order")).value;
  const ready = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id);
  assert.equal(ready.productionStatus, "READY");
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: ready.id, expectedRevision: ready.revision }] }, "release1-dw-three-proposal")).value;
  const group = proposal.groups[0];
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "release1-dw-three-job")).value;
  assert.equal(job.snapshot.layout.objectCount, 3);
  assert.equal(job.snapshot.layout.placements.length, 3);
  assert.equal(new Set(job.snapshot.layout.placements.map(({ lineId }) => lineId)).size, 3);
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.equal((svg.match(/data-contour-id=/gu) ?? []).length, job.snapshot.layout.closedContourCount);

  const pieces = [{ id: "dw-1" }, { id: "dw-2" }, { id: "dw-3" }];
  const cutJob = { productionGeometry: { groups: pieces.map(({ id }) => ({ sourcePieceId: id, contours: [{ id: `${id}-contour` }] })) } };
  const incompleteSvg = '<svg><path data-contour-id="dw-1-contour"/><path data-contour-id="dw-2-contour"/></svg>';
  assert.throws(() => assertSportpaleisProductionInstanceIntegrity(pieces, cutJob, incompleteSvg), (error) => error.code === "PRODUCTION_INSTANCE_QUANTITY_MISMATCH" && error.expectedInstances === 3 && error.actualInstances === 2 && /3 opdrukken verwacht, 2 geplaatst/u.test(error.message));
});

test("Release 1 UI houdt override en deelproductie normaal en biedt dunne bulkacties", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Automatisch gecontroleerd[^]*klaar voor Productie/u);
  assert.match(source, />Volgende order</u);
  assert.match(source, />Controleren</u);
  assert.match(source, /Nu produceren/u);
  assert.match(source, /Daarna/u);
  assert.match(source, /data-action="prepare-and-print-production-color"/u);
  assert.match(source, /data-production-group-select/u);
  assert.match(source, /Alles selecteren · hele batch/u);
  assert.match(source, /Productiebestand maken/u);
  assert.match(source, /productionClosure\?\.status === "ELIGIBLE"/u);
  assert.match(source, /data-action="bulk-delete-orders"/u);
  assert.match(source, /isActiveProductionStatus\(productionStatus\)/u);
  assert.doesNotMatch(source, /foilColorOverride[^]{0,160}Aandacht nodig/iu);
});
