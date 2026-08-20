import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertCapabilityMaturityTransition,
  classifyActionPolicy,
  createInitialAtlasControlPlane,
  ingestConnectorSnapshot,
  projectOwnerAtlasWorkspace,
  resolveAttention,
  searchOwnerReality,
  validateAtlasControlPlane,
} from "../scripts/wbd-atlas-control-plane.mjs";
import {
  fetchWbdHomepageSnapshot,
  parseWbdHomepageMetadata,
} from "../scripts/wbd-homepage-live-connector.mjs";
import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import { WBD_CAPABILITY_SEED } from "../scripts/wbd-capability-catalog.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
  validateWbdOwnerState,
} from "../scripts/wbd-owner-foundation.mjs";

const now = new Date("2026-08-20T12:00:00.000Z");
const html = (description) => `<!doctype html><html><head><title>We Build And Design — Eerst begrijpen</title><meta name="description" content="${description}"><meta property="og:title" content="We Build And Design"><meta property="og:description" content="${description}"><link rel="canonical" href="https://webuildanddesign.nl/"></head><body></body></html>`;
const response = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

async function ownerFixture(context) {
  const passwordRecord = await createWorkspacePasswordRecord("WBD-Atlas-Control-Plane-Test-001!");
  let state = createInitialWbdOwnerState({ passwordRecord, now });
  const store = {
    async initialize() {},
    async read() { return structuredClone(state); },
    async mutate(mutator) {
      const result = await mutator(structuredClone(state));
      result.state.revision = state.revision + 1;
      state = validateWbdOwnerState(result.state);
      return { state: structuredClone(state), value: structuredClone(result.value) };
    },
    async storageStatus() { return { engine: "memory-test" }; },
    async close() {},
  };
  const service = new WbdOwnerService({ store, releaseId: "atlas-control-plane-test", allowedOrigin: "http://127.0.0.1", sessionTtlMs: 60 * 60 * 1_000 });
  await service.initialize();
  const login = await service.login({ email: "donovanweide@gmail.com", password: "WBD-Atlas-Control-Plane-Test-001!", remoteAddress: "desktop", now });
  context.after(() => store.close());
  return { service, store, login };
}

test("autonomy policy laat observeren, analyseren en voorbereiden vrij en faalt onbekende uitvoering gesloten", () => {
  assert.deepEqual(classifyActionPolicy("FETCH"), { stage: "OBSERVE", goRequirement: "NONE", reason: "Autonome analyse binnen geautoriseerde bronnen." });
  assert.equal(classifyActionPolicy("PREPARE").goRequirement, "NONE");
  assert.equal(classifyActionPolicy("DEPLOYMENT").goRequirement, "REQUIRED");
  assert.equal(classifyActionPolicy("unclassified-external-action").goRequirement, "FAIL_CLOSED");
});

test("capability maturity kan code niet stil als bewezen of herbruikbaar promoveren", () => {
  assert.throws(() => assertCapabilityMaturityTransition({ from: "BUILT", to: "PROVEN", evidenceRefs: ["evidence-1"], humanApproved: true }), /overslaan/);
  assert.throws(() => assertCapabilityMaturityTransition({ from: "FIRST_REAL_USE", to: "PROVEN", evidenceRefs: [], humanApproved: true }), /evidence/);
  assert.throws(() => assertCapabilityMaturityTransition({ from: "FIRST_REAL_USE", to: "PROVEN", evidenceRefs: ["evidence-1"] }), /menselijke/);
  assert.equal(assertCapabilityMaturityTransition({ from: "FIRST_REAL_USE", to: "PROVEN", evidenceRefs: ["evidence-1"], humanApproved: true }).to, "PROVEN");
});

test("homepage normalizer bewaart alleen vijf toegestane velden en weigert ambigue brondata", () => {
  assert.deepEqual(Object.keys(parseWbdHomepageMetadata(html("Een betrouwbare beschrijving."))), ["title", "description", "openGraphTitle", "openGraphDescription", "canonicalUrl"]);
  assert.throws(() => parseWbdHomepageMetadata(html("A").replace("</head>", '<meta name="description" content="B"></head>')), /exact één/);
});

