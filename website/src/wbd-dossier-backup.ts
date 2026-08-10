import type {
  ContactNote,
  DossierDocument,
  Organization,
  RestoreMode,
  RestoreResult,
  TimelineEvent,
  WbdDossierData,
  WbdDossierRepository,
} from "./wbd-dossier-store";

export const WBD_BACKUP_FORMAT = "wbd-workspace-backup";
export const WBD_BACKUP_SCHEMA_VERSION = 1;

export interface WbdBackupManifest {
  backupFormat: typeof WBD_BACKUP_FORMAT;
  schemaVersion: typeof WBD_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  application: "We Build And Design Workspace";
  source: "lokale IndexedDB-opslag";
  completeness: "complete";
  counts: {
    organizations: number;
    documents: number;
    contactNotes: number;
    timelineEvents: number;
    files: number;
  };
}

export interface WbdBackupDocument extends Omit<DossierDocument, "file"> {
  filePath: string;
  sha256: string;
}

export interface WbdBackupFileEntry {
  documentId: string;
  path: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  base64: string;
}

export interface WbdBackupFile {
  manifest: WbdBackupManifest;
  organizations: Organization[];
  documents: WbdBackupDocument[];
  contactNotes: ContactNote[];
  timelineEvents: TimelineEvent[];
  files: WbdBackupFileEntry[];
}

export interface WbdBackupArtifact {
  backup: WbdBackupFile;
  blob: Blob;
  fileName: string;
}

export interface WbdBackupValidation {
  valid: boolean;
  issues: string[];
  backup?: WbdBackupFile;
}

export class WbdBackupError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "WbdBackupError";
    this.issues = issues;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUniqueIds(records: readonly unknown[]): boolean {
  const ids = records.map((record) => isObject(record) ? record.id : undefined);
  return ids.every(isNonEmptyString) && new Set(ids).size === ids.length;
}

function safeFileName(value: string): string {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-");
  return cleaned.replace(/^[-.]+|[-.]+$/g, "") || "document";
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }
  return btoa(chunks.join(""));
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64(bytes).replace(/=+$/, "") !== normalized.replace(/=+$/, "")) {
    throw new Error("Ongeldige Base64-inhoud.");
  }
  return bytes;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function backupFileName(date: Date): string {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
  return `wbd-workspace-backup-${stamp}.wbd-backup.json`;
}

function recordShapeIssues(backup: WbdBackupFile): string[] {
  const issues: string[] = [];
  const organizationIds = new Set<string>();
  for (const organization of backup.organizations) {
    if (!isObject(organization) || !isNonEmptyString(organization.id) || !isNonEmptyString(organization.name)
      || !isNonEmptyString(organization.type) || !isNonEmptyString(organization.description)
      || !isNonEmptyString(organization.createdAt) || !isNonEmptyString(organization.updatedAt)) {
      issues.push("Een organisatie heeft ongeldige of ontbrekende velden.");
      continue;
    }
    organizationIds.add(organization.id);
  }

  for (const document of backup.documents) {
    if (!isObject(document) || !isNonEmptyString(document.id) || !isNonEmptyString(document.organizationId)
      || !isNonEmptyString(document.title) || !isNonEmptyString(document.documentType)
      || !isNonEmptyString(document.createdAt) || !isNonEmptyString(document.originalFileName)
      || typeof document.sizeBytes !== "number" || document.sizeBytes < 0
      || !isNonEmptyString(document.mimeType) || !isNonEmptyString(document.filePath)
      || !isNonEmptyString(document.sha256)) {
      issues.push("Een documentrecord heeft ongeldige of ontbrekende velden.");
    } else if (!organizationIds.has(document.organizationId)) {
      issues.push(`Document ‘${document.title}’ verwijst naar een ontbrekende organisatie.`);
    }
  }

  for (const note of backup.contactNotes) {
    if (!isObject(note) || !isNonEmptyString(note.id) || !isNonEmptyString(note.organizationId)
      || !isNonEmptyString(note.type) || !isNonEmptyString(note.title) || !isNonEmptyString(note.content)
      || !isNonEmptyString(note.occurredAt) || !isNonEmptyString(note.createdAt)) {
      issues.push("Een contactnotitie heeft ongeldige of ontbrekende velden.");
    } else if (!organizationIds.has(note.organizationId)) {
      issues.push(`Contactnotitie ‘${note.title}’ verwijst naar een ontbrekende organisatie.`);
    }
  }

  for (const event of backup.timelineEvents) {
    if (!isObject(event) || !isNonEmptyString(event.id) || !isNonEmptyString(event.organizationId)
      || !isNonEmptyString(event.type) || !isNonEmptyString(event.occurredAt)
      || !isNonEmptyString(event.description) || event.source !== "handmatig") {
      issues.push("Een tijdlijngebeurtenis heeft ongeldige of ontbrekende velden.");
    } else if (!organizationIds.has(event.organizationId)) {
      issues.push(`Tijdlijngebeurtenis ‘${event.description}’ verwijst naar een ontbrekende organisatie.`);
    }
  }
  return issues;
}

