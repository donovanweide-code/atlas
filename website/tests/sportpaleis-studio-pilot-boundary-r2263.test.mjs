import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { parseWorkspaceRuntimeConfig } from "../scripts/workspace-runtime-config.mjs";

const passwords = {
  kevin: "Boundary-Kevin-2026!",
  patrick: "Boundary-Patrick-2026!",
  collega: "Boundary-Collega-2026!",
  "donovan-support": "Boundary-Support-2026!",
};

async function fixture(context, creativeStudioEnabled) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-r2263-studio-boundary-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", artifactRoot: root, runtimeArtifactRoot: root, creativeStudioEnabled });
  await service.initialize();
  await store.mutate(async (state) => {
    for (const user of state.users.filter(({ role }) => ["admin", "operator"].includes(role))) {
      user.featureExposure ??= {};
      user.featureExposure.teamwearExperiencePilot = true;
    }
    return { state, value: true };
  });
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const storeUser = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  return { store, service, admin, operator, storeUser };
}

test("R2.26.3 geeft Studio uitsluitend via één server-authoritative runtimecapability vrij", async (context) => {
  const disabled = await fixture(context, false);
  const adminBootstrap = await disabled.service.bootstrap(disabled.admin.token);
  const operatorBootstrap = await disabled.service.bootstrap(disabled.operator.token);
  assert.equal(adminBootstrap.capabilities.creativeStudio, false);
  assert.equal(operatorBootstrap.capabilities.creativeStudio, false);
  assert.equal(adminBootstrap.capabilities.admin, true);
  assert.equal(operatorBootstrap.capabilities.operator, true);
  assert.equal(operatorBootstrap.capabilities.workContexts.includes("PRODUCTION"), true);
  assert.equal(adminBootstrap.capabilities.teamwearExperiencePilot, true);
  assert.equal(operatorBootstrap.capabilities.teamwearExperiencePilot, true);
  assert.equal(await disabled.service.assertTeamwearPilotAccess(disabled.operator.token).then(({ enabled }) => enabled), true);

  const before = await disabled.store.read();
  for (const attempt of [
    () => disabled.service.createVisualComposition(disabled.admin.token, disabled.admin.csrfToken, {}, "studio-disabled-create"),
    () => disabled.service.visualCompositionSource(disabled.admin.token, "missing"),
    () => disabled.service.updateVisualComposition(disabled.operator.token, disabled.operator.csrfToken, "missing", {}),
    () => disabled.service.submitVisualCompositionReview(disabled.operator.token, disabled.operator.csrfToken, "missing", {}),
    () => disabled.service.createCreativeVectorDraft(disabled.admin.token, disabled.admin.csrfToken, {}, "studio-disabled-vector"),
    () => disabled.service.creativeVectorDraftFile(disabled.admin.token, "missing", "source"),
  ]) {
    await assert.rejects(attempt, (error) => error.statusCode === 403 && error.code === "CREATIVE_STUDIO_DISABLED");
  }
  const after = await disabled.store.read();
  assert.equal(after.revision, before.revision);
  assert.equal(after.visualCompositions.length, before.visualCompositions.length);
  assert.equal(after.creativeVectorDrafts.length, before.creativeVectorDrafts.length);

  const enabled = await fixture(context, true);
  assert.equal((await enabled.service.bootstrap(enabled.admin.token)).capabilities.creativeStudio, true);
  assert.equal((await enabled.service.bootstrap(enabled.operator.token)).capabilities.creativeStudio, true);
  assert.equal((await enabled.service.bootstrap(enabled.storeUser.token)).capabilities.creativeStudio, false);
});

test("productionconfig houdt Studio zonder expliciete pilotbeslissing veilig uitgeschakeld", () => {
  const base = {
    NODE_ENV: "production", APP_ENV: "production", PUBLIC_BASE_URL: "https://webuildanddesign.nl", WORKSPACE_BASE_URL: "https://workspace.sportpaleis.nl", WBD_WORKSPACE_BASE_URL: "https://workspace.webuildanddesign.nl", RELEASE_ID: "SPW-R2.26.3-TEST",
    WORKSPACE_DB_HOST: "127.0.0.1", WORKSPACE_DB_NAME: "workspace", WORKSPACE_DB_USER: "workspace", WORKSPACE_DB_PASSWORD: "secret",
    ATLAS_DB_HOST: "127.0.0.1", ATLAS_DB_NAME: "atlas", ATLAS_DB_USER: "atlas", ATLAS_DB_PASSWORD: "secret",
    SPORTPALEIS_UPLOADS_ENABLED: "false", SPORTPALEIS_FONT_UPLOADS_ENABLED: "true", SPORTPALEIS_MAIL_MODE: "capture", SPORTPALEIS_HARDWARE_OUTPUT_ENABLED: "false", SPORTPALEIS_DIRECT_PRINT_ENABLED: "false", SPORTPALEIS_SUMMA_ENABLED: "false", ATLAS_RUNTIME_MODE: "boundary-only", DEBUG: "false",
  };
  assert.equal(parseWorkspaceRuntimeConfig(base).creativeStudioEnabled, false);
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...base, SPORTPALEIS_CREATIVE_STUDIO_ENABLED: "off" }), /moet true of false/u);
  assert.equal(parseWorkspaceRuntimeConfig({ ...base, SPORTPALEIS_CREATIVE_STUDIO_ENABLED: "false" }).creativeStudioEnabled, false);
  assert.equal(parseWorkspaceRuntimeConfig({ ...base, SPORTPALEIS_CREATIVE_STUDIO_ENABLED: "true" }).creativeStudioEnabled, true);
});

test("frontend gebruikt uitsluitend de servercapability voor Studio-navigation en routes", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /const visualStudioNav = state\.capabilities\.creativeStudio \?/u);
  assert.match(source, /current === `\$\{BASE\}\/studio`\) return state\.capabilities\.creativeStudio \?/u);
  assert.doesNotMatch(source, /const visualStudioNav = \["admin", "operator"\]\.includes/u);
});
