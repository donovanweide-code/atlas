import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import mariadb from "mariadb";

import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
import { materializeLegacyRollbackState } from "./sportpaleis-domain-rollback-bridge.mjs";
import { sha256CanonicalJson } from "./workspace-domain-state.mjs";
import { createSportpaleisPilotRequestHandler, reconcileProductionArtifactStorage, reserveImmutableProductionArtifact, reserveImmutableProductionArtifactAsync, SportpaleisPilotService } from "./sportpaleis-pilot-foundation.mjs";
import { buildProductionJobSnapshotIsolated, productionJobBuildLoad } from "../src/sportpaleis/production-job-build.mjs";
import { inspectProductionAssetSvg } from "../src/sportpaleis/production-assets-svg.mjs";

const database = process.env.CANARY_WORKSPACE_DB;
const artifactRoot = process.env.CANARY_ARTIFACT_ROOT;
const releaseId = process.env.CANARY_RELEASE_ID;
const candidateCommit = process.env.CANARY_CANDIDATE_COMMIT;
const candidateArtifactSha256 = process.env.CANARY_CANDIDATE_ARTIFACT_SHA256;
const restoreBackupSha256 = process.env.CANARY_RESTORE_BACKUP_SHA256;
const backfillEvidenceFile = process.env.CANARY_BACKFILL_EVIDENCE_FILE;
const activeCandidateIds = String(process.env.SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerIds = String(process.env.WBD_REVIEW_ACCESS_ISSUER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const issuerSecret = String(process.env.WBD_REVIEW_ACCESS_ISSUER_SECRET ?? "");
const assuranceContractBytes = await readFile(new URL("../config/sportpaleis-production-shaped-assurance-v4.json", import.meta.url));
const assuranceContract = JSON.parse(assuranceContractBytes);
const assuranceContractSha256 = createHash("sha256").update(assuranceContractBytes).digest("hex");
const regressionContractBytes = await readFile(new URL("../config/sportpaleis-regression-contract-v1.json", import.meta.url));
const regressionContract = JSON.parse(regressionContractBytes);
const regressionContractSha256 = createHash("sha256").update(regressionContractBytes).digest("hex");
assert.equal(assuranceContract.schemaVersion, 4, "onbekende assurancecontractversie");
assert.equal(regressionContract.contractId, assuranceContract.regressionContract.id, "assurance gebruikt niet het vereiste regressiecontract");
assert.ok(database && artifactRoot && releaseId, "canaryconfiguratie ontbreekt");
assert.match(candidateCommit ?? "", /^[a-f0-9]{40}$/u, "candidatecommit ontbreekt");
assert.match(candidateArtifactSha256 ?? "", /^[a-f0-9]{64}$/u, "candidate-artifacthash ontbreekt");
assert.match(restoreBackupSha256 ?? "", /^[a-f0-9]{64}$/u, "restore-backuphash ontbreekt");
assert.ok(backfillEvidenceFile, "offline backfillevidence ontbreekt");
assert.ok(activeCandidateIds.length && issuerIds.length && issuerSecret.length >= 43, "reviewconfiguratie ontbreekt");
const backfillEvidence = JSON.parse(await readFile(backfillEvidenceFile, "utf8"));
assert.equal(backfillEvidence.status, "BACKFILLED", "canary vereist een verse offline backfill");
assert.equal(backfillEvidence.legacySha256, backfillEvidence.composedSha256, "offline backfill is niet hashgelijk");

const sha = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
const assuranceEntrypointSha256 = sha(await readFile(fileURLToPath(import.meta.url)));
const hashJson = (value) => sha256CanonicalJson(value);
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

async function productionArtifactInventory() {
  const visibleRoot = path.join(artifactRoot, "outputs", "sportpaleis-plotjobs");
  const quarantineRoot = path.join(artifactRoot, "outputs", "sportpaleis-artifact-quarantine");
  const entries = async (root) => {
    try { return (await readdir(root, { recursive: true })).map((entry) => String(entry).replaceAll("\\", "/")).sort(); }
    catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  };
  const [visible, quarantine] = await Promise.all([entries(visibleRoot), entries(quarantineRoot)]);
  return { visible, quarantine };
}

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
let delayedMutationResponseReady = null;
const handlerErrors = [];
const timings = [];
const bootstrapFieldBytes = {};
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
  const safeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>', "utf8");
  const inspectedSafeSvg = inspectProductionAssetSvg({ bytes: safeSvg, filename: "assurance-safe.svg" });
  assert.equal(inspectedSafeSvg.source.sha256, sha(safeSvg).toUpperCase(), "geldige SVG verliest bronidentiteit");
  await assert.rejects(
    async () => inspectProductionAssetSvg({ bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), filename: "assurance-script.svg" }),
    (error) => String(error?.code ?? "").startsWith("PRODUCTION_ASSET_SVG_"),
    "uitvoerbare SVG-inhoud moet fail-closed stoppen",
  );
  const overComplexSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${'<rect x="0" y="0" width="1" height="1"/>'.repeat(5_001)}</svg>`, "utf8");
  await assert.rejects(
    async () => inspectProductionAssetSvg({ bytes: overComplexSvg, filename: "assurance-complex.svg" }),
    (error) => error?.code === "PRODUCTION_ASSET_SVG_COMPLEXITY_LIMIT",
    "te complexe SVG moet begrensd stoppen",
  );
  const interruptedArtifactBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1H0z"/></svg>', "utf8");
  const interruptedArtifact = reserveImmutableProductionArtifact({ runtimeArtifactRoot: artifactRoot, jobNumber: "PLOT-9999-9999", bytes: interruptedArtifactBytes, operationIdentity: `assurance-interrupted-${candidateCommit}` });
  await service.initialize();
  const interruptedAbsolute = path.join(artifactRoot, interruptedArtifact.relativePath);
  const interruptedQuarantine = path.join(artifactRoot, "outputs", "sportpaleis-artifact-quarantine", "PLOT-9999-9999", interruptedArtifact.artifactHash.toLowerCase(), interruptedArtifact.filename);
  await assert.rejects(access(interruptedAbsolute), (error) => error?.code === "ENOENT", "startupreconciliatie liet een uncommitted artifact actief");
  await access(interruptedQuarantine);
  await access(`${interruptedQuarantine}.reservation.json`);
  await access(path.join(path.dirname(interruptedQuarantine), "quarantine.json"));
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
  assert.equal(review.principal.role, "operator", "reviewrol wijkt af");
  assert.equal(review.principal.mutationDisabled, true, "reviewprincipal is niet mutation-disabled");
  const securityStart = new Date(Date.now() - 20 * 60_000);
  const expiredIssued = await service.issueAutomatedReviewGrant({ candidateId: activeCandidateIds[0], scopes: ["candidate.review.read"], humanGoReference: "GO-SPORTPALEIS-P1-RECOVERY-20260905", ttlMs: 5 * 60_000, runId: `expired-${randomBytes(6).toString("hex")}`, role: "operator" }, issuerSecret, "127.0.0.1", securityStart);
  const expiredUrl = new URL(expiredIssued.activationPath, "http://127.0.0.1");
  const expiredActivation = new URLSearchParams(expiredUrl.hash.slice(1));
  const expired = await service.activateReviewDeveloperGrant({ activationToken: expiredActivation.get("token"), candidateId: expiredActivation.get("candidate") }, new Date(securityStart.getTime() + 1_000));
  await assert.rejects(() => service.authenticate(expired.sessionToken, new Date(securityStart.getTime() + 5 * 60_000 + 1)), (error) => error?.code === "REVIEW_GRANT_EXPIRED", "verlopen reviewtoegang bleef actief");
  const revokedIssued = await service.issueAutomatedReviewGrant({ candidateId: activeCandidateIds[0], scopes: ["candidate.review.read"], humanGoReference: "GO-SPORTPALEIS-P1-RECOVERY-20260905", ttlMs: 10 * 60_000, runId: `revoked-${randomBytes(6).toString("hex")}`, role: "operator" }, issuerSecret, "127.0.0.1", new Date(securityStart.getTime() + 6 * 60_000));
  const revokedUrl = new URL(revokedIssued.activationPath, "http://127.0.0.1");
  const revokedActivation = new URLSearchParams(revokedUrl.hash.slice(1));
  const revoked = await service.activateReviewDeveloperGrant({ activationToken: revokedActivation.get("token"), candidateId: revokedActivation.get("candidate") }, new Date(securityStart.getTime() + 6 * 60_000 + 1_000));
  await service.revokeAutomatedReviewGrant({ grantId: revokedIssued.grant.id }, issuerSecret, "127.0.0.1", new Date(securityStart.getTime() + 6 * 60_000 + 2_000));
  await assert.rejects(() => service.authenticate(revoked.sessionToken, new Date(securityStart.getTime() + 6 * 60_000 + 3_000)), (error) => error?.code === "REVIEW_GRANT_INACTIVE", "ingetrokken reviewtoegang bleef actief");
  const before = await store.read();
  const activeFoilColors = before.foilRolls.filter(({ active }) => active !== false).map(({ color }) => String(color).trim());
  assert.ok(activeFoilColors.length >= 6 && new Set(activeFoilColors.map((color) => color.toLocaleLowerCase("nl-NL"))).size === activeFoilColors.length, "centrale actieve foliekleuren zijn niet volledig en uniek");
  const beforeRow = (await pool.query("SELECT revision, updated_at, OCTET_LENGTH(state_json) AS bytes FROM sp_runtime_state WHERE organization_id = ?", [before.organizationId]))[0];
  const beforeBusiness = businessHashes(before);
  const beforeRevision = before.revision;
  const beforeAudit = before.audit.length;

  const handler = createSportpaleisPilotRequestHandler(service, { onError: (entry) => handlerErrors.push(entry) });
  server = createServer(async (request, response) => {
    if (request.url?.startsWith("/api/sportpaleis/v1/bootstrap")) bootstrapRequestsReceived += 1;
    if (request.headers["x-assurance-delay-response"] === "1" && delayedMutationResponseReady) {
      const originalEnd = response.end.bind(response);
      response.end = (...args) => {
        const signalReady = delayedMutationResponseReady;
        delayedMutationResponseReady = null;
        signalReady();
        const timer = setTimeout(() => originalEnd(...args), 250);
        timer.unref();
        return response;
      };
    }
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
    if (route.startsWith("/api/sportpaleis/v1/bootstrap") && response.status === 200) {
      const parsed = JSON.parse(body.toString("utf8"));
      const surface = new URL(route, "http://canary.local").searchParams.get("surface") ?? "overview";
      bootstrapFieldBytes[surface] ??= Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value))]).sort((left, right) => right[1] - left[1]));
    }
    timings.push({ route, phase: loadPhase, ms: performance.now() - started, bytes: body.length });
    return response.status;
  };
  const bootstrapRoutes = assuranceContract.minimumLoad.bootstrapSurfaces.map((surface) => `/api/sportpaleis/v1/bootstrap?surface=${surface}`);
  const coreRoutes = ["/api/sportpaleis/v1/auth/session", "/api/sportpaleis/v1/state-revision"];
  for (let index = 0; index < allCookies.length; index += 1) {
    for (const route of coreRoutes) assert.equal(await request(route, allCookies[index]), 200, `${route} moet bereikbaar zijn`);
  }
  for (let index = 0; index < bootstrapRoutes.length; index += 1) assert.equal(await request(bootstrapRoutes[index], allCookies[index % allCookies.length]), 200, `${bootstrapRoutes[index]} moet bereikbaar zijn`);
  service.bootstrapResponseCache.clear();
  service.bootstrapResponseCacheBytes = 0;
  assert.equal(await request("/api/sportpaleis/v1/bootstrap?surface=library", reviewCookie), 200, "koude Library-bootstrap faalde");
  const coldCache = { entries: service.bootstrapResponseCache.size, bytes: service.bootstrapResponseCacheBytes };
  assert.ok(coldCache.entries === 1 && coldCache.bytes > 0, "koude bootstrap bouwde geen begrensde cache-entry");
  assert.equal(await request("/api/sportpaleis/v1/bootstrap?surface=library", reviewCookie), 200, "warme Library-bootstrap faalde");
  assert.deepEqual({ entries: service.bootstrapResponseCache.size, bytes: service.bootstrapResponseCacheBytes }, coldCache, "warme bootstrap serialiseerde een tweede cache-entry");
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
    if (offset % 48 === 0) assert.ok((await Promise.all([...coreRoutes, bootstrapRoutes[offset % bootstrapRoutes.length]].map((route, index) => request(route, allCookies[index % allCookies.length])))).every((status) => status === 200));
  }
  const soakCycles = [];
  for (let cycle = 0; cycle < assuranceContract.minimumLoad.soakCycles; cycle += 1) {
    const phase = `soak-${cycle + 1}`;
    await enterLoadPhase(phase);
    const timingsStart = timings.length;
    const statusesStart = statuses.length;
    const rssCycleStartBytes = process.memoryUsage().rss;
    let rssCycleHighWaterBytes = rssCycleStartBytes;
    for (let offset = 0; offset < assuranceContract.minimumLoad.soakRevisionPollsPerCycle; offset += concurrentRevisionPolls) {
      const batch = await Promise.all(Array.from({ length: Math.min(concurrentRevisionPolls, assuranceContract.minimumLoad.soakRevisionPollsPerCycle - offset) }, (_, index) => request("/api/sportpaleis/v1/state-revision", allCookies[(offset + index) % allCookies.length])));
      assert.ok(batch.every((status) => status === 200), `soak ${cycle + 1}: revisionpoll faalde`);
      rssCycleHighWaterBytes = Math.max(rssCycleHighWaterBytes, process.memoryUsage().rss);
    }
    for (let offset = 0; offset < assuranceContract.minimumLoad.soakLibraryPreviewsPerCycle; offset += 12) {
      const batch = await Promise.all(Array.from({ length: Math.min(12, assuranceContract.minimumLoad.soakLibraryPreviewsPerCycle - offset) }, (_, index) => request(previewRoutes[(offset + index) % previewRoutes.length], allCookies[(offset + index) % allCookies.length])));
      assert.ok(batch.every((status) => status === 200), `soak ${cycle + 1}: Library-preview faalde`);
      rssCycleHighWaterBytes = Math.max(rssCycleHighWaterBytes, process.memoryUsage().rss);
    }
    const bootstrapBatch = await Promise.all(Array.from({ length: assuranceContract.minimumLoad.soakBootstrapsPerCycle }, (_, index) => request(bootstrapRoutes[index % bootstrapRoutes.length], allCookies[index % allCookies.length])));
    assert.ok(bootstrapBatch.every((status) => status === 200), `soak ${cycle + 1}: bootstrap faalde`);
    rssCycleHighWaterBytes = Math.max(rssCycleHighWaterBytes, process.memoryUsage().rss);
    const cycleState = await store.readSnapshot();
    assert.equal(cycleState.revision, beforeRevision, `soak ${cycle + 1}: read veroorzaakte revisionchurn`);
    assert.equal(cycleState.audit.length, beforeAudit, `soak ${cycle + 1}: read veroorzaakte auditchurn`);
    assert.deepEqual(businessHashes(cycleState), beforeBusiness, `soak ${cycle + 1}: businessdata driftte`);
    await enterLoadPhase(`${phase}-rest`);
    global.gc?.();
    await new Promise((resolve) => setTimeout(resolve, assuranceContract.minimumLoad.soakRestMsPerCycle));
    global.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 50));
    soakCycles.push({ cycle: cycle + 1, phase, timingsStart, timingsEnd: timings.length, statusesStart, statusesEnd: statuses.length, rssStartBytes: rssCycleStartBytes, rssHighWaterBytes: rssCycleHighWaterBytes, rssAfterRestBytes: process.memoryUsage().rss });
  }
  await enterLoadPhase("pool-pressure");
  const blockers = await Promise.all(Array.from({ length: 6 }, () => pool.getConnection()));
  const sleeps = blockers.map((connection) => connection.query("SELECT SLEEP(0.75)").finally(() => connection.release()));
  const underPressureRoutes = [
    ...Array.from({ length: concurrentFullBootstraps }, (_, index) => bootstrapRoutes[index % bootstrapRoutes.length]),
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
  const interrupted = fetch(`${origin}/api/sportpaleis/v1/bootstrap?surface=production`, { headers: { cookie: reviewCookie }, signal: aborted.signal });
  setTimeout(() => aborted.abort(), 5);
  await assert.rejects(interrupted, (error) => error.name === "AbortError");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(bootstrapRequestsReceived > receivedBeforeInterrupt, "interrupted request bereikte de server");
  assert.equal(service.bootstrapResponsePromises.size, 0, "interrupted bootstrap laat geen single-flight achter");
  assert.equal(await request("/api/sportpaleis/v1/bootstrap?surface=production", reviewCookie), 200, "retry na gestart maar interrupted request");

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
  const refreshedOverview = await service.bootstrap(normalToken, "overview");
  assert.equal(refreshedOverview.preferences[normalUser.id].density, nextDensity, "bootstrap leverde stale data na cache-invalidatie");
  assert.deepEqual(businessHashes(await store.read()), beforeBusiness, "fixturemutatie raakte businessproductiedata");
  const beforeRollbackProbe = await store.readSnapshot();
  await assert.rejects(store.mutate(async (state) => {
    state.preferences[normalUser.id].density = "assurance-rollback-probe";
    throw Object.assign(new Error("assurance rollback probe"), { code: "ASSURANCE_ROLLBACK_PROBE" });
  }), (error) => error?.code === "ASSURANCE_ROLLBACK_PROBE");
  const afterRollbackProbe = await store.readSnapshot();
  assert.equal(afterRollbackProbe.revision, beforeRollbackProbe.revision, "afgebroken mutatie wijzigde revision");
  assert.equal(afterRollbackProbe.preferences[normalUser.id].density, nextDensity, "afgebroken mutatie lekte gedeeltelijke state");

  await enterLoadPhase("mutation-lane-concurrency");
  const mutationLaneCount = assuranceContract.minimumLoad.concurrentMutations;
  assert.ok(Number.isInteger(mutationLaneCount) && mutationLaneCount >= 20, "mutationlanecontract vereist minimaal twintig gelijktijdige commands");
  const mutationLaneBefore = await store.readSnapshot();
  const mutationLaneAuditBefore = mutationLaneBefore.audit.length;
  const mutationLaneOperation = (index, kind) => async (state) => {
    state.preferences[`assurance-lane-${index}`] = { density: index % 2 ? "compact" : "comfortable", kind };
    state.audit.push({ id: `audit-assurance-lane-${candidateCommit.slice(0, 12)}-${index}`, at: new Date(Date.UTC(2026, 8, 6, 8, 0, index)).toISOString(), actorId: normalUser.id, action: "MUTATION_LANE_ASSURANCE", targetId: `assurance-lane-${index}`, details: { kind } });
    return { state, value: { index, kind } };
  };
  const ordinaryMutationLane = Array.from({ length: mutationLaneCount }, (_, index) => store.mutate(mutationLaneOperation(index, "ordinary")));
  const mutationLaneResults = await Promise.all(ordinaryMutationLane);
  const mutationLaneAfter = await store.readSnapshot();
  assert.deepEqual(mutationLaneResults.map(({ value }) => value.index), Array.from({ length: mutationLaneCount }, (_, index) => index), "mutationlane verloor of verwisselde een command");
  assert.deepEqual(mutationLaneResults.map(({ state }) => state.revision), Array.from({ length: mutationLaneCount }, (_, index) => mutationLaneBefore.revision + index + 1), "mutationlane committe niet monotoon");
  assert.equal(mutationLaneAfter.audit.length, mutationLaneAuditBefore + mutationLaneCount, "mutationlane mist auditevidence");
  const mutationLaneMetrics = store.metricsSnapshot();
  const mutationLane = {
    commands: mutationLaneCount,
    activeHighWater: mutationLaneMetrics.mutationActiveHighWater,
    queueHighWater: mutationLaneMetrics.mutationQueueHighWater,
    queueDepthAfter: mutationLaneMetrics.mutationQueueDepth,
    backpressureRejects: mutationLaneMetrics.mutationBackpressureRejects,
    monotoneCommits: true,
    auditAppends: mutationLaneCount,
  };
  assert.equal(mutationLane.activeHighWater, 1, "mutationpreparation liep onbeperkt parallel");
  assert.equal(mutationLane.queueDepthAfter, 0, "mutationlane hield afgewerkte commands vast");
  assert.equal(mutationLane.backpressureRejects, 0, "toegestane production-shaped concurrency raakte backpressure");

  await enterLoadPhase("mariadb-multibatch-rollback");
  const mariaDbMultiBatch = await (async () => {
  const batchRowCount = assuranceContract.minimumLoad.mariaDbBatchRows;
  assert.ok(Number.isInteger(batchRowCount) && batchRowCount > 200, "MariaDB multibatchcontract vereist meer dan 200 records");
  const batchPrefix = `assurance-multibatch-${candidateCommit.slice(0, 12)}-`;
  const batchRecords = Array.from({ length: batchRowCount }, (_, index) => ({
    id: `${batchPrefix}${String(index).padStart(4, "0")}`,
    name: `Geïsoleerde multibatchfixture ${index + 1}`,
    articleNumber: `ASSURANCE-${String(index + 1).padStart(4, "0")}`,
    supplierNumber: "ASSURANCE-ONLY",
    association: "Geïsoleerde assurancefixture",
    sizes: [],
    decorationOptions: [],
    status: "ASSURANCE_FIXTURE",
  }));
  const originalArticles = (await store.readSnapshot()).articles;
  const originalArticlesHash = hashJson(originalArticles);
  const metaBeforeBatch = (await pool.query("SELECT global_revision FROM sp_workspace_domain_meta WHERE organization_id = ?", [before.organizationId]))[0];
  const recordsBeforeBatch = Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'articles' AND record_id LIKE ?", [before.organizationId, `${batchPrefix}%`]))[0].count);
  assert.equal(recordsBeforeBatch, 0, "multibatchfixture bestond al vóór de probe");
  let recordBatchCalls = 0;
  let injectSecondBatchFailure = true;
  const faultPool = {
    query: (...arguments_) => pool.query(...arguments_),
    async getConnection() {
      const connection = await pool.getConnection();
      return new Proxy(connection, {
        get(target, property) {
          if (property === "batch") return async (sql, parameters) => {
            if (String(sql).startsWith("INSERT INTO sp_workspace_domain_record")) {
              recordBatchCalls += 1;
              if (injectSecondBatchFailure && recordBatchCalls === 2) {
                throw Object.assign(new Error("Geïsoleerde foutinjectie in MariaDB-batch 2."), { code: "ASSURANCE_BATCH_TWO_FAILURE" });
              }
            }
            return target.batch(sql, parameters);
          };
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  const batchStore = new SportpaleisDomainMariaDbStore({ pool: faultPool });
  await batchStore.initialize();
  const applyBatchFixture = async (state) => {
    const existing = new Set(state.articles.map(({ id }) => id));
    const missing = batchRecords.filter(({ id }) => !existing.has(id));
    if (missing.length === 0) return { unchanged: true, value: { inserted: 0 } };
    state.articles.push(...missing);
    return { state, value: { inserted: missing.length } };
  };
  const batchStoreHashBeforeFailure = hashJson((await batchStore.readSnapshot()).articles);
  await assert.rejects(
    batchStore.prepareAndCommit(applyBatchFixture),
    (error) => error?.code === "DOMAIN_TRANSACTION_FAILED" && error?.cause?.code === "ASSURANCE_BATCH_TWO_FAILURE",
    "fout in MariaDB-batch 2 moet de volledige mutatie afbreken",
  );
  assert.equal(recordBatchCalls, 2, "foutinjectie bereikte niet exact de tweede recordbatch");
  assert.equal(hashJson((await batchStore.readSnapshot()).articles), batchStoreHashBeforeFailure, "rollback wijzigde de in-memory domeincache");
  const metaAfterBatchFailure = (await pool.query("SELECT global_revision FROM sp_workspace_domain_meta WHERE organization_id = ?", [before.organizationId]))[0];
  assert.equal(Number(metaAfterBatchFailure.global_revision), Number(metaBeforeBatch.global_revision), "batchrollback wijzigde de globale revision");
  assert.equal(Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'articles' AND record_id LIKE ?", [before.organizationId, `${batchPrefix}%`]))[0].count), 0, "batchrollback liet gedeeltelijke records achter");
  let restartProbe = new SportpaleisDomainMariaDbStore({ pool });
  await restartProbe.initialize();
  assert.equal(hashJson((await restartProbe.readSnapshot()).articles), originalArticlesHash, "restart na batchrollback week af van de bronstate");
  restartProbe = null;
  global.gc?.();

  injectSecondBatchFailure = false;
  const batchCommit = await batchStore.prepareAndCommit(applyBatchFixture);
  assert.equal(batchCommit.value.inserted, batchRowCount, "multibatchretry committe niet alle records");
  const revisionAfterBatchCommit = (await batchStore.readSnapshot()).revision;
  const duplicateBatchCommit = await batchStore.prepareAndCommit(applyBatchFixture);
  assert.equal(duplicateBatchCommit.value.inserted, 0, "multibatchretry was niet idempotent");
  assert.equal((await batchStore.readSnapshot()).revision, revisionAfterBatchCommit, "idempotente multibatchretry verhoogde de revision");
  const persistedBatchRows = await pool.query("SELECT record_id, ordinal, record_sha256 FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'articles' AND record_id LIKE ? ORDER BY ordinal ASC", [before.organizationId, `${batchPrefix}%`]);
  assert.equal(persistedBatchRows.length, batchRowCount, "multibatchretry materialiseerde niet exact één record per identity");
  assert.equal(new Set(persistedBatchRows.map(({ record_id }) => record_id)).size, batchRowCount, "multibatchretry maakte dubbele identities");
  assert.equal(new Set(persistedBatchRows.map(({ ordinal }) => Number(ordinal))).size, batchRowCount, "multibatchretry maakte dubbele ordinals");
  assert.ok(persistedBatchRows.every(({ record_sha256 }) => /^[a-f0-9]{64}$/u.test(record_sha256)), "multibatchretry mist recordhashes");
  restartProbe = new SportpaleisDomainMariaDbStore({ pool });
  await restartProbe.initialize();
  assert.equal((await restartProbe.readSnapshot()).articles.filter(({ id }) => id.startsWith(batchPrefix)).length, batchRowCount, "restart verloor multibatchrecords");
  restartProbe = null;
  global.gc?.();
  const batchMetrics = batchStore.metricsSnapshot();
  assert.ok(batchMetrics.writeBatches >= 3 && batchMetrics.writeBatchRows >= batchRowCount && batchMetrics.writeBatchMaxRows === 200, "echte MariaDB-multibatchgrens is niet gebruikt");
  assert.ok(batchMetrics.transactionHoldMsMax <= assuranceContract.limits.databaseTransactionHoldMaxMs, `MariaDB-multibatch hield de transactie ${batchMetrics.transactionHoldMsMax} ms vast`);

  await batchStore.prepareAndCommit(async (state) => {
    state.articles = state.articles.filter(({ id }) => !id.startsWith(batchPrefix));
    return { state, value: null };
  });
  restartProbe = new SportpaleisDomainMariaDbStore({ pool });
  await restartProbe.initialize();
  assert.equal(hashJson((await restartProbe.readSnapshot()).articles), originalArticlesHash, "multibatchcleanup herstelde de authentieke articles niet byte-semantisch");
  restartProbe = null;
  assert.equal(Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'articles' AND record_id LIKE ?", [before.organizationId, `${batchPrefix}%`]))[0].count), 0, "multibatchcleanup liet fixture-records achter");
  return {
    rows: batchRowCount,
    injectedFailureBatch: 2,
    retryRevision: revisionAfterBatchCommit,
    batchCalls: batchMetrics.writeBatches,
    batchRows: batchMetrics.writeBatchRows,
    maximumBatchRows: batchMetrics.writeBatchMaxRows,
    transactionHoldMsMax: rounded(batchMetrics.transactionHoldMsMax),
    slowestTransaction: batchMetrics.transactionSlowest,
    rollbackAndRestartHashEqual: true,
    retryExactlyOnce: true,
    cleanupHashEqual: true,
  };
  })();
  global.gc?.();

  await enterLoadPhase("large-free-production");
  const practiceBefore = await store.readSnapshot();
  const originalOrderHashes = new Map(practiceBefore.orders.map((order) => [order.id, sha256CanonicalJson(order)]));
  const originalJobHashes = new Map(practiceBefore.productionJobs.map((job) => [job.id, sha256CanonicalJson(job)]));
  const originalProposalHashes = new Map(practiceBefore.productionProposals.map((proposal) => [proposal.id, sha256CanonicalJson(proposal)]));
  const font = practiceBefore.productionFonts.find(({ name, status }) => name === "Spain Euro 2016" && status === "TECHNICALLY_VALID");
  assert.ok(font, "authoritative Spain Euro 2016 ontbreekt in de production-shaped restore");
  const runCrashAndChannelRace = async () => {
  const createControlledSourceOrder = async (source, key) => {
    const created = (await service.createOrder(normalToken, normalSession.csrf, {
      orderKind: "CUSTOM", source,
      ...(source === "STORE" ? {} : { externalReference: `${source}-${key}`, provenance: `${source} production-shaped concurrencyfixture` }),
      customer: `Geïsoleerde kanaalfixture ${key}`, customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization,
      items: [{ product: "Kanaalconcurrency", size: "", quantity: 1, personalization: "AA", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }],
      productionLines: [{ id: `line-${key}`, type: "INITIALS", content: "AA", previewLabel: "Initialen AA", widthMm: 50, heightMm: 30, quantity: 1, sourceId: font.id, provenance: "Real-MariaDB gelijke-kleurconcurrency" }],
    }, `assurance-channel-${key}-order`)).value;
    return (await service.advanceOrder(normalToken, normalSession.csrf, created.id, created.revision, `assurance-channel-${key}-control`)).value;
  };
  const storeOrder = await createControlledSourceOrder("STORE", "store");
  const webshopOrder = await createControlledSourceOrder("WEBSHOP_XPRT", "webshop");
  const channelProposal = (await service.createProductionProposal(normalToken, normalSession.csrf, {
    orders: [storeOrder, webshopOrder].map(({ id, revision }) => ({ id, expectedRevision: revision })),
  }, "assurance-channel-proposal")).value;
  assert.deepEqual(channelProposal.groups.map(({ sourceChannel }) => sourceChannel), ["STORE", "WEBSHOP_XPRT"], "kanaalfixture leverde niet twee gelijke-kleurbrongroepen");
  const crashOperationIdentity = `assurance-worker-crash-${candidateCommit}`;
  const crashGroup = channelProposal.groups[0];
  const crashState = await store.readSnapshot();
  const crashProjectedState = Object.fromEntries(["organizationId", "settings", "associations", "articles", "productionProfiles", "productionFonts", "productionElements", "productionAssetSources", "foilRolls"].map((key) => [key, crashState[key]]));
  const crashInput = {
    state: crashProjectedState,
    orders: [storeOrder],
    jobNumber: "PLOT-9999-9998",
    createdAt: new Date().toISOString(),
    artifactRoot,
    runtimeArtifactRoot: artifactRoot,
    productionGroup: { installedProductionAssetRoot: `${artifactRoot}/installed-assets`, lineRefs: crashGroup.productionLineRefs, foilColor: crashGroup.foilColor, sourceChannel: crashGroup.sourceChannel, groupId: crashGroup.id, groupLabel: crashGroup.label },
    options: { installedProductionAssetRoot: `${artifactRoot}/installed-assets`, operationIdentity: crashOperationIdentity, persistArtifacts: false, returnArtifactPayload: true },
    assuranceFault: "EXIT_AFTER_BUILD_BEFORE_MESSAGE",
  };
  const workerCrashArtifactsBefore = await productionArtifactInventory();
  const workerCrashStateBefore = await store.readSnapshot();
  process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED = "1";
  try {
    await assert.rejects(
      buildProductionJobSnapshotIsolated(crashInput, { operationIdentity: crashOperationIdentity }),
      (error) => error?.code === "PRODUCTION_JOB_BUILD_FAILED" && error?.statusCode === 503,
      "een crash na echte productieopbouw maar vóór workerbericht moet fail-closed eindigen",
    );
  } finally {
    delete process.env.SPORTPALEIS_ASSURANCE_FAULTS_ENABLED;
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(productionJobBuildLoad(), { active: 0, queued: 0, inFlight: 0, maximumConcurrent: 1, maximumQueued: 4 }, "workercrash liet queue- of in-flightstate achter");
  assert.deepEqual(await productionArtifactInventory(), workerCrashArtifactsBefore, "workercrash na echte build liet een zichtbaar of gequarantaineerd orphanartifact achter");
  const workerCrashStateAfter = await store.readSnapshot();
  assert.deepEqual(workerCrashStateAfter.orders.map(sha256CanonicalJson), workerCrashStateBefore.orders.map(sha256CanonicalJson), "workercrash wijzigde orders");
  assert.deepEqual(workerCrashStateAfter.productionJobs.map(sha256CanonicalJson), workerCrashStateBefore.productionJobs.map(sha256CanonicalJson), "workercrash wijzigde PlotJobs");
  assert.deepEqual(workerCrashStateAfter.productionProposals.map(sha256CanonicalJson), workerCrashStateBefore.productionProposals.map(sha256CanonicalJson), "workercrash wijzigde voorstellen");
  const workerCrashRetry = await buildProductionJobSnapshotIsolated({ ...crashInput, assuranceFault: undefined }, { operationIdentity: crashOperationIdentity });
  assert.equal(workerCrashRetry.artifact?.format, "SVG", "retry na workercrash leverde geen deterministische SVG-snapshot");
  assert.deepEqual(await productionArtifactInventory(), workerCrashArtifactsBefore, "dry-buildretry reserveerde ten onrechte vóór parent-side commitgrens");
  const workerCrashRecoveredWithoutOrphan = true;
  const parentFaultOperation = `assurance-parent-reservation-crash-${candidateCommit}`;
  const parentFaultBytes = Buffer.from(workerCrashRetry.artifactPayload, "utf8");
  await assert.rejects(
    reserveImmutableProductionArtifactAsync({ runtimeArtifactRoot: artifactRoot, jobNumber: "PLOT-9999-9997", bytes: parentFaultBytes, operationIdentity: parentFaultOperation, faultInjector: (point) => {
      if (point === "AFTER_FINAL_BEFORE_RETURN") throw Object.assign(new Error("assurance parent reservation crash"), { code: "ASSURANCE_PARENT_RESERVATION_CRASH" });
    } }),
    (error) => error?.code === "ASSURANCE_PARENT_RESERVATION_CRASH",
  );
  const parentFaultPrepared = await productionArtifactInventory();
  assert.ok(parentFaultPrepared.visible.some((entry) => entry.endsWith("PLOT-9999-9997-production.svg")), "fault-injection bereikte de final-link niet");
  assert.ok(parentFaultPrepared.visible.some((entry) => entry.endsWith("PLOT-9999-9997-production.svg.reservation.json")), "evidence bestond niet vóór de final-link");
  const committedPracticeArtifacts = assuranceContract.minimumLoad.largeFreeProductionHeightsMm.length;
  assert.deepEqual(await reconcileProductionArtifactStorage({ runtimeArtifactRoot: artifactRoot, state: workerCrashStateAfter }), { checked: committedPracticeArtifacts + 1, committed: committedPracticeArtifacts, quarantined: 1 }, "parentcrash werd niet begrensd gereconcilieerd");
  const parentFaultReconciled = await productionArtifactInventory();
  assert.deepEqual(parentFaultReconciled.visible, workerCrashArtifactsBefore.visible, "parentcrash liet een zichtbare orphan achter");
  assert.ok(parentFaultReconciled.quarantine.length > workerCrashArtifactsBefore.quarantine.length, "parentcrash behield geen immutable quarantine-evidence");
  const parentRetry = await reserveImmutableProductionArtifactAsync({ runtimeArtifactRoot: artifactRoot, jobNumber: "PLOT-9999-9997", bytes: parentFaultBytes, operationIdentity: parentFaultOperation });
  assert.equal(parentRetry.reused, false, "retry na gereconcilieerde parentcrash adopteerde ten onrechte een zichtbare final");
  assert.deepEqual(await reconcileProductionArtifactStorage({ runtimeArtifactRoot: artifactRoot, state: workerCrashStateAfter }), { checked: committedPracticeArtifacts + 1, committed: committedPracticeArtifacts, quarantined: 1 }, "retryevidence werd niet opnieuw zonder duplicaat gereconcilieerd");
  assert.deepEqual((await productionArtifactInventory()).visible, workerCrashArtifactsBefore.visible, "retry na parentcrash liet een zichtbare orphan achter");
  const parentReservationCrashRecoveredWithoutOrphan = true;
  const raceKeys = ["assurance-channel-store-job", "assurance-channel-webshop-job"];
  const raceDbBefore = {
    jobs: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'productionJobs'", [practiceBefore.organizationId]))[0].count),
    artifacts: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_artifact_reference WHERE organization_id = ?", [practiceBefore.organizationId]))[0].count),
    idempotency: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_idempotency_record WHERE organization_id = ? AND identity_key IN (?, ?)", [practiceBefore.organizationId, ...raceKeys.map((key) => `${normalUser.id}:CREATE_PRODUCTION_JOB:${key}`)]))[0].count),
  };
  const raceArtifactsBefore = await productionArtifactInventory();
  const raceOutcomes = await Promise.allSettled(channelProposal.groups.map((group, index) => service.createProductionJob(
    normalToken,
    normalSession.csrf,
    { proposalId: channelProposal.id, proposalGroupId: group.id, orders: group.orders },
    raceKeys[index],
  )));
  const raceWinner = raceOutcomes.find(({ status }) => status === "fulfilled");
  const raceLoser = raceOutcomes.find(({ status }) => status === "rejected");
  const raceWinnerIndex = raceOutcomes.findIndex(({ status }) => status === "fulfilled");
  assert.equal(raceOutcomes.filter(({ status }) => status === "fulfilled").length, 1, "gelijktijdige gelijke-kleurgroepen committen niet exact één PlotJob");
  assert.equal(raceWinner.value.duplicate, false, "winnende gelijke-kleurintentie is niet nieuw");
  assert.equal(raceLoser?.reason?.code, "PRODUCTION_PHYSICAL_STEP_CONFLICT", "verliezer faalt niet op de logische fysieke-stapgrens");
  const raceState = await store.readSnapshot();
  const raceProposal = raceState.productionProposals.find(({ id }) => id === channelProposal.id);
  assert.equal(raceProposal.groups.filter(({ status, productionJobId }) => status === "CONVERTED" && productionJobId).length, 1, "race committe niet exact één groep");
  assert.equal(raceProposal.groups.filter(({ status, productionJobId }) => status === "OPEN" && !productionJobId).length, 1, "race liet de niet-gekozen groep niet veilig OPEN");
  const raceDbAfter = {
    jobs: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_domain_record WHERE organization_id = ? AND collection_key = 'productionJobs'", [practiceBefore.organizationId]))[0].count),
    artifacts: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_artifact_reference WHERE organization_id = ?", [practiceBefore.organizationId]))[0].count),
    idempotency: Number((await pool.query("SELECT COUNT(*) AS count FROM sp_workspace_idempotency_record WHERE organization_id = ? AND identity_key IN (?, ?)", [practiceBefore.organizationId, ...raceKeys.map((key) => `${normalUser.id}:CREATE_PRODUCTION_JOB:${key}`)]))[0].count),
  };
  assert.deepEqual({ jobs: raceDbAfter.jobs - raceDbBefore.jobs, artifacts: raceDbAfter.artifacts - raceDbBefore.artifacts, idempotency: raceDbAfter.idempotency - raceDbBefore.idempotency }, { jobs: 1, artifacts: 1, idempotency: 1 }, "real-MariaDB race liet dubbele of ontbrekende persistente records achter");
  const winnerJob = raceWinner.value.value;
  const winnerArtifactRows = await pool.query("SELECT plot_job_id, artifact_sha256, artifact_path, artifact_format, immutable FROM sp_workspace_artifact_reference WHERE organization_id = ? AND plot_job_id = ?", [practiceBefore.organizationId, winnerJob.id]);
  assert.equal(winnerArtifactRows.length, 1, "winnende PlotJob mist zijn unieke artifactreferentie");
  assert.deepEqual({
    plotJobId: winnerArtifactRows[0].plot_job_id,
    sha256: String(winnerArtifactRows[0].artifact_sha256).toUpperCase(),
    path: winnerArtifactRows[0].artifact_path,
    format: winnerArtifactRows[0].artifact_format,
    immutable: Number(winnerArtifactRows[0].immutable),
  }, {
    plotJobId: winnerJob.id,
    sha256: winnerJob.snapshot.artifact.sha256,
    path: winnerJob.snapshot.artifact.path,
    format: winnerJob.snapshot.artifact.format,
    immutable: 1,
  }, "database-artifactreferentie wijkt af van de immutable winnende PlotJob");
  const expectedWinnerIdentity = `${normalUser.id}:CREATE_PRODUCTION_JOB:${raceKeys[raceWinnerIndex]}`;
  const winnerIdempotencyRows = await pool.query("SELECT identity_key FROM sp_workspace_idempotency_record WHERE organization_id = ? AND identity_key IN (?, ?)", [practiceBefore.organizationId, ...raceKeys.map((key) => `${normalUser.id}:CREATE_PRODUCTION_JOB:${key}`)]);
  assert.deepEqual(winnerIdempotencyRows.map(({ identity_key: identity }) => identity), [expectedWinnerIdentity], "exact de winnende intentie moet als idempotencyrecord zijn vastgelegd");
  const raceCommittedMarker = JSON.parse(await readFile(path.join(artifactRoot, `${winnerJob.snapshot.artifact.path}.committed.json`), "utf8"));
  assert.deepEqual({ jobNumber: raceCommittedMarker.jobNumber, artifactPath: raceCommittedMarker.artifactPath, artifactSha256: raceCommittedMarker.artifactSha256, status: raceCommittedMarker.status }, { jobNumber: winnerJob.jobNumber, artifactPath: winnerJob.snapshot.artifact.path, artifactSha256: winnerJob.snapshot.artifact.sha256, status: "COMMITTED" }, "commitmarkering correspondeert niet exact met job, pad en hash");
  const raceArtifactsAfter = await productionArtifactInventory();
  const visibleRaceArtifacts = raceArtifactsAfter.visible.filter((entry) => !raceArtifactsBefore.visible.includes(entry));
  const quarantinedRaceArtifacts = raceArtifactsAfter.quarantine.filter((entry) => !raceArtifactsBefore.quarantine.includes(entry));
  assert.equal(visibleRaceArtifacts.filter((entry) => entry.endsWith("-production.svg")).length, 1, "race liet niet exact één zichtbare SVG achter");
  assert.equal(visibleRaceArtifacts.filter((entry) => entry.endsWith(".reservation.json")).length, 1, "race liet niet exact één reservering achter");
  assert.equal(visibleRaceArtifacts.filter((entry) => entry.endsWith(".committed.json")).length, 1, "race liet niet exact één commitmarkering achter");
  assert.equal(quarantinedRaceArtifacts.length, 0, "geserialiseerde gelijke-kleurrace maakte onverwachte quarantaine-evidence");
  const sameColorSourceConcurrency = {
    winnerJobId: winnerJob.id,
    winnerArtifactPath: winnerJob.snapshot.artifact.path,
    winnerArtifactSha256: winnerJob.snapshot.artifact.sha256,
    winnerIdempotencyIdentity: expectedWinnerIdentity,
    loserCode: raceLoser.reason.code,
    dbRecordDeltas: { jobs: 1, artifacts: 1, idempotency: 1 },
    visibleSvgArtifacts: 1,
    visibleReservations: 1,
    visibleCommitMarkers: 1,
    quarantineEntries: 0,
  };
  return { sameColorSourceConcurrency, workerCrashRecoveredWithoutOrphan, parentReservationCrashRecoveredWithoutOrphan };
  };
  const practiceRuns = [];
  let productionPreparationConcurrency = null;
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
    const productionArtifactsBefore = heightMm === 80 ? await productionArtifactInventory() : null;
    const productionStateBefore = heightMm === 80 ? await store.readSnapshot() : null;
    const firstPromise = service.createProductionJob(normalToken, normalSession.csrf, productionPayload, `${operationPrefix}-job`);
    if (heightMm === 80) {
      const workerDeadline = performance.now() + 5_000;
      while (productionJobBuildLoad().active !== 1 && performance.now() < workerDeadline) await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(productionJobBuildLoad().active, 1, "productionworker was niet actief voor de echte lane-isolatieproef");
      const concurrentOrderPayload = { orderKind: "CUSTOM", customer: "Geïsoleerde concurrentiefixture", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization, productionLines: [{ id: `line-${operationPrefix}-concurrent`, type: "INITIALS", content: "AA", previewLabel: "AA", widthMm: 50, heightMm: 30, quantity: 1, foilColor: "Wit", sourceId: font.id, provenance: "Real-MariaDB production-lane concurrencyfixture" }], items: [{ product: "Vrije opdruk concurrencyfixture", association: "Vrije bedrukking", size: "", quantity: 1, personalization: "AA", foilColor: "Wit", deviation: true, overrides: emptyPersonalization }] };
      const responseReady = new Promise((resolve) => { delayedMutationResponseReady = resolve; });
      const responseLossAbort = new AbortController();
      const ordinaryMutationStartedAt = performance.now();
      const responseLostRequest = fetch(`${origin}/api/sportpaleis/v1/orders`, { method: "POST", signal: responseLossAbort.signal, headers: { cookie: customerCookies[customerSessions.indexOf(normalSession)], "content-type": "application/json", "x-csrf-token": normalSession.csrf, "idempotency-key": `${operationPrefix}-concurrent-order`, "x-assurance-delay-response": "1" }, body: JSON.stringify(concurrentOrderPayload) });
      await responseReady;
      const ordinaryMutationWallMs = performance.now() - ordinaryMutationStartedAt;
      responseLossAbort.abort();
      await assert.rejects(responseLostRequest, (error) => error?.name === "AbortError", "response-lossfixture verloor de HTTP-response niet na servercommit");
      assert.ok(ordinaryMutationWallMs <= assuranceContract.limits.ordinaryMutationDuringProductionMaxMs, `gewone write bleef ${rounded(ordinaryMutationWallMs)} ms achter productievoorbereiding hangen`);
      assert.ok(productionJobBuildLoad().active === 1 || productionJobBuildLoad().queued > 0, "productievoorbereiding eindigde vóór de gewone write; de concurrencygrens is niet bewezen");
      const recoveredOrder = await service.createOrder(normalToken, normalSession.csrf, concurrentOrderPayload, `${operationPrefix}-concurrent-order`);
      assert.equal(recoveredOrder.duplicate, true, "response-lossretry was niet idempotent");
      const responseLostHistoryLength = (await store.readSnapshot()).orders.find(({ id }) => id === recoveredOrder.value.id).eventHistory.length;
      productionPreparationConcurrency = { ordinaryMutationWallMs: rounded(ordinaryMutationWallMs), productionStillActiveAfterMutation: true, concurrentOrderId: recoveredOrder.value.id, responseLostHistoryLength, httpResponseAbortedAfterServerCommit: true, responseLossRetryDuplicate: true };
    }
    const first = await firstPromise;
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
    const committedMarker = JSON.parse(await readFile(path.join(artifactRoot, `${first.value.snapshot.artifact.path}.committed.json`), "utf8"));
    assert.equal(committedMarker.status, "COMMITTED", `${heightMm} mm artifact mist de commitmarkering`);
    assert.equal(committedMarker.artifactSha256, artifactSha256, `${heightMm} mm commitmarkering wijkt af`);
    if (heightMm === 80) {
      const productionStateAfter = await store.readSnapshot();
      const productionArtifactsAfter = await productionArtifactInventory();
      const visibleAdded = productionArtifactsAfter.visible.filter((entry) => !productionArtifactsBefore.visible.includes(entry));
      const quarantineAdded = productionArtifactsAfter.quarantine.filter((entry) => !productionArtifactsBefore.quarantine.includes(entry));
      assert.equal(productionStateAfter.productionJobs.length, productionStateBefore.productionJobs.length + 1, "revisionretry maakte niet exact één PlotJob");
      assert.equal(productionStateAfter.orders.filter(({ id }) => id === productionPreparationConcurrency.concurrentOrderId).length, 1, "concurrentieproef maakte niet exact één order");
      assert.equal(productionStateAfter.orders.find(({ id }) => id === productionPreparationConcurrency.concurrentOrderId).eventHistory.length, productionPreparationConcurrency.responseLostHistoryLength, "response-lossretry dupliceerde orderhistorie");
      const concurrentOrderIdentity = `${normalUser.id}:CREATE_ORDER:${operationPrefix}-concurrent-order`;
      const concurrentOrderIdempotency = await pool.query("SELECT identity_key FROM sp_workspace_idempotency_record WHERE organization_id = ? AND identity_key = ?", [practiceBefore.organizationId, concurrentOrderIdentity]);
      assert.equal(concurrentOrderIdempotency.length, 1, "response-lossretry legde niet exact één order-idempotencyrecord vast");
      assert.equal(visibleAdded.filter((entry) => entry.endsWith("-production.svg")).length, 1, "revisionretry liet niet exact één zichtbare SVG achter");
      assert.ok(quarantineAdded.some((entry) => entry.endsWith("quarantine.json")), "stale artifactpoging werd niet immutable in quarantaine behouden");
      productionPreparationConcurrency = { ...productionPreparationConcurrency, plotJobDelta: 1, visibleSvgDelta: 1, concurrentOrderDelta: 1, concurrentOrderIdempotencyRecords: 1, concurrentOrderHistoryStable: true, quarantinedAttemptPreserved: true };
    }
    const beforeFixtureReject = await store.readSnapshot();
    const rejected = await service.rejectProductionJob(normalToken, normalSession.csrf, first.value.id, { reason: "ASSURANCE_FIXTURE_HEIGHT_SEQUENCE_RELEASE" });
    assert.equal(rejected.duplicate, false, `${heightMm} mm assurancefixture werd niet exact eenmaal reject-only afgesloten`);
    assert.equal(rejected.value.status, "REJECTED", `${heightMm} mm assurancefixture bleef de volgende fysieke stap blokkeren`);
    const afterFixtureReject = await store.readSnapshot();
    assert.equal(afterFixtureReject.nextProductionJobSequence, beforeFixtureReject.nextProductionJobSequence, `${heightMm} mm reject-only maakte een nieuwe jobsequence`);
    assert.equal(afterFixtureReject.productionJobs.length, beforeFixtureReject.productionJobs.length, `${heightMm} mm reject-only maakte een nieuwe PlotJob`);
    assert.deepEqual(await readFile(path.join(artifactRoot, first.value.snapshot.artifact.path)), artifactBytes, `${heightMm} mm reject-only wijzigde het immutable artifact`);
    practiceRuns.push({ heightMm, wallMs: rounded(wallMs), orderId: created.id, plotJobId: first.value.id, artifactSha256, committedMarker: true, generationMetrics: first.value.snapshot.generationMetrics });
  }
  const { sameColorSourceConcurrency, workerCrashRecoveredWithoutOrphan, parentReservationCrashRecoveredWithoutOrphan } = await runCrashAndChannelRace();
  const practiceAfter = await store.readSnapshot();
  for (const order of practiceAfter.orders) if (originalOrderHashes.has(order.id)) assert.equal(sha256CanonicalJson(order), originalOrderHashes.get(order.id), `bestaande order ${order.id} wijzigde door assurancefixture`);
  for (const job of practiceAfter.productionJobs) if (originalJobHashes.has(job.id)) assert.equal(sha256CanonicalJson(job), originalJobHashes.get(job.id), `bestaande PlotJob ${job.id} wijzigde door assurancefixture`);
  for (const proposal of practiceAfter.productionProposals) if (originalProposalHashes.has(proposal.id)) assert.equal(sha256CanonicalJson(proposal), originalProposalHashes.get(proposal.id), `bestaand voorstel ${proposal.id} wijzigde door assurancefixture`);
  assert.equal(practiceAfter.orders.length, practiceBefore.orders.length + practiceRuns.length + 3);
  assert.equal(practiceAfter.productionJobs.length, practiceBefore.productionJobs.length + practiceRuns.length + 1);
  assert.equal(practiceAfter.productionProposals.length, practiceBefore.productionProposals.length + practiceRuns.length + 1);
  const storeMetricsAfterPractice = store.metricsSnapshot();
  const productionBuildQueue = productionJobBuildLoad();
  assert.equal(storeMetricsAfterPractice.fullLegacyLoads, 0, "runtime-start mag de legacy monolith niet laden of backfillen");
  assert.ok(storeMetricsAfterPractice.recordWrites > 0 && storeMetricsAfterPractice.domainWrites > 0, "domeinrecordwrites zijn niet gebruikt");

  await enterLoadPhase("bounded-cache-reuse");
  const memoryCycles = [];
  let cacheReuse = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    cacheReuse = await Promise.all(allCookies.map((cookie, index) => request(bootstrapRoutes[index % bootstrapRoutes.length], cookie)));
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
  const restartedStore = new SportpaleisDomainMariaDbStore({ pool });
  await restartedStore.initialize();
  const restarted = await restartedStore.readSnapshot();
  assert.equal(restarted.revision, rollbackSource.revision, "restart verloor de domeinrevision");
  assert.deepEqual(businessHashes(restarted), businessHashes(rollbackSource), "restart wijzigde businessdata");

  const cpu = process.cpuUsage(cpuStart);
  const elapsedMs = performance.now() - wallStart;
  loop.disable(); clearInterval(poolSampler);
  assert.ok(statuses.every((status) => status === 200), "minstens één canaryroute faalde");
  const allMs = timings.map(({ ms }) => ms);
  const metricsFor = (entries) => ({ count: entries.length, p50Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.5)), p95Ms: rounded(percentile(entries.map(({ ms }) => ms), 0.95)), maxMs: rounded(Math.max(0, ...entries.map(({ ms }) => ms))), maxBytes: Math.max(0, ...entries.map(({ bytes }) => Number(bytes) || 0)) });
  const metrics = { ...metricsFor(timings), eventLoopP95Ms: rounded(loop.percentile(95) / 1e6), eventLoopMaxMs: rounded(loop.max / 1e6) };
  const bootstrapMetrics = metricsFor(timings.filter(({ route }) => route.startsWith("/api/sportpaleis/v1/bootstrap")));
  const steadyStateMemoryStable = memoryCycles.length === 3 && memoryCycles.at(-1) - memoryCycles[0] <= assuranceContract.limits.steadyStateRssGrowthBytes;
  const rssRecoveredWithinBudget = rssEndBytes - rssStartBytes <= rssRecoveryBudgetBytes && steadyStateMemoryStable;
  const limits = assuranceContract.limits;
  const soakCycleMetrics = soakCycles.map((cycle) => ({
    cycle: cycle.cycle,
    ...metricsFor(timings.slice(cycle.timingsStart, cycle.timingsEnd)),
    httpErrors: statuses.slice(cycle.statusesStart, cycle.statusesEnd).filter((status) => status >= 400).length,
    serverErrors: statuses.slice(cycle.statusesStart, cycle.statusesEnd).filter((status) => status >= 500).length,
    eventLoopMaxMs: rounded(phaseEventLoopMaxMs.get(cycle.phase) ?? 0),
    rssStartBytes: cycle.rssStartBytes,
    rssHighWaterBytes: cycle.rssHighWaterBytes,
    rssAfterRestBytes: cycle.rssAfterRestBytes,
  }));
  const recoveredRss = soakCycleMetrics.map(({ rssAfterRestBytes }) => rssAfterRestBytes);
  const rssPositiveSteps = recoveredRss.slice(1).map((value, index) => Math.max(0, value - recoveredRss[index]));
  const soakMemoryRecovered = soakCycleMetrics.every(({ rssAfterRestBytes, rssStartBytes: cycleStart }) => rssAfterRestBytes - cycleStart <= limits.rssRecoveryBudgetBytes)
    && Math.max(...recoveredRss) - Math.min(...recoveredRss) <= limits.soakRecoveredRssBandBytes;
  const soakMemoryTrendStable = recoveredRss.at(-1) - recoveredRss[0] <= limits.steadyStateRssGrowthBytes
    && Math.max(0, ...rssPositiveSteps) <= limits.soakMaximumPositiveRssStepBytes;
  const soakQueueStable = queueHighWater <= limits.databaseQueueHighWater;
  const multiCycleSoakCompleted = soakCycleMetrics.length === assuranceContract.minimumLoad.soakCycles
    && soakCycleMetrics.every(({ count, httpErrors, serverErrors, eventLoopMaxMs }) => count >= assuranceContract.minimumLoad.soakRevisionPollsPerCycle + assuranceContract.minimumLoad.soakLibraryPreviewsPerCycle + assuranceContract.minimumLoad.soakBootstrapsPerCycle && httpErrors === 0 && serverErrors === 0 && eventLoopMaxMs <= limits.eventLoopMaxMs);
  const productionBuildOffEventLoop = productionBuildQueue.active === 0 && productionBuildQueue.queued === 0 && productionBuildQueue.inFlight === 0 && productionBuildQueue.maximumConcurrent === limits.productionBuildMaximumConcurrent && productionBuildQueue.maximumQueued === limits.productionBuildMaximumQueued;
  const databaseConnectionReleasedDuringProductionBuild = storeMetricsAfterPractice.preparedMutations >= practiceRuns.length && storeMetricsAfterPractice.transactionHoldMsMax <= limits.databaseTransactionHoldMaxMs;
  const productionPreparationDoesNotBlockMutations = productionPreparationConcurrency?.productionStillActiveAfterMutation === true && productionPreparationConcurrency?.httpResponseAbortedAfterServerCommit === true && productionPreparationConcurrency?.responseLossRetryDuplicate === true && productionPreparationConcurrency?.concurrentOrderDelta === 1 && productionPreparationConcurrency?.concurrentOrderIdempotencyRecords === 1 && productionPreparationConcurrency?.concurrentOrderHistoryStable === true && productionPreparationConcurrency?.plotJobDelta === 1 && productionPreparationConcurrency?.visibleSvgDelta === 1 && productionPreparationConcurrency?.quarantinedAttemptPreserved === true && productionPreparationConcurrency?.ordinaryMutationWallMs <= limits.ordinaryMutationDuringProductionMaxMs;
  const bootstrapSurfaceBytes = Object.fromEntries(assuranceContract.minimumLoad.bootstrapSurfaces.map((surface) => [surface, metricsFor(timings.filter(({ route }) => route === `/api/sportpaleis/v1/bootstrap?surface=${surface}`)).maxBytes]));
  const emptyFieldBytes = (surface, field) => Number(bootstrapFieldBytes[surface]?.[field]) <= 2;
  const scopedBootstrapPayloads = assuranceContract.minimumLoad.bootstrapSurfaces.every((surface) => bootstrapSurfaceBytes[surface] > 0 && bootstrapSurfaceBytes[surface] <= limits.bootstrapSurfaceMaxBytes[surface])
    && emptyFieldBytes("overview", "productionJobs") && emptyFieldBytes("overview", "teamkitProposals")
    && emptyFieldBytes("orders", "productionJobs") && emptyFieldBytes("orders", "teamkitProposals")
    && emptyFieldBytes("production", "teamkitProposals")
    && emptyFieldBytes("library", "orders") && emptyFieldBytes("library", "productionJobs") && emptyFieldBytes("library", "teamkitProposals")
    && emptyFieldBytes("teamwear", "orders") && emptyFieldBytes("teamwear", "productionJobs");
  const thresholdsPassed = metrics.p95Ms <= limits.allRoutesP95Ms && metrics.maxMs <= limits.allRoutesMaxMs && bootstrapMetrics.p95Ms <= limits.bootstrapP95Ms && bootstrapMetrics.maxMs <= limits.bootstrapMaxMs && scopedBootstrapPayloads && metrics.eventLoopP95Ms <= limits.eventLoopP95Ms && metrics.eventLoopMaxMs <= limits.eventLoopMaxMs && rssHighWater <= limits.rssHighWaterBytes && rssRecoveredWithinBudget && practiceRuns.every(({ wallMs }) => wallMs <= 15_000) && productionBuildOffEventLoop && databaseConnectionReleasedDuringProductionBuild && productionPreparationDoesNotBlockMutations && multiCycleSoakCompleted && soakMemoryRecovered && soakMemoryTrendStable && soakQueueStable;
  const result = {
    schemaVersion: 4,
    status: thresholdsPassed ? "PASS" : "FAIL", releaseId,
    identity: { candidateCommit, candidateArtifactSha256, restoreBackupSha256, assuranceEntrypointSha256, assuranceContractSha256, assuranceContract: assuranceContract.contractId, regressionContractSha256, regressionContract: regressionContract.contractId },
    restoredState: { revisionBeforeReads: beforeRevision, revisionAfterReads: afterReads.revision, stateBytes: Number(beforeRow.bytes), auditBefore: beforeAudit, auditAfterReads: afterReads.audit.length },
    load: { requests: statuses.length, httpErrors: statuses.filter((status) => status >= 400).length, serverErrors: statuses.filter((status) => status >= 500).length, concurrencyModel: { productionCustomerSeats, concurrentReviewPrincipals, concurrentFullBootstraps, concurrentRevisionPolls, heldPoolConnections: blockers.length }, p50Ms: metrics.p50Ms, p95Ms: metrics.p95Ms, maxMs: metrics.maxMs, bootstrapSurfaceBytes, bootstrapFieldBytes, byPhase: Object.fromEntries([...new Set(timings.map(({ phase }) => phase))].map((phase) => [phase, metricsFor(timings.filter((entry) => entry.phase === phase))])), byRoute: { ...Object.fromEntries([...new Set(timings.map(({ route }) => route))].map((route) => [route, metricsFor(timings.filter((entry) => entry.route === route))])), "/api/sportpaleis/v1/bootstrap": bootstrapMetrics } },
    pool: { connectionLimit: 8, activeHighWater, idleLowWater, queueHighWater, acquireTimeouts: handlerErrors.filter(({ error }) => error?.code === "DATABASE_CONNECTION_FAILED" && error?.cause?.code === "ER_GET_CONNECTION_TIMEOUT").length },
    runtime: { elapsedMs: rounded(elapsedMs), eventLoopP95Ms: metrics.eventLoopP95Ms, eventLoopMaxMs: metrics.eventLoopMaxMs, eventLoopMaxMsByPhase: Object.fromEntries([...phaseEventLoopMaxMs].map(([phase, value]) => [phase, rounded(value)])), rssStartBytes, rssHighWaterBytes: rssHighWater, rssEndBytes, rssRecoveryBudgetBytes, rssRecoveredWithinBudget, steadyStateMemoryStable, memoryCycles, soakCycles: soakCycleMetrics, soakMemoryRecovered, soakMemoryTrendStable, rssPositiveSteps, cpuUserMs: rounded(cpu.user / 1000), cpuSystemMs: rounded(cpu.system / 1000) },
    persistence: { offlineBackfill: backfillEvidence, store: storeMetricsAfterPractice, rollbackProof },
    practice: { largeFreeProduction: practiceRuns, sameColorSourceConcurrency, productionBuildQueue, productionPreparationConcurrency, mutationLane, mariaDbMultiBatch },
    invariants: { authenticatedRoutes: true, readRevisionStable: true, readAuditStable: true, legacyStateWriteStable: true, businessHashesStable: true, domainRecordWritesIncremental: true, runtimeInitializationReadOnly: storeMetricsAfterPractice.fullLegacyLoads === 0, cacheInvalidationExact: true, interruptedRetryRecovered: true, normalAndReviewAuth: true, expiredAndRevokedSessions: true, previewFanoutBounded: true, bootstrapCacheBounded: rssRecoveredWithinBudget, coldAndWarmBootstrap: coldCache.entries === 1, scopedBootstrapPayloads, largeFreeProduction80Mm: practiceRuns.some(({ heightMm }) => heightMm === 80), largeFreeProduction200Mm: practiceRuns.some(({ heightMm }) => heightMm === 200), sameColorSourceConcurrency: true, workerCrashRecoveredWithoutOrphan, parentReservationCrashRecoveredWithoutOrphan, productionIdempotency: true, artifactIdentity: true, productionArtifactReconciliation: practiceRuns.every(({ committedMarker }) => committedMarker === true), managedFoilColorsComplete: activeFoilColors.length >= 6, boundedSvgProcessing: true, staleReadsPrevented: true, transactionRollbackProven: true, restartRecovery: true, productionBuildOffEventLoop, databaseConnectionReleasedDuringProductionBuild, productionPreparationDoesNotBlockMutations, mutationLaneBounded: mutationLane.activeHighWater === 1 && mutationLane.queueDepthAfter === 0 && mutationLane.backpressureRejects === 0, mariaDbMultiBatchRollback: mariaDbMultiBatch.rollbackAndRestartHashEqual && mariaDbMultiBatch.retryExactlyOnce && mariaDbMultiBatch.cleanupHashEqual, tenantAndScopeIsolation: true, rollbackMaterializationProven: true, multiCycleSoakCompleted, soakMemoryRecovered, soakMemoryTrendStable, soakQueueStable, noLegacyMonolithLoads: storeMetricsAfterPractice.fullLegacyLoads === 0 },
    businessHashes: beforeBusiness,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
