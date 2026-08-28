const json = (value) => JSON.stringify(value ?? null);
const parsed = (value, fallback) => {
  if (value === null || value === undefined || value === "") return structuredClone(fallback);
  if (typeof value === "object") return structuredClone(value);
  try { return JSON.parse(value); } catch { return structuredClone(fallback); }
};

export function articleToMariaDbRow(article, updatedAt = new Date().toISOString()) {
  return {
    id: article.id, article_number: article.articleNumber, name: article.name, image_key: article.imageKey,
    category: article.category, association_name: article.association, production_profile_id: article.profileId,
    supports_json: json(article.supports), personalization_policy_json: json(article.personalizationPolicy),
    price_configuration_json: json(article.priceConfiguration ?? null), active: Boolean(article.active),
    revision: Number(article.revision ?? 1), variant_labels_json: json(article.variantLabels ?? []),
    available_sizes_json: json(article.availableSizes ?? []), validation_json: json(article.validation),
    validation_history_json: json(article.validationHistory ?? []),
    catalog_metadata_json: json({ supplierArticleNumber: article.supplierArticleNumber ?? null, commercialPrintOptions: article.commercialPrintOptions ?? [], catalogProvenance: article.catalogProvenance ?? null, catalogMedia: article.catalogMedia ?? [], productionDataGaps: article.productionDataGaps ?? [] }),
    updated_at: updatedAt,
  };
}

export function mariaDbRowToArticle(row) {
  const catalogMetadata = parsed(row.catalog_metadata_json, {});
  return {
    id: row.id, articleNumber: row.article_number, name: row.name, imageKey: row.image_key, category: row.category,
    association: row.association_name, profileId: row.production_profile_id, supports: parsed(row.supports_json, []),
    personalizationPolicy: parsed(row.personalization_policy_json, { mode: "none", fields: {} }),
    priceConfiguration: parsed(row.price_configuration_json, null) ?? undefined, active: Boolean(row.active),
    revision: Number(row.revision ?? 1), variantLabels: parsed(row.variant_labels_json, []), availableSizes: parsed(row.available_sizes_json, []),
    validation: parsed(row.validation_json, { status: "DATA_GAP", source: "Bronbevestiging ontbreekt" }),
    validationHistory: parsed(row.validation_history_json, []),
    supplierArticleNumber: catalogMetadata.supplierArticleNumber ?? undefined,
    commercialPrintOptions: catalogMetadata.commercialPrintOptions ?? [],
    catalogProvenance: catalogMetadata.catalogProvenance ?? undefined,
    catalogMedia: catalogMetadata.catalogMedia ?? [],
    productionDataGaps: catalogMetadata.productionDataGaps ?? [],
  };
}

export function productionProfileToMariaDbRow(profile, updatedAt = new Date().toISOString()) {
  return {
    id: profile.id, name: profile.name, placement: profile.placement, reference_distance_cm: profile.referenceDistanceCm,
    size_label: profile.sizeLabel, font_profile: profile.fontProfile, foil_color: profile.foilColor, mirror: profile.mirror,
    rotation_deg: profile.rotationDeg, instruction: profile.instruction, back_number_size_classes_json: json(profile.backNumberSizeClasses ?? null),
    revision: Number(profile.revision ?? 1), validation_json: json(profile.validation), validation_history_json: json(profile.validationHistory ?? []), updated_at: updatedAt,
  };
}

export function mariaDbRowToProductionProfile(row) {
  return {
    id: row.id, name: row.name, placement: row.placement, referenceDistanceCm: row.reference_distance_cm === null ? null : Number(row.reference_distance_cm),
    sizeLabel: row.size_label, fontProfile: row.font_profile, foilColor: row.foil_color, mirror: row.mirror === null ? null : Boolean(row.mirror),
    rotationDeg: row.rotation_deg === null ? null : Number(row.rotation_deg), instruction: row.instruction,
    backNumberSizeClasses: parsed(row.back_number_size_classes_json, null) ?? undefined, revision: Number(row.revision ?? 1),
    validation: parsed(row.validation_json, { status: "DATA_GAP", source: "Bronbevestiging ontbreekt" }), validationHistory: parsed(row.validation_history_json, []),
  };
}

