import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Hotfix-Admin-2026!", patrick: "Hotfix-Operator-2026!", collega: "Hotfix-Store-2026!", "donovan-support": "Hotfix-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-human-acceptance-hotfix-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-HUMAN-ACCEPTANCE-HOTFIX" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { service, admin };
}

test("niet-beschikbare foliekleur faalt vóór voorstel, job, revision en auditmutatie", async (context) => {
  const { service, admin } = await fixture(context);
  let state = await service.bootstrap(admin.token);
  const pioneers = state.associations.find(({ name }) => name === "Almerer Pioneers");
  await service.updateAssociation(admin.token, admin.csrfToken, pioneers.id, { expectedRevision: pioneers.revision, foilColors: ["Wit", "Zwart"], defaultFoilColor: "Wit" });
  state = await service.bootstrap(admin.token);
  const shirt = state.articles.find(({ id }) => id === "sp-live-116386");
  await service.updateArticle(admin.token, admin.csrfToken, shirt.id, { expectedRevision: shirt.revision, foilColorOverride: "Zwart" });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Volgorde regressie", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, "hotfix-order")).value;
  const receipt = await service.recordCommunicationStatus(admin.token, admin.csrfToken, created.id, { channel: "receipt", status: "SENT", providerReference: "hotfix-receipt" }, created.revision);
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, receipt.revision, "hotfix-control")).value;
  assert.deepEqual(controlled.items.map(({ foilColor }) => foilColor), ["Zwart", "Wit"]);

  const before = await service.bootstrap(admin.token);
  await assert.rejects(service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }], foilColor: "Rood" }, "hotfix-red-unavailable"), (error) => error.code === "PRODUCTION_GROUP_NOT_AVAILABLE" && /niets opgeslagen/iu.test(error.message));
  const after = await service.bootstrap(admin.token);
  assert.equal(after.productionProposals.length, before.productionProposals.length);
  assert.equal(after.productionJobs.length, before.productionJobs.length);
  assert.equal(after.revision, before.revision);
  assert.equal(after.orders.find(({ id }) => id === controlled.id).revision, controlled.revision);
  assert.equal(after.orders.find(({ id }) => id === controlled.id).stage, "CONTROL");
  assert.equal(after.audit.length, before.audit.length);

  const proposalStartedAt = performance.now();
  const prepared = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }], foilColor: "Zwart" }, "hotfix-black-current")).value;
  const proposalDurationMs = performance.now() - proposalStartedAt;
  context.diagnostic(`MEASURED_PRODUCTION_PROPOSAL_MS=${proposalDurationMs.toFixed(1)}`);
  assert.ok(proposalDurationMs < 30_000, "de bestaande flow moet binnen de zichtbare busy-state afronden");
  assert.equal(prepared.job.snapshot.productionGroup.foilColor, "Zwart");
  assert.deepEqual(prepared.proposal.groups.map(({ foilColor }) => foilColor), ["Zwart", "Wit"]);
  assert.equal(prepared.proposal.groups[0].status, "CONVERTED");
  assert.equal(prepared.proposal.groups[1].status, "OPEN");
  const saved = await service.bootstrap(admin.token);
  assert.equal(saved.productionProposals.filter(({ id }) => id === prepared.proposal.id).length, 1);
  assert.equal(saved.productionJobs.filter(({ id }) => id === prepared.job.id).length, 1);
  assert.equal(saved.orders.find(({ id }) => id === controlled.id).stage, "PRINT");
  assert.equal(saved.productionJobs.find(({ id }) => id === prepared.job.id).snapshot.hardwareSendPerformedByWorkspace, false);
});

