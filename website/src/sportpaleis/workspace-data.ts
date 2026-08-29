export type SportpaleisRole = "admin" | "operator" | "store" | "support";
export type SportpaleisWorkContext = "ORGANISATION" | "STORE" | "WEBSHOP" | "PRODUCTION" | "ALL";
export type SportpaleisOrderSource = "STORE" | "WEBSHOP_XPRT" | "TEAM_MAIL" | "INVOICE" | "MANUAL";
export type OrderStage = "ORDER" | "CONTROL" | "PRINT" | "DONE";
export type BackNumberSizeClass = "JUNIOR" | "SENIOR";
export type ValidationStatus = "VALIDATED" | "SOURCE_CONFIGURED" | "DATA_GAP";
export type ProductionProofStatus = "CONFIGURED" | "GEOMETRY_VALIDATED" | "WINPLOT_VALIDATED" | "PHYSICALLY_VALIDATED" | "DATA_GAP";
export type ProductionLineType = "TEXT" | "INITIALS" | "NUMBER" | "LOGO" | "PRODUCTION_ELEMENT";

export interface SportpaleisProductionFont {
  id: string;
  name: string;
  originalFilename: string;
  version: string;
  sha256: string;
  mimeType: "font/ttf" | "font/otf" | "font/woff" | "font/woff2";
  sizeBytes: number;
  addedAt: string;
  uploadedBy: { userId: string; name: string };
  provenance: string;
  status: "TECHNICALLY_VALID" | "REJECTED" | "INACTIVE";
  allowedInStore: boolean;
  sourceUrl: string;
}

export interface SportpaleisProductionLine {
  id: string;
  orderId?: string;
  itemId?: string;
  variantId?: string;
  variantIds?: string[];
  personalizationField?: "initials" | "name" | "backNumber" | "chestNumber" | "shortsNumber";
  decorationIdentity?: { orderId: string; itemId: string; articleNumber: string; decorationType: "initials" | "name" | "backNumber" | "chestNumber" | "shortsNumber"; placement: string; value: string; foilColor: string; productionProfileId: string };
  type: ProductionLineType;
  content: string;
  source: {
    kind: "FONT" | "PROFILE" | "PRODUCTION_ELEMENT" | "PRODUCTION_SOURCE";
    id: string;
    version: string;
    sha256?: string;
    sourceSetId?: string;
    geometryAdapterId?: string;
    geometryAdapterVersion?: string;
    outputWriterId?: string;
    outputWriterVersion?: string;
    variantId?: string | null;
  };
  widthMm: number;
  heightMm: number;
  /** The physical foil color belongs to this production element, not only to the order. */
  foilColor?: string;
  quantity: number;
  preview: { kind: "LIVE_FONT" | "PROFILE_REFERENCE" | "ASSET_REFERENCE"; label: string; aspectRatioLocked: boolean };
  provenance: string;
  proofStatus: ProductionProofStatus;
  validation: { status: "VALID" | "BLOCKED"; reason: string | null };
  /** Explicit fail-closed evidence when an approved Teamkit placement has no reliable physical production data yet. */
  dataGap?: { status: "DATA_GAP"; fields: ("SOURCE" | "DIMENSIONS" | "FOIL_COLOR")[]; reason: string };
  /** Immutable Teamkit placement/measurement evidence. Visual percentages are never interpreted as production millimetres. */
  teamkitProductionContext?: {
    proposalPlacementId: string;
    side: "FRONT" | "BACK";
    preset: TeamkitPlacementPreset;
    articleId: string | null;
    profileId: string | null;
    profileRevision: number | null;
    measurementSource: "PRODUCTION_PROFILE" | "PRODUCTION_ASSET" | "EXPLICIT_PROPOSAL_OVERRIDE" | "DATA_GAP";
    measurementEvidence: string;
    explicitOverride: { widthMm: number; heightMm: number; aspectRatioLocked: true } | null;
  };
  placementRole?: "INITIALS_FIRST" | "INITIALS_INFIX" | "INITIALS_LAST";
  placementRule?: {
    compositionId: string;
    compositeText: string;
    segmentIndex: 0 | 1 | 2;
    segmentCount: 3;
    alignment: "CENTER";
    horizontalSpacingMm: number | null;
    baselineOffsetMm: number | null;
    profileRevision?: number;
    ruleRevision?: number;
  };
}

export interface BackNumberProductionContext {
  sizeClass: BackNumberSizeClass;
  physicalHeightMm: number | null;
  status: "VALIDATED" | "SOURCE_CONFIGURED" | "DATA_GAP";
  source: string;
}

export interface SportpaleisUser {
  id: string;
  name: string;
  initials: string;
  role: SportpaleisRole;
  email: string;
  status: "Actief" | "Inactief" | "Uitgenodigd";
  seatType?: "customer" | "support";
  salesNumber?: string | null;
  personType?: "HUMAN" | "FUNCTION" | "SYSTEM";
  workContexts?: SportpaleisWorkContext[];
  defaultContext?: SportpaleisWorkContext;
  quickAuth?: { mode: "PASSWORD" | "PIN"; pinEnrolled: boolean };
  recovery?: { state: "NONE" | "REQUESTED" | "LINK_ISSUED"; requestedAt: string | null; expiresAt: string | null };
  /** Server-authoritative, per-principal exposure. Never inferred from a URL or client role. */
  featureExposure?: { teamwearExperiencePilot?: boolean };
  /** Present only for the short-lived WBD review/development principal. */
  principalType?: "REVIEW_DEVELOPER";
  candidateId?: string;
  invitation?: {
    state: "VALID" | "EXPIRED" | "MISSING" | "AMBIGUOUS";
    expiresAt: string | null;
    identityState: "CLEAR" | "PENDING_DUPLICATE" | "ACCOUNT_EXISTS" | "AMBIGUOUS_ACCOUNTS";
  };
}

export interface SportpaleisEmployee {
  id: string;
  name: string;
  salesNumber: string;
  active: boolean;
  userId: string | null;
  revision: number;
  accountType?: "HUMAN" | "FUNCTION" | "SYSTEM";
  provenance?: { sourceId: string; observedAt: string; importedAt: string };
}

export interface SportpaleisWebsiteSyncState {
  enabled: boolean;
  mode: "STAGE_ONLY";
  cadence: "NIGHTLY_03_00_EUROPE_AMSTERDAM";
  source: { storefrontUrl?: string; sitemapUrl: string; associationPath: string; cadence: string };
  status: "NOT_RUN" | "OK" | "ATTENTION" | "ERROR";
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  nextRunAt: string | null;
  sourceFingerprint: string | null;
  counts: { raw?: number; live?: number; productionRelevant?: number; autoNoop?: number; associations: number; articles: number; new: number; changed: number; attention: number };
  changes: { id: string; kind: string; sourceIdentifier: string; sourceFingerprint?: string; label: string; association?: string; status: "PENDING_REVIEW"; explanation: string; nextBestAction: string; sourceValue?: { name?: string; url?: string; imageUrl?: string; productionRelevance?: { status: string; fields?: string[]; evidence?: string } }; workspaceValue?: { name?: string; url?: string | null } | null }[];
  lastError: { code: string; message: string } | null;
}

export interface SportpaleisWebshopIntakeState {
  enabled: boolean;
  status: "READY" | "ATTENTION";
  startBoundary: string | null;
  lastSuccessfulRetrievalAt: string | null;
  highWaterMark: string | null;
  processedSourceIdentifiers: string[];
  processedOrderRevisionIdentifiers: string[];
  retrievalMode: "CONTROLLED_MAIL_DOCUMENT_ADAPTER";
  channel: "WEBSHOP_XPRT";
  sources: {
    id: string; sourceMessageId: string; receivedAt: string; filename: string; mimeType: "application/pdf";
    sizeBytes: number; sha256: string; dataBase64?: string; immutable: true; importedAt: string; importedBy: string;
  }[];
  matches: {
    id: string; sourceId: string; externalReference: string; orderDate: string | null; customer: string | null; association: string | null;
    contentHash: string; status: "HUMAN_CHECK" | "ACCEPTED"; orderId: string | null; reviewReasons: string[];
    articles: { articleNumber: string; description: string; size: string; color: string; quantity: number; personalization: { kind: "INITIALS" | "BACK_NAME" | "BACK_NUMBER" | "CHEST_NUMBER" | "SHORTS_NUMBER" | "STOCK_LOGO"; value: string; sourceLabel: string; sourceValue: string }[]; articlePersonalizationRule?: { kind: string; source: string; overridesGeneralChoice: true } }[];
    source: { pageNumbers: number[]; segmentHash: string; originalEvidence: string };
    acceptedAt: string | null; acceptedBy: string | null;
  }[];
  printEvents: { id: string; orderId: string; at: string; byUserId: string; kind: "PRINT" | "REPRINT" }[];
  stockLogo: { association: "VVA / Spartaan"; currentStock: number; unconfirmedValue20: number; mutations: { id: string; orderId: string; quantity: number; previousStock: number; nextStock: number; at: string; byUserId: string; idempotencyKey: string }[] };
}

