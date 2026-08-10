export type SportpaleisRole = "admin" | "operator" | "store" | "support";
export type OrderStage = "ORDER" | "CONTROL" | "PRINT" | "DONE";
export type BackNumberSizeClass = "JUNIOR" | "SENIOR";
export type ValidationStatus = "VALIDATED" | "SOURCE_CONFIGURED" | "DATA_GAP";

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
  name: string;
  backNumber: string;
  backNumberSizeClass: BackNumberSizeClass | "";
  shortsNumber: string;
  initialsSemantic?: { prefix: string; infix: string; surname: string; typographyManagedByProfile: true };
}

export interface CatalogArticle {
  id: string; articleNumber: string; name: string; imageKey: string; category: string;
  association: string; profileId: string; supports: (keyof OrderPersonalization)[]; active: boolean;
  supplierArticleNumber?: string;
  commercialPrintOptions?: { sourceLabel: string; canonicalField: keyof OrderPersonalization | null; priceEur: number | null; status: "VALIDATED" | "DATA_GAP" }[];
  catalogProvenance?: { authority: "SPORTPALEIS_LIVE"; url: string; imageUrl: string; checkedAt: string };
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
  supports?: (keyof OrderPersonalization)[];
}

export interface AssociationConfiguration {
  id: string;
  name: string;
  sourceName: string;
  active: boolean;
  source: { file: string; sheet: string; range: string };
  fontProfile: string;
  foilColors: string[];
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
  orderKind?: "INDIVIDUAL" | "TEAM" | "CUSTOM" | "LEGACY";
  owner: string;
  acceptedBy?: OrderAcceptedBy;
  totalPieces: number;
  attention?: string;
  productionReference?: "SNIJTEST-001";
  foilStates?: { color: string; status: "READY" | "HOLD" }[];
  items: WorkspaceOrderItem[];
  notes?: { id: string; scope: "order" | "customer"; kind: "internal" | "attention"; text: string; authorId: string; authorName: string; createdAt: string }[];
  priority?: { requestedBy: string; alignedWith: string; reason: string; explanation: string; createdAt: string } | null;
  communication?: { requiredForIndividualOrder?: boolean; receipt: { status: string; updatedAt?: string; providerReference?: string | null }; production?: { status: string; updatedAt?: string; providerReference?: string | null }; ready: { status: string; updatedAt?: string; providerReference?: string | null } };
  barcode?: { value: string; featureEnabled: false; hardwareValidated: false };
  pickup?: { status: "NOT_PICKED_UP" | "PICKED_UP"; pickedUpAt: string | null; pickedUpBy: string | null };
  eventHistory?: { type: string; at: string; userId: string; userName: string; source: string }[];
}

export interface WorkspaceFeedback {
  id: string;
  page: string;
  module: string;
  userId: string;
  createdAt: string;
  category: "Vraag" | "Verbetering" | "Probleem";
  description: string;
  releaseId?: string;
  orderId?: string | null;
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
  schemaVersion: 6;
  configurationVersion?: string;
  revision: number;
  currentUserId: string;
  users: SportpaleisUser[];
  orders: WorkspaceOrder[];
  articles: CatalogArticle[];
  associations: AssociationConfiguration[];
  productionProfiles: ProductionProfile[];
  settings: { processingDays: number; receiptMailText?: string; readyMailText?: string };
  foilRolls: FoilRoll[];
  feedback: WorkspaceFeedback[];
  extraUserRequests: ExtraUserRequest[];
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
    schemaVersion: 6,
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
    articles: [],
    productionProfiles: [],
    settings: { processingDays: 5 },
    foilRolls: [],
    feedback: [],
    extraUserRequests: [],
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
