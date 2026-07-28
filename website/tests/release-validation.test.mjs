import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReleaseValidation } from "../scripts/release-validation-core.mjs";

const now = Date.parse("2026-07-28T12:00:00.000Z");
const validationProfileSha256 = "TEST-PROFILE-SHA256";

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
  phase = "post-switch",
  targetSamples = [sample(), sample()],
  controlSamples = [sample(), sample()],
  startedAt = "2026-07-28T11:59:55.000Z",
  completedAt = "2026-07-28T11:59:59.000Z",
}) {
  return {
    schemaVersion: 1,
    phase,
    validationProfileSha256,
    source: { id: sourceId, routeId },
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
    report({ sourceId: "runner-a", routeId: "shared-network" }),
    report({ sourceId: "runner-b", routeId: "shared-network" }),
  ]);

  assert.equal(result.classification, "Probe invalid");
  assert.deepEqual(result.duplicateRoutes, ["shared-network"]);
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
