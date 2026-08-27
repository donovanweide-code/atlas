import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService, setSportpaleisTeamwearPilotExposure } from "../scripts/sportpaleis-pilot-foundation.mjs";
import {
  buildTeamwearComposition,
  buildTeamwearAssetLibrary,
  buildTeamwearCatalog,
  buildTeamwearRelationships,
  catalogScaleProbe,
  queryTeamwearCatalog,
  resolveTeamwearPrice,
  teamwearContextArticles,
  teamwearContextProductionAssets,
  teamwearTeamorderHandoff,
  teamwearSquareProductRenderSpec,
} from "../src/sportpaleis-teamwear-foundations.ts";

const passwords = { kevin: "Teamwear-Kevin!", patrick: "Teamwear-Patrick!", collega: "Teamwear-Store!", "donovan-support": "Teamwear-Support!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-teamwear-convergence-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { state: await service.bootstrap(admin.token), service, admin };
}

test("centrale Teamwear-catalogus bundelt merken, varianten en bounded discovery", async (context) => {
  const { state } = await fixture(context);
  const catalog = buildTeamwearCatalog(state);
  assert.ok(catalog.length > 6);
  assert.deepEqual(new Set(catalog.slice(0, 6).map(({ brand }) => brand)), new Set(["Stanno", "Nike", "adidas", "JAKO", "Robey"]));
  assert.ok(catalog.every(({ variants }) => variants.length > 0 && variants.every(({ availableSizes, media }) => availableSizes.length > 0 && media.some(({ kind }) => kind === "FRONT"))));
  const men = queryTeamwearCatalog(catalog, { audience: "MEN", limit: 48 }).products.map(({ id }) => id);
  const women = queryTeamwearCatalog(catalog, { audience: "WOMEN", limit: 48 }).products.map(({ id }) => id);
  const unisex = catalog.filter(({ audiences }) => audiences.includes("UNISEX")).map(({ id }) => id);
  assert.ok(unisex.some((id) => men.includes(id) && women.includes(id)), "unisex is discoverable for both men and women without duplicating records");
  const bounded = queryTeamwearCatalog(catalog, { limit: 10_000 });
  assert.equal(bounded.bounded, true);
  assert.ok(bounded.products.length <= 48);
  const scale = catalogScaleProbe(catalog, 5_200);
  assert.equal(scale.total, 5_200);
  assert.ok(scale.products.length <= 24);
});

test("pricing-policy invents no discount without an authoritative policy", async (context) => {
  const { state } = await fixture(context);
  const product = buildTeamwearCatalog(state).find(({ supplierArticleNumber }) => supplierArticleNumber === "BV6708");
  assert.ok(product);
  const base = resolveTeamwearPrice(product, 10);
  assert.deepEqual({ label: base.label, minimumQuantity: base.minimumQuantity, effectivePriceEur: base.effectivePriceEur }, { label: null, minimumQuantity: null, effectivePriceEur: null });
  assert.equal(base.advicePriceEur, 24.99);
  const customer = resolveTeamwearPrice(product, 10, "association:asc-waterwijk");
  assert.equal(customer.label, null);
  assert.equal(customer.relationshipOverrideApplied, false);
  assert.equal(customer.policyRef, null);
  assert.equal(customer.effectivePriceEur, null);
  assert.ok(!JSON.stringify(customer).match(/inkoop|marge/iu));
});

test("Relationship Context en centrale Asset Library projecteren bestaande foundations zonder modulekopieën", async (context) => {
  const { state } = await fixture(context);
  const relationships = buildTeamwearRelationships(state);
  assert.ok(relationships.some(({ searchableTerms }) => searchableTerms.includes("Stanno Deventrade")));
  assert.ok(relationships.some(({ searchableTerms }) => searchableTerms.includes("Rabobank")));
  assert.ok(relationships.some(({ searchableTerms }) => searchableTerms.includes("Brandweer Almere")));
  const proposal = state.teamkitProposals?.[0];
  const assets = buildTeamwearAssetLibrary(state, proposal);
  assert.ok(assets.length > 0);
  assert.equal(new Set(assets.map(({ masterRef }) => masterRef)).size, assets.length);
  assert.ok(assets.every(({ internalOnly }) => internalOnly));
  assert.ok(assets.every(({ customerContextIds }) => Array.isArray(customerContextIds)));
});

