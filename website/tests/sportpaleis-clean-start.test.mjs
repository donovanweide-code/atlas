import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { cleanSportpaleisPilotOrders, createSportpaleisProductionBootstrap } from "../scripts/sportpaleis-pilot-foundation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function pilotOrder(id = "SP-2026-9999") {
  return {
    id,
    revision: 1,
    stage: "ORDER",
    orderKind: "TEAM",
    barcode: { value: `SPW:${id}`, featureEnabled: false, hardwareValidated: false },
    items: [{ id: "item-clean", sourceProvenance: "Sportpaleis Workspace pilotinvoer", productionReadiness: { status: "CONFIGURED", reason: null } }],
  };
}

test("clean start verwijdert uitsluitend pilotorders en exact gekoppelde tijdelijke productieobjecten", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-08-14T10:00:00.000Z"));
  const order = pilotOrder();
  const snapshot = { orderIds: [order.id], artifact: { path: "outputs/sportpaleis-plotjobs/PLOT-2026-9999/PLOT-2026-9999-production.svg" } };
  const linkedJob = { id: "job-clean", jobNumber: "PLOT-2026-9999", snapshot, snapshotHash: sha256(JSON.stringify(snapshot)), proofStatus: "CONFIGURED", kind: "ORIGINAL", status: "AWAITING_HUMAN_CHECK" };
  state.orders = [order];
  state.productionJobs.push(linkedJob);
  state.productionProposals = [{ id: "proposal-clean", proposalNumber: "PV-2026-9999", orders: [{ id: order.id, expectedRevision: 1 }] }];
  state.productionElementRequirements = [{ id: "requirement-clean", orderId: order.id, variantId: "variant-retained", quantity: 1 }];
  state.idempotency = { clean: { value: { id: order.id } }, retained: { value: { id: "unrelated" } } };
  const protectedBefore = { users: structuredClone(state.users), articles: structuredClone(state.articles), productionFonts: structuredClone(state.productionFonts), audit: structuredClone(state.audit) };

  const { state: cleaned, manifest } = cleanSportpaleisPilotOrders(state);

  assert.equal(cleaned.orders.length, 0);
  assert.equal(cleaned.productionJobs.some(({ id }) => id === linkedJob.id), false);
  assert.equal(cleaned.productionProposals.length, 0);
  assert.equal(cleaned.productionElementRequirements.length, 0);
  assert.equal("clean" in cleaned.idempotency, false);
  assert.equal("retained" in cleaned.idempotency, true);
  assert.deepEqual({ users: cleaned.users, articles: cleaned.articles, productionFonts: cleaned.productionFonts, audit: cleaned.audit }, protectedBefore);
  assert.deepEqual(manifest.removed.artifactPaths, [snapshot.artifact.path]);
});

test("clean start weigert een record dat niet eenduidig aan de pilotstructuur voldoet", () => {
  const state = createSportpaleisProductionBootstrap(new Date("2026-08-14T10:00:00.000Z"));
  state.orders = [{ ...pilotOrder("EXTERN-1"), barcode: { value: "anders" } }];
  assert.throws(() => cleanSportpaleisPilotOrders(state), /niet eenduidig/iu);
});
