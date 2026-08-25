import { buildSportpaleisProductCatalog, querySportpaleisProductCatalog, type SportpaleisCatalogAudience, type SportpaleisCatalogProduct } from "./sportpaleis-product-catalog.ts";
import type { PilotBootstrap } from "./sportpaleis/pilot-api.ts";
import type { CatalogArticle, SportpaleisProductionElement, TeamkitProposal, TeamkitProposalItem, TeamkitProposalPlacement, TeamkitProposalRevision } from "./sportpaleis/workspace-data.ts";

export type TeamwearUse = "WEDSTRIJD" | "TRAINING" | "PRESENTATIE" | "ACCESSOIRES";

export interface TeamwearCatalogProduct extends SportpaleisCatalogProduct {
  supplierName: string;
  supplierArticleName: string;
  supplierArticleNumber: string;
  use: TeamwearUse;
  collection: string | null;
  familyKey: string | null;
  advicePriceEur: number | null;
  sourceStatus: "AUTHORITATIVE" | "CONTROLLED_FIXTURE" | "DATA_GAP";
  syncStatus: "CURRENT" | "REVIEW_REQUIRED" | "NOT_CONNECTED";
  variants: (SportpaleisCatalogProduct["variants"][number] & { colorHex: string | null; media: { kind: "FRONT" | "BACK" | "DETAIL"; imageKey: string }[] })[];
}

export interface TeamwearPriceQuote {
  advicePriceEur: number | null;
  effectivePriceEur: number | null;
  label: "Teamprijs" | "Jullie prijs" | null;
  minimumQuantity: number | null;
  policyRef: string | null;
  relationshipOverrideApplied: boolean;
}

export function teamwearContextArticles(state: PilotBootstrap, proposal: TeamkitProposal): CatalogArticle[] {
  const associationName = proposal.association.name?.toLocaleLowerCase("nl-NL");
  if (!associationName) return [];
  return state.articles.filter(({ active, association }) => active && association.toLocaleLowerCase("nl-NL") === associationName);
}

export function teamwearContextProductionAssets(state: PilotBootstrap, proposal: TeamkitProposal): SportpaleisProductionElement[] {
  const associationName = proposal.association.name?.toLocaleLowerCase("nl-NL");
  if (!associationName) return [];
  return state.productionElements.filter(({ lifecycleStatus, ownerName, contexts }) => lifecycleStatus === "PRODUCTION_READY" && (ownerName.toLocaleLowerCase("nl-NL") === associationName || contexts?.some(({ label }) => label.toLocaleLowerCase("nl-NL") === associationName)));
}

export interface TeamwearRelationshipContext {
  id: string;
  kind: "PERSON" | "ORGANIZATION" | "ASSOCIATION" | "TEAM" | "SUPPLIER" | "SPONSOR" | "GENERAL";
  name: string;
  subtitle: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  associationName: string | null;
  searchableTerms: string;
}

export interface TeamwearAssetLibraryEntry {
  id: string;
  name: string;
  kind: "CLUB_LOGO" | "SPONSOR" | "IMAGE" | "PRODUCTION_ASSET";
  masterRef: string;
  version: string;
  previewKind: "ASSOCIATION_LOGO" | "PRODUCTION_ELEMENT" | "PROPOSAL_SOURCE";
  contextIds: string[];
  internalOnly: boolean;
  customerContextIds: string[];
  sourceProposalId: string | null;
  sourceId: string | null;
  productionAssetId: string | null;
}

export type TeamwearVisualSurface = "FRONT_TORSO" | "BACK_TORSO" | "LEFT_SLEEVE" | "RIGHT_SLEEVE" | "LOWER_GARMENT" | "ACCESSORY";

export interface TeamwearCompositionPlacement {
  id: string;
  kind: TeamkitProposalPlacement["kind"];
  side: TeamkitProposalPlacement["side"];
  visual: {
    coordinateSpace: "GARMENT_PRINT_AREA_V1";
    surface: TeamwearVisualSurface;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    colorOverride: string | null;
  };
  production: {
    preset: TeamkitProposalPlacement["preset"];
    productionAssetId: string | null;
    assetVersion: string | null;
    sourceId: string | null;
    physicalSizeOverride: TeamkitProposalPlacement["physicalSizeOverride"];
  };
}

export interface TeamwearComposition {
  schema: "TEAMWEAR_COMPOSITION_V1";
  proposalId: string;
  proposalNumber: string;
  revision: number;
  immutableSnapshotHash: string | null;
  items: {
    id: string;
    productName: string;
    color: string;
    media: { frontImageKey: string | null; backImageKey: string | null };
    placements: TeamwearCompositionPlacement[];
  }[];
}

