import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { captureReceipt, createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";
import { compareSportpaleisWebsiteSnapshot, createSportpaleisWebsiteSyncState, failSportpaleisWebsiteSync, parseSportpaleisLiveAssociationDirectory, parseSportpaleisProductionRelevance, stageSportpaleisWebsiteSync } from "../scripts/sportpaleis-website-sync.mjs";
import { parseTeamProductionLines } from "../src/sportpaleis/team-production-lines.ts";

const passwords = { kevin: "Human-Review-Admin-2026!", patrick: "Human-Review-Operator-2026!", collega: "Human-Review-Store-2026!", "donovan-support": "Human-Review-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-human-review-v1-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-HUMAN-REVIEW-CORRECTIONS-TEAMORDER-V1-TEST" });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

test("mixed compatible Rugnummer en Initialen blijven proposal → group → PlotJob → SVG compleet", async (context) => {
  const { root, store, service, admin } = await fixture(context);
  const beforeGolden = structuredClone((await store.read()).productionJobs.filter(({ id }) => id.includes("golden")));
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Mixed element fixture", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Mixed productie", size: "", quantity: 4, personalization: "2 rugnummers en 2 initialen", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [
      { id: "mixed-back-10", type: "NUMBER", content: "10", previewLabel: "Rugnummer 10", widthMm: 100, heightMm: 200, quantity: 2, sourceId: font.id, provenance: "Human Review mixed-elements" },
      { id: "mixed-initials-dw", type: "INITIALS", content: "DW", previewLabel: "Initialen DW", widthMm: 50, heightMm: 30, quantity: 2, sourceId: font.id, provenance: "Human Review mixed-elements" },
    ],
  }, "human-review-mixed-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "human-review-mixed-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "human-review-mixed-proposal")).value;
  assert.deepEqual(proposal.groups[0].productionLineRefs.map(({ lineId }) => lineId), ["mixed-initials-dw", "mixed-back-10"]);
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "human-review-mixed-job")).value;
  assert.deepEqual(job.snapshot.productionLines.map(({ id, quantity }) => [id, quantity]), [["mixed-initials-dw", 2], ["mixed-back-10", 2]]);
  assert.equal(job.snapshot.layout.objectCount, 4, "twee semantische rugnummers 10 blijven twee herkenbare sets naast twee initialen");
  assert.equal(job.snapshot.scale, 1);
  assert.ok(job.snapshot.layout.usedWidthMm <= job.snapshot.productionGroup.maxSafeTrackWidthMm);
  assert.equal(job.snapshot.layout.edgeMarginMm, 5);
  assert.equal(job.snapshot.layout.minimumGapMm, 6.4);
  assert.equal(job.snapshot.layout.placements.length, 4);
  const initialsPlacements = job.snapshot.layout.placements.filter(({ lineId }) => lineId.includes("mixed-initials-dw"));
  const backPlacements = job.snapshot.layout.placements.filter(({ lineId }) => lineId.includes("mixed-back-10"));
  assert.ok(initialsPlacements.every(({ nestingSection }) => nestingSection.key === "initials"));
  assert.ok(backPlacements.every(({ nestingSection }) => nestingSection.key === "back-numbers"));
  const physicalGroups = job.snapshot.layout.productionGeometry.groups;
  const initialsBounds = physicalGroups.filter(({ provenance }) => provenance.nestingSection?.key === "initials").map(({ boundsMm }) => boundsMm);
  const backBounds = physicalGroups.filter(({ provenance }) => provenance.nestingSection?.key === "back-numbers").map(({ boundsMm }) => boundsMm);
  assert.ok(Math.max(...initialsBounds.map(({ maxY }) => maxY)) + job.snapshot.layout.minimumGapMm <= Math.min(...backBounds.map(({ minY }) => minY)) + 0.001, "initialen blijven in een eigen fysieke band en worden niet tussen rugnummers genest");
  assert.equal(backPlacements.length, 2);
  assert.ok(backPlacements.every(({ physicalMembers }) => physicalMembers.map(({ digit }) => digit).join("") === "10"));
  assert.deepEqual([...new Set(backPlacements.map(({ semanticGroup }) => semanticGroup.copyIndex))].sort(), [1, 2]);
  assert.ok(backPlacements.every(({ sourceWidthMm, sourceHeightMm, widthMm, heightMm }) => {
    const sourceSides = [sourceWidthMm, sourceHeightMm].sort((a, b) => a - b);
    const placedSides = [widthMm, heightMm].sort((a, b) => a - b);
    return sourceSides.some((side) => Math.abs(side - 200) < 0.01) && sourceSides.every((side, index) => Math.abs(side - placedSides[index]) < 0.01);
  }), "de aangevraagde 200 mm maat blijft exact behouden; oriëntatie volgt de kortste veilige batchlayout");
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.match(svg, /<svg/u);
  assert.match(svg, /data-production-data-sha256/u);
  assert.deepEqual((await store.read()).productionJobs.filter(({ id }) => id.includes("golden")), beforeGolden);
});

