import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createSportpaleisPasswordRecord, SportpaleisFileStore, SportpaleisPilotService } from "../../scripts/sportpaleis-pilot-foundation.mjs";
import { planSportpaleisPermissionMigration } from "../../scripts/sportpaleis-permission-migration.mjs";
import { SPORTPALEIS_INITIAL_PROFILES } from "../../../app/config/sportpaleis-permission-rollout.mjs";

export async function createPlanningFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "workspace-planning-central-"));
  t.after(async () => { assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep)); assert.ok(path.basename(root).startsWith("workspace-planning-central-")); await rm(root, { recursive: true, force: true }); });
  const password = "Planning-Local-Fixture-2026!";
  const settings = { filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: password, patrick: password, collega: password, "donovan-support": password } };
  const store = new SportpaleisFileStore(settings); await store.initialize();
  const hash = await createSportpaleisPasswordRecord(password);
  await store.mutate(state => {
    state.users = Object.entries(SPORTPALEIS_INITIAL_PROFILES).map(([id, profile]) => ({ id, name: profile.label, initials: profile.label.slice(0, 1), role: profile.expectedLegacyRole, email: `${profile.label.toLowerCase()}@example.test`, status: "Actief", seatType: "customer", salesNumber: null, password: hash }));
    state.sessions = [];
    const plan = planSportpaleisPermissionMigration(state, { planningReady: true }); assert.equal(plan.status, "READY_FOR_EXPLICIT_CONFIG_APPLY"); state.workspacePermissions = plan.policy;
    return { state };
  });
  const service = new SportpaleisPilotService({ store, artifactRoot: root }); await service.initialize();
  const actors = {};
  for (const [id, profile] of Object.entries(SPORTPALEIS_INITIAL_PROFILES)) {
    const session = await service.login({ email: `${profile.label.toLowerCase()}@example.test`, password });
    actors[profile.label] = { id, ...session, credential: { token: session.token, csrfToken: session.csrfToken } };
  }
  let instant = new Date("2026-09-08T06:14:00Z"); service.workItems.now = () => new Date(instant);
  return { root, settings, store, service, items: service.workItems, actors, password, setNow: value => { instant = new Date(value); } };
}