test("dagelijkse productie houdt proposal-only werk vindbaar en toont feedback in context", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  const directHandler = source.slice(source.indexOf('if (button.dataset.action === "prepare-and-print-production-color")'), source.indexOf('if (button.dataset.action === "create-production-proposal")'));
  assert.match(directHandler, /prepareCurrentProductionGroup\(selected, foilColor\)/u);
  assert.doesNotMatch(directHandler, /createProductionProposal/u);
  assert.match(directHandler, /if \(productionProposalBusy\) return/u);
  assert.match(directHandler, /productionProposalBusy = true/u);
  assert.match(directHandler, /performance\.now\(\)/u);
  assert.match(directHandler, /Productievoorstel maken… Workspace blijft bezig/u);
  assert.match(source, /productionSearchOrders = operationalOrders\.filter\(\(\{ stage, productionStatus \}\) => \["CONTROL", "PRINT", "DONE"\]/u);
  assert.match(source, /productionStatus && \["READY", "IN_PRODUCTION"\]\.includes\(productionStatus\)/u);
  assert.match(source, /sp-production-order-refs/u);
  assert.match(source, /data-production-action-feedback/u);
  assert.match(source, /role="status" aria-live="polite"/u);
  assert.match(source, /aria-busy="true"/u);
  assert.match(source, /productionProposalBusyKey === busyKey/u);
  assert.match(source, /selectedBusy \? `[^`]*Productievoorstel maken…` : waiting \? `[^`]*Wacht op huidige fysieke stap`/u);
  assert.match(source, /disabled\$\{selectedBusy \? ' aria-busy="true"' : ""\}/u);
  assert.match(styles, /\.sp-button\[aria-busy="true"\]::before/u);
  assert.match(styles, /@keyframes sp-busy-spin/u);
});

test("productiefilters houden PRINT-orders zichtbaar tot expliciet Gereed", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const execution = source.slice(source.indexOf("function productionExecution"), source.indexOf("function proofLabel"));
  assert.match(execution, /showAttention = activeProductionFilter === "attention" \|\| activeProductionFilter === "all"/u);
  assert.match(execution, /showPrinting = activeProductionFilter === "printing" \|\| activeProductionFilter === "all"/u);
  assert.match(execution, /printingOrders = operationalOrders\.filter\(\(\{ productionStatus \}\) => productionStatus === "IN_PRODUCTION"\)/u);
  assert.match(execution, /data-production-status-panel="printing"/u);
  assert.match(execution, /Volledig geproduceerd · expliciet Gereed melden blijft vereist/u);
  assert.match(execution, /data-production-status-row=/u);
  assert.match(execution, /id="productie-gereed"/u);
  assert.match(execution, /<details class="sp-production-batch-details" open>/u);
  assert.match(execution, /showAttention \? attentionPanel : ""/u);
  assert.match(execution, /showPrinting \? inProductionPanel : ""/u);
  assert.match(execution, /showPrinting \? completionPanel : ""/u);
  const completionHandler = source.slice(source.indexOf('if (button.dataset.action === "complete-production-job"'), source.indexOf('if (button.dataset.action === "toggle-foil-roll"'));
  assert.ok(completionHandler.indexOf('activeProductionFilter = "printing"') < completionHandler.indexOf("await load()"), "Bedrukt moet vóór herladen naar de zichtbare In productie-context schakelen");
  assert.match(completionHandler, /blijven In productie tot expliciet Gereed/u);
});

test("SVG-intake toont lokale preview en vereist expliciete opslag na zichtbare review", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /data-local-svg-review hidden/u);
  assert.match(source, /Lokale SVG-preview vóór opslag/u);
  assert.match(source, /URL\.createObjectURL\(file\)/u);
  assert.match(source, /previewConfirmed/u);
  assert.match(source, /Stap 2 · SVG centraal opslaan en verdergaan/u);
  const submit = source.slice(source.indexOf('else if (form.matches("[data-production-asset-source-form]"))'), source.indexOf('else if (form.matches("[data-production-asset-promote-form]"))'));
  assert.ok(submit.indexOf('previewConfirmed') < submit.indexOf('api.createProductionAssetSource'), "previewbevestiging moet vóór iedere persistente assetmutatie staan");
  assert.match(submit, /Er is niets opgeslagen/u);
});

test("Workspace-hashnavigatie scrollt en focust het gerenderde doel", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const helper = source.slice(source.indexOf("const focusLocationHashTarget"), source.indexOf("const saveProductionAssetReviewDraft"));
  assert.match(helper, /document\.getElementById\(id\)/u);
  assert.match(helper, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/u);
  assert.match(helper, /target\.focus\(\{ preventScroll: true \}\)/u);
  assert.match(helper, /render\(\); focusLocationHashTarget\(\)/u);
});
