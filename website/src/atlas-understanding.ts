export const understandingKinds = [
  { id: "source", label: "Bron", plural: "Bronnen", description: "Waar komt deze informatie vandaan?" },
  { id: "observation", label: "Waarneming", plural: "Waarnemingen", description: "Wat is feitelijk gezien, gehoord of gebeurd?" },
  { id: "evidence", label: "Bewijs", plural: "Bewijs", description: "Wat ondersteunt of weerlegt een uitspraak?" },
  { id: "question", label: "Vraag", plural: "Vragen", description: "Welke betere vraag brengt meer begrip?" },
  { id: "assumption", label: "Aanname", plural: "Aannames", description: "Wat denken we, maar weten we nog niet?" },
  { id: "tension", label: "Spanning", plural: "Spanningen", description: "Welke signalen lijken met elkaar te botsen?" },
  { id: "pattern", label: "Patroon", plural: "Patronen in ontwikkeling", description: "Welke samenhang begint zichtbaar te worden?" },
  { id: "unknown", label: "Onbekend", plural: "Onbekenden", description: "Welke onzekerheid moet bewust open blijven?" },
  { id: "insight", label: "Inzicht", plural: "Inzichten", description: "Welke betekenis ontstaat uit herleidbare informatie?" },
  { id: "real-question", label: "Mogelijke werkelijke vraag", plural: "Mogelijke werkelijke vragen", description: "Welke vraag ligt mogelijk achter de eerste vraag?" },
  { id: "next-step", label: "Betekenisvolle volgende stap", plural: "Betekenisvolle volgende stappen", description: "Welke kleine stap wordt door het inzicht gerechtvaardigd?" },
] as const;

export type UnderstandingKind = (typeof understandingKinds)[number]["id"];

export const understandingStatuses = [
  { id: "observed", label: "Waargenomen" },
  { id: "uncertain", label: "Onzeker" },
  { id: "needs-evidence", label: "Bewijs nodig" },
  { id: "emerging", label: "In ontwikkeling" },
  { id: "validated", label: "Bevestigd" },
  { id: "superseded", label: "Vervangen" },
] as const;

export type UnderstandingStatus = (typeof understandingStatuses)[number]["id"];
export type UnderstandingCaseId = "0001" | "0002";
export type UnderstandingVisibility = "internal" | "public";
export type UnderstandingRelationshipType =
  | "supports"
  | "questions"
  | "relates-to"
  | "reveals"
  | "justifies"
  | "supersedes";

export interface UnderstandingItem {
  id: string;
  caseId: UnderstandingCaseId;
  kind: UnderstandingKind;
  text: string;
  sourceLabel: string;
  author: string;
  status: UnderstandingStatus;
  uncertainty: "low" | "medium" | "high";
  visibility: UnderstandingVisibility;
  createdAt: string;
  updatedAt: string;
}

interface UnderstandingSnapshot {
  text: string;
  kind: UnderstandingKind;
  sourceLabel: string;
  status: UnderstandingStatus;
  uncertainty: UnderstandingItem["uncertainty"];
  visibility: UnderstandingVisibility;
}

export interface UnderstandingRevision {
  id: string;
  itemId: string;
  author: string;
  reason: string;
  createdAt: string;
  before: UnderstandingSnapshot;
  after: UnderstandingSnapshot;
}

export interface UnderstandingRelationship {
  id: string;
  caseId: UnderstandingCaseId;
  fromId: string;
  toId: string;
  type: UnderstandingRelationshipType;
  createdAt: string;
  confirmedByHuman: true;
}

export interface UnderstandingStore {
  version: 1;
  items: UnderstandingItem[];
  relationships: UnderstandingRelationship[];
  revisions: UnderstandingRevision[];
}

export interface UnderstandingLoadResult {
  value: UnderstandingStore;
  warning: string;
}

export interface AddUnderstandingItemInput {
  id?: string;
  caseId: UnderstandingCaseId;
  kind: UnderstandingKind;
  text: string;
  sourceLabel?: string;
  author?: string;
  status?: UnderstandingStatus;
  uncertainty?: UnderstandingItem["uncertainty"];
  visibility?: UnderstandingVisibility;
  createdAt?: string;
}

export interface ReviseUnderstandingItemInput {
  text?: string;
  kind?: UnderstandingKind;
  sourceLabel?: string;
  status?: UnderstandingStatus;
  uncertainty?: UnderstandingItem["uncertainty"];
  visibility?: UnderstandingVisibility;
  author?: string;
  reason?: string;
  createdAt?: string;
}

export const understandingStorageKey = "atlas.workspace.understanding.v1";

