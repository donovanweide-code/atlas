import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

import { SportpaleisMariaDbStore } from "./sportpaleis-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function confirmedPilotSignals(order) {
  const signals = [];
  const email = String(order.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL");
  const customer = String(order.customer ?? "").trim().toLocaleLowerCase("nl-NL");
  if (email.endsWith("@example.invalid")) signals.push("RESERVED_SYNTHETIC_EMAIL_DOMAIN");
  if (/^snijtest-/iu.test(String(order.id))) signals.push("EXPLICIT_CUT_TEST_ID");
  if (/^interne productietest\b/u.test(customer)) signals.push("EXPLICIT_INTERNAL_PRODUCTION_TEST_LABEL");
  if (/^pilot groepstest\b/u.test(customer)) signals.push("EXPLICIT_PILOT_GROUP_TEST_LABEL");
  if (/^test(?:\s|\d|$)/u.test(customer)) signals.push("EXPLICIT_TEST_LABEL");
  return signals;
}

export function preliveCleanupInventory(state) {
  const active = (state.orders ?? []).filter(({ deletion }) => !deletion);
  const rows = active.map((order) => {
    const signals = confirmedPilotSignals(order);
    const productionJobs = (state.productionJobs ?? []).filter((job) => job.snapshot?.orderIds?.includes(order.id)).length;
    return {
      id: order.id,
      revision: order.revision,
      stage: order.stage,
      customer: order.customer,
      emailDomain: String(order.customerEmail ?? "").split("@")[1]?.toLocaleLowerCase("nl-NL") ?? "",
      productionJobs,
      classification: signals.length ? "CONFIRMED_TEST" : "UNVERIFIED",
      signals,
    };
  });
  const confirmed = rows.filter(({ classification }) => classification === "CONFIRMED_TEST");
  const fingerprint = sha256(JSON.stringify(confirmed.map(({ id, revision, signals }) => ({ id, revision, signals }))));
  return {
    datastoreRevision: state.revision,
    activeOrders: rows.length,
    confirmedTestOrders: confirmed.length,
    unverifiedOrders: rows.length - confirmed.length,
    confirmedFingerprint: fingerprint,
    rows,
  };
}

export function archiveConfirmedPilotOrders(state, { expectedRevision, confirmedFingerprint, at = new Date().toISOString() }) {
  const inventory = preliveCleanupInventory(state);
  if (Number(expectedRevision) !== Number(state.revision)) throw Object.assign(new Error("Datastore is intussen gewijzigd; voer de inventaris opnieuw uit."), { code: "REVISION_CONFLICT" });
  if (confirmedFingerprint !== inventory.confirmedFingerprint) throw Object.assign(new Error("De bevestigde testselectie wijkt af; voer de inventaris opnieuw uit."), { code: "CLEANUP_FINGERPRINT_MISMATCH" });
  const confirmedIds = new Set(inventory.rows.filter(({ classification }) => classification === "CONFIRMED_TEST").map(({ id }) => id));
  for (const order of state.orders ?? []) {
    if (!confirmedIds.has(order.id) || order.deletion) continue;
    const productionHistoryPreserved = (state.productionJobs ?? []).some((job) => job.snapshot?.orderIds?.includes(order.id));
    order.deletion = {
      status: "DELETED",
      at,
      byUserId: "system:prelive-cleanup",
      byUserName: "Gecontroleerde pre-live cleanup",
      reason: "Aantoonbare pilot-/testorder uit actieve operatie gearchiveerd",
      restorable: !productionHistoryPreserved,
    };
    order.revision += 1;
    order.updatedAt = at;
    order.eventHistory ??= [];
    order.eventHistory.push({
      id: `event-${randomBytes(6).toString("hex")}`,
      type: "ORDER_DELETED",
      at,
      userId: "system:prelive-cleanup",
      userName: "Gecontroleerde pre-live cleanup",
      source: "prelive-cleanup",
      details: { reason: order.deletion.reason, restorable: order.deletion.restorable, productionHistoryPreserved },
    });
    state.audit.unshift({
      id: `audit-${randomBytes(8).toString("hex")}`,
      at,
      userId: "system:prelive-cleanup",
      action: "Aantoonbare testorder uit actieve operatie gearchiveerd",
      subject: order.id,
      details: { signals: confirmedPilotSignals(order), productionHistoryPreserved, hardDeleted: false },
    });
  }
  state.audit = state.audit.slice(0, 2_000);
  return { state, value: { archived: [...confirmedIds], historyPreserved: true, hardDeleted: false } };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const expectedRevision = process.argv.find((argument) => argument.startsWith("--expected-revision="))?.split("=")[1];
  const confirmedFingerprint = process.argv.find((argument) => argument.startsWith("--confirmed-fingerprint="))?.split("=")[1];
  const store = new SportpaleisMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace });
  try {
    await store.initialize();
    const state = await store.read();
    const inventory = preliveCleanupInventory(state);
    if (!apply) {
      process.stdout.write(`${JSON.stringify({ status: "DRY_RUN", ...inventory }, null, 2)}\n`);
      return;
    }
    if (!expectedRevision || !confirmedFingerprint) throw Object.assign(new Error("Apply vereist expected revision en confirmed fingerprint uit dezelfde dry-run."), { code: "CLEANUP_CONFIRMATION_REQUIRED" });
    const result = await store.mutate(async (current) => archiveConfirmedPilotOrders(current, { expectedRevision, confirmedFingerprint }));
    process.stdout.write(`${JSON.stringify({ status: "APPLIED", datastoreRevision: result.state.revision, ...result.value })}\n`);
  } finally {
    await store.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "FAILED", code: String(error?.code ?? "PRELIVE_CLEANUP_FAILED"), message: String(error?.message ?? "Pre-live cleanup is veilig gestopt.") })}\n`);
    process.exitCode = 1;
  });
}
