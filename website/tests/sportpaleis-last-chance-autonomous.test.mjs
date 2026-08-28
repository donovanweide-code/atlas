import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";
import { SPORTPALEIS_FONT_ASSET_INVENTORY } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { verifiedProductionNumberSources } from "../src/sportpaleis/verified-production-number-sources.mjs";
import { OWNER_SUPPLIED_FONT_EVIDENCE } from "../src/sportpaleis/front-name-production-truth.mjs";

const passwords = { kevin: "Last-Chance-Kevin-2026!", patrick: "Last-Chance-Patrick-2026!", collega: "Last-Chance-Collega-2026!", "donovan-support": "Last-Chance-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-last-chance-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), ...options });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { service, store, admin };
}

test("Human Product Truth: Pioneers profile identity, dimensions and Buitenboys article colors are canonical", async (context) => {
  const jacket = SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ articleNumber }) => articleNumber === "138505");
  assert.equal(jacket.association, "Almere Pioneers");
  assert.equal(jacket.profileId, "profile-source-almere-pioneers-name");
  assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ articleNumber }) => articleNumber === "141598").foilColorOverride, "Blauw");
  assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ articleNumber }) => articleNumber === "140294").foilColorOverride, "Wit");
  assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ articleNumber }) => articleNumber === "140305").foilColorOverride, "Wit");
  assert.equal(verifiedProductionNumberSources().filter(({ definition }) => definition.ownerName === "Almere Pioneers").every(({ definition }) => definition.contextId === "association-03"), true);

  const { service, admin } = await fixture(context);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Pioneers naammaat",
    customerEmail: "",
    customerPhone: "0612345678",
    standardPersonalization: { ...empty, name: "JANSEN" },
    items: [{ articleId: jacket.id, size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, "last-chance-pioneers-name")).value;
  const nameLine = created.productionLines.find(({ personalizationField }) => personalizationField === "name");
  assert.equal(nameLine.heightMm, 20, "Pioneers naam gebruikt de bewezen 20 mm naamhoogte, niet de eerste cm-waarde uit een samengesteld label");
  assert.equal(nameLine.decorationIdentity.productionProfileId, "profile-source-almere-pioneers-name");
});

test("directe teamproductie bewaart tekstuele nummers en volledige decoration identity", async (context) => {
  const { service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const font = state.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const profile = state.productionProfiles.find(({ id }) => id !== "profile-none" && id !== "profile-pending");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "TEAM",
    teamContext: "Tekstueel shortnummer",
    customer: "",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    items: [{ product: "Directe teamproductie", association: "", productionProfileId: profile.id, size: "", quantity: 2, personalization: "Shortnummer MW ×2", deviation: true, overrides: empty }],
    productionLines: [{ id: "team-short-mw", type: "TEXT", personalizationField: "shortsNumber", content: "MW", previewLabel: "Shortnummer MW", widthMm: 50, heightMm: 75, foilColor: "Wit", quantity: 2, sourceId: font.id }],
  }, "last-chance-team-mw")).value;
  const line = created.productionLines.find(({ id }) => id === "team-short-mw");
  assert.equal(line.type, "TEXT");
  assert.equal(line.personalizationField, "shortsNumber");
  assert.equal(line.decorationIdentity.value, "MW");
  assert.equal(line.decorationIdentity.itemId, created.items[0].id);
  assert.equal(line.quantity, 2);
});

test("Spain Euro 2016 wordt via exact hashbewijs aan SC Buitenboys short gekoppeld", async (context) => {
  const { service, store, admin } = await fixture(context);
  const evidence = OWNER_SUPPLIED_FONT_EVIDENCE.spain;
  const inventory = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === "Spain");
  assert.equal(inventory.fontAssetStatus, "HUMAN_PRODUCT_TRUTH_CONFIRMED");
  assert.equal(inventory.referenceAsset.familyName, evidence.familyName);
  assert.equal(inventory.referenceAsset.postScriptName, evidence.postscriptName);
  assert.equal(inventory.referenceAsset.sha256, evidence.sha256);
  await store.mutate(async (state) => {
    state.productionFonts.push({
      id: "font-spain-euro-2016",
      name: evidence.familyName,
      originalFilename: evidence.originalFilename,
      version: evidence.sha256.slice(0, 12),
      sha256: evidence.sha256,
      mimeType: "font/ttf",
      sizeBytes: 1_024,
      addedAt: "2026-08-27T00:00:00.000Z",
      uploadedBy: { userId: admin.user.id, name: admin.user.name },
      provenance: "Donovan Human Product Truth · Spain Euro 2016 / SpainEuro-Regular",
      status: "TECHNICALLY_VALID",
      allowedInStore: true,
      sourceUrl: "/api/sportpaleis/v1/production-fonts/font-spain-euro-2016/source",
    });
    return { state, value: null };
  });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Buitenboys bestaande Spain-bron",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-140294", size: "", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } }],
  }, "last-chance-spain-library-link")).value;
  const line = created.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
  assert.equal(line.source.kind, "FONT");
  assert.equal(line.source.id, "font-spain-euro-2016");
  assert.equal(line.source.sha256, evidence.sha256);
  assert.equal(line.validation.status, "VALID");
  assert.equal(line.decorationIdentity.foilColor, "Wit");
});

