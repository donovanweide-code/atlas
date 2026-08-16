import { randomUUID } from "node:crypto";

export const CONTROL_RECORD_TYPES = Object.freeze([
  "organizations",
  "opportunities",
  "commitments",
  "actions",
  "effort-observations",
]);

const RELATIONSHIP_TYPES = new Set(["OWN_ORGANIZATION", "CUSTOMER", "PROSPECT", "PARTNER"]);
const ORGANIZATION_STATUSES = new Set(["ACTIVE", "INACTIVE", "ARCHIVED", "UNKNOWN"]);
const OPPORTUNITY_STATUSES = new Set(["OPEN", "ON_HOLD", "WON", "LOST"]);
const VALUE_TYPES = new Set(["ONE_OFF", "MRR", "MIXED", "UNKNOWN"]);
const PROPOSAL_STATUSES = new Set(["NONE", "DRAFT", "SENT", "ACCEPTED", "DECLINED", "UNKNOWN"]);
const COMMITMENT_STATUSES = new Set(["ACTIVE", "PAUSED", "ENDED", "UNKNOWN"]);
const RESPONSIBLE_PARTIES = new Set(["WBD", "CUSTOMER", "SHARED", "EXTERNAL_PROVIDER"]);
const ACTION_STATUSES = new Set(["OPEN", "DONE", "CANCELLED"]);
const ACTION_PRIORITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const ACTION_SUBJECT_TYPES = new Set(["ORGANIZATION", "OPPORTUNITY", "SERVICE_COMMITMENT"]);
const TIME_CLASSES = new Set(["RECURRING_SERVICE", "SALES", "IMPLEMENTATION"]);
const EFFORT_CATEGORIES = new Set(["SUPPORT", "CUSTOMER_CONTACT", "INCIDENT", "OPERATIONS", "REVIEW", "CODEX_DIRECTION"]);
const EFFORT_STATUSES = new Set(["ACTIVE", "VOIDED"]);
const SOURCE_COVERAGE = new Set(["COMPLETE", "PARTIAL", "UNKNOWN"]);
const SOURCE_STATUSES = new Set(["HEALTHY", "STALE", "FAILED", "UNKNOWN"]);
const SOURCE_IMPACTS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const FRESHNESS_MODES = new Set(["MAX_AGE", "EVENT_DRIVEN", "PER_PERIOD"]);
const DOMAIN_SOURCES = Object.freeze({
  organizations: "wbd-owner-confirmed-organizations",
  opportunities: "wbd-owner-confirmed-opportunities",
  commitments: "wbd-owner-confirmed-commitments",
  actions: "wbd-owner-confirmed-actions",
  "effort-observations": "wbd-owner-confirmed-effort",
});
const REQUIRED_SOURCE_IDS = Object.freeze(Object.values(DOMAIN_SOURCES));
const PRIORITY_SCORE = Object.freeze({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 });

function failure(message, code = "CONTROL_VALIDATION_ERROR", statusCode = 400) {
  throw Object.assign(new Error(message), { code, statusCode });
}

function record(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function text(value, label, maximum = 240) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maximum) failure(`${label} is ongeldig.`);
  return normalized;
}

function optionalText(value, label, maximum = 500) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return text(value, label, maximum);
}

function enumValue(value, allowed, label) {
  if (!allowed.has(value)) failure(`${label} is ongeldig.`);
  return value;
}

function iso(value, label, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const normalized = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(normalized) || Number.isNaN(Date.parse(normalized))) failure(`${label} is ongeldig.`);
  return new Date(normalized).toISOString();
}

function dateOnlyOrIso(value, label, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const normalized = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) return `${normalized}T00:00:00.000Z`;
  return iso(normalized, label, optional);
}

function money(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000 || Math.abs(cents - amount * 100) > 1e-7) failure(`${label} is ongeldig.`);
  return cents / 100;
}

function integer(value, label, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) failure(`${label} is ongeldig.`);
  return parsed;
}

function stringList(value, label, maximumItems = 12) {
  if (!Array.isArray(value) || value.length > maximumItems) failure(`${label} is ongeldig.`);
  return [...new Set(value.map((item) => text(item, label, 400)))];
}

function id(value, label = "Record-ID") {
  const normalized = text(value, label, 100);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(normalized)) failure(`${label} is ongeldig.`);
  return normalized;
}

function recordRevision(value) {
  return integer(value, "Recordrevisie", 1, Number.MAX_SAFE_INTEGER);
}

function assertAllowed(input, allowed, label) {
  if (!record(input)) failure(`${label} ontbreekt.`);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) failure(`${label} bevat niet-toegestane velden: ${unexpected.join(", ")}.`, "CONTROL_FIELD_NOT_ALLOWED");
}

function freshnessRequirement(value) {
  if (!record(value)) failure("Freshness requirement ontbreekt.");
  const mode = enumValue(value.mode, FRESHNESS_MODES, "Freshnessmodus");
  const maxAgeHours = value.maxAgeHours === undefined || value.maxAgeHours === null ? null : integer(value.maxAgeHours, "Maximale bronleeftijd", 1, 24 * 366 * 5);
  const reviewDueAt = dateOnlyOrIso(value.reviewDueAt, "Bronreviewdatum", true);
  if (mode === "MAX_AGE" && maxAgeHours === null) failure("MAX_AGE vereist maxAgeHours.");
  return { mode, maxAgeHours, reviewDueAt };
}

