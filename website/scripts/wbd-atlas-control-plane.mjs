import { createHash, randomUUID } from "node:crypto";

const ATTENTION_TYPES = new Set([
  "STORING",
  "VRAAG_UITLEG",
  "FRICTIE",
  "IDEE_KANS",
  "NIEUWE_SCOPE",
  "COMMERCIAL_OPPORTUNITY",
  "TECHNICAL_VERIFICATION",
  "PRODUCT_LEARNING",
]);
const LEVELS = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_EVIDENCE"]);
const FRESHNESS = new Set(["LIVE", "RECENT", "STALE", "UNAVAILABLE", "UNKNOWN"]);
const GO_REQUIREMENTS = new Set(["NONE", "REQUIRED", "FAIL_CLOSED"]);
const ACTION_STAGES = new Set(["OBSERVE", "ANALYZE", "PREPARE", "EXECUTE"]);
const MATURITY = new Set(["CONCEPT", "BUILT", "FIRST_REAL_USE", "PROVEN", "REUSABLE"]);
const SCOPE_CLASSES = new Set(["CUSTOMER_SPECIFIC", "GENERIC", "GENERIC_WITH_CONFIGURATION", "UNRESOLVED"]);
const MATERIAL_ACTIONS = new Set([
  "PRODUCTION_CHANGE", "DEPLOYMENT", "SECURITY_ACCESS_CHANGE", "DESTRUCTIVE_DELETE",
  "PUBLICATION", "EXTERNAL_CUSTOMER_COMMUNICATION", "PURCHASE", "PAID_SERVICE_ACTIVATION",
  "FINANCIAL_ACTION", "RISKY_INFRASTRUCTURE_CHANGE", "CAPABILITY_PRODUCT_PROMOTION",
]);

const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const required = (value, label, maximum = 2_000) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw new Error(`${label} is ongeldig.`);
  return text;
};
const enumValue = (value, allowed, label) => {
  if (!allowed.has(value)) throw new Error(`${label} is ongeldig.`);
  return value;
};
const unique = (values) => [...new Set(values.filter(Boolean))];

export function classifyActionPolicy(actionType) {
  const normalized = String(actionType ?? "").trim().toUpperCase();
  if (!normalized) return { stage: "EXECUTE", goRequirement: "FAIL_CLOSED", reason: "De risicoklasse is niet betrouwbaar bepaald." };
  if (MATERIAL_ACTIONS.has(normalized)) return { stage: "EXECUTE", goRequirement: "REQUIRED", reason: "Deze actie heeft materiële externe of onomkeerbare impact." };
  if (new Set(["READ", "SEARCH", "FETCH", "NORMALIZE", "COMPARE", "CLASSIFY", "DEDUPE", "ANALYZE", "HARVEST", "DRAFT", "PREPARE"]).has(normalized)) {
    return { stage: normalized === "PREPARE" || normalized === "DRAFT" ? "PREPARE" : normalized === "READ" || normalized === "FETCH" ? "OBSERVE" : "ANALYZE", goRequirement: "NONE", reason: "Autonome analyse binnen geautoriseerde bronnen." };
  }
  return { stage: "EXECUTE", goRequirement: "FAIL_CLOSED", reason: "Onbekende acties worden fail-closed behandeld." };
}

export function assertCapabilityMaturityTransition({ from, to, evidenceRefs = [], humanApproved = false }) {
  enumValue(from, MATURITY, "Huidige maturity");
  enumValue(to, MATURITY, "Nieuwe maturity");
  const order = ["CONCEPT", "BUILT", "FIRST_REAL_USE", "PROVEN", "REUSABLE"];
  if (order.indexOf(to) > order.indexOf(from) + 1) throw new Error("Capability maturity mag geen bewijsstap overslaan.");
  if (order.indexOf(to) > order.indexOf(from) && evidenceRefs.length === 0) throw new Error("Capability-promotie vereist evidence.");
  if (new Set(["PROVEN", "REUSABLE"]).has(to) && !humanApproved) throw new Error("PROVEN en REUSABLE vereisen een traceerbare menselijke productbeslissing.");
  return { from, to, evidenceRefs: unique(evidenceRefs), humanApproved };
}

function evidenceFreshness(observedAt, now = new Date()) {
  const age = now.getTime() - new Date(observedAt).getTime();
  if (!Number.isFinite(age)) return "UNKNOWN";
  if (age <= 60 * 60 * 1_000) return "LIVE";
  if (age <= 7 * 24 * 60 * 60 * 1_000) return "RECENT";
  return "STALE";
}

