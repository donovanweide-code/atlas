import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../config/sportpaleis-production-shaped-assurance-v3.json", import.meta.url);

test("V3-drempels zijn zwaarder dan of gelijk aan de falende R2.26.45-gate", async () => {
  const contract = JSON.parse(await readFile(contractUrl, "utf8"));
  assert.equal(contract.schemaVersion, 3);
  assert.ok(contract.minimumLoad.concurrentFullBootstraps >= 4);
  assert.ok(contract.minimumLoad.libraryPreviews >= 300);
  assert.ok(contract.minimumLoad.revisionPolls >= 100);
  assert.deepEqual(contract.minimumLoad.largeFreeProductionHeightsMm, [80, 200]);
  assert.equal(contract.minimumLoad.quantityPerValue, 2);
  assert.ok(contract.limits.eventLoopMaxMs <= 1000);
  assert.ok(contract.limits.eventLoopP95Ms <= 100);
  assert.ok(contract.limits.rssHighWaterBytes <= 1073741824);
  assert.ok(contract.limits.steadyStateRssGrowthBytes <= 67108864);
  assert.equal(contract.limits.databaseAcquireTimeouts, 0);
  for (const required of ["largeFreeProduction80Mm", "largeFreeProduction200Mm", "productionIdempotency", "rollbackMaterializationProven", "domainRecordWritesIncremental"]) assert.ok(contract.requiredInvariants.includes(required));
});

test("releaseartifact en broker binden dezelfde immutable gatecode en het drempelcontract", async () => {
  const [builder, broker, assurance] = await Promise.all([
    readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../ops/production/spw-immutable-release.sh", import.meta.url), "utf8"),
    readFile(new URL("../scripts/sportpaleis-production-shaped-assurance.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(builder, /sportpaleis-production-shaped-assurance-v3\.json/u);
  assert.match(builder, /sportpaleis-domain-rollback-bridge\.mjs/u);
  assert.match(builder, /contractSha256/u);
  assert.match(broker, /assuranceContractSha256/u);
  assert.match(broker, /largeFreeProduction80Mm/u);
  assert.match(broker, /eventLoopP95Ms > 100/u);
  assert.match(broker, /website\/scripts\/sportpaleis-domain-rollback-bridge\.mjs/u);
  assert.match(assurance, /materializeLegacyRollbackState/u);
  assert.match(assurance, /largeFreeProductionHeightsMm/u);
  assert.match(assurance, /recordWrites/u);
});
