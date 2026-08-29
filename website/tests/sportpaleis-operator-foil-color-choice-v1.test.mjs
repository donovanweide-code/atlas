import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { captureReceipt, createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

const passwords = { kevin: "Color-Choice-Admin-2026!", patrick: "Color-Choice-Operator-2026!", collega: "Color-Choice-Store-2026!", "donovan-support": "Color-Choice-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context, key) {
  const root = await mkdtemp(path.join(tmpdir(), `sportpaleis-color-choice-${key}-`));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-QUICK-INTAKE-ADAPTIVE-NESTING-V1" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  let state = await service.bootstrap(admin.token);
  const pioneers = state.associations.find(({ name }) => name === "Almere Pioneers");
  await service.updateAssociation(admin.token, admin.csrfToken, pioneers.id, { expectedRevision: pioneers.revision, foilColors: ["Wit", "Blauw"], defaultFoilColor: "Wit" });
  state = await service.bootstrap(admin.token);
  const blueArticle = state.articles.find(({ id }) => id === "sp-live-116386");
  await service.updateArticle(admin.token, admin.csrfToken, blueArticle.id, { expectedRevision: blueArticle.revision, foilColorOverride: "Blauw" });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: `Kleurkeuze ${key}`, customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, `color-choice-${key}-order`)).value;
  const receipt = await captureReceipt(service, admin, created, `color-choice-${key}-receipt`);
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, receipt.revision, `color-choice-${key}-control`)).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, `color-choice-${key}-proposal`)).value;
  const byColor = (color) => proposal.groups.find(({ foilColor }) => foilColor === color);
  assert.ok(byColor("Wit") && byColor("Blauw"));
  return { service, admin, operator, controlled, proposal, white: byColor("Wit"), blue: byColor("Blauw") };
}

test("OPEN BLAUW + WIT laat WIT kiezen, blokkeert een tweede actieve stap en rondt alleen gekozen kleur af", async (context) => {
  const { service, admin, operator, controlled, proposal, white, blue } = await fixture(context, "white-first");
  const whiteJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: white.id, orders: white.orders }, "color-choice-white-job")).value;
  assert.equal(whiteJob.snapshot.productionGroup.foilColor, "Wit");

  let state = await service.bootstrap(admin.token);
  let savedProposal = state.productionProposals.find(({ id }) => id === proposal.id);
  let savedBlue = savedProposal.groups.find(({ id }) => id === blue.id);
  assert.equal(savedBlue.status, "OPEN", "BLAUW blijft OPEN nadat WIT is gekozen");
  const beforeConflict = { jobs: state.productionJobs.length, audit: state.audit.length, revision: state.orders.find(({ id }) => id === controlled.id).revision };
  await assert.rejects(
    service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: blue.id, orders: savedBlue.orders }, "color-choice-blue-conflict"),
    (error) => error.code === "PRODUCTION_PHYSICAL_STEP_CONFLICT",
  );
  state = await service.bootstrap(admin.token);
  assert.deepEqual({ jobs: state.productionJobs.length, audit: state.audit.length, revision: state.orders.find(({ id }) => id === controlled.id).revision }, beforeConflict, "conflict laat centrale state atomair ongemoeid");

  await service.completeProductionJob(operator.token, operator.csrfToken, whiteJob.id, "color-choice-white-printed");
  state = await service.bootstrap(admin.token);
  const afterWhite = state.orders.find(({ id }) => id === controlled.id);
  assert.deepEqual(afterWhite.eventHistory.filter(({ type }) => type === "PRODUCTION_GROUP_PRINTED").map(({ details }) => details.foilColor), ["Wit"]);
  assert.notEqual(afterWhite.productionClosure?.status, "ELIGIBLE");
  savedProposal = state.productionProposals.find(({ id }) => id === proposal.id);
  savedBlue = savedProposal.groups.find(({ id }) => id === blue.id);
  assert.equal(savedBlue.status, "OPEN");

  const blueJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: blue.id, orders: savedBlue.orders }, "color-choice-blue-after-white")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, blueJob.id, "color-choice-blue-printed");
  state = await service.bootstrap(admin.token);
  assert.equal(state.orders.find(({ id }) => id === controlled.id).productionClosure.status, "ELIGIBLE", "alle kleuren Bedrukt maakt uitsluitend Gereed-eligible");
  const choiceAudit = state.audit.find(({ details }) => details?.productionGroupId === white.id && details?.foilColor === "Wit" && details?.physicalStepSelectedBy);
  assert.ok(choiceAudit);
  assert.equal(choiceAudit.details.physicalStepSelectedBy, "Kevin");

  const replot = (await service.replotProductionJob(operator.token, operator.csrfToken, whiteJob.id, { reason: "Reproduceer kleurkeuze" }, "color-choice-white-replot")).value;
  assert.equal(replot.snapshotHash, whiteJob.snapshotHash);
  assert.deepEqual(replot.snapshot, whiteJob.snapshot);
});

test("OPEN BLAUW + WIT laat BLAUW als eerste keuze toe en houdt WIT OPEN", async (context) => {
  const { service, admin, proposal, white, blue } = await fixture(context, "blue-first");
  const blueJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: blue.id, orders: blue.orders }, "color-choice-blue-first-job")).value;
  assert.equal(blueJob.snapshot.productionGroup.foilColor, "Blauw");
  const state = await service.bootstrap(admin.token);
  const saved = state.productionProposals.find(({ id }) => id === proposal.id);
  assert.equal(saved.groups.find(({ id }) => id === white.id).status, "OPEN");
  assert.equal(state.productionJobs.filter((job) => job.status === "AWAITING_HUMAN_CHECK" && saved.groups.some(({ productionJobId }) => productionJobId === job.id)).length, 1);
});

test("gelijktijdige medewerkerkeuzes leveren nooit twee actieve kleuren in dezelfde productiecontext", async (context) => {
  const { service, admin, operator, proposal, white, blue } = await fixture(context, "concurrent");
  const outcomes = await Promise.allSettled([
    service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: white.id, orders: white.orders }, "color-choice-concurrent-white"),
    service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: blue.id, orders: blue.orders }, "color-choice-concurrent-blue"),
  ]);
  assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(({ status }) => status === "rejected").length, 1);
  const state = await service.bootstrap(admin.token);
  const saved = state.productionProposals.find(({ id }) => id === proposal.id);
  const active = saved.groups.filter(({ productionJobId }) => productionJobId && state.productionJobs.find(({ id }) => id === productionJobId)?.status === "AWAITING_HUMAN_CHECK");
  assert.equal(active.length, 1);
  assert.equal(saved.groups.filter(({ status }) => status === "OPEN").length, 1);
});

test("kleurkeuze-UX vraagt alleen bij meerdere veilige OPEN kleuren om een keuze", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /availableColorCount > 1 \? "Welke foliekleur wil je nu produceren\?" : "Nu maken"/u);
  assert.match(source, /De enige veilige foliekleur staat klaar/u);
  assert.match(source, /BESCHIKBARE FOLIEKLEUR/u);
  assert.match(source, /NOG TE PRODUCEREN/u);
  assert.match(source, /data-remaining-open-production-group/u);
  assert.match(source, /blijft centraal aanwezig en wordt beschikbaar zodra de actieve kleur Bedrukt is gemeld/u);
  assert.match(source, /nu produceren/u);
});
