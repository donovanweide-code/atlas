import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const WBD_REVIEW_DEVELOPER_PRINCIPAL = Object.freeze({
  id: "wbd-review-codex",
  name: "Codex Review & Development",
  principalType: "REVIEW_DEVELOPER",
  role: "reviewer",
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
const MAX_TTL_MS = 4 * 60 * 60 * 1_000;
export const WBD_REVIEW_AUDIT_RETENTION_POLICY = Object.freeze({ version: "WBD_REVIEW_AUDIT_RETENTION_V1", mode: "APPEND_ONLY", pruningAllowed: false });

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

function appendAudit(state, { actorId, action, subject, details = {}, at }) {
  state.audit ??= [];
  state.audit.unshift({
    id: `audit-review-access-${randomBytes(8).toString("hex")}`,
    at,
    userId: actorId,
    action,
    subject,
    details,
  });
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
    if (!issuer || !this.issuerPrincipalIds.has(issuer.id) || issuer.role !== "admin" || issuer.status !== "Actief") {
      appendAudit(state, { actorId: issuer?.id ?? "unknown", action: "Tijdelijke reviewtoegang geweigerd", subject: WBD_REVIEW_DEVELOPER_PRINCIPAL.id, at: nowIso(now), details: { reason: "ISSUER_NOT_AUTHORIZED", candidateId, tenantId } });
      throw error("Alleen de geconfigureerde Human GO-authority mag tijdelijke reviewtoegang uitgeven.", "REVIEW_GRANT_ISSUER_FORBIDDEN");
    }
    if (!this.tenantId || tenantId !== this.tenantId) throw error("Tenant komt niet overeen met de reviewtoegang.", "REVIEW_GRANT_TENANT_MISMATCH");
    if (!candidateId || !this.allowedCandidateIds.has(candidateId)) throw error("Candidate is niet actief voor gecontroleerde review.", "REVIEW_GRANT_CANDIDATE_FORBIDDEN");
    if (!/^GO-[A-Z0-9][A-Z0-9._:-]{5,159}$/u.test(humanGoReference)) throw error("Een concrete Human GO-referentie is verplicht.", "REVIEW_GRANT_HUMAN_GO_REQUIRED", 400);
    const scopes = normalizeScopes(input?.scopes);
    const requestedTtlMs = Number(input?.ttlMs) || DEFAULT_TTL_MS;
    if (requestedTtlMs < MIN_TTL_MS || requestedTtlMs > this.maximumTtlMs) throw error("De tijdelijke reviewduur valt buiten de toegestane grens.", "REVIEW_GRANT_TTL_INVALID", 400);
    const rawActivationToken = randomBytes(32).toString("base64url");
    const grant = {
      id: `review-grant-${randomBytes(10).toString("hex")}`,
      principalId: WBD_REVIEW_DEVELOPER_PRINCIPAL.id,
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
    appendAudit(state, { actorId: issuer.id, action: "Tijdelijke Codex-reviewtoegang geautoriseerd", subject: grant.id, at: nowIso(now), details: { principalId: grant.principalId, tenantId, candidateId, scopes, humanGoReference, expiresAt: grant.expiresAt } });
    return { grant: publicGrant(grant), activationToken: rawActivationToken };
  }

  activateGrant(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const tokenHash = sha256(input?.activationToken ?? "");
    const grant = access.grants.find((candidate) => safeHashEqual(candidate.activationTokenHash, tokenHash));
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
    return { grant: publicGrant(grant), principal: { ...WBD_REVIEW_DEVELOPER_PRINCIPAL }, sessionToken, csrfToken, expiresAt: grant.expiresAt };
  }

  authenticateSession(state, input, now = new Date()) {
    const access = ensureWbdReviewDeveloperAccessState(state);
    const sessionHash = sha256(input?.sessionToken ?? "");
    const grant = access.grants.find((candidate) => candidate.sessions.some(({ idHash }) => safeHashEqual(idHash, sessionHash)));
    if (!grant) throw error("Tijdelijke reviewsessie is onbekend.", "REVIEW_SESSION_UNKNOWN", 401);
    this.#assertGrantActive(grant, input, now);
    const session = grant.sessions.find(({ idHash }) => safeHashEqual(idHash, sessionHash));
    if (!session || session.endedAt || new Date(session.expiresAt).getTime() <= now.getTime()) throw error("Tijdelijke reviewsessie is verlopen.", "REVIEW_SESSION_EXPIRED", 401);
    return { grant, session, principal: { ...WBD_REVIEW_DEVELOPER_PRINCIPAL, candidateId: grant.candidateId, scopes: [...grant.scopes] } };
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
    if (!issuer || !this.issuerPrincipalIds.has(issuer.id) || issuer.role !== "admin" || issuer.status !== "Actief") throw error("Alleen de Human GO-authority mag tijdelijke reviewtoegang intrekken.", "REVIEW_GRANT_REVOKE_FORBIDDEN");
    const grant = access.grants.find(({ id }) => id === input.grantId);
    if (!grant) throw error("Reviewgrant bestaat niet.", "REVIEW_GRANT_UNKNOWN", 404);
    grant.revokedAt ??= nowIso(now);
    grant.revokedBy ??= issuer.id;
    for (const session of grant.sessions) session.endedAt ??= nowIso(now);
    appendAudit(state, { actorId: issuer.id, action: "Tijdelijke Codex-reviewtoegang ingetrokken", subject: grant.id, at: nowIso(now), details: { principalId: grant.principalId, humanGoReference: grant.humanGoReference } });
    return publicGrant(grant);
  }

  completeSession(state, input, now = new Date()) {
    const context = this.authenticateSession(state, input, now);
    if (!safeHashEqual(context.session.csrfHash, sha256(input?.csrfToken ?? ""))) throw error("Ongeldige beveiligingscontrole voor de tijdelijke reviewsessie.", "REVIEW_CSRF_INVALID");
    context.session.endedAt = nowIso(now);
    context.grant.completedAt ??= nowIso(now);
    appendAudit(state, { actorId: context.grant.principalId, action: "Tijdelijke Codex-reviewsequence afgerond", subject: context.grant.id, at: nowIso(now), details: { humanGoReference: context.grant.humanGoReference, candidateId: context.grant.candidateId } });
    return publicGrant(context.grant);
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
