import { WorkItemService } from "./workspace-work-items.mjs";
import { assertPermission, permissionDecision, validatePermissionPolicy } from "./workspace-permissions.mjs";
import { projectWorkItems } from "../src/workspace-work-item.ts";

const fail = (statusCode, message, code) => { throw Object.assign(new Error(message), { statusCode, code }); };
const objectActions = ["planning.view", "planning.edit", "planning.note", "planning.complete"];
export function workItemPermissionObject(item) {
  return { id: item.id, type: "WORK_ITEM", tenantId: item.workspaceId, ownerId: item.owner, visibility: "private", shares: [
    { subjectType: "user", subjectId: item.owner, capabilities: objectActions },
    ...(item.sharedWith || []).map(id => ({ subjectType: "user", subjectId: id, capabilities: objectActions })),
    ...(item.sharedWithTeams || []).map(id => ({ subjectType: "team", subjectId: id, capabilities: objectActions })),
  ] };
}
/** Reuses snapshot WorkItem validation/lifecycle inside the existing Workspace transaction.
 * Production never constructs WorkItemFileStore or reads environment file-store configuration.
 */
export class WorkspaceWorkItemStore {
  constructor({ store, resolveActor, now = () => new Date() }) { this.store = store; this.resolveActor = resolveActor; this.now = now; }
  scope(state, credential) {
    const actor = this.resolveActor(state, credential);
    const policy = state.workspacePermissions;
    if (!policy) fail(503, "Planning wacht op de rechtenconfiguratie.", "PERMISSIONS_NOT_CONFIGURED");
    validatePermissionPolicy(policy);
    if (policy.tenantId !== actor.tenantId || policy.users[actor.userId]?.disabled || !Object.hasOwn(policy.users, actor.userId)) fail(403, "Planning is niet beschikbaar voor dit account.", "CAPABILITY_DENIED");
    const users = state.users.filter(user => user.status === "Actief" && Object.hasOwn(policy.users, user.id) && !policy.users[user.id].disabled);
    return { actor, policy, users, context: { workspaceId: actor.tenantId, user: users.find(user => user.id === actor.userId), users, teams: policy.teams } };
  }
  allowed(scope, item, capability) { return permissionDecision(scope.policy, scope.actor, capability, workItemPermissionObject(item), this.now().getTime()).allowed; }
  itemProjection(scope, item) {
    return { ...structuredClone(item), permissions: Object.fromEntries(["view", "edit", "assign", "share", "note", "complete", "delete"].map(action => [action, this.allowed(scope, item, `planning.${action}`)])) };
  }
  async list(credential, { sharedOnly = false } = {}) {
    const state = this.store.readSnapshot ? await this.store.readSnapshot() : await this.store.read();
    const scope = this.scope(state, credential);
    const moduleAllowed = permissionDecision(scope.policy, scope.actor, "planning.view").allowed;
    if (!sharedOnly) assertPermission(scope.policy, scope.actor, "planning.view");
    const items = (state.workItems || []).filter(item => this.allowed(scope, item, "planning.view")).map(item => this.itemProjection(scope, item));
    return { users: scope.users.map(({ id, name }) => ({ id, name })), items, projection: projectWorkItems(items, this.now()), serverTime: this.now().toISOString(), moduleAllowed, canCreate: !sharedOnly && permissionDecision(scope.policy, scope.actor, "planning.create").allowed, canAssign: permissionDecision(scope.policy, scope.actor, "planning.assign").allowed && permissionDecision(scope.policy, scope.actor, "planning.create_for_others").allowed, canShare: permissionDecision(scope.policy, scope.actor, "planning.share").allowed, permissionVersion: scope.policy.version };
  }
  async get(credential, id) {
    const state = this.store.readSnapshot ? await this.store.readSnapshot() : await this.store.read(); const scope = this.scope(state, credential);
    const item = (state.workItems || []).find(item => item.id === id && this.allowed(scope, item, "planning.view"));
    if (!item) fail(404, "Werkitem niet gevonden.", "WORK_ITEM_NOT_FOUND");
    return this.itemProjection(scope, item);
  }
  inner(state, scope) {
    const domain = { items: state.workItems || [], events: state.workItemEvents || [] };
    const service = new WorkItemService({ store: { read: async () => domain, mutate: async fn => fn(domain) }, now: this.now, config: async () => ({ workspaces: { [scope.actor.tenantId]: { enabledUserIds: scope.users.map(user => user.id), eligibleUserIds: scope.users.map(user => user.id) } } }) });
    service.visible = item => this.allowed(scope, item, "planning.view");
    return { domain, service };
  }
  assertAssignment(scope, input, previous = null) {
    const owner = input.owner ?? previous?.owner ?? scope.actor.userId;
    const object = previous ? workItemPermissionObject(previous) : null;
    if (owner !== (previous?.owner || scope.actor.userId)) {
      if (!previous) assertPermission(scope.policy, scope.actor, "planning.create_for_others");
      assertPermission(scope.policy, scope.actor, "planning.assign", object);
    }
    const sharesChanged = ["sharedWith", "sharedWithTeams"].some(key => Object.hasOwn(input, key) && JSON.stringify(input[key]) !== JSON.stringify(previous?.[key] || []));
    if (sharesChanged) assertPermission(scope.policy, scope.actor, "planning.share", object);
    if (scope.policy.users[owner]?.overrides?.["planning.view"] === "deny") fail(400, "Deze collega heeft Planning-toegang expliciet uitgeschakeld.", "OWNER_PLANNING_DENIED");
    if (input.sharedWithTeams && (!Array.isArray(input.sharedWithTeams) || input.sharedWithTeams.length > 100)) fail(400, "Controleer de gedeelde teams.", "WORK_ITEM_VALIDATION");
  }
  async create(credential, input) {
    const result = await this.store.mutate(async state => {
      const scope = this.scope(state, credential);
      const authority = assertPermission(scope.policy, scope.actor, "planning.create"); this.assertAssignment(scope, input);
      const { domain, service } = this.inner(state, scope);
      const item = await service.create(scope.context, input);
      item.activity.at(-1).authorization = { ...authority, actor: scope.actor.userId, result: "SUCCESS" };
      state.workItems = domain.items; state.workItemEvents = domain.events;
      // Validate the supplied existing session again after asynchronous domain work, before returning the prepared mutation.
      this.resolveActor(state, credential);
      return { state, value: this.itemProjection(scope, item) };
    });
    return result.value;
  }
  async change(credential, id, action, input = {}) {
    if (!["edit", "note", "complete"].includes(action)) fail(400, "Onbekende actie.", "WORK_ITEM_ACTION_INVALID");
    const result = await this.store.mutate(async state => {
      const scope = this.scope(state, credential);
      const item = (state.workItems || []).find(item => item.id === id && this.allowed(scope, item, "planning.view"));
      if (!item) fail(404, "Werkitem niet gevonden.", "WORK_ITEM_NOT_FOUND");
      const authority = assertPermission(scope.policy, scope.actor, `planning.${action}`, workItemPermissionObject(item), this.now().getTime());
      if (action === "complete" && item.status === "COMPLETED") return { state, unchanged: true, value: this.itemProjection(scope, item) };
      if (action === "edit") this.assertAssignment(scope, input, item);
      const { domain, service } = this.inner(state, scope);
      const updated = await service.change(scope.context, id, action, input);
      updated.activity.at(-1).authorization = { ...authority, actor: scope.actor.userId, result: "SUCCESS" };
      state.workItems = domain.items; state.workItemEvents = domain.events;
      this.resolveActor(state, credential);
      return { state, value: this.itemProjection(scope, updated) };
    });
    return result.value;
  }
}
