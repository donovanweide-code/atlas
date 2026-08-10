import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ConnectorSourceError,
  MemoryConnectorStateStore,
  summarizeConnectorHealth,
  syncConnector,
  translateConnectorChanges,
} from "../src/atlas-connectors.ts";
import { createWbdSitemapConnector } from "../src/atlas-connector-wbd-sitemap.ts";
import { FileConnectorStateStore } from "../scripts/atlas-connector-file-store.mjs";

const definition = {
  version: 1,
  connectorId: "test-source",
  connectorType: "test",
  contextId: "case:test",
  displayName: "Test source",
  authorizationMode: "none",
  syncStrategy: "snapshot_diff",
  syncFrequency: { mode: "daily", interval: 1, timeZone: "Europe/Amsterdam" },
  freshnessThresholdHours: 36,
  retryPolicy: {
    maxAttempts: 3,
    initialDelayMs: 1,
    maximumDelayMs: 4,
    multiplier: 2,
  },
};

const normalizer = {
  descriptor: {
    normalizerId: "test-normalizer",
    normalizerVersion: "1.0.0",
    outputSchemaVersion: "test-record@1",
  },
  async normalize(batch) {
    return {
      ...batch,
      records: batch.records.map((item) => ({
        sourceRecordId: item.sourceRecordId,
        sourceRecordVersion: item.sourceRecordVersion,
        sourceUpdatedAt: item.sourceUpdatedAt,
        rawReference: item.rawReference,
        rawContentHash: JSON.stringify(item.rawPayload),
        normalizedPayload: item.rawPayload,
        normalization: this.descriptor,
      })),
    };
  },
};

function clock(start = "2026-07-29T08:00:00.000Z") {
  let current = Date.parse(start);
  return () => {
    const result = new Date(current);
    current += 1_000;
    return result;
  };
}

function record(sourceRecordId, value) {
  return {
    sourceRecordId,
    rawReference: {
      source: "https://source.example/data",
      locator: sourceRecordId,
    },
    rawPayload: { value },
  };
}

function snapshot(records, coverage = {
  mode: "full_snapshot",
  completeness: "complete",
}) {
  return {
    sourceObservedAt: "2026-07-29T07:00:00.000Z",
    nextCheckpoint: `checkpoint-${records.length}`,
    rawReference: {
      source: "https://source.example/data",
      locator: "snapshot",
    },
    coverage,
    records,
  };
}

function sequenceAdapter(snapshots) {
  let index = 0;
  return {
    async getAuthorizationStatus() {
      return "not_required";
    },
    async fetchRaw() {
      const selected = snapshots[Math.min(index, snapshots.length - 1)];
      index += 1;
      if (selected instanceof Error) throw selected;
      return selected;
    },
  };
}

async function run(adapter, store, now, trigger = "manual") {
  return syncConnector(definition, adapter, normalizer, store, {
    trigger,
    now,
    sleep: async () => {},
  });
}

test("a second identical sync is order-independent and creates no duplicate changes", async () => {
  const store = new MemoryConnectorStateStore();
  const now = clock();
  const adapter = sequenceAdapter([
    snapshot([record("a", "one"), record("b", "two")]),
    snapshot([record("b", "two"), record("a", "one")]),
  ]);

  const first = await run(adapter, store, now);
  const second = await run(adapter, store, now, "scheduled");

  assert.deepEqual(first.syncHistory.at(-1).counts, {
    fetched: 2, new: 2, changed: 0, removed: 0, unchanged: 0,
  });
  assert.deepEqual(second.syncHistory.at(-1).counts, {
    fetched: 2, new: 0, changed: 0, removed: 0, unchanged: 2,
  });
  assert.equal(second.recordChanges.length, 2);
  assert.equal(second.healthStatus, "healthy");
});

test("snapshot diff distinguishes new, changed and removed source records", async () => {
  const store = new MemoryConnectorStateStore();
  const now = clock();
  const adapter = sequenceAdapter([
    snapshot([record("a", "one"), record("b", "two")]),
    snapshot([record("a", "changed"), record("c", "three")]),
  ]);

  await run(adapter, store, now);
  const state = await run(adapter, store, now, "scheduled");

  assert.deepEqual(state.syncHistory.at(-1).counts, {
    fetched: 2, new: 1, changed: 1, removed: 1, unchanged: 0,
  });
  assert.deepEqual(
    state.recordChanges.slice(-3).map((item) => item.changeType).sort(),
    ["changed", "new", "removed"],
  );
  assert.ok(state.recordChanges.every(
    (item) => item.translationStatus === "untranslated",
  ));
});