function seedCapabilityEvidence(capabilities, now) {
  const byIdentity = new Map();
  for (const capability of capabilities ?? []) {
    for (const item of capability.evidence ?? []) {
      const identity = sha256(stableJson({ capabilityId: capability.id, source: item.source, date: item.date, summary: item.summary }));
      const id = `evidence-capability-${identity.slice(0, 24)}`;
      byIdentity.set(id, {
        id,
        organizationId: capability.provenAt?.[0] === "Sportpaleis" || capability.provenAt?.some((value) => value.includes("Sportpaleis")) ? "sportpaleis" : "we-build-and-design",
        source: item.source,
        sourceType: "REPOSITORY_EVIDENCE",
        sourceIdentity: item.source,
        observedAt: `${item.date}T12:00:00.000Z`,
        fetchedAt: iso(now),
        rawReference: { kind: "repository", locator: item.source, immutable: /\b(?:commit|release|test|docs?\/)/iu.test(item.source) },
        normalized: { summary: item.summary, proofContext: item.provenAt, evidenceType: item.type },
        provenance: { ingestion: "CAPABILITY_CATALOG_SEED", schemaVersion: 1, contentHash: identity },
        freshness: evidenceFreshness(`${item.date}T12:00:00.000Z`, now),
        confidence: /TEST|PRODUCTION|RELEASE|END_TO_END/iu.test(item.type) ? "HIGH" : "MEDIUM",
        reliability: /TEST|PRODUCTION|RELEASE|END_TO_END/iu.test(item.type) ? "PRIMARY_OR_VERIFIED" : "DOCUMENTED",
        relatedEntityRefs: unique(capability.provenAt ?? []),
        capabilityRefs: [capability.id],
      });
    }
  }
  return [...byIdentity.values()];
}

export function createInitialAtlasControlPlane({ capabilities = [], now = new Date() } = {}) {
  return validateAtlasControlPlane({
    schemaVersion: 1,
    evidence: seedCapabilityEvidence(capabilities, now),
    attention: [],
    nextBestActions: [],
    preparedActions: [],
    harvestCandidates: [],
    capabilityEvidenceLinks: seedCapabilityEvidence(capabilities, now).map((item) => ({ evidenceId: item.id, capabilityId: item.capabilityRefs[0], linkedAt: iso(now), source: "CAPABILITY_CATALOG_SEED" })),
    connectorStates: {},
    audit: [],
    lastVisitedAt: null,
    interpretationMode: "DETERMINISTIC",
  });
}

function validateEvidence(item) {
  return {
    ...structuredClone(item),
    id: required(item.id, "Evidence-ID", 160),
    organizationId: required(item.organizationId, "Evidence-organisatie", 160),
    source: required(item.source, "Evidencebron", 1_000),
    sourceType: required(item.sourceType, "Evidencebrontype", 120),
    sourceIdentity: required(item.sourceIdentity, "Evidencebronidentiteit", 1_000),
    observedAt: iso(item.observedAt), fetchedAt: iso(item.fetchedAt),
    freshness: enumValue(item.freshness, FRESHNESS, "Evidence-freshness"),
    confidence: enumValue(item.confidence, CONFIDENCE, "Evidence-confidence"),
    relatedEntityRefs: unique(item.relatedEntityRefs ?? []), capabilityRefs: unique(item.capabilityRefs ?? []),
  };
}

function validateAttention(item) {
  return {
    ...structuredClone(item), id: required(item.id, "Attention-ID", 160), situationKey: required(item.situationKey, "Attention-situatie", 240),
    organizationId: required(item.organizationId, "Attention-organisatie", 160), source: required(item.source, "Attentionbron", 200),
    type: enumValue(item.type, ATTENTION_TYPES, "Attentiontype"), title: required(item.title, "Attentiontitel", 240), summary: required(item.summary, "Attentionsamenvatting"),
    severity: enumValue(item.severity, LEVELS, "Attentionseverity"), urgency: enumValue(item.urgency, LEVELS, "Attentionurgentie"), confidence: enumValue(item.confidence, CONFIDENCE, "Attention-confidence"),
    evidenceRefs: unique(item.evidenceRefs ?? []), firstObservedAt: iso(item.firstObservedAt), lastObservedAt: iso(item.lastObservedAt),
    status: new Set(["OPEN", "WAITING", "RESOLVED", "SUPPRESSED"]).has(item.status) ? item.status : "OPEN",
    goRequirement: enumValue(item.goRequirement, GO_REQUIREMENTS, "GO-requirement"), occurrenceCount: Number.isSafeInteger(item.occurrenceCount) ? item.occurrenceCount : 1,
  };
}

export function validateAtlasControlPlane(input) {
  const plane = structuredClone(input ?? {});
  if (plane.schemaVersion !== 1) throw new Error("Atlas Control Plane schema is ongeldig.");
  plane.evidence = (plane.evidence ?? []).map(validateEvidence);
  plane.attention = (plane.attention ?? []).map(validateAttention);
  plane.nextBestActions = Array.isArray(plane.nextBestActions) ? plane.nextBestActions : [];
  plane.preparedActions = Array.isArray(plane.preparedActions) ? plane.preparedActions : [];
  plane.harvestCandidates = Array.isArray(plane.harvestCandidates) ? plane.harvestCandidates : [];
  plane.capabilityEvidenceLinks = Array.isArray(plane.capabilityEvidenceLinks) ? plane.capabilityEvidenceLinks : [];
  plane.connectorStates = plane.connectorStates && typeof plane.connectorStates === "object" && !Array.isArray(plane.connectorStates) ? plane.connectorStates : {};
  plane.audit = Array.isArray(plane.audit) ? plane.audit.slice(-2_000) : [];
  plane.lastVisitedAt = plane.lastVisitedAt ? iso(plane.lastVisitedAt) : null;
  plane.interpretationMode = "DETERMINISTIC";
  return plane;
}

