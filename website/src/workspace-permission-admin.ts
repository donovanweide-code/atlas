import "./styles/workspace-permissions.css";
import { CONTEXT_SIGNALS, DISPLAY_PRIORITIES } from "./workspace-context-signal-catalog.mjs";
export type EffectivePermissions = { version: number; presetId: string; presetLabel: string; overrideCount: number; allowed: string[]; decisions: Record<string, { allowed: boolean; source: string }> };
type Capability = { id: string; label: string; source: string; allowed: boolean };
type Summary = { enabled: string[]; disabled: string[]; domains: { id: string; label: string; allowed: boolean; capabilities: Capability[] }[] };
type User = { id: string; name: string; presetId: string; overrides: Record<string, "allow" | "deny">; displayPriorities?: Record<string, string>; effective: EffectivePermissions; summary: Summary };
type Configuration = { version: number; presets: Record<string, { label: string; displayPriorities?: Record<string, string> }>; users: User[] };
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
let lastSelectedUserId = "";

export async function mountPermissionAdmin(root: HTMLElement, { csrfToken, onChange }: { csrfToken: string; onChange: () => void }) {
  let config: Configuration; let selectedId = lastSelectedUserId; let busy = false;
  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/sportpaleis/v1/admin/permissions${path}`, { credentials: "same-origin", cache: "no-store", ...init, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken, ...init?.headers } });
    const result = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? "Je sessie is verlopen. Log opnieuw in." : result.error?.message || result.message || "Opslaan niet gelukt. Vernieuw en probeer opnieuw.");
    return result;
  };
  const showError = (error: unknown) => { const status = root.querySelector<HTMLElement>("[data-permission-status]"); if (status) { status.textContent = error instanceof Error ? error.message : "Actie niet gelukt."; status.setAttribute("role", "alert"); } };
  const render = () => {
    if (!root.isConnected) return;
    const user = config.users.find(u => u.id === selectedId) || config.users[0]; selectedId = user?.id || "";
    lastSelectedUserId = selectedId;
    root.innerHTML = `<section class="sp-panel wp-permissions"><p class="sp-eyebrow">BEHEER</p><h1>Gebruikers & rechten</h1><p>Een preset geeft de basis. Pas alleen de uitzonderingen aan.</p><label>Gebruiker<select data-permission-user>${config.users.map(u => `<option value="${esc(u.id)}" ${u.id === selectedId ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></label><p data-permission-status role="status" aria-live="polite"></p>${!user ? "<p>Geen gebruikers geconfigureerd.</p>" : `<div class="wp-permissions__summary"><h2>Wat kan ${esc(user.name)}?</h2><p>${user.summary.enabled.map(esc).join(" · ") || "Geen toegang"}</p><p class="wp-permissions__muted">${user.summary.disabled.map(label => `Geen ${esc(label)}`).join(" · ")}</p><button type="button" class="sp-button sp-button--secondary" data-permission-preview>Bekijk als gebruiker</button></div><form data-permission-form><label>Preset<select name="presetId">${Object.entries(config.presets).map(([id, preset]) => `<option value="${esc(id)}" ${id === user.presetId ? "selected" : ""}>${esc(preset.label)}</option>`).join("")}</select></label><p>${user.effective.overrideCount} aangepaste rechten</p>${user.summary.domains.map(domain => `<details><summary>${esc(domain.label)} <span>${domain.allowed ? "Toegang" : "Geen toegang"}</span></summary>${domain.capabilities.map(capability => `<label class="wp-permissions__capability ${user.overrides[capability.id] ? "wp-permissions__override" : ""}"><span><strong>${esc(capability.label)}</strong><small>${esc(capability.source)}</small></span><select aria-label="${esc(domain.label)}: ${esc(capability.label)}" data-capability="${esc(capability.id)}"><option value="">Volgens preset</option><option value="allow" ${user.overrides[capability.id] === "allow" ? "selected" : ""}>Aan</option><option value="deny" ${user.overrides[capability.id] === "deny" ? "selected" : ""}>Uit</option></select></label>`).join("")}</details>`).join("")}<div class="wp-permissions__actions"><button class="sp-button sp-button--primary">Rechten opslaan</button><button type="button" class="sp-button sp-button--secondary" data-permission-reset>Reset naar preset</button></div></form><section data-permission-preview-panel></section>`}</section>`;
    const displayPanel = document.createElement("details");
    displayPanel.dataset.signalDisplay = "";
    const renderDisplay = () => {
      const presetId = root.querySelector<HTMLSelectElement>('[name="presetId"]')?.value || user.presetId;
      const preset = config.presets[presetId];
      const select = (id: string, attr: string, selected: string, fallback: string) => `<select ${attr}="${esc(id)}"><option value="">${fallback}</option>${DISPLAY_PRIORITIES.map((priority: string) => `<option value="${priority}" ${selected === priority ? "selected" : ""}>${({ PRIMARY: "Prominent", SECONDARY: "Subtiel", HIDDEN: "Verborgen" } as Record<string, string>)[priority]}</option>`).join("")}</select>`;
      displayPanel.innerHTML = `<summary>Contextsignalen <span>Weergave</span></summary><p>Alleen betrouwbare tellingen waarvoor iemand toegang heeft. Dit wijzigt geen rechten.</p>${Object.entries(CONTEXT_SIGNALS).map(([id, signal]) => `<label class="wp-permissions__capability"><span><strong>${esc(signal.label)}</strong><small>Voor deze gebruiker; anders volgens preset.</small></span>${select(id, "data-signal-priority", user.displayPriorities?.[id] || "", "Volgens preset")}</label>`).join("")}<label><input type="checkbox" data-signal-preset-edit> Ook de standaard voor preset ${esc(preset.label)} aanpassen</label><div data-signal-preset-fields hidden><p>Geldt voor alle gebruikers van deze preset, behalve hun eigen uitzonderingen.</p>${Object.entries(CONTEXT_SIGNALS).map(([id, signal]) => `<label class="wp-permissions__capability"><span>${esc(signal.label)}</span>${select(id, "data-preset-signal-priority", preset.displayPriorities?.[id] || "", "Standaard: subtiel")}</label>`).join("")}</div>`;
      displayPanel.querySelector<HTMLInputElement>("[data-signal-preset-edit]")?.addEventListener("change", event => { displayPanel.querySelector<HTMLElement>("[data-signal-preset-fields]")!.hidden = !(event.target as HTMLInputElement).checked; });
    };
    if (user) { root.querySelector(".wp-permissions__actions")?.before(displayPanel); renderDisplay(); root.querySelector('[name="presetId"]')?.addEventListener("change", renderDisplay); }
    root.querySelector<HTMLSelectElement>("[data-permission-user]")?.addEventListener("change", event => { selectedId = (event.target as HTMLSelectElement).value; render(); });
    const save = async (reset = false) => {
      if (busy) return; busy = true;
      const form = root.querySelector<HTMLFormElement>("[data-permission-form]")!;
      const priorities = (selector: string, key: string) => Object.fromEntries([...form.querySelectorAll<HTMLSelectElement>(selector)].filter(select => select.value).map(select => [select.dataset[key], select.value]));
      const input = { expectedVersion: config.version, presetId: new FormData(form).get("presetId"), overrides: Object.fromEntries([...form.querySelectorAll<HTMLSelectElement>("[data-capability]")].filter(select => select.value).map(select => [select.dataset.capability, select.value])), displayPriorities: priorities("[data-signal-priority]", "signalPriority"), ...(!reset && form.querySelector<HTMLInputElement>("[data-signal-preset-edit]")?.checked ? { presetDisplayPriorities: priorities("[data-preset-signal-priority]", "presetSignalPriority") } : {}), reset };
      root.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.disabled = true);
      try {
        await request(`/users/${encodeURIComponent(selectedId)}`, { method: "PATCH", body: JSON.stringify(input) });
        config = await request(""); render(); onChange();
        const status = root.querySelector("[data-permission-status]"); if (status) status.textContent = "Rechten opgeslagen. Ze gelden direct bij de volgende actie.";
      } catch (error) { showError(error); } finally { busy = false; root.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.disabled = false); }
    };
    root.querySelector("[data-permission-form]")?.addEventListener("submit", event => { event.preventDefault(); void save(); });
    root.querySelector("[data-permission-reset]")?.addEventListener("click", () => void save(true));
    root.querySelector("[data-permission-preview]")?.addEventListener("click", async () => {
      try {
        const preview = await request(`/users/${encodeURIComponent(selectedId)}/preview`);
        const panel = root.querySelector<HTMLElement>("[data-permission-preview-panel]");
        if (panel) panel.innerHTML = `<div class="wp-permissions__preview" role="status"><h2>Je bekijkt Workspace als ${esc(user.name)}</h2><p>Alleen-lezen voorbeeld van toegang. Je blijft zelf aangemeld.</p><h3>Beschikbare onderdelen</h3><p>${preview.summary.enabled.map(esc).join(" · ") || "Geen"}</p>${preview.summary.domains.filter((d: Summary["domains"][number]) => d.allowed).map((d: Summary["domains"][number]) => `<details><summary>${esc(d.label)}</summary><ul>${d.capabilities.filter(c => c.allowed).map(c => `<li>${esc(c.label)} — ${esc(c.source)}</li>`).join("")}</ul></details>`).join("")}</div>`;
      } catch (error) { showError(error); }
    });
  };
  root.innerHTML = '<section class="sp-panel"><p data-permission-status role="status">Rechten laden…</p></section>';
  try { config = await request(""); render(); } catch (error) { showError(error); }
}