export const understandingMethod = {
  phase: "Understanding",
  publicTruth: "Een eerste antwoord is niet automatisch de werkelijke vraag.",
  publicQuestion: "Wat moet er eerst helder worden voordat bouwen betekenis krijgt?",
  lineage: ["Bron", "Waarneming", "Vraag", "Patroon", "Inzicht", "Werkelijke vraag", "Volgende stap"],
} as const;

const kindIds = new Set<string>(understandingKinds.map((kind) => kind.id));
const statusIds = new Set<string>(understandingStatuses.map((status) => status.id));
const relationshipTypes = new Set<UnderstandingRelationshipType>([
  "supports",
  "questions",
  "relates-to",
  "reveals",
  "justifies",
  "supersedes",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCaseId = (value: unknown): value is UnderstandingCaseId => value === "0001" || value === "0002";
const isKind = (value: unknown): value is UnderstandingKind => typeof value === "string" && kindIds.has(value);
const isStatus = (value: unknown): value is UnderstandingStatus => typeof value === "string" && statusIds.has(value);
const isUncertainty = (value: unknown): value is UnderstandingItem["uncertainty"] =>
  value === "low" || value === "medium" || value === "high";
const isVisibility = (value: unknown): value is UnderstandingVisibility => value === "internal" || value === "public";

const isItem = (value: unknown): value is UnderstandingItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isCaseId(value.caseId) &&
  isKind(value.kind) &&
  typeof value.text === "string" && value.text.trim().length > 0 && value.text.length <= 1600 &&
  typeof value.sourceLabel === "string" && value.sourceLabel.length <= 240 &&
  typeof value.author === "string" && value.author.length <= 120 &&
  isStatus(value.status) &&
  isUncertainty(value.uncertainty) &&
  isVisibility(value.visibility) &&
  typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) &&
  typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt));

const isSnapshot = (value: unknown): value is UnderstandingSnapshot =>
  isRecord(value) &&
  typeof value.text === "string" &&
  isKind(value.kind) &&
  typeof value.sourceLabel === "string" &&
  isStatus(value.status) &&
  isUncertainty(value.uncertainty) &&
  isVisibility(value.visibility);

const isRevision = (value: unknown): value is UnderstandingRevision =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.itemId === "string" &&
  typeof value.author === "string" &&
  typeof value.reason === "string" &&
  typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) &&
  isSnapshot(value.before) &&
  isSnapshot(value.after);

const isRelationship = (value: unknown): value is UnderstandingRelationship =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isCaseId(value.caseId) &&
  typeof value.fromId === "string" &&
  typeof value.toId === "string" &&
  typeof value.type === "string" && relationshipTypes.has(value.type as UnderstandingRelationshipType) &&
  typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) &&
  value.confirmedByHuman === true;

export function isUnderstandingStore(value: unknown): value is UnderstandingStore {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items) || !Array.isArray(value.relationships) || !Array.isArray(value.revisions)) return false;
  if (!value.items.every(isItem) || !value.relationships.every(isRelationship) || !value.revisions.every(isRevision)) return false;

  const items = new Map(value.items.map((item) => [item.id, item]));
  return value.relationships.every((relationship) => {
    const from = items.get(relationship.fromId);
    const to = items.get(relationship.toId);
    return Boolean(from && to && from.caseId === relationship.caseId && to.caseId === relationship.caseId);
  }) && value.revisions.every((revision) => items.has(revision.itemId));
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function snapshot(item: UnderstandingItem): UnderstandingSnapshot {
  return {
    text: item.text,
    kind: item.kind,
    sourceLabel: item.sourceLabel,
    status: item.status,
    uncertainty: item.uncertainty,
    visibility: item.visibility,
  };
}

