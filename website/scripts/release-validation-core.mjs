export const RELEASE_VALIDATION_CLASSIFICATION = Object.freeze({
  pass: "Pass",
  probeInvalid: "Probe invalid",
  validationFailed: "Validation failed",
  productionFailed: "Production failed",
  propagationPending: "Propagation pending",
  propagationConverging: "Propagation converging",
  candidateStabilizing: "Candidate stabilizing",
  activationTimeout: "Activation timeout",
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

function requiredHealthAssertionsPass(sample, assertionIds) {
  if (!Array.isArray(assertionIds) || assertionIds.length === 0) return false;
  return assertionIds.every((id) => {
    const assertion = sample?.assertions?.find((item) => item.id === id);
    return assertion?.critical !== false && assertion?.pass === true;
  });
}

function hasHealthyHttpStatus(sample) {
  const status = sample?.http?.status;
  return Number.isInteger(status) && status >= 200 && status < 400;
}

function assessArtifactWindow(
  samples,
  minimumConsecutiveSamples,
  targetState,
  previousHealthAssertionIds,
) {
  if (!Array.isArray(samples) || samples.length < minimumConsecutiveSamples) {
    return {
      routeStatus: "probe-invalid",
      artifactIdentity: "unknown",
      reason: "onvoldoende meetpunten voor artefactherkenning",
    };
  }

  const window = samples.slice(-minimumConsecutiveSamples);
  const available = window.map(isLayerAvailable);
  if (available.every((value) => !value)) {
    return {
      routeStatus: "unreachable",
      artifactIdentity: "unknown",
      reason: "doel is gedurende het volledige meetvenster onbereikbaar",
    };
  }
  if (!available.every(Boolean)) {
    return {
      routeStatus: "transitioning",
      artifactIdentity: "mixed",
      reason: "bereikbaarheid wisselt binnen de meetronde",
    };
  }

  const identities = window.map((sample) => sample?.artifact?.identity ?? "unknown");
  const uniqueIdentities = [...new Set(identities)];
  if (uniqueIdentities.length > 1) {
    return {
      routeStatus: "transitioning",
      artifactIdentity: "mixed",
      reason: "artefactidentiteit wisselt binnen de meetronde",
    };
  }

  const [identity] = uniqueIdentities;
  if (identity === "candidate") {
    if (targetState === "pass") {
      return {
        routeStatus: "candidate-valid",
        artifactIdentity: "candidate",
        reason: "bevestigde kandidaat-release voldoet aan de kritieke assertions",
      };
    }
    return {
      routeStatus: "candidate-broken",
      artifactIdentity: "candidate",
      reason: "kandidaat-release is zichtbaar maar kritieke assertions falen",
    };
  }
  if (identity === "previous") {
    const previousHealthy = window.every((sample) => (
      hasHealthyHttpStatus(sample)
      && requiredHealthAssertionsPass(sample, previousHealthAssertionIds)
    ));
    if (!previousHealthy) {
      return {
        routeStatus: "unknown-or-broken",
        artifactIdentity: "previous",
        reason: "vorige release is herkend maar faalt release-onafhankelijke gezondheidscontroles",
      };
    }
    return {
      routeStatus: "previous-valid",
      artifactIdentity: "previous",
      reason: "vooraf vastgelegde vorige release is gezond zichtbaar",
    };
  }
  return {
    routeStatus: "unknown-or-broken",
    artifactIdentity: "unknown",
    reason: "response komt niet overeen met de vastgelegde vorige of kandidaat-release",
  };
}

function assessReport(report, options) {
  const {
    expectedProfileSha256,
    phase,
    maximumEvidenceAgeMs,
    minimumConsecutiveSamples,
    minimumObservationSpanMs,
    approvedRunnerContexts,
    requireArtifactIdentity = false,
    previousHealthAssertionIds = [],
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

  const artifact = requireArtifactIdentity
    ? assessArtifactWindow(
      report?.endpoints?.target?.samples,
      minimumConsecutiveSamples,
      target.state,
      previousHealthAssertionIds,
    )
    : null;

  return {
    report,
    routeId: report.source.routeId,
    sourceId: report.source.id,
    runnerContext: report.source.runnerContext,
    networkContext: report.source.networkContext,
    valid: true,
    targetState: target.state,
    routeStatus: artifact?.routeStatus ?? null,
    artifactIdentity: artifact?.artifactIdentity ?? null,
    artifactReason: artifact?.reason ?? null,
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
    routeStatus: assessment.routeStatus ?? null,
    artifactIdentity: assessment.artifactIdentity ?? null,
    artifactReason: assessment.artifactReason ?? null,
    reason: assessment.reason ?? null,
  }));
}

function assessIndependentRoutes(reports, options) {
  const assessed = reports.map((report) => assessReport(report, options));
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

  return {
    assessed,
    uniqueValidRoutes,
    duplicateRoutes: [...new Set(duplicateRoutes)],
    duplicateNetworkContexts: [...new Set(duplicateNetworkContexts)],
  };
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
  if (phase === "post-switch") {
    throw new Error(
      "Directe post-switch-evaluatie is niet toegestaan; gebruik de propagatiebewuste activatielaag.",
    );
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

function parseSwitchRequestedAt(value, now) {
  if (!isIsoDate(value)) {
    throw new Error("Post-switchactivatie vereist een geldige switchRequestedAt.");
  }
  const timestamp = Date.parse(value);
  if (timestamp > now + 60_000) {
    throw new Error("switchRequestedAt ligt onredelijk ver in de toekomst.");
  }
  return timestamp;
}

function roundCompletedAt(round) {
  const completed = (round?.reports ?? [])
    .map((report) => Date.parse(report?.completedAt))
    .filter(Number.isFinite);
  return completed.length > 0 ? Math.max(...completed) : null;
}

function countTrailingCandidateRounds(rounds) {
  let count = 0;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].allCandidate !== true) break;
    count += 1;
  }
  return count;
}

