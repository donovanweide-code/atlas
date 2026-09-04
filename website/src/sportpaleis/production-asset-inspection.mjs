import { Worker } from "node:worker_threads";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_INSPECTIONS = 2;
const MAX_QUEUED_INSPECTIONS = 8;
const inspectionQueue = [];
let activeInspections = 0;

function inspectionError(details) {
  return Object.assign(new Error(details?.message ?? "Productiebron kon niet veilig worden gecontroleerd."), {
    name: details?.name ?? "Error",
    code: details?.code ?? "PRODUCTION_ASSET_INSPECTION_FAILED",
    statusCode: Number(details?.statusCode ?? 400),
  });
}

export function productionAssetInspectionLoad() {
  return Object.freeze({
    active: activeInspections,
    queued: inspectionQueue.length,
    maximumConcurrent: MAX_CONCURRENT_INSPECTIONS,
    maximumQueued: MAX_QUEUED_INSPECTIONS,
  });
}

function drainInspectionQueue() {
  while (activeInspections < MAX_CONCURRENT_INSPECTIONS && inspectionQueue.length) {
    const task = inspectionQueue.shift();
    activeInspections += 1;
    task.start();
  }
}

function runInspectionWorker(input, timeoutMs) {
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
      worker = new Worker(new URL("./production-asset-inspection-worker.mjs", import.meta.url), {
        workerData: { ...input, bytes: Buffer.from(input.bytes) },
        resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
      });
    } catch (cause) {
      finish(reject, inspectionError({
        message: "De geïsoleerde SVG-controle kon niet veilig starten. Het bestand is niet opgeslagen.",
        code: cause?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_ASSET_INSPECTION_RESOURCE_LIMIT" : "PRODUCTION_ASSET_INSPECTION_FAILED",
        statusCode: 422,
      }));
      return;
    }
    timer = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      finish(reject, inspectionError({
        message: "De SVG-controle duurde te lang en is veilig gestopt. Het bestand is niet opgeslagen.",
        code: "PRODUCTION_ASSET_INSPECTION_TIMEOUT",
        statusCode: 422,
      }));
    }, Math.max(250, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
    timer.unref?.();
    worker.once("message", (message) => {
      worker.terminate().catch(() => undefined);
      if (message?.ok) finish(resolve, message.result);
      else finish(reject, inspectionError(message?.error));
    });
    worker.once("error", (error) => finish(reject, inspectionError({
      message: "De geïsoleerde SVG-controle is veilig gestopt. Het bestand is niet opgeslagen.",
      code: error?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_ASSET_INSPECTION_RESOURCE_LIMIT" : "PRODUCTION_ASSET_INSPECTION_FAILED",
      statusCode: 422,
    })));
    worker.once("exit", (code) => {
      if (code !== 0) finish(reject, inspectionError({
        message: "De geïsoleerde SVG-controle is veilig gestopt. Het bestand is niet opgeslagen.",
        code: "PRODUCTION_ASSET_INSPECTION_FAILED",
        statusCode: 422,
      }));
    });
  });
}

export function inspectProductionAssetSourceIsolated(input, { timeoutMs = DEFAULT_TIMEOUT_MS, queueTimeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (activeInspections >= MAX_CONCURRENT_INSPECTIONS && inspectionQueue.length >= MAX_QUEUED_INSPECTIONS) {
    return Promise.reject(inspectionError({
      message: "Er worden al meerdere productiebronnen veilig gecontroleerd. Probeer dit bestand zo opnieuw.",
      code: "PRODUCTION_ASSET_INSPECTION_BUSY",
      statusCode: 503,
    }));
  }
  return new Promise((resolve, reject) => {
    let queueTimer;
    const start = () => {
      clearTimeout(queueTimer);
      runInspectionWorker(input, timeoutMs).then(resolve, reject).finally(() => {
        activeInspections -= 1;
        drainInspectionQueue();
      });
    };
    const task = { start };
    inspectionQueue.push(task);
    queueTimer = setTimeout(() => {
      const index = inspectionQueue.indexOf(task);
      if (index < 0) return;
      inspectionQueue.splice(index, 1);
      reject(inspectionError({
        message: "De wachtrij voor veilige SVG-controle duurde te lang. Het bestand is niet opgeslagen; probeer het opnieuw.",
        code: "PRODUCTION_ASSET_INSPECTION_QUEUE_TIMEOUT",
        statusCode: 503,
      }));
    }, Math.max(250, Number(queueTimeoutMs) || DEFAULT_TIMEOUT_MS));
    queueTimer.unref?.();
    drainInspectionQueue();
  });
}