export function createInitialUnderstandingStore(): UnderstandingStore {
  const createdAt = "2026-07-20T18:06:30.000Z";
  return {
    version: 1,
    items: [
      {
        id: "u-0001-foundation",
        caseId: "0001",
        kind: "source",
        text: "Foundation.md is de canonieke bron voor de missie, methode, principes en creatieve taal van Atlas.",
        sourceLabel: "Foundation.md — Status en gebruik",
        author: "Atlas repository",
        status: "validated",
        uncertainty: "low",
        visibility: "internal",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "u-0001-local-workspace",
        caseId: "0001",
        kind: "observation",
        text: "De huidige Workspace bewaart focus, AquaFlask, ideeën en logboek lokaal in één browser.",
        sourceLabel: "website/src/atlas-workspace-data.ts",
        author: "Atlas repository",
        status: "validated",
        uncertainty: "low",
        visibility: "internal",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "u-0001-use-question",
        caseId: "0001",
        kind: "question",
        text: "Welke onderdelen van de Workspace helpen Donovan tijdens echt gebruik aantoonbaar beter denken?",
        sourceLabel: "Sprint 001 — eerstvolgende toets",
        author: "Atlas repository",
        status: "needs-evidence",
        uncertainty: "high",
        visibility: "internal",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    relationships: [
      {
        id: "ur-0001-foundation-workspace",
        caseId: "0001",
        fromId: "u-0001-foundation",
        toId: "u-0001-local-workspace",
        type: "supports",
        createdAt,
        confirmedByHuman: true,
      },
      {
        id: "ur-0001-workspace-question",
        caseId: "0001",
        fromId: "u-0001-local-workspace",
        toId: "u-0001-use-question",
        type: "questions",
        createdAt,
        confirmedByHuman: true,
      },
    ],
    revisions: [],
  };
}

export function loadUnderstanding(storage: Storage): UnderstandingLoadResult {
  try {
    const raw = storage.getItem(understandingStorageKey);
    if (!raw) return { value: createInitialUnderstandingStore(), warning: "" };
    const parsed: unknown = JSON.parse(raw);
    return isUnderstandingStore(parsed)
      ? { value: parsed, warning: "" }
      : { value: createInitialUnderstandingStore(), warning: "Opgeslagen Understanding-data was ongeldig en is veilig overgeslagen." };
  } catch {
    return { value: createInitialUnderstandingStore(), warning: "Understanding-data kon niet worden gelezen. Je werkt met een veilige versie." };
  }
}

export function saveUnderstanding(storage: Storage, store: UnderstandingStore): boolean {
  if (!isUnderstandingStore(store)) return false;
  try {
    storage.setItem(understandingStorageKey, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function addUnderstandingItem(store: UnderstandingStore, input: AddUnderstandingItemInput): UnderstandingItem {
  const text = input.text.trim();
  if (!text) throw new Error("Understanding-item requires text.");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const item: UnderstandingItem = {
    id: input.id ?? id("understanding"),
    caseId: input.caseId,
    kind: input.kind,
    text,
    sourceLabel: input.sourceLabel?.trim() ?? "",
    author: input.author?.trim() || "Donovan",
    status: input.status ?? (input.kind === "observation" || input.kind === "source" ? "observed" : "uncertain"),
    uncertainty: input.uncertainty ?? "medium",
    visibility: input.visibility ?? "internal",
    createdAt,
    updatedAt: createdAt,
  };
  if (store.items.some((existing) => existing.id === item.id)) throw new Error(`Duplicate Understanding item: ${item.id}`);
  store.items.push(item);
  return item;
}

export function relateUnderstandingItems(
  store: UnderstandingStore,
  fromId: string,
  toId: string,
  type: UnderstandingRelationshipType,
  createdAt = new Date().toISOString(),
): UnderstandingRelationship {
  const from = store.items.find((item) => item.id === fromId);
  const to = store.items.find((item) => item.id === toId);
  if (!from || !to || from.caseId !== to.caseId || from.id === to.id) throw new Error("Understanding relationship requires two items in the same case.");
  const existing = store.relationships.find((relationship) => relationship.fromId === fromId && relationship.toId === toId && relationship.type === type);
  if (existing) return existing;
  const relationship: UnderstandingRelationship = {
    id: id("relationship"),
    caseId: from.caseId,
    fromId,
    toId,
    type,
    createdAt,
    confirmedByHuman: true,
  };
  store.relationships.push(relationship);
  return relationship;
}

export function reviseUnderstandingItem(store: UnderstandingStore, itemId: string, changes: ReviseUnderstandingItemInput): UnderstandingRevision {
  const item = store.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Unknown Understanding item: ${itemId}`);
  const before = snapshot(item);
  const createdAt = changes.createdAt ?? new Date().toISOString();
  if (changes.text !== undefined && changes.text.trim()) item.text = changes.text.trim();
  if (changes.kind !== undefined) item.kind = changes.kind;
  if (changes.sourceLabel !== undefined) item.sourceLabel = changes.sourceLabel.trim();
  if (changes.status !== undefined) item.status = changes.status;
  if (changes.uncertainty !== undefined) item.uncertainty = changes.uncertainty;
  if (changes.visibility !== undefined) item.visibility = changes.visibility;
  item.updatedAt = createdAt;
  const revision: UnderstandingRevision = {
    id: id("revision"),
    itemId,
    author: changes.author?.trim() || "Donovan",
    reason: changes.reason?.trim() || "Interpretatie verfijnd",
    createdAt,
    before,
    after: snapshot(item),
  };
  store.revisions.push(revision);
  return revision;
}

export function createInsight(
  store: UnderstandingStore,
  caseId: UnderstandingCaseId,
  text: string,
  sourceIds: string[],
  createdAt?: string,
): UnderstandingItem {
  const validSources = [...new Set(sourceIds)].filter((sourceId) => store.items.some((item) => item.id === sourceId && item.caseId === caseId));
  if (!validSources.length) throw new Error("An insight requires at least one traceable source item.");
  const insight = addUnderstandingItem(store, {
    caseId,
    kind: "insight",
    text,
    status: "emerging",
    uncertainty: "medium",
    createdAt,
  });
  validSources.forEach((sourceId) => relateUnderstandingItems(store, sourceId, insight.id, "reveals", insight.createdAt));
  return insight;
}

export function createNextStep(
  store: UnderstandingStore,
  insightId: string,
  text: string,
  createdAt?: string,
): UnderstandingItem {
  const insight = store.items.find((item) => item.id === insightId && item.kind === "insight");
  if (!insight) throw new Error("A meaningful next step requires a traceable insight.");
  const nextStep = addUnderstandingItem(store, {
    caseId: insight.caseId,
    kind: "next-step",
    text,
    status: "emerging",
    uncertainty: "medium",
    createdAt,
  });
  relateUnderstandingItems(store, insight.id, nextStep.id, "justifies", nextStep.createdAt);
  return nextStep;
}

export function getUnderstandingLineage(store: UnderstandingStore, itemId: string): UnderstandingItem[] {
  const visited = new Set<string>();
  const ordered: UnderstandingItem[] = [];
  const visit = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    store.relationships.filter((relationship) => relationship.toId === currentId).forEach((relationship) => visit(relationship.fromId));
    const item = store.items.find((candidate) => candidate.id === currentId);
    if (item) ordered.push(item);
  };
  visit(itemId);
  return ordered;
}

export function reviewUnderstanding(store: UnderstandingStore, caseId: UnderstandingCaseId) {
  const items = store.items.filter((item) => item.caseId === caseId && item.status !== "superseded");
  const evidenceIds = new Set(items.filter((item) => item.kind === "evidence").map((item) => item.id));
  const supportedTargets = new Set(
    store.relationships
      .filter((relationship) => relationship.caseId === caseId && relationship.type === "supports" && evidenceIds.has(relationship.fromId))
      .map((relationship) => relationship.toId),
  );
  return {
    openQuestions: items.filter((item) => item.kind === "question" && item.status !== "validated"),
    needsEvidence: items.filter((item) => (item.kind === "assumption" || item.status === "needs-evidence") && !supportedTargets.has(item.id)),
    tensions: items.filter((item) => item.kind === "tension"),
    emergingPatterns: items.filter((item) => item.kind === "pattern" && item.status === "emerging"),
  };
}

export function understandingRecommendation(store: UnderstandingStore, caseId: UnderstandingCaseId): { title: string; reason: string } {
  const items = store.items
    .filter((item) => item.caseId === caseId && item.status !== "superseded")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const nextStep = items.find((item) => item.kind === "next-step");
  if (nextStep) {
    return {
      title: `Begin met: ${nextStep.text}`,
      reason: "Dit is de meest recente betekenisvolle stap die door een herleidbaar inzicht wordt gedragen.",
    };
  }
  const insight = items.find((item) => item.kind === "insight");
  if (insight) {
    return {
      title: insight.text,
      reason: "Dit is het sterkste huidige inzicht. Een volgende stap verdient pas ruimte wanneer dit inzicht haar rechtvaardigt.",
    };
  }
  const openQuestion = reviewUnderstanding(store, caseId).openQuestions[0];
  if (openQuestion) {
    return {
      title: "Vorm nog geen conclusie.",
      reason: `Atlas ziet waar het begrip stopt. Eerst is bewijs nodig voor deze vraag: ${openQuestion.text}`,
    };
  }
  if (caseId === "0002" && items.length === 0) {
    return {
      title: "Laat AquaFlask vandaag bewust open.",
      reason: "Het bekende beeld staat en het risico is begrensd. Zonder concrete herhaling is geen aanvullende conclusie of wijziging gerechtvaardigd.",
    };
  }
  return {
    title: "Bewaar het bekende beeld; voeg nu niets toe.",
    reason: items.length
      ? "Er is materiaal, maar nog geen herleidbaar inzicht dat een nieuwe conclusie of stap rechtvaardigt."
      : "Er is nog geen bevestigd materiaal voor een verantwoord oordeel.",
  };
}

export function kindLabel(kind: UnderstandingKind): string {
  return understandingKinds.find((entry) => entry.id === kind)?.label ?? kind;
}

export function statusLabel(status: UnderstandingStatus): string {
  return understandingStatuses.find((entry) => entry.id === status)?.label ?? status;
}
