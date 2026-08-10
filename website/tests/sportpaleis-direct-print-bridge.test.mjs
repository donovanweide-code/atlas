import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BRIDGE_STATUS,
  CUT_JOB_STATUS,
  DEFAULT_BRIDGE_CONFIGURATION,
  HardwareDisabledSummaAdapter,
  JobLifecycleLedger,
  MockUsbAdapter,
  MockWindowsProbe,
  MockWorkspaceBridgeServer,
  WbdPrintBridge,
  createCutJobBatch,
  evaluateProbeSnapshot,
} from "../src/sportpaleis/direct-print/index.ts";

function readyJob(attemptIdPrefix = "attempt") {
  return createCutJobBatch({
    organizationId: "sportpaleis",
    orderId: "ORDER-BRIDGE-001",
    revision: 1,
    attemptIdPrefix,
    createdAt: "2026-08-07T12:00:00.000Z",
    pieces: [{
      id: "piece",
      label: "Rugnummer 2",
      product: "Test",
      material: { code: "WHITE", foilColor: "Wit" },
      contours: [{
        id: "contour",
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 },
          { x: 0, y: 0 },
        ],
      }],
      productionRule: { mirror: true, rotation: 90 },
    }],
    nesting: {
      absoluteMaxWidthMm: 450,
      preferredWorkingWidthMm: 440,
      minimumCutGapMm: 5,
      edgeMarginMm: 3,
    },
  }).jobs[0];
}

test("mock bridge start, verzending en graceful restart werken zonder hardware", async () => {
  const bridge = new WbdPrintBridge(DEFAULT_BRIDGE_CONFIGURATION, new MockUsbAdapter());
  bridge.start();
  assert.equal(bridge.status(), BRIDGE_STATUS.CONNECTED);
  const result = await bridge.process(readyJob());
  assert.equal(result.status, CUT_JOB_STATUS.SENT);
  assert.equal(bridge.status(), BRIDGE_STATUS.SENT);
  bridge.gracefulRestart();
  assert.equal(bridge.status(), BRIDGE_STATUS.CONNECTED);
  assert.ok(bridge.logger().entries().some(({ event }) => event === "BRIDGE_PAUSED"));
});

test("dezelfde job/revision/hash kan niet dubbel worden verzonden", async () => {
  const ledger = new JobLifecycleLedger();
  const bridge = new WbdPrintBridge(DEFAULT_BRIDGE_CONFIGURATION, new MockUsbAdapter(), ledger);
  bridge.start();
  await bridge.process(readyJob("attempt-first"));
  await assert.rejects(() => bridge.process(readyJob("attempt-second")), /DUPLICATE_SEND_BLOCKED/);
});

test("USB-verlies tijdens mock-send wordt UNKNOWN_PARTIAL_SEND en retry blijft verboden", async () => {
  const ledger = new JobLifecycleLedger();
  const bridge = new WbdPrintBridge(
    DEFAULT_BRIDGE_CONFIGURATION,
    new MockUsbAdapter({ disconnectAfterBytes: 50 }),
    ledger,
  );
  const job = readyJob();
  bridge.start();
  const result = await bridge.process(job);
  assert.equal(result.status, CUT_JOB_STATUS.UNKNOWN_PARTIAL_SEND);
  assert.ok(result.bytesAccepted > 0);
  assert.equal(bridge.status(), BRIDGE_STATUS.UNKNOWN_PARTIAL_SEND);
  await assert.rejects(() => bridge.process(job), /UNKNOWN_PARTIAL_SEND_REQUIRES_HUMAN_REVIEW/);
});

test("USB-verlies vóór de eerste byte is FAILED en geen partial-send", async () => {
  const bridge = new WbdPrintBridge(
    DEFAULT_BRIDGE_CONFIGURATION,
    new MockUsbAdapter({ disconnectAfterBytes: 0 }),
  );
  bridge.start();
  const result = await bridge.process(readyJob());
  assert.equal(result.status, CUT_JOB_STATUS.FAILED);
  assert.equal(result.bytesAccepted, 0);
});

test("busy status voorkomt claim en verzending", async () => {
  const bridge = new WbdPrintBridge(DEFAULT_BRIDGE_CONFIGURATION, new MockUsbAdapter({ busy: true }));
  bridge.start();
  assert.equal(bridge.status(), BRIDGE_STATUS.BUSY);
  await assert.rejects(() => bridge.process(readyJob()), /TRANSPORT_BUSY/);
});

test("kill-switch blokkeert verwerking en herstart", async () => {
  const bridge = new WbdPrintBridge(DEFAULT_BRIDGE_CONFIGURATION, new MockUsbAdapter());
  bridge.start();
  bridge.kill();
  assert.equal(bridge.status(), BRIDGE_STATUS.OFFLINE);
  await assert.rejects(() => bridge.process(readyJob()), /BRIDGE_NOT_AVAILABLE/);
  assert.throws(() => bridge.gracefulRestart(), /kill-switch/);
});