function appendAudit(plane, eventType, subjectId, occurredAt, details = {}) {
  plane.audit.push({ id: `atlas-audit-${randomUUID()}`, eventType, subjectId, occurredAt: iso(occurredAt), actor: "ATLAS_DETERMINISTIC", details });
  if (plane.audit.length > 2_000) plane.audit.splice(0, plane.audit.length - 2_000);
}

function upsertAttention(plane, draft, now) {
  const existing = plane.attention.find((item) => item.situationKey === draft.situationKey && new Set(["OPEN", "WAITING"]).has(item.status));
  if (existing) {
    existing.lastObservedAt = iso(now); existing.evidenceRefs = unique([...existing.evidenceRefs, ...draft.evidenceRefs]); existing.occurrenceCount += 1;
    existing.summary = draft.summary; existing.confidence = draft.confidence;
    appendAudit(plane, "ATTENTION_UPDATED", existing.id, now, { situationKey: existing.situationKey, occurrenceCount: existing.occurrenceCount });
    return existing;
  }
  const attention = validateAttention({ id: `attention-${sha256(draft.situationKey).slice(0, 24)}`, occurrenceCount: 1, status: "OPEN", owner: "wbd-owner-donovan", relatedCapabilityRef: null, relatedEntityRef: draft.organizationId, atlasInterpretation: draft.atlasInterpretation, nextBestActionId: null, resolution: null, harvestReference: null, ...draft, firstObservedAt: iso(now), lastObservedAt: iso(now) });
  plane.attention.push(attention);
  appendAudit(plane, "ATTENTION_CREATED", attention.id, now, { type: attention.type, situationKey: attention.situationKey });
  return attention;
}

function upsertNextBestAction(plane, attention, draft, now) {
  const id = `nba-${sha256(attention.situationKey).slice(0, 24)}`;
  const nba = {
    id, attentionId: attention.id, organizationId: attention.organizationId, recommendation: draft.recommendation, why: draft.why,
    evidenceRefs: unique(draft.evidenceRefs), confidence: draft.confidence, expectedImpact: draft.expectedImpact,
    estimatedHumanEffortMinutes: draft.estimatedHumanEffortMinutes, risk: draft.risk, dependencies: draft.dependencies ?? [],
    atlasCanPrepare: draft.atlasCanPrepare ?? [], goRequirement: draft.goRequirement, preparedActionId: draft.preparedActionId ?? null,
    status: "PROPOSED", createdAt: plane.nextBestActions.find((item) => item.id === id)?.createdAt ?? iso(now), updatedAt: iso(now), mode: "DETERMINISTIC",
  };
  const index = plane.nextBestActions.findIndex((item) => item.id === id);
  if (index >= 0) plane.nextBestActions[index] = nba; else plane.nextBestActions.push(nba);
  attention.nextBestActionId = id;
  appendAudit(plane, index >= 0 ? "NBA_UPDATED" : "NBA_GENERATED", id, now, { attentionId: attention.id, goRequirement: nba.goRequirement });
  return nba;
}

function upsertPreparedAction(plane, attention, evidenceRefs, now) {
  const id = `prepared-${sha256(attention.situationKey).slice(0, 24)}`;
  const action = {
    id, attentionId: attention.id, objective: "Beoordeel de inhoudelijke betekenis van de websitewijziging zonder opnieuw brondata te verzamelen.",
    reason: "Atlas heeft de vorige en huidige metadata, hashes en bronherkomst al naast elkaar gezet.", evidenceRefs: unique(evidenceRefs),
    impact: "Een ownerbeslissing kan zich beperken tot positionering en eventuele vervolgactie.", risk: "LOW",
    dependencies: [], rollbackOrRecovery: "Geen externe wijziging voorbereid; verwerpen laat de bron en centrale evidence intact.",
    goRequirement: "NONE", executionPolicy: "PREPARE_ONLY", status: "READY", createdAt: iso(now),
  };
  const index = plane.preparedActions.findIndex((item) => item.id === id);
  if (index >= 0) plane.preparedActions[index] = action; else plane.preparedActions.push(action);
  return action;
}

