import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";

import { buildProductionJobSnapshotIsolated, productionJobBuildLoad } from "../src/sportpaleis/production-job-build.mjs";

test("workercrash eindigt fail-closed en laat de begrensde productiebouwwachtrij direct herstelbaar", async () => {
  await assert.rejects(
    buildProductionJobSnapshotIsolated({}, {
      operationIdentity: "worker-crash-regression",
      workerFactory: () => new Worker("process.exit(23)", { eval: true }),
    }),
    (error) => error?.code === "PRODUCTION_JOB_BUILD_FAILED" && error?.statusCode === 503,
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 });

  const recovered = await buildProductionJobSnapshotIsolated({}, {
    operationIdentity: "worker-crash-recovery-regression",
    workerFactory: () => new Worker("const { parentPort } = require('node:worker_threads'); parentPort.postMessage({ ok: true, snapshot: { recovered: true } });", { eval: true }),
  });
  assert.deepEqual(recovered, { recovered: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 });
});
