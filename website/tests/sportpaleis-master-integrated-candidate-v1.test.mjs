import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createOrderPickProof, scanOrderPickProof, undoOrderPickProofScan } from "../src/sportpaleis/order-pick-proof.mjs";
import { VISUAL_STUDIO_CHANNELS } from "../src/sportpaleis/visual-studio.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Master-Kevin-2026!", patrick: "Master-Patrick-2026!", collega: "Master-Store-2026!", "donovan-support": "Master-Support-2026!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-master-integrated-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10h80v80H10z"/></svg>');

test("Visual Studio bewaart één canonical compositie en leidt vijf kanaalvarianten deterministisch af", async (context) => {
  const { service, store, admin, operator, storeUser } = await fixture(context);
  const source = await service.createProductionAssetSource(operator.token, operator.csrfToken, { filename: "master-review-logo.svg", mimeType: "image/svg+xml", dataBase64: logoSvg.toString("base64"), intakeKind: "ARTWORK", conversionMethod: "HUMAN_VERIFIED_SVG" });
  const asset = await service.promoteProductionAsset(admin.token, admin.csrfToken, source.id, { candidateIds: [source.candidates[0].id], name: "Master review clublogo", ownerType: "ASSOCIATION", ownerName: "SC Buitenboys", productionMethod: "SELF_PRODUCED", widthMm: 80, heightMm: 80, contexts: [{ type: "ASSOCIATION", id: "association-sc-buitenboys", label: "SC Buitenboys" }], applications: [{ kind: "LOGO", placement: "Clublogo" }], proofAuthority: "HUMAN_ACCEPTANCE" });
  const state = await store.read(); const article = state.articles.find(({ active, imageKey }) => active && imageKey);
  const created = await service.createVisualComposition(operator.token, operator.csrfToken, { concept: "SEASON_START", title: "Klaar voor het seizoen", artDirection: "Rustig, sterk productbeeld en één rood accent.", articleId: article.id, assetIds: [asset.id] }, "visual-create-1");
  await assert.rejects(service.createVisualComposition(storeUser.token, storeUser.csrfToken, { concept: "SEASON_START", title: "Niet toegestaan", artDirection: "", articleId: article.id, assetIds: [asset.id] }, "visual-create-forbidden"), (error) => error.code === "FORBIDDEN");
  assert.equal(created.duplicate, false);
  assert.equal(created.value.channels.length, VISUAL_STUDIO_CHANNELS.length);
  assert.equal(new Set(created.value.channels.map(({ renderHash }) => renderHash)).size, VISUAL_STUDIO_CHANNELS.length);
  assert.equal(created.value.productRef.articleId, article.id);
  assert.equal(created.value.assetRefs[0].assetId, asset.id);
  assert.equal(created.value.assetRefs[0].sourceSha256, source.original.sha256);
  assert.equal(created.value.checks.readyForReview, true);
  const originalHash = created.value.compositionHash;
  const updated = await service.updateVisualComposition(operator.token, operator.csrfToken, created.value.id, { expectedRevision: created.value.revision, title: created.value.title, artDirection: created.value.artDirection, geometry: { product: { xPercent: 54, yPercent: 49, scale: 0.91 }, assets: [{ assetId: asset.id, xPercent: 34, yPercent: 67, scale: 0.18 }] } });
  assert.notEqual(updated.compositionHash, originalHash);
  assert.equal(updated.geometry.product.xPercent, 54);
  await assert.rejects(service.updateVisualComposition(operator.token, operator.csrfToken, created.value.id, { expectedRevision: created.value.revision, geometry: updated.geometry }), (error) => error.code === "REVISION_CONFLICT");
  const review = await service.submitVisualCompositionReview(operator.token, operator.csrfToken, updated.id, { expectedRevision: updated.revision });
  assert.equal(review.status, "READY_FOR_REVIEW");
  assert.equal(review.checks.readyForReview, true);
  const persisted = (await store.read()).visualCompositions[0];
  assert.equal(persisted.compositionHash, review.compositionHash);
  assert.ok((await store.read()).audit.some(({ subject, details }) => subject === review.id && details?.publicPublishingPerformed === false));
});

