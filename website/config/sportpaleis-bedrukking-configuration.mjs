import { SPORTPALEIS_ASSOCIATION_LOGOS } from "./sportpaleis-association-logos.generated.mjs";
import { SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS } from "./sportpaleis-final-prelive-catalog.generated.mjs";

export const SPORTPALEIS_CONFIGURATION_VERSION = "SPW-CONFIG-BEDRUKKING-009-20260831";

export const SPORTPALEIS_FONT_CONFIRMATION = Object.freeze({
  id: "SPW-HUMAN-FONT-CONFIRMATION-002-20260831",
  confirmedAt: "2026-08-31",
  authority: "Human-confirmed Sportpaleis vereniging-naar-lettertype-tabel (2026-08-12), aangevuld met Donovan Product Truth (2026-08-31) dat letter- en nummerbronnen per toepassing afzonderlijk bindt",
  limitation: "De bevestiging bewijst de fontnaam en eventuele mapverwijzing, niet de aanwezigheid, identiteit, licentie of productiebruikbaarheid van een TTF/OTF/WOFF-fontbestand.",
});

export const SPORTPALEIS_FONT_ASSET_INVENTORY = Object.freeze([
  Object.freeze({ canonicalName: "Myriad Pro Italic", fontAssetStatus: "DATA_GAP", registeredFontAssetId: null, referenceAsset: null }),
  Object.freeze({ canonicalName: "Myriad Pro Bold", fontAssetStatus: "DATA_GAP", registeredFontAssetId: null, referenceAsset: Object.freeze({ filename: "Buitenhout - Lelystad nummers.ai", format: "AI_VECTOR_REFERENCE", sha256: "DE29A4CA4B77D429327E2A5758993687DB3A34C57CA3D7951763BD15F4FCF6B8", status: "PRESENT_NOT_A_FONT_FILE" }) }),
  Object.freeze({ canonicalName: "FFF englisch", fontAssetStatus: "DATA_GAP", registeredFontAssetId: null, referenceAsset: Object.freeze({ filename: "Pioneers nummers.ai", format: "AI_VECTOR_REFERENCE", sha256: "FB2D8FF0939ACAE08FF4264C02775A317988F21DD09B6CA4F5DF178A1F7A3582", status: "PRESENT_NOT_A_FONT_FILE" }) }),
  Object.freeze({ canonicalName: "Spain", fontAssetStatus: "HUMAN_PRODUCT_TRUTH_CONFIRMED", registeredFontAssetId: null, referenceAsset: Object.freeze({ filename: "Spain .ttf", familyName: "Spain Euro 2016", postScriptName: "SpainEuro-Regular", format: "TTF", sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585", status: "EXACT_IDENTITY_CONFIRMED_DYNAMIC_LIBRARY_LINK" }) }),
  Object.freeze({ canonicalName: "Schluber", fontAssetStatus: "DATA_GAP", registeredFontAssetId: null, referenceAsset: null }),
  Object.freeze({ canonicalName: "Viking-Normal", fontAssetStatus: "DATA_GAP", registeredFontAssetId: null, referenceAsset: null, identityStatus: "ASSOCIATION_MISMATCH_FSA_VS_HBSA" }),
]);

const FONT_CONFIRMATION_BY_ASSOCIATION = Object.freeze({
  "Almere'81": Object.freeze({ confirmedValue: "Myriad Pro - Italic", canonicalName: "Myriad Pro Italic" }),
  "Almere Pioneers": Object.freeze({ confirmedValue: "FFF englisch + bronverwijzing", canonicalName: "FFF englisch", reference: "Pioneers nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]) }),
  "As,8o": Object.freeze({ confirmedAssociationName: "AS '80", confirmedValue: "Spain", canonicalName: "Spain", associationNameStatus: "NORMALIZED_MATCH" }),
  "A.S.C. Waterwijk": Object.freeze({ confirmedAssociationName: "ASC Waterwijk", confirmedValue: "schluber; spain = thuis wedstrijdshirt/short", canonicalName: "Schluber", exception: "Spain voor thuiswedstrijdshirt en thuiswedstrijdshort", associationNameStatus: "NORMALIZED_MATCH" }),
  Brouwersports: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "Buitenhout MHC": Object.freeze({ confirmedValue: "Myrad pro - Bold / bedoeld als Myriad Pro Bold + verwijzing", canonicalName: "Myriad Pro Bold", reference: "Buitenhout - Lelystad nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]) }),
  DCG: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  EKVA: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "FC Almere": Object.freeze({ confirmedValue: "schluber; spain = thuis wedstrijdshirt/short", canonicalName: "Schluber", exception: "Spain voor thuiswedstrijdshirt en thuiswedstrijdshort" }),
  "FC Huizen": Object.freeze({ confirmedValue: "spain", canonicalName: "Spain" }),
  HBSA: Object.freeze({ confirmedAssociationName: "FSA", confirmedValue: "Viking-Normal", canonicalName: "Viking-Normal", associationNameStatus: "MISMATCH", applied: false, reason: "De Human Confirmation noemt FSA, terwijl de bestaande bronvereniging HBSA heet. Deze identiteiten zijn niet zonder aanvullend bewijs gelijkgesteld." }),
  "MHC Lelystad": Object.freeze({ confirmedValue: "Myrad pro - Bold", canonicalName: "Myriad Pro Bold", reference: "Buitenhout - Lelystad nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]) }),
  Najaden: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "SC Buitenboys": Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber", exception: "Shortnummer gebruikt Spain Euro 2016 / SpainEuro-Regular" }),
  "SC Geinburgia": Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
  "Sporting Almere": Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
  "VVA / Spartaan": Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  Wooter: Object.freeze({ confirmedValue: "spain", canonicalName: "Spain" }),
  Sloeproeien: Object.freeze({ confirmedValue: "X", canonicalName: null, status: "DATA_GAP", reason: "X is geen bevestigd bruikbaar font." }),
  Hasselbaink: Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
});

export const SPORTPALEIS_JUNIOR_GARMENT_SIZES = Object.freeze(["116", "128", "140", "152", "164"]);
export const SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM = 200;
export const SPORTPALEIS_JUNIOR_RULE_SOURCE = "Human productbesluit Sportpaleis 2026-08-10: kledingmaten 116–164 gebruiken een fysiek rugnummer van 20 cm / 200 mm.";

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
    authority: "Gevalideerde testmaat Almere Pioneers Senior 200 mm; niet generaliseren naar andere verenigingen",
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

const association = (row, name, sourceName, fontProfile, foilColors, dimensions = {}, notes = "") => {
  const confirmation = FONT_CONFIRMATION_BY_ASSOCIATION[name];
  const inventory = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === confirmation?.canonicalName);
  const applied = confirmation?.applied !== false;
  const confirmationStatus = confirmation?.status === "DATA_GAP"
    ? "DATA_GAP"
    : confirmation?.associationNameStatus === "MISMATCH"
      ? "MISMATCH"
      : "MATCH";
  const canonicalFontProfile = confirmationStatus === "DATA_GAP"
    ? "DATA_GAP"
    : applied && confirmation?.canonicalName
      ? confirmation.canonicalName
      : fontProfile;
  return Object.freeze({
  id: `association-${String(row).padStart(2, "0")}`,
  name,
  sourceName,
  active: true,
  source: source(row),
  fontProfile: canonicalFontProfile,
  fontEvidence: Object.freeze({
    sourceValue: fontProfile,
    confirmedAssociationName: confirmation?.confirmedAssociationName ?? name,
    confirmedValue: confirmation?.confirmedValue ?? null,
    canonicalName: confirmation?.canonicalName ?? null,
    confirmationStatus,
    applied,
    assetStatus: inventory?.fontAssetStatus ?? "DATA_GAP",
    assetId: inventory?.registeredFontAssetId ?? null,
    referenceAsset: inventory?.referenceAsset ?? null,
    reference: confirmation?.reference ?? null,
    referenceKind: confirmation?.referenceKind ?? null,
    referenceFields: confirmation?.referenceFields ?? Object.freeze([]),
    exception: confirmation?.exception ?? null,
    reason: confirmation?.reason ?? null,
    provenance: SPORTPALEIS_FONT_CONFIRMATION,
  }),
  foilColors,
  dimensionsCm: Object.freeze({
    initialsShirt: dimensions.initialsShirt ?? null,
    backNumberJuniorSourceValue: dimensions.backNumberJuniorSourceValue ?? null,
    backNumberSenior: dimensions.backNumberSenior ?? null,
    chestNumber: dimensions.chestNumber ?? null,
    shortsNumber: dimensions.shortsNumber ?? null,
    nameHeight: dimensions.nameHeight ?? null,
  }),
  juniorValidationStatus: "VALIDATED",
  juniorPhysicalHeightMm: SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM,
  juniorGarmentSizes: SPORTPALEIS_JUNIOR_GARMENT_SIZES,
  juniorValidationNote: SPORTPALEIS_JUNIOR_RULE_SOURCE,
  notes,
  articleCatalogStatus: (SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.find(({ association }) => association === name)?.confirmedPrintArticleCount ?? 0) > 0
    ? "LIVE_PRINT_INTERSECTION_CONFIGURED"
    : "HUMAN_CONFIRMATION_REQUIRED",
  workspaceLogo: SPORTPALEIS_ASSOCIATION_LOGOS[name] ? Object.freeze({ ...SPORTPALEIS_ASSOCIATION_LOGOS[name] }) : null,
  });
};

export const SPORTPALEIS_ASSOCIATIONS = Object.freeze([
  association(2, "Almere'81", "Almere'81", "Myriad Pro - Italic", [], {}, "Bedrukking volgens bron: doen we zelf."),
  association(3, "Almere Pioneers", "Almerer Pioneers", "FFF englisch | zie map 'Pioneers'", ["Wit"], { backNumberJuniorSourceValue: 16, backNumberSenior: 20, chestNumber: 8, shortsNumber: 8, nameHeight: 2 }, "Maximale naambreedte 9 cm; Caps Lock aan."),
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
  "Junior-rugnummerhoogte buiten kledingmaten 116–164 is niet bevestigd; alleen 116, 128, 140, 152 en 164 gebruiken de gevalideerde 200 mm-regel.",
  "Niet-beschikbare maatvarianten hebben geen actuele concrete websiteprijs en blijven prijs-DATA_GAP totdat de variant opnieuw zichtbaar bestelbaar is of Sportpaleis de prijs bevestigt.",
  "267 actuele clubartikelen tonen geen zichtbare personalisatieoptie en blijven HUMAN_CONFIRMATION_REQUIRED voor opname in Bedrukken; hun bekende catalogusfeiten blijven in het bronbewijs bewaard.",
  "Garment-positionering en referentieafstanden zijn niet voor iedere vereniging afzonderlijk bronbevestigd.",
  "Folie-inkoopprijzen, leveranciers/types en oorspronkelijke rollengtes ontbreken.",
]);
