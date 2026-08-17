import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createCutJobBatch } from "../src/sportpaleis/direct-print/cut-job.ts";
import { boundsForContours, signedAreaMm2, validateGeometry } from "../src/sportpaleis/direct-print/geometry.ts";
import { createProductionPreview } from "../src/sportpaleis/direct-print/preview.ts";
import { createManagedFontProductionPiece, normalizeAndValidateManagedFontContours } from "../src/sportpaleis/managed-font-production.mjs";

const nesting = { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 };
const incidentContour = {
  id: "SP-2026-0032-item-0d56b4d337c0-34-1-g2-c1",
  closed: true,
  points: [
    { x: 238, y: 119.15 },
    { x: 238, y: 155.775 },
    { x: 224.2, y: 155.775 },
    { x: 224.2, y: 220 },
    { x: 187.575, y: 220 },
    { x: 187.575, y: 155.775 },
    { x: 127.85, y: 155.775 },
    { x: 127.85, y: 119.15 },
    { x: 127.85, y: 119.15 },
    { x: 187.575, y: 0 },
    { x: 224.2, y: 0 },
    { x: 224.2, y: 119.15 },
    { x: 238, y: 119.15 },
  ],
};

test("SP-2026-0032: redundant Schluber-ankerpunt reproduceert de oude false SELF_INTERSECTION en normaliseert vormvast", () => {
  const before = validateGeometry([incidentContour]);
  assert.equal(before.valid, false);
  assert.deepEqual([...new Set(before.issues.map(({ code }) => code))], ["SELF_INTERSECTION"]);

  const [normalized] = normalizeAndValidateManagedFontContours([incidentContour]);
  assert.equal(normalized.points.length, incidentContour.points.length - 1);
  assert.deepEqual(boundsForContours([normalized]), boundsForContours([incidentContour]));
  assert.equal(signedAreaMm2(normalized.points), signedAreaMm2(incidentContour.points));
  assert.deepEqual(validateGeometry([normalized]), { valid: true, issues: [] });

  const batch = createCutJobBatch({
    organizationId: "sport-2000-sportpaleis-bv",
    orderId: "SP-2026-0032",
    revision: 1,
    attemptIdPrefix: "geometry-closeout",
    createdAt: "2026-08-17T08:20:27.000Z",
    pieces: [{
      id: "SP-2026-0032-34",
      label: "34",
      sourceOrderId: "SP-2026-0032",
      product: "ASC Waterwijk WEDSTRIJD SHIRT SELECTIE",
      association: "A.S.C. Waterwijk",
      printType: "Beheerd productiefont",
      requestedPhysicalSizeMm: { widthMm: 110.15, heightMm: 220 },
      vectorProfile: "font-ccc8d08e11658efe@CCC8D08E1165",
      material: { code: "foil-wit", foilColor: "Wit" },
      contours: [normalized],
      productionRule: { mirror: true, rotation: 0, allowedNestingRotations: [0] },
    }],
    nesting,
  });
  assert.equal(batch.jobs.length, 1);
  assert.equal(batch.jobs[0].readyForPrinting, true);
});

test("werkelijk zelfkruisende beheerde-fontcontour blijft productiegericht fail-closed", () => {
  const crossing = { id: "real-crossing", closed: true, points: [{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 20, y: 0 }, { x: 0, y: 0 }] };
  assert.throws(
    () => normalizeAndValidateManagedFontContours([crossing]),
    (error) => error.statusCode === 409
      && error.code === "PRODUCTION_FONT_GEOMETRY_INVALID"
      && error.message === "Dit productievoorstel kan nog niet worden voorbereid. Controleer de productiegegevens."
      && !/Workspace-service is tijdelijk niet beschikbaar/u.test(error.message),
  );
});

test("geometriefout laat geen half voorstel, PlotJob of state-mutatie achter", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "spw-geometry-closeout-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: { kevin: "Geometry-Kevin-001!", patrick: "Geometry-Patrick-001!", collega: "Geometry-Store-001!", "donovan-support": "Geometry-Support-001!" },
  });
  await store.initialize();
  const before = await store.read();
  const crossing = { id: "real-crossing", closed: true, points: [{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 20, y: 0 }, { x: 0, y: 0 }] };

  await assert.rejects(store.mutate(async (state) => {
    state.productionProposals.unshift({ id: "must-rollback-proposal" });
    state.productionJobs.unshift({ id: "must-rollback-job" });
    normalizeAndValidateManagedFontContours([crossing]);
    return { state, value: null };
  }), (error) => error.code === "PRODUCTION_FONT_GEOMETRY_INVALID");

  assert.deepEqual(await store.read(), before);
  assert.equal((await store.read()).productionProposals.some(({ id }) => id === "must-rollback-proposal"), false);
  assert.equal((await store.read()).productionJobs.some(({ id }) => id === "must-rollback-job"), false);
});

test("bestaande geldige fontproductie behoudt exact dezelfde contour- en SVG-output", async () => {
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const sha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  const piece = createManagedFontProductionPiece({
    fontRecord: { id: "bundled", version: sha256.slice(0, 12), sha256, status: "TECHNICALLY_VALID" },
    bytes,
    content: "28",
    widthMm: 30,
    heightMm: 30,
    id: "golden-control",
    sourceOrderId: "GOLDEN-CONTROL",
    product: "Golden control",
    association: "Test",
    foilColor: "Wit",
  });
  const batch = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId: "GOLDEN-CONTROL", revision: 1, attemptIdPrefix: "golden-control", createdAt: "2026-08-17T00:00:00.000Z", pieces: [piece], nesting });
  const svg = createProductionPreview(batch.jobs[0]).svg;
  assert.equal(piece.contours.reduce((sum, contour) => sum + contour.points.length, 0), 370);
  assert.equal(batch.jobs[0].contentHash, "648ed133ecbe824229ee0d85aa60ceaafec9e614e0c39f910c71afb55c524753");
  assert.equal(createHash("sha256").update(svg).digest("hex").toUpperCase(), "3184A91087B47295CA7561C697B0E7D9CE239F85B437BB0FD9FA50E2A8354B3C");
});
