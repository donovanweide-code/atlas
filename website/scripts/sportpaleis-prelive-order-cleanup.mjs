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

function atOrBefore(value, cutoffAt) {
  return Boolean(value) && Date.parse(value) <= Date.parse(cutoffAt);
}

export function finalCleanStartInventory(state, { cutoffAt }) {
  if (!cutoffAt || !Number.isFinite(Date.parse(cutoffAt))) throw Object.assign(new Error("Clean-start vereist een geldige expliciete peildatum."), { code: "CLEAN_START_CUTOFF_REQUIRED" });
  const orders = (state.orders ?? []).filter(({ createdAt }) => atOrBefore(createdAt, cutoffAt));
  const orderIds = new Set(orders.map(({ id }) => id));
  const teamkitProposals = (state.teamkitProposals ?? []).filter(({ createdAt }) => atOrBefore(createdAt, cutoffAt));
  const jobs = (state.productionJobs ?? []).filter((job) => job.snapshot?.orderIds?.some((id) => orderIds.has(id)));
  const proposals = (state.productionProposals ?? []).filter((proposal) => proposal.orders?.some(({ id }) => orderIds.has(id)));
  const activeOrders = orders.filter(({ deletion }) => !deletion);
  const activeTeamkit = teamkitProposals.filter(({ status }) => status !== "ARCHIVED");
  const fingerprintRows = {
    cutoffAt,
    orders: orders.map(({ id, revision, createdAt, updatedAt, deletion }) => ({ id, revision, createdAt, updatedAt, deletion: deletion?.status ?? null })),
    teamkitProposals: teamkitProposals.map(({ id, aggregateRevision, currentRevision, status, createdAt, updatedAt }) => ({ id, aggregateRevision, currentRevision, status, createdAt, updatedAt })),
  };
  return {
    datastoreRevision: state.revision,
    cutoffAt,
    scopeFingerprint: sha256(JSON.stringify(fingerprintRows)),
    scope: {
      orders: orders.length,
      activeOrders: activeOrders.length,
      productionProposals: proposals.length,
      productionJobs: jobs.length,
      teamkitProposals: teamkitProposals.length,
      activeTeamkitProposals: activeTeamkit.length,
    },
    orderIds: orders.map(({ id }) => id),
    teamkitProposalIds: teamkitProposals.map(({ id }) => id),
    expectedPostCleanup: { activeScopedOrders: 0, activeScopedProductionWork: 0, activeScopedTeamkitProposals: 0 },
    exclusions: { recordsCreatedAfterCutoff: true, productionAssets: true, productionAssetSources: true, associations: true, articles: true, productionProfiles: true, fontsAndNumberSets: true, usersAndRoles: true, configuration: true, templates: true, syncConfiguration: true, deploymentEvidence: true },
  };
}

export function finalCleanStartEvidenceManifest(state, inventory, { releaseId = "UNKNOWN", preparedAt = new Date().toISOString(), actor = "system:final-clean-start-prepare", reason = "Sportpaleis operationele clean start" } = {}) {
  const orderIds = new Set(inventory.orderIds);
  const teamkitIds = new Set(inventory.teamkitProposalIds);
  const evidence = {
    schemaVersion: 1,
    purpose: "SPORTPALEIS_FINAL_CLEAN_START_ARCHIVE",
    releaseId,
    preparedAt,
    actor,
    reason,
    datastoreRevision: state.revision,
    cutoffAt: inventory.cutoffAt,
    scopeFingerprint: inventory.scopeFingerprint,
    orders: (state.orders ?? []).filter(({ id }) => orderIds.has(id)).map((value) => structuredClone(value)),
    productionProposals: (state.productionProposals ?? []).filter((proposal) => proposal.orders?.some(({ id }) => orderIds.has(id))).map((value) => structuredClone(value)),
    productionJobs: (state.productionJobs ?? []).filter((job) => job.snapshot?.orderIds?.some((id) => orderIds.has(id))).map((value) => structuredClone(value)),
    teamkitProposals: (state.teamkitProposals ?? []).filter(({ id }) => teamkitIds.has(id)).map((value) => structuredClone(value)),
    audit: (state.audit ?? []).filter(({ subject, details }) => orderIds.has(subject) || teamkitIds.has(subject) || orderIds.has(details?.orderId) || teamkitIds.has(details?.proposalId)).map((value) => structuredClone(value)),
    exclusions: inventory.exclusions,
  };
  return { ...evidence, sha256: sha256(JSON.stringify(evidence)) };
}

