import { sha256 } from "./sha256.ts";
import { createColorBatchPreview, type ColorBatchPreview } from "./preview.ts";
import type { BridgeStatus, CutBatch, CutJob, CutJobStatus } from "./types.ts";

export const WORKSPACE_BRIDGE_ENDPOINTS = {
  productionBatches: "/v1/production-batches",
  productionBatch: "/v1/production-batches/:cutBatchId",
  productionBatchPreview: "/v1/production-batches/:cutBatchId/preview",
  productionBatchReadiness: "/v1/production-batches/:cutBatchId/readiness",
  printAction: "/v1/production-batches/:cutBatchId/print-actions",
  heartbeat: "/v1/bridges/:bridgeId/heartbeat",
  availability: "/v1/bridges/:bridgeId/jobs/available",
  claim: "/v1/jobs/:cutJobId/claim",
  download: "/v1/jobs/:cutJobId/content",
  acknowledge: "/v1/jobs/:cutJobId/attempts/:attemptId/acknowledge",
} as const;

export type SummaStatusPlaceholder = "HARDWARE_VALIDATION_REQUIRED" | "NOT_CONNECTED" | "UNKNOWN";

export interface ProductionBatchReadiness {
  status: "READY_FOR_PRINTING" | "NOT_READY_FOR_PRINTING";
  ready: boolean;
  reasons: readonly string[];
}

export interface WorkspaceProductionBatchContract {
  cutBatchId: string;
  foilColor: string;
  objectCount: number;
  jobCount: number;
  preview: ColorBatchPreview;
  readiness: ProductionBatchReadiness;
  summaStatus: SummaStatusPlaceholder;
}

export interface PrintActionRequest {
  cutBatchId: string;
  requestedBy: string;
  requestedAt: string;
  confirmation: "PRINT";
}

export interface PrintActionContract {
  action: "PRINT_BATCH";
  hardwareSendEnabled: false;
  request: PrintActionRequest;
  accepted: false;
  reason: "HARDWARE_SEND_NOT_IMPLEMENTED";
}

export function createWorkspaceProductionBatchContract(batch: CutBatch): WorkspaceProductionBatchContract {
  return {
    cutBatchId: batch.cutBatchId,
    foilColor: batch.foilColor,
    objectCount: batch.objectIds.length,
    jobCount: batch.jobs.length,
    preview: createColorBatchPreview(batch),
    readiness: {
      status: batch.readyForPrinting ? "READY_FOR_PRINTING" : "NOT_READY_FOR_PRINTING",
      ready: batch.readyForPrinting,
      reasons: batch.notReadyReasons,
    },
    summaStatus: "HARDWARE_VALIDATION_REQUIRED",
  };
}

export function createOfflinePrintAction(request: PrintActionRequest): PrintActionContract {
  return {
    action: "PRINT_BATCH",
    hardwareSendEnabled: false,
    request,
    accepted: false,
    reason: "HARDWARE_SEND_NOT_IMPLEMENTED",
  };
}

export interface DeviceCapability {
  model: "Summa S75T";
  assetSerial: "410810-10007";
  units: "mm";
  protocols: readonly ["DMPL"];
  absoluteMaxWidthMm: 450;
  hardwareSendEnabled: false;
}

export interface DeviceHeartbeat {
  bridgeId: string;
  timestamp: string;
  status: BridgeStatus;
  capability: DeviceCapability;
}

export interface AvailableJob {
  cutJobId: string;
  orderId: string;
  revision: number;
  attemptId: string;
  contentHash: string;
  foilColor: string;
}

export interface SecureClaim {
  claimToken: string;
  cutJobId: string;
  attemptId: string;
  bridgeId: string;
  expiresAt: string;
}

export interface AttemptAcknowledgement {
  cutJobId: string;
  attemptId: string;
  contentHash: string;
  status: CutJobStatus;
  bytesAccepted: number;
  timestamp: string;
}

interface StoredJob {
  job: CutJob;
  claimedBy?: string;
  claimExpiresAt?: string;
  acknowledgements: AttemptAcknowledgement[];
}

/**
 * Lokale testdouble voor het uitgaande HTTPS-contract. Deze klasse opent geen
 * poort en voert geen netwerkverkeer uit; de bridge is conceptueel de client.
 */
export class MockWorkspaceBridgeServer {
  readonly #jobs = new Map<string, StoredJob>();
  readonly #heartbeats = new Map<string, DeviceHeartbeat>();
  readonly #claims = new Map<string, SecureClaim>();
  readonly #claimSecret: string;
  #claimSequence = 0;