function validateSourceHealth(value) {
  if (!record(value)) failure("Source Health-record ontbreekt.");
  return {
    sourceId: id(value.sourceId, "Source-ID"),
    sourceType: text(value.sourceType, "Brontype", 80),
    authoritativeOwner: text(value.authoritativeOwner, "Bronhouder", 160),
    lastSuccessfulObservation: iso(value.lastSuccessfulObservation, "Laatste succesvolle observatie", true),
    lastAttemptAt: iso(value.lastAttemptAt, "Laatste bronpoging", true),
    freshnessRequirement: freshnessRequirement(value.freshnessRequirement),
    coverage: enumValue(value.coverage, SOURCE_COVERAGE, "Brondekking"),
    status: enumValue(value.status, SOURCE_STATUSES, "Bronstatus"),
    lastKnownGoodAt: iso(value.lastKnownGoodAt, "Last-known-good", true),
    lastFailureCode: optionalText(value.lastFailureCode, "Bronfoutcode", 120),
    impact: enumValue(value.impact, SOURCE_IMPACTS, "Bronimpact"),
    permitsNoAttentionClaim: value.permitsNoAttentionClaim === true,
  };
}

function validateBase(value, refsKey = "sourceRefs") {
  return {
    id: id(value.id),
    [refsKey]: stringList(value[refsKey], refsKey === "evidenceRefs" ? "Bewijsreferenties" : "Bronreferenties"),
    sourceHealthId: id(value.sourceHealthId, "Source Health-ID"),
    confirmedBy: text(value.confirmedBy, "Bevestigd door", 100),
    createdAt: iso(value.createdAt, "Aanmaaktijd"),
    updatedAt: iso(value.updatedAt, "Wijzigingstijd"),
    revision: recordRevision(value.revision),
  };
}

function validateOrganization(value) {
  return {
    ...validateBase(value),
    name: text(value.name, "Organisatienaam", 160),
    relationshipType: enumValue(value.relationshipType, RELATIONSHIP_TYPES, "Relatietype"),
    status: enumValue(value.status, ORGANIZATION_STATUSES, "Organisatiestatus"),
    reviewedAt: iso(value.reviewedAt, "Organisatiereview"),
  };
}

function validateOpportunity(value) {
  const result = {
    ...validateBase(value, "evidenceRefs"),
    organizationId: id(value.organizationId, "Organisatie-ID"),
    title: text(value.title, "Opportunitytitel", 180),
    problemOrOpportunity: text(value.problemOrOpportunity, "Kans of probleem", 1_200),
    status: enumValue(value.status, OPPORTUNITY_STATUSES, "Opportunitystatus"),
    valueType: enumValue(value.valueType, VALUE_TYPES, "Waardetype"),
    expectedOneOffRevenue: money(value.expectedOneOffRevenue, "Verwachte eenmalige omzet"),
    expectedMrr: money(value.expectedMrr, "Verwachte MRR"),
    proposalStatus: enumValue(value.proposalStatus, PROPOSAL_STATUSES, "Voorstelstatus"),
    nextReviewAt: iso(value.nextReviewAt, "Volgende opportunityreview"),
    ownerActionId: value.ownerActionId ? id(value.ownerActionId, "Owner Action-ID") : null,
  };
  if (result.valueType === "UNKNOWN" && (result.expectedOneOffRevenue !== null || result.expectedMrr !== null)) failure("UNKNOWN opportunitywaarde mag geen bedrag bevatten.");
  if (result.valueType === "ONE_OFF" && result.expectedMrr !== null) failure("ONE_OFF opportunity mag geen MRR bevatten.");
  if (result.valueType === "MRR" && result.expectedOneOffRevenue !== null) failure("MRR opportunity mag geen eenmalige omzet bevatten.");
  return result;
}

function validateResponsibility(value) {
  if (!record(value)) failure("Responsibility is ongeldig.");
  return {
    description: text(value.description, "Verantwoordelijkheid", 600),
    responsibleParty: enumValue(value.responsibleParty, RESPONSIBLE_PARTIES, "Verantwoordelijke partij"),
  };
}

function validateCommitment(value) {
  const result = {
    ...validateBase(value),
    organizationId: id(value.organizationId, "Organisatie-ID"),
    status: enumValue(value.status, COMMITMENT_STATUSES, "Commitmentstatus"),
    contractedMrr: money(value.contractedMrr, "Gecontracteerde MRR"),
    startsAt: dateOnlyOrIso(value.startsAt, "Startdatum", true),
    endsAt: dateOnlyOrIso(value.endsAt, "Einddatum", true),
    renewalReviewAt: dateOnlyOrIso(value.renewalReviewAt, "Renewal-review", true),
    responsibilities: Array.isArray(value.responsibilities) && value.responsibilities.length <= 20 ? value.responsibilities.map(validateResponsibility) : failure("Responsibilities zijn ongeldig."),
  };
  if (result.startsAt && result.endsAt && result.startsAt > result.endsAt) failure("Einddatum ligt voor de startdatum.");
  if (result.status === "ACTIVE" && result.responsibilities.length === 0) failure("Een actief commitment vereist responsibilityscope.");
  return result;
}

