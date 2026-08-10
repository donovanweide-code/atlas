import { readFile } from "node:fs/promises";
import {
  MockUsbAdapter,
  WbdPrintBridge,
  createCutJobBatch,
  createReferencePieces,
  readBridgeConfiguration,
} from "../src/sportpaleis/direct-print/index.ts";

const configUrl = new URL("../config/sportpaleis-bridge.foundation-003.json", import.meta.url);
const configuration = readBridgeConfiguration(JSON.parse(await readFile(configUrl, "utf8")));
const [job] = createCutJobBatch({
  organizationId: "sport-2000-sportpaleis-bv",
  orderId: "FOUNDATION-003-MOCK",
  revision: 1,
  attemptIdPrefix: "local-mock",
  createdAt: "2026-08-07T12:00:00.000Z",
  pieces: createReferencePieces(),
  nesting: {
    absoluteMaxWidthMm: configuration.absoluteMaxWidthMm,
    preferredWorkingWidthMm: configuration.preferredWorkingWidthMm,
    minimumCutGapMm: configuration.minimumCutGapMm,
    edgeMarginMm: 3,
  },
}).jobs;

const bridge = new WbdPrintBridge(configuration, new MockUsbAdapter());
bridge.start(new Date("2026-08-07T12:00:00.000Z"));
const result = await bridge.process(job, new Date("2026-08-07T12:00:01.000Z"));
bridge.pause(new Date("2026-08-07T12:00:02.000Z"));

console.log(JSON.stringify({
  bridgeId: configuration.bridgeId,
  hardwareSendEnabled: configuration.hardwareSendEnabled,
  transport: "mock",
  attemptId: job.attemptId,
  result,
  finalBridgeStatus: bridge.status(),
  logEvents: bridge.logger().entries().map(({ event }) => event),
}, null, 2));