export function ingestConnectorSnapshot(inputPlane, snapshot, now = new Date()) {
  const plane = validateAtlasControlPlane(inputPlane);
  const connectorId = required(snapshot.connectorId, "Connector-ID", 160);
  const previousConnectorState = plane.connectorStates[connectorId] ?? null;
  plane.connectorStates[connectorId] = structuredClone(snapshot);
  appendAudit(plane, snapshot.status === "FAILED" ? "CONNECTOR_FAILED" : "CONNECTOR_REFRESHED", connectorId, now, { status: snapshot.status, failureCount: snapshot.consecutiveFailures ?? 0 });

  if (snapshot.status === "FAILED") {
    if ((snapshot.consecutiveFailures ?? 0) >= 3) {
      const attention = upsertAttention(plane, {
        situationKey: `connector-failure:${connectorId}`, organizationId: snapshot.organizationId, source: connectorId,
        type: "TECHNICAL_VERIFICATION", title: "Bron tijdelijk niet betrouwbaar beschikbaar",
        summary: `De connector faalde ${snapshot.consecutiveFailures} keer achter elkaar. Laatst bekende veilige state blijft beschikbaar en wordt niet als live gepresenteerd.`,
        severity: "MEDIUM", urgency: "MEDIUM", confidence: "HIGH", evidenceRefs: [], goRequirement: "NONE",
        atlasInterpretation: "Structurele connectorfailure vraagt technische verificatie; inhoudelijke conclusies worden gepauzeerd.",
      }, now);
      upsertNextBestAction(plane, attention, { recommendation: "Controleer de bronbereikbaarheid en connectorlogs.", why: "Nieuwe conclusies zijn geblokkeerd totdat een succesvolle refresh de bron herstelt.", evidenceRefs: [], confidence: "HIGH", expectedImpact: "Herstelt actuele evidence zonder de Owner Workspace te blokkeren.", estimatedHumanEffortMinutes: 0, risk: "LOW", dependencies: [connectorId], atlasCanPrepare: ["retry uitvoeren", "foutcode groeperen", "laatst bekende state bewaren"], goRequirement: "NONE" }, now);
    }
    return plane;
  }

  const failureAttention = plane.attention.find((item) => item.situationKey === `connector-failure:${connectorId}` && item.status === "OPEN");
  if (failureAttention) {
    failureAttention.status = "RESOLVED"; failureAttention.resolution = { summary: "Connectorrefresh is opnieuw geslaagd.", resolvedAt: iso(now), resolvedBy: "ATLAS_DETERMINISTIC" };
    appendAudit(plane, "ATTENTION_RESOLVED", failureAttention.id, now, { reason: "CONNECTOR_RECOVERED" });
  }

  const activationAttention = plane.attention.find((item) => item.situationKey === `connector-activation:${connectorId}` && item.status === "OPEN");
  if (activationAttention && previousConnectorState?.lastSuccessfulAt) {
    activationAttention.status = "RESOLVED";
    activationAttention.resolution = { summary: "Een opvolgende server-side refresh is opnieuw geslaagd.", resolvedAt: iso(now), resolvedBy: "ATLAS_DETERMINISTIC" };
    appendAudit(plane, "ATTENTION_RESOLVED", activationAttention.id, now, { reason: "CONNECTOR_STABILITY_CONFIRMED" });
  }

  const evidenceId = `evidence-${connectorId}-${snapshot.normalizedHash.slice(0, 24)}`;
  const evidenceCreated = !plane.evidence.some((item) => item.id === evidenceId);
  if (evidenceCreated) {
    plane.evidence.push(validateEvidence({
      id: evidenceId, organizationId: snapshot.organizationId, source: snapshot.sourceUrl, sourceType: "LIVE_CONNECTOR",
      sourceIdentity: snapshot.sourceIdentity, observedAt: snapshot.observedAt, fetchedAt: snapshot.fetchedAt,
      rawReference: { kind: "remote-source", locator: snapshot.sourceUrl, immutable: false, contentHash: snapshot.rawHash },
      normalized: snapshot.normalized, provenance: snapshot.provenance, freshness: snapshot.freshness,
      confidence: "HIGH", reliability: "DIRECT_READ", relatedEntityRefs: [snapshot.organizationId], capabilityRefs: ["connectors-snapshot-diff"],
    }));
    plane.capabilityEvidenceLinks.push({ evidenceId, capabilityId: "connectors-snapshot-diff", linkedAt: iso(now), source: connectorId });
    appendAudit(plane, "EVIDENCE_INGESTED", evidenceId, now, { connectorId, normalizedHash: snapshot.normalizedHash });
  }

  const firstCentralSuccess = !previousConnectorState?.lastSuccessfulAt;
  const stableAgainstImportedBaseline = !snapshot.previousNormalizedHash || snapshot.previousNormalizedHash === snapshot.normalizedHash;
  if (evidenceCreated && firstCentralSuccess && stableAgainstImportedBaseline) {
    const attention = upsertAttention(plane, {
      situationKey: `connector-activation:${connectorId}`, organizationId: snapshot.organizationId, source: connectorId,
      type: "TECHNICAL_VERIFICATION", title: "Eerste live WBD-bron is verbonden",
      summary: "Atlas heeft de publieke WBD-homepage server-side gelezen, genormaliseerd en met herleidbare provenance centraal vastgelegd.",
      severity: "LOW", urgency: "LOW", confidence: "HIGH", evidenceRefs: [evidenceId], goRequirement: "NONE",
      atlasInterpretation: "De eerste live read bewijst de connectorroute. Een volgende succesvolle refresh kan de operationele stabiliteit autonoom bevestigen.",
    }, now);
    upsertNextBestAction(plane, attention, {
      recommendation: "Laat Atlas de volgende geplande refresh zelfstandig uitvoeren.",
      why: "Een tweede succesvolle read bevestigt dat dit geen eenmalige verbinding was.", evidenceRefs: [evidenceId], confidence: "HIGH",
      expectedImpact: "Bevestigt duurzame actuele evidence zonder werk voor Donovan.", estimatedHumanEffortMinutes: 0, risk: "LOW",
      dependencies: [connectorId], atlasCanPrepare: ["background refresh uitvoeren", "hash vergelijken", "freshness en connectorhealth bijwerken"], goRequirement: "NONE",
    }, now);
  }

  if (evidenceCreated && (snapshot.changedFields ?? []).length > 0) {
    const labels = snapshot.changedFields.map((item) => item.label).join(", ");
    const attention = upsertAttention(plane, {
      situationKey: `website-metadata-change:${snapshot.organizationId}:${snapshot.normalizedHash}`, organizationId: snapshot.organizationId, source: connectorId,
      type: "PRODUCT_LEARNING", title: "Publieke WBD-positionering is gewijzigd",
      summary: `Atlas vergeleek de actuele homepage met de vorige bekende bronstaat. Gewijzigd: ${labels}.`,
      severity: "MEDIUM", urgency: "LOW", confidence: "HIGH", evidenceRefs: [evidenceId, snapshot.previousEvidenceId].filter(Boolean), goRequirement: "NONE",
      atlasInterpretation: "Dit is een bronfeit en een productleersignaal; de zakelijke betekenis is nog een hypothese.",
    }, now);
    const prepared = upsertPreparedAction(plane, attention, attention.evidenceRefs, now);
    upsertNextBestAction(plane, attention, {
      recommendation: "Beoordeel of de gewijzigde positionering nog aansluit op de actuele WBD-propositie.",
      why: "Publieke metadata beïnvloedt zoekresultaten, delen en de eerste verwachting van prospects.", evidenceRefs: attention.evidenceRefs,
      confidence: "MEDIUM", expectedImpact: "Voorkomt dat publieke belofte en werkelijke capabilityrichting uit elkaar lopen.", estimatedHumanEffortMinutes: 5,
      risk: "LOW", dependencies: ["Betekenis van de wijziging bevestigen"], atlasCanPrepare: ["bronverschil samenvatten", "impacthypothese formuleren", "reviewvragen klaarzetten"], goRequirement: "NONE", preparedActionId: prepared.id,
    }, now);
  }
  return plane;
}

