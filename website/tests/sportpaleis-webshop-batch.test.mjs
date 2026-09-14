import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BatchOverrideStore } from "../src/sportpaleis/webshop-batch-overrides.mjs";
import { projectWebshopPrintBatch, sourceDate, validateBatchValues } from "../src/sportpaleis/webshop-batch-projection.mjs";
import { createBatchPlotJobDryRun } from "../src/sportpaleis/webshop-batch-plotjob.mjs";

const hash = "a".repeat(64);
function evidence(pages) {
  return { status: "EVIDENCE_READY", attachmentSha256: hash, source: { tenantId: "sportpaleis" },
    evidence: { pages: pages.map((lines, index) => ({ page: index + 1, items: lines.map((originalValue, row) => ({ originalValue, transform: [1, 0, 0, 1, 10, 800 - row * 15] })) })) } };
}
const sourceLines = (number, date, extra = []) => [`Besteldatum: ${date}`, `Bestelnummer: ${number}`, "Artikelnummer: 131240", "Omschrijving: Shirt", "Maat: L", "Kleur: ZWART", "Aantal: 1", ...extra];

test("labelled references are not year-bound and other 26-prefixed numbers do not split an order", () => {
  const batch = projectWebshopPrintBatch(evidence([sourceLines("9930000000", "14-09-2026", ["Initialen: AB", "Telefoon: 2612345678"])]));
  assert.equal(batch.sourceWarnings.length, 0);
  assert.equal(batch.itemCount, 1);
  assert.equal(batch.items[0].orderNumber, "9930000000");
});

test("only explicit printing items enter batch; dates before order heading remain attached and sort oldest first", () => {
  const batch = projectWebshopPrintBatch(evidence([
    sourceLines("2635358683", "26-08-2026", ["Initialen: AB", "Artikelnummer: 999999", "Omschrijving: Onbedrukt shirt", "Maat: M", "Kleur: ROOD", "Aantal: 2"]),
    sourceLines("2635358681", "25-08-2026", ["Initialen: CD"]),
    sourceLines("2635358680", "24-08-2026"),
  ]));
  assert.equal(batch.sourceOrderCount, 3); assert.equal(batch.itemCount, 2);
  assert.deepEqual(batch.items.map(({ orderNumber, orderDate }) => [orderNumber, orderDate]), [["2635358681", "2026-08-25"], ["2635358683", "2026-08-26"]]);
  assert.ok(batch.items.every(({ source }) => source.articleNumber !== "999999"));
});
test("explicit unknown printing stays review-needed while printed club names alone never create work", () => {
  const batch = projectWebshopPrintBatch(evidence([
    sourceLines("2635358683", "26-08-2026", ["Bedrukking speciaal: ster"]),
    sourceLines("2635358682", "26-08-2026").map((line) => line === "Omschrijving: Shirt" ? "Omschrijving: Clublogo trainingsshirt" : line),
  ]));
  assert.equal(batch.items.length, 1);
  assert.equal(batch.items[0].values.personalizations[0].value, "ster");
  assert.ok(validateBatchValues(batch.items[0].values).some(({ field }) => field === "personalizations"));
});
test("date validation never rolls invalid days into next month and missing date stays review-needed", () => {
  assert.equal(sourceDate("31-02-2026"), null); assert.equal(sourceDate("29-02-2024"), "2024-02-29");
  const item = projectWebshopPrintBatch(evidence([sourceLines("2635358683", "31-02-2026", ["Initialen: AB"])] )).items[0];
  assert.equal(item.orderDate, null); assert.equal(item.issues[0].field, "orderDate");
});
test("projection is deterministic and unknown instruction with same value is not swallowed", () => {
  const input = evidence([sourceLines("2635358683", "26-08-2026", ["Initialen: AB", "Bedrukking speciaal: AB"])]);
  const one = projectWebshopPrintBatch(input), two = projectWebshopPrintBatch(input);
  assert.deepEqual(one, two); assert.equal(one.items[0].values.personalizations.length, 2);
});
test("spacing around a known instruction label never duplicates the decoration", () => {
  const batch = projectWebshopPrintBatch(evidence([sourceLines("2635358683", "26-08-2026", ["Initialen : AB"])]));
  assert.deepEqual(batch.items[0].values.personalizations, [{ type: "INITIALS", value: "AB" }]);
});

