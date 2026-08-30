import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Font-Hotfix-Admin-2026!",
  patrick: "Font-Hotfix-Operator-2026!",
  collega: "Font-Hotfix-Store-2026!",
  "donovan-support": "Font-Hotfix-Support-2026!",
};

test("fontupload is afzonderlijk ingeschakeld, admin-only en technisch fail-closed", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-font-hotfix-"));
  const runtimeArtifactRoot = path.join(root, "shared-runtime");
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({
    store,
    artifactRoot: root,
    runtimeArtifactRoot,
    uploadsEnabled: false,
    fontUploadsEnabled: true,
  });
  await service.initialize();
  await store.mutate((state) => ({ state: { ...state, productionFonts: [] }, value: null }));

  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const adminBootstrap = await service.bootstrap(admin.token);
  const operatorBootstrap = await service.bootstrap(operator.token);
  assert.equal(adminBootstrap.capabilities.uploadsEnabled, false);
  assert.equal(adminBootstrap.capabilities.fontUploadsEnabled, true);
  assert.equal(operatorBootstrap.capabilities.fontUploadsEnabled, false);

  const sourceBytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const bytes = Buffer.concat([sourceBytes, Buffer.from([0])]);
  const payload = {
    name: "Schluber",
    filename: "LiberationSans-Regular.ttf",
    dataBase64: bytes.toString("base64"),
    provenance: "Repository testasset met vastgelegde open-bronprovenance",
    allowedInStore: false,
  };
  await assert.rejects(service.addProductionFont(operator.token, operator.csrfToken, payload), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, { ...payload, filename: "font.otf" }), (error) => error.code === "FONT_SIGNATURE_INVALID");

  const beforeFont = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "INDIVIDUAL",
    customer: "Regressie Bedrukken met nieuwe fontbron",
    customerEmail: "font-regression@example.test",
    customerPhone: "0612345678",
    standardPersonalization: { initials: "SP", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
    items: [{ articleId: "sp-live-141709", size: "M", quantity: 1, deviation: false, overrides: {} }],
  }, "font-regression-order")).value;
  assert.equal(beforeFont.productionLines[0].source.kind, "PROFILE");
  assert.equal(beforeFont.productionLines[0].validation.status, "BLOCKED");

  const added = await service.addProductionFont(admin.token, admin.csrfToken, payload);
  assert.equal(added.sha256, createHash("sha256").update(bytes).digest("hex").toUpperCase());
  assert.equal(added.status, "TECHNICALLY_VALID");
  assert.equal(added.allowedInStore, false);
  const state = await store.read();
  assert.equal(state.productionFonts.length, 2);
  const stored = state.productionFonts.find(({ id }) => id === added.id);
  assert.equal(stored.sourceDataBase64, bytes.toString("base64"));
  assert.equal(stored.uploadedBy.userId, admin.user.id);
  assert.ok(state.audit.some(({ action, subject }) => action === "Productiefont toegevoegd" && subject === added.id));
  const order = state.orders.find(({ id }) => id === beforeFont.id);
  assert.deepEqual(order.productionLines[0].source, { kind: "FONT", id: added.id, version: added.version, sha256: added.sha256 });
  await store.mutate((current) => {
    const target = current.orders.find(({ id }) => id === order.id);
    target.communication.receipt = { status: "CAPTURED", updatedAt: new Date().toISOString(), providerReference: "font-regression-fixture", recipientHash: createHash("sha256").update(target.customerEmail.trim().toLocaleLowerCase("nl-NL")).digest("hex") };
    target.revision += 1;
    return { state: current, value: null };
  });
  const afterReceipt = (await service.bootstrap(admin.token)).orders.find(({ id }) => id === order.id);
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, order.id, afterReceipt.revision, "font-regression-control")).value;
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "font-regression-proposal")).value;
  const job = (await service.createProductionJob(admin.token, admin.csrfToken, { proposalId: proposal.id, orders: [{ id: controlled.id, expectedRevision: controlled.revision }] }, "font-regression-job")).value;
  assert.equal(job.snapshot.artifact.format, "SVG");
  assert.deepEqual(job.snapshot.fontSources, [{ id: added.id, name: added.name, version: added.version, sha256: added.sha256, originalFilename: added.originalFilename }]);
  assert.equal(job.snapshot.productionLines[0].source.sha256, added.sha256);
  const artifactPath = path.join(runtimeArtifactRoot, job.snapshot.artifact.path);
  const artifact = await readFile(artifactPath, "utf8");
  await assert.rejects(readFile(path.join(root, job.snapshot.artifact.path)), (error) => error.code === "ENOENT");
  assert.match(artifact, /<path data-contour-id=/);
  assert.doesNotMatch(artifact, /<text|font-family/iu);
  assert.equal(createHash("sha256").update(artifact).digest("hex").toUpperCase(), job.snapshot.artifact.sha256);
  const runtimeDownload = await service.productionJobArtifact(admin.token, job.id);
  assert.equal(runtimeDownload.bytes.toString("utf8"), artifact);
  assert.equal(runtimeDownload.sha256, job.snapshot.artifact.sha256);

  const legacyPath = "output/golden-existing.svg";
  await mkdir(path.join(root, "output"), { recursive: true });
  await writeFile(path.join(root, legacyPath), artifact);
  const legacyJob = structuredClone(job);
  legacyJob.id = "production-job-existing-immutable-artifact";
  legacyJob.jobNumber = "PLOT-2099-9999";
  legacyJob.snapshot.artifact = { ...legacyJob.snapshot.artifact, path: legacyPath, filename: "golden-existing.svg" };
  legacyJob.snapshotHash = createHash("sha256").update(JSON.stringify(legacyJob.snapshot)).digest("hex");
  await store.mutate((current) => ({ state: { ...current, productionJobs: [legacyJob, ...current.productionJobs] }, value: null }));
  const legacyDownload = await service.productionJobArtifact(admin.token, legacyJob.id);
  assert.equal(legacyDownload.bytes.toString("utf8"), artifact);
  assert.equal(legacyDownload.sha256, job.snapshot.artifact.sha256);

  await mkdir(path.join(runtimeArtifactRoot, "output"), { recursive: true });
  await writeFile(path.join(runtimeArtifactRoot, legacyPath), "not-the-immutable-artifact");
  await assert.rejects(service.productionJobArtifact(admin.token, legacyJob.id), (error) => error.code === "PRODUCTION_ARTIFACT_HASH_MISMATCH");
});

