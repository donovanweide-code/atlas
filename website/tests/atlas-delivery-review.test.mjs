import assert from "node:assert/strict";
import test from "node:test";

import {
  bijCeesDeliveryReview,
  deliveryEvidenceLabel,
} from "../src/atlas-delivery-review.ts";

test("de leveringsreview scheidt live realisatie van formele acceptatie", () => {
  assert.equal(bijCeesDeliveryReview.subject, "Bij Cees");
  assert.equal(bijCeesDeliveryReview.status, "progress-update-ready");
  assert.match(bijCeesDeliveryReview.formalCompletion, /geen onderdeel/i);
  assert.equal(bijCeesDeliveryReview.realized.length, 5);
  assert.ok(bijCeesDeliveryReview.realized.every((item) => item.boundary.length > 0));
  assert.equal(deliveryEvidenceLabel("live-verified"), "Live bevestigd");
  assert.equal(deliveryEvidenceLabel("source-supported"), "Deels bevestigd");
});

test("de review geeft een betrouwbare terugkoppeling zonder fictieve einddatum", () => {
  assert.equal(bijCeesDeliveryReview.feedback.timing, "Nu");
  assert.match(bijCeesDeliveryReview.feedback.scope, /geen opleverbevestiging/i);
  assert.match(bijCeesDeliveryReview.feedback.completionDate, /nog niet verantwoord/i);
  assert.ok(bijCeesDeliveryReview.blockers.some((item) => /acceptatie/i.test(item)));
  assert.ok(bijCeesDeliveryReview.blockers.some((item) => /orderketen/i.test(item)));
  assert.ok(bijCeesDeliveryReview.uncertainties.some((item) => /verzendkostenbesluit/i.test(item)));
});

test("de eerste scopebron is bevestigd zonder acceptatie te veronderstellen", () => {
  assert.equal(bijCeesDeliveryReview.scopeSource.status, "confirmed");
  assert.equal(bijCeesDeliveryReview.scopeSource.date, "2026-01-29T12:23:46+01:00");
  assert.match(bijCeesDeliveryReview.scopeSource.subject, /menubalk \+ teksten/i);
  assert.match(bijCeesDeliveryReview.scopeSource.boundary, /geen latere acceptatie/i);
  assert.match(bijCeesDeliveryReview.scopeSource.sourcePath, /EMAIL-SCOPE-2026-01-29\.md$/);
});

test("ieder genoemd scopeonderdeel scheidt vraag, live bewijs, open werk en acceptatie", () => {
  assert.equal(bijCeesDeliveryReview.scopeItems.length, 7);
  assert.deepEqual(
    bijCeesDeliveryReview.scopeItems.map((item) => item.title),
    [
      "SEO-teksten",
      "Menubalk",
      "Woonstore verwijderen",
      "Layoutkleuren",
      "Verzendkosten",
      "Klarna bij Bij Cees",
      "Klarna bij AquaFlask",
    ],
  );
  assert.ok(bijCeesDeliveryReview.scopeItems.every((item) => item.originallyRequested.length > 0));
  assert.ok(bijCeesDeliveryReview.scopeItems.every((item) => item.liveFinding.length > 0));
  assert.ok(bijCeesDeliveryReview.scopeItems.every((item) => item.open.length > 0));
  assert.ok(bijCeesDeliveryReview.scopeItems.every((item) => /niet aanwezig/i.test(item.acceptanceEvidence)));
  assert.match(
    bijCeesDeliveryReview.scopeItems.find((item) => item.title === "Klarna bij AquaFlask").liveFinding,
    /Klarna was niet zichtbaar/i,
  );
});

test("de review blijft buiten case-identiteit en gevoelige lokale gegevens", () => {
  assert.equal("caseId" in bijCeesDeliveryReview, false);
  assert.equal("snapshot" in bijCeesDeliveryReview, false);
  assert.equal("priority" in bijCeesDeliveryReview, false);
  assert.equal("nextStep" in bijCeesDeliveryReview, false);
  assert.ok(bijCeesDeliveryReview.sources.every((source) => !/api gegevens/i.test(source.location)));
  assert.doesNotMatch(JSON.stringify(bijCeesDeliveryReview.scopeSource), /IBAN|adres|telefoon|@/i);
});
