import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTRA_USER_PRICES,
  applyWorkspaceAction,
  canAccessAdmin,
  createInitialSportpaleisState,
} from "../src/sportpaleis/workspace-data.ts";
import {
  createCutJobBatch,
  createReferencePieces,
} from "../src/sportpaleis/direct-print/index.ts";

const NOW = "2026-08-07T12:00:00.000Z";

test("Sportpaleis workspace start met drie klantgebruikers en alleen Kevin als beheerder", () => {
  const state = createInitialSportpaleisState();
  assert.equal(state.users.length, 3);
  assert.equal(state.users.filter(({ role }) => role === "admin").length, 1);
  assert.equal(canAccessAdmin(state), true);
});

test("orderstatus volgt uitsluitend order, controle, print, gereed", () => {
  let state = createInitialSportpaleisState();
  const orderId = "SP-2026-0102";
  for (const [index, expected] of ["CONTROL", "PRINT", "DONE", "DONE"].entries()) {
    state = applyWorkspaceAction(state, {
      id: `advance-${index}`,
      type: "ADVANCE_ORDER",
      userId: "kevin",
      at: NOW,
      orderId,
    });
    assert.equal(state.orders.find(({ id }) => id === orderId)?.stage, expected);
  }
});

test("acties zijn idempotent en maken geen dubbele ordermutatie", () => {
  const initial = createInitialSportpaleisState();
  const action = {
    id: "same-action",
    type: "ADVANCE_ORDER",
    userId: "kevin",
    at: NOW,
    orderId: "SP-2026-0102",
  };
  const first = applyWorkspaceAction(initial, action);
  const duplicate = applyWorkspaceAction(first, action);
  assert.equal(duplicate, first);
  assert.equal(duplicate.revision, initial.revision + 1);
});

test("operator kan geen extra gebruikers of abonnementswijziging aanvragen", () => {
  const state = createInitialSportpaleisState();
  assert.throws(() => applyWorkspaceAction(state, {
    id: "operator-request",
    type: "REQUEST_USERS",
    userId: "patrick",
    at: NOW,
    request: {
      id: "request-1",
      requestedBy: "patrick",
      requestedAt: NOW,
      quantity: 1,
      monthlyPriceEur: 7.5,
      status: "Aangevraagd",
    },
  }), /Alleen een beheerder/);
});

test("extra-gebruikersprijzen zijn exact en aanvraag blijft intern traceerbaar", () => {
  assert.deepEqual(EXTRA_USER_PRICES, { 1: 7.5, 2: 12.5, 3: 17.5 });
  const state = applyWorkspaceAction(createInitialSportpaleisState(), {
    id: "admin-request",
    type: "REQUEST_USERS",
    userId: "kevin",
    at: NOW,
    request: {
      id: "request-2",
      requestedBy: "kevin",
      requestedAt: NOW,
      quantity: 2,
      monthlyPriceEur: 12.5,
      status: "Aangevraagd",
    },
  });
  assert.equal(state.extraUserRequests[0].monthlyPriceEur, 12.5);
  assert.equal(state.audit[0].subject, "2 gebruiker(s)");
});

test("verplichte panelen blijven aanwezig wanneer optionele panelen worden verborgen", () => {
  const state = applyWorkspaceAction(createInitialSportpaleisState(), {
    id: "preferences",
    type: "SAVE_PREFERENCES",
    userId: "kevin",
    at: NOW,
    preference: {
      view: "compact",
      density: "compact",
      optionalPanels: { recent: false, shortcuts: false },
      panelOrder: ["attention", "production", "recent", "shortcuts"],
    },
  });
  assert.deepEqual(state.preferences.kevin.panelOrder.slice(0, 2), ["attention", "production"]);
});

test("Direct Print-preview is kleurgescheiden, 1:1 en binnen de absolute 450 mm", () => {
  const batch = createCutJobBatch({
    organizationId: "sport-2000-sportpaleis-bv",
    orderId: "SNIJTEST-001",
    revision: 1,
    attemptIdPrefix: "test",
    createdAt: NOW,
    pieces: createReferencePieces(),
    nesting: {
      absoluteMaxWidthMm: 450,
      preferredWorkingWidthMm: 440,
      minimumCutGapMm: 6.4,
      edgeMarginMm: 5,
    },
  });
  assert.equal(batch.batches.length, 1);
  assert.equal(batch.batches[0].foilColor, "Wit");
  assert.equal(batch.batches[0].objectIds.length, 3);
  assert.ok(batch.jobs.every((job) => job.nesting.scaleApplied === 1));
  assert.ok(batch.jobs.every((job) => job.nesting.usedWidthMm <= 450));
  assert.ok(batch.jobs.every((job) => job.hardwareValidation.required));
});