function upsertProductPreparedAction(plane, attention, draft, now) {
  const id = `prepared-product-${sha256(attention.situationKey).slice(0, 24)}`;
  const action = {
    id,
    attentionId: attention.id,
    objective: draft.objective,
    reason: draft.reason,
    evidenceRefs: unique(draft.evidenceRefs),
    impact: draft.impact,
    risk: draft.risk ?? "LOW",
    dependencies: draft.dependencies ?? [],
    rollbackOrRecovery: draft.rollbackOrRecovery ?? "Geen externe wijziging; afwijzen bewaart Product Truth en evidence ongewijzigd.",
    goRequirement: draft.goRequirement ?? "REQUIRED",
    executionPolicy: "PREPARE_ONLY",
    status: "READY",
    createdAt: plane.preparedActions.find((item) => item.id === id)?.createdAt ?? iso(now),
  };
  const index = plane.preparedActions.findIndex((item) => item.id === id);
  if (index >= 0) plane.preparedActions[index] = action; else plane.preparedActions.push(action);
  return action;
}

export function ingestProductTruthEvents(inputPlane, { events = [], issues = [] } = {}, now = new Date()) {
  const plane = validateAtlasControlPlane(inputPlane);
  for (const event of events) {
    if (event?.type !== "RELEASE_INGESTED" || !event.release || !event.candidate) continue;
    const { release, candidate } = event;
    const evidenceId = candidate.evidenceRefs[0];
    if (!plane.evidence.some(({ id }) => id === evidenceId)) {
      plane.evidence.push(validateEvidence({
        id: evidenceId,
        organizationId: "we-build-and-design",
        source: `RELEASE-MANIFEST.json#${release.id}`,
        sourceType: "IMMUTABLE_RELEASE",
        sourceIdentity: `${release.tag}:${release.commit}`,
        observedAt: release.observedAt,
        fetchedAt: iso(now),
        rawReference: { kind: "release-manifest", locator: release.id, immutable: true, contentHash: release.manifestHash },
        normalized: {
          summary: `Release ${release.id} is verwerkt tot herleidbare Product Truth-evidence.`,
          commit: release.commit,
          moduleIds: release.moduleIds,
          capabilityIds: release.capabilityIds,
          inferenceConfidence: release.inferenceConfidence,
        },
        provenance: { ingestion: "IMMUTABLE_RELEASE_HARVEST", schemaVersion: 1, contentHash: release.manifestHash, validationStatus: release.validationStatus },
        freshness: evidenceFreshness(release.observedAt, now),
        confidence: "HIGH",
        reliability: "IMMUTABLE_MANIFEST",
        relatedEntityRefs: [release.id, ...release.moduleIds],
        capabilityRefs: release.capabilityIds,
      }));
      appendAudit(plane, "EVIDENCE_INGESTED", evidenceId, now, { sourceType: "IMMUTABLE_RELEASE", releaseId: release.id });
    }
    if (!plane.harvestCandidates.some(({ id }) => id === candidate.id)) {
      plane.harvestCandidates.push({
        id: candidate.id,
        sourceAttentionId: null,
        organizationId: "we-build-and-design",
        pattern: candidate.summary,
        proposedScopeClass: "UNRESOLVED",
        candidateType: "RELEASE_PRODUCT_TRUTH",
        evidenceRefs: candidate.evidenceRefs,
        capabilityIds: candidate.capabilityIds,
        moduleIds: candidate.moduleIds,
        confidence: candidate.confidence,
        status: "CANDIDATE",
        promotionRequiresHumanDecision: true,
        createdAt: candidate.createdAt,
      });
      appendAudit(plane, "HARVEST_CANDIDATE_CREATED", candidate.id, now, { sourceType: "IMMUTABLE_RELEASE", releaseId: release.id, confidence: candidate.confidence });
    }
    const attention = upsertAttention(plane, {
      situationKey: `release-harvest:${release.id}`,
      organizationId: "we-build-and-design",
      source: "immutable-release-harvest",
      type: "PRODUCT_LEARNING",
      title: "Nieuwe release-evidence verwerkt",
      summary: `${release.id} is automatisch opgenomen; ${release.moduleIds.length || "geen"} productgebied${release.moduleIds.length === 1 ? "" : "en"} zijn als Harvest candidate gekoppeld.`,
      severity: "LOW",
      urgency: "LOW",
      confidence: release.inferenceConfidence,
      evidenceRefs: [evidenceId],
      goRequirement: "NONE",
      atlasInterpretation: "De release is een feit. Welke gewijzigde onderdelen productbewijs zijn blijft een traceerbare kandidaat totdat gerichte evidence dit bevestigt.",
    }, now);
    upsertNextBestAction(plane, attention, {
      recommendation: "Laat Atlas deze release-evidence koppelen aan volgend klantgebruik.",
      why: "Een live release bewijst levering, maar niet automatisch generieke productwaarde of commerciele herbruikbaarheid.",
      evidenceRefs: [evidenceId],
      confidence: release.inferenceConfidence,
      expectedImpact: "Product Truth groeit zonder dat een release stilletjes een productclaim wordt.",
      estimatedHumanEffortMinutes: 0,
      risk: "LOW",
      dependencies: [release.id],
      atlasCanPrepare: ["release dedupliceren", "componenten vergelijken", "Harvest candidate bijwerken"],
      goRequirement: "NONE",
    }, now);
  }

  for (const issue of issues.filter(({ status, materialDecision }) => status === "NEEDS_OWNER_CONFIRMATION" && materialDecision === true)) {
    const evidenceId = `evidence-product-issue-${sha256(issue.id).slice(0, 24)}`;
    if (!plane.evidence.some(({ id }) => id === evidenceId)) {
      plane.evidence.push(validateEvidence({
        id: evidenceId,
        organizationId: "we-build-and-design",
        source: "central-wbd-product-truth",
        sourceType: "PRODUCT_TRUTH_ISSUE",
        sourceIdentity: issue.id,
        observedAt: issue.createdAt,
        fetchedAt: iso(now),
        rawReference: { kind: "central-state", locator: issue.id, immutable: false },
        normalized: { summary: issue.summary, issueType: issue.type },
        provenance: { ingestion: "PRODUCT_TRUTH_BOOTSTRAP", schemaVersion: 1, contentHash: sha256(stableJson(issue)) },
        freshness: "RECENT",
        confidence: "HIGH",
        reliability: "CENTRAL_VALIDATED_STATE",
        relatedEntityRefs: [issue.id],
        capabilityRefs: [],
      }));
    }
    const attention = upsertAttention(plane, {
      situationKey: `product-truth-issue:${issue.id}`,
      organizationId: "we-build-and-design",
      source: "central-wbd-product-truth",
      type: issue.type === "PRICING_CONFIRMATION" ? "COMMERCIAL_OPPORTUNITY" : "PRODUCT_LEARNING",
      title: issue.title,
      summary: issue.summary,
      severity: "MEDIUM",
      urgency: "LOW",
      confidence: "HIGH",
      evidenceRefs: [evidenceId],
      goRequirement: "REQUIRED",
      atlasInterpretation: "De beschikbare bronnen zijn veilig gesynchroniseerd, maar een materiele product- of prijsbeslissing mag niet autonoom worden genomen.",
    }, now);
    const prepared = upsertProductPreparedAction(plane, attention, {
      objective: "Bevestig of corrigeer de productbeslissing zonder brononderzoek opnieuw te doen.",
      reason: "Atlas heeft bronstatus, autoriteit en onzekerheid al naast elkaar gezet.",
      evidenceRefs: [evidenceId],
      impact: "Maakt de centrale Product Truth bruikbaar zonder een hypothese als definitief te presenteren.",
      goRequirement: "REQUIRED",
    }, now);
    upsertNextBestAction(plane, attention, {
      recommendation: "Beoordeel de voorbereide Product Truth-beslissing.",
      why: "Alleen Donovan kan een commercieel consequente prijs of productclaim definitief maken.",
      evidenceRefs: [evidenceId],
      confidence: "HIGH",
      expectedImpact: "Verwijdert een expliciet productconflict en maakt volgende surfaces consistent.",
      estimatedHumanEffortMinutes: 5,
      risk: "MEDIUM",
      dependencies: [issue.id],
      atlasCanPrepare: ["bronnen samenvatten", "historie bewaren", "definitief versus hypothese valideren"],
      goRequirement: "REQUIRED",
      preparedActionId: prepared.id,
    }, now);
  }
  return plane;
}

