import assert from "node:assert/strict";
import test from "node:test";
import { createNonCriticalReadonlyCache } from "../src/workspace-readonly-cache.ts";

class MemoryStorage {
  values = new Map();
  failWrite = false;
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (this.failWrite) throw new DOMException("Setting the value exceeded the quota.", "QuotaExceededError");
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

function cache(storage, observations = [], maxBytes = 128) {
  return createNonCriticalReadonlyCache({
    key: "wbd.workspace.readonly-cache.002",
    keyPrefix: "wbd.workspace.readonly-cache.",
    maxBytes,
    resolveStorage: () => storage,
    validate: (value) => Boolean(value && typeof value === "object" && Number.isInteger(value.revision)),
    observe: (observation) => observations.push(observation),
  });
}

test("quota-exception blijft niet-kritiek en lekt geen browserfout uit de cacheboundary", () => {
  const storage = new MemoryStorage();
  const observations = [];
  storage.failWrite = true;
  assert.equal(cache(storage, observations).replace({ revision: 7 }), "WRITE_FAILED");
  assert.deepEqual(observations, ["CACHE_WRITE_FAILED"]);
  assert.equal(storage.length, 0);
});

test("te grote fallback wordt vóór setItem overgeslagen", () => {
  const storage = new MemoryStorage();
  const observations = [];
  assert.equal(cache(storage, observations, 32).replace({ revision: 7, value: "x".repeat(100) }), "SKIPPED_TOO_LARGE");
  assert.deepEqual(observations, ["CACHE_TOO_LARGE"]);
  assert.equal(storage.length, 0);
});

test("alleen eigen oude cacheversies worden opgeruimd en de actuele bounded waarde blijft", () => {
  const storage = new MemoryStorage();
  storage.values.set("wbd.workspace.readonly-cache.001", "old");
  storage.values.set("unrelated", "keep");
  assert.equal(cache(storage).replace({ revision: 8 }), "STORED");
  assert.equal(storage.getItem("wbd.workspace.readonly-cache.001"), null);
  assert.equal(JSON.parse(storage.getItem("wbd.workspace.readonly-cache.002")).revision, 8);
  assert.equal(storage.getItem("unrelated"), "keep");
});

test("corrupte of semantisch ongeldige cache wordt verwijderd", () => {
  const storage = new MemoryStorage();
  const observations = [];
  storage.values.set("wbd.workspace.readonly-cache.002", "{broken");
  assert.equal(cache(storage, observations).read(), undefined);
  assert.equal(storage.getItem("wbd.workspace.readonly-cache.002"), null);
  assert.deepEqual(observations, ["CACHE_READ_FAILED"]);
  storage.values.set("wbd.workspace.readonly-cache.002", "{}");
  assert.equal(cache(storage, observations).read(), undefined);
  assert.equal(storage.getItem("wbd.workspace.readonly-cache.002"), null);
  assert.equal(observations.at(-1), "CACHE_CORRUPT");
});

test("ontbrekende of geblokkeerde Storage API houdt de online app bruikbaar", () => {
  const observations = [];
  const missing = createNonCriticalReadonlyCache({ key: "cache", keyPrefix: "cache", maxBytes: 10, resolveStorage: () => undefined, validate: () => true, observe: (value) => observations.push(value) });
  assert.equal(missing.replace({}), "STORAGE_UNAVAILABLE");
  assert.equal(missing.read(), undefined);
  const blocked = createNonCriticalReadonlyCache({ key: "cache", keyPrefix: "cache", maxBytes: 10, resolveStorage: () => { throw new DOMException("Blocked", "SecurityError"); }, validate: () => true, observe: (value) => observations.push(value) });
  assert.equal(blocked.replace({}), "STORAGE_UNAVAILABLE");
  assert.equal(blocked.read(), undefined);
  assert.ok(observations.every((value) => value === "CACHE_STORAGE_UNAVAILABLE"));
});

test("ook falende observability kan auth/bootstrap nooit blokkeren", () => {
  const storage = new MemoryStorage();
  storage.failWrite = true;
  const guarded = createNonCriticalReadonlyCache({ key: "cache", keyPrefix: "cache", maxBytes: 10, resolveStorage: () => storage, validate: () => true, observe: () => { throw new Error("observability unavailable"); } });
  assert.equal(guarded.replace({}), "WRITE_FAILED");
});
