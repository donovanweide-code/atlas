import type { CatalogArticle } from "./sportpaleis/workspace-data.ts";

export type SportpaleisCatalogAudience = "JUNIOR" | "SENIOR" | "MEN" | "WOMEN" | "UNISEX";

export interface SportpaleisCatalogSourceAdapter {
  id: string;
  brand: string;
  kind: "EXISTING_SPORTPALEIS" | "DEALER_FEED" | "API" | "FILE_IMPORT" | "CONTROLLED_MANUAL";
  status: "ACTIVE" | "DISCOVERY_REQUIRED";
  referenceUrl: string | null;
}

export interface SportpaleisTeamwearBrandSource {
  id: string;
  brand: "Stanno" | "Nike Teamwear" | "adidas Teamwear" | "JAKO" | "Robey" | "Craft";
  officialWebsiteUrl: string;
  officialCatalogUrl: string;
  dealerPortalUrl: string | null;
  authority: "OFFICIAL_BRAND" | "LICENSED_TEAMWEAR_PORTAL";
  discovery: "PUBLIC" | "ACCOUNT_REQUIRED";
  dataConnection: "NOT_CONNECTED";
  sourceNote: string;
}

export interface SportpaleisCatalogProduct {
  id: string;
  brand: string;
  model: string;
  category: string;
  audiences: SportpaleisCatalogAudience[];
  variants: {
    id: string;
    colorLabel: string;
    imageKey: string;
    availableSizes: string[];
    sourceArticleId: string;
    sourceArticleNumber: string;
    associationNames: string[];
  }[];
  sourceAdapterId: string;
}

export interface SportpaleisCatalogPage {
  products: SportpaleisCatalogProduct[];
  total: number;
  hasMore: boolean;
}

