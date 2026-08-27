import type { PilotBootstrap } from "../pilot-api.ts";
import type { TeamkitProposal } from "../workspace-data.ts";

type CandidateView = "library" | "teamkit";

export interface CandidateDraft {
  view: CandidateView;
  logo1: "pioneers";
  logo2: "sponsor-demo" | null;
  pickerOpen: boolean;
  proofOpen: boolean;
  newDraftConfirmation: boolean;
}

const STORAGE_KEY = "sportpaleis.review.library-teamkit-v1.draft";
const PIONEERS_LOGO = "/assets/organizations/sportpaleis/association-logos/almerer-pioneers.png";
const FC_HUIZEN_LOGO = "/assets/organizations/sportpaleis/association-logos/fc-huizen.png";
const WATERWIJK_LOGO = "/assets/organizations/sportpaleis/association-logos/a-s-c-waterwijk.png";

export const initialLibraryTeamkitDraft = (): CandidateDraft => ({
  view: "library",
  logo1: "pioneers",
  logo2: null,
  pickerOpen: false,
  proofOpen: false,
  newDraftConfirmation: false,
});

export function transitionLibraryTeamkitDraft(draft: CandidateDraft, action: "ADD_LOGO_2" | "REMOVE_LOGO_2" | "OPEN_PROOF" | "NEW_DRAFT"): CandidateDraft {
  if (action === "ADD_LOGO_2") return { ...draft, logo1: "pioneers", logo2: "sponsor-demo", pickerOpen: false };
  if (action === "REMOVE_LOGO_2") return { ...draft, logo1: "pioneers", logo2: null };
  if (action === "OPEN_PROOF") return { ...draft, proofOpen: true };
  return { ...initialLibraryTeamkitDraft(), view: "teamkit" };
}

function loadDraft(): CandidateDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<CandidateDraft> | null;
    return value && value.logo1 === "pioneers"
      ? { ...initialLibraryTeamkitDraft(), ...value, logo1: "pioneers", logo2: value.logo2 === "sponsor-demo" ? "sponsor-demo" : null }
      : initialLibraryTeamkitDraft();
  } catch {
    return initialLibraryTeamkitDraft();
  }
}

function saveDraft(draft: CandidateDraft): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* disposable review state */ }
}