test("source → fetch → normalize → provenance → evidence → Attention → NBA → prepared action is autonoom", async () => {
  const baseline = await fetchWbdHomepageSnapshot({ fetcher: async () => response(html("Eerste betrouwbare beschrijving.")), now: () => now, sleeper: async () => {} });
  assert.equal(baseline.status, "SUCCEEDED");
  assert.equal(baseline.authorizationStatus, "NOT_REQUIRED");
  assert.equal(baseline.changedFields.length, 0);

  const changed = await fetchWbdHomepageSnapshot({ previousState: baseline, fetcher: async () => response(html("Nieuwe actuele positionering.")), now: () => new Date("2026-08-20T12:05:00.000Z"), sleeper: async () => {} });
  assert.equal(changed.changedFields.length, 2);
  assert.equal(changed.provenance.fetchedVia, "SERVER_SIDE_HTTPS");
  let plane = createInitialAtlasControlPlane({ capabilities: WBD_CAPABILITY_SEED, now });
  plane = ingestConnectorSnapshot(plane, baseline, now);
  plane = ingestConnectorSnapshot(plane, changed, new Date("2026-08-20T12:05:00.000Z"));
  const productLearning = plane.attention.find(({ type }) => type === "PRODUCT_LEARNING");
  assert.equal(productLearning?.status, "OPEN");
  assert.equal(plane.attention.find(({ type }) => type === "TECHNICAL_VERIFICATION")?.status, "RESOLVED");
  assert.equal(plane.nextBestActions.filter(({ attentionId }) => attentionId === productLearning.id).length, 1);
  assert.equal(plane.preparedActions.length, 1);
  assert.equal(plane.nextBestActions.find(({ attentionId }) => attentionId === productLearning.id)?.goRequirement, "NONE");
  assert.ok(plane.audit.some(({ eventType }) => eventType === "EVIDENCE_INGESTED"));

  const duplicate = ingestConnectorSnapshot(plane, changed, new Date("2026-08-20T12:06:00.000Z"));
  assert.equal(duplicate.attention.length, 2);
  assert.equal(duplicate.attention.find(({ id }) => id === productLearning.id)?.occurrenceCount, 1);
  assert.equal(duplicate.evidence.length, plane.evidence.length);
});

test("eerste stabiele live read maakt autonome technische verificatie en een tweede read sluit die af", async () => {
  const baseline = await fetchWbdHomepageSnapshot({ fetcher: async () => response(html("Stabiele live staat.")), now: () => now, sleeper: async () => {} });
  let plane = ingestConnectorSnapshot(createInitialAtlasControlPlane({ capabilities: [], now }), baseline, now);
  const activation = plane.attention.find(({ situationKey }) => situationKey === "connector-activation:wbd-homepage-metadata");
  assert.equal(activation?.type, "TECHNICAL_VERIFICATION");
  assert.equal(activation?.goRequirement, "NONE");
  assert.equal(plane.nextBestActions.find(({ attentionId }) => attentionId === activation.id)?.estimatedHumanEffortMinutes, 0);
  const repeated = await fetchWbdHomepageSnapshot({ previousState: baseline, fetcher: async () => response(html("Stabiele live staat.")), now: () => new Date("2026-08-20T12:15:00.000Z"), sleeper: async () => {} });
  plane = ingestConnectorSnapshot(plane, repeated, new Date("2026-08-20T12:15:00.000Z"));
  assert.equal(plane.attention.find(({ id }) => id === activation.id)?.status, "RESOLVED");
  assert.ok(plane.audit.some(({ eventType, details }) => eventType === "ATTENTION_RESOLVED" && details.reason === "CONNECTOR_STABILITY_CONFIRMED"));
});

test("tijdelijke source failure retryt, bewaart last-known-good en groepeert structurele failure", async () => {
  let attempts = 0;
  const recovered = await fetchWbdHomepageSnapshot({ fetcher: async () => { attempts += 1; if (attempts < 3) throw Object.assign(new Error("tijdelijk"), { retryable: true }); return response(html("Hersteld.")); }, now: () => now, sleeper: async () => {} });
  assert.equal(recovered.status, "SUCCEEDED");
  assert.equal(recovered.attemptCount, 3);

  let plane = createInitialAtlasControlPlane({ capabilities: [], now });
  plane = ingestConnectorSnapshot(plane, recovered, now);
  let failed = recovered;
  for (let count = 1; count <= 4; count += 1) {
    failed = await fetchWbdHomepageSnapshot({ previousState: failed, fetcher: async () => response("unavailable", 503), now: () => new Date(`2026-08-20T12:0${count}:00.000Z`), sleeper: async () => {} });
    plane = ingestConnectorSnapshot(plane, failed, new Date(`2026-08-20T12:0${count}:00.000Z`));
  }
  assert.equal(failed.freshness, "STALE");
  assert.equal(failed.normalizedHash, recovered.normalizedHash);
  const failures = plane.attention.filter(({ situationKey }) => situationKey.startsWith("connector-failure:"));
  assert.equal(failures.length, 1);
  assert.equal(failures[0].occurrenceCount, 2);
  assert.equal(plane.nextBestActions.find(({ attentionId }) => attentionId === failures[0].id).estimatedHumanEffortMinutes, 0);
});

test("resolution bewaart oorzaak/outcome en maakt traceerbare Harvest candidate zonder automatische productclaim", async () => {
  const baseline = await fetchWbdHomepageSnapshot({ fetcher: async () => response(html("Voor.")), now: () => now, sleeper: async () => {} });
  const changed = await fetchWbdHomepageSnapshot({ previousState: baseline, fetcher: async () => response(html("Na.")), now: () => now, sleeper: async () => {} });
  let plane = ingestConnectorSnapshot(createInitialAtlasControlPlane({ now }), changed, now);
  plane = resolveAttention(plane, plane.attention[0].id, { summary: "Positionering gecontroleerd.", cause: "Bewuste copywijziging", outcome: "Past bij propositie", scopeClass: "GENERIC_WITH_CONFIGURATION" }, "wbd-owner-donovan", now);
  assert.equal(plane.attention[0].status, "RESOLVED");
  assert.equal(plane.harvestCandidates[0].status, "CANDIDATE");
  assert.equal(plane.harvestCandidates[0].promotionRequiresHumanDecision, true);
});

