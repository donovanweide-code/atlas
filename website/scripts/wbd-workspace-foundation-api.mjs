import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WBD_HOMEPAGE_CONNECTOR_ID,
  WBD_HOMEPAGE_CONTEXT_ID,
  WBD_HOMEPAGE_SOURCE_URL,
  createWbdHomepageConnector,
  projectWbdHomepageObservationFeed,
} from "../src/atlas-connector-wbd-homepage.ts";
import { FileConnectorStateStore } from "./atlas-connector-file-store.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const foundationRoot = path.join(repositoryRoot, "data", "wbd-workspace");
const feedbackPath = path.join(foundationRoot, "feedback.json");
const paymentsPath = path.join(foundationRoot, "payment-statuses.json");
const apiPrefix = "/__wbd-foundation";
const observationSourceUrl = process.env.ATLAS_WBD_OBSERVATION_SOURCE_URL ?? WBD_HOMEPAGE_SOURCE_URL;
const observationContextId = process.env.ATLAS_WBD_OBSERVATION_CONTEXT_ID ?? WBD_HOMEPAGE_CONTEXT_ID;
const observationConnectorId = process.env.ATLAS_WBD_OBSERVATION_CONNECTOR_ID ?? WBD_HOMEPAGE_CONNECTOR_ID;
const observationDataRoot = path.resolve(
  process.env.ATLAS_WBD_OBSERVATION_DATA_DIR
    ?? path.join(repositoryRoot, "website", ".atlas-data", "connectors-v2"),
);
const observationConnector = createWbdHomepageConnector({
  sourceUrl: observationSourceUrl,
  contextId: observationContextId,
  connectorId: observationConnectorId,
  allowInsecureLocalhost: observationContextId.endsWith(":wbd-demo"),
});
const observationStore = new FileConnectorStateStore(observationDataRoot);

const feedbackStatuses = new Set(["Nieuw", "In beoordeling", "Besloten"]);
const paymentStatuses = new Set(["manual-unregistered", "open", "paid"]);

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("De invoer is te groot.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requiredText(value, label, maximum = 180) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is verplicht.`);
  return text.slice(0, maximum);
}

function optionalText(value, maximum = 500) {
  return String(value ?? "").trim().slice(0, maximum);
}

function normalizeFeedback(payload) {
  const status = requiredText(payload.status, "Status", 40);
  if (!feedbackStatuses.has(status)) throw new Error("Kies een geldige feedbackstatus.");
  const date = requiredText(payload.date, "Datum", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Gebruik een geldige datum.");
  return {
    id: `feedback-${randomUUID()}`,
    organization: requiredText(payload.organization, "Organisatie"),
    project: requiredText(payload.project, "Project"),
    component: requiredText(payload.component, "Onderdeel"),
    date,
    status,
    observation: requiredText(payload.observation, "Praktijkfeedback", 1_200),
    follow_up_decision: optionalText(payload.follow_up_decision, 1_200),
    created_at: new Date().toISOString(),
  };
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const pathname = requestUrl.pathname;
  const method = request.method ?? "GET";

  if (pathname === `${apiPrefix}/observations` && method === "GET") {
    const state = await observationStore.load(observationConnector.definition);
    sendJson(response, 200, await projectWbdHomepageObservationFeed(state, observationSourceUrl));
    return true;
  }

  if (pathname === `${apiPrefix}/feedback` && method === "GET") {
    const feedback = await readJson(feedbackPath, []);
    feedback.sort((left, right) => `${right.date}${right.created_at}`.localeCompare(`${left.date}${left.created_at}`));
    sendJson(response, 200, { feedback });
    return true;
  }

  if (pathname === `${apiPrefix}/feedback` && method === "POST") {
    const feedback = await readJson(feedbackPath, []);
    const entry = normalizeFeedback(await readRequestJson(request));
    feedback.push(entry);
    await writeJson(feedbackPath, feedback);
    sendJson(response, 201, { entry });
    return true;
  }

  if (pathname === `${apiPrefix}/payments` && method === "GET") {
    sendJson(response, 200, { payments: await readJson(paymentsPath, {}) });
    return true;
  }

  const paymentMatch = pathname.match(new RegExp(`^${apiPrefix}/payments/([a-z0-9-]+)$`, "i"));
  if (paymentMatch && method === "PUT") {
    const payload = await readRequestJson(request);
    const status = String(payload.status ?? "");
    if (!paymentStatuses.has(status)) throw new Error("Kies een geldige betaalstatus.");
    const payments = await readJson(paymentsPath, {});
    payments[paymentMatch[1]] = { status, updated_at: new Date().toISOString() };
    await writeJson(paymentsPath, payments);
    sendJson(response, 200, { payment: payments[paymentMatch[1]] });
    return true;
  }

  return false;
}

export function createWbdWorkspaceFoundationMiddleware() {
  return async function wbdWorkspaceFoundationMiddleware(request, response, next) {
    try {
      if (!(await handleRequest(request, response))) next();
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "De Workspace-gegevens konden niet worden verwerkt." });
    }
  };
}
