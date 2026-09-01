import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  SportpaleisFileStore,
  SportpaleisPilotService,
  validateFinalProductionTruth,
  validateSportpaleisPilotState,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { executableProductionAssetDecision, productionObjectFitsTrack } from "../src/sportpaleis/production-practice-contract.mjs";

const emptyPersonalization = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
const geometryHash = "B".repeat(64);
const executableAsset = {
  id: "asset-proof", registrationId: "source-registration-proof", name: "Bewezen bron", lifecycleStatus: "PRODUCTION_READY", productionMethod: "SELF_PRODUCED", sourceId: "source-proof",
  sourceSelection: { geometryHash }, controlledVector: { geometryHash, contours: [[[0, 0], [20, 0], [20, 10], [0, 10]]] },
  variants: [{ id: "asset-proof-100", widthMm: 100, heightMm: 50 }], sizePolicy: { mode: "FIXED", defaultWidthMm: 100, defaultHeightMm: 50 },
  applications: [{ kind: "LOGO", placement: null }], contexts: [{ type: "GENERIC", id: "generic", label: "Algemeen" }],
  sourceLayers: { vectorSource: { filename: "proof.svg", mimeType: "image/svg+xml", sha256: geometryHash }, validatedCutContour: { sourceId: "source-proof", version: "1", sha256: geometryHash } },
};

async function fixture(context, suffix, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), `sp-r2267-${suffix}-`));
  context.after(() => rm(root, { recursive: true, force: true }));
  const passwords = { kevin: `R2267-${suffix}-Kevin!`, patrick: `R2267-${suffix}-Patrick!`, collega: `R2267-${suffix}-Store!`, "donovan-support": `R2267-${suffix}-Support!` };
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), uploadsEnabled: false, productionAssetUploadsEnabled: true, ...options });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { store, service, admin };
}

test("één uitvoerbaarheidscontract scheidt labels van geometrie- en maatbewijs", () => {
  assert.equal(executableProductionAssetDecision(executableAsset).allowed, true);
  assert.equal(executableProductionAssetDecision({ ...executableAsset, controlledVector: undefined }).code, "PRODUCTION_ASSET_GEOMETRY_UNPROVEN");
  assert.equal(executableProductionAssetDecision({ ...executableAsset, sourceSelection: { geometryHash: "C".repeat(64) } }).code, "PRODUCTION_ASSET_GEOMETRY_UNPROVEN");
  assert.equal(executableProductionAssetDecision({ ...executableAsset, variants: [], sizePolicy: {} }).code, "PRODUCTION_ASSET_SIZE_UNPROVEN");
});

test("fysieke track-fit accepteert uitsluitend werkelijk passende toegestane rotaties", () => {
  assert.equal(productionObjectFitsTrack({ widthMm: 500, heightMm: 124.193, maximumTrackWidthMm: 450, allowedRotations: [0, 90] }), true);
  assert.equal(productionObjectFitsTrack({ widthMm: 500, heightMm: 124.193, maximumTrackWidthMm: 450, allowedRotations: [0] }), false);
  assert.equal(productionObjectFitsTrack({ widthMm: 500, heightMm: 500, maximumTrackWidthMm: 450, allowedRotations: [0, 90] }), false);
});

test("duplicate productie-element identity faalt vóór persistente ambiguïteit", () => {
  const state = createSportpaleisProductionBootstrap();
  state.productionElements.push(structuredClone(state.productionElements[0]));
  assert.throws(() => validateSportpaleisPilotState(state), /Dubbele productie-element-ID/u);
});

test("Vrije-opdrukitem en fysieke regels behouden exact dezelfde cardinaliteit", async (context) => {
  const { service, admin } = await fixture(context, "cardinality");
  const bootstrap = await service.bootstrap(admin.token);
  const font = bootstrap.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  await assert.rejects(service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Cardinality challenge", customerEmail: "", customerPhone: "", standardPersonalization: emptyPersonalization,
    items: [{ product: "Vrije opdruk", association: "Vrije bedrukking", size: "", quantity: 1, personalization: "28 ×1", deviation: true, overrides: emptyPersonalization }],
    productionLines: [{ id: "free-28", type: "NUMBER", content: "28", sourceId: font.id, widthMm: 100, heightMm: 160, foilColor: "Wit", quantity: 3 }],
  }, "r2267-cardinality-mismatch"), (error) => error.code === "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" && error.expected === 1 && error.actual === 3);
});

