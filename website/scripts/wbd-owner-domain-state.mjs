import {
  canonicalJsonSha256,
  createTopLevelCopyOnWriteDraft,
  immutableSnapshot,
} from "./workspace-domain-storage-primitives.mjs";
import { validateWbdCapabilityCatalog } from "./wbd-capability-catalog.mjs";
import { validateControlPlane } from "./wbd-control-plane.mjs";
import { validatePromotionBoundary } from "./wbd-promotion-boundary.mjs";
import { validateAtlasControlPlane } from "./wbd-atlas-control-plane.mjs";
import { validateProductTruth } from "./wbd-product-truth.mjs";
import { isWorkspacePasswordRecord } from "./workspace-auth-foundation.mjs";

export const WBD_OWNER_DOMAIN_CONTRACT_VERSION = 1;
export const WBD_OWNER_ORGANIZATION_ID = "we-build-and-design";

export const WBD_OWNER_STATE_DOMAINS = Object.freeze({
  identity: Object.freeze(["owner", "sessions", "loginAttempts", "boundaries"]),
  capabilities: Object.freeze(["capabilities"]),
  productTruth: Object.freeze(["productTruth"]),
  controlPlane: Object.freeze(["controlPlane"]),
  atlas: Object.freeze(["atlasControlPlane"]),
  promotion: Object.freeze(["promotionBoundary"]),
  audit: Object.freeze(["audit"]),
  platform: Object.freeze(["schemaVersion", "organizationId", "revision"]),
});

const DOMAIN_BY_KEY = new Map(Object.entries(WBD_OWNER_STATE_DOMAINS)
  .flatMap(([domain, keys]) => keys.map((key) => [key, domain])));

function requiredString(value, label, maximum = 200) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maximum) throw new TypeError(`${label} is ongeldig.`);
  return normalized;
}

function validateOwner(value) {
  const owner = structuredClone(value);
  if (owner?.id !== "wbd-owner-donovan" || owner.role !== "OWNER" || owner.status !== "ACTIVE") throw new TypeError("WBD-owner identiteit is ongeldig.");
  owner.name = requiredString(owner.name, "Ownernaam", 120);
  owner.email = requiredString(owner.email, "Owner e-mail", 200).toLowerCase();
  if (!isWorkspacePasswordRecord(owner.password)) throw new TypeError("WBD-owner password-record is ongeldig.");
  owner.createdAt = requiredString(owner.createdAt, "Owner createdAt", 40);
  return owner;
}

function validateSessions(value) {
  if (!Array.isArray(value)) throw new TypeError("Owner-sessies moeten een array zijn.");
  const sessions = value.map((session) => ({
    idHash: requiredString(session.idHash, "Sessiehash", 64),
    userId: requiredString(session.userId, "Sessieowner", 80),
    csrfHash: requiredString(session.csrfHash, "CSRF-hash", 64),
    createdAt: requiredString(session.createdAt, "Sessiestart", 40),
    lastSeenAt: requiredString(session.lastSeenAt, "Laatste sessieactiviteit", 40),
    expiresAt: requiredString(session.expiresAt, "Sessieverval", 40),
    deviceMode: session.deviceMode === "PERSONAL" ? "PERSONAL" : "SHARED",
    authMethod: "PASSWORD",
  }));
  if (new Set(sessions.map(({ idHash }) => idHash)).size !== sessions.length) throw new TypeError("Owner-sessies bevatten dubbele identities.");
  return sessions;
}

function validateAudit(value) {
  if (!Array.isArray(value)) throw new TypeError("Owner-audit moet een array zijn.");
  const events = value.map((event) => ({
    id: requiredString(event.id, "Audit-ID", 80),
    actorId: requiredString(event.actorId, "Auditactor", 80),
    action: requiredString(event.action, "Auditactie", 160),
    subject: requiredString(event.subject, "Auditsubject", 200),
    occurredAt: requiredString(event.occurredAt, "Audittijd", 40),
  }));
  if (new Set(events.map(({ id }) => id)).size !== events.length) throw new TypeError("Owner-audit bevat dubbele identities.");
  return events;
}

