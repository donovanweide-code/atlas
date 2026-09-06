import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createCutJobBatch, groupSemanticNumberObjects } from "../src/sportpaleis/direct-print/index.ts";
import { createManagedFontProductionPiece } from "../src/sportpaleis/managed-font-production.mjs";

const passwords = { kevin: "Practice-Admin-2026!", patrick: "Practice-Operator-2026!", collega: "Practice-Store-2026!", "donovan-support": "Practice-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context, withMail = false) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-practice-001-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const captureDirectory = path.join(root, "captures");
  const mailFoundation = withMail ? new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory }) }) : undefined;
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-PRACTICE-CORRECTIONS-001-TEST" });
  await service.initialize();
  return {
    root,
    captureDirectory,
    store,
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
  };
}

async function createIndividual(service, actor, source, key) {
  return (await service.createOrder(actor.token, actor.csrfToken, {
    orderKind: "INDIVIDUAL",
    source,
    ...(source === "STORE" ? {} : { externalReference: `${source}-${key}`, provenance: `Gerichte ${source}-testfixture` }),
    customer: `Klant ${key}`,
    customerEmail: `${key}@example.test`,
    customerPhone: "0612345678",
    standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 1, deviation: false, overrides: empty }],
  }, `practice-${key}`)).value;
}

test("Webshop/Divide faalt server-side gesloten voor alle Winkel-statusmails en ook bij retry", async (context) => {
  const { service, admin, captureDirectory } = await fixture(context, true);
  const winkel = await createIndividual(service, admin, "STORE", "winkel-mail");
  const webshop = await createIndividual(service, admin, "WEBSHOP_XPRT", "webshop-mail");
  const teamSource = await createIndividual(service, admin, "TEAM_MAIL", "team-mail");

  const winkelResult = await service.captureOrderMail(admin.token, admin.csrfToken, winkel.id, { templateKey: "ORDER_READY" }, "winkel-ready-001");
  assert.equal(winkelResult.status, "CAPTURED");
  assert.equal((await service.previewOrderMail(admin.token, teamSource.id, { templateKey: "ORDER_RECEIVED" })).templateKey, "ORDER_RECEIVED");
  assert.equal((await service.previewOrderMail(admin.token, webshop.id, { templateKey: "ORDER_QUESTION", question: "Welke maat klopt?" })).templateKey, "ORDER_QUESTION");

  for (const templateKey of ["ORDER_RECEIVED", "ORDER_IN_PRODUCTION", "ORDER_READY", "ORDER_PICKED_UP"]) {
    await assert.rejects(service.previewOrderMail(admin.token, webshop.id, { templateKey }), (error) => error.code === "WEBSHOP_WINKEL_MAIL_BLOCKED" && error.statusCode === 409);
    await assert.rejects(service.captureOrderMail(admin.token, admin.csrfToken, webshop.id, { templateKey }, `webshop-blocked-${templateKey}`), (error) => error.code === "WEBSHOP_WINKEL_MAIL_BLOCKED");
  }
  await assert.rejects(service.captureOrderMail(admin.token, admin.csrfToken, webshop.id, { templateKey: "ORDER_READY" }, "webshop-blocked-ORDER_READY"), (error) => error.code === "WEBSHOP_WINKEL_MAIL_BLOCKED", "replay met hetzelfde idempotency-key blijft geblokkeerd");
  assert.equal((await service.orderMailHistory(admin.token, webshop.id)).length, 0);
  assert.equal((await readdir(captureDirectory)).length, 1, "alleen de toegestane Winkel-capture bestaat");
});

