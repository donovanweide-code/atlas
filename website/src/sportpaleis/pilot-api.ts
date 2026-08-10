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
} from "./workspace-data.ts";

const API = "/api/sportpaleis/v1";
const CACHE_KEY = "sportpaleis.workspace.readonly-cache.007";

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
  };
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

  async login(email: string, password: string): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }));
    this.#csrfToken = result.csrfToken;
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

  async updateOrder(order: WorkspaceOrder, input: { customer?: string; customerEmail?: string; customerPhone?: string; standardPersonalization?: OrderPersonalization; items?: readonly EditableOrderItemInput[]; correctionReason?: string }): Promise<WorkspaceOrder> {
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

  async submitFeedback(input: Omit<WorkspaceFeedback, "id" | "userId" | "createdAt" | "attachments"> & { attachments?: { filename: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; dataBase64: string }[] }): Promise<{ duplicate: boolean; value: WorkspaceFeedback }> {
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

  async updateUser(userId: string, input: { role?: "admin" | "operator" | "store"; status?: "Actief" | "Inactief" | "Uitgenodigd"; salesNumber?: string | null }): Promise<SportpaleisUser> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/articles/${encodeURIComponent(articleId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateAssociation(associationId: string, input: { expectedRevision: number; active?: boolean; notes?: string; fontProfile?: string; foilColors?: string[]; dimensionsCm?: AssociationConfiguration["dimensionsCm"]; juniorValidationStatus?: "DATA_GAP" | "VALIDATED"; juniorPhysicalHeightMm?: number | null; juniorGarmentSizes?: string[]; juniorValidationNote?: string }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/associations/${encodeURIComponent(associationId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
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
    validation?: ProductionProfile["validation"];
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/production-profiles/${encodeURIComponent(profileId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateSettings(input: { processingDays?: number; receiptMailText?: string; readyMailText?: string }): Promise<void> {
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