export const SPORTPALEIS_CATALOG_SOURCE_ADAPTERS: readonly SportpaleisCatalogSourceAdapter[] = Object.freeze([
  { id: "sportpaleis-existing", brand: "Sportpaleis", kind: "EXISTING_SPORTPALEIS", status: "ACTIVE", referenceUrl: null },
  { id: "stanno-official", brand: "Stanno", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://www.stanno.com/nl/service/catalogus" },
  { id: "nike-teamwear-official", brand: "Nike Teamwear", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://niketeamsport.com/en/" },
  { id: "adidas-teamwear-official", brand: "adidas Teamwear", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://www.adidas.nl/voetbal-teamwear" },
  { id: "jako-official", brand: "JAKO", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://www.jako.com/nl-nl/service/catalogi-downloads/" },
  { id: "robey-official", brand: "Robey", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://robeysportswear.com/nl-nl/collections/alle-collecties" },
  { id: "craft-official", brand: "Craft", kind: "CONTROLLED_MANUAL", status: "DISCOVERY_REQUIRED", referenceUrl: "https://www.craftsportswear.com/global/teamwear" },
]);

/**
 * Controlled discovery references only. These records deliberately do not claim
 * a connected feed, copied catalogue or usage right. Imported product truth must
 * still enter through a bounded source adapter with explicit provenance.
 */
export const SPORTPALEIS_TEAMWEAR_BRAND_SOURCES: readonly SportpaleisTeamwearBrandSource[] = Object.freeze([
  { id: "stanno-official", brand: "Stanno", officialWebsiteUrl: "https://www.stanno.com/nl/", officialCatalogUrl: "https://www.stanno.com/nl/service/catalogus", dealerPortalUrl: null, authority: "OFFICIAL_BRAND", discovery: "PUBLIC", dataConnection: "NOT_CONNECTED", sourceNote: "Officiële Nederlandse catalogusroute; geen productfeed geclaimd." },
  { id: "nike-teamwear-official", brand: "Nike Teamwear", officialWebsiteUrl: "https://www.nike.com/nl/voetbal", officialCatalogUrl: "https://niketeamsport.com/en/", dealerPortalUrl: "https://niketeamsport.com/en/login", authority: "LICENSED_TEAMWEAR_PORTAL", discovery: "ACCOUNT_REQUIRED", dataConnection: "NOT_CONNECTED", sourceNote: "Europees Nike Teamwear-portaal van de globale teamwear-licentiehouder; toegang en feed blijven te bevestigen." },
  { id: "adidas-teamwear-official", brand: "adidas Teamwear", officialWebsiteUrl: "https://www.adidas.nl/", officialCatalogUrl: "https://www.adidas.nl/voetbal-teamwear", dealerPortalUrl: null, authority: "OFFICIAL_BRAND", discovery: "PUBLIC", dataConnection: "NOT_CONNECTED", sourceNote: "Officiële Nederlandse Teamwear-productroute; geen productfeed geclaimd." },
  { id: "jako-official", brand: "JAKO", officialWebsiteUrl: "https://www.jako.com/nl-nl/", officialCatalogUrl: "https://www.jako.com/nl-nl/service/catalogi-downloads/", dealerPortalUrl: null, authority: "OFFICIAL_BRAND", discovery: "PUBLIC", dataConnection: "NOT_CONNECTED", sourceNote: "Officiële Nederlandse catalogusdownloads; geen productfeed geclaimd." },
  { id: "robey-official", brand: "Robey", officialWebsiteUrl: "https://robeysportswear.com/nl-nl/", officialCatalogUrl: "https://robeysportswear.com/nl-nl/collections/alle-collecties", dealerPortalUrl: null, authority: "OFFICIAL_BRAND", discovery: "PUBLIC", dataConnection: "NOT_CONNECTED", sourceNote: "Officiële Nederlandse collectiebron; geen productfeed geclaimd." },
  { id: "craft-official", brand: "Craft", officialWebsiteUrl: "https://www.craftsportswear.com/nl/", officialCatalogUrl: "https://www.craftsportswear.com/global/teamwear", dealerPortalUrl: null, authority: "OFFICIAL_BRAND", discovery: "PUBLIC", dataConnection: "NOT_CONNECTED", sourceNote: "Officiële Teamwear-collectiebron; geen productfeed geclaimd." },
]);

function normalizedModelName(article: CatalogArticle): string {
  return article.name.replace(/^.+?\s(?=(wedstrijd|reserve|training|presentatie|keepers?|stadio|full zip|zip top|regen|winter|sporttas|rugtas))/iu, "").trim();
}

function productKey(article: CatalogArticle): string {
  const supplier = article.supplierArticleNumber?.trim();
  return supplier && /^\d{5,}$/u.test(supplier) ? `supplier:${supplier}` : `model:${normalizedModelName(article).toLocaleLowerCase("nl-NL")}`;
}

function audienceFor(article: CatalogArticle): SportpaleisCatalogAudience[] {
  const source = `${article.name} ${(article.variantLabels ?? []).join(" ")}`.toLocaleLowerCase("nl-NL");
  if (/dames|women|female/iu.test(source)) return ["SENIOR", "WOMEN"];
  if (/heren|men|male/iu.test(source)) return ["SENIOR", "MEN"];
  const sizes = article.availableSizes ?? [];
  const hasJunior = sizes.some((size) => /^\d{2,3}$/u.test(size));
  const hasSenior = sizes.some((size) => /^[2-6]?X?[SLM]$/iu.test(size) || /^(XS|S|M|L|XL|XXL|XXXL)$/iu.test(size));
  return [...(hasJunior ? ["JUNIOR" as const] : []), ...(hasSenior ? ["SENIOR" as const] : []), "UNISEX"];
}

/**
 * Central, brand-independent discovery projection. Size SKU rows are collapsed into
 * model/variant cards; association names remain references and never cause a copy.
 * A future Stanno/Nike adapter emits this same shape.
 */
export function buildSportpaleisProductCatalog(articles: readonly CatalogArticle[]): SportpaleisCatalogProduct[] {
  const products = new Map<string, SportpaleisCatalogProduct>();
  for (const article of articles.filter(({ active }) => active)) {
    const key = productKey(article);
    const product = products.get(key) ?? {
      id: `catalog-${key.replace(/[^a-z0-9]+/giu, "-")}`,
      brand: /stanno|stadio|pride|bolt/iu.test(article.name) ? "Stanno" : "Sportpaleis",
      model: normalizedModelName(article),
      category: article.category,
      audiences: audienceFor(article),
      variants: [],
      sourceAdapterId: "sportpaleis-existing",
    };
    const existingVariant = product.variants.find(({ sourceArticleNumber }) => sourceArticleNumber === article.articleNumber);
    if (!existingVariant) product.variants.push({
      id: `variant-${article.id}`,
      colorLabel: "Bestaande clubvariant",
      imageKey: article.imageKey,
      availableSizes: [...new Set(article.availableSizes ?? [])],
      sourceArticleId: article.id,
      sourceArticleNumber: article.articleNumber,
      associationNames: [article.association],
    });
    else if (!existingVariant.associationNames.includes(article.association)) existingVariant.associationNames.push(article.association);
    product.audiences = [...new Set([...product.audiences, ...audienceFor(article)])];
    products.set(key, product);
  }
  return [...products.values()].sort((left, right) => left.brand.localeCompare(right.brand, "nl-NL") || left.model.localeCompare(right.model, "nl-NL"));
}

function audienceMatches(product: SportpaleisCatalogProduct, audience: SportpaleisCatalogAudience | null): boolean {
  if (!audience) return true;
  if (audience === "MEN" || audience === "WOMEN") return product.audiences.includes(audience) || product.audiences.includes("UNISEX");
  return product.audiences.includes(audience);
}

export function querySportpaleisProductCatalog(products: readonly SportpaleisCatalogProduct[], input: { associationName?: string | null; audience?: SportpaleisCatalogAudience | null; query?: string; limit?: number; offset?: number } = {}): SportpaleisCatalogPage {
  const query = input.query?.trim().toLocaleLowerCase("nl-NL") ?? "";
  const association = input.associationName?.trim().toLocaleLowerCase("nl-NL") ?? "";
  const filtered = products.filter((product) => audienceMatches(product, input.audience ?? null) && (!query || `${product.brand} ${product.model} ${product.category}`.toLocaleLowerCase("nl-NL").includes(query)) && (!association || product.variants.some(({ associationNames }) => associationNames.some((name) => name.toLocaleLowerCase("nl-NL") === association))));
  const offset = Math.max(0, input.offset ?? 0); const limit = Math.max(1, Math.min(48, input.limit ?? 12));
  return { products: filtered.slice(offset, offset + limit), total: filtered.length, hasMore: offset + limit < filtered.length };
}
