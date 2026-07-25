import assert from "node:assert/strict";
import test from "node:test";

import {
  reviewAuthorityLabels,
  reviewItemTypeLabels,
  workspaceReviewLayer,
} from "../src/atlas-review-layer.ts";
import { bijCeesDeliveryReview } from "../src/atlas-delivery-review.ts";

test("de denklaag bewaart Vandaag, Nog beoordelen en Horizon als afzonderlijke aandacht", () => {
  assert.equal(workspaceReviewLayer.today.lane, "today");
  assert.ok(workspaceReviewLayer.review.every((item) => item.lane === "review"));
  assert.ok(workspaceReviewLayer.horizon.every((item) => item.lane === "horizon"));
  assert.equal(workspaceReviewLayer.today.authority, "review-result");
  assert.ok(workspaceReviewLayer.review.every((item) => item.authority === "candidate"));
  assert.ok(workspaceReviewLayer.horizon.every((item) => item.authority === "horizon"));
});

test("de gevraagde praktijkitems zijn volledig en blijven onbevestigd waar nodig", () => {
  const ids = [
    ...workspaceReviewLayer.review.map((item) => item.id),
    ...workspaceReviewLayer.horizon.map((item) => item.id),
  ];

  assert.deepEqual(ids, [
    "source-versus-current-norm",
    "workspace-voice",
    "visible-supported-recommendations",
    "workspace-action-idea-layer",
    "safe-staging-cycle",
  ]);
  assert.ok(workspaceReviewLayer.review.every((item) => item.approval.length > 0));
  assert.match(workspaceReviewLayer.horizon[0].approval, /geen uitvoeringsopdracht/i);
});

test("de actie voor vandaag komt rechtstreeks uit de bestaande Delivery Review", () => {
  assert.equal(workspaceReviewLayer.today.why, bijCeesDeliveryReview.blockers[0]);
  assert.equal(workspaceReviewLayer.today.nextReview, bijCeesDeliveryReview.openItems[0]);
  assert.equal(workspaceReviewLayer.today.relatedOpenItems, bijCeesDeliveryReview.openItems);
  assert.match(workspaceReviewLayer.workingBoundary, /geen opleverbevestiging/i);
});

test("de verkenning gebruikt We Build And Design als stem zonder merkbesluit", () => {
  assert.equal(workspaceReviewLayer.sender, "We Build And Design");
  assert.equal(workspaceReviewLayer.signature, "Powered by Atlas");
  assert.equal(workspaceReviewLayer.signatureStatus, "design-exploration");
  assert.equal(reviewItemTypeLabels.candidate, "Candidate");
  assert.equal(reviewAuthorityLabels.candidate, "Goedkeuring nodig");
});

test("de denklaag introduceert geen case-, focus- of automatische beslisidentiteit", () => {
  const serialized = JSON.stringify(workspaceReviewLayer);
  assert.equal("caseId" in workspaceReviewLayer.today, false);
  assert.equal("priority" in workspaceReviewLayer.today, false);
  assert.equal("decision" in workspaceReviewLayer.today, false);
  assert.doesNotMatch(serialized, /automatisch gekozen|Atlas heeft besloten/i);
});