export interface OrderAcceptedBy {
  userId: string;
  name: string;
  salesNumber: string | null;
  at: string;
}

export interface WorkspaceOrderItem {
  id: string;
  articleId?: string;
  articleNumber?: string;
  imageKey?: string;
  product: string;
  association?: string;
  size?: string;
  quantity: number;
  personalization: string;
  personalizationValues?: Partial<OrderPersonalization>;
  deviation?: boolean;
  foilColor: string;
  productionProfileId?: string;
  productionInstruction?: string;
  backNumberProduction?: BackNumberProductionContext | null;
  sourceType?: "CATALOG" | "CUSTOM" | "LEGACY";
  sourceProvenance?: string;
  productionReadiness?: { status: "CONFIGURED" | "ATTENTION" | "DATA_GAP"; reason: string | null };
  variants?: WorkspaceOrderVariant[];
}

export interface WorkspaceOrderVariant {
  id: string;
  quantity: number;
  size: string;
  personalization: string;
  personalizationValues?: Partial<OrderPersonalization>;
  deviation?: boolean;
  backNumberProduction?: BackNumberProductionContext | null;
  participantName?: string;
}

export interface OrderPersonalization {
  initials: string;
  /** Optional for backward compatibility with orders created before the infix field existed. */
  initialsInfix?: string;
  name: string;
  backNumber: string;
  /** Artikel-specifieke aanvullende optie; afwezig bij bestaande orders. */
  chestNumber?: string;
  backNumberSizeClass: BackNumberSizeClass | "";
  shortsNumber: string;
  /** Legacy read-only field; new input uses initialsInfix without name parsing. */
  initialsSemantic?: { prefix: string; infix: string; surname: string; typographyManagedByProfile: true };
}

export interface CatalogArticle {
  id: string; articleNumber: string; name: string; imageKey: string; category: string;
  association: string; profileId: string; supports: (keyof OrderPersonalization)[]; active: boolean;
  displayOrder?: number;
  /** Null means: inherit the association default. Missing means legacy profile-color compatibility. */
  foilColorOverride?: string | null;
  supplierArticleNumber?: string;
  commercialPrintOptions?: { sourceLabel: string; canonicalField: keyof OrderPersonalization | null; priceEur: number | null; status: "VALIDATED" | "DATA_GAP" }[];
  catalogProvenance?: { authority: "SPORTPALEIS_LIVE"; url: string; imageUrl: string; checkedAt: string };
  /**
   * Productmedia from the same authoritative catalogue article/colour context.
   * Teamwear consumes this projection and never creates a parallel garment-image record.
   */
  catalogMedia?: {
    kind: "FRONT" | "BACK" | "ALTERNATIVE";
    imageKey: string | null;
    sourceUrl: string;
    sourceIndex: number;
    sourceProductId: string | null;
    sourceColorId: string | null;
    colorLabel: string | null;
    authority: "SPORTPALEIS_LIVE_PRODUCT_GALLERY";
    classification: "SOURCE_GALLERY_ORDER_V1";
    checkedAt: string;
  }[];
  /** Teamwear curation is independent from availability in ordinary store orders. */
  teamwearCatalog?: {
    status: "REVIEW_REQUIRED" | "SELECTABLE" | "HIDDEN";
    brand: string;
    model: string;
    category: string;
    audiences: ("JUNIOR" | "SENIOR" | "MEN" | "WOMEN" | "UNISEX")[];
    colorLabel: string;
    collection: string | null;
    sourceLabel: string;
    sourceUrl: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
  };
  printRelevance?: { status: "CONFIRMED_VISIBLE_PERSONALIZATION" | "HUMAN_CONFIRMATION_REQUIRED"; sourceLabel: string; checkedAt: string };
  productionDataGaps?: string[];
  revision?: number;
  variantLabels?: string[];
  availableSizes?: string[];
  validation?: {
    status: "VALIDATED" | "PARTIAL" | "DATA_GAP";
    source: string;
    name: "VALIDATED" | "DATA_GAP";
    sku: "VALIDATED" | "DATA_GAP";
    image: "VALIDATED" | "DATA_GAP";
    variants: "VALIDATED" | "DATA_GAP";
    sizes: "VALIDATED" | "DATA_GAP";
    personalization: "VALIDATED" | "DATA_GAP";
  };
  validationHistory?: { at: string; userId: string; previous: unknown; next: unknown; source: string }[];
  personalizationPolicy?: { mode: "none" | "required" | "optional" | "mutually-exclusive" | "combination"; fields: Record<string, "required" | "optional"> };
  priceConfiguration?: {
    articleUnitPriceEur: number | null;
    articleUnitPricesBySizeEur?: Record<string, number | null>;
    personalizationUnitPricesEur: Partial<Record<keyof OrderPersonalization, number | null>>;
    sourceLabel: string;
  };
}

export interface ManagedCheckoutPriceLine {
  quantity: number;
  unitPriceEur: number | null | undefined;
}

export function calculateManagedCheckoutTotal(lines: ManagedCheckoutPriceLine[]): {
  totalEur: number | null;
  missingPriceCount: number;
} {
  let totalEur = 0;
  let missingPriceCount = 0;
  for (const line of lines) {
    if (typeof line.unitPriceEur !== "number") {
      missingPriceCount += 1;
      continue;
    }
    totalEur += line.unitPriceEur * line.quantity;
  }
  return { totalEur: missingPriceCount ? null : Math.round(totalEur * 100) / 100, missingPriceCount };
}

export interface BedrukkenCheckoutPriceLine {
  articleUnitPriceEur?: number | null;
  personalizations: ManagedCheckoutPriceLine[];
}

export function calculateBedrukkenCheckoutTotal(lines: BedrukkenCheckoutPriceLine[]): {
  totalEur: number | null;
  missingPriceCount: number;
} {
  return calculateManagedCheckoutTotal(lines.flatMap(({ personalizations }) => personalizations));
}

export interface ProductionProfile {
  id: string; name: string; placement: string; referenceDistanceCm: number | null; sizeLabel: string;
  fontProfile: string; foilColor: string; mirror: boolean | null; rotationDeg: number | null; instruction: string;
  revision?: number;
  validation?: {
    status: "VALIDATED" | "PARTIAL" | "DATA_GAP";
    source: string;
    placement: ValidationStatus;
    referenceDistance: ValidationStatus;
    size: ValidationStatus;
    font: ValidationStatus;
    foilColor: ValidationStatus;
    rotation: ValidationStatus;
    mirror: ValidationStatus;
    cutContour?: ValidationStatus;
    physicalCutOutput?: ValidationStatus;
    validatedScope?: string[];
  };
  validationHistory?: { at: string; userId: string; previous: unknown; next: unknown; source: string }[];
  backNumberSizeClasses?: Partial<Record<BackNumberSizeClass, { physicalHeightMm: number | null; sourceValueMm?: number | null; status: "VALIDATED" | "SOURCE_CONFIGURED" | "DATA_GAP"; source: string }>>;
  productionSourceSetId?: string;
  outputWriterId?: string;
  productionNumberAssetIds?: string[];
  supports?: (keyof OrderPersonalization)[];
  initialsInfixRule?: { active: boolean; heightMm: number | null; horizontalSpacingMm: number | null; baselineOffsetMm: number | null; alignment: "CENTER"; status: "SOURCE_CONFIGURED" | "DATA_GAP"; revision: number; /** Read-only migration compatibility; never used for new output. */ verticalOffsetMm?: number | null };
}

