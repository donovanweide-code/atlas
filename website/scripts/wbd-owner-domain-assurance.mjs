import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import mariadb from "mariadb";

import { createWbdOwnerRequestHandler, WbdOwnerService } from "./wbd-owner-foundation.mjs";
import { WbdOwnerDomainMariaDbStore } from "./wbd-owner-domain-mariadb-store.mjs";
import { sha256WbdOwnerCanonicalJson, validateWbdOwnerStateKey } from "./wbd-owner-domain-state.mjs";

const assuranceBytes = await readFile(new URL("./wbd-owner-domain-assurance.mjs", import.meta.url));
const contractBytes = await readFile(new URL("../config/wbd-owner-domain-assurance-v1.json", import.meta.url));
const contract = JSON.parse(contractBytes.toString("utf8"));
const databaseName = String(process.env.CANARY_WORKSPACE_DB ?? "").trim();
if (!databaseName) throw new Error("CANARY_WORKSPACE_DB is verplicht.");
const candidateCommit = String(process.env.CANARY_CANDIDATE_COMMIT ?? "").trim();
const candidateArtifactSha256 = String(process.env.CANARY_CANDIDATE_ARTIFACT_SHA256 ?? "").trim().toLowerCase();
const restoreBackupSha256 = String(process.env.CANARY_RESTORE_BACKUP_SHA256 ?? "").trim().toLowerCase();
if (!/^[a-f0-9]{40}$/u.test(candidateCommit) || !/^[a-f0-9]{64}$/u.test(candidateArtifactSha256) || !/^[a-f0-9]{64}$/u.test(restoreBackupSha256)) throw new Error("Owner assurance mist immutable candidate- of restorebinding.");

const pool = mariadb.createPool({ socketPath: "/run/mysqld/mysqld.sock", user: "root", database: databaseName, connectionLimit: 8, acquireTimeout: 5_000, connectTimeout: 5_000, timezone: "Z", charset: "utf8mb4", multipleStatements: false });
const store = new WbdOwnerDomainMariaDbStore({ pool });
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;
const round = (value) => Math.round(value * 100) / 100;
const delays = monitorEventLoopDelay({ resolution: 10 });
const latencies = [];
let httpErrors = 0;
let serverErrors = 0;
let server;
const rssStartBytes = process.memoryUsage().rss;
let rssHighWaterBytes = rssStartBytes;

