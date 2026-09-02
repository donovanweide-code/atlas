import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { reserveImmutableProductionArtifact, SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Artifact-Admin-2026!", patrick: "Artifact-Operator-2026!", collega: "Artifact-Store-2026!", "donovan-support": "Artifact-Support-2026!" };
const empty = { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };
const execFileAsync = promisify(execFile);

async function temporaryRoot(context, label) {
  const root = await mkdtemp(path.join(tmpdir(), `sportpaleis-artifact-${label}-`));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("eerste create reserveert content-addressed en create-only", async (context) => {
  const root = await temporaryRoot(context, "first");
  const bytes = Buffer.from("<svg>eerste output</svg>");
  const result = reserveImmutableProductionArtifact({ runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes });
  assert.equal(result.reused, false);
  assert.match(result.artifactIdentity, /^PLOT-2026-0067:[A-F0-9]{64}$/u);
  assert.match(result.relativePath, /^outputs\/sportpaleis-plotjobs\/PLOT-2026-0067\/[a-f0-9]{64}\/PLOT-2026-0067-production\.svg$/u);
  assert.deepEqual(await readFile(path.join(root, result.relativePath)), bytes);
});

test("exact dezelfde retry herkent bestaande idempotente bytes", async (context) => {
  const root = await temporaryRoot(context, "retry");
  const input = { runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>zelfde intentie</svg>") };
  const first = reserveImmutableProductionArtifact(input);
  const retry = reserveImmutableProductionArtifact(input);
  assert.equal(first.artifactIdentity, retry.artifactIdentity);
  assert.equal(retry.reused, true);
  assert.deepEqual(await readFile(path.join(root, retry.relativePath)), input.bytes);
});

test("reeds bestaand identiek artifact wordt zonder mutatie geadopteerd", async (context) => {
  const root = await temporaryRoot(context, "identical");
  const input = { runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>identiek bestaand</svg>") };
  const expected = reserveImmutableProductionArtifact({ ...input, persist: false });
  const absolute = path.join(root, expected.relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.bytes, { flag: "wx" });
  const adopted = reserveImmutableProductionArtifact(input);
  assert.equal(adopted.reused, true);
  assert.deepEqual(await readFile(absolute), input.bytes);
});

test("bestaand verschillend artifact faalt gesloten en wordt nooit overschreven", async (context) => {
  const root = await temporaryRoot(context, "different");
  const input = { runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>bedoelde output</svg>") };
  const expected = reserveImmutableProductionArtifact({ ...input, persist: false });
  const absolute = path.join(root, expected.relativePath);
  const existing = Buffer.from("<svg>andere immutable output</svg>");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, existing, { flag: "wx" });
  assert.throws(() => reserveImmutableProductionArtifact(input), (error) => error.code === "PRODUCTION_ARTIFACT_IDENTITY_COLLISION" && error.statusCode === 409);
  assert.deepEqual(await readFile(absolute), existing);
});

test("verschillende output met hetzelfde teruggerolde jobnummer krijgt een unieke deterministische identiteit", async (context) => {
  const root = await temporaryRoot(context, "different-occurrence");
  const black = reserveImmutableProductionArtifact({ runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>ZWART SP-2026-0113+0112</svg>") });
  const white = reserveImmutableProductionArtifact({ runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>WIT SP-2026-0111+0113+0112</svg>") });
  assert.notEqual(black.artifactIdentity, white.artifactIdentity);
  assert.notEqual(black.relativePath, white.relativePath);
  assert.deepEqual(await readFile(path.join(root, black.relativePath)), Buffer.from("<svg>ZWART SP-2026-0113+0112</svg>"));
  assert.deepEqual(await readFile(path.join(root, white.relativePath)), Buffer.from("<svg>WIT SP-2026-0111+0113+0112</svg>"));
});

test("gelijktijdige reserveringen materialiseren exact één immutable final", async (context) => {
  const root = await temporaryRoot(context, "concurrent");
  const moduleUrl = new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url).href;
  const source = `<svg>concurrent dezelfde output</svg>`;
  const child = `import { reserveImmutableProductionArtifact } from ${JSON.stringify(moduleUrl)}; const value=reserveImmutableProductionArtifact({runtimeArtifactRoot:${JSON.stringify(root)},jobNumber:"PLOT-2026-0067",bytes:Buffer.from(${JSON.stringify(source)})}); process.stdout.write(JSON.stringify(value));`;
  const results = await Promise.all(Array.from({ length: 8 }, async () => JSON.parse((await execFileAsync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", child], { windowsHide: true })).stdout)));
  assert.equal(results.filter(({ reused }) => reused === false).length, 1);
  assert.equal(new Set(results.map(({ artifactIdentity }) => artifactIdentity)).size, 1);
  const directory = path.dirname(path.join(root, results[0].relativePath));
  assert.deepEqual((await readdir(directory)).filter((name) => !name.startsWith(".")), ["PLOT-2026-0067-production.svg"]);
});

test("onderbroken pending create blokkeert geen complete atomische final", async (context) => {
  const root = await temporaryRoot(context, "interrupted");
  const input = { runtimeArtifactRoot: root, jobNumber: "PLOT-2026-0067", bytes: Buffer.from("<svg>herstelde complete output</svg>") };
  const expected = reserveImmutableProductionArtifact({ ...input, persist: false });
  const directory = path.dirname(path.join(root, expected.relativePath));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `.${expected.filename}.pending-interrupted`), Buffer.from("<svg>half"), { flag: "wx" });
  const recovered = reserveImmutableProductionArtifact(input);
  assert.equal(recovered.reused, false);
  assert.deepEqual(await readFile(path.join(root, recovered.relativePath)), input.bytes);
});

class RollbackOnceStore {
  constructor(inner) { this.inner = inner; this.failNextMutation = false; }
  initialize(...args) { return this.inner.initialize(...args); }
  read(...args) { return this.inner.read(...args); }
  readSnapshot(...args) { return this.inner.read(...args); }
  async mutate(mutator) {
    if (!this.failNextMutation) return this.inner.mutate(mutator);
    this.failNextMutation = false;
    const state = await this.inner.read();
    await mutator(structuredClone(state));
    throw Object.assign(new Error("Gesimuleerde database-rollback na artifactreservering."), { code: "SIMULATED_TRANSACTION_ROLLBACK" });
  }
}

test("database-rollback laat state atomisch en retry hergebruikt exact dezelfde output", async (context) => {
  const root = await temporaryRoot(context, "rollback-retry");
  const inner = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const store = new RollbackOnceStore(inner);
  const runtimeArtifactRoot = path.join(root, "runtime");
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot, releaseId: "SPW-ARTIFACT-RESERVATION-HOTFIX" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const bootstrap = await service.bootstrap(admin.token);
  const font = bootstrap.productionFonts.find(({ status }) => status === "TECHNICALLY_VALID");
  const created = (await service.createOrder(admin.token, admin.csrfToken, {
    orderKind: "CUSTOM", customer: "Rollback retry", customerEmail: "", customerPhone: "", standardPersonalization: empty,
    items: [{ product: "WIT retry", size: "", quantity: 1, personalization: "Initialen RR", foilColor: "Wit", deviation: true, overrides: empty }],
    productionLines: [{ id: "rollback-retry-line", type: "INITIALS", content: "RR", previewLabel: "Initialen RR", widthMm: 55, heightMm: 30, quantity: 1, sourceId: font.id }],
  }, "artifact-rollback-order")).value;
  const controlled = (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, "artifact-rollback-control")).value;
  const request = { orders: [{ id: controlled.id, expectedRevision: controlled.revision }], foilColor: "Wit" };
  const before = await inner.read();
  store.failNextMutation = true;
  await assert.rejects(service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, request, "artifact-rollback-first"), (error) => error.code === "SIMULATED_TRANSACTION_ROLLBACK");
  const rolledBack = await inner.read();
  assert.equal(rolledBack.revision, before.revision);
  assert.equal(rolledBack.productionJobs.length, before.productionJobs.length);
  assert.equal(rolledBack.nextProductionJobSequence, before.nextProductionJobSequence);
  const orphanFiles = (await readdir(runtimeArtifactRoot, { recursive: true })).filter((name) => name.endsWith("-production.svg"));
  assert.equal(orphanFiles.length, 1);

  const retried = await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, request, "artifact-rollback-retry");
  assert.equal(retried.value.job.snapshot.artifact.reservation.reused, true);
  const committed = await inner.read();
  assert.equal(committed.productionJobs.filter(({ id }) => id === retried.value.job.id).length, 1);
  assert.equal(committed.nextProductionJobSequence, before.nextProductionJobSequence + 1);
  assert.equal((await readdir(runtimeArtifactRoot, { recursive: true })).filter((name) => name.endsWith("-production.svg")).length, 1);
});
