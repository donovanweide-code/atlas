import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contract = JSON.parse(await readFile(new URL("../config/wbd-owner-domain-assurance-v1.json", import.meta.url), "utf8"));
const assurance = await readFile(new URL("../scripts/wbd-owner-domain-assurance.mjs", import.meta.url), "utf8");
const builder = await readFile(new URL("../scripts/build-production-release.mjs", import.meta.url), "utf8");
const rollback = await readFile(new URL("../scripts/wbd-owner-domain-rollback-bridge.mjs", import.meta.url), "utf8");
const broker = await readFile(new URL("../../ops/production/spw-immutable-release.sh", import.meta.url), "utf8");

test("Owner assurancecontract is versioned en behoudt harde production-shaped grenzen", () => {
  assert.equal(contract.contractId, "WBD_OWNER_DOMAIN_ASSURANCE_V1");
  assert.ok(contract.minimumLoad.sessionPolls >= 100);
  assert.ok(contract.minimumLoad.concurrentReadRounds >= 12);
  assert.ok(contract.minimumLoad.concurrentRoutes >= 7);
  assert.ok(contract.limits.eventLoopMaxMs <= 750);
  assert.ok(contract.limits.rssGrowthBytes <= 268_435_456);
  for (const invariant of ["hashEqualBackfill", "sessionPollsReadOnly", "legacyStateWriteStable", "tenantIsolation", "interruptedMutationAtomic"]) {
    assert.ok(contract.requiredInvariants.includes(invariant));
  }
});

test("releaseartifact bindt Owner gate, contract en rollbackbridge immutable", () => {
  assert.match(builder, /ownerDomainAssuranceRequired: true/u);
  assert.match(builder, /ownerDomainAssurance: \{/u);
  assert.match(builder, /wbd-owner-domain-rollback-bridge\.mjs/u);
  assert.match(assurance, /rssGrowthBytes <= limits\.rssGrowthBytes/u);
  assert.match(assurance, /validateWbdOwnerStateKey\("organizationId", "foreign-tenant"\)/u);
  assert.match(rollback, /WBD_RELEASEBROKER_LOCK_HELD/u);
  assert.match(rollback, /R2\.26\.38_COMPATIBLE/u);
  assert.match(broker, /verify_owner_domain_assurance/u);
  assert.match(broker, /--owner-assurance-evidence/u);
  assert.match(broker, /OWNER_DOMAIN_ASSURANCE/u);
});
