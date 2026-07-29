import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePostSwitchActivation,
  evaluateReleaseValidation,
} from "../scripts/release-validation-core.mjs";

const now = Date.parse("2026-07-28T12:00:00.000Z");
const validationProfileSha256 = "TEST-PROFILE-SHA256";
const approvedRunnerContexts = [{
  id: "approved-network-runner",
  networkCapable: true,
  networkContexts: ["network-a", "network-b"],
}];

function sample({
  available = true,
  assertionsPass = true,
  critical = true,
  artifactIdentity,
  healthPass = true,
  indexablePass = true,
  httpStatus,
} = {}) {
  return {
    at: "2026-07-28T11:59:58.000Z",
    dns: { ok: available },
    transport: { ok: available },
    tls: { applicable: true, ok: available },
    http: {
      received: available,
      status: available ? (httpStatus ?? 200) : null,
    },
    assertions: [
      {
        id: "release",
        pass: assertionsPass,
        critical,
      },
      {
        id: "health",
        pass: healthPass,
        critical: true,
      },
      {
        id: "indexable",
        pass: indexablePass,
        critical: true,
      },
    ],
    ...(artifactIdentity ? {
      artifact: {
        identity: artifactIdentity,
        artifactId: `${artifactIdentity}-release`,
      },
    } : {}),
  };
}

function report({
  sourceId,
  routeId,
  networkContext = routeId,
  runnerContext = "approved-network-runner",
  phase = "post-switch",
  targetSamples = [sample(), sample()],
  controlSamples = [sample(), sample()],
  startedAt = "2026-07-28T11:59:55.000Z",
  completedAt = "2026-07-28T11:59:59.000Z",
}) {
  return {
    schemaVersion: 2,
    phase,
    validationProfileSha256,
    source: { id: sourceId, routeId, runnerContext, networkContext },
    runner: {
      approved: true,
      networkCapable: true,
      localPermissionRetry: { attempted: false, limit: 1, outcome: "not-needed" },
    },
    probeFailure: null,
    startedAt,
    completedAt,
    endpoints: {
      target: { url: "https://webuildanddesign.nl/", samples: targetSamples },
      control: { url: "https://preview.webuildanddesign.nl/", samples: controlSamples },
    },
  };
}

function evaluate(reports, overrides = {}) {
  return evaluateReleaseValidation({
    phase: "preflight",
    reports: reports.map((item) => ({ ...item, phase: "preflight" })),
    expectedProfileSha256: validationProfileSha256,
    now,
    minimumIndependentRoutes: 2,
    minimumConsecutiveSamples: 2,
    approvedRunnerContexts,
    ...overrides,
  });
}

test("verklaart preflight alleen switch-eligible met twee onafhankelijke geldige routes", () => {
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a" }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Pass");
  assert.equal(result.releaseDecision, "switch-eligible");
  assert.equal(result.rollbackRecommended, false);
});

test("classificeert een falende controlehost als Probe invalid", () => {
  const unavailable = [sample({ available: false }), sample({ available: false })];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", controlSamples: unavailable }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.equal(result.releaseDecision, "stop");
  assert.equal(result.rollbackRecommended, false);
});

test("telt twee rapporten via dezelfde netwerkroute niet als onafhankelijk bewijs", () => {
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "shared-network", networkContext: "network-a" }),
    report({ sourceId: "runner-b", routeId: "shared-network", networkContext: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.deepEqual(result.duplicateRoutes, ["shared-network"]);
});

test("telt dezelfde netwerkcontext niet als twee onafhankelijke metingen", () => {
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "route-a", networkContext: "network-a" }),
    report({ sourceId: "runner-b", routeId: "route-b", networkContext: "network-a" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.deepEqual(result.duplicateNetworkContexts, ["network-a"]);
});

