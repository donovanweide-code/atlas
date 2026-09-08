import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createPlanningFixture } from "./helpers/workspace-planning-fixture.mjs";
import { SportpaleisFileStore, SportpaleisPilotService, createSportpaleisPilotRequestHandler } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { parseQuickCapture } from "../src/workspace-work-item.ts";
const businessHash = state => createHash("sha256").update(JSON.stringify([state.orders, state.productionJobs, state.productionProposals, state.mailFoundation, state.mailboxRouting])).digest("hex");

test("Patrick A: quick capture, Friday, persistent overdue, shared note and one completion/history", async t => {
  const f = await createPlanningFixture(t); const { Patrick, Donovan } = f.actors;
  const before = businessHash(await f.store.read()); const start = performance.now();
  const parsed = parseQuickCapture("12 shirts bedrukken vrijdag", [], new Date("2026-09-08T06:14:00Z"));
  let task = await f.items.create(Patrick.credential, { type: "TASK", title: parsed.title, dueDate: parsed.dueDate, sharedWith: [Donovan.id] });
  const elapsed = performance.now() - start; assert.ok(elapsed < 10000); t.diagnostic(`Quick-capture service persistence ${elapsed.toFixed(1)}ms`);
  assert.equal(task.dueDate, "2026-09-11"); assert.equal(task.createdBy, Patrick.id);
  f.setNow("2026-09-11T08:00:00Z"); assert.equal((await f.items.list(Patrick.token)).projection.today[0].id, task.id);
  f.setNow("2026-09-12T08:00:00Z"); assert.equal((await f.items.list(Patrick.token)).projection.overdue[0].id, task.id);
  task = await f.items.change(Donovan.credential, task.id, "note", { revision: task.revision, text: "Shirts gecontroleerd." });
  task = await f.items.change(Donovan.credential, task.id, "complete", { revision: task.revision });
  assert.equal(task.completedBy, Donovan.id); assert.equal(task.status, "COMPLETED"); assert.equal(task.completedAt, "2026-09-12T08:00:00.000Z");
  assert.equal(task.notes[0].author, Donovan.id); assert.equal(task.activity.at(-1).authorization.actor, Donovan.id);
  const again = await f.items.change(Patrick.credential, task.id, "complete", { revision: 1 }); assert.equal(again.completedBy, Donovan.id);
  const saved = await f.store.read(); assert.equal(saved.workItemEvents.length, 1); assert.equal(saved.workItemEvents[0].type, "WORK_ITEM_COMPLETED"); assert.equal(businessHash(saved), before);
  const projection = (await f.items.list(Patrick.token)).projection; assert.equal(projection.overdue.length, 0); assert.equal(projection.completed.length, 1);
  const restarted = new SportpaleisFileStore(f.settings); await restarted.initialize(); const service = new SportpaleisPilotService({ store: restarted, artifactRoot: f.root });
  assert.equal((await service.workItems.get(Patrick.token, task.id)).notes[0].text, "Shirts gecontroleerd.");
});

test("Donovan B: assign tomorrow to Patrick, owner sees Today and completes; appointment C", async t => {
  const f = await createPlanningFixture(t); const { Donovan, Patrick, Kevin } = f.actors;
  let task = await f.items.create(Donovan.credential, { title: "Mevrouw Jansen terugbellen", owner: Patrick.id, dueDate: "2026-09-09" });
  assert.ok(task.sharedWith.includes(Donovan.id)); f.setNow("2026-09-09T06:00:00Z");
  assert.ok((await f.items.list(Patrick.token)).projection.today.some(item => item.id === task.id));
  task = await f.items.change(Patrick.credential, task.id, "complete", { revision: task.revision }); assert.equal(task.completedBy, Patrick.id);
  const appointment = await f.items.create(Kevin.credential, { type: "APPOINTMENT", title: "Stanno vertegenwoordiger", dueDate: "2026-09-10", startTime: "10:00", endTime: "11:00", description: "Collectie doornemen", sharedWith: [Patrick.id] });
  assert.equal(appointment.startTime, "10:00"); assert.ok((await f.items.list(Patrick.token)).projection.upcoming.some(item => item.id === appointment.id));
  await assert.rejects(f.items.create(Patrick.credential, { type: "APPOINTMENT", title: "Ongeldig", dueDate: "2026-09-10" }), { statusCode: 400 });
});