export function wbdOwnerDomainForStateKey(key) {
  const domain = DOMAIN_BY_KEY.get(key);
  if (!domain) throw new TypeError(`Onbekende WBD-owner statekey: ${key}`);
  return domain;
}

export function partitionWbdOwnerState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("WBD-owner state moet een object zijn.");
  const domains = Object.fromEntries(Object.keys(WBD_OWNER_STATE_DOMAINS).map((domain) => [domain, {}]));
  for (const [key, value] of Object.entries(state)) domains[wbdOwnerDomainForStateKey(key)][key] = value;
  return domains;
}

export function composeWbdOwnerState(domains) {
  const state = {};
  for (const domain of Object.keys(WBD_OWNER_STATE_DOMAINS)) {
    for (const [key, value] of Object.entries(domains[domain] ?? {})) {
      if (Object.hasOwn(state, key)) throw new Error(`Owner-statekey ${key} komt in meerdere domeinen voor.`);
      state[key] = value;
    }
  }
  return state;
}

export function validateWbdOwnerStateKey(key, value) {
  switch (key) {
    case "schemaVersion": if (value !== 1) throw new TypeError("WBD-owner schemaversie is ongeldig."); return value;
    case "organizationId": if (value !== WBD_OWNER_ORGANIZATION_ID) throw new TypeError("WBD-owner organisatie is ongeldig."); return value;
    case "revision": if (!Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new TypeError("WBD-owner revisie is ongeldig."); return Number(value);
    case "owner": return validateOwner(value);
    case "sessions": return validateSessions(value);
    case "loginAttempts": if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Owner-loginpogingen zijn ongeldig."); return structuredClone(value);
    case "capabilities": return validateWbdCapabilityCatalog(value);
    case "productTruth": return validateProductTruth(value);
    case "controlPlane": return value === undefined ? undefined : validateControlPlane(value);
    case "atlasControlPlane": return validateAtlasControlPlane(value);
    case "promotionBoundary": return validatePromotionBoundary(value);
    case "audit": return validateAudit(value);
    case "boundaries": if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Owner-boundaries zijn ongeldig."); return { ...value, commercial: "FUTURE_SLICE", strategy: "FUTURE_SLICE", operations: "FUTURE_SLICE", atlasReadModel: "CAPABILITY_API_V1" };
    default: throw new TypeError(`Onbekende WBD-owner statekey: ${key}`);
  }
}

export function validateIncrementalWbdOwnerState(state, changedKeys) {
  if (state.organizationId !== WBD_OWNER_ORGANIZATION_ID || state.schemaVersion !== 1) throw new TypeError("WBD-owner state-identiteit is ongeldig.");
  const validated = new Map();
  for (const key of changedKeys) validated.set(key, validateWbdOwnerStateKey(key, state[key]));
  return validated;
}

function cloneValue(key, value) {
  if (key === "audit" || key === "sessions") return [...value];
  return structuredClone(value);
}

export function createLazyWbdOwnerStateDraft(snapshot) {
  return createTopLevelCopyOnWriteDraft(snapshot, {
    cloneValue,
    domainForKey: wbdOwnerDomainForStateKey,
    hash: canonicalJsonSha256,
  });
}

export function immutableWbdOwnerDomain(value) {
  return immutableSnapshot(value);
}

export function sha256WbdOwnerCanonicalJson(value) {
  return canonicalJsonSha256(value);
}

export function assertWbdOwnerDomainPayload(domain, payload, { maximumBytes = 16 * 1024 * 1024 } = {}) {
  if (!Object.hasOwn(WBD_OWNER_STATE_DOMAINS, domain)) throw new TypeError(`Onbekend WBD-owner domein: ${domain}`);
  for (const key of Object.keys(payload)) if (wbdOwnerDomainForStateKey(key) !== domain) throw new TypeError(`${key} hoort niet in owner-domein ${domain}.`);
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  if (bytes > maximumBytes) throw new RangeError(`WBD-owner domein ${domain} overschrijdt het opslagbudget.`);
  return Object.freeze({ domain, bytes, sha256: sha256WbdOwnerCanonicalJson(payload) });
}