export function archiveFinalCleanStartScope(state, { expectedRevision, scopeFingerprint, cutoffAt, at = new Date().toISOString() }) {
  const inventory = finalCleanStartInventory(state, { cutoffAt });
  if (Number(expectedRevision) !== Number(state.revision)) throw Object.assign(new Error("Datastore is intussen gewijzigd; voer de clean-start inventaris opnieuw uit."), { code: "REVISION_CONFLICT" });
  if (scopeFingerprint !== inventory.scopeFingerprint) throw Object.assign(new Error("De bounded clean-startselectie wijkt af; voer de inventaris opnieuw uit."), { code: "CLEAN_START_FINGERPRINT_MISMATCH" });
  const orderIds = new Set(inventory.orderIds);
  const teamkitIds = new Set(inventory.teamkitProposalIds);
  const archivedOrders = [];
  for (const order of state.orders ?? []) {
    if (!orderIds.has(order.id) || order.deletion) continue;
    order.deletion = { status: "DELETED", at, byUserId: "system:final-clean-start", byUserName: "Sportpaleis clean start", reason: "Afgesloten pilotwerk uit de dagelijkse Workspace gearchiveerd", restorable: false };
    order.revision += 1;
    order.updatedAt = at;
    order.eventHistory ??= [];
    order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_DELETED", at, userId: "system:final-clean-start", userName: "Sportpaleis clean start", source: "final-clean-start", details: { reason: order.deletion.reason, restorable: false, recoverySnapshotRequired: true } });
    archivedOrders.push(order.id);
  }
  const archivedTeamkitProposals = [];
  for (const proposal of state.teamkitProposals ?? []) {
    if (!teamkitIds.has(proposal.id) || proposal.status === "ARCHIVED") continue;
    proposal.status = "ARCHIVED";
    proposal.archivedAt = at;
    proposal.updatedAt = at;
    proposal.updatedBy = { id: "system:final-clean-start", name: "Sportpaleis clean start", role: "admin" };
    proposal.aggregateRevision += 1;
    archivedTeamkitProposals.push(proposal.id);
  }
  state.audit.unshift({ id: `audit-${randomBytes(8).toString("hex")}`, at, userId: "system:final-clean-start", action: "Bounded pilotwerk gearchiveerd voor schone operationele start", subject: "Sportpaleis clean start", details: { cutoffAt, scopeFingerprint, archivedOrderIds: archivedOrders, archivedTeamkitProposalIds: archivedTeamkitProposals, hardDeleted: false, historyPreservedInRecoverySnapshot: true } });
  state.audit = state.audit.slice(0, 2_000);
  return { state, value: { archivedOrders, archivedTeamkitProposals, hardDeleted: false, historyPreservedInRecoverySnapshot: true } };
}

async function main() {
  const [{ SportpaleisMariaDbStore }, { productionDatabaseCredentialsFromEnvironment }] = await Promise.all([
    import("./sportpaleis-mariadb-store.mjs"),
    import("./workspace-runtime-config.mjs"),
  ]);
  const apply = process.argv.includes("--apply");
  const finalCleanStart = process.argv.includes("--final-clean-start");
  const cutoffAt = process.argv.find((argument) => argument.startsWith("--cutoff-at="))?.slice("--cutoff-at=".length);
  const expectedRevision = process.argv.find((argument) => argument.startsWith("--expected-revision="))?.split("=")[1];
  const confirmedFingerprint = process.argv.find((argument) => argument.startsWith("--confirmed-fingerprint="))?.split("=")[1];
  const scopeFingerprint = process.argv.find((argument) => argument.startsWith("--scope-fingerprint="))?.split("=")[1];
  const store = new SportpaleisMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace });
  try {
    await store.initialize();
    const state = await store.read();
    if (finalCleanStart) {
      const inventory = finalCleanStartInventory(state, { cutoffAt });
      if (!apply) {
        const evidence = finalCleanStartEvidenceManifest(state, inventory, { releaseId: process.env.RELEASE_ID });
        process.stdout.write(`${JSON.stringify({ status: "DRY_RUN", mode: "FINAL_CLEAN_START", ...inventory, evidence: { sha256: evidence.sha256, recordCounts: { orders: evidence.orders.length, proposals: evidence.productionProposals.length, productionJobs: evidence.productionJobs.length, teamkitProposals: evidence.teamkitProposals.length, audit: evidence.audit.length } } }, null, 2)}\n`);
        return;
      }
      if (!expectedRevision || !scopeFingerprint) throw Object.assign(new Error("Clean-start apply vereist expected revision en scope fingerprint uit dezelfde dry-run."), { code: "CLEAN_START_CONFIRMATION_REQUIRED" });
      const result = await store.mutate(async (current) => archiveFinalCleanStartScope(current, { expectedRevision, scopeFingerprint, cutoffAt }));
      process.stdout.write(`${JSON.stringify({ status: "APPLIED", mode: "FINAL_CLEAN_START", datastoreRevision: result.state.revision, ...result.value })}\n`);
      return;
    }
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
