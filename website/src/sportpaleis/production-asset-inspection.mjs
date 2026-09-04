import { Worker } from "node:worker_threads";

const DEFAULT_TIMEOUT_MS = 10_000;

function inspectionError(details) {
  return Object.assign(new Error(details?.message ?? "Productiebron kon niet veilig worden gecontroleerd."), {
    name: details?.name ?? "Error",
    code: details?.code ?? "PRODUCTION_ASSET_INSPECTION_FAILED",
    statusCode: Number(details?.statusCode ?? 400),
  });
}

export function inspectProductionAssetSourceIsolated(input, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./production-asset-inspection-worker.mjs", import.meta.url), {
      workerData: { ...input, bytes: Buffer.from(input.bytes) },
      resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
    });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
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
