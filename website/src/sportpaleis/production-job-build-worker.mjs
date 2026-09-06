import { parentPort, workerData } from "node:worker_threads";

import { buildProductionJobSnapshot } from "../../scripts/sportpaleis-pilot-foundation.mjs";

try {
  const snapshot = buildProductionJobSnapshot(
    workerData.state,
    workerData.orders,
    workerData.jobNumber,
    workerData.createdAt,
    workerData.artifactRoot,
    workerData.runtimeArtifactRoot,
    workerData.productionGroup,
    workerData.options,
  );
  if (process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED === "1" && workerData.assuranceFault === "EXIT_AFTER_BUILD_BEFORE_MESSAGE") process.exit(23);
  parentPort.postMessage({ ok: true, snapshot });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? "Het productieartifact kon niet veilig worden opgebouwd.",
      code: error?.code ?? "PRODUCTION_JOB_BUILD_FAILED",
      statusCode: Number(error?.statusCode ?? 409),
    },
  });
}