function esc(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

interface ReviewSource { id: string; name: string; type: string; relation: string; image?: string; text?: string; status: string }

const sourceSeed = [
  { name: "Almere Pioneers", type: "Verenigingslogo", relation: "Almere Pioneers · Teamwear", image: PIONEERS_LOGO, status: "Productieklaar" },
  { name: "FC Huizen", type: "Verenigingslogo", relation: "FC Huizen · Teamwear", image: FC_HUIZEN_LOGO, status: "Productieklaar" },
  { name: "ASC Waterwijk", type: "Verenigingslogo", relation: "ASC Waterwijk · Teamwear", image: WATERWIJK_LOGO, status: "Controle nodig" },
  { name: "Pioneers nummers", type: "Cijferset", relation: "Almere Pioneers · Rugnummer", text: "09", status: "Productieklaar" },
  { name: "Liberation Sans Regular", type: "Lettertype", relation: "Sportpaleis · Rugnaam", text: "Aa", status: "Technische fallback" },
  { name: "Sponsor DEMO", type: "Sponsorlogo", relation: "Fictieve reviewbron · Teamkit", text: "DEMO", status: "Productiebron mist" },
] as const;

const fallbackSources: ReviewSource[] = Array.from({ length: 320 }, (_, index) => {
  const seed = sourceSeed[index % sourceSeed.length];
  if (index < sourceSeed.length) return { id: `source-${index + 1}`, ...seed };
  return {
    id: `source-${index + 1}`,
    name: `${seed.name} · versie ${String(Math.floor(index / sourceSeed.length) + 1).padStart(2, "0")}`,
    type: seed.type,
    relation: seed.relation,
    ...("image" in seed ? { image: seed.image } : { text: seed.text }),
    status: index % 19 === 0 ? "Controle nodig" : "Productieklaar",
  };
});

function sourcesFromState(state: PilotBootstrap): ReviewSource[] {
  const actual = (state.productionElements ?? []).map((asset) => {
    const candidateId = asset.sourceSelection?.candidateIds?.[0];
    const application = asset.applications?.[0];
    const kind = application?.kind === "NUMBER_SET" ? "Cijferset" : application?.kind === "SPONSOR" ? "Sponsorlogo" : application?.kind === "LOGO" ? "Verenigingslogo" : "Productieasset";
    return {
      id: asset.id,
      name: asset.name,
      type: kind,
      relation: [asset.ownerName, application?.placement].filter(Boolean).join(" · ") || "Algemene productiecontext",
      ...(asset.sourceId && candidateId ? { image: `/api/sportpaleis/v1/production-asset-sources/${encodeURIComponent(asset.sourceId)}/candidates/${encodeURIComponent(candidateId)}/preview.svg` } : { text: application?.kind === "NUMBER_SET" ? "09" : asset.name.slice(0, 2).toLocaleUpperCase("nl-NL") }),
      status: asset.lifecycleStatus === "PRODUCTION_READY" ? "Productieklaar" : "Controle nodig",
    } satisfies ReviewSource;
  });
  return actual.length ? actual : fallbackSources;
}

function preview(source: ReviewSource, large = false): string {
  return source.image
    ? `<span class="sp-review-source-preview${large ? " is-large" : ""}"><img src="${esc(source.image)}" alt=""></span>`
    : `<span class="sp-review-source-preview${large ? " is-large" : ""}">${esc(source.text)}</span>`;
}

function libraryView(query: string, sources: ReviewSource[]): string {
  const normalized = query.trim().toLocaleLowerCase("nl-NL");
  const filtered = sources.filter((source) => `${source.name} ${source.type} ${source.relation}`.toLocaleLowerCase("nl-NL").includes(normalized));
  const visible = filtered.slice(0, 18);
  return `<section class="sp-review-candidate-page" aria-labelledby="candidate-library-title">
    <header class="sp-review-candidate-head"><div><p class="sp-eyebrow">BRONNEN</p><h1 id="candidate-library-title">Bibliotheek</h1><p>Zoek een bewezen bron op naam, type, organisatie of team.</p></div><span>${filtered.length} bronnen</span></header>
    <div class="sp-review-library-tools"><label><span class="sp-visually-hidden">Zoek bronnen</span><input type="search" data-review-source-search value="${esc(query)}" placeholder="Zoek logo, sponsor, font of team…"></label><button type="button" class="sp-button sp-button--secondary" data-review-filter>Filters</button></div>
    <div class="sp-review-filter-row" aria-label="Bronfilters"><button type="button" aria-pressed="true">Alles</button><button type="button">Logo</button><button type="button">Sponsor</button><button type="button">Lettertype</button><button type="button">Cijferset</button></div>
    <section class="sp-panel sp-review-source-list"><div class="sp-review-source-header"><span>Bron</span><span>Relatie</span><span>Status</span></div>${visible.map((source) => `<button type="button" class="sp-review-source-row" data-review-source-id="${source.id}">${preview(source)}<span><strong>${esc(source.name)}</strong><small>${esc(source.type)}</small></span><span>${esc(source.relation)}</span><span class="${source.status === "Productieklaar" ? "is-ready" : "is-attention"}">${esc(source.status)}</span></button>`).join("") || `<div class="sp-review-empty"><strong>Geen bron gevonden</strong><span>Pas de zoekterm aan.</span></div>`}</section>
    ${filtered.length > visible.length ? `<p class="sp-review-bounded">Eerste ${visible.length} resultaten · verfijn om sneller te kiezen</p>` : ""}
  </section>`;
}

function selectedSource(label: string, source: "pioneers" | "sponsor-demo", removable: boolean): string {
  const isPioneers = source === "pioneers";
  return `<article class="sp-review-selected-source"><span class="sp-review-source-preview is-large">${isPioneers ? `<img src="${PIONEERS_LOGO}" alt="">` : "DEMO"}</span><span><small>${esc(label)}</small><strong>${isPioneers ? "Almere Pioneers" : "Sponsor DEMO"}</strong><em>${isPioneers ? "Productiebron bewezen" : "Fictieve reviewbron · controle nodig"}</em></span><button type="button" class="sp-button sp-button--secondary" data-review-${removable ? "remove-logo2" : "replace-logo1"}>${removable ? "Verwijderen" : "Vervangen"}</button></article>`;
}

function reviewProposal(state: PilotBootstrap): TeamkitProposal | null {
  const article = state.articles.find(({ active, association }) => active && association === "Almere Pioneers") ?? state.articles.find(({ active }) => active);
  if (!article) return null;
  const association = state.associations.find(({ name }) => name === article.association);
  const numberAsset = state.productionElements.find(({ lifecycleStatus, ownerName, applications }) => lifecycleStatus === "PRODUCTION_READY" && ownerName === article.association && applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && /rug senior/iu.test(placement ?? "")))
    ?? state.productionElements.find(({ lifecycleStatus, applications }) => lifecycleStatus === "PRODUCTION_READY" && applications?.some(({ kind }) => kind === "NUMBER_SET"));
  const now = "2026-08-27T08:00:00.000Z";
  return {
    id: "review-teamwear-r20-canonical",
    proposalNumber: "REVIEW-R20",
    aggregateRevision: 1,
    currentRevision: 1,
    status: "IN_DESIGN",
    title: "Wedstrijdcollectie · Human Review",
    type: "Teamwear",
    customer: { id: null, name: article.association || "Sportpaleis review", contactName: "Donovan", email: "review@invalid.local", phone: null },
    association: { id: association?.id ?? null, name: article.association || null },
    team: "Human Review",
    season: "2026 / 2027",
    category: "Wedstrijd",
    deadline: null,
    notes: "Deterministische Candidate-context uit bestaande artikel- en productietruth.",
    items: [{
      id: "review-item-article",
      articleId: article.id,
      articleNumber: article.articleNumber,
      productName: article.name,
      color: "Clubkleur",
      quantity: 1,
      sizes: [],
      team: "Human Review",
      notes: null,
      placements: [{
        id: "review-placement-back-number-34",
        kind: "BACK_NUMBER",
        label: "Rugnummer 34",
        side: "BACK",
        preset: "BACK_LOWER",
        sourceId: null,
        productionAssetId: numberAsset?.id ?? null,
        assetVersion: numberAsset?.version ?? null,
        text: "34",
        colorOverride: "#ffffff",
        widthPercent: 28,
        visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: 53 },
        physicalSizeOverride: null,
        route: "INTERN_BEDRUKKEN",
        supplierName: null,
        note: "Review Mode gebruikt de bestaande gecontroleerde productiebron en maakt geen LIVE-mutatie.",
      }],
    }],
    sources: [],
    intake: { status: "NOT_REQUESTED", requestedAt: null, openedAt: null, draftSavedAt: null, submittedAt: null, data: {} },
    customerAccess: null,
    feedback: [],
    revisions: [],
    approval: null,
    approvalHistory: [],
    productionSizing: null,
    fulfillmentTasks: [],
    createdAt: now,
    createdBy: { id: state.currentUser.id, name: state.currentUser.name, role: state.currentUser.role },
    updatedAt: now,
    updatedBy: { id: state.currentUser.id, name: state.currentUser.name, role: state.currentUser.role },
    archivedAt: null,
    copiedFrom: null,
  };
}