test("a record that returns after removal creates a new lineage event", async () => {
  const store = new MemoryConnectorStateStore();
  const now = clock();
  const adapter = sequenceAdapter([
    snapshot([record("a", "one")]),
    snapshot([]),
    snapshot([record("a", "one")]),
  ]);

  await run(adapter, store, now);
  await run(adapter, store, now);
  const returned = await run(adapter, store, now);
  const lifecycle = returned.recordChanges.filter(
    (item) => item.sourceRecordId === "a",
  );

  assert.deepEqual(lifecycle.map((item) => item.changeType), [
    "new",
    "removed",
    "new",
  ]);
  assert.equal(lifecycle[2].previousChangeId, lifecycle[1].changeId);
  assert.notEqual(lifecycle[0].changeId, lifecycle[2].changeId);
});

test("an incomplete snapshot cannot turn absence into removal", async () => {
  const store = new MemoryConnectorStateStore();
  const now = clock();
  const adapter = sequenceAdapter([
    snapshot([record("a", "one"), record("b", "two")]),
    snapshot(
      [record("a", "one")],
      { mode: "full_snapshot", completeness: "partial" },
    ),
  ]);

  const succeeded = await run(adapter, store, now);
  const failed = await run(adapter, store, now, "scheduled");

  assert.equal(failed.healthStatus, "degraded");
  assert.equal(failed.errorStatus.category, "incomplete_source_data");
  assert.equal(failed.errorStatus.code, "UNSUPPORTED_OR_INCOMPLETE_COVERAGE");
  assert.deepEqual(failed.records, succeeded.records);
  assert.equal(failed.recordChanges.length, succeeded.recordChanges.length);
});

test("a temporary source failure retries and can recover", async () => {
  const store = new MemoryConnectorStateStore();
  let attempts = 0;
  const delays = [];
  const adapter = {
    async getAuthorizationStatus() {
      return "not_required";
    },
    async fetchRaw() {
      attempts += 1;
      if (attempts < 3) {
        throw new ConnectorSourceError({
          category: "source_unavailable",
          code: "HTTP_503",
          message: "Temporarily unavailable.",
          retryable: true,
        });
      }
      return snapshot([record("a", "one")]);
    },
  };
  const state = await syncConnector(
    definition,
    adapter,
    normalizer,
    store,
    {
      trigger: "manual",
      now: clock(),
      sleep: async (milliseconds) => delays.push(milliseconds),
    },
  );

  assert.equal(state.healthStatus, "healthy");
  assert.equal(state.syncHistory.at(-1).attemptCount, 3);
  assert.deepEqual(delays, [1, 2]);
});

test("an unavailable authorization is visible and does not read the source", async () => {
  const store = new MemoryConnectorStateStore();
  let fetched = false;
  const adapter = {
    async getAuthorizationStatus() {
      return "not_configured";
    },
    async fetchRaw() {
      fetched = true;
      return snapshot([]);
    },
  };
  const protectedDefinition = {
    ...definition,
    connectorId: "protected-source",
    authorizationMode: "service_account",
  };
  const state = await syncConnector(
    protectedDefinition,
    adapter,
    normalizer,
    store,
    { trigger: "manual", now: clock() },
  );

  assert.equal(fetched, false);
  assert.equal(state.healthStatus, "authorization_required");
  assert.equal(state.errorStatus.category, "authorization");
});

test("a failed refresh preserves the last successful source state", async () => {
  const store = new MemoryConnectorStateStore();
  const adapter = sequenceAdapter([
    snapshot([record("a", "one")]),
    new ConnectorSourceError({
      code: "HTTP_503",
      message: "Temporarily unavailable.",
      retryable: true,
    }),
  ]);
  const now = clock();
  const succeeded = await run(adapter, store, now);
  const failed = await run(adapter, store, now);

  assert.equal(failed.healthStatus, "degraded");
  assert.equal(failed.lastSyncSucceededAt, succeeded.lastSyncSucceededAt);
  assert.equal(failed.records.length, 1);
  assert.equal(failed.errorStatus.code, "HTTP_503");
});

test("an active run is persisted before source I/O and cleared on success", async () => {
  const saves = [];
  let stored = null;
  const store = {
    async load() {
      return stored;
    },
    async save(_definition, state) {
      stored = structuredClone(state);
      saves.push(structuredClone(state));
    },
  };

  const state = await run(
    sequenceAdapter([snapshot([record("a", "one")])]),
    store,
    clock(),
  );

  assert.ok(saves.some((saved) => saved.activeRun?.syncRunId));
  assert.equal(state.activeRun, undefined);
});

