import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncConnector } from "../src/atlas-connectors.ts";
import { createWbdSitemapConnector } from "../src/atlas-connector-wbd-sitemap.ts";
import { FileConnectorStateStore } from "./atlas-connector-file-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteDirectory = path.resolve(scriptDirectory, "..");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sourceUrl = argument("--source-url")
  ?? process.env.ATLAS_WBD_SITEMAP_URL
  ?? "https://preview.webuildanddesign.nl/sitemap.xml";
const contextId = argument("--context-id")
  ?? process.env.ATLAS_CONNECTOR_CONTEXT_ID
  ?? "organization:wbd";
const connectorId = argument("--connector-id")
  ?? process.env.ATLAS_CONNECTOR_ID
  ?? "wbd-preview-sitemap";
const dataDirectory = path.resolve(
  argument("--data-dir")
    ?? process.env.ATLAS_CONNECTOR_DATA_DIR
    ?? path.join(websiteDirectory, ".atlas-data", "connectors-v2"),
);

const { definition, adapter, normalizer } = createWbdSitemapConnector({
  sourceUrl,
  contextId,
  connectorId,
});
const store = new FileConnectorStateStore(dataDirectory);
const state = await syncConnector(definition, adapter, normalizer, store, {
  trigger: "manual",
});
const latestRun = state.syncHistory.at(-1);

const report = {
  connector: {
    connectorId: state.connectorId,
    connectorType: state.connectorType,
    contextId: state.contextId,
  },
  authorizationStatus: state.authorizationStatus,
  healthStatus: state.healthStatus,
  sourceFreshness: state.sourceFreshness,
  lastSyncStartedAt: state.lastSyncStartedAt,
  lastSyncSucceededAt: state.lastSyncSucceededAt,
  counts: latestRun?.counts,
  attemptCount: latestRun?.attemptCount,
  checkpoint: state.checkpoint,
  errorStatus: state.errorStatus,
  stateFile: store.statePath(definition),
};

console.log(JSON.stringify(report, null, 2));
if (latestRun?.status !== "succeeded") process.exitCode = 1;
