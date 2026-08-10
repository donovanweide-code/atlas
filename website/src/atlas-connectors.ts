export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type ConnectorAuthorizationMode =
  | "none"
  | "oauth2_user"
  | "service_account"
  | "application_default_credentials";

export type ConnectorAuthorizationStatus =
  | "not_required"
  | "not_configured"
  | "ready"
  | "expired"
  | "denied";

export type ConnectorSyncStrategy =
  | "snapshot_diff"
  | "incremental_cursor"
  | "overlapping_window";

export type ConnectorSyncTrigger = "manual" | "scheduled";

export type ConnectorHealthStatus =
  | "never_synced"
  | "healthy"
  | "degraded"
  | "failed"
  | "authorization_required";

export type ConnectorFreshnessStatus = "fresh" | "stale" | "unknown";

export type ConnectorChangeType = "new" | "changed" | "removed";

export type ConnectorErrorCategory =
  | "authorization"
  | "rate_limit"
  | "source_unavailable"
  | "invalid_source_data"
  | "incomplete_source_data"
  | "internal";

export interface ConnectorRetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maximumDelayMs: number;
  multiplier: number;
}

export interface ConnectorDefinition {
  version: 1;
  connectorId: string;
  connectorType: string;
  contextId: string;
  displayName: string;
  authorizationMode: ConnectorAuthorizationMode;
  syncStrategy: ConnectorSyncStrategy;
  syncFrequency: {
    mode: "manual" | "hourly" | "daily" | "weekly";
    interval: number;
    timeZone?: string;
  };
  freshnessThresholdHours: number;
  retryPolicy: ConnectorRetryPolicy;
}

export interface RawSourceReference {
  source: string;
  locator: string;
}

export interface ConnectorBatchCoverage {
  mode: "full_snapshot" | "incremental" | "time_window";
  completeness: "complete" | "partial";
  windowStartedAt?: string;
  windowEndedAt?: string;
}

export interface RawConnectorRecord {
  sourceRecordId: string;
  sourceRecordVersion?: string;
  sourceUpdatedAt?: string;
  rawReference: RawSourceReference;
  rawPayload: JsonValue;
}

export interface RawConnectorBatch {
  sourceObservedAt?: string;
  nextCheckpoint?: string;
  rawReference: RawSourceReference;
  coverage: ConnectorBatchCoverage;
  records: RawConnectorRecord[];
  diagnostics?: JsonObject;
}

export interface ConnectorAdapter {
  getAuthorizationStatus(): Promise<ConnectorAuthorizationStatus>;
  fetchRaw(input: {
    checkpoint?: string;
    signal?: AbortSignal;
  }): Promise<RawConnectorBatch>;
}

export interface ConnectorNormalizerDescriptor {
  normalizerId: string;
  normalizerVersion: string;
  outputSchemaVersion: string;
}

export interface NormalizedSourceRecord {
  sourceRecordId: string;
  sourceRecordVersion?: string;
  sourceUpdatedAt?: string;
  rawReference: RawSourceReference;
  rawContentHash: string;
  normalizedPayload: JsonObject;
  normalization: ConnectorNormalizerDescriptor;
}

export interface NormalizedConnectorBatch {
  sourceObservedAt?: string;
  nextCheckpoint?: string;
  rawReference: RawSourceReference;
  coverage: ConnectorBatchCoverage;
  records: NormalizedSourceRecord[];
  diagnostics?: JsonObject;
}

export interface ConnectorNormalizer {
  descriptor: ConnectorNormalizerDescriptor;
  normalize(batch: RawConnectorBatch): Promise<NormalizedConnectorBatch>;
}

