import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSportpaleisDomainPayload,
  composeSportpaleisState,
  createLazySportpaleisStateDraft,
  partitionSportpaleisState,
  sha256CanonicalJson,
  sportpaleisDomainManifest,
} from "../scripts/workspace-domain-state.mjs";
import { createSportpaleisProductionBootstrap } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { diffStableRecords } from "../scripts/workspace-domain-storage-primitives.mjs";

test("domeinpartitionering is deterministisch en verliesvrij", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  const domains = partitionSportpaleisState(state);
  const restored = composeSportpaleisState(domains);
  assert.deepEqual(restored, state);
  assert.equal(sha256CanonicalJson(restored), sha256CanonicalJson(state));
  assert.deepEqual(Object.keys(domains).sort(), ["artifacts", "audit", "history", "identity", "library", "mailbox", "orders", "platform", "production"]);
  assert.deepEqual(Object.keys(domains.orders), ["orders"]);
  assert.ok(Object.hasOwn(domains.identity, "sessions"));
  assert.ok(Object.hasOwn(domains.artifacts, "productionJobs"));
});

test("lazy mutatiedraft cloned alleen geraakte statekeys", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  state.audit[0].details.largeEvidence = "x".repeat(4 * 1024 * 1024);
  const { draft, finalize } = createLazySportpaleisStateDraft(state);
  draft.preferences.operator = { density: "compact" };
  const result = finalize();
  assert.deepEqual(result.clonedKeys, ["preferences"]);
  assert.deepEqual(result.changedDomains, ["identity"]);
  assert.equal(result.state.audit, state.audit, "het zware auditdomein blijft reference-stable");
  assert.notEqual(result.state.preferences, state.preferences);
});

test("auditappend cloned alleen de array en behoudt immutable evidence-objecten", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-05T06:00:00.000Z"));
  Object.freeze(state.audit[0]);
  const { draft, finalize } = createLazySportpaleisStateDraft(state);
  draft.audit.unshift({ id: "audit-new", at: "2026-09-05T06:01:00.000Z", userId: "test", action: "test", subject: "test", details: {} });
  const result = finalize();
  assert.deepEqual(result.changedDomains, ["audit"]);
  assert.equal(result.state.audit[1], state.audit[0]);
  assert.equal(result.state.audit.length, state.audit.length + 1);
});

test("domeinpayload weigert verkeerde keys en onbegrensde groei", () => {
  assert.throws(() => assertSportpaleisDomainPayload("orders", { users: [] }), /hoort niet/);
  assert.throws(() => assertSportpaleisDomainPayload("orders", { orders: ["x".repeat(1024)] }, { maximumBytes: 64 }), /opslagbudget/);
  const manifest = sportpaleisDomainManifest(createSportpaleisProductionBootstrap());
  assert.match(manifest.identity.sha256, /^[a-f0-9]{64}$/u);
  assert.ok(manifest.library.bytes > 0);
});

test("generieke recordprimitive onderscheidt inhoud, volgorde en verwijdering zonder tenantkennis", () => {
  const previous = [{ id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 }];
  const next = [{ id: "b", value: 2 }, { id: "a", value: 4 }, { id: "d", value: 5 }];
  const delta = diffStableRecords(previous, next, { identity: ({ id }) => id });
  assert.deepEqual(delta.deleted, ["c"]);
  assert.deepEqual(delta.changed.map(({ id, ordinal }) => ({ id, ordinal })), [{ id: "b", ordinal: 0 }, { id: "a", ordinal: 1 }, { id: "d", ordinal: 2 }]);
});
