import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-final-prelive-catalog.generated.mjs";
import { generateProposalPdf, normalizeProposalItems, proposalSnapshot, proposalSha256, renderProposalPreview } from "../src/sportpaleis/teamkit-proposals.mjs";

const article = SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ id }) => id === "sp-live-138505");
if (!article) throw new Error("Evidence-artikel sp-live-138505 ontbreekt.");
const front = article.catalogMedia?.find(({ kind }) => kind === "FRONT");
const back = article.catalogMedia?.find(({ kind }) => kind === "BACK");
if (!front || !back) throw new Error("Evidence-artikel mist een bewezen voor- of achterbron.");
if (front.sourceProductId !== back.sourceProductId || front.sourceColorId !== back.sourceColorId || front.colorLabel !== back.colorLabel) throw new Error("Voor- en achterbron horen niet bij dezelfde variant.");

const catalogSnapshot = {
  catalogProductId: article.id,
  brand: "Sportpaleis",
  supplierName: "Sportpaleis",
  supplierArticleName: article.name,
  supplierArticleNumber: article.supplierArticleNumber ?? article.articleNumber,
  category: article.category,
  collection: null,
  audience: [],
  colorLabel: front.colorLabel,
  imageKey: front.imageKey,
  backImageKey: back.imageKey,
  frontSourceUrl: front.sourceUrl,
  backSourceUrl: back.sourceUrl,
  sourceProductId: front.sourceProductId,
  sourceColorId: front.sourceColorId,
  mediaClassification: front.classification,
  advicePriceEur: 59.99,
  effectivePriceEur: 54.99,
  priceLabel: "Jullie prijs",
  minimumQuantity: null,
  pricingPolicyRef: "EVIDENCE_ONLY",
  sourceAdapterId: "sportpaleis-existing",
  sourceStatus: "AUTHORITATIVE",
};
const proposal = {
  id: "proposal-real-front-back-evidence",
  proposalNumber: "TKV-REAL-FRONT-BACK",
  currentRevision: 2,
  title: "Almere Pioneers varsity",
  type: "TEAMKIT",
  customer: { id: "evidence-customer", name: "Almere Pioneers", contactName: "Teamcommissie", email: "", phone: "" },
  association: { id: "association-03", name: "Almere Pioneers" },
  team: "Selectie",
  season: "2026/2027",
  category: "Presentatie",
  deadline: null,
  notes: "Visueel bewijs van dezelfde officiële voor- en achterbron door voorstel en PDF.",
  sources: [],
  items: normalizeProposalItems([{
    id: "jacket",
    articleId: article.id,
    articleNumber: article.articleNumber,
    productName: article.name,
    color: front.colorLabel,
    quantity: 12,
    sizes: ["M", "L", "XL"],
    catalogSnapshot,
    placements: [
      { id: "back-34", kind: "BACK_NUMBER", label: "Rugnummer", side: "BACK", preset: "BACK_UPPER", text: "34", widthPercent: 24, colorOverride: "#ffffff", route: "NOG_TE_BEPALEN" },
      { id: "front-name", kind: "NAME", label: "Naam", side: "FRONT", preset: "CHEST_RIGHT", text: "PIERSMA", widthPercent: 22, colorOverride: "#ffffff", route: "NOG_TE_BEPALEN" },
    ],
  }]),
};
const state = { articles: SPORTPALEIS_LIVE_PILOT_ARTICLES, associations: [], productionElements: [] };
const snapshot = proposalSnapshot(proposal, state);
const pdf = await generateProposalPdf(snapshot, false, { state, proposal });
const preview = renderProposalPreview(snapshot, { customer: true });
const outputRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../outputs/deep-candidate-review/teamwear-front-back");
await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "TKV-REAL-FRONT-BACK-V2.pdf"), pdf);
await writeFile(path.join(outputRoot, "TKV-REAL-FRONT-BACK-V2.preview.html"), `${preview}\n`);
await writeFile(path.join(outputRoot, "TKV-REAL-FRONT-BACK-V2.identity.json"), `${JSON.stringify({
  proposalId: proposal.id,
  proposalNumber: proposal.proposalNumber,
  revision: proposal.currentRevision,
  articleId: article.id,
  productId: front.sourceProductId,
  colorId: front.sourceColorId,
  colorLabel: front.colorLabel,
  front: { imageKey: front.imageKey, sourceUrl: front.sourceUrl, sha256: snapshot.items[0].visualGarmentSources.FRONT.sha256 },
  back: { imageKey: back.imageKey, sourceUrl: back.sourceUrl, sha256: snapshot.items[0].visualGarmentSources.BACK.sha256 },
  snapshotSha256: proposalSha256(JSON.stringify(snapshot)),
  pdfSha256: proposalSha256(pdf),
}, null, 2)}\n`);
console.log(`Front/back PDF-evidence geschreven naar ${outputRoot}`);
