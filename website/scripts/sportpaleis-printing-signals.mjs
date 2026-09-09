import { CONTEXT_SIGNALS, effectiveSignalDisplay } from "../src/workspace-context-signal-catalog.mjs";

export const PRINTING_ORIGINS = Object.freeze(["KASSABEDRUKKING", "WEBSHOP_BEDRUKKING"]);
const validTime = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const localDay = value => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const hasPrinting = order => (order.productionLines || []).some(line => Number(line.quantity ?? 1) > 0)
  || (order.items || []).some(item => ["name", "initials", "backNumber", "chestNumber", "shortsNumber"].some(key => typeof item.personalization?.[key] === "string" && item.personalization[key].trim()));

// Called only for newly accepted counter orders. Never run during normalization,
// migration, read, restore, or an edit of an existing order.
export function registerCounterPrintingOrigin(state, order, actor) {
  if (order.printingOrigin || order.sourceContext?.source !== "STORE" || !hasPrinting(order)) return;
  const firstEmployeeOrder = actor.status === "Actief" && actor.seatType === "customer" && ["operator", "store"].includes(actor.role);
  const started = state.orders.some(previous => previous.printingOrigin?.source === "KASSABEDRUKKING" && previous.printingOrigin?.tenantId === state.organizationId);
  if (!firstEmployeeOrder && !started) return;
  order.printingOrigin = { version: 1, source: "KASSABEDRUKKING", tenantId: state.organizationId, recordedAt: order.createdAt, actorId: actor.id, sourceIdentity: order.id };
}

// Admission contract for the independently released Intake adapter. No route
// accepts this evidence from a browser. sourceIdentity is the canonical external
// ORDER identity (not a page, selected row or individual print). Legacy intake is not
// connected: only its future verified live adapter may supply the activation.
export function registerWebshopPrintingOrigin(order, { tenantId, actorId, sourceIdentity, observedAt, activation }) {
  if (order.printingOrigin) return;
  if (!tenantId || !actorId || !sourceIdentity || !validTime(observedAt) || activation?.tenantId !== tenantId || activation?.status !== "LIVE" || !activation?.releaseId || !validTime(activation?.activatedAt) || Date.parse(observedAt) < Date.parse(activation.activatedAt) || !validTime(order.createdAt) || Date.parse(order.createdAt) < Date.parse(activation.activatedAt) || order.sourceContext?.source !== "WEBSHOP_XPRT" || !hasPrinting(order)) {
    throw Object.assign(new Error("Webshop-herkomst vereist nieuwe bedrukking uit de geactiveerde live-intake."), { statusCode: 409, code: "PRINTING_SOURCE_NOT_LIVE" });
  }
  order.printingOrigin = { version: 1, source: "WEBSHOP_BEDRUKKING", tenantId, actorId, sourceIdentity, recordedAt: observedAt, activation: { releaseId: activation.releaseId, activatedAt: activation.activatedAt } };
}

export function projectPrintingSignals({ orders, tenantId, policy, userId, allowed, now = new Date(), completedAt }) {
  const display = effectiveSignalDisplay(policy, userId);
  if (!allowed.includes("orders.view") || policy?.tenantId !== tenantId) return { unit: "orders", signals: [] };
  const admitted = orders.filter(order => {
    const origin = order.printingOrigin;
    return origin?.version === 1 && PRINTING_ORIGINS.includes(origin.source) && origin.tenantId === tenantId && origin.actorId && origin.sourceIdentity && validTime(origin.recordedAt)
      && (origin.source !== "WEBSHOP_BEDRUKKING" || allowed.includes("webshop_intake.view") && origin.activation?.releaseId && validTime(origin.activation?.activatedAt) && Date.parse(origin.recordedAt) >= Date.parse(origin.activation.activatedAt));
  });
  const sources = new Set(admitted.map(order => order.printingOrigin.source));
  const values = { "printing.counter": 0, "printing.webshop": 0, "printing.completed_today": 0 };
  const today = localDay(now); const seen = new Set();
  for (const order of admitted) {
    const identity = `${order.printingOrigin.source}:${order.printingOrigin.sourceIdentity}`;
    if (seen.has(identity)) continue; seen.add(identity);
    if (!hasPrinting(order)) continue;
    if (order.stage === "DONE") {
      const at = completedAt(order);
      if (validTime(at) && Date.parse(at) >= Date.parse(order.printingOrigin.recordedAt) && localDay(at) === today) values["printing.completed_today"]++;
    } else if (order.deletion?.status !== "DELETED" && order.productionArchive?.status !== "ARCHIVED") values[order.printingOrigin.source === "KASSABEDRUKKING" ? "printing.counter" : "printing.webshop"]++;
  }
  const visible = id => id === "printing.counter" ? sources.has("KASSABEDRUKKING") : id === "printing.webshop" ? sources.has("WEBSHOP_BEDRUKKING") : sources.size > 0;
  return { unit: "orders", asOf: now.toISOString(), signals: Object.entries(CONTEXT_SIGNALS).filter(([id]) => visible(id) && display[id].priority !== "HIDDEN").map(([id, signal]) => ({ id, label: signal.label, value: values[id], priority: display[id].priority, scope: id === "printing.completed_today" ? "today" : "open", displaySource: display[id].source })) };
}