function validateAction(value) {
  const result = {
    ...validateBase(value),
    subjectType: enumValue(value.subjectType, ACTION_SUBJECT_TYPES, "Actieonderwerp"),
    subjectId: id(value.subjectId, "Actieonderwerp-ID"),
    title: text(value.title, "Actietitel", 200),
    reasonDonovanNeeded: text(value.reasonDonovanNeeded, "Reden waarom Donovan nodig is", 800),
    status: enumValue(value.status, ACTION_STATUSES, "Actiestatus"),
    priority: enumValue(value.priority, ACTION_PRIORITIES, "Actieprioriteit"),
    dueAt: dateOnlyOrIso(value.dueAt, "Actiedeadline", true),
    completedAt: iso(value.completedAt, "Afrondtijd", true),
  };
  if (result.status === "DONE" && !result.completedAt) failure("Een afgeronde actie vereist completedAt.");
  if (result.status !== "DONE" && result.completedAt) failure("Alleen een afgeronde actie mag completedAt bevatten.");
  return result;
}

function validateEffort(value) {
  const result = {
    ...validateBase(value),
    organizationId: id(value.organizationId, "Organisatie-ID"),
    serviceCommitmentId: value.serviceCommitmentId ? id(value.serviceCommitmentId, "Commitment-ID") : null,
    timeClass: enumValue(value.timeClass, TIME_CLASSES, "Tijdklasse"),
    category: enumValue(value.category, EFFORT_CATEGORIES, "Effortcategorie"),
    minutes: integer(value.minutes, "Minuten", 1, 24 * 60),
    context: optionalText(value.context, "Effortcontext", 500),
    capturedAt: iso(value.capturedAt, "Efforttijd"),
    capturedBy: text(value.capturedBy, "Effort vastgelegd door", 100),
    status: enumValue(value.status, EFFORT_STATUSES, "Effortstatus"),
    correctionOf: value.correctionOf ? id(value.correctionOf, "Correctiebron-ID") : null,
    voidedAt: iso(value.voidedAt, "Voidtijd", true),
    voidedBy: optionalText(value.voidedBy, "Voidactor", 100),
    voidReason: optionalText(value.voidReason, "Voidreden", 500),
  };
  if (result.status === "VOIDED" && (!result.voidedAt || !result.voidedBy || !result.voidReason)) failure("Een VOIDED effortregistratie vereist tijd, actor en reden.");
  if (result.status === "ACTIVE" && (result.voidedAt || result.voidedBy || result.voidReason)) failure("Een actieve effortregistratie mag geen voidmetadata bevatten.");
  return result;
}

function validateAudit(value) {
  if (!record(value)) failure("Control Plane-auditrecord is ongeldig.");
  return {
    id: id(value.id, "Audit-ID"),
    recordType: text(value.recordType, "Auditrecordtype", 80),
    recordId: id(value.recordId, "Auditrecord-ID"),
    changedFields: stringList(value.changedFields, "Gewijzigde velden", 40),
    sourceRefs: stringList(value.sourceRefs, "Auditbronreferenties"),
    actor: text(value.actor, "Auditactor", 100),
    occurredAt: iso(value.occurredAt, "Audittijd"),
    lifecycleAction: text(value.lifecycleAction, "Lifecycleactie", 80),
  };
}

export function validateControlPlane(input) {
  if (!record(input) || input.schemaVersion !== 1) failure("Control Plane-schema is ongeldig.");
  const plane = {
    schemaVersion: 1,
    organizations: Array.isArray(input.organizations) ? input.organizations.map(validateOrganization) : failure("Organizations ontbreken."),
    opportunities: Array.isArray(input.opportunities) ? input.opportunities.map(validateOpportunity) : failure("Opportunities ontbreken."),
    serviceCommitments: Array.isArray(input.serviceCommitments) ? input.serviceCommitments.map(validateCommitment) : failure("Service Commitments ontbreken."),
    ownerActions: Array.isArray(input.ownerActions) ? input.ownerActions.map(validateAction) : failure("Owner Actions ontbreken."),
    effortObservations: Array.isArray(input.effortObservations) ? input.effortObservations.map(validateEffort) : failure("Effort Observations ontbreken."),
    sourceHealth: Array.isArray(input.sourceHealth) ? input.sourceHealth.map(validateSourceHealth) : failure("Source Health ontbreekt."),
    audit: Array.isArray(input.audit) ? input.audit.map(validateAudit) : [],
  };
  for (const [label, values] of Object.entries({ organizations: plane.organizations, opportunities: plane.opportunities, commitments: plane.serviceCommitments, actions: plane.ownerActions, effort: plane.effortObservations, sources: plane.sourceHealth, audit: plane.audit })) {
    const ids = values.map(({ id: recordId, sourceId }) => recordId ?? sourceId);
    if (new Set(ids).size !== ids.length) failure(`Dubbele ID in ${label}.`);
  }
  const organizations = new Set(plane.organizations.map(({ id: organizationId }) => organizationId));
  const commitments = new Set(plane.serviceCommitments.map(({ id: commitmentId }) => commitmentId));
  const sources = new Set(plane.sourceHealth.map(({ sourceId }) => sourceId));
  for (const organization of plane.organizations) if (!sources.has(organization.sourceHealthId)) failure("Organization verwijst naar onbekende Source Health.");
  for (const opportunity of plane.opportunities) {
    if (!organizations.has(opportunity.organizationId) || !sources.has(opportunity.sourceHealthId)) failure("Opportunityreferentie is ongeldig.");
  }
  for (const commitment of plane.serviceCommitments) {
    if (!organizations.has(commitment.organizationId) || !sources.has(commitment.sourceHealthId)) failure("Commitmentreferentie is ongeldig.");
  }
  for (const action of plane.ownerActions) if (!sources.has(action.sourceHealthId)) failure("Owner Action verwijst naar onbekende Source Health.");
  for (const effort of plane.effortObservations) {
    if (!organizations.has(effort.organizationId) || !sources.has(effort.sourceHealthId)) failure("Effortreferentie is ongeldig.");
    if (effort.serviceCommitmentId && !commitments.has(effort.serviceCommitmentId)) failure("Effort verwijst naar onbekend commitment.");
  }
  return plane;
}

