import { AsyncLocalStorage } from "node:async_hooks";
import { assertPermission, assertProtectedAccountManagement, validatePermissionPolicy } from "./workspace-permissions.mjs";
import { withWorkspaceMutationAuthority } from "./workspace-mutation-authority.mjs";
import { createMutableWbdReviewDeveloperAccessProjection } from "./wbd-review-developer-access.mjs";

// Explicit legacy entry-point reconciliation. Names/roles never grant authority.
const groups = {
  "": "issueSessionView logout fastSwitch bootstrap bootstrapSerialized currentRevision savePreferences saveFeedback feedbackAttachment requestUsers",
  "developer.manage": "reviewManifest issueReviewDeveloperGrant revokeReviewDeveloperGrant preliveCleanupPlan",
  "management.users": "issuePasswordReset setQuickPin createInvitedUser cancelInvitedUser reissueInvitedUser updateUser upsertEmployee",
  "management.delete": "deleteEmployee",
  "management.permissions": "permissionAdministration permissionProjection updatePermissionConfiguration",
  "management.settings": "updateSettings updateFoilRoll createFoilRoll",
  "orders.view": "orderHistory order resolveBarcode previewOrderMail orderMailHistory contextSignals",
  "orders.create": "createOrder",
  "orders.edit": "updateOrder addOrderNote recordCommunicationStatus recordOperationalEvent",
  "orders.complete": "advanceOrder confirmPickup",
  "orders.delete": "deleteOrder restoreOrder archiveProductionWork restoreProductionWork",
  "production.view": "productionJob analyzeProductionEfficiency productionJobArtifact quickProductionIntakeSource",
  "production.history": "productionJobHistory",
  "production.create": "createProductionProposal createQuickProductionIntake acceptQuickProductionIntake",
  "production.execute": "prepareCurrentProductionGroup createProductionJob",
  "production.complete": "completeProductionJob rejectProductionJob completeProductionOrders bulkAdvanceOrders",
  "production.reprint": "retryRejectedProductionJob replotProductionJob",
  "production.edit": "confirmExistingOrderProductionReconciliation resolveExistingOrderProductionReconciliationFinding",
  "product_truth.view": "inspectProductionFont productionFontSource visualCompositionSource productionAssetOriginal productionAssetCandidatePreview productionAssetDocumentPreview productionAssetPreview productionAssetNumberPreview creativeVectorDraftFile",
  "product_truth.propose": "createVisualComposition updateVisualComposition submitVisualCompositionReview createCreativeVectorDraft createProductionAssetSource saveProductionAssetReviewDraft",
  "product_truth.approve": "addProductionFont reviewProductionAssetSourceFidelity promoteProductionAsset setProductionAssetLifecycle upsertProductionElement setProductionElementRequirement createAssociation createArticle updateArticle updateAssociation updateProductionProfile reviewWebsiteSyncChange",
  "connectors.manage": "runWebsiteSync",
  "teamwear.view": "assertTeamwearPilotAccess searchTeamwearCatalog teamkitProposalSource teamkitProposalPdf previewTeamkitProposalMail",
  "teamwear.create": "createTeamkitProposal copyTeamkitProposal",
  "teamwear.edit": "updateTeamkitProposal linkTeamkitProposalSource setTeamkitProposalStatus updateTeamkitProductionSizing updateTeamkitFulfillmentTask",
  "teamwear.add_asset": "addTeamkitProposalSource",
  "teamwear.send": "issueTeamkitCustomerLink",
  "teamwear.approve": "prepareTeamkitInternalProduction",
  "mail.send": "captureOrderMail captureTeamkitProposalMail",
  "mail.archive": "manuallyClassifySportpaleisMailboxMessage",
  "webshop_intake.view": "webshopDocumentSource",
  "webshop_intake.edit": "ingestWebshopMailDocument importMailbatch",
  "webshop_intake.execute": "acceptWebshopMatch applyWebshopStockLogo recordWebshopOrderPrint",
};
export const SPORTPALEIS_METHOD_CAPABILITIES = Object.freeze(Object.fromEntries(Object.entries(groups).flatMap(([capability, methods]) => methods.split(" ").map(name => [name, capability ? [capability] : []]))));
const activeCall = new AsyncLocalStorage();
export function capabilityAuditContext() {
  const call = activeCall.getStore();
  return call ? { actor: call.userId, sessionId: call.sessionId, ...(call.configured ? { permissionVersion: call.permissionVersion, capabilities: call.decisions || [] } : { authority: "PERSONAL_SESSION" }), result: "SUCCESS" } : null;
}
export function hasCapabilityRoleAuthority(user) {
  const call = activeCall.getStore();
  return Boolean(call?.configured && call.userId === user.id && call.required.length);
}
function check(state, call) {
  call.sessionAuthority?.(state);
  if (!state.workspacePermissions) {
    if (call.configured) throw Object.assign(new Error("Rechtenconfiguratie ontbreekt. Actie geblokkeerd."), { statusCode: 503, code: "PERMISSIONS_NOT_CONFIGURED" });
    return;
  }
  validatePermissionPolicy(state.workspacePermissions);
  const configuredUser = state.workspacePermissions.users[call.userId];
  if (!configuredUser || configuredUser.disabled) throw Object.assign(new Error("Geen actieve rechtenconfiguratie voor deze gebruiker."), { statusCode: 403, code: "PERMISSION_USER_INACTIVE" });
  const user = state.users.find(user => user.id === call.userId && user.status === "Actief");
  if (!user) throw Object.assign(new Error("Gebruiker niet actief."), { statusCode: 401, code: "UNAUTHENTICATED" });
  call.permissionVersion = state.workspacePermissions.version;
  call.decisions = call.required.map(capability => assertPermission(state.workspacePermissions, { userId: call.userId, tenantId: state.organizationId }, capability));
  if (call.targetUserId) assertProtectedAccountManagement(state.workspacePermissions, { userId: call.userId, tenantId: state.organizationId }, call.targetUserId);
}
export function installSportpaleisCapabilityBoundary(service) {
  const store = service.store;
  const mutationMethods = new Set(["mutate", "mutateRecords", "mutateAppendOnly", "prepareAndCommit"]);
  service.store = new Proxy(store, { get(target, property) {
    const value = Reflect.get(target, property, target);
    if (typeof value !== "function") return value;
    if (!mutationMethods.has(property)) return value.bind(target);
    return (...args) => {
      const call = activeCall.getStore(); if (!call) return value.apply(target, args);
      const mutate = args[0];
      if (typeof mutate !== "function") throw new TypeError("Capability boundary requires a checked mutation callback");
      args[0] = async (state, ...rest) => { check(state, call); return mutate(state, ...rest); };
      return value.apply(target, args);
    };
  } });
  if (service.mailFoundation) service.mailFoundation.authorizationDecision = async ({ organizationId, actor, action, contextType }) => {
    const state = service.store.readSnapshot ? await service.store.readSnapshot() : await service.store.read();
    if (!state.workspacePermissions) return null; // Unmigrated tenants retain their existing policy until explicit configuration.
    const call = activeCall.getStore();
    if (!call || call.userId !== actor?.id || organizationId !== "sportpaleis") return false;
    check(state, call);
    const networkless = service.mailMode === "capture" && service.mailFoundation.transport?.name === "capture" && service.mailFoundation.transport.externalNetworkEnabled === false;
    if (action === "send") return call.required.includes("mail.send") || networkless && (contextType === "order" && call.required.includes("orders.record_communication") || contextType === "teamkit-proposal" && call.required.includes("teamwear.send"));
    if (["preview", "history"].includes(action)) return call.required.includes("mail.view") || contextType === "order" && call.required.includes("orders.view") || contextType === "teamkit-proposal" && call.required.includes("teamwear.view");
    return false;
  };
  for (const [name, required] of Object.entries(SPORTPALEIS_METHOD_CAPABILITIES)) {
    if (typeof service[name] !== "function") throw new TypeError(`Capability entry point missing: ${name}`);
    const method = service[name].bind(service);
    service[name] = async (token, ...args) => {
      const { state, user, session } = await service.authenticate(token);
      // The self permission projection is intentionally available without management rights.
      const ownProjection = name === "permissionProjection" && !args[0] && !args[1];
      const requiredForCall = ownProjection ? [] : [...required];
      const networklessCapture = service.mailMode === "capture" && service.mailFoundation?.transport?.name === "capture" && service.mailFoundation.transport.externalNetworkEnabled === false;
      if (networklessCapture && name === "captureOrderMail") requiredForCall.splice(0, requiredForCall.length, "orders.record_communication");
      if (networklessCapture && name === "captureTeamkitProposalMail") requiredForCall.splice(0, requiredForCall.length, "teamwear.send");
      if (name === "updateSettings" && args[1]?.productionDefaults !== undefined) requiredForCall.push("product_truth.approve");
      if (name === "updateSettings" && (args[1]?.receiptMailText !== undefined || args[1]?.readyMailText !== undefined)) requiredForCall.push("mail.manage_templates");
      if (name === "prepareTeamkitInternalProduction") requiredForCall.push("production.execute");
      const parent = activeCall.getStore();
      const call = { userId: user.id, configured: Boolean(state.workspacePermissions), required: [...new Set([...(parent?.userId === user.id ? parent.required : []), ...requiredForCall])] };
      call.sessionId = session.idHash || session.id;
      if (["issuePasswordReset", "setQuickPin", "updateUser", "cancelInvitedUser", "reissueInvitedUser"].includes(name)) call.targetUserId = args[1];
      // Preserve the existing separate temporary-review authority; it is never
      // converted into an employee identity or used to bypass its own policy.
      call.sessionAuthority = session.authMethod === "TEMPORARY_REVIEW_GRANT"
        ? snapshot => service.reviewDeveloperAccessPolicy.authenticateSession(createMutableWbdReviewDeveloperAccessProjection(snapshot), { sessionToken: token, tenantId: "sportpaleis" }, new Date())
        : snapshot => {
          const actor = service.permissionService.resolveActor(snapshot, token);
          if (actor.userId !== user.id) throw Object.assign(new Error("Sessie-identiteit is gewijzigd. Log opnieuw in."), { statusCode: 401, code: "SESSION_EXPIRED" });
        };
      check(state, call);
      if (name === "updateUser" && state.workspacePermissions && args[2]?.role !== undefined) throw Object.assign(new Error("Wijzig toegang via presets en capabilities."), { statusCode: 409, code: "LEGACY_ROLE_CHANGE_DISABLED" });
      return activeCall.run(call, () => withWorkspaceMutationAuthority(snapshot => check(snapshot, call), () => method(token, ...args)));
    };
  }
}
