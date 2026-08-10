import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("maakt uitsluitend nieuwe 6.0-sessies Runtime-gestuurd en behoudt 2.1–5.0", async () => {
  const [store, local, php] = await Promise.all([
    read("../src/experience-store.ts"),
    read("../scripts/experience-validation-local-server.mjs"),
    read("../experience-server/api/index.php"),
  ]);

  assert.match(store, /experienceVersion = atlasRuntimeExperienceVersion/);
  assert.match(store, /flowRecompositionVersion = "5\.0-flow-recomposition-v1"/);
  assert.match(local, /phase: "runtime"/);
  assert.match(local, /session\.version === flowRecompositionVersion/);
  assert.match(php, /EXPERIENCE_VERSION = '6\.0-runtime-v1'/);
  assert.match(php, /FLOW_RECOMPOSITION_VERSION = '5\.0-flow-recomposition-v1'/);
  assert.match(php, /experience_version'\] === FLOW_RECOMPOSITION_VERSION/);
});

test("committeert Field en Journal atomair met idempotentie en revisiebeveiliging", async () => {
  const [php, migration, local, packager] = await Promise.all([
    read("../experience-server/api/index.php"),
    read("../experience-server/private/migrations/004-atlas-runtime.sql"),
    read("../scripts/experience-validation-local-server.mjs"),
    read("../scripts/prepare-experience-package.mjs"),
  ]);

  assert.match(php, /SELECT revision, field_json, decision_json FROM experience_runtime_states WHERE session_id = \? FOR UPDATE/);
  assert.match(php, /experience_runtime_journal WHERE session_id = \? AND event_id = \?/);
  assert.match(php, /UPDATE experience_runtime_states SET revision = \?/);
  assert.match(php, /INSERT INTO experience_runtime_journal/);
  assert.match(php, /RUNTIME_STALE_REVISION/);
  assert.match(migration, /UNIQUE KEY uq_experience_runtime_event/);
  assert.match(migration, /UNIQUE KEY uq_experience_runtime_revision/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.match(local, /runtimeJournal\.some\(entry => entry\.eventId === eventId\)/);
  assert.match(php, /require_once __DIR__ \. '\/atlas-runtime\.php'/);
  assert.match(packager, /private", "atlas-runtime\.php/);
});

test("houdt no-change, parkering en loslating gelijk in de TypeScript- en PHP-processor", async () => {
  const [runtime, php] = await Promise.all([
    read("../src/atlas-runtime.ts"),
    read("../experience-server/private/atlas-runtime.php"),
  ]);

  for (const marker of ["attention-shift", "hypothesis-parking", "hypothesis-abandonment", "refuted-same-conditions"]) {
    assert.match(runtime, new RegExp(marker));
    assert.match(php, new RegExp(marker));
  }
  assert.match(runtime, /next\.meta\.consecutiveNoChange === 2/);
  assert.match(php, /consecutiveNoChange'\] === 2/);
  assert.match(runtime, /kind: "silence"/);
  assert.match(php, /'kind' => 'silence'/);
});

test("laat iedere zichtbare Runtime-beweging uit een traceerbare Decision ontstaan", async () => {
  const [runtime, workspace, observatory] = await Promise.all([
    read("../src/atlas-runtime.ts"),
    read("../src/experience-workspace.ts"),
    read("../src/experience-observatory.ts"),
  ]);

  assert.match(runtime, /foundationRefs: \[/);
  assert.match(runtime, /canStop: true/);
  assert.match(workspace, /session\.runtime/);
  assert.match(workspace, /decision\.question/);
  assert.match(workspace, /decision\.reason/);
  assert.match(workspace, /baseRevision: state\.session!\.runtime!\.field\.revision/);
  assert.doesNotMatch(workspace, /realityContacts\.slice\(0, -1\)/);
  assert.match(workspace, /runtimeInput\?\.value\.trim\(\)/);
  assert.match(observatory, /Actueel cognitief onderzoeksbeeld/);
  assert.match(observatory, /runtime_transition_committed/);
});

test("behoudt een lokaal Runtime-concept wanneer alleen sessiemetadata wordt ververst", async () => {
  const values = new Map();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    },
  });

  try {
    const { loadCheckpoint, saveCheckpoint } = await import("../src/experience-store.ts");
    saveCheckpoint({ schemaVersion: 2, invitationId: "invitation-1", sessionId: "session-1", draftStepId: "runtime", draft: "Mijn nog niet verzonden woorden.", updatedAt: "2026-08-04T10:00:00.000Z" });
    saveCheckpoint({ schemaVersion: 2, invitationId: "invitation-1", sessionId: "session-1", updatedAt: "2026-08-04T10:01:00.000Z" });

    assert.equal(loadCheckpoint()?.draftStepId, "runtime");
    assert.equal(loadCheckpoint()?.draft, "Mijn nog niet verzonden woorden.");
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});

test("beëindigt de Runtime nooit door een vaste route en ondersteunt vrijwillig stoppen en hervatten", async () => {
  const [runtime, workspace, api, local] = await Promise.all([
    read("../src/atlas-runtime.ts"),
    read("../src/experience-workspace.ts"),
    read("../src/experience-validation-api.ts"),
    read("../scripts/experience-validation-local-server.mjs"),
  ]);

  assert.doesNotMatch(runtime, /currentStep|routeIds|maximumTurns|maxTurns/);
  assert.match(workspace, /Voor vandaag is dit genoeg/);
  assert.match(workspace, /data-action="resume-runtime"/);
  assert.match(api, /participant\/runtime\/resume/);
  assert.match(local, /resumeRuntime\(session\.runtime\.field/);
  assert.match(local, /runtimeJournal\.push\(transition\.journalEntry\)/);
  assert.match(local, /session\.phase = "runtime"/);
});
