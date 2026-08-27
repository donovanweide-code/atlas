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

export const FRONT_NAME_ARTICLE_TRUTH = Object.freeze([
  Object.freeze({ articleNumber: "142136", association: "Almere United", fontProfile: "Arial Regular", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Exact Arial Regular productiefont is nog niet geregistreerd; niet vervangen door Arial Bold of Liberation Sans." }),
  Object.freeze({ articleNumber: "116388", association: "Almere Pioneers", fontProfile: "FFF englisch", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Applicability sluit aan op het bestaande Pioneers naamprofiel van 2 cm; exacte fontoutput blijft fail-closed zonder geregistreerd fontbestand." }),
  Object.freeze({ articleNumber: "116386", association: "Almere Pioneers", fontProfile: "FFF englisch", applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Applicability sluit aan op het bestaande Pioneers naamprofiel van 2 cm; exacte fontoutput blijft fail-closed zonder geregistreerd fontbestand." }),
  Object.freeze({ articleNumber: "135702", association: "UDA / United Dance Almere", fontProfile: null, applicability: "VERIFIED", fontAssetStatus: "DATA_GAP", attention: "Handgeschreven fontnaam is niet bewezen en blijft leeg." }),
  Object.freeze({ articleNumber: "138505", association: "UDA / United Dance Almere", fontProfile: null, applicability: "CATALOG_CONFLICT", fontAssetStatus: "DATA_GAP", attention: "Human evidence noemt UDA, maar de huidige live-catalogus koppelt 138505 aan Almere Pioneers. Niet materialiseren vóór verificatie." }),
]);

export function normalizeFrontName(value) {
  return String(value ?? "").trim().toLocaleUpperCase("nl-NL");
}

export function frontNameTruthForArticle(articleNumber) {
  return FRONT_NAME_ARTICLE_TRUTH.find((entry) => entry.articleNumber === String(articleNumber)) ?? null;
}
