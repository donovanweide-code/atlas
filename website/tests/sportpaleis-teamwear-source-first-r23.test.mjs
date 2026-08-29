import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeProposalItems, proposalSha256, proposalSnapshot, renderProposalPreview } from "../src/sportpaleis/teamkit-proposals.mjs";

const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
const teamwear = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
const experience = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
const service = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");

function directItem(sourceId, productType, printableSides) {
  return normalizeProposalItems([{ id: "item-1", articleId: null, articleNumber: "REF-1", productName: "Werkelijk bronartikel", color: "Marine", quantity: null, sizes: [], team: null, notes: null, catalogSnapshot: { catalogProductId: `proposal-source:${sourceId}`, brand: "Eigen bron", supplierName: "Directe artikelbron", supplierArticleName: "Werkelijk bronartikel", supplierArticleNumber: "REF-1", category: productType, collection: null, audience: [], colorLabel: "Marine", imageKey: `proposal-source:${sourceId}`, advicePriceEur: null, effectivePriceEur: null, priceLabel: null, minimumQuantity: null, pricingPolicyRef: null, sourceAdapterId: "proposal-direct-source", sourceStatus: "AUTHORITATIVE", directFrontSourceId: sourceId, productType, printableSides, sourceReference: "Officiële catalogus pagina 18" }, placements: [] }])[0];
}

test("Teamwear begint bij een echte artikelbron en maakt context optioneel", () => {
  assert.match(teamwear, /Met welk artikel wil je beginnen/u);
  assert.match(teamwear, /Plak of sleep het productbeeld hier/u);
  assert.match(teamwear, /Vereniging of klant koppelen \(optioneel\)/u);
  assert.match(teamwear, /Open direct in Studio/u);
  assert.match(workspace, /pendingTeamwearProductSourceFile/u);
  assert.match(workspace, /proposal-direct-source/u);
  assert.match(workspace, /#teamkit-studio/u);
});

test("directe productbron blijft immutable in proposal snapshot en klantpreview", () => {
  const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="navy"/></svg>');
  const source = { id: "source-front", filename: "artikel.svg", mimeType: "image/svg+xml", format: "SVG", sha256: proposalSha256(bytes), sizeBytes: bytes.length, immutable: true, dataBase64: bytes.toString("base64"), safePreviewSvg: bytes.toString("utf8"), uploadedAt: "2026-08-29T00:00:00.000Z", uploader: { kind: "EMPLOYEE", id: "codex", name: "Codex" }, proposalId: "proposal-1", associationName: null, version: 1, quality: { status: "VECTOR_SUITABLE" } };
  const proposal = { id: "proposal-1", proposalNumber: "PV-2026-0001", currentRevision: 2, title: "Bronvoorstel", type: "Teamwear", customer: { id: null, name: "Test", contactName: "", email: "", phone: null }, association: { id: null, name: null }, team: null, season: null, category: null, deadline: null, notes: null, items: [directItem(source.id, "BACKPACK", ["FRONT"])], sources: [source] };
  const snapshot = proposalSnapshot(proposal, { articles: [], productionElements: [], associations: [] });
  assert.equal(snapshot.items[0].visualGarmentSources.FRONT.sha256, source.sha256);
  assert.equal(snapshot.items[0].catalogSnapshot.sourceReference, "Officiële catalogus pagina 18");
  const preview = renderProposalPreview(snapshot, { customer: true });
  assert.match(preview, /data:image\/svg\+xml;base64/u);
  assert.equal((preview.match(/<figure class="tk-garment">/gu) ?? []).length, 1, "rugtas toont geen verzonnen achterkant");
});

test("productspecifieke zijden zijn hard aan de proposal-truth gekoppeld", () => {
  assert.match(service, /TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE/u);
  assert.match(service, /TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID/u);
  assert.match(experience, /itemNeedsBack/u);
  assert.match(experience, /itemAllowsBack/u);
  assert.match(experience, /Deze concrete achteropdruk vraagt nog een passend achteraanzicht/u);
});

test("bekende catalogus blijft een versneller en verdwijnt uit de primaire Studio", () => {
  const sourceFirst = experience.slice(experience.indexOf("function clubHome"), experience.indexOf("function collectionBoard"));
  assert.match(sourceFirst, /Meer artikelbronnen of context gebruiken/u);
  const currentStudio = experience.slice(experience.indexOf("function legacyStudio("), experience.indexOf("function reviewPlacement"));
  assert.doesNotMatch(currentStudio, /<strong>Catalogus<\/strong>/u);
  assert.match(currentStudio, /<summary>Meer artikelen<\/summary>/u);
});
