import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveCanonicalProductionLines, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Pioneers-Retry-Kevin!", patrick: "Pioneers-Retry-Patrick!", collega: "Pioneers-Retry-Store!", "donovan-support": "Pioneers-Retry-Support!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-pioneers-retry-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PIONEERS-REJECTION-RETRY-TEST", allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }) };
}

test("menselijk afgekeurde Pioneers 37 blijft immutable en retry gebruikt één glyphmaster voor Rug, Borst en Short", async (context) => {
  const { store, service, operator } = await fixture(context);
  const created = (await service.createOrder(operator.token, operator.csrfToken, {
    orderKind: "INDIVIDUAL", association: "Almere Pioneers", customer: "Pioneers 37 retry", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [
      { articleId: "sp-live-116386", size: "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "37", chestNumber: "37", backNumberSizeClass: "SENIOR" } },
      { articleId: "sp-live-116387", size: "L", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "37" } },
    ],
  }, "pioneers-rejected-create")).value;
  const originalSources = created.productionLines.map(({ personalizationField, source }) => [personalizationField, source.id]);
  assert.deepEqual(originalSources, [["backNumber", "production-asset-verified-pioneers-rug-senior-200"], ["chestNumber", "production-asset-verified-pioneers-rug-senior-200"], ["shortsNumber", "production-asset-verified-pioneers-rug-senior-200"]]);
  const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, "pioneers-rejected-control")).value;
  const proposal = (await service.createProductionProposal(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "pioneers-rejected-proposal")).value;
  const group = proposal.groups[0];
  const original = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "pioneers-rejected-job")).value;
  const originalDownload = await service.productionJobArtifact(operator.token, original.id);
  await store.mutate(async (state) => {
    const order = state.orders.find(({ id }) => id === controlled.id);
    const job = state.productionJobs.find(({ id }) => id === original.id);
    const legacyShort = state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "pioneers-short-80");
    const short = order.productionExecutionSnapshot.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
    short.source = {
      ...short.source,
      id: legacyShort.id,
      version: legacyShort.version,
      versionHash: legacyShort.versionHash,
      sourceId: legacyShort.sourceId,
      sourceGeometryHash: legacyShort.sourceSelection.geometryHash,
      variantId: legacyShort.variants.find(({ heightMm }) => Number(heightMm) === 80).id,
    };
    order.productionLines = structuredClone(order.productionExecutionSnapshot.productionLines);
    const { executionHash: _executionHash, ...body } = order.productionExecutionSnapshot;
    order.productionExecutionSnapshot.executionHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    job.snapshot.productionLines = structuredClone(order.productionExecutionSnapshot.productionLines);
    job.snapshotHash = createHash("sha256").update(JSON.stringify(job.snapshot)).digest("hex");
    return { state, value: null };
  });

  await service.initialize();
  assert.equal((await store.read()).productionJobs.find(({ id }) => id === original.id).snapshot.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber").source.id, "production-asset-verified-pioneers-short-80");
  const reconciledState = await store.read();
  const reconciledOrder = reconciledState.orders.find(({ id }) => id === created.id);
  const reconciledLines = resolveCanonicalProductionLines(reconciledState, reconciledOrder.id, reconciledOrder.items).filter(({ content }) => content === "37");
  assert.deepEqual(reconciledLines.map(({ personalizationField, source, heightMm, validation }) => [personalizationField, source.id, source.variantId, heightMm, validation.status]), [
    ["backNumber", "production-asset-verified-pioneers-rug-senior-200", "variant-verified-pioneers-rug-senior-200", 200, "VALID"],
    ["chestNumber", "production-asset-verified-pioneers-rug-senior-200", "variant-verified-pioneers-rug-senior-200", 80, "VALID"],
    ["shortsNumber", "production-asset-verified-pioneers-rug-senior-200", "variant-verified-pioneers-rug-senior-200", 80, "VALID"],
  ]);
  const reason = "Menselijke productiecontrole: onderste shortnummer 37 heeft afwijkende glyphstijl.";
  const rejected = await service.rejectProductionJob(operator.token, operator.csrfToken, original.id, { reason });
  assert.equal(rejected.duplicate, false);
  const first = await service.retryRejectedProductionJob(operator.token, operator.csrfToken, original.id, { reason }, "pioneers-rejected-safe-retry");
  const duplicate = await service.retryRejectedProductionJob(operator.token, operator.csrfToken, original.id, { reason }, "pioneers-rejected-safe-retry");
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.value.job.id, first.value.job.id);
  assert.equal(first.value.rejectedJob.status, "REJECTED");
  assert.equal(first.value.rejectedJob.humanAcceptance.status, "FAIL");
  assert.equal(first.value.rejectedJob.snapshot.artifact.sha256, original.snapshot.artifact.sha256);
  const retainedDownload = await service.productionJobArtifact(operator.token, original.id);
  assert.equal(retainedDownload.sha256, originalDownload.sha256);
  assert.deepEqual(retainedDownload.bytes, originalDownload.bytes);

  const replacement = first.value.job;
  assert.equal(replacement.status, "AWAITING_HUMAN_CHECK");
  assert.equal(replacement.humanAcceptance.status, "PENDING");
  assert.notEqual(replacement.snapshotHash, original.snapshotHash);
  assert.notEqual(replacement.snapshot.artifact.path, original.snapshot.artifact.path);
  assert.notEqual(replacement.snapshot.artifact.filename, original.snapshot.artifact.filename);
  const pioneersLines = replacement.snapshot.productionLines.filter(({ orderId, content }) => orderId === created.id && content === "37");
  assert.deepEqual(pioneersLines.map(({ personalizationField, heightMm }) => [personalizationField, heightMm]).sort(([left], [right]) => left.localeCompare(right)), [["backNumber", 200], ["chestNumber", 80], ["shortsNumber", 80]]);
  assert.deepEqual([...new Set(pioneersLines.map(({ source }) => source.id))], ["production-asset-verified-pioneers-rug-senior-200"]);
  assert.equal(new Set(pioneersLines.map(({ source }) => source.variantId)).size, 1);

  const state = await store.read();
  assert.equal(state.productionJobs.filter(({ id }) => [original.id, replacement.id].includes(id)).length, 2);
  const savedOrder = state.orders.find(({ id }) => id === created.id);
  assert.equal(savedOrder.eventHistory.filter(({ type, details }) => type === "PRODUCTION_JOB_REJECTED" && details.productionJobId === original.id).length, 1);
  assert.equal(savedOrder.eventHistory.filter(({ type, details }) => type === "PRODUCTION_JOB_CREATED" && details.productionJobId === replacement.id).length, 1);
  assert.ok(savedOrder.productionExecutionHistory.some(({ rejectedProductionJobId, immutableArtifactSha256 }) => rejectedProductionJobId === original.id && immutableArtifactSha256 === original.snapshot.artifact.sha256));
  assert.equal(state.audit.filter(({ action, subject }) => action === "Productiejob uitsluitend afgekeurd" && subject === original.jobNumber).length, 1);
  assert.equal(state.audit.filter(({ action, subject }) => action === "Gecorrigeerde immutable productiejob vastgelegd" && subject === replacement.jobNumber).length, 1);
  const correctionAudit = state.audit.find(({ action, subject }) => action === "Gecorrigeerde immutable productiejob vastgelegd" && subject === replacement.jobNumber);
  assert.equal(correctionAudit.details.sourceCorrections.filter(({ changed }) => changed).length, 1);
  assert.equal(correctionAudit.details.sourceCorrections.find(({ changed }) => changed).previousSource.id, "production-asset-verified-pioneers-short-80");
});
