export const RELEASE_VALIDATION_CLASSIFICATION = Object.freeze({
  pass: "Pass",
  probeInvalid: "Probe invalid",
  validationFailed: "Validation failed",
  productionFailed: "Production failed",
});

const TERMINAL_TARGET_STATES = new Set([
  "pass",
  "unreachable",
  "critical-mismatch",
  "mismatch",
]);

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isLayerAvailable(sample) {
  return sample?.dns?.ok === true
    && sample?.transport?.ok === true
    && (sample?.tls?.applicable !== true || sample?.tls?.ok === true)
    && sample?.http?.received === true;
}

function allAssertionsPass(sample) {
  return Array.isArray(sample?.assertions)
    && sample.assertions.length > 0
    && sample.assertions.every((assertion) => assertion.pass === true);
}

function hasCriticalFailure(sample) {
  return Array.isArray(sample?.assertions)
    && sample.assertions.some((assertion) => assertion.critical !== false && assertion.pass !== true);
}

function assessSampleWindow(samples, minimumConsecutiveSamples, { requireAssertions }) {
  if (!Array.isArray(samples) || samples.length < minimumConsecutiveSamples) {
    return { state: "invalid", reason: "onvoldoende opeenvolgende meetpunten" };
  }

  const window = samples.slice(-minimumConsecutiveSamples);
  const availability = window.map(isLayerAvailable);

  if (availability.every(Boolean)) {
    if (!requireAssertions) return { state: "pass" };
    if (window.every(allAssertionsPass)) return { state: "pass" };
    if (window.every(hasCriticalFailure)) return { state: "critical-mismatch" };
    return { state: "mismatch" };
  }

  if (availability.every((available) => !available)) return { state: "unreachable" };
  return { state: "mismatch" };
}

function assessReport(report, options) {
  const {
    expectedProfileSha256,
    phase,
    maximumEvidenceAgeMs,
    minimumConsecutiveSamples,
    minimumObservationSpanMs,
    approvedRunnerContexts,
    now,
  } = options;

  const invalid = (reason) => ({
    report,
    routeId: report?.source?.routeId ?? null,
    sourceId: report?.source?.id ?? null,
    runnerContext: report?.source?.runnerContext ?? null,
    networkContext: report?.source?.networkContext ?? null,
    valid: false,
    reason,
  });

  if (report?.schemaVersion !== 2) return invalid("onbekende of ontbrekende rapportversie");
  if (report?.phase !== phase) return invalid(`rapportfase ${report?.phase ?? "ontbreekt"} wijkt af van ${phase}`);
  if (report?.validationProfileSha256 !== expectedProfileSha256) {
    return invalid("meetrapport hoort niet bij het verwachte validatieprofiel");
  }
  if (
    !report?.source?.id
    || !report?.source?.routeId
    || !report?.source?.runnerContext
    || !report?.source?.networkContext
  ) return invalid("bron-, route-, runner- of netwerkidentiteit ontbreekt");

  const approvedRunner = approvedRunnerContexts.find((runner) => (
    runner.id === report.source.runnerContext
    && runner.networkCapable === true
    && runner.networkContexts.includes(report.source.networkContext)
  ));
  if (!approvedRunner || report?.runner?.approved !== true || report?.runner?.networkCapable !== true) {
    return invalid("meetresultaat komt niet uit een goedgekeurde netwerkgeschikte runnercontext");
  }
  if (report?.probeFailure?.kind === "local-runner-not-authorized") {
    return invalid(
      `lokale runner niet bevoegd: ${report.probeFailure.code ?? "onbekende permissiefout"}`,
    );
  }
  if (report?.probeFailure) {
    return invalid(
      `probe-uitval: ${report.probeFailure.kind ?? "onbekend"} (${report.probeFailure.code ?? "geen code"})`,
    );
  }
  if (!isIsoDate(report.startedAt) || !isIsoDate(report.completedAt)) {
    return invalid("geldige meettijd ontbreekt");
  }

  const startedAt = Date.parse(report.startedAt);
  const completedAt = Date.parse(report.completedAt);
  if (completedAt < startedAt) return invalid("meettijd loopt achteruit");
  if (completedAt - startedAt < minimumObservationSpanMs) {
    return invalid("observatievenster is korter dan de afgesproken convergentiegrens");
  }
  if (now - completedAt > maximumEvidenceAgeMs || completedAt - now > 60_000) {
    return invalid("bewijs is verouderd of ligt in de toekomst");
  }

  const control = assessSampleWindow(
    report?.endpoints?.control?.samples,
    minimumConsecutiveSamples,
    { requireAssertions: true },
  );
  if (control.state !== "pass") {
    return invalid(`controlehost valideert de meetroute niet: ${control.reason ?? control.state}`);
  }

  const target = assessSampleWindow(
    report?.endpoints?.target?.samples,
    minimumConsecutiveSamples,
    { requireAssertions: phase === "post-switch" },
  );
  if (!TERMINAL_TARGET_STATES.has(target.state)) {
    return invalid(`doelmeting is ongeldig: ${target.reason ?? target.state}`);
  }

  return {
    report,
    routeId: report.source.routeId,
    sourceId: report.source.id,
    runnerContext: report.source.runnerContext,
    networkContext: report.source.networkContext,
    valid: true,
    targetState: target.state,
  };
}