test("negative and empty print labels never admit unprinted articles", () => {
  for (const label of ["Bedrukking: Nee", "Bedrukking: Geen", "Opdruk:", "Initialen: -", "Personalisatie: n.v.t.", "Bedrukking: Zonder bedrukking"]) {
    assert.equal(projectWebshopPrintBatch(evidence([sourceLines("2635358683", "26-08-2026", [label])])).itemCount, 0, label);
  }
});

test("missing source quantity stays unknown until explicitly corrected", async () => {
  const row = projectWebshopPrintBatch(evidence([sourceLines("2635358683", "26-08-2026", ["Initialen: AB"]).filter((line) => !line.startsWith("Aantal:"))])).items[0];
  assert.equal(row.source.quantity, null);
  const adapter = createBatchPlotJobDryRun();
  assert.equal((await adapter.evaluate(row)).status, "REVIEW_REQUIRED");
  assert.equal((await adapter.evaluate({ ...row, values: { ...row.values, quantity: 1 } })).status, "READY");
});

test("duplicate complete pages cannot double quantities; changed order copies block", async () => {
  const page = sourceLines("2635358683", "26-08-2026", ["Initialen: AB"]);
  const batch = projectWebshopPrintBatch(evidence([page, page, page.map((line) => line === "Initialen: AB" ? "Initialen: CD" : line)]));
  assert.equal(batch.itemCount, 2);
  assert.deepEqual(batch.items.map((row) => row.values.personalizations[0].value), ["AB", "CD"]);
  for (const row of batch.items) assert.equal((await createBatchPlotJobDryRun().evaluate(row)).status, "REVIEW_REQUIRED");
  const duplicate = projectWebshopPrintBatch(evidence([page, page]));
  assert.equal(duplicate.itemCount, 1); assert.equal(duplicate.items[0].issues.length, 0);
  const continuation = projectWebshopPrintBatch(evidence([page, sourceLines("2635358683", "26-08-2026", ["Initialen: CD"]).slice(2)]));
  assert.equal(continuation.itemCount, 2); assert.ok(continuation.items.every((row) => row.issues.length === 0));
});
test("delta-only persistence survives reopen, rejects stale edits, excludes/restores, and fences receipt retries", async () => {
  const root = await mkdtemp(join(tmpdir(), "spw-batch-delta-"));
  const filename = join(root, "overrides.sqlite");
  const row = { id: "one", sourceHash: hash, orderNumber: "2635358683" };
  let store = new BatchOverrideStore(filename);
  store.save(row, { changes: { size: "M" }, excluded: true, reviewed: false, structuralRuleCandidate: true }, 0, "local-test");
  assert.throws(() => store.save(row, { changes: {}, excluded: false, reviewed: false, structuralRuleCandidate: false }, 0, "local-test"), /gewijzigd/u);
  store.close(); store = new BatchOverrideStore(filename);
  assert.deepEqual(store.snapshot(hash).overrides.one.changes, { size: "M" });
  assert.equal(store.snapshot(hash).overrides.one.excluded, true);
  store.save(row, { ...store.snapshot(hash).overrides.one, excluded: false }, 1, "local-test");
  const receipt = store.confirm("request", hash, ["one"], 2, "local-test");
  assert.equal(receipt.duplicate, false); assert.equal(store.confirm("request", hash, ["one"], 2, "local-test").duplicate, true);
  assert.throws(() => store.confirm("new-request", hash, ["one"], 3, "local-test"), /al voorbereid/u);
  assert.equal(store.snapshot("b".repeat(64)).completedIds.length, 0);
  store.close();
  assert.ok((await readdir(root)).every((name) => name.startsWith("overrides.sqlite")));
  const bytes = await readFile(filename);
  assert.ok(!bytes.includes(Buffer.from("%PDF-"))); assert.ok(!bytes.includes(Buffer.from("Besteldatum:")));
});
test("existing contract gives deterministic validated dry-run and isolates bad rows", async () => {
  const row = { id: "real-pattern", sourceHash: hash, sourceLineId: "one", orderNumber: "2635358614", issues: [], club: null,
    values: { articleNumber: "131240", description: "Shirt", size: "L", color: "ZWART", quantity: 1, personalizations: [{ type: "INITIALS", value: "D.T" }] } };
  const a = await createBatchPlotJobDryRun().evaluate(row), b = await createBatchPlotJobDryRun().evaluate(row);
  assert.equal(a.status, "READY"); assert.equal(a.contract.validation.status, "VALID");
  assert.deepEqual(a, b);
  const wrong = await createBatchPlotJobDryRun().evaluate({ ...row, values: { ...row.values, articleNumber: "not-known" } });
  assert.equal(wrong.status, "REVIEW_REQUIRED");
  assert.equal(wrong.contract, null);
  const wrongColor = await createBatchPlotJobDryRun().evaluate({ ...row, values: { ...row.values, color: "Niet-bestaande-kleur" } });
  assert.equal(wrongColor.status, "REVIEW_REQUIRED"); assert.equal(wrongColor.contract, null);
});


