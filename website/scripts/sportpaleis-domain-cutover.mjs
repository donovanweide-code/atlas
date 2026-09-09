import { DOMAIN_CUTOVER as policy } from '../config/sportpaleis-domain-cutover.mjs';
import { validateSportpaleisPilotState } from './sportpaleis-pilot-foundation.mjs';
import { sha256CanonicalJson as hash } from './workspace-domain-state.mjs';
import { domainAuthorityError } from './sportpaleis-domain-authority.mjs';

const assert = (condition, message) => { if (!condition) throw domainAuthorityError(message); };
const record = (state, collection, id) => state[collection]?.find(value => value.id === id);

export function planDomainAuthorityCutover(domain, legacy) {
  // Store mutation drafts are copy-on-write proxies. Offline validation must
  // operate on detached JSON records, never mutate or clone a live draft proxy.
  domain = JSON.parse(JSON.stringify(domain));
  assert(domain.organizationId === policy.tenantId && legacy.organizationId === policy.tenantId, 'Tenant mismatch.');
  assert(Number(domain.revision) >= policy.minimumDomainRevision && Number(legacy.revision) === policy.legacyRevision, 'Onbeoordeelde authority revision.');
  if (domain.domainAuthorityCutover) {
    const receipt = domain.domainAuthorityCutover;
    assert(receipt.id === policy.id && receipt.legacyReference.sha256 === hash(legacy), 'Bestaande cutover verschilt.');
    return { status: 'ALREADY_RECONCILED', receipt };
  }
  const order = record(domain, 'orders', 'SP-2026-0133');
  const previousOrder = record(legacy, 'orders', order?.id);
  assert(order?.revision === 4 && previousOrder?.revision === 3
    && order.updatedAt === '2026-09-07T11:27:02.167Z'
    && order.deletion?.status === 'DELETED' && order.deletion.restorable === false
    && order.eventHistory.some(event => event.id === 'event-32718147cefa' && event.type === 'ORDER_DELETED')
    && previousOrder.eventHistory.every(event => order.eventHistory.some(current => current.id === event.id && hash(current) === hash(event))), 'SP-2026-0133 heeft onbeoordeelde lifecycle/historie.');
  const grant = domain.reviewDeveloperAccess?.grants?.find(value => value.id === 'review-grant-f95c4629f61dce63561c');
  assert(grant?.revokedAt === '2026-09-07T05:35:28.932Z' && grant.sessions.every(session => session.endedAt), 'Reviewgrant-intrekking ontbreekt.');

  // Execute the existing proven Product Truth validator on a detached copy;
  // only the 16 explicitly reviewed records/fields are eligible for storage.
  const projection = validateSportpaleisPilotState(domain);
  const patches = policy.productionRecords.map(binding => {
    const current = record(domain, binding.collection, binding.id);
    const projected = record(projection, binding.collection, binding.id);
    assert(current && projected && hash(current) === binding.previousSha256, `Onbeoordeelde recordwijziging: ${binding.id}`);
    assert(hash(projected) === binding.targetSha256, `Product Truth niet bewezen: ${binding.id}`);
    const replacement = { ...current };
    for (const field of binding.fields) replacement[field] = structuredClone(projected[field]);
    assert(hash(replacement) === binding.targetSha256, `Buiten-scope velden gewijzigd: ${binding.id}`);
    return { ...binding, replacement };
  });

  assert(domain.websiteSync?.sourceFingerprint === policy.syncPreviousFingerprint
    && legacy.websiteSync?.sourceFingerprint === policy.syncSourceFingerprint
    && legacy.websiteSync.lastSuccessfulSyncAt === policy.syncSuccessfulAt, 'Onbeoordeelde website-syncsnapshot.');
  const sync = structuredClone(legacy.websiteSync);
  const decisions = domain.websiteSync.reviewDecisions ?? {};
  for (const [id, decision] of Object.entries(sync.reviewDecisions ?? {})) {
    assert(decisions[id] && hash(decisions[id]) === hash(decision), `Onbeoordeeld reviewbesluit: ${id}`);
  }
  sync.reviewDecisions = structuredClone(decisions);
  const known = new Set(sync.changes.map(change => change.id));
  const retainedDomainSignals = domain.websiteSync.changes.filter(change => !known.has(change.id));
  // Preserve unresolved domain-only attention; a later real source comparison
  // can supersede it. Cutover does not silently resolve human review work.
  sync.changes.push(...structuredClone(retainedDomainSignals));
  sync.changes = sync.changes.filter(change => !Object.hasOwn(decisions, change.id)
    || decisions[change.id].sourceFingerprint !== change.sourceFingerprint);
  sync.counts.attention = sync.changes.length;
  const auditIds = new Set(domain.audit.map(event => event.id));
  const sourceAudit = legacy.audit.filter(event => !auditIds.has(event.id));
  assert(sourceAudit.length === 2 && sourceAudit.every(event => event.userId === 'system:website-sync'
    && event.action === 'Website gecontroleerd'), 'Onbeoordeelde legacy-only audit.');
  assert(domain.orders.length >= 146 && domain.productionJobs.length >= 84, 'Actuele operationele data ontbreekt.');
  const plan = { status: 'READY', id: policy.id, tenantId: policy.tenantId, expectedRevision: domain.revision,
    legacyReference: { revision: legacy.revision, sha256: hash(legacy) },
    patches, sync, sourceAudit, retainedDomainSignals: retainedDomainSignals.map(value => value.id),
    preservedHashes: Object.fromEntries(['orders','productionJobs','productionProposals','sessions','reviewDeveloperAccess','idempotency','workspacePermissions','workItems','workItemEvents'].map(key => [key, hash(domain[key] ?? null)])),
    resolved: { productTruth: patches.length, order: 'KEEP_DOMAIN_DELETED_REVISION_4', reviewGrant: 'KEEP_DOMAIN_REVOKED',
      syncSignals: 2, sourceFingerprints: 4, sourceRelevance: 1, expiredLegacySessionsImported: 0 } };
  return { ...plan, planHash: hash(plan) };
}

