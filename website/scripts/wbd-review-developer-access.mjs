import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const WBD_REVIEW_DEVELOPER_PRINCIPAL = Object.freeze({
  id: "wbd-review-codex",
  name: "Codex Review & Development",
  principalType: "REVIEW_DEVELOPER",
  role: "operator",
  seatType: "system",
});

export const WBD_REVIEW_DEVELOPER_SCOPES = Object.freeze([
  "candidate.review.read",
  "candidate.ui.safe-interact",
  "candidate.debug.read",
  "candidate.test-state.isolated",
  "pilot.live-validation.read",
]);

export const WBD_REVIEW_DEVELOPER_FORBIDDEN_CAPABILITIES = Object.freeze([
  "production.data.write",
  "customer.communication.send",
  "orders.execute",
  "production.execute",
  "credentials.manage",
  "users.manage",
  "roles.manage",
  "release.deploy",
  "destructive.execute",
  "scope.expand",
]);

const DEFAULT_TTL_MS = 60 * 60 * 1_000;
const MIN_TTL_MS = 5 * 60 * 1_000;
const MAX_TTL_MS = 2 * 60 * 60 * 1_000;
export const WBD_REVIEW_AUDIT_RETENTION_POLICY = Object.freeze({ version: "WBD_REVIEW_AUDIT_RETENTION_V1", mode: "APPEND_ONLY", pruningAllowed: false });
export const WBD_REVIEW_DENIAL_AUDIT_PROVENANCE = "WBD_REVIEW_DEVELOPER_ACCESS_POLICY_V2";
const DENIAL_AUDIT_RECORD = Symbol("wbd-review-denial-audit-record");

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeHashEqual(left, right) {
  const leftBytes = Buffer.from(String(left), "hex");
  const rightBytes = Buffer.from(String(right), "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function nowIso(now) {
  return now.toISOString();
}

function error(message, code, statusCode = 403) {
  return Object.assign(new Error(message), { code, statusCode });
}

function normalizeIds(values) {
  return new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean));
}

function normalizeScopes(values) {
  const requested = [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))];
  if (!requested.length) throw error("Een tijdelijke reviewgrant vereist minimaal één expliciete capability.", "REVIEW_GRANT_SCOPE_REQUIRED", 400);
  const allowed = new Set(WBD_REVIEW_DEVELOPER_SCOPES);
  if (requested.some((scope) => !allowed.has(scope))) throw error("De gevraagde reviewcapability is niet toegestaan.", "REVIEW_GRANT_SCOPE_FORBIDDEN");
  return requested.sort();
}

function normalizeRunId(value) {
  const runId = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{7,95}$/u.test(runId)) throw error("Een unieke canonical run-ID is verplicht.", "REVIEW_GRANT_RUN_ID_INVALID", 400);
  return runId;
}

function normalizeReviewRole(value) {
  const role = String(value ?? "").trim().toLowerCase();
  if (role !== "operator") throw error("Tijdelijke Sportpaleis-reviewtoegang is uitsluitend beschikbaar als productiemedewerker.", "REVIEW_GRANT_ROLE_FORBIDDEN");
  return role;
}

function principalForGrant(grant) {
  return {
    ...WBD_REVIEW_DEVELOPER_PRINCIPAL,
    id: grant.principalId,
    name: `Codex productie-review · ${grant.runId}`,
    role: grant.role,
    runId: grant.runId,
    candidateId: grant.candidateId,
    scopes: [...grant.scopes],
    mutationDisabled: true,
  };
}

function appendAudit(state, { id = `audit-review-access-${randomBytes(8).toString("hex")}`, actorId, action, subject, details = {}, at }) {
  state.audit ??= [];
  const record = {
    id,
    at,
    userId: actorId,
    action,
    subject,
    details,
  };
  state.audit.unshift(record);
  return record;
}

function credentialFingerprint(value) {
  const normalized = String(value ?? "");
  return normalized ? `sha256:${sha256(normalized).slice(0, 16)}` : null;
}

function denialAuditContext({ operation, input, grant = null, credentialKind = null, credentialValue = null, issuer = null }) {
  const requestedTenantId = String(input?.tenantId ?? "").trim() || null;
  const requestedCandidateId = String(input?.candidateId ?? "").trim() || null;
  return {
    operation,
    provenance: WBD_REVIEW_DENIAL_AUDIT_PROVENANCE,
    principalId: grant?.principalId ?? issuer?.id ?? null,
    grantId: grant?.id ?? null,
    tenantId: grant?.tenantId ?? null,
    candidateId: grant?.candidateId ?? null,
    requestedTenantId,
    requestedCandidateId,
    credentialKind,
    credentialFingerprint: credentialKind ? credentialFingerprint(credentialValue) : null,
  };
}