  constructor(claimSecret = "foundation-003-mock-claim-secret") {
    this.#claimSecret = claimSecret;
  }

  publish(job: CutJob): void {
    this.#jobs.set(job.cutJobId, { job, acknowledgements: [] });
  }

  heartbeat(value: DeviceHeartbeat): void {
    if (value.capability.hardwareSendEnabled !== false) {
      throw new Error("Foundation 003 accepteert geen hardware-enabled heartbeat.");
    }
    this.#heartbeats.set(value.bridgeId, structuredClone(value));
  }

  lastHeartbeat(bridgeId: string): DeviceHeartbeat | undefined {
    const heartbeat = this.#heartbeats.get(bridgeId);
    return heartbeat ? structuredClone(heartbeat) : undefined;
  }

  available(bridgeId: string, now: Date): AvailableJob[] {
    return [...this.#jobs.values()]
      .filter((stored) => !stored.claimedBy || new Date(stored.claimExpiresAt ?? 0).getTime() <= now.getTime() || stored.claimedBy === bridgeId)
      .filter((stored) => !stored.acknowledgements.some(({ status }) => status === "SENT" || status === "UNKNOWN_PARTIAL_SEND"))
      .map(({ job }) => ({
        cutJobId: job.cutJobId,
        orderId: job.orderId,
        revision: job.revision,
        attemptId: job.attemptId,
        contentHash: job.contentHash,
        foilColor: job.material.foilColor,
      }));
  }

  claim(cutJobId: string, attemptId: string, bridgeId: string, now: Date, leaseMs: number): SecureClaim {
    const stored = this.#jobs.get(cutJobId);
    if (!stored || stored.job.attemptId !== attemptId) throw new Error("JOB_NOT_AVAILABLE");
    if (stored.acknowledgements.some(({ status }) => status === "SENT" || status === "UNKNOWN_PARTIAL_SEND")) {
      throw new Error("JOB_ALREADY_TERMINAL");
    }
    if (stored.claimedBy && stored.claimedBy !== bridgeId
      && new Date(stored.claimExpiresAt ?? 0).getTime() > now.getTime()) throw new Error("JOB_ALREADY_CLAIMED");
    const expiresAt = new Date(now.getTime() + leaseMs).toISOString();
    stored.claimedBy = bridgeId;
    stored.claimExpiresAt = expiresAt;
    this.#claimSequence += 1;
    const claim = {
      claimToken: sha256(`${this.#claimSecret}:${this.#claimSequence}:${cutJobId}:${attemptId}:${bridgeId}:${expiresAt}`),
      cutJobId,
      attemptId,
      bridgeId,
      expiresAt,
    };
    this.#claims.set(claim.claimToken, claim);
    return structuredClone(claim);
  }

  download(claim: SecureClaim, now: Date): CutJob {
    const registeredClaim = this.#claims.get(claim.claimToken);
    if (!registeredClaim || JSON.stringify(registeredClaim) !== JSON.stringify(claim)) throw new Error("INVALID_CLAIM_TOKEN");
    const stored = this.#jobs.get(claim.cutJobId);
    if (!stored || stored.claimedBy !== claim.bridgeId || stored.job.attemptId !== claim.attemptId) throw new Error("INVALID_CLAIM");
    if (new Date(claim.expiresAt).getTime() <= now.getTime()) throw new Error("CLAIM_EXPIRED");
    return structuredClone(stored.job);
  }

  acknowledge(claim: SecureClaim, value: AttemptAcknowledgement): void {
    const registeredClaim = this.#claims.get(claim.claimToken);
    if (!registeredClaim || JSON.stringify(registeredClaim) !== JSON.stringify(claim)) throw new Error("INVALID_CLAIM_TOKEN");
    const stored = this.#jobs.get(claim.cutJobId);
    if (!stored || stored.claimedBy !== claim.bridgeId) throw new Error("INVALID_CLAIM");
    if (value.contentHash !== stored.job.contentHash || value.attemptId !== stored.job.attemptId) throw new Error("ACKNOWLEDGEMENT_MISMATCH");
    stored.acknowledgements.push(structuredClone(value));
  }

  acknowledgements(cutJobId: string): readonly AttemptAcknowledgement[] {
    return structuredClone(this.#jobs.get(cutJobId)?.acknowledgements ?? []);
  }
}
