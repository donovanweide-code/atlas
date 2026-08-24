import { recomputeContentHash } from "./cut-job.ts";
import { generateDmpl } from "./dmpl.ts";
import { validateGeometry } from "./geometry.ts";
import { JobLifecycleLedger } from "./lifecycle.ts";
import {
  BRIDGE_STATUS,
  CUT_JOB_STATUS,
  type BridgeStatus,
  type CutJob,
} from "./types.ts";
import { SPORTPALEIS_MACHINE_CONSTRAINTS } from "./production-constraints.ts";

export interface SafeDeviceIdentity {
  expectedModel: "Summa S75T";
  assetSerial: "410810-10007";
  logicalUsbPort: 1 | 2 | 3 | 4;
  expectedHardwareIds: readonly string[];
  expectedDeviceInstanceId?: string;
  expectedContainerId?: string;
  expectedDriverProvider: "Summa";
}

export interface BridgeConfiguration {
  bridgeId: string;
  hardwareSendEnabled: false;
  absoluteMaxWidthMm: number;
  preferredWorkingWidthMm: number;
  minimumCutGapMm: number;
  pollIntervalMs: number;
  claimLeaseMs: number;
  device: SafeDeviceIdentity;
}

export const DEFAULT_BRIDGE_CONFIGURATION: BridgeConfiguration = {
  bridgeId: "wbd-sportpaleis-bridge-001",
  hardwareSendEnabled: false,
  absoluteMaxWidthMm: SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm,
  preferredWorkingWidthMm: 440,
  minimumCutGapMm: 6.4,
  pollIntervalMs: 2_000,
  claimLeaseMs: 30_000,
  device: {
    expectedModel: "Summa S75T",
    assetSerial: "410810-10007",
    logicalUsbPort: 1,
    expectedHardwareIds: [],
    expectedDriverProvider: "Summa",
  },
};

export function readBridgeConfiguration(value: unknown): BridgeConfiguration {
  if (!value || typeof value !== "object") throw new Error("Bridgeconfiguratie ontbreekt.");
  const candidate = value as Partial<BridgeConfiguration>;
  if (candidate.hardwareSendEnabled !== false) throw new Error("hardwareSendEnabled moet in Foundation 003 false zijn.");
  if (!Number.isFinite(candidate.absoluteMaxWidthMm)
    || (candidate.absoluteMaxWidthMm ?? 0) <= 0
    || (candidate.absoluteMaxWidthMm ?? 0) > SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm) {
    throw new Error(`absoluteMaxWidthMm moet tussen 0 en ${SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm} mm liggen.`);
  }
  if (!Number.isFinite(candidate.minimumCutGapMm) || (candidate.minimumCutGapMm ?? -1) < 0) {
    throw new Error("minimumCutGapMm moet een configureerbare, niet-negatieve millimeterwaarde zijn.");
  }
  if (!candidate.device || candidate.device.expectedModel !== "Summa S75T" || candidate.device.assetSerial !== "410810-10007") {
    throw new Error("Onjuiste of ontbrekende veilige device-identiteit.");
  }
  return candidate as BridgeConfiguration;
}

export interface BridgeLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  event: string;
  attemptId?: string;
  detail?: string;
}

export class BridgeLogger {
  readonly #entries: BridgeLogEntry[] = [];

  write(entry: BridgeLogEntry): void {
    this.#entries.push(Object.freeze({ ...entry }));
  }

  entries(): readonly BridgeLogEntry[] {
    return [...this.#entries];
  }
}

export interface TransportResult {
  status: "SENT" | "PARTIAL";
  bytesAccepted: number;
  detail?: string;
}

export interface CutTransport {
  readonly kind: "mock" | "hardware-disabled";
  status(): "CONNECTED" | "NOT_CONNECTED" | "BUSY";
  send(bytes: Uint8Array, onChunkAccepted: (size: number) => void): Promise<TransportResult>;
}

export interface MockUsbOptions {
  connected?: boolean;
  busy?: boolean;
  disconnectAfterBytes?: number;
}

export class MockUsbAdapter implements CutTransport {
  readonly kind = "mock" as const;
  #connected: boolean;
  #busy: boolean;
  #disconnectAfterBytes?: number;

