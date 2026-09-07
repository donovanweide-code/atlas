import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createTestMailFoundation } from "./helpers/sportpaleis-delivery-evidence.mjs";

const passwords = { kevin: "Practical-Packing-Admin-2026!", patrick: "Practical-Packing-Operator-2026!", collega: "Practical-Packing-Store-2026!", "donovan-support": "Practical-Packing-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-practical-packing-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PRACTICAL-PEEL-CUT-PACKING-HOTFIX-TEST" });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

const bandBounds = (groups) => ({
  minY: Math.min(...groups.map(({ boundsMm }) => boundsMm.minY)),
  maxY: Math.max(...groups.map(({ boundsMm }) => boundsMm.maxY)),
});

test("gemengde productie groepeert knipvriendelijk en roteert uitsluitend rugnummers 90 graden", async (context) => {
  const { root, store, service, admin } = await fixture(context);
  const stateBefore = await store.read();
  const businessBefore = JSON.stringify({ orders: stateBefore.orders, productionJobs: stateBefore.productionJobs, productionProposals: stateBefore.productionProposals, audit: stateBefore.audit });
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Praktisch pellen en knippen", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Gemengde fixture", size: "", quantity: 5, personalization: "Vijf praktische opdruksoorten", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [
      { id: "fixture-back-name", type: "TEXT", personalizationField: "name", content: "DONOVAN", previewLabel: "Naam DONOVAN", widthMm: 150, heightMm: 30, quantity: 1, sourceId: font.id },
      { id: "fixture-back-number", type: "NUMBER", personalizationField: "backNumber", content: "17", previewLabel: "Rugnummer 17", widthMm: 180, heightMm: 200, quantity: 1, sourceId: font.id },
      { id: "fixture-short-number", type: "NUMBER", personalizationField: "shortsNumber", content: "7", previewLabel: "Shortnummer 7", widthMm: 45, heightMm: 75, quantity: 1, sourceId: font.id },
      { id: "fixture-chest-number", type: "NUMBER", personalizationField: "chestNumber", content: "8", previewLabel: "Borstnummer 8", widthMm: 35, heightMm: 60, quantity: 1, sourceId: font.id },
      { id: "fixture-initials", type: "INITIALS", personalizationField: "initials", content: "DW", previewLabel: "Initialen DW", widthMm: 45, heightMm: 30, quantity: 1, sourceId: font.id },
    ],
  }, "practical-packing-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "practical-packing-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "practical-packing-proposal")).value;
  const group = proposal.groups[0];
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: group.id, orders: group.orders }, "practical-packing-job")).value;
  const physical = job.snapshot.layout.productionGeometry.groups;
  const grouped = Map.groupBy(physical, ({ provenance }) => provenance.nestingSection?.key);
  const expectedSections = ["front-small", "back-names", "small-numbers", "back-numbers"];
  assert.deepEqual([...grouped.keys()], expectedSections);
  assert.deepEqual(grouped.get("front-small").map(({ sourcePieceId }) => [sourcePieceId.includes("fixture-chest-number"), sourcePieceId.includes("fixture-initials")]).sort(), [[false, true], [true, false]]);
  assert.ok(grouped.get("back-names")[0].sourcePieceId.includes("fixture-back-name"));
  assert.ok(grouped.get("small-numbers")[0].sourcePieceId.includes("fixture-short-number"));
  assert.ok(grouped.get("back-numbers")[0].sourcePieceId.includes("fixture-back-number"));

  for (let index = 1; index < expectedSections.length; index += 1) {
    const before = bandBounds(grouped.get(expectedSections[index - 1]));
    const after = bandBounds(grouped.get(expectedSections[index]));
    assert.ok(before.maxY + job.snapshot.layout.minimumGapMm <= after.minY + 0.001, `${expectedSections[index - 1]} en ${expectedSections[index]} missen een rechte vrije knipzone`);
  }

  for (const placed of physical) {
    const isBackNumber = placed.provenance.nestingSection.key === "back-numbers";
    assert.equal(placed.nestingRotationApplied, isBackNumber ? 90 : 0);
    assert.equal(placed.mirrorApplied, job.snapshot.orientation.preMirrored);
    assert.ok(Math.abs(placed.boundsMm.width - (isBackNumber ? placed.sourceBoundsMm.height : placed.sourceBoundsMm.width)) < 0.002);
    assert.ok(Math.abs(placed.boundsMm.height - (isBackNumber ? placed.sourceBoundsMm.width : placed.sourceBoundsMm.height)) < 0.002);
  }
  assert.equal(job.snapshot.scale, 1);
  assert.ok(job.snapshot.layout.usedLengthMm <= job.snapshot.layout.baselineUsedLengthMm);

  const svg = await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8");
  const exportedContourIds = [...svg.matchAll(/<path data-contour-id="([^"]+)"/gu)].map((match) => match[1]);
  assert.equal(exportedContourIds.length, job.snapshot.layout.closedContourCount);
  assert.deepEqual(exportedContourIds.sort(), job.snapshot.layout.productionGeometry.contours.map(({ id }) => id).sort());
  assert.doesNotMatch(svg, /<(?:line|rect|polyline|polygon)\b/iu);
  assert.doesNotMatch(svg, /cut[-_ ]?(?:mark|line)|guide[-_ ]?(?:artwork|line)|#(?:ff69b4|ff00ff|ffc0cb)/iu);

  if (process.env.SPW_PACKING_EVIDENCE_DIR) {
    const evidenceDirectory = path.resolve(process.env.SPW_PACKING_EVIDENCE_DIR);
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(path.join(evidenceDirectory, "practical-packing-after.svg"), svg, { flag: "wx" });
    await writeFile(path.join(evidenceDirectory, "practical-packing-after.json"), `${JSON.stringify({
      svgSha256: createHash("sha256").update(svg).digest("hex"),
      usedWidthMm: job.snapshot.layout.usedWidthMm,
      usedLengthMm: job.snapshot.layout.usedLengthMm,
      baselineUsedLengthMm: job.snapshot.layout.baselineUsedLengthMm,
      placements: physical.map(({ sourcePieceId, nestingRotationApplied, mirrorApplied, boundsMm, provenance }) => ({ sourcePieceId, section: provenance.nestingSection, nestingRotationApplied, mirrorApplied, boundsMm })),
      exportedContourCount: exportedContourIds.length,
      visibleCutGuideCount: 0,
    }, null, 2)}\n`, { flag: "wx" });
  }

  const stateAfter = await store.read();
  assert.equal(stateAfter.productionJobs.length, stateBefore.productionJobs.length + 1);
  assert.equal(stateAfter.productionProposals.length, stateBefore.productionProposals.length + 1);
  assert.notEqual(JSON.stringify({ orders: stateAfter.orders, productionJobs: stateAfter.productionJobs, productionProposals: stateAfter.productionProposals, audit: stateAfter.audit }), businessBefore, "fixture bewijst de normale geïsoleerde productieketen");
});
