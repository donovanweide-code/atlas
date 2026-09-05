import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
import { materializeLegacyRollbackState } from "./sportpaleis-domain-rollback-bridge.mjs";
import { sha256CanonicalJson } from "./workspace-domain-state.mjs";
import { createSportpaleisPilotRequestHandler, SportpaleisPilotService } from "./sportpaleis-pilot-foundation.mjs";
import { productionJobBuildLoad } from "../src/sportpaleis/production-job-build.mjs";

const database = process.env.CANARY_WORKSPACE_DB;
const artifactRoot = process.env.CANARY_ARTIFACT_ROOT;
const releaseId = process.env.CANARY_RELEASE_ID;
const candidateCommit = process.env.CANARY_CANDIDATE_COMMIT;
const candidateArtifactSha256 = process.env.CANARY_CANDIDATE_ARTIFACT_SHA256;
const restoreBackupSha256 = process.env.CANARY_RESTORE_BACKUP_SHA256;
const activeCandidateIds = String(process.env.SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerIds = String(process.env.WBD_REVIEW_ACCESS_ISSUER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerSecret = String(process.env.WBD_REVIEW_ACCESS_ISSUER_SECRET ?? "");
const assuranceContractBytes = await readFile(new URL("../config/sportpaleis-production-shaped-assurance-v3.json", import.meta.url));
const assuranceContract = JSON.parse(assuranceContractBytes);
const assuranceContractSha256 = createHash("sha256").update(assuranceContractBytes).digest("hex");
assert.equal(assuranceContract.schemaVersion, 3, "onbekende assurancecontractversie");
assert.ok(database && artifactRoot && releaseId, "canaryconfiguratie ontbreekt");
assert.match(candidateCommit ?? "", /^[a-f0-9]{40}$/u, "candidatecommit ontbreekt");
assert.match(candidateArtifactSha256 ?? "", /^[a-f0-9]{64}$/u, "candidate-artifacthash ontbreekt");
assert.match(restoreBackupSha256 ?? "", /^[a-f0-9]{64}$/u, "restore-backuphash ontbreekt");
assert.ok(activeCandidateIds.length && issuerIds.length && issuerSecret.length >= 43, "reviewconfiguratie ontbreekt");

const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
const assuranceEntrypointSha256 = sha(await readFile(fileURLToPath(import.meta.url)));
const hashJson = (value) => sha(JSON.stringify(value));
// LIVE has three customer seats. The temporary review principal is explicitly
// outside those seats, so four simultaneous full bootstraps are the hard
// production-shaped upper bound. Poll traffic remains concurrent around them.
const productionCustomerSeats = 3;
const concurrentReviewPrincipals = 1;
const concurrentFullBootstraps = assuranceContract.minimumLoad.concurrentFullBootstraps;
const concurrentRevisionPolls = assuranceContract.minimumLoad.concurrentRevisionPolls;
const rssRecoveryBudgetBytes = assuranceContract.limits.rssRecoveryBudgetBytes;
const businessHashes = (state) => ({
  orders: hashJson(state.orders),
  orderHistory: hashJson(state.orders.map(({ id, eventHistory }) => ({ id, eventHistory: eventHistory ?? [] }))),
  productionJobs: hashJson(state.productionJobs),
  proposals: hashJson(state.productionProposals),
  artifactReferences: hashJson(state.productionJobs.map(({ id, jobNumber, snapshot }) => ({ id, jobNumber, artifact: snapshot?.artifact ?? null }))),
});
const percentile = (values, fraction) => values.length ? values.slice().sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] : 0;
const rounded = (value) => Math.round(value * 100) / 100;
const emptyPersonalization = Object.freeze({ initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" });

function largeFreeLines(fontId, heightMm) {
  return assuranceContract.minimumLoad.largeFreeProductionValues.map((content) => ({
    id: `assurance-free-${heightMm}-${content}`, type: "NUMBER", content, previewLabel: content,
    widthMm: 180, heightMm, quantity: assuranceContract.minimumLoad.quantityPerValue,
    foilColor: "Wit", sourceId: fontId, provenance: `Production-shaped assurance ${heightMm} mm`,
  }));
}

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
const phaseEventLoopMaxMs = new Map();
let loopTickAt = performance.now();
const loopSampler = setInterval(() => {
  const now = performance.now();
  const lag = Math.max(0, now - loopTickAt - 10);
  phaseEventLoopMaxMs.set(loadPhase, Math.max(phaseEventLoopMaxMs.get(loadPhase) ?? 0, lag));
  loopTickAt = now;
}, 10);
loopSampler.unref();
const enterLoadPhase = async (next) => {
  await new Promise((resolve) => setImmediate(resolve));
  loadPhase = next;
  loopTickAt = performance.now();
};
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
  clearInterval(loopSampler);
  clearInterval(poolSampler);
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => undefined);
}

async function storeInitialize() {
  const store = new SportpaleisDomainMariaDbStore({ pool });
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
  await enterLoadPhase("polls");
  for (let offset = 0; offset < 100; offset += 20) {
    const batch = await Promise.all(Array.from({ length: 20 }, (_, index) => request("/api/sportpaleis/v1/state-revision", allCookies[(offset + index) % allCookies.length])));
    assert.ok(batch.every((status) => status === 200));
  }
  await enterLoadPhase("previews");
  for (let offset = 0; offset < 300; offset += 12) {
    const batch = await Promise.all(Array.from({ length: 12 }, (_, index) => request(previewRoutes[(offset + index) % previewRoutes.length], allCookies[(offset + index) % allCookies.length])));
    assert.ok(batch.every((status) => status === 200));
    if (offset % 48 === 0) assert.ok((await Promise.all(coreRoutes.map((route, index) => request(route, allCookies[index % allCookies.length])))).every((status) => status === 200));
  }
  await enterLoadPhase("pool-pressure");
  const blockers = await Promise.all(Array.from({ length: 6 }, () => pool.getConnection()));
  const sleeps = blockers.map((connection) => connection.query("SELECT SLEEP(0.75)").finally(() => connection.release()));
  const underPressureRoutes = [
    ...Array.from({ length: concurrentFullBootstraps }, () => "/api/sportpaleis/v1/bootstrap"),
    ...Array.from({ length: concurrentRevisionPolls }, () => "/api/sportpaleis/v1/state-revision"),
  ];
  const underPressure = await Promise.all(underPressureRoutes.map((route, index) => request(route, allCookies[index % allCookies.length])));
  await Promise.all(sleeps);
  assert.ok(underPressure.every((status) => status === 200), "pooldruk mag geen route laten uitvallen");
  await enterLoadPhase("recovery");
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

  await enterLoadPhase("read-reconciliation");
  const afterReads = await store.read();
  const afterReadRow = (await pool.query("SELECT revision, updated_at, OCTET_LENGTH(state_json) AS bytes FROM sp_runtime_state WHERE organization_id = ?", [afterReads.organizationId]))[0];
  assert.equal(afterReads.revision, beforeRevision, "read-only routes wijzigden revision");
  assert.equal(afterReads.audit.length, beforeAudit, "read-only routes wijzigden audit");
  assert.deepEqual(businessHashes(afterReads), beforeBusiness, "read-only routes wijzigden businessdata");
  assert.equal(new Date(afterReadRow.updated_at).getTime(), new Date(beforeRow.updated_at).getTime(), "read-only routes schreven volledige state");
  await enterLoadPhase("cache-invalidation");
  const sessionView = await service.issueSessionView(normalToken);
  const existingPreference = before.preferences[normalUser.id] ?? {};
  const nextDensity = existingPreference.density === "compact" ? "comfortable" : "compact";
  await service.savePreferences(normalToken, sessionView.csrfToken, { ...existingPreference, density: nextDensity });
  const afterMutation = await store.readSnapshot();
  assert.equal(afterMutation.revision, beforeRevision + 1, "fixturemutatie invalideerde cache niet exact eenmaal");
  assert.equal(afterMutation.preferences[normalUser.id].density, nextDensity, "fixturemutatie werd niet zichtbaar");
  assert.deepEqual(businessHashes(await store.read()), beforeBusiness, "fixturemutatie raakte businessproductiedata");

  await enterLoadPhase("large-free-production");
  const practiceBefore = await store.readSnapshot();
  const originalOrderHashes = new Map(practiceBefore.orders.map((order) => [order.id, sha256CanonicalJson(order)]));
  const originalJobHashes = new Map(practiceBefore.productionJobs.map((job) => [job.id, sha256CanonicalJson(job)]));
  const originalProposalHashes = new Map(practiceBefore.productionProposals.map((proposal) => [proposal.id, sha256CanonicalJson(proposal)]));
  const font = practiceBefore.productionFonts.find(({ name, status }) => name === "Spain Euro 2016" && status === "TECHNICALLY_VALID");
  assert.ok(font, "authoritative Spain Euro 2016 ontbreekt in de production-shaped restore");
  const practiceRuns = [];
  for (const heightMm of assuranceContract.minimumLoad.largeFreeProductionHeightsMm) {
    const operationPrefix = `assurance-${candidateCommit.slice(0, 12)}-${heightMm}`;
    const created = (await service.createOrder(normalToken, normalSession.csrf, {
      orderKind: "CUSTOM", customer: `Geïsoleerde assurancefixture ${heightMm} mm`, customerEmail: "", customerPhone: "",
      standardPersonalization: emptyPersonalization, productionLines: largeFreeLines(font.id, heightMm),
      items: [{ product: "Vrije opdruk 2 t/m 12", association: "Vrije bedrukking", size: "", quantity: 22, personalization: "2 t/m 12 ieder ×2", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }],
    }, `${operationPrefix}-order`)).value;
    const proposal = (await service.createProductionProposal(normalToken, normalSession.csrf, { orders: [{ id: created.id, expectedRevision: created.revision }] }, `${operationPrefix}-proposal`)).value;
    const started = performance.now();
    const productionPayload = { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders };
    const first = await service.createProductionJob(normalToken, normalSession.csrf, productionPayload, `${operationPrefix}-job`);
    const wallMs = performance.now() - started;
    const retry = await service.createProductionJob(normalToken, normalSession.csrf, productionPayload, `${operationPrefix}-job`);
    assert.equal(first.duplicate, false, `${heightMm} mm eerste productie-intentie is niet nieuw`);
    assert.equal(retry.duplicate, true, `${heightMm} mm retry is niet idempotent`);
    assert.equal(first.value.id, retry.value.id, `${heightMm} mm retry maakte een andere PlotJob`);
    assert.equal(first.value.snapshot.productionLines.length, assuranceContract.minimumLoad.largeFreeProductionValues.length);
    assert.ok(first.value.snapshot.productionLines.every((line) => line.heightMm === heightMm && line.quantity === assuranceContract.minimumLoad.quantityPerValue));
    const artifactBytes = await readFile(path.join(artifactRoot, first.value.snapshot.artifact.path));
    const artifactSha256 = sha(artifactBytes).toUpperCase();
    assert.equal(artifactSha256, first.value.snapshot.artifact.sha256, `${heightMm} mm artifacthash wijkt af`);
    practiceRuns.push({ heightMm, wallMs: rounded(wallMs), orderId: created.id, plotJobId: first.value.id, artifactSha256, generationMetrics: first.value.snapshot.generationMetrics });
  }
  const practiceAfter = await store.readSnapshot();
  for (const order of practiceAfter.orders) if (originalOrderHashes.has(order.id)) assert.equal(sha256CanonicalJson(order), originalOrderHashes.get(order.id), `bestaande order ${order.id} wijzigde door assurancefixture`);
  for (const job of practiceAfter.productionJobs) if (originalJobHashes.has(job.id)) assert.equal(sha256CanonicalJson(job), originalJobHashes.get(job.id), `bestaande PlotJob ${job.id} wijzigde door assurancefixture`);
  for (const proposal of practiceAfter.productionProposals) if (originalProposalHashes.has(proposal.id)) assert.equal(sha256CanonicalJson(proposal), originalProposalHashes.get(proposal.id), `bestaand voorstel ${proposal.id} wijzigde door assurancefixture`);
  assert.equal(practiceAfter.orders.length, practiceBefore.orders.length + practiceRuns.length);
  assert.equal(practiceAfter.productionJobs.length, practiceBefore.productionJobs.length + practiceRuns.length);
  assert.equal(practiceAfter.productionProposals.length, practiceBefore.productionProposals.length + practiceRuns.length);
  const storeMetricsAfterPractice = store.metricsSnapshot();
  const productionBuildQueue = productionJobBuildLoad();
  assert.equal(storeMetricsAfterPractice.fullLegacyLoads, 1, "legacy monolith werd na backfill opnieuw geladen");
  assert.ok(storeMetricsAfterPractice.recordWrites > 0 && storeMetricsAfterPractice.domainWrites > 0, "domeinrecordwrites zijn niet gebruikt");

  await enterLoadPhase("bounded-cache-reuse");
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
  await enterLoadPhase("rollback-materialization");
  const rollbackSource = await store.readSnapshot();
  const rollbackProof = await materializeLegacyRollbackState({ pool, expectedGlobalRevision: rollbackSource.revision });
  assert.match(rollbackProof.stateSha256, /^[a-f0-9]{64}$/u, "rollbackmaterialisatie mist de domeinhash");

  const cpu = process.cpuUsage(cpuStart);
  const elapsedMs = performance.now() - wallStart;
  loop.disable(); clearInterval(poolSampler);
  assert.ok(statuses.every((status) => status === 200), "minstens één canaryroute faalde");
  const allMs = timings.map(({ ms }) => ms);
  const metricsFor = (entries) => ({ count: entries.length, p50Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.5)), p95Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.95)), maxMs: rounded(Math.max(0, ...entries.map(({ ms }) => ms))), maxBytes: Math.max(0, ...entries.map(({ bytes }) => Number(bytes) || 0)) });
  const metrics = { ...metricsFor(timings), eventLoopP95Ms: rounded(loop.percentile(95) / 1e6), eventLoopMaxMs: rounded(loop.max / 1e6) };
  const bootstrapMetrics = metricsFor(timings.filter(({ route }) => route === "/api/sportpaleis/v1/bootstrap"));
  const steadyStateMemoryStable = memoryCycles.length === 3 && memoryCycles.at(-1) - memoryCycles[0] <= assuranceContract.limits.steadyStateRssGrowthBytes;
  const rssRecoveredWithinBudget = rssEndBytes - rssStartBytes <= rssRecoveryBudgetBytes && steadyStateMemoryStable;
  const limits = assuranceContract.limits;
  const productionBuildOffEventLoop = productionBuildQueue.active === 0 && productionBuildQueue.queued === 0 && productionBuildQueue.inFlight === 0 && productionBuildQueue.maximumConcurrent === limits.productionBuildMaximumConcurrent && productionBuildQueue.maximumQueued === limits.productionBuildMaximumQueued;
  const databaseConnectionReleasedDuringProductionBuild = storeMetricsAfterPractice.preparedMutations >= practiceRuns.length && storeMetricsAfterPractice.transactionHoldMsMax <= limits.databaseTransactionHoldMaxMs;
  const thresholdsPassed = metrics.p95Ms <= limits.allRoutesP95Ms && metrics.maxMs <= limits.allRoutesMaxMs && bootstrapMetrics.p95Ms <= limits.bootstrapP95Ms && bootstrapMetrics.maxMs <= limits.bootstrapMaxMs && metrics.eventLoopP95Ms <= limits.eventLoopP95Ms && metrics.eventLoopMaxMs <= limits.eventLoopMaxMs && rssHighWater <= limits.rssHighWaterBytes && rssRecoveredWithinBudget && practiceRuns.every(({ wallMs }) => wallMs <= 15_000) && productionBuildOffEventLoop && databaseConnectionReleasedDuringProductionBuild;
  const result = {
    schemaVersion: 3,
    status: thresholdsPassed ? "PASS" : "FAIL", releaseId,
    identity: { candidateCommit, candidateArtifactSha256, restoreBackupSha256, assuranceEntrypointSha256, assuranceContractSha256, assuranceContract: assuranceContract.contractId },
    restoredState: { revisionBeforeReads: beforeRevision, revisionAfterReads: afterReads.revision, stateBytes: Number(beforeRow.bytes), auditBefore: beforeAudit, auditAfterReads: afterReads.audit.length },
    load: { requests: statuses.length, httpErrors: statuses.filter((status) => status >= 400).length, serverErrors: statuses.filter((status) => status >= 500).length, concurrencyModel: { productionCustomerSeats, concurrentReviewPrincipals, concurrentFullBootstraps, concurrentRevisionPolls, heldPoolConnections: blockers.length }, p50Ms: metrics.p50Ms, p95Ms: metrics.p95Ms, maxMs: metrics.maxMs, byPhase: Object.fromEntries([...new Set(timings.map(({ phase }) => phase))].map((phase) => [phase, metricsFor(timings.filter((entry) => entry.phase === phase))])), byRoute: Object.fromEntries([...new Set(timings.map(({ route }) => route))].map((route) => [route, metricsFor(timings.filter((entry) => entry.route === route))])) },
    pool: { connectionLimit: 8, activeHighWater, idleLowWater, queueHighWater, acquireTimeouts: handlerErrors.filter(({ error }) => error?.code === "DATABASE_CONNECTION_FAILED" && error?.cause?.code === "ER_GET_CONNECTION_TIMEOUT").length },
    runtime: { elapsedMs: rounded(elapsedMs), eventLoopP95Ms: metrics.eventLoopP95Ms, eventLoopMaxMs: metrics.eventLoopMaxMs, eventLoopMaxMsByPhase: Object.fromEntries([...phaseEventLoopMaxMs].map(([phase, value]) => [phase, rounded(value)])), rssStartBytes, rssHighWaterBytes: rssHighWater, rssEndBytes, rssRecoveryBudgetBytes, rssRecoveredWithinBudget, steadyStateMemoryStable, memoryCycles, cpuUserMs: rounded(cpu.user / 1000), cpuSystemMs: rounded(cpu.system / 1000) },
    persistence: { store: storeMetricsAfterPractice, rollbackProof },
    practice: { largeFreeProduction: practiceRuns, productionBuildQueue },
    invariants: { authenticatedRoutes: true, readRevisionStable: true, readAuditStable: true, legacyStateWriteStable: true, businessHashesStable: true, domainRecordWritesIncremental: true, cacheInvalidationExact: true, interruptedRetryRecovered: true, normalAndReviewAuth: true, previewFanoutBounded: true, bootstrapCacheBounded: rssRecoveredWithinBudget, largeFreeProduction80Mm: practiceRuns.some(({ heightMm }) => heightMm === 80), largeFreeProduction200Mm: practiceRuns.some(({ heightMm }) => heightMm === 200), productionIdempotency: true, artifactIdentity: true, productionBuildOffEventLoop, databaseConnectionReleasedDuringProductionBuild, tenantAndScopeIsolation: true, rollbackMaterializationProven: true },
    businessHashes: beforeBusiness,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
