export type TeamkitProductType = "UPPER_GARMENT" | "LOWER_GARMENT" | "SPORTS_BAG" | "BACKPACK" | "OTHER";

export interface TeamkitProductDescriptor {
  id?: string;
  articleNumber?: string;
  name?: string;
  category?: string;
  teamwearCatalog?: {
    category?: string;
    model?: string;
  };
}

export interface TeamkitSurfaceTruth {
  productType: TeamkitProductType;
  physicalSides: readonly ("FRONT" | "BACK")[];
  printableSides: readonly ("FRONT" | "BACK")[];
  placements: Readonly<Record<"FRONT" | "BACK", readonly string[]>>;
}

export function canonicalTeamkitProductType(value: unknown): TeamkitProductType | null;
export function canonicalTeamkitSurfaceTruth(productType: unknown): TeamkitSurfaceTruth;
export function canonicalTeamkitArticleSurfaceTruth(article: TeamkitProductDescriptor & { teamwearProductTruth?: unknown }): TeamkitSurfaceTruth & { authority: string; evidenceKind: string; evidenceReference: string };
export function inferCanonicalTeamkitProductType(article?: TeamkitProductDescriptor | null): TeamkitProductType;
