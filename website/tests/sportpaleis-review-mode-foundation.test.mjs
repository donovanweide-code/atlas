import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService, setSportpaleisTeamwearPilotExposure } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { parseWorkspaceRuntimeConfig, WorkspaceRuntimeConfigError } from "../scripts/workspace-runtime-config.mjs";
import { initialLibraryTeamkitDraft, transitionLibraryTeamkitDraft } from "../src/sportpaleis/review-candidates/library-teamkit-v1.ts";

const passwords = { kevin: "Review-Kevin-2026!", patrick: "Review-Patrick-2026!", collega: "Review-Store-2026!", "donovan-support": "Review-Support-2026!" };

async function fixture(context, reviewPrincipalIds = []) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-review-mode-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true, reviewPrincipalIds });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const employee = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  return { root, service, admin, employee };
}

test("Review Mode is default-deny en vereist exact principal, adminrol én bestaande Teamwear-exposure", async (context) => {
  const denied = await fixture(context);
  assert.equal((await denied.service.bootstrap(denied.admin.token)).capabilities.reviewMode, false);
  await assert.rejects(() => denied.service.reviewManifest(denied.admin.token), (error) => error?.statusCode === 403 && error?.code === "REVIEW_MODE_FORBIDDEN");

  const allowed = await fixture(context, ["kevin", "patrick"]);
  await allowed.service.store.mutate(async (state) => ({ state, value: setSportpaleisTeamwearPilotExposure(state, allowed.admin.user.id, true, "test:review-mode") }));
  const bootstrap = await allowed.service.bootstrap(allowed.admin.token);
  assert.equal(bootstrap.capabilities.reviewMode, true);
  const manifest = await allowed.service.reviewManifest(allowed.admin.token);
  assert.equal(manifest.candidates[0].id, "spw-r20-human-review-20260827");
  assert.equal(manifest.candidates[0].capabilities.teamkitDraft, "CANDIDATE_STATE_ONLY_FROM_LIVE_CONTEXT");
  assert.equal(manifest.candidates[0].capabilities.orders, "FORBIDDEN");
  assert.equal(manifest.candidates[0].capabilities.production, "FORBIDDEN");
  assert.equal(manifest.candidates[0].capabilities.mail, "FORBIDDEN");
  assert.equal((await allowed.service.bootstrap(allowed.employee.token)).capabilities.reviewMode, false, "een normale medewerker blijft geweigerd, ook wanneer diens ID is geconfigureerd");
  await assert.rejects(() => allowed.service.reviewManifest(allowed.employee.token), (error) => error?.statusCode === 403);
  await assert.rejects(() => allowed.service.reviewManifest("expired-session"), (error) => error?.statusCode === 401);
});

test("runtime accepteert alleen canonical principal IDs en blijft zonder configuratie fail-closed", () => {
  const base = { NODE_ENV: "test", APP_ENV: "test", WORKSPACE_DATA_FILE: "state.json", WORKSPACE_BACKUP_DIRECTORY: "backups", SESSION_COOKIE_SECURE: "false" };
  assert.deepEqual(parseWorkspaceRuntimeConfig(base).reviewPrincipalIds, []);
  assert.deepEqual(parseWorkspaceRuntimeConfig({ ...base, SPORTPALEIS_REVIEW_PRINCIPAL_IDS: "user-25812f676558376d" }).reviewPrincipalIds, ["user-25812f676558376d"]);
  assert.throws(() => parseWorkspaceRuntimeConfig({ ...base, SPORTPALEIS_REVIEW_PRINCIPAL_IDS: "Donovan Weide" }), WorkspaceRuntimeConfigError);
});

test("candidate gebruikt alleen disposable session-state en bevat geen productie- of cross-tenant authority", async () => {
  const source = await readFile(new URL("../src/sportpaleis/review-candidates/library-teamkit-v1.ts", import.meta.url), "utf8");
  assert.match(source, /sessionStorage/u);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\.createOrder\(|\.sendMail\(|\.createProduction/u);
  assert.doesNotMatch(source, /BijCees|AquaFlask|Posthopper/iu);
  assert.match(source, /Fictieve reviewbron/u);
  assert.match(source, /import\("\.\.\/\.\.\/sportpaleis-teamkit-experience\.ts"\)/u);
  assert.match(source, /reviewTeamwearState\(state\)/u);
  assert.match(source, /review-teamwear-r20-canonical/u);
  assert.match(source, /teamkitProposalExperience\(candidateState, mount\.dataset\.proposalId!/u);
  assert.match(source, /activateTeamkitExperience\(root as HTMLDivElement, candidateState\)/u);
  assert.match(source, /root\.addEventListener\("submit", submit, true\)/u);
  assert.match(source, /LIVE, productie, mail en orders blijven onaangeraakt/u);
  assert.match(source, /Logo 1 blijft gekoppeld/u);
  assert.match(source, /alleen na deze expliciete keuze gewist/u);
  assert.match(source, /root\.innerHTML = `\$\{styles\(\)\}/u, "candidate-stijlen blijven na iedere state-transitie aanwezig");
  const initial = initialLibraryTeamkitDraft();
  assert.deepEqual(initial, { view: "library", logo1: "pioneers", logo2: null, pickerOpen: false, proofOpen: false, newDraftConfirmation: false });
  const withTwo = transitionLibraryTeamkitDraft(initial, "ADD_LOGO_2");
  assert.equal(withTwo.logo1, "pioneers");
  assert.equal(withTwo.logo2, "sponsor-demo");
  const afterNavigation = { ...withTwo, view: "library" };
  assert.equal(afterNavigation.logo1, "pioneers");
  assert.equal(afterNavigation.logo2, "sponsor-demo");
  const removed = transitionLibraryTeamkitDraft(afterNavigation, "REMOVE_LOGO_2");
  assert.equal(removed.logo1, "pioneers");
  assert.equal(removed.logo2, null);
});

test("candidate is lazy-loaded en directe reviewroute is onderdeel van de geïsoleerde Workspace-boundary", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(workspace, /import\("\.\/sportpaleis\/review-candidates\/library-teamkit-v1\.ts"\)/u);
  assert.match(workspace, /state\.capabilities\.reviewMode \? `<a data-link/u);
  assert.match(runtime, /reviews\/library-teamkit/u);
  assert.match(server, /REVIEW_SIDE_EFFECT_FORBIDDEN/u);
  assert.match(server, /route\.startsWith\("\/api\/sportpaleis\/v1\/reviews"\)/u);
});
