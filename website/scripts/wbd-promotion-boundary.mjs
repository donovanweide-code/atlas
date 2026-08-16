import {
  appendControlAudit,
  controlRecordSourceRefs,
  createControlRecord,
  ensureControlPlane,
  updateControlRecord,
} from "./wbd-control-plane.mjs";

const SCHEMA_VERSION = 1;
const DECISIONS = new Set(["ACCEPT", "ADJUST", "REJECT"]);
const PRIORITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const RELATIONSHIP_TYPES = new Set(["CUSTOMER", "PROSPECT", "PARTNER"]);
const ORGANIZATION_STATUSES = new Set(["ACTIVE", "INACTIVE", "UNKNOWN"]);

function failure(message, code = "PROMOTION_VALIDATION_ERROR", statusCode = 400) {
  throw Object.assign(new Error(message), { code, statusCode });
}

function text(value, label, maximum = 1_200, optional = false) {
  const normalized = String(value ?? "").trim();
  if (!normalized && optional) return null;
  if (!normalized || normalized.length > maximum) failure(`${label} is ongeldig.`);
  return normalized;
}

function iso(value, label) {
  const normalized = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/u.test(normalized) || Number.isNaN(Date.parse(normalized))) failure(`${label} is ongeldig.`);
  return new Date(normalized).toISOString();
}

function reviewRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) failure("Promotionreview is ongeldig.", "PROMOTION_STATE_INVALID", 500);
  return {
    proposalId: text(value.proposalId, "Proposal-ID", 100),
    operation: text(value.operation, "Proposaloperatie", 20),
    canonicalMutation: text(value.canonicalMutation ?? (value.operation === "MATCH" ? "UPDATE" : value.operation), "Canonieke mutatie", 20),
    canonicalType: text(value.canonicalType, "Canoniek type", 40),
    decision: DECISIONS.has(value.decision) ? value.decision : failure("Reviewbesluit is ongeldig.", "PROMOTION_STATE_INVALID", 500),
    actor: text(value.actor, "Reviewactor", 100),
    reviewedAt: iso(value.reviewedAt, "Reviewtijd"),
    canonicalRecordId: value.canonicalRecordId ? text(value.canonicalRecordId, "Canoniek record-ID", 100) : null,
    proposalSnapshot: structuredClone(value.proposalSnapshot ?? {}),
    adjustments: structuredClone(value.adjustments ?? {}),
    beforeMeaning: value.beforeMeaning === null ? null : structuredClone(value.beforeMeaning ?? null),
    afterMeaning: value.afterMeaning === null ? null : structuredClone(value.afterMeaning ?? null),
    evidence: Array.isArray(value.evidence) ? structuredClone(value.evidence) : [],
    reason: value.reason ? text(value.reason, "Reviewreden", 500) : null,
  };
}

export function createInitialPromotionBoundary() {
  return { schemaVersion: SCHEMA_VERSION, reviews: [] };
}

export function validatePromotionBoundary(input) {
  if (input === undefined) return createInitialPromotionBoundary();
  if (!input || input.schemaVersion !== SCHEMA_VERSION || !Array.isArray(input.reviews)) failure("Promotionboundary is ongeldig.", "PROMOTION_STATE_INVALID", 500);
  const boundary = { schemaVersion: SCHEMA_VERSION, reviews: input.reviews.map(reviewRecord) };
  if (new Set(boundary.reviews.map(({ proposalId }) => proposalId)).size !== boundary.reviews.length) failure("Een proposal is meer dan eenmaal beoordeeld.", "PROMOTION_STATE_INVALID", 500);
  return boundary;
}

const evidence = Object.freeze({
  sportpaleis: [
    { source: "wbd-control-plane-human-acceptance-20260816", date: "2026-08-16", summary: "Donovan bevestigde Sportpaleis handmatig als bestaande klantorganisatie." },
    { source: "sportpaleis-production-release-evidence", date: "2026-08-16", summary: "WBD heeft een aantoonbare productie- en releaserelatie met Sport 2000 Sportpaleis." },
  ],
  bijCees: [
    { source: "wbd-strategy-bijcees-aquaflask-context", date: "2026-08-16", summary: "Bestaande historische klant- en werkrelatie is gedocumenteerd; actuele relatiestatus vraagt bevestiging." },
  ],
  opportunity: [
    { source: "wbd-control-plane-validation-commercial-context", date: "2026-08-16", summary: "De actuele route is eerst werkelijkheid onderzoeken, dan basisaanbod en prijsindicatie, en willingness-to-pay meten voor BUILD." },
  ],
});

