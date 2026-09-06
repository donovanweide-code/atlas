import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const historicalContractUrl = new URL("../config/sportpaleis-production-shaped-assurance-v3.json", import.meta.url);
const contractUrl = new URL("../config/sportpaleis-production-shaped-assurance-v4.json", import.meta.url);

test("V4-soakdrempels behouden V3 en zijn zwaarder dan of gelijk aan de falende R2.26.45-gate", async () => {
  const [contract, historical] = await Promise.all([readFile(contractUrl, "utf8"), readFile(historicalContractUrl, "utf8")].map(async (value) => JSON.parse(await value)));
  assert.equal(historical.schemaVersion, 3, "historisch V3-contract blijft immutable zichtbaar");
  assert.equal(contract.schemaVersion, 4);
  assert.ok(contract.minimumLoad.concurrentFullBootstraps >= 4);
  assert.ok(contract.minimumLoad.libraryPreviews >= 300);
  assert.ok(contract.minimumLoad.revisionPolls >= 100);
  assert.deepEqual(contract.minimumLoad.bootstrapSurfaces, ["overview", "orders", "production", "library", "teamwear", "admin"]);
  assert.deepEqual(contract.minimumLoad.largeFreeProductionHeightsMm, [80, 200]);
  assert.equal(contract.minimumLoad.quantityPerValue, 2);
  assert.ok(contract.minimumLoad.mariaDbBatchRows > 200, "echte MariaDB-gate forceert minimaal twee writebatches");
  assert.ok(contract.minimumLoad.concurrentMutations >= 20, "mutationlane krijgt production-shaped concurrency");
  assert.ok(contract.limits.ordinaryMutationDuringProductionMaxMs <= 1500, "gewone writes blijven ook tijdens productie begrensd");
  assert.ok(contract.limits.productionWorkerInputMaxBytes <= 1_000_000, "de productieworker krijgt geen volledige Library-state meer");
  assert.ok(contract.limits.productionWorkerStartupMaxMs <= 20_000, "child-readiness blijft begrensd");
  assert.ok(contract.limits.productionWorkerRssMaxBytes <= 536_870_912, "childgeheugen blijft begrensd en recycleerbaar");
  assert.ok(contract.limits.productionWorkerOutputMaxBytes <= 8_000_000, "IPC-resultaat blijft begrensd");
  assert.ok(contract.limits.eventLoopMaxMs <= 1000);
  assert.ok(contract.limits.eventLoopP95Ms <= 100);
  assert.ok(contract.limits.rssHighWaterBytes <= 1073741824);
  assert.ok(contract.limits.steadyStateRssGrowthBytes <= 67108864);
  assert.ok(contract.minimumLoad.soakCycles >= 5);
  assert.ok(contract.minimumLoad.soakRevisionPollsPerCycle >= historical.minimumLoad.revisionPolls);
  assert.ok(contract.minimumLoad.soakLibraryPreviewsPerCycle >= historical.minimumLoad.libraryPreviews);
  assert.ok(contract.limits.soakRecoveredRssBandBytes <= 134217728);
  assert.ok(contract.limits.soakMaximumPositiveRssStepBytes <= historical.limits.steadyStateRssGrowthBytes);
  assert.equal(contract.limits.databaseAcquireTimeouts, 0);
  assert.ok(contract.limits.bootstrapSurfaceMaxBytes.production < 6_534_299, "productionbootstrap blijft onder de gemeten monolithische nulmeting");
  assert.ok(contract.limits.bootstrapSurfaceMaxBytes.library < contract.limits.bootstrapSurfaceMaxBytes.production);
  for (const required of ["largeFreeProduction80Mm", "largeFreeProduction200Mm", "sameColorSourceConcurrency", "workerCrashRecoveredWithoutOrphan", "parentReservationCrashRecoveredWithoutOrphan", "productionIdempotency", "productionArtifactReconciliation", "rollbackMaterializationProven", "domainRecordWritesIncremental", "scopedBootstrapPayloads", "expiredAndRevokedSessions", "coldAndWarmBootstrap", "managedFoilColorsComplete", "boundedSvgProcessing", "staleReadsPrevented", "transactionRollbackProven", "restartRecovery", "productionBuildOffEventLoop", "productionWorkerLowPriorityIsolated", "productionWorkerResourcesBounded", "productionWorkerOutputBounded", "productionWorkerExternalRssObserved", "productionWorkerRecycled", "productionWorkerInputBounded", "productionPreparationDoesNotBlockMutations", "mutationLaneBounded", "mariaDbMultiBatchRollback", "multiCycleSoakCompleted", "soakMemoryRecovered", "soakMemoryTrendStable", "soakQueueStable", "noLegacyMonolithLoads"]) assert.ok(contract.requiredInvariants.includes(required));
});