function sourceSeed(sourceId, now, healthy = false, impact = "HIGH") {
  const stamp = healthy ? now.toISOString() : null;
  return {
    sourceId,
    sourceType: "OWNER_CONFIRMATION",
    authoritativeOwner: "Donovan",
    lastSuccessfulObservation: stamp,
    lastAttemptAt: stamp,
    freshnessRequirement: { mode: "EVENT_DRIVEN", maxAgeHours: null, reviewDueAt: healthy ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1_000).toISOString() : null },
    coverage: healthy ? "COMPLETE" : "UNKNOWN",
    status: healthy ? "HEALTHY" : "UNKNOWN",
    lastKnownGoodAt: stamp,
    lastFailureCode: null,
    impact,
    permitsNoAttentionClaim: healthy,
  };
}

export function createInitialControlPlane({ ownerId, now = new Date() }) {
  const stamp = now.toISOString();
  return validateControlPlane({
    schemaVersion: 1,
    organizations: [{
      id: "we-build-and-design",
      name: "We Build And Design",
      relationshipType: "OWN_ORGANIZATION",
      status: "ACTIVE",
      sourceRefs: ["central-wbd-owner-state"],
      sourceHealthId: DOMAIN_SOURCES.organizations,
      confirmedBy: ownerId,
      reviewedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 1,
    }],
    opportunities: [],
    serviceCommitments: [],
    ownerActions: [],
    effortObservations: [],
    sourceHealth: [
      sourceSeed(DOMAIN_SOURCES.organizations, now, true, "CRITICAL"),
      sourceSeed(DOMAIN_SOURCES.opportunities, now, false, "HIGH"),
      sourceSeed(DOMAIN_SOURCES.commitments, now, false, "CRITICAL"),
      sourceSeed(DOMAIN_SOURCES.actions, now, false, "HIGH"),
      sourceSeed(DOMAIN_SOURCES["effort-observations"], now, false, "MEDIUM"),
    ],
    audit: [],
  });
}

export function ensureControlPlane(state, now = new Date()) {
  if (state.controlPlane === undefined) state.controlPlane = createInitialControlPlane({ ownerId: state.owner.id, now });
  else state.controlPlane = validateControlPlane(state.controlPlane);
  return state.controlPlane;
}

export function evaluateSourceHealth(source, now = new Date()) {
  const validated = validateSourceHealth(source);
  const lastSuccess = validated.lastSuccessfulObservation ? Date.parse(validated.lastSuccessfulObservation) : null;
  const lastAttempt = validated.lastAttemptAt ? Date.parse(validated.lastAttemptAt) : null;
  let status = "HEALTHY";
  if (lastSuccess === null) status = "UNKNOWN";
  else if (validated.lastFailureCode && lastAttempt !== null && lastAttempt >= lastSuccess) status = "FAILED";
  else if (validated.freshnessRequirement.reviewDueAt && now.getTime() > Date.parse(validated.freshnessRequirement.reviewDueAt)) status = "STALE";
  else if (validated.freshnessRequirement.mode === "MAX_AGE" && now.getTime() - lastSuccess > validated.freshnessRequirement.maxAgeHours * 60 * 60 * 1_000) status = "STALE";
  return { ...validated, status };
}

function sourceFor(plane, sourceId) {
  const source = plane.sourceHealth.find((candidate) => candidate.sourceId === sourceId);
  if (!source) failure("Source Health ontbreekt.", "CONTROL_SOURCE_MISSING", 500);
  return source;
}

function sourceRefsFor(recordValue) {
  return recordValue.evidenceRefs ?? recordValue.sourceRefs ?? [];
}