test("één kleurbatch houdt Initialen, Rugnummers, Shortnummers en Namen in deterministische fysieke banden", async (context) => {
  const { service, admin } = await fixture(context);
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Gemengde praktijkbatch", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Gemengde productie", size: "", quantity: 4, personalization: "Initialen, rug, short en naam", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [
      { id: "practice-name", type: "TEXT", content: "DONOVAN", previewLabel: "Naam DONOVAN", widthMm: 180, heightMm: 32, quantity: 1, sourceId: font.id },
      { id: "practice-short", type: "NUMBER", content: "19", previewLabel: "Shortnummer 19", widthMm: 70, heightMm: 75, quantity: 1, sourceId: font.id },
      { id: "practice-back", type: "NUMBER", content: "24", previewLabel: "Rugnummer 24", widthMm: 190, heightMm: 200, quantity: 1, sourceId: font.id },
      { id: "practice-initials", type: "INITIALS", content: "DB", previewLabel: "Initialen DB", widthMm: 50, heightMm: 30, quantity: 1, sourceId: font.id },
    ],
  }, "practice-decoration-sections-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "practice-decoration-sections-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "practice-decoration-sections-proposal")).value;
  assert.equal(proposal.groups.length, 1);
  assert.deepEqual(proposal.groups[0].productionLineRefs.map(({ lineId }) => lineId), ["practice-initials", "practice-back", "practice-short", "practice-name"]);
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "practice-decoration-sections-job")).value;
  const grouped = new Map();
  for (const group of job.snapshot.layout.productionGeometry.groups) {
    const key = group.provenance.nestingSection.key;
    grouped.set(key, [...(grouped.get(key) ?? []), group]);
  }
  const keys = ["initials", "back-numbers", "short-numbers", "names"];
  assert.deepEqual([...grouped.keys()], keys);
  for (let index = 1; index < keys.length; index += 1) {
    const before = grouped.get(keys[index - 1]).map(({ boundsMm }) => boundsMm);
    const after = grouped.get(keys[index]).map(({ boundsMm }) => boundsMm);
    assert.ok(Math.max(...before.map(({ maxY }) => maxY)) + job.snapshot.layout.minimumGapMm <= Math.min(...after.map(({ minY }) => minY)) + 0.001);
  }
  assert.equal(job.snapshot.scale, 1);
  assert.equal(job.snapshot.layout.objectCount, 4);
  assert.ok(job.snapshot.layout.productionGeometry.groups.every(({ mirrorApplied }) => mirrorApplied === job.snapshot.orientation.preMirrored));
});

