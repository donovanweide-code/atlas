import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { appendFile, link, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { canonicalJson, sanitizeDiagnostic, validateReleaseContract } from "./release-engine-core.mjs";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const commitPattern = /^[a-f0-9]{40}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;
const principalPattern = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const submissionKeys = Object.freeze(["artifactSha256", "candidateId", "commit", "contractHash"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function failure(code, message, statusCode = 409) {
  return Object.assign(new Error(message), { code, statusCode });
}

function required(value, name, pattern) {
  const result = String(value ?? "").trim();
  if (!result || (pattern && !pattern.test(result))) throw failure("MALFORMED_REQUEST", `${name} ontbreekt of is ongeldig.`, 400);
  return result;
}

function exactKeys(value, expected, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw failure("MALFORMED_REQUEST", `${name} moet een object zijn.`, 400);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join(",") !== wanted.join(",")) throw failure("MALFORMED_REQUEST", `${name} bevat ontbrekende of niet-toegestane velden.`, 400);
}

export function normalizeCandidateSubmission(value) {
  exactKeys(value, submissionKeys, "Submission");
  return Object.freeze({
    candidateId: required(value.candidateId, "candidateId", idPattern),
    commit: required(value.commit, "commit", commitPattern),
    artifactSha256: required(value.artifactSha256, "artifactSha256", hashPattern),
    contractHash: required(value.contractHash, "contractHash", hashPattern),
  });
}

function parseJsonBuffer(buffer, name) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw failure("CANDIDATE_SOURCE_MISSING", `${name} ontbreekt.`);
  try { return JSON.parse(buffer.toString("utf8")); }
  catch { throw failure("CANDIDATE_SOURCE_INVALID", `${name} is geen geldige JSON.`); }
}

function verifyManifest(manifest, { submission, contract, manifestBytes, artifactBytes, remoteTagCommit }) {
  if (manifest?.releaseId !== submission.candidateId || manifest?.releaseId !== contract.releaseId) throw failure("CANDIDATE_ID_MISMATCH", "Manifest, contract en submission gebruiken niet dezelfde candidate-ID.");
  if (manifest?.commit !== submission.commit || manifest?.commit !== contract.commit) throw failure("COMMIT_MISMATCH", "Manifest, contract en submission gebruiken niet dezelfde commit.");
  if (manifest?.tag !== submission.candidateId || contract.tag !== submission.candidateId) throw failure("TAG_MISMATCH", "Candidate-ID en immutable source-tag komen niet overeen.");
  if (remoteTagCommit !== submission.commit) throw failure("REMOTE_TAG_MISMATCH", "De centrale immutable source-tag wijst niet naar de opgegeven commit.");
  if (sha256(artifactBytes) !== submission.artifactSha256 || contract.artifact.sha256 !== submission.artifactSha256 || manifest?.artifactSha256 !== submission.artifactSha256) {
    throw failure("ARTIFACT_HASH_MISMATCH", "Artifacthash wijkt af van submission, contract of manifest.");
  }
  const manifestSha = sha256(manifestBytes);
  if (contract.artifact.manifestSha256 !== manifestSha) throw failure("MANIFEST_HASH_MISMATCH", "Manifesthash wijkt af van het immutable contract.");
  if (contract.artifact.path !== `${submission.candidateId}.tar.gz` || contract.artifact.manifestPath !== `${submission.candidateId}.manifest.json`) {
    throw failure("CANDIDATE_PATH_MISMATCH", "Contract gebruikt niet de canonical candidate-bestandsnamen.");
  }
  const provenance = manifest?.sourceProvenance;
  if (!provenance || provenance.commit !== submission.commit || provenance.tag !== submission.candidateId || provenance.verifiedAtBuild !== true) {
    throw failure("SOURCE_PROVENANCE_INVALID", "Centrale source-provenance ontbreekt of is inconsistent.");
  }
  return Object.freeze({ manifestSha256: manifestSha });
}

export function verifyCandidateEnvelope(submissionInput, envelope) {
  const submission = normalizeCandidateSubmission(submissionInput);
  const artifactBytes = envelope?.artifactBytes;
  const manifestBytes = envelope?.manifestBytes;
  const contractBytes = envelope?.contractBytes;
  if (!Buffer.isBuffer(artifactBytes) || artifactBytes.length === 0) throw failure("CANDIDATE_SOURCE_MISSING", "Immutable artifact ontbreekt.");
  const manifest = parseJsonBuffer(manifestBytes, "Manifest");
  const rawContract = parseJsonBuffer(contractBytes, "Releasecontract");
  let contract;
  try { contract = validateReleaseContract(rawContract); }
  catch (error) { throw failure("CONTRACT_INVALID", `Releasecontract is ongeldig: ${error.message}`); }
  if (contract.contractHash !== submission.contractHash) throw failure("CONTRACT_HASH_MISMATCH", "Contracthash wijkt af van de submission.");
  if (contract.releaseId !== submission.candidateId || contract.commit !== submission.commit) throw failure("CONTRACT_IDENTITY_MISMATCH", "Contractidentiteit wijkt af van de submission.");
  if (contract.changeScope.otherTenantImpact !== "NONE") throw failure("TENANT_IMPACT_NOT_ISOLATED", "Reviewsubmission mag geen impact op andere tenants verklaren.");
  if (contract.featureExposure.default !== "OFF") throw failure("PRODUCTION_PROMOTION_FORBIDDEN", "Submit-for-review accepteert uitsluitend default-OFF exposure.");
  if (!contract.featureExposure.killSwitch) throw failure("REVIEW_KILL_SWITCH_MISSING", "Reviewsubmission vereist een expliciete exposure-kill-switch.");
  const evidence = verifyManifest(manifest, {
    submission, contract, manifestBytes, artifactBytes,
    remoteTagCommit: required(envelope?.remoteTagCommit, "remoteTagCommit", commitPattern),
  });
  return Object.freeze({ submission, contract, manifest, artifactBytes, manifestBytes, contractBytes, ...evidence });
}

function fingerprint(submission) {
  return sha256(canonicalJson(submission));
}

export class StaticCandidateSubmissionAuthorizer {
  constructor({ bindings = [] } = {}) {
    this.bindings = bindings.map((binding) => Object.freeze({
      principalId: required(binding.principalId, "principalId", principalPattern),
      tokenSha256: required(binding.tokenSha256, "tokenSha256", hashPattern),
      tenants: new Set((binding.tenants ?? []).map((value) => required(value, "tenant", idPattern))),
      applications: new Set((binding.applications ?? []).map((value) => required(value, "application", idPattern))),
    }));
  }

  authenticate(authorizationHeader) {
    const match = /^Bearer ([A-Za-z0-9._~-]{32,512})$/u.exec(String(authorizationHeader ?? ""));
    if (!match) throw failure("UNAUTHORIZED", "Geldige brokerautorisatie ontbreekt.", 401);
    const presented = Buffer.from(sha256(match[1]), "hex");
    const binding = this.bindings.find((candidate) => timingSafeEqual(presented, Buffer.from(candidate.tokenSha256, "hex")));
    if (!binding) throw failure("UNAUTHORIZED", "Brokerautorisatie is ongeldig.", 401);
    return Object.freeze({ id: binding.principalId, binding });
  }

  authorize(principal, { tenant, application }) {
    if (!principal?.binding?.tenants.has(tenant) || !principal.binding.applications.has(application)) {
      throw failure("TENANT_MISMATCH", "Principal is niet geautoriseerd voor deze tenant/application.", 403);
    }
    return true;
  }
}

export class InMemoryCandidateSubmissionStore {
  #records = new Map();

  async claim({ candidateId, fingerprint: requestFingerprint, principalId, tenant, application, at }) {
    const current = this.#records.get(candidateId);
    if (current) {
      if (current.fingerprint !== requestFingerprint) throw failure("REPLAY_IDENTITY_MISMATCH", "Candidate-ID is al met een andere identiteit gebruikt.");
      return { duplicate: true, record: structuredClone(current) };
    }
    const record = { candidateId, fingerprint: requestFingerprint, principalId, tenant, application, status: "CLAIMED", claimedAt: at, result: null, error: null };
    this.#records.set(candidateId, record);
    return { duplicate: false, record: structuredClone(record) };
  }

  async complete(candidateId, result, at) {
    const record = this.#records.get(candidateId);
    Object.assign(record, { status: "AWAITING_HUMAN_GO", completedAt: at, result: structuredClone(result), error: null });
  }

  async fail(candidateId, error, at) {
    const record = this.#records.get(candidateId);
    if (record) Object.assign(record, { status: "BLOCKED", failedAt: at, error: structuredClone(error) });
  }

  async get(candidateId) { return structuredClone(this.#records.get(candidateId) ?? null); }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o750 });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o640);
  try { await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8"); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, file);
}

export class FileCandidateSubmissionStore {
  constructor({ root }) { this.root = path.resolve(root); }

  file(candidateId) { return path.join(this.root, `${required(candidateId, "candidateId", idPattern)}.json`); }

  async claim({ candidateId, fingerprint: requestFingerprint, principalId, tenant, application, at }) {
    const file = this.file(candidateId);
    await mkdir(this.root, { recursive: true, mode: 0o750 });
    const record = { candidateId, fingerprint: requestFingerprint, principalId, tenant, application, status: "CLAIMED", claimedAt: at, result: null, error: null };
    try {
      const handle = await open(file, "wx", 0o640);
      try { await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8"); await handle.sync(); }
      finally { await handle.close(); }
      return { duplicate: false, record: structuredClone(record) };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const current = JSON.parse(await readFile(file, "utf8"));
      if (current.fingerprint !== requestFingerprint) throw failure("REPLAY_IDENTITY_MISMATCH", "Candidate-ID is al met een andere identiteit gebruikt.");
      return { duplicate: true, record: current };
    }
  }

  async complete(candidateId, result, at) {
    const current = await this.get(candidateId);
    if (!current) throw failure("SUBMISSION_STATE_MISSING", "Candidate-submissionstate ontbreekt.");
    await writeJsonAtomic(this.file(candidateId), { ...current, status: "AWAITING_HUMAN_GO", completedAt: at, result, error: null });
  }

  async fail(candidateId, error, at) {
    const current = await this.get(candidateId);
    if (current) await writeJsonAtomic(this.file(candidateId), { ...current, status: "BLOCKED", failedAt: at, error });
  }

  async get(candidateId) {
    try { return JSON.parse(await readFile(this.file(candidateId), "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  }
}

export class InMemoryCandidateSubmissionAudit {
  #events = [];

  async append(input) {
    const previous = this.#events.at(-1) ?? null;
    const unsigned = { sequence: this.#events.length + 1, previousHash: previous?.eventHash ?? null, ...structuredClone(input) };
    const event = Object.freeze({ ...unsigned, eventHash: sha256(canonicalJson(unsigned)) });
    this.#events.push(event);
    return event;
  }

  async events() { return structuredClone(this.#events); }
}

export class FileCandidateSubmissionAudit {
  #tail = Promise.resolve();

  constructor({ file }) { this.file = path.resolve(file); }

  async events() {
    try {
      const lines = (await readFile(this.file, "utf8")).split(/\r?\n/u).filter(Boolean);
      const events = lines.map((line) => JSON.parse(line));
      let previousHash = null;
      for (const [index, event] of events.entries()) {
        const { eventHash, ...unsigned } = event;
        if (event.sequence !== index + 1 || event.previousHash !== previousHash || eventHash !== sha256(canonicalJson(unsigned))) throw failure("AUDIT_CHAIN_INVALID", "Candidate-submission audit chain is ongeldig.");
        previousHash = eventHash;
      }
      return events;
    } catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  }

  async append(input) {
    const operation = this.#tail.then(async () => {
      const events = await this.events();
      const previous = events.at(-1) ?? null;
      const unsigned = { sequence: events.length + 1, previousHash: previous?.eventHash ?? null, ...structuredClone(input) };
      const event = Object.freeze({ ...unsigned, eventHash: sha256(canonicalJson(unsigned)) });
      await appendAuditJsonl(this.file, event);
      return event;
    });
    this.#tail = operation.catch(() => undefined);
    return operation;
  }
}

async function writeCreateOnly(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o750 });
  try {
    const existing = await readFile(file);
    if (sha256(existing) !== sha256(bytes)) throw failure("INGRESS_COLLISION", `Bestaand ingressbestand ${path.basename(file)} wijkt af.`);
    return { path: file, duplicate: true };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o640);
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
  try { await link(temporary, file); }
  catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(file);
    if (sha256(existing) !== sha256(bytes)) throw failure("INGRESS_COLLISION", `Gelijktijdig ingressbestand ${path.basename(file)} wijkt af.`);
  } finally { await rm(temporary, { force: true }); }
  return { path: file, duplicate: false };
}

export class AtomicFilesystemCandidateIngress {
  constructor({ inboxRoot, contractRoot }) {
    this.inboxRoot = path.resolve(inboxRoot);
    this.contractRoot = path.resolve(contractRoot);
  }

  async submit(verified) {
    const id = verified.submission.candidateId;
    const artifact = await writeCreateOnly(path.join(this.inboxRoot, `${id}.tar.gz`), verified.artifactBytes);
    const manifest = await writeCreateOnly(path.join(this.inboxRoot, `${id}.manifest.json`), verified.manifestBytes);
    const contract = await writeCreateOnly(path.join(this.contractRoot, `${id}.release-contract.json`), verified.contractBytes);
    return Object.freeze({ artifact: artifact.path, manifest: manifest.path, contract: contract.path, duplicate: artifact.duplicate && manifest.duplicate && contract.duplicate });
  }
}

export class UnixSocketReleaseEngineClient {
  constructor({ socketPath = "/run/wbd-release-engine/engine.sock", timeoutMs = 120_000 } = {}) {
    this.socketPath = socketPath;
    this.timeoutMs = timeoutMs;
  }

  async prepare({ releaseId, contractHash }) {
    const body = JSON.stringify({ contractHash });
    return new Promise((resolve, reject) => {
      const request = http.request({ socketPath: this.socketPath, path: `/v1/releases/${encodeURIComponent(releaseId)}/prepare`, method: "POST", timeout: this.timeoutMs, headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          let value;
          try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
          catch { return reject(failure("CONTROL_PLANE_INVALID_RESPONSE", "Control Plane gaf geen geldige JSON-respons.")); }
          if (response.statusCode !== 200) return reject(failure(value?.diagnostic?.code ?? "CONTROL_PLANE_BLOCKED", value?.diagnostic?.message ?? "Control Plane prepare blokkeerde."));
          return resolve(value);
        });
      });
      request.once("timeout", () => request.destroy(failure("CONTROL_PLANE_UNAVAILABLE", "Control Plane prepare timed out.")));
      request.once("error", (error) => reject(failure("CONTROL_PLANE_UNAVAILABLE", `Control Plane is niet bereikbaar: ${error.message}`)));
      request.end(body);
    });
  }
}

export class CandidateSubmissionBroker {
  constructor({ authorizer, ingress, controlPlane, store = new InMemoryCandidateSubmissionStore(), audit = new InMemoryCandidateSubmissionAudit(), now = () => new Date().toISOString() }) {
    Object.assign(this, { authorizer, ingress, controlPlane, store, audit, now });
  }

  async submitCandidateForReview(submissionInput, envelope, principal) {
    let verified;
    let claimed = false;
    try {
      verified = verifyCandidateEnvelope(submissionInput, envelope);
      this.authorizer.authorize(principal, { tenant: verified.contract.tenant, application: verified.contract.application });
      const requestFingerprint = fingerprint(verified.submission);
      const claim = await this.store.claim({ ...verified.submission, fingerprint: requestFingerprint, principalId: principal.id, tenant: verified.contract.tenant, application: verified.contract.application, at: this.now() });
      if (claim.duplicate) {
        if (claim.record.status === "AWAITING_HUMAN_GO") return claim.record.result;
        throw failure("DUPLICATE_SUBMISSION", `Candidate is al verwerkt met status ${claim.record.status}.`);
      }
      claimed = true;
      await this.audit.append({ at: this.now(), type: "CANDIDATE_SUBMISSION_ACCEPTED", actorId: principal.id, candidateId: verified.submission.candidateId, tenant: verified.contract.tenant, application: verified.contract.application, fingerprint: requestFingerprint, artifactSha256: verified.submission.artifactSha256, contractHash: verified.submission.contractHash });
      const ingress = await this.ingress.submit(verified);
      await this.audit.append({ at: this.now(), type: "CANDIDATE_INGRESS_VERIFIED", actorId: principal.id, candidateId: verified.submission.candidateId, tenant: verified.contract.tenant, application: verified.contract.application, artifactSha256: verified.submission.artifactSha256, manifestSha256: verified.manifestSha256, contractHash: verified.submission.contractHash, ingressDuplicate: ingress.duplicate });
      const prepared = await this.controlPlane.prepare({ releaseId: verified.submission.candidateId, contractHash: verified.submission.contractHash });
      if (prepared?.state !== "AWAITING_HUMAN_GO" || !hashPattern.test(String(prepared?.summary?.planHash ?? ""))) {
        throw failure("CONTROL_PLANE_STATE_INVALID", "Control Plane stopte niet op een checksum-locked AWAITING_HUMAN_GO-plan.");
      }
      const result = Object.freeze({ candidateId: verified.submission.candidateId, state: prepared.state, planHash: prepared.summary.planHash, summary: prepared.summary });
      await this.store.complete(verified.submission.candidateId, result, this.now());
      await this.audit.append({ at: this.now(), type: "CONTROL_PLANE_PREPARED", actorId: principal.id, candidateId: verified.submission.candidateId, tenant: verified.contract.tenant, application: verified.contract.application, planHash: result.planHash, state: result.state });
      return result;
    } catch (error) {
      if (claimed && verified) {
        const diagnostic = sanitizeDiagnostic({ code: error?.code ?? "SUBMISSION_FAILED", message: error?.message ?? "Submission failed" });
        await this.store.fail(verified.submission.candidateId, diagnostic, this.now());
        await this.audit.append({ at: this.now(), type: "CANDIDATE_SUBMISSION_BLOCKED", actorId: principal?.id ?? "unknown", candidateId: verified.submission.candidateId, tenant: verified.contract.tenant, application: verified.contract.application, diagnostic });
      }
      throw error;
    }
  }
}

function decodeBase64(value, name) {
  const text = String(value ?? "");
  if (!text || text.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(text)) throw failure("MALFORMED_REQUEST", `${name} is geen geldige base64-inhoud.`, 400);
  return Buffer.from(text, "base64");
}

async function readJsonBody(request, maxBytes) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw failure("REQUEST_TOO_LARGE", "Candidate-submission is te groot.", 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw failure("MALFORMED_REQUEST", "Request bevat geen geldige JSON.", 400); }
}

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}

export function createCandidateSubmissionRequestHandler({ broker, authorizer, resolveRemoteTagCommit, maxBytes = 64 * 1024 * 1024 }) {
  return async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/healthz") return json(response, 200, { status: "ok", component: "wbd-candidate-submission-broker" });
      if (request.method !== "POST" || request.url !== "/v1/candidate-submissions/review") return json(response, 404, { code: "NOT_FOUND" });
      const principal = authorizer.authenticate(request.headers.authorization);
      const body = await readJsonBody(request, maxBytes);
      exactKeys(body, [...submissionKeys, "artifactBase64", "manifestBase64", "contractBase64"], "Request");
      const submission = normalizeCandidateSubmission({
        candidateId: body.candidateId,
        commit: body.commit,
        artifactSha256: body.artifactSha256,
        contractHash: body.contractHash,
      });
      const contractBytes = decodeBase64(body.contractBase64, "contractBase64");
      const rawContract = parseJsonBuffer(contractBytes, "Releasecontract");
      const remoteTagCommit = await resolveRemoteTagCommit({ tag: rawContract.tag, expectedCommit: submission.commit });
      const result = await broker.submitCandidateForReview(submission, {
        artifactBytes: decodeBase64(body.artifactBase64, "artifactBase64"),
        manifestBytes: decodeBase64(body.manifestBase64, "manifestBase64"),
        contractBytes,
        remoteTagCommit,
      }, principal);
      return json(response, 200, result);
    } catch (error) {
      const diagnostic = sanitizeDiagnostic({ code: error?.code ?? "SUBMISSION_FAILED", message: error?.message ?? "Submission failed" });
      return json(response, Number(error?.statusCode ?? 409), { state: "BLOCKED", diagnostic });
    }
  };
}

export async function appendAuditJsonl(file, event) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true, mode: 0o750 });
  await appendFile(file, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o640 });
  return stat(file);
}
