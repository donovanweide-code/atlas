import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Reject-Only-Admin-2026!", patrick: "Reject-Only-Operator-2026!", collega: "Reject-Only-Store-2026!", "donovan-support": "Reject-Only-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
const reason = "WRONG_HEIGHT_200MM_INTENDED_80MM";
const issuerSecret = "reject-only-issuer-secret-with-at-least-256-bits";

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-reject-only-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-REJECT-ONLY-R2.26.37-TEST", reviewAccessEnabled: true, activeReviewCandidateIds: ["SPW-REJECT-ONLY-R2.26.37-TEST"], reviewAccessIssuerPrincipalIds: ["kevin"], reviewAccessIssuerSecret: issuerSecret });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { root, store, service, operator };
}

async function createAwaitingJob(context) {
  const setup = await fixture(context);
  const { service, operator } = setup;
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", association: "Almere Pioneers", customer: "Reject-only regressie", customerEmail: "", customerPhone: "", standardPersonalization: { ...empty, backNumber: "7", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, "reject-only-create-order")).value;
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, "reject-only-control-order")).value;
  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "reject-only-proposal")).value;
  const group = proposal.groups[0];
  const job = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "reject-only-job")).value;
  return { ...setup, orderId: controlled.id, proposalId: proposal.id, groupId: group.id, job };
}

test("reject-only bewaart artifact en snapshot, maakt niets nieuws en blijft idempotent", async (context) => {
  const { store, service, operator, orderId, job } = await createAwaitingJob(context);
  const before = await store.read();
  const beforeArtifact = await service.productionJobArtifact(operator.token, job.id);
  const beforeOrder = structuredClone(before.orders.find(({ id }) => id === orderId));
  const result = await service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason });
  const duplicate = await service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason });
  assert.equal(result.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(result.value.status, "REJECTED");
  assert.equal(result.value.humanAcceptance.status, "FAIL");
  assert.deepEqual(result.value.rejection, {
    reason,
    rejectedAt: result.value.rejection.rejectedAt,
    rejectedBy: { userId: operator.user.id, name: operator.user.name, role: operator.user.role },
    immutableArtifactSha256: job.snapshot.artifact.sha256,
    snapshotHash: job.snapshotHash,
    physicalCompletionPerformed: false,
    replacementJobCreated: false,
  });
  const afterArtifact = await service.productionJobArtifact(operator.token, job.id);
  assert.equal(afterArtifact.sha256, beforeArtifact.sha256);
  assert.deepEqual(afterArtifact.bytes, beforeArtifact.bytes);
  const after = await store.read();
  assert.equal(after.productionJobs.length, before.productionJobs.length);
  assert.equal(after.productionProposals.length, before.productionProposals.length);
  assert.equal(after.nextProductionJobSequence, before.nextProductionJobSequence);
  assert.equal(Object.keys(after.idempotency).length, Object.keys(before.idempotency).length, "reject-only maakt geen productie-idempotencyrecord");
  const order = after.orders.find(({ id }) => id === orderId);
  assert.equal(order.stage, "PRINT");
  assert.equal(order.productionCompletionEvidence, beforeOrder.productionCompletionEvidence);
  assert.equal(order.eventHistory.filter(({ type, details }) => type === "PRODUCTION_JOB_REJECTED" && details?.productionJobId === job.id).length, 1);
  assert.equal(order.eventHistory.some(({ type, details }) => type === "PRODUCTION_GROUP_PRINTED" && details?.productionJobId === job.id), false);
  assert.equal(after.audit.filter(({ action, subject }) => action === "Productiejob uitsluitend afgekeurd" && subject === job.jobNumber).length, 1);
  assert.equal((await service.order(operator.token, orderId)).productionClosure.status, "NOT_ELIGIBLE");
});

