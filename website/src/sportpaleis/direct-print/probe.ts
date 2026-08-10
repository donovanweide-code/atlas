import type { SafeDeviceIdentity } from "./bridge.ts";

export interface PnpDeviceSnapshot {
  friendlyName: string;
  present: boolean;
  status: string;
  hardwareIds: readonly string[];
  deviceInstanceId: string;
  containerId?: string;
  classGuid?: string;
  driverProvider?: string;
  driverVersion?: string;
  driverService?: string;
}

export interface SummaDllSnapshot {
  configuredPath: string;
  exists: boolean;
  version?: string;
  architecture?: "x86" | "x64" | "unknown";
  signatureStatus?: string;
  signer?: string;
}

export interface SummaProbeSnapshot {
  capturedAt: string;
  computerName: string;
  operatingSystem: string;
  devices: readonly PnpDeviceSnapshot[];
  dll: SummaDllSnapshot;
  writeCapabilityTested: false;
}

export interface ProbeEvaluation {
  connected: boolean;
  identityMatch: boolean;
  driverReady: boolean;
  dllReady: boolean;
  hardwareValidationRequired: true;
  matchedDevice?: PnpDeviceSnapshot;
  reasons: readonly string[];
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

export function evaluateProbeSnapshot(
  snapshot: SummaProbeSnapshot,
  expected: SafeDeviceIdentity,
): ProbeEvaluation {
  if (snapshot.writeCapabilityTested !== false) throw new Error("Probe mag geen schrijfproef bevatten.");
  const reasons: string[] = [];
  const matchedDevice = snapshot.devices.find((device) => {
    if (!device.present) return false;
    if (expected.expectedDeviceInstanceId
      && normalize(device.deviceInstanceId) === normalize(expected.expectedDeviceInstanceId)) return true;
    return expected.expectedHardwareIds.length > 0
      && expected.expectedHardwareIds.every((hardwareId) =>
        device.hardwareIds.some((candidate) => normalize(candidate) === normalize(hardwareId)));
  });
  const connected = Boolean(matchedDevice);
  const identityMatch = Boolean(matchedDevice)
    && (!expected.expectedContainerId
      || normalize(matchedDevice?.containerId ?? "") === normalize(expected.expectedContainerId));
  const driverReady = Boolean(matchedDevice?.driverProvider
    && normalize(matchedDevice.driverProvider).includes(normalize(expected.expectedDriverProvider))
    && matchedDevice.status.toLowerCase() === "ok");
  const dllReady = snapshot.dll.exists
    && snapshot.dll.signatureStatus === "Valid"
    && snapshot.dll.architecture !== "unknown";
  if (!connected) reasons.push("EXPECTED_PNP_DEVICE_NOT_PRESENT");
  if (connected && !identityMatch) reasons.push("DEVICE_IDENTITY_MISMATCH");
  if (!driverReady) reasons.push("SUMMA_DRIVER_NOT_READY");
  if (!dllReady) reasons.push("SUMMA_DLL_NOT_VERIFIED");
  return {
    connected,
    identityMatch,
    driverReady,
    dllReady,
    hardwareValidationRequired: true,
    ...(matchedDevice ? { matchedDevice } : {}),
    reasons,
  };
}

export class MockWindowsProbe {
  readonly #snapshot: SummaProbeSnapshot;

  constructor(snapshot: SummaProbeSnapshot) {
    this.#snapshot = structuredClone(snapshot);
  }

  capture(): SummaProbeSnapshot {
    return structuredClone(this.#snapshot);
  }
}
