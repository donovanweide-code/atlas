export const knowledgeProposalStatuses = ["Nieuw", "Goedgekeurd", "Afgewezen"] as const;
export const knowledgeProposalSources = ["Chat", "Codex", "Handmatig"] as const;
export const knowledgeCategories = [
  "Knowledge",
  "Product Principles",
  "Design Principles",
  "Workflow Principles",
  "Architecture",
  "Cases",
  "Ideas",
] as const;

export type KnowledgeProposalStatus = typeof knowledgeProposalStatuses[number];
export type KnowledgeProposalSource = typeof knowledgeProposalSources[number];
export type KnowledgeCategory = typeof knowledgeCategories[number];

export interface KnowledgeProposal {
  id: string;
  title: string;
  summary: string;
  importance: string;
  category: KnowledgeCategory;
  source: KnowledgeProposalSource;
  capturedAt: string;
  status: KnowledgeProposalStatus;
  comments: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface KnowledgeEntry {
  id: string;
  sourceProposalId: string;
  title: string;
  summary: string;
  importance: string;
  category: KnowledgeCategory;
  source: KnowledgeProposalSource;
  status: "Goedgekeurd";
  capturedAt: string;
  comments: string;
  approvedAt: string;
}

export interface KnowledgeProposalInput {
  title: string;
  summary: string;
  importance: string;
  category: KnowledgeCategory;
  source: KnowledgeProposalSource;
  capturedAt: string;
  comments?: string;
}

export interface KnowledgeProposalUpdate extends KnowledgeProposalInput {}

const databaseName = "atlas-wbd-knowledge-v1";
const databaseVersion = 1;
const stores = {
  proposals: "proposals",
  knowledgeEntries: "knowledgeEntries",
} as const;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("De lokale kennisopslag reageert niet.")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("De lokale kenniswijziging is afgebroken.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("De lokale kenniswijziging is mislukt.")), { once: true });
  });
}