function firstRoundTime(rounds, predicate) {
  const match = rounds.find(predicate);
  return match?.completedAt ?? null;
}

function describeActivationRound({
  round,
  stableCandidateRounds,
  elapsedSinceSwitchMs,
  maximumPropagationMs,
  minimumIndependentRoutes,
  minimumStableRounds,
}) {
  if (round.independentValidRoutes < minimumIndependentRoutes) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.probeInvalid,
      reason: "Onvoldoende onafhankelijke geldige meetroutes.",
    };
  }
  const statuses = round.routeStatuses;
  if (statuses.every((status) => status === "unreachable")) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      reason: "Alle vereiste routes bevestigen onbereikbaarheid.",
    };
  }
  if (statuses.every((status) => status === "candidate-broken")) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      reason: "Alle vereiste routes bevestigen een kritisch falende kandidaat.",
    };
  }
  if (statuses.every((status) => status === "unknown-or-broken")) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      reason: "Alle vereiste routes bevestigen een onbekend of beschadigd artefact.",
    };
  }
  if (round.allCandidate) {
    return stableCandidateRounds >= minimumStableRounds
      ? {
        activationStatus: RELEASE_VALIDATION_CLASSIFICATION.pass,
        reason: "Vereiste opeenvolgende stabiele kandidaatrondes zijn bevestigd.",
      }
      : {
        activationStatus: RELEASE_VALIDATION_CLASSIFICATION.candidateStabilizing,
        reason: "Kandidaat is overal zichtbaar maar nog niet lang genoeg stabiel.",
      };
  }
  if (elapsedSinceSwitchMs >= maximumPropagationMs
    && (round.allPrevious || round.healthyConvergence)) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.activationTimeout,
      reason: "De gezonde activatie is niet binnen het propagatiebudget geconvergeerd.",
    };
  }
  if (round.allPrevious) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.propagationPending,
      reason: "De bevestigde vorige release is nog gezond zichtbaar.",
    };
  }
  if (round.healthyConvergence) {
    return {
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.propagationConverging,
      reason: "Routes tonen een gezonde mix van vorige en kandidaat-release.",
    };
  }
  return {
    activationStatus: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
    reason: "De ronde levert tijdelijk geen eenduidig activatiebewijs.",
  };
}

