export const SPORTPALEIS_CONFIGURATION_VERSION = "SPW-CONFIG-BEDRUKKING-004-20260810";

export const SPORTPALEIS_CONFIGURATION_SOURCES = Object.freeze({
  productionMatrix: Object.freeze({
    file: "info bedrukkingen 2026.xlsx",
    sheet: "Blad1",
    range: "A1:J21",
    authority: "Verenigingsspecifieke letterprofielen, foliekleuren en bronmaten",
  }),
  productionConstruction: Object.freeze({
    file: "Untitled-43.ai",
    authority: "Algemene praktijkreferentie voor snijpaden, compound paths, groepering, rotatie, maatvoering, folieplaatsing en productie-indeling",
  }),
  contourReference: Object.freeze({
    file: "Pioneers nummers.ai",
    authority: "Uitsluitend de eerder gevalideerde specifieke cijfercontouren",
  }),
  physicalSeniorTest: Object.freeze({
    file: "Sportpaleis-Snijtest-001-2-34-77.ai",
    authority: "Gevalideerde testmaat Almerer Pioneers Senior 200 mm; niet generaliseren naar andere verenigingen",
  }),
  identity: Object.freeze({
    primary: "NEW2025-CID_Manual_BENE sep 25.pdf",
    selectedVariant: "Alle Sport2000 Sportpaleis logo's 2026.pdf",
  }),
});

const source = (row) => ({
  file: SPORTPALEIS_CONFIGURATION_SOURCES.productionMatrix.file,
  sheet: SPORTPALEIS_CONFIGURATION_SOURCES.productionMatrix.sheet,
  range: `A${row}:J${row}`,
});

const association = (row, name, sourceName, fontProfile, foilColors, dimensions = {}, notes = "") => Object.freeze({
  id: `association-${String(row).padStart(2, "0")}`,
  name,
  sourceName,
  active: true,
  source: source(row),
  fontProfile,
  foilColors,
  dimensionsCm: Object.freeze({
    initialsShirt: dimensions.initialsShirt ?? null,
    backNumberJuniorSourceValue: dimensions.backNumberJuniorSourceValue ?? null,
    backNumberSenior: dimensions.backNumberSenior ?? null,
    chestNumber: dimensions.chestNumber ?? null,
    shortsNumber: dimensions.shortsNumber ?? null,
    nameHeight: dimensions.nameHeight ?? null,
  }),
  juniorValidationStatus: "DATA_GAP",
  juniorPhysicalHeightMm: null,
  juniorValidationNote: "De bronwaarde is nog niet fysiek bevestigd door Sportpaleis productie en wordt daarom niet als productiemaat gebruikt.",
  notes,
  articleCatalogStatus: name === "A.S.C. Waterwijk"
    ? "PILOT_CATALOG_PRESERVED_SOURCE_VALIDATION_PARTIAL"
    : name === "FC Almere"
      ? "PARTIAL_SINGLE_ARTICLE_SOURCE_VALIDATION_REQUIRED"
      : "NO_VALIDATED_ARTICLES",
});

export const SPORTPALEIS_ASSOCIATIONS = Object.freeze([
  association(2, "Almere'81", "Almere'81", "Myriad Pro - Italic", [], {}, "Bedrukking volgens bron: doen we zelf."),
  association(3, "Almerer Pioneers", "Almerer Pioneers", "FFF englisch | zie map 'Pioneers'", ["Wit"], { backNumberJuniorSourceValue: 16, backNumberSenior: 20, chestNumber: 8, shortsNumber: 8, nameHeight: 2 }, "Maximale naambreedte 9 cm; Caps Lock aan."),
  association(4, "As,8o", "As,8o", "Spain", ["Wit"], { initialsShirt: 3, shortsNumber: 7.5 }),
  association(5, "A.S.C. Waterwijk", "ASC Waterwijk.", "schluber (spain = thuis wedstrijdshirt/short)", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }, "Wedstrijdshirt thuis is zwart; maximale breedte 22,5 cm."),
  association(6, "Brouwersports", "Brouwersports", "schluber", ["Wit"], { initialsShirt: 3, shortsNumber: 7.5, nameHeight: 5 }),
  association(7, "Buitenhout MHC", "Buitenhout MHC", "Myrad pro - Bold / zie map 'Buitenhout'", ["Wit"], { backNumberJuniorSourceValue: 20, backNumberSenior: 20, shortsNumber: 7.5, nameHeight: 5 }, "Nummer is outline; naam met hoofdletter."),
  association(8, "DCG", "DCG", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(9, "EKVA", "EKVA", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, chestNumber: 7.5, shortsNumber: 7.5, nameHeight: 5 }),
  association(10, "FC Almere", "Fc Almere.", "schluber (spain = thuis wedstrijdshirt/short)", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(11, "FC Huizen", "FC Huizen", "spain", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, chestNumber: 3, shortsNumber: 7.5, nameHeight: 5 }),
  association(12, "HBSA", "HBSA", "Viking-Normal", ["Geel"], { nameHeight: 2 }, "Bedrukking volgens bron: doen we zelf."),
  association(13, "MHC Lelystad", "MHC Lelystad", "Myrad pro - Bold / zie map 'Lelystad'", ["Wit", "Zwart"], { backNumberJuniorSourceValue: 20, backNumberSenior: 22, nameHeight: 3.2 }, "Uit is zwart; thuis is wit. Nummer is outline; naam met hoofdletter."),
  association(14, "Najaden", "Najaden", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 20, chestNumber: 7.5, shortsNumber: 7.5, nameHeight: 5 }),
  association(15, "SC Buitenboys", "SC Buitenboys", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }, "Wedstrijdshirt thuis is navy blue."),
  association(16, "SC Geinburgia", "SC Geinburgia", "Spain", ["Wit"], { initialsShirt: 3.5, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(17, "Sporting Almere", "Sporting Almere", "Spain", ["Wit"], { initialsShirt: 3.5, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(18, "VVA / Spartaan", "Vva / Spartaan", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }, "Wedstrijdshirt thuis is zwart."),
  association(19, "Wooter", "Wooter", "spain", ["Wit"], { initialsShirt: 3.5 }),
  association(20, "Sloeproeien", "Sloeproeien", "X", ["Wit"]),
  association(21, "Hasselbaink", "Hasselbaink", "Spain", ["Wit"], { backNumberJuniorSourceValue: 20, backNumberSenior: 22 }),
]);

export const SPORTPALEIS_DATA_GAPS = Object.freeze([
  "Fysieke Junior-rugnummerhoogte per vereniging is nog niet door Sportpaleis productie bevestigd.",
  "Artikelprijzen en bedrukkingsprijzen ontbreken in de beschikbare gevalideerde bronnen.",
  "Voor 18 van de 20 bekende verenigingen ontbreekt een gevalideerde artikelcatalogus.",
  "Het FC Almere-artikelnummer en de productafbeelding zijn nog niet gevalideerd.",
  "Garment-positionering en referentieafstanden zijn niet voor iedere vereniging afzonderlijk bronbevestigd.",
  "Folie-inkoopprijzen, leveranciers/types en oorspronkelijke rollengtes ontbreken.",
]);