const manifest = Object.freeze([
  {
    id: "sportpaleis-existing-organization-match-v1",
    operation: "MATCH",
    canonicalMutation: "UPDATE",
    canonicalType: "ORGANIZATION",
    title: "Sport 2000 Sportpaleis B.V.",
    summary: "We herkennen dit als het bestaande Sportpaleis-record. De aantoonbare bedrijfsnaam kan worden gecorrigeerd zonder een tweede organisatie te maken.",
    confidence: "HOOG",
    uncertainty: "Recurring afspraak, MRR, structurele WBD-verantwoordelijkheid en betalingsstatus blijven onbekend.",
    evidence: evidence.sportpaleis,
    sourceRefs: evidence.sportpaleis.map(({ source }) => source),
    allowedAdjustments: ["name", "relationshipType", "status"],
  },
  {
    id: "bij-cees-historical-organization-v1",
    operation: "CREATE",
    canonicalMutation: "CREATE",
    canonicalType: "ORGANIZATION",
    title: "Bij Cees",
    summary: "We hebben een bestaande klant- en werkrelatie gevonden. De actuele relatiestatus moet nog door Donovan worden bevestigd of aangepast.",
    confidence: "MIDDEL",
    uncertainty: "De huidige relatiestatus is niet veilig af te leiden uit historische werkzaamheden.",
    evidence: evidence.bijCees,
    sourceRefs: evidence.bijCees.map(({ source }) => source),
    allowedAdjustments: ["name", "relationshipType", "status"],
  },
  {
    id: "bijcees-aquaflask-commercial-opportunity-v1",
    operation: "CREATE",
    canonicalMutation: "CREATE",
    canonicalType: "OPPORTUNITY",
    title: "BijCees + AquaFlask: digitale vernieuwing en stabiliteit",
    summary: "Eerst de actuele situatie onderzoeken; daarna een basisaanbod en prijsindicatie voorbereiden en klantreactie/willingness-to-pay meten vóór BUILD.",
    confidence: "MIDDEL",
    uncertainty: "Financiële waarde en MRR zijn onbekend. Een voorstel is nog niet bevestigd of verzonden. AquaFlask wordt geen afzonderlijke Organization.",
    evidence: evidence.opportunity,
    sourceRefs: evidence.opportunity.map(({ source }) => source),
    allowedAdjustments: ["title", "problemOrOpportunity", "status", "nextReviewAt"],
    dependsOn: "bij-cees-historical-organization-v1",
    requiredHumanFields: ["nextReviewAt"],
  },
  {
    id: "bijcees-current-situation-owner-action-v1",
    operation: "CREATE",
    canonicalMutation: "CREATE",
    canonicalType: "OWNER_ACTION",
    title: "Actuele BijCees/AquaFlask-situatie onderzoeken",
    summary: "Donovan is nodig om de actuele werkelijkheid vast te stellen voordat WBD een basisaanbod en prijsindicatie voorbereidt.",
    confidence: "MIDDEL",
    uncertainty: "Er is bewust geen deadline of prioriteit afgeleid.",
    evidence: evidence.opportunity,
    sourceRefs: evidence.opportunity.map(({ source }) => source),
    allowedAdjustments: ["title", "reasonDonovanNeeded", "priority", "dueAt"],
    dependsOn: "bijcees-aquaflask-commercial-opportunity-v1",
    requiredHumanFields: ["priority"],
  },
]);

function normalizedName(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function reviewed(boundary, proposalId) {
  return boundary.reviews.find((candidate) => candidate.proposalId === proposalId) ?? null;
}

function acceptedRecordId(boundary, proposalId) {
  const review = reviewed(boundary, proposalId);
  return review && new Set(["ACCEPT", "ADJUST"]).has(review.decision) ? review.canonicalRecordId : null;
}

function sportpaleisMatch(plane) {
  const exactId = "organization-05e88cb6-9a3a-4ae8-9f52-e53124fe6a39";
  return plane.organizations.find(({ id }) => id === exactId)
    ?? plane.organizations.find(({ name }) => normalizedName(name).includes("sportpaleis"))
    ?? null;
}

function availability(proposal, plane, boundary) {
  if (reviewed(boundary, proposal.id)) return { status: "REVIEWED", message: "Dit voorstel is beoordeeld." };
  if (proposal.operation === "MATCH" && !sportpaleisMatch(plane)) return { status: "BLOCKED", message: "Het bestaande Sportpaleis-record kon niet eenduidig worden gevonden." };
  if (proposal.dependsOn && !acceptedRecordId(boundary, proposal.dependsOn)) return { status: "WAITING", message: "Beoordeel eerst het bovenliggende voorstel." };
  return { status: "READY", message: null };
}

export function publicPromotionView(state, { releaseId }) {
  const plane = ensureControlPlane(state);
  const boundary = validatePromotionBoundary(state.promotionBoundary);
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: state.revision,
    releaseId,
    proposals: manifest.map((proposal) => ({
      ...structuredClone(proposal),
      ...availability(proposal, plane, boundary),
      reviewed: reviewed(boundary, proposal.id),
      match: proposal.operation === "MATCH" ? (() => {
        const target = sportpaleisMatch(plane);
        return target ? { id: target.id, name: target.name, revision: target.revision } : null;
      })() : undefined,
    })),
  };
}