test("Owner-service toont dezelfde centrale Atlas-waarheid op desktop en iPhone en Search vindt inhoud", async (context) => {
  const { service, login } = await ownerFixture(context);
  const baseline = await fetchWbdHomepageSnapshot({ fetcher: async () => response(html("Eerste live staat.")), now: () => now, sleeper: async () => {} });
  const changed = await fetchWbdHomepageSnapshot({ previousState: baseline, fetcher: async () => response(html("Tweede live staat.")), now: () => now, sleeper: async () => {} });
  await service.ingestConnectorSnapshot(baseline, now);
  await service.ingestConnectorSnapshot(changed, now);
  const mobile = await service.login({ email: "donovanweide@gmail.com", password: "WBD-Atlas-Control-Plane-Test-001!", deviceMode: "PERSONAL", remoteAddress: "iphone", now });
  const desktopView = await service.atlasWorkspace(login.token, now);
  const mobileView = await service.atlasWorkspace(mobile.token, now);
  assert.deepEqual(mobileView, desktopView);
  assert.equal(desktopView.importantNow.length, 1);
  assert.ok(desktopView.capabilityRegistry.find(({ id }) => id === "connectors-snapshot-diff").evidenceRefs.length > 0);
  const search = await service.search(login.token, "homepage positionering", now);
  assert.ok(search.results.some(({ type }) => type === "ATTENTION"));
  const goSearch = await service.search(login.token, "wat vraagt mijn GO?", now);
  assert.ok(goSearch.results.some(({ type, title }) => type === "HUMAN_GO" && title === "Bij Cees"));
});

test("bestaande owner-state migreert additief en repeatable zonder lokale/browserdata te verzinnen", async () => {
  const passwordRecord = await createWorkspacePasswordRecord("WBD-Atlas-Migration-Test-001!");
  const old = createInitialWbdOwnerState({ passwordRecord, now });
  delete old.atlasControlPlane;
  old.boundaries.unknownRollbackMetadata = { preserved: true };
  const migrated = validateWbdOwnerState(old);
  const repeated = validateWbdOwnerState(migrated);
  assert.deepEqual(repeated, migrated);
  assert.deepEqual(repeated.boundaries.unknownRollbackMetadata, { preserved: true });
  assert.equal(repeated.controlPlane.organizations[0].id, "we-build-and-design");
  assert.ok(repeated.atlasControlPlane.evidence.length > 0);
  assert.deepEqual(repeated.atlasControlPlane.connectorStates, {});
  assert.ok(repeated.atlasControlPlane.evidence.every(({ sourceType }) => sourceType === "REPOSITORY_EVIDENCE"));
});

test("projection en Search blijven snel op production-shaped centrale datasets", () => {
  const plane = createInitialAtlasControlPlane({ capabilities: WBD_CAPABILITY_SEED, now });
  const baseEvidence = plane.evidence[0];
  for (let index = 0; index < 2_000; index += 1) plane.evidence.push({ ...structuredClone(baseEvidence), id: `perf-evidence-${index}`, normalized: { summary: `Performance evidence ${index}` }, fetchedAt: new Date(now.getTime() - index * 1_000).toISOString() });
  const started = performance.now();
  const view = projectOwnerAtlasWorkspace(plane, { controlPlane: { organizations: [], ownerActions: [] }, capabilities: WBD_CAPABILITY_SEED, releaseId: "perf", revision: 1, now });
  const search = searchOwnerReality(plane, { query: "Performance evidence 1999", controlPlane: { organizations: [] }, capabilities: WBD_CAPABILITY_SEED, now });
  const elapsed = performance.now() - started;
  assert.ok(view.evidence.length > 2_000);
  assert.ok(search.total > 0);
  assert.ok(elapsed < 500, `projectie duurde ${elapsed.toFixed(1)} ms`);
});

test("UI is werkgericht, progressive en mobile-first zonder fake AI-claim", async () => {
  const [owner, atlasUi, css, runtime] = await Promise.all([
    readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-atlas-owner.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8"),
    readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8"),
  ]);
  for (const marker of ["Today", "Attention", "Organisaties", "Search", "Capabilities"]) assert.match(owner, new RegExp(marker));
  for (const marker of ["Sinds je laatste bezoek", "Atlas heeft onderzocht", "Beslissing nodig", "Kan wachten", "Waarom zegt Atlas dit?", "Next Best Action"]) assert.match(atlasUi, new RegExp(marker));
  assert.match(css, /@media \(max-width:520px\)/u);
  assert.match(runtime, /WbdHomepageConnectorScheduler/u);
  assert.doesNotMatch(atlasUi, /AI heeft bepaald|autonoom uitgevoerd in productie/iu);
});