function normalizeSourceObservation(value, fallbackReviewAt, now) {
  const coverage = enumValue(value?.coverage ?? "PARTIAL", SOURCE_COVERAGE, "Brondekking");
  const impact = enumValue(value?.impact ?? "MEDIUM", SOURCE_IMPACTS, "Bronimpact");
  const reviewDueAt = value?.reviewDueAt ? dateOnlyOrIso(value.reviewDueAt, "Bronreviewdatum") : fallbackReviewAt;
  return { coverage, impact, reviewDueAt, permitsNoAttentionClaim: value?.permitsNoAttentionClaim === true && coverage === "COMPLETE" };
}

function observeDomainSource(plane, recordType, value, fallbackReviewAt, now) {
  const source = sourceFor(plane, DOMAIN_SOURCES[recordType]);
  const observation = normalizeSourceObservation(value, fallbackReviewAt, now);
  source.sourceType = "OWNER_CONFIRMATION";
  source.authoritativeOwner = "Donovan";
  source.lastAttemptAt = now.toISOString();
  source.lastSuccessfulObservation = now.toISOString();
  source.lastKnownGoodAt = now.toISOString();
  source.lastFailureCode = null;
  source.status = "HEALTHY";
  source.coverage = observation.coverage;
  source.impact = observation.impact;
  source.permitsNoAttentionClaim = observation.permitsNoAttentionClaim;
  source.freshnessRequirement = { mode: "EVENT_DRIVEN", maxAgeHours: null, reviewDueAt: observation.reviewDueAt };
  return source.sourceId;
}

function baseForCreate(recordType, payload, actor, now, plane, refsKey = "sourceRefs", fallbackReviewAt = null) {
  return {
    id: `${recordType.replace(/s$/u, "")}-${randomUUID()}`,
    [refsKey]: stringList(payload[refsKey] ?? [], refsKey === "evidenceRefs" ? "Bewijsreferenties" : "Bronreferenties"),
    sourceHealthId: observeDomainSource(plane, recordType, payload.sourceHealth, fallbackReviewAt, now),
    confirmedBy: actor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    revision: 1,
  };
}

function assertOrganizationAvailable(plane, organizationId) {
  const organization = plane.organizations.find(({ id: candidate }) => candidate === organizationId);
  if (!organization || organization.status === "ARCHIVED") failure("Actieve organization niet gevonden.", "CONTROL_ORGANIZATION_NOT_FOUND", 404);
}

function assertSubjectAvailable(plane, subjectType, subjectId) {
  const collections = {
    ORGANIZATION: plane.organizations,
    OPPORTUNITY: plane.opportunities,
    SERVICE_COMMITMENT: plane.serviceCommitments,
  };
  if (!collections[subjectType].some(({ id: candidate }) => candidate === subjectId)) failure("Actieonderwerp niet gevonden.", "CONTROL_SUBJECT_NOT_FOUND", 404);
}

const CREATE_FIELDS = Object.freeze({
  organizations: new Set(["name", "relationshipType", "status", "sourceRefs", "reviewedAt", "sourceHealth"]),
  opportunities: new Set(["organizationId", "title", "problemOrOpportunity", "status", "valueType", "expectedOneOffRevenue", "expectedMrr", "proposalStatus", "evidenceRefs", "nextReviewAt", "ownerActionId", "sourceHealth"]),
  commitments: new Set(["organizationId", "status", "contractedMrr", "startsAt", "endsAt", "renewalReviewAt", "responsibilities", "sourceRefs", "sourceHealth"]),
  actions: new Set(["subjectType", "subjectId", "title", "reasonDonovanNeeded", "status", "priority", "dueAt", "sourceRefs", "sourceHealth"]),
  "effort-observations": new Set(["organizationId", "serviceCommitmentId", "timeClass", "category", "minutes", "context", "capturedAt", "sourceRefs", "sourceHealth", "correctionOf"]),
});