export function resolveAttention(inputPlane, attentionId, resolution, actor, now = new Date()) {
  const plane = validateAtlasControlPlane(inputPlane);
  const item = plane.attention.find(({ id }) => id === attentionId);
  if (!item) throw new Error("Attention niet gevonden.");
  item.status = "RESOLVED";
  item.resolution = { summary: required(resolution.summary, "Oplossing"), cause: String(resolution.cause ?? "").trim() || null, outcome: String(resolution.outcome ?? "").trim() || null, resolvedAt: iso(now), resolvedBy: required(actor, "Actor", 160) };
  const harvest = {
    id: `harvest-${sha256(`${item.situationKey}:${item.id}`).slice(0, 24)}`, sourceAttentionId: item.id,
    organizationId: item.organizationId, pattern: item.summary, proposedScopeClass: enumValue(resolution.scopeClass ?? "UNRESOLVED", SCOPE_CLASSES, "Harvest-scope"),
    candidateType: resolution.candidateType ?? "LESSON_LEARNED", evidenceRefs: item.evidenceRefs,
    status: "CANDIDATE", promotionRequiresHumanDecision: true, createdAt: iso(now),
  };
  plane.harvestCandidates.push(harvest); item.harvestReference = harvest.id;
  appendAudit(plane, "ATTENTION_RESOLVED", item.id, now, { harvestId: harvest.id });
  appendAudit(plane, "HARVEST_CANDIDATE_CREATED", harvest.id, now, { scopeClass: harvest.proposedScopeClass });
  return plane;
}