export interface AssociationConfiguration {
  id: string;
  name: string;
  sourceName: string;
  active: boolean;
  source: { file: string; sheet: string; range: string };
  fontProfile: string;
  fontEvidence?: {
    sourceValue: string;
    confirmedAssociationName: string;
    confirmedValue: string | null;
    canonicalName: string | null;
    confirmationStatus: "MATCH" | "MISMATCH" | "DATA_GAP";
    applied: boolean;
    assetStatus: "DATA_GAP" | "PRESENT" | "HUMAN_PRODUCT_TRUTH_CONFIRMED";
    assetId: string | null;
    reference: string | null;
    referenceKind: "VECTOR_CONTOUR_REFERENCE" | null;
    referenceAsset?: { filename: string; format: string; sha256: string; status: "PRESENT_NOT_A_FONT_FILE" } | null;
    exception: string | null;
    reason: string | null;
    provenance: { id: string; confirmedAt: string; authority: string; limitation: string };
  };
  foilColors: string[];
  /** Existing records inherit foilColors[0] until an admin explicitly stores this field. */
  defaultFoilColor?: string;
  dimensionsCm: {
    initialsShirt: number | null;
    backNumberJuniorSourceValue: number | null;
    backNumberSenior: number | null;
    chestNumber: number | null;
    shortsNumber: number | null;
    nameHeight: number | null;
  };
  juniorValidationStatus: "DATA_GAP" | "VALIDATED";
  juniorPhysicalHeightMm?: number | null;
  juniorGarmentSizes?: string[];
  juniorValidationNote: string;
  notes: string;
  articleCatalogStatus: string;
  workspaceLogo?: {
    filename: string;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    dataBase64: string;
    sha256: string;
    updatedAt: string;
    updatedBy: string;
    sourceUrl?: string;
    checkedAt?: string;
    authority?: "SPORTPALEIS_LIVE_ASSOCIATION_PAGE";
  } | null;
  revision?: number;
  updatedAt?: string;
  validationHistory?: { at: string; userId: string; field: string; previous: unknown; next: unknown; source: string }[];
}

export interface FoilRoll {
  id: string; color: string; supplierType: string | null; purchasePriceEur: number | null;
  originalLengthM: number | null; widthMm: number | null; usedLengthMm: number | null;
  active?: boolean; revision?: number; createdAt?: string;
}

export interface CommercialAdministration {
  sourceLabel: string;
  seats: {
    customerSeats: number;
    activeCustomerSeats: number;
    supportAccessOutsideSeats: boolean;
    pendingExtraUserRequests: number;
  };
  agreements: { label: string; value: string; source: string }[];
  subscription: { status: "Niet gekoppeld"; monthlyPriceEur: null; source: string };
  invoices: { status: "Geen factuurbron aangesloten"; records: []; source: string };
}

export interface WorkspaceOrder {
  id: string;
  revision: number;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  association: string;
  associations?: string[];
  standardPersonalization?: OrderPersonalization;
  createdAt: string;
  updatedAt?: string;
  promisedAt: string | null;
  stage: OrderStage;
  /** Server-derived operational status. Never use the stage alone as production readiness. */
  productionStatus?: "ATTENTION" | "READY" | "IN_PRODUCTION" | "DONE";
  productionStatusReason?: string | null;
  productionClosure?: { status: "NOT_ELIGIBLE" | "ELIGIBLE" | "CONFIRMED"; reason: string | null };
  orderKind?: "INDIVIDUAL" | "TEAM" | "CUSTOM" | "LEGACY";
  teamContext?: string | null;
  owner: string;
  acceptedBy?: OrderAcceptedBy;
  salesAttribution?: { employeeId?: string | null; salesNumber: string | null; label: string; accountType: "HUMAN" | "FUNCTION" | "SYSTEM" | "UNASSIGNED"; selectedByUserId: string; selectedAt: string };
  sourceContext?: { source: SportpaleisOrderSource; label: string; externalReference: string | null; provenance: string; transactionalAuthority: "WORKSPACE" | "ACA_XPRT" | "EXTERNAL"; quickIntake?: { id: string; sourceKind: "PHOTO" | "PDF" | "DOCUMENT" | "EMAIL"; filename: string; sha256: string; version: string }; webshopDocument?: { sourceId: string; sourceMessageId: string; filename: string; sha256: string; contentHash: string } };
  referenceSeries?: "SP" | "TK";
  teamkitContext?: {
    kind: "TEAMKIT_APPROVAL";
    proposalId: string;
    proposalNumber: string;
    approvedRevision: number;
    itemId: string;
    itemSnapshotHash: string;
    productionSizingRevision: number;
    productionSizingSnapshotHash: string;
    fulfillmentTaskIds: string[];
    placementRefs: { placementId: string; taskId: string; assetId: string | null; assetVersion: string | null; assetSha256: string | null }[];
    snapshotHash: string;
    previewSha256: string;
    pdfSha256: string;
    idempotencyKey: string;
  };
  totalPieces: number;
  attention?: string;
  productionReference?: "SNIJTEST-001";
  foilStates?: { color: string; status: "READY" | "HOLD" }[];
  items: WorkspaceOrderItem[];
  productionLines?: SportpaleisProductionLine[];
  stockApplications?: { id: string; kind: "STOCK_LOGO"; association: "VVA / Spartaan"; quantity: number; status: "PENDING" | "APPLIED"; appliedAt: string | null; appliedBy: string | null; source: "WEBSHOP_XPRT" }[];
  notes?: { id: string; scope: "order" | "customer"; kind: "internal" | "attention"; text: string; authorId: string; authorName: string; createdAt: string }[];
  priority?: { requestedBy: string; alignedWith: string; reason: string; explanation: string; createdAt: string } | null;
  communication?: { requiredForIndividualOrder?: boolean; receipt: { status: string; updatedAt?: string; providerReference?: string | null }; production?: { status: string; updatedAt?: string; providerReference?: string | null }; ready: { status: string; updatedAt?: string; providerReference?: string | null } };
  barcode?: { value: string; featureEnabled: false; hardwareValidated: false };
  pickup?: { status: "NOT_PICKED_UP" | "PICKED_UP"; pickedUpAt: string | null; pickedUpBy: string | null };
  payment?: { status: "UNKNOWN" | "DUE" | "PAID" | "REGISTER_PROCESSED"; updatedAt: string | null; updatedBy: string | null; source: "MANUAL_WORKSPACE" | "ACA_XPRT" | "UNKNOWN" };
  fulfillment?: { mode: "PICKUP" | "DELIVERY"; status: "PENDING" | "READY_FOR_PICKUP" | "PICKED_UP" | "DELIVERED"; updatedAt: string | null; updatedBy: string | null; feeEur?: number; address?: { postalCode: string; houseNumber: string; houseNumberSuffix: string; street: string; city: string; lookupStatus: "VERIFIED" | "MANUAL_FALLBACK" } | null };
  operationalFacts?: Partial<Record<"PRINTED" | "REGISTER_PROCESSED" | "PAID" | "CUSTOMER_INFORMED" | "READY_FOR_PICKUP" | "PICKED_UP" | "DELIVERED", { at: string; userId: string; userName: string; source: "MANUAL_WORKSPACE" }>>;
  eventHistory?: { type: string; at: string; userId: string; userName: string; source: string; details?: Record<string, unknown> }[];
  deletion?: {
    status: "DELETED";
    at: string;
    byUserId: string;
    byUserName: string;
    reason: string | null;
    restorable: boolean;
  };
  productionArchive?: {
    status: "ARCHIVED";
    at: string;
    byUserId: string;
    byUserName: string;
    reason: string | null;
    preservedProductionJobIds: string[];
  };
}

export interface SportpaleisMailbatch {
  id: string;
  sourceMessageId: string;
  source: "WEBSHOP_XPRT" | "TEAM_MAIL";
  scheduledWindow: "08:30" | "12:00" | "14:00" | "16:00";
  importedAt: string;
  importedBy: string;
  status: "IMPORTED" | "REVIEW_REQUIRED";
  provenance: string;
  input?: { filename: string; format: "CSV" | "TSV" | "STRUCTURED"; sha256: string; rowCount: number; sourceStatus: "REAL_EXPORT_UNCONFIRMED" | "MANUAL_STRUCTURED" };
  records: { externalId: string; externalReference: string; customer: string; association: string | null; changes: string[]; productionConcept: boolean; transactionalAuthority: "ACA_XPRT" | "EXTERNAL" }[];
}

