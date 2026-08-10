export const observationStorageKeys = {
  observations: "atlas.workspace.observations.v1",
  observingContext: "atlas.workspace.observing-context.v1",
} as const;

export const observationBoundaries = [
  { id: "public.home.entry", label: "Eerste publieke minuut", path: "/", hash: "#eerste-publieke-minuut" },
  { id: "public.home.understanding", label: "Eerst begrijpen", path: "/", hash: "#begrijpen" },
  { id: "public.home.digital-foundation", label: "Website en fundament", path: "/", hash: "#digitaal-fundament" },
  { id: "public.projects.confirmed-work", label: "Ruimte voor bewijs", path: "/projecten", hash: "#bevestigd-werk" },
  { id: "public.contact.exploration", label: "Contact en verkenning", path: "/contact", hash: "#contact-verkenning" },
] as const;

export type ObservationBoundaryId = (typeof observationBoundaries)[number]["id"];

export const observationStatuses = [
  { id: "unreviewed", label: "Nog beoordelen", meaning: "Vastgelegd zonder betekenis of conclusie." },
  { id: "confirmed", label: "Bevestigde werkelijkheid", meaning: "Door een mens als relevante werkelijkheid bevestigd." },
  { id: "linked", label: "Menselijk toegewezen", meaning: "Door een mens aan een bestaande case of oriëntatie verbonden." },
  { id: "question", label: "Open vraag", meaning: "Door een mens teruggebracht tot een vraag die bewust openblijft." },
  { id: "parked", label: "Geparkeerd", meaning: "Bewust geparkeerd met een expliciete terugkeertrigger." },
  { id: "rejected", label: "Afgewezen", meaning: "Door een mens afgewezen omdat de observatie onvoldoende herleidbaar is." },
] as const;

export type ObservationStatus = (typeof observationStatuses)[number]["id"];
export type ReviewedObservationStatus = Exclude<ObservationStatus, "unreviewed">;
export type ObservationOrigin = "website" | "workspace" | "experience" | "observatory" | "practice-source";
export type ObservationRelationLayer = "case" | "understanding" | "knowledge";
export type ObservationSupportingFileKind = "screenshot" | "document" | "pdf" | "spreadsheet" | "photo" | "email";

export interface ObservationSource {
  id: string;
  kind: "surface" | "practice-source";
  label: string;
  origin: ObservationOrigin;
  path: string;
  locator: string;
  capturedAt: string;
}

export interface ObservationSupportingFile {
  id: string;
  kind: ObservationSupportingFileKind;
  label: string;
  reference: string;
  mimeType?: string;
  capturedAt: string;
}

export interface ObservationOwnership {
  captureOwner: string;
  reviewOwner: string;
}

export interface ObservationContext {
  surface: "public" | "workspace" | "experience" | "observatory" | "practice-source";
  path: string;
  hash: string;
  pageId: string;
  pageLabel: string;
  boundaryId: string;
  boundaryLabel: string;
  viewport?: { width: number; height: number };
}

export interface ObservationRelation {
  layer: ObservationRelationLayer;
  targetId: string;
  linkedAt: string;
  linkedBy: string;
  rationale: string;
  confirmedByHuman: true;
}

export interface ObservationHistoryEntry {
  id: string;
  from: ObservationStatus | null;
  to: ObservationStatus;
  at: string;
  actor: string;
  rationale: string;
  confirmedByHuman: boolean;
}

export interface ObservationLegacyContext {
  caseId?: string;
  sprintId?: string;
}

export interface Observation {
  version: 2;
  id: string;
  text: string;
  createdAt: string;
  status: ObservationStatus;
  source: ObservationSource;
  context: ObservationContext;
  ownership: ObservationOwnership;
  supportingFiles: ObservationSupportingFile[];
  relations: ObservationRelation[];
  history: ObservationHistoryEntry[];
  returnTrigger?: string;
  legacyContext?: ObservationLegacyContext;
}

export interface ObservationStore {
  version: 2;
  observations: Observation[];
}

export interface ObservationDraft {
  text: string;
  source: Omit<ObservationSource, "capturedAt">;
  context: ObservationContext;
  ownership: ObservationOwnership;
  supportingFiles?: ObservationSupportingFile[];
}