export async function applyDomainAuthorityCutover(store, legacy, { expectedRevision, expectedPlanHash, now = new Date() }) {
  return store.mutate(state => {
    const plan = planDomainAuthorityCutover(state, legacy);
    if (plan.status === 'ALREADY_RECONCILED') return { state, unchanged: true, value: plan };
    assert(plan.expectedRevision === expectedRevision && plan.planHash === expectedPlanHash, 'Cutoverplan is verouderd.');
    for (const patch of plan.patches) {
      const index = state[patch.collection].findIndex(value => value.id === patch.id);
      state[patch.collection][index] = structuredClone(patch.replacement);
    }
    state.websiteSync = structuredClone(plan.sync);
    const receipt = { version: 1, id: policy.id, authority: 'DOMAIN', tenantId: policy.tenantId,
      appliedRevision: expectedRevision + 1, appliedAt: now.toISOString(), approvedBy: policy.approvedBy,
      productTruthSource: policy.productTruthSource, planHash: plan.planHash,
      legacyReference: plan.legacyReference, unresolvedConflicts: 0, resolved: plan.resolved };
    state.domainAuthorityCutover = receipt;
    state.audit.unshift(...structuredClone(plan.sourceAudit), { id: `audit-domain-cutover-${plan.planHash.slice(0,24)}`,
      at: now.toISOString(), userId: policy.approvedBy, action: 'Domain authority expliciet gereconciled',
      subject: policy.id, details: { planHash: plan.planHash, resolved: plan.resolved,
        records: plan.patches.map(({collection,id,previousSha256,targetSha256}) => ({collection,id,previousSha256,targetSha256})),
        retainedDomainSignals: plan.retainedDomainSignals, legacyReference: plan.legacyReference } });
    for (const [key, expected] of Object.entries(plan.preservedHashes)) assert(hash(state[key] ?? null) === expected, `${key} is ten onrechte gewijzigd.`);
    return { state, value: receipt, legacyReference: plan.legacyReference };
  });
}
