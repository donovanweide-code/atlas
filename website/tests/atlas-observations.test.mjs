import test from "node:test";
import assert from "node:assert/strict";
import {
  activateObserving,
  deactivateObserving,
  linkObservation,
  loadObservationStore,
  loadObservingContext,
  observationStatuses,
  observationStorageKeys,
  reopenObservation,
  reviewObservation,
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

const baseDraft = {
  text: "De opening voelt rustig en maakt direct duidelijk wat WBD bouwt.",
  source: {
    id: "public-wbd-website:public.home:public.home.entry",
    kind: "surface",
    label: "Publieke WBD-website · Homepage",
    origin: "website",
    path: "/",
    locator: "/#eerste-publieke-minuut",
  },
  context: {
    surface: "public",
    path: "/",
    hash: "#eerste-publieke-minuut",
    pageId: "public.home",
    pageLabel: "Homepage",
    boundaryId: "public.home.entry",
    boundaryLabel: "Eerste publieke minuut",
    viewport: { width: 1440, height: 900 },
  },
  ownership: {
    captureOwner: "We Build And Design",
    reviewOwner: "Atlas · Werkelijkheid",
  },
};

function capture(storage, id = "observation-test") {
  return saveObservation(storage, baseDraft, new Date("2026-08-05T09:12:00.000Z"), id);
}

test("starts with one empty version 2 observation truth", () => {
  assert.deepEqual(loadObservationStore(memoryStorage()), { version: 2, observations: [] });
});

test("activates Waarnemen with a generic source and explicit ownership", () => {
  const storage = memoryStorage();
  const now = new Date("2026-08-05T09:00:00.000Z");
  const activated = activateObserving(storage, {
    source: { id: "public-wbd-website", label: "Publieke WBD-website", origin: "website" },
    ownership: { captureOwner: "We Build And Design", reviewOwner: "Atlas · Werkelijkheid" },
  }, now);
  assert.equal(activated?.source.label, "Publieke WBD-website");
  assert.equal(activated?.ownership.reviewOwner, "Atlas · Werkelijkheid");
  assert.equal("caseId" in activated, false);
  assert.equal("sprintId" in activated, false);
  assert.deepEqual(loadObservingContext(storage), activated);
  assert.equal(deactivateObserving(storage), true);
  assert.equal(loadObservingContext(storage), null);
});

test("rejects incomplete ownership and an empty observation", () => {
  const storage = memoryStorage();
  assert.equal(activateObserving(storage, {
    source: { id: "public", label: "Publiek", origin: "website" },
    ownership: { captureOwner: "", reviewOwner: "Atlas · Werkelijkheid" },
  }), null);
  assert.equal(saveObservation(storage, { ...baseDraft, text: "  " }), null);
  assert.equal(loadObservationStore(storage).observations.length, 0);
});

test("preserves existing Case 0001 observations as recognizable legacy context without making it canonical", () => {
  const legacy = {
    version: 1,
    observations: [{
      version: 1,
      id: "legacy-observation",
      text: "Bestaande observatie",
      createdAt: "2026-07-21T09:12:00.000Z",
      status: "unreviewed",
      context: {
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
        confirmedAt: "2026-07-21T09:12:00.000Z",
        confirmedBy: "Donovan",
      },
    }],
  };
  const store = loadObservationStore(memoryStorage({
    [observationStorageKeys.observations]: JSON.stringify(legacy),
  }));
  assert.equal(store.version, 2);
  assert.equal(store.observations[0].legacyContext.caseId, "0001");
  assert.equal(store.observations[0].legacyContext.sprintId, "001E");
  assert.equal(store.observations[0].relations.length, 0);
  assert.equal(store.observations[0].status, "unreviewed");
});

test("stores source, context, time, owner and history without automatic meaning", () => {
  const storage = memoryStorage();
  const saved = capture(storage);
  assert.equal(saved?.status, "unreviewed");
  assert.equal(saved?.source.origin, "website");
  assert.equal(saved?.source.locator, "/#eerste-publieke-minuut");
  assert.equal(saved?.ownership.reviewOwner, "Atlas · Werkelijkheid");
  assert.equal(saved?.history[0].confirmedByHuman, false);
  assert.equal(saved?.relations.length, 0);
  assert.equal(saved?.supportingFiles.length, 0);
  assert.deepEqual(loadObservationStore(storage).observations, [saved]);
});

test("keeps future supporting files inside their observation instead of a loose upload store", () => {
  const storage = memoryStorage();
  const capturedAt = "2026-08-05T09:10:00.000Z";
  const saved = saveObservation(storage, {
    ...baseDraft,
    supportingFiles: [{
      id: "file-screenshot-1",
      kind: "screenshot",
      label: "Homepage op mobiel",
      reference: "practice-sources/homepage-mobile.png",
      mimeType: "image/png",
      capturedAt,
    }],
  }, new Date(capturedAt), "observation-with-file");
  assert.equal(saved?.supportingFiles[0].kind, "screenshot");
  assert.equal(Object.keys(observationStorageKeys).includes("uploads"), false);
});

test("defines exactly the approved human review outcomes", () => {
  assert.deepEqual(observationStatuses.map(({ id }) => id), [
    "unreviewed", "confirmed", "linked", "question", "parked", "rejected",
  ]);
});

test("applies every reviewed outcome only from the unreviewed state", () => {
  const decisions = [
    { status: "confirmed", reviewedBy: "Donovan", rationale: "Relevante werkelijkheid" },
    { status: "linked", reviewedBy: "Donovan", rationale: "Menselijk toegewezen", caseId: "0002" },
    { status: "question", reviewedBy: "Donovan", rationale: "Eerst een betere vraag" },
    { status: "parked", reviewedBy: "Donovan", rationale: "Bewust later", returnTrigger: "Bij nieuw praktijkbewijs" },
    { status: "rejected", reviewedBy: "Donovan", rationale: "Onvoldoende herleidbaar" },
  ];
  decisions.forEach((decision, index) => {
    const storage = memoryStorage();
    const id = `outcome-${index}`;
    capture(storage, id);
    const reviewed = reviewObservation(storage, id, decision, new Date(`2026-08-05T1${index}:00:00.000Z`));
    assert.equal(reviewed?.status, decision.status);
    assert.equal(reviewed?.history.at(-1).from, "unreviewed");
    assert.equal(reviewObservation(storage, id, decision), null);
  });
});

test("requires a human, rationale and return trigger for explainable transitions", () => {
  const storage = memoryStorage();
  capture(storage);
  assert.equal(reviewObservation(storage, "observation-test", {
    status: "parked",
    reviewedBy: "Donovan",
    rationale: "Later opnieuw bekijken",
  }), null);
  const parked = reviewObservation(storage, "observation-test", {
    status: "parked",
    reviewedBy: "Donovan",
    rationale: "Nu onvoldoende praktijkmomenten",
    returnTrigger: "Wanneer drie nieuwe praktijkmomenten beschikbaar zijn",
  }, new Date("2026-08-05T10:00:00.000Z"));
  assert.equal(parked?.status, "parked");
  assert.equal(parked?.history.at(-1).confirmedByHuman, true);
  const reopened = reopenObservation(storage, "observation-test", "Donovan", "De terugkeertrigger is bereikt", new Date("2026-08-06T10:00:00.000Z"));
  assert.equal(reopened?.status, "unreviewed");
  assert.equal(reopened?.history.at(-1).from, "parked");
  assert.equal(reopened?.history.length, 3);
});

test("requires human assignment before a case relation exists", () => {
  const storage = memoryStorage();
  capture(storage);
  assert.equal(reviewObservation(storage, "observation-test", {
    status: "linked",
    reviewedBy: "Donovan",
    rationale: "Hoort bij de actuele klantcase",
  }), null);
  const linked = reviewObservation(storage, "observation-test", {
    status: "linked",
    reviewedBy: "Donovan",
    rationale: "Hoort bij de actuele klantcase",
    caseId: "0002",
  });
  assert.equal(linked?.relations[0].layer, "case");
  assert.equal(linked?.relations[0].targetId, "0002");
  assert.equal(linked?.relations[0].confirmedByHuman, true);
});

test("never promotes an observation automatically to Understanding or Knowledge", () => {
  const storage = memoryStorage();
  capture(storage);
  assert.equal(linkObservation(storage, "observation-test", {
    layer: "knowledge",
    targetId: "knowledge-1",
    linkedBy: "Donovan",
    rationale: "Nog niet toegestaan",
  }), null);
  const confirmed = reviewObservation(storage, "observation-test", {
    status: "confirmed",
    reviewedBy: "Donovan",
    rationale: "Bron en context zijn menselijk gecontroleerd",
  });
  assert.equal(confirmed?.relations.length, 0);
  const related = linkObservation(storage, "observation-test", {
    layer: "understanding",
    targetId: "understanding-1",
    linkedBy: "Donovan",
    rationale: "Betekenis wordt afzonderlijk opgebouwd",
  });
  assert.equal(related?.relations[0].layer, "understanding");
  assert.equal(related?.relations.some((relation) => relation.layer === "knowledge"), false);
});