try {
  await store.initialize();
  const before = await store.read();
  const legacyBefore = await pool.query("SELECT revision, SHA2(CAST(state_json AS CHAR), 256) AS sha256 FROM wbd_owner_state WHERE organization_id = 'we-build-and-design'");
  const token = randomBytes(32).toString("base64url");
  const csrfToken = sha256(`wbd-owner-csrf-v1:${token}`);
  await store.mutate(async (state) => {
    state.sessions.push({ idHash: sha256(token), userId: state.owner.id, csrfHash: sha256(csrfToken), createdAt: "2026-09-05T16:00:00.000Z", lastSeenAt: "2026-09-05T16:00:00.000Z", expiresAt: "2099-09-05T18:00:00.000Z", deviceMode: "SHARED", authMethod: "PASSWORD" });
    state.audit.push({ id: `owner-assurance-session-${sha256(token).slice(0, 16)}`, actorId: "owner-assurance", action: "Geïsoleerde canarysessie uitgegeven", subject: "WBD Owner candidate", occurredAt: "2026-09-05T16:00:00.000Z" });
    return { state, value: undefined };
  });
  const service = new WbdOwnerService({ store, releaseId: String(process.env.CANARY_RELEASE_ID ?? "WBD-OWNER-DOMAIN-CANDIDATE"), allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const handler = createWbdOwnerRequestHandler(service, { onError: ({ statusCode }) => { if (statusCode >= 500) serverErrors += 1; } });
  server = createServer(async (request, response) => { if (!await handler(request, response)) { response.statusCode = 404; response.end(); } });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Owner assurance HTTP-runtime ontbreekt.");
  const origin = `http://127.0.0.1:${address.port}`;
  service.allowedOrigin = origin;
  const headers = { Cookie: `wbd_owner_session=${encodeURIComponent(token)}`, Origin: origin };
  const request = async (route, options = {}) => {
    const started = performance.now();
    const response = await fetch(`${origin}${route}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
    const bytes = Buffer.from(await response.arrayBuffer());
    latencies.push(performance.now() - started);
    if (!response.ok) httpErrors += 1;
    if (response.status >= 500) serverErrors += 1;
    rssHighWaterBytes = Math.max(rssHighWaterBytes, process.memoryUsage().rss);
    return { status: response.status, bytes, value: bytes.length ? JSON.parse(bytes.toString("utf8")) : null };
  };

  delays.enable();
  const readBaseline = await store.read();
  for (let index = 0; index < contract.minimumLoad.sessionPolls; index += 1) {
    const response = await request("/api/wbd/v1/auth/session");
    if (response.status !== 200 || response.value.csrfToken !== csrfToken) throw new Error("Owner sessiepoll faalde.");
  }
  const routes = ["/api/wbd/v1/capabilities", "/api/wbd/v1/product-truth", "/api/wbd/v1/atlas", "/api/wbd/v1/atlas/search?q=Sportpaleis", "/api/wbd/v1/control", "/api/wbd/v1/control/overview", "/api/wbd/v1/promotions"];
  let lastAtlas;
  for (let roundIndex = 0; roundIndex < contract.minimumLoad.concurrentReadRounds; roundIndex += 1) {
    const responses = await Promise.all(routes.map((route) => request(route)));
    if (responses.some(({ status }) => status !== 200)) throw new Error("Owner concurrent read-route faalde.");
    lastAtlas = responses[2].value;
  }
  const afterReads = await store.read();
  const sessionPollsReadOnly = afterReads.revision === readBaseline.revision && afterReads.audit.length === readBaseline.audit.length;
  const legacyAfterReads = await pool.query("SELECT revision, SHA2(CAST(state_json AS CHAR), 256) AS sha256 FROM wbd_owner_state WHERE organization_id = 'we-build-and-design'");

  const capability = afterReads.capabilities[0];
  const mutation = await request(`/api/wbd/v1/capabilities/${encodeURIComponent(capability.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ expectedRevision: afterReads.revision, patch: { guidance: "Gecontroleerde Owner-domain canarymutatie." } }) });
  if (mutation.status !== 200) throw new Error("Owner fixturemutatie faalde.");
  const afterMutation = await store.read();
  const cacheInvalidationExact = afterMutation.revision === afterReads.revision + 1 && afterMutation.capabilities[0].guidance === "Gecontroleerde Owner-domain canarymutatie.";
  const beforeInterrupted = sha256WbdOwnerCanonicalJson(afterMutation);
  await store.mutate(async (state) => { state.boundaries.interruptedFixture = true; throw new Error("OWNER_ASSURANCE_INTERRUPTED"); }).then(() => { throw new Error("Onderbroken mutatie werd niet geweigerd."); }, (error) => { if (!String(error.message).includes("OWNER_ASSURANCE_INTERRUPTED")) throw error; });
  const interruptedMutationAtomic = sha256WbdOwnerCanonicalJson(await store.read()) === beforeInterrupted;
  let tenantIsolation = false;
  try { validateWbdOwnerStateKey("organizationId", "foreign-tenant"); } catch { tenantIsolation = true; }
  delays.disable();
  if (global.gc) { global.gc(); await new Promise((resolve) => setTimeout(resolve, 100)); global.gc(); }
  const storage = await store.storageStatus();
  const legacyAfter = await pool.query("SELECT revision, SHA2(CAST(state_json AS CHAR), 256) AS sha256 FROM wbd_owner_state WHERE organization_id = 'we-build-and-design'");
  const invariants = {
    hashEqualBackfill: Boolean(process.env.CANARY_BACKFILL_MATCH === "true"),
    runtimeInitializationReadOnly: storage.metrics.fullLegacyLoads === 0,
    authenticatedRoutes: httpErrors === 0 && serverErrors === 0,
    sessionPollsReadOnly,
    legacyStateWriteStable: legacyBefore[0].revision === legacyAfter[0].revision && legacyBefore[0].sha256 === legacyAfter[0].sha256 && legacyAfterReads[0].sha256 === legacyBefore[0].sha256,
    domainWritesIncremental: storage.metrics.domainWrites > 0 && storage.metrics.clonedKeys < storage.metrics.domainWrites * Object.keys(afterMutation).length,
    cacheInvalidationExact,
    interruptedMutationAtomic,
    tenantIsolation,
    auditAppendOnly: afterMutation.audit.length === afterReads.audit.length + 1,
    ownerSurfacesPresent: Array.isArray(lastAtlas?.importantNow) && Array.isArray(lastAtlas?.decisionsNeeded) && Array.isArray(lastAtlas?.preparedActions) && Array.isArray(lastAtlas?.sinceLastVisit) && Array.isArray(lastAtlas?.evidence) && Array.isArray(lastAtlas?.organizations) && Array.isArray(lastAtlas?.capabilityRegistry),
  };
  const rssEndBytes = process.memoryUsage().rss;
  const metrics = {
    requests: latencies.length, p50Ms: round(percentile(latencies, 0.5)), p95Ms: round(percentile(latencies, 0.95)), maxMs: round(Math.max(...latencies)),
    eventLoopP95Ms: round(delays.percentile(95) / 1e6), eventLoopMaxMs: round(delays.max / 1e6),
    rssStartBytes, rssHighWaterBytes, rssEndBytes, rssGrowthBytes: Math.max(0, rssEndBytes - rssStartBytes),
    transactionHoldMaxMs: round(storage.metrics.transactionHoldMsMax), cacheHits: storage.metrics.cacheHits, cacheMisses: storage.metrics.cacheMisses,
    domainWrites: storage.metrics.domainWrites, auditAppends: storage.metrics.auditAppends, clonedKeys: storage.metrics.clonedKeys, httpErrors, serverErrors,
  };
  const limits = contract.limits;
  const withinLimits = metrics.p95Ms <= limits.allRoutesP95Ms && metrics.maxMs <= limits.allRoutesMaxMs && metrics.eventLoopP95Ms <= limits.eventLoopP95Ms && metrics.eventLoopMaxMs <= limits.eventLoopMaxMs && metrics.rssGrowthBytes <= limits.rssGrowthBytes && metrics.transactionHoldMaxMs <= limits.databaseTransactionHoldMaxMs && httpErrors === limits.httpErrors && serverErrors === limits.serverErrors;
  const status = withinLimits && contract.requiredInvariants.every((key) => invariants[key] === true) ? "PASS" : "FAIL";
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 1,
    status,
    contractId: contract.contractId,
    releaseId: process.env.CANARY_RELEASE_ID ?? null,
    identity: {
      candidateCommit,
      candidateArtifactSha256,
      restoreBackupSha256,
      assuranceEntrypointSha256: sha256(assuranceBytes),
      assuranceContractSha256: sha256(contractBytes),
      tenant: "we-build-and-design",
      accessScope: "owner",
    },
    metrics,
    invariants,
    before: { revision: before.revision, canonicalSha256: sha256WbdOwnerCanonicalJson(before) },
    after: { revision: afterMutation.revision, canonicalSha256: sha256WbdOwnerCanonicalJson(afterMutation) },
  })}\n`);
  if (status !== "PASS") process.exitCode = 1;
} finally {
  delays.disable();
  if (server) await new Promise((resolve) => server.close(resolve));
  await store.close().catch(() => undefined);
  await pool.end().catch(() => undefined);
}
