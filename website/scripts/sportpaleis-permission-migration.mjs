import { createHash, randomUUID } from "node:crypto";
import { SPORTPALEIS_PERMISSION_TENANT, SPORTPALEIS_INITIAL_PROFILES } from "../config/sportpaleis-permission-rollout.mjs";
import { CAPABILITY_IDS } from "../src/workspace-permission-catalog.mjs";
import { createPermissionPolicy, compileEffectivePermissions } from "./workspace-permissions.mjs";

/** Read-only migration plan. This function never writes or silently initializes live state. */
export function planSportpaleisPermissionMigration(state, { planningReady = false, mailReady = false, intakeReady = false, teamwearReady = false } = {}) {
  const blockers = []; const users = {}; const mapping = [];
  if (state.organizationId !== SPORTPALEIS_PERMISSION_TENANT) blockers.push("TENANT_MISMATCH");
  if (state.workspacePermissions) blockers.push("POLICY_ALREADY_EXISTS_RECONCILE_CURRENT_VERSION");
  for (const [id, binding] of Object.entries(SPORTPALEIS_INITIAL_PROFILES)) {
    const user = state.users.find(user => user.id === id);
    if (!user || user.status !== "Actief" || user.seatType !== "customer" || user.role !== binding.expectedLegacyRole) blockers.push(`IDENTITY_BINDING_MISMATCH:${id}`);
    users[id] = { presetId: binding.presetId, overrides: {} };
    mapping.push({ userId: id, label: binding.label, legacyRole: user?.role || null, presetId: binding.presetId, source: "EXPLICIT_TENANT_CONFIGURATION" });
  }
  for (const user of state.users) if (user.status === "Actief" && !Object.hasOwn(SPORTPALEIS_INITIAL_PROFILES, user.id)) blockers.push(`UNMAPPED_ACTIVE_IDENTITY:${user.id}`);
  const enabledCapabilities = CAPABILITY_IDS.filter(id => {
    if (id.startsWith("planning.")) return planningReady;
    if (id.startsWith("mail.") || id.startsWith("suppliers.")) return mailReady;
    if (id.startsWith("webshop_intake.")) return intakeReady;
    if (id.startsWith("teamwear.")) return teamwearReady;
    return true;
  });
  const policy = createPermissionPolicy(SPORTPALEIS_PERMISSION_TENANT, users, { enabledCapabilities });
  if (intakeReady) for (const id of ["user-25812f676558376d", "user-13960f8a3cae2eff"]) for (const capability of CAPABILITY_IDS.filter(id => id.startsWith("webshop_intake."))) policy.users[id].overrides[capability] = "allow";
  return { status: blockers.length ? "BLOCKED" : "READY_FOR_EXPLICIT_CONFIG_APPLY", sourceRevision: state.revision, blockers, mapping, policy: blockers.length ? null : policy, effective: blockers.length ? [] : Object.keys(users).map(id => compileEffectivePermissions(policy, id)), gates: { planningReady, mailReady, intakeReady, teamwearReady }, mutations: 0 };
}

export const permissionPolicyHash = policy => createHash("sha256").update(JSON.stringify(policy)).digest("hex");

/** Operator-only initial configuration, never an HTTP bypass or recurring seed. */
export async function applySportpaleisPermissionMigration(store, { expectedRevision, expectedPolicyHash, releaseId, gates }) {
  if (!Number.isSafeInteger(expectedRevision) || !/^[a-f0-9]{64}$/.test(expectedPolicyHash || "") || !/^[A-Z0-9][A-Z0-9._-]{5,127}$/.test(releaseId || "")) throw new Error("Exacte revision, policyhash en release-ID vereist.");
  const result = await store.mutate(state => {
    if (state.revision !== expectedRevision) throw Object.assign(new Error("Workspace gewijzigd; maak een nieuw read-only plan."), { statusCode: 409, code: "MIGRATION_REVISION_CONFLICT" });
    const plan = planSportpaleisPermissionMigration(state, gates);
    if (plan.status !== "READY_FOR_EXPLICIT_CONFIG_APPLY" || permissionPolicyHash(plan.policy) !== expectedPolicyHash) throw Object.assign(new Error("Initieel rechtenplan komt niet overeen; geen wijzigingen toegepast."), { code: "MIGRATION_AUTHORITY_MISMATCH" });
    const at = new Date().toISOString();
    plan.policy.audit.push({ id: randomUUID(), actor: "system:release-config", action: "PERMISSION_POLICY_INITIALIZED", object: { type: "TENANT", id: state.organizationId }, at, source: "EXPLICIT_CENTRAL_RELEASE_GO", releaseId, previous: null, next: structuredClone(plan.policy.users), result: "SUCCESS", version: 1 });
    state.workspacePermissions = plan.policy;
    state.audit.unshift({ id: `audit-${randomUUID()}`, at, userId: "system:release-config", action: "Initiële Workspace-rechten ingesteld", subject: state.organizationId, details: { releaseId, approvedBy: "Donovan (central release GO)", policyHash: expectedPolicyHash, mappings: plan.mapping, gates: plan.gates } });
    return { state, value: { status: "APPLIED", version: 1, policyHash: expectedPolicyHash, releaseId, mapping: plan.mapping, gates: plan.gates } };
  });
  return { ...result.value, revision: result.state.revision };
}
