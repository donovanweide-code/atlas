import type { ProductionProposal, WorkspaceOrder } from "./workspace-data.ts";
import type { PilotBootstrap } from "./pilot-api.ts";
import { isOperationalProductionOrder } from "../workspace-search.ts";

type ProductionGroup = NonNullable<ProductionProposal["groups"]>[number];

export interface OpenProductionProjectionIndex {
  orders: Map<string, WorkspaceOrder>;
  jobs: Map<string, PilotBootstrap["productionJobs"][number]>;
  printed: Map<string, Set<string>>;
}

function normalizedColor(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("nl-NL");
}

function printedLineKeys(order: WorkspaceOrder): Set<string> {
  const keys = new Set<string>();
  for (const event of order.eventHistory ?? []) {
    if (event.type !== "PRODUCTION_GROUP_PRINTED") continue;
    const refs = Array.isArray(event.details?.productionLineRefs) ? event.details.productionLineRefs : [];
    for (const ref of refs) {
      if (!ref || typeof ref !== "object") continue;
      const candidate = ref as { orderId?: unknown; lineId?: unknown };
      if (String(candidate.orderId ?? "") === order.id && String(candidate.lineId ?? "")) keys.add(`${order.id}|${String(candidate.lineId)}`);
    }
  }
  return keys;
}

export function createOpenProductionProjectionIndex(state: Pick<PilotBootstrap, "orders" | "productionJobs">): OpenProductionProjectionIndex {
  const orders = new Map(state.orders.filter(isOperationalProductionOrder).map((order) => [order.id, order]));
  return {
    orders,
    jobs: new Map(state.productionJobs.map((job) => [job.id, job])),
    printed: new Map([...orders].map(([id, order]) => [id, printedLineKeys(order)])),
  };
}

function lineColor(order: WorkspaceOrder, lineId: string): string {
  const line = order.productionLines?.find(({ id }) => id === lineId);
  if (String(line?.foilColor ?? "").trim()) return String(line!.foilColor).trim();
  const item = order.items.find(({ id }) => id === line?.itemId);
  return String(item?.foilColor ?? "Onbekend").trim() || "Onbekend";
}

function isCurrentlyProductionReadyLine(order: WorkspaceOrder, lineId: string): boolean {
  if (Array.isArray(order.productionReadyLineIds)) return order.productionReadyLineIds.includes(lineId);
  if (Array.isArray(order.productionBlockedLineIds)) return !order.productionBlockedLineIds.includes(lineId);
  return true;
}

export interface OpenProductionColorContext {
  foilColor: string;
  orderIds: string[];
  productionLineRefs: { orderId: string; lineId: string }[];
  proposalGroupIds: string[];
  activeProductionJobIds: string[];
}

/**
 * Operational color work is open until its exact line reference has a physical
 * PRODUCTION_GROUP_PRINTED event. Proposals, SVGs and awaiting PlotJobs are
 * deliberately only preparation evidence and never close a color.
 */
export function openProductionColorContexts(state: Pick<PilotBootstrap, "orders" | "productionProposals" | "productionJobs">, projection = createOpenProductionProjectionIndex(state)): OpenProductionColorContext[] {
  const { orders, jobs, printed } = projection;
  const contexts = new Map<string, OpenProductionColorContext>();
  const referenced = new Set<string>();
  const add = (foilColor: string, orderId: string, lineId: string, groupId?: string, jobId?: string) => {
    const key = normalizedColor(foilColor);
    if (!key) return;
    const current = contexts.get(key) ?? { foilColor, orderIds: [], productionLineRefs: [], proposalGroupIds: [], activeProductionJobIds: [] };
    if (!current.orderIds.includes(orderId)) current.orderIds.push(orderId);
    if (!current.productionLineRefs.some((ref) => ref.orderId === orderId && ref.lineId === lineId)) current.productionLineRefs.push({ orderId, lineId });
    if (groupId && !current.proposalGroupIds.includes(groupId)) current.proposalGroupIds.push(groupId);
    if (jobId && !current.activeProductionJobIds.includes(jobId)) current.activeProductionJobIds.push(jobId);
    contexts.set(key, current);
  };

  for (const proposal of state.productionProposals ?? []) {
    for (const group of proposal.groups ?? []) {
      const job = group.productionJobId ? jobs.get(group.productionJobId) : undefined;
      if (job?.status === "COMPLETED") continue;
      for (const ref of group.productionLineRefs) {
        const order = orders.get(ref.orderId);
        if (!order || printed.get(order.id)?.has(`${order.id}|${ref.lineId}`)) continue;
        referenced.add(`${order.id}|${ref.lineId}`);
        add(group.foilColor || lineColor(order, ref.lineId), order.id, ref.lineId, group.id, job?.status === "AWAITING_HUMAN_CHECK" ? job.id : undefined);
      }
    }
  }

  for (const order of orders.values()) {
    if (!['READY', 'IN_PRODUCTION'].includes(String(order.productionStatus ?? ""))) continue;
    for (const line of order.productionLines ?? []) {
      const key = `${order.id}|${line.id}`;
      if (referenced.has(key) || printed.get(order.id)?.has(key) || !isCurrentlyProductionReadyLine(order, line.id)) continue;
      add(lineColor(order, line.id), order.id, line.id);
    }
  }

  return [...contexts.values()].sort((left, right) => left.foilColor.localeCompare(right.foilColor, "nl-NL"));
}

export function unprintedProductionGroup(state: Pick<PilotBootstrap, "orders" | "productionJobs">, group: ProductionGroup, projection = createOpenProductionProjectionIndex(state)): ProductionGroup | null {
  const job = group.productionJobId ? projection.jobs.get(group.productionJobId) : undefined;
  if (job?.status === "COMPLETED") return null;
  const productionLineRefs = group.productionLineRefs.filter(({ orderId, lineId }) => {
    const order = projection.orders.get(orderId);
    return Boolean(order?.productionLines?.some(({ id }) => id === lineId)) && !projection.printed.get(orderId)?.has(`${orderId}|${lineId}`);
  });
  if (!productionLineRefs.length) return null;
  const includedOrderIds = new Set(productionLineRefs.map(({ orderId }) => orderId));
  return { ...group, productionLineRefs, orders: group.orders.filter(({ id }) => includedOrderIds.has(id)) };
}