test("Winkel: voorbereiden/openen/downloaden voltooit niets; Bedrukt, expliciet Afronden en Opgehaald blijven apart", async (context) => {
  const { store, service, admin, operator } = await fixture(context);
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "CUSTOM", customer: "Lifecycle fixture", customerEmail: "", customerPhone: "0612345678", standardPersonalization: empty, items: [{ product: "Vrije initialen", size: "", quantity: 1, personalization: "Initialen DW", foilColor: "Wit", deviation: true, overrides: empty }], productionLines: [{ id: "lifecycle-dw", type: "INITIALS", content: "DW", previewLabel: "Initialen DW", widthMm: 50, heightMm: 30, quantity: 1, sourceId: font.id }] }, "human-review-lifecycle-order")).value;
  const acknowledged = await captureReceipt(service, admin, created, "lifecycle-manual-receipt");
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, acknowledged.revision, "human-review-lifecycle-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "human-review-lifecycle-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "human-review-lifecycle-job")).value;
  const afterCreate = await store.read();
  const revisionBeforeDownload = afterCreate.revision;
  assert.equal(afterCreate.orders.find(({ id }) => id === created.id).stage, "PRINT");
  assert.equal(afterCreate.productionJobs.find(({ id }) => id === job.id).status, "AWAITING_HUMAN_CHECK");
  await service.productionJobArtifact(admin.token, job.id);
  assert.equal((await store.read()).revision, revisionBeforeDownload, "SVG downloaden is read-only");
  assert.equal((await service.bootstrap(operator.token)).productionJobs.find(({ id }) => id === job.id).status, "AWAITING_HUMAN_CHECK");
  const tooEarly = await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: created.id, expectedRevision: afterCreate.orders.find(({ id }) => id === created.id).revision }] }, "too-early-ready");
  assert.equal(tooEarly.value.completed.length, 0);
  assert.equal(tooEarly.value.skipped[0].code, "PRODUCTION_LINES_PENDING");
  await service.completeProductionJob(admin.token, admin.csrfToken, job.id, "human-review-lifecycle-printed");
  const printed = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id);
  assert.equal(printed.stage, "PRINT");
  assert.equal(printed.productionClosure.status, "ELIGIBLE");
  assert.equal(printed.pickup.status, "NOT_PICKED_UP");
  assert.ok(!printed.eventHistory.some(({ type }) => type === "PRODUCTION_READY"));
  const readyResult = await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: printed.id, expectedRevision: printed.revision }] }, "human-review-lifecycle-ready");
  assert.equal(readyResult.value.completed.length, 1);
  const sharedReady = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
  assert.equal(sharedReady.stage, "DONE");
  assert.equal(sharedReady.productionClosure.status, "CONFIRMED");
  assert.equal(sharedReady.fulfillment.status, "READY_FOR_PICKUP");
  assert.equal(sharedReady.pickup.status, "NOT_PICKED_UP");
  assert.ok(sharedReady.eventHistory.some(({ type }) => type === "PRODUCTION_READY"));
  assert.equal(sharedReady.communication.ready.status, "NOT_SENT");
  await assert.rejects(service.recordOperationalEvent(admin.token, admin.csrfToken, sharedReady.id, { action: "READY_FOR_PICKUP", expectedRevision: sharedReady.revision }, "human-review-lifecycle-duplicate-ready-for-pickup"), (error) => error.code === "FULFILLMENT_ALREADY_ADVANCED");
  const picked = (await service.recordOperationalEvent(admin.token, admin.csrfToken, sharedReady.id, { action: "PICKED_UP", expectedRevision: sharedReady.revision }, "human-review-lifecycle-picked-up")).value;
  assert.equal(picked.stage, "DONE");
  assert.equal(picked.pickup.status, "PICKED_UP");
  assert.ok(picked.eventHistory.some(({ type }) => type === "PICKED_UP"));
  assert.equal((await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id).pickup.status, "PICKED_UP");
});

