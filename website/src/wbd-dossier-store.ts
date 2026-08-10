export type OrganizationType = "eigen organisatie" | "ontwikkelpartner" | "klant" | "pilot";
export type DocumentType = "offerte" | "overeenkomst" | "huisstijl" | "afbeelding" | "overig";
export type ContactNoteType = "telefoon" | "e-mail" | "gesprek" | "interne notitie";
export type TimelineEventType = "document_added" | "document_removed" | "contact_note_added";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DossierDocument {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  createdAt: string;
  originalFileName: string;
  sizeBytes: number;
  mimeType: string;
  file: Blob;
}

export interface ContactNote {
  id: string;
  organizationId: string;
  type: ContactNoteType;
  title: string;
  content: string;
  occurredAt: string;
  contactPerson?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  organizationId: string;
  type: TimelineEventType;
  occurredAt: string;
  description: string;
  source: "handmatig";
  documentId?: string;
  contactNoteId?: string;
}

export interface OrganizationDossier {
  organization: Organization;
  documents: DossierDocument[];
  contactNotes: ContactNote[];
  timelineEvents: TimelineEvent[];
}

export interface WbdDossierData {
  organizations: Organization[];
  documents: DossierDocument[];
  contactNotes: ContactNote[];
  timelineEvents: TimelineEvent[];
}

export type RestoreMode = "merge" | "replace";

export interface RestoreItemCounts {
  organizations: number;
  documents: number;
  contactNotes: number;
  timelineEvents: number;
  total: number;
}

export interface RestoreHistoryEntry {
  id: string;
  restoredAt: string;
  backupExportedAt: string;
  mode: RestoreMode;
  imported: RestoreItemCounts;
  skipped: RestoreItemCounts;
  conflicts: RestoreItemCounts;
  source: "lokale back-up";
}

export interface RestoreContext {
  mode: RestoreMode;
  backupExportedAt: string;
}

export interface RestoreResult {
  imported: RestoreItemCounts;
  skipped: RestoreItemCounts;
  conflicts: RestoreItemCounts;
  history: RestoreHistoryEntry;
}

export interface NewDocumentInput {
  organizationId: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  file: File;
}

export interface NewContactNoteInput {
  organizationId: string;
  type: ContactNoteType;
  title: string;
  content: string;
  occurredAt: string;
  contactPerson?: string;
}

export interface WbdDossierRepository {
  listOrganizations(): Promise<Organization[]>;
  getDossier(organizationId: string): Promise<OrganizationDossier | undefined>;
  addDocument(input: NewDocumentInput): Promise<DossierDocument>;
  removeDocument(documentId: string): Promise<void>;
  addContactNote(input: NewContactNoteInput): Promise<ContactNote>;
  removeContactNote(contactNoteId: string): Promise<void>;
  readAllData(): Promise<WbdDossierData>;
  listRestoreHistory(): Promise<RestoreHistoryEntry[]>;
  restoreData(data: WbdDossierData, context: RestoreContext): Promise<RestoreResult>;
}

const initialDate = "2026-08-02T09:00:00.000Z";