export async function validateWbdBackup(value: unknown): Promise<WbdBackupValidation> {
  const issues: string[] = [];
  if (!isObject(value)) return { valid: false, issues: ["Het geselecteerde bestand bevat geen geldige back-upstructuur."] };

  const manifest = value.manifest;
  if (!isObject(manifest)) issues.push("manifest ontbreekt.");
  else {
    if (manifest.backupFormat !== WBD_BACKUP_FORMAT) issues.push("Het back-upformaat wordt niet herkend.");
    if (manifest.schemaVersion !== WBD_BACKUP_SCHEMA_VERSION) issues.push(`Schemaversie ${String(manifest.schemaVersion)} wordt niet ondersteund.`);
    if (!isNonEmptyString(manifest.exportedAt) || Number.isNaN(Date.parse(manifest.exportedAt))) issues.push("De exportdatum is ongeldig.");
    if (manifest.application !== "We Build And Design Workspace") issues.push("De back-up is niet afkomstig uit de WBD Workspace.");
    if (manifest.source !== "lokale IndexedDB-opslag") issues.push("De technische broninformatie klopt niet.");
    if (manifest.completeness !== "complete") issues.push("Alleen volledig gevalideerde back-ups kunnen worden teruggezet.");
    if (!isObject(manifest.counts)) issues.push("De aantallen in het manifest ontbreken.");
  }

  const requiredArrays = ["organizations", "documents", "contactNotes", "timelineEvents", "files"] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(value[key])) issues.push(`De verplichte dataset ${key} ontbreekt.`);
  }
  if (issues.length) return { valid: false, issues };

  const backup = value as unknown as WbdBackupFile;
  if (!hasUniqueIds(backup.organizations)) issues.push("Organisatie-id’s zijn leeg of dubbel.");
  if (!hasUniqueIds(backup.documents)) issues.push("Document-id’s zijn leeg of dubbel.");
  if (!hasUniqueIds(backup.contactNotes)) issues.push("Contactnotitie-id’s zijn leeg of dubbel.");
  if (!hasUniqueIds(backup.timelineEvents)) issues.push("Tijdlijn-id’s zijn leeg of dubbel.");
  if (new Set(backup.files.map((file) => isObject(file) ? file.path : undefined)).size !== backup.files.length) issues.push("Bestandspaden zijn dubbel.");
  issues.push(...recordShapeIssues(backup));

  const expectedCounts = backup.manifest.counts;
  const actualCounts = {
    organizations: backup.organizations.length,
    documents: backup.documents.length,
    contactNotes: backup.contactNotes.length,
    timelineEvents: backup.timelineEvents.length,
    files: backup.files.length,
  };
  for (const key of Object.keys(actualCounts) as Array<keyof typeof actualCounts>) {
    if (expectedCounts[key] !== actualCounts[key]) issues.push(`Het manifest-aantal voor ${key} klopt niet.`);
  }

  const fileByPath = new Map(backup.files.map((file) => [file.path, file]));
  for (const document of backup.documents) {
    const file = fileByPath.get(document.filePath);
    if (!file) {
      issues.push(`Het daadwerkelijke bestand voor ‘${document.title}’ ontbreekt.`);
      continue;
    }
    if (file.documentId !== document.id || file.originalFileName !== document.originalFileName
      || file.mimeType !== document.mimeType || file.sizeBytes !== document.sizeBytes
      || file.sha256 !== document.sha256) {
      issues.push(`Bestandsmetadata voor ‘${document.title}’ komt niet overeen.`);
      continue;
    }
    try {
      const bytes = base64ToBytes(file.base64);
      if (bytes.byteLength !== document.sizeBytes) issues.push(`Bestandsgrootte voor ‘${document.title}’ komt niet overeen.`);
      if (await sha256(bytes) !== document.sha256) issues.push(`Bestandscontrole voor ‘${document.title}’ is mislukt.`);
    } catch {
      issues.push(`Bestandsinhoud voor ‘${document.title}’ is beschadigd.`);
    }
  }
  for (const file of backup.files) {
    if (!backup.documents.some((document) => document.id === file.documentId && document.filePath === file.path)) {
      issues.push(`Ongekoppeld bestand ‘${file.path}’ staat in de back-up.`);
    }
  }

  return issues.length ? { valid: false, issues } : { valid: true, issues: [], backup };
}

