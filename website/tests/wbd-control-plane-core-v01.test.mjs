import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import { WBD_CAPABILITY_SEED } from "../scripts/wbd-capability-catalog.mjs";
import {
  projectControlOverview,
  wbdControlPlaneContract,
} from "../scripts/wbd-control-plane.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
  createWbdOwnerRequestHandler,
} from "../scripts/wbd-owner-foundation.mjs";

const password = "WBD-Control-Plane-Core-Test-001!";
const fixedNow = new Date("2026-08-16T12:00:00.000Z");
const future = "2026-12-31T00:00:00.000Z";

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-control-plane-v01-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwordRecord = await createWorkspacePasswordRecord(password);
  const store = new WbdOwnerFileStore({
    filePath: path.join(root, "state.json"),
    bootstrap: async () => createInitialWbdOwnerState({ passwordRecord, now: fixedNow }),
  });
  const service = new WbdOwnerService({
    store,
    releaseId: "WBD-CONTROL-PLANE-CORE-V0.1-TEST",
    allowedOrigin: "http://127.0.0.1",
  });
  await service.initialize();
  const login = await service.login({
    email: "donovanweide@gmail.com",
    password,
    remoteAddress: "test",
    now: fixedNow,
  });
  return { root, store, service, login };
}

function healthySource(reviewDueAt = future, impact = "HIGH") {
  return { coverage: "COMPLETE", impact, reviewDueAt, permitsNoAttentionClaim: true };
}

async function createRecord(service, login, control, recordType, payload, now = fixedNow) {
  return service.createControlRecord(login.token, login.csrfToken, recordType, {
    ...payload,
    expectedRevision: control.revision,
  }, now);
}

async function populateCanonicalCore(service, login) {
  let control = await service.controlPlane(login.token, fixedNow);
  const organization = await createRecord(service, login, control, "organizations", {
    name: "Testklant",
    relationshipType: "CUSTOMER",
    status: "ACTIVE",
    sourceRefs: ["owner-confirmation:testklant"],
    reviewedAt: fixedNow.toISOString(),
    sourceHealth: healthySource(),
  });
  control = await service.controlPlane(login.token, fixedNow);
  const opportunity = await createRecord(service, login, control, "opportunities", {
    organizationId: organization.record.id,
    title: "Bevestigde beheerkans",
    problemOrOpportunity: "Continuiteit en operationele verantwoordelijkheid.",
    status: "OPEN",
    valueType: "MRR",
    expectedOneOffRevenue: null,
    expectedMrr: 600,
    proposalStatus: "DRAFT",
    evidenceRefs: ["owner-confirmation:opportunity"],
    nextReviewAt: future,
    ownerActionId: null,
    sourceHealth: healthySource(),
  });
  control = await service.controlPlane(login.token, fixedNow);
  const commitment = await createRecord(service, login, control, "commitments", {
    organizationId: organization.record.id,
    status: "ACTIVE",
    contractedMrr: 600,
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: null,
    renewalReviewAt: future,
    responsibilities: [{ description: "Operationele continuiteit bewaken", responsibleParty: "WBD" }],
    sourceRefs: ["contract:test-001"],
    sourceHealth: healthySource(future, "CRITICAL"),
  });
  control = await service.controlPlane(login.token, fixedNow);
  const action = await createRecord(service, login, control, "actions", {
    subjectType: "OPPORTUNITY",
    subjectId: opportunity.record.id,
    title: "Voorstel met klant bespreken",
    reasonDonovanNeeded: "Alleen Donovan kan de commerciele afspraak bevestigen.",
    status: "OPEN",
    priority: "HIGH",
    dueAt: "2026-08-20T00:00:00.000Z",
    sourceRefs: ["owner-confirmation:next-action"],
    sourceHealth: healthySource(),
  });
  control = await service.controlPlane(login.token, fixedNow);
  const recurring = await createRecord(service, login, control, "effort-observations", {
    organizationId: organization.record.id,
    serviceCommitmentId: commitment.record.id,
    timeClass: "RECURRING_SERVICE",
    category: "SUPPORT",
    minutes: 60,
    context: "Maandelijkse supportwaarneming",
    capturedAt: fixedNow.toISOString(),
    sourceRefs: ["manual-effort:test"],
    sourceHealth: healthySource("2026-09-08T00:00:00.000Z", "MEDIUM"),
    correctionOf: null,
  });
  control = await service.controlPlane(login.token, fixedNow);
  const sales = await createRecord(service, login, control, "effort-observations", {
    organizationId: organization.record.id,
    serviceCommitmentId: null,
    timeClass: "SALES",
    category: "CUSTOMER_CONTACT",
    minutes: 60,
    context: "Los verkoopgesprek",
    capturedAt: fixedNow.toISOString(),
    sourceRefs: ["manual-effort:sales"],
    sourceHealth: healthySource("2026-09-08T00:00:00.000Z", "MEDIUM"),
    correctionOf: null,
  });
  return { organization, opportunity, commitment, action, recurring, sales };
}

