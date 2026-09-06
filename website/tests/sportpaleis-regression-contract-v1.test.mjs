import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const websiteRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", import.meta.url);
const bytes = async (relative) => readFile(new URL(relative, websiteRoot));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contract = JSON.parse(await bytes("config/sportpaleis-regression-contract-v1.json"));
const matrixBytes = await bytes("config/sportpaleis-regression-failure-matrix-v1.json");
const matrix = JSON.parse(matrixBytes);
const fixtureManifestBytes = await bytes("config/sportpaleis-immutable-regression-fixtures-v1.json");

test("het versioned regressiecontract bindt de volledige oorspronkelijke 57-failurematrix", async () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.failureMatrix.sha256, sha256(matrixBytes));
  assert.equal(contract.immutableFixtureManifest.sha256, sha256(fixtureManifestBytes));
  assert.equal(matrix.recordCount, 57);
  assert.equal(matrix.records.length, 57);
  assert.equal(matrix.records.filter(({ kind }) => kind === "LEAF_FAILURE").length, 48);
  assert.equal(matrix.records.filter(({ kind }) => kind === "SUITE_AGGREGATE").length, 9);
  assert.deepEqual(
    Object.fromEntries([...new Set(matrix.records.map(({ classification }) => classification))].sort().map((classification) => [classification, matrix.records.filter((record) => record.classification === classification).length])),
    {
      DUPLICATE_OR_CONTRADICTORY_TEST: 10,
      MISSING_IMMUTABLE_FIXTURE: 4,
      REAL_PRODUCT_DEFECT: 1,
      STALE_EXPECTATION: 32,
      WRONG_SCOPE_OR_CONTRACT: 10,
    },
  );
  const required = ["testFile", "testName", "functionality", "actualFailure", "originalExpectation", "currentImplementation", "authoritativeProductTruth", "evidenceSource", "classification", "correctiveAction", "regressionCoverage", "releaseCriticalReason", "finalStatus"];
  for (const record of matrix.records) {
    for (const field of required) assert.ok(String(record[field] ?? "").trim(), `${record.id} mist ${field}`);
    assert.ok(matrix.allowedClassifications.includes(record.classification), `${record.id} gebruikt een niet-toegestane classificatie`);
    assert.equal(record.finalStatus, "CLOSED");
  }
  const reportBytes = await bytes("tests/fixtures/regression/sportpaleis-r22649-original-57-junit.xml");
  assert.equal(sha256(reportBytes), matrix.sourceReportSha256);
  const report = reportBytes.toString("utf8");
  for (const record of matrix.records.filter(({ kind }) => kind === "LEAF_FAILURE")) assert.ok(report.includes(record.testName.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&apos;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")) || report.includes(record.testName), `${record.id} ontbreekt in immutable JUnit evidence`);
});

test("ieder repositorytestbestand valt deterministisch in precies één versioned contractlaag", async () => {
  const layers = new Set(contract.layers.map(({ id }) => id));
  assert.equal(layers.size, contract.layers.length);
  const rules = contract.testLayerResolver.rules.map((rule) => ({ ...rule, expression: new RegExp(rule.filePattern, "u") }));
  const testFiles = (await readdir(new URL("tests/", websiteRoot))).filter((name) => name.endsWith(".test.mjs"));
  for (const file of testFiles) {
    const matches = rules.filter(({ expression }) => expression.test(file));
    assert.ok(matches.length >= 1, `${file} heeft geen contractlaag`);
    assert.ok(layers.has(matches[0].layer), `${file} wijst naar een onbekende laag`);
  }
  assert.equal(contract.testLayerResolver.mode, "FIRST_MATCH_WINS");
  assert.equal(contract.policy.silentSkipAllowed, false);
  assert.equal(contract.policy.unexplainedFailureAllowed, false);
  assert.equal(contract.policy.magicCountsAllowed, false);
  assert.equal(contract.policy.productTruthChangeRequiresContractMigration, true);
});

test("immutable historische evidence is werkelijk git-versioned en niet alleen lokaal aanwezig", () => {
  const fixtureManifest = JSON.parse(fixtureManifestBytes);
  assert.equal(fixtureManifest.fixtures.length, 6);
  for (const fixture of fixtureManifest.fixtures) {
    const tracked = execFileSync("git", ["ls-files", "--error-unmatch", fixture.path], { cwd: new URL(".", repositoryRoot), encoding: "utf8" }).trim();
    assert.equal(tracked.replaceAll("\\", "/"), fixture.path);
  }
});