export interface StoredConnectorRecord extends NormalizedSourceRecord {
  normalizedContentHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ConnectorRecordChange {
  version: 1;
  changeId: string;
  connectorId: string;
  connectorType: string;
  contextId: string;
  sourceRecordId: string;
  sourceRecordVersion?: string;
  previousChangeId?: string;
  changeType: ConnectorChangeType;
  synchronizedAt: string;
  sourceUpdatedAt?: string;
  rawContentHash: string;
  normalizedContentHash: string;
  rawReference: RawSourceReference;
  normalizedPayload: JsonObject | null;
  provenance: {
    connectorId: string;
    contextId: string;
    source: string;
    locator: string;
    syncRunId: string;
    normalizerId: string;
    normalizerVersion: string;
    normalizedSchemaVersion: string;
  };
  evidenceStatus: "source_reported";
  translationStatus: "untranslated";
}

export interface ConnectorTranslatorDescriptor {
  translatorId: string;
  translatorVersion: string;
  inputSchemaVersion: string;
  outputSchemaVersion: string;
}

export interface AtlasObservationDraft {
  observationType: string;
  statement: string;
  payload?: JsonObject;
  evidenceStatus: "source_reported";
}

export interface AtlasObservationCandidate extends AtlasObservationDraft {
  version: 1;
  observationId: string;
  connectorId: string;
  contextId: string;
  sourceRecordId: string;
  sourceChangeId: string;
  createdAt: string;
  provenance: ConnectorRecordChange["provenance"] & {
    translatorId: string;
    translatorVersion: string;
    observationSchemaVersion: string;
  };
  interpretationStatus: "uninterpreted";
}

export interface ConnectorTranslator {
  descriptor: ConnectorTranslatorDescriptor;
  translate(change: ConnectorRecordChange): Promise<AtlasObservationDraft[]>;
}

export interface ConnectorErrorStatus {
  category: ConnectorErrorCategory;
  code: string;
  message: string;
  occurredAt: string;
  retryable: boolean;
  attemptCount: number;
}

export interface ConnectorSyncRun {
  version: 1;
  syncRunId: string;
  connectorId: string;
  contextId: string;
  trigger: ConnectorSyncTrigger;
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed";
  attemptCount: number;
  counts: {
    fetched: number;
    new: number;
    changed: number;
    removed: number;
    unchanged: number;
  };
  checkpointBefore?: string;
  checkpointAfter?: string;
  rawReference?: RawSourceReference;
  error?: ConnectorErrorStatus;
}

export interface ActiveConnectorSyncRun {
  syncRunId: string;
  trigger: ConnectorSyncTrigger;
  startedAt: string;
  checkpointBefore?: string;
}

export interface ConnectorState {
  version: 1;
  connectorId: string;
  connectorType: string;
  contextId: string;
  authorizationStatus: ConnectorAuthorizationStatus;
  healthStatus: ConnectorHealthStatus;
  sourceFreshness: {
    status: ConnectorFreshnessStatus;
    sourceObservedAt?: string;
    evaluatedAt: string;
    thresholdHours: number;
  };
  lastSyncStartedAt?: string;
  lastSyncSucceededAt?: string;
  activeRun?: ActiveConnectorSyncRun;
  checkpoint?: string;
  errorStatus?: ConnectorErrorStatus;
  records: StoredConnectorRecord[];
  recordChanges: ConnectorRecordChange[];
  syncHistory: ConnectorSyncRun[];
}

export interface ConnectorStateStore {
  load(definition: ConnectorDefinition): Promise<ConnectorState | null>;
  save(definition: ConnectorDefinition, state: ConnectorState): Promise<void>;
}

export class ConnectorSourceError extends Error {
  readonly category: ConnectorErrorCategory;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(input: {
    category?: ConnectorErrorCategory;
    code: string;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  }) {
    super(input.message);
    this.name = "ConnectorSourceError";
    this.category = input.category ?? "source_unavailable";
    this.code = input.code;
    this.retryable = input.retryable;
    this.retryAfterMs = input.retryAfterMs;
  }
}

export interface SyncConnectorOptions {
  trigger: ConnectorSyncTrigger;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  signal?: AbortSignal;
}

const emptyCounts = () => ({
  fetched: 0,
  new: 0,
  changed: 0,
  removed: 0,
  unchanged: 0,
});

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value) && !Number.isNaN(Date.parse(value ?? ""));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function translateConnectorChanges(
  translator: ConnectorTranslator,
  changes: ConnectorRecordChange[],
  createdAt: string,
): Promise<AtlasObservationCandidate[]> {
  const observations = new Map<string, AtlasObservationCandidate>();

  for (const change of changes) {
    if (
      change.provenance.normalizedSchemaVersion
      !== translator.descriptor.inputSchemaVersion
    ) {
      throw new ConnectorSourceError({
        category: "internal",
        code: "TRANSLATOR_INPUT_SCHEMA_MISMATCH",
        message:
          `Translator ${translator.descriptor.translatorId} cannot read normalized schema ${change.provenance.normalizedSchemaVersion}.`,
        retryable: false,
      });
    }

    const drafts = await translator.translate(change);
    for (const draft of drafts) {
      const observationId = await sha256(stableJson({
        sourceChangeId: change.changeId,
        translatorId: translator.descriptor.translatorId,
        translatorVersion: translator.descriptor.translatorVersion,
        observationSchemaVersion: translator.descriptor.outputSchemaVersion,
        observationType: draft.observationType,
        statement: draft.statement,
        payload: draft.payload ?? null,
      }));
      observations.set(observationId, {
        ...draft,
        version: 1,
        observationId,
        connectorId: change.connectorId,
        contextId: change.contextId,
        sourceRecordId: change.sourceRecordId,
        sourceChangeId: change.changeId,
        createdAt,
        provenance: {
          ...change.provenance,
          translatorId: translator.descriptor.translatorId,
          translatorVersion: translator.descriptor.translatorVersion,
          observationSchemaVersion: translator.descriptor.outputSchemaVersion,
        },
        interpretationStatus: "uninterpreted",
      });
    }
  }

  return [...observations.values()].sort((left, right) =>
    left.observationId.localeCompare(right.observationId)
  );
}

