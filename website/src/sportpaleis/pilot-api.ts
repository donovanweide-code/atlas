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
  ValidationStatus,
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
  SportpaleisProductionAssetSource,
  SportpaleisQuickProductionIntake,
  SportpaleisVisualComposition,
  SportpaleisCreativeVectorDraft,
  TeamkitProposal,
  TeamkitProposalItem,
  TeamkitFulfillmentRoute,
} from "./workspace-data.ts";
import { createNonCriticalReadonlyCache, type ReadonlyCacheObservation } from "../workspace-readonly-cache.ts";

const API = "/api/sportpaleis/v1";
const PRODUCTION_WRITE_TIMEOUT_MS = 30_000;
export const SPORTPALEIS_READONLY_CACHE_KEY = "sportpaleis.workspace.readonly-cache.013";
export const SPORTPALEIS_READONLY_CACHE_MAX_BYTES = 2 * 1024 * 1024;
const CACHE_PREFIX = "sportpaleis.workspace.readonly-cache.";

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
    productionAssetUploadsEnabled: boolean;
    fontUploadsEnabled: boolean;
    mailMode: "capture" | "disabled";
    hardwareSendEnabled: false;
    barcodeEnabled: false;
    barcodeHardwareValidated: false;
    workContexts: NonNullable<SportpaleisUser["workContexts"]>;
    deviceMode: "SHARED" | "PERSONAL";
    authMethod: "PASSWORD" | "PIN" | "DEMO";
    quickPinEnabled: boolean;
    /** Exact per-principal server decision; defaults false for every account. */
    teamwearExperiencePilot: boolean;
    /** Server-authoritative runtime exposure. False removes the standalone Studio surface and APIs. */
    creativeStudio: boolean;
    /** Exact server-side principal decision. Candidate code is lazy and has no production mutation authority. */
    reviewMode: boolean;
    /** Human-GO scoped, short-lived Codex review principal. Never a customer seat. */
    reviewDeveloper?: boolean;
  };
  productionInventory: SportpaleisProductionInventoryView[];
  productionHistory?: { total: number; loaded: number; pageSize: number; bounded: true };
  productionHistoryPage?: ProductionJobHistoryPage;
  orderHistory?: { total: number; loaded: number; pageSize: number; bounded: true };
  releaseId: string;
  commercialAdministration?: CommercialAdministration;
  readOnlyFallback?: boolean;
}

export interface ProductionJobHistoryPage {
  items: ProductionJob[];
  total: number;
  pageSize: number;
  query: string;
  nextCursor: string | null;
  bounded: true;
}

export interface OrderHistoryPage {
  items: WorkspaceOrder[];
  total: number;
  pageSize: number;
  query: string;
  nextCursor: string | null;
  bounded: true;
}