test("Teamwear draagt alleen bekende context over aan bestaande Teamorder", async (context) => {
  const { state } = await fixture(context);
  const proposal = state.teamkitProposals?.[0];
  if (!proposal) return;
  const handoff = teamwearTeamorderHandoff(proposal);
  assert.equal(handoff.existingRoute, "/workspace/sportpaleis/orders/team");
  assert.equal(handoff.proposalId, proposal.id);
  assert.deepEqual(handoff.missing, ["personen", "maten", "aantallen", "individuele personalisatie"]);
  assert.deepEqual(handoff.articleIds, proposal.items.map(({ articleId }) => articleId).filter(Boolean));
});

test("lichte intake blokkeert niet op optionele relatievelden", async (context) => {
  const { service, admin } = await fixture(context);
  const proposal = await service.createTeamkitProposal(admin.token, admin.csrfToken, {
    title: "Brandweer collectie",
    customerName: "Brandweer Almere",
  });
  assert.equal(proposal.customer.email, "");
  assert.equal(proposal.customer.contactName, "");
  assert.equal(proposal.association.name, null);
  assert.equal(proposal.title, "Brandweer collectie");
  const state = await service.bootstrap(admin.token);
  assert.deepEqual(teamwearContextArticles(state, proposal), []);
  assert.deepEqual(teamwearContextProductionAssets(state, proposal), []);
});

test("Teamwear composition is de deterministische renderbron en houdt visual projection los van productie", async (context) => {
  const { state } = await fixture(context);
  const proposal = state.teamkitProposals?.find(({ items }) => items.some(({ placements }) => placements.length));
  if (!proposal) return;
  const revision = proposal.revisions.find(({ number }) => number === proposal.currentRevision) ?? null;
  const composition = buildTeamwearComposition(proposal, revision);
  const placement = composition.items.flatMap(({ placements }) => placements)[0];
  assert.equal(composition.schema, "TEAMWEAR_COMPOSITION_V1");
  assert.equal(placement.visual.coordinateSpace, "GARMENT_PRINT_AREA_V1");
  assert.ok(["FRONT_TORSO", "BACK_TORSO", "LEFT_SLEEVE", "RIGHT_SLEEVE", "LOWER_GARMENT", "ACCESSORY"].includes(placement.visual.surface));
  assert.ok(!Object.hasOwn(placement.visual, "physicalSizeOverride"));
  assert.ok(Object.hasOwn(placement.production, "physicalSizeOverride"));
  const render = teamwearSquareProductRenderSpec(proposal, revision);
  assert.deepEqual({ width: render.width, height: render.height, format: render.format, ftpWrite: render.ftpWrite, destination: render.destination }, { width: 1200, height: 1200, format: "PNG", ftpWrite: false, destination: null });
  assert.deepEqual(render.composition, composition);
});

test("Teamwear pilot exposure is default-deny, exact-principal en auditbaar uit te schakelen", async (context) => {
  const { service, admin } = await fixture(context);
  await service.store.mutate(async (state) => ({ state, value: setSportpaleisTeamwearPilotExposure(state, admin.user.id, false, "test:pilot-control") }));
  const off = await service.bootstrap(admin.token);
  assert.equal(off.capabilities.teamwearExperiencePilot, false);
  assert.deepEqual(off.teamkitProposals, []);
  await assert.rejects(() => service.assertTeamwearPilotAccess(admin.token), (error) => error?.statusCode === 403 && error?.code === "TEAMWEAR_PILOT_NOT_ENABLED");
  await service.store.mutate(async (state) => ({ state, value: setSportpaleisTeamwearPilotExposure(state, admin.user.id, true, "test:pilot-control") }));
  await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Pilot zichtbaar" });
  const on = await service.bootstrap(admin.token);
  assert.equal(on.capabilities.teamwearExperiencePilot, true);
  assert.ok((on.teamkitProposals ?? []).length > 0);
  await service.assertTeamwearPilotAccess(admin.token);
  const persisted = await service.store.read();
  const exposureAudit = persisted.audit.filter(({ action, userId }) => userId === "test:pilot-control" && /Teamwear pilot/u.test(action));
  assert.equal(exposureAudit.length, 2);
  assert.deepEqual(new Set(exposureAudit.map(({ details }) => details.enabled)), new Set([false, true]));
});

