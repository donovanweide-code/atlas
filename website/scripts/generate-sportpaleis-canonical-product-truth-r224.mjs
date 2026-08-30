import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-final-prelive-catalog.generated.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "config", "sportpaleis-canonical-teamwear-product-truth-r224.generated.mjs");

const SURFACES = Object.freeze({
  UPPER_GARMENT: { physicalSides: ["FRONT", "BACK"], printableSides: ["FRONT", "BACK"] },
  LOWER_GARMENT: { physicalSides: ["FRONT", "BACK"], printableSides: ["FRONT"] },
  SPORTS_BAG: { physicalSides: ["FRONT", "BACK"], printableSides: ["FRONT", "BACK"] },
  BACKPACK: { physicalSides: ["FRONT", "BACK"], printableSides: ["FRONT"] },
});

function discoveredProductType(article) {
  const source = article.name.toLocaleLowerCase("nl-NL");
  if (/rugtas|backpack/iu.test(source)) return "BACKPACK";
  if (/sporttas|voetbaltas|sportas|pro bag|\bbag senior\b/iu.test(source)) return "SPORTS_BAG";
  if (article.supports.includes("shortsNumber") || /short|broek|pants|\bpant\b|trouser|rok|skirt|kous/iu.test(source)) return "LOWER_GARMENT";
  if (article.supports.includes("backNumber") || article.supports.includes("chestNumber") || /shirt|top|jas|jack|jacket|trui|sweater|polo|vest|hoodie|jersey|zip|trainingspak|kledingpakket|windbreaker/iu.test(source)) return "UPPER_GARMENT";
  return null;
}

const truth = {};
for (const article of [...SPORTPALEIS_LIVE_PILOT_ARTICLES].sort((left, right) => left.id.localeCompare(right.id))) {
  const productType = discoveredProductType(article);
  if (!productType) throw new Error(`Geen bewijsbare Teamwear-productsoort voor ${article.id} (${article.articleNumber}).`);
  const surface = SURFACES[productType];
  const mediaVariantIds = [...new Set((article.catalogMedia ?? []).filter(({ classification }) => classification === "SOURCE_GALLERY_ORDER_V1").map(({ sourceProductId, sourceColorId }) => `${sourceProductId ?? "?"}:${sourceColorId ?? "?"}`))].sort();
  truth[article.id] = {
    version: "SPORTPALEIS_CANONICAL_TEAMWEAR_PRODUCT_TRUTH_V1",
    status: "PROVEN",
    sourceArticleId: article.id,
    articleNumber: article.articleNumber,
    productType,
    physicalSides: surface.physicalSides,
    printableSides: surface.printableSides,
    authority: "SPORTPALEIS_PRODUCT_TRUTH_RECONCILIATION_R224",
    evidenceKind: "OFFICIAL_CATALOG_ARTICLE+PRODUCTION_CAPABILITY",
    evidenceReference: [article.catalogProvenance?.url, article.profileId, `supports:${[...article.supports].sort().join(",")}`, `media:${mediaVariantIds.join(",") || "none"}`].filter(Boolean).join(" | "),
    reconciledAt: "2026-08-30",
  };
}

const source = `// Gegenereerd door scripts/generate-sportpaleis-canonical-product-truth-r224.mjs. Niet handmatig wijzigen.\nexport const SPORTPALEIS_CANONICAL_TEAMWEAR_PRODUCT_TRUTH_R224 = Object.freeze(${JSON.stringify(truth, null, 2)});\n`;
await writeFile(output, source, "utf8");
process.stdout.write(`${output}\n${Object.keys(truth).length} canonical article truths\n`);
