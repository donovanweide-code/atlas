import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createCutJobBatch } from "../src/sportpaleis/direct-print/cut-job.ts";
import { boundsForContours } from "../src/sportpaleis/direct-print/geometry.ts";
import { createProductionPreview } from "../src/sportpaleis/direct-print/preview.ts";
import { createManagedFontProductionPiece } from "../src/sportpaleis/managed-font-production.mjs";

const passwords = { kevin: "Mini-006-Kevin!", patrick: "Mini-006-Patrick!", collega: "Mini-006-Store!", "donovan-support": "Mini-006-Support!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };
const nesting = { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 };

async function managedFontFixture() {
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  return { bytes, fontRecord: { id: "mini-006-font", version: sha256.slice(0, 12), sha256, status: "TECHNICALLY_VALID" } };
}

function fontPiece(font, content, heightMm, id) {
  return createManagedFontProductionPiece({
    ...font,
    content,
    widthMm: heightMm,
    heightMm,
    id,
    sourceOrderId: "MINI-006",
    product: "Teamorder",
    association: "A.S.C. Waterwijk",
    foilColor: "Wit",
  });
}

function batch(pieces, orderId = "MINI-006") {
  return createCutJobBatch({
    organizationId: "sport-2000-sportpaleis-bv",
    orderId,
    revision: 1,
    attemptIdPrefix: "mini-006",
    createdAt: "2026-08-14T00:00:00.000Z",
    pieces,
    nesting,
  });
}

test("productie spiegelt standaard, plaatst passende objecten horizontaal en behoudt fysieke verhoudingen", async () => {
  const font = await managedFontFixture();
  const senior = fontPiece(font, "28", 220, "senior-28");
  const initials = fontPiece(font, "SY", 30, "initials-sy");
  assert.equal(senior.productionRule.mirror, true);
  assert.equal(initials.productionRule.mirror, true);
  assert.equal(boundsForContours(senior.contours).height, 220);
  assert.equal(boundsForContours(initials.contours).height, 30);
  const seniorRatio = boundsForContours(senior.contours).width / boundsForContours(senior.contours).height;
  const smallRatio = boundsForContours(fontPiece(font, "28", 30, "small-28").contours).width / 30;
  assert.ok(Math.abs(seniorRatio - smallRatio) < 0.001, "uniforme schaal bewaart de aspectratio");

  const horizontal = batch(["DW", "SY", "28"].map((content, index) => fontPiece(font, content, 30, `horizontal-${index}`))).jobs[0];
  assert.ok(horizontal.productionGeometry.groups.every(({ mirrorApplied }) => mirrorApplied));
  assert.ok(horizontal.productionGeometry.groups.every(({ boundsMm, sourceBoundsMm }) => Math.abs(boundsMm.width - sourceBoundsMm.width) < 0.001 && Math.abs(boundsMm.height - sourceBoundsMm.height) < 0.001));
  assert.equal(new Set(horizontal.productionGeometry.groups.map(({ placementMm }) => placementMm.y)).size, 1, "passende objecten staan in dezelfde horizontale rij");
});

test("UNWANTED OUTER CUT RECTANGLE REMOVED: SVG bevat uitsluitend werkelijke contourpaden", async () => {
  const font = await managedFontFixture();
  const job = batch([fontPiece(font, "28", 30, "svg-28")], "MINI-006-SVG").jobs[0];
  const preview = createProductionPreview(job);
  assert.doesNotMatch(preview.svg, /<rect\b/iu);
  assert.doesNotMatch(preview.svg, /weeding|pelkader|background/iu);
  assert.equal((preview.svg.match(/<path\b/gu) ?? []).length, job.productionGeometry.contours.length);
});

test("Teamorder 1-20 blijft binnen een gemeten, begrensde generatieflow", async () => {
  const font = await managedFontFixture();
  const pieces = Array.from({ length: 20 }, (_, index) => fontPiece(font, String(index + 1), 220, `timing-${index + 1}`));
  const started = performance.now();
  const result = batch(pieces, "MINI-006-TIMING");
  const elapsedMs = performance.now() - started;
  assert.equal(result.jobs[0].productionGeometry.groups.length, 20);
  assert.ok(elapsedMs < 15_000, `1-20 duurde ${elapsedMs.toFixed(1)} ms`);
});

test("Teamorder bewaart default en per-regel Junior/Senior los van kledingmaat", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-mini-006-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const association = (await service.bootstrap(admin.token)).associations.find(({ name }) => name === "A.S.C. Waterwijk");
  assert.ok(association);
  await service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision, juniorValidationStatus: "VALIDATED", juniorPhysicalHeightMm: 180, juniorValidationNote: "Mini-006 regressiefixture met fysieke millimeters" });
  const user = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });

  const seniorDefault = (await service.createOrder(user.token, user.csrfToken, {
    orderKind: "TEAM", customer: "Senior default", customerEmail: "", customerPhone: "", standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-137294", variants: [
      { participantName: "152 blijft Senior", size: "152", quantity: 1, deviation: false, overrides: empty },
      { participantName: "XL wordt Junior", size: "XL", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "11", backNumberSizeClass: "JUNIOR" } },
    ] }],
  }, "mini-006-senior-default")).value;
  assert.deepEqual(seniorDefault.items[0].variants.map(({ size, backNumberProduction }) => [size, backNumberProduction.sizeClass, backNumberProduction.physicalHeightMm]), [["152", "SENIOR", 220], ["XL", "JUNIOR", 180]]);

  const juniorDefault = (await service.createOrder(user.token, user.csrfToken, {
    orderKind: "TEAM", customer: "Junior default", customerEmail: "", customerPhone: "", standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "JUNIOR" },
    items: [{ articleId: "sp-live-137294", variants: [
      { participantName: "XL blijft Junior", size: "XL", quantity: 1, deviation: false, overrides: empty },
      { participantName: "152 wordt Senior", size: "152", quantity: 1, deviation: true, overrides: { ...empty, backNumber: "13", backNumberSizeClass: "SENIOR" } },
    ] }],
  }, "mini-006-junior-default")).value;
  assert.deepEqual(juniorDefault.items[0].variants.map(({ size, backNumberProduction }) => [size, backNumberProduction.sizeClass, backNumberProduction.physicalHeightMm]), [["XL", "JUNIOR", 180], ["152", "SENIOR", 220]]);
});

test("workspace-contract zet CTA boven de lijst en Teamorder faalt gesloten zonder fysieke mm", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const composer = source.slice(source.indexOf("const proposalComposer"), source.indexOf("const activeRows"));
  assert.ok(composer.indexOf("sp-production-proposal-actions") < composer.indexOf("sp-production-proposal-orders"));
  assert.equal((composer.match(/data-action="create-production-proposal"/gu) ?? []).length, 1);
  assert.match(source, /name="teamDefaultClass"/u);
  assert.match(source, /data-team-row-field="backNumberSizeClass"/u);
  assert.match(source, /kledingmaat onafhankelijk/u);
  assert.match(source, /mist een geldige fysieke hoogte in mm/u);
  assert.doesNotMatch(source, /heightMm:\s*row\.heightMm\s*\?\?\s*30/u);
});