function semanticAdjustments(proposal, input) {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const forbidden = Object.keys(raw).filter((key) => !proposal.allowedAdjustments.includes(key));
  if (forbidden.length) failure(`Niet-toegestane betekenisvelden: ${forbidden.join(", ")}.`, "PROMOTION_FIELD_NOT_ALLOWED");
  const result = {};
  if (raw.name !== undefined) result.name = text(raw.name, "Naam", 160);
  if (raw.relationshipType !== undefined) result.relationshipType = RELATIONSHIP_TYPES.has(raw.relationshipType) ? raw.relationshipType : failure("Relatietype is ongeldig.");
  if (raw.status !== undefined) {
    const statuses = proposal.canonicalType === "OPPORTUNITY" ? new Set(["OPEN", "ON_HOLD"]) : ORGANIZATION_STATUSES;
    result.status = statuses.has(raw.status) ? raw.status : failure("Status is ongeldig.");
  }
  if (raw.title !== undefined) result.title = text(raw.title, "Titel", 200);
  if (raw.problemOrOpportunity !== undefined) result.problemOrOpportunity = text(raw.problemOrOpportunity, "Kans of probleem", 1_200);
  if (raw.reasonDonovanNeeded !== undefined) result.reasonDonovanNeeded = text(raw.reasonDonovanNeeded, "Waarom Donovan nodig is", 800);
  if (raw.nextReviewAt !== undefined) result.nextReviewAt = iso(raw.nextReviewAt, "Volgende review");
  if (raw.priority !== undefined) result.priority = PRIORITIES.has(raw.priority) ? raw.priority : failure("Prioriteit is ongeldig.");
  if (raw.dueAt !== undefined) result.dueAt = raw.dueAt ? iso(raw.dueAt, "Deadline") : null;
  return result;
}

function managedSourceHealth(proposal, reviewAt) {
  return {
    coverage: "PARTIAL",
    impact: proposal.canonicalType === "ORGANIZATION" ? "MEDIUM" : "HIGH",
    reviewDueAt: reviewAt ?? null,
    permitsNoAttentionClaim: false,
  };
}