export interface ObservingContext {
  version: 2;
  active: true;
  source: Pick<ObservationSource, "id" | "label" | "origin">;
  ownership: ObservationOwnership;
  activatedAt: string;
  legacyContext?: ObservationLegacyContext;
}

export interface ActivateObservingInput {
  source: ObservingContext["source"];
  ownership: ObservationOwnership;
}

export interface ObservationReviewDecision {
  status: ReviewedObservationStatus;
  reviewedBy: string;
  rationale: string;
  caseId?: string;
  returnTrigger?: string;
}

export interface ObservationLinkInput {
  layer: ObservationRelationLayer;
  targetId: string;
  linkedBy: string;
  rationale: string;
}

type LocalStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const emptyObservationStore = (): ObservationStore => ({ version: 2, observations: [] });
const statusIds = new Set<string>(observationStatuses.map((status) => status.id));
const origins = new Set<ObservationOrigin>(["website", "workspace", "experience", "observatory", "practice-source"]);
const relationLayers = new Set<ObservationRelationLayer>(["case", "understanding", "knowledge"]);
const fileKinds = new Set<ObservationSupportingFileKind>(["screenshot", "document", "pdf", "spreadsheet", "photo", "email"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isStatus(value: unknown): value is ObservationStatus {
  return typeof value === "string" && statusIds.has(value);
}

function isOrigin(value: unknown): value is ObservationOrigin {
  return typeof value === "string" && origins.has(value as ObservationOrigin);
}

function isViewport(value: unknown): value is NonNullable<ObservationContext["viewport"]> {
  return isRecord(value)
    && Number.isInteger(value.width) && Number(value.width) > 0
    && Number.isInteger(value.height) && Number(value.height) > 0;
}

function isSource(value: unknown): value is ObservationSource {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && (value.kind === "surface" || value.kind === "practice-source")
    && isNonEmptyString(value.label)
    && isOrigin(value.origin)
    && typeof value.path === "string"
    && typeof value.locator === "string"
    && isIsoDate(value.capturedAt);
}

function isOwnership(value: unknown): value is ObservationOwnership {
  return isRecord(value) && isNonEmptyString(value.captureOwner) && isNonEmptyString(value.reviewOwner);
}

function isContext(value: unknown): value is ObservationContext {
  return isRecord(value)
    && (value.surface === "public" || value.surface === "workspace" || value.surface === "experience" || value.surface === "observatory" || value.surface === "practice-source")
    && typeof value.path === "string"
    && typeof value.hash === "string"
    && isNonEmptyString(value.pageId)
    && isNonEmptyString(value.pageLabel)
    && isNonEmptyString(value.boundaryId)
    && isNonEmptyString(value.boundaryLabel)
    && (value.viewport === undefined || isViewport(value.viewport));
}

function isSupportingFile(value: unknown): value is ObservationSupportingFile {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && typeof value.kind === "string" && fileKinds.has(value.kind as ObservationSupportingFileKind)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.reference)
    && (value.mimeType === undefined || typeof value.mimeType === "string")
    && isIsoDate(value.capturedAt);
}

function isRelation(value: unknown): value is ObservationRelation {
  return isRecord(value)
    && typeof value.layer === "string" && relationLayers.has(value.layer as ObservationRelationLayer)
    && isNonEmptyString(value.targetId)
    && isIsoDate(value.linkedAt)
    && isNonEmptyString(value.linkedBy)
    && isNonEmptyString(value.rationale)
    && value.confirmedByHuman === true;
}

function isHistoryEntry(value: unknown): value is ObservationHistoryEntry {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && (value.from === null || isStatus(value.from))
    && isStatus(value.to)
    && isIsoDate(value.at)
    && isNonEmptyString(value.actor)
    && isNonEmptyString(value.rationale)
    && typeof value.confirmedByHuman === "boolean";
}

function isValidHistory(history: readonly ObservationHistoryEntry[]): boolean {
  if (!history.length || history[0].from !== null || history[0].to !== "unreviewed") return false;
  return history.every((entry, index) => {
    if (index === 0) return entry.confirmedByHuman === false;
    const previous = history[index - 1];
    if (entry.from !== previous.to || entry.from === entry.to || entry.confirmedByHuman !== true) return false;
    return entry.from === "unreviewed" ? entry.to !== "unreviewed" : entry.to === "unreviewed";
  });
}

function isObservation(value: unknown): value is Observation {
  if (!isRecord(value) || value.version !== 2 || !isNonEmptyString(value.id) || !isNonEmptyString(value.text) || !isIsoDate(value.createdAt) || !isStatus(value.status)) return false;
  if (!isSource(value.source) || !isContext(value.context) || !isOwnership(value.ownership)) return false;
  if (!Array.isArray(value.supportingFiles) || !value.supportingFiles.every(isSupportingFile)) return false;
  if (!Array.isArray(value.relations) || !value.relations.every(isRelation)) return false;
  if (!Array.isArray(value.history) || !value.history.length || !value.history.every(isHistoryEntry) || !isValidHistory(value.history)) return false;
  if (value.history.at(-1)?.to !== value.status) return false;
  if (value.status === "parked" && !isNonEmptyString(value.returnTrigger)) return false;
  if (value.status === "linked" && !value.relations.some((relation) => relation.layer === "case")) return false;
  if (value.returnTrigger !== undefined && typeof value.returnTrigger !== "string") return false;
  if (value.status !== "unreviewed" && !value.history.some((entry) => entry.to === value.status && entry.confirmedByHuman)) return false;
  const relationKeys = value.relations.map((relation) => `${relation.layer}:${relation.targetId}`);
  if (new Set(relationKeys).size !== relationKeys.length) return false;
  return true;
}

interface LegacyObservation {
  version: 1;
  id: string;
  text: string;
  createdAt: string;
  status: "unreviewed";
  context: {
    surface: "public" | "workspace";
    path: string;
    hash: string;
    pageId: string;
    pageLabel: string;
    boundaryId: ObservationBoundaryId;
    boundaryLabel: string;
    caseId: "0001";
    sprintId: string;
    viewport: { width: number; height: number };
    confirmedAt: string;
    confirmedBy: "Donovan";
  };
}

function isLegacyObservation(value: unknown): value is LegacyObservation {
  if (!isRecord(value) || value.version !== 1 || value.status !== "unreviewed") return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.text) || !isIsoDate(value.createdAt)) return false;
  const context = value.context;
  return isRecord(context)
    && (context.surface === "public" || context.surface === "workspace")
    && typeof context.path === "string"
    && typeof context.hash === "string"
    && isNonEmptyString(context.pageId)
    && isNonEmptyString(context.pageLabel)
    && isNonEmptyString(context.boundaryId)
    && isNonEmptyString(context.boundaryLabel)
    && context.caseId === "0001"
    && isNonEmptyString(context.sprintId)
    && isViewport(context.viewport)
    && isIsoDate(context.confirmedAt)
    && context.confirmedBy === "Donovan";
}

