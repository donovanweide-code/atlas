import { createHash } from "node:crypto";

const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const required = (value, label, maximum = 2_000) => { const text = String(value ?? "").trim(); if (!text || text.length > maximum) throw new Error(`${label} is ongeldig.`); return text; };
const optional = (value, maximum = 2_000) => { const text = String(value ?? "").trim(); if (text.length > maximum) throw new Error("Waarde is te lang."); return text || null; };
const oneOf = (value, values, label) => { if (!values.has(value)) throw new Error(`${label} is ongeldig.`); return value; };

const CONSENT_STATES = new Set(["UNKNOWN", "OPTED_IN", "OPTED_OUT", "TRANSACTIONAL_ONLY"]);
const CAMPAIGN_STATES = new Set(["DRAFT", "READY_FOR_REVIEW", "APPROVED", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]);
const JOURNEY_STATES = new Set(["DRAFT", "READY_FOR_REVIEW", "ACTIVE", "PAUSED", "ARCHIVED"]);
const CHANNELS = new Set(["TRANSACTIONAL", "SERVICE", "COMMERCIAL"]);

export function normalizeCommunicationContact(input) {
  const address = required(input.address, "Contactadres", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address)) throw new Error("Contactadres is ongeldig.");
  const organizationId = required(input.organizationId, "Contactorganisatie", 160);
  return {
    id: input.id ? required(input.id, "Contact-ID", 160) : `contact-${sha256(`${organizationId}:${address}`).slice(0, 24)}`,
    organizationId, address, name: optional(input.name, 240), company: optional(input.company, 240), locale: optional(input.locale, 20) ?? "nl-NL",
    attributes: input.attributes && typeof input.attributes === "object" && !Array.isArray(input.attributes) ? structuredClone(input.attributes) : {},
    sourceRefs: [...new Set((input.sourceRefs ?? []).map(String).filter(Boolean))], createdAt: iso(input.createdAt ?? new Date()), updatedAt: iso(input.updatedAt ?? new Date()),
  };
}

export function normalizeConsentRecord(input) {
  return {
    id: required(input.id, "Consent-ID", 160), contactId: required(input.contactId, "Contact-ID", 160),
    organizationId: required(input.organizationId, "Consentorganisatie", 160), channel: oneOf(input.channel, CHANNELS, "Consentkanaal"),
    state: oneOf(input.state, CONSENT_STATES, "Consentstatus"), lawfulBasis: optional(input.lawfulBasis, 120),
    source: required(input.source, "Consentbron", 500), observedAt: iso(input.observedAt), expiresAt: input.expiresAt ? iso(input.expiresAt) : null,
    evidenceRef: required(input.evidenceRef, "Consentbewijs", 500),
  };
}

export function effectiveCommunicationPermission({ contact, consentRecords = [], suppressions = [], channel, now = new Date() }) {
  const normalizedChannel = oneOf(channel, CHANNELS, "Communicatiekanaal");
  const activeSuppression = suppressions.find((item) => item.organizationId === contact.organizationId && item.address.toLowerCase() === contact.address.toLowerCase() && (!item.expiresAt || new Date(item.expiresAt) > now));
  if (activeSuppression) return { allowed: false, reason: "SUPPRESSED", evidenceRefs: [activeSuppression.evidenceRef].filter(Boolean) };
  const relevant = consentRecords.filter((item) => item.contactId === contact.id && item.channel === normalizedChannel && (!item.expiresAt || new Date(item.expiresAt) > now)).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const latest = relevant[0];
  if (normalizedChannel === "COMMERCIAL") return latest?.state === "OPTED_IN" ? { allowed: true, reason: "EXPLICIT_OPT_IN", evidenceRefs: [latest.evidenceRef] } : { allowed: false, reason: latest?.state === "OPTED_OUT" ? "OPTED_OUT" : "CONSENT_NOT_PROVEN", evidenceRefs: latest ? [latest.evidenceRef] : [] };
  if (latest?.state === "OPTED_OUT") return { allowed: false, reason: "OPTED_OUT", evidenceRefs: [latest.evidenceRef] };
  return { allowed: true, reason: normalizedChannel === "TRANSACTIONAL" ? "TRANSACTIONAL_CONTEXT" : "SERVICE_CONTEXT", evidenceRefs: latest ? [latest.evidenceRef] : [] };
}

