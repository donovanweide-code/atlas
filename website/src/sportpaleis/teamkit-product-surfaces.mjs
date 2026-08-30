export const TEAMKIT_PRODUCT_TYPES = Object.freeze(["UPPER_GARMENT", "LOWER_GARMENT", "SPORTS_BAG", "BACKPACK", "OTHER"]);

const SURFACE_TRUTH = Object.freeze({
  UPPER_GARMENT: Object.freeze({
    printableSides: Object.freeze(["FRONT", "BACK"]),
    placements: Object.freeze({
      FRONT: Object.freeze(["FRONT_CENTER_LARGE", "CHEST_LEFT", "CHEST_RIGHT", "SLEEVE_LEFT", "SLEEVE_RIGHT", "FREE_PLACEMENT"]),
      BACK: Object.freeze(["BACK_UPPER", "BACK_LOWER", "FREE_PLACEMENT"]),
    }),
  }),
  LOWER_GARMENT: Object.freeze({
    printableSides: Object.freeze(["FRONT"]),
    placements: Object.freeze({ FRONT: Object.freeze(["LEFT", "RIGHT", "FREE_PLACEMENT"]), BACK: Object.freeze([]) }),
  }),
  SPORTS_BAG: Object.freeze({
    printableSides: Object.freeze(["FRONT", "BACK"]),
    placements: Object.freeze({ FRONT: Object.freeze(["FRONT_CENTER_LARGE", "FREE_PLACEMENT"]), BACK: Object.freeze(["FREE_PLACEMENT"]) }),
  }),
  BACKPACK: Object.freeze({
    printableSides: Object.freeze(["FRONT"]),
    placements: Object.freeze({ FRONT: Object.freeze(["FRONT_CENTER_LARGE", "FREE_PLACEMENT"]), BACK: Object.freeze([]) }),
  }),
  OTHER: Object.freeze({
    printableSides: Object.freeze(["FRONT"]),
    placements: Object.freeze({ FRONT: Object.freeze(["FREE_PLACEMENT"]), BACK: Object.freeze([]) }),
  }),
});

const LEGACY_ZONE = Object.freeze({
  LINKERBORST: "CHEST_LEFT", RECHTERBORST: "CHEST_RIGHT", MIDDENBORST: "FRONT_CENTER_LARGE",
  RUG_BOVEN: "BACK_UPPER", RUG_MIDDEN: "BACK_LOWER", MOUW_LINKS: "SLEEVE_LEFT", MOUW_RECHTS: "SLEEVE_RIGHT",
  SHORT_LINKS: "LEFT", SHORT_RECHTS: "RIGHT", BROEK: "FREE_PLACEMENT", TAS: "FREE_PLACEMENT",
});

function failure(message, code, details = {}) {
  return Object.assign(new Error(message), { statusCode: 409, code, ...details });
}

export function canonicalTeamkitProductType(value) {
  return TEAMKIT_PRODUCT_TYPES.includes(value) ? value : null;
}

export function inferCanonicalTeamkitProductType(article) {
  const source = `${article?.teamwearCatalog?.category ?? ""} ${article?.category ?? ""} ${article?.teamwearCatalog?.model ?? ""} ${article?.name ?? ""}`;
  if (/rugtas|backpack/iu.test(source)) return "BACKPACK";
  if (/sporttas|voetbaltas|duffel|\btas\b|\bbag\b/iu.test(source)) return "SPORTS_BAG";
  if (/short|broek|pants|trouser|rok|skirt/iu.test(source)) return "LOWER_GARMENT";
  if (/shirt|top|jas|jacket|trui|sweater|polo|vest|hoodie|jersey|zip/iu.test(source)) return "UPPER_GARMENT";
  return "OTHER";
}

export function canonicalTeamkitSurfaceTruth(productType) {
  const canonicalType = canonicalTeamkitProductType(productType);
  if (!canonicalType) throw failure("De productspecifieke bedrukbare zijden zijn niet canoniek vastgesteld.", "TEAMKIT_PRODUCT_TYPE_REQUIRED");
  return { productType: canonicalType, ...SURFACE_TRUTH[canonicalType] };
}

export function assertCanonicalTeamkitItemSurfaceTruth(item) {
  const snapshot = item?.catalogSnapshot;
  if (!snapshot) {
    if (!(item?.placements ?? []).length) return null;
    const legacyType = inferCanonicalTeamkitProductType({ name: item?.productName ?? "", category: item?.category ?? "" });
    const truth = canonicalTeamkitSurfaceTruth(legacyType);
    for (const placement of item.placements) {
      const side = placement.side === "BACK" ? "BACK" : "FRONT";
      const preset = LEGACY_ZONE[placement.preset] ?? placement.preset;
      if (!truth.printableSides.includes(side)) throw failure(`Zijde ${side} is niet bedrukbaar voor producttype ${truth.productType}.`, "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE", { itemId: item?.id ?? null, placementId: placement.id ?? null, productType: truth.productType, side });
      if (!truth.placements[side].includes(preset)) throw failure(`Plaatsing ${preset} is niet geldig op ${side} voor producttype ${truth.productType}.`, "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED", { itemId: item?.id ?? null, placementId: placement.id ?? null, productType: truth.productType, side, preset });
    }
    return { productType: truth.productType, printableSides: [...truth.printableSides], legacyInferred: true };
  }
  const truth = canonicalTeamkitSurfaceTruth(snapshot.productType);
  const requestedSides = [...new Set(Array.isArray(snapshot.printableSides) ? snapshot.printableSides : ["FRONT"])];
  const invalidSide = requestedSides.find((side) => !truth.printableSides.includes(side));
  if (invalidSide) throw failure(`Zijde ${invalidSide} is niet bedrukbaar voor producttype ${truth.productType}.`, "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE", { itemId: item?.id ?? null, productType: truth.productType, side: invalidSide });
  for (const placement of item?.placements ?? []) {
    const side = placement.side === "BACK" ? "BACK" : "FRONT";
    const preset = LEGACY_ZONE[placement.preset] ?? placement.preset;
    if (!requestedSides.includes(side) || !truth.printableSides.includes(side)) throw failure(`Zijde ${side} is niet bedrukbaar voor producttype ${truth.productType}.`, "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE", { itemId: item?.id ?? null, placementId: placement.id ?? null, productType: truth.productType, side });
    if (!truth.placements[side].includes(preset)) throw failure(`Plaatsing ${preset} is niet geldig op ${side} voor producttype ${truth.productType}.`, "TEAMKIT_PRODUCT_PLACEMENT_NOT_ALLOWED", { itemId: item?.id ?? null, placementId: placement.id ?? null, productType: truth.productType, side, preset });
  }
  return { productType: truth.productType, printableSides: requestedSides };
}