export async function createWbdBackup(data: WbdDossierData, exportedAt = new Date()): Promise<WbdBackupArtifact> {
  const issues: string[] = [];
  const files: WbdBackupFileEntry[] = [];
  const documents: WbdBackupDocument[] = [];

  for (const document of data.documents) {
    if (!(document.file instanceof Blob)) {
      issues.push(`Document ‘${document.title}’ heeft geen lokaal bestand.`);
      continue;
    }
    if (document.file.size !== document.sizeBytes) {
      issues.push(`Bestandsgrootte van ‘${document.title}’ komt niet overeen met de metadata.`);
      continue;
    }
    if (document.file.type && document.mimeType !== document.file.type) {
      issues.push(`Bestandstype van ‘${document.title}’ komt niet overeen met de metadata.`);
      continue;
    }
    const bytes = new Uint8Array(await document.file.arrayBuffer());
    const hash = await sha256(bytes);
    const path = `files/${document.id}_${safeFileName(document.originalFileName)}`;
    const { file: _file, ...metadata } = document;
    documents.push({ ...metadata, filePath: path, sha256: hash });
    files.push({
      documentId: document.id,
      path,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      sha256: hash,
      base64: bytesToBase64(bytes),
    });
  }
  if (issues.length) throw new WbdBackupError(issues);

  const backup: WbdBackupFile = {
    manifest: {
      backupFormat: WBD_BACKUP_FORMAT,
      schemaVersion: WBD_BACKUP_SCHEMA_VERSION,
      exportedAt: exportedAt.toISOString(),
      application: "We Build And Design Workspace",
      source: "lokale IndexedDB-opslag",
      completeness: "complete",
      counts: {
        organizations: data.organizations.length,
        documents: documents.length,
        contactNotes: data.contactNotes.length,
        timelineEvents: data.timelineEvents.length,
        files: files.length,
      },
    },
    organizations: structuredClone(data.organizations),
    documents,
    contactNotes: structuredClone(data.contactNotes),
    timelineEvents: structuredClone(data.timelineEvents),
    files,
  };
  const validation = await validateWbdBackup(backup);
  if (!validation.valid) throw new WbdBackupError(validation.issues);
  return {
    backup,
    blob: new Blob([JSON.stringify(backup, null, 2)], { type: "application/vnd.wbd.workspace-backup+json" }),
    fileName: backupFileName(exportedAt),
  };
}

export async function parseWbdBackupFile(file: Blob): Promise<WbdBackupFile> {
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new WbdBackupError(["Het geselecteerde bestand bevat geen leesbare JSON-back-up."]);
  }
  const validation = await validateWbdBackup(value);
  if (!validation.valid || !validation.backup) throw new WbdBackupError(validation.issues);
  return validation.backup;
}

export function backupToDossierData(backup: WbdBackupFile): WbdDossierData {
  const fileByPath = new Map(backup.files.map((file) => [file.path, file]));
  const documents = backup.documents.map((document) => {
    const file = fileByPath.get(document.filePath)!;
    const { filePath: _path, sha256: _hash, ...metadata } = document;
    const bytes = new Uint8Array(base64ToBytes(file.base64));
    return { ...metadata, file: new Blob([bytes.buffer], { type: file.mimeType }) };
  });
  return {
    organizations: structuredClone(backup.organizations),
    documents,
    contactNotes: structuredClone(backup.contactNotes),
    timelineEvents: structuredClone(backup.timelineEvents),
  };
}

export async function restoreWbdBackup(
  repository: WbdDossierRepository,
  backup: WbdBackupFile,
  mode: RestoreMode,
): Promise<RestoreResult> {
  const validation = await validateWbdBackup(backup);
  if (!validation.valid) throw new WbdBackupError(validation.issues);
  return repository.restoreData(backupToDossierData(backup), {
    mode,
    backupExportedAt: backup.manifest.exportedAt,
  });
}
