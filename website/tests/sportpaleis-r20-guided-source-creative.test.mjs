import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { proposalPlacementVisualBytes } from "../src/sportpaleis/teamkit-proposals.mjs";

const passwords = { kevin: "R20-Source-Admin!", patrick: "R20-Source-Operator!", collega: "R20-Source-Store!", "donovan-support": "R20-Source-Support!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

function numberSetSvg() {
  const glyphs = Array.from({ length: 10 }, (_, digit) => `<g id="digit-${digit}"><path d="M ${digit * 75 + 5} 5 h ${35 + digit} v 100 h -${35 + digit} z"/></g>`).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 120">${glyphs}</svg>`, "utf8");
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-r20-guided-source-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { service, store, admin };
}

test("Guided Source Setup registreert één immutable SVG-bron retry-safe en koppelt die exact aan Buitenboys Spain short", async (context) => {
  const { service, store, admin } = await fixture(context);
  const before = await store.read();
  const association = before.associations.find(({ name }) => name === "SC Buitenboys");
  const profileId = "profile-source-sc-buitenboys-shortsNumber";
  assert.ok(association);
  assert.equal(before.productionProfiles.find(({ id }) => id === profileId).fontProfile, "Spain");

  const bytes = numberSetSvg();
  const source = await service.createProductionAssetSource(admin.token, admin.csrfToken, {
    filename: "Spain-original-controlled.svg",
    mimeType: "image/svg+xml",
    dataBase64: bytes.toString("base64"),
    provenance: "HUMAN SOURCE ACTION REQUIRED fixture · representeert uitsluitend de door Donovan aan te leveren bron",
    intakeKind: "NUMBER_SET",
    conversionMethod: "HUMAN_VERIFIED_SVG",
  });
  const candidates = source.candidates.filter(({ reviewCategory }) => reviewCategory === "NUMBER_GLYPH");
  assert.equal(candidates.length, 10);
  const input = {
    candidateIds: candidates.map(({ id }) => id),
    glyphMap: Object.fromEntries(candidates.map(({ id }, digit) => [String(digit), id])),
    name: "Spain productiebron",
    ownerType: "ASSOCIATION",
    ownerName: association.name,
    productionMethod: "SELF_PRODUCED",
    widthMm: 0,
    heightMm: 75,
    defaultFoilColor: "Wit",
    contexts: [{ type: "ASSOCIATION", id: association.id, label: association.name }],
    applications: [{ kind: "NUMBER_SET", placement: "Short/rok" }],
    productionProfileId: profileId,
    proofAuthority: "HUMAN_ACCEPTANCE",
  };
  const first = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, input);
  const retry = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, input);
  assert.equal(retry.id, first.id);
  assert.equal(retry.registrationId, first.registrationId);
  await assert.rejects(
    service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { ...input, applications: [{ kind: "NUMBER_SET", placement: "Rug" }] }),
    (error) => error?.code === "PRODUCTION_ASSET_PROFILE_PLACEMENT_MISMATCH",
  );
  const otherAssociation = before.associations.find(({ name }) => name === "Almere Pioneers");
  await assert.rejects(
    service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, {
      ...input,
      ownerName: otherAssociation.name,
      contexts: [{ type: "ASSOCIATION", id: otherAssociation.id, label: otherAssociation.name }],
      productionProfileId: "profile-pioneers-shorts",
    }),
    (error) => error?.code === "PRODUCTION_ASSET_SOURCE_REUSE_MISMATCH",
    "dezelfde immutable bytes mogen niet op basis van sport/maat als bron voor een andere vereniging worden gepromoveerd",
  );

  const persisted = await store.read();
  assert.equal(persisted.productionAssetSources.find(({ id }) => id === source.id).original.dataBase64, bytes.toString("base64"));
  assert.equal(persisted.productionElements.filter(({ registrationId }) => registrationId === first.registrationId).length, 1);
  assert.deepEqual(persisted.productionProfiles.find(({ id }) => id === profileId).productionNumberAssetIds, [first.id]);
  assert.ok(persisted.audit.some(({ subject, details }) => subject === profileId && details.productionAssetId === first.id && details.sourceSha256 === source.original.sha256));

  const placement = { id: "guided-spain-preview", label: "Shortnummer", text: "34", productionAssetId: first.id, physicalSizeOverride: { heightMm: 75 }, productionRule: { foilColor: "Wit" } };
  const preview34 = proposalPlacementVisualBytes(placement, { id: "guided-spain-proposal", association: { name: association.name }, sources: [] }, persisted);
  const preview19 = proposalPlacementVisualBytes({ ...placement, text: "19" }, { id: "guided-spain-proposal", association: { name: association.name }, sources: [] }, persisted);
  const preview1234 = proposalPlacementVisualBytes({ ...placement, text: "1234" }, { id: "guided-spain-proposal", association: { name: association.name }, sources: [] }, persisted);
  assert.match(preview34.toString("utf8"), /^<svg/u);
  assert.match(preview19.toString("utf8"), /^<svg/u);
  assert.notDeepEqual(preview34, preview19, "De Teamwear/PDF-projectie moet exact met de gekozen nummerwaarde wijzigen.");
  assert.match(preview1234.toString("utf8"), /^<svg/u, "Studio, preview, PDF en productie delen dezelfde 1–4-cijfergrens.");

  const order = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: "GUIDED-SPAIN-34", provenance: "R20 Guided Source contract", association: association.name, customer: "Buitenboys source proof", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ articleId: "sp-live-140294", size: "L", quantity: 1, deviation: true, overrides: { ...empty, shortsNumber: "34" } }],
  }, "r20-guided-spain-order")).value;
  const line = order.productionLines.find(({ personalizationField }) => personalizationField === "shortsNumber");
  assert.equal(line.quantity, 1);
  assert.equal(line.decorationIdentity.foilColor, "Wit");
  assert.equal(line.heightMm, 75);
  assert.equal(line.validation.status, "VALID");
  assert.deepEqual({ kind: line.source.kind, id: line.source.id, version: line.source.version }, { kind: "PRODUCTION_ELEMENT", id: first.id, version: first.version });
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "r20-guided-spain-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "r20-guided-spain-proposal")).value;
  assert.equal(proposal.groups[0].productionLineRefs.filter(({ orderId }) => orderId === order.id).length, 1);
});