test("twee gelijktijdige rejects leveren één afkeur-event en geen sequence op", async (context) => {
  const { store, service, operator, orderId, job } = await createAwaitingJob(context);
  const before = await store.read();
  const results = await Promise.all([
    service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason }),
    service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason }),
  ]);
  assert.deepEqual(results.map(({ duplicate }) => duplicate).sort(), [false, true]);
  const after = await store.read();
  assert.equal(after.productionJobs.length, before.productionJobs.length);
  assert.equal(after.nextProductionJobSequence, before.nextProductionJobSequence);
  assert.equal(after.orders.find(({ id }) => id === orderId).eventHistory.filter(({ type, details }) => type === "PRODUCTION_JOB_REJECTED" && details?.productionJobId === job.id).length, 1);
});

test("reject en completion kunnen niet beide winnen", async (context) => {
  const { store, service, operator, orderId, job } = await createAwaitingJob(context);
  const outcomes = await Promise.allSettled([
    service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason }),
    service.completeProductionJob(operator.token, operator.csrfToken, job.id, "reject-only-versus-completion"),
  ]);
  assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(({ status }) => status === "rejected").length, 1);
  const state = await store.read();
  const terminal = state.productionJobs.find(({ id }) => id === job.id);
  assert.ok(["REJECTED", "COMPLETED"].includes(terminal.status));
  const order = state.orders.find(({ id }) => id === orderId);
  const rejected = order.eventHistory.filter(({ type, details }) => type === "PRODUCTION_JOB_REJECTED" && details?.productionJobId === job.id).length;
  const completed = order.eventHistory.filter(({ type, details }) => type === "PRODUCTION_GROUP_PRINTED" && details?.productionJobId === job.id).length;
  assert.equal(rejected + completed, 1);
  assert.equal(terminal.status === "REJECTED" ? completed : rejected, 0);
});

test("transactiefout na reject-mutator bewaart state en audit volledig", async (context) => {
  const { store, service, operator, job } = await createAwaitingJob(context);
  const before = await store.read();
  const originalMutate = store.mutate.bind(store);
  store.mutate = async (mutator) => {
    const candidate = await store.read();
    await mutator(structuredClone(candidate));
    throw Object.assign(new Error("Gesimuleerde reject-only rollback"), { code: "SIMULATED_REJECT_ONLY_ROLLBACK" });
  };
  await assert.rejects(service.rejectProductionJob(operator.token, operator.csrfToken, job.id, { reason }), (error) => error.code === "SIMULATED_REJECT_ONLY_ROLLBACK");
  store.mutate = originalMutate;
  assert.deepEqual(await store.read(), before);
});

test("loopback reconciliation bindt secret, Human GO, jobnummer en 200-mm-state", async (context) => {
  const { store, service, job } = await createAwaitingJob(context);
  await store.mutate(async (state) => {
    state.productionJobs.find(({ id }) => id === job.id).jobNumber = "PLOT-2026-0077";
    return { state, value: null };
  });
  const payload = { jobNumber: "PLOT-2026-0077", reason, humanGoReference: "GO-R2.26.36-COMPLETION-GATE:PLOT-2026-0077" };
  await assert.rejects(service.rejectProductionJobForAuthorizedReconciliation(payload, issuerSecret, "203.0.113.10"), (error) => error.code === "PRODUCTION_RECONCILIATION_LOCAL_ONLY");
  await assert.rejects(service.rejectProductionJobForAuthorizedReconciliation(payload, "wrong-secret", "127.0.0.1"), (error) => error.code === "PRODUCTION_RECONCILIATION_FORBIDDEN");
  await assert.rejects(service.rejectProductionJobForAuthorizedReconciliation({ ...payload, reason: "andere reden" }, issuerSecret, "127.0.0.1"), (error) => error.code === "PRODUCTION_RECONCILIATION_SCOPE_MISMATCH");
  const result = await service.rejectProductionJobForAuthorizedReconciliation(payload, issuerSecret, "127.0.0.1");
  assert.equal(result.value.status, "REJECTED");
  assert.equal(result.value.rejection.rejectedBy.userId, "kevin");
  const state = await store.read();
  const audit = state.audit.find(({ action, subject }) => action === "Productiejob uitsluitend afgekeurd" && subject === "PLOT-2026-0077");
  assert.equal(audit.details.humanGoReference, payload.humanGoReference);
  assert.equal(audit.details.authorizedReconciliation, true);
});
