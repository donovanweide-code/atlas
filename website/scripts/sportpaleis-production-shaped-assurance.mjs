import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import mariadb from "mariadb";

import { SportpaleisMariaDbStore } from "./sportpaleis-mariadb-store.mjs";
import { createSportpaleisPilotRequestHandler, SportpaleisPilotService } from "./sportpaleis-pilot-foundation.mjs";

const database = process.env.CANARY_WORKSPACE_DB;
const artifactRoot = process.env.CANARY_ARTIFACT_ROOT;
const releaseId = process.env.CANARY_RELEASE_ID;
const activeCandidateIds = String(process.env.SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerIds = String(process.env.WBD_REVIEW_ACCESS_ISSUER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerSecret = String(process.env.WBD_REVIEW_ACCESS_ISSUER_SECRET ?? "");
assert.ok(database && artifactRoot && releaseId, "canaryconfiguratie ontbreekt");
assert.ok(activeCandidateIds.length && issuerIds.length && issuerSecret.length >= 43, "reviewconfiguratie ontbreekt");

const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
const hashJson = (value) => sha(JSON.stringify(value));
// LIVE has three customer seats. The temporary review principal is explicitly
// outside those seats, so four simultaneous full bootstraps are the hard
// production-shaped upper bound. Poll traffic remains concurrent around them.
const productionCustomerSeats = 3;
const concurrentReviewPrincipals = 1;
const concurrentFullBootstraps = productionCustomerSeats + concurrentReviewPrincipals;
const concurrentRevisionPolls = 20;
const rssRecoveryBudgetBytes = 512 * 1024 * 1024;
const businessHashes = (state) => ({
  orders: hashJson(state.orders),
  orderHistory: hashJson(state.orders.map(({ id, eventHistory }) => ({ id, eventHistory: eventHistory ?? [] }))),
  productionJobs: hashJson(state.productionJobs),
  proposals: hashJson(state.productionProposals),
  artifactReferences: hashJson(state.productionJobs.map(({ id, jobNumber, snapshot }) => ({ id, jobNumber, artifact: snapshot?.artifact ?? null }))),
});
const percentile = (values, fraction) => values.length ? values.slice().sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 0;
const rounded = (value) => Math.round(value * 100) / 100;

const pool = mariadb.createPool({ socketPath: "/run/mysqld/mysqld.sock", user: "root", database, connectionLimit: 8, acquireTimeout: 5_000, connectTimeout: 5_000, idleTimeout: 30, bigIntAsNumber: true, insertIdAsNumber: true, timezone: "Z", charset: "utf8mb4", multipleStatements: false });
const rssStartBytes = process.memoryUsage().rss;
let server;
let bootstrapRequestsReceived = 0;
const handlerErrors = [];
const timings = [];
let loadPhase = "warmup";
const statuses = [];
let activeHighWater = 0;
let idleLowWater = 8;
let queueHighWater = 0;
let rssHighWater = rssStartBytes;
const poolSampler = setInterval(() => {
  activeHighWater = Math.max(activeHighWater, Number(pool.activeConnections?.() ?? 0));
  idleLowWater = Math.min(idleLowWater, Number(pool.idleConnections?.() ?? 0));
  queueHighWater = Math.max(queueHighWater, Number(pool.taskQueueSize?.() ?? 0));
  rssHighWater = Math.max(rssHighWater, process.memoryUsage().rss);
}, 5);
poolSampler.unref();
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();
const cpuStart = process.cpuUsage();
const wallStart = performance.now();

try {
  await storeInitialize();
} finally {
  loop.disable();
  clearInterval(poolSampler);
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => undefined);
}

async function storeInitialize() {
  const store = new SportpaleisMariaDbStore({ pool });
  await store.initialize();
  const initial = await store.read();
  const issuer = initial.users.find(({ id, role, status }) => issuerIds.includes(id) && role === "admin" && status === "Actief");
  const customerUsers = initial.users.filter(({ seatType, status }) => seatType === "customer" && status === "Actief").slice(0, productionCustomerSeats);
  const normalUser = customerUsers.find(({ role }) => role === "operator");
  assert.ok(issuer && normalUser && customerUsers.length === productionCustomerSeats, "issuer, operator of drie customer seats ontbreken in restorefixture");

  const service = new SportpaleisPilotService({ store, releaseId, secureCookies: false, allowedOrigin: "http://127.0.0.1", uploadsEnabled: false, productionAssetUploadsEnabled: false, fontUploadsEnabled: false, mailMode: "capture", mailboxConfiguration: { configured: false }, creativeStudioEnabled: false, artifactRoot, runtimeArtifactRoot: artifactRoot, installedProductionAssetRoot: `${artifactRoot}/installed-assets`, activeReviewCandidateIds: activeCandidateIds, reviewAccessEnabled: true, reviewAccessIsolatedState: true, reviewAccessIssuerPrincipalIds: issuerIds, reviewAccessIssuerSecret: issuerSecret });
  const customerSessions = customerUsers.map((user) => ({ user, token: randomBytes(32).toString("base64url"), csrf: randomBytes(24).toString("base64url") }));
  const normalSession = customerSessions.find(({ user }) => user.id === normalUser.id);
  const normalToken = normalSession.token;
  await store.mutate(async (state) => {
    for (const { user, token, csrf } of customerSessions) state.sessions.push({ idHash: sha(token), userId: user.id, csrfHash: sha(csrf), createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), deviceMode: "SHARED", authMethod: "CANARY_FIXTURE" });
    return { state, value: null };
  });
  const issued = await service.issueAutomatedReviewGrant({ candidateId: activeCandidateIds[0], scopes: ["candidate.review.read", "candidate.ui.safe-interact", "candidate.debug.read"], humanGoReference: "GO-SPORTPALEIS-P1-RECOVERY-20260905", ttlMs: 30 * 60_000, runId: `r22643-canary-${randomBytes(6).toString("hex")}`, role: "operator" }, issuerSecret, "127.0.0.1");
  const activationUrl = new URL(issued.activationPath, "http://127.0.0.1");
  const activation = new URLSearchParams(activationUrl.hash.slice(1));
  const review = await service.activateReviewDeveloperGrant({ activationToken: activation.get("token"), candidateId: activation.get("candidate") });
  const before = await store.read();
  const beforeRow = (await pool.query("SELECT revision, updated_at, OCTET_LENGTH(state_json) AS bytes FROM sp_runtime_state WHERE organization_id = ?", [before.organizationId]))[0];
  const beforeBusiness = businessHashes(before);
  const beforeRevision = before.revision;
  const beforeAudit = before.audit.length;

  const handler = createSportpaleisPilotRequestHandler(service, { onError: (entry) => handlerErrors.push(entry) });
  server = createServer(async (request, response) => {
    if (request.url === "/api/sportpaleis/v1/bootstrap") bootstrapRequestsReceived += 1;
    if (!(await handler(request, response))) { response.statusCode = 404; response.end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const customerCookies = customerSessions.map(({ token }) => `sportpaleis_session=${token}`);
  const reviewCookie = `sportpaleis_session=${review.sessionToken}`;
  const allCookies = [...customerCookies, reviewCookie];
  const request = async (route, cookie = reviewCookie, options = {}) => {
    const started = performance.now();
    const response = await fetch(`${origin}${route}`, { ...options, headers: { ...(options.headers ?? {}), cookie } });
    statuses.push(response.status);
    const body = Buffer.from(await response.arrayBuffer());
    if (route === "/api/sportpaleis/v1/bootstrap" && response.status === 200) JSON.parse(body.toString("utf8"));
    timings.push({ route, phase: loadPhase, ms: performance.now() - started, bytes: body.length });
    return response.status;
  };
  const coreRoutes = ["/api/sportpaleis/v1/auth/session", "/api/sportpaleis/v1/state-revision", "/api/sportpaleis/v1/bootstrap"];
  for (const cookie of allCookies) for (const route of coreRoutes) assert.equal(await request(route, cookie), 200, `${route} moet bereikbaar zijn`);
  const previewRoutes = [
    ...before.productionAssetSources.flatMap((source) => (source.candidates ?? []).map((candidate) => `/api/sportpaleis/v1/production-asset-sources/${encodeURIComponent(source.id)}/candidates/${encodeURIComponent(candidate.id)}/preview.svg`)),
    ...before.productionAssetSources.filter(({ documentPreviewSvg }) => Boolean(documentPreviewSvg)).map((source) => `/api/sportpaleis/v1/production-asset-sources/${encodeURIComponent(source.id)}/preview.svg`),
    ...before.productionElements.map((asset) => `/api/sportpaleis/v1/production-assets/${encodeURIComponent(asset.id)}/preview.svg`),
  ];
  assert.ok(previewRoutes.length > 0, "restorefixture bevat geen previewroutes");
  loadPhase = "polls";
  for (let offset = 0; offset < 100; offset += 20) {
    const batch = await Promise.all(Array.from({ length: 20 }, (_, index) => request("/api/sportpaleis/v1/state-revision", allCookies[(offset + index) % allCookies.length])));
    assert.ok(batch.every((status) => status === 200));
  }
  loadPhase = "previews";
  for (let offset = 0; offset < 300; offset += 12) {
    const batch = await Promise.all(Array.from({ length: 12 }, (_, index) => request(previewRoutes[(offset + index) % previewRoutes.length], allCookies[(offset + index) % allCookies.length])));
    assert.ok(batch.every((status) => status === 200));
    if (offset % 48 === 0) assert.ok((await Promise.all(coreRoutes.map((route, index) => request(route, allCookies[index % allCookies.length])))).every((status) => status === 200));
  }
  loadPhase = "pool-pressure";
  const blockers = await Promise.all(Array.from({ length: 6 }, () => pool.getConnection()));
  const sleeps = blockers.map((connection) => connection.query("SELECT SLEEP(0.75)").finally(() => connection.release()));
  const underPressureRoutes = [
    ...Array.from({ length: concurrentFullBootstraps }, () => "/api/sportpaleis/v1/bootstrap"),
    ...Array.from({ length: concurrentRevisionPolls }, () => "/api/sportpaleis/v1/state-revision"),
  ];
  const underPressure = await Promise.all(underPressureRoutes.map((route, index) => request(route, allCookies[index % allCookies.length])));
  await Promise.all(sleeps);
  assert.ok(underPressure.every((status) => status === 200), "pooldruk mag geen route laten uitvallen");
  loadPhase = "recovery";
  service.bootstrapResponseCache.clear();
  service.bootstrapResponseCacheBytes = 0;
  const receivedBeforeInterrupt = bootstrapRequestsReceived;
  const aborted = new AbortController();
  const interrupted = fetch(`${origin}/api/sportpaleis/v1/bootstrap`, { headers: { cookie: reviewCookie }, signal: aborted.signal });
  setTimeout(() => aborted.abort(), 5);
  await assert.rejects(interrupted, (error) => error.name === "AbortError");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(bootstrapRequestsReceived > receivedBeforeInterrupt, "interrupted request bereikte de server");
  assert.equal(service.bootstrapResponsePromises.size, 0, "interrupted bootstrap laat geen single-flight achter");
  assert.equal(await request("/api/sportpaleis/v1/bootstrap", reviewCookie), 200, "retry na gestart maar interrupted request");

  const afterReads = await store.read();
  const afterReadRow = (await pool.query("SELECT revision, updated_at, OCTET_LENGTH(state_json) AS bytes FROM sp_runtime_state WHERE organization_id = ?", [afterReads.organizationId]))[0];
  assert.equal(afterReads.revision, beforeRevision, "read-only routes wijzigden revision");
  assert.equal(afterReads.audit.length, beforeAudit, "read-only routes wijzigden audit");
  assert.deepEqual(businessHashes(afterReads), beforeBusiness, "read-only routes wijzigden businessdata");
  assert.equal(new Date(afterReadRow.updated_at).getTime(), new Date(beforeRow.updated_at).getTime(), "read-only routes schreven volledige state");
  const sessionView = await service.issueSessionView(normalToken);
  const existingPreference = before.preferences[normalUser.id] ?? {};
  const nextDensity = existingPreference.density === "compact" ? "comfortable" : "compact";
  await service.savePreferences(normalToken, sessionView.csrfToken, { ...existingPreference, density: nextDensity });
  const afterMutation = await store.readSnapshot();
  assert.equal(afterMutation.revision, beforeRevision + 1, "fixturemutatie invalideerde cache niet exact eenmaal");
  assert.equal(afterMutation.preferences[normalUser.id].density, nextDensity, "fixturemutatie werd niet zichtbaar");
  assert.deepEqual(businessHashes(await store.read()), beforeBusiness, "fixturemutatie raakte businessproductiedata");

  loadPhase = "bounded-cache-reuse";
  const memoryCycles = [];
  let cacheReuse = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    cacheReuse = await Promise.all(allCookies.map((cookie) => request("/api/sportpaleis/v1/bootstrap", cookie)));
    global.gc?.();
    memoryCycles.push(process.memoryUsage().rss);
  }
  assert.ok(cacheReuse.every((status) => status === 200), "hergebruik van gecachte bootstrap mag niet uitvallen");
  await new Promise((resolve) => setTimeout(resolve, 100));
  global.gc?.();
  global.gc?.();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const rssEndBytes = process.memoryUsage().rss;

  const cpu = process.cpuUsage(cpuStart);
  const elapsedMs = performance.now() - wallStart;
  loop.disable(); clearInterval(poolSampler);
  assert.ok(statuses.every((status) => status === 200), "minstens één canaryroute faalde");
  const allMs = timings.map(({ ms }) => ms);
  const metricsFor = (entries) => ({ count: entries.length, p50Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.5)), p95Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.95)), maxMs: rounded(Math.max(0, ...entries.map(({ ms }) => ms))) });
  const metrics = { ...metricsFor(timings), eventLoopP95Ms: rounded(loop.percentile(95) / 1e6), eventLoopMaxMs: rounded(loop.max / 1e6) };
  const bootstrapMetrics = metricsFor(timings.filter(({ route }) => route === "/api/sportpaleis/v1/bootstrap"));
  const steadyStateMemoryStable = memoryCycles.length === 3 && memoryCycles.at(-1) - memoryCycles[0] <= 64 * 1024 * 1024;
  const rssRecoveredWithinBudget = rssEndBytes - rssStartBytes <= rssRecoveryBudgetBytes && steadyStateMemoryStable;
  const thresholdsPassed = metrics.p95Ms <= 1_000 && metrics.maxMs <= 5_000 && bootstrapMetrics.p95Ms <= 2_000 && bootstrapMetrics.maxMs <= 3_000 && metrics.eventLoopMaxMs <= 1_000 && rssHighWater <= 1_073_741_824 && rssRecoveredWithinBudget;
  const result = {
    status: thresholdsPassed ? "PASS" : "FAIL", releaseId,
    restoredState: { revisionBeforeReads: beforeRevision, revisionAfterReads: afterReads.revision, stateBytes: Number(beforeRow.bytes), auditBefore: beforeAudit, auditAfterReads: afterReads.audit.length },
    load: { requests: statuses.length, httpErrors: statuses.filter((status) => status >= 400).length, serverErrors: statuses.filter((status) => status >= 500).length, concurrencyModel: { productionCustomerSeats, concurrentReviewPrincipals, concurrentFullBootstraps, concurrentRevisionPolls, heldPoolConnections: blockers.length }, p50Ms: metrics.p50Ms, p95Ms: metrics.p95Ms, maxMs: metrics.maxMs, byPhase: Object.fromEntries([...new Set(timings.map(({ phase }) => phase))].map((phase) => [phase, metricsFor(timings.filter((entry) => entry.phase === phase))])), byRoute: Object.fromEntries([...new Set(timings.map(({ route }) => route))].map((route) => [route, metricsFor(timings.filter((entry) => entry.route === route))])) },
    pool: { connectionLimit: 8, activeHighWater, idleLowWater, queueHighWater, acquireTimeouts: handlerErrors.filter(({ error }) => error?.code === "DATABASE_CONNECTION_FAILED" && error?.cause?.code === "ER_GET_CONNECTION_TIMEOUT").length },
    runtime: { elapsedMs: rounded(elapsedMs), eventLoopP95Ms: metrics.eventLoopP95Ms, eventLoopMaxMs: metrics.eventLoopMaxMs, rssStartBytes, rssHighWaterBytes: rssHighWater, rssEndBytes, rssRecoveryBudgetBytes, rssRecoveredWithinBudget, steadyStateMemoryStable, memoryCycles, cpuUserMs: rounded(cpu.user / 1000), cpuSystemMs: rounded(cpu.system / 1000) },
    invariants: { readRevisionStable: true, readAuditStable: true, readStateUpdatedAtStable: true, businessHashesStable: true, cacheInvalidationExact: true, interruptedRetryRecovered: true, normalAndReviewAuth: true, previewFanoutBounded: true, bootstrapCacheBounded: rssRecoveredWithinBudget },
    businessHashes: beforeBusiness,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
