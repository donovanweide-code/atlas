import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
} from "../scripts/wbd-owner-foundation.mjs";
import { renderPromotionCards } from "../src/wbd-control-home.ts";

const password = "Historical-Bootstrap-Test-20260816!";
const now = new Date("2026-08-16T14:00:00.000Z");

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-human-correction-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwordRecord = await createWorkspacePasswordRecord(password);
  const store = new WbdOwnerFileStore({ filePath: path.join(root, "state.json"), bootstrap: async () => createInitialWbdOwnerState({ passwordRecord, now }) });
  const service = new WbdOwnerService({ store, releaseId: "WBD-HISTORICAL-BOOTSTRAP-TEST", allowedOrigin: "https://workspace.test", secureCookies: true });
  await service.initialize();
  const login = await service.login({ email: "donovanweide@gmail.com", password, remoteAddress: "test", now });
  return { root, store, service, login };
}

async function addExistingSportpaleis(service, login) {
  const control = await service.controlPlane(login.token, now);
  return service.createControlRecord(login.token, login.csrfToken, "organizations", {
    expectedRevision: control.revision,
    name: "Sport2000 sportpaleis",
    relationshipType: "CUSTOMER",
    status: "ACTIVE",
    sourceRefs: ["Bevestigd"],
    reviewedAt: now.toISOString(),
    sourceHealth: { coverage: "PARTIAL", impact: "MEDIUM", reviewDueAt: "2027-08-16T00:00:00.000Z", permitsNoAttentionClaim: false },
  }, now);
}

async function review(service, login, proposalId, decision, adjustments) {
  const control = await service.controlPlane(login.token, now);
  return service.reviewPromotion(login.token, login.csrfToken, proposalId, { expectedRevision: control.revision, decision, adjustments }, now);
}

test("voorstellen muteren niets vóór acceptatie en bron/Atlas heeft geen schrijfpad", async (context) => {
  const { store, service, login } = await fixture(context);
  await addExistingSportpaleis(service, login);
  const before = await store.read();
  const view = await service.promotions(login.token, now);
  const after = await store.read();
  assert.equal(after.revision, before.revision);
  assert.deepEqual(after.controlPlane, before.controlPlane);
  assert.equal(view.proposals.length, 4);
  await assert.rejects(service.promotions(undefined, now), ({ statusCode, code }) => statusCode === 401 && code === "UNAUTHENTICATED");
  assert.equal(typeof service.atlasPromotionWrite, "undefined");
});

test("MATCH accepteert exact één mutatie op bestaand Sportpaleis en bewaart id, createdAt en audit", async (context) => {
  const { store, service, login } = await fixture(context);
  const created = await addExistingSportpaleis(service, login);
  const before = await store.read();
  const oldRecord = before.controlPlane.organizations.find(({ id }) => id === created.record.id);
  const result = await review(service, login, "sportpaleis-existing-organization-match-v1", "ACCEPT");
  const after = await store.read();
  const matches = after.controlPlane.organizations.filter(({ name }) => name.toLowerCase().includes("sportpaleis"));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, oldRecord.id);
  assert.equal(matches[0].createdAt, oldRecord.createdAt);
  assert.equal(matches[0].revision, oldRecord.revision + 1);
  assert.equal(matches[0].name, "Sport 2000 Sportpaleis B.V.");
  assert.equal(after.controlPlane.audit.length, before.controlPlane.audit.length + 1);
  assert.equal(after.promotionBoundary.reviews.length, 1);
  assert.equal(result.review.canonicalRecordId, oldRecord.id);
  assert.equal(after.controlPlane.serviceCommitments.length, 0);
  assert.equal(after.controlPlane.opportunities.length, 0);
});

test("Aanpassen bewaart uitsluitend toegestane menselijke betekenis; technische velden worden geweigerd", async (context) => {
  const { store, service, login } = await fixture(context);
  const accepted = await review(service, login, "bij-cees-historical-organization-v1", "ADJUST", { name: "Bij Cees", relationshipType: "CUSTOMER", status: "ACTIVE" });
  assert.equal(accepted.record.name, "Bij Cees");
  assert.equal(accepted.record.status, "ACTIVE");
  const state = await store.read();
  const source = state.controlPlane.sourceHealth.find(({ sourceId }) => sourceId === accepted.record.sourceHealthId);
  assert.equal(source.coverage, "PARTIAL");
  assert.equal(source.permitsNoAttentionClaim, false);
  assert.equal(state.controlPlane.organizations.some(({ name }) => name === "AquaFlask"), false);

  const { service: secondService, login: secondLogin } = await fixture(context);
  await assert.rejects(
    review(secondService, secondLogin, "bij-cees-historical-organization-v1", "ADJUST", { sourceHealthId: "fake", status: "ACTIVE" }),
    ({ code }) => code === "PROMOTION_FIELD_NOT_ALLOWED",
  );
});

