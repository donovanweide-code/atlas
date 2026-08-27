export interface FrontNameArticleTruth {
  readonly articleNumber: string;
  readonly association: string;
  readonly fontProfile: string | null;
  readonly applicability: "VERIFIED";
  readonly fontAssetStatus: "DATA_GAP" | "IDENTITY_VERIFIED_INGEST_BLOCKED";
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
export const OWNER_SUPPLIED_FONT_EVIDENCE: Readonly<Record<"arialRegular" | "spain", Readonly<Record<string, string>>>>;
export const UDA_FRONT_NAME_TRUTH: Readonly<{
  association: string;
  webshopLabel: "Naam opdruk";
  operationalDecorationId: "frontName";
  customerSurchargeEur: 6.5;
  fontProfile: null;
  fontAssetStatus: "DATA_GAP";
  articleNumber: null;
  applicability: "ASSOCIATION_VERIFIED_ARTICLE_UNESTABLISHED";
  attention: string;
}>;
export function normalizeFrontName(value: unknown): string;
export function frontNameTruthForArticle(articleNumber: unknown): FrontNameArticleTruth | null;
