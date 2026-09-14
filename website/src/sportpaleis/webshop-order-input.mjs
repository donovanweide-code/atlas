import { canonicalArticlePersonalizationFields } from "./production-practice-contract.mjs";
import { canonicalTeamkitArticleSurfaceTruth } from "./teamkit-product-surfaces.mjs";
import { batchHash, validateBatchValues } from "./webshop-batch-projection.mjs";

// Shared catalog and placement boundary. Production rules remain canonical.
export function normalizeWebshopPrintItem(state, row) {
  const issues = [...row.issues, ...validateBatchValues(row.values)];
  if (row.values.sizeProfile === "CUSTOM") issues.push({ field: "sizeProfile", message: "Vrij profiel vastgelegd. Een goedgekeurde productiebron moet nog worden gekoppeld.", code: "CUSTOM_PROFILE_AUTHORITY_REQUIRED" });
  const matches = state.articles.filter((article) => article.active !== false && String(article.articleNumber) === row.values.articleNumber && (!row.club || article.association === row.club));
  if (matches.length !== 1) issues.push({ field: "articleNumber", message: matches.length ? "Artikel hoort bij meerdere verenigingen. Controleer het artikelnummer." : "Artikel niet herkend. Vul de ordergegevens aan.", code: "ARTICLE_MATCH_REQUIRED" });
  if (issues.length) return { status: "REVIEW_REQUIRED", issues, contract: null };
  const article = matches[0];
  const normalizeColor = (value) => String(value ?? "").trim().replace(/\s+/gu, " ").toLocaleUpperCase("nl-NL");
  const catalogColors = [...new Set((article.catalogMedia ?? []).filter((media) => media.authority === "SPORTPALEIS_LIVE_PRODUCT_GALLERY").map((media) => normalizeColor(media.colorLabel)).filter(Boolean))];
  if (catalogColors.length !== 1 || catalogColors[0] !== normalizeColor(row.values.color)) return { status: "REVIEW_REQUIRED", issues: [{ field: "color", message: "Artikelkleur komt niet eenduidig overeen met de productcatalogus.", code: "ARTICLE_COLOR_MATCH_REQUIRED" }], contract: null };
  const association = state.associations.find(({ name }) => name === article.association);
  let productType;
  try { productType = canonicalTeamkitArticleSurfaceTruth(article).productType; } catch { productType = "OTHER"; }
  const supported = canonicalArticlePersonalizationFields({ article, association, productionProfiles: state.productionProfiles, productType });
  const overrides = {};
  for (const p of row.values.personalizations) {
    let field = ({ INITIALS: "initials", NAME_PRINT: "name", BACK_NAME: "name", BACK_NUMBER: "backNumber", CHEST_NUMBER: "chestNumber", SHORTS_NUMBER: "shortsNumber" })[p.type];
    if (p.type === "NUMBER") {
      const placements = ["backNumber", "chestNumber", "shortsNumber"].filter((name) => supported.includes(name));
      if (placements.length === 1) [field] = placements;
    }
    if (!field || !supported.includes(field) || Object.hasOwn(overrides, field)) issues.push({ field: "personalizations", message: `Plaatsing van ${p.value} controleren.`, code: "PLACEMENT_REQUIRED" });
    else overrides[field] = p.value;
  }
  if (issues.length) return { status: "REVIEW_REQUIRED", issues, contract: null };
  if (overrides.backNumber && ["JUNIOR", "SENIOR"].includes(row.values.sizeProfile)) overrides.backNumberSizeClass = row.values.sizeProfile;
  return { status: "READY", issues: [], article, productType, item: { articleId: article.id, size: row.values.size, quantity: row.values.quantity, deviation: true, overrides } };
}

