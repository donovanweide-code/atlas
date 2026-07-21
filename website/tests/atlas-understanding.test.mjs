import test from "node:test";
import assert from "node:assert/strict";
import {
  addUnderstandingItem,
  createInitialUnderstandingStore,
  createInsight,
  createNextStep,
  getUnderstandingLineage,
  loadUnderstanding,
  relateUnderstandingItems,
  reviseUnderstandingItem,
  saveUnderstanding,
  understandingRecommendation,
  understandingStorageKey,
} from "../src/atlas-understanding.ts";

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  clear() { this.#values.clear(); }
  getItem(key) { return this.#values.get(key) ?? null; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  removeItem(key) { this.#values.delete(key); }
  setItem(key, value) { this.#values.set(key, String(value)); }
}

test("de onafgeronde Understanding-startdata importeert nog geen AquaFlask-profielkennis", () => {
  const store = createInitialUnderstandingStore();
  assert.equal(store.items.filter((item) => item.caseId === "0002").length, 0);
  assert.deepEqual(store.items.map((item) => item.kind), ["source", "observation", "question"]);
  assert.ok(store.items.every((item) => item.sourceLabel.length > 0));
});

test("Atlas vormt een begrensd oordeel voordat Understanding om organisatie vraagt", () => {
  const store = createInitialUnderstandingStore();
  const wbd = understandingRecommendation(store, "0001");
  assert.equal(wbd.title, "Vorm nog geen conclusie.");
  assert.match(wbd.reason, /Eerst is bewijs nodig/);

  const aqua = understandingRecommendation(store, "0002");
  assert.equal(aqua.title, "Laat AquaFlask vandaag bewust open.");
  assert.match(aqua.reason, /geen aanvullende conclusie of wijziging gerechtvaardigd/);
});

test("observaties en vragen kunnen expliciet aan elkaar worden gerelateerd", () => {
  const store = { version: 1, items: [], relationships: [], revisions: [] };
  const observation = addUnderstandingItem(store, { id: "observation", caseId: "0001", kind: "observation", text: "Een waarneming", createdAt: "2026-07-21T09:00:00.000Z" });
  const question = addUnderstandingItem(store, { id: "question", caseId: "0001", kind: "question", text: "Welke vraag volgt hieruit?", createdAt: "2026-07-21T09:01:00.000Z" });
  const relation = relateUnderstandingItems(store, observation.id, question.id, "questions", "2026-07-21T09:02:00.000Z");
  assert.equal(relation.confirmedByHuman, true);
  assert.equal(relation.type, "questions");
});

test("een inzicht en betekenisvolle volgende stap blijven naar hun bronnen herleidbaar", () => {
  const store = createInitialUnderstandingStore();
  const insight = createInsight(store, "0001", "Lokaal gebruik moet eerst bewijzen wat waarde heeft.", ["u-0001-local-workspace", "u-0001-use-question"], "2026-07-21T10:00:00.000Z");
  const step = createNextStep(store, insight.id, "Observeer één echte werkdag en noteer waar overzicht ontstaat.", "2026-07-21T10:01:00.000Z");
  const lineage = getUnderstandingLineage(store, step.id);
  assert.equal(lineage.at(-1)?.id, step.id);
  assert.ok(lineage.some((item) => item.id === "u-0001-local-workspace"));
  assert.ok(lineage.some((item) => item.id === insight.id));
  assert.equal(store.relationships.find((relationship) => relationship.toId === step.id)?.type, "justifies");
  assert.match(understandingRecommendation(store, "0001").title, /Observeer/);
});

test("herclassificatie bewaart de eerdere betekenis als revisie", () => {
  const store = createInitialUnderstandingStore();
  const item = store.items.find((candidate) => candidate.id === "u-0001-use-question");
  const revision = reviseUnderstandingItem(store, item.id, { kind: "unknown", text: "We weten nog niet welk Workspace-onderdeel aantoonbaar helpt.", status: "uncertain", reason: "Nog geen gebruiksbewijs", createdAt: "2026-07-21T11:00:00.000Z" });
  assert.equal(revision.before.kind, "question");
  assert.match(revision.before.text, /Welke onderdelen/);
  assert.equal(revision.after.kind, "unknown");
  assert.equal(store.revisions.length, 1);
});

test("opslag valideert het model en valt veilig terug bij beschadigde data", () => {
  const storage = new MemoryStorage();
  const store = createInitialUnderstandingStore();
  assert.equal(saveUnderstanding(storage, store), true);
  assert.equal(loadUnderstanding(storage).value.items.length, 3);
  storage.setItem(understandingStorageKey, '{"version":1,"items":"kapot"}');
  const recovered = loadUnderstanding(storage);
  assert.match(recovered.warning, /ongeldig/);
  assert.equal(recovered.value.items.filter((item) => item.caseId === "0002").length, 0);
});