test("V1.1 profiles use existing truth, respect one-off choice and never authorize custom profiles", async () => {
  const adapter = createBatchPlotJobDryRun(), originalTruth = adapter.truthHash;
  const row = { id: "profile-test", issues: [], values: { articleNumber: "116597", description: "FC Almere Wedstrijdshirt", size: "XL", color: "GROEN", quantity: 1, personalizations: [{ type: "BACK_NUMBER", value: "88" }] } };
  const senior = await adapter.evaluate(row);
  assert.equal(senior.sizeProfile.value, "SENIOR"); assert.equal(senior.sizeProfile.automatic, true);
  const junior = await adapter.evaluate({ ...row, values: { ...row.values, size: "128" } });
  assert.equal(junior.status, "READY"); assert.equal(junior.sizeProfile.value, "JUNIOR");
  const manual = await adapter.evaluate({ ...row, values: { ...row.values, sizeProfile: "JUNIOR" } });
  assert.equal(manual.sizeProfile.value, "JUNIOR"); assert.equal(manual.sizeProfile.automatic, false);
  assert.equal(manual.contract.items[0].variants[0].personalizationValues.backNumberSizeClass, "JUNIOR");
  const custom = await adapter.evaluate({ ...row, values: { ...row.values, sizeProfile: "CUSTOM", customProfile: "Eenmalig afwijkend" } });
  assert.equal(custom.status, "REVIEW_REQUIRED"); assert.equal(custom.contract, null);
  assert.equal(adapter.truthHash, originalTruth);
  assert.equal((await adapter.evaluate(row)).sizeProfile.value, "SENIOR");
});

test("V1.1 full context projection preserves original item identities without admitting unprinted items", () => {
  const source = evidence([sourceLines("2635358683", "26-08-2026", ["Initialen: AB", "Artikelnummer: 999999", "Omschrijving: Kousen", "Maat: M", "Kleur: ROOD", "Aantal: 2"])]);
  const batch = projectWebshopPrintBatch(source);
  const detail = projectWebshopPrintBatch(source, { orderNumber: "2635358683" });
  assert.equal(batch.itemCount, 1); assert.equal(detail.itemCount, 2);
  assert.equal(detail.items[0].id, batch.items[0].id);
  assert.equal(detail.items[1].printingRequired, false);
  assert.equal(detail.items[1].source.quantity, 2);
});


test("page-scoped order detail preserves batch IDs with continuation and neighbouring orders", () => {
  const one = sourceLines("2635358681", "25-08-2026", ["Initialen: AA"]);
  const two = sourceLines("2635358683", "26-08-2026", ["Initialen: BB"]);
  const continuation = two.slice(2).map((line) => line === "Initialen: BB" ? "Initialen: CC" : line);
  for (const input of [evidence([one, two, continuation]), evidence([[...one, ...two], continuation])]) {
    const batch = projectWebshopPrintBatch(input);
    const expected = batch.items.filter((r) => r.orderNumber === "2635358683");
    const anchor = expected[0];
    const scoped = { ...input, evidence: { pages: input.evidence.pages.filter((p) => anchor.sourcePages.includes(p.page)) } };
    const actual = projectWebshopPrintBatch(scoped, { orderNumber: anchor.orderNumber, sourceOrderIndex: anchor.sourceOrderIndex });
    assert.deepEqual(actual.items.map((r) => r.id), expected.map((r) => r.id));
    assert.deepEqual(actual.items.map((r) => r.source), expected.map((r) => r.source));
  }
});
