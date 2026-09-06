import { fork } from "node:child_process";
import { randomBytes } from "node:crypto";
import { constants as osConstants, getPriority, setPriority } from "node:os";
import { Worker } from "node:worker_threads";

const DEFAULT_BUILD_TIMEOUT_MS = 30_000;
const DEFAULT_QUEUE_TIMEOUT_MS = 30_000;
const MAX_CONCURRENT_BUILDS = 1;
const MAX_QUEUED_BUILDS = 4;
const DEFAULT_CHILD_STARTUP_TIMEOUT_MS = 20_000;
const CHILD_TERMINATION_TIMEOUT_MS = 5_000;
const CHILD_IDLE_TIMEOUT_MS = 30_000;
const CHILD_RSS_RECYCLE_BYTES = 536_870_912;
export const MAX_DIRECT_PRODUCTION_WORKER_INPUT_BYTES = 1_000_000;
export const MAX_PRODUCTION_WORKER_OUTPUT_BYTES = 8_000_000;
const buildQueue = [];
const inFlightBuilds = new Map();
let activeBuilds = 0;
let buildChildState = null;
let buildChildGeneration = 0;
let persistentBuildIsolationEnabled = false;
const buildChildLifetime = { retiredGenerations: 0, buildCount: 0, maxStartupMs: 0, maxRssBytes: 0, maxOutputBytes: 0, cpuUserMicros: 0, cpuSystemMicros: 0 };

export const PRODUCTION_BUILD_ISOLATION_KIND = "LOW_PRIORITY_PERSISTENT_CHILD_V1";

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
    isolationKind: PRODUCTION_BUILD_ISOLATION_KIND,
    workerPriority: buildChildState?.actualPriority ?? null,
    childLifetime: Object.freeze({
      generations: buildChildLifetime.retiredGenerations + (buildChildState ? 1 : 0),
      buildCount: buildChildLifetime.buildCount + Number(buildChildState?.buildCount ?? 0),
      maxStartupMs: Math.max(buildChildLifetime.maxStartupMs, Number(buildChildState?.startupMs ?? 0)),
      maxRssBytes: Math.max(buildChildLifetime.maxRssBytes, Number(buildChildState?.maxRssBytes ?? 0)),
      maxOutputBytes: Math.max(buildChildLifetime.maxOutputBytes, Number(buildChildState?.maxOutputBytes ?? 0)),
      cpuUserMicros: buildChildLifetime.cpuUserMicros + Number(buildChildState?.cpuUserMicros ?? 0),
      cpuSystemMicros: buildChildLifetime.cpuSystemMicros + Number(buildChildState?.cpuSystemMicros ?? 0),
    }),
    child: buildChildState ? Object.freeze({
      generation: buildChildState.generation,
      pid: buildChildState.child.pid,
      status: buildChildState.status,
      connected: buildChildState.child.connected,
      startupMs: buildChildState.startupMs,
      buildCount: buildChildState.buildCount,
      rssBytes: buildChildState.rssBytes,
      maxRssBytes: buildChildState.maxRssBytes,
      maxOutputBytes: buildChildState.maxOutputBytes,
      cpuUserMicros: buildChildState.cpuUserMicros,
      cpuSystemMicros: buildChildState.cpuSystemMicros,
    }) : null,
  });
}

