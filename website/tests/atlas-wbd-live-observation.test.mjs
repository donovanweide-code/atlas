import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MemoryConnectorStateStore, syncConnector } from "../src/atlas-connectors.ts";
import {
  WBD_HOMEPAGE_CONTEXT_ID,
  WBD_HOMEPAGE_SOURCE_URL,
  createWbdHomepageConnector,
  parseWbdHomepageMetadata,
  projectWbdHomepageObservationFeed,
} from "../src/atlas-connector-wbd-homepage.ts";

function homepage({
  title = "We Build And Design — Eerst begrijpen, dan verbeteren",
  description = "We Build And Design begrijpt eerst hoe je organisatie werkt.",
  openGraphTitle = "We Build And Design — Eerst begrijpen, dan verbeteren",
  openGraphDescription = "Eerst begrijpen. Daarna gericht verbeteren.",
  canonicalUrl = "https://webuildanddesign.nl/",
  asset = "index-a.js",
  body = '<div id="app"></div>',
} = {}) {
  return `<!doctype html><html><head>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${openGraphTitle}">
    <meta property="og:description" content="${openGraphDescription}">
    <link rel="canonical" href="${canonicalUrl}">
    <title>${title}</title>
    <script type="module" src="/assets/${asset}"></script>
  </head><body>${body}</body></html>`;
}

const response = (html, headers = {}) => new Response(html, {
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8", ...headers },
});

function sequenceFetcher(sequence) {
  let index = 0;
  return async () => {
    const selected = sequence[Math.min(index, sequence.length - 1)];
    index += 1;
    if (selected instanceof Error) throw selected;
    return response(selected, { etag: `"fixture-${index}"` });
  };
}

function clock(start = "2026-08-12T08:00:00.000Z") {
  let current = Date.parse(start);
  return () => {
    const result = new Date(current);
    current += 1_000;
    return result;
  };
}

async function scenario(sequence) {
  const store = new MemoryConnectorStateStore();
  const connector = createWbdHomepageConnector({ fetcher: sequenceFetcher(sequence) });
  const now = clock();
  let state = null;
  for (let index = 0; index < sequence.length; index += 1) {
    state = await syncConnector(connector.definition, connector.adapter, connector.normalizer, store, {
      trigger: "manual", now, sleep: async () => {},
    });
  }
  return { state, feed: await projectWbdHomepageObservationFeed(state) };
}

test("normalizer retains only the five approved head fields", () => {
  const metadata = parseWbdHomepageMetadata(homepage({
    title: " We Build &amp; Design   — Richting ",
    description: " Begrijpen   vóór bouwen. ",
    asset: "volatile-hash.js",
    body: "<main>Niet monitoren</main>",
  }));
  assert.deepEqual(Object.keys(metadata), ["title", "description", "openGraphTitle", "openGraphDescription", "canonicalUrl"]);
  assert.equal(metadata.title, "We Build & Design — Richting");
  assert.equal(metadata.description, "Begrijpen vóór bouwen.");
  assert.doesNotMatch(JSON.stringify(metadata), /volatile-hash|Niet monitoren/);
});

test("case A: unchanged snapshots stay silent", async () => {
  const baseline = homepage();
  const { state, feed } = await scenario([baseline, baseline]);
  assert.equal(state.healthStatus, "healthy");
  assert.deepEqual(feed.metrics, {
    checks: 2, meaningfulChanges: 0, attentionItems: 0, duplicateNoiseItems: 0,
    technicalFailures: 0, technicalFailuresEscalatedToAttention: 0,
  });
});