function createId(prefix: string): string {
  const randomPart = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function required(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is verplicht.`);
  if (normalized.length > maximum) throw new Error(`${label} mag maximaal ${maximum} tekens bevatten.`);
  return normalized;
}

function optional(value: string | undefined, maximum: number): string {
  const normalized = value?.trim() ?? "";
  if (normalized.length > maximum) throw new Error(`Opmerkingen mogen maximaal ${maximum} tekens bevatten.`);
  return normalized;
}

function normalizeDate(value: string): string {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error("Datum is verplicht en moet geldig zijn.");
  return new Date(value).toISOString();
}

export function normalizeKnowledgeProposalInput(input: KnowledgeProposalInput): KnowledgeProposalInput {
  if (!knowledgeCategories.includes(input.category)) throw new Error("Kies een geldige kenniscategorie.");
  if (!knowledgeProposalSources.includes(input.source)) throw new Error("Kies een geldige bron.");
  return {
    title: required(input.title, "Titel", 120),
    summary: required(input.summary, "Korte samenvatting", 500),
    importance: required(input.importance, "Waarom dit belangrijk is", 700),
    category: input.category,
    source: input.source,
    capturedAt: normalizeDate(input.capturedAt),
    comments: optional(input.comments, 1200),
  };
}

export function createKnowledgeProposal(
  input: KnowledgeProposalInput,
  now = new Date(),
  id = createId("proposal"),
): KnowledgeProposal {
  const normalized = normalizeKnowledgeProposalInput(input);
  const timestamp = now.toISOString();
  return {
    id,
    ...normalized,
    comments: normalized.comments ?? "",
    status: "Nieuw",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function proposalToKnowledgeEntry(
  proposal: KnowledgeProposal,
  approvedAt = new Date(),
): KnowledgeEntry {
  return {
    id: `knowledge-${proposal.id}`,
    sourceProposalId: proposal.id,
    title: proposal.title,
    summary: proposal.summary,
    importance: proposal.importance,
    category: proposal.category,
    source: proposal.source,
    status: "Goedgekeurd",
    capturedAt: proposal.capturedAt,
    comments: proposal.comments,
    approvedAt: approvedAt.toISOString(),
  };
}

export function newestKnowledgeFirst<T extends { updatedAt?: string; approvedAt?: string; capturedAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const leftDate = left.updatedAt ?? left.approvedAt ?? left.capturedAt;
    const rightDate = right.updatedAt ?? right.approvedAt ?? right.capturedAt;
    return Date.parse(rightDate) - Date.parse(leftDate);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(databaseName, databaseVersion);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(stores.proposals)) {
      database.createObjectStore(stores.proposals, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains(stores.knowledgeEntries)) {
      database.createObjectStore(stores.knowledgeEntries, { keyPath: "id" });
    }
  });
  return requestToPromise(request);
}

export class WbdKnowledgeRepository {
  async listProposals(): Promise<KnowledgeProposal[]> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.proposals, "readonly");
      const proposals = await requestToPromise(transaction.objectStore(stores.proposals).getAll()) as KnowledgeProposal[];
      await transactionDone(transaction);
      return newestKnowledgeFirst(proposals);
    } finally {
      database.close();
    }
  }

  async getProposal(id: string): Promise<KnowledgeProposal | undefined> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.proposals, "readonly");
      const proposal = await requestToPromise(transaction.objectStore(stores.proposals).get(id)) as KnowledgeProposal | undefined;
      await transactionDone(transaction);
      return proposal;
    } finally {
      database.close();
    }
  }

  async addProposal(input: KnowledgeProposalInput): Promise<KnowledgeProposal> {
    const proposal = createKnowledgeProposal(input);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.proposals, "readwrite");
      transaction.objectStore(stores.proposals).add(proposal);
      await transactionDone(transaction);
      return proposal;
    } finally {
      database.close();
    }
  }

  async updateProposal(id: string, input: KnowledgeProposalUpdate): Promise<KnowledgeProposal> {
    const normalized = normalizeKnowledgeProposalInput(input);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.proposals, "readwrite");
      const store = transaction.objectStore(stores.proposals);
      const existing = await requestToPromise(store.get(id)) as KnowledgeProposal | undefined;
      if (!existing) {
        transaction.abort();
        throw new Error("Dit kennisvoorstel bestaat niet meer.");
      }
      const updated: KnowledgeProposal = {
        ...existing,
        ...normalized,
        comments: normalized.comments ?? "",
        updatedAt: new Date().toISOString(),
      };
      store.put(updated);
      await transactionDone(transaction);
      return updated;
    } finally {
      database.close();
    }
  }

  async rejectProposal(id: string): Promise<KnowledgeProposal> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.proposals, "readwrite");
      const store = transaction.objectStore(stores.proposals);
      const existing = await requestToPromise(store.get(id)) as KnowledgeProposal | undefined;
      if (!existing) {
        transaction.abort();
        throw new Error("Dit kennisvoorstel bestaat niet meer.");
      }
      const timestamp = new Date().toISOString();
      const rejected: KnowledgeProposal = { ...existing, status: "Afgewezen", reviewedAt: timestamp, updatedAt: timestamp };
      store.put(rejected);
      await transactionDone(transaction);
      return rejected;
    } finally {
      database.close();
    }
  }

  async approveProposal(id: string): Promise<KnowledgeEntry> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction([stores.proposals, stores.knowledgeEntries], "readwrite");
      const proposalStore = transaction.objectStore(stores.proposals);
      const proposal = await requestToPromise(proposalStore.get(id)) as KnowledgeProposal | undefined;
      if (!proposal) {
        transaction.abort();
        throw new Error("Dit kennisvoorstel bestaat niet meer.");
      }
      const knowledgeEntry = proposalToKnowledgeEntry(proposal);
      transaction.objectStore(stores.knowledgeEntries).add(knowledgeEntry);
      proposalStore.delete(id);
      await transactionDone(transaction);
      return knowledgeEntry;
    } finally {
      database.close();
    }
  }

  async listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(stores.knowledgeEntries, "readonly");
      const entries = await requestToPromise(transaction.objectStore(stores.knowledgeEntries).getAll()) as KnowledgeEntry[];
      await transactionDone(transaction);
      return newestKnowledgeFirst(entries);
    } finally {
      database.close();
    }
  }
}

export const wbdKnowledgeRepository = new WbdKnowledgeRepository();
