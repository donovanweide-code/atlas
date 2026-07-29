import { setTimeout as delay } from "node:timers/promises";
import { evaluatePostSwitchActivation } from "./release-validation-core.mjs";
import {
  captureReleaseValidationReport,
  releaseValidationProfileSha256,
  validateReleaseValidationConfig,
} from "./release-validation-probe.mjs";

const DEFAULT_ACTIVATION_SETTINGS = Object.freeze({
  maximumPropagationMs: 1_200_000,
  pollIntervalMs: 60_000,
  minimumStableRounds: 3,
});

function activationSettings(config) {
  return {
    ...DEFAULT_ACTIVATION_SETTINGS,
    ...config.activation,
  };
}

function validateActivationRuntime(config, switchRequestedAt) {
  validateReleaseValidationConfig(config);
  if (!config.activation) {
    throw new Error("Post-switchactivatie vereist een activation-configuratie.");
  }
  if (!Array.isArray(config.activation.routes)) {
    throw new Error("Post-switchactivatie vereist expliciete activation.routes.");
  }
  if (!switchRequestedAt || !Number.isFinite(Date.parse(switchRequestedAt))) {
    throw new Error("Post-switchactivatie vereist een geldige switchRequestedAt.");
  }
}

export async function runPostSwitchActivation(config, {
  switchRequestedAt,
  onUpdate = async () => {},
}, {
  captureImpl = captureReleaseValidationReport,
  delayImpl = delay,
  nowImpl = Date.now,
} = {}) {
  validateActivationRuntime(config, switchRequestedAt);
  const settings = activationSettings(config);
  const rounds = [];
  const expectedProfileSha256 = releaseValidationProfileSha256(config);

  while (true) {
    const roundNumber = rounds.length + 1;
    const roundStartedAtMs = nowImpl();
    const roundStartedAt = new Date(roundStartedAtMs).toISOString();
    const reports = await Promise.all(config.activation.routes.map(async (route) => {
      const report = await captureImpl(config, {
        phase: "post-switch",
        sourceId: route.sourceId,
        routeId: route.routeId,
        runnerContext: route.runnerContext,
        networkContext: route.networkContext,
        addressFamily: route.addressFamily ?? 0,
      });
      return {
        ...report,
        activation: {
          switchRequestedAt,
          roundNumber,
        },
      };
    }));
    rounds.push({
      roundNumber,
      startedAt: roundStartedAt,
      reports,
    });

    const result = evaluatePostSwitchActivation({
      rounds,
      expectedProfileSha256,
      switchRequestedAt,
      now: nowImpl(),
      maximumEvidenceAgeMs: (config.validation?.maximumEvidenceAgeSeconds ?? 600) * 1000,
      minimumConsecutiveSamples: config.validation?.minimumConsecutiveSamples ?? 2,
      minimumIndependentRoutes: config.validation?.minimumIndependentRoutes ?? 2,
      minimumObservationSpanMs: config.validation?.minimumObservationSpanMs ?? 0,
      approvedRunnerContexts: config.execution.approvedRunnerContexts,
      maximumPropagationMs: settings.maximumPropagationMs,
      pollIntervalMs: settings.pollIntervalMs,
      minimumStableRounds: settings.minimumStableRounds,
      previousHealthAssertionIds: config.activation.healthAssertionIds,
    });
    await onUpdate(result);

    if (result.terminal) return result;

    const roundDurationMs = Math.max(0, nowImpl() - roundStartedAtMs);
    await delayImpl(Math.max(0, settings.pollIntervalMs - roundDurationMs));
  }
}
