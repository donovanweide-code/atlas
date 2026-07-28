import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReleaseValidation } from "../scripts/release-validation-core.mjs";

const now = Date.parse("2026-07-28T12:00:00.000Z");
const validationProfileSha256 = "TEST-PROFILE-SHA256";
const approvedRunnerContexts = [{
  id: "approved-network-runner",
  networkCapable: true,
  networkContexts: ["network-a", "network-b"],
}];

function sample({ available = true, assertionsPass = true, critical = true } = {}) {
  return {
    at: "2026-07-28T11:59:58.000Z",
    dns: { ok: available },
    transport: { ok: available },
    tls: { applicable: true, ok: available },
    http: { received: available, status: available ? 200 : null },
    assertions: [{
      id: "release",
      pass: assertionsPass,
      critical,
    }],
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
    phase: "post-switch",
    reports,
    expectedProfileSha256: validationProfileSha256,
    now,
    minimumIndependentRoutes: 2,
    minimumConsecutiveSamples: 2,
    approvedRunnerContexts,
    ...overrides,
  });
}

test("accepteert de release alleen met twee onafhankelijke geldige routes", () => {
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a" }),
    report({ sourceId: "runner-b", routeId: "network-b" }),
  ]);

  assert.equal(result.classification, "Pass");
  assert.equal(result.releaseDecision, "accept-release");
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
  assert.equal(result.releaseDecision, "rollback");
  assert.equal(result.rollbackRecommended, true);
});

test("classificeert een bevestigde kritieke artefactmismatch als Production failed", () => {
  const mismatch = [
    sample({ assertionsPass: false }),
    sample({ assertionsPass: false }),
  ];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", targetSamples: mismatch }),
    report({ sourceId: "runner-b", routeId: "network-b", targetSamples: mismatch }),
  ]);

  assert.equal(result.classification, "Production failed");
  assert.equal(result.rollbackRecommended, true);
});

test("houdt strijdig geldig bewijs tegen als Validation failed", () => {
  const mismatch = [
    sample({ assertionsPass: false }),
    sample({ assertionsPass: false }),
  ];
  const result = evaluate([
    report({ sourceId: "runner-a", routeId: "network-a", targetSamples: mismatch }),
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
