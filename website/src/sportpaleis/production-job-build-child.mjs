import { getPriority } from "node:os";

let buildCount = 0;
let buildModulePromise;

async function productionBuilder() {
  buildModulePromise ??= import("../../scripts/sportpaleis-pilot-foundation.mjs");
  return (await buildModulePromise).buildProductionJobSnapshot;
}

function resources(cpuStart = process.cpuUsage()) {
  const cpu = process.cpuUsage(cpuStart);
  return {
    buildCount,
    rssBytes: process.memoryUsage().rss,
    maxRssBytes: process.resourceUsage().maxRSS * 1024,
    cpuUserMicros: cpu.user,
    cpuSystemMicros: cpu.system,
  };
}

process.on("disconnect", () => process.exit(0));
process.on("message", async ({ type, requestId, input, maxOutputBytes, assuranceFaultsEnabled = false } = {}) => {
  if (type !== "build" || !requestId) return;
  // The persistent child may predate an assurance phase. The trusted parent
  // therefore carries the per-request test switch over IPC; business input
  // alone can never activate a fault.
  const allowAssuranceFault = assuranceFaultsEnabled === true;
  if (allowAssuranceFault && input.assuranceFault === "HANG_BEFORE_BUILD") return;
  const cpuStart = process.cpuUsage();
  try {
    if (allowAssuranceFault && input.assuranceFault === "FAST_FAILURE") throw Object.assign(new Error("assurance fast failure"), { code: "ASSURANCE_FAST_FAILURE", statusCode: 409 });
    const snapshot = allowAssuranceFault && input.assuranceFault === "OVERSIZED_OUTPUT"
      ? { artifactPayload: "x".repeat(Number(maxOutputBytes) + 1) }
      : (await productionBuilder())(
        input.state,
        input.orders,
        input.jobNumber,
        input.createdAt,
        input.artifactRoot,
        input.runtimeArtifactRoot,
        input.productionGroup,
        input.options,
      );
    const outputBytes = Buffer.byteLength(JSON.stringify(snapshot));
    if (outputBytes > Number(maxOutputBytes)) throw Object.assign(new Error("De productieopbouw overschrijdt de begrensde resultaatgrootte."), { code: "PRODUCTION_JOB_BUILD_OUTPUT_TOO_LARGE", statusCode: 413 });
    buildCount += 1;
    if (allowAssuranceFault && input.assuranceFault === "EXIT_AFTER_BUILD_BEFORE_MESSAGE") {
      process.send?.({ type: "telemetry", requestId, resources: { ...resources(cpuStart), outputBytes } }, () => process.exit(23));
      return;
    }
    process.send?.({ type: "result", requestId, ok: true, snapshot, resources: { ...resources(cpuStart), outputBytes } });
  } catch (error) {
    buildCount += 1;
    process.send?.({ type: "result", requestId, ok: false, error: { name: error?.name ?? "Error", message: error?.message ?? "Het productieartifact kon niet veilig worden opgebouwd.", code: error?.code ?? "PRODUCTION_JOB_BUILD_FAILED", statusCode: Number(error?.statusCode ?? 409) }, resources: resources(cpuStart) });
  }
});

if (!(process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED === "1" && process.env.SPORTPALEIS_ASSURANCE_CHILD_FAULT === "NEVER_READY")) {
  process.send?.({ type: "ready", priority: getPriority(), ...resources() });
}
