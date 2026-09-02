import test from "node:test";
import assert from "node:assert/strict";
import { openProductionColorContexts, unprintedProductionGroup } from "../src/sportpaleis/open-production-colors.ts";

const line = (id, color) => ({ id, itemId: `item-${id}`, foilColor: color });
const order = (id, color, productionStatus = "IN_PRODUCTION") => ({
  id,
  revision: 1,
  customer: id,
  customerEmail: `${id.toLowerCase()}@example.nl`,
  association: "Praktijkvereniging",
  createdAt: "2026-08-25T08:00:00.000Z",
  promisedAt: null,
  stage: productionStatus === "READY" ? "CONTROL" : "PRINT",
  productionStatus,
  orderKind: "INDIVIDUAL",
  owner: "Sportpaleis",
  totalPieces: 1,
  items: [{ id: `item-line-${id}`, product: "Shirt", quantity: 1, foilColor: color }],
  productionLines: [line(`line-${id}`, color)],
  eventHistory: [],
});

const group = (id, color, orderId, status = "OPEN", productionJobId = null) => ({
  id,
  label: color,
  foilColor: color,
  outputWriter: { id: "cutjob-svg-writer", version: "1" },
  orders: [{ id: orderId, expectedRevision: 1 }],
  productionLineRefs: [{ orderId, lineId: `line-${orderId}` }],
  status,
  productionJobId,
});

test("ZWART en BLAUW blijven tegelijk OPEN; een voorbereid PlotJob sluit ZWART niet", () => {
  const black = order("SP-ZWART-1", "ZWART");
  const blue = order("SP-BLAUW-1", "BLAUW");
  const blackGroup = group("group-black", "ZWART", black.id, "CONVERTED", "job-black");
  const blueGroup = group("group-blue", "BLAUW", blue.id);
  const state = {
    orders: [black, blue],
    productionProposals: [{ id: "proposal-1", groups: [blackGroup, blueGroup] }],
    productionJobs: [{ id: "job-black", status: "AWAITING_HUMAN_CHECK" }],
  };

  const contexts = openProductionColorContexts(state);
  assert.deepEqual(contexts.map(({ foilColor }) => foilColor), ["BLAUW", "ZWART"]);
  assert.deepEqual(contexts.find(({ foilColor }) => foilColor === "ZWART").activeProductionJobIds, ["job-black"]);
  assert.ok(unprintedProductionGroup(state, blackGroup), "de voorbereide ZWARTE PlotJob blijft open tot Bedrukt");
});

test("nieuwe ZWARTE order voegt zich vóór Bedrukt bij dezelfde open kleurcontext", () => {
  const blackPrepared = order("SP-ZWART-1", "ZWART");
  const blue = order("SP-BLAUW-1", "BLAUW");
  const blackNew = order("SP-ZWART-2", "ZWART", "READY");
  const blackGroup = group("group-black", "ZWART", blackPrepared.id, "CONVERTED", "job-black");
  const state = {
    orders: [blackPrepared, blue, blackNew],
    productionProposals: [{ id: "proposal-1", groups: [blackGroup, group("group-blue", "BLAUW", blue.id)] }],
    productionJobs: [{ id: "job-black", status: "AWAITING_HUMAN_CHECK" }],
  };

  const black = openProductionColorContexts(state).find(({ foilColor }) => foilColor === "ZWART");
  assert.deepEqual(black.orderIds, ["SP-ZWART-1", "SP-ZWART-2"]);
  assert.deepEqual(black.productionLineRefs, [
    { orderId: "SP-ZWART-1", lineId: "line-SP-ZWART-1" },
    { orderId: "SP-ZWART-2", lineId: "line-SP-ZWART-2" },
  ]);
});

test("gedeeltelijk maakbare order telt alleen server-side eligible regels in de open kleurcontext", () => {
  const partial = order("SP-PARTIAL-1", "WIT", "READY");
  partial.productionLines.push(line("line-SP-PARTIAL-1-blocked", "WIT"));
  partial.productionReadyLineIds = ["line-SP-PARTIAL-1"];
  partial.productionBlockedLineIds = ["line-SP-PARTIAL-1-blocked"];
  const state = { orders: [partial], productionProposals: [], productionJobs: [] };

  assert.deepEqual(openProductionColorContexts(state), [{
    foilColor: "WIT",
    orderIds: ["SP-PARTIAL-1"],
    productionLineRefs: [{ orderId: "SP-PARTIAL-1", lineId: "line-SP-PARTIAL-1" }],
    proposalGroupIds: [],
    activeProductionJobIds: [],
  }]);
});

test("alleen het exact als Bedrukt vastgelegde werk verdwijnt uit de open context", () => {
  const blackPrinted = order("SP-ZWART-1", "ZWART");
  blackPrinted.eventHistory.push({
    type: "PRODUCTION_GROUP_PRINTED",
    at: "2026-08-25T09:00:00.000Z",
    userId: "operator",
    userName: "Operator",
    source: "production-job",
    details: { productionLineRefs: [{ orderId: blackPrinted.id, lineId: `line-${blackPrinted.id}` }] },
  });
  const blackNew = order("SP-ZWART-2", "ZWART", "READY");
  const completedGroup = group("group-black", "ZWART", blackPrinted.id, "CONVERTED", "job-black");
  const state = {
    orders: [blackPrinted, blackNew],
    productionProposals: [{ id: "proposal-1", groups: [completedGroup] }],
    productionJobs: [{ id: "job-black", status: "COMPLETED" }],
  };

  const contexts = openProductionColorContexts(state);
  assert.deepEqual(contexts, [{ foilColor: "ZWART", orderIds: ["SP-ZWART-2"], productionLineRefs: [{ orderId: "SP-ZWART-2", lineId: "line-SP-ZWART-2" }], proposalGroupIds: [], activeProductionJobIds: [] }]);
  assert.equal(unprintedProductionGroup(state, completedGroup), null);
});
