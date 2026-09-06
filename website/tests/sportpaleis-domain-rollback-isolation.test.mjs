import assert from "node:assert/strict";
import test from "node:test";

import { runRollbackOperationIsolated } from "../scripts/sportpaleis-domain-rollback-bridge.mjs";

const fixture = new URL("./fixtures/rollback-isolation-child.mjs", import.meta.url);

function assertChildExited(pid) {
  assert.ok(Number.isInteger(pid) && pid > 0, "child PID ontbreekt");
  assert.throws(() => process.kill(pid, 0), (error) => error?.code === "ESRCH", `child ${pid} bleef na de terminale uitkomst actief`);
}

test("rollback-isolatie bevestigt success pas na result-flush en child-exit", async () => {
  const result = await runRollbackOperationIsolated({ moduleUrl: fixture, payload: { mode: "success" }, operation: "fixture" }, { timeoutMs: 2_000 });
  assert.equal(result.isolatedProcessExitConfirmed, true);
  assertChildExited(result.fixturePid);
});

test("rollback-isolatie bewaart een gerichte childfout en ruimt het proces op", async () => {
  const error = await runRollbackOperationIsolated({ moduleUrl: fixture, payload: { mode: "error" }, operation: "fixture" }, { timeoutMs: 2_000 }).then(() => null, (failure) => failure);
  assert.equal(error?.code, "FIXTURE_FAILURE");
  assert.equal(error?.isolatedProcessExitConfirmed, true);
  assertChildExited(error.childPid);
});

test("rollback-isolatie faalt gesloten bij crash en bevestigt procesexit", async () => {
  const error = await runRollbackOperationIsolated({ moduleUrl: fixture, payload: { mode: "crash" }, operation: "fixture" }, { timeoutMs: 2_000 }).then(() => null, (failure) => failure);
  assert.equal(error?.code, "LEGACY_ROLLBACK_ISOLATION_FAILED");
  assert.equal(error?.isolatedProcessExitConfirmed, true);
  assertChildExited(error.childPid);
});

test("rollback-isolatie wacht bij timeout op childterminatie vóór terugkeer", async () => {
  const startedAt = Date.now();
  const error = await runRollbackOperationIsolated({ moduleUrl: fixture, payload: { mode: "hang" }, operation: "fixture" }, { timeoutMs: 1_000 }).then(() => null, (failure) => failure);
  assert.equal(error?.code, "LEGACY_ROLLBACK_ISOLATION_TIMEOUT");
  assert.equal(error?.isolatedProcessExitConfirmed, true);
  assert.ok(Date.now() - startedAt >= 900, "timeout keerde voortijdig terug");
  assertChildExited(error.childPid);
});
