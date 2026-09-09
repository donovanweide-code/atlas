import { sha256CanonicalJson as hash } from './workspace-domain-state.mjs';

export function domainAuthorityError(message, code = 'DOMAIN_AUTHORITY_RECONCILIATION_REQUIRED') {
  return Object.assign(new Error(message), { code, statusCode: 409 });
}

// Only the offline admission/recovery boundary uses this check. Normal reads
// and user writes never load or scan the legacy blob.
export function verifyDomainAuthorityReference(state, legacy, metadata) {
  const receipt = state.domainAuthorityCutover;
  if (!receipt || receipt.version !== 1 || receipt.authority !== 'DOMAIN'
    || receipt.tenantId !== state.organizationId || legacy.organizationId !== state.organizationId
    || receipt.unresolvedConflicts !== 0 || !/^[a-f0-9]{64}$/.test(receipt.planHash ?? '')
    || !Number.isSafeInteger(receipt.appliedRevision) || receipt.appliedRevision < 1
    || Number(state.revision) < receipt.appliedRevision
    || Number(metadata.global_revision) !== Number(state.revision)
    || metadata.cutover_mode !== 'DOMAIN_READS') {
    throw domainAuthorityError('Domain authority mist geldig, revisiegebonden reconciliatiebewijs.');
  }
  if (Number(legacy.revision) !== receipt.legacyReference.revision
    || hash(legacy) !== receipt.legacyReference.sha256) {
    throw domainAuthorityError('Legacy wijzigde na expliciete reconciliation; herbeoordeling vereist, nooit opnieuw importeren.', 'DOMAIN_LEGACY_REFERENCE_DRIFT');
  }
  return Object.freeze({ status: 'DOMAIN_AUTHORITY_VERIFIED', authority: 'DOMAIN', organizationId: state.organizationId,
    globalRevision: Number(state.revision), contractVersion: Number(metadata.contract_version),
    domainSha256: hash(state), legacyReferenceSha256: receipt.legacyReference.sha256,
    reconciliationId: receipt.id, planHash: receipt.planHash, legacyImported: false });
}
