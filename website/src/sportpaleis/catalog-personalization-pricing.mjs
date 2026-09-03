/**
 * Resolve the commercial truth for one article-bound personalization value.
 * The same resolver is consumed by the store UI and the order write boundary.
 */
export function resolveCatalogPersonalizationPrice(article, field, input) {
  const normalizedValue = String(input ?? "").trim();
  if (!normalizedValue) return { status: "EMPTY", normalizedValue, unitPriceEur: null, reason: null };

  const rule = article?.priceConfiguration?.personalizationValuePricing?.[field];
  if (rule) {
    if (rule.normalization !== "TRIMMED_DIGITS" || !/^\d+$/u.test(normalizedValue)) {
      return { status: "INVALID", normalizedValue, unitPriceEur: null, reason: `${rule.label ?? "Bedrukking"} moet uit cijfers bestaan.` };
    }
    const maximumLength = Number(rule.maximumLength);
    if (Number.isInteger(maximumLength) && normalizedValue.length > maximumLength) {
      return { status: "INVALID", normalizedValue, unitPriceEur: null, reason: `${rule.label ?? "Bedrukking"} ondersteunt maximaal ${maximumLength} cijfers.` };
    }
    const unitPriceEur = rule.unitPricesByLengthEur?.[String(normalizedValue.length)];
    if (typeof unitPriceEur !== "number") {
      return { status: "MISSING_PRICE", normalizedValue, unitPriceEur: null, reason: `Voor ${normalizedValue.length} cijfers is geen bevestigde prijs vastgelegd.` };
    }
    return { status: "PRICED", normalizedValue, unitPriceEur, reason: null };
  }

  const unitPriceEur = article?.priceConfiguration?.personalizationUnitPricesEur?.[field];
  return typeof unitPriceEur === "number"
    ? { status: "PRICED", normalizedValue, unitPriceEur, reason: null }
    : { status: "MISSING_PRICE", normalizedValue, unitPriceEur: null, reason: "Voor deze bedrukking is geen bevestigde prijs vastgelegd." };
}

export function catalogPersonalizationPriceHint(article, field) {
  const rule = article?.priceConfiguration?.personalizationValuePricing?.[field];
  if (!rule) return null;
  return Object.entries(rule.unitPricesByLengthEur ?? {})
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([length, price]) => `${length} ${Number(length) === 1 ? "cijfer" : "cijfers"}: €${Number(price).toFixed(2).replace(".", ",")}`)
    .join(" · ");
}