function reviewTeamwearState(state: PilotBootstrap): PilotBootstrap {
  if (state.teamkitProposals?.some(({ items }) => items.length > 0)) return state;
  const proposal = reviewProposal(state);
  return proposal ? { ...state, teamkitProposals: [proposal] } : state;
}

function picker(draft: CandidateDraft): string {
  if (!draft.pickerOpen) return "";
  return `<section class="sp-review-picker" aria-label="Contextuele bronkeuze"><div><p class="sp-eyebrow">VOORGESTELD VOOR BORST LINKS</p><h3>Relevante bronnen</h3><p>Team, kledingstuk en positie beperken de keuze automatisch.</p></div>
    ${selectedSource("Clublogo", "pioneers", false)}
    <article class="sp-review-selected-source"><span class="sp-review-source-preview is-large">DEMO</span><span><small>Sponsor</small><strong>Sponsor DEMO</strong><em>Fictieve reviewbron · visueel beschikbaar</em></span><button type="button" class="sp-button sp-button--primary" data-review-select-logo2>Gebruiken</button></article>
    <button type="button" class="sp-button sp-button--secondary" data-review-close-picker>Sluiten</button>
  </section>`;
}

function proof(draft: CandidateDraft): string {
  if (!draft.proofOpen) return "";
  return `<section class="sp-panel sp-review-proof"><div><p class="sp-eyebrow">VOORSTEL</p><h2>Wat de klant ziet</h2><p>Veilige simulatie; er wordt niets verzonden of goedgekeurd.</p></div><div class="sp-review-shirt"><span class="sp-review-shirt-logo"><img src="${PIONEERS_LOGO}" alt=""></span>${draft.logo2 ? `<span class="sp-review-shirt-sponsor">DEMO</span>` : ""}<strong>SPORTPALEIS</strong></div></section>`;
}

