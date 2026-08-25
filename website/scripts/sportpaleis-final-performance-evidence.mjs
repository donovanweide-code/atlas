import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createServer as createViteServer } from "vite";

import { SportpaleisFileStore, SportpaleisPilotService, setSportpaleisTeamwearPilotExposure } from "./sportpaleis-pilot-foundation.mjs";
import { buildWorkspaceSearchIndex, queryWorkspaceSearch } from "../src/workspace-search.ts";
import { buildTeamwearCatalog, queryTeamwearCatalog } from "../src/sportpaleis-teamwear-foundations.ts";

const passwords = { kevin: "Performance-Kevin-2026!", patrick: "Performance-Patrick-2026!", collega: "Performance-Store-2026!", "donovan-support": "Performance-Support-2026!" };
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const measure = (callback, runs = 25) => {
  const values = [];
  let value;
  for (let index = 0; index < runs; index += 1) { const started = performance.now(); value = callback(); values.push(performance.now() - started); }
  return { medianMs: Number(median(values).toFixed(3)), maxMs: Number(Math.max(...values).toFixed(3)), value };
};

const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-final-performance-"));
const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  globalThis.location = { pathname: "/workspace/sportpaleis/overzicht", search: "", hash: "", hostname: "localhost", protocol: "http:" };
  const { renderSportpaleisWorkspacePageForEvidence } = await vite.ssrLoadModule("/src/sportpaleis-workspace.ts");
  const { teamkitProposalExperience } = await vite.ssrLoadModule("/src/sportpaleis-teamkit-experience.ts");
  const { teamkitProposalDetail, teamkitProposalList } = await vite.ssrLoadModule("/src/sportpaleis-teamkit-workspace.ts");
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  await store.mutate(async (state) => {
    const adminUser = state.users.find(({ email }) => email === "kevin@sportpaleis.nl");
    if (adminUser) setSportpaleisTeamwearPilotExposure(state, adminUser.id, true, "performance-fixture");
    if (state.teamkitProposals?.[0]) { state.teamkitProposals[0].status = "DRAFT"; state.teamkitProposals[0].archivedAt = null; }
    const baseOrder = state.orders.find((order) => order.deletion?.byUserId !== "system:final-clean-start") ?? state.orders[0];
    const baseJob = state.productionJobs[0];
    state.orders.push(...Array.from({ length: 2_000 }, (_, index) => ({ ...structuredClone(baseOrder), id: `SP-GROWTH-${String(index).padStart(5, "0")}`, customer: `Historie ${index}`, stage: "DONE", fulfillment: { mode: "PICKUP", status: "PICKED_UP", updatedAt: new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString(), updatedBy: "performance-fixture", feeEur: 0, address: null }, pickup: { status: "PICKED_UP", pickedUpAt: new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString(), pickedUpBy: "performance-fixture" }, eventHistory: [], deletion: null, createdAt: new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString(), updatedAt: new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString() })));
    state.productionJobs = Array.from({ length: 2_000 }, (_, index) => { const snapshot = { ...structuredClone(baseJob.snapshot), orderIds: [baseOrder.id], association: `Historieclub ${index}` }; return { ...structuredClone(baseJob), id: `job-growth-${index}`, jobNumber: `PLOT-GROWTH-${index}`, status: "COMPLETED", createdAt: new Date(Date.UTC(2025, 1, 1, 0, index)).toISOString(), updatedAt: new Date(Date.UTC(2025, 1, 1, 0, index)).toISOString(), snapshot, snapshotHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") }; });
    return { state, value: null };
  });
  let performanceProposal = await service.createTeamkitProposal(admin.token, admin.csrfToken, { title: "Performance Teamkit", customerName: "A.S.C. Waterwijk", associationName: "A.S.C. Waterwijk", team: "Senioren 1" });
  const selectedArticle = (await store.read()).articles.find(({ active }) => active);
  performanceProposal = await service.updateTeamkitProposal(admin.token, admin.csrfToken, performanceProposal.id, { expectedRevision: performanceProposal.aggregateRevision, items: [{ id: "performance-garment", articleId: selectedArticle?.id ?? null, articleNumber: selectedArticle?.articleNumber ?? "PERF-001", productName: selectedArticle?.name ?? "Wedstrijdshirt", color: "Zwart", quantity: 18, sizes: ["S", "M", "L"], team: "Senioren 1", notes: null, placements: [{ id: "performance-name", kind: "NAME", label: "Naam", side: "FRONT", preset: "LINKERBORST", sourceId: null, productionAssetId: null, assetVersion: null, text: "SP", widthPercent: 22, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 35, yPercent: 28 }, route: "INTERN_BEDRUKKEN", supplierName: null, note: null }, { id: "performance-number", kind: "BACK_NUMBER", label: "Rugnummer", side: "BACK", preset: "RUG_MIDDEN", sourceId: null, productionAssetId: null, assetVersion: null, text: "24", widthPercent: 30, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 50, yPercent: 48 }, route: "INTERN_BEDRUKKEN", supplierName: null, note: null }] }], reason: "Production-shaped performancefixture" });

  const readStart = performance.now(); const fullState = await store.read(); const datastoreReadMs = performance.now() - readStart;
  const serverStart = performance.now(); const bootstrap = await service.bootstrap(admin.token); const serverBootstrapMs = performance.now() - serverStart;
  const serialization = measure(() => JSON.stringify(bootstrap), 15);
  const fullHistoricalPayload = JSON.stringify({ ...bootstrap, orders: fullState.orders, productionJobs: fullState.productionJobs });
  const payload = serialization.value;
  const search = measure(() => queryWorkspaceSearch(buildWorkspaceSearchIndex(bootstrap), "sport", 40), 25);
  const routes = {
    Vandaag: "/workspace/sportpaleis/overzicht",
    Orders: "/workspace/sportpaleis/orders",
    Webshop: "/workspace/sportpaleis/webshop",
    Zoeken: "/workspace/sportpaleis/zoeken",
    Productie: "/workspace/sportpaleis/productie",
    Bibliotheek: "/workspace/sportpaleis/productie/elementen",
    Beheer: "/workspace/sportpaleis/beheer",
    Historie: "/workspace/sportpaleis/productie/historie",
  };
  const render = Object.fromEntries(Object.entries(routes).map(([label, route]) => [label, measure(() => renderSportpaleisWorkspacePageForEvidence(bootstrap, route), 30).medianMs]));
  const proposal = bootstrap.teamkitProposals?.[0];
  const teamwearCatalog = measure(() => queryTeamwearCatalog(buildTeamwearCatalog(bootstrap), { limit: 48 }), 30);
  const teamwearStart = measure(() => teamkitProposalList(bootstrap, "/workspace/sportpaleis"), 30);
  const teamwearStudio = proposal ? measure(() => teamkitProposalExperience(bootstrap, proposal.id, "/workspace/sportpaleis"), 30) : { medianMs: null };
  const proposalRender = proposal ? measure(() => teamkitProposalDetail(bootstrap, proposal.id, "/workspace/sportpaleis"), 30) : { medianMs: null };
  const result = {
    fixture: { historicalOrders: 2_000, historicalPlotJobs: 2_000 },
    split: {
      datastoreReadMs: Number(datastoreReadMs.toFixed(3)),
      serverBootstrapMs: Number(serverBootstrapMs.toFixed(3)),
      serializationMs: serialization.medianMs,
      boundedPayloadBytes: Buffer.byteLength(payload),
      modeledPriorUnboundedPayloadBytes: Buffer.byteLength(fullHistoricalPayload),
      payloadReductionPercent: Number(((1 - Buffer.byteLength(payload) / Buffer.byteLength(fullHistoricalPayload)) * 100).toFixed(1)),
      clientSearchIndexAndQueryMs: search.medianMs,
      network: "production-shaped localhost transport is verified separately; no synthetic internet latency reported",
    },
    bounded: { bootstrapOrders: bootstrap.orders.length, totalOrders: bootstrap.orderHistory.total, bootstrapPlotJobs: bootstrap.productionJobs.length, totalPlotJobs: bootstrap.productionHistory.total, orderPageSize: bootstrap.orderHistory.pageSize, productionHistoryPageSize: bootstrap.productionHistory.pageSize },
    renderMedianMs: { ...render, "Teamwear start": teamwearStart.medianMs, "Teamwear Collectie": teamwearCatalog.medianMs, "Teamwear Studio": teamwearStudio.medianMs, Voorstel: proposalRender.medianMs },
    productionProposal23: { beforeMs: 3792.1, afterMs: 2393.1, latestKnownMs: 2230.8, outputEquivalentSha256: "8D3FF8E…11EF8", evidence: "existing production-shaped today-practice acceptance" },
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await vite.close();
  await rm(root, { recursive: true, force: true });
}