test("private and tenant isolation; Erik module OFF can handle only his explicit assignment", async t => {
  const f = await createPlanningFixture(t); const { Patrick, Donovan, Kevin, Erik } = f.actors;
  const privateTask = await f.items.create(Kevin.credential, { title: "Privé opvolging" });
  for (const actor of [Patrick, Donovan, Erik]) await assert.rejects(f.items.get(actor.token, privateTask.id), { statusCode: 404 });
  await assert.rejects(f.items.list(Erik.token), { statusCode: 403 });
  let assigned = await f.items.create(Patrick.credential, { title: "Erik controleren", owner: Erik.id });
  const shared = await f.items.list(Erik.token, { sharedOnly: true }); assert.equal(shared.moduleAllowed, false); assert.deepEqual(shared.items.map(item => item.id), [assigned.id]); assert.equal(shared.canCreate, false);
  assigned = await f.items.change(Erik.credential, assigned.id, "note", { revision: assigned.revision, text: "Gecontroleerd" });
  assigned = await f.items.change(Erik.credential, assigned.id, "complete", { revision: assigned.revision }); assert.equal(assigned.completedBy, Erik.id);
  await f.store.mutate(state => { state.workItems.push({ ...structuredClone(privateTask), id: "foreign", workspaceId: "other-tenant", owner: Patrick.id }); return { state }; });
  await assert.rejects(f.items.get(Patrick.token, "foreign"), { statusCode: 404 });
});

test("concurrent edits conflict; shared editor cannot reshare or gain permanent rights from a temporary grant", async t => {
  const f = await createPlanningFixture(t); const { Patrick, Kevin, Erik } = f.actors;
  let task = await f.items.create(Patrick.credential, { title: "Gelijktijdig", sharedWith: [Kevin.id] });
  const changes = await Promise.allSettled([f.items.change(Patrick.credential, task.id, "note", { revision: 1, text: "Eerste" }), f.items.change(Kevin.credential, task.id, "note", { revision: 1, text: "Tweede" })]);
  assert.equal(changes.filter(result => result.status === "fulfilled").length, 1); assert.equal(changes.find(result => result.status === "rejected").reason.statusCode, 409);
  task = await f.items.get(Kevin.token, task.id);
  await assert.rejects(f.items.change(Kevin.credential, task.id, "edit", { revision: task.revision, sharedWith: [Kevin.id, Erik.id] }), { statusCode: 403 });
  await f.store.mutate(state => { state.workspacePermissions.grants.push({ id: "temporary", tenantId: state.organizationId, userId: Erik.id, object: { type: "WORK_ITEM", id: task.id }, capabilities: ["planning.view", "planning.edit"], expiresAt: "2026-09-08T08:00:00Z" }); state.workspacePermissions.version++; return { state }; });
  task = await f.items.change(Erik.credential, task.id, "edit", { revision: task.revision, title: "Tijdelijk bijgewerkt" });
  assert.equal(task.sharedWith.includes(Erik.id), false);
  f.setNow("2026-09-08T08:00:00Z"); await assert.rejects(f.items.get(Erik.token, task.id), { statusCode: 404 });
});

test("HTTP/session/CSRF and queued revoke deny Planning writes without production or mail side effects", async t => {
  const f = await createPlanningFixture(t); const { Patrick, Donovan } = f.actors;
  const task = await f.items.create(Patrick.credential, { title: "Beveiligd" });
  const handler = createSportpaleisPilotRequestHandler(f.service); const server = createServer((req, res) => void handler(req, res));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`; f.service.allowedOrigin = base;
  const response = await fetch(`${base}/api/sportpaleis/v1/work-items/${task.id}/complete`, { method: "POST", headers: { Cookie: `sportpaleis_session=${Patrick.token}`, Origin: base, "Content-Type": "application/json", "X-CSRF-Token": "invalid" }, body: JSON.stringify({ revision: 1 }) }); assert.equal(response.status, 403);
  const revoke = f.store.mutate(state => { state.workspacePermissions.users[Patrick.id].overrides["planning.complete"] = "deny"; state.workspacePermissions.version++; return { state }; });
  const write = f.items.change(Patrick.credential, task.id, "complete", { revision: 1 }); await revoke; await assert.rejects(write, { statusCode: 403 });
  const revokeSession = f.store.mutate(state => { state.sessions = state.sessions.filter(session => session.userId !== Patrick.id); return { state }; });
  const note = f.items.change(Patrick.credential, task.id, "note", { revision: 1, text: "Mag niet" }); await revokeSession; await assert.rejects(note, { statusCode: 401 });
  await assert.rejects(f.items.get(Patrick.token, task.id), { statusCode: 401 });
  await f.store.mutate(state => { state.sessions.filter(session => session.userId === Donovan.id).forEach(session => { session.expiresAt = "2020-01-01T00:00:00Z"; }); return { state }; });
  await assert.rejects(f.items.create(Donovan.credential, { title: "Verlopen" }), { statusCode: 401 });
  const saved = await f.store.read(); assert.equal(saved.workItems.length, 1); assert.equal(saved.workItems[0].status, "OPEN"); assert.equal(saved.workItems[0].notes.length, 0);
});