function teamkitFallback(draft: CandidateDraft): string {
  return `<section class="sp-review-candidate-page" aria-labelledby="candidate-teamkit-title">
    <header class="sp-review-candidate-head"><div><p class="sp-eyebrow">BESTAANDE TEAMKIT · CANDIDATE</p><h1 id="candidate-teamkit-title">Teamwear Studio</h1><p>Bekende bronnen komen naar de medewerker toe en blijven in de draft staan.</p></div><span>Alleen zichtbaar voor jou</span></header>
    <div class="sp-review-teamkit-context"><div><small>Organisatie</small><strong>Almere Pioneers</strong></div><div><small>Team</small><strong>Heren 1</strong></div><div><small>Kledingstuk</small><strong>Wedstrijdshirt</strong></div><div><small>Seizoen</small><strong>2026 / 2027</strong></div></div>
    <div class="sp-review-teamkit-layout"><section class="sp-panel sp-review-teamkit-work"><div class="sp-panel__head"><div><p class="sp-eyebrow">OPMAAK</p><h2>Logo’s en sponsors</h2></div><span>Draft lokaal bewaard</span></div>
      ${selectedSource("Logo 1 · borst links", "pioneers", false)}
      ${draft.logo2 ? selectedSource("Logo 2 · sponsor middenborst", "sponsor-demo", true) : `<button type="button" class="sp-review-add-source" data-review-open-picker><strong>+ Sponsor / logo 2 toevoegen</strong><span>Workspace toont alleen relevante bronnen.</span></button>`}
      ${picker(draft)}
      <div class="sp-review-readiness"><span>✓ Logo 1 blijft gekoppeld</span><span>${draft.logo2 ? "! Sponsorbron vraagt nog productiecontrole" : "+ Sponsor nog niet gekozen"}</span><span>✓ Bestaande Teamkit-draft blijft intact</span></div>
      <div class="sp-review-actions"><button type="button" class="sp-button sp-button--secondary" data-review-new-draft>Nieuwe Teamkit</button><button type="button" class="sp-button sp-button--primary" data-review-proof>${draft.proofOpen ? "Voorstel sluiten" : "Voorstel bekijken"}</button></div>
      ${draft.newDraftConfirmation ? `<div class="sp-review-confirm"><strong>Nieuwe Teamkit starten?</strong><p>De huidige reviewdraft wordt alleen na deze expliciete keuze gewist.</p><button type="button" class="sp-button sp-button--secondary" data-review-cancel-new>Annuleren</button><button type="button" class="sp-button sp-button--primary" data-review-confirm-new>Nieuwe reviewdraft</button></div>` : ""}
    </section>${proof(draft)}</div>
  </section>`;
}

