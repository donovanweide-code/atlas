import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isWorkspacePasswordRecord,
  safeEqualHex,
  verifyWorkspacePassword,
} from "./workspace-auth-foundation.mjs";
import {
  WBD_CAPABILITY_ENUMS,
  WBD_CAPABILITY_SEED,
  validateWbdCapability,
  validateWbdCapabilityCatalog,
} from "./wbd-capability-catalog.mjs";
import {
  appendControlAudit,
  controlRecordSourceRefs,
  createControlRecord,
  createInitialControlPlane,
  ensureControlPlane,
  projectControlOverview,
  publicControlPlane,
  updateControlRecord,
  validateControlPlane,
} from "./wbd-control-plane.mjs";
import {
  createInitialPromotionBoundary,
  publicPromotionView,
  reviewPromotion,
  validatePromotionBoundary,
} from "./wbd-promotion-boundary.mjs";

const SESSION_COOKIE = "wbd_owner_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PERSONAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 6;
const MAX_BODY_BYTES = 256 * 1024;
const STATE_SCHEMA_VERSION = 1;
const ORGANIZATION_ID = "we-build-and-design";

const iso = (date = new Date()) => date.toISOString();
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");

function error(message, statusCode, code) {
  return Object.assign(new Error(message), { statusCode, code });
}

function requiredString(value, label, maximum = 200) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maximum) throw error(`${label} is ongeldig.`, 400, "VALIDATION_ERROR");
  return normalized;
}

function publicOwner(owner) {
  return { id: owner.id, name: owner.name, email: owner.email, role: owner.role, status: owner.status };
}

function appendAudit(state, actorId, action, subject, now = new Date()) {
  state.audit.push({ id: randomBytes(12).toString("hex"), actorId, action, subject, occurredAt: iso(now) });
  if (state.audit.length > 1_000) state.audit.splice(0, state.audit.length - 1_000);
}

export function createInitialWbdOwnerState({ passwordRecord, now = new Date() }) {
  if (!isWorkspacePasswordRecord(passwordRecord)) throw new Error("WBD-owner password-record is ongeldig.");
  const state = {
    schemaVersion: STATE_SCHEMA_VERSION,
    organizationId: ORGANIZATION_ID,
    revision: 1,
    owner: {
      id: "wbd-owner-donovan",
      name: "Donovan van de Weide",
      email: "donovanweide@gmail.com",
      role: "OWNER",
      status: "ACTIVE",
      password: structuredClone(passwordRecord),
      createdAt: iso(now),
    },
    sessions: [],
    loginAttempts: {},
    capabilities: structuredClone(WBD_CAPABILITY_SEED),
    controlPlane: createInitialControlPlane({ ownerId: "wbd-owner-donovan", now }),
    promotionBoundary: createInitialPromotionBoundary(),
    audit: [],
    boundaries: {
      commercial: "FUTURE_SLICE",
      strategy: "FUTURE_SLICE",
      operations: "FUTURE_SLICE",
      atlasReadModel: "CAPABILITY_API_V1",
    },
  };
  appendAudit(state, state.owner.id, "Owner foundation geïnitialiseerd", ORGANIZATION_ID, now);
  return validateWbdOwnerState(state);
}