  constructor(options: MockUsbOptions = {}) {
    this.#connected = options.connected ?? true;
    this.#busy = options.busy ?? false;
    this.#disconnectAfterBytes = options.disconnectAfterBytes;
  }

  status(): "CONNECTED" | "NOT_CONNECTED" | "BUSY" {
    if (!this.#connected) return "NOT_CONNECTED";
    return this.#busy ? "BUSY" : "CONNECTED";
  }

  setConnected(connected: boolean): void {
    this.#connected = connected;
  }

  setBusy(busy: boolean): void {
    this.#busy = busy;
  }

  async send(bytes: Uint8Array, onChunkAccepted: (size: number) => void): Promise<TransportResult> {
    if (!this.#connected) return { status: "PARTIAL", bytesAccepted: 0, detail: "MOCK_USB_DISCONNECTED" };
    if (this.#busy) return { status: "PARTIAL", bytesAccepted: 0, detail: "MOCK_USB_BUSY" };
    let bytesAccepted = 0;
    for (let offset = 0; offset < bytes.length; offset += 256) {
      const chunkSize = Math.min(256, bytes.length - offset);
      if (this.#disconnectAfterBytes !== undefined && bytesAccepted + chunkSize > this.#disconnectAfterBytes) {
        const acceptedBeforeDisconnect = Math.max(0, this.#disconnectAfterBytes - bytesAccepted);
        if (acceptedBeforeDisconnect > 0) {
          bytesAccepted += acceptedBeforeDisconnect;
          onChunkAccepted(acceptedBeforeDisconnect);
        }
        this.#connected = false;
        return { status: "PARTIAL", bytesAccepted, detail: "MOCK_USB_DISCONNECTED_DURING_SEND" };
      }
      bytesAccepted += chunkSize;
      onChunkAccepted(chunkSize);
      await Promise.resolve();
    }
    return { status: "SENT", bytesAccepted };
  }
}

export class HardwareDisabledSummaAdapter implements CutTransport {
  readonly kind = "hardware-disabled" as const;

  status(): "NOT_CONNECTED" {
    return "NOT_CONNECTED";
  }

  async send(): Promise<TransportResult> {
    throw new Error("HARDWARE_SEND_DISABLED_FOUNDATION_003");
  }
}

export class WbdPrintBridge {
  readonly #configuration: BridgeConfiguration;
  readonly #transport: CutTransport;
  readonly #ledger: JobLifecycleLedger;
  readonly #logger: BridgeLogger;
  #running = false;
  #paused = false;
  #killed = false;
  #status: BridgeStatus = BRIDGE_STATUS.OFFLINE;

  constructor(
    configuration: BridgeConfiguration,
    transport: CutTransport,
    ledger = new JobLifecycleLedger(),
    logger = new BridgeLogger(),
  ) {
    this.#configuration = readBridgeConfiguration(configuration);
    this.#transport = transport;
    this.#ledger = ledger;
    this.#logger = logger;
  }

  start(now = new Date()): void {
    if (this.#killed) throw new Error("Bridge kill-switch is actief.");
    this.#running = true;
    this.#paused = false;
    this.#status = this.#transport.status() === "CONNECTED" ? BRIDGE_STATUS.CONNECTED
      : this.#transport.status() === "BUSY" ? BRIDGE_STATUS.BUSY
        : BRIDGE_STATUS.NOT_CONNECTED;
    this.#logger.write({ timestamp: now.toISOString(), level: "INFO", event: "BRIDGE_STARTED" });
  }

  pause(now = new Date()): void {
    this.#paused = true;
    this.#status = BRIDGE_STATUS.OFFLINE;
    this.#logger.write({ timestamp: now.toISOString(), level: "INFO", event: "BRIDGE_PAUSED" });
  }

  kill(now = new Date()): void {
    this.#killed = true;
    this.#running = false;
    this.#paused = true;
    this.#status = BRIDGE_STATUS.OFFLINE;
    this.#logger.write({ timestamp: now.toISOString(), level: "WARN", event: "KILL_SWITCH_ACTIVATED" });
  }

  gracefulRestart(now = new Date()): void {
    if (this.#killed) throw new Error("Bridge kan niet herstarten zolang de kill-switch actief is.");
    this.pause(now);
    this.start(new Date(now.getTime() + 1));
  }

  status(): BridgeStatus {
    return this.#status;
  }

  logger(): BridgeLogger {
    return this.#logger;
  }

  ledger(): JobLifecycleLedger {
    return this.#ledger;
  }

  async process(job: CutJob, now = new Date()): Promise<CutJobStatusResult> {
    if (!this.#running || this.#paused || this.#killed) throw new Error("BRIDGE_NOT_AVAILABLE");
    if (this.#transport.kind !== "mock") throw new Error("HARDWARE_SEND_DISABLED_FOUNDATION_003");
    if (this.#ledger.get(job.attemptId)?.status === CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND) {
      throw new Error("UNKNOWN_PARTIAL_SEND_REQUIRES_HUMAN_REVIEW");
    }
    if (recomputeContentHash(job) !== job.contentHash) throw new Error("CONTENT_HASH_MISMATCH");
    const geometry = validateGeometry(job.productionGeometry.contours, this.#configuration.absoluteMaxWidthMm);
    if (!geometry.valid) throw new Error(`LOCAL_GEOMETRY_VALIDATION_FAILED:${geometry.issues.map(({ code }) => code).join(",")}`);
    if (this.#transport.status() === "BUSY") {
      this.#status = BRIDGE_STATUS.BUSY;
      throw new Error("TRANSPORT_BUSY");
    }
    if (this.#transport.status() === "NOT_CONNECTED") {
      this.#status = BRIDGE_STATUS.NOT_CONNECTED;
      throw new Error("TRANSPORT_NOT_CONNECTED");
    }

    this.#ledger.claim(job, this.#configuration.bridgeId, now, this.#configuration.claimLeaseMs);
    this.#ledger.transition(job.attemptId, CUT_JOB_STATUS.RECEIVED, now);
    this.#status = BRIDGE_STATUS.JOB_RECEIVED;
    const dmpl = generateDmpl(job);
    this.#ledger.transition(job.attemptId, CUT_JOB_STATUS.SENDING, now);
    const result = await this.#transport.send(dmpl.bytes, (size) => {
      this.#ledger.recordBytes(job.attemptId, size);
    });
    if (result.status === "PARTIAL") {
      const failed = this.#ledger.markTransportFailure(job.attemptId, new Date(now.getTime() + 1), result.detail ?? "TRANSPORT_PARTIAL");
      this.#status = failed.status === CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND
        ? BRIDGE_STATUS.UNKNOWN_PARTIAL_SEND
        : BRIDGE_STATUS.ERROR;
      this.#logger.write({ timestamp: now.toISOString(), level: "ERROR", event: failed.status, attemptId: job.attemptId, detail: result.detail });
      return { status: failed.status, bytesAccepted: result.bytesAccepted };
    }
    const sent = this.#ledger.transition(job.attemptId, CUT_JOB_STATUS.SENT, new Date(now.getTime() + 1));
    this.#status = BRIDGE_STATUS.SENT;
    this.#logger.write({ timestamp: now.toISOString(), level: "INFO", event: "JOB_SENT_TO_MOCK", attemptId: job.attemptId });
    return { status: sent.status, bytesAccepted: result.bytesAccepted };
  }
}

export interface CutJobStatusResult {
  status: CutJob["status"];
  bytesAccepted: number;
}
