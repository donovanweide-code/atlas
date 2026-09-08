import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createPlanningFixture } from "./helpers/workspace-planning-fixture.mjs";
import { SPORTPALEIS_METHOD_CAPABILITIES } from "../scripts/sportpaleis-capability-boundary.mjs";

const hash = token => createHash("sha256").update(token).digest("hex");

test("personal multi-device sessions remain independent; logout, reconnect, concurrent login and provenance", async t => {
  const f = await createPlanningFixture(t);
  for (const name of ["Patrick", "Erik", "Kevin", "Donovan"]) {
    const first = f.actors[name];
    const [second, third] = await Promise.all(["SHARED", "PERSONAL"].map(deviceMode => f.service.login({ email: `${name.toLowerCase()}@example.test`, password: f.password, deviceMode })));
    assert.equal((await f.service.authenticate(first.token)).user.id, first.id);
    assert.equal((await f.service.authenticate(second.token)).user.id, first.id);
    assert.equal((await f.service.authenticate(third.token)).user.id, first.id);
    const before = await f.store.read();
    assert.equal(before.sessions.filter(session => session.userId === first.id).length, 3);
    assert.equal(before.audit.find(event => event.action === "Ingelogd" && event.details.sessionId === hash(second.token)).userId, first.id);
    await f.service.logout(second.token, (await f.service.authenticate(second.token)).user, second.csrfToken);
    await assert.rejects(f.service.authenticate(second.token), { statusCode: 401 });
    await f.service.authenticate(first.token); await f.service.authenticate(third.token);
    const reconnect = await f.service.login({ email: `${name.toLowerCase()}@example.test`, password: f.password });
    assert.equal((await f.service.authenticate(reconnect.token)).user.id, first.id);
  }
  // Existing strict owner/admin PIN step-up remains in force.
  await assert.rejects(f.service.fastSwitch(f.actors.Patrick.token, f.actors.Patrick.csrfToken, { targetUserId: f.actors.Donovan.id, authMode: "PIN", pin: "1234" }), { code: "PIN_STEP_UP_REQUIRED" });
});

test("revoked personal session cannot enter any authenticated service route or Planning; no mutations", async t => {
  const f = await createPlanningFixture(t); const actor = f.actors.Donovan;
  await f.store.mutate(state => { state.sessions = state.sessions.filter(session => session.idHash !== hash(actor.token)); return { state }; });
  const before = JSON.stringify(await f.store.read());
  for (const method of Object.keys(SPORTPALEIS_METHOD_CAPABILITIES)) await assert.rejects(f.service[method](actor.token, actor.csrfToken, {}, {}), { statusCode: 401 }, method);
  await assert.rejects(f.items.create(actor.credential, { title: "Niet opslaan" }), { statusCode: 401 });
  await assert.rejects(f.items.list(actor.token), { statusCode: 401 });
  assert.equal(JSON.stringify(await f.store.read()), before);
});

test("expiry and explicit revoke fail closed; queued personal write rechecks session under lock", async t => {
  const f = await createPlanningFixture(t); const actor = f.actors.Patrick;
  const mutate = f.store.mutate.bind(f.store);
  let ready; let resume;
  const waiting = new Promise(resolve => { ready = resolve; }); const gate = new Promise(resolve => { resume = resolve; });
  f.store.mutate = async (...args) => { ready(); await gate; return mutate(...args); };
  const pending = f.service.savePreferences(actor.token, actor.csrfToken, { panelOrder: ["attention", "production", "recent", "shortcuts"], view: "compact", density: "compact" });
  await waiting;
  await mutate(state => { state.sessions = state.sessions.filter(session => session.idHash !== hash(actor.token)); return { state }; });
  const before = JSON.stringify(await f.store.read()); resume();
  await assert.rejects(pending, { statusCode: 401 }); assert.equal(JSON.stringify(await f.store.read()), before);
  f.store.mutate = mutate;
  for (const mode of ["expired", "invalid", "revoked"]) {
    const session = await f.service.login({ email: "patrick@example.test", password: f.password });
    await mutate(state => { const target = state.sessions.find(entry => entry.idHash === hash(session.token)); if (mode === "revoked") target.revokedAt = new Date().toISOString(); else target.expiresAt = mode === "invalid" ? "not-a-date" : "2020-01-01T00:00:00Z"; return { state }; });
    await assert.rejects(f.service.authenticate(session.token), { statusCode: 401 });
    await assert.rejects(f.items.create({ token: session.token, csrfToken: session.csrfToken }, { title: "Niet opslaan" }), { statusCode: 401 });
  }
});
