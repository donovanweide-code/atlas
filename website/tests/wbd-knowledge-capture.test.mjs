import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createKnowledgeProposal,
  knowledgeCategories,
  knowledgeProposalSources,
  knowledgeProposalStatuses,
  newestKnowledgeFirst,
  normalizeKnowledgeProposalInput,
  proposalToKnowledgeEntry,
} from "../src/wbd-knowledge-store.ts";
import { getWbdNavigationItem } from "../src/workspace-config.ts";

const sampleInput = {
  title: "  Alleen beslisbare kennis bewaren  ",
  summary: "  Atlas bewaart geen informatie om het verzamelen zelf.  ",
  importance: "  Dit houdt het geheugen bruikbaar voor besluiten van morgen.  ",
  category: "Workflow Principles",
  source: "Handmatig",
  capturedAt: "2026-08-03",
  comments: "  Eerst handmatig bewijzen.  ",
};

test("legt het minimale uitbreidbare voorstelmodel en de repositorycategorieën vast", () => {
  assert.deepEqual(knowledgeProposalStatuses, ["Nieuw", "Goedgekeurd", "Afgewezen"]);
  assert.deepEqual(knowledgeProposalSources, ["Chat", "Codex", "Handmatig"]);
  assert.deepEqual(knowledgeCategories, [
    "Knowledge",
    "Product Principles",
    "Design Principles",
    "Workflow Principles",
    "Architecture",
    "Cases",
    "Ideas",
  ]);
});

test("maakt handmatig een schoon nieuw voorstel met stabiele status", () => {
  const proposal = createKnowledgeProposal(
    sampleInput,
    new Date("2026-08-03T09:00:00.000Z"),
    "proposal-test",
  );
  assert.equal(proposal.id, "proposal-test");
  assert.equal(proposal.title, "Alleen beslisbare kennis bewaren");
  assert.equal(proposal.summary, "Atlas bewaart geen informatie om het verzamelen zelf.");
  assert.equal(proposal.status, "Nieuw");
  assert.equal(proposal.source, "Handmatig");
  assert.equal(proposal.comments, "Eerst handmatig bewijzen.");
  assert.equal(proposal.createdAt, proposal.updatedAt);
});

test("weigert een incompleet of onbekend handmatig voorstel", () => {
  assert.throws(
    () => normalizeKnowledgeProposalInput({ ...sampleInput, title: "" }),
    /Titel is verplicht/,
  );
  assert.throws(
    () => normalizeKnowledgeProposalInput({ ...sampleInput, category: "Onbekend" }),
    /geldige kenniscategorie/,
  );
  assert.throws(
    () => normalizeKnowledgeProposalInput({ ...sampleInput, source: "Connector" }),
    /geldige bron/,
  );
});

test("maakt bij goedkeuring één herleidbare Atlas Knowledge-entry", () => {
  const proposal = createKnowledgeProposal(sampleInput, new Date("2026-08-03T09:00:00.000Z"), "proposal-test");
  const entry = proposalToKnowledgeEntry(proposal, new Date("2026-08-03T10:00:00.000Z"));
  assert.equal(entry.id, "knowledge-proposal-test");
  assert.equal(entry.sourceProposalId, proposal.id);
  assert.equal(entry.category, "Workflow Principles");
  assert.equal(entry.status, "Goedgekeurd");
  assert.equal(entry.approvedAt, "2026-08-03T10:00:00.000Z");
  assert.equal(entry.title, proposal.title);
});

test("sorteert voorstellen en kennis zonder invoer te muteren", () => {
  const items = [
    { id: "oud", capturedAt: "2026-08-01T09:00:00.000Z", updatedAt: "2026-08-01T09:00:00.000Z" },
    { id: "nieuw", capturedAt: "2026-08-02T09:00:00.000Z", updatedAt: "2026-08-02T09:00:00.000Z" },
  ];
  assert.deepEqual(newestKnowledgeFirst(items).map(({ id }) => id), ["nieuw", "oud"]);
  assert.deepEqual(items.map(({ id }) => id), ["oud", "nieuw"]);
});

test("houdt lijst, detail en repository onder dezelfde WBD-navigatie", () => {
  for (const route of [
    "/workspace/wbd/kennisvoorstellen",
    "/workspace/wbd/kennisvoorstellen/proposal-test",
    "/workspace/wbd/kennis",
  ]) {
    assert.equal(getWbdNavigationItem(route).id, "kennisvoorstellen");
  }
});

test("borgt menselijke acties, transactionele goedkeuring en de public-only grens", async () => {
  const [storeSource, workspaceSource, internalSource, publicSource] = await Promise.all([
    readFile(new URL("../src/wbd-knowledge-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/internal-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
  ]);

  assert.match(storeSource, /proposals: "proposals"/);
  assert.match(storeSource, /knowledgeEntries: "knowledgeEntries"/);
  assert.match(storeSource, /database\.transaction\(\[stores\.proposals, stores\.knowledgeEntries\], "readwrite"\)/);
  assert.match(storeSource, /objectStore\(stores\.knowledgeEntries\)\.add\(knowledgeEntry\)/);
  assert.match(storeSource, /proposalStore\.delete\(id\)/);
  assert.doesNotMatch(storeSource, /fetch\(|WebSocket|EventSource|openai|embedding|vector/i);

  assert.match(workspaceSource, /data-testid="approve-proposal"/);
  assert.match(workspaceSource, /data-testid="edit-proposal"/);
  assert.match(workspaceSource, /data-testid="reject-proposal"/);
  assert.match(workspaceSource, /helpt morgen betere beslissingen te nemen/);
  assert.match(workspaceSource, /Open Atlas Knowledge Repository/);
  assert.match(internalSource, /import\("\.\/wbd-workspace"\)/);
  assert.doesNotMatch(publicSource, /wbd-knowledge-store|kennisvoorstellen|Knowledge Repository/);
});