function recordBuildChildResources(state) {
  if (!state || state.metricsRecorded) return;
  state.metricsRecorded = true;
  buildChildLifetime.retiredGenerations += 1;
  buildChildLifetime.buildCount += Number(state.buildCount ?? 0);
  buildChildLifetime.maxStartupMs = Math.max(buildChildLifetime.maxStartupMs, Number(state.startupMs ?? 0));
  buildChildLifetime.maxRssBytes = Math.max(buildChildLifetime.maxRssBytes, Number(state.maxRssBytes ?? 0));
  buildChildLifetime.maxOutputBytes = Math.max(buildChildLifetime.maxOutputBytes, Number(state.maxOutputBytes ?? 0));
  buildChildLifetime.cpuUserMicros += Number(state.cpuUserMicros ?? 0);
  buildChildLifetime.cpuSystemMicros += Number(state.cpuSystemMicros ?? 0);
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

function createBuildChild() {
  return fork(new URL("./production-job-build-child.mjs", import.meta.url), [], {
    serialization: "advanced",
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    windowsHide: true,
    execArgv: ["--max-old-space-size=512", "--max-semi-space-size=64"],
  });
}

function defaultWorkerFactory(input) {
  return new Worker(new URL("./production-job-build-worker.mjs", import.meta.url), {
    workerData: input,
    resourceLimits: { maxOldGenerationSizeMb: 768, maxYoungGenerationSizeMb: 128, stackSizeMb: 8 },
  });
}

async function terminateBuildChild(state) {
  if (!state) return;
  if (state.terminationPromise) return state.terminationPromise;
  state.status = "TERMINATING";
  clearTimeout(state.idleTimer);
  state.child.ref();
  state.child.channel?.ref?.();
  state.terminationPromise = new Promise((resolve, reject) => {
    let settled = false;
    let forceTimer;
    let failedTimer;
    const cleanup = () => {
      clearTimeout(forceTimer);
      clearTimeout(failedTimer);
      state.child.off("exit", done);
      state.child.off("error", onError);
    };
    const onError = () => {
      if (state.child.pid == null) done();
      else state.status = "TERMINATING";
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      recordBuildChildResources(state);
      if (buildChildState === state) buildChildState = null;
      resolve();
    };
    if (state.child.exitCode !== null || state.child.signalCode !== null) { done(); return; }
    state.child.once("exit", done);
    state.child.on("error", onError);
    forceTimer = setTimeout(() => {
      state.child.kill("SIGKILL");
      failedTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        state.status = "TERMINATION_FAILED";
        reject(buildError({ message: "De geïsoleerde productieopbouw kon niet volledig worden gestopt; nieuwe productieopbouw is geblokkeerd.", code: "PRODUCTION_JOB_BUILD_TERMINATION_FAILED", statusCode: 503 }));
      }, 1_000);
    }, CHILD_TERMINATION_TIMEOUT_MS);
    if (state.child.connected) state.child.disconnect();
    state.child.kill();
  });
  return state.terminationPromise;
}

async function startBuildChild({ startupTimeoutMs = DEFAULT_CHILD_STARTUP_TIMEOUT_MS, childFactory = createBuildChild } = {}) {
  if (buildChildState?.status === "READY" && buildChildState.child.connected) {
    clearTimeout(buildChildState.idleTimer);
    buildChildState.idleTimer = null;
    return buildChildState;
  }
  if (buildChildState?.status === "STARTING") return buildChildState.readyPromise;
  if (buildChildState?.status === "TERMINATION_FAILED") throw buildError({ message: "De vorige geïsoleerde productieopbouw is niet aantoonbaar gestopt.", code: "PRODUCTION_JOB_BUILD_TERMINATION_FAILED", statusCode: 503 });
  if (buildChildState) await terminateBuildChild(buildChildState);
  const child = childFactory();
  const startedAt = performance.now();
  const state = {
    generation: ++buildChildGeneration, child, status: "STARTING", actualPriority: null,
    buildCount: 0, rssBytes: 0, maxRssBytes: 0, maxOutputBytes: 0, cpuUserMicros: 0, cpuSystemMicros: 0,
    startupMs: null, idleTimer: null, terminationPromise: null, readyPromise: null, metricsRecorded: false,
  };
  buildChildState = state;
  state.readyPromise = new Promise((resolve, reject) => {
    let settled = false;
    let startupTimer;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(startupTimer);
      child.off("message", onMessage);
      child.off("error", onError);
      child.off("exit", onExit);
      callback(value);
    };
    const onError = (cause) => finish(reject, cause);
    const onExit = () => finish(reject, buildError({ message: "De geïsoleerde productieopbouw stopte vóór readiness.", code: "PRODUCTION_JOB_BUILD_STARTUP_FAILED", statusCode: 503 }));
    const onMessage = (message) => {
      if (message?.type !== "ready") return;
      try {
        setPriority(child.pid, osConstants.priority.PRIORITY_BELOW_NORMAL);
        state.actualPriority = getPriority(child.pid);
      } catch (cause) {
        finish(reject, cause);
        return;
      }
      state.rssBytes = Number(message.rssBytes ?? 0);
      state.maxRssBytes = Number(message.maxRssBytes ?? state.rssBytes);
      state.startupMs = performance.now() - startedAt;
      state.status = "READY";
      child.once("exit", () => { recordBuildChildResources(state); if (buildChildState === state) buildChildState = null; });
      child.on("error", () => { if (buildChildState === state && state.status === "READY") state.status = "DEGRADED"; });
      child.unref();
      child.channel?.unref?.();
      finish(resolve, state);
    };
    startupTimer = setTimeout(() => finish(reject, buildError({ message: "De geïsoleerde productieworker werd niet tijdig gereed; er is niets geregistreerd.", code: "PRODUCTION_JOB_BUILD_STARTUP_TIMEOUT", statusCode: 503 })), Math.max(100, Number(startupTimeoutMs) || DEFAULT_CHILD_STARTUP_TIMEOUT_MS));
    startupTimer.unref?.();
    child.on("message", onMessage);
    child.once("error", onError);
    child.once("exit", onExit);
  });
  try { return await state.readyPromise; }
  catch (cause) {
    await terminateBuildChild(state);
    if (String(cause?.code ?? "").startsWith("PRODUCTION_JOB_BUILD_")) throw cause;
    throw buildError({ message: "De geïsoleerde productieopbouw kon niet starten; er is niets geregistreerd.", code: cause?.code === "ERR_WORKER_OUT_OF_MEMORY" ? "PRODUCTION_JOB_BUILD_RESOURCE_LIMIT" : "PRODUCTION_JOB_BUILD_FAILED", statusCode: 503 });
  }
}

