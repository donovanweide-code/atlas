import test from "node:test";
import assert from "node:assert/strict";
import { SPORTPALEIS_INITIAL_PROFILES, SPORTPALEIS_PERMISSION_TENANT } from "../../app/config/sportpaleis-permission-rollout.mjs";
import { planSportpaleisPermissionMigration } from "../scripts/sportpaleis-permission-migration.mjs";
const fixture = () => ({ organizationId: SPORTPALEIS_PERMISSION_TENANT, revision: 99, users: Object.entries(SPORTPALEIS_INITIAL_PROFILES).map(([id, p]) => ({ id, name: p.label, status: "Actief", role: p.expectedLegacyRole, seatType: "customer" })) });
test("four real tenant bindings are explicit; unavailable components stay off", () => {
  const state = fixture(); const before = JSON.stringify(state); const plan = planSportpaleisPermissionMigration(state, { planningReady: true });
  assert.equal(plan.status, "READY_FOR_EXPLICIT_CONFIG_APPLY"); assert.equal(JSON.stringify(state), before);
  for (const result of plan.effective) {
    const profile = SPORTPALEIS_INITIAL_PROFILES[result.userId];
    assert.equal(result.decisions["planning.view"].allowed, profile.label !== "Erik");
    assert.equal(result.decisions["developer.manage"].allowed, profile.label === "Donovan");
    for (const id of ["mail.view", "teamwear.view", "webshop_intake.view"]) assert.equal(result.decisions[id].allowed, false);
  }
});
test("unmapped active identity or changed legacy binding blocks migration instead of silently widening", () => {
  const state = fixture(); state.users.push({ id: "unexpected", role: "admin", status: "Actief" });
  assert.equal(planSportpaleisPermissionMigration(state).policy, null);
  state.users.pop(); state.users[0].role = "operator";
  assert.equal(planSportpaleisPermissionMigration(state).status, "BLOCKED");
});
test("existing permission configuration is never overwritten by the initial rollout plan", () => {
  const state = fixture(); state.workspacePermissions = { version: 2 };
  assert.equal(planSportpaleisPermissionMigration(state).status, "BLOCKED");
});
