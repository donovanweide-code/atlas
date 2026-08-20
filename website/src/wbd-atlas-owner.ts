export interface AtlasEvidence {
  id: string; organizationId: string; source: string; sourceType: string; sourceIdentity: string;
  observedAt: string; fetchedAt: string; normalized: Record<string, unknown>; provenance: Record<string, unknown>;
  freshness: "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE" | "UNKNOWN";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_EVIDENCE";
  capabilityRefs: string[];
}
export interface AtlasAttention {
  id: string; organizationId: string; source: string; type: string; title: string; summary: string;
  severity: string; urgency: string; confidence: string; evidenceRefs: string[]; firstObservedAt: string;
  lastObservedAt: string; status: string; atlasInterpretation: string; nextBestActionId: string | null;
  goRequirement: "NONE" | "REQUIRED" | "FAIL_CLOSED"; occurrenceCount: number;
}
export interface AtlasNextBestAction {
  id: string; attentionId: string; recommendation: string; why: string; evidenceRefs: string[];
  confidence: string; expectedImpact: string; estimatedHumanEffortMinutes: number; risk: string;
  dependencies: string[]; atlasCanPrepare: string[]; goRequirement: string; preparedActionId: string | null;
}
export interface AtlasPreparedAction { id: string; attentionId: string; objective: string; reason: string; impact: string; risk: string; evidenceRefs: string[]; rollbackOrRecovery: string; goRequirement: string; status: string }
export interface AtlasConnectorView { connectorId: string; status: string; health: string; freshness: string; lastSuccessfulAt: string | null; consecutiveFailures: number; sourceUrl: string }
export interface AtlasCapabilityView { id: string; name: string; maturity: string; evidenceRefs: string[]; organizationsWhereProven: string[]; reusable: string; scopeClass: string; lastVerified: string; knownLimitations: string }
export interface AtlasWorkspaceView {
  revision: number; releaseId: string; generatedAt: string; lastVisitedAt: string | null;
  modes: Record<string, string>; sinceLastVisit: AtlasEvidence[]; importantNow: AtlasAttention[];
  investigated: AtlasAttention[]; decisionsNeeded: { id: string; title: string; summary: string; goRequirement: string; source: string; priority: string; dueAt: string | null; href?: string }[];
  canWait: AtlasAttention[]; attention: AtlasAttention[]; evidence: AtlasEvidence[];
  nextBestActions: AtlasNextBestAction[]; preparedActions: AtlasPreparedAction[]; connectors: AtlasConnectorView[];
  capabilityRegistry: AtlasCapabilityView[]; harvestCandidates: unknown[];
}
export interface AtlasSearchView { query: string; total: number; scope: string[]; results: { type: string; id: string; title: string; summary: string; href: string; source: string }[] }

const esc = (value: unknown): string => String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const dateTime = (value: string | null): string => value ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Nog niet beschikbaar";
const confidence = (value: string): string => ({ HIGH: "hoge zekerheid", MEDIUM: "redelijke zekerheid", LOW: "lage zekerheid", INSUFFICIENT_EVIDENCE: "onvoldoende bewijs" })[value] ?? value.toLowerCase();
const freshness = (value: string): string => ({ LIVE: "zojuist opgehaald", RECENT: "recent", STALE: "verouderd", UNAVAILABLE: "bron niet beschikbaar", UNKNOWN: "actualiteit onbekend" })[value] ?? value.toLowerCase();

function evidenceDetail(atlas: AtlasWorkspaceView, refs: string[]): string {
  const items = refs.map((id) => atlas.evidence.find((item) => item.id === id)).filter((item): item is AtlasEvidence => Boolean(item));
  if (!items.length) return '<p class="wbd-atlas-empty">Geen herleidbare evidence gekoppeld.</p>';
  return items.map((item) => `<article class="wbd-atlas-evidence" id="${esc(item.id)}"><header><strong>${esc(item.sourceType.replaceAll("_", " "))}</strong><span data-freshness="${esc(item.freshness)}">${esc(freshness(item.freshness))}</span></header><p>${esc(String(item.normalized.summary ?? item.normalized.title ?? "Genormaliseerde bronevidence"))}</p><small>${esc(item.source)} · gezien ${esc(dateTime(item.observedAt))} · ${esc(confidence(item.confidence))}</small><details><summary>Techniek</summary><code>${esc(String(item.provenance.contentHash ?? item.provenance.normalizedSchemaVersion ?? item.id))}</code></details></article>`).join("");
}