export interface ConnectorFleetHealthSummary {
  total: number;
  byHealth: Record<ConnectorHealthStatus, number>;
  byFreshness: Record<ConnectorFreshnessStatus, number>;
  byErrorCategory: Partial<Record<ConnectorErrorCategory, number>>;
}

export function summarizeConnectorHealth(
  states: ConnectorState[],
): ConnectorFleetHealthSummary {
  const summary: ConnectorFleetHealthSummary = {
    total: states.length,
    byHealth: {
      never_synced: 0,
      healthy: 0,
      degraded: 0,
      failed: 0,
      authorization_required: 0,
    },
    byFreshness: {
      fresh: 0,
      stale: 0,
      unknown: 0,
    },
    byErrorCategory: {},
  };

  states.forEach((state) => {
    summary.byHealth[state.healthStatus] += 1;
    summary.byFreshness[state.sourceFreshness.status] += 1;
    if (state.errorStatus) {
      summary.byErrorCategory[state.errorStatus.category] =
        (summary.byErrorCategory[state.errorStatus.category] ?? 0) + 1;
    }
  });

  return summary;
}

function createInitialState(
  definition: ConnectorDefinition,
  evaluatedAt: string,
): ConnectorState {
  return {
    version: 1,
    connectorId: definition.connectorId,
    connectorType: definition.connectorType,
    contextId: definition.contextId,
    authorizationStatus: definition.authorizationMode === "none"
      ? "not_required"
      : "not_configured",
    healthStatus: "never_synced",
    sourceFreshness: {
      status: "unknown",
      evaluatedAt,
      thresholdHours: definition.freshnessThresholdHours,
    },
    records: [],
    recordChanges: [],
    syncHistory: [],
  };
}

function assertStateBoundary(
  definition: ConnectorDefinition,
  state: ConnectorState,
): void {
  if (
    state.connectorId !== definition.connectorId
    || state.connectorType !== definition.connectorType
    || state.contextId !== definition.contextId
  ) {
    throw new Error("Connector state does not match its connector and context boundary.");
  }
}