test("een lookalike met displaynaam Spain krijgt nooit productieautoriteit", async (context) => {
  const { service, store, admin } = await fixture(context);
  await store.mutate(async (state) => {
    state.productionFonts.push({
      id: "font-spain-lookalike",
      name: "Spain",
      originalFilename: "lookalike.ttf",
      version: "1",
      sha256: "A".repeat(64),
      mimeType: "font/ttf",
      sizeBytes: 1_024,
      addedAt: "2026-08-27T00:00:00.000Z",
      uploadedBy: { userId: admin.user.id, name: admin.user.name },
      provenance: "Negatieve authority-regressie",
      status: "TECHNICALLY_VALID",
      allowedInStore: true,
      sourceUrl: "/api/sportpaleis/v1/production-fonts/font-spain-lookalike/source",
    });
    return { state, value: null };
  });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Spain authority test",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    items: [{ articleId: "sp-live-140294", size: "", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } }],
  }, "spain-lookalike-must-fail")).value;
  const line = created.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
  assert.equal(line.validation.status, "BLOCKED");
  assert.notEqual(line.source.id, "font-spain-lookalike");
});

test("meegeleverde Hockey-bronnen koppelen uitsluitend bij bewezen 20 cm en 7,5 cm context", async (context) => {
  const { store } = await fixture(context);
  const state = await store.read();
  const buitenhout = state.associations.find(({ name }) => name === "Buitenhout MHC");
  assert.ok(buitenhout);
  const rug = state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "hockey-rug-200");
  const short = state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "hockey-short-75");
  assert.ok(rug?.contexts?.some(({ type, id }) => type === "ASSOCIATION" && id === buitenhout.id));
  assert.ok(short?.contexts?.some(({ type, id }) => type === "ASSOCIATION" && id === buitenhout.id));
  assert.ok(state.productionProfiles.find(({ id }) => id === "profile-source-buitenhout-mhc-backNumber")?.productionNumberAssetIds?.includes(rug.id));
  assert.ok(state.productionProfiles.find(({ id }) => id === "profile-source-buitenhout-mhc-shortsNumber")?.productionNumberAssetIds?.includes(short.id));
  const lelystad = state.associations.find(({ name }) => name === "MHC Lelystad");
  assert.ok(lelystad);
  assert.equal(rug.contexts?.some(({ type, id }) => type === "ASSOCIATION" && id === lelystad.id), false, "22 cm MHC-regel mag de 20 cm bron niet erven");
});

test("review lifecycle is inactive by default and normal UX exposes neither stale PILOT nor testdata controls", async (context) => {
  const denied = await fixture(context, { reviewPrincipalIds: ["kevin"] });
  assert.equal((await denied.service.bootstrap(denied.admin.token)).capabilities.reviewMode, false);
  await assert.rejects(() => denied.service.reviewManifest(denied.admin.token), (error) => error?.code === "REVIEW_MODE_FORBIDDEN");

  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /candidateReviewAuthorized/u);
  assert.doesNotMatch(source, /Alles \+ testdata/u);
  assert.doesNotMatch(source, /\? "LOKALE REVIEW" : "PILOT"/u);
  assert.match(source, /\? "LOKALE REVIEW" : "LIVE"/u);
});

test("Guided Setup scheidt nog inrichten van echte actie en verzint geen generieke logo- of folieverplichting", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /status: "SETUP"/u);
  assert.match(source, /Nog inrichten/u);
  assert.doesNotMatch(source, /Logo of productieasset ontbreekt voor/u);
  assert.doesNotMatch(source, /Foliekleur ontbreekt voor/u);
  assert.match(source, /gekoppeld productieprofiel .* bestaat niet/u);
  assert.match(source, /profileFont === canonicalFontKey\(OWNER_SUPPLIED_FONT_EVIDENCE\.spain\.canonicalProfileName\)/u);
  assert.match(source, /font\.sha256 === OWNER_SUPPLIED_FONT_EVIDENCE\.spain\.sha256/u);
});

test("Bedrukken maakt gelijknamige artikelen herkenbaar zonder extra invoer", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /<small>Artikel \$\{esc\(article\.articleNumber\)\}<\/small>/u);
  assert.match(source, /artikel \$\{esc\(article\.articleNumber\)\}, toe/u);
});

test("Today vertaalt productieregels naar begrijpelijke bedrukkingstaal", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Bedrukking nog niet compleet/u);
  assert.match(source, /Aantal voor bedrukking controleren/u);
  assert.doesNotMatch(source, /return "Benodigde productieobjecten ontbreken"/u);
  assert.doesNotMatch(source, /return "Het aantal productieobjecten klopt niet"/u);
});

test("Productie toont de fysieke afsluitregel zonder interne OPEN- of PlotJob-taal", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Er staat nu geen foliekleur klaar om te produceren\./u);
  assert.match(source, /Een voorstel of productiebestand rondt een kleur nooit af; alleen Bedrukt doet dat\./u);
  assert.doesNotMatch(source, /OPEN foliekleur|voorbereide PlotJob/u);
});

test("mobiele bulkorderacties blijven volledig binnen de kaart", async () => {
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(css, /\.sp-order-bulk-actions>div\{align-items:stretch;flex-direction:column\}/u);
  assert.match(css, /@media\(max-width:1200px\)\{\.sp-free-line__fields/u);
  assert.match(css, /@media\(max-width:1200px\)\{\.sp-guided-setup/u);
  assert.match(css, /@media\(max-width:1200px\)\{\.sp-setup-table-wrap/u);
});

test("opeenvolgende bronreviewkeuzes worden geserialiseerd zodat selectie en afbeelding niet terugspringen", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /productionAssetReviewDraftSaveQueue = new WeakMap<HTMLFormElement, Promise<void>>\(\)/u);
  assert.match(source, /const previous = productionAssetReviewDraftSaveQueue\.get\(form\) \?\? Promise\.resolve\(\)/u);
  assert.match(source, /const next = previous\.then\(async \(\) =>/u);
  assert.match(source, /form\.dataset\.reviewDraftRevision = String\(saved\.reviewDraft\?\.revision/u);
});