test("a previous unterminated run remains visible in synchronization history", async () => {
  const store = new MemoryConnectorStateStore();
  const adapter = sequenceAdapter([snapshot([record("a", "one")])]);
  const first = await run(adapter, store, clock());
  await store.save(definition, {
    ...first,
    activeRun: {
      syncRunId: "interrupted-run",
      trigger: "scheduled",
      startedAt: "2026-07-29T09:00:00.000Z",
      checkpointBefore: first.checkpoint,
    },
  });

  const recovered = await run(adapter, store, clock("2026-07-29T10:00:00.000Z"));
  const interrupted = recovered.syncHistory.find(
    (item) => item.syncRunId === "interrupted-run",
  );
  assert.equal(interrupted?.error?.code, "PREVIOUS_SYNC_INTERRUPTED");
});

test("translation is idempotent per version and changes identity when translator changes", async () => {
  const store = new MemoryConnectorStateStore();
  const state = await run(
    sequenceAdapter([snapshot([record("a", "one")])]),
    store,
    clock(),
  );
  const translator = {
    descriptor: {
      translatorId: "test-observation",
      translatorVersion: "1.0.0",
      inputSchemaVersion: "test-record@1",
      outputSchemaVersion: "atlas-observation@1",
    },
    async translate(change) {
      return [{
        observationType: "source-change",
        statement: `${change.sourceRecordId} is ${change.changeType}`,
        evidenceStatus: "source_reported",
      }];
    },
  };

  const first = await translateConnectorChanges(
    translator,
    state.recordChanges,
    "2026-07-29T11:00:00.000Z",
  );
  const repeated = await translateConnectorChanges(
    translator,
    state.recordChanges,
    "2026-07-29T12:00:00.000Z",
  );
  const revised = await translateConnectorChanges(
    {
      ...translator,
      descriptor: {
        ...translator.descriptor,
        translatorVersion: "2.0.0",
      },
    },
    state.recordChanges,
    "2026-07-29T12:00:00.000Z",
  );

  assert.equal(first[0].observationId, repeated[0].observationId);
  assert.notEqual(first[0].observationId, revised[0].observationId);
  assert.equal(first[0].sourceChangeId, state.recordChanges[0].changeId);
});

test("state from another context is rejected before synchronization", async () => {
  const foreignState = {
    version: 1,
    connectorId: definition.connectorId,
    connectorType: definition.connectorType,
    contextId: "case:other",
    authorizationStatus: "not_required",
    healthStatus: "never_synced",
    sourceFreshness: {
      status: "unknown",
      evaluatedAt: "2026-07-29T08:00:00.000Z",
      thresholdHours: 36,
    },
    records: [],
    recordChanges: [],
    syncHistory: [],
  };
  const store = {
    async load() {
      return foreignState;
    },
    async save() {},
  };

  await assert.rejects(
    syncConnector(
      definition,
      sequenceAdapter([snapshot([])]),
      normalizer,
      store,
      { trigger: "manual", now: clock() },
    ),
    /context boundary/,
  );
});

test("fleet health can be aggregated without connector-specific exceptions", async () => {
  const store = new MemoryConnectorStateStore();
  const healthy = await run(
    sequenceAdapter([snapshot([record("a", "one")])]),
    store,
    clock(),
  );
  const summary = summarizeConnectorHealth([healthy]);

  assert.equal(summary.total, 1);
  assert.equal(summary.byHealth.healthy, 1);
  assert.equal(summary.byFreshness.fresh, 1);
});

test("the file store replaces state without an observable delete gap", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "atlas-connector-"));
  try {
    const store = new FileConnectorStateStore(directory);
    const adapter = sequenceAdapter([
      snapshot([record("a", "one")]),
      snapshot([record("a", "two")]),
    ]);
    await run(adapter, store, clock());
    const updated = await run(adapter, store, clock("2026-07-29T09:00:00.000Z"));
    const loaded = await store.load(definition);

    assert.equal(loaded.records[0].normalizedContentHash, updated.records[0].normalizedContentHash);
    assert.equal(loaded.syncHistory.length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the sitemap adapter separates raw retrieval from normalization", async () => {
  const xml = `<?xml version="1.0"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://webuildanddesign.nl/</loc></url>
      <url><loc>https://webuildanddesign.nl/contact</loc></url>
    </urlset>`;
  const successful = createWbdSitemapConnector({
    fetcher: async () => new Response(xml, {
      status: 200,
      headers: { "content-type": "application/xml" },
    }),
  });
  const rawBatch = await successful.adapter.fetchRaw({});
  const normalizedBatch = await successful.normalizer.normalize(rawBatch);
  assert.equal(rawBatch.records.length, 2);
  assert.equal(normalizedBatch.records.length, 2);
  assert.equal(normalizedBatch.coverage.completeness, "complete");
  assert.match(rawBatch.nextCheckpoint, /^sha256:/);

  const invalid = createWbdSitemapConnector({
    fetcher: async () => new Response("<html></html>", { status: 200 }),
  });
  await assert.rejects(
    invalid.adapter.fetchRaw({}),
    (error) => error.code === "INVALID_SITEMAP" && error.retryable === false,
  );
});