test("Winkel met meerdere productiegroepen wordt pas na laatste Bedrukt eligible en daarna expliciet Gereed", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const blueArticle = state.articles.find(({ id }) => id === "sp-live-116386");
  if (blueArticle.foilColorOverride !== "Blauw") await service.updateArticle(admin.token, admin.csrfToken, blueArticle.id, { expectedRevision: blueArticle.revision, foilColorOverride: "Blauw" });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Lifecycle meerdere kleuren", customerEmail: "", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty },
      { articleId: "sp-live-116388", size: "L", quantity: 1, deviation: false, overrides: empty },
    ],
  }, "human-review-lifecycle-multiple-order")).value;
  const acknowledged = await captureReceipt(service, admin, created, "lifecycle-multiple-manual-receipt");
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, acknowledged.revision, "human-review-lifecycle-multiple-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "human-review-lifecycle-multiple-proposal")).value;
  assert.equal(proposal.groups.length, 2);
  const first = proposal.groups[0];
  const firstJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: first.id, orders: first.orders }, "human-review-lifecycle-first-job")).value;
  await service.completeProductionJob(admin.token, admin.csrfToken, firstJob.id, "human-review-lifecycle-first-printed");
  let shared = await service.bootstrap(operator.token);
  assert.equal(shared.orders.find(({ id }) => id === created.id).stage, "PRINT");
  assert.equal(shared.orders.find(({ id }) => id === created.id).productionClosure.status, "NOT_ELIGIBLE");
  const savedProposal = shared.productionProposals.find(({ id }) => id === proposal.id);
  const second = savedProposal.groups.find(({ id }) => id !== first.id);
  const secondJob = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: second.id, orders: second.orders }, "human-review-lifecycle-second-job")).value;
  await service.completeProductionJob(operator.token, operator.csrfToken, secondJob.id, "human-review-lifecycle-second-printed");
  shared = await service.bootstrap(admin.token);
  const ready = shared.orders.find(({ id }) => id === created.id);
  assert.equal(ready.stage, "PRINT");
  assert.equal(ready.productionClosure.status, "ELIGIBLE");
  assert.equal(ready.pickup.status, "NOT_PICKED_UP");
  assert.equal(ready.eventHistory.filter(({ type }) => type === "PRODUCTION_READY").length, 0);
  const completed = (await service.completeProductionOrders(operator.token, operator.csrfToken, { orders: [{ id: ready.id, expectedRevision: ready.revision }] }, "human-review-lifecycle-multiple-ready")).value;
  assert.equal(completed.completed.length, 1);
  const done = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id);
  assert.equal(done.stage, "DONE");
  assert.equal(done.fulfillment.status, "READY_FOR_PICKUP");
  assert.equal(done.eventHistory.filter(({ type }) => type === "PRODUCTION_READY").length, 1);
});

test("Teamorder structureert gemengde bulkinput en accepteert geen vereniging", async (context) => {
  const { store, service, admin } = await fixture(context);
  assert.deepEqual(parseTeamProductionLines("1 t/m 18\n34").length, 19);
  assert.deepEqual(parseTeamProductionLines("DW × 2"), [{ value: "DW", quantity: 2 }]);
  assert.throws(() => parseTeamProductionLines("DW twee?"), /waarde|aantal|begrijp/u);
  await store.mutate(async (current) => { current.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular"; return { state: current, value: null }; });
  const state = await service.bootstrap(admin.token);
  const font = state.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "TEAM", teamContext: "Zaalteam Donderdag", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Teamproductie · Zaalteam Donderdag", association: "", productionProfileId: state.productionProfiles.find(({ id }) => id !== "profile-none").id, size: "", quantity: 22, personalization: "Rugnummers, initialen en shortnummer", deviation: true, overrides: empty }],
    productionLines: [
      { id: "team-back", type: "NUMBER", content: "10", previewLabel: "Rugnummer 10", widthMm: 100, heightMm: 200, quantity: 19, sourceId: font.id },
      { id: "team-initials", type: "INITIALS", content: "DW", previewLabel: "Initialen DW", widthMm: 50, heightMm: 30, quantity: 2, sourceId: font.id },
      { id: "team-short", type: "NUMBER", content: "7", previewLabel: "Shortnummer 7", widthMm: 50, heightMm: 75, quantity: 1, sourceId: font.id },
    ],
  }, "human-review-teamorder-no-association")).value;
  assert.equal(created.teamContext, "Zaalteam Donderdag");
  assert.deepEqual(created.associations, []);
  assert.equal(created.association, "Geen vereniging");
  assert.equal(created.productionLines.length, 3);
  assert.equal((await service.bootstrap(admin.token)).orders.find(({ id }) => id === created.id).productionStatus, "READY");
});