export function evaluatePostSwitchActivation({
  rounds,
  expectedProfileSha256,
  switchRequestedAt,
  now = Date.now(),
  maximumEvidenceAgeMs = 10 * 60 * 1000,
  minimumConsecutiveSamples = 2,
  minimumIndependentRoutes = 2,
  minimumObservationSpanMs = 0,
  approvedRunnerContexts = [],
  maximumPropagationMs = 20 * 60 * 1000,
  pollIntervalMs = 60_000,
  minimumStableRounds = 3,
  previousHealthAssertionIds = [],
}) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    throw new Error("Post-switchactivatie vereist minstens één volledige meetronde.");
  }
  if (!expectedProfileSha256) {
    throw new Error("De SHA-256 van het validatieprofiel is vereist.");
  }
  if (!Array.isArray(approvedRunnerContexts) || approvedRunnerContexts.length === 0) {
    throw new Error("Minstens één goedgekeurde runnercontext is vereist.");
  }
  if (!Number.isFinite(maximumPropagationMs) || maximumPropagationMs <= 0) {
    throw new Error("maximumPropagationMs moet een positief getal zijn.");
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error("pollIntervalMs moet een positief getal zijn.");
  }
  if (!Number.isInteger(minimumStableRounds) || minimumStableRounds < 1) {
    throw new Error("minimumStableRounds moet minstens 1 zijn.");
  }

  const switchTimestamp = parseSwitchRequestedAt(switchRequestedAt, now);
  const elapsedSinceSwitchMs = Math.max(0, now - switchTimestamp);
  const remainingPropagationMs = Math.max(0, maximumPropagationMs - elapsedSinceSwitchMs);

  const assessedRounds = rounds.map((round, index) => {
    const reports = round?.reports ?? [];
    const completedAtMs = roundCompletedAt(round);
    const roundNow = completedAtMs ?? now;
    const {
      assessed,
      uniqueValidRoutes,
      duplicateRoutes,
      duplicateNetworkContexts,
    } = assessIndependentRoutes(reports, {
      expectedProfileSha256,
      phase: "post-switch",
      maximumEvidenceAgeMs: Math.max(
        maximumEvidenceAgeMs,
        maximumPropagationMs + pollIntervalMs,
      ),
      minimumConsecutiveSamples,
      minimumObservationSpanMs,
      approvedRunnerContexts,
      requireArtifactIdentity: true,
      previousHealthAssertionIds,
      now: roundNow,
    });
    const routeStatuses = uniqueValidRoutes.map((route) => route.routeStatus);
    return {
      roundNumber: round?.roundNumber ?? index + 1,
      startedAt: round?.startedAt ?? reports[0]?.startedAt ?? null,
      completedAt: completedAtMs === null ? null : new Date(completedAtMs).toISOString(),
      evidence: summarizeRoutes(assessed),
      independentValidRoutes: uniqueValidRoutes.length,
      duplicateRoutes,
      duplicateNetworkContexts,
      routeStatuses,
      allCandidate: uniqueValidRoutes.length >= minimumIndependentRoutes
        && routeStatuses.every((status) => status === "candidate-valid"),
      anyCandidate: routeStatuses.some((status) => (
        status === "candidate-valid" || status === "candidate-broken"
      )),
      allPrevious: uniqueValidRoutes.length >= minimumIndependentRoutes
        && routeStatuses.every((status) => status === "previous-valid"),
      healthyConvergence: uniqueValidRoutes.length >= minimumIndependentRoutes
        && routeStatuses.every((status) => (
          status === "previous-valid"
          || status === "candidate-valid"
          || status === "transitioning"
        ))
        && new Set(routeStatuses).size > 1,
    };
  });

  const currentRound = assessedRounds.at(-1);
  const stableCandidateRounds = countTrailingCandidateRounds(assessedRounds);
  const roundTimeline = assessedRounds.map((round, index) => {
    const completedAtMs = Date.parse(round.completedAt);
    const roundElapsedMs = Number.isFinite(completedAtMs)
      ? Math.max(0, completedAtMs - switchTimestamp)
      : elapsedSinceSwitchMs;
    const roundStableCandidateRounds = countTrailingCandidateRounds(
      assessedRounds.slice(0, index + 1),
    );
    return {
      ...round,
      elapsedSinceSwitchMs: roundElapsedMs,
      remainingPropagationMs: Math.max(0, maximumPropagationMs - roundElapsedMs),
      stableCandidateRounds: roundStableCandidateRounds,
      ...describeActivationRound({
        round,
        stableCandidateRounds: roundStableCandidateRounds,
        elapsedSinceSwitchMs: roundElapsedMs,
        maximumPropagationMs,
        minimumIndependentRoutes,
        minimumStableRounds,
      }),
    };
  });
  const routeDifferencesObserved = assessedRounds.some((round) => (
    round.healthyConvergence || new Set(round.routeStatuses).size > 1
  ));
  const firstCandidateVisibleAt = firstRoundTime(assessedRounds, (round) => round.anyCandidate);
  const allRoutesCandidateAt = firstRoundTime(assessedRounds, (round) => round.allCandidate);
  const stabilityConfirmedAt = stableCandidateRounds >= minimumStableRounds
    ? currentRound.completedAt
    : null;

  const base = {
    phase: "post-switch",
    switchRequestedAt: new Date(switchTimestamp).toISOString(),
    elapsedSinceSwitchMs,
    maximumPropagationMs,
    remainingPropagationMs,
    pollIntervalMs,
    currentRound: currentRound.roundNumber,
    minimumStableRounds,
    stableCandidateRounds,
    independentValidRoutes: currentRound.independentValidRoutes,
    requiredIndependentRoutes: minimumIndependentRoutes,
    routeStatus: currentRound.evidence,
    rounds: roundTimeline,
    firstCandidateVisibleAt,
    allRoutesCandidateAt,
    stabilityConfirmedAt,
    routeDifferencesObserved,
    rollbackRecommended: false,
    terminal: false,
  };

  if (currentRound.independentValidRoutes < minimumIndependentRoutes) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.probeInvalid,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.probeInvalid,
      releaseDecision: "stop",
      terminal: true,
      reason: "Onvoldoende onafhankelijke geldige meetroutes; ongeldig bewijs leidt nooit tot acceptatie of rollback.",
    };
  }

  const statuses = currentRound.routeStatuses;
  const unanimousUnreachable = statuses.every((status) => status === "unreachable");
  const unanimousCandidateBroken = statuses.every((status) => status === "candidate-broken");
  const unanimousUnknown = statuses.every((status) => status === "unknown-or-broken");

  if (unanimousUnreachable || unanimousCandidateBroken || unanimousUnknown) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.productionFailed,
      releaseDecision: "rollback",
      rollbackRecommended: true,
      terminal: true,
      reason: unanimousUnreachable
        ? "Minstens twee onafhankelijke geldige routes bevestigen duurzame onbereikbaarheid."
        : unanimousCandidateBroken
          ? "Minstens twee onafhankelijke geldige routes bevestigen een actieve maar kritisch falende kandidaat."
          : "Minstens twee onafhankelijke geldige routes bevestigen een onbekend of beschadigd artefact.",
    };
  }

  if (currentRound.allCandidate) {
    if (stableCandidateRounds >= minimumStableRounds) {
      return {
        ...base,
        classification: RELEASE_VALIDATION_CLASSIFICATION.pass,
        activationStatus: RELEASE_VALIDATION_CLASSIFICATION.pass,
        releaseDecision: "accept-release",
        terminal: true,
        reason: `Alle vereiste routes tonen de kandidaat gedurende ${stableCandidateRounds} opeenvolgende volledige meetrondes.`,
      };
    }
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.candidateStabilizing,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.candidateStabilizing,
      releaseDecision: "wait-and-retry",
      reason: `Kandidaat is overal zichtbaar; nog ${minimumStableRounds - stableCandidateRounds} stabiele meetronde(n) vereist.`,
    };
  }

  if (elapsedSinceSwitchMs >= maximumPropagationMs) {
    if (currentRound.allPrevious || currentRound.healthyConvergence) {
      return {
        ...base,
        classification: RELEASE_VALIDATION_CLASSIFICATION.activationTimeout,
        activationStatus: RELEASE_VALIDATION_CLASSIFICATION.activationTimeout,
        releaseDecision: "restore-previous-root",
        terminal: true,
        reason: currentRound.allPrevious
          ? "De bevestigde vorige release bleef gezond tot na het propagatiebudget."
          : "De infrastructuur bleef tot na het propagatiebudget verdeeld tussen vorige en kandidaat-release.",
      };
    }
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
      releaseDecision: "stop",
      terminal: true,
      reason: "Het propagatiebudget is verstreken zonder voldoende bewijs voor acceptatie, herstel of rollback.",
    };
  }

  if (currentRound.allPrevious) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.propagationPending,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.propagationPending,
      releaseDecision: "wait-and-retry",
      reason: "Productie is gezond op de bevestigde vorige release; de DocumentRoot-wijziging is nog niet overal actief.",
    };
  }

  if (currentRound.healthyConvergence) {
    return {
      ...base,
      classification: RELEASE_VALIDATION_CLASSIFICATION.propagationConverging,
      activationStatus: RELEASE_VALIDATION_CLASSIFICATION.propagationConverging,
      releaseDecision: "wait-and-retry",
      reason: "Geldige routes tonen een gezonde mix van vorige en kandidaat-release; de serveerlagen convergeren nog.",
    };
  }

  return {
    ...base,
    classification: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
    activationStatus: RELEASE_VALIDATION_CLASSIFICATION.validationFailed,
    releaseDecision: "wait-and-retry",
    reason: "De geldige routes leveren tijdelijk geen eenduidig bewijs; opnieuw meten zonder rollback.",
  };
}
