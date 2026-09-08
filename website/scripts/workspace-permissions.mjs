import { randomUUID } from "node:crypto";
import { CAPABILITIES, CAPABILITY_IDS, DEFAULT_PERMISSION_PRESETS } from "../src/workspace-permission-catalog.mjs";

const deny = (message, statusCode = 403, code = "CAPABILITY_DENIED") => { throw Object.assign(new Error(message), { statusCode, code }); };
const known = id => Object.hasOwn(CAPABILITIES, id);
const record = value => value && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const safeKey = key => typeof key === "string" && key.length > 0 && !["__proto__", "constructor", "prototype"].includes(key);
const activeAt = (grant, now) => (!grant.startsAt || Date.parse(grant.startsAt) <= now) && (!grant.expiresAt || Date.parse(grant.expiresAt) > now);
export function validatePermissionPolicy(policy) {
  if (!policy || policy.schemaVersion !== 1 || typeof policy.tenantId !== "string" || !policy.tenantId || !Number.isSafeInteger(policy.version) || policy.version < 1) deny("Ongeldige rechtenconfiguratie.", 400);
  for (const key of ["enabledCapabilities", "deniedCapabilities"]) if (!Array.isArray(policy[key]) || policy[key].some(id => !known(id))) deny("Onbekende capability in tenantbeleid.", 400);
  if (!record(policy.presets) || !record(policy.users) || Object.keys(policy.presets).some(key => !safeKey(key)) || Object.keys(policy.users).some(key => !safeKey(key))) deny("Ongeldige rechtenstructuur.", 400);
  for (const preset of Object.values(policy.presets)) if (!record(preset) || typeof preset.label !== "string" || !Array.isArray(preset.capabilities) || preset.capabilities.some(id => !known(id))) deny("Ongeldige preset.", 400);
  if (!policy.users || !Array.isArray(policy.teams) || !Array.isArray(policy.grants) || !Array.isArray(policy.audit)) deny("Onvolledige rechtenconfiguratie.", 400);
  for (const user of Object.values(policy.users)) {
    if (!record(user) || !Object.hasOwn(policy.presets, user.presetId) || !record(user.overrides) || Object.entries(user.overrides).some(([id, value]) => !known(id) || !["allow", "deny"].includes(value))) deny("Ongeldige gebruikersrechten.", 400);
  }
  for (const team of policy.teams) if (!team.id || !Array.isArray(team.memberIds) || !Array.isArray(team.capabilities) || team.capabilities.some(id => !known(id))) deny("Ongeldig team.", 400);
  for (const grant of policy.grants) {
    if (!grant.id || !Object.hasOwn(policy.users, grant.userId) || !Array.isArray(grant.capabilities) || grant.capabilities.some(id => !known(id)) || grant.tenantId !== policy.tenantId) deny("Ongeldige tijdelijke grant.", 400);
    if ([grant.startsAt, grant.expiresAt].filter(Boolean).some(value => !Number.isFinite(Date.parse(value))) || grant.startsAt && grant.expiresAt && Date.parse(grant.expiresAt) <= Date.parse(grant.startsAt)) deny("Ongeldige geldigheid van grant.", 400);
    if (grant.object && (typeof grant.object.id !== "string" || typeof grant.object.type !== "string" || grant.capabilities.some(id => !CAPABILITIES[id].objectGrantAllowed))) deny("Deze grant mag geen beheerrecht aan een object verbinden.", 400);
  }
  return policy;
}
export function createPermissionPolicy(tenantId, users, { enabledCapabilities = [], presets = DEFAULT_PERMISSION_PRESETS } = {}) {
  return validatePermissionPolicy({ schemaVersion: 1, tenantId, version: 1, enabledCapabilities: [...enabledCapabilities], deniedCapabilities: [], presets: structuredClone(presets), users: structuredClone(users), teams: [], grants: [], audit: [] });
}
/** No session data here. Each request must load current persisted policy before compiling/checking. */
export function compileEffectivePermissions(policy, userId, now = Date.now()) {
  const user = Object.hasOwn(policy.users, userId) ? policy.users[userId] : null;
  const preset = user && policy.presets[user.presetId];
  const enabled = new Set(policy.enabledCapabilities); const denied = new Set(policy.deniedCapabilities);
  const teamPermissions = new Map(policy.teams.filter(team => team.memberIds.includes(userId)).flatMap(team => team.capabilities.map(id => [id, team.id])));
  const grants = policy.grants.filter(grant => grant.userId === userId && grant.tenantId === policy.tenantId && !grant.object && activeAt(grant, now));
  const decisions = {};
  for (const id of CAPABILITY_IDS) {
    let allowed = false; let source = "Niet toegekend";
    if (!user || user.disabled) source = "Gebruiker niet actief in tenantbeleid";
    else if (!enabled.has(id)) source = "Component niet geactiveerd in tenantbeleid";
    else if (denied.has(id)) source = "Uitgeschakeld via tenantbeleid";
    else if (user.overrides[id] === "deny") source = "Uitgeschakeld via individuele override";
    else if (user.overrides[id] === "allow") { allowed = true; source = "Toegestaan via individuele override"; }
    else if (preset?.capabilities.includes(id)) { allowed = true; source = `Toegestaan via ${preset.label}`; }
    else if (teamPermissions.has(id)) { allowed = true; source = `Toegestaan via team ${teamPermissions.get(id)}`; }
    else { const grant = grants.find(grant => grant.capabilities.includes(id)); if (grant) { allowed = true; source = `Toegestaan via tijdelijke grant ${grant.id}`; } }
    decisions[id] = { allowed, source };
  }
  const expiry = policy.grants.filter(grant => grant.userId === userId).flatMap(grant => [grant.startsAt, grant.expiresAt]).filter(value => value && Date.parse(value) > now).map(Date.parse);
  return { tenantId: policy.tenantId, userId, version: policy.version, presetId: user?.presetId || null, presetLabel: preset?.label || "Geen preset", overrideCount: Object.keys(user?.overrides || {}).length, decisions, allowed: Object.keys(decisions).filter(id => decisions[id].allowed), validUntil: expiry.length ? Math.min(...expiry) : null };
}
export function permissionDecision(policy, { tenantId, userId, preview = false }, capability, object = null, now = Date.now()) {
  const blocked = source => ({ allowed: false, source, capability, version: policy.version });
  if (tenantId !== policy.tenantId || !known(capability)) return blocked("Tenant of capability niet geldig");
  const metadata = CAPABILITIES[capability];
  if (preview && metadata.action !== "view") return blocked("Bekijk als gebruiker is alleen-lezen");
  const compiled = compileEffectivePermissions(policy, userId, now); const decision = compiled.decisions[capability];
  if (!object) return { ...decision, capability, version: policy.version };
  if (object.tenantId !== tenantId || !object.id || !object.type) return blocked("Object behoort niet tot deze tenant");
  const user = Object.hasOwn(policy.users, userId) ? policy.users[userId] : null;
  if (!user || user.disabled || !policy.enabledCapabilities.includes(capability) || policy.deniedCapabilities.includes(capability) || user.overrides[capability] === "deny") return { ...decision, allowed: false, capability, version: policy.version };
  const memberTeams = policy.teams.filter(team => team.memberIds.includes(userId)).map(team => team.id);
  const owner = object.ownerId === userId;
  const shares = (object.shares || []).filter(share => share.subjectType === "user" && share.subjectId === userId || share.subjectType === "team" && memberTeams.includes(share.subjectId) || share.subjectType === "tenant" && share.subjectId === tenantId);
  // Module permissions never expose another person's private object. A share is explicit object authority.
  const visible = owner || object.visibility === "tenant" || object.visibility === "team" && memberTeams.includes(object.teamId) || shares.length > 0;
  const temporary = policy.grants.find(grant => grant.userId === userId && grant.tenantId === tenantId && grant.object?.id === object.id && grant.object.type === object.type && grant.capabilities.includes(capability) && activeAt(grant, now));
  if (!visible && !temporary) return blocked("Privéobject: geen expliciete toegang");
  if (decision.allowed && (owner || object.visibility === "tenant" || object.visibility === "team" && memberTeams.includes(object.teamId))) return { ...decision, capability, version: policy.version };
  if (metadata.objectGrantAllowed && (shares.some(share => share.capabilities?.includes(capability)) || temporary)) return { allowed: true, source: temporary ? `Alleen dit object via grant ${temporary.id}` : "Alleen dit object via expliciete deling", capability, version: policy.version };
  return blocked("Geen actiebevoegdheid op dit object");
}
export function assertPermission(policy, context, capability, object = null, now = Date.now()) {
  const decision = permissionDecision(policy, context, capability, object, now);
  if (!decision.allowed) deny(`${CAPABILITIES[capability]?.label || "Actie"} niet toegestaan: ${decision.source}.`);
  return decision;
}
export function updateUserPermissions(policy, context, input, now = new Date()) {
  const authority = assertPermission(policy, context, "management.permissions", null, now.getTime());
  if (input.expectedVersion !== policy.version) deny("Rechten zijn intussen gewijzigd. Vernieuw voordat je opslaat.", 409, "PERMISSION_VERSION_CONFLICT");
  if (!Object.hasOwn(policy.users, input.userId)) deny("Gebruiker niet gevonden.", 404);
  const previous = structuredClone(policy.users[input.userId]);
  const next = { ...previous, presetId: input.presetId ?? previous.presetId, overrides: input.reset ? {} : input.overrides ?? previous.overrides };
  const candidate = structuredClone(policy); candidate.users[input.userId] = next; validatePermissionPolicy(candidate);
  const actor = compileEffectivePermissions(policy, context.userId, now.getTime());
  const before = compileEffectivePermissions(policy, input.userId, now.getTime()); const after = compileEffectivePermissions(candidate, input.userId, now.getTime());
  const technical = actor.decisions["developer.manage"].allowed;
  // Owner/managers cannot grant latent technical authority by selecting a preset while its feature gate is OFF.
  const potential = new Set([...candidate.presets[next.presetId].capabilities, ...Object.keys(next.overrides).filter(id => next.overrides[id] === "allow")]);
  if (!technical && [...potential].some(id => CAPABILITIES[id].risk === "critical" && next.overrides[id] !== "deny")) deny("Technische authority kan alleen door Developer/Admin worden toegewezen.");
  if (!technical && after.allowed.some(id => !before.allowed.includes(id) && !actor.allowed.includes(id))) deny("Je kunt geen rechten toekennen die je zelf niet mag beheren.");
  const hadAdmin = Object.keys(policy.users).some(id => compileEffectivePermissions(policy, id, now.getTime()).decisions["management.permissions"].allowed);
  if (hadAdmin && !Object.keys(candidate.users).some(id => compileEffectivePermissions(candidate, id, now.getTime()).decisions["management.permissions"].allowed)) deny("De laatste beheerder van rechten kan niet worden verwijderd.");
  candidate.version++;
  candidate.audit.push({ id: randomUUID(), actor: context.userId, action: "PERMISSIONS_CHANGED", object: { type: "USER", id: input.userId }, at: now.toISOString(), capability: authority.capability, source: authority.source, result: "SUCCESS", previous, next: structuredClone(next), version: candidate.version });
  return candidate;
}
export function migrateLegacyPermissions(tenantId, legacyUsers, { roleMapping, enabledCapabilities = [] }) {
  const users = {}; const unresolved = [];
  for (const user of legacyUsers) {
    const mapping = Object.hasOwn(roleMapping, user.role) ? roleMapping[user.role] : null;
    if (!mapping || !Array.isArray(mapping.capabilities) || mapping.capabilities.some(id => !known(id))) { unresolved.push({ userId: user.id, role: user.role, reason: "LEGACY_MAPPING_UNKNOWN" }); users[user.id] = { presetId: "legacy-denied", overrides: {}, disabled: user.status !== "Actief" }; continue; }
    users[user.id] = { presetId: `legacy-${user.role}`, overrides: {}, disabled: user.status !== "Actief" };
  }
  const presets = { "legacy-denied": { label: "Niet gemapt — geen toegang", capabilities: [] } };
  for (const [role, mapping] of Object.entries(roleMapping)) if (Array.isArray(mapping.capabilities) && mapping.capabilities.every(known)) presets[`legacy-${role}`] = { label: `Bestaande ${role}`, capabilities: [...mapping.capabilities] };
  return { policy: createPermissionPolicy(tenantId, users, { presets, enabledCapabilities }), unresolved };
}