const VISUAL_POSITION = Object.freeze({ LINKERBORST: [33, 28], RECHTERBORST: [67, 28], MIDDENBORST: [50, 39], RUG_BOVEN: [50, 24], RUG_MIDDEN: [50, 48], MOUW_LINKS: [16, 35], MOUW_RECHTS: [84, 35], SHORT_LINKS: [38, 64], SHORT_RECHTS: [62, 64], BROEK: [50, 64], TAS: [50, 50] } satisfies Record<TeamkitProposalPlacement["preset"], readonly [number, number]>);

export function teamwearVisualSurface(preset: TeamkitProposalPlacement["preset"]): TeamwearVisualSurface {
  if (preset === "MOUW_LINKS") return "LEFT_SLEEVE";
  if (preset === "MOUW_RECHTS") return "RIGHT_SLEEVE";
  if (preset === "RUG_BOVEN" || preset === "RUG_MIDDEN") return "BACK_TORSO";
  if (preset === "SHORT_LINKS" || preset === "SHORT_RECHTS" || preset === "BROEK") return "LOWER_GARMENT";
  if (preset === "TAS") return "ACCESSORY";
  return "FRONT_TORSO";
}

function compositionPlacement(placement: TeamkitProposalPlacement): TeamwearCompositionPlacement {
  const [fallbackX, fallbackY] = VISUAL_POSITION[placement.preset];
  const visualPosition = placement.visualPosition?.coordinateSpace === "GARMENT_PRINT_AREA_V1" ? placement.visualPosition : null;
  return {
    id: placement.id,
    kind: placement.kind,
    side: placement.side,
    visual: {
      coordinateSpace: "GARMENT_PRINT_AREA_V1",
      surface: teamwearVisualSurface(placement.preset),
      xPercent: visualPosition?.xPercent ?? fallbackX,
      yPercent: visualPosition?.yPercent ?? fallbackY,
      widthPercent: placement.widthPercent,
      colorOverride: placement.colorOverride ?? null,
    },
    production: {
      preset: placement.preset,
      productionAssetId: placement.productionAssetId,
      assetVersion: placement.assetVersion,
      sourceId: placement.sourceId,
      physicalSizeOverride: placement.physicalSizeOverride ?? null,
    },
  };
}

function compositionItems(items: readonly TeamkitProposalItem[]): TeamwearComposition["items"] {
  return items.map((item) => ({
    id: item.id,
    productName: item.productName,
    color: item.color,
    media: {
      frontImageKey: item.catalogSnapshot?.imageKey ?? null,
      backImageKey: item.catalogSnapshot?.imageKey ?? null,
    },
    placements: item.placements.map(compositionPlacement),
  }));
}

/**
 * One deterministic visual source for Studio, customer review, proposal PDF and
 * future channel renders. Visual projection data stays explicitly separate from
 * production-authoritative profiles and physical overrides.
 */
export function buildTeamwearComposition(proposal: TeamkitProposal, revision?: TeamkitProposalRevision | null): TeamwearComposition {
  const snapshot = revision?.snapshot;
  return {
    schema: "TEAMWEAR_COMPOSITION_V1",
    proposalId: proposal.id,
    proposalNumber: proposal.proposalNumber,
    revision: snapshot?.revision ?? proposal.currentRevision,
    immutableSnapshotHash: revision?.snapshotHash ?? null,
    items: compositionItems(snapshot?.items ?? proposal.items),
  };
}

/** No write or FTP side effect: this is only a deterministic export contract. */
export function teamwearSquareProductRenderSpec(proposal: TeamkitProposal, revision?: TeamkitProposalRevision | null) {
  const composition = buildTeamwearComposition(proposal, revision);
  return {
    schema: "TEAMWEAR_RENDER_SPEC_V1" as const,
    width: 1200,
    height: 1200,
    format: "PNG" as const,
    fit: "GARMENT_CENTERED_WITH_SAFE_MARGIN" as const,
    composition,
    destination: null,
    ftpWrite: false as const,
  };
}

const useFor = (category: string, model: string): TeamwearUse => /tas|sok|kous|accessoire/iu.test(`${category} ${model}`) ? "ACCESSOIRES" : /polo|presentatie|jas|jacket/iu.test(`${category} ${model}`) ? "PRESENTATIE" : /training|zip|broek|pants/iu.test(`${category} ${model}`) ? "TRAINING" : "WEDSTRIJD";
const priceFor = (state: PilotBootstrap, product: SportpaleisCatalogProduct): number | null => {
  const article = state.articles.find(({ id }) => id === product.variants[0]?.sourceArticleId);
  const price = article?.priceConfiguration?.articleUnitPriceEur;
  return typeof price === "number" && Number.isFinite(price) ? price : null;
};

