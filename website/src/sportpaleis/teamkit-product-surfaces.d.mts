export type TeamkitProductType = "UPPER_GARMENT" | "LOWER_GARMENT" | "SPORTS_BAG" | "BACKPACK" | "OTHER";

export interface TeamkitProductDescriptor {
  name?: string;
  category?: string;
  teamwearCatalog?: {
    category?: string;
    model?: string;
  };
}

export function inferCanonicalTeamkitProductType(article?: TeamkitProductDescriptor | null): TeamkitProductType;
