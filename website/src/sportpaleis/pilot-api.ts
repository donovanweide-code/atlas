import type {
  ExtraUserRequest,
  CommercialAdministration,
  SportpaleisUser,
  SportpaleisWorkspaceState,
  WorkspaceFeedback,
  WorkspaceOrder,
  WorkspacePreference,
  OrderPersonalization,
  CatalogArticle,
  ProductionProfile,
  AssociationConfiguration,
  SportpaleisMailbatch,
  SportpaleisOrderSource,
  SportpaleisProductionElement,
  SportpaleisProductionElementRequirement,
  SportpaleisProductionInventoryView,
  ProductionJob,
  ProductionProposal,
  SportpaleisProductionFont,
  SportpaleisProductionLine,
  SportpaleisEmployee,
} from "./workspace-data.ts";

const API = "/api/sportpaleis/v1";
const CACHE_KEY = "sportpaleis.workspace.readonly-cache.012";

interface ApiErrorBody {
  error?: string;
  message?: string;
  currentRevision?: number;
}

export class PilotApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly currentRevision?: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? "De Workspace-service is tijdelijk niet beschikbaar.");
    this.name = "PilotApiError";
    this.status = status;
    this.code = body.error ?? "API_ERROR";
    this.currentRevision = body.currentRevision;
  }
}

export interface PilotBootstrap extends SportpaleisWorkspaceState {
  currentUser: SportpaleisUser;
  switchableUsers: SportpaleisUser[];
  csrfToken?: string;
  capabilities: {
    admin: boolean;
    operator: boolean;
    store: boolean;
    support: boolean;
    demo: boolean;
    demoEnabled: boolean;
    uploadsEnabled: boolean;
    mailMode: "capture";
    hardwareSendEnabled: false;
    barcodeEnabled: false;
    barcodeHardwareValidated: false;
    workContexts: NonNullable<SportpaleisUser["workContexts"]>;
    deviceMode: "SHARED" | "PERSONAL";
    authMethod: "PASSWORD" | "PIN" | "DEMO";
    quickPinEnabled: boolean;
  };
  productionInventory: SportpaleisProductionInventoryView[];
  releaseId: string;
  commercialAdministration?: CommercialAdministration;
  readOnlyFallback?: boolean;
}

export interface MailPreview {
  sender: string;
  senderAddressStatus: string;
  recipient: string;
  templateKey: string;
  templateVersion: number;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{ filename: string; mimeType: string; sizeBytes: number; sha256: string }>;
  transport: "capture";
  externalMailSent: false;
}

export interface MailHistoryEntry {
  id: string;
  templateKey: string;
  templateVersion: number;
  initiatedBy: { id: string; name: string; role: string };
  createdAt: string;
  status: string;
  safeResult: { code: string; message: string; confirmedNotSent?: boolean };
  duplicate?: boolean;
  attentionRequired: boolean;
  automaticRetryAllowed: false;
}

export interface EditableOrderItemInput {
  articleId?: string;
  product?: string;
  association?: string;
  personalization?: string;
  foilColor?: string;
  productionProfileId?: string;
  size: string;
  quantity: number;
  deviation: boolean;
  overrides: OrderPersonalization;
  variants?: readonly { id?: string; participantName?: string; size: string; quantity: number; deviation: boolean; overrides?: OrderPersonalization; personalization?: string }[];
}

