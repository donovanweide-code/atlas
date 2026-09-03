import type { CatalogArticle, OrderPersonalization } from "./workspace-data.ts";

export type CatalogPersonalizationPriceResolution =
  | { status: "PRICED"; normalizedValue: string; unitPriceEur: number; reason: null }
  | { status: "EMPTY" | "INVALID" | "MISSING_PRICE"; normalizedValue: string; unitPriceEur: null; reason: string | null };

export function resolveCatalogPersonalizationPrice(
  article: CatalogArticle,
  field: keyof OrderPersonalization,
  input: unknown,
): CatalogPersonalizationPriceResolution;

export function catalogPersonalizationPriceHint(
  article: CatalogArticle,
  field: keyof OrderPersonalization,
): string | null;
