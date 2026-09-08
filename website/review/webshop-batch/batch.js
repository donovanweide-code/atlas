const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const labels = { BACK_NUMBER: "Rugnummer", BACK_NAME: "Naam (rug)", INITIALS: "Initialen", NAME_PRINT: "Naam opdruk", NUMBER: "Nummer", CHEST_NUMBER: "Borstnummer", SHORTS_NUMBER: "Shortnummer", STOCK_LOGO: "Logo", UNKNOWN: "Onbekende opdruk" };
let csrf, batch, editing, pendingPreview;
const selected = new Set();
window.batchInteractionMetrics = {};
const measure = (name, start) => { window.batchInteractionMetrics[name] = performance.now() - start; };
async function request(path, body) {
  const result = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-Batch-CSRF": csrf }, body: JSON.stringify(body) });
  const data = await result.json();
  if (!result.ok) throw Object.assign(new Error(data.error ?? "De actie is niet gelukt."), { code: data.code });
  return data;
}
function notice(message, failed = false) { $("notice").textContent = message; $("notice").className = failed ? "error" : ""; }
function dateLabel(iso) { return iso ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(`${iso}T12:00:00Z`)) : "Datum controleren"; }
function selectable(row) { return !row.excluded && !row.completed; }
function filtered() {
  const query = $("search").value.trim().toLowerCase();
  const filter = $("filter").value, sort = $("sort").value;
  const rows = batch.items.filter((row) => {
    if (query && ![row.orderNumber, row.values.articleNumber, row.values.description, row.club].some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
    return filter === "all" || filter === "active" && selectable(row) || filter === "review" && selectable(row) && row.production.status !== "READY" || filter === "selected" && selected.has(row.id) || filter === "excluded" && row.excluded || filter === "completed" && row.completed;
  });
  const date = (a, b) => (a.orderDate ?? "9999").localeCompare(b.orderDate ?? "9999");
  rows.sort((a, b) => {
    const main = sort === "newest" ? date(b, a) : sort === "number" ? a.orderNumber.localeCompare(b.orderNumber, "nl", { numeric: true }) : sort === "color" ? a.values.color.localeCompare(b.values.color, "nl") : sort === "review" ? Number(a.production.status === "READY") - Number(b.production.status === "READY") : date(a, b);
    return main || a.orderNumber.localeCompare(b.orderNumber, "nl", { numeric: true }) || a.sourceIndex - b.sourceIndex;
  });
  return rows;
}
function profileLabel(row) {
  const p = row.production?.sizeProfile;
  const value = row.values.sizeProfile === "CUSTOM" ? row.values.customProfile || "Vrij profiel" : ({ JUNIOR: "Junior", SENIOR: "Senior" })[p?.value] ?? ({ JUNIOR: "Junior", SENIOR: "Senior" })[row.values.sizeProfile] ?? "Niet zeker";
  return `${value}${p?.automatic ? " · automatisch herkend" : value !== "Niet zeker" ? " · handmatig" : ""}`;
}
function thumbnail(row) {
  return `<span class="thumbnail" aria-hidden="true">${row.catalog?.thumbnail ? `<img src="${esc(row.catalog.thumbnail)}" width="48" height="48" loading="lazy" decoding="async" alt="">` : '<span>—</span>'}</span>`;
}
document.addEventListener("error", (event) => { if (event.target.matches?.(".thumbnail img")) event.target.hidden = true; }, true);
function status(row) {
  if (row.completed) return '<span class="badge muted">Voorbereid in proef</span>';
  if (row.excluded) return '<span class="badge muted">Uitgesloten</span>';
  if (row.production.status === "READY") return `<span class="badge">Klaar voor proef</span>${row.reviewed ? '<div class="meta">Gecontroleerd</div>' : ""}`;
  return `<span class="badge warn">Controle nodig</span>${[...new Set(row.production.issues.map(({ message }) => message))].map((message) => `<p class="reason">${esc(message)}</p>`).join("")}`;
}
function renderRows() {
  if (!batch) return;
  const visible = filtered();
  let lastOrder = null, html = "";
  for (const row of visible) {
    if (row.orderNumber !== lastOrder) {
      if (lastOrder !== null) html += "</section>";
      html += `<section class="order-group" aria-label="Bestelling ${esc(row.orderNumber)}"><div class="order-heading"><button class="order-open" data-order="${esc(row.orderNumber)}" aria-label="Open bestelling ${esc(row.orderNumber)}">${esc(row.orderNumber)} <span aria-hidden="true">↗</span></button><time datetime="${esc(row.orderDate)}">${esc(dateLabel(row.orderDate))}</time></div>`;
      lastOrder = row.orderNumber;
    }
    html += `<article class="item ${selected.has(row.id) ? "selected" : ""} ${row.excluded ? "excluded" : ""}" data-row="${row.id}">
      <div class="pick"><input type="checkbox" data-select="${row.id}" aria-label="Selecteer ${esc(row.orderNumber)} artikel ${esc(row.values.articleNumber)}" ${selected.has(row.id) ? "checked" : ""} ${!selectable(row) ? "disabled" : ""}></div>
      <div class="article">${thumbnail(row)}<h3>${esc(row.values.description)}</h3><div class="meta">${esc(row.values.articleNumber)}${row.club ? ` · ${esc(row.club)}` : ""}</div>${row.corrected ? '<div class="corrected">Handmatig aangepast</div>' : ""}${row.override?.structuralRuleCandidate ? '<div class="corrected">Bronfout gemarkeerd</div>' : ""}</div>
      <div class="variant"><span class="cell-label">Maat · artikelkleur</span>${esc(row.values.size)} · ${esc(row.values.color)}<div class="profile-label">${esc(profileLabel(row))}</div></div>
      <div class="quantity"><span class="cell-label">Aantal</span>${esc(row.values.quantity)}</div>
      <div class="print">${row.values.personalizations.map((p) => `<span class="cell-label">${esc(labels[p.type] ?? p.type)}</span><strong>${esc(p.value || "Ontbreekt")}</strong>`).join("")}</div>
      <div class="item-status">${status(row)}</div><div class="item-actions">${!row.completed ? `<button data-action="edit" data-id="${row.id}">Aanpassen</button>${row.production.status !== "READY" ? `<button data-action="free" data-id="${row.id}">Vrij invoeren</button>` : ""}<button class="text-button" data-action="${row.excluded ? "restore" : "exclude"}" data-id="${row.id}">${row.excluded ? "Terug in batch" : "Niet meenemen"}</button>${!row.reviewed && !row.excluded ? `<button class="text-button" data-action="review" data-id="${row.id}">Gecontroleerd</button>` : ""}` : ""}</div></article>`;
  }
  if (lastOrder !== null) html += "</section>";
  $("rows").innerHTML = html || '<div class="empty"><h2>Geen passende bedrukte regels</h2><p>Pas je zoekopdracht of filter aan.</p></div>';
  const candidates = visible.filter(selectable);
  const selectedVisible = candidates.filter(({ id }) => selected.has(id)).length;
  $("select-visible").checked = !!candidates.length && selectedVisible === candidates.length;
  $("select-visible").indeterminate = selectedVisible > 0 && selectedVisible < candidates.length;
  $("result-count").textContent = `${visible.length} van ${batch.items.length} bedrukte regels`;
  renderSelection();
}
function renderSelection() {
  const chosen = batch.items.filter(({ id }) => selected.has(id));
  const ready = chosen.filter((row) => selectable(row) && row.production.status === "READY").length;
  $("selection-count").textContent = `${chosen.length} geselecteerd`;
  $("selection-detail").textContent = chosen.length ? `${ready} klaar · ${chosen.length - ready} te controleren` : "Kies de regels voor je proef.";
  $("prepare").disabled = !chosen.length;
}
function render() {
  document.body.classList.add("loaded");
  $("workspace").hidden = false; $("empty").hidden = true; $("selection-bar").hidden = false;
  for (const id of selected) if (!batch.items.some((row) => row.id === id && selectable(row))) selected.delete(id);
  const ready = batch.items.filter((row) => selectable(row) && row.production.status === "READY").length;
  const check = batch.items.filter((row) => selectable(row) && row.production.status !== "READY").length;
  $("stats").innerHTML = [[batch.orderCount, "bestellingen"], [batch.itemCount, "bedrukte regels"], [check, "controle nodig"]].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("source-warnings").innerHTML = batch.sourceWarnings.map((w) => `<p class="reason">Bestelling ${esc(w.orderNumber)}: ${esc(w.message)}</p>`).join("");
  renderRows();
}
$("load").onclick = async () => {
  $("load").disabled = true; $("load").textContent = "Batch laden…"; notice("");
  try { batch = await request("/api/load", {}); render(); }
  catch (error) { notice(error.message, true); }
  finally { $("load").disabled = false; $("load").textContent = "Vernieuwen"; }
};
$("search").oninput = () => { const start = performance.now(); renderRows(); measure("searchMs", start); };
$("sort").onchange = $("filter").onchange = renderRows;
$("clear").onclick = () => { selected.clear(); renderRows(); };
$("select-visible").onchange = (event) => { const start = performance.now(); for (const row of filtered().filter(selectable)) event.target.checked ? selected.add(row.id) : selected.delete(row.id); renderRows(); measure("selectionMs", start); };
$("rows").onchange = (event) => {
  const id = event.target.dataset.select; if (!id) return;
  const start = performance.now(); event.target.checked ? selected.add(id) : selected.delete(id); renderRows();
  document.querySelector(`[data-select="${id}"]`)?.focus(); measure("selectionMs", start);
};
async function change(id, action, extra = {}) {
  batch = await request("/api/override", { id, action, revision: batch.revision, ...extra }); render();
}
$("rows").onclick = async (event) => {
  const orderButton = event.target.closest("button[data-order]"); if (orderButton) return openOrder(orderButton.dataset.order);
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const { id, action } = button.dataset;
  if (action === "edit" || action === "free") return openEdit(id, action === "free");
  button.disabled = true;
  try { await change(id, action); notice(action === "exclude" ? "Regel uitgesloten. Je kunt hem terugzetten via het filter Uitgesloten." : action === "restore" ? "Regel staat weer in de batch." : "Regel gemarkeerd als gecontroleerd."); }
  catch (error) { notice(error.message, true); button.disabled = false; }
};
function openEdit(id, free = false) {
  const start = performance.now(); editing = id;
  const row = batch.items.find((item) => item.id === id);
  $("edit-title").textContent = free ? "Vrij invoeren" : "Artikelregel aanpassen";
  $("edit-order").textContent = `Bestelling ${row.orderNumber}`;
  $("edit-fields").innerHTML = `<div class="form-grid">${[["articleNumber", "Artikelnummer"], ["description", "Omschrijving"], ["size", "Maat"], ["color", "Artikelkleur"], ["quantity", "Aantal"]].map(([field, label]) => `<label class="${field === "description" ? "wide" : ""}">${label}<input name="${field}" type="${field === "quantity" ? "number" : "text"}" value="${esc(row.values[field])}" ${field === "quantity" ? 'min="1" max="999"' : 'maxlength="240"'} required></label>`).join("")}<label class="wide">Junior / Senior<select name="sizeProfile"><option value="AUTO">Automatisch — ${esc(profileLabel(row))}</option>${[["JUNIOR", "Junior"], ["SENIOR", "Senior"], ["CUSTOM", "Vrij invoeren"]].map(([value, label]) => `<option value="${value}" ${row.values.sizeProfile === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="wide" id="custom-profile-label" ${row.values.sizeProfile === "CUSTOM" ? "" : "hidden"}>Vrij profiel<input name="customProfile" type="text" maxlength="120" placeholder="Bijvoorbeeld afwijkende plaatsing of maat" value="${esc(row.values.customProfile ?? "")}"><span class="hint">Wordt vastgelegd voor controle. Een goedgekeurde productiebron blijft nodig.</span></label>${row.values.personalizations.map((p, index) => `<div class="personalization-edit"><label>Type bedrukking<select name="type-${index}">${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === p.type ? "selected" : ""}>${label}</option>`).join("")}</select></label><label>Opdrukwaarde<input type="text" name="value-${index}" value="${esc(p.value)}" maxlength="120"></label></div>`).join("")}</div>`;
  $("edit-fields").querySelector('[name="sizeProfile"]').onchange = (event) => { $("custom-profile-label").hidden = event.target.value !== "CUSTOM"; };
  $("structural").checked = row.override?.structuralRuleCandidate ?? false;
  $("reload-edit").hidden = true; $("edit-error").textContent = ""; $("edit-dialog").showModal(); measure("editOpenMs", start);
}
$("edit-form").onsubmit = async (event) => {
  event.preventDefault(); const start = performance.now(); const button = event.submitter; button.disabled = true;
  const form = new FormData(event.target), row = batch.items.find(({ id }) => id === editing);
  const values = Object.fromEntries(["articleNumber", "description", "size", "color"].map((key) => [key, form.get(key).trim()]));
  values.sizeProfile = form.get("sizeProfile"); values.customProfile = values.sizeProfile === "CUSTOM" ? form.get("customProfile").trim() : "";
  values.quantity = Number(form.get("quantity")); values.personalizations = row.values.personalizations.map((p, index) => ({ type: form.get(`type-${index}`), value: form.get(`value-${index}`).trim() }));
  try { await change(editing, "edit", { values, structuralRuleCandidate: $("structural").checked }); $("edit-dialog").close(); notice("Correctie bewaard voor deze artikelregel."); measure("editSaveMs", start); document.querySelector(`[data-id="${editing}"]`)?.focus(); }
  catch (error) { $("edit-error").textContent = error.message; $("reload-edit").hidden = error.code !== "REVISION_CONFLICT"; }
  finally { button.disabled = false; }
};
$("reset-source").onclick = async () => { try { await change(editing, "reset"); $("edit-dialog").close(); notice("De oorspronkelijke bronwaarde is hersteld."); } catch (error) { $("edit-error").textContent = error.message; } };
document.querySelectorAll("[data-close]").forEach((button) => { button.onclick = () => $(button.dataset.close).close(); });
$("prepare").onclick = async () => {
  $("prepare").disabled = true;
  try {
    pendingPreview = await request("/api/preview", { ids: [...selected], revision: batch.revision });
    const p = pendingPreview;
    $("summary").innerHTML = `<div class="summary-stat"><span>${p.selectedCount} geselecteerd · ${p.orderCount} bestellingen</span><br><strong>${p.itemCount} bedrukte ${p.itemCount === 1 ? "regel" : "regels"}</strong> uit ${p.orderCount} bestellingen kunnen door.</div><p>Foliekleuren: <strong>${esc(Object.entries(p.colorCounts).map(([color, count]) => `${color.toUpperCase()} ${count}`).join(" · ") || "Nog geen geldige selectie")}</strong></p><p>${p.pieceCount} artikelen · ${p.blocked.length} regels blijven voor controle · ${p.excluded.length} niet meegenomen</p>${p.blocked.length ? `<h3>Deze regels blijven in de batch</h3><ul class="summary-list">${p.blocked.map((r) => `<li><strong>${esc(r.orderNumber)}</strong> — ${r.reasons.map(esc).join(" ")}</li>`).join("")}</ul>` : ""}<details><summary>Productiegegevens controleren</summary><ul class="summary-list">${p.eligible.map(({ contract: c }) => `<li>${esc(c.externalReference)} · ${esc(c.articleNumber)} · ${c.quantity} × maat ${esc(c.size)} · ${esc(c.articleColor)}<br>${c.productionLines.map((line) => `${esc(line.content)} · ${esc(line.heightMm)} mm hoog · folie ${esc(c.foilColor)}`).join("<br>")}</li>`).join("")}</ul></details>`;
    $("confirm").disabled = !p.itemCount; $("confirm-error").textContent = ""; $("confirm-dialog").showModal();
  } catch (error) { notice(error.message, true); }
  finally { renderSelection(); }
};
$("confirm").onclick = async () => {
  $("confirm").disabled = true;
  try {
    const receipt = await request("/api/confirm", { previewId: pendingPreview.id, revision: pendingPreview.revision, confirmed: true });
    for (const id of receipt.itemIds) selected.delete(id);
    batch = await request("/api/batch"); render(); $("confirm-dialog").close();
    notice(`${receipt.itemIds.length} ${receipt.itemIds.length === 1 ? "regel" : "regels"} voorbereid in de proef. Er is geen echte PlotJob gemaakt.`);
  } catch (error) { $("confirm-error").textContent = error.message; $("confirm").disabled = false; }
};
try {
  ({ csrf } = await request("/api/session"));
  $("load").disabled = false;
  // Reload preserves the operator's deltas. No PDF parse occurs until /api/load.
  const response = await fetch("/api/batch");
  if (response.ok) { batch = await response.json(); render(); $("load").textContent = "Vernieuwen"; }
} catch (error) { notice(error.message, true); }

async function openOrder(number) {
  $("order-title").textContent = `Bestelling ${number}`;
  $("order-content").textContent = "Bestelling laden…"; $("order-dialog").showModal();
  const start = performance.now();
  try {
    const order = await request("/api/order", { orderNumber: number });
    if (!$("order-dialog").open) return;
    const rowHtml = (row) => `<div class="detail-item"><div>${thumbnail(row)}<strong>${esc(row.values.description)}</strong><div class="meta">${esc(row.values.articleNumber)} · ${esc(row.values.size)} · ${esc(row.values.color)} · aantal ${esc(row.values.quantity ?? "onbekend")}</div>${row.printingRequired ? `<p>${row.values.personalizations.map((p) => `${esc(labels[p.type])}: <strong>${esc(p.value)}</strong>`).join(" · ")}</p><div>${status(row)}</div>${row.excluded ? "<p>Niet meegenomen in batch</p>" : ""}<button data-detail-edit="${row.id}" ${row.completed ? "disabled" : ""}>Aanpassen</button>` : '<span class="meta">Alleen ordercontext · geen productieactie</span>'}</div></div>`;
    const changed = order.items.filter((r) => r.corrected);
    $("order-content").innerHTML = `<p class="detail-summary">${esc(dateLabel(order.orderDate))} · ${order.itemCount} artikelregels · ${order.printingCount} bedrukt</p><h3>Bedrukking</h3>${order.items.filter((r) => r.printingRequired).map(rowHtml).join("")}<h3>Overige artikelen</h3>${order.items.filter((r) => !r.printingRequired).map(rowHtml).join("") || '<p class="hint">Geen overige artikelen.</p>'}<h3>Aanpassingen</h3>${changed.map((r) => `<p>${esc(r.values.articleNumber)} · handmatig aangepast</p><details><summary>Oorspronkelijke bronwaarden</summary><p>${esc(r.source.description)} · ${esc(r.source.size)} · ${esc(r.source.color)} · aantal ${esc(r.source.quantity)}<br>${r.source.personalizations.map((p) => `${esc(labels[p.type])}: ${esc(p.value)}`).join(" · ")}</p></details>`).join("") || '<p class="hint">Geen handmatige correcties.</p>'}`;
    measure("orderOpenMs", start);
  } catch (error) { $("order-content").textContent = error.message; }
}
$("order-content").onclick = (event) => { const button = event.target.closest("[data-detail-edit]"); if (button) { $("order-dialog").close(); openEdit(button.dataset.detailEdit); } };

$("reload-edit").onclick = async () => {
  try { batch = await request("/api/batch"); render(); $("edit-dialog").close(); openEdit(editing); $("edit-error").textContent = "Je ziet nu de laatste versie. Controleer de waarden voordat je opnieuw bewaart."; }
  catch (error) { $("edit-error").textContent = error.message; }
};
