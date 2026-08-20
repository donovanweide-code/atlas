import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncConnector } from "../src/atlas-connectors.ts";
import {
  WBD_HOMEPAGE_CONNECTOR_ID,
  WBD_HOMEPAGE_CONTEXT_ID,
  WBD_HOMEPAGE_SOURCE_URL,
  createWbdHomepageConnector,
  projectWbdHomepageObservationFeed,
} from "../src/atlas-connector-wbd-homepage.ts";
import { FileConnectorStateStore } from "./atlas-connector-file-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteDirectory = path.resolve(scriptDirectory, "..");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function metadataHtml({
  title = "We Build And Design — Eerst begrijpen, dan verbeteren",
  description = "We Build And Design begrijpt eerst hoe je organisatie werkt en helpt daarna gericht te verbeteren wat nodig is.",
  openGraphTitle = "We Build And Design — Eerst begrijpen, dan verbeteren",
  openGraphDescription = "Eerst begrijpen hoe je organisatie werkt. Daarna praktisch verbeteren wat nodig is, met behoud van wat al goed werkt.",
  canonicalUrl = "https://webuildanddesign.nl/",
  asset = "index-demo-a.js",
} = {}) {
  return `<!doctype html><html lang="nl"><head>
    <meta charset="UTF-8">
    <meta name="description" content="${description}">
    <meta property="og:title" content="${openGraphTitle}">
    <meta property="og:description" content="${openGraphDescription}">
    <link rel="canonical" href="${canonicalUrl}">
    <title>${title}</title>
    <script type="module" src="/assets/${asset}"></script>
  </head><body><div id="app"></div></body></html>`;
}

function demonstrationFetcher() {
  const baseline = metadataHtml();
  const changed = metadataHtml({
    description: "We Build And Design maakt relevante verandering zichtbaar vanuit echte context.",
    openGraphDescription: "Van betrouwbare context naar een begrijpelijke volgende stap.",
    asset: "index-demo-b.js",
  });
  const sequence = [baseline, baseline, changed, changed];
  let index = 0;
  return async () => {
    const selected = sequence[index];
    index += 1;
    if (selected === undefined) throw new Error("Controlled source failure");
    return new Response(selected, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        etag: index <= 2 ? '"demo-a"' : '"demo-b"',
      },
    });
  };
}

const demonstration = process.argv.includes("--demo");
const sourceUrl = argument("--source-url")
  ?? (demonstration ? "http://127.0.0.1/wbd-homepage-demo" : WBD_HOMEPAGE_SOURCE_URL);
const contextId = argument("--context-id")
  ?? (demonstration ? "organization:wbd-demo" : WBD_HOMEPAGE_CONTEXT_ID);
const connectorId = argument("--connector-id")
  ?? (demonstration ? `${WBD_HOMEPAGE_CONNECTOR_ID}-demo` : WBD_HOMEPAGE_CONNECTOR_ID);
const dataDirectory = path.resolve(
  argument("--data-dir")
    ?? process.env.ATLAS_CONNECTOR_DATA_DIR
    ?? path.join(websiteDirectory, ".atlas-data", "connectors-v2"),
);
const { definition, adapter, normalizer } = createWbdHomepageConnector({
  sourceUrl,
  contextId,
  connectorId,
  fetcher: demonstration ? demonstrationFetcher() : undefined,
  allowInsecureLocalhost: demonstration,
});
const store = new FileConnectorStateStore(dataDirectory);

let state;
if (demonstration) {
  for (let check = 0; check < 5; check += 1) {
    state = await syncConnector(definition, adapter, normalizer, store, {
      trigger: "manual",
      sleep: async () => {},
    });
  }
} else {
  state = await syncConnector(definition, adapter, normalizer, store, {
    trigger: "manual",
  });
}

const feed = await projectWbdHomepageObservationFeed(state, sourceUrl);
const latestRun = state.syncHistory.at(-1);
const report = {
  mode: demonstration ? "controlled-demonstration" : "live-read-only",
  connector: {
    connectorId: state.connectorId,
    contextId: state.contextId,
    sourceUrl,
  },
  latestRun: {
    status: latestRun?.status,
    counts: latestRun?.counts,
    attemptCount: latestRun?.attemptCount,
    errorCode: latestRun?.error?.code,
  },
  observation: feed.metrics,
  stateFile: store.statePath(definition),
};

console.log(JSON.stringify(report, null, 2));
if (!demonstration && latestRun?.status !== "succeeded") process.exitCode = 1;
