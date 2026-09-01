import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Performance-Kevin-2026!", patrick: "Performance-Patrick-2026!", collega: "Performance-Store-2026!", "donovan-support": "Performance-Support-2026!" };

test("bootstrap is direct mutation-ready zonder aparte session-write en ongeldige CSRF blijft fail-closed", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-live-performance-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl" });
  await service.initialize();
  const login = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const bootstrap = await service.bootstrap(login.token);
  assert.match(bootstrap.csrfToken, /^session-bound:[a-f0-9]{64}$/u);
  await assert.rejects(service.setQuickPin(login.token, "invalid", "patrick", { pin: "123456" }), (error) => error.code === "CSRF_INVALID");
  await service.setQuickPin(login.token, bootstrap.csrfToken, "patrick", { pin: "123456" });
});

test("Workspace start bruikbare bootstrap zonder sequentiële auth/session-waterfall", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const initialize = source.slice(source.indexOf("const initialize = async"), source.indexOf("void initialize().catch"));
  assert.doesNotMatch(initialize, /api\.session\(\)/u);
  assert.match(initialize, /const demoOptions = api\.demoOptions\(\)/u);
  assert.match(initialize, /await refresh\(\)/u);
  assert.match(source, /sportpaleis-usable-state/u);
});