function migrateLegacyObservation(value: LegacyObservation): Observation {
  return {
    version: 2,
    id: value.id,
    text: value.text,
    createdAt: value.createdAt,
    status: "unreviewed",
    source: {
      id: `legacy-${value.context.pageId}-${value.context.boundaryId}`,
      kind: "surface",
      label: value.context.pageLabel,
      origin: value.context.surface === "public" ? "website" : "workspace",
      path: value.context.path,
      locator: `${value.context.path}${value.context.hash}`,
      capturedAt: value.context.confirmedAt,
    },
    context: {
      surface: value.context.surface,
      path: value.context.path,
      hash: value.context.hash,
      pageId: value.context.pageId,
      pageLabel: value.context.pageLabel,
      boundaryId: value.context.boundaryId,
      boundaryLabel: value.context.boundaryLabel,
      viewport: value.context.viewport,
    },
    ownership: {
      captureOwner: value.context.confirmedBy,
      reviewOwner: "Atlas · Werkelijkheid",
    },
    supportingFiles: [],
    relations: [],
    history: [{
      id: `history-${value.id}-captured`,
      from: null,
      to: "unreviewed",
      at: value.context.confirmedAt,
      actor: value.context.confirmedBy,
      rationale: "Bestaande observatie uit het eerdere lokale capturemodel behouden.",
      confirmedByHuman: false,
    }],
    legacyContext: { caseId: value.context.caseId, sprintId: value.context.sprintId },
  };
}

