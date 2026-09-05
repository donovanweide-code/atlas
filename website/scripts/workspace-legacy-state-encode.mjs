import { Worker } from "node:worker_threads";

const DEFAULT_TIMEOUT_MS = 30_000;

function encodingError(details) {
  return Object.assign(new Error(details?.message ?? "De legacy rollbackstate kon niet worden gematerialiseerd."), {
    name: details?.name ?? "Error",
    code: details?.code ?? "LEGACY_ROLLBACK_ENCODING_FAILED",
  });
}

// Rollback materialization is an offline releasebroker operation, but it still
// must not freeze the application's event loop while a 20+ MB compatibility
// snapshot is hashed, serialized and compressed.
export function encodeLegacyRollbackStateIsolated(snapshot, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
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
      worker = new Worker(new URL("./workspace-legacy-state-encode-worker.mjs", import.meta.url), {
        workerData: { snapshot },
        resourceLimits: { maxOldGenerationSizeMb: 768, maxYoungGenerationSizeMb: 128, stackSizeMb: 8 },
      });
    } catch (cause) {
      finish(reject, encodingError({ message: cause?.message, code: cause?.code }));
      return;
    }
    timer = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      finish(reject, encodingError({ message: "De begrensde rollbackmaterialisatie duurde te lang.", code: "LEGACY_ROLLBACK_ENCODING_TIMEOUT" }));
    }, Math.max(1_000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
    timer.unref?.();
    worker.once("message", (message) => {
      worker.terminate().catch(() => undefined);
      if (message?.ok) finish(resolve, message.result);
      else finish(reject, encodingError(message?.error));
    });
    worker.once("error", (error) => finish(reject, encodingError({ message: error?.message, code: error?.code })));
    worker.once("exit", (code) => {
      if (code !== 0) finish(reject, encodingError({ message: "De geïsoleerde rollbackmaterialisatie stopte onverwacht.", code: "LEGACY_ROLLBACK_ENCODING_FAILED" }));
    });
  });
}