export interface SportpaleisProductionElement {
  id: string;
  /** Stable registration identity for retry-safe Source → Asset → Context/Application registration. */
  registrationId?: string;
  name: string;
  ownerType: "ASSOCIATION" | "CUSTOMER" | "SPONSOR" | "OWN_BRAND";
  ownerName: string;
  sourceAsset: string;
  sourceStatus: "AVAILABLE" | "REFERENCE_ONLY" | "DATA_GAP";
  /** Production Assets V1: one immutable source can yield many managed assets. */
  sourceId?: string;
  version?: string;
  verifiedSourceKey?: string;
  lifecycleStatus?: "CANDIDATE" | "REVIEW" | "PRODUCTION_READY" | "ARCHIVED";
  productionMethod?: "SELF_PRODUCED" | "PHYSICAL_TRANSFER";
  sizePolicy?: {
    mode: "FIXED" | "DEFAULT_WITH_LIMITS" | "PROPORTIONAL_FREE";
    aspectRatioLocked: true;
    defaultWidthMm: number;
    defaultHeightMm: number;
    minWidthMm: number | null;
    maxWidthMm: number | null;
  };
  defaultFoilColor?: string | null;
  physicalTransfer?: { supplier: string | null; location: string | null; stock: number | null; reserved: number | null };
  contexts?: { type: "ASSOCIATION" | "SPONSOR" | "ORGANIZATION" | "TEAM" | "ARTICLE" | "ORDER" | "GENERIC"; id: string; label: string }[];
  applications?: { kind: "LOGO" | "SPONSOR" | "NUMBER_SET" | "ARTWORK"; placement: string | null }[];
  sourceSelection?: { candidateIds: string[]; selectionRef: string; geometryHash: string };
  controlledVector?: { format: "WBD_CONTOURS_V1"; geometryHash: string; contourCount: number; pointCount: number; contours?: { id: string; closed: true; points: { x: number; y: number }[] }[] };
  numberGlyphs?: Record<string, { candidateId: string; geometryHash: string; widthUnits: number; heightUnits: number; contours?: { id: string; closed: true; points: { x: number; y: number }[] }[] }>;
  numberComposition?: { freeContourSpacingMm: 30; measurement: "CONTOUR_TO_CONTOUR" };
  sourceLayers?: {
    visualSource: { filename: string; mimeType: string; sha256: string } | null;
    vectorSource: { filename: string; mimeType: string; sha256: string } | null;
    validatedCutContour: { sourceId: string; version: string; sha256: string } | null;
    physicallyProvenContour: { sourceId: string; version: string; sha256: string } | null;
  };
  revision: number;
  variants: {
    id: string;
    label: string;
    widthMm: number | null;
    heightMm: number | null;
    productionMode: "INTERNAL_PLOT" | "EXTERNAL";
    currentStock: number | null;
    minimumStock: number | null;
    targetStock: number | null;
  }[];
}

export interface SportpaleisProductionAssetSource {
  id: string;
  version: string;
  revision?: number;
  intakeKind?: "ARTWORK" | "NUMBER_SET";
  original: { filename: string; mimeType: string; format: "SVG" | "PDF" | "ILLUSTRATOR_PDF"; sha256: string; sizeBytes: number; immutable: true; documentMetadata?: { pdfVersion?: string | null; creator?: string | null; producer?: string | null; illustratorVersion?: string | null; embeddedPdfCompatible?: true; svgVersion?: string | null; generator?: string | null } };
  conversion?: {
    method: "HUMAN_VERIFIED_SVG" | "ORIGINAL_PDF_INTERPRETATION" | "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT";
    methodVersion: string;
    derivedFromSourceId: string | null;
    derivedFromSha256: string | null;
  };
  fidelity?: {
    status: "REFERENCE_REQUIRED" | "MATCHED" | "MISMATCH";
    comparisonMethod: "CANONICAL_SVG_PREVIEW" | "HUMAN_SIDE_BY_SIDE";
    referenceSha256: string;
    checkedAt: string | null;
    checkedBy: { userId: string; name: string } | null;
    note: string | null;
  };
  provenance: string;
  uploadedAt: string;
  uploadedBy: { userId: string; name: string };
  reviewDraft?: {
    revision: number;
    updatedAt: string;
    updatedBy: { userId: string; name: string };
    selectedCandidateIds: string[];
    glyphAssignments: Record<string, string>;
    candidateArtwork?: Record<string, {
      name: string;
      kind: "LOGO" | "SPONSOR" | "ARTWORK";
    }>;
    name: string;
    primaryContextKey: string;
    additionalContextKeys: string[];
    applicationKind: "LOGO" | "SPONSOR" | "NUMBER_SET" | "ARTWORK";
    productionMethod: "SELF_PRODUCED" | "PHYSICAL_TRANSFER";
    widthMm: string;
    heightMm: string;
    sizePolicyMode: "FIXED" | "DEFAULT_WITH_LIMITS" | "PROPORTIONAL_FREE";
    minWidthMm: string;
    maxWidthMm: string;
    defaultFoilColor: string;
    strokeReviewAccepted: boolean;
  };
  inspection: {
    engine: "WBD_PRODUCTION_ASSET_SVG_INTAKE_V1" | "WBD_PRODUCTION_ASSET_INTAKE_V1";
    engineVersion: "1" | "2";
    candidateCount: number;
    rawCandidateCount?: number;
    equivalentComponentCount?: number;
    glyphReviewCandidateCount?: number;
    normalReviewCandidateCount?: number;
    requiresHumanSelection: boolean;
    geometryNeverAiGenerated: true;
  };
  candidates: {
    id: string;
    suggestedName: string;
    selectionMode: "FULL_ARTWORK" | "VISUAL_REGION" | "OBJECT_GROUP" | "VECTOR_COMPONENT";
    page: number;
    selectionRef: string;
    geometryHash: string;
    status: "REVIEW";
    boundsMm: { width: number; height: number };
    aspectRatio: number;
    contourCount: number;
    pointCount: number;
    warnings: string[];
    equivalentSelectionRefs?: string[];
    equivalentCandidateIds?: string[];
    reviewCategory?: "NUMBER_GLYPH" | "ARTWORK_CANDIDATE";
    normalReviewRepresentative?: boolean;
    normalReviewAlternativeCount?: number;
  }[];
}

export interface SportpaleisQuickProductionIntake {
  id: string;
  version: "1";
  revision: number;
  createdAt: string;
  createdBy: { userId: string; name: string };
  status: "HUMAN_CHECK" | "ACCEPTED";
  source: { filename: string; mimeType: string; sourceKind: "PHOTO" | "PDF" | "DOCUMENT" | "EMAIL"; sizeBytes: number; sha256: string; immutable: true };
  extraction: {
    engine: "NO_OCR_HUMAN_CHECK_V1" | "EMBEDDED_TEXT_EXACT_LABELS_V1";
    fields: Record<string, { value: string; status: "RELIABLE" | "CHECK_REQUIRED" | "MISSING"; evidence: string }>;
    confidencePolicy: "NO_SILENT_GUESSING";
    status: "HUMAN_CHECK_REQUIRED" | "REVIEW_REQUIRED";
    uncertainties: string[];
  };
  humanCorrections: { field: string; previous: string; next: string }[];
  acceptedAt: string | null;
  acceptedBy: { userId: string; name: string } | null;
  orderId: string | null;
}

export type SportpaleisVisualConcept = "SEASON_START" | "PRODUCT_FOCUS" | "CLUB_MOMENT";
export type SportpaleisVisualChannel = "HOMEPAGE" | "SOCIAL_SQUARE" | "STORY" | "MAIL_HERO" | "TEAMWEAR_PROOF";
export type SportpaleisVisualDirection = "EDITORIAL_IMPACT" | "PERFORMANCE_ENERGY" | "PRODUCT_PRECISION" | "CLUB_PRIDE";

/**
 * A Visual Studio composition is creative output, not a second product or
 * asset master. Product and asset references are immutable snapshots of the
 * existing Sportpaleis catalog/Library truth.
 */
