import { Worker } from "node:worker_threads";

const DEFAULT_BUILD_TIMEOUT_MS = 30_000;
const DEFAULT_QUEUE_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT_BUILDS = 1;
const MAX_QUEUED_BUILDS = 4;
const buildQueue = [];
const inFlightBuilds = new Map();
let activeBuilds = 0;

function buildError(details) {
  return Object.assign(new Error(details?.message ?? "Het productieartifact kon niet veilig worden opgebouwd."), {
    name: details?.name ?? "Error",
    code: details?.code ?? "PRODUCTION_JOB_BUILD_FAILED",
    statusCode: Number(details?.statusCode ?? 409),
  });
}

export function productionJobBuildLoad() {
  return Object.freeze({
    active: activeBuilds,
    queued: buildQueue.length,
    inFlight: inFlightBuilds.size,
    maximumConcurrent: MAX_CONCURRENT_BUILDS,
    maximumQueued: MAX_QUEUED_BUILDS,
  });
}

function drainBuildQueue() {
  while (activeBuilds < MAX_CONCURRENT_BUILDS && buildQueue.length) {
    const task = buildQueue.shift();
    activeBuilds += 1;
    task.start();
  }
}

function runBuildWorker(input, timeoutMs) {
  return new Promise((resolve, reject) => {
    let worker;
    let timer;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    try {
      worker = new Worker(new URL("./production-job-build-worker.mjs", import.meta.url), {
        workerData: input,
        resourceLimits: { maxOldGenerationSizeMb: 768, maxYoungGenerationSizeMb: 128, stackSizeMb: 8 },
      });
    } catch (cause) {
      finish(reject, buildError({
        message: "De geïsoleerde productieopbouw kon niet starten; er is niets geregistreerd.",
        code: cause?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_JOB_BUILD_RESOURCE_LIMIT" : "PRODUCTION_JOB_BUILD_FAILED",
        statusCode: 503,
      }));
      return;
    }
    timer = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      finish(reject, buildError({
        message: "De productieopbouw duurde te lang en is veilig gestopt; er is niets geregistreerd.",
        code: "PRODUCTION_JOB_BUILD_TIMEOUT",
        statusCode: 503,
      }));
    }, Math.max(1_000, Number(timeoutMs) || DEFAULT_BUILD_TIMEOUT_MS));
    timer.unref?.();
    worker.once("message", (message) => {
      worker.terminate().catch(() => undefined);
      if (message?.ok) finish(resolve, message.snapshot);
      else finish(reject, buildError(message?.error));
    });
    worker.once("error", (error) => finish(reject, buildError({
      message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.",
      code: error?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_JOB_BUILD_RESOURCE_LIMIT" : "PRODUCTION_JOB_BUILD_FAILED",
      statusCode: 503,
    })));
    worker.once("exit", (code) => {
      if (code !== 0) finish(reject, buildError({
        message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.",
        code: "PRODUCTION_JOB_BUILD_FAILED",
        statusCode: 503,
      }));
    });
  });
}

export function buildProductionJobSnapshotIsolated(input, {
  operationIdentity,
  timeoutMs = DEFAULT_BUILD_TIMEOUT_MS,
  queueTimeoutMs = DEFAULT_QUEUE_TIMEOUT_MS,
} = {}) {
  const identity = String(operationIdentity ?? "").trim();
  if (!identity) return Promise.reject(buildError({ message: "Productieopbouw mist een idempotente operation identity.", code: "PRODUCTION_JOB_BUILD_IDENTITY_REQUIRED", statusCode: 400 }));
  if (inFlightBuilds.has(identity)) return inFlightBuilds.get(identity);
  if (activeBuilds >= MAX_CONCURRENT_BUILDS && buildQueue.length >= MAX_QUEUED_BUILDS) {
    return Promise.reject(buildError({
      message: "De begrensde productieopbouwwachtrij is vol. Probeer dezelfde opdracht veilig opnieuw.",
      code: "PRODUCTION_JOB_BUILD_BUSY",
      statusCode: 503,
    }));
  }
  const promise = new Promise((resolve, reject) => {
    let queueTimer;
    const start = () => {
      clearTimeout(queueTimer);
      runBuildWorker(input, timeoutMs).then(resolve, reject).finally(() => {
        activeBuilds -= 1;
        inFlightBuilds.delete(identity);
        drainBuildQueue();
      });
    };
    const task = { start };
    buildQueue.push(task);
    queueTimer = setTimeout(() => {
      const index = buildQueue.indexOf(task);
      if (index < 0) return;
      buildQueue.splice(index, 1);
      inFlightBuilds.delete(identity);
      reject(buildError({
        message: "De begrensde wachtrij voor productieopbouw duurde te lang. Probeer dezelfde opdracht veilig opnieuw.",
        code: "PRODUCTION_JOB_BUILD_QUEUE_TIMEOUT",
        statusCode: 503,
      }));
    }, Math.max(1_000, Number(queueTimeoutMs) || DEFAULT_QUEUE_TIMEOUT_MS));
    queueTimer.unref?.();
    drainBuildQueue();
  });
  inFlightBuilds.set(identity, promise);
  return promise;
}
