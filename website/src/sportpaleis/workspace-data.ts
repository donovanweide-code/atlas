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
  };
  widthMm: number;
  heightMm: number;
  quantity: number;
  preview: { kind: "LIVE_FONT" | "PROFILE_REFERENCE" | "ASSET_REFERENCE"; label: string; aspectRatioLocked: boolean };
  provenance: string;
  proofStatus: ProductionProofStatus;
  validation: { status: "VALID" | "BLOCKED"; reason: string | null };
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
    assetStatus: "DATA_GAP" | "PRESENT";
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
  id: string; color: string; supplierType: string; purchasePriceEur: number | null;
  originalLengthM: number | null; widthMm: number; usedLengthMm: number;
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
  orderKind?: "INDIVIDUAL" | "TEAM" | "CUSTOM" | "LEGACY";
  owner: string;
  acceptedBy?: OrderAcceptedBy;
  salesAttribution?: { employeeId?: string | null; salesNumber: string | null; label: string; accountType: "HUMAN" | "FUNCTION" | "SYSTEM" | "UNASSIGNED"; selectedByUserId: string; selectedAt: string };
  sourceContext?: { source: SportpaleisOrderSource; label: string; externalReference: string | null; provenance: string; transactionalAuthority: "WORKSPACE" | "ACA_XPRT" | "EXTERNAL" };
  totalPieces: number;
  attention?: string;
  productionReference?: "SNIJTEST-001";
  foilStates?: { color: string; status: "READY" | "HOLD" }[];
  items: WorkspaceOrderItem[];
  productionLines?: SportpaleisProductionLine[];
  notes?: { id: string; scope: "order" | "customer"; kind: "internal" | "attention"; text: string; authorId: string; authorName: string; createdAt: string }[];
  priority?: { requestedBy: string; alignedWith: string; reason: string; explanation: string; createdAt: string } | null;
  communication?: { requiredForIndividualOrder?: boolean; receipt: { status: string; updatedAt?: string; providerReference?: string | null }; production?: { status: string; updatedAt?: string; providerReference?: string | null }; ready: { status: string; updatedAt?: string; providerReference?: string | null } };
  barcode?: { value: string; featureEnabled: false; hardwareValidated: false };
  pickup?: { status: "NOT_PICKED_UP" | "PICKED_UP"; pickedUpAt: string | null; pickedUpBy: string | null };
  payment?: { status: "UNKNOWN" | "DUE" | "PAID" | "REGISTER_PROCESSED"; updatedAt: string | null; updatedBy: string | null; source: "MANUAL_WORKSPACE" | "ACA_XPRT" | "UNKNOWN" };
  fulfillment?: { mode: "PICKUP" | "DELIVERY"; status: "PENDING" | "PICKED_UP" | "DELIVERED"; updatedAt: string | null; updatedBy: string | null; feeEur?: number; address?: { postalCode: string; houseNumber: string; houseNumberSuffix: string; street: string; city: string; lookupStatus: "VERIFIED" | "MANUAL_FALLBACK" } | null };
  operationalFacts?: Partial<Record<"PRINTED" | "REGISTER_PROCESSED" | "PAID" | "CUSTOMER_INFORMED" | "PICKED_UP" | "DELIVERED", { at: string; userId: string; userName: string; source: "MANUAL_WORKSPACE" }>>;
  eventHistory?: { type: string; at: string; userId: string; userName: string; source: string; details?: Record<string, unknown> }[];
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
  name: string;
  ownerType: "ASSOCIATION" | "CUSTOMER" | "SPONSOR" | "OWN_BRAND";
  ownerName: string;
  sourceAsset: string;
  sourceStatus: "AVAILABLE" | "REFERENCE_ONLY" | "DATA_GAP";
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
  fontSources?: { id: string; name: string; version: string; sha256: string; originalFilename: string }[];
  logoSources?: { id: string; revision: number; sourceLayers: NonNullable<SportpaleisProductionElement["sourceLayers"]> }[];
  productionProfile: { id: string; revision: number; name: string };
  sourceContours: { id: string; version: string; proofStatus: ProductionProofStatus; immutable: true }[];
  outputWriter?: { id: string; version: string; format: "SVG" | "AI" | "PDF" | "EPS"; proofStatus: ProductionProofStatus; physicalRouteStatus: "VALIDATED" | "HUMAN_VALIDATION_REQUIRED" };
  productionGroup: { foilColor: string; material: string; workingWidthMm: number };
  layout: {
    strategy: string;
    objectCount: number;
    closedContourCount?: number;
    anchorCount?: number;
    usedWidthMm: number;
    usedLengthMm: number;
    edgeMarginMm: number | null;
    minimumGapMm: number | null;
    placements?: { lineId: string; xMm: number; yMm: number; widthMm: number; heightMm: number }[];
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
    outputWriter: { id: string; version: string };
    orders: { id: string; expectedRevision: number }[];
    productionLineRefs: { orderId: string; lineId: string }[];
    status: "OPEN" | "CONVERTED";
    productionJobId: string | null;
  }[];
  status: "OPEN" | "CONVERTED" | "STALE";
  productionJobId: string | null;
  productionJobIds?: string[];
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
}

export interface SportpaleisWorkspaceState {
  schemaVersion: 12;
  configurationVersion?: string;
  revision: number;
  currentUserId: string;
  users: SportpaleisUser[];
  employees?: SportpaleisEmployee[];
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
  productionElements: SportpaleisProductionElement[];
  productionFonts: SportpaleisProductionFont[];
  productionElementRequirements: SportpaleisProductionElementRequirement[];
  productionJobs: ProductionJob[];
  productionProposals?: ProductionProposal[];
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
    schemaVersion: 12,
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
        association: "Maatvoering volgens Almerer Pioneers",
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
    settings: { processingDays: 5, deliveryFeeEur: 3.95, productionDefaults: { workingWidthMm: 440, minimumGapMm: 6.4, edgeMarginMm: 5, defaultWidthMm: 180, defaultHeightMm: 30, defaultFontId: "", defaultFoilColor: "Wit" } },
    foilRolls: [],
    feedback: [],
    extraUserRequests: [],
    mailbatches: [],
    productionElements: [],
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
