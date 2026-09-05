import {
  canonicalJsonSha256,
  createTopLevelCopyOnWriteDraft,
  immutableSnapshot,
} from "./workspace-domain-storage-primitives.mjs";

export const SPORTPALEIS_DOMAIN_CONTRACT_VERSION = 1;

export const SPORTPALEIS_STATE_DOMAINS = Object.freeze({
  identity: Object.freeze([
    "users", "employees", "employeeDirectorySource", "sessions", "loginAttempts",
    "passwordResetRequests", "extraUserRequests", "reviewDeveloperAccess", "preferences", "activationInvites",
  ]),
  audit: Object.freeze(["audit"]),
  library: Object.freeze([
    "associations", "articles", "productionProfiles", "settings", "foilRolls",
    "productionElements", "productionFonts", "productionElementRequirements",
    "visualCompositions", "creativeVectorDrafts", "productionAssetSources", "websiteSync",
  ]),
  orders: Object.freeze(["orders"]),
  history: Object.freeze(["feedback"]),
  production: Object.freeze([
    "productionProposals", "teamkitProposals", "quickProductionIntakes",
  ]),
  artifacts: Object.freeze(["productionJobs"]),
  mailbox: Object.freeze(["mailbatches", "webshopIntake", "mailboxRouting", "mailFoundation"]),
  platform: Object.freeze([]),
});

const METADATA_KEYS = new Set([
  "schemaVersion", "organizationId", "revision", "nextOrderSequence",
  "nextTeamkitOrderSequence", "nextProductionJobSequence", "configurationVersion",
  "fontConfirmationVersion", "migrationWarnings",
]);

const DOMAIN_BY_KEY = new Map(Object.entries(SPORTPALEIS_STATE_DOMAINS)
  .flatMap(([domain, keys]) => keys.map((key) => [key, domain])));

export function sha256CanonicalJson(value) {
  return canonicalJsonSha256(value);
}

export function immutableDomain(value) {
  return immutableSnapshot(value);
}

// Arrays with stable record identities are stored row-wise. The containing
// domain payload holds only scalars/maps. This list is deliberately explicit:
// adding a collection without an identity must fail the migration instead of
// silently falling back to another large JSON blob.
export const SPORTPALEIS_RECORD_COLLECTIONS = Object.freeze(new Set([
  "users", "employees", "sessions", "passwordResetRequests", "extraUserRequests", "activationInvites",
  "feedback", "associations", "articles", "productionProfiles", "foilRolls", "productionElements",
  "productionFonts", "productionElementRequirements", "visualCompositions", "creativeVectorDrafts",
  "productionAssetSources", "orders", "productionJobs", "productionProposals", "teamkitProposals",
  "quickProductionIntakes", "mailbatches",
]));

export function sportpaleisRecordIdentity(collectionKey, record) {
  if (!SPORTPALEIS_RECORD_COLLECTIONS.has(collectionKey)) throw new TypeError(`Collectie ${collectionKey} is niet recordgebonden.`);
  const identity = collectionKey === "sessions" ? record?.idHash : record?.id;
  if (!record || typeof record !== "object" || Array.isArray(record) || typeof identity !== "string" || !identity.trim()) {
    throw new TypeError(`Collectie ${collectionKey} bevat een record zonder stabiele id.`);
  }
  return identity;
}

export function detachSportpaleisRecordCollections(payload) {
  const scalar = {};
  const collections = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SPORTPALEIS_RECORD_COLLECTIONS.has(key)) {
      if (!Array.isArray(value)) throw new TypeError(`${key} moet een recordcollectie zijn.`);
      const identities = value.map((record) => sportpaleisRecordIdentity(key, record));
      if (new Set(identities).size !== identities.length) throw new Error(`${key} bevat dubbele recordidentities.`);
      collections[key] = value;
    } else scalar[key] = value;
  }
  return { scalar, collections };
}

export function sportpaleisDomainForStateKey(key) {
  if (METADATA_KEYS.has(key)) return "platform";
  return DOMAIN_BY_KEY.get(key) ?? "platform";
}