export interface SportpaleisVisualComposition {
  id: string;
  revision: number;
  status: "DRAFT" | "READY_FOR_REVIEW";
  concept: SportpaleisVisualConcept;
  title: string;
  artDirection: string;
  directionId: SportpaleisVisualDirection;
  productRef: {
    articleId: string;
    articleRevision: number;
    articleNumber: string;
    name: string;
    imageKey: string;
    sourceHash: string;
  };
  sourceRef?: {
    kind: "UPLOADED_IMAGE";
    filename: string;
    mimeType: string;
    bytes: number;
    sha256: string;
    intent: "PRESERVE_SOURCE" | "PRODUCT_ONLY" | "PRODUCT_WITH_BRAND" | "CAMPAIGN_BRIEF" | "CHANNEL_TRANSLATION";
    matchedArticleId: string | null;
    matchConfidence: "HIGH" | "NONE";
    pixelPolicy: "PRESERVE_ORIGINAL" | "NON_DESTRUCTIVE_COMPOSITION";
    sourceHash: string;
  } | null;
  assetRefs: {
    assetId: string;
    name: string;
    sourceId: string;
    version: string;
    sourceSha256: string;
  }[];
  geometry: {
    product: { xPercent: number; yPercent: number; scale: number };
    assets: { assetId: string; xPercent: number; yPercent: number; scale: number }[];
  };
  channels: {
    channel: SportpaleisVisualChannel;
    widthPx: number;
    heightPx: number;
    layout: {
      crop: "WIDE_EDITORIAL" | "SQUARE_FOCAL" | "PORTRAIT_FULL" | "SHALLOW_WIDE" | "SQUARE_PROOF";
      copyAnchor: "LEFT_BOTTOM" | "LEFT_TOP" | "LEFT_CENTER";
      productScaleFactor: number;
      safeInsetPercent: number;
      emphasis: "CAMPAIGN" | "PRODUCT" | "MOMENT" | "MESSAGE" | "SOURCE_TRUTH";
      product: { xPercent: number; yPercent: number; scale: number };
    };
    renderHash: string;
  }[];
  checks: {
    canonicalProductLocked: true;
    canonicalAssetsLocked: true;
    withinBounds: boolean;
    readyForReview: boolean;
    warnings: string[];
  };
  compositionHash: string;
  createdAt: string;
  createdBy: { userId: string; name: string };
  updatedAt: string;
  updatedBy: { userId: string; name: string };
}

export interface SportpaleisCreativeVectorDraft {
  id: string;
  status: "HUMAN_REVIEW_REQUIRED";
  engine: "VTRACER_WASM_1_0_0_ALPHA_3";
  sourceClass: "MONOCHROME_LINE" | "FLAT_LOGO" | "MULTICOLOR_BADGE";
  source: { filename: string; mimeType: string; bytes: number; sha256: string; width: number; height: number; aspectRatio: number; transparencyRatio: number };
  derivative: { mimeType: "image/svg+xml"; sha256: string; bytes: number; pathCount: number; fillColors: string[]; width: number; height: number; geometryHash: string };
  evidence: { sourceSha256: string; derivativeSha256: string; latencyMs: number; warnings: string[]; canonicalPromotionPerformed: false };
  createdAt: string;
  createdBy: { userId: string; name: string };
}

export interface SportpaleisProductionElementRequirement {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  recordedAt: string;
  recordedBy: string;
}

export interface SportpaleisProductionInventoryView {
  elementId: string;
  elementName: string;
  ownerName: string;
  variantId: string;
  variantLabel: string;
  productionMode: "INTERNAL_PLOT" | "EXTERNAL";
  currentStock: number | null;
  openDemand: number;
  projectedFreeStock: number | null;
  minimumStock: number | null;
  targetStock: number | null;
  shortage: boolean;
  suggestedReplenishment: number | null;
  dataGaps: string[];
}

export interface ProductionJobSnapshot {
  organizationId: string;
  association: string;
  acceptedSourceDate?: string;
  orderIds: string[];
  elements: {
    type: string;
    value: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    contourCount?: number;
    contourCountPerObject?: number;
  }[];
  productionLines?: SportpaleisProductionLine[];
  /** Operator-added foil optimization objects. These are never customer order lines. */
  productionSupplements?: {
    id: string;
    type: ProductionLineType;
    value: string;
    quantity: number;
    foilColor: string;
    sourceId: string;
    sourceVersion: string;
    reason: "GEOMETRY_PROVEN_REST_CAPACITY";
    customerOrderLine: false;
    analysisHash: string;
  }[];
  fontSources?: { id: string; name: string; version: string; sha256: string; originalFilename: string }[];
  logoSources?: { id: string; version?: string; revision: number; sourceId?: string | null; sourceSelection?: SportpaleisProductionElement["sourceSelection"] | null; sourceLayers: NonNullable<SportpaleisProductionElement["sourceLayers"]> }[];
  productionProfile: { id: string; revision: number; name: string };
  sourceContours: { id: string; version: string; proofStatus: ProductionProofStatus; immutable: true }[];
  outputWriter?: { id: string; version: string; format: "SVG" | "AI" | "PDF" | "EPS"; proofStatus: ProductionProofStatus; physicalRouteStatus: "VALIDATED" | "HUMAN_VALIDATION_REQUIRED" };
  productionGroup: { id?: string; label?: string; sourceChannel?: SportpaleisOrderSource; foilColor: string; material: string; workingWidthMm: number; maxSafeTrackWidthMm?: number };
  layout: {
    strategy: string;
    objectCount: number;
    closedContourCount?: number;
    anchorCount?: number;
    configuredWidthMm?: number;
    baselineUsedLengthMm?: number;
    savedLengthVsBaselineMm?: number;
    usedWidthMm: number;
    usedLengthMm: number;
    edgeMarginMm: number | null;
    minimumGapMm: number | null;
    placements?: {
      lineId: string; xMm: number; yMm: number; widthMm: number; heightMm: number;
      sourceWidthMm?: number; sourceHeightMm?: number; mirrorApplied?: boolean;
      baseRotationApplied?: 0 | 90 | 180 | 270; nestingRotationApplied?: 0 | 90 | 180 | 270; rotationApplied?: 0 | 90 | 180 | 270;
      vectorProfile?: string | null; nestingSection?: { key: string; label: string; rank: number } | null; sourceOrderId?: string;
      semanticGroup?: {
        id: string; kind: "MULTI_DIGIT_NUMBER"; sourceLineId: string; itemId?: string; productionProfileId?: string;
        value: string; digit: string; digitIndex: number; digitCount: number; copyIndex?: number; copyCount?: number; garmentCompositionSpacingMm: number;
        physicalMembers?: readonly {
          sourceObjectId: string; digit: string; digitIndex: number; contourIds: readonly string[];
          relativePlacementMm: { x: number; y: number };
          sourceBoundsMm: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
          assetIdentity?: { assetId: string; assetVersion: string; geometryHash: string; variantId?: string; sourceKind?: "PRODUCTION_ASSET" | "MANAGED_FONT" };
        }[];
      } | null;
      physicalMembers?: readonly {
        sourceObjectId: string; digit: string; digitIndex: number;
        assetIdentity?: { assetId: string; assetVersion: string; geometryHash: string; variantId?: string; sourceKind?: "PRODUCTION_ASSET" | "MANAGED_FONT" };
        mirrorApplied: boolean; rotationApplied: 0 | 90 | 180 | 270;
        placementMm: { x: number; y: number };
        boundsMm: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
        contourIds: readonly string[];
      }[];
      assetIdentity?: { assetId: string; assetVersion: string; geometryHash: string; variantId?: string; sourceKind?: "PRODUCTION_ASSET" | "MANAGED_FONT" } | null;
    }[];
    productionGeometry?: {
      groups: readonly {
        sourcePieceId: string;
        mirrorApplied: boolean;
        baseRotationApplied: 0 | 90 | 180 | 270;
        nestingRotationApplied: 0 | 90 | 180 | 270;
        rotationApplied: 0 | 90 | 180 | 270;
        placementMm: { x: number; y: number };
        sourceBoundsMm: { width: number; height: number };
        boundsMm: { width: number; height: number };
        contours: readonly { id: string; closed: boolean; points: readonly { x: number; y: number }[] }[];
      }[];
      contours: readonly { id: string; closed: boolean; points: readonly { x: number; y: number }[] }[];
      boundsMm: { width: number; height: number };
    };
  };
  orientation: { preMirrored: boolean; manualHorizontalFlipInWinPlot: boolean };
  scale: 1;
  artifact: { filename: string; format: "AI" | "PDF" | "EPS" | "SVG" | "MANIFEST"; version: string; sha256: string; path: string; productionDataHash?: string };
  humanControlRequiredBeforeHardware: true;
  hardwareSendPerformedByWorkspace: false;
}

export interface ProductionJob {
  id: string;
  jobNumber: string;
  createdAt: string;
  initiatedBy: { userId: string; name: string; role: SportpaleisRole };
  kind: "ORIGINAL" | "REPLOT";
  originJobId: string | null;
  reason: string | null;
  snapshot: ProductionJobSnapshot;
  snapshotHash: string;
  status: "AWAITING_HUMAN_CHECK" | "COMPLETED" | "FAILED" | "CANCELLED";
  proofStatus: ProductionProofStatus;
  humanAcceptance: { status: "PENDING" | "PASS" | "FAIL"; acceptedSourceDate?: string; sourceProofStatus?: ProductionProofStatus; note: string };
}