function denyWithAudit(state, cause, context, now) {
  const record = appendAudit(state, {
    actorId: context.principalId ?? "unknown-review-caller",
    action: "Codex-review securityweigering",
    subject: context.grantId ?? WBD_REVIEW_DEVELOPER_PRINCIPAL.id,
    at: nowIso(now),
    details: {
      ...context,
      reason: cause?.code ?? "REVIEW_ACCESS_DENIED",
      statusCode: Number(cause?.statusCode) || 403,
    },
  });
  Object.defineProperty(cause, DENIAL_AUDIT_RECORD, { value: Object.freeze(structuredClone(record)), enumerable: false });
  throw cause;
}

export function persistWbdReviewDeveloperAccessDenial(state, cause) {
  const record = cause?.[DENIAL_AUDIT_RECORD];
  if (!record) return false;
  state.audit ??= [];
  if (!state.audit.some(({ id }) => id === record.id)) state.audit.unshift(structuredClone(record));
  return true;
}

export function ensureWbdReviewDeveloperAccessState(state) {
  state.reviewDeveloperAccess ??= { grants: [], auditRetentionPolicy: { ...WBD_REVIEW_AUDIT_RETENTION_POLICY } };
  state.reviewDeveloperAccess.grants ??= [];
  state.reviewDeveloperAccess.auditRetentionPolicy = { ...WBD_REVIEW_AUDIT_RETENTION_POLICY };
  return state.reviewDeveloperAccess;
}

function publicGrant(grant) {
  return {
    id: grant.id,
    principalId: grant.principalId,
    tenantId: grant.tenantId,
    candidateId: grant.candidateId,
    runId: grant.runId,
    role: grant.role,
    mutationDisabled: true,
    scopes: [...grant.scopes],
    humanGoReference: grant.humanGoReference,
    authorizedBy: grant.authorizedBy,
    createdAt: grant.createdAt,
    startsAt: grant.startsAt,
    expiresAt: grant.expiresAt,
    activatedAt: grant.activatedAt,
    revokedAt: grant.revokedAt,
    completedAt: grant.completedAt,
    state: grant.revokedAt ? "REVOKED" : grant.completedAt ? "COMPLETED" : grant.activatedAt ? "ACTIVE" : "AWAITING_ACTIVATION",
  };
}