test("releaseartifact en broker binden dezelfde immutable gatecode en het drempelcontract", async () => {
  const [builder, broker, assurance, productionBuild] = await Promise.all([
    readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../ops/production/spw-immutable-release.sh", import.meta.url), "utf8"),
    readFile(new URL("../scripts/sportpaleis-production-shaped-assurance.mjs", import.meta.url), "utf8"),
    readFile(new URL("../src/sportpaleis/production-job-build.mjs", import.meta.url), "utf8"),
  ]);
  const externalManifestSource = builder.slice(builder.indexOf("const externalManifest ="), builder.indexOf("const manifestPath ="));
  assert.ok(externalManifestSource.startsWith("const externalManifest ="), "extern release-manifest is afzonderlijk inspecteerbaar");
  assert.match(builder, /sportpaleis-production-shaped-assurance-v4\.json/u);
  assert.match(builder, /sportpaleis-regression-contract-v1\.json/u);
  assert.match(externalManifestSource, /regressionContract: regressionContract\.path/u);
  assert.match(externalManifestSource, /regressionContractSha256: regressionContract\.sha256/u);
  assert.match(externalManifestSource, /regressionFailureMatrix: regressionFailureMatrix\.path/u);
  assert.match(externalManifestSource, /regressionFailureMatrixSha256: regressionFailureMatrix\.sha256/u);
  assert.match(externalManifestSource, /immutableFixtureManifest: immutableFixtureManifest\.path/u);
  assert.match(externalManifestSource, /immutableFixtureManifestSha256: immutableFixtureManifest\.sha256/u);
  assert.match(builder, /sportpaleis-domain-rollback-bridge\.mjs/u);
  assert.match(builder, /sportpaleis-domain-backfill\.mjs/u);
  assert.match(builder, /workspace-legacy-state-encode-worker\.mjs/u);
  assert.match(productionBuild, /new URL\("\.\/production-job-build-child\.mjs", import\.meta\.url\)/u);
  assert.match(builder, /contractSha256/u);
  assert.match(broker, /assuranceContractSha256/u);
  assert.match(broker, /regressionContractSha256/u);
  assert.match(broker, /failurematrix is niet volledig gesloten/u);
  assert.match(broker, /largeFreeProductionHeightsMm/u);
  assert.match(broker, /bootstrapSurfaceMaxBytes/u);
  assert.match(broker, /eventLoopP95Ms > 100/u);
  assert.match(broker, /website\/scripts\/sportpaleis-domain-rollback-bridge\.mjs/u);
  assert.match(assurance, /materializeLegacyRollbackState/u);
  assert.match(assurance, /largeFreeProductionHeightsMm/u);
  assert.match(assurance, /recordWrites/u);
  assert.match(assurance, /bootstrapFieldBytes/u);
  assert.match(assurance, /scopedBootstrapPayloads/u);
  assert.match(assurance, /productionArtifactReconciliation/u);
  assert.match(assurance, /sameColorSourceConcurrency/u);
  assert.match(assurance, /workerCrashRecoveredWithoutOrphan/u);
  assert.match(assurance, /parentReservationCrashRecoveredWithoutOrphan/u);
  assert.match(assurance, /expiredAndRevokedSessions/u);
  assert.match(assurance, /boundedSvgProcessing/u);
  assert.match(assurance, /transactionRollbackProven/u);
  assert.match(assurance, /ASSURANCE_BATCH_TWO_FAILURE/u);
  assert.match(assurance, /mutationLaneBounded/u);
  assert.match(assurance, /productionPreparationDoesNotBlockMutations/u);
  assert.match(assurance, /productionWorkerResourcesBounded/u);
  assert.match(assurance, /productionWorkerOutputBounded/u);
  assert.match(assurance, /productionWorkerExternalRssObserved/u);
  assert.match(assurance, /productionWorkerRecycled/u);
  assert.match(assurance, /x-assurance-delay-response/u);
  assert.match(assurance, /httpResponseAbortedAfterServerCommit/u);
  assert.match(assurance, /mariaDbMultiBatchRollback/u);
  assert.match(assurance, /soakMemoryTrendStable/u);
  assert.match(assurance, /soakQueueStable/u);
});