test("initialisatie bevat uitsluitend WBD en maakt onbekende bronnen niet kunstmatig groen", async (context) => {
  const { service, login } = await fixture(context);
  const control = await service.controlPlane(login.token, fixedNow);
  assert.deepEqual(control.organizations.map(({ id }) => id), ["we-build-and-design"]);
  assert.equal(control.opportunities.length, 0);
  assert.equal(control.serviceCommitments.length, 0);
  assert.equal(control.ownerActions.length, 0);
  assert.equal(control.effortObservations.length, 0);
  assert.doesNotMatch(JSON.stringify(control), /Sportpaleis|BijCees|AquaFlask/i);
  const overview = await service.controlOverview(login.token, fixedNow);
  assert.equal(overview.reliability.status, "ONVOLDOENDE BRONDEKKING");
  assert.equal(overview.reliability.noAttentionNeeded, false);
  assert.equal(overview.company.confirmedContractedMrr, null);
  assert.equal(overview.company.recurringMinutes, null);
  assert.equal(overview.company.mrrPerRecurringHour, null);
  assert.equal(overview.nextBestAction, null);
});

test("vijf canonieke feiten zijn centraal, device-onafhankelijk en economisch correct geprojecteerd", async (context) => {
  const { service, login } = await fixture(context);
  const created = await populateCanonicalCore(service, login);
  const mobile = await service.login({ email: "DONOVANWEIDE@GMAIL.COM", password, deviceMode: "PERSONAL", remoteAddress: "iphone", now: fixedNow });
  const desktopControl = await service.controlPlane(login.token, fixedNow);
  const mobileControl = await service.controlPlane(mobile.token, fixedNow);
  assert.deepEqual(mobileControl, desktopControl);
  assert.equal(desktopControl.organizations.length, 2);
  assert.equal(desktopControl.opportunities.length, 1);
  assert.equal(desktopControl.serviceCommitments.length, 1);
  assert.equal(desktopControl.ownerActions.length, 1);
  assert.equal(desktopControl.effortObservations.length, 2);
  assert.ok(desktopControl.audit.every(({ actor, changedFields, lifecycleAction }) => actor === "wbd-owner-donovan" && changedFields.length > 0 && lifecycleAction));

  const overview = await service.controlOverview(login.token, fixedNow);
  assert.equal(overview.reliability.status, "BETROUWBAAR");
  assert.equal(overview.company.confirmedContractedMrr, 600);
  assert.equal(overview.company.recurringMinutes, 60);
  assert.equal(overview.company.mrrPerRecurringHour, 600);
  assert.equal(overview.company.evidenceStatus, "SUFFICIENT");
  assert.equal(overview.nextBestAction.id, created.action.record.id);
  assert.equal(overview.opportunities[0].id, created.opportunity.record.id);

  const catalog = await service.capabilityCatalog(login.token);
  assert.deepEqual(catalog.capabilities, WBD_CAPABILITY_SEED);
});

test("geen effort is UNKNOWN; SALES en IMPLEMENTATION tellen niet als recurring tijd", async (context) => {
  const { service, login } = await fixture(context);
  let control = await service.controlPlane(login.token, fixedNow);
  const commitment = await createRecord(service, login, control, "commitments", {
    organizationId: "we-build-and-design",
    status: "ACTIVE",
    contractedMrr: 1000,
    startsAt: null,
    endsAt: null,
    renewalReviewAt: future,
    responsibilities: [{ description: "Eigen control-plane continuiteit", responsibleParty: "WBD" }],
    sourceRefs: ["owner-confirmation:wbd"],
    sourceHealth: healthySource(future, "CRITICAL"),
  });
  let overview = await service.controlOverview(login.token, fixedNow);
  assert.equal(overview.company.confirmedContractedMrr, 1000);
  assert.equal(overview.company.recurringMinutes, null);
  assert.equal(overview.company.mrrPerRecurringHour, null);

  for (const [timeClass, minutes] of [["SALES", 30], ["IMPLEMENTATION", 60]]) {
    control = await service.controlPlane(login.token, fixedNow);
    await createRecord(service, login, control, "effort-observations", {
      organizationId: "we-build-and-design",
      serviceCommitmentId: timeClass === "IMPLEMENTATION" ? commitment.record.id : null,
      timeClass,
      category: "CODEX_DIRECTION",
      minutes,
      context: `${timeClass} telt niet recurring`,
      capturedAt: fixedNow.toISOString(),
      sourceRefs: [`manual-effort:${timeClass.toLowerCase()}`],
      sourceHealth: healthySource("2026-09-08T00:00:00.000Z", "MEDIUM"),
      correctionOf: null,
    });
  }
  overview = await service.controlOverview(login.token, fixedNow);
  assert.equal(overview.company.recurringMinutes, null);
  assert.equal(overview.company.mrrPerRecurringHour, null);
});

