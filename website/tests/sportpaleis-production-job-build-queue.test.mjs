import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";

import { buildProductionJobSnapshotIsolated, productionJobBuildLoad } from "../src/sportpaleis/production-job-build.mjs";

test("vertraagde workercrash draineert een reeds wachtende productieopbouw exact eenmaal", async () => {
  const crashing = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-crash-regression",
    workerFactory: () => new Worker("setTimeout(() => process.exit(23), 50)", { eval: true }),
  });
  const recovered = buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-crash-queued-recovery-regression",
    workerFactory: () => new Worker("const { parentPort } = require('node:worker_threads'); parentPort.postMessage({ ok: true, snapshot: { recovered: true } });", { eval: true }),
  });
  assert.deepEqual(productionJobBuildLoad(), { active: 1, queued: 1, inFlight: 2, maximumConcurrent: 1, maximumQueued: 4 });
  const outcomes = await Promise.allSettled([crashing, recovered]);
  assert.equal(outcomes[0].status, "rejected");
  assert.equal(outcomes[0].reason?.code, "PRODUCTION_JOB_BUILD_FAILED");
  assert.equal(outcomes[0].reason?.statusCode, 503);
  assert.deepEqual(outcomes[1], { status: "fulfilled", value: { recovered: true } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 });
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
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 });
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
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 });
});
