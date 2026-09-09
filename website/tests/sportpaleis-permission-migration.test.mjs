import test from "node:test";
import assert from "node:assert/strict";
import { SPORTPALEIS_INITIAL_PROFILES, SPORTPALEIS_PERMISSION_TENANT } from "../../app/config/sportpaleis-permission-rollout.mjs";
import { applySportpaleisPermissionMigration, permissionPolicyHash, planSportpaleisPermissionMigration } from "../scripts/sportpaleis-permission-migration.mjs";
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

test("initial operator apply requires exact revision/hash and audits configuration without impersonation", async () => {
  let state = { ...fixture(), audit: [], orders: [{ id: "keep-order" }], sessions: [{ idHash: "keep-session" }] };
  const store = { mutate: async fn => { const result = fn(structuredClone(state)); state = { ...result.state, revision: state.revision + 1 }; return { ...result, state }; } };
  const plan = planSportpaleisPermissionMigration(state, { planningReady: true });
  const options = { expectedRevision: 99, expectedPolicyHash: permissionPolicyHash(plan.policy), releaseId: "SPW-CENTRAL-TEST-20260909", gates: { planningReady: true } };
  const before = JSON.stringify(state);
  await assert.rejects(applySportpaleisPermissionMigration(store, { ...options, expectedRevision: 98 }), { code: "MIGRATION_REVISION_CONFLICT" });
  await assert.rejects(applySportpaleisPermissionMigration(store, { ...options, expectedPolicyHash: "0".repeat(64) }), { code: "MIGRATION_AUTHORITY_MISMATCH" });
  assert.equal(JSON.stringify(state), before);
  const applied = await applySportpaleisPermissionMigration(store, options); assert.equal(applied.status, "APPLIED"); assert.equal(state.workspacePermissions.version, 1);
  assert.equal(state.workspacePermissions.audit[0].actor, "system:release-config"); assert.equal(state.audit[0].userId, "system:release-config");
  assert.deepEqual(state.orders, [{ id: "keep-order" }]); assert.deepEqual(state.sessions, [{ idHash: "keep-session" }]);
  await assert.rejects(applySportpaleisPermissionMigration(store, { ...options, expectedRevision: state.revision }), { code: "MIGRATION_AUTHORITY_MISMATCH" });
});