export function partitionSportpaleisState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("Sportpaleis-state moet een object zijn.");
  const domains = Object.fromEntries(Object.keys(SPORTPALEIS_STATE_DOMAINS).map((domain) => [domain, {}]));
  for (const [key, value] of Object.entries(state)) domains[sportpaleisDomainForStateKey(key)][key] = value;
  const seen = new Set(Object.values(domains).flatMap((domain) => Object.keys(domain)));
  if (seen.size !== Object.keys(state).length) throw new Error("Domeinpartitionering is niet verliesvrij.");
  return domains;
}

export function composeSportpaleisState(domains) {
  const state = {};
  for (const domain of Object.keys(SPORTPALEIS_STATE_DOMAINS)) {
    const payload = domains[domain] ?? {};
    for (const [key, value] of Object.entries(payload)) {
      if (Object.hasOwn(state, key)) throw new Error(`Statekey ${key} komt in meerdere domeinen voor.`);
      state[key] = value;
    }
  }
  return state;
}

export function sportpaleisDomainManifest(state) {
  const domains = partitionSportpaleisState(state);
  return Object.freeze(Object.fromEntries(Object.entries(domains).map(([domain, payload]) => [domain, Object.freeze({
    keys: Object.keys(payload).sort(),
    bytes: Buffer.byteLength(JSON.stringify(payload)),
    sha256: sha256CanonicalJson(payload),
  })])));
}

function cloneForDraft(key, value) {
  if (key === "audit" && Array.isArray(value)) return [...value];
  return structuredClone(value);
}

// Existing service mutations receive a state-shaped object, but only top-level
// domains that they actually touch are cloned. This is the compatibility seam
// used while service commands are moved to explicit domain repositories.
export function createLazySportpaleisStateDraft(snapshot) {
  return createTopLevelCopyOnWriteDraft(snapshot, {
    cloneValue: cloneForDraft,
    domainForKey: sportpaleisDomainForStateKey,
    hash: sha256CanonicalJson,
  });
}

export function assertSportpaleisDomainPayload(domain, payload, { maximumBytes = 32 * 1024 * 1024 } = {}) {
  if (!Object.hasOwn(SPORTPALEIS_STATE_DOMAINS, domain)) throw new TypeError(`Onbekend state-domein: ${domain}`);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError(`Domein ${domain} moet een object zijn.`);
  for (const key of Object.keys(payload)) {
    if (sportpaleisDomainForStateKey(key) !== domain) throw new Error(`Statekey ${key} hoort niet in domein ${domain}.`);
  }
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  if (bytes > maximumBytes) throw new RangeError(`Domein ${domain} overschrijdt het opslagbudget.`);
  return { domain, bytes, sha256: sha256CanonicalJson(payload) };
}

const ARRAY_STATE_KEYS = new Set([
  "users", "employees", "sessions", "passwordResetRequests", "extraUserRequests", "audit", "feedback",
  "associations", "articles", "productionProfiles", "foilRolls", "productionElements", "productionFonts",
  "productionElementRequirements", "visualCompositions", "creativeVectorDrafts", "orders", "productionJobs",
  "productionProposals", "teamkitProposals", "quickProductionIntakes", "mailbatches",
]);

export function assertIncrementalSportpaleisState(state, changedKeys) {
  if (state.organizationId !== "sport-2000-sportpaleis-bv" || !Number.isInteger(Number(state.schemaVersion))) {
    throw new Error("Sportpaleis-state-identiteit is ongeldig.");
  }
  for (const key of changedKeys) {
    const value = state[key];
    if (ARRAY_STATE_KEYS.has(key)) {
      if (!Array.isArray(value)) throw new TypeError(`${key} moet een array zijn.`);
      const ids = value.filter((record) => record && typeof record === "object" && typeof record.id === "string").map(({ id }) => id);
      if (new Set(ids).size !== ids.length) throw new Error(`${key} bevat dubbele identities.`);
    }
    const domain = sportpaleisDomainForStateKey(key);
    if (!Object.hasOwn(SPORTPALEIS_STATE_DOMAINS, domain)) throw new Error(`${key} heeft geen geldige domeinbinding.`);
    JSON.stringify(value);
  }
  return true;
}