export function validateWbdOwnerState(input) {
  const state = structuredClone(input);
  if (state.schemaVersion !== STATE_SCHEMA_VERSION || state.organizationId !== ORGANIZATION_ID) throw new Error("WBD-owner state-identiteit is ongeldig.");
  if (!Number.isSafeInteger(state.revision) || state.revision < 1) throw new Error("WBD-owner revisie is ongeldig.");
  if (state.owner?.id !== "wbd-owner-donovan" || state.owner?.role !== "OWNER" || state.owner?.status !== "ACTIVE") throw new Error("WBD-owner identiteit is ongeldig.");
  state.owner.name = requiredString(state.owner.name, "Ownernaam", 120);
  state.owner.email = requiredString(state.owner.email, "Owner e-mail", 200).toLowerCase();
  if (!isWorkspacePasswordRecord(state.owner.password)) throw new Error("WBD-owner password-record is ongeldig.");
  state.sessions = Array.isArray(state.sessions) ? state.sessions.map((session) => ({
    idHash: requiredString(session.idHash, "Sessiehash", 64),
    userId: requiredString(session.userId, "Sessieowner", 80),
    csrfHash: requiredString(session.csrfHash, "CSRF-hash", 64),
    createdAt: requiredString(session.createdAt, "Sessiestart", 40),
    lastSeenAt: requiredString(session.lastSeenAt, "Laatste sessieactiviteit", 40),
    expiresAt: requiredString(session.expiresAt, "Sessieverval", 40),
    deviceMode: session.deviceMode === "PERSONAL" ? "PERSONAL" : "SHARED",
    authMethod: "PASSWORD",
  })) : [];
  state.loginAttempts = state.loginAttempts && typeof state.loginAttempts === "object" ? state.loginAttempts : {};
  state.capabilities = validateWbdCapabilityCatalog(state.capabilities);
  if (state.controlPlane !== undefined) state.controlPlane = validateControlPlane(state.controlPlane);
  state.promotionBoundary = validatePromotionBoundary(state.promotionBoundary);
  state.audit = Array.isArray(state.audit) ? state.audit.map((event) => ({
    id: requiredString(event.id, "Audit-ID", 80),
    actorId: requiredString(event.actorId, "Auditactor", 80),
    action: requiredString(event.action, "Auditactie", 160),
    subject: requiredString(event.subject, "Auditsubject", 200),
    occurredAt: requiredString(event.occurredAt, "Audittijd", 40),
  })) : [];
  state.boundaries = {
    commercial: "FUTURE_SLICE",
    strategy: "FUTURE_SLICE",
    operations: "FUTURE_SLICE",
    atlasReadModel: "CAPABILITY_API_V1",
  };
  return state;
}

export class WbdOwnerFileStore {
  constructor({ filePath, bootstrap }) {
    this.filePath = path.resolve(filePath);
    this.bootstrap = bootstrap;
    this.queue = Promise.resolve();
  }

  async initialize() {
    try {
      await this.read();
    } catch (cause) {
      if (cause?.code !== "ENOENT") throw cause;
      const state = validateWbdOwnerState(await this.bootstrap());
      await this.#write(state);
    }
  }

  async read() {
    return validateWbdOwnerState(JSON.parse(await readFile(this.filePath, "utf8")));
  }