export const initialOrganizations: readonly Organization[] = [
  {
    id: "we-build-and-design",
    name: "We Build And Design",
    type: "eigen organisatie",
    description: "De eigen organisatie en de plek waar merk, werk en bedrijfsvoering samenkomen.",
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  {
    id: "sportpaleis",
    name: "Sport 2000 Sportpaleis B.V.",
    type: "ontwikkelpartner",
    description: "Eerste officiële ontwikkelpartner voor ontwikkeling en praktijkvalidatie van de Sportpaleis Workspace en bedrukkingsmodule.",
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  {
    id: "bij-cees",
    name: "Bij Cees",
    type: "pilot",
    description: "Een vroege praktijkcase waarin organisatiecontext rustig kan worden opgebouwd.",
    createdAt: initialDate,
    updatedAt: initialDate,
  },
  {
    id: "aquaflask",
    name: "AquaFlask",
    type: "pilot",
    description: "Pilotdossier voor merk- en productcontext die later verder kan groeien.",
    createdAt: initialDate,
    updatedAt: initialDate,
  },
] as const;

export function newestFirst<T extends { occurredAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

const databaseName = "atlas-wbd-dossier-v1";
const databaseVersion = 2;
const stores = {
  organizations: "organizations",
  documents: "documents",
  contactNotes: "contactNotes",
  timelineEvents: "timelineEvents",
  restoreHistory: "restoreHistory",
} as const;

const dossierStoreNames = [
  stores.organizations,
  stores.documents,
  stores.contactNotes,
  stores.timelineEvents,
] as const;

function emptyCounts(): RestoreItemCounts {
  return { organizations: 0, documents: 0, contactNotes: 0, timelineEvents: 0, total: 0 };
}

function dataCounts(data: WbdDossierData): RestoreItemCounts {
  const counts = {
    organizations: data.organizations.length,
    documents: data.documents.length,
    contactNotes: data.contactNotes.length,
    timelineEvents: data.timelineEvents.length,
    total: 0,
  };
  counts.total = counts.organizations + counts.documents + counts.contactNotes + counts.timelineEvents;
  return counts;
}

function sameRecord<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function sameDocument(left: DossierDocument, right: DossierDocument): Promise<boolean> {
  const { file: leftFile, ...leftMetadata } = left;
  const { file: rightFile, ...rightMetadata } = right;
  if (!sameRecord(leftMetadata, rightMetadata) || leftFile.size !== rightFile.size || leftFile.type !== rightFile.type) return false;
  const [leftBytes, rightBytes] = await Promise.all([leftFile.arrayBuffer(), rightFile.arrayBuffer()]);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  const leftView = new Uint8Array(leftBytes);
  const rightView = new Uint8Array(rightBytes);
  return leftView.every((value, index) => value === rightView[index]);
}

interface MergePlan<T> {
  additions: T[];
  skipped: number;
  conflicts: number;
}

async function planRecords<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
  equal: (left: T, right: T) => boolean | Promise<boolean> = sameRecord,
): Promise<MergePlan<T>> {
  const existingById = new Map(existing.map((record) => [record.id, record]));
  const additions: T[] = [];
  let skipped = 0;
  let conflicts = 0;
  for (const record of incoming) {
    const current = existingById.get(record.id);
    if (!current) additions.push(record);
    else if (await equal(current, record)) skipped += 1;
    else conflicts += 1;
  }
  return { additions, skipped, conflicts };
}

export async function planDossierMerge(existing: WbdDossierData, incoming: WbdDossierData): Promise<{
  additions: WbdDossierData;
  skipped: RestoreItemCounts;
  conflicts: RestoreItemCounts;
}> {
  const [organizations, documents, contactNotes, timelineEvents] = await Promise.all([
    planRecords(existing.organizations, incoming.organizations),
    planRecords(existing.documents, incoming.documents, sameDocument),
    planRecords(existing.contactNotes, incoming.contactNotes),
    planRecords(existing.timelineEvents, incoming.timelineEvents),
  ]);
  const additions = {
    organizations: organizations.additions,
    documents: documents.additions,
    contactNotes: contactNotes.additions,
    timelineEvents: timelineEvents.additions,
  };
  const skipped = {
    organizations: organizations.skipped,
    documents: documents.skipped,
    contactNotes: contactNotes.skipped,
    timelineEvents: timelineEvents.skipped,
    total: organizations.skipped + documents.skipped + contactNotes.skipped + timelineEvents.skipped,
  };
  const conflicts = {
    organizations: organizations.conflicts,
    documents: documents.conflicts,
    contactNotes: contactNotes.conflicts,
    timelineEvents: timelineEvents.conflicts,
    total: organizations.conflicts + documents.conflicts + contactNotes.conflicts + timelineEvents.conflicts,
  };
  return { additions, skipped, conflicts };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Lokale opslag kon niet worden gelezen.")), { once: true });
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("Lokale opslagactie is afgebroken.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Lokale opslagactie is mislukt.")), { once: true });
  });
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export class IndexedDbWbdDossierRepository implements WbdDossierRepository {
  private databasePromise?: Promise<IDBDatabase>;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        for (const storeName of Object.values(stores)) {
          if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName, { keyPath: "id" });
          }
        }
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB kon niet worden geopend.")), { once: true });
    });

    return this.databasePromise;
  }

  private async seedOrganizations(database: IDBDatabase): Promise<void> {
    const transaction = database.transaction(stores.organizations, "readwrite");
    const store = transaction.objectStore(stores.organizations);
    for (const organization of initialOrganizations) {
      const existing = await requestResult(store.get(organization.id));
      if (!existing) {
        store.add({ ...organization });
      } else if (organization.id === "sportpaleis" && existing.name === "Sportpaleis" && existing.type === "klant") {
        store.put({ ...organization, createdAt: existing.createdAt });
      }
    }
    await transactionDone(transaction);
  }

  private async database(): Promise<IDBDatabase> {
    const database = await this.openDatabase();
    await this.seedOrganizations(database);
    return database;
  }

  async listOrganizations(): Promise<Organization[]> {
    const database = await this.database();
    const transaction = database.transaction(stores.organizations, "readonly");
    const organizations = await requestResult(transaction.objectStore(stores.organizations).getAll()) as Organization[];
    await transactionDone(transaction);
    return organizations.sort((left, right) => left.name.localeCompare(right.name, "nl"));
  }

  async getDossier(organizationId: string): Promise<OrganizationDossier | undefined> {
    const database = await this.database();
    const transaction = database.transaction(Object.values(stores), "readonly");
    const [organization, documents, contactNotes, timelineEvents] = await Promise.all([
      requestResult(transaction.objectStore(stores.organizations).get(organizationId)) as Promise<Organization | undefined>,
      requestResult(transaction.objectStore(stores.documents).getAll()) as Promise<DossierDocument[]>,
      requestResult(transaction.objectStore(stores.contactNotes).getAll()) as Promise<ContactNote[]>,
      requestResult(transaction.objectStore(stores.timelineEvents).getAll()) as Promise<TimelineEvent[]>,
    ]);
    await transactionDone(transaction);
    if (!organization) return undefined;

    return {
      organization,
      documents: documents.filter((document) => document.organizationId === organizationId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      contactNotes: contactNotes.filter((note) => note.organizationId === organizationId)
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
      timelineEvents: newestFirst(timelineEvents.filter((event) => event.organizationId === organizationId)),
    };
  }

  async addDocument(input: NewDocumentInput): Promise<DossierDocument> {
    const database = await this.database();
    const now = new Date().toISOString();
    const document: DossierDocument = {
      id: makeId("document"),
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      documentType: input.documentType,
      createdAt: now,
      originalFileName: input.file.name,
      sizeBytes: input.file.size,
      mimeType: input.file.type || "application/octet-stream",
      file: input.file,
    };
    const event: TimelineEvent = {
      id: makeId("event"),
      organizationId: input.organizationId,
      type: "document_added",
      occurredAt: now,
      description: `Document toegevoegd: ${document.title}`,
      source: "handmatig",
      documentId: document.id,
    };

    const transaction = database.transaction(Object.values(stores), "readwrite");
    transaction.objectStore(stores.documents).add(document);
    transaction.objectStore(stores.timelineEvents).add(event);
    await this.touchOrganization(transaction, input.organizationId, now);
    await transactionDone(transaction);
    return document;
  }

  async removeDocument(documentId: string): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction(Object.values(stores), "readwrite");
    const documentStore = transaction.objectStore(stores.documents);
    const document = await requestResult(documentStore.get(documentId)) as DossierDocument | undefined;
    if (!document) {
      transaction.abort();
      throw new Error("Het document bestaat niet meer.");
    }

    const now = new Date().toISOString();
    documentStore.delete(documentId);
    transaction.objectStore(stores.timelineEvents).add({
      id: makeId("event"),
      organizationId: document.organizationId,
      type: "document_removed",
      occurredAt: now,
      description: `Document verwijderd: ${document.title}`,
      source: "handmatig",
      documentId,
    } satisfies TimelineEvent);
    await this.touchOrganization(transaction, document.organizationId, now);
    await transactionDone(transaction);
  }

  async addContactNote(input: NewContactNoteInput): Promise<ContactNote> {
    const database = await this.database();
    const now = new Date().toISOString();
    const note: ContactNote = {
      id: makeId("note"),
      organizationId: input.organizationId,
      type: input.type,
      title: input.title.trim(),
      content: input.content.trim(),
      occurredAt: new Date(input.occurredAt).toISOString(),
      contactPerson: input.contactPerson?.trim() || undefined,
      createdAt: now,
    };
    const eventDescription = input.type === "telefoon"
      ? `Telefonisch contact geregistreerd: ${note.title}`
      : input.type === "interne notitie"
        ? `Interne notitie toegevoegd: ${note.title}`
        : `${input.type === "e-mail" ? "E-mailcontact" : "Gesprek"} geregistreerd: ${note.title}`;

    const transaction = database.transaction(Object.values(stores), "readwrite");
    transaction.objectStore(stores.contactNotes).add(note);
    transaction.objectStore(stores.timelineEvents).add({
      id: makeId("event"),
      organizationId: input.organizationId,
      type: "contact_note_added",
      occurredAt: note.occurredAt,
      description: eventDescription,
      source: "handmatig",
      contactNoteId: note.id,
    } satisfies TimelineEvent);
    await this.touchOrganization(transaction, input.organizationId, now);
    await transactionDone(transaction);
    return note;
  }

  async removeContactNote(contactNoteId: string): Promise<void> {
    const database = await this.database();
    const transaction = database.transaction([
      stores.organizations,
      stores.contactNotes,
      stores.timelineEvents,
    ], "readwrite");
    const noteStore = transaction.objectStore(stores.contactNotes);
    const note = await requestResult(noteStore.get(contactNoteId)) as ContactNote | undefined;
    if (!note) {
      transaction.abort();
      throw new Error("De contactnotitie bestaat niet meer.");
    }

    const events = await requestResult(transaction.objectStore(stores.timelineEvents).getAll()) as TimelineEvent[];
    noteStore.delete(contactNoteId);
    for (const event of events.filter((item) => item.contactNoteId === contactNoteId)) {
      transaction.objectStore(stores.timelineEvents).delete(event.id);
    }
    await this.touchOrganization(transaction, note.organizationId, new Date().toISOString());
    await transactionDone(transaction);
  }

  async readAllData(): Promise<WbdDossierData> {
    const database = await this.database();
    const transaction = database.transaction(dossierStoreNames, "readonly");
    const [organizations, documents, contactNotes, timelineEvents] = await Promise.all([
      requestResult(transaction.objectStore(stores.organizations).getAll()) as Promise<Organization[]>,
      requestResult(transaction.objectStore(stores.documents).getAll()) as Promise<DossierDocument[]>,
      requestResult(transaction.objectStore(stores.contactNotes).getAll()) as Promise<ContactNote[]>,
      requestResult(transaction.objectStore(stores.timelineEvents).getAll()) as Promise<TimelineEvent[]>,
    ]);
    await transactionDone(transaction);
    return { organizations, documents, contactNotes, timelineEvents };
  }

  async listRestoreHistory(): Promise<RestoreHistoryEntry[]> {
    const database = await this.database();
    const transaction = database.transaction(stores.restoreHistory, "readonly");
    const history = await requestResult(transaction.objectStore(stores.restoreHistory).getAll()) as RestoreHistoryEntry[];
    await transactionDone(transaction);
    return history.sort((left, right) => right.restoredAt.localeCompare(left.restoredAt));
  }

  async restoreData(data: WbdDossierData, context: RestoreContext): Promise<RestoreResult> {
    const database = await this.database();
    const existing = await this.readAllData();
    const mergePlan = context.mode === "merge" ? await planDossierMerge(existing, data) : undefined;
    const additions = mergePlan?.additions ?? data;
    const imported = dataCounts(additions);
    const skipped = mergePlan?.skipped ?? emptyCounts();
    const conflicts = mergePlan?.conflicts ?? emptyCounts();
    const history: RestoreHistoryEntry = {
      id: makeId("restore"),
      restoredAt: new Date().toISOString(),
      backupExportedAt: context.backupExportedAt,
      mode: context.mode,
      imported,
      skipped,
      conflicts,
      source: "lokale back-up",
    };

    const transaction = database.transaction(Object.values(stores), "readwrite");
    if (context.mode === "replace") {
      for (const storeName of Object.values(stores)) transaction.objectStore(storeName).clear();
    }
    for (const organization of additions.organizations) transaction.objectStore(stores.organizations).add(organization);
    for (const document of additions.documents) transaction.objectStore(stores.documents).add(document);
    for (const note of additions.contactNotes) transaction.objectStore(stores.contactNotes).add(note);
    for (const event of additions.timelineEvents) transaction.objectStore(stores.timelineEvents).add(event);
    transaction.objectStore(stores.restoreHistory).add(history);
    await transactionDone(transaction);
    return { imported, skipped, conflicts, history };
  }

  private async touchOrganization(transaction: IDBTransaction, organizationId: string, updatedAt: string): Promise<void> {
    const store = transaction.objectStore(stores.organizations);
    const organization = await requestResult(store.get(organizationId)) as Organization | undefined;
    if (organization) store.put({ ...organization, updatedAt });
  }
}

export const wbdDossierRepository: WbdDossierRepository = new IndexedDbWbdDossierRepository();
