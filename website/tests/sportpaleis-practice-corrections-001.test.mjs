import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { createCutJobBatch } from "../src/sportpaleis/direct-print/index.ts";
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

test("managed-font Rugnummer groter dan 18 cm legt de fysieke hoogte-as horizontaal; exact 18 cm blijft ongewijzigd", async (context) => {
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
  assert.ok(Math.abs(exact.heightMm - 180) < 0.03, "exact 18 cm behoudt de aangevraagde fysieke hoogte");
  assert.ok(Math.abs(over.widthMm - 181) < 0.03, `>18 cm legt de aangevraagde fysieke hoogte-as langs de horizontale X-as: ${JSON.stringify(over)}`);
  assert.ok(job.snapshot.layout.usedWidthMm <= job.snapshot.productionGroup.workingWidthMm);
  assert.equal(job.humanAcceptance.status, "PENDING");

  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const fontRecord = { id: "orientation-font", version: "1", sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(), status: "TECHNICALLY_VALID" };
  const smallerPiece = createManagedFontProductionPiece({ fontRecord, bytes, content: "8", widthMm: 100, heightMm: 179, id: "physical-smaller", sourceOrderId: "test", product: "Rugnummer", association: "Sportpaleis", foilColor: "Wit" });
  const smaller = createCutJobBatch({ organizationId: "sportpaleis", orderId: "physical-smaller", revision: 1, attemptIdPrefix: "smaller", createdAt: "2026-08-20T12:00:00.000Z", pieces: [smallerPiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  const sourcePiece = createManagedFontProductionPiece({ fontRecord, bytes, content: "10", widthMm: 100, heightMm: 180, id: "physical-source", sourceOrderId: "test", product: "Rugnummer", association: "Sportpaleis", foilColor: "Wit" });
  const source = createCutJobBatch({ organizationId: "sportpaleis", orderId: "physical-source", revision: 1, attemptIdPrefix: "source", createdAt: "2026-08-20T12:00:00.000Z", pieces: [sourcePiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  const piece = createManagedFontProductionPiece({ fontRecord, bytes, content: "8", widthMm: 100, heightMm: 181, id: "physical-horizontal", sourceOrderId: "test", product: "Rugnummer", association: "Sportpaleis", foilColor: "Wit", requestedHeightAxis: "REQUESTED_HEIGHT_AXIS_HORIZONTAL" });
  const direct = createCutJobBatch({ organizationId: "sportpaleis", orderId: "physical-horizontal", revision: 1, attemptIdPrefix: "horizontal", createdAt: "2026-08-20T12:00:00.000Z", pieces: [piece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  assert.equal(direct.readyForPrinting, true);
  assert.equal(smaller.productionGeometry.groups[0].rotationApplied, 0, "kleiner dan 18 cm behoudt de bronas");
  assert.ok(Math.abs(smaller.productionGeometry.groups[0].boundsMm.height - 179) < 0.03);
  assert.equal(source.productionGeometry.groups[0].rotationApplied, 0, "exact 18 cm behoudt de bronas");
  assert.equal(direct.productionGeometry.groups[0].mirrorApplied, true);
  assert.ok(direct.productionGeometry.groups[0].boundsMm.width > direct.productionGeometry.groups[0].boundsMm.height);
  const secondPiece = createManagedFontProductionPiece({ fontRecord, bytes, content: "9", widthMm: 100, heightMm: 181, id: "physical-horizontal-2", sourceOrderId: "test-2", product: "Rugnummer", association: "Sportpaleis", foilColor: "Wit", requestedHeightAxis: "REQUESTED_HEIGHT_AXIS_HORIZONTAL" });
  const sideBySide = createCutJobBatch({ organizationId: "sportpaleis", orderId: "physical-horizontal-pair", revision: 1, attemptIdPrefix: "horizontal-pair", createdAt: "2026-08-20T12:00:00.000Z", pieces: [piece, secondPiece], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } }).jobs[0];
  assert.equal(sideBySide.productionGeometry.groups.length, 2);
  assert.equal(sideBySide.productionGeometry.groups[0].placementMm.y, sideBySide.productionGeometry.groups[1].placementMm.y, "twee volledige horizontale Rugnummergroepen passen naast elkaar op de actieve baan");
  assert.ok(sideBySide.nesting.usedWidthMm <= 440);
  assert.equal(sideBySide.nesting.scaleApplied, 1);
  assert.ok((await readFile(path.join(root, "runtime", job.snapshot.artifact.path), "utf8")).includes("data-contour-id"));
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

test("Winkel en Webshop blijven aparte groepen en precies één volgende stap is server-side uitvoerbaar", async (context) => {
  const { service, admin, operator } = await fixture(context);
  const font = (await service.bootstrap(admin.token)).productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const winkel = await controlledCustomOrder(service, admin, font.id, "STORE", "winkel");
  const webshop = await controlledCustomOrder(service, admin, font.id, "WEBSHOP_XPRT", "webshop");
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [winkel, webshop].map(({ id, revision }) => ({ id, expectedRevision: revision })) }, "sequence-channel-proposal")).value;
  assert.equal(proposal.groups.length, 2);
  assert.deepEqual(proposal.groups.map(({ sourceChannel }) => sourceChannel), ["STORE", "WEBSHOP_XPRT"]);
  assert.ok(proposal.groups.every(({ productionLineRefs }) => productionLineRefs.length === 1));

  const [current, later] = proposal.groups;
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: later.id, orders: later.orders }, "sequence-later-too-early"), (error) => error.code === "PRODUCTION_GROUP_OUT_OF_SEQUENCE");
  const firstJob = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: current.id, orders: current.orders }, "sequence-current-job")).value;
  assert.equal(firstJob.humanAcceptance.status, "PENDING");
  await assert.rejects(service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, proposalGroupId: later.id, orders: later.orders }, "sequence-later-while-human-go-pending"), (error) => error.code === "PRODUCTION_GROUP_OUT_OF_SEQUENCE");
  await service.completeProductionJob(admin.token, admin.csrfToken, firstJob.id, "sequence-current-complete");

  const shared = await service.bootstrap(operator.token);
  const saved = shared.productionProposals.find(({ id }) => id === proposal.id);
  assert.equal(saved.groups[0].productionJobId, firstJob.id);
  assert.equal(shared.productionJobs.find(({ id }) => id === firstJob.id).status, "COMPLETED");
  assert.equal(saved.groups[1].status, "OPEN");
  const secondJob = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: saved.groups[1].id, orders: saved.groups[1].orders }, "sequence-next-job")).value;
  assert.notEqual(secondJob.id, firstJob.id);
  assert.equal(secondJob.snapshot.productionGroup.sourceChannel, "WEBSHOP_XPRT");
  assert.equal(secondJob.humanAcceptance.status, "PENDING");
});

test("productie-UX toont één huidige stap, daarna-context en geen Webshop-Winkel-mailactie", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(workspace, /Nu produceren:/u);
  assert.match(workspace, /Daarna:/u);
  assert.match(workspace, />Start huidige stap</u);
  assert.match(workspace, /proposalGroupSequenceState\(state, groups, id\) === "CURRENT"/u);
  assert.match(workspace, /Webshopcommunicatie blijft gescheiden/u);
  assert.doesNotMatch(workspace, /REQUESTED_HEIGHT_AXIS_HORIZONTAL/u, "de fysieke implementatieterm lekt niet naar medewerker-UX");
  assert.match(css, /@media\(max-width:760px\)/u);
  assert.match(css, /\.sp-proposal-groups\{grid-template-columns:1fr\}/u);
});
