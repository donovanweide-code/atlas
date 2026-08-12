import type { CatalogArticle } from "./workspace-data.ts";

export type CatalogPrintField = "initials" | "name" | "backNumber" | "shortsNumber";

const PRINT_FIELDS = new Set<CatalogPrintField>(["initials", "name", "backNumber", "shortsNumber"]);

export function articlePersonalizationFields(article: CatalogArticle): CatalogPrintField[] {
  return Object.keys(article.personalizationPolicy?.fields ?? {})
    .filter((key): key is CatalogPrintField => PRINT_FIELDS.has(key as CatalogPrintField));
}

export function isOrderablePrintedArticle(article: CatalogArticle): boolean {
  return article.active
    && article.printRelevance?.status === "CONFIRMED_VISIBLE_PERSONALIZATION"
    && (articlePersonalizationFields(article).length > 0 || (article.commercialPrintOptions?.length ?? 0) > 0);
}

export function associationPersonalizationModel(articles: CatalogArticle[], association: string): {
  articles: CatalogArticle[];
  fields: CatalogPrintField[];
} {
  const configuredArticles = articles.filter((article) => article.association === association && isOrderablePrintedArticle(article));
  return {
    articles: configuredArticles,
    fields: [...new Set(configuredArticles.flatMap(articlePersonalizationFields))],
  };
}
