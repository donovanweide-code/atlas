import { CAPABILITIES } from "../src/workspace-permission-catalog.mjs";
import { assertPermission, compileEffectivePermissions, updateUserPermissions, validatePermissionPolicy } from "./workspace-permissions.mjs";

const failure = (message, statusCode, code) => { throw Object.assign(new Error(message), { statusCode, code }); };
export function permissionSummary(effective) {
  const domains = new Map();
  for (const [id, decision] of Object.entries(effective.decisions)) {
    const capability = CAPABILITIES[id];
    const group = domains.get(capability.domain) || { id: capability.domain, label: capability.displayDomain, allowed: false, capabilities: [] };
    group.allowed ||= decision.allowed;
    group.capabilities.push({ ...capability, ...decision }); domains.set(capability.domain, group);
  }
  return { enabled: [...domains.values()].filter(group => group.allowed).map(group => group.label), disabled: [...domains.values()].filter(group => !group.allowed).map(group => group.label), domains: [...domains.values()] };
}

/** Adapter over the existing Workspace transaction store and session resolver.
 * No authprovider, session issuance or separate durable file store is introduced.
 * resolveActor MUST validate the existing session against the supplied transaction snapshot.
 * The store MUST reject stale commits, including concurrent permission/session changes.
 */
export class WorkspacePermissionService {
  constructor({ store, resolveActor }) {
    if (!store?.mutate || !resolveActor) throw new TypeError("Workspace store and session resolver required");
    this.store = store; this.resolveActor = resolveActor;
  }
  #context(state, credential) {
    const actor = this.resolveActor(state, credential);
    const policy = state.workspacePermissions;
    if (!policy) failure("Rechtenconfiguratie is nog niet gemigreerd.", 503, "PERMISSIONS_NOT_CONFIGURED");
    validatePermissionPolicy(policy);
    if (!actor || actor.tenantId !== policy.tenantId) failure("Geen toegang tot deze Workspace.", 403, "PERMISSION_TENANT_MISMATCH");
    return { actor, policy };
  }
  async inspect(credential, targetUserId = null, preview = false) {
    const state = this.store.readSnapshot ? await this.store.readSnapshot() : await this.store.read();
    const { actor, policy } = this.#context(state, credential);
    const target = targetUserId || actor.userId;
    if (target !== actor.userId || preview) assertPermission(policy, actor, "management.permissions");
    if (!Object.hasOwn(policy.users, target)) failure("Gebruiker niet gevonden.", 404, "PERMISSION_USER_NOT_FOUND");
    const effective = compileEffectivePermissions(policy, target);
    // A preview is a projection only: it never returns a target session, credential, CSRF or writable API identity.
    return { effective, summary: permissionSummary(effective), preview: preview ? { readOnly: true, userId: target } : null };
  }
  async administration(credential) {
    const state = this.store.readSnapshot ? await this.store.readSnapshot() : await this.store.read();
    const { actor, policy } = this.#context(state, credential);
    assertPermission(policy, actor, "management.permissions");
    return { version: policy.version, tenantId: policy.tenantId, presets: structuredClone(policy.presets), users: Object.entries(policy.users).map(([id, config]) => {
      const effective = compileEffectivePermissions(policy, id);
      return { id, name: state.users?.find(user => user.id === id)?.name || id, ...structuredClone(config), effective, summary: permissionSummary(effective) };
    }) };
  }
  async update(credential, input) {
    // Session and capability are checked within the very same transaction as the rights write.
    const result = await this.store.mutate(state => {
      const { actor, policy } = this.#context(state, credential);
      const changed = updateUserPermissions(policy, actor, input);
      state.workspacePermissions = changed;
      const effective = compileEffectivePermissions(changed, input.userId);
      return { state, value: { version: changed.version, effective, summary: permissionSummary(effective) } };
    });
    return result.value;
  }
}
