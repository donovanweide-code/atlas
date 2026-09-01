import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  assertAuthoritativeProductionAssetBytes,
  authoritativeProductionAssetManifest,
} from "../config/sportpaleis-authoritative-production-assets.mjs";
import {
  SportpaleisFileStore,
  SportpaleisPilotService,
  createSportpaleisProductionBootstrap,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { OWNER_SUPPLIED_FONT_EVIDENCE } from "../src/sportpaleis/front-name-production-truth.mjs";
import { verifiedProductionNumberSources } from "../src/sportpaleis/verified-production-number-sources.mjs";
import { productionSourceByIdentity } from "../src/sportpaleis/production-sources.ts";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const passwords = { kevin: "R219-Kevin-Truth!", patrick: "R219-Patrick-Truth!", collega: "R219-Store-Truth!", "donovan-support": "R219-Support-Truth!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function sourceBytes(asset) {
  return readFile(new URL(`../${asset.sourcePath}`, import.meta.url));
}

async function extractedFixture(context, mutateAsset = async (_asset, bytes) => bytes) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r219-extracted-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const bytes = await mutateAsset(asset, await sourceBytes(asset));
    if (bytes === null) continue;
    const target = path.join(root, "app", "dist-workspace", ...asset.artifactPath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), installedProductionAssetRoot: null, allowedOrigin: "https://workspace.sportpaleis.nl" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { root, service, admin };
}

async function createBuitenboysJob(service, admin, suffix) {
  let order = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: `R2.19 ${suffix}`, customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ articleId: "sp-live-140294", size: "", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } }],
  }, `r219-${suffix}-create`)).value;
  const line = order.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
  assert.equal(line.source.id, "font-5d083befacdf98ae");
  assert.equal(line.heightMm, 75);
  assert.equal(line.decorationIdentity.foilColor, "Wit");
  order = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, `r219-${suffix}-control`)).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, `r219-${suffix}-proposal`)).value;
  return service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, orders: [{ id: order.id, expectedRevision: order.revision }] }, `r219-${suffix}-job`);
}

test("centrale registry bindt iedere static production asset aan exacte sourcebytes en provenance", async () => {
  assert.deepEqual(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map(({ id }) => id).sort(), ["font-0f330cf7aa7dd6c6", "font-5d083befacdf98ae", "font-985b2931e85cec60", "font-b91eef2aed805a9e", "font-e952ada73367d722", "font-liberation-sans-regular-f8ace1f8"]);
  assert.equal(new Set(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map(({ id }) => id)).size, SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.length);
  assert.equal(new Set(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map(({ sourcePath }) => sourcePath)).size, SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.length);
  assert.equal(new Set(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map(({ artifactPath }) => artifactPath)).size, SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.length);
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const bytes = await sourceBytes(asset);
    assert.equal(bytes.length, asset.sizeBytes);
    assert.equal(sha256(bytes), asset.sha256);
    assert.doesNotThrow(() => assertAuthoritativeProductionAssetBytes(asset, bytes));
  }
  const spain = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.find(({ id }) => id === "font-5d083befacdf98ae");
  assert.deepEqual([spain.familyName, spain.subfamilyName, spain.fullName, spain.postscriptName, spain.sha256], [OWNER_SUPPLIED_FONT_EVIDENCE.spain.familyName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.subfamilyName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.fullName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.postscriptName, OWNER_SUPPLIED_FONT_EVIDENCE.spain.sha256]);
  assert.equal(authoritativeProductionAssetManifest().assets.length, SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.length);
});

test("bootstrap managed fonts zijn een exacte projectie van de authoritative registry", () => {
  const state = createSportpaleisProductionBootstrap();
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const font = state.productionFonts.find(({ id }) => id === asset.id);
    assert.ok(font);
    assert.deepEqual([font.originalFilename, font.sha256, font.version, font.sourceUrl], [asset.originalFilename, asset.sha256, asset.version, `/${asset.artifactPath}`]);
  }
  const staticFonts = state.productionFonts.filter(({ sourceUrl }) => String(sourceUrl).startsWith("/assets/organizations/sportpaleis/fonts/"));
  assert.deepEqual(new Set(staticFonts.map(({ id }) => id)), new Set(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map(({ id }) => id)));
});

