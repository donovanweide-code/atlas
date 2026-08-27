/**
 * Candidate-only product truth supplied during Human Acceptance on 2026-08-27.
 * Unknowns and catalog conflicts remain explicit and may not become production
 * output until they are resolved by a human authority.
 */
export const FRONT_NAME_DECORATION = Object.freeze({
  id: "frontName",
  label: "Naamopdruk (voorkant)",
  placement: "FRONT",
  physicalHeightMm: 20,
  textTransform: "UPPERCASE",
  source: "Donovan Human Acceptance evidence 2026-08-27",
});

export const OWNER_SUPPLIED_FONT_EVIDENCE = Object.freeze({
  arialRegular: Object.freeze({
    originalFilename: "arial.ttf",
    familyName: "Arial",
    subfamilyName: "Regular",
    fullName: "Arial",
    postscriptName: "ArialMT",
    version: "Version 7.00",
    sha256: "C9B76220A5BE42EAD4733611E417CD65C5FD8AEAA33EB56576AC378A37D130A1",
    contractValidation: "TECHNICALLY_VALID",
    ingestStatus: "BLOCKED_CANDIDATE_READ_ONLY",
  }),
  spain: Object.freeze({
    originalFilename: "Spain .ttf",
    familyName: "Spain Euro 2016",
    subfamilyName: "Regular",
    fullName: "Spain Euro 2016 Regular",
    postscriptName: "SpainEuro-Regular",
    version: "Version 1.00 2015",
    sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585",
    contractValidation: "TECHNICALLY_VALID",
    profileMatchStatus: "NOT_PROVEN",
  }),
});

export const UDA_FRONT_NAME_TRUTH = Object.freeze({
  association: "UDA / United Dance Almere",
  webshopLabel: "Naam opdruk",
  operationalDecorationId: FRONT_NAME_DECORATION.id,
  customerSurchargeEur: 6.5,
  fontProfile: null,
  fontAssetStatus: "DATA_GAP",
  articleNumber: null,
  applicability: "ASSOCIATION_VERIFIED_ARTICLE_UNESTABLISHED",
  attention: "Owner-evidence bevestigt de operationele betekenis en prijs, maar de authoritative catalogus bewijst geen UDA Varsity Jacket-artikelnummer. Niet aan een SKU koppelen zonder bronbewijs.",
});

export const FRONT_NAME_ARTICLE_TRUTH = Object.freeze([
  Object.freeze({ articleNumber: "142136", association: "Almere United", fontProfile: "Arial Regular", applicability: "VERIFIED", fontAssetStatus: "IDENTITY_VERIFIED_INGEST_BLOCKED", attention: "Owner-bestand is exact geïdentificeerd als Arial Regular/ArialMT, maar Candidate-mode blokkeert de vereiste geaudite managed-fontingest." }),
  Object.freeze({ articleNumber: "116388", association: "Almere Pioneers", fontProfile: "FFF englisch", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Applicability sluit aan op het bestaande Pioneers naamprofiel van 2 cm; exacte fontoutput blijft fail-closed zonder geregistreerd fontbestand." }),
  Object.freeze({ articleNumber: "116386", association: "Almere Pioneers", fontProfile: "FFF englisch", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Applicability sluit aan op het bestaande Pioneers naamprofiel van 2 cm; exacte fontoutput blijft fail-closed zonder geregistreerd fontbestand." }),
  Object.freeze({ articleNumber: "138505", association: "Almere Pioneers", fontProfile: "FFF englisch", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Owner-evidence corrigeert dit artikel definitief naar Almere Pioneers; dezelfde voorzijde-naamtruth geldt zonder duplicaat profiel." }),
]);

export function normalizeFrontName(value) {
  return String(value ?? "").trim().toLocaleUpperCase("nl-NL");
}

export function frontNameTruthForArticle(articleNumber) {
  return FRONT_NAME_ARTICLE_TRUTH.find((entry) => entry.articleNumber === String(articleNumber)) ?? null;
}