const priorityScore = (item) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[item.severity] * 4 + { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[item.urgency] * 3 + { HIGH: 3, MEDIUM: 2, LOW: 1, INSUFFICIENT_EVIDENCE: 0 }[item.confidence]);

export function projectOwnerAtlasWorkspace(inputPlane, { controlPlane, capabilities, promotionView, productTruthView = null, releaseId, revision, now = new Date() }) {
  const plane = validateAtlasControlPlane(inputPlane);
  const active = plane.attention.filter((item) => new Set(["OPEN", "WAITING"]).has(item.status)).sort((left, right) => priorityScore(right) - priorityScore(left));
  const since = plane.lastVisitedAt ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const changes = plane.evidence.filter((item) => item.fetchedAt > since).sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt)).slice(0, 12);
  const actions = controlPlane?.ownerActions?.filter((item) => item.status === "OPEN") ?? [];
  const promotionDecisions = (promotionView?.proposals ?? []).filter((item) => item.status === "READY");
  const capabilityRegistry = (capabilities ?? []).map((capability) => ({
    id: capability.id, name: capability.name, description: capability.guidance, module: capability.category,
    maturity: capability.status === "PROVEN_REUSABLE" ? "REUSABLE" : capability.status.startsWith("PROVEN_") ? "PROVEN" : capability.status === "PARTIAL" ? "BUILT" : "CONCEPT",
    evidenceRefs: unique([...(capability.evidence ?? []).map((proof) => plane.evidence.find((item) => item.capabilityRefs.includes(capability.id) && item.source === proof.source)?.id), ...plane.capabilityEvidenceLinks.filter((link) => link.capabilityId === capability.id).map((link) => link.evidenceId)]),
    organizationsWhereProven: capability.provenAt ?? [], reusable: capability.reusability === "HIGH" ? "YES" : capability.reusability === "MEDIUM" ? "CONDITIONAL" : "NO",
    dependencies: [], roles: [], connectors: capability.id === "connectors-snapshot-diff" ? ["wbd-homepage-metadata"] : [], configurationRequirements: [],
    revenueClass: capability.sellNow ? "SELLABLE" : "INTERNAL_OR_NOT_YET_SELLABLE", pricingHypothesis: capability.marketPricing ?? null,
    activationType: capability.sellNow ? "PROJECT_OR_CONTROLLED_ACTIVATION" : "INTERNAL", lastVerified: capability.lastEvidenceDate,
    owner: "wbd-owner-donovan", knownLimitations: capability.guidance, scopeClass: capability.customerSpecificShare === "HIGH" ? "CUSTOMER_SPECIFIC" : capability.customerSpecificShare === "MEDIUM" ? "GENERIC_WITH_CONFIGURATION" : "GENERIC",
  }));
  return {
    schemaVersion: 1, revision, releaseId, generatedAt: iso(now), lastVisitedAt: plane.lastVisitedAt,
    modes: { evidence: "LIVE_AND_REPOSITORY", interpretation: "DETERMINISTIC", preparedActions: "PREPARED", modelExecution: "NOT_YET_CONNECTED" },
    sinceLastVisit: changes,
    importantNow: active.filter((item) => item.severity !== "LOW").slice(0, 8),
    investigated: active.filter((item) => item.atlasInterpretation).slice(0, 8),
    decisionsNeeded: [
      ...actions.map((action) => ({ id: action.id, title: action.title, summary: action.reasonDonovanNeeded, goRequirement: "REQUIRED", source: "OWNER_ACTION", priority: action.priority, dueAt: action.dueAt })),
      ...promotionDecisions.map((proposal) => ({ id: proposal.id, title: proposal.title, summary: proposal.summary, goRequirement: "REQUIRED", source: "HARVEST_PROMOTION", priority: "MEDIUM", dueAt: null, href: "/workspace/wbd/beheer" })),
      ...active.filter((item) => item.goRequirement !== "NONE").map((item) => ({ id: item.id, title: item.title, summary: item.summary, goRequirement: item.goRequirement, source: "ATTENTION", priority: item.severity, dueAt: null })),
    ],
    canWait: active.filter((item) => item.urgency === "LOW" || item.status === "WAITING").slice(0, 8),
    attention: active, evidence: plane.evidence.slice().sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt)),
    nextBestActions: plane.nextBestActions, preparedActions: plane.preparedActions, harvestCandidates: plane.harvestCandidates,
    connectors: Object.values(plane.connectorStates), capabilityRegistry, productTruth: productTruthView,
    organizations: controlPlane?.organizations ?? [], autonomyPolicy: { observeAnalyzePrepare: "AUTONOMOUS", execute: "POLICY_BOUND", unknownRisk: "FAIL_CLOSED" },
  };
}