  async mutate(mutator) {
    const operation = this.queue.then(async () => {
      const current = await this.read();
      const result = await mutator(structuredClone(current));
      const next = validateWbdOwnerState(result.state);
      next.revision = current.revision + 1;
      await this.#write(next);
      return { state: next, value: result.value };
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  async storageStatus() {
    return { engine: "file-development" };
  }

  async close() {}

  async #write(state) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, this.filePath);
  }
}

export class WbdOwnerService {
  constructor({ store, releaseId, allowedOrigin, secureCookies = false, sessionTtlMs = SESSION_TTL_MS }) {
    this.store = store;
    this.releaseId = releaseId;
    this.allowedOrigin = allowedOrigin;
    this.secureCookies = secureCookies;
    this.sessionTtlMs = sessionTtlMs;
  }

  async initialize() {
    await this.store.initialize();
    const current = await this.store.read();
    if (current.controlPlane === undefined) {
      await this.store.mutate(async (state) => {
        ensureControlPlane(state);
        appendAudit(state, state.owner.id, "Control Plane geinitialiseerd", state.organizationId);
        return { state, value: undefined };
      });
    }
  }

  async login({ email, password, deviceMode = "SHARED", remoteAddress = "unknown", now = new Date() }) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const attemptKey = sha256(`${remoteAddress}:${normalizedEmail}`);
    const state = await this.store.read();
    const recent = (state.loginAttempts[attemptKey] ?? []).filter((value) => now.getTime() - new Date(value).getTime() < LOGIN_WINDOW_MS);
    if (recent.length >= MAX_LOGIN_ATTEMPTS) throw error("Te veel aanmeldpogingen. Probeer later opnieuw.", 429, "RATE_LIMITED");
    const valid = normalizedEmail === state.owner.email
      && state.owner.status === "ACTIVE"
      && await verifyWorkspacePassword(password, state.owner.password);
    if (!valid) {
      await this.store.mutate(async (next) => {
        next.loginAttempts[attemptKey] = [...recent, iso(now)];
        appendAudit(next, normalizedEmail === next.owner.email ? next.owner.id : "unknown", "Ongeldige login", "WBD Workspace", now);
        return { state: next, value: undefined };
      });
      throw error("E-mailadres of wachtwoord is onjuist.", 401, "INVALID_LOGIN");
    }
    const normalizedDeviceMode = deviceMode === "PERSONAL" ? "PERSONAL" : "SHARED";
    const ttlMs = normalizedDeviceMode === "PERSONAL" ? PERSONAL_SESSION_TTL_MS : this.sessionTtlMs;
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    const session = {
      idHash: sha256(token),
      userId: state.owner.id,
      csrfHash: sha256(csrfToken),
      createdAt: iso(now),
      lastSeenAt: iso(now),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      deviceMode: normalizedDeviceMode,
      authMethod: "PASSWORD",
    };
    const result = await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(session);
      next.loginAttempts[attemptKey] = [];
      appendAudit(next, next.owner.id, "Ingelogd", `WBD Workspace · ${normalizedDeviceMode}`, now);
      return { state: next, value: undefined };
    });
    return { token, csrfToken, owner: publicOwner(result.state.owner), expiresAt: session.expiresAt, cookieMaxAgeSeconds: Math.floor(ttlMs / 1_000) };
  }

  async authenticate(token, now = new Date()) {
    if (!token) throw error("Aanmelding vereist.", 401, "UNAUTHENTICATED");
    const state = await this.store.read();
    const tokenHash = sha256(token);
    const session = state.sessions.find(({ idHash }) => safeEqualHex(idHash, tokenHash));
    if (!session || new Date(session.expiresAt).getTime() <= now.getTime()) throw error("Sessie is verlopen.", 401, "SESSION_EXPIRED");
    if (session.userId !== state.owner.id || state.owner.role !== "OWNER" || state.owner.status !== "ACTIVE") throw error("Aanmelding vereist.", 401, "UNAUTHENTICATED");
    return { state, session, owner: state.owner };
  }

  async issueSessionView(token, now = new Date()) {
    const { session } = await this.authenticate(token, now);
    const csrfToken = randomBytes(24).toString("base64url");
    const result = await this.store.mutate(async (state) => {
      const active = state.sessions.find(({ idHash }) => idHash === session.idHash);
      if (!active || new Date(active.expiresAt).getTime() <= now.getTime()) throw error("Sessie is verlopen.", 401, "SESSION_EXPIRED");
      active.csrfHash = sha256(csrfToken);
      active.lastSeenAt = iso(now);
      return { state, value: undefined };
    });
    return { owner: publicOwner(result.state.owner), csrfToken, expiresAt: session.expiresAt, releaseId: this.releaseId };
  }

  async logout(token, csrfToken, now = new Date()) {
    const { owner } = await this.authenticate(token, now);
    await this.#assertCsrf(token, csrfToken, now);
    await this.store.mutate(async (state) => {
      state.sessions = state.sessions.filter(({ idHash }) => idHash !== sha256(token));
      appendAudit(state, owner.id, "Uitgelogd", "WBD Workspace", now);
      return { state, value: undefined };
    });
  }

  async capabilityCatalog(token) {
    const { state, owner } = await this.authenticate(token);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    return {
      organization: { id: state.organizationId, name: "We Build And Design" },
      revision: state.revision,
      capabilities: state.capabilities,
      enums: WBD_CAPABILITY_ENUMS,
      source: "central-wbd-owner-state",
      releaseId: this.releaseId,
    };
  }

  async updateCapability(token, csrfToken, capabilityId, payload, now = new Date()) {
    const { owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    await this.#assertCsrf(token, csrfToken, now);
    if (!Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw error("Expected revision ontbreekt.", 400, "VALIDATION_ERROR");
    const allowed = new Set(["name", "category", "status", "evidence", "lastEvidenceDate", "provenAt", "reusability", "customerSpecificShare", "implementationClass", "sellNow", "demoReady", "customer2Reuse", "strategicJudgement", "guidance", "marketPricing", "commercialPriceLogic"]);
    const patch = Object.fromEntries(Object.entries(payload.patch ?? {}).filter(([key]) => allowed.has(key)));
    if (Object.keys(patch).length === 0) throw error("Geen geldige capabilitywijziging ontvangen.", 400, "VALIDATION_ERROR");
    const result = await this.store.mutate(async (state) => {
      if (state.revision !== payload.expectedRevision) throw error("De centrale catalogus is inmiddels gewijzigd.", 409, "REVISION_CONFLICT");
      const index = state.capabilities.findIndex(({ id }) => id === capabilityId);
      if (index < 0) throw error("Capability niet gevonden.", 404, "NOT_FOUND");
      state.capabilities[index] = validateWbdCapability({ ...state.capabilities[index], ...patch, id: capabilityId });
      appendAudit(state, owner.id, "Capability bijgewerkt", capabilityId, now);
      return { state, value: state.capabilities[index] };
    });
    return { revision: result.state.revision, capability: result.value };
  }

  async controlPlane(token, now = new Date()) {
    const { state, owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    if (!state.controlPlane) throw error("Control Plane ontbreekt.", 503, "CONTROL_PLANE_UNAVAILABLE");
    return publicControlPlane(state.controlPlane, { revision: state.revision, releaseId: this.releaseId, now });
  }

  async controlOverview(token, now = new Date()) {
    const { state, owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    if (!state.controlPlane) throw error("Control Plane ontbreekt.", 503, "CONTROL_PLANE_UNAVAILABLE");
    return projectControlOverview(state.controlPlane, { revision: state.revision, releaseId: this.releaseId, now });
  }

  async promotions(token, now = new Date()) {
    const { state, owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    return publicPromotionView(state, { releaseId: this.releaseId });
  }

  async reviewPromotion(token, csrfToken, proposalId, payload, now = new Date()) {
    const { owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    await this.#assertCsrf(token, csrfToken, now);
    if (!Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw error("Expected revision ontbreekt.", 400, "VALIDATION_ERROR");
    const result = await this.store.mutate(async (state) => {
      if (state.revision !== payload.expectedRevision) throw error("De centrale WBD-waarheid is inmiddels gewijzigd.", 409, "REVISION_CONFLICT");
      const reviewed = reviewPromotion(state, proposalId, payload, owner.id, now);
      appendAudit(reviewed.state, owner.id, `Promotion ${reviewed.value.review.decision.toLowerCase()}`, proposalId, now);
      return reviewed;
    });
    return { revision: result.state.revision, ...result.value };
  }

  async createControlRecord(token, csrfToken, recordType, payload, now = new Date()) {
    const { owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    await this.#assertCsrf(token, csrfToken, now);
    if (!Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw error("Expected revision ontbreekt.", 400, "VALIDATION_ERROR");
    const { expectedRevision, ...recordPayload } = payload;
    const result = await this.store.mutate(async (state) => {
      if (state.revision !== expectedRevision) throw error("De centrale WBD-waarheid is inmiddels gewijzigd.", 409, "REVISION_CONFLICT");
      const plane = ensureControlPlane(state, now);
      const created = createControlRecord(plane, recordType, recordPayload, owner.id, now);
      state.controlPlane = created.plane;
      appendControlAudit(state.controlPlane, {
        recordType,
        recordId: created.value.id,
        changedFields: created.changedFields,
        sourceRefs: controlRecordSourceRefs(created.value),
        actor: owner.id,
        lifecycleAction: created.lifecycleAction,
        now,
      });
      appendAudit(state, owner.id, `Control Plane ${created.lifecycleAction.toLowerCase()}`, `${recordType}:${created.value.id}`, now);
      return { state, value: created.value };
    });
    return { revision: result.state.revision, record: result.value };
  }

  async updateControlRecord(token, csrfToken, recordType, recordId, payload, now = new Date()) {
    const { owner } = await this.authenticate(token, now);
    if (owner.role !== "OWNER") throw error("Onvoldoende rechten.", 403, "FORBIDDEN");
    await this.#assertCsrf(token, csrfToken, now);
    if (!Number.isSafeInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw error("Expected revision ontbreekt.", 400, "VALIDATION_ERROR");
    const { expectedRevision, ...recordPayload } = payload;
    const result = await this.store.mutate(async (state) => {
      if (state.revision !== expectedRevision) throw error("De centrale WBD-waarheid is inmiddels gewijzigd.", 409, "REVISION_CONFLICT");
      const plane = ensureControlPlane(state, now);
      const updated = updateControlRecord(plane, recordType, recordId, recordPayload, owner.id, now);
      state.controlPlane = updated.plane;
      appendControlAudit(state.controlPlane, {
        recordType,
        recordId: updated.value.id,
        changedFields: updated.changedFields,
        sourceRefs: controlRecordSourceRefs(updated.value),
        actor: owner.id,
        lifecycleAction: updated.lifecycleAction,
        now,
      });
      appendAudit(state, owner.id, `Control Plane ${updated.lifecycleAction.toLowerCase()}`, `${recordType}:${updated.value.id}`, now);
      return { state, value: updated.value };
    });
    return { revision: result.state.revision, record: result.value };
  }

  async health() {
    const state = await this.store.read();
    if (!state.controlPlane) throw error("Control Plane ontbreekt.", 503, "CONTROL_PLANE_UNAVAILABLE");
    return { status: "ok", releaseId: this.releaseId, persistence: (await this.store.storageStatus()).engine, datastoreRevision: state.revision };
  }

  async ready() {
    const state = await this.store.read();
    if (!state.controlPlane) throw error("Control Plane ontbreekt.", 503, "CONTROL_PLANE_UNAVAILABLE");
    return { status: "ready", releaseId: this.releaseId };
  }

  async #assertCsrf(token, csrfToken, now) {
    const { session } = await this.authenticate(token, now);
    if (!csrfToken || !safeEqualHex(session.csrfHash, sha256(csrfToken))) throw error("Ongeldige requestbeveiliging.", 403, "CSRF_INVALID");
  }
}

function parseCookies(request) {
  const result = {};
  for (const part of String(request.headers.cookie ?? "").split(";").map((value) => value.trim()).filter(Boolean)) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    try { result[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(part.slice(index + 1)); } catch { /* malformed cookie is ignored */ }
  }
  return result;
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw error("Request is te groot.", 413, "PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  if (bytes === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw error("Ongeldige JSON.", 400, "INVALID_JSON"); }
}

function securityHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
}

function json(response, statusCode, payload) {
  const body = `${JSON.stringify(payload)}\n`;
  response.statusCode = statusCode;
  securityHeaders(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

function cookieHeader(token, secure, clear = false, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1_000)) {
  return `${SESSION_COOKIE}=${clear ? "" : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function createWbdOwnerRequestHandler(service, { onError } = {}) {
  return async function handle(request, response) {
    const route = new URL(request.url ?? "/", "http://wbd-owner.local").pathname;
    if (!route.startsWith("/api/wbd/v1/") && route !== "/health/wbd" && route !== "/ready/wbd") return false;
    try {
      if (request.headers.origin && request.headers.origin !== service.allowedOrigin) throw error("Origin niet toegestaan.", 403, "ORIGIN_FORBIDDEN");
      const method = request.method ?? "GET";
      const token = parseCookies(request)[SESSION_COOKIE];
      const csrfToken = request.headers["x-csrf-token"];
      if (route === "/health/wbd" && method === "GET") return json(response, 200, await service.health()) ?? true;
      if (route === "/ready/wbd" && method === "GET") return json(response, 200, await service.ready()) ?? true;
      if (route === "/api/wbd/v1/auth/login" && method === "POST") {
        const result = await service.login({ ...(await readJson(request)), remoteAddress: request.socket.remoteAddress });
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies, false, result.cookieMaxAgeSeconds));
        json(response, 200, { owner: result.owner, csrfToken: result.csrfToken, expiresAt: result.expiresAt, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/wbd/v1/auth/session" && method === "GET") return json(response, 200, await service.issueSessionView(token)) ?? true;
      if (route === "/api/wbd/v1/auth/logout" && method === "POST") {
        await service.logout(token, csrfToken);
        response.setHeader("Set-Cookie", cookieHeader("", service.secureCookies, true));
        json(response, 200, { ok: true });
        return true;
      }
      if (route === "/api/wbd/v1/capabilities" && method === "GET") return json(response, 200, await service.capabilityCatalog(token)) ?? true;
      const capabilityMatch = route.match(/^\/api\/wbd\/v1\/capabilities\/([^/]+)$/u);
      if (capabilityMatch && method === "PATCH") {
        json(response, 200, await service.updateCapability(token, csrfToken, decodeURIComponent(capabilityMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/wbd/v1/control" && method === "GET") return json(response, 200, await service.controlPlane(token)) ?? true;
      if (route === "/api/wbd/v1/control/overview" && method === "GET") return json(response, 200, await service.controlOverview(token)) ?? true;
      if (route === "/api/wbd/v1/promotions" && method === "GET") return json(response, 200, await service.promotions(token)) ?? true;
      const promotionMatch = route.match(/^\/api\/wbd\/v1\/promotions\/([^/]+)\/review$/u);
      if (promotionMatch && method === "POST") {
        json(response, 200, await service.reviewPromotion(token, csrfToken, decodeURIComponent(promotionMatch[1]), await readJson(request)));
        return true;
      }
      const controlMatch = route.match(/^\/api\/wbd\/v1\/control\/(organizations|opportunities|commitments|actions|effort-observations)(?:\/([^/]+))?$/u);
      if (controlMatch && method === "POST" && !controlMatch[2]) {
        json(response, 200, await service.createControlRecord(token, csrfToken, controlMatch[1], await readJson(request)));
        return true;
      }
      if (controlMatch && method === "PATCH" && controlMatch[2]) {
        json(response, 200, await service.updateControlRecord(token, csrfToken, controlMatch[1], decodeURIComponent(controlMatch[2]), await readJson(request)));
        return true;
      }
      throw error("Route niet gevonden.", 404, "NOT_FOUND");
    } catch (cause) {
      const statusCode = Number(cause?.statusCode) || 500;
      onError?.({ error: cause, method: request.method ?? "GET", route, statusCode });
      json(response, statusCode, { code: statusCode >= 500 ? "INTERNAL_ERROR" : String(cause?.code ?? "REQUEST_FAILED"), message: statusCode >= 500 ? "WBD Workspace is tijdelijk niet beschikbaar." : cause.message });
      return true;
    }
  };
}

export const wbdOwnerFoundationContract = Object.freeze({
  organizationId: ORGANIZATION_ID,
  schemaVersion: STATE_SCHEMA_VERSION,
  sessionCookie: SESSION_COOKIE,
});