test("medewerker lifecycle deactiveert veilig en bewaart historische attributie", async (context) => {
  const { service, admin } = await fixture(context);
  const employee = await service.upsertEmployee(admin.token, admin.csrfToken, { name: "Lifecycle Medewerker", salesNumber: "404", active: true });
  const order = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: "INDIVIDUAL", customer: "Attributiefixture", customerEmail: "", customerPhone: "0612345678", salesNumber: "404", standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: empty }] }, "employee-history-order")).value;
  const inactive = await service.upsertEmployee(admin.token, admin.csrfToken, { id: employee.id, expectedRevision: employee.revision, name: employee.name, salesNumber: employee.salesNumber, active: false });
  assert.equal(inactive.active, false);
  assert.equal((await service.bootstrap(admin.token)).orders.find(({ id }) => id === order.id).salesAttribution.label, "Lifecycle Medewerker");
  await assert.rejects(service.deleteEmployee(admin.token, admin.csrfToken, employee.id), (error) => error.code === "EMPLOYEE_HAS_HISTORY");
  const reactivated = await service.upsertEmployee(admin.token, admin.csrfToken, { id: inactive.id, expectedRevision: inactive.revision, name: inactive.name, salesNumber: inactive.salesNumber, active: true });
  assert.equal(reactivated.active, true);
});

test("sync vraagt alleen aandacht voor publieke, bedrukrelevante bronwijzigingen en reconcileert legacy-spam auditbaar", () => {
  const directory = `<h2>Voetbalverenigingen</h2><ul><li><a href="/verenigingen/echte-club/">Echte Club</a></li></ul><h2>Complete Clubondersteuning</h2>`;
  assert.deepEqual(parseSportpaleisLiveAssociationDirectory(directory).map(({ name }) => name), ["Echte Club"]);
  assert.equal(parseSportpaleisProductionRelevance(`<main><div class="row type-description"><span class="title">Initialen</span></div></main>`).status, "RELEVANT");
  assert.equal(parseSportpaleisProductionRelevance(`<main><h1>Wedstrijdbal</h1></main>`).status, "NOT_RELEVANT");
  const state = { articles: [], associations: [{ id: "club", name: "Echte Club" }], audit: [], websiteSync: { ...createSportpaleisWebsiteSyncState(), counts: { attention: 381 }, sourceFingerprintIndex: Object.fromEntries(Array.from({ length: 381 }, (_, index) => [`article:legacy-${index}`, `hash-${index}`])) } };
  const snapshot = { fingerprint: "live-scope-v1", rawArticleCandidates: 575, associations: [{ sourceIdentifier: "https://www.sportpaleis.nl/verenigingen/echte-club/", name: "Echte Club", fingerprint: "club-v1", articles: [
    { sourceIdentifier: "sock-1", name: "Gewone kous", url: "https://www.sportpaleis.nl/sock.html", fingerprint: "sock-v1", productionRelevance: { status: "NOT_RELEVANT", fields: [], evidence: "NO_PUBLIC_PERSONALIZATION_FIELDS" } },
    { sourceIdentifier: "shirt-1", name: "Bedrukbaar shirt", url: "https://www.sportpaleis.nl/shirt.html", fingerprint: "shirt-v1", productionRelevance: { status: "RELEVANT", fields: ["Rugnummer"], evidence: "PUBLIC_PERSONALIZATION_FIELDS" } },
  ] }] };
  const comparison = compareSportpaleisWebsiteSnapshot(state, snapshot);
  assert.deepEqual(comparison.changes.map(({ sourceIdentifier }) => sourceIdentifier), ["shirt-1"]);
  assert.equal(comparison.reconciledLegacyCount, 381);
  stageSportpaleisWebsiteSync(state, snapshot, { now: new Date("2026-08-20T20:00:00Z") });
  assert.equal(state.websiteSync.counts.raw, 575);
  assert.equal(state.websiteSync.counts.live, 2);
  assert.equal(state.websiteSync.counts.productionRelevant, 1);
  assert.equal(state.websiteSync.counts.attention, 1);
  assert.equal(state.websiteSync.reconciliationHistory[0].removedAsLegacyOutOfBoundary, 381);
});