test("case B: one meaningful change becomes one traceable attention item", async () => {
  const changed = homepage({
    description: "We Build And Design maakt relevante verandering zichtbaar.",
    openGraphDescription: "Van betrouwbare context naar een begrijpelijke volgende stap.",
  });
  const { feed } = await scenario([homepage(), changed]);
  assert.equal(feed.metrics.meaningfulChanges, 1);
  assert.equal(feed.metrics.attentionItems, 1);
  const observation = feed.observations[0];
  assert.equal(observation.title, "Website gewijzigd");
  assert.deepEqual(observation.changedFields.map((field) => field.key), ["description", "openGraphDescription"]);
  assert.equal(observation.sourceUrl, WBD_HOMEPAGE_SOURCE_URL);
  assert.equal(observation.evidenceStatus, "source_reported");
  assert.equal(observation.interpretationStatus, "uninterpreted");
  assert.match(observation.previousSnapshotHash, /^[a-f0-9]{64}$/);
  assert.match(observation.currentSnapshotHash, /^[a-f0-9]{64}$/);
  assert.notEqual(observation.previousChangeId, observation.currentChangeId);
  assert.equal(observation.provenance.contextId, WBD_HOMEPAGE_CONTEXT_ID);
  assert.equal(observation.provenance.normalizerId, "wbd-homepage-head-metadata");
  assert.equal(observation.provenance.translatorId, "wbd-homepage-metadata-change");
});

test("case C: a repeated changed snapshot does not duplicate attention", async () => {
  const changed = homepage({ description: "Nieuwe positionering, als bronfeit." });
  const { feed } = await scenario([homepage(), changed, changed]);
  assert.deepEqual(feed.metrics, {
    checks: 3, meaningfulChanges: 1, attentionItems: 1, duplicateNoiseItems: 0,
    technicalFailures: 0, technicalFailuresEscalatedToAttention: 0,
  });
});

test("case D: source failure preserves last good state and never becomes attention", async () => {
  const store = new MemoryConnectorStateStore();
  let calls = 0;
  const connector = createWbdHomepageConnector({ fetcher: async () => {
    calls += 1;
    if (calls === 1) return response(homepage());
    throw new Error("Controlled source outage");
  } });
  const now = clock();
  const first = await syncConnector(connector.definition, connector.adapter, connector.normalizer, store, { trigger: "manual", now, sleep: async () => {} });
  const failed = await syncConnector(connector.definition, connector.adapter, connector.normalizer, store, { trigger: "manual", now, sleep: async () => {} });
  const feed = await projectWbdHomepageObservationFeed(failed);
  assert.equal(failed.healthStatus, "degraded");
  assert.equal(failed.errorStatus.code, "NETWORK_ERROR");
  assert.ok(calls >= 4);
  assert.deepEqual(failed.records, first.records);
  assert.equal(feed.metrics.technicalFailures, 1);
  assert.equal(feed.metrics.attentionItems, 0);
  assert.equal(feed.metrics.technicalFailuresEscalatedToAttention, 0);
});

test("asset, body and whitespace churn produce no false positive", async () => {
  const noise = homepage({
    title: "  We Build And Design — Eerst begrijpen, dan verbeteren ",
    description: "We Build And Design   begrijpt eerst hoe je organisatie werkt.",
    asset: "index-build-hash-b.js",
    body: "<main>Een volledig andere body.</main>",
  });
  const { feed } = await scenario([homepage(), noise]);
  assert.equal(feed.metrics.meaningfulChanges, 0);
  assert.equal(feed.metrics.attentionItems, 0);
});

test("invalid source data fails closed and Workspace exposure is read-only and quiet", async () => {
  assert.throws(() => parseWbdHomepageMetadata(homepage().replace(
    '<meta name="description"',
    '<meta name="description" content="duplicate"><meta name="description"',
  )), /Expected exactly one/);
  assert.throws(() => parseWbdHomepageMetadata(homepage({ canonicalUrl: "https://example.com/" })), /unapproved origin/);
  const ui = await readFile(new URL("../src/wbd-foundation.ts", import.meta.url), "utf8");
  const api = await readFile(new URL("../scripts/wbd-workspace-foundation-api.mjs", import.meta.url), "utf8");
  assert.match(ui, /data-wbd-live-attention hidden/);
  assert.match(ui, /escapeHtml\(observation\.title\)/);
  assert.match(ui, /Atlas vult geen verklaring of betekenis in/);
  assert.match(ui, /catch \{\s*target\.hidden = true/);
  assert.match(api, /observations` && method === "GET"/);
  assert.doesNotMatch(api, /observations` && method === "POST"/);
});