test("hardware-adapter is hard disabled en kan niet verzenden", async () => {
  const hardware = new HardwareDisabledSummaAdapter();
  await assert.rejects(() => hardware.send(new Uint8Array(), () => undefined), /HARDWARE_SEND_DISABLED/);
  const bridge = new WbdPrintBridge(DEFAULT_BRIDGE_CONFIGURATION, hardware);
  bridge.start();
  await assert.rejects(() => bridge.process(readyJob()), /HARDWARE_SEND_DISABLED/);
});

test("probe evalueert PnP, driver, DLL en device identity alleen-lezen via fixtures", () => {
  const snapshot = {
    capturedAt: "2026-08-07T12:00:00.000Z",
    computerName: "SPORTPALEIS-PC",
    operatingSystem: "Windows",
    devices: [{
      friendlyName: "Summa S Class",
      present: true,
      status: "OK",
      hardwareIds: ["USB\\VID_TEST&PID_TEST"],
      deviceInstanceId: "USB\\VID_TEST&PID_TEST\\INSTANCE",
      containerId: "container-001",
      driverProvider: "Summa nv",
      driverVersion: "test",
    }],
    dll: {
      configuredPath: "C:\\Program Files\\Summa\\SummaUsb.dll",
      exists: true,
      version: "test",
      architecture: "x64",
      signatureStatus: "Valid",
      signer: "Summa",
    },
    writeCapabilityTested: false,
  };
  const probe = new MockWindowsProbe(snapshot);
  const evaluation = evaluateProbeSnapshot(probe.capture(), {
    ...DEFAULT_BRIDGE_CONFIGURATION.device,
    expectedHardwareIds: ["USB\\VID_TEST&PID_TEST"],
    expectedContainerId: "container-001",
  });
  assert.equal(evaluation.connected, true);
  assert.equal(evaluation.identityMatch, true);
  assert.equal(evaluation.driverReady, true);
  assert.equal(evaluation.dllReady, true);
  assert.equal(evaluation.hardwareValidationRequired, true);
});

test("PowerShell-probe bevat alleen inventarisatie en geen Summa-writepad", async () => {
  const source = await readFile(new URL("../scripts/summa-bridge-probe.ps1", import.meta.url), "utf8");
  assert.match(source, /Get-PnpDevice/);
  assert.match(source, /Get-AuthenticodeSignature/);
  assert.match(source, /writeCapabilityTested = \$false/);
  assert.doesNotMatch(source, /WriteFile|PIPE01|open_file\s*\(/i);
});

test("Workspace-contract werkt via mock met claim, hash en acknowledgement", () => {
  const server = new MockWorkspaceBridgeServer();
  const job = readyJob();
  const now = new Date("2026-08-07T12:00:00.000Z");
  server.publish(job);
  server.heartbeat({
    bridgeId: DEFAULT_BRIDGE_CONFIGURATION.bridgeId,
    timestamp: now.toISOString(),
    status: BRIDGE_STATUS.CONNECTED,
    capability: {
      model: "Summa S75T",
      assetSerial: "410810-10007",
      units: "mm",
      protocols: ["DMPL"],
      absoluteMaxWidthMm: 450,
      hardwareSendEnabled: false,
    },
  });
  assert.equal(server.available(DEFAULT_BRIDGE_CONFIGURATION.bridgeId, now).length, 1);
  const claim = server.claim(job.cutJobId, job.attemptId, DEFAULT_BRIDGE_CONFIGURATION.bridgeId, now, 30_000);
  assert.throws(
    () => server.download({ ...claim, claimToken: "tampered" }, now),
    /INVALID_CLAIM_TOKEN/,
  );
  assert.equal(server.download(claim, now).contentHash, job.contentHash);
  server.acknowledge(claim, {
    cutJobId: job.cutJobId,
    attemptId: job.attemptId,
    contentHash: job.contentHash,
    status: CUT_JOB_STATUS.SENT,
    bytesAccepted: 100,
    timestamp: now.toISOString(),
  });
  assert.equal(server.available(DEFAULT_BRIDGE_CONFIGURATION.bridgeId, now).length, 0);
});

test("de nieuwe runtime heeft geen Illustrator- of WinPlot-dependency", async () => {
  const files = ["bridge.ts", "cut-job.ts", "dmpl.ts", "index.ts"];
  const sources = await Promise.all(files.map((name) =>
    readFile(new URL(`../src/sportpaleis/direct-print/${name}`, import.meta.url), "utf8")));
  assert.doesNotMatch(sources.join("\n"), /from\s+["'][^"']*(Illustrator|WinPlot)|require\([^)]*(Illustrator|WinPlot)/i);
});