const FIXTURES = [
  ["Stanno", "Stanno / Deventrade", "Pride Shirt", "460001", "Shirts", "WEDSTRIJD", "Pride", "stanno-pride", 24.99, ["JUNIOR", "SENIOR", "UNISEX"]],
  ["Nike", "Nike Team", "Dri-FIT Park VII Shirt", "BV6708", "Shirts", "WEDSTRIJD", "Park", "nike-park", 24.99, ["SENIOR", "MEN", "UNISEX"]],
  ["Nike", "Nike Team", "Dri-FIT Park III Short", "BV6855", "Shorts", "WEDSTRIJD", "Park", "nike-park", 14.99, ["SENIOR", "UNISEX"]],
  ["adidas", "adidas Teamsport", "Entrada 26 Training Top", "AD-E26-TOP", "Trainingsjacks", "TRAINING", "Entrada", "adidas-entrada", 44.99, ["JUNIOR", "SENIOR", "UNISEX"]],
  ["JAKO", "JAKO Teamsport", "Challenge Presentatiejack", "JAKO-9321", "Jacks", "PRESENTATIE", "Challenge", "jako-challenge", 49.99, ["JUNIOR", "SENIOR", "UNISEX"]],
  ["Robey", "Robey Sportswear", "Team Bag", "RB-TB-01", "Tassen", "ACCESSOIRES", "Team", "robey-team", 34.99, ["UNISEX"]],
] as const;

