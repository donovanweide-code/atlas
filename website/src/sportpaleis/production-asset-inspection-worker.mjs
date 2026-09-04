import { parentPort, workerData } from "node:worker_threads";

import { inspectProductionAssetSource } from "./production-assets.mjs";

try {
  const result = await inspectProductionAssetSource({
    ...workerData,
    bytes: Buffer.from(workerData.bytes),
  });
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? "Productiebron kon niet veilig worden gecontroleerd.",
      code: error?.code ?? "PRODUCTION_ASSET_INSPECTION_FAILED",
      statusCode: Number(error?.statusCode ?? 400),
    },
  });
}
