import assert from "node:assert/strict";
import test from "node:test";

import { sequentialStepState } from "../src/workspace-sequence.ts";

test("een sequentiële workflow heeft exact één huidige onvoltooide stap", () => {
  const steps = [{ id: "wit", done: false }, { id: "zwart", done: false }, { id: "rood", done: false }];
  assert.equal(sequentialStepState(steps, "wit", ({ done }) => done), "CURRENT");
  assert.equal(sequentialStepState(steps, "zwart", ({ done }) => done), "LATER");
  assert.equal(sequentialStepState(steps, "rood", ({ done }) => done), "LATER");

  steps[0].done = true;
  assert.equal(sequentialStepState(steps, "wit", ({ done }) => done), "COMPLETED");
  assert.equal(sequentialStepState(steps, "zwart", ({ done }) => done), "CURRENT");
  assert.equal(sequentialStepState(steps, "rood", ({ done }) => done), "LATER");
});

test("onbekende workflowstappen falen gesloten", () => {
  assert.equal(sequentialStepState([{ id: "bestaand" }], "onbekend", () => false), "UNKNOWN");
});
