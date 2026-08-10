import { CUT_JOB_STATUS, type CutJob, type CutJobStatus } from "./types.ts";

export interface JobLease {
  ownerId: string;
  claimedAt: string;
  expiresAt: string;
}

export interface JobHistoryEntry {
  at: string;
  from: CutJobStatus;
  to: CutJobStatus;
  reason?: string;
}

export interface JobLedgerRecord {
  job: CutJob;
  status: CutJobStatus;
  lease?: JobLease;
  bytesSent: number;
  history: readonly JobHistoryEntry[];
}

const ALLOWED_TRANSITIONS: Readonly<Record<CutJobStatus, readonly CutJobStatus[]>> = {
  CREATED: [CUT_JOB_STATUS.VALIDATED, CUT_JOB_STATUS.CANCELLED, CUT_JOB_STATUS.FAILED],
  VALIDATED: [CUT_JOB_STATUS.READY, CUT_JOB_STATUS.CANCELLED, CUT_JOB_STATUS.FAILED],
  READY: [CUT_JOB_STATUS.CLAIMED, CUT_JOB_STATUS.CANCELLED, CUT_JOB_STATUS.FAILED],
  CLAIMED: [CUT_JOB_STATUS.RECEIVED, CUT_JOB_STATUS.READY, CUT_JOB_STATUS.CANCELLED, CUT_JOB_STATUS.FAILED],
  RECEIVED: [CUT_JOB_STATUS.SENDING, CUT_JOB_STATUS.CANCELLED, CUT_JOB_STATUS.FAILED],
  SENDING: [CUT_JOB_STATUS.SENT, CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND, CUT_JOB_STATUS.FAILED],
  SENT: [],
  UNKNOWN_PARTIAL_SEND: [],
  CANCELLED: [],
  FAILED: [],
};

function idempotencyKey(job: CutJob): string {
  return `${job.cutBatchId}:${job.nesting.sheetIndex}`;
}

export class JobLifecycleLedger {
  readonly #records = new Map<string, JobLedgerRecord>();

  register(job: CutJob): JobLedgerRecord {
    const existing = this.#records.get(job.attemptId);
    if (existing) {
      if (existing.job.contentHash !== job.contentHash) {
        throw new Error("Attempt-ID bestaat al met een andere content hash.");
      }
      return existing;
    }
    const record: JobLedgerRecord = {
      job,
      status: job.status,
      bytesSent: 0,
      history: [],
    };
    this.#records.set(job.attemptId, record);
    return record;
  }

  get(attemptId: string): JobLedgerRecord | undefined {
    return this.#records.get(attemptId);
  }

  claim(job: CutJob, ownerId: string, now: Date, leaseMs: number): JobLedgerRecord {
    const record = this.register(job);
    const duplicate = [...this.#records.values()].find((candidate) =>
      candidate.job.attemptId !== job.attemptId
      && idempotencyKey(candidate.job) === idempotencyKey(job)
      && candidate.job.contentHash === job.contentHash
      && (candidate.status === CUT_JOB_STATUS.SENT
        || candidate.status === CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND));
    if (duplicate) {
      throw new Error(duplicate.status === CUT_JOB_STATUS.SENT
        ? "DUPLICATE_SEND_BLOCKED"
        : "UNKNOWN_PARTIAL_SEND_REQUIRES_HUMAN_REVIEW");
    }
    if (record.status === CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND) {
      throw new Error("UNKNOWN_PARTIAL_SEND_REQUIRES_HUMAN_REVIEW");
    }
    if (record.status !== CUT_JOB_STATUS.READY) throw new Error(`Job is niet claimbaar vanuit ${record.status}.`);
    return this.transition(job.attemptId, CUT_JOB_STATUS.CLAIMED, now, undefined, {
      ownerId,
      claimedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
    });
  }

  transition(
    attemptId: string,
    target: CutJobStatus,
    at: Date,
    reason?: string,
    lease?: JobLease,
  ): JobLedgerRecord {
    const current = this.#records.get(attemptId);
    if (!current) throw new Error(`Onbekende attempt ${attemptId}.`);
    if (!ALLOWED_TRANSITIONS[current.status].includes(target)) {
      throw new Error(`Ongeldige statusovergang ${current.status} -> ${target}.`);
    }
    const next: JobLedgerRecord = {
      ...current,
      status: target,
      ...(lease ? { lease } : target === CUT_JOB_STATUS.READY ? { lease: undefined } : {}),
      history: [...current.history, { at: at.toISOString(), from: current.status, to: target, ...(reason ? { reason } : {}) }],
    };
    this.#records.set(attemptId, next);
    return next;
  }

  recordBytes(attemptId: string, bytesSent: number): JobLedgerRecord {
    const current = this.#records.get(attemptId);
    if (!current) throw new Error(`Onbekende attempt ${attemptId}.`);
    if (current.status !== CUT_JOB_STATUS.SENDING) throw new Error("Bytes kunnen alleen tijdens SENDING worden geregistreerd.");
    const next = { ...current, bytesSent: current.bytesSent + bytesSent };
    this.#records.set(attemptId, next);
    return next;
  }

  markTransportFailure(attemptId: string, at: Date, reason: string): JobLedgerRecord {
    const current = this.#records.get(attemptId);
    if (!current) throw new Error(`Onbekende attempt ${attemptId}.`);
    return this.transition(
      attemptId,
      current.bytesSent > 0 ? CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND : CUT_JOB_STATUS.FAILED,
      at,
      reason,
    );
  }

  expireLease(attemptId: string, now: Date): JobLedgerRecord {
    const current = this.#records.get(attemptId);
    if (!current?.lease) throw new Error("Attempt heeft geen lease.");
    if (new Date(current.lease.expiresAt).getTime() > now.getTime()) throw new Error("Lease is nog geldig.");
    return this.transition(attemptId, CUT_JOB_STATUS.READY, now, "LEASE_EXPIRED");
  }
}