test("contextuploads verschijnen in een volgende Teamwear van dezelfde vereniging en blijven daarbuiten verborgen", async (context) => {
  const { service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const association = state.associations[0];
  const first = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Library bron A", associationId: association.id, associationName: association.name });
  const upload = await service.addTeamkitProposalSource(admin.token, admin.csrfToken, first.id, { filename: "gedeelde-sponsor.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" fill="#123456"/></svg>').toString("base64") });
  const second = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Library bron B", associationId: association.id, associationName: association.name });
  const unrelated = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Andere context", customerName: "Andere organisatie" });
  const updated = await service.bootstrap(admin.token);
  const secondState = updated.teamkitProposals.find(({ id }) => id === second.id);
  const unrelatedState = updated.teamkitProposals.find(({ id }) => id === unrelated.id);
  const shared = buildTeamwearAssetLibrary(updated, secondState).find(({ masterRef }) => masterRef === upload.source.sha256);
  assert.ok(shared);
  assert.equal(shared.sourceProposalId, first.id);
  assert.equal(buildTeamwearAssetLibrary(updated, unrelatedState).some(({ masterRef }) => masterRef === upload.source.sha256), false);
  const reused = await service.updateTeamkitProposal(admin.token, admin.csrfToken, second.id, {
    expectedRevision: second.aggregateRevision,
    reason: "Gedeeld sponsorasset hergebruikt",
    items: [{ id: "shared-library-item", productName: "Teamshirt", color: "Navy", sizes: [], placements: [{ id: "shared-library-placement", kind: "SPONSOR", label: "Gedeelde sponsor", side: "FRONT", preset: "MIDDENBORST", sourceId: shared.id, productionAssetId: null, assetVersion: null, text: null, widthPercent: 30, route: "NOG_TE_BEPALEN", supplierName: null, note: null }] }],
  });
  const reusedSource = reused.sources.find(({ sha256 }) => sha256 === upload.source.sha256);
  assert.ok(reusedSource);
  assert.deepEqual(reusedSource.libraryOrigin, { proposalId: first.id, sourceId: upload.source.id, sha256: upload.source.sha256 });
  assert.equal(reused.items[0].placements[0].sourceId, reusedSource.id);
});

test("gelijknamige losse klanten delen nooit assets zonder dezelfde stabiele klantcontext", async (context) => {
  const { service, admin } = await fixture(context);
  const first = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Eerste context", customerName: "Jan Jansen" });
  const upload = await service.addTeamkitProposalSource(admin.token, admin.csrfToken, first.id, { filename: "jan-een.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>').toString("base64") });
  const unrelated = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Tweede context", customerName: "Jan Jansen" });
  assert.notEqual(first.customer.id, unrelated.customer.id);
  let state = await service.bootstrap(admin.token);
  assert.equal(buildTeamwearAssetLibrary(state, state.teamkitProposals.find(({ id }) => id === unrelated.id)).some(({ masterRef }) => masterRef === upload.source.sha256), false);
  const related = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Vervolgcontext", customerName: "J. Jansen", customerId: first.customer.id });
  state = await service.bootstrap(admin.token);
  assert.equal(related.customer.id, first.customer.id);
  assert.equal(buildTeamwearAssetLibrary(state, state.teamkitProposals.find(({ id }) => id === related.id)).some(({ masterRef }) => masterRef === upload.source.sha256), true);
});