test("Quick Intake bewaart opeenvolgende foto's als afzonderlijke immutable intakes", async (context) => {
  const { service, store, operator } = await fixture(context);
  const first = await service.createQuickProductionIntake(operator.token, operator.csrfToken, { filename: "opdracht-1.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from([0xff, 0xd8, 1, 0xff, 0xd9]).toString("base64") }, "quick-photo-0001");
  const second = await service.createQuickProductionIntake(operator.token, operator.csrfToken, { filename: "opdracht-2.jpg", mimeType: "image/jpeg", dataBase64: Buffer.from([0xff, 0xd8, 2, 0xff, 0xd9]).toString("base64") }, "quick-photo-0002");
  assert.notEqual(first.value.id, second.value.id);
  assert.notEqual(first.value.source.sha256, second.value.source.sha256);
  const stored = (await store.read()).quickProductionIntakes;
  assert.equal(stored.length, 2);
  assert.ok(stored.every(({ source, status }) => source.immutable && source.sourceKind === "PHOTO" && status === "HUMAN_CHECK"));
});

test("Quick Intake-UX accepteert meerdere foto's en belooft geen stille samenvoeging", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /name="quickSourceFile"[^>]+multiple/u);
  assert.match(source, /Iedere gekozen foto wordt een afzonderlijke intake/iu);
  assert.match(source, /Ze worden nooit samengevoegd/iu);
});

test("ACA orderpick-proof faalt gesloten op freshness, onbekende en dubbele scans en ondersteunt auditbare undo", () => {
  const now = "2026-08-28T08:00:00.000Z";
  const order = { id: "SP-2026-0001", items: [{ articleId: "article-shirt", articleNumber: "138505" }] };
  const snapshot = { source: "ACA_XPRT", sourceId: "aca-snapshot-20260828-0700", observedAt: "2026-08-28T07:00:00.000Z", records: [{ ean: "8712345678901", articleId: "article-shirt", articleNumber: "138505" }, { ean: "8712345678902", articleId: "article-short", articleNumber: "140298" }] };
  const session = createOrderPickProof({ order, sourceSnapshot: snapshot, now });
  const matched = scanOrderPickProof(session, order, snapshot, "8712345678901", now);
  assert.equal(matched.scans.length, 1);
  assert.equal(matched.audit[0].action, "SCAN_MATCHED");
  assert.equal(scanOrderPickProof(matched, order, snapshot, "8712345678901", now).duplicate, true);
  assert.throws(() => scanOrderPickProof(session, order, snapshot, "0000000000000", now), /onbekend/u);
  assert.throws(() => scanOrderPickProof(session, order, snapshot, "8712345678902", now), /hoort niet/u);
  const undone = undoOrderPickProofScan(matched, matched.scans[0].id, now);
  assert.equal(undone.scans[0].status, "UNDONE");
  assert.equal(undone.audit.at(-1).action, "SCAN_UNDONE");
  assert.throws(() => createOrderPickProof({ order, sourceSnapshot: { ...snapshot, observedAt: "2026-08-25T07:00:00.000Z" }, now }), /niet actueel/u);
});

test("scanner/orderpick blijft in kandidaat als begrensde proof en wordt niet als live voorraadfunctie aangezet", async () => {
  const source = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  assert.match(source, /barcodeEnabled: false/u);
  assert.match(source, /barcodeHardwareValidated: false/u);
});

test("Teamwear is de medewerkerstaal en de catalogus is slechts een optionele versneller", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
  const experience = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /Teamwear van aanvraag tot akkoord/u);
  assert.doesNotMatch(workspace, /Van aanvraag tot goedgekeurde teamkit/u);
  assert.match(shell, /replace\("Teamkit samenstellen", "Teamwear samenstellen"\)/u);
  assert.match(workspace, /Met welk artikel wil je beginnen/u);
  assert.match(workspace, /Plak of sleep het productbeeld hier/u);
  assert.match(experience, /<summary>Meer artikelen<\/summary>/u);
  assert.match(experience, /Maten en globaal aantal/u);
});

test("Bedrukken houdt de gekozen-status tijdens invoer gelijk aan de ordersamenvatting", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /function syncPrintingDecisionFeedback\(app: HTMLElement\): void/u);
  assert.match(source, /if \(target\.dataset\.standardField\) syncPrintingDecisionFeedback\(app\)/u);
  assert.match(source, /indicator\.textContent = chosen \? "Gekozen ✓"/u);
});

test("Teamwear houdt de volledige experience binnen de mobiele gridtrack", async () => {
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(css, /\.sp-club-experience\{grid-template-columns:minmax\(0,1fr\);min-width:0;max-width:100%\}/u);
});