function teamkitView(draft: CandidateDraft, state: PilotBootstrap): string {
  const candidateState = reviewTeamwearState(state);
  const proposal = candidateState.teamkitProposals?.find(({ items }) => items.length > 0) ?? candidateState.teamkitProposals?.[0];
  if (!proposal) return teamkitFallback(draft);
  return `<section class="sp-review-real-candidate" data-review-source-revision="${esc(proposal.currentRevision)}">
    <div class="sp-review-readonly-note" role="status"><strong>Exacte R20 Teamwear-ervaring</strong><span>Je werkt met echte, reeds beschikbare context. Wijzigingen blijven uitsluitend in deze browsersessie en kunnen LIVE, productie, mail of orders niet aanpassen.</span></div>
    <div data-review-teamwear-mount data-proposal-id="${esc(proposal.id)}"><p class="sp-muted">Teamwear Candidate wordt geladen…</p></div>
  </section>`;
}

function styles(): string {
  return `<style data-review-candidate-styles>
  .sp-review-candidate { --review-red:#d10019; max-width:1180px; margin:0 auto; }
  .sp-review-candidate-nav { display:flex; width:max-content; max-width:100%; gap:4px; padding:4px; margin:0 0 16px; border:1px solid #ddd; border-radius:9px; background:#f4f4f4; }
  .sp-review-candidate-nav button { min-height:40px; padding:0 16px; border:0; border-radius:6px; background:transparent; font:inherit; font-weight:700; }
  .sp-review-candidate-nav button[aria-current=page] { background:#fff; color:#111; box-shadow:0 1px 4px #0002; }
  .sp-review-readonly-note { display:grid; gap:3px; margin-bottom:14px; padding:12px 14px; border:1px solid #e6b7bd; border-left:4px solid var(--review-red); border-radius:8px; background:#fff5f6; }
  .sp-review-readonly-note span { color:#67484c; font-size:.82rem; line-height:1.45; }
  .sp-review-candidate-page { display:grid; gap:16px; }
  .sp-review-candidate-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
  .sp-review-candidate-head h1 { margin:.1rem 0 .35rem; }
  .sp-review-candidate-head > span { flex:0 0 auto; color:#666; font-size:.8rem; }
  .sp-review-library-tools { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; }
  .sp-review-library-tools input { width:100%; min-height:46px; padding:0 14px; border:1px solid #d7d7d7; border-radius:8px; }
  .sp-review-filter-row { display:flex; gap:8px; overflow:auto; padding-bottom:2px; }
  .sp-review-filter-row button { min-height:36px; padding:0 13px; white-space:nowrap; border:1px solid #ddd; border-radius:999px; background:#fff; }
  .sp-review-filter-row button[aria-pressed=true] { background:#111; color:#fff; border-color:#111; }
  .sp-review-source-list { overflow:hidden; padding:0; }
  .sp-review-source-header,.sp-review-source-row { display:grid; grid-template-columns:minmax(250px,1.4fr) minmax(190px,1fr) 150px; align-items:center; gap:14px; }
  .sp-review-source-header { padding:10px 16px; color:#6a6a6a; background:#f4f4f4; font-size:.72rem; font-weight:700; text-transform:uppercase; }
  .sp-review-source-row { width:100%; min-height:70px; padding:10px 16px; border:0; border-top:1px solid #ececec; background:#fff; text-align:left; cursor:pointer; }
  .sp-review-source-row:hover,.sp-review-source-row:focus-visible { background:#f8f8f8; box-shadow:inset 3px 0 var(--review-red); outline:none; }
  .sp-review-source-row > span:first-of-type { display:grid; grid-template-columns:48px minmax(0,1fr); gap:12px; align-items:center; }
  .sp-review-source-row strong,.sp-review-source-row small { display:block; }
  .sp-review-source-row small,.sp-review-source-row > span { color:#666; }
  .sp-review-source-row .is-ready { color:#26734d; }.sp-review-source-row .is-attention { color:#8a5a00; }
  .sp-review-source-preview { width:48px; height:48px; display:grid; place-items:center; flex:0 0 auto; overflow:hidden; border:1px solid #ddd; border-radius:8px; background:#111; color:#fff; font-size:.68rem; font-weight:800; }
  .sp-review-source-preview.is-large { width:58px; height:58px; }.sp-review-source-preview img { width:100%; height:100%; object-fit:contain; padding:4px; background:#fff; }
  .sp-review-bounded { margin:0; color:#666; text-align:center; font-size:.78rem; }
  .sp-review-empty { padding:30px; text-align:center; }.sp-review-empty span { display:block; color:#666; }
  .sp-review-teamkit-context { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid #e4e4e4; background:#e4e4e4; }
  .sp-review-teamkit-context div { min-width:0; padding:12px 14px; background:#fff; }.sp-review-teamkit-context small,.sp-review-teamkit-context strong { display:block; }.sp-review-teamkit-context small { color:#666; font-size:.67rem; text-transform:uppercase; }.sp-review-teamkit-context strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sp-review-teamkit-layout { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr); gap:16px; align-items:start; }.sp-review-teamkit-work { padding:18px; }
  .sp-review-selected-source { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:13px; align-items:center; padding:14px 0; border-top:1px solid #ececec; }.sp-review-selected-source small,.sp-review-selected-source strong,.sp-review-selected-source em { display:block; }.sp-review-selected-source em { color:#666; font-style:normal; font-size:.75rem; }
  .sp-review-add-source { width:100%; min-height:74px; padding:14px; border:1px dashed #aaa; background:#fafafa; text-align:left; }.sp-review-add-source span { display:block; margin-top:3px; color:#666; }
  .sp-review-picker { margin-top:12px; padding:14px; border:1px solid #ddd; background:#f7f7f7; }.sp-review-picker h3 { margin:.2rem 0; }
  .sp-review-readiness { display:grid; gap:7px; margin:15px 0; color:#555; font-size:.82rem; }
  .sp-review-actions { display:flex; justify-content:space-between; gap:10px; }.sp-review-confirm { margin-top:14px; padding:14px; border-left:3px solid var(--review-red); background:#fff1f1; }.sp-review-confirm p { margin:.25rem 0 .8rem; }.sp-review-confirm button { margin-right:8px; }
  .sp-review-proof { padding:18px; }.sp-review-shirt { position:relative; min-height:360px; display:grid; place-items:center; margin-top:14px; border-radius:12px; background:linear-gradient(140deg,#111 0 52%,#222 52%); color:#fff; overflow:hidden; }.sp-review-shirt::before { content:""; position:absolute; width:68%; height:78%; border-radius:26% 26% 10% 10%; background:#151515; box-shadow:0 20px 50px #0008; }.sp-review-shirt > strong { position:relative; margin-top:210px; letter-spacing:.18em; }.sp-review-shirt-logo,.sp-review-shirt-sponsor { position:absolute; z-index:1; }.sp-review-shirt-logo { top:78px; left:31%; width:54px; height:54px; }.sp-review-shirt-logo img { width:100%; height:100%; object-fit:contain; }.sp-review-shirt-sponsor { top:125px; left:50%; transform:translateX(-50%); padding:7px 13px; background:#fff; color:#111; font-weight:800; font-size:.72rem; }
  @media (max-width:760px) { .sp-review-candidate-head { display:block; }.sp-review-candidate-head > span { display:block; margin-top:7px; }.sp-review-source-header { display:none; }.sp-review-source-row { grid-template-columns:minmax(0,1fr); gap:4px; min-height:76px; }.sp-review-source-row > span:nth-of-type(2) { padding-left:60px; font-size:.74rem; }.sp-review-source-row > span:nth-of-type(3) { margin-left:60px; font-size:.74rem; }.sp-review-teamkit-context { grid-template-columns:1fr 1fr; }.sp-review-teamkit-context strong { white-space:normal; }.sp-review-teamkit-layout { grid-template-columns:1fr; }.sp-review-selected-source { grid-template-columns:52px minmax(0,1fr); }.sp-review-selected-source > button { grid-column:1/-1; width:100%; min-height:44px; }.sp-review-actions { display:grid; grid-template-columns:1fr; }.sp-review-actions button,.sp-review-confirm button { width:100%; min-height:44px; margin:4px 0; }.sp-review-proof { order:-1; }.sp-review-library-tools { grid-template-columns:minmax(0,1fr) auto; } }
  @media (max-width:340px) { .sp-review-teamkit-context { grid-template-columns:1fr; }.sp-review-filter-row button:nth-child(n+4) { display:none; }.sp-review-library-tools .sp-button { padding-inline:10px; }.sp-review-source-row { padding-inline:12px; } }
  </style>`;
}