export function buildTeamwearCatalog(state: PilotBootstrap): TeamwearCatalogProduct[] {
  const base = buildSportpaleisProductCatalog(state.articles).map((product): TeamwearCatalogProduct => ({
    ...product, supplierName: product.brand === "Stanno" ? "Stanno / Deventrade" : "Sportpaleis", supplierArticleName: product.model,
    supplierArticleNumber: product.variants[0]?.sourceArticleNumber ?? product.id, use: useFor(product.category, product.model), collection: null, familyKey: null,
    advicePriceEur: priceFor(state, product), sourceStatus: product.variants.some(({ sourceArticleId }) => state.articles.find(({ id }) => id === sourceArticleId)?.catalogProvenance) ? "AUTHORITATIVE" : "DATA_GAP",
    syncStatus: "REVIEW_REQUIRED", variants: product.variants.map((variant) => ({ ...variant, colorHex: null, media: [{ kind: "FRONT", imageKey: variant.imageKey }, { kind: "BACK", imageKey: variant.imageKey }] })),
  }));
  const fixtureMedia = ["teamwear-fixture-shirt-red", "teamwear-fixture-shirt-black", "teamwear-fixture-shorts-black", "teamwear-fixture-jacket-navy", "teamwear-fixture-jacket-black", "teamwear-fixture-bag-black"];
  const fixtures = FIXTURES.map(([brand, supplierName, model, number, category, use, collection, familyKey, advicePriceEur, audiences], index): TeamwearCatalogProduct => {
    const imageKey = fixtureMedia[index] ?? fixtureMedia[0];
    const audienceValues = audiences as readonly string[];
    return { id: `fixture-${brand}-${number}`.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-"), brand, supplierName, supplierArticleName: model, supplierArticleNumber: number, model, category, use, collection, familyKey, advicePriceEur, sourceStatus: "CONTROLLED_FIXTURE", syncStatus: "NOT_CONNECTED", audiences: [...audiences] as SportpaleisCatalogAudience[], sourceAdapterId: "teamwear-review-fixtures", variants: [{ id: `fixture-${number}-navy`, colorLabel: index === 2 ? "Zwart" : "Navy", colorHex: index === 2 ? "#101419" : "#102448", imageKey, media: [{ kind: "FRONT", imageKey }, { kind: "BACK", imageKey }], availableSizes: audienceValues.includes("JUNIOR") ? ["116", "128", "140", "152", "164", "S", "M", "L", "XL"] : ["XS", "S", "M", "L", "XL", "XXL"], sourceArticleId: "", sourceArticleNumber: number, associationNames: [] }] };
  });
  return [...fixtures, ...base];
}

export function queryTeamwearCatalog(products: readonly TeamwearCatalogProduct[], input: { query?: string; brand?: string; use?: TeamwearUse; audience?: SportpaleisCatalogAudience; offset?: number; limit?: number } = {}) {
  const needle = input.query?.trim().toLocaleLowerCase("nl-NL") ?? ""; const brand = input.brand?.toLocaleLowerCase("nl-NL");
  const filtered = products.filter((product) => (!brand || product.brand.toLocaleLowerCase("nl-NL") === brand) && (!input.use || product.use === input.use)
    && (!input.audience || product.audiences.includes(input.audience) || (["MEN", "WOMEN"].includes(input.audience) && product.audiences.includes("UNISEX")))
    && (!needle || `${product.brand} ${product.model} ${product.supplierArticleNumber} ${product.category} ${product.collection ?? ""}`.toLocaleLowerCase("nl-NL").includes(needle)));
  const offset = Math.max(0, input.offset ?? 0); const limit = Math.max(1, Math.min(48, input.limit ?? 12));
  return { products: filtered.slice(offset, offset + limit), total: filtered.length, nextOffset: offset + limit < filtered.length ? offset + limit : null, bounded: true as const };
}

export function resolveTeamwearPrice(product: TeamwearCatalogProduct, quantity = 10, relationshipId?: string | null): TeamwearPriceQuote {
  if (product.advicePriceEur == null) return { advicePriceEur: null, effectivePriceEur: null, label: null, minimumQuantity: null, policyRef: null, relationshipOverrideApplied: false };
  const relationshipDiscount = relationshipId?.includes("waterwijk") ? .25 : null;
  const baseDiscount = quantity >= 10 ? .2 : 0;
  const discount = relationshipDiscount ?? baseDiscount;
  return { advicePriceEur: product.advicePriceEur, effectivePriceEur: Math.round(product.advicePriceEur * (1 - discount) * 100) / 100, label: relationshipDiscount == null ? "Teamprijs" : "Jullie prijs", minimumQuantity: relationshipDiscount == null && baseDiscount ? 10 : null, policyRef: relationshipDiscount == null ? "teamwear-base-10-v1" : "relationship-waterwijk-v1", relationshipOverrideApplied: relationshipDiscount != null };
}

export function buildTeamwearRelationships(state: PilotBootstrap): TeamwearRelationshipContext[] {
  const contexts = new Map<string, TeamwearRelationshipContext>();
  const add = (value: TeamwearRelationshipContext) => { const existing = contexts.get(value.id); contexts.set(value.id, existing ? { ...existing, roles: [...new Set([...existing.roles, ...value.roles])], searchableTerms: `${existing.searchableTerms} ${value.searchableTerms}` } : value); };
  for (const association of state.associations) add({ id: `association:${association.id}`, kind: "ASSOCIATION", name: association.name, subtitle: "Vereniging", email: null, phone: null, roles: [], associationName: association.name, searchableTerms: `${association.name} ${association.sourceName}` });
  for (const order of state.orders) { const id = `customer:${order.customerEmail || order.customerPhone || order.customer}`.toLocaleLowerCase("nl-NL"); add({ id, kind: order.association ? "ORGANIZATION" : "GENERAL", name: order.customer || order.teamContext || order.id, subtitle: order.teamContext ? `Team · ${order.teamContext}` : order.association || "Klant", email: order.customerEmail || null, phone: order.customerPhone || null, roles: [order.teamContext ? "Teamcontact" : "Klant"], associationName: order.association || null, searchableTerms: `${order.id} ${order.customer} ${order.customerEmail ?? ""} ${order.customerPhone ?? ""} ${order.association} ${order.teamContext ?? ""}` }); }
  for (const proposal of state.teamkitProposals ?? []) { const id = `customer:${proposal.customer.email || proposal.customer.phone || proposal.customer.name}`.toLocaleLowerCase("nl-NL"); add({ id, kind: proposal.association.name ? "ASSOCIATION" : "ORGANIZATION", name: proposal.customer.name, subtitle: proposal.association.name ?? proposal.team ?? "Teamwear-context", email: proposal.customer.email || null, phone: proposal.customer.phone || null, roles: proposal.customer.contactName ? ["Contactpersoon"] : [], associationName: proposal.association.name, searchableTerms: `${proposal.proposalNumber} ${proposal.customer.name} ${proposal.customer.contactName} ${proposal.customer.email} ${proposal.customer.phone ?? ""} ${proposal.association.name ?? ""} ${proposal.team ?? ""}` }); }
  add({ id: "supplier:stanno", kind: "SUPPLIER", name: "Stanno / Deventrade", subtitle: "Leverancier · dealercontext", email: null, phone: null, roles: ["Leverancier"], associationName: null, searchableTerms: "Stanno Deventrade leverancier catalogus" });
  add({ id: "sponsor:rabobank", kind: "SPONSOR", name: "Rabobank", subtitle: "Sponsororganisatie · reviewfixture", email: null, phone: null, roles: ["Sponsor"], associationName: null, searchableTerms: "Rabobank sponsor" });
  add({ id: "organization:brandweer-almere", kind: "ORGANIZATION", name: "Brandweer Almere", subtitle: "Organisatie · reviewfixture", email: null, phone: null, roles: ["Opdrachtgever"], associationName: null, searchableTerms: "Brandweer Almere organisatie" });
  return [...contexts.values()].sort((left, right) => left.name.localeCompare(right.name, "nl-NL"));
}

export function buildTeamwearAssetLibrary(state: PilotBootstrap, proposal?: TeamkitProposal): TeamwearAssetLibraryEntry[] {
  const entries = new Map<string, TeamwearAssetLibraryEntry>();
  for (const association of state.associations) if (association.workspaceLogo) entries.set(`sha:${association.workspaceLogo.sha256}`, { id: `association-logo:${association.id}`, name: `${association.name} clublogo`, kind: "CLUB_LOGO", masterRef: association.workspaceLogo.sha256, version: String(association.revision ?? 1), previewKind: "ASSOCIATION_LOGO", contextIds: [`association:${association.id}`], internalOnly: true, customerContextIds: [`association:${association.id}`], sourceProposalId: null, sourceId: null, productionAssetId: null });
  for (const asset of state.productionElements) { const masterRef = asset.sourceLayers?.visualSource?.sha256 ?? asset.sourceId ?? asset.id; const kind = asset.applications?.some(({ kind }) => kind === "SPONSOR") ? "SPONSOR" : asset.applications?.some(({ kind }) => kind === "LOGO") ? "CLUB_LOGO" : "PRODUCTION_ASSET"; entries.set(`master:${masterRef}`, { id: asset.id, name: asset.name, kind, masterRef, version: asset.version ?? String(asset.revision), previewKind: "PRODUCTION_ELEMENT", contextIds: (asset.contexts ?? []).map(({ type, id }) => `${type.toLocaleLowerCase()}:${id}`), internalOnly: true, customerContextIds: (asset.contexts ?? []).filter(({ type }) => ["ASSOCIATION", "TEAM", "ORGANIZATION"].includes(type)).map(({ type, id }) => `${type.toLocaleLowerCase()}:${id}`), sourceProposalId: null, sourceId: asset.sourceId ?? null, productionAssetId: asset.id }); }
  if (proposal) {
    const contextId = teamwearProposalContextId(proposal);
    const contextProposals = (state.teamkitProposals ?? []).filter((candidate) => candidate.id === proposal.id || (contextId && teamwearProposalContextId(candidate) === contextId));
    for (const candidate of contextProposals) for (const source of candidate.sources) {
      const key = `sha:${source.sha256}`;
      if (!entries.has(key)) entries.set(key, { id: `shared-source:${candidate.id}:${source.id}`, name: source.filename, kind: "IMAGE", masterRef: source.sha256, version: String(source.version), previewKind: "PROPOSAL_SOURCE", contextIds: [...new Set([contextId, `proposal:${candidate.id}`].filter((value): value is string => Boolean(value)))], internalOnly: true, customerContextIds: contextId ? [contextId] : [`proposal:${candidate.id}`], sourceProposalId: candidate.id, sourceId: source.id, productionAssetId: null });
    }
  }
  return [...entries.values()];
}

export function teamwearProposalContextId(proposal: TeamkitProposal): string | null {
  return proposal.association.id ? `association:${proposal.association.id}` : proposal.customer.email || proposal.customer.phone || proposal.customer.name ? `customer:${proposal.customer.email || proposal.customer.phone || proposal.customer.name}`.toLocaleLowerCase("nl-NL") : null;
}

export function teamwearTeamorderHandoff(proposal: TeamkitProposal): { existingRoute: string; context: string; association: string; proposalId: string; articleIds: string[]; missing: string[] } {
  return { existingRoute: "/workspace/sportpaleis/orders/team", context: proposal.team ?? proposal.association.name ?? proposal.customer.name ?? proposal.proposalNumber, association: proposal.association.name ?? "", proposalId: proposal.id, articleIds: proposal.items.map(({ articleId }) => articleId).filter((id): id is string => Boolean(id)), missing: ["personen", "maten", "aantallen", "individuele personalisatie"] };
}

/** Synthetic scale probe: applies the same bounded query without serialising 5k rows to the UI. */
export function catalogScaleProbe(seed: readonly TeamwearCatalogProduct[], count = 5_200) {
  const synthetic = Array.from({ length: count }, (_, index) => ({ ...seed[index % seed.length], id: `scale-${index}` }));
  return querySportpaleisProductCatalog(synthetic, { limit: 24 });
}
