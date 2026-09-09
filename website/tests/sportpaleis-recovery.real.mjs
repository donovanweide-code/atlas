import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";
import { SportpaleisDomainMariaDbStore } from "../scripts/sportpaleis-domain-mariadb-store.mjs";
import { SportpaleisPilotService, createSportpaleisPasswordRecord } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createPermissionPolicy, permissionDecision } from "../scripts/workspace-permissions.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { sha256CanonicalJson } from "../scripts/workspace-domain-state.mjs";

// This harness accepts only a disposable, separately restored database. It has
// no production database credentials, deployment, migration or cleanup path.
const database = process.env.RECOVERY_TEST_DATABASE;
assert.match(database || "", /^spw_recovery_test_[a-z0-9_]+$/);
assert.notEqual(database, process.env.WORKSPACE_DB_NAME);
const evidenceRoot = process.env.RECOVERY_EVIDENCE_ROOT;
assert.ok(evidenceRoot && path.isAbsolute(evidenceRoot)); await mkdir(evidenceRoot, { recursive: true });
const oldRoot = process.env.RECOVERY_PREVIOUS_WEBSITE; assert.ok(oldRoot);
const forwardRoot = process.env.RECOVERY_FORWARD_WEBSITE; assert.ok(forwardRoot);
const oldModule = await import(pathToFileURL(path.join(oldRoot, "scripts/sportpaleis-domain-mariadb-store.mjs")).href);
const forwardModule = await import(pathToFileURL(path.join(forwardRoot, "scripts/sportpaleis-domain-mariadb-store.mjs")).href);
const forwardServiceModule = await import(pathToFileURL(path.join(forwardRoot, "scripts/sportpaleis-pilot-foundation.mjs")).href);
const stores = [];
const connect = async (Store = SportpaleisDomainMariaDbStore) => {
  const pool = mariadb.createPool({ socketPath: "/run/mysqld/mysqld.sock", user: "root", database, connectionLimit: 3, bigIntAsNumber: true, insertIdAsNumber: true, timezone: "Z" });
  const store = new Store({ pool }); stores.push(store); await store.initialize(); return store;
};
const serviceFor = async (store, Service = SportpaleisPilotService) => {
  const service = new Service({ store, runtimeArtifactRoot: path.join(evidenceRoot, "artifacts"), artifactRoot: path.resolve("..") }); await service.initialize(); return service;
};
const omitEmptyPlanning = state => { const copy = { ...state }; for (const key of ["workItems", "workItemEvents"]) if (!copy[key]?.length) delete copy[key]; return copy; };
const retained = state => sha256CanonicalJson({ items: state.workItems, events: state.workItemEvents, permissions: state.workspacePermissions });
const business = state => sha256CanonicalJson([state.orders, state.productionJobs, state.productionProposals, state.articles, state.productionFonts, state.mailFoundation]);
const stats = values => { const sorted = [...values].sort((a,b)=>a-b); return { samples: sorted.length, p50Ms: sorted[Math.floor(sorted.length * .5)], p95Ms: sorted[Math.floor(sorted.length * .95)] }; };
const timings = async (operation, count = 40) => { const values = []; for (let i=0;i<count;i++) { const started=performance.now(); await operation(); values.push(performance.now()-started); } return stats(values); };
const result = { status: "RUNNING", liveMutations: 0, database, checks: {} };
try {
  const old = await connect(oldModule.SportpaleisDomainMariaDbStore); const prior = await old.read();
  assert.equal(prior.workItems?.length || 0, 0); assert.equal(prior.workspacePermissions, undefined);
  const baseline = await connect(); const initial = await baseline.read();
  assert.equal(sha256CanonicalJson(omitEmptyPlanning(initial)), sha256CanonicalJson(omitEmptyPlanning(prior)));
  assert.equal(initial.revision, prior.revision); result.checks.prePlanningExactLiveClone = true;
  result.prePlanningRead = { previous: await timings(()=>old.read()), recovery: await timings(()=>baseline.read()) };
  const businessBefore = business(initial);
  const password = "Isolated-Recovery-Fixture-2026!"; const record = await createSportpaleisPasswordRecord(password);
  await baseline.mutate(state => {
    const profiles = [["recovery-admin", "admin", "developer"], ["recovery-worker", "operator", "operations"], ["recovery-denied", "store", "employee"]];
    for (const [id, role] of profiles) { assert.ok(!state.users.some(user=>user.id===id)); state.users.push({ id, name: id, initials: "RF", role, email: `${id}@example.test`, status: "Actief", seatType: "customer", salesNumber: null, password: record }); }
    state.workspacePermissions = createPermissionPolicy(state.organizationId, Object.fromEntries(profiles.map(([id,,presetId])=>[id,{presetId,overrides:{}}])), { enabledCapabilities: CAPABILITY_IDS });
    state.workspacePermissions.users["recovery-denied"].overrides = { "orders.create": "deny", "orders.edit": "deny", "planning.create": "deny", "planning.view": "deny" };
    return { state };
  });
  const forward = await connect(forwardModule.SportpaleisDomainMariaDbStore); const planner = await serviceFor(forward, forwardServiceModule.SportpaleisPilotService);
  const admin = await planner.login({ email: "recovery-admin@example.test", password });
  const worker = await planner.login({ email: "recovery-worker@example.test", password });
  const denied = await planner.login({ email: "recovery-denied@example.test", password });
  const credential = actor => ({ token: actor.token, csrfToken: actor.csrfToken });
  const task = await planner.workItems.create(credential(admin), { title: "Recovery overdue", owner: "recovery-worker", dueDate: "2020-01-01" });
  const noted = await planner.workItems.change(credential(worker), task.id, "note", { revision: task.revision, text: "Must survive both directions" });
  const appointment = await planner.workItems.create(credential(worker), { type: "APPOINTMENT", title: "Recovery appointment", dueDate: "2026-09-10", startTime: "10:00", endTime: "11:00" });
  await planner.workItems.change(credential(worker), appointment.id, "complete", { revision: appointment.revision });
  const post = await forward.read(); const planningHash = retained(post);
  assert.equal(post.workItems.length, 2); assert.equal(post.workItemEvents.length, 1);
  await assert.rejects(connect(oldModule.SportpaleisDomainMariaDbStore), /workItem.*recordgebonden/); result.checks.oldRuntimeFailureReproduced = true;
  const recoveryStore = await connect(); const recovery = await serviceFor(recoveryStore);
  assert.equal(retained(await recoveryStore.read()), planningHash);
  const boot = await recovery.bootstrap(admin.token); assert.ok(boot.orders.length); assert.equal(business(await recoveryStore.read()), businessBefore);
  assert.equal((await recovery.workItems.get(worker.token, task.id)).notes[0].text, "Must survive both directions");
  result.checks.rollbackStartupOrdersProductionPlanningAndPermissions = true;
  await assert.rejects(recovery.createOrder(denied.token, denied.csrfToken, {}, "denied-recovery-order"), { statusCode: 403 });
  await assert.rejects(recovery.workItems.create(credential(denied), { title: "Forbidden" }), { statusCode: 403 });
  assert.equal(permissionDecision((await recoveryStore.read()).workspacePermissions, { tenantId: "other-tenant", userId: "recovery-admin" }, "orders.create").allowed, false);
  await recoveryStore.mutate(state => { state.workItems.push({ ...structuredClone(state.workItems[0]), id: "foreign-recovery-fixture", workspaceId: "other-tenant" }); return { state }; });
  await assert.rejects(recovery.workItems.get(admin.token, "foreign-recovery-fixture"), { statusCode: 404 });
  const revoked = await recovery.login({ email: "recovery-worker@example.test", password });
  await recovery.logout(revoked.token, (await recovery.authenticate(revoked.token)).user, revoked.csrfToken);
  await assert.rejects(recovery.workItems.change(credential(revoked), task.id, "complete", { revision: noted.revision }), { statusCode: 401 });
  await assert.rejects(recovery.createOrder(revoked.token, revoked.csrfToken, {}, "revoked-recovery-order"), { statusCode: 401 });
  result.checks.revokedAndUnauthorizedWritesAndTenantIsolation = true;
  const beforeOperation = retained(await recoveryStore.read());
  await recovery.savePreferences(worker.token, worker.csrfToken, { panelOrder: ["attention","production","recent","shortcuts"], view: "compact", density: "compact" });
  assert.equal(retained(await recoveryStore.read()), beforeOperation);
  const restartedForward = await connect(forwardModule.SportpaleisDomainMariaDbStore); const resumed = await serviceFor(restartedForward, forwardServiceModule.SportpaleisPilotService);
  assert.equal(retained(await restartedForward.read()), beforeOperation);
  const completed = await resumed.workItems.change(credential(worker), task.id, "complete", { revision: noted.revision });
  assert.equal(completed.completedBy, "recovery-worker"); assert.equal(completed.notes.length, 1);
  assert.equal((await restartedForward.read()).workItemEvents.length, 2); assert.equal(business(await restartedForward.read()), businessBefore);
  result.checks.rollForwardPreservedNotesEventsAndOperationalWrite = true;
  // Alternate measured runtimes to avoid a one-sided warm-cache ordering bias.
  const forwardTimes=[], recoveryTimes=[];
  await resumed.bootstrap(admin.token); await recovery.bootstrap(admin.token);
  const metricsBefore = recoveryStore.metricsSnapshot();
  for (let i=0;i<60;i++) for (const [service, target] of i%2 ? [[recovery,recoveryTimes],[resumed,forwardTimes]] : [[resumed,forwardTimes],[recovery,recoveryTimes]]) { const at=performance.now(); await service.bootstrap(admin.token); target.push(performance.now()-at); }
  const metricsAfter = recoveryStore.metricsSnapshot();
  result.bootstrap = { forward: stats(forwardTimes), recovery: stats(recoveryTimes), extraDomainRowsDuringWarmRequests: metricsAfter.domainRowsLoaded-metricsBefore.domainRowsLoaded, extraRecordRowsDuringWarmRequests: metricsAfter.recordRowsLoaded-metricsBefore.recordRowsLoaded };
  assert.equal(result.bootstrap.extraDomainRowsDuringWarmRequests, 0); assert.equal(result.bootstrap.extraRecordRowsDuringWarmRequests, 0);
  assert.ok(result.bootstrap.recovery.p95Ms <= Math.max(result.bootstrap.forward.p95Ms * 1.25, result.bootstrap.forward.p95Ms + 10));
  result.status = "PASS";
} catch (error) { result.status = "FAIL"; result.error = { code: error.code, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally { await Promise.allSettled(stores.map(store=>store.close())); await writeFile(path.join(evidenceRoot,"recovery-result.json"),JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2)); }