export function normalizeSegment(input) {
  const rules = (input.rules ?? []).map((rule) => ({ field: required(rule.field, "Segmentveld", 120), operator: oneOf(rule.operator, new Set(["EQUALS", "NOT_EQUALS", "CONTAINS", "IN", "EXISTS"]), "Segmentoperator"), value: structuredClone(rule.value) }));
  if (!rules.length) throw new Error("Een segment vereist minimaal één regel.");
  return { id: required(input.id, "Segment-ID", 160), organizationId: required(input.organizationId, "Segmentorganisatie", 160), name: required(input.name, "Segmentnaam", 240), rules, source: "CENTRAL_COMMUNICATION_STATE", evaluation: "SERVER_SIDE", updatedAt: iso(input.updatedAt ?? new Date()) };
}

export function normalizeCampaign(input) {
  return { id: required(input.id, "Campaign-ID", 160), organizationId: required(input.organizationId, "Campaignorganisatie", 160), name: required(input.name, "Campaignnaam", 240), channel: oneOf(input.channel ?? "COMMERCIAL", CHANNELS, "Campaignkanaal"), status: oneOf(input.status ?? "DRAFT", CAMPAIGN_STATES, "Campaignstatus"), segmentId: required(input.segmentId, "Segment-ID", 160), templateKey: required(input.templateKey, "Templatekey", 160), templateVersion: Number(input.templateVersion), senderPolicy: required(input.senderPolicy, "Sender policy", 160), trackingPolicy: input.trackingPolicy === "AGGREGATE" ? "AGGREGATE" : "ESSENTIAL_ONLY", goRequirement: "REQUIRED", scheduleAt: input.scheduleAt ? iso(input.scheduleAt) : null, rateLimitPerMinute: Math.max(1, Math.min(10_000, Number(input.rateLimitPerMinute ?? 60))), createdAt: iso(input.createdAt ?? new Date()), updatedAt: iso(input.updatedAt ?? new Date()) };
}

export function normalizeJourney(input) {
  const steps = (input.steps ?? []).map((step, index) => ({ id: required(step.id ?? `step-${index + 1}`, "Journey step-ID", 160), type: oneOf(step.type, new Set(["WAIT", "CONDITION", "PREPARE_MAIL", "REQUEST_GO", "SEND_AFTER_GO", "STOP"]), "Journey steptype"), configuration: structuredClone(step.configuration ?? {}) }));
  if (!steps.length || steps.at(-1)?.type !== "STOP") throw new Error("Een journey moet expliciet met STOP eindigen.");
  return { id: required(input.id, "Journey-ID", 160), organizationId: required(input.organizationId, "Journeyorganisatie", 160), name: required(input.name, "Journeynaam", 240), status: oneOf(input.status ?? "DRAFT", JOURNEY_STATES, "Journeystatus"), trigger: structuredClone(input.trigger ?? {}), steps, goRequirement: "REQUIRED_BEFORE_EXTERNAL_SEND", createdAt: iso(input.createdAt ?? new Date()), updatedAt: iso(input.updatedAt ?? new Date()) };
}

export function assertBulkExecutionPolicy({ campaign, recipients, transportConnected, humanApproved, now = new Date() }) {
  const normalized = normalizeCampaign(campaign);
  const uniqueRecipients = new Set((recipients ?? []).map(({ address }) => String(address).toLowerCase()));
  if (!uniqueRecipients.size) throw new Error("Campaign heeft geen ontvangers.");
  if (uniqueRecipients.size !== recipients.length) throw new Error("Campaign bevat dubbele ontvangers.");
  if (!transportConnected) return { allowed: false, stage: "PREPARED", reason: "BULK_TRANSPORT_NOT_CONNECTED" };
  if (!humanApproved || normalized.status !== "APPROVED") return { allowed: false, stage: "WAITING_FOR_GO", reason: "HUMAN_GO_REQUIRED" };
  if (normalized.scheduleAt && new Date(normalized.scheduleAt) > now) return { allowed: false, stage: "SCHEDULED", reason: "SCHEDULE_NOT_REACHED" };
  return { allowed: true, stage: "EXECUTE", reason: "APPROVED_POLICY_BOUND_EXECUTION", recipientCount: uniqueRecipients.size, rateLimitPerMinute: normalized.rateLimitPerMinute };
}

export const wbdCommunicationsDomainContract = Object.freeze({ contacts: "CENTRAL", consent: "EVIDENCE_REQUIRED", suppression: "FAIL_CLOSED", campaigns: "HUMAN_GO", journeys: "HUMAN_GO_BEFORE_SEND", bulkTransport: "PROVIDER_BOUNDARY", tracking: "PRIVACY_MINIMIZED", senderIdentity: "SERVER_SIDE_POLICY" });