export function mountLibraryTeamkitCandidate(root: HTMLElement, state: PilotBootstrap): () => void {
  let draft = loadDraft();
  let query = "";
  let renderSequence = 0;
  let disposed = false;
  const render = () => {
    const sequence = ++renderSequence;
    root.innerHTML = `${styles()}<div class="sp-review-candidate" data-review-no-production-authority><nav class="sp-review-candidate-nav" aria-label="Candidate-onderdelen"><button type="button" data-review-candidate-view="library" aria-current="${draft.view === "library" ? "page" : "false"}">Bibliotheek</button><button type="button" data-review-candidate-view="teamkit" aria-current="${draft.view === "teamkit" ? "page" : "false"}">Teamwear</button></nav>${draft.view === "library" ? libraryView(query, sourcesFromState(state)) : teamkitView(draft, state)}</div>`;
    const mount = root.querySelector<HTMLElement>("[data-review-teamwear-mount]");
    if (mount) void import("../../sportpaleis-teamkit-experience.ts").then(({ activateTeamkitExperience, teamkitProposalExperience }) => {
      if (disposed || sequence !== renderSequence || !mount.isConnected) return;
      const candidateState = reviewTeamwearState(state);
      mount.innerHTML = teamkitProposalExperience(candidateState, mount.dataset.proposalId!, "/workspace/sportpaleis");
      activateTeamkitExperience(root as HTMLDivElement, candidateState);
    });
  };
  const click = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("button");
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a");
    if (link && !String(link.getAttribute("href") ?? "").startsWith("#")) event.preventDefault();
    event.stopPropagation();
    if (!button) return;
    if (button.dataset.reviewCandidateView) draft.view = button.dataset.reviewCandidateView as CandidateView;
    else if (button.hasAttribute("data-review-open-picker") || button.hasAttribute("data-review-replace-logo1")) draft.pickerOpen = true;
    else if (button.hasAttribute("data-review-close-picker")) draft.pickerOpen = false;
    else if (button.hasAttribute("data-review-select-logo2")) draft = transitionLibraryTeamkitDraft(draft, "ADD_LOGO_2");
    else if (button.hasAttribute("data-review-remove-logo2")) draft = transitionLibraryTeamkitDraft(draft, "REMOVE_LOGO_2");
    else if (button.hasAttribute("data-review-proof")) draft.proofOpen = !draft.proofOpen;
    else if (button.hasAttribute("data-review-new-draft")) draft.newDraftConfirmation = true;
    else if (button.hasAttribute("data-review-cancel-new")) draft.newDraftConfirmation = false;
    else if (button.hasAttribute("data-review-confirm-new")) draft = transitionLibraryTeamkitDraft(draft, "NEW_DRAFT");
    else return;
    saveDraft(draft); render();
  };
  const input = (event: Event) => {
    const field = (event.target as HTMLElement).closest<HTMLInputElement>("[data-review-source-search]");
    if (!field) return;
    query = field.value; render();
    root.querySelector<HTMLInputElement>("[data-review-source-search]")?.focus();
  };
  const submit = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    let output = root.querySelector<HTMLElement>("[data-review-session-notice]");
    if (!output) {
      output = document.createElement("p");
      output.dataset.reviewSessionNotice = "";
      output.className = "sp-action-notice";
      root.prepend(output);
    }
    output.textContent = "Review Mode bewaart dit alleen in deze browsersessie. LIVE, productie, mail en orders blijven onaangeraakt.";
  };
  root.addEventListener("click", click);
  root.addEventListener("input", input);
  root.addEventListener("submit", submit, true);
  render();
  return () => { disposed = true; root.removeEventListener("click", click); root.removeEventListener("input", input); root.removeEventListener("submit", submit, true); window.onbeforeunload = null; root.replaceChildren(); };
}

export function setLibraryTeamkitCandidateView(root: HTMLElement, view: CandidateView): void {
  const draft = loadDraft();
  draft.view = view;
  saveDraft(draft);
  root.dispatchEvent(new CustomEvent("review-candidate-remount", { bubbles: true }));
}
