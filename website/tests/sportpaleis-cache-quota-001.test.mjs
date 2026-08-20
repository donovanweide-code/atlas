import assert from "node:assert/strict";
import test from "node:test";
import { SportpaleisPilotApi, SPORTPALEIS_READONLY_CACHE_KEY, SPORTPALEIS_READONLY_CACHE_MAX_BYTES } from "../src/sportpaleis/pilot-api.ts";

class SessionStorage {
  values = new Map();
  failWrite = false;
  setCalls = 0;
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    this.setCalls += 1;
    if (this.failWrite) throw new DOMException("Failed to execute 'setItem': exceeded the quota.", "QuotaExceededError");
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

function bootstrap(overrides = {}) {
  return {
    schemaVersion: 12,
    revision: 751,
    currentUserId: "user-1",
    currentUser: { id: "user-1", name: "Operator", email: "operator@example.test", role: "operator", status: "Actief", seatType: "customer", workContexts: ["PRODUCTION"], defaultContext: "PRODUCTION" },
    users: [], employees: [], switchableUsers: [], orders: [], feedback: [], extraUserRequests: [], mailbatches: [], productionElements: [], productionFonts: [], productionElementRequirements: [], productionInventory: [], productionJobs: [], productionProposals: [], preferences: {}, articles: [], associations: [], configurationVersion: "test", productionProfiles: [], settings: {}, foilRolls: [], audit: [],
    capabilities: { admin: false, operator: true, store: false, support: false, demo: false, demoEnabled: false, uploadsEnabled: false, fontUploadsEnabled: false, mailMode: "capture", hardwareSendEnabled: false, barcodeEnabled: false, barcodeHardwareValidated: false, workContexts: ["PRODUCTION"], deviceMode: "SHARED", authMethod: "PASSWORD", quickPinEnabled: false },
    releaseId: "test-release",
    csrfToken: "must-not-be-cached",
    ...overrides,
  };
}

async function withBrowserDoubles(storage, payload, action) {
  const previousFetch = globalThis.fetch;
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  try { return await action(); }
  finally {
    globalThis.fetch = previousFetch;
    if (previousStorage) Object.defineProperty(globalThis, "sessionStorage", previousStorage);
    else delete globalThis.sessionStorage;
  }
}

test("QuotaExceededError na centrale bootstrap blokkeert login/start niet", async () => {
  const storage = new SessionStorage();
  storage.failWrite = true;
  const result = await withBrowserDoubles(storage, bootstrap(), () => new SportpaleisPilotApi().bootstrap());
  assert.equal(result.revision, 751);
  assert.equal(result.readOnlyFallback, undefined);
  assert.equal(storage.values.size, 0);
});

test("grote volledige state blijft centraal bruikbaar terwijl onveilige cachewrite wordt overgeslagen", async () => {
  const storage = new SessionStorage();
  storage.values.set("sportpaleis.workspace.readonly-cache.012", "legacy");
  const central = bootstrap({ orders: [{ id: "large", payload: "x".repeat(SPORTPALEIS_READONLY_CACHE_MAX_BYTES + 100) }] });
  const result = await withBrowserDoubles(storage, central, () => new SportpaleisPilotApi().bootstrap());
  assert.equal(result.orders[0].id, "large");
  assert.equal(storage.setCalls, 0);
  assert.equal(storage.values.size, 0);
});

test("cacheprojectie verwijdert CSRF en omvangrijke validatiehistorie maar bewaart bruikbare fallback", async () => {
  const storage = new SessionStorage();
  const central = bootstrap({ productionProfiles: [{ id: "profile-1", name: "Profiel", placement: "rug", referenceDistanceCm: null, sizeLabel: "Senior", fontProfile: "font", foilColor: "WIT", mirror: true, rotationDeg: 90, instruction: "", validationHistory: [{ previous: "x".repeat(500_000), next: "x".repeat(500_000), at: "2026-08-20", userId: "user", source: "test" }] }] });
  await withBrowserDoubles(storage, central, () => new SportpaleisPilotApi().bootstrap());
  const raw = storage.getItem(SPORTPALEIS_READONLY_CACHE_KEY);
  assert.ok(raw);
  assert.ok(new TextEncoder().encode(raw).byteLength < SPORTPALEIS_READONLY_CACHE_MAX_BYTES);
  assert.doesNotMatch(raw, /must-not-be-cached|validationHistory/);
  const fallback = await withBrowserDoubles(storage, central, () => new SportpaleisPilotApi().cachedBootstrap());
  assert.equal(fallback.readOnlyFallback, true);
  assert.equal(fallback.revision, 751);
});

test("corrupte actuele cache en geblokkeerde sessionStorage blijven fail-open", async () => {
  const storage = new SessionStorage();
  storage.values.set(SPORTPALEIS_READONLY_CACHE_KEY, "{broken");
  const ignored = await withBrowserDoubles(storage, bootstrap(), () => new SportpaleisPilotApi().cachedBootstrap());
  assert.equal(ignored, undefined);
  assert.equal(storage.values.size, 0);

  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get() { throw new DOMException("Blocked", "SecurityError"); } });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(bootstrap()), { status: 200, headers: { "Content-Type": "application/json" } });
  try { assert.equal((await new SportpaleisPilotApi().bootstrap()).revision, 751); }
  finally {
    globalThis.fetch = previousFetch;
    if (previousStorage) Object.defineProperty(globalThis, "sessionStorage", previousStorage);
    else delete globalThis.sessionStorage;
  }
});
