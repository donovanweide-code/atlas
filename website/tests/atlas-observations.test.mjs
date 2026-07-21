import test from "node:test";
import assert from "node:assert/strict";
import {
  activateObserving,
  deactivateObserving,
  loadObservationStore,
  loadObservingContext,
  observationStorageKeys,
  saveObservation,
} from "../src/atlas-observations.ts";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const baseContext = {
  surface: "public",
  path: "/",
  hash: "#eerste-publieke-minuut",
  pageId: "public.home",
  pageLabel: "Homepage",
  boundaryId: "public.home.entry",
  boundaryLabel: "Eerste publieke minuut",
  caseId: "0001",
  sprintId: "001E",
  viewport: { width: 1440, height: 900 },
};

test("starts with an empty observation store", () => {
  assert.deepEqual(loadObservationStore(memoryStorage()), { version: 1, observations: [] });
});

test("activates, reloads and deactivates Waarnemen locally", () => {
  const storage = memoryStorage();
  const now = new Date("2026-07-21T09:00:00.000Z");
  assert.equal(activateObserving(storage, " 001E ", now)?.sprintId, "001E");
  assert.equal(loadObservingContext(storage)?.caseId, "0001");
  assert.equal(deactivateObserving(storage), true);
  assert.equal(loadObservingContext(storage), null);
});

test("rejects an empty sprint and an empty observation", () => {
  const storage = memoryStorage();
  assert.equal(activateObserving(storage, "   "), null);
  assert.equal(saveObservation(storage, { text: "  ", context: baseContext }), null);
  assert.equal(loadObservationStore(storage).observations.length, 0);
});

test("falls back safely when either local store is damaged", () => {
  const storage = memoryStorage({
    [observationStorageKeys.observations]: "{not-json",
    [observationStorageKeys.observingContext]: JSON.stringify({ version: 1, active: true }),
  });
  assert.deepEqual(loadObservationStore(storage), { version: 1, observations: [] });
  assert.equal(loadObservingContext(storage), null);
});

test("stores and reloads a context-confirmed unreviewed observation", () => {
  const storage = memoryStorage();
  const now = new Date("2026-07-21T09:12:00.000Z");
  const saved = saveObservation(storage, {
    text: "  De opening voelt rustig en maakt direct duidelijk wat WBD bouwt.  ",
    context: baseContext,
  }, now, "observation-test");

  assert.equal(saved?.text, "De opening voelt rustig en maakt direct duidelijk wat WBD bouwt.");
  assert.equal(saved?.status, "unreviewed");
  assert.equal(saved?.context.confirmedBy, "Donovan");
  assert.equal(saved?.context.confirmedAt, now.toISOString());
  assert.deepEqual(loadObservationStore(storage).observations, [saved]);
});

test("uses the corrected meaningful boundary and its canonical reopening route", () => {
  const storage = memoryStorage();
  const saved = saveObservation(storage, {
    text: "De overgang naar het fundament verdient meer ademruimte.",
    context: {
      ...baseContext,
      hash: "#digitaal-fundament",
      boundaryId: "public.home.digital-foundation",
      boundaryLabel: "Een verouderd label wordt niet vertrouwd",
    },
  }, new Date("2026-07-21T09:15:00.000Z"), "observation-corrected");

  assert.equal(saved?.context.boundaryLabel, "Website en fundament");
  assert.equal(saved?.context.hash, "#digitaal-fundament");
  assert.equal(`${saved?.context.path}${saved?.context.hash}`, "/#digitaal-fundament");
});
