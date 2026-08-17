import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Freeze-Kevin-2026!", patrick: "Freeze-Patrick-2026!", collega: "Freeze-Store-2026!", "donovan-support": "Freeze-Support-2026!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-freeze-012-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, releaseId: "SPW-FUNCTIONAL-PILOT-FREEZE-READY-001-20260811", allowedOrigin: "http://127.0.0.1", demoMode: true, uploadsEnabled: true, fontUploadsEnabled: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

const emptyPersonalization = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

test("Functional pilot freeze 012 — one production-line core, exact font source and immutable PlotJob", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);
  const initial = await store.read();
  const goldenBefore = structuredClone(initial.productionJobs.filter(({ id }) => id.includes("golden")));
  const font = initial.productionFonts[0];

  await context.test("winkel ziet een toegestane echte fontbron maar geen logo-library of jobhistorie", async () => {
    const view = await service.bootstrap(storeUser.token);
    assert.equal(view.schemaVersion, 12);
    assert.equal(view.releaseId, "SPW-FUNCTIONAL-PILOT-FREEZE-READY-001-20260811");
    assert.equal(view.productionFonts.length, 1);
    assert.equal(view.productionFonts[0].sha256, "F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F");
    assert.equal(view.productionFonts[0].sourceDataBase64, undefined);
    assert.equal(view.productionElements.length, 0);
    assert.equal(view.productionJobs.length, 0);
    const source = await service.productionFontSource(storeUser.token, font.id);
    assert.equal(source.redirect, "/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf");
  });

  let freeOrder;
  await context.test("vrije bedrukking bewaart dezelfde font-ID, versie en hash en weigert logo aan de kassa", async () => {
    const payload = {
      orderKind: "CUSTOM", customer: "Fictieve klant", customerEmail: "fictief@example.test", customerPhone: "0612345678", standardPersonalization: emptyPersonalization,
      items: [{ product: "Eigen Ajax-shirt", size: "M", quantity: 2, personalization: "DONOVAN ×2", deviation: true, overrides: emptyPersonalization }],
      productionLines: [{ id: "free-line-001", type: "TEXT", content: "DONOVAN", sourceId: font.id, widthMm: 180, heightMm: 30, quantity: 2, previewLabel: "DONOVAN", provenance: "Test · winkel" }],
    };
    freeOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, payload, "freeze-free-001")).value;
    assert.equal(freeOrder.association, "Vrije bedrukking");
    assert.equal(freeOrder.productionLines.length, 1);
    assert.deepEqual(freeOrder.productionLines[0].source, { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 });
    assert.equal(freeOrder.productionLines[0].preview.kind, "LIVE_FONT");
    assert.equal(freeOrder.productionLines[0].validation.status, "VALID");
    await assert.rejects(service.createOrder(storeUser.token, storeUser.csrfToken, { ...payload, productionLines: [{ ...payload.productionLines[0], id: "logo-line", type: "LOGO", sourceId: "missing" }] }, "freeze-store-logo"), (error) => error.code === "STORE_LOGO_FORBIDDEN");
  });

  await context.test("alleen bevoegde rollen beheren fonts en technische validatie verhindert naamfallback", async () => {
    const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
    await assert.rejects(service.addProductionFont(storeUser.token, storeUser.csrfToken, { name: "Niet toegestaan", filename: "font.ttf", dataBase64: bytes.toString("base64"), provenance: "test" }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(service.addProductionFont(operator.token, operator.csrfToken, { name: "Niet toegestaan", filename: "LiberationSans-Regular.ttf", dataBase64: bytes.toString("base64"), provenance: "test" }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, { name: "Alleen een naam", filename: "fake.ttf", dataBase64: Buffer.from("geen font").toString("base64"), provenance: "test" }), (error) => error.code === "FONT_FILE_INVALID" || error.code === "FONT_SIGNATURE_INVALID");
    const duplicate = await service.addProductionFont(admin.token, admin.csrfToken, { name: "Zelfde bron", filename: "LiberationSans-Regular.ttf", dataBase64: bytes.toString("base64"), provenance: "Open bron", allowedInStore: true });
    assert.equal(duplicate.id, font.id);
    assert.equal((await store.read()).productionFonts.length, 1);
  });

  await context.test("logo-/beeldmerkbronnen blijven gelaagd, aspect-locked en zonder stil rasterbewijs", async () => {
    const visual = Buffer.from("89504e470d0a1a0a", "hex").toString("base64");
    const element = await service.upsertProductionElement(operator.token, operator.csrfToken, {
      name: "Fictief sponsorlogo", ownerType: "SPONSOR", ownerName: "Fictieve sponsor", sourceAsset: "Human aangeleverde visuele referentie", sourceStatus: "AVAILABLE",
      sourceLayers: { visualSource: { filename: "logo.png", mimeType: "image/png", dataBase64: visual } },
      variants: [{ id: "sponsor-wit", label: "Wit", widthMm: 100, heightMm: 50, productionMode: "INTERNAL_PLOT", currentStock: null, minimumStock: null, targetStock: null }],
    });
    assert.ok(element.sourceLayers.visualSource.sha256);
    assert.equal(element.sourceLayers.vectorSource, null);
    assert.equal(element.sourceLayers.validatedCutContour, null);
    await assert.rejects(service.upsertProductionElement(operator.token, operator.csrfToken, { ...element, expectedRevision: element.revision, sourceLayers: { validatedCutContour: { sourceId: "contour", version: "1", sha256: "A".repeat(64) } } }), (error) => error.code === "PRODUCTION_PROOF_AUTHORITY_REQUIRED");
    const validated = await service.upsertProductionElement(admin.token, admin.csrfToken, { ...element, expectedRevision: element.revision, proofAuthority: "HUMAN_ACCEPTANCE", sourceLayers: { validatedCutContour: { sourceId: "contour-fictief-sponsor", version: "HA-001", sha256: "A".repeat(64) } } });
    const payload = {
      orderKind: "TEAM", customer: "Fictief team", customerEmail: "team@example.test", customerPhone: "0612345678", standardPersonalization: emptyPersonalization,
      items: [{ product: "Teamproductie · logo", association: "A.S.C. Waterwijk", size: "N.v.t.", quantity: 2, personalization: "Sponsorlogo ×2", deviation: true, overrides: emptyPersonalization }],
      productionLines: [{ type: "LOGO", content: "Fictief sponsorlogo", sourceId: validated.id, widthMm: 120, heightMm: 60, quantity: 2, provenance: "Teamorder · Human Acceptance-bron" }],
    };
    await assert.rejects(service.createOrder(operator.token, operator.csrfToken, { ...payload, productionLines: [{ ...payload.productionLines[0], widthMm: 120, heightMm: 50 }] }, "freeze-logo-ratio"), (error) => error.code === "LOGO_ASPECT_RATIO_INVALID");
    const order = (await service.createOrder(operator.token, operator.csrfToken, payload, "freeze-logo-valid")).value;
    assert.equal(order.productionLines[0].proofStatus, "GEOMETRY_VALIDATED");
    assert.equal(order.productionLines[0].preview.aspectRatioLocked, true);
    assert.equal(order.productionLines[0].validation.status, "VALID");
  });

  await context.test("Human GO gebruikt de exacte beheerde fontbron voor een werkelijk vectorartefact en wijzigt Golden evidence niet", async () => {
    const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, freeOrder.id, freeOrder.revision, "freeze-to-control")).value;
    assert.equal(controlled.stage, "CONTROL");
    await assert.rejects(service.createProductionJob(storeUser.token, storeUser.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "freeze-store-job"), (error) => error.code === "FORBIDDEN");
    const job = (await service.createProductionJob(operator.token, operator.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "freeze-human-go-001")).value;
    assert.equal(job.snapshot.artifact.format, "SVG");
    assert.deepEqual(job.snapshot.fontSources, [{ id: font.id, name: font.name, version: font.version, sha256: font.sha256, originalFilename: font.originalFilename }]);
    assert.deepEqual(job.snapshot.productionLines[0].source, { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 });
    assert.equal((await store.read()).orders.find(({ id }) => id === freeOrder.id).stage, "PRINT");
    assert.deepEqual((await store.read()).productionJobs.filter(({ id }) => id.includes("golden")), goldenBefore);
  });

  await context.test("replot blijft een nieuwe uitvoering vanuit een bestaande Golden immutable snapshot", async () => {
    const state = await store.read(); const original = state.productionJobs.find(({ id }) => id === "production-job-golden-batch-001-auto-mirror-ab");
    const replot = (await service.replotProductionJob(admin.token, admin.csrfToken, original.id, { reason: "Folie beschadigd" }, "freeze-replot-001")).value;
    assert.equal(replot.originJobId, original.id);
    assert.equal(replot.snapshotHash, original.snapshotHash);
    assert.deepEqual(replot.snapshot, original.snapshot);
    assert.equal(replot.humanAcceptance.status, "PENDING");
  });
});

test("Functional pilot freeze UX is context-first, preview-safe and responsive", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(source, />Bedrukken</);
  assert.match(source, /Vrije opdruk/);
  assert.match(source, /<summary>Technische details<\/summary>/);
  assert.match(source, /new FontFace/);
  assert.match(source, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source, /data-managed-font-ids/);
  assert.match(source, /\["PRODUCTION_SOURCE", "FONT"\]/);
  assert.match(source, /data-font-ready="false"/);
  assert.match(source, /data-action="confirm-production-proposal"[^]*?>Produceren/);
  assert.match(source, /<summary>Technische productie-instellingen<\/summary>/i);
  assert.match(source, /minimumGapMm/);
  assert.match(source, /Fontbibliotheek/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /\.sp-free-line__fields\{grid-template-columns:1fr 1fr\}/);
});
