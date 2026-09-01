import { SPORTPALEIS_ASSOCIATION_LOGOS } from "./sportpaleis-association-logos.generated.mjs";
import { SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS } from "./sportpaleis-final-prelive-catalog.generated.mjs";

export const SPORTPALEIS_CONFIGURATION_VERSION = "SPW-CONFIG-BEDRUKKING-011-20260901";

export const SPORTPALEIS_FONT_CONFIRMATION = Object.freeze({
  id: "SPW-HUMAN-FONT-CONFIRMATION-003-20260901",
  confirmedAt: "2026-09-01",
  authority: "Human-confirmed Sportpaleis vereniging-naar-lettertype-tabel, aangevuld met Donovan Product Truth (2026-09-01) voor Seedorf TDG, HBSA en Sloeproeien no-print eligibility, afzonderlijke hockeynummerbronnen en de algemene 200-mm-rugnummerregel",
  limitation: "De bevestiging bewijst de fontnaam en eventuele mapverwijzing, niet de aanwezigheid, identiteit, licentie of productiebruikbaarheid van een TTF/OTF/WOFF-fontbestand.",
});

export const SPORTPALEIS_FONT_ASSET_INVENTORY = Object.freeze([
  Object.freeze({ canonicalName: "Myriad Pro Italic", fontAssetStatus: "PRODUCTION_EXECUTABLE", registeredFontAssetId: "font-e952ada73367d722", referenceAsset: Object.freeze({ filename: "MyriadPro-It.otf", format: "OTF", sha256: "E952ADA73367D7223B57EE60B764DBAF75FA8A7F5D72D7CB9E139EDD9E6D6814", status: "EXACT_IDENTITY_ADMITTED" }) }),
  Object.freeze({ canonicalName: "Myriad Pro Bold", fontAssetStatus: "PRODUCTION_EXECUTABLE", registeredFontAssetId: "font-b91eef2aed805a9e", referenceAsset: Object.freeze({ filename: "MyriadPro-Bold.otf", format: "OTF", sha256: "B91EEF2AED805A9E5294AF9C43A751EC911FEF2B2090E30F0066B23493199E07", status: "EXACT_IDENTITY_ADMITTED" }) }),
  Object.freeze({ canonicalName: "FFF englisch", fontAssetStatus: "PRODUCTION_EXECUTABLE", registeredFontAssetId: "font-0f330cf7aa7dd6c6", referenceAsset: Object.freeze({ filename: "Premier League Font 2018.ttf", format: "TTF", sha256: "0F330CF7AA7DD6C6ADC5FC49DE9028A8AE265CAC469E8C34E91C1B4E5B0014B7", status: "EXACT_IDENTITY_ADMITTED" }) }),
  Object.freeze({ canonicalName: "Spain", fontAssetStatus: "HUMAN_PRODUCT_TRUTH_CONFIRMED", registeredFontAssetId: null, referenceAsset: Object.freeze({ filename: "Spain .ttf", familyName: "Spain Euro 2016", postScriptName: "SpainEuro-Regular", format: "TTF", sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585", status: "EXACT_IDENTITY_CONFIRMED_DYNAMIC_LIBRARY_LINK" }) }),
  Object.freeze({ canonicalName: "Schluber", fontAssetStatus: "PRODUCTION_EXECUTABLE", registeredFontAssetId: "font-985b2931e85cec60", referenceAsset: Object.freeze({ filename: "Schluber.otf", format: "OTF", sha256: "985B2931E85CEC60F0D661E7F9FF05CE32C959C41D4E2116E22A1ADA129C03BF", status: "EXACT_IDENTITY_ADMITTED" }) }),
  Object.freeze({ canonicalName: "Viking-Normal", fontAssetStatus: "ADMISSION_REJECTED", registeredFontAssetId: null, referenceAsset: Object.freeze({ filename: "VIKING-N.TTF", format: "TTF", sha256: "5A3B7AB3D853FA1C78D40E54F4ADC5A4052431F555FD8E7502D2080906544F25", status: "PRODUCTION_FONT_GEOMETRY_INVALID" }), identityStatus: "NOT_APPLICABLE_TO_HBSA", note: "Immutable intake evidence only; authoritative Product Truth states HBSA has no printing and therefore no Viking production requirement." }),
]);

const FONT_CONFIRMATION_BY_ASSOCIATION = Object.freeze({
  "Almere'81": Object.freeze({ confirmedValue: "Myriad Pro - Italic", canonicalName: "Myriad Pro Italic" }),
  "Almere Pioneers": Object.freeze({ confirmedValue: "FFF englisch + bronverwijzing", canonicalName: "FFF englisch", reference: "Pioneers nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]), vectorReferenceAsset: Object.freeze({ filename: "Pioneers nummers.ai", format: "AI_VECTOR_REFERENCE", sha256: "FB2D8FF0939ACAE08FF4264C02775A317988F21DD09B6CA4F5DF178A1F7A3582", status: "PRESENT_REFERENCE_ONLY" }) }),
  "As,8o": Object.freeze({ confirmedAssociationName: "AS '80", confirmedValue: "Spain", canonicalName: "Spain", associationNameStatus: "NORMALIZED_MATCH" }),
  "A.S.C. Waterwijk": Object.freeze({ confirmedAssociationName: "ASC Waterwijk", confirmedValue: "schluber; spain = thuis wedstrijdshirt/short", canonicalName: "Schluber", exception: "Spain voor thuiswedstrijdshirt en thuiswedstrijdshort", associationNameStatus: "NORMALIZED_MATCH" }),
  Brouwersports: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "Buitenhout MHC": Object.freeze({ confirmedValue: "Myrad pro - Bold / bedoeld als Myriad Pro Bold + verwijzing", canonicalName: "Myriad Pro Bold", reference: "Buitenhout - Lelystad nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]), vectorReferenceAsset: Object.freeze({ filename: "Buitenhout - Lelystad nummers.ai", format: "AI_VECTOR_REFERENCE", sha256: "DE29A4CA4B77D429327E2A5758993687DB3A34C57CA3D7951763BD15F4FCF6B8", status: "SUPERSEDED_FOR_HOCKEY_NUMBERS_BY_VERIFIED_SVG" }) }),
  DCG: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  EKVA: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "FC Almere": Object.freeze({ confirmedValue: "schluber; spain = thuis wedstrijdshirt/short", canonicalName: "Schluber", exception: "Spain voor thuiswedstrijdshirt en thuiswedstrijdshort" }),
  "FC Huizen": Object.freeze({ confirmedValue: "spain", canonicalName: "Spain" }),
  HBSA: Object.freeze({ confirmedAssociationName: "FSA", confirmedValue: "Historische FSA/Viking-rij; niet van toepassing op HBSA", canonicalName: null, status: "NOT_APPLICABLE", associationNameStatus: "MISMATCH", applied: false, reason: "Authoritative Product Truth 2026-09-01: HBSA heeft geen bedrukking. De historische FSA/Viking-rij mag daarom geen HBSA source requirement genereren." }),
  "MHC Lelystad": Object.freeze({ confirmedValue: "Myrad pro - Bold", canonicalName: "Myriad Pro Bold", reference: "Buitenhout - Lelystad nummers.ai", referenceKind: "VECTOR_CONTOUR_REFERENCE", referenceFields: Object.freeze(["backNumber"]), vectorReferenceAsset: Object.freeze({ filename: "Buitenhout - Lelystad nummers.ai", format: "AI_VECTOR_REFERENCE", sha256: "DE29A4CA4B77D429327E2A5758993687DB3A34C57CA3D7951763BD15F4FCF6B8", status: "SUPERSEDED_FOR_HOCKEY_NUMBERS_BY_VERIFIED_SVG" }) }),
  Najaden: Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  "SC Buitenboys": Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber", exception: "Shortnummer gebruikt Spain Euro 2016 / SpainEuro-Regular" }),
  "SC Geinburgia": Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
  "Sporting Almere": Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
  "VVA / Spartaan": Object.freeze({ confirmedValue: "schluber", canonicalName: "Schluber" }),
  Wooter: Object.freeze({ confirmedValue: "spain", canonicalName: "Spain" }),
  Sloeproeien: Object.freeze({ confirmedValue: "Geen bedrukking", canonicalName: null, status: "NOT_APPLICABLE", reason: "Authoritative Product Truth 2026-09-01: Sloeproeien heeft geen bedrukking en genereert geen source requirement." }),
  Hasselbaink: Object.freeze({ confirmedValue: "Spain", canonicalName: "Spain" }),
  "Seedorf TDG": Object.freeze({ confirmedValue: "Spain waar daadwerkelijk van toepassing", canonicalName: "Spain" }),
});

export const SPORTPALEIS_JUNIOR_GARMENT_SIZES = Object.freeze(["116", "128", "140", "152", "164"]);
export const SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM = 200;
export const SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM = 200;
export const SPORTPALEIS_JUNIOR_RULE_SOURCE = "Authoritative Product Truth Donovan 2026-09-01: ieder Senior- en Junior-rugnummer wordt proportioneel op exact 20 cm / 200 mm hoogte gematerialiseerd; breedte volgt uit de glyphgeometrie.";

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

const association = (row, name, sourceName, fontProfile, foilColors, dimensions = {}, notes = "", options = {}) => {
  const confirmation = FONT_CONFIRMATION_BY_ASSOCIATION[name];
  const inventory = SPORTPALEIS_FONT_ASSET_INVENTORY.find(({ canonicalName }) => canonicalName === confirmation?.canonicalName);
  const applied = confirmation?.applied !== false;
  const confirmationStatus = ["DATA_GAP", "NOT_APPLICABLE"].includes(confirmation?.status)
    ? confirmation.status
    : confirmation?.associationNameStatus === "MISMATCH"
      ? "MISMATCH"
      : "MATCH";
  const canonicalFontProfile = confirmationStatus === "DATA_GAP"
    ? "DATA_GAP"
    : confirmationStatus === "NOT_APPLICABLE"
      ? "Niet van toepassing"
    : applied && confirmation?.canonicalName
      ? confirmation.canonicalName
      : fontProfile;
  return Object.freeze({
  id: `association-${String(row).padStart(2, "0")}`,
  name,
  sourceName,
  active: true,
  source: options.source ?? source(row),
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
    vectorReferenceAsset: confirmation?.vectorReferenceAsset ?? null,
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
    backNumberJuniorSourceValue: dimensions.backNumberJuniorSourceValue == null ? null : SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM / 10,
    backNumberSenior: dimensions.backNumberSenior == null ? null : SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM / 10,
    chestNumber: dimensions.chestNumber ?? null,
    shortsNumber: dimensions.shortsNumber ?? null,
    nameHeight: dimensions.nameHeight ?? null,
  }),
  juniorValidationStatus: "VALIDATED",
  juniorPhysicalHeightMm: SPORTPALEIS_JUNIOR_PHYSICAL_HEIGHT_MM,
  juniorGarmentSizes: SPORTPALEIS_JUNIOR_GARMENT_SIZES,
  juniorValidationNote: SPORTPALEIS_JUNIOR_RULE_SOURCE,
  productionEligibility: options.productionEligibility ?? (Object.values(dimensions).some((value) => Number(value) > 0) ? "APPLICABLE" : "NO_CONFIRMED_APPLICATIONS"),
  productionApplications: Object.freeze(options.productionApplications ?? Object.entries({ initials: dimensions.initialsShirt, name: dimensions.nameHeight, backNumber: dimensions.backNumberSenior ?? dimensions.backNumberJuniorSourceValue, chestNumber: dimensions.chestNumber, shortsNumber: dimensions.shortsNumber }).filter(([, value]) => Number(value) > 0).map(([field]) => field)),
  productTruthSource: options.productTruthSource ?? null,
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
  association(12, "HBSA", "HBSA", "Niet van toepassing", [], {}, "Geen bedrukking; de historische FSA/Viking-rij is geen HBSA-productietoepassing.", { productionEligibility: "NOT_APPLICABLE", productionApplications: [], productTruthSource: "Authoritative Product Truth Donovan 2026-09-01" }),
  association(13, "MHC Lelystad", "MHC Lelystad", "Myrad pro - Bold / zie map 'Lelystad'", ["Wit", "Zwart"], { backNumberJuniorSourceValue: 20, backNumberSenior: 22, nameHeight: 3.2 }, "Uit is zwart; thuis is wit. Nummer is outline; naam met hoofdletter."),
  association(14, "Najaden", "Najaden", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 20, chestNumber: 7.5, shortsNumber: 7.5, nameHeight: 5 }),
  association(15, "SC Buitenboys", "SC Buitenboys", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }, "Wedstrijdshirt thuis is navy blue."),
  association(16, "SC Geinburgia", "SC Geinburgia", "Spain", ["Wit"], { initialsShirt: 3.5, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(17, "Sporting Almere", "Sporting Almere", "Spain", ["Wit"], { initialsShirt: 3.5, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }),
  association(18, "VVA / Spartaan", "Vva / Spartaan", "schluber", ["Wit"], { initialsShirt: 3, backNumberJuniorSourceValue: 20, backNumberSenior: 22, shortsNumber: 7.5 }, "Wedstrijdshirt thuis is zwart."),
  association(19, "Wooter", "Wooter", "spain", ["Wit"], { initialsShirt: 3.5 }),
  association(20, "Sloeproeien", "Sloeproeien", "Niet van toepassing", [], {}, "Geen bedrukking.", { productionEligibility: "NOT_APPLICABLE", productionApplications: [], productTruthSource: "Authoritative Product Truth Donovan 2026-09-01" }),
  association(21, "Hasselbaink", "Hasselbaink", "Spain", ["Wit"], { backNumberJuniorSourceValue: 20, backNumberSenior: 22 }),
  association(22, "Seedorf TDG", "Seedorf TDG", "Spain", [], {}, "Spain is de algemene letter-/nummerbron waar een daadwerkelijke bedrukkingstoepassing is bevestigd; zonder concrete toepassing wordt niets geprojecteerd.", { productionEligibility: "APPLICATIONS_REQUIRE_ACTUAL_PRODUCT_TRUTH", productionApplications: [], productTruthSource: "Authoritative Product Truth Donovan 2026-09-01", source: Object.freeze({ file: "Human Product Truth", sheet: "2026-09-01", range: "Seedorf TDG" }) }),
  association(23, "Almeerse Hockeyclub", "Almeerse Hockeyclub", "DATA_GAP", [], { backNumberSenior: 20 }, "De hockeynummer-SVG is uitsluitend authoritative voor rugnummers; lettertoepassingen zijn niet bevestigd.", { productionEligibility: "APPLICABLE", productionApplications: ["backNumber"], productTruthSource: "Authoritative Product Truth Donovan 2026-09-01", source: Object.freeze({ file: "Human Product Truth", sheet: "2026-09-01", range: "Almeerse Hockeyclub hockeynummer" }) }),
]);

export const SPORTPALEIS_DATA_GAPS = Object.freeze([
  "Niet-beschikbare maatvarianten hebben geen actuele concrete websiteprijs en blijven prijs-DATA_GAP totdat de variant opnieuw zichtbaar bestelbaar is of Sportpaleis de prijs bevestigt.",
  "267 actuele clubartikelen tonen geen zichtbare personalisatieoptie en blijven HUMAN_CONFIRMATION_REQUIRED voor opname in Bedrukken; hun bekende catalogusfeiten blijven in het bronbewijs bewaard.",
  "Garment-positionering en referentieafstanden zijn niet voor iedere vereniging afzonderlijk bronbevestigd.",
  "Folie-inkoopprijzen, leveranciers/types en oorspronkelijke rollengtes ontbreken.",
]);