export async function warmProductionJobBuildIsolation(options) {
  persistentBuildIsolationEnabled = true;
  await startBuildChild(options);
  return productionJobBuildLoad();
}

export async function recycleProductionJobBuildIsolation() {
  await terminateBuildChild(buildChildState);
  return productionJobBuildLoad();
}

async function runPersistentBuildChild(input, timeoutMs) {
  const state = await startBuildChild();
  const { child } = state;
  const requestId = randomBytes(12).toString("hex");
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const failAfterTermination = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      terminateBuildChild(state).then(() => reject(error), (terminationError) => reject(terminationError));
    };
    const updateResources = (resources) => {
      state.buildCount = Number(resources?.buildCount ?? state.buildCount);
      state.rssBytes = Number(resources?.rssBytes ?? state.rssBytes);
      state.maxRssBytes = Math.max(state.maxRssBytes, Number(resources?.maxRssBytes ?? 0));
      state.maxOutputBytes = Math.max(state.maxOutputBytes, Number(resources?.outputBytes ?? 0));
      state.cpuUserMicros += Number(resources?.cpuUserMicros ?? 0);
      state.cpuSystemMicros += Number(resources?.cpuSystemMicros ?? 0);
    };
    const onMessage = (message) => {
      if (message?.requestId !== requestId || !["telemetry", "result"].includes(message?.type)) return;
      updateResources(message.resources);
      if (message.type === "telemetry") return;
      const scheduleIdleRecycle = () => {
        clearTimeout(state.idleTimer);
        state.idleTimer = setTimeout(() => terminateBuildChild(state).catch(() => undefined), CHILD_IDLE_TIMEOUT_MS);
        state.idleTimer.unref?.();
      };
      if (message.ok) {
        if (state.rssBytes > CHILD_RSS_RECYCLE_BYTES) {
          settled = true;
          cleanup();
          terminateBuildChild(state).then(() => resolve(message.snapshot), reject);
        } else {
          scheduleIdleRecycle();
          finish(resolve, message.snapshot);
        }
      }
      else if (state.rssBytes > CHILD_RSS_RECYCLE_BYTES) {
        settled = true;
        cleanup();
        const error = buildError(message.error);
        terminateBuildChild(state).then(() => reject(error), reject);
      } else {
        scheduleIdleRecycle();
        finish(reject, buildError(message.error));
      }
    };
    const onError = () => failAfterTermination(buildError({ message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.", code: "PRODUCTION_JOB_BUILD_FAILED", statusCode: 503 }));
    const onExit = (code) => failAfterTermination(buildError({ message: "De geïsoleerde productieopbouw is veilig gestopt; er is niets geregistreerd.", code: code === 0 ? "PRODUCTION_JOB_BUILD_NO_RESULT" : "PRODUCTION_JOB_BUILD_FAILED", statusCode: 503 }));
    const timer = setTimeout(() => failAfterTermination(buildError({ message: "De productieopbouw duurde te lang en is veilig gestopt; er is niets geregistreerd.", code: "PRODUCTION_JOB_BUILD_TIMEOUT", statusCode: 503 })), Math.max(1_000, Number(timeoutMs) || DEFAULT_BUILD_TIMEOUT_MS));
    timer.unref?.();
    child.on("message", onMessage);
    child.once("error", onError);
    child.once("exit", onExit);
    try { child.send({ type: "build", requestId, input, maxOutputBytes: MAX_PRODUCTION_WORKER_OUTPUT_BYTES }, (error) => { if (error) onError(error); }); }
    catch { onError(); }
  });
}

function runBuildWorker(input, timeoutMs, workerFactory) {
  if (!workerFactory && persistentBuildIsolationEnabled) return runPersistentBuildChild(input, timeoutMs);
  const createWorker = workerFactory ?? defaultWorkerFactory;
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
      worker = createWorker(input);
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
  workerFactory,
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