function attentionCard(atlas: AtlasWorkspaceView, item: AtlasAttention, compact = false): string {
  const nba = atlas.nextBestActions.find(({ id }) => id === item.nextBestActionId);
  const prepared = nba?.preparedActionId ? atlas.preparedActions.find(({ id }) => id === nba.preparedActionId) : undefined;
  return `<article class="wbd-atlas-attention" id="${esc(item.id)}" data-severity="${esc(item.severity)}"><header><div><span>${esc(item.type.replaceAll("_", " "))}</span><h3>${esc(item.title)}</h3></div><span>${esc(item.severity.toLowerCase())}</span></header><p>${esc(item.summary)}</p>${compact ? "" : `<div class="wbd-atlas-interpretation"><strong>Wat betekent dit?</strong><p>${esc(item.atlasInterpretation)}</p><small>${esc(confidence(item.confidence))} · ${item.occurrenceCount > 1 ? `${item.occurrenceCount} signalen gegroepeerd` : "één betekenisvol signaal"}</small></div>${nba ? `<section class="wbd-atlas-nba"><span>Next Best Action · ${esc(nba.goRequirement === "NONE" ? "geen GO nodig voor voorbereiding" : "Human GO vereist")}</span><h4>${esc(nba.recommendation)}</h4><p>${esc(nba.why)}</p><dl><div><dt>Impact</dt><dd>${esc(nba.expectedImpact)}</dd></div><div><dt>Menselijke tijd</dt><dd>circa ${nba.estimatedHumanEffortMinutes} min</dd></div><div><dt>Risico</dt><dd>${esc(nba.risk.toLowerCase())}</dd></div></dl>${nba.atlasCanPrepare.length ? `<p><strong>Atlas kan voorbereiden:</strong> ${nba.atlasCanPrepare.map(esc).join(" · ")}</p>` : ""}</section>` : ""}${prepared ? `<details class="wbd-atlas-prepared"><summary>Voorbereide actie</summary><h4>${esc(prepared.objective)}</h4><p>${esc(prepared.reason)}</p><small>Herstelpad: ${esc(prepared.rollbackOrRecovery)}</small></details>` : ""}<details class="wbd-atlas-proof"><summary>Waarom zegt Atlas dit?</summary>${evidenceDetail(atlas, item.evidenceRefs)}</details>`}<footer><small>Laatst gezien ${esc(dateTime(item.lastObservedAt))}</small><span>${item.goRequirement === "NONE" ? "Atlas mag verder voorbereiden" : "Beslissing nodig"}</span></footer></article>`;
}

function evidenceChange(item: AtlasEvidence): string {
  return `<article><span>${esc(item.sourceType.replaceAll("_", " "))}</span><strong>${esc(String(item.normalized.summary ?? item.normalized.title ?? item.sourceIdentity))}</strong><small>${esc(freshness(item.freshness))} · ${esc(dateTime(item.fetchedAt))}</small></article>`;
}

export function renderAtlasToday(topbar: string, atlas: AtlasWorkspaceView): string {
  const connector = atlas.connectors[0];
  return `<main class="wbd-owner-workspace wbd-atlas-workspace">${topbar}<div class="wbd-atlas-layer"><header class="wbd-atlas-today-head"><div><p class="wbd-owner-eyebrow">Owner Workspace · actuele werkelijkheid</p><h1>Today</h1><p>Binnen één blik: wat veranderde, wat aandacht vraagt, wat Atlas al uitzocht en waar jouw beslissing werkelijk nodig is.</p></div><aside><span>Bronstatus</span><strong>${connector ? esc(freshness(connector.freshness)) : "Nog niet verbonden"}</strong><small>${connector?.lastSuccessfulAt ? `Laatste refresh ${esc(dateTime(connector.lastSuccessfulAt))}` : "Geen succesvolle connectorrefresh"}</small></aside></header>
    <section class="wbd-atlas-section" aria-labelledby="important-title"><header><p class="wbd-owner-eyebrow">Nu belangrijk</p><h2 id="important-title">Wat vraagt aandacht?</h2></header><div class="wbd-atlas-cards">${atlas.importantNow.length ? atlas.importantNow.map((item) => attentionCard(atlas, item, true)).join("") : '<p class="wbd-atlas-empty">Geen bekende urgente Attention. Bronfreshness blijft leidend.</p>'}</div></section>
    <div class="wbd-atlas-two"><section class="wbd-atlas-section"><header><p class="wbd-owner-eyebrow">Sinds je laatste bezoek</p><h2>Alleen betekenisvolle verandering</h2></header><div class="wbd-atlas-change-list">${atlas.sinceLastVisit.length ? atlas.sinceLastVisit.slice(0, 6).map(evidenceChange).join("") : '<p class="wbd-atlas-empty">Geen nieuwe centrale evidence sinds het laatste bezoek.</p>'}</div></section><section class="wbd-atlas-section"><header><p class="wbd-owner-eyebrow">Atlas heeft onderzocht</p><h2>Zelfstandig voorbereid</h2></header><div class="wbd-atlas-change-list">${atlas.investigated.length ? atlas.investigated.map((item) => `<article><span>${esc(item.type.replaceAll("_", " "))}</span><strong>${esc(item.title)}</strong><p>${esc(item.atlasInterpretation)}</p><small>${esc(confidence(item.confidence))}</small></article>`).join("") : '<p class="wbd-atlas-empty">Nog geen nieuwe conclusie. Atlas verzint niets zonder evidence.</p>'}</div></section></div>
    <div class="wbd-atlas-two"><section class="wbd-atlas-section" data-decision-section><header><p class="wbd-owner-eyebrow">Beslissing nodig</p><h2>Alleen echte Human GO</h2></header><div class="wbd-atlas-change-list">${atlas.decisionsNeeded.length ? atlas.decisionsNeeded.map((item) => `<article><span>${esc(item.priority)} · ${esc(item.goRequirement)}</span><strong>${esc(item.title)}</strong><p>${esc(item.summary)}</p>${item.href ? `<a href="${esc(item.href)}">Veilig beoordelen</a>` : ""}</article>`).join("") : '<p class="wbd-atlas-empty">Geen materiële beslissing nodig.</p>'}</div></section><section class="wbd-atlas-section"><header><p class="wbd-owner-eyebrow">Kan wachten</p><h2>Bewust niet nu</h2></header><div class="wbd-atlas-change-list">${atlas.canWait.length ? atlas.canWait.map((item) => `<article><span>${esc(item.type.replaceAll("_", " "))}</span><strong>${esc(item.title)}</strong><small>${esc(item.urgency.toLowerCase())} urgentie</small></article>`).join("") : '<p class="wbd-atlas-empty">Geen geparkeerde Attention.</p>'}</div></section></div>
    <section class="wbd-atlas-autonomy"><div><span>LIVE</span><p>Evidence en bronfreshness</p></div><div><span>DETERMINISTIC</span><p>Classificatie en interpretatie</p></div><div><span>PREPARED</span><p>NBA en conceptacties</p></div><div><span>POLICY-BOUND</span><p>Uitvoering vereist risico-evaluatie</p></div></section>
    <footer class="wbd-owner-footer"><span>Centrale owner truth · revisie ${atlas.revision}</span><span>Geen live fetch tijdens render</span><span>Release ${esc(atlas.releaseId)}</span></footer></div></main>`;
}