test("Guided Setup en Studio exposen de concrete bronactie en touch-safe canvascontrols", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const studio = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/sportpaleis-teamwear.css", import.meta.url), "utf8");
  const workspaceStyles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(workspace, /HUMAN SOURCE ACTION REQUIRED/u);
  assert.match(workspace, /\$\{sourceProfile\.fontProfile\} letter-\/fontbron ontbreekt/u);
  assert.match(workspace, /setup=source&context=/u);
  assert.match(workspace, /productionProfileId/u);
  assert.match(workspace, /applicationPlacement/u);
  assert.match(workspace, /Bestaande bron aan dit profiel koppelen/u);
  assert.match(workspace, /Niet toepasbaar op deze ontbrekende bron/u);
  assert.match(workspace, /productionAssetReuseDecision/u);
  assert.match(workspace, /numberSourceRequirements/u);
  assert.match(workspace, /fontSourceRows/u);
  assert.match(workspace, /guidedProfile \|\| pendingSourceCount/u);
  assert.match(studio, /studio-zoom-fit/u);
  assert.match(studio, /studio-deselect/u);
  assert.match(studio, /updateToolState/u);
  assert.match(studio, /itemBackImage/u);
  assert.match(studio, /Achteraanzicht nodig<br>voor deze opdruk/u);
  assert.match(studio, /itemAllowsBack/u);
  assert.match(studio, /variant\.media\.find/u);
  assert.match(studio, /"ARTWORK", "NUMBER_SET"/u);
  assert.match(studio, /assetKind === "SHORT_NUMBER"/u);
  assert.match(studio, /production-assets\/\$\{encodeURIComponent\(asset\.id\)\}\/numbers/u);
  assert.match(studio, /image\.src = `\/api\/sportpaleis\/v1\/production-assets/u);
  assert.match(styles, /\.sp-studio-toolbar\{position:relative;z-index:12;top:auto;display:flex;width:100%;overflow-x:auto/u);
  assert.match(styles, /button\[data-requires-selection=true\]:disabled\{display:none\}/u);
  assert.match(styles, /has-guide-x:before,.sp-studio-print-area\.has-guide-y:before\{background:#d3172f\}/u);
  assert.match(styles, /Never invent a back view by mirroring branded front artwork/u);
  assert.match(styles, /\.sp-studio-garment\.is-back>img\{filter:none;transform:none\}/u);
  assert.match(styles, /\.sp-studio-resize\{right:-22px;bottom:-22px;width:44px;height:44px/u);
  assert.match(styles, /\.sp-teamwear-studio-wrap\.is-focus \.sp-teamwear-quote\{display:none\}/u);
  assert.match(workspaceStyles, /body \{ margin: 0; min-width: 0;/u);
});