export function searchOwnerReality(inputPlane, { query, controlPlane, capabilities, promotionView, productTruthView = null, now = new Date() }) {
  const plane = validateAtlasControlPlane(inputPlane);
  const normalized = required(query, "Zoekvraag", 240).toLocaleLowerCase("nl-NL");
  const stopWords = new Set(["aan", "afgelopen", "als", "bij", "de", "dit", "een", "en", "er", "hebben", "het", "is", "maar", "mijn", "niet", "nog", "of", "over", "te", "van", "wat", "we", "welke", "wie", "zijn"]);
  const tokens = normalized.split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length > 1 && !stopWords.has(token));
  const candidates = [
    ...(controlPlane?.organizations ?? []).map((item) => ({ type: "ORGANIZATION", id: item.id, title: item.name, summary: `${item.relationshipType} · ${item.status}`, href: `/workspace/wbd/organisaties/${encodeURIComponent(item.id)}`, source: "CENTRAL_CONTROL_PLANE" })),
    ...(capabilities ?? []).map((item) => ({ type: "CAPABILITY", id: item.id, title: item.name, summary: `${item.category} · ${item.status} · ${(item.provenAt ?? []).join(" · ")} · ${item.guidance}`, href: "/workspace/wbd/capabilities", source: "CENTRAL_CAPABILITY_REGISTRY" })),
    ...(controlPlane?.ownerActions ?? []).map((item) => ({ type: "GO", id: item.id, title: item.title, summary: `${item.priority} · ${item.status} · ${item.reasonDonovanNeeded}`, href: "/workspace/wbd/beheer", source: "CENTRAL_CONTROL_PLANE" })),
    ...(promotionView?.proposals ?? []).filter((item) => item.status === "READY").map((item) => ({ type: "HUMAN_GO", id: item.id, title: item.title, summary: `GO vereist · ${item.summary} · onzekerheid: ${item.uncertainty}`, href: "/workspace/wbd/beheer", source: "HUMAN_PROMOTION_BOUNDARY" })),
    ...plane.attention.map((item) => ({ type: "ATTENTION", id: item.id, title: item.title, summary: `${item.type} · ${item.summary} · ${item.status}`, href: `/workspace/wbd/attention#${item.id}`, source: item.source })),
    ...plane.evidence.map((item) => ({ type: "EVIDENCE", id: item.id, title: item.normalized?.summary ?? item.normalized?.title ?? item.sourceType, summary: `${item.source} · ${item.organizationId} · ${item.freshness}`, href: `/workspace/wbd/attention#${item.id}`, source: item.source })),
    ...(productTruthView?.modules ?? []).map((item) => ({ type: "PRODUCT_MODULE", id: item.id, title: item.name, summary: `${item.boundary} · ${item.maturity} · roadmap ${item.roadmap} · ${item.description}`, href: "/workspace/wbd/capabilities", source: "CENTRAL_PRODUCT_TRUTH" })),
    ...(productTruthView?.releases ?? []).map((item) => ({ type: "RELEASE", id: item.id, title: item.id, summary: `${item.commit} · ${item.validationStatus} · ${(item.moduleIds ?? []).join(" · ")}`, href: "/workspace/wbd/capabilities", source: "IMMUTABLE_RELEASE_HARVEST" })),
    ...(productTruthView?.issues ?? []).map((item) => ({ type: "PRODUCT_TRUTH_ISSUE", id: item.id, title: item.title, summary: `${item.type} · ${item.status} · ${item.summary}`, href: "/workspace/wbd/beheer", source: "CENTRAL_PRODUCT_TRUTH" })),
  ];
  const results = candidates.map((item) => {
    const text = `${item.title} ${item.summary} ${item.type}`.toLocaleLowerCase("nl-NL");
    const score = tokens.reduce((total, token) => total + (text.includes(token) ? token.length : 0), 0);
    return { ...item, score };
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "nl")).slice(0, 40);
  return { query, generatedAt: iso(now), results, total: results.length, scope: ["organizations", "capabilities", "attention", "evidence", "owner-actions", "human-go", "product-modules", "releases", "product-truth-issues"] };
}

export const wbdAtlasControlPlaneContract = Object.freeze({
  schemaVersion: 1,
  attentionTypes: Object.freeze([...ATTENTION_TYPES]),
  maturity: Object.freeze([...MATURITY]),
  scopeClasses: Object.freeze([...SCOPE_CLASSES]),
  goRequirements: Object.freeze([...GO_REQUIREMENTS]),
  actionStages: Object.freeze([...ACTION_STAGES]),
});
