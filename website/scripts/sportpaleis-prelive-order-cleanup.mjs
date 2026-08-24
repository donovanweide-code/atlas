import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

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
    const jobs = (state.productionJobs ?? []).filter((job) => job.snapshot?.orderIds?.includes(order.id));
    const proposals = (state.productionProposals ?? []).filter((proposal) => proposal.orders?.some(({ id }) => id === order.id));
    const groups = proposals.flatMap(({ id: proposalId, groups }) => (groups ?? []).filter((group) => group.orders.some(({ id }) => id === order.id)).map((group) => ({ proposalId, id: group.id, foilColor: group.foilColor, status: group.status, productionJobId: group.productionJobId ?? null })));
    return {
      id: order.id,
      revision: order.revision,
      stage: order.stage,
      customer: order.customer,
      emailDomain: String(order.customerEmail ?? "").split("@")[1]?.toLocaleLowerCase("nl-NL") ?? "",
      productionJobs: jobs.length,
      productionJobIds: jobs.map(({ id }) => id),
      proposalIds: proposals.map(({ id }) => id),
      productionGroups: groups,
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
    affectedRecords: {
      orders: confirmed.length,
      proposals: new Set(confirmed.flatMap(({ proposalIds }) => proposalIds)).size,
      productionGroups: confirmed.reduce((count, row) => count + row.productionGroups.length, 0),
      openProductionGroups: confirmed.reduce((count, row) => count + row.productionGroups.filter(({ status }) => status === "OPEN").length, 0),
      productionJobs: new Set(confirmed.flatMap(({ productionJobIds }) => productionJobIds)).size,
    },
    expectedPostCleanup: { activePilotOrders: 0, activePilotProposals: 0, openPilotProductionGroups: 0 },
    rows,
  };
}

export function cleanupEvidenceManifest(state, inventory, { releaseId = "UNKNOWN", preparedAt = new Date().toISOString(), actor = "system:cleanup-prepare" } = {}) {
  const confirmedIds = new Set(inventory.rows.filter(({ classification }) => classification === "CONFIRMED_TEST").map(({ id }) => id));
  const evidence = {
    schemaVersion: 1,
    purpose: "SPORTPALEIS_BOUNDED_PILOT_ARCHIVE",
    releaseId,
    preparedAt,
    actor,
    datastoreRevision: state.revision,
    confirmedFingerprint: inventory.confirmedFingerprint,
    orders: (state.orders ?? []).filter(({ id }) => confirmedIds.has(id)).map((order) => structuredClone(order)),
    productionProposals: (state.productionProposals ?? []).filter((proposal) => proposal.orders?.some(({ id }) => confirmedIds.has(id))).map((proposal) => structuredClone(proposal)),
    productionJobs: (state.productionJobs ?? []).filter((job) => job.snapshot?.orderIds?.some((id) => confirmedIds.has(id))).map((job) => structuredClone(job)),
    audit: (state.audit ?? []).filter(({ subject, details }) => confirmedIds.has(subject) || confirmedIds.has(details?.orderId)).map((entry) => structuredClone(entry)),
    exclusions: { productionAssets: true, associations: true, productionProfiles: true, usersAndRoles: true, configuration: true, deploymentEvidence: true },
  };
  return { ...evidence, sha256: sha256(JSON.stringify(evidence)) };
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
  const [{ SportpaleisMariaDbStore }, { productionDatabaseCredentialsFromEnvironment }] = await Promise.all([
    import("./sportpaleis-mariadb-store.mjs"),
    import("./workspace-runtime-config.mjs"),
  ]);
  const apply = process.argv.includes("--apply");
  const expectedRevision = process.argv.find((argument) => argument.startsWith("--expected-revision="))?.split("=")[1];
  const confirmedFingerprint = process.argv.find((argument) => argument.startsWith("--confirmed-fingerprint="))?.split("=")[1];
  const store = new SportpaleisMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace });
  try {
    await store.initialize();
    const state = await store.read();
    const inventory = preliveCleanupInventory(state);
    if (!apply) {
      const evidence = cleanupEvidenceManifest(state, inventory, { releaseId: process.env.RELEASE_ID });
      process.stdout.write(`${JSON.stringify({ status: "DRY_RUN", ...inventory, evidence: { sha256: evidence.sha256, recordCounts: { orders: evidence.orders.length, proposals: evidence.productionProposals.length, productionJobs: evidence.productionJobs.length, audit: evidence.audit.length } } }, null, 2)}\n`);
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