export class WbdReviewDeveloperAccessPolicy {
  constructor({ issuerPrincipalIds = [], allowedCandidateIds = [], tenantId, maximumTtlMs = MAX_TTL_MS } = {}) {
    this.issuerPrincipalIds = normalizeIds(issuerPrincipalIds);
    this.allowedCandidateIds = normalizeIds(allowedCandidateIds);
    this.tenantId = String(tenantId ?? "").trim();
    this.maximumTtlMs = Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Number(maximumTtlMs) || MAX_TTL_MS));
  }

  issueGrant(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const issuer = input?.issuer;
    const candidateId = String(input?.candidateId ?? "").trim();
    const tenantId = String(input?.tenantId ?? "").trim();
    const humanGoReference = String(input?.humanGoReference ?? "").trim();
    try {
      if (!issuer || !this.issuerPrincipalIds.has(issuer.id) || issuer.role !== "admin" || issuer.status !== "Actief") throw error("Alleen de geconfigureerde Human GO-authority mag tijdelijke reviewtoegang uitgeven.", "REVIEW_GRANT_ISSUER_FORBIDDEN");
      if (!this.tenantId || tenantId !== this.tenantId) throw error("Tenant komt niet overeen met de reviewtoegang.", "REVIEW_GRANT_TENANT_MISMATCH");
      if (!candidateId || !this.allowedCandidateIds.has(candidateId)) throw error("Candidate is niet actief voor gecontroleerde review.", "REVIEW_GRANT_CANDIDATE_FORBIDDEN");
      if (!/^GO-[A-Z0-9][A-Z0-9._:-]{5,159}$/u.test(humanGoReference)) throw error("Een concrete Human GO-referentie is verplicht.", "REVIEW_GRANT_HUMAN_GO_REQUIRED", 400);
      const runId = normalizeRunId(input?.runId);
      const role = normalizeReviewRole(input?.role);
      if (access.grants.some((grant) => grant.runId === runId && !grant.revokedAt && !grant.completedAt && new Date(grant.expiresAt).getTime() > now.getTime())) {
        throw error("Deze Codex-run heeft al een actieve tijdelijke reviewtoegang.", "REVIEW_GRANT_RUN_ID_ACTIVE", 409);
      }
      const scopes = normalizeScopes(input?.scopes);
      const requestedTtlMs = Number(input?.ttlMs) || DEFAULT_TTL_MS;
      if (requestedTtlMs < MIN_TTL_MS || requestedTtlMs > this.maximumTtlMs) throw error("De tijdelijke reviewduur valt buiten de toegestane grens.", "REVIEW_GRANT_TTL_INVALID", 400);
      const rawActivationToken = randomBytes(32).toString("base64url");
      const principalId = `wbd-review-${sha256(`${runId}:${rawActivationToken}`).slice(0, 20)}`;
      const grant = {
        id: `review-grant-${randomBytes(10).toString("hex")}`,
        principalId,
        runId,
        role,
        tenantId,
        candidateId,
        scopes,
        humanGoReference,
        authorizedBy: issuer.id,
        createdAt: nowIso(now),
        startsAt: nowIso(now),
        expiresAt: nowIso(new Date(now.getTime() + requestedTtlMs)),
        activationTokenHash: sha256(rawActivationToken),
        activationUsedAt: null,
        activatedAt: null,
        revokedAt: null,
        revokedBy: null,
        completedAt: null,
        sessions: [],
      };
      access.grants.push(grant);
      appendAudit(state, { actorId: issuer.id, action: "Tijdelijke Codex-reviewtoegang geautoriseerd", subject: grant.id, at: nowIso(now), details: { principalId: grant.principalId, runId, role, mutationDisabled: true, tenantId, candidateId, scopes, humanGoReference, expiresAt: grant.expiresAt } });
      return { grant: publicGrant(grant), activationToken: rawActivationToken };
    } catch (cause) {
      denyWithAudit(state, cause, denialAuditContext({ operation: "ISSUE_GRANT", input, issuer }), now);
    }
  }

  activateGrant(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const tokenHash = sha256(input?.activationToken ?? "");
    const grant = access.grants.find((candidate) => safeHashEqual(candidate.activationTokenHash, tokenHash));
    try {
      if (!grant) throw error("Tijdelijke reviewtoegang is onbekend.", "REVIEW_GRANT_UNKNOWN", 401);
      this.#assertGrantActive(grant, input, now, { allowUnactivated: true });
      if (grant.activationUsedAt) throw error("De tijdelijke activatielink is al gebruikt.", "REVIEW_GRANT_ACTIVATION_REPLAY", 409);
      const sessionToken = randomBytes(32).toString("base64url");
      const csrfToken = randomBytes(24).toString("base64url");
      grant.activationUsedAt = nowIso(now);
      grant.activatedAt ??= nowIso(now);
      grant.sessions.push({
        idHash: sha256(sessionToken),
        csrfHash: sha256(csrfToken),
        createdAt: nowIso(now),
        lastSeenAt: nowIso(now),
        expiresAt: grant.expiresAt,
        endedAt: null,
      });
      appendAudit(state, { actorId: grant.principalId, action: "Tijdelijke Codex-reviewsessie gestart", subject: grant.id, at: nowIso(now), details: { tenantId: grant.tenantId, candidateId: grant.candidateId, humanGoReference: grant.humanGoReference, expiresAt: grant.expiresAt } });
      return { grant: publicGrant(grant), principal: principalForGrant(grant), sessionToken, csrfToken, expiresAt: grant.expiresAt };
    } catch (cause) {
      denyWithAudit(state, cause, denialAuditContext({ operation: "ACTIVATE_GRANT", input, grant, credentialKind: "ACTIVATION_TOKEN", credentialValue: input?.activationToken }), now);
    }
  }

  authenticateSession(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const sessionHash = sha256(input?.sessionToken ?? "");
    const grant = access.grants.find((candidate) => candidate.sessions.some(({ idHash }) => safeHashEqual(idHash, sessionHash)));
    try {
      if (!grant) throw error("Tijdelijke reviewsessie is onbekend.", "REVIEW_SESSION_UNKNOWN", 401);
      this.#assertGrantActive(grant, input, now);
      const session = grant.sessions.find(({ idHash }) => safeHashEqual(idHash, sessionHash));
      if (!session || session.endedAt || new Date(session.expiresAt).getTime() <= now.getTime()) throw error("Tijdelijke reviewsessie is verlopen.", "REVIEW_SESSION_EXPIRED", 401);
      return { grant, session, principal: principalForGrant(grant) };
    } catch (cause) {
      denyWithAudit(state, cause, denialAuditContext({ operation: "AUTHENTICATE_SESSION", input, grant, credentialKind: "SESSION_TOKEN", credentialValue: input?.sessionToken }), now);
    }
  }

  rotateSessionCsrf(state, input, now = new Date()) {
    const context = this.authenticateSession(state, input, now);
    const csrfToken = randomBytes(24).toString("base64url");
    context.session.csrfHash = sha256(csrfToken);
    context.session.lastSeenAt = nowIso(now);
    return { ...context, csrfToken };
  }

  authorizeCapability(state, input, now = new Date()) {
    const context = this.authenticateSession(state, input, now);
    const capability = String(input?.capability ?? "").trim();
    if (WBD_REVIEW_DEVELOPER_FORBIDDEN_CAPABILITIES.includes(capability) || !context.grant.scopes.includes(capability)) {
      appendAudit(state, { actorId: context.grant.principalId, action: "Codex-reviewactie geweigerd", subject: context.grant.id, at: nowIso(now), details: { capability, route: String(input?.route ?? ""), method: String(input?.method ?? ""), reason: "OUTSIDE_GRANT_SCOPE" } });
      throw error("Deze actie valt buiten de tijdelijke Human GO-scope.", "REVIEW_CAPABILITY_FORBIDDEN");
    }
    context.session.lastSeenAt = nowIso(now);
    appendAudit(state, { actorId: context.grant.principalId, action: "Codex-reviewactie uitgevoerd", subject: context.grant.id, at: nowIso(now), details: { capability, route: String(input?.route ?? ""), method: String(input?.method ?? ""), humanGoReference: context.grant.humanGoReference } });
    return { grant: publicGrant(context.grant), principal: context.principal, capability };
  }

  revokeGrant(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const issuer = input?.issuer;
    const grant = access.grants.find(({ id }) => id === input.grantId);
    try {
      if (!issuer || !this.issuerPrincipalIds.has(issuer.id) || issuer.role !== "admin" || issuer.status !== "Actief") throw error("Alleen de Human GO-authority mag tijdelijke reviewtoegang intrekken.", "REVIEW_GRANT_REVOKE_FORBIDDEN");
      if (!grant) throw error("Reviewgrant bestaat niet.", "REVIEW_GRANT_UNKNOWN", 404);
      grant.revokedAt ??= nowIso(now);
      grant.revokedBy ??= issuer.id;
      for (const session of grant.sessions) session.endedAt ??= nowIso(now);
      appendAudit(state, { actorId: issuer.id, action: "Tijdelijke Codex-reviewtoegang ingetrokken", subject: grant.id, at: nowIso(now), details: { principalId: grant.principalId, humanGoReference: grant.humanGoReference } });
      return publicGrant(grant);
    } catch (cause) {
      denyWithAudit(state, cause, denialAuditContext({ operation: "REVOKE_GRANT", input, grant, issuer }), now);
    }
  }

  completeSession(state, input, now = new Date()) {
    let context;
    try {
      context = this.authenticateSession(state, input, now);
      if (!safeHashEqual(context.session.csrfHash, sha256(input?.csrfToken ?? ""))) throw error("Ongeldige beveiligingscontrole voor de tijdelijke reviewsessie.", "REVIEW_CSRF_INVALID");
      context.session.endedAt = nowIso(now);
      context.grant.completedAt ??= nowIso(now);
      appendAudit(state, { actorId: context.grant.principalId, action: "Tijdelijke Codex-reviewsequence afgerond", subject: context.grant.id, at: nowIso(now), details: { humanGoReference: context.grant.humanGoReference, candidateId: context.grant.candidateId } });
      return publicGrant(context.grant);
    } catch (cause) {
      if (cause?.[DENIAL_AUDIT_RECORD]) throw cause;
      denyWithAudit(state, cause, denialAuditContext({ operation: "COMPLETE_SESSION", input, grant: context?.grant, credentialKind: "SESSION_TOKEN", credentialValue: input?.sessionToken }), now);
    }
  }

  #assertGrantActive(grant, input, now, { allowUnactivated = false } = {}) {
    if (grant.tenantId !== String(input?.tenantId ?? "").trim()) throw error("Tenant komt niet overeen met de tijdelijke reviewtoegang.", "REVIEW_GRANT_TENANT_MISMATCH");
    const requestedCandidateId = String(input?.candidateId ?? "").trim();
    if (requestedCandidateId && grant.candidateId !== requestedCandidateId) throw error("Candidate komt niet overeen met de tijdelijke reviewtoegang.", "REVIEW_GRANT_CANDIDATE_MISMATCH");
    if (grant.revokedAt || grant.completedAt) throw error("Tijdelijke reviewtoegang is beëindigd.", "REVIEW_GRANT_INACTIVE", 401);
    if (new Date(grant.startsAt).getTime() > now.getTime()) throw error("Tijdelijke reviewtoegang is nog niet actief.", "REVIEW_GRANT_NOT_STARTED", 401);
    if (new Date(grant.expiresAt).getTime() <= now.getTime()) throw error("Tijdelijke reviewtoegang is verlopen.", "REVIEW_GRANT_EXPIRED", 401);
    if (!allowUnactivated && !grant.activatedAt) throw error("Tijdelijke reviewtoegang is niet geactiveerd.", "REVIEW_GRANT_NOT_ACTIVATED", 401);
  }
}