function canonicalMutation(proposal, plane, boundary, adjustments, actor, now) {
  const stamp = now.toISOString();
  const sourceHealth = managedSourceHealth(proposal, adjustments.nextReviewAt ?? null);
  if (proposal.id === "sportpaleis-existing-organization-match-v1") {
    const current = sportpaleisMatch(plane);
    if (!current) failure("Het bestaande Sportpaleis-record kon niet worden gevonden.", "PROMOTION_MATCH_NOT_FOUND", 409);
    const payload = {
      name: adjustments.name ?? "Sport 2000 Sportpaleis B.V.",
      relationshipType: adjustments.relationshipType ?? "CUSTOMER",
      status: adjustments.status ?? "ACTIVE",
      reviewedAt: stamp,
      sourceRefs: proposal.sourceRefs,
      sourceHealth,
      expectedRecordRevision: current.revision,
    };
    const result = updateControlRecord(plane, "organizations", current.id, payload, actor, now);
    return { ...result, recordType: "organizations", beforeMeaning: current };
  }
  if (proposal.id === "bij-cees-historical-organization-v1") {
    const payload = {
      name: adjustments.name ?? "Bij Cees",
      relationshipType: adjustments.relationshipType ?? "CUSTOMER",
      status: adjustments.status ?? "UNKNOWN",
      reviewedAt: stamp,
      sourceRefs: proposal.sourceRefs,
      sourceHealth,
    };
    const result = createControlRecord(plane, "organizations", payload, actor, now);
    return { ...result, recordType: "organizations", beforeMeaning: null };
  }
  if (proposal.id === "bijcees-aquaflask-commercial-opportunity-v1") {
    const organizationId = acceptedRecordId(boundary, "bij-cees-historical-organization-v1");
    if (!organizationId) failure("Bevestig eerst Bij Cees als Organization.", "PROMOTION_DEPENDENCY_PENDING", 409);
    if (!adjustments.nextReviewAt) failure("Kies eerst wanneer Donovan deze kans opnieuw beoordeelt.", "PROMOTION_MEANING_INCOMPLETE");
    const payload = {
      organizationId,
      title: adjustments.title ?? proposal.title,
      problemOrOpportunity: adjustments.problemOrOpportunity ?? proposal.summary,
      status: adjustments.status ?? "OPEN",
      valueType: "UNKNOWN",
      expectedOneOffRevenue: null,
      expectedMrr: null,
      proposalStatus: "NONE",
      evidenceRefs: proposal.sourceRefs,
      nextReviewAt: adjustments.nextReviewAt,
      ownerActionId: null,
      sourceHealth,
    };
    const result = createControlRecord(plane, "opportunities", payload, actor, now);
    return { ...result, recordType: "opportunities", beforeMeaning: null };
  }
  const opportunityId = acceptedRecordId(boundary, "bijcees-aquaflask-commercial-opportunity-v1");
  if (!opportunityId) failure("Bevestig eerst de BijCees/AquaFlask-opportunity.", "PROMOTION_DEPENDENCY_PENDING", 409);
  if (!adjustments.priority) failure("Kies eerst hoe belangrijk deze actie is.", "PROMOTION_MEANING_INCOMPLETE");
  const payload = {
    subjectType: "OPPORTUNITY",
    subjectId: opportunityId,
    title: adjustments.title ?? proposal.title,
    reasonDonovanNeeded: adjustments.reasonDonovanNeeded ?? proposal.summary,
    status: "OPEN",
    priority: adjustments.priority,
    dueAt: adjustments.dueAt ?? null,
    sourceRefs: proposal.sourceRefs,
    sourceHealth,
  };
  const result = createControlRecord(plane, "actions", payload, actor, now);
  return { ...result, recordType: "actions", beforeMeaning: null };
}

export function reviewPromotion(state, proposalId, payload, actor, now = new Date()) {
  const boundary = validatePromotionBoundary(state.promotionBoundary);
  const proposal = manifest.find(({ id }) => id === proposalId);
  if (!proposal) failure("Proposal niet gevonden.", "PROMOTION_NOT_FOUND", 404);
  if (reviewed(boundary, proposalId)) failure("Dit voorstel is al beoordeeld.", "PROMOTION_ALREADY_REVIEWED", 409);
  const decision = DECISIONS.has(payload?.decision) ? payload.decision : failure("Kies Bevestigen, Aanpassen of Afwijzen.");
  const plane = ensureControlPlane(state, now);
  const available = availability(proposal, plane, boundary);
  if (available.status !== "READY") failure(available.message, "PROMOTION_NOT_READY", 409);
  const adjustments = decision === "ADJUST" ? semanticAdjustments(proposal, payload.adjustments) : {};
  let mutation = null;
  if (decision !== "REJECT") {
    mutation = canonicalMutation(proposal, plane, boundary, adjustments, actor, now);
    state.controlPlane = mutation.plane;
    appendControlAudit(state.controlPlane, {
      recordType: mutation.recordType,
      recordId: mutation.value.id,
      changedFields: mutation.changedFields,
      sourceRefs: controlRecordSourceRefs(mutation.value),
      actor,
      lifecycleAction: `PROMOTION_${mutation.lifecycleAction}`,
      now,
    });
  }
  const review = reviewRecord({
    proposalId: proposal.id,
    operation: proposal.operation,
    canonicalMutation: proposal.canonicalMutation,
    canonicalType: proposal.canonicalType,
    decision,
    actor,
    reviewedAt: now.toISOString(),
    canonicalRecordId: mutation?.value.id ?? null,
    proposalSnapshot: proposal,
    adjustments,
    beforeMeaning: mutation?.beforeMeaning ?? null,
    afterMeaning: mutation?.value ?? null,
    evidence: proposal.evidence,
    reason: payload?.reason ?? null,
  });
  boundary.reviews.push(review);
  state.promotionBoundary = validatePromotionBoundary(boundary);
  return { state, value: { review, record: mutation?.value ?? null } };
}

export const wbdPromotionBoundaryContract = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  proposalIds: manifest.map(({ id }) => id),
  supportedOperations: ["CREATE", "UPDATE", "MATCH"],
  canonicalWriter: "OWNER_REVIEW_ONLY",
});
