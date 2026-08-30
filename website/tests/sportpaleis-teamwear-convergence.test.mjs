import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService, setSportpaleisTeamwearPilotExposure } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { buildSportpaleisProductCatalog } from "../src/sportpaleis-product-catalog.ts";
import { normalizeProposalItems } from "../src/sportpaleis/teamkit-proposals.mjs";
import { generateProposalPdf, proposalSnapshot, renderProposalPreview } from "../src/sportpaleis/teamkit-proposals.mjs";
import { canonicalTeamkitArticleSurfaceTruth } from "../src/sportpaleis/teamkit-product-surfaces.mjs";
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

test("één catalogusvariant draagt exact dezelfde voor-/achterbron naar Teamwear-compositie en export", () => {
  const article = {
    id: "sp-live-variant-black", articleNumber: "93035", supplierArticleNumber: "VAR-93035", name: "Almere Pioneers Varsity Jacket", imageKey: "sp-live-variant-black", category: "Jacks", association: "Almere Pioneers", profileId: "profile-none", supports: [], active: true, availableSizes: ["M", "L"],
    catalogProvenance: { authority: "SPORTPALEIS_LIVE", url: "https://www.sportpaleis.nl/almere-pioneers-varsity-jacket_93035.html", imageUrl: "https://www.sportpaleis.nl/img/181520.webp", checkedAt: "2026-08-28" },
    catalogMedia: [
      { kind: "FRONT", imageKey: "sp-live-variant-black", sourceUrl: "https://www.sportpaleis.nl/img/181520.webp", sourceIndex: 0, sourceProductId: "93035", sourceColorId: "12079", colorLabel: "ZWART", authority: "SPORTPALEIS_LIVE_PRODUCT_GALLERY", classification: "SOURCE_GALLERY_ORDER_V1", checkedAt: "2026-08-28" },
      { kind: "BACK", imageKey: "sp-live-variant-black-back", sourceUrl: "https://www.sportpaleis.nl/img/181521.webp", sourceIndex: 3, sourceProductId: "93035", sourceColorId: "12079", colorLabel: "ZWART", authority: "SPORTPALEIS_LIVE_PRODUCT_GALLERY", classification: "SOURCE_GALLERY_ORDER_V1", checkedAt: "2026-08-28" },
    ],
  };
  const product = buildSportpaleisProductCatalog([article])[0];
  assert.deepEqual(product.variants[0].media.map(({ kind, imageKey }) => [kind, imageKey]), [["FRONT", "sp-live-variant-black"], ["BACK", "sp-live-variant-black-back"]]);
  assert.equal(product.variants[0].media[1].sourceColorId, "12079");
  const teamwear = buildTeamwearCatalog({ articles: [article] }).find(({ variants }) => variants.some(({ sourceArticleId }) => sourceArticleId === article.id));
  assert.ok(teamwear);
  const snapshot = {
    catalogProductId: teamwear.id, brand: teamwear.brand, supplierName: teamwear.supplierName, supplierArticleName: teamwear.supplierArticleName, supplierArticleNumber: teamwear.supplierArticleNumber, category: teamwear.category, collection: teamwear.collection, audience: teamwear.audiences, colorLabel: "ZWART", imageKey: "sp-live-variant-black", backImageKey: "sp-live-variant-black-back", frontSourceUrl: "https://www.sportpaleis.nl/img/181520.webp", backSourceUrl: "https://www.sportpaleis.nl/img/181521.webp", sourceProductId: "93035", sourceColorId: "12079", mediaClassification: "SOURCE_GALLERY_ORDER_V1", advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "sportpaleis-existing", sourceStatus: "AUTHORITATIVE",
  };
  const proposal = { id: "proposal-front-back", proposalNumber: "TKV-FRONT-BACK", currentRevision: 1, items: [{ id: "jacket", articleId: article.id, productName: article.name, color: "ZWART", catalogSnapshot: snapshot, placements: [{ id: "back-34", kind: "BACK_NUMBER", label: "Rugnummer", text: "34", side: "BACK", preset: "BACK_UPPER", widthPercent: 22, productionAssetId: null, assetVersion: null, sourceId: null, physicalSizeOverride: null }] }] };
  proposal.items = normalizeProposalItems(proposal.items);
  assert.equal(proposal.items[0].catalogSnapshot.backSourceUrl, "https://www.sportpaleis.nl/img/181521.webp");
  assert.equal(proposal.items[0].catalogSnapshot.sourceColorId, "12079");
  const composition = buildTeamwearComposition(proposal);
  assert.deepEqual(composition.items[0].media, { frontImageKey: "sp-live-variant-black", backImageKey: "sp-live-variant-black-back" });
  assert.equal(composition.items[0].placements[0].side, "BACK");
  assert.deepEqual(teamwearSquareProductRenderSpec(proposal).composition, composition);

  const missingBack = buildSportpaleisProductCatalog([{ ...article, id: "front-only", articleNumber: "front-only", catalogMedia: [article.catalogMedia[0]] }])[0];
  assert.equal(missingBack.variants[0].media.some(({ kind }) => kind === "BACK"), false, "ontbrekende achterkant wordt nooit uit de voorkant verzonnen");
});

