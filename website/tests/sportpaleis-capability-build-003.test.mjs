import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { SPORTPALEIS_ASSOCIATIONS, SPORTPALEIS_DATA_GAPS } from "../config/sportpaleis-bedrukking-configuration.mjs";

const passwords = { kevin: "Capability-Kevin-003!", patrick: "Capability-Patrick-003!", collega: "Capability-Store-003!", "donovan-support": "Capability-Support-003!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-capability-003-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    root, store, service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

const emptyPrinting = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

test("Sportpaleis Bedrukking Capability Build 003", async (context) => {
  const { root, store, service, admin, operator, storeUser } = await fixture(context);

  await context.test("de echte verenigingsconfiguratie is server-owned en behoudt alleen resterende datagaten", async () => {
    const state = await service.bootstrap(admin.token);
    assert.equal(state.schemaVersion, 18);
    assert.equal(state.associations.length, SPORTPALEIS_ASSOCIATIONS.length);
    assert.deepEqual(state.associations.map(({ name }) => name), SPORTPALEIS_ASSOCIATIONS.map(({ name }) => name));
    const asc = state.associations.find(({ name }) => name === "A.S.C. Waterwijk");
    assert.equal(asc.dimensionsCm.backNumberSenior, 20);
    assert.equal(asc.juniorValidationStatus, "VALIDATED");
    assert.equal(asc.juniorPhysicalHeightMm, 200);
    assert.deepEqual(asc.juniorGarmentSizes, ["116", "128", "140", "152", "164"]);
    assert.equal(state.productionProfiles.find(({ id }) => id === "profile-shirt").sizeLabel, "Junior/Senior rugnummer 20 cm");
    assert.equal(state.productionProfiles.find(({ id }) => id === "profile-shorts").sizeLabel, "Shortnummer 7,5 cm");
    assert.equal(state.productionProfiles.find(({ id }) => id === "profile-initials").sizeLabel, "Initialen 3 cm");
    assert.equal(SPORTPALEIS_DATA_GAPS.some((gap) => /Junior.*(?:hoogte|maat)/iu.test(gap)), false);
  });

  await context.test("Eigen artikel blijft ordergebonden en ontbrekend productieprofiel blokkeert productie", async () => {
    const created = await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Eigen Artikel", customerEmail: "eigen@example.nl", customerPhone: "0612345678",
      standardPersonalization: emptyPrinting,
      items: [{ product: "Meegebracht trainingsvest", association: "Buitenhout MHC", size: "L", quantity: 1, personalization: "Initialen EA", foilColor: "Wit" }],
    }, "capability-custom-order-0001");
    const item = created.value.items[0];
    assert.equal(item.sourceType, "CUSTOM");
    assert.equal(item.productionReadiness.status, "DATA_GAP");
    assert.equal((await service.bootstrap(admin.token)).articles.some(({ name }) => name === item.product), false);
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, created.value.id, { templateKey: "ORDER_RECEIVED" }, "capability-custom-mail-0001");
    const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.value.id);
    const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, current.id, current.revision, "capability-custom-control-0001")).value;
    assert.equal(controlled.stage, "CONTROL");
    await assert.rejects(service.advanceOrder(operator.token, operator.csrfToken, controlled.id, controlled.revision, "capability-custom-advance-0001"), (error) => error.code === "PRODUCTION_DATA_INCOMPLETE");
  });

  await context.test("Teamorder bewaart spelerregels in hetzelfde order-, profiel- en revisiemodel", async () => {
    const created = await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "TEAM", customer: "Team Contact", customerEmail: "team@example.nl", customerPhone: "0687654321",
      standardPersonalization: emptyPrinting,
      items: [{ articleId: "sp-live-137294", variants: [
        { participantName: "Speler Een", size: "M", quantity: 1, deviation: true, overrides: { ...emptyPrinting, backNumber: "10", backNumberSizeClass: "SENIOR" } },
        { participantName: "Speler Twee", size: "S", quantity: 1, deviation: true, overrides: { ...emptyPrinting, backNumber: "11", backNumberSizeClass: "JUNIOR" } },
      ] }],
    }, "capability-team-order-0001");
    assert.equal(created.value.orderKind, "TEAM");
    assert.deepEqual(created.value.items[0].variants.map(({ participantName }) => participantName), ["Speler Een", "Speler Twee"]);
    assert.equal(created.value.items[0].variants[0].backNumberProduction.physicalHeightMm, 200);
    assert.equal(created.value.items[0].variants[1].backNumberProduction.status, "SOURCE_CONFIGURED");
    assert.equal(created.value.items[0].variants[1].backNumberProduction.physicalHeightMm, 200);
  });

  await context.test("de generieke Mail Foundation rendert alle drie operationele klantmomenten zonder echte send", async () => {
    const order = (await service.bootstrap(admin.token)).orders[0];
    const production = await service.previewOrderMail(admin.token, order.id, { templateKey: "ORDER_IN_PRODUCTION" });
    assert.match(production.sender, /bedrukking@sportpaleis\.nl/);
    assert.match(production.subject, /in productie/i);
    assert.match(production.html, /Sportpaleis/i);
    assert.match(production.html, /cid:brand-sportpaleis-email-logo/);
    assert.equal(production.externalMailSent, false);
    const first = await service.captureOrderMail(admin.token, admin.csrfToken, order.id, { templateKey: "ORDER_IN_PRODUCTION" }, "capability-production-mail-0001");
    const duplicate = await service.captureOrderMail(admin.token, admin.csrfToken, order.id, { templateKey: "ORDER_IN_PRODUCTION" }, "capability-production-mail-0001");
    assert.equal(first.status, "CAPTURED"); assert.equal(duplicate.duplicate, true);
  });

  await context.test("uitnodiging bewaart alleen een hash, activeert eenmalig en deactivatie trekt sessies in", async () => {
    await assert.rejects(service.createInvitedUser(operator.token, operator.csrfToken, { name: "Niet toegestaan", email: "no@example.nl", role: "store" }), (error) => error.code === "FORBIDDEN");
    const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: "Nieuwe Collega", email: "nieuw@sportpaleis.nl", role: "store" });
    const rawToken = new URLSearchParams(invited.activationPath.split("#")[1]).get("token");
    const persistedText = await readFile(store.filePath, "utf8");
    assert.ok(rawToken); assert.doesNotMatch(persistedText, new RegExp(rawToken)); assert.match(persistedText, /"tokenHash"/);
    const activated = await service.activateInvitedUser({ token: rawToken, password: "Nieuwe-Collega-003!veilig" });
    assert.equal(activated.user.status, "Actief");
    await assert.rejects(service.activateInvitedUser({ token: rawToken, password: "Tweede-Poging-003!" }), (error) => error.code === "ACTIVATION_INVALID");
    const session = await service.login({ email: "nieuw@sportpaleis.nl", password: "Nieuwe-Collega-003!veilig" });
    await service.updateUser(admin.token, admin.csrfToken, activated.user.id, { status: "Inactief" });
    await assert.rejects(service.bootstrap(session.token), (error) => ["SESSION_EXPIRED", "UNAUTHENTICATED"].includes(error.code));
  });

  await context.test("migratie, UI-routes en bronhiërarchie zijn reproduceerbaar vastgelegd", async () => {
    const ui = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const sql = await readFile(new URL("../sportpaleis-server/migrations/pilot-001-to-capability-003.sql", import.meta.url), "utf8");
    const config = await readFile(new URL("../config/sportpaleis-bedrukking-configuration.mjs", import.meta.url), "utf8");
    assert.match(ui, /orders\/team/); assert.match(ui, /orders\/eigen-artikel/); assert.match(ui, /data-invite-user-form/); assert.match(ui, /390px|sp-capture-mobile/);
    assert.match(sql, /sp_user_activation_invites/); assert.match(sql, /'TEAM'/); assert.match(sql, /participant_name/);
    assert.match(config, /Untitled-43\.ai/); assert.match(config, /Pioneers nummers\.ai/); assert.match(config, /Uitsluitend de eerder gevalideerde specifieke cijfercontouren/);
    assert.equal((await service.health()).hardwareSendEnabled, false);
    assert.equal((await readFile(path.join(root, "state.json"), "utf8")).includes("password\":\"Nieuwe-Collega"), false);
  });
});
