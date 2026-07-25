import assert from "node:assert/strict";
import test from "node:test";

import {
  bijCeesDeliveryReview,
  deliveryEvidenceLabel,
} from "../src/atlas-delivery-review.ts";

test("de leveringsreview scheidt live realisatie van formele acceptatie", () => {
  assert.equal(bijCeesDeliveryReview.subject, "Bij Cees");
  assert.equal(bijCeesDeliveryReview.status, "progress-update-ready");
  assert.match(bijCeesDeliveryReview.formalCompletion, /geen afzonderlijk werkitem/i);
  assert.equal(bijCeesDeliveryReview.realized.length, 5);
  assert.ok(bijCeesDeliveryReview.realized.every((item) => item.boundary.length > 0));
  assert.equal(deliveryEvidenceLabel("live-verified"), "Live bevestigd");
  assert.equal(deliveryEvidenceLabel("source-supported"), "Bronondersteund");
});

test("de review geeft een betrouwbare terugkoppeling zonder fictieve einddatum", () => {
  assert.equal(bijCeesDeliveryReview.feedback.timing, "Nu");
  assert.match(bijCeesDeliveryReview.feedback.scope, /geen opleverbevestiging/i);
  assert.match(bijCeesDeliveryReview.feedback.completionDate, /nog niet verantwoord/i);
  assert.ok(bijCeesDeliveryReview.blockers.some((item) => /acceptatie/i.test(item)));
  assert.ok(bijCeesDeliveryReview.blockers.some((item) => /orderketen/i.test(item)));
  assert.ok(bijCeesDeliveryReview.uncertainties.some((item) => /filterwerking/i.test(item)));
});

test("gericht lokaal brononderzoek verscherpt het scopegat zonder het fictief te vullen", () => {
  assert.equal(bijCeesDeliveryReview.scopeSearch.status, "not-found-locally");
  assert.match(bijCeesDeliveryReview.scopeSearch.finding, /geen briefing, offerte of wijzigingsverzoek uit 2026/i);
  assert.match(bijCeesDeliveryReview.scopeSearch.decisiveSource, /e-mail-, WhatsApp- of briefingsspoor/i);
  assert.match(bijCeesDeliveryReview.scopeSearch.boundary, /niet de actuele opdracht of acceptatie/i);
  assert.equal(bijCeesDeliveryReview.scopeSearch.searched.length, 4);
});

test("de review blijft buiten case-identiteit en gevoelige lokale gegevens", () => {
  assert.equal("caseId" in bijCeesDeliveryReview, false);
  assert.equal("snapshot" in bijCeesDeliveryReview, false);
  assert.equal("priority" in bijCeesDeliveryReview, false);
  assert.equal("nextStep" in bijCeesDeliveryReview, false);
  assert.ok(bijCeesDeliveryReview.sources.every((source) => !/api gegevens/i.test(source.location)));
  assert.doesNotMatch(JSON.stringify(bijCeesDeliveryReview.scopeSearch), /€|IBAN|adres|telefoon/i);
});