function persistObservationStore(storage: LocalStorageLike, store: ObservationStore): boolean {
  try {
    storage.setItem(observationStorageKeys.observations, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function loadObservationStore(storage: LocalStorageLike): ObservationStore {
  try {
    const raw = storage.getItem(observationStorageKeys.observations);
    if (!raw) return emptyObservationStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.observations)) return emptyObservationStore();
    const observations = parsed.observations.flatMap((item): Observation[] => {
      if (isObservation(item)) return [item];
      if (isLegacyObservation(item)) return [migrateLegacyObservation(item)];
      return [];
    });
    return { version: 2, observations };
  } catch {
    return emptyObservationStore();
  }
}

export function saveObservation(
  storage: LocalStorageLike,
  draft: ObservationDraft,
  now = new Date(),
  id = `observation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
): Observation | null {
  const text = draft.text.trim();
  if (!text || !isOwnership(draft.ownership) || !isContext(draft.context)) return null;
  if (!isNonEmptyString(draft.source.id) || !isNonEmptyString(draft.source.label) || !isOrigin(draft.source.origin)) return null;
  if (draft.source.kind !== "surface" && draft.source.kind !== "practice-source") return null;
  if (draft.supportingFiles && !draft.supportingFiles.every(isSupportingFile)) return null;

  const timestamp = now.toISOString();
  const observation: Observation = {
    version: 2,
    id,
    text,
    createdAt: timestamp,
    status: "unreviewed",
    source: { ...draft.source, capturedAt: timestamp },
    context: { ...draft.context },
    ownership: { ...draft.ownership },
    supportingFiles: [...(draft.supportingFiles ?? [])],
    relations: [],
    history: [{
      id: `history-${id}-captured`,
      from: null,
      to: "unreviewed",
      at: timestamp,
      actor: draft.ownership.captureOwner,
      rationale: "Observatie bij de bron vastgelegd; betekenis blijft open tot menselijke beoordeling.",
      confirmedByHuman: false,
    }],
  };

  const store = loadObservationStore(storage);
  store.observations.unshift(observation);
  return persistObservationStore(storage, store) ? observation : null;
}

export function reviewObservation(
  storage: LocalStorageLike,
  observationId: string,
  decision: ObservationReviewDecision,
  now = new Date(),
): Observation | null {
  const store = loadObservationStore(storage);
  const observation = store.observations.find((item) => item.id === observationId);
  if (!observation || observation.status !== "unreviewed") return null;
  const actor = decision.reviewedBy.trim();
  const rationale = decision.rationale.trim();
  if (!actor || !rationale) return null;
  if (decision.status === "parked" && !decision.returnTrigger?.trim()) return null;
  if (decision.status === "linked" && !decision.caseId?.trim()) return null;

  const timestamp = now.toISOString();
  observation.status = decision.status;
  observation.returnTrigger = decision.status === "parked" ? decision.returnTrigger!.trim() : undefined;
  observation.history.push({
    id: `history-${observation.id}-${Date.parse(timestamp)}`,
    from: "unreviewed",
    to: decision.status,
    at: timestamp,
    actor,
    rationale,
    confirmedByHuman: true,
  });
  if (decision.status === "linked") {
    observation.relations.push({
      layer: "case",
      targetId: decision.caseId!.trim(),
      linkedAt: timestamp,
      linkedBy: actor,
      rationale,
      confirmedByHuman: true,
    });
  }
  return persistObservationStore(storage, store) ? observation : null;
}

export function reopenObservation(
  storage: LocalStorageLike,
  observationId: string,
  reopenedBy: string,
  rationale: string,
  now = new Date(),
): Observation | null {
  const store = loadObservationStore(storage);
  const observation = store.observations.find((item) => item.id === observationId);
  const actor = reopenedBy.trim();
  const reason = rationale.trim();
  if (!observation || observation.status === "unreviewed" || !actor || !reason) return null;
  const priorStatus = observation.status;
  const timestamp = now.toISOString();
  observation.status = "unreviewed";
  observation.returnTrigger = undefined;
  observation.history.push({
    id: `history-${observation.id}-${Date.parse(timestamp)}`,
    from: priorStatus,
    to: "unreviewed",
    at: timestamp,
    actor,
    rationale: reason,
    confirmedByHuman: true,
  });
  return persistObservationStore(storage, store) ? observation : null;
}

export function linkObservation(
  storage: LocalStorageLike,
  observationId: string,
  input: ObservationLinkInput,
  now = new Date(),
): Observation | null {
  const store = loadObservationStore(storage);
  const observation = store.observations.find((item) => item.id === observationId);
  const targetId = input.targetId.trim();
  const actor = input.linkedBy.trim();
  const rationale = input.rationale.trim();
  if (!observation || !targetId || !actor || !rationale) return null;
  if (observation.status === "unreviewed" || observation.status === "parked" || observation.status === "rejected") return null;
  if (input.layer === "case" && observation.status !== "linked") return null;
  if (input.layer === "knowledge" && observation.status !== "confirmed" && observation.status !== "linked") return null;
  const existing = observation.relations.find((relation) => relation.layer === input.layer && relation.targetId === targetId);
  if (existing) return observation;
  observation.relations.push({
    layer: input.layer,
    targetId,
    linkedAt: now.toISOString(),
    linkedBy: actor,
    rationale,
    confirmedByHuman: true,
  });
  return persistObservationStore(storage, store) ? observation : null;
}

function isObservingContext(value: unknown): value is ObservingContext {
  return isRecord(value)
    && value.version === 2
    && value.active === true
    && isRecord(value.source)
    && isNonEmptyString(value.source.id)
    && isNonEmptyString(value.source.label)
    && isOrigin(value.source.origin)
    && isOwnership(value.ownership)
    && isIsoDate(value.activatedAt);
}

export function loadObservingContext(storage: LocalStorageLike): ObservingContext | null {
  try {
    const raw = storage.getItem(observationStorageKeys.observingContext);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (isObservingContext(value)) return value;
    if (!isRecord(value)
      || value.version !== 1
      || value.active !== true
      || value.caseId !== "0001"
      || value.caseLabel !== "We Build And Design"
      || !isNonEmptyString(value.sprintId)
      || !isIsoDate(value.activatedAt)
      || value.confirmedBy !== "Donovan") return null;
    return {
      version: 2,
      active: true,
      source: { id: "legacy-public-wbd", label: "Publieke WBD-website", origin: "website" },
      ownership: { captureOwner: value.confirmedBy, reviewOwner: "Atlas · Werkelijkheid" },
      activatedAt: value.activatedAt,
      legacyContext: { caseId: value.caseId, sprintId: value.sprintId },
    };
  } catch {
    return null;
  }
}

export function activateObserving(
  storage: LocalStorageLike,
  input: ActivateObservingInput,
  now = new Date(),
): ObservingContext | null {
  if (!isNonEmptyString(input.source.id) || !isNonEmptyString(input.source.label) || !isOrigin(input.source.origin) || !isOwnership(input.ownership)) return null;
  const context: ObservingContext = {
    version: 2,
    active: true,
    source: {
      id: input.source.id.trim(),
      label: input.source.label.trim(),
      origin: input.source.origin,
    },
    ownership: {
      captureOwner: input.ownership.captureOwner.trim(),
      reviewOwner: input.ownership.reviewOwner.trim(),
    },
    activatedAt: now.toISOString(),
  };
  try {
    storage.setItem(observationStorageKeys.observingContext, JSON.stringify(context));
    return context;
  } catch {
    return null;
  }
}

export function deactivateObserving(storage: LocalStorageLike): boolean {
  try {
    storage.removeItem(observationStorageKeys.observingContext);
    return true;
  } catch {
    return false;
  }
}

export function observationStatusLabel(status: ObservationStatus): string {
  return observationStatuses.find((item) => item.id === status)?.label ?? status;
}

export function getBoundary(boundaryId: string) {
  return observationBoundaries.find((boundary) => boundary.id === boundaryId) ?? null;
}
