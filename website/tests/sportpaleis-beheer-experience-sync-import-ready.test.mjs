import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { reconcileSportpaleisEmployeeDirectory, SPORTPALEIS_UNVERIFIED_SALES_CODES } from "../scripts/sportpaleis-employee-directory.mjs";
import { createSportpaleisWebshopIntakeState, normalizeDividePersonalization, parseSportpaleisDividePdfText, reconcileSportpaleisDivideRevision } from "../scripts/sportpaleis-divide-import.mjs";
import { compareSportpaleisWebsiteSnapshot, createSportpaleisWebsiteSource, createSportpaleisWebsiteSyncState, parseSportpaleisAssociationPage, parseSportpaleisAssociationSitemap, parseSportpaleisLiveAssociationDirectory, parseSportpaleisProductionRelevance, stageSportpaleisWebsiteSync } from "../scripts/sportpaleis-website-sync.mjs";
import { buildWorkspaceSearchIndex, queryWorkspaceSearch } from "../src/workspace-search.ts";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const hash = "a".repeat(64);

test("werknemersbron matcht op verkoopnummer, bewaart centrale namen en maakt lege codes niet aan", () => {
  const current = [{ id: "existing-45", name: "Donovan van de Weide", salesNumber: "45", active: true, userId: "admin", revision: 4 }];
  const result = reconcileSportpaleisEmployeeDirectory(current, new Date("2026-08-20T12:00:00Z"));
  assert.ok(result.matched.includes("45"));
  assert.equal(result.nameDifferences.includes("45"), false);
  assert.equal(result.additions.some(({ salesNumber }) => salesNumber === "45"), false);
  assert.equal(result.additions.some(({ salesNumber }) => SPORTPALEIS_UNVERIFIED_SALES_CODES.includes(salesNumber)), false);
  assert.equal(result.additions.find(({ salesNumber }) => salesNumber === "99").accountType, "SYSTEM");
  assert.ok(result.additions.every(({ userId }) => userId === null), "verkoopnummer maakt nooit een loginaccount");
});

function productCard({ sourceId = "137294", websiteId = "99601", name = "Trainingsshirt", association = "A.S.C. Waterwijk", price = 24.95 } = {}) {
  const layer = JSON.stringify({ name, category: association, brand: "Testmerk", price, itemgroupid: `${sourceId}-1` });
  return `<div class="item" data-product-id="${websiteId}" data-layer-product='${layer}'><a href="/product/${sourceId}/" title="${name}"><img src="/media/${sourceId}.jpg"></a></div>`;
}

test("officiële websitebron parseert stabiele verenigingen, paginatie en gestructureerde artikeldata", async () => {
  const sitemap = `<urlset><url><loc>https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/</loc><lastmod>2026-08-20</lastmod></url><url><loc>https://www.sportpaleis.nl/over-ons/</loc></url></urlset>`;
  assert.equal(parseSportpaleisAssociationSitemap(sitemap).length, 1);
  const directory = `<span class="count">25</span> Producten<h2>Voetbalverenigingen</h2><ul><li><a href="/verenigingen/a-s-c-waterwijk/">A.S.C. Waterwijk</a></li></ul><h2>Complete Clubondersteuning</h2>`;
  assert.equal(parseSportpaleisLiveAssociationDirectory(directory).length, 1);
  assert.equal(parseSportpaleisProductionRelevance(`<main><div class="row type-description"><span class="title">Rugnummer</span></div></main>`).status, "RELEVANT");
  assert.equal(parseSportpaleisProductionRelevance(`<main><h1>Voetbalkous</h1></main>`).status, "NOT_RELEVANT");
  const first = `<span class="count">25</span> Producten ${Array.from({ length: 24 }, (_, index) => productCard({ sourceId: String(137294 + index), websiteId: String(99601 + index) })).join("")}`;
  const second = `<span class="count">25</span> Producten ${productCard({ sourceId: "199999", websiteId: "109999", name: "Tweede pagina" })}`;
  assert.equal(parseSportpaleisAssociationPage(first, "https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/").articles.length, 24);
  const requested = [];
  const source = createSportpaleisWebsiteSource({ fetcher: async (url) => {
    requested.push(String(url));
    const body = String(url).includes("sitemap/categories") ? sitemap : String(url) === "https://www.sportpaleis.nl/verenigingen/" ? directory : String(url).includes("?p=2") ? second : String(url).includes("/product/") ? `<main><div class="row type-description"><span class="title">Initialen</span></div></main>` : first;
    return { ok: true, status: 200, text: async () => body };
  } });
  const snapshot = await source.snapshot(new Date("2026-08-20T12:00:00Z"));
  assert.equal(snapshot.associations[0].articles.length, 25);
  assert.ok(requested.some((url) => url.endsWith("?p=2")));
});