test("managed-font behoudt brongeometrie en kiest 90° alleen wanneer adaptive nesting baanlengte bespaart", async (context) => {
  const { root, service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const font = state.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Fysieke rugnummergrens", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Rugnummergrens", size: "", quantity: 2, personalization: "180 en 181 mm", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [
      { id: "rug-exact-180", type: "NUMBER", content: "10", previewLabel: "Rugnummer 10", widthMm: 100, heightMm: 180, quantity: 1, sourceId: font.id, provenance: "Grens exact 18 cm" },
      { id: "rug-over-181", type: "NUMBER", content: "11", previewLabel: "Rugnummer 11", widthMm: 100, heightMm: 181, quantity: 1, sourceId: font.id, provenance: "Groter dan 18 cm" },
    ],
  }, "rugnummer-horizontal-boundary-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "rugnummer-horizontal-boundary-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "rugnummer-horizontal-boundary-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "rugnummer-horizontal-boundary-job")).value;
  const exact = job.snapshot.layout.placements.find(({ lineId }) => lineId.includes("rug-exact-180"));
  const over = job.snapshot.layout.placements.find(({ lineId }) => lineId.includes("rug-over-181"));
  for (const placement of [exact, over]) {
    const sourceSides = [placement.sourceWidthMm, placement.sourceHeightMm].sort((a, b) => a - b);
    const placedSides = [placement.widthMm, placement.heightMm].sort((a, b) => a - b);
    assert.ok(sourceSides.every((side, index) => Math.abs(side - placedSides[index]) < 0.001), "de plaatsing blijft een rigide transform zonder schaal/vervorming");
  }
  assert.ok(job.snapshot.layout.usedWidthMm <= job.snapshot.productionGroup.maxSafeTrackWidthMm);
  assert.equal(job.humanAcceptance.status, "PENDING");

  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const fontRecord = { id: "orientation-font", version: "1", sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(), status: "TECHNICALLY_VALID" };
  const practiceEightPiece = createManagedFontProductionPiece({ fontRecord, bytes, content: "8", widthMm: 100, heightMm: 200, id: "practice-eight", sourceOrderId: "test", product: "Rugnummer", association: "Sportpaleis", foilColor: "Wit" });
  const practiceEight = createCutJobBatch({ organizationId: "sportpaleis", orderId: "practice-eight", revision: 1, attemptIdPrefix: "practice-eight", createdAt: "2026-08-20T12:00:00.000Z", pieces: [practiceEightPiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  const placedEight = practiceEight.productionGeometry.groups[0];
  assert.equal(practiceEight.readyForPrinting, true);
  assert.equal(placedEight.nestingRotationApplied, 90, "de praktijk-8 roteert generiek omdat dit aantoonbaar korter is");
  assert.ok(practiceEight.nesting.usedLengthMm < practiceEight.nesting.baselineUsedLengthMm);
  assert.deepEqual([placedEight.sourceBoundsMm.width, placedEight.sourceBoundsMm.height].sort((a, b) => a - b), [placedEight.boundsMm.width, placedEight.boundsMm.height].sort((a, b) => a - b));
  assert.equal(placedEight.mirrorApplied, true);
  context.diagnostic(`practice-8: before=${practiceEight.nesting.baselineUsedLengthMm}mm; after=${practiceEight.nesting.usedLengthMm}mm; saved=${practiceEight.nesting.savedLengthVsBaselineMm}mm; rotation=${placedEight.nestingRotationApplied}°`);
  assert.ok((await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8")).includes("data-contour-id"));
});

test("maximaal veilige 450-mm baan onderzoekt herkenbare rugnummergroepen gezamenlijk", async (context) => {
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  const fontRecord = { id: "track-width-font", version: "1", sha256: hash, status: "TECHNICALLY_VALID" };
  const cases = [{ number: "24", quantity: 1 }, { number: "24", quantity: 2 }, { number: "24", quantity: 3 }, { number: "24", quantity: 4 }, { number: "26", quantity: 2 }, { number: "26", quantity: 4 }, { number: "28", quantity: 3 }, { number: "88", quantity: 2 }];

  for (const fixture of cases) {
    const raw = Array.from({ length: fixture.quantity }, (_, copy) => Array.from(fixture.number).map((digit, digitIndex) => ({
      ...createManagedFontProductionPiece({ fontRecord, bytes, content: digit, widthMm: 100, heightMm: 220, id: `track-${fixture.number}-${copy + 1}-${digitIndex + 1}`, sourceOrderId: `TRACK-${fixture.number}`, product: `Rugnummer ${fixture.number}`, association: "Sportpaleis", foilColor: "Zwart" }),
      semanticGroup: { id: `track-${fixture.number}-copy-${copy + 1}`, kind: "MULTI_DIGIT_NUMBER", sourceLineId: `line-${fixture.number}`, value: fixture.number, digit, digitIndex, digitCount: fixture.number.length, copyIndex: copy + 1, copyCount: fixture.quantity, garmentCompositionSpacingMm: 30 },
      assetIdentity: { assetId: fontRecord.id, assetVersion: fontRecord.version, sourceKind: "MANAGED_FONT", geometryHash: hash },
    }))).flat();
    const pieces = groupSemanticNumberObjects(raw, 6.4);
    const make = (width) => createCutJobBatch({ organizationId: "sportpaleis", orderId: `TRACK-${fixture.number}-${fixture.quantity}`, revision: 1, attemptIdPrefix: `track-${width}-${fixture.number}-${fixture.quantity}`, createdAt: "2026-08-24T12:00:00.000Z", pieces, nesting: { absoluteMaxWidthMm: width, preferredWorkingWidthMm: Math.min(440, width), minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
    const before = make(440);
    const after = make(450);
    const placements = after.productionGeometry.groups;
    const rowCounts = Object.values(placements.reduce((rows, placement) => { const key = placement.placementMm.y.toFixed(3); rows[key] = (rows[key] ?? 0) + 1; return rows; }, {}));
    const groupsPerRow = Math.max(...rowCounts);
    const saving = Number((before.nesting.usedLengthMm - after.nesting.usedLengthMm).toFixed(3));
    assert.equal(placements.length, fixture.quantity);
    assert.ok(after.productionGeometry.boundsMm.width <= 450 + 0.000001);
    assert.ok(placements.every(({ provenance, physicalMembers, mirrorApplied }) => provenance.semanticGroup.value === fixture.number && physicalMembers.map(({ digit }) => digit).join("") === fixture.number && mirrorApplied));
    assert.ok(placements.every(({ sourceBoundsMm, boundsMm }) => [sourceBoundsMm.width, sourceBoundsMm.height].sort((a, b) => a - b).every((side, index) => Math.abs(side - [boundsMm.width, boundsMm.height].sort((a, b) => a - b)[index]) < 0.001)));
    if (fixture.quantity >= 2) assert.ok(after.nesting.usedLengthMm < before.nesting.usedLengthMm, `${fixture.quantity}×${fixture.number} moet op de veilige 450-mm baan korter zijn`);
    if (fixture.number === "24" && fixture.quantity >= 2) assert.equal(groupsPerRow, 2, `${fixture.quantity}×24 gebruikt twee herkenbare groepen naast elkaar`);
    if (fixture.number === "26" && fixture.quantity === 4) assert.equal(groupsPerRow, 2, "4×26 gebruikt een 2+2-layout");
    context.diagnostic(`${fixture.quantity}×${fixture.number}: group=${placements[0].sourceBoundsMm.width.toFixed(3)}×${placements[0].sourceBoundsMm.height.toFixed(3)}mm; rotations=${placements.map(({ nestingRotationApplied }) => nestingRotationApplied).join(",")}; groupsPerRow=${groupsPerRow}; totalWidth=${after.nesting.usedWidthMm}mm; before=${before.nesting.usedLengthMm}mm; after=${after.nesting.usedLengthMm}mm; saved=${saving}mm (${Number((saving / before.nesting.usedLengthMm * 100).toFixed(2))}%)`);
  }
});

test("production-shaped PLOT-2026-0058: 4×26 blijft semantisch intact en nest als vier herkenbare fysieke sets", async (context) => {
  const { service, admin } = await fixture(context);
  const order = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "A.S.C. Waterwijk · production-shaped PLOT-2026-0058",
    customerEmail: "",
    customerPhone: "",
    standardPersonalization: { ...empty, backNumber: "26", backNumberSizeClass: "SENIOR" },
    items: [{ articleId: "sp-live-137294", size: "L", quantity: 4, deviation: false, overrides: empty }],
  }, "plot-2026-0058-production-shaped-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, order.revision, "plot-2026-0058-production-shaped-control")).value;
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ id }) => id === controlled.productionLines[0].source.id);
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "plot-2026-0058-production-shaped-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: proposal.groups[0].id, orders: proposal.groups[0].orders }, "plot-2026-0058-production-shaped-job")).value;

  const placements = job.snapshot.layout.placements;
  assert.equal(controlled.productionLines[0].content, "26", "de semantische orderbedrukking blijft rugnummer 26");
  assert.equal(controlled.productionLines[0].quantity, 4, "de semantische quantity blijft vier");
  assert.equal(placements.length, 4, "de fysieke job bevat vier herkenbare 26-sets");
  assert.deepEqual([...new Set(placements.map(({ semanticGroup }) => semanticGroup.copyIndex))].sort(), [1, 2, 3, 4]);
  for (const copyIndex of [1, 2, 3, 4]) {
    const copy = placements.filter(({ semanticGroup }) => semanticGroup.copyIndex === copyIndex);
    assert.equal(copy.length, 1);
    assert.equal(copy[0].semanticGroup.value, "26");
    assert.equal(copy[0].semanticGroup.copyCount, 4);
    assert.equal(copy[0].semanticGroup.garmentCompositionSpacingMm, 5);
    assert.deepEqual(copy[0].physicalMembers.map(({ digit }) => digit), ["2", "6"]);
    assert.deepEqual(copy[0].physicalMembers.map(({ digitIndex }) => digitIndex), [0, 1]);
  }
  assert.ok(placements.every(({ nestingRotationApplied }) => [0, 90].includes(nestingRotationApplied)));
  assert.ok(placements.every(({ mirrorApplied }) => mirrorApplied));
  assert.ok(placements.flatMap(({ physicalMembers }) => physicalMembers).every(({ assetIdentity }) => assetIdentity?.sourceKind === "MANAGED_FONT" && assetIdentity.assetId === font.id && assetIdentity.assetVersion === font.version && assetIdentity.geometryHash === font.sha256));
  for (const digit of ["2", "6"]) {
    const instances = placements.flatMap(({ physicalMembers }) => physicalMembers).filter((member) => member.digit === digit);
    const sourceDimensions = new Set(instances.map(({ boundsMm }) => `${boundsMm.width.toFixed(6)}x${boundsMm.height.toFixed(6)}`));
    assert.equal(sourceDimensions.size, 1, `alle ${digit}-instanties gebruiken exact dezelfde versioned brongeometrie`);
    assert.ok(instances.every(({ mirrorApplied, rotationApplied }) => mirrorApplied && [0, 90].includes(rotationApplied)));
  }

  const before = { widthMm: 248, lengthMm: 909.2 };
  const after = { widthMm: job.snapshot.layout.usedWidthMm, lengthMm: job.snapshot.layout.usedLengthMm };
  const savingMm = Number((before.lengthMm - after.lengthMm).toFixed(2));
  const savingPercent = Number(((savingMm / before.lengthMm) * 100).toFixed(2));
  context.diagnostic(`4×26 candidate groups: ${placements.map(({ widthMm, heightMm, nestingRotationApplied }) => `${widthMm}×${heightMm} r${nestingRotationApplied}`).join(" | ")}; used=${after.widthMm}×${after.lengthMm}`);
  assert.ok(after.lengthMm < before.lengthMm, `de veilige 450-mm baan moet de herkenbare 26-sets aantoonbaar compacter nesten (${after.lengthMm} < ${before.lengthMm})`);
  assert.ok(savingMm > 0 && savingPercent > 0);
  assert.equal(job.snapshot.layout.configuredWidthMm, 440);
  assert.equal(new Set(placements.map(({ nestingRotationApplied }) => nestingRotationApplied)).size, 1, "alle vier occurrences gebruiken dezelfde deterministische veilige oriëntatie");
  assert.equal(new Set(placements.map(({ yMm }) => yMm)).size, 2, "4×26 gebruikt een 2+2-layout");

  const history = (await service.bootstrap(admin.token)).productionJobs.find(({ id }) => id === job.id);
  assert.deepEqual(history.snapshot.layout.placements, job.snapshot.layout.placements, "Historie bewaart alle vier sets en acht fysieke digitposities/rotaties immutable");
  assert.equal(history.snapshot.productionLines[0].content, "26");
  assert.equal(history.snapshot.productionLines[0].quantity, 4);
  const replot = (await service.replotProductionJob(admin.token, admin.csrfToken, job.id, { reason: "Exacte production-shaped 4×26 reprintregressie" }, "plot-2026-0058-production-shaped-replot")).value;
  assert.equal(replot.originJobId, job.id);
  assert.equal(replot.snapshotHash, job.snapshotHash);
  assert.deepEqual(replot.snapshot.layout, job.snapshot.layout, "reprint hergebruikt exact de oorspronkelijke fysieke layout");
  assert.equal(replot.snapshot.artifact.sha256, job.snapshot.artifact.sha256);

  context.diagnostic(`PLOT-2026-0058 / SP-2026-0081 · before=${before.widthMm}×${before.lengthMm}mm; after=${after.widthMm}×${after.lengthMm}mm; saved=${savingMm}mm (${savingPercent}%); sets=${placements.length}; digits=${placements.flatMap(({ physicalMembers }) => physicalMembers.map(({ digit }) => digit)).join(",")}; rotations=${placements.map(({ nestingRotationApplied }) => nestingRotationApplied).join(",")}`);
  context.diagnostic(`PLOT-2026-0058 physical groups: ${placements.map(({ semanticGroup, xMm, yMm, widthMm, heightMm, nestingRotationApplied, physicalMembers }) => `${semanticGroup.copyIndex}:${semanticGroup.value}@${xMm},${yMm} ${widthMm}×${heightMm} r${nestingRotationApplied} [${physicalMembers.map(({ digit }) => digit).join("")}]`).join(" | ")}`);
});

async function controlledCustomOrder(service, actor, fontId, source, key) {
  const created = (await service.createOrder(actor.token, actor.csrfToken, {
    orderKind: "CUSTOM", source, ...(source === "STORE" ? {} : { externalReference: `${source}-${key}`, provenance: `${source} productiefixture` }),
    customer: `Productie ${key}`, customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "Kanaaltest", size: "", quantity: 1, personalization: "AA", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: `line-${key}`, type: "INITIALS", content: "AA", previewLabel: "Initialen AA", widthMm: 50, heightMm: 30, quantity: 1, sourceId: fontId, provenance: "Kanaal- en sequentietest" }],
  }, `sequence-${key}`)).value;
  return (await service.advanceOrder(actor.token, actor.csrfToken, created.id, created.revision, `sequence-${key}-control`)).value;
}

test("Winkel en Webshop blijven aparte groepen; de medewerker kiest en daarna blijft precies één stap actief", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const winkel = await controlledCustomOrder(service, admin, font.id, "STORE", "winkel");
  const webshop = await controlledCustomOrder(service, admin, font.id, "WEBSHOP_XPRT", "webshop");
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [winkel, webshop].map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "sequence-channel-proposal")).value;
  assert.equal(proposal.groups.length, 2);
  assert.deepEqual(proposal.groups.map(({ sourceChannel }) => sourceChannel), ["STORE", "WEBSHOP_XPRT"]);
  assert.ok(proposal.groups.every(({ productionLineRefs }) => productionLineRefs.length === 1));

  const jobsBefore = (await service.bootstrap(admin.token)).productionJobs.length;
  const [current, later] = proposal.groups;
  const concurrent = await Promise.allSettled([
    service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: current.id, orders: current.orders }, "sequence-current-job"),
    service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: later.id, orders: later.orders }, "sequence-later-concurrent-job"),
  ]);
  assert.equal(concurrent.filter(({ status }) => status === "fulfilled").length, 1, "gelijktijdige STORE/WEBSHOP-keuzes leveren exact één job");
  assert.equal(concurrent.filter(({ status, reason }) => status === "rejected" && reason?.code === "PRODUCTION_PHYSICAL_STEP_CONFLICT").length, 1, "de verliezende kleurstap faalt fysiek gesloten");
  const firstJob = concurrent.find(({ status }) => status === "fulfilled").value.value;
  assert.equal(firstJob.humanAcceptance.status, "PENDING");
  const firstGroup = proposal.groups.find(({ id }) => id === firstJob.snapshot.productionGroup.id);
  const secondGroup = proposal.groups.find(({ id }) => id !== firstGroup.id);
  const afterRace = await service.bootstrap(operator.token);
  assert.equal(afterRace.productionJobs.length, jobsBefore + 1);
  assert.equal(afterRace.productionJobs.filter(({ id }) => id === firstJob.id).length, 1);
  assert.equal(afterRace.productionProposals.find(({ id }) => id === proposal.id).groups.filter(({ productionJobId }) => Boolean(productionJobId)).length, 1);
  await service.completeProductionJob(admin.token, admin.csrfToken, firstJob.id, "sequence-current-complete");

  const shared = await service.bootstrap(operator.token);
  const saved = shared.productionProposals.find(({ id }) => id === proposal.id);
  assert.equal(saved.groups.find(({ id }) => id === firstGroup.id).productionJobId, firstJob.id);
  assert.equal(shared.productionJobs.find(({ id }) => id === firstJob.id).status, "COMPLETED");
  assert.equal(saved.groups.find(({ id }) => id === secondGroup.id).status, "OPEN");
  const savedSecond = saved.groups.find(({ id }) => id === secondGroup.id);
  const secondJob = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: savedSecond.id, orders: savedSecond.orders }, "sequence-next-job")).value;
  assert.notEqual(secondJob.id, firstJob.id);
  assert.equal(secondJob.snapshot.productionGroup.sourceChannel, secondGroup.sourceChannel);
  assert.equal(secondJob.humanAcceptance.status, "PENDING");
});

test("productie-UX toont één huidige stap, daarna-context en geen Webshop-Winkel-mailactie", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(workspace, /Nu produceren:/u);
  assert.match(workspace, /Daarna:/u);
  assert.match(workspace, />Start huidige stap</u);
  assert.match(workspace, /physical\.activeGroupIds\.has\(group\.id\)\) return "CURRENT"/u);
  assert.match(workspace, /if \(physical\.activeColors\.size\)[^]*return "LATER"/u);
  assert.match(workspace, /Webshopcommunicatie blijft gescheiden/u);
  assert.doesNotMatch(workspace, /REQUESTED_HEIGHT_AXIS_HORIZONTAL/u, "de fysieke implementatieterm lekt niet naar medewerker-UX");
  assert.match(css, /@media\(max-width:760px\)/u);
  assert.match(css, /\.sp-proposal-groups\{grid-template-columns:1fr\}/u);
  assert.match(workspace, /Rugnummer \$\{placement\.semanticGroup\.value\}/u);
  assert.match(workspace, /herkenbare set \$\{placement\.semanticGroup\.copyIndex/u);
  assert.match(workspace, /placement\.physicalMembers\.map/u);
});
