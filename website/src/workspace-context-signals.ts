import "./styles/workspace-context-signals.css";
type Signal = { id: string; label: string; value: number; priority: "PRIMARY" | "SECONDARY"; scope: "open" | "today" };
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

export async function mountContextSignals(root: HTMLElement) {
  try {
    const response = await fetch("/api/sportpaleis/v1/context-signals", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok || !root.isConnected) return;
    const body = await response.json() as { signals: Signal[] };
    if (!root.isConnected) return;
    const signals = body.signals.filter(signal => ["PRIMARY", "SECONDARY"].includes(signal.priority) && Number.isSafeInteger(signal.value) && signal.value >= 0);
    if (!signals.length) return;
    const primary = signals.filter(signal => signal.priority === "PRIMARY"), secondary = signals.filter(signal => signal.priority === "SECONDARY");
    root.innerHTML = `<section class="workspace-signals" aria-label="Bedrukking · contextsignalen"><p class="workspace-signals__label">Bedrukking <span>· orders</span></p>${primary.length ? `<div class="workspace-signals__cards">${primary.map(signal => `<article data-context-signal="${esc(signal.id)}"><span>${esc(signal.label)}</span><strong>${signal.value}</strong><small>${signal.scope === "today" ? "vandaag afgerond" : "open orders"}</small></article>`).join("")}</div>` : ""}${secondary.length ? `<div class="workspace-signals__chips">${secondary.map(signal => `<span data-context-signal="${esc(signal.id)}" title="${signal.scope === "today" ? "Vandaag afgeronde bedrukkingorders" : "Open bedrukkingorders"}">${esc(signal.label)} <strong>${signal.value}</strong></span>`).join("")}</div>` : ""}</section>`;
  } catch { /* Optional context never blocks the operational Workspace. */ }
}