function freshness(
  sourceObservedAt: string | undefined,
  evaluatedAt: string,
  thresholdHours: number,
): ConnectorState["sourceFreshness"] {
  if (!isIsoDate(sourceObservedAt)) {
    return {
      status: "unknown",
      evaluatedAt,
      thresholdHours,
    };
  }
  const age = Date.parse(evaluatedAt) - Date.parse(sourceObservedAt);
  return {
    status: age <= thresholdHours * 60 * 60 * 1000 ? "fresh" : "stale",
    sourceObservedAt,
    evaluatedAt,
    thresholdHours,
  };
}

function asSourceError(error: unknown): ConnectorSourceError {
  if (error instanceof ConnectorSourceError) return error;
  const message = error instanceof Error ? error.message : "Unknown connector source error.";
  return new ConnectorSourceError({
    code: "SOURCE_UNAVAILABLE",
    message,
    retryable: true,
  });
}

function boundedDelay(
  policy: ConnectorRetryPolicy,
  attempt: number,
  retryAfterMs?: number,
): number {
  if (typeof retryAfterMs === "number" && retryAfterMs >= 0) {
    return Math.min(retryAfterMs, policy.maximumDelayMs);
  }
  const calculated = policy.initialDelayMs * policy.multiplier ** Math.max(0, attempt - 1);
  return Math.min(calculated, policy.maximumDelayMs);
}

async function fetchWithRetry(
  definition: ConnectorDefinition,
  adapter: ConnectorAdapter,
  normalizer: ConnectorNormalizer,
  checkpoint: string | undefined,
  options: SyncConnectorOptions,
): Promise<{ batch: NormalizedConnectorBatch; attemptCount: number }> {
  const sleep = options.sleep ?? ((milliseconds) => new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  }));
  let lastError: ConnectorSourceError | null = null;

  for (let attempt = 1; attempt <= definition.retryPolicy.maxAttempts; attempt += 1) {
    try {
      const rawBatch = await adapter.fetchRaw({
        checkpoint,
        signal: options.signal,
      });
      return {
        batch: await normalizer.normalize(rawBatch),
        attemptCount: attempt,
      };
    } catch (error) {
      lastError = asSourceError(error);
      if (!lastError.retryable || attempt === definition.retryPolicy.maxAttempts) break;
      await sleep(boundedDelay(definition.retryPolicy, attempt, lastError.retryAfterMs));
    }
  }

  throw Object.assign(lastError ?? new ConnectorSourceError({
    code: "SOURCE_UNAVAILABLE",
    message: "The connector source could not be read.",
    retryable: true,
  }), {
    attemptCount: definition.retryPolicy.maxAttempts,
  });
}

function appendHistory(
  state: ConnectorState,
  run: ConnectorSyncRun,
): ConnectorSyncRun[] {
  return [...state.syncHistory, run].slice(-20);
}

function authorizationHealth(
  authorizationStatus: ConnectorAuthorizationStatus,
): ConnectorHealthStatus {
  return authorizationStatus === "not_configured"
    || authorizationStatus === "expired"
    || authorizationStatus === "denied"
    ? "authorization_required"
    : "failed";
}

function authorizationError(
  authorizationStatus: ConnectorAuthorizationStatus,
  occurredAt: string,
): ConnectorErrorStatus {
  return {
    category: "authorization",
    code: `AUTHORIZATION_${authorizationStatus.toUpperCase()}`,
    message: "The connector is not authorized to read its source.",
    occurredAt,
    retryable: false,
    attemptCount: 0,
  };
}