test("Afwijzen legt review vast maar maakt geen canoniek record", async (context) => {
  const { store, service, login } = await fixture(context);
  const before = await store.read();
  const result = await review(service, login, "bij-cees-historical-organization-v1", "REJECT");
  const after = await store.read();
  assert.equal(after.controlPlane.organizations.length, before.controlPlane.organizations.length);
  assert.equal(result.record, null);
  assert.equal(after.promotionBoundary.reviews[0].decision, "REJECT");
});

test("globale revisionconflict geeft 409 en laat canonical plus reviewstate ongewijzigd", async (context) => {
  const { store, service, login } = await fixture(context);
  const control = await service.controlPlane(login.token, now);
  await service.createControlRecord(login.token, login.csrfToken, "organizations", {
    expectedRevision: control.revision,
    name: "Tussenmutatie",
    relationshipType: "PROSPECT",
    status: "UNKNOWN",
    sourceRefs: ["owner-confirmation"],
    reviewedAt: now.toISOString(),
  }, now);
  const before = await store.read();
  await assert.rejects(
    service.reviewPromotion(login.token, login.csrfToken, "bij-cees-historical-organization-v1", { expectedRevision: control.revision, decision: "ACCEPT" }, now),
    ({ statusCode, code }) => statusCode === 409 && code === "REVISION_CONFLICT",
  );
  assert.deepEqual(await store.read(), before);
});

test("proposal, evidence, canonieke mutatie en beide audits blijven herleidbaar", async (context) => {
  const { store, service, login } = await fixture(context);
  const result = await review(service, login, "bij-cees-historical-organization-v1", "ACCEPT");
  const state = await store.read();
  const ledger = state.promotionBoundary.reviews[0];
  assert.equal(ledger.canonicalRecordId, result.record.id);
  assert.equal(ledger.proposalSnapshot.id, "bij-cees-historical-organization-v1");
  assert.ok(ledger.evidence[0].source);
  assert.equal(ledger.afterMeaning.id, result.record.id);
  assert.ok(state.controlPlane.audit.some(({ recordId, lifecycleAction }) => recordId === result.record.id && lifecycleAction === "PROMOTION_CREATED"));
  assert.ok(state.audit.some(({ subject }) => subject === "bij-cees-historical-organization-v1"));
});

test("Opportunity en Owner Action vereisen ontbrekende menselijke betekenis; UNKNOWN blijft UNKNOWN", async (context) => {
  const { store, service, login } = await fixture(context);
  await review(service, login, "bij-cees-historical-organization-v1", "ACCEPT");
  const afterParent = await service.promotions(login.token, now);
  assert.equal(afterParent.proposals.find(({ id }) => id === "bijcees-aquaflask-commercial-opportunity-v1").status, "READY");
  assert.equal(afterParent.proposals.find(({ id }) => id === "bijcees-current-situation-owner-action-v1").status, "WAITING");
  const beforeIncompleteOpportunity = await store.read();
  await assert.rejects(review(service, login, "bijcees-aquaflask-commercial-opportunity-v1", "ACCEPT"), ({ code }) => code === "PROMOTION_MEANING_INCOMPLETE");
  assert.deepEqual(await store.read(), beforeIncompleteOpportunity);
  const opportunity = await review(service, login, "bijcees-aquaflask-commercial-opportunity-v1", "ADJUST", { nextReviewAt: "2026-09-01T00:00:00.000Z" });
  assert.equal(opportunity.record.valueType, "UNKNOWN");
  assert.equal(opportunity.record.expectedOneOffRevenue, null);
  assert.equal(opportunity.record.expectedMrr, null);
  assert.equal(opportunity.record.proposalStatus, "NONE");
  assert.equal((await service.promotions(login.token, now)).proposals.find(({ id }) => id === "bijcees-current-situation-owner-action-v1").status, "READY");
  assert.equal((await store.read()).controlPlane.serviceCommitments.length, 0);
  const beforeIncompleteAction = await store.read();
  await assert.rejects(review(service, login, "bijcees-current-situation-owner-action-v1", "ACCEPT"), ({ code }) => code === "PROMOTION_MEANING_INCOMPLETE");
  assert.deepEqual(await store.read(), beforeIncompleteAction);
  const action = await review(service, login, "bijcees-current-situation-owner-action-v1", "ADJUST", { priority: "HIGH" });
  assert.equal(action.record.priority, "HIGH");
  assert.equal(action.record.dueAt, null);
  const finalState = await store.read();
  assert.equal(finalState.controlPlane.opportunities.length, 1);
  assert.equal(finalState.controlPlane.ownerActions.length, 1);
});