test("STALE en FAILED blokkeren groen; last-known-good blijft alleen historisch zichtbaar", async (context) => {
  const { service, login, store } = await fixture(context);
  await populateCanonicalCore(service, login);
  await store.mutate(async (state) => {
    const source = state.controlPlane.sourceHealth.find(({ sourceId }) => sourceId === wbdControlPlaneContract.domainSources.commitments);
    source.lastFailureCode = "SOURCE_CHECK_FAILED";
    source.lastAttemptAt = "2026-08-16T13:00:00.000Z";
    source.lastKnownGoodAt = source.lastSuccessfulObservation;
    return { state, value: undefined };
  });
  let overview = await service.controlOverview(login.token, new Date("2026-08-16T14:00:00.000Z"));
  assert.equal(overview.reliability.status, "ONVOLDOENDE BRONDEKKING");
  assert.equal(overview.reliability.noAttentionNeeded, false);
  const failed = overview.reliability.blockers.find(({ sourceId }) => sourceId === wbdControlPlaneContract.domainSources.commitments);
  assert.equal(failed.status, "FAILED");
  assert.ok(failed.lastKnownGoodAt);
  assert.equal(overview.company.confirmedContractedMrr, null);

  await store.mutate(async (state) => {
    const source = state.controlPlane.sourceHealth.find(({ sourceId }) => sourceId === wbdControlPlaneContract.domainSources.commitments);
    source.lastFailureCode = null;
    source.lastAttemptAt = source.lastSuccessfulObservation;
    source.freshnessRequirement.reviewDueAt = "2026-08-15T00:00:00.000Z";
    return { state, value: undefined };
  });
  overview = await service.controlOverview(login.token, new Date("2026-08-16T14:00:00.000Z"));
  assert.equal(overview.reliability.blockers.find(({ sourceId }) => sourceId === wbdControlPlaneContract.domainSources.commitments).status, "STALE");
  assert.notEqual(overview.reliability.status, "BETROUWBAAR");
});

test("revisionconflict geeft 409 zonder overwrite en effort wordt alleen traceerbaar VOIDED", async (context) => {
  const { service, login } = await fixture(context);
  const created = await populateCanonicalCore(service, login);
  const control = await service.controlPlane(login.token, fixedNow);
  const completed = await service.updateControlRecord(login.token, login.csrfToken, "actions", created.action.record.id, {
    expectedRevision: control.revision,
    expectedRecordRevision: created.action.record.revision,
    status: "DONE",
  }, new Date("2026-08-16T13:00:00.000Z"));
  assert.equal(completed.record.status, "DONE");
  assert.ok(completed.record.completedAt);
  const quietOverview = await service.controlOverview(login.token, new Date("2026-08-16T13:00:00.000Z"));
  assert.equal(quietOverview.reliability.status, "BETROUWBAAR");
  assert.equal(quietOverview.reliability.noAttentionNeeded, true);
  const beforeConflict = await service.controlPlane(login.token, fixedNow);
  await assert.rejects(
    service.updateControlRecord(login.token, login.csrfToken, "actions", created.action.record.id, {
      expectedRevision: control.revision,
      expectedRecordRevision: completed.record.revision,
      title: "Mag niet overschrijven",
    }, new Date("2026-08-16T13:01:00.000Z")),
    (error) => error.statusCode === 409 && error.code === "REVISION_CONFLICT",
  );
  assert.deepEqual(await service.controlPlane(login.token, fixedNow), beforeConflict);

  const current = await service.controlPlane(login.token, fixedNow);
  const voided = await service.updateControlRecord(login.token, login.csrfToken, "effort-observations", created.recurring.record.id, {
    expectedRevision: current.revision,
    expectedRecordRevision: created.recurring.record.revision,
    status: "VOIDED",
    voidReason: "Foutieve handmatige registratie",
  }, new Date("2026-08-16T13:02:00.000Z"));
  assert.equal(voided.record.status, "VOIDED");
  assert.equal(voided.record.minutes, 60);
  assert.ok(voided.record.voidedAt);
  assert.ok((await service.controlPlane(login.token, fixedNow)).audit.some(({ recordId, lifecycleAction }) => recordId === created.recurring.record.id && lifecycleAction === "VOIDED"));
});

