import { validateSportpaleisPilotState } from "./sportpaleis-pilot-foundation.mjs";
import { sha256CanonicalJson as hash } from "./workspace-domain-state.mjs";

const truthKeys = ["articles", "productionProfiles", "productionElements"];
const same = (a, b) => hash(a ?? null) === hash(b ?? null);
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const changedKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => !same(a[key], b[key]));

function changedLeaves(a, b, prefix = "") {
  if (same(a, b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) => changedLeaves(a[key], b[key], `${prefix}/${key}`));
  }
  return [{ path: prefix, before: a, after: b }];
}

// Offline repair only. The historical snapshot must match the original MATCH
// receipt. Only a proven legacy website-sync delta is admitted; this is never
// an alternative full-state backfill or a last-writer-wins merge.
export function planWebsiteSyncSourceReconciliation({ baseline, legacy, domain, receipt, actorId, reason }) {
  if (!actorId || !reason) fail("SOURCE_RECONCILIATION_AUTHORITY_REQUIRED");
  const baselineHash = hash(baseline), legacyHash = hash(legacy), domainHash = hash(domain);
  if (receipt.status !== "MATCH" || Number(receipt.legacy_revision) !== baseline.revision || receipt.legacy_sha256 !== baselineHash || receipt.composed_sha256 !== baselineHash) fail("SOURCE_RECONCILIATION_BASELINE_MISMATCH");
  if (baseline.organizationId !== legacy.organizationId || domain.organizationId !== baseline.organizationId || legacy.revision <= baseline.revision || domain.revision < legacy.revision) fail("SOURCE_RECONCILIATION_IDENTITY_MISMATCH");
  const normalizedBase = validateSportpaleisPilotState(structuredClone(baseline));
  if (changedKeys(normalizedBase, legacy).some((key) => !["revision", "audit", "websiteSync"].includes(key))) fail("SOURCE_RECONCILIATION_UNEXPLAINED_LEGACY_DELTA");
  const baselineAudit = new Map(baseline.audit.map((event) => [event.id, event]));
  const legacyAudit = new Map(legacy.audit.map((event) => [event.id, event]));
  if (legacyAudit.size !== legacy.audit.length || baseline.audit.some((event) => !same(event, legacyAudit.get(event.id)))) fail("SOURCE_RECONCILIATION_AUDIT_CHANGED");
  const addedAudit = legacy.audit.filter((event) => !baselineAudit.has(event.id));
  if (!addedAudit.length || addedAudit.some((event) => event.userId !== "system:website-sync" || event.action !== "Website gecontroleerd" || event.details?.trigger !== "scheduled" || event.details?.autoProjected !== 0)) fail("SOURCE_RECONCILIATION_UNPROVEN_WRITER");
  const domainAudit = new Map(domain.audit.map((event) => [event.id, event]));
  if (addedAudit.some((event) => domainAudit.has(event.id) && !same(event, domainAudit.get(event.id)))) fail("SOURCE_RECONCILIATION_AUDIT_CONFLICT");

  const normalizedDomain = validateSportpaleisPilotState(structuredClone(domain));
  const patch = {}, truthChanges = [];
  for (const key of truthKeys) {
    const sourceById = new Map(legacy[key].map((record) => [record.id, record]));
    const baselineById = new Map(baseline[key].map((record) => [record.id, record]));
    if (!same(domain[key].map((r) => r.id), normalizedDomain[key].map((r) => r.id))) fail("SOURCE_RECONCILIATION_TRUTH_IDENTITY_CHANGED");
    for (let index = 0; index < domain[key].length; index++) {
      const current = domain[key][index], next = normalizedDomain[key][index];
      const proven = new Map(changedLeaves(baselineById.get(current.id), sourceById.get(current.id)).map((leaf) => [leaf.path, leaf]));
      for (const leaf of changedLeaves(current, next)) {
        const source = proven.get(leaf.path);
        if (!source || !same(leaf.before, source.before) || !same(leaf.after, source.after)) fail("SOURCE_RECONCILIATION_TRUTH_CONFLICT");
        truthChanges.push({ collection: key, id: current.id, path: leaf.path, beforeHash: hash(leaf.before ?? null), afterHash: hash(leaf.after ?? null) });
      }
    }
    if (!same(domain[key], normalizedDomain[key])) patch[key] = normalizedDomain[key];
  }

  const sync = structuredClone(domain.websiteSync);
  for (const key of changedKeys(baseline.websiteSync, legacy.websiteSync)) {
    if (["changes", "counts"].includes(key)) continue;
    if (!same(domain.websiteSync[key], baseline.websiteSync[key]) && !same(domain.websiteSync[key], legacy.websiteSync[key])) fail("SOURCE_RECONCILIATION_SYNC_CONFLICT");
    sync[key] = structuredClone(legacy.websiteSync[key]);
  }
  // Preserve the normal operator review fence when refreshing its derived list.
  const unresolved = (changes) => changes.filter((change) => sync.reviewDecisions[change.id]?.sourceFingerprint !== change.sourceFingerprint);
  if (!same(domain.websiteSync.changes, unresolved(baseline.websiteSync.changes))) fail("SOURCE_RECONCILIATION_REVIEW_CONFLICT");
  sync.changes = unresolved(legacy.websiteSync.changes);
  sync.counts = { ...legacy.websiteSync.counts,
    new: sync.changes.filter((c) => ["NEW_ASSOCIATION", "NEW_ARTICLE"].includes(c.kind)).length,
    changed: sync.changes.filter((c) => ["SOURCE_ARTICLE_CHANGED", "WORKSPACE_SOURCE_DIFFERENCE"].includes(c.kind)).length,
    attention: sync.changes.length };
  sync.status = sync.changes.length ? "ATTENTION" : "OK";
  patch.websiteSync = sync;
  const audit = addedAudit.filter((e) => !domainAudit.has(e.id));
  const evidence = { schemaVersion: 1, kind: "LEGACY_WEBSITE_SYNC_FORWARD_RECONCILIATION", actorId, reason, baselineRevision: baseline.revision, baselineHash, legacyRevision: legacy.revision, legacyHash, domainRevision: domain.revision, domainHash, patchHash: hash(patch), auditHash: hash(audit), importedAuditIds: addedAudit.map((e) => e.id), truthChanges };
  return { id: hash(evidence), evidence, patch, audit };
}