export function renderAtlasAttention(topbar: string, atlas: AtlasWorkspaceView): string {
  return `<main class="wbd-owner-workspace wbd-atlas-workspace">${topbar}<div class="wbd-atlas-layer"><header class="wbd-atlas-pagehead"><div><p class="wbd-owner-eyebrow">Centrale primitive</p><h1>Attention</h1><p>Geen notification dump: gelijke signalen worden gegroepeerd, freshness en onzekerheid blijven zichtbaar.</p></div><strong>${atlas.attention.length}</strong></header><section class="wbd-atlas-attention-list">${atlas.attention.length ? atlas.attention.map((item) => attentionCard(atlas, item)).join("") : '<p class="wbd-atlas-empty">Geen open Attention.</p>'}</section><footer class="wbd-owner-footer"><span>${atlas.evidence.length} evidence-items centraal</span><span>${atlas.harvestCandidates.length} Harvest candidates</span><span>Revisie ${atlas.revision}</span></footer></div></main>`;
}

function searchResults(view?: AtlasSearchView): string {
  if (!view) return '<p class="wbd-atlas-empty">Zoek door Organizations, Capabilities, Attention en Evidence.</p>';
  if (!view.results.length) return '<p class="wbd-atlas-empty">Geen resultaat in de centrale operationele werkelijkheid.</p>';
  return view.results.map((item) => `<a href="${esc(item.href)}"><span>${esc(item.type)}</span><strong>${esc(item.title)}</strong><p>${esc(item.summary)}</p><small>${esc(item.source)}</small></a>`).join("");
}

export function renderAtlasSearch(topbar: string, view?: AtlasSearchView): string {
  return `<main class="wbd-owner-workspace wbd-atlas-workspace">${topbar}<div class="wbd-atlas-layer"><header class="wbd-atlas-pagehead"><div><p class="wbd-owner-eyebrow">Universele zoekcontext</p><h1>Search</h1><p>Zoek op wat speelt, wat bewezen is, waar Attention openstaat en welke bron dat ondersteunt.</p></div></header><form class="wbd-atlas-search" data-atlas-search><label for="atlas-query">Wat wil je weten?</label><div><input id="atlas-query" name="q" type="search" minlength="2" maxlength="240" required placeholder="Bijvoorbeeld: wat weten we over Bij Cees?" value="${esc(view?.query ?? "")}"><button type="submit">Zoeken</button></div></form><p class="wbd-atlas-search-status" role="status" data-search-status>${view ? `${view.total} resultaten` : ""}</p><section class="wbd-atlas-results" data-search-results>${searchResults(view)}</section></div></main>`;
}

export function bindAtlasSearch(app: HTMLDivElement, runSearch: (query: string) => Promise<AtlasSearchView>): void {
  app.querySelector<HTMLFormElement>("[data-atlas-search]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const query = String(new FormData(form).get("q") ?? "").trim();
    const status = app.querySelector<HTMLElement>("[data-search-status]")!;
    const results = app.querySelector<HTMLElement>("[data-search-results]")!;
    status.textContent = "Atlas zoekt in de centrale werkelijkheid…";
    try {
      const view = await runSearch(query);
      status.textContent = `${view.total} resultaten`;
      results.innerHTML = searchResults(view);
      history.replaceState(null, "", `/workspace/wbd/zoeken?q=${encodeURIComponent(query)}`);
    } catch (cause) {
      status.textContent = cause instanceof Error ? cause.message : "Zoeken is tijdelijk niet beschikbaar.";
    }
  });
}
