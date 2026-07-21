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

export interface ObservingContext {
  version: 1;
  active: true;
  caseId: "0001";
  caseLabel: "We Build And Design";
  sprintId: string;
  activatedAt: string;
  confirmedBy: "Donovan";
}

export interface Observation {
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

export interface ObservationStore {
  version: 1;
  observations: Observation[];
}

export interface ObservationDraft {
  text: string;
  context: Omit<Observation["context"], "confirmedAt" | "confirmedBy">;
}

type LocalStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const emptyObservationStore = (): ObservationStore => ({ version: 1, observations: [] });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isBoundaryId(value: unknown): value is ObservationBoundaryId {
  return observationBoundaries.some((boundary) => boundary.id === value);
}

function isViewport(value: unknown): value is Observation["context"]["viewport"] {
  return isRecord(value)
    && Number.isInteger(value.width) && Number(value.width) > 0
    && Number.isInteger(value.height) && Number(value.height) > 0;
}

function isObservation(value: unknown): value is Observation {
  if (!isRecord(value) || value.version !== 1 || value.status !== "unreviewed") return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.text) || !isIsoDate(value.createdAt)) return false;
  const context = value.context;
  const boundary = isRecord(context) && isBoundaryId(context.boundaryId)
    ? observationBoundaries.find((item) => item.id === context.boundaryId)
    : null;
  return isRecord(context)
    && (context.surface === "public" || context.surface === "workspace")
    && typeof context.path === "string"
    && typeof context.hash === "string"
    && isNonEmptyString(context.pageId)
    && isNonEmptyString(context.pageLabel)
    && Boolean(boundary)
    && context.path === boundary?.path
    && context.hash === boundary?.hash
    && context.boundaryLabel === boundary?.label
    && context.caseId === "0001"
    && isNonEmptyString(context.sprintId)
    && isViewport(context.viewport)
    && isIsoDate(context.confirmedAt)
    && context.confirmedBy === "Donovan";
}

export function loadObservationStore(storage: LocalStorageLike): ObservationStore {
  try {
    const raw = storage.getItem(observationStorageKeys.observations);
    if (!raw) return emptyObservationStore();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.observations)) return emptyObservationStore();
    return { version: 1, observations: parsed.observations.filter(isObservation) };
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
  const boundary = observationBoundaries.find((item) => item.id === draft.context.boundaryId);
  if (!text || !boundary || !isNonEmptyString(draft.context.sprintId) || !isViewport(draft.context.viewport)) return null;

  const timestamp = now.toISOString();
  const observation: Observation = {
    version: 1,
    id,
    text,
    createdAt: timestamp,
    status: "unreviewed",
    context: {
      ...draft.context,
      boundaryLabel: boundary.label,
      sprintId: draft.context.sprintId.trim(),
      confirmedAt: timestamp,
      confirmedBy: "Donovan",
    },
  };

  try {
    const store = loadObservationStore(storage);
    storage.setItem(observationStorageKeys.observations, JSON.stringify({
      version: 1,
      observations: [observation, ...store.observations],
    } satisfies ObservationStore));
    return observation;
  } catch {
    return null;
  }
}

export function loadObservingContext(storage: LocalStorageLike): ObservingContext | null {
  try {
    const raw = storage.getItem(observationStorageKeys.observingContext);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)
      || value.version !== 1
      || value.active !== true
      || value.caseId !== "0001"
      || value.caseLabel !== "We Build And Design"
      || !isNonEmptyString(value.sprintId)
      || !isIsoDate(value.activatedAt)
      || value.confirmedBy !== "Donovan") return null;
    return value as unknown as ObservingContext;
  } catch {
    return null;
  }
}

export function activateObserving(
  storage: LocalStorageLike,
  sprintId: string,
  now = new Date(),
): ObservingContext | null {
  const cleanSprintId = sprintId.trim();
  if (!cleanSprintId) return null;
  const context: ObservingContext = {
    version: 1,
    active: true,
    caseId: "0001",
    caseLabel: "We Build And Design",
    sprintId: cleanSprintId,
    activatedAt: now.toISOString(),
    confirmedBy: "Donovan",
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

export function getBoundary(boundaryId: string) {
  return observationBoundaries.find((boundary) => boundary.id === boundaryId) ?? null;
}
