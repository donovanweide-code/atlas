import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  observationOriginLabel,
  observationReviewOutcomes,
  observationReviewTitle,
  observationsNeedingReview,
  observationSourceKindLabel,
  prepareObservationReview,
} from "../src/atlas-observation-review.ts";

const baseObservation = {
  version: 2,
  id: "observation-review-test",
  text: "De primaire route is op mobiel rustig zichtbaar. Een tweede zin hoort niet in de korte titel.",
  createdAt: "2026-08-05T09:00:00.000Z",
  status: "unreviewed",
  source: {
    id: "public-home",
    kind: "surface",
    label: "Publieke WBD-website · Homepage",
    origin: "website",
    path: "/",
    locator: "/#eerste-publieke-minuut",
    capturedAt: "2026-08-05T09:00:00.000Z",
  },
  context: {
    surface: "public",
    path: "/",
    hash: "#eerste-publieke-minuut",
    pageId: "public.home",
    pageLabel: "Homepage",
    boundaryId: "public.home.entry",
    boundaryLabel: "Eerste publieke minuut",
    viewport: { width: 430, height: 932 },
  },
  ownership: { captureOwner: "We Build And Design", reviewOwner: "Atlas · Werkelijkheid" },
  supportingFiles: [],
  relations: [],
  history: [{ id: "captured", from: null, to: "unreviewed", at: "2026-08-05T09:00:00.000Z", actor: "We Build And Design", rationale: "Bij de bron vastgelegd", confirmedByHuman: false }],
};

test("de wachtrij bevat uitsluitend observaties die menselijke beoordeling nodig hebben", () => {
  const reviewed = { ...baseObservation, id: "reviewed", status: "confirmed" };
  const store = { version: 2, observations: [reviewed, baseObservation] };
  assert.deepEqual(observationsNeedingReview(store).map(({ id }) => id), [baseObservation.id]);
  assert.equal(observationReviewTitle(baseObservation), "De primaire route is op mobiel rustig zichtbaar.");
  assert.equal(observationSourceKindLabel(baseObservation), "Oppervlak");
  assert.equal(observationOriginLabel(baseObservation), "Website");
});

test("de review ondersteunt uitsluitend de vijf bestaande menselijke uitkomsten", () => {
  assert.deepEqual(observationReviewOutcomes.map(({ id }) => id), ["confirmed", "linked", "question", "parked", "rejected"]);
});

test("beoordelaar en begrijpelijke motivering zijn voor iedere beslissing verplicht", () => {
  assert.throws(() => prepareObservationReview({ status: "confirmed", reviewedBy: "", rationale: "Bron gecontroleerd" }), /beoordelaar/);
  assert.throws(() => prepareObservationReview({ status: "confirmed", reviewedBy: "Donovan", rationale: " " }), /waarom/);
  assert.deepEqual(prepareObservationReview({ status: "confirmed", reviewedBy: " Donovan ", rationale: " Bron en context kloppen. " }), {
    status: "confirmed",
    reviewedBy: "Donovan",
    rationale: "Bron en context kloppen.",
  });
});

test("Case-toewijzing en parkering hebben hun eigen verplichte context", () => {
  assert.throws(() => prepareObservationReview({ status: "linked", reviewedBy: "Donovan", rationale: "Hoort bij een Case" }), /Kies de Case/);
  assert.deepEqual(prepareObservationReview({ status: "linked", reviewedBy: "Donovan", rationale: "Hoort bij deze Case", caseId: "0002" }).caseId, "0002");
  assert.throws(() => prepareObservationReview({ status: "parked", reviewedBy: "Donovan", rationale: "Bewust later" }), /opnieuw aandacht/);
  assert.equal(prepareObservationReview({ status: "parked", reviewedBy: "Donovan", rationale: "Bewust later", returnTrigger: "Bij nieuw praktijkbewijs" }).returnTrigger, "Bij nieuw praktijkbewijs");
});

test("voorbereiden, openen en annuleren muteren de observatiegegevens niet", () => {
  const store = { version: 2, observations: [structuredClone(baseObservation)] };
  const before = JSON.stringify(store);
  observationsNeedingReview(store);
  observationReviewTitle(store.observations[0]);
  prepareObservationReview({ status: "question", reviewedBy: "Donovan", rationale: "Eerst meer duidelijkheid" });
  assert.equal(JSON.stringify(store), before);
});

test("de bestaande Atlas-interface bevat detail, expliciete bevestiging en rustige toestanden", async () => {
  const workspace = await readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /id="observatie-review"/);
  assert.match(workspace, /Welke ontvangen werkelijkheid vraagt nog om menselijk oordeel\?/);
  assert.match(workspace, /data-observation-review-dialog aria-labelledby="observation-review-dialog-title"/);
  assert.match(workspace, /Bevestig menselijke beoordeling/);
  assert.match(workspace, /Een keuze verandert nog niets/);
  assert.match(workspace, /data-observation-review-cancel/);
  assert.match(workspace, /Er zijn momenteel geen observaties die om jouw beoordeling vragen/);
  assert.match(workspace, /Deze observatie is niet beschikbaar/);
  assert.match(workspace, /legacyContext/);
  assert.match(workspace, /supportingFiles/);
  assert.match(workspace, /Menselijk bevestigde relaties/);
  assert.match(workspace, /observation\.relations/);
});

test("de review blijft toetsenbord- en mobiel bruikbaar binnen de bestaande design tokens", async () => {
  const css = await readFile(new URL("../src/styles/atlas-workspace.css", import.meta.url), "utf8");
  assert.match(css, /\.observation-review-card > button[^}]*min-height:\s*2\.75rem/s);
  assert.match(css, /\.observation-review-options input:focus-visible \+ span/);
  assert.match(css, /\.observation-review-dialog::backdrop/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.observation-review-dialog/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("UXA-04 bouwt geen automatische Understanding- of kennisdoorstroming", async () => {
  const review = await readFile(new URL("../src/atlas-observation-review.ts", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8");
  assert.doesNotMatch(review, /addReviewedObservationToUnderstanding|proposalToKnowledgeEntry|approveProposal/);
  assert.doesNotMatch(workspace, /data-observation-review-form[\s\S]{0,9000}addReviewedObservationToUnderstanding/);
  assert.match(workspace, /Deze beoordeling maakt geen kennisvoorstel en publiceert niets/);
});
