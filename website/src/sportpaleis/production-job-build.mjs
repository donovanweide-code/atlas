import { Worker } from "node:worker_threads";

const DEFAULT_BUILD_TIMEOUT_MS = 30_000;
const DEFAULT_QUEUE_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT_BUILDS = 1;
const MAX_QUEUED_BUILDS = 4;
export const MAX_DIRECT_PRODUCTION_WORKER_INPUT_BYTES = 1_000_000;
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

/**
 * A validated direct free-print order already owns its immutable production
 * lines. Geometry generation therefore needs only the exact sources referenced
 * by those lines, never the complete Library/catalog projection. Other order
 * shapes deliberately retain the prior full-state boundary until their
 * reachability contract is equally explicit.
 */
export function projectProductionJobBuildInput(input) {
  const state = input?.state;
  const orders = Array.isArray(input?.orders) ? input.orders : [];
  const requestedRefs = Array.isArray(input?.productionGroup?.lineRefs) ? input.productionGroup.lineRefs : [];
  const directFreeOrders = orders.length > 0 && orders.every((order) => order?.orderKind === "CUSTOM"
    && Array.isArray(order.productionLines) && order.productionLines.length > 0
    && Array.isArray(order.items) && order.items.length > 0
    && order.items.every((item) => item?.sourceType === "CUSTOM" && item.association === "Vrije bedrukking" && item.productionProfileId == null));
  const linesByKey = new Map(orders.flatMap((order) => (order.productionLines ?? []).map((line) => [`${order.id}|${line.id}`, line])));
  const selectedOrderLines = requestedRefs.length
    ? requestedRefs.map(({ orderId, lineId }) => linesByKey.get(`${orderId}|${lineId}`)).filter(Boolean)
    : [...linesByKey.values()];
  const supplements = Array.isArray(input?.productionGroup?.supplements) ? input.productionGroup.supplements : [];
  const selectedLines = [...selectedOrderLines, ...supplements];
  const exactSelection = selectedOrderLines.length > 0 && (!requestedRefs.length || selectedOrderLines.length === requestedRefs.length);
  const independentlyBound = selectedLines.every((line) => !line.personalizationField
    && ["PRODUCTION_SOURCE", "FONT", "PRODUCTION_ELEMENT"].includes(line.source?.kind)
    && line.validation?.status === "VALID");
  if (!state || !directFreeOrders || !exactSelection || !independentlyBound) {
    return { ...input, projection: { kind: "FULL_STATE_SAFETY_FALLBACK_V1" } };
  }

  const fontIds = new Set(selectedLines.filter(({ source }) => source?.kind === "FONT").map(({ source }) => source.id));
  const elementIds = new Set(selectedLines.filter(({ source }) => source?.kind === "PRODUCTION_ELEMENT").map(({ source }) => source.id));
  const productionElements = (state.productionElements ?? []).filter(({ id }) => elementIds.has(id));
  const projectedState = {
    organizationId: state.organizationId,
    settings: { productionDefaults: state.settings?.productionDefaults },
    associations: [],
    articles: [],
    productionProfiles: [],
    productionFonts: (state.productionFonts ?? []).filter(({ id }) => fontIds.has(id)),
    productionElements,
    // Direct free-print geometry is fully admitted and embedded in the selected
    // production element. Original intake documents remain immutable evidence
    // in their own domain and are not worker input.
    productionAssetSources: [],
    foilRolls: [],
  };
  return {
    ...input,
    state: projectedState,
    projection: {
      kind: "DIRECT_FREE_PRODUCTION_REACHABILITY_V1",
      lineCount: selectedLines.length,
      supplementCount: supplements.length,
      fontCount: projectedState.productionFonts.length,
      elementCount: productionElements.length,
      sourceCount: projectedState.productionAssetSources.length,
    },
  };
}

function drainBuildQueue() {
  while (activeBuilds < MAX_CONCURRENT_BUILDS && buildQueue.length) {
    const task = buildQueue.shift();
    activeBuilds += 1;
    task.start();
  }
}

function defaultWorkerFactory(input) {
  return new Worker(new URL("./production-job-build-worker.mjs", import.meta.url), {
    workerData: input,
    resourceLimits: { maxOldGenerationSizeMb: 768, maxYoungGenerationSizeMb: 128, stackSizeMb: 8 },
  });
}

function runBuildWorker(input, timeoutMs, workerFactory) {
  return new Promise((resolve, reject) => {
    let worker;
    let timer;
    let settled = false;
    let terminationError;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    try {
      worker = workerFactory(input);
    } catch (cause) {
      finish(reject, buildError({
        message: "De geïsoleerde productieopbouw kon niet starten; er is niets geregistreerd.",
        code: cause?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_JOB_BUILD_RESOURCE_LIMIT" : "PRODUCTION_JOB_BUILD_FAILED",
        statusCode: 503,
      }));
      return;
    }
    timer = setTimeout(() => {
      terminationError = buildError({
        message: "De productieopbouw duurde te lang en is veilig gestopt; er is niets geregistreerd.",
        code: "PRODUCTION_JOB_BUILD_TIMEOUT",
        statusCode: 503,
      });
      worker.terminate().catch(() => finish(reject, terminationError));
    }, Math.max(1_000, Number(timeoutMs) || DEFAULT_BUILD_TIMEOUT_MS));
    timer.unref?.();
    worker.once("message", (message) => {
      worker.terminate().catch(() => undefined);
      if (message?.ok) finish(resolve, message.snapshot);
      else finish(reject, buildError(message?.error));
    });
    worker.once("error", (error) => finish(reject, terminationError ?? buildError({
      message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.",
      code: error?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_JOB_BUILD_RESOURCE_LIMIT" : "PRODUCTION_JOB_BUILD_FAILED",
      statusCode: 503,
    })));
    worker.once("exit", (code) => {
      finish(reject, terminationError ?? buildError({
        message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.",
        code: code === 0 ? "PRODUCTION_JOB_BUILD_NO_RESULT" : "PRODUCTION_JOB_BUILD_FAILED",
        statusCode: 503,
      }));
    });
  });
}

export function buildProductionJobSnapshotIsolated(input, {
  operationIdentity,
  timeoutMs = DEFAULT_BUILD_TIMEOUT_MS,
  queueTimeoutMs = DEFAULT_QUEUE_TIMEOUT_MS,
  workerFactory = defaultWorkerFactory,
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
      runBuildWorker(input, timeoutMs, workerFactory).then(resolve, reject).finally(() => {
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
