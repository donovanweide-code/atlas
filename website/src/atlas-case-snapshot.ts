export type CaseSnapshotLifecycleStatus = "candidate" | "confirmed" | "superseded" | "withdrawn";
export type CaseSnapshotPrecision = "day" | "minute";
export type CaseSnapshotReliability = "high" | "medium" | "low" | "unknown";
export type CaseSnapshotUncertaintyImpact = "high" | "medium" | "low";

export interface CaseSnapshotStatement {
  text: string;
  claimIds: string[];
}

export interface CaseSnapshotStatus {
  code: string;
  label: string;
  claimIds: string[];
}

export interface CaseSnapshotClaim {
  id: string;
  statement: string;
  sourceIds: string[];
  confirmedAt: string;
  confirmedAtPrecision: CaseSnapshotPrecision;
  reliability: CaseSnapshotReliability;
  reliabilityBasis: string;
}

export interface CaseSnapshotSource {
  id: string;
  type: string;
  path: string;
  locator: string;
}

export interface CaseSnapshotUncertainty {
  id: string;
  text: string;
  impact: CaseSnapshotUncertaintyImpact;
}

export interface CaseSnapshot {
  schemaVersion: 1;
  caseId: "0001";
  revision: number;
  lifecycleStatus: CaseSnapshotLifecycleStatus;
  supersedesRevision: number | null;
  confirmationMode: "editorial-confirmation-pending" | "editorially-confirmed";
  editorialOwner: "atlas";
  confirmedBy: "donovan" | null;
  preparedBy: "codex";
  lastConfirmedAt: string | null;
  lastConfirmedAtPrecision: CaseSnapshotPrecision | null;
  position: CaseSnapshotStatement;
  meaning: CaseSnapshotStatement;
  priority: CaseSnapshotStatement;
  nextStep: CaseSnapshotStatement;
  status: CaseSnapshotStatus;
  claims: CaseSnapshotClaim[];
  sources: CaseSnapshotSource[];
  openUncertainties: CaseSnapshotUncertainty[];
  evidenceBoundary: string[];
}

export type ConfirmedCaseSnapshot = CaseSnapshot & {
  lifecycleStatus: "confirmed";
  confirmationMode: "editorially-confirmed";
  confirmedBy: "donovan";
  lastConfirmedAt: string;
  lastConfirmedAtPrecision: CaseSnapshotPrecision;
};

export type CaseSnapshotLoadResult =
  | { state: "confirmed"; snapshot: ConfirmedCaseSnapshot }
  | { state: "unavailable"; reason: "missing" | "invalid" | "not-confirmed" };

const lifecycleStatuses = new Set<CaseSnapshotLifecycleStatus>(["candidate", "confirmed", "superseded", "withdrawn"]);
const precisions = new Set<CaseSnapshotPrecision>(["day", "minute"]);
const reliabilities = new Set<CaseSnapshotReliability>(["high", "medium", "low", "unknown"]);
const uncertaintyImpacts = new Set<CaseSnapshotUncertaintyImpact>(["high", "medium", "low"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isStringArray = (value: unknown, allowEmpty = false): value is string[] =>
  Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(isNonEmptyString);

const isTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const isStatement = (value: unknown): value is CaseSnapshotStatement =>
  isRecord(value) && isNonEmptyString(value.text) && isStringArray(value.claimIds);

const isStatus = (value: unknown): value is CaseSnapshotStatus =>
  isRecord(value) && isNonEmptyString(value.code) && isNonEmptyString(value.label) && isStringArray(value.claimIds);

const isClaim = (value: unknown): value is CaseSnapshotClaim =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.statement) &&
  isStringArray(value.sourceIds) &&
  isTimestamp(value.confirmedAt) &&
  precisions.has(value.confirmedAtPrecision as CaseSnapshotPrecision) &&
  reliabilities.has(value.reliability as CaseSnapshotReliability) &&
  isNonEmptyString(value.reliabilityBasis);

const isSource = (value: unknown): value is CaseSnapshotSource =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.type) &&
  isNonEmptyString(value.path) &&
  isNonEmptyString(value.locator);

const isUncertainty = (value: unknown): value is CaseSnapshotUncertainty =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.text) &&
  uncertaintyImpacts.has(value.impact as CaseSnapshotUncertaintyImpact);

function hasUniqueIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

function isValidSnapshot(value: unknown): value is CaseSnapshot {
  if (!isRecord(value) ||
      value.schemaVersion !== 1 ||
      value.caseId !== "0001" ||
      !Number.isInteger(value.revision) ||
      (value.revision as number) < 1 ||
      !lifecycleStatuses.has(value.lifecycleStatus as CaseSnapshotLifecycleStatus) ||
      (value.supersedesRevision !== null && (!Number.isInteger(value.supersedesRevision) || (value.supersedesRevision as number) < 1 || (value.supersedesRevision as number) >= (value.revision as number))) ||
      value.editorialOwner !== "atlas" ||
      value.preparedBy !== "codex" ||
      !isStatement(value.position) ||
      !isStatement(value.meaning) ||
      !isStatement(value.priority) ||
      !isStatement(value.nextStep) ||
      !isStatus(value.status) ||
      !Array.isArray(value.claims) || !value.claims.length || !value.claims.every(isClaim) ||
      !Array.isArray(value.sources) || !value.sources.length || !value.sources.every(isSource) ||
      !Array.isArray(value.openUncertainties) || !value.openUncertainties.every(isUncertainty) ||
      !isStringArray(value.evidenceBoundary)) return false;

  const validConfirmationState = value.lifecycleStatus === "candidate"
    ? value.confirmationMode === "editorial-confirmation-pending" &&
      value.confirmedBy === null &&
      value.lastConfirmedAt === null &&
      value.lastConfirmedAtPrecision === null
    : value.confirmationMode === "editorially-confirmed" &&
      value.confirmedBy === "donovan" &&
      isTimestamp(value.lastConfirmedAt) &&
      precisions.has(value.lastConfirmedAtPrecision as CaseSnapshotPrecision);

  if (!validConfirmationState ||
      !hasUniqueIds(value.claims) ||
      !hasUniqueIds(value.sources) ||
      !hasUniqueIds(value.openUncertainties)) return false;

  const claimIds = new Set(value.claims.map((claim) => claim.id));
  const sourceIds = new Set(value.sources.map((source) => source.id));
  const statementClaimIds = [
    ...value.position.claimIds,
    ...value.meaning.claimIds,
    ...value.priority.claimIds,
    ...value.nextStep.claimIds,
    ...value.status.claimIds,
  ];

  return statementClaimIds.every((id) => claimIds.has(id)) &&
    value.claims.every((claim) => claim.sourceIds.every((id) => sourceIds.has(id)));
}

export function parseCaseSnapshot(raw: unknown): CaseSnapshotLoadResult {
  if (!isNonEmptyString(raw)) return { state: "unavailable", reason: "missing" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "unavailable", reason: "invalid" };
  }

  if (!isValidSnapshot(parsed)) return { state: "unavailable", reason: "invalid" };
  if (parsed.lifecycleStatus !== "confirmed") return { state: "unavailable", reason: "not-confirmed" };
  return { state: "confirmed", snapshot: parsed as ConfirmedCaseSnapshot };
}