export interface ProductionProposal {
  id: string;
  proposalNumber: string;
  createdAt: string;
  initiatedBy: { userId: string; name: string; role: SportpaleisRole };
  orders: { id: string; expectedRevision: number }[];
  groups?: {
    id: string;
    label: string;
    foilColor: string;
    sourceChannel?: SportpaleisOrderSource;
    outputWriter: { id: string; version: string };
    orders: { id: string; expectedRevision: number }[];
    productionLineRefs: { orderId: string; lineId: string }[];
    supplements?: SportpaleisProductionLine[];
    efficiencyEvidence?: {
      analysisHash: string;
      baseUsedWidthMm: number;
      baseUsedLengthMm: number;
      augmentedUsedWidthMm: number;
      augmentedUsedLengthMm: number;
      utilizationBeforePercent: number;
      utilizationAfterPercent: number;
      customerOrderLinesCreated: false;
    };
    dependsOnGroupIds?: string[];
    status: "OPEN" | "CONVERTED";
    productionJobId: string | null;
  }[];
  status: "OPEN" | "CONVERTED" | "STALE";
  productionJobId: string | null;
  productionJobIds?: string[];
}

export type TeamkitProposalStatus =
  | "DRAFT"
  | "WAITING_FOR_CUSTOMER_INPUT"
  | "READY_FOR_DESIGN"
  | "IN_DESIGN"
  | "READY_FOR_REVIEW"
  | "SENT_TO_CUSTOMER"
  | "CUSTOMER_FEEDBACK"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "ARCHIVED";

export type TeamkitFulfillmentRoute = "INTERN_BEDRUKKEN" | "EXTERNE_BEDRUKKER" | "NOG_TE_BEPALEN";
/**
 * Canonical semantic placement zone. It is deliberately separate from the
 * decoration/asset kind and never replaces the approved visual coordinates.
 * Legacy values remain readable so existing immutable revisions keep rendering.
 */
export type TeamkitPlacementPreset =
  | "BACK_UPPER" | "BACK_LOWER" | "FRONT_CENTER_LARGE" | "CHEST_LEFT" | "CHEST_RIGHT"
  | "SLEEVE_LEFT" | "SLEEVE_RIGHT" | "LEFT" | "RIGHT" | "FREE_PLACEMENT"
  | "LINKERBORST" | "RECHTERBORST" | "MIDDENBORST" | "RUG_BOVEN" | "RUG_MIDDEN"
  | "MOUW_LINKS" | "MOUW_RECHTS" | "SHORT_LINKS" | "SHORT_RECHTS" | "BROEK" | "TAS";

export interface TeamkitProposalSource {
  id: string;
  filename: string;
  mimeType: "image/svg+xml" | "application/pdf" | "application/postscript" | "application/illustrator" | "image/png" | "image/jpeg";
  format: "SVG" | "PDF" | "EPS" | "AI" | "PNG" | "JPG" | "WEBP";
  sha256: string;
  sizeBytes: number;
  immutable: true;
  dataBase64?: string;
  safePreviewSvg?: string | null;
  uploadedAt: string;
  uploader: { kind: "CUSTOMER" | "EMPLOYEE"; id: string; name: string };
  proposalId: string;
  associationName: string | null;
  version: number;
  quality: {
    status: "VECTOR_SUITABLE" | "RASTER_HIGH_RES_REVIEW" | "LOW_RES_BETTER_SOURCE_REQUIRED" | "UNKNOWN_REVIEW";
    widthPx: number | null;
    heightPx: number | null;
    message: string;
  };
  promotedProductionSourceId?: string | null;
  /** Reuse provenance when an immutable source is selected from the shared context library. */
  libraryOrigin?: { proposalId: string; sourceId: string; sha256: string } | null;
}

export interface TeamkitProposalPlacement {
  id: string;
  kind: "CLUB_LOGO" | "SPONSOR" | "NAME" | "INITIALS" | "BACK_NUMBER" | "SHORT_NUMBER" | "FREE_TEXT";
  label: string;
  side: "FRONT" | "BACK";
  preset: TeamkitPlacementPreset;
  sourceId: string | null;
  productionAssetId: string | null;
  assetVersion: string | null;
  text: string | null;
  /** Non-destructive visual variant. The immutable source is never overwritten. */
  colorOverride?: string | null;
  widthPercent: number;
  /**
   * Conceptuele plaatsing binnen een expliciet garment-/printvlak. De percentages
   * zijn responsive canvascoordinaten en worden nooit als productie-mm gebruikt.
   */
  visualPosition?: {
    coordinateSpace: "GARMENT_PRINT_AREA_V1";
    xPercent: number;
    yPercent: number;
  };
  /** Optional physical production override; absence means resolve from the existing server-authoritative production truth. */
  physicalSizeOverride?: { widthMm: number; heightMm: number; aspectRatioLocked: true } | null;
  /** Server-resolved truth stored with the immutable proposal revision. */
  productionRule?: {
    resolverVersion?: "CANONICAL_PRODUCTION_TRUTH_V1";
    status: "RESOLVED" | "REVIEW_REQUIRED";
    resolver: "ARTICLE_PROFILE" | "PRODUCTION_ASSET" | "UNRESOLVED";
    articleId: string | null;
    associationName: string | null;
    profileId: string | null;
    profileRevision: number | null;
    fontProfile: string | null;
    foilColor: string | null;
    sizeLabel: string | null;
    physicalWidthMm: number | null;
    physicalHeightMm: number | null;
    mirror: boolean | null;
    measurementSource: "EXPLICIT_PROPOSAL_OVERRIDE" | "PRODUCTION_PROFILE" | "PRODUCTION_ASSET" | "DATA_GAP";
    sourceId: string | null;
    sourceVersion: string | null;
    sourceSha256: string | null;
    reason: string | null;
    deferredMaterialization?: "PRODUCTION_SIZE_CLASS"[];
    intentRuleHash?: string;
    ruleHash: string;
  };
  route: TeamkitFulfillmentRoute;
  supplierName: string | null;
  note: string | null;
}

export interface TeamkitProposalItem {
  id: string;
  articleId: string | null;
  articleNumber: string | null;
  productName: string;
  color: string;
  quantity: number | null;
  sizes: string[];
  team: string | null;
  notes: string | null;
  /** Immutable discovery/commercial snapshot; the product master remains CatalogArticle/Catalog Foundation. */
  catalogSnapshot?: {
    catalogProductId: string;
    brand: string;
    supplierName: string;
    supplierArticleName: string;
    supplierArticleNumber: string;
    category: string;
    collection: string | null;
    audience: string[];
    colorLabel: string;
    imageKey: string;
    backImageKey?: string | null;
    frontSourceUrl?: string | null;
    backSourceUrl?: string | null;
    sourceProductId?: string | null;
    sourceColorId?: string | null;
    mediaClassification?: "SOURCE_GALLERY_ORDER_V1" | null;
    advicePriceEur: number | null;
    effectivePriceEur: number | null;
    priceLabel: "Teamprijs" | "Jullie prijs" | null;
    minimumQuantity: number | null;
    pricingPolicyRef: string | null;
    sourceAdapterId: string;
    sourceStatus: "AUTHORITATIVE" | "CONTROLLED_FIXTURE" | "DATA_GAP";
    /** Direct proposal source used as the product image; no catalog master is implied. */
    directFrontSourceId?: string | null;
    directBackSourceId?: string | null;
    /** Transient atomic-create aliases; never persisted after server resolution. */
    directFrontSourceRef?: string | null;
    directBackSourceRef?: string | null;
    productType?: "UPPER_GARMENT" | "LOWER_GARMENT" | "SPORTS_BAG" | "BACKPACK" | "OTHER";
    printableSides?: ("FRONT" | "BACK")[];
    sourceReference?: string | null;
  };
  placements: TeamkitProposalPlacement[];
}

export interface TeamkitProposalFeedback {
  id: string;
  revision: number;
  createdAt: string;
  customerName: string;
  kind: "GENERAL" | "ITEM" | "PLACEMENT";
  targetId: string | null;
  decision: "CORRECT" | "CHANGE";
  message: string;
  status: "OPEN" | "PROCESSED";
  processedAt: string | null;
  processedBy: string | null;
}

