import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Premium-Identity-Kevin-2026!", patrick: "Premium-Identity-Patrick-2026!", collega: "Premium-Identity-Store-2026!", "donovan-support": "Premium-Identity-Support-2026!" };
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-premium-identity-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, releaseId: "SPW-PREMIUM-IDENTITY-TEST" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin, deviceMode: "SHARED" });
  return { store, service, admin };
}

test("gedeelde gebruikerswissel gebruikt alleen een PIN wanneer die werkelijk is ingericht", async (context) => {
  const { service, admin } = await fixture(context);
  const before = await service.bootstrap(admin.token);
  assert.equal(before.switchableUsers.find(({ id }) => id === "patrick").quickAuth.pinEnrolled, false);
  const passwordSwitch = await service.fastSwitch(admin.token, admin.csrfToken, { targetUserId: "patrick", authMode: "PASSWORD", password: passwords.patrick, deviceMode: "SHARED" });
  assert.equal(passwordSwitch.user.id, "patrick");
  const adminAgain = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin, deviceMode: "SHARED" });
  await assert.rejects(service.fastSwitch(adminAgain.token, adminAgain.csrfToken, { targetUserId: "patrick", authMode: "PIN", pin: "1234", deviceMode: "SHARED" }), (error) => error.code === "PIN_NOT_ENROLLED");
  await service.setQuickPin(adminAgain.token, adminAgain.csrfToken, "patrick", { pin: "4826" });
  const pinSwitch = await service.fastSwitch(adminAgain.token, adminAgain.csrfToken, { targetUserId: "patrick", authMode: "PIN", pin: "4826", deviceMode: "SHARED" });
  assert.equal(pinSwitch.user.id, "patrick");
});

test("wachtwoordherstel is niet-enumererend, eenmalig, tijdelijk en trekt bestaande sessies in", async (context) => {
  const { store, service, admin } = await fixture(context);
  const existingSession = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  const known = await service.requestPasswordReset({ email: "collega@sportpaleis.nl", remoteAddress: "fixture-a" });
  const unknown = await service.requestPasswordReset({ email: "bestaat-niet@sportpaleis.nl", remoteAddress: "fixture-b" });
  assert.deepEqual(known, unknown);
  const adminView = await service.bootstrap(admin.token);
  assert.equal(adminView.users.find(({ id }) => id === "collega").recovery.state, "REQUESTED");
  const issued = await service.issuePasswordReset(admin.token, admin.csrfToken, "collega");
  const raw = new URLSearchParams(issued.resetPath.split("#")[1]).get("token");
  const persisted = await store.read();
  const request = persisted.passwordResetRequests.find(({ userId, usedAt }) => userId === "collega" && !usedAt);
  assert.equal(request.tokenHash, hash(raw));
  assert.doesNotMatch(JSON.stringify(persisted), new RegExp(raw));
  assert.ok(new Date(issued.expiresAt).getTime() - Date.now() <= 30 * 60 * 1000);
  assert.equal((await service.completePasswordReset({ token: raw, password: "Premium-Identity-New-2026!" })).reset, true);
  await assert.rejects(service.completePasswordReset({ token: raw, password: "Premium-Identity-Again-2026!" }), (error) => error.code === "RECOVERY_INVALID");
  await assert.rejects(service.authenticate(existingSession.token), (error) => ["SESSION_EXPIRED", "UNAUTHENTICATED"].includes(error.code));
  assert.equal((await service.login({ email: "collega@sportpaleis.nl", password: "Premium-Identity-New-2026!" })).user.id, "collega");
});

test("de login en gebruikerswissel tonen nooit een onmogelijke verborgen credential", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Wachtwoord vergeten\?/);
  assert.match(source, /data-recovery-request-form/);
  assert.match(source, /data-recovery-complete-form/);
  assert.match(source, /data-pin-enrolled/);
  assert.match(source, /Voor deze gebruiker is nog geen PIN ingesteld\. Gebruik het volledige wachtwoord/);
  assert.match(source, /Eenmalige herstellink maken/);
});
