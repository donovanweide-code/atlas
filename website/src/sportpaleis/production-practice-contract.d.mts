export function canonicalArticlePersonalizationFields(input: {
  article: any;
  association: any;
  productionProfiles: any[];
  productType: string;
}): string[];

export function projectProductionReadyVisualAssets<T>(elements: T[], contextLabel?: string, options?: { includeAll?: boolean }): T[];

export function productionAssetContextDecision(input: {
  asset: any;
  orderKind?: string;
  associationIdentities?: unknown[];
  articleIdentities?: unknown[];
  orderId?: unknown;
}): { allowed: boolean; code: string; reason: string | null };

export function canonicalOrderFoilColors(input: { items?: any[]; productionLines?: any[] }): string[];
export function canonicalProductionLineFoilColor(order: any, line: any): string;

export function proportionalProductionAssetSize(input: {
  requestedWidthMm?: number | null;
  requestedHeightMm?: number | null;
  currentWidthMm: number;
  currentHeightMm: number;
  defaultWidthMm: number;
  defaultHeightMm: number;
  minWidthMm?: number;
  maxWidthMm?: number;
}): { widthMm: number; heightMm: number };