test("verplichte menselijke betekenis krijgt een actieve Aanvullen en bevestigen-route", () => {
  const promotion = (canonicalType, requiredHumanFields) => ({
    id: canonicalType === "OPPORTUNITY" ? "bijcees-aquaflask-commercial-opportunity-v1" : "bijcees-current-situation-owner-action-v1",
    operation: "CREATE",
    canonicalType,
    title: canonicalType === "OPPORTUNITY" ? "Digitale vernieuwing" : "Actuele situatie onderzoeken",
    summary: "Menselijke betekenis is vereist.",
    confidence: "MIDDEL",
    uncertainty: "Waarde blijft onbekend.",
    evidence: [],
    allowedAdjustments: canonicalType === "OPPORTUNITY" ? ["nextReviewAt"] : ["priority"],
    requiredHumanFields,
    status: "READY",
    message: null,
    reviewed: null,
  });
  const html = renderPromotionCards({
    schemaVersion: 1,
    revision: 49,
    releaseId: "TEST",
    proposals: [promotion("OPPORTUNITY", ["nextReviewAt"]), promotion("OWNER_ACTION", ["priority"])],
  });
  assert.equal((html.match(/data-promotion-complete=/gu) ?? []).length, 2);
  assert.equal((html.match(/>Aanvullen en bevestigen<\/button>/gu) ?? []).length, 4);
  assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Bevestigen<\/button>/u);
  assert.doesNotMatch(html, /data-promotion-toggle=/u);
  assert.match(html, /name="nextReviewAt" type="date" required/u);
  assert.match(html, /name="priority" required/u);

  const source = readFileSync(new URL("../src/wbd-control-home.ts", import.meta.url), "utf8");
  assert.match(source, /data-promotion-complete/u);
  assert.match(source, /form\.hidden = false/u);
  assert.match(source, /proposal\.requiredHumanFields\?\.\[0\]/u);
  assert.match(source, /focusTarget instanceof HTMLElement\) focusTarget\.focus\(\)/u);
});

test("één Organization-bevestiging maakt organizations-coverage niet compleet en Home toont Organizations", async (context) => {
  const { service, login } = await fixture(context);
  await review(service, login, "bij-cees-historical-organization-v1", "ACCEPT");
  const control = await service.controlPlane(login.token, now);
  const source = control.sourceHealth.find(({ sourceId }) => sourceId === "wbd-owner-confirmed-organizations");
  assert.equal(source.coverage, "PARTIAL");
  const ui = await readFile(new URL("../src/wbd-control-home.ts", import.meta.url), "utf8");
  assert.match(ui, /<h2 id="organizations-title">Organisaties<\/h2>/u);
  assert.match(ui, /organizationCards\(control\)/u);
  assert.doesNotMatch(ui, /name="(?:sourceCoverage|sourceHealthId|permitsNoAttentionClaim|sourceImpact)"|function sourceFields/u);
  assert.match(ui, /Waarom weten we dit\?/u);
});

test("Capabilities en browserdata blijven buiten de correctiescope", async () => {
  const diff = execFileSync("git", ["diff", "2e23b7c", "--", "website/scripts/wbd-capability-catalog.mjs"], { encoding: "utf8" });
  assert.equal(diff, "");
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const home = await readFile(new URL("../src/wbd-control-home.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${owner}\n${home}`, /indexedDB|localStorage\.setItem|localStorage\.removeItem|indexedDB\.deleteDatabase/u);
  assert.match(owner, /capabilityCard/u);
});

test("R2-rollbackvalidator bewaart onbekende promotionmetadata veilig en negeert die", async (context) => {
  const { store, service, login, root } = await fixture(context);
  await review(service, login, "bij-cees-historical-organization-v1", "ACCEPT");
  const state = await store.read();
  const oldRoot = path.join(root, "old-release");
  await writeFile(path.join(root, "placeholder"), "ok");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(oldRoot));
  for (const name of ["wbd-owner-foundation.mjs", "workspace-auth-foundation.mjs", "wbd-capability-catalog.mjs", "wbd-control-plane.mjs"]) {
    const source = execFileSync("git", ["show", `2e23b7c:website/scripts/${name}`], { encoding: "utf8" });
    await writeFile(path.join(oldRoot, name), source);
  }
  const oldRelease = await import(`${pathToFileURL(path.join(oldRoot, "wbd-owner-foundation.mjs")).href}?v=rollback`);
  const validated = oldRelease.validateWbdOwnerState(state);
  assert.deepEqual(validated.promotionBoundary, state.promotionBoundary);
  assert.deepEqual(validated.controlPlane, state.controlPlane);
});

test("Home-polish is gescopeerd, mobiel éénkoloms en releasecontract blijft immutable-ready", async () => {
  const css = await readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8");
  assert.match(css, /dark WBD shell, quiet light owner work layer/u);
  assert.match(css, /\.wbd-control-worklayer[^}]*background:#f4f1ea/u);
  assert.match(css, /@media \(max-width:840px\)[\s\S]*\.wbd-promotion-list \{ grid-template-columns:1fr/u);
  const releaseBuilder = await readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8");
  assert.match(releaseBuilder, /manifest|sha256|release/iu);
});