export function createControlRecord(planeInput, recordType, payload, actor, now = new Date()) {
  if (!CONTROL_RECORD_TYPES.includes(recordType)) failure("Recordtype is niet toegestaan.", "CONTROL_RECORD_TYPE_FORBIDDEN", 404);
  assertAllowed(payload, CREATE_FIELDS[recordType], "Control Plane-record");
  const plane = validateControlPlane(planeInput);
  let value;
  if (recordType === "organizations") {
    const reviewedAt = dateOnlyOrIso(payload.reviewedAt, "Organisatiereview");
    value = validateOrganization({ ...baseForCreate(recordType, payload, actor, now, plane, "sourceRefs", new Date(Date.parse(reviewedAt) + 365 * 24 * 60 * 60 * 1_000).toISOString()), name: payload.name, relationshipType: payload.relationshipType, status: payload.status, reviewedAt });
    plane.organizations.push(value);
  } else if (recordType === "opportunities") {
    assertOrganizationAvailable(plane, payload.organizationId);
    const nextReviewAt = dateOnlyOrIso(payload.nextReviewAt, "Volgende opportunityreview");
    value = validateOpportunity({ ...baseForCreate(recordType, payload, actor, now, plane, "evidenceRefs", nextReviewAt), ...payload, nextReviewAt });
    if (value.ownerActionId && !plane.ownerActions.some(({ id: candidate }) => candidate === value.ownerActionId)) failure("Gekoppelde Owner Action bestaat niet.");
    plane.opportunities.push(value);
  } else if (recordType === "commitments") {
    assertOrganizationAvailable(plane, payload.organizationId);
    const renewalReviewAt = dateOnlyOrIso(payload.renewalReviewAt, "Renewal-review", true);
    const fallbackReviewAt = renewalReviewAt ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1_000).toISOString();
    value = validateCommitment({ ...baseForCreate(recordType, payload, actor, now, plane, "sourceRefs", fallbackReviewAt), ...payload, renewalReviewAt });
    plane.serviceCommitments.push(value);
  } else if (recordType === "actions") {
    assertSubjectAvailable(plane, payload.subjectType, payload.subjectId);
    value = validateAction({ ...baseForCreate(recordType, payload, actor, now, plane), ...payload, completedAt: payload.status === "DONE" ? now.toISOString() : null });
    plane.ownerActions.push(value);
  } else {
    assertOrganizationAvailable(plane, payload.organizationId);
    if (payload.serviceCommitmentId && !plane.serviceCommitments.some(({ id: candidate, organizationId }) => candidate === payload.serviceCommitmentId && organizationId === payload.organizationId)) failure("Commitment hoort niet bij deze organization.");
    if (payload.correctionOf && !plane.effortObservations.some(({ id: candidate }) => candidate === payload.correctionOf)) failure("Correctiebron bestaat niet.");
    const capturedAt = iso(payload.capturedAt ?? now.toISOString(), "Efforttijd");
    const reviewDueAt = new Date(Date.UTC(new Date(capturedAt).getUTCFullYear(), new Date(capturedAt).getUTCMonth() + 1, 8)).toISOString();
    value = validateEffort({ ...baseForCreate(recordType, payload, actor, now, plane, "sourceRefs", reviewDueAt), ...payload, capturedAt, capturedBy: actor, status: "ACTIVE", voidedAt: null, voidedBy: null, voidReason: null });
    plane.effortObservations.push(value);
  }
  const changedFields = Object.keys(payload).filter((key) => key !== "sourceHealth");
  if (payload.sourceHealth) changedFields.push(...Object.keys(payload.sourceHealth).map((key) => `sourceHealth.${key}`));
  return { plane: validateControlPlane(plane), value, changedFields, lifecycleAction: "CREATED" };
}

const UPDATE_FIELDS = Object.freeze({
  organizations: new Set(["name", "relationshipType", "status", "sourceRefs", "reviewedAt", "sourceHealth", "expectedRecordRevision"]),
  opportunities: new Set(["title", "problemOrOpportunity", "status", "valueType", "expectedOneOffRevenue", "expectedMrr", "proposalStatus", "evidenceRefs", "nextReviewAt", "ownerActionId", "sourceHealth", "expectedRecordRevision"]),
  commitments: new Set(["status", "contractedMrr", "startsAt", "endsAt", "renewalReviewAt", "responsibilities", "sourceRefs", "sourceHealth", "expectedRecordRevision"]),
  actions: new Set(["title", "reasonDonovanNeeded", "status", "priority", "dueAt", "sourceRefs", "sourceHealth", "expectedRecordRevision"]),
  "effort-observations": new Set(["status", "voidReason", "expectedRecordRevision"]),
});

function collectionFor(plane, recordType) {
  return {
    organizations: plane.organizations,
    opportunities: plane.opportunities,
    commitments: plane.serviceCommitments,
    actions: plane.ownerActions,
    "effort-observations": plane.effortObservations,
  }[recordType];
}

