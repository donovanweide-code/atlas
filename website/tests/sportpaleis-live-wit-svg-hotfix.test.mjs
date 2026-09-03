import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Wit-Svg-Admin-2026!", patrick: "Wit-Svg-Operator-2026!", collega: "Wit-Svg-Store-2026!", "donovan-support": "Wit-Svg-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-live-wit-svg-hotfix-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-LIVE-WIT-SVG-HOTFIX" });
  await service.initialize();
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const font = (await service.bootstrap(operator.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  assert.ok(font);

  async function createReadyOrder(label, quantity, key, foilColor = "Wit") {
    const created = (await service.createOrder(operator.token, operator.csrfToken, {
      orderKind: "CUSTOM",
      customer: label,
      customerEmail: "",
      customerPhone: "",
      standardPersonalization: empty,
      items: [{ product: label, size: "", quantity, personalization: `Initialen ${key}`, foilColor, deviation: true, overrides: empty }],
      productionLines: [{ id: `wit-line-${key}`, type: "INITIALS", content: key, previewLabel: `Initialen ${key}`, widthMm: 48, heightMm: 30, foilColor, quantity, sourceId: font.id }],
    }, `wit-svg-order-${key}`)).value;
    return (await service.advanceOrder(operator.token, operator.csrfToken, created.id, created.revision, `wit-svg-control-${key}`)).value;
  }

  return { root, store, service, operator, createReadyOrder };
}

test("stale globale WIT-groep kaapt de actuele drie-orderbatch niet en één intentie maakt exact één SVG", async (context) => {
  const { store, service, operator, createReadyOrder } = await fixture(context);

  const oldOrder = await createReadyOrder("Oude open WIT-groep", 1, "OLD");
  const oldProposal = (await service.createProductionProposal(operator.token, operator.csrfToken, {
    orders: [{ id: oldOrder.id, expectedRevision: oldOrder.revision }],
  }, "wit-svg-old-proposal")).value;
  await service.addOrderNote(operator.token, operator.csrfToken, oldOrder.id, { text: "Niet-productie-inhoudelijke revisiedrift", kind: "internal" }, "wit-svg-old-note");
  const staleState = await store.read();
  assert.notEqual(staleState.orders.find(({ id }) => id === oldOrder.id).revision, oldProposal.groups[0].orders[0].expectedRevision);

  const currentOrders = await Promise.all([
    createReadyOrder("LIVE WIT 0119", 2, "W19"),
    createReadyOrder("LIVE WIT 0120", 2, "W20"),
    createReadyOrder("LIVE WIT 0121", 1, "W21"),
  ]);
  const request = { orders: currentOrders.map(({ id, revision }) => ({ id, expectedRevision: revision })), foilColor: "Wit" };
  const results = await Promise.all([
    service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, request, "production-current-group-live-wit-svg"),
    service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, request, "production-current-group-live-wit-svg"),
  ]);
  const first = results.find(({ duplicate }) => duplicate === false);
  const duplicate = results.find(({ duplicate }) => duplicate === true);
  assert.ok(first);
  assert.ok(duplicate);
  assert.equal(duplicate.value.job.id, first.value.job.id);
  assert.deepEqual(first.value.job.snapshot.orderIds.toSorted(), currentOrders.map(({ id }) => id).toSorted());
  assert.equal(first.value.job.snapshot.productionGroup.foilColor, "Wit");
  assert.equal(first.value.job.snapshot.layout.objectCount, 5);
  assert.equal(first.value.job.snapshot.artifact.format, "SVG");

  const committed = await store.read();
  assert.equal(committed.productionJobs.filter(({ id }) => id === first.value.job.id).length, 1);
  assert.equal(committed.productionProposals.filter(({ id }) => id === first.value.proposal.id).length, 1);
  assert.equal(committed.productionProposals.find(({ id }) => id === oldProposal.id).groups[0].productionJobId, null);
  assert.equal(committed.orders.filter(({ id }) => currentOrders.some((order) => order.id === id)).filter(({ eventHistory }) => eventHistory.some(({ type }) => type === "PRODUCTION_JOB_CREATED")).length, 3);

  const artifact = await service.productionJobArtifact(operator.token, first.value.job.id);
  assert.equal(artifact.mimeType, "image/svg+xml");
  assert.equal(artifact.disposition, "attachment");
  assert.equal(artifact.filename, first.value.job.snapshot.artifact.filename);
  assert.equal(createHash("sha256").update(artifact.bytes).digest("hex").toUpperCase(), first.value.job.snapshot.artifact.sha256);

  const beforeRejectedRetry = await store.read();
  await assert.rejects(
    service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, request, "production-current-group-live-wit-svg-new-key"),
    (error) => error.code === "REVISION_CONFLICT",
  );
  const afterRejectedRetry = await store.read();
  assert.equal(afterRejectedRetry.productionJobs.length, beforeRejectedRetry.productionJobs.length);
  assert.equal(afterRejectedRetry.productionProposals.length, beforeRejectedRetry.productionProposals.length);
  assert.deepEqual(afterRejectedRetry.orders.map(({ id, revision }) => [id, revision]), beforeRejectedRetry.orders.map(({ id, revision }) => [id, revision]));
});

