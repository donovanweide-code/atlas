import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Human-Review-Kevin-002!", patrick: "Human-Review-Patrick-002!", collega: "Human-Review-Store-002!", "donovan-support": "Human-Review-Support-002!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-human-review-002-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

test("openstaande uitnodiging kan veilig worden ingetrokken zonder actieve accounts te wijzigen", async (context) => {
  const { service, admin } = await fixture(context);
  const before = await service.bootstrap(admin.token);
  const activeAdmin = before.users.find(({ id }) => id === before.currentUserId);
  const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Werknemers", email: "werknemers@example.nl", role: "store" });
  const rawToken = new URLSearchParams(invited.activationPath.split("#")[1]).get("token");

  const revoked = await service.cancelInvitedUser(admin.token, admin.csrfToken, invited.user.id);
  assert.deepEqual(revoked, { revoked: true, userId: invited.user.id, email: "werknemers@example.nl" });
  const after = await service.bootstrap(admin.token);
  assert.equal(after.users.some(({ id }) => id === invited.user.id), false);
  assert.deepEqual(after.users.find(({ id }) => id === activeAdmin.id), activeAdmin);
  assert.ok(after.audit.some(({ action, subject }) => action === "Uitnodiging ingetrokken" && subject === invited.user.id));
  await assert.rejects(service.activateInvitedUser({ token: rawToken, password: "Nooit-Activeren-002!" }), (error) => error.code === "ACTIVATION_INVALID");
});

test("bestaande en uitgenodigde e-mailadressen blijven organisatiebreed uniek", async (context) => {
  const { service, admin } = await fixture(context);
  await assert.rejects(service.createInvitedUser(admin.token, admin.csrfToken, { name: "Dubbele Kevin", email: " KEVIN@SPORTPALEIS.NL ", role: "store" }), (error) => error.code === "EMAIL_EXISTS");
  await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Eerste uitnodiging", email: "uniek@example.nl", role: "operator" });
  await assert.rejects(service.createInvitedUser(admin.token, admin.csrfToken, { name: "Tweede uitnodiging", email: "UNIEK@example.nl", role: "store" }), (error) => error.code === "EMAIL_EXISTS");
});

test("actieve toegang wordt gedeactiveerd, maar eigen en laatste beheerdersaccount blijven beschermd", async (context) => {
  const { service, admin } = await fixture(context);
  const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Tijdelijke collega", email: "tijdelijk@example.nl", role: "store" });
  const rawToken = new URLSearchParams(invited.activationPath.split("#")[1]).get("token");
  await service.activateInvitedUser({ token: rawToken, password: "Tijdelijke-Collega-002!" });
  const deactivated = await service.updateUser(admin.token, admin.csrfToken, invited.user.id, { status: "Inactief" });
  assert.equal(deactivated.status, "Inactief");
  await assert.rejects(service.login({ email: "tijdelijk@example.nl", password: "Tijdelijke-Collega-002!" }), (error) => error.code === "INVALID_LOGIN");
  await assert.rejects(service.updateUser(admin.token, admin.csrfToken, admin.user.id, { status: "Inactief" }), (error) => error.code === "SELF_DEACTIVATION_BLOCKED");
  await assert.rejects(service.cancelInvitedUser(admin.token, admin.csrfToken, admin.user.id), (error) => error.code === "INVITATION_NOT_PENDING");
});

test("Orders en navigatie volgen de Human Review-scheiding zonder productiebediening", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  const ordersSource = source.slice(source.indexOf("function orders("), source.indexOf("const printLabels"));
  const shellSource = source.slice(source.indexOf("function shell("), source.indexOf("function winkel("));
  assert.match(ordersSource, /sp-operational-order-row/);
  assert.match(ordersSource, /Alles \+ testdata/);
  assert.match(ordersSource, /Openen/);
  assert.match(source, /if \(order\.stage === "PRINT"\) return \{ label: "In behandeling"/);
  assert.doesNotMatch(ordersSource, /data-order-select|data-select-all|bulk-advance|Maak productievoorstel|productionPill/);
  assert.match(shellSource, /<p class="sp-nav__label">WERK<\/p>/);
  assert.doesNotMatch(shellSource, /WERKCONTEXT/);
  assert.match(styles, /\.sp-operational-order-row/);
  assert.match(styles, /@media\(max-width:600px\).*\.sp-operational-order-row/s);
});