export function orderToMariaDbRows(order) {
  return {
    order: {
      id: order.id,
      revision: order.revision,
      customer: order.customer,
      customer_email: order.customerEmail ?? null,
      customer_phone: order.customerPhone ?? null,
      association_name: order.association,
      associations_json: json(order.associations ?? [order.association]),
      standard_personalization_json: json(order.standardPersonalization ?? { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" }),
      promised_at: order.promisedAt ?? null,
      order_kind: order.orderKind ?? "LEGACY",
      stage: order.stage,
      accepted_by_json: json(order.acceptedBy ?? { userId: "unknown", name: order.owner ?? "Onbekend", salesNumber: null, at: order.createdAt }),
      total_pieces: order.totalPieces,
      attention: order.attention ?? null,
      production_reference: order.productionReference ?? null,
      foil_states_json: json(order.foilStates ?? []),
      notes_json: json(order.notes ?? []),
      priority_json: json(order.priority ?? null),
      communication_json: json(order.communication ?? { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } }),
      barcode_json: json(order.barcode ?? null),
      pickup_json: json(order.pickup ?? { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null }),
      event_history_json: json(order.eventHistory ?? []),
      created_at: order.createdAt,
      updated_at: order.updatedAt ?? order.createdAt,
    },
    items: order.items.map((item) => ({
      id: item.id, order_id: order.id, article_id: item.articleId ?? null, article_number: item.articleNumber ?? null,
      image_key: item.imageKey ?? null, product: item.product, association_name: item.association ?? null,
      size_label: item.size ?? null, quantity: item.quantity, personalization: item.personalization,
      personalization_values_json: json(item.personalizationValues ?? null), deviation: Boolean(item.deviation),
      foil_color: item.foilColor, production_profile_id: item.productionProfileId ?? null,
      production_instruction: item.productionInstruction ?? null, back_number_production_json: json(item.backNumberProduction ?? null),
      source_type: item.sourceType ?? (item.articleId ? "CATALOG" : "CUSTOM"), source_provenance: item.sourceProvenance ?? null,
      production_readiness_json: json(item.productionReadiness ?? (item.productionProfileId ? { status: "CONFIGURED", reason: null } : { status: "DATA_GAP", reason: "Productieprofiel ontbreekt" })),
    })),
    variants: order.items.flatMap((item) => (item.variants ?? []).map((variant, index) => ({
      id: variant.id, order_item_id: item.id, sequence_no: index + 1, quantity: variant.quantity,
      size_label: variant.size, personalization: variant.personalization,
      personalization_values_json: json(variant.personalizationValues ?? null), deviation: Boolean(variant.deviation),
      back_number_production_json: json(variant.backNumberProduction ?? null),
      participant_name: variant.participantName ?? null,
    }))),
  };
}

export function mariaDbRowsToOrder(orderRow, itemRows, variantRows = []) {
  const items = itemRows.map((row) => ({
    id: row.id, articleId: row.article_id ?? undefined, articleNumber: row.article_number ?? undefined,
    imageKey: row.image_key ?? undefined, product: row.product, association: row.association_name ?? undefined,
    size: row.size_label ?? undefined, quantity: Number(row.quantity), personalization: row.personalization,
    personalizationValues: parsed(row.personalization_values_json, null) ?? undefined, deviation: Boolean(row.deviation),
    foilColor: row.foil_color, productionProfileId: row.production_profile_id ?? undefined,
    productionInstruction: row.production_instruction ?? undefined,
    backNumberProduction: parsed(row.back_number_production_json, null),
    sourceType: row.source_type ?? (row.article_id ? "CATALOG" : "CUSTOM"), sourceProvenance: row.source_provenance ?? undefined,
    productionReadiness: parsed(row.production_readiness_json, row.production_profile_id ? { status: "CONFIGURED", reason: null } : { status: "DATA_GAP", reason: "Productieprofiel ontbreekt" }),
    variants: variantRows.filter(({ order_item_id }) => order_item_id === row.id).sort((a, b) => a.sequence_no - b.sequence_no).map((variant) => ({
      id: variant.id, quantity: Number(variant.quantity), size: variant.size_label, personalization: variant.personalization,
      personalizationValues: parsed(variant.personalization_values_json, null) ?? undefined,
      deviation: Boolean(variant.deviation), participantName: variant.participant_name ?? "", backNumberProduction: parsed(variant.back_number_production_json, null),
    })),
  }));
  return {
    id: orderRow.id, revision: Number(orderRow.revision), customer: orderRow.customer,
    customerEmail: orderRow.customer_email ?? undefined, customerPhone: orderRow.customer_phone ?? undefined,
    association: orderRow.association_name, associations: parsed(orderRow.associations_json, [orderRow.association_name]),
    standardPersonalization: parsed(orderRow.standard_personalization_json, { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" }),
    createdAt: orderRow.created_at, updatedAt: orderRow.updated_at, promisedAt: orderRow.promised_at ?? null,
    stage: orderRow.stage, orderKind: orderRow.order_kind ?? "LEGACY", owner: orderRow.owner ?? orderRow.owner_user_id, acceptedBy: parsed(orderRow.accepted_by_json, { userId: "unknown", name: orderRow.owner ?? orderRow.owner_user_id, salesNumber: null, at: orderRow.created_at }), totalPieces: Number(orderRow.total_pieces),
    attention: orderRow.attention ?? undefined, productionReference: orderRow.production_reference ?? undefined,
    foilStates: parsed(orderRow.foil_states_json, []), notes: parsed(orderRow.notes_json, []), priority: parsed(orderRow.priority_json, null),
    communication: parsed(orderRow.communication_json, { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } }),
    barcode: parsed(orderRow.barcode_json, null) ?? undefined, pickup: parsed(orderRow.pickup_json, { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null }),
    eventHistory: parsed(orderRow.event_history_json, []), items,
  };
}
