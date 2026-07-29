import assert from "node:assert/strict";
import test from "node:test";
import { runPostSwitchActivation } from "../scripts/release-validation-activation.mjs";
import { releaseValidationProfileSha256 } from "../scripts/release-validation-probe.mjs";

function sample(identity, assertionsPass = true) {
  return {
    at: "2026-07-28T12:00:00.000Z",
    dns: { ok: true },
    transport: { ok: true },
    tls: { applicable: true, ok: true },
    http: { received: true, status: 200 },
    assertions: [
      { id: "release", pass: assertionsPass, critical: true },
      { id: "status", pass: true, critical: true },
    ],
    artifact: { identity, artifactId: `${identity}-release` },
  };
}

test("meet vanaf één vast switchmoment door tot drie stabiele kandidaatrondes", async () => {
  const config = {
    probe: { attempts: 2, intervalMs: 0, timeoutMs: 100 },
    validation: {
      maximumEvidenceAgeSeconds: 600,
      minimumConsecutiveSamples: 2,
      minimumIndependentRoutes: 2,
      minimumObservationSpanMs: 0,
    },
    execution: {
      approvedRunnerContexts: [{
        id: "test-runner",
        networkCapable: true,
        networkContexts: ["ipv4", "ipv6"],
      }],
      localPermissionErrorCodes: ["EACCES", "EPERM"],
      localPermissionRetryLimit: 1,
    },
    activation: {
      maximumPropagationMs: 1_200_000,
      pollIntervalMs: 60_000,
      minimumStableRounds: 3,
      healthAssertionIds: ["status"],
      previousArtifact: {
        id: "previous-release",
        bodyIncludes: ["/assets/previous.js"],
      },
      candidateArtifact: {
        id: "candidate-release",
        bodyIncludes: ["/assets/candidate.js"],
      },
      routes: [
        {
          sourceId: "source-ipv4",
          routeId: "route-ipv4",
          runnerContext: "test-runner",
          networkContext: "ipv4",
          addressFamily: 4,
        },
        {
          sourceId: "source-ipv6",
          routeId: "route-ipv6",
          runnerContext: "test-runner",
          networkContext: "ipv6",
          addressFamily: 6,
        },
      ],
    },
    endpoints: {
      target: {
        url: "https://example.test/",
        assertions: [{ id: "status", type: "status", equals: 200, critical: true }],
      },
      control: {
        url: "https://control.example.test/",
        assertions: [{ id: "status", type: "status", equals: 200, critical: true }],
      },
    },
  };

  let clock = Date.parse("2026-07-28T12:00:00.000Z");
  let captureCalls = 0;
  const updates = [];
  const switchRequestedAt = "2026-07-28T11:59:00.000Z";
  const result = await runPostSwitchActivation(config, {
    switchRequestedAt,
    onUpdate: async (update) => updates.push(update),
  }, {
    nowImpl: () => clock,
    delayImpl: async (milliseconds) => {
      clock += milliseconds;
    },
    captureImpl: async (_config, route) => {
      const roundIndex = Math.floor(captureCalls / 2);
      captureCalls += 1;
      const identity = roundIndex === 0 ? "previous" : "candidate";
      const assertionsPass = identity === "candidate";
      const completedAt = new Date(clock).toISOString();
      return {
        schemaVersion: 2,
        phase: "post-switch",
        validationProfileSha256: releaseValidationProfileSha256(config),
        source: {
          id: route.sourceId,
          routeId: route.routeId,
          runnerContext: route.runnerContext,
          networkContext: route.networkContext,
        },
        runner: {
          approved: true,
          networkCapable: true,
          localPermissionRetry: { attempted: false, limit: 1, outcome: "not-needed" },
        },
        probeFailure: null,
        startedAt: completedAt,
        completedAt,
        endpoints: {
          target: {
            url: config.endpoints.target.url,
            samples: [sample(identity, assertionsPass), sample(identity, assertionsPass)],
          },
          control: {
            url: config.endpoints.control.url,
            samples: [sample("unknown"), sample("unknown")],
          },
        },
      };
    },
  });

  assert.deepEqual(
    updates.map((update) => update.classification),
    [
      "Propagation pending",
      "Candidate stabilizing",
      "Candidate stabilizing",
      "Pass",
    ],
  );
  assert.equal(result.switchRequestedAt, switchRequestedAt);
  assert.equal(result.stableCandidateRounds, 3);
  assert.equal(result.releaseDecision, "accept-release");
  assert.equal(captureCalls, 8);
});
