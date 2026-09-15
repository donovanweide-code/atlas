"use strict";
const { createHash } = require("node:crypto");
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sha = /^[a-f0-9]{64}$/u;
const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const requireThat = (condition, message) => { if (!condition) throw new Error(`BASELINE_POLICY: ${message}`); };
const raw = evidence => { const { baselineComparison, ...measurement } = evidence; return measurement; };

// Absolute norms are never changed. Only event-loop debt is eligible, with zero
// tolerance: the worst candidate repeat must not exceed the best LIVE repeat.
function evaluateBaselinePolicy({ evidence, contract, scope, currentManifest, candidateManifest, now = Date.now() }) {
  requireThat(["sportpaleis", "owner"].includes(scope), "unknown scope");
  const metrics = row => scope === "sportpaleis" ? row.runtime : row.metrics;
  const errors = row => scope === "sportpaleis" ? row.load : row.metrics;
  const keys = ["eventLoopP95Ms", "eventLoopMaxMs"];
  requireThat(evidence.baselineEligibility?.nonEventLoopThresholdsPassed === true, "other threshold failed or missing");
  requireThat(errors(evidence)?.httpErrors === 0 && errors(evidence)?.serverErrors === 0, "HTTP/runtime errors");
  for (const key of keys) requireThat(finite(metrics(evidence)?.[key]) && finite(contract.limits[key]), `invalid ${key}`);
  const soak = row => {
    if (scope !== "sportpaleis") return [];
    const cycles = row.runtime?.soakCycles;
    requireThat(Array.isArray(cycles) && cycles.length === contract.minimumLoad.soakCycles, "incomplete soak");
    cycles.forEach((cycle, index) => {
      requireThat(cycle.cycle === index + 1 && cycle.count >= contract.minimumLoad.soakRevisionPollsPerCycle + contract.minimumLoad.soakLibraryPreviewsPerCycle + contract.minimumLoad.soakBootstrapsPerCycle && cycle.httpErrors === 0 && cycle.serverErrors === 0 && finite(cycle.eventLoopMaxMs), "invalid soak cycle");
    });
    return cycles.map(cycle => cycle.eventLoopMaxMs);
  };
  const candidateSoak = soak(evidence);
  requireThat(contract.requiredInvariants.every(key => evidence.invariants?.[key] === true || (scope === "sportpaleis" && key === "multiCycleSoakCompleted")), "functional invariant failed");
  requireThat(Object.entries(evidence.invariants ?? {}).every(([key, value]) => value === true || (scope === "sportpaleis" && key === "multiCycleSoakCompleted" && value === false)), "additional invariant failed");
  const debtKeys = keys.filter(key => metrics(evidence)[key] > contract.limits[key]);
  const soakDebt = candidateSoak.some(value => value > contract.limits.eventLoopMaxMs);
  if (!debtKeys.length && !soakDebt && !evidence.baselineComparison) return { status: "ABSOLUTE_PASS", releaseAllowed: true, absoluteLimits: { eventLoopP95Ms: contract.limits.eventLoopP95Ms, eventLoopMaxMs: contract.limits.eventLoopMaxMs }, debt: [] };
  const comparison = evidence.baselineComparison;
  requireThat(comparison?.schemaVersion === 1 && comparison.toleranceMs === 0, "missing comparison or unsupported tolerance");
  requireThat(comparison.scope === scope && comparison.liveManifestSha256 === digest(currentManifest), "LIVE manifest drift");
  requireThat(comparison.liveReleaseId === currentManifest.releaseId && comparison.liveCommit === currentManifest.commit, "LIVE identity drift");
  requireThat(Array.isArray(currentManifest.files) && currentManifest.files.length > 0 && Array.isArray(candidateManifest?.files) && candidateManifest.files.length > 0 && candidateManifest.commit === evidence.identity.candidateCommit, "runtime manifests absent");
  if (scope === "owner") {
    const probes = candidateManifest.baselineAssuranceProbes;
    requireThat(probes?.baselineCommit === currentManifest.commit && probes.compatible === true && probes.files?.length > 0 && probes.files.every(file => sha.test(file.baselineSha256 ?? "") && file.baselineSha256 === file.candidateSha256 && candidateManifest.files.some(entry => entry.path === file.path && entry.sha256 === file.candidateSha256)), "shared Owner probe code changed from LIVE source");
  }
  requireThat(sha.test(comparison.methodSha256 ?? "") && sha.test(comparison.inputSha256 ?? ""), "method/input binding absent");
  requireThat(Array.isArray(comparison.runs) && comparison.runs.length === 4, "two paired repeats required");
  const baselines = [], candidates = [], ids = new Set();
  let previousEnd = 0;
  comparison.runs.forEach((run, index) => {
    requireThat(run.role === ["baseline", "candidate", "candidate", "baseline"][index], "paired run order invalid");
    requireThat(typeof run.runId === "string" && run.runId.length >= 16 && !ids.has(run.runId), "run identity missing/reused"); ids.add(run.runId);
    const start = Date.parse(run.startedAt), end = Date.parse(run.finishedAt);
    requireThat(Number.isFinite(start) && Number.isFinite(end) && start >= previousEnd && end > start && end <= now && now - start <= 24 * 60 * 60_000, "stale, overlapping or invalid run"); previousEnd = end;
    requireThat(run.methodSha256 === comparison.methodSha256 && run.inputSha256 === comparison.inputSha256 && run.host === comparison.host && run.nodeVersion === comparison.nodeVersion && typeof run.host === "string" && run.host.length > 0 && /^v\d+\./u.test(run.nodeVersion), "measurement conditions differ");
    requireThat(sha.test(run.runtimeTreeSha256 ?? "") && run.evidenceSha256 === digest(run.evidence), "raw evidence/runtime binding invalid");
    requireThat(run.runtimeTreeSha256 === digest((run.role === "baseline" ? currentManifest : candidateManifest).files), "measured runtime tree differs from immutable artifact");
    const row = run.evidence;
    requireThat(!row.baselineComparison && ["PASS", "FAIL"].includes(row.status), "not raw completed assurance");
    requireThat(row.identity?.candidateCommit === (run.role === "baseline" ? currentManifest.commit : evidence.identity.candidateCommit), "measured commit differs");
    requireThat(row.identity?.assuranceEntrypointSha256 === evidence.identity.assuranceEntrypointSha256 && row.identity?.assuranceContractSha256 === evidence.identity.assuranceContractSha256 && row.identity?.restoreBackupSha256 === evidence.identity.restoreBackupSha256, "assurance method/restore differs");
    requireThat(errors(row)?.httpErrors === 0 && errors(row)?.serverErrors === 0, "comparison has errors");
    for (const key of keys) requireThat(finite(metrics(row)?.[key]), "comparison metric missing");
    soak(row);
    if (run.role === "candidate") {
      requireThat(row.identity.candidateArtifactSha256 === evidence.identity.candidateArtifactSha256 && row.baselineEligibility?.nonEventLoopThresholdsPassed === true, "candidate artifact/other threshold differs");
      requireThat(contract.requiredInvariants.every(key => row.invariants?.[key] === true || (scope === "sportpaleis" && key === "multiCycleSoakCompleted")), "candidate repeat functional failure");
      candidates.push(row);
    } else {
      // A pre-existing payload budget failure is not a functional baseline
      // failure; candidate payloads still have to pass the absolute gate.
      requireThat(contract.requiredInvariants.every(key => row.invariants?.[key] === true || (scope === "sportpaleis" && ["multiCycleSoakCompleted", "scopedBootstrapPayloads"].includes(key))), "baseline functional failure");
      baselines.push(row);
    }
  });
  requireThat(candidates.some(row => digest(row) === digest(raw(evidence))), "primary measurement not in comparison");
  const debt = [];
  const decide = (name, norm, baselineValues, candidateValues) => {
    const baseline = Math.min(...baselineValues), candidate = Math.max(...candidateValues);
    if (candidate <= norm) return;
    requireThat(baseline > norm && candidate <= baseline, `${name} is a regression`);
    debt.push({ metric: name, absoluteLimit: norm, baseline, candidate, toleranceMs: 0, classification: "BASELINE_DEBT", remediation: "OPEN" });
  };
  for (const key of keys) decide(key, contract.limits[key], baselines.map(row => metrics(row)[key]), candidates.map(row => metrics(row)[key]));
  candidateSoak.forEach((_, index) => decide(`soak-${index + 1}.eventLoopMaxMs`, contract.limits.eventLoopMaxMs, baselines.map(row => soak(row)[index]), candidates.map(row => soak(row)[index])));
  return { status: debt.length ? "BASELINE_DEBT" : "ABSOLUTE_PASS", releaseAllowed: true, absoluteLimits: { eventLoopP95Ms: contract.limits.eventLoopP95Ms, eventLoopMaxMs: contract.limits.eventLoopMaxMs }, liveReleaseId: currentManifest.releaseId, liveCommit: currentManifest.commit, comparisonSha256: digest(comparison), debt };
}
module.exports = { evaluateBaselinePolicy, baselineEvidenceDigest: digest };