export function normalizeWebshopOrder(state, batch, orderNumber, { filename, corrections = {}, batchOverrides } = {}) {
  const fail = (message) => { throw Object.assign(new Error(message), { statusCode: 409, code: "WEBSHOP_ORDER_REVIEW_REQUIRED" }); };
  if (!/^\d{6,20}$/u.test(orderNumber ?? "")) fail("Vul een geldig bestelnummer in.");
  if (batch.sourceWarnings.some((warning) => warning.orderNumber === orderNumber)) fail("De bestelling kon niet volledig worden gelezen.");
  const rows = batch.items.filter((row) => row.orderNumber === orderNumber && row.printingRequired);
  if (!rows.length) fail("Geen bedrukte artikelen gevonden voor dit bestelnummer.");
  if (!corrections || typeof corrections !== "object" || Array.isArray(corrections)) fail("Controleer de ordercorrecties.");
  if (batchOverrides !== undefined) {
    if (!batchOverrides || batchOverrides.sourceHash !== batch.sourceHash || !batchOverrides.overrides || typeof batchOverrides.overrides !== "object" || Array.isArray(batchOverrides.overrides)) fail("Batchcorrecties horen niet betrouwbaar bij deze bron.");
    if (Object.keys(batchOverrides.overrides).some((id) => !batch.items.some((row) => row.id === id))) fail("Een batchcorrectie kon niet aan de oorspronkelijke regel worden gekoppeld.");
    const merged = { ...corrections };
    for (const row of rows) {
      const override = batchOverrides.overrides[row.id];
      if (!override) continue;
      if (!override.changes || typeof override.changes !== "object" || Array.isArray(override.changes) || typeof override.excluded !== "boolean") fail("Controleer de batchcorrectie.");
      // An explicit second correction must never silently replace an earlier one.
      if (Object.hasOwn(merged, row.id)) fail("Er zijn twee correcties voor dezelfde regel. Controleer de werkwaarde.");
      merged[row.id] = { ...override.changes, excluded: override.excluded };
    }
    corrections = merged;
  }
  if (Object.keys(corrections).some((id) => !rows.some((row) => row.id === id))) fail("Correctie hoort niet bij deze bestelling.");
  const changes = [];
  const mapped = rows.map((row) => {
    const patch = corrections[row.id] ?? {};
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) fail("Controleer de ordercorrectie.");
    if (Object.keys(patch).some((key) => !["articleNumber", "description", "size", "color", "quantity", "personalizations", "sizeProfile", "customProfile", "excluded"].includes(key))) fail("Deze correctie wordt niet ondersteund.");
    if (patch.excluded !== undefined && typeof patch.excluded !== "boolean") fail("Controleer de uitsluiting.");
    if (Object.keys(patch).length) changes.push({ sourceItemId: row.id, changes: patch });
    if (patch.excluded === true) return null;
    const result = normalizeWebshopPrintItem(state, { ...row, values: { ...row.values, ...patch } });
    if (result.status !== "READY") fail(result.issues.map(({ message }) => message).join(" "));
    return result;
  }).filter(Boolean);
  if (!mapped.length) fail("Alle bedrukte regels zijn uitgesloten. Er wordt geen order aangemaakt.");
  const reference = { sha256: batch.sourceHash, filename: String(filename ?? "order.pdf").replace(/[\r\n]/gu, " ").slice(0, 120), externalReference: orderNumber,
    pages: [...new Set(rows.flatMap((row) => row.sourcePages))], itemIds: rows.map((row) => row.id), orderDate: rows[0].orderDate,
    idempotencyKey: batchHash(["WEBSHOP_PDF_ORDER_V1", batch.sourceHash, orderNumber]), ...(changes.length ? { corrections: changes } : {}) };
  const context = rows[0].customerContext ?? {};
  const input = { orderKind: "INDIVIDUAL", source: "WEBSHOP_XPRT", externalReference: orderNumber,
    customer: context.customer || `Webshopbestelling ${orderNumber}`, customerEmail: context.customerEmail || "", customerPhone: context.customerPhone || "",
    provenance: `${reference.filename} · SHA256 ${reference.sha256} · pagina ${reference.pages.join(", ")}`.slice(0, 400),
    association: mapped[0].article.association, standardPersonalization: {}, items: mapped.map(({ item }) => item) };
  return { input, reference, rows };
}
