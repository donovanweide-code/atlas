import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSportpaleisProductionBootstrap, validateSportpaleisPilotState } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { sha256CanonicalJson as hash } from "../scripts/workspace-domain-state.mjs";
import { planWebsiteSyncSourceReconciliation as plan, applyWebsiteSyncSourceReconciliation as apply } from "../scripts/sportpaleis-domain-source-reconciliation.mjs";

function fixture() {
  const baseline = createSportpaleisProductionBootstrap(new Date("2026-09-07T00:00:00Z"));
  baseline.revision = 10;
  baseline.productionProfiles.find(p=>p.id === "profile-source-a-s-c-waterwijk-backNumber").backNumberSizeClasses.SENIOR.physicalHeightMm = 200;
  baseline.websiteSync.changes = [{ id: "change-1", kind: "MISSING_FROM_SOURCE", sourceFingerprint: null }];
  const legacy = validateSportpaleisPilotState(structuredClone(baseline));
  legacy.revision = 11;
  legacy.websiteSync.lastAttemptAt = "2026-09-08T00:00:00Z";
  legacy.websiteSync.changes.push({ id: "change-2", kind: "NEW_ARTICLE", sourceFingerprint: "new-source" });
  legacy.audit.unshift({ id: "sync-1", at: "2026-09-08T00:00:00Z", userId: "system:website-sync", action: "Website gecontroleerd", details: { trigger: "scheduled", autoProjected: 0 } });
  const domain = structuredClone(baseline);
  domain.revision = 20;
  domain.websiteSync.reviewDecisions["change-1"] = { action: "KEEP_WORKSPACE", sourceFingerprint: null };
  domain.websiteSync.changes = [];
  domain.audit.unshift({ id: "domain-only", at: "2026-09-09T00:00:00Z", userId: "operator", action: "Operatorcontrole" });
  const receipt = { status: "MATCH", legacy_revision: 10, legacy_sha256: hash(baseline), composed_sha256: hash(baseline) };
  return { baseline, legacy, domain, receipt, actorId: "maintenance", reason: "Proven source drift" };
}

test("forward reconciliation preserves domain history and review decisions and imports only proven truth/sync deltas", async () => {
  const input = fixture(), prepared = plan(input);
  const original = structuredClone(input.domain);
  let state = structuredClone(input.domain);
  const store = { async mutate(fn) { const draft = structuredClone(state), result = await fn(draft); if (!result.unchanged) { draft.revision++; state = draft; } return { ...result, state }; } };
  await apply(store, prepared);
  assert.equal(state.productionProfiles.find(p=>p.id === "profile-source-a-s-c-waterwijk-backNumber").backNumberSizeClasses.SENIOR.physicalHeightMm, 220);
  assert.deepEqual(state.websiteSync.changes.map(c=>c.id), ["change-2"]);
  assert.deepEqual(state.websiteSync.reviewDecisions, original.websiteSync.reviewDecisions);
  for (const key of ["orders", "productionJobs", "productionProposals", "idempotency", "sessions"]) assert.deepEqual(state[key], original[key]);
  assert.ok(original.audit.every(e=>state.audit.some(n=>hash(n)===hash(e))));
  assert.equal(state.audit.filter(e=>e.id==="sync-1").length,1);
  const after = hash(state);
  assert.equal((await apply(store,prepared)).value.duplicate,true);
  assert.equal(hash(state),after);
});

test("historical baseline must match both reconciliation hashes", () => {
  const input=fixture(); input.receipt.composed_sha256="bad";
  assert.throws(()=>plan(input), {code:"SOURCE_RECONCILIATION_BASELINE_MISMATCH"});
});
test("legacy-only order changes are never silently merged or discarded", () => {
  const input=fixture(); input.legacy.orders.push({id:"unexpected-order"});
  assert.throws(()=>plan(input), {code:"SOURCE_RECONCILIATION_UNEXPLAINED_LEGACY_DELTA"});
});
test("changed historical audit is rejected", () => {
  const input=fixture(); input.legacy.audit.at(-1).action="rewritten";
  assert.throws(()=>plan(input), {code:"SOURCE_RECONCILIATION_AUDIT_CHANGED"});
});
test("manual production truth conflicts are not overwritten by canonical normalization", () => {
  const input=fixture(); input.domain.productionProfiles.find(p=>p.id === "profile-source-a-s-c-waterwijk-backNumber").backNumberSizeClasses.SENIOR.physicalHeightMm=210;
  assert.throws(()=>plan(input), {code:"SOURCE_RECONCILIATION_TRUTH_CONFLICT"});
});
test("concurrent domain edits invalidate the immutable plan", async () => {
  const input=fixture(), prepared=plan(input); input.domain.revision++;
  await assert.rejects(apply({mutate:fn=>fn(input.domain)},prepared), {code:"SOURCE_RECONCILIATION_PLAN_STALE"});
});
test("concurrent website sync changes are not silently overwritten", () => {
  const input=fixture(); input.domain.websiteSync.lastAttemptAt="2026-09-09T00:00:00Z";
  assert.throws(()=>plan(input), {code:"SOURCE_RECONCILIATION_SYNC_CONFLICT"});
});
test("scheduled website writer uses the authoritative domain store", async () => {
  const source=await readFile(new URL("../scripts/sportpaleis-website-sync-job.mjs",import.meta.url),"utf8");
  assert.match(source,/new SportpaleisDomainMariaDbStore\(/u);
  assert.doesNotMatch(source,/sportpaleis-mariadb-store\.mjs/u);
});
