import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";
import { WBD_CAPABILITY_SEED } from "../scripts/wbd-capability-catalog.mjs";
import {
  createInitialAtlasControlPlane,
  ingestProductTruthEvents,
  projectOwnerAtlasWorkspace,
  searchOwnerReality,
} from "../scripts/wbd-atlas-control-plane.mjs";
import {
  createInitialProductTruth,
  projectProductTruth,
  synchronizeProductTruth,
  validateProductTruth,
  wbdProductTruthContract,
} from "../scripts/wbd-product-truth.mjs";
import { WbdOwnerFileStore, WbdOwnerService, createInitialWbdOwnerState } from "../scripts/wbd-owner-foundation.mjs";

const now = new Date("2026-08-25T01:00:00.000Z");
const password = "WBD-Product-Truth-Test-2026!";
const manifest = (releaseId, commit, files) => ({
  schemaVersion: 2,
  releaseId,
  commit,
  tag: releaseId,
  sourceDate: "2026-08-25",
  baseFreeze: { tag: "BASE", commit: "a".repeat(40) },
  files,
});

test("Product Truth valideert lifecycle, roadmap en definitieve-prijsboundary", () => {
  const truth = createInitialProductTruth({ now });
  assert.equal(truth.organizationId, "we-build-and-design");
  assert.deepEqual(wbdProductTruthContract.maturity, ["CONCEPT", "BUILT", "FIRST_REAL_USE", "PROVEN", "REUSABLE"]);
  assert.ok(truth.modules.some(({ id, roadmap }) => id === "inventory" && roadmap === "LATER"));
  assert.ok(truth.modules.some(({ id, maturity }) => id === "workspace-core" && maturity === "FIRST_REAL_USE"));
  const founding = truth.pricing.find(({ id }) => id === "pricing-workspace-basis-founding-context");
  assert.equal(founding.status, "HYPOTHESIS");
  assert.equal(founding.monthly, 75);
  assert.match(founding.summary, /geen gevalideerde generieke marktprijs/u);
  assert.equal(founding.history[0].status, "HYPOTHESIS");
  assert.ok(truth.customerProof.some(({ organizationId, scopeClass, privacy }) => organizationId === "sportpaleis" && scopeClass === "CUSTOMER_SPECIFIC" && privacy === "PRIVATE_SUMMARY_ONLY"));
  assert.ok(truth.customerProof.some(({ organizationId, scopeClass }) => organizationId === "aquaflask" && scopeClass === "GENERIC_WITH_CONFIGURATION"));
  assert.ok(truth.customerProof.every(({ evidenceRefs }) => evidenceRefs.length > 0));
  const invalid = structuredClone(truth);
  invalid.pricing[0].status = "DEFINITIVE";
  assert.throws(() => validateProductTruth(invalid), /menselijke goedkeuring/u);
});

test("immutable releases worden gededupliceerd en maken traceerbare Harvest candidates", () => {
  let truth = createInitialProductTruth({ now });
  const firstManifest = manifest("RELEASE-001", "1".repeat(40), [
    { path: "app/scripts/workspace-runtime.mjs", sha256: "a".repeat(64) },
    { path: "app/src/sportpaleis/quick-production-intake.mjs", sha256: "b".repeat(64) },
  ]);
  const first = synchronizeProductTruth(truth, { capabilities: WBD_CAPABILITY_SEED, releaseManifest: firstManifest, now });
  truth = first.truth;
  assert.equal(first.events.length, 1);
  assert.equal(truth.releases.length, 1);
  assert.equal(truth.harvestCandidates.length, 1);
  assert.equal(truth.releases[0].inferenceConfidence, "LOW");
  assert.ok(truth.releases[0].moduleIds.includes("production"));
  assert.ok(truth.releases[0].capabilityIds.includes("production-quick-intake"));

  const duplicate = synchronizeProductTruth(truth, { capabilities: WBD_CAPABILITY_SEED, releaseManifest: firstManifest, now: new Date("2026-08-25T01:05:00.000Z") });
  assert.equal(duplicate.events.length, 0);
  assert.equal(duplicate.truth.releases.length, 1);
  assert.equal(duplicate.truth.harvestCandidates.length, 1);

  const secondManifest = manifest("RELEASE-002", "2".repeat(40), [
    { path: "app/scripts/workspace-runtime.mjs", sha256: "c".repeat(64) },
    { path: "app/src/sportpaleis/quick-production-intake.mjs", sha256: "b".repeat(64) },
  ]);
  const second = synchronizeProductTruth(duplicate.truth, { capabilities: WBD_CAPABILITY_SEED, releaseManifest: secondManifest, now: new Date("2026-08-25T02:00:00.000Z") });
  assert.equal(second.events.length, 1);
  assert.equal(second.truth.releases.at(-1).inferenceConfidence, "MEDIUM");
  assert.deepEqual(second.truth.releases.at(-1).changedComponentIds, ["OWNER_CONTROL"]);
});

