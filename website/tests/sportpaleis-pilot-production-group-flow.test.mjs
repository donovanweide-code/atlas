import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { captureReceipt, createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

const passwords = { kevin: "Group-Flow-Admin-2026!", patrick: "Group-Flow-Operator-2026!", collega: "Group-Flow-Store-2026!", "donovan-support": "Group-Flow-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

test("meerdere geschikte orders worden één uitvoerbare productiegroep met één PlotJob en SVG", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-production-group-"));
  const runtimeArtifactRoot = path.join(root, "shared-runtime");
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root, runtimeArtifactRoot });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });

  const controlledOrders = [];
  for (const [index, customer] of ["Groep gebruiker één", "Groep gebruiker twee"].entries()) {
    const created = (await service.createOrder(admin.token, admin.csrfToken, {
      orderKind: "INDIVIDUAL",
      customer,
      customerEmail: `groep-${index + 1}@example.test`,
      customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
    }, `group-order-${index + 1}`)).value;
    const acknowledged = await captureReceipt(service, admin, created, `group-receipt-${index + 1}`);
    controlledOrders.push((await service.advanceOrder(admin.token, admin.csrfToken, created.id, acknowledged.revision, `group-control-${index + 1}`)).value);
  }

  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, {
    orders: controlledOrders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
  }, "group-proposal")).value;
  assert.equal(proposal.groups.length, 1);
  const [group] = proposal.groups;
  assert.equal(group.label, "Wit — 2 orders");
  assert.equal(group.orders.length, 2);
  assert.equal(group.productionLineRefs.length, 2);
  assert.equal(group.status, "OPEN");

  const job = (await service.createProductionJob(admin.token, admin.csrfToken, {
    proposalId: proposal.id,
    proposalGroupId: group.id,
    orders: controlledOrders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
  }, "group-human-go")).value;
  assert.equal(job.snapshot.productionGroup.id, group.id);
  assert.equal(job.snapshot.productionGroup.label, "Wit — 2 orders");
  assert.equal(job.snapshot.orderIds.length, 2);
  assert.equal(job.snapshot.layout.objectCount, 2);
  assert.equal(job.snapshot.artifact.format, "SVG");
  assert.equal(job.snapshot.hardwareSendPerformedByWorkspace, false);

  const download = await service.productionJobArtifact(admin.token, job.id);
  assert.equal(download.sha256, job.snapshot.artifact.sha256);
  assert.equal(createHash("sha256").update(download.bytes).digest("hex").toUpperCase(), job.snapshot.artifact.sha256);
  assert.match(download.bytes.toString("utf8"), /<path data-contour-id=/u);
  assert.doesNotMatch(download.bytes.toString("utf8"), /<text|font-family/iu);

  const state = await service.bootstrap(admin.token);
  const savedProposal = state.productionProposals.find(({ id }) => id === proposal.id);
  assert.equal(savedProposal.status, "CONVERTED");
  assert.equal(savedProposal.groups[0].productionJobId, job.id);
  assert.deepEqual(controlledOrders.map(({ id }) => state.orders.find((order) => order.id === id).stage), ["PRINT", "PRINT"]);
  assert.ok(controlledOrders.every(({ id }) => state.orders.find((order) => order.id === id).eventHistory.some(({ details }) => details?.productionGroupId === group.id)));

  const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspaceSource, /data-action="confirm-production-proposal"[^]*?>Produceren</u);
  assert.match(workspaceSource, /data-proposal-group-id=/u);
  assert.match(workspaceSource, /Klaar voor productie/u);
  assert.doesNotMatch(workspaceSource, /Alles gecontroleerd\?/u);
  assert.doesNotMatch(workspaceSource, /data-order-select|data-select-all/u);
});

test("een afwijkende groepsselectie blijft vóór artifact en transactieverwerking fail-closed", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-production-group-closed-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: root, runtimeArtifactRoot: path.join(root, "shared-runtime") });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL", customer: "Fail closed groep", customerEmail: "group-closed@example.test", customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "2", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-116386", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, "group-closed-order")).value;
  const acknowledged = await captureReceipt(service, admin, created, "group-closed-receipt");
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, acknowledged.revision, "group-closed-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "group-closed-proposal")).value;
  const productionJobCount = (await service.bootstrap(admin.token)).productionJobs.length;

  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, {
    proposalId: proposal.id,
    proposalGroupId: proposal.groups[0].id,
    orders: [{ id: "SP-ONBEKEND", expectedRevision: 1 }],
  }, "group-closed-go"), (error) => error.code === "PRODUCTION_GROUP_SELECTION_MISMATCH" && error.statusCode === 409);
  const state = await service.bootstrap(admin.token);
  assert.equal(state.productionJobs.length, productionJobCount);
  assert.equal(state.productionProposals.find(({ id }) => id === proposal.id).groups[0].status, "OPEN");
  assert.equal(state.orders.find(({ id }) => id === controlled.id).stage, "CONTROL");
});