test("MHC letters en rugnummer behouden afzonderlijke authoritative brontypen", async (context) => {
  const { service, admin } = await fixture(context, "mhc-source-role");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "MHC source challenge", customerEmail: "", customerPhone: "", standardPersonalization: { ...emptyPersonalization, name: "Jansen", backNumber: "28", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-101119", size: "M", quantity: 1, deviation: false, overrides: emptyPersonalization }],
  }, "r2267-mhc-source-role")).value;
  const state = await service.bootstrap(admin.token);
  const mhc = state.associations.find(({ name }) => name === "MHC Lelystad");
  assert.deepEqual(mhc.fontEvidence.referenceFields, ["backNumber"]);
  const validation = validateFinalProductionTruth(state, created);
  const backNumberLine = created.productionLines.find(({ personalizationField }) => personalizationField === "backNumber");
  const nameLine = created.productionLines.find(({ personalizationField }) => personalizationField === "name");
  const backNumberFindings = validation.findings.filter(({ lineId }) => lineId === backNumberLine.id);
  const nameFindings = validation.findings.filter(({ lineId }) => lineId === nameLine.id);
  assert.equal(backNumberLine.source.kind, "PRODUCTION_ELEMENT");
  assert.equal(backNumberLine.source.id, "production-asset-verified-hockey-rug-200");
  assert.equal(nameLine.source.kind, "FONT");
  assert.equal(nameLine.source.id, "font-b91eef2aed805a9e");
  assert.ok(!backNumberFindings.some(({ code }) => code === "PRODUCTION_CANONICAL_VECTOR_SOURCE_UNRESOLVED"));
  assert.ok(!backNumberFindings.some(({ code }) => String(code).startsWith("PRODUCTION_CANONICAL_FONT_")), "een vectorreferentie wordt niet langer als ontbrekend TTF-font uitgelegd");
  assert.ok(!nameFindings.some(({ code }) => String(code).startsWith("PRODUCTION_CANONICAL_FONT_")));
  assert.ok(!nameFindings.some(({ code }) => code === "PRODUCTION_CANONICAL_VECTOR_SOURCE_UNRESOLVED"), "de rugnummer-SVG wordt niet als letterbron hergebruikt");
});

test("fontupload kan een expliciete MHC rugnummer-SVG-toepassing niet oplossen", async (context) => {
  const { service, admin } = await fixture(context, "mhc-upload-role", { fontUploadsEnabled: true });
  const state = await service.bootstrap(admin.token);
  const article = state.articles.find(({ id }) => id === "sp-live-101119");
  const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
  const association = state.associations.find(({ name }) => name === "MHC Lelystad");
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, {
    name: "Myriad Pro Bold", filename: "Myriad-Pro-Bold.ttf", dataBase64: bytes.toString("base64"), provenance: "type-boundary challenge", allowedInStore: false, humanAcceptance: true,
    productionProfileId: profile.id, applicationField: "backNumber", associationId: association.id,
  }), (error) => error.code === "PRODUCTION_FONT_SOURCE_TYPE_MISMATCH" && error.expectedSourceType === "VECTOR_GLYPH_SET");
});

test("zichtbare Myriad-naam kan Liberation-bytes niet aan MHC letters binden", async (context) => {
  const { service, admin } = await fixture(context, "mhc-font-identity", { fontUploadsEnabled: true });
  const state = await service.bootstrap(admin.token);
  const article = state.articles.find(({ id }) => id === "sp-live-101119");
  const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
  const association = state.associations.find(({ name }) => name === "MHC Lelystad");
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const payload = {
    name: "Myriad Pro Bold", filename: "Myriad-Pro-Bold.ttf", dataBase64: bytes.toString("base64"), provenance: "internal-identity challenge", allowedInStore: false, humanAcceptance: true,
    productionProfileId: profile.id, applicationField: "name", associationId: association.id,
  };
  await assert.rejects(service.inspectProductionFont(admin.token, admin.csrfToken, payload), (error) => error.code === "PRODUCTION_CANONICAL_FONT_IDENTITY_MISMATCH" && error.actualIdentities.familyName === "Liberation Sans");
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, payload), (error) => error.code === "PRODUCTION_CANONICAL_FONT_IDENTITY_MISMATCH");
});

test("Vrije-opdruk UI bewaart één operation identity tijdens retry en begrenst asset-DOM", async () => {
  const apiSource = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(apiSource, /operationKey \|\| idempotencyKey\("order"\)/u);
  assert.match(workspaceSource, /freeOrderOperationKey \?\?= clientDraftId\("free-order"\)/u);
  assert.match(workspaceSource, /if \(freeOrderSubmitting\) return/u);
  assert.match(workspaceSource, /PRODUCTION_ASSET_RESULT_LIMIT = 60/u);
  assert.match(workspaceSource, /zoek specifieker voor de rest/u);
  assert.match(workspaceSource, /Voor deze tekst ontbreekt het exact bevestigde lettertypebestand/u);
  assert.match(workspaceSource, /Alleen de bij deze vereniging bevestigde contourbron ontbreekt nog/u);
  assert.match(workspaceSource, /gecontroleerde SVG-nummerset voor/u);
  assert.match(workspaceSource, /gecontroleerde letter-\/fontbron voor/u);
  assert.match(workspaceSource, /application=FONT/u);
  assert.match(workspaceSource, /profile\.productionSourceSetFields\?\.includes\(field\)/u);
  assert.match(workspaceSource, /authoritative SVG-nummerset ontbreekt/u);
  assert.match(workspaceSource, /Een lettertype of bron voor een andere positie wordt niet hergebruikt/u);
});