export async function syncConnector(
  definition: ConnectorDefinition,
  adapter: ConnectorAdapter,
  normalizer: ConnectorNormalizer,
  store: ConnectorStateStore,
  options: SyncConnectorOptions,
): Promise<ConnectorState> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const existing = await store.load(definition);
  let state = existing ?? createInitialState(definition, startedAt);
  state = {
    ...state,
    recordChanges: state.recordChanges ?? [],
  };
  assertStateBoundary(definition, state);

  if (state.activeRun) {
    const interruptedError: ConnectorErrorStatus = {
      category: "internal",
      code: "PREVIOUS_SYNC_INTERRUPTED",
      message: "The previous synchronization did not record a terminal state.",
      occurredAt: startedAt,
      retryable: true,
      attemptCount: 0,
    };
    state = {
      ...state,
      healthStatus: state.lastSyncSucceededAt ? "degraded" : "failed",
      errorStatus: interruptedError,
      activeRun: undefined,
      syncHistory: appendHistory(state, {
        version: 1,
        syncRunId: state.activeRun.syncRunId,
        connectorId: definition.connectorId,
        contextId: definition.contextId,
        trigger: state.activeRun.trigger,
        startedAt: state.activeRun.startedAt,
        completedAt: startedAt,
        status: "failed",
        attemptCount: 0,
        counts: emptyCounts(),
        checkpointBefore: state.activeRun.checkpointBefore,
        error: interruptedError,
      }),
    };
  }

  const syncRunId = `${definition.connectorId}:${startedAt}:${crypto.randomUUID()}`;
  state = {
    ...state,
    lastSyncStartedAt: startedAt,
    activeRun: {
      syncRunId,
      trigger: options.trigger,
      startedAt,
      checkpointBefore: state.checkpoint,
    },
  };
  await store.save(definition, state);
  const authorizationStatus = await adapter.getAuthorizationStatus();

  if (authorizationStatus !== "ready" && authorizationStatus !== "not_required") {
    const errorStatus = authorizationError(authorizationStatus, startedAt);
    const run: ConnectorSyncRun = {
      version: 1,
      syncRunId,
      connectorId: definition.connectorId,
      contextId: definition.contextId,
      trigger: options.trigger,
      startedAt,
      completedAt: startedAt,
      status: "failed",
      attemptCount: 0,
      counts: emptyCounts(),
      checkpointBefore: state.checkpoint,
      error: errorStatus,
    };
    const failedState: ConnectorState = {
      ...state,
      authorizationStatus,
      healthStatus: authorizationHealth(authorizationStatus),
      lastSyncStartedAt: startedAt,
      activeRun: undefined,
      errorStatus,
      sourceFreshness: freshness(
        state.sourceFreshness.sourceObservedAt,
        startedAt,
        definition.freshnessThresholdHours,
      ),
      syncHistory: appendHistory(state, run),
    };
    await store.save(definition, failedState);
    return failedState;
  }

  try {
    const { batch, attemptCount } = await fetchWithRetry(
      definition,
      adapter,
      normalizer,
      state.checkpoint,
      options,
    );
    if (
      definition.syncStrategy !== "snapshot_diff"
      || batch.coverage.mode !== "full_snapshot"
      || batch.coverage.completeness !== "complete"
    ) {
      throw new ConnectorSourceError({
        category: "incomplete_source_data",
        code: "UNSUPPORTED_OR_INCOMPLETE_COVERAGE",
        message:
          "Snapshot diff requires a complete full-source snapshot; absence cannot safely be interpreted as removal.",
        retryable: false,
      });
    }
    const completedAt = now().toISOString();
    const previous = new Map(
      state.records.map((record) => [record.sourceRecordId, record]),
    );
    const latestChangeByRecord = new Map<string, ConnectorRecordChange>();
    state.recordChanges.forEach((change) => {
      latestChangeByRecord.set(change.sourceRecordId, change);
    });
    const nextRecords: StoredConnectorRecord[] = [];
    const newChanges: ConnectorRecordChange[] = [];
    const counts = emptyCounts();
    const seen = new Set<string>();

    for (const sourceRecord of batch.records) {
      if (seen.has(sourceRecord.sourceRecordId)) {
        throw new ConnectorSourceError({
          category: "invalid_source_data",
          code: "DUPLICATE_SOURCE_KEY",
          message: `The source returned duplicate key ${sourceRecord.sourceRecordId}.`,
          retryable: false,
        });
      }
      if (
        sourceRecord.normalization.normalizerId !== normalizer.descriptor.normalizerId
        || sourceRecord.normalization.normalizerVersion
          !== normalizer.descriptor.normalizerVersion
        || sourceRecord.normalization.outputSchemaVersion
          !== normalizer.descriptor.outputSchemaVersion
      ) {
        throw new ConnectorSourceError({
          category: "internal",
          code: "NORMALIZER_PROVENANCE_MISMATCH",
          message: "The normalized record does not match the active normalizer descriptor.",
          retryable: false,
        });
      }
      seen.add(sourceRecord.sourceRecordId);
      const normalizedContentHash = await sha256(
        stableJson(sourceRecord.normalizedPayload),
      );
      const earlier = previous.get(sourceRecord.sourceRecordId);
      const changeType: ConnectorChangeType | null = !earlier
        ? "new"
        : earlier.normalizedContentHash !== normalizedContentHash
          || earlier.normalization.normalizerId
            !== sourceRecord.normalization.normalizerId
          || earlier.normalization.normalizerVersion
            !== sourceRecord.normalization.normalizerVersion
          || earlier.normalization.outputSchemaVersion
            !== sourceRecord.normalization.outputSchemaVersion
          ? "changed"
          : null;
      counts.fetched += 1;

      if (changeType) {
        counts[changeType] += 1;
        const changeId = await sha256(stableJson({
          connectorId: definition.connectorId,
          contextId: definition.contextId,
          sourceRecordId: sourceRecord.sourceRecordId,
          changeType,
          rawContentHash: sourceRecord.rawContentHash,
          normalizedContentHash,
          normalization: sourceRecord.normalization,
          previousChangeId:
            latestChangeByRecord.get(sourceRecord.sourceRecordId)?.changeId
            ?? null,
        }));
        newChanges.push({
          version: 1,
          changeId,
          connectorId: definition.connectorId,
          connectorType: definition.connectorType,
          contextId: definition.contextId,
          sourceRecordId: sourceRecord.sourceRecordId,
          sourceRecordVersion: sourceRecord.sourceRecordVersion,
          previousChangeId:
            latestChangeByRecord.get(sourceRecord.sourceRecordId)?.changeId,
          changeType,
          synchronizedAt: completedAt,
          sourceUpdatedAt: sourceRecord.sourceUpdatedAt,
          rawContentHash: sourceRecord.rawContentHash,
          normalizedContentHash,
          rawReference: sourceRecord.rawReference,
          normalizedPayload: sourceRecord.normalizedPayload,
          provenance: {
            connectorId: definition.connectorId,
            contextId: definition.contextId,
            source: sourceRecord.rawReference.source,
            locator: sourceRecord.rawReference.locator,
            syncRunId,
            normalizerId: sourceRecord.normalization.normalizerId,
            normalizerVersion: sourceRecord.normalization.normalizerVersion,
            normalizedSchemaVersion:
              sourceRecord.normalization.outputSchemaVersion,
          },
          evidenceStatus: "source_reported",
          translationStatus: "untranslated",
        });
      } else {
        counts.unchanged += 1;
      }

      nextRecords.push({
        ...sourceRecord,
        normalizedContentHash,
        firstSeenAt: earlier?.firstSeenAt ?? completedAt,
        lastSeenAt: completedAt,
      });
      previous.delete(sourceRecord.sourceRecordId);
    }

    for (const removed of previous.values()) {
      counts.removed += 1;
      const changeId = await sha256(stableJson({
        connectorId: definition.connectorId,
        contextId: definition.contextId,
        sourceRecordId: removed.sourceRecordId,
        changeType: "removed",
        rawContentHash: removed.rawContentHash,
        normalizedContentHash: removed.normalizedContentHash,
        normalization: removed.normalization,
        previousChangeId:
          latestChangeByRecord.get(removed.sourceRecordId)?.changeId ?? null,
      }));
      newChanges.push({
        version: 1,
        changeId,
        connectorId: definition.connectorId,
        connectorType: definition.connectorType,
        contextId: definition.contextId,
        sourceRecordId: removed.sourceRecordId,
        sourceRecordVersion: removed.sourceRecordVersion,
        previousChangeId:
          latestChangeByRecord.get(removed.sourceRecordId)?.changeId,
        changeType: "removed",
        synchronizedAt: completedAt,
        sourceUpdatedAt: removed.sourceUpdatedAt,
        rawContentHash: removed.rawContentHash,
        normalizedContentHash: removed.normalizedContentHash,
        rawReference: removed.rawReference,
        normalizedPayload: null,
        provenance: {
          connectorId: definition.connectorId,
          contextId: definition.contextId,
          source: removed.rawReference.source,
          locator: removed.rawReference.locator,
          syncRunId,
          normalizerId: removed.normalization.normalizerId,
          normalizerVersion: removed.normalization.normalizerVersion,
          normalizedSchemaVersion:
            removed.normalization.outputSchemaVersion,
        },
        evidenceStatus: "source_reported",
        translationStatus: "untranslated",
      });
    }

    const changeMap = new Map(
      state.recordChanges.map((change) => [
        change.changeId,
        change,
      ]),
    );
    newChanges.forEach((change) => {
      changeMap.set(change.changeId, change);
    });

    const run: ConnectorSyncRun = {
      version: 1,
      syncRunId,
      connectorId: definition.connectorId,
      contextId: definition.contextId,
      trigger: options.trigger,
      startedAt,
      completedAt,
      status: "succeeded",
      attemptCount,
      counts,
      checkpointBefore: state.checkpoint,
      checkpointAfter: batch.nextCheckpoint,
      rawReference: batch.rawReference,
    };
    const succeededState: ConnectorState = {
      ...state,
      authorizationStatus,
      healthStatus: "healthy",
      sourceFreshness: freshness(
        batch.sourceObservedAt,
        completedAt,
        definition.freshnessThresholdHours,
      ),
      lastSyncStartedAt: startedAt,
      lastSyncSucceededAt: completedAt,
      activeRun: undefined,
      checkpoint: batch.nextCheckpoint,
      errorStatus: undefined,
      records: nextRecords.sort((left, right) =>
        left.sourceRecordId.localeCompare(right.sourceRecordId)
      ),
      recordChanges: [...changeMap.values()],
      syncHistory: appendHistory(state, run),
    };
    await store.save(definition, succeededState);
    return succeededState;
  } catch (error) {
    const completedAt = now().toISOString();
    const sourceError = asSourceError(error);
    const attemptCount = "attemptCount" in sourceError
      && typeof sourceError.attemptCount === "number"
      ? sourceError.attemptCount
      : 1;
    const errorStatus: ConnectorErrorStatus = {
      category: sourceError.category,
      code: sourceError.code,
      message: sourceError.message,
      occurredAt: completedAt,
      retryable: sourceError.retryable,
      attemptCount,
    };
    const run: ConnectorSyncRun = {
      version: 1,
      syncRunId,
      connectorId: definition.connectorId,
      contextId: definition.contextId,
      trigger: options.trigger,
      startedAt,
      completedAt,
      status: "failed",
      attemptCount,
      counts: emptyCounts(),
      checkpointBefore: state.checkpoint,
      error: errorStatus,
    };
    const failedState: ConnectorState = {
      ...state,
      authorizationStatus,
      healthStatus: state.lastSyncSucceededAt ? "degraded" : "failed",
      sourceFreshness: freshness(
        state.sourceFreshness.sourceObservedAt,
        completedAt,
        definition.freshnessThresholdHours,
      ),
      lastSyncStartedAt: startedAt,
      activeRun: undefined,
      errorStatus,
      syncHistory: appendHistory(state, run),
    };
    await store.save(definition, failedState);
    return failedState;
  }
}

export class MemoryConnectorStateStore implements ConnectorStateStore {
  private readonly values = new Map<string, ConnectorState>();

  private key(definition: ConnectorDefinition): string {
    return `${definition.contextId}::${definition.connectorId}`;
  }

  async load(definition: ConnectorDefinition): Promise<ConnectorState | null> {
    return structuredClone(this.values.get(this.key(definition)) ?? null);
  }

  async save(
    definition: ConnectorDefinition,
    state: ConnectorState,
  ): Promise<void> {
    assertStateBoundary(definition, state);
    this.values.set(this.key(definition), structuredClone(state));
  }
}
