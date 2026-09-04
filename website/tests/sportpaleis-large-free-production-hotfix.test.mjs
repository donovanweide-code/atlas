import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { applyFreeProductionBulkSettings } from "../src/sportpaleis/free-production-lines.ts";

const passwords = { kevin: "Large-Free-Admin-2026!", patrick: "Large-Free-Operator-2026!", collega: "Large-Free-Store-2026!", "donovan-support": "Large-Free-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-large-free-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve("."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-LARGE-FREE-PRODUCTION-HOTFIX-TEST" });
  await service.initialize();
  await store.mutate(async (state) => {
    state.orders = [];
    state.productionJobs = [];
    state.productionProposals = [];
    state.idempotency = {};
    state.nextOrderSequence = 1;
    state.nextProductionJobSequence = 1;
    return { state, value: null };
  });
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

function largeFreeLines(fontId, heightMm) {
  return Array.from({ length: 11 }, (_, index) => String(index + 2)).map((content) => ({
    id: `large-free-${heightMm}-${content}`,
    type: "NUMBER",
    content,
    previewLabel: content,
    widthMm: 180,
    heightMm,
    quantity: 2,
    foilColor: "Wit",
    sourceId: fontId,
    provenance: `Gerichte grote Vrije-opdrukregressie op ${heightMm} mm`,
  }));
}

async function produceLargeFree(context, heightMm) {
  const { root, service, admin } = await fixture(context);
  const bootstrap = await service.bootstrap(admin.token);
  const font = bootstrap.productionFonts.find(({ name, status }) => name === "Spain Euro 2016" && status === "TECHNICALLY_VALID");
  assert.ok(font, "de authoritative Spain Euro 2016-bron moet beschikbaar zijn");
  const lines = largeFreeLines(font.id, heightMm);
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM",
    customer: "Vrije productie performance-regressie",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: empty,
    productionLines: lines,
    items: [{ product: "Vrije opdruk 2 t/m 12", association: "Vrije bedrukking", size: "", quantity: 22, personalization: "2 t/m 12 ieder ×2", foilColor: "Wit", deviation: true, overrides: empty }],
  }, `large-free-${heightMm}-create`)).value;
  const operationKey = `large-free-${heightMm}-produce`;
  const startedAt = performance.now();
  const first = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: created.id, expectedRevision: created.revision }], foilColor: "Wit" }, operationKey);
  const elapsedMs = performance.now() - startedAt;
  const job = first.value.job;
  assert.equal(first.duplicate, false);
  assert.equal(job.snapshot.productionLines.length, 11);
  assert.deepEqual(job.snapshot.productionLines.map(({ content }) => content), Array.from({ length: 11 }, (_, index) => String(index + 2)));
  assert.ok(job.snapshot.productionLines.every((line) => line.quantity === 2 && line.heightMm === heightMm));
  assert.equal(job.snapshot.generationMetrics.physicalPieceCount, 28);
  assert.equal(job.snapshot.generationMetrics.nestedObjectCount, 22);
  context.diagnostic(`${heightMm}mm pre-assert: source=${job.snapshot.generationMetrics.sourceResolutionMs}ms geometry=${job.snapshot.generationMetrics.geometryMs}ms semantic=${job.snapshot.generationMetrics.semanticGroupingMs}ms nesting=${job.snapshot.generationMetrics.nestingMs}ms svg=${job.snapshot.generationMetrics.svgAndIntegrityMs}ms persist=${job.snapshot.generationMetrics.persistenceMs}ms total=${job.snapshot.generationMetrics.totalMs}ms wall=${elapsedMs.toFixed(1)}ms`);
  assert.ok(job.snapshot.generationMetrics.nestingMs < 10_000, `nesting moet begrensd blijven, gemeten ${job.snapshot.generationMetrics.nestingMs} ms`);
  assert.ok(elapsedMs < 15_000, `de volledige lokale production-shaped write moet binnen 15 s blijven, gemeten ${elapsedMs.toFixed(1)} ms`);
  const artifact = await readFile(path.join(root, "runtime", job.snapshot.artifact.path));
  assert.equal(createHash("sha256").update(artifact).digest("hex").toUpperCase(), job.snapshot.artifact.sha256);

  const duplicate = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: created.id, expectedRevision: created.revision }], foilColor: "Wit" }, operationKey);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.value.job.id, job.id);
  assert.equal(duplicate.value.job.snapshot.artifact.sha256, job.snapshot.artifact.sha256);
  const after = await service.bootstrap(admin.token);
  assert.equal(after.productionJobs.filter(({ snapshot }) => snapshot.orderIds.includes(created.id)).length, 1);
  assert.equal(after.productionProposals.filter(({ orders }) => orders.some(({ id }) => id === created.id)).length, 1);
  assert.equal(after.orders.find(({ id }) => id === created.id).stage, "PRINT");
  context.diagnostic(`${heightMm}mm: nesting=${job.snapshot.generationMetrics.nestingMs}ms total=${job.snapshot.generationMetrics.totalMs}ms wall=${elapsedMs.toFixed(1)}ms hash=${job.snapshot.artifact.sha256}`);
}

test("grote Vrije WIT-batch Spain 2 t/m 12 ×2 op 80 mm blijft ruim binnen het requestbudget", async (context) => {
  await produceLargeFree(context, 80);
});

test("dezelfde worst-case batch op 200 mm veroorzaakt geen exponentiële event-loopblokkade", async (context) => {
  await produceLargeFree(context, 200);
});

test("zichtbare gedeelde hoogte wordt bij opslaan als 80 mm op iedere occurrence toegepast", async () => {
  const lines = Array.from({ length: 11 }, (_, index) => ({ id: `line-${index}`, type: "NUMBER", fontId: "spain", heightMm: 200, foilColor: "Wit", quantity: 1 }));
  assert.equal(applyFreeProductionBulkSettings(lines, new Set(lines.map(({ id }) => id)), { heightCm: 8, quantity: 2, foilColor: "Wit", fontId: "spain", type: "NUMBER" }), 11);
  assert.ok(lines.every(({ heightMm, quantity }) => heightMm === 80 && quantity === 2));
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const submitIndex = source.indexOf('if (form.matches("[data-free-order-form]"))');
  const applyIndex = source.indexOf("applyVisibleFreeProductionSharedSettings(form, state!);", submitIndex);
  const projectIndex = source.indexOf("const productionLines: PendingProductionLine[]", submitIndex);
  assert.ok(submitIndex >= 0 && applyIndex > submitIndex && applyIndex < projectIndex, "submit materialiseert eerst de zichtbaar gekozen gedeelde instellingen en pas daarna de productieoccurrences");
});