export interface TeamkitProposalSnapshot {
  proposalId: string;
  proposalNumber: string;
  revision: number;
  title: string;
  type: string;
  customer: { id: string | null; name: string; contactName: string; email: string; phone: string | null };
  association: { id: string | null; name: string | null };
  team: string | null;
  season: string | null;
  category: string | null;
  deadline: string | null;
  notes: string | null;
  items: TeamkitProposalItem[];
  sourceRefs: { id: string; filename: string; mimeType: string; sha256: string; version: number; qualityStatus: TeamkitProposalSource["quality"]["status"] }[];
}

export interface TeamkitProposalRevision {
  number: number;
  createdAt: string;
  createdBy: { id: string; name: string; role: SportpaleisRole | "customer" };
  reason: string;
  feedbackIds: string[];
  snapshot: TeamkitProposalSnapshot;
  snapshotHash: string;
  previewHtml: string;
  previewSha256: string;
}

export interface TeamkitFulfillmentTask {
  id: string;
  proposalId: string;
  approvedRevision: number;
  customerName: string;
  associationName: string | null;
  itemId: string;
  placementId: string;
  assetRef: {
    sourceId: string | null;
    productionAssetId: string | null;
    version: string | null;
    sha256: string | null;
    proposalSource?: { id: string; version: string; sha256: string; role: "PROPOSAL_EVIDENCE" } | null;
    productionAsset?: { id: string; version: string; sha256: string | null; role: "PRODUCTION_READY" } | null;
  };
  route: TeamkitFulfillmentRoute;
  kind: "INTERNAL_PRODUCTION" | "EXTERNAL_SUPPLIER" | "ROUTE_DECISION";
  status: "HUMAN_CHECK" | "READY_TO_SEND" | "SENT" | "CONFIRMED" | "RETURNED" | "READY" | "COMPLETED";
  attention: string | null;
  specification: string;
  supplierName: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamkitProposalApproval {
  revision: number;
  approvedAt: string;
  customerName: string;
  customerEmail: string;
  accessContextId: string;
  snapshotHash: string;
  previewHtml: string;
  previewSha256: string;
  pdfBase64: string;
  pdfSha256: string;
  artifactFilename: string;
}

/**
 * Operational sizing belongs to the exact approved composition, but is not a
 * second design revision. This keeps Studio, preview/PDF and the later
 * WorkspaceOrder on one immutable visual truth while allowing sizes to be
 * completed after customer approval.
 */
export interface TeamkitProductionSizing {
  approvedRevision: number;
  revision: number;
  items: {
    itemId: string;
    quantity: number;
    sizes: string[];
    sizeQuantities: { size: string; quantity: number }[];
    allocationMode: "PER_SIZE" | "TOTAL_ACROSS_SELECTED_SIZES";
  }[];
  snapshotHash: string;
  updatedAt: string;
  updatedBy: { id: string; name: string; role: SportpaleisRole | "customer" };
}

export interface TeamkitProposal {
  id: string;
  proposalNumber: string;
  aggregateRevision: number;
  currentRevision: number;
  status: TeamkitProposalStatus;
  title: string;
  type: string;
  customer: { id: string | null; name: string; contactName: string; email: string; phone: string | null };
  association: { id: string | null; name: string | null };
  team: string | null;
  season: string | null;
  category: string | null;
  deadline: string | null;
  notes: string | null;
  items: TeamkitProposalItem[];
  sources: TeamkitProposalSource[];
  intake: {
    status: "NOT_REQUESTED" | "REQUESTED" | "DRAFT_SAVED" | "SUBMITTED";
    requestedAt: string | null;
    openedAt: string | null;
    draftSavedAt: string | null;
    submittedAt: string | null;
    data: Record<string, unknown>;
  };
  customerAccess: {
    id: string;
    tokenHash: string;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
    lastOpenedAt: string | null;
  } | null;
  feedback: TeamkitProposalFeedback[];
  revisions: TeamkitProposalRevision[];
  approval: TeamkitProposalApproval | null;
  approvalHistory: TeamkitProposalApproval[];
  productionSizing: TeamkitProductionSizing | null;
  fulfillmentTasks: TeamkitFulfillmentTask[];
  deliveryEvidence?: Array<{ id: string; templateKey: string; status: string; capturedAt: string; revision: number; delivered: boolean }>;
  createdAt: string;
  createdBy: { id: string; name: string; role: SportpaleisRole };
  updatedAt: string;
  updatedBy: { id: string; name: string; role: SportpaleisRole | "customer" };
  archivedAt: string | null;
  copiedFrom: { proposalId: string; approvedRevision: number | null } | null;
}

export interface WorkspaceFeedback {
  id: string;
  page: string;
  module: string;
  userId: string;
  userRole: SportpaleisRole;
  createdAt: string;
  category: "Vraag" | "Verbetering" | "Probleem" | "Operationele blokkade";
  description: string;
  releaseId?: string;
  orderId?: string | null;
  associationContext?: string | null;
  attachments?: { id: string; filename: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; sizeBytes: number }[];
}

export interface ExtraUserRequest {
  id: string;
  requestedBy: string;
  requestedAt: string;
  quantity: 1 | 2 | 3;
  monthlyPriceEur: 7.5 | 12.5 | 17.5;
  status: "Aangevraagd";
}

export interface WorkspacePreference {
  view: "focus" | "compact";
  density: "comfortable" | "compact";
  optionalPanels: {
    recent: boolean;
    shortcuts: boolean;
  };
  panelOrder: ("attention" | "production" | "recent" | "shortcuts")[];
  orderColumns: ("customer" | "articles" | "foilColors" | "promisedAt" | "owner" | "status")[];
  orderDensity: "compact" | "comfortable";
  productionPanels: ("batch" | "guidance" | "fallback")[];
}

export interface WorkspaceAuditEntry {
  id: string;
  at: string;
  userId: string;
  action: string;
  subject: string;
  details?: Record<string, unknown>;
}

export interface SportpaleisWorkspaceState {
  schemaVersion: 13;
  configurationVersion?: string;
  revision: number;
  currentUserId: string;
  users: SportpaleisUser[];
  employees?: SportpaleisEmployee[];
  employeeDirectorySource?: { sourceId: string; comparedAt: string; suppliedNamedCodes: number; matched: number; added: number; preservedNameDifferences: number; unverified: number } | null;
  orders: WorkspaceOrder[];
  articles: CatalogArticle[];
  associations: AssociationConfiguration[];
  fontConfirmationVersion?: string;
  productionProfiles: ProductionProfile[];
  settings: {
    processingDays: number;
    deliveryFeeEur: number;
    receiptMailText?: string;
    readyMailText?: string;
    productionDefaults?: {
      workingWidthMm: number;
      maxSafeTrackWidthMm: number;
      minimumGapMm: number;
      edgeMarginMm: number;
      defaultWidthMm: number;
      defaultHeightMm: number;
      defaultFontId: string;
      defaultFoilColor: string;
    };
  };
  foilRolls: FoilRoll[];
  feedback: WorkspaceFeedback[];
  extraUserRequests: ExtraUserRequest[];
  mailbatches: SportpaleisMailbatch[];
  websiteSync?: SportpaleisWebsiteSyncState;
  webshopIntake?: SportpaleisWebshopIntakeState;
  productionElements: SportpaleisProductionElement[];
  productionAssetSources?: SportpaleisProductionAssetSource[];
  quickProductionIntakes?: SportpaleisQuickProductionIntake[];
  visualCompositions?: SportpaleisVisualComposition[];
  creativeVectorDrafts?: SportpaleisCreativeVectorDraft[];
  productionFonts: SportpaleisProductionFont[];
  productionElementRequirements: SportpaleisProductionElementRequirement[];
  productionJobs: ProductionJob[];
  productionProposals?: ProductionProposal[];
  teamkitProposals?: TeamkitProposal[];
  preferences: Record<string, WorkspacePreference>;
  audit: WorkspaceAuditEntry[];
  appliedActionIds: string[];
}

export type WorkspaceAction =
  | { id: string; type: "ADVANCE_ORDER"; userId: string; at: string; orderId: string }
  | { id: string; type: "CREATE_ORDER"; userId: string; at: string; order: WorkspaceOrder }
  | { id: string; type: "SUBMIT_FEEDBACK"; userId: string; at: string; feedback: WorkspaceFeedback }
  | { id: string; type: "SAVE_PREFERENCES"; userId: string; at: string; preference: WorkspacePreference }
  | { id: string; type: "REQUEST_USERS"; userId: string; at: string; request: ExtraUserRequest };

const DEFAULT_PREFERENCE: WorkspacePreference = {
  view: "focus",
  density: "comfortable",
  optionalPanels: { recent: true, shortcuts: true },
  panelOrder: ["attention", "production", "recent", "shortcuts"],
  orderColumns: ["customer", "articles", "foilColors", "promisedAt", "owner", "status"],
  orderDensity: "compact",
  productionPanels: ["batch", "guidance", "fallback"],
};

export const EXTRA_USER_PRICES = { 1: 7.5, 2: 12.5, 3: 17.5 } as const;

export function createInitialSportpaleisState(): SportpaleisWorkspaceState {
  const users: SportpaleisUser[] = [
    { id: "kevin", name: "Kevin", initials: "KV", role: "admin", email: "kevin@sportpaleis.nl", status: "Actief", salesNumber: null },
    { id: "patrick", name: "Patrick", initials: "PA", role: "operator", email: "patrick@sportpaleis.nl", status: "Actief" },
    { id: "collega", name: "Winkelmedewerker", initials: "WM", role: "store", email: "collega@sportpaleis.nl", status: "Actief" },
  ];
  return {
    schemaVersion: 13,
    revision: 1,
    currentUserId: "kevin",
    users,
    orders: [
      {
        id: "SP-2026-0104",
        revision: 1,
        customer: "Daniël Wouters",
        association: "A.S.C. Waterwijk",
        createdAt: "2026-08-07T08:24:00.000Z",
        promisedAt: "2026-08-08T15:00:00.000Z",
        stage: "CONTROL",
        owner: "Patrick",
        totalPieces: 10,
        attention: "Keeperstrui heeft afwijkend rugnummer 14.",
        items: [
          { id: "shirt-home", product: "Wedstrijdshirt thuis", quantity: 1, personalization: "DW · Rug 10", foilColor: "Wit" },
          { id: "short-home", product: "Wedstrijdshort thuis", quantity: 1, personalization: "DW · Short 10", foilColor: "Wit" },
          { id: "keeper", product: "Keeperstrui", quantity: 1, personalization: "DW · Rug 14", foilColor: "Wit" },
          { id: "other", product: "Overige clubartikelen", quantity: 7, personalization: "Volgens order", foilColor: "Wit" },
        ],
      },
      {
        id: "SNIJTEST-001",
        revision: 1,
        customer: "Interne productietest",
        association: "Maatvoering volgens Almere Pioneers",
        createdAt: "2026-08-06T13:10:00.000Z",
        promisedAt: "2026-08-08T10:00:00.000Z",
        stage: "PRINT",
        owner: "Patrick",
        totalPieces: 3,
        attention: "Fysieke validatie en hardwarevalidatie zijn nog vereist.",
        productionReference: "SNIJTEST-001",
        items: [
          { id: "number-2", product: "Senior rugnummer", quantity: 1, personalization: "2 · 200 mm", foilColor: "Wit" },
          { id: "number-34", product: "Senior rugnummer", quantity: 1, personalization: "34 · 200 mm", foilColor: "Wit" },
          { id: "number-77", product: "Senior rugnummer", quantity: 1, personalization: "77 · 200 mm", foilColor: "Wit" },
        ],
      },
      {
        id: "SP-2026-0102",
        revision: 1,
        customer: "M. de Jong",
        association: "Buitenhout MHC",
        createdAt: "2026-08-06T09:40:00.000Z",
        promisedAt: "2026-08-09T12:00:00.000Z",
        stage: "ORDER",
        owner: "Sportpaleis collega",
        totalPieces: 4,
        items: [{ id: "shirts", product: "Wedstrijdshirts", quantity: 4, personalization: "Rugnummers volgens lijst", foilColor: "Zwart" }],
      },
      {
        id: "SP-2026-0098",
        revision: 1,
        customer: "S. Vos",
        association: "FC Almere",
        createdAt: "2026-08-05T11:12:00.000Z",
        promisedAt: "2026-08-07T16:00:00.000Z",
        stage: "DONE",
        owner: "Patrick",
        totalPieces: 2,
        items: [{ id: "polo", product: "Presentatiepolo", quantity: 2, personalization: "SV", foilColor: "Wit" }],
      },
    ],
    associations: [],
    productionFonts: [],
    articles: [],
    productionProfiles: [],
    settings: { processingDays: 5, deliveryFeeEur: 3.95, productionDefaults: { workingWidthMm: 440, maxSafeTrackWidthMm: SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm, minimumGapMm: 6.4, edgeMarginMm: 5, defaultWidthMm: 180, defaultHeightMm: 30, defaultFontId: "", defaultFoilColor: "Wit" } },
    foilRolls: [],
    feedback: [],
    extraUserRequests: [],
    mailbatches: [],
    productionElements: [],
    productionAssetSources: [],
    productionElementRequirements: [],
    productionJobs: [],
    preferences: Object.fromEntries(users.map(({ id }) => [id, structuredClone(DEFAULT_PREFERENCE)])),
    audit: [
      { id: "audit-seed-1", at: "2026-08-07T08:24:00.000Z", userId: "patrick", action: "Order gecontroleerd", subject: "SP-2026-0104" },
      { id: "audit-seed-2", at: "2026-08-06T13:10:00.000Z", userId: "kevin", action: "Productietest voorbereid", subject: "SNIJTEST-001" },
    ],
    appliedActionIds: [],
  };
}

const NEXT_STAGE: Record<OrderStage, OrderStage> = {
  ORDER: "CONTROL",
  CONTROL: "PRINT",
  PRINT: "DONE",
  DONE: "DONE",
};

function auditFor(action: WorkspaceAction, subject: string): WorkspaceAuditEntry {
  const labels: Record<WorkspaceAction["type"], string> = {
    ADVANCE_ORDER: "Orderstatus gewijzigd",
    CREATE_ORDER: "Order aangemaakt",
    SUBMIT_FEEDBACK: "Feedback vastgelegd",
    SAVE_PREFERENCES: "Voorkeuren opgeslagen",
    REQUEST_USERS: "Extra gebruikers aangevraagd",
  };
  return { id: `audit-${action.id}`, at: action.at, userId: action.userId, action: labels[action.type], subject };
}

export function applyWorkspaceAction(
  current: SportpaleisWorkspaceState,
  action: WorkspaceAction,
): SportpaleisWorkspaceState {
  if (current.appliedActionIds.includes(action.id)) return current;
  const actor = current.users.find(({ id }) => id === action.userId);
  if (!actor) throw new Error("Onbekende gebruiker.");
  let next = structuredClone(current);
  let subject = "Workspace";

  if (action.type === "ADVANCE_ORDER") {
    const order = next.orders.find(({ id }) => id === action.orderId);
    if (!order) throw new Error("Order niet gevonden.");
    order.stage = NEXT_STAGE[order.stage];
    subject = order.id;
  } else if (action.type === "CREATE_ORDER") {
    if (next.orders.some(({ id }) => id === action.order.id)) throw new Error("Ordernummer bestaat al.");
    next.orders.unshift(structuredClone(action.order));
    subject = action.order.id;
  } else if (action.type === "SUBMIT_FEEDBACK") {
    next.feedback.unshift(structuredClone(action.feedback));
    subject = action.feedback.module;
  } else if (action.type === "SAVE_PREFERENCES") {
    next.preferences[action.userId] = structuredClone(action.preference);
    subject = actor.name;
  } else {
    if (actor.role !== "admin") throw new Error("Alleen een beheerder kan extra gebruikers aanvragen.");
    const expectedPrice = EXTRA_USER_PRICES[action.request.quantity];
    if (action.request.monthlyPriceEur !== expectedPrice) throw new Error("Onjuiste prijs voor extra gebruikers.");
    next.extraUserRequests.unshift(structuredClone(action.request));
    subject = `${action.request.quantity} gebruiker(s)`;
  }

  next.revision += 1;
  next.appliedActionIds.push(action.id);
  next.audit.unshift(auditFor(action, subject));
  return next;
}

export function currentUser(state: SportpaleisWorkspaceState): SportpaleisUser {
  const user = state.users.find(({ id }) => id === state.currentUserId);
  if (!user) throw new Error("Actieve gebruiker ontbreekt.");
  return user;
}

export function canAccessAdmin(state: SportpaleisWorkspaceState): boolean {
  return currentUser(state).role === "admin";
}
import { SPORTPALEIS_MACHINE_CONSTRAINTS } from "./direct-print/production-constraints.ts";