test("dode of inhoudsloze directorylink wordt niet als live operationele clubstore behandeld", async () => {
  const sitemap = `<urlset><url><loc>https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/</loc></url><url><loc>https://www.sportpaleis.nl/verenigingen/as80/</loc></url><url><loc>https://www.sportpaleis.nl/verenigingen/roda-23/</loc></url></urlset>`;
  const directory = `<h2>Voetbalverenigingen</h2><a href="/verenigingen/a-s-c-waterwijk/">A.S.C. Waterwijk</a><a href="/verenigingen/as80/">AS'80</a><a href="/verenigingen/roda-23/">Roda '23</a><h2>Complete Clubondersteuning</h2>`;
  const livePage = `<span class="count">1</span> Producten ${productCard()}`;
  const source = createSportpaleisWebsiteSource({ fetcher: async (url) => {
    const value = String(url);
    if (value.includes("sitemap/categories")) return { ok: true, status: 200, text: async () => sitemap };
    if (value === "https://www.sportpaleis.nl/verenigingen/") return { ok: true, status: 200, text: async () => directory };
    if (value === "https://www.sportpaleis.nl/verenigingen/as80/") return { ok: false, status: 404, text: async () => "" };
    if (value === "https://www.sportpaleis.nl/verenigingen/roda-23/") return { ok: true, status: 200, text: async () => `<main><h1>Sportpaleis &amp; Verenigingen</h1></main>` };
    if (value.includes("/product/")) return { ok: true, status: 200, text: async () => `<main><div class="row type-description"><span class="title">Initialen</span></div></main>` };
    return { ok: true, status: 200, text: async () => livePage };
  } });
  const snapshot = await source.snapshot(new Date("2026-08-20T12:00:00Z"));
  assert.equal(snapshot.associations.length, 1);
  assert.equal(snapshot.associations[0].name, "A.S.C. Waterwijk");
  assert.equal(snapshot.notLiveAssociationCandidates, 2);
});

test("website-sync stage-only bewaart lokale productieconfig, detecteert wijzigingen en is inhoudelijk idempotent", () => {
  const article = { id: "sp-live-137294", name: "Trainingsshirt", catalogProvenance: { url: "https://www.sportpaleis.nl/product/137294/" }, profileId: "senior", foilColorOverride: "Wit" };
  const state = { revision: 10, articles: [structuredClone(article)], associations: [{ id: "waterwijk", name: "A.S.C. Waterwijk", production: { workingWidthMm: 440 } }], audit: [], websiteSync: createSportpaleisWebsiteSyncState() };
  const sourceArticle = { sourceIdentifier: "137294", name: "Nieuw bronlabel", associationName: "A.S.C. Waterwijk", url: "https://www.sportpaleis.nl/product/137294/", fingerprint: "article-v2", storefrontStatus: "LIVE", productionRelevance: { status: "RELEVANT", fields: ["Initialen"], evidence: "PUBLIC_PERSONALIZATION_FIELDS" } };
  const snapshot = { fingerprint: "snapshot-v2", associations: [{ sourceIdentifier: "https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/", name: "A.S.C. Waterwijk", fingerprint: "association-v2", articles: [sourceArticle] }] };
  const before = structuredClone({ article: state.articles[0], association: state.associations[0] });
  const comparison = compareSportpaleisWebsiteSnapshot(state, snapshot);
  assert.equal(comparison.changes[0].kind, "WORKSPACE_SOURCE_DIFFERENCE");
  stageSportpaleisWebsiteSync(state, snapshot, { now: new Date("2026-08-20T12:00:00Z") });
  assert.deepEqual(state.articles[0], before.article);
  assert.deepEqual(state.associations[0], before.association);
  assert.equal(state.websiteSync.mode, "STAGE_ONLY");
  assert.equal(state.websiteSync.changes.length, 1);
  const repeated = compareSportpaleisWebsiteSnapshot(state, snapshot);
  assert.equal(repeated.changes.length, 1, "dezelfde pending review wordt niet als duplicaat toegevoegd");
});