export async function applyWebsiteSyncSourceReconciliation(store, plan, now = new Date()) {
  return store.mutate(async (state) => {
    const id = `source-reconciliation-${plan.id}`;
    const existing = state.audit.find((event) => event.id === id);
    if (existing) {
      if (!same(existing.details, plan.evidence)) fail("SOURCE_RECONCILIATION_RETRY_CONFLICT");
      return { state, unchanged: true, value: { duplicate: true, planId: plan.id } };
    }
    if (hash(state) !== plan.evidence.domainHash || hash(plan.patch) !== plan.evidence.patchHash || hash(plan.audit) !== plan.evidence.auditHash || hash(plan.evidence) !== plan.id) fail("SOURCE_RECONCILIATION_PLAN_STALE");
    for (const [key, value] of Object.entries(plan.patch)) {
      if (![...truthKeys, "websiteSync"].includes(key)) fail("SOURCE_RECONCILIATION_PATCH_SCOPE");
      state[key] = structuredClone(value);
    }
    state.audit.unshift({ id, at: now.toISOString(), userId: plan.evidence.actorId, action: "Legacy websitecontrole naar domeinautoriteit gereconcilieerd", subject: "Sportpaleis migration source", details: plan.evidence }, ...structuredClone(plan.audit));
    return { state, value: { duplicate: false, planId: plan.id } };
  });
}