test("fontupload blijft gesloten wanneer de specifieke productiepolicy uit staat", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-font-disabled-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({ store, uploadsEnabled: false, fontUploadsEnabled: false });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, {
    name: "Geblokkeerd",
    filename: "LiberationSans-Regular.ttf",
    dataBase64: bytes.toString("base64"),
    provenance: "test",
  }), (error) => error.code === "UPLOADS_DISABLED");
});

test("Fontbibliotheek toont de uploadflow alleen bij de server-side admincapability", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /state\.currentUser\.role !== "admin"/);
  assert.match(source, /state\.capabilities\.fontUploadsEnabled/);
  assert.match(source, /Alleen een bevoegde beheerder kan een productie-font toevoegen/);
  assert.match(source, /Fontbestand/);
  assert.match(source, /Valideren en toevoegen/);
  const fontForm = source.slice(source.indexOf("data-production-font-form"), source.indexOf("data-production-font-form") + 1_500);
  assert.doesNotMatch(fontForm, /name="provenance"[^>]*required/);
});

test("beheerder hoeft geen technische provenance in te voeren; audit vult veilige herkomst aan", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-font-minimal-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, uploadsEnabled: false, fontUploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const sourceBytes = await readFile(new URL("../node_modules/pdfjs-dist/standard_fonts/LiberationSans-Italic.ttf", import.meta.url));
  const added = await service.addProductionFont(admin.token, admin.csrfToken, { name: "Minimale invoer", filename: "LiberationSans-Italic.ttf", dataBase64: sourceBytes.toString("base64"), provenance: "", allowedInStore: true });
  const stored = (await store.read()).productionFonts.find(({ id }) => id === added.id);
  assert.match(stored.provenance, /via Beheer/u);
  assert.equal(stored.uploadedBy.userId, admin.user.id);
  assert.equal(stored.allowedInStore, true);
});