test("synccatalogus → revision-preview → PDF gebruikt dezelfde echte front/back-bron en rugplaatsing", async (context) => {
  const { state } = await fixture(context);
  const article = state.articles.find(({ id }) => id === "sp-live-138505");
  assert.ok(article);
  const front = article.catalogMedia.find(({ kind }) => kind === "FRONT");
  const back = article.catalogMedia.find(({ kind }) => kind === "BACK");
  const surfaceTruth = canonicalTeamkitArticleSurfaceTruth(article);
  assert.ok(front?.imageKey && back?.imageKey);
  assert.equal(front.sourceProductId, back.sourceProductId);
  assert.equal(front.sourceColorId, back.sourceColorId);
  assert.equal(front.colorLabel, back.colorLabel);
  const snapshot = {
    catalogProductId: article.id, brand: "Sportpaleis", supplierName: "Sportpaleis", supplierArticleName: article.name, supplierArticleNumber: article.supplierArticleNumber ?? article.articleNumber, category: article.category, collection: null, audience: [], colorLabel: front.colorLabel, imageKey: front.imageKey, backImageKey: back.imageKey, frontSourceUrl: front.sourceUrl, backSourceUrl: back.sourceUrl, sourceProductId: front.sourceProductId, sourceColorId: front.sourceColorId, mediaClassification: front.classification, advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "sportpaleis-existing", sourceStatus: "AUTHORITATIVE", productType: surfaceTruth.productType, printableSides: surfaceTruth.printableSides, canonicalProductIdentity: { version: "TEAMKIT_CANONICAL_PRODUCT_IDENTITY_V1", sourceArticleId: article.id, articleNumber: article.articleNumber, productType: surfaceTruth.productType, physicalSides: surfaceTruth.physicalSides, printableSides: surfaceTruth.printableSides, authority: surfaceTruth.authority, evidenceKind: "TEST_SERVER_BINDING", evidenceReference: article.id, evidenceHash: "A".repeat(64) },
  };
  const proposal = {
    id: "proposal-real-front-back", proposalNumber: "TKV-REAL-FRONT-BACK", currentRevision: 2, title: "Pioneers varsity", type: "TEAMKIT", customer: { name: "Almere Pioneers" }, association: { id: "association-03", name: "Almere Pioneers" }, team: "Selectie", season: "2026/2027", category: null, deadline: null, notes: null, sources: [],
    items: normalizeProposalItems([{ id: "jacket", articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: front.colorLabel, quantity: 1, sizes: ["M"], catalogSnapshot: snapshot, placements: [{ id: "back-34", kind: "BACK_NUMBER", label: "Rugnummer", side: "BACK", preset: "BACK_UPPER", text: "34", widthPercent: 24, route: "NOG_TE_BEPALEN" }] }]),
  };
  const revisionSnapshot = proposalSnapshot(proposal, state);
  const garmentSources = revisionSnapshot.items[0].visualGarmentSources;
  assert.equal(garmentSources.FRONT.imageKey, front.imageKey);
  assert.equal(garmentSources.BACK.imageKey, back.imageKey);
  assert.notEqual(garmentSources.FRONT.sha256, garmentSources.BACK.sha256);
  assert.equal(revisionSnapshot.items[0].placements[0].side, "BACK");
  const preview = renderProposalPreview(revisionSnapshot, { customer: true });
  assert.ok(preview.includes(garmentSources.FRONT.dataUri));
  assert.ok(preview.includes(garmentSources.BACK.dataUri));
  const pdf = await generateProposalPdf(revisionSnapshot, false, { state, proposal });
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.match(pdf.toString("ascii"), new RegExp(`WBD-COMPOSITION ${createHash("sha256").update(JSON.stringify(revisionSnapshot)).digest("hex").toUpperCase()}`, "u"));
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
  const article = state.articles.find(({ association, name, active }) => active && association && /shirt/iu.test(name));
  const association = state.associations.find(({ name }) => name === article?.association);
  assert.ok(article && association);
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
    items: [{ id: "shared-library-item", articleId: article.id, articleNumber: article.articleNumber, productName: article.name, color: "Navy", sizes: [], placements: [{ id: "shared-library-placement", kind: "SPONSOR", label: "Gedeelde sponsor", side: "FRONT", preset: "MIDDENBORST", sourceId: shared.id, productionAssetId: null, assetVersion: null, text: null, widthPercent: 30, route: "NOG_TE_BEPALEN", supplierName: null, note: null }] }],
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