export function updateControlRecord(planeInput, recordType, recordId, payload, actor, now = new Date()) {
  if (!CONTROL_RECORD_TYPES.includes(recordType)) failure("Recordtype is niet toegestaan.", "CONTROL_RECORD_TYPE_FORBIDDEN", 404);
  assertAllowed(payload, UPDATE_FIELDS[recordType], "Control Plane-wijziging");
  const plane = validateControlPlane(planeInput);
  const collection = collectionFor(plane, recordType);
  const index = collection.findIndex(({ id: candidate }) => candidate === recordId);
  if (index < 0) failure("Control Plane-record niet gevonden.", "CONTROL_RECORD_NOT_FOUND", 404);
  const current = collection[index];
  if (integer(payload.expectedRecordRevision, "Expected record revision", 1, Number.MAX_SAFE_INTEGER) !== current.revision) failure("Het record is inmiddels gewijzigd.", "CONTROL_RECORD_REVISION_CONFLICT", 409);
  const patch = Object.fromEntries(Object.entries(payload).filter(([key]) => !new Set(["expectedRecordRevision", "sourceHealth"]).has(key)));
  if (recordType === "effort-observations") {
    if (payload.status !== "VOIDED" || !payload.voidReason) failure("Effort Observations zijn immutable; alleen traceerbaar VOIDED is toegestaan.");
    Object.assign(patch, { status: "VOIDED", voidReason: payload.voidReason, voidedAt: now.toISOString(), voidedBy: actor });
  }
  if (recordType === "actions" && payload.status !== undefined) Object.assign(patch, { completedAt: payload.status === "DONE" ? now.toISOString() : null });
  if (payload.sourceHealth) {
    const reviewAt = patch.reviewedAt ?? patch.nextReviewAt ?? patch.renewalReviewAt ?? current.reviewedAt ?? current.nextReviewAt ?? current.renewalReviewAt ?? null;
    observeDomainSource(plane, recordType, payload.sourceHealth, reviewAt, now);
  }
  const candidate = { ...current, ...patch, id: current.id, confirmedBy: actor, createdAt: current.createdAt, updatedAt: now.toISOString(), revision: current.revision + 1 };
  const validators = { organizations: validateOrganization, opportunities: validateOpportunity, commitments: validateCommitment, actions: validateAction, "effort-observations": validateEffort };
  const value = validators[recordType](candidate);
  collection[index] = value;
  const lifecycleAction = recordType === "organizations" && value.status === "ARCHIVED" ? "ARCHIVED"
    : recordType === "opportunities" && value.status === "LOST" ? "LOST"
      : recordType === "commitments" && value.status === "ENDED" ? "ENDED"
        : recordType === "actions" && value.status === "DONE" ? "COMPLETED"
          : recordType === "actions" && value.status === "CANCELLED" ? "CANCELLED"
            : recordType === "effort-observations" ? "VOIDED" : "UPDATED";
  const changedFields = Object.keys(patch);
  if (payload.sourceHealth) changedFields.push(...Object.keys(payload.sourceHealth).map((key) => `sourceHealth.${key}`));
  return { plane: validateControlPlane(plane), value, changedFields, lifecycleAction };
}

export function appendControlAudit(plane, { recordType, recordId, changedFields, sourceRefs, actor, lifecycleAction, now = new Date() }) {
  plane.audit.push({ id: `audit-${randomUUID()}`, recordType, recordId, changedFields: [...new Set(changedFields)].sort(), sourceRefs: [...new Set(sourceRefs)], actor, occurredAt: now.toISOString(), lifecycleAction });
  if (plane.audit.length > 5_000) plane.audit.splice(0, plane.audit.length - 5_000);
}

function isHealthyComplete(source) {
  return source.status === "HEALTHY" && source.coverage === "COMPLETE";
}