test("weigert een niet-goedgekeurde runnercontext als bewijs", () => {
  const unapproved = report({
    sourceId: "runner-a",
    routeId: "network-a",
    runnerContext: "restricted-windows-runner",
  });
  unapproved.runner.approved = false;
  const result = evaluate([
    unapproved,
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.match(result.evidence[0].reason, /goedgekeurde netwerkgeschikte runnercontext/);
});

test("accepteert EACCES nooit als geldig bewijs of rollbackgrond", () => {
  const denied = report({ sourceId: "runner-a", routeId: "network-a" });
  denied.probeFailure = {
    code: "EACCES",
    kind: "local-runner-not-authorized",
    reason: "lokale socket geweigerd",
  };
  const result = evaluate([
    denied,
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.equal(result.rollbackRecommended, false);
  assert.match(result.evidence[0].reason, /lokale runner niet bevoegd/);
});

test("rolt niet terug bij een enkelvoudige transportfout", () => {
  const unavailable = [sample({ available: false }), sample({ available: false })];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", targetSamples: unavailable }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Validation failed");
  assert.equal(result.releaseDecision, "stop");
  assert.equal(result.rollbackRecommended, false);
});

test("classificeert bevestigde onbereikbaarheid als Production failed", () => {
  const unavailable = [sample({ available: false }), sample({ available: false })];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", targetSamples: unavailable }),
    report({ sourceId: "runner-b", routeId: "network-b", targetSamples: unavailable }),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.equal(result.releaseDecision, "stop");
  assert.equal(result.rollbackRecommended, false);
});

test("weigert directe post-switch-evaluatie buiten de activatielaag", () => {
  assert.throws(() => evaluateReleaseValidation({
    phase: "post-switch",
    reports: [
      report({ sourceId: "runner-a", routeId: "network-a" }),
      report({ sourceId: "runner-b", routeId: "network-b" }),
    ],
    expectedProfileSha256: validationProfileSha256,
    now,
    minimumIndependentRoutes: 2,
    minimumConsecutiveSamples: 2,
    approvedRunnerContexts,
  }), /propagatiebewuste activatielaag/);
});

test("houdt strijdig geldig bewijs tegen als Validation failed", () => {
  const unavailable = [
    sample({ available: false }),
    sample({ available: false }),
  ];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", targetSamples: unavailable }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Validation failed");
  assert.equal(result.rollbackRecommended, false);
});

test("weigert verouderd bewijs als Probe invalid", () => {
  const result = evaluate([
    report({
      sourceId: "runner-a",
      routeId: "network-a",
      startedAt: "2026-07-28T11:29:55.000Z",
      completedAt: "2026-07-28T11:30:00.000Z",
    }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.match(result.evidence[0].reason, /verouderd/);
});

test("weigert rapporten uit een ander validatieprofiel", () => {
  const wrongProfile = report({ sourceId: "runner-a", routeId: "network-a" });
  wrongProfile.validationProfileSha256 = "OTHER-PROFILE";
  const result = evaluate([
    wrongProfile,
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.match(result.evidence[0].reason, /validatieprofiel/);
});

test("preflight geeft nooit een rollbackadvies", () => {
  const unavailable = [sample({ available: false }), sample({ available: false })];
  const reports = [
    report({
      sourceId: "runner-a",
      routeId: "network-a",
      phase: "preflight",
      targetSamples: unavailable,
    }),
    report({
      sourceId: "runner-b",
      routeId: "network-b",
      phase: "preflight",
      targetSamples: unavailable,
    }),
  ];
  const result = evaluateReleaseValidation({
    phase: "preflight",
    reports,
    expectedProfileSha256: validationProfileSha256,
    now,
    minimumIndependentRoutes: 2,
    minimumConsecutiveSamples: 2,
    approvedRunnerContexts,
  });

  assert.equal(result.classification, "Production failed");
  assert.equal(result.releaseDecision, "stop");
  assert.equal(result.rollbackRecommended, false);
});

test("weigert een te kort observatievenster als Probe invalid", () => {
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a" }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ], { minimumObservationSpanMs: 10_000 });

  assert.equal(result.classification, "Probe invalid");
});

function activationReport(routeIndex, status, completedAt) {
  const definitions = {
    previous: {
      targetSamples: [
        sample({ assertionsPass: false, artifactIdentity: "previous" }),
        sample({ assertionsPass: false, artifactIdentity: "previous" }),
      ],
    },
    "previous-bad-status": {
      targetSamples: [
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          httpStatus: 500,
        }),
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          httpStatus: 500,
        }),
      ],
    },
    "previous-unhealthy": {
      targetSamples: [
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          healthPass: false,
        }),
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          healthPass: false,
        }),
      ],
    },
    "previous-noindex": {
      targetSamples: [
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          indexablePass: false,
        }),
        sample({
          assertionsPass: false,
          artifactIdentity: "previous",
          indexablePass: false,
        }),
      ],
    },
    candidate: {
      targetSamples: [
        sample({ artifactIdentity: "candidate" }),
        sample({ artifactIdentity: "candidate" }),
      ],
    },
    "candidate-broken": {
      targetSamples: [
        sample({ assertionsPass: false, artifactIdentity: "candidate" }),
        sample({ assertionsPass: false, artifactIdentity: "candidate" }),
      ],
    },
    unknown: {
      targetSamples: [
        sample({ assertionsPass: false, artifactIdentity: "unknown" }),
        sample({ assertionsPass: false, artifactIdentity: "unknown" }),
      ],
    },
    unreachable: {
      targetSamples: [
        sample({ available: false, artifactIdentity: "unknown" }),
        sample({ available: false, artifactIdentity: "unknown" }),
      ],
    },
  };
  const route = routeIndex === 0 ? "network-a" : "network-b";
  return report({
    sourceId: `runner-${routeIndex + 1}`,
    routeId: route,
    networkContext: route,
    completedAt,
    startedAt: new Date(Date.parse(completedAt) - 4_000).toISOString(),
    ...definitions[status],
  });
}