export interface ProductionCompletionProjection {
  revision: number;
  orders: WorkspaceOrder[];
  productionJobs: ProductionJob[];
  productionProposals: ProductionProposal[];
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

function isPilotBootstrapCache(value: unknown): value is PilotBootstrap {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PilotBootstrap>;
  return Number.isInteger(candidate.revision)
    && Boolean(candidate.currentUser && typeof candidate.currentUser === "object")
    && Array.isArray(candidate.orders)
    && Array.isArray(candidate.articles)
    && Array.isArray(candidate.associations)
    && Array.isArray(candidate.productionProfiles)
    && Boolean(candidate.capabilities && typeof candidate.capabilities === "object");
}

function cacheProjection(result: PilotBootstrap): PilotBootstrap {
  const { csrfToken: _csrfToken, ...withoutCsrf } = result;
  return {
    ...withoutCsrf,
    productionProfiles: result.productionProfiles.map(({ validationHistory: _validationHistory, ...profile }) => profile),
  };
}

function observeReadonlyCache(observation: ReadonlyCacheObservation): void {
  globalThis.console?.info?.("Non-critical Workspace cache skipped.", { observation });
}

const readonlyCache = createNonCriticalReadonlyCache<PilotBootstrap>({
  key: SPORTPALEIS_READONLY_CACHE_KEY,
  keyPrefix: CACHE_PREFIX,
  maxBytes: SPORTPALEIS_READONLY_CACHE_MAX_BYTES,
  resolveStorage: () => globalThis.sessionStorage,
  validate: isPilotBootstrapCache,
  observe: observeReadonlyCache,
});

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

async function deterministicIdempotencyKey(prefix: string, payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${hash}`;
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

  async activateReviewAccess(activationToken: string, candidateId: string): Promise<{ user: SportpaleisUser; expiresAt: string }> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string; expiresAt: string }>(await fetch(`${API}/auth/review-access/activate`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationToken, candidateId }),
    }));
    this.#csrfToken = result.csrfToken;
    readonlyCache.clear();
    return { user: result.user, expiresAt: result.expiresAt };
  }

  async fastSwitch(targetUserId: string, credential: { authMode: "PIN"; pin: string } | { authMode: "PASSWORD"; password: string }, deviceMode: "SHARED" | "PERSONAL"): Promise<SportpaleisUser> {
    const result = await responseBody<{ user: SportpaleisUser; csrfToken: string }>(await this.#mutatingFetch(`${API}/auth/switch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, ...credential, deviceMode }) }));
    this.#csrfToken = result.csrfToken;
    readonlyCache.clear();
    return result.user;
  }

  async activate(token: string, password: string): Promise<{ user: SportpaleisUser; activated: true }> {
    return responseBody(await fetch(`${API}/auth/activate`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }));
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true; message: string }> {
    return responseBody(await fetch(`${API}/auth/recovery/request`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }));
  }

  async completePasswordReset(token: string, password: string): Promise<{ user: SportpaleisUser; reset: true }> {
    return responseBody(await fetch(`${API}/auth/recovery/complete`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }));
  }

  async issuePasswordReset(userId: string): Promise<{ resetPath: string; expiresAt: string; delivery: "LOCAL_HANDOFF_ONLY" }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}/account-recovery`, { method: "POST" }));
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
    readonlyCache.clear();
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
    readonlyCache.replace(cacheProjection(result));
    return result;
  }

  async currentRevision(): Promise<{ revision: number }> {
    return responseBody(await fetch(`${API}/state-revision`, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }));
  }

  cachedBootstrap(): PilotBootstrap | undefined {
    const cached = readonlyCache.read();
    return cached ? { ...cached, readOnlyFallback: true } : undefined;
  }

  async createOrder(input: {
    orderKind?: "INDIVIDUAL" | "TEAM" | "CUSTOM";
    teamContext?: string;
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
    productionLines?: readonly { id?: string; type: SportpaleisProductionLine["type"]; content: string; sourceId: string; widthMm: number; heightMm: number; foilColor?: string; quantity: number; previewLabel?: string; provenance?: string; placementRole?: string; placementRule?: Pick<NonNullable<SportpaleisProductionLine["placementRule"]>, "compositionId" | "compositeText" | "segmentIndex" | "segmentCount" | "alignment"> }[];
  }, operationKey?: string): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": operationKey || idempotencyKey("order") },
      body: JSON.stringify({ orderKind: input.orderKind ?? "INDIVIDUAL", ...input }),
    }));
  }

  async createQuickProductionIntake(input: { filename: string; mimeType: string; dataBase64: string }): Promise<{ duplicate: boolean; value: SportpaleisQuickProductionIntake }> {
    return responseBody(await this.#mutatingFetch(`${API}/quick-production-intakes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("quick-intake") },
      body: JSON.stringify(input),
    }));
  }

  async createVisualComposition(input: { concept: SportpaleisVisualComposition["concept"]; title: string; artDirection: string; articleId: string; assetIds: string[]; sourceIntent: NonNullable<SportpaleisVisualComposition["sourceRef"]>["intent"]; sourceFile?: { filename: string; mimeType: string; dataBase64: string } }): Promise<{ duplicate: boolean; value: SportpaleisVisualComposition }> {
    return responseBody(await this.#mutatingFetch(`${API}/visual-compositions`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("visual-composition") }, body: JSON.stringify(input) }));
  }

  async updateVisualComposition(composition: SportpaleisVisualComposition, input: { title: string; artDirection: string; directionId: SportpaleisVisualComposition["directionId"]; geometry: SportpaleisVisualComposition["geometry"] }): Promise<SportpaleisVisualComposition> {
    return responseBody(await this.#mutatingFetch(`${API}/visual-compositions/${encodeURIComponent(composition.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedRevision: composition.revision }) }));
  }

  async submitVisualCompositionReview(composition: SportpaleisVisualComposition): Promise<SportpaleisVisualComposition> {
    return responseBody(await this.#mutatingFetch(`${API}/visual-compositions/${encodeURIComponent(composition.id)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: composition.revision }) }));
  }

  async createCreativeVectorDraft(input: { filename: string; mimeType: string; dataBase64: string; officialVectorAvailable: boolean }): Promise<{ duplicate: boolean; value: SportpaleisCreativeVectorDraft }> {
    return responseBody(await this.#mutatingFetch(`${API}/creative-vector-drafts`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("creative-vector-draft") }, body: JSON.stringify(input) }));
  }

  async ingestWebshopMailDocument(input: { sourceMessageId: string; receivedAt: string; filename: string; mimeType: "application/pdf"; dataBase64: string }): Promise<{ duplicate: boolean; value: unknown }> {
    return responseBody(await this.#mutatingFetch(`${API}/webshop-intakes/mail-document`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`webshop-source-${input.sourceMessageId}`) }, body: JSON.stringify(input) }));
  }

  async manuallyClassifyMailboxMessage(messageId: string, input: { route: "WEBSHOP_ORDER_PDF" | "CUSTOMER_REPLY" | "UNKNOWN"; reason: string; orderId?: string }): Promise<{ duplicate: boolean; value: unknown }> {
    return responseBody(await this.#mutatingFetch(`${API}/mailbox/messages/${encodeURIComponent(messageId)}/classify`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`mailbox-classification-${messageId}-${input.route}`) }, body: JSON.stringify(input) }));
  }

  async acceptWebshopMatch(matchId: string, input: { explicitAgreement: true; customer: string; customerEmail?: string; customerPhone?: string; association: string; backNumberSizeClass: "JUNIOR" | "SENIOR" }): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/webshop-intakes/matches/${encodeURIComponent(matchId)}/accept`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`webshop-match-${matchId}`) }, body: JSON.stringify(input) }));
  }

  async recordWebshopOrderPrint(orderId: string): Promise<{ duplicate: boolean; value: unknown }> {
    return responseBody(await this.#mutatingFetch(`${API}/webshop-orders/${encodeURIComponent(orderId)}/print`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`webshop-print-${orderId}`) } }));
  }

  async applyWebshopStockLogo(order: WorkspaceOrder): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    return responseBody(await this.#mutatingFetch(`${API}/webshop-orders/${encodeURIComponent(order.id)}/stock-logo/apply`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`webshop-stock-logo-${order.id}`) }, body: JSON.stringify({ expectedRevision: order.revision }) }));
  }

  async acceptQuickProductionIntake(intakeId: string, input: { explicitAgreement: true; customer: string; customerEmail: string; customerPhone: string; association?: string; backNumberSizeClass?: "JUNIOR" | "SENIOR"; fields: Record<string, string> }): Promise<{ duplicate: boolean; value: { intake: SportpaleisQuickProductionIntake; order: WorkspaceOrder } }> {
    return responseBody(await this.#mutatingFetch(`${API}/quick-production-intakes/${encodeURIComponent(intakeId)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey(`quick-intake-accept-${intakeId}`) },
      body: JSON.stringify(input),
    }));
  }

  async bulkAdvanceOrders(orders: readonly WorkspaceOrder[]): Promise<{ duplicate: boolean; value: WorkspaceOrder[] }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/bulk-advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("bulk") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })) }),
    }));
  }

  async completeProductionOrders(orders: readonly WorkspaceOrder[]): Promise<{ duplicate: boolean; value: { completed: WorkspaceOrder[]; skipped: { id: string; code: string; reason: string }[] } }> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/bulk-complete-production`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("bulk-production-ready") },
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

  async deleteOrder(order: WorkspaceOrder, reason = ""): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: order.revision, reason }) }));
  }

  async restoreOrder(order: WorkspaceOrder): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: order.revision }) }));
  }

  async archiveProductionWork(order: WorkspaceOrder, reason: string): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/production-work/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: order.revision, reason }) }));
  }

  async restoreProductionWork(order: WorkspaceOrder): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/production-work/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: order.revision }) }));
  }

  async updateOrder(order: WorkspaceOrder, input: { customer?: string; customerEmail?: string; customerPhone?: string; deliveryMode?: "PICKUP" | "DELIVERY"; deliveryAddress?: { postalCode: string; houseNumber: string; houseNumberSuffix: string; street: string; city: string; lookupStatus: "VERIFIED" | "MANUAL_FALLBACK" }; standardPersonalization?: OrderPersonalization; items?: readonly EditableOrderItemInput[]; preservedLegacyItemIds?: readonly string[]; correctionReason?: string }): Promise<WorkspaceOrder> {
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedRevision: order.revision }) }));
  }

  async confirmExistingOrderProductionReconciliation(order: WorkspaceOrder, reason: string): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    const reconciliation = order.productionReconciliation;
    if (!reconciliation?.projectionHash) throw new Error("Er is geen bevestigbare productieprojectie beschikbaar.");
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/production-reconciliation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("existing-order-reconciliation") },
      body: JSON.stringify({ expectedRevision: order.revision, historicalSourceHash: reconciliation.historicalSourceHash, projectionHash: reconciliation.projectionHash, confirm: true, reason }),
    }));
  }

  async resolveExistingOrderProductionReconciliationFinding(order: WorkspaceOrder, findingId: string, value: string, reason: string, cancel = false): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
    const reconciliation = order.productionReconciliation;
    if (!reconciliation) throw new Error("Er is geen actuele ontbrekende productiewaarheid beschikbaar.");
    return responseBody(await this.#mutatingFetch(`${API}/orders/${encodeURIComponent(order.id)}/production-reconciliation/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("existing-order-reconciliation-decision") },
      body: JSON.stringify({ expectedRevision: order.revision, historicalSourceHash: reconciliation.historicalSourceHash, findingId, value, reason, cancel }),
    }));
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

  async recordOperationalEvent(order: WorkspaceOrder, action: "PRINTED" | "REGISTER_PROCESSED" | "PAID" | "CUSTOMER_INFORMED" | "READY_FOR_PICKUP" | "PICKED_UP" | "DELIVERED"): Promise<{ duplicate: boolean; value: WorkspaceOrder }> {
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

  async cancelInvitation(userId: string): Promise<{ revoked: true; userId: string; email: string }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}/invitation`, { method: "DELETE" }));
  }

  async reissueInvitation(userId: string): Promise<{ user: SportpaleisUser; activationPath: string; expiresAt: string; delivery: "LOCAL_HANDOFF_ONLY" }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}/invitation`, { method: "POST" }));
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

  async deleteEmployee(employeeId: string): Promise<{ deleted: true; id: string }> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/employees/${encodeURIComponent(employeeId)}`, { method: "DELETE" }));
  }

  async setQuickPin(userId: string, input: { pin?: string; disable?: boolean }): Promise<SportpaleisUser> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/users/${encodeURIComponent(userId)}/quick-pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async upsertProductionElement(input: Omit<SportpaleisProductionElement, "id" | "revision" | "sourceLayers"> & { id?: string; expectedRevision?: number; sourceLayers?: { visualSource?: { filename: string; mimeType: string; dataBase64: string }; vectorSource?: { filename: string; mimeType: string; dataBase64: string } } }): Promise<SportpaleisProductionElement> {
    return responseBody(await this.#mutatingFetch(`${API}/production-elements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createProductionAssetSource(input: { filename: string; mimeType: string; dataBase64: string; provenance?: string; intakeKind?: "ARTWORK" | "NUMBER_SET"; derivedFromSourceId?: string; conversionMethod?: "HUMAN_VERIFIED_SVG" | "ORIGINAL_PDF_INTERPRETATION" | "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT" }): Promise<SportpaleisProductionAssetSource> {
    return responseBody(await this.#mutatingFetch(`${API}/production-asset-sources`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async reviewProductionAssetSourceFidelity(sourceId: string, input: { status: "MATCHED" | "MISMATCH"; expectedRevision: number; note?: string; proofAuthority: "HUMAN_SOURCE_COMPARISON" }): Promise<SportpaleisProductionAssetSource> {
    return responseBody(await this.#mutatingFetch(`${API}/production-asset-sources/${encodeURIComponent(sourceId)}/fidelity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async saveProductionAssetReviewDraft(sourceId: string, input: Omit<NonNullable<SportpaleisProductionAssetSource["reviewDraft"]>, "updatedAt" | "updatedBy">): Promise<SportpaleisProductionAssetSource> {
    return responseBody(await this.#mutatingFetch(`${API}/production-asset-sources/${encodeURIComponent(sourceId)}/review-draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async promoteProductionAsset(sourceId: string, input: { candidateIds: string[]; name: string; ownerType: "ASSOCIATION" | "CUSTOMER" | "SPONSOR" | "OWN_BRAND"; ownerName: string; productionMethod: "SELF_PRODUCED" | "PHYSICAL_TRANSFER"; widthMm: number; heightMm: number; sizePolicyMode?: "FIXED" | "DEFAULT_WITH_LIMITS" | "PROPORTIONAL_FREE"; minWidthMm?: number; maxWidthMm?: number; defaultFoilColor?: string; variantLabel?: string; contexts?: { type: "ASSOCIATION" | "SPONSOR" | "ORGANIZATION" | "TEAM" | "ARTICLE" | "ORDER" | "GENERIC"; id: string; label: string }[]; applications?: { kind: "LOGO" | "SPONSOR" | "NUMBER_SET" | "ARTWORK"; placement: string | null }[]; productionProfileId?: string; glyphMap?: Record<string, string>; proofAuthority: "HUMAN_ACCEPTANCE"; strokeReviewAccepted?: boolean }): Promise<SportpaleisProductionElement> {
    return responseBody(await this.#mutatingFetch(`${API}/production-asset-sources/${encodeURIComponent(sourceId)}/promote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async setProductionAssetLifecycle(elementId: string, input: { lifecycleStatus: "PRODUCTION_READY" | "ARCHIVED"; expectedRevision: number; widthMm?: number }): Promise<SportpaleisProductionElement> {
    return responseBody(await this.#mutatingFetch(`${API}/production-assets/${encodeURIComponent(elementId)}/lifecycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
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

  async retryRejectedProductionJob(productionJobId: string, reason: string): Promise<{ duplicate: boolean; value: { rejectedJob: ProductionJob; job: ProductionJob } }> {
    const normalizedReason = reason.trim();
    const operationKey = await deterministicIdempotencyKey(`production-rejected-retry-${productionJobId}`, { reason: normalizedReason });
    return responseBody(await this.#mutatingFetch(`${API}/production-jobs/${encodeURIComponent(productionJobId)}/retry-after-rejection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": operationKey },
      body: JSON.stringify({ reason: normalizedReason }),
    }));
  }

  async orderHistory(input: { query?: string; cursor?: string; limit?: number } = {}): Promise<OrderHistoryPage> {
    const parameters = new URLSearchParams();
    if (input.query) parameters.set("q", input.query);
    if (input.cursor) parameters.set("cursor", input.cursor);
    if (input.limit) parameters.set("limit", String(input.limit));
    return responseBody(await fetch(`${API}/orders?${parameters}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }));
  }

  async order(orderId: string): Promise<WorkspaceOrder> {
    return responseBody(await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }));
  }

  async productionJobHistory(input: { query?: string; cursor?: string; limit?: number } = {}): Promise<ProductionJobHistoryPage> {
    const parameters = new URLSearchParams();
    if (input.query) parameters.set("q", input.query);
    if (input.cursor) parameters.set("cursor", input.cursor);
    if (input.limit) parameters.set("limit", String(input.limit));
    return responseBody(await fetch(`${API}/production-jobs?${parameters}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }));
  }

  async productionJob(productionJobId: string): Promise<ProductionJob> {
    return responseBody(await fetch(`${API}/production-jobs/${encodeURIComponent(productionJobId)}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } }));
  }

  async completeProductionJob(productionJobId: string): Promise<{ duplicate: boolean; value: ProductionJob; projection?: ProductionCompletionProjection }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-jobs/${encodeURIComponent(productionJobId)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("production-complete") },
      body: JSON.stringify({}),
    }));
  }

  async inspectProductionFont(input: { name: string; filename: string; dataBase64: string; productionProfileId?: string; applicationField?: keyof OrderPersonalization; associationId?: string }): Promise<{ inspectionSha256: string; sourceSha256: string; filename: string; metadata: { familyName: string | null; subfamilyName: string | null; fullName: string | null; postscriptName: string | null; unitsPerEm: number; glyphCount: number }; representativeProofs: { content: string; geometrySha256: string; widthMm: number; heightMm: number }[]; executabilitySha256: string; authoritative: false }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-fonts/inspect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async addProductionFont(input: { name: string; filename: string; dataBase64: string; provenance: string; allowedInStore: boolean; humanAcceptance: boolean; inspectionSha256: string; productionProfileId?: string; applicationField?: keyof OrderPersonalization; associationId?: string }): Promise<SportpaleisProductionFont> {
    return responseBody(await this.#mutatingFetch(`${API}/production-fonts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createProductionJob(orders: readonly WorkspaceOrder[], proposalId?: string, proposalGroupId?: string): Promise<{ duplicate: boolean; value: ProductionJob }> {
    return responseBody(await this.#boundedProductionFetch(`${API}/production-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("plotjob") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })), proposalId, proposalGroupId }),
    }));
  }

  async createProductionProposal(orders: readonly WorkspaceOrder[]): Promise<{ duplicate: boolean; value: ProductionProposal }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("production-proposal") },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })) }),
    }));
  }

  async analyzeProductionEfficiency(orders: readonly WorkspaceOrder[], foilColor: string, supplement: { type: "TEXT" | "INITIALS" | "NUMBER"; content: string; sourceId: string; heightMm: number; quantity: number }): Promise<{ status: "FIT" | "NO_SAFE_REST_CAPACITY"; analysisHash: string; supplement: Record<string, unknown>; evidence: { baseUsedWidthMm: number; baseUsedLengthMm: number; augmentedUsedWidthMm: number; augmentedUsedLengthMm: number; utilizationBeforePercent: number; utilizationAfterPercent: number; customerOrderLinesCreated: false; analysisHash: string }; historyEvidence: { matchingCompletedObjects: number; source: "IMMUTABLE_COMPLETED_PRODUCTION_JOBS" } }> {
    return responseBody(await this.#mutatingFetch(`${API}/production-proposals/efficiency-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })), foilColor, supplement }),
    }));
  }

  async prepareCurrentProductionGroup(orders: readonly WorkspaceOrder[], foilColor: string, efficiency?: { supplement: Record<string, unknown>; analysisHash: string }): Promise<{ duplicate: boolean; value: { proposal: ProductionProposal; job: ProductionJob } }> {
    const payload = { orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })).sort((left, right) => left.id.localeCompare(right.id)), foilColor, ...(efficiency ? { supplement: efficiency.supplement, efficiencyAnalysisHash: efficiency.analysisHash } : {}) };
    const idempotencyPayload = { ...payload, foilColor: foilColor.trim().toLocaleLowerCase("nl-NL") };
    return responseBody(await this.#boundedProductionFetch(`${API}/production-proposals/current-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": await deterministicIdempotencyKey("production-current-group", idempotencyPayload) },
      body: JSON.stringify(payload),
    }));
  }

  async searchTeamwearCatalog(input: { query?: string; brand?: string; use?: string; audience?: string; offset?: number; limit?: number } = {}): Promise<{ products: unknown[]; total: number; nextOffset: number | null; bounded: true; resolver: "CANONICAL_PRODUCT_CATALOG_V1"; normalizedQuery: string; normalizedFilters: { brand: string | null; use: string | null; audience: string | null }; stateRevision: number; elapsedMs: number }> {
    const query = new URLSearchParams(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
    return responseBody(await fetch(`${API}/teamwear/catalog?${query}`, { credentials: "same-origin" }));
  }

  async createTeamkitProposal(input: { title: string; type?: string; customerId?: string; customerName?: string; contactName?: string; customerEmail?: string; customerPhone?: string; associationId?: string; associationName?: string; team?: string; season?: string; category?: string; deadline?: string; notes?: string; sources?: { clientRef?: string; filename: string; mimeType: string; dataBase64: string }[]; items?: TeamkitProposalItem[] }, operationKey?: string): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": operationKey || idempotencyKey("teamwear-source-first") }, body: JSON.stringify(input) }));
  }

  async updateTeamkitProposal(proposal: TeamkitProposal, input: { title?: string; type?: string; customer?: TeamkitProposal["customer"]; association?: TeamkitProposal["association"]; team?: string | null; season?: string | null; category?: string | null; deadline?: string | null; notes?: string | null; items?: TeamkitProposalItem[]; reason?: string; feedbackIds?: string[]; reopenApproved?: boolean }): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposal.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedRevision: proposal.aggregateRevision }) }));
  }

  async issueTeamkitCustomerLink(proposalId: string): Promise<{ proposal: TeamkitProposal; path: string; expiresAt: string }> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/customer-link`, { method: "POST" }));
  }

  async setTeamkitProposalStatus(proposal: TeamkitProposal, status: "IN_DESIGN" | "READY_FOR_REVIEW" | "SENT_TO_CUSTOMER" | "READY_FOR_APPROVAL" | "ARCHIVED"): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposal.id)}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, expectedRevision: proposal.aggregateRevision }) }));
  }

  async copyTeamkitProposal(proposalId: string, input: { title?: string; season?: string }): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/copy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async addTeamkitProposalSource(proposalId: string, input: { filename: string; mimeType: string; dataBase64: string }): Promise<{ source: TeamkitProposal["sources"][number]; duplicate: boolean }> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/sources`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async linkTeamkitProposalSource(proposal: TeamkitProposal, sourceId: string, productionSourceId: string): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposal.id)}/sources/${encodeURIComponent(sourceId)}/production-asset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionSourceId, expectedRevision: proposal.aggregateRevision }) }));
  }

  async updateTeamkitFulfillmentTask(proposalId: string, taskId: string, input: { route?: TeamkitFulfillmentRoute; status?: TeamkitProposal["fulfillmentTasks"][number]["status"]; supplierName?: string | null; orderId?: string | null }): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/fulfillment/${encodeURIComponent(taskId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateTeamkitProductionSizing(proposal: TeamkitProposal, items: { itemId: string; sizeQuantities: { size: string; quantity: number }[] }[]): Promise<TeamkitProposal> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposal.id)}/production-sizing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: proposal.aggregateRevision, items }) }));
  }

  async prepareTeamkitInternalProduction(proposal: TeamkitProposal): Promise<{ duplicate: boolean; proposal: TeamkitProposal; orders: WorkspaceOrder[] }> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposal.id)}/internal-production`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: proposal.aggregateRevision }) }));
  }

  async previewTeamkitProposalMail(proposalId: string, input: { templateKey: "PROPOSAL_INTAKE_REQUEST" | "PROPOSAL_REVIEW_REQUEST" | "PROPOSAL_SUPPLIER_HANDOFF"; customerPath?: string; taskId?: string; recipient?: string; supplierName?: string }): Promise<MailPreview> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/mail/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async captureTeamkitProposalMail(proposalId: string, input: { templateKey: "PROPOSAL_INTAKE_REQUEST" | "PROPOSAL_REVIEW_REQUEST" | "PROPOSAL_SUPPLIER_HANDOFF"; customerPath?: string; taskId?: string; recipient?: string; supplierName?: string }): Promise<MailHistoryEntry> {
    return responseBody(await this.#mutatingFetch(`${API}/teamkit-proposals/${encodeURIComponent(proposalId)}/mail/capture`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey("proposal-mail") }, body: JSON.stringify(input) }));
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
    foilColorOverride?: string | null;
    priceConfiguration?: CatalogArticle["priceConfiguration"];
    teamwearCatalog?: CatalogArticle["teamwearCatalog"];
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/articles/${encodeURIComponent(articleId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createArticle(input: { name: string; articleNumber: string; imageKey: string; association: string; profileId: string; source: string; foilColorOverride?: string | null; teamwearCatalog?: CatalogArticle["teamwearCatalog"] }): Promise<CatalogArticle> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/articles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateAssociation(associationId: string, input: { expectedRevision: number; active?: boolean; notes?: string; fontProfile?: string; foilColors?: string[]; defaultFoilColor?: string; dimensionsCm?: AssociationConfiguration["dimensionsCm"]; juniorValidationStatus?: "DATA_GAP" | "VALIDATED"; juniorPhysicalHeightMm?: number | null; juniorGarmentSizes?: string[]; juniorValidationNote?: string; workspaceLogo?: { filename: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; dataBase64: string } | null }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/associations/${encodeURIComponent(associationId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createAssociation(input: { name: string; sourceName: string; provenance: string; defaultFoilColor?: string }): Promise<AssociationConfiguration> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/associations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async runWebsiteSync(): Promise<NonNullable<PilotBootstrap["websiteSync"]>> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/website-sync/run`, { method: "POST" }));
  }

  async reviewWebsiteSyncChange(changeId: string, action: "ACCEPT_SOURCE" | "KEEP_WORKSPACE"): Promise<NonNullable<PilotBootstrap["websiteSync"]>> {
    return responseBody(await this.#mutatingFetch(`${API}/admin/website-sync/changes/${encodeURIComponent(changeId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }));
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
    validation?: {
      status?: "VALIDATED" | "PARTIAL" | "DATA_GAP";
      source: string;
      size: ValidationStatus;
      font: ValidationStatus;
      foilColor: ValidationStatus;
      placement?: ValidationStatus;
      referenceDistance?: ValidationStatus;
      rotation?: ValidationStatus;
      mirror?: ValidationStatus;
      cutContour?: ValidationStatus;
      physicalCutOutput?: ValidationStatus;
      validatedScope?: string[];
    };
  }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/production-profiles/${encodeURIComponent(profileId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateSettings(input: { processingDays?: number; deliveryFeeEur?: number; receiptMailText?: string; readyMailText?: string; productionDefaults?: { workingWidthMm: number; maxSafeTrackWidthMm: number; minimumGapMm: number; edgeMarginMm: number; defaultWidthMm: number; defaultHeightMm: number; defaultFontId: string; defaultFoilColor: string } }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async createFoilRoll(input: { color: string; supplierType?: string | null; purchasePriceEur?: number | null; originalLengthM?: number | null; widthMm?: number | null }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/foil-rolls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async updateFoilRoll(rollId: string, input: { supplierType?: string | null; purchasePriceEur?: number | null; originalLengthM?: number | null; widthMm?: number | null; active?: boolean }): Promise<void> {
    await responseBody(await this.#mutatingFetch(`${API}/admin/foil-rolls/${encodeURIComponent(rollId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  }

  async #mutatingFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    const candidate = new URLSearchParams(globalThis.location?.search ?? "").get("candidate");
    if (candidate === "full-workspace-r3" || globalThis.location?.pathname?.endsWith("/reviews/full-workspace")) {
      return new Response(JSON.stringify({
        code: "CANDIDATE_READ_ONLY",
        message: "Deze volledige Workspace Candidate is alleen-lezen. Er is niets gewijzigd.",
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }
    return fetch(input, {
      ...init,
      credentials: "same-origin",
      headers: { ...init.headers, "X-CSRF-Token": this.#csrfToken },
    });
  }

  async #boundedProductionFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), PRODUCTION_WRITE_TIMEOUT_MS);
    try {
      return await this.#mutatingFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new PilotApiError(408, {
          error: "PRODUCTION_REQUEST_TIMEOUT",
          message: "De productiecontrole duurde te lang. Workspace controleert de actuele historie voordat opnieuw proberen veilig is.",
        });
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
