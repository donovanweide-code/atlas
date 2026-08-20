import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { createWorkspacePasswordRecord } from "./workspace-auth-foundation.mjs";
import {
  WbdOwnerFileStore,
  WbdOwnerService,
  createInitialWbdOwnerState,
} from "./wbd-owner-foundation.mjs";
import { fetchWbdHomepageSnapshot } from "./wbd-homepage-live-connector.mjs";

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function insideWorkspace(value) {
  const workspace = path.resolve(process.cwd(), "..");
  const resolved = path.resolve(value);
  if (resolved !== workspace && !resolved.startsWith(`${workspace}${path.sep}`)) throw new Error(`${resolved} valt buiten de geïsoleerde workspace.`);
  return resolved;
}

const password = process.env.WBD_OWNER_SEED_PASSWORD;
if (!password || password.length < 12) throw new Error("WBD_OWNER_SEED_PASSWORD van minimaal 12 tekens is vereist; het wachtwoord wordt niet opgeslagen in het rapport.");

const statePath = insideWorkspace(argument("state", path.join("..", ".atlas-review", "wbd-owner-live-proof-state.json")));
const reportPath = insideWorkspace(argument("report", path.join("..", ".atlas-review", "wbd-owner-live-proof-report.json")));
const legacyPath = argument("legacy");
const legacy = legacyPath ? JSON.parse(await readFile(path.resolve(legacyPath), "utf8")) : null;

await mkdir(path.dirname(statePath), { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const passwordRecord = await createWorkspacePasswordRecord(password);
const store = new WbdOwnerFileStore({
  filePath: statePath,
  bootstrap: async () => createInitialWbdOwnerState({ passwordRecord, now: new Date() }),
});
const service = new WbdOwnerService({ store, releaseId: "WBD-ATLAS-CONTROL-PLANE-HUMAN-REVIEW", allowedOrigin: "http://127.0.0.1:4180" });
await service.initialize();

const started = performance.now();
const snapshot = await fetchWbdHomepageSnapshot({ previousState: legacy });
const fetchDurationMs = Number((performance.now() - started).toFixed(1));
if (snapshot.status !== "SUCCEEDED") throw new Error(`Live connector bewijs mislukt: ${snapshot.error?.code ?? "UNKNOWN"}.`);
await service.ingestConnectorSnapshot(snapshot, new Date(snapshot.fetchedAt));

const state = await store.read();
const plane = state.atlasControlPlane;
const evidence = plane.evidence.filter((item) => item.provenance?.connectorId === snapshot.connectorId);
const attention = plane.attention.filter(({ source }) => source === snapshot.connectorId);
const report = {
  proofVersion: 1,
  result: "PASS",
  isolated: true,
  productionChanged: false,
  source: snapshot.sourceUrl,
  authorization: { mode: snapshot.authorizationMode, status: snapshot.authorizationStatus, credentialsStoredClientSide: false },
  fetchedAt: snapshot.fetchedAt,
  observedAt: snapshot.observedAt,
  freshness: snapshot.freshness,
  fetchDurationMs,
  attemptCount: snapshot.attemptCount,
  rawHash: snapshot.rawHash,
  normalizedHash: snapshot.normalizedHash,
  previousNormalizedHash: snapshot.previousNormalizedHash,
  changedFields: snapshot.changedFields.map(({ key, label }) => ({ key, label })),
  provenance: snapshot.provenance,
  centralState: {
    path: path.relative(path.resolve(process.cwd(), ".."), statePath),
    revision: state.revision,
    evidenceIds: evidence.map(({ id }) => id),
    attentionIds: attention.map(({ id }) => id),
    nextBestActionIds: plane.nextBestActions.filter(({ attentionId }) => attention.some(({ id }) => id === attentionId)).map(({ id }) => id),
    preparedActionIds: plane.preparedActions.filter(({ attentionId }) => attention.some(({ id }) => id === attentionId)).map(({ id }) => id),
    auditEvents: plane.audit.filter(({ subjectId }) => evidence.some(({ id }) => id === subjectId) || attention.some(({ id }) => id === subjectId)).map(({ eventType }) => eventType),
  },
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "w" });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
