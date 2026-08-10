import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Correction-Kevin-001!", patrick: "Correction-Patrick-001!", collega: "Correction-Store-001!", "donovan-support": "Correction-Support-001!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-correction-001-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

test("Sportpaleis live pilot correctieronde 1 — pilotkritieke scope", async (context) => {
  const { service, admin, storeUser } = await fixture(context);

  await context.test("activatiecontract is voor beheerder, winkelmedewerker en productiemedewerker gelijk en eenmalig", async () => {
    for (const role of ["admin", "store", "operator"]) {
      const invited = await service.createInvitedUser(admin.token, admin.csrfToken, { name: `Test ${role}`, email: `${role}.activation@example.nl`, role });
      assert.equal(invited.user.status, "Uitgenodigd");
      assert.match(invited.activationPath, /^\/workspace\/sportpaleis\/activeren#token=/);
      assert.equal(invited.delivery, "LOCAL_HANDOFF_ONLY");
    }
  });

  await context.test("live-confirmed bedrukbare records van DCG en MHC Lelystad zijn vereniging-onafhankelijk orderbaar", async () => {
    const dcg = SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ id }) => id === "sp-live-116350");
    const mhc = SPORTPALEIS_LIVE_PILOT_ARTICLES.find(({ id }) => id === "sp-live-100664");
    assert.deepEqual({ association: dcg.association, sku: dcg.articleNumber, supplier: dcg.supplierArticleNumber, supports: dcg.supports }, { association: "DCG", sku: "116350", supplier: "105007", supports: ["initials"] });
    assert.deepEqual({ association: mhc.association, sku: mhc.articleNumber, supplier: mhc.supplierArticleNumber, supports: mhc.supports }, { association: "MHC Lelystad", sku: "100664", supplier: "LADY AWAY", supports: ["name", "backNumber"] });
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Live twee verenigingen", customerEmail: "live-multi@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, initials: "AB", name: "De Vries", backNumber: "12", backNumberSizeClass: "SENIOR" },
      items: [
        { articleId: dcg.id, size: "164", quantity: 1, deviation: false, overrides: empty },
        { articleId: mhc.id, size: "164", quantity: 1, deviation: false, overrides: empty },
      ],
    }, "correction-001-live-multi")).value;
    assert.deepEqual(new Set(created.items.map(({ association }) => association)), new Set(["DCG", "MHC Lelystad"]));
    assert.equal(created.items.find(({ association }) => association === "MHC Lelystad").foilColor, "Zwart");
  });

  await context.test("Junior kledingmaten 116–164 gebruiken 200 mm en andere maten blijven veilig DATA_GAP", async () => {
    const association = (await service.bootstrap(admin.token)).associations.find(({ name }) => name === "A.S.C. Waterwijk");
    assert.equal(association.juniorValidationStatus, "VALIDATED");
    assert.equal(association.juniorPhysicalHeightMm, 200);
    assert.deepEqual(association.juniorGarmentSizes, ["116", "128", "140", "152", "164"]);
    const valid = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Junior 164", customerEmail: "junior164@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "14", backNumberSizeClass: "JUNIOR" },
      items: [{ articleId: "sp-live-137294", size: "164", quantity: 1, deviation: false, overrides: empty }],
    }, "correction-001-junior-164")).value;
    assert.deepEqual(valid.items[0].backNumberProduction, { sizeClass: "JUNIOR", physicalHeightMm: 200, status: "VALIDATED", source: association.juniorValidationNote });
    const gap = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Junior S", customerEmail: "juniors@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "15", backNumberSizeClass: "JUNIOR" },
      items: [{ articleId: "sp-live-137294", size: "S", quantity: 1, deviation: false, overrides: empty }],
    }, "correction-001-junior-s")).value;
    assert.equal(gap.items[0].backNumberProduction.status, "DATA_GAP");
    assert.match(gap.items[0].backNumberProduction.source, /116, 128, 140, 152, 164/);
  });

  await context.test("verenigingsinstellingen zijn gereviseerd en werken direct door naar profiel en bestaand productievoorstel", async () => {
    const before = (await service.bootstrap(admin.token)).associations.find(({ name }) => name === "A.S.C. Waterwijk");
    const existing = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Voor voorstel", customerEmail: "voorstel@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "9", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }],
    }, "correction-001-proposal-before")).value;
    assert.equal(existing.items[0].foilColor, "Wit");
    const updated = await service.updateAssociation(admin.token, admin.csrfToken, before.id, {
      expectedRevision: before.revision,
      fontProfile: "schluber · pilotcorrectie",
      foilColors: ["Zwart"],
      dimensionsCm: { ...before.dimensionsCm, backNumberSenior: 21 },
      juniorGarmentSizes: before.juniorGarmentSizes,
    });
    assert.equal(updated.revision, before.revision + 1);
    const bootstrap = await service.bootstrap(admin.token);
    const profile = bootstrap.productionProfiles.find(({ id }) => id === "profile-shirt-home");
    assert.equal(profile.fontProfile, "schluber · pilotcorrectie");
    assert.equal(profile.foilColor, "Zwart");
    assert.match(profile.sizeLabel, /Rug Senior 21 cm/);
    assert.equal(bootstrap.orders.find(({ id }) => id === existing.id).items[0].foilColor, "Zwart");
    const after = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Na voorstel", customerEmail: "navoorstel@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "10", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }],
    }, "correction-001-proposal-after")).value;
    assert.equal(after.items[0].backNumberProduction.physicalHeightMm, 210);
    assert.equal(after.items[0].foilColor, "Zwart");
  });
});