function relevantSourceHealthy(plane, recordValue, evaluatedSources) {
  const source = evaluatedSources.find(({ sourceId }) => sourceId === recordValue.sourceHealthId);
  return Boolean(source && isHealthyComplete(source));
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

export function projectControlOverview(planeInput, { revision, releaseId, now = new Date() }) {
  const plane = validateControlPlane(planeInput);
  const sources = plane.sourceHealth.map((source) => evaluateSourceHealth(source, now));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const required = REQUIRED_SOURCE_IDS.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
  const blockers = required.filter((source) => !isHealthyComplete(source) || !source.permitsNoAttentionClaim).map((source) => ({
    kind: "SOURCE_HEALTH",
    sourceId: source.sourceId,
    status: source.status,
    coverage: source.coverage,
    impact: source.impact,
    lastKnownGoodAt: source.lastKnownGoodAt,
    message: source.status === "FAILED" ? "Broncontrole is mislukt." : source.status === "STALE" ? "Bronbewijs is verlopen." : source.coverage !== "COMPLETE" ? "Brondekking is niet compleet." : "Bron staat geen betrouwbare stilteclaim toe.",
  }));
  let reliability = "BETROUWBAAR";
  if (required.length !== REQUIRED_SOURCE_IDS.length || required.some((source) => source.status === "UNKNOWN" || source.status === "FAILED" || source.coverage === "UNKNOWN")) reliability = "ONVOLDOENDE BRONDEKKING";
  else if (blockers.length) reliability = "GEDEELTELIJK BETROUWBAAR";

  const organizations = new Map(plane.organizations.map((organization) => [organization.id, organization]));
  const openActions = plane.ownerActions.filter(({ status }) => status === "OPEN").sort((left, right) => PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority] || String(left.dueAt ?? "9999").localeCompare(String(right.dueAt ?? "9999")));
  const attention = [
    ...openActions.map((action) => ({ kind: "OWNER_ACTION", id: action.id, title: action.title, reason: action.reasonDonovanNeeded, priority: action.priority, dueAt: action.dueAt, sourceHealthId: action.sourceHealthId })),
    ...plane.opportunities.filter(({ status, nextReviewAt }) => status === "OPEN" && Date.parse(nextReviewAt) < now.getTime()).map((opportunity) => ({ kind: "OPPORTUNITY_REVIEW", id: opportunity.id, title: opportunity.title, dueAt: opportunity.nextReviewAt, priority: "HIGH" })),
    ...plane.serviceCommitments.filter(({ status, renewalReviewAt }) => status === "ACTIVE" && renewalReviewAt && Date.parse(renewalReviewAt) < now.getTime()).map((commitment) => ({ kind: "COMMITMENT_REVIEW", id: commitment.id, title: `Commitmentreview · ${organizations.get(commitment.organizationId)?.name ?? commitment.organizationId}`, dueAt: commitment.renewalReviewAt, priority: "HIGH" })),
    ...blockers.filter(({ impact }) => impact === "HIGH" || impact === "CRITICAL").map((source) => ({ kind: "SOURCE_BLOCKER", id: source.sourceId, title: source.message, priority: source.impact, dueAt: null, status: source.status, coverage: source.coverage })),
  ];

  const opportunities = plane.opportunities.filter(({ status }) => status === "OPEN").map((opportunity) => ({ ...opportunity, organizationName: organizations.get(opportunity.organizationId)?.name ?? "Onbekende organization", ownerAction: opportunity.ownerActionId ? plane.ownerActions.find(({ id: actionId }) => actionId === opportunity.ownerActionId) ?? null : null }));
  const activeCommitments = plane.serviceCommitments.filter(({ status }) => status === "ACTIVE");
  const commitmentSource = sourceById.get(DOMAIN_SOURCES.commitments);
  const commitmentsReliable = Boolean(commitmentSource && isHealthyComplete(commitmentSource));
  const mrrEvidenceComplete = commitmentsReliable && activeCommitments.every((commitment) => commitment.contractedMrr !== null && relevantSourceHealthy(plane, commitment, sources));
  const confirmedContractedMrr = mrrEvidenceComplete ? activeCommitments.reduce((total, commitment) => total + commitment.contractedMrr, 0) : null;
  const currentMonth = monthKey(now);
  const recurringEffort = plane.effortObservations.filter((effort) => effort.status === "ACTIVE" && effort.timeClass === "RECURRING_SERVICE" && effort.capturedAt.startsWith(currentMonth));
  const effortSource = sourceById.get(DOMAIN_SOURCES["effort-observations"]);
  const effortEvidenceComplete = Boolean(effortSource && isHealthyComplete(effortSource) && recurringEffort.length > 0);
  const recurringMinutes = recurringEffort.reduce((total, effort) => total + effort.minutes, 0);
  const mrrPerRecurringHour = mrrEvidenceComplete && effortEvidenceComplete && recurringMinutes > 0 ? Math.round((confirmedContractedMrr / (recurringMinutes / 60)) * 100) / 100 : null;
  const responsibilityExceptions = activeCommitments.filter((commitment) => !relevantSourceHealthy(plane, commitment, sources) || (commitment.renewalReviewAt && Date.parse(commitment.renewalReviewAt) < now.getTime())).map((commitment) => ({ id: commitment.id, organizationName: organizations.get(commitment.organizationId)?.name ?? commitment.organizationId, renewalReviewAt: commitment.renewalReviewAt, responsibilities: commitment.responsibilities, sourceStatus: sourceById.get(commitment.sourceHealthId)?.status ?? "UNKNOWN" }));

  let nextBestAction = null;
  if (reliability === "BETROUWBAAR" && openActions.length) {
    const first = openActions[0];
    const second = openActions[1];
    const firstTuple = `${PRIORITY_SCORE[first.priority]}:${first.dueAt ?? "9999"}`;
    const secondTuple = second ? `${PRIORITY_SCORE[second.priority]}:${second.dueAt ?? "9999"}` : null;
    if (firstTuple !== secondTuple && relevantSourceHealthy(plane, first, sources)) nextBestAction = { id: first.id, title: first.title, reason: first.reasonDonovanNeeded, priority: first.priority, dueAt: first.dueAt };
  }
  const noAttentionNeeded = reliability === "BETROUWBAAR" && attention.length === 0 && required.every((source) => source.permitsNoAttentionClaim);
  return {
    revision,
    releaseId,
    source: "central-wbd-owner-state",
    reliability: { status: reliability, blockers, noAttentionNeeded },
    attention,
    opportunities,
    company: {
      activeCommitments: activeCommitments.length,
      confirmedContractedMrr,
      recurringMinutes: effortEvidenceComplete ? recurringMinutes : null,
      mrrPerRecurringHour,
      evidenceStatus: mrrEvidenceComplete && effortEvidenceComplete ? "SUFFICIENT" : "INSUFFICIENT",
      period: currentMonth,
    },
    responsibilityExceptions,
    nextBestAction,
    nextBestActionStatus: nextBestAction ? "SUPPORTED" : "INSUFFICIENT_EVIDENCE",
    capabilitiesPath: "/workspace/wbd/capabilities",
  };
}

export function publicControlPlane(planeInput, { revision, releaseId, now = new Date() }) {
  const plane = validateControlPlane(planeInput);
  return { ...plane, sourceHealth: plane.sourceHealth.map((source) => evaluateSourceHealth(source, now)), revision, releaseId, source: "central-wbd-owner-state" };
}

export function controlRecordSourceRefs(recordValue) {
  return sourceRefsFor(recordValue);
}

export const wbdControlPlaneContract = Object.freeze({
  schemaVersion: 1,
  recordTypes: CONTROL_RECORD_TYPES,
  domainSources: DOMAIN_SOURCES,
  requiredSourceIds: REQUIRED_SOURCE_IDS,
});
