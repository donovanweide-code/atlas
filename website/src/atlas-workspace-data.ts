export type CaseId = "0001" | "0002" | "";
export type IdeaStatus = "seed" | "growth" | "ready";

export interface FocusItem {
  id: string;
  text: string;
  caseId: CaseId;
  completed: boolean;
}

export interface FocusStore {
  version: 2;
  activeDate: string;
  days: Record<string, FocusItem[]>;
}

export interface AquaFlaskCase {
  version: 1;
  problem: string;
  nextQuestion: string;
  nextStep: string;
  notes: string;
  lessons: string;
  updatedAt: string;
}

export interface Idea {
  id: string;
  title: string;
  status: IdeaStatus;
}

export interface LogEntry {
  id: string;
  text: string;
  date: string;
}

export interface LoadResult<T> {
  value: T;
  warning: string;
}

export const storageKeys = {
  focus: "atlas.workspace.focus.v2",
  aquaFlask: "atlas.workspace.case.0002.v1",
  ideas: "atlas.workspace.ideas.v1",
  log: "atlas.workspace.log.v1",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCaseId = (value: unknown): value is CaseId =>
  value === "" || value === "0001" || value === "0002";

const isFocusItem = (value: unknown): value is FocusItem =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.text === "string" &&
  value.text.trim().length > 0 &&
  value.text.length <= 160 &&
  isCaseId(value.caseId) &&
  typeof value.completed === "boolean";

const isFocusStore = (value: unknown): value is FocusStore => {
  if (!isRecord(value) || value.version !== 2 || typeof value.activeDate !== "string" || !isRecord(value.days)) return false;
  return Object.values(value.days).every(
    (items) => Array.isArray(items) && items.length <= 3 && items.every(isFocusItem),
  );
};

const isAquaFlaskCase = (value: unknown): value is AquaFlaskCase =>
  isRecord(value) &&
  value.version === 1 &&
  typeof value.problem === "string" && value.problem.length <= 1200 &&
  typeof value.nextQuestion === "string" && value.nextQuestion.length <= 240 &&
  typeof value.nextStep === "string" && value.nextStep.length <= 240 &&
  typeof value.notes === "string" && value.notes.length <= 2400 &&
  typeof value.lessons === "string" && value.lessons.length <= 1600 &&
  typeof value.updatedAt === "string" &&
  (value.updatedAt === "" || !Number.isNaN(Date.parse(value.updatedAt)));

const isIdea = (value: unknown): value is Idea =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  value.title.trim().length > 0 &&
  (value.status === "seed" || value.status === "growth" || value.status === "ready");

const isLogEntry = (value: unknown): value is LogEntry =>
  isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.date === "string";

function load<T>(storage: Storage, key: string, fallback: T, validate: (value: unknown) => value is T): LoadResult<T> {
  try {
    const raw = storage.getItem(key);
    if (!raw) return { value: fallback, warning: "" };
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed)
      ? { value: parsed, warning: "" }
      : { value: fallback, warning: "Opgeslagen Atlas-data was ongeldig en is veilig overgeslagen." };
  } catch {
    return { value: fallback, warning: "Lokale Atlas-data kon niet worden gelezen. Je werkt met een veilige lege versie." };
  }
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function loadFocus(storage: Storage, today: string): LoadResult<FocusStore> {
  return load(storage, storageKeys.focus, { version: 2, activeDate: today, days: { [today]: [] } }, isFocusStore);
}

export function loadAquaFlask(storage: Storage): LoadResult<AquaFlaskCase> {
  return load(storage, storageKeys.aquaFlask, {
    version: 1,
    problem: "",
    nextQuestion: "Welke verandering heeft AquaFlask nu werkelijk nodig?",
    nextStep: "Plan een gesprek om doel, context en probleem in de woorden van AquaFlask vast te leggen.",
    notes: "",
    lessons: "",
    updatedAt: "",
  }, isAquaFlaskCase);
}

export function loadIdeas(storage: Storage): LoadResult<Idea[]> {
  const result = load(storage, storageKeys.ideas, [], (value): value is Idea[] => Array.isArray(value) && value.every(isIdea));
  const oldDefaults = new Set(["audit", "portal", "assistant"]);
  return { ...result, value: result.value.filter((idea) => !oldDefaults.has(idea.id)) };
}

export function loadLogs(storage: Storage): LoadResult<LogEntry[]> {
  return load(storage, storageKeys.log, [], (value): value is LogEntry[] => Array.isArray(value) && value.every(isLogEntry));
}

export function save(storage: Storage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