test("niet-authoritative en gemuteerde bytes passeren de centrale production-assetgrens nooit", async () => {
  const spain = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.find(({ id }) => id === "font-5d083befacdf98ae");
  const bytes = await sourceBytes(spain);
  const changed = Buffer.from(bytes); changed[0] ^= 0xff;
  assert.throws(() => assertAuthoritativeProductionAssetBytes(spain, changed), /SHA-256/u);
  assert.throws(() => assertAuthoritativeProductionAssetBytes(spain, bytes.subarray(1)), /bestandsgrootte/u);
  assert.throws(() => assertAuthoritativeProductionAssetBytes({ ...spain, id: "fixture-font" }, bytes), /Alleen geregistreerde/u);
  assert.ok(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.every(({ sourcePath }) => !sourcePath.includes("teamwear-fixtures") && !sourcePath.includes("association-logos")));
});

test("workspace dist bevat exact iedere authoritative static production asset met dezelfde hash", async () => {
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const bytes = await readFile(new URL(`../dist-workspace/${asset.artifactPath}`, import.meta.url));
    assert.equal(bytes.length, asset.sizeBytes);
    assert.equal(sha256(bytes), asset.sha256);
  }
});

test("Buitenboys 34 materialiseert contouren met Spain uit een synthetic extracted artifact zonder source/systemfallback", async (context) => {
  const { root, service, admin } = await extractedFixture(context);
  const job = (await createBuitenboysJob(service, admin, "exact-extract")).value;
  assert.deepEqual(job.snapshot.fontSources, [{ id: "font-5d083befacdf98ae", name: "Spain Euro 2016", version: "5D083BEFACDF", sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585", originalFilename: "Spain Euro 2016.ttf" }]);
  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  assert.match(svg, /<path data-contour-id=/u);
  assert.doesNotMatch(svg, /<text|font-family/iu);
});

test("ontbrekende of gewijzigde Spain-bytes falen in extracted runtime gesloten", async (context) => {
  const missing = await extractedFixture(context, async (asset, bytes) => asset.id === "font-5d083befacdf98ae" ? null : bytes);
  await assert.rejects(createBuitenboysJob(missing.service, missing.admin, "missing"), (error) => error.code === "PRODUCTION_FONT_SOURCE_MISSING");
  const tampered = await extractedFixture(context, async (asset, bytes) => {
    if (asset.id !== "font-5d083befacdf98ae") return bytes;
    const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 0xff; return changed;
  });
  await assert.rejects(createBuitenboysJob(tampered.service, tampered.admin, "tampered"), (error) => error.code === "PRODUCTION_FONT_SOURCE_MISSING");
});

test("embedded glyphmasters en code-contourbronnen behouden hun eigen immutable boundary", () => {
  const verified = verifiedProductionNumberSources();
  assert.equal(verified.length, 5);
  for (const entry of verified) {
    const bytes = Buffer.from(entry.source.original.dataBase64, "base64");
    assert.equal(sha256(bytes), entry.definition.originalSha256 ?? entry.definition.sha256);
    assert.equal(entry.element.lifecycleStatus, entry.definition.key === "pioneers-rug-junior-160" ? "SUPERSEDED_BY_PRODUCT_TRUTH_200MM" : "PRODUCTION_READY");
  }
  for (const value of ["2", "34", "77"]) {
    const source = productionSourceByIdentity(`pioneers-rugnummer-${value}-200mm`, "Sportpaleis-Snijtest-001");
    assert.ok(source);
    assert.equal(source.sourceProofStatus, "PHYSICALLY_VALIDATED");
  }
});