test("release evidence projecteert autonoom naar Evidence, Attention, NBA, Harvest en Human GO", () => {
  const truthResult = synchronizeProductTruth(createInitialProductTruth({ now }), {
    capabilities: WBD_CAPABILITY_SEED,
    releaseManifest: manifest("RELEASE-OWNER", "3".repeat(40), [{ path: "app/scripts/wbd-product-truth.mjs", sha256: "d".repeat(64) }]),
    now,
  });
  let atlas = createInitialAtlasControlPlane({ capabilities: WBD_CAPABILITY_SEED, now: new Date("2026-08-20T01:00:00.000Z") });
  atlas = ingestProductTruthEvents(atlas, { events: truthResult.events, issues: truthResult.truth.issues }, now);
  assert.ok(atlas.evidence.some(({ sourceType }) => sourceType === "IMMUTABLE_RELEASE"));
  assert.ok(atlas.attention.some(({ situationKey }) => situationKey === "release-harvest:RELEASE-OWNER"));
  assert.ok(atlas.nextBestActions.some(({ goRequirement }) => goRequirement === "NONE"));
  assert.ok(atlas.harvestCandidates.some(({ candidateType }) => candidateType === "RELEASE_PRODUCT_TRUTH"));
  const pricingAttention = atlas.attention.find(({ situationKey }) => situationKey === "product-truth-issue:issue-workspace-market-price");
  assert.equal(pricingAttention.goRequirement, "REQUIRED");
  assert.ok(atlas.preparedActions.some(({ attentionId, executionPolicy }) => attentionId === pricingAttention.id && executionPolicy === "PREPARE_ONLY"));

  const productTruthView = projectProductTruth(truthResult.truth, { capabilities: WBD_CAPABILITY_SEED, now });
  assert.ok(productTruthView.customerProof.some(({ organizationId }) => organizationId === "sportpaleis"));
  const owner = projectOwnerAtlasWorkspace(atlas, { capabilities: WBD_CAPABILITY_SEED, productTruthView, releaseId: "RELEASE-OWNER", revision: 2, now });
  assert.ok(owner.sinceLastVisit.some(({ sourceType }) => sourceType === "IMMUTABLE_RELEASE"));
  assert.ok(owner.decisionsNeeded.some(({ title }) => /prijs/u.test(title)));
  assert.equal(owner.productTruth.releases[0].id, "RELEASE-OWNER");

  const search = searchOwnerReality(atlas, { query: "release owner product", capabilities: WBD_CAPABILITY_SEED, productTruthView, now });
  assert.ok(search.results.some(({ type }) => type === "RELEASE"));
  assert.ok(search.scope.includes("product-modules"));
});

test("Owner-service bootstrapt Product Truth centraal zonder bestaande capabilityrecords te overschrijven", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "wbd-product-truth-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwordRecord = await createWorkspacePasswordRecord(password);
  const store = new WbdOwnerFileStore({ filePath: path.join(root, "state.json"), bootstrap: async () => {
    const state = createInitialWbdOwnerState({ passwordRecord, now });
    state.capabilities = state.capabilities.filter(({ id }) => !new Set(["owner-product-truth", "release-harvest-ingestion"]).has(id));
    state.capabilities.find(({ id }) => id === "commerce-managed-care").guidance = "Bestaande ownerduiding blijft behouden.";
    delete state.productTruth;
    return state;
  } });
  const releaseManifest = manifest("RELEASE-CENTRAL", "4".repeat(40), [{ path: "app/scripts/wbd-product-truth.mjs", sha256: "e".repeat(64) }]);
  const service = new WbdOwnerService({ store, releaseId: "RELEASE-CENTRAL", releaseManifest, allowedOrigin: "http://127.0.0.1" });
  await service.initialize();
  const login = await service.login({ email: "donovanweide@gmail.com", password, remoteAddress: "test" });
  const catalog = await service.capabilityCatalog(login.token);
  assert.ok(catalog.capabilities.some(({ id }) => id === "owner-product-truth"));
  assert.equal(catalog.capabilities.find(({ id }) => id === "commerce-managed-care").guidance, "Bestaande ownerduiding blijft behouden.");
  assert.equal(catalog.productTruth.releases[0].id, "RELEASE-CENTRAL");
  assert.ok((await service.atlasWorkspace(login.token)).decisionsNeeded.some(({ title }) => title === "Definitieve Workspace-prijs ontbreekt"));
  const truth = await service.productTruth(login.token);
  assert.equal(truth.source, "central-wbd-owner-state");
  assert.ok(truth.sourceCoverage.some(({ sourceId, status }) => sourceId === "teamkit" && status === "NEEDS_OWNER_CONFIRMATION"));
});

test("Product Truth en mobile readability blijven tenant-safe en presentatiegericht", async () => {
  const moduleSource = await readFile(new URL("../scripts/wbd-product-truth.mjs", import.meta.url), "utf8");
  const ownerSource = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8");
  assert.doesNotMatch(moduleSource, /password|secret|cookie|private[_-]?key/iu);
  assert.match(moduleSource, /CUSTOMER_SPECIFIC/);
  assert.match(moduleSource, /NEEDS_OWNER_CONFIRMATION/);
  assert.match(ownerSource, /Prijsindicatie · nog niet definitief/);
  assert.match(css, /@media \(max-width:840px\)[\s\S]*font-size:1rem/);
  assert.match(css, /padding-bottom:calc\(3\.5rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(css, /bottom-navigation|wbd-owner-bottom-nav/u);
});