async function responseBody<T>(response: Response): Promise<T> {
  const body = await response.json() as T & ApiErrorBody;
  if (!response.ok) throw new PilotApiError(response.status, body);
  return body;
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

export class SportpaleisPilotApi {
  #csrfToken = "";

  async login(email: string, password: string, deviceMode: "SHARED" | "PERSONAL" = "SHARED"): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, deviceMode }),
    }));
    this.#csrfToken = result.csrfToken;
    return result.user;
  }

  async fastSwitch(targetUserId: string, credential: { authMode: "PIN"; pin: string } | { authMode: "PASSWORD"; password: string }, deviceMode: "SHARED" | "PERSONAL"): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await this.#mutatingFetch(`${API}/auth/switch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, ...credential, deviceMode }) }));
    this.#csrfToken = result.csrfToken;
    sessionStorage.removeItem(CACHE_KEY);
    return result.user;
  }

  async activate(token: string, password: string): Promise<{ user: SportpaleisUser; activated: true }> {
    return responseBody(await fetch(`${API}/auth/activate`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }));
  }

  async demoOptions(): Promise<{ enabled: boolean }> {
    return responseBody(await fetch(`${API}/auth/demo-options`, { credentials: "same-origin", headers: { Accept: "application/json" } }));
  }

  async demoLogin(view: "admin" | "operator" | "store"): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await fetch(`${API}/auth/demo`, {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ view }),
    }));
    this.#csrfToken = result.csrfToken;
    return result.user;
  }

  async logout(): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/auth/logout`, { method: "POST" }));
    this.#csrfToken = "";
    sessionStorage.removeItem(CACHE_KEY);
  }

  async session(): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await fetch(`${API}/auth/session`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }));
    this.#csrfToken = result.csrfToken;
    return result.user;
  }

  async bootstrap(): Promise<PilotBootstrap> {
    const result = await responseBody<PilotBootstrap>(await fetch(`${API}/bootstrap`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }));
    if (result.csrfToken) this.#csrfToken = result.csrfToken;
    const cacheable = { ...result };
    delete cacheable.csrfToken;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheable));
    return result;
  }

  cachedBootstrap(): PilotBootstrap | undefined {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null") as PilotBootstrap | null;
      return cached ? { ...cached, readOnlyFallback: true } : undefined;
    } catch {
      return undefined;
    }
  }

  async createOrder(input: {
    orderKind?: "INDIVIDUAL" | "TEAM" | "CUSTOM";
    customer: string;
    customerEmail: string;
    customerPhone: string;
    promisedAt?: string;
    standardPersonalization: OrderPersonalization;
    items: readonly EditableOrderItemInput[];
    internalNote?: string;
    noteKind?: "internal" | "attention";
    priority?: { enabled?: boolean; requestedBy?: string; alignedWith?: string; reason?: string; explanation?: string };
    salesNumber?: string | null;
    source?: SportpaleisOrderSource;
    externalReference?: string;
    provenance?: string;
    deliveryMode?: "PICKUP" | "DELIVERY";
    deliveryAddress?: { postalCode: string; houseNumber: string; houseNumberSuffix: string; street: string; city: string; lookupStatus: "VERIFIED" | "MANUAL_FALLBACK" };
    productionLines?: readonly { id?: string; type: SportpaleisProductionLine["type"]; content: string; sourceId: string; widthMm: number; heightMm: number; quantity: number; previewLabel?: string; provenance?: string; placementRole?: string; placementRule?: Pick<NonNullable<SportpaleisProductionLine["placementRule"]>, "compositionId" | "compositeText" | "segmentIndex" | "segmentCount" | "alignment"> }[];
  }): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("order") },
      body: JSON.stringify({ orderKind: input.orderKind ?? "INDIVIDUAL", ...input }),
    }));
  }

  async bulkAdvanceOrders(orders: readonly WorkspaceOrder[]): Promise<{ duplicate: boolean; value: WorkspaceOrder[] }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/bulk-advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("bulk") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })) }),
    }));
  }

  async advanceOrder(order: WorkspaceOrder): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("advance") },
      body: JSON.stringify({ expectedRevision: order.revision }),
    }));
  }

  async updateOrder(order: WorkspaceOrder, input: { customer?: string; customerEmail?: string; customerPhone?: string; deliveryMode?: "PICKUP" | "DELIVERY"; deliveryAddress?: { postalCode: string; houseNumber: string; houseNumberSuffix: string; street: string; city: string; lookupStatus: "VERIFIED" | "MANUAL_FALLBACK" }; standardPersonalization?: OrderPersonalization; items?: readonly EditableOrderItemInput[]; correctionReason?: string }): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedRevision: order.revision }) }));
  }

  async addOrderNote(orderId: string, input: { scope: "order" | "customer"; kind: "internal" | "attention"; text: string }): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(orderId)}/notes`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("note") }, body: JSON.stringify(input) }));
  }

  async resolveBarcode(value: string): Promise<{ order: WorkspaceOrder; emulated: true; hardwareValidated: false }> {
    return responseBody(await fetch(`${API}/barcode/resolve`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, emulate: true }) }));
  }

  async confirmPickup(order: WorkspaceOrder): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/pickup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: order.revision }) }));
  }

  async recordOperationalEvent(order: WorkspaceOrder, action: "PRINTED" | "REGISTER_PROCESSED" | "PAID" | "CUSTOMER_INFORMED" | "PICKED_UP" | "DELIVERED"): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/operational-event`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("operation") }, body: JSON.stringify({ action, expectedRevision: order.revision }) }));
  }

  async importMailbatch(input: { sourceMessageId: string; source: "WEBSHOP_XPRT" | "TEAM_MAIL"; scheduledWindow: "08:30" | "12:00" | "14:00" | "16:00"; provenance: string; records?: { externalId: string; externalReference: string; customer: string; association?: string; changes: string[] }[]; filename?: string; rawExportText?: string }): Promise<{ duplicate: boolean; value: SportpaleisMailbatch }> {
    return responseBody(await this.#mutatingFetch(`${API}/mailbatches/import`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("mailbatch") }, body: JSON.stringify(input) }));
  }

  async previewOrderMail(orderId: string, templateKey: "ORDER_RECEIVED" | "ORDER_IN_PRODUCTION" | "ORDER_READY" | "ORDER_QUESTION", question = ""): Promise<MailPreview> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(orderId)}/mail/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey, question }),
    }));
  }

  async captureOrderMail(orderId: string, templateKey: "ORDER_RECEIVED" | "ORDER_IN_PRODUCTION" | "ORDER_READY" | "ORDER_QUESTION", question = ""): Promise<MailHistoryEntry> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(orderId)}/mail/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("mail") },
      body: JSON.stringify({ templateKey, question }),
    }));
  }

  async orderMailHistory(orderId: string): Promise<MailHistoryEntry[]> {
    const result = await responseBody<{ history: MailHistoryEntry[] }>(await fetch(`${API}/orders/${encodeURIComponent(orderId)}/mail/history`, { credentials: "same-origin", headers: { Accept: "application/json" } }));
    return result.history;
  }

  async submitFeedback(input: Omit<WorkspaceFeedback, "id" | "userId" | "userRole" | "createdAt" | "attachments"> & { attachments?: { filename: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; dataBase64: string }[] }): Promise<{ duplicate: boolean; value: WorkspaceFeedback }> {
    return responseBody(await this.#mutatingFetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("feedback") },
      body: JSON.stringify(input),
    }));
  }

  async savePreferences(preference: WorkspacePreference): Promise<WorkspacePreference> {
    return responseBody(await this.#mutatingFetch(`${API}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    }));
  }

  async requestUsers(quantity: 1 | 2 | 3): Promise<{ duplicate: boolean; value: ExtraUserRequest }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/extra-users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("users") },
      body: JSON.stringify({ quantity }),
    }));
  }

  async createInvitedUser(input: { name: string; email: string; role: "admin" | "operator" | "store" }): Promise<{ user: SportpaleisUser; activationPath: string; expiresAt: string; delivery: "LOCAL_HANDOFF_ONLY" }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateUser(userId: string, input: { role?: "admin" | "operator" | "store"; status?: "Actief" | "Inactief" | "Uitgenodigd"; salesNumber?: string | null; workContexts?: NonNullable<SportpaleisUser["workContexts"]>; defaultContext?: NonNullable<SportpaleisUser["defaultContext"]> }): Promise<SportpaleisUser> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  async upsertEmployee(input: { id?: string; expectedRevision?: number; name: string; salesNumber: string; active: boolean; userId?: string | null }): Promise<SportpaleisEmployee> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  async setQuickPin(userId: string, input: { pin?: string; disable?: boolean }): Promise<SportpaleisUser> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}/quick-pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async upsertProductionElement(input: Omit<SportpaleisProductionElement, "id" | "revision" | "sourceLayers"> & { id?: string; expectedRevision?: number; sourceLayers?: { visualSource?: { filename: string; mimeType: string; dataBase64: string }; vectorSource?: { filename: string; mimeType: string; dataBase64: string } } }): Promise<SportpaleisProductionElement> {
    return responseBody(await this.#mutatingFetch(`${API}/production-elements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async setProductionElementRequirement(input: Omit<SportpaleisProductionElementRequirement, "id" | "recordedAt" | "recordedBy">): Promise<SportpaleisProductionInventoryView[]> {
    return responseBody(await this.#mutatingFetch(`${API}/production-element-requirements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async replotProductionJob(productionJobId: string, reason = ""): Promise<{ duplicate: boolean; value: ProductionJob }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-jobs/${encodeURIComponent(productionJobId)}/replot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("replot") },
      body: JSON.stringify({ reason }),
    }));
  }

  async addProductionFont(input: { name: string; filename: string; dataBase64: string; provenance: string; allowedInStore: boolean }): Promise<SportpaleisProductionFont> {
    return responseBody(await this.#mutatingFetch(`${API}/production-fonts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createProductionJob(orders: readonly WorkspaceOrder[], proposalId?: string): Promise<{ duplicate: boolean; value: ProductionJob }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("plotjob") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })), proposalId }),
    }));
  }

  async createProductionProposal(orders: readonly WorkspaceOrder[]): Promise<{ duplicate: boolean; value: ProductionProposal }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("production-proposal") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })) }),
    }));
  }

  async updateArticle(articleId: string, input: {
    expectedRevision: number;
    active?: boolean;
    name?: string;
    articleNumber?: string;
    imageKey?: string;
    association?: string;
    profileId?: string;
    variantLabels?: string[];
    availableSizes?: string[];
    supports?: (keyof OrderPersonalization)[];
    personalizationPolicy?: CatalogArticle["personalizationPolicy"];
    validation?: CatalogArticle["validation"];
    displayOrder?: number;
    priceConfiguration?: CatalogArticle["priceConfiguration"];
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/articles/${encodeURIComponent(articleId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createArticle(input: { name: string; articleNumber: string; imageKey: string; association: string; profileId: string; source: string }): Promise<CatalogArticle> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/articles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateAssociation(associationId: string, input: { expectedRevision: number; active?: boolean; notes?: string; fontProfile?: string; foilColors?: string[]; dimensionsCm?: AssociationConfiguration["dimensionsCm"]; juniorValidationStatus?: "DATA_GAP" | "VALIDATED"; juniorPhysicalHeightMm?: number | null; juniorGarmentSizes?: string[]; juniorValidationNote?: string; workspaceLogo?: { filename: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; dataBase64: string } | null }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/associations/${encodeURIComponent(associationId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createAssociation(input: { name: string; sourceName: string; provenance: string }): Promise<AssociationConfiguration> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/associations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateProductionProfile(profileId: string, input: {
    expectedRevision: number;
    placement?: string;
    referenceDistanceCm?: number | null;
    sizeLabel?: string;
    fontProfile?: string;
    foilColor?: string;
    rotationDeg?: number | null;
    mirror?: boolean | null;
    instruction?: string;
    initialsInfixRule?: { active: boolean; heightMm: number | null; horizontalSpacingMm?: number | null; baselineOffsetMm?: number | null; /** Legacy call-site compatibility only. */ verticalOffsetMm?: number | null };
    validation?: ProductionProfile["validation"];
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/production-profiles/${encodeURIComponent(profileId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateSettings(input: { processingDays?: number; deliveryFeeEur?: number; receiptMailText?: string; readyMailText?: string }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateFoilRoll(rollId: string, input: { supplierType?: string; purchasePriceEur?: number | null; originalLengthM?: number | null }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/foil-rolls/${encodeURIComponent(rollId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async #mutatingFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    return fetch(input, {
      ...init,
      credentials: "same-origin",
      headers: { ...init.headers, "X-CSRF-Token": this.#csrfToken },
    });
  }
}
