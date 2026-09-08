import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { WorkItemFileStore, WorkItemService } from "../scripts/workspace-work-items.mjs";
import { parseQuickCapture, projectWorkItems, todayIdentity, localDay } from "../src/workspace-work-item.ts";

const users = ["donovan", "patrick", "erik", "kevin"].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1), status: "Actief" }));
const context = (id, workspaceId = "sportpaleis") => ({ workspaceId, user: users.find(user => user.id === id), users });
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "shared-planning-test-"));
  const store = new WorkItemFileStore(path.join(directory, "items.json"));
  let enabled = ["donovan", "patrick"]; let clock = new Date("2026-09-08T06:14:00Z");
  const service = new WorkItemService({ store, config: async () => ({ workspaces: { sportpaleis: { eligibleUserIds: users.map(user => user.id), enabledUserIds: enabled }, wbd: { eligibleUserIds: users.map(user => user.id), enabledUserIds: enabled } } }), now: () => clock });
  return { service, store, enable: ids => { enabled = ids; }, advance: value => { clock = new Date(value); } };
}
test("conservative NL capture and Amsterdam date/week boundary", () => {
  const now = new Date("2026-09-08T06:14:00Z");
  assert.deepEqual(parseQuickCapture("Patrick, mevrouw Jansen morgen terugbellen", users, now), { title: "mevrouw Jansen terugbellen", dueDate: "2026-09-09", startTime: null, owner: "patrick", needsDateChoice: false });
  assert.equal(parseQuickCapture("12 shirts bedrukken vrijdag", users, now).dueDate, "2026-09-11");
  assert.equal(parseQuickCapture("Stanno donderdag 10:00", users, now).startTime, "10:00");
  for (const title of ["bel morgen of vrijdag", "bel volgende dinsdag", "bel 31-02-2026", "bel morgen overmorgen"]) assert.equal(parseQuickCapture(title, users, now).dueDate, null);
  assert.equal(parseQuickCapture("bel 12-09-2026", users, now).dueDate, "2026-09-12");
  assert.equal(localDay(new Date("2026-09-08T22:30:00Z")), "2026-09-09");
  assert.deepEqual(todayIdentity("Patrick", now), { greeting: "Goedemorgen, Patrick", dateLine: "Dinsdag 8 september · 08:14 · week 37" });
  assert.match(todayIdentity("Patrick", new Date("2027-01-01T10:00:00Z")).dateLine, /week 53/);
});
test("Flow A: Friday task survives deadline, colleague notes and completes once", async () => {
  const { service, store, advance } = await fixture();
  let item = await service.create(context("patrick"), { title: "12 shirts bedrukken", dueDate: "2026-09-11", sharedWith: ["donovan"] });
  assert.equal(item.type, "TASK"); assert.equal(item.createdBy, "patrick");
  advance("2026-09-11T08:00:00Z"); assert.equal((await service.list(context("patrick"))).projection.today.length, 1);
  advance("2026-09-12T08:00:00Z"); assert.equal((await service.list(context("patrick"))).projection.overdue.length, 1);
  item = await service.change(context("donovan"), item.id, "note", { text: "Klant gesproken.", revision: item.revision });
  assert.equal(item.notes[0].author, "donovan");
  item = await service.change(context("donovan"), item.id, "complete", { revision: item.revision });
  assert.equal(item.completedBy, "donovan"); assert.equal(item.completedAt, "2026-09-12T08:00:00.000Z");
  await service.change(context("patrick"), item.id, "complete", { revision: 1 });
  assert.equal((await store.read()).events.length, 1);
  const projection = (await service.list(context("patrick"))).projection;
  assert.equal(projection.overdue.length, 0); assert.equal(projection.completed.length, 1);
  assert.deepEqual(item.activity.map(entry => entry.action), ["CREATED", "NOTE_ADDED", "COMPLETED"]);
});
test("Flow B: assign Patrick, retain creator sharing, owner completes", async () => {
  const { service, advance } = await fixture();
  let item = await service.create(context("donovan"), { title: "Terugbellen", owner: "patrick", dueDate: "2026-09-09" });
  assert.deepEqual(item.sharedWith, ["donovan"]);
  advance("2026-09-09T08:00:00Z"); assert.equal((await service.list(context("patrick"))).projection.today[0].id, item.id);
  item = await service.change(context("patrick"), item.id, "complete", { revision: item.revision }); assert.equal(item.completedBy, "patrick");
});
test("Flow C: real appointment requires date/time, notes and context persist", async () => {
  const { service, advance } = await fixture();
  await assert.rejects(service.create(context("patrick"), { type: "APPOINTMENT", title: "Stanno", dueDate: "2026-09-10" }), { statusCode: 400 });
  const item = await service.create(context("patrick"), { type: "APPOINTMENT", title: "Stanno vertegenwoordiger", dueDate: "2026-09-10", startTime: "10:00", endTime: "11:00", description: "Nieuwe collectie bespreken", relatedEntities: [{ entityType: "SUPPLIER", entityId: "test-supplier-ref", displayLabel: "Testreferentie" }] });
  assert.equal((await service.list(context("patrick"))).projection.upcoming[0].id, item.id);
  advance("2026-09-11T08:00:00Z"); assert.equal((await service.list(context("patrick"))).projection.pastAppointments.length, 1);
  assert.equal(item.timeZone, "Europe/Amsterdam"); assert.equal(item.relatedEntities[0].entityType, "SUPPLIER");
});
test("private visibility, cross-tenant denial, no admin override, rollout without rebuild", async () => {
  const { service, enable } = await fixture();
  const item = await service.create(context("patrick"), { title: "Eigen taak" });
  assert.equal((await service.list(context("donovan"))).items.length, 0);
  for (const action of ["edit", "note", "complete"]) await assert.rejects(service.change(context("donovan"), item.id, action, { title: "Andere", text: "note", revision: 1 }), { statusCode: 404 });
  assert.equal((await service.list(context("patrick", "wbd"))).items.length, 0);
  await assert.rejects(service.change(context("patrick", "wbd"), item.id, "complete", { revision: 1 }), { statusCode: 404 });
  await assert.rejects(service.list(context("kevin")), { statusCode: 403 });
  enable(users.map(user => user.id)); assert.equal((await service.list(context("kevin"))).items.length, 0);
  await service.change(context("patrick"), item.id, "edit", { sharedWith: ["kevin", "erik"], revision: 1 });
  assert.equal((await service.list(context("kevin"))).items.length, 1); assert.equal((await service.list(context("erik"))).items.length, 1);
});
test("validation, conflict protection, readonly immutable lifecycle fields", async () => {
  const { service } = await fixture();
  const item = await service.create(context("patrick"), { title: "Taak", status: "COMPLETED", createdBy: "donovan", workspaceId: "wbd" });
  assert.equal(item.status, "OPEN"); assert.equal(item.createdBy, "patrick"); assert.equal(item.workspaceId, "sportpaleis");
  for (const input of [{ title: "" }, { title: "x", owner: "unknown" }, { title: "x", dueDate: "2026-02-31" }, { title: "x", sharedWithTeams: ["fake"] }, { title: "x", type: "APPOINTMENT", dueDate: "2026-09-09", startTime: "14:00", endTime: "13:00" }]) await assert.rejects(service.create(context("patrick"), input), { statusCode: 400 });
  await service.change(context("patrick"), item.id, "edit", { title: "Changed", revision: 1 });
  await assert.rejects(service.change(context("patrick"), item.id, "edit", { title: "Lost update", revision: 1 }), { statusCode: 409 });
});
test("durable store serializes concurrent writes; completion never imports production/mail actions", async () => {
  const { service, store } = await fixture();
  await Promise.all(Array.from({ length: 12 }, (_, i) => service.create(context("patrick"), { title: `Task ${i}` })));
  assert.equal((await new WorkItemFileStore(store.filePath).read()).items.length, 12);
  const source = await readFile(new URL("../scripts/workspace-work-items.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import.*(?:mail|production|plotjob|teamwear)/i);
  assert.equal(projectWorkItems((await store.read()).items).upcoming.length, 12);
});
