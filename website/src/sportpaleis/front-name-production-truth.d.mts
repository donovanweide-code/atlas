export interface FrontNameArticleTruth {
  readonly articleNumber: string;
  readonly association: string;
  readonly fontProfile: string | null;
  readonly applicability: "VERIFIED" | "CATALOG_CONFLICT";
  readonly fontAssetStatus: "DATA_GAP";
  readonly attention: string;
}

export const FRONT_NAME_DECORATION: Readonly<{
  id: "frontName";
  label: "Naamopdruk (voorkant)";
  placement: "FRONT";
  physicalHeightMm: 20;
  textTransform: "UPPERCASE";
  source: string;
}>;
export const FRONT_NAME_ARTICLE_TRUTH: readonly FrontNameArticleTruth[];
export function normalizeFrontName(value: unknown): string;
export function frontNameTruthForArticle(articleNumber: unknown): FrontNameArticleTruth | null;