function summarizeRoutes(routeAssessments) {
  return routeAssessments.map((assessment) => ({
    sourceId: assessment.sourceId,
    routeId: assessment.routeId,
    runnerContext: assessment.runnerContext,
    networkContext: assessment.networkContext,
    valid: assessment.valid,
    targetState: assessment.targetState ?? null,
    reason: assessment.reason ?? null,
  }));
}

export function evaluateReleaseValidation({
  phase,
  reports,
  expectedProfileSha256,
  now = Date.now(),
  maximumEvidenceAgeMs = 10 * 60 * 1000,
  minimumConsecutiveSamples = 2,
  minimumIndependentRoutes = 2,
  minimumObservationSpanMs = 0,
  approvedRunnerContexts = [],
}) {
  if (!["preflight", "post-switch"].includes(phase)) {
    throw new Error("Validatiefase moet preflight of post-switch zijn.");
  }
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error("Ten minste één meetrapport is vereist.");
  }
  if (!expectedProfileSha256) {
    throw new Error("De SHA-256 van het validatieprofiel is vereist.");
  }
  if (!Array.isArray(approvedRunnerContexts) || approvedRunnerContexts.length === 0) {
    throw new Error("Minstens één goedgekeurde runnercontext is vereist.");
  }

  const assessed = reports.map((report) => assessReport(report, {
    expectedProfileSha256,
    phase,
    maximumEvidenceAgeMs,
    minimumConsecutiveSamples,
    minimumObservationSpanMs,
    approvedRunnerContexts,
    now,
  }));

  const seenRoutes = new Set();
  const seenNetworkContexts = new Set();
  const uniqueValidRoutes = [];
  const duplicateRoutes = [];
  const duplicateNetworkContexts = [];

  for (const assessment of assessed) {
    if (!assessment.valid) continue;
    if (seenRoutes.has(assessment.routeId)) {
      duplicateRoutes.push(assessment.routeId);
      continue;
    }
    if (seenNetworkContexts.has(assessment.networkContext)) {
      duplicateNetworkContexts.push(assessment.networkContext);
      continue;
    }
    seenRoutes.add(assessment.routeId);
    seenNetworkContexts.add(assessment.networkContext);
    uniqueValidRoutes.push(assessment);
  }

  const base = {
    phase,
    evidence: summarizeRoutes(assessed),
    independentValidRoutes: uniqueValidRoutes.length,
    requiredIndependentRoutes: minimumIndependentRoutes,
    duplicateRoutes: [...new Set(duplicateRoutes)],
    duplicateNetworkContexts: [...new Set(duplicateNetworkContexts)],
    rollbackRecommended: false,
  };

  if (uniqueValidRoutes.length < minimumIndependentRoutes) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.probeInvalid,
      releaseDecision: "stop",
      reason: "Onvoldoende onafhankelijke, vooraf gevalideerde meetroutes.",
    };
  }

  const states = uniqueValidRoutes.map((route) => route.targetState);
  if (states.every((state) => state === "pass")) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.pass,
      releaseDecision: phase === "preflight" ? "switch-eligible" : "accept-release",
      reason: "Alle vereiste onafhankelijke routes leveren overeenstemmend geldig bewijs.",
    };
  }

  const unanimousCriticalFailure = states.every((state) => (
    state === "unreachable" || state === "critical-mismatch"
  ));

  if (unanimousCriticalFailure) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      releaseDecision: phase === "preflight" ? "stop" : "rollback",
      rollbackRecommended: phase === "post-switch",
      reason: "Minstens twee onafhankelijke geldige routes bevestigen dezelfde kritieke productiefout.",
    };
  }

  return {
    ...base,
    classification: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
    releaseDecision: "stop",
    reason: "De meetroutes zijn geldig, maar leveren geen eenduidig bewijs dat de release aan de verwachtingen voldoet.",
  };
}