test("grote LIVE-vorm van 18 WIT-opdrukken uit vier orders eindigt in exact één bruikbare job en artifact", async (context) => {
  const { store, service, operator, createReadyOrder } = await fixture(context);
  const orders = await Promise.all([
    createReadyOrder("LIVE WIT 0127", 8, "W27"),
    createReadyOrder("LIVE WIT 0128", 4, "W28"),
    createReadyOrder("LIVE WIT 0130", 5, "W30"),
    createReadyOrder("LIVE WIT 0131", 1, "W31"),
  ]);
  const request = { orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })), foilColor: "Wit" };
  const first = await service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, request, "production-current-group-live-wit-18");
  const retry = await service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, request, "production-current-group-live-wit-18");

  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.equal(retry.value.job.id, first.value.job.id);
  assert.equal(first.value.job.status, "AWAITING_HUMAN_CHECK");
  assert.equal(first.value.job.snapshot.layout.objectCount, 18);
  assert.deepEqual(first.value.job.snapshot.orderIds.toSorted(), orders.map(({ id }) => id).toSorted());

  const artifact = await service.productionJobArtifact(operator.token, first.value.job.id);
  assert.equal(artifact.mimeType, "image/svg+xml");
  assert.equal(artifact.disposition, "attachment");
  assert.equal(createHash("sha256").update(artifact.bytes).digest("hex").toUpperCase(), first.value.job.snapshot.artifact.sha256);

  const committed = await store.read();
  assert.equal(committed.productionJobs.filter(({ id }) => id === first.value.job.id).length, 1);
  assert.equal(committed.productionProposals.filter(({ id }) => id === first.value.proposal.id).length, 1);
  for (const order of committed.orders.filter(({ id }) => orders.some((candidate) => candidate.id === id))) {
    assert.equal(order.stage, "PRINT");
    assert.equal(order.eventHistory.filter(({ type }) => type === "PRODUCTION_JOB_CREATED").length, 1);
  }
});

test("éénklik-UI gebruikt deterministische intentie en start de attachment vóór herladen", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  const directHandler = workspace.slice(workspace.indexOf('if (button.dataset.action === "prepare-and-print-production-color")'), workspace.indexOf('if (button.dataset.action === "create-production-proposal")'));
  assert.ok(directHandler.indexOf("downloadProductionArtifact(value.job)") < directHandler.indexOf("await load()"));
  assert.match(workspace, /anchor\.href = `\/api\/sportpaleis\/v1\/production-jobs\/\$\{encodeURIComponent\(job\.id\)\}\/artifact`/u);
  assert.match(workspace, /anchor\.download = job\.snapshot\.artifact\.filename/u);
  assert.match(workspace, /controleer de selectie en probeer één keer opnieuw/u);
  assert.match(workspace, /controleer of een nieuw PLOT-nummer bestaat voordat je opnieuw probeert/u);
  assert.match(workspace, /De .*productiewrite is volledig teruggedraaid/u);
  assert.match(workspace, /duurde langer dan 30 seconden/u);
  assert.match(api, /deterministicIdempotencyKey\("production-current-group", idempotencyPayload\)/u);
  assert.match(api, /crypto\.subtle\.digest\("SHA-256", bytes\)/u);
  assert.match(api, /const PRODUCTION_WRITE_TIMEOUT_MS = 30_000/u);
  assert.match(api, /#boundedProductionFetch\(`\$\{API\}\/production-proposals\/current-job`/u);
  assert.match(api, /error: "PRODUCTION_REQUEST_TIMEOUT"/u);
  const recovery = directHandler.slice(directHandler.indexOf(".catch((e)"));
  assert.ok(recovery.indexOf("render({ preserveScroll: true })") < recovery.indexOf("void load()"), "de verwerkingsstatus verdwijnt vóór de read-only reconciliatie");
});
