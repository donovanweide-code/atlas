import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "History-Kevin-2026!", patrick: "History-Patrick-2026!", collega: "History-Store-2026!", "donovan-support": "History-Support-2026!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-production-history-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-PRODUCTION-HISTORY-001-20260811", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

test("Production history 011 — immutable Golden evidence and auditable replot", async (context) => {
  const { store, service, admin, operator, storeUser } = await fixture(context);

  await context.test("alleen expliciet vastgelegde Golden- en SVG-combinaties dragen hun eigen begrensde fysieke bewijs", async () => {
    const bootstrap = await service.bootstrap(admin.token);
    assert.equal(bootstrap.schemaVersion, 18);
    assert.equal(bootstrap.productionJobs.length, 4);
    assert.equal(bootstrap.productionJobs.filter(({ proofStatus }) => proofStatus === "PHYSICALLY_VALIDATED").length, 3);
    assert.equal(bootstrap.productionJobs.filter(({ proofStatus }) => proofStatus === "WINPLOT_VALIDATED").length, 1);
    const batch = bootstrap.productionJobs.find(({ id }) => id === "production-job-golden-batch-001");
    const autoMirror = bootstrap.productionJobs.find(({ id }) => id === "production-job-golden-batch-001-auto-mirror-ab");
    const cutjobSvg = bootstrap.productionJobs.find(({ id }) => id === "production-job-cutjob-svg-physical-001");
    assert.ok(batch);
    assert.ok(autoMirror);
    assert.ok(cutjobSvg);
    assert.equal(batch.snapshot.artifact.sha256, "B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B");
    assert.equal(batch.snapshot.layout.objectCount, 10);
    assert.equal(batch.snapshot.orientation.manualHorizontalFlipInWinPlot, true);
    assert.equal(batch.snapshot.hardwareSendPerformedByWorkspace, false);
    assert.equal(autoMirror.humanAcceptance.status, "PASS");
    assert.equal(autoMirror.snapshot.orientation.preMirrored, true);
    assert.equal(autoMirror.snapshot.orientation.manualHorizontalFlipInWinPlot, false);
    assert.equal(autoMirror.snapshot.artifact.sha256, "2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4");
    assert.equal(cutjobSvg.jobNumber, "PLOT-2026-0004");
    assert.equal(cutjobSvg.snapshot.artifact.sha256, "26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6");
    assert.deepEqual(cutjobSvg.snapshot.outputWriter, { id: "cutjob-svg", version: "1", format: "SVG", proofStatus: "GEOMETRY_VALIDATED", physicalRouteStatus: "HUMAN_VALIDATION_REQUIRED" });
    assert.equal(cutjobSvg.snapshot.sourceContours[0].id, "pioneers-rugnummer-2-200mm");
    assert.equal(cutjobSvg.snapshot.sourceContours[0].version, "Sportpaleis-Snijtest-001");
    assert.equal(cutjobSvg.snapshot.physicalRouteEvidence.result, "PASS");
    assert.equal(cutjobSvg.snapshot.physicalRouteEvidence.machineContext.exactModel, "DATA_GAP");
    const cutjobDownload = await service.productionJobArtifact(operator.token, cutjobSvg.id);
    assert.equal(cutjobDownload.sha256, cutjobSvg.snapshot.artifact.sha256);
    assert.equal(cutjobDownload.filename, "PLOT-2026-0004-production.svg");
    const firstDownload = await service.productionJobArtifact(operator.token, autoMirror.id);
    const secondDownload = await service.productionJobArtifact(operator.token, autoMirror.id);
    assert.equal(firstDownload.filename, autoMirror.snapshot.artifact.filename);
    assert.equal(firstDownload.sha256, autoMirror.snapshot.artifact.sha256);
    assert.deepEqual(secondDownload.bytes, firstDownload.bytes);
    await assert.rejects(service.productionJobArtifact(storeUser.token, autoMirror.id), (error) => error.code === "FORBIDDEN");
    assert.equal((await service.bootstrap(storeUser.token)).productionJobs.length, 0);
  });

  await context.test("herplot is een nieuwe uitvoering met exact dezelfde snapshot en idempotente audit", async () => {
    const before = await store.read();
    const original = before.productionJobs.find(({ id }) => id === "production-job-golden-batch-001-auto-mirror-ab");
    const originalCopy = structuredClone(original);
    const key = "production-history-replot-001";
    const first = await service.replotProductionJob(operator.token, operator.csrfToken, original.id, { reason: "Folie beschadigd tijdens pellen" }, key);
    const duplicate = await service.replotProductionJob(operator.token, operator.csrfToken, original.id, { reason: "Deze tekst mag geen tweede job maken" }, key);
    assert.equal(first.duplicate, false);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.value.id, first.value.id);
    assert.equal(first.value.kind, "REPLOT");
    assert.equal(first.value.originJobId, original.id);
    assert.equal(first.value.snapshotHash, original.snapshotHash);
    assert.deepEqual(first.value.snapshot, original.snapshot);
    assert.equal(first.value.proofStatus, "CONFIGURED");
    assert.equal(first.value.humanAcceptance.status, "PENDING");
    assert.equal(first.value.status, "AWAITING_HUMAN_CHECK");
    assert.equal(first.value.reason, "Folie beschadigd tijdens pellen");
    const originalDownload = await service.productionJobArtifact(operator.token, original.id);
    const replotDownload = await service.productionJobArtifact(operator.token, first.value.id);
    assert.equal(replotDownload.sha256, originalDownload.sha256);
    assert.deepEqual(replotDownload.bytes, originalDownload.bytes);
    const after = await store.read();
    assert.equal(after.productionJobs.length, before.productionJobs.length + 1);
    assert.deepEqual(after.productionJobs.find(({ id }) => id === original.id), originalCopy);
    assert.ok(after.audit.some(({ action, subject, details }) => action === "Opnieuw plotten voorbereid" && subject === first.value.jobNumber && details.originJobId === original.id && details.hardwareSendPerformed === false));
  });

  await context.test("winkelrol mag niet herplotten en snapshots kunnen niet stil worden gewijzigd", async () => {
    await assert.rejects(service.replotProductionJob(storeUser.token, storeUser.csrfToken, "production-job-golden-batch-001", {}, "production-history-forbidden"), (error) => error.code === "FORBIDDEN");
    await assert.rejects(store.mutate(async (state) => { state.productionJobs[0].snapshot.scale = 2; return { state, value: undefined }; }), /snapshot is gewijzigd of beschadigd/);
    const state = await store.read();
    assert.equal(state.productionJobs.find(({ id }) => id === "production-job-golden-batch-001").snapshot.scale, 1);
  });
});

test("Production history UX is vindbaar, mobile-first en hardware-safe", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(source, /Plot-\/printhistorie/);
  assert.match(source, /data-production-job-search/);
  assert.match(source, /data-replot-form/);
  assert.match(source, /productiebestand downloaden/);
  assert.match(source, /production-jobs\/\$\{encodeURIComponent\(job\.id\)\}\/artifact/);
  assert.match(source, /Bestandshash/);
  assert.match(source, /Snapshot-hash/);
  assert.match(source, /<summary>Technische details<\/summary>/);
  assert.match(source, /Plaats de getoonde folierol en start de plotter/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.sp-production-job-facts \{ grid-template-columns:1fr; \}/);
});