test("website-sync endpoint is admin-only en herhaalt een identieke bron zonder datastore-revisiechurn", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "spw-website-sync-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwords = { kevin: "Sync-Admin-2026!", patrick: "Sync-Operator-2026!", collega: "Sync-Store-2026!", "donovan-support": "Sync-Support-2026!" };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const sourceArticle = { sourceIdentifier: "137294", name: "Nike Dri-FIT Academy 23 Top", associationName: "A.S.C. Waterwijk", url: "https://www.sportpaleis.nl/product/137294/", fingerprint: "article-stable", storefrontStatus: "LIVE", productionRelevance: { status: "RELEVANT", fields: ["Initialen"], evidence: "PUBLIC_PERSONALIZATION_FIELDS" } };
  const snapshot = { fingerprint: "snapshot-stable", associations: [{ sourceIdentifier: "https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/", name: "A.S.C. Waterwijk", fingerprint: "association-stable", articles: [sourceArticle] }] };
  const service = new SportpaleisPilotService({ store, websiteSource: { snapshot: async () => structuredClone(snapshot) }, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime") });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const original = await service.bootstrap(admin.token);
  await assert.rejects(service.runWebsiteSync(operator.token, operator.csrfToken), (error) => error.statusCode === 403);
  const first = await service.runWebsiteSync(admin.token, admin.csrfToken);
  const afterFirst = await service.bootstrap(admin.token);
  const second = await service.runWebsiteSync(admin.token, admin.csrfToken);
  const afterSecond = await service.bootstrap(admin.token);
  assert.equal(first.sourceFingerprint, "snapshot-stable");
  assert.deepEqual(second, first);
  assert.equal(afterSecond.revision, afterFirst.revision, "identieke bron veroorzaakt geen centrale revision churn");
  assert.deepEqual(afterSecond.articles, original.articles, "catalogus en productieconfig blijven stage-only");
});

test("Divide contract segmenteert multi-page 26-orders en stuurt alleen gepersonaliseerde regels naar toekomstige productie", () => {
  const parsed = parseSportpaleisDividePdfText({ sourceDocumentId: "sanitized-structure-fixture", sourceHash: hash, pages: [
    `Bestelnummer: 26340001\nBesteldatum: 20-08-2026\nArtikelnummer: A-1\nOmschrijving: Shirt\nMaat: L\nKleur: Blauw\nAantal: 1\nNaam (Rug): 6`,
    `Vervolg bestelling 26340001\nArtikelnummer: A-2\nOmschrijving: Broek\nMaat: L\nKleur: Blauw\nAantal: 1`,
    `Bestelnummer: 26340002\nArtikelnummer: A-3\nOmschrijving: Shirt\nAantal: 1\nNaam (Rug): Keijer\nArtikelnummer: A-4\nOmschrijving: Jas\nAantal: 2\nInitialen: Sami`,
  ] });
  assert.equal(parsed.orders.length, 2);
  assert.deepEqual(parsed.orders[0].pageNumbers, [1, 2]);
  assert.equal(parsed.orders[0].articles.length, 2);
  assert.equal(parsed.orders[0].productionLines.length, 1);
  assert.equal(parsed.orders[0].productionLines[0].personalization[0].kind, "BACK_NUMBER");
  assert.equal(parsed.orders[1].productionLines[0].personalization[0].kind, "BACK_NAME");
  assert.equal(parsed.orders[1].productionLines[1].personalization[0].kind, "INITIALS");
  assert.equal(parsed.orders.every(({ channel }) => channel === "WEBSHOP_XPRT"), true);
  assert.equal(normalizeDividePersonalization("Naam (Rug)", "10").kind, "BACK_NUMBER");
  assert.equal(normalizeDividePersonalization("Naam (Rug)", "Ahallak").kind, "BACK_NAME");
  assert.equal(normalizeDividePersonalization("Initialen", "JC").value, "JC");
  const v1 = reconcileSportpaleisDivideRevision([], parsed.orders[0]);
  assert.equal(v1.revision, 1);
  assert.equal(reconcileSportpaleisDivideRevision([v1.record], parsed.orders[0]).action, "NO_OP");
  const changed = structuredClone(parsed.orders[0]); changed.contentHash = "changed";
  assert.equal(reconcileSportpaleisDivideRevision([v1.record], changed, "PRODUCED").safety, "HUMAN_GO_REQUIRED");
  assert.deepEqual(createSportpaleisWebshopIntakeState(), { enabled: false, status: "NOT_ACTIVE", startBoundary: null, lastSuccessfulRetrievalAt: null, highWaterMark: null, processedSourceIdentifiers: [], processedOrderRevisionIdentifiers: [], retrievalMode: "OFF", channel: "WEBSHOP_XPRT" });
});

function searchState(size = 1) {
  return {
    capabilities: { admin: true, operator: true },
    orders: Array.from({ length: size }, (_, index) => ({ id: `SP-${1000 + index}`, customer: `Klant ${index}`, customerEmail: `klant${index}@example.invalid`, customerPhone: "", association: "Waterwijk", items: [{ articleNumber: `ART-${index}`, product: `Shirt ${index}`, association: "Waterwijk", variants: [] }], sourceContext: index === 7 ? { source: "WEBSHOP_XPRT", externalReference: "26340007" } : { source: "STORE", externalReference: null }, salesAttribution: { salesNumber: "45", label: "Medewerker 45" } })),
    articles: Array.from({ length: size }, (_, index) => ({ id: `article-${index}`, name: `Artikel ${index}`, articleNumber: `ART-${index}`, supplierArticleNumber: "", association: "Waterwijk", category: "Teamwear" })),
    associations: [{ id: "waterwijk", name: "Waterwijk", active: true, notes: "" }],
    employees: [{ id: "employee-45", name: "Medewerker 45", salesNumber: "45", active: true }],
    productionJobs: [{ id: "job-1", jobNumber: "PLOT-001", initiatedBy: { name: "Operator" }, snapshot: { association: "Waterwijk", orderIds: ["SP-1000"], elements: [{ value: "10" }] } }],
  };
}

test("contextzoeking vindt SP, 26, artikel en verkoopnummer en blijft snel op representatieve omvang", () => {
  const started = performance.now();
  const index = buildWorkspaceSearchIndex(searchState(5_000), "");
  assert.equal(queryWorkspaceSearch(index, "26340007")[0].group, "Webshoporders");
  assert.equal(queryWorkspaceSearch(index, "ART-4999").some(({ group }) => group === "Artikelen"), true);
  assert.equal(queryWorkspaceSearch(index, "verkoopnummer 45").some(({ group }) => group === "Medewerkers"), true);
  assert.ok(performance.now() - started < 1_500, "indexeren en drie zoekacties blijven buiten de kritieke UI-grens");
});

test("beheer-UX gebruikt menselijke status, veilige rolpreview en hard-uit import", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /VANDAAG · MIJN WERK/u);
  assert.match(source, /Productiebestand maken/u);
  assert.match(source, /Alleen voorbeeld/u);
  assert.match(source, /Je rechten en actieve beheerderssessie zijn niet gewijzigd/u);
  assert.match(source, /DIVIDE \/ WEBSHOPMAIL/u);
  assert.match(source, /Niet actief/u);
  assert.doesNotMatch(source.slice(source.indexOf("function rolePreview"), source.indexOf("function synchronizationAdmin")), /updateUser|savePreferences|switchUser/u);
});