test("syncautomation stopt fail-closed wanneer het publieke broncontract niet meer betrouwbaar herkenbaar is", () => {
  const state = { audit: [], websiteSync: { ...createSportpaleisWebsiteSyncState(), enabled: true, nextRunAt: "2026-08-21T01:00:00.000Z" } };
  failSportpaleisWebsiteSync(state, Object.assign(new Error("storefrontgrens ontbreekt"), { code: "WEBSITE_SYNC_LIVE_DIRECTORY_MISSING" }), { now: new Date("2026-08-20T21:00:00Z") });
  assert.equal(state.websiteSync.enabled, false);
  assert.equal(state.websiteSync.nextRunAt, null);
  assert.equal(state.websiteSync.status, "ERROR");
  assert.equal(state.audit[0].details.code, "WEBSITE_SYNC_LIVE_DIRECTORY_MISSING");
});

test("syncreview is admin-only en Overnemen wijzigt geen lokale productieconfig", async (context) => {
  const { store, service, admin, operator } = await fixture(context);
  const state = await store.read();
  const article = state.articles.find(({ articleNumber }) => articleNumber === "137294");
  const originalProduction = { profileId: article.profileId, supports: structuredClone(article.supports), productionDataGaps: structuredClone(article.productionDataGaps) };
  await store.mutate(async (current) => {
    current.websiteSync.changes = [{
      id: "sync-change-review-fixture", kind: "WORKSPACE_SOURCE_DIFFERENCE", sourceIdentifier: "137294", sourceFingerprint: "fixture-v2", label: "Nieuwe publieke artikelnaam", association: article.association, status: "PENDING_REVIEW",
      sourceValue: { name: "Nieuwe publieke artikelnaam", url: "https://www.sportpaleis.nl/fixture.html", productionRelevance: { status: "RELEVANT", fields: ["Rugnummer"] } },
      workspaceValue: { name: article.name, url: article.catalogProvenance?.url ?? null }, explanation: "Bronnaam gewijzigd.", nextBestAction: "Vergelijk de brongegevens",
    }];
    current.websiteSync.counts.attention = 1;
    return { state: current, value: null };
  });
  await assert.rejects(service.reviewWebsiteSyncChange(operator.token, operator.csrfToken, "sync-change-review-fixture", { action: "ACCEPT_SOURCE" }), (error) => error.statusCode === 403);
  await service.reviewWebsiteSyncChange(admin.token, admin.csrfToken, "sync-change-review-fixture", { action: "ACCEPT_SOURCE" });
  const accepted = (await store.read()).articles.find(({ id }) => id === article.id);
  assert.equal(accepted.name, "Nieuwe publieke artikelnaam");
  assert.deepEqual({ profileId: accepted.profileId, supports: accepted.supports, productionDataGaps: accepted.productionDataGaps }, originalProduction);
  assert.equal((await store.read()).websiteSync.changes.length, 0);
});

test("First-Use copy maakt voorbereiding, review en hard-off boundaries expliciet", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Een voorstel of productiebestand rondt een kleur nooit af; alleen Bedrukt doet dat/u);
  assert.match(source, /Vereniging \(optioneel\)/u);
  assert.match(source, /Rugnummers/u);
  assert.match(source, /Initialen/u);
  assert.match(source, /Overnemen/u);
  assert.match(source, /Behouden/u);
  assert.match(source, /button\("done"\)/u);
  assert.match(source, /filterButton\("ready-for-pickup", "Afhalen"\)/u);
  assert.match(source, /Kleding opgehaald/u);
  assert.match(source, /data-production-order-search/u);
  assert.match(source, /Ordernummer, klant of team/u);
  assert.match(source, /sourceContext\?\.externalReference/u);
  assert.match(source, /complete-one-production-order/u);
  assert.match(source, /DIVIDE \/ WEBSHOPMAIL/u);
  assert.match(source, /Gecontroleerde mail- en PDF-intake/u);
});
