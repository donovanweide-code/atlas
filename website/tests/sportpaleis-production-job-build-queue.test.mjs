import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { Worker } from "node:worker_threads";

import { buildProductionJobSnapshotIsolated, PRODUCTION_BUILD_ISOLATION_KIND, productionJobBuildLoad, recycleProductionJobBuildIsolation, warmProductionJobBuildIsolation } from "../src/sportpaleis/production-job-build.mjs";

const expectedLoad = (values) => ({ ...values, isolationKind: PRODUCTION_BUILD_ISOLATION_KIND, workerPriority: null, childLifetime: { generations: 0, buildCount: 0, maxStartupMs: 0, maxRssBytes: 0, maxOutputBytes: 0, cpuUserMicros: 0, cpuSystemMicros: 0 }, child: null });

test("vertraagde workercrash draineert een reeds wachtende productieopbouw exact eenmaal", async () => {
  const crashing = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-crash-regression",
    workerFactory: () => new Worker("setTimeout(() => process.exit(23), 50)", { eval: true }),
  });
  const recovered = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-crash-queued-recovery-regression",
    workerFactory: () => new Worker("const { parentPort } = require('node:worker_threads'); parentPort.postMessage({ ok: true, snapshot: { recovered: true } });", { eval: true }),
  });
  assert.deepEqual(productionJobBuildLoad(), expectedLoad({ active: 1, queued: 1, inFlight: 2, maximumConcurrent: 1, maximumQueued: 4 }));
  const outcomes = await Promise.allSettled([crashing, recovered]);
  assert.equal(outcomes[0].status, "rejected");
  assert.equal(outcomes[0].reason?.code, "PRODUCTION_JOB_BUILD_FAILED");
  assert.equal(outcomes[0].reason?.statusCode, 503);
  assert.deepEqual(outcomes[1], { status: "fulfilled", value: { recovered: true } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), expectedLoad({ active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 }));
});

test("workerexit zonder resultaat faalt direct ook bij exitcode nul", async () => {
  const started = performance.now();
  await assert.rejects(
    buildProductionJobSnapshotIsolated({}, {
      operationIdentity: "worker-zero-exit-regression",
      timeoutMs: 5_000,
      workerFactory: () => new Worker("process.exit(0)", { eval: true }),
    }),
    (error) => error?.code === "PRODUCTION_JOB_BUILD_NO_RESULT" && error?.statusCode === 503,
  );
  assert.ok(performance.now() - started < 2_000, "exitcode nul wachtte ten onrechte op de volledige timeout");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), expectedLoad({ active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 }));
});

test("timeout wacht op workerterminatie vóór de volgende queued build start", async () => {
  const timedOut = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-timeout-regression",
    timeoutMs: 1_000,
    workerFactory: () => new Worker("setInterval(() => {}, 1000)", { eval: true }),
  });
  const queued = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-after-timeout-regression",
    workerFactory: () => new Worker("const { parentPort } = require('node:worker_threads'); parentPort.postMessage({ ok: true, snapshot: { afterTimeout: true } });", { eval: true }),
  });
  const outcomes = await Promise.allSettled([timedOut, queued]);
  assert.equal(outcomes[0].status, "rejected");
  assert.equal(outcomes[0].reason?.code, "PRODUCTION_JOB_BUILD_TIMEOUT");
  assert.deepEqual(outcomes[1], { status: "fulfilled", value: { afterTimeout: true } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), expectedLoad({ active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 }));
});

test("persistent child-readiness is begrensd en laat na startup-timeout geen procesbinding achter", async () => {
  await recycleProductionJobBuildIsolation();
  class NeverReadyChild extends EventEmitter {
    pid = 42_424;
    connected = true;
    exitCode = null;
    signalCode = null;
    channel = { ref() {}, unref() {} };
    ref() {}
    unref() {}
    disconnect() { this.connected = false; }
    kill() { this.exitCode = 0; queueMicrotask(() => this.emit("exit", 0)); return true; }
  }
  await assert.rejects(
    warmProductionJobBuildIsolation({ startupTimeoutMs: 150, childFactory: () => new NeverReadyChild() }),
    (error) => error?.code === "PRODUCTION_JOB_BUILD_STARTUP_TIMEOUT" && error?.statusCode === 503,
  );
  assert.equal(productionJobBuildLoad().child, null);
});

test("persistent child-timeout termineert vóór een queued retry op een nieuwe generatie", async () => {
  await recycleProductionJobBuildIsolation();
  process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED = "1";
  await warmProductionJobBuildIsolation();
  const firstGeneration = productionJobBuildLoad().child?.generation;
  const hanging = buildProductionJobSnapshotIsolated({ assuranceFault: "HANG_BEFORE_BUILD" }, {
    operationIdentity: "persistent-child-timeout-regression",
    timeoutMs: 1_000,
  });
  const queuedRetry = buildProductionJobSnapshotIsolated({ assuranceFault: "FAST_FAILURE" }, {
    operationIdentity: "persistent-child-after-timeout-regression",
  });
  const outcomes = await Promise.allSettled([hanging, queuedRetry]);
  delete process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED;
  assert.equal(outcomes[0].status, "rejected");
  assert.equal(outcomes[0].reason?.code, "PRODUCTION_JOB_BUILD_TIMEOUT");
  assert.equal(outcomes[1].status, "rejected");
  assert.equal(outcomes[1].reason?.code, "ASSURANCE_FAST_FAILURE");
  assert.ok(Number(productionJobBuildLoad().child?.generation) > Number(firstGeneration));
  await recycleProductionJobBuildIsolation();
  assert.equal(productionJobBuildLoad().child, null);
});

test("persistent child weigert een resultaat boven de versioned IPC-grens", async () => {
  await recycleProductionJobBuildIsolation();
  process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED = "1";
  await warmProductionJobBuildIsolation();
  delete process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED;
  await assert.rejects(
    buildProductionJobSnapshotIsolated({ assuranceFault: "OVERSIZED_OUTPUT" }, { operationIdentity: "persistent-child-output-bound-regression" }),
    (error) => error?.code === "PRODUCTION_JOB_BUILD_OUTPUT_TOO_LARGE" && error?.statusCode === 413,
  );
  await recycleProductionJobBuildIsolation();
  assert.equal(productionJobBuildLoad().child, null);
});