function activationRound(roundNumber, statuses, completedAt) {
  return {
    roundNumber,
    startedAt: new Date(Date.parse(completedAt) - 5_000).toISOString(),
    reports: statuses.map((status, index) => activationReport(index, status, completedAt)),
  };
}

function evaluateActivation(rounds, overrides = {}) {
  return evaluatePostSwitchActivation({
    rounds,
    expectedProfileSha256: validationProfileSha256,
    switchRequestedAt: "2026-07-28T11:50:00.000Z",
    now: Date.parse("2026-07-28T12:00:00.000Z"),
    minimumIndependentRoutes: 2,
    minimumConsecutiveSamples: 2,
    approvedRunnerContexts,
    maximumPropagationMs: 1_200_000,
    pollIntervalMs: 60_000,
    minimumStableRounds: 3,
    previousHealthAssertionIds: ["health", "indexable"],
    ...overrides,
  });
}

test("houdt een bevestigde vorige release binnen het budget op Propagation pending", () => {
  const result = evaluateActivation([
    activationRound(1, ["previous", "previous"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Propagation pending");
  assert.equal(result.releaseDecision, "wait-and-retry");
  assert.equal(result.rollbackRecommended, false);
});

test("behandelt een herkende vorige release met ongeldige HTTP-status niet als gezond", () => {
  const result = evaluateActivation([
    activationRound(
      1,
      ["previous-bad-status", "previous-bad-status"],
      "2026-07-28T11:59:00.000Z",
    ),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.ok(result.routeStatus.every((route) => route.routeStatus === "unknown-or-broken"));
});

test("behandelt een herkende vorige release met falende kritieke gezondheid niet als gezond", () => {
  const result = evaluateActivation([
    activationRound(
      1,
      ["previous-unhealthy", "previous-unhealthy"],
      "2026-07-28T11:59:00.000Z",
    ),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.ok(result.routeStatus.every((route) => route.artifactIdentity === "previous"));
});

test("behandelt een herkende vorige release met verboden noindex niet als gezond", () => {
  const result = evaluateActivation([
    activationRound(
      1,
      ["previous-noindex", "previous-noindex"],
      "2026-07-28T11:59:00.000Z",
    ),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.equal(result.rollbackRecommended, true);
});

test("stabiliseert de kandidaat drie volledige rondes voordat Pass volgt", () => {
  const rounds = [
    activationRound(1, ["previous", "previous"], "2026-07-28T11:57:00.000Z"),
    activationRound(2, ["candidate", "candidate"], "2026-07-28T11:58:00.000Z"),
  ];
  const stabilizing = evaluateActivation(rounds);
  const passed = evaluateActivation([
    ...rounds,
    activationRound(3, ["candidate", "candidate"], "2026-07-28T11:59:00.000Z"),
    activationRound(4, ["candidate", "candidate"], "2026-07-28T12:00:00.000Z"),
  ]);

  assert.equal(stabilizing.classification, "Candidate stabilizing");
  assert.equal(stabilizing.stableCandidateRounds, 1);
  assert.equal(passed.classification, "Pass");
  assert.equal(passed.releaseDecision, "accept-release");
  assert.equal(passed.stableCandidateRounds, 3);
  assert.equal(passed.firstCandidateVisibleAt, "2026-07-28T11:58:00.000Z");
  assert.equal(passed.stabilityConfirmedAt, "2026-07-28T12:00:00.000Z");
});

test("classificeert een gezonde IPv4/IPv6-mix als Propagation converging", () => {
  const result = evaluateActivation([
    activationRound(1, ["candidate", "previous"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Propagation converging");
  assert.equal(result.releaseDecision, "wait-and-retry");
  assert.equal(result.rollbackRecommended, false);
});

test("zet de stabiele kandidaat-teller terug bij terugval naar vorige release", () => {
  const result = evaluateActivation([
    activationRound(1, ["candidate", "candidate"], "2026-07-28T11:58:00.000Z"),
    activationRound(2, ["previous", "previous"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Propagation pending");
  assert.equal(result.stableCandidateRounds, 0);
});

test("classificeert een gezonde vorige release na de deadline als Activation timeout", () => {
  const result = evaluateActivation([
    activationRound(1, ["previous", "previous"], "2026-07-28T12:11:00.000Z"),
  ], { now: Date.parse("2026-07-28T12:11:00.000Z") });

  assert.equal(result.classification, "Activation timeout");
  assert.equal(result.releaseDecision, "restore-previous-root");
  assert.equal(result.rollbackRecommended, false);
});

test("classificeert een blijvende gezonde mix na de deadline als Activation timeout", () => {
  const result = evaluateActivation([
    activationRound(1, ["candidate", "previous"], "2026-07-28T12:11:00.000Z"),
  ], { now: Date.parse("2026-07-28T12:11:00.000Z") });

  assert.equal(result.classification, "Activation timeout");
  assert.equal(result.releaseDecision, "restore-previous-root");
});

test("behoudt Production failed voor een kritisch falende actieve kandidaat", () => {
  const result = evaluateActivation([
    activationRound(
      1,
      ["candidate-broken", "candidate-broken"],
      "2026-07-28T11:59:00.000Z",
    ),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.equal(result.releaseDecision, "rollback");
  assert.equal(result.rollbackRecommended, true);
});

test("behoudt Production failed voor een bevestigd onbekend artefact", () => {
  const result = evaluateActivation([
    activationRound(1, ["unknown", "unknown"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.equal(result.rollbackRecommended, true);
});

test("rolt niet direct terug wanneer slechts één geldige route faalt", () => {
  const result = evaluateActivation([
    activationRound(1, ["unreachable", "previous"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Validation failed");
  assert.equal(result.releaseDecision, "wait-and-retry");
  assert.equal(result.rollbackRecommended, false);
});

test("accepteert of rolt nooit terug op uitsluitend een ongeldige probecontext", () => {
  const invalid = activationReport(0, "candidate", "2026-07-28T11:59:00.000Z");
  invalid.probeFailure = {
    code: "EACCES",
    kind: "local-runner-not-authorized",
  };
  const result = evaluateActivation([{
    roundNumber: 1,
    reports: [
      invalid,
      activationReport(1, "candidate", "2026-07-28T11:59:00.000Z"),
    ],
  }]);

  assert.equal(result.classification, "Probe invalid");
  assert.equal(result.releaseDecision, "stop");
  assert.equal(result.rollbackRecommended, false);
});

test("accepteert een vanaf ronde één zichtbare kandidaat niet voortijdig", () => {
  const result = evaluateActivation([
    activationRound(1, ["candidate", "candidate"], "2026-07-28T11:59:00.000Z"),
  ]);

  assert.equal(result.classification, "Candidate stabilizing");
  assert.equal(result.stableCandidateRounds, 1);
  assert.equal(result.releaseDecision, "wait-and-retry");
});