test("strikte canonical API weigert Atlas-candidates, betaalstatus en ongeldige enums/bedragen/datums", async (context) => {
  const { service, login } = await fixture(context);
  const validBase = {
    organizationId: "we-build-and-design",
    title: "Niet stil promoveren",
    problemOrOpportunity: "Test",
    status: "OPEN",
    valueType: "UNKNOWN",
    expectedOneOffRevenue: null,
    expectedMrr: null,
    proposalStatus: "NONE",
    evidenceRefs: ["owner:test"],
    nextReviewAt: future,
    ownerActionId: null,
    sourceHealth: healthySource(),
  };
  for (const patch of [
    { atlasCandidate: true },
    { paymentStatus: "PAID" },
    { status: "CANDIDATE" },
    { valueType: "MRR", expectedMrr: 1.999 },
    { nextReviewAt: "morgen" },
  ]) {
    const control = await service.controlPlane(login.token, fixedNow);
    const revision = control.revision;
    await assert.rejects(
      createRecord(service, login, control, "opportunities", { ...validBase, ...patch }),
      (error) => error.statusCode === 400,
    );
    assert.equal((await service.controlPlane(login.token, fixedNow)).revision, revision);
  }
});

test("HTTP-boundary is owner-only, no-store en beschermt mutaties met origin plus CSRF", async (context) => {
  const { service } = await fixture(context);
  const handler = createWbdOwnerRequestHandler(service);
  const server = createServer(async (request, response) => { if (!await handler(request, response)) response.end(); });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = origin;

  const unauthorized = await fetch(`${origin}/api/wbd/v1/control`);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await unauthorized.text(), /we-build-and-design|opportunities|serviceCommitments/i);

  const loginResponse = await fetch(`${origin}/api/wbd/v1/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "donovanweide@gmail.com", password }),
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
  const session = await loginResponse.json();
  const control = await (await fetch(`${origin}/api/wbd/v1/control`, { headers: { Cookie: cookie } })).json();
  const body = JSON.stringify({
    expectedRevision: control.revision,
    name: "HTTP Test",
    relationshipType: "PROSPECT",
    status: "ACTIVE",
    sourceRefs: ["owner:http"],
    reviewedAt: fixedNow.toISOString(),
    sourceHealth: healthySource(),
  });
  assert.equal((await fetch(`${origin}/api/wbd/v1/control/organizations`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, body })).status, 403);
  assert.equal((await fetch(`${origin}/api/wbd/v1/control/organizations`, { method: "POST", headers: { Cookie: cookie, Origin: "https://attacker.invalid", "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken }, body })).status, 403);
  assert.equal((await fetch(`${origin}/api/wbd/v1/control/organizations`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken }, body })).status, 200);
});

test("Home-route en ownerbundle blijven gescheiden van legacy browserdata en Atlas-writeauthority", async () => {
  const [runtime, owner, home] = await Promise.all([
    readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-control-home.ts", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /const workspaceHome = `\$\{workspaceBoundary\}\/home`/u);
  assert.match(owner, /\/api\/wbd\/v1\/control\/overview/u);
  assert.match(home, /ONVOLDOENDE BEWIJS VOOR .* BESTE VOLGENDE ACTIE/u);
  assert.doesNotMatch(home, /indexedDB|localStorage|atlasCandidate|Atlas Candidate-store/iu);
  assert.doesNotMatch(owner + home, /atlasCandidate|Atlas Candidate-store/iu);
  assert.doesNotMatch(runtime, /BijCees|AquaFlask/u);
});

test("rollbackrelease 96c68b62 bewaart een onbekende geneste controlPlane ongewijzigd", () => {
  const previousOwnerFoundation = execFileSync("git", ["show", "96c68b62:website/scripts/wbd-owner-foundation.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.match(previousOwnerFoundation, /const state = structuredClone\(input\)/u);
  assert.doesNotMatch(previousOwnerFoundation, /state\.controlPlane/u);
  assert.match(previousOwnerFoundation, /return state;/u);
});
