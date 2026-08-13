import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = {
  kevin: "Font-Hotfix-Admin-2026!",
  patrick: "Font-Hotfix-Operator-2026!",
  collega: "Font-Hotfix-Store-2026!",
  "donovan-support": "Font-Hotfix-Support-2026!",
};

test("fontupload is afzonderlijk ingeschakeld, admin-only en technisch fail-closed", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-font-hotfix-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({
    store,
    uploadsEnabled: false,
    fontUploadsEnabled: true,
  });
  await service.initialize();
  await store.mutate((state) => ({ state: { ...state, productionFonts: [] }, value: null }));

  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const adminBootstrap = await service.bootstrap(admin.token);
  const operatorBootstrap = await service.bootstrap(operator.token);
  assert.equal(adminBootstrap.capabilities.uploadsEnabled, false);
  assert.equal(adminBootstrap.capabilities.fontUploadsEnabled, true);
  assert.equal(operatorBootstrap.capabilities.fontUploadsEnabled, false);

  const sourceBytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  const bytes = Buffer.concat([sourceBytes, Buffer.from([0])]);
  const payload = {
    name: "Gevalideerde testbron",
    filename: "LiberationSans-Regular.ttf",
    dataBase64: bytes.toString("base64"),
    provenance: "Repository testasset met vastgelegde open-bronprovenance",
    allowedInStore: false,
  };
  await assert.rejects(service.addProductionFont(operator.token, operator.csrfToken, payload), (error) => error.code === "FORBIDDEN");
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, { ...payload, filename: "font.otf" }), (error) => error.code === "FONT_SIGNATURE_INVALID");

  const added = await service.addProductionFont(admin.token, admin.csrfToken, payload);
  assert.equal(added.sha256, createHash("sha256").update(bytes).digest("hex").toUpperCase());
  assert.equal(added.status, "TECHNICALLY_VALID");
  assert.equal(added.allowedInStore, false);
  const state = await store.read();
  assert.equal(state.productionFonts.length, 2);
  const stored = state.productionFonts.find(({ id }) => id === added.id);
  assert.equal(stored.sourceDataBase64, bytes.toString("base64"));
  assert.equal(stored.uploadedBy.userId, admin.user.id);
  assert.ok(state.audit.some(({ action, subject }) => action === "Productiefont toegevoegd" && subject === added.id));
});

test("fontupload blijft gesloten wanneer de specifieke productiepolicy uit staat", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-font-disabled-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({
    filePath: path.join(root, "state.json"),
    backupDirectory: path.join(root, "backups"),
    seedPasswords: passwords,
  });
  const service = new SportpaleisPilotService({ store, uploadsEnabled: false, fontUploadsEnabled: false });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const bytes = await readFile(new URL("../public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf", import.meta.url));
  await assert.rejects(service.addProductionFont(admin.token, admin.csrfToken, {
    name: "Geblokkeerd",
    filename: "LiberationSans-Regular.ttf",
    dataBase64: bytes.toString("base64"),
    provenance: "test",
  }), (error) => error.code === "UPLOADS_DISABLED");
});

test("Fontbibliotheek toont de uploadflow alleen bij de server-side admincapability", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /state\.currentUser\.role !== "admin"/);
  assert.match(source, /state\.capabilities\.fontUploadsEnabled/);
  assert.match(source, /Alleen een bevoegde beheerder kan een productie-font toevoegen/);
  assert.match(source, /TTF, OTF, WOFF of WOFF2/);
  assert.match(source, /Technisch valideren en toevoegen/);
});
